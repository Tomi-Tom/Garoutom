/**
 * Le planificateur Node : un réveil par table, le dernier appel gagne, et une
 * erreur dans `tick` ne devient jamais un rejet non rattrapé.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { creerPlanificateur, lancerChienDeGarde } from './planif-node.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('creerPlanificateur', () => {
  it('appelle tick à l’échéance', async () => {
    const tick = vi.fn(() => Promise.resolve());
    const planif = creerPlanificateur(() => ({ tick }));
    planif.wake('ABCD', Date.now() + 1_000);
    await vi.advanceTimersByTimeAsync(999);
    expect(tick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(tick).toHaveBeenCalledExactlyOnceWith('ABCD');
    expect(planif.attente).toBe(0);
  });

  it('remplace le réveil précédent du même code', async () => {
    const tick = vi.fn(() => Promise.resolve());
    const planif = creerPlanificateur(() => ({ tick }));
    planif.wake('ABCD', Date.now() + 1_000);
    planif.wake('ABCD', Date.now() + 5_000);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(tick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('oublie le réveil quand at vaut null, et garde chaque code à part', async () => {
    const tick = vi.fn(() => Promise.resolve());
    const planif = creerPlanificateur(() => ({ tick }));
    planif.wake('AAAA', Date.now() + 100);
    planif.wake('BBBB', Date.now() + 100);
    planif.wake('AAAA', null);
    await vi.advanceTimersByTimeAsync(200);
    expect(tick.mock.calls).toEqual([['BBBB']]);
  });

  it('réveille aussitôt une échéance déjà passée', async () => {
    const tick = vi.fn(() => Promise.resolve());
    const planif = creerPlanificateur(() => ({ tick }));
    planif.wake('ABCD', Date.now() - 10_000);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('journalise un tick en échec, rejeté ou levé, sans le propager', async () => {
    const journal = vi.fn();
    const planif = creerPlanificateur(
      () => ({
        tick: (code) => {
          if (code === 'LEVE') throw new Error('levé');
          return Promise.reject(new Error('rejeté'));
        },
      }),
      { journal },
    );
    planif.wake('REJE', Date.now());
    planif.wake('LEVE', Date.now());
    await vi.advanceTimersByTimeAsync(5);
    expect(journal).toHaveBeenCalledTimes(2);
  });

  it('oublie tout à l’arrêt', async () => {
    const tick = vi.fn(() => Promise.resolve());
    const planif = creerPlanificateur(() => ({ tick }));
    planif.wake('ABCD', Date.now() + 100);
    planif.arreter();
    await vi.advanceTimersByTimeAsync(500);
    expect(tick).not.toHaveBeenCalled();
  });
});

describe('lancerChienDeGarde', () => {
  it('appelle watchdog à chaque période, sans chevauchement ni propagation', async () => {
    let appels = 0;
    const journal = vi.fn();
    const arret = lancerChienDeGarde(
      () => ({
        watchdog: () => {
          appels += 1;
          return appels === 2 ? Promise.reject(new Error('boum')) : Promise.resolve();
        },
      }),
      10_000,
      journal,
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(appels).toBe(3);
    expect(journal).toHaveBeenCalledTimes(1);
    arret();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(appels).toBe(3);
  });
});
