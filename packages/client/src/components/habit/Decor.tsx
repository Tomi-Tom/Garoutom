/**
 * Le fond de matière derrière un écran — composant de compatibilité.
 *
 * Avant Caprices, ce décor peignait la place du village selon l'heure (ciel,
 * lune, fenêtres). La frise est désormais une primitive (`caprices/Frise.tsx`,
 * lot V1-A) et le tirage (papier le jour, cuivre la nuit) se pose sur la racine
 * par `data-tirage` : il ne reste ici que le fond de matière — la couleur du
 * tirage et les vergeures du papier —, pour que les écrans actuels gardent
 * leur fond jusqu'à la vague 2, qui retirera ce composant.
 *
 * Purement décoratif (aria-hidden), posé en `absolute inset-0 -z-10` par son
 * parent.
 */
export type Moment = 'salon' | 'nuit' | 'aube' | 'jour' | 'fin';

export function Decor({ moment, className }: { moment: Moment; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-decor={moment}
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ''}`}
      style={{ background: 'var(--fond, var(--nuit))' }}
    >
      {/* Les vergeures (motif `verge` de textures.svg) : visibles sur papier, fondues dans le cuivre. */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <rect width="100%" height="100%" fill="url(#verge)" />
      </svg>
    </div>
  );
}
