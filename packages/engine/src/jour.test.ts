/**
 * Le jour, l’élection du capitaine et les déclencheurs diurnes — R55 à R82.
 *
 * `nuit.test.ts` joue les nuits en détail, mais toujours le jour 1 en
 * abstention systématique : le déroulé du jour restait le parent pauvre des
 * épreuves. Ce fichier lui donne les siennes — le vote du village et son
 * dépouillement (R60 à R63), la grâce de l’Idiot (R62), la charge et la
 * succession du capitaine (R55 à R58), le tir du Chasseur (R65 à R67), le fil
 * de discussion (R78) et le temps qui clôt sans personne (R80 à R82). Chaque
 * test cite la règle qu’il vérifie, à la lettre près, dans `docs/RULES.md` :
 * c’est le document normatif, et c’est lui qui a raison.
 *
 * Rien ici ne lit l’horloge ni le hasard de la machine : le générateur est
 * seedé, les minuteries se déclenchent à la main par `timeoutPhase` (R86), et
 * aucun appel ne modifie l’état reçu (R85).
 */

import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createGame,
  ELECTION_MS,
  isAlive,
  livingSeats,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_PER_CHANNEL,
  MAX_MESSAGE_LENGTH,
  pendingActors,
  phaseBudgetMs,
  timeoutPhase,
  TRIGGER_MS,
} from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { createSeededRng } from './rng.js';
import {
  IllegalActionError,
  type Action,
  type ChatChannel,
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

/** Les villageois simples : les proies et les cobayes commodes des jours agités. */
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

/**
 * Une nuit que personne ne joue : l’étape principale se clôt sur le silence,
 * et l’étape de la Sorcière — vivante ou fantôme — sur le sien. Qui n’a pas
 * agi n’agit pas (R81) : l’aube arrive sans un mort.
 */
function nuitSilencieuse(partie: Partie): void {
  partie.cloturer();
  if (partie.state.phase.kind === 'nuit' && partie.state.phase.step === 'sorciere') {
    partie.cloturer();
  }
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

/** Une minuterie périmée : elle ne clôt rien, elle ne trace rien (R80). */
function refuserDelai(state: GameState, armedSeq: number): IllegalActionError {
  const avant = structuredClone(state);
  let erreur: unknown;
  try {
    timeoutPhase(state, createSeededRng(404), armedSeq);
  } catch (jetee) {
    erreur = jetee;
  }
  expect(erreur).toBeInstanceOf(IllegalActionError);
  expect(state).toEqual(avant);
  return erreur as IllegalActionError;
}

/* ------------------------------------------------------------------ */
/* R60/R61/R63 — le vote du village                                     */
/* ------------------------------------------------------------------ */

describe('le vote du village', () => {
  it('R60/R61/R63 — la majorité exécute, l’abstention ne compte pour rien, le dépouillement raconte tout', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // aube paisible : jour 1
    const accuse = cobaye(partie.state, 0);
    const abstentionniste = cobaye(partie.state, 1);

    // Six voix contre lui, l’intéressé et un témoin s’abstiennent : l’abstention
    // pèse zéro, elle ne dilue personne (R60).
    let pas: Step | undefined;
    for (const siege of livingSeats(partie.state)) {
      const cible = siege === accuse || siege === abstentionniste ? null : accuse;
      pas = partie.agir(siege, { type: 'voter', target: cible });
    }

    // Le dépouillement rend son compte au dernier électeur : le tally, la
    // sentence, puis la mort avec sa cause (R63) et son rôle — la table révèle.
    expect(pas!.events).toContainEqual({ type: 'vote', tally: { [accuse]: 6 }, executed: accuse });
    expect(pas!.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: accuse, cause: 'vote', role: 'villageois' }],
    });
    expect(partie.state.players[accuse]!.alive).toBe(false);
    expect(partie.state.log).toContainEqual({
      day: 1,
      type: 'vote',
      tally: { [accuse]: 6 },
      executed: accuse,
    });
    // L’abstentionniste, lui, n’a risqué rien et ne meurt pas.
    expect(partie.state.players[abstentionniste]!.alive).toBe(true);
    // Le soir du vote, la nuit tombe et le compteur avance (R33).
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(2);
  });

  it('R60 — changer d’avis avant la clôture remplace la voix, jamais deux', () => {
    const partie = new Partie(8, compose(2, []), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    const votant = cobaye(partie.state, 0);
    const premiere = cobaye(partie.state, 1);
    const seconde = cobaye(partie.state, 2);

    // Le votant se range derrière la première cible…
    partie.agir(votant, { type: 'voter', target: premiere });
    expect(partie.state.phase).toMatchObject({ kind: 'jour', votes: { [votant]: premiere } });
    // …puis change d’avis tant que la phase court (R60) : la voix se remplace.
    partie.agir(votant, { type: 'voter', target: seconde });
    expect(partie.state.phase).toMatchObject({ kind: 'jour', votes: { [votant]: seconde } });

    // Trois voix pour la première cible, quatre pour la seconde — le votant
    // compris. Si sa première voix s’était empilée au lieu de se remplacer,
    // le tally aurait lu 4 partout et personne ne serait mort (R61).
    partie.agir(cobaye(partie.state, 3), { type: 'voter', target: premiere });
    partie.agir(cobaye(partie.state, 4), { type: 'voter', target: premiere });
    partie.agir(cobaye(partie.state, 5), { type: 'voter', target: premiere });
    partie.agir(sieges(partie.state, 'loup')[0]!, { type: 'voter', target: seconde });
    partie.agir(sieges(partie.state, 'loup')[1]!, { type: 'voter', target: seconde });
    partie.agir(premiere, { type: 'voter', target: seconde });
    const pas = partie.agir(seconde, { type: 'voter', target: null }); // dernier électeur

    expect(pas.events).toContainEqual({
      type: 'vote',
      tally: { [premiere]: 3, [seconde]: 4 },
      executed: seconde,
    });
    expect(partie.state.players[premiere]!.alive).toBe(true); // l’ancienne cible survit
    expect(partie.state.players[seconde]!.alive).toBe(false);
  });

  it('R61 — une égalité au village n’exécute personne', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    const gauche = cobaye(partie.state, 0);
    const droite = cobaye(partie.state, 1);

    // Deux camps de trois voix, les deux accusés s’abstiennent : 3 partout.
    partie.agir(gauche, { type: 'voter', target: null });
    partie.agir(droite, { type: 'voter', target: null });
    partie.agir(cobaye(partie.state, 2), { type: 'voter', target: gauche });
    partie.agir(cobaye(partie.state, 3), { type: 'voter', target: gauche });
    partie.agir(siege(partie.state, 'voyante'), { type: 'voter', target: gauche });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'voter', target: droite });
    partie.agir(sieges(partie.state, 'loup')[0]!, { type: 'voter', target: droite });
    const pas = partie.agir(sieges(partie.state, 'loup')[1]!, { type: 'voter', target: droite });

    // Le village ne tire pas au sort ce que la meute, elle, tranche au hasard
    // (R41) : une égalité, c’est la nuit qui viendra. Choix assumé du projet.
    expect(pas.events).toContainEqual({
      type: 'vote',
      tally: { [gauche]: 3, [droite]: 3 },
      executed: null,
    });
    expect(pas.events.some((evenement) => evenement.type === 'morts')).toBe(false);
    expect(livingSeats(partie.state).length).toBe(8); // personne n’est tombé
    expect(partie.state.day).toBe(2); // et le soir tombe quand même
  });
});

/* ------------------------------------------------------------------ */
/* R62 — la grâce de l’Idiot                                            */
/* ------------------------------------------------------------------ */

/** L’Idiot condamné au matin du jour 1, gracié, et le jour 2 qui suit. */
function idiotGracie(): { partie: Partie; idiot: number; condamnation: Step } {
  // La table ne révèle pas les morts : seule la grâce peut montrer l’Idiot.
  const partie = new Partie(8, compose(2, ['idiot', 'voyante', 'sorciere'], { revelerRoles: false }), 1);
  partie.cloturer(); // nuit 1
  nuitSilencieuse(partie); // jour 1
  const idiot = siege(partie.state, 'idiot');
  const condamnation = executer(partie, idiot); // le village se trompe : grâce (R62)
  nuitSilencieuse(partie); // le soir tombe, la nuit 2 est paisible : jour 2
  return { partie, idiot, condamnation };
}

describe('la grâce de l’Idiot', () => {
  it('R62 — condamné par le vote, l’Idiot est gracié : vivant, démasqué, privé de vote', () => {
    const { partie, idiot, condamnation } = idiotGracie();

    // Le dépouillement le désigne… mais la grâce remplace la mort.
    expect(condamnation.events).toContainEqual({ type: 'vote', tally: { [idiot]: 7 }, executed: idiot });
    expect(condamnation.events).toContainEqual({ type: 'grace', seat: idiot });
    expect(condamnation.events.some((evenement) => evenement.type === 'morts')).toBe(false);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'grace', seat: idiot });

    // Gracié : en vie, carte retournée pour tous, urne fermée à jamais.
    expect(partie.state.players[idiot]!).toMatchObject({
      alive: true,
      canVote: false,
      revealed: true,
      role: 'idiot',
    });
    // La grâce se voit de toute la table, même sans revelerRoles (R46) :
    // c’est le jeu lui-même qui retourne cette carte-là.
    const vue = viewFor(partie.state, cobaye(partie.state, 0));
    expect(vue.players.find((joueur) => joueur.seat === idiot)).toMatchObject({
      role: 'idiot',
      alive: true,
      canVote: false,
    });
    // La journée a repris son cours : il a traversé la nuit qui suivait.
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(2);
  });

  it('R62 — aux jours suivants, l’Idiot gracié ne vote plus', () => {
    const { partie, idiot } = idiotGracie();
    expect(partie.state.phase.kind).toBe('jour'); // jour 2

    // Il vit, il parle sans doute — mais l’urne lui est fermée.
    const erreur = refuser(partie.state, idiot, { type: 'voter', target: cobaye(partie.state, 0) });
    expect(erreur.code).toBe('cannot-vote');
    // Le moteur ne l’attend plus : il n’est plus un électeur, la phase peut
    // se clôturer sans lui.
    expect(pendingActors(partie.state)).not.toContain(idiot);
    partie.abstenir();
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* R57 — la double voix du capitaine                                    */
/* ------------------------------------------------------------------ */

describe('la double voix du capitaine', () => {
  it('R57 — la double voix du capitaine bascule la majorité au vote du village', () => {
    // Six joueurs, un seul loup : un scrutin serré où tout se joue à la pondération.
    const partie = new Partie(
      6,
      compose(1, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
      1,
    );
    partie.cloturer(); // la révélation passe : élection pré-nocturne
    const capitaine = cobaye(partie.state, 0);
    for (let siege = 0; siege < 6; siege++) {
      partie.agir(siege, { type: 'voter', target: siege === capitaine ? null : capitaine });
    }
    expect(partie.state.captain).toBe(capitaine);
    partie.cloturer(); // nuit 1, étape principale silencieuse
    partie.cloturer(); // la Sorcière se tait : aube paisible, jour 1

    // scrutin à couteaux tirés : deux voix partout, sauf la sienne.
    const accuse = cobaye(partie.state, 1);
    const alternative = cobaye(partie.state, 2);
    partie.agir(capitaine, { type: 'voter', target: alternative }); // la voix qui compte double
    partie.agir(siege(partie.state, 'voyante'), { type: 'voter', target: alternative });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'voter', target: accuse });
    partie.agir(sieges(partie.state, 'loup')[0]!, { type: 'voter', target: accuse });
    partie.agir(accuse, { type: 'voter', target: null });
    const pas = partie.agir(alternative, { type: 'voter', target: null }); // dernier électeur

    // 3 voix contre 2 — sans la pondération, c’était 2 partout et personne.
    expect(pas.events).toContainEqual({
      type: 'vote',
      tally: { [alternative]: 3, [accuse]: 2 },
      executed: alternative,
    });
    expect(pas.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: alternative, cause: 'vote', role: 'villageois' }],
    });

    // La même tablée sans capitaine, les mêmes suffrages : l’égalité 2–2
    // n’exécute personne (R61). La double voix était bien ce qui tranchait.
    const temoin = new Partie(6, compose(1, ['voyante', 'sorciere']), 1);
    temoin.cloturer();
    temoin.cloturer();
    temoin.cloturer(); // aube paisible, jour 1 sans élection
    temoin.agir(capitaine, { type: 'voter', target: alternative });
    temoin.agir(siege(temoin.state, 'voyante'), { type: 'voter', target: alternative });
    temoin.agir(siege(temoin.state, 'sorciere'), { type: 'voter', target: accuse });
    temoin.agir(sieges(temoin.state, 'loup')[0]!, { type: 'voter', target: accuse });
    temoin.agir(accuse, { type: 'voter', target: null });
    const contre = temoin.agir(alternative, { type: 'voter', target: null });
    expect(contre.events).toContainEqual({
      type: 'vote',
      tally: { [alternative]: 2, [accuse]: 2 },
      executed: null,
    });
    expect(contre.events.some((evenement) => evenement.type === 'morts')).toBe(false);
  });

  it('R57 — à l’élection, chaque voix pèse une : pas de pondération avant la charge', () => {
    // L’élection n’a qu’une vie (R56) : le jour où quelqu’un pèserait double,
    // il n’est pas encore capitaine. Ce qui se vérifie ici, c’est que le
    // dépouillement de l’élection ne pondère personne — pas même celui que
    // le village s’apprête à coiffer.
    for (let graine = 1; graine <= 12; graine++) {
      const partie = new Partie(
        6,
        compose(1, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
        graine,
      );
      partie.cloturer(); // élection pré-nocturne
      const candidat = cobaye(partie.state, 0);
      const rival = cobaye(partie.state, 1);

      // Le candidat se vote lui-même — permis à l’élection —, un ami le suit.
      partie.agir(candidat, { type: 'voter', target: candidat });
      partie.agir(cobaye(partie.state, 2), { type: 'voter', target: candidat });
      // Trois voix pour le rival, qui s’abstient sagement.
      partie.agir(siege(partie.state, 'voyante'), { type: 'voter', target: rival });
      partie.agir(siege(partie.state, 'sorciere'), { type: 'voter', target: rival });
      partie.agir(rival, { type: 'voter', target: null });
      const pas = partie.agir(sieges(partie.state, 'loup')[0]!, { type: 'voter', target: rival });

      // 3 voix contre 2 : le rival est élu, quelle que soit la graine. Si la
      // voix du candidat avait compté double — comme elle le fera demain au
      // village — l’égalité 3–3 serait repartie au sort, et une graine aurait
      // fini par le coiffer : aucune ne le fait.
      expect(partie.state.captain).toBe(rival);
      expect(pas.events).toContainEqual({ type: 'capitaine', seat: rival, from: null });
    }
  });
});

/* ------------------------------------------------------------------ */
/* R55/R56 — l’élection du capitaine                                    */
/* ------------------------------------------------------------------ */

describe('l’élection du capitaine', () => {
  it('R55/R56 — le matin du jour 1, la majorité désigne le capitaine', () => {
    // Défaut de la table : capitaine élu au matin du jour 1, après l’aube.
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere'], { capitaine: true }), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // aube paisible
    expect(partie.state.phase).toEqual({ kind: 'election', votes: {} });
    expect(partie.state.day).toBe(1); // l’élection tient au matin du jour 1 (R55)
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(ELECTION_MS); // 90 s (R82)

    // L’élection appartient à tous les vivants — l’Idiot gracié excepté, mais
    // il n’en est pas encore question à l’aube du premier jour.
    expect(pendingActors(partie.state)).toEqual(livingSeats(partie.state));

    const elu = cobaye(partie.state, 0);
    let pas: Step | undefined;
    for (let siege = 0; siege < 8; siege++) {
      pas = partie.agir(siege, { type: 'voter', target: siege === elu ? null : elu });
    }
    expect(pas!.events).toContainEqual({ type: 'capitaine', seat: elu, from: null });
    expect(partie.state.captain).toBe(elu);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'capitaine', seat: elu });
    // La charge attribuée, la journée du vote commence — le compteur n’a pas bougé.
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(1);
  });

  it('R56 — une égalité à l’élection se tranche au sort parmi les ex æquo', () => {
    // Deux candidats à deux voix chacun : le sort départage — et la même
    // graine départage pareil (R86), quand les autres varient.
    const tirage = (graine: number): 'gauche' | 'droite' => {
      const partie = new Partie(
        6,
        compose(1, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
        graine,
      );
      partie.cloturer(); // élection pré-nocturne
      const gauche = cobaye(partie.state, 0);
      const droite = cobaye(partie.state, 1);
      partie.agir(cobaye(partie.state, 2), { type: 'voter', target: gauche });
      partie.agir(siege(partie.state, 'voyante'), { type: 'voter', target: gauche });
      partie.agir(siege(partie.state, 'sorciere'), { type: 'voter', target: droite });
      partie.agir(gauche, { type: 'voter', target: null });
      partie.agir(droite, { type: 'voter', target: null });
      const pas = partie.agir(sieges(partie.state, 'loup')[0]!, { type: 'voter', target: droite });

      expect(partie.state.captain).not.toBeNull(); // l’égalité ne renvoie pas le village sans chef
      expect(pas.events).toContainEqual({
        type: 'capitaine',
        seat: partie.state.captain,
        from: null,
      });
      return partie.state.captain === gauche ? 'gauche' : 'droite';
    };

    expect(tirage(7)).toBe(tirage(7)); // même graine, même élu
    const sorts = new Set<string>();
    for (let graine = 1; graine <= 16; graine++) sorts.add(tirage(graine));
    expect(sorts).toEqual(new Set(['gauche', 'droite'])); // le sort varie
  });

  it('R56 — aucune voix : pas de capitaine, et l’élection ne revient pas', () => {
    const partie = new Partie(
      6,
      compose(1, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
      1,
    );
    partie.cloturer(); // élection pré-nocturne
    let pas: Step | undefined;
    for (const siege of livingSeats(partie.state)) {
      pas = partie.agir(siege, { type: 'voter', target: null });
    }
    // Un village muet n’élit personne : pas d’événement, pas de capitaine.
    expect(pas!.events.some((evenement) => evenement.type === 'capitaine')).toBe(false);
    expect(partie.state.captain).toBeNull();
    expect(partie.state.electionHeld).toBe(true);
    // …et la nuit tombe quand même.
    expect(partie.state.phase.kind).toBe('nuit');

    // L’élection n’a qu’une vie (R56) : au matin du jour 1 — le seul autre
    // moment où le moteur la proposerait — elle ne se tient plus.
    nuitSilencieuse(partie);
    expect(partie.state.phase.kind).toBe('jour'); // pas de seconde chance
    expect(partie.state.captain).toBeNull();
    partie.abstenir(); // jour 1 sans exécution
    nuitSilencieuse(partie); // nuit 2 paisible
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(2);
    expect(partie.state.electionHeld).toBe(true); // le drapeau tient toujours
  });
});

/* ------------------------------------------------------------------ */
/* R58 — la succession                                                  */
/* ------------------------------------------------------------------ */

describe('la succession du capitaine', () => {
  it('R58 — le capitaine mort désigne son successeur, la table sait d’où ça vient', () => {
    const partie = new Partie(
      8,
      compose(2, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
      1,
    );
    partie.cloturer(); // élection pré-nocturne
    const capitaine = cobaye(partie.state, 0);
    for (let siege = 0; siege < 8; siege++) {
      partie.agir(siege, { type: 'voter', target: siege === capitaine ? null : capitaine });
    }
    // nuit 1 : la meute emporte le capitaine fraîchement élu
    const [loupA, loupB] = sieges(partie.state, 'loup');
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
    partie.agir(loupA!, { type: 'devorer', target: capitaine });
    partie.agir(loupB!, { type: 'devorer', target: capitaine });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });

    // L’aube a emporté le capitaine : sa succession s’ouvre (R49), c’est à lui
    // de désigner — mort, il agit encore une fois.
    expect(partie.state.phase).toEqual({ kind: 'succession', seat: capitaine });
    expect(pendingActors(partie.state)).toEqual([capitaine]);

    // Un successeur se doit vivant : le mort n’hérite pas de lui-même.
    const erreur = refuser(partie.state, capitaine, { type: 'successeur', target: capitaine });
    expect(erreur.code).toBe('target');

    const successeur = cobaye(partie.state, 1);
    const heritage = partie.agir(capitaine, { type: 'successeur', target: successeur });
    expect(heritage.events).toContainEqual({ type: 'capitaine', seat: successeur, from: capitaine });
    expect(partie.state.captain).toBe(successeur);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'capitaine', seat: successeur });
    // La succession réglée, la journée reprend son cours.
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(1);
  });

  it('R58 — au temps écoulé, le successeur est pris au sort parmi les vivants', () => {
    const heritageAuSort = (graine: number): { mort: number; heritier: number } => {
      const partie = new Partie(
        8,
        compose(2, ['voyante', 'sorciere'], { capitaine: true, capitaineAvantNuit1: true }),
        graine,
      );
      partie.cloturer(); // élection pré-nocturne
      const capitaine = cobaye(partie.state, 0);
      for (let siege = 0; siege < 8; siege++) {
        partie.agir(siege, { type: 'voter', target: siege === capitaine ? null : capitaine });
      }
      const [loupA, loupB] = sieges(partie.state, 'loup');
      partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 1) });
      partie.agir(loupA!, { type: 'devorer', target: capitaine });
      partie.agir(loupB!, { type: 'devorer', target: capitaine });
      partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
      expect(partie.state.phase).toEqual({ kind: 'succession', seat: capitaine });
      expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(TRIGGER_MS); // 30 s (R82)

      // Trente secondes passées sans désignation : le sort choisit un vivant.
      const pas = partie.cloturer();
      const heritier = partie.state.captain;
      expect(heritier).not.toBeNull();
      expect(heritier).not.toBe(capitaine); // le mort n’hérite pas
      expect(isAlive(partie.state, heritier!)).toBe(true);
      expect(pas.events).toContainEqual({ type: 'capitaine', seat: heritier, from: capitaine });
      return { mort: capitaine, heritier: heritier! };
    };

    // La même graine tire le même héritier (R86)…
    expect(heritageAuSort(7).heritier).toBe(heritageAuSort(7).heritier);
    // …et le sort ne tombe pas toujours sur la même tête.
    const heritiers = new Set<number>();
    for (let graine = 1; graine <= 12; graine++) heritiers.add(heritageAuSort(graine).heritier);
    expect(heritiers.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* R65 à R67 — le tir du Chasseur                                       */
/* ------------------------------------------------------------------ */

/** Un Chasseur mort sous la dent des loups : sa phase s’ouvre, l’arme chargée. */
function chasseurMort(graine = 1): { partie: Partie; chasseur: number } {
  const partie = new Partie(8, compose(2, ['chasseur', 'voyante', 'sorciere']), graine);
  partie.cloturer(); // nuit 1
  const chasseur = siege(partie.state, 'chasseur');
  partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 0) });
  const [loupA, loupB] = sieges(partie.state, 'loup');
  partie.agir(loupA!, { type: 'devorer', target: chasseur });
  partie.agir(loupB!, { type: 'devorer', target: chasseur });
  partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
  expect(partie.state.phase).toEqual({ kind: 'chasseur', seat: chasseur });
  // Ouvrir sa phase le désigne à toute la table (R46) — même sans revelerRoles.
  expect(partie.state.players[chasseur]!.revealed).toBe(true);
  return { partie, chasseur };
}

describe('le tir du Chasseur', () => {
  it('R65 — tirer en l’air ne tue que le tireur, déjà mort', () => {
    const { partie, chasseur } = chasseurMort();
    const vivantsAvant = livingSeats(partie.state);

    const pas = partie.agir(chasseur, { type: 'tirer', target: null });
    expect(pas.events).toContainEqual({ type: 'tir', hunter: chasseur, target: null });
    // La balle s’est perdue dans le ciel : pas d’autre mort que la sienne.
    expect(pas.events.some((evenement) => evenement.type === 'morts')).toBe(false);
    expect(livingSeats(partie.state)).toEqual(vivantsAvant);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'tir', target: null });
    // Le coup parti, la journée du vote commence.
    expect(partie.state.phase.kind).toBe('jour');
    expect(partie.state.day).toBe(1);
  });

  it('R65/R67 — le tir abat sa cible, cause chasseur', () => {
    const { partie, chasseur } = chasseurMort();
    const cible = cobaye(partie.state, 0);

    const pas = partie.agir(chasseur, { type: 'tirer', target: cible });
    expect(pas.events).toContainEqual({ type: 'tir', hunter: chasseur, target: cible });
    expect(pas.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: cible, cause: 'chasseur', role: 'villageois' }],
    });
    expect(partie.state.players[cible]!.alive).toBe(false);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'mort', seat: cible, cause: 'chasseur' });
    expect(partie.state.phase.kind).toBe('jour');
  });

  it('R65 — pas de tir sur soi-même', () => {
    const { partie, chasseur } = chasseurMort();
    // Le moteur refuse le suicide d’un « Pas sur vous-même » — et ici le
    // tireur est déjà mort : le refus tombe deux fois, même code.
    const erreur = refuser(partie.state, chasseur, { type: 'tirer', target: chasseur });
    expect(erreur.code).toBe('target');
  });

  it('R67 — un tir peut en provoquer un autre : la chaîne', () => {
    const { partie, chasseur } = chasseurMort();
    // R4 n’autorise qu’un Chasseur par composition : la chaîne de R67 ne peut
    // naître d’aucune distribution légale. On fabrique donc la situation —
    // comme les morts à la première nuit — le moteur doit tenir la chaîne
    // quoi qu’en dise la distribution, la règle l’exige pour n’importe quelle
    // victime d’un tir.
    const victime = cobaye(partie.state, 0);
    const fabrique = structuredClone(partie.state);
    fabrique.players[victime]!.role = 'chasseur';
    partie.state = fabrique;

    // Le premier Chasseur abat la seconde : la victime, Chasseur à son
    // tour, laisse son propre déclencheur — la chaîne s’enclenche.
    const premier = partie.agir(chasseur, { type: 'tirer', target: victime });
    expect(premier.events).toContainEqual({
      type: 'morts',
      deaths: [{ seat: victime, cause: 'chasseur', role: 'chasseur' }],
    });
    expect(partie.state.phase).toEqual({ kind: 'chasseur', seat: victime });

    // La victime vide son fusil à son tour : la chaîne s’arrête enfin.
    const temoin = cobaye(partie.state, 1);
    const second = partie.agir(victime, { type: 'tirer', target: temoin });
    expect(second.events).toContainEqual({ type: 'tir', hunter: victime, target: temoin });
    expect(partie.state.players[temoin]!.alive).toBe(false);
    expect(partie.state.phase.kind).toBe('jour'); // déclencheurs vidés : la journée reprend
  });

  it('R66 — au temps écoulé, la balle est perdue', () => {
    const { partie, chasseur } = chasseurMort();
    // Sa phase dure trente secondes, pas une de plus (R66/R82).
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(TRIGGER_MS);
    expect(TRIGGER_MS).toBe(30_000);

    // Le temps passe sans tir : même coup parti dans le ciel que le tir en
    // l’air — mêmes évènements, même silence autour de la table.
    const pas = partie.cloturer();
    expect(pas.events).toContainEqual({ type: 'tir', hunter: chasseur, target: null });
    expect(pas.events.some((evenement) => evenement.type === 'morts')).toBe(false);
    expect(partie.state.log).toContainEqual({ day: 1, type: 'tir', target: null });
    expect(partie.state.phase.kind).toBe('jour');
  });
});

/* ------------------------------------------------------------------ */
/* R78 — le fil de discussion                                           */
/* ------------------------------------------------------------------ */

describe('le fil de discussion', () => {
  /** Un jour 1 paisible : le village a la parole (R76). */
  function matinBavard(): { partie: Partie; orateur: number } {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    return { partie, orateur: cobaye(partie.state, 0) };
  }

  it('R78 — les espaces se resserrent, le vide se refuse', () => {
    const { partie, orateur } = matinBavard();
    partie.agir(orateur, { type: 'dire', channel: 'village', text: '  Bien\tle\nbonjour.  ' });
    // Tabulations, retours à la ligne, doublons, rives : tout se resserre.
    expect(partie.state.chat).toEqual([
      { id: 1, channel: 'village', seat: orateur, text: 'Bien le bonjour.', day: 1 },
    ]);
    // Un message d’espaces n’en est pas un : le moteur le refuse.
    const erreur = refuser(partie.state, orateur, { type: 'dire', channel: 'village', text: '   ' });
    expect(erreur.code).toBe('empty');
  });

  it('R78 — deux cent quatre-vingts signes passent, le surplus se taille', () => {
    const { partie, orateur } = matinBavard();
    expect(MAX_MESSAGE_LENGTH).toBe(280);
    // La limite exacte passe tout entière.
    const limites = 'a'.repeat(MAX_MESSAGE_LENGTH);
    partie.agir(orateur, { type: 'dire', channel: 'village', text: limites });
    expect(partie.state.chat.at(-1)!.text).toBe(limites);
    // Au-delà, le moteur ne refuse pas : il taille à la limite. R78 dit
    // « 280 caractères au plus » — c’est la conduite réelle du moteur, le
    // test la constate.
    const tropLong = 'b'.repeat(MAX_MESSAGE_LENGTH + 40);
    const pas = partie.agir(orateur, { type: 'dire', channel: 'village', text: tropLong });
    expect(pas.state.chat.at(-1)!.text.length).toBe(MAX_MESSAGE_LENGTH);
    expect(pas.state.chat.at(-1)!.text).toBe(tropLong.slice(0, MAX_MESSAGE_LENGTH));
  });

  it('R78 — chaque canal garde ses cent derniers, la numérotation continue', () => {
    const { partie, orateur } = matinBavard();
    // Cent cinq messages : le canal ne grossit pas au-delà de cent.
    for (let i = 1; i <= MAX_CHAT_PER_CHANNEL + 5; i++) {
      partie.agir(orateur, { type: 'dire', channel: 'village', text: `message ${i}` });
    }
    expect(MAX_CHAT_PER_CHANNEL).toBe(100);
    // Cinq canaux depuis la fratrie (R114) — village, loups, amoureux,
    // fratrie, morts — cent messages chacun.
    expect(MAX_CHAT_MESSAGES).toBe(5 * MAX_CHAT_PER_CHANNEL);
    expect(partie.state.chat.length).toBe(MAX_CHAT_PER_CHANNEL);
    // Les plus anciens sont tombés ; les suivants se suivent sans trou.
    expect(partie.state.chat[0]!.id).toBe(6);
    expect(partie.state.chat.at(-1)!.id).toBe(MAX_CHAT_PER_CHANNEL + 5);
    // La chute ne remet pas la numérotation à zéro : le fil continue sa suite.
    const pas = partie.agir(orateur, { type: 'dire', channel: 'village', text: 'et encore.' });
    expect(pas.state.chat.length).toBe(MAX_CHAT_PER_CHANNEL);
    expect(pas.state.chat.at(-1)).toMatchObject({ id: MAX_CHAT_PER_CHANNEL + 6, text: 'et encore.' });
  });

  it('R78 — la borne d’un canal ne dépend que de lui : la meute bavarde n’efface pas le village', () => {
    const { partie, orateur } = matinBavard();
    for (let i = 1; i <= 40; i++) {
      partie.agir(orateur, { type: 'dire', channel: 'village', text: `message ${i}` });
    }
    partie.cloturer(); // le village ne vote pas : la nuit 2 tombe
    const [loup] = sieges(partie.state, 'loup');
    for (let i = 1; i <= MAX_CHAT_PER_CHANNEL * 2; i++) {
      partie.agir(loup!, { type: 'dire', channel: 'loups', text: `grognement ${i}` });
    }
    const ids = (canal: ChatChannel) =>
      partie.state.chat.filter((m) => m.channel === canal).map((m) => m.id);
    const unAQuarante = Array.from({ length: 40 }, (_, i) => i + 1);
    // Deux cents grognements n’ont pas fait tomber un seul message du village :
    // le premier numéro visible au village ne dit rien de la meute.
    expect(ids('village')).toEqual(unAQuarante);
    expect(ids('loups')).toHaveLength(MAX_CHAT_PER_CHANNEL);
    expect(ids('loups')[0]).toBe(MAX_CHAT_PER_CHANNEL + 1);
    expect(viewFor(partie.state, orateur).chat.map((m) => m.id)).toEqual(unAQuarante);
  });

  it('R78 — les messages se suivent par canal, sans rien trahir des autres', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    const [loupA, loupB] = sieges(partie.state, 'loup');
    const devoree = cobaye(partie.state, 2);
    // La meute cause en travaillant (le canal des loups existe toujours, R75).
    partie.agir(loupA!, { type: 'dire', channel: 'loups', text: 'Cette nuit, le troisième siège.' });
    partie.agir(loupB!, { type: 'dire', channel: 'loups', text: 'Bien reçu.' });
    partie.agir(loupA!, { type: 'devorer', target: devoree });
    partie.agir(loupB!, { type: 'devorer', target: devoree });
    partie.agir(siege(partie.state, 'voyante'), { type: 'sonder', target: cobaye(partie.state, 0) });
    partie.agir(siege(partie.state, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // Jour 1 : le village cause, la dévorée répond d’en bas.
    partie.agir(cobaye(partie.state, 0), { type: 'dire', channel: 'village', text: 'Bonjour à tous.' });
    partie.agir(cobaye(partie.state, 1), { type: 'dire', channel: 'village', text: 'Salut à tous.' });
    partie.agir(devoree, { type: 'dire', channel: 'morts', text: 'Salut d’en bas.' });

    // Chaque canal compte seul : un, deux — sans trou ni chevauchement,
    // alors que cinq messages sont partis en tout.
    const numeros = (canal: ChatChannel): number[] =>
      partie.state.chat.filter((message) => message.channel === canal).map((message) => message.id);
    expect(numeros('loups')).toEqual([1, 2]);
    expect(numeros('village')).toEqual([1, 2]);
    expect(numeros('morts')).toEqual([1]);

    // La vue d’un villageois ne porte ni les messages de la meute, ni leur
    // numéro, ni le trou qu’une numérotation globale laisserait (R78).
    const vue = viewFor(partie.state, cobaye(partie.state, 0));
    expect(vue.chat.map((message) => message.id)).toEqual([1, 2]);
    // Le loup vivant, lui, lit les deux canaux qui lui sont ouverts.
    const vueLoup = viewFor(partie.state, loupA!);
    expect(vueLoup.chat.map((message) => [message.channel, message.id])).toEqual([
      ['loups', 1],
      ['loups', 2],
      ['village', 1],
      ['village', 2],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* R80/R81/R82 — le temps du jour                                       */
/* ------------------------------------------------------------------ */

describe('le temps du jour', () => {
  it('R81 — un village silencieux jusqu’au temps écoulé n’exécute personne', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    // La minuterie du jour porte la durée choisie par la table (R82).
    expect(phaseBudgetMs(partie.state, createSeededRng(1))).toBe(partie.state.options.tempsJour * 1000);

    // Personne n’a voté, le temps du débat s’est consumé : qui n’a pas agi
    // n’agit pas — le village n’exécute personne (R81).
    const pas = partie.cloturer();
    expect(pas.events).toContainEqual({ type: 'vote', tally: {}, executed: null });
    expect(pas.events.some((evenement) => evenement.type === 'morts')).toBe(false);
    expect(livingSeats(partie.state).length).toBe(8);
    // Le silence ne retarde pas le soir : la nuit tombe, le compteur avance.
    expect(partie.state.phase.kind).toBe('nuit');
    expect(partie.state.day).toBe(2);
  });

  it('R80 — une minuterie périmée ne clôt rien, même côté jour', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    const seq = partie.state.phaseSeq;

    // Une minuterie en retard — la phase a déjà changé, ou une autre
    // minuterie l’a clôturée — ne doit rien clôturer du tout (R80). Ni
    // avant, ni après : seul le numéro exact de la phase armée parle.
    expect(refuserDelai(partie.state, seq - 1).code).toBe('stale');
    expect(refuserDelai(partie.state, seq + 1).code).toBe('stale');

    // L’état n’a pas bougé d’un poil, et la bonne minuterie clôt toujours.
    expect(partie.state.phase.kind).toBe('jour');
    const pas = partie.cloturer();
    expect(pas.events).toContainEqual({ type: 'vote', tally: {}, executed: null });
    expect(partie.state.phase.kind).toBe('nuit');
  });
});

/* ------------------------------------------------------------------ */
/* R85/R86 — pureté et déterminisme du jour                             */
/* ------------------------------------------------------------------ */

describe('la pureté et le déterminisme du jour', () => {
  it('R85 — voter ni clôturer ne touchent l’état reçu', () => {
    const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), 1);
    partie.cloturer(); // nuit 1
    nuitSilencieuse(partie); // jour 1
    const electeur = cobaye(partie.state, 0);
    const accuse = cobaye(partie.state, 1);

    // Une action : l’état reçu reste intact, le pas rend un clone modifié.
    const original = partie.state;
    const avant = structuredClone(original);
    const pas = applyAction(original, { type: 'voter', target: accuse }, createSeededRng(2), electeur);
    expect(original).toEqual(avant);
    expect(pas.state).not.toBe(original);
    expect(pas.state.phase).toMatchObject({ kind: 'jour', votes: { [electeur]: accuse } });
    expect(original.phase).toEqual({ kind: 'jour', votes: {} });

    // Une clôture : même exigence — le dépouillement n’écrit pas sur place.
    const avantCloture = structuredClone(pas.state);
    const cloture = timeoutPhase(pas.state, createSeededRng(3), pas.state.phaseSeq);
    expect(pas.state).toEqual(avantCloture);
    expect(cloture.state).not.toBe(pas.state);
  });

  it('R86 — la même graine rejoue le même jour, vote pour vote', () => {
    const journee = (graine: number): GameState => {
      const partie = new Partie(8, compose(2, ['voyante', 'sorciere']), graine);
      partie.cloturer(); // nuit 1
      nuitSilencieuse(partie); // jour 1
      executer(partie, cobaye(partie.state, 0)); // le village condamne un innocent
      nuitSilencieuse(partie); // nuit 2 paisible → jour 2
      partie.abstenir(); // jour 2 : le village se tait, le soir tombe
      return partie.state;
    };

    const premiere = journee(2026);
    expect(premiere.players[cobaye(premiere, 0)]!.alive).toBe(false); // le condamné y est bien
    expect(premiere.phase).toMatchObject({ kind: 'nuit' });
    expect(premiere.day).toBe(3);
    // R86 : deux fois la même graine, deux fois la même journée — au mot près.
    expect(journee(2026)).toEqual(premiere);
  });
});
