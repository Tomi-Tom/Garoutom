/**
 * Le vocabulaire du moteur.
 *
 * Le moteur ne connaît que des **mécaniques**. Il ne sait pas qu'il y a un
 * village, une lune ou des loups : il connaît un camp qui chasse la nuit, un
 * camp qui vote le jour, et des rôles qui ont un pouvoir. Les noms, les textes,
 * l'ambiance appartiennent au skin, côté client (voir `docs/SKINS.md`). Une
 * partie jouée en skin Thiercelieux et la même jouée en skin Shiganshina
 * produisent exactement les mêmes états.
 *
 * C'est la seule façon de garder un équilibrage unique pour tous les univers.
 */

/** Aléa injecté : le moteur n'appelle jamais `Math.random`. */
export interface Rng {
  nextInt: (maxExclusive: number) => number;
}

/**
 * Les rôles mécaniques de la première version.
 *
 * Les identifiants sont ceux du jeu d'origine, en français et sans accent : ils
 * ne s'affichent jamais tels quels, le skin les traduit.
 */
export const ROLES = [
  'villageois',
  'loup',
  'voyante',
  'sorciere',
  'chasseur',
  'cupidon',
  'salvateur',
  'idiot',
] as const;

export type RoleId = (typeof ROLES)[number];

/** Les rôles qu'on choisit un par un. Villageois et loups se comptent. */
export const SPECIAL_ROLES = [
  'voyante',
  'sorciere',
  'chasseur',
  'cupidon',
  'salvateur',
  'idiot',
] as const satisfies readonly RoleId[];

export type SpecialRoleId = (typeof SPECIAL_ROLES)[number];

/** Le camp d'origine d'un rôle. Les amoureux peuvent en changer en cours de route. */
export type Camp = 'village' | 'loups';

export function campOf(role: RoleId): Camp {
  return role === 'loup' ? 'loups' : 'village';
}

/**
 * Qui gagne.
 *
 * `amoureux` : un couple formé par Cupidon entre les deux camps, seul survivant.
 * `personne` : tout le monde est mort en même temps.
 */
export type Winner = 'village' | 'loups' | 'amoureux' | 'personne';

/** Pourquoi quelqu'un meurt. Le skin en tire sa phrase d'annonce. */
export type DeathCause = 'loups' | 'poison' | 'vote' | 'chasseur' | 'chagrin';

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export interface GameOptions {
  /**
   * Composition automatique : le moteur choisit loups et rôles selon le nombre
   * de joueurs au moment du lancement. Sinon, `loups` et `roles` font foi.
   */
  auto: boolean;
  /** Nombre de loups quand la composition est manuelle. */
  loups: number;
  /** Rôles spéciaux retenus quand la composition est manuelle, un de chaque au plus. */
  roles: SpecialRoleId[];
  /** Élection d'un capitaine le premier jour, dont la voix compte double. */
  capitaine: boolean;
  /**
   * Discussion intégrée pour le village. Sans elle, on joue autour d'une vraie
   * table et chacun ne se sert de son téléphone que pour ses cartes et ses
   * votes. Le canal des loups, lui, existe toujours : ils n'ont pas d'autre
   * moyen de se parler la nuit.
   */
  chat: boolean;
  /** Le rôle d'un mort est montré à tous. */
  revelerRoles: boolean;
  /** Les morts voient les rôles de tous et lisent les canaux secrets. */
  mortsVoientTout: boolean;
  /** Durée d'une étape de nuit, en secondes. */
  tempsNuit: number;
  /** Durée du jour (débat et vote), en secondes. */
  tempsJour: number;
  /**
   * L'univers choisi par l'hôte. Le moteur ne fait que le transporter : tout le
   * monde doit voir le même, et c'est la partie qui le porte.
   */
  skin: string;
}

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

export interface PlayerState {
  seat: number;
  role: RoleId;
  alive: boolean;
  /** Faux pour l'Idiot une fois gracié : il reste en vie mais ne vote plus. */
  canVote: boolean;
  /** Rôle montré à tous de son vivant (l'Idiot gracié). */
  revealed: boolean;
}

/** Un message du fil de discussion. */
export type ChatChannel = 'village' | 'loups' | 'amoureux' | 'morts';

export interface ChatMessage {
  id: number;
  channel: ChatChannel;
  seat: number;
  text: string;
  /** Jour de la partie où le message a été écrit, pour le récapitulatif. */
  day: number;
}

/**
 * Une étape de la nuit.
 *
 * - `principale` : Cupidon (première nuit), Salvateur, Voyante et loups jouent
 *   **en même temps**. Aucun n'a besoin de connaître le choix des autres, et
 *   appeler les rôles un à un ferait attendre douze personnes pour rien.
 * - `sorciere` : seule à jouer, parce qu'elle doit savoir qui les loups ont
 *   désigné.
 */
export type NightStep = 'principale' | 'sorciere';

/** Ce qui se décide pendant une nuit, et qui ne sera résolu qu'à l'aube. */
export interface NightChoices {
  lovers: [number, number] | null;
  protect: number | null;
  inspect: number | null;
  /** Vote de chaque loup : siège visé, ou `null` pour ne désigner personne. */
  wolfVotes: Record<number, number | null>;
  /** Victime retenue par les loups, connue une fois l'étape principale close. */
  victim: number | null;
  witchSave: boolean;
  witchKill: number | null;
}

/** Ce qui doit se passer avant de reprendre le cours normal. */
export type Trigger = { kind: 'chasseur'; seat: number } | { kind: 'succession'; seat: number };

export type Phase =
  /** Chacun découvre sa carte et confirme. */
  | { kind: 'revelation'; ready: number[] }
  | { kind: 'nuit'; step: NightStep; acted: number[] }
  /** Le Chasseur mort tire, ou le capitaine mort désigne son successeur. */
  | { kind: 'chasseur'; seat: number }
  | { kind: 'succession'; seat: number }
  | { kind: 'election'; votes: Record<number, number | null> }
  | { kind: 'jour'; votes: Record<number, number | null> }
  | { kind: 'fin' };

export type PhaseKind = Phase['kind'];

/** Une ligne du récapitulatif de fin de partie. Tout y est, même les secrets. */
export type LogEntry =
  | { day: number; type: 'amoureux'; seats: [number, number] }
  | { day: number; type: 'protection'; target: number }
  | { day: number; type: 'voyance'; target: number; role: RoleId }
  | { day: number; type: 'loups'; target: number | null }
  | { day: number; type: 'sauvetage'; target: number }
  | { day: number; type: 'poison'; target: number }
  | { day: number; type: 'mort'; seat: number; cause: DeathCause }
  | { day: number; type: 'grace'; seat: number }
  | { day: number; type: 'capitaine'; seat: number }
  | { day: number; type: 'tir'; target: number | null }
  | { day: number; type: 'vote'; tally: Record<number, number>; executed: number | null };

export interface GameState {
  options: GameOptions;
  players: PlayerState[];
  phase: Phase;
  /**
   * Numéro de la phase en cours, incrémenté à chaque changement. Le serveur s'en
   * sert pour savoir qu'une minuterie concerne encore la phase qui l'a armée.
   */
  phaseSeq: number;
  /** Compteur de nuits et de jours : la nuit 1 précède le jour 1. */
  day: number;
  /** Ce qui reprend une fois les déclencheurs vidés. */
  resume: 'jour' | 'nuit';
  triggers: Trigger[];
  night: NightChoices;
  captain: number | null;
  lovers: [number, number] | null;
  potions: { vie: boolean; mort: boolean };
  /** Le Salvateur ne protège pas deux nuits de suite la même personne. */
  lastProtected: number | null;
  /** Ce que la Voyante a appris, nuit après nuit. */
  inspections: { day: number; target: number; role: RoleId }[];
  chat: ChatMessage[];
  nextMessageId: number;
  log: LogEntry[];
  winner: Winner | null;
  over: boolean;
}

/* ------------------------------------------------------------------ */
/* Actions et évènements                                               */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un joueur peut demander. Le siège de l'auteur n'en fait jamais partie :
 * il vient de la session, côté serveur.
 */
export type Action =
  | { type: 'pret' }
  | { type: 'cupidon'; a: number; b: number }
  | { type: 'proteger'; target: number }
  | { type: 'sonder'; target: number }
  | { type: 'devorer'; target: number | null }
  | { type: 'sorciere'; save: boolean; kill: number | null }
  | { type: 'tirer'; target: number | null }
  | { type: 'successeur'; target: number }
  | { type: 'voter'; target: number | null }
  | { type: 'dire'; channel: ChatChannel; text: string };

export interface Death {
  seat: number;
  cause: DeathCause;
  /** Le rôle du mort, ou `null` si la table a choisi de ne pas le révéler. */
  role: RoleId | null;
}

/**
 * Ce qui vient de se passer, pour que le client l'anime et que le narrateur le
 * raconte. Un évènement part à tous les sièges : il ne porte jamais un secret.
 */
export type GameEvent =
  | { type: 'debut' }
  | { type: 'phase'; phase: PhaseKind; step?: NightStep; day: number }
  | { type: 'morts'; deaths: Death[] }
  | { type: 'aube-paisible' }
  | { type: 'grace'; seat: number }
  | { type: 'vote'; tally: Record<number, number>; executed: number | null }
  | { type: 'capitaine'; seat: number; from: number | null }
  | { type: 'tir'; hunter: number; target: number | null }
  | { type: 'message'; id: number }
  | { type: 'fin'; winner: Winner };

export interface Step {
  state: GameState;
  events: GameEvent[];
}

export class IllegalActionError extends Error {
  constructor(
    message: string,
    readonly code = 'illegal',
  ) {
    super(message);
  }
}
