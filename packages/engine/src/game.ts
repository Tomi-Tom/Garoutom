/**
 * Le déroulé d'une partie.
 *
 * Trois portes d'entrée, et seulement trois :
 *
 * - `createGame` distribue les cartes ;
 * - `applyAction` applique la demande d'un joueur ;
 * - `timeoutPhase` clôt la phase en cours quand son temps est écoulé.
 *
 * Toutes rendent un nouvel état et la liste de ce qui s'est passé. Aucune ne
 * modifie l'état reçu, aucune ne lit l'horloge, aucune ne tire au hasard
 * ailleurs que dans le générateur rangé dans l'état (`GameState.rng`, R104) :
 * une partie se rejoue à l'identique, et une partie interrompue — sérialisée,
 * rangée, rechargée — reprend exactement là où elle s'était arrêtée.
 *
 * `timeoutPhase` porte aussi, à la demande du serveur, les morts d'abandon
 * (R101) : c'est le serveur qui sait qui est parti depuis trop longtemps, le
 * moteur n'a pas d'horloge.
 *
 * Le meneur de jeu, c'est ce fichier. Tout ce qu'il ferait autour d'une table —
 * appeler les rôles, compter les voix, annoncer les morts, rappeler au Chasseur
 * qu'il doit tirer — est ici, et nulle part ailleurs.
 */

import { cleanText, parseAction } from './input.js';
import { compositionFor } from './options.js';
import { createSeededRng, isRngState, rngDraw } from './rng.js';
import {
  IllegalActionError,
  campOf,
  factionOf,
  type Action,
  type ChatChannel,
  type Death,
  type DeathCause,
  type GameEvent,
  type GameOptions,
  type GameState,
  type NightChoices,
  type NightStep,
  type Phase,
  type PlayerState,
  type RoleId,
  type Rng,
  type Step,
  type Winner,
} from './types.js';

/**
 * Le fil garde les derniers messages **de chaque canal**, pas tous : l'état
 * voyage à chaque action (R78). Une borne commune à tous les canaux ferait
 * tomber les vieux messages du village au rythme des bavardages de la meute
 * — et le premier numéro visible au village trahirait l'activité des loups.
 */
export const MAX_CHAT_PER_CHANNEL = 100;
/** Le plafond du fil entier : quatre canaux, cent messages chacun. */
export const MAX_CHAT_MESSAGES = 4 * MAX_CHAT_PER_CHANNEL;
/** Un message : 280 points de code au plus, après nettoyage (R78, R103). */
export const MAX_MESSAGE_LENGTH = 280;

/** Temps fixes, en millisecondes. */
export const REVEAL_MS = 25_000;
export const TRIGGER_MS = 30_000;
export const ELECTION_MS = 90_000;

/**
 * Une étape jouée par un rôle mort doit durer quand même.
 *
 * Autour d'une table, le meneur appelle la Sorcière même quand elle est morte :
 * sauter son tour dirait à tout le monde qu'elle n'est plus là. On attend donc
 * un temps plausible, tiré dans cette fourchette.
 */
export const GHOST_STEP_MS = { min: 5_000, spread: 5_000 } as const;

/**
 * Le huis clos — il ne reste en vie que la meute, Loup Blanc compris — ne
 * dure pas toujours : passé ce nombre de nuits sans une mort, la partie se
 * clôt sur la victoire de la meute (R99). Trois nuits consécutives en
 * comptent toujours au moins une paire : le Loup Blanc a eu sa chance.
 */
export const HUIS_CLOS_NUITS = 3;

/* ------------------------------------------------------------------ */
/* Création                                                            */
/* ------------------------------------------------------------------ */

function emptyNight(): NightChoices {
  return {
    lovers: null,
    protect: null,
    inspect: null,
    wolfVotes: {},
    victim: null,
    witchSave: false,
    witchKill: null,
    raven: null,
    whiteKill: null,
  };
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * L'état d'un générateur, pour le ranger dans la partie.
 *
 * Un générateur à graine (`createSeededRng`) dit où il en est : la partie
 * reprend exactement sa suite. Un `Rng` quelconque — un double de test — ne
 * le dit pas : on lui tire alors un état neuf, de 32 bits.
 */
function rngStateOf(rng: Rng): number {
  const seeded = rng as Rng & { state?: unknown };
  if (typeof seeded.state === 'function') {
    const state: unknown = (seeded.state as () => unknown)();
    if (isRngState(state)) return state;
  }
  return rng.nextInt(0x1_0000_0000) >>> 0;
}

/**
 * Distribue les cartes et ouvre la révélation (R30).
 *
 * `seed` est une graine — un entier, que le serveur tire et peut oublier :
 * tout l'aléa de la partie en découle, puis voyage dans `GameState.rng`
 * (R104). Pour la commodité des tests, c'est aussi un `Rng` : il mélange les
 * cartes, puis son état — ou, faute de mieux, un tirage — sème celui de la
 * partie. `createGame(setup, n)` et `createGame(setup, createSeededRng(n))`
 * rendent la même partie.
 */
export function createGame(setup: { players: number; options: GameOptions }, seed: number | Rng): Step {
  const rng = typeof seed === 'number' ? createSeededRng(seed) : seed;
  const roles = shuffle(compositionFor(setup.players, setup.options), rng);
  const players: PlayerState[] = roles.map((role, seat) => ({
    seat,
    role,
    alive: true,
    canVote: true,
    revealed: false,
  }));
  const state: GameState = {
    options: setup.options,
    players,
    rng: rngStateOf(rng),
    phase: { kind: 'revelation', ready: [] },
    phaseSeq: 1,
    day: 1,
    resume: 'nuit',
    triggers: [],
    night: emptyNight(),
    captain: null,
    electionHeld: false,
    lovers: null,
    potions: { vie: true, mort: true },
    lastProtected: null,
    inspections: [],
    ancienBlesse: false,
    pouvoirsPerdus: false,
    corbeau: null,
    votants: null,
    huisClos: 0,
    chat: [],
    nextMessageId: { village: 1, loups: 1, amoureux: 1, morts: 1 },
    log: [],
    winner: null,
    over: false,
  };
  return { state, events: [{ type: 'debut' }, { type: 'phase', phase: 'revelation', day: 1 }] };
}

/* ------------------------------------------------------------------ */
/* Lectures                                                            */
/* ------------------------------------------------------------------ */

export function playerAt(state: GameState, seat: number): PlayerState {
  const player = state.players[seat];
  if (!player) throw new IllegalActionError('Ce siège n’existe pas', 'seat');
  return player;
}

export function isAlive(state: GameState, seat: number): boolean {
  return state.players[seat]?.alive === true;
}

export function livingSeats(state: GameState): number[] {
  return state.players.filter((player) => player.alive).map((player) => player.seat);
}

function livingWith(state: GameState, role: RoleId): number[] {
  return state.players.filter((p) => p.alive && p.role === role).map((p) => p.seat);
}

/** Le rôle fait partie de la partie, mort ou vif. */
function inGame(state: GameState, role: RoleId): boolean {
  return state.players.some((player) => player.role === role);
}

/**
 * Les vivants qui portent ce pouvoir du village — et qui l'ont encore.
 *
 * L'Ancien tué de la main du village emporte les pouvoirs avec lui (R92) :
 * la carte reste, le pouvoir s'en va. Tant que la table n'a pas perdu ses
 * pouvoirs, c'est exactement `livingWith`.
 */
function livingPowered(state: GameState, role: RoleId): number[] {
  return state.pouvoirsPerdus ? [] : livingWith(state, role);
}

/** La meute vivante : les loups, Loup Blanc compris (R96). */
export function livingPack(state: GameState): number[] {
  return state.players.filter((p) => p.alive && campOf(p.role) === 'loups').map((p) => p.seat);
}

/**
 * La nuit en cours est une nuit du Loup Blanc : une nuit paire, dans une
 * partie qui le compte — mort ou vif (R97). Sauter l'étape d'un Loup Blanc
 * mort dirait à tous qu'il n'est plus là.
 */
function whiteWolfNight(state: GameState): boolean {
  return state.day % 2 === 0 && inGame(state, 'loupBlanc');
}

/**
 * Le huis clos : il ne reste en vie que la meute, et le Loup Blanc en est
 * (R99). La partie continue — lui seul peut encore la finir.
 */
function inHuisClos(state: GameState): boolean {
  const alive = state.players.filter((p) => p.alive);
  return (
    alive.some((p) => p.role === 'loupBlanc') && alive.every((p) => campOf(p.role) === 'loups')
  );
}

/** Qui joue pendant l'étape principale de la nuit. */
function principalActors(state: GameState): number[] {
  const seats = [
    ...(state.day === 1 ? livingPowered(state, 'cupidon') : []),
    ...livingPowered(state, 'salvateur'),
    ...livingPowered(state, 'voyante'),
    ...livingPowered(state, 'corbeau'),
    ...livingPack(state),
  ];
  return seats.sort((a, b) => a - b);
}

/**
 * Qui vote au village : les vivants qui le peuvent — et, le lendemain de la
 * mort du Bouc émissaire, ceux-là seuls qu'il a désignés (R94).
 */
function voters(state: GameState): number[] {
  const designes = state.votants;
  return state.players
    .filter((p) => p.alive && p.canVote && (designes === null || designes.includes(p.seat)))
    .map((p) => p.seat);
}

/**
 * Ceux qui doivent encore agir dans la phase en cours.
 *
 * Le serveur s'en sert pour armer ses minuteries et faire jouer les robots.
 * Le moteur, lui, ne clôt une phase qu'au fil des actions (`settle`) ou au
 * temps écoulé (`timeoutPhase`) : une phase ouverte sans personne à attendre
 * ne vit que pour être vue — c'est le pas fantôme de la Sorcière morte
 * (R36), et le serveur le clôt quand son temps est passé.
 */
export function pendingActors(state: GameState): number[] {
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      return livingSeats(state).filter((seat) => !phase.ready.includes(seat));
    case 'nuit':
      if (phase.step === 'principale') {
        return principalActors(state).filter((seat) => !phase.acted.includes(seat));
      }
      if (phase.step === 'loupBlanc') {
        return livingWith(state, 'loupBlanc').filter((seat) => !phase.acted.includes(seat));
      }
      return livingPowered(state, 'sorciere').filter((seat) => !phase.acted.includes(seat));
    case 'chasseur':
    case 'succession':
    case 'bouc':
      return [phase.seat];
    case 'election':
      return livingSeats(state).filter((seat) => !(seat in phase.votes));
    case 'jour':
      return voters(state).filter((seat) => !(seat in phase.votes));
    case 'fin':
      return [];
  }
}

/**
 * Une étape sans personne pour la jouer — Sorcière morte ou sans pouvoir
 * (R36, R92), Loup Blanc mort (R97) — n'existe que pour durer : c'est une
 * étape fantôme.
 */
function isGhostStep(state: GameState, step: NightStep): boolean {
  if (step === 'sorciere') return livingPowered(state, 'sorciere').length === 0;
  if (step === 'loupBlanc') return livingWith(state, 'loupBlanc').length === 0;
  return false;
}

/**
 * Durée de la phase en cours, en millisecondes, ou `0` si elle n'en a pas.
 *
 * Fonction pure (R104) : la durée d'une étape fantôme — imprévisible, sans
 * quoi elle trahirait la mort du rôle aussi sûrement qu'un saut — a été
 * tirée par le moteur à l'entrée de l'étape et rangée dans la phase. On peut
 * donc la demander autant de fois qu'on veut, avant ou après un
 * rechargement : la réponse ne change pas, l'aléa n'avance pas.
 *
 * Le second paramètre n'est plus lu : il reste pour les appelants d'avant
 * D20, qui passaient leur `Rng`.
 */
export function phaseBudgetMs(state: GameState, _rngIgnore?: Rng): number {
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      return REVEAL_MS;
    case 'nuit': {
      if (phase.ghostMs !== undefined) return phase.ghostMs;
      // Un état d'avant D20 n'a pas rangé sa durée fantôme : on la lit dans
      // l'aléa de la partie, sans le faire avancer — même état, même durée.
      if (isGhostStep(state, phase.step)) {
        const alea = isRngState(state.rng) ? state.rng : state.phaseSeq >>> 0;
        return GHOST_STEP_MS.min + rngDraw(alea, GHOST_STEP_MS.spread).value;
      }
      return state.options.tempsNuit * 1000;
    }
    case 'chasseur':
    case 'succession':
    case 'bouc':
      return TRIGGER_MS;
    case 'election':
      return ELECTION_MS;
    case 'jour':
      return state.options.tempsJour * 1000;
    case 'fin':
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Le fil d'une partie                                                 */
/* ------------------------------------------------------------------ */

/** Le contexte d'un pas : un état à modifier, et ce qu'on en raconte. */
interface Turn {
  state: GameState;
  events: GameEvent[];
}

/**
 * Un tirage dans `[0, max)`, pris dans l'aléa de la partie — qui avance
 * d'un pas (R104). Le seul endroit où le moteur tire au sort.
 */
function draw(state: GameState, max: number): number {
  const { value, next } = rngDraw(state.rng, max);
  state.rng = next;
  return value;
}

function enter(turn: Turn, phase: Phase): void {
  turn.state.phase = phase;
  turn.state.phaseSeq += 1;
  const step = phase.kind === 'nuit' ? phase.step : undefined;
  turn.events.push({
    type: 'phase',
    phase: phase.kind,
    day: turn.state.day,
    ...(step ? { step } : {}),
  });
}

function startNight(turn: Turn): void {
  const { state } = turn;
  // La nuit N précède le jour N : on n'avance le compteur qu'à partir de la
  // deuxième nuit. La première suit la révélation des cartes — ou l'élection
  // pré-nocturne du capitaine, qui ne fait pas avancer le jour non plus.
  if (state.phase.kind !== 'revelation' && state.phase.kind !== 'election') state.day += 1;
  state.night = emptyNight();
  // Le huis clos se compte en nuits ouvertes depuis la dernière mort (R99).
  if (inHuisClos(state)) state.huisClos += 1;
  enter(turn, { kind: 'nuit', step: 'principale', acted: [] });
}

/**
 * Ouvre une étape de nuit seconde — le Loup Blanc, la Sorcière. Fantôme, sa
 * durée se tire ici, à l'entrée, et se range dans la phase (R104) : c'est le
 * dernier tirage du pas, et `phaseBudgetMs` n'a plus qu'à la lire.
 */
function enterStep(turn: Turn, step: NightStep): void {
  const phase: Phase = { kind: 'nuit', step, acted: [] };
  if (isGhostStep(turn.state, step)) phase.ghostMs = GHOST_STEP_MS.min + draw(turn.state, GHOST_STEP_MS.spread);
  enter(turn, phase);
}

/** Après l'étape principale ou celle du Loup Blanc : la Sorcière, ou l'aube. */
function afterWolves(turn: Turn): void {
  if (inGame(turn.state, 'sorciere')) {
    enterStep(turn, 'sorciere');
  } else {
    resolveNight(turn);
  }
}

/** Le plus grand nombre de voix, et ceux qui l'atteignent. */
function leaders(tally: Record<number, number>): { top: number; seats: number[] } {
  let top = 0;
  let seats: number[] = [];
  for (const [key, count] of Object.entries(tally)) {
    const seat = Number(key);
    if (count > top) {
      top = count;
      seats = [seat];
    } else if (count === top && count > 0) {
      seats.push(seat);
    }
  }
  return { top, seats: seats.sort((a, b) => a - b) };
}

function pick<T>(items: T[], state: GameState): T | null {
  if (items.length === 0) return null;
  return items[draw(state, items.length)] ?? null;
}

function closePrincipal(turn: Turn): void {
  const { state } = turn;
  const night = state.night;

  // Une flèche tirée vers un siège mort d'abandon depuis se perd : un
  // couple ne se forme qu'entre deux vivants (R37, R101).
  if (night.lovers && !night.lovers.every((seat) => isAlive(state, seat))) night.lovers = null;
  if (night.lovers) {
    state.lovers = night.lovers;
    state.log.push({ day: state.day, type: 'amoureux', seats: night.lovers });
  }
  state.lastProtected = night.protect;
  if (night.protect !== null) {
    state.log.push({ day: state.day, type: 'protection', target: night.protect });
  }
  if (night.inspect !== null) {
    const role = playerAt(state, night.inspect).role;
    state.inspections.push({ day: state.day, target: night.inspect, role });
    state.log.push({ day: state.day, type: 'voyance', target: night.inspect, role });
  }
  if (night.raven !== null) {
    state.log.push({ day: state.day, type: 'corbeau', target: night.raven });
  }

  // Seules comptent les voix des loups encore en vie — Loup Blanc compris :
  // il chasse avec la meute (R96).
  // Une proie morte d'abandon entre-temps ne se dévore plus (R101).
  const tally: Record<number, number> = {};
  for (const wolf of livingPack(state)) {
    const target = night.wolfVotes[wolf];
    if (target === undefined || target === null || !isAlive(state, target)) continue;
    tally[target] = (tally[target] ?? 0) + 1;
  }
  // Une égalité entre loups se tranche au sort : la meute a faim, elle ne
  // renonce pas faute d'accord.
  night.victim = pick(leaders(tally).seats, state);
  state.log.push({ day: state.day, type: 'loups', target: night.victim });

  if (whiteWolfNight(state)) {
    enterStep(turn, 'loupBlanc');
  } else {
    afterWolves(turn);
  }
}

/** L'étape du Loup Blanc se clôt : son choix est noté, la nuit continue (R97). */
function closeWhiteWolf(turn: Turn): void {
  const { state } = turn;
  // Un Loup Blanc mort n'a rien choisi : son étape fantôme ne laisse aucune
  // ligne au récit.
  if (livingWith(state, 'loupBlanc').length > 0) {
    state.log.push({ day: state.day, type: 'loupBlanc', target: state.night.whiteKill });
  }
  afterWolves(turn);
}

function resolveNight(turn: Turn): void {
  const { state } = turn;
  const night = state.night;
  const victims: { seat: number; cause: DeathCause }[] = [];

  if (night.victim !== null) {
    const shielded = night.protect === night.victim;
    if (night.witchSave) {
      state.potions.vie = false;
      state.log.push({ day: state.day, type: 'sauvetage', target: night.victim });
    }
    if (!shielded && !night.witchSave) {
      const prey = playerAt(state, night.victim);
      if (prey.role === 'ancien' && prey.alive && !state.ancienBlesse) {
        // L'Ancien encaisse la première attaque qui l'aurait tué : il reste
        // debout, et le village n'en saura rien — une aube paisible (R91).
        state.ancienBlesse = true;
        state.log.push({ day: state.day, type: 'resistance', seat: night.victim });
      } else {
        victims.push({ seat: night.victim, cause: 'loups' });
      }
    }
  }
  // Le Loup Blanc dévore comme la meute : même cause, même bouclier (R97).
  if (night.whiteKill !== null && night.protect !== night.whiteKill) {
    victims.push({ seat: night.whiteKill, cause: 'loups' });
  }
  if (night.witchKill !== null) {
    state.potions.mort = false;
    state.log.push({ day: state.day, type: 'poison', target: night.witchKill });
    victims.push({ seat: night.witchKill, cause: 'poison' });
  }

  const { deaths, suites } = killAll(state, victims);
  turn.events.push(deaths.length > 0 ? { type: 'morts', deaths } : { type: 'aube-paisible' });
  turn.events.push(...suites);

  // La marque du Corbeau tombe à l'aube, après les morts : sur un mort, elle
  // n'a plus de sens et ne s'annonce pas (R93).
  if (night.raven !== null && isAlive(state, night.raven)) {
    state.corbeau = night.raven;
    turn.events.push({ type: 'corbeau', target: night.raven });
  }

  state.resume = 'jour';
  proceed(turn);
}

/** Tue chacun, dans l'ordre : les morts d'un bloc, puis ce qu'ils ont déclenché d'annonces. */
function killAll(
  state: GameState,
  victims: { seat: number; cause: DeathCause }[],
): { deaths: Death[]; suites: GameEvent[] } {
  const deaths: Death[] = [];
  const suites: GameEvent[] = [];
  for (const victim of victims) kill(state, victim.seat, victim.cause, deaths, suites);
  return { deaths, suites };
}

/** Les morts qui viennent de la main du village : le vote, le tir, le poison (R92). */
const VILLAGE_HAND: readonly DeathCause[] = ['vote', 'chasseur', 'poison'];

/**
 * Tue un joueur, et tout ce qui s'ensuit.
 *
 * L'amoureux survivant meurt de chagrin dans la foulée. Le Chasseur et le
 * capitaine laissent un déclencheur, traité avant de reprendre le jeu.
 * L'Ancien tué de la main du village emporte les pouvoirs du village : sa
 * carte se retourne, et l'annonce rejoint `suites`, à dire après les morts.
 */
function kill(
  state: GameState,
  seat: number,
  cause: DeathCause,
  out: Death[],
  suites: GameEvent[],
): void {
  const player = state.players[seat];
  if (!player?.alive) return;
  player.alive = false;
  out.push({ seat, cause, role: state.options.revelerRoles ? player.role : null });
  state.log.push({ day: state.day, type: 'mort', seat, cause });
  // Une mort rouvre le compte du huis clos (R99).
  state.huisClos = 0;

  if (
    player.role === 'ancien' &&
    state.options.ancienRancunier &&
    !state.pouvoirsPerdus &&
    VILLAGE_HAND.includes(cause)
  ) {
    // Le village a tué son Ancien : les pouvoirs s'en vont avec lui, et le
    // jeu l'annonce — sa carte se retourne, quelle que soit l'option (R92).
    state.pouvoirsPerdus = true;
    player.revealed = true;
    state.log.push({ day: state.day, type: 'rancune', seat });
    suites.push({ type: 'rancune', seat });
  }

  // Qui a quitté la partie n'a plus de main : ni tir, ni dernier mot, ni
  // brassard à transmettre lui-même — la charge passe au hasard, sans phase
  // (R101). Seul le chagrin de son amoureux le suit (R47).
  const parti = cause === 'abandon';

  if (player.role === 'chasseur' && !parti) {
    // Le poison étouffe le Chasseur, et le chagrin ne laisse pas de souffle
    // pour viser : pas de tir. L'option de table rouvre la main pour toute
    // mort (R48) — autour d'une table, c'est le meneur qui en décide.
    const peutTirer =
      cause === 'loups' || cause === 'vote' || cause === 'chasseur' || state.options.chasseurEmpoisonne;
    if (peutTirer) state.triggers.push({ kind: 'chasseur', seat });
  }
  if (state.captain === seat && !parti) state.triggers.push({ kind: 'succession', seat });

  const lovers = state.lovers;
  if (lovers?.includes(seat)) {
    const other = lovers[0] === seat ? lovers[1] : lovers[0];
    kill(state, other, 'chagrin', out, suites);
  }
}

/**
 * Qui a gagné, s'il y a un gagnant.
 *
 * Évalué seulement quand plus aucun déclencheur n'attend : le Chasseur tire
 * toujours, même quand son camp a déjà perdu, et son tir peut tout changer.
 *
 * On compte par faction (R98) : le village gagne quand ni loup ni Loup Blanc
 * ne vivent plus ; la meute, quand il ne reste que des loups ordinaires ; le
 * Loup Blanc, quand il reste seul. Un couple d'amoureux de deux factions
 * différentes, derniers survivants, l'emporte avant tout le monde.
 */
export function winnerOf(state: GameState): Winner | null {
  const alive = state.players.filter((player) => player.alive);
  if (alive.length === 0) return 'personne';

  const lovers = state.lovers;
  if (lovers) {
    const [a, b] = lovers.map((seat) => playerAt(state, seat));
    const mixed = a && b && factionOf(a.role) !== factionOf(b.role);
    if (mixed && alive.length === 2 && alive.every((p) => lovers.includes(p.seat))) {
      return 'amoureux';
    }
  }

  const wolves = alive.filter((player) => player.role === 'loup').length;
  const white = alive.filter((player) => player.role === 'loupBlanc').length;
  if (wolves === 0 && white === 0) return 'village';
  if (white > 0 && white === alive.length) return 'loupBlanc';
  if (white === 0 && wolves === alive.length) return 'loups';
  return null;
}

/**
 * Les morts d'abandon (R101, D18) : les sièges vivants que le serveur dit
 * partis depuis trop longtemps quittent la partie, d'un bloc.
 *
 * Mort publique — l'absence l'était déjà —, rôle montré selon
 * `revelerRoles` ; aucun pouvoir ne part : ni tir, ni rancune de l'Ancien,
 * ni dernier mot. Le chagrin de l'amoureux suit (R47), avec ses propres
 * déclencheurs. Un capitaine parti lègue sa charge au hasard parmi les
 * vivants, sans phase de succession — personne ne la tiendrait.
 *
 * Sans l'option `abandon`, rien ne se passe : la table attend ses absents.
 * Un siège mort, inconnu ou mal formé est ignoré.
 */
function abandonSeats(turn: Turn, seats: readonly unknown[]): void {
  const { state } = turn;
  if (state.options.abandon === false) return;
  const partants = [
    ...new Set(seats.filter((seat): seat is number => Number.isSafeInteger(seat) && isAlive(state, seat as number))),
  ].sort((a, b) => a - b);
  if (partants.length === 0) return;

  const captain = state.captain;
  const { deaths, suites } = killAll(
    state,
    partants.map((seat) => ({ seat, cause: 'abandon' as const })),
  );
  turn.events.push({ type: 'morts', deaths }, ...suites);

  if (captain !== null && partants.includes(captain)) {
    const heir = state.options.capitaine ? pick(livingSeats(state), state) : null;
    state.captain = heir;
    if (heir !== null) {
      state.log.push({ day: state.day, type: 'capitaine', seat: heir });
      turn.events.push({ type: 'capitaine', seat: heir, from: captain });
    }
  }
}

/** La partie se clôt sur une issue. */
function finish(turn: Turn, winner: Winner): void {
  const { state } = turn;
  state.winner = winner;
  state.over = true;
  enter(turn, { kind: 'fin' });
  turn.events.push({ type: 'fin', winner });
}

/** Reprend le cours du jeu : déclencheurs d'abord, victoire ensuite, puis la suite. */
function proceed(turn: Turn): void {
  const { state } = turn;

  while (state.triggers.length > 0) {
    const trigger = state.triggers.shift();
    if (!trigger) break;
    if (trigger.kind === 'chasseur') {
      // Un chasseur seul survivant n'a personne sur qui tirer.
      if (livingSeats(state).length === 0) continue;
      // Le village a perdu ses pouvoirs (R92) : la balle qui n'est pas encore
      // partie ne partira plus. Rien ne s'ouvre, rien ne se retourne.
      if (state.pouvoirsPerdus) continue;
      // Ouvrir sa phase, c'est le désigner à toute la table : la carte se
      // retourne même si l'option ne révèle pas les morts (R46). Qu'il tire
      // ou emporte sa balle, le village a reconnu son Chasseur.
      playerAt(state, trigger.seat).revealed = true;
      enter(turn, { kind: 'chasseur', seat: trigger.seat });
      return;
    }
    if (trigger.kind === 'bouc') {
      // Le dernier mot du Bouc est un pouvoir : perdu avec ceux du village
      // (R92), et sans objet sur une table vide.
      if (state.pouvoirsPerdus || livingSeats(state).length === 0) continue;
      enter(turn, { kind: 'bouc', seat: trigger.seat });
      return;
    }
    if (!state.options.capitaine || livingSeats(state).length === 0) {
      state.captain = null;
      continue;
    }
    enter(turn, { kind: 'succession', seat: trigger.seat });
    return;
  }

  const winner = winnerOf(state);
  if (winner) {
    finish(turn, winner);
    return;
  }

  if (state.resume === 'nuit') {
    // Le huis clos qui s'éternise : le Loup Blanc a laissé passer ses nuits,
    // la meute l'emporte (R99). Sans Loup Blanc, le compteur reste à zéro.
    if (state.huisClos >= HUIS_CLOS_NUITS && inHuisClos(state)) {
      finish(turn, 'loups');
      return;
    }
    // L'élection pré-nocturne se tient entre la révélation et la première
    // nuit : tout le monde vote, même celui qui ne survivra pas à la nuit.
    if (state.options.capitaine && state.options.capitaineAvantNuit1 && !state.electionHeld) {
      enter(turn, { kind: 'election', votes: {} });
      return;
    }
    startNight(turn);
    return;
  }
  if (state.options.capitaine && state.captain === null && state.day === 1 && !state.electionHeld) {
    enter(turn, { kind: 'election', votes: {} });
    return;
  }
  enter(turn, { kind: 'jour', votes: {} });
}

function closeElection(turn: Turn): void {
  const { state } = turn;
  if (state.phase.kind !== 'election') return;
  // Ne comptent que les voix des vivants, pour des vivants : un siège mort
  // d'abandon à la clôture ne vote plus et ne s'élit plus (R101). Sans
  // abandon, personne ne meurt pendant l'élection — rien ne change.
  const tally: Record<number, number> = {};
  for (const [key, target] of Object.entries(state.phase.votes)) {
    if (target === null || !isAlive(state, Number(key)) || !isAlive(state, target)) continue;
    tally[target] = (tally[target] ?? 0) + 1;
  }
  const elected = pick(leaders(tally).seats, state);
  if (elected !== null) {
    state.captain = elected;
    state.log.push({ day: state.day, type: 'capitaine', seat: elected });
    turn.events.push({ type: 'capitaine', seat: elected, from: null });
  }
  // L'élection n'a qu'une vie, même sans élu : sans ce drapeau, une élection
  // pré-nocturne sans voix donnerait une seconde chance au matin du jour 1.
  state.electionHeld = true;
  proceed(turn);
}

function closeDay(turn: Turn): void {
  const { state } = turn;
  if (state.phase.kind !== 'jour') return;

  // Comme à l'élection : les voix des vivants, pour des vivants (R101).
  const tally: Record<number, number> = {};
  for (const [key, target] of Object.entries(state.phase.votes)) {
    if (target === null || !isAlive(state, Number(key)) || !isAlive(state, target)) continue;
    const weight = Number(key) === state.captain ? 2 : 1;
    tally[target] = (tally[target] ?? 0) + weight;
  }
  // La marque du Corbeau : deux voix d'office contre le siège désigné, tant
  // qu'il vit (R93).
  if (state.corbeau !== null && isAlive(state, state.corbeau)) {
    tally[state.corbeau] = (tally[state.corbeau] ?? 0) + 2;
  }
  // Une égalité ne condamne personne : le village n'exécute pas au hasard —
  // sauf qu'un Bouc émissaire vivant paie pour tous (R94).
  const { seats } = leaders(tally);
  const executed = seats.length === 1 ? (seats[0] ?? null) : null;
  const scapegoat = seats.length > 1 ? (livingWith(state, 'bouc')[0] ?? null) : null;

  state.log.push({ day: state.day, type: 'vote', tally, executed });
  turn.events.push({ type: 'vote', tally, executed });

  // La marque et la désignation ne valent que pour ce vote-ci.
  state.corbeau = null;
  state.votants = null;

  if (executed !== null) {
    const condemned = playerAt(state, executed);
    if (condemned.role === 'idiot' && !condemned.revealed && !state.pouvoirsPerdus) {
      // L'Idiot du village est reconnu et gracié, mais ne votera plus.
      condemned.revealed = true;
      condemned.canVote = false;
      state.log.push({ day: state.day, type: 'grace', seat: executed });
      turn.events.push({ type: 'grace', seat: executed });
    } else {
      const { deaths, suites } = killAll(state, [{ seat: executed, cause: 'vote' }]);
      turn.events.push({ type: 'morts', deaths }, ...suites);
    }
  } else if (scapegoat !== null) {
    // Le Bouc émissaire paie l'égalité : sa carte se retourne, il meurt de
    // la main du village, et son dernier mot passe avant tout autre
    // déclencheur (R94).
    playerAt(state, scapegoat).revealed = true;
    state.log.push({ day: state.day, type: 'bouc', seat: scapegoat });
    turn.events.push({ type: 'bouc', seat: scapegoat });
    state.triggers.push({ kind: 'bouc', seat: scapegoat });
    const { deaths, suites } = killAll(state, [{ seat: scapegoat, cause: 'vote' }]);
    turn.events.push({ type: 'morts', deaths }, ...suites);
  }

  state.resume = 'nuit';
  proceed(turn);
}

/** Le Bouc émissaire a parlé — ou s'est tu : la désignation est publique (R94). */
function designate(turn: Turn, bouc: number, seats: number[] | null): void {
  const { state } = turn;
  state.votants = seats;
  state.log.push({ day: state.day, type: 'votants', seats });
  turn.events.push({ type: 'votants', bouc, seats });
  proceed(turn);
}

/** Clôt la phase quand plus personne n'a rien à faire. */
function settle(turn: Turn): void {
  if (pendingActors(turn.state).length > 0) return;
  closePhase(turn);
}

function closePhase(turn: Turn): void {
  const { state } = turn;
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      // La révélation close, la suite dépend des options : l'élection
      // pré-nocturne, ou directement la nuit.
      proceed(turn);
      return;
    case 'nuit':
      if (phase.step === 'principale') closePrincipal(turn);
      else if (phase.step === 'loupBlanc') closeWhiteWolf(turn);
      else resolveNight(turn);
      return;
    case 'chasseur': {
      // Le temps est écoulé sans tir : le Chasseur emporte sa balle.
      state.log.push({ day: state.day, type: 'tir', target: null });
      turn.events.push({ type: 'tir', hunter: phase.seat, target: null });
      proceed(turn);
      return;
    }
    case 'succession': {
      const heir = pick(livingSeats(state), state);
      passCaptaincy(turn, phase.seat, heir);
      return;
    }
    case 'bouc':
      // Le Bouc s'est tu : demain, tout le monde vote (R94).
      designate(turn, phase.seat, null);
      return;
    case 'election':
      closeElection(turn);
      return;
    case 'jour':
      closeDay(turn);
      return;
    case 'fin':
      return;
  }
}

function passCaptaincy(turn: Turn, from: number, to: number | null): void {
  const { state } = turn;
  state.captain = to;
  if (to !== null) {
    state.log.push({ day: state.day, type: 'capitaine', seat: to });
    turn.events.push({ type: 'capitaine', seat: to, from });
  }
  proceed(turn);
}

/* ------------------------------------------------------------------ */
/* Les actions                                                         */
/* ------------------------------------------------------------------ */

function requireLiving(state: GameState, seat: number, label: string): void {
  if (!isAlive(state, seat)) throw new IllegalActionError(`${label} doit être en vie`, 'target');
}

function requireRole(state: GameState, seat: number, role: RoleId): void {
  const player = playerAt(state, seat);
  if (!player.alive || player.role !== role) {
    throw new IllegalActionError('Ce n’est pas à vous de jouer', 'not-your-turn');
  }
}

function requireStep(state: GameState, step: NightStep): void {
  if (state.phase.kind !== 'nuit' || state.phase.step !== step) {
    throw new IllegalActionError('Ce n’est pas le moment', 'wrong-phase');
  }
}

/** Un pouvoir du village ne se joue plus une fois l'Ancien tué de sa main (R92). */
function requirePowers(state: GameState): void {
  if (state.pouvoirsPerdus) {
    throw new IllegalActionError('Le village a perdu ses pouvoirs', 'powers');
  }
}

/** Un loup vivant de la meute, Loup Blanc compris (R96). */
function requirePack(state: GameState, seat: number): void {
  const player = playerAt(state, seat);
  if (!player.alive || campOf(player.role) !== 'loups') {
    throw new IllegalActionError('Ce n’est pas à vous de jouer', 'not-your-turn');
  }
}

function markActed(state: GameState, seat: number): void {
  if (state.phase.kind === 'nuit' && !state.phase.acted.includes(seat)) {
    state.phase.acted.push(seat);
  }
}

/** Les canaux où ce siège peut écrire, maintenant. */
export function speakableChannels(state: GameState, seat: number): ChatChannel[] {
  const player = state.players[seat];
  if (!player) return [];
  const kind = state.phase.kind;
  if (kind === 'fin') return state.options.chat ? ['village'] : [];
  if (!player.alive) return ['morts'];

  const channels: ChatChannel[] = [];
  const daytime =
    kind === 'jour' || kind === 'election' || kind === 'chasseur' || kind === 'succession' || kind === 'bouc';
  if (state.options.chat && daytime) channels.push('village');
  if (campOf(player.role) === 'loups' && kind === 'nuit') channels.push('loups');
  const lovers = state.lovers;
  if (lovers?.includes(seat) && lovers.every((s) => isAlive(state, s))) channels.push('amoureux');
  return channels;
}

function say(turn: Turn, seat: number, channel: ChatChannel, raw: string): void {
  const { state } = turn;
  // NFKC, espaces pliés, invisibles retirés, 280 points de code (R78, R103).
  const text = cleanText(raw, MAX_MESSAGE_LENGTH);
  if (text.length === 0) throw new IllegalActionError('Message vide', 'empty');
  if (!speakableChannels(state, seat).includes(channel)) {
    throw new IllegalActionError('Vous ne pouvez pas parler ici', 'channel');
  }
  // Numérotation par canal : une numérotation globale raconterait à chacun,
  // par ses trous, l'activité des canaux qu'il ne lit pas.
  const id = state.nextMessageId[channel] ?? 1;
  state.nextMessageId[channel] = id + 1;
  state.chat.push({ id, channel, seat, text, day: state.day });
  // Le plus ancien message **de ce canal** tombe, et lui seul : la borne de
  // chaque canal ne dépend que de lui (R78).
  let surplus = state.chat.filter((message) => message.channel === channel).length - MAX_CHAT_PER_CHANNEL;
  while (surplus > 0) {
    state.chat.splice(
      state.chat.findIndex((message) => message.channel === channel),
      1,
    );
    surplus -= 1;
  }
}

/**
 * L'état cloné d'un pas, aléa compris.
 *
 * Un état d'avant D20 n'a pas de `rng` : on l'y sème une fois — depuis le
 * `Rng` que l'appelant d'alors passait encore, ou, à défaut, depuis le numéro
 * de phase — et la partie continue, déterministe, sans plus jamais en avoir
 * besoin. Un état qui porte le sien ignore tout `Rng` passé (R104).
 */
function cloneForTurn(state: GameState, legacy: Rng | undefined): GameState {
  const next = structuredClone(state);
  if (!isRngState(next.rng)) {
    next.rng = legacy ? rngStateOf(legacy) : Math.imul((next.phaseSeq >>> 0) + 1, 0x9e37_79b1) >>> 0;
  }
  return next;
}

/** Un siège d'auteur : un entier, qui existe à cette table. */
function requireSeat(state: GameState, seat: unknown): number {
  if (typeof seat !== 'number' || !Number.isSafeInteger(seat)) {
    throw new IllegalActionError('Ce siège n’existe pas', 'seat');
  }
  playerAt(state, seat);
  return seat;
}

/**
 * Applique l'intention d'un siège.
 *
 * `action` est relue par `parseAction` (R102) — défense en profondeur : même
 * passée au filtre par le serveur, une action mal formée ne touche pas
 * l'état. `seat` vient de la session, jamais de la charge utile.
 *
 * La forme à quatre arguments, `applyAction(state, action, rng, seat)`, est
 * celle d'avant D20 : le `Rng` n'y est plus lu dès que l'état porte son aléa
 * (R104) — c'est-à-dire toujours, pour une partie créée depuis.
 */
export function applyAction(state: GameState, action: Action, seat: number): Step;
/** @deprecated Depuis D20, l'aléa vit dans l'état : `applyAction(state, action, seat)`. */
export function applyAction(state: GameState, action: Action, rng: Rng, seat: number): Step;
export function applyAction(state: GameState, raw: Action, rngOrSeat: Rng | number, legacySeat?: number): Step {
  const legacy = typeof rngOrSeat === 'number' ? undefined : rngOrSeat;
  const seatArg: unknown = typeof rngOrSeat === 'number' ? rngOrSeat : legacySeat;
  const action = parseAction(raw, state.players.length);
  if (state.over && action.type !== 'dire') {
    throw new IllegalActionError('La partie est terminée', 'over');
  }
  const seat = requireSeat(state, seatArg);
  const turn: Turn = { state: cloneForTurn(state, legacy), events: [] };
  const next = turn.state;

  switch (action.type) {
    case 'dire':
      say(turn, seat, action.channel, action.text);
      return { state: next, events: turn.events };

    case 'pret': {
      if (next.phase.kind !== 'revelation') {
        throw new IllegalActionError('Ce n’est pas le moment', 'wrong-phase');
      }
      if (!next.phase.ready.includes(seat)) next.phase.ready.push(seat);
      break;
    }

    case 'cupidon': {
      requireStep(next, 'principale');
      requireRole(next, seat, 'cupidon');
      requirePowers(next);
      if (next.day !== 1) throw new IllegalActionError('Cupidon ne tire qu’une fois', 'wrong-phase');
      if (action.a === action.b) throw new IllegalActionError('Il faut deux personnes', 'target');
      requireLiving(next, action.a, 'Le premier amoureux');
      requireLiving(next, action.b, 'Le second amoureux');
      next.night.lovers = [Math.min(action.a, action.b), Math.max(action.a, action.b)];
      markActed(next, seat);
      break;
    }

    case 'proteger': {
      requireStep(next, 'principale');
      requireRole(next, seat, 'salvateur');
      requirePowers(next);
      requireLiving(next, action.target, 'La personne protégée');
      if (action.target === next.lastProtected) {
        throw new IllegalActionError('Pas deux nuits de suite la même personne', 'target');
      }
      next.night.protect = action.target;
      markActed(next, seat);
      break;
    }

    case 'sonder': {
      requireStep(next, 'principale');
      requireRole(next, seat, 'voyante');
      requirePowers(next);
      requireLiving(next, action.target, 'La personne sondée');
      if (action.target === seat) throw new IllegalActionError('Vous vous connaissez déjà', 'target');
      next.night.inspect = action.target;
      markActed(next, seat);
      break;
    }

    case 'devorer': {
      requireStep(next, 'principale');
      requirePack(next, seat);
      if (action.target !== null) {
        requireLiving(next, action.target, 'La proie');
        // Le Loup Blanc est de la meute : on ne le vise pas plus qu'un autre
        // loup — ce serait le désigner (R96).
        if (campOf(playerAt(next, action.target).role) === 'loups') {
          throw new IllegalActionError('Les loups ne se mangent pas entre eux', 'target');
        }
      }
      // Un loup peut changer d'avis tant que la meute n'a pas fini de voter.
      next.night.wolfVotes[seat] = action.target;
      markActed(next, seat);
      break;
    }

    case 'sorciere': {
      requireStep(next, 'sorciere');
      requireRole(next, seat, 'sorciere');
      requirePowers(next);
      if (action.save && (!next.potions.vie || next.night.victim === null)) {
        throw new IllegalActionError('Rien à sauver', 'potion');
      }
      // Certaines tables lui interdisent de se sauver elle-même : la règle
      // officielle 2016, que l'option de table peut restaurer (R43).
      if (action.save && next.night.victim === seat && !next.options.sorciereSeSauve) {
        throw new IllegalActionError('La Sorcière ne peut pas se sauver', 'potion');
      }
      if (action.kill !== null) {
        if (!next.potions.mort) throw new IllegalActionError('La potion de mort est vide', 'potion');
        requireLiving(next, action.kill, 'La cible');
      }
      next.night.witchSave = action.save;
      next.night.witchKill = action.kill;
      markActed(next, seat);
      break;
    }

    case 'tirer': {
      if (next.phase.kind !== 'chasseur' || next.phase.seat !== seat) {
        throw new IllegalActionError('Ce n’est pas à vous de tirer', 'not-your-turn');
      }
      if (action.target !== null) {
        requireLiving(next, action.target, 'La cible');
        if (action.target === seat) throw new IllegalActionError('Pas sur vous-même', 'target');
      }
      next.log.push({ day: next.day, type: 'tir', target: action.target });
      turn.events.push({ type: 'tir', hunter: seat, target: action.target });
      if (action.target !== null) {
        const { deaths, suites } = killAll(next, [{ seat: action.target, cause: 'chasseur' }]);
        turn.events.push({ type: 'morts', deaths }, ...suites);
      }
      proceed(turn);
      return { state: next, events: turn.events };
    }

    case 'marquer': {
      requireStep(next, 'principale');
      requireRole(next, seat, 'corbeau');
      requirePowers(next);
      // Un vivant, lui compris — ou personne : la marque ne dit jamais qui
      // l'a posée (R93).
      if (action.target !== null) requireLiving(next, action.target, 'La personne marquée');
      next.night.raven = action.target;
      markActed(next, seat);
      break;
    }

    case 'trahir': {
      requireStep(next, 'loupBlanc');
      requireRole(next, seat, 'loupBlanc');
      if (action.target !== null) {
        requireLiving(next, action.target, 'La proie');
        if (action.target === seat || playerAt(next, action.target).role !== 'loup') {
          throw new IllegalActionError('Le Loup Blanc ne dévore qu’un autre loup', 'target');
        }
      }
      next.night.whiteKill = action.target;
      markActed(next, seat);
      break;
    }

    case 'designerVotants': {
      if (next.phase.kind !== 'bouc' || next.phase.seat !== seat) {
        throw new IllegalActionError('Ce n’est pas à vous de désigner', 'not-your-turn');
      }
      // `parseAction` a rendu des sièges entiers et distincts (R102) ; reste
      // la règle : au moins un vivant (R94).
      if (action.seats.length === 0) {
        throw new IllegalActionError('Désignez au moins un votant', 'target');
      }
      for (const designe of action.seats) requireLiving(next, designe, 'Le votant');
      designate(
        turn,
        seat,
        [...action.seats].sort((a, b) => a - b),
      );
      return { state: next, events: turn.events };
    }

    case 'successeur': {
      if (next.phase.kind !== 'succession' || next.phase.seat !== seat) {
        throw new IllegalActionError('Ce n’est pas à vous de désigner', 'not-your-turn');
      }
      requireLiving(next, action.target, 'Le successeur');
      passCaptaincy(turn, seat, action.target);
      return { state: next, events: turn.events };
    }

    case 'voter': {
      const phase = next.phase;
      if (phase.kind === 'election') {
        requireLiving(next, seat, 'L’électeur');
        if (action.target !== null) requireLiving(next, action.target, 'Le candidat');
        phase.votes[seat] = action.target;
      } else if (phase.kind === 'jour') {
        const voter = playerAt(next, seat);
        if (!voter.alive || !voter.canVote) {
          throw new IllegalActionError('Vous ne votez pas', 'cannot-vote');
        }
        // Le lendemain du Bouc, seuls ses désignés votent (R94).
        if (next.votants !== null && !next.votants.includes(seat)) {
          throw new IllegalActionError('Le Bouc émissaire ne vous a pas désigné', 'cannot-vote');
        }
        if (action.target !== null) {
          requireLiving(next, action.target, 'L’accusé');
          if (action.target === seat) throw new IllegalActionError('Pas contre vous-même', 'target');
        }
        phase.votes[seat] = action.target;
      } else {
        throw new IllegalActionError('Ce n’est pas le moment de voter', 'wrong-phase');
      }
      break;
    }
  }

  settle(turn);
  return { state: next, events: turn.events };
}

/**
 * Le temps de la phase est écoulé : on la clôt avec ce qui a été joué.
 *
 * Qui n'a pas agi n'agit pas. Un loup muet ne vote pour personne, une Voyante
 * endormie ne voit rien, un village qui n'a pas voté n'exécute personne.
 *
 * `armedSeq` est le numéro de la phase qui a armé la minuterie : une minuterie
 * en retard arrive après que la phase a déjà été clôturée — par une action,
 * ou par une autre minuterie — et ne doit alors rien clôturer du tout.
 *
 * `closure.abandons` : les sièges que le serveur dit partis depuis
 * `ABANDON_MS` (R101). Ils meurent d'abandon **d'abord**, à l'échéance, puis
 * la phase se clôt entre vivants : une voix ou une cible d'un parti ne compte
 * plus. Si ces morts décident la partie — déclencheurs vidés (R50) —, elle
 * s'achève aussitôt, la nuit comprise ; sinon la nuit suit son cours, et ce
 * qu'elles ont déclenché attend l'aube.
 *
 * La forme `timeoutPhase(state, rng, armedSeq)` est celle d'avant D20 : le
 * `Rng` n'est plus lu dès que l'état porte son aléa (R104).
 */
export function timeoutPhase(state: GameState, armedSeq: number, closure?: PhaseClosure): Step;
/** @deprecated Depuis D20, l'aléa vit dans l'état : `timeoutPhase(state, armedSeq, closure?)`. */
export function timeoutPhase(state: GameState, rng: Rng, armedSeq: number, closure?: PhaseClosure): Step;
export function timeoutPhase(
  state: GameState,
  rngOrSeq: Rng | number,
  seqOrClosure?: number | PhaseClosure,
  legacyClosure?: PhaseClosure,
): Step {
  const legacy = typeof rngOrSeq === 'number' ? undefined : rngOrSeq;
  const armedSeq = typeof rngOrSeq === 'number' ? rngOrSeq : seqOrClosure;
  const closure = typeof rngOrSeq === 'number' ? (seqOrClosure as PhaseClosure | undefined) : legacyClosure;
  if (state.over) throw new IllegalActionError('La partie est terminée', 'over');
  if (state.phaseSeq !== armedSeq) {
    throw new IllegalActionError('Cette minuterie ne concerne plus la phase en cours', 'stale');
  }
  const abandons: unknown = closure?.abandons;
  const turn: Turn = { state: cloneForTurn(state, legacy), events: [] };
  if (Array.isArray(abandons) && abandons.length > 0) {
    abandonSeats(turn, abandons as unknown[]);
    // Au cœur de la nuit, rien ne regarde la victoire avant l'aube : les
    // morts d'abandon qui la décident la closent ici. Le jour, la clôture
    // s'en charge elle-même, après le dépouillement (R50, R72).
    const decided = turn.state.triggers.length === 0 ? winnerOf(turn.state) : null;
    if (turn.state.phase.kind === 'nuit' && decided !== null) {
      finish(turn, decided);
      return { state: turn.state, events: turn.events };
    }
  }
  closePhase(turn);
  return { state: turn.state, events: turn.events };
}

/** Ce que le serveur ajoute à une clôture de phase. */
export interface PhaseClosure {
  /**
   * Les sièges vivants absents depuis `ABANDON_MS` : ils meurent d'abandon
   * avant la clôture (R101). Les sièges morts ou inconnus sont ignorés ; sans
   * l'option `abandon`, la liste entière l'est.
   */
  abandons?: readonly number[];
}
