/**
 * La barre au pouce (SPEC § 5.5) : collée en bas, 72 px (12 + 48 + 12),
 * fond `--surface`, filet supérieur 1,5. Elle porte l'action de jeu — le
 * primaire et son secondaire de 120 px, 8 px d'écart — et, la nuit chez le
 * dormeur, un seul appui long plein-largeur : même hauteur, même fond, même
 * variante pour tous (loi N1).
 *
 * Un bouton éteint ne s'explique pas par sa pâleur : la barre écrit une
 * **raison** dessous (`--t-statut`), et les `<Bouton>` éteints qu'elle porte
 * s'y relient d'eux-mêmes par `aria-describedby`.
 */

import { createContext, useContext, useId, type ReactNode } from 'react';

const RaisonContexte = createContext<string | undefined>(undefined);

/** L'identifiant de la raison de la barre englobante, s'il y en a une. */
export function useRaisonBarre(): string | undefined {
  return useContext(RaisonContexte);
}

export function BarrePouce({ children, raison }: { children: ReactNode; raison?: string }) {
  const id = useId();
  const avecRaison = raison !== undefined && raison !== '';
  return (
    <div
      role="group"
      aria-label="Votre action"
      className="barre-pouce"
      data-raison={avecRaison ? '' : undefined}
    >
      <div className="barre-pouce-rang">
        <RaisonContexte.Provider value={avecRaison ? id : undefined}>{children}</RaisonContexte.Provider>
      </div>
      {avecRaison && (
        <p id={id} className="barre-pouce-raison t-statut">
          {raison}
        </p>
      )}
    </div>
  );
}
