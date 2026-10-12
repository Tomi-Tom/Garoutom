// Lot C — bibliothèque commune : encres, tirages, matières, gabarit de page.
import { readFileSync } from 'node:fs';

export const K = {
  b9: '#17130F', b8: '#2A241E', p3: '#4A433B', p2: '#7A7064', p1: '#A89D8C',
  del: '#5E554A', tei: '#E1D7C1', ver: '#E8DFCB', bru: '#F5EFE2',
  san: '#A23B24', cra: '#D9765A', gE: '#8A3A5C', gC: '#D29AA6', rou: '#8C6A3F', creux: '#0F0C09',
};
export const F = {
  fell: "'IM Fell French Canon', Georgia, serif",
  sc: "'IM Fell French Canon SC', Georgia, serif",
  ss: "'Source Serif 4', Georgia, serif",
};
export const PAPIER = {
  nom: 'papier', fond: K.ver, planche: K.tei, surface: K.bru, creux: K.tei, encre: K.b9, encre2: K.del, narr: K.del,
  filet: K.b9, filetDoux: K.p2, surEncre: K.bru, meute: K.san, serment: K.gE, audela: K.del,
  mortTrait: K.p2, mortTexte: K.del, actionFond: K.b9, actionTexte: K.bru, actionBord: K.b9,
  cranPlein: K.b9, cranVide: K.p2, hachV: false,
};
export const CUIVRE = {
  nom: 'cuivre', fond: K.b9, planche: K.b9, surface: K.b8, creux: K.creux, encre: K.ver, encre2: K.p1, narr: K.p1,
  filet: K.p2, filetDoux: K.p3, surEncre: K.b9, meute: K.cra, serment: K.gC, audela: K.p1,
  mortTrait: K.p2, mortTexte: K.p1, actionFond: K.p3, actionTexte: K.ver, actionBord: K.p1,
  cranPlein: K.p2, cranVide: K.p3, hachV: true,
};

export const FONTS = 'https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap';

// ---- identifiants uniques par artboard (les artboards peuvent partager un document)
let PFX = 'cC', N = 0;
export const setPfx = (p) => { PFX = p; N = 0; };
export const uid = (s = 'i') => `${PFX}-${s}${++N}`;

// ---- les <defs> de textures.svg, collées telles quelles (balises fermées explicitement)
const TEX = readFileSync('D:/TomArcade/Garoutom/docs/design/caprices/textures.svg', 'utf8');
const D0 = TEX.indexOf('<defs>', TEX.indexOf('<svg '));
const DEFS = TEX.slice(D0, TEX.indexOf('</defs>', D0) + 7);
export const closeTags = (s) => s.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g, '<$1$2></$1>');
export const DEFS_SVG = `<svg width="0" height="0" style="position: absolute; width: 0; height: 0;" aria-hidden="true">\n${closeTags(DEFS)}\n</svg>`;

export function page({ title, w, h, bg, body }) {
  const html = `<!doctype html>
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
<link href="${FONTS}" rel="stylesheet">
<style>
body{margin:0}
a{color:#666}a:hover{color:#333}
</style>
</helmet>
<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; position: relative; overflow: hidden; ${bg} font-family: ${F.ss};">
${DEFS_SVG}
${closeTags(body)}
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
  return html;
}

// ---- fonds
export const BG_PAPIER = `background-color: ${K.ver}; background-image: repeating-linear-gradient(90deg, rgba(23,19,15,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(23,19,15,.035) 0 .6px, transparent .6px 3px); color: ${K.b9};`;
export const BG_CUIVRE = `background-color: ${K.b9}; color: ${K.ver};`;

/** grain de papier + rousseurs ocre (jamais sanguine), pleine surface */
export function grainPapier(w, h, seed = 1) {
  const r = rnd(seed);
  let dots = '';
  const n = Math.round((w * h) / 52000) + 3;
  for (let i = 0; i < n; i++) {
    const x = (r() * w).toFixed(0), y = (r() * h).toFixed(0), rr = (2 + r() * 7).toFixed(1), o = (0.04 + r() * 0.04).toFixed(3);
    dots += `<circle cx="${x}" cy="${y}" r="${rr}" opacity="${o}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="${w}" height="${h}" fill="#000" filter="url(#papier)" opacity="0.22"/><g fill="${K.rou}">${dots}</g></svg>`;
}
/** aquatinte IV pleine surface (le cuivre) */
export function grainCuivre(w, h, x = 0, y = 0) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: ${x}px; top: ${y}px; pointer-events: none;" aria-hidden="true"><rect width="${w}" height="${h}" fill="${K.b9}"/><rect width="${w}" height="${h}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/></svg>`;
}

export function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

// ---- hachures : vrais traits (currentColor ou couleur donnée), découpés par une forme
export function lignes(cx, cy, R, pas) {
  let d = '';
  for (let y = cy - R; y <= cy + R; y += pas) d += `M${(cx - R).toFixed(2)} ${y.toFixed(2)}H${(cx + R).toFixed(2)}`;
  return d;
}
/** d = forme (dans l'espace courant) ; box = [x,y,w,h] ; angle en degrés (45 = « / ») */
export function hach(d, box, { pas = 6, sw = 0.6, angle = 45, color = 'currentColor', rule = 'nonzero', sil = false, op = 1, tr = '' } = {}) {
  if (sil) return `<path d="${d}" fill="${color}" fill-rule="${rule}"${tr ? ` transform="${tr}"` : ''}/>`;
  const id = uid('cl');
  const [x, y, w, h] = box;
  const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + pas;
  return `<clipPath id="${id}"><path d="${d}" clip-rule="${rule}"${tr ? ` transform="${tr}"` : ''}/></clipPath><g clip-path="url(#${id})"${op < 1 ? ` opacity="${op}"` : ''}><path d="${lignes(cx, cy, R, pas)}" transform="rotate(${-angle} ${cx} ${cy})" stroke="${color}" stroke-width="${sw}" fill="none"/></g>`;
}
export function hachRect(x, y, w, h, o = {}) { return hach(`M${x} ${y}h${w}v${h}h${-w}Z`, [x, y, w, h], o); }

/** hachures courbes (SPEC § 4.3) */
export function courbes(cx, cy, r, pas = 4.5, debut = 80, fin = 200) {
  const rad = (a) => (a * Math.PI) / 180;
  let d = '';
  for (let k = r - 2, i = 0; k > r * 0.45; k -= pas, i++) {
    const a0 = rad(debut + i * 6), a1 = rad(fin - i * 9);
    const p = (a) => `${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`;
    d += `M${p(a0)} A${k.toFixed(1)} ${k.toFixed(1)} 0 0 1 ${p(a1)} `;
  }
  return d;
}

/** grain d'aquatinte découpé par une forme : clair (IV/III) ou sombre (I/II) */
export function grain(d, box, { f = 'aqua-IV', op = 0.28, tr = '', sc = 1 } = {}) {
  const id = uid('gr');
  const [x, y, w, h] = box;
  const rect = sc === 1
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" filter="url(#${f})" opacity="${op}"/>`
    : `<rect x="${x / sc}" y="${y / sc}" width="${w / sc}" height="${h / sc}" transform="scale(${sc})" fill="#000" filter="url(#${f})" opacity="${op}"/>`;
  return `<clipPath id="${id}"><path d="${d}"${tr ? ` transform="${tr}"` : ''}/></clipPath><g clip-path="url(#${id})">${rect}</g>`;
}

// ---- la cuvette (SVG), x,y,w,h
export function cuvetteSvg(x, y, w, h, t, { mordu = false, mordu2 = false, fill } = {}) {
  if (t.nom === 'cuivre') {
    const f = fill ?? K.b9;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
    if (!fill) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
    const edge = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="none" stroke="${K.p3}" stroke-width="1"/>`;
    const inner = `<rect x="${x + 3.5}" y="${y + 3.5}" width="${w - 7}" height="${h - 7}" fill="none" stroke="${mordu2 ? K.p3 : K.b8}" stroke-width="1"/>`;
    s += mordu ? `<g filter="url(#mordu)">${edge}</g>` : edge;
    s += mordu2 ? `<g filter="url(#mordu)">${inner}</g>` : inner;
    return s;
  }
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill ?? K.tei}"/>`;
  const sombre = `<path d="M${x} ${y + h}V${y}H${x + w}" fill="none" stroke="${K.b9}" stroke-opacity="${mordu ? 0.6 : 0.38}" stroke-width="${mordu ? 1.4 : 1}"/>`;
  const clair = `<path d="M${x + w} ${y}V${y + h}H${x}" fill="none" stroke="${K.bru}" stroke-width="1.5"/>`;
  const inner = `<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="none" stroke="${K.b9}" stroke-opacity="${mordu2 ? 0.45 : 0.14}" stroke-width="1"/>`;
  s += mordu ? `<g filter="url(#mordu)">${sombre}${clair}</g>` : sombre + clair;
  s += mordu2 ? `<g filter="url(#mordu)">${inner}</g>` : inner;
  return s;
}

// ---- cartouches de camp (SPEC § 5.3), dessinés à toute taille
export function cartPath(kind, w, h) {
  const s = h / 30, c = 6 * s;
  const R = (x, y) => `${(w - (120 - x) * s).toFixed(2)} ${(y * s).toFixed(2)}`;
  const L = (x, y) => `${(x * s).toFixed(2)} ${(y * s).toFixed(2)}`;
  const ecu = `M${c} 0.75H${w - c}L${w - 0.75} ${c}V${h - c}L${w - c} ${h - 0.75}H${c}L0.75 ${h - c}V${c}Z`;
  if (kind === 'ecu' || kind === 'audela') return ecu;
  const droite = `L${R(104, 6)}L${R(109, 2)}L${R(111, 10)}L${R(119, 13)}L${R(112, 17)}L${R(118, 23)}L${R(110, 25)}L${R(106, 29)}`;
  if (kind === 'mordu') return `M${c} 0.75H${R(100, 1)}${droite}H${c}L0.75 ${h - c}V${c}Z`;
  if (kind === 'mordu2') return `M${L(20, 1)}H${R(100, 1)}${droite}H${L(20, 29).split(' ')[0]}L${L(16, 24)}L${L(11, 28)}L${L(9, 20)}L${L(1, 17)}L${L(8, 13)}L${L(2, 7)}L${L(10, 5)}L${L(14, 1)}Z`;
  return ecu;
}
/** cartouche en SVG : x,y = coin haut-gauche ; kind ecu|mordu|mordu2|lacs|audela|ovale */
export function cartouche(kind, x, y, w, h, mot, t, { fs, weight, mort = false } = {}) {
  const P = t.nom === 'papier';
  fs = fs ?? (h >= 26 ? 14 : 12);
  let stroke = t.encre, sw = 1.5, fill = t.surface, txt = t.encre, wt = weight ?? 400, style = '', dash = '';
  if (kind === 'mordu' || kind === 'mordu2') { stroke = t.meute; sw = 2; txt = t.meute; wt = weight ?? 600; }
  if (kind === 'mordu2' && P) { fill = K.san; txt = K.bru; }
  if (kind === 'lacs') { stroke = t.serment; sw = 2; txt = t.serment; }
  if (kind === 'audela') { stroke = t.audela; sw = 1.2; fill = 'none'; txt = t.audela; style = 'italic'; dash = '1.5 3'; }
  if (kind === 'ovale') { stroke = t.encre2; sw = 1.4; fill = 'none'; txt = t.encre2; dash = '3 3'; }
  if (mort) { stroke = t.mortTrait; txt = t.mortTexte; wt = 400; if (kind === 'mordu2') fill = t.surface; }
  let shape;
  if (kind === 'lacs') {
    const r = h / 2;
    shape = `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="${r - 1}" fill="${t.surface}" stroke="${stroke}" stroke-width="${h >= 26 ? 2 : 1.6}"/><rect x="${x + 4.5}" y="${y + 4.5}" width="${w - 9}" height="${h - 9}" rx="${r - 4.5}" fill="none" stroke="${stroke}" stroke-width="0.9"/>`;
  } else if (kind === 'ovale') {
    shape = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" fill="${t.surface}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}"/>`;
  } else {
    shape = `<path d="${cartPath(kind, w, h)}" transform="translate(${x} ${y})" fill="${kind === 'audela' ? t.surface : fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="miter"/>`;
  }
  const ty = y + h / 2 + fs * 0.36;
  return `${shape}<text x="${x + w / 2}" y="${ty.toFixed(1)}" text-anchor="middle" font-family="${F.ss}" font-size="${fs}" font-weight="${wt}"${style ? ` font-style="${style}"` : ''} fill="${txt}">${mot}</text>`;
}
/** cartouche HTML autonome (svg inline dimensionné) */
export function cartoucheSvg(kind, w, h, mot, t, o = {}) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display: block; overflow: visible;" role="img" aria-label="${mot}">${cartouche(kind, 0, 0, w, h, mot, t, o)}</svg>`;
}

export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- texte SVG en plusieurs lignes
export function tlines(x, y, lh, lines, attrs) {
  return `<text x="${x}" y="${y}" ${attrs}>${lines.map((l, i) => `<tspan x="${x}" y="${y + i * lh}">${l}</tspan>`).join('')}</text>`;
}

// ---- rubrique d'atelier pour les planches de documentation
export function rubrique(txt, t = PAPIER) {
  return `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${t.encre2};">${txt}</div>`;
}
