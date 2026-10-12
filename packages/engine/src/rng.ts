/**
 * Générateur déterministe à graine.
 *
 * Le moteur n'appelle jamais Math.random (R86) : une partie doit pouvoir être
 * rejouée à l'identique, sans quoi ni les tests ni le fuzz ne prouvent rien.
 *
 * Depuis D20, l'état du générateur est **une donnée** : un entier non signé
 * de 32 bits, rangé dans `GameState.rng`, que chaque tirage fait avancer
 * (R104). Une table rechargée depuis son magasin reprend donc l'aléa là où
 * il s'était arrêté — et non plus depuis la graine, ce qui rejouait les
 * mêmes tirages une seconde fois.
 */

import type { Rng } from './types.js';

/** Un générateur à graine qui sait dire où il en est. */
export interface SeededRng extends Rng {
  /** L'état courant : de quoi reprendre exactement ici (`resumeSeededRng`). */
  state: () => number;
}

/** Un état de générateur valable : un entier de `[0, 2³²)`. */
export function isRngState(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

/**
 * Un pas de mulberry32 : le tirage dans `[0, maxExclusive)` et l'état suivant.
 *
 * Fonction pure — c'est la brique commune au générateur objet et au moteur,
 * qui tire dans l'état de la partie sans rien allouer d'autre.
 */
export function rngDraw(state: number, maxExclusive: number): { value: number; next: number } {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError('Borne invalide');
  }
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value: Math.floor(unit * maxExclusive), next };
}

/** mulberry32 : court, rapide, et de qualité largement suffisante ici. */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      const { value, next } = rngDraw(state, maxExclusive);
      state = next;
      return value;
    },
    state: () => state,
  };
}

/**
 * Reprend un générateur à l'état donné — celui qu'a rendu `state()`, ou
 * `GameState.rng`. La graine de mulberry32 *est* son état initial : reprendre
 * à l'état `s` et semer la graine `s` sont une seule et même chose.
 */
export function resumeSeededRng(state: number): SeededRng {
  return createSeededRng(state);
}
