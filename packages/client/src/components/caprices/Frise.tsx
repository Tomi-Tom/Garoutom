/**
 * La frise (SPEC § 5.7) : l'en-tête de partie, décor permanent du jeu.
 * Elle remplace `Decor.tsx`.
 *
 * Sur toute la largeur, un ciel en hachure horizontale (le jour, 28 %) ou
 * en aquatinte IV (la nuit), et en bas la **ligne de toits de
 * Thiercelieux** gravée — clocher à une fenêtre, potence à droite —, ou,
 * pour Shiganshina, **le Mur** crénelé, avec la nuit la tête d'un Colosse
 * derrière (§ 8). Le seul paysage de l'écran.
 *
 * Posés dessus, sur des cartouches pleins (aucune trame sous un mot) : à
 * gauche le lien retour (`gauche`) puis l'heure (`titre`, « Nuit II ») ; à
 * droite Ma carte, le menu, le son (`droite`). 56 px de haut, 64 sur
 * desktop ; identique pour tous la nuit.
 *
 * Les couleurs suivent le tirage (`--frise-toit`, `--frise-trait`…), le
 * dessin suit le skin et la largeur réelle.
 */

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

import { FRISE_COMMUNE, gravuresDuSkin } from '../habit/gravures.js';
import { useStore } from '../../lib/store.js';
import type { TraitFrise } from './traces.js';

/** La largeur et la hauteur réelles d'un élément ; 390 × 56 tant qu'on n'a pas mesuré. */
function useDimensions(ref: RefObject<HTMLElement | null>): { l: number; h: number } {
  const [dimensions, setDimensions] = useState({ l: 390, h: 56 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const mesurer = () => {
      const boite = el.getBoundingClientRect();
      if (boite.width <= 0 || boite.height <= 0) return;
      const l = Math.round(boite.width);
      const h = Math.round(boite.height);
      setDimensions((avant) => (avant.l === l && avant.h === h ? avant : { l, h }));
    };
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [ref]);
  return dimensions;
}

/** L'habit d'un trait : quelles variables le remplissent et le tracent. */
function habit(trait: TraitFrise): { fill: string; stroke?: string; className?: string; opacity?: number } {
  switch (trait.role) {
    case 'toit':
      return { fill: 'var(--frise-toit)', stroke: 'var(--frise-trait)' };
    case 'trait':
      return { fill: 'none', stroke: 'var(--frise-trait)' };
    case 'fenetre':
      return { fill: 'var(--frise-fenetre)' };
    case 'hachure-2':
      return { fill: 'url(#hach-2-e)', className: 'frise-jour-seul' };
    case 'hachure-3':
      return { fill: 'url(#hach-3-e)', className: 'frise-jour-seul' };
    case 'mur':
      return { fill: 'var(--frise-mur)', stroke: 'var(--frise-trait)' };
    case 'mur-hachure':
      return { fill: 'url(#hach-2-e)', className: 'frise-jour-seul', opacity: 0.5 };
    case 'joint':
      return { fill: 'none', stroke: 'var(--filet-doux)' };
    case 'colosse':
      return { fill: 'var(--cp-bistre-800)', className: 'frise-nuit-seule' };
    case 'yeux':
      return { fill: 'var(--cp-palier-3)', className: 'frise-nuit-seule' };
    case 'gyrophares':
      return { fill: 'var(--camp-meute)', className: 'frise-nuit-seule' };
    case 'lune':
      return { fill: 'none', stroke: 'var(--camp-meute)', className: 'frise-nuit-seule' };
    case 'veilleuse':
      return { fill: 'var(--cp-hachure-skin)' };
  }
}

export function Frise({
  titre,
  droite,
  gauche,
  skin,
}: {
  titre: string;
  droite?: ReactNode;
  gauche?: ReactNode;
  /** Le skin du décor ; par défaut, celui de la table. */
  skin?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { l, h } = useDimensions(ref);
  const skinDeLaTable = useStore((etat) => etat.room?.options.skin ?? 'thiercelieux');
  const decor = gravuresDuSkin(skin ?? skinDeLaTable)?.frise ?? FRISE_COMMUNE;
  const traits = useMemo(() => decor.dessiner(l, h), [decor, l, h]);

  return (
    <header ref={ref} className="frise" data-decor={decor.nom}>
      <svg
        className="frise-decor"
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${String(l)} ${String(h)}`}
        preserveAspectRatio="xMinYMax slice"
      >
        <rect className="frise-ciel" width={l} height={h} fill="url(#hach-h-e)" />
        {traits.map((trait, i) => {
          const { fill, stroke, className, opacity } = habit(trait);
          return (
            <path
              key={i}
              d={trait.d}
              fill={fill}
              stroke={stroke}
              strokeWidth={stroke === undefined ? undefined : (trait.epaisseur ?? 1)}
              strokeLinejoin="miter"
              className={className}
              opacity={opacity}
            />
          );
        })}
      </svg>
      {gauche !== undefined && <div className="frise-gauche">{gauche}</div>}
      <p className="frise-titre t-heure">{titre}</p>
      {droite !== undefined && <div className="frise-droite">{droite}</div>}
    </header>
  );
}
