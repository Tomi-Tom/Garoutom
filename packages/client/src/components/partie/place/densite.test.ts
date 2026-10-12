/**
 * Les densités de la place (SPEC § 5.1.1) : la bonne densité pour la table,
 * et — la promesse — aucun défilement pour voter, de 6 à 18 joueurs.
 */
import { describe, expect, it } from 'vitest';

import { disposerEnCercle } from './cercle.js';
import { DENSITES, densitePour, hauteurDeGrille, jetonDuCercle, PLACE_UTILE } from './densite.js';

describe('densités de la place', () => {
  it('D1 jusqu’à 8, D2 jusqu’à 12, D3 au-delà ; D4 fil ouvert ou écran étroit', () => {
    expect(densitePour(6)).toBe('D1');
    expect(densitePour(8)).toBe('D1');
    expect(densitePour(9)).toBe('D2');
    expect(densitePour(12)).toBe('D2');
    expect(densitePour(13)).toBe('D3');
    expect(densitePour(18)).toBe('D3');
    expect(densitePour(12, { filOuvert: true })).toBe('D4');
    expect(densitePour(6, { etroit: true })).toBe('D4');
  });

  it('les hauteurs de la spec : D1 à 8 = 388, D2 à 12 = 328, D3 à 18 = 364, D4 à 18 = 313', () => {
    expect(hauteurDeGrille(8, 'D1')).toBe(388);
    expect(hauteurDeGrille(12, 'D2')).toBe(328);
    expect(hauteurDeGrille(18, 'D3')).toBe(364);
    // D4 se serre de 3 px (316 → 313) pour tenir dans les 315 px du gabarit, fil ouvert.
    expect(hauteurDeGrille(18, 'D4')).toBe(313);
  });

  it('aucun défilement pour voter, de 6 à 18, dans chaque densité possible', () => {
    for (let n = 6; n <= 18; n += 1) {
      for (const densite of [densitePour(n), densitePour(n, { filOuvert: true })]) {
        expect(hauteurDeGrille(n, densite), `${String(n)} joueurs en ${densite}`).toBeLessThanOrEqual(PLACE_UTILE);
      }
    }
    // En D4 (fil ouvert au tiers), la zone de la place n'a que 315 px, rembourrage compris.
    for (let n = 6; n <= 18; n += 1) expect(hauteurDeGrille(n, 'D4')).toBeLessThanOrEqual(315);
  });

  it('les médaillons de la spec : 72, 60, 48, 40 — et toutes les cibles font 44 au moins', () => {
    expect([DENSITES.D1, DENSITES.D2, DENSITES.D3, DENSITES.D4].map((d) => d.medaillon)).toEqual([72, 60, 48, 40]);
    for (const d of Object.values(DENSITES)) expect(d.hauteur).toBeGreaterThanOrEqual(44);
  });

  it('le cercle desktop (1 004 × 748) tient 6 à 18 jetons à taille fixe autour du pupitre', () => {
    for (let n = 6; n <= 18; n += 1) {
      const jeton = jetonDuCercle(n);
      const ronde = disposerEnCercle(n, 1004, 748, { largeur: 376, hauteur: 216 }, jeton);
      expect(ronde, `${String(n)} joueurs`).not.toBeNull();
      expect(ronde?.medaillon).toBe(n <= 12 ? 72 : 56);
    }
  });
});
