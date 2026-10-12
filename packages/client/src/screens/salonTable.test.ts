import { describe, expect, it } from 'vitest';

import {
  CARTES_MIN,
  CERCLE_ETIQUETTE,
  CERCLE_HAUTEUR_MAX,
  CERCLE_NOM_PX,
  grilleSieges,
  largeurEstimee,
  lignesDuNom,
  poserTable,
  seChevauchent,
  type TableEnRond,
} from './salonTable.js';

/*
 * La table du salon, sans navigateur : les noms entiers, sans chevaucher la
 * carte du milieu, leurs voisins ni le bord — à 6, 8, 12 et 18 joueurs, sur
 * le bureau (1 568 × 744, 1 920 × 855) comme au téléphone (390, 360, 320).
 */

/** Les noms qu'on a vus coupés au salon : douze caractères doivent tenir sur une ligne. */
const NOMS = ['Bot Mireille', 'Bot Fernand', 'Bot Colette', 'Bot Hortense', 'Bot Mireille 2'];

/**
 * La largeur de la colonne « La table » sur le bureau, telle que la grille
 * du salon la donne : `minmax(400px, 3fr) 392px minmax(0, 2fr)`, 32 px de
 * marge et d'écart, 1 400 px au plus.
 */
function colonneTable(ecran: number): number {
  const contenu = Math.min(ecran, 1400) - 64;
  return Math.max(400, Math.floor(((contenu - 392 - 64) * 3) / 5));
}

/** La largeur de la grille des sièges au téléphone : la page moins la gouttière (16 px de chaque côté). */
function grilleTelephone(ecran: number): number {
  return Math.min(ecran, 544) - 32;
}

function verifieCercle(table: TableEnRond): void {
  const bord = { x: 0, y: 0, largeur: table.largeur, hauteur: table.hauteur };
  for (const [i, siege] of table.sieges.entries()) {
    // Dans le cadre, bord compris.
    expect(siege.x).toBeGreaterThanOrEqual(bord.x);
    expect(siege.y).toBeGreaterThanOrEqual(bord.y);
    expect(siege.x + siege.largeur).toBeLessThanOrEqual(bord.largeur);
    expect(siege.y + siege.hauteur).toBeLessThanOrEqual(bord.hauteur);
    // Jamais sous la carte du milieu.
    expect(seChevauchent(siege, table.carte), `siège ${String(i)} sous la carte`).toBe(false);
    // Jamais sur un voisin.
    for (const autre of table.sieges.slice(i + 1)) {
      expect(seChevauchent(siege, autre), `siège ${String(i)} sur un voisin`).toBe(false);
    }
  }
  // La carte garde au moins l'une de ses deux formes minimales.
  expect(
    CARTES_MIN.some((min) => table.carte.largeur >= min.largeur && table.carte.hauteur >= min.hauteur),
  ).toBe(true);
  expect(table.hauteur).toBeLessThanOrEqual(CERCLE_HAUTEUR_MAX);
}

describe('la table du salon en rond (bureau)', () => {
  it('l’étiquette d’un siège tient « Bot Mireille », « Bot Fernand » sur une ligne', () => {
    for (const nom of NOMS) {
      expect(largeurEstimee(nom, CERCLE_NOM_PX)).toBeLessThanOrEqual(CERCLE_ETIQUETTE);
      expect(lignesDuNom(nom, CERCLE_ETIQUETTE, CERCLE_NOM_PX)).toBe(1);
    }
    // Seize caractères (le plus long pseudo) passent à la ligne, ils ne sont plus coupés.
    expect(lignesDuNom('Marie-Antoinette', CERCLE_ETIQUETTE, CERCLE_NOM_PX)).toBe(2);
  });

  it.each([1568, 1920])('à %i px de large, 6, 8 et 12 joueurs s’assoient en rond sans rien chevaucher', (ecran) => {
    const largeur = colonneTable(ecran);
    expect(largeur).toBeGreaterThanOrEqual(520);
    for (const nombre of [6, 8, 12]) {
      const table = poserTable(nombre, largeur, 1);
      expect(table, `${String(nombre)} joueurs`).not.toBeNull();
      verifieCercle(table!);
      expect(table!.sieges).toHaveLength(nombre);
    }
    // Avec un nom sur deux lignes, le cercle tient encore à 6 et 8.
    for (const nombre of [6, 8]) {
      const table = poserTable(nombre, largeur, 2);
      expect(table).not.toBeNull();
      verifieCercle(table!);
    }
  });

  it('sous six, les places libres prennent leur siège dans le cercle', () => {
    const table = poserTable(4, colonneTable(1568), 1);
    expect(table?.sieges).toHaveLength(6);
    verifieCercle(table!);
  });

  it('quelle que soit la colonne et le nombre, un cercle rendu ne chevauche jamais — sinon c’est la grille', () => {
    for (let largeur = 400; largeur <= 560; largeur += 8) {
      for (let nombre = 1; nombre <= 12; nombre += 1) {
        for (const lignes of [1, 2] as const) {
          const table = poserTable(nombre, largeur, lignes);
          if (table !== null) verifieCercle(table);
        }
      }
    }
  });

  it('au-delà de douze joueurs, la table est une grille', () => {
    expect(poserTable(13, 1000, 1)).toBeNull();
    expect(poserTable(18, 1000, 1)).toBeNull();
  });
});

describe('la table du salon en grille (téléphone, et repli du bureau)', () => {
  const largeurs = [
    ['téléphone 390', grilleTelephone(390)],
    ['téléphone 360', grilleTelephone(360)],
    ['téléphone 320', grilleTelephone(320)],
    ['bureau, colonne étroite', 400],
    ['bureau 1 568', colonneTable(1568)],
  ] as const;

  it.each(largeurs)('%s : aucun médaillon ne déborde de sa cellule, aucun nom n’est coupé au milieu d’un mot', (_nom, largeur) => {
    for (const nombre of [6, 8, 12, 18]) {
      const g = grilleSieges(nombre, largeur);
      // Les cellules et leurs écarts tiennent dans la largeur.
      expect(g.colonnes * g.cellule + (g.colonnes - 1) * g.ecart).toBeLessThanOrEqual(largeur + 0.01);
      // Le médaillon et son cadre « moi » (m + 16) tiennent dans la cellule.
      expect(g.cellule).toBeGreaterThanOrEqual(g.m + 16);
      // Un nom tient en deux lignes au plus : « Bot Mireille 2 » passe au
      // pire à la ligne après « Bot », jamais tronqué ni coupé dans un mot.
      for (const nom of NOMS) {
        const suite = nom.slice(nom.indexOf(' ') + 1);
        expect(largeurEstimee(suite, g.nom), `${nom} à ${String(nombre)} joueurs`).toBeLessThanOrEqual(g.cellule);
      }
    }
  });

  it('à 390, jusqu’à huit joueurs, « Bot Mireille » tient sur une seule ligne', () => {
    const g = grilleSieges(8, grilleTelephone(390));
    for (const nom of NOMS) expect(largeurEstimee(nom, g.nom)).toBeLessThanOrEqual(g.cellule);
  });

  it('à dix-huit, le téléphone prend une rangée de plus plutôt que d’écraser les noms', () => {
    expect(grilleSieges(18, grilleTelephone(390)).colonnes).toBe(4);
    expect(grilleSieges(18, grilleTelephone(320)).colonnes).toBe(3);
    // Le bureau garde les cinq colonnes de la densité D4.
    expect(grilleSieges(18, colonneTable(1568)).colonnes).toBe(5);
  });
});
