// Le jeton de joueur (§ 5.1) : anatomie, densités, 17 états, priorité du mot de statut.
import { esc, abs, st, glyphe, cartouche, larg, SERIF } from './base.mjs';
import { buste, nomCouvreChef } from './hats.mjs';

// cellule W × H ; médaillon m centré en (W/2, cy) ; nom et statut sous le médaillon
export const DENS = {
  D1: { W: 114, H: 124, m: 72, cy: 43, nf: 15, nlh: 20, ntop: 88, sf: 12, slh: 16 },
  D2: { W: 85, H: 104, m: 60, cy: 36, nf: 15, nlh: 18, ntop: 72, sf: 12, slh: 14 },
  D3: { W: 68, H: 88, m: 48, cy: 28, nf: 14, nlh: 16, ntop: 57, sf: 12, slh: 15 },
  D4: { W: 68, H: 76, m: 40, cy: 24, nf: 13, nlh: 16, ntop: 48, sf: 12, slh: 12, cartH: 16 },
  C72: { W: 112, H: 128, m: 72, cy: 44, nf: 16, nlh: 20, ntop: 90, sf: 13, slh: 16 },
  C56: { W: 96, H: 108, m: 56, cy: 34, nf: 16, nlh: 20, ntop: 72, sf: 13, slh: 16 },
};

let uid = 0;

/** Mot de statut unique (§ 5.1.4, priorité) */
export function statutDe(e, jourVote) {
  if (e.mort) return null;
  if (e.absent) return `absent·e · ${e.absent}`;
  if (e.reconnexion) return 'reconnexion…';
  if (e.choisi) return 'votre choix';
  if (e.gracie) return 'ne vote plus';
  if (e.horsVote) return 'ne vote pas';
  if (e.votera) return 'votera';
  if (e.vote) return 'a voté';
  if (e.capitaine) return 'capitaine';
  if (e.moi) return 'vous';
  if (e.interdit) return 'hier';
  return jourVote ? 'délibère' : null;
}

function phrase(j, statut) {
  const e = j.e, p = [`${j.nom}, siège ${j.siege}, ${nomCouvreChef(j.siege)}`];
  if (e.moi) p.push('vous');
  if (e.mort) p.push(`mort·e${e.role ? `, ${e.role.txt}` : ', carte cachée'}`);
  if (e.capitaine) p.push('capitaine, voix double');
  if (e.marque) p.push('marqué·e par le Corbeau : deux voix de plus');
  if (e.gracie) p.push(`gracié·e, ${e.role ? e.role.txt : ''}`);
  if (statut && !p.includes(statut)) p.push(statut);
  if (e.nonChoisissable) p.push('ne peut pas être choisi·e');
  return p.join(', ');
}

/** j = { siege, nom, e: { moi, choisi, vote, mort, role:{type,txt,camp}, gracie, horsVote, votera, marque, capitaine, absent, reconnexion, nonChoisissable } } */
export function jeton(j, D, T, x, y, { interactif = true, jourVote = true } = {}) {
  const e = j.e, { W, m, cy } = D, cx = W / 2, r = m / 2, rd = (m - 8) / 2, id = `clj${++uid}`;
  const statut = statutDe(e, jourVote);
  let s = '';
  // (cadre) moi : la planche du joueur, double filet carré
  if (e.moi) {
    const S = m + 14;
    s += `<rect x="${cx - S / 2 + 0.75}" y="${cy - S / 2 + 0.75}" width="${S - 1.5}" height="${S - 1.5}" fill="none" stroke="${T.encre}" stroke-width="1.5"></rect>`;
    s += `<rect x="${cx - S / 2 + 3.5}" y="${cy - S / 2 + 3.5}" width="${S - 7}" height="${S - 7}" fill="none" stroke="${T.encre}" stroke-width="0.75"></rect>`;
  }
  // (2) anneau
  let aCol = T.encre, aL = 1.5, aDash = '';
  if (e.choisi) aL = 3.5;
  if (e.nonChoisissable) { aCol = T.filetDoux; aL = 1; }
  if (e.mort) { aCol = T.mortTrait; aL = 1; }
  if (e.reconnexion) aDash = ' stroke-dasharray="4 2"';
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${e.mort ? 'none' : T.surface}" stroke="${aCol}" stroke-width="${aL}"${aDash}></circle>`;
  // (3) disque intérieur
  let dFill = `url(#hach-1-${T.h})`, dStroke = T.encre, dL = 0.75;
  if (e.absent) dFill = `url(#hach-x-${T.h})`;
  else if (e.horsVote) dFill = 'url(#hach-barre-e)';
  if (e.nonChoisissable) { dFill = T.surface; dStroke = T.filetDoux; }
  if (e.mort) { dFill = 'none'; dStroke = T.silhouette; dL = 0.6; }
  s += `<circle cx="${cx}" cy="${cy}" r="${rd}" fill="${dFill}" stroke="${dStroke}" stroke-width="${dL}"></circle>`;
  // (4) buste, coupé par le disque ; absent : la chaise vide
  if (e.absent) {
    s += `<circle cx="${cx}" cy="${cy}" r="${Math.max(9, 0.22 * m)}" fill="${T.surface}" stroke="${T.encre}" stroke-width="0.75"></circle>`;
    s += glyphe('chaise', cx, cy, Math.max(14, 0.36 * m), T);
  } else {
    const bs = 0.75 * m, sc = bs / 48;
    s += `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${rd - 0.4}"></circle></clipPath></defs>`;
    s += `<g clip-path="url(#${id})"><g transform="translate(${(cx - bs / 2).toFixed(2)} ${(cy - bs / 2 + 0.06 * m).toFixed(2)}) scale(${sc.toFixed(4)})">${buste(j.siege, e.mort ? 'mort' : 'vif', T)}</g></g>`;
  }
  // bandeau S : brassard « ×2 »
  if (e.capitaine) {
    const bw = 0.8 * m, yb = cy + rd + 1, yt = yb - 14;
    const tc = e.mort ? T.mortTrait : T.encre;
    s += `<path d="M${cx - bw / 2} ${yt} H${cx + bw / 2} L${cx + bw / 2 - 6} ${yb} H${cx - bw / 2 + 6} Z" fill="${tc}" stroke="${T.surface}" stroke-width="1"></path>`;
    s += `<text x="${cx}" y="${yt + 11}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="700" fill="${T.surEncre}">×2</text>`;
  }
  // NE : sceau « a voté »
  if (e.vote && !e.mort) {
    const d = Math.max(16, 0.28 * m), nx = cx + 0.35 * m, ny = cy - 0.35 * m;
    s += `<circle cx="${nx}" cy="${ny}" r="${d / 2 + 1.5}" fill="${T.surface}"></circle>` + glyphe('sceau', nx, ny, d, T);
  }
  // NO : cartouche « +2 » du Corbeau
  if (e.marque) {
    const mw = m <= 40 ? 22 : 26, mh = m <= 40 ? 16 : 18, nx = cx - 0.40 * m, ny = cy - 0.36 * m;
    s += `<rect x="${nx - mw / 2}" y="${ny - mh / 2}" width="${mw}" height="${mh}" fill="${T.encre}" stroke="${T.surface}" stroke-width="1.5"></rect>`;
    s += glyphe('plume', nx - mw / 2 + 6.5, ny, 10, T, T.surEncre);
    s += `<text x="${nx + 4.5}" y="${ny + 4.2}" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="700" fill="${T.surEncre}" style="font-variant-numeric: tabular-nums">+2</text>`;
  }
  // SO : glyphe (gracié, hors vote, votera)
  const so = e.gracie ? 'corde' : e.horsVote ? 'horsvote' : e.votera ? 'index' : null;
  if (so) {
    const nx = cx - 0.35 * m, ny = cy + 0.35 * m;
    s += `<circle cx="${nx}" cy="${ny}" r="10" fill="${T.surface}" stroke="${T.filet}" stroke-width="0.75"></circle>` + glyphe(so, nx, ny, 15, T);
  }
  // repères de visée (choisi)
  if (e.choisi) {
    const a = r + 3.75, b = r + 9.75;
    s += `<path d="M${cx} ${cy - a} V${cy - b} M${cx} ${cy + a} V${cy + b} M${cx - a} ${cy} H${cx - b} M${cx + a} ${cy} H${cx + b}" stroke="${T.encre}" stroke-width="2.4"></path>`;
  }
  const svg = `<svg width="${W}" height="${cy * 2}" viewBox="0 0 ${W} ${cy * 2}" aria-hidden="true" style="position: absolute; left: 0; top: 0; overflow: visible;">${s}</svg>`;

  // (6) nom et (7) statut — ou cartouche du rôle (mort, gracié)
  const ntop = e.mort && !e.moi ? cy + r + 1 : D.ntop;
  const nameStyle = st({ position: 'absolute', left: -4, top: ntop, width: W + 8, height: D.nlh, fontSize: D.nf, lineHeight: `${D.nlh}px`,
    fontWeight: e.mort ? 400 : e.moi ? 700 : 600, color: e.mort ? T.mortTexte : T.encre, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    textDecoration: e.mort ? 'line-through' : e.choisi ? 'underline' : undefined, textDecorationThickness: e.choisi ? '1.5px' : e.mort ? '1px' : undefined, textUnderlineOffset: e.choisi ? '3px' : undefined });
  let bas = `<span style="${nameStyle}">${esc(j.nom)}</span>`;
  let yb = ntop + D.nlh;
  if (statut) {
    bas += `<span style="${st({ position: 'absolute', left: -8, top: yb, width: W + 16, height: D.slh, fontSize: D.sf, lineHeight: `${D.slh}px`, textAlign: 'center', whiteSpace: 'nowrap', color: e.choisi ? T.encre : T.encre2, fontWeight: e.choisi ? 600 : 400, fontVariantNumeric: 'tabular-nums' })}">${esc(statut)}</span>`;
    yb += D.slh;
  }
  if ((e.mort || e.gracie) && e.role !== undefined) {
    const hC = D.cartH || 20;
    let ro = e.role || { type: 'ovale', txt: 'Carte cachée' };
    let c = cartouche(ro.type, ro.txt, T, { h: hC });
    if (c.W > W + 16 && ro.camp) c = cartouche(ro.type, ro.camp, T, { h: hC });
    bas += `<span style="${abs((W - c.W) / 2, yb, c.W, hC, { display: 'block' })}">${c.svg}</span>`;
  }
  const label = esc(phrase(j, statut));
  const box = abs(x, y, W, D.H, { background: 'none', border: '0', padding: '0', margin: '0', font: 'inherit', color: 'inherit', display: 'block', cursor: interactif ? 'pointer' : 'default' });
  if (interactif && !e.mort && !e.nonChoisissable)
    return `<button type="button" aria-label="${label}"${e.choisi ? ' aria-pressed="true"' : ' aria-pressed="false"'} style="${box}">${svg}${bas}</button>`;
  return `<div role="img" aria-label="${label}" style="${box}">${svg}${bas}</div>`;
}

/** Grille mobile de la place, centrée verticalement dans la zone utile. */
export function grille(joueurs, Dn, T, zoneTop, zoneH, opts = {}) {
  const D = DENS[Dn];
  const cols = { D1: 3, D2: 4, D3: 5, D4: 5 }[Dn];
  const gx = { D1: 8, D2: 6, D3: 4, D4: 4 }[Dn], gy = { D1: 8, D2: 8, D3: 4, D4: 4 }[Dn];
  const rows = Math.ceil(joueurs.length / cols);
  const gw = cols * D.W + (cols - 1) * gx, gh = rows * D.H + (rows - 1) * gy;
  const x0 = Math.round((390 - gw) / 2), y0 = zoneTop + Math.round((zoneH - gh) / 2) + (opts.decalage || 0);
  return joueurs.map((j, i) => jeton(j, D, T, x0 + (i % cols) * (D.W + gx), y0 + Math.floor(i / cols) * (D.H + gy), opts)).join('\n');
}
