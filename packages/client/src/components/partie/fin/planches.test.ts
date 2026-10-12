/**
 * Les planches de la nuit racontée (SPEC Caprices § 6.4) : la légende de
 * chaque bloc suit l'ordre de priorité du tableau, la vignette suit la
 * légende, les planches se numérotent dans l'ordre du récit, et la dernière
 * est toujours « Il est l'heure. ».
 */
import { describe, expect, it } from 'vitest';

import type { LogEntry, RoleId } from '@garoutom/engine';

import { CLES_LEGENDE_RECIT } from '../../../skins/registre.js';
import { NOMS_VIGNETTES } from '../../habit/Vignette.js';
import { legendeDuBloc, planchesDuLog, SUJET_DE_LA_VIGNETTE, VIGNETTE_DE_LA_LEGENDE } from './planches.js';

const ROLES: Record<number, RoleId> = { 0: 'loup', 1: 'villageois', 2: 'voyante', 3: 'loupBlanc', 4: 'ancien' };
const roleDe = (seat: number): RoleId | null => ROLES[seat] ?? null;

describe('legendeDuBloc — l’ordre du § 6.4', () => {
  it('la trahison du Loup Blanc l’emporte sur tout', () => {
    const bloc: LogEntry[] = [
      { day: 2, type: 'loups', target: 1 },
      { day: 2, type: 'poison', target: 2 },
      { day: 2, type: 'loupBlanc', target: 0 },
      { day: 2, type: 'mort', seat: 1, cause: 'loups' },
    ];
    expect(legendeDuBloc(bloc, true, roleDe)).toBe('loupBlanc');
    // Le Loup Blanc qui épargne la meute ne compte pas : le poison passe devant.
    expect(legendeDuBloc([{ day: 2, type: 'loupBlanc', target: null }, ...bloc.slice(0, 2)], true, roleDe)).toBe('poison');
  });

  it('le vote départage la meute et le village : « Pour une fois. »', () => {
    expect(legendeDuBloc([{ day: 1, type: 'vote', tally: { 0: 4 }, executed: 0 }], false, roleDe)).toBe('voteMeute');
    expect(legendeDuBloc([{ day: 1, type: 'vote', tally: { 3: 4 }, executed: 3 }], false, roleDe)).toBe('voteMeute');
    expect(legendeDuBloc([{ day: 1, type: 'vote', tally: { 1: 4 }, executed: 1 }], false, roleDe)).toBe('voteVillage');
    // Personne à la potence : le jour par défaut.
    expect(legendeDuBloc([{ day: 1, type: 'vote', tally: {}, executed: null }], false, roleDe)).toBe('jourDefaut');
  });

  it('la meute qui tue, la porte qui tient, la voyance qui trouve', () => {
    const meute: LogEntry = { day: 1, type: 'loups', target: 1 };
    expect(legendeDuBloc([meute, { day: 1, type: 'mort', seat: 1, cause: 'loups' }], true, roleDe)).toBe('loups');
    expect(legendeDuBloc([{ day: 1, type: 'protection', target: 1 }, meute], true, roleDe)).toBe('protection');
    // Le bouclier posé ailleurs ne dit rien.
    expect(legendeDuBloc([{ day: 1, type: 'protection', target: 2 }, meute], true, roleDe)).toBe('nuitDefaut');
    expect(legendeDuBloc([{ day: 1, type: 'voyance', target: 0, role: 'loup' }, meute], true, roleDe)).toBe('voyance');
    expect(legendeDuBloc([{ day: 1, type: 'voyance', target: 1, role: 'villageois' }], true, roleDe)).toBe('nuitDefaut');
    expect(legendeDuBloc([{ day: 1, type: 'amoureux', seats: [1, 2] }, meute], true, roleDe)).toBe('amoureux');
  });

  it('chacune des autres, à son rang', () => {
    const cas: [LogEntry[], string][] = [
      [[{ day: 2, type: 'rancune', seat: 4 }, { day: 2, type: 'poison', target: 4 }], 'rancune'],
      [[{ day: 2, type: 'tir', target: 0 }, { day: 2, type: 'grace', seat: 1 }], 'tir'],
      [[{ day: 2, type: 'tir', target: null }, { day: 2, type: 'grace', seat: 1 }], 'grace'],
      [[{ day: 2, type: 'mort', seat: 2, cause: 'chagrin' }, { day: 2, type: 'bouc', seat: 1 }], 'chagrin'],
      [[{ day: 2, type: 'bouc', seat: 1 }, { day: 2, type: 'vote', tally: {}, executed: 1 }], 'bouc'],
      [[{ day: 2, type: 'sauvetage', target: 1 }, { day: 2, type: 'loups', target: 1 }], 'sauvetage'],
      [[{ day: 2, type: 'resistance', seat: 4 }, { day: 2, type: 'corbeau', target: 1 }], 'resistance'],
      [[{ day: 2, type: 'corbeau', target: 1 }], 'corbeau'],
    ];
    for (const [bloc, legende] of cas) expect(legendeDuBloc(bloc, true, roleDe)).toBe(legende);
  });
});

describe('planchesDuLog', () => {
  it('numérote les blocs non vides, nuit puis jour, et finit sur « Il est l’heure. »', () => {
    const planches = planchesDuLog(
      [
        { day: 1, type: 'loups', target: 1 },
        { day: 1, type: 'mort', seat: 1, cause: 'loups' },
        { day: 1, type: 'vote', tally: { 0: 3 }, executed: 0 },
        { day: 1, type: 'mort', seat: 0, cause: 'vote' },
        { day: 2, type: 'loups', target: null },
      ],
      roleDe,
    );
    expect(planches.map((p) => [p.numero, p.heure, p.n, p.legende, p.vignette])).toEqual([
      [1, 'nuit', 1, 'loups', 'yeux'],
      [2, 'jour', 1, 'voteMeute', 'potence'],
      [3, 'nuit', 2, 'nuitDefaut', 'dormeur'],
      [4, 'fin', 2, 'derniere', 'sablier'],
    ]);
    expect(planches.at(-1)?.entrees).toEqual([]);
  });

  it('un log vide ne fait aucune planche', () => {
    expect(planchesDuLog([], roleDe)).toEqual([]);
  });

  it('chaque légende du récit a sa vignette, et chaque vignette son sujet', () => {
    for (const cle of CLES_LEGENDE_RECIT) expect(NOMS_VIGNETTES).toContain(VIGNETTE_DE_LA_LEGENDE[cle]);
    for (const nom of NOMS_VIGNETTES) expect(SUJET_DE_LA_VIGNETTE[nom as keyof typeof SUJET_DE_LA_VIGNETTE]).toBeTruthy();
  });
});
