/**
 * Les tables de jeu : le salon, les sièges, le temps, et le silence.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ Ce fichier est le cœur du serveur, et le cœur ne connaît pas le     │
 * │ transport. Ni `ws`, ni Node : il reçoit un émetteur (« parle à cette │
 * │ connexion, ferme-la »), un magasin (« où vit la table »), un annuaire│
 * │ de sessions et des services d'hôte (« l'horloge, l'aléa de salon, le │
 * │ réveil »), et rien d'autre. Node et le Worker le reprennent tel quel ;│
 * │ seul le branchement change.                                         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Le serveur est l'unique autorité. Il détient le `GameState`, il tient le
 * temps que le moteur refuse de lire (R80), et c'est lui seul qui décide de
 * ce que le moteur ignore volontairement : qui est assis où, qui règle les
 * options, ce que fait le temps qui passe, et ce qu'on fait d'un joueur
 * parti. La légalité d'une action, la clôture d'une phase, la victoire —
 * rien de tout cela ne se réimplémente ici.
 *
 * ## Le silence est la loi (R87–R88)
 *
 * Une table de loup-garou ne « diffuse » pas un état : elle adresse à chaque
 * siège le sien. Chaque joueur reçoit `viewFor(state, seat)` — jamais l'état
 * brut — et une échéance calculée pour lui seul : celle de la phase s'il doit
 * agir maintenant, `null` sinon. Les évènements du moteur, eux, partent à
 * tous : aucun ne porte un secret. Et un siège dont la vue n'a pas changé ne
 * reçoit **rien** (D23) : la nuit, quand la Voyante sonde, le villageois ne
 * doit pas voir passer un `sync` de plus.
 *
 * ## Le cycle lire / transformer / ranger / agir
 *
 * Chaque transformation suit le même rythme : charger la table, la modifier
 * — de façon strictement synchrone —, la régler (hôte, minuterie, pause,
 * vacuité), la ranger, puis seulement agir au dehors : sessions, envois,
 * fermetures, réveil. Annoncer un état qui ne serait pas encore rangé, ou qui
 * aurait été refusé, serait pire que de ne rien annoncer. Les
 * transformations d'une même table s'attendent à la queue leu leu.
 *
 * ## Le temps est une donnée (D20)
 *
 * Aucune minuterie n'est source de vérité. Les échéances sont rangées dans
 * la table ; `nextWake` dit quand revenir, l'hôte réveille `tick`, et `tick`
 * fait tout ce qui est dû — une fois, quel que soit le nombre de réveils.
 */

import {
  ABANDON_MS,
  applyAction,
  cleanName,
  CLOSE_GONE,
  CLOSE_REPLACED,
  compositionFor,
  createGame,
  IllegalActionError,
  isAlive,
  LOBBY_GRACE_MS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  parseAction,
  pendingActors,
  phaseBudgetMs,
  RECONNECT_GRACE_MS,
  sanitizeOptions,
  timeoutPhase,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type GameView,
  type JoinResult,
  type NoticePayload,
  type PlayerInfo,
  type RoomStatus,
  type RoomView,
  type SyncPayload,
} from '@garoutom/engine';

import { appendJournal, emptyJournal, missedSince } from './journal.js';
import { ROOM_SCHEMA, upgradeRoom, type Room, type RoomTiming, type ServerPlayer } from './modele.js';
import { isRecyclable, nextWake, RETRY_DELAYS_MS, WATCHDOG_LATE_MS } from './planif.js';
import type { RoomStore } from './store.js';

export { ROOM_SCHEMA, upgradeRoom, type Room, type RoomTiming, type ServerPlayer } from './modele.js';
export {
  EMPTY_LOBBY_TTL_MS,
  EMPTY_ROOM_TTL_MS,
  IDLE_ROOM_MS,
  nextWake,
  RETRY_DELAYS_MS,
  WATCHDOG_LATE_MS,
} from './planif.js';
export { JOURNAL_SIZE } from './journal.js';

/* ------------------------------------------------------------------ */
/* Ce que l'hôte fournit                                               */
/* ------------------------------------------------------------------ */

/**
 * Les services que le cœur emprunte à son hôte.
 *
 * L'horloge n'est jamais lue directement, pour que les tests comme le Worker
 * installent la leur. `randomInt` ne sert qu'aux codes et aux graines,
 * jamais au jeu : l'aléa de la partie vit dans son état (R104).
 */
export interface HostServices {
  now(): number;
  uuid(): string;
  /** Entier uniforme dans [0, maxExclusive[ — codes de table, graines. */
  randomInt(maxExclusive: number): number;
  /**
   * Demande à l'hôte d'appeler `manager.tick(code)` à l'instant `at` (ms,
   * horloge de `now()`), ou d'oublier le réveil si `at` vaut null. Le dernier
   * appel pour un code remplace le précédent. L'hôte peut réveiller en
   * retard ou deux fois : `tick` est idempotent.
   */
  wake(code: string, at: number | null): void;
}

/** Les sessions de connexion : où vit le lien socket → (table, joueur). */
export interface SessionDirectory {
  get(socketId: string): { code: string; playerId: string } | undefined;
  set(socketId: string, session: { code: string; playerId: string }): void;
  delete(socketId: string): void;
  /** La socket est-elle encore ouverte sur cette instance ? (réconciliation) */
  isLive(socketId: string): boolean;
}

/**
 * L'annuaire d'une seule instance, en mémoire : celui de Node et des tests.
 *
 * Une socket assise y a toujours sa session, et une session n'y survit pas à
 * sa socket : être vivante, pour lui, c'est y figurer. Après un redémarrage,
 * l'annuaire est vide — toute socket rangée dans une table est morte, et la
 * réconciliation le dit (D21).
 */
export class MemorySessionDirectory implements SessionDirectory {
  private readonly sessions = new Map<string, { code: string; playerId: string }>();

  get(socketId: string): { code: string; playerId: string } | undefined {
    const found = this.sessions.get(socketId);
    return found === undefined ? undefined : { ...found };
  }

  set(socketId: string, session: { code: string; playerId: string }): void {
    this.sessions.set(socketId, { code: session.code, playerId: session.playerId });
  }

  delete(socketId: string): void {
    this.sessions.delete(socketId);
  }

  isLive(socketId: string): boolean {
    return this.sessions.has(socketId);
  }

  get size(): number {
    return this.sessions.size;
  }
}

/** L'émetteur : parler à une connexion, ou la fermer. */
export interface Emitter {
  toSocket(socketId: string, event: 'sync' | 'notice', payload: unknown): void;
  close(socketId: string, code: number, reason: string): void;
}

/** L'erreur d'une table, telle qu'elle voyage vers l'accusé de réception. */
export class RoomError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/* Bornes et garde-fous                                                */
/* ------------------------------------------------------------------ */

/**
 * Alphabet des codes de salon : quatre lettres sans caractères confondables
 * (`docs/refs/design.md`, section Accueil). La fonction d'un code est de se
 * recopier à voix haute, pas de se deviner.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${String(CODE_LENGTH)}}$`);
const MAX_CODE_ATTEMPTS = 200;
/** Un jeton plus long que cela n'est pas un des nôtres. */
const MAX_TOKEN_LENGTH = 128;

/** Au-delà, on n'ouvre plus de table (D23). */
export const MAX_ROOMS = 200;

/** Après l'interruption ratée d'une table, on réessaie à ce rythme. */
const INTERRUPT_RETRY_MS = 60_000;

/* ------------------------------------------------------------------ */
/* La transaction                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une transformation a à dire au monde, une fois la table rangée.
 *
 * La transformation reste strictement synchrone ; elle n'agit pas, elle
 * note. Tout ce qui est noté ici n'arrive qu'après un rangement réussi.
 */
interface Tx {
  now: number;
  /** Les évènements neufs du moteur, à numéroter et à envoyer à tous. */
  events: GameEvent[];
  /** Sessions et fermetures : joués avant les envois, dans l'ordre. */
  effects: (() => void)[];
  notices: { message: string; tone: NoticePayload['tone'] }[];
  /**
   * Les connexions qui doivent recevoir un `sync` même si leur vue n'a pas
   * changé — une arrivée, une reprise —, avec le dernier numéro qu'elles ont
   * vu (`null` : rien à rejouer).
   */
  fresh: Map<string, number | null>;
}

function newTx(now: number): Tx {
  return { now, events: [], effects: [], notices: [], fresh: new Map() };
}

/** Un `sync` prêt à partir, et l'empreinte qui dit s'il apporte du neuf. */
interface Delivery {
  socketId: string;
  fingerprint: string;
  force: boolean;
  payload: SyncPayload;
}

/* ------------------------------------------------------------------ */
/* Nettoyage des entrées réseau                                        */
/* ------------------------------------------------------------------ */

function sanitizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 16) return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

function sanitizeToken(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_TOKEN_LENGTH ? raw : null;
}

function sanitizeSeq(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

/** Le refus du moteur devient le refus de la table, code compris. */
function asRoomError(error: unknown): unknown {
  return error instanceof IllegalActionError ? new RoomError(error.message, error.code) : error;
}

function seatAlive(game: GameState | null, seat: number): boolean {
  if (!game || !Number.isSafeInteger(seat) || seat < 0 || seat >= game.players.length) return false;
  return isAlive(game, seat);
}

function journaliser(message: string, details?: unknown): void {
  console.error(`[garoutom] ${message}`, details ?? '');
}

/* ------------------------------------------------------------------ */
/* Le gestionnaire de tables                                           */
/* ------------------------------------------------------------------ */

export class RoomManager {
  /** Une file d'attente par table : deux demandes sur la même ne se croisent jamais. */
  private readonly queues = new Map<string, Promise<void>>();
  /** La dernière vue envoyée à chaque connexion, pour ne pas la renvoyer (D23). */
  private readonly fingerprints = new Map<string, string>();
  /** Les tables dont `tick` a échoué : combien de fois, et quand réessayer. */
  private readonly failures = new Map<string, { attempts: number; retryAt: number }>();
  /** Les tables illisibles déjà signalées : on ne le crie qu'une fois. */
  private readonly unreadable = new Set<string>();

  constructor(
    private readonly emitter: Emitter,
    private readonly store: RoomStore<Room>,
    private readonly host: HostServices,
    private readonly sessions: SessionDirectory = new MemorySessionDirectory(),
  ) {}

  /* ── les files et la transaction ────────────────────────────────────── */

  private queue<T>(code: string, run: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(code) ?? Promise.resolve();
    const result = previous.then(run, run);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(code, tail);
    // `tail` ne rejette jamais ; le nettoyage non plus.
    tail
      .then(() => {
        if (this.queues.get(code) === tail) this.queues.delete(code);
      })
      .catch(() => undefined);
    return result;
  }

  /** La table rangée sous ce code, remise à la forme courante — `null` si absente ou illisible. */
  private async load(code: string): Promise<Room | null> {
    const raw = await this.store.load(code);
    if (raw === null) return null;
    try {
      const room = upgradeRoom(raw, this.host.now());
      this.unreadable.delete(code);
      return room;
    } catch (error) {
      if (!this.unreadable.has(code)) {
        this.unreadable.add(code);
        journaliser(`table ${code} illisible, laissée de côté`, error);
      }
      return null;
    }
  }

  /** Charge, transforme, range, agit. À appeler dans la file de la table. */
  private async transact<T>(
    code: string,
    change: (room: Room, tx: Tx) => T,
    onlyIfChanged = false,
  ): Promise<T> {
    const room = await this.load(code);
    if (!room) throw new RoomError('Cette table n’existe plus', 'gone');
    return this.transactLoaded(room, change, onlyIfChanged);
  }

  private async transactLoaded<T>(
    room: Room,
    change: (room: Room, tx: Tx) => T,
    onlyIfChanged: boolean,
  ): Promise<T> {
    const tx = newTx(this.host.now());
    const before = onlyIfChanged ? JSON.stringify(room) : null;

    // Fenêtre strictement synchrone : ni `await` ni rappel jusqu'au rangement.
    const result = change(room, tx);
    this.settle(room, tx);

    const quiet =
      before !== null &&
      tx.events.length === 0 &&
      tx.effects.length === 0 &&
      tx.notices.length === 0 &&
      tx.fresh.size === 0 &&
      JSON.stringify(room) === before;
    if (quiet) {
      // Rien n'a changé : pas d'écriture, seulement le prochain réveil.
      this.wake(room, tx.now);
      return result;
    }

    room.updatedAt = tx.now;
    const deliveries = this.publish(room, tx);
    await this.store.save(room.code, room);
    this.apply(room, tx, deliveries);
    return result;
  }

  /**
   * Règle ce qui découle de l'état, après toute transformation : l'hôte, la
   * minuterie de phase, la pause, la vacuité. Un seul endroit, pour qu'aucun
   * chemin ne l'oublie.
   */
  private settle(room: Room, tx: Tx): void {
    this.ensureHost(room);
    this.armPhase(room, tx.now);
    this.updatePause(room, tx.now);
    const someone = room.players.some((player) => player.socketId !== null);
    if (someone) room.emptySince = null;
    else room.emptySince ??= tx.now;
  }

  /** Après le rangement : sessions et fermetures, envois, avis, réveil. */
  private apply(room: Room, tx: Tx, deliveries: Delivery[]): void {
    for (const effect of tx.effects) {
      try {
        effect();
      } catch (error) {
        journaliser(`effet de bord en échec sur ${room.code}`, error);
      }
    }
    for (const delivery of deliveries) {
      if (!delivery.force && this.fingerprints.get(delivery.socketId) === delivery.fingerprint) continue;
      this.fingerprints.set(delivery.socketId, delivery.fingerprint);
      this.send(delivery.socketId, 'sync', delivery.payload);
    }
    if (tx.notices.length > 0) {
      const recipients = room.players
        .map((player) => player.socketId)
        .filter((socketId): socketId is string => socketId !== null);
      for (const notice of tx.notices) {
        const payload: NoticePayload = { message: notice.message, tone: notice.tone };
        for (const socketId of recipients) this.send(socketId, 'notice', payload);
      }
    }
    this.wake(room, tx.now);
  }

  private send(socketId: string, event: 'sync' | 'notice', payload: unknown): void {
    try {
      this.emitter.toSocket(socketId, event, payload);
    } catch (error) {
      journaliser(`envoi en échec vers ${socketId}`, error);
    }
  }

  private closeSocket(socketId: string, code: number, reason: string): void {
    try {
      this.emitter.close(socketId, code, reason);
    } catch (error) {
      journaliser(`fermeture en échec de ${socketId}`, error);
    }
  }

  /** Le prochain réveil de la table — jamais plus tôt qu'un nouvel essai en attente. */
  private wake(room: Room, now: number): void {
    let at = nextWake(room, now);
    const failure = this.failures.get(room.code);
    if (failure && (at === null || at < failure.retryAt)) at = failure.retryAt;
    this.safeWake(room.code, at);
  }

  private safeWake(code: string, at: number | null): void {
    try {
      this.host.wake(code, at);
    } catch (error) {
      journaliser(`réveil refusé par l’hôte pour ${code}`, error);
    }
  }

  /** Une connexion s'assoit : sa session, et une vue neuve. */
  private seatSocket(socketId: string, code: string, playerId: string): void {
    this.sessions.set(socketId, { code, playerId });
    this.fingerprints.delete(socketId);
  }

  /** Une connexion se lève : plus de session, plus d'empreinte. */
  private unseatSocket(socketId: string): void {
    this.sessions.delete(socketId);
    this.fingerprints.delete(socketId);
  }

  /** Comme `transact`, en résolvant d'abord la session de la connexion. */
  private mutateSession<T>(
    socketId: string,
    change: (room: Room, player: ServerPlayer, tx: Tx) => T,
  ): Promise<T> {
    const session = this.sessions.get(socketId);
    if (!session) return Promise.reject(new RoomError('Vous n’êtes à aucune table', 'session'));
    return this.queue(session.code, () =>
      this.transact(session.code, (room, tx) => {
        const player = room.players.find((entry) => entry.id === session.playerId);
        if (!player || player.socketId !== socketId) {
          throw new RoomError('Vous n’êtes plus à cette table', 'session');
        }
        return change(room, player, tx);
      }),
    );
  }

  /* ── le salon ───────────────────────────────────────────────────────── */

  async create(socketId: string, name: unknown, options?: unknown): Promise<JoinResult> {
    let clean: string;
    try {
      clean = cleanName(name);
    } catch (error) {
      throw asRoomError(error);
    }
    const sanitized = sanitizeOptions(options);
    if ((await this.store.count()) >= MAX_ROOMS) {
      throw new RoomError('Trop de tables ouvertes : réessayez dans un moment', 'rate');
    }
    const previous = this.sessions.get(socketId);

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = this.drawCode();
      // La file du code tire et range d'un seul geste : deux ouvertures
      // simultanées ne peuvent pas prendre le même code.
      const created = await this.queue(code, async () => {
        if (await this.store.has(code)) return null;
        const now = this.host.now();
        const player = this.newPlayer(clean, 0, socketId);
        const room: Room = {
          schema: ROOM_SCHEMA,
          code,
          status: 'lobby',
          options: sanitized,
          hostId: player.id,
          players: [player],
          game: null,
          seed: null,
          timing: null,
          journal: emptyJournal(),
          createdAt: now,
          updatedAt: now,
          emptySince: null,
        };
        await this.transactLoaded(
          room,
          (_room, tx) => {
            tx.effects.push(() => {
              this.seatSocket(socketId, code, player.id);
            });
            tx.fresh.set(socketId, null);
          },
          false,
        );
        return { code, playerId: player.id, token: player.token } satisfies JoinResult;
      });
      if (created) {
        // Personne ne s'assoit à deux tables à la fois : l'ancienne est quittée
        // une fois la nouvelle rangée, jamais avant.
        if (previous && previous.code !== created.code) await this.departFrom(previous, socketId);
        return created;
      }
    }
    throw new RoomError('Impossible de tirer un code libre', 'internal');
  }

  /**
   * Entrer à une table, ou y reprendre sa place.
   *
   * **Idempotent** (D22) : une connexion déjà assise à cette place qui
   * redemande la même chose obtient la même réponse, et rien ne bouge. Tout
   * se vérifie — code, jeton, état de la table, place, pseudo — **avant** de
   * quitter une autre table : un `room:join` refusé ne coûte jamais la place
   * qu'on avait.
   */
  async join(
    socketId: string,
    rawCode: unknown,
    name: unknown,
    token?: unknown,
    lastSeq?: unknown,
  ): Promise<JoinResult> {
    const code = sanitizeCode(rawCode);
    if (code === null) throw new RoomError('Aucune table avec ce code', 'gone');
    const key = sanitizeToken(token);
    const seen = sanitizeSeq(lastSeq);
    const previous = this.sessions.get(socketId);

    const result = await this.queue(code, async () => {
      const room = await this.load(code);
      if (!room) throw new RoomError('Aucune table avec ce code', 'gone');
      return this.transactLoaded(
        room,
        (table, tx) => this.seatAt(table, tx, socketId, previous, name, key, seen),
        false,
      );
    });

    if (previous && previous.code !== code) await this.departFrom(previous, socketId);
    return result;
  }

  private seatAt(
    room: Room,
    tx: Tx,
    socketId: string,
    previous: { code: string; playerId: string } | undefined,
    name: unknown,
    token: string | null,
    lastSeq: number | null,
  ): JoinResult {
    const code = room.code;
    // La connexion est-elle déjà assise ici ?
    const mine =
      previous?.code === code
        ? room.players.find((entry) => entry.id === previous.playerId && entry.socketId === socketId)
        : undefined;

    // Le jeton présent, c'est une reprise : il retrouve la place, même en
    // pleine partie, même absent depuis des heures (D17).
    const known = token === null ? undefined : room.players.find((entry) => entry.token === token);
    if (known) {
      if (mine && mine !== known) this.vacate(room, tx, mine);
      this.reattach(room, tx, known, socketId, lastSeq);
      return { code, playerId: known.id, token: known.token };
    }

    // Déjà assise, sans jeton (ou avec un jeton d'ailleurs) : même réponse.
    if (mine) {
      tx.fresh.set(socketId, lastSeq);
      return { code, playerId: mine.id, token: mine.token };
    }

    if (room.status !== 'lobby') throw new RoomError('La partie a déjà commencé', 'started');
    if (room.players.length >= MAX_PLAYERS) throw new RoomError('La table est complète', 'full');
    let clean: string;
    try {
      clean = cleanName(name);
    } catch (error) {
      throw asRoomError(error);
    }

    const player = this.newPlayer(this.uniqueName(room, clean), this.freeSeat(room), socketId);
    room.players.push(player);
    tx.effects.push(() => {
      this.seatSocket(socketId, code, player.id);
    });
    tx.fresh.set(socketId, null);
    return { code, playerId: player.id, token: player.token };
  }

  async setOptions(socketId: string, options: unknown): Promise<void> {
    return this.mutateSession(socketId, (room, player) => {
      this.requireHost(room, player);
      this.requireLobby(room);
      // Le moteur ne fait confiance à rien : ce filtre est la seule porte.
      room.options = sanitizeOptions(options);
    });
  }

  async start(socketId: string): Promise<void> {
    return this.mutateSession(socketId, (room, player, tx) => {
      this.requireHost(room, player);
      this.requireLobby(room);
      const count = room.players.length;
      if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
        throw new RoomError(
          `Il faut entre ${String(MIN_PLAYERS)} et ${String(MAX_PLAYERS)} joueurs`,
          'players',
        );
      }
      // La composition se vérifie avant de distribuer : une erreur ici doit
      // être lisible — des loups en surnombre, des rôles en trop —, pas un
      // état à moitié créé.
      try {
        compositionFor(count, room.options);
      } catch (error) {
        throw asRoomError(error);
      }

      this.reseat(room);
      // Une graine par partie : la distribution et tout l'aléa qui suit en
      // découlent, puis voyagent dans l'état (R104).
      const seed = this.host.randomInt(0x1_0000_0000);
      const step = createGame({ players: count, options: room.options }, seed);
      room.seed = seed;
      room.game = step.state;
      room.status = 'playing';
      room.timing = null;
      for (const entry of room.players) {
        entry.absent = false;
        // Un joueur encore en grâce au salon entre en partie absent : son
        // horloge d'abandon part du lancement.
        entry.abandonAt = entry.socketId === null ? tx.now + ABANDON_MS : null;
      }
      this.afterStep(room, tx, step.events);
    });
  }

  async rematch(socketId: string): Promise<void> {
    return this.mutateSession(socketId, (room, player, tx) => {
      this.requireHost(room, player);
      if (room.status !== 'finished') throw new RoomError('La partie n’est pas terminée', 'finished');
      room.game = null;
      room.seed = null;
      room.timing = null;
      room.status = 'lobby';
      // Le jeton vaut jusqu'à la revanche (D17) : les absents la manquent,
      // ceux qui sont encore en grâce la rejoignent, le temps d'une grâce de
      // salon au moins.
      room.players = room.players.filter(
        (entry) =>
          entry.socketId !== null ||
          (!entry.absent && entry.disconnectedUntil !== null && entry.disconnectedUntil > tx.now),
      );
      for (const entry of room.players) {
        entry.absent = false;
        entry.abandonAt = null;
        if (entry.socketId === null && entry.disconnectedUntil !== null) {
          entry.disconnectedUntil = Math.max(entry.disconnectedUntil, tx.now + LOBBY_GRACE_MS);
        }
      }
      // Le numéro continue — un client ne le voit jamais redescendre —, mais
      // la partie d'avant ne se rejoue plus.
      room.journal.entries = [];
      this.reseat(room);
    });
  }

  /* ── le jeu ─────────────────────────────────────────────────────────── */

  /**
   * L'intention d'un joueur, dans le vocabulaire du moteur.
   *
   * Le siège de l'auteur vient de la session, jamais de la charge utile : un
   * client ne peut pas jouer à la place d'un autre. La charge utile est relue
   * deux fois : sans la table d'abord, pour refuser l'illisible sans rien
   * charger, puis bornée par la table (R102).
   */
  async action(socketId: string, rawAction: unknown): Promise<void> {
    let first: Action;
    try {
      first = parseAction(rawAction);
    } catch (error) {
      throw asRoomError(error);
    }
    return this.mutateSession(socketId, (room, player, tx) => {
      const game = room.game;
      const chatAfterward = room.status === 'finished' && first.type === 'dire';
      if (!game || (room.status !== 'playing' && !chatAfterward)) {
        throw new RoomError('Aucune partie en cours', 'playing');
      }
      let step;
      try {
        step = applyAction(game, parseAction(rawAction, game.players.length), player.seat);
      } catch (error) {
        throw asRoomError(error);
      }
      room.game = step.state;
      this.afterStep(room, tx, step.events);
    });
  }

  /** Suites d'un pas de jeu : fin de partie, évènements. La minuterie se règle dans `settle`. */
  private afterStep(room: Room, tx: Tx, events: GameEvent[]): void {
    tx.events.push(...events);
    if (room.game?.over === true && room.status === 'playing') {
      room.status = 'finished';
      room.timing = null;
      for (const player of room.players) player.abandonAt = null;
    }
  }

  /* ── le temps (R80–R82, D18–D20) ─────────────────────────────────────── */

  /**
   * Arme l'échéance de la phase en cours, si elle ne l'est pas déjà.
   *
   * Une seule échéance par table, (ré)armée au changement de phase
   * seulement : la phase ne se rallonge pas parce qu'un voisin a joué. Le
   * numéro d'armement voyage avec elle : c'est le moteur qui rejette une
   * clôture périmée, pas nous (R80).
   */
  private armPhase(room: Room, now: number): void {
    const game = room.game;
    if (room.status !== 'playing' || !game || game.over) {
      room.timing = null;
      return;
    }
    if (room.timing?.seq === game.phaseSeq) return;
    // Une pause en cours se solde avant de changer d'échéance : l'horloge
    // d'abandon ne doit pas avoir couru pendant qu'elle était suspendue.
    if (room.timing && room.timing.pausedAt !== null) this.shiftAbandons(room, now - room.timing.pausedAt);
    const budget = phaseBudgetMs(game);
    room.timing =
      budget > 0
        ? { seq: game.phaseSeq, deadline: now + budget, durationMs: budget, pausedAt: null }
        : null;
  }

  /**
   * L'horloge se suspend quand plus aucun siège vivant n'est connecté (D19),
   * et reprend au premier retour, l'échéance décalée de la durée de la pause
   * — l'abandon aussi : il ne court pas pendant une pause.
   */
  private updatePause(room: Room, now: number): void {
    const timing = room.timing;
    if (room.status !== 'playing' || !timing || !room.game) return;
    const game = room.game;
    const someoneAlive = room.players.some(
      (player) => player.socketId !== null && seatAlive(game, player.seat),
    );
    if (!someoneAlive && timing.pausedAt === null) {
      timing.pausedAt = now;
    } else if (someoneAlive && timing.pausedAt !== null) {
      const shift = Math.max(0, now - timing.pausedAt);
      timing.deadline += shift;
      this.shiftAbandons(room, shift);
      timing.pausedAt = null;
    }
  }

  private shiftAbandons(room: Room, shift: number): void {
    if (shift <= 0) return;
    for (const player of room.players) {
      if (player.abandonAt !== null) player.abandonAt += shift;
    }
  }

  /**
   * L'échéance est passée : la phase se clôt avec ce qui a été joué.
   *
   * Qui n'a pas agi n'agit pas (R81) — le moteur s'en charge. Nous lui
   * présentons le numéro de la phase qui a armé, et la liste des sièges
   * vivants absents depuis `ABANDON_MS` (D18, R101) : c'est la seule
   * clôture où ils meurent d'abandon.
   */
  private closePhase(room: Room, tx: Tx): void {
    const game = room.game;
    const timing = room.timing;
    if (!game || !timing) return;
    const abandons = room.players
      .filter(
        (player) =>
          player.socketId === null &&
          player.abandonAt !== null &&
          player.abandonAt <= tx.now &&
          seatAlive(game, player.seat),
      )
      .map((player) => player.seat)
      .sort((a, b) => a - b);
    let step;
    try {
      step = timeoutPhase(game, timing.seq, { abandons });
    } catch (error) {
      // R80 : une échéance périmée ne clôt rien. On réarme sur la phase en
      // cours, et la table continue son cours.
      if (error instanceof IllegalActionError && (error.code === 'stale' || error.code === 'over')) {
        room.timing = null;
        if (game.over) room.status = 'finished';
        return;
      }
      throw error;
    }
    room.game = step.state;
    this.afterStep(room, tx, step.events);
  }

  /**
   * Fait tout ce qui est dû pour cette table : grâces éteintes, clôture de
   * phase, recyclage. Idempotent — deux réveils au même instant font une
   * seule fois le travail — et ne lève jamais.
   *
   * Une erreur inattendue est journalisée, puis retentée à délai croissant
   * (5, 10, 20 s) ; au-delà, la partie est interrompue plutôt que figée
   * (D20).
   */
  async tick(code: string): Promise<void> {
    try {
      await this.queue(code, () => this.tickNow(code));
      this.failures.delete(code);
    } catch (error) {
      await this.tickFailed(code, error);
    }
  }

  private async tickNow(code: string): Promise<void> {
    const room = await this.load(code);
    if (!room) {
      this.safeWake(code, null);
      return;
    }
    if (isRecyclable(room, this.host.now())) {
      await this.recycle(room);
      return;
    }
    await this.transactLoaded(
      room,
      (table, tx) => {
        this.expireGraces(table, tx.now);
        const timing = table.timing;
        if (table.status === 'playing' && timing && timing.pausedAt === null && timing.deadline <= tx.now) {
          this.closePhase(table, tx);
        }
      },
      true,
    );
  }

  /** Les grâces éteintes : au salon la place se libère, en partie le joueur est montré absent (D17). */
  private expireGraces(room: Room, now: number): void {
    const released = new Set<ServerPlayer>();
    for (const player of room.players) {
      if (player.socketId !== null || player.disconnectedUntil === null) continue;
      if (player.disconnectedUntil > now) continue;
      if (room.status === 'lobby') {
        released.add(player);
      } else {
        player.absent = true;
        player.disconnectedUntil = null;
      }
    }
    if (released.size > 0) {
      room.players = room.players.filter((player) => !released.has(player));
      this.reseat(room);
    }
  }

  private async tickFailed(code: string, error: unknown): Promise<void> {
    const now = this.safeNow();
    const attempts = (this.failures.get(code)?.attempts ?? 0) + 1;
    journaliser(`réveil de la table ${code} en échec (essai ${String(attempts)})`, error);
    const delay = RETRY_DELAYS_MS[attempts - 1];
    if (delay !== undefined) {
      const retryAt = now + delay;
      this.failures.set(code, { attempts, retryAt });
      this.safeWake(code, retryAt);
      return;
    }
    // Trois nouveaux essais n'y ont rien fait : une partie interrompue vaut
    // mieux qu'une partie figée. L'hôte pourra lancer une revanche.
    this.failures.delete(code);
    try {
      await this.queue(code, () => this.interrupt(code));
    } catch (failure) {
      journaliser(`interruption de la table ${code} en échec`, failure);
      const retryAt = now + INTERRUPT_RETRY_MS;
      this.failures.set(code, { attempts, retryAt });
      this.safeWake(code, retryAt);
    }
  }

  private async interrupt(code: string): Promise<void> {
    await this.transact(code, (room, tx) => {
      if (room.status !== 'playing') return;
      room.status = 'finished';
      room.timing = null;
      for (const player of room.players) player.abandonAt = null;
      tx.notices.push({
        message: 'La partie a été interrompue par un incident du serveur. L’hôte peut lancer une revanche.',
        tone: 'error',
      });
    });
  }

  private safeNow(): number {
    try {
      return this.host.now();
    } catch {
      return Date.now();
    }
  }

  /** Recycle une table : son code redevient libre, ses dernières connexions sont prévenues. */
  private async recycle(room: Room): Promise<void> {
    await this.store.remove(room.code);
    for (const player of room.players) {
      const socketId = player.socketId;
      if (socketId === null) continue;
      this.unseatSocket(socketId);
      this.closeSocket(socketId, CLOSE_GONE, 'Cette table n’existe plus');
    }
    this.failures.delete(room.code);
    this.safeWake(room.code, null);
  }

  /**
   * Le chien de garde (D20) : toute table dont un réveil est dû depuis plus
   * de `WATCHDOG_LATE_MS` est forcée — une échéance de phase oubliée par
   * l'hôte, une grâce, un recyclage, une table oubliée depuis six heures. Ne
   * lève jamais.
   */
  async watchdog(): Promise<void> {
    let codes: string[];
    try {
      codes = await this.store.codes();
    } catch (error) {
      journaliser('chien de garde : magasin illisible', error);
      return;
    }
    for (const code of codes) {
      try {
        const now = this.host.now();
        const failure = this.failures.get(code);
        if (failure && failure.retryAt > now) continue;
        const room = await this.load(code);
        if (!room) continue;
        const at = nextWake(room, now);
        if (isRecyclable(room, now) || (at !== null && at <= now - WATCHDOG_LATE_MS)) {
          await this.tick(code);
        }
      } catch (error) {
        journaliser(`chien de garde : table ${code} en échec`, error);
      }
    }
  }

  /**
   * Recharge toutes les tables du magasin (démarrage de Node, réveil du
   * Worker), les réconcilie et réarme leurs réveils (D21).
   *
   * Une connexion rangée dans une table mais morte sur cette instance devient
   * une absence, avec une grâce comptée depuis maintenant. Une partie dont
   * plus aucun vivant n'est là se suspend (D19). Ne lève jamais.
   */
  async restore(): Promise<void> {
    let codes: string[];
    try {
      codes = await this.store.codes();
    } catch (error) {
      journaliser('reprise : magasin illisible', error);
      return;
    }
    for (const code of codes) {
      try {
        await this.queue(code, () => this.reconcile(code));
      } catch (error) {
        journaliser(`reprise de la table ${code} en échec`, error);
      }
    }
  }

  private async reconcile(code: string): Promise<void> {
    const room = await this.load(code);
    if (!room) return;
    if (isRecyclable(room, this.host.now())) {
      await this.recycle(room);
      return;
    }
    await this.transactLoaded(
      room,
      (table, tx) => {
        for (const player of table.players) {
          const socketId = player.socketId;
          if (socketId === null) continue;
          if (!this.sessions.isLive(socketId)) {
            this.markDisconnected(table, player, tx.now);
            this.fingerprints.delete(socketId);
          } else if (this.sessions.get(socketId)?.playerId !== player.id) {
            const playerId = player.id;
            tx.effects.push(() => {
              this.seatSocket(socketId, table.code, playerId);
            });
          }
        }
      },
      true,
    );
  }

  /* ── la présence (D17) ───────────────────────────────────────────────── */

  /** Le jeton reprend la place : la grâce, l'absence et l'horloge d'abandon s'éteignent. */
  private reattach(room: Room, tx: Tx, player: ServerPlayer, socketId: string, lastSeq: number | null): void {
    const old = player.socketId;
    if (old !== null && old !== socketId) {
      // La place est reprise depuis une autre connexion : l'ancienne se tait
      // et se ferme en 4001 — elle ne reprendra pas toute seule (D22).
      tx.effects.push(() => {
        this.unseatSocket(old);
        this.closeSocket(old, CLOSE_REPLACED, 'Partie ouverte ailleurs');
      });
    }
    player.socketId = socketId;
    player.disconnectedUntil = null;
    player.absent = false;
    player.abandonAt = null;
    const code = room.code;
    const playerId = player.id;
    tx.effects.push(() => {
      this.seatSocket(socketId, code, playerId);
    });
    tx.fresh.set(socketId, lastSeq);
  }

  /** La connexion est tombée : la grâce commence. */
  private markDisconnected(room: Room, player: ServerPlayer, now: number): void {
    player.socketId = null;
    if (room.status === 'lobby') {
      player.disconnectedUntil = now + LOBBY_GRACE_MS;
      return;
    }
    player.disconnectedUntil = now + RECONNECT_GRACE_MS;
    player.absent = false;
    if (room.status === 'playing') player.abandonAt = now + ABANDON_MS;
  }

  /**
   * La connexion est tombée. Au salon, la place est gardée `LOBBY_GRACE_MS` ;
   * en partie, elle l'est jusqu'à la fin — passé `RECONNECT_GRACE_MS`, le
   * joueur est seulement montré absent (D17). Ne lève jamais.
   */
  async disconnect(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) {
      this.fingerprints.delete(socketId);
      return;
    }
    try {
      await this.queue(session.code, () =>
        this.transact(session.code, (room, tx) => {
          const player = room.players.find((entry) => entry.id === session.playerId);
          if (!player || player.socketId !== socketId) return; // sa place est à une autre connexion
          this.markDisconnected(room, player, tx.now);
          tx.effects.push(() => {
            this.unseatSocket(socketId);
          });
        }),
      );
    } catch (error) {
      if (!(error instanceof RoomError && error.code === 'gone')) {
        journaliser(`déconnexion mal enregistrée sur ${session.code}`, error);
      }
    } finally {
      // Quoi qu'il arrive à la table, la connexion n'existe plus.
      if (this.sessions.get(socketId)?.code === session.code) this.unseatSocket(socketId);
    }
  }

  /**
   * Quitter volontairement la table. Au salon, la place se libère aussitôt ;
   * en partie, le joueur devient absent — son jeton le ramènera (D17).
   */
  async leave(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) return;
    try {
      await this.queue(session.code, () =>
        this.transact(session.code, (room, tx) => {
          const player = room.players.find((entry) => entry.id === session.playerId);
          if (!player || player.socketId !== socketId) return;
          this.vacate(room, tx, player);
          tx.effects.push(() => {
            this.unseatSocket(socketId);
          });
        }),
      );
    } catch (error) {
      if (!(error instanceof RoomError && error.code === 'gone')) throw error;
    } finally {
      if (this.sessions.get(socketId)?.code === session.code) this.unseatSocket(socketId);
    }
  }

  /** Quitte une ancienne table après en avoir rejoint une autre. Ne lève jamais. */
  private async departFrom(previous: { code: string; playerId: string }, socketId: string): Promise<void> {
    try {
      await this.queue(previous.code, () =>
        this.transact(previous.code, (room, tx) => {
          const player = room.players.find((entry) => entry.id === previous.playerId);
          if (!player || player.socketId !== socketId) return;
          this.vacate(room, tx, player);
        }),
      );
    } catch (error) {
      if (!(error instanceof RoomError && error.code === 'gone')) {
        journaliser(`départ mal enregistré de ${previous.code}`, error);
      }
    }
  }

  /** Un départ volontaire. La session de la connexion, elle, est l'affaire de l'appelant. */
  private vacate(room: Room, tx: Tx, player: ServerPlayer): void {
    if (room.status === 'lobby') {
      room.players = room.players.filter((entry) => entry !== player);
      this.reseat(room);
      return;
    }
    player.socketId = null;
    player.disconnectedUntil = null;
    player.absent = true;
    if (room.status === 'playing' && player.abandonAt === null) player.abandonAt = tx.now + ABANDON_MS;
    tx.notices.push({ message: `${player.name} quitte la table`, tone: 'info' });
  }

  /* ── la diffusion : N envois adressés ───────────────────────────────── */

  /**
   * Ce que chaque siège connecté doit recevoir — calculé une fois la table
   * réglée, juste avant le rangement. Les évènements neufs sont numérotés
   * ici (D22). L'envoi, lui, attend le rangement, et saute les vues
   * inchangées (D23).
   */
  private publish(room: Room, tx: Tx): Delivery[] {
    if (tx.events.length > 0) appendJournal(room.journal, tx.events);
    const seq = room.journal.seq;
    const deliveries: Delivery[] = [];
    for (const player of room.players) {
      const socketId = player.socketId;
      if (socketId === null) continue;
      const view = this.roomViewFor(room, player.seat);
      const game = this.gameViewFor(room, player.seat);
      const fresh = tx.fresh.get(socketId);
      let events = tx.events;
      let replay = false;
      if (fresh !== undefined && fresh !== null && events.length === 0) {
        const missed = missedSince(room.journal, fresh);
        if (missed.length > 0) {
          events = missed;
          replay = true;
        }
      }
      const payload: SyncPayload = { room: view, game, events, seq, serverNow: tx.now };
      if (replay) payload.replay = true;
      deliveries.push({
        socketId,
        fingerprint: JSON.stringify([view, game, seq]),
        force: fresh !== undefined || events.length > 0,
        payload,
      });
    }
    return deliveries;
  }

  /** La vue de la table pour un destinataire — la sienne, pas celle du voisin. */
  private roomViewFor(room: Room, seat: number): RoomView {
    const players: PlayerInfo[] = room.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      connected: player.socketId !== null,
      isHost: player.id === room.hostId,
      disconnectedUntil: player.socketId === null ? player.disconnectedUntil : null,
      absent: player.socketId === null && player.absent,
    }));
    // L'échéance de la phase, si — et seulement si — ce siège doit agir
    // maintenant. Celle des autres est un secret (R80).
    const timing = this.deadlineFor(room, seat);
    return {
      code: room.code,
      status: room.status,
      options: room.options,
      hostId: room.hostId,
      players,
      reconnectGraceMs: room.status === 'lobby' ? LOBBY_GRACE_MS : RECONNECT_GRACE_MS,
      deadline: timing === null ? null : timing.deadline,
      deadlineDurationMs: timing === null ? null : timing.durationMs,
      paused: room.status === 'playing' && room.timing !== null && room.timing.pausedAt !== null,
    };
  }

  private deadlineFor(room: Room, seat: number): RoomTiming | null {
    const game = room.game;
    if (!game || room.status !== 'playing' || game.over) return null;
    const timing = room.timing;
    if (!timing || timing.seq !== game.phaseSeq) return null;
    try {
      return pendingActors(game).includes(seat) ? timing : null;
    } catch {
      return null;
    }
  }

  /** La vue de la partie pour un siège ; une vue impossible à calculer se tait plutôt que de tout bloquer. */
  private gameViewFor(room: Room, seat: number): GameView | null {
    if (!room.game) return null;
    try {
      return viewFor(room.game, seat);
    } catch (error) {
      journaliser(`vue impossible pour le siège ${String(seat)} de ${room.code}`, error);
      return null;
    }
  }

  /* ── utilitaires ────────────────────────────────────────────────────── */

  private newPlayer(name: string, seat: number, socketId: string): ServerPlayer {
    return {
      id: this.host.uuid(),
      token: this.host.uuid(),
      name,
      seat,
      socketId,
      disconnectedUntil: null,
      absent: false,
      abandonAt: null,
    };
  }

  /** Un pseudo déjà pris se suffixe : « Tom », puis « Tom 2 » (R103). */
  private uniqueName(room: Room, name: string): string {
    const plier = (value: string): string => value.toLocaleLowerCase('fr');
    const taken = new Set(room.players.map((player) => plier(player.name)));
    if (!taken.has(plier(name))) return name;
    for (let n = 2; n <= MAX_PLAYERS + 1; n += 1) {
      const suffix = ` ${String(n)}`;
      const base = Array.from(name)
        .slice(0, MAX_NAME_LENGTH - suffix.length)
        .join('')
        .trimEnd();
      const candidate = `${base}${suffix}`;
      if (!taken.has(plier(candidate))) return candidate;
    }
    return name;
  }

  /** Le plus petit siège libre : on s'assoit dans l'ordre d'arrivée. */
  private freeSeat(room: Room): number {
    const taken = new Set(room.players.map((player) => player.seat));
    for (let seat = 0; seat < MAX_PLAYERS; seat += 1) if (!taken.has(seat)) return seat;
    throw new RoomError('La table est complète', 'full');
  }

  /**
   * Recale les sièges sur `0..n-1`, au salon seulement.
   *
   * Le moteur déduit tout du numéro de siège : un trou dans la numérotation
   * le ferait sortir de son domaine. En cours de partie, les sièges sont
   * figés — même celui d'un joueur qui ne reviendra pas.
   */
  private reseat(room: Room): void {
    if (room.status !== 'lobby') return;
    room.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .forEach((player, index) => {
        player.seat = index;
      });
  }

  /**
   * L'hôte reste l'hôte tant qu'il est là, ou seulement de passage hors
   * ligne. Parti pour de bon — retiré du salon, ou montré absent —, sa charge
   * passe au premier joueur **connecté** (D17). Personne de connecté : on
   * attend le prochain qui entre ou revient, qui la reçoit.
   */
  private ensureHost(room: Room): void {
    const host = room.players.find((player) => player.id === room.hostId);
    if (host && (host.socketId !== null || !host.absent)) return;
    const heir = room.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .find((player) => player.socketId !== null);
    if (heir) room.hostId = heir.id;
  }

  private requireHost(room: Room, player: ServerPlayer): void {
    if (player.id !== room.hostId) throw new RoomError('Seul l’hôte peut faire cela', 'host');
  }

  private requireLobby(room: Room): void {
    if (room.status !== 'lobby') throw new RoomError('La partie a déjà commencé', 'lobby');
  }

  /** Quatre lettres de l'alphabet sans ambiguïté. */
  private drawCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[this.host.randomInt(CODE_ALPHABET.length)] ?? 'A';
    }
    return code;
  }

  /* ── pour les hôtes et les tests ────────────────────────────────────── */

  /** Cette connexion est-elle assise à une table ? (le concentrateur ferme les autres) */
  seated(socketId: string): boolean {
    return this.sessions.get(socketId) !== undefined;
  }

  /** Pour /health. */
  async stats(): Promise<{ tables: Record<RoomStatus, number>; sockets: number }> {
    const tables: Record<RoomStatus, number> = { lobby: 0, playing: 0, finished: 0 };
    let sockets = 0;
    for (const code of await this.store.codes()) {
      const room = await this.load(code);
      if (!room) continue;
      tables[room.status] += 1;
      sockets += room.players.filter((player) => player.socketId !== null).length;
    }
    return { tables, sockets };
  }

  /** Pour les tests et le dépannage : la table rangée, sous son code. */
  async peek(code: string): Promise<Room | undefined> {
    return (await this.load(code)) ?? undefined;
  }
}
