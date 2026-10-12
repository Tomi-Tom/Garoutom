/**
 * La nuit, l’aube et les déclencheurs — les règles R30 à R50.
 *
 * Le meneur de jeu appelle ses rôles la nuit, compte les voix des loups,
 * tend ses fioles à la Sorcière, puis annonce les morts d’un bloc à l’aube —
 * avant de laisser le Chasseur mort vider son fusil. Chaque test cite la
 * règle qu’il vérifie, à la lettre près, dans `docs/RULES.md` : c’est le
 * document normatif, et c’est lui qui a raison.
 *
 * Rien ici ne lit l’horloge ni le hasard de la machine : le générateur est
 * seedé, les minuteries se déclenchent à la main par `timeoutPhase`. Une
 * partie menée deux fois avec la même graine doit vivre deux nuits
 * identiques — c’est la promesse R86, et la raison d’être de ces tests.
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  GHOST_STEP_MS,
  livingSeats,
  pendingActors,
  phaseBudgetMs,
  REVEAL_MS,
  timeoutPhase,
} from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { createSeededRng } from './rng.js';
import {
  IllegalActionError,
  type Action,
  type GameOptions,
  type GameState,
  type RoleId,
  type Rng,
  type Step,
} from './types.js';
import { viewFor } from './views.js';

/* ------------------------------------------------------------------ */
/* Une partie menée à la main                                           */
/* ------------------------------------------------------------------ */

/** Les défauts recopiés, puis les écarts voulus pour la table. */
function table(ecarts: Partial<GameOptions> = {}): GameOptions {
  return { ...DEFAULT_OPTIONS, ...ecarts };
}

/**
 * Une composition manuelle : l’hôte choisit loups et rôles, le moteur ne
 * décide rien. Les scénarios y gagnent des sièges prévisibles.
 */
function compose(
  loups: number,
  roles: GameOptions['roles'],
  ecarts: Partial<GameOptions> = {},
): GameOptions {
  // Pas de capitaine par défaut : l’élection du matin n’a rien à voir avec
  // la nuit — sauf quand un test la réclame expressément.
  return table({ auto: false, loups, roles, capitaine: false, ...ecarts });
}

/**
 * Une partie qui avance pas à pas. Chaque action enchaîne l’état rendu —
 * le moteur ne modifie jamais celui qu’on lui donne (R85) — et la même
 * graine rejoue la même partie.
 */
class Partie {
  rng: Rng;
  state: GameState;

  constructor(joueurs: number, options: GameOptions, graine: number) {
    this.rng = createSeededRng(graine);
    this.state = createGame({ players: joueurs, options }, this.rng).state;
  }

  /** L’intention d’un siège : l’état suit le pas rendu. */
  agir(siege: number, action: Action): Step {
    const pas = applyAction(this.state, action, this.rng, siege);
    this.state = pas.state;
    return pas;
  }

  /** Le temps de la phase en cours est écoulé — minuterie fraîche, donc valide. */
  cloturer(): Step {
    const pas = timeoutPhase(this.state, this.rng, this.state.phaseSeq);
    this.state = pas.state;
    return pas;
  }

  /** Tout le monde s’abstient : la phase de vote se clôt sans rien décider. */
  abstenir(): void {
    for (const siege of livingSeats(this.state)) {
      this.agir(siege, { type: 'voter', target: null });
    }
  }
}

/** Le siège qui porte ce rôle — unique pour un rôle spécial (R4). */
function siege(state: GameState, role: RoleId): number {
  const joueur = state.players.find((j) => j.role === role);
  if (!joueur) throw new Error(`aucun siège ne joue ${role}`);
  return joueur.seat;
}

/** Tous les sièges d’un rôle, dans l’ordre — la meute, les simples. */
function sieges(state: GameState, role: RoleId): number[] {
  return state.players.filter((j) => j.role === role).map((j) => j.seat);
}

/** Les villageois simples : les proies et les cobayes commodes des nuits agitées. */
function cobaye(state: GameState, rang: number): number {
  const siege = sieges(state, 'villageois')[rang];
  if (siege === undefined) throw new Error('pas assez de villageois simples');
  return siege;
}

/**
 * Un refus attendu : l’action doit jeter `IllegalActionError` et ne rien
 * changer à l’état — un refus ne laisse pas de trace (R85).
 */
function refuser(state: GameState, siege: number, action: Action): IllegalActionError {
  const avant = structuredClone(state);
  let erreur: unknown;
  try {
    applyAction(state, action, createSeededRng(404), siege);
  } catch (jetee) {
    erreur = jetee;
  }
  expect(erreur).toBeInstanceOf(IllegalActionError);
  expect(state).toEqual(avant);
  return erreur as IllegalActionError;
}

/**
 * Un état où ce siège est mort. La première nuit ne compte jamais de mort
 * au moment où Cupidon ou les loups choisissent leurs cibles — la règle
 * exige pourtant le refus : on fabrique donc la situation, le moteur ne
 * doit rien devoir à la chance des déroulés.
 */
function avecUnMort(state: GameState, siege: number): GameState {
  const fabrique = structuredClone(state);
  const joueur = fabrique.players[siege];
  if (!joueur) throw new Error('siège inconnu');
  joueur.alive = false;
  return fabrique;
}

/* ------------------------------------------------------------------ */
/* R30 — la distribution                                               */
/* ------------------------------------------------------------------ */

describe('la distribution', () => {
  it('R30 — le rng seedé attribue chaque rôle de la composition, exactement une fois', () => {
    // auto: true, huit joueurs — la référence (R20) : deux loups, voyante,
    // sorcière, chasseur, et le reste en villageois simples.
    const partie = new Partie(8, table(), 1);
    const roles = partie.state.players.map((j) => j.role).sort();
    expect(roles).toEqual([
      'chasseur',
      'loup',
      'loup',
      'sorciere',
      'villageois',
      'villageois',
      'villageois',
      'voyante',
    ]);
    // un rôle par siège, et les sièges numérotés de 0 à n-1 (R1)
    expect(partie.state.players.map((j) => j.seat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('R30 — une même graine distribue deux fois la même main', () => {
    const distribution = (graine: number) =>
      new Partie(12, table(), graine).state.players.map((j) => j.role);
    expect(distribution(2026)).toEqual(distribution(2026));
  });

  it('R30 — le mélange dépend de la graine', () => {
    const tirages = new Set<string>();
    for (let graine = 1; graine <= 12; graine++) {
      tirages.add(new Partie(8, table(), graine).state.players.map((j) => j.role).join(','));
    }
    // toujours la même main serait un rng ignoré : le mélange doit varier
    expect(tirages.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* R31–R32 — la révélation                                             */
/* ------------------------------------------------------------------ */

describe('la révélation', () => {
  it('R31 — la révélation dure vingt-cinq secondes', () => {
    const partie = new Partie(6, compose(2, ['voyante', 'sorciere']), 1);
    expect(partie.state.phase.kind).toBe('revelation');
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(REVEAL_MS);
    expect(REVEAL_MS).toBe(25_000);
  });

  it('R31 — la confirmation du dernier joueur ouvre la nuit, sans attendre le temps', () => {
    const partie = new Partie(6, compose(2, ['voyante', 'sorciere']), 1);
    for (let siege = 0; siege < 6; siege++) {
      partie.agir(siege, { type: 'pret' });
    }
    expect(partie.state.phase).toEqual({ kind: 'nuit', step: 'principale', acted: [] });
    expect(partie.state.day).toBe(1);
  });

  it('R32 — le temps écoulé ouvre la nuit, confirmation ou pas', () => {
    const partie = new Partie(6, compose(2, ['voyante', 'sorciere']), 1);
    partie.agir(0, { type: 'pret' }); // un seul a confirmé : il ne retarde rien
    partie.cloturer();
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* R33 — le compteur de jours                                          */
/* ------------------------------------------------------------------ */

describe('le compteur de jours', () => {
  it('R33 — la première nuit suit la révélation sans toucher au compteur', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // la révélation passe : nuit 1
    expect(partie.state.day).toBe(1);
    partie.cloturer(); // l’étape principale se clôt sur le silence de tous
    partie.cloturer(); // la Sorcière vivante se tait : aube paisible
    // matin du jour 1 : le compteur vaut déjà 1, il n’a pas bougé
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(1);
  });

  it('R33 — l’élection pré-nocturne ne fait pas non plus avancer le compteur', () => {
    const partie = new Partie(
      8,
      compose(2, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
      1,
    );
    partie.cloturer(); // la révélation passe : l’élection précède la nuit
    expect(partie.state.phase.kind).toBe('election');
    partie.abstenir(); // le village ne choisit personne : il n’y aura pas de capitaine
    // la nuit tombe quand même, et le compteur n’a pas bougé
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(1);
    partie.cloturer();
    partie.cloturer();
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(1); // matin du jour 1 — l’élection ne revient pas
  });

  it('R33 — chaque vote du soir avance le compteur d’un jour', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer();
    partie.cloturer();
    partie.cloturer(); // jour 1
    partie.abstenir(); // le village s’abstient : le soir tombe
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(2);
    partie.cloturer();
    partie.cloturer(); // jour 2
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(2);
    partie.abstenir(); // deuxième vote du soir
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* R35 — l’étape principale, parallèle                                 */
/* ------------------------------------------------------------------ */

describe('l’étape principale', () => {
  /** Douze places : de quoi installer Cupidon, le Salvateur, et la meute. */
  function nuit1(graine = 1): Partie {
    const partie = new Partie(
      12,
      compose(2, ['cupidon', 'salvateur', 'voyante', 'sorciere']),
      graine,
    );
    partie.cloturer(); // la révélation passe : la nuit tombe
    return partie;
  }

  it('R35 — Cupidon, le Salvateur, la Voyante et les loups jouent en même temps, jamais la Sorcière', () => {
    const partie = nuit1();
    const attendus = [
      siege(partie.state, 'cupidon'),
      siege(partie.state, 'salvateur'),
      siege(partie.state, 'voyante'),
      ...sieges(partie.state, 'loup'),
    ].sort((a, b) => a - b);
    expect(pendingActors(partie.state)).toEqual(attendus);
    // la Sorcière, elle, attend son tour — et elle l’attendra seule (R36)
    expect(pendingActors(partie.state)).not.toContain(siege(partie.state, 'sorciere'));
  });

  it('R35 — l’étape ne se clôt que lorsque le dernier a joué', () => {
    const partie = nuit1();
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: cobaye(partie.state, 0) });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    // quatre sur cinq ont joué : Cupidon retient tout le monde
    expect(partie.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    expect(pendingActors(partie.state)).toEqual([siege(partie.state, 'cupidon')]);
    partie.agir(siege(partie.state, 'cupidon'), {
      type: 'cupidon',
      a: cobaye(partie.state, 2),
      b: cobaye(partie.state, 3),
    });
    // la flèche est tirée : la Sorcière prend le relais, seule
    expect(partie.state.phase).toEqual({ kind: 'nuit', step: 'sorciere', acted: [] });
  });

  it('R35 — Cupidon n’est appelé que la première nuit', () => {
    const partie = nuit1();
    partie.agir(siege(partie.state, 'cupidon'), {
      type: 'cupidon',
      a: cobaye(partie.state, 0),
      b: cobaye(partie.state, 1),
    });
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: cobaye(partie.state, 2) });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 3) });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    partie.abstenir(); // jour 1 sans exécution : la deuxième nuit tombe
    // Cupidon a tiré sa flèche : plus rien à attendre de lui
    expect(pendingActors(partie.state)).not.toContain(siege(partie.state, 'cupidon'));
    expect(viewFor(partie.state, siege(partie.state, 'cupidon')).prompt).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* R36 — la Sorcière, puis son pas fantôme                             */
/* ------------------------------------------------------------------ */

describe('la Sorcière et son pas fantôme', () => {
  it('R36 — la Sorcière joue seule, après l’étape principale', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const proie = cobaye(partie.state, 0);
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    partie.agir(loupA!, { type: 'devorer', target: proie });
    const pas = partie.agir(loupB!, { type: 'devorer', target: proie });
    // l’étape principale est close : la Sorcière est appelée, elle seule
    expect(pas.state.phase).toEqual({ kind: 'nuit', step: 'sorciere', acted: [] });
    expect(pendingActors(pas.state)).toEqual([siege(pas.state, 'sorciere')]);
    // les autres n’ont plus voix au chapitre
    refuser(pas.state, loupA!, { type: 'devorer', target: cobaye(pas.state, 2) });
    refuser(pas.state, siege(pas.state, 'voyante'), { type: 'sonder', target: cobaye(pas.state, 3) });
    // vivante, son pas dure le temps d’une nuit, pas celui d’un fantôme
    expect(phaseBudgetMs(pas.state, createSeededRng(5))).toBe(pas.state.options.tempsNuit * 1000);
  });

  it('R36 — morte, la Sorcière laisse une étape fantôme de cinq à dix secondes', () => {
    /** La deuxième nuit d’une partie où le village a condamné sa Sorcière. */
    const sorciereMorte = (graine: number): Partie => {
      const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), graine);
      partie.cloturer(); // nuit 1
      partie.cloturer(); // l’étape principale se clôt sur le silence de tous
      partie.cloturer(); // la Sorcière vivante se tait : aube paisible, jour 1
      // le village la condamne au vote : la deuxième nuit l’appellera morte
      const sorciere = siege(partie.state, 'sorciere');
      for (const siege of livingSeats(partie.state)) {
        partie.agir(siege, { type: 'voter', target: siege === sorciere ? null : sorciere });
      }
      expect(partie.state.players[sorciere]!.alive).toBe(false);
      expect(partie.state.phase.kind).toBe('nuit'); // nuit 2
      partie.cloturer(); // l’étape principale close : la morte est appelée quand même
      return partie;
    };
    const partie = sorciereMorte(1);
    // la durée fantôme est tirée à l’entrée de l’étape et rangée avec elle (R104)
    expect(partie.state.phase).toEqual({ kind: 'nuit', step: 'sorciere', acted: [], ghostMs: expect.any(Number) });
    // personne n’agit : ce pas n’existe que pour être vu, et pour durer
    expect(pendingActors(partie.state)).toEqual([]);
    // la durée se lit sans tirer : la redemander ne la change pas
    expect(phaseBudgetMs(partie.state)).toBe(phaseBudgetMs(partie.state));
    // tirée au sort, elle reste dans la fourchette — et ne se répète pas
    // d’une partie à l’autre
    const durees = new Set<number>();
    for (let graine = 1; graine <= 20; graine++) {
      const duree = phaseBudgetMs(sorciereMorte(graine).state);
      expect(duree).toBeGreaterThanOrEqual(GHOST_STEP_MS.min);
      expect(duree).toBeLessThan(GHOST_STEP_MS.min + GHOST_STEP_MS.spread);
      durees.add(duree);
    }
    expect(durees.size).toBeGreaterThan(1);
    // le temps écoulé clôt le pas fantôme : l’aube arrive
    const aube = partie.cloturer();
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
  });
});

/* ------------------------------------------------------------------ */
/* R37 — Cupidon                                                       */
/* ------------------------------------------------------------------ */

describe('Cupidon', () => {
  /** Dix places : Cupidon installé, de quoi lier sans toucher aux rôles joués. */
  function nuit1(graine = 1): Partie {
    const partie = new Partie(10, compose(2, ['cupidon', 'voyante', 'sorciere']), graine);
    partie.cloturer(); // la révélation passe : la nuit tombe
    return partie;
  }

  it('R37 — Cupidon désigne deux vivants distincts, lui-même possible', () => {
    const partie = nuit1();
    const cupidon = siege(partie.state, 'cupidon');
    const a = cobaye(partie.state, 0);
    const b = cobaye(partie.state, 1);
    // deux fois la même personne : la flèche ne se plante pas en double
    refuser(partie.state, cupidon, { type: 'cupidon', a, b: a });
    // une personne morte : refus — la première nuit n’en compte jamais à
    // l’heure où Cupidon choisit, on fabrique donc la situation
    refuser(avecUnMort(partie.state, b), cupidon, { type: 'cupidon', a, b });
    // lui-même et un autre : la flèche peut viser son propre cœur
    partie.agir(cupidon, { type: 'cupidon', a: cupidon, b: a });
    // la nuit se joue jusqu’à l’aube : le couple est engagé
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: b });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    const paire = [Math.min(cupidon, a), Math.max(cupidon, a)] as [number, number];
    expect(partie.state.lovers).toEqual(paire);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'amoureux', seats: paire });
  });

  it('R37 — Cupidon ne tire plus à partir de la deuxième nuit', () => {
    const partie = nuit1();
    const cupidon = siege(partie.state, 'cupidon');
    const a = cobaye(partie.state, 0);
    const b = cobaye(partie.state, 1);
    partie.agir(cupidon, { type: 'cupidon', a, b });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 2) });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    partie.abstenir(); // jour 1 sans exécution : la deuxième nuit tombe
    const erreur = refuser(partie.state, cupidon, { type: 'cupidon', a, b });
    expect(erreur.code).toBe('wrong-phase');
    // et le couple de la première nuit tient toujours
    expect(partie.state.lovers).toEqual([Math.min(a, b), Math.max(a, b)]);
  });
});

/* ------------------------------------------------------------------ */
/* R38 — le Salvateur                                                  */
/* ------------------------------------------------------------------ */

describe('le Salvateur', () => {
  function nuit1(graine = 1): Partie {
    const partie = new Partie(10, compose(2, ['salvateur', 'voyante', 'sorciere']), graine);
    partie.cloturer(); // la révélation passe : la nuit tombe
    return partie;
  }

  it('R38 — le Salvateur protège un vivant, jamais le même deux nuits de suite', () => {
    const partie = nuit1();
    const salvateur = siege(partie.state, 'salvateur');
    const protege = cobaye(partie.state, 0);
    const autre = cobaye(partie.state, 1);
    // la première nuit, aucune interdiction ne pèse encore
    expect(viewFor(partie.state, salvateur).prompt).toEqual({ kind: 'proteger', forbidden: null });
    partie.agir(salvateur, { type: 'proteger', target: protege });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: autre });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: protege });
    partie.agir(loupB!, { type: 'devorer', target: protege });
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // protégée, la proie survit : l’aube est paisible
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
    expect(partie.state.players[protege]!.alive).toBe(true);
    partie.abstenir(); // jour 1 sans exécution : la deuxième nuit tombe
    // le prompt porte maintenant l’interdit de la veille
    expect(viewFor(partie.state, salvateur).prompt).toEqual({ kind: 'proteger', forbidden: protege });
    const erreur = refuser(partie.state, salvateur, { type: 'proteger', target: protege });
    expect(erreur.code).toBe('target');
    // un autre choix, lui, passe
    partie.agir(salvateur, { type: 'proteger', target: autre });
    expect(partie.state.night.protect).toBe(autre);
  });

  it('R38 — le bouclier arrête les loups, pas le poison', () => {
    const partie = nuit1();
    const protege = cobaye(partie.state, 0);
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: protege });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: protege });
    partie.agir(loupB!, { type: 'devorer', target: protege });
    // la Sorcière empoisonne la personne protégée : rien ne contrarie le poison
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: protege });
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: protege, cause: 'poison', role: 'villageois' }],
    });
    expect(partie.state.players[protege]!.alive).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* R39 — la Voyante                                                    */
/* ------------------------------------------------------------------ */

describe('la Voyante', () => {
  it('R39 — la Voyante sonde un vivant, jamais elle-même, et tout s’accumule', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const voyante = siege(partie.state, 'voyante');
    const premiere = cobaye(partie.state, 0);
    const condamne = cobaye(partie.state, 1);
    const seconde = cobaye(partie.state, 2);
    // elle se connaît déjà : refus
    refuser(partie.state, voyante, { type: 'sonder', target: voyante });
    partie.agir(voyante, { type: 'sonder', target: premiere });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // le village exécute un innocent : la nuit suivante aura un mort à ne pas sonder
    for (const siege of livingSeats(partie.state)) {
      partie.agir(siege, { type: 'voter', target: siege === condamne ? null : condamne });
    }
    // nuit 2 : un mort ne se sonde pas, un vivant oui
    refuser(partie.state, voyante, { type: 'sonder', target: condamne });
    partie.agir(voyante, { type: 'sonder', target: seconde });
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupB!, { type: 'devorer', target: null });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // ce qu’elle a appris s’accumule, nuit après nuit, à elle seule
    expect(partie.state.inspections).toEqual([
      { day: 1, target: premiere, role: 'villageois' },
      { day: 2, target: seconde, role: 'villageois' },
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* R40 — la meute                                                      */
/* ------------------------------------------------------------------ */

describe('la meute', () => {
  it('R40 — un loup vote pour un vivant qui n’est pas un loup, ou s’abstient', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const [loupA, loupB] = sieges(partie.state, 'loup');
    const proie = cobaye(partie.state, 0);
    // les loups ne se mangent pas entre eux
    refuser(partie.state, loupA!, { type: 'devorer', target: loupB! });
    // un mort ne se dévore pas — la première nuit n’en compte jamais à
    // l’heure où la meute choisit, on fabrique donc la situation
    refuser(avecUnMort(partie.state, proie), loupA!, { type: 'devorer', target: proie });
    // s’abstenir est permis, et viser un vivant du village aussi
    partie.agir(loupA!, { type: 'devorer', target: null });
    partie.agir(loupA!, { type: 'devorer', target: cobaye(partie.state, 1) });
  });

  it('R40 — un loup peut changer d’avis tant que l’étape court', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const [loupA, loupB] = sieges(partie.state, 'loup');
    const premiere = cobaye(partie.state, 0);
    const seconde = cobaye(partie.state, 1);
    partie.agir(loupA!, { type: 'devorer', target: premiere });
    expect(partie.state.night.wolfVotes[loupA!]).toBe(premiere);
    // l’étape n’est pas close : l’avis se redonne
    partie.agir(loupA!, { type: 'devorer', target: seconde });
    expect(partie.state.night.wolfVotes[loupA!]).toBe(seconde);
    // la meute s’accorde sur la seconde proie, la nuit se clôt
    partie.agir(loupB!, { type: 'devorer', target: seconde });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: premiere });
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    expect(partie.state.night.victim).toBe(seconde);
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: seconde, cause: 'loups', role: 'villageois' }],
    });
  });
});

/* ------------------------------------------------------------------ */
/* R41 — le dépouillement des loups                                    */
/* ------------------------------------------------------------------ */

describe('le dépouillement des loups', () => {
  it('R41 — la majorité des loups décide, les voix dissidentes se taisent', () => {
    const partie = new Partie(12, compose(3, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const [loupA, loupB, loupC] = sieges(partie.state, 'loup');
    const majeure = cobaye(partie.state, 0);
    const dissidente = cobaye(partie.state, 1);
    partie.agir(loupA!, { type: 'devorer', target: majeure });
    partie.agir(loupB!, { type: 'devorer', target: majeure });
    partie.agir(loupC!, { type: 'devorer', target: dissidente });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: majeure });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    expect(partie.state.night.victim).toBe(majeure);
    expect(partie.state.players[dissidente]!.alive).toBe(true);
  });

  it('R41 — une égalité entre loups se tranche au sort', () => {
    // Deux loups, deux proies : la meute a faim, elle ne renonce pas faute
    // d’accord — le sort désigne, et la même graine désigne la même victime.
    const tirage = (graine: number): string => {
      const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), graine);
      partie.cloturer();
      const [loupA, loupB] = sieges(partie.state, 'loup');
      const a = cobaye(partie.state, 0);
      const b = cobaye(partie.state, 1);
      partie.agir(loupA!, { type: 'devorer', target: a });
      partie.agir(loupB!, { type: 'devorer', target: b });
      partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: a });
      partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
      expect(partie.state.night.victim).not.toBeNull(); // l’égalité ne fait pas reculer la meute
      return partie.state.night.victim === a ? 'a' : 'b';
    };
    expect(tirage(7)).toBe(tirage(7)); // même graine, même victime
    // et le sort ne tombe pas toujours du même côté
    const sorts = new Set<string>();
    for (let graine = 1; graine <= 16; graine++) {
      sorts.add(tirage(graine));
    }
    expect(sorts).toEqual(new Set(['a', 'b']));
  });

  it('R41 — aucune voix, aucune victime', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    // la meute entière se tait : le moteur n’invente pas de proie
    partie.cloturer(); // l’étape principale se clôt sur le silence de tous
    expect(partie.state.night.victim).toBeNull();
    expect(partie.state.log).toContainEqual({ day: 1, type: 'loups', target: null });
    const aube = partie.cloturer(); // la Sorcière vivante se tait aussi
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
  });

  it('R41 — seules comptent les voix des loups encore en vie', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const loups = sieges(partie.state, 'loup');
    const premiere = cobaye(partie.state, 0);
    const seconde = cobaye(partie.state, 1);
    // nuit 1 : la meute dévore sa proie
    partie.agir(loups[0]!, { type: 'devorer', target: premiere });
    partie.agir(loups[1]!, { type: 'devorer', target: premiere });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: seconde });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // le village saisit un loup au piège du vote : l’autre reste seul
    const loupMort = loups[0]!;
    for (const siege of livingSeats(partie.state)) {
      partie.agir(siege, { type: 'voter', target: siege === loupMort ? null : loupMort });
    }
    expect(partie.state.players[loupMort]!.alive).toBe(false);
    // nuit 2 : le loup mort n’est plus appelé, sa voix ne compte plus
    expect(pendingActors(partie.state)).not.toContain(loupMort);
    partie.agir(loups[1]!, { type: 'devorer', target: seconde });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 2) });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // la voix de l’unique loup vivant a tranché, à elle seule
    expect(partie.state.night.victim).toBe(seconde);
    expect(partie.state.players[seconde]!.alive).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* R42 à R44 — les potions                                             */
/* ------------------------------------------------------------------ */

describe('les potions', () => {
  it('R42 — la potion de vie ne sert que sur la victime des loups', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    partie.cloturer(); // la meute s’est tue : il n’y a personne à sauver
    const sorciere = siege(partie.state, 'sorciere');
    const erreur = refuser(partie.state, sorciere, { type: 'sorciere', save: true, kill: null });
    expect(erreur.code).toBe('potion');
    // elle referme sa sacoche : l’aube est paisible
    const aube = partie.agir(sorciere, { type: 'sorciere', save: false, kill: null });
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
  });

  it('R42 — la potion de mort sert sur n’importe quel vivant, la Sorcière comprise', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const sorciere = siege(partie.state, 'sorciere');
    const devoree = cobaye(partie.state, 0);
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: devoree });
    partie.agir(loupB!, { type: 'devorer', target: devoree });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    // elle tourne la fiole contre elle-même : permis
    const aube = partie.agir(sorciere, { type: 'sorciere', save: false, kill: sorciere });
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [
        { seat: devoree, cause: 'loups', role: 'villageois' },
        { seat: sorciere, cause: 'poison', role: 'sorciere' },
      ],
    });
    expect(partie.state.potions.mort).toBe(false);
  });

  it('R42 — chaque potion ne sert qu’une fois dans la partie', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const sorciere = siege(partie.state, 'sorciere');
    const voyante = siege(partie.state, 'voyante');
    const [loupA, loupB] = sieges(partie.state, 'loup');
    const x = cobaye(partie.state, 0);
    const y = cobaye(partie.state, 1);
    const z = cobaye(partie.state, 2);
    const t = cobaye(partie.state, 3);
    // nuit 1 : la meute dévore x, la Sorcière le sauve — la fiole de vie se vide
    partie.agir(loupA!, { type: 'devorer', target: x });
    partie.agir(loupB!, { type: 'devorer', target: x });
    partie.agir(voyante, { type: 'sonder', target: y });
    partie.agir(sorciere, { type: 'sorciere', save: true, kill: null });
    expect(partie.state.potions.vie).toBe(false);
    expect(partie.state.players[x]!.alive).toBe(true);
    partie.abstenir(); // jour 1
    // nuit 2 : la meute dévore y ; la fiole de vie est vide, le poison sert — sur z
    partie.agir(loupA!, { type: 'devorer', target: y });
    partie.agir(loupB!, { type: 'devorer', target: y });
    partie.agir(voyante, { type: 'sonder', target: z });
    refuser(partie.state, sorciere, { type: 'sorciere', save: true, kill: null });
    partie.agir(sorciere, { type: 'sorciere', save: false, kill: z });
    expect(partie.state.potions.mort).toBe(false);
    partie.abstenir(); // jour 2
    // nuit 3 : les deux fioles sont vides, la meute dévore t
    partie.agir(loupA!, { type: 'devorer', target: t });
    partie.agir(loupB!, { type: 'devorer', target: t });
    partie.agir(voyante, { type: 'sonder', target: x });
    refuser(partie.state, sorciere, { type: 'sorciere', save: true, kill: null });
    refuser(partie.state, sorciere, { type: 'sorciere', save: false, kill: x });
    partie.agir(sorciere, { type: 'sorciere', save: false, kill: null });
    expect(partie.state.players[t]!.alive).toBe(false);
    expect(partie.state.potions).toEqual({ vie: false, mort: false });
  });

  it('R43 — la Sorcière peut se sauver elle-même, sauf si la table l’interdit', () => {
    // la table libre : elle boit la potion et survit
    const libre = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    libre.cloturer(); // nuit 1
    const sorciereLibre = siege(libre.state, 'sorciere');
    const loupsLibres = sieges(libre.state, 'loup');
    libre.agir(loupsLibres[0]!, { type: 'devorer', target: sorciereLibre });
    libre.agir(loupsLibres[1]!, { type: 'devorer', target: sorciereLibre });
    libre.agir(siege(libre.state, 'voyante'), { type: 'sonder', target: cobaye(libre.state, 0) });
    libre.agir(sorciereLibre, { type: 'sorciere', save: true, kill: null });
    expect(libre.state.players[sorciereLibre]!.alive).toBe(true);
    expect(libre.state.potions.vie).toBe(false);

    // la table stricte — la règle officielle : la fiole n’est pas pour elle
    const stricte = new Partie(8, compose(2, ['voyante', 'sorciere'], { sorciereSeSauve: false }), 1);
    stricte.cloturer(); // nuit 1
    const sorciere = siege(stricte.state, 'sorciere');
    const loups = sieges(stricte.state, 'loup');
    stricte.agir(loups[0]!, { type: 'devorer', target: sorciere });
    stricte.agir(loups[1]!, { type: 'devorer', target: sorciere });
    stricte.agir(siege(stricte.state, 'voyante'), { type: 'sonder', target: cobaye(stricte.state, 0) });
    // le prompt la prévient : la victime, c’est elle, et la fiole est barrée
    expect(viewFor(stricte.state, sorciere).prompt).toEqual({
      kind: 'sorciere',
      victim: sorciere,
      vie: true,
      mort: true,
      peutSeSauver: false,
    });
    const erreur = refuser(stricte.state, sorciere, { type: 'sorciere', save: true, kill: null });
    expect(erreur.code).toBe('potion');
    // elle peut encore s’abstenir — et mourir sous la dent des loups
    stricte.agir(sorciere, { type: 'sorciere', save: false, kill: null });
    expect(stricte.state.players[sorciere]!.alive).toBe(false);
  });

  it('R44 — la potion de vie se consomme même si la victime était déjà protégée', () => {
    const partie = new Partie(10, compose(2, ['salvateur', 'voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const protege = cobaye(partie.state, 0);
    partie.agir(siege(partie.state, 'salvateur'), { type: 'proteger', target: protege });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: protege });
    partie.agir(loupB!, { type: 'devorer', target: protege });
    // la Sorcière ne peut pas savoir que le bouclier tenait déjà : elle sauve
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: true, kill: null });
    // la potion est bue quand même, et personne n’est mort
    expect(partie.state.potions.vie).toBe(false);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'sauvetage', target: protege });
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
    expect(partie.state.players[protege]!.alive).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* R45 — l’aube                                                        */
/* ------------------------------------------------------------------ */

describe('l’aube', () => {
  it('R45 — les morts de la nuit sont annoncés d’un bloc, avec leur cause', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const devoree = cobaye(partie.state, 0);
    const empoisonnee = cobaye(partie.state, 1);
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: devoree });
    partie.agir(loupB!, { type: 'devorer', target: devoree });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 2) });
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: empoisonnee });
    // un seul bloc, deux causes : la dent et le poison
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [
        { seat: devoree, cause: 'loups', role: 'villageois' },
        { seat: empoisonnee, cause: 'poison', role: 'villageois' },
      ],
    });
    expect(partie.state.players[devoree]!.alive).toBe(false);
    expect(partie.state.players[empoisonnee]!.alive).toBe(false);
  });

  it('R45 — sauvée, la victime des loups ne meurt pas', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const victime = cobaye(partie.state, 0);
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: victime });
    partie.agir(loupB!, { type: 'devorer', target: victime });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: true, kill: null });
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
    expect(partie.state.players[victime]!.alive).toBe(true);
  });

  it('R45 — une nuit sans mort est une aube paisible', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    partie.cloturer(); // silence à tous les étages de la nuit
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    expect(aube.events).toContainEqual({ type: 'aube-paisible' });
    expect(partie.state.phase.kind).toBe('jour'); // le jour suit, sans un mort
  });
});

/* ------------------------------------------------------------------ */
/* R47 — le chagrin                                                    */
/* ------------------------------------------------------------------ */

describe('le chagrin', () => {
  it('R47 — un amoureux mort entraîne l’autre de chagrin', () => {
    const partie = new Partie(10, compose(2, ['cupidon', 'voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const cupidon = siege(partie.state, 'cupidon');
    const amoureuxA = cobaye(partie.state, 0);
    const amoureuxB = cobaye(partie.state, 1);
    const temoin = cobaye(partie.state, 2);
    partie.agir(cupidon, { type: 'cupidon', a: amoureuxA, b: amoureuxB });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: temoin });
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: amoureuxA });
    partie.agir(loupB!, { type: 'devorer', target: amoureuxA });
    const aube = partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // d’un bloc : la victime des loups, et dans sa foulée son amoureux
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [
        { seat: amoureuxA, cause: 'loups', role: 'villageois' },
        { seat: amoureuxB, cause: 'chagrin', role: 'villageois' },
      ],
    });
    // Le moteur ne connaît qu’un couple — Cupidon tire une seule flèche, la
    // première nuit — si bien que le chagrin s’arrête au second maillon par
    // construction : la chaîne de couple en couple n’a ici qu’un seul maillon.
    expect(partie.state.lovers).toEqual([
      Math.min(amoureuxA, amoureuxB),
      Math.max(amoureuxA, amoureuxB),
    ]);
    expect(partie.state.players[amoureuxB]!.alive).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* R48 — le Chasseur mort                                              */
/* ------------------------------------------------------------------ */

describe('le Chasseur mort', () => {
  it('R48 — mort sous la dent des loups, le Chasseur garde une balle', () => {
    const partie = new Partie(8, compose(2, ['chasseur', 'voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const chasseur = siege(partie.state, 'chasseur');
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(loupA!, { type: 'devorer', target: chasseur });
    partie.agir(loupB!, { type: 'devorer', target: chasseur });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 0) });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // l’aube a rendu son bloc de morts, et le déclencheur s’ouvre
    expect(partie.state.phase).toEqual({ kind: 'chasseur', seat: chasseur });
    expect(pendingActors(partie.state)).toEqual([chasseur]);
  });

  it('R48 — mort par le vote du village, le Chasseur tire aussi', () => {
    const partie = new Partie(8, compose(2, ['chasseur', 'voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    partie.cloturer(); // une nuit de silence
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null }); // aube paisible, jour 1
    const chasseur = siege(partie.state, 'chasseur');
    for (const siege of livingSeats(partie.state)) {
      partie.agir(siege, { type: 'voter', target: siege === chasseur ? null : chasseur });
    }
    // condamné par le vote, il tombe — et son doigt reste sur la gâchette
    expect(partie.state.phase).toEqual({ kind: 'chasseur', seat: chasseur });
  });

  it('R48 — le poison étouffe le Chasseur — sauf si la table l’autorise', () => {
    const deroule = (autorise: boolean) => {
      const partie = new Partie(
        8,
        compose(2, ['chasseur', 'voyante', 'sorciere'], { chasseurEmpoisonne: autorise }),
        1,
      );
      partie.cloturer(); // nuit 1
      const chasseur = siege(partie.state, 'chasseur');
      partie.cloturer(); // la meute s’est tue
      partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: chasseur });
      return { partie, chasseur };
    };
    // la règle stricte : le poison l’étouffe, pas de déclencheur
    const stricte = deroule(false);
    expect(stricte.partie.state.players[stricte.chasseur]!.alive).toBe(false);
    expect(stricte.partie.state.triggers).toEqual([]);
    expect(stricte.partie.state.phase.kind).toBe('jour');
    // l’option de table rouvre la main pour toute mort
    const libre = deroule(true);
    expect(libre.partie.state.phase).toEqual({ kind: 'chasseur', seat: libre.chasseur });
  });

  it('R48 — le chagrin non plus ne laisse pas de souffle pour viser — sauf option', () => {
    const deroule = (autorise: boolean) => {
      const partie = new Partie(
        10,
        compose(2, ['cupidon', 'chasseur', 'voyante', 'sorciere'], { chasseurEmpoisonne: autorise }),
        1,
      );
      partie.cloturer(); // nuit 1
      const chasseur = siege(partie.state, 'chasseur');
      const moitie = cobaye(partie.state, 0);
      partie.agir(siege(partie.state, 'cupidon'), { type: 'cupidon', a: chasseur, b: moitie });
      partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
      const [loupA, loupB] = sieges(partie.state, 'loup');
      partie.agir(loupA!, { type: 'devorer', target: moitie });
      partie.agir(loupB!, { type: 'devorer', target: moitie });
      partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
      return { partie, chasseur };
    };
    // mort de chagrin, dans le bloc de l’aube : pas de tir
    const stricte = deroule(false);
    expect(stricte.partie.state.players[stricte.chasseur]!.alive).toBe(false);
    expect(stricte.partie.state.triggers).toEqual([]);
    expect(stricte.partie.state.phase.kind).toBe('jour');
    // l’option de table lui rend son souffle, même pour un cœur brisé
    const libre = deroule(true);
    expect(libre.partie.state.phase).toEqual({ kind: 'chasseur', seat: libre.chasseur });
  });
});

/* ------------------------------------------------------------------ */
/* R50 — les déclencheurs, l’un après l’autre                          */
/* ------------------------------------------------------------------ */

describe('les déclencheurs', () => {
  it('R50 — les déclencheurs s’enchaînent, la victoire n’est regardée qu’au bout', () => {
    // Six joueurs, un seul loup : le tir du Chasseur peut l’abattre et
    // renverser la partie. Le Chasseur est aussi capitaine — sa mort ouvre
    // deux déclencheurs d’un coup, le tir d’abord, la succession ensuite.
    const partie = new Partie(
      6,
      compose(1, ['chasseur', 'voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
      1,
    );
    partie.cloturer(); // la révélation passe : élection pré-nocturne
    const chasseur = siege(partie.state, 'chasseur');
    for (let siege = 0; siege < 6; siege++) {
      partie.agir(siege, { type: 'voter', target: chasseur });
    }
    expect(partie.state.captain).toBe(chasseur);
    expect(partie.state.phase.kind).toBe('nuit'); // l’élection n’a pas fait avancer le jour (R33)
    // la nuit 1 : l’unique loup dévore le Chasseur capitaine
    const loup = sieges(partie.state, 'loup')[0]!;
    const survivant = cobaye(partie.state, 0);
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: survivant });
    partie.agir(loup, { type: 'devorer', target: chasseur });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // l’aube : le Chasseur meurt, deux déclencheurs s’ouvrent — le tir d’abord
    expect(partie.state.phase).toEqual({ kind: 'chasseur', seat: chasseur });
    // son tir abat le dernier loup : plus un seul loup survivant…
    const tir = partie.agir(chasseur, { type: 'tirer', target: loup });
    expect(tir.events).toContainEqual({ type: 'tir', hunter: chasseur, target: loup });
    expect(partie.state.players[loup]!.alive).toBe(false);
    // …la victoire serait acquise, mais une succession attend : elle attend
    expect(partie.state.over).toBe(false);
    expect(partie.state.winner).toBeNull();
    expect(partie.state.phase).toEqual({ kind: 'succession', seat: chasseur });
    // la succession réglée, la chaîne est vide : la victoire se regarde enfin
    const fin = partie.agir(chasseur, { type: 'successeur', target: survivant });
    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('village');
    expect(partie.state.captain).toBe(survivant);
    expect(fin.events).toContainEqual({ type: 'fin', winner: 'village' });
  });
});

/* ------------------------------------------------------------------ */
/* R85 — la pureté des fonctions                                       */
/* ------------------------------------------------------------------ */

describe('la pureté', () => {
  it('R85 — ni l’action ni la clôture ne modifient l’état reçu', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const loup = sieges(partie.state, 'loup')[0]!;
    const proie = cobaye(partie.state, 0);

    // une action : l’état reçu reste intact, le pas rend un clone modifié
    const original = partie.state;
    const avant = structuredClone(original);
    const pas = applyAction(original, { type: 'devorer', target: proie }, createSeededRng(2), loup);
    expect(original).toEqual(avant); // rien n’a bougé sur place
    expect(pas.state).not.toBe(original);
    expect(pas.state.night.wolfVotes[loup]).toBe(proie);
    expect(original.night.wolfVotes[loup]).toBeUndefined();

    // une clôture : même exigence
    const avantCloture = structuredClone(pas.state);
    const cloture = timeoutPhase(pas.state, createSeededRng(3), pas.state.phaseSeq);
    expect(pas.state).toEqual(avantCloture);
    expect(cloture.state).not.toBe(pas.state);
  });
});
