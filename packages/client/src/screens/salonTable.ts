/**
 * La géométrie de la table du salon : où poser les sièges, et quelle place
 * réserver aux noms.
 *
 * Le salon n'est pas la place de la partie : sa table vit dans une colonne
 * (400 à ~530 px sur le bureau, la largeur du téléphone ailleurs), et elle
 * doit dire les noms **en entier** — « Bot Mireille », « Bot Fernand » — sans
 * qu'ils passent sous la carte du milieu ni sortent par le bord. Le calcul est
 * pur (un nombre de sièges, une largeur), donc testable sans navigateur.
 *
 * - **Le cercle** (bureau, jusqu'à douze) réutilise l'anneau de la place
 *   (`disposerEnCercle`) avec un jeton de taille fixe : chaque étiquette a sa
 *   boîte (largeur du nom × médaillon + nom + mention), et la carte du milieu
 *   est une scène réservée que rien ne touche. On prend la plus petite hauteur
 *   qui tient ; si aucune ne tient sous `CERCLE_HAUTEUR_MAX`, la table retombe
 *   sur sa grille (SPEC § 5.16 : « repli sur la grille si deux médaillons se
 *   chevauchent »).
 * - **La grille** (téléphone, et repli du bureau) garde la densité du § 5.1.1,
 *   mais ne serre jamais une cellule sous la largeur de son médaillon : à 320,
 *   dix-huit joueurs tiennent sur quatre colonnes plutôt que cinq. Un nom trop
 *   long pour sa cellule passe à la ligne (deux lignes au plus), il n'est plus
 *   tronqué.
 */

import { MIN_PLAYERS } from '@garoutom/engine';

import { disposerEnCercle, type Point, type Scene } from '../components/partie/place/cercle.js';

/** Le corps du nom autour du cercle, et la largeur réservée à chaque étiquette. */
export const CERCLE_NOM_PX = 16;
export const CERCLE_ETIQUETTE = 112;
export const CERCLE_MEDAILLON = 56;
/** Au-delà, le cercle serait plus haut que l'écran : la grille fait mieux. */
export const CERCLE_HAUTEUR_MIN = 340;
export const CERCLE_HAUTEUR_MAX = 680;
/** Le cercle n'accueille pas plus de douze joueurs (au-delà, la grille). */
export const CERCLE_MAX_JOUEURS = 12;
/**
 * La carte du milieu : la légende du graveur et les places libres. Deux formes
 * possibles — large et basse, ou plus étroite et plus haute — : la première
 * qui tient au milieu des sièges l'emporte.
 */
export const CARTES_MIN: readonly Scene[] = [
  { largeur: 200, hauteur: 136 },
  { largeur: 184, hauteur: 152 },
];
/** La carte ne s'étale pas au-delà : c'est une carte, pas un plateau. */
export const CARTE_MAX: Scene = { largeur: 240, hauteur: 176 };

/** Lignes d'un nom, hauteur d'une ligne, et la ligne de mention (« vous · hôte »). */
const LIGNE_NOM = 20;
const LIGNE_MENTION = 16;

/**
 * La chasse d'une lettre, en em, par excès : le plus large de sa famille
 * dans Source Serif 4 en gras (mesuré au navigateur) — les étroites (i, l, t,
 * f, I, l'espace…) 0,34, les minuscules et les chiffres 0,57, les capitales
 * 0,69, les très larges (m, w, M, W) 0,9 ; hors de l'alphabet latin, 1 em.
 */
function chasse(lettre: string): number {
  if (/[mwMW]/.test(lettre)) return 0.9;
  if (/[fijltIJ'’.,:;!|\s-]/.test(lettre)) return 0.34;
  if (/[A-ZÀ-ÖØ-Þ]/.test(lettre)) return 0.69;
  if (/[\p{Script=Latin}\d]/u.test(lettre)) return 0.57;
  return 1;
}

/**
 * La largeur d'un texte, estimée par excès : on ne promet jamais une ligne
 * qu'on ne tiendrait pas (« Bot Mireille » : 91 px au navigateur, 95 ici ;
 * « Bot Mireille 2 » : 103 et 109).
 */
export function largeurEstimee(texte: string, px: number): number {
  return Array.from(texte).reduce((somme, lettre) => somme + chasse(lettre), 0) * px;
}

/** Combien de lignes il faut à un nom dans une étiquette de cette largeur (1 ou 2). */
export function lignesDuNom(nom: string, largeur: number, px: number): 1 | 2 {
  return largeurEstimee(nom, px) <= largeur ? 1 : 2;
}

/** La hauteur d'un jeton : le médaillon (m + 8), le nom sur une ou deux lignes, la mention. */
export function hauteurJeton(medaillon: number, lignes: 1 | 2): number {
  return medaillon + 8 + lignes * LIGNE_NOM + LIGNE_MENTION;
}

export interface Boite {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface TableEnRond {
  largeur: number;
  hauteur: number;
  /** La boîte de chaque siège (jetons puis places libres), dans l'ordre des rangs : 0 = « moi », en bas. */
  sieges: Boite[];
  /** La carte du milieu. */
  carte: Boite;
  medaillon: number;
  lignes: 1 | 2;
}

/**
 * Le cercle du salon pour `places` sièges (les assis, plus les places libres
 * sous six) dans une colonne de `largeur` px — ou `null` s'il ne tient pas :
 * la table prend alors la grille.
 */
export function poserTable(places: number, largeur: number, lignes: 1 | 2): TableEnRond | null {
  if (places > CERCLE_MAX_JOUEURS || largeur <= 0) return null;
  const n = Math.max(places, MIN_PLAYERS);
  const jeton = { largeur: CERCLE_ETIQUETTE, hauteur: hauteurJeton(CERCLE_MEDAILLON, lignes), medaillon: CERCLE_MEDAILLON };
  for (let hauteur = CERCLE_HAUTEUR_MIN; hauteur <= CERCLE_HAUTEUR_MAX; hauteur += 10) {
    const ronde = disposerEnCercle(n, largeur, hauteur, CARTES_MIN, jeton);
    if (ronde === null || ronde.scene === null) continue;
    const carte = {
      largeur: Math.min(CARTE_MAX.largeur, ronde.scene.largeur),
      hauteur: Math.min(CARTE_MAX.hauteur, ronde.scene.hauteur),
    };
    return {
      largeur,
      hauteur,
      sieges: ronde.points.map((p: Point) => ({
        x: p.x - jeton.largeur / 2,
        y: p.y - jeton.hauteur / 2,
        largeur: jeton.largeur,
        hauteur: jeton.hauteur,
      })),
      carte: {
        x: largeur / 2 - carte.largeur / 2,
        y: hauteur / 2 - carte.hauteur / 2,
        ...carte,
      },
      medaillon: CERCLE_MEDAILLON,
      lignes,
    };
  }
  return null;
}

/** La densité des jetons (SPEC § 5.1.1) : plus la table est pleine, plus le médaillon se resserre. */
export function densite(nombre: number): { m: number; colonnes: number; ecart: number; nom: number } {
  if (nombre <= 8) return { m: 72, colonnes: 3, ecart: 8, nom: 15 };
  if (nombre <= 12) return { m: 60, colonnes: 4, ecart: 6, nom: 15 };
  return { m: 48, colonnes: 5, ecart: 4, nom: 14 };
}

export interface GrilleSieges {
  m: number;
  colonnes: number;
  ecart: number;
  nom: number;
  /** La largeur d'une cellule à cette largeur de grille. */
  cellule: number;
}

/**
 * La cellule la plus étroite qu'on accorde à un nom : « Bot Fernand 2 » y
 * tient en deux lignes (« Bot » / « Fernand 2 »), jamais trois.
 */
export const CELLULE_MIN = 76;

/**
 * La grille des sièges dans `largeur` px : la densité du § 5.1.1, moins de
 * colonnes s'il le faut pour qu'aucun médaillon (et son cadre « moi », m + 16)
 * ne déborde de sa cellule, et qu'un nom y tienne en deux lignes. Le salon
 * défile : une rangée de plus vaut mieux qu'un nom coupé.
 */
export function grilleSieges(nombre: number, largeur: number): GrilleSieges {
  const d = densite(Math.max(nombre, 1));
  const boite = Math.max(d.m + 16, CELLULE_MIN);
  const tiennent = Math.max(1, Math.floor((largeur + d.ecart) / (boite + d.ecart)));
  const colonnes = Math.max(1, Math.min(d.colonnes, tiennent));
  const cellule = (largeur - (colonnes - 1) * d.ecart) / colonnes;
  return { ...d, colonnes, cellule };
}

/** Deux boîtes se touchent-elles (avec `air` px de marge) ? */
export function seChevauchent(a: Boite, b: Boite, air = 0): boolean {
  return (
    a.x < b.x + b.largeur + air &&
    b.x < a.x + a.largeur + air &&
    a.y < b.y + b.hauteur + air &&
    b.y < a.y + a.hauteur + air
  );
}
