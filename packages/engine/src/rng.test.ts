/**
 * Le générateur à graine, seule source d’aléa du moteur.
 *
 * R86 l’exige : ni horloge, ni `Math.random` — tout passe par le Rng injecté,
 * et une partie se rejoue à l’identique. Si deux graines pouvaient tomber sur
 * la même suite, ou qu’un tirage sortait de sa borne, ni ces tests ni le fuzz
 * ne prouveraient quoi que ce soit.
 */

import { describe, expect, it, vi } from 'vitest';

import { createSeededRng } from './rng.js';

/** Les n premiers tirages d’une graine — des suites entières à comparer. */
function suite(graine: number, max = 1_000, n = 100): number[] {
  const rng = createSeededRng(graine);
  return Array.from({ length: n }, () => rng.nextInt(max));
}

describe('R86 — le déterminisme', () => {
  it('R86 — deux graines identiques produisent la même suite', () => {
    expect(suite(42)).toEqual(suite(42));
    expect(suite(0)).toEqual(suite(0));
    expect(suite(2026)).toEqual(suite(2026));
    // Une graine négative reste une graine : elle se rejoue aussi.
    expect(suite(-7)).toEqual(suite(-7));
  });

  it('R86 — des graines différentes produisent des suites différentes', () => {
    expect(suite(1)).not.toEqual(suite(2));
    const suites = new Set([1, 2, 3, 4, 5].map((graine) => JSON.stringify(suite(graine, 6, 64))));
    expect(suites.size).toBe(5);
  });

  it('R86 — n’appelle jamais Math.random', () => {
    const espion = vi.spyOn(Math, 'random');
    const rng = createSeededRng(7);
    for (let i = 0; i < 1_000; i++) rng.nextInt(52);
    expect(espion).not.toHaveBeenCalled();
    espion.mockRestore();
  });
});

describe('les bornes de tirage', () => {
  it('rend toujours un entier de [0, n)', () => {
    for (const max of [1, 2, 6, 52, 1_000, 2 ** 31]) {
      const rng = createSeededRng(max);
      for (let i = 0; i < 2_000; i++) {
        const tirage = rng.nextInt(max);
        expect(Number.isInteger(tirage)).toBe(true);
        expect(tirage).toBeGreaterThanOrEqual(0);
        expect(tirage).toBeLessThan(max);
      }
    }
  });

  it('jette sur toute borne invalide', () => {
    const rng = createSeededRng(1);
    for (const borne of [0, -1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => rng.nextInt(borne)).toThrow(RangeError);
    }
  });
});

describe('le bon sens statistique', () => {
  it('un dé à six faces tombe sur chaque face dans une fourchette honnête', () => {
    // 30 000 tirages, six faces : autour de 5 000 chacune. La marge est
    // volontaire généreuse (±15 %) — ce test veut attraper un générateur
    // cassé, pas mesurer des queues de distribution.
    const rng = createSeededRng(2026);
    const faces = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 30_000; i++) {
      const tirage = rng.nextInt(6);
      faces[tirage] = (faces[tirage] ?? 0) + 1;
    }
    for (const face of faces) {
      expect(face).toBeGreaterThanOrEqual(4_250);
      expect(face).toBeLessThanOrEqual(5_750);
    }
  });
});
