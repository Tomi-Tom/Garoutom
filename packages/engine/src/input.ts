/**
 * Ce qui entre : les actions et les textes venus du réseau.
 *
 * Le moteur ne croit rien (D23). Une action arrive du client sous la forme
 * d'un `unknown` : un JSON quelconque, écrit par n'importe qui. Avant ce
 * fichier, le serveur ne vérifiait que le verbe et laissait le reste au
 * moteur, qui le lisait au type près — `"1"` passait pour un siège, `[1]`
 * aussi, et `'1' !== 1` laissait Cupidon lier un joueur à lui-même.
 *
 * `parseAction` rend donc une action **reconstruite** : chaque champ vérifié
 * selon le verbe, rien d'autre de recopié (R102). Et le texte — le chat, les
 * pseudos — passe par `cleanText`, qui ne garde que ce qu'un écran peut
 * honnêtement afficher (R103).
 */

import { MAX_PLAYERS } from './options.js';
import { IllegalActionError, type Action, type ChatChannel } from './types.js';

/** Un pseudo : 16 points de code au plus, après nettoyage (R103). */
export const MAX_NAME_LENGTH = 16;

/**
 * La longueur brute d'un texte reçu, **avant** tout traitement : au-delà, on
 * ne normalise même pas — refuser après avoir parcouru un mégaoctet, c'est
 * offrir la dépense à l'attaquant (R102).
 */
export const MAX_RAW_TEXT_LENGTH = 2_000;

/** Les canaux du fil, dans l'ordre de R75 — le canal fratrie n'existe qu'à une table qui en compte (R114). */
export const CHAT_CHANNELS = ['village', 'loups', 'amoureux', 'fratrie', 'morts'] as const satisfies readonly ChatChannel[];

const canauxCouverts: [Exclude<ChatChannel, (typeof CHAT_CHANNELS)[number]>] extends [never] ? true : never = true;
void canauxCouverts;

/* ------------------------------------------------------------------ */
/* Le texte                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un écran ne doit jamais recevoir : les contrôles (`Cc` — dont les
 * retours à la ligne, déjà pliés en espaces), les caractères de format
 * (`Cf` — les marques bidirectionnelles U+202A–U+202E et U+2066–U+2069, les
 * zéro-largeur, le trait d'union conditionnel…) et les demi-paires de
 * substitution orphelines (`Cs`).
 */
const INVISIBLES = /[\p{Cc}\p{Cf}\p{Cs}]/gu;
/**
 * Les espaces, retours à la ligne et tabulations compris — mais pas U+FEFF,
 * que JavaScript range parmi les espaces alors que c'est un zéro-largeur.
 */
const ESPACES = /[^\S﻿]+/gu;

/**
 * Nettoie un texte libre (R103) : forme NFKC, espaces pliés, invisibles
 * retirés, rives rognées, puis taillé à `max` points de code — jamais au
 * milieu d'une paire de substitution. Rend `''` pour un texte qui ne dit
 * rien : à l'appelant de le refuser.
 */
export function cleanText(raw: string, max: number): string {
  const plie = raw.normalize('NFKC').replace(ESPACES, ' ').replace(INVISIBLES, '').replace(ESPACES, ' ').trim();
  const points = Array.from(plie);
  if (points.length <= max) return plie;
  return points.slice(0, max).join('').trimEnd();
}

/**
 * Le pseudo d'un joueur, nettoyé (R103) — ou un refus `name` s'il n'en reste
 * rien, ou s'il n'était pas une chaîne. Les doublons, eux, se règlent à la
 * table, qui seule sait qui est déjà assis.
 */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > MAX_RAW_TEXT_LENGTH) {
    throw new IllegalActionError('Il faut un pseudo', 'name');
  }
  const name = cleanText(raw, MAX_NAME_LENGTH);
  if (name.length === 0) throw new IllegalActionError('Il faut un pseudo', 'name');
  return name;
}

/* ------------------------------------------------------------------ */
/* Les actions                                                         */
/* ------------------------------------------------------------------ */

function refus(message: string): never {
  throw new IllegalActionError(message, 'action');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Un siège : un entier sûr, dans `[0, seats)`. Ni chaîne, ni tableau, ni `1.5`. */
function siege(value: unknown, seats: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value >= seats) {
    refus('Un siège est un numéro de place');
  }
  return value;
}

/**
 * Un siège ou `null` — un `null` **explicite** : un champ absent n'est pas
 * une abstention, c'est une charge utile mal formée.
 */
function siegeOuPersonne(raw: Record<string, unknown>, key: string, seats: number): number | null {
  if (!Object.hasOwn(raw, key)) refus(`Il manque « ${key} »`);
  const value = raw[key];
  return value === null ? null : siege(value, seats);
}

function booleen(value: unknown): boolean {
  if (typeof value !== 'boolean') refus('Un choix est vrai ou faux');
  return value;
}

/**
 * Lit une action venue du réseau, ou la refuse (R102).
 *
 * Le schéma est strict, verbe par verbe : sièges entiers bornés par `seats`
 * (la taille de la table si l'appelant la connaît, `MAX_PLAYERS` sinon),
 * booléens stricts, `target: null` explicite, canal dans l'énumération,
 * texte d'au plus `MAX_RAW_TEXT_LENGTH` unités avant traitement. L'objet
 * rendu est reconstruit : aucune clé en trop ne le traverse. Les votants du
 * Bouc forment une liste de sièges distincts — un doublon se fond.
 *
 * Un refus est une `IllegalActionError` de code `action`. La légalité — le
 * bon moment, le bon rôle, une cible vivante — reste l'affaire
 * d'`applyAction`.
 */
export function parseAction(raw: unknown, seats: number = MAX_PLAYERS): Action {
  if (!isRecord(raw)) refus('Action illisible');
  const borne = Number.isSafeInteger(seats) && seats > 0 ? Math.min(seats, MAX_PLAYERS) : MAX_PLAYERS;
  const type = raw.type;
  switch (type) {
    case 'pret':
      return { type };
    case 'cupidon':
      return { type, a: siege(raw.a, borne), b: siege(raw.b, borne) };
    case 'proteger':
    case 'sonder':
    case 'successeur':
      return { type, target: siege(raw.target, borne) };
    case 'devorer':
    case 'tirer':
    case 'voter':
    case 'marquer':
    case 'trahir':
      return { type, target: siegeOuPersonne(raw, 'target', borne) };
    // Le centre du trio du Renard : un siège vivant quelconque — lui compris
    // (D29) — ou `null` pour ne pas sonder (R107).
    case 'flairer':
      return { type, centre: siegeOuPersonne(raw, 'centre', borne) };
    case 'sorciere':
      return { type, save: booleen(raw.save), kill: siegeOuPersonne(raw, 'kill', borne) };
    case 'designerVotants': {
      const liste = raw.seats;
      // Une liste démesurée se refuse avant d'être parcourue.
      if (!Array.isArray(liste) || liste.length > MAX_PLAYERS * 2) refus('Les votants sont une liste de sièges');
      const vus = new Set<number>();
      for (const valeur of liste as unknown[]) vus.add(siege(valeur, borne));
      return { type, seats: [...vus] };
    }
    // La carte du Voleur : la première, la seconde — ou `null` pour
    // s'abstenir, un `null` explicite (R110).
    case 'voler': {
      if (!Object.hasOwn(raw, 'carte')) refus('Il manque « carte »');
      const carte = raw.carte;
      if (carte !== null && carte !== 0 && carte !== 1) refus('La carte du Voleur est 0, 1 ou null');
      return { type, carte };
    }
    // Le camp du Chien-Loup : `village` ou `loups`, rien d'autre (R111).
    case 'seRanger': {
      const camp = raw.camp;
      if (camp !== 'village' && camp !== 'loups') refus('Le camp du Chien-Loup est « village » ou « loups »');
      return { type, camp };
    }
    // Le modèle de l'Enfant Sauvage : un siège, jamais `null` (R112).
    case 'designerModele':
      return { type, target: siege(raw.target, borne) };
    case 'dire': {
      const channel = raw.channel;
      if (typeof channel !== 'string' || !(CHAT_CHANNELS as readonly string[]).includes(channel)) {
        refus('Canal inconnu');
      }
      const text = raw.text;
      if (typeof text !== 'string' || text.length > MAX_RAW_TEXT_LENGTH) refus('Message illisible');
      return { type, channel: channel as ChatChannel, text };
    }
    default:
      return refus('Action inconnue');
  }
}
