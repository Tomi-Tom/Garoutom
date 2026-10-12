/**
 * Cuit les matières de « Caprices » en tuiles (SPEC § 4.1, § 4.5, § 4.6, § 4.8).
 *
 * Jamais de `feTurbulence` en direct sur mobile : les quatre grains
 * d'aquatinte, le grain du papier, les rousseurs et les deux bruits du
 * trait mordu sont rastérisés ici, une fois, depuis les `<defs>` de
 * `docs/design/caprices/textures.svg` (mêmes filtres, mêmes graines), et
 * rangés dans `public/matieres/`. Les tuiles sont livrées avec le dépôt : ce
 * script ne tourne qu'à la main, quand une recette change.
 *
 *   node packages/client/scripts/cuire-matieres.mjs
 *
 * Deux usages pour une même tuile de grain :
 * - en CSS, posée sur l'aplat du palier (`background: #17130F url(grain-IV.png)`) ;
 * - en SVG, par les filtres `aqua-*` de `<Matieres/>` (mêmes identifiants
 *   que textures.svg), qui la répètent au lieu de calculer le bruit.
 * Le grain est donc cuit **sans aplat**, à l'opacité de son palier ; le
 * filtre SVG la ramène à 1 (`feFuncA`), l'élément qui l'emploie remet la
 * sienne.
 *
 * Rastériseur : `sharp` (librsvg), déjà présent dans l'arbre des
 * dépendances (via wrangler) ; on n'en fait pas une dépendance du client.
 * Les grains en PNG à palette de deux teintes : le grain est seuillé
 * (α = 9R − k), deux tons le tiennent sans perte visible. Les bruits du
 * mordu (une carte de déplacement, continue) restent en couleurs pleines,
 * en petites tuiles de 64.
 */

import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '../../..');
const require = createRequire(resolve(racine, 'package.json'));
const sharp = require('sharp');

const textures = readFileSync(resolve(racine, 'docs/design/caprices/textures.svg'), 'utf8');
const defs = textures.match(/^<defs>[\s\S]*?^<\/defs>/m)?.[0];
if (defs === undefined) throw new Error('Les <defs> de textures.svg sont introuvables.');

const sortie = resolve(ici, '../public/matieres');
mkdirSync(sortie, { recursive: true });

/** L'opacité du grain de chaque palier (SPEC § 4.1) — miroir de `Matieres.tsx`. */
const PALIERS = { I: 0.18, II: 0.22, III: 0.2, IV: 0.28 };

/** Générateur pseudo-aléatoire à graine (le même que les planches du lot F). */
function hasard(graine) {
  let s = graine >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function cuire(nom, cote, vue, contenu, { palette = true, defsEnPlus = '', retouche, webp = false } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 ${vue} ${vue}">${defs}<defs>${defsEnPlus}</defs>${contenu}</svg>`;
  const fichier = resolve(sortie, `${nom}.${webp ? 'webp' : 'png'}`);
  const png = palette
    ? { palette: true, colours: 2, dither: 0, compressionLevel: 9, effort: 10 }
    : { compressionLevel: 9, effort: 10 };
  let image = sharp(Buffer.from(svg));
  if (retouche !== undefined) {
    // Retouche au pixel (RGBA non prémultiplié), puis réencodage.
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    retouche(data);
    image = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  await (webp ? image.webp({ quality: 70 }) : image.png(png)).toFile(fichier);
  return statSync(fichier).size;
}

/**
 * Le grain seuillé à mi-hauteur, à l'opacité de son palier : deux valeurs
 * exactes (transparent, grain), que la palette tient sans rien inventer.
 */
const seuiller = (opacite) => (data) => {
  const alpha = Math.round(255 * opacite);
  for (let i = 0; i < data.length; i += 4) data[i + 3] = data[i + 3] >= 128 ? alpha : 0;
};

/**
 * La carte de déplacement telle que Chrome la lit dans le filtre d'origine :
 * le rouge et le vert rapportés à l'alpha du bruit (R / A), l'alpha rendu
 * opaque — sans quoi la morsure s'aplatit en simple décalage.
 */
const rapporter = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    data[i] = a === 0 ? 128 : Math.min(255, Math.round(((data[i] ?? 0) * 255) / a));
    data[i + 1] = a === 0 ? 128 : Math.min(255, Math.round(((data[i + 1] ?? 0) * 255) / a));
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
};

let total = 0;
for (const [palier, opacite] of Object.entries(PALIERS)) {
  total += await cuire(
    `grain-${palier}`,
    512,
    256,
    `<rect width="256" height="256" fill="#000" filter="url(#aqua-${palier})"/>`,
    { retouche: seuiller(opacite) },
  );
}

// Le grain du papier : transparent, posé sur le vergé (opacité 0,22 cuite).
// Un grain doux (α = 1,2 R − 0,5), pas un seuil : la palette le tient tel quel,
// et une seule densité (256 px) lui suffit.
total += await cuire('papier', 256, 256, `<rect width="256" height="256" fill="#000" filter="url(#papier)" opacity="0.22"/>`);

// Les rousseurs : ocre, jamais sanguine (critique n° 6) ; 5 à 8 taches par
// tuile de 512, Ø 2 à 9 px, opacité 4 à 8 %.
const r = hasard(43);
let taches = '';
const nombre = 5 + Math.floor(r() * 4);
for (let i = 0; i < nombre; i += 1) {
  const cx = (r() * 512).toFixed(1);
  const cy = (r() * 512).toFixed(1);
  const rayon = (1 + r() * 3.5).toFixed(1);
  const opacite = (0.04 + r() * 0.04).toFixed(3);
  taches += `<circle cx="${cx}" cy="${cy}" r="${rayon}" opacity="${opacite}"/>`;
}
total += await cuire('rousseurs', 512, 512, `<g fill="#8C6A3F">${taches}</g>`);

// Les bruits du trait mordu (`mordu`, `mordu-fin`) : la carte de
// déplacement seule (rouge et vert rapportés à l'alpha, puis opaques),
// mêmes fréquences et mêmes graines que textures.svg. Une seule plaque de
// 512 unités (cuite en 128 px, WebP : le bruit est lisse), pas une tuile : Chrome
// refuse de déplacer d'après un feImage qui pointe un élément, le filtre
// la pose donc d'un bloc sur l'élément (voir Matieres.tsx).
const BRUITS = { mordu: [0.09, 2, 3], 'mordu-fin': [0.14, 1, 5] };
for (const [nom, [frequence, octaves, graine]] of Object.entries(BRUITS)) {
  total += await cuire(
    nom,
    128,
    512,
    `<rect width="512" height="512" filter="url(#bruit)"/>`,
    {
      webp: true,
      defsEnPlus: `<filter id="bruit" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="turbulence" baseFrequency="${frequence}" numOctaves="${octaves}" seed="${graine}"/></filter>`,
      retouche: rapporter,
    },
  );
}

console.log(`Matières cuites dans public/matieres : ${(total / 1024).toFixed(1)} Ko.`);
