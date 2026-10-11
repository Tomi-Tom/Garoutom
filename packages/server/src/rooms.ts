/**
 * Les tables de jeu : le salon, les sièges, le temps, et le silence.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ Ce fichier est le cœur du serveur, et le cœur ne connaît pas le     │
 * │ transport. Ni `ws`, ni Node : il reçoit un émetteur (« envoie à      │
 * │ cette connexion »), un magasin (« où vit la table ») et des services │
 * │ d'hôte (« l'horloge, les minuteries, l'aléa de salon »), et rien    │
 * │ d'autre. Le Worker Cloudflare le reprendra tel quel derrière un     │
 * │ Durable Object ; seul le branchement change.                        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Le serveur est l'unique autorité. Il détient le `GameState`, c'est lui qui
 * arme les minuteries que le moteur refuse de lire (R80), et c'est lui seul
 * qui décide de ce que le moteur ignore volontairement : qui est assis où,
 * qui règle les options, ce que fait le temps qui passe, et ce qu'on fait
 * d'un joueur parti. La légalité d'une action, la clôture d'une phase, la
 * victoire — rien de tout cela ne se réimplémente ici.
 *
 * ## Le silence est la loi (R87–R88)
 *
 * Une table de loup-garou ne « diffuse » pas un état : elle adresse à chaque
 * siège le sien. Chaque joueur reçoit `viewFor(state, seat)` — jamais
 * l'état brut — et une échéance calculée pour lui seul : celle de la phase
 * s'il doit agir maintenant, `null` sinon. Savoir que quelqu'un d'autre a
 * une minuterie, la nuit, c'est savoir qu'il a un rôle. Les évènements du
 * moteur, eux, partent à tous : aucun ne porte un secret. C'est pourquoi
 * l'émetteur n'a qu'un seul geste, « envoie à cette connexion » : ce qui
 * ressemble à une diffusion est toujours N envois adressés.
 *
 * ## Le cycle lire / appliquer / écrire
 *
 * Chaque transformation suit le même rythme : charger la table, la modifier
 * — de façon strictement synchrone —, la ranger, puis seulement parler aux
 * clients. Annoncer un état qui ne serait pas encore rangé, ou qui aurait
 * été refusé, serait pire que de ne rien annoncer. Les transformations
 * d'une même table s'attendent à la queue leu leu : deux joueurs qui
 * cliquent en même temps ne doivent jamais écrire deux fois la même version.
 */

import {
  ACTION_TYPES,
  applyAction,
  compositionFor,
  createGame,
  createSeededRng,
  IllegalActionError,
  MAX_PLAYERS,
  MIN_PLAYERS,
  pendingActors,
  phaseBudgetMs,
  RECONNECT_GRACE_MS,
  sanitizeOptions,
  timeoutPhase,
  viewFor,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type JoinResult,
  type NoticePayload,
  type PlayerInfo,
  type Rng,
  type RoomStatus,
  type RoomView,
  type SyncPayload,
} from '@garoutom/engine';

import type { RoomStore } from './store.js';

/* ------------------------------------------------------------------ */
/* Ce que l'hôte fournit                                               */
/* ------------------------------------------------------------------ */

/** Une minuterie, quelle que soit la manière dont l'hôte la tient. */
export type TimerHandle = unknown;

/**
 * Les services que le cœur emprunte à son hôte.
 *
 * Tout ce qui n'est pas de la logique de table vit ici : l'horloge (jamais
 * lue directement, pour que les tests comme le Worker installent la leur),
 * les identifiants et le hasard des salons, et les minuteries — qu'un
 * Worker remplacera un jour par des alarmes. Le moteur, lui, garde son
 * `Rng` à lui : `randomInt` ne sert qu'aux codes et aux graines, jamais au
 * jeu.
 */
export interface HostServices {
  now(): number;
  uuid(): string;
  /** Un entier uniforme dans `[0, maxExclusive[`. */
  randomInt(maxExclusive: number): number;
  set(run: () => void, delay: number): TimerHandle;
  clear(handle: TimerHandle): void;
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

/** L'unique geste de l'émetteur : parler à une connexion précise. */
export interface Emitter {
  toSocket: (socketId: string, event: 'sync' | 'notice', payload: unknown) => void;
}

/* ------------------------------------------------------------------ */
/* Le modèle interne                                                   */
/* ------------------------------------------------------------------ */

/**
 * Un joueur, tel qu'il est rangé dans le magasin.
 *
 * `disconnectedUntil` est une date, donc sérialisable : c'est ce qui permet
 * de savoir où en est la grâce sans avoir armé soi-même la minuterie. Le
 * jeton, lui, ne quitte jamais ce fichier vers les autres joueurs : seul
 * l'intéressé le reçoit, une fois, dans son `JoinResult`.
 */
interface ServerPlayer {
  id: string;
  /** Secret de reconnexion. Ne doit jamais être diffusé. */
  token: string;
  name: string;
  seat: number;
  socketId: string | null;
  disconnectedUntil: number | null;
}

/**
 * La minuterie de phase, en dates sérialisables.
 *
 * Le `setTimeout` vit dans le carnet de l'instance ; ce qui est rangé ici,
 * c'est ce que la table sait du temps : quand la phase s'éteint, et pour
 * quelle phase — le numéro d'armement de R80.
 */
interface RoomTiming {
  /** Le `phaseSeq` qui a armé cette minuterie. */
  seq: number;
  deadline: number;
  durationMs: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  options: GameOptions;
  hostId: string;
  players: ServerPlayer[];
  game: GameState | null;
  /** La graine de la partie en cours — l'aléa se rejoue (R86). */
  seed: number | null;
  timing: RoomTiming | null;
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
const MAX_CODE_ATTEMPTS = 200;

const MAX_NAME_LENGTH = 16;
/** Une table que plus personne ne regarde est recyclée. */
export const EMPTY_ROOM_TTL_MS = 15 * 60_000;
const MAX_ROOMS = 500;

/**
 * Les verbes du moteur — la seule liste qui fait foi côté réseau. Elle vient
 * du moteur lui-même (`ACTION_TYPES`) : un verbe ajouté là-bas, Corbeau ou
 * Loup Blanc compris, est accepté ici sans qu'on ait à s'en souvenir.
 */
const VERBES: ReadonlySet<string> = new Set(ACTION_TYPES);

/* ------------------------------------------------------------------ */
/* Le carnet de minuteries                                             */
/* ------------------------------------------------------------------ */

/**
 * Les minuteries de cette instance, hors de l'état : un `Timeout` ne se
 * sérialise pas, et il n'a de sens que dans le processus qui l'a armé.
 * Les clés portent le code de la table — `${code}:phase` pour la phase,
 * `${code}:grace:${joueur}` pour une grâce, `${code}:empty` pour le recyclage.
 */
class TimerBook {
  private readonly timers = new Map<string, TimerHandle>();

  constructor(private readonly host: HostServices) {}

  arm(key: string, run: () => void, delay: number): void {
    this.clear(key);
    this.timers.set(key, this.host.set(run, delay));
  }

  clear(key: string): void {
    const handle = this.timers.get(key);
    if (handle !== undefined) this.host.clear(handle);
    this.timers.delete(key);
  }

  clearWhere(prefix: string): void {
    for (const key of [...this.timers.keys()]) if (key.startsWith(prefix)) this.clear(key);
  }
}

/* ------------------------------------------------------------------ */
/* Nettoyage des entrées réseau                                        */
/* ------------------------------------------------------------------ */

function sanitizeName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().slice(0, MAX_NAME_LENGTH) : '';
  if (name.length === 0) throw new RoomError('Il faut un pseudo');
  return name;
}

function sanitizeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase().slice(0, CODE_LENGTH) : '';
}

/**
 * Le verbe d'une action, vérifié avant d'atteindre le moteur.
 *
 * Le moteur validerait lui-même le reste de la charge utile — cibles, potions,
 * canaux — mais un verbe inconnu produirait un « succès » vide : aucune action
 * jouée, aucun refus. Une intention qui ne dit pas son verbe n'est pas une
 * intention.
 */
function sanitizeAction(raw: unknown): Action {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new RoomError('Action illisible', 'action');
  }
  const type = (raw as { type?: unknown }).type;
  if (typeof type !== 'string' || !VERBES.has(type)) {
    throw new RoomError('Action inconnue', 'action');
  }
  return raw as Action;
}

/* ------------------------------------------------------------------ */
/* Le gestionnaire de tables                                           */
/* ------------------------------------------------------------------ */

export class RoomManager {
  private readonly sessions = new Map<string, { code: string; playerId: string }>();
  /** L'aléa de chaque partie en cours : un `Rng` seedé par table (R86). */
  private readonly rngs = new Map<string, Rng>();
  private readonly timers: TimerBook;
  /** Une file d'attente par table : deux demandes sur la même ne se croisent jamais. */
  private readonly queues = new Map<string, Promise<void>>();

  /**
   * Les envois en attente de rangement.
   *
   * On ne parle aux clients qu'une fois la table rangée. Un seul tampon
   * suffit : la fonction qui le remplit est toujours strictement synchrone.
   */
  private outbox: (() => void)[] = [];

  constructor(
    private readonly emitter: Emitter,
    private readonly store: RoomStore<Room>,
    private readonly host: HostServices,
  ) {
    this.timers = new TimerBook(host);
  }

  /* ── le cycle lire / appliquer / écrire ─────────────────────────────── */

  private mutate<T>(code: string, change: (room: Room) => T): Promise<T> {
    return this.queue(code, () => this.attempt(code, change));
  }

  /**
   * Charge la table, applique une transformation **synchrone**, la range,
   * puis délivre ce que la transformation avait à dire.
   */
  private async attempt<T>(code: string, change: (room: Room) => T): Promise<T> {
    const room = await this.store.load(code);
    if (!room) throw new RoomError('Cette table n’existe plus');

    // Fenêtre strictement synchrone : ni `await` ni rappel entre ces lignes.
    this.outbox = [];
    let result: T;
    let pending: (() => void)[];
    try {
      result = change(room);
      pending = this.outbox;
    } finally {
      this.outbox = [];
    }

    await this.store.save(code, room);
    for (const send of pending) send();
    return result;
  }

  private queue<T>(code: string, run: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(code) ?? Promise.resolve();
    const result = previous.then(run, run);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(code, tail);
    void tail.then(() => {
      if (this.queues.get(code) === tail) this.queues.delete(code);
    });
    return result;
  }

  /** Comme `mutate`, en résolvant d'abord la session de la connexion. */
  private mutateSession<T>(
    socketId: string,
    change: (room: Room, player: ServerPlayer) => T,
  ): Promise<T> {
    const session = this.sessions.get(socketId);
    if (!session) throw new RoomError('Vous n’êtes à aucune table');
    return this.mutate(session.code, (room) => {
      const player = room.players.find((entry) => entry.id === session.playerId);
      if (!player) throw new RoomError('Vous n’êtes plus à cette table');
      return change(room, player);
    });
  }

  /**
   * Une transformation déclenchée par le temps, pas par un joueur.
   *
   * Personne n'attend de réponse : une table disparue ou un état qui a changé
   * sous la minuterie ne doivent pas remonter en exception non rattrapée.
   */
  private async quietly(code: string, change: (room: Room) => void): Promise<void> {
    try {
      await this.mutate(code, change);
    } catch (error) {
      if (error instanceof RoomError) return;
      throw error;
    }
  }

  /* ── le salon ───────────────────────────────────────────────────────── */

  async create(socketId: string, name: unknown, options: unknown): Promise<JoinResult> {
    const clean = sanitizeName(name);
    // Une connexion qui ouvre une table quitte d'abord la sienne, si elle en
    // avait une : personne ne s'assoit à deux tables à la fois.
    await this.depart(socketId);

    if ((await this.store.count()) >= MAX_ROOMS) throw new RoomError('Trop de tables ouvertes');
    const code = await this.freshCode();
    const player = this.newPlayer(clean, 0, socketId);
    const room: Room = {
      code,
      status: 'lobby',
      options: sanitizeOptions(options),
      hostId: player.id,
      players: [player],
      game: null,
      seed: null,
      timing: null,
    };

    // La table est neuve : personne d'autre ne peut la modifier. On range,
    // puis on annonce.
    await this.store.save(code, room);
    this.sessions.set(socketId, { code, playerId: player.id });
    this.deliver(this.syncMessages(room, []));
    return { code, playerId: player.id, token: player.token };
  }

  async join(
    socketId: string,
    rawCode: unknown,
    name: unknown,
    token: unknown,
  ): Promise<JoinResult> {
    const code = sanitizeCode(rawCode);
    if (!(await this.store.has(code))) throw new RoomError('Aucune table avec ce code');
    await this.depart(socketId);

    return this.mutate(code, (room) => {
      // Le jeton présent, c'est une reprise : il retrouve la place, même en
      // pleine partie.
      if (typeof token === 'string' && token.length > 0) {
        const known = room.players.find((entry) => entry.token === token);
        if (known) {
          this.reattach(room, known, socketId);
          return { code, playerId: known.id, token: known.token };
        }
      }

      if (room.status !== 'lobby') throw new RoomError('La partie a déjà commencé');
      if (room.players.length >= MAX_PLAYERS) throw new RoomError('La table est complète');

      const player = this.newPlayer(sanitizeName(name), this.freeSeat(room), socketId);
      room.players.push(player);
      this.sessions.set(socketId, { code, playerId: player.id });
      this.cancelEmptyTimer(code);
      this.broadcast(room, []);
      return { code, playerId: player.id, token: player.token };
    });
  }

  async setOptions(socketId: string, options: unknown): Promise<void> {
    return this.mutateSession(socketId, (room, player) => {
      this.requireHost(room, player);
      this.requireLobby(room);
      // Le moteur ne fait confiance à rien : ce filtre est la seule porte.
      room.options = sanitizeOptions(options);
      this.broadcast(room, []);
    });
  }

  async start(socketId: string): Promise<void> {
    return this.mutateSession(socketId, (room, player) => {
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
        if (error instanceof IllegalActionError) throw new RoomError(error.message, error.code);
        throw error;
      }

      this.reseat(room);
      // Un `Rng` seedé par partie : la distribution et tout l'aléa qui suit
      // (égalités, pas fantômes) se rejouent à l'identique (R86).
      const seed = this.host.randomInt(0x1_0000_0000);
      const rng = createSeededRng(seed);
      room.seed = seed;
      this.rngs.set(room.code, rng);
      const step = createGame({ players: count, options: room.options }, rng);
      room.game = step.state;
      room.status = 'playing';
      this.afterStep(room, step.events);
    });
  }

  async rematch(socketId: string): Promise<void> {
    return this.mutateSession(socketId, (room, player) => {
      this.requireHost(room, player);
      if (room.status !== 'finished') throw new RoomError('La partie n’est pas terminée');
      room.game = null;
      room.seed = null;
      room.timing = null;
      room.status = 'lobby';
      this.timers.clearWhere(`${room.code}:`);
      this.rngs.delete(room.code);
      // Les absents au moment de la revanche ne gardent pas de siège fantôme :
      // ils reviendront comme n'importe qui, par la grande porte.
      room.players = room.players.filter((entry) => entry.socketId !== null);
      this.reseat(room);
      this.broadcast(room, []);
    });
  }

  /* ── le jeu ─────────────────────────────────────────────────────────── */

  /**
   * L'intention d'un joueur, dans le vocabulaire du moteur.
   *
   * Le siège de l'auteur vient de la session, jamais de la charge utile : un
   * client ne peut pas jouer à la place d'un autre.
   */
  async action(socketId: string, rawAction: unknown): Promise<void> {
    const action = sanitizeAction(rawAction);
    return this.mutateSession(socketId, (room, player) => {
      this.runAction(room, player.seat, action);
    });
  }

  private runAction(room: Room, seat: number, action: Action): void {
    if (!room.game || room.status !== 'playing') throw new RoomError('Aucune partie en cours');
    const rng = this.rngFor(room);
    if (!rng) throw new RoomError('Aucune partie en cours');
    let step;
    try {
      step = applyAction(room.game, action, rng, seat);
    } catch (error) {
      // Le refus du moteur devient le refus de la table, code compris : le
      // client sait dire « ce n'est pas le moment » de la même façon.
      if (error instanceof IllegalActionError) throw new RoomError(error.message, error.code);
      throw error;
    }
    room.game = step.state;
    this.afterStep(room, step.events);
  }

  /** Suites d'un pas de jeu : minuterie, fin de partie, diffusion. */
  private afterStep(room: Room, events: GameEvent[]): void {
    if (room.game?.over === true) {
      room.status = 'finished';
      room.timing = null;
      this.timers.clear(`${room.code}:phase`);
    } else {
      this.armPhase(room);
    }
    this.broadcast(room, events);
  }

  /* ── le temps (R80–R82) ──────────────────────────────────────────────── */

  /**
   * Arme la minuterie de la phase en cours.
   *
   * Une seule minuterie par table. Elle n'est (ré)armée qu'au changement de
   * phase : la phase ne se rallonge pas parce qu'un voisin a joué — son
   * compte à rebours, armé à son entrée, continue son chemin. Le numéro
   * d'armement voyage avec le déclenchement : c'est le moteur qui rejette
   * une minuterie périmée, pas nous (R80).
   */
  private armPhase(room: Room): void {
    const game = room.game;
    if (!game || room.status !== 'playing' || game.over) {
      this.timers.clear(`${room.code}:phase`);
      room.timing = null;
      return;
    }
    if (room.timing?.seq === game.phaseSeq) return;

    this.timers.clear(`${room.code}:phase`);
    const rng = this.rngFor(room);
    if (!rng) return;
    const budget = phaseBudgetMs(game, rng);
    if (budget <= 0) {
      room.timing = null;
      return;
    }
    const seq = game.phaseSeq;
    room.timing = { seq, deadline: this.host.now() + budget, durationMs: budget };
    const code = room.code;
    this.timers.arm(`${code}:phase`, () => void this.phaseTimedOut(code, seq), budget);
  }

  /**
   * La minuterie s'éteint : la phase se clôt avec ce qui a été joué.
   *
   * Qui n'a pas agi n'agit pas (R81) — le moteur s'en charge. Notre seul
   * devoir est de lui présenter le numéro de la phase qui a armé : une
   * minuterie en retard, c'est lui qui la rejette.
   */
  private async phaseTimedOut(code: string, armedSeq: number): Promise<void> {
    await this.quietly(code, (room) => {
      if (!room.game || room.status !== 'playing') return;
      const rng = this.rngFor(room);
      if (!rng) return;
      let step;
      try {
        step = timeoutPhase(room.game, rng, armedSeq);
      } catch (error) {
        // R80 : une minuterie périmée ne clôt rien. Le moteur vient de le
        // dire — on l'écoute, et la table continue son cours.
        if (error instanceof IllegalActionError) return;
        throw error;
      }
      room.game = step.state;
      this.afterStep(room, step.events);
    });
  }

  /* ── la présence ─────────────────────────────────────────────────────── */

  /** Le jeton reprend la place, et la grâce s'éteint. */
  private reattach(room: Room, player: ServerPlayer, socketId: string): void {
    const previous = player.socketId;
    player.socketId = socketId;
    player.disconnectedUntil = null;
    if (previous !== null) this.sessions.delete(previous);
    this.sessions.set(socketId, { code: room.code, playerId: player.id });
    this.timers.clear(`${room.code}:grace:${player.id}`);
    this.cancelEmptyTimer(room.code);
    this.broadcast(room, []);
  }

  /** La connexion est tombée : au salon la place se libère, en partie elle se garde. */
  async disconnect(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.sessions.delete(socketId);

    await this.quietly(session.code, (room) => {
      const player = room.players.find((entry) => entry.id === session.playerId);
      if (!player || player.socketId !== socketId) return; // sa place est à une autre connexion
      player.socketId = null;

      if (room.status === 'lobby') {
        this.release(room, player, null);
      } else {
        // En partie, la place est gardée le temps de la grâce : une partie de
        // loup-garou ne meurt pas parce qu'un loup a perdu le réseau.
        player.disconnectedUntil = this.host.now() + RECONNECT_GRACE_MS;
        const code = room.code;
        const playerId = player.id;
        this.timers.arm(
          `${code}:grace:${playerId}`,
          () => void this.graceExpired(code, playerId),
          RECONNECT_GRACE_MS,
        );
      }
      this.broadcast(room, []);
      this.scheduleEmptyCheck(room);
    });
  }

  /** La grâce s'éteint sans retour : la place est libérée, le siège moteur reste. */
  private async graceExpired(code: string, playerId: string): Promise<void> {
    await this.quietly(code, (room) => {
      const player = room.players.find((entry) => entry.id === playerId);
      if (!player || player.socketId !== null) return; // revenu entre-temps
      this.release(room, player, `${player.name} n’est pas revenu : sa place est libérée`);
      this.broadcast(room, []);
      this.scheduleEmptyCheck(room);
    });
  }

  /** Quitter volontairement la table. */
  async leave(socketId: string): Promise<void> {
    await this.depart(socketId);
  }

  /** Retire une connexion de sa table : c'est partir, pas tomber. */
  private async depart(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.sessions.delete(socketId);

    await this.quietly(session.code, (room) => {
      const player = room.players.find((entry) => entry.id === session.playerId);
      if (!player || player.socketId !== socketId) return;
      this.release(
        room,
        player,
        room.status === 'lobby' ? null : `${player.name} quitte la table`,
      );
      this.broadcast(room, []);
      this.scheduleEmptyCheck(room);
    });
  }

  /** Libère la place d'un joueur : le siège moteur, lui, ne bouge pas. */
  private release(room: Room, player: ServerPlayer, message: string | null): void {
    this.timers.clear(`${room.code}:grace:${player.id}`);
    player.socketId = null;
    room.players = room.players.filter((entry) => entry !== player);
    if (room.status === 'lobby') this.reseat(room);
    this.handOverHost(room);
    if (message !== null) this.notice(room, message, 'info');
  }

  /* ── la diffusion : N envois adressés ───────────────────────────────── */

  private broadcast(room: Room, events: GameEvent[]): void {
    const messages = this.syncMessages(room, events);
    this.outbox.push(() => {
      this.deliver(messages);
    });
  }

  /**
   * Ce que chaque siège connecté doit recevoir.
   *
   * Le silence se calcule ici : la vue est `viewFor(state, seat)` (R88),
   * l'échéance n'appartient qu'au siège qui doit agir (R80), et les
   * évènements du moteur partent à tous puisqu'aucun ne porte de secret
   * (R87).
   */
  private syncMessages(
    room: Room,
    events: GameEvent[],
  ): { socketId: string; payload: SyncPayload }[] {
    const serverNow = this.host.now();
    return room.players
      .filter((player): player is ServerPlayer & { socketId: string } => player.socketId !== null)
      .map((player) => ({
        socketId: player.socketId,
        payload: {
          room: this.roomViewFor(room, player.seat),
          game: room.game ? viewFor(room.game, player.seat) : null,
          events,
          serverNow,
        } satisfies SyncPayload,
      }));
  }

  /** La vue de la table pour un destinataire — la sienne, pas celle du voisin. */
  private roomViewFor(room: Room, seat: number): RoomView {
    const players: PlayerInfo[] = room.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      connected: player.socketId !== null,
      isHost: player.id === room.hostId,
      disconnectedUntil: player.disconnectedUntil,
    }));
    // L'échéance de la phase, si — et seulement si — ce siège doit agir
    // maintenant. Celle des autres est un secret.
    const timing = this.deadlineFor(room, seat);
    return {
      code: room.code,
      status: room.status,
      options: room.options,
      hostId: room.hostId,
      players,
      reconnectGraceMs: RECONNECT_GRACE_MS,
      deadline: timing === null ? null : timing.deadline,
      deadlineDurationMs: timing === null ? null : timing.durationMs,
    };
  }

  private deadlineFor(room: Room, seat: number): RoomTiming | null {
    const game = room.game;
    if (!game || room.status !== 'playing' || game.over) return null;
    const timing = room.timing;
    if (!timing || timing.seq !== game.phaseSeq) return null;
    return pendingActors(game).includes(seat) ? timing : null;
  }

  private deliver(messages: { socketId: string; payload: SyncPayload }[]): void {
    for (const message of messages) {
      this.emitter.toSocket(message.socketId, 'sync', message.payload);
    }
  }

  /** Un avis à toute la table — la seule vraie diffusion, et elle ne porte jamais de secret. */
  private notice(room: Room, message: string, tone: NoticePayload['tone']): void {
    const recipients = room.players
      .filter((player): player is ServerPlayer & { socketId: string } => player.socketId !== null)
      .map((player) => player.socketId);
    const payload: NoticePayload = { message, tone };
    this.outbox.push(() => {
      for (const socketId of recipients) this.emitter.toSocket(socketId, 'notice', payload);
    });
  }

  /* ── utilitaires ────────────────────────────────────────────────────── */

  private rngFor(room: Room): Rng | null {
    const known = this.rngs.get(room.code);
    if (known) return known;
    if (room.seed === null) return null;
    const rng = createSeededRng(room.seed);
    this.rngs.set(room.code, rng);
    return rng;
  }

  private newPlayer(name: string, seat: number, socketId: string): ServerPlayer {
    return {
      id: this.host.uuid(),
      token: this.host.uuid(),
      name,
      seat,
      socketId,
      disconnectedUntil: null,
    };
  }

  /** Le plus petit siège libre : on s'assoit dans l'ordre d'arrivée. */
  private freeSeat(room: Room): number {
    const taken = new Set(room.players.map((player) => player.seat));
    for (let seat = 0; seat < MAX_PLAYERS; seat += 1) if (!taken.has(seat)) return seat;
    throw new RoomError('La table est complète');
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

  /** L'hôte est le premier arrivé ; s'il part, le premier des restants prend la suite. */
  private handOverHost(room: Room): void {
    if (room.players.some((player) => player.id === room.hostId)) return;
    const heir = room.players.slice().sort((a, b) => a.seat - b.seat)[0];
    if (heir) room.hostId = heir.id;
  }

  private requireHost(room: Room, player: ServerPlayer): void {
    if (player.id !== room.hostId) throw new RoomError('Seul l’hôte peut faire cela');
  }

  private requireLobby(room: Room): void {
    if (room.status !== 'lobby') throw new RoomError('La partie a déjà commencé');
  }

  /**
   * Tire un code libre, parmi les tables vivantes.
   *
   * Quatre lettres de l'alphabet sans ambiguïté. Deux tables vivantes ne
   * portent jamais le même code : on retire tant qu'il est pris.
   */
  private async freshCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i += 1) {
        code += CODE_ALPHABET[this.host.randomInt(CODE_ALPHABET.length)] ?? 'A';
      }
      if (!(await this.store.has(code))) return code;
    }
    throw new RoomError('Impossible de tirer un code libre');
  }

  private scheduleEmptyCheck(room: Room): void {
    this.cancelEmptyTimer(room.code);
    const present = room.players.filter((player) => player.socketId !== null);
    if (present.length > 0) return;
    const code = room.code;
    this.timers.arm(`${code}:empty`, () => void this.dropIfEmpty(code), EMPTY_ROOM_TTL_MS);
  }

  private async dropIfEmpty(code: string): Promise<void> {
    const room = await this.store.load(code);
    if (!room) return;
    if (room.players.some((player) => player.socketId !== null)) return;
    this.timers.clearWhere(`${code}:`);
    this.rngs.delete(code);
    await this.store.remove(code);
  }

  private cancelEmptyTimer(code: string): void {
    this.timers.clear(`${code}:empty`);
  }

  /** Pour les tests et le dépannage : la table rangée, sous son code. */
  async peek(code: string): Promise<Room | undefined> {
    return (await this.store.load(code)) ?? undefined;
  }
}
