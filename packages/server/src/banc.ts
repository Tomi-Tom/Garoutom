/**
 * Le banc d'essai du cœur serveur — pour les tests seulement.
 *
 * Un hôte de laboratoire : horloge à la main, identifiants comptés, aléa
 * déterministe, et un carnet de réveils qui joue le rôle de l'hôte (Node :
 * `setTimeout` ; Worker : l'alarme). `avancer(ms)` fait passer le temps et
 * réveille `tick` à chaque date due, dans l'ordre — exactement ce que ferait
 * un hôte ponctuel. L'émetteur n'est qu'un carnet : tout ce qui part y est
 * consigné, siège par siège, fermetures comprises.
 *
 * Ce module n'est pas exporté par `lib.ts`.
 */

import type { NoticePayload, SyncPayload } from '@garoutom/engine';

import {
  MemorySessionDirectory,
  RoomManager,
  type Emitter,
  type HostServices,
  type Room,
  type SessionDirectory,
} from './rooms.js';
import { MemoryRoomStore, type RoomStore } from './store.js';

export interface Livraison {
  socketId: string;
  event: 'sync' | 'notice';
  payload: unknown;
}

export interface Fermeture {
  socketId: string;
  code: number;
  reason: string;
}

/** Une horloge partagée, que plusieurs gestionnaires peuvent lire (reprise). */
export interface Horloge {
  now: number;
}

export interface Banc {
  manager: RoomManager;
  store: RoomStore<Room>;
  sessions: SessionDirectory;
  host: HostServices;
  horloge: Horloge;
  sent: Livraison[];
  closed: Fermeture[];
  /** Le réveil demandé pour chaque table, tel que l'hôte le tient. */
  wakes: Map<string, number>;
  /** Fait passer le temps, en réveillant `tick` à chaque date due. */
  avancer(ms: number): Promise<void>;
}

export const DEBUT = 1_700_000_000_000;

export function banc(
  options: {
    script?: number[];
    store?: RoomStore<Room>;
    sessions?: SessionDirectory;
    horloge?: Horloge;
    /** Graine du petit générateur : deux bancs de même graine tirent pareil. */
    graine?: number;
  } = {},
): Banc {
  const script = options.script ?? [];
  const sent: Livraison[] = [];
  const closed: Fermeture[] = [];
  const wakes = new Map<string, number>();
  const horloge = options.horloge ?? { now: DEBUT };
  let counter = 0;
  let draw = 0;
  let state = options.graine ?? 1;

  const emitter: Emitter = {
    toSocket: (socketId, event, payload) => {
      sent.push({ socketId, event, payload: structuredClone(payload) });
    },
    close: (socketId, code, reason) => {
      closed.push({ socketId, code, reason });
    },
  };
  const host: HostServices = {
    now: () => horloge.now,
    uuid: () => {
      counter += 1;
      return `id-${String(counter)}`;
    },
    randomInt: (maxExclusive) => {
      const forced = script[draw];
      draw += 1;
      if (forced !== undefined) return forced % maxExclusive;
      state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
      return Math.floor((state / 4294967296) * maxExclusive);
    },
    wake: (code, at) => {
      if (at === null) wakes.delete(code);
      else wakes.set(code, at);
    },
  };

  const store = options.store ?? new MemoryRoomStore<Room>();
  const sessions = options.sessions ?? new MemorySessionDirectory();
  const manager = new RoomManager(emitter, store, host, sessions);

  async function avancer(ms: number): Promise<void> {
    const cible = horloge.now + ms;
    for (let garde = 0; garde < 10_000; garde += 1) {
      let prochain: [string, number] | null = null;
      for (const entree of wakes) if (!prochain || entree[1] < prochain[1]) prochain = entree;
      if (!prochain || prochain[1] > cible) {
        horloge.now = cible;
        return;
      }
      const [code, at] = prochain;
      horloge.now = Math.max(horloge.now, at);
      wakes.delete(code);
      await manager.tick(code);
    }
    throw new Error('le banc tourne en rond : un réveil se redemande sans fin');
  }

  return { manager, store, sessions, host, horloge, sent, closed, wakes, avancer };
}

export function syncsOf(sent: Livraison[], socketId: string): SyncPayload[] {
  return sent
    .filter((livraison) => livraison.socketId === socketId && livraison.event === 'sync')
    .map((livraison) => livraison.payload as SyncPayload);
}

export function lastSyncOf(sent: Livraison[], socketId: string): SyncPayload {
  const last = syncsOf(sent, socketId).at(-1);
  if (!last) throw new Error(`aucun sync reçu par ${socketId}`);
  return last;
}

export function noticesOf(sent: Livraison[], socketId?: string): NoticePayload[] {
  return sent
    .filter((livraison) => livraison.event === 'notice' && (socketId === undefined || livraison.socketId === socketId))
    .map((livraison) => livraison.payload as NoticePayload);
}

export interface Siege {
  socketId: string;
  playerId: string;
  token: string;
  seat: number;
}

export const NOMS = [
  'Alice',
  'Brice',
  'Céline',
  'Dora',
  'Émile',
  'Farid',
  'Gwen',
  'Hakim',
  'Iris',
  'Jules',
  'Karim',
  'Lila',
  'Mona',
  'Nils',
  'Olga',
  'Pablo',
  'Quentin',
  'Rosa',
];

/** Ouvre une table et la remplit de `n` joueurs, dans l'ordre d'arrivée. */
export async function ouvrirTable(
  b: Banc,
  n: number,
  options?: unknown,
): Promise<{ code: string; sieges: Siege[] }> {
  const sieges: Siege[] = [];
  const premiere = await b.manager.create('s0', NOMS[0], options);
  sieges.push({ socketId: 's0', playerId: premiere.playerId, token: premiere.token, seat: 0 });
  for (let i = 1; i < n; i += 1) {
    const socketId = `s${String(i)}`;
    const result = await b.manager.join(socketId, premiere.code, NOMS[i], undefined);
    sieges.push({ socketId, playerId: result.playerId, token: result.token, seat: i });
  }
  return { code: premiere.code, sieges };
}

/** Le siège moteur d'un rôle donné, dans la partie en cours. */
export async function siegeDuRole(b: Banc, code: string, role: string): Promise<number> {
  const room = await b.manager.peek(code);
  const trouve = room?.game?.players.find((player) => player.role === role);
  if (trouve === undefined) throw new Error(`aucun ${role} dans cette partie`);
  return trouve.seat;
}

/** Tout le monde confirme sa carte : la nuit tombe. */
export async function passerRevelation(b: Banc, sieges: Siege[]): Promise<void> {
  for (const siege of sieges) await b.manager.action(siege.socketId, { type: 'pret' });
}
