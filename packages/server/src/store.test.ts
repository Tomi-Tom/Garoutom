/**
 * Le magasin en mémoire : se comporter comme un magasin distant.
 *
 * Il copie à la lecture comme à l'écriture, sans quoi les tests prouveraient
 * quelque chose que la production ne fera pas : le Worker lira ses tables
 * derrière une frontière sérialisable, jamais par référence partagée.
 */

import { describe, expect, it } from 'vitest';

import { MemoryRoomStore } from './store.js';

describe('MemoryRoomStore', () => {
  it('rend des copies : personne ne mutile la référence rangée', async () => {
    const store = new MemoryRoomStore<{ score: number }>();
    await store.save('ABCD', { score: 1 });

    const lue = await store.load('ABCD');
    if (!lue) throw new Error('la table devrait exister');
    lue.score = 99;

    expect((await store.load('ABCD'))?.score).toBe(1);
  });

  it('sait si un code est pris, parmi les tables vivantes', async () => {
    const store = new MemoryRoomStore<{ seat: number }>();
    expect(await store.has('ABCD')).toBe(false);
    await store.save('ABCD', { seat: 0 });
    expect(await store.has('ABCD')).toBe(true);
    expect(await store.count()).toBe(1);
  });

  it('recycle une table : son code redevient disponible', async () => {
    const store = new MemoryRoomStore<{ seat: number }>();
    await store.save('ABCD', { seat: 0 });
    await store.remove('ABCD');

    expect(await store.has('ABCD')).toBe(false);
    expect(await store.load('ABCD')).toBeNull();
    expect(await store.count()).toBe(0);
  });
});
