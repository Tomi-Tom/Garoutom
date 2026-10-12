/**
 * Le cadrage des messages du canal temps réel.
 *
 * Socket.IO apportait ce cadrage sans qu'on ait à y penser : un nom
 * d'évènement, une charge utile, et un accusé de réception corrélé à la
 * demande. Il ne tourne pas partout — un Worker n'a ni Express ni Socket.IO —
 * alors que le WebSocket natif, lui, existe dans tous les hébergements
 * envisageables. Ce fichier est donc le strict nécessaire pour s'en passer.
 *
 * Trois cadres suffisent à toute la conversation :
 *
 * - `req` — le client demande quelque chose et attend une réponse ;
 * - `ack` — le serveur répond à une demande précise, par son numéro ;
 * - `ev`  — le serveur pousse un état ou un avis, sans qu'on lui ait rien
 *           demandé.
 *
 * Et trois de plus surveillent le lien lui-même (D22, protocole 2) :
 *
 * - `hello` — le serveur se présente à l'ouverture : version, capacités,
 *             rythme du battement ;
 * - `ping`  — le client vérifie que le lien vit ;
 * - `pong`  — le serveur répond, avec son heure.
 *
 * Il vit dans le moteur, avec le reste du contrat réseau, pour la même raison
 * que lui : le client et le serveur en ont besoin à l'identique, et un cadrage
 * qui diverge entre les deux bouts est un bogue qu'aucun test ne rattrape.
 *
 * **Tout ce qui traverse ces fonctions vient du réseau.** On ne fait donc
 * jamais confiance à la forme reçue : le décodage rend `null` plutôt que de
 * laisser passer un objet à moitié valide. Côté client, un cadre d'un type
 * inconnu — celui d'une version future du serveur — s'ignore sans bruit ; un
 * cadre trop gros, lui, ne s'ignore pas : `inspectServerFrame` le dit, et le
 * canal se reconnecte plutôt que de geler la table en silence (D23).
 */

import { CAPABILITIES, type Ack, type Capability } from './protocol.js';

/** Une demande du client, qui attend un accusé portant le même numéro. */
export interface RequestFrame {
  t: 'req';
  /** Numéro de corrélation, croissant et propre à une connexion. */
  id: number;
  /** Nom de l'évènement, tel que défini par `ClientToServerEvents`. */
  e: string;
  d: unknown;
}

/**
 * Le client vérifie que le lien vit (D22). `id` : un numéro croissant propre
 * à la connexion, rendu tel quel par le `pong`.
 */
export interface PingFrame {
  t: 'ping';
  id: number;
}

/** La réponse du serveur à une demande. */
export interface AckFrame {
  t: 'ack';
  id: number;
  r: Ack<unknown>;
}

/** Un message poussé par le serveur, sans demande préalable. */
export interface EventFrame {
  t: 'ev';
  e: 'sync' | 'notice';
  d: unknown;
}

/**
 * Le serveur se présente, aussitôt la socket ouverte (D22) — à tout client,
 * même de version 1, qui l'ignore.
 */
export interface HelloFrame {
  t: 'hello';
  /** La version que le serveur parle avec ce client. */
  protocol: number;
  /** Ce que le serveur sait faire ; une capacité inconnue est ignorée au décodage. */
  capabilities: Capability[];
  /** Le rythme de `ping` attendu du client, en millisecondes. */
  heartbeatMs: number;
}

/**
 * La réponse au `ping` de même `id`. `now` est l'heure du serveur : le
 * client corrige sa propre horloge sur l'aller-retour le plus court.
 */
export interface PongFrame {
  t: 'pong';
  id: number;
  now: number;
}

export type ClientFrame = RequestFrame | PingFrame;
export type ServerFrame = AckFrame | EventFrame | HelloFrame | PongFrame;

/**
 * Taille maximale d'un message, en octets.
 *
 * Reprend la limite que Socket.IO appliquait déjà (`maxHttpBufferSize`). Un
 * cadre plus gros est rejeté **avant analyse** : refuser après avoir parcouru
 * dix mégaoctets de JSON, c'est offrir la dépense à l'attaquant.
 */
export const MAX_FRAME_BYTES = 16 * 1024;

/**
 * Taille maximale d'un message du serveur vers le client.
 *
 * Plus large que dans l'autre sens : l'état d'une partie embarque le fil de
 * discussion, et dix-huit joueurs bavards remplissent vite seize kilo-octets.
 * Le client reste prudent pour autant, la borne existe toujours.
 */
export const MAX_SERVER_FRAME_BYTES = 512 * 1024;

export function encodeFrame(frame: ClientFrame | ServerFrame): string {
  return JSON.stringify(frame);
}

/** Un objet, et rien d'autre : ni tableau, ni `null`. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Un numéro de corrélation utilisable : entier, fini, positif. */
function isCorrelation(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Pourquoi un cadre n'a pas été lu. */
type Refus = 'too-big' | 'malformed';

/** Le JSON d'un message reçu, ou la raison du refus. */
function parse(raw: unknown, limit: number): Record<string, unknown> | Refus {
  if (typeof raw !== 'string') return 'malformed';
  if (raw.length > limit) return 'too-big';
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : 'malformed';
  } catch {
    return 'malformed';
  }
}

/** La forme d'un accusé, vérifiée avant d'être crue. */
function isAck(value: unknown): value is Ack<unknown> {
  if (!isRecord(value)) return false;
  if (value.ok === true) return true;
  return value.ok === false && typeof value.error === 'string';
}

export function decodeClientFrame(raw: unknown): ClientFrame | null {
  const frame = parse(raw, MAX_FRAME_BYTES);
  if (typeof frame === 'string') return null;
  if (frame.t === 'ping') {
    return isCorrelation(frame.id) ? { t: 'ping', id: frame.id } : null;
  }
  if (frame.t !== 'req') return null;
  if (!isCorrelation(frame.id) || !isName(frame.e)) return null;
  return { t: 'req', id: frame.id, e: frame.e, d: frame.d };
}

/**
 * Ce que le client fait d'un message du serveur.
 *
 * - `frame` : un cadre lu et vérifié ;
 * - `unknown` : un cadre bien formé d'un type — ou d'un évènement — que ce
 *   client ne connaît pas : il l'ignore, c'est la porte des versions futures ;
 * - `too-big` : au-delà de `MAX_SERVER_FRAME_BYTES` — le client ne peut pas
 *   le lire, mais il sait qu'il a manqué un état : il se reconnecte ;
 * - `malformed` : illisible ou mal formé — ignoré, comme avant.
 */
export type InspectedServerFrame =
  | { kind: 'frame'; frame: ServerFrame }
  | { kind: 'unknown' }
  | { kind: 'too-big' }
  | { kind: 'malformed' };

const CAPACITES: ReadonlySet<string> = new Set(CAPABILITIES);

export function inspectServerFrame(raw: unknown): InspectedServerFrame {
  const frame = parse(raw, MAX_SERVER_FRAME_BYTES);
  if (frame === 'too-big') return { kind: 'too-big' };
  if (frame === 'malformed') return { kind: 'malformed' };

  switch (frame.t) {
    case 'ack':
      if (!isCorrelation(frame.id) || !isAck(frame.r)) return { kind: 'malformed' };
      return { kind: 'frame', frame: { t: 'ack', id: frame.id, r: frame.r } };
    case 'ev':
      if (frame.e === 'sync' || frame.e === 'notice') {
        return { kind: 'frame', frame: { t: 'ev', e: frame.e, d: frame.d } };
      }
      return isName(frame.e) ? { kind: 'unknown' } : { kind: 'malformed' };
    case 'hello': {
      const { protocol, heartbeatMs, capabilities } = frame;
      if (!isCorrelation(protocol) || !isCorrelation(heartbeatMs) || !Array.isArray(capabilities)) {
        return { kind: 'malformed' };
      }
      const connues = (capabilities as unknown[]).filter(
        (c): c is Capability => typeof c === 'string' && CAPACITES.has(c),
      );
      return { kind: 'frame', frame: { t: 'hello', protocol, capabilities: connues, heartbeatMs } };
    }
    case 'pong':
      if (!isCorrelation(frame.id) || typeof frame.now !== 'number' || !Number.isFinite(frame.now)) {
        return { kind: 'malformed' };
      }
      return { kind: 'frame', frame: { t: 'pong', id: frame.id, now: frame.now } };
    default:
      return isName(frame.t) ? { kind: 'unknown' } : { kind: 'malformed' };
  }
}

/** Le cadre lu, ou `null` pour tout le reste — inconnu, trop gros, mal formé. */
export function decodeServerFrame(raw: unknown): ServerFrame | null {
  const inspected = inspectServerFrame(raw);
  return inspected.kind === 'frame' ? inspected.frame : null;
}
