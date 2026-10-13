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
import { campEffectif, campOf, cartePublique, fratrieDe, groupeDe } from './types.js';
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
  /** Le Renard flaire un trio — un centre vivant, lui compris — ou personne (R107, D29). */
  | { kind: 'flairer' }
  /** Le Loup Blanc, une nuit paire : un autre loup vivant, ou personne (R97). */
  | { kind: 'trahir' }
  /** Le Bouc émissaire mort : au moins un vivant qui votera demain (R94). */
  | { kind: 'designerVotants' }
  /**
   * Le Voleur, avant la révélation : ses deux cartes, et l'obligation d'en
   * prendre une si ce sont deux loups — à lui seul, personne d'autre ne
   * connaît le talon (R110).
   */
  | { kind: 'voler'; cartes: [RoleId, RoleId]; obligatoire: boolean }
  /** Le Chien-Loup, la première nuit : son camp, pour toujours (R111). */
  | { kind: 'seRanger' }
  /** L'Enfant Sauvage, la première nuit : son modèle, vivant, jamais informé (R112). */
  | { kind: 'designerModele' };

export interface GameView {
  /** `null` pour un spectateur : aucune carte, aucun secret. */
  you:
    | {
        seat: number;
        /**
         * Sa propre carte — `null` pendant la phase du Voleur : avant la
         * révélation, personne n'a retourné la sienne, le Voleur compris,
         * qui échange sans regarder (R110, D46).
         */
        role: RoleId | null;
        alive: boolean;
        canVote: boolean;
      }
    | null;
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
  /**
   * Les sièges de votre fratrie, s'il y en a une : une connaissance statique,
   * acquise à la révélation des cartes comme les amoureux — la mort n'y
   * retire personne, seul le canal se referme (R113, R114). À qui voit tout,
   * tous les groupes ; à tous les autres, rien.
   */
  fratrie: number[];
  /** Ce que la Voyante a appris. */
  inspections: { day: number; target: number; role: RoleId }[];
  /**
   * Ce que la Petite Fille entrevoit, pendant l'étape principale seulement :
   * pour chaque cible, combien de loups la visent — jamais lesquels (R95).
   * `null` pour tout autre siège, à tout autre moment.
   */
  espionnage: Record<number, number> | null;
  /**
   * Ce que le Renard a appris, trio après trio — à lui seul, comme la Voyante
   * ses sondages (R107). Vide pour tout autre siège.
   */
  renardSavoirs: { day: number; seats: number[]; loups: boolean }[];
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
  if (omniscient) return new Set(['village', 'loups', 'amoureux', 'fratrie', 'morts']);
  if (seat === null) return readable;
  const player = state.players[seat];
  if (!player) return readable;
  // La meute ne compte ses morts : un loup mort ne lit plus le canal des
  // loups — sauf à voir tout, comme les autres morts. Au camp effectif
  // (R109) : le Chien-Loup rangé chez les loups y lit ; l'Enfant transformé
  // attend son réveil (D33).
  if (player.alive && campEffectif(player) === 'loups' && state.enfantReveil !== seat) {
    readable.add('loups');
  }
  if (state.lovers?.includes(seat)) readable.add('amoureux');
  // Le canal de sa fratrie tant qu'il vit — la mort le referme ; ceux qui
  // voient tout le relisent (R114). Jamais avant la révélation : la fratrie
  // se découvre avec les cartes (R113, D46).
  if (player.alive && state.phase.kind !== 'voleur' && fratrieDe(state, seat)) readable.add('fratrie');
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
function lastPerChannel(
  chat: readonly ChatMessage[],
  readable: ReadonlySet<ChatChannel>,
  groupe: number | null,
  omniscient: boolean,
): ChatMessage[] {
  const restants = new Map<ChatChannel, number>();
  const gardes: ChatMessage[] = [];
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    const message = chat[i];
    if (!message || !readable.has(message.channel)) continue;
    // Le canal fratrie ne se lit pas à deux : chaque groupe n'y garde que
    // ses messages — l'omniscient les relit tous (R114, D45).
    if (message.channel === 'fratrie' && !omniscient && message.groupe !== groupe) continue;
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
    case 'voleur':
      // Le talon ne se montre qu'à lui : les autres ne voient que la phase
      // (R110, R87).
      return phase.seat === seat
        ? {
            kind: 'voler',
            cartes: phase.cartes,
            obligatoire: phase.cartes.every((carte) => campOf(carte) === 'loups'),
          }
        : null;
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
      // Les deux solitaires de la première nuit, en parallèle de tout le
      // reste : leurs choix ne sont des pouvoirs du village ni l'un ni
      // l'autre — la rancune de l'Ancien n'y peut rien (R111, R112).
      if (state.day === 1 && player.role === 'chienLoup') return { kind: 'seRanger' };
      if (state.day === 1 && player.role === 'enfantSauvage') return { kind: 'designerModele' };
      // La meute chasse au camp effectif (R109) : le Chien-Loup rangé chez
      // les loups y rejoint la curée ; l'Enfant transformé attend son réveil
      // (D33).
      if (campEffectif(player) === 'loups' && state.enfantReveil !== seat) {
        return { kind: 'devorer' };
      }
      if (!powered) return null;
      if (player.role === 'voyante') return { kind: 'sonder' };
      if (player.role === 'salvateur') return { kind: 'proteger', forbidden: state.lastProtected };
      if (player.role === 'cupidon' && state.day === 1) return { kind: 'cupidon' };
      if (player.role === 'corbeau') return { kind: 'marquer' };
      // Le Renard flaire tant qu'il a son pouvoir : un trio sans loup le lui
      // retire à vie, la rancune de l'Ancien aussi (R107, R92).
      if (player.role === 'renard') return state.renardPouvoir ? { kind: 'flairer' } : null;
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
  // Blanc vivant est de la meute comme les autres (R95). Au camp effectif
  // (R109) : le Chien-Loup rangé chez les loups voit la meute ; l'Enfant
  // transformé attend son réveil (D33).
  const isLivingWolf =
    me !== undefined && me.alive && campEffectif(me) === 'loups' && state.enfantReveil !== me.seat;
  const lovers = state.lovers;
  const knowsLovers =
    omniscient ||
    (me !== undefined && (lovers?.includes(me.seat) === true || me.role === 'cupidon'));
  const inspected = new Map<number, RoleId>();
  if (me?.role === 'voyante') for (const entry of state.inspections) inspected.set(entry.target, entry.role);
  const phase = state.phase;

  const players: PlayerView[] = state.players.map((player) => {
    const known =
      omniscient ||
      player.seat === seat ||
      player.revealed ||
      (!player.alive && state.options.revelerRoles);
    // La meute reconnaît les siens, mais pas le Loup Blanc pour ce qu'il est :
    // à ses complices, il se montre en loup ordinaire (R95). Le camp effectif
    // compose le masque (R109, D27) : le Chien-Loup rangé chez les loups s'y
    // montre en loup — sa carte reste la sienne pour la Voyante et pour la
    // mort, jamais pour la meute. L'Enfant transformé, lui, n'y paraît qu'à
    // son réveil : la meute ne l'accueille qu'à la nuit suivante (D33).
    const packMate =
      isLivingWolf && campEffectif(player) === 'loups' && state.enfantReveil !== player.seat;
    // Avant la révélation — la phase du Voleur, seule avant elle (R110) —
    // aucune carte n'est retournée : pas même la sienne dans sa propre
    // ligne, pas même le masque de meute, qui dirait déjà « tu es loup »
    // (D46).
    const affiche =
      phase.kind === 'voleur'
        ? null
        : known
          ? player.role
          : packMate
            ? 'loup'
            : (inspected.get(player.seat) ?? null);
    return {
      seat: player.seat,
      alive: player.alive,
      // La carte du Villageois-Villageois se lit « villageois » de toute la
      // table — la Voyante qui le sonde comme les autres ; seule la fin de
      // partie dit villageois2 (R106, D31).
      role: affiche === null || state.over ? affiche : cartePublique(affiche),
      canVote: player.canVote,
      isCaptain: state.captain === player.seat,
      isLover: knowsLovers && lovers?.includes(player.seat) === true,
    };
  });

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
  const monGroupe = seat === null ? null : groupeDe(state, seat);
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
    you: me
      ? {
          seat: me.seat,
          // Sa propre carte se lit comme celle des autres : le porteur du
          // Villageois-Villageois croit être un villageois — la fin seule
          // détrompe (R106, D31). Sauf pendant la phase du Voleur, avant la
          // révélation : aucune carte n'est retournée, la sienne pas plus
          // (R110, D46).
          role: phase.kind === 'voleur' ? null : state.over ? me.role : cartePublique(me.role),
          alive: me.alive,
          canVote: me.canVote,
        }
      : null,
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
      // Pas de meute avant la révélation : la voir, c'est déjà savoir que
      // l'on est loup (R110, D46).
      (isLivingWolf || (omniscient && !state.over)) && phase.kind !== 'voleur'
        ? {
            // Les sièges de la meute, au camp effectif — l'Enfant transformé
            // n'y paraît qu'à son réveil (R109, D33).
            seats: state.players
              .filter((p) => campEffectif(p) === 'loups' && state.enfantReveil !== p.seat)
              .map((p) => p.seat),
            votes: phase.kind === 'nuit' ? { ...state.night.wolfVotes } : {},
          }
        : null,
    lover: partner,
    // Sa fratrie, s'il en a une — les sièges seulement, jamais les cartes :
    // la connaissance est statique, la mort ne la reprend pas (R113). À qui
    // voit tout, tous les groupes de la table. Elle naît à la révélation :
    // la phase du Voleur la tait, la sienne comme celle des autres (D46).
    fratrie:
      phase.kind === 'voleur'
        ? []
        : omniscient
          ? [...(state.fratries ?? []).flatMap((groupe) => groupe.sieges)].sort((a, b) => a - b)
          : [...(fratrieDe(state, me?.seat ?? -1)?.sieges ?? [])],
    // Le carnet de la Voyante lit les cartes comme la table : le
    // Villageois-Villageois y figure « villageois » — la fin seule dit
    // villageois2 (R106, D31).
    inspections:
      me?.role === 'voyante' || omniscient
        ? state.inspections.map((i) => ({ ...i, role: state.over ? i.role : cartePublique(i.role) }))
        : [],
    // Le carnet du Renard, comme les sondages de la Voyante : à lui seul —
    // et à qui voit tout, la fin de partie comprise (R107). Le `??` regarde
    // les états d'avant la v3, qui n'ont pas de carnet à montrer.
    renardSavoirs: me?.role === 'renard' || omniscient ? (state.renardSavoirs ?? []) : [],
    espionnage,
    pouvoirsPerdus: state.pouvoirsPerdus,
    marque: state.corbeau,
    votants: state.votants,
    chat: lastPerChannel(state.chat, readable, monGroupe, omniscient),
    channels: seat === null ? [] : speakableChannels(state, seat),
    over: state.over,
    winner: state.winner,
    log: state.over ? state.log : null,
  };
}
