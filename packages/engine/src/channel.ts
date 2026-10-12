/**
 * Le canal temps réel, côté client.
 *
 * Reprend ce que Socket.IO rendait invisible : corréler une réponse à sa
 * demande, prévenir qui écoute, et se rouvrir tout seul après une coupure.
 * Le WebSocket natif, lui, existe dans tous les hébergements envisageables —
 * y compris ceux qui n'imposent aucune durée maximale à une connexion.
 *
 * Depuis D22, il **surveille** aussi le lien, parce qu'un téléphone posé sur
 * la table perd le sien sans prévenir personne : réseau mobile qui bascule,
 * écran verrouillé, Wi-Fi du salon qui s'endort. Un lien à moitié ouvert ne
 * déclenche jamais `onclose` ; il faut donc le prouver vivant :
 *
 * - le serveur se présente (`hello`) : sa version, ses capacités, le rythme
 *   du battement. Le canal ne pinge **que** si le serveur annonce `ping` —
 *   un serveur d'avant D22 ne saurait pas quoi répondre ;
 * - onglet visible, un `ping` part toutes les `HEARTBEAT_MS` ; si **aucun**
 *   message n'arrive dans les `PONG_TIMEOUT_MS` qui suivent, la socket est
 *   abandonnée sur-le-champ — sans attendre un `onclose` qui peut mettre des
 *   minutes à venir — et une autre s'ouvre ;
 * - une ouverture qui traîne au-delà de `OPEN_TIMEOUT_MS` est abandonnée de
 *   même ; un accusé qui tarde provoque un `ping` immédiat ;
 * - `wake()` : l'application le pousse quand l'onglet revient au premier
 *   plan, quand la page sort du cache, quand le réseau revient. Ping
 *   immédiat, ou reconnexion directe si l'absence a été longue ;
 * - la reconnexion ne renonce jamais : une première tentative presque
 *   immédiate, puis un aléa plein sous un plafond qui double ;
 * - les codes de fermeture parlent : `CLOSE_REPLACED` (la place a été reprise
 *   ailleurs) arrête tout — sinon deux onglets se voleraient la place en
 *   boucle —, `CLOSE_VERSION` demande un rechargement, `CLOSE_GONE` dit que
 *   la table n'existe plus ;
 * - le `pong` porte l'heure du serveur : l'aller-retour le plus court donne
 *   la meilleure estimation du décalage d'horloge.
 *
 * La fabrique de socket, l'horloge, les minuteries, l'aléa et la visibilité
 * sont injectés : le canal se teste ainsi entièrement sans réseau, sans
 * navigateur, et en faux temps.
 */

import {
  CLOSE_GONE,
  CLOSE_REPLACED,
  CLOSE_SERVER_RESTART,
  CLOSE_VERSION,
  HEARTBEAT_MS,
  OPEN_TIMEOUT_MS,
  PONG_TIMEOUT_MS,
  PROTOCOL_PARAM,
  PROTOCOL_VERSION,
  type Ack,
  type Capability,
  type NoticePayload,
  type SyncPayload,
} from './protocol.js';
import { encodeFrame, inspectServerFrame, type HelloFrame, type ServerFrame } from './transport.js';

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
  /**
   * `code` : le code de fermeture du WebSocket (`CloseEvent.code`), quand
   * l'hôte le connaît. Un adaptateur qui n'en transmet aucun reste valable :
   * la fermeture est alors ordinaire.
   */
  onclose: ((event?: { code?: number }) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
}

export interface ChannelEvents {
  connect: () => void;
  disconnect: () => void;
  sync: (payload: SyncPayload) => void;
  notice: (payload: NoticePayload) => void;
  /** Le serveur s'est présenté : version, capacités, battement. */
  hello: (hello: HelloFrame) => void;
  /**
   * Nouvelle estimation du décalage d'horloge : `heure du serveur − now()`,
   * en millisecondes, tirée de l'aller-retour le plus court récent.
   */
  clock: (offsetMs: number) => void;
  /**
   * La place a été reprise depuis une autre socket (`CLOSE_REPLACED`) : le
   * canal ne se reconnecte plus tout seul. `connect()` le relance.
   */
  replaced: () => void;
  /** Version de protocole refusée (`CLOSE_VERSION`) : l'application doit se recharger. */
  version: () => void;
  /** La table n'existe plus (`CLOSE_GONE`). Le canal, lui, se reconnecte. */
  gone: () => void;
}

/** Au-delà, on considère que le serveur ne répondra plus. */
export const ACK_TIMEOUT_MS = 8_000;

/**
 * Attente avant la première tentative de reconnexion, tirée dans
 * `[0, RECONNECT_FIRST_MS[` : presque immédiate, mais pas au même instant
 * pour les dix-huit téléphones d'une table quand le serveur redémarre.
 */
export const RECONNECT_FIRST_MS = 300;
/** Base du plafond qui double à chaque échec : `RECONNECT_BASE_MS × 2ⁿ`. */
export const RECONNECT_BASE_MS = 500;
/** Plafond de l'attente, onglet visible. */
export const RECONNECT_MAX_MS = 5_000;
/** Plafond de l'attente, onglet caché : personne ne regarde, rien ne presse. */
export const RECONNECT_HIDDEN_MAX_MS = 15_000;
/**
 * Une connexion ouverte au moins ce temps-là a fait ses preuves : sa chute
 * repart d'une première tentative presque immédiate. Plus courte, elle
 * prolonge la série d'échecs — un serveur qui accepte puis referme aussitôt
 * ne doit pas être martelé.
 */
export const STABLE_CONNECTION_MS = 5_000;
/** `wake()` après une absence plus longue : on ne croit plus la socket, on en rouvre une. */
export const WAKE_HIDDEN_MS = 20_000;
/** `wake()` après un silence plus long (serveur qui pingue) : même chose. */
export const WAKE_SILENCE_MS = 25_000;
/** Combien d'allers-retours récents servent à estimer l'horloge du serveur. */
export const CLOCK_SAMPLES = 8;

/**
 * L'attente avant la tentative de reconnexion n° `attempt` (0 = la première
 * après une chute) : un aléa **plein** — uniforme entre zéro et le plafond —,
 * qui étale les reconnexions d'une table entière au lieu de les synchroniser.
 */
export function reconnectDelay(attempt: number, hidden: boolean, random: () => number = Math.random): number {
  if (attempt <= 0) return Math.floor(random() * RECONNECT_FIRST_MS);
  const cap = hidden ? RECONNECT_HIDDEN_MAX_MS : RECONNECT_MAX_MS;
  const ceiling = Math.min(cap, RECONNECT_BASE_MS * 2 ** Math.min(attempt, 16));
  return Math.floor(random() * ceiling);
}

/**
 * L'adresse du canal avec la version de protocole que parle ce client
 * (`?v=2`) — le serveur ferme en `CLOSE_VERSION` s'il ne la sert plus. Une
 * version déjà présente est remplacée ; l'ancre, s'il y en a une, est gardée.
 */
export function withProtocolVersion(url: string, version: number = PROTOCOL_VERSION): string {
  const hashAt = url.indexOf('#');
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  const param = new RegExp(`([?&])${PROTOCOL_PARAM}=[^&]*`);
  const value = `${PROTOCOL_PARAM}=${String(version)}`;
  if (param.test(base)) return `${base.replace(param, `$1${value}`)}${hash}`;
  const separator = base.includes('?') ? (base.endsWith('?') || base.endsWith('&') ? '' : '&') : '?';
  return `${base}${separator}${value}${hash}`;
}

/**
 * Un refus du serveur, avec son code machine quand il en donne un
 * (`Ack.code` : `gone`, `started`, `rate`…). Reste une `Error` ordinaire :
 * qui ne lit que le message n'a rien à changer.
 */
export class ChannelError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ChannelError';
    this.code = code;
  }
}

/** Ce qu'on peut injecter dans le canal ; tout a une valeur par défaut. */
export interface ChannelOptions {
  timers?: Timers;
  /** L'horloge murale, en millisecondes (défaut : `Date.now`). */
  now?: () => number;
  /** L'aléa des attentes de reconnexion, dans `[0, 1[` (défaut : `Math.random`). */
  random?: () => number;
  /** L'onglet est-il visible ? (défaut : `document.visibilityState`, visible hors navigateur). */
  visible?: () => boolean;
  /** Le journal des incidents du lien (défaut : `console.warn`). */
  log?: (message: string) => void;
}

interface Pending {
  resolve: (value: never) => void;
  reject: (reason: Error) => void;
  timer: TimerHandle;
}

/** Une estimation de l'horloge : l'aller-retour qui l'a donnée, et le décalage. */
interface ClockSample {
  rtt: number;
  offset: number;
}

interface DocumentHost {
  document?: { visibilityState?: string };
}

interface ConsoleHost {
  console?: { warn?: (...values: unknown[]) => void };
}

/** Visible, sauf si un document dit le contraire : hors navigateur, rien n'est jamais caché. */
function documentVisible(): boolean {
  return (globalThis as DocumentHost).document?.visibilityState !== 'hidden';
}

function consoleWarn(message: string): void {
  (globalThis as ConsoleHost).console?.warn?.(message);
}

function isTimers(value: ChannelOptions | Timers): value is Timers {
  return typeof (value as Timers).set === 'function' && typeof (value as Timers).clear === 'function';
}

type TimerSlot = 'openTimer' | 'heartbeatTimer' | 'pongTimer';

export class Channel {
  private socket: SocketLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<keyof ChannelEvents, Set<(payload: never) => void>>();
  private retryTimer: TimerHandle | null = null;
  private openTimer: TimerHandle | null = null;
  private heartbeatTimer: TimerHandle | null = null;
  private pongTimer: TimerHandle | null = null;
  /** Tentatives de reconnexion depuis la dernière connexion qui a tenu. */
  private attempt = 0;
  private stopped = false;
  private replacedFlag = false;
  private openedAt = 0;
  private lastReceived = 0;
  private canPing = false;
  private heartbeatMs = HEARTBEAT_MS;
  private nextPingId = 1;
  /** Les `ping` en vol de la connexion courante : numéro → heure d'envoi. */
  private readonly pings = new Map<number, number>();
  private samples: ClockSample[] = [];
  private offset: number | null = null;
  private serverCapabilities: ReadonlySet<Capability> = new Set();

  private readonly timers: Timers;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly visible: () => boolean;
  private readonly log: (message: string) => void;

  /** Vrai entre l'ouverture effective et la coupure. */
  connected = false;

  /**
   * `options` accepte encore, seules, les minuteries (la signature d'avant
   * D22) : les robots et les tests existants n'ont rien à changer.
   */
  constructor(
    private readonly open: () => SocketLike,
    options: ChannelOptions | Timers = {},
  ) {
    const opts: ChannelOptions = isTimers(options) ? { timers: options } : options;
    this.timers = opts.timers ?? hostTimers;
    this.now = opts.now ?? (() => Date.now());
    this.random = opts.random ?? Math.random;
    this.visible = opts.visible ?? documentVisible;
    this.log = opts.log ?? consoleWarn;
    this.connectSocket();
  }

  // ── ce que le serveur a dit de lui ─────────────────────────────────────

  /** Les capacités annoncées par le `hello` de la connexion courante (vide sans `hello`). */
  get capabilities(): ReadonlySet<Capability> {
    return this.serverCapabilities;
  }

  /** Le décalage d'horloge estimé (`heure du serveur − now()`), ou `null` sans `pong`. */
  get clockOffset(): number | null {
    return this.offset;
  }

  /** Vrai après un `CLOSE_REPLACED`, jusqu'au prochain `connect()`. */
  get replaced(): boolean {
    return this.replacedFlag;
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
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      (handler as (value: unknown) => void)(payload);
    }
  }

  // ── demandes ───────────────────────────────────────────────────────────

  /**
   * Émet une demande et attend l'accusé du serveur.
   *
   * Rejette dans trois cas, et il faut les trois : refus métier du serveur
   * (`ChannelError`, avec son code), silence prolongé, et coupure de la
   * connexion. Sans le troisième, un bouton resterait bloqué jusqu'au délai
   * de garde à chaque reconnexion. Le silence, lui, fait aussi douter du
   * lien : un `ping` part aussitôt, et le chien de garde tranche.
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
        if (this.socket === socket) this.ping();
      }, ACK_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: never) => void,
        reject,
        timer,
      });
      socket.send(encodeFrame({ t: 'req', id, e: event, d: payload }));
    });
  }

  // ── le réveil ──────────────────────────────────────────────────────────

  /**
   * L'onglet revient, la page sort du cache, le réseau revient : vérifier le
   * lien **maintenant**, sans attendre le prochain battement.
   *
   * - en attente de reconnexion : la tentative part tout de suite ;
   * - ouverture en cours : rien, son délai de garde décide ;
   * - connecté, mais caché plus de `WAKE_HIDDEN_MS` (ou silencieux plus de
   *   `WAKE_SILENCE_MS` face à un serveur qui pingue) : la socket n'est plus
   *   crue — un téléphone verrouillé l'a souvent perdue sans le savoir — et
   *   une autre s'ouvre aussitôt ;
   * - sinon : un `ping` immédiat, que le chien de garde surveille.
   *
   * Sans effet après un `CLOSE_REPLACED` ou une coupure demandée : seul
   * `connect()` rouvre alors.
   */
  wake(options: { hiddenMs?: number } = {}): void {
    if (this.stopped) return;
    const socket = this.socket;
    if (socket === null) {
      if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
      this.retryTimer = null;
      this.connectSocket();
      return;
    }
    if (!this.connected) return;

    const hidden = options.hiddenMs ?? 0;
    const silence = this.now() - this.lastReceived;
    if (hidden > WAKE_HIDDEN_MS || (this.canPing && silence > WAKE_SILENCE_MS)) {
      this.abandon(socket, 'réveil après une longue absence', true);
      return;
    }
    if (this.canPing) {
      this.ping();
      this.scheduleHeartbeat();
    }
  }

  // ── coupures demandées ─────────────────────────────────────────────────

  /**
   * Coupe volontairement, sans rouvrir toute seule.
   *
   * Reprend la sémantique de Socket.IO : après `disconnect`, plus aucune
   * tentative n'est faite tant qu'on n'a pas rappelé `connect`. C'est ce qui
   * permet à l'application de forcer une reprise propre quand elle en a besoin.
   */
  disconnect(): void {
    this.stopped = true;
    const wasConnected = this.connected;
    this.shutdown('Connexion fermée');
    if (wasConnected) this.emit('disconnect');
  }

  /**
   * Rouvre après une coupure demandée ou un `CLOSE_REPLACED` (« reprendre
   * ici »), et réarme les reconnexions.
   */
  connect(): void {
    if (this.socket !== null) return;
    this.stopped = false;
    this.replacedFlag = false;
    this.attempt = 0;
    if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
    this.retryTimer = null;
    this.connectSocket();
  }

  /** Ferme pour de bon : aucune reconnexion ne sera tentée. */
  close(): void {
    this.stopped = true;
    this.shutdown('Connexion fermée');
  }

  // ── plomberie ──────────────────────────────────────────────────────────

  private connectSocket(): void {
    if (this.stopped) return;
    let socket: SocketLike;
    try {
      socket = this.open();
    } catch (error) {
      // Une adresse refusée par l'hôte : on réessaiera, plus tard.
      this.log(
        `Garoutom : ouverture du canal impossible (${error instanceof Error ? error.message : String(error)})`,
      );
      this.socket = null;
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    this.canPing = false;
    this.serverCapabilities = new Set();
    this.heartbeatMs = HEARTBEAT_MS;
    this.pings.clear();

    this.openTimer = this.timers.set(() => {
      this.openTimer = null;
      if (this.socket !== socket || this.connected) return;
      this.abandon(socket, 'ouverture trop lente', false);
    }, OPEN_TIMEOUT_MS);

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.clearTimer('openTimer');
      this.connected = true;
      this.openedAt = this.now();
      this.lastReceived = this.openedAt;
      this.emit('connect');
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      this.receive(socket, event.data);
    };

    // `onerror` précède toujours `onclose` : tout le nettoyage tient là.
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.lost(event?.code, false);
    };

    socket.onerror = () => {
      // Rien à faire : la fermeture suit, et c'est elle qui décide.
    };
  }

  /**
   * Abandonne une socket sans attendre son `onclose` : on la débranche
   * d'abord — un `onclose` tardif ne doit plus rien toucher —, on la ferme,
   * puis on fait comme si elle était tombée. `direct` : la suivante s'ouvre
   * tout de suite, sans attente.
   */
  private abandon(socket: SocketLike, reason: string, direct: boolean): void {
    if (this.socket !== socket) return;
    this.log(`Garoutom : socket abandonnée (${reason})`);
    detach(socket);
    try {
      socket.close();
    } catch {
      // Une socket déjà morte peut refuser de se fermer : elle l'est déjà.
    }
    this.lost(undefined, direct);
  }

  /** La socket courante est perdue, d'une façon ou d'une autre. */
  private lost(code: number | undefined, direct: boolean): void {
    const wasConnected = this.connected;
    const stable = wasConnected && this.now() - this.openedAt >= STABLE_CONNECTION_MS;
    const socket = this.socket;
    if (socket !== null) detach(socket);
    this.socket = null;
    this.connected = false;
    this.canPing = false;
    this.pings.clear();
    this.clearTimer('openTimer');
    this.clearTimer('heartbeatTimer');
    this.clearTimer('pongTimer');
    // Ce qui était en vol décrit une réponse qui n'arrivera jamais.
    this.abortPending('Connexion perdue');
    if (stable || code === CLOSE_SERVER_RESTART) this.attempt = 0;
    if (wasConnected) this.emit('disconnect');

    switch (code) {
      case CLOSE_REPLACED:
        // La place vit dans un autre onglet : la reprendre d'ici en boucle
        // la volerait à chaque fois. On s'arrête ; l'application demande.
        this.stopped = true;
        this.replacedFlag = true;
        if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
        this.retryTimer = null;
        this.emit('replaced');
        return;
      case CLOSE_VERSION:
        // L'application se recharge ; si elle ne le peut pas, on réessaie
        // sans presse — la bonne version finira par être servie.
        this.attempt = Math.max(this.attempt, 16);
        this.emit('version');
        break;
      case CLOSE_GONE:
        this.emit('gone');
        break;
    }

    if (direct && !this.stopped) {
      if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
      this.retryTimer = null;
      this.connectSocket();
      return;
    }
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer !== null) return;
    const wait = reconnectDelay(this.attempt, !this.visible(), this.random);
    this.attempt += 1;
    this.retryTimer = this.timers.set(() => {
      this.retryTimer = null;
      this.connectSocket();
    }, wait);
  }

  /** Coupe tout, sans rien émettre ni rouvrir. */
  private shutdown(reason: string): void {
    if (this.retryTimer !== null) this.timers.clear(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket !== null) {
      detach(socket);
      try {
        socket.close();
      } catch {
        // Déjà fermée.
      }
    }
    this.connected = false;
    this.canPing = false;
    this.pings.clear();
    this.clearTimer('openTimer');
    this.clearTimer('heartbeatTimer');
    this.clearTimer('pongTimer');
    this.abortPending(reason);
  }

  private clearTimer(slot: TimerSlot): void {
    const handle = this[slot];
    if (handle !== null) this.timers.clear(handle);
    this[slot] = null;
  }

  // ── le battement ───────────────────────────────────────────────────────

  private scheduleHeartbeat(): void {
    this.clearTimer('heartbeatTimer');
    if (!this.connected || !this.canPing) return;
    this.heartbeatTimer = this.timers.set(() => {
      this.heartbeatTimer = null;
      // Onglet caché : on ne pingue pas. Le navigateur bride les minuteries
      // d'un onglet en arrière-plan, et le réveil (`wake`) vérifiera au retour.
      if (this.visible()) this.ping();
      this.scheduleHeartbeat();
    }, this.heartbeatMs);
  }

  /**
   * Un `ping`, et le chien de garde qui le suit : si **rien** n'arrive dans
   * `PONG_TIMEOUT_MS` — ni le `pong`, ni aucun autre message —, le lien est
   * mort et la socket abandonnée. Un seul chien de garde à la fois.
   */
  private ping(): void {
    const socket = this.socket;
    if (socket === null || !this.connected || !this.canPing) return;
    if (this.pongTimer !== null) return;
    const id = this.nextPingId;
    this.nextPingId += 1;
    this.pings.set(id, this.now());
    // Un serveur qui ne rend jamais ses `pong` ne fait pas grossir la table.
    if (this.pings.size > CLOCK_SAMPLES * 2) {
      const oldest = this.pings.keys().next().value;
      if (oldest !== undefined) this.pings.delete(oldest);
    }
    this.pongTimer = this.timers.set(() => {
      this.pongTimer = null;
      if (this.socket !== socket) return;
      this.abandon(socket, 'aucune réponse au ping', false);
    }, PONG_TIMEOUT_MS);
    socket.send(encodeFrame({ t: 'ping', id }));
  }

  // ── réception ──────────────────────────────────────────────────────────

  private receive(socket: SocketLike, raw: unknown): void {
    const receivedAt = this.now();
    this.lastReceived = receivedAt;
    // N'importe quel message prouve que le lien vit.
    this.clearTimer('pongTimer');

    const inspected = inspectServerFrame(raw);
    if (inspected.kind === 'too-big') {
      // Un état qu'on ne peut pas lire est un état manqué : se taire gèlerait
      // la table pour ce siège (D23). On recycle la socket, bruyamment — la
      // reprise qui suit renverra un état complet.
      const size = typeof raw === 'string' ? raw.length : 0;
      this.log(`Garoutom : cadre du serveur trop gros (${String(size)} caractères) — reconnexion`);
      this.abandon(socket, 'cadre trop gros', false);
      return;
    }
    // Un message illisible, ou d'un type qu'une version future du serveur
    // aurait ajouté, est ignoré : il ne doit ni casser la partie en cours, ni
    // faire tomber la connexion sur laquelle elle repose.
    if (inspected.kind !== 'frame') return;
    this.handle(inspected.frame, receivedAt);
  }

  private handle(frame: ServerFrame, receivedAt: number): void {
    switch (frame.t) {
      case 'ev':
        this.emit(frame.e, frame.d);
        return;
      case 'hello':
        this.serverCapabilities = new Set(frame.capabilities);
        this.canPing = this.serverCapabilities.has('ping');
        // Le rythme du serveur fait foi, dans des bornes raisonnables.
        this.heartbeatMs =
          frame.heartbeatMs > 0 ? Math.min(120_000, Math.max(1_000, frame.heartbeatMs)) : HEARTBEAT_MS;
        this.scheduleHeartbeat();
        this.emit('hello', frame);
        return;
      case 'pong': {
        const sentAt = this.pings.get(frame.id);
        if (sentAt === undefined) return;
        this.pings.delete(frame.id);
        this.sampleClock(Math.max(0, receivedAt - sentAt), frame.now, receivedAt);
        return;
      }
      case 'ack': {
        const waiting = this.pending.get(frame.id);
        if (!waiting) return;
        this.pending.delete(frame.id);
        this.timers.clear(waiting.timer);
        settle(waiting, frame.r);
        return;
      }
    }
  }

  /**
   * L'heure du serveur, vue d'ici : au moment du `pong`, le serveur lisait
   * `serverNow` ; la réponse a voyagé environ la moitié de l'aller-retour.
   * Plus l'aller-retour est court, moins cette moitié se trompe : on garde
   * l'estimation du plus court parmi les derniers — qui survivent aux
   * reconnexions, l'horloge du serveur ne changeant pas avec la socket.
   */
  private sampleClock(rtt: number, serverNow: number, receivedAt: number): void {
    this.samples = [...this.samples, { rtt, offset: serverNow + rtt / 2 - receivedAt }].slice(-CLOCK_SAMPLES);
    let best: ClockSample | undefined;
    for (const sample of this.samples) if (best === undefined || sample.rtt < best.rtt) best = sample;
    if (best === undefined) return;
    const offset = Math.round(best.offset);
    if (offset === this.offset) return;
    this.offset = offset;
    this.emit('clock', offset);
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

/** Débranche une socket : plus aucun de ses évènements n'atteindra le canal. */
function detach(socket: SocketLike): void {
  socket.onopen = null;
  socket.onclose = null;
  socket.onmessage = null;
  socket.onerror = null;
}

function settle(waiting: Pending, result: Ack<unknown>): void {
  if (result.ok) waiting.resolve(result.data as never);
  else waiting.reject(new ChannelError(result.error, result.code));
}
