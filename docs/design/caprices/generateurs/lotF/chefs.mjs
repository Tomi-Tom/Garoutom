// Les dix-huit couvre-chefs (SPEC § 5.1.2) — boîte 48 × 48, lumière haut-droite.
// Trois modes : 'grav' (eau-forte : contour + hachures), 'ombre' (test d'ombre chinoise),
// 'fantome' (mort brunie : contour seul au palier-1).
import { n } from './lib.mjs';

export const CHEFS = [
  'tricorne', 'mantille à peigne', 'bonnet de nuit', 'coroza', 'chambergo', 'montera',
  'capuche de moine', 'cofia', 'bicorne', 'turban', 'boina', 'perruque à catogan',
  'haut-de-forme évasé', 'fichu noué', 'calotte', 'cornette', 'chapeau de paille', 'chapeau à plumet',
];

function ctx({ k, p, suf, mode, ghost }) {
  const pat = (lv) => `url(#hach-${lv}-${suf})`;
  // forme pleine : fond papier + hachure + contour
  const F = (d, lv, sw = 1, extra = '') => {
    if (mode === 'ombre') return `<path d="${d}" fill="${k}" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
    if (mode === 'fantome') return `<path d="${d}" fill="none" stroke="${ghost}" stroke-width="0.9" stroke-linejoin="round" ${extra}/>`;
    if (lv === 'k') return `<path d="${d}" fill="${k}" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
    if (lv === 'p') return `<path d="${d}" fill="${p}" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
    return `<path d="${d}" fill="${p}" ${extra}/><path d="${d}" fill="${pat(lv)}" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
  };
  const Fc = (cx, cy, r, lv, sw = 1) => F(`M${n(cx - r)} ${n(cy)} A${r} ${r} 0 1 1 ${n(cx + r)} ${n(cy)} A${r} ${r} 0 1 1 ${n(cx - r)} ${n(cy)} Z`, lv, sw);
  const Fe = (cx, cy, rx, ry, lv, sw = 1) => F(`M${n(cx - rx)} ${n(cy)} A${rx} ${ry} 0 1 1 ${n(cx + rx)} ${n(cy)} A${rx} ${ry} 0 1 1 ${n(cx - rx)} ${n(cy)} Z`, lv, sw);
  // trait d'encre (détail gravé)
  const L = (d, sw = 0.8) => mode === 'ombre' ? '' : `<path d="${d}" fill="none" stroke="${mode === 'fantome' ? ghost : k}" stroke-width="${mode === 'fantome' ? Math.min(sw, 0.8) : sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // trait réservé (papier sur la hachure)
  const R = (d, sw = 0.8) => mode === 'grav' ? `<path d="${d}" fill="none" stroke="${p}" stroke-width="${sw}" stroke-linecap="round"/>` : '';
  const epaules = (y0 = 32) => F(`M7 48 C8 ${y0 + 5} 15.5 ${y0} 24.2 ${y0} C33 ${y0} 40 ${y0 + 5.4} 41 48 Z`, 2, 1);
  const tete = (cy = 24, r = 7.5, cx = 24.3) => Fc(cx, cy, r, 1, 1);
  return { F, Fc, Fe, L, R, epaules, tete };
}

// Festons (cofia) : petits arcs le long d'une courbe quadratique
function feston(x0, y0, cx, cy, x1, y1, nb, r) {
  const pts = [];
  for (let i = 0; i <= nb; i++) {
    const t = i / nb, u = 1 - t;
    pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` A${r} ${r} 0 0 0 ${n(pts[i][0])} ${n(pts[i][1])}`;
  return d;
}

// Bord effiloché (paille) : ellipse bruitée, déterministe
function effiloche(cx, cy, rx, ry, nb) {
  let d = '';
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2;
    const j = i % 2 === 0 ? 1 : 0.86 + ((i * 37) % 7) / 60;
    const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j;
    d += (i ? ' L' : 'M') + n(x) + ' ' + n(y);
  }
  return d + ' Z';
}

const DESSINS = [
  // 1 tricorne
  (g) => g.epaules(33) + g.tete(25) +
    g.F('M6.5 17.5 L10.5 11 C15 13.2 19.5 12.6 24 9.2 C28.5 12.6 33 13.2 37.8 10.6 L41.5 16.8 C36.5 17.4 31 18 27.2 20.8 L24.2 22.6 L21.2 20.8 C17.2 18 11.8 17.6 6.5 17.5 Z', 3, 1.1) +
    g.R('M11.2 12.8 C15.6 14.8 20 14.2 24 11 C28 14.2 32.4 14.8 37.2 12.4', 0.8) +
    g.Fc(31.4, 15.4, 1.5, 'p', 0.6),
  // 2 mantille à peigne
  (g) => g.epaules(33) +
    g.F('M15.5 15 C11.5 18.5 10 25 9.2 34 C8.8 37.5 10.4 39.8 12.6 40.5 C13 33 14.5 24 17.6 18.4 Z', 2, 0.9) +
    g.F('M33 15 C37.2 19.2 38.4 26 39.4 35.5 C39.6 38.4 38 40.2 35.6 40.8 C35 32.5 33.4 24.5 30.4 18.4 Z', 2, 0.9) +
    g.tete(25.2) +
    g.L('M9.6 36.6 C10 37.4 10.8 38.2 11.8 38.6 M38.6 37.2 C38 38.4 37.2 39.2 36.2 39.6', 0.7) +
    g.F('M15.5 15 C14.5 8.5 18 3.2 24 2.6 C30.5 3 34.2 8.6 33 15 C29 13.3 19.5 13.3 15.5 15 Z', 'k', 1) +
    g.R('M19.6 13.4 L18.4 6.4 M24 13 V4.4 M28.4 13.4 L29.8 6.6 M21.8 13.1 L21.4 5 M26.2 13.1 L26.8 5', 0.7) +
    g.L('M17.6 18.4 C21 15.9 27.6 15.9 30.4 18.4', 0.8),
  // 3 bonnet de nuit
  (g) => g.epaules(33) + g.tete(25) +
    g.F('M16 19.6 C15.6 12.6 20.2 7.6 27 7.8 C33.8 8.2 37.4 13 39 19.6 C40 23.6 40.2 27.6 39.4 30.4 L37.2 29.8 C37 25.6 35.6 21.8 32.6 19.8 C27.6 18 21 18 16 19.6 Z', 2, 1) +
    g.L('M24 9.6 C27.4 12 30.4 15.4 32.2 19.4 M30.8 8.6 C34 11.6 36 15.4 37.4 20.4', 0.6) +
    g.F('M15.6 19.8 C21 17.6 28 17.6 33 19.8 L32.8 22.2 C27.8 20.1 21 20.1 15.8 22.2 Z', 'p', 0.9) +
    g.Fc(39.2, 32.6, 2.6, 'k', 0.6),
  // 4 coroza
  (g) => g.epaules(37) + g.tete(29.2) +
    g.F('M17.4 23.4 L23.2 1.2 L25.2 1.4 L31.2 23.4 C27.4 22.4 21.4 22.4 17.4 23.4 Z', 3, 1) +
    g.R('M21.4 18.6 C22.2 16 21.2 14.4 22.8 12.2 M26.6 19.4 C26.2 17 27.6 15.8 26.8 13.6 M24.2 9.6 C24.8 8 24 7 24.6 5.6', 0.9) +
    g.L('M17 23.7 C21.4 22.3 27.4 22.3 31.6 23.7', 1.4),
  // 5 chambergo
  (g) => g.epaules(34) + g.tete(26.4) +
    g.F('M1.8 19.6 C5 16.2 13.6 15.6 24 16 C34.4 15.4 42.6 16.2 46.2 18.6 C43 21.6 34 22 24.4 21.6 C14.6 22.2 5.4 22.6 1.8 19.6 Z', 2, 1) +
    g.F('M16.6 18.4 C16.4 12.2 19.8 9.4 24.4 9.4 C29.2 9.4 32.2 12.4 32 18.2 C27 17.4 21.6 17.4 16.6 18.4 Z', 3, 1) +
    g.L('M16.7 16.2 C21.6 15.2 27 15.2 32 16', 2.2),
  // 6 montera
  (g) => g.epaules(33) + g.tete(25.4) +
    g.F('M9.4 21.4 C6.6 21 5.6 16.6 8 14.4 C9.8 12.8 12.6 12.8 14.6 14.4 C16.6 10.4 20.4 8.6 24.2 8.6 C28 8.6 31.6 10.2 33.6 14 C35.6 12.4 38.6 12.6 40.2 14.6 C42.4 17.2 41.2 21.4 38.4 21.6 C33.4 19.6 15 19.4 9.4 21.4 Z', 3, 1) +
    g.R('M14.6 14.4 C15.4 16.4 15.2 18.6 14.4 20.2 M33.6 14 C32.8 16.2 33 18.4 33.8 20', 0.9) +
    g.F('M22.2 9.1 C22.2 6.4 26.2 6.2 26.4 9', 'k', 0.8),
  // 7 capuche de moine
  (g) => g.epaules(36) +
    g.F('M25.8 1.8 C22.6 7.8 14.8 13.2 13.4 22.4 C12.4 29.4 13 34 8.6 39 C16 37.6 32 37.6 39.8 39.4 C35.4 34 36.2 29.4 35.2 22.2 C34 14.2 29.6 8.6 25.8 1.8 Z', 3, 1) +
    g.F('M18 26.4 C18 20.6 20.8 18 24.2 18 C27.8 18 30.4 20.6 30.4 26.4 C30.4 31 27.8 33.6 24.2 33.6 C20.6 33.6 18 31 18 26.4 Z', 1, 0.9) +
    g.R('M21 13.4 C23.4 10.6 25.2 7.6 25.8 4.6', 0.8),
  // 8 cofia
  (g) => g.epaules(34) +
    g.F('M13 27.4 C10.4 17 16.4 9 24.4 9 C32.6 9 38 16.8 35.4 27.4 C33.2 24 30.4 21 24.2 20.6 C18.2 21 15.4 24 13 27.4 Z', 2, 1) +
    g.tete(26.4) +
    g.L(feston(13.4, 27, 24.2, 15.4, 35, 27, 9, 1.5), 0.8) +
    g.L('M15.8 31 C18.6 33.6 21 34.8 24.2 35.2 C27.4 34.8 29.8 33.6 32.6 31', 0.9),
  // 9 bicorne
  (g) => g.epaules(33) + g.tete(25.2) +
    `<g transform="rotate(-4 24 15)">` +
    g.F('M3.6 19.6 C8.4 18.6 11.6 8.6 24 7.6 C36.6 8.8 39.6 18.2 44.6 19.2 C39 21 31 18.6 24.2 19.2 C17.2 18.8 9.6 21.4 3.6 19.6 Z', 3, 1.1) +
    g.R('M6.4 18.8 C10.6 17.4 13.6 10.2 24 9.4 C34.6 10.4 37.6 17 41.8 18.4', 0.8) +
    g.Fc(24.4, 13.4, 2, 'p', 0.7) + `</g>`,
  // 10 turban
  (g) => g.epaules(34) + g.tete(26.4) +
    g.F('M13.4 21.4 C11.4 12.4 17 6.6 24.4 6.6 C32.2 6.6 37.4 12.6 35.2 21.4 C30.4 19.4 18.4 19.4 13.4 21.4 Z', 2, 1) +
    g.L('M13.6 18 C17.8 11.8 27.2 9.6 34.4 14.2 M15 12.6 C20 8.4 28.6 7.6 33.2 10.6 M19.4 20.2 C21.8 14.6 28.4 12 35.2 16.4', 1.1) +
    g.Fc(24.8, 15.8, 2, 'p', 0.8),
  // 11 boina
  (g) => g.epaules(33) + g.tete(25.4) +
    g.F('M11.6 18.6 C10.6 14.6 16.8 12 25 11.8 C34 11.8 41.6 13.8 42.6 17 C43 19.4 38.2 19.6 34 19 C27 18.2 18.4 19.6 11.6 18.6 Z', 3, 1) +
    g.R('M14 17.3 C20 16.7 30 16.5 40.4 17.7', 0.7) +
    g.L('M25.4 11.8 L26 9.2', 1.4),
  // 12 perruque à catogan
  (g) => g.epaules(33) + g.tete(25.2) +
    g.F('M16.4 22.6 C15.6 15.6 19.2 12.4 24.2 12.4 C29.4 12.4 32.8 15.6 32 22.6 C29.6 19 19 19 16.4 22.6 Z', 1, 0.9) +
    g.Fe(15.2, 24.6, 3.3, 1.9, 2, 0.9) + g.Fe(15.4, 28.6, 3.3, 1.9, 2, 0.9) +
    g.Fe(33.4, 24.4, 3.3, 1.9, 2, 0.9) + g.Fe(33.2, 28.4, 3.3, 1.9, 2, 0.9) +
    g.F('M35 33.2 C38.6 30.2 42 31.4 41.2 34.2 C40.6 36.4 37.4 35.8 35 33.2 Z', 'k', 0.6) +
    g.F('M35 33.2 C37 36.6 36.2 39.6 33.4 39.2 C32.2 37.8 33 35.4 35 33.2 Z', 'k', 0.6),
  // 13 haut-de-forme évasé
  (g) => g.epaules(35) + g.tete(27.4) +
    g.F('M11.6 19.6 C15.6 17.8 33.2 17.8 37.4 19.8 C33.2 21.4 15.6 21.4 11.6 19.6 Z', 'k', 0.8) +
    g.F('M16.8 19 L14.8 3.6 C19.4 2.2 29.8 2.2 34.2 3.8 L31.6 19 C27 18.4 21.4 18.4 16.8 19 Z', 3, 1) +
    g.R('M15.2 4.4 C19.6 5.6 29.6 5.6 33.8 4.6', 0.8) +
    g.F('M16.5 15.4 H31.9 L31.7 17.4 H16.7 Z', 'p', 0.7),
  // 14 fichu noué
  (g) => g.epaules(34) + g.tete(24.6) +
    g.F('M15.4 25 C13.8 16 18.2 11 24.4 11 C31 11 35 16 33.2 25 C33 29.4 30.4 32.4 27 33.6 L24.4 34.4 L21.6 33.6 C18.2 32.4 15.6 29.4 15.4 25 Z M18.8 25.2 C18.8 30 21.2 31.8 24.3 31.8 C27.4 31.8 29.8 30 29.8 25.2 C29.8 20.4 27.6 18 24.3 18 C21 18 18.8 20.4 18.8 25.2 Z', 2, 1, 'fill-rule="evenodd"') +
    g.L('M20.4 12.4 C22 14.6 23.2 16 24 17.8 M28.6 12.6 C27.6 14.4 26.6 16.2 26 17.9', 0.6) +
    g.F('M23.4 35 L18 40.8 L22 35.4 Z', 'k', 0.6) + g.F('M25.6 35 L31.6 39.8 L26.6 34.6 Z', 'k', 0.6) +
    g.Fc(24.5, 34.6, 1.7, 'k', 0.6),
  // 15 calotte
  (g) => g.epaules(33) + g.tete(25) +
    g.L('M17.4 26.6 C16.8 24 17 21.6 17.8 20.2 M31.2 26.4 C31.8 24 31.6 21.6 30.8 20.2', 1) +
    g.F('M18.4 18.6 C18.4 13.8 29.8 13.8 29.8 18.6 C26 17.8 22.2 17.8 18.4 18.6 Z', 'k', 0.8) +
    g.L('M24.1 14.8 V13.2', 1.4),
  // 16 cornette
  (g) => g.epaules(34) +
    g.F('M21 20.6 C15.6 18.2 9.4 12.6 3 6.4 C3.4 13.2 7.4 20.4 15.2 23.8 Z', 1, 1) +
    g.F('M27.6 20.4 C33.4 17.4 39.2 11.2 45.4 5.2 C45.6 12.6 41.4 20.6 33.2 23.8 Z', 1, 1) +
    g.L('M5.4 9 C9 13.8 13 17.8 18 20.6 M43 8 C39.4 13.2 35.4 17.4 30.6 20.4', 0.6) +
    g.tete(26.2) +
    g.L('M16.4 26 C16.4 20.2 19.8 17.6 24.3 17.6 C28.8 17.6 32.2 20.2 32.2 26', 1.7),
  // 17 chapeau de paille
  (g) => g.epaules(34) + g.tete(26.4) +
    g.F(effiloche(24.2, 18.6, 20.6, 4.4, 34), 1, 0.9) +
    g.F('M16.4 18.6 C16.2 12.8 19.8 10.2 24.2 10.2 C28.8 10.2 32.2 12.8 32 18.4 C27 17.6 21.4 17.6 16.4 18.6 Z', 2, 1) +
    g.L('M16.5 16.6 C21.6 15.6 27 15.6 32.1 16.4', 2.4) +
    g.L('M31.8 16.8 C34 18.8 34.6 21.2 34 23.6', 1.1),
  // 18 chapeau à plumet
  (g) => g.epaules(34) + g.tete(26.4) +
    g.F('M9.6 13.6 C11.6 16.8 14.2 18.4 17.4 18.8 C24 19.6 32 19.4 38.6 18.4 C36 21.2 27 21.8 21 21.4 C15 21 10.4 18.6 9.6 13.6 Z', 2, 1) +
    g.F('M17.2 18.8 C17 13.2 20.4 11 24.6 11 C29 11 32 13.4 31.6 18.8 C27 18.2 21.6 18.2 17.2 18.8 Z', 3, 1) +
    g.F('M30.4 13.6 C33.6 12.6 37.8 9.4 37.2 5.4 C36.8 2.8 35.8 1.6 34.6 1.2 C36.4 3.4 36.6 6.6 34 9.4 C32.8 10.8 31.6 12.2 30.4 13.6 Z', 3, 0.8) +
    g.L('M30.4 13.6 C34.2 10.6 35.4 6.6 33 4.4 C31.4 3 32 1.2 34.6 1.2', 1) +
    g.L('M33.2 11.6 L35.6 12.2 M35 9.4 L37.6 9.6 M36 6.6 L38.4 6.2', 0.6),
];

/**
 * Buste n° i (0..17), contenu SVG dans une boîte 48 × 48.
 * o = { k: encre, p: papier/surface, suf: 'e'|'v', mode: 'grav'|'ombre'|'fantome', ghost }
 */
export function buste(i, o) {
  const g = ctx({ mode: 'grav', ghost: o.k, ...o });
  return DESSINS[i](g);
}
