/**
 * Les rôles de la v2 — les règles R90 à R100.
 *
 * L'Ancien qui encaisse et qui se venge, le Corbeau qui pèse sur le vote, le
 * Bouc émissaire qui paie l'égalité, la Petite Fille qui entrevoit la meute,
 * le Loup Blanc qui la trahit les nuits paires et ne gagne que seul. Chaque
 * test cite la règle qu'il vérifie dans `docs/RULES.md` ; chaque déroulé est
 * joué pas à pas sur un générateur seedé (R86), les minuteries déclenchées à
 * la main par `timeoutPhase`.
 *
 * La non-fuite d'information — R87 et R88 face aux nouveaux rôles — et la
 * terminaison de milliers de parties vivent à côté, dans
 * `roles-v2-simulation.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  GHOST_STEP_MS,
  HUIS_CLOS_NUITS,
  livingPack,
  livingSeats,
  pendingActors,
  phaseBudgetMs,
  timeoutPhase,
  TRIGGER_MS,
  winnerOf,
} from './game.js';
import {
  autoComposition,
  compositionFor,
  DEFAULT_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OPTIONAL_ROLE_MIN_PLAYERS,
  randomComposition,
  sanitizeOptions,
  suggestionsFor,
} from './options.js';
import { createSeededRng } from './rng.js';
import {
  campOf,
  factionOf,
  IllegalActionError,
  OPTIONAL_ROLES,
  ROLES,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type RoleId,
  type Rng,
  type Step,
} from './types.js';
import { viewFor, type GameView } from './views.js';

/* ------------------------------------------------------------------ */
/* Une partie menée à la main                                           */
/* ------------------------------------------------------------------ */

/**
 * Une composition manuelle : l'hôte choisit loups et rôles. Pas de capitaine
 * — la pondération n'a rien à faire dans ces scénarios, sauf demande.
 */
function compose(
  loups: number,
  roles: GameOptions['roles'],
  ecarts: Partial<GameOptions> = {},
): GameOptions {
  return { ...DEFAULT_OPTIONS, auto: false, loups, roles, capitaine: false, ...ecarts };
}

/** Une partie qui avance pas à pas ; chaque pas garde ses évènements. */
class Partie {
  rng: Rng;
  state: GameState;
  /** Tous les évènements produits depuis la distribution. */
  journal: GameEvent[] = [];

  constructor(joueurs: number, options: GameOptions, graine = 1) {
    this.rng = createSeededRng(graine);
    const pas = createGame({ players: joueurs, options }, this.rng);
    this.state = pas.state;
    this.journal.push(...pas.events);
  }

  agir(siege: number, action: Action): Step {
    const pas = applyAction(this.state, action, this.rng, siege);
    this.state = pas.state;
    this.journal.push(...pas.events);
    return pas;
  }

  cloturer(): Step {
    const pas = timeoutPhase(this.state, this.rng, this.state.phaseSeq);
    this.state = pas.state;
    this.journal.push(...pas.events);
    return pas;
  }

  /** La révélation passe : on entre dans la première nuit. */
  nuit(): this {
    this.cloturer();
    expect(this.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    return this;
  }

  /** La meute vivante vote d'une seule voix — ou s'abstient en bloc. */
  meute(cible: number | null): GameEvent[] {
    const evenements: GameEvent[] = [];
    for (const loup of livingPack(this.state)) {
      if (this.state.phase.kind !== 'nuit' || this.state.phase.step !== 'principale') break;
      evenements.push(...this.agir(loup, { type: 'devorer', target: cible }).events);
    }
    return evenements;
  }

  /** Le temps clôt les étapes de nuit qui restent, jusqu'au jour (ou la fin). */
  aube(): GameEvent[] {
    const evenements: GameEvent[] = [];
    while (this.state.phase.kind === 'nuit') evenements.push(...this.cloturer().events);
    return evenements;
  }

  /**
   * Le village vote d'une seule voix ; la cible, elle, s'abstient (R60).
   * Rend les évènements de la clôture.
   */
  voter(cible: number | null): GameEvent[] {
    expect(this.state.phase.kind).toBe('jour');
    const seq = this.state.phaseSeq;
    const evenements: GameEvent[] = [];
    for (const votant of pendingActors(this.state)) {
      if (this.state.phaseSeq !== seq) break;
      evenements.push(
        ...this.agir(votant, { type: 'voter', target: votant === cible ? null : cible }).events,
      );
    }
    return evenements;
  }

  /** Une nuit blanche de bout en bout : personne ne joue, le temps clôt tout. */
  nuitBlanche(): GameEvent[] {
    expect(this.state.phase.kind).toBe('nuit');
    return this.aube();
  }
}

/** Le siège qui porte ce rôle — unique pour un rôle spécial ou optionnel (R4). */
function siege(state: GameState, role: RoleId): number {
  const joueur = state.players.find((j) => j.role === role);
  if (!joueur) throw new Error(`aucun siège ne joue ${role}`);
  return joueur.seat;
}

function sieges(state: GameState, role: RoleId): number[] {
  return state.players.filter((j) => j.role === role).map((j) => j.seat);
}

/** Un refus attendu : `IllegalActionError`, et l'état intact (R85). */
function refuser(state: GameState, siege: number, action: Action, code?: string): IllegalActionError {
  const avant = structuredClone(state);
  let erreur: unknown;
  try {
    applyAction(state, action, createSeededRng(404), siege);
  } catch (jetee) {
    erreur = jetee;
  }
  expect(erreur).toBeInstanceOf(IllegalActionError);
  if (code) expect((erreur as IllegalActionError).code).toBe(code);
  expect(state).toEqual(avant);
  return erreur as IllegalActionError;
}

/** Un état fabriqué où ces sièges sont morts — sans rien devoir à la chance. */
function avecDesMorts(state: GameState, morts: number[]): GameState {
  const fabrique = structuredClone(state);
  for (const siege of morts) {
    const joueur = fabrique.players[siege];
    if (!joueur) throw new Error('siège inconnu');
    joueur.alive = false;
  }
  return fabrique;
}

/** Les évènements d'un type, dans l'ordre. */
function deType<T extends GameEvent['type']>(
  evenements: GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return evenements.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/* ------------------------------------------------------------------ */
/* R90 — le cadre : options, composition, générateur                   */
/* ------------------------------------------------------------------ */

describe('R90 — les rôles optionnels se choisissent, la référence les ignore', () => {
  it('R90 — les cinq rôles existent pour le moteur, avec leur camp et leur faction', () => {
    expect(OPTIONAL_ROLES).toEqual(['ancien', 'corbeau', 'bouc', 'petiteFille', 'loupBlanc']);
    for (const role of OPTIONAL_ROLES) expect(ROLES).toContain(role);
    expect(campOf('ancien')).toBe('village');
    expect(campOf('corbeau')).toBe('village');
    expect(campOf('bouc')).toBe('village');
    expect(campOf('petiteFille')).toBe('village');
    expect(campOf('loupBlanc')).toBe('loups');
    expect(factionOf('loupBlanc')).toBe('loupBlanc');
    expect(factionOf('loup')).toBe('loups');
    expect(factionOf('petiteFille')).toBe('village');
  });

  it('R90/R10 — le sanitizeur accepte les optionnels, dans l’ordre du moteur, un de chaque', () => {
    expect(
      sanitizeOptions({ roles: ['loupBlanc', 'ancien', 'voyante', 'ancien', 'dragon', 'bouc'] }).roles,
    ).toEqual(['voyante', 'ancien', 'bouc', 'loupBlanc']);
  });

  it('R92/R10 — ancienRancunier vaut vrai par défaut, et seul un booléen le change', () => {
    expect(DEFAULT_OPTIONS.ancienRancunier).toBe(true);
    expect(sanitizeOptions({}).ancienRancunier).toBe(true);
    expect(sanitizeOptions({ ancienRancunier: false }).ancienRancunier).toBe(false);
    expect(sanitizeOptions({ ancienRancunier: 'non' }).ancienRancunier).toBe(true);
    expect(sanitizeOptions({ ancienRancunier: 0 }).ancienRancunier).toBe(true);
  });

  it('R90/R20 — la composition de référence ne tire jamais un rôle optionnel', () => {
    for (let joueurs = MIN_PLAYERS; joueurs <= MAX_PLAYERS; joueurs++) {
      const { roles } = autoComposition(joueurs);
      for (const role of OPTIONAL_ROLES) expect(roles as string[]).not.toContain(role);
      for (const suggestion of suggestionsFor(joueurs)) {
        for (const role of OPTIONAL_ROLES) expect(suggestion.roles as string[]).not.toContain(role);
      }
    }
  });

  it('R90/R13 — le Loup Blanc compte parmi les loups pour la borne de jouabilité', () => {
    // Six joueurs : deux loups et le Loup Blanc font trois loups pour trois.
    expect(() => compositionFor(6, compose(2, ['loupBlanc']))).toThrow(IllegalActionError);
    expect(() => compositionFor(7, compose(2, ['loupBlanc']))).not.toThrow();
    const distribues = compositionFor(9, compose(2, ['loupBlanc', 'ancien', 'corbeau']));
    expect(distribues.filter((r) => r === 'loup')).toHaveLength(2);
    expect(distribues.filter((r) => r === 'loupBlanc')).toHaveLength(1);
    expect(distribues.filter((r) => r === 'villageois')).toHaveLength(4);
  });

  it('R90/R4 — un rôle optionnel n’existe qu’en un exemplaire', () => {
    expect(() => compositionFor(10, compose(2, ['corbeau', 'corbeau']))).toThrow(IllegalActionError);
  });
});

describe('R100 — le générateur et les rôles optionnels', () => {
  it('R100 — sans réglage, le générateur ne tire jamais un optionnel (R22 tel quel)', () => {
    for (let joueurs = MIN_PLAYERS; joueurs <= MAX_PLAYERS; joueurs++) {
      for (let graine = 0; graine < 30; graine++) {
        const { roles } = randomComposition(joueurs, createSeededRng(graine));
        for (const role of OPTIONAL_ROLES) expect(roles as string[]).not.toContain(role);
      }
    }
  });

  it('R100 — avec les optionnels : rien sous dix, un jusqu’à treize, deux au plus ensuite, dans les bornes', () => {
    const vus = new Set<string>();
    for (let joueurs = MIN_PLAYERS; joueurs <= MAX_PLAYERS; joueurs++) {
      for (let graine = 0; graine < 60; graine++) {
        const { loups, roles } = randomComposition(joueurs, createSeededRng(graine * 7 + joueurs), {
          optionnels: true,
        });
        const optionnels = roles.filter((r) => (OPTIONAL_ROLES as readonly string[]).includes(r));
        const plafond = joueurs < 10 ? 0 : joueurs < 14 ? 1 : 2;
        expect(optionnels.length).toBeLessThanOrEqual(plafond);
        for (const role of optionnels) {
          expect(joueurs).toBeGreaterThanOrEqual(OPTIONAL_ROLE_MIN_PLAYERS[role as 'ancien']);
          vus.add(role);
        }
        expect(new Set(roles).size).toBe(roles.length); // R4
        expect(joueurs - loups - roles.length).toBeGreaterThanOrEqual(2); // deux villageois simples
        expect(() => compositionFor(joueurs, compose(loups, roles))).not.toThrow(); // R13
      }
    }
    // Chaque optionnel sort un jour ou l'autre.
    for (const role of OPTIONAL_ROLES) expect(vus).toContain(role);
  });

  it('R100 — la base tirée avec les optionnels est celle du générateur par défaut, graine pour graine', () => {
    for (const joueurs of [10, 12, 14, 18]) {
      for (const graine of [0, 1, 42, 2026]) {
        const base = randomComposition(joueurs, createSeededRng(graine));
        const etendue = randomComposition(joueurs, createSeededRng(graine), { optionnels: true });
        expect(etendue.loups).toBe(base.loups);
        expect(etendue.roles.slice(0, base.roles.length)).toEqual(base.roles);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* R91 — l'Ancien encaisse                                             */
/* ------------------------------------------------------------------ */

describe('R91 — l’Ancien survit à la première attaque', () => {
  it('R91 — la première attaque de la meute ne le tue pas : aube paisible, et rien ne le dit', () => {
    const partie = new Partie(8, compose(2, ['ancien', 'voyante'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    partie.meute(ancien);
    const evenements = partie.aube();
    expect(partie.state.players[ancien]!.alive).toBe(true);
    expect(partie.state.ancienBlesse).toBe(true);
    expect(deType(evenements, 'aube-paisible')).toHaveLength(1);
    expect(deType(evenements, 'morts')).toHaveLength(0);
    // Le secret reste dans l'état : aucun évènement ne parle de résistance.
    expect(JSON.stringify(evenements)).not.toContain('resistance');
    expect(partie.state.log).toContainEqual({ day: 1, type: 'resistance', seat: ancien });
  });

  it('R91 — la seconde attaque le tue', () => {
    const partie = new Partie(8, compose(2, ['ancien', 'voyante'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    partie.meute(ancien);
    partie.aube();
    partie.voter(null);
    partie.meute(ancien);
    const evenements = partie.aube();
    expect(partie.state.players[ancien]!.alive).toBe(false);
    expect(deType(evenements, 'morts')[0]!.deaths).toEqual([
      { seat: ancien, cause: 'loups', role: 'ancien' },
    ]);
    // Mort sous les crocs : ce n'est pas la main du village (R92).
    expect(partie.state.pouvoirsPerdus).toBe(false);
  });

  it('R91 — le bouclier du Salvateur empêche l’attaque de compter', () => {
    const partie = new Partie(8, compose(2, ['ancien', 'salvateur'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: ancien });
    partie.meute(ancien);
    partie.aube();
    expect(partie.state.ancienBlesse).toBe(false);
    expect(partie.state.log.some((l) => l.type === 'resistance')).toBe(false);
  });

  it('R91/R44 — la potion de vie empêche l’attaque de compter, et part quand même', () => {
    const partie = new Partie(8, compose(2, ['ancien', 'sorciere'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    partie.meute(ancien);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'sorciere' });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: true, kill: null });
    expect(partie.state.ancienBlesse).toBe(false);
    expect(partie.state.potions.vie).toBe(false);
    expect(partie.state.players[ancien]!.alive).toBe(true);
  });

  it('R91/R92 — le poison le tue du premier coup, blessé ou pas', () => {
    const partie = new Partie(8, compose(2, ['ancien', 'sorciere'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    partie.meute(null);
    const pas = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: ancien });
    expect(partie.state.players[ancien]!.alive).toBe(false);
    expect(deType(pas.events, 'morts')[0]!.deaths[0]).toMatchObject({ seat: ancien, cause: 'poison' });
  });
});

/* ------------------------------------------------------------------ */
/* R92 — la rancune de l'Ancien                                        */
/* ------------------------------------------------------------------ */

/** Un village où l'Ancien vient d'être exécuté au vote du jour 1. */
function ancienExecute(
  roles: GameOptions['roles'],
  ecarts: Partial<GameOptions> = {},
  joueurs = 12,
): { partie: Partie; ancien: number; evenements: GameEvent[] } {
  const partie = new Partie(joueurs, compose(2, ['ancien', ...roles], ecarts)).nuit();
  partie.meute(null);
  partie.aube();
  const ancien = siege(partie.state, 'ancien');
  const evenements = partie.voter(ancien);
  return { partie, ancien, evenements };
}

describe('R92 — l’Ancien tué par le village emporte ses pouvoirs', () => {
  it('R92 — exécuté au vote : sa carte se retourne, l’annonce part, le village perd ses pouvoirs', () => {
    const { partie, ancien, evenements } = ancienExecute(['voyante'], { revelerRoles: false });
    expect(partie.state.pouvoirsPerdus).toBe(true);
    expect(partie.state.players[ancien]!.revealed).toBe(true);
    // Les morts d'abord, la rancune ensuite.
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('rancune')).toBeGreaterThan(types.indexOf('morts'));
    expect(deType(evenements, 'rancune')).toEqual([{ type: 'rancune', seat: ancien }]);
    // La table ne révèle pas les morts — la rancune, si (R46).
    expect(deType(evenements, 'morts')[0]!.deaths[0]!.role).toBeNull();
    for (let s = 0; s < 12; s++) {
      expect(viewFor(partie.state, s).players[ancien]!.role).toBe('ancien');
      expect(viewFor(partie.state, s).pouvoirsPerdus).toBe(true);
    }
    expect(partie.state.log).toContainEqual({ day: 1, type: 'rancune', seat: ancien });
  });

  it('R92 — la nuit suivante, plus aucune consigne de village : seule la meute chasse', () => {
    const { partie } = ancienExecute(['voyante', 'salvateur', 'corbeau', 'sorciere', 'cupidon']);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    for (const role of ['voyante', 'salvateur', 'corbeau', 'cupidon'] as const) {
      expect(viewFor(partie.state, siege(partie.state, role)).prompt).toBeNull();
    }
    expect(pendingActors(partie.state)).toEqual(livingPack(partie.state));
    for (const loup of livingPack(partie.state)) {
      expect(viewFor(partie.state, loup).prompt).toEqual({ kind: 'devorer' });
    }
    refuser(partie.state, siege(partie.state, 'voyante'), { type: 'sonder', target: livingPack(partie.state)[0]! }, 'powers');
    refuser(partie.state, siege(partie.state, 'salvateur'), { type: 'proteger', target: livingPack(partie.state)[0]! }, 'powers');
    refuser(partie.state, siege(partie.state, 'corbeau'), { type: 'marquer', target: null }, 'powers');
    // L'étape de la Sorcière se tient, fantôme : pas de consigne, durée imprévisible.
    partie.meute(null);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'sorciere' });
    expect(viewFor(partie.state, siege(partie.state, 'sorciere')).prompt).toBeNull();
    expect(pendingActors(partie.state)).toEqual([]);
    const duree = phaseBudgetMs(partie.state, createSeededRng(3));
    expect(duree).toBeGreaterThanOrEqual(GHOST_STEP_MS.min);
    expect(duree).toBeLessThan(GHOST_STEP_MS.min + GHOST_STEP_MS.spread);
    refuser(partie.state, siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null }, 'powers');
  });

  it('R92 — le Chasseur qui tombe ensuite emporte sa balle sans tirer, carte face cachée', () => {
    const { partie } = ancienExecute(['chasseur'], { revelerRoles: false });
    const chasseur = siege(partie.state, 'chasseur');
    partie.meute(chasseur);
    const evenements = partie.aube();
    expect(partie.state.players[chasseur]!.alive).toBe(false);
    expect(partie.state.phase.kind).toBe('jour');
    expect(deType(evenements, 'tir')).toHaveLength(0);
    expect(partie.state.players[chasseur]!.revealed).toBe(false);
  });

  it('R92 — l’Idiot condamné ensuite n’est plus gracié : il meurt', () => {
    const { partie } = ancienExecute(['idiot']);
    partie.meute(null);
    partie.aube();
    const idiot = siege(partie.state, 'idiot');
    const evenements = partie.voter(idiot);
    expect(deType(evenements, 'grace')).toHaveLength(0);
    expect(partie.state.players[idiot]!.alive).toBe(false);
  });

  it('R92 — la Petite Fille n’entrevoit plus rien', () => {
    const { partie } = ancienExecute(['petiteFille']);
    partie.agir(livingPack(partie.state)[0]!, { type: 'devorer', target: siege(partie.state, 'petiteFille') });
    expect(viewFor(partie.state, siege(partie.state, 'petiteFille')).espionnage).toBeNull();
  });

  it('R92 — tué par le tir du Chasseur, l’Ancien se venge aussi', () => {
    const partie = new Partie(10, compose(2, ['ancien', 'chasseur'])).nuit();
    const chasseur = siege(partie.state, 'chasseur');
    const ancien = siege(partie.state, 'ancien');
    partie.meute(chasseur);
    partie.aube();
    expect(partie.state.phase).toMatchObject({ kind: 'chasseur', seat: chasseur });
    const pas = partie.agir(chasseur, { type: 'tirer', target: ancien });
    expect(deType(pas.events, 'rancune')).toEqual([{ type: 'rancune', seat: ancien }]);
    expect(partie.state.pouvoirsPerdus).toBe(true);
  });

  it('R92 — empoisonné la même nuit que le Chasseur tombe : le tir qui restait à jouer est perdu', () => {
    const partie = new Partie(10, compose(2, ['ancien', 'chasseur', 'sorciere'])).nuit();
    const chasseur = siege(partie.state, 'chasseur');
    const ancien = siege(partie.state, 'ancien');
    partie.meute(chasseur);
    const pas = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: ancien });
    expect(deType(pas.events, 'morts')[0]!.deaths.map((d) => d.seat)).toEqual([chasseur, ancien]);
    expect(deType(pas.events, 'rancune')).toHaveLength(1);
    expect(partie.state.phase.kind).toBe('jour'); // pas de phase « chasseur »
  });

  it('R92 — mort de chagrin, l’Ancien ne se venge pas', () => {
    const partie = new Partie(10, compose(2, ['ancien', 'cupidon'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    const amoureux = sieges(partie.state, 'villageois')[0]!;
    partie.agir(siege(partie.state, 'cupidon'), { type: 'cupidon', a: ancien, b: amoureux });
    partie.meute(null);
    partie.aube();
    partie.voter(amoureux);
    expect(partie.state.players[ancien]!.alive).toBe(false);
    expect(partie.state.pouvoirsPerdus).toBe(false);
  });

  it('R92 — avec ancienRancunier: false, le village garde ses pouvoirs', () => {
    const { partie, evenements } = ancienExecute(['voyante'], { ancienRancunier: false });
    expect(partie.state.pouvoirsPerdus).toBe(false);
    expect(deType(evenements, 'rancune')).toHaveLength(0);
    expect(viewFor(partie.state, siege(partie.state, 'voyante')).prompt).toEqual({ kind: 'sonder' });
  });

  it('R92 — ce qui a été joué reste joué : la marque posée cette nuit-là s’annonce quand même', () => {
    const partie = new Partie(10, compose(2, ['ancien', 'corbeau', 'sorciere'])).nuit();
    const ancien = siege(partie.state, 'ancien');
    const marque = sieges(partie.state, 'villageois')[0]!;
    partie.agir(siege(partie.state, 'corbeau'), { type: 'marquer', target: marque });
    partie.meute(null);
    const pas = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: ancien });
    expect(partie.state.pouvoirsPerdus).toBe(true);
    expect(deType(pas.events, 'corbeau')).toEqual([{ type: 'corbeau', target: marque }]);
    expect(partie.state.corbeau).toBe(marque);
  });
});

/* ------------------------------------------------------------------ */
/* R93 — le Corbeau                                                    */
/* ------------------------------------------------------------------ */

describe('R93 — le Corbeau marque un suspect', () => {
  it('R93 — il joue pendant l’étape principale, avec les autres', () => {
    const partie = new Partie(8, compose(2, ['corbeau'])).nuit();
    const corbeau = siege(partie.state, 'corbeau');
    expect(viewFor(partie.state, corbeau).prompt).toEqual({ kind: 'marquer' });
    expect(pendingActors(partie.state)).toContain(corbeau);
    partie.agir(corbeau, { type: 'marquer', target: corbeau }); // lui-même : permis
    expect(pendingActors(partie.state)).not.toContain(corbeau);
    expect(viewFor(partie.state, corbeau).acted).toBe(true);
  });

  it('R93 — à l’aube, la marque s’annonce sans dire qui l’a posée, puis pèse deux voix', () => {
    const partie = new Partie(8, compose(2, ['corbeau'])).nuit();
    const corbeau = siege(partie.state, 'corbeau');
    const marque = sieges(partie.state, 'villageois')[0]!;
    partie.agir(corbeau, { type: 'marquer', target: marque });
    // Le dernier loup clôt l'étape : l'aube tombe dans la foulée.
    const evenements = [...partie.meute(null), ...partie.aube()];
    expect(deType(evenements, 'corbeau')).toEqual([{ type: 'corbeau', target: marque }]);
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('corbeau')).toBeGreaterThan(types.indexOf('aube-paisible'));
    expect(types.indexOf('corbeau')).toBeLessThan(types.indexOf('phase'));
    for (let s = 0; s < 8; s++) expect(viewFor(partie.state, s).marque).toBe(marque);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'corbeau', target: marque });

    // Le marqué vote toujours ; personne d'autre ne vote : ses deux voix suffisent.
    expect(viewFor(partie.state, marque).prompt).toEqual({ kind: 'voter', election: false });
    const vote = partie.voter(null);
    expect(deType(vote, 'vote')).toEqual([{ type: 'vote', tally: { [marque]: 2 }, executed: marque }]);
    expect(partie.state.players[marque]!.alive).toBe(false);
    expect(viewFor(partie.state, corbeau).marque).toBeNull();
  });

  it('R93 — les deux voix s’ajoutent au décompte : une voix contre deux ne renverse rien', () => {
    const partie = new Partie(8, compose(2, ['corbeau'])).nuit();
    const corbeau = siege(partie.state, 'corbeau');
    const [marque, autre] = sieges(partie.state, 'villageois');
    partie.agir(corbeau, { type: 'marquer', target: marque! });
    partie.meute(null);
    partie.aube();
    // Une seule voix contre l'autre, toutes les autres abstentions.
    for (const votant of pendingActors(partie.state)) {
      partie.agir(votant, { type: 'voter', target: votant === corbeau ? autre! : null });
    }
    expect(partie.state.log.find((l) => l.type === 'vote')).toMatchObject({
      tally: { [marque!]: 2, [autre!]: 1 },
      executed: marque,
    });
  });

  it('R93 — une marque sur un mort de la nuit ne s’annonce pas et ne compte pas', () => {
    const partie = new Partie(8, compose(2, ['corbeau'])).nuit();
    const marque = sieges(partie.state, 'villageois')[0]!;
    partie.agir(siege(partie.state, 'corbeau'), { type: 'marquer', target: marque });
    partie.meute(marque);
    const evenements = partie.aube();
    expect(deType(evenements, 'corbeau')).toHaveLength(0);
    expect(partie.state.corbeau).toBeNull();
  });

  it('R93 — personne marqué, rien d’annoncé', () => {
    const partie = new Partie(8, compose(2, ['corbeau'])).nuit();
    partie.agir(siege(partie.state, 'corbeau'), { type: 'marquer', target: null });
    partie.meute(null);
    expect(deType(partie.aube(), 'corbeau')).toHaveLength(0);
  });

  it('R93 — refus : un mort, hors de l’étape principale, un autre que le Corbeau', () => {
    const partie = new Partie(8, compose(2, ['corbeau', 'sorciere'])).nuit();
    const corbeau = siege(partie.state, 'corbeau');
    const villageois = sieges(partie.state, 'villageois')[0]!;
    refuser(avecDesMorts(partie.state, [villageois]), corbeau, { type: 'marquer', target: villageois }, 'target');
    refuser(partie.state, villageois, { type: 'marquer', target: corbeau }, 'not-your-turn');
    partie.meute(null);
    partie.agir(corbeau, { type: 'marquer', target: null });
    expect(partie.state.phase).toMatchObject({ step: 'sorciere' });
    refuser(partie.state, corbeau, { type: 'marquer', target: null }, 'wrong-phase');
  });
});

/* ------------------------------------------------------------------ */
/* R94 — le Bouc émissaire                                             */
/* ------------------------------------------------------------------ */

/** Un jour 1 qui finit sur une égalité entre deux villageois simples. */
function egalite(roles: GameOptions['roles'], ecarts: Partial<GameOptions> = {}) {
  const partie = new Partie(10, compose(2, roles, ecarts)).nuit();
  partie.meute(null);
  partie.aube();
  const [a, b] = sieges(partie.state, 'villageois');
  const votants = pendingActors(partie.state).filter((s) => s !== a && s !== b);
  const evenements: GameEvent[] = [];
  // a et b votent l'un contre l'autre, un votant de plus de chaque côté.
  evenements.push(...partie.agir(a!, { type: 'voter', target: b! }).events);
  evenements.push(...partie.agir(b!, { type: 'voter', target: a! }).events);
  evenements.push(...partie.agir(votants[0]!, { type: 'voter', target: a! }).events);
  evenements.push(...partie.agir(votants[1]!, { type: 'voter', target: b! }).events);
  for (const votant of votants.slice(2)) {
    if (partie.state.phase.kind !== 'jour') break;
    evenements.push(...partie.agir(votant, { type: 'voter', target: null }).events);
  }
  return { partie, a: a!, b: b!, evenements };
}

describe('R94 — le Bouc émissaire paie l’égalité', () => {
  it('R94 — une égalité tue le Bouc vivant, carte retournée, et le vote ne condamne personne', () => {
    const { partie, a, b, evenements } = egalite(['bouc'], { revelerRoles: false });
    const bouc = siege(partie.state, 'bouc');
    expect(deType(evenements, 'vote')[0]).toMatchObject({ executed: null, tally: { [a]: 2, [b]: 2 } });
    expect(deType(evenements, 'bouc')).toEqual([{ type: 'bouc', seat: bouc }]);
    expect(deType(evenements, 'morts')[0]!.deaths).toEqual([{ seat: bouc, cause: 'vote', role: null }]);
    expect(partie.state.players[bouc]!.revealed).toBe(true);
    expect(viewFor(partie.state, a).players[bouc]!.role).toBe('bouc');
    expect(partie.state.players[a]!.alive && partie.state.players[b]!.alive).toBe(true);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'bouc', seat: bouc });
  });

  it('R94 — son dernier mot : une phase à lui, trente secondes, le village peut parler', () => {
    const { partie } = egalite(['bouc']);
    const bouc = siege(partie.state, 'bouc');
    expect(partie.state.phase).toEqual({ kind: 'bouc', seat: bouc });
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(TRIGGER_MS);
    expect(pendingActors(partie.state)).toEqual([bouc]);
    expect(viewFor(partie.state, bouc).prompt).toEqual({ kind: 'designerVotants' });
    for (const s of livingSeats(partie.state)) {
      expect(viewFor(partie.state, s).prompt).toBeNull();
      expect(viewFor(partie.state, s).channels).toContain('village');
    }
  });

  it('R94 — il désigne les votants : public, et le lendemain eux seuls votent', () => {
    const { partie, a, b } = egalite(['bouc']);
    const bouc = siege(partie.state, 'bouc');
    const pas = partie.agir(bouc, { type: 'designerVotants', seats: [b, a, a] });
    expect(deType(pas.events, 'votants')).toEqual([{ type: 'votants', bouc, seats: [a, b].sort((x, y) => x - y) }]);
    expect(partie.state.phase.kind).toBe('nuit');
    expect(viewFor(partie.state, null).votants).toEqual([a, b].sort((x, y) => x - y));
    partie.meute(null);
    partie.aube();
    expect(pendingActors(partie.state).sort()).toEqual([a, b].sort());
    const exclu = livingSeats(partie.state).find((s) => s !== a && s !== b)!;
    expect(viewFor(partie.state, exclu).prompt).toBeNull();
    expect(viewFor(partie.state, a).prompt).toEqual({ kind: 'voter', election: false });
    refuser(partie.state, exclu, { type: 'voter', target: a }, 'cannot-vote');
    partie.voter(null);
    // La désignation ne vaut que pour ce jour-là.
    expect(partie.state.votants).toBeNull();
    expect(partie.state.log).toContainEqual({ day: 1, type: 'votants', seats: [a, b].sort((x, y) => x - y) });
  });

  it('R94 — refus : liste vide, mort, siège farfelu, autre que le Bouc', () => {
    const { partie, a } = egalite(['bouc']);
    const bouc = siege(partie.state, 'bouc');
    refuser(partie.state, bouc, { type: 'designerVotants', seats: [] }, 'target');
    refuser(partie.state, bouc, { type: 'designerVotants', seats: [bouc] }, 'target');
    refuser(partie.state, bouc, { type: 'designerVotants', seats: [99] });
    refuser(partie.state, bouc, { type: 'designerVotants', seats: [1.5] }, 'target');
    refuser(partie.state, bouc, { type: 'designerVotants', seats: 'tous' as unknown as number[] }, 'target');
    refuser(partie.state, a, { type: 'designerVotants', seats: [a] }, 'not-your-turn');
  });

  it('R94 — au temps écoulé, il s’est tu : tout le monde votera', () => {
    const { partie } = egalite(['bouc']);
    const bouc = siege(partie.state, 'bouc');
    const pas = partie.cloturer();
    expect(deType(pas.events, 'votants')).toEqual([{ type: 'votants', bouc, seats: null }]);
    expect(partie.state.votants).toBeNull();
  });

  it('R94/R61 — sans Bouc vivant, ou sans voix du tout, l’égalité n’exécute toujours personne', () => {
    const sansBouc = egalite([]);
    expect(deType(sansBouc.evenements, 'morts')).toHaveLength(0);
    expect(sansBouc.partie.state.phase.kind).toBe('nuit');

    const partie = new Partie(10, compose(2, ['bouc'])).nuit();
    partie.meute(null);
    partie.aube();
    const evenements = partie.voter(null); // aucune voix : pas d'égalité
    expect(deType(evenements, 'bouc')).toHaveLength(0);
    expect(partie.state.players[siege(partie.state, 'bouc')]!.alive).toBe(true);
  });

  it('R94/R92 — sans pouvoirs, le Bouc meurt toujours de l’égalité, mais ne désigne plus', () => {
    const partie = new Partie(12, compose(2, ['bouc', 'ancien'])).nuit();
    partie.meute(null);
    partie.aube();
    partie.voter(siege(partie.state, 'ancien'));
    expect(partie.state.pouvoirsPerdus).toBe(true);
    partie.meute(null);
    partie.aube();
    const [a, b] = sieges(partie.state, 'villageois');
    for (const votant of pendingActors(partie.state)) {
      if (partie.state.phase.kind !== 'jour') break;
      const cible = votant === a ? b! : votant === b ? a! : null;
      partie.agir(votant, { type: 'voter', target: cible });
    }
    expect(partie.state.players[siege(partie.state, 'bouc')]!.alive).toBe(false);
    expect(partie.state.phase.kind).toBe('nuit');
  });
});

/* ------------------------------------------------------------------ */
/* R95 — la Petite Fille                                               */
/* ------------------------------------------------------------------ */

describe('R95 — la Petite Fille entrevoit la meute', () => {
  it('R95 — pendant l’étape principale : des nombres par cible, jamais un loup', () => {
    const partie = new Partie(9, compose(3, ['petiteFille', 'voyante'])).nuit();
    const pf = siege(partie.state, 'petiteFille');
    const [l1, l2, l3] = livingPack(partie.state);
    const [v1, v2] = sieges(partie.state, 'villageois');
    expect(viewFor(partie.state, pf).espionnage).toEqual({});
    partie.agir(l1!, { type: 'devorer', target: v1! });
    partie.agir(l2!, { type: 'devorer', target: v1! });
    partie.agir(l3!, { type: 'devorer', target: v2! });
    expect(viewFor(partie.state, pf).espionnage).toEqual({ [v1!]: 2, [v2!]: 1 });
    // Un loup change d'avis : la vue suit.
    partie.agir(l3!, { type: 'devorer', target: v1! });
    expect(viewFor(partie.state, pf).espionnage).toEqual({ [v1!]: 3 });
    // Aucune trace d'un siège de loup dans ce qu'elle voit.
    const vue = viewFor(partie.state, pf);
    expect(vue.pack).toBeNull();
    for (const loup of [l1!, l2!, l3!]) expect(vue.players[loup]!.role).toBeNull();
    // Personne d'autre n'a d'espionnage.
    for (let s = 0; s < 9; s++) if (s !== pf) expect(viewFor(partie.state, s).espionnage).toBeNull();
    expect(viewFor(partie.state, null).espionnage).toBeNull();
  });

  it('R95 — l’étape close, la porte se referme ; morte, elle ne voit plus', () => {
    const partie = new Partie(9, compose(2, ['petiteFille', 'sorciere'])).nuit();
    const pf = siege(partie.state, 'petiteFille');
    partie.meute(pf);
    expect(partie.state.phase).toMatchObject({ step: 'sorciere' });
    expect(viewFor(partie.state, pf).espionnage).toBeNull();
    partie.aube();
    expect(viewFor(partie.state, pf).espionnage).toBeNull();
    partie.voter(null);
    expect(partie.state.players[pf]!.alive).toBe(false);
    expect(viewFor(partie.state, pf).espionnage).toBeNull();
  });

  it('R95/R88 — sans consigne, son silence est celui d’un villageois : même vue, au rôle près', () => {
    const partie = new Partie(9, compose(2, ['petiteFille'], { mortsVoientTout: false })).nuit();
    const pf = siege(partie.state, 'petiteFille');
    const villageois = sieges(partie.state, 'villageois')[0]!;
    partie.agir(livingPack(partie.state)[0]!, { type: 'devorer', target: villageois });
    expect(pendingActors(partie.state)).not.toContain(pf);
    const neutre = (vue: GameView, soi: number) => {
      const copie = structuredClone(vue);
      copie.you = null;
      copie.espionnage = null;
      copie.players[soi]!.role = null;
      return copie;
    };
    expect(viewFor(partie.state, pf).prompt).toBeNull();
    expect(viewFor(partie.state, pf).acted).toBe(false);
    expect(neutre(viewFor(partie.state, pf), pf)).toEqual(neutre(viewFor(partie.state, villageois), villageois));
  });
});

/* ------------------------------------------------------------------ */
/* R96 — le Loup Blanc dans la meute                                   */
/* ------------------------------------------------------------------ */

describe('R96 — le Loup Blanc chasse avec la meute', () => {
  it('R96 — il est de la meute, et ses complices le voient en loup ordinaire', () => {
    const partie = new Partie(9, compose(2, ['loupBlanc', 'voyante'])).nuit();
    const blanc = siege(partie.state, 'loupBlanc');
    const [l1, l2] = sieges(partie.state, 'loup');
    const vueLoup = viewFor(partie.state, l1!);
    expect(vueLoup.pack!.seats).toEqual([blanc, l1!, l2!].sort((a, b) => a - b));
    expect(vueLoup.players[blanc]!.role).toBe('loup');
    const vueBlanc = viewFor(partie.state, blanc);
    expect(vueBlanc.you!.role).toBe('loupBlanc');
    expect(vueBlanc.players[l1!]!.role).toBe('loup');
    expect(vueBlanc.prompt).toEqual({ kind: 'devorer' });
    expect(viewFor(partie.state, sieges(partie.state, 'villageois')[0]!).players[blanc]!.role).toBeNull();
    // Pendant l'étape principale, un loup ne distingue pas le Loup Blanc
    // d'un autre loup, et le Loup Blanc voit ce que voit un loup.
    const commeUnLoup = (vue: GameView, soi: number) => {
      const copie = structuredClone(vue);
      copie.you = null;
      copie.players[soi]!.role = 'loup';
      return copie;
    };
    expect(commeUnLoup(vueBlanc, blanc)).toEqual(commeUnLoup(vueLoup, l1!));
  });

  it('R96 — sa voix compte, il lit et écrit le canal des loups, et la meute ne peut pas le viser', () => {
    const partie = new Partie(9, compose(2, ['loupBlanc', 'voyante'])).nuit();
    const blanc = siege(partie.state, 'loupBlanc');
    const [l1] = sieges(partie.state, 'loup');
    const proie = sieges(partie.state, 'villageois')[0]!;
    expect(viewFor(partie.state, blanc).channels).toContain('loups');
    partie.agir(blanc, { type: 'dire', channel: 'loups', text: 'Je suis des vôtres.' });
    expect(viewFor(partie.state, l1!).chat.map((m) => m.text)).toContain('Je suis des vôtres.');
    refuser(partie.state, l1!, { type: 'devorer', target: blanc }, 'target');
    partie.agir(blanc, { type: 'devorer', target: proie });
    expect(viewFor(partie.state, l1!).pack!.votes[blanc]).toBe(proie);
    partie.cloturer();
    expect(partie.state.night.victim).toBe(proie);
  });

  it('R96 — la Voyante, elle, le voit pour ce qu’il est', () => {
    const partie = new Partie(9, compose(2, ['loupBlanc', 'voyante'])).nuit();
    const blanc = siege(partie.state, 'loupBlanc');
    const voyante = siege(partie.state, 'voyante');
    partie.agir(voyante, { type: 'sonder', target: blanc });
    partie.meute(null);
    partie.aube();
    expect(viewFor(partie.state, voyante).players[blanc]!.role).toBe('loupBlanc');
  });
});

/* ------------------------------------------------------------------ */
/* R97 — les nuits paires du Loup Blanc                                */
/* ------------------------------------------------------------------ */

/** Une table au Loup Blanc, menée jusqu'à l'étape principale de la nuit 2. */
function nuitDeux(roles: GameOptions['roles'] = [], ecarts: Partial<GameOptions> = {}): Partie {
  const partie = new Partie(10, compose(2, ['loupBlanc', ...roles], ecarts)).nuit();
  partie.meute(null);
  const premiere = partie.aube();
  // La nuit 1 est impaire : pas d'étape du Loup Blanc.
  expect(premiere.some((e) => e.type === 'phase' && e.step === 'loupBlanc')).toBe(false);
  partie.voter(null);
  expect(partie.state.day).toBe(2);
  return partie;
}

describe('R97 — une nuit sur deux, le Loup Blanc dévore un loup', () => {
  it('R97 — nuit paire : son étape suit la principale et précède la Sorcière', () => {
    const partie = nuitDeux(['sorciere']);
    const blanc = siege(partie.state, 'loupBlanc');
    const pas: GameEvent[] = [];
    for (const loup of livingPack(partie.state)) pas.push(...partie.agir(loup, { type: 'devorer', target: null }).events);
    expect(deType(pas, 'phase')).toEqual([{ type: 'phase', phase: 'nuit', step: 'loupBlanc', day: 2 }]);
    expect(viewFor(partie.state, blanc).prompt).toEqual({ kind: 'trahir' });
    expect(pendingActors(partie.state)).toEqual([blanc]);
    for (const s of sieges(partie.state, 'loup')) expect(viewFor(partie.state, s).prompt).toBeNull();
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(partie.state.options.tempsNuit * 1000);
    const [l1] = sieges(partie.state, 'loup');
    const suite = partie.agir(blanc, { type: 'trahir', target: l1! });
    expect(deType(suite.events, 'phase')[0]).toMatchObject({ step: 'sorciere' });
    // La Sorcière ne connaît que la victime de la meute.
    expect(viewFor(partie.state, siege(partie.state, 'sorciere')).prompt).toMatchObject({ victim: null });
    const aube = partie.aube();
    expect(deType(aube, 'morts')[0]!.deaths).toEqual([{ seat: l1!, cause: 'loups', role: 'loup' }]);
    expect(partie.state.log).toContainEqual({ day: 2, type: 'loupBlanc', target: l1! });
  });

  it('R97 — refus : un non-loup, lui-même, hors de son étape, un autre que lui', () => {
    const partie = nuitDeux();
    const blanc = siege(partie.state, 'loupBlanc');
    const [l1] = sieges(partie.state, 'loup');
    const villageois = sieges(partie.state, 'villageois')[0]!;
    refuser(partie.state, blanc, { type: 'trahir', target: l1! }, 'wrong-phase');
    partie.meute(null);
    refuser(partie.state, blanc, { type: 'trahir', target: villageois }, 'target');
    refuser(partie.state, blanc, { type: 'trahir', target: blanc }, 'target');
    refuser(partie.state, l1!, { type: 'trahir', target: l1! }, 'not-your-turn');
    refuser(avecDesMorts(partie.state, [l1!]), blanc, { type: 'trahir', target: l1! }, 'target');
  });

  it('R97 — le bouclier du Salvateur arrête aussi ses crocs', () => {
    const partie = nuitDeux(['salvateur']);
    const blanc = siege(partie.state, 'loupBlanc');
    const [l1] = sieges(partie.state, 'loup');
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: l1! });
    partie.meute(null);
    partie.agir(blanc, { type: 'trahir', target: l1! });
    expect(partie.state.players[l1!]!.alive).toBe(true);
  });

  it('R97/R36 — mort, son étape se tient quand même, fantôme, chaque nuit paire', () => {
    const partie = nuitDeux();
    const blanc = siege(partie.state, 'loupBlanc');
    partie.state = avecDesMorts(partie.state, [blanc]);
    partie.meute(null);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });
    expect(pendingActors(partie.state)).toEqual([]);
    for (let s = 0; s < 10; s++) expect(viewFor(partie.state, s).prompt).toBeNull();
    const durees = new Set<number>();
    for (let graine = 0; graine < 20; graine++) {
      const duree = phaseBudgetMs(partie.state, createSeededRng(graine));
      expect(duree).toBeGreaterThanOrEqual(GHOST_STEP_MS.min);
      expect(duree).toBeLessThan(GHOST_STEP_MS.min + GHOST_STEP_MS.spread);
      durees.add(duree);
    }
    expect(durees.size).toBeGreaterThan(1);
    partie.cloturer();
    expect(partie.state.log.some((l) => l.type === 'loupBlanc')).toBe(false);
  });

  it('R97 — sans Loup Blanc dans la distribution, aucune nuit n’a son étape', () => {
    const partie = new Partie(10, compose(2, ['voyante'])).nuit();
    partie.meute(null);
    partie.aube();
    partie.voter(null);
    partie.meute(null);
    const evenements = partie.aube();
    expect(evenements.some((e) => e.type === 'phase' && e.step === 'loupBlanc')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* R98 — la victoire par faction                                       */
/* ------------------------------------------------------------------ */

/** Un état fabriqué : seuls ces rôles vivent encore (un siège par rôle, dans l'ordre). */
function survivants(roles: GameOptions['roles'], loups: number, vivants: (s: GameState) => number[]): GameState {
  const state = new Partie(12, compose(loups, roles)).state;
  const garder = new Set(vivants(state));
  return avecDesMorts(
    state,
    state.players.filter((p) => !garder.has(p.seat)).map((p) => p.seat),
  );
}

describe('R98 — le Loup Blanc ne gagne que seul', () => {
  it('R98 — dernier survivant : la partie est au Loup Blanc', () => {
    const state = survivants(['loupBlanc'], 2, (s) => [siege(s, 'loupBlanc')]);
    expect(winnerOf(state)).toBe('loupBlanc');
  });

  it('R98 — la meute ne gagne qu’entre loups ordinaires, Loup Blanc mort', () => {
    const state = survivants(['loupBlanc'], 2, (s) => sieges(s, 'loup'));
    expect(winnerOf(state)).toBe('loups');
  });

  it('R98 — il ne reste que des loups, Loup Blanc compris : la partie continue', () => {
    const state = survivants(['loupBlanc'], 2, (s) => [...sieges(s, 'loup'), siege(s, 'loupBlanc')]);
    expect(winnerOf(state)).toBeNull();
  });

  it('R98 — le village ne gagne que Loup Blanc mort aussi', () => {
    const vivant = survivants(['loupBlanc'], 2, (s) => [siege(s, 'loupBlanc'), ...sieges(s, 'villageois')]);
    expect(winnerOf(vivant)).toBeNull();
    const mort = survivants(['loupBlanc'], 2, (s) => sieges(s, 'villageois'));
    expect(winnerOf(mort)).toBe('village');
  });

  it('R98/R70 — un Loup Blanc amoureux d’un loup, derniers survivants : les amoureux l’emportent', () => {
    let state = survivants(['loupBlanc'], 2, (s) => [siege(s, 'loupBlanc'), sieges(s, 'loup')[0]!]);
    state = { ...state, lovers: [siege(state, 'loupBlanc'), sieges(state, 'loup')[0]!].sort((a, b) => a - b) as [number, number] };
    expect(winnerOf(state)).toBe('amoureux');
  });

  it('R98 — en jeu : le Loup Blanc dévore le dernier loup, la fin est à lui', () => {
    const partie = nuitDeux();
    const blanc = siege(partie.state, 'loupBlanc');
    const [l1, l2] = sieges(partie.state, 'loup');
    // Il ne reste que la meute : on fabrique la table, le moteur fait le reste.
    partie.state = avecDesMorts(
      partie.state,
      partie.state.players.filter((p) => campOf(p.role) !== 'loups' || p.seat === l2).map((p) => p.seat),
    );
    partie.meute(null);
    partie.agir(blanc, { type: 'trahir', target: l1! });
    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('loupBlanc');
    expect(partie.journal.at(-1)).toEqual({ type: 'fin', winner: 'loupBlanc' });
  });
});

/* ------------------------------------------------------------------ */
/* R99 — le huis clos se termine                                       */
/* ------------------------------------------------------------------ */

describe('R99 — le huis clos ne boucle pas', () => {
  /** Un Loup Blanc et un loup, seuls au monde, à l'aube du jour 1. */
  function huisClos(): Partie {
    const partie = new Partie(8, compose(2, ['loupBlanc'])).nuit();
    const [, l2] = sieges(partie.state, 'loup');
    partie.state = avecDesMorts(
      partie.state,
      partie.state.players.filter((p) => campOf(p.role) !== 'loups' || p.seat === l2).map((p) => p.seat),
    );
    return partie;
  }

  it(`R99 — ${String(HUIS_CLOS_NUITS)} nuits sans une mort, et la meute l’emporte`, () => {
    const partie = huisClos();
    let tours = 0;
    while (!partie.state.over && tours < 50) {
      tours += 1;
      if (partie.state.phase.kind === 'jour') {
        // Ils votent l'un contre l'autre : égalité, personne.
        const [x, y] = livingSeats(partie.state);
        partie.agir(x!, { type: 'voter', target: y! });
        partie.agir(y!, { type: 'voter', target: x! });
      } else {
        partie.cloturer();
      }
    }
    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('loups');
    // Trois nuits de huis clos — dont la nuit 2, paire — puis la fin.
    expect(partie.state.day).toBe(HUIS_CLOS_NUITS + 1);
    expect(livingSeats(partie.state)).toHaveLength(2);
  });

  it('R99 — une mort rouvre le compte', () => {
    const partie = new Partie(9, compose(3, ['loupBlanc'])).nuit();
    partie.state = avecDesMorts(
      partie.state,
      partie.state.players.filter((p) => campOf(p.role) !== 'loups').map((p) => p.seat),
    );
    partie.meute(null);
    partie.aube();
    // On fabrique un huis clos à bout de souffle : la prochaine nuit serait la dernière…
    partie.state = { ...partie.state, huisClos: HUIS_CLOS_NUITS };
    const [l1] = sieges(partie.state, 'loup');
    partie.voter(l1!); // … mais une exécution rouvre le compte
    expect(partie.state.players[l1!]!.alive).toBe(false);
    expect(partie.state.over).toBe(false);
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.huisClos).toBe(1); // la nuit 2 vient de s'ouvrir, compte rouvert
  });
});

/* ------------------------------------------------------------------ */
/* R86 — le déterminisme tient avec les nouveaux rôles                 */
/* ------------------------------------------------------------------ */

describe('R86 — une même graine, une même partie, rôles de la v2 compris', () => {
  it('R86 — deux parties à la même graine produisent les mêmes états', () => {
    const jouer = () => {
      const partie = new Partie(12, compose(2, ['ancien', 'corbeau', 'bouc', 'petiteFille', 'loupBlanc']), 77).nuit();
      partie.agir(siege(partie.state, 'corbeau'), { type: 'marquer', target: siege(partie.state, 'ancien') });
      partie.meute(siege(partie.state, 'ancien'));
      partie.aube();
      partie.voter(null);
      partie.meute(null);
      partie.aube();
      return partie.state;
    };
    expect(jouer()).toEqual(jouer());
  });
});
