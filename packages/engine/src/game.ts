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
 * modifie l'état reçu, aucune ne lit l'horloge, aucune ne tire au hasard sans
 * passer par le `Rng` injecté : une partie se rejoue à l'identique.
 *
 * Le meneur de jeu, c'est ce fichier. Tout ce qu'il ferait autour d'une table —
 * appeler les rôles, compter les voix, annoncer les morts, rappeler au Chasseur
 * qu'il doit tirer — est ici, et nulle part ailleurs.
 */

import { compositionFor } from './options.js';
import {
  IllegalActionError,
  type Action,
  type ChatChannel,
  type Death,
  type DeathCause,
  type GameEvent,
  type GameOptions,
  type GameState,
  type NightChoices,
  type PlayerState,
  type RoleId,
  type Rng,
  type Step,
  type Winner,
} from './types.js';

/** Le fil garde les derniers messages, pas tous : l'état voyage à chaque action. */
export const MAX_CHAT_MESSAGES = 300;
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

export function createGame(setup: { players: number; options: GameOptions }, rng: Rng): Step {
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

/** Qui joue pendant l'étape principale de la nuit. */
function principalActors(state: GameState): number[] {
  const seats = [
    ...(state.day === 1 ? livingWith(state, 'cupidon') : []),
    ...livingWith(state, 'salvateur'),
    ...livingWith(state, 'voyante'),
    ...livingWith(state, 'loup'),
  ];
  return seats.sort((a, b) => a - b);
}

function voters(state: GameState): number[] {
  return state.players.filter((p) => p.alive && p.canVote).map((p) => p.seat);
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
      return livingWith(state, 'sorciere').filter((seat) => !phase.acted.includes(seat));
    case 'chasseur':
    case 'succession':
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
 * Durée de la phase en cours, en millisecondes, ou `0` si elle n'en a pas.
 *
 * Prend le `Rng` pour les étapes fantômes : leur durée doit être imprévisible,
 * sans quoi elle trahirait la mort du rôle aussi sûrement qu'un saut.
 */
export function phaseBudgetMs(state: GameState, rng: Rng): number {
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      return REVEAL_MS;
    case 'nuit':
      if (phase.step === 'sorciere' && livingWith(state, 'sorciere').length === 0) {
        return GHOST_STEP_MS.min + rng.nextInt(GHOST_STEP_MS.spread);
      }
      return state.options.tempsNuit * 1000;
    case 'chasseur':
    case 'succession':
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
  rng: Rng;
}

function enter(turn: Turn, phase: GameState['phase']): void {
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
  enter(turn, { kind: 'nuit', step: 'principale', acted: [] });
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

function pick<T>(items: T[], rng: Rng): T | null {
  if (items.length === 0) return null;
  return items[rng.nextInt(items.length)] ?? null;
}

function closePrincipal(turn: Turn): void {
  const { state, rng } = turn;
  const night = state.night;

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

  // Seules comptent les voix des loups encore en vie.
  const tally: Record<number, number> = {};
  for (const wolf of livingWith(state, 'loup')) {
    const target = night.wolfVotes[wolf];
    if (target === undefined || target === null) continue;
    tally[target] = (tally[target] ?? 0) + 1;
  }
  // Une égalité entre loups se tranche au sort : la meute a faim, elle ne
  // renonce pas faute d'accord.
  night.victim = pick(leaders(tally).seats, rng);
  state.log.push({ day: state.day, type: 'loups', target: night.victim });

  if (inGame(state, 'sorciere')) {
    enter(turn, { kind: 'nuit', step: 'sorciere', acted: [] });
  } else {
    resolveNight(turn);
  }
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
    if (!shielded && !night.witchSave) victims.push({ seat: night.victim, cause: 'loups' });
  }
  if (night.witchKill !== null) {
    state.potions.mort = false;
    state.log.push({ day: state.day, type: 'poison', target: night.witchKill });
    victims.push({ seat: night.witchKill, cause: 'poison' });
  }

  const deaths: Death[] = [];
  for (const victim of victims) kill(state, victim.seat, victim.cause, deaths);
  turn.events.push(deaths.length > 0 ? { type: 'morts', deaths } : { type: 'aube-paisible' });

  state.resume = 'jour';
  proceed(turn);
}

/**
 * Tue un joueur, et tout ce qui s'ensuit.
 *
 * L'amoureux survivant meurt de chagrin dans la foulée. Le Chasseur et le
 * capitaine laissent un déclencheur, traité avant de reprendre le jeu.
 */
function kill(state: GameState, seat: number, cause: DeathCause, out: Death[]): void {
  const player = state.players[seat];
  if (!player?.alive) return;
  player.alive = false;
  out.push({ seat, cause, role: state.options.revelerRoles ? player.role : null });
  state.log.push({ day: state.day, type: 'mort', seat, cause });

  if (player.role === 'chasseur') {
    // Le poison étouffe le Chasseur, et le chagrin ne laisse pas de souffle
    // pour viser : pas de tir. L'option de table rouvre la main pour toute
    // mort (R48) — autour d'une table, c'est le meneur qui en décide.
    const peutTirer =
      cause === 'loups' || cause === 'vote' || cause === 'chasseur' || state.options.chasseurEmpoisonne;
    if (peutTirer) state.triggers.push({ kind: 'chasseur', seat });
  }
  if (state.captain === seat) state.triggers.push({ kind: 'succession', seat });

  const lovers = state.lovers;
  if (lovers?.includes(seat)) {
    const other = lovers[0] === seat ? lovers[1] : lovers[0];
    kill(state, other, 'chagrin', out);
  }
}

/**
 * Qui a gagné, s'il y a un gagnant.
 *
 * Évalué seulement quand plus aucun déclencheur n'attend : le Chasseur tire
 * toujours, même quand son camp a déjà perdu, et son tir peut tout changer.
 */
export function winnerOf(state: GameState): Winner | null {
  const alive = state.players.filter((player) => player.alive);
  if (alive.length === 0) return 'personne';

  const lovers = state.lovers;
  if (lovers) {
    const [a, b] = lovers.map((seat) => playerAt(state, seat));
    const mixed = a && b && (a.role === 'loup') !== (b.role === 'loup');
    if (mixed && alive.length === 2 && alive.every((p) => lovers.includes(p.seat))) {
      return 'amoureux';
    }
  }

  const wolves = alive.filter((player) => player.role === 'loup').length;
  if (wolves === 0) return 'village';
  if (wolves === alive.length) return 'loups';
  return null;
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
      // Ouvrir sa phase, c'est le désigner à toute la table : la carte se
      // retourne même si l'option ne révèle pas les morts (R46). Qu'il tire
      // ou emporte sa balle, le village a reconnu son Chasseur.
      playerAt(state, trigger.seat).revealed = true;
      enter(turn, { kind: 'chasseur', seat: trigger.seat });
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
    state.winner = winner;
    state.over = true;
    enter(turn, { kind: 'fin' });
    turn.events.push({ type: 'fin', winner });
    return;
  }

  if (state.resume === 'nuit') {
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
  const { state, rng } = turn;
  if (state.phase.kind !== 'election') return;
  const tally: Record<number, number> = {};
  for (const target of Object.values(state.phase.votes)) {
    if (target !== null) tally[target] = (tally[target] ?? 0) + 1;
  }
  const elected = pick(leaders(tally).seats, rng);
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

  const tally: Record<number, number> = {};
  for (const [key, target] of Object.entries(state.phase.votes)) {
    if (target === null) continue;
    const weight = Number(key) === state.captain ? 2 : 1;
    tally[target] = (tally[target] ?? 0) + weight;
  }
  // Une égalité ne condamne personne : le village n'exécute pas au hasard.
  const { seats } = leaders(tally);
  const executed = seats.length === 1 ? (seats[0] ?? null) : null;

  state.log.push({ day: state.day, type: 'vote', tally, executed });
  turn.events.push({ type: 'vote', tally, executed });

  if (executed !== null) {
    const condemned = playerAt(state, executed);
    if (condemned.role === 'idiot' && !condemned.revealed) {
      // L'Idiot du village est reconnu et gracié, mais ne votera plus.
      condemned.revealed = true;
      condemned.canVote = false;
      state.log.push({ day: state.day, type: 'grace', seat: executed });
      turn.events.push({ type: 'grace', seat: executed });
    } else {
      const deaths: Death[] = [];
      kill(state, executed, 'vote', deaths);
      turn.events.push({ type: 'morts', deaths });
    }
  }

  state.resume = 'nuit';
  proceed(turn);
}

/** Clôt la phase quand plus personne n'a rien à faire. */
function settle(turn: Turn): void {
  if (pendingActors(turn.state).length > 0) return;
  closePhase(turn);
}

function closePhase(turn: Turn): void {
  const { state, rng } = turn;
  const phase = state.phase;
  switch (phase.kind) {
    case 'revelation':
      // La révélation close, la suite dépend des options : l'élection
      // pré-nocturne, ou directement la nuit.
      proceed(turn);
      return;
    case 'nuit':
      if (phase.step === 'principale') closePrincipal(turn);
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
      const heir = pick(livingSeats(state), rng);
      passCaptaincy(turn, phase.seat, heir);
      return;
    }
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

function requireStep(state: GameState, step: 'principale' | 'sorciere'): void {
  if (state.phase.kind !== 'nuit' || state.phase.step !== step) {
    throw new IllegalActionError('Ce n’est pas le moment', 'wrong-phase');
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
  const daytime = kind === 'jour' || kind === 'election' || kind === 'chasseur' || kind === 'succession';
  if (state.options.chat && daytime) channels.push('village');
  if (player.role === 'loup' && kind === 'nuit') channels.push('loups');
  const lovers = state.lovers;
  if (lovers?.includes(seat) && lovers.every((s) => isAlive(state, s))) channels.push('amoureux');
  return channels;
}

function say(turn: Turn, seat: number, channel: ChatChannel, raw: string): void {
  const { state } = turn;
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
  if (text.length === 0) throw new IllegalActionError('Message vide', 'empty');
  if (!speakableChannels(state, seat).includes(channel)) {
    throw new IllegalActionError('Vous ne pouvez pas parler ici', 'channel');
  }
  // Numérotation par canal : une numérotation globale raconterait à chacun,
  // par ses trous, l'activité des canaux qu'il ne lit pas.
  const id = state.nextMessageId[channel] ?? 1;
  state.nextMessageId[channel] = id + 1;
  state.chat.push({ id, channel, seat, text, day: state.day });
  if (state.chat.length > MAX_CHAT_MESSAGES) state.chat.splice(0, state.chat.length - MAX_CHAT_MESSAGES);
}

export function applyAction(state: GameState, action: Action, rng: Rng, seat: number): Step {
  if (state.over && action.type !== 'dire') {
    throw new IllegalActionError('La partie est terminée', 'over');
  }
  const turn: Turn = { state: structuredClone(state), events: [], rng };
  const next = turn.state;
  playerAt(next, seat);

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
      requireLiving(next, action.target, 'La personne sondée');
      if (action.target === seat) throw new IllegalActionError('Vous vous connaissez déjà', 'target');
      next.night.inspect = action.target;
      markActed(next, seat);
      break;
    }

    case 'devorer': {
      requireStep(next, 'principale');
      requireRole(next, seat, 'loup');
      if (action.target !== null) {
        requireLiving(next, action.target, 'La proie');
        if (playerAt(next, action.target).role === 'loup') {
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
        const deaths: Death[] = [];
        kill(next, action.target, 'chasseur', deaths);
        turn.events.push({ type: 'morts', deaths });
      }
      proceed(turn);
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
 */
export function timeoutPhase(state: GameState, rng: Rng, armedSeq: number): Step {
  if (state.over) throw new IllegalActionError('La partie est terminée', 'over');
  if (state.phaseSeq !== armedSeq) {
    throw new IllegalActionError('Cette minuterie ne concerne plus la phase en cours', 'stale');
  }
  const turn: Turn = { state: structuredClone(state), events: [], rng };
  closePhase(turn);
  return { state: turn.state, events: turn.events };
}
