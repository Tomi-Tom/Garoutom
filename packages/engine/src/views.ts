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

import { livingPack, MAX_CHAT_PER_CHANNEL, speakableChannels } from './game.js';
import { campOf } from './types.js';
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
  | {
      kind: 'sorciere';
      victim: number | null;
      vie: boolean;
      mort: boolean;
      /** Faux quand la victime est la Sorcière et que la table le lui interdit. */
      peutSeSauver: boolean;
    }
  | { kind: 'tirer' }
  | { kind: 'successeur' }
  | { kind: 'voter'; election: boolean }
  /** Le Corbeau marque un vivant — lui compris — ou personne (R93). */
  | { kind: 'marquer' }
  /** Le Loup Blanc, une nuit paire : un autre loup vivant, ou personne (R97). */
  | { kind: 'trahir' }
  /** Le Bouc émissaire mort : au moins un vivant qui votera demain (R94). */
  | { kind: 'designerVotants' };

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
  /**
   * Ce que la Petite Fille entrevoit, pendant l'étape principale seulement :
   * pour chaque cible, combien de loups la visent — jamais lesquels (R95).
   * `null` pour tout autre siège, à tout autre moment.
   */
  espionnage: Record<number, number> | null;
  /** Le village a perdu ses pouvoirs — c'est public, l'annonce l'a dit (R92). */
  pouvoirsPerdus: boolean;
  /** Le siège marqué par le Corbeau pour le vote du jour, annoncé à l'aube (R93). */
  marque: number | null;
  /** Les seuls votants du prochain vote, désignés par le Bouc ; `null` : tout le monde (R94). */
  votants: number[] | null;
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
  // La meute ne compte ses morts : un loup mort ne lit plus le canal des
  // loups — sauf à voir tout, comme les autres morts.
  if (player.alive && campOf(player.role) === 'loups') readable.add('loups');
  if (state.lovers?.includes(seat)) readable.add('amoureux');
  if (!player.alive) readable.add('morts');
  return readable;
}

/**
 * Les derniers messages de chaque canal lisible — `MAX_CHAT_PER_CHANNEL`
 * chacun, dans l'ordre du fil (R78, D23).
 *
 * La borne se compte canal par canal : ce qu'un siège voit d'un canal ne
 * dépend que de ce canal, jamais du bavardage de ceux qu'il ne lit pas. Le
 * moteur range déjà le fil ainsi ; la vue le redit, pour un état d'avant qui
 * en garderait davantage.
 */
function lastPerChannel(chat: readonly ChatMessage[], readable: ReadonlySet<ChatChannel>): ChatMessage[] {
  const restants = new Map<ChatChannel, number>();
  const gardes: ChatMessage[] = [];
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    const message = chat[i];
    if (!message || !readable.has(message.channel)) continue;
    const reste = restants.get(message.channel) ?? MAX_CHAT_PER_CHANNEL;
    if (reste === 0) continue;
    restants.set(message.channel, reste - 1);
    gardes.push(message);
  }
  return gardes.reverse();
}

function promptFor(state: GameState, seat: number): Prompt | null {
  const player = state.players[seat];
  if (!player) return null;
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      return player.alive ? { kind: 'pret' } : null;
    case 'nuit': {
      if (!player.alive) return null;
      // Le village sans pouvoirs n'a plus de consigne la nuit (R92) ; la
      // meute, elle, chasse toujours.
      const powered = !state.pouvoirsPerdus;
      if (phase.step === 'sorciere') {
        return player.role === 'sorciere' && powered
          ? {
              kind: 'sorciere',
              victim: state.night.victim,
              vie: state.potions.vie,
              mort: state.potions.mort,
              peutSeSauver: state.options.sorciereSeSauve || state.night.victim !== seat,
            }
          : null;
      }
      if (phase.step === 'loupBlanc') return player.role === 'loupBlanc' ? { kind: 'trahir' } : null;
      if (campOf(player.role) === 'loups') return { kind: 'devorer' };
      if (!powered) return null;
      if (player.role === 'voyante') return { kind: 'sonder' };
      if (player.role === 'salvateur') return { kind: 'proteger', forbidden: state.lastProtected };
      if (player.role === 'cupidon' && state.day === 1) return { kind: 'cupidon' };
      if (player.role === 'corbeau') return { kind: 'marquer' };
      // La Petite Fille n'a pas de consigne : elle regarde, elle n'agit pas —
      // son silence est celui d'un villageois (R95).
      return null;
    }
    case 'chasseur':
      return phase.seat === seat ? { kind: 'tirer' } : null;
    case 'succession':
      return phase.seat === seat ? { kind: 'successeur' } : null;
    case 'bouc':
      return phase.seat === seat ? { kind: 'designerVotants' } : null;
    case 'election':
      return player.alive ? { kind: 'voter', election: true } : null;
    case 'jour':
      return player.alive && player.canVote && (state.votants === null || state.votants.includes(seat))
        ? { kind: 'voter', election: false }
        : null;
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
  // Un loup mort n'est plus de la meute : il ne reconnaît plus ses complices
  // — sauf à voir tout, comme n'importe quel mort sous cette option. Le Loup
  // Blanc vivant est de la meute comme les autres (R95).
  const isLivingWolf = me !== undefined && me.alive && campOf(me.role) === 'loups';
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
      (!player.alive && state.options.revelerRoles);
    // La meute reconnaît les siens, mais pas le Loup Blanc pour ce qu'il est :
    // à ses complices, il se montre en loup ordinaire (R95).
    const packMate = isLivingWolf && campOf(player.role) === 'loups';
    return {
      seat: player.seat,
      alive: player.alive,
      role: known ? player.role : packMate ? 'loup' : (inspected.get(player.seat) ?? null),
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

  // La Petite Fille entrouvre la porte pendant que la meute vote : des
  // nombres de voix par cible, jamais un loup (R96). Une fois l'étape close,
  // la porte se referme.
  let espionnage: Record<number, number> | null = null;
  if (
    me?.role === 'petiteFille' &&
    me.alive &&
    !state.pouvoirsPerdus &&
    !state.over &&
    phase.kind === 'nuit' &&
    phase.step === 'principale'
  ) {
    espionnage = {};
    for (const wolf of livingPack(state)) {
      const target = state.night.wolfVotes[wolf];
      if (target === undefined || target === null) continue;
      espionnage[target] = (espionnage[target] ?? 0) + 1;
    }
  }

  return {
    you: me ? { seat: me.seat, role: me.role, alive: me.alive, canVote: me.canVote } : null,
    options: state.options,
    phase: phase.kind,
    step: phase.kind === 'nuit' ? phase.step : null,
    day: state.day,
    players,
    captain: state.captain,
    prompt: seat === null || state.over ? null : promptFor(state, seat),
    acted,
    voted: votes ? Object.keys(votes).map(Number) : [],
    yourVote: votes && seat !== null ? (votes[seat] ?? null) : null,
    pack:
      isLivingWolf || (omniscient && !state.over)
        ? {
            seats: state.players.filter((p) => campOf(p.role) === 'loups').map((p) => p.seat),
            votes: phase.kind === 'nuit' ? { ...state.night.wolfVotes } : {},
          }
        : null,
    lover: partner,
    inspections: me?.role === 'voyante' || omniscient ? state.inspections : [],
    espionnage,
    pouvoirsPerdus: state.pouvoirsPerdus,
    marque: state.corbeau,
    votants: state.votants,
    chat: lastPerChannel(state.chat, readable),
    channels: seat === null ? [] : speakableChannels(state, seat),
    over: state.over,
    winner: state.winner,
    log: state.over ? state.log : null,
  };
}
