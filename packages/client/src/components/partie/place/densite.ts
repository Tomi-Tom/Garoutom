/**
 * Les densités de la place (SPEC § 5.1.1, § 5.16) : de 6 à 18 joueurs, aucun
 * défilement pour voter.
 *
 * | densité | joueurs                                  | colonnes | cellule   | m  | écart |
 * |---------|------------------------------------------|----------|-----------|----|-------|
 * | D1      | 6-8                                      | 3        | 114 × 124 | 72 | 8     |
 * | D2      | 9-12                                     | 4        | 85 × 104  | 60 | 6 / 8 |
 * | D3      | 13-18                                    | 5        | 68 × 88   | 48 | 4     |
 * | D4      | tous, fil ouvert ou largeur < 360        | 5        | 56-68 × 76| 40 | 4 / 3 |
 *
 * Hauteurs à 390 × 844 (zone utile de 399) : D1 à 8 = 388 ; D2 à 12 = 328 ;
 * D3 à 18 = 364 ; D4 à 18 = 313 (la spec dit 316 ; le gabarit ne donne à la
 * place, fil ouvert au tiers, que 315 px rembourrage compris : les rangées
 * de D4 se serrent à 3 px et la grille reprend le rembourrage de la zone).
 *
 * Desktop, le cercle autour du pupitre : m 72 (cellule 112 de large) jusqu'à
 * 12 joueurs, m 56 (96) au-delà.
 */

export type Densite = 'D1' | 'D2' | 'D3' | 'D4';

export interface MesuresDensite {
  colonnes: number;
  /** Hauteur fixe d'une cellule. */
  hauteur: number;
  /** Diamètre du médaillon. */
  medaillon: number;
  /** Écart entre deux colonnes, et entre deux rangées. */
  ecartX: number;
  ecartY: number;
  /** Air au-dessus du médaillon, dans la cellule. */
  haut: number;
  /** Corps et interligne du nom. */
  nom: { taille: number; ligne: number };
  /** Hauteur de la ligne de statut (12 px). */
  statut: number;
  /** Le cartouche d'un mort dit son rôle en entier (larges cellules) ou son camp. */
  roleEntier: boolean;
}

export const DENSITES: Readonly<Record<Densite, MesuresDensite>> = {
  D1: { colonnes: 3, hauteur: 124, medaillon: 72, ecartX: 8, ecartY: 8, haut: 9, nom: { taille: 15, ligne: 20 }, statut: 16, roleEntier: true },
  D2: { colonnes: 4, hauteur: 104, medaillon: 60, ecartX: 6, ecartY: 8, haut: 6, nom: { taille: 15, ligne: 18 }, statut: 14, roleEntier: true },
  D3: { colonnes: 5, hauteur: 88, medaillon: 48, ecartX: 4, ecartY: 4, haut: 5, nom: { taille: 14, ligne: 16 }, statut: 16, roleEntier: false },
  D4: { colonnes: 5, hauteur: 76, medaillon: 40, ecartX: 4, ecartY: 3, haut: 2, nom: { taille: 13, ligne: 16 }, statut: 16, roleEntier: false },
};

/** La densité d'une place de `joueurs`, selon la table et l'écran. */
export function densitePour(joueurs: number, options: { filOuvert?: boolean; etroit?: boolean } = {}): Densite {
  if (options.filOuvert === true || options.etroit === true) return 'D4';
  if (joueurs <= 8) return 'D1';
  if (joueurs <= 12) return 'D2';
  return 'D3';
}

/** La hauteur que prend la grille entière : elle tient toujours dans les 399 px utiles. */
export function hauteurDeGrille(joueurs: number, densite: Densite): number {
  const m = DENSITES[densite];
  const rangees = Math.ceil(Math.max(0, joueurs) / m.colonnes);
  return rangees === 0 ? 0 : rangees * m.hauteur + (rangees - 1) * m.ecartY;
}

/** Le cercle desktop : la cellule et le médaillon selon la table. */
export function jetonDuCercle(joueurs: number): { largeur: number; medaillon: number; hauteur: number } {
  return joueurs <= 12 ? { largeur: 112, medaillon: 72, hauteur: 116 } : { largeur: 96, medaillon: 56, hauteur: 100 };
}

/** La zone utile de la place, mobile (SPEC § 7.1). */
export const PLACE_UTILE = 399;
