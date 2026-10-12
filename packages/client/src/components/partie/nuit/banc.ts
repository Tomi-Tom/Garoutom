/**
 * Un banc d'essai pour les tests de rendu de la nuit et de la révélation.
 *
 * Aucune vue n'est inventée à la main : on mène une vraie partie du moteur —
 * composition manuelle, graine fixe — et l'on installe dans le magasin la
 * `GameView` que le serveur aurait taillée pour le siège voulu. Un écran qui
 * passe ces tests a vu exactement ce qu'il verra en partie.
 *
 * Module de test seulement : rien dans l'application ne l'importe.
 */

import {
  applyAction,
  createGame,
  createSeededRng,
  DEFAULT_OPTIONS,
  timeoutPhase,
  viewFor,
  type Action,
  type GameOptions,
  type GameState,
  type RoleId,
  type RoomView,
  type Rng,
} from '@garoutom/engine';

import { useStore } from '../../../lib/store.js';

export interface Banc {
  state: GameState;
  rng: Rng;
  nombre: number;
}

/** Huit joueurs, deux loups, quatre rôles de nuit, pas de capitaine. */
export function nouvellePartie(ecarts: Partial<GameOptions> = {}, nombre = 8, graine = 7): Banc {
  const options: GameOptions = {
    ...DEFAULT_OPTIONS,
    auto: false,
    loups: 2,
    roles: ['voyante', 'sorciere', 'salvateur', 'cupidon'],
    capitaine: false,
    ...ecarts,
  };
  const rng = createSeededRng(graine);
  return { state: createGame({ players: nombre, options }, rng).state, rng, nombre };
}

export function sieges(banc: Banc, role: RoleId): number[] {
  return banc.state.players.filter((p) => p.role === role).map((p) => p.seat);
}

export function siegeDe(banc: Banc, role: RoleId): number {
  const seat = sieges(banc, role)[0];
  if (seat === undefined) throw new Error(`Aucun siège pour ce rôle : ${role}`);
  return seat;
}

export function agir(banc: Banc, seat: number, action: Action): void {
  banc.state = applyAction(banc.state, action, banc.rng, seat).state;
}

/** Tout le monde confirme sa carte : la première nuit tombe. */
export function tousPrets(banc: Banc): void {
  for (const player of banc.state.players) agir(banc, player.seat, { type: 'pret' });
}

/** Le temps de la phase en cours s'écoule. */
export function finirPhase(banc: Banc): void {
  banc.state = timeoutPhase(banc.state, banc.rng, banc.state.phaseSeq).state;
}

/** La table telle que le serveur la décrirait en pleine partie. */
export function salle(nombre: number): RoomView {
  return {
    code: 'NUIT',
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: Array.from({ length: nombre }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: `Joueur ${String(seat)}`,
      seat,
      connected: true,
      isHost: seat === 0,
      disconnectedUntil: null,
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

/** Installe dans le magasin la vue d'un siège — `null` pour un spectateur. */
export function installe(banc: Banc, seat: number | null): void {
  useStore.setState({
    room: salle(banc.nombre),
    game: viewFor(banc.state, seat),
    playerId: seat === null ? null : `p${String(seat)}`,
    decalageHorloge: 0,
  });
}

/**
 * Les identifiants du moteur qui ne doivent jamais atteindre l'écran : les
 * rôles, les étapes, les actions. Sensible à la casse — « Loup-garou » et
 * « Cupidon » sont des noms du skin, pas des identifiants. Les verbes
 * `marquer` et `trahir` n'y sont pas : ce sont aussi des mots français, que
 * les boutons emploient à bon droit (« Ne marquer personne »).
 */
export const IDENTIFIANT_BRUT =
  /\b(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot|ancien|corbeau|bouc|petiteFille|loupBlanc|principale|devorer|sonder|proteger|pret|designerVotants)\b/;
