/**
 * Le bureau ou le téléphone : la requête `(min-width: 64rem)`, la même que
 * celle des tokens (`styles.css`, « desktop 1440 × 900 »).
 *
 * Hors navigateur, ou sans `matchMedia` (les tests de rendu sous jsdom), la
 * réponse est « non » : on rend le gabarit mobile, qui est celui de référence.
 * Un composant qui n'a besoin que d'un habillage différent préfère les
 * variantes CSS (`lg:`) ; celui-ci sert quand la **structure** change — les
 * trois colonnes du salon à la place des trois étapes —, parce que deux
 * versions du même bouton dans le DOM se liraient deux fois.
 */

import { useSyncExternalStore } from 'react';

const REQUETE = '(min-width: 64rem)';

function abonner(rappel: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(REQUETE);
  media.addEventListener('change', rappel);
  return () => media.removeEventListener('change', rappel);
}

function lire(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REQUETE).matches;
}

export function useEstLarge(): boolean {
  return useSyncExternalStore(abonner, lire, () => false);
}
