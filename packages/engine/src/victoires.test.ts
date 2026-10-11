/**
 * Les quatre issues — R70 à R72.
 *
 * Une partie de loup-garou ne se juge qu’une fois les déclencheurs vidés
 * (R72) : le village sans loup, la meute sans opposition, le couple mixte
 * seul survivant — ou la table vide, qui n’est à personne. Chaque issue a
 * ici son déroulé minimal, joué pas à pas sur un générateur seedé (R86) :
 * aucune horloge, aucun `Math.random`, et la même graine rejoue la même
 * défaite. Chaque test vérifie l’état rendu — `over`, `winner`, la phase
 * `fin` — et l’évènement `fin`, qui part à tous les sièges (R87).
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  livingSeats,
  phaseBudgetMs,
  timeoutPhase,
} from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { createSeededRng } from './rng.js';
import type { Action, GameOptions, GameState, RoleId, Rng, Step } from './types.js';

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
  // Pas de capitaine : les issues ne doivent rien à la pondération.
  return table({ auto: false, loups, roles, capitaine: false, ...ecarts });
}

/**
 * Une partie qui avance pas à pas. Chaque action enchaîne l’état rendu —
 * le moteur ne modifie jamais celui qu’on lui donne (R85) — et la même
 * graine rejoue la même partie (R86).
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

  /** Les électeurs s’abstiennent tous : la phase de vote se clôt sans rien décider. */
  abstenir(): void {
    for (const siege of livingSeats(this.state).filter((s) => this.state.players[s]!.canVote)) {
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

/** Les villageois simples : les proies et les témoins commodes des fins rapides. */
function cobaye(state: GameState, rang: number): number {
  const siege = sieges(state, 'villageois')[rang];
  if (siege === undefined) throw new Error('pas assez de villageois simples');
  return siege;
}

/** Le village entier condamne ce siège, qui s’abstient : renvoie le pas du dépouillement. */
function executer(partie: Partie, accuse: number): Step {
  let pas: Step | undefined;
  for (const siege of livingSeats(partie.state)) {
    pas = partie.agir(siege, { type: 'voter', target: siege === accuse ? null : accuse });
  }
  if (!pas) throw new Error('personne pour voter');
  return pas;
}

/* ------------------------------------------------------------------ */
/* R71 — le village                                                     */
/* ------------------------------------------------------------------ */

describe('la victoire du village', () => {
  it('R71 — le village gagne à l’aube où tombe le dernier loup', () => {
    // Un seul loup, une Sorcière qui garde son poison : la voie la plus
    // courte — le village gagne sans même attendre un vote.
    const partie = new Partie(6, compose(1, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const loup = sieges(partie.state, 'loup')[0]!;
    const devoree = cobaye(partie.state, 0);
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    partie.agir(loup, { type: 'devorer', target: devoree });
    // La Sorcière vide sa fiole sur le loup : l’aube emportera les deux.
    const aube = partie.agir(siege(partie.state, 'sorciere'), {
      type: 'sorciere',
      save: false,
      kill: loup,
    });
    expect(aube.events).toContainEqual({
      type: 'morts',
      deaths: [
        { seat: devoree, cause: 'loups', role: 'villageois' },
        { seat: loup, cause: 'poison', role: 'loup' },
      ],
    });

    // Plus un seul loup vivant : la partie s’achève à l’aube, sans vote.
    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('village');
    expect(partie.state.phase).toEqual({ kind: 'fin' });
    expect(aube.events).toContainEqual({ type: 'fin', winner: 'village' });
    // La fin n’a pas de minuterie (R82).
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* R71 — les loups                                                      */
/* ------------------------------------------------------------------ */

describe('la victoire des loups', () => {
  /** Deux loups, aucun rôle spécial : la meute dévore, le village vote à côté. */
  function defaiteDuVillage(graine: number): GameState {
    const partie = new Partie(6, compose(2, []), graine);
    const [loupA, loupB] = sieges(partie.state, 'loup');

    // Nuit 1 : la meute emporte la première victime. Pas de Sorcière dans
    // cette composition : l’étape principale close appelle l’aube directement.
    partie.cloturer();
    partie.agir(loupA!, { type: 'devorer', target: cobaye(partie.state, 0) });
    partie.agir(loupB!, { type: 'devorer', target: cobaye(partie.state, 0) });
    // Jour 1 : le village exécute un innocent.
    executer(partie, cobaye(partie.state, 1));
    // Nuit 2 : la meute cause, puis emporte la troisième.
    partie.agir(loupA!, { type: 'devorer', target: cobaye(partie.state, 2) });
    partie.agir(loupB!, { type: 'devorer', target: cobaye(partie.state, 2) });
    // Jour 2 : le village exécute le dernier innocent — il ne reste que la meute.
    executer(partie, cobaye(partie.state, 3));
    return partie.state;
  }

  it('R71 — les loups gagnent quand il ne reste qu’eux', () => {
    const fin = defaiteDuVillage(2026);
    expect(fin.over).toBe(true);
    expect(fin.winner).toBe('loups');
    expect(fin.phase).toEqual({ kind: 'fin' });
    // La meute entière survit à sa victoire.
    expect(livingSeats(fin)).toEqual(sieges(fin, 'loup'));
    // R86 : la même graine rejoue la même défaite, au mot près.
    expect(defaiteDuVillage(2026)).toEqual(fin);
  });
});

/* ------------------------------------------------------------------ */
/* R70 — les amoureux                                                   */
/* ------------------------------------------------------------------ */

describe('la victoire des amoureux', () => {
  it('R70 — un couple mixte, deux derniers survivants, gagne à eux deux', () => {
    // Cupidon marie le loup et une villageoise : camps opposés (R3) — le
    // seul couple qui puisse gagner à lui deux.
    const partie = new Partie(6, compose(1, ['cupidon']), 1);
    partie.cloturer(); // nuit 1
    const loup = sieges(partie.state, 'loup')[0]!;
    const cupidon = siege(partie.state, 'cupidon');
    const amoureuse = cobaye(partie.state, 0);
    partie.agir(cupidon, { type: 'cupidon', a: loup, b: amoureuse });
    partie.agir(loup, { type: 'devorer', target: cupidon });
    // → jour 1 : Cupidon est mort, le couple loup–villageoise est formé.
    expect(partie.state.lovers).toEqual([Math.min(loup, amoureuse), Math.max(loup, amoureuse)]);

    // La table se vide autour du couple : deux votes du village, deux nuits
    // de la meute — le loup dévore tout, sauf son propre cœur.
    executer(partie, cobaye(partie.state, 1)); // jour 1
    partie.agir(loup, { type: 'devorer', target: cobaye(partie.state, 2) }); // nuit 2
    // Jour 2 : le dernier tiers est condamné — il ne reste que le couple.
    const fin = executer(partie, cobaye(partie.state, 3));

    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('amoureux');
    expect(partie.state.phase).toEqual({ kind: 'fin' });
    expect(fin.events).toContainEqual({ type: 'fin', winner: 'amoureux' });
    // Ils gagnent vivants, tous les deux — c’est la règle, pas un décompte.
    expect(partie.state.players[loup]!.alive).toBe(true);
    expect(partie.state.players[amoureuse]!.alive).toBe(true);
    expect(livingSeats(partie.state).length).toBe(2);
  });

  it('R70 — l’un meurt, l’autre suit de chagrin : la table vide n’est à personne', () => {
    // Trois vivants au soir du jour 2 : le couple mixte et la Sorcière.
    // La nuit suivante, tout se joue d’un bloc — le loup dévore sa propre
    // amoureuse, le chagrin l’emporte, et la Sorcière boit son poison (R42 :
    // la potion de mort sert sur n’importe quel vivant, elle-même comprise).
    const partie = new Partie(6, compose(1, ['cupidon', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const loup = sieges(partie.state, 'loup')[0]!;
    const cupidon = siege(partie.state, 'cupidon');
    const sorciere = siege(partie.state, 'sorciere');
    const amoureuse = cobaye(partie.state, 0);
    partie.agir(cupidon, { type: 'cupidon', a: loup, b: amoureuse });
    partie.agir(loup, { type: 'devorer', target: cupidon });
    partie.agir(sorciere, { type: 'sorciere', save: false, kill: null }); // aube : Cupidon tombe

    // La table se vide : deux votes, deux nuits.
    executer(partie, cobaye(partie.state, 1)); // jour 1
    partie.agir(loup, { type: 'devorer', target: cobaye(partie.state, 2) }); // nuit 2
    partie.agir(sorciere, { type: 'sorciere', save: false, kill: null }); // aube → jour 2

    // Jour 2 : trois vivants, le village se tait — la partie ne se juge pas
    // avant que les déclencheurs soient vides, et il n’en est même pas
    // question : il reste un loup, et le couple n’est pas seul (R72).
    partie.abstenir();
    expect(partie.state.over).toBe(false);

    // Nuit 3 : le loup dévore son amoureuse — la meute ne s’épargne que
    // entre loups, lui — et la Sorcière retourne sa fiole contre elle-même.
    partie.agir(loup, { type: 'devorer', target: amoureuse });
    const derniereAube = partie.agir(sorciere, { type: 'sorciere', save: false, kill: sorciere });

    // D’un seul bloc : la dent, le chagrin qui suit (R47), le poison. La
    // cascade emporte le couple et sa veilleuse — la table est vide.
    expect(derniereAube.events).toContainEqual({
      type: 'morts',
      deaths: [
        { seat: amoureuse, cause: 'loups', role: 'villageois' },
        { seat: loup, cause: 'chagrin', role: 'loup' },
        { seat: sorciere, cause: 'poison', role: 'sorciere' },
      ],
    });
    expect(livingSeats(partie.state)).toEqual([]);
    // Tout le monde mort en même temps : la partie n’est à personne (R70).
    expect(partie.state.over).toBe(true);
    expect(partie.state.winner).toBe('personne');
    expect(partie.state.phase).toEqual({ kind: 'fin' });
    expect(derniereAube.events).toContainEqual({ type: 'fin', winner: 'personne' });
  });
});
