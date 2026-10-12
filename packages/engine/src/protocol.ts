/**
 * Contrat réseau entre le client et le serveur.
 *
 * Le moteur ne connaît que la partie ; tout ce qui touche à la table, au
 * transport et aux accusés de réception vit ici. Un seul fichier décrit les
 * deux sens de la conversation : impossible d'ajouter un évènement d'un côté
 * sans que l'autre cesse de compiler.
 *
 * Ce fichier vit dans le moteur plutôt que dans le serveur pour une raison
 * simple : le client en a besoin autant que lui, et c'est le seul paquet que
 * les deux partagent déjà. Le chemin du canal existe ainsi en un exemplaire
 * unique, et rien ne peut diverger entre le Worker, le serveur de développement
 * et le client.
 *
 * Le loup-garou est un jeu d'information cachée : la vue qui voyage est
 * `viewFor(state, seat)`, jamais l'état brut. Chaque siège ne reçoit que ce
 * que son rôle lui permet de savoir — un champ de trop dans `GameView`, et
 * c'est un loup qui se démasque dans l'onglet réseau du navigateur.
 *
 * Le canal est un WebSocket natif, dès le premier jour : une partie de
 * loup-garou dure des dizaines de minutes, là où une fonction d'hébergement
 * coupe la connexion au bout de cinq. Aucune cohabitation à ménager, donc :
 * un seul chemin, et il s'appelle `/ws`.
 */

import type { Action, GameEvent, GameOptions } from './types.js';
import type { GameView } from './views.js';

/** Chemin du canal WebSocket, côté Worker comme côté serveur de développement. */
export const CHANNEL_PATH = '/ws';

/* ------------------------------------------------------------------ */
/* Version du protocole (D22)                                          */
/* ------------------------------------------------------------------ */

/**
 * La version du protocole que parle ce paquet.
 *
 * - **1** — le canal d'origine : `req`/`ack`/`ev`, sans `hello` ni battement.
 *   Un client qui n'annonce pas de version (`?v=` absent) parle la 1.
 * - **2** — D22 : cadres `hello`, `ping`/`pong`, codes de fermeture,
 *   `room:join` avec `lastSeq`, `SyncPayload.seq`/`replay`,
 *   `PlayerInfo.absent`, `RoomView.paused`.
 *
 * La 2 n'ajoute que des champs et des cadres qu'un client 1 ignore : le
 * serveur sert les deux (D24 — le Worker d'abord, le client ensuite).
 */
export const PROTOCOL_VERSION = 2;

/** La plus ancienne version que le serveur accepte encore. En deçà : fermeture `CLOSE_VERSION`. */
export const PROTOCOL_MIN = 1;

/** Le paramètre d'URL du canal qui porte la version du client : `/ws?v=2`. */
export const PROTOCOL_PARAM = 'v';

/**
 * La version annoncée par un client, lue dans le paramètre `?v=` de son URL
 * — `null` si elle est hors de `[PROTOCOL_MIN, PROTOCOL_VERSION]` ou
 * illisible : le serveur ferme alors en `CLOSE_VERSION`. Un paramètre absent
 * vaut 1, la version d'avant D22 — tant que `PROTOCOL_MIN` l'accepte.
 */
export function negotiateProtocol(param: string | null | undefined): number | null {
  if (param === null || param === undefined || param === '') return PROTOCOL_MIN <= 1 ? 1 : null;
  if (!/^\d{1,4}$/.test(param)) return null;
  const version = Number(param);
  return version >= PROTOCOL_MIN && version <= PROTOCOL_VERSION ? version : null;
}

/**
 * Ce que le serveur sait faire, annoncé dans `hello`. Un client ne compte
 * sur une capacité que si elle est annoncée.
 *
 * - `ping` : le serveur répond `pong` aux `ping` ;
 * - `replay` : `room:join` honore `lastSeq` et rejoue les évènements manqués ;
 * - `pause` : l'horloge se suspend quand aucun vivant n'est là (D19) ;
 * - `abandon` : la mort d'abandon existe (D18).
 */
export const CAPABILITIES = ['ping', 'replay', 'pause', 'abandon'] as const;
export type Capability = (typeof CAPABILITIES)[number];

/* ------------------------------------------------------------------ */
/* Le battement du lien (D22)                                          */
/* ------------------------------------------------------------------ */

/** Le client pinge toutes les 20 s quand l'onglet est visible ; `hello.heartbeatMs` fait foi. */
export const HEARTBEAT_MS = 20_000;
/** Sans `pong` dans ce délai, le client abandonne la socket et en rouvre une. */
export const PONG_TIMEOUT_MS = 10_000;
/** Une ouverture de socket qui traîne au-delà est abandonnée. */
export const OPEN_TIMEOUT_MS = 6_000;
/** Le serveur Node pinge chaque socket (`ws.ping()`) à ce rythme, et termine celle qui ne répond pas. */
export const SERVER_PING_MS = 25_000;
/** Le Worker ferme une socket muette — ni cadre ni ping — depuis ce délai. */
export const SILENT_SOCKET_MS = 70_000;

/* ------------------------------------------------------------------ */
/* Codes de fermeture (D22)                                            */
/* ------------------------------------------------------------------ */

/** Le serveur redémarre ou se déploie : reconnexion immédiate, rien n'est perdu. */
export const CLOSE_SERVER_RESTART = 1012;
/** Une règle de la table enfreinte — quota, origine, socket non assise : reconnexion ordinaire. */
export const CLOSE_POLICY = 1008;
/** Un cadre trop gros, ou un tampon de sortie saturé : reconnexion ordinaire. */
export const CLOSE_TOO_BIG = 1009;
/** Version de protocole hors de `[PROTOCOL_MIN, PROTOCOL_VERSION]` : le client se recharge. */
export const CLOSE_VERSION = 4000;
/**
 * La place a été reprise depuis une autre socket (« partie ouverte
 * ailleurs ») : le client ne reprend **pas** tout seul, sans quoi deux
 * onglets se voleraient la place en boucle.
 */
export const CLOSE_REPLACED = 4001;
/** La table n'existe plus : le client oublie jeton et adresse, et revient à l'accueil. */
export const CLOSE_GONE = 4002;

/* ------------------------------------------------------------------ */
/* Les délais de présence (D17, D18)                                   */
/* ------------------------------------------------------------------ */

/**
 * Délai d'affichage d'une absence, en millisecondes.
 *
 * Depuis D17, le siège appartient au joueur jusqu'à la fin de la partie :
 * passé ce délai, il n'est pas libéré, il est **montré absent**
 * (`PlayerInfo.absent`) — l'absence est publique, rien ne fuit. Son jeton
 * reste valable jusqu'à la revanche.
 */
export const RECONNECT_GRACE_MS = 60_000;

/** Au salon, une place se libère après 30 s sans connexion (D17). */
export const LOBBY_GRACE_MS = 30_000;

/**
 * Un siège vivant absent depuis 5 minutes meurt d'abandon à la clôture de
 * phase suivante, si la table a gardé l'option `abandon` (D18, R101) — le
 * serveur le passe à `timeoutPhase(state, seq, { abandons })`. L'abandon ne
 * court pas pendant une pause (D19).
 */
export const ABANDON_MS = 300_000;

/* ------------------------------------------------------------------ */
/* Erreurs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Les codes machine d'un refus de la table (`Ack.code`, `NoticePayload.code`).
 *
 * - `gone` — la table n'existe plus (ou jamais) : oublier jeton et adresse ;
 * - `started` — la partie a commencé : on n'y entre plus sans jeton ;
 * - `full` — la table est complète ;
 * - `version` — protocole hors de la plage acceptée : recharger ;
 * - `rate` — quota dépassé : réessayer plus tard ;
 * - `action` — charge utile mal formée (R102) ;
 * - `name` — pseudo vide après nettoyage (R103) ;
 * - `host` — réservé à l'hôte ; `lobby` — seulement au salon ;
 *   `playing` — aucune partie en cours ; `finished` — la partie n'est pas
 *   finie ; `players` — nombre de joueurs hors de R1 ; `composition` — R13 ;
 * - `session` — cette socket n'est assise à aucune table ;
 * - `internal` — erreur inattendue, jamais détaillée ;
 * - et, tels quels, les refus du moteur (`IllegalActionError.code`) :
 *   `wrong-phase`, `not-your-turn`, `target`, `seat`, `cannot-vote`,
 *   `potion`, `powers`, `empty`, `channel`, `over`, `stale`.
 */
export const ROOM_ERROR_CODES = [
  'gone',
  'started',
  'full',
  'version',
  'rate',
  'action',
  'name',
  'host',
  'lobby',
  'playing',
  'finished',
  'players',
  'composition',
  'session',
  'internal',
] as const;
export type RoomErrorCode = (typeof ROOM_ERROR_CODES)[number];

/** Réponse d'un accusé de réception : soit la donnée, soit un message d'erreur. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** Ce que la table sait d'un joueur, et qui peut être diffusé à tous. */
export interface PlayerInfo {
  /** Identifiant public. Le jeton de reconnexion, lui, ne sort jamais. */
  id: string;
  name: string;
  /** Siège : l'identité du joueur pour le moteur, fixée à l'ordre d'arrivée. */
  seat: number;
  connected: boolean;
  isHost: boolean;
  /**
   * Horodatage serveur de fin du délai de grâce, `null` si le joueur est
   * présent. Le client s'en sert pour afficher le compte à rebours d'absence.
   */
  disconnectedUntil: number | null;
  /**
   * Déconnecté depuis plus de `RECONNECT_GRACE_MS` : le joueur est montré
   * absent, sa place gardée (D17). Public, comme `connected` : rien ne fuit.
   */
  absent: boolean;
}

export interface RoomView {
  code: string;
  status: RoomStatus;
  /**
   * Options de la partie. Modifiables par l'hôte tant qu'on est au salon,
   * figées pour toute la partie ensuite. Ce qui arrive ici est passé au
   * filtre `sanitizeOptions` : le moteur ne fait confiance à rien.
   */
  options: GameOptions;
  hostId: string;
  players: PlayerInfo[];
  reconnectGraceMs: number;
  /**
   * Échéance de la phase en cours **pour le destinataire seul**, dans
   * l'horloge du serveur, ou `null` s'il n'a rien à jouer. À comparer à
   * `SyncPayload.serverNow`, jamais à l'horloge du navigateur.
   *
   * Jamais celle des autres sièges : la nuit, une échéance non nulle
   * désignerait Cupidon, la Voyante, les loups — chacun n'a à connaître que
   * son propre compte à rebours. Ce que fait le village sans lui ne le
   * regarde pas ; le fil du vote, lui, se lit dans la vue (`voted`).
   */
  deadline: number | null;
  /** Durée pleine de la minuterie du destinataire, pour dessiner une barre qui se vide. */
  deadlineDurationMs: number | null;
  /**
   * L'horloge est suspendue : plus aucun siège vivant n'est connecté (D19).
   * Les échéances reprendront, décalées de la durée de la pause.
   */
  paused: boolean;
}

/**
 * Charge utile de `sync`, unique message d'état du serveur vers le client.
 *
 * `game` est déjà taillé pour le destinataire : c'est une `GameView`, jamais
 * un `GameState`. `events`, eux, partent à tous : le moteur veille à ce qu'aucun
 * ne porte un secret — la cible d'un tir, oui ; le rôle d'un mort, seulement
 * si la table a choisi de le révéler.
 *
 * `serverNow` est la référence de temps : les échéances sont exprimées dans
 * l'horloge du serveur, et le client n'a aucune raison d'avoir la même. En
 * comparant à `serverNow` plutôt qu'à son propre `Date.now()`, il affiche un
 * compte à rebours juste même si sa machine est décalée de plusieurs minutes.
 * C'est aussi le rappel que l'arbitrage du temps appartient au serveur seul.
 */
export interface SyncPayload {
  room: RoomView;
  /** Vue du destinataire sur la partie, `null` tant qu'aucune partie ne court. */
  game: GameView | null;
  /**
   * Évènements produits par la dernière action — le client les anime —, ou,
   * si `replay`, évènements manqués pendant une absence.
   *
   * Ils sont **consécutifs** dans le journal public de la table (D22) : le
   * i-ième porte le numéro `seq - events.length + 1 + i` (`eventSeqOf`). Un
   * client qui a déjà vu un numéro l'ignore ; un premier numéro au-delà de
   * `lastSeq + 1` dit qu'une partie du journal est perdue (la table n'en
   * garde que les 200 derniers).
   */
  events: GameEvent[];
  /**
   * Numéro public du dernier évènement de la table — celui du dernier de
   * `events` s'il y en a. `0` tant que rien n'est arrivé. Le client le garde
   * et le rend dans `room:join.lastSeq` à la reprise.
   */
  seq: number;
  /**
   * Vrai quand `events` sont des évènements **rejoués** à la reprise, non
   * neufs : le client les range dans la chronique sans les animer ni sonner.
   * Un `sync` rejoué ne porte que des rejoués ; absent, il vaut `false`.
   */
  replay?: boolean;
  serverNow: number;
}

/** Le numéro public du i-ième évènement d'un `sync` (D22). */
export function eventSeqOf(payload: Pick<SyncPayload, 'events' | 'seq'>, index: number): number {
  return payload.seq - payload.events.length + 1 + index;
}

export interface NoticePayload {
  message: string;
  tone: 'info' | 'error';
  /** Code machine quand l'avis vient d'une action refusée. */
  code?: string;
}

/** Ce qu'un client reçoit en entrant à une table : sa place et son jeton. */
export interface JoinResult {
  code: string;
  playerId: string;
  /** Secret de reconnexion. Ne doit jamais transiter vers un autre joueur. */
  token: string;
}

/**
 * Ce qu'un client peut demander. Toutes les demandes attendent un accusé.
 *
 * Le jeu lui-même ne forme qu'une seule demande, `game:action` : le moteur
 * connaît déjà les dix verbes du jeu, il n'y a pas à en inventer d'autres côté
 * réseau. Le siège de l'auteur ne voyage jamais : il vient de la session.
 */
export interface ClientToServerEvents {
  'room:create': (
    payload: { name: string; options?: unknown },
    ack: (result: Ack<JoinResult>) => void,
  ) => void;
  /**
   * `token` présent : c'est une reprise, pas une arrivée — idempotente sur la
   * même socket (D22). `lastSeq` : le dernier numéro d'évènement vu
   * (`SyncPayload.seq`) ; le serveur rejoue ce qui suit, marqué `replay`.
   */
  'room:join': (
    payload: { code: string; name: string; token?: string; lastSeq?: number },
    ack: (result: Ack<JoinResult>) => void,
  ) => void;
  /** Options brutes : le serveur les passe par `sanitizeOptions`. */
  'room:options': (payload: { options: unknown }, ack: (result: Ack<null>) => void) => void;
  'room:start': (payload: Record<string, never>, ack: (result: Ack<null>) => void) => void;
  'room:rematch': (payload: Record<string, never>, ack: (result: Ack<null>) => void) => void;
  'room:leave': (payload: Record<string, never>, ack: (result: Ack<null>) => void) => void;
  /** L'intention d'un joueur, dans le vocabulaire du moteur. */
  'game:action': (payload: { action: Action }, ack: (result: Ack<null>) => void) => void;
}

export interface ServerToClientEvents {
  sync: (payload: SyncPayload) => void;
  notice: (payload: NoticePayload) => void;
}
