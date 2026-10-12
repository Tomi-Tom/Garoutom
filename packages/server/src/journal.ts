/**
 * Le journal public d'une table (D22).
 *
 * Chaque évènement du moteur reçoit un numéro, croissant pour toute la vie de
 * la table — revanches comprises : un client qui garde son dernier numéro ne
 * doit jamais le voir redescendre. La table garde les `JOURNAL_SIZE` derniers,
 * et c'est tout : rien de secret n'y entre, puisque les évènements partent
 * déjà à tous les sièges (R87). Un joueur revenu présente le dernier numéro
 * qu'il a vu (`room:join.lastSeq`) ; on lui rend ce qui suit, marqué
 * `replay`.
 *
 * Fonctions pures sur des données sérialisables : le journal voyage avec la
 * table dans le magasin, comme le reste.
 */

import type { GameEvent } from '@garoutom/engine';

/** Combien d'évènements une table garde pour le rattrapage. */
export const JOURNAL_SIZE = 200;

export interface JournalEntry {
  seq: number;
  event: GameEvent;
}

export interface RoomJournal {
  /** Le numéro du dernier évènement — `0` tant que rien n'est arrivé. */
  seq: number;
  /** Les derniers évènements, consécutifs, du plus ancien au plus récent. */
  entries: JournalEntry[];
}

export function emptyJournal(): RoomJournal {
  return { seq: 0, entries: [] };
}

/**
 * Numérote et range des évènements neufs. Ils sont consécutifs : le dernier
 * porte le nouveau `journal.seq`, ce qui suffit au client (`eventSeqOf`).
 */
export function appendJournal(journal: RoomJournal, events: readonly GameEvent[]): void {
  for (const event of events) {
    journal.seq += 1;
    journal.entries.push({ seq: journal.seq, event: structuredClone(event) });
  }
  const excess = journal.entries.length - JOURNAL_SIZE;
  if (excess > 0) journal.entries.splice(0, excess);
}

/**
 * Ce qu'un joueur a manqué depuis `lastSeq` — la queue du journal, donc des
 * évènements consécutifs qui finissent au dernier numéro. Un numéro venu
 * d'ailleurs (plus grand que le nôtre : une autre table, une autre vie du
 * serveur) ne rejoue rien.
 */
export function missedSince(journal: RoomJournal, lastSeq: number): GameEvent[] {
  if (lastSeq >= journal.seq) return [];
  return journal.entries.filter((entry) => entry.seq > lastSeq).map((entry) => entry.event);
}

/** Un journal relu du magasin, réparé au besoin : jamais un trou de numérotation. */
export function readJournal(raw: unknown): RoomJournal {
  if (typeof raw !== 'object' || raw === null) return emptyJournal();
  const { seq, entries } = raw as { seq?: unknown; entries?: unknown };
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) return emptyJournal();
  if (!Array.isArray(entries)) return { seq, entries: [] };
  // Les entrées doivent finir à `seq` et se suivre ; sinon on ne garde que le
  // numéro — mieux vaut un rattrapage vide qu'un rattrapage faux.
  const kept = entries as JournalEntry[];
  const consecutive = kept.every(
    (entry, index) =>
      typeof entry === 'object' &&
      entry !== null &&
      entry.seq === seq - kept.length + 1 + index &&
      typeof entry.event === 'object' &&
      entry.event !== null,
  );
  return consecutive ? { seq, entries: kept.slice(-JOURNAL_SIZE) } : { seq, entries: [] };
}
