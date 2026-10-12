/**
 * La nuit racontée en portfolio (SPEC Caprices § 5.15, § 6.4) : chaque bloc
 * du log — une nuit, un jour — devient une **planche numérotée**, légendée
 * par le graveur et illustrée d'une vignette, toutes deux choisies par
 * l'évènement dominant du bloc ; la dernière planche est toujours « Il est
 * l'heure. ».
 *
 * Le découpage en nuits et en jours reste celui de `recit.ts` ; ce module
 * n'y ajoute que la numérotation et le choix de la légende, dans l'ordre de
 * priorité du tableau du § 6.4. Une légende ne nomme jamais personne : elle
 * dépend de ce qui s'est passé, jamais de qui.
 */

import { campOf, type LogEntry, type RoleId } from '@garoutom/engine';

import type { CleLegendeRecit } from '../../../skins/registre.js';
import type { NomVignette } from '../../habit/Vignette.js';
import { decouperLog } from './recit.js';

/** La vignette de chaque légende du récit (§ 6.4, colonne « Vignette »). */
export const VIGNETTE_DE_LA_LEGENDE: Readonly<Record<CleLegendeRecit, NomVignette>> = {
  loupBlanc: 'machoire',
  rancune: 'branche',
  poison: 'aconit',
  tir: 'cor',
  chagrin: 'lacs',
  grace: 'corde',
  bouc: 'bouc',
  voteMeute: 'potence',
  voteVillage: 'potence',
  sauvetage: 'vie',
  loups: 'yeux',
  resistance: 'canne',
  protection: 'porte',
  corbeau: 'lettre',
  voyance: 'main',
  amoureux: 'fleche',
  nuitDefaut: 'dormeur',
  jourDefaut: 'place',
  derniere: 'sablier',
};

/** Ce que montre chaque vignette, pour qui ne la voit pas (elle devient alors une image nommée). */
export const SUJET_DE_LA_VIGNETTE: Readonly<Record<NomVignette, string>> = {
  machoire: 'une mâchoire ouverte',
  branche: 'une branche sciée',
  aconit: 'une fiole d’aconit',
  cor: 'un cor fumant',
  lacs: 'des lacs dénoués',
  corde: 'une corde coupée',
  bouc: 'une tête de bouc',
  potence: 'la potence',
  vie: 'une fiole de vie',
  yeux: 'des yeux dans le noir',
  canne: 'une canne à deux encoches',
  porte: 'une porte barrée',
  lettre: 'une lettre cachetée',
  main: 'une main à l’œil',
  fleche: 'une flèche et deux cœurs',
  dormeur: 'le dormeur',
  place: 'la place vide',
  sablier: 'un sablier vide',
};

/**
 * La légende d'un bloc : celle du **premier** évènement présent, dans l'ordre
 * du tableau du § 6.4. `roleDe` lit le rôle d'un siège (à la fin, la vue est
 * omnisciente) — il départage le vote : un loup pendu, « Pour une fois. ».
 */
export function legendeDuBloc(
  entrees: readonly LogEntry[],
  nuit: boolean,
  roleDe: (seat: number) => RoleId | null,
): CleLegendeRecit {
  const present = (garde: (entree: LogEntry) => boolean) => entrees.some(garde);

  if (present((e) => e.type === 'loupBlanc' && e.target !== null)) return 'loupBlanc';
  if (present((e) => e.type === 'rancune')) return 'rancune';
  if (present((e) => e.type === 'poison')) return 'poison';
  if (present((e) => e.type === 'tir' && e.target !== null)) return 'tir';
  if (present((e) => e.type === 'mort' && e.cause === 'chagrin')) return 'chagrin';
  if (present((e) => e.type === 'grace')) return 'grace';
  if (present((e) => e.type === 'bouc')) return 'bouc';

  for (const entree of entrees) {
    if (entree.type !== 'vote' || entree.executed === null) continue;
    const role = roleDe(entree.executed);
    return role !== null && campOf(role) === 'loups' ? 'voteMeute' : 'voteVillage';
  }

  if (present((e) => e.type === 'sauvetage')) return 'sauvetage';

  // La meute a désigné quelqu'un, et une mort a suivi.
  const rangMeute = entrees.findIndex((e) => e.type === 'loups' && e.target !== null);
  const meute = rangMeute === -1 ? undefined : entrees[rangMeute];
  if (meute !== undefined && entrees.slice(rangMeute + 1).some((e) => e.type === 'mort')) return 'loups';

  if (present((e) => e.type === 'resistance')) return 'resistance';
  if (
    meute !== undefined &&
    meute.type === 'loups' &&
    present((e) => e.type === 'protection' && e.target === meute.target)
  ) {
    return 'protection';
  }
  if (present((e) => e.type === 'corbeau')) return 'corbeau';
  if (present((e) => e.type === 'voyance' && campOf(e.role) === 'loups')) return 'voyance';
  if (present((e) => e.type === 'amoureux')) return 'amoureux';
  return nuit ? 'nuitDefaut' : 'jourDefaut';
}

export type HeurePlanche = 'nuit' | 'jour' | 'fin';

export interface Planche {
  /** Le numéro de planche, à partir de 1 : « Pl. 3 ». */
  numero: number;
  /** Une clé stable pour React. */
  cle: string;
  /** Le numéro de la nuit ou du jour (celui du log). */
  n: number;
  heure: HeurePlanche;
  entrees: LogEntry[];
  legende: CleLegendeRecit;
  vignette: NomVignette;
}

/**
 * Les planches du récit, dans l'ordre : nuit 1, jour 1, nuit 2… (un bloc
 * vide n'a pas de planche), puis la planche finale « Il est l'heure. ».
 * Un log vide ne donne aucune planche.
 */
export function planchesDuLog(log: readonly LogEntry[], roleDe: (seat: number) => RoleId | null): Planche[] {
  const planches: Planche[] = [];
  let dernierJour = 0;
  for (const jour of decouperLog(log)) {
    dernierJour = jour.n;
    for (const heure of ['nuit', 'jour'] as const) {
      const entrees = jour[heure];
      if (entrees.length === 0) continue;
      const legende = legendeDuBloc(entrees, heure === 'nuit', roleDe);
      planches.push({
        numero: planches.length + 1,
        cle: `${heure}-${String(jour.n)}`,
        n: jour.n,
        heure,
        entrees,
        legende,
        vignette: VIGNETTE_DE_LA_LEGENDE[legende],
      });
    }
  }
  if (planches.length === 0) return planches;
  planches.push({
    numero: planches.length + 1,
    cle: 'fin',
    n: dernierJour,
    heure: 'fin',
    entrees: [],
    legende: 'derniere',
    vignette: VIGNETTE_DE_LA_LEGENDE.derniere,
  });
  return planches;
}
