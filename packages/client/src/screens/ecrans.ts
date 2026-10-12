/**
 * Les écrans de table, chargés à part (`lib/paresseux.ts`) : seul l'accueil
 * voyage dans le paquet initial. `App` précharge les deux dès son premier
 * rendu — l'accueil est déjà peint —, si bien qu'on ne les attend presque
 * jamais en s'asseyant.
 */
import { paresseux } from '../lib/paresseux.js';

export const ECRAN_SALON = paresseux(() => import('./Salon.js'));
export const ECRAN_PARTIE = paresseux(() => import('./Partie.js'));

/** Précharge les écrans de table. */
export function prechargerEcrans(): Promise<unknown> {
  return Promise.all([ECRAN_SALON.precharger(), ECRAN_PARTIE.precharger()]);
}
