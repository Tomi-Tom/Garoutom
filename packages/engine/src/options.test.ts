/**
 * Les options de la table et la composition des rôles.
 *
 * Tout ce qui arrive ici vient du réseau : R10 veut que `sanitizeOptions` ne
 * fasse confiance à rien et rende toujours des options jouables, sans jeter.
 * Les tests portent donc autant sur les valeurs hostiles que sur les valeurs
 * saines — puis sur les compositions que le moteur produit lui-même : la
 * référence (R20), le générateur (R22), les suggestions (R23), et les bornes
 * de jouabilité qui les encadrent toutes (R13).
 */

import { describe, expect, it } from 'vitest';

import {
  DAY_SECONDS,
  DEFAULT_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_SECONDS,
  autoComposition,
  compositionFor,
  randomComposition,
  sanitizeOptions,
  suggestionsFor,
} from './options.js';
import { createSeededRng } from './rng.js';
import { IllegalActionError, SPECIAL_ROLES, type GameOptions, type SpecialRoleId } from './types.js';

/** À combien de joueurs chaque rôle spécial entre en scène (R20). */
const SEUILS: Record<SpecialRoleId, number> = {
  voyante: MIN_PLAYERS,
  sorciere: MIN_PLAYERS,
  chasseur: 8,
  cupidon: 10,
  salvateur: 11,
  idiot: 12,
};

/** Une composition manuelle : `loups` et `roles` font foi, pas `auto`. */
function manuelle(loups: number, roles: SpecialRoleId[]): GameOptions {
  return { ...DEFAULT_OPTIONS, auto: false, loups, roles };
}

describe('ce qui vient du réseau', () => {
  it('R10 — rend les défauts sur n’importe quel déchet, sans jeter', () => {
    for (const déchet of [null, undefined, 42, 'options', [], true, Number.NaN]) {
      expect(sanitizeOptions(déchet)).toEqual(DEFAULT_OPTIONS);
    }
    expect(sanitizeOptions({})).toEqual(DEFAULT_OPTIONS);
  });

  it('R10 — laisse passer ce qui est déjà sain', () => {
    const saines: GameOptions = {
      ...DEFAULT_OPTIONS,
      loups: 3,
      chat: false,
      skin: 'shiganshina',
    };
    expect(sanitizeOptions(saines)).toEqual(saines);
  });

  it('R10 — une valeur qui n’est pas un nombre fini retombe sur le défaut', () => {
    expect(sanitizeOptions({ loups: 'deux' }).loups).toBe(DEFAULT_OPTIONS.loups);
    expect(sanitizeOptions({ loups: Number.NaN }).loups).toBe(DEFAULT_OPTIONS.loups);
    expect(sanitizeOptions({ loups: Number.POSITIVE_INFINITY }).loups).toBe(DEFAULT_OPTIONS.loups);
    expect(sanitizeOptions({ tempsNuit: Number.NaN }).tempsNuit).toBe(DEFAULT_OPTIONS.tempsNuit);
    expect(sanitizeOptions({ tempsJour: Number.POSITIVE_INFINITY }).tempsJour).toBe(
      DEFAULT_OPTIONS.tempsJour,
    );
  });

  it('R10 — une valeur hors borne retombe sur le défaut, sans discussion', () => {
    // Corrigé le 11 octobre : `clampInt` ramenait les valeurs hors borne à la
    // borne la plus proche — 500 s de nuit devenaient 120, 99 loups 8 — au
    // lieu de revenir au défaut que R10 exige. La fonction est devenu
    // `fallbackInt` : la borne ou le défaut, jamais un entre-deux décrété.
    expect(sanitizeOptions({ tempsNuit: 500 }).tempsNuit).toBe(DEFAULT_OPTIONS.tempsNuit);
    expect(sanitizeOptions({ tempsNuit: 1 }).tempsNuit).toBe(DEFAULT_OPTIONS.tempsNuit);
    expect(sanitizeOptions({ tempsJour: 10_000 }).tempsJour).toBe(DEFAULT_OPTIONS.tempsJour);
    expect(sanitizeOptions({ loups: 99 }).loups).toBe(DEFAULT_OPTIONS.loups);
    expect(sanitizeOptions({ loups: 0 }).loups).toBe(DEFAULT_OPTIONS.loups);
  });

  it('R10 — ne garde des rôles que les spécialités connues, sans doublon (R4)', () => {
    expect(sanitizeOptions({ roles: ['idiot', 'voyante', 'idiot', 'dragon', 3] }).roles).toEqual([
      'voyante',
      'idiot',
    ]);
    expect(sanitizeOptions({ roles: 'voyante' }).roles).toEqual(DEFAULT_OPTIONS.roles);
    expect(sanitizeOptions({ roles: [] }).roles).toEqual([]);
  });
});

describe('les minuteries', () => {
  it('R11 — accepte les bornes elles-mêmes, nuit comme jour', () => {
    expect(sanitizeOptions({ tempsNuit: NIGHT_SECONDS.min }).tempsNuit).toBe(NIGHT_SECONDS.min);
    expect(sanitizeOptions({ tempsNuit: NIGHT_SECONDS.max }).tempsNuit).toBe(NIGHT_SECONDS.max);
    expect(sanitizeOptions({ tempsJour: DAY_SECONDS.min }).tempsJour).toBe(DAY_SECONDS.min);
    expect(sanitizeOptions({ tempsJour: DAY_SECONDS.max }).tempsJour).toBe(DAY_SECONDS.max);
  });

  it('R11 — rend toujours une minuterie dans la borne, quoi qu’on lui donne', () => {
    for (const hostile of [-100, 0, 14, 121, 500, 10_000]) {
      const nuit = sanitizeOptions({ tempsNuit: hostile }).tempsNuit;
      expect(nuit).toBeGreaterThanOrEqual(NIGHT_SECONDS.min);
      expect(nuit).toBeLessThanOrEqual(NIGHT_SECONDS.max);
      const jour = sanitizeOptions({ tempsJour: hostile }).tempsJour;
      expect(jour).toBeGreaterThanOrEqual(DAY_SECONDS.min);
      expect(jour).toBeLessThanOrEqual(DAY_SECONDS.max);
    }
  });

  it('R11 — arrondit les secondes cabossées avant de les borner', () => {
    expect(sanitizeOptions({ tempsNuit: 15.7 }).tempsNuit).toBe(16);
    expect(sanitizeOptions({ tempsNuit: 120.4 }).tempsNuit).toBe(120);
  });
});

describe('le skin', () => {
  it('R12 — transporte tout identifiant [a-z0-9-] de 1 à 32 signes, tel quel', () => {
    for (const bon of ['a', '0', 'thiercelieux', 'shiganshina-2026', 'a'.repeat(32)]) {
      expect(sanitizeOptions({ skin: bon }).skin).toBe(bon);
    }
  });

  it('R12 — renvoie le skin par défaut à tout le reste', () => {
    for (const mauvais of ['', 'a'.repeat(33), 'Thiercelieux', 'été', 'a_b', 'a b', 42, null, {}, ['x']]) {
      expect(sanitizeOptions({ skin: mauvais }).skin).toBe(DEFAULT_OPTIONS.skin);
    }
  });
});

describe('les options booléennes', () => {
  const CLÉS = [
    'auto',
    'capitaine',
    'capitaineAvantNuit1',
    'chasseurEmpoisonne',
    'sorciereSeSauve',
    'chat',
    'revelerRoles',
    'mortsVoientTout',
  ] as const;

  it('R14 — true et false passent tels quels, sur chaque option', () => {
    for (const clé of CLÉS) {
      expect(sanitizeOptions({ [clé]: true })[clé]).toBe(true);
      expect(sanitizeOptions({ [clé]: false })[clé]).toBe(false);
    }
  });

  it('R14 — tout ce qui n’est pas un booléen retombe sur le défaut', () => {
    for (const clé of CLÉS) {
      for (const pourri of ['oui', 1, 0, null, undefined, [], Number.NaN]) {
        expect(sanitizeOptions({ [clé]: pourri })[clé]).toBe(DEFAULT_OPTIONS[clé]);
      }
    }
  });
});

describe('la composition de référence', () => {
  it('R20 — deux loups jusqu’à 8 joueurs, trois jusqu’à 12, quatre jusqu’à 16, cinq au-delà', () => {
    const attendus: readonly (readonly [number, number])[] = [
      [6, 2],
      [7, 2],
      [8, 2],
      [9, 3],
      [10, 3],
      [11, 3],
      [12, 3],
      [13, 4],
      [14, 4],
      [15, 4],
      [16, 4],
      [17, 5],
      [18, 5],
    ];
    for (const [players, loups] of attendus) {
      expect(autoComposition(players).loups).toBe(loups);
    }
  });

  it('R20 — la voyante et la sorcière dès la plus petite table', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const roles = autoComposition(players).roles;
      expect(roles).toContain('voyante');
      expect(roles).toContain('sorciere');
    }
  });

  it('R20 — chasseur dès 8, cupidon dès 10, salvateur dès 11, idiot dès 12', () => {
    expect(autoComposition(7).roles).toEqual(['voyante', 'sorciere']);
    expect(autoComposition(8).roles).toEqual(['voyante', 'sorciere', 'chasseur']);
    expect(autoComposition(9).roles).toEqual(['voyante', 'sorciere', 'chasseur']);
    expect(autoComposition(10).roles).toEqual(['voyante', 'sorciere', 'chasseur', 'cupidon']);
    expect(autoComposition(11).roles).toEqual(['voyante', 'sorciere', 'chasseur', 'cupidon', 'salvateur']);
    expect(autoComposition(12).roles).toEqual([...SPECIAL_ROLES]);
    expect(autoComposition(18).roles).toEqual([...SPECIAL_ROLES]);
  });

  it('R20 — la référence se distribue telle quelle à toutes les tables (R13)', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const { loups, roles } = autoComposition(players);
      const distribués = compositionFor(players, { ...DEFAULT_OPTIONS, auto: true });
      expect(distribués).toHaveLength(players);
      expect(distribués.filter((r) => r === 'loup')).toHaveLength(loups);
      for (const role of roles) {
        expect(distribués.filter((r) => r === role)).toHaveLength(1);
      }
      expect(distribués.filter((r) => r === 'villageois')).toHaveLength(players - loups - roles.length);
    }
  });
});

describe('les bornes de la composition libre', () => {
  it('R13 — distribue exactement ce qu’on lui demande, un rôle par siège', () => {
    const distribués = compositionFor(9, manuelle(3, ['voyante', 'chasseur']));
    expect(distribués).toHaveLength(9);
    expect(distribués.filter((r) => r === 'loup')).toHaveLength(3);
    expect(distribués.filter((r) => r === 'voyante')).toHaveLength(1);
    expect(distribués.filter((r) => r === 'chasseur')).toHaveLength(1);
    expect(distribués.filter((r) => r === 'villageois')).toHaveLength(4);
  });

  it('R13 — refuse une table hors des 6 à 18 sièges (R1)', () => {
    for (const players of [0, 5, 19, 100]) {
      expect(() => compositionFor(players, DEFAULT_OPTIONS)).toThrow(IllegalActionError);
    }
  });

  it('R13 — refuse une partie sans loup', () => {
    expect(() => compositionFor(8, manuelle(0, []))).toThrow(IllegalActionError);
  });

  it('R13 — refuse autant de loups que d’autres joueurs — la borne elle-même passe', () => {
    expect(() => compositionFor(6, manuelle(3, []))).toThrow(IllegalActionError); // 3 × 2 ≥ 6
    expect(() => compositionFor(8, manuelle(4, []))).toThrow(IllegalActionError); // 4 × 2 ≥ 8
    expect(() => compositionFor(7, manuelle(3, []))).not.toThrow(); // 3 × 2 < 7
  });

  it('R13 — refuse plus de rôles que de places libres, mais accepte autant', () => {
    // Six joueurs, deux loups : quatre places libres.
    const quatre = ['voyante', 'sorciere', 'chasseur', 'cupidon'] as const;
    expect(() => compositionFor(6, manuelle(2, [...quatre, 'salvateur']))).toThrow(IllegalActionError);
    // Aussi étrange que cela paraisse, il ne reste aucun villageois simple —
    // mais R13 ne l’interdit pas : seulement « plus de rôles que de places ».
    expect(() => compositionFor(6, manuelle(2, [...quatre]))).not.toThrow();
  });
});

describe('le générateur aléatoire de composition', () => {
  it('R22 — tire les loups à ±1 de la référence, jamais moins de deux, dans la borne de R13', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const référence = autoComposition(players);
      const plancher = Math.max(2, référence.loups - 1);
      const plafond = Math.min(référence.loups + 1, Math.floor((players - 1) / 2));
      for (let seed = 0; seed < 40; seed++) {
        const { loups } = randomComposition(players, createSeededRng(seed * 31 + players));
        expect(loups).toBeGreaterThanOrEqual(plancher);
        expect(loups).toBeLessThanOrEqual(plafond);
      }
    }
  });

  it('R22 — garde toujours la voyante et la sorcière, et ne tire que des rôles éligibles', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const éligibles = SPECIAL_ROLES.filter((role) => players >= SEUILS[role]);
      for (let seed = 0; seed < 20; seed++) {
        const { roles } = randomComposition(players, createSeededRng(seed * 17 + players));
        expect(roles).toContain('voyante');
        expect(roles).toContain('sorciere');
        for (const role of roles) {
          expect(éligibles).toContain(role);
        }
        expect(new Set(roles).size).toBe(roles.length); // un exemplaire au plus (R4)
      }
    }
  });

  it('R22 — laisse toujours au moins deux villageois simples, et une composition jouable (R13)', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      for (let seed = 0; seed < 20; seed++) {
        const { loups, roles } = randomComposition(players, createSeededRng(seed * 13 + players));
        expect(players - loups - roles.length).toBeGreaterThanOrEqual(2);
        expect(() => compositionFor(players, manuelle(loups, roles))).not.toThrow();
      }
    }
  });

  it('R22 — rend la même composition à deux graines identiques', () => {
    for (const seed of [0, 1, 42, 2026]) {
      for (const players of [6, 9, 12, 15, 18]) {
        expect(randomComposition(players, createSeededRng(seed))).toEqual(
          randomComposition(players, createSeededRng(seed)),
        );
      }
    }
  });

  it('R22 — ne rend pas la même table à toutes les graines', () => {
    const loupsVus = new Set<number>();
    const rôlesVus = new Set<SpecialRoleId>();
    for (let seed = 0; seed < 200; seed++) {
      const { loups, roles } = randomComposition(12, createSeededRng(seed));
      loupsVus.add(loups);
      for (const role of roles) rôlesVus.add(role);
    }
    expect(loupsVus.size).toBeGreaterThan(1);
    // Des rôles tirés au hasard, ça veut dire qu’ils tombent parfois.
    expect([...rôlesVus].some((role) => role !== 'voyante' && role !== 'sorciere')).toBe(true);
  });
});

describe('les suggestions', () => {
  it('R23 — propose trois compositions jouables à chaque table de 6 à 18 joueurs', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const suggestions = suggestionsFor(players);
      expect(suggestions).toHaveLength(3);
      for (const suggestion of suggestions) {
        expect(suggestion.loups).toBeGreaterThanOrEqual(1);
        expect(suggestion.loups + suggestion.roles.length).toBeLessThanOrEqual(players - 1);
        expect(() => compositionFor(players, manuelle(suggestion.loups, suggestion.roles))).not.toThrow();
      }
    }
  });

  it('R23 — la référence, la chasse, le village outillé, dans cet ordre', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const référence = autoComposition(players);
      const [première, chasse, outillé] = suggestionsFor(players);
      expect(première).toEqual(référence);
      // La chasse prend un loup de plus — quand la borne de R13 le permet.
      expect(chasse!.loups).toBe(Math.min(référence.loups + 1, Math.floor((players - 1) / 2)));
      expect(chasse!.roles).toEqual(référence.roles);
      // Le village outillé garde les loups de la référence et prend tous les
      // rôles éligibles.
      expect(outillé!.loups).toBe(référence.loups);
      expect(outillé!.roles).toEqual(SPECIAL_ROLES.filter((role) => players >= SEUILS[role]));
    }
  });
});
