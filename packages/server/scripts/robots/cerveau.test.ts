/**
 * Le cerveau des robots face au vrai moteur : des centaines de parties
 * simulées, où chaque coup choisi doit être accepté par `applyAction`.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OPTIONS,
  OPTIONAL_ROLES,
  OPTIONAL_ROLES_V3,
  applyAction,
  compositionFor,
  createGame,
  createSeededRng,
  groupeDe,
  randomComposition,
  timeoutPhase,
  viewFor,
  type ChoosableRoleId,
  type GameOptions,
  type GameState,
  type RoleId,
  type RoomView,
  type Winner,
} from '@garoutom/engine';

import { fuitesDeVue } from '../chaos/invariants.js';
import { cleDeMoment, decider, parler } from './cerveau.js';

const PARTIES = 400;
const PARTIES_V2 = 1500;
const PARTIES_V3 = 800;
const PARTIES_V3_V2 = 800;
const PAS_MAX = 4000;
/**
 * Près de deux mille parties complètes : quelques secondes au repos, bien
 * plus quand les quatre paquets se testent en même temps sur la machine.
 */
const DELAI_SIMULATION_MS = 60_000;
/**
 * La deuxième vague, elle, balaie chaque vue de chaque siège à chaque pas
 * contre la vérité de l'état : les gardes du banc de chaos tournent aussi
 * sur le moteur seul.
 */
const DELAI_SIMULATION_FUITES_MS = 180_000;

/** La deuxième vague de la v3 : les cinq rôles ouverts après la première. */
const ROLES_V3_VAGUE2 = [
  'voleur',
  'chienLoup',
  'enfantSauvage',
  'soeurs',
  'freres',
] as const satisfies readonly ChoosableRoleId[];

/** La salle, dont les gardes ne lisent que l'échéance. */
const SALLE = { deadline: null } as unknown as RoomView;

interface Bilan {
  winner: Winner | null;
  jours: number;
  coups: number;
  roles: RoleId[];
  /** Combien de fois chaque verbe a été joué — les nouveaux y sont comptés. */
  exercices: Record<string, number>;
}

function optionsDe(graine: number): GameOptions {
  const r = createSeededRng(graine * 7 + 1);
  const oui = () => r.nextInt(2) === 0;
  return {
    ...DEFAULT_OPTIONS,
    capitaine: oui(),
    capitaineAvantNuit1: oui(),
    chasseurEmpoisonne: oui(),
    sorciereSeSauve: oui(),
    chat: oui(),
    revelerRoles: oui(),
    mortsVoientTout: oui(),
  };
}

/**
 * Une table de la v2 : le générateur avec les optionnels (R100), puis chaque
 * rôle optionnel encore absent ajouté une fois sur deux, tant que R13 le
 * permet — de quoi croiser l'Ancien, le Corbeau, le Bouc, la Petite Fille et
 * le Loup Blanc à toutes les tailles de table, même sous dix joueurs.
 */
function optionsV2(graine: number, joueurs: number): GameOptions {
  const r = createSeededRng(graine * 11 + 5);
  const base = optionsDe(graine);
  const { loups, roles } = randomComposition(joueurs, r, { optionnels: true });
  const retenus = [...roles];
  for (const role of OPTIONAL_ROLES) {
    if (retenus.includes(role) || r.nextInt(2) === 1) continue;
    const essai = { ...base, auto: false, loups, roles: [...retenus, role] };
    try {
      compositionFor(joueurs, essai);
      retenus.push(role);
    } catch {
      // Injouable à cette table (R13) : on s'en passe.
    }
  }
  return { ...base, auto: false, loups, roles: retenus, ancienRancunier: r.nextInt(2) === 0 };
}

/**
 * La v3 en tas : les huit rôles des deux vagues par-dessus une table de la
 * v2 — le Renard, l'Ours, le Voleur et les fratries doivent croiser
 * l'Ancien, le Corbeau et le reste, à toutes les tailles. Les places rares
 * vont au premier de la file : chaque rôle prend la tête à son tour (la
 * file tourne avec la graine), sinon le Renard, toujours devant, garde
 * toutes les places et les fratries, trois cartes à elles seules, ne
 * croisent jamais le tas. Les tables trop petites sacrifient un rôle (R13),
 * comme dans `optionsV2`.
 */
function optionsV3(graine: number, joueurs: number): GameOptions {
  const v2 = optionsV2(graine, joueurs);
  const retenus = [...v2.roles];
  const file = OPTIONAL_ROLES_V3.length;
  for (let i = 0; i < file; i += 1) {
    const role = OPTIONAL_ROLES_V3[(i + graine) % file]!;
    if (retenus.includes(role)) continue;
    const essai = { ...v2, roles: [...retenus, role] };
    try {
      compositionFor(joueurs, essai);
      retenus.push(role);
    } catch {
      // Injouable à cette table (R13) : on s'en passe.
    }
  }
  return { ...v2, roles: retenus };
}

/**
 * La deuxième vague de la v3, sans le tas de la v2 : les cinq rôles
 * nouveaux par-dessus une table de base, de la place pour les fratries
 * (R113) à toutes les grandes tables. Le croisement avec l'Ancien et le
 * reste, la suite v3 en tas le fait déjà — ici, c'est la place de chacun
 * qui compte.
 */
function optionsV3V2(graine: number, joueurs: number): GameOptions {
  const base = optionsDe(graine);
  const loups = Math.max(2, Math.min(4, Math.floor(joueurs / 4)));
  const retenus: ChoosableRoleId[] = [];
  for (const role of ROLES_V3_VAGUE2) {
    const essai = { ...base, auto: false, loups, roles: [...retenus, role] };
    try {
      compositionFor(joueurs, essai);
      retenus.push(role);
    } catch {
      // Injouable à cette table (R13) : on s'en passe.
    }
  }
  return { ...base, auto: false, loups, roles: retenus };
}

/** Le mode d'une table simulée : la base, la v2, la v3 en tas, la vague 2 seule. */
type Mode = 'base' | 'v2' | 'v3' | 'v3v2';

/** Joue une partie complète ; lève avec la graine si un coup légal est refusé. */
function jouePartie(graine: number, mode: Mode = 'base', verifieFuites = false): Bilan {
  const cerveau = createSeededRng(graine + 1_000_003);
  const joueurs = 6 + (graine % 13);
  const options =
    mode === 'v3v2'
      ? optionsV3V2(graine, joueurs)
      : mode === 'v3'
        ? optionsV3(graine, joueurs)
        : mode === 'v2'
          ? optionsV2(graine, joueurs)
          : optionsDe(graine);
  // Le chemin du serveur depuis D20 : une graine, puis l'aléa voyage dans l'état.
  let state: GameState = createGame({ players: joueurs, options }, graine).state;
  const roles = state.players.map((p) => p.role);
  let coups = 0;
  const exercices: Record<string, number> = {};
  const sequence: string[] = [];

  for (let pas = 0; pas < PAS_MAX; pas += 1) {
    if (state.over) return { winner: state.winner, jours: state.day, coups, roles, exercices };
    if (verifieFuites) {
      // La vérité, lue dans l'état brut que le banc seul connaît : chaque vue
      // de chaque siège passe les gardes du chaos à chaque pas de la partie.
      // Le numéro du groupe de fratrie suit (D45) : la simulation tient
      // l'état, elle vérifie l'étiquette des messages que le banc, lui, ne
      // peut pas lire.
      const verite = new Map(state.players.map((p) => [p.seat, p.role] as const));
      for (let seat = 0; seat < joueurs; seat += 1) {
        const fuites = fuitesDeVue(viewFor(state, seat), SALLE, verite, seat, groupeDe(state, seat));
        if (fuites.length > 0) {
          throw new Error(
            `Fuite (graine ${String(graine)}, ${String(joueurs)} joueurs, phase ${state.phase.kind}) : ` +
              `${JSON.stringify(fuites)}\nDerniers coups : ${sequence.slice(-6).join(' | ')}`,
          );
        }
      }
    }
    let agi = false;
    for (let seat = 0; seat < joueurs; seat += 1) {
      const vue = viewFor(state, seat);
      const action = decider(vue, cerveau, { graine });
      if (!action) continue;
      sequence.push(`${String(seat)}:${JSON.stringify(action)}`);
      exercices[action.type] = (exercices[action.type] ?? 0) + 1;
      try {
        state = applyAction(state, action, seat).state;
      } catch (error) {
        throw new Error(
          `Coup refusé (graine ${String(graine)}, ${String(joueurs)} joueurs, phase ${state.phase.kind}) : ` +
            `${(error as Error).message}\nDerniers coups : ${sequence.slice(-6).join(' | ')}`,
        );
      }
      coups += 1;
      agi = true;
      break;
    }
    if (!agi) {
      // Plus personne à attendre : la minuterie du serveur clôt la phase.
      state = timeoutPhase(state, state.phaseSeq).state;
    }
  }
  throw new Error(
    `Partie interminable (graine ${String(graine)}, ${String(joueurs)} joueurs, jour ${String(state.day)}, ` +
      `phase ${state.phase.kind}) : ${sequence.slice(-8).join(' | ')}`,
  );
}

describe('cerveau des robots', () => {
  it(`joue ${String(PARTIES)} parties sans coup refusé jusqu'à la fin`, () => {
    const vainqueurs: Record<string, number> = {};
    let jours = 0;
    for (let graine = 1; graine <= PARTIES; graine += 1) {
      const bilan = jouePartie(graine);
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      jours += bilan.jours;
    }
    console.log(
      `Simulation : ${String(PARTIES)} parties, vainqueurs ${JSON.stringify(vainqueurs)}, ` +
        `durée moyenne ${(jours / PARTIES).toFixed(2)} jours`,
    );
  }, DELAI_SIMULATION_MS);

  it(`joue ${String(PARTIES_V2)} parties avec les rôles de la v2, sans coup refusé ni partie sans fin`, () => {
    const vainqueurs: Record<string, number> = {};
    const presences: Record<string, number> = {};
    let jours = 0;
    let plusLongue = 0;
    for (let graine = 1; graine <= PARTIES_V2; graine += 1) {
      const bilan = jouePartie(graine, 'v2');
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      for (const role of OPTIONAL_ROLES) {
        if (bilan.roles.includes(role)) presences[role] = (presences[role] ?? 0) + 1;
      }
      jours += bilan.jours;
      plusLongue = Math.max(plusLongue, bilan.jours);
    }
    // Chaque rôle optionnel a vraiment été joué, souvent.
    for (const role of OPTIONAL_ROLES) expect(presences[role] ?? 0).toBeGreaterThan(PARTIES_V2 / 5);
    console.log(
      `Simulation v2 : ${String(PARTIES_V2)} parties, vainqueurs ${JSON.stringify(vainqueurs)}, ` +
        `rôles joués ${JSON.stringify(presences)}, durée moyenne ${(jours / PARTIES_V2).toFixed(2)} jours, ` +
        `la plus longue ${String(plusLongue)} jours`,
    );
  }, DELAI_SIMULATION_MS);

  it(`joue ${String(PARTIES_V3)} parties avec les rôles de la v3 en tas, sans coup refusé ni partie sans fin`, () => {
    const vainqueurs: Record<string, number> = {};
    const presences: Record<string, number> = {};
    let jours = 0;
    let plusLongue = 0;
    for (let graine = 1; graine <= PARTIES_V3; graine += 1) {
      const bilan = jouePartie(graine, 'v3');
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      for (const role of OPTIONAL_ROLES_V3) {
        if (bilan.roles.includes(role)) presences[role] = (presences[role] ?? 0) + 1;
      }
      jours += bilan.jours;
      plusLongue = Math.max(plusLongue, bilan.jours);
    }
    // Chaque rôle de la v3 a vraiment été joué, souvent. Les Frères
    // prennent trois places à eux seuls (R114) : ils ne croisent le tas que
    // sur les plus grandes tables — la vague 2 seule, ci-dessous, les joue
    // partout et le leur exige.
    for (const role of OPTIONAL_ROLES_V3) {
      expect(presences[role] ?? 0).toBeGreaterThan(role === 'freres' ? PARTIES_V3 / 10 : PARTIES_V3 / 5);
    }
    console.log(
      `Simulation v3 : ${String(PARTIES_V3)} parties, vainqueurs ${JSON.stringify(vainqueurs)}, ` +
        `rôles joués ${JSON.stringify(presences)}, durée moyenne ${(jours / PARTIES_V3).toFixed(2)} jours, ` +
        `la plus longue ${String(plusLongue)} jours`,
    );
  }, DELAI_SIMULATION_MS);

  it(`joue ${String(PARTIES_V3_V2)} parties avec la deuxième vague de la v3 — prompts exercés, terminaison, aucune fuite`, () => {
    const vainqueurs: Record<string, number> = {};
    const presences: Record<string, number> = {};
    const exercices: Record<string, number> = {};
    let jours = 0;
    let plusLongue = 0;
    for (let graine = 1; graine <= PARTIES_V3_V2; graine += 1) {
      const bilan = jouePartie(graine, 'v3v2', true);
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      for (const role of ROLES_V3_VAGUE2) {
        if (bilan.roles.includes(role)) presences[role] = (presences[role] ?? 0) + 1;
      }
      for (const [verbe, n] of Object.entries(bilan.exercices)) {
        exercices[verbe] = (exercices[verbe] ?? 0) + n;
      }
      jours += bilan.jours;
      plusLongue = Math.max(plusLongue, bilan.jours);
    }
    // Chaque rôle de la vague a vraiment été joué, souvent.
    for (const role of ROLES_V3_VAGUE2) expect(presences[role] ?? 0).toBeGreaterThan(PARTIES_V3_V2 / 5);
    // Les trois nouveaux verbes, exercés dans leur phase à presque chaque
    // table qui les compte : le Voleur dès le talon, le Chien-Loup et
    // l'Enfant à leur première nuit (R110, R111, R112).
    expect(exercices.voler ?? 0).toBeGreaterThan(PARTIES_V3_V2 / 2);
    expect(exercices.seRanger ?? 0).toBeGreaterThan(PARTIES_V3_V2 / 2);
    expect(exercices.designerModele ?? 0).toBeGreaterThan(PARTIES_V3_V2 / 2);
    console.log(
      `Simulation v3 vague 2 : ${String(PARTIES_V3_V2)} parties, vainqueurs ${JSON.stringify(vainqueurs)}, ` +
        `rôles joués ${JSON.stringify(presences)}, verbes ${JSON.stringify(exercices)}, ` +
        `durée moyenne ${(jours / PARTIES_V3_V2).toFixed(2)} jours, la plus longue ${String(plusLongue)} jours`,
    );
  }, DELAI_SIMULATION_FUITES_MS);

  it('ne joue rien sans invite, ni une fois agi', () => {
    const rng = createSeededRng(3);
    const { state } = createGame({ players: 6, options: DEFAULT_OPTIONS }, rng);
    const vue = viewFor(state, 0);
    expect(decider(vue, rng)).toEqual({ type: 'pret' });
    expect(decider({ ...vue, acted: true }, rng)).toBeNull();
    expect(decider(viewFor(state, null), rng)).toBeNull();
  });

  it('donne la même clé de moment tant que le prompt ne change pas', () => {
    const rng = createSeededRng(5);
    const { state } = createGame({ players: 6, options: DEFAULT_OPTIONS }, rng);
    expect(cleDeMoment(viewFor(state, 0))).toBe(cleDeMoment(viewFor(state, 1)));
    expect(cleDeMoment(viewFor(state, null))).toBeNull();
  });

  it('se retrouve souvent sur une cible commune au jour', () => {
    // Même graine, même jour, mêmes vivants : les votants non abstenants se
    // rejoignent presque tous, sauf la cible elle-même qui se rabat ailleurs.
    const rng = createSeededRng(9);
    let state = createGame({ players: 12, options: DEFAULT_OPTIONS }, rng).state;
    state = { ...state, phase: { kind: 'jour', votes: {} } };
    const cibles = new Map<number, number>();
    for (let seat = 0; seat < 12; seat += 1) {
      const action = decider(viewFor(state, seat), createSeededRng(seat + 100), { graine: 42 });
      if (action?.type === 'voter' && action.target !== null) {
        cibles.set(action.target, (cibles.get(action.target) ?? 0) + 1);
      }
    }
    expect(Math.max(...cibles.values())).toBeGreaterThanOrEqual(6);
  });

  it('le Renard sonde un trio qui apprend, puis s’abstient quand tout est su', () => {
    // Une table avec le Renard ; la révélation passée, la nuit le consulte.
    const rng = createSeededRng(77);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['renard'] };
    let state = createGame({ players: 8, options }, rng).state;
    for (let seat = 0; seat < 8; seat += 1) {
      state = applyAction(state, { type: 'pret' }, seat).state;
    }
    expect(state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    const renard = state.players.findIndex((p) => p.role === 'renard');
    expect(renard).toBeGreaterThanOrEqual(0);
    const vue = viewFor(state, renard);
    expect(vue.prompt?.kind).toBe('flairer');

    // Première nuit, carnet vide : il sonde, et le trio peut lui apprendre
    // un siège — le coup est légal.
    const premier = decider(vue, createSeededRng(1));
    expect(premier?.type).toBe('flairer');
    if (premier?.type !== 'flairer') return;
    expect(premier.centre).not.toBeNull();
    const n = 8;
    const trio = [premier.centre!, (premier.centre! - 1 + n) % n, (premier.centre! + 1) % n].filter(
      (seat) => state.players[seat]!.alive,
    );
    expect(trio).toContain(premier.centre);
    expect(trio.some((seat) => seat !== renard)).toBe(true);
    expect(() => applyAction(state, premier, renard)).not.toThrow();

    // Carnet partiel : il cherche encore un siège inconnu — jamais un trio
    // entièrement su, qui ne pourrait que lui coûter son flair (R107).
    const appris = new Set<number>([renard, 0, 1, 2]);
    const partiel: GameState = {
      ...state,
      renardSavoirs: [{ day: 1, seats: [0, 1, 2], loups: true }],
    };
    const deuxieme = decider(viewFor(partiel, renard), createSeededRng(2));
    expect(deuxieme?.type).toBe('flairer');
    if (deuxieme?.type === 'flairer') {
      expect(deuxieme.centre).not.toBeNull();
      const trio2 = [deuxieme.centre!, (deuxieme.centre! - 1 + n) % n, (deuxieme.centre! + 1) % n].filter(
        (seat) => state.players[seat]!.alive,
      );
      expect(trio2.some((seat) => !appris.has(seat))).toBe(true);
    }

    // Carnet plein — tout le village vivant a été flairé : il s'abstient, et
    // l'abstention reste un coup légal.
    const vivants = state.players.filter((p) => p.alive).map((p) => p.seat);
    const plein: GameState = {
      ...state,
      renardSavoirs: [{ day: 1, seats: vivants, loups: true }],
    };
    const troisieme = decider(viewFor(plein, renard), createSeededRng(3));
    expect(troisieme).toEqual({ type: 'flairer', centre: null });
    expect(() => applyAction(plein, troisieme!, renard)).not.toThrow();
  });

  it('le Voleur prend une carte au hasard — le talon ne se montre qu’à lui (R110)', () => {
    const rng = createSeededRng(21);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voleur'] };
    const { state } = createGame({ players: 8, options }, rng);
    // Le Voleur joue avant la révélation : c'est la première phase.
    expect(state.phase.kind).toBe('voleur');
    const voleur = state.players.findIndex((p) => p.role === 'voleur');
    expect(voleur).toBeGreaterThanOrEqual(0);
    const vue = viewFor(state, voleur);
    expect(vue.prompt?.kind).toBe('voler');
    // Le talon n'apparaît nulle part dans la vue d'un autre siège : pas de
    // consigne, pas de carte — le robot honnête n'a rien à cacher.
    expect(viewFor(state, (voleur + 1) % 8).prompt).toBeNull();

    // Deux loups au talon : l'obligation s'affiche, le robot ne s'abstient jamais.
    const oblige: GameState = {
      ...state,
      phase: { kind: 'voleur', seat: voleur, cartes: ['loup', 'loupBlanc'] },
    };
    for (let graine = 1; graine <= 60; graine += 1) {
      const action = decider(viewFor(oblige, voleur), createSeededRng(graine));
      expect(action?.type).toBe('voler');
      if (action?.type !== 'voler') return;
      expect(action.carte).not.toBeNull();
      expect(() => applyAction(oblige, action, voleur)).not.toThrow();
    }

    // Pas d'obligation : les deux cartes se prennent, et l'abstention aussi.
    const libre: GameState = {
      ...state,
      phase: { kind: 'voleur', seat: voleur, cartes: ['voyante', 'chasseur'] },
    };
    const gestes = new Set<string>();
    for (let graine = 1; graine <= 60; graine += 1) {
      const action = decider(viewFor(libre, voleur), createSeededRng(graine));
      expect(action?.type).toBe('voler');
      if (action?.type !== 'voler') return;
      gestes.add(String(action.carte));
      expect(() => applyAction(libre, action, voleur)).not.toThrow();
    }
    expect(gestes).toContain('null');
    expect(gestes).toContain('0');
    expect(gestes).toContain('1');
  });

  it('le Chien-Loup se range — la meute ne l’accueille qu’au bon camp (R111)', () => {
    const rng = createSeededRng(23);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['chienLoup'] };
    let state = createGame({ players: 8, options }, rng).state;
    for (let seat = 0; seat < 8; seat += 1) {
      state = applyAction(state, { type: 'pret' }, seat).state;
    }
    expect(state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    const chien = state.players.findIndex((p) => p.role === 'chienLoup');
    expect(chien).toBeGreaterThanOrEqual(0);
    const vue = viewFor(state, chien);
    expect(vue.prompt?.kind).toBe('seRanger');
    // Avant de se ranger, il ne voit ni la meute ni les loups : sa vue est
    // celle d'un villageois (R111).
    expect(vue.pack).toBeNull();

    // Les deux camps se jouent ; les deux coups sont légaux.
    const camps = new Set<string>();
    for (let graine = 1; graine <= 40; graine += 1) {
      const action = decider(viewFor(state, chien), createSeededRng(graine));
      expect(action?.type).toBe('seRanger');
      if (action?.type !== 'seRanger') return;
      camps.add(action.camp);
      expect(() => applyAction(state, action, chien)).not.toThrow();
    }
    expect(camps).toContain('village');
    expect(camps).toContain('loups');

    // Le camp s'écrit à la clôture de l'étape principale : rangé chez les
    // loups, la meute l'accueille ; rangé au village, il n'en voit rien.
    const chezLesLoups = applyAction(state, { type: 'seRanger', camp: 'loups' }, chien).state;
    const auVillage = applyAction(state, { type: 'seRanger', camp: 'village' }, chien).state;
    let s = chezLesLoups;
    let t = auVillage;
    for (let pas = 0; pas < 12; pas += 1) {
      if (s.phase.kind !== 'jour') s = timeoutPhase(s, s.phaseSeq).state;
      if (t.phase.kind !== 'jour') t = timeoutPhase(t, t.phaseSeq).state;
    }
    expect(s.phase.kind).toBe('jour');
    expect(t.phase.kind).toBe('jour');
    expect(viewFor(s, chien).pack?.seats).toContain(chien);
    expect(viewFor(t, chien).pack).toBeNull();
  });

  it('l’Enfant Sauvage désigne un vivant, lui compris — le moteur l’accepte (R112)', () => {
    const rng = createSeededRng(29);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['enfantSauvage'] };
    let state = createGame({ players: 8, options }, rng).state;
    for (let seat = 0; seat < 8; seat += 1) {
      state = applyAction(state, { type: 'pret' }, seat).state;
    }
    const enfant = state.players.findIndex((p) => p.role === 'enfantSauvage');
    expect(enfant).toBeGreaterThanOrEqual(0);
    expect(viewFor(state, enfant).prompt?.kind).toBe('designerModele');

    // Un vivant au hasard, lui compris : le moteur l'autorise, le coup est
    // toujours légal.
    const vivants = new Set(state.players.filter((p) => p.alive).map((p) => p.seat));
    const cibles = new Set<number>();
    for (let graine = 1; graine <= 40; graine += 1) {
      const action = decider(viewFor(state, enfant), createSeededRng(graine));
      expect(action?.type).toBe('designerModele');
      if (action?.type !== 'designerModele') return;
      expect(vivants.has(action.target)).toBe(true);
      cibles.add(action.target);
      expect(() => applyAction(state, action, enfant)).not.toThrow();
    }
    expect(cibles.has(enfant)).toBe(true);
    expect(cibles.size).toBeGreaterThan(1);
  });

  it('produit des phrases que le moteur accepte', () => {
    const rng = createSeededRng(11);
    let state = createGame({ players: 6, options: { ...DEFAULT_OPTIONS, chat: true } }, rng).state;
    state = { ...state, phase: { kind: 'jour', votes: {} } };
    const phrase = parler(viewFor(state, 0), rng);
    expect(phrase).not.toBeNull();
    if (phrase) {
      expect(() => applyAction(state, { type: 'dire', channel: phrase.channel, text: phrase.text }, 0)).not.toThrow();
    }
  });
});
