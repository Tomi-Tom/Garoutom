/**
 * Options de partie et composition des rôles.
 *
 * Tout ce qui arrive ici vient du réseau : `sanitizeOptions` ne fait confiance à
 * rien et rend toujours des options jouables, quitte à revenir aux défauts.
 */

import {
  IllegalActionError,
  SPECIAL_ROLES,
  type GameOptions,
  type RoleId,
  type SpecialRoleId,
} from './types.js';

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 18;

export const DEFAULT_OPTIONS: GameOptions = {
  auto: true,
  loups: 2,
  roles: ['voyante', 'sorciere'],
  capitaine: true,
  chat: true,
  revelerRoles: true,
  mortsVoientTout: true,
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

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

/** Un identifiant de skin plausible. Le client retombe sur le défaut s'il ne le connaît pas. */
function skinId(raw: unknown): string {
  return typeof raw === 'string' && /^[a-z0-9-]{1,32}$/.test(raw) ? raw : DEFAULT_OPTIONS.skin;
}

export function sanitizeOptions(raw: unknown): GameOptions {
  const input = isRecord(raw) ? raw : {};
  const roles = Array.isArray(input.roles)
    ? SPECIAL_ROLES.filter((role) => (input.roles as unknown[]).includes(role))
    : DEFAULT_OPTIONS.roles;
  return {
    auto: bool(input.auto, DEFAULT_OPTIONS.auto),
    loups: clampInt(input.loups, 1, Math.floor((MAX_PLAYERS - 1) / 2), DEFAULT_OPTIONS.loups),
    roles,
    capitaine: bool(input.capitaine, DEFAULT_OPTIONS.capitaine),
    chat: bool(input.chat, DEFAULT_OPTIONS.chat),
    revelerRoles: bool(input.revelerRoles, DEFAULT_OPTIONS.revelerRoles),
    mortsVoientTout: bool(input.mortsVoientTout, DEFAULT_OPTIONS.mortsVoientTout),
    tempsNuit: clampInt(input.tempsNuit, NIGHT_SECONDS.min, NIGHT_SECONDS.max, DEFAULT_OPTIONS.tempsNuit),
    tempsJour: clampInt(input.tempsJour, DAY_SECONDS.min, DAY_SECONDS.max, DEFAULT_OPTIONS.tempsJour),
    skin: skinId(input.skin),
  };
}

/**
 * La composition automatique, selon le nombre de joueurs.
 *
 * Provisoire : un loup pour trois à quatre joueurs, et les rôles d'information
 * d'abord, ceux qui compliquent la partie ensuite. À recaler sur
 * `docs/refs/roles.md` et sur les premières parties.
 */
export function autoComposition(players: number): { loups: number; roles: SpecialRoleId[] } {
  const loups = players <= 8 ? 2 : players <= 12 ? 3 : players <= 16 ? 4 : 5;
  const roles: SpecialRoleId[] = ['voyante', 'sorciere'];
  if (players >= 8) roles.push('chasseur');
  if (players >= 9) roles.push('cupidon');
  if (players >= 10) roles.push('salvateur');
  if (players >= 12) roles.push('idiot');
  return { loups, roles };
}

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
  // Autant de loups que d'autres, et le premier vote est déjà joué d'avance.
  if (loups * 2 >= players) {
    throw new IllegalActionError('Trop de loups pour cette table', 'composition');
  }
  if (loups + roles.length > players) {
    throw new IllegalActionError('Plus de rôles que de joueurs', 'composition');
  }
  const villageois = players - loups - roles.length;
  return [
    ...Array.from({ length: loups }, () => 'loup' as const),
    ...roles,
    ...Array.from({ length: villageois }, () => 'villageois' as const),
  ];
}
