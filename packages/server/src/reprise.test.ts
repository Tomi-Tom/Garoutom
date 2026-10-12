/**
 * La reprise : une table survit à son gestionnaire (D20, D21).
 *
 * Deux vies du serveur se succèdent sur le même magasin. Un gestionnaire
 * neuf relit tout (`restore`), réconcilie les connexions et réarme les
 * réveils. Deux cas, comme en production :
 *
 * - **les sockets survivent** (le Worker qui sort d'hibernation : même
 *   annuaire) — la phase se clôt à son échéance d'origine ;
 * - **les sockets meurent** (Node qui redémarre : annuaire vide) — chacun
 *   devient absent avec une grâce comptée depuis maintenant, l'horloge se
 *   suspend faute de vivants, et reprend au premier retour.
 *
 * Et dans les deux cas, la partie reprise est la partie continue : mêmes
 * états, même aléa, comme si rien ne s'était passé (R104).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RECONNECT_GRACE_MS, REVEAL_MS } from '@garoutom/engine';

import { banc, DEBUT, lastSyncOf, ouvrirTable, siegeDuRole, type Banc, type Siege } from './banc.js';
import { MemorySessionDirectory, type Room } from './rooms.js';
import { MemoryRoomStore } from './store.js';

let erreurs: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  erreurs.mockRestore();
});

const COMPOSITION = { auto: false, loups: 1, roles: ['voyante'], capitaine: false };

describe('restore (D21)', () => {
  it('les sockets survivent : la phase se clôt à l’échéance d’origine', async () => {
    const store = new MemoryRoomStore<Room>();
    const sessions = new MemorySessionDirectory();
    const horloge = { now: DEBUT };
    const premier = banc({ store, sessions, horloge });
    const { code } = await ouvrirTable(premier, 6);
    await premier.manager.start('s0');
    horloge.now += 10_000;

    // Le premier gestionnaire disparaît ; un second reprend le même magasin.
    const second = banc({ store, sessions, horloge });
    await second.manager.restore();
    expect(second.wakes.get(code)).toBe(DEBUT + REVEAL_MS);

    await second.avancer(REVEAL_MS - 10_000 - 1);
    expect((await second.manager.peek(code))?.game?.phase.kind).toBe('revelation');
    await second.avancer(1);
    expect((await second.manager.peek(code))?.game?.phase.kind).toBe('nuit');
    // Et les sessions vivantes jouent sans rien redemander.
    expect(lastSyncOf(second.sent, 's1').game?.phase).toBe('nuit');
  });

  it('les sockets meurent : grâce depuis maintenant, pause, puis l’échéance recule d’autant', async () => {
    const store = new MemoryRoomStore<Room>();
    const horloge = { now: DEBUT };
    const premier = banc({ store, horloge });
    const { code, sieges } = await ouvrirTable(premier, 6);
    await premier.manager.start('s0');
    horloge.now += 10_000;

    const second = banc({ store, horloge });
    await second.manager.restore();
    const reprise = await second.manager.peek(code);
    for (const player of reprise?.players ?? []) {
      expect(player).toMatchObject({ socketId: null, absent: false, disconnectedUntil: horloge.now + RECONNECT_GRACE_MS });
    }
    expect(reprise?.timing?.pausedAt).toBe(horloge.now);
    expect(reprise?.players).toHaveLength(6);

    // Dix secondes de redémarrage, puis le premier revient avec son jeton.
    await second.avancer(10_000);
    await second.manager.join('neuve-0', code, 'Alice', sieges[0]!.token, 2);
    const apres = await second.manager.peek(code);
    expect(apres?.timing?.pausedAt).toBeNull();
    expect(apres?.timing?.deadline).toBe(DEBUT + REVEAL_MS + 10_000);
    expect(lastSyncOf(second.sent, 'neuve-0').room.paused).toBe(false);
  });

  it('un gestionnaire neuf retrouve les tables à recycler', async () => {
    const store = new MemoryRoomStore<Room>();
    const horloge = { now: DEBUT };
    const premier = banc({ store, horloge });
    const { code } = await premier.manager.create('s0', 'Alice');
    await premier.manager.leave('s0');
    horloge.now += 10 * 60_000;

    const second = banc({ store, horloge });
    await second.manager.restore();
    expect(await store.has(code)).toBe(false);
  });
});

/** Rejoue une partie fixe, avec ou sans redémarrage du serveur en son milieu. */
async function partie(redemarrer: boolean): Promise<Room['game']> {
  const store = new MemoryRoomStore<Room>();
  const horloge = { now: DEBUT };
  let b: Banc = banc({ store, horloge, graine: 42 });
  const { code } = await ouvrirTable(b, 6, COMPOSITION);
  let sieges: Siege[] = (await b.manager.peek(code))!.players.map((player) => ({
    socketId: player.socketId!,
    playerId: player.id,
    token: player.token,
    seat: player.seat,
  }));
  await b.manager.start('s0');
  for (const siege of sieges) await b.manager.action(siege.socketId, { type: 'pret' });

  const loup = await siegeDuRole(b, code, 'loup');
  const voyante = await siegeDuRole(b, code, 'voyante');
  const villageois = (await b.manager.peek(code))!.game!.players.filter((p) => p.role === 'villageois').map((p) => p.seat);

  await b.manager.action(sieges[voyante]!.socketId, { type: 'sonder', target: loup });

  if (redemarrer) {
    // Le serveur tombe : un gestionnaire neuf, un annuaire vide ; chacun revient.
    b = banc({ store, horloge, graine: 7 });
    await b.manager.restore();
    sieges = await Promise.all(
      sieges.map(async (siege) => {
        const socketId = `${siege.socketId}-retour`;
        await b.manager.join(socketId, code, 'x', siege.token);
        return { ...siege, socketId };
      }),
    );
  }

  await b.manager.action(sieges[loup]!.socketId, { type: 'devorer', target: villageois[0]! });
  // Le jour : une égalité parfaite, que l'aléa de la partie tranche s'il le faut.
  const jour = (await b.manager.peek(code))!.game!;
  const vivants = jour.players.filter((p) => p.alive).map((p) => p.seat);
  for (const [index, seat] of vivants.entries()) {
    const cible = vivants[(index + 1) % vivants.length]!;
    await b.manager.action(sieges[seat]!.socketId, { type: 'voter', target: cible }).catch(() => undefined);
  }
  await b.avancer(10 * 60_000);
  return (await b.manager.peek(code))!.game;
}

describe('partie reprise = partie continue (R104)', () => {
  it('un redémarrage au milieu de la nuit ne change rien à la suite', async () => {
    const continue_ = await partie(false);
    const reprise = await partie(true);
    expect(reprise).toEqual(continue_);
    expect(reprise?.rng).toBe(continue_?.rng);
  });
});
