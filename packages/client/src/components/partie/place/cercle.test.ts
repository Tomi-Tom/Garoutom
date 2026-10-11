/**
 * La géométrie de la place en rond : aucun jeton ne chevauche son voisin,
 * tout tient dans le cadre, le joueur local est en bas — et la place rend la
 * main à la grille quand le rond ne tient plus.
 */
import { describe, expect, it } from 'vitest';

import { disposerEnCercle, rangAutourDe } from './cercle.js';

/** Des grands écrans réalistes : la colonne de la place, une fois l'en-tête, l'action et le fil posés. */
const CADRES = [
  { l: 640, h: 420 },
  { l: 780, h: 520 },
  { l: 1050, h: 560 },
  { l: 1400, h: 700 },
];

describe('disposerEnCercle', () => {
  it('pose de 6 à 18 jetons sans chevauchement, tous dans le cadre', () => {
    for (const { l, h } of CADRES) {
      for (let n = 6; n <= 18; n += 1) {
        const ronde = disposerEnCercle(n, l, h);
        if (ronde === null) continue;
        expect(ronde.points).toHaveLength(n);
        for (const p of ronde.points) {
          expect(p.x - ronde.largeur / 2).toBeGreaterThanOrEqual(0);
          expect(p.x + ronde.largeur / 2).toBeLessThanOrEqual(l);
          expect(p.y - ronde.hauteur / 2).toBeGreaterThanOrEqual(0);
          expect(p.y + ronde.hauteur / 2).toBeLessThanOrEqual(h);
        }
        for (let a = 0; a < n; a += 1) {
          for (let b = a + 1; b < n; b += 1) {
            const pa = ronde.points[a]!;
            const pb = ronde.points[b]!;
            const separes =
              Math.abs(pa.x - pb.x) >= ronde.largeur || Math.abs(pa.y - pb.y) >= ronde.hauteur;
            expect(separes, `${String(n)} jetons dans ${String(l)}×${String(h)} : ${String(a)} et ${String(b)}`).toBe(true);
          }
        }
      }
    }
  });

  it('tient dix-huit joueurs sur un écran de bureau, avec des jetons plus grands que la grille', () => {
    // 1440 × 900 : la colonne de la place, une fois l'en-tête, le crieur et le fil posés.
    const ronde = disposerEnCercle(18, 1052, 720, { largeur: 360, hauteur: 220 });
    expect(ronde).not.toBeNull();
    expect(ronde!.medaillon).toBeGreaterThan(50);
    // Une table de huit a des jetons au moins aussi grands.
    expect(disposerEnCercle(8, 1052, 720)!.largeur).toBeGreaterThanOrEqual(ronde!.largeur);
  });

  it('garde au milieu une scène libre pour l’action, agrandie tant qu’elle tient', () => {
    for (const { l, h } of [
      { l: 632, h: 588 },
      { l: 892, h: 540 },
      { l: 1052, h: 720 },
    ]) {
      for (let n = 6; n <= 18; n += 1) {
        const ronde = disposerEnCercle(n, l, h, { largeur: 360, hauteur: 220 });
        if (ronde === null) continue;
        const scene = ronde.scene!;
        expect(scene.largeur).toBeGreaterThanOrEqual(360);
        expect(scene.hauteur).toBeGreaterThanOrEqual(220);
        for (const p of ronde.points) {
          const dehors =
            Math.abs(p.x - ronde.centre.x) >= scene.largeur / 2 + ronde.largeur / 2 ||
            Math.abs(p.y - ronde.centre.y) >= scene.hauteur / 2 + ronde.hauteur / 2;
          expect(dehors).toBe(true);
        }
      }
    }
    // Sans scène demandée, il n'y en a pas.
    expect(disposerEnCercle(8, 1052, 720)!.scene).toBeNull();
  });

  it('assoit le premier rang en bas, au milieu, et tourne dans le sens des aiguilles', () => {
    const ronde = disposerEnCercle(8, 900, 560)!;
    const [bas, suivant] = ronde.points;
    expect(bas!.x).toBeCloseTo(450, 0);
    expect(Math.max(...ronde.points.map((p) => p.y))).toBeCloseTo(bas!.y, 5);
    // Le suivant part vers la gauche (sens horaire, l'axe y descendant).
    expect(suivant!.x).toBeLessThan(bas!.x);
  });

  it('rend la main à la grille quand le rond ne tient pas', () => {
    expect(disposerEnCercle(18, 360, 300)).toBeNull();
    expect(disposerEnCercle(8, 0, 0)).toBeNull();
  });

  it('laisse au centre la place du puits quand il y en a', () => {
    expect(disposerEnCercle(8, 1050, 600)!.centre.diametre).toBeGreaterThan(0);
  });
});

describe('rangAutourDe', () => {
  it('met le joueur local au rang 0 et les autres à sa suite', () => {
    expect(rangAutourDe(3, 3, 8)).toBe(0);
    expect(rangAutourDe(4, 3, 8)).toBe(1);
    expect(rangAutourDe(2, 3, 8)).toBe(7);
    // Un spectateur regarde depuis le siège 0.
    expect(rangAutourDe(5, null, 8)).toBe(5);
  });
});
