// Caprices · lot E2a — socle du générateur d'artboards (.dc.html).
// Tokens du SPEC § 3 ; les <defs> de textures.svg sont lues et collées telles quelles.
import { readFileSync, writeFileSync } from 'node:fs';

export const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project/';
const TEX = readFileSync('D:/TomArcade/Garoutom/docs/design/caprices/textures.svg', 'utf8');
// (l'en-tête de textures.svg cite « <defs> » dans un commentaire : on ancre en début de ligne)
export const DEFS = TEX.match(/^<defs>[\s\S]*?^<\/defs>/m)[0];

export const FONTS = 'https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap';

export const FELL = "'IM Fell French Canon', Georgia, serif";
export const FELLSC = "'IM Fell French Canon SC', Georgia, serif";
export const SERIF = "'Source Serif 4', Georgia, serif";

// Sémantiques par tirage (§ 3.3)
export const PAPIER = {
  nom: 'papier', fond: '#E8DFCB', fondPlanche: '#E1D7C1', surface: '#F5EFE2', creux: '#E1D7C1',
  encre: '#17130F', encre2: '#5E554A', narr: '#5E554A', filet: '#17130F', filetDoux: '#7A7064',
  surEncre: '#F5EFE2', meute: '#A23B24', serment: '#8A3A5C', audela: '#5E554A',
  mortTrait: '#7A7064', mortTexte: '#5E554A', silhouette: '#A89D8C',
  actionFond: '#17130F', actionTexte: '#F5EFE2', actionBord: '#17130F',
  cranPlein: '#17130F', cranVide: '#7A7064', h: 'e', voile: '#7A7064', voileOp: 0.6,
};
export const CUIVRE = {
  nom: 'cuivre', fond: '#17130F', fondPlanche: '#17130F', surface: '#2A241E', creux: '#0F0C09',
  encre: '#E8DFCB', encre2: '#A89D8C', narr: '#A89D8C', filet: '#7A7064', filetDoux: '#4A433B',
  surEncre: '#17130F', meute: '#D9765A', serment: '#D29AA6', audela: '#A89D8C',
  mortTrait: '#7A7064', mortTexte: '#A89D8C', silhouette: '#A89D8C',
  actionFond: '#4A433B', actionTexte: '#E8DFCB', actionBord: '#A89D8C',
  cranPlein: '#7A7064', cranVide: '#4A433B', h: 'v', voile: '#17130F', voileOp: 0.72,
};

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const st = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}: ${typeof v === 'number' && !/opacity|weight|z-?index|flex|line-?height/i.test(k) ? v + 'px' : v}`).join('; ');
export const abs = (l, t, w, h, more = {}) => st({ position: 'absolute', left: l, top: t, width: w, height: h, boxSizing: 'border-box', ...more });

// Largeur approchée d'un texte en Source Serif (pour dimensionner cartouches et puces)
export const larg = (txt, size, gras = false) => Math.round([...txt].reduce((a, c) => a + (/[iljtf’'.,:·\s]/.test(c) ? 0.3 : /[mwMW]/.test(c) ? 0.82 : /[A-Z]/.test(c) ? 0.66 : 0.52), 0) * size * (gras ? 1.06 : 1));

// Rousseurs : ocre #8C6A3F, jamais la sanguine (§ 4.5)
function rousseurs(w, h) {
  const pts = [[0.08, 0.31, 5, 0.07], [0.83, 0.05, 6, 0.05], [0.47, 0.92, 7, 0.045], [0.94, 0.55, 3.5, 0.07], [0.22, 0.74, 2.5, 0.08], [0.66, 0.38, 4, 0.05]];
  return pts.map(([x, y, r, o]) => `<circle cx="${Math.round(x * w)}" cy="${Math.round(y * h)}" r="${r}" opacity="${o}"></circle>`).join('');
}

export function fondMatiere(T, w, h, l = 0, t = 0) {
  if (T.nom === 'papier') {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="${abs(l, t, w, h, { pointerEvents: 'none' })}"><rect width="${w}" height="${h}" fill="#000" filter="url(#papier)" opacity="0.22"></rect><g fill="#8C6A3F">${rousseurs(w, h)}</g></svg>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="${abs(l, t, w, h, { pointerEvents: 'none' })}"><rect width="${w}" height="${h}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"></rect></svg>`;
}

export const papierCSS = 'repeating-linear-gradient(90deg, rgba(23,19,15,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(23,19,15,.035) 0 .6px, transparent .6px 3px)';

export function page({ fichier, titre, w, h, T, corps, defsEnPlus = '' }) {
  const root = st({ width: w, height: h, boxSizing: 'border-box', position: 'relative', overflow: 'hidden', backgroundColor: T.fond,
    backgroundImage: T.nom === 'papier' ? papierCSS : 'none', fontFamily: SERIF, color: T.encre, fontOpticalSizing: 'auto' });
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(titre)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="${FONTS}" rel="stylesheet">
<style>
body{margin:0}
a{color:#666}a:hover{color:#333}
</style>
</helmet>
<div data-tirage="${T.nom}" style="${root}">
<svg width="0" height="0" style="position: absolute; width: 0; height: 0;" aria-hidden="true">
${DEFS}
${defsEnPlus ? `<defs>${defsEnPlus}</defs>` : ''}
</svg>
${fondMatiere(T, w, h)}
${corps}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;
  writeFileSync(OUT + fichier, html, 'utf8');
  console.log('écrit', fichier, html.length);
}

/* ---------- Glyphes d'état 16 (repris de textures.svg, coloriés par tirage) ---------- */
export function glyphe(nom, x, y, taille, T, couleur) {
  const c = couleur || T.encre, s = taille / 16;
  const g = (inner) => `<g transform="translate(${(x - taille / 2).toFixed(2)} ${(y - taille / 2).toFixed(2)}) scale(${s.toFixed(4)})">${inner}</g>`;
  switch (nom) {
    case 'sceau': return g(`<circle cx="8" cy="8" r="7.5" fill="${c}"></circle><path d="M4.5 8.2 L7 10.6 L11.6 5.4" fill="none" stroke="${T.surEncre}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>`);
    case 'chandelle': return g(`<path d="M6 15 V7 H10 V15 Z" fill="none" stroke="${c}" stroke-width="1.25"></path><path d="M8 6 C7 4.5 9 3.5 8 1.5 M8.8 5.5 C10 4.5 9.4 3 10.4 2" fill="none" stroke="${c}" stroke-width="0.9" stroke-linecap="round"></path><path d="M4 15 H12" stroke="${c}" stroke-width="1.25"></path>`);
    case 'corde': return g(`<path d="M8 1 V6.5 M8 9.5 V11" stroke="${c}" stroke-width="1.25" stroke-linecap="round"></path><path d="M6.2 6.6 L9.8 9.4" stroke="${c}" stroke-width="1"></path><circle cx="8" cy="13" r="2" fill="none" stroke="${c}" stroke-width="1.25"></circle>`);
    case 'horsvote': return g(`<path d="M1.5 5.5 H10 C11 5.5 11 7.5 10 7.5 H6 M10 5.5 C12.5 5.5 14 7 14 9.5 V11 C14 12.8 12.8 14 11 14 H7.5 C6 14 5 13 5 11.5 V7.5" fill="none" stroke="${c}" stroke-width="1.25" stroke-linejoin="round"></path><path d="M2 14.5 L14.5 2" stroke="${c}" stroke-width="1.5" stroke-linecap="round"></path>`);
    case 'chaise': return g(`<path d="M5 1.5 H10 V9 M5 1.5 V15 M5 9 H12.5 M12.5 9 V15 M10 9 V13" fill="none" stroke="${c}" stroke-width="1.25" stroke-linecap="square"></path>`);
    case 'index': return g(`<path d="M1.5 5.5 H10 C11 5.5 11 7.5 10 7.5 H6 M10 5.5 C12.5 5.5 14 7 14 9.5 V11 C14 12.8 12.8 14 11 14 H7.5 C6 14 5 13 5 11.5 V7.5 M7.5 10.5 H11.5" fill="none" stroke="${c}" stroke-width="1.25" stroke-linejoin="round"></path>`);
    case 'lacs': return g(`<circle cx="6" cy="8" r="4.2" fill="none" stroke="${c}" stroke-width="1.6"></circle><circle cx="10" cy="8" r="4.2" fill="none" stroke="${c}" stroke-width="1.6"></circle>`);
    case 'plume': return g(`<path d="M14 2 C8 3 4 7 2.5 14 M14 2 C13 7 9 11 4 11.5" fill="none" stroke="${c}" stroke-width="1.25" stroke-linecap="round"></path><path d="M6 9.5 L9 6.5 M7.5 10.5 L10.5 7.5" stroke="${c}" stroke-width="0.75"></path>`);
    default: return '';
  }
}

/* ---------- Icônes d'interface, grille 24, trait 1,5 (§ 6.3) ---------- */
export function icone(nom, T, taille = 24, couleur) {
  const c = couleur || T.encre;
  const P = (d, w = 1.5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"></path>`;
  let inner = '';
  switch (nom) {
    case 'retour': inner = P('M14.5 5 L7.5 12 L14.5 19') + P('M8 12 H19.5', 1.25); break;
    case 'menu': inner = P('M4 6.5 H20') + P('M4 12 H17') + P('M4 17.5 H19'); break;
    case 'carte': inner = `<path d="M5.5 3.5 H15 L18.5 7 V20.5 H5.5 Z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"></path>${P('M15 3.5 V7 H18.5', 1.1)}${P('M8 10 L11 7 M8 14 L14 8 M8 18 L16 10 M11.5 18.5 L16 14', 0.75)}`; break;
    case 'cloche': inner = P('M6 16.5 C7 14.5 7 12 7 10 C7 6.8 9.2 4.8 12 4.8 C14.8 4.8 17 6.8 17 10 C17 12 17 14.5 18 16.5 Z') + P('M4.5 16.5 H19.5') + P('M12 2.8 V4.8', 1.25) + `<circle cx="12" cy="19.2" r="1.6" fill="none" stroke="${c}" stroke-width="1.5"></circle>`; break;
    case 'sablier': inner = P('M6.5 3.5 H17.5 M6.5 20.5 H17.5') + P('M7.5 3.5 C7.5 8 12 10 12 12 C12 14 7.5 16 7.5 20.5 M16.5 3.5 C16.5 8 12 10 12 12 C12 14 16.5 16 16.5 20.5', 1.25) + P('M9 18.5 L12 16.6 L15 18.5 M10.5 18.8 L12 17.8', 0.75); break;
    case 'sablier-retourne': inner = P('M6.5 3.5 H17.5 M6.5 20.5 H17.5') + P('M7.5 3.5 C7.5 8 12 10 12 12 C12 14 7.5 16 7.5 20.5 M16.5 3.5 C16.5 8 12 10 12 12 C12 14 16.5 16 16.5 20.5', 1.25) + P('M9 5.5 L12 7.4 L15 5.5 M10.5 5.2 L12 6.2', 0.75); break;
    case 'phylactere': inner = P('M3.5 6 C6 4.5 8 7.5 11 6 C14 4.5 16 7.5 20.5 6 V15 C16 16.5 14 13.5 11 15 C8 16.5 6 13.5 3.5 15 Z') + P('M7 9 H17 M7 12 H14', 1); break;
    case 'chevron-haut': inner = P('M6 15 L12 9 L18 15'); break;
    case 'chevron-bas': inner = P('M6 9 L12 15 L18 9'); break;
    case 'index': inner = P('M2.5 9 H14 C15.4 9 15.4 11.6 14 11.6 H9 M14 9 C17.6 9 20 11 20 14.5 V16 C20 18.6 18.4 20.5 15.8 20.5 H11 C9 20.5 7.6 19 7.6 17 V11.6 M11 15.5 H16.6'); break;
    case 'main': inner = P('M8 20.5 C6 18.5 4.6 16 4.6 13 V9.5 C4.6 8.4 6.4 8.4 6.4 9.5 V12.5 M6.4 12 V5.5 C6.4 4.4 8.2 4.4 8.2 5.5 V11.5 M8.2 11.5 V4.2 C8.2 3.1 10 3.1 10 4.2 V11.5 M10 11.5 V4.8 C10 3.7 11.8 3.7 11.8 4.8 V11.5 M11.8 11.5 V6.5 C11.8 5.4 13.6 5.4 13.6 6.5 V14 C13.6 17 12.6 19 11.4 20.5', 1.3); break;
    case 'plume': inner = P('M20 3.5 C12 4.5 7 10 4.5 20.5 M20 3.5 C18.8 10 13.5 15 6.5 15.8') + P('M9 13.5 L13 9.5 M11 14.8 L15 10.8', 0.75); break;
    case 'registre': inner = P('M5 4 H17.5 V20 H5 Z') + P('M8 4 V20', 1) + P('M17.5 10 H20 V14 H17.5', 1.25); break;
    case 'lacs': inner = `<circle cx="9" cy="12" r="5.5" fill="none" stroke="${c}" stroke-width="1.6"></circle><circle cx="15" cy="12" r="5.5" fill="none" stroke="${c}" stroke-width="1.6"></circle>`; break;
    default: inner = '';
  }
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" aria-hidden="true" style="display: block; flex: none;">${inner}</svg>`;
}

/* ---------- Cartouches de camp (§ 5.3), dessinés à la largeur voulue ---------- */
export function cartouche(type, txt, T, { h = 20, w, fs, gras, plein = false } = {}) {
  const size = fs || (h >= 30 ? 14 : 12);
  const meute = type === 'mordu' || type === 'mordu2';
  const bold = gras ?? meute;
  const pad = h >= 30 ? 12 : 8;
  const W = w || Math.max(48, larg(txt, size, bold) + pad * 2 + (meute ? 8 : 0) + (type === 'mordu2' ? 8 : 0));
  const k = h / 30, cut = 6 * k, y1 = 0.75, y2 = h - 0.75, x2 = W - 0.75;
  let d, stroke = T.encre, sw = 1.5, fill = T.surface, txtCol = T.encre, extra = '', dash = '', style = '';
  if (type === 'ecu') d = `M${cut} ${y1} H${W - cut} L${x2} ${cut} V${h - cut} L${W - cut} ${y2} H${cut} L0.75 ${h - cut} V${cut} Z`;
  else if (type === 'mordu' || type === 'mordu2') {
    const r = W - 0.75, m = (v) => (v * k).toFixed(2);
    d = `M${cut} ${y1} H${r - 19 * k} L${r - 15 * k} ${m(6)} L${r - 10 * k} ${m(2)} L${r - 8 * k} ${m(10)} L${r} ${m(13)} L${r - 7 * k} ${m(17)} L${r - 1 * k} ${m(23)} L${r - 9 * k} ${m(25)} L${r - 13 * k} ${y2} H${type === 'mordu2' ? 20 * k : cut}`;
    d += type === 'mordu2' ? ` L${m(16)} ${m(24)} L${m(11)} ${m(28)} L${m(9)} ${m(20)} L0.75 ${m(17)} L${m(8)} ${m(13)} L${m(2)} ${m(7)} L${m(10)} ${m(5)} L${m(14)} ${y1} Z` : ` L0.75 ${h - cut} V${cut} Z`;
    stroke = T.meute; sw = 2; txtCol = T.meute;
  } else if (type === 'lacs') {
    stroke = T.serment; txtCol = T.serment; sw = 2;
    d = `M${h / 2} 1 H${W - h / 2} A${h / 2 - 1} ${h / 2 - 1} 0 0 1 ${W - h / 2} ${h - 1} H${h / 2} A${h / 2 - 1} ${h / 2 - 1} 0 0 1 ${h / 2} 1 Z`;
    const i = 3.5 * k + 1;
    extra = `<rect x="${i}" y="${i}" width="${W - 2 * i}" height="${h - 2 * i}" rx="${(h - 2 * i) / 2}" fill="none" stroke="${T.serment}" stroke-width="0.9"></rect>`;
  } else if (type === 'audela') {
    d = `M${cut} ${y1} H${W - cut} L${x2} ${cut} V${h - cut} L${W - cut} ${y2} H${cut} L0.75 ${h - cut} V${cut} Z`;
    stroke = T.audela; txtCol = T.audela; sw = 1.2; dash = '1.5 3'; style = 'italic';
  } else if (type === 'ovale') {
    d = `M${W / 2} 0.7 A${W / 2 - 0.7} ${h / 2 - 0.7} 0 1 1 ${W / 2 - 0.01} 0.7 Z`;
    stroke = T.encre2; txtCol = T.encre2; sw = 1.4; dash = '3 3';
  }
  if (plein) { fill = T.encre; stroke = T.encre; txtCol = T.surEncre; dash = ''; if (extra) extra = extra.replace(`stroke="${T.serment}"`, `stroke="${T.surEncre}"`); }
  return { W, h, svg:`<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" aria-hidden="true" style="display: block; overflow: visible;"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}></path>${extra}<text x="${(type === 'mordu' ? (W - 8) / 2 : W / 2).toFixed(1)}" y="${(h / 2 + size * 0.34).toFixed(1)}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="${size}" font-weight="${bold ? 600 : 400}"${style ? ` font-style="${style}"` : ''} fill="${txtCol}">${esc(txt)}</text></svg>` };
}
