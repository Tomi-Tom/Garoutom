/**
 * La feuille basse (SPEC Caprices § 5.12), commune aux règles et aux réglages.
 *
 * Du papier posé sur la planche : fond `--surface`, bord supérieur en double
 * filet (1,5 + 0,75), languette de 40 × 4 au palier II, le titre à gauche,
 * « Refermer » (discret, 44) à droite ; hauteur au contenu, 90 % au plus ;
 * le voile est une aquatinte, jamais un flou. Elle entre en `--m-tirage`.
 *
 * Le contrat d'accessibilité ne change pas : `role="dialog"` et
 * `aria-modal`, focus piégé dans la feuille, Échap, toucher du voile ou
 * glissé vers le bas ferment, le focus revient au bouton qui l'a ouverte.
 * La feuille voyage en portail jusqu'au `body` : les boutons qui
 * l'ouvrent vivent parfois dans un contexte d'empilement clos (la frise
 * isole ses couches, la feuille basse du menu déjà portalée), où un
 * `position: fixed` y resterait pris. Au `body`, elle se pose au-dessus
 * de tout — le z le plus haut de la planche.
 */

import { motion, useReducedMotion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { TIRAGE_FEUILLE, TIRAGE_FEUILLE_REDUIT } from '../anim/tokens.js';
import { Bouton } from './caprices/index.js';

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** De combien il faut tirer la languette vers le bas pour refermer la feuille. */
const GLISSE_FERME_PX = 64;

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
  const reduit = useReducedMotion() === true;
  const glisse = useRef<{ pointeur: number; depart: number } | null>(null);

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
    // Seules les cibles qu'atteint la tabulation comptent : un onglet à
    // tabindex -1 (le motif des onglets) ne ferme pas la boucle.
    const cibles = [...boite.current.querySelectorAll<HTMLElement>(FOCALISABLES)].filter((cible) => cible.tabIndex >= 0);
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

  // Le glissé vers le bas, pris à la languette et à l'en-tête seulement : le
  // contenu défile sans refermer la feuille.
  const poseLeDoigt = (evenement: PointerEvent) => {
    if (evenement.target instanceof Element && evenement.target.closest('button') !== null) return;
    glisse.current = { pointeur: evenement.pointerId, depart: evenement.clientY };
  };
  const leveLeDoigt = (evenement: PointerEvent) => {
    const geste = glisse.current;
    glisse.current = null;
    if (geste === null || geste.pointeur !== evenement.pointerId) return;
    if (evenement.clientY - geste.depart >= GLISSE_FERME_PX) fermer.current();
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center" onKeyDown={surTouche}>
      {/* Le voile : une aquatinte posée sur la planche (§ 3.8). */}
      <div
        aria-hidden="true"
        data-voile=""
        className="voile absolute inset-0"
        onMouseDown={() => fermer.current()}
      />
      <motion.div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        data-testid={testid}
        data-feuille=""
        initial={{ y: reduit ? 0 : 48 }}
        animate={{ y: 0 }}
        transition={reduit ? TIRAGE_FEUILLE_REDUIT : TIRAGE_FEUILLE}
        className="relative flex max-h-[90%] w-[min(40rem,100%)] flex-col overflow-hidden bg-surface text-encre"
        style={{
          borderTop: '1.5px solid var(--filet)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Le second filet du double filet, à 3 px sous le premier. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{ top: 3, height: 0.75, background: 'var(--filet)' }}
        />
        <div onPointerDown={poseLeDoigt} onPointerUp={leveLeDoigt} style={{ touchAction: 'none' }}>
          <div
            aria-hidden="true"
            data-languette=""
            className="mx-auto mt-2"
            style={{ width: 40, height: 4, background: 'var(--cp-palier-2, var(--filet-doux))' }}
          />
          <div className="flex min-h-11 items-center justify-between gap-3 px-4 pt-2 pb-1">
            <h2 id={idTitre} className="t-titre m-0">
              {titre}
            </h2>
            <Bouton variante="discret" onClick={() => fermer.current()}>
              Refermer
            </Bouton>
          </div>
        </div>
        <div className="overflow-y-auto px-4 pt-2 pb-4">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
