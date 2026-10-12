/**
 * La mort d'abandon — R101 (D18).
 *
 * Un siège vivant absent depuis `ABANDON_MS` meurt d'abandon à la clôture de
 * phase suivante. Le serveur dit qui ; le moteur, lui, n'a pas d'horloge : il
 * reçoit la liste dans `timeoutPhase(state, seq, { abandons })`. La mort est
 * publique, rien ne s'y déclenche — ni tir, ni rancune, ni dernier mot —, le
 * chagrin de l'amoureux suit, la charge de capitaine passe au hasard. Et rien
 * n'avoue ce que la table cache.
 */

import { describe, expect, it } from 'vitest';

import { applyAction, createGame, livingSeats, pendingActors, timeoutPhase } from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { ABANDON_MS } from './protocol.js';
import {
  IllegalActionError,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type RoleId,
  type Step,
} from './types.js';
import { viewFor } from './views.js';

/* ------------------------------------------------------------------ */
/* Une partie menée à la main, avec l'API de D20                       */
/* ------------------------------------------------------------------ */

function compose(loups: number, roles: GameOptions['roles'], ecarts: Partial<GameOptions> = {}): GameOptions {
  return { ...DEFAULT_OPTIONS, auto: false, loups, roles, capitaine: false, ...ecarts };
}

class Partie {
  state: GameState;
  journal: GameEvent[] = [];

  constructor(joueurs: number, options: GameOptions, graine = 1) {
    const pas = createGame({ players: joueurs, options }, graine);
    this.state = pas.state;
    this.journal.push(...pas.events);
  }

  agir(siege: number, action: Action): Step {
    const pas = applyAction(this.state, action, siege);
    this.state = pas.state;
    this.journal.push(...pas.events);
    return pas;
  }

  /** L'échéance de la phase en cours, avec ses partis. */
  cloturer(abandons?: number[]): Step {
    const pas = timeoutPhase(this.state, this.state.phaseSeq, abandons ? { abandons } : undefined);
    this.state = pas.state;
    this.journal.push(...pas.events);
    return pas;
  }
}

function siege(state: GameState, role: RoleId): number {
  const joueur = state.players.find((j) => j.role === role);
  if (!joueur) throw new Error(`aucun siège ne joue ${role}`);
  return joueur.seat;
}

function sieges(state: GameState, role: RoleId): number[] {
  return state.players.filter((j) => j.role === role).map((j) => j.seat);
}

function deType<T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** Le jour 1, après une nuit où personne n'a joué. */
function jourUn(options: GameOptions, joueurs = 8, graine = 1): Partie {
  const partie = new Partie(joueurs, options, graine);
  partie.cloturer(); // la révélation passe : nuit 1
  while (partie.state.phase.kind === 'nuit') partie.cloturer();
  expect(partie.state.phase.kind).toBe('jour');
  return partie;
}

/* ------------------------------------------------------------------ */
/* R101 — la mort                                                      */
/* ------------------------------------------------------------------ */

describe('R101 — la mort d’abandon', () => {
  it('R101 — cinq minutes d’absence : la constante du serveur', () => {
    expect(ABANDON_MS).toBe(300_000);
    expect(DEFAULT_OPTIONS.abandon).toBe(true);
  });

  it('R101 — le parti meurt à l’échéance, publiquement, avant que la phase se close', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere']));
    const parti = sieges(partie.state, 'villageois')[0]!;
    const pas = partie.cloturer([parti]);
    // La mort d'abord, la clôture ensuite : le vote, puis la nuit.
    expect(pas.events[0]).toEqual({
      type: 'morts',
      deaths: [{ seat: parti, cause: 'abandon', role: 'villageois' }],
    });
    expect(pas.events.map((e) => e.type)).toEqual(['morts', 'vote', 'phase']);
    expect(partie.state.players[parti]!.alive).toBe(false);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'mort', seat: parti, cause: 'abandon' });
  });

  it('R101 — le rôle du parti ne se montre que si la table révèle ses morts (R46)', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere'], { revelerRoles: false }));
    const voyante = siege(partie.state, 'voyante');
    const pas = partie.cloturer([voyante]);
    expect(deType(pas.events, 'morts')[0]!.deaths).toEqual([{ seat: voyante, cause: 'abandon', role: null }]);
    expect(partie.state.players[voyante]!.revealed).toBe(false);
    // Les vivants ne voient rien de plus que la mort.
    for (const s of livingSeats(partie.state)) {
      if (partie.state.players[s]!.role === 'loup') continue;
      expect(viewFor(partie.state, s).players[voyante]!.role).toBeNull();
    }
  });

  it('R101 — le Chasseur parti ne tire pas, et sa carte ne se retourne pas', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere', 'chasseur'], { revelerRoles: false }));
    const chasseur = siege(partie.state, 'chasseur');
    const pas = partie.cloturer([chasseur]);
    expect(partie.state.phase.kind).toBe('nuit');
    expect(deType(pas.events, 'phase').map((e) => e.phase)).not.toContain('chasseur');
    expect(partie.state.triggers).toEqual([]);
    expect(partie.state.players[chasseur]!.revealed).toBe(false);
    // Même sous l'option qui le laisse tirer de toute mort (R48).
    const large = jourUn(compose(2, ['voyante', 'sorciere', 'chasseur'], { chasseurEmpoisonne: true }));
    large.cloturer([siege(large.state, 'chasseur')]);
    expect(large.state.phase.kind).toBe('nuit');
  });

  it('R101 — l’Ancien parti n’emporte pas les pouvoirs du village (R92)', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere', 'ancien']), 10);
    const ancien = siege(partie.state, 'ancien');
    const pas = partie.cloturer([ancien]);
    expect(deType(pas.events, 'rancune')).toEqual([]);
    expect(partie.state.pouvoirsPerdus).toBe(false);
  });

  it('R101/R47 — l’amoureux du parti meurt de chagrin, dans la même annonce', () => {
    const partie = new Partie(10, compose(2, ['cupidon', 'voyante', 'sorciere']));
    partie.cloturer(); // nuit 1
    const villageois = sieges(partie.state, 'villageois');
    const [a, b] = [villageois[0]!, villageois[1]!];
    partie.agir(siege(partie.state, 'cupidon'), { type: 'cupidon', a, b });
    while (partie.state.phase.kind === 'nuit') partie.cloturer();
    const pas = partie.cloturer([a]);
    expect(deType(pas.events, 'morts')[0]!.deaths).toEqual([
      { seat: a, cause: 'abandon', role: 'villageois' },
      { seat: b, cause: 'chagrin', role: 'villageois' },
    ]);
  });

  it('R101 — le capitaine parti lègue sa charge au hasard, sans phase de succession', () => {
    const options = compose(2, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true });
    const successeurs = new Set<number>();
    for (let graine = 1; graine <= 12; graine++) {
      const partie = new Partie(8, options, graine);
      partie.cloturer(); // la révélation passe : l'élection pré-nocturne
      expect(partie.state.phase.kind).toBe('election');
      const elu = sieges(partie.state, 'villageois')[0]!;
      for (const s of livingSeats(partie.state)) partie.agir(s, { type: 'voter', target: elu });
      expect(partie.state.captain).toBe(elu);
      expect(partie.state.phase.kind).toBe('nuit');
      const pas = partie.cloturer([elu]);
      const passation = deType(pas.events, 'capitaine');
      expect(passation).toHaveLength(1);
      expect(passation[0]!.from).toBe(elu);
      expect(partie.state.captain).toBe(passation[0]!.seat);
      expect(livingSeats(partie.state)).toContain(partie.state.captain);
      // la nuit continue : aucune phase de succession ne s'est ouverte
      expect(partie.state.phase).toMatchObject({ kind: 'nuit' });
      expect(deType(pas.events, 'phase').map((e) => e.phase)).not.toContain('succession');
      successeurs.add(partie.state.captain!);
    }
    // au hasard : pas toujours le même héritier
    expect(successeurs.size).toBeGreaterThan(1);
  });

  it('R101 — l’option `abandon: false` : la table attend ses absents', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere'], { abandon: false }));
    const parti = sieges(partie.state, 'villageois')[0]!;
    const pas = partie.cloturer([parti]);
    expect(partie.state.players[parti]!.alive).toBe(true);
    expect(deType(pas.events, 'morts')).toEqual([]);
  });

  it('R101 — un siège mort, inconnu ou mal formé est ignoré', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere']));
    const avant = partie.state;
    const pas = timeoutPhase(avant, avant.phaseSeq, {
      abandons: [-1, 99, 1.5, Number.NaN, '1', [1], null] as unknown as number[],
    });
    expect(deType(pas.events, 'morts')).toEqual([]);
    expect(pas.state.players.every((p) => p.alive)).toBe(true);
    // une minuterie périmée ne tue personne non plus (R80)
    expect(() => timeoutPhase(avant, avant.phaseSeq - 1, { abandons: [0] })).toThrow(IllegalActionError);
  });
});

/* ------------------------------------------------------------------ */
/* R101 — la clôture entre vivants                                     */
/* ------------------------------------------------------------------ */

describe('R101 — la phase se clôt entre vivants', () => {
  it('R101 — au vote, ni la voix ni la tête d’un parti ne comptent', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere']));
    const [accuse, autre] = sieges(partie.state, 'villageois');
    for (const s of livingSeats(partie.state)) {
      if (s !== accuse) partie.agir(s, { type: 'voter', target: accuse! });
    }
    // L'accusé — majoritaire — part avant le dépouillement : personne n'est exécuté.
    const pas = partie.cloturer([accuse!]);
    expect(deType(pas.events, 'vote')[0]!.executed).toBeNull();
    expect(partie.state.players[autre!]!.alive).toBe(true);
  });

  it('R101 — la nuit, la proie partie n’est plus dévorée', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']));
    partie.cloturer(); // nuit 1
    const proie = sieges(partie.state, 'villageois')[0]!;
    for (const loup of sieges(partie.state, 'loup')) partie.agir(loup, { type: 'devorer', target: proie });
    // la meute a voté, mais la Voyante n'a pas joué : l'étape attend son échéance
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    partie.cloturer([proie]);
    expect(partie.state.night.victim).toBeNull();
    expect(partie.state.log).toContainEqual({ day: 1, type: 'loups', target: null });
  });

  it('R101/R50 — la meute partie au cœur de la nuit : la partie se clôt aussitôt', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']));
    partie.cloturer(); // nuit 1
    const pas = partie.cloturer(sieges(partie.state, 'loup'));
    expect(pas.events.map((e) => e.type)).toEqual(['morts', 'phase', 'fin']);
    expect(partie.state.winner).toBe('village');
    expect(partie.state.phase.kind).toBe('fin');
    expect(pendingActors(partie.state)).toEqual([]);
  });

  it('R101/R71 — le village parti, la meute l’emporte au dépouillement', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere']));
    const loups = new Set(sieges(partie.state, 'loup'));
    partie.cloturer(livingSeats(partie.state).filter((s) => !loups.has(s)));
    expect(partie.state.winner).toBe('loups');
  });

  it('R101 — tout le monde parti : la partie n’est à personne', () => {
    const partie = jourUn(compose(2, ['voyante', 'sorciere']));
    partie.cloturer(livingSeats(partie.state));
    expect(partie.state.winner).toBe('personne');
  });
});
