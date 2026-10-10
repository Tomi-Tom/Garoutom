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

/**
 * Délai de grâce avant qu'un joueur déconnecté ne perde sa place, en
 * millisecondes.
 *
 * Une partie de loup-garou vit ou meurt par la présence de ses joueurs : la
 * nuit ne peut pas s'éterniser parce qu'un loup a perdu le réseau. Passé ce
 * délai, le serveur reprend la main — ce qu'il fait alors d'un rôle caché
 * dont le titulaire ne revient pas est une question ouverte, tracée dans
 * `docs/DECISIONS.md`.
 */
export const RECONNECT_GRACE_MS = 60_000;

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
   * Échéance de la phase en cours pour chaque siège, dans l'horloge du
   * serveur, ou `null` si ce siège n'a rien à jouer. À comparer à
   * `SyncPayload.serverNow`, jamais à l'horloge du navigateur.
   *
   * Le serveur tient déjà cette minuterie pour clôturer la phase de lui-même :
   * sans ce champ, il la tiendrait en secret et le village verrait son vote
   * lui passer sous le nez sans le moindre avertissement.
   */
  deadlines: (number | null)[];
  /** Durée pleine de la minuterie courante, pour dessiner une barre qui se vide. */
  deadlineDurationMs: number | null;
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
  /** Évènements produits par la dernière action : le client les anime. */
  events: GameEvent[];
  serverNow: number;
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
  /** `token` présent : c'est une reprise, pas une arrivée. */
  'room:join': (
    payload: { code: string; name: string; token?: string },
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
