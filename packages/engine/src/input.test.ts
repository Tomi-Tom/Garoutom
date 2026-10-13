/**
 * Ce qui entre — R102 (les actions) et R103 (le texte), D23.
 *
 * Tout ce qui arrive ici a été écrit par n'importe qui. Les tests portent
 * donc d'abord sur ce qui doit être refusé : pour chaque verbe, chaque
 * champ, la panoplie des formes hostiles — une chaîne, un tableau, un
 * flottant, `NaN`, un négatif, un objet, un champ absent.
 */

import { describe, expect, it } from 'vitest';

import { applyAction, createGame, MAX_CHAT_PER_CHANNEL, MAX_MESSAGE_LENGTH, timeoutPhase } from './game.js';
import { cleanName, cleanText, MAX_NAME_LENGTH, MAX_RAW_TEXT_LENGTH, parseAction } from './input.js';
import { DEFAULT_OPTIONS, MAX_PLAYERS } from './options.js';
import { ACTION_TYPES, IllegalActionError, type Action, type GameState } from './types.js';
import { viewFor } from './views.js';

/** Les formes qu'un siège ne prend jamais. */
const HOSTILES: unknown[] = [
  '1',
  [1],
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -1,
  MAX_PLAYERS,
  2 ** 53,
  {},
  undefined,
  true,
  '',
];

function refuse(raw: unknown, seats?: number): void {
  let erreur: unknown;
  try {
    parseAction(raw, seats);
  } catch (jetee) {
    erreur = jetee;
  }
  expect(erreur, JSON.stringify(raw) ?? String(raw)).toBeInstanceOf(IllegalActionError);
  expect((erreur as IllegalActionError).code).toBe('action');
}

/* ------------------------------------------------------------------ */
/* R102 — parseAction                                                  */
/* ------------------------------------------------------------------ */

describe('R102 — une action se lit selon son verbe', () => {
  it('R102 — ce qui n’est pas un objet, ou pas un verbe, est refusé', () => {
    for (const brut of [null, undefined, 42, 'voter', [], [{ type: 'pret' }], { type: 'coucou' }, { type: 42 }, {}]) {
      refuse(brut);
    }
  });

  it('R102 — chaque verbe du moteur a sa lecture', () => {
    const exemples: Record<Action['type'], Action> = {
      pret: { type: 'pret' },
      cupidon: { type: 'cupidon', a: 0, b: 1 },
      proteger: { type: 'proteger', target: 2 },
      sonder: { type: 'sonder', target: 3 },
      devorer: { type: 'devorer', target: null },
      sorciere: { type: 'sorciere', save: true, kill: 4 },
      tirer: { type: 'tirer', target: 5 },
      successeur: { type: 'successeur', target: 6 },
      voter: { type: 'voter', target: 7 },
      marquer: { type: 'marquer', target: null },
      flairer: { type: 'flairer', centre: 2 },
      trahir: { type: 'trahir', target: 1 },
      designerVotants: { type: 'designerVotants', seats: [2, 0] },
      voler: { type: 'voler', carte: 1 },
      seRanger: { type: 'seRanger', camp: 'loups' },
      designerModele: { type: 'designerModele', target: 4 },
      dire: { type: 'dire', channel: 'village', text: 'Bonsoir.' },
    };
    for (const type of ACTION_TYPES) expect(parseAction(exemples[type])).toEqual(exemples[type]);
  });

  it('R102 — l’objet rendu est reconstruit : aucune clé en trop ne passe', () => {
    const lu = parseAction({ type: 'voter', target: 2, seat: 0, __proto__: { x: 1 }, extra: 'oui' });
    expect(lu).toEqual({ type: 'voter', target: 2 });
    expect(Object.keys(lu)).toEqual(['type', 'target']);
    expect(Object.keys(parseAction({ type: 'pret', a: 1 }))).toEqual(['type']);
  });

  it('R102 — un siège est un entier sûr, borné par la table', () => {
    for (const hostile of HOSTILES) {
      refuse({ type: 'cupidon', a: hostile, b: 1 });
      refuse({ type: 'cupidon', a: 0, b: hostile });
      refuse({ type: 'proteger', target: hostile });
      refuse({ type: 'sonder', target: hostile });
      refuse({ type: 'successeur', target: hostile });
      for (const type of ['devorer', 'tirer', 'voter', 'marquer', 'trahir'] as const) {
        refuse({ type, target: hostile });
      }
      refuse({ type: 'sorciere', save: false, kill: hostile });
      refuse({ type: 'designerVotants', seats: [hostile] });
    }
    // la borne de l'appelant : huit places, le siège 8 n'existe pas
    refuse({ type: 'voter', target: 8 }, 8);
    expect(parseAction({ type: 'voter', target: 7 }, 8)).toEqual({ type: 'voter', target: 7 });
  });

  it('R102 — `null` se dit : un champ absent n’est pas une abstention', () => {
    for (const type of ['devorer', 'tirer', 'voter', 'marquer', 'trahir'] as const) {
      refuse({ type });
      expect(parseAction({ type, target: null })).toEqual({ type, target: null });
    }
    refuse({ type: 'sorciere', save: false });
    // `null` n'est permis que là où le moteur l'entend : pas pour une protection
    refuse({ type: 'proteger', target: null });
    refuse({ type: 'successeur', target: null });
    refuse({ type: 'cupidon', a: null, b: 1 });
  });

  it('R102 — un choix est un booléen, strictement', () => {
    for (const hostile of ['true', 1, 0, null, undefined, [], {}]) {
      refuse({ type: 'sorciere', save: hostile, kill: null });
    }
  });

  it('R102 — les votants du Bouc : une liste de sièges, les doublons fondus', () => {
    expect(parseAction({ type: 'designerVotants', seats: [3, 1, 3] })).toEqual({
      type: 'designerVotants',
      seats: [3, 1],
    });
    // la règle — au moins un vivant — reste à `applyAction` (R94)
    expect(parseAction({ type: 'designerVotants', seats: [] })).toEqual({ type: 'designerVotants', seats: [] });
    for (const hostile of ['tous', 3, null, undefined, {}, [[1]], Array.from({ length: 100 }, () => 0)]) {
      refuse({ type: 'designerVotants', seats: hostile });
    }
  });

  it('R102 — un message : un canal connu, un texte d’au plus deux mille unités', () => {
    for (const canal of ['village', 'loups', 'amoureux', 'fratrie', 'morts']) {
      expect(parseAction({ type: 'dire', channel: canal, text: 'x' })).toMatchObject({ channel: canal });
    }
    for (const hostile of ['Village', 'meute', '', 1, null, undefined, ['village']]) {
      refuse({ type: 'dire', channel: hostile, text: 'x' });
    }
    for (const hostile of [1, null, undefined, ['x'], { toString: 'x' }]) {
      refuse({ type: 'dire', channel: 'village', text: hostile });
    }
    expect(MAX_RAW_TEXT_LENGTH).toBe(2_000);
    expect(parseAction({ type: 'dire', channel: 'village', text: 'a'.repeat(MAX_RAW_TEXT_LENGTH) })).toBeTruthy();
    refuse({ type: 'dire', channel: 'village', text: 'a'.repeat(MAX_RAW_TEXT_LENGTH + 1) });
  });
});

describe('R102 — applyAction relit ce qu’on lui donne', () => {
  function nuitUne(): GameState {
    const debut = createGame({ players: 10, options: { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['cupidon', 'voyante', 'sorciere'], capitaine: false } }, 7).state;
    return timeoutPhase(debut, debut.phaseSeq).state;
  }

  it('R102 — `"1"` n’est pas un siège : Cupidon ne lie pas un joueur à lui-même', () => {
    const state = nuitUne();
    const cupidon = state.players.find((p) => p.role === 'cupidon')!.seat;
    const autre = state.players.find((p) => p.role === 'villageois')!.seat;
    const avant = structuredClone(state);
    for (const action of [
      { type: 'cupidon', a: String(autre), b: autre },
      { type: 'cupidon', a: [autre], b: autre },
      { type: 'cupidon', a: autre + 0.5, b: autre },
    ]) {
      expect(() => applyAction(state, action as unknown as Action, cupidon)).toThrow(IllegalActionError);
    }
    expect(state).toEqual(avant);
  });

  it('R102 — le siège de l’auteur est un entier de la table', () => {
    const state = nuitUne();
    for (const hostile of ['0', 1.5, -1, 99, Number.NaN]) {
      let erreur: unknown;
      try {
        applyAction(state, { type: 'devorer', target: null }, hostile as unknown as number);
      } catch (jetee) {
        erreur = jetee;
      }
      expect(erreur).toBeInstanceOf(IllegalActionError);
      expect((erreur as IllegalActionError).code).toBe('seat');
    }
  });
});

/* ------------------------------------------------------------------ */
/* R103 — le texte                                                     */
/* ------------------------------------------------------------------ */

describe('R103 — le texte se nettoie avant d’être cru', () => {
  it('R103 — les invisibles disparaissent : contrôles, bidi, zéro-largeur, demi-paires', () => {
    const sale =
      'A\u0000\u0007b‮c⁦d⁩e​f‍g﻿h­i\uD800j\u001Bk';
    expect(cleanText(sale, 280)).toBe('Abcdefghijk');
  });

  it('R103 — NFKC, espaces pliés, rives rognées', () => {
    // pleine chasse, ligatures et espaces exotiques se ramènent à l'ordinaire
    expect(cleanText('  Ｔｏｍ  ﬁn\n\t  bis ', 280)).toBe('Tom fin bis');
    // un invisible entre deux espaces ne laisse pas un double espace
    expect(cleanText('a ​ b', 280)).toBe('a b');
  });

  it('R103 — la longueur se compte en points de code, sans couper une paire', () => {
    const loups = '🐺'.repeat(300);
    const taille = cleanText(loups, MAX_MESSAGE_LENGTH);
    expect(Array.from(taille)).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(taille).toBe('🐺'.repeat(MAX_MESSAGE_LENGTH));
  });

  it('R103 — un pseudo : seize points de code, jamais vide', () => {
    expect(MAX_NAME_LENGTH).toBe(16);
    expect(cleanName('  Tom  ')).toBe('Tom');
    expect(cleanName('‮eutsimi‬')).toBe('eutsimi');
    expect(Array.from(cleanName('Ꙩ'.repeat(40)))).toHaveLength(MAX_NAME_LENGTH);
    for (const vide of ['', '   ', '​​', '\u0000\n\t', 42, null, undefined, ['Tom'], 'x'.repeat(MAX_RAW_TEXT_LENGTH + 1)]) {
      let erreur: unknown;
      try {
        cleanName(vide);
      } catch (jetee) {
        erreur = jetee;
      }
      expect(erreur).toBeInstanceOf(IllegalActionError);
      expect((erreur as IllegalActionError).code).toBe('name');
    }
  });

  it('R103 — au chat, un message de contrôles seuls est un message vide', () => {
    const debut = createGame({ players: 8, options: { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'sorciere'], capitaine: false } }, 3).state;
    const nuit = timeoutPhase(debut, debut.phaseSeq).state;
    const loup = nuit.players.find((p) => p.role === 'loup')!.seat;
    let erreur: unknown;
    try {
      applyAction(nuit, { type: 'dire', channel: 'loups', text: '\u0001‮​'.repeat(600) }, loup);
    } catch (jetee) {
      erreur = jetee;
    }
    expect((erreur as IllegalActionError).code).toBe('empty');
  });
});

/* ------------------------------------------------------------------ */
/* D23 — la vue ne peut pas enfler                                     */
/* ------------------------------------------------------------------ */

describe('D23 — un fil hostile n’enfle pas la vue', () => {
  /** Dix-huit joueurs, la partie finie : tout le monde lit tout. */
  function finDePartie(): GameState {
    const debut = createGame({ players: 18, options: { ...DEFAULT_OPTIONS, capitaine: false } }, 11).state;
    return { ...debut, over: true, winner: 'personne', phase: { kind: 'fin' } };
  }

  it('D23 — trois cents messages de caractères de contrôle : moins de 200 Ko par vue', () => {
    let state = finDePartie();
    // À la fin, le village parle : un flot de contrôles, de bidi et de zéro-largeur.
    const poison = 'x' + '\u0001\u001B‮⁦​﻿'.repeat(330);
    for (let i = 0; i < 300; i++) {
      state = applyAction(state, { type: 'dire', channel: 'village', text: poison }, i % 18).state;
    }
    expect(state.chat.length).toBe(MAX_CHAT_PER_CHANNEL);
    for (const seat of [null, ...state.players.map((p) => p.seat)]) {
      const octets = new TextEncoder().encode(JSON.stringify(viewFor(state, seat))).length;
      expect(octets).toBeLessThan(200 * 1024);
    }
  });

  it('D23 — même au pire — cinq canaux pleins de 280 astraux —, la vue tient sous la borne du cadre', () => {
    const state = finDePartie();
    const lourd = '🐺'.repeat(MAX_MESSAGE_LENGTH);
    // Cinq canaux depuis la fratrie (R114) : le pire cas d'un fil enflé en
    // compte un de plus.
    for (const channel of ['village', 'loups', 'amoureux', 'fratrie', 'morts'] as const) {
      for (let i = 0; i < MAX_CHAT_PER_CHANNEL; i++) {
        state.chat.push({ id: i + 1, channel, seat: i % 18, text: lourd, day: 1 });
      }
    }
    // La borne de `decodeServerFrame` se compte en unités UTF-16 du JSON.
    const unites = JSON.stringify({ t: 'ev', e: 'sync', d: { game: viewFor(state, 0) } }).length;
    expect(unites).toBeLessThan(512 * 1024);
  });
});
