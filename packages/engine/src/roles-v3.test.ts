/**
 * Les rôles de la v3, vagues 1 et 2 — les règles R105 à R114.
 *
 * Le Villageois-Villageois que toute la table lit « villageois » (R106, D31),
 * le Renard qui flaire un trio de voisins (R107, D29), le Montreur d'Ours
 * dont l'ourson gronde à l'aube (R108, D30). Et d'abord le voisinage : +1 à
 * gauche, −1 à droite (R105) — c'est la géométrie sur laquelle toute la v3
 * s'appuie, le Chevalier de la vague 3 compris.
 *
 * La deuxième vague pose le camp effectif, relu par tous ses lecteurs (R109,
 * D27), le Voleur et son talon de deux cartes (R110, D44), le Chien-Loup qui
 * se range la première nuit (R111, D32), l'Enfant Sauvage et son modèle
 * jamais informé (R112, D33), les Deux Sœurs et les Trois Frères (R113) et
 * leur canal, la nuit comme le jour (R114, D28).
 *
 * Chaque test cite la règle qu'il vérifie dans `docs/RULES.md` ; chaque
 * déroulé est joué pas à pas sur un générateur seedé (R86), les minuteries
 * déclenchées à la main par `timeoutPhase`. Le cadre des vagues — les huit
 * identifiants, et eux seuls, tenus à l'écart du générateur — est D26.
 *
 * La non-fuite d'information face à ces rôles, et la terminaison de milliers
 * de parties, vivent à côté, dans `roles-v3-simulation.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  DECALAGE_FRATRIE,
  livingPack,
  livingSeats,
  MAX_CHAT_PER_CHANNEL,
  pendingActors,
  timeoutPhase,
  voisinsDe,
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
  OPTIONAL_ROLES_V3,
  ROLES,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type RoleId,
  type Rng,
  type Step,
} from './types.js';
import { viewFor } from './views.js';

/* ------------------------------------------------------------------ */
/* Une partie menée à la main — le harnais de la v2, tel quel           */
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

  /** Une nuit blanche de bout en bout : personne ne joue, le temps clôt tout. */
  nuitBlanche(): GameEvent[] {
    expect(this.state.phase.kind).toBe('nuit');
    return this.aube();
  }

  /** Le village vote d'une seule voix ; la cible, elle, s'abstient (R60). */
  voter(cible: number | null): void {
    expect(this.state.phase.kind).toBe('jour');
    const seq = this.state.phaseSeq;
    for (const votant of pendingActors(this.state)) {
      if (this.state.phaseSeq !== seq) break;
      this.agir(votant, { type: 'voter', target: votant === cible ? null : cible });
    }
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
function refuser(state: GameState, siege: number, action: Action, code?: string): void {
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
/* R105 — le voisinage                                                 */
/* ------------------------------------------------------------------ */

describe('R105 — le voisinage se lit dans l’ordre du cercle', () => {
  it('R105 — le siège +1 est à gauche, le −1 à droite, bord au bord', () => {
    const state = new Partie(8, compose(2, ['renard'])).state;
    // Le client pose les rangs depuis le bas, sens des aiguilles d'une
    // montre : un joueur face au centre a son siège +1 à sa gauche.
    expect(voisinsDe(state, 3)).toEqual([2, 4]);
    expect(voisinsDe(state, 0)).toEqual([7, 1]);
    expect(voisinsDe(state, 7)).toEqual([6, 0]);
  });

  it('R105 — voisinsDe est une lecture pure : ni état, ni secret, ni aléa', () => {
    const partie = new Partie(6, compose(2, ['ours']));
    const avant = structuredClone(partie.state);
    for (let s = 0; s < 6; s++) voisinsDe(partie.state, s);
    expect(partie.state).toEqual(avant);
  });
});

/* ------------------------------------------------------------------ */
/* R90/D26 — le cadre de la vague                                      */
/* ------------------------------------------------------------------ */

describe('R90/D26 — huit rôles de la v3, vagues 1 et 2, tenus à l’écart du générateur', () => {
  it('R90 — les huit rôles existent pour le moteur, avec leur camp et leur faction', () => {
    expect(OPTIONAL_ROLES_V3).toEqual([
      'villageois2',
      'renard',
      'ours',
      'voleur',
      'chienLoup',
      'enfantSauvage',
      'soeurs',
      'freres',
    ]);
    for (const role of OPTIONAL_ROLES_V3) expect(ROLES).toContain(role);
    // Les listes d'avant n'ont pas bougé d'une ligne (D26).
    expect(OPTIONAL_ROLES).toEqual(['ancien', 'corbeau', 'bouc', 'petiteFille', 'loupBlanc']);
    // Le camp d'origine des huit est au village — le Chien-Loup et l'Enfant
    // Sauvage en divergent en cours de partie, au camp effectif (R109).
    for (const role of OPTIONAL_ROLES_V3) {
      expect(campOf(role)).toBe('village');
      expect(factionOf(role)).toBe('village');
    }
  });

  it('R90/R10 — le sanitizeur accepte les huit, dans l’ordre du moteur, un de chaque', () => {
    expect(
      sanitizeOptions({
        roles: [
          'freres',
          'voleur',
          'ours',
          'renard',
          'villageois2',
          'voyante',
          'renard',
          'dragon',
          'bouc',
          'soeurs',
        ],
      }).roles,
    ).toEqual(['voyante', 'bouc', 'villageois2', 'renard', 'ours', 'voleur', 'soeurs', 'freres']);
  });

  it('R90/D26 — la référence, les suggestions et le générateur ne tirent jamais la v3', () => {
    for (let joueurs = MIN_PLAYERS; joueurs <= MAX_PLAYERS; joueurs++) {
      for (const role of OPTIONAL_ROLES_V3) {
        expect(autoComposition(joueurs).roles as string[]).not.toContain(role);
        for (const suggestion of suggestionsFor(joueurs)) {
          expect(suggestion.roles as string[]).not.toContain(role);
        }
      }
      for (let graine = 0; graine < 30; graine++) {
        const simple = randomComposition(joueurs, createSeededRng(graine));
        const etendue = randomComposition(joueurs, createSeededRng(graine), { optionnels: true });
        for (const roles of [simple.roles, etendue.roles]) {
          for (const role of OPTIONAL_ROLES_V3) expect(roles as string[]).not.toContain(role);
        }
      }
    }
  });

  it('R90/R13/R113 — cinq se jouent dès six, les fratries plus tard, et rien n’existe qu’en un exemplaire', () => {
    for (const role of OPTIONAL_ROLES_V3) {
      // Les fratries veulent du monde autour (R113) ; tout le reste joue dès
      // la borne de la table.
      if (role === 'soeurs' || role === 'freres') continue;
      expect(OPTIONAL_ROLE_MIN_PLAYERS[role]).toBe(MIN_PLAYERS);
    }
    expect(OPTIONAL_ROLE_MIN_PLAYERS.soeurs).toBe(10);
    expect(OPTIONAL_ROLE_MIN_PLAYERS.freres).toBe(12);
    const distribues = compositionFor(6, compose(2, ['renard', 'ours']));
    expect(distribues).toHaveLength(6);
    expect(distribues.filter((r) => r === 'villageois')).toHaveLength(2);
    expect(compositionFor(6, compose(2, ['villageois2', 'renard', 'ours']))).toHaveLength(6);
    expect(() => compositionFor(10, compose(2, ['renard', 'renard']))).toThrow(IllegalActionError);
  });
});

/* ------------------------------------------------------------------ */
/* R106 — le Villageois-Villageois                                     */
/* ------------------------------------------------------------------ */

describe('R106 — le Villageois-Villageois se lit « villageois » de toute la table', () => {
  // (L'Infecté des Loups-Garous, qui retourne une carte sans la retourner,
  // n'arrive qu'à la vague 5 : rien ici ne doit l'anticiper.)

  it('R106 — ni verbe, ni consigne, ni état : un villageois comme les autres', () => {
    const partie = new Partie(8, compose(2, ['villageois2'])).nuit();
    const porteur = siege(partie.state, 'villageois2');
    expect(viewFor(partie.state, porteur).prompt).toBeNull();
    expect(pendingActors(partie.state)).not.toContain(porteur);
    expect(pendingActors(partie.state)).toEqual(livingPack(partie.state));
  });

  it('R106/D31 — vivant, sa carte dit villageois à tous — porteur compris', () => {
    const partie = new Partie(8, compose(2, ['villageois2', 'voyante'])).nuit();
    const porteur = siege(partie.state, 'villageois2');
    expect(viewFor(partie.state, porteur).you!.role).toBe('villageois');
    // Les autres ne voient rien, comme pour un villageois ordinaire.
    for (let s = 0; s < 8; s++) {
      if (s === porteur) continue;
      expect(viewFor(partie.state, s).players[porteur]!.role).toBeNull();
    }
  });

  it('R106/D31 — la Voyante qui le sonde, et son carnet, voient un villageois', () => {
    const partie = new Partie(8, compose(2, ['villageois2', 'voyante'])).nuit();
    const porteur = siege(partie.state, 'villageois2');
    const voyante = siege(partie.state, 'voyante');
    partie.agir(voyante, { type: 'sonder', target: porteur });
    partie.meute(null);
    partie.aube();
    expect(viewFor(partie.state, voyante).players[porteur]!.role).toBe('villageois');
    expect(viewFor(partie.state, voyante).inspections).toEqual([
      { day: 1, target: porteur, role: 'villageois' },
    ]);
  });

  it('R106/D31 — mort sous les crocs, l’annonce publique dit villageois comme sa carte', () => {
    const partie = new Partie(8, compose(2, ['villageois2'])).nuit();
    const porteur = siege(partie.state, 'villageois2');
    // Sans autre rôle de nuit, l'aube tombe au dernier croc : les évènements
    // de la meute et ceux de la clôture se suivent.
    const evenements = [...partie.meute(porteur), ...partie.aube()];
    expect(deType(evenements, 'morts')[0]!.deaths).toEqual([
      { seat: porteur, cause: 'loups', role: 'villageois' },
    ]);
    for (let s = 0; s < 8; s++) expect(viewFor(partie.state, s).players[porteur]!.role).toBe('villageois');
  });

  it('R106/D31 — la fin de partie seule dit villageois2', () => {
    const partie = new Partie(8, compose(2, ['villageois2']));
    partie.state = { ...partie.state, over: true, winner: 'village', phase: { kind: 'fin' } };
    const porteur = siege(partie.state, 'villageois2');
    expect(viewFor(partie.state, porteur).you!.role).toBe('villageois2');
    for (let s = 0; s < 8; s++) {
      if (s === porteur) continue;
      expect(viewFor(partie.state, s).players[porteur]!.role).toBe('villageois2');
    }
  });
});

/* ------------------------------------------------------------------ */
/* R107 — le Renard                                                    */
/* ------------------------------------------------------------------ */

/** Le trio d'un centre ne compte aucun loup — vivant ou mort, ici importe peu. */
function trioSansLoup(state: GameState, centre: number): boolean {
  const [droite, gauche] = voisinsDe(state, centre);
  return [centre, droite, gauche].every((s) => campOf(state.players[s]!.role) === 'village');
}

/** Une table où un loup vivant est voisin immédiat du Renard. */
function renardVoisinDesLoups(): Partie {
  for (let graine = 1; graine <= 500; graine++) {
    const partie = new Partie(8, compose(2, ['renard']), graine).nuit();
    const renard = siege(partie.state, 'renard');
    const [droite, gauche] = voisinsDe(partie.state, renard);
    if ([droite, gauche].some((s) => partie.state.players[s]!.role === 'loup')) return partie;
  }
  throw new Error('aucune graine ne met un loup à côté du Renard');
}

describe('R107 — le Renard flaire un trio, comme le Corbeau marque', () => {
  it('R107 — il joue pendant l’étape principale, en parallèle des autres rôles', () => {
    const partie = new Partie(8, compose(2, ['renard', 'corbeau', 'voyante'])).nuit();
    const renard = siege(partie.state, 'renard');
    expect(viewFor(partie.state, renard).prompt).toEqual({ kind: 'flairer' });
    expect(pendingActors(partie.state)).toContain(renard);
    expect(pendingActors(partie.state)).toContain(siege(partie.state, 'corbeau'));
    // Aucune nouvelle étape de nuit pour lui : la principale suffit (R107).
    partie.agir(renard, { type: 'flairer', centre: renard }); // lui-même : permis (D29)
    expect(pendingActors(partie.state)).not.toContain(renard);
    expect(viewFor(partie.state, renard).acted).toBe(true);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
  });

  it('R107 — un loup dans le trio : le carnet le dit, le flair lui reste', () => {
    const partie = new Partie(8, compose(2, ['renard'])).nuit();
    const renard = siege(partie.state, 'renard');
    const loup = sieges(partie.state, 'loup')[0]!;
    const [droite, gauche] = voisinsDe(partie.state, loup);
    const trio = [loup, droite, gauche].sort((a, b) => a - b);
    partie.agir(renard, { type: 'flairer', centre: loup });
    partie.nuitBlanche();
    expect(partie.state.renardSavoirs).toEqual([{ day: 1, seats: trio, loups: true }]);
    expect(partie.state.renardPouvoir).toBe(true);
    expect(viewFor(partie.state, renard).renardSavoirs).toEqual([{ day: 1, seats: trio, loups: true }]);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'renard', centre: loup, loups: true });
    // Le flair lui reste : la nuit suivante, la consigne revient.
    partie.voter(null);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    expect(viewFor(partie.state, renard).prompt).toEqual({ kind: 'flairer' });
  });

  it('R107/R88 — le flair ne paraît nulle part : ni évènement, ni carnet pour qui n’est pas lui', () => {
    const partie = new Partie(8, compose(2, ['renard', 'voyante'])).nuit();
    const renard = siege(partie.state, 'renard');
    partie.agir(renard, { type: 'flairer', centre: sieges(partie.state, 'loup')[0]! });
    partie.nuitBlanche();
    // Aucun évènement ne porte le flair — pas même son existence (R87).
    expect(JSON.stringify(partie.journal)).not.toContain('renard');
    for (let s = 0; s < 8; s++) {
      if (s === renard) continue;
      expect(viewFor(partie.state, s).renardSavoirs).toEqual([]);
    }
    expect(viewFor(partie.state, null).renardSavoirs).toEqual([]);
  });

  it('R107 — un trio sans loup : le flair s’éteint à vie, les innocents restent au carnet', () => {
    const partie = new Partie(8, compose(2, ['renard'])).nuit();
    const renard = siege(partie.state, 'renard');
    const centre = livingSeats(partie.state).find((s) => trioSansLoup(partie.state, s));
    expect(centre).toBeDefined();
    const [droite, gauche] = voisinsDe(partie.state, centre!);
    const trio = [centre!, droite, gauche].sort((a, b) => a - b);
    partie.agir(renard, { type: 'flairer', centre: centre! });
    partie.nuitBlanche();
    // Le carnet dit les trois innocents ; le flair, lui, s'éteint.
    expect(partie.state.renardSavoirs).toEqual([{ day: 1, seats: trio, loups: false }]);
    expect(partie.state.renardPouvoir).toBe(false);
    // Éteint à vie : plus de consigne la nuit suivante, plus de flair possible.
    partie.voter(null);
    expect(viewFor(partie.state, renard).prompt).toBeNull();
    refuser(partie.state, renard, { type: 'flairer', centre: renard }, 'powers');
  });

  it('R107 — s’abstenir ne coûte rien : ni savoir, ni perte', () => {
    const partie = new Partie(8, compose(2, ['renard'])).nuit();
    const renard = siege(partie.state, 'renard');
    partie.agir(renard, { type: 'flairer', centre: null });
    partie.nuitBlanche();
    expect(partie.state.renardSavoirs).toEqual([]);
    expect(partie.state.renardPouvoir).toBe(true);
    expect(partie.state.log.some((l) => l.type === 'renard')).toBe(false);
  });

  it('R107/D29 — le Renard peut être le centre de son propre trio — et y trouver un loup', () => {
    const partie = renardVoisinDesLoups();
    const renard = siege(partie.state, 'renard');
    const [droite, gauche] = voisinsDe(partie.state, renard);
    const trio = [renard, droite, gauche].sort((a, b) => a - b);
    partie.agir(renard, { type: 'flairer', centre: renard });
    partie.nuitBlanche();
    expect(partie.state.renardSavoirs).toEqual([{ day: 1, seats: trio, loups: true }]);
    expect(partie.state.renardPouvoir).toBe(true);
  });

  it('R107 — un voisin mort n’est jamais remplacé : le trio rapetisse', () => {
    const partie = new Partie(8, compose(2, ['renard'])).nuit();
    const renard = siege(partie.state, 'renard');
    const centre = livingSeats(partie.state).find((s) => s !== renard && trioSansLoup(partie.state, s));
    expect(centre).toBeDefined();
    const [droite, gauche] = voisinsDe(partie.state, centre!);
    // Table fabriquée : voisins du centre et meute morts — au trio, il ne
    // reste que son centre.
    partie.state = avecDesMorts(partie.state, [droite, gauche, ...sieges(partie.state, 'loup')]);
    partie.agir(renard, { type: 'flairer', centre: centre! });
    // Le flair clôt l'étape à lui seul : personne d'autre n'attend.
    expect(partie.state.renardSavoirs).toEqual([{ day: 1, seats: [centre!], loups: false }]);
    expect(partie.state.renardPouvoir).toBe(false);
  });

  it('R107/R92 — la rancune de l’Ancien éteint le flair pour la vie', () => {
    const partie = new Partie(12, compose(2, ['ancien', 'renard'])).nuit();
    const renard = siege(partie.state, 'renard');
    partie.meute(null);
    partie.aube();
    partie.voter(siege(partie.state, 'ancien'));
    expect(partie.state.pouvoirsPerdus).toBe(true);
    expect(partie.state.renardPouvoir).toBe(false);
    expect(viewFor(partie.state, renard).prompt).toBeNull();
    refuser(partie.state, renard, { type: 'flairer', centre: renard }, 'powers');
  });

  it('R107 — refus : un autre que le Renard, un mort, hors de l’étape principale', () => {
    const partie = new Partie(8, compose(2, ['renard', 'sorciere'])).nuit();
    const renard = siege(partie.state, 'renard');
    const villageois = sieges(partie.state, 'villageois')[0]!;
    refuser(partie.state, villageois, { type: 'flairer', centre: renard }, 'not-your-turn');
    refuser(avecDesMorts(partie.state, [renard]), renard, { type: 'flairer', centre: null }, 'not-your-turn');
    refuser(avecDesMorts(partie.state, [villageois]), renard, { type: 'flairer', centre: villageois }, 'target');
    partie.agir(renard, { type: 'flairer', centre: null });
    partie.meute(null);
    expect(partie.state.phase).toMatchObject({ step: 'sorciere' });
    refuser(partie.state, renard, { type: 'flairer', centre: null }, 'wrong-phase');
    partie.aube();
    refuser(partie.state, renard, { type: 'flairer', centre: null }, 'wrong-phase');
  });
});

/* ------------------------------------------------------------------ */
/* R108 — le Montreur d'Ours                                           */
/* ------------------------------------------------------------------ */

/** Une table où l'Ours vivant a — ou n'a pas — un loup à ses côtés. */
function tableOurs(loupVoisin: boolean, roles: GameOptions['roles'] = ['ours'], joueurs = 6): Partie {
  for (let graine = 1; graine <= 500; graine++) {
    const partie = new Partie(joueurs, compose(2, [...roles]), graine).nuit();
    const ours = siege(partie.state, 'ours');
    const [droite, gauche] = voisinsDe(partie.state, ours);
    if ([droite, gauche].some((s) => partie.state.players[s]!.role === 'loup') === loupVoisin) {
      return partie;
    }
  }
  throw new Error('aucune graine ne place un loup à côté de l’Ours');
}

describe('R108 — la grogne du Montreur d’Ours à l’aube', () => {
  it('R108 — un loup voisin vivant : l’ourson gronde, et l’aube le dit à tous', () => {
    const partie = tableOurs(true);
    const ours = siege(partie.state, 'ours');
    const evenements = [...partie.meute(null), ...partie.aube()];
    expect(deType(evenements, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: true }]);
    // La grogne suit l'annonce des morts — ici, l'aube paisible.
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('ours')).toBeGreaterThan(types.indexOf('aube-paisible'));
    expect(partie.state.log).toContainEqual({ day: 1, type: 'ours', seat: ours, grogne: true });
  });

  it('R108 — pas de loup voisin : le silence de l’ourson est une information — l’évènement a lieu', () => {
    const partie = tableOurs(false);
    const ours = siege(partie.state, 'ours');
    const evenements = partie.nuitBlanche();
    expect(deType(evenements, 'aube-paisible')).toHaveLength(1);
    expect(deType(evenements, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: false }]);
  });

  it('R108 — un voisin mort ne compte pas : le loup voisin exécuté, l’ourson se tait', () => {
    // Un loup voisin exactement — l'autre loup est ailleurs : le vote du jour
    // départage les deux cas. (La meute, elle, ne dévore pas les siens.)
    let partie: Partie | null = null;
    let loupVoisin = -1;
    for (let graine = 1; graine <= 500 && partie === null; graine++) {
      const essai = new Partie(6, compose(2, ['ours']), graine).nuit();
      const ours = siege(essai.state, 'ours');
      const [droite, gauche] = voisinsDe(essai.state, ours);
      const voisinsLoups = [droite, gauche].filter((s) => essai.state.players[s]!.role === 'loup');
      if (voisinsLoups.length === 1) {
        partie = essai;
        loupVoisin = voisinsLoups[0]!;
      }
    }
    expect(partie).not.toBeNull();
    const ours = siege(partie!.state, 'ours');
    // Nuit 1 : l'aube gronde — le loup voisin est en vie.
    const premiere = [...partie!.meute(null), ...partie!.aube()];
    expect(deType(premiere, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: true }]);
    // Le village exécute le loup voisin ; la nuit suivante, l'ourson se tait.
    partie!.voter(loupVoisin);
    expect(partie!.state.players[loupVoisin]!.alive).toBe(false);
    const seconde = [...partie!.meute(null), ...partie!.aube()];
    expect(deType(seconde, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: false }]);
  });

  it('R108 — l’Ours mort ne gronde pas : pas de grogne posthume', () => {
    const partie = tableOurs(true);
    const ours = siege(partie.state, 'ours');
    const evenements = [...partie.meute(ours), ...partie.aube()];
    expect(deType(evenements, 'morts')[0]!.deaths.map((d) => d.seat)).toEqual([ours]);
    expect(deType(evenements, 'ours')).toHaveLength(0);
    expect(partie.state.log.some((l) => l.type === 'ours')).toBe(false);
  });

  it('R108/D30 — la rancune de l’Ancien n’éteint pas la grogne : un instinct, pas un pouvoir', () => {
    const partie = tableOurs(true, ['ancien', 'ours'], 8);
    const ours = siege(partie.state, 'ours');
    partie.meute(null);
    partie.aube();
    partie.voter(siege(partie.state, 'ancien'));
    expect(partie.state.pouvoirsPerdus).toBe(true);
    const evenements = [...partie.meute(null), ...partie.aube()];
    expect(deType(evenements, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: true }]);
  });

  it('R108/R93 — la grogne suit les morts et la marque du Corbeau, avant le jour', () => {
    const partie = tableOurs(true, ['ours', 'corbeau'], 8);
    const marque = sieges(partie.state, 'villageois')[0]!;
    partie.agir(siege(partie.state, 'corbeau'), { type: 'marquer', target: marque });
    const evenements = [...partie.meute(sieges(partie.state, 'villageois')[1]!), ...partie.aube()];
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('morts')).toBeLessThan(types.indexOf('corbeau'));
    expect(types.indexOf('corbeau')).toBeLessThan(types.indexOf('ours'));
    expect(types.indexOf('ours')).toBeLessThan(types.indexOf('phase'));
  });
});

/* ------------------------------------------------------------------ */
/* R86 — le déterminisme tient avec les trois rôles                    */
/* ------------------------------------------------------------------ */

describe('R86 — une même graine, une même partie, v3 comprise', () => {
  it('R86 — deux parties à la même graine produisent les mêmes états', () => {
    const jouer = () => {
      const partie = new Partie(12, compose(2, ['villageois2', 'renard', 'ours']), 77).nuit();
      partie.agir(siege(partie.state, 'renard'), { type: 'flairer', centre: siege(partie.state, 'renard') });
      partie.meute(sieges(partie.state, 'villageois')[0]!);
      partie.aube();
      partie.voter(null);
      partie.meute(null);
      partie.aube();
      return partie.state;
    };
    expect(jouer()).toEqual(jouer());
  });
});

/* ------------------------------------------------------------------ */
/* R109 — le camp effectif                                             */
/* ------------------------------------------------------------------ */

describe('R109 — le camp effectif, relu par chacun de ses lecteurs', () => {
  it('R109 — la victoire compte le Chien-Loup rangé chez les loups', () => {
    const partie = new Partie(8, compose(2, ['chienLoup']));
    const chien = siege(partie.state, 'chienLoup');
    const morts = Array.from({ length: 8 }, (_, i) => i).filter((s) => s !== chien);
    const fabrique = avecDesMorts(partie.state, morts);
    // Rangé chez les loups, seul debout : la meute l’emporte — c’est son camp
    // effectif qui compte, pas sa carte.
    fabrique.players[chien]!.camp = 'loups';
    expect(winnerOf(fabrique)).toBe('loups');
    // Rangé au village — ou pas rangé du tout —, le village l’emporte.
    fabrique.players[chien]!.camp = null;
    expect(winnerOf(fabrique)).toBe('village');
  });

  it('R109/D27 — un couple se relit aux factions effectives', () => {
    const partie = new Partie(8, compose(2, ['chienLoup']));
    const chien = siege(partie.state, 'chienLoup');
    const amie = sieges(partie.state, 'villageois')[0]!;
    const morts = Array.from({ length: 8 }, (_, i) => i).filter((s) => s !== chien && s !== amie);
    const fabrique = avecDesMorts(partie.state, morts);
    fabrique.lovers = [Math.min(chien, amie), Math.max(chien, amie)];
    // Le Chien-Loup rangé chez les loups et sa villageoise : un couple mixte,
    // même si Cupidon les a liés villageois tous les deux.
    fabrique.players[chien]!.camp = 'loups';
    expect(winnerOf(fabrique)).toBe('amoureux');
    // Pas rangé : deux villageois, le village gagne.
    fabrique.players[chien]!.camp = null;
    expect(winnerOf(fabrique)).toBe('village');
  });

  it('R109/D33 — la meute vivante accueille le Chien-Loup, l’Enfant transformé attend son réveil', () => {
    const partie = new Partie(8, compose(2, ['chienLoup', 'enfantSauvage'])).nuit();
    const chien = siege(partie.state, 'chienLoup');
    const enfant = siege(partie.state, 'enfantSauvage');
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    partie.nuitBlanche();
    // Un Enfant transformé d’hypothèse, avant que la nuit ne l’accueille : son
    // camp est aux loups, la meute ne le connaît pas encore.
    const joueur = partie.state.players[enfant]!;
    joueur.role = 'loup';
    joueur.camp = 'loups';
    partie.state.enfantReveil = enfant;
    expect(livingPack(partie.state)).toContain(chien);
    expect(livingPack(partie.state)).not.toContain(enfant);
    // Le réveil consommé, la meute l’accueille.
    partie.state.enfantReveil = null;
    expect(livingPack(partie.state)).toContain(enfant);
  });

  it('R109/D27 — le Loup Blanc dévore au camp effectif, jamais un Loup Blanc', () => {
    const partie = new Partie(10, compose(2, ['loupBlanc', 'chienLoup'])).nuit();
    const blanc = siege(partie.state, 'loupBlanc');
    const chien = siege(partie.state, 'chienLoup');
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    partie.meute(null);
    partie.aube();
    partie.voter(null); // nuit 2, paire : l’étape du Loup Blanc s’ouvre
    partie.meute(null);
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });
    refuser(partie.state, blanc, { type: 'trahir', target: blanc }, 'target');
    refuser(partie.state, blanc, { type: 'trahir', target: sieges(partie.state, 'villageois')[0]! }, 'target');
    // Le Chien-Loup rangé chez les loups est une proie comme un autre loup.
    partie.agir(blanc, { type: 'trahir', target: chien });
    partie.aube();
    expect(partie.state.players[chien]!.alive).toBe(false);
    expect(deType(partie.journal, 'morts').at(-1)!.deaths).toContainEqual({
      seat: chien,
      cause: 'loups',
      role: 'chienLoup',
    });
  });
});

/* ------------------------------------------------------------------ */
/* R110 — le Voleur                                                    */
/* ------------------------------------------------------------------ */

describe('R110 — le Voleur choisit sa carte avant la révélation', () => {
  it('R110/D44 — la distribution : le Voleur tire un siège, le talon garde deux cartes', () => {
    const partie = new Partie(8, compose(2, ['voleur']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    // Le paquet comptait dix cartes — la composition plus deux villageois
    // (D44), dont celle du Voleur, déjà jouée : sept distribuées, deux au
    // talon, un Voleur.
    expect(partie.journal).toEqual([{ type: 'debut' }, { type: 'phase', phase: 'voleur', day: 1 }]);
    expect(partie.state.day).toBe(1);
    expect(partie.state.players[phase.seat]!.role).toBe('voleur');
    expect(phase.cartes).toHaveLength(2);
    expect(phase.cartes).not.toContain('voleur');
    // La phase n’attend que lui (R87) : personne d’autre n’a de consigne.
    expect(pendingActors(partie.state)).toEqual([phase.seat]);
    for (let s = 0; s < 8; s++) {
      if (s === phase.seat) continue;
      expect(viewFor(partie.state, s).prompt).toBeNull();
    }
  });

  it('R110/R87 — le talon ne se montre qu’à lui, et aucun évènement ne dit le choix', () => {
    const partie = new Partie(8, compose(2, ['voleur', 'voyante']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    const prompt = viewFor(partie.state, phase.seat).prompt;
    if (prompt?.kind !== 'voler') throw new Error('pas de consigne de vol');
    expect(prompt.cartes).toEqual(phase.cartes);
    expect(prompt.obligatoire).toBe(phase.cartes.every((carte) => campOf(carte) === 'loups'));
    for (let s = 0; s < 8; s++) {
      if (s === phase.seat) continue;
      const vue = viewFor(partie.state, s);
      expect(vue.prompt).toBeNull();
      // Le talon ne paraît nulle part ailleurs : le prompt est son seul porteur.
      expect(JSON.stringify(vue)).not.toContain(JSON.stringify(prompt.cartes));
    }
    partie.agir(phase.seat, { type: 'voler', carte: 0 });
    // La phase seule s’annonce : ni la carte prise, ni le choix.
    expect(partie.journal.at(-1)).toEqual({ type: 'phase', phase: 'revelation', day: 1 });
  });

  it('R110 — deux loups au talon : il faut prendre une carte', () => {
    const partie = new Partie(8, compose(2, ['voleur']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    // Talon fabriqué : deux loups — l’obligation, à elle seule (R110).
    partie.state.phase = { kind: 'voleur', seat: phase.seat, cartes: ['loup', 'loup'] };
    expect(viewFor(partie.state, phase.seat).prompt).toMatchObject({ kind: 'voler', obligatoire: true });
    refuser(partie.state, phase.seat, { type: 'voler', carte: null }, 'illegal');
    refuser(partie.state, (phase.seat + 1) % 8, { type: 'voler', carte: 0 }, 'not-your-turn');
    partie.agir(phase.seat, { type: 'voler', carte: 1 });
    expect(partie.state.players[phase.seat]!.role).toBe('loup');
    expect(partie.state.log).toContainEqual({ day: 1, type: 'voleur', carte: 'loup' });
    expect(partie.state.phase).toMatchObject({ kind: 'revelation' });
  });

  it('R110 — sans obligation, il peut rester Voleur — une carte sans pouvoir, pour toujours', () => {
    const partie = new Partie(8, compose(2, ['voleur']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    partie.state.phase = { kind: 'voleur', seat: phase.seat, cartes: ['voyante', 'sorciere'] };
    expect(viewFor(partie.state, phase.seat).prompt).toMatchObject({ kind: 'voler', obligatoire: false });
    partie.agir(phase.seat, { type: 'voler', carte: null });
    expect(partie.state.players[phase.seat]!.role).toBe('voleur');
    // Le récapitulatif dira qu’il n’a rien pris : « voleur », sa carte.
    expect(partie.state.log).toContainEqual({ day: 1, type: 'voleur', carte: 'voleur' });
    partie.nuit();
    expect(partie.state.day).toBe(1);
    expect(viewFor(partie.state, phase.seat).prompt).toBeNull();
    expect(pendingActors(partie.state)).not.toContain(phase.seat);
  });

  it('R110/D44b — le temps écoulé : la première carte si c’est obligé, sinon il reste Voleur', () => {
    const obligé = new Partie(8, compose(2, ['voleur']));
    const phaseA = obligé.state.phase;
    if (phaseA.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    obligé.state.phase = { kind: 'voleur', seat: phaseA.seat, cartes: ['loup', 'loupBlanc'] };
    obligé.cloturer();
    expect(obligé.state.players[phaseA.seat]!.role).toBe('loup');
    expect(obligé.state.log).toContainEqual({ day: 1, type: 'voleur', carte: 'loup' });
    expect(obligé.state.phase).toMatchObject({ kind: 'revelation' });

    const libre = new Partie(8, compose(2, ['voleur']));
    const phaseB = libre.state.phase;
    if (phaseB.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    libre.state.phase = { kind: 'voleur', seat: phaseB.seat, cartes: ['voyante', 'sorciere'] };
    libre.cloturer();
    expect(libre.state.players[phaseB.seat]!.role).toBe('voleur');
    expect(libre.state.log).toContainEqual({ day: 1, type: 'voleur', carte: 'voleur' });
  });

  it('R110/R33 — le piège : voleur, révélation, élection, nuit — le compteur n’a pas bougé', () => {
    const partie = new Partie(
      8,
      compose(2, ['voleur', 'cupidon'], { capitaine: true, capitaineAvantNuit1: true }),
    );
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    partie.agir(phase.seat, { type: 'voler', carte: 0 });
    expect(partie.state.day).toBe(1);
    partie.cloturer();
    expect(partie.state.phase.kind).toBe('election');
    expect(partie.state.day).toBe(1);
    let garde = 0;
    while (partie.state.phase.kind === 'election' && garde++ < 12) {
      partie.agir(pendingActors(partie.state)[0]!, { type: 'voter', target: 0 });
    }
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    // La première nuit, pas la deuxième : les gardes du jour 1 tiennent —
    // Cupidon tire encore (R37).
    expect(partie.state.day).toBe(1);
    expect(viewFor(partie.state, siege(partie.state, 'cupidon')).prompt).toEqual({ kind: 'cupidon' });
  });

  it('R110 — la carte prise est un rôle comme un autre : il la joue dès la première nuit', () => {
    const partie = new Partie(8, compose(2, ['voleur']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    partie.state.phase = { kind: 'voleur', seat: phase.seat, cartes: ['voyante', 'chasseur'] };
    partie.agir(phase.seat, { type: 'voler', carte: 0 });
    partie.nuit();
    expect(partie.state.day).toBe(1);
    expect(viewFor(partie.state, phase.seat).prompt).toEqual({ kind: 'sonder' });
    const loup = sieges(partie.state, 'loup')[0]!;
    partie.agir(phase.seat, { type: 'sonder', target: loup });
    partie.nuitBlanche();
    expect(partie.state.inspections).toEqual([{ day: 1, target: loup, role: 'loup' }]);
    // Le récapitulatif gardera la trace du vol comme du sondage.
    expect(partie.state.log).toContainEqual({ day: 1, type: 'voleur', carte: 'voyante' });
    expect(partie.state.log).toContainEqual({ day: 1, type: 'voyance', target: loup, role: 'loup' });
  });

  it('R110/R113 — le talon ne porte jamais une carte de fratrie, quelle que soit la graine', () => {
    for (let graine = 1; graine <= 200; graine++) {
      const partie = new Partie(12, compose(2, ['voleur', 'soeurs', 'freres']), graine);
      const phase = partie.state.phase;
      if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
      // Les cartes de fratrie partent toujours en jeu (R113) : elles se glissent
      // en tête du paquet, le talon se ramasse à la fin (D44).
      for (const carte of phase.cartes) {
        expect(carte === 'soeurs' || carte === 'freres').toBe(false);
      }
      expect(sieges(partie.state, 'soeurs')).toHaveLength(2);
      expect(sieges(partie.state, 'freres')).toHaveLength(3);
    }
  });

  it('R110/D46 — avant la révélation, la vue ne dit aucune carte : ni rôle, ni meute, ni fratrie', () => {
    const partie = new Partie(12, compose(2, ['voleur', 'soeurs']));
    const phase = partie.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    // Le Voleur échange sans regarder sa carte (R110) : personne, lui compris,
    // n'a rien découvert — la vue se tait jusqu'à la révélation (R31, D46).
    for (const player of partie.state.players) {
      const vue = viewFor(partie.state, player.seat);
      expect(vue.you!.role).toBeNull();
      expect(vue.pack).toBeNull();
      expect(vue.fratrie).toEqual([]);
      expect(vue.channels).not.toContain('fratrie');
      // Pas même sa propre carte dans sa propre ligne — ni le masque de
      // meute, qui dirait déjà « tu es loup » (D46).
      for (const ligne of vue.players) expect(ligne.role).toBeNull();
    }
    // Le spectateur non plus : la fratrie de la table n'est pas son affaire.
    expect(viewFor(partie.state, null).fratrie).toEqual([]);
    for (const ligne of viewFor(partie.state, null).players) expect(ligne.role).toBeNull();
    // Après le vol et la révélation, chaque chose se découvre à sa place.
    partie.agir(phase.seat, { type: 'voler', carte: null });
    partie.nuit();
    for (const player of partie.state.players) {
      const vue = viewFor(partie.state, player.seat);
      expect(vue.you!.role).not.toBeNull();
    }
    const soeur = sieges(partie.state, 'soeurs')[0]!;
    expect(viewFor(partie.state, soeur).fratrie).toEqual(sieges(partie.state, 'soeurs'));
    expect(viewFor(partie.state, soeur).channels).toContain('fratrie');
    const loup = sieges(partie.state, 'loup')[0]!;
    expect(viewFor(partie.state, loup).pack!.seats).toEqual(
      sieges(partie.state, 'loup').sort((a, b) => a - b),
    );
  });
});

/* ------------------------------------------------------------------ */
/* R111 — le Chien-Loup                                                */
/* ------------------------------------------------------------------ */

describe('R111 — le Chien-Loup se range, la première nuit, pour toujours', () => {
  it('R111 — il joue pendant l’étape principale de la première nuit, en parallèle', () => {
    const partie = new Partie(8, compose(2, ['chienLoup', 'voyante'])).nuit();
    const chien = siege(partie.state, 'chienLoup');
    expect(viewFor(partie.state, chien).prompt).toEqual({ kind: 'seRanger' });
    expect(pendingActors(partie.state)).toContain(chien);
    expect(pendingActors(partie.state)).toContain(siege(partie.state, 'voyante'));
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    expect(viewFor(partie.state, chien).acted).toBe(true);
    // La consigne ne revient plus jamais : la nuit suivante le trouve meute.
    partie.nuitBlanche();
    partie.voter(null);
    expect(viewFor(partie.state, chien).prompt).toEqual({ kind: 'devorer' });
  });

  it('R111 — rangé chez les loups : camp écrit, carte inchangée, aucun évènement', () => {
    const partie = new Partie(8, compose(2, ['chienLoup'])).nuit();
    const chien = siege(partie.state, 'chienLoup');
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    partie.nuitBlanche();
    const joueur = partie.state.players[chien]!;
    expect(joueur.role).toBe('chienLoup'); // la carte ne change pas (R111)
    expect(joueur.camp).toBe('loups');
    expect(partie.state.log).toContainEqual({ day: 1, type: 'chienLoup', seat: chien, camp: 'loups' });
    // Le journal ne dit que les phases et l’aube : rien du choix.
    for (const e of partie.journal) expect(['debut', 'phase', 'aube-paisible']).toContain(e.type);
  });

  it('R111/D27 — la meute le voit loup, la Voyante voit chienLoup, sa mort le dit chienLoup', () => {
    const partie = new Partie(8, compose(2, ['chienLoup', 'voyante'])).nuit();
    const chien = siege(partie.state, 'chienLoup');
    const voyante = siege(partie.state, 'voyante');
    const loup = sieges(partie.state, 'loup')[0]!;
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    partie.agir(voyante, { type: 'sonder', target: chien });
    partie.nuitBlanche();
    // La meute le reconnaît — masqué en loup ordinaire, jamais chienLoup (D27).
    expect(viewFor(partie.state, loup).players[chien]!.role).toBe('loup');
    expect(viewFor(partie.state, loup).pack!.seats).toContain(chien);
    expect(viewFor(partie.state, chien).pack!.seats).toContain(chien);
    // Mais sa carte reste la sienne pour la Voyante…
    expect(viewFor(partie.state, voyante).players[chien]!.role).toBe('chienLoup');
    expect(partie.state.inspections).toEqual([{ day: 1, target: chien, role: 'chienLoup' }]);
    // …et pour la mort.
    partie.voter(chien);
    expect(deType(partie.journal, 'morts').at(-1)!.deaths).toContainEqual({
      seat: chien,
      cause: 'vote',
      role: 'chienLoup',
    });
  });

  it('R111 — la meute ne le dévore pas : un camp-loups ne se mange pas', () => {
    const partie = new Partie(8, compose(2, ['chienLoup'])).nuit();
    const chien = siege(partie.state, 'chienLoup');
    partie.agir(chien, { type: 'seRanger', camp: 'loups' });
    partie.nuitBlanche();
    partie.voter(null); // nuit 2 : la meute, le Chien-Loup compris, chasse
    const loup = sieges(partie.state, 'loup')[0]!;
    refuser(partie.state, loup, { type: 'devorer', target: chien }, 'target');
    refuser(partie.state, chien, { type: 'devorer', target: sieges(partie.state, 'loup')[1]! }, 'target');
    // Lui dévore avec la meute, comme un loup — et son vote se compte.
    const proie = sieges(partie.state, 'villageois')[0]!;
    partie.agir(chien, { type: 'devorer', target: proie });
    expect(partie.state.night.wolfVotes[chien]).toBe(proie);
  });

  it('R111/R81 — rangé au village, ou pas rangé du tout : il ne voit rien, jamais', () => {
    const parti = new Partie(8, compose(2, ['chienLoup'])).nuit();
    const chienParti = siege(parti.state, 'chienLoup');
    parti.agir(chienParti, { type: 'seRanger', camp: 'village' });
    parti.nuitBlanche();
    // Rangé au village : rien à écrire — c’est son camp d’origine.
    expect(parti.state.players[chienParti]!.camp).toBeUndefined();
    expect(parti.state.log).toContainEqual({ day: 1, type: 'chienLoup', seat: chienParti, camp: 'village' });
    expect(viewFor(parti.state, chienParti).pack).toBeNull();
    parti.voter(null);
    expect(viewFor(parti.state, chienParti).prompt).toBeNull();
    expect(viewFor(parti.state, chienParti).channels).not.toContain('loups');
    // Pas rangé du tout — le temps a clôturé (R81) : même silence, pas même
    // une ligne au récit.
    const muet = new Partie(8, compose(2, ['chienLoup'])).nuit();
    const chienMuet = siege(muet.state, 'chienLoup');
    muet.nuitBlanche();
    expect(muet.state.players[chienMuet]!.camp).toBeUndefined();
    expect(muet.state.log.some((ligne) => ligne.type === 'chienLoup')).toBe(false);
    muet.voter(null);
    expect(viewFor(muet.state, chienMuet).prompt).toBeNull();
  });

  it('R111/D32 — il compte parmi les loups à la borne de R13', () => {
    // Six joueurs, deux loups, un Chien-Loup : trois loups au pire, la moitié
    // de la table — injouable.
    expect(() => compositionFor(6, compose(2, ['chienLoup']))).toThrow(IllegalActionError);
    // À sept, la table passe ; sans lui, celle de six passait déjà.
    expect(compositionFor(7, compose(2, ['chienLoup']))).toHaveLength(7);
    expect(compositionFor(6, compose(2, []))).toHaveLength(6);
  });

  it('R111/R107 — le Renard flaire le Chien-Loup rangé chez les loups, la même nuit', () => {
    // Le commit du Chien-Loup précède la résolution du trio : il faut un
    // Renard dont un voisin est le Chien-Loup — sans loup autrement, sinon la
    // grogne du flair ne prouverait rien.
    let partie: Partie | null = null;
    for (let graine = 1; graine <= 500 && partie === null; graine++) {
      const essai = new Partie(8, compose(2, ['renard', 'chienLoup']), graine).nuit();
      const renard = siege(essai.state, 'renard');
      const chien = siege(essai.state, 'chienLoup');
      const [droite, gauche] = voisinsDe(essai.state, renard);
      const role = (siege: number) => essai.state.players[siege]!.role;
      if ((droite === chien || gauche === chien) && role(droite) !== 'loup' && role(gauche) !== 'loup') {
        partie = essai;
      }
    }
    expect(partie).not.toBeNull();
    const tableau = partie!;
    const renard = siege(tableau.state, 'renard');
    const chien = siege(tableau.state, 'chienLoup');
    tableau.agir(chien, { type: 'seRanger', camp: 'loups' });
    tableau.agir(renard, { type: 'flairer', centre: renard }); // D29 : lui-même pour centre
    tableau.meute(null);
    const savoir = tableau.state.renardSavoirs.at(-1)!;
    expect(savoir.loups).toBe(true);
    expect(savoir.seats).toContain(chien);
    // Le pouvoir tient : le trio avait bien un loup — le Chien-Loup, alors
    // que sa carte dit village.
    expect(tableau.state.renardPouvoir).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* R112 — l'Enfant Sauvage                                             */
/* ------------------------------------------------------------------ */

describe('R112 — l’Enfant Sauvage, son modèle, et la meute qui l’accueille', () => {
  it('R112 — il joue la première nuit, en parallèle — et jamais deux fois', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    expect(viewFor(partie.state, enfant).prompt).toEqual({ kind: 'designerModele' });
    expect(pendingActors(partie.state)).toContain(enfant);
    // N’importe quel vivant, lui compris (R112) — mais pas un mort.
    partie.agir(enfant, { type: 'designerModele', target: enfant });
    const victime = sieges(partie.state, 'villageois')[0]!;
    refuser(avecDesMorts(partie.state, [victime]), enfant, { type: 'designerModele', target: victime }, 'target');
    partie.nuitBlanche();
    partie.voter(null);
    expect(viewFor(partie.state, enfant).prompt).toBeNull();
    refuser(partie.state, enfant, { type: 'designerModele', target: enfant }, 'wrong-phase');
  });

  it('R112/R88 — le modèle n’est jamais informé — pas plus que la table', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    const modele = sieges(partie.state, 'villageois')[0]!;
    partie.agir(enfant, { type: 'designerModele', target: modele });
    // Le choix tient dans la nuit ; l’état le retiendra à la clôture.
    expect(partie.state.night.modele).toBe(modele);
    expect(viewFor(partie.state, modele).prompt).toBeNull();
    for (let s = 0; s < 8; s++) {
      if (s === enfant) continue;
      // La consigne n’apparaît que dans la vue de l’Enfant — son seul porteur.
      expect(JSON.stringify(viewFor(partie.state, s))).not.toContain('designerModele');
    }
    partie.nuitBlanche();
    expect(partie.state.modele).toBe(modele);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'modele', seat: enfant, target: modele });
    // Le journal, lui, ne dit que les phases et l’aube.
    for (const e of partie.journal) expect(['debut', 'phase', 'aube-paisible']).toContain(e.type);
  });

  it('R112/D33 — le modèle dévoré : le camp bascule à l’aube, la meute attend la nuit suivante', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    const modele = sieges(partie.state, 'villageois')[0]!;
    partie.agir(enfant, { type: 'designerModele', target: modele });
    const evenements = [...partie.meute(modele), ...partie.aube()];
    // Le modèle est mort — et rien d’autre ne s’est dit : la transformation
    // n’a pas d’évènement.
    expect(deType(evenements, 'morts')).toEqual([
      { type: 'morts', deaths: [{ seat: modele, cause: 'loups', role: 'villageois' }] },
    ]);
    const joueur = partie.state.players[enfant]!;
    expect(joueur.role).toBe('loup');
    expect(joueur.camp).toBe('loups');
    expect(partie.state.enfantReveil).toBe(enfant);
    expect(partie.state.modele).toBeNull();
    expect(partie.state.log).toContainEqual({ day: 1, type: 'transformation', seat: enfant });
    // Le jour s’ouvre : l’Enfant n’est pas encore de la meute — ni sa vue du
    // pack, ni celle des loups sur lui.
    expect(partie.state.phase.kind).toBe('jour');
    expect(viewFor(partie.state, enfant).pack).toBeNull();
    expect(viewFor(partie.state, enfant).you!.role).toBe('loup');
    // L’Enfant transformé porte maintenant la carte « loup » : le vrai loup
    // se cherche ailleurs.
    const loup = sieges(partie.state, 'loup').find((s) => s !== enfant)!;
    expect(viewFor(partie.state, loup).pack!.seats).not.toContain(enfant);
    // La nuit suivante l’accueille : le réveil se consomme à l’ouverture.
    partie.voter(null);
    expect(partie.state.enfantReveil).toBeNull();
    expect(livingPack(partie.state)).toContain(enfant);
    expect(viewFor(partie.state, enfant).prompt).toEqual({ kind: 'devorer' });
    expect(viewFor(partie.state, enfant).channels).toContain('loups');
    expect(viewFor(partie.state, loup).pack!.seats).toContain(enfant);
    // La meute ne connaît que « loup » : sa carte d’Enfant n’existe plus.
    expect(viewFor(partie.state, loup).players[enfant]!.role).toBe('loup');
  });

  it('R112/D27 — la Voyante lit un loup, et la mort l’annonce loup — l’origine vit au récit', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage', 'voyante'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    const modele = sieges(partie.state, 'villageois')[0]!;
    partie.agir(enfant, { type: 'designerModele', target: modele });
    partie.meute(modele);
    partie.aube();
    partie.voter(null); // nuit 2
    const voyante = siege(partie.state, 'voyante');
    partie.agir(voyante, { type: 'sonder', target: enfant });
    partie.nuitBlanche();
    expect(partie.state.inspections).toContainEqual({ day: 2, target: enfant, role: 'loup' });
    expect(viewFor(partie.state, voyante).players[enfant]!.role).toBe('loup');
    // Sa mort, plus tard, l’annonce loup : la carte retournée est celle
    // d’après (D27).
    partie.voter(enfant);
    expect(deType(partie.journal, 'morts').at(-1)!.deaths).toContainEqual({
      seat: enfant,
      cause: 'vote',
      role: 'loup',
    });
    // L’origine survit au récapitulatif : la ligne de transformation la garde.
    expect(partie.state.log).toContainEqual({ day: 1, type: 'transformation', seat: enfant });
  });

  it('R112/R108 — l’ourson gronde dès l’aube qui transforme : le camp bascule aussitôt', () => {
    // Une table où l’Enfant est voisin de l’Ours, sans loup voisin de l’Ours :
    // la grogne de cette aube-là ne peut venir que de la transformation.
    let partie: Partie | null = null;
    for (let graine = 1; graine <= 500 && partie === null; graine++) {
      const essai = new Partie(8, compose(2, ['ours', 'enfantSauvage']), graine).nuit();
      const ours = siege(essai.state, 'ours');
      const enfant = siege(essai.state, 'enfantSauvage');
      const [droite, gauche] = voisinsDe(essai.state, ours);
      const role = (siege: number) => essai.state.players[siege]!.role;
      if ((droite === enfant || gauche === enfant) && role(droite) !== 'loup' && role(gauche) !== 'loup') {
        partie = essai;
      }
    }
    expect(partie).not.toBeNull();
    const tableau = partie!;
    const ours = siege(tableau.state, 'ours');
    const enfant = siege(tableau.state, 'enfantSauvage');
    const modele = sieges(tableau.state, 'villageois')[0]!;
    tableau.agir(enfant, { type: 'designerModele', target: modele });
    const evenements = [...tableau.meute(modele), ...tableau.aube()];
    // Le modèle dévoré transforme l’Enfant pendant la nuit : l’Ours compte
    // déjà son voisin parmi les loups.
    expect(deType(evenements, 'ours')).toEqual([{ type: 'ours', seat: ours, grogne: true }]);
  });

  it('R112/R107 — le Renard flaire un loup là où vivait un villageois', () => {
    // Sans la transformation, le trio de l’Enfant serait sans loup et le
    // Renard y perdrait son pouvoir : il faut ses voisins sans loup.
    let partie: Partie | null = null;
    for (let graine = 1; graine <= 500 && partie === null; graine++) {
      const essai = new Partie(8, compose(2, ['enfantSauvage', 'renard']), graine).nuit();
      const enfant = siege(essai.state, 'enfantSauvage');
      const [droite, gauche] = voisinsDe(essai.state, enfant);
      const role = (siege: number) => essai.state.players[siege]!.role;
      if (role(droite) !== 'loup' && role(gauche) !== 'loup') partie = essai;
    }
    expect(partie).not.toBeNull();
    const tableau = partie!;
    const enfant = siege(tableau.state, 'enfantSauvage');
    const modele = sieges(tableau.state, 'villageois')[0]!;
    tableau.agir(enfant, { type: 'designerModele', target: modele });
    tableau.meute(modele);
    tableau.aube();
    tableau.voter(null); // nuit 2 : l’Enfant est meute, le Renard flaire
    const renard = siege(tableau.state, 'renard');
    tableau.agir(renard, { type: 'flairer', centre: enfant });
    tableau.meute(null);
    const savoir = tableau.state.renardSavoirs.at(-1)!;
    expect(savoir.day).toBe(2);
    expect(savoir.loups).toBe(true);
    expect(savoir.seats).toContain(enfant);
    // Le trio avait un loup — l’Enfant transformé : le pouvoir tient.
    expect(tableau.state.renardPouvoir).toBe(true);
  });

  it('R112/R101 — le modèle parti transforme l’Enfant comme un modèle mort', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    const modele = sieges(partie.state, 'villageois')[0]!;
    partie.agir(enfant, { type: 'designerModele', target: modele });
    partie.meute(null);
    partie.aube();
    // Le modèle quitte la table au jour : l’abandon est une mort comme une
    // autre (R101). La clôture enchaîne la nuit — le réveil se consomme.
    const pas = timeoutPhase(partie.state, partie.rng, partie.state.phaseSeq, { abandons: [modele] });
    partie.state = pas.state;
    partie.journal.push(...pas.events);
    expect(partie.state.players[enfant]!.role).toBe('loup');
    expect(partie.state.players[enfant]!.camp).toBe('loups');
    expect(partie.state.log).toContainEqual({ day: 1, type: 'transformation', seat: enfant });
    expect(livingPack(partie.state)).toContain(enfant);
  });

  it('R112/R81 — sans modèle au temps écoulé, l’Enfant ne se transforme jamais', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    partie.nuitBlanche(); // le temps clôt : pas de modèle
    expect(partie.state.modele).toBeNull();
    // Le modèle qu’il aurait pu prendre meurt plus tard : rien ne se déclenche.
    partie.voter(sieges(partie.state, 'villageois')[0]!);
    expect(partie.state.players[enfant]!.role).toBe('enfantSauvage');
    expect(partie.state.log.some((ligne) => ligne.type === 'transformation')).toBe(false);
    // Plus jamais de consigne, et pas de meute.
    expect(viewFor(partie.state, enfant).prompt).toBeNull();
    expect(livingPack(partie.state)).not.toContain(enfant);
  });

  it('R112 — lui-même pour modèle : l’Enfant mort n’a personne à rejoindre', () => {
    const partie = new Partie(8, compose(2, ['enfantSauvage'])).nuit();
    const enfant = siege(partie.state, 'enfantSauvage');
    partie.agir(enfant, { type: 'designerModele', target: enfant });
    partie.nuitBlanche();
    partie.voter(enfant); // le village l’exécute : son modèle part avec lui
    const joueur = partie.state.players[enfant]!;
    expect(joueur.alive).toBe(false);
    expect(joueur.role).toBe('enfantSauvage');
    expect(partie.state.modele).toBeNull();
    expect(partie.state.log.some((ligne) => ligne.type === 'transformation')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* R113 — les Deux Sœurs et les Trois Frères                           */
/* ------------------------------------------------------------------ */

describe('R113 — les Deux Sœurs et les Trois Frères', () => {
  it('R113/R4 — une carte cochée, deux — puis trois — en jeu', () => {
    // La multiplicité vient de la carte, pas du nombre de cochages (R4).
    expect(compositionFor(10, compose(2, ['soeurs'])).filter((r) => r === 'soeurs')).toHaveLength(2);
    expect(compositionFor(12, compose(2, ['freres'])).filter((r) => r === 'freres')).toHaveLength(3);
    // Le doublon d’un id de fratrie se fond au sanitizeur : jamais rejeté.
    expect(compositionFor(10, compose(2, ['soeurs', 'soeurs']))).toHaveLength(10);
    expect(compositionFor(10, compose(2, ['soeurs', 'soeurs'])).filter((r) => r === 'soeurs')).toHaveLength(2);
  });

  it('R113 — les groupes se constituent à la distribution, et peuvent coexister', () => {
    const partie = new Partie(12, compose(2, ['soeurs', 'freres']));
    const soeurs = sieges(partie.state, 'soeurs');
    const freres = sieges(partie.state, 'freres');
    expect(partie.state.fratries).toEqual([
      { sieges: soeurs, next: 1 },
      { sieges: freres, next: 1 },
    ]);
    // La connaissance vient de la révélation des cartes, comme les amoureux :
    // chaque groupe voit les siens — et seulement eux.
    for (const soeur of soeurs) expect(viewFor(partie.state, soeur).fratrie).toEqual(soeurs);
    for (const frere of freres) expect(viewFor(partie.state, frere).fratrie).toEqual(freres);
    expect(viewFor(partie.state, sieges(partie.state, 'villageois')[0]!).fratrie).toEqual([]);
    expect(viewFor(partie.state, null).fratrie).toEqual([]);
  });

  it('R113 — jamais une consigne : la fratrie connaît, elle n’agit pas', () => {
    const partie = new Partie(12, compose(2, ['soeurs'])).nuit();
    for (const soeur of sieges(partie.state, 'soeurs')) {
      expect(viewFor(partie.state, soeur).prompt).toBeNull();
      expect(pendingActors(partie.state)).not.toContain(soeur);
    }
  });

  it('R113 — la mort ne reprend pas la connaissance : le mort garde ses sièges', () => {
    // Sans mortsVoientTout, le mort ne lit plus le canal — il garde la liste.
    const partie = new Partie(12, compose(2, ['soeurs'], { mortsVoientTout: false })).nuit();
    const soeurs = sieges(partie.state, 'soeurs');
    partie.state = avecDesMorts(partie.state, [soeurs[0]!]);
    expect(viewFor(partie.state, soeurs[0]!).fratrie).toEqual(soeurs);
    expect(viewFor(partie.state, soeurs[0]!).channels).not.toContain('fratrie');
    const survivante = soeurs[1]!;
    partie.agir(survivante, { type: 'dire', channel: 'fratrie', text: 'Tu me manques.' });
    expect(viewFor(partie.state, survivante).chat.at(-1)).toMatchObject({
      channel: 'fratrie',
      text: 'Tu me manques.',
    });
    expect(viewFor(partie.state, soeurs[0]!).chat.map((message) => message.channel)).not.toContain('fratrie');
  });

  it('R113/R92 — la rancune n’éteint rien : la fratrie n’est pas un pouvoir du village', () => {
    const partie = new Partie(12, compose(2, ['ancien', 'soeurs'])).nuit();
    partie.meute(null);
    partie.aube();
    partie.voter(siege(partie.state, 'ancien')); // la rancune embrase le village
    expect(partie.state.pouvoirsPerdus).toBe(true);
    // Le canal fratrie ne doit rien aux pouvoirs : il vit toujours.
    const soeur = sieges(partie.state, 'soeurs').find((s) => partie.state.players[s]!.alive)!;
    partie.agir(soeur, { type: 'dire', channel: 'fratrie', text: 'Toujours là.' });
    expect(viewFor(partie.state, soeur).chat.at(-1)).toMatchObject({ text: 'Toujours là.' });
    expect(viewFor(partie.state, soeur).fratrie).toEqual(sieges(partie.state, 'soeurs'));
  });
});

/* ------------------------------------------------------------------ */
/* R114 — le canal de la fratrie                                       */
/* ------------------------------------------------------------------ */

describe('R114 — le canal de la fratrie, du premier soir au dernier jour', () => {
  it('R114/D28 — la nuit comme le jour, entre vivants de la fratrie — et eux seuls', () => {
    const partie = new Partie(12, compose(2, ['soeurs'])).nuit();
    const soeurs = sieges(partie.state, 'soeurs');
    const [ainee, cadette] = soeurs;
    // La nuit : les Sœurs se parlent pendant que la meute chasse.
    expect(viewFor(partie.state, ainee!).channels).toContain('fratrie');
    partie.agir(ainee!, { type: 'dire', channel: 'fratrie', text: 'On veille.' });
    expect(viewFor(partie.state, cadette!).chat.at(-1)).toMatchObject({
      channel: 'fratrie',
      text: 'On veille.',
    });
    // Personne d’autre ne lit — ni le village, ni la meute.
    for (const siege of [...sieges(partie.state, 'villageois'), ...sieges(partie.state, 'loup')]) {
      expect(viewFor(partie.state, siege).channels).not.toContain('fratrie');
      expect(viewFor(partie.state, siege).chat.some((message) => message.channel === 'fratrie')).toBe(false);
    }
    refuser(partie.state, sieges(partie.state, 'villageois')[0]!, { type: 'dire', channel: 'fratrie', text: 'Espion.' }, 'channel');
    // Le jour aussi : le canal ne connaît pas la nuit.
    partie.meute(null);
    partie.aube();
    partie.agir(cadette!, { type: 'dire', channel: 'fratrie', text: 'Et le jour.' });
    expect(viewFor(partie.state, ainee!).chat.at(-1)).toMatchObject({
      channel: 'fratrie',
      text: 'Et le jour.',
    });
  });

  it('R114/R78 — chaque canal numérote ses messages à part', () => {
    const partie = new Partie(12, compose(2, ['soeurs'])).nuit();
    const [ainee, cadette] = sieges(partie.state, 'soeurs');
    partie.agir(ainee!, { type: 'dire', channel: 'fratrie', text: 'un' });
    partie.meute(null);
    partie.aube();
    partie.agir(ainee!, { type: 'dire', channel: 'village', text: 'Bonjour le village' });
    partie.agir(cadette!, { type: 'dire', channel: 'fratrie', text: 'deux' });
    const messages = partie.state.chat;
    // Les deux canaux recommencent à un : une numérotation globale raconterait
    // à la fratrie, par ses trous, les bavardages du village (R78). Le canal
    // fratrie tient sa suite dense au-delà de son pas : le village n'y compte
    // pas, et l'autre groupe n'y paraît jamais (R78, D45).
    expect(messages.find((message) => message.text === 'un')!.id).toBe(DECALAGE_FRATRIE + 1);
    expect(messages.find((message) => message.text === 'Bonjour le village')!.id).toBe(1);
    expect(messages.find((message) => message.text === 'deux')!.id).toBe(DECALAGE_FRATRIE + 2);
  });

  it('R114/D45 — Sœurs et Frères ne partagent que le nom du canal : chaque groupe lit le sien', () => {
    const partie = new Partie(12, compose(2, ['soeurs', 'freres'])).nuit();
    const soeurs = sieges(partie.state, 'soeurs');
    const freres = sieges(partie.state, 'freres');
    partie.agir(soeurs[0]!, { type: 'dire', channel: 'fratrie', text: 'Entre sœurs.' });
    partie.agir(freres[0]!, { type: 'dire', channel: 'fratrie', text: 'Entre frères.' });
    // Chaque groupe lit le sien — pas un mot de l'autre, pas un trou qui
    // compterait ses messages (R114, D45).
    const texts = (seat: number) =>
      viewFor(partie.state, seat)
        .chat.filter((message) => message.channel === 'fratrie')
        .map((message) => message.text);
    expect(texts(soeurs[1]!)).toEqual(['Entre sœurs.']);
    expect(texts(freres[1]!)).toEqual(['Entre frères.']);
    // La numérotation de chacun est dense, dans sa suite au-delà de son pas.
    expect(viewFor(partie.state, soeurs[1]!).chat.find((message) => message.text === 'Entre sœurs.')!.id).toBe(DECALAGE_FRATRIE + 1);
    expect(viewFor(partie.state, freres[1]!).chat.find((message) => message.text === 'Entre frères.')!.id).toBe(2 * DECALAGE_FRATRIE + 1);
    // Qui voit tout relit les deux groupes (R77) : la morte sous mortsVoientTout.
    partie.meute(soeurs[1]!);
    partie.aube();
    const morte = viewFor(partie.state, soeurs[1]!);
    expect(morte.chat.some((message) => message.text === 'Entre sœurs.')).toBe(true);
    expect(morte.chat.some((message) => message.text === 'Entre frères.')).toBe(true);
    // Le rabotnement ne se partage pas non plus : cent et cinq messages des
    // Frères ne poussent aucun message des Sœurs hors du fil (R78, D45).
    for (let i = 0; i < MAX_CHAT_PER_CHANNEL + 5; i += 1) {
      partie.agir(freres[0]!, { type: 'dire', channel: 'fratrie', text: `F${i}` });
    }
    expect(partie.state.chat.filter((message) => message.channel === 'fratrie' && message.groupe === 0)).toHaveLength(1);
    expect(viewFor(partie.state, soeurs[0]!).chat.some((message) => message.text === 'Entre sœurs.')).toBe(true);
  });

  it('R114/D28 — la mort referme le canal ; qui voit tout relit, sans jamais écrire', () => {
    // mortsVoientTout, l’option par défaut : la morte relit sa sœur.
    const partie = new Partie(12, compose(2, ['soeurs', 'freres'])).nuit();
    const soeurs = sieges(partie.state, 'soeurs');
    partie.meute(soeurs[0]!); // la meute dévore l’aînée
    partie.aube();
    expect(viewFor(partie.state, soeurs[0]!).channels).toEqual(['morts']);
    partie.agir(soeurs[1]!, { type: 'dire', channel: 'fratrie', text: 'Tu vois tout ?' });
    expect(viewFor(partie.state, soeurs[0]!).chat.at(-1)).toMatchObject({ text: 'Tu vois tout ?' });
    // La morte ne parle plus à sa sœur — mais qui voit tout voit toutes les
    // fratries (R77, R113).
    refuser(partie.state, soeurs[0]!, { type: 'dire', channel: 'fratrie', text: 'Moi aussi.' }, 'channel');
    expect(viewFor(partie.state, soeurs[0]!).fratrie).toEqual(
      [...sieges(partie.state, 'soeurs'), ...sieges(partie.state, 'freres')].sort((a, b) => a - b),
    );
  });
});
