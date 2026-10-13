/**
 * Les tracés gravés qui ne voyagent pas dans le paquet initial (voir
 * `lib/paresseux.ts`) : chacun est un morceau à part, chargé à la demande.
 *
 * - les dix-huit vignettes du récit (fin de partie) — repli : la place vide ;
 * - le frontispice du recueil (la nuit racontée) — repli : le bandeau vide ;
 * - les skins à gravures propres (symboles, dos, coiffes) — repli : la
 *   gravure de Thiercelieux (la table qui les rassemble est `gravures.ts`).
 *
 * Le découpage des modules `traces/*.ts` est celui qu'écrit
 * `docs/design/caprices/generateurs/extraire.mjs` ; chacun rend la même
 * forme, `TracesDuSkin` — seule la table (`GRAVURES`) sait quel skin l'apporte.
 */
import { paresseux, type ModuleParesseux } from '../../lib/paresseux.js';

import type { Noeud } from './Trace.js';

/** Ce que rend le module de gravures d'un skin : la même forme pour tous. */
export interface TracesDuSkin {
  /** Une gravure par rôle, aux deux niveaux : grand (le 128 de la carte) et petit (32 et dessous). */
  symboles: Record<string, { grand: Noeud; petit: Noeud }>;
  /** Le dos de carte du skin (le dormeur des deux tirages, à Thiercelieux). */
  dos: { viewBox: string; trace: Noeud };
  /** Les coiffes du skin, par rang de siège (18 au plus ; le village tient le reste). */
  coiffes: readonly { nom: string; grave: Noeud }[];
}

export const TRACES_VIGNETTES = paresseux(() => import('./traces/vignettes.js'));
export const TRACE_RECUEIL = paresseux(() => import('./traces/frontispice-recueil.js'));

/** Les gravures du district de Shiganshina, rangées dans la forme commune. */
export const TRACES_SHIGANSHINA: ModuleParesseux<TracesDuSkin> = paresseux(async () => {
  const district = await import('./traces/shiganshina.js');
  return {
    symboles: district.SYMBOLES_SHIGANSHINA,
    dos: district.DOS_SHIGANSHINA,
    coiffes: district.COIFFES_SHIGANSHINA,
  };
});

/** Les gravures du rond-point des Gilets Jaunes, rangées dans la forme commune. */
export const TRACES_GILETSJAUNES: ModuleParesseux<TracesDuSkin> = paresseux(async () => {
  const rondpoint = await import('./traces/giletsjaunes.js');
  return {
    symboles: rondpoint.SYMBOLES_GILETSJAUNES,
    dos: rondpoint.DOS_GILETSJAUNES,
    coiffes: rondpoint.COIFFES_GILETSJAUNES,
  };
});

/** La fin de partie (vignettes et frontispice du recueil) : à précharger dès que la partie se joue. */
export function prechargerFinDePartie(): Promise<unknown> {
  return Promise.all([TRACES_VIGNETTES.precharger(), TRACE_RECUEIL.precharger()]);
}
