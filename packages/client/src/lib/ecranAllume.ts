/**
 * L'écran allumé (Screen Wake Lock, recherche 04 — P0 n° 1, D23).
 *
 * Autour d'une vraie table, le téléphone reste posé des minutes sans qu'on
 * le touche : la nuit, pendant les débats. S'il s'éteint, il se verrouille,
 * et la socket meurt avec lui — c'est la première cause de coupure. On
 * demande donc au navigateur de garder l'écran allumé **dès le salon** et
 * toute la partie, et l'on rend le verrou hors table.
 *
 * Le navigateur relâche lui-même le verrou quand l'onglet passe en arrière-
 * plan : on le redemande à chaque retour au premier plan. Un navigateur qui
 * ne le connaît pas, ou qui le refuse (économie d'énergie, page non sûre),
 * ne dit rien et ne casse rien : le jeu se passe du verrou.
 */

import { useEffect } from 'react';

/** Ce qu'on attend du verrou, sans dépendre d'une version précise des types du DOM. */
interface Sentinelle {
  released: boolean;
  release: () => Promise<void>;
}

interface VerrouEcran {
  request: (type: 'screen') => Promise<Sentinelle>;
}

function verrouDuNavigateur(): VerrouEcran | null {
  if (typeof navigator === 'undefined') return null;
  const verrou = (navigator as { wakeLock?: VerrouEcran }).wakeLock;
  return verrou !== undefined && typeof verrou.request === 'function' ? verrou : null;
}

/**
 * Garde l'écran allumé tant que `actif` est vrai, et le redemande à chaque
 * retour au premier plan. Silencieux si le navigateur ne sait pas faire.
 */
export function useEcranAllume(actif: boolean): void {
  useEffect(() => {
    if (!actif) return;
    const verrou = verrouDuNavigateur();
    if (verrou === null || typeof document === 'undefined') return;

    let sentinelle: Sentinelle | null = null;
    let enVol = false;
    let fini = false;

    const demander = async (): Promise<void> => {
      if (fini || enVol || document.visibilityState !== 'visible') return;
      if (sentinelle !== null && !sentinelle.released) return;
      enVol = true;
      try {
        const obtenue = await verrou.request('screen');
        if (fini) {
          // Démonté pendant la demande : on rend aussitôt.
          await obtenue.release().catch(() => undefined);
          return;
        }
        sentinelle = obtenue;
      } catch {
        // Refusé (batterie faible, page en arrière-plan) : on réessaiera au retour.
      } finally {
        enVol = false;
      }
    };

    const surVisibilite = (): void => {
      if (document.visibilityState === 'visible') void demander();
    };

    void demander();
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      fini = true;
      document.removeEventListener('visibilitychange', surVisibilite);
      const tenue = sentinelle;
      sentinelle = null;
      if (tenue !== null && !tenue.released) void tenue.release().catch(() => undefined);
    };
  }, [actif]);
}
