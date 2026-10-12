/**
 * Un module chargé à la demande (`import()` dynamique), lisible de façon
 * synchrone dès qu'il est arrivé.
 *
 * Le paquet initial ne porte que ce que l'accueil montre ; le reste (les
 * écrans de table, les vignettes du récit, les gravures de Shiganshina…) part
 * dans des morceaux à part. Plutôt que `React.lazy` et ses `<Suspense>`, un
 * petit cache : tant que le module n'est pas là, le crochet rend `undefined`
 * (le composant pose un repli sobre — rien, ou la gravure de Thiercelieux) et
 * lance le chargement ; à l'arrivée, il re-rend. Une fois le module en cache,
 * tout rendu le lit tout de suite, sans repli ni rendu de plus.
 *
 * On précharge (`precharger()`, sans attendre) au bon moment — à l'ouverture
 * de l'app pour les écrans, au lancement de la partie pour la fin, au choix du
 * skin pour Shiganshina —, si bien que le repli ne se voit presque jamais.
 * Les tests attendent `precharger()` avant de rendre (setup de vitest) : leurs
 * rendus restent synchrones.
 */
import { useEffect, useState } from 'react';

export interface ModuleParesseux<M> {
  /** Le module s'il est déjà chargé, sinon `undefined` (synchrone, sans rien lancer). */
  courant(): M | undefined;
  /** Lance le chargement s'il ne l'est pas déjà ; la promesse rend le module. Un échec pourra être retenté. */
  precharger(): Promise<M>;
  /**
   * Le crochet : le module, ou `undefined` tant qu'il charge (le composant
   * re-rend à son arrivée). `actif` à faux : rien n'est chargé, rien n'est rendu.
   */
  useModule(actif?: boolean): M | undefined;
}

export function paresseux<M>(charger: () => Promise<M>): ModuleParesseux<M> {
  let module: M | undefined;
  let promesse: Promise<M> | undefined;

  const precharger = (): Promise<M> => {
    promesse ??= charger().then(
      (m) => {
        module = m;
        return m;
      },
      (erreur: unknown) => {
        // Le réseau a manqué : le prochain rendu (ou préchargement) réessaiera.
        promesse = undefined;
        throw erreur;
      },
    );
    return promesse;
  };

  function useModule(actif = true): M | undefined {
    // L'état ne sert qu'à re-rendre à l'arrivée du module ; la valeur rendue
    // est toujours celle du cache, à jour au moment du rendu.
    const [, setVu] = useState<M | undefined>(module);
    useEffect(() => {
      if (!actif) return;
      if (module !== undefined) {
        // Arrivé entre le rendu et l'effet : un rendu de plus (sans effet s'il l'avait déjà vu).
        setVu(module);
        return;
      }
      let monte = true;
      precharger().then(
        (m) => {
          if (monte) setVu(m);
        },
        (erreur: unknown) => {
          console.warn('Garoutom : un morceau du client n’a pas pu être chargé.', erreur);
        },
      );
      return () => {
        monte = false;
      };
    }, [actif]);
    return actif ? module : undefined;
  }

  return { courant: () => module, precharger, useModule };
}
