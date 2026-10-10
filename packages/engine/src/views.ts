/**
 * Ce qu'un siège a le droit de savoir.
 *
 * Le loup-garou est un jeu d'information cachée : l'état brut ne quitte jamais
 * le serveur. Chaque joueur reçoit une `GameView` taillée pour lui, et ce
 * fichier est le seul endroit où l'on décide de ce qu'elle contient. Un champ
 * oublié ici, c'est un rôle qui fuit dans l'onglet réseau du navigateur.
 *
 * La règle par défaut est le silence : on n'ajoute une information que si le
 * siège a une raison explicite de la connaître.
 */

import { pendingActors, speakableChannels } from './game.js';
import type {
  ChatChannel,
  ChatMessage,
  GameOptions,
  GameState,
  LogEntry,
  NightStep,
  PhaseKind,
  RoleId,
  Winner,
} from './types.js';

export interface PlayerView {
  seat: number;
  alive: boolean;
  /** Le rôle, s'il est connu de ce siège. `null` sinon. */
  role: RoleId | null;
  canVote: boolean;
  isCaptain: boolean;
  /** Visible seulement de qui sait (les amoureux, Cupidon, les morts qui voient tout). */
  isLover: boolean;
}

/** Ce que le siège doit faire maintenant, s'il doit faire quelque chose. */
export type Prompt =
  | { kind: 'pret' }
  | { kind: 'cupidon' }
  | { kind: 'proteger'; forbidden: number | null }
  | { kind: 'sonder' }
  | { kind: 'devorer' }
  | { kind: 'sorciere'; victim: number | null; vie: boolean; mort: boolean }
  | { kind: 'tirer' }
  | { kind: 'successeur' }
  | { kind: 'voter'; election: boolean };

export interface GameView {
  /** `null` pour un spectateur : aucune carte, aucun secret. */
  you: { seat: number; role: RoleId; alive: boolean; canVote: boolean } | null;
  options: GameOptions;
  phase: PhaseKind;
  step: NightStep | null;
  day: number;
  players: PlayerView[];
  captain: number | null;
  /** Ce qu'on attend de vous, et si vous l'avez déjà fait (on peut changer d'avis). */
  prompt: Prompt | null;
  acted: boolean;
  /**
   * Qui a voté, sans dire pour qui : la pastille « a voté ». Les cibles ne sont
   * révélées qu'au dépouillement, toutes ensemble.
   */
  voted: number[];
  /** Votre propre vote en cours, pour le surligner. */
  yourVote: number | null;
  /** Les loups, si vous en êtes : vos complices et leurs votes de la nuit. */
  pack: { seats: number[]; votes: Record<number, number | null> } | null;
  /** Votre amoureux, si Cupidon vous a choisi. */
  lover: number | null;
  /** Ce que la Voyante a appris. */
  inspections: { day: number; target: number; role: RoleId }[];
  chat: ChatMessage[];
  /** Où vous pouvez écrire en ce moment. */
  channels: ChatChannel[];
  over: boolean;
  winner: Winner | null;
  /** Le récapitulatif complet, une fois la partie finie : la nuit racontée. */
  log: LogEntry[] | null;
}

/** Les canaux qu'un siège a le droit de lire. */
function readableChannels(state: GameState, seat: number | null, omniscient: boolean): Set<ChatChannel> {
  const readable = new Set<ChatChannel>(['village']);
  if (omniscient) return new Set(['village', 'loups', 'amoureux', 'morts']);
  if (seat === null) return readable;
  const player = state.players[seat];
  if (!player) return readable;
  if (player.role === 'loup') readable.add('loups');
  if (state.lovers?.includes(seat)) readable.add('amoureux');
  if (!player.alive) readable.add('morts');
  return readable;
}

function promptFor(state: GameState, seat: number): Prompt | null {
  const player = state.players[seat];
  if (!player) return null;
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      return player.alive ? { kind: 'pret' } : null;
    case 'nuit':
      if (!player.alive) return null;
      if (phase.step === 'sorciere') {
        return player.role === 'sorciere'
          ? {
              kind: 'sorciere',
              victim: state.night.victim,
              vie: state.potions.vie,
              mort: state.potions.mort,
            }
          : null;
      }
      if (player.role === 'loup') return { kind: 'devorer' };
      if (player.role === 'voyante') return { kind: 'sonder' };
      if (player.role === 'salvateur') return { kind: 'proteger', forbidden: state.lastProtected };
      if (player.role === 'cupidon' && state.day === 1) return { kind: 'cupidon' };
      return null;
    case 'chasseur':
      return phase.seat === seat ? { kind: 'tirer' } : null;
    case 'succession':
      return phase.seat === seat ? { kind: 'successeur' } : null;
    case 'election':
      return player.alive ? { kind: 'voter', election: true } : null;
    case 'jour':
      return player.alive && player.canVote ? { kind: 'voter', election: false } : null;
    case 'fin':
      return null;
  }
}

/**
 * La vue d'un siège sur la partie. `seat` vaut `null` pour un spectateur.
 *
 * Un joueur sait qu'il a « déjà agi » la nuit, mais personne d'autre ne le sait :
 * savoir qui a fini de jouer, c'est savoir qui a un rôle.
 */
export function viewFor(state: GameState, seat: number | null): GameView {
  const me = seat === null ? undefined : state.players[seat];
  const omniscient =
    state.over || (me !== undefined && !me.alive && state.options.mortsVoientTout);
  const isWolf = me?.role === 'loup';
  const lovers = state.lovers;
  const knowsLovers =
    omniscient ||
    (me !== undefined && (lovers?.includes(me.seat) === true || me.role === 'cupidon'));
  const inspected = new Map<number, RoleId>();
  if (me?.role === 'voyante') for (const entry of state.inspections) inspected.set(entry.target, entry.role);

  const players: PlayerView[] = state.players.map((player) => {
    const known =
      omniscient ||
      player.seat === seat ||
      player.revealed ||
      (!player.alive && state.options.revelerRoles) ||
      (isWolf && player.role === 'loup');
    return {
      seat: player.seat,
      alive: player.alive,
      role: known ? player.role : (inspected.get(player.seat) ?? null),
      canVote: player.canVote,
      isCaptain: state.captain === player.seat,
      isLover: knowsLovers && lovers?.includes(player.seat) === true,
    };
  });

  const phase = state.phase;
  const votes = phase.kind === 'jour' || phase.kind === 'election' ? phase.votes : null;
  const acted =
    seat === null
      ? false
      : phase.kind === 'nuit'
        ? phase.acted.includes(seat)
        : phase.kind === 'revelation'
          ? phase.ready.includes(seat)
          : votes !== null
            ? seat in votes
            : false;

  const readable = readableChannels(state, seat, omniscient);
  const partner =
    me !== undefined && lovers?.includes(me.seat) ? (lovers[0] === me.seat ? lovers[1] : lovers[0]) : null;

  return {
    you: me ? { seat: me.seat, role: me.role, alive: me.alive, canVote: me.canVote } : null,
    options: state.options,
    phase: phase.kind,
    step: phase.kind === 'nuit' ? phase.step : null,
    day: state.day,
    players,
    captain: state.captain,
    prompt: seat === null || state.over ? null : pendingOrActed(state, seat),
    acted,
    voted: votes ? Object.keys(votes).map(Number) : [],
    yourVote: votes && seat !== null ? (votes[seat] ?? null) : null,
    pack:
      isWolf || (omniscient && !state.over)
        ? {
            seats: state.players.filter((p) => p.role === 'loup').map((p) => p.seat),
            votes: phase.kind === 'nuit' ? { ...state.night.wolfVotes } : {},
          }
        : null,
    lover: partner,
    inspections: me?.role === 'voyante' || omniscient ? state.inspections : [],
    chat: state.chat.filter((message) => readable.has(message.channel)),
    channels: seat === null ? [] : speakableChannels(state, seat),
    over: state.over,
    winner: state.winner,
    log: state.over ? state.log : null,
  };
}

/**
 * Le prompt reste affiché après avoir agi, pour qu'on puisse changer d'avis
 * tant que la phase court — sauf pour qui n'est plus attendu du tout.
 */
function pendingOrActed(state: GameState, seat: number): Prompt | null {
  const prompt = promptFor(state, seat);
  if (prompt === null) return null;
  // Le Chasseur et le capitaine n'agissent qu'une fois : leur phase se clôt aussitôt.
  void pendingActors;
  return prompt;
}
