/**
 * La table telle qu'elle est rangée — et relue.
 *
 * Tout ce qui vit ici est sérialisable : des nombres, des chaînes, des
 * dates en millisecondes. Ni minuterie, ni `Rng`, ni référence à une
 * connexion vivante autre que son identifiant. C'est ce qui permet à une
 * table de survivre à un redémarrage du serveur, à un déploiement du Worker
 * ou à l'éviction d'un Durable Object (D21) : l'état JSON suffit à tout
 * reprendre — l'aléa voyage dans `GameState.rng` (R104), le temps dans
 * `RoomTiming` et dans les dates des joueurs (D20).
 *
 * `Room.schema` versionne la forme. Toute table lue du magasin passe par
 * `upgradeRoom`, qui la remet à la forme courante ou refuse de la lire.
 */

import {
  isRngState,
  MAX_PLAYERS,
  sanitizeOptions,
  type GameState,
  type GameOptions,
  type RoomStatus,
} from '@garoutom/engine';

import { emptyJournal, readJournal, type RoomJournal } from './journal.js';

/** La version courante de la forme d'une table. */
export const ROOM_SCHEMA = 1;

/**
 * Un joueur, tel qu'il est rangé dans le magasin.
 *
 * Le jeton ne quitte jamais le serveur vers les autres joueurs : seul
 * l'intéressé le reçoit, dans son `JoinResult`. En partie, un joueur n'est
 * jamais retiré de la table (D17) : il peut seulement être absent.
 */
export interface ServerPlayer {
  id: string;
  /** Secret de reconnexion. Ne doit jamais être diffusé. */
  token: string;
  name: string;
  seat: number;
  /** La connexion qui tient la place, `null` si personne. */
  socketId: string | null;
  /**
   * Fin de la grâce d'une connexion perdue, `null` si le joueur est là — ou
   * s'il est déjà montré absent. Au salon, la place se libère à cette date ;
   * en partie, le joueur est alors montré absent (D17).
   */
  disconnectedUntil: number | null;
  /** Montré absent : grâce éteinte, ou départ volontaire en partie (D17). */
  absent: boolean;
  /**
   * En partie seulement : l'instant où cette absence vaut abandon (D18). Il
   * recule de la durée de chaque pause (D19) — l'abandon ne court pas quand
   * l'horloge est suspendue.
   */
  abandonAt: number | null;
}

/**
 * La minuterie de phase, en dates sérialisables (R80, D20).
 *
 * Aucune minuterie de l'hôte n'est source de vérité : ce qui est rangé ici
 * suffit à savoir quand la phase s'éteint, et pour quelle phase.
 */
export interface RoomTiming {
  /** Le `phaseSeq` qui a armé cette échéance — le numéro de R80. */
  seq: number;
  deadline: number;
  /** `phaseBudgetMs(game)` à l'armement : la durée pleine, pour la barre. */
  durationMs: number;
  /**
   * L'horloge est suspendue depuis cette date : plus aucun siège vivant
   * n'est connecté (D19). Au retour, `deadline` recule d'autant.
   */
  pausedAt: number | null;
}

export interface Room {
  schema: typeof ROOM_SCHEMA;
  code: string;
  status: RoomStatus;
  options: GameOptions;
  hostId: string;
  players: ServerPlayer[];
  game: GameState | null;
  /** La graine de la partie en cours, pour le dépannage. L'aléa, lui, vit dans `game.rng`. */
  seed: number | null;
  timing: RoomTiming | null;
  /** Le journal public numéroté (D22). */
  journal: RoomJournal;
  createdAt: number;
  /** La dernière écriture : le balayage des tables oubliées s'en sert. */
  updatedAt: number;
  /** Depuis quand plus personne n'est connecté, `null` si quelqu'un l'est. */
  emptySince: number | null;
}

const STATUTS: readonly RoomStatus[] = ['lobby', 'playing', 'finished'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dateOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function illisible(raison: string): never {
  throw new Error(`Table illisible : ${raison}`);
}

function readPlayer(raw: unknown): ServerPlayer {
  if (!isRecord(raw)) illisible('joueur');
  const { id, token, name, seat } = raw;
  if (typeof id !== 'string' || typeof token !== 'string' || typeof name !== 'string') {
    illisible('identité d’un joueur');
  }
  if (typeof seat !== 'number' || !Number.isSafeInteger(seat) || seat < 0 || seat >= MAX_PLAYERS) {
    illisible('siège d’un joueur');
  }
  return {
    id,
    token,
    name,
    seat,
    socketId: typeof raw.socketId === 'string' ? raw.socketId : null,
    disconnectedUntil: dateOrNull(raw.disconnectedUntil),
    absent: raw.absent === true,
    abandonAt: dateOrNull(raw.abandonAt),
  };
}

function readTiming(raw: unknown): RoomTiming | null {
  if (!isRecord(raw)) return null;
  const { seq, deadline, durationMs } = raw;
  if (typeof seq !== 'number' || typeof deadline !== 'number' || typeof durationMs !== 'number') {
    return null;
  }
  return { seq, deadline, durationMs, pausedAt: dateOrNull(raw.pausedAt) };
}

/**
 * Relit une table venue du magasin et la remet à la forme courante.
 *
 * Une table d'avant `schema` (le serveur d'avant D21, qui ne rangeait rien
 * ailleurs qu'en mémoire) se complète de valeurs neutres. Une table qui ne
 * se laisse pas relire lève : mieux vaut une table refusée qu'une table
 * jouée de travers.
 */
export function upgradeRoom(raw: unknown, now = 0): Room {
  if (!isRecord(raw)) illisible('pas un objet');
  if (raw.schema !== undefined && raw.schema !== ROOM_SCHEMA) illisible(`schéma ${String(raw.schema)}`);
  const { code, status, hostId, players, game } = raw;
  if (typeof code !== 'string' || code.length === 0) illisible('code');
  if (typeof status !== 'string' || !STATUTS.includes(status as RoomStatus)) illisible('statut');
  if (typeof hostId !== 'string') illisible('hôte');
  if (!Array.isArray(players)) illisible('joueurs');
  if (game !== null && game !== undefined && !isRecord(game)) illisible('partie');

  const seed = typeof raw.seed === 'number' ? raw.seed : null;
  let state = (game ?? null) as GameState | null;
  if (state !== null && !isRngState(state.rng)) {
    // Une partie d'avant D20 n'avait pas son aléa dans l'état : on le sème de
    // la graine, faute de mieux — la suite ne sera pas celle d'origine, mais
    // elle sera jouable et, dès lors, reprise à l'identique.
    if (seed === null) illisible('aléa de la partie');
    state = { ...state, rng: seed >>> 0 };
  }
  if ((status === 'playing' || status === 'finished') && state === null) illisible('partie manquante');

  const createdAt = dateOrNull(raw.createdAt) ?? now;
  return {
    schema: ROOM_SCHEMA,
    code,
    status: status as RoomStatus,
    options: sanitizeOptions(raw.options),
    hostId,
    players: (players as unknown[]).map(readPlayer),
    game: state,
    seed,
    timing: readTiming(raw.timing),
    journal: raw.journal === undefined ? emptyJournal() : readJournal(raw.journal),
    createdAt,
    updatedAt: dateOrNull(raw.updatedAt) ?? createdAt,
    emptySince: dateOrNull(raw.emptySince),
  };
}
