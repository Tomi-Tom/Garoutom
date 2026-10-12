// Composants dessinés (SPEC § 5) — jeton, cartouches, boutons, minuterie, frise, barre, pli.
import { C, PAPIER, CUIVRE, FELL, SC, SERIF, n, esc, id, T, ts, st, rng, cuivreRect } from './lib.mjs';
import { buste } from './chefs.mjs';
import { icg, glg, symg, IC } from './traces.mjs';

/* ---------- largeur de texte estimée (Source Serif 4 / IM Fell) ---------- */
const LARGE = 'MWmw';
const ETROIT = 'iljtfr·.,:;’\'!|()[] ';
export function tw(texte, taille, poids = 400, famille = 'serif') {
  let w = 0;
  for (const ch of String(texte)) {
    if (ETROIT.includes(ch)) w += 0.28;
    else if (LARGE.includes(ch)) w += 0.82;
    else if (ch >= 'A' && ch <= 'Z' || 'ÉÈÀÂ'.includes(ch)) w += 0.66;
    else if (ch >= '0' && ch <= '9') w += 0.52;
    else w += 0.5;
  }
  if (famille === 'sc') w *= 1.08;
  if (famille === 'fell') w *= 0.94;
  return w * taille * (poids >= 600 ? 1.05 : 1);
}

/* ================================ CARTOUCHES ================================ */
// formes : ecu, mordu, mordu2, lacs, audela, ovale (SPEC § 5.3 ; géométrie de textures.svg)
export function cartForme(forme, w, h) {
  const c = h * 0.2, k = h / 30;
  const X = (x) => n(w - (120 - x) * k); // côté droit mordu, relatif au bord droit
  const Xl = (x) => n(x * k);            // côté gauche mordu
  const Y = (y) => n(y * k);
  switch (forme) {
    case 'ecu': case 'audela':
      return `M${n(c)} 0.75 H${n(w - c)} L${n(w - 0.75)} ${n(c)} V${n(h - c)} L${n(w - c)} ${n(h - 0.75)} H${n(c)} L0.75 ${n(h - c)} V${n(c)} Z`;
    case 'mordu':
      return `M${n(c)} 1 H${X(100)} L${X(104)} ${Y(6)} L${X(109)} ${Y(2)} L${X(111)} ${Y(10)} L${X(119)} ${Y(13)} L${X(112)} ${Y(17)} L${X(118)} ${Y(23)} L${X(110)} ${Y(25)} L${X(106)} ${n(h - 1)} H${n(c)} L1 ${n(h - c)} V${n(c)} Z`;
    case 'mordu2':
      return `M${Xl(20)} 1 H${X(100)} L${X(104)} ${Y(6)} L${X(109)} ${Y(2)} L${X(111)} ${Y(10)} L${X(119)} ${Y(13)} L${X(112)} ${Y(17)} L${X(118)} ${Y(23)} L${X(110)} ${Y(25)} L${X(106)} ${n(h - 1)} H${Xl(20)} L${Xl(16)} ${Y(24)} L${Xl(11)} ${Y(28)} L${Xl(9)} ${Y(20)} L${Xl(1)} ${Y(17)} L${Xl(8)} ${Y(13)} L${Xl(2)} ${Y(7)} L${Xl(10)} ${Y(5)} L${Xl(14)} 1 Z`;
    default: return '';
  }
}
/**
 * Cartouche de camp. camp : village | meute | seul | serment | audela | cache.
 * Renvoie { svg, w } (posé en x, y ; hauteur 30 ou 20).
 */
export function cartouche(x, y, camp, mot, t = PAPIER, h = 30, wForce, trait) {
  const fs = h >= 30 ? 14 : 12, pad = h >= 30 ? 12 : 8;
  const poids = camp === 'meute' || camp === 'seul' ? 600 : 400;
  const morsure = camp === 'meute' ? 19 * h / 30 : camp === 'seul' ? 38 * h / 30 : 0;
  const w = wForce ?? Math.ceil(tw(mot, fs, poids) + pad * 2 + morsure * 0.7);
  const nuit = t === CUIVRE;
  let forme = '', fill = t.surface, stroke, sw, dash = '', tc, it = false;
  switch (camp) {
    case 'village': forme = 'ecu'; stroke = t.village; sw = 1.5; tc = t.encre; break;
    case 'meute': forme = 'mordu'; stroke = t.meute; sw = 2; tc = t.meute; break;
    case 'seul': forme = 'mordu2'; stroke = t.meute; sw = 2; tc = nuit ? t.meute : t.surEncre; if (!nuit) fill = t.meute; break;
    case 'serment': forme = 'lacs'; stroke = t.serment; sw = 2; tc = t.serment; break;
    case 'audela': forme = 'audela'; stroke = t.audela; sw = 1.2; dash = '1.5 3'; tc = t.audela; it = true; break;
    default: forme = 'ovale'; stroke = t.encre2; sw = 1.4; dash = '3 3'; tc = t.encre2;
  }
  if (trait) stroke = trait;
  let shape;
  if (forme === 'lacs') {
    const i = h >= 30 ? 3.5 : 2.6;
    shape = `<rect x="1" y="1" width="${n(w - 2)}" height="${n(h - 2)}" rx="${n(h / 2 - 1)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><rect x="${i + 1}" y="${i + 1}" width="${n(w - 2 * i - 2)}" height="${n(h - 2 * i - 2)}" rx="${n(h / 2 - i - 1)}" fill="none" stroke="${stroke}" stroke-width="0.9"/>`;
  } else if (forme === 'ovale') {
    shape = `<ellipse cx="${n(w / 2)}" cy="${n(h / 2)}" rx="${n(w / 2 - 1)}" ry="${n(h / 2 - 1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}"/>`;
  } else {
    shape = `<path d="${cartForme(forme, w, h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="miter" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  }
  const cx = camp === 'meute' ? (w - morsure * 0.55) / 2 : w / 2;
  const svg = `<g transform="translate(${n(x)} ${n(y)})">${shape}<text x="${n(cx)}" y="${n(h / 2 + fs * 0.36)}" ${st({ s: fs, w: poids, c: tc, it, anchor: 'middle' })}>${esc(mot)}</text></g>`;
  return { svg, w };
}

/* ================================ JETON ================================ */
export const DENS = {
  D1: { w: 114, h: 124, m: 72, ns: 15, pad: 9 },
  D2: { w: 85, h: 104, m: 60, ns: 15, pad: 8 },
  D3: { w: 68, h: 88, m: 48, ns: 14, pad: 5 },
  D4: { w: 68, h: 76, m: 40, ns: 13, pad: 5 },
  G: { w: 150, h: 150, m: 96, ns: 16, pad: 22 },
};

/**
 * Jeton de joueur, posé en (x, y) = coin haut-gauche de la cellule.
 * e : { choisi, aVote, moi, mort:{camp,mot}, gracie:{camp,mot}, horsVote, marque, capitaine, amoureux,
 *       absent, reconnexion, votera, badge:{sym,camp}, nonChoisi, interdit, annote:{txt}|{compte}, cadreCellule }
 */
export function jeton({ x = 0, y = 0, d = 'D1', t = PAPIER, chef = 0, nom, statut, statutFort = false, e = {} }) {
  const D = DENS[d];
  const { w, h, m } = D;
  const cx = w / 2, cy = D.pad + m / 2;
  const R = m / 2, r = (m - 8) / 2;
  const k = t.encre;
  let s = '';
  // cellule (focus/cible) — trait de construction discret seulement si demandé
  if (e.cadreCellule) s += `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${t.filetDoux}" stroke-width="0.5" stroke-dasharray="2 3"/>`;
  // « moi » : cadre carré double
  if (e.moi) {
    const a = m + 14, b = a - 6.25;
    s += `<rect x="${n(cx - a / 2)}" y="${n(cy - a / 2)}" width="${n(a)}" height="${n(a)}" fill="none" stroke="${k}" stroke-width="1.5"/>`;
    s += `<rect x="${n(cx - b / 2)}" y="${n(cy - b / 2)}" width="${n(b)}" height="${n(b)}" fill="none" stroke="${k}" stroke-width="0.75"/>`;
  }
  // anneau
  let ringStroke = k, ringW = e.choisi ? 3.5 : 1.5, ringDash = '';
  if (e.nonChoisi || e.interdit) { ringStroke = t.filetDoux; ringW = 1; }
  if (e.mort) { ringStroke = t.mortTrait; ringW = 1; }
  if (e.reconnexion) ringDash = 'stroke-dasharray="4 2"';
  if (e.cran === 2) { ringStroke = t.mortTrait; ringW = 1; }
  s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}" fill="${t.surface}" stroke="${ringStroke}" stroke-width="${ringW}" ${ringDash}/>`;
  // disque intérieur
  const pat = (lv) => `url(#hach-${lv}-${t.suf})`;
  let discFill = pat(1), discStroke = k, discW = 0.75;
  if (e.mort) { discFill = 'none'; discStroke = t.mortBuste; discW = 0.6; }
  if (e.cran) { discFill = 'none'; }
  if (e.nonChoisi || e.interdit) { discFill = 'none'; discStroke = t.filetDoux; }
  if (e.horsVote) discFill = t.suf === 'e' ? 'url(#hach-barre-e)' : 'url(#lf-barre-v)';
  if (e.absent) discFill = pat('x');
  s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${discFill}" stroke="${discStroke}" stroke-width="${discW}"/>`;
  // buste
  if (!e.absent) {
    const bs = 0.75 * m, bx = cx - bs / 2, by = cy + r - bs;
    const cid = id('cl');
    const mode = e.mort || e.cran === 2 ? 'fantome' : 'grav';
    s += `<clipPath id="${cid}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r - 0.4)}"/></clipPath>`;
    s += `<g clip-path="url(#${cid})"><g transform="translate(${n(bx)} ${n(by)}) scale(${n(bs / 48)})">${buste(chef, { k, p: t.surface, suf: t.suf, mode, ghost: e.cran === 2 ? k : t.mortBuste })}</g></g>`;
  } else {
    const cs = Math.max(14, 0.36 * m);
    s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(cs / 2 + 3)}" fill="${t.surface}"/>` + glg('chaise', cx - cs / 2, cy - cs / 2, cs, k);
  }
  // repères de visée
  if (e.choisi) {
    const a0 = R + 1.75 + 2, a1 = a0 + 6;
    s += `<path d="M${n(cx)} ${n(cy - a0)}V${n(cy - a1)}M${n(cx)} ${n(cy + a0)}V${n(cy + a1)}M${n(cx - a0)} ${n(cy)}H${n(cx - a1)}M${n(cx + a0)} ${n(cy)}H${n(cx + a1)}" stroke="${k}" stroke-width="2.4" stroke-linecap="butt"/>`;
  }
  // brassard (bandeau S)
  if (e.capitaine) {
    const bw = 0.8 * m, by = cy + r - 9, bh = 14;
    s += `<path d="M${n(cx - bw / 2)} ${n(by)} H${n(cx + bw / 2)} L${n(cx + bw / 2 - 4)} ${n(by + bh)} H${n(cx - bw / 2 + 4)} Z" fill="${k}"/>`;
    s += `<text x="${n(cx)}" y="${n(by + 11)}" ${st({ s: 12, w: 700, c: t.surEncre, anchor: 'middle', extra: 'font-variant-numeric="tabular-nums"' })}>×2</text>`;
  }
  // NE : sceau / annotation
  const neX = cx + 0.35 * m, neY = cy - 0.35 * m, neS = Math.max(16, 0.28 * m);
  if (e.aVote) s += `<circle cx="${n(neX)}" cy="${n(neY)}" r="${n(neS / 2 + 1.5)}" fill="${t.surface}"/>` + glg('sceau', neX - neS / 2, neY - neS / 2, neS, k, t.surEncre);
  if (e.annote) {
    if (e.annote.txt) {
      const pw = tw(e.annote.txt, 12, 600) + 10;
      s += `<rect x="${n(neX - pw / 2)}" y="${n(neY - 9)}" width="${n(pw)}" height="18" fill="${t.surface}" stroke="${t.filet}" stroke-width="1"/>`;
      s += `<text x="${n(neX)}" y="${n(neY + 4.3)}" ${st({ s: 12, w: 600, c: t.meute, anchor: 'middle' })}>${esc(e.annote.txt)}</text>`;
    } else {
      const pw = 28;
      s += `<rect x="${n(neX - pw / 2)}" y="${n(neY - 9)}" width="${pw}" height="18" fill="${t.surface}" stroke="${t.filet}" stroke-width="1"/>`;
      s += glg('oeil', neX - pw / 2 + 3, neY - 5, 10, k);
      s += `<text x="${n(neX + 6)}" y="${n(neY + 4.3)}" ${st({ s: 12, w: 600, c: k, anchor: 'middle' })}>${e.annote.compte}</text>`;
    }
  }
  // NO : cartouche « +2 »
  if (e.marque) {
    const mw = m <= 40 ? 22 : 26, mh = m <= 40 ? 16 : 18;
    const mx = cx - 0.4 * m - mw / 2, my = cy - 0.36 * m - mh / 2;
    s += `<rect x="${n(mx)}" y="${n(my)}" width="${mw}" height="${mh}" fill="${k}"/>`;
    s += glg('plume', mx + 1.5, my + mh / 2 - 5, 10, t.surEncre);
    s += `<text x="${n(mx + mw - 1.5)}" y="${n(my + mh / 2 + 4.2)}" ${st({ s: 12, w: 700, c: t.surEncre, anchor: 'end' })}>+2</text>`;
  }
  // O : lacs
  if (e.amoureux) {
    const lx = cx - 0.52 * m;
    s += `<circle cx="${n(lx)}" cy="${n(cy)}" r="9.5" fill="${t.surface}"/>` + glg('lacs', lx - 8, cy - 8, 16, t.serment);
  }
  // SO : glyphe d'état ou badge de rôle
  const soX = cx - 0.35 * m, soY = cy + 0.35 * m;
  const soGl = e.gracie ? 'corde' : e.horsVote ? 'horsvote' : e.votera ? 'index' : e.interdit ? 'bouclier-barre' : null;
  if (soGl) s += `<circle cx="${n(soX)}" cy="${n(soY)}" r="10" fill="${t.surface}" stroke="${t.filetDoux}" stroke-width="0.75"/>` + glg(soGl, soX - 8, soY - 8, 16, k);
  if (e.badge) {
    const col = e.badge.camp === 'meute' ? t.meute : t.encre;
    s += `<circle cx="${n(soX)}" cy="${n(soY)}" r="10" fill="${t.surface}" stroke="${col}" stroke-width="1.2"/>` + symg(e.badge.sym, soX - 7, soY - 7, 14, col, true);
  }
  // nom
  const nb = cy + R + 3 + D.ns * 0.82;
  const nomC = e.mort ? t.mortTexte : t.encre;
  const nomW = e.moi ? 700 : 600;
  s += `<text x="${n(cx)}" y="${n(nb)}" ${st({ s: D.ns, w: nomW, c: nomC, anchor: 'middle' })}>${esc(nom)}</text>`;
  const nwid = tw(nom, D.ns, nomW);
  if (e.mort) s += `<path d="M${n(cx - nwid / 2 - 1)} ${n(nb - D.ns * 0.3)}H${n(cx + nwid / 2 + 1)}" stroke="${t.mortTexte}" stroke-width="1"/>`;
  if (e.choisi) s += `<path d="M${n(cx - nwid / 2)} ${n(nb + 3)}H${n(cx + nwid / 2)}" stroke="${k}" stroke-width="1.5"/>`;
  // statut ou cartouche
  const carte = e.mort || e.gracie;
  if (carte) {
    const court = d === 'D3' || d === 'D4';
    const mot = court ? ({ village: 'Village', meute: 'Meute', seul: 'Seul', cache: 'Cachée' }[carte.camp] ?? carte.mot) : carte.mot;
    const est = cartouche(0, 0, carte.camp, mot, t, 20);
    const cw = Math.min(est.w, w - 2);
    s += cartouche(cx - cw / 2, nb + 2, carte.camp, mot, t, 20, cw).svg;
  } else if (statut) {
    s += `<text x="${n(cx)}" y="${n(nb + (d === 'D3' ? 14 : d === 'D4' ? 13 : 16))}" ${st({ s: 12, w: statutFort ? 600 : 400, c: statutFort ? t.encre : t.encre2, anchor: 'middle' })}>${esc(statut)}</text>`;
  }
  return `<g transform="translate(${n(x)} ${n(y)})">${s}</g>`;
}

/* ================================ MINUTERIE ================================ */
/** v : barre | discrete | urgence | absente ; restants sur 24 ; renvoie un <g> de 24 px de haut, ~265 de large. */
export function minuterie(x, y, v, t = PAPIER, restants = 14, chiffre = '0:41') {
  const nuit = t === CUIVRE;
  let s = '';
  const sab = v === 'urgence' ? `<g transform="rotate(180 ${n(8)} ${n(12)})">${icg('sablier', 0, 4, 16, t.encre, 2.2)}</g>` : icg('sablier', 0, 4, 16, v === 'discrete' ? t.encre2 : t.encre, 2.2);
  s += sab;
  if (v === 'discrete') {
    s += `<text x="24" y="17" ${st({ s: 14, c: t.encre2, extra: 'font-variant-numeric="tabular-nums lining-nums"' })}>${chiffre}</text>`;
    return `<g transform="translate(${n(x)} ${n(y)})">${s}</g>`;
  }
  for (let i = 0; i < 24; i++) {
    const cxp = 24 + i * 8;
    const plein = v !== 'absente' && i < restants;
    if (plein) {
      const fill = v === 'urgence' ? (nuit ? 'url(#lf-hachx-p2)' : 'url(#hach-x-e)') : t.cranPlein;
      s += `<rect x="${cxp}" y="7" width="5" height="10" fill="${fill}" ${v === 'urgence' ? `stroke="${t.cranPlein}" stroke-width="1"` : ''}/>`;
    } else {
      s += `<rect x="${cxp + 0.5}" y="7.5" width="4" height="9" fill="none" stroke="${t.cranVide}" stroke-width="1"/>`;
    }
  }
  const fx = 24 + 24 * 8 + 4 + 44;
  if (v === 'absente') s += `<text x="${fx}" y="17" ${st({ s: 16, c: t.encre2, anchor: 'end' })}>—</text>`;
  else s += `<text x="${fx}" y="${v === 'urgence' ? 18 : 17}" ${st({ s: v === 'urgence' ? 20 : 16, w: v === 'urgence' ? 600 : 400, c: t.encre, anchor: 'end', extra: 'font-variant-numeric="tabular-nums lining-nums"' })}>${chiffre}</text>`;
  return `<g transform="translate(${n(x)} ${n(y)})">${s}</g>`;
}
export const MINUTERIE_L = 24 + 24 * 8 + 4 + 44;

/* ================================ FRISE ================================ */
/** Ligne de toits de Thiercelieux (18 px), gravée. Renvoie le contenu SVG pour [0,w] avec bas à yb. */
export function toits(w, yb, t = PAPIER, seed = 7) {
  const r = rng(seed);
  const nuit = t === CUIVRE;
  const fill = nuit ? C.p3 : t.surface, k = nuit ? C.p2 : t.encre;
  const hach = nuit ? '' : 'url(#hach-2-e)';
  let s = '';
  let x = -6;
  const clocherX = Math.round(w * 0.36), potenceX = w - 64;
  while (x < w + 10) {
    if (Math.abs(x - clocherX) < 26) { x = clocherX + 26; continue; }
    if (x > potenceX - 30 && x < potenceX + 26) { x = potenceX + 26; continue; }
    const hw = 22 + Math.round(r() * 24), mur = 6 + Math.round(r() * 5), toit = 5 + Math.round(r() * 5);
    const x0 = x, x1 = x + hw, xm = x0 + hw * (0.42 + r() * 0.16);
    const yM = yb - mur, yT = yM - toit;
    s += `<path d="M${n(x0)} ${n(yb)} V${n(yM)} L${n(xm)} ${n(yT)} L${n(x1)} ${n(yM)} V${n(yb)} Z" fill="${fill}" stroke="${k}" stroke-width="1" stroke-linejoin="miter"/>`;
    if (hach) s += `<path d="M${n(x0)} ${n(yM)} L${n(xm)} ${n(yT)} L${n(xm)} ${n(yM)} Z" fill="${hach}"/>`;
    s += `<path d="M${n(x0)} ${n(yM)} H${n(x1)}" stroke="${k}" stroke-width="0.6"/>`;
    if (r() > 0.45) { const fx = x0 + 4 + r() * (hw - 10); s += `<rect x="${n(fx)}" y="${n(yM + 2)}" width="2.4" height="3" fill="${nuit ? C.b900 : k}"/>`; }
    if (r() > 0.6) { const cxm = x0 + hw * 0.7; s += `<rect x="${n(cxm)}" y="${n(yT + toit * 0.2)}" width="3" height="${n(toit * 0.7)}" fill="${fill}" stroke="${k}" stroke-width="0.8"/>`; }
    x = x1 + (r() > 0.7 ? 2 : 0);
  }
  // clocher à une fenêtre
  const cx0 = clocherX - 8;
  s += `<path d="M${cx0} ${yb} V${yb - 20} H${cx0 + 16} V${yb} Z" fill="${fill}" stroke="${k}" stroke-width="1"/>`;
  s += `<path d="M${cx0 - 1.5} ${yb - 20} L${cx0 + 8} ${yb - 31} L${cx0 + 17.5} ${yb - 20} Z" fill="${nuit ? fill : 'url(#hach-3-e)'}" stroke="${k}" stroke-width="1"/>`;
  s += `<path d="M${cx0 + 8} ${yb - 31} V${yb - 35} M${cx0 + 6.4} ${yb - 33.6} H${cx0 + 9.6}" stroke="${k}" stroke-width="1"/>`;
  s += `<path d="M${cx0 + 5.6} ${yb - 9} V${yb - 14} A2.4 2.4 0 0 1 ${cx0 + 10.4} ${yb - 14} V${yb - 9} Z" fill="${nuit ? C.b900 : k}"/>`;
  // potence
  s += `<path d="M${potenceX} ${yb} V${yb - 24} H${potenceX + 13} M${potenceX} ${yb - 19} L${potenceX + 5} ${yb - 24} M${potenceX + 12} ${yb - 24} V${yb - 17}" fill="none" stroke="${k}" stroke-width="1.4" stroke-linecap="square"/>`;
  s += `<circle cx="${potenceX + 12}" cy="${yb - 14.6}" r="2.4" fill="none" stroke="${k}" stroke-width="1"/>`;
  s += `<path d="M${potenceX - 5} ${yb} H${potenceX + 6}" stroke="${k}" stroke-width="1.4"/>`;
  return s;
}

/** Plaque pleine (cartouche d'en-tête) pour un outil 44. */
function outil44(x, y, icId, t, w = 44, libelle) {
  let s = `<rect x="${n(x + 0.5)}" y="${n(y + 0.5)}" width="${w - 1}" height="43" fill="${t.surface}" stroke="${t.filetDoux}" stroke-width="1"/>`;
  if (libelle) {
    s += icg(icId, x + 8, y + 10, 24, t.encre);
    s += `<text x="${n(x + 38)}" y="${n(y + 27)}" ${st({ s: 15, w: 600, c: t.encre })}>${esc(libelle)}</text>`;
  } else if (icId) s += icg(icId, x + (w - 24) / 2, y + 10, 24, t.encre);
  return s;
}
export const RETOUR = `<path d="M15 5L8 12l7 7"/><path stroke-width=".75" d="M11.4 12h8.6"/>`;

/** Frise d'en-tête : mobile (h 56) ou desktop (h 64, minuterie dedans). */
export function frise({ w = 390, t = PAPIER, heure = 'Jour II', desktop = false, code = 'VRGL', spectateur = false, seed = 7 }) {
  const h = desktop ? 64 : 56;
  const nuit = t === CUIVRE;
  let s = '';
  if (nuit) s += cuivreRect(0, 0, w, h);
  else s += `<rect width="${w}" height="${h}" fill="${t.fond}"/><rect width="${w}" height="${h}" fill="url(#hach-h-e)" opacity="0.28"/>`;
  s += toits(w, h, t, seed);
  const g = desktop ? 32 : 16, yb = (h - 44) / 2;
  s += outil44(g, yb, RETOUR, t);
  const hw = Math.ceil(tw(heure, desktop ? 22 : 20, 400, 'sc')) + 24;
  s += `<rect x="${g + 52.5}" y="${yb + 0.5}" width="${hw}" height="43" fill="${t.surface}" stroke="${t.filetDoux}" stroke-width="1"/>`;
  s += `<text x="${g + 52 + 12}" y="${yb + 29}" ${st({ f: 'sc', s: desktop ? 22 : 20, c: t.encre, ls: '.02em' })}>${esc(heure)}</text>`;
  let xr = g + 52 + hw + 8;
  if (desktop) {
    const cw = Math.ceil(tw(code, 20, 600)) * 1.3 + 24;
    s += `<rect x="${xr + 0.5}" y="${yb + 0.5}" width="${n(cw)}" height="43" fill="${t.surface}" stroke="${t.filetDoux}" stroke-width="1"/>`;
    s += `<text x="${xr + 12}" y="${yb + 29}" ${st({ s: 20, w: 600, c: t.encre, ls: '.24em' })}>${code}</text>`;
    xr += cw + 8;
    s += `<rect x="${xr + 0.5}" y="${yb + 0.5}" width="${MINUTERIE_L + 24}" height="43" fill="${t.surface}" stroke="${t.filetDoux}" stroke-width="1"/>`;
    s += minuterie(xr + 12, yb + 10, 'barre', t, 14, '0:41');
  }
  // à droite : Ma carte · menu · son
  const xs = w - g - 44, xm = xs - 8 - 44, xc = xm - 8 - 76;
  s += outil44(xs, yb, 'son', t);
  s += outil44(xm, yb, 'menu', t);
  if (spectateur) s += `<rect x="${xc + 0.5}" y="${yb + 0.5}" width="75" height="43" fill="none" stroke="${t.filetDoux}" stroke-width="1" stroke-dasharray="2 3"/>`;
  else s += outil44(xc, yb, 'carte', t, 76, 'Carte');
  return s;
}

/* ================================ BOUTONS (HTML) ================================ */
const hachCSS = (couleur, pas, ep) => `repeating-linear-gradient(45deg, ${couleur} 0 ${ep}px, transparent ${ep}px ${pas}px)`;
/** variante : primaire | secondaire | discret | outil | arme | appui | encours ; etat : repos | appuye | survol | eteint */
export function bouton({ v = 'primaire', etat = 'repos', t = PAPIER, label = '', w = 200, raison, icone: ic, nuitBarre = false, progres = 0 }) {
  const h = v === 'outil' || v === 'discret' ? 44 : 48;
  const base = `box-sizing: border-box; height: ${h}px; width: ${w}px; margin: 0; padding: 0 16px; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: ${SERIF}; font-size: 17px; line-height: 20px; cursor: pointer; position: relative;`;
  let style = base, inner = esc(label), wrap = '';
  const lbl = (bg, c, w8 = 600) => `<span style="background: ${bg}; color: ${c}; padding: 2px 6px; font-weight: ${w8};">${esc(label)}</span>`;
  if (etat === 'eteint' && v !== 'discret' && v !== 'outil') {
    style += ` background: transparent; border: 1.5px dashed ${t.filetDoux}; color: ${t.encre2}; font-weight: ${v === 'primaire' ? 600 : 400};`;
    const btn = `<button type="button" disabled aria-describedby="r" style="${style}">${inner}</button>`;
    return `<div style="display: flex; flex-direction: column; gap: 4px; width: ${w}px;">${btn}${raison ? `<span style="${ts({ s: 12, lh: 16, c: t.encre2 })}">${esc(raison)}</span>` : ''}</div>`;
  }
  const fondNuit = nuitBarre ? C.p3 : null;
  switch (v) {
    case 'primaire':
      if (etat === 'appuye') { style += ` background-color: ${t.surface}; background-image: ${hachCSS(t.actFond, 2.6, 1.1)}; border: 1.5px solid ${t.actBord};`; inner = lbl(t.actFond, t.actTexte); }
      else style += ` background: ${t.actFond}; color: ${t.actTexte}; font-weight: 600; border: 1.5px solid ${t.actBord};` + (etat === 'survol' ? ` outline: 1px solid ${t.actBord}; outline-offset: 0;` : '');
      break;
    case 'secondaire':
      if (fondNuit) style += ` background: ${fondNuit}; color: ${t.encre}; border: 1.5px solid ${C.p1}; font-weight: 600;`;
      else if (etat === 'appuye' || etat === 'survol') { style += ` background-color: transparent; background-image: ${hachCSS(t.encre, 6, 0.6)}; border: 1.5px solid ${t.filet}; color: ${t.encre};`; inner = lbl(t.fond, t.encre, 400); }
      else style += ` background: transparent; border: 1.5px solid ${t.filet}; color: ${t.encre}; font-weight: 400;`;
      break;
    case 'discret':
      style += ` background: transparent; border: none; padding: 0 4px; width: auto; color: ${etat === 'eteint' ? t.encre2 : t.encre}; text-decoration: ${etat === 'eteint' ? 'none' : 'underline'}; text-decoration-thickness: ${etat === 'appuye' || etat === 'survol' ? 2 : 1}px; text-underline-offset: 3px; font-size: 16px; font-weight: 400;`;
      break;
    case 'outil':
      style += ` width: ${w}px; padding: 0; color: ${t.encre};` + (etat === 'appuye' ? ` background-color: transparent; background-image: ${hachCSS(t.encre, 6, 0.6)}; border: 1px solid ${t.filetDoux};` : etat === 'survol' ? ` background: ${t.surface}; border: 1px solid ${t.filet};` : ` background: ${t.surface}; border: 1px solid ${t.filetDoux};`);
      inner = (ic ? `<span style="display: flex;">${iconeHtml(ic, 24, t.encre)}</span>` : '') + (label ? `<span style="font-size: 15px; font-weight: 600;">${esc(label)}</span>` : '');
      if (label) style += ' justify-content: flex-start; padding: 0 10px;';
      break;
    case 'arme': {
      const g = t.encre;
      style += ` background: ${t.surface}; border: 3px solid ${g}; padding: 2px; overflow: visible;`;
      inner = `<span style="box-sizing: border-box; flex: 1; align-self: stretch; display: flex; align-items: center; justify-content: center; background: ${t.actFond}; border: 1px solid ${g}; color: ${t.actTexte}; font-weight: 600; font-size: 17px;">${esc(label)}</span>`;
      const vis = `<svg width="${w + 16}" height="${h + 16}" viewBox="0 0 ${w + 16} ${h + 16}" style="position: absolute; left: -8px; top: -8px; pointer-events: none;" aria-hidden="true"><path d="M2 8 V2 H8 M${w + 8} 2 H${w + 14} V8 M${w + 14} ${h + 8} V${h + 14} H${w + 8} M8 ${h + 14} H2 V${h + 8}" fill="none" stroke="${g}" stroke-width="2.4"/></svg>`;
      wrap = vis;
      break;
    }
    case 'appui': {
      const fond = fondNuit ?? 'transparent';
      style += ` background: ${fond}; border: 1.5px solid ${fondNuit ? C.p1 : t.filet}; color: ${t.encre}; font-weight: ${fondNuit ? 600 : 400}; justify-content: flex-start; gap: 12px;`;
      const piste = fondNuit ? C.p2 : t.filetDoux;
      const prog = fondNuit ? C.ver : t.encre;
      let arc = '';
      if (progres > 0) {
        const a = Math.min(progres, 0.999) * 2 * Math.PI;
        const x1 = 13 + 10 * Math.sin(a), y1 = 13 - 10 * Math.cos(a);
        arc = `<path d="M13 3 A10 10 0 ${a > Math.PI ? 1 : 0} 1 ${n(x1)} ${n(y1)}" fill="none" stroke="${prog}" stroke-width="3"/>`;
        let ticks = '';
        for (let i = 0; i < 12; i++) { const b = (i / 12) * 2 * Math.PI; ticks += `M${n(13 + 8.2 * Math.sin(b))} ${n(13 - 8.2 * Math.cos(b))}L${n(13 + 11.8 * Math.sin(b))} ${n(13 - 11.8 * Math.cos(b))}`; }
        arc += `<path d="${ticks}" stroke="${fondNuit ?? t.fond}" stroke-width="0.8"/>`;
      }
      inner = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex: none;"><circle cx="13" cy="13" r="10" fill="none" stroke="${piste}" stroke-width="3"/>${arc}</svg><span>${esc(label)}</span>`;
      break;
    }
    case 'encours':
      style += ` background: ${t.actFond}; color: ${t.actTexte}; border: 1.5px solid ${t.actBord}; font-weight: 600;`;
      inner = `<span>Envoi…</span><svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" fill="${t.actTexte}"/><rect x="12.5" y="0.5" width="9" height="9" fill="${t.actTexte}"/><rect x="24.5" y="0.5" width="9" height="9" fill="none" stroke="${t.actTexte}" stroke-width="1"/></svg>`;
      break;
  }
  const btn = `<button type="button" ${v === 'outil' && !label ? `aria-label="${esc(raison || 'outil')}"` : ''} style="${style}">${inner}${wrap}</button>`;
  return btn;
}
export function iconeHtml(idOrSvg, taille = 24, couleur = 'currentColor') {
  const inner = IC[idOrSvg] ?? idOrSvg;
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" aria-hidden="true" style="display: block; color: ${couleur}; flex: none;"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}

/* ================================ BARRE AU POUCE ================================ */
export function barrePouce({ t = PAPIER, w = 390, contenu }) {
  return `<div style="box-sizing: border-box; width: ${w}px; height: 72px; background: ${t.surface}; border-top: 1.5px solid ${t.filet}; padding: 12px 16px; display: flex; gap: 8px; align-items: flex-start;">${contenu}</div>`;
}
/** Ligne de résumé (24). */
export function resume({ t = PAPIER, w = 390, gauche = '', droite = '' }) {
  return `<div style="box-sizing: border-box; width: ${w}px; height: 24px; padding: 0 16px; display: flex; justify-content: space-between; align-items: center; background: ${t.fond};"><span style="${ts({ s: 14, lh: 20, c: t.encre })}">${gauche}</span><span style="${ts({ s: 16, lh: 20, c: t.encre, extra: 'font-variant-numeric: tabular-nums lining-nums;' })}">${droite}</span></div>`;
}
/** Le pli (44) : cartouche du canal + libellé + compteur + chevron. */
export function pli({ t = PAPIER, w = 390, camp = 'village', libelle = 'Le village', compte, trait }) {
  const ct = cartouche(0, 0, camp, libelle, t, 26, undefined, trait);
  const cw = ct.w;
  const svgC = `<svg width="${cw}" height="26" viewBox="0 0 ${cw} 26" aria-hidden="true" style="flex: none;">${ct.svg}</svg>`;
  return `<button type="button" style="box-sizing: border-box; width: ${w}px; height: 44px; margin: 0; padding: 0 16px; border: none; border-top: 0.75px solid ${t.filetDoux}; background: ${t.fond}; display: flex; align-items: center; gap: 10px; cursor: pointer;">${svgC}${compte != null ? `<span style="${ts({ s: 16, lh: 20, c: t.encre, extra: 'font-variant-numeric: tabular-nums lining-nums;' })}">· ${compte}</span>` : ''}<span style="flex: 1;"></span><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="${t.encre}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
export { CUIVRE, PAPIER };
