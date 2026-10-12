// Gabarit unique de la nuit — lot E1b « Caprices ».
// Une seule source pour les zones (SPEC § 7.1) : chaque écran ne change que le
// contenu des zones. Les hauteurs, les classes et l'ordre ne bougent jamais.
import { readFileSync } from 'node:fs';

const TEX = 'D:/TomArcade/Garoutom/docs/design/caprices/textures.svg';
export const DEFS_TEX = readFileSync(TEX, 'utf8').match(/^<defs>[\s\S]*?^<\/defs>/m)[0];

export const FONTS = 'https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap';
export const FELL = "'IM Fell French Canon', Georgia, serif";
export const FELLSC = "'IM Fell French Canon SC', Georgia, serif";
export const SERIF = "'Source Serif 4', Georgia, serif";

/* ── Tirages (sémantiques § 3.3) ─────────────────────────────────────── */
export const CUIVRE = {
  nom: 'cuivre', fond: '#17130F', grain: 'aqua-IV', grainOp: '0.28',
  surface: '#2A241E', creux: '#0F0C09', encre: '#E8DFCB', encre2: '#A89D8C',
  narrateur: '#A89D8C', filet: '#7A7064', filetDoux: '#4A433B',
  meute: '#D9765A', meuteForme: '#A89D8C', serment: '#D29AA6', audela: '#A89D8C',
  mortTrait: '#7A7064', mortTexte: '#A89D8C', mortBuste: '#A89D8C',
  actionFond: '#4A433B', actionTexte: '#E8DFCB', actionBord: '#A89D8C',
  surEncre: '#17130F', cranPlein: '#7A7064', cranVide: '#4A433B',
  jetonFond: '#2A241E', toit: '#4A433B', toitTrait: '#7A7064', brunie: '#4A433B',
  piste: '#7A7064', h1: 'hach-1-v', h2: 'hach-2-v', h3: 'hach-3-v', hx: 'hach-x-v',
};
// L'instant de la morsure II (Nuit-Tombe) : tout l'écran au palier II.
export const MORSURE2 = {
  ...CUIVRE, nom: 'morsure-II', fond: '#7A7064', grain: 'aqua-II', grainOp: '0.22',
  surface: '#7A7064', creux: '#7A7064', encre: '#17130F', encre2: '#2A241E',
  narrateur: '#2A241E', filet: '#17130F', filetDoux: '#4A433B',
  meute: '#17130F', meuteForme: '#17130F', mortTrait: '#4A433B', mortTexte: '#2A241E',
  mortBuste: '#4A433B', actionFond: '#7A7064', actionTexte: '#17130F', actionBord: '#17130F',
  surEncre: '#7A7064', cranPlein: '#17130F', cranVide: '#4A433B', jetonFond: '#7A7064',
  toit: '#4A433B', toitTrait: '#17130F', piste: '#4A433B',
  h1: 'hach-1-e', h2: 'hach-2-e', h3: 'hach-3-e', hx: 'hach-x-e',
};

/* ── La partie témoin (§ 7.3) ───────────────────────────────────────── */
export const SIEGES = [
  null,
  'Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Fanny', 'Gaspard', 'Hélène',
  'Inès', 'Jules', 'Tom', 'Léa', 'Malo', 'Nour', 'Octave', 'Paulette', 'Quentin', 'Rose',
];
export const COUVRE_CHEFS = [null, 'tricorne', 'mantille à peigne', 'bonnet de nuit', 'coroza',
  'chambergo', 'montera', 'capuche de moine', 'cofia', 'bicorne', 'turban', 'boina',
  'perruque à catogan', 'haut-de-forme évasé', 'fichu noué', 'calotte', 'cornette',
  'chapeau de paille', 'chapeau à plumet'];

/* ── Les dix-huit couvre-chefs (§ 5.1.2), boîte 48 ─────────────────────
   p : masse à l'encre · c : rond à l'encre · s : détail en réserve (couleur du
   fond) · h : voile en hachure · l : trait d'encre (plume). */
const CHAPEAUX = {
  1: [['p', 'M10 15 L24 8 L38 15 L33 17 C28 14 20 14 15 17 Z']],
  2: [['h', 'M16 14 C13 22 12 29 10 36 L14 36 C16 28 17 21 19 15 Z'], ['h', 'M32 14 C35 22 36 29 38 36 L34 36 C32 28 31 21 29 15 Z'],
      ['p', 'M17 13 L18 4 L21 1.5 L24 1 L27 1.5 L30 4 L31 13 C28 11.5 20 11.5 17 13 Z'], ['s', 'M21 3.5 L22 11 M24 2.5 V11 M27 3.5 L26 11']],
  3: [['p', 'M15 17 C15 9 21 6 27 7 C33 8 37 12 39 19 L37 20 C35 15 31 13 27 13 C22 13 18 14 15 17 Z'], ['c', 39, 22.5, 2.6]],
  4: [['p', 'M17 16 L24 0 L31 16 Z']],
  5: [['p', 'M3 15 C10 11.5 38 11.5 45 15 C38 18 10 18 3 15 Z'], ['p', 'M17 14 C17 7.5 31 7.5 31 14 Z']],
  6: [['p', 'M14 17 C13 12 16 9 20 10 C21 6 27 6 28 10 C32 9 35 12 34 17 C30 14.5 18 14.5 14 17 Z'], ['c', 13.5, 18.5, 3], ['c', 34.5, 18.5, 3]],
  7: [['p', 'M11 36 C11 23 15 12 24 1 C33 12 37 23 37 36 L31 36 C31 25 29 16 24 13.5 C19 16 17 25 17 36 Z']],
  8: [['p', 'M14.5 16 C14.5 7 33.5 7 33.5 16 Z'], ['c', 15, 16.6, 1.6], ['c', 18.6, 17.5, 1.6], ['c', 22.2, 18, 1.6], ['c', 25.8, 18, 1.6], ['c', 29.4, 17.5, 1.6], ['c', 33, 16.6, 1.6]],
  9: [['p', 'M6 15 C9 5 39 5 42 15 C35 12 13 12 6 15 Z']],
  10: [['p', 'M14 17 C11 7 37 7 34 17 C30 14.5 18 14.5 14 17 Z'], ['s', 'M15.5 13 C20 10.5 28 10.5 32.5 13 M17 9.8 C21 8 27 8 31 9.8']],
  11: [['p', 'M13 14.5 C12 9.5 29 7 39 11 C41.5 13 38 15.5 33 15.5 C26 14.5 18 15.5 13 14.5 Z'], ['p', 'M23.4 9 L23.6 5.5 L25 5.5 L24.6 9 Z']],
  12: [['p', 'M15 17 C15 9.5 33 9.5 33 17 C29 14 19 14 15 17 Z'], ['c', 14.5, 20, 3], ['c', 33.5, 20, 3], ['c', 14.5, 25.5, 2.6], ['c', 33.5, 25.5, 2.6]],
  13: [['p', 'M18 13.5 L16 0.5 H32 L30 13.5 Z'], ['p', 'M12 16 C18 12.5 30 12.5 36 16 L34 16.5 C29 14.5 19 14.5 14 16.5 Z'], ['s', 'M17.6 10 H30.4']],
  14: [['p', 'M15 22 C14 11 34 11 33 22 L30.5 21 C30 15.5 18 15.5 17.5 21 Z'], ['p', 'M16 23 L21 30 L24 29 L27 30 L32 23 L30 22 L26.5 27.5 L24 28 L21.5 27.5 L18 22 Z'], ['p', 'M22 30 L19 36 L24 32 L29 36 L26 30 Z']],
  15: [['p', 'M18.5 14.5 C18.5 9.5 29.5 9.5 29.5 14.5 Z']],
  16: [['p', 'M16 15.5 C16 9.5 32 9.5 32 15.5 Z'], ['p', 'M17 13 L3 5 L7 15 Z'], ['p', 'M31 13 L45 5 L41 15 Z']],
  17: [['p', 'M4 16 L7 14.5 L6 13 C14 11 34 11 42 13 L41 14.5 L44 16 L40 16.6 L41 18 L36 17 L34 18.6 L31 17.2 L27 18.4 L24 17.2 L20 18.6 L16 17.2 L13 18.6 L11 17 L7 18 L8 16.6 Z'],
       ['p', 'M18 13.5 C18 6.5 30 6.5 30 13.5 Z'], ['s', 'M18.2 11.5 H29.8']],
  18: [['p', 'M12 15 C15 9.5 33 9.5 36 15 C30 13 18 13 12 15 Z'], ['p', 'M12 15 L9.5 8 L15 11.5 Z'], ['l', 'M29 10.5 C34 7 28 4 33 0.5']],
};

/** Symboles des bustes : `cc-N` (vivant, eau-forte) et `ccm-N` (mort, bruni au contour). */
export function defsBustes(T) {
  let s = '';
  for (let n = 1; n <= 18; n++) {
    let v = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48 Z" fill="url(#${T.h2})" stroke="${T.encre}" stroke-width="1"></path><circle cx="24" cy="21" r="8" fill="url(#${T.h1})" stroke="${T.encre}" stroke-width="1"></circle>`;
    let m = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48" fill="none" stroke="${T.mortBuste}" stroke-width="1"></path><circle cx="24" cy="21" r="8" fill="none" stroke="${T.mortBuste}" stroke-width="1"></circle>`;
    for (const e of CHAPEAUX[n]) {
      if (e[0] === 'p') { v += `<path d="${e[1]}" fill="${T.encre}"></path>`; m += `<path d="${e[1]}" fill="none" stroke="${T.mortBuste}" stroke-width="0.9"></path>`; }
      if (e[0] === 'c') { v += `<circle cx="${e[1]}" cy="${e[2]}" r="${e[3]}" fill="${T.encre}"></circle>`; m += `<circle cx="${e[1]}" cy="${e[2]}" r="${e[3]}" fill="none" stroke="${T.mortBuste}" stroke-width="0.9"></circle>`; }
      if (e[0] === 'h') { v += `<path d="${e[1]}" fill="url(#${T.h2})" stroke="${T.encre}" stroke-width="0.75"></path>`; m += `<path d="${e[1]}" fill="none" stroke="${T.mortBuste}" stroke-width="0.75"></path>`; }
      if (e[0] === 's') { v += `<path d="${e[1]}" fill="none" stroke="${T.jetonFond}" stroke-width="1"></path>`; }
      if (e[0] === 'l') { v += `<path d="${e[1]}" fill="none" stroke="${T.encre}" stroke-width="1.6" stroke-linecap="round"></path>`; m += `<path d="${e[1]}" fill="none" stroke="${T.mortBuste}" stroke-width="0.9" stroke-linecap="round"></path>`; }
    }
    s += `<symbol id="cc-${n}" viewBox="0 0 48 48">${v}</symbol><symbol id="ccm-${n}" viewBox="0 0 48 48">${m}</symbol>`;
  }
  return s;
}

/* ── Icônes gravées (§ 6.3), currentColor ───────────────────────────── */
const ic = (w, body, extra = '') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" aria-hidden="true" style="display: block;${extra}">${body}</svg>`;
const st = (d, sw = 1.5) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"></path>`;
export const ICONES = {
  retour: (w = 24) => ic(w, st('M14.5 5 L7.5 12 L14.5 19') + st('M10.5 12 H19', 1)),
  carte: (w = 24) => ic(w, st('M6 3.5 H15 L18.5 7 V20.5 H6 Z') + st('M15 3.5 V7 H18.5', 1) + st('M8.5 12.5 L12 9 M8.5 16 L15.5 9 M11 18 L16 13', 0.75)),
  menu: (w = 24) => ic(w, st('M4 7 H20 M4 12 H17 M4 17 H19')),
  cloche: (w = 24) => ic(w, st('M7 16 V11 C7 7.5 9.2 5 12 5 C14.8 5 17 7.5 17 11 V16 L18.5 17.5 H5.5 Z') + st('M12 3 V5') + st('M12 17.5 V19') + `<circle cx="12" cy="20.2" r="1.2" fill="currentColor"></circle>`),
  registre: (w = 24) => ic(w, st('M5 4.5 H17.5 C18.4 4.5 19 5.1 19 6 V19.5 H7 C5.9 19.5 5 18.6 5 17.5 Z') + st('M5 17.5 C5 16.4 5.9 15.5 7 15.5 H19', 1) + st('M19 9.5 H16 V12.5 H19', 1.25) + st('M8 8 H14 M8 11 H13', 0.75)),
  chevronHaut: (w = 24) => ic(w, st('M6.5 14.5 L12 9 L17.5 14.5')),
  chevronBas: (w = 24) => ic(w, st('M6.5 9.5 L12 15 L17.5 9.5')),
  plume: (w = 24) => ic(w, st('M20 3.5 C13 4.5 8 9 5.5 18.5 M20 3.5 C19 9.5 14 14 7.5 14.5') + st('M8.5 12 L12.5 8 M10 13.5 L14 9.5', 0.75) + st('M4 20.5 H11', 1)),
};
// glyphes 16 (viewBox 16)
const g16 = (w, body) => `<svg width="${w}" height="${w}" viewBox="0 0 16 16" aria-hidden="true" style="display: inline-block; vertical-align: -3px;">${body}</svg>`;
export const GLYPHES = {
  sablier: (w = 16, retourne = false) => g16(w, `<g${retourne ? ' transform="rotate(180 8 8)"' : ''}><path d="M3.5 1.5 H12.5 M3.5 14.5 H12.5 M4.5 1.5 C4.5 5.5 8 6.5 8 8 C8 9.5 4.5 10.5 4.5 14.5 M11.5 1.5 C11.5 5.5 8 6.5 8 8 C8 9.5 11.5 10.5 11.5 14.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><path d="M6 13.8 L8 11.6 L10 13.8 M5.6 4 H10.4" fill="none" stroke="currentColor" stroke-width="0.75"></path></g>`),
  chandelle: (w = 16) => g16(w, `<path d="M6 15 V7 H10 V15 Z" fill="none" stroke="currentColor" stroke-width="1.25"></path><path d="M8 6 C7 4.5 9 3.5 8 1.5 M8.8 5.5 C10 4.5 9.4 3 10.4 2" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"></path><path d="M4 15 H12" stroke="currentColor" stroke-width="1.25"></path>`),
  porte: (w = 16) => g16(w, `<path d="M2.5 15 V1.5 H12.5 V15" fill="none" stroke="currentColor" stroke-width="1.25"></path><path d="M2.5 1.5 L7 3 V15.5 L2.5 15" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"></path><path d="M8.5 6 L11 3.5 M8.5 9 L11.5 6 M8.5 12 L11.5 9" stroke="currentColor" stroke-width="0.75"></path><path d="M1 15 H14" stroke="currentColor" stroke-width="1.25"></path>`),
  fioleVie: (w = 16) => g16(w, `<path d="M6.5 1.5 H9.5 M7 2 V5.2 C4.6 6.1 3.5 8 3.5 10 C3.5 12.8 5.5 14.5 8 14.5 C10.5 14.5 12.5 12.8 12.5 10 C12.5 8 11.4 6.1 9 5.2 V2" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><path d="M4.6 10 C4.6 12.2 6.1 13.5 8 13.5 C9.9 13.5 11.4 12.2 11.4 10 Z" fill="currentColor"></path>`),
  fioleMort: (w = 16, T = CUIVRE) => g16(w, `<path d="M6.5 1.5 H9.5 M7 2 V5.2 C4.6 6.1 3.5 8 3.5 10 C3.5 12.8 5.5 14.5 8 14.5 C10.5 14.5 12.5 12.8 12.5 10 C12.5 8 11.4 6.1 9 5.2 V2" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><path d="M4.6 9 C4.6 12.2 6.1 13.5 8 13.5 C9.9 13.5 11.4 12.2 11.4 9 Z" fill="url(#${T.h3})"></path><path d="M8 7.2 C6.8 7.6 6.6 9.4 8 10 C9.4 9.4 9.2 7.6 8 7.2 Z" fill="currentColor"></path>`),
  fioleEpuisee: (w = 16) => g16(w, `<path d="M6.5 1.5 H9.5 M7 2 V5.2 C4.6 6.1 3.5 8 3.5 10 C3.5 12.8 5.5 14.5 8 14.5 C10.5 14.5 12.5 12.8 12.5 10 C12.5 8 11.4 6.1 9 5.2 V2" fill="none" stroke="currentColor" stroke-width="1.25" stroke-dasharray="1.6 1.6"></path>`),
  oeil: (w = 10) => `<svg width="${w}" height="${w}" viewBox="0 0 10 10" aria-hidden="true" style="display: inline-block;"><path d="M0.8 5 C2.8 2 7.2 2 9.2 5 C7.2 8 2.8 8 0.8 5 Z" fill="none" stroke="currentColor" stroke-width="1"></path><circle cx="5" cy="5" r="1.5" fill="currentColor"></circle></svg>`,
};

/* ── Géométrie du jeton par densité (§ 5.1.1) ───────────────────────── */
export const GEOM = {
  D2: { w: 85, svgh: 64, cy: 32, m: 60, nom: 15, nomLh: 20, stat: 12, statLh: 20, cartW: 82, cols: 4, cellH: 104, gapC: 6, gapR: 8 },
  D3: { w: 68, svgh: 52, cy: 26, m: 48, nom: 14, nomLh: 16, stat: 12, statLh: 20, cartW: 72, cols: 5, cellH: 88, gapC: 4, gapR: 4 },
  D4: { w: 68, svgh: 42, cy: 21, m: 40, nom: 13, nomLh: 16, stat: 12, statLh: 18, cartW: 70, cols: 5, cellH: 76, gapC: 4, gapR: 4 },
  DK: { w: 96, svgh: 64, cy: 32, m: 56, nom: 16, nomLh: 20, stat: 13, statLh: 20, cartW: 92, cols: 0, cellH: 104, gapC: 0, gapR: 0 },
};

/** Cartouche de camp 20 px (§ 5.3) — écu ou mordu, mot toujours écrit. */
export function cartouche20(camp, mot, w, T) {
  if (camp === 'meute') {
    const d = `M4 1 H${w - 16} L${w - 13} 4.5 L${w - 9} 1.5 L${w - 7.5} 7 L${w - 1} 9 L${w - 6.5} 12 L${w - 2} 16.5 L${w - 8} 17.5 L${w - 10.5} 19 H4 L1 16 V4 Z`;
    return `<svg width="${w}" height="20" viewBox="0 0 ${w} 20" role="img" aria-label="Cartouche mordu : ${mot}" style="display: block; margin: 0 auto; overflow: visible;"><path d="${d}" fill="${T.surface}" stroke="${T.meute}" stroke-width="2" stroke-linejoin="round"></path><text x="${(w - 9) / 2}" y="14" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="600" fill="${T.meute}">${mot}</text></svg>`;
  }
  const d = `M4 0.75 H${w - 4} L${w - 0.75} 4 V16 L${w - 4} 19.25 H4 L0.75 16 V4 Z`;
  return `<svg width="${w}" height="20" viewBox="0 0 ${w} 20" role="img" aria-label="Cartouche écu : ${mot}" style="display: block; margin: 0 auto; overflow: visible;"><path d="${d}" fill="${T.surface}" stroke="${T.encre}" stroke-width="1.5"></path><text x="${w / 2}" y="14" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" fill="${T.encre}">${mot}</text></svg>`;
}

/* ── Le jeton (§ 5.1) ────────────────────────────────────────────────── */
// e : { moi, mort:{camp,mot}, choisi, nonchoix, interdit, capitaine, pastille, pf, mire, brunie:{camp,mot}, statut, interactif }
export function jeton(seat, D, T, e = {}) {
  const g = GEOM[D];
  const { w, svgh, cy, m } = g;
  const cx = w / 2, r = m / 2, ri = r - 4;
  const nom = SIEGES[seat];
  const uid = `${D}-${seat}`;
  let s = '';
  if (e.moi) {
    const S = m + 14, S2 = S - 6.25;
    s += `<rect x="${cx - S / 2}" y="${cy - S / 2}" width="${S}" height="${S}" fill="none" stroke="${e.mort ? T.mortTrait : T.encre}" stroke-width="1.5"></rect>`;
    s += `<rect x="${cx - S2 / 2}" y="${cy - S2 / 2}" width="${S2}" height="${S2}" fill="none" stroke="${e.mort ? T.mortTrait : T.encre}" stroke-width="0.75"></rect>`;
  }
  const bx = cx - 0.375 * m, bsz = 0.75 * m, by = cy + ri - bsz;
  if (e.mort) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${T.mortTrait}" stroke-width="1"></circle>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${T.mortBuste}" stroke-width="0.6"></circle>`;
    s += `<use href="#ccm-${seat}" x="${bx}" y="${by}" width="${bsz}" height="${bsz}" clip-path="url(#cl-${uid})"></use>`;
  } else {
    const nonch = e.nonchoix || e.interdit;
    const anneauL = e.choisi ? 3.5 : nonch ? 1 : 1.5;
    const anneauC = nonch ? T.filetDoux : T.encre;
    const disque = e.brunie ? T.brunie : nonch ? 'none' : `url(#${T.h1})`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${T.jetonFond}" stroke="${anneauC}" stroke-width="${anneauL}"></circle>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="${disque}" stroke="${nonch ? T.filetDoux : T.encre}" stroke-width="0.75"></circle>`;
    s += `<use href="#cc-${seat}" x="${bx}" y="${by}" width="${bsz}" height="${bsz}" clip-path="url(#cl-${uid})"></use>`;
  }
  if (e.capitaine) {
    const bw = 0.8 * m, yb = cy + ri - 1;
    s += `<path d="M${cx - bw / 2} ${yb - 14} H${cx + bw / 2} L${cx + bw / 2 - 5} ${yb} H${cx - bw / 2 + 5} Z" fill="${e.mort ? 'none' : T.encre}" stroke="${e.mort ? T.mortTrait : T.encre}" stroke-width="1"></path>`;
    s += `<text x="${cx}" y="${yb - 3}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="700" fill="${e.mort ? T.mortTexte : T.surEncre}">×2</text>`;
  }
  if (e.choisi) {
    const o = r + 1.75 + 2;
    s += `<path d="M${cx} ${cy - o - 6} V${cy - o} M${cx} ${cy + o} V${cy + o + 6} M${cx - o - 6} ${cy} H${cx - o} M${cx + o} ${cy} H${cx + o + 6}" stroke="${T.encre}" stroke-width="2.4"></path>`;
  }
  if (e.mire) {
    const R = r + 6;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${T.encre}" stroke-width="1"></circle>`;
    s += `<path d="M${cx} ${cy - R - 4} V${cy - R + 5} M${cx} ${cy + R - 5} V${cy + R + 4} M${cx - R - 4} ${cy} H${cx - R + 5} M${cx + R - 5} ${cy} H${cx + R + 4}" stroke="${T.encre}" stroke-width="1.5"></path>`;
  }
  const neX = cx + 0.35 * m, neY = cy - 0.35 * m;
  if (e.pastille) {
    const pw = 32;
    s += `<rect x="${neX - pw / 2}" y="${neY - 9}" width="${pw}" height="18" fill="${T.surface}" stroke="${T.filet}" stroke-width="1"></rect>`;
    s += `<text x="${neX}" y="${neY + 4.5}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="600" fill="${T.meute}">${e.pastille}</text>`;
  }
  if (e.pf) {
    const pw = 28;
    s += `<rect x="${neX - pw / 2}" y="${neY - 9}" width="${pw}" height="18" fill="${T.surface}" stroke="${T.filet}" stroke-width="1"></rect>`;
    s += `<g transform="translate(${neX - 11} ${neY - 5})" color="${T.encre}"><path d="M0.8 5 C2.8 2 7.2 2 9.2 5 C7.2 8 2.8 8 0.8 5 Z" fill="none" stroke="${T.encre}" stroke-width="1"></path><circle cx="5" cy="5" r="1.5" fill="${T.encre}"></circle></g>`;
    s += `<text x="${neX + 6}" y="${neY + 4.5}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="600" fill="${T.encre}">${e.pf}</text>`;
  }
  if (e.interdit) {
    const sx = cx - 0.35 * m - 8, sy = cy + 0.35 * m - 8;
    s += `<rect x="${sx - 2}" y="${sy - 2}" width="20" height="20" fill="${T.fond}"></rect>`;
    s += `<g transform="translate(${sx} ${sy})"><path d="M4 1.5 H12 L14.5 4 V10 L8 14.5 L1.5 10 V4 Z" fill="none" stroke="${T.encre}" stroke-width="1.25" stroke-linejoin="round"></path><path d="M2 14 L14 2" stroke="${T.encre}" stroke-width="1.5" stroke-linecap="round"></path></g>`;
  }
  const svg = `<svg width="${w}" height="${svgh}" viewBox="0 0 ${w} ${svgh}" aria-hidden="true" style="display: block; overflow: visible;"><defs><clipPath id="cl-${uid}"><circle cx="${cx}" cy="${cy}" r="${ri}"></circle></clipPath></defs>${s}</svg>`;

  // nom + statut (un seul mot, § 5.1.4) ou cartouche
  let nomStyle = `display: block; width: 100%; text-align: center; font-family: ${SERIF}; font-size: ${g.nom}px; line-height: ${g.nomLh}px; font-weight: ${e.moi ? 700 : 600}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${T.encre};`;
  if (e.mort) nomStyle = nomStyle.replace(`color: ${T.encre};`, `color: ${T.mortTexte}; font-weight: 400; text-decoration: line-through; text-decoration-thickness: 1px;`).replace('font-weight: 600;', '').replace('font-weight: 700;', '');
  if (e.choisi) nomStyle += ' text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px;';
  let bas = '';
  const cart = e.mort || e.brunie;
  if (cart) bas = `<span style="display: block; height: ${g.statLh}px; padding-top: 1px;">${cartouche20(cart.camp, cart.mot, g.cartW, T)}</span>`;
  else {
    const statut = e.statut ?? (e.choisi ? 'votre choix' : e.interdit ? 'hier' : e.mire ? 'victime' : e.capitaine ? 'capitaine' : e.moi ? 'vous' : '');
    const fort = e.choisi || e.mire;
    bas = `<span style="display: block; height: ${g.statLh}px; text-align: center; font-family: ${SERIF}; font-size: ${g.stat}px; line-height: 16px; padding-top: 2px; box-sizing: border-box; white-space: nowrap; color: ${fort ? T.encre : T.encre2}; font-weight: ${fort ? 600 : 400};">${statut}</span>`;
  }
  const phrase = [nom, e.moi ? 'vous' : '', e.mort ? `mort·e, ${e.mort.mot}` : '', e.capitaine ? 'capitaine, voix double' : '',
    e.choisi ? 'votre choix' : '', e.nonchoix ? 'non choisissable' : '', e.interdit ? 'protégé·e hier, non choisissable' : '',
    e.mire ? 'victime de la meute' : '', e.pastille ? `visé·e par la meute (${e.pastille})` : '', e.pf ? `visé·e par ${e.pf} loup${e.pf === '1' ? '' : 's'}` : '',
    e.brunie ? `carnet : ${e.brunie.mot}` : ''].filter(Boolean).join(', ');
  const inner = `${svg}<span style="${nomStyle}">${nom}</span>${bas}`;
  const cellStyle = `position: relative; width: ${w}px; height: ${g.cellH}px; box-sizing: border-box; display: block; padding: 0; margin: 0; background: none; border: 0; color: inherit; font: inherit; overflow: visible;`;
  return e.interactif && !e.mort && !e.nonchoix && !e.interdit
    ? `<button type="button" class="jeton" aria-label="${phrase}"${e.choisi ? ' aria-pressed="true"' : ''} style="${cellStyle} cursor: pointer;">${inner}</button>`
    : `<div class="jeton" role="img" aria-label="${phrase}" style="${cellStyle}">${inner}</div>`;
}

/* ── Frise : ligne de toits gravée (§ 5.7) ──────────────────────────── */
export function toits(width, base, clocherX, potenceX, T) {
  // base = y de la ligne de sol ; les toits occupent les 18 px au-dessus
  let x = 0, k = 7, d = `M0 ${base} V${base - 8}`;
  const rnd = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
  while (x < width) {
    if (x >= clocherX - 30 && x < clocherX + 24) { // le clocher à une fenêtre
      d += ` L${clocherX - 6} ${base - 10} V${base - 30} L${clocherX + 6} ${base - 44} L${clocherX + 18} ${base - 30} V${base - 10}`;
      x = clocherX + 24; d += ` L${x} ${base - 9}`; continue;
    }
    const wd = 22 + Math.round(rnd() * 20), mur = 5 + Math.round(rnd() * 3), faite = mur + 5 + Math.round(rnd() * 4);
    d += ` L${x} ${base - mur} L${x + wd / 2} ${base - faite} L${x + wd} ${base - mur}`;
    if (rnd() > 0.55) d += ` V${base - mur - 4} H${x + wd - 4} V${base - mur}`; // cheminée
    x += wd;
  }
  d += ` V${base} Z`;
  let s = `<path d="${d}" fill="${T.toit}" stroke="${T.toitTrait}" stroke-width="1" stroke-linejoin="round"></path>`;
  s += `<rect x="${clocherX + 3.5}" y="${base - 27}" width="5" height="8" fill="none" stroke="${T.toitTrait}" stroke-width="0.9"></rect>`;
  // la potence, à droite
  s += `<path d="M${potenceX + 10} ${base} V${base - 34} H${potenceX} M${potenceX + 10} ${base - 28} L${potenceX + 5} ${base - 34} M${potenceX + 1} ${base - 34} V${base - 26}" fill="none" stroke="${T.toitTrait}" stroke-width="1.6"></path>`;
  s += `<circle cx="${potenceX + 1}" cy="${base - 23.5}" r="2.5" fill="none" stroke="${T.toitTrait}" stroke-width="1"></circle>`;
  return s;
}

/* ── Boutons (§ 5.4) — la nuit, tous au palier-3 ────────────────────── */
export function bouton(label, T, { primaire = true, flex = false, largeur = null, aria = null } = {}) {
  const w = flex ? 'flex: 1 1 auto; min-width: 0;' : largeur ? `width: ${largeur}px; flex: 0 0 auto;` : 'flex: 0 0 auto;';
  return `<button type="button"${aria ? ` aria-label="${aria}"` : ''} style="${w} height: 48px; padding: 0 16px; box-sizing: border-box; background: ${T.actionFond}; border: 1.5px solid ${T.actionBord}; border-radius: 0; color: ${T.actionTexte}; font-family: ${SERIF}; font-size: 17px; line-height: 20px; font-weight: ${primaire ? 600 : 400}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</button>`;
}
export function appuiLong(label, T, { tenu = false, aria = null } = {}) {
  const prog = tenu ? `<circle cx="13" cy="13" r="10.5" fill="none" stroke="${T.encre}" stroke-width="3"></circle>` : `<path d="M13 2.5 A10.5 10.5 0 0 1 13 2.5" fill="none" stroke="${T.encre}" stroke-width="3"></path>`;
  return `<button type="button" aria-label="${aria ?? label}" style="flex: 1 1 auto; min-width: 0; height: 48px; padding: 0 16px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; background: ${T.actionFond}; border: 1.5px solid ${T.actionBord}; border-radius: 0; color: ${T.actionTexte}; font-family: ${SERIF}; font-size: 17px; line-height: 20px; font-weight: 600; text-align: left;"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex: 0 0 auto;"><circle cx="13" cy="13" r="10.5" fill="none" stroke="${T.piste}" stroke-width="3"></circle>${prog}${tenu ? '' : Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; return `<path d="M${(13 + 9 * Math.cos(a)).toFixed(2)} ${(13 + 9 * Math.sin(a)).toFixed(2)} L${(13 + 12 * Math.cos(a)).toFixed(2)} ${(13 + 12 * Math.sin(a)).toFixed(2)}" stroke="${T.actionFond}" stroke-width="1"></path>`; }).join('')}</svg><span style="flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span></button>`;
}
export function boutonArme(label, T, { aria = null } = {}) {
  // double filet 3 + 1 (écart 2), repères de visée aux 4 coins, filet de 4 s dessous
  const coin = (x, y, dx, dy) => `<path d="M${x} ${y + dy * 7} V${y} H${x + dx * 7}" fill="none" stroke="${T.encre}" stroke-width="2.4"></path>`;
  return `<div style="position: relative; flex: 1 1 auto; min-width: 0; height: 48px;">
<button type="button" aria-label="${aria ?? label}" style="position: absolute; inset: 0; width: 100%; height: 48px; padding: 0 12px; box-sizing: border-box; background: ${T.actionFond}; border: 3px solid ${T.encre}; border-radius: 0; color: ${T.actionTexte}; font-family: ${SERIF}; font-size: 16px; line-height: 20px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><span aria-hidden="true" style="position: absolute; left: 2px; top: 2px; right: 2px; bottom: 2px; border: 1px solid ${T.encre};"></span><span style="position: relative;">${label}</span></button>
<svg width="370" height="60" viewBox="-6 -6 370 60" aria-hidden="true" style="position: absolute; left: -6px; top: -6px; overflow: visible; pointer-events: none;">${coin(-4, -4, 1, 1)}${coin(362, -4, -1, 1)}${coin(-4, 52, 1, -1)}${coin(362, 52, -1, -1)}</svg>
<span aria-hidden="true" style="position: absolute; left: 0; top: 52px; width: 62%; height: 1px; background: ${T.encre};"></span>
</div>`;
}

/* ── Pli (§ 5.14) : même forme pour tous, seul le libellé change ────── */
export function cartouchePli(type, mot, T, w = 152, h = 28) {
  let forme, couleur = T.encre, poids = 400, style = 'normal', icone = '';
  if (type === 'registre') { forme = `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" fill="${T.surface}" stroke="${T.filet}" stroke-width="1.5"></rect>`; icone = 'registre'; }
  if (type === 'meute') { // N2 : la forme mord au palier-1, seul le mot est en craie
    forme = `<path d="M5 1 H${w - 18} L${w - 14} 6 L${w - 9} 2 L${w - 7} 10 L${w - 1} 13 L${w - 7} 17 L${w - 2} 23 L${w - 10} 25 L${w - 13} 27 H5 L1 23 V5 Z" fill="${T.surface}" stroke="${T.meuteForme}" stroke-width="1.5" stroke-linejoin="round"></path>`;
    couleur = T.meute; poids = 600;
  }
  if (type === 'serment') { forme = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${(h - 2) / 2}" fill="${T.surface}" stroke="${T.serment}" stroke-width="2"></rect><rect x="4.5" y="4.5" width="${w - 9}" height="${h - 9}" rx="${(h - 9) / 2}" fill="none" stroke="${T.serment}" stroke-width="0.9"></rect>`; couleur = T.serment; }
  if (type === 'audela') { forme = `<path d="M6 1 H${w - 6} L${w - 1} 6 V${h - 6} L${w - 6} ${h - 1} H6 L1 ${h - 6} V6 Z" fill="${T.surface}" stroke="${T.audela}" stroke-width="1.2" stroke-dasharray="1.5 3"></path>`; couleur = T.audela; style = 'italic'; }
  if (type === 'village') { forme = `<path d="M6 0.75 H${w - 6} L${w - 0.75} 6 V${h - 6} L${w - 6} ${h - 0.75} H6 L0.75 ${h - 6} V6 Z" fill="${T.surface}" stroke="${T.filet}" stroke-width="1.5"></path>`; }
  const ico = icone ? `<g transform="translate(8 ${(h - 18) / 2}) scale(0.75)" color="${T.encre}">${ICONES.registre(24).replace('<svg', '<svg x="0" y="0"')}</g>` : '';
  const tx = icone ? (w + 22) / 2 : type === 'meute' ? (w - 10) / 2 : w / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display: block; flex: 0 0 auto;">${forme}${ico}<text x="${tx}" y="${h / 2 + 5}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="14" font-weight="${poids}" font-style="${style}" fill="${couleur}">${mot}</text></svg>`;
}

/* ── Le squelette d'une page .dc.html ───────────────────────────────── */
export function page({ titre, w, h, T, corps, defsEnPlus = '', vous }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${titre}</title>
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
<div class="ecran" data-tirage="cuivre" data-heure="nuit" data-vous="${vous}" style="width: ${w}px; height: ${h}px; box-sizing: border-box; position: relative; overflow: hidden; background-color: ${T.fond}; color: ${T.encre}; font-family: ${SERIF};">
<svg width="0" height="0" style="position: absolute; width: 0; height: 0;" aria-hidden="true">
${DEFS_TEX}
<defs>${defsBustes(T)}</defs>
</svg>
<svg class="grain" width="${w}" height="${h}" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect x="0" y="0" width="${w}" height="${h}" fill="#000" filter="url(#${T.grain})" opacity="${T.grainOp}"></rect></svg>
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
}
