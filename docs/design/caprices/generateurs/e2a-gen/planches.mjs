// Vignettes du récit (96 × 96, § 6.4 — dessin provisoire en attendant le lot C), cuvette, bâtons gravés.
import { abs, st, esc, glyphe, FELL, FELLSC, papierCSS } from './base.mjs';

const cadreV = (inner, T, s = 96) => `<svg width="${s}" height="${s}" viewBox="0 0 96 96" aria-hidden="true" style="display: block; flex: none;">${inner}<rect x="0.5" y="0.5" width="95" height="95" fill="none" stroke="${T.filet}" stroke-width="1"></rect></svg>`;

export function vignette(nom, T, s = 96) {
  if (nom === 'yeux') {
    // Personne ne nous a vus : la nuit pleine, des yeux réservés dans le grain — aucune lune
    const oeil = (x, y, k, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})"><path d="M-6 0 Q0 -3.4 6 0 Q0 3.4 -6 0 Z" fill="#E8DFCB"></path><circle cx="0.6" cy="0" r="1.5" fill="#17130F"></circle></g>`;
    return cadreV(`<rect width="96" height="96" fill="#17130F"></rect><rect width="96" height="96" fill="#000" filter="url(#aqua-IV)" opacity="0.28"></rect>
<path d="M0 78 C14 72 24 80 38 74 C52 69 64 77 78 72 C86 69 92 72 96 70 V96 H0 Z" fill="#2A241E"></path><path d="M0 84 C20 79 40 86 62 80 C76 77 88 80 96 78" fill="none" stroke="#4A433B" stroke-width="0.8"></path>
${oeil(27, 47, 1.25, -4)}${oeil(43, 45.5, 1.2, 5)}${oeil(64, 31, 0.8, 3)}${oeil(74.5, 32.4, 0.78, -6)}${oeil(58, 63, 0.6, 0)}${oeil(66, 63.6, 0.58, 7)}`, T, s);
  }
  if (nom === 'dormeur') {
    // le dormeur affalé du Caprice 43 : tête dans les bras, sans visage
    return cadreV(`<rect width="96" height="96" fill="${T.surface}"></rect><rect x="1" y="1" width="94" height="40" fill="url(#hach-h-e)" opacity="0.5"></rect>
<path d="M14 66 H84 V90 H14 Z" fill="url(#hach-2-e)" stroke="#17130F" stroke-width="1.2"></path><path d="M10 66 H88" stroke="#17130F" stroke-width="2"></path>
<path d="M22 66 C18 52 24 40 38 36 C50 33 60 38 64 48 L66 58" fill="url(#hach-1-e)" stroke="#17130F" stroke-width="1.3"></path>
<path d="M40 60 C46 50 58 48 70 52 C76 54 78 60 76 66 H40 Z" fill="#F5EFE2" stroke="#17130F" stroke-width="1.3"></path>
<path d="M44 62 C52 56 62 55 72 58" fill="none" stroke="#17130F" stroke-width="0.8"></path><path d="M54 52 C56 46 62 44 66 47" fill="none" stroke="#17130F" stroke-width="1.1"></path>
<path d="M76 66 V58 L80 55 M80 55 L84 58 V66" fill="none" stroke="#17130F" stroke-width="1"></path><path d="M78 48 L80 44 L82 48" fill="none" stroke="#17130F" stroke-width="1"></path>
<path d="M24 22 C26 18 30 18 32 21 M64 16 C67 13 71 14 72 17" fill="none" stroke="#17130F" stroke-width="1"></path>`, T, s);
  }
  if (nom === 'lettre') {
    // la lettre cachetée, glissée sous la porte ; le cachet à l'encre, jamais rouge
    return cadreV(`<rect width="96" height="96" fill="${T.surface}"></rect><path d="M0 74 H96" stroke="#17130F" stroke-width="1.5"></path><rect x="1" y="74" width="94" height="21" fill="url(#hach-3-e)"></rect>
<path d="M58 4 V74 M58 4 H95" stroke="#17130F" stroke-width="1.2" fill="none"></path><rect x="59" y="5" width="36" height="69" fill="url(#hach-1-e)"></rect>
<path d="M14 54 L52 48 L58 70 L20 76 Z" fill="#F5EFE2" stroke="#17130F" stroke-width="1.3"></path><path d="M14 54 L37 64 L52 48" fill="none" stroke="#17130F" stroke-width="1"></path>
<path d="M20 76 L58 70 L58 74 L22 79 Z" fill="url(#hach-2-e)"></path><circle cx="37" cy="63" r="4.2" fill="#17130F"></circle><path d="M35 61.5 L39 64.5 M39 61.5 L35 64.5" stroke="#F5EFE2" stroke-width="0.8"></path>`, T, s);
  }
  return '';
}

/** Feuille-planche plein écran : papier + cuvette de cuivre (§ 4.4) à 24 px. */
export function planche(T, { top, h, w = 390, label, contenu, bas = '', gap = 14 }) {
  const marge = 24, cw = w - 2 * marge, ch = h - 2 * marge;
  return `<div role="dialog" aria-label="${esc(label)}" style="${abs(0, top, w, h, { backgroundColor: T.fond, backgroundImage: papierCSS, borderTop: `1.5px solid ${T.filet}`, borderBottom: `1.5px solid ${T.filet}` })}">
<span aria-hidden="true" style="${abs(0, 3, w, 1, { display: 'block', background: T.filet, height: 0.75 })}"></span>
<div style="${abs(marge, marge, cw, ch, { background: T.fondPlanche, borderRadius: 2, borderStyle: 'solid', borderWidth: '1px 1.5px 1.5px 1px', borderColor: `rgba(23,19,15,.38) ${T.surface} ${T.surface} rgba(23,19,15,.38)`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 16px', gap })}">
<span aria-hidden="true" style="${abs(2, 2, cw - 6.5, ch - 6.5, { border: '1px solid rgba(23,19,15,.14)', pointerEvents: 'none' })}"></span>
${contenu}
</div>${bas}</div>`;
}

export const rubrique = (T, txt, size = 13) => `<div style="${st({ fontFamily: FELLSC, fontSize: size, letterSpacing: '.06em', color: T.encre2, lineHeight: `${size + 3}px` })}">${esc(txt)}</div>`;
export const heureSC = (T, txt) => `<div style="${st({ fontFamily: FELLSC, fontSize: 20, lineHeight: '24px', color: T.encre })}">${esc(txt)}</div>`;
export const legende = (T, txt, size = 18) => `<p style="${st({ margin: 0, fontFamily: FELL, fontStyle: 'italic', fontSize: size, lineHeight: `${size + 6}px`, color: T.narr, textAlign: 'center' })}">« ${esc(txt)} »</p>`;
export const filetDoux = (T, w = 120) => `<span aria-hidden="true" style="${st({ display: 'block', width: w, height: 0.75, background: T.filetDoux, flex: 'none' })}"></span>`;
export function ligneCrieur(T, txt, glyph) {
  const g = glyph ? `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="flex: none; margin-top: 4px;">${glyphe(glyph, 8, 8, 16, T)}</svg>` : '';
  return `<p style="${st({ margin: 0, display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 16, lineHeight: '24px', color: T.encre, textAlign: 'left', alignSelf: 'stretch' })}">${g}<span>${esc(txt)}</span></p>`;
}
/** Crans d'une planche qui passe seule (3-5 s) */
export function crans(T, n, pleins) {
  let s = '';
  for (let i = 0; i < n; i++) s += i < pleins ? `<rect x="${i * 8}" y="0" width="5" height="10" fill="${T.cranPlein}"></rect>` : `<rect x="${i * 8 + 0.5}" y="0.5" width="4" height="9" fill="none" stroke="${T.cranVide}" stroke-width="1"></rect>`;
  return `<svg width="${n * 8 - 3}" height="10" viewBox="0 0 ${n * 8 - 3} 10" aria-hidden="true" style="display: block;">${s}</svg>`;
}

/** Bâtons gravés : un trait par voix ; capitaine = double trait ; Corbeau = plume + deux traits. */
export function batons(T, voix, { h = 20 } = {}) {
  let x = 2, s = '', n = 0;
  const trait = (dx, k) => { const tilt = [0.8, -0.6, 1.1, -0.3, 0.5][k % 5]; s += `<path d="M${(x + dx).toFixed(1)} ${h - 1} L${(x + dx + tilt).toFixed(1)} 1" stroke="${T.encre}" stroke-width="2" stroke-linecap="round"></path>`; };
  for (const v of voix) {
    if (v.corbeau) { s += glyphe('plume', x + 7, h / 2, 14, T); x += 16; trait(0, n++); trait(4, n++); x += 9; continue; }
    if (v.double) { trait(0, n++); trait(3, n++); x += 9; continue; }
    trait(0, n++); x += 6;
    if (n % 5 === 0) x += 4;
  }
  return `<svg width="${x}" height="${h}" viewBox="0 0 ${x} ${h}" aria-hidden="true" style="display: block; flex: none;">${s}</svg>`;
}
