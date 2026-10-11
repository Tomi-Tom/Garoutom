/**
 * Un panneau modal accessible, commun aux règles et aux réglages.
 *
 * `role="dialog"` et `aria-modal`, focus piégé dans le panneau, Échap et clic
 * sur le fond ferment, le focus revient au bouton qui l'a ouvert. Pas de
 * portail : le panneau se pose en `fixed` au-dessus de tout.
 */

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Panneau({
  titre,
  onFermer,
  children,
  testid,
}: {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
  testid?: string;
}) {
  const idTitre = useId();
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.querySelector<HTMLElement>(FOCALISABLES)?.focus();
    return () => avant?.focus();
  }, []);

  const surTouche = (evenement: KeyboardEvent) => {
    if (evenement.key === 'Escape') {
      evenement.stopPropagation();
      fermer.current();
      return;
    }
    if (evenement.key !== 'Tab' || boite.current === null) return;
    const cibles = [...boite.current.querySelectorAll<HTMLElement>(FOCALISABLES)];
    const premiere = cibles[0];
    const derniere = cibles[cibles.length - 1];
    if (premiere === undefined || derniere === undefined) return;
    const actif = document.activeElement;
    if (evenement.shiftKey && (actif === premiere || !boite.current.contains(actif))) {
      evenement.preventDefault();
      derniere.focus();
    } else if (!evenement.shiftKey && (actif === derniere || !boite.current.contains(actif))) {
      evenement.preventDefault();
      premiere.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6"
      style={{ background: 'rgb(8 10 18 / 0.78)' }}
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) fermer.current();
      }}
      onKeyDown={surTouche}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        data-testid={testid}
        className="carte flex max-h-full w-[min(40rem,100%)] flex-col overflow-hidden"
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--arcade-trait)' }}
        >
          <h2 id={idTitre} className="font-identite text-2xl font-bold">
            {titre}
          </h2>
          <button
            type="button"
            onClick={() => fermer.current()}
            aria-label="Fermer"
            className="btn-voisin grid size-11 place-items-center rounded-lg text-xl"
            style={{ padding: 0 }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
