/**
 * La feuille basse (SPEC § 5.12) : du papier posé sur la planche. Fond
 * `--surface`, bord supérieur en double filet (1,5 + 0,75, écart 3), languette
 * de 40 × 4 à 8 px du bord, titre à gauche, « Refermer » (discret, 44) à
 * droite ; hauteur au contenu, 90 % au plus. Le voile est une aquatinte
 * (`.voile`), jamais un flou. Échap, toucher du voile ou glissé vers le bas
 * la ferment.
 *
 * Sert au registre ; les autres feuilles (règles, réglages, menu de table)
 * peuvent la reprendre.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Bouton } from '../../caprices/Bouton.js';

/** Le glissé vers le bas qui ferme : de combien de pixels. */
const SEUIL_GLISSE = 64;

export function FeuilleBasse({
  titre,
  onFermer,
  children,
}: {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
}) {
  const idTitre = useId();
  const feuille = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  // Échap ferme ; le focus entre dans la feuille et revient où il était.
  useEffect(() => {
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    feuille.current?.querySelector<HTMLElement>('[data-refermer]')?.focus();
    const surTouche = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        fermer.current();
      }
    };
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('keydown', surTouche);
      avant?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100]" data-testid="feuille-basse">
      <div className="voile absolute inset-0" aria-hidden="true" onClick={onFermer} />
      <div
        ref={feuille}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-[480px] flex-col bg-[var(--surface)] text-[var(--encre)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Le bord : double filet et languette. Le glissé se prend ici. */}
        <div
          data-poignee=""
          className="relative shrink-0 touch-none"
          style={{ height: 24, borderTop: '1.5px solid var(--filet)' }}
          onPointerDown={(event) => {
            depart.current = event.clientY;
          }}
          onPointerUp={(event) => {
            if (depart.current !== null && event.clientY - depart.current > SEUIL_GLISSE) onFermer();
            depart.current = null;
          }}
          onPointerCancel={() => {
            depart.current = null;
          }}
        >
          <div className="absolute inset-x-0 top-[3px] border-t-[0.75px] border-[var(--filet)]" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 -translate-x-1/2"
            style={{ width: 40, height: 4, background: 'var(--cp-palier-2)' }}
          />
        </div>
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
          <h2 id={idTitre} className="t-titre">
            {titre}
          </h2>
          <Bouton variante="discret" data-refermer="" onClick={onFermer}>
            Refermer
          </Bouton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
