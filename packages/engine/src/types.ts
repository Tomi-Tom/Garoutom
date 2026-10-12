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

/**
 * Un générateur d'aléa : le moteur n'appelle jamais `Math.random`.
 *
 * Depuis D20, le moteur ne dépend plus d'un `Rng` injecté pour jouer : l'état
 * de son générateur voyage dans `GameState.rng` (R104). Un `Rng` sert encore à
 * distribuer les cartes (`createGame` en accepte un, pour les tests) et au
 * générateur de compositions (`randomComposition`).
 */
export interface Rng {
  nextInt: (maxExclusive: number) => number;
}

/**
 * Les rôles mécaniques.
 *
 * Les identifiants sont ceux du jeu d'origine, en français et sans accent : ils
 * ne s'affichent jamais tels quels, le skin les traduit. Les huit premiers sont
 * ceux de la première version ; les cinq suivants, ouverts en v2 (R90+), ne
 * viennent qu'à la demande de l'hôte.
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
  'ancien',
  'corbeau',
  'bouc',
  'petiteFille',
  'loupBlanc',
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

/**
 * Les rôles optionnels de la v2 (R90) : l'Ancien, le Corbeau, le Bouc
 * émissaire, la Petite Fille et le Loup Blanc.
 *
 * Ils se choisissent comme les rôles spéciaux — un exemplaire au plus (R4) —
 * mais n'entrent **jamais** dans la composition de référence (R20) : celle-ci
 * garde l'équilibrage éprouvé des huit premiers rôles. Ils vivent dans une
 * liste à part pour que `SPECIAL_ROLES`, et tout ce qui s'en dérive — la
 * référence, les suggestions, le générateur par défaut —, ne bouge pas d'un
 * rôle (D12).
 */
export const OPTIONAL_ROLES = [
  'ancien',
  'corbeau',
  'bouc',
  'petiteFille',
  'loupBlanc',
] as const satisfies readonly RoleId[];

export type OptionalRoleId = (typeof OPTIONAL_ROLES)[number];

/** Tout ce que l'hôte peut cocher : les rôles spéciaux, puis les optionnels. */
export const CHOOSABLE_ROLES = [...SPECIAL_ROLES, ...OPTIONAL_ROLES] as const;

export type ChoosableRoleId = (typeof CHOOSABLE_ROLES)[number];

/** Le camp d'origine d'un rôle. Les amoureux peuvent en changer en cours de route. */
export type Camp = 'village' | 'loups';

/**
 * Le camp d'origine — celui de la carte, celui que la meute reconnaît.
 *
 * Le Loup Blanc est de la meute (R96) : il chasse avec elle, il en lit le
 * canal, il en porte la teinte. Son but, lui, est ailleurs — c'est `factionOf`.
 */
export function campOf(role: RoleId): Camp {
  return role === 'loup' || role === 'loupBlanc' ? 'loups' : 'village';
}

/**
 * Pour qui joue un rôle, au moment de compter les survivants.
 *
 * Le camp dit avec qui l'on chasse ; la faction dit avec qui l'on gagne. Les
 * deux ne divergent que pour le Loup Blanc, qui chasse avec la meute mais ne
 * gagne que seul (R98).
 */
export type Faction = Camp | 'loupBlanc';

export function factionOf(role: RoleId): Faction {
  return role === 'loupBlanc' ? 'loupBlanc' : campOf(role);
}

/**
 * Qui gagne.
 *
 * `amoureux` : un couple formé par Cupidon entre deux factions, seul survivant.
 * `loupBlanc` : le Loup Blanc, dernier survivant de la table (R98).
 * `personne` : tout le monde est mort en même temps.
 */
export type Winner = 'village' | 'loups' | 'amoureux' | 'loupBlanc' | 'personne';

/**
 * Pourquoi quelqu'un meurt. Le skin en tire sa phrase d'annonce.
 *
 * `abandon` : un siège vivant absent depuis trop longtemps quitte la partie
 * (R101, D18). C'est une mort publique, qui ne déclenche aucun pouvoir.
 */
export type DeathCause = 'loups' | 'poison' | 'vote' | 'chasseur' | 'chagrin' | 'abandon';

/** Toutes les causes de mort, pour qui doit les parcourir — un skin qui les traduit. */
export const DEATH_CAUSES = [
  'loups',
  'poison',
  'vote',
  'chasseur',
  'chagrin',
  'abandon',
] as const satisfies readonly DeathCause[];

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
  /**
   * Rôles retenus quand la composition est manuelle, un de chaque au plus :
   * les spéciaux comme les optionnels (R90).
   */
  roles: ChoosableRoleId[];
  /** Élection d'un capitaine le premier jour, dont la voix compte double. */
  capitaine: boolean;
  /**
   * Le capitaine est élu avant la première nuit au lieu du matin du jour 1 :
   * tout le monde vote, même celui qui ne survivra pas à la nuit (D3).
   */
  capitaineAvantNuit1: boolean;
  /**
   * Le Chasseur empoisonné — ou mort de chagrin — peut tirer, contre la
   * règle officielle où le poison l'étouffe (D1).
   */
  chasseurEmpoisonne: boolean;
  /** La Sorcière peut se servir de sa potion de vie sur elle-même (D2). */
  sorciereSeSauve: boolean;
  /**
   * L'Ancien tué de la main du village — vote, tir, poison — emporte les
   * pouvoirs du village avec lui (R92, D13). Sans effet sans Ancien.
   */
  ancienRancunier: boolean;
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
  /**
   * Un siège vivant absent depuis `ABANDON_MS` meurt d'abandon à la clôture
   * de phase suivante (R101, D18). Sans elle, la table attend ses absents :
   * qui n'agit pas n'agit pas (R81), et la partie ne finit qu'au vote.
   */
  abandon: boolean;
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
  /**
   * Rôle montré à tous, de son vivant ou à la mort quand le jeu l'impose :
   * l'Idiot gracié, le Chasseur qui tire, l'Ancien rancunier, le Bouc émissaire.
   */
  revealed: boolean;
}

/** Un message du fil de discussion. */
export type ChatChannel = 'village' | 'loups' | 'amoureux' | 'morts';

export interface ChatMessage {
  /**
   * Numéro du message, **compté par canal** : les trous d'une numérotation
   * globale raconteraient à chacun l'activité des canaux qu'il ne lit pas.
   */
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
 * - `principale` : Cupidon (première nuit), Salvateur, Voyante, Corbeau et
 *   loups jouent **en même temps**. Aucun n'a besoin de connaître le choix des
 *   autres, et appeler les rôles un à un ferait attendre douze personnes pour
 *   rien.
 * - `loupBlanc` : les nuits paires, le Loup Blanc seul peut dévorer un loup
 *   (R97) — étape tenue mort compris, comme celle de la Sorcière.
 * - `sorciere` : seule à jouer, parce qu'elle doit savoir qui les loups ont
 *   désigné.
 */
export type NightStep = 'principale' | 'loupBlanc' | 'sorciere';

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
  /** La marque du Corbeau, posée la nuit, annoncée à l'aube (R93). */
  raven: number | null;
  /** Le loup que le Loup Blanc dévore, une nuit paire (R97). */
  whiteKill: number | null;
}

/** Ce qui doit se passer avant de reprendre le cours normal. */
export type Trigger =
  | { kind: 'chasseur'; seat: number }
  | { kind: 'succession'; seat: number }
  /** Le Bouc émissaire mort d'une égalité désigne les votants du lendemain (R94). */
  | { kind: 'bouc'; seat: number };

export type Phase =
  /** Chacun découvre sa carte et confirme. */
  | { kind: 'revelation'; ready: number[] }
  | {
      kind: 'nuit';
      step: NightStep;
      acted: number[];
      /**
       * La durée d'une étape fantôme — Sorcière morte ou sans pouvoir (R36),
       * Loup Blanc mort (R97) —, tirée par le moteur à l'entrée de l'étape
       * (R104). Absente d'une étape jouée : celle-là dure `tempsNuit`. Ne
       * quitte jamais l'état — `viewFor` ne dit que l'étape.
       */
      ghostMs?: number;
    }
  /** Le Chasseur mort tire, ou le capitaine mort désigne son successeur. */
  | { kind: 'chasseur'; seat: number }
  | { kind: 'succession'; seat: number }
  /** Le Bouc émissaire mort désigne qui votera au prochain jour (R94). */
  | { kind: 'bouc'; seat: number }
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
  | { day: number; type: 'vote'; tally: Record<number, number>; executed: number | null }
  /** L'Ancien a encaissé la première attaque de la meute (R91). */
  | { day: number; type: 'resistance'; seat: number }
  /** L'Ancien tué de la main du village : le village perd ses pouvoirs (R92). */
  | { day: number; type: 'rancune'; seat: number }
  /** La marque du Corbeau, posée la nuit (R93). */
  | { day: number; type: 'corbeau'; target: number }
  /** Le Bouc émissaire paie l'égalité du vote (R94). */
  | { day: number; type: 'bouc'; seat: number }
  /** Les votants désignés par le Bouc, ou `null` s'il s'est tu (R94). */
  | { day: number; type: 'votants'; seats: number[] | null }
  /** Le choix du Loup Blanc, une nuit paire : un loup, ou personne (R97). */
  | { day: number; type: 'loupBlanc'; target: number | null };

export interface GameState {
  options: GameOptions;
  players: PlayerState[];
  /**
   * L'état du générateur d'aléa (mulberry32, entier non signé de 32 bits).
   * Chaque tirage du moteur le fait avancer : un état sérialisé puis repris
   * rejoue exactement la même partie qu'un état jamais interrompu (R104).
   * Un secret comme un autre : il ne quitte pas l'état.
   */
  rng: number;
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
  /** L'élection du capitaine a eu lieu, électif ou non : elle ne revient pas. */
  electionHeld: boolean;
  lovers: [number, number] | null;
  potions: { vie: boolean; mort: boolean };
  /** Le Salvateur ne protège pas deux nuits de suite la même personne. */
  lastProtected: number | null;
  /** Ce que la Voyante a appris, nuit après nuit. */
  inspections: { day: number; target: number; role: RoleId }[];
  /** L'Ancien a déjà encaissé une attaque de la meute : la suivante le tue (R91). */
  ancienBlesse: boolean;
  /** Le village a perdu ses pouvoirs, l'Ancien mort de sa main (R92). */
  pouvoirsPerdus: boolean;
  /** Le siège marqué par le Corbeau, annoncé à l'aube, pour le vote du jour (R93). */
  corbeau: number | null;
  /** Les seuls votants du prochain vote du village, désignés par le Bouc (R94). */
  votants: number[] | null;
  /**
   * Nuits de huis clos — il ne reste que la meute, Loup Blanc compris —
   * ouvertes depuis la dernière mort. Garde-fou de terminaison (R99).
   */
  huisClos: number;
  chat: ChatMessage[];
  /** Le prochain numéro de message, pour chaque canal. */
  nextMessageId: Record<ChatChannel, number>;
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
  /** Le Corbeau marque un vivant, ou personne (R93). */
  | { type: 'marquer'; target: number | null }
  /** Le Loup Blanc dévore un autre loup, ou personne (R97). */
  | { type: 'trahir'; target: number | null }
  /** Le Bouc émissaire mort désigne les votants du lendemain (R94). */
  | { type: 'designerVotants'; seats: number[] }
  | { type: 'dire'; channel: ChatChannel; text: string };

/**
 * Les verbes du jeu, pour qui doit filtrer une action venue du réseau : un
 * verbe inconnu ne doit jamais atteindre `applyAction`.
 */
export const ACTION_TYPES = [
  'pret',
  'cupidon',
  'proteger',
  'sonder',
  'devorer',
  'sorciere',
  'tirer',
  'successeur',
  'voter',
  'marquer',
  'trahir',
  'designerVotants',
  'dire',
] as const satisfies readonly Action['type'][];

// Et réciproquement : un verbe ajouté à `Action` sans entrer dans la liste
// casse la compilation ici, pas une partie en cours.
const verbesCouverts: [Exclude<Action['type'], (typeof ACTION_TYPES)[number]>] extends [never] ? true : never =
  true;
void verbesCouverts;

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
  /**
   * L'Ancien est mort de la main du village : sa carte se retourne, et le
   * village perd ses pouvoirs (R92).
   */
  | { type: 'rancune'; seat: number }
  /** À l'aube, le siège marqué par le Corbeau — jamais le Corbeau lui-même (R93). */
  | { type: 'corbeau'; target: number }
  /** L'égalité du vote retombe sur le Bouc émissaire, carte retournée (R94). */
  | { type: 'bouc'; seat: number }
  /** Les votants désignés par le Bouc ; `null` : il s'est tu, tout le monde vote (R94). */
  | { type: 'votants'; bouc: number; seats: number[] | null }
  | { type: 'fin'; winner: Winner };

export interface Step {
  state: GameState;
  events: GameEvent[];
}

/**
 * Un refus du moteur : un message humain, un `code` machine — `illegal`,
 * `action` (charge utile mal formée, R102), `seat`, `target`, `wrong-phase`,
 * `not-your-turn`, `cannot-vote`, `potion`, `powers`, `empty`, `name`,
 * `channel`, `stale`, `over`, `players`, `composition`.
 */
export class IllegalActionError extends Error {
  constructor(
    message: string,
    readonly code = 'illegal',
  ) {
    super(message);
  }
}
