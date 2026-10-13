/**
 * Les rôles de la v3 face au hasard — R87, R88 et R104 sur des milliers de
 * parties, vagues 1 et 2 comprises.
 *
 * Le même banc que la v2 (`roles-v2-simulation.test.ts`), la table en plus
 * large : le Villageois-Villageois, le Renard et le Montreur d'Ours, puis le
 * Voleur, le Chien-Loup, l'Enfant Sauvage, les Deux Sœurs et les Trois
 * Frères se croisent avec l'Ancien, le Corbeau, le Bouc émissaire, la
 * Petite Fille et le Loup Blanc à toutes les tailles. Un joueur aléatoire,
 * qui ne voit que sa `GameView` comme n'importe quel client, y joue des
 * parties dont chaque pas est vérifié :
 *
 * - **le silence** (R88) : chaque rôle qu'un siège voit a une raison d'être
 *   vu — et le Villageois-Villageois ne s'y montre jamais que « villageois »,
 *   porteur compris ; le carnet du Renard n'est qu'à lui ; la grogne de
 *   l'ourson ne dit que ce qu'elle doit (R87) ; le talon du Voleur n'est
 *   qu'à lui, le modèle de l'Enfant n'est à personne, et les fratries ne se
 *   montrent qu'à leurs sièges (R110, R112, R113) ;
 * - **la fin** : aucune partie ne boucle, et la reprise d'un magasin — l'état
 *   sérialisé puis relu à chaque pas — rejoue la partie continue à l'identique
 *   (R104).
 */

import { describe, expect, it } from 'vitest';

import { applyAction, createGame, pendingActors, timeoutPhase, voisinsDe } from './game.js';
import { compositionFor, DEFAULT_OPTIONS, MIN_PLAYERS, randomComposition } from './options.js';
import { createSeededRng } from './rng.js';
import {
  campEffectif,
  campOf,
  cartePublique,
  fratrieDe,
  IllegalActionError,
  OPTIONAL_ROLES,
  OPTIONAL_ROLES_V3,
  type Action,
  type GameEvent,
  type GameOptions,
  type GameState,
  type Rng,
  type Winner,
} from './types.js';
import { viewFor, type GameView } from './views.js';

/* ------------------------------------------------------------------ */
/* Une table tirée au sort, vagues 1 et 2 comprises                    */
/* ------------------------------------------------------------------ */

/**
 * Une table de la v3 : la v2 en tout point — options au hasard, composition
 * du générateur avec les optionnels (R100) — plus chaque rôle des deux
 * vagues, retenu une fois sur deux quand R13 le permet (D26 : la v3 ne sort
 * jamais du générateur, même ici).
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
  for (const role of OPTIONAL_ROLES_V3) {
    if (retenus.includes(role) || oui()) continue;
    try {
      compositionFor(joueurs, { ...base, auto: false, loups, roles: [...retenus, role] });
      retenus.push(role);
    } catch {
      // Injouable à cette table (R13) : à six, une carte de plus est une
      // carte de trop.
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
    case 'flairer':
      // Le centre du trio : n'importe quel vivant, le Renard compris (D29) —
      // ou personne, l'abstention ne coûte rien (R107).
      return { type: 'flairer', centre: parfois(4) ? null : pioche(vivants, rng) };
    case 'trahir': {
      const meute = new Set(vue.pack?.seats ?? []);
      return { type: 'trahir', target: parfois(3) ? null : pioche(autres.filter((s) => meute.has(s)), rng) };
    }
    case 'designerVotants': {
      const choisis = vivants.filter(() => parfois(2));
      const seats = choisis.length > 0 ? choisis : [vivants[0]!];
      return { type: 'designerVotants', seats };
    }
    // Le talon du Voleur : une carte au hasard — ou rien, quand la règle le
    // permet ; deux loups face à face, il faut en prendre un (R110).
    case 'voler': {
      const carte = rng.nextInt(2) as 0 | 1;
      return { type: 'voler', carte: prompt.obligatoire ? carte : parfois(4) ? null : carte };
    }
    // Le Chien-Loup se range au hasard — les deux camps se valent, au banc
    // (R111).
    case 'seRanger':
      return { type: 'seRanger', camp: rng.nextInt(2) === 0 ? 'village' : 'loups' };
    // Le modèle de l'Enfant : n'importe quel vivant, lui compris (R112).
    case 'designerModele': {
      const t = pioche(vivants, rng);
      return t === null ? null : { type: 'designerModele', target: t };
    }
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
      // La meute chasse au camp effectif (R109) : le Chien-Loup rangé chez
      // les loups y rejoint la curée — l'Enfant transformé attend son
      // réveil (D33).
      return (
        campEffectif(joueur) === 'loups' &&
        state.enfantReveil !== seat &&
        phase.kind === 'nuit' &&
        phase.step === 'principale'
      );
    case 'trahir':
      return joueur.role === 'loupBlanc' && phase.kind === 'nuit' && phase.step === 'loupBlanc';
    case 'marquer':
      return joueur.role === 'corbeau' && !state.pouvoirsPerdus;
    case 'flairer':
      // Le Renard, son flair intact : un faux triple l'éteint, la rancune
      // aussi (R107, R92).
      return joueur.role === 'renard' && state.renardPouvoir === true && !state.pouvoirsPerdus;
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
    case 'voler':
      // Le talon ne se montre qu'au Voleur, avant la révélation (R110).
      return phase.kind === 'voleur' && phase.seat === seat && joueur.role === 'voleur';
    case 'seRanger':
      // Le Chien-Loup, la première nuit — pas un pouvoir du village, la
      // rancune n'y peut rien (R111).
      return (
        joueur.role === 'chienLoup' &&
        state.day === 1 &&
        phase.kind === 'nuit' &&
        phase.step === 'principale'
      );
    case 'designerModele':
      // L'Enfant Sauvage, la première nuit — le modèle n'en sait rien (R112).
      return (
        joueur.role === 'enfantSauvage' &&
        state.day === 1 &&
        phase.kind === 'nuit' &&
        phase.step === 'principale'
      );
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
      // Un spectateur ne voit rien — sauf la partie finie, où plus rien
      // n'est caché (R77).
      expect(vue.renardSavoirs).toEqual(state.over ? state.renardSavoirs : []);
      // Aucune fratrie pour qui n'y siège pas — sauf la partie finie, où
      // plus rien n'est caché (R77, R113).
      expect(vue.fratrie).toEqual(
        state.over ? [...(state.fratries ?? []).flatMap((groupe) => groupe.sieges)].sort((a, b) => a - b) : [],
      );
      continue;
    }
    const moi = state.players[seat]!;
    const omniscient = state.over || (!moi.alive && state.options.mortsVoientTout);
    // Avant la révélation — la phase du Voleur, seule à venir avant elle
    // (R110) — aucune carte n'est retournée : rôle tu, meute et fratrie
    // closes (D46).
    const avantRevelation = state.phase.kind === 'voleur';
    // La meute au camp effectif (R109) — l'Enfant transformé attend son
    // réveil (D33).
    const loupVivant = moi.alive && campEffectif(moi) === 'loups' && state.enfantReveil !== seat;
    // Sa propre carte se lit comme celle des autres : le porteur du
    // Villageois-Villageois croit être un villageois — la fin seule détrompe
    // (R106, D31).
    expect(vue.you!.role).toBe(
      avantRevelation ? null : state.over ? moi.role : cartePublique(moi.role),
    );
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
      // Des nombres de voix par cible — jamais une cible de la meute, au
      // camp effectif compris (R109).
      for (const cible of Object.keys(vue.espionnage).map(Number)) {
        expect(campEffectif(state.players[cible]!)).toBe('village');
      }
    }
    // Le carnet du Renard, comme les sondages de la Voyante : à lui seul —
    // et à qui voit tout (R107).
    expect(vue.renardSavoirs).toEqual(omniscient || moi.role === 'renard' ? state.renardSavoirs : []);
    // Sa fratrie, s'il en a une : les sièges de son groupe, une connaissance
    // que la mort ne reprend pas ; à qui voit tout, tous les groupes (R113) —
    // et qui ne naît qu'à la révélation (D46).
    if (omniscient) {
      expect(vue.fratrie).toEqual(
        [...(state.fratries ?? []).flatMap((groupe) => groupe.sieges)].sort((a, b) => a - b),
      );
    } else {
      expect(vue.fratrie).toEqual(avantRevelation ? [] : (fratrieDe(state, seat)?.sieges ?? []));
    }
    if (omniscient) continue;
    expect(vue.pack !== null).toBe(loupVivant && !avantRevelation);
    const sondes = new Map(
      moi.role === 'voyante' ? state.inspections.map((i) => [i.target, i.role] as const) : [],
    );
    for (const autre of vue.players) {
      if (autre.seat === seat || autre.role === null) continue;
      const vrai = state.players[autre.seat]!;
      if (vrai.revealed || (!vrai.alive && state.options.revelerRoles)) {
        // Toute carte retournée se lit « villageois » si c'est un
        // Villageois-Villageois : la fin seule dit villageois2 (R106, D31).
        expect(autre.role).toBe(cartePublique(vrai.role));
      } else if (loupVivant && campEffectif(vrai) === 'loups' && state.enfantReveil !== vrai.seat) {
        // La meute se reconnaît — le Loup Blanc passe pour un loup (R96), le
        // Chien-Loup rangé aussi, et l'Enfant transformé dès son réveil
        // (R109, D33) ; avant le réveil, la meute ne le voit pas.
        expect(autre.role).toBe('loup');
      } else if (sondes.has(autre.seat)) {
        // Le carnet de la Voyance, masqué comme la carte (R106, D31).
        expect(autre.role).toBe(cartePublique(sondes.get(autre.seat)!));
      } else {
        throw new Error(`Le siège ${String(seat)} voit le rôle du siège ${String(autre.seat)} sans raison`);
      }
    }
  }
  expect(publiques.size).toBe(1);
  return vues.length;
}

/** Aucun évènement ne porte un secret (R87) — et la grogne ne dit que sa règle (R108). */
function verifierLesEvenements(state: GameState, evenements: GameEvent[]): void {
  for (const e of evenements) {
    switch (e.type) {
      case 'corbeau':
        expect(Object.keys(e).sort()).toEqual(['target', 'type']);
        break;
      case 'ours': {
        expect(Object.keys(e).sort()).toEqual(['grogne', 'seat', 'type']);
        // Un Montreur d'Ours vivant — sa mort est publique, sa grogne ne
        // survit pas (R108).
        const joueur = state.players[e.seat]!;
        expect(joueur.role).toBe('ours');
        expect(joueur.alive).toBe(true);
        // La grogne se relit depuis l'état : un loup voisin vivant, rien
        // d'autre (R105, R108).
        const [droite, gauche] = voisinsDe(state, e.seat);
        expect(e.grogne).toBe(
          [droite, gauche].some(
            (voisin) => state.players[voisin]!.alive && campOf(state.players[voisin]!.role) === 'loups',
          ),
        );
        break;
      }
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
        // Le rôle d'un mort se lit comme sa carte : jamais villageois2
        // avant la fin (R106, D31).
        for (const mort of e.deaths) {
          const vrai = state.players[mort.seat]!;
          if (!state.options.revelerRoles) expect(mort.role).toBeNull();
          else expect(mort.role).toBe(cartePublique(vrai.role));
        }
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
  /** Les grognes d'ourson entendues sur la partie, vraies ou fausses. */
  grognements: number;
  /** Les trios flairés, sagaces ou non. */
  savoirs: number;
  /** Les moments où la vague 2 a joué : vols, rangements, modèles, transformations, fratries distribuées. */
  vague2: { voleur: number; chienLoup: number; modele: number; transformation: number; fratrie: number };
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
  let grognements = 0;
  const suivre = (evenements: GameEvent[]) => {
    if (verifier) verifierLesEvenements(state, evenements);
    grognements += evenements.filter((e) => e.type === 'ours').length;
    reglage.trace?.push(JSON.stringify({ state, evenements }));
  };
  suivre(debut.events);

  for (let pas = 0; pas < PAS_MAX; pas += 1) {
    // Le serveur range l'état, s'arrête, le relit : rien ne doit changer.
    if (reglage.reprise) state = JSON.parse(JSON.stringify(state)) as GameState;
    if (verifier) vuesVerifiees += verifierLeSilence(state);
    if (state.over) {
      return {
        winner: state.winner,
        jours: state.day,
        vuesVerifiees,
        grognements,
        savoirs: state.renardSavoirs.length,
        vague2: {
          voleur: state.log.filter((l) => l.type === 'voleur').length,
          chienLoup: state.log.filter((l) => l.type === 'chienLoup').length,
          modele: state.log.filter((l) => l.type === 'modele').length,
          transformation: state.log.filter((l) => l.type === 'transformation').length,
          fratrie: (state.fratries ?? []).length,
        },
      };
    }
    let joue = false;
    for (const seat of pendingActors(state)) {
      const action = coupAuHasard(viewFor(state, seat), cerveau);
      if (!action) continue;
      let suite: ReturnType<typeof applyAction>;
      try {
        suite = applyAction(state, action, seat);
      } catch (refus) {
        // La meute ne se mange pas : une proie secrètement de camp loups —
        // l'Enfant Sauvage pas encore réveillé — se refuse au croc sans se
        // désigner davantage (R96, R109, D33). Le joueur l'apprend à sa
        // porte, la partie continue.
        if (!(refus instanceof IllegalActionError) || action.type !== 'devorer' || action.target === null) {
          throw refus;
        }
        continue;
      }
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

describe('R88/R87 — le silence tient avec la v3, vagues 1 et 2', () => {
  it('R88/R106/R107/R110/R112/R113 — chaque rôle vu a sa raison, le carnet reste au Renard, le talon au Voleur, la fratrie aux siens', () => {
    let vues = 0;
    for (let graine = 1; graine <= 120; graine += 1) vues += jouer(graine, true).vuesVerifiees;
    expect(vues).toBeGreaterThan(20_000);
  }, 120_000);
});

describe('R99 — aucune partie ne boucle, vagues 1 et 2 comprises', () => {
  it('R99 — mille cinq cents parties au hasard finissent toutes, et l’ourson a grogné', () => {
    const vainqueurs: Record<string, number> = {};
    let plusLongue = 0;
    let grognements = 0;
    let savoirs = 0;
    const vague2 = { voleur: 0, chienLoup: 0, modele: 0, transformation: 0, fratrie: 0 };
    for (let graine = 1; graine <= 1500; graine += 1) {
      const bilan = jouer(graine, false);
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
      plusLongue = Math.max(plusLongue, bilan.jours);
      grognements += bilan.grognements;
      savoirs += bilan.savoirs;
      vague2.voleur += bilan.vague2.voleur;
      vague2.chienLoup += bilan.vague2.chienLoup;
      vague2.modele += bilan.vague2.modele;
      vague2.transformation += bilan.vague2.transformation;
      vague2.fratrie += bilan.vague2.fratrie;
    }
    expect(vainqueurs.village ?? 0).toBeGreaterThan(0);
    expect(vainqueurs.loups ?? 0).toBeGreaterThan(0);
    // Les deux vagues ont vraiment joué : des grognes se sont entendues, des
    // trios se sont flairés — et la deuxième a volé, rangé, désigné,
    // transformé, réuni des fratries.
    expect(grognements).toBeGreaterThan(0);
    expect(savoirs).toBeGreaterThan(0);
    expect(vague2.voleur).toBeGreaterThan(0);
    expect(vague2.chienLoup).toBeGreaterThan(0);
    expect(vague2.modele).toBeGreaterThan(0);
    expect(vague2.transformation).toBeGreaterThan(0);
    expect(vague2.fratrie).toBeGreaterThan(0);
    console.log(
      `Terminaison v3 : 1500 parties, vainqueurs ${JSON.stringify(vainqueurs)}, la plus longue ${String(plusLongue)} jours, ` +
        `${String(grognements)} grognes d’ourson, ${String(savoirs)} trios flairés, vague 2 : ${JSON.stringify(vague2)}`,
    );
  }, 120_000);
});

describe('R101 — les morts d’abandon ne cassent ni le silence ni la fin', () => {
  it('R101/R88 — avec des partis, chaque vue garde son silence, vagues 1 et 2 comprises', () => {
    let vues = 0;
    for (let graine = 1; graine <= 60; graine += 1) vues += jouer(graine, true, { abandons: true }).vuesVerifiees;
    expect(vues).toBeGreaterThan(2_000);
  }, 120_000);

  it('R101/R99 — cinq cents parties semées de partis finissent toutes', () => {
    const vainqueurs: Record<string, number> = {};
    for (let graine = 1; graine <= 500; graine += 1) {
      const bilan = jouer(graine, false, { abandons: true });
      expect(bilan.winner).not.toBeNull();
      vainqueurs[String(bilan.winner)] = (vainqueurs[String(bilan.winner)] ?? 0) + 1;
    }
    expect(vainqueurs.village ?? 0).toBeGreaterThan(0);
    expect(vainqueurs.loups ?? 0).toBeGreaterThan(0);
  }, 120_000);
});

describe('R104 — l’aléa voyage avec l’état, vagues 1 et 2 comprises', () => {
  it('R104 — cinq cents parties, sérialisées et relues à chaque pas, rejouent exactement la partie continue', () => {
    let pas = 0;
    for (let graine = 1; graine <= 500; graine += 1) {
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
    expect(pas).toBeGreaterThan(20_000);
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
