/**
 * Le planificateur de Node : des `setTimeout` qui ne font que réveiller `tick`.
 *
 * Le serveur ne garde aucune minuterie comme source de vérité (D20) : le cœur
 * calcule la prochaine échéance de chaque table (`nextWake`) et la confie à
 * `HostServices.wake(code, at)` ; l'hôte n'a qu'à rappeler `manager.tick(code)`
 * à ce moment-là — ou plus tard, ou deux fois : `tick` est idempotent. Ici,
 * c'est un `setTimeout` par table, remplacé à chaque appel, qui ne retient pas
 * le processus (`unref`).
 */

/** Ce que le planificateur demande au gestionnaire de tables. */
export interface CibleDeReveil {
  tick(code: string): Promise<void>;
  watchdog(): Promise<void>;
}

export interface Planificateur {
  /** `HostServices.wake` : le dernier appel pour un code remplace le précédent. */
  wake(code: string, at: number | null): void;
  /** Oublie tous les réveils (arrêt). */
  arreter(): void;
  /** Combien de réveils en attente — pour les tests. */
  readonly attente: number;
}

/** Le plus long délai qu'un `setTimeout` accepte (~24,8 jours). */
const DELAI_MAX_MS = 2 ** 31 - 1;

export interface OptionsPlanificateur {
  now?: () => number;
  journal?: (message: string, erreur: unknown) => void;
}

/**
 * `cible` est lue à chaque réveil, pas à la construction : le planificateur
 * est créé avant le gestionnaire (qui a besoin de `wake` pour naître).
 */
export function creerPlanificateur(
  cible: () => Pick<CibleDeReveil, 'tick'>,
  options: OptionsPlanificateur = {},
): Planificateur {
  const now = options.now ?? Date.now;
  const journal =
    options.journal ??
    ((message, erreur) => {
      console.error(message, erreur);
    });
  const minuteries = new Map<string, NodeJS.Timeout>();

  function armer(code: string, at: number): void {
    const delai = Math.min(Math.max(0, at - now()), DELAI_MAX_MS);
    const minuterie = setTimeout(() => {
      minuteries.delete(code);
      // Échéance plus lointaine que le plafond de setTimeout : on réarme.
      if (at - now() > 0 && delai === DELAI_MAX_MS) {
        armer(code, at);
        return;
      }
      try {
        cible()
          .tick(code)
          .catch((erreur: unknown) => {
            journal(`tick(${code}) a échoué`, erreur);
          });
      } catch (erreur) {
        journal(`tick(${code}) a levé`, erreur);
      }
    }, delai);
    minuterie.unref();
    minuteries.set(code, minuterie);
  }

  return {
    wake(code, at) {
      const ancienne = minuteries.get(code);
      if (ancienne) {
        clearTimeout(ancienne);
        minuteries.delete(code);
      }
      if (at !== null && Number.isFinite(at)) armer(code, at);
    },
    arreter() {
      for (const minuterie of minuteries.values()) clearTimeout(minuterie);
      minuteries.clear();
    },
    get attente() {
      return minuteries.size;
    },
  };
}

/**
 * Le chien de garde : `manager.watchdog()` toutes les 10 s. Une erreur est
 * journalisée, jamais propagée ; le tour suivant n'attend pas la fin d'un
 * tour qui traîne. Rend la fonction d'arrêt.
 */
export function lancerChienDeGarde(
  cible: () => Pick<CibleDeReveil, 'watchdog'>,
  periodeMs = 10_000,
  journal: (message: string, erreur: unknown) => void = (message, erreur) => {
    console.error(message, erreur);
  },
): () => void {
  let enCours = false;
  const intervalle = setInterval(() => {
    if (enCours) return;
    enCours = true;
    try {
      cible()
        .watchdog()
        .catch((erreur: unknown) => {
          journal('chien de garde en échec', erreur);
        })
        .finally(() => {
          enCours = false;
        });
    } catch (erreur) {
      enCours = false;
      journal('chien de garde a levé', erreur);
    }
  }, periodeMs);
  intervalle.unref();
  return () => {
    clearInterval(intervalle);
  };
}
