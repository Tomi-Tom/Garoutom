/**
 * Découpe du `log` en nuits et en jours.
 *
 * Le log est une liste plate, rangée par `day` (la nuit 1 précède le jour 1 :
 * une nuit et le jour qui la suit portent le même numéro). Rien n'y dit où la
 * nuit s'arrête ; on le déduit en gardant l'ordre du log :
 *
 * - les entrées qui ne se produisent que la nuit — `amoureux`, `protection`,
 *   `voyance`, `corbeau` (la marque se pose la nuit, R93), `loups`,
 *   `loupBlanc` (son étape suit la principale, R97), `sauvetage`,
 *   `resistance` (l'Ancien encaisse la meute à l'aube, R91), `poison` — sont
 *   toujours « nuit » ; elles rouvrent aussi la nuit après un évènement de
 *   jour ;
 * - un évènement de jour — `capitaine`, `vote`, `grace`, `tir`, `bouc`
 *   (l'égalité du vote retombe sur lui, R94), `votants` (son dernier mot, qui
 *   suit sa mort), ou une `mort` de cause `vote` ou `chasseur` — ferme la
 *   nuit : tout ce qui suit est « jour » jusqu'à la prochaine entrée de nuit ;
 * - une `mort` de cause `loups`, `poison` ou `chagrin` est « nuit » tant que
 *   la nuit n'est pas fermée (les victimes de l'aube) ; sinon elle appartient
 *   au jour (le chagrin d'un amoureux après un vote, par exemple) ;
 * - `rancune` suit toujours la `mort` de l'Ancien qui l'a déclenchée (R92) :
 *   elle garde l'heure de cette mort — « nuit » quand le poison l'emporte à
 *   l'aube, « jour » quand le vote ou la balle du Chasseur l'abattent — et
 *   ne ferme ni ne rouvre rien.
 *
 * Un bloc vide est omis par l'écran. L'élection du capitaine d'avant la nuit 1
 * (`capitaineAvantNuit1`) tombe dans « Jour 1 », même si elle la précède.
 */

import type { LogEntry } from '@garoutom/engine';

export interface JourRaconte {
  n: number;
  nuit: LogEntry[];
  jour: LogEntry[];
}

const TYPES_DE_NUIT = new Set<LogEntry['type']>([
  'amoureux',
  'protection',
  'voyance',
  'corbeau',
  'loups',
  'loupBlanc',
  'sauvetage',
  'resistance',
  'poison',
]);

const CAUSES_DE_NUIT = new Set<string>(['loups', 'poison', 'chagrin']);

/** Cette entrée est-elle dans le bloc de nuit ? */
export function estDeNuit(entree: LogEntry, nuitOuverte: boolean): boolean {
  if (TYPES_DE_NUIT.has(entree.type)) return true;
  // La rancune est l'écho d'une mort : elle en garde l'heure.
  if (entree.type === 'rancune') return nuitOuverte;
  return entree.type === 'mort' && nuitOuverte && CAUSES_DE_NUIT.has(entree.cause);
}

/**
 * Le log, entrée par entrée, avec l'heure de chacune : le même parcours sert
 * à découper le récit et à dire où la partie s'est arrêtée.
 */
function heures(log: readonly LogEntry[]): { entree: LogEntry; nuit: boolean }[] {
  const resultat: { entree: LogEntry; nuit: boolean }[] = [];
  let courant = -1;
  let nuitOuverte = true;
  for (const entree of log) {
    if (entree.day !== courant) {
      courant = entree.day;
      nuitOuverte = true;
    }
    const nuit = estDeNuit(entree, nuitOuverte);
    if (TYPES_DE_NUIT.has(entree.type)) nuitOuverte = true;
    else if (!nuit) nuitOuverte = false;
    resultat.push({ entree, nuit });
  }
  return resultat;
}

/**
 * La dernière entrée du log est-elle de nuit ? `null` pour un log vide. Elle
 * se lit dans son contexte, pas isolée : une rancune ou un chagrin du soir
 * restent au jour.
 */
export function finitDeNuit(log: readonly LogEntry[]): boolean | null {
  return heures(log).at(-1)?.nuit ?? null;
}

export function decouperLog(log: readonly LogEntry[]): JourRaconte[] {
  const jours = new Map<number, JourRaconte>();
  for (const { entree, nuit } of heures(log)) {
    let jour = jours.get(entree.day);
    if (!jour) {
      jour = { n: entree.day, nuit: [], jour: [] };
      jours.set(entree.day, jour);
    }
    (nuit ? jour.nuit : jour.jour).push(entree);
  }
  return [...jours.values()].sort((a, b) => a.n - b.n);
}
