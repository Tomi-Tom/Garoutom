// Lot F — bibliothèque commune des planches (générateur ; hors du canevas).
import { readFileSync } from 'node:fs';

export const C = {
  b900: '#17130F', b800: '#2A241E', p3: '#4A433B', p2: '#7A7064', p1: '#A89D8C',
  del: '#5E554A', tei: '#E1D7C1', ver: '#E8DFCB', bru: '#F5EFE2',
  san: '#A23B24', cra: '#D9765A', gE: '#8A3A5C', gC: '#D29AA6',
  rou: '#8C6A3F', vb: '#45523F', creux: '#0F0C09',
};

// Sémantiques par tirage (SPEC § 3.3 / § 3.10)
export const PAPIER = {
  nom: 'papier', suf: 'e',
  fond: C.ver, planche: C.tei, surface: C.bru, creux: C.tei,
  encre: C.b900, encre2: C.del, narr: C.del, filet: C.b900, filetDoux: C.p2,
  surEncre: C.bru, village: C.b900, meute: C.san, serment: C.gE, audela: C.del,
  mortTrait: C.p2, mortTexte: C.del, mortBuste: C.p1, focus: C.b900,
  actFond: C.b900, actTexte: C.bru, actBord: C.b900,
  cranPlein: C.b900, cranVide: C.p2,
};
export const CUIVRE = {
  nom: 'cuivre', suf: 'v',
  fond: C.b900, planche: C.b900, surface: C.b800, creux: C.creux,
  encre: C.ver, encre2: C.p1, narr: C.p1, filet: C.p2, filetDoux: C.p3,
  surEncre: C.b900, village: C.ver, meute: C.cra, serment: C.gC, audela: C.p1,
  mortTrait: C.p2, mortTexte: C.p1, mortBuste: C.p1, focus: C.ver,
  actFond: C.p3, actTexte: C.ver, actBord: C.p1,
  cranPlein: C.p2, cranVide: C.p3,
};

export const FELL = "'IM Fell French Canon', Georgia, serif";
export const SC = "'IM Fell French Canon SC', Georgia, serif";
export const SERIF = "'Source Serif 4', Georgia, serif";

const TEXTURES = 'D:/TomArcade/Garoutom/docs/design/caprices/textures.svg';
export const TEXTURE_DEFS = readFileSync(TEXTURES, 'utf8').match(/^<defs>[\s\S]*?^<\/defs>/m)[0];

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const n = (v) => (Math.round(v * 100) / 100).toString();

let uid = 0;
export const id = (p = 'u') => `${p}${++uid}`;

/** Styles de texte. */
export function ts({ f = 'serif', s = 16, lh, w = 400, c = C.b900, it = false, ls, extra = '' } = {}) {
  const fam = f === 'fell' ? FELL : f === 'sc' ? SC : SERIF;
  let st = `font-family: ${fam}; font-size: ${s}px; line-height: ${lh ?? Math.round(s * 1.3)}px; font-weight: ${w}; color: ${c};`;
  if (it) st += ' font-style: italic;';
  if (ls) st += ` letter-spacing: ${ls};`;
  if (f === 'serif') st += ' font-optical-sizing: auto;';
  return st + (extra ? ' ' + extra : '');
}

/** Attributs SVG de texte. */
export function st({ f = 'serif', s = 16, w = 400, c = C.b900, it = false, ls, anchor, extra = '' } = {}) {
  const fam = f === 'fell' ? FELL : f === 'sc' ? SC : SERIF;
  let a = `font-family="${fam.replace(/"/g, '')}" font-size="${s}" font-weight="${w}" fill="${c}"`;
  if (it) a += ' font-style="italic"';
  if (ls) a += ` letter-spacing="${ls}"`;
  if (anchor) a += ` text-anchor="${anchor}"`;
  return a + (extra ? ' ' + extra : '');
}
export const T = (x, y, text, o) => `<text x="${n(x)}" y="${n(y)}" ${st(o)}>${esc(text)}</text>`;

/** Le papier vergé de fond d'artboard (SPEC § 4.5) — rousseurs ocre, jamais sanguine. */
export function paperBg(w, h, seed = 1) {
  const r = rng(seed);
  let rous = '';
  const nb = Math.round((w * h) / (512 * 512) * 6);
  for (let i = 0; i < nb; i++) {
    const cx = r() * w, cy = r() * h, rad = 1 + r() * 3.5, op = 0.04 + r() * 0.04;
    rous += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad)}" opacity="${n(op)}"></circle>`;
    if (r() > 0.5) rous += `<circle cx="${n(cx + 1.5)}" cy="${n(cy - 1)}" r="${n(rad * 0.4)}" opacity="${n(op + 0.02)}"></circle>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="${w}" height="${h}" fill="#000" filter="url(#papier)" opacity="0.22"></rect><g fill="${C.rou}">${rous}</g></svg>`;
}
export const PAPER_STYLE = `background-color: ${C.ver}; background-image: repeating-linear-gradient(90deg, rgba(23,19,15,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(23,19,15,.035) 0 .6px, transparent .6px 3px);`;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Coque complète d'un artboard .dc.html. */
export function page({ titre, w = 1600, h = 1400, defs = '', body, fond = 'papier', seed = 3 }) {
  const rootStyle = `width: ${w}px; height: ${h}px; box-sizing: border-box; position: relative; overflow: hidden; ${fond === 'papier' ? PAPER_STYLE : `background-color: ${C.b900};`} font-family: ${SERIF}; color: ${C.b900};`;
  return `<!doctype html>
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
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
a{color:#666}a:hover{color:#333}
</style>
</helmet>
<div style="${rootStyle}">
<!-- Les <defs> de textures.svg, collées telles quelles (SPEC § 7.2), puis celles du lot F -->
<svg width="0" height="0" style="position: absolute; width: 0; height: 0;" aria-hidden="true">
${TEXTURE_DEFS}
<defs>
${defs}
</defs>
</svg>
${fond === 'papier' ? paperBg(w, h, seed) : ''}
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

/** En-tête de planche de système. */
export function entete({ num, titre, legende, refs, vous }) {
  return `<header style="position: absolute; left: 40px; top: 28px; width: 1520px; height: 84px; display: flex; justify-content: space-between; align-items: flex-end;">
  <div style="display: flex; flex-direction: column; gap: 2px;">
    <div style="${ts({ f: 'sc', s: 14, lh: 20, c: C.del, ls: '.06em' })}">Garoutom · Caprices · lot F — Fondations</div>
    <div style="display: flex; align-items: baseline; gap: 20px;">
      <h1 style="margin: 0; ${ts({ f: 'fell', s: 44, lh: 48 })}">${esc(titre)}</h1>
      <p style="margin: 0; ${ts({ f: 'fell', s: 20, lh: 28, it: true, c: C.del })}">« ${esc(legende)} »</p>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
    <div style="${ts({ f: 'fell', s: 28, lh: 32 })}">Pl. ${esc(num)}</div>
    <div style="${ts({ s: 13, lh: 16, c: C.del })}">${esc(refs)}${vous ? ' · ' + esc(vous) : ''}</div>
  </div>
</header>
<div style="position: absolute; left: 40px; top: 118px; width: 1520px; height: 6px; box-sizing: border-box; border-top: 1.5px solid ${C.b900}; border-bottom: 0.75px solid ${C.b900};"></div>`;
}

/** Une section posée en absolu : rubrique SC + filet 0,75. */
export function section({ x, y, w, h, lettre, titre, note, contenu, fondCuivre = false }) {
  return `<section style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box;">
  <div style="display: flex; align-items: baseline; gap: 12px; border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px;">
    <span style="${ts({ f: 'sc', s: 15, lh: 20, c: C.b900, ls: '.06em' })}">${lettre} · ${esc(titre)}</span>
    ${note ? `<span style="${ts({ s: 13, lh: 16, c: C.del })}">${note}</span>` : ''}
  </div>
  <div style="position: relative; margin-top: 10px;">${contenu}</div>
</section>`;
}

/** Plaque de cuivre encrée (fond aquatinte IV) pour poser un spécimen nocturne. */
export function cuivreRect(x, y, w, h, grain = true) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${C.b900}"></rect>${grain ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"></rect>` : ''}`;
}
export function paperRect(x, y, w, h, fill = C.ver) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"></rect>`;
}

/** Aplat + grain d'un palier. */
export const PALIERS = {
  I: [C.p1, 0.18], II: [C.p2, 0.22], III: [C.p3, 0.2], IV: [C.b900, 0.28],
};
export function palierRect(p, x, y, w, h) {
  const [a, o] = PALIERS[p];
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${a}"></rect><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#000" filter="url(#aqua-${p})" opacity="${o}"></rect>`;
}

/** Cuvette (SPEC § 4.4) en SVG. */
export function cuvette(x, y, w, h, tirage = 'papier') {
  if (tirage === 'cuivre') {
    return `${cuivreRect(x, y, w, h)}<rect x="${n(x + 0.5)}" y="${n(y + 0.5)}" width="${n(w - 1)}" height="${n(h - 1)}" fill="none" stroke="${C.p3}" stroke-width="1"></rect><rect x="${n(x + 2.5)}" y="${n(y + 2.5)}" width="${n(w - 5)}" height="${n(h - 5)}" fill="none" stroke="${C.b800}" stroke-width="1"></rect>`;
  }
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="2" fill="${C.tei}"></rect><path d="M${n(x + 0.5)} ${n(y + h)} V${n(y + 0.5)} H${n(x + w)}" fill="none" stroke="${C.b900}" stroke-opacity="0.38" stroke-width="1"></path><path d="M${n(x + w - 0.75)} ${n(y)} V${n(y + h - 0.75)} H${n(x)}" fill="none" stroke="${C.bru}" stroke-width="1.5"></path><rect x="${n(x + 2.5)}" y="${n(y + 2.5)}" width="${n(w - 5)}" height="${n(h - 5)}" fill="none" stroke="${C.b900}" stroke-opacity="0.14" stroke-width="1"></rect>`;
}

/** Boîte HTML : style d'une note de documentation (13/18 délavé). */
export const NOTE = ts({ s: 13, lh: 18, c: C.del });
export const NOTE_ENCRE = ts({ s: 13, lh: 18, c: C.b900 });

/** Ferme les éléments auto-fermants (règle 3 du guide). */
export function fermer(html) {
  return html.replace(/<([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)\s*\/>/g, '<$1$2></$1>');
}

/** Motifs propres au lot F (complètent textures.svg, sans en changer un identifiant). */
export const LF_DEFS = `<pattern id="lf-barre-v" width="4" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="4" y2="1.5" stroke="#E8DFCB" stroke-width="0.9"/></pattern>
<pattern id="lf-hachx-p2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V4M0 0H4" stroke="#7A7064" stroke-width="0.7" fill="none"/></pattern>
<pattern id="lf-hach-1-p2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7A7064" stroke-width="0.6"/></pattern>`;
