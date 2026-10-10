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
 * Il vit dans le moteur, avec le reste du contrat réseau, pour la même raison
 * que lui : le client et le serveur en ont besoin à l'identique, et un cadrage
 * qui diverge entre les deux bouts est un bogue qu'aucun test ne rattrape.
 *
 * **Tout ce qui traverse ces fonctions vient du réseau.** On ne fait donc
 * jamais confiance à la forme reçue : le décodage rend `null` plutôt que de
 * laisser passer un objet à moitié valide, et l'appelant jette la connexion.
 */

import type { Ack } from './protocol.js';

/** Une demande du client, qui attend un accusé portant le même numéro. */
export interface RequestFrame {
  t: 'req';
  /** Numéro de corrélation, croissant et propre à une connexion. */
  id: number;
  /** Nom de l'évènement, tel que défini par `ClientToServerEvents`. */
  e: string;
  d: unknown;
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

export type ClientFrame = RequestFrame;
export type ServerFrame = AckFrame | EventFrame;

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

/** Le JSON d'un message reçu, ou `null` si l'on n'en veut pas. */
function parse(raw: unknown, limit: number): Record<string, unknown> | null {
  if (typeof raw !== 'string') return null;
  if (raw.length > limit) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
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
  if (!frame || frame.t !== 'req') return null;
  if (!isCorrelation(frame.id) || !isName(frame.e)) return null;
  return { t: 'req', id: frame.id, e: frame.e, d: frame.d };
}

export function decodeServerFrame(raw: unknown): ServerFrame | null {
  const frame = parse(raw, MAX_SERVER_FRAME_BYTES);
  if (!frame) return null;

  if (frame.t === 'ack') {
    if (!isCorrelation(frame.id) || !isAck(frame.r)) return null;
    return { t: 'ack', id: frame.id, r: frame.r };
  }

  if (frame.t === 'ev') {
    if (frame.e !== 'sync' && frame.e !== 'notice') return null;
    return { t: 'ev', e: frame.e, d: frame.d };
  }

  return null;
}
