/**
 * Options de partie et composition des rôles.
 *
 * Tout ce qui arrive ici vient du réseau : `sanitizeOptions` ne fait confiance à
 * rien et rend toujours des options jouables, quitte à revenir aux défauts.
 */

import {
  CHOOSABLE_ROLES,
  IllegalActionError,
  OPTIONAL_ROLES,
  SPECIAL_ROLES,
  type ChoosableRoleId,
  type GameOptions,
  type OptionalRoleId,
  type OptionalRoleIdV3,
  type RoleId,
  type Rng,
  type SpecialRoleId,
} from './types.js';

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 18;

export const DEFAULT_OPTIONS: GameOptions = {
  auto: true,
  loups: 2,
  roles: ['voyante', 'sorciere'],
  capitaine: true,
  capitaineAvantNuit1: false,
  chasseurEmpoisonne: false,
  sorciereSeSauve: true,
  ancienRancunier: true,
  chat: true,
  revelerRoles: true,
  mortsVoientTout: true,
  abandon: true,
  tempsNuit: 40,
  tempsJour: 240,
  skin: 'thiercelieux',
};

/** Bornes des minuteries, en secondes. */
export const NIGHT_SECONDS = { min: 15, max: 120 } as const;
export const DAY_SECONDS = { min: 60, max: 900 } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

/**
 * Un entier dans la borne, ou le défaut — jamais la borne la plus proche
 * (R10 : une valeur hors borne retombe sur le défaut, sans discussion).
 * Ramener 500 s à 120 s ferait dire au sanitizeur un réglage que personne
 * n'a choisi ; le défaut, lui, est un choix connu de la table.
 */
function fallbackInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  const entier = Math.round(raw);
  return entier >= min && entier <= max ? entier : fallback;
}

/** Un identifiant de skin plausible. Le client retombe sur le défaut s'il ne le connaît pas. */
function skinId(raw: unknown): string {
  return typeof raw === 'string' && /^[a-z0-9-]{1,32}$/.test(raw) ? raw : DEFAULT_OPTIONS.skin;
}

export function sanitizeOptions(raw: unknown): GameOptions {
  const input = isRecord(raw) ? raw : {};
  // Les rôles connus, dans l'ordre du moteur, un de chaque : les spéciaux
  // d'abord, les optionnels ensuite (R90) — le reste est jeté sans bruit.
  const roles = Array.isArray(input.roles)
    ? CHOOSABLE_ROLES.filter((role) => (input.roles as unknown[]).includes(role))
    : DEFAULT_OPTIONS.roles;
  return {
    auto: bool(input.auto, DEFAULT_OPTIONS.auto),
    loups: fallbackInt(input.loups, 1, Math.floor((MAX_PLAYERS - 1) / 2), DEFAULT_OPTIONS.loups),
    roles,
    capitaine: bool(input.capitaine, DEFAULT_OPTIONS.capitaine),
    capitaineAvantNuit1: bool(input.capitaineAvantNuit1, DEFAULT_OPTIONS.capitaineAvantNuit1),
    chasseurEmpoisonne: bool(input.chasseurEmpoisonne, DEFAULT_OPTIONS.chasseurEmpoisonne),
    sorciereSeSauve: bool(input.sorciereSeSauve, DEFAULT_OPTIONS.sorciereSeSauve),
    ancienRancunier: bool(input.ancienRancunier, DEFAULT_OPTIONS.ancienRancunier),
    chat: bool(input.chat, DEFAULT_OPTIONS.chat),
    revelerRoles: bool(input.revelerRoles, DEFAULT_OPTIONS.revelerRoles),
    mortsVoientTout: bool(input.mortsVoientTout, DEFAULT_OPTIONS.mortsVoientTout),
    abandon: bool(input.abandon, DEFAULT_OPTIONS.abandon),
    tempsNuit: fallbackInt(
      input.tempsNuit,
      NIGHT_SECONDS.min,
      NIGHT_SECONDS.max,
      DEFAULT_OPTIONS.tempsNuit,
    ),
    tempsJour: fallbackInt(
      input.tempsJour,
      DAY_SECONDS.min,
      DAY_SECONDS.max,
      DEFAULT_OPTIONS.tempsJour,
    ),
    skin: skinId(input.skin),
  };
}

/**
 * À combien de joueurs chaque rôle spécial entre dans la composition de
 * référence (`docs/refs/roles.md`). Une seule table pour la référence, le
 * générateur et les suggestions : un seuil déplacé ici se déplace partout.
 */
const SEUILS: Record<SpecialRoleId, number> = {
  voyante: MIN_PLAYERS,
  sorciere: MIN_PLAYERS,
  chasseur: 8,
  cupidon: 10,
  salvateur: 11,
  idiot: 12,
};

/**
 * À combien de joueurs chaque rôle optionnel est cochable.
 *
 * Pour ceux de la v2, c'est la borne du générateur aléatoire (R100) — la
 * référence ne les tire jamais (R90) ; l'hôte, lui, les coche à toute table,
 * dans les seules bornes de R13. Dix joueurs pour les rôles de village : en
 * dessous, chaque carte spéciale de plus retire un des derniers villageois
 * simples. Douze pour le Loup Blanc : il lui faut une meute à trahir — trois
 * loups à la référence — et assez de monde pour que sa solitude soit un vrai
 * chemin.
 *
 * Ceux de la v3 ne sortent jamais du générateur, même sur demande (D26) :
 * leur seuil ne sert qu'au salon. Rien dans les trois premiers ne réclame
 * une grande table — le Renard veut un trio autour de son centre et l'Ours
 * deux voisins, qu'une table de six donne déjà ; le Villageois-Villageois
 * n'est qu'une carte. Le plancher de la table leur suffit. La deuxième vague
 * suit la même pente — le Voleur, le Chien-Loup et l'Enfant Sauvage jouent
 * dès six (la borne de R13 fait le reste, Chien-Loup compté loup, D32) —
 * sauf les fratries : Sœurs dès dix, Frères dès douze, comme les villageois
 * outillés de la v2 (R113).
 */
export const OPTIONAL_ROLE_MIN_PLAYERS: Readonly<Record<OptionalRoleId | OptionalRoleIdV3, number>> = {
  ancien: 10,
  corbeau: 10,
  bouc: 10,
  petiteFille: 10,
  loupBlanc: 12,
  villageois2: MIN_PLAYERS,
  renard: MIN_PLAYERS,
  ours: MIN_PLAYERS,
  voleur: MIN_PLAYERS,
  chienLoup: MIN_PLAYERS,
  enfantSauvage: MIN_PLAYERS,
  // Les fratries veulent du monde autour : deux — puis trois — cartes liées,
  // et un canal qui ne dit rien à qui ne le lit pas (R113).
  soeurs: 10,
  freres: 12,
};

/**
 * Combien de loups porte une composition : la meute, Loup Blanc compris
 * (R13, R96) — et le Chien-Loup avec, dès le salon : l'hôte ne sait pas de
 * quel côté il tombera, la borne se compte au pire (R111, D32).
 */
export function wolvesIn(loups: number, roles: readonly ChoosableRoleId[]): number {
  return loups + (roles.includes('loupBlanc') ? 1 : 0) + (roles.includes('chienLoup') ? 1 : 0);
}

/**
 * La composition de référence, selon le nombre de joueurs (R20).
 *
 * Un loup pour trois à quatre joueurs ; les rôles d'information d'abord,
 * ceux qui compliquent la partie ensuite. Cupidon n'entre qu'à dix joueurs,
 * le Salvateur à onze : avant, il ne restait que deux villageois simples,
 * et les nuits devenaient infranchissables pour les loups.
 */
export function autoComposition(players: number): { loups: number; roles: SpecialRoleId[] } {
  const loups = players <= 8 ? 2 : players <= 12 ? 3 : players <= 16 ? 4 : 5;
  return { loups, roles: SPECIAL_ROLES.filter((role) => players >= SEUILS[role]) };
}

/**
 * La composition du générateur aléatoire (R22) : du hasard dans des bornes
 * cohérentes, jamais une table jouée d'avance.
 *
 * Les loups restent à ±1 de la référence — et jamais moins de deux : un
 * canal secret d'une personne n'est pas un canal. La Voyante et la Sorcière
 * sont toujours là : sans information, le village vote au doigt mouillé. Le
 * reste se tire au sort parmi les rôles éligibles, et il reste toujours au
 * moins deux villageois simples.
 *
 * Avec `{ optionnels: true }`, le tirage continue sur les rôles de la v2
 * (R100) : rien sous dix joueurs, un au plus jusqu'à treize, deux au plus
 * ensuite — toujours deux villageois simples, toujours dans la borne de R13,
 * Loup Blanc compté parmi les loups. Les premiers tirages sont exactement
 * ceux du générateur par défaut : la même graine rend la même base.
 */
export function randomComposition(
  players: number,
  rng: Rng,
): { loups: number; roles: SpecialRoleId[] };
export function randomComposition(
  players: number,
  rng: Rng,
  reglages: { optionnels: boolean },
): { loups: number; roles: ChoosableRoleId[] };
export function randomComposition(
  players: number,
  rng: Rng,
  reglages: { optionnels: boolean } = { optionnels: false },
): { loups: number; roles: ChoosableRoleId[] } {
  const base = baseComposition(players, rng);
  if (!reglages.optionnels || players < 10) return base;

  const roles: ChoosableRoleId[] = [...base.roles];
  const plafond = players >= 14 ? 2 : 1;
  const voulus = rng.nextInt(plafond + 1);
  const urne: OptionalRoleId[] = OPTIONAL_ROLES.filter(
    (role) => players >= OPTIONAL_ROLE_MIN_PLAYERS[role],
  );
  for (let tire = 0; tire < voulus && urne.length > 0; tire += 1) {
    const [role] = urne.splice(rng.nextInt(urne.length), 1);
    if (role === undefined) break;
    const candidats = [...roles, role];
    // Deux villageois simples, toujours ; et jamais autant de loups que
    // d'autres joueurs, le Loup Blanc compté dans la meute (R13).
    if (base.loups + candidats.length > players - 2) break;
    if (wolvesIn(base.loups, candidats) * 2 >= players) continue;
    roles.push(role);
  }
  return { loups: base.loups, roles };
}

/** Le tirage de R22, tel quel : les loups, puis les rôles spéciaux éligibles. */
function baseComposition(players: number, rng: Rng): { loups: number; roles: SpecialRoleId[] } {
  const reference = autoComposition(players);
  const loupsMin = Math.max(2, reference.loups - 1);
  const loupsMax = Math.min(reference.loups + 1, Math.floor((players - 1) / 2));
  const loups = loupsMin + rng.nextInt(Math.max(1, loupsMax - loupsMin + 1));

  const roles: SpecialRoleId[] = ['voyante', 'sorciere'];
  const eligibles = SPECIAL_ROLES.filter(
    (role) => role !== 'voyante' && role !== 'sorciere' && players >= SEUILS[role],
  );
  for (const role of eligibles) {
    if (loups + roles.length + 1 > players - 2) break;
    if (rng.nextInt(2) === 0) roles.push(role);
  }
  return { loups, roles };
}

/**
 * Les compositions suggérées à l'hôte (R23), du nombre de joueurs à la
 * table : la référence, une chasse, un village outillé.
 *
 * Le moteur fournit les compositions ; le skin les nomme et les raconte.
 */
export function suggestionsFor(players: number): { loups: number; roles: SpecialRoleId[] }[] {
  const reference = autoComposition(players);
  const chasse = Math.min(reference.loups + 1, Math.floor((players - 1) / 2));
  const outille = SPECIAL_ROLES.filter((role) => players >= SEUILS[role]);
  const suggestions = [
    reference,
    { loups: chasse, roles: reference.roles },
    { loups: reference.loups, roles: outille },
  ];
  // Une suggestion injouable n'a pas à exister : les bornes de R13 tranchent.
  return suggestions.filter((s) => s.loups + s.roles.length <= players - 1);
}

/**
 * Combien de cartes porte un id coché : les fratries seules portent leur
 * multiplicité — l'hôte coche une fois, la composition en distribue deux ou
 * trois (R4, R113). Tout le reste en vaut une.
 */
const MULTIPLICITE: Partial<Record<ChoosableRoleId, number>> = {
  soeurs: 2,
  freres: 3,
};

/** Les loups et rôles qui seront distribués, avant mélange. */
export function compositionFor(players: number, options: GameOptions): RoleId[] {
  if (players < MIN_PLAYERS || players > MAX_PLAYERS) {
    throw new IllegalActionError(
      `Il faut entre ${String(MIN_PLAYERS)} et ${String(MAX_PLAYERS)} joueurs`,
      'players',
    );
  }
  const { loups, roles } = options.auto ? autoComposition(players) : options;
  if (loups < 1) throw new IllegalActionError('Il faut au moins un loup', 'composition');
  // R4 : un rôle spécial n'existe qu'en un exemplaire. Le sanitizeur ne peut
  // pas produire de doublon, mais un options fabriqué à la main peut : le
  // moteur refuse de distribuer deux Voyantes plutôt que de le cacher. Les
  // fratries, seules, y échappent : leur multiplicité vient de la carte, pas
  // du nombre de cochages — un doublon s'y fond en une seule cochée.
  const autres = roles.filter((role) => !(role in MULTIPLICITE));
  if (new Set(autres).size !== autres.length) {
    throw new IllegalActionError(
      "Un rôle spécial n'existe qu'en un exemplaire",
      'composition',
    );
  }
  // La composition développe chaque id coché en ses cartes : deux Sœurs,
  // trois Frères, une de tout le reste (R113).
  const cartes: RoleId[] = [...new Set(roles)].flatMap((role) =>
    Array.from({ length: MULTIPLICITE[role] ?? 1 }, () => role as RoleId),
  );
  // Autant de loups que d'autres, et le premier vote est déjà joué d'avance.
  // Le Loup Blanc chasse avec la meute : il compte parmi les loups (R96) ; le
  // Chien-Loup aussi, au pire (D32).
  if (wolvesIn(loups, roles) * 2 >= players) {
    throw new IllegalActionError('Trop de loups pour cette table', 'composition');
  }
  if (loups + cartes.length > players) {
    throw new IllegalActionError('Plus de rôles que de joueurs', 'composition');
  }
  const villageois = players - loups - cartes.length;
  return [
    ...Array.from({ length: loups }, () => 'loup' as const),
    ...cartes,
    ...Array.from({ length: villageois }, () => 'villageois' as const),
  ];
}
