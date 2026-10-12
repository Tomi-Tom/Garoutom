/**
 * Le registre des skins — la brique D6 du client.
 *
 * Le moteur ne connaît que des mécaniques : il rend des identifiants stables
 * (`RoleId`, `DeathCause`, `ChatChannel`…) qui « ne s'affichent jamais tels
 * quels, le skin les traduit » (`types.ts`). Ce module est l'autre moitié du
 * contrat (`docs/SKINS.md`) : il garde la liste des univers connus du client,
 * il refuse un skin incomplet d'une erreur qui nomme le manque — plutôt que de
 * laisser un identifiant brut atteindre l'écran —, et il fait tomber un
 * identifiant inconnu, venu du réseau, sur le skin par défaut (R12) : une
 * partie n'a pas à s'arrêter pour un habit absent.
 *
 * La forme des textes suit `docs/SKINS.md`, section 5 : un objet par skin, les
 * clés qui nomment une mécanique reprennent l'identifiant du moteur, les clés
 * éditoriales sont libres. Les `Record` du type `Skin` font de la complétude
 * une exigence de compilation — un `RoleId` nouveau dans le moteur casse le
 * build de chaque skin jusqu'à ce qu'il soit traduit — ; la validation à
 * l'enregistrement, elle, rattrape ce qu'un objet défiguré en coulisses
 * pourrait faire passer au type. Le registre préfère l'erreur explicite au
 * repli honteux (règle d'or n° 1 de SKINS.md).
 */

import {
  CHAT_CHANNELS,
  DEATH_CAUSES as CAUSES_DU_MOTEUR,
  ROLES,
  type ChatChannel,
  type Camp,
  type DeathCause,
  type GameEvent,
  type LogEntry,
  type NightStep,
  type Prompt,
  type RoleId,
  type Winner,
} from '@garoutom/engine';

import { shiganshina } from './shiganshina.js';
import { thiercelieux } from './thiercelieux.js';

/* ------------------------------------------------------------------ */
/* Les listes que le moteur ne rend pas                                */
/* ------------------------------------------------------------------ */

/*
  `DeathCause`, `Winner`, `Camp` et `ChatChannel` sont des unions. Le registre
  parcourt leurs membres — pour valider un skin à son enregistrement, pour le
  tester. Depuis D18 et D23, le moteur rend lui-même deux de ces listes, parce
  qu'il les parcourt aussi : les causes de mort (`DEATH_CAUSES`, `abandon`
  compris) et les canaux (`CHAT_CHANNELS`, que `parseAction` énumère). Les deux
  autres sont tenues à la main, en regard de `packages/engine/src/types.ts` ;
  le jour où le moteur gagne un membre, les `Record` du type `Skin` refusent
  de compiler bien avant que ces listes ne prennent du retard, et les
  assertions ci-dessous verrouillent la cohérence pour de bon.
*/
export const DEATH_CAUSES = CAUSES_DU_MOTEUR;
export const VAINQUEURS = ['village', 'loups', 'amoureux', 'loupBlanc', 'personne'] as const;
export const CAMPS = ['village', 'loups'] as const;
export const CANAUX = CHAT_CHANNELS;

/** `true` quand rien de `Attendu` manque à `Fourni` ; `never` sinon — et l'assertion casse. */
type Couvre<Attendu, Fourni> = [Exclude<Attendu, Fourni>] extends [never] ? true : never;

const causesCouvertes = true as Couvre<DeathCause, (typeof DEATH_CAUSES)[number]>;
const vainqueursCouverts = true as Couvre<Winner, (typeof VAINQUEURS)[number]>;
const campsCouverts = true as Couvre<Camp, (typeof CAMPS)[number]>;
const canauxCouverts = true as Couvre<ChatChannel, (typeof CANAUX)[number]>;

/* ------------------------------------------------------------------ */
/* La table de textes d'un univers                                     */
/* ------------------------------------------------------------------ */

/** Un rôle, dans la voix d'un univers : le nom affiché et le texte de sa carte. */
export interface TexteRole {
  nom: string;
  description: string;
}

/** Une composition suggérée, nommée par le skin (R23 : le moteur rend, le skin nomme). */
export interface Suggestion {
  nom: string;
  note: string;
}

/** Une phrase par changement de phase — la nuit se subdivise par étape. */
export interface PhrasesPhases {
  revelation: string;
  nuit: Record<NightStep, string>;
  chasseur: string;
  succession: string;
  /** Le Bouc émissaire mort désigne les votants du lendemain (R94). */
  bouc: string;
  election: string;
  jour: string;
  fin: string;
}

/**
 * Les consignes d'action, une par `Prompt` du moteur, avec leurs variantes —
 * elles existent parce que le moteur les rend, pas par goût (SKINS.md, « Les
 * prompts »).
 */
export interface TextesPrompts {
  pret: string;
  cupidon: string;
  proteger: { base: string; interdit: string };
  sonder: string;
  devorer: string;
  sorciere: { victime: string; sansVictime: string; soiMemeInterdit: string };
  tirer: string;
  successeur: string;
  voter: { election: string; jour: string };
  /** Le Corbeau (R93). */
  marquer: string;
  /** Le Loup Blanc, une nuit paire (R97). */
  trahir: string;
  /** Le Bouc émissaire mort (R94). */
  designerVotants: string;
}

/** Les lignes de la nuit racontée (R88) — une phrase par type de `LogEntry`. */
export interface LignesRecit {
  amoureux: string;
  protection: string;
  voyance: string;
  loups: { cible: string; personne: string };
  sauvetage: string;
  poison: string;
  grace: string;
  capitaine: string;
  tir: { cible: string; personne: string };
  vote: { condamne: string; personne: string };
  /** L'Ancien a encaissé la meute (R91). */
  resistance: string;
  /** L'Ancien tué par le village : les pouvoirs s'éteignent (R92). */
  rancune: string;
  /** La marque du Corbeau (R93). */
  corbeau: string;
  /** L'égalité retombée sur le Bouc émissaire (R94). */
  bouc: string;
  /** Les votants désignés par le Bouc — `{noms}` —, ou son silence (R94). */
  votants: { designes: string; personne: string };
  /** Le Loup Blanc, une nuit paire : un loup dévoré, ou la meute épargnée (R97). */
  loupBlanc: { cible: string; personne: string };
}

/**
 * Les quinze planches plein écran qui portent une légende du graveur (SPEC
 * § 6.4) — le graveur légende les planches, pas les commandes. Clés en
 * français sans accents ; l'ordre est celui du tableau du SPEC.
 */
export const CLES_LEGENDE_ECRAN = [
  'accueil',
  'salon',
  'revelation',
  'nuitDormeur',
  'mort',
  'aubeMorts',
  'aubePaisible',
  'election',
  'vote',
  'depouillement',
  'chasseurAttente',
  'succession',
  'boucDernierMot',
  'fin',
  'tableDisparue',
] as const;
export type CleLegendeEcran = (typeof CLES_LEGENDE_ECRAN)[number];

/**
 * Les dix-neuf légendes de la nuit racontée (SPEC § 6.4) : une planche prend
 * la légende du premier évènement présent, dans l'ordre de priorité ci-dessous
 * (les 18 premières), puis `derniere` pour la planche finale.
 */
export const CLES_LEGENDE_RECIT = [
  'loupBlanc',
  'rancune',
  'poison',
  'tir',
  'chagrin',
  'grace',
  'bouc',
  'voteMeute',
  'voteVillage',
  'sauvetage',
  'loups',
  'resistance',
  'protection',
  'corbeau',
  'voyance',
  'amoureux',
  'nuitDefaut',
  'jourDefaut',
  'derniere',
] as const;
export type CleLegendeRecit = (typeof CLES_LEGENDE_RECIT)[number];

/** Le nombre de couvre-chefs, un par siège (SPEC § 5.1.2). */
export const NB_COUVRE_CHEFS = 18;

/**
 * Les légendes du graveur : une par rôle, par planche plein écran, par
 * planche du récit. Jamais un modèle de phrase — une légende ne nomme jamais
 * un pseudo, elle s'accorde au rôle ou à personne (règle de plume n° 2).
 */
export interface Legendes {
  roles: Record<RoleId, string>;
  ecrans: Record<CleLegendeEcran, string>;
  recit: Record<CleLegendeRecit, string>;
}

/** Le récit de fin de partie : deux titres de bloc, une phrase par ligne de log. */
export interface TextesRecit {
  nuit: string;
  jour: string;
  lignes: LignesRecit;
}

/** Toutes les phrases du narrateur — il ne dit jamais que ce que l'évènement dit (R87). */
export interface Narrateur {
  debut: string;
  phases: PhrasesPhases;
  /** Une phrase par cause de mort ; `{nom}` vaut le pseudo du mort. */
  morts: Record<DeathCause, string>;
  /** Le suffixe quand la carte d'un mort se retourne : « — c'était {role}. » */
  roleRevele: string;
  aubePaisible: string;
  grace: string;
  vote: { condamne: string; personne: string };
  capitaine: { elu: string; successeur: string };
  tir: { atteint: string; enLair: string };
  /** L'Ancien tué par le village : sa carte se retourne, les pouvoirs s'éteignent (R92). */
  rancune: string;
  /** La marque du Corbeau, à l'aube — jamais la main qui l'a posée (R93). */
  corbeau: string;
  /** L'égalité retombe sur le Bouc émissaire (R94). */
  bouc: string;
  /** Le dernier mot du Bouc : `{noms}` désignés, ou le silence (R94). */
  votants: { designes: string; personne: string };
  /** Le verdict de fin de partie, un par issue. */
  fin: Record<Winner, string>;
}

/*
  Trois garde-fous de plus, côté compilation : chaque `Prompt` du moteur doit
  avoir sa consigne, chaque ligne de `LogEntry` sa phrase — la ligne `mort`
  exceptée, qui reprend la phrase de sa cause (SKINS.md, « la nuit racontée »)
  —, et chaque `GameEvent` sa clé dans le narrateur, même quand la nôtre
  change de nom (« aube-paisible » devient `aubePaisible`).
*/
const promptsCouverts = true as Couvre<Prompt['kind'], keyof TextesPrompts>;
const recitCouvert = true as Couvre<Exclude<LogEntry['type'], 'mort'>, keyof LignesRecit>;

/** La clé du narrateur qui répond à chaque évènement du moteur. */
type CleDEvenement = {
  debut: 'debut';
  phase: 'phases';
  morts: 'morts';
  'aube-paisible': 'aubePaisible';
  grace: 'grace';
  vote: 'vote';
  capitaine: 'capitaine';
  tir: 'tir';
  rancune: 'rancune';
  corbeau: 'corbeau';
  bouc: 'bouc';
  votants: 'votants';
  fin: 'fin';
};
const evenementsCouverts = true as Couvre<GameEvent['type'], keyof CleDEvenement>;
const clesDuNarrateurCouvertes = true as Couvre<CleDEvenement[GameEvent['type']], keyof Narrateur>;

/**
 * Un univers en entier : l'identifiant, le nom, et la table de textes
 * (SKINS.md, section 1 — « ce que le skin fournit »). L'habit visuel et
 * sonore — palette, polices, symboles, atelier — viendra se poser à côté,
 * dans son propre dossier ; la v1 du registre est de la voix.
 */
export interface Skin {
  /** L'identifiant de l'option `skin` : `[a-z0-9-]{1,32}`, transporté sans être lu par le moteur. */
  id: string;
  /** Le nom d'univers, affiché au salon et dans la fiche de la partie. */
  univers: string;
  /** La charge du capitaine — pas un `RoleId`, mais un mot que l'écran affiche. */
  charge: string;
  /**
   * Le mot qui compte les loups dans la composition publique : « 2 loups » à
   * Thiercelieux, « 2 Titans » à Shiganshina. Clé éditoriale — la composition
   * est publique, et c'est le skin qui la dit.
   */
  plurielLoups: { un: string; plusieurs: string };
  /**
   * Le libellé d'un joueur montré absent — sa place gardée, lui loin (D17,
   * `PlayerInfo.absent`). Un lieu ou un état, jamais un adjectif accordé :
   * rien ne s'accorde avec un pseudo (règle de plume n° 1).
   */
  absent: string;
  /** Tous les rôles du moteur — les huit de la v1, les cinq optionnels de la v2 —, nom affiché et description de carte. */
  roles: Record<RoleId, TexteRole>;
  /** Le nom de chaque camp. */
  camps: Record<Camp, string>;
  /** Le nom court de chaque issue — « la meute », « les amoureux ». */
  vainqueurs: Record<Winner, string>;
  narrateur: Narrateur;
  prompts: TextesPrompts;
  /** Le libellé de chaque canal ; la teinte, elle, est affaire de matière (D11). */
  canaux: Record<ChatChannel, string>;
  /** Les compositions suggérées, par position : la référence, la chasse, le village outillé. */
  suggestions: readonly [Suggestion, Suggestion, Suggestion];
  recit: TextesRecit;
  /** Les légendes du graveur (SPEC § 6) : 13 rôles, 15 écrans, 19 planches du récit. */
  legendes: Legendes;
  /**
   * Les 18 couvre-chefs, par numéro de siège (SPEC § 5.1.2) : le skin les
   * nomme, l'atelier les dessine. Sans rapport avec le rôle.
   */
  couvreChefs: readonly string[];
}

/* ------------------------------------------------------------------ */
/* La voix promise aux écrans                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce que tout écran peut demander à un skin, quelle que soit la pièce.
 *
 * Les huit premières méthodes sont le contrat que la table et les autres
 * écrans importent : ces noms sont gelés — on peut enrichir au-delà, jamais
 * retirer ni renommer. Les suivantes sont de l'embellissement au même
 * étalage : qui n'en veut pas n'a qu'à ne pas les appeler.
 */
export interface Voix {
  nomRole(role: RoleId): string;
  descriptionRole(role: RoleId): string;
  nomCamp(camp: Camp): string;
  nomVainqueur(winner: Winner): string;
  /**
   * La phrase d'annonce d'une mort. Le rôle du mort, quand la table choisit
   * de le révéler, ajoute son suffixe — « — c'était la Voyante. » ; sinon, la
   * carte reste face contre table et le narrateur n'insiste pas.
   */
  phraseMort(cause: DeathCause, name: string, role?: RoleId | null): string;
  libelleCanal(canal: ChatChannel): string;
  phraseAubePaisible(): string;
  /**
   * La phrase de la nuit qui tombe. Le numéro ne passe pas dans la phrase :
   * les compteurs sont l'affaire de l'écran, pas du narrateur (règle de plume
   * n° 3 de SKINS.md) — il reste à la signature, un skin plus bavard pourrait
   * s'en servir.
   */
  phraseNuitQuiTombe(numero: number): string;
  /* --- Au-delà du contrat gelé --- */
  /** Le nom d'univers, pour le salon et la fiche de la partie. */
  nomUnivers(): string;
  /** Le verdict de fin de partie, phrase entière. */
  phraseFin(winner: Winner): string;
  /** La composition publique commence par le compte des loups : « 2 loups », « 2 Titans ». */
  compteLoups(nombre: number): string;
  /** Le mot nu qui nomme les loups — « loups », « Titans » — pour composer les libellés, sans article ni phrase. */
  motLoups(): string;
  /** Le libellé d'un joueur absent, sa place gardée (D17) — « loin de la place ». */
  libelleAbsent(): string;
  /** La légende du graveur d'un rôle — « Rien vu, rien entendu, tout compris. » Jamais un pseudo. */
  legendeRole(role: RoleId): string;
  /** La légende d'une planche plein écran. */
  legendeEcran(cle: CleLegendeEcran): string;
  /** La légende d'une planche de la nuit racontée. */
  legendeRecit(cle: CleLegendeRecit): string;
  /** Le couvre-chef d'un siège : numéro de siège de 1 à 18, repris en boucle au-delà. */
  nomCouvreChef(numero: number): string;
}

/**
 * Les modèles de phrase portent leurs variables entre accolades — `{nom}`,
 * `{victime}`, `{role}`, `{noms}` (une liste de pseudos, celle des votants
 * désignés par le Bouc)… — et jamais une accolade ne s'affiche : le client
 * résout chaque modèle avec ce qu'il sait, les pseudos de la session comme les
 * noms de rôles du skin lui-même (SKINS.md, « Les variables »).
 */
export function resoudre(phrase: string, variables: Record<string, string>): string {
  let texte = phrase;
  for (const [cle, valeur] of Object.entries(variables)) {
    texte = texte.replaceAll(`{${cle}}`, valeur);
  }
  return texte;
}

/* ------------------------------------------------------------------ */
/* Le registre                                                         */
/* ------------------------------------------------------------------ */

/** La forme d'un identifiant de skin, celle même que le moteur valide (R12). */
const MOTIF_ID = /^[a-z0-9-]{1,32}$/;

/** Un texte est là quand il existe et dit quelque chose. */
function ditQuelqueChose(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim().length > 0;
}

/**
 * Enregistre un skin — ou refuse de le faire.
 *
 * La complétude est d'abord une affaire de types ; reste ce que le
 * compilateur ne peut pas voir — un objet défiguré, une chaîne vide — et qui
 * ne doit jamais atteindre l'écran sous forme d'identifiant brut. Le manque
 * est dit en toutes lettres, à l'enregistrement donc au chargement du
 * module : un skin incomplet casse les tests et le build, pas une partie en
 * cours. Le seul socle vérifié ici est celui que le registre promet : les
 * rôles, les causes de mort, les canaux, les camps et les issues — le reste
 * est garanti par les `Record` du type.
 */
export function enregistrerSkin(skin: Skin): void {
  const manques: string[] = [];

  if (!MOTIF_ID.test(skin.id)) manques.push(`l'identifiant « ${skin.id} » n'a pas la forme d'un skin`);
  if (!ditQuelqueChose(skin.univers)) manques.push("l'univers n'a pas de nom");
  if (!ditQuelqueChose(skin.absent)) manques.push("l'absent n'a pas de libellé");

  for (const role of ROLES) {
    const carte = skin.roles[role] as TexteRole | undefined;
    if (!ditQuelqueChose(carte?.nom)) manques.push(`le rôle « ${role} » n'a pas de nom`);
    else if (!ditQuelqueChose(carte?.description)) {
      manques.push(`le rôle « ${role} » n'a pas de description de carte`);
    }
  }
  for (const cause of DEATH_CAUSES) {
    const phrase = skin.narrateur.morts[cause] as string | undefined;
    if (!ditQuelqueChose(phrase)) manques.push(`la cause de mort « ${cause} » n'a pas de phrase`);
  }
  for (const role of ROLES) {
    const legende = skin.legendes?.roles?.[role] as string | undefined;
    if (!ditQuelqueChose(legende)) manques.push(`le rôle « ${role} » n'a pas de légende`);
  }
  for (const cle of CLES_LEGENDE_ECRAN) {
    const legende = skin.legendes?.ecrans?.[cle] as string | undefined;
    if (!ditQuelqueChose(legende)) manques.push(`l'écran « ${cle} » n'a pas de légende`);
  }
  for (const cle of CLES_LEGENDE_RECIT) {
    const legende = skin.legendes?.recit?.[cle] as string | undefined;
    if (!ditQuelqueChose(legende)) manques.push(`la planche du récit « ${cle} » n'a pas de légende`);
  }
  if (!Array.isArray(skin.couvreChefs) || skin.couvreChefs.length !== NB_COUVRE_CHEFS) {
    manques.push(`il faut ${String(NB_COUVRE_CHEFS)} couvre-chefs`);
  } else {
    skin.couvreChefs.forEach((nom, i) => {
      if (!ditQuelqueChose(nom)) manques.push(`le couvre-chef n° ${String(i + 1)} n'a pas de nom`);
    });
  }
  for (const canal of CANAUX) {
    const libelle = skin.canaux[canal] as string | undefined;
    if (!ditQuelqueChose(libelle)) manques.push(`le canal « ${canal} » n'a pas de libellé`);
  }
  for (const camp of CAMPS) {
    const nom = skin.camps[camp] as string | undefined;
    if (!ditQuelqueChose(nom)) manques.push(`le camp « ${camp} » n'a pas de nom`);
  }
  for (const issue of VAINQUEURS) {
    const nom = skin.vainqueurs[issue] as string | undefined;
    if (!ditQuelqueChose(nom)) manques.push(`l'issue « ${issue} » n'a pas de nom`);
  }

  if (manques.length > 0) {
    throw new Error(`Le skin « ${skin.id} » est incomplet : ${manques.join(' ; ')}.`);
  }
  skins.set(skin.id, skin);
}

const skins = new Map<string, Skin>();

// Les univers connus du client. L'ordre d'enregistrement est l'ordre du
// sélecteur du salon : le défaut se tient toujours le premier.
enregistrerSkin(thiercelieux);
enregistrerSkin(shiganshina);

/** Les skins enregistrés, dans l'ordre où le salon les propose. */
export const SKINS: readonly Skin[] = [...skins.values()];

/**
 * La peau d'un skin connu — ou celle de Thiercelieux.
 *
 * Un identifiant inconnu, même farfelu, ne lève rien : il peut venir du
 * réseau, et la règle d'or n° 4 veut qu'une partie dont l'habit manque habite
 * Thiercelieux, silencieusement, sans bannière d'erreur.
 */
export function peauDuSkin(id: string): Skin {
  return skins.get(id) ?? thiercelieux;
}

/** La voix d'une peau, sous la forme promise aux écrans. */
function voixDe(skin: Skin): Voix {
  return {
    nomRole: (role) => skin.roles[role].nom,
    descriptionRole: (role) => skin.roles[role].description,
    nomCamp: (camp) => skin.camps[camp],
    nomVainqueur: (winner) => skin.vainqueurs[winner],
    phraseMort: (cause, name, role = null) => {
      const phrase = resoudre(skin.narrateur.morts[cause], { nom: name });
      // Le rôle révélé ajoute son suffixe ; un rôle muet n'ajoute rien — le
      // silence n'est pas un mensonge, la carte reste face contre table.
      if (role === null) return phrase;
      return `${phrase} ${resoudre(skin.narrateur.roleRevele, { role: skin.roles[role].nom })}`;
    },
    libelleCanal: (canal) => skin.canaux[canal],
    phraseAubePaisible: () => skin.narrateur.aubePaisible,
    phraseNuitQuiTombe: (numero) => {
      // Le numéro reste hors de la phrase (règle de plume n° 3) : le narrateur
      // dit « la nuit tombe », l'écran dit « nuit 3 ».
      void numero;
      return skin.narrateur.phases.nuit.principale;
    },
    nomUnivers: () => skin.univers,
    phraseFin: (winner) => skin.narrateur.fin[winner],
    compteLoups: (nombre) =>
      `${String(nombre)} ${nombre > 1 ? skin.plurielLoups.plusieurs : skin.plurielLoups.un}`,
    motLoups: () => skin.plurielLoups.plusieurs,
    libelleAbsent: () => skin.absent,
    legendeRole: (role) => skin.legendes.roles[role],
    legendeEcran: (cle) => skin.legendes.ecrans[cle],
    legendeRecit: (cle) => skin.legendes.recit[cle],
    nomCouvreChef: (numero) => {
      // Le siège 1 porte le premier couvre-chef ; au-delà de 18, on reprend.
      const n = skin.couvreChefs.length;
      return skin.couvreChefs[(((Math.trunc(numero) - 1) % n) + n) % n] as string;
    },
  };
}

/** La voix du skin réglé — le contrat que les écrans importent. */
export function voixDuSkin(id: string): Voix {
  return voixDe(peauDuSkin(id));
}
