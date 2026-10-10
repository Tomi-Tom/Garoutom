/**
 * Le canal temps réel, côté client.
 *
 * Reprend ce que Socket.IO rendait invisible : corréler une réponse à sa
 * demande, prévenir qui écoute, et se rouvrir tout seul après une coupure.
 * Le WebSocket natif, lui, existe dans tous les hébergements envisageables —
 * y compris ceux qui n'imposent aucune durée maximale à une connexion.
 *
 * La fabrique de socket est injectée : le canal se teste ainsi entièrement
 * sans réseau, et sans dépendre du navigateur.
 */

import type { Ack, NoticePayload, SyncPayload } from './protocol.js';
import { decodeServerFrame, encodeFrame } from './transport.js';

/**
 * Ce que le canal attend d'une horloge.
 *
 * Le moteur n'a le droit de dépendre d'aucun hôte : ni DOM, ni Node. Les
 * minuteries sont donc décrites ici et lues sur l'objet global au moment de
 * s'en servir — jamais capturées au chargement, sans quoi une horloge
 * simulée installée plus tard resterait sans effet.
 */
export type TimerHandle = unknown;

export interface Timers {
  set: (run: () => void, delay: number) => TimerHandle;
  clear: (handle: TimerHandle) => void;
}

interface TimerHost {
  setTimeout?: (run: () => void, delay: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
}

/** L'horloge de l'hôte, quelle qu'elle soit : navigateur, Node ou Worker. */
export const hostTimers: Timers = {
  set: (run, delay) => (globalThis as TimerHost).setTimeout?.(run, delay),
  clear: (handle) => {
    (globalThis as TimerHost).clearTimeout?.(handle);
  },
};

/** Ce que le canal attend d'un WebSocket, et rien de plus. */
export interface SocketLike {
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
}

export interface ChannelEvents {
  connect: () => void;
  disconnect: () => void;
  sync: (payload: SyncPayload) => void;
  notice: (payload: NoticePayload) => void;
}

/** Au-delà, on considère que le serveur ne répondra plus. */
export const ACK_TIMEOUT_MS = 8_000;

/**
 * Attente entre deux tentatives de reconnexion.
 *
 * On double à chaque échec, jusqu'à un plafond : une coupure d'une heure ne
 * doit pas produire des milliers de tentatives, et une coupure d'une seconde
 * ne doit pas se faire attendre.
 */
const RETRY_MIN_MS = 500;
const RETRY_MAX_MS = 10_000;

interface Pending {
  resolve: (value: never) => void;
  reject: (reason: Error) => void;
  timer: TimerHandle;
}

export class Channel {
  private socket: SocketLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<keyof ChannelEvents, Set<(payload: never) => void>>();
  private retryMs = RETRY_MIN_MS;
  private retryTimer: TimerHandle | null = null;
  private stopped = false;

  /** Vrai entre l'ouverture effective et la coupure. */
  connected = false;

  constructor(
    private readonly open: () => SocketLike,
    private readonly timers: Timers = hostTimers,
  ) {
    this.connectSocket();
  }

  // ── écoute ─────────────────────────────────────────────────────────────

  on<E extends keyof ChannelEvents>(event: E, handler: ChannelEvents[E]): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    this.listeners.set(event, set);
  }

  off<E extends keyof ChannelEvents>(event: E, handler: ChannelEvents[E]): void {
    this.listeners.get(event)?.delete(handler as (payload: never) => void);
  }

  private emit<E extends keyof ChannelEvents>(event: E, payload?: unknown): void {
    for (const handler of this.listeners.get(event) ?? []) {
      (handler as (value: unknown) => void)(payload);
    }
  }

  // ── demandes ───────────────────────────────────────────────────────────

  /**
   * Émet une demande et attend l'accusé du serveur.
   *
   * Rejette dans trois cas, et il faut les trois : refus métier du serveur,
   * silence prolongé, et coupure de la connexion. Sans le troisième, un bouton
   * resterait bloqué jusqu'au délai de garde à chaque reconnexion.
   */
  request<T>(event: string, payload: unknown): Promise<T> {
    const socket = this.socket;
    if (!socket || !this.connected) {
      return Promise.reject(new Error('Pas de connexion au serveur'));
    }

    const id = this.nextId;
    this.nextId += 1;

    return new Promise<T>((resolve, reject) => {
      const timer = this.timers.set(() => {
        this.pending.delete(id);
        reject(new Error('Le serveur ne répond pas'));
      }, ACK_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: never) => void,
        reject,
        timer,
      });
      socket.send(encodeFrame({ t: 'req', id, e: event, d: payload }));
    });
  }

  /**
   * Coupe volontairement, sans rouvrir toute seule.
   *
   * Reprend la sémantique de Socket.IO : après `disconnect`, plus aucune
   * tentative n'est faite tant qu'on n'a pas rappelé `connect`. C'est ce qui
   * permet à l'application de forcer une reprise propre quand elle en a besoin.
   */
  disconnect(): void {
    this.stopped = true;
    if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close();
    this.socket = null;
    this.abortPending('Connexion fermée');
    if (this.connected) {
      this.connected = false;
      this.emit('disconnect');
    }
  }

  /** Rouvre après une coupure demandée, et réarme les reconnexions. */
  connect(): void {
    if (this.socket !== null) return;
    this.stopped = false;
    this.retryMs = RETRY_MIN_MS;
    this.connectSocket();
  }

  /** Ferme pour de bon : aucune reconnexion ne sera tentée. */
  close(): void {
    this.stopped = true;
    if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close();
    this.socket = null;
    this.abortPending('Connexion fermée');
    this.connected = false;
  }

  // ── plomberie ──────────────────────────────────────────────────────────

  private connectSocket(): void {
    if (this.stopped) return;
    const socket = this.open();
    this.socket = socket;

    socket.onopen = () => {
      this.connected = true;
      this.retryMs = RETRY_MIN_MS;
      this.emit('connect');
    };

    socket.onmessage = (event) => {
      this.receive(event.data);
    };

    // `onerror` précède toujours `onclose` : tout le nettoyage tient là.
    socket.onclose = () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.socket = null;
      // Ce qui était en vol décrit une réponse qui n'arrivera jamais.
      this.abortPending('Connexion perdue');
      if (wasConnected) this.emit('disconnect');
      this.scheduleRetry();
    };

    socket.onerror = () => {
      // Rien à faire : la fermeture suit, et c'est elle qui décide.
    };
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer !== null) return;
    const wait = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, RETRY_MAX_MS);
    this.retryTimer = this.timers.set(() => {
      this.retryTimer = null;
      this.connectSocket();
    }, wait);
  }

  private receive(raw: unknown): void {
    const frame = decodeServerFrame(raw);
    // Un message illisible est ignoré : il ne doit ni casser la partie en
    // cours, ni faire tomber la connexion sur laquelle elle repose.
    if (!frame) return;

    if (frame.t === 'ev') {
      this.emit(frame.e, frame.d);
      return;
    }

    const waiting = this.pending.get(frame.id);
    if (!waiting) return;
    this.pending.delete(frame.id);
    this.timers.clear(waiting.timer);
    settle(waiting, frame.r);
  }

  private abortPending(reason: string): void {
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const entry of waiting) {
      this.timers.clear(entry.timer);
      entry.reject(new Error(reason));
    }
  }
}

function settle(waiting: Pending, result: Ack<unknown>): void {
  if (result.ok) waiting.resolve(result.data as never);
  else waiting.reject(new Error(result.error));
}
