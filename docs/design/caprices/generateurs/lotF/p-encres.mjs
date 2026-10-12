// Planche F-I — Les encres (SPEC § 3.1-3.5)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, T, cuivreRect, palierRect, LF_DEFS, NOTE } from './lib.mjs';
import { cartouche, tw } from './comp.mjs';

const PRIM = [
  ['bistre-900', C.b900, 'l’encre · nuit pleine (IV)', 'texte du papier, fond du cuivre'],
  ['bistre-800', C.b800, 'cuivre en relief', 'surfaces de nuit : barre, feuille'],
  ['palier-3', C.p3, 'morsure III', 'aplats et bouton de nuit, décor'],
  ['palier-2', C.p2, 'morsure II', 'filets, crans vides, morts'],
  ['palier-1', C.p1, 'morsure I', 'texte secondaire de nuit'],
  ['delave', C.del, 'encre délavée', 'texte secondaire du jour, narrateur'],
  ['teinte', C.tei, 'teinte de planche', 'creux du jour, cuvette'],
  ['verge', C.ver, 'papier vergé', 'fond du jour, texte de nuit'],
  ['bruni', C.bru, 'blanc bruni', 'surfaces du jour'],
  ['sanguine', C.san, 'sanguine d’encre', 'la meute, sur papier — rien d’autre'],
  ['craie', C.cra, 'sanguine de craie', 'la meute, sur cuivre — rien d’autre'],
  ['garance-encre', C.gE, 'laque de garance', 'le serment, sur papier'],
  ['garance-craie', C.gC, 'garance pâle', 'le serment, sur cuivre'],
  ['rousseur', C.rou, 'rousseur', 'décor du papier seul, 4 à 8 %'],
  ['vert-bataillon', C.vb, 'vert du Bataillon', 'Shiganshina, en hachure seule'],
];

function primitifs() {
  const W = 136, H = 112;
  let s = '';
  PRIM.forEach(([nom, hex, atelier, emploi], i) => {
    const x = (i % 5) * (W + 10), y = Math.floor(i / 5) * (H + 10);
    let chip;
    if (nom === 'rousseur') {
      chip = `<rect x="${x}" y="${y}" width="${W}" height="44" fill="${C.ver}"/><g fill="${C.rou}"><circle cx="${x + 30}" cy="${y + 16}" r="6" opacity=".08"/><circle cx="${x + 33}" cy="${y + 14}" r="2.4" opacity=".08"/><circle cx="${x + 78}" cy="${y + 30}" r="4" opacity=".06"/><circle cx="${x + 104}" cy="${y + 12}" r="2.5" opacity=".08"/></g><rect x="${x + W - 18}" y="${y + 30}" width="12" height="10" fill="${hex}"/>`;
    } else if (nom === 'vert-bataillon') {
      chip = `<rect x="${x}" y="${y}" width="${W}" height="44" fill="${C.ver}"/><rect x="${x}" y="${y}" width="${W}" height="44" fill="url(#hach-vert)"/><rect x="${x + W - 18}" y="${y + 30}" width="12" height="10" fill="${C.ver}" stroke="${hex}" stroke-width="1"/>`;
    } else {
      chip = `<rect x="${x}" y="${y}" width="${W}" height="44" fill="${hex}"/>`;
    }
    s += chip + `<rect x="${x + 0.5}" y="${y + 0.5}" width="${W - 1}" height="43" fill="none" stroke="${C.b900}" stroke-width="0.75"/>`;
    s += `<text x="${x}" y="${y + 60}" ${st({ s: 13, w: 600 })}>--cp-${esc(nom)}</text>`;
    s += `<text x="${x}" y="${y + 76}" ${st({ s: 12, c: C.b900, extra: 'font-variant-numeric="tabular-nums"' })}>${hex} · ${esc(atelier)}</text>`;
    const mots = emploi.split(' ');
    let l1 = '', l2 = '';
    for (const m of mots) { if (!l2 && tw(l1 + ' ' + m, 12) < W) l1 = (l1 ? l1 + ' ' : '') + m; else l2 = (l2 ? l2 + ' ' : '') + m; }
    s += `<text x="${x}" y="${y + 92}" ${st({ s: 12, c: C.del })}>${esc(l1)}</text>`;
    if (l2) s += `<text x="${x}" y="${y + 107}" ${st({ s: 12, c: C.del })}>${esc(l2)}</text>`;
  });
  return `<svg width="720" height="356" viewBox="0 0 720 356" role="img" aria-label="Les quinze encres primitives">${s}</svg>`;
}

const SEM = [
  ['--fond', 'verge', C.ver, 'bistre-900', C.b900, 'le support, plein écran'],
  ['--fond-planche', 'teinte', C.tei, 'bistre-900 + grain IV', C.b900, 'intérieur d’une cuvette'],
  ['--surface', 'bruni', C.bru, 'bistre-800', C.b800, 'barre, cartouche, feuille, avis'],
  ['--creux', 'teinte', C.tei, 'creux-nuit #0F0C09', C.creux, 'champ de saisie'],
  ['--encre', 'bistre-900', C.b900, 'verge', C.ver, 'texte, trait du village'],
  ['--encre-2', 'delave', C.del, 'palier-1', C.p1, 'texte secondaire, statut'],
  ['--encre-narrateur', 'delave', C.del, 'palier-1', C.p1, 'légende du graveur'],
  ['--filet', 'bistre-900', C.b900, 'palier-2', C.p2, 'bordure porteuse (≥ 3:1)'],
  ['--filet-doux', 'palier-2', C.p2, 'palier-3', C.p3, 'séparateur décoratif'],
  ['--trame', 'bistre-900', C.b900, 'verge', C.ver, 'hachures (motifs -e / -v)'],
  ['--sur-encre', 'bruni', C.bru, 'bistre-900', C.b900, 'texte sur aplat d’encre'],
  ['--camp-village', 'bistre-900', C.b900, 'verge', C.ver, 'le village est l’encre'],
  ['--camp-meute', 'sanguine', C.san, 'craie', C.cra, 'trait et mot de la meute'],
  ['--camp-serment', 'garance-encre', C.gE, 'garance-craie', C.gC, 'trait et mot du serment'],
  ['--canal-audela', 'delave', C.del, 'palier-1', C.p1, 'canal des morts'],
  ['--etat-mort-trait', 'palier-2', C.p2, 'palier-2', C.p2, 'contour d’un jeton mort'],
  ['--etat-mort-texte', 'delave', C.del, 'palier-1', C.p1, 'nom d’un mort'],
  ['--etat-focus', 'bistre-900', C.b900, 'verge', C.ver, 'anneau de focus clavier'],
  ['--action-fond', 'bistre-900', C.b900, 'palier-3', C.p3, 'bouton primaire'],
  ['--action-texte', 'bruni', C.bru, 'verge', C.ver, 'texte du bouton primaire'],
  ['--action-bord', 'bistre-900', C.b900, 'palier-1', C.p1, 'bord du bouton primaire'],
  ['--cran-plein', 'bistre-900', C.b900, 'palier-2', C.p2, 'minuterie : crans restants'],
  ['--cran-vide', 'palier-2', C.p2, 'palier-3', C.p3, 'minuterie : crans écoulés'],
];
function semantiques() {
  const W = 355, RH = 19, H = 34 + SEM.length * RH + 30;
  const panneau = (cuivre) => {
    const k = cuivre ? C.ver : C.b900, k2 = cuivre ? C.p1 : C.del;
    let s = cuivre ? cuivreRect(0, 0, W, H) : `<rect width="${W}" height="${H}" fill="${C.ver}"/><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${C.b900}" stroke-width=".75"/>`;
    s += `<text x="12" y="24" ${st({ f: 'sc', s: 15, c: k, ls: '.06em' })}>${cuivre ? 'Tirage cuivre · data-tirage="cuivre"' : 'Tirage papier · data-tirage="papier"'}</text>`;
    SEM.forEach(([tok, pp, ph, cp, ch, role], i) => {
      const y = 34 + i * RH;
      const hex = cuivre ? ch : ph, prim = cuivre ? cp : pp;
      s += `<rect x="12" y="${y + 3}" width="30" height="13" fill="${hex}" stroke="${cuivre ? C.p2 : C.b900}" stroke-width=".75"/>`;
      s += `<text x="50" y="${y + 14}" ${st({ s: 12, w: 600, c: k })}>${esc(tok)}</text>`;
      s += `<text x="178" y="${y + 14}" ${st({ s: 12, c: k2 })}>${esc(prim)}</text>`;
    });
    s += `<text x="12" y="${H - 10}" ${st({ s: 12, c: k2 })}>--canal-village · -meute · -serment = --camp-* (alias)</text>`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sémantiques du tirage ${cuivre ? 'cuivre' : 'papier'}">${s}</svg>`;
  };
  return `<div style="display: flex; gap: 10px;">${panneau(false)}${panneau(true)}</div>`;
}

/* ---- C. Les paires du § 3.4 ---- */
function paires() {
  const CW = 196, LW = 150, RH = 32;
  const papierFonds = [['vergé', C.ver], ['bruni', C.bru], ['teinte', C.tei]];
  const cuivreFonds = [['bistre-900', C.b900], ['bistre-800', C.b800], ['palier-3', C.p3]];
  // [libellé, couleur, [ratios], spécimen, taille, poids, type par cellule: 't' texte | 'n' non-texte | 'd' décor | 'x' interdit | '-' absent | 'm' maigre]
  const P = [
    ['bistre-900', C.b900, ['13,95', '16,13', '12,93'], 'Tout texte, 12 px', 12, 400, 'ttt'],
    ['délavé', C.del, ['5,51', '6,38', '5,11'], 'secondaire ≥ 12 px', 12, 400, 'ttt'],
    ['sanguine', C.san, ['4,97', '5,75', '4,61'], 'La meute · 14 px', 14, 600, 'ttt'],
    ['garance-encre', C.gE, ['5,58', '6,45', '5,17'], 'Le serment · 14 px', 14, 400, 'ttt'],
    ['palier-2', C.p2, ['3,66', '4,23', '3,39'], '', 0, 0, 'nnn'],
    ['palier-1', C.p1, ['2,01', '—', '—'], '', 0, 0, 'd--'],
    ['rousseur', C.rou, ['3,73', '4,31', '—'], '', 0, 0, 'dd-'],
  ];
  const Q = [
    ['vergé', C.ver, ['13,95', '11,57', '7,35'], 'Tout texte, 12 px', 12, 400, 'ttt'],
    ['bruni', C.bru, ['16,13', '—', '8,50'], 'texte de bouton', 12, 600, 'x-t'],
    ['palier-1', C.p1, ['6,92', '5,74', '3,65'], 'secondaire ≥ 12 px', 12, 400, 'ttx'],
    ['craie', C.cra, ['5,89', '4,88', '3,10'], 'La meute · 14 px', 14, 600, 'ttx'],
    ['garance-craie', C.gC, ['7,84', '6,51', '4,13'], 'Le serment · 14 px', 14, 400, 'ttm'],
    ['palier-2', C.p2, ['3,81', '3,16', '2,01'], '', 0, 0, 'nnd'],
    ['palier-3', C.p3, ['1,90', '—', '—'], '', 0, 0, 'd--'],
    ['sanguine', C.san, ['2,80', '—', '—'], 'La meute', 14, 600, 'x--'],
  ];
  const table = (rows, fonds, cuivre, titre) => {
    let s = `<text x="0" y="15" ${st({ f: 'sc', s: 14, c: C.b900, ls: '.06em' })}>${titre}</text>`;
    fonds.forEach(([nom], j) => { s += `<text x="${LW + j * CW + 8}" y="15" ${st({ s: 12, c: C.del })}>sur ${nom}</text>`; });
    rows.forEach(([lib, col, ratios, spec, taille, poids, types], i) => {
      const y = 24 + i * RH;
      s += `<rect x="0" y="${y + 9}" width="12" height="12" fill="${col}" stroke="${C.b900}" stroke-width=".75"/>`;
      s += `<text x="20" y="${y + 20}" ${st({ s: 13, w: 600 })}>${esc(lib)}</text>`;
      fonds.forEach(([nom, fond], j) => {
        const x = LW + j * CW, ty = types[j];
        const lisible = cuivre ? (fond === C.p3 ? C.ver : C.p1) : C.del;
        if (ty === '-') { s += `<rect x="${x}" y="${y + 2}" width="${CW - 8}" height="${RH - 4}" fill="none" stroke="${C.p2}" stroke-width=".5" stroke-dasharray="2 3"/><text x="${x + 8}" y="${y + 21}" ${st({ s: 12, c: C.del })}>non mesuré — interdit</text>`; return; }
        s += `<rect x="${x}" y="${y + 2}" width="${CW - 8}" height="${RH - 4}" fill="${fond}"/>`;
        if (cuivre) s += `<rect x="${x}" y="${y + 2}" width="${CW - 8}" height="${RH - 4}" fill="none" stroke="${C.b900}" stroke-width=".5"/>`;
        else s += `<rect x="${x + .25}" y="${y + 2.25}" width="${CW - 8.5}" height="${RH - 4.5}" fill="none" stroke="${C.b900}" stroke-width=".5" stroke-opacity=".5"/>`;
        const r = ratios[j];
        const grasse = ty === 't';
        if (ty === 't' || ty === 'x' || ty === 'm') {
          const special = lib === 'bruni' && cuivre && j === 2;
          if (special) {
            s += `<rect x="${x + 8}" y="${y + 7}" width="104" height="18" fill="${C.p3}" stroke="${C.p1}" stroke-width="1"/><text x="${x + 60}" y="${y + 20}" ${st({ s: 12, w: 600, c: C.bru, anchor: 'middle' })}>Dévorer Fanny</text>`;
          } else {
            s += `<text x="${x + 8}" y="${y + 21}" ${st({ s: taille, w: poids, c: col })}>${esc(spec)}</text>`;
          }
          if (ty === 'x') s += `<path d="M${x + 6} ${y + 24} L${x + 6 + tw(spec, taille, poids) + 6} ${y + 9}" stroke="${lisible}" stroke-width="1.5"/>`;
        } else if (ty === 'n') {
          s += `<path d="M${x + 8} ${y + 16} H${x + 70}" stroke="${col}" stroke-width="1.5"/>`;
          for (let c = 0; c < 6; c++) s += `<rect x="${x + 80 + c * 8 + .5}" y="${y + 11.5}" width="4" height="9" fill="none" stroke="${col}" stroke-width="1"/>`;
        } else if (ty === 'd') {
          s += `<rect x="${x + 8}" y="${y + 8}" width="60" height="16" fill="url(#hach-1-e)" opacity="0"/>`;
          for (let c = 0; c < 5; c++) s += `<circle cx="${x + 14 + c * 12}" cy="${y + 16 + (c % 2 ? 2 : -2)}" r="${2 + (c % 3)}" fill="${col}"/>`;
        }
        const etiquette = ty === 't' ? `${r}:1` : ty === 'x' ? `${r} · interdit` : ty === 'm' ? `${r} · sous 4,5` : ty === 'n' ? `${r} · non-texte` : `${r} · décor`;
        s += `<text x="${x + CW - 14}" y="${y + 21}" ${st({ s: 12, w: grasse ? 700 : 400, c: lisible, anchor: 'end', extra: 'font-variant-numeric="tabular-nums"' })}>${esc(etiquette)}</text>`;
      });
    });
    return s;
  };
  const hP = 24 + P.length * RH;
  let s = table(P, papierFonds, false, 'Tirage papier');
  // aplats pleins (papier)
  const y0 = hP + 6;
  const aplats = [['bruni sur bistre-900', C.b900, C.bru, 'Voter contre Anna', '16,13 · bouton primaire'], ['bruni sur sanguine', C.san, C.bru, 'Seul', '5,75 · cartouche « Seul »'], ['bruni sur garance', C.gE, C.bru, 'Le serment', '6,45']];
  aplats.forEach(([lib, f, c, mot, r], j) => {
    const x = j * 240;
    s += `<rect x="${x}" y="${y0}" width="120" height="24" fill="${f}"/><text x="${x + 60}" y="${y0 + 17}" ${st({ s: 14, w: 600, c, anchor: 'middle' })}>${esc(mot)}</text>`;
    s += `<text x="${x + 128}" y="${y0 + 11}" ${st({ s: 12, c: C.b900 })}>${esc(lib)}</text><text x="${x + 128}" y="${y0 + 25}" ${st({ s: 12, w: 700, c: C.b900 })}>${esc(r)}</text>`;
  });
  const yC = y0 + 44;
  s += `<g transform="translate(0 ${yC})">${table(Q, cuivreFonds, true, 'Tirage cuivre')}</g>`;
  const H = yC + 24 + Q.length * RH + 4;
  return `<svg width="760" height="${H}" viewBox="0 0 760 ${H}" role="img" aria-label="Chaque paire de contraste du paragraphe 3.4, composée à sa taille plancher">${s}</svg>`;
}

/* ---- D. Daltonisme ---- */
function daltonisme() {
  const sim = { san: '#716520', gE: '#5B5B5A', del: '#5B574A' };
  const rangee = (y, cs, titre) => {
    let s = `<text x="0" y="${y + 20}" ${st({ s: 13, w: 600 })}>${titre}</text>`;
    const tm = { ...PAPIER, meute: cs.san, serment: cs.gE, encre2: cs.del, audela: cs.del };
    s += cartouche(170, y, 'meute', 'Loup-garou', tm, 30).svg;
    s += cartouche(310, y, 'serment', 'Le serment', tm, 30).svg;
    s += `<text x="450" y="${y + 21}" ${st({ f: 'fell', s: 18, it: true, c: cs.del })}>« Nul ne se connaît. »</text>`;
    [cs.san, cs.gE, cs.del].forEach((c, i) => { s += `<rect x="${630 + i * 30}" y="${y + 4}" width="22" height="22" fill="${c}"/>`; });
    return s;
  };
  let s = rangee(0, { san: C.san, gE: C.gE, del: C.del }, 'Vision ordinaire');
  s += rangee(44, sim, 'Deutéranopie simulée');
  s += `<text x="630" y="98" ${st({ s: 12, c: C.del })}>sanguine · garance · délavé</text>`;
  return `<svg width="720" height="104" viewBox="0 0 720 104" role="img" aria-label="Simulation daltonienne : la forme du cartouche porte le camp">${s}</svg>`;
}

/* ---- E. Filmstrips ---- */
function filmstrip() {
  const FW = 136, FH = 60, G = 10;
  const cadre = (x, y, p) => p === 'V' ? `<rect x="${x}" y="${y}" width="${FW}" height="${FH}" fill="${C.ver}"/><rect x="${x}" y="${y}" width="${FW}" height="${FH}" fill="#000" filter="url(#papier)" opacity=".22"/><rect x="${x + .5}" y="${y + .5}" width="${FW - 1}" height="${FH - 1}" fill="none" stroke="${C.b900}" stroke-width=".75"/>` : palierRect(p, x, y, FW, FH);
  const lab = { V: 'vergé', I: 'palier I', II: 'palier II', III: 'palier III', IV: 'palier IV' };
  const leg = { V: 'le jour', I: 'le village s’endort', II: 'la meute chasse', III: 'les veilleurs', IV: 'nuit pleine' };
  const bande = (y, suite, temps) => {
    let s = '';
    suite.forEach((p, i) => {
      const x = i * (FW + G);
      s += cadre(x, y, p);
      // le crieur d'une ligne : texte encre sur papier/I/II, vergé sur III/IV — posé sur cartouche plein
      const nuit = p === 'III' || p === 'IV';
      s += `<rect x="${x + 8}" y="${y + FH - 26}" width="${FW - 16}" height="18" fill="${nuit ? C.b800 : C.bru}"/>`;
      s += `<text x="${x + 14}" y="${y + FH - 13}" ${st({ s: 12, c: nuit ? C.ver : C.b900 })}>${esc(lab[p])}</text>`;
      s += `<text x="${x}" y="${y + FH + 15}" ${st({ s: 12, c: C.del, extra: 'font-variant-numeric="tabular-nums"' })}>${temps[i]} · ${esc(leg[p])}</text>`;
      if (i < suite.length - 1) s += `<path d="M${x + FW + 2} ${y + FH / 2} h6 m-3 -3 l3 3 l-3 3" fill="none" stroke="${C.b900}" stroke-width="1"/>`;
    });
    return s;
  };
  let s = `<text x="0" y="13" ${st({ f: 'sc', s: 14, ls: '.06em' })}>La morsure · --m-morsure 320 ms steps(4, end)</text>`;
  s += bande(22, ['V', 'I', 'II', 'III', 'IV'], ['0 ms', '80 ms', '160 ms', '240 ms', '320 ms']);
  s += `<text x="0" y="${22 + FH + 44}" ${st({ f: 'sc', s: 14, ls: '.06em' })}>L’aube · --m-aube 320 ms steps(4, end)</text>`;
  s += bande(22 + FH + 54, ['IV', 'III', 'II', 'I', 'V'], ['0 ms', '80 ms', '160 ms', '240 ms', '320 ms']);
  const H = 22 + FH + 54 + FH + 20;
  return `<svg width="760" height="${H}" viewBox="0 0 760 ${H}" role="img" aria-label="La morsure et l’aube, image par image">${s}</svg>`;
}

/* ---- F. N3 : plafond de clarté ---- */
function ecranNuit(x, y, variante) {
  // écran 390 × 844 réduit à 0,3 (117 × 253) : silhouettes de zones, pas de texte lisible à cette échelle
  const k = 0.3;
  const R = (yy, h, fill, extra = '') => `<rect x="${x}" y="${n(y + yy * k)}" width="117" height="${n(h * k)}" fill="${fill}" ${extra}/>`;
  let s = cuivreRect(x, y, 117, 253);
  s += R(47, 56, C.b900);
  // toits
  s += `<path d="M${x} ${n(y + 103 * k)} l8 -3 l6 2 l9 -4 l7 3 v-5 l3 -2 l3 2 v5 l10 -3 l9 3 l12 -4 l10 3 l8 -2 l12 3 l10 -2 l10 3 V${n(y + 103 * k)} Z" fill="${C.p3}"/>`;
  // minuterie
  for (let i = 0; i < 24; i++) s += `<rect x="${n(x + 6 + i * 2.4)}" y="${n(y + 110 * k)}" width="1.5" height="3" fill="${i < 14 ? C.p2 : 'none'}" stroke="${C.p3}" stroke-width=".3"/>`;
  // crieur + consigne : lignes de texte vergé (petites barres)
  [[135, 90], [150, 70], [190, 100], [205, 96], [220, 60]].forEach(([yy, w]) => { s += `<rect x="${n(x + 5)}" y="${n(y + yy * k)}" width="${n(w * k * 1.1)}" height="1.6" fill="${C.ver}" opacity=".8"/>`; });
  // place : 12 jetons D2
  for (let i = 0; i < 12; i++) {
    const cx = x + 5 + (i % 4) * 85 * k + 12.75, cy = y + (263 + Math.floor(i / 4) * 110 + 38) * k;
    let ring = C.ver, fill = C.b800;
    if (variante === 'phare' && i === 5) { s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="26" fill="${C.bru}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="26" fill="none" stroke="${C.san}" stroke-width="1"/>`; continue; }
    if (variante === 'juste' && i === 5) fill = C.p3;
    s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="9" fill="${fill}" stroke="${ring}" stroke-width=".5"/>`;
    if (variante === 'juste' && i === 5) s += `<rect x="${n(cx - 8)}" y="${n(cy + 11)}" width="16" height="5" fill="${C.b800}" stroke="${C.cra}" stroke-width=".5"/>`;
  }
  // pli + barre
  s += R(694, 44, C.b900) + R(738, 72, C.b800);
  s += `<rect x="${x + 5}" y="${n(y + 750 * k)}" width="107" height="${n(48 * k)}" fill="${C.p3}" stroke="${C.p1}" stroke-width=".4"/>`;
  return s;
}
function plafond() {
  let s = '';
  s += ecranNuit(0, 0, 'dort');
  s += ecranNuit(131, 0, 'juste');
  s += ecranNuit(262, 0, 'phare');
  s += `<path d="M258 -2 L383 255 M383 -2 L258 255" stroke="${C.b900}" stroke-width="1.5" opacity="0"/>`;
  s += `<path d="M262 258 L379 258" stroke="${C.b900}" stroke-width="1.5"/>`;
  const lab = [['Anna dort', 'légende du dormeur'], ['Tom lit son carnet', 'bruni au palier III'], ['refusé', 'un phare à trois mètres']];
  lab.forEach(([a, b], i) => {
    s += `<text x="${i * 131}" y="272" ${st({ s: 13, w: 600, c: i === 2 ? C.b900 : C.b900 })}>${esc(a)}</text><text x="${i * 131}" y="287" ${st({ s: 12, c: C.del })}>${esc(b)}</text>`;
  });
  // croix gravée sur le contre-exemple
  s += `<path d="M266 6 L375 247 M375 6 L266 247" stroke="${C.ver}" stroke-width="1.5"/>`;
  // la jauge 48 × 48
  s += `<g transform="translate(408 8)"><rect x="0" y="0" width="48" height="48" fill="${C.p3}"/><rect x=".5" y=".5" width="47" height="47" fill="none" stroke="${C.b900}" stroke-width="1"/>
    <path d="M0 56 H48 M0 52 V60 M48 52 V60 M56 0 V48 M52 0 H60 M52 48 H60" stroke="${C.b900}" stroke-width="1"/>
    <text x="24" y="74" ${st({ s: 12, c: C.b900, anchor: 'middle' })}>48 px</text></g>`;
  return `<svg width="480" height="292" viewBox="0 0 480 292" role="img" aria-label="Loi N3 : aucune surface plus claire que le palier III au-delà de 48 par 48 pixels">${s}</svg>`;
}

export function build() {
  const body = [
    entete({ num: 'F·I', titre: 'Les encres', legende: 'Une seule couleur : celle qui mord.', refs: 'SPEC § 3.1-3.5' }),
    section({ x: 40, y: 140, w: 720, h: 400, lettre: 'A', titre: 'Les primitifs', note: 'jamais employés dans un composant', contenu: primitifs() }),
    section({ x: 40, y: 556, w: 720, h: 530, lettre: 'B', titre: 'Les sémantiques, deux tirages côte à côte', note: 'seul niveau surchargé par un skin', contenu: semantiques() }),
    section({ x: 40, y: 1104, w: 720, h: 270, lettre: 'D', titre: 'Bande daltonienne', note: 'Machado 2009, sévérité 1', contenu: daltonisme() +
      `<p style="margin: 12px 0 0; width: 700px; ${NOTE}">Pour un deutéranope, la sanguine vire à l’olive <b style="font-weight: 600; color: ${C.b900};">#716520</b>, la garance au gris <b style="font-weight: 600; color: ${C.b900};">#5B5B5A</b>, l’encre délavée à <b style="font-weight: 600; color: ${C.b900};">#5B574A</b> : garance et délavé se confondent. Le serment ne se dit donc jamais par la couleur seule — les lacs (bout rond, double filet) et le mot le portent ; la meute garde son bord mordu. Sanguine et garance restent séparées : olive contre gris.</p>
      <p style="margin: 10px 0 0; width: 700px; ${NOTE}">Règle de lecture des deux tables ci-contre : un ratio en gras est verrouillé par <span style="font-style: italic;">contraste.test.ts</span> ; toute paire absente est interdite pour du texte.</p>` }),
    section({ x: 800, y: 140, w: 760, h: 650, lettre: 'C', titre: 'Chaque paire, à sa taille plancher', note: 'WCAG 2.x, luminance relative', contenu: paires() }),
    section({ x: 800, y: 768, w: 760, h: 240, lettre: 'E', titre: 'Filmstrip : la morsure et l’aube', note: 'au même instant pour tous les sièges', contenu: filmstrip() }),
    section({ x: 800, y: 1030, w: 760, h: 330, lettre: 'F', titre: 'N3 — le plafond de clarté', note: 'écrans 390 × 844 à 30 %', contenu: `<div style="display: flex; gap: 20px;">${plafond()}<div style="width: 250px; display: flex; flex-direction: column; gap: 8px;">
        <p style="margin: 0; ${NOTE_N()}">La nuit, aucune surface plus claire que le palier III <b style="font-weight: 600; color: ${C.b900};">#4A433B</b> ne dépasse 48 × 48 px, sauf le texte lui-même.</p>
        <p style="margin: 0; ${NOTE_N()}">Le carnet de la Voyante se brunit jusqu’au palier III, jamais jusqu’au papier : son jeton reste la même tache que celle du dormeur.</p>
        <p style="margin: 0; ${NOTE_N()}">Le disque clair cerclé de sanguine de l’ancienne Pl. VI est un phare : refusé (critique n° 7).</p>
        <p style="margin: 0; ${NOTE_N()}">Seule exception : la phase <i>revelation</i>, où tous les sièges font le même geste au même instant.</p></div></div>` }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les encres', defs: LF_DEFS, body, seed: 11 });
}
const NOTE_N = () => NOTE;
