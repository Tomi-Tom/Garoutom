/**
 * Les matières de « Caprices », posées une seule fois dans la page (SPEC § 4).
 *
 * Un `<svg>` caché porte les `<defs>` de `docs/design/caprices/textures.svg`
 * — lues à la source, identifiants inchangés : hachures (`hach-1-e`…),
 * grains d'aquatinte (`aqua-I` à `aqua-IV`), papier, trait mordu
 * (`mordu`, `mordu-fin`), cartouches (`cart-ecu`…), glyphes d'état
 * (`g-sceau`…) — puis les trois motifs propres au lot F (`lf-barre-v`,
 * `lf-hachx-p2`, `lf-hach-1-p2`, `generateurs/lotF/lib.mjs`). Tout SVG de
 * l'app peut alors écrire `fill="url(#hach-1-e)"` ou `filter="url(#aqua-IV)"`.
 *
 * **Tuiles ou calcul direct (§ 4.8).** `feTurbulence` en direct est interdit
 * sur mobile : par défaut, les filtres `aqua-*`, `papier`, `mordu` et
 * `mordu-fin` gardent leur identifiant mais **répètent une tuile cuite**
 * (`scripts/cuire-matieres.mjs`, `public/matieres/`) au lieu de calculer le
 * bruit. Pour les grains, un `feImage` pointe un grand rectangle rempli
 * d'un `<pattern>` d'image, ancré dans l'espace de l'élément filtré comme
 * l'était le bruit ; pour le mordu, la carte de déplacement cuite est posée
 * d'un bloc sur l'élément. Les filtres calculés d'origine ne servent qu'au desktop (écran large,
 * pointeur fin), où le § 4.8 les permet, ou si on les demande (`mode`).
 * Les composants n'ont rien à changer : `url(#aqua-IV)` reste `url(#aqua-IV)`.
 *
 * (Firefox ne sait pas encore pointer un élément depuis `feImage` : il y
 * perd le grain, jamais la forme ni le mot.)
 *
 * Il porte aussi le voile de la bascule de l'heure (`useTirage()` pose
 * `data-bascule` sur <html>, `styles.css` l'anime en quatre paliers).
 *
 * Monté une fois, par `App`.
 */

import { useEffect, useState } from 'react';

import textures from '../../../../../docs/design/caprices/textures.svg?raw';

/** Le contenu du premier `<defs>` de textures.svg (la planche de démonstration est laissée). */
function extraireDefs(source: string): string {
  const trouve = /<defs>([\s\S]*?)<\/defs>/.exec(source);
  if (trouve?.[1] === undefined) throw new Error('textures.svg : <defs> introuvable');
  return trouve[1];
}

/** Les motifs du lot F qui complètent textures.svg sans en changer un identifiant. */
const DEFS_LOT_F = `<pattern id="lf-barre-v" width="4" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="4" y2="1.5" stroke="#E8DFCB" stroke-width="0.9"/></pattern>
<pattern id="lf-hachx-p2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V4M0 0H4" stroke="#7A7064" stroke-width="0.7" fill="none"/></pattern>
<pattern id="lf-hach-1-p2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7A7064" stroke-width="0.6"/></pattern>`;

/** L'opacité à laquelle chaque grain est cuit (miroir de `cuire-matieres.mjs`). */
const GRAINS = { 'aqua-I': ['grain-I', 0.18], 'aqua-II': ['grain-II', 0.22], 'aqua-III': ['grain-III', 0.2], 'aqua-IV': ['grain-IV', 0.28], papier: ['papier', 0.22] } as const;

/** Les bruits du mordu : échelle du déplacement, dilatation éventuelle. */
const BRUITS = { mordu: [2.6, 0.35], 'mordu-fin': [1.2, 0] } as const;

/**
 * Une tuile répétée, ancrée dans l'espace de l'élément filtré : un motif
 * d'image, et un grand rectangle qui le porte (que `feImage` pointe).
 */
function plaque(nom: string, cote: number): string {
  return (
    `<pattern id="mat-motif-${nom}" width="${String(cote)}" height="${String(cote)}" patternUnits="userSpaceOnUse">` +
    `<image href="/matieres/${nom}.png" width="${String(cote)}" height="${String(cote)}"/></pattern>` +
    `<rect id="mat-plaque-${nom}" x="-4096" y="-4096" width="8192" height="8192" fill="url(#mat-motif-${nom})"/>`
  );
}

/** Les filtres d'origine, remplacés par leur version en tuiles (mêmes identifiants, mêmes régions). */
function enTuiles(defs: string): string {
  let sortie = defs;
  let plaques = '';
  for (const [id, [tuile, opacite]] of Object.entries(GRAINS)) {
    plaques += plaque(tuile, 256);
    const filtre =
      `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feImage href="#mat-plaque-${tuile}" result="tuile"/>` +
      `<feComponentTransfer in="tuile" result="g"><feFuncA type="linear" slope="${(1 / opacite).toFixed(4)}"/></feComponentTransfer>` +
      `<feComposite in="g" in2="SourceGraphic" operator="in"/></filter>`;
    sortie = remplacerFiltre(sortie, id, filtre);
  }
  // Le mordu ne passe pas par une plaque : Chrome refuse de déplacer d'après
  // un feImage qui pointe un élément. La carte de déplacement (512 unités)
  // est donc posée d'un bloc sur l'élément, en le couvrant : la morsure garde
  // son grain sur les formats du § 4.6 (96 à ~440 unités), sans répétition.
  for (const [id, [echelle, dilatation]] of Object.entries(BRUITS)) {
    const filtre =
      `<filter id="${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">` +
      `<feImage href="/matieres/${id}.webp" preserveAspectRatio="xMinYMin slice" result="t"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="t" scale="${String(echelle)}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      (dilatation > 0 ? `<feMorphology in="d" operator="dilate" radius="${String(dilatation)}"/>` : '') +
      `</filter>`;
    sortie = remplacerFiltre(sortie, id, filtre);
  }
  return plaques + sortie;
}

function remplacerFiltre(defs: string, id: string, filtre: string): string {
  const motif = new RegExp(`<filter id="${id}"[\\s\\S]*?</filter>`);
  if (!motif.test(defs)) throw new Error(`textures.svg : filtre ${id} introuvable`);
  return defs.replace(motif, filtre);
}

const DEFS_TEXTURES = extraireDefs(textures);

/** Les `<defs>` complètes, filtres calculés (desktop). */
export const DEFS_MATIERES = `<defs>${DEFS_TEXTURES}${DEFS_LOT_F}</defs>`;
/** Les `<defs>` complètes, grains et morsures en tuiles (mobile, et par défaut). */
export const DEFS_MATIERES_TUILES = `<defs>${enTuiles(DEFS_TEXTURES)}${DEFS_LOT_F}</defs>`;

export type ModeMatieres = 'tuiles' | 'direct';

/** Le desktop où le § 4.8 permet le calcul direct : écran large, pointeur fin. */
const REQUETE_DIRECT = '(min-width: 64rem) and (hover: hover) and (pointer: fine)';

function modeDuSysteme(): ModeMatieres {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'tuiles';
  return window.matchMedia(REQUETE_DIRECT).matches ? 'direct' : 'tuiles';
}

export function Matieres({ mode }: { mode?: ModeMatieres }) {
  const [modeSysteme, setModeSysteme] = useState<ModeMatieres>(modeDuSysteme);
  useEffect(() => {
    if (mode !== undefined || typeof window.matchMedia !== 'function') return;
    const requete = window.matchMedia(REQUETE_DIRECT);
    const suivre = () => setModeSysteme(requete.matches ? 'direct' : 'tuiles');
    requete.addEventListener?.('change', suivre);
    return () => requete.removeEventListener?.('change', suivre);
  }, [mode]);
  const effectif = mode ?? modeSysteme;

  return (
    <>
      <svg
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        data-testid="matieres"
        data-mode={effectif}
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: effectif === 'direct' ? DEFS_MATIERES : DEFS_MATIERES_TUILES }}
      />
      <div className="voile-bascule" aria-hidden="true" data-anim-fonctionnelle="" />
    </>
  );
}
