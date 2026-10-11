/**
 * Le concentrateur, éprouvé de bout en bout — mais sans réseau.
 *
 * Chaque connexion de laboratoire est une paire de sockets en mémoire : d'un
 * côté le vrai canal client du moteur (`Channel`), de l'autre la socket que
 * le concentrateur voit. Les cadres `req`/`ack`/`ev` traversent ainsi la
 * vraie chaîne — encodage, corrélation, décodage — sans qu'aucun octet ne
 * quitte le processus. C'est l'épreuve de la couture : le contrat du moteur
 * d'un côté, sa moitié serveur de l'autre.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Channel,
  decodeServerFrame,
  type JoinResult,
  type NoticePayload,
  type SocketLike,
  type SyncPayload,
} from '@garoutom/engine';

import { Hub, type HubSession, type HubSocket } from './hub.js';
import { RoomManager, type HostServices, type Room } from './rooms.js';
import { MemoryRoomStore } from './store.js';

/* ------------------------------------------------------------------ */
/* Le banc d'essai                                                     */
/* ------------------------------------------------------------------ */

/** Un WebSocket de laboratoire, piloté à la main (modèle channel.test.ts). */
class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;

  /** Ce que le client émet part directement vers le concentrateur. */
  pump: ((data: string) => void) | null = null;

  send(data: string): void {
    this.pump?.(data);
  }

  close(): void {
    this.drop();
  }

  /** Le serveur accepte la connexion. */
  open(): void {
    this.onopen?.();
  }

  /** La connexion tombe. */
  drop(): void {
    this.onclose?.();
  }
}

/**
 * Une connexion complète : le canal client d'un côté, le concentrateur de
 * l'autre, reliés en mémoire.
 */
class Lien {
  readonly channel: Channel;
  readonly syncs: SyncPayload[] = [];
  readonly notices: NoticePayload[] = [];
  /** Les cadres bruts reçus du serveur, pour lire ce que le canal ne montre pas. */
  readonly frames: string[] = [];
  private readonly socket = new FakeSocket();
  private readonly session: HubSession;

  constructor(hub: Hub) {
    this.channel = new Channel(() => this.socket);
    const server: HubSocket = {
      send: (data) => {
        this.frames.push(data);
        this.socket.onmessage?.({ data });
      },
      close: () => {
        this.socket.drop();
      },
    };
    this.session = hub.attach(server);
    this.socket.pump = (data) => {
      void this.session.receive(data);
    };
    this.channel.on('sync', (payload) => this.syncs.push(payload));
    this.channel.on('notice', (payload) => this.notices.push(payload));
    this.socket.open();
  }

  /** Un cadre brut vers le concentrateur, hors du canal client. */
  brut(data: string): void {
    this.socket.pump?.(data);
  }

  /** La connexion tombe, côté serveur comme côté client. */
  couper(): void {
    void this.session.close();
    this.socket.drop();
  }
}

function monter(): { hub: Hub; manager: RoomManager } {
  let counter = 0;
  let state = 7;
  const hub = new Hub(() => {
    counter += 1;
    return `connexion-${String(counter)}`;
  });
  const host: HostServices = {
    now: () => Date.now(),
    uuid: () => {
      counter += 1;
      return `id-${String(counter)}`;
    },
    randomInt: (maxExclusive) => {
      state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
      return Math.floor((state / 4294967296) * maxExclusive);
    },
    set: (run, delay) => setTimeout(run, delay),
    clear: (handle) => clearTimeout(handle as NodeJS.Timeout),
  };
  // Le concentrateur est l'émetteur : parler à une connexion, c'est son métier.
  const manager = new RoomManager(hub, new MemoryRoomStore<Room>(), host);
  hub.serve(manager);
  return { hub, manager };
}

interface Place {
  lien: Lien;
  playerId: string;
  token: string;
}

const NOMS = ['Alice', 'Brice', 'Céline', 'Dora', 'Émile', 'Farid'];

/** Ouvre une table par le concentrateur et la remplit de `n` connexions. */
async function remplir(hub: Hub, n: number): Promise<{ code: string; places: Place[] }> {
  const places: Place[] = [];
  const premiere = new Lien(hub);
  const result = await premiere.channel.request<JoinResult>('room:create', {
    name: NOMS[0],
  });
  places.push({ lien: premiere, playerId: result.playerId, token: result.token });
  for (let i = 1; i < n; i += 1) {
    const lien = new Lien(hub);
    const joint = await lien.channel.request<JoinResult>('room:join', {
      code: result.code,
      name: NOMS[i],
    });
    places.push({ lien, playerId: joint.playerId, token: joint.token });
  }
  return { code: result.code, places };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* Les épreuves                                                        */
/* ------------------------------------------------------------------ */

describe('le concentrateur', () => {
  it('sert un aller-retour complet : la place, le jeton, puis l’état qui suit', async () => {
    const { hub } = monter();
    const alice = new Lien(hub);

    const result = await alice.channel.request<JoinResult>('room:create', { name: 'Alice' });

    expect(result.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(result.token).toBeTruthy();
    expect(alice.syncs.at(-1)?.room.players[0]?.name).toBe('Alice');
  });

  it('refuse ce qui n’est pas dans la table d’aiguillage, et survit à l’illisible', async () => {
    const { hub } = monter();
    const alice = new Lien(hub);

    await expect(alice.channel.request('room:explode', {})).rejects.toThrow('Demande inconnue');

    // Un cadre illisible est ignoré : la connexion ne casse pas pour un octet de travers.
    alice.brut('ce n’est pas du json');
    const result = await alice.channel.request<JoinResult>('room:create', { name: 'Alice' });
    expect(result.code).toBeTruthy();
  });

  it('une action refusée revient avec le message et le code du moteur', async () => {
    const { hub } = monter();
    const { places } = await remplir(hub, 6);
    await places[0]?.lien.channel.request<null>('room:start', {});

    const bob = places[1]?.lien;
    if (!bob) throw new Error('connexion manquante');
    await expect(
      bob.channel.request<null>('game:action', { action: { type: 'voter', target: 0 } }),
    ).rejects.toThrow('Ce n’est pas le moment de voter');

    // Le canal client ne porte que le message ; le cadre, lui, porte le code.
    const refus = bob.frames
      .map((raw) => decodeServerFrame(raw))
      .filter((frame) => frame !== null && frame.t === 'ack' && frame.r.ok === false)
      .at(-1);
    expect(
      refus && refus.t === 'ack' && refus.r.ok === false ? refus.r.code : undefined,
    ).toBe('wrong-phase');
  });

  it('le silence traverse le concentrateur : chaque siège reçoit sa vue', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]?.lien.channel.request<null>('room:start', {});

    const room = await manager.peek(code);
    const roles = room?.game?.players ?? [];
    const loup = roles.find((player) => player.role === 'loup')?.seat;
    const villageois = roles.find((player) => player.role === 'villageois')?.seat;
    if (loup === undefined || villageois === undefined) throw new Error('rôles manquants');

    const vueLoup = places[loup]?.lien.syncs.at(-1);
    const vueVillageois = places[villageois]?.lien.syncs.at(-1);
    if (!vueLoup || !vueVillageois) throw new Error('aucune vue reçue');

    expect(vueVillageois.game?.pack).toBeNull();
    expect(vueLoup.game?.pack?.seats).toContain(loup);
    // Révélation : chacun doit confirmer, chacun a son compte à rebours.
    expect(vueVillageois.room.deadline).toBe(vueVillageois.serverNow + 25_000);
    expect(vueLoup.room.deadline).toBe(vueLoup.serverNow + 25_000);
  });

  it('la coupure arme la grâce ; la table est prévenue, et le jeton périmé ne reprend rien', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]?.lien.channel.request<null>('room:start', {});

    const parti = places[2];
    if (!parti) throw new Error('connexion manquante');
    parti.lien.couper();
    await vi.advanceTimersByTimeAsync(0); // laisser la déconnexion se refermer

    // La place est gardée, visible comme vacante.
    const vue = places[1]?.lien.syncs.at(-1);
    expect(vue?.room.players.find((player) => player.seat === 2)?.connected).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);

    expect((await manager.peek(code))?.players).toHaveLength(5);
    expect(places[1]?.lien.notices.at(-1)?.message).toMatch(/n’est pas revenu/);

    // Une fois la place libérée, le jeton ne rouvre aucune porte.
    const retour = new Lien(hub);
    await expect(
      retour.channel.request<JoinResult>('room:join', {
        code,
        name: NOMS[2],
        token: parti.token,
      }),
    ).rejects.toThrow('La partie a déjà commencé');
  });

  it('le jeton reprend la place pendant le délai de grâce', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]?.lien.channel.request<null>('room:start', {});

    const parti = places[2];
    if (!parti) throw new Error('connexion manquante');
    parti.lien.couper();
    await vi.advanceTimersByTimeAsync(30_000);

    const retour = new Lien(hub);
    const reprise = await retour.channel.request<JoinResult>('room:join', {
      code,
      name: NOMS[2],
      token: parti.token,
    });

    expect(reprise.playerId).toBe(parti.playerId);
    const room = await manager.peek(code);
    const revenu = room?.players.find((player) => player.id === parti.playerId);
    expect(revenu?.seat).toBe(2);
    expect(revenu?.socketId).toBeTruthy();
    expect(revenu?.disconnectedUntil).toBeNull();

    // La grâce éteinte ne libère plus la place.
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await manager.peek(code))?.players).toHaveLength(6);
  });
});
