// Générateur des artboards E2b « Caprices » — composants partagés (SPEC § 5, gabarit § 7.1).
import fs from 'node:fs';

export const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project/';
const TEX = 'D:/TomArcade/Garoutom/docs/design/caprices/textures.svg';

// <defs> de textures.svg, collées telles quelles (balises vides fermées explicitement).
let DEFS = fs.readFileSync(TEX, 'utf8').match(/^<defs>[\s\S]*?^<\/defs>/m)[0];
DEFS = DEFS.replace(/<([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g, '<$1$2></$1>');

export const INK = '#17130F', DEL = '#5E554A', P2 = '#7A7064', P1 = '#A89D8C', P3 = '#4A433B',
  VER = '#E8DFCB', BRU = '#F5EFE2', TEI = '#E1D7C1', SAN = '#A23B24', GAR = '#8A3A5C', ROU = '#8C6A3F';
export const FELL = "'IM Fell French Canon', Georgia, serif";
export const FELLSC = "'IM Fell French Canon SC', Georgia, serif";
export const SERIF = "'Source Serif 4', Georgia, serif";

let uid = 0;
export const resetUid = () => { uid = 0; };

/* ------------------------------------------------------------------ */
/* Définitions locales : couvre-chefs (§ 5.1.2) et icônes (§ 6.3)       */
/* ------------------------------------------------------------------ */
const BODY = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48 Z" fill="url(#hach-2-e)" stroke="#17130F" stroke-width="1"></path>`;
const HEAD = (cy = 22, r = 8) => `<circle cx="24" cy="${cy}" r="${r}" fill="url(#hach-1-e)" stroke="#17130F" stroke-width="1"></circle>`;
const K = '#17130F';
const HATS = {
  2: BODY + HEAD() + `<path d="M15.5 16 C14 23 13 29 10.5 34 L15 32 C16 26 16.5 21 17.5 17 Z M32.5 16 C34 23 35 29 37.5 34 L33 32 C32 26 31.5 21 30.5 17 Z" fill="url(#hach-3-e)" stroke="${K}" stroke-width="0.8"></path><path d="M17 15 L18 7 L20.5 11 L22 4.5 L24 10 L26.5 5 L27.5 11 L30.5 7.5 L31 15 Z" fill="${K}"></path>`,
  3: BODY + HEAD() + `<path d="M16 19 C15 11 21 8 27 9 C33 10 38 13 39.5 20.5 C38.5 21.5 36.5 21.5 35.5 19.5 C35 16 31.5 14 29 14 C24 14 19 15 16 19 Z" fill="${K}"></path><circle cx="38" cy="23.5" r="2.7" fill="${K}"></circle>`,
  5: BODY + HEAD() + `<path d="M17 15.5 C17 9.5 31 9.5 31 15.5 Z" fill="${K}"></path><path d="M2.5 17.5 C10 13.2 38 13.2 45.5 17.5 C38 19.6 10 19.6 2.5 17.5 Z" fill="${K}"></path>`,
  6: BODY + HEAD() + `<path d="M16 17 C16 10 32 10 32 17 Z" fill="${K}"></path><circle cx="14.5" cy="17.5" r="4.2" fill="${K}"></circle><circle cx="33.5" cy="17.5" r="4.2" fill="${K}"></circle><circle cx="24" cy="10.5" r="3.6" fill="${K}"></circle>`,
  7: BODY + `<path d="M11 40 C11 26 15 12 24 3 C33 12 37 26 37 40 Z" fill="url(#hach-3-e)" stroke="${K}" stroke-width="1"></path><circle cx="24" cy="23" r="7" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><circle cx="24" cy="23" r="7" fill="url(#hach-1-e)"></circle>`,
  8: BODY + HEAD() + `<path d="M15 20 C14 9 34 9 33 20 Z" fill="url(#hach-2-e)" stroke="${K}" stroke-width="1"></path><path d="M15 20 q1.5 2.6 3 0 q1.5 2.6 3 0 q1.5 2.6 3 0 q1.5 2.6 3 0 q1.5 2.6 3 0 q1.5 2.6 3 0" fill="none" stroke="${K}" stroke-width="1"></path><circle cx="24" cy="9" r="1.6" fill="${K}"></circle>`,
  9: BODY + HEAD() + `<path d="M4.5 17 C9 5.5 39 5.5 43.5 17 C35 13.5 13 13.5 4.5 17 Z" fill="${K}"></path><circle cx="24" cy="10.5" r="1.7" fill="${BRU}"></circle>`,
  10: BODY + HEAD() + `<path d="M13.5 18.5 C12 8 36 8 34.5 18.5 C30 16 18 16 13.5 18.5 Z" fill="${K}"></path><path d="M16.5 15 C20 11 28 11 32 14 M18.5 11.8 C22 9.6 27 9.8 29.8 11.6" fill="none" stroke="${BRU}" stroke-width="1.1"></path>`,
  11: BODY + HEAD() + `<path d="M13 16.5 C12 10 26 8.5 37.5 12.5 C40 13.5 39 16.5 35 16.5 Z" fill="${K}"></path><path d="M23 9.6 V6.6" stroke="${K}" stroke-width="1.6" stroke-linecap="round"></path>`,
  12: BODY + HEAD() + `<path d="M15.5 19 C15 10.5 33 10.5 32.5 19 C30 16 18 16 15.5 19 Z" fill="url(#hach-1-e)" stroke="${K}" stroke-width="1"></path><circle cx="15" cy="21" r="2.6" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><circle cx="15" cy="26" r="2.6" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><circle cx="33" cy="21" r="2.6" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><circle cx="33" cy="26" r="2.6" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><path d="M34.5 29.5 L41 26.5 L40 33 Z" fill="${K}"></path>`,
  13: BODY + HEAD() + `<path d="M16.5 15.5 L13.5 1 H34.5 L31.5 15.5 Z" fill="${K}"></path><path d="M11 15.5 H37 V17.6 H11 Z" fill="${K}"></path>`,
  14: BODY + `<path d="M14.5 23 C13.5 10.5 34.5 10.5 33.5 23 L31 29 L27 28 L24 31 L21 28 L17 29 Z" fill="url(#hach-3-e)" stroke="${K}" stroke-width="1"></path><circle cx="24" cy="22.5" r="6.4" fill="${BRU}" stroke="${K}" stroke-width="1"></circle><circle cx="24" cy="22.5" r="6.4" fill="url(#hach-1-e)"></circle><path d="M22 31 L19.5 36.5 L24 32 Z M26 31 L28.5 36.5 L24 32 Z" fill="${K}"></path>`,
  15: BODY + HEAD() + `<path d="M18.5 15.6 C18.5 10.4 29.5 10.4 29.5 15.6 Z" fill="${K}"></path><path d="M24 11 V9" stroke="${K}" stroke-width="1.4" stroke-linecap="round"></path>`,
  16: BODY + HEAD() + `<path d="M16 17 L3 6.5 L11 8.5 L17 12 L24 10.5 L31 12 L37 8.5 L45 6.5 L32 17 Z" fill="${BRU}" stroke="${K}" stroke-width="1.2" stroke-linejoin="round"></path><path d="M16 17 L3 6.5 L11 8.5 L17 12 L24 10.5 L31 12 L37 8.5 L45 6.5 L32 17 Z" fill="url(#hach-1-e)"></path>`,
  17: BODY + HEAD() + `<path d="M17 14 C17 7.5 31 7.5 31 14 Z" fill="url(#hach-2-e)" stroke="${K}" stroke-width="1"></path><path d="M4 18 L6 16.5 L5 15.4 L8 15 L9 13.8 L12 14.2 C18 12.8 30 12.8 36 14.2 L39 13.8 L40 15 L43 15.4 L42 16.5 L44 18 C36 20.2 12 20.2 4 18 Z" fill="url(#hach-2-e)" stroke="${K}" stroke-width="1"></path><path d="M17 12.4 H31" stroke="${K}" stroke-width="2"></path>`,
  18: BODY + HEAD() + `<path d="M17 12.5 C17 7 31 7 31 12.5 Z" fill="${K}"></path><path d="M10 17 L14 10 C20 12 28 12 34 10 L38 17 C30 15 18 15 10 17 Z" fill="${K}"></path><path d="M30 9 C33.5 5.5 30 2.5 34 1 C38 -0.5 39.5 3 36.5 4.8" fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round"></path>`,
};
export const BUSTE = (seat) => seat === 1 ? 'buste-tricorne' : seat === 4 ? 'buste-coroza' : `chef-${seat}`;

const ICO = (id, inner) => `<symbol id="${id}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g></symbol>`;
const ICONS = [
  ICO('i-retour', `<path d="M14.5 5.5 L8 12 L14.5 18.5"></path><path d="M8.5 12 H20"></path>`),
  ICO('i-carte', `<path d="M6 3 H15 L19 7 V21 H6 Z"></path><path d="M15 3 V7 H19"></path><path d="M8.5 12.5 L12 9 M8.5 16.5 L15.5 9.5 M10.5 18.5 L16.5 12.5" stroke-width="0.75"></path>`),
  ICO('i-menu', `<path d="M4 7 H20 M4 12 H17 M4 17 H19"></path>`),
  ICO('i-son', `<path d="M12 3 V5"></path><path d="M6.5 16.5 C6.5 10.5 8 6 12 6 C16 6 17.5 10.5 17.5 16.5 L19.5 18.5 H4.5 Z"></path><circle cx="12" cy="20.6" r="1.3"></circle>`),
  ICO('i-regles', `<path d="M3 6 C6 5 9 5 12 7 C15 5 18 5 21 6 V19 C18 18 15 18 12 20 C9 18 6 18 3 19 Z"></path><path d="M12 7 V20"></path><path d="M5.5 10 H9.5 M5.5 13 H9.5 M14.5 10 H18.5" stroke-width="0.75"></path>`),
  ICO('i-reglages', `<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2"></circle><path d="M14 12 H21.5 M13 13.7 L16.8 20.2 M11 13.7 L7.2 20.2 M10 12 H2.5 M11 10.3 L7.2 3.8 M13 10.3 L16.8 3.8"></path>`),
  ICO('i-aide', `<path d="M6 3.5 H18 L21 6.5 V17.5 L18 20.5 H6 L3 17.5 V6.5 Z"></path><path d="M9.6 9.6 C9.6 7.4 14.4 7.4 14.4 9.9 C14.4 11.8 12 12 12 14.2"></path><circle cx="12" cy="16.9" r="0.6" fill="currentColor"></circle>`),
  ICO('i-quitter', `<path d="M13 3 H4 V21 H13"></path><path d="M4 3 L9.5 5.5 V22.5 L4 21"></path><path d="M12.5 12 H21 M18 9 L21 12 L18 15"></path>`),
  ICO('i-fil', `<path d="M3 7 C7 5 10 9 14 7 C17 5.5 19 6 21 7 V15 C19 14 17 13.5 14 15 C10 17 7 13 3 15 Z"></path><path d="M6 10 H17 M6 12.6 H13" stroke-width="0.75"></path>`),
  ICO('i-haut', `<path d="M6.5 15 L12 9.5 L17.5 15"></path>`),
  ICO('i-bas', `<path d="M6.5 9.5 L12 15 L17.5 9.5"></path>`),
  ICO('i-suite', `<path d="M9.5 6.5 L15 12 L9.5 17.5"></path>`),
  ICO('i-renoue', `<path d="M2 15.5 C5 15.5 7 11.5 10 11.8 C12.2 12 12.3 9.4 10.9 9.5 C9.5 9.7 10.2 12.6 13 12.8 C16 13 18 9 22 9"></path>`),
  ICO('i-registre', `<path d="M5 3 H17 V21 H5 Z"></path><path d="M7.5 3 V21"></path><path d="M17 10 H19.5 V14.5 H17"></path>`),
  ICO('i-mire', `<circle cx="12" cy="12" r="6"></circle><path d="M12 2 V5.5 M12 18.5 V22 M2 12 H5.5 M18.5 12 H22"></path>`),
  ICO('i-plume', `<path d="M20 3 C12 4 6.5 9.5 4.5 20.5 M20 3 C18.5 10 13 15.5 6 16.2"></path><path d="M8.5 13.5 L12.5 9.5 M10.5 15 L14.5 11" stroke-width="0.75"></path>`),
  ICO('i-table', `<path d="M3 9 H21 M5 9 V19 M19 9 V19 M3 9 L5 6 H19 L21 9"></path><path d="M8 12.5 H16" stroke-width="0.75"></path>`),
];
// Sablier 16 (minuterie) et cor du Chasseur (symbole 32, provisoire — lot C fait foi).
const SABLIER = `<symbol id="i-sablier" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><path d="M3 1.5 H13 M3 14.5 H13"></path><path d="M4.2 1.5 C4.2 6 7.5 6.6 8 8 C8.5 9.4 11.8 10 11.8 14.5 M11.8 1.5 C11.8 6 8.5 6.6 8 8 C7.5 9.4 4.2 10 4.2 14.5"></path><path d="M6 13.6 L8 11.6 M7.6 14 L10 11.8" stroke-width="0.75"></path></g></symbol>`;
const COR = `<symbol id="s-cor" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 20 H6"></path><path d="M6 20 C6 12 10 7 16 7 C22 7 25 11 25 15 C25 20 21 23 16 23 C11.5 23 9.5 19.5 10.5 16.5 C11.5 13.5 14.5 12.5 17 13.8 C19 15 20 16.6 22.4 17.6"></path><path d="M22.4 17.6 L29.5 12.6 M23.4 19.6 L29.5 24.4"></path><ellipse cx="29.5" cy="18.5" rx="1.4" ry="5.9"></ellipse></g><path d="M27.6 15.5 A1.2 3.2 0 0 0 27.6 21.5 M26.2 16.6 A0.9 2 0 0 0 26.2 20.4" fill="none" stroke="currentColor" stroke-width="0.7"></path></symbol>`;

const LOCAL = Object.entries(HATS).map(([n, c]) => `<symbol id="chef-${n}" viewBox="0 0 48 48">${c}</symbol>`).join('\n')
  + '\n' + ICONS.join('\n') + '\n' + SABLIER + '\n' + COR;

export const icon = (id, size = 24, color = 'currentColor', extra = '') =>
  `<svg width="${size}" height="${size}" aria-hidden="true" style="display: block; flex: none; color: ${color};${extra}"><use href="#${id}" width="${size}" height="${size}"></use></svg>`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const ROUSSEURS = (w, h) => {
  // ocre #8C6A3F, 4 à 8 % — jamais de sanguine (critique n° 6)
  const pts = [[0.07, 0.04, 4, .07], [0.93, 0.31, 6, .05], [0.12, 0.62, 3, .08], [0.86, 0.83, 7, .045], [0.48, 0.97, 5, .06], [0.6, 0.015, 2.5, .08]];
  return `<g fill="${ROU}">` + pts.map(([x, y, r, o]) => `<circle cx="${(x * w).toFixed(0)}" cy="${(y * h).toFixed(0)}" r="${r}" opacity="${o}"></circle>`).join('') + `</g>`;
};

export function page({ title, w, h, body }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
a{color:#666}a:hover{color:#333}
</style>
</helmet>
<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; position: relative; overflow: hidden; background-color: ${VER}; background-image: repeating-linear-gradient(90deg, rgba(23,19,15,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(23,19,15,.035) 0 .6px, transparent .6px 3px); font-family: ${SERIF}; color: ${INK};">

<!-- textures.svg — <defs> collées telles quelles ; puis couvre-chefs et icônes du lot -->
<svg width="0" height="0" style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
${DEFS}
<defs>
${LOCAL}
</defs>
</svg>

<!-- grain du papier vergé et rousseurs ocre -->
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true">
<rect x="0" y="0" width="${w}" height="${h}" fill="#000" filter="url(#papier)" opacity="0.22"></rect>
${ROUSSEURS(w, h)}
</svg>

${body}
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
}

export function write(name, html) {
  fs.writeFileSync(OUT + name, html, 'utf8');
  console.log(name, html.length);
}

/* ------------------------------------------------------------------ */
/* Cartouches de camp (§ 5.3) — tracés de textures.svg, largeur libre   */
/* ------------------------------------------------------------------ */
export function cartouche(kind, w, h, text, opts = {}) {
  const s = h / 30, sw = h >= 30 ? 1.5 : 1.25;
  const plein = !!opts.plein; // onglet actif : aplat encre, texte bruni
  let path, fill = plein ? INK : BRU, stroke = INK, color = plein ? BRU : INK, weight = 400, italic = false, dash = '';
  const c = 6 * s;
  const ecu = `M${c} 0.75 H${w - c} L${w - 0.75} ${c} V${h - c} L${w - c} ${h - 0.75} H${c} L0.75 ${h - c} V${c} Z`;
  if (kind === 'ecu') { path = ecu; }
  else if (kind === 'audela') { path = ecu; stroke = plein ? INK : DEL; color = plein ? BRU : DEL; italic = true; dash = ' stroke-dasharray="1.5 3"'; }
  else if (kind === 'mordu') {
    const X = (x) => (w - 120 + x).toFixed(1), Y = (y) => (y * s).toFixed(1);
    path = `M${c} ${Y(1)} H${X(100)} L${X(104)} ${Y(6)} L${X(109)} ${Y(2)} L${X(111)} ${Y(10)} L${X(119)} ${Y(13)} L${X(112)} ${Y(17)} L${X(118)} ${Y(23)} L${X(110)} ${Y(25)} L${X(106)} ${Y(29)} H${c} L1 ${h - c} V${c} Z`;
    stroke = SAN; color = plein ? BRU : SAN; weight = 600; if (plein) fill = SAN;
  } else if (kind === 'lacs') {
    const r = h / 2 - 1;
    path = null;
    return `<span style="position: relative; display: inline-flex; flex: none; width: ${w}px; height: ${h}px; align-items: center; justify-content: center;"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${BRU}" stroke="${GAR}" stroke-width="2"></rect><rect x="${3.5 * s + 1}" y="${3.5 * s + 1}" width="${w - 7 * s - 2}" height="${h - 7 * s - 2}" rx="${r - 3.5 * s}" fill="none" stroke="${GAR}" stroke-width="0.9"></rect></svg><span style="position: relative; font-size: ${h >= 30 ? 14 : 12}px; line-height: 16px; color: ${GAR}; white-space: nowrap;">${text}</span></span>`;
  } else if (kind === 'ovale') {
    return `<span style="position: relative; display: inline-flex; flex: none; width: ${w}px; height: ${h}px; align-items: center; justify-content: center;"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" fill="${BRU}" stroke="${DEL}" stroke-width="1.4" stroke-dasharray="3 3"></ellipse></svg><span style="position: relative; font-size: ${h >= 30 ? 14 : 12}px; line-height: 16px; color: ${DEL}; white-space: nowrap;">${text}</span></span>`;
  }
  const fs_ = opts.fontSize || (h >= 30 ? 14 : 12);
  const sws = kind === 'mordu' ? 2 : (kind === 'audela' ? 1.2 : sw);
  const padR = kind === 'mordu' ? 10 * s : 0;
  return `<span style="position: relative; display: inline-flex; flex: none; width: ${w}px; height: ${h}px; align-items: center; justify-content: center; box-sizing: border-box; padding-right: ${padR.toFixed(1)}px;"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0; overflow: visible;"><path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${sws}"${dash}></path></svg><span style="position: relative; font-size: ${fs_}px; line-height: 16px; font-weight: ${weight}; ${italic ? 'font-style: italic; ' : ''}color: ${color}; white-space: nowrap;">${text}</span></span>`;
}

/* ------------------------------------------------------------------ */
/* Le jeton (§ 5.1)                                                    */
/* ------------------------------------------------------------------ */
export const DENS = {
  D2: { w: 85, h: 104, m: 60, svgH: 66, nom: 15, nomLh: 20, st: 12, stLh: 16, cartH: 20 },
  D3: { w: 68, h: 88, m: 48, svgH: 56, nom: 14, nomLh: 16, st: 12, stLh: 16, cartH: 20 },
  D4: { w: 56, h: 76, m: 40, svgH: 44, nom: 13, nomLh: 16, st: 12, stLh: 16, cartH: 20 },
  C72: { w: 112, h: 120, m: 72, svgH: 84, nom: 16, nomLh: 20, st: 13, stLh: 16, cartH: 20 },
  TV: { w: 150, h: 156, m: 96, svgH: 108, nom: 22, nomLh: 28, st: 16, stLh: 20, cartH: 26 },
};

export const NOMS = { 1: 'Anna', 2: 'Bastien', 3: 'Clément', 4: 'Delphine', 5: 'Étienne', 6: 'Fanny', 7: 'Gaspard', 8: 'Hélène', 9: 'Inès', 10: 'Jules', 11: 'Tom', 12: 'Léa', 13: 'Malo', 14: 'Nour', 15: 'Octave', 16: 'Paulette', 17: 'Quentin', 18: 'Rose' };

/**
 * st : { moi, choisi, vote, mort:{kind,text,w}, cap, recon, nc, interactive, statut, mire }
 */
export function jeton(seat, D, st = {}) {
  const { w, svgH, m } = D;
  const cx = w / 2, cy = svgH / 2, r = m / 2, ri = r - 4;
  const id = `clj${++uid}`;
  const k = m / 64; // échelle des signes
  let g = '';
  // cadre « moi » : carré double 1,5 + 0,75 à 2 px
  if (st.moi) {
    const S = m + 14, S2 = S - 6.25;
    g += `<rect x="${(cx - S / 2).toFixed(2)}" y="${(cy - S / 2).toFixed(2)}" width="${S}" height="${S}" fill="none" stroke="${INK}" stroke-width="1.5"></rect>`;
    g += `<rect x="${(cx - S2 / 2).toFixed(2)}" y="${(cy - S2 / 2).toFixed(2)}" width="${S2}" height="${S2}" fill="none" stroke="${INK}" stroke-width="0.75"></rect>`;
  }
  if (st.mire) {
    g += `<circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="none" stroke="${INK}" stroke-width="0.75"></circle>`;
  }
  const bs = 0.75 * m, bx = cx - bs / 2, by = cy - 0.344 * m;
  if (st.mort) {
    // bruni : plus de hachure, anneau palier-2 1 px, buste au contour palier-1
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${P2}" stroke-width="1"></circle>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${P1}" stroke-width="0.6"></circle>`;
    g += `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${ri}"></circle></clipPath>`;
    g += `<g clip-path="url(#${id})"><use href="#buste-fantome" x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${bs}" height="${bs}"></use></g>`;
  } else {
    const ringStroke = st.nc ? P2 : INK;
    const ringW = st.nc ? 1 : (st.choisi ? 3.5 : 1.5);
    const dash = st.recon ? ' stroke-dasharray="4 2"' : '';
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${BRU}" stroke="${ringStroke}" stroke-width="${ringW}"${dash}></circle>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="${st.nc ? BRU : 'url(#hach-1-e)'}" stroke="${INK}" stroke-width="0.75"></circle>`;
    g += `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${ri}"></circle></clipPath>`;
    g += `<g clip-path="url(#${id})"><use href="#${BUSTE(seat)}" x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${bs}" height="${bs}"></use></g>`;
  }
  // brassard « ×2 » (bandeau S)
  if (st.cap) {
    const tw = 0.8 * m, bw = tw - 10 * k - 4, y1 = cy + ri, y0 = y1 - 14;
    const fill = st.mort ? INK : INK;
    g += `<path d="M${(cx - tw / 2).toFixed(2)} ${y0} H${(cx + tw / 2).toFixed(2)} L${(cx + bw / 2).toFixed(2)} ${y1} H${(cx - bw / 2).toFixed(2)} Z" fill="${fill}"></path>`;
    g += `<text x="${cx}" y="${y0 + 11}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="700" fill="${BRU}">×2</text>`;
  }
  // repères de visée (choisi)
  if (st.choisi) {
    const a = r + 3.75, b = a + 6;
    g += `<path d="M${cx} ${cy - a} V${cy - b} M${cx} ${cy + a} V${cy + b} M${cx - a} ${cy} H${cx - b} M${cx + a} ${cy} H${cx + b}" stroke="${INK}" stroke-width="2.4"></path>`;
  }
  // sceau « a voté » en NE
  if (st.vote) {
    const d = Math.max(16, 0.28 * m), x = cx + 0.35 * m - d / 2, y = cy - 0.35 * m - d / 2;
    g += `<circle cx="${(cx + 0.35 * m).toFixed(2)}" cy="${(cy - 0.35 * m).toFixed(2)}" r="${(d / 2 + 1.5).toFixed(2)}" fill="${BRU}"></circle>`;
    g += `<use href="#g-sceau" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${d.toFixed(2)}" height="${d.toFixed(2)}"></use>`;
  }
  const svg = `<svg width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}" aria-hidden="true" style="display: block; flex: none; overflow: visible;">${g}</svg>`;

  const nom = NOMS[seat];
  const nomStyle = st.mort
    ? `color: ${DEL}; font-weight: 400; text-decoration: line-through; text-decoration-thickness: 1px;`
    : `color: ${INK}; font-weight: ${st.moi ? 700 : 600};${st.choisi ? ' text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px;' : ''}`;
  const nomH = `<span style="display: block; max-width: ${w}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; font-size: ${D.nom}px; line-height: ${D.nomLh}px; ${nomStyle}">${nom}</span>`;
  let below = '';
  if (st.mort) {
    below = cartouche(st.mort.kind, st.mort.w || Math.min(80, w + 6), D.cartH, st.mort.text, D.cartH > 20 ? { fontSize: 16 } : {});
  } else if (st.statut) {
    const strong = st.choisi || st.statutFort;
    below = `<span style="display: block; white-space: nowrap; text-align: center; font-size: ${D.st}px; line-height: ${D.stLh}px; font-variation-settings: 'opsz' 12; ${strong ? `font-weight: 600; color: ${INK};` : `color: ${DEL};`}">${st.statut}</span>`;
  }
  const label = st.label || buildLabel(seat, st);
  const common = `width: ${w}px; height: ${D.h}px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; margin: 0; padding: 0; border: 0; background: none; font: inherit; color: inherit;`;
  if (st.interactive) {
    return `<button type="button" aria-pressed="${st.choisi ? 'true' : 'false'}" aria-label="${label}" style="${common} cursor: pointer;">${svg}${nomH}${below}</button>`;
  }
  return `<div role="img" aria-label="${label}" style="${common}">${svg}${nomH}${below}</div>`;
}

function buildLabel(seat, st) {
  const p = [NOMS[seat]];
  if (st.moi) p.push('vous');
  if (st.mort) p.push(`mort·e, ${st.mort.full || st.mort.text}`);
  if (st.cap) p.push('capitaine, voix double');
  if (st.vote) p.push('a voté');
  if (st.recon) p.push('reconnexion en cours');
  if (st.choisi) p.push('votre choix');
  if (!st.mort && !st.interactive && st.nonInteractif !== false) { /* rien */ }
  return p.join(', ');
}

/* ------------------------------------------------------------------ */
/* Frise (§ 5.7) : ciel en hach-h, toits de Thiercelieux, cartouches   */
/* ------------------------------------------------------------------ */
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function toits(W, base, clocherX, potenceX, seed = 7) {
  const rnd = lcg(seed);
  const pts = [[0, base]];
  let x = 0;
  while (x < W) {
    const w = 12 + Math.floor(rnd() * 17), hw = 5 + Math.floor(rnd() * 4), hr = 3 + Math.floor(rnd() * 6);
    const x2 = Math.min(W, x + w);
    pts.push([x, base - hw], [x + (x2 - x) * (0.4 + rnd() * 0.2), base - hw - hr], [x2, base - hw]);
    x = x2;
  }
  pts.push([W, base]);
  const d = 'M' + pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L') + ' Z';
  let s = `<path d="${d}" fill="${VER}"></path><path d="${d}" fill="url(#hach-2-e)" stroke="${INK}" stroke-width="1" stroke-linejoin="miter"></path>`;
  // clocher à une fenêtre
  const c = clocherX;
  s += `<path d="M${c - 5} ${base} V${base - 11} H${c + 5} V${base} Z" fill="${VER}" stroke="${INK}" stroke-width="1"></path>`;
  s += `<path d="M${c - 5} ${base} V${base - 11} H${c + 5} V${base} Z" fill="url(#hach-1-e)"></path>`;
  s += `<path d="M${c - 6.5} ${base - 11} L${c} ${base - 18} L${c + 6.5} ${base - 11} Z" fill="${INK}"></path>`;
  s += `<rect x="${c - 1.5}" y="${base - 9}" width="3" height="4" fill="${BRU}" stroke="${INK}" stroke-width="0.6"></rect>`;
  // potence
  const p = potenceX;
  s += `<path d="M${p} ${base} V${base - 16.5} H${p + 10} M${p} ${base - 12} L${p + 4.5} ${base - 16.5}" fill="none" stroke="${INK}" stroke-width="1.6"></path>`;
  s += `<path d="M${p + 9} ${base - 16.5} V${base - 12}" stroke="${INK}" stroke-width="0.8"></path><circle cx="${p + 9}" cy="${base - 10.4}" r="1.6" fill="none" stroke="${INK}" stroke-width="0.8"></circle>`;
  return s;
}

export const outil = (id, label, extra = '') =>
  `<button type="button" aria-label="${label}" style="width: 44px; height: 44px; flex: none; box-sizing: border-box; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: ${BRU}; border: 1px solid ${P2}; border-radius: 0; color: ${INK}; cursor: pointer;${extra}">${icon(id)}</button>`;

export const btnCarte = (avecMot = true) => avecMot
  ? `<button type="button" aria-label="Ma carte — gardez le pouce pour la voir" style="width: 76px; height: 44px; flex: none; box-sizing: border-box; margin: 0; padding: 0 8px; display: flex; align-items: center; justify-content: center; gap: 4px; background: ${BRU}; border: 1px solid ${P2}; border-radius: 0; color: ${INK}; font-family: ${SERIF}; font-size: 15px; line-height: 20px; cursor: pointer;">${icon('i-carte')}<span>Carte</span></button>`
  : outil('i-carte', 'Ma carte — gardez le pouce pour la voir');

export const heureCart = (txt, size = 20, lh = 24) =>
  `<h1 style="margin: 0; height: 44px; flex: none; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; background: ${BRU}; border: 1px solid ${P2}; font-family: ${FELLSC}; font-weight: 400; font-size: ${size}px; line-height: ${lh}px; letter-spacing: .02em; color: ${INK};">${txt}</h1>`;

/** Frise mobile 56 px. */
export function frise({ W, heure, gutter = 16, clocherX, potenceX, carteMot = true, droite = null, gauche = null, insetL = 0, insetR = 0 }) {
  const left = gauche ?? `${outil('i-retour', 'Retour à l’arcade')}${heure ? heureCart(heure) : ''}`;
  const right = droite ?? `${btnCarte(carteMot)}${outil('i-menu', 'Menu de la table')}${outil('i-son', 'Couper le son')}`;
  return `<header style="position: relative; height: 56px; flex: none;">
<svg width="${W}" height="56" viewBox="0 0 ${W} 56" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><rect x="0" y="0" width="${W}" height="56" fill="url(#hach-h-e)" opacity="0.28"></rect>${toits(W, 54.5, clocherX, potenceX)}<line x1="0" y1="55.25" x2="${W}" y2="55.25" stroke="${INK}" stroke-width="1.5"></line></svg>
<div style="position: relative; height: 56px; box-sizing: border-box; padding: 4px ${gutter + insetR}px 0 ${gutter + insetL}px; display: flex; align-items: flex-start; gap: 8px;">${left}<div style="flex: 1;"></div>${right}</div>
</header>`;
}

/* ------------------------------------------------------------------ */
/* Minuterie (§ 5.6)                                                   */
/* ------------------------------------------------------------------ */
export function crans(n) {
  let s = '';
  for (let i = 0; i < 24; i++) {
    const x = i * 8;
    s += i < n ? `<rect x="${x}" y="0" width="5" height="10" fill="${INK}"></rect>` : `<rect x="${x + 0.5}" y="0.5" width="4" height="9" fill="none" stroke="${P2}" stroke-width="1"></rect>`;
  }
  return `<svg width="189" height="10" viewBox="0 0 189 10" aria-hidden="true" style="display: block; flex: none;">${s}</svg>`;
}
export function minuterie({ n = 0, txt = null, gutter = 16, label = '' }) {
  const absent = txt === null;
  const chiffre = absent
    ? `<span style="width: 44px; text-align: right; font-size: 16px; line-height: 20px; color: ${DEL};" aria-hidden="true">—</span>`
    : `<span style="width: 44px; text-align: right; font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums;">${txt}</span>`;
  const aria = absent ? 'Pas de minuterie pour vous' : (label || `Il reste ${txt}`);
  return `<div role="timer" aria-label="${aria}" style="height: 24px; flex: none; box-sizing: border-box; padding: 0 ${gutter}px; display: flex; align-items: center; gap: 8px; color: ${INK};">${icon('i-sablier', 16)}${crans(absent ? 0 : n)}<div style="flex: 1;"></div>${chiffre}</div>`;
}

/* ------------------------------------------------------------------ */
/* Crieur, consigne, résumé, pli, barre                                */
/* ------------------------------------------------------------------ */
export const rub = (t, size = 13, lh = 16) => `<span style="font-family: ${FELLSC}; font-size: ${size}px; line-height: ${lh}px; letter-spacing: .06em; color: ${DEL};">${t}</span>`;

export function carteMini(w = 36, h = 50) {
  // petite carte retournée : cuvette papier, symbole du Chasseur
  return `<div role="img" aria-label="Carte retournée : le Chasseur" style="position: relative; width: ${w}px; height: ${h}px; flex: none; box-sizing: border-box; background: ${BRU}; padding: 3px;">
<div style="position: relative; width: 100%; height: 100%; box-sizing: border-box; background: ${TEI}; border-style: solid; border-width: 1px 1.5px 1.5px 1px; border-color: rgba(23,19,15,.38) ${BRU} ${BRU} rgba(23,19,15,.38); border-radius: 2px; display: flex; align-items: center; justify-content: center; color: ${INK};"><svg width="24" height="24" aria-hidden="true"><use href="#s-cor" width="24" height="24"></use></svg></div>
<div style="position: absolute; inset: 0; border: 1px solid ${P2}; pointer-events: none;"></div>
</div>`;
}

export function crieur({ rubrique, texte, carte = false, chandelle = false, gutter = 16, lignes = 2, h = 56 }) {
  const ch = chandelle ? `<svg width="16" height="16" aria-hidden="true" style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><use href="#g-chandelle" width="16" height="16"></use></svg>` : '';
  return `<section aria-label="Le crieur — toucher pour ouvrir le registre" style="height: ${h}px; flex: none; box-sizing: border-box; padding: ${lignes === 1 ? 4 : 4}px ${gutter}px 4px; display: flex; gap: 10px; align-items: flex-start; border-bottom: 0.75px solid ${P2};">
${carte ? carteMini() : ''}<p aria-live="polite" style="margin: 0; min-width: 0; font-size: 16px; line-height: 24px; display: -webkit-box; -webkit-line-clamp: ${lignes}; -webkit-box-orient: vertical; overflow: hidden;">${rub(rubrique)}&#8194;${ch}${texte}</p>
</section>`;
}

export function consigne({ texte = null, legende = null, gutter = 16, h = 72, lignes = 3 }) {
  if (legende) {
    return `<div style="height: ${h}px; flex: none; box-sizing: border-box; padding: 0 ${gutter + 8}px; display: flex; align-items: center; justify-content: center; text-align: center;"><p style="margin: 0; font-family: ${FELL}; font-style: italic; font-size: 18px; line-height: 24px; color: ${DEL};">« ${legende} »</p></div>`;
  }
  return `<div style="height: ${h}px; flex: none; box-sizing: border-box; padding: 6px ${gutter}px 0;"><p style="margin: 0; font-size: 18px; line-height: 24px; font-variation-settings: 'opsz' 18; display: -webkit-box; -webkit-line-clamp: ${lignes}; -webkit-box-orient: vertical; overflow: hidden;">${texte}</p></div>`;
}

export function resume({ gauche = '', droite = '', gutter = 16 }) {
  return `<div style="height: 24px; flex: none; box-sizing: border-box; padding: 0 ${gutter}px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 15px; line-height: 24px; white-space: nowrap;"><span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">${gauche}</span>${droite ? `<span style="font-size: 16px; font-variant-numeric: tabular-nums lining-nums;">${droite}</span>` : ''}</div>`;
}

export function pli({ kind = 'ecu', label = 'Le village', w = 96, count = null, gutter = 16 }) {
  const n = count !== null ? `<span style="font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums;">· ${count}</span>` : '';
  const aria = `Ouvrir le fil : ${label}${count !== null ? `, ${count} non lus` : ''}`;
  return `<button type="button" aria-expanded="false" aria-label="${aria}" style="height: 44px; width: 100%; flex: none; box-sizing: border-box; margin: 0; padding: 0 ${gutter}px; border: 0; border-top: 0.75px solid ${P2}; background: transparent; display: flex; align-items: center; gap: 10px; font: inherit; color: ${INK}; cursor: pointer;">${icon('i-fil')}${cartouche(kind, w, 30, label)}${n}<span style="flex: 1;"></span>${icon('i-haut')}</button>`;
}

export const btnPrim = (label, style = '') =>
  `<button type="button" style="flex: 1; min-width: 0; height: 48px; box-sizing: border-box; margin: 0; padding: 0 16px; background: ${INK}; border: 1.5px solid ${INK}; border-radius: 0; color: ${BRU}; font-family: ${SERIF}; font-size: 17px; line-height: 20px; font-weight: 600; white-space: nowrap; cursor: pointer;${style}">${label}</button>`;
export const btnSec = (label, style = '') =>
  `<button type="button" style="flex: none; height: 48px; box-sizing: border-box; margin: 0; padding: 0 16px; background: transparent; border: 1.5px solid ${INK}; border-radius: 0; color: ${INK}; font-family: ${SERIF}; font-size: 17px; line-height: 20px; font-weight: 400; white-space: nowrap; cursor: pointer;${style}">${label}</button>`;
export const btnAppuiLong = (label, style = '') =>
  `<button type="button" aria-label="${label.replace(/<[^>]+>/g, '')} — appui long" style="flex: 1; min-width: 0; height: 48px; box-sizing: border-box; margin: 0; padding: 0 16px; background: transparent; border: 1.5px solid ${INK}; border-radius: 0; color: ${INK}; font-family: ${SERIF}; font-size: 17px; line-height: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;${style}"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex: none;"><circle cx="13" cy="13" r="11.5" fill="none" stroke="${P2}" stroke-width="3"></circle></svg><span>${label}</span></button>`;

/** Bouton armé (§ 5.4) : double filet, repères aux quatre coins, filet de 4 s qui se rétracte. */
export function btnArme({ l1, l2 = null, aria, flex = 1, reste = 0.62 }) {
  const cs = `position: absolute; width: 7px; height: 7px; box-sizing: border-box; pointer-events: none; border: 0 solid ${INK};`;
  const corner = `<div aria-hidden="true" style="${cs} left: -5px; top: -5px; border-left-width: 1.5px; border-top-width: 1.5px;"></div><div aria-hidden="true" style="${cs} right: -5px; top: -5px; border-right-width: 1.5px; border-top-width: 1.5px;"></div><div aria-hidden="true" style="${cs} left: -5px; bottom: -5px; border-left-width: 1.5px; border-bottom-width: 1.5px;"></div><div aria-hidden="true" style="${cs} right: -5px; bottom: -5px; border-right-width: 1.5px; border-bottom-width: 1.5px;"></div>`;
  const inner = l2
    ? `<span style="display: block; font-size: 16px; line-height: 17px; font-weight: 600;">${l1}</span><span style="display: block; font-size: 16px; line-height: 17px; font-weight: 400;">${l2}</span>`
    : `<span style="display: block; font-size: 17px; line-height: 20px; font-weight: 600;">${l1}</span>`;
  return `<div style="flex: ${flex}; min-width: 0; position: relative;">
<button type="button" aria-label="${aria}" style="width: 100%; height: 48px; box-sizing: border-box; margin: 0; padding: 2px; border: 3px solid ${INK}; border-radius: 0; background: ${BRU}; font-family: ${SERIF}; cursor: pointer;"><span style="height: 100%; box-sizing: border-box; border: 1px solid ${INK}; background: ${INK}; color: ${BRU}; display: flex; flex-direction: column; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden;">${inner}</span></button>
${corner}
<div aria-hidden="true" style="position: absolute; left: 0; bottom: -9px; width: ${(reste * 100).toFixed(0)}%; height: 1px; background: ${INK};"></div>
</div>`;
}

export function barre(contenu, { gutter = 16, h = 72 } = {}) {
  return `<div style="height: ${h}px; flex: none; box-sizing: border-box; padding: 12px ${gutter}px; background: ${BRU}; border-top: 1.5px solid ${INK}; display: flex; gap: 8px; align-items: center;">${contenu}</div>`;
}

export const barreSysteme = (h = 47, W = 390) => `<div aria-hidden="true" style="height: ${h}px; flex: none; box-sizing: border-box; padding: 0 ${W > 340 ? 30 : 18}px ${h > 30 ? 12 : 3}px; display: flex; align-items: flex-end; justify-content: space-between; font-size: ${h > 30 ? 16 : 13}px; line-height: 20px; font-weight: 600; font-variant-numeric: tabular-nums lining-nums;"><span>9:41</span><svg width="44" height="12" viewBox="0 0 44 12" style="display: block;"><rect x="0" y="8" width="3" height="4" fill="${INK}"></rect><rect x="5" y="6" width="3" height="6" fill="${INK}"></rect><rect x="10" y="3" width="3" height="9" fill="${INK}"></rect><rect x="15" y="0" width="3" height="12" fill="${INK}"></rect><rect x="22.5" y="1.5" width="18" height="9" fill="none" stroke="${INK}" stroke-width="1"></rect><rect x="24.5" y="3.5" width="11" height="5" fill="${INK}"></rect><rect x="41" y="4.5" width="2" height="3" fill="${INK}"></rect></svg></div>`;

export const accueil = (W = 390) => `<div aria-hidden="true" style="height: 34px; flex: none; background: ${BRU}; display: flex; justify-content: center;"><div style="width: 134px; height: 5px; margin-top: 21px; background: ${INK};"></div></div>`;

export function place({ cells, cols, colW, colGap, rowGap, h = 415, gutter = 16, label = 'La place', align = 'center' }) {
  return `<div style="height: ${h}px; flex: none; box-sizing: border-box; padding: 8px ${gutter}px; display: flex; align-items: ${align}; justify-content: center;"><div role="group" aria-label="${label}" style="display: grid; grid-template-columns: repeat(${cols}, ${colW}px); column-gap: ${colGap}px; row-gap: ${rowGap}px;">${cells.join('\n')}</div></div>`;
}

/* ------------------------------------------------------------------ */
/* Cuvette (§ 4.4)                                                     */
/* ------------------------------------------------------------------ */
export const cuvetteStyle = `background: ${TEI}; border-style: solid; border-width: 1px 1.5px 1.5px 1px; border-color: rgba(23,19,15,.38) ${BRU} ${BRU} rgba(23,19,15,.38); border-radius: 2px; box-sizing: border-box;`;
export const cuvetteInner = `<div aria-hidden="true" style="position: absolute; inset: 2px; border: 1px solid rgba(23,19,15,.14); pointer-events: none;"></div>`;
