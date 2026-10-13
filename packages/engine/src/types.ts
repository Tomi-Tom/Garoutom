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
 * ceux de la première version ; les cinq suivants, ouverts en v2 (R90+), et les
 * trois de la première vague de la v3 (R105+) ne viennent qu'à la demande de
 * l'hôte.
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
  'villageois2',
  'renard',
  'ours',
  'voleur',
  'chienLoup',
  'enfantSauvage',
  'soeurs',
  'freres',
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

/**
 * Les rôles optionnels de la v3 (R90, D26) : les dix-huit cartes officielles
 * qui restent, livrées vague par vague. Première vague : le
 * Villageois-Villageois, le Renard et le Montreur d'Ours (R105 à R108).
 * Deuxième vague : le Voleur, le Chien-Loup, l'Enfant Sauvage, les Deux
 * Sœurs et les Trois Frères (R109 à R114).
 *
 * Ils se cochent comme les autres — un exemplaire au plus (R4), sauf les
 * fratries, qui portent leur multiplicité (R113) — et n'entrent jamais dans
 * la référence (R20) ni au générateur (R100) : seul l'hôte les fait venir.
 * Et la liste ne grandit qu'au fil des vagues : n'entre dans `ROLES` que ce
 * qui est livré, sinon le contrat du client — `Record<RoleId, TexteRole>` et
 * tous ses switchs exhaustifs — exigerait la boîte entière d'un coup (D26).
 * `SPECIAL_ROLES` et `OPTIONAL_ROLES`, eux, ne bougent pas d'une ligne :
 * tout ce qui s'en dérive reste identique, graine pour graine.
 */
export const OPTIONAL_ROLES_V3 = [
  'villageois2',
  'renard',
  'ours',
  'voleur',
  'chienLoup',
  'enfantSauvage',
  'soeurs',
  'freres',
] as const satisfies readonly RoleId[];

export type OptionalRoleIdV3 = (typeof OPTIONAL_ROLES_V3)[number];

/** Tout ce que l'hôte peut cocher : les rôles spéciaux, puis les optionnels des deux listes. */
export const CHOOSABLE_ROLES = [...SPECIAL_ROLES, ...OPTIONAL_ROLES, ...OPTIONAL_ROLES_V3] as const;

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
 * Le camp effectif d'un siège (R109) : celui que la transformation lui a
 * écrit — le Chien-Loup rangé (R111), l'Enfant Sauvage transformé (R112) —,
 * ou, si l'état n'en porte pas, son camp d'origine. Tout lecteur de camp
 * passe par ici : la victoire, la meute, le trio du Renard, la grogne de
 * l'Ours, les cibles interdites. Les états d'avant la v3 n'y portent jamais
 * de `camp` : la lecture retombe sur l'origine, comme toujours.
 */
export function campEffectif(player: PlayerState): Camp {
  return player.camp ?? campOf(player.role);
}

/**
 * La faction effective d'un siège (R109) : le Loup Blanc garde la sienne
 * quand bien même son camp est aux loups (R98) ; les autres suivent leur
 * camp effectif — un couple d'amoureux dont l'un a changé de camp se relit
 * ici (D27).
 */
export function factionEffectif(player: PlayerState): Faction {
  return player.role === 'loupBlanc' ? 'loupBlanc' : campEffectif(player);
}

/**
 * La fratrie d'un siège, s'il en a une : le groupe constitué à la
 * distribution, pour la partie entière (R113). Les états d'avant la v3 ne
 * portent pas de fratries — la lecture n'y trouve jamais rien.
 */
export function fratrieDe(state: GameState, seat: number): Fratrie | null {
  return (state.fratries ?? []).find((groupe) => groupe.sieges.includes(seat)) ?? null;
}

/**
 * Le numéro du groupe de fratrie d'un siège — l'index dans `fratries` — pour
 * numéroter et trier les messages du canal : chaque groupe ne lit que le
 * sien (R114, D45). `null` pour qui n'y siège pas.
 */
export function groupeDe(state: GameState, seat: number): number | null {
  const groupe = (state.fratries ?? []).findIndex((fratrie) => fratrie.sieges.includes(seat));
  return groupe >= 0 ? groupe : null;
}

/**
 * La carte telle que la table la lit : le Villageois-Villageois se montre
 * « villageois » à tous — porteur compris, fidèle au recto-verso officiel.
 * Seule la fin de partie, où plus rien n'est caché (R77), dit `villageois2`
 * (R106, D31). La vue n'est pas seule à parler de cartes : l'annonce d'une
 * mort en porte une aussi, et doit dire la même chose.
 */
export function cartePublique(role: RoleId): RoleId {
  return role === 'villageois2' ? 'villageois' : role;
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
  /**
   * Le camp effectif du siège (R109) : `undefined` — absent de l'état — tant
   * qu'aucune transformation ne l'a écrit, et alors le camp d'origine tient.
   * Seuls le Chien-Loup rangé (R111) et l'Enfant Sauvage transformé (R112)
   * l'écrivent — plus tard l'Infectée et la Servante.
   */
  camp?: Camp | null;
}

/** Un message du fil de discussion. */
export type ChatChannel = 'village' | 'loups' | 'amoureux' | 'fratrie' | 'morts';

/**
 * Un groupe de fratrie, constitué à la distribution (R113) : les sièges qui se
 * connaissent, et le prochain numéro du canal — le canal fratrie se numérote
 * **par groupe**, jamais à deux : les Sœurs et les Frères, quand la table les
 * compte tous, ne voient ni les messages ni les trous l'un de l'autre (R114,
 * D45).
 */
export interface Fratrie {
  sieges: number[];
  /** Le prochain numéro de message du groupe, dense depuis 1. */
  next: number;
}

export interface ChatMessage {
  /**
   * Numéro du message, **compté par canal** : les trous d'une numérotation
   * globale raconteraient à chacun l'activité des canaux qu'il ne lit pas.
   * Dans le canal fratrie, chaque groupe tient le sien, posé au-delà d'un pas
   * qui sépare les groupes : dense pour qui le lit, muet pour les autres
   * (R78, R114, D45).
   */
  id: number;
  channel: ChatChannel;
  seat: number;
  text: string;
  /** Jour de la partie où le message a été écrit, pour le récapitulatif. */
  day: number;
  /**
   * Le numéro du groupe de fratrie, sur les seuls messages du canal fratrie :
   * la vue n'y garde que le groupe du lecteur — l'omniscient les voit tous
   * (R114, D45).
   */
  groupe?: number;
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
  /** Le centre du trio que le Renard flaire, ou `null` s'il ne sonde pas (R107). */
  renard: number | null;
  /** Le loup que le Loup Blanc dévore, une nuit paire (R97). */
  whiteKill: number | null;
  /**
   * Le camp où le Chien-Loup se range, la première nuit — `null` s'il n'a
   * pas choisi : il reste alors villageois, sans rien voir (R111, R81).
   * Commité au camp effectif à la clôture de l'étape principale.
   */
  chienLoup: 'village' | 'loups' | null;
  /**
   * Le modèle que l'Enfant Sauvage désigne, la première nuit — `null` s'il
   * n'a désigné personne : il ne se transformera jamais (R112, R81). Le
   * modèle, vivant, n'est jamais informé.
   */
  modele: number | null;
}

/** Ce qui doit se passer avant de reprendre le cours normal. */
export type Trigger =
  | { kind: 'chasseur'; seat: number }
  | { kind: 'succession'; seat: number }
  /** Le Bouc émissaire mort d'une égalité désigne les votants du lendemain (R94). */
  | { kind: 'bouc'; seat: number };

export type Phase =
  /**
   * Le Voleur, avant la révélation : il regarde ses deux cartes et en prend
   * une — obligé si ce sont deux loups — ou reste Voleur sans pouvoir. La
   * carte non choisie sort du jeu ; la clôture enchaîne la révélation
   * (R110, D44). `cartes` ne quitte jamais l'état : la vue ne dit que la
   * phase, le prompt ne va qu'au Voleur.
   */
  | { kind: 'voleur'; seat: number; cartes: [RoleId, RoleId] }
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
  /** Le trio que le Renard a flairé, et ce qu'il y a trouvé (R107). */
  | { day: number; type: 'renard'; centre: number; loups: boolean }
  /** La grogne du Montreur d'Ours à l'aube — le silence aussi dit quelque chose (R108). */
  | { day: number; type: 'ours'; seat: number; grogne: boolean }
  /** Le Bouc émissaire paie l'égalité du vote (R94). */
  | { day: number; type: 'bouc'; seat: number }
  /** Les votants désignés par le Bouc, ou `null` s'il s'est tu (R94). */
  | { day: number; type: 'votants'; seats: number[] | null }
  /** Le choix du Loup Blanc, une nuit paire : un loup, ou personne (R97). */
  | { day: number; type: 'loupBlanc'; target: number | null }
  /** La carte que le Voleur a prise — le récapitulatif seul la raconte (R110). */
  | { day: number; type: 'voleur'; carte: RoleId }
  /** Le camp où le Chien-Loup s'est rangé, la première nuit (R111). */
  | { day: number; type: 'chienLoup'; seat: number; camp: 'village' | 'loups' }
  /** Le modèle que l'Enfant Sauvage a désigné, la première nuit (R112). */
  | { day: number; type: 'modele'; seat: number; target: number }
  /** L'Enfant Sauvage devient un loup : son modèle est mort (R112, D33). */
  | { day: number; type: 'transformation'; seat: number };

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
  /**
   * Le Renard garde son flair : faux dès qu'un trio s'est révélé sans loup,
   * ou que la rancune de l'Ancien a frappé — perdu à vie (R107, R92). Vrai
   * par défaut : un état d'avant la v3, qui ne connaît pas de Renard, ne le
   * lit jamais.
   */
  renardPouvoir: boolean;
  /** Ce que le Renard a appris, trio après trio — à lui seul (R107). */
  renardSavoirs: { day: number; seats: number[]; loups: boolean }[];
  /**
   * Le modèle de l'Enfant Sauvage, désigné la première nuit — `null` sans
   * Enfant ou sans choix (R112). Sa mort transforme l'Enfant : le champ se
   * vide alors, une transformation n'arrive qu'une fois. Un secret : lui et
   * le récapitulatif de fin, personne d'autre (R87).
   */
  modele: number | null;
  /**
   * L'Enfant Sauvage transformé dont la meute n'a pas encore accueilli le
   * réveil : le camp est aux loups dès la mort du modèle (R109), mais vues
   * du pack, canal des loups et consigne `devorer` attendent le
   * `startNight` suivant, qui consomme le champ (R112, D33). `null` le
   * reste d'une partie sans transformation.
   */
  enfantReveil: number | null;
  /**
   * Les groupes de fratrie, constitués à la distribution : les sièges des
   * Deux Sœurs, puis ceux des Trois Frères — de zéro à deux groupes (R113).
   * Une connaissance statique : la mort n'y retire personne, seul le canal
   * se referme aux morts (R114). Chaque groupe numérote ses messages (D45).
   */
  fratries: Fratrie[];
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
  /** Le Renard flaire un trio de voisins — ou personne (R107). */
  | { type: 'flairer'; centre: number | null }
  /** Le Loup Blanc dévore un autre loup, ou personne (R97). */
  | { type: 'trahir'; target: number | null }
  /** Le Bouc émissaire mort désigne les votants du lendemain (R94). */
  | { type: 'designerVotants'; seats: number[] }
  /** Le Voleur prend une de ses deux cartes, ou s'abstient (R110). */
  | { type: 'voler'; carte: 0 | 1 | null }
  /** Le Chien-Loup se range, la première nuit — définitivement (R111). */
  | { type: 'seRanger'; camp: 'village' | 'loups' }
  /** L'Enfant Sauvage désigne son modèle, la première nuit (R112). */
  | { type: 'designerModele'; target: number }
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
  'flairer',
  'trahir',
  'designerVotants',
  'voler',
  'seRanger',
  'designerModele',
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
  /**
   * À l'aube, chaque Montreur d'Ours vivant : son ourson gronde si un loup
   * est l'un de ses voisins vivants — et le silence `grogne: false` est une
   * information comme une autre (R108).
   */
  | { type: 'ours'; seat: number; grogne: boolean }
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
