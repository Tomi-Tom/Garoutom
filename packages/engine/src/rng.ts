/**
 * Générateur déterministe à graine.
 *
 * Le moteur n'appelle jamais Math.random (R86) : une partie doit pouvoir être
 * rejouée à l'identique, sans quoi ni les tests ni le fuzz ne prouvent rien.
 */

import type { Rng } from './types.js';

/** mulberry32 : court, rapide, et de qualité largement suffisante ici. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError('Borne invalide');
      }
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(unit * maxExclusive);
    },
  };
}
