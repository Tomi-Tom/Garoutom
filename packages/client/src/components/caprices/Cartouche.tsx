/**
 * Les cartouches de camp (SPEC § 5.3) : la forme dit le camp, le mot le
 * confirme — un cartouche sans mot est interdit. Grammaire Wolfwalkers
 * traduite en gravure ; elle passe le test du daltonisme parce que le mot
 * reste écrit dedans.
 *
 * | forme    | camp                 | dessin                                   |
 * |----------|----------------------|------------------------------------------|
 * | `ecu`    | le village           | écu à pans coupés, trait net 1,5         |
 * | `mordu`  | la meute             | écu mordu à droite, trait 2, mot en 600  |
 * | `seul`   | le Loup Blanc        | mordu des deux côtés ; plein le jour     |
 * | `lacs`   | le serment           | bout rond, double filet                  |
 * | `bruni`  | l'au-delà (les morts)| écu en pointillé 1,5 / 3, mot en italique|
 * | `neutre` | la carte cachée      | ovale en pointillé 3 / 3                 |
 *
 * Le fond est toujours `--surface` : jamais transparent sur une trame. Les
 * couleurs viennent des sémantiques (`styles.css`, `.cartouche`) ; le tracé
 * se cale sur la largeur mesurée du mot (estimée au premier rendu).
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { contourCartouche, largeurTexte } from './traces.js';

export type FormeCartouche = 'ecu' | 'mordu' | 'lacs' | 'bruni' | 'neutre' | 'seul';

/** Le texte brut d'un enfant, pour estimer la largeur avant toute mesure. */
function texteDe(noeud: ReactNode): string {
  if (typeof noeud === 'string' || typeof noeud === 'number') return String(noeud);
  if (Array.isArray(noeud)) return noeud.map(texteDe).join('');
  return '';
}

/** Le rembourrage horizontal de chaque forme (miroir de `.cartouche` dans styles.css). */
function rembourrage(forme: FormeCartouche, h: 20 | 30): number {
  const base = h === 30 ? 24 : 16;
  if (forme === 'mordu') return base + (h === 30 ? 13 : 9);
  if (forme === 'seul') return h === 30 ? 56 : 38;
  return base;
}

function Forme({ forme, l, h }: { forme: FormeCartouche; l: number; h: number }) {
  switch (forme) {
    case 'ecu':
      return <path d={contourCartouche('ecu', l, h)} strokeWidth={1.5} strokeLinejoin="miter" />;
    case 'mordu':
      return <path d={contourCartouche('mordu', l, h)} strokeWidth={2} strokeLinejoin="miter" />;
    case 'seul':
      return <path d={contourCartouche('mordu2', l, h)} strokeWidth={2} strokeLinejoin="miter" />;
    case 'bruni':
      return <path d={contourCartouche('ecu', l, h)} strokeWidth={1.2} strokeDasharray="1.5 3" />;
    case 'lacs': {
      const i = h >= 30 ? 3.5 : 2.6;
      return (
        <>
          <rect x={1} y={1} width={l - 2} height={h - 2} rx={h / 2 - 1} strokeWidth={2} />
          <rect
            className="cartouche-filet-interieur"
            x={i + 1}
            y={i + 1}
            width={Math.max(0, l - 2 * i - 2)}
            height={h - 2 * i - 2}
            rx={h / 2 - i - 1}
            strokeWidth={0.9}
          />
        </>
      );
    }
    case 'neutre':
      return <ellipse cx={l / 2} cy={h / 2} rx={l / 2 - 1} ry={h / 2 - 1} strokeWidth={1.4} strokeDasharray="3 3" />;
  }
}

export function Cartouche({
  forme,
  children,
  taille = 30,
  className,
}: {
  forme: FormeCartouche;
  children: ReactNode;
  taille?: 20 | 30;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const poids = forme === 'mordu' || forme === 'seul' ? 600 : 400;
  const estimee = Math.ceil(largeurTexte(texteDe(children), taille === 30 ? 14 : 12, poids) + rembourrage(forme, taille));
  const [largeur, setLargeur] = useState(estimee);

  // Le tracé suit la largeur réelle du mot (police chargée, grand texte…).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const mesurer = () => {
      const l = el.getBoundingClientRect().width;
      if (l > 0) setLargeur(Math.round(l * 100) / 100);
    };
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={className === undefined ? 'cartouche' : `cartouche ${className}`}
      data-forme={forme}
      data-taille={String(taille)}
    >
      <svg
        className="cartouche-forme"
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${String(largeur)} ${String(taille)}`}
        preserveAspectRatio="none"
      >
        <Forme forme={forme} l={largeur} h={taille} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
