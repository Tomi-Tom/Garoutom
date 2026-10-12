/**
 * La suite de contrat d'un magasin de tables.
 *
 * Tout magasin — la mémoire des tests, les fichiers de Node, le SQLite du
 * Worker — doit passer exactement les mêmes épreuves : copies à la lecture
 * comme à l'écriture, codes qui se libèrent, énumération fidèle, et une
 * table entière (partie en cours comprise) qui revient telle qu'elle est
 * partie. Le cœur des tables ne compte sur rien d'autre.
 *
 * Usage, dans un fichier de test de l'hôte :
 *
 * ```ts
 * import { contratMagasin } from '@garoutom/server/store.contract';
 * contratMagasin('FileRoomStore', async () => new FileRoomStore(await dossierTemporaire()));
 * ```
 *
 * Ce fichier n'est pas exporté par `lib.ts` : il importe Vitest, qui n'a rien
 * à faire dans un serveur en production.
 */

import { describe, expect, it } from 'vitest';

import { createGame, DEFAULT_OPTIONS } from '@garoutom/engine';

import type { RoomStore } from './store.js';

/** Une table plausible, avec une partie en cours : ce que le magasin doit rendre à l'identique. */
function tableEssai(code: string): Record<string, unknown> {
  const game = createGame({ players: 6, options: DEFAULT_OPTIONS }, 12_345).state;
  return {
    schema: 1,
    code,
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: [
      {
        id: 'p0',
        token: 't0',
        name: 'Alice « l’aînée » 🐺',
        seat: 0,
        socketId: 's0',
        disconnectedUntil: null,
        absent: false,
        abandonAt: null,
      },
    ],
    game,
    seed: 12_345,
    timing: { seq: 1, deadline: 1_700_000_025_000, durationMs: 25_000, pausedAt: null },
    journal: { seq: 2, entries: [{ seq: 1, event: { type: 'debut' } }, { seq: 2, event: { type: 'phase', phase: 'revelation', day: 1 } }] },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    emptySince: null,
  };
}

export function contratMagasin(nom: string, fabrique: () => Promise<RoomStore<unknown>>): void {
  describe(`contrat du magasin — ${nom}`, () => {
    it('rend null pour un code inconnu, et ne le compte pas', async () => {
      const store = await fabrique();
      expect(await store.load('ZZZZ')).toBeNull();
      expect(await store.has('ZZZZ')).toBe(false);
      expect(await store.count()).toBe(0);
      expect(await store.codes()).toEqual([]);
    });

    it('rend une table entière, partie en cours comprise, telle qu’elle est partie', async () => {
      const store = await fabrique();
      const table = tableEssai('ABCD');
      await store.save('ABCD', table);
      expect(await store.load('ABCD')).toEqual(table);
    });

    it('rend des copies : ni la lecture ni l’écriture ne partagent de référence', async () => {
      const store = await fabrique();
      const table = tableEssai('ABCD');
      await store.save('ABCD', table);
      // Modifier l'original après le rangement ne change pas ce qui est rangé.
      (table.players as { name: string }[])[0]!.name = 'Modifié';

      const lue = (await store.load('ABCD')) as { players: { name: string }[] };
      expect(lue.players[0]?.name).toBe('Alice « l’aînée » 🐺');
      // Modifier une lecture ne change pas la suivante.
      lue.players[0]!.name = 'Encore';
      const relue = (await store.load('ABCD')) as { players: { name: string }[] };
      expect(relue.players[0]?.name).toBe('Alice « l’aînée » 🐺');
    });

    it('écrase à l’écriture, et compte les tables vivantes', async () => {
      const store = await fabrique();
      await store.save('ABCD', { v: 1 });
      await store.save('ABCD', { v: 2 });
      await store.save('EFGH', { v: 3 });
      expect(await store.load('ABCD')).toEqual({ v: 2 });
      expect(await store.count()).toBe(2);
      expect([...(await store.codes())].sort()).toEqual(['ABCD', 'EFGH']);
      expect(await store.has('EFGH')).toBe(true);
    });

    it('recycle une table : son code redevient libre, et retirer l’inconnu ne lève pas', async () => {
      const store = await fabrique();
      await store.save('ABCD', { v: 1 });
      await store.remove('ABCD');
      await store.remove('WXYZ');
      expect(await store.has('ABCD')).toBe(false);
      expect(await store.load('ABCD')).toBeNull();
      expect(await store.count()).toBe(0);
      expect(await store.codes()).toEqual([]);
    });

    it('tient des écritures concurrentes sur des codes différents', async () => {
      const store = await fabrique();
      const codes = ['AAAA', 'BBBB', 'CCCC', 'DDDD', 'EEEE', 'FFFF', 'GGGG', 'HHHH'];
      await Promise.all(codes.map((code, index) => store.save(code, { index })));
      expect(await store.count()).toBe(codes.length);
      for (const [index, code] of codes.entries()) {
        expect(await store.load(code)).toEqual({ index });
      }
    });

    it('garde la dernière de plusieurs écritures concurrentes sur le même code', async () => {
      const store = await fabrique();
      await Promise.all([1, 2, 3, 4, 5].map((v) => store.save('ABCD', { v })));
      expect(await store.load('ABCD')).toEqual({ v: 5 });
    });
  });
}
