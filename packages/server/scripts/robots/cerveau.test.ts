/**
 * Le cerveau des robots face au vrai moteur : des centaines de parties
 * simulées, où chaque coup choisi doit être accepté par `applyAction`.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OPTIONS,
  OPTIONAL_ROLES,
  applyAction,
  compositionFor,
  createGame,
  createSeededRng,
  randomComposition,
  timeoutPhase,
  viewFor,
  type GameOptions,
  type GameState,
  type RoleId,
  type Winner,
} from '@garoutom/engine';

import { cleDeMoment, decider, parler } from './cerveau.js';

const PARTIES = 400;
const PARTIES_V2 = 1500;
const PAS_MAX = 4000;

interface Bilan {
  winner: Winner | null;
  jours: number;
  coups: number;
  roles: RoleId[];
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

/** Joue une partie complète ; lève avec la graine si un coup légal est refusé. */
function jouePartie(graine: number, v2 = false): Bilan {
  const rng = createSeededRng(graine);
  const cerveau = createSeededRng(graine + 1_000_003);
  const joueurs = 6 + (graine % 13);
  const options = v2 ? optionsV2(graine, joueurs) : optionsDe(graine);
  let state: GameState = createGame({ players: joueurs, options }, rng).state;
  const roles = state.players.map((p) => p.role);
  let coups = 0;
  const sequence: string[] = [];

  for (let pas = 0; pas < PAS_MAX; pas += 1) {
    if (state.over) return { winner: state.winner, jours: state.day, coups, roles };
    let agi = false;
    for (let seat = 0; seat < joueurs; seat += 1) {
      const vue = viewFor(state, seat);
      const action = decider(vue, cerveau, { graine });
      if (!action) continue;
      sequence.push(`${String(seat)}:${JSON.stringify(action)}`);
      try {
        state = applyAction(state, action, rng, seat).state;
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
      state = timeoutPhase(state, rng, state.phaseSeq).state;
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
  });

  it(`joue ${String(PARTIES_V2)} parties avec les rôles de la v2, sans coup refusé ni partie sans fin`, () => {
    const vainqueurs: Record<string, number> = {};
    const presences: Record<string, number> = {};
    let jours = 0;
    let plusLongue = 0;
    for (let graine = 1; graine <= PARTIES_V2; graine += 1) {
      const bilan = jouePartie(graine, true);
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
  });

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

  it('produit des phrases que le moteur accepte', () => {
    const rng = createSeededRng(11);
    let state = createGame({ players: 6, options: { ...DEFAULT_OPTIONS, chat: true } }, rng).state;
    state = { ...state, phase: { kind: 'jour', votes: {} } };
    const phrase = parler(viewFor(state, 0), rng);
    expect(phrase).not.toBeNull();
    if (phrase) {
      expect(() =>
        applyAction(state, { type: 'dire', channel: phrase.channel, text: phrase.text }, rng, 0),
      ).not.toThrow();
    }
  });
});
