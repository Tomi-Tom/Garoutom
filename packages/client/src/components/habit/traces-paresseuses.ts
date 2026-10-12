/**
 * Les tracés gravés qui ne voyagent pas dans le paquet initial (voir
 * `lib/paresseux.ts`) : chacun est un morceau à part, chargé à la demande.
 *
 * - les dix-huit vignettes du récit (fin de partie) — repli : la place vide ;
 * - le frontispice du recueil (la nuit racontée) — repli : le bandeau vide ;
 * - Shiganshina (symboles, dos, coiffes) — repli : la gravure de Thiercelieux.
 *
 * Le découpage des modules `traces/*.ts` est celui qu'écrit
 * `docs/design/caprices/generateurs/extraire.mjs`.
 */
import { paresseux } from '../../lib/paresseux.js';

export const TRACES_VIGNETTES = paresseux(() => import('./traces/vignettes.js'));
export const TRACE_RECUEIL = paresseux(() => import('./traces/frontispice-recueil.js'));
export const TRACES_SHIGANSHINA = paresseux(() => import('./traces/shiganshina.js'));

/** La fin de partie (vignettes et frontispice du recueil) : à précharger dès que la partie se joue. */
export function prechargerFinDePartie(): Promise<unknown> {
  return Promise.all([TRACES_VIGNETTES.precharger(), TRACE_RECUEIL.precharger()]);
}

/** Les gravures du district : à précharger dès que la table passe à Shiganshina. */
export function prechargerShiganshina(): Promise<unknown> {
  return TRACES_SHIGANSHINA.precharger();
}

/** Tout ce qui est chargé à la demande (les tests de rendu l'attendent avant de rendre). */
export function prechargerToutesLesTraces(): Promise<unknown> {
  return Promise.all([prechargerFinDePartie(), prechargerShiganshina()]);
}
