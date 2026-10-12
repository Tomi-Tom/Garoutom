/**
 * Le récit de fin face à la mort d'abandon (R101, D18) : elle tombe à la
 * clôture d'une échéance, et prend l'heure de ce que cette clôture inscrit
 * après elle — la nuit à la fin d'une étape de nuit, le jour au vote.
 */

import { describe, expect, it } from 'vitest';

import { timeoutPhase, type LogEntry } from '@garoutom/engine';

import { agir, finirPhase, nouvellePartie, siegeDe, sieges, tousPrets } from '../nuit/banc.js';
import { decouperLog, finitDeNuit } from './recit.js';

const abandon = (day: number, seat: number): LogEntry => ({ day, type: 'mort', seat, cause: 'abandon' });

/** Les entrées d'un jour, rangées : `N` pour la nuit, `J` pour le jour. */
function heures(log: LogEntry[], day: number): string[] {
  const jour = decouperLog(log).find((j) => j.n === day);
  if (!jour) return [];
  const etiquette = (e: LogEntry) => (e.type === 'mort' ? `mort:${e.cause}` : e.type);
  return [...jour.nuit.map((e) => `N ${etiquette(e)}`), ...jour.jour.map((e) => `J ${etiquette(e)}`)];
}

describe('la mort d’abandon dans le récit', () => {
  it('à la clôture de l’étape principale : de nuit, avant les entrées de la nuit', () => {
    const log: LogEntry[] = [
      abandon(2, 5),
      { day: 2, type: 'loups', target: 3 },
      { day: 2, type: 'mort', seat: 3, cause: 'loups' },
      { day: 2, type: 'vote', tally: {}, executed: null },
    ];
    expect(heures(log, 2)).toEqual(['N mort:abandon', 'N loups', 'N mort:loups', 'J vote']);
  });

  it('à la clôture du vote, après une aube paisible : de jour', () => {
    const log: LogEntry[] = [
      { day: 2, type: 'loups', target: null },
      abandon(2, 5),
      { day: 2, type: 'vote', tally: {}, executed: null },
    ];
    expect(heures(log, 2)).toEqual(['N loups', 'J mort:abandon', 'J vote']);
  });

  it('à la fin de l’étape de la Sorcière, avant les morts de l’aube : de nuit', () => {
    const log: LogEntry[] = [
      { day: 2, type: 'loups', target: 3 },
      abandon(2, 5),
      { day: 2, type: 'mort', seat: 3, cause: 'loups' },
      { day: 2, type: 'vote', tally: {}, executed: 4 },
    ];
    expect(heures(log, 2)).toEqual(['N loups', 'N mort:abandon', 'N mort:loups', 'J vote']);
  });

  it('son chagrin et la charge léguée au hasard gardent son heure', () => {
    const nuit: LogEntry[] = [
      abandon(3, 5),
      { day: 3, type: 'mort', seat: 6, cause: 'chagrin' },
      { day: 3, type: 'capitaine', seat: 2 },
      { day: 3, type: 'loups', target: 1 },
    ];
    expect(heures(nuit, 3)).toEqual(['N mort:abandon', 'N mort:chagrin', 'N capitaine', 'N loups']);

    const jour: LogEntry[] = [
      { day: 3, type: 'loups', target: 1 },
      { day: 3, type: 'mort', seat: 1, cause: 'loups' },
      abandon(3, 5),
      { day: 3, type: 'mort', seat: 6, cause: 'chagrin' },
      { day: 3, type: 'vote', tally: {}, executed: null },
    ];
    expect(heures(jour, 3)).toEqual(['N loups', 'N mort:loups', 'J mort:abandon', 'J mort:chagrin', 'J vote']);
  });

  it('une partie qui s’achève sur elle garde l’heure en cours', () => {
    expect(finitDeNuit([{ day: 1, type: 'vote', tally: {}, executed: 2 }, abandon(2, 5)])).toBe(true);
    expect(finitDeNuit([{ day: 2, type: 'loups', target: null }, { day: 2, type: 'vote', tally: {}, executed: null }, abandon(2, 5)])).toBe(false);
  });

  it('sur une vraie partie : abandon à la nuit, puis abandon au vote', () => {
    const banc = nouvellePartie({}, 10);
    tousPrets(banc);
    const [premier, second] = sieges(banc, 'villageois') as [number, number];
    for (const loup of sieges(banc, 'loup')) agir(banc, loup, { type: 'devorer', target: siegeDe(banc, 'voyante') });
    // L'étape principale expire : le premier villageois, parti, meurt d'abandon.
    banc.state = timeoutPhase(banc.state, banc.rng, banc.state.phaseSeq, { abandons: [premier] }).state;
    while (banc.state.phase.kind !== 'jour') finirPhase(banc);
    // Le vote expire : le second, parti à son tour, meurt d'abandon.
    banc.state = timeoutPhase(banc.state, banc.rng, banc.state.phaseSeq, { abandons: [second] }).state;

    const jour1 = decouperLog(banc.state.log).find((j) => j.n === 1);
    const estAbandonDe = (seat: number) => (e: LogEntry) => e.type === 'mort' && e.cause === 'abandon' && e.seat === seat;
    expect(jour1?.nuit.some(estAbandonDe(premier))).toBe(true);
    expect(jour1?.jour.some(estAbandonDe(second))).toBe(true);
  });
});
