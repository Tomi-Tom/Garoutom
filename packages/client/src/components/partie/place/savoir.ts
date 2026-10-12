/**
 * Le savoir privé sous le pouce (SPEC § 5.1.6).
 *
 * Les complices de la meute, le carnet de la Voyante et les lacs des amoureux
 * ne sont **plus dessinés en permanence** sur la place (P0-3) : ils paraissent
 * tant que le pouce tient « Ma carte » (l'appui long de la frise, ou celui de
 * la barre du dormeur la nuit), et disparaissent au relâchement.
 *
 * Un tout petit magasin, hors de React : le geste vit dans la frise (ou la
 * barre), la place qui l'écoute vit ailleurs. `poserLePouce(true)` à
 * `onDebut`, `poserLePouce(false)` à `onFin` — rien d'autre.
 */

import { useSyncExternalStore } from 'react';

let tenu = false;
const abonnes = new Set<() => void>();

/** Le pouce se pose (vrai) ou se lève (faux) sur « Ma carte ». */
export function poserLePouce(valeur: boolean): void {
  if (tenu === valeur) return;
  tenu = valeur;
  for (const abonne of abonnes) abonne();
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

const lire = (): boolean => tenu;

/** Vrai tant que le pouce tient « Ma carte » : la place montre alors le savoir privé. */
export function useSousLePouce(): boolean {
  return useSyncExternalStore(abonner, lire, lire);
}
