/**
 * Le générateur à graine, seule source d’aléa du moteur.
 *
 * R86 l’exige : ni horloge, ni `Math.random` — tout passe par le Rng injecté,
 * et une partie se rejoue à l’identique. Si deux graines pouvaient tomber sur
 * la même suite, ou qu’un tirage sortait de sa borne, ni ces tests ni le fuzz
 * ne prouveraient quoi que ce soit.
 */

import { describe, expect, it, vi } from 'vitest';

import { createGame, phaseBudgetMs } from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { createSeededRng, isRngState, resumeSeededRng, rngDraw } from './rng.js';

describe('R104 — l’état du générateur est une donnée', () => {
  it('R104 — un générateur repris à son état continue exactement sa suite', () => {
    const rng = createSeededRng(2026);
    for (let i = 0; i < 37; i++) rng.nextInt(1_000);
    const etat = rng.state();
    expect(isRngState(etat)).toBe(true);
    const repris = resumeSeededRng(JSON.parse(JSON.stringify(etat)) as number);
    const suiteA = Array.from({ length: 100 }, () => rng.nextInt(1_000));
    const suiteB = Array.from({ length: 100 }, () => repris.nextInt(1_000));
    expect(suiteB).toEqual(suiteA);
  });

  it('R104 — un pas est une fonction pure : même état, même tirage, même suite', () => {
    const a = rngDraw(123_456, 52);
    expect(rngDraw(123_456, 52)).toEqual(a);
    const rng = createSeededRng(123_456);
    expect(rng.nextInt(52)).toBe(a.value);
    expect(rng.state()).toBe(a.next);
    expect(() => rngDraw(1, 0)).toThrow(RangeError);
  });

  it('R104 — seuls les entiers de 32 bits non signés sont des états', () => {
    for (const bon of [0, 1, 0xffff_ffff]) expect(isRngState(bon)).toBe(true);
    for (const mauvais of [-1, 2 ** 32, 1.5, Number.NaN, '1', null, undefined]) expect(isRngState(mauvais)).toBe(false);
  });

  it('R104 — une graine ou son générateur : la même partie, et l’aléa rangé dans l’état', () => {
    const setup = { players: 12, options: DEFAULT_OPTIONS };
    const parGraine = createGame(setup, 77);
    const parRng = createGame(setup, createSeededRng(77));
    expect(parGraine).toEqual(parRng);
    expect(isRngState(parGraine.state.rng)).toBe(true);
    // la durée d'une phase se lit sans tirer : l'aléa n'avance pas
    const avant = parGraine.state.rng;
    phaseBudgetMs(parGraine.state);
    expect(parGraine.state.rng).toBe(avant);
  });
});

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
