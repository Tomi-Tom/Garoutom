/**
 * Les rôles de la v2 face au hasard — R87, R88 et R99 sur des milliers de
 * parties.
 *
 * Un joueur aléatoire, qui ne voit que sa `GameView` comme n'importe quel
 * client, joue des parties où l'Ancien, le Corbeau, le Bouc émissaire, la
 * Petite Fille et le Loup Blanc se croisent à toutes les tailles de table.
 * Deux promesses sont vérifiées pas à pas :
 *
 * - **le silence** (R88) : chaque rôle qu'un siège voit a une raison d'être
 *   vu — sa propre carte, une carte retournée, la meute pour un loup (où le
 *   Loup Blanc passe pour un loup ordinaire), un sondage de la Voyante ;
 *   l'espionnage n'appartient qu'à la Petite Fille, à la bonne étape ; ce qui
 *   est public est le même pour tous ; aucun évènement ne porte un rôle que
 *   la table cache (R87) ;
 * - **la fin** : aucune partie ne boucle — le huis clos du Loup Blanc a sa
 *   borne (R99), et tout le reste finit sous les coups du hasard.
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  HUIS_CLOS_NUITS,
  pendingActors,
  timeoutPhase,
} from './game.js';
import { compositionFor, DEFAULT_OPTIONS, MIN_PLAYERS, randomComposition } from './options.js';
import { createSeededRng } from './rng.js';
import {
  campOf,
  OPTIONAL_ROLES,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type Rng,
  type Winner,
} from './types.js';
import { viewFor, type GameView } from './views.js';

/* ------------------------------------------------------------------ */
/* Une table tirée au sort                                              */
/* ------------------------------------------------------------------ */

/**
 * Une table de la v2 : options au hasard, composition du générateur avec
 * les optionnels (R100), puis chaque optionnel absent ajouté une fois sur
 * deux quand R13 le permet — même sous dix joueurs.
 */
function tableAuHasard(graine: number, joueurs: number): GameOptions {
  const r = createSeededRng(graine * 31 + 17);
  const oui = () => r.nextInt(2) === 0;
  const base: GameOptions = {
    ...DEFAULT_OPTIONS,
    capitaine: oui(),
    capitaineAvantNuit1: oui(),
    chasseurEmpoisonne: oui(),
    sorciereSeSauve: oui(),
    ancienRancunier: oui(),
    chat: oui(),
    revelerRoles: oui(),
    mortsVoientTout: oui(),
  };
  const { loups, roles } = randomComposition(joueurs, r, { optionnels: true });
  const retenus = [...roles];
  for (const role of OPTIONAL_ROLES) {
    if (retenus.includes(role) || oui()) continue;
    try {
      compositionFor(joueurs, { ...base, auto: false, loups, roles: [...retenus, role] });
      retenus.push(role);
    } catch {
      // Injouable à cette table (R13).
    }
  }
  return { ...base, auto: false, loups, roles: retenus };
}

/* ------------------------------------------------------------------ */
/* Un joueur qui ne sait que ce que sa vue lui dit                      */
/* ------------------------------------------------------------------ */

function pioche(items: number[], rng: Rng): number | null {
  return items.length === 0 ? null : (items[rng.nextInt(items.length)] ?? null);
}

/** Un coup légal tiré au hasard dans la vue, ou `null`. */
function coupAuHasard(vue: GameView, rng: Rng): Action | null {
  const prompt = vue.prompt;
  if (!prompt || !vue.you || vue.acted) return null;
  const moi = vue.you.seat;
  const vivants = vue.players.filter((p) => p.alive).map((p) => p.seat);
  const autres = vivants.filter((s) => s !== moi);
  const parfois = (sur: number) => rng.nextInt(sur) === 0;
  switch (prompt.kind) {
    case 'pret':
      return { type: 'pret' };
    case 'cupidon': {
      const a = pioche(vivants, rng);
      const b = pioche(vivants.filter((s) => s !== a), rng);
      return a === null || b === null ? null : { type: 'cupidon', a, b };
    }
    case 'proteger': {
      const t = pioche(vivants.filter((s) => s !== prompt.forbidden), rng);
      return t === null ? null : { type: 'proteger', target: t };
    }
    case 'sonder': {
      const t = pioche(autres, rng);
      return t === null ? null : { type: 'sonder', target: t };
    }
    case 'devorer': {
      const meute = new Set(vue.pack?.seats ?? [moi]);
      return { type: 'devorer', target: parfois(8) ? null : pioche(vivants.filter((s) => !meute.has(s)), rng) };
    }
    case 'sorciere':
      return {
        type: 'sorciere',
        save: prompt.vie && prompt.victim !== null && prompt.peutSeSauver && parfois(2),
        kill: prompt.mort && parfois(3) ? pioche(vivants, rng) : null,
      };
    case 'tirer':
      return { type: 'tirer', target: parfois(8) ? null : pioche(autres, rng) };
    case 'successeur': {
      const t = pioche(autres, rng);
      return t === null ? null : { type: 'successeur', target: t };
    }
    case 'voter':
      return { type: 'voter', target: parfois(6) ? null : pioche(prompt.election ? vivants : autres, rng) };
    case 'marquer':
      return { type: 'marquer', target: parfois(4) ? null : pioche(vivants, rng) };
    case 'trahir': {
      const meute = new Set(vue.pack?.seats ?? []);
      return { type: 'trahir', target: parfois(3) ? null : pioche(autres.filter((s) => meute.has(s)), rng) };
    }
    case 'designerVotants': {
      const choisis = vivants.filter(() => parfois(2));
      const seats = choisis.length > 0 ? choisis : [vivants[0]!];
      return { type: 'designerVotants', seats };
    }
    case 'flairer':
      // Rôle de la v3 (R107) : une table de la v2 n'en compte jamais, ce banc
      // n'en verra donc jamais la consigne. Le cas n'existe que pour le
      // compilateur, qui exige l'énumération complète.
      return null;
    case 'voler':
    case 'seRanger':
    case 'designerModele':
      // Rôles de la v3 (R110, R111, R112) : une table de la v2 n'en compte
      // jamais, ce banc n'en verra donc jamais les consignes. Les cas
      // n'existent que pour le compilateur, qui exige l'énumération complète.
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Les invariants du silence                                           */
/* ------------------------------------------------------------------ */

/** Ce qu'une vue dit à tous les sièges à la fois : ce doit être pareil pour chacun. */
function publique(vue: GameView): unknown {
  return {
    phase: vue.phase,
    step: vue.step,
    day: vue.day,
    captain: vue.captain,
    voted: vue.voted,
    over: vue.over,
    winner: vue.winner,
    marque: vue.marque,
    votants: vue.votants,
    pouvoirsPerdus: vue.pouvoirsPerdus,
    vivants: vue.players.map((p) => p.alive),
  };
}

/** Le rôle qui ouvre chaque consigne — et la phase où elle a lieu d'être. */
function consigneLegitime(state: GameState, seat: number, kind: string): boolean {
  const joueur = state.players[seat]!;
  const phase = state.phase;
  switch (kind) {
    case 'devorer':
      return campOf(joueur.role) === 'loups' && phase.kind === 'nuit' && phase.step === 'principale';
    case 'trahir':
      return joueur.role === 'loupBlanc' && phase.kind === 'nuit' && phase.step === 'loupBlanc';
    case 'marquer':
      return joueur.role === 'corbeau' && !state.pouvoirsPerdus;
    case 'sonder':
      return joueur.role === 'voyante' && !state.pouvoirsPerdus;
    case 'proteger':
      return joueur.role === 'salvateur' && !state.pouvoirsPerdus;
    case 'cupidon':
      return joueur.role === 'cupidon' && state.day === 1;
    case 'sorciere':
      return joueur.role === 'sorciere' && !state.pouvoirsPerdus;
    case 'designerVotants':
      return phase.kind === 'bouc' && phase.seat === seat && joueur.role === 'bouc';
    default:
      return true;
  }
}

/** Vérifie la vue de chaque siège sur un état ; rend le nombre de vues vérifiées. */
function verifierLeSilence(state: GameState): number {
  const publiques = new Set<string>();
  const vues = [null, ...state.players.map((p) => p.seat)].map((seat) => ({ seat, vue: viewFor(state, seat) }));
  for (const { seat, vue } of vues) {
    publiques.add(JSON.stringify(publique(vue)));
    if (!state.over) expect(vue.log).toBeNull();
    if (seat === null) {
      expect(vue.prompt).toBeNull();
      expect(vue.pack).toBeNull();
      expect(vue.espionnage).toBeNull();
      continue;
    }
    const moi = state.players[seat]!;
    const omniscient = state.over || (!moi.alive && state.options.mortsVoientTout);
    const loupVivant = moi.alive && campOf(moi.role) === 'loups';
    if (vue.prompt) expect(consigneLegitime(state, seat, vue.prompt.kind)).toBe(true);
    // L'espionnage : la Petite Fille vivante, pendant l'étape principale.
    const espionne =
      moi.role === 'petiteFille' &&
      moi.alive &&
      !state.pouvoirsPerdus &&
      !state.over &&
      state.phase.kind === 'nuit' &&
      state.phase.step === 'principale';
    expect(vue.espionnage !== null).toBe(espionne);
    if (vue.espionnage) {
      // Des nombres de voix par cible — jamais une cible de la meute.
      for (const cible of Object.keys(vue.espionnage).map(Number)) {
        expect(campOf(state.players[cible]!.role)).toBe('village');
      }
    }
    if (omniscient) continue;
    expect(vue.pack !== null).toBe(loupVivant);
    const sondes = new Map(
      moi.role === 'voyante' ? state.inspections.map((i) => [i.target, i.role] as const) : [],
    );
    for (const autre of vue.players) {
      if (autre.seat === seat || autre.role === null) continue;
      const vrai = state.players[autre.seat]!;
      if (vrai.revealed || (!vrai.alive && state.options.revelerRoles)) {
        expect(autre.role).toBe(vrai.role);
      } else if (loupVivant && campOf(vrai.role) === 'loups') {
        // La meute se reconnaît — et le Loup Blanc passe pour un loup (R96).
        expect(autre.role).toBe('loup');
      } else if (sondes.has(autre.seat)) {
        expect(autre.role).toBe(sondes.get(autre.seat));
      } else {
        throw new Error(`Le siège ${String(seat)} voit le rôle du siège ${String(autre.seat)} sans raison`);
      }
    }
  }
  expect(publiques.size).toBe(1);
  return vues.length;
}

/** Aucun évènement ne porte un secret (R87). */
function verifierLesEvenements(state: GameState, evenements: GameEvent[]): void {
  for (const e of evenements) {
    switch (e.type) {
      case 'corbeau':
        expect(Object.keys(e).sort()).toEqual(['target', 'type']);
        break;
      case 'rancune':
      case 'bouc':
        expect(Object.keys(e).sort()).toEqual(['seat', 'type']);
        break;
      case 'votants':
        expect(Object.keys(e).sort()).toEqual(['bouc', 'seats', 'type']);
        break;
      case 'phase':
        // L'étape du Loup Blanc : les nuits paires, s'il est de la distribution — mort ou vif.
        if (e.step === 'loupBlanc') {
          expect(e.day % 2).toBe(0);
          expect(state.players.some((p) => p.role === 'loupBlanc')).toBe(true);
        }
        break;
      case 'morts':
        if (!state.options.revelerRoles) for (const mort of e.deaths) expect(mort.role).toBeNull();
        break;
      default:
        break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Le banc                                                              */
/* ------------------------------------------------------------------ */

const PAS_MAX = 5000;

interface Bilan {
  winner: Winner | null;
  jours: number;
  vuesVerifiees: number;
  etapesDuLoupBlanc: number;
}

/** Ce que le banc ajoute à une partie au hasard. */
interface Reglage {
  /** À une échéance sur cinq, un vivant tiré au sort est parti depuis trop longtemps (R101). */
  abandons?: boolean;
  /** À chaque pas, l'état est sérialisé puis relu, comme un magasin le ferait (R104). */
  reprise?: boolean;
  /** Reçoit chaque état, sérialisé, pas après pas. */
  trace?: string[];
}

function jouer(graine: number, verifier: boolean, reglage: Reglage = {}): Bilan {
  const joueurs = MIN_PLAYERS + (graine % 13);
  const cerveau = createSeededRng(graine ^ 0x5eed);
  // La reprise part de la graine nue : aucun `Rng` ne survit hors de l'état,
  // tout l'aléa de la partie doit voyager avec lui (R104).
  const debut = createGame(
    { players: joueurs, options: tableAuHasard(graine, joueurs) },
    reglage.reprise ? graine : createSeededRng(graine),
  );
  let state = debut.state;
  let vuesVerifiees = 0;
  let etapesDuLoupBlanc = 0;
  const suivre = (evenements: GameEvent[]) => {
    if (verifier) verifierLesEvenements(state, evenements);
    etapesDuLoupBlanc += evenements.filter((e) => e.type === 'phase' && e.step === 'loupBlanc').length;
    reglage.trace?.push(JSON.stringify({ state, evenements }));
  };
  suivre(debut.events);

  for (let pas = 0; pas < PAS_MAX; pas += 1) {
    // Le serveur range l'état, s'arrête, le relit : rien ne doit changer.
    if (reglage.reprise) state = JSON.parse(JSON.stringify(state)) as GameState;
    if (verifier) vuesVerifiees += verifierLeSilence(state);
    if (state.over) return { winner: state.winner, jours: state.day, vuesVerifiees, etapesDuLoupBlanc };
    let joue = false;
    for (const seat of pendingActors(state)) {
      const action = coupAuHasard(viewFor(state, seat), cerveau);
      if (!action) continue;
      const suite = applyAction(state, action, seat);
      state = suite.state;
      suivre(suite.events);
      joue = true;
      break;
    }
    if (!joue) {
      const vivants = state.players.filter((p) => p.alive).map((p) => p.seat);
      const parti = reglage.abandons && cerveau.nextInt(5) === 0 ? pioche(vivants, cerveau) : null;
      const suite = timeoutPhase(state, state.phaseSeq, parti === null ? undefined : { abandons: [parti] });
      state = suite.state;
      suivre(suite.events);
    }
  }
  throw new Error(`Partie interminable : graine ${String(graine)}, jour ${String(state.day)}`);
}

describe('R88/R87 — le silence tient avec les rôles de la v2', () => {
  it('R88 — chaque rôle vu a sa raison, l’espionnage reste à la Petite Fille, le public est commun', () => {
    let vues = 0;
    for (let graine = 1; graine <= 120; graine += 1) vues += jouer(graine, true).vuesVerifiees;
    expect(vues).toBeGreaterThan(20_000);
  }, 120_000);
});

describe('R99 — aucune partie ne boucle', () => {
  it('R99 — trois mille parties au hasard, rôles de la v2 compris, finissent toutes', () => {
    const vainqueurs: Record<string, number> = {};
    let plusLongue = 0;
    let nuitsBlanches = 0;
    for (let graine = 1; graine <= 3000; graine += 1) {
      const bilan = jouer(graine, false);
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      plusLongue = Math.max(plusLongue, bilan.jours);
      nuitsBlanches += bilan.etapesDuLoupBlanc;
    }
    // Toutes les issues de la v2 se produisent, Loup Blanc compris.
    for (const issue of ['village', 'loups', 'loupBlanc'] as const) {
      expect(vainqueurs[issue] ?? 0).toBeGreaterThan(0);
    }
    expect(nuitsBlanches).toBeGreaterThan(0);
    expect(HUIS_CLOS_NUITS).toBe(3);
    console.log(
      `Terminaison v2 : 3000 parties, vainqueurs ${JSON.stringify(vainqueurs)}, la plus longue ${String(plusLongue)} jours, ` +
        `${String(nuitsBlanches)} étapes du Loup Blanc`,
    );
  }, 120_000);
});

describe('R101 — les morts d’abandon ne cassent ni le silence ni la fin', () => {
  it('R101/R88 — avec des partis, chaque vue garde son silence et aucun évènement n’avoue', () => {
    let vues = 0;
    for (let graine = 1; graine <= 120; graine += 1) vues += jouer(graine, true, { abandons: true }).vuesVerifiees;
    expect(vues).toBeGreaterThan(5_000);
  }, 120_000);

  it('R101/R99 — mille parties semées de partis finissent toutes', () => {
    const vainqueurs: Record<string, number> = {};
    for (let graine = 1; graine <= 1000; graine += 1) {
      const bilan = jouer(graine, false, { abandons: true });
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
    }
    expect(vainqueurs.village ?? 0).toBeGreaterThan(0);
    expect(vainqueurs.loups ?? 0).toBeGreaterThan(0);
  }, 120_000);
});

describe('R104 — l’aléa voyage avec l’état', () => {
  it('R104 — deux mille parties, sérialisées et relues à chaque pas, rejouent exactement la partie continue', () => {
    let pas = 0;
    for (let graine = 1; graine <= 2000; graine += 1) {
      const continue_: string[] = [];
      const reprise: string[] = [];
      const abandons = graine % 2 === 0;
      jouer(graine, false, { abandons, trace: continue_ });
      jouer(graine, false, { abandons, reprise: true, trace: reprise });
      if (reprise.length !== continue_.length || reprise.some((etat, i) => etat !== continue_[i])) {
        // Le détail d'abord, pour lire la divergence.
        const i = reprise.findIndex((etat, k) => etat !== continue_[k]);
        expect({ graine, pas: i, etat: reprise[i] }).toEqual({ graine, pas: i, etat: continue_[i] });
      }
      pas += continue_.length;
    }
    expect(pas).toBeGreaterThan(100_000);
  }, 120_000);

  it('R104 — une partie se rejoue à l’identique depuis la même graine, sans `Rng` en main', () => {
    const a: string[] = [];
    const b: string[] = [];
    jouer(42, false, { abandons: true, trace: a });
    jouer(42, false, { abandons: true, trace: b });
    expect(a).toEqual(b);
    // L'aléa avance dans l'état : deux pas qui tirent ne le laissent pas en place.
    const etats = a.map((t) => (JSON.parse(t) as { state: GameState }).state.rng);
    expect(new Set(etats).size).toBeGreaterThan(1);
  });
});
