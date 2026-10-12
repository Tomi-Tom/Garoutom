// Les cartes : grande, moyenne, petite, vignette, dos ; le dormeur ; le frontispice ; les esquisses.
import { K, F, PAPIER, CUIVRE, hach, hachRect, grain, cuvetteSvg, cartouche, tlines, uid } from './lib.mjs';
import { R, campCart, symboleG } from './roles.mjs';

const OVALE = (cx, cy, rx, ry) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
const meuteish = (r) => r.camp !== 'village';

function papierCarte(w, h, t, seed = 3) {
  if (t.nom === 'cuivre') return `<rect width="${w}" height="${h}" fill="${K.b8}"/><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${K.p3}" stroke-width="1"/>`;
  let s = `<rect width="${w}" height="${h}" fill="${K.bru}"/><rect width="${w}" height="${h}" fill="url(#verge)"/>`;
  s += `<g fill="${K.rou}"><circle cx="${(w * 0.83).toFixed(0)}" cy="${(h * 0.06 + seed).toFixed(0)}" r="3" opacity="0.06"/><circle cx="${(w * 0.08).toFixed(0)}" cy="${(h * 0.93).toFixed(0)}" r="2" opacity="0.07"/></g>`;
  s += `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${K.p2}" stroke-width="1"/>`;
  return s;
}

/** l'image d'une face v1 : fond (hachure ou grain), ovale réservé, symbole */
function imageV1(r, t, x, y, w, h, cx, cy, rx, ry, symSize) {
  let s = '';
  const P = t.nom === 'papier';
  const rect = `M${x} ${y}h${w}v${h}h${-w}Z`;
  if (P) {
    if (meuteish(r)) s += grain(rect + OVALE(cx, cy, rx, ry), [x, y, w, h], { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
    else s += hach(rect + OVALE(cx, cy, rx, ry), [x, y, w, h], { pas: 6, sw: 0.6, color: K.b9, rule: 'evenodd' });
    s += `<rect x="${x + 0.4}" y="${y + 0.4}" width="${w - 0.8}" height="${h - 0.8}" fill="none" stroke="${K.b9}" stroke-width="0.75"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${K.b9}" stroke-width="1"/><ellipse cx="${cx}" cy="${cy}" rx="${rx - 3.5}" ry="${ry - 3.5}" fill="none" stroke="${K.b9}" stroke-width="0.5"/>`;
  } else {
    s += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="none" stroke="${K.p3}" stroke-width="1"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${K.p3}" stroke-width="1"/>`;
  }
  const o = P
    ? { ink: K.b9, bg: K.tei, accent: K.san, serment: K.gE, mass: K.b9 }
    : { ink: K.ver, bg: K.b8, accent: K.cra, serment: K.gC, mass: K.p3 };
  s += symboleG(r.id, cx - symSize / 2, cy - symSize / 2 - 2, symSize, o);
  return s;
}

/** carte grande 300 × 420 (SPEC § 5.2) — t = PAPIER | CUIVRE ; renvoie un <svg> */
export function carteGrande(id, { t = PAPIER, scale = 1, label = true, mort = false } = {}) {
  const r = R[id];
  const P = t.nom === 'papier';
  const W = 300, H = 420;
  let s = papierCarte(W, H, t, r.n);
  const m = r.camp === 'meute', m2 = r.camp === 'seul';
  s += cuvetteSvg(12, 12, 276, 396, t, { mordu: m || m2, mordu2: m2, fill: P ? K.tei : K.b8 });
  s += imageV1(r, t, 24, 24, 252, 264, 150, 154, 96, 112, 128);
  // numéro de planche sur un cartel plein
  s += `<rect x="244" y="24" width="32" height="24" fill="${P ? K.tei : K.b8}" stroke="${P ? K.b9 : K.p3}" stroke-width="0.75"/>`;
  s += `<text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${P ? K.del : K.p1}">${r.n}</text>`;
  const [kind, mot] = campCart(r);
  s += cartouche(kind, 84, 275, 132, 26, mot, t, { fs: 14 });
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="28" fill="${t.encre}">${r.nom}</text>`;
  s += tlines(150, 362, 20, r.leg, `text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${t.narr}"`);
  return `<svg width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}

/** carte moyenne 216 × 302 */
export function carteMoyenne(id, { t = PAPIER } = {}) {
  const r = R[id];
  const P = t.nom === 'papier';
  const W = 216, H = 302;
  let s = papierCarte(W, H, t, r.n);
  const m = r.camp === 'meute', m2 = r.camp === 'seul';
  s += cuvetteSvg(8, 8, 200, 286, t, { mordu: m || m2, mordu2: m2, fill: P ? K.tei : K.b8 });
  s += imageV1(r, t, 16, 16, 184, 168, 108, 100, 66, 72, 96);
  s += `<rect x="176" y="16" width="24" height="22" fill="${P ? K.tei : K.b8}" stroke="${P ? K.b9 : K.p3}" stroke-width="0.75"/>`;
  s += `<text x="188" y="32" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${P ? K.del : K.p1}">${r.n}</text>`;
  const [kind, mot] = campCart(r);
  s += cartouche(kind, 58, 173, 100, 22, mot, t, { fs: 12 });
  s += `<text x="108" y="226" text-anchor="middle" font-family="${F.fell}" font-size="24" fill="${t.encre}">${r.nom}</text>`;
  s += tlines(108, 252, 20, r.leg, `text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${t.narr}"`);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}

const NOM_PETITE = {
  idiot: ['l’Idiot', 'du village'], bouc: ['le Bouc', 'émissaire'], petiteFille: ['la Petite', 'Fille'], loupBlanc: ['le Loup', 'Blanc'],
};
/** petite carte 96 × 134 ; etat : 'vif' | 'mort1' | 'mort2' | 'mort3' (brunissage en trois crans) */
export function cartePetite(id, { t = PAPIER, etat = 'vif', gagnant = false } = {}) {
  const r = R[id];
  const P = t.nom === 'papier';
  const W = 96, H = 134;
  let s = papierCarte(W, H, t, r.n);
  const meute = r.camp !== 'village';
  s += cuvetteSvg(6, 6, 84, 122, t, { mordu: meute, mordu2: r.camp === 'seul', fill: P ? K.tei : K.b8 });
  const ink = etat === 'mort3' ? K.p1 : etat === 'mort2' ? K.p2 : (P ? K.b9 : K.ver);
  if (etat === 'vif') {
    if (P && !meute) s += hachRect(10, 10, 76, 54, { pas: 6, sw: 0.6, color: K.b9 }) + `<ellipse cx="48" cy="37" rx="29" ry="25" fill="${K.tei}"/>`;
    if (P && meute) s += grain('M10 10h76v54h-76Z', [10, 10, 76, 54], { f: 'aqua-I', op: 0.5 }) + `<ellipse cx="48" cy="37" rx="29" ry="25" fill="${K.tei}"/>`;
  }
  if (etat === 'mort1' && P && !meute) s += `<ellipse cx="48" cy="37" rx="29" ry="25" fill="none" stroke="${K.p2}" stroke-width="0.6"/>`;
  const o = { ink, bg: P ? K.tei : K.b8, accent: etat === 'vif' ? (P ? K.san : K.cra) : ink, mass: etat === 'vif' ? (P ? K.b9 : K.p3) : ink, serment: etat === 'vif' ? (P ? K.gE : K.gC) : ink };
  if (etat === 'mort2' || etat === 'mort3') o.L = '16';
  s += symboleG(id, 24, 13, 48, o);
  const lignes = NOM_PETITE[id] ?? [r.nom];
  const nomCol = etat === 'vif' || etat === 'mort1' ? t.encre : t.mortTexte;
  if (lignes.length === 1) s += `<text x="48" y="86" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${nomCol}">${lignes[0]}</text>`;
  else s += tlines(48, 79, 16, lignes, `text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${nomCol}"`);
  const [kind, mot] = campCart(r);
  s += cartouche(kind, 14, 101, 68, 20, mot, t, { fs: 12, mort: etat === 'mort2' || etat === 'mort3' });
  let out = s;
  if (gagnant) out = `<rect x="-5.5" y="-5.5" width="${W + 11}" height="${H + 11}" fill="none" stroke="${t.encre}" stroke-width="1.5"/><rect x="-2.5" y="-2.5" width="${W + 5}" height="${H + 5}" fill="none" stroke="${t.encre}" stroke-width="0.75"/>` + s;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display: block; overflow: visible;" role="img" aria-label="Petite carte : ${r.nom}">${out}</svg>`;
}

/** vignette 48 × 67 : symbole 32 seul */
export function carteVignette(id, { t = PAPIER } = {}) {
  const r = R[id];
  const P = t.nom === 'papier';
  let s = papierCarte(48, 67, t, r.n);
  s += cuvetteSvg(3, 3, 42, 61, t, { mordu: false, fill: P ? K.tei : K.b8 });
  s += symboleG(id, 8, 17, 32, P ? { ink: K.b9, bg: K.tei, accent: K.san, mass: K.b9 } : { ink: K.ver, bg: K.b8, accent: K.cra, mass: K.p3 });
  return `<svg width="48" height="67" viewBox="0 0 48 67" style="display: block;" role="img" aria-label="Vignette : ${r.nom}">${s}</svg>`;
}

// ------------------------------------------------------------- le dormeur (Caprice 43)
/** dessin du dormeur dans une boîte 100 × 80, trait ink, k = facteur d'épaisseur */
export function dormeur(ink, k = 1, fondReserve = null) {
  const w = (x) => (x * k).toFixed(2);
  let s = '';
  const dos = 'M18 80C12 66 14 50 26 39C34 32 44 30 54 33L56 46L50 62C40 66 30 72 26 80Z';
  s += hach(dos, [0, 0, 100, 80], { pas: 2.2, sw: 0.5 * k, color: ink, angle: 50 });
  s += `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">`;
  // bureau
  s += `<path d="M48 41H98V46H48ZM52 46V80M94 46V80M58 53H88V75H58Z" stroke-width="${w(1)}"/>`;
  s += `<path d="M61 56V72M64 56V72M67 56V72" stroke-width="${w(0.5)}"/>`;
  // tabouret
  s += `<path d="M6 80V60C10 58 18 58 22 60V80" stroke-width="${w(1)}"/>`;
  // le dos voûté, la cuisse, la jambe
  s += `<path d="M18 80C12 66 14 50 26 39C34 32 44 30 54 33" stroke-width="${w(1.3)}"/>`;
  s += `<path d="M24 78C30 70 38 66 50 63C52 70 52 76 54 80M44 80L50 78" stroke-width="${w(1)}"/>`;
  // les bras croisés sur la table
  s += `<path d="M40 39C50 36.5 62 36 72 37.6C77 38.4 77 42.4 72 42.8L50 43.4C46 43.4 42 42 40 39Z" stroke-width="${w(1)}"/>`;
  s += `<path d="M52 41C58 40 64 40 70 40.4" stroke-width="${w(0.5)}"/>`;
  // la tête enfouie, cheveux en boucles
  s += `<path d="M50 34C51 26 60 22.6 67 26C71 28.2 72 33 69.6 37" stroke-width="${w(1.2)}"/>`;
  s += `<path d="M54 30C55 28 57.6 28 58 30M58.6 27C60 25.4 62.4 25.8 62.6 27.6M62.8 29.6C64.4 28.4 66.4 29.2 66.2 31M55.6 33C57 31.6 59 32 59.2 33.6M60.4 31.4C62 30.4 63.6 31 63.6 32.6" stroke-width="${w(0.6)}"/>`;
  s += '</g>';
  return s;
}

/** dos de carte (unique) — w × h ; tirage du papier autour */
export function carteDos({ t = PAPIER, W = 300, H = 420 } = {}) {
  const sc = W / 300;
  let s = papierCarte(300, 420, t, 7);
  s += cuvetteSvg(12, 12, 276, 396, CUIVRE);
  s += `<rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}" stroke-width="1"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const ov = OVALE(150, 210, 60, 80);
  s += `<path d="${ov}" fill="${K.p3}"/>` + grain(ov, [90, 130, 120, 160], { f: 'aqua-III', op: 0.2 });
  const id = uid('dc');
  s += `<clipPath id="${id}"><path d="${ov}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(96 166) scale(1.08)">${dormeur(K.ver, 0.9)}</g></g>`;
  s += `<ellipse cx="150" cy="210" rx="60" ry="80" fill="none" stroke="${K.p2}" stroke-width="1"/>`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte">${s}</svg>`;
}

// ------------------------------------------------------------- le frontispice 358 × 160
export function frontispice({ w = 358, h = 160 } = {}) {
  let s = '';
  s += `<rect width="358" height="160" fill="${K.tei}"/>`;
  s += `<path d="M0 160V0H358" fill="none" stroke="${K.b9}" stroke-opacity="0.38"/><path d="M358 0V160H0" fill="none" stroke="${K.bru}" stroke-width="1.5"/>`;
  // ciel d'aquatinte qui monte du dormeur
  const nuee = 'M0 0H246C238 14 250 26 236 40C222 54 230 70 210 78C190 86 172 76 150 84C128 92 112 84 94 92C74 100 52 94 34 102C20 108 8 104 0 110Z';
  s += `<path d="${nuee}" fill="${K.b9}"/>` + grain(nuee, [0, 0, 250, 112], { f: 'aqua-IV', op: 0.3 });
  s += `<g filter="url(#mordu)"><path d="M246 0C238 14 250 26 236 40C222 54 230 70 210 78C190 86 172 76 150 84C128 92 112 84 94 92C74 100 52 94 34 102C20 108 8 104 0 110" fill="none" stroke="${K.b9}" stroke-width="2"/></g>`;
  // chauves-souris et hiboux en réserve
  const bat = (x, y, sc = 1, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})" d="M0 0C3 -4 7 -5 9 -2C10 -5 12 -5 13 -2C15 -5 19 -4 22 0C18 -1 16 0 15 2C13 0 12 1 11 3C10 1 9 0 7 2C6 0 4 -1 0 0Z" fill="${K.tei}"/>`;
  s += bat(30, 22, 1.1, -8) + bat(84, 14, 0.9, 6) + bat(150, 30, 1.2, -4) + bat(196, 16, 0.8, 10) + bat(58, 52, 0.7, -14) + bat(120, 62, 0.8, 4);
  const hibou = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-8 12C-10 4 -9 -6 -6 -10L-4 -6C-2 -7 2 -7 4 -6L6 -10C9 -6 10 4 8 12C4 15 -4 15 -8 12Z" fill="${K.tei}"/><circle cx="-3" cy="-1.5" r="2.4" fill="${K.b9}"/><circle cx="3" cy="-1.5" r="2.4" fill="${K.b9}"/><circle cx="-2.6" cy="-1.8" r="0.7" fill="${K.tei}"/><circle cx="3.4" cy="-1.8" r="0.7" fill="${K.tei}"/><path d="M-1 2L0 4L1 2" fill="none" stroke="${K.b9}" stroke-width="0.8"/><path d="M-5 6C-3 8 3 8 5 6M-5 9C-3 11 3 11 5 9" fill="none" stroke="${K.b9}" stroke-width="0.5"/></g>`;
  s += hibou(206, 48, 1.15) + hibou(16, 72, 0.95);
  // le bureau et son inscription
  s += `<path d="M34 98H240V105H34Z" fill="${K.tei}" stroke="${K.b9}" stroke-width="1"/>`;
  s += `<path d="M40 105H234V160H40Z" fill="${K.tei}" stroke="${K.b9}" stroke-width="1"/>`;
  s += hachRect(40, 105, 12, 55, { pas: 2.4, sw: 0.5, color: K.b9, angle: 90 });
  s += hachRect(222, 105, 12, 55, { pas: 2.4, sw: 0.5, color: K.b9, angle: 90 });
  s += `<rect x="54" y="111" width="166" height="44" fill="${K.bru}" stroke="${K.b9}" stroke-width="0.75"/>`;
  s += tlines(137, 129, 19, ['Le sommeil de la raison', 'engendre des loups.'], `text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${K.b9}"`);
  // le dormeur, affalé sur le bureau
  s += `<g transform="translate(-14 57) scale(1.02)">`;
  const dos = 'M18 103C12 82 14 50 26 39C34 32 44 30 54 33L60 42L44 60C34 64 26 72 24 103Z';
  s += `<path d="${dos}" fill="${K.tei}"/>`;
  s += hach(dos, [0, 0, 100, 80], { pas: 2.2, sw: 0.55, color: K.b9, angle: 52 });
  s += `<g fill="none" stroke="${K.b9}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"><path d="M18 103C12 82 14 50 26 39C34 32 44 30 54 33"/><path d="M40 39C50 36.5 62 36 72 37.6C77 38.4 77 42.4 72 42.8L50 43.4C46 43.4 42 42 40 39Z" fill="${K.tei}"/><path d="M50 34C51 26 60 22.6 67 26C71 28.2 72 33 69.6 37" fill="${K.tei}"/><path d="M54 30C55 28 57.6 28 58 30M58.6 27C60 25.4 62.4 25.8 62.6 27.6M62.8 29.6C64.4 28.4 66.4 29.2 66.2 31M55.6 33C57 31.6 59 32 59.2 33.6" stroke-width="0.6"/><path d="M52 41C58 40 64 40 70 40.4" stroke-width="0.5"/></g>`;
  s += '</g>';
  // le loup couché, qui regarde le dormeur
  const loup = 'M246 156C246 152 252 150 262 150C256 148 250 144 250 140L262 136C266 128 272 122 278 118L280 110L284 117L288 111L290 120C296 124 298 130 300 132C304 131 306 128 310 130L314 127L318 130C328 129 338 131 344 134C352 139 356 148 354 156Z';
  s += `<g filter="url(#mordu)"><path d="${loup}" fill="${K.b9}"/></g>` + grain(loup, [244, 108, 114, 50], { f: 'aqua-IV', op: 0.3 });
  s += `<path d="M264 131Q268 128.4 272.4 130Q268 131.8 264 131Z" fill="${K.san}"/>`;
  s += `<path d="M0 156.5H358" stroke="${K.b9}" stroke-width="0.75"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 358 160" style="display: block;" role="img" aria-label="Frontispice : le dormeur du Caprice 43, et le loup couché à ses pieds">${s}</svg>`;
}

// ------------------------------------------------------------- esquisses de planche (252 × 264)
const E = (d, sw = 1.4, extra = '') => `<path d="${d}" fill="none" stroke="${K.del}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const tete = (x, y, r = 9) => `M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}`;
export const ESQUISSES = {
  villageois() {
    let s = '';
    const chapeaux = ['tri', 'cone', 'bord', 'tri', 'bonnet', 'cone', 'bord'];
    chapeaux.forEach((c, i) => {
      const x = 18 + i * 26, y = 118 + (i % 2) * 8;
      s += E(tete(x, y, 9) + `M${x - 14} ${y + 36}C${x - 12} ${y + 18} ${x + 12} ${y + 18} ${x + 14} ${y + 36}`, 1.1);
      if (c === 'tri') s += E(`M${x - 13} ${y - 6}L${x} ${y - 14}L${x + 13} ${y - 6}`, 1.1);
      if (c === 'cone') s += E(`M${x - 7} ${y - 6}L${x} ${y - 30}L${x + 7} ${y - 6}`, 1.1);
      if (c === 'bord') s += E(`M${x - 16} ${y - 7}H${x + 16}M${x - 7} ${y - 7}V${y - 15}H${x + 7}V${y - 7}`, 1.1);
      if (c === 'bonnet') s += E(`M${x - 9} ${y - 5}C${x - 6} ${y - 20} ${x + 10} ${y - 20} ${x + 16} ${y - 4}`, 1.1);
    });
    s += E('M30 110L44 22M38 22L42 18L46 23M44 22L45 14M64 102L58 34M52 36L57 30L62 35M57 31V22M122 110L140 30M134 32L139 26L145 31M139 27L141 18', 1.1);
    s += E('M90 104V40M84 40H96V54H84ZM88 54V58M150 112V54M144 54H156V68H144Z', 1.1);
    s += E(tete(206, 150, 22) + 'M184 150L176 156L184 160M162 264C166 214 186 190 206 186C228 186 246 214 250 264', 1.6);
    s += E('M226 140L244 136M214 128C222 122 234 124 238 132', 1.2);
    s += E('M0 230H252', 0.8, ' stroke-dasharray="3 4"');
    return s;
  },
  loup() {
    let s = '';
    for (let y = 30; y < 210; y += 22) s += E(`M0 ${y}H252`, 0.6);
    for (let y = 30, i = 0; y < 210; y += 22, i++) for (let x = (i % 2) * 22; x < 252; x += 44) s += E(`M${x} ${y}V${y + 22}`, 0.6);
    s += `<path d="M150 200C140 160 146 110 168 82L176 60L184 78L194 58L198 84C214 96 226 120 222 150L238 156L220 166C216 186 204 200 196 206Z" fill="${K.del}" fill-opacity="0.18" stroke="${K.del}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    s += E(tete(108, 120, 13) + 'M94 112L122 112M100 108V102H116V108M84 230C84 180 96 150 108 146C122 150 134 180 134 230M120 152L150 100L156 84', 1.4);
    s += E('M152 84L158 80M150 82L148 76M156 86L162 84', 1);
    s += E(tete(30, 214, 9) + tete(56, 220, 9) + 'M14 252C16 236 46 236 48 252M42 258C44 242 70 242 72 258', 1);
    s += E('M0 236H252', 0.8, ' stroke-dasharray="3 4"');
    return s;
  },
  voyante() {
    let s = '';
    s += E('M126 166C110 166 92 180 86 210L74 264H178L166 210C160 180 142 166 126 166Z', 1.4);
    s += E('M108 172C114 160 138 160 144 172M118 186L126 196L134 186', 1.1);
    s += E('M96 190L104 150M100 148L110 154M156 190L148 150M152 148L142 154', 1.3);
    s += E('M84 92Q126 58 168 92Q126 126 84 92Z', 1.5);
    s += `<circle cx="126" cy="92" r="11" fill="${K.del}" fill-opacity="0.85"/>`;
    s += E('M92 80L86 72M106 70L104 62M126 66V58M146 70L148 62M160 80L166 72', 1);
    const hib = (x, y) => E(`M${x - 12} ${y + 16}C${x - 14} ${y + 2} ${x - 12} ${y - 10} ${x - 8} ${y - 14}L${x - 4} ${y - 8}H${x + 4}L${x + 8} ${y - 14}C${x + 12} ${y - 10} ${x + 14} ${y + 2} ${x + 12} ${y + 16}Z` + tete(x - 4, y - 2, 3) + tete(x + 4, y - 2, 3), 1.1);
    s += hib(30, 40) + hib(224, 56);
    s += E('M196 236C192 222 200 212 212 214L216 206L220 214C232 218 234 232 228 240ZM208 222L212 222M218 222L222 222', 1.1);
    return s;
  },
  sorciere() {
    let s = '';
    s += E('M40 264L46 150C48 120 64 104 82 104C94 104 102 112 104 122L118 150L110 154L100 136L102 264', 1.4);
    s += E(tete(84, 90, 14) + 'M70 86C70 70 98 66 100 86', 1.3);
    s += E('M102 134L130 112M126 92H138V100L144 108A8 8 0 1 1 128 108V100Z', 1.2);
    s += E('M140 120H150V128L156 136A7 7 0 1 1 142 136V128Z', 1.2);
    s += E('M118 212C118 186 194 186 194 212C194 236 118 236 118 212ZM118 212H194M126 232L116 258M156 238V262M186 232L196 258', 1.4);
    s += E('M120 206L118 196M150 186L152 176M178 196L182 186', 0.9);
    s += E('M224 260L210 40M204 240L232 236M200 248L218 182M214 250L220 180M228 250L222 182', 1.1);
    return s;
  },
  chasseur() {
    let s = '';
    s += E('M30 222C60 210 120 206 180 216L216 230L196 240C150 238 80 244 40 240Z', 1.3);
    s += E(tete(38, 212, 12), 1.3);
    s += E('M72 214L170 140M160 134L176 148M82 220L96 196L112 200', 1.4);
    s += E('M176 132C168 120 182 112 176 100C170 88 186 80 180 68C174 56 190 46 184 32', 1.1);
    s += E('M188 136C196 124 186 112 196 102C204 92 194 84 202 74', 0.9);
    for (let i = 0; i < 6; i++) s += E(tete(20 + i * 36, 60 + (i % 2) * 10, 8) + `M${8 + i * 36} ${86 + (i % 2) * 10}C${10 + i * 36} ${74 + (i % 2) * 10} ${30 + i * 36} ${74 + (i % 2) * 10} ${32 + i * 36} ${86 + (i % 2) * 10}`, 0.9);
    s += E('M0 248H252', 0.8, ' stroke-dasharray="3 4"');
    return s;
  },
  cupidon() {
    let s = '';
    s += E(tete(54, 140, 12) + 'M42 136H66M40 202C40 170 46 156 54 154C64 156 70 170 70 202M48 202L44 240M62 202L66 240', 1.3);
    s += E('M70 166C88 150 90 126 76 112M76 112L70 168M70 140H118M110 134L120 140L110 146', 1.2);
    s += E('M140 90L180 70M176 66L184 70L178 76M120 210L170 180M166 176L174 180L168 186', 1);
    s += E(tete(176, 120, 12) + tete(214, 124, 12) + 'M156 240C156 170 166 140 176 136C186 138 194 160 196 180M194 180C196 160 204 140 214 140C226 144 236 170 236 240', 1.3);
    s += E('M190 170L200 174M190 180L200 184M190 190L200 194M190 200L200 204M192 168L198 206', 1);
    s += E('M0 248H252', 0.8, ' stroke-dasharray="3 4"');
    return s;
  },
  salvateur() {
    let s = '';
    s += E('M20 250V110A50 50 0 0 1 120 110V250M20 250H120M44 250V96M70 250V62M96 250V96', 1.3);
    s += E('M174 120H236V196H174ZM205 120V196M174 158H236', 1.3);
    s += `<path d="M198 130C192 140 194 156 200 168C206 156 214 146 212 132Z" fill="${K.del}" fill-opacity="0.5"/>`;
    s += E(tete(150, 132, 12) + 'M130 250C130 200 140 156 150 152C162 156 170 200 170 250M146 156L134 112M128 96H140V112H128ZM134 96V88', 1.4);
    s += E('M0 252H252', 0.8, ' stroke-dasharray="3 4"');
    return s;
  },
};
export function esquisse(id, size = 126) {
  const sc = size / 252;
  let s = `<rect width="252" height="264" fill="${K.tei}"/>`;
  s += `<path d="M84 0V264M168 0V264M0 88H252M0 176H252" stroke="${K.p2}" stroke-width="0.6" stroke-dasharray="2 5"/>`;
  s += ESQUISSES[id]();
  s += `<rect x="0.5" y="0.5" width="251" height="263" fill="none" stroke="${K.del}" stroke-width="1"/>`;
  return `<svg width="${252 * sc}" height="${264 * sc}" viewBox="0 0 252 264" style="display: block;" role="img" aria-label="Esquisse de la planche illustrée">${s}</svg>`;
}
