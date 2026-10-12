// Planche F-III — Les matières (SPEC § 4)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, T, LF_DEFS, NOTE, NOTE_ENCRE, cuvette, cuivreRect, palierRect, PALIERS, id } from './lib.mjs';
import { symg, glg } from './traces.mjs';
import { jeton, cartouche, toits, minuterie, tw } from './comp.mjs';

/** Le générateur du § 4.3, à l'identique. */
function hachuresCourbes(cx, cy, r, pas = 4.5, debut = 80, fin = 200) {
  const rad = (a) => (a * Math.PI) / 180;
  let d = '';
  for (let k = r - 2, i = 0; k > r * 0.45; k -= pas, i++) {
    const a0 = rad(debut + i * 6), a1 = rad(fin - i * 9);
    const p = (a) => `${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`;
    d += `M${p(a0)} A${k.toFixed(1)} ${k.toFixed(1)} 0 0 1 ${p(a1)} `;
  }
  return d;
}

function paliers() {
  const L = [['I', 'le village s’endort', 'aqua-I · k 5,6', 'morsure 1 ; voile du jour'], ['II', 'la meute chasse', 'aqua-II · k 5,2', 'morsure 2'], ['III', 'les veilleurs', 'aqua-III · k 5,4', 'morsure 3 ; surfaces brunies de nuit'], ['IV', 'nuit pleine', 'aqua-IV · k 5,0', 'fond du cuivre, dos, voile de nuit']];
  let s = '';
  L.forEach(([p, nom, filtre, emploi], i) => {
    const x = i * 182;
    s += palierRect(p, x, 0, 170, 112);
    const [a, o] = PALIERS[p];
    const clair = p === 'III' || p === 'IV';
    s += `<rect x="${x + 8}" y="8" width="44" height="30" fill="${clair ? C.b800 : C.bru}"/><text x="${x + 30}" y="31" ${st({ f: 'fell', s: 24, c: clair ? C.ver : C.b900, anchor: 'middle' })}>${p}</text>`;
    s += `<text x="${x}" y="130" ${st({ s: 13, w: 600 })}>« ${esc(nom)} »</text>`;
    s += `<text x="${x}" y="146" ${st({ s: 12, c: C.b900, extra: 'font-variant-numeric="tabular-nums"' })}>${a} · ${esc(filtre)} · ${String(o).replace('.', ',')}</text>`;
    s += `<text x="${x}" y="162" ${st({ s: 12, c: C.del })}>${esc(emploi)}</text>`;
  });
  return `<svg width="720" height="168" viewBox="0 0 720 168" role="img" aria-label="Les quatre paliers d’aquatinte">${s}</svg>
  <p style="margin: 8px 0 0; width: 720px; ${NOTE}">Un palier = un aplat + un grain de résine : grain sombre sur les paliers clairs, grain clair sur les sombres. Sur mobile, jamais de <i>feTurbulence</i> en direct : les quatre grains sont cuits en tuiles PNG 512² (affichées à 256 CSS px), aplat compris, ≤ 120 Ko pour toutes les matières.</p>`;
}

function hachures() {
  const L = [['hach-1', 'pas 6 · 0,6 · 45°', 'médaillon, ombre légère', 'hach-1-e', 'hach-1-v'], ['hach-2', 'pas 4 · 0,8 · 45°', 'volumes, bustes', 'hach-2-e', 'hach-2-v'], ['hach-3', 'pas 2,6 · 1,1 · 45°', 'ombre profonde, appuyé', 'hach-3-e', 'hach-3-v'], ['hach-x', 'pas 4 · 0,7 · 30°+120°', 'urgence, absent', 'hach-x-e', 'hach-x-v'], ['hach-h', 'pas 3 · 0,6 · 0°', 'ciel de la frise', 'hach-h-e', null], ['hach-barre', 'pas 3 · 0,9 · 0°', 'médaillon hors vote', 'hach-barre-e', 'lf-barre-v']];
  let s = '';
  L.forEach(([nom, spec, emploi, e, v], i) => {
    const x = i * 122;
    s += `<rect x="${x}" y="0" width="112" height="52" fill="${C.ver}"/><rect x="${x}" y="0" width="112" height="52" fill="url(#${e})"/><rect x="${x + .5}" y=".5" width="111" height="51" fill="none" stroke="${C.b900}" stroke-width=".75"/>`;
    if (v) s += cuivreRect(x, 56, 112, 52, false) + `<rect x="${x}" y="56" width="112" height="52" fill="url(#${v})"/>`;
    else s += `<rect x="${x + .5}" y="56.5" width="111" height="51" fill="none" stroke="${C.p2}" stroke-width=".75" stroke-dasharray="2 3"/><text x="${x + 56}" y="86" ${st({ s: 12, c: C.del, anchor: 'middle' })}>jour seulement</text>`;
    s += `<text x="${x}" y="126" ${st({ s: 13, w: 600 })}>${nom}-e / -v</text><text x="${x}" y="142" ${st({ s: 12 })}>${esc(spec)}</text><text x="${x}" y="158" ${st({ s: 12, c: C.del })}>${esc(emploi)}</text>`;
  });
  // règle : aucune trame sous un mot
  s += `<g transform="translate(0 172)"><rect width="300" height="40" fill="url(#hach-1-e)"/><rect x="40" y="9" width="150" height="22" fill="${C.bru}"/><text x="48" y="25" ${st({ s: 14 })}>Le registre · Nuit II</text><text x="196" y="25" ${st({ s: 13, w: 700 })}>oui</text>
    <rect x="360" width="300" height="40" fill="url(#hach-1-e)"/><text x="400" y="25" ${st({ s: 14 })}>Le registre · Nuit II</text><path d="M396 30 L540 12" stroke="${C.b900}" stroke-width="1.5"/><text x="556" y="25" ${st({ s: 13, w: 700 })}>refusé</text></g>`;
  return `<svg width="720" height="214" viewBox="0 0 720 214" role="img" aria-label="Hachures droites et croisées, encre et vergé">${s}</svg>
  <p style="margin: 6px 0 0; ${NOTE_ENCRE}">Règle absolue : aucune hachure sous un mot. Un texte posé sur une zone hachurée l’est sur un cartouche plein.</p>`;
}

function courbes() {
  let s = '';
  // médaillon : volume rond, ombre en bas-gauche (lumière haut-droite)
  s += `<circle cx="80" cy="80" r="64" fill="${C.bru}" stroke="${C.b900}" stroke-width="1.5"/>`;
  s += `<path d="${hachuresCourbes(80, 80, 64)}" fill="none" stroke="${C.b900}" stroke-width="0.7" stroke-linecap="round"/>`;
  // fiole
  s += `<g transform="translate(176 22)"><path d="M28 0 H44 M30 0 V30 A30 30 0 1 0 42 30 V0" fill="${C.bru}" stroke="${C.b900}" stroke-width="1.5"/><path d="${hachuresCourbes(36, 58, 30, 4)}" fill="none" stroke="${C.b900}" stroke-width="0.7" stroke-linecap="round"/></g>`;
  s += `<text x="0" y="168" ${st({ s: 12, c: C.del })}>hachuresCourbes(cx, cy, r, pas 4,5, 80°, 200°) — arcs qui raccourcissent</text>`;
  return `<svg width="290" height="174" viewBox="0 0 290 174" role="img" aria-label="Hachures courbes du côté de l’ombre">${s}</svg>`;
}

function cuvettes() {
  let s = `<rect x="0" y="0" width="300" height="196" fill="${C.ver}"/>` + cuvette(12, 12, 276, 172, 'papier');
  s += `<text x="150" y="104" ${st({ f: 'fell', s: 20, it: true, c: C.del, anchor: 'middle' })}>« Nul ne se connaît. »</text>`;
  s += `<text x="150" y="214" ${st({ s: 12, c: C.del, anchor: 'middle' })}>papier : teinte, arête bistre 38 %, reflet bruni, contre-arête à 2 px</text>`;
  s += `<g transform="translate(320 0)">${cuivreRect(0, 0, 300, 196)}${cuvette(12, 12, 276, 172, 'cuivre')}<text x="150" y="96" ${st({ f: 'fell', s: 20, it: true, c: C.p1, anchor: 'middle' })}>« Le sommeil de la raison</text><text x="150" y="122" ${st({ f: 'fell', s: 20, it: true, c: C.p1, anchor: 'middle' })}>engendre des loups. »</text>
    <text x="150" y="214" ${st({ s: 12, c: C.del, anchor: 'middle' })}>cuivre : aquatinte IV, arête palier-3, contre-arête bistre-800</text></g>`;
  return `<svg width="620" height="220" viewBox="0 0 620 220" role="img" aria-label="La cuvette, jour et nuit">${s}</svg>
  <p style="margin: 4px 0 0; ${NOTE}">Rayon 2 px (la plaque est ébavurée), seule exception géométrique avec le médaillon et les lacs. Marges : 12 (carte grande), 6 (petite), 24 (planche plein écran).</p>`;
}

function papier() {
  let s = `<rect width="210" height="196" fill="${C.ver}"/><rect width="210" height="196" fill="url(#verge)"/><rect width="210" height="196" fill="#000" filter="url(#papier)" opacity=".22"/>`;
  s += `<g fill="${C.rou}"><circle cx="44" cy="52" r="6" opacity=".07"/><circle cx="46" cy="50" r="2.2" opacity=".08"/><circle cx="150" cy="120" r="4" opacity=".06"/><circle cx="92" cy="168" r="8" opacity=".045"/><circle cx="178" cy="34" r="2.5" opacity=".08"/></g>`;
  s += `<rect x=".5" y=".5" width="209" height="195" fill="none" stroke="${C.b900}" stroke-width=".75"/>`;
  // loupe ×4
  s += `<g transform="translate(226 0)"><rect width="196" height="196" fill="${C.ver}"/>`;
  for (let y = 2; y < 196; y += 12) s += `<path d="M0 ${y} H196" stroke="${C.b900}" stroke-opacity=".14" stroke-width="2.4"/>`;
  s += `<path d="M58 0 V196 M218 0 V196" stroke="${C.b900}" stroke-opacity=".2" stroke-width="4"/><circle cx="120" cy="110" r="24" fill="${C.rou}" opacity=".08"/><circle cx="128" cy="104" r="9" fill="${C.rou}" opacity=".1"/><rect x=".5" y=".5" width="195" height="195" fill="none" stroke="${C.b900}" stroke-width=".75"/></g>`;
  s += `<text x="0" y="214" ${st({ s: 12, c: C.del })}>à l’échelle</text><text x="226" y="214" ${st({ s: 12, c: C.del })}>loupe × 4 : vergeures 1/3 px, pontuseaux 1/40 px</text>`;
  return `<svg width="430" height="220" viewBox="0 0 430 220" role="img" aria-label="Papier vergé et rousseurs ocre">${s}</svg>
  <p style="margin: 4px 0 0; ${NOTE}">Rousseurs ocre <b style="font-weight: 600; color: ${C.b900};">#8C6A3F</b>, 5 à 8 par tuile de 512, Ø 2 à 9 px, 4 à 8 % — jamais de sanguine, jamais sur le cuivre. Sous un texte, la luminance locale ne baisse pas de plus de 4 %.</p>`;
}

function mordu() {
  let s = '';
  s += `<rect width="150" height="150" fill="${C.bru}"/><g filter="url(#mordu)">${symg('loup', 11, 11, 128, C.san)}</g><rect x=".5" y=".5" width="149" height="149" fill="none" stroke="${C.b900}" stroke-width=".75"/>`;
  s += `<text x="0" y="168" ${st({ s: 13, w: 600 })}>≥ 96 px : filtre mordu</text><text x="0" y="184" ${st({ s: 12, c: C.del })}>turbulence 0,09 · déplacement 2,6</text>`;
  s += `<g transform="translate(170 0)"><rect width="150" height="150" fill="${C.bru}"/>${symg('loup', 11, 11, 128, C.san)}<rect x=".5" y=".5" width="149" height="149" fill="none" stroke="${C.b900}" stroke-width=".75"/>
    <text x="0" y="168" ${st({ s: 13, w: 600 })}>32 px agrandi × 4</text><text x="0" y="184" ${st({ s: 12, c: C.del })}>la morsure est dans le tracé</text></g>`;
  s += `<g transform="translate(340 0)">${symg('loup', 0, 0, 32, C.san)}${symg('loup', 44, 8, 24, C.san)}${symg('loup', 78, 16, 16, C.san, true)}
    <text x="0" y="52" ${st({ s: 12, c: C.del })}>32 · 24 · 16</text>
    ${cartouche(0, 70, 'meute', 'Loup-garou', PAPIER, 30).svg}
    <text x="0" y="124" ${st({ s: 12, c: C.del })}>c’est le cartouche</text><text x="0" y="140" ${st({ s: 12, c: C.del })}>qui mord, pas le mot :</text><text x="0" y="156" ${st({ s: 12, c: C.del })}>aucun filtre sur un texte</text><text x="0" y="172" ${st({ s: 12, c: C.del })}>de moins de 24 px.</text></g>`;
  return `<svg width="490" height="190" viewBox="0 0 490 190" role="img" aria-label="Trait mordu filtré contre trait mordu dessiné">${s}</svg>`;
}

function mort() {
  let s = '';
  const etapes = [[{}, 'vivant', 'délibère'], [{ cran: 1 }, 'cran 1 · 160 ms', 'la hachure s’en va'], [{ cran: 2 }, 'cran 2 · 320 ms', 'anneau palier-2, buste au contour'], [{ mort: { camp: 'village', mot: 'Villageois·e' } }, 'cran 3 · 480 ms', 'buste palier-1, nom barré']];
  etapes.forEach(([e, t1, t2], i) => {
    const x = i * 124;
    s += jeton({ x, y: 0, d: 'D1', chef: 2, nom: 'Clément', statut: i === 0 ? 'délibère' : undefined, e });
    s += `<text x="${x + 4}" y="142" ${st({ s: 13, w: 600 })}>${esc(t1)}</text>`;
    const mots = t2.split(' '); let a = '', b = '';
    for (const m of mots) { if (!b && tw(a + ' ' + m, 12) < 112) a = (a ? a + ' ' : '') + m; else b = (b ? b + ' ' : '') + m; }
    s += `<text x="${x + 4}" y="158" ${st({ s: 12, c: C.del })}>${esc(a)}</text>${b ? `<text x="${x + 4}" y="174" ${st({ s: 12, c: C.del })}>${esc(b)}</text>` : ''}`;
    if (i < 3) s += `<path d="M${x + 114} 44 h8 m-3 -3 l3 3 l-3 3" fill="none" stroke="${C.b900}" stroke-width="1"/>`;
  });
  return `<svg width="496" height="180" viewBox="0 0 496 180" role="img" aria-label="Mourir : bruni jusqu’au blanc en trois crans">${s}</svg>`;
}

function couts() {
  const L = [['Hachures', 'motif SVG ou dégradé à bords francs', 'oui', 'oui'], ['Grain d’aquatinte', 'feTurbulence en direct', 'interdit', '≤ 200², statique'], ['Grain d’aquatinte', 'tuile PNG cuite 512²', 'obligatoire', 'oui'], ['Papier vergé', 'gradients durs + 2 tuiles', 'oui', 'oui'], ['Trait mordu', 'feDisplacementMap', 'interdit', '≥ 96, statique'], ['Trait mordu', 'dessiné dans le tracé', 'oui', 'oui'], ['Brunissage', 'mask radial à bord franc', 'oui', 'oui'], ['Mort brunie', '3 changements d’attributs', 'oui', 'oui']];
  return `<div style="display: grid; grid-template-columns: 130px 190px 80px 90px; ${ts({ s: 12, lh: 16 })}">
    ${['Matière', 'Technique', 'Mobile', 'Desktop'].map((h) => `<span style="color: ${C.del}; border-bottom: 0.75px solid ${C.b900}; padding: 2px 0;">${h}</span>`).join('')}
    ${L.map((r) => r.map((c, j) => `<span style="padding: 2px 0; border-bottom: 0.75px solid ${C.p2}; ${j >= 2 && (c === 'interdit') ? 'font-weight: 700;' : ''}">${esc(c)}</span>`).join('')).join('')}
  </div><p style="margin: 8px 0 0; ${NOTE}">Interdits partout : dégradé décoratif, flou, lueur, ombre portée, bruit animé.</p>`;
}

/* ---- Brunissage en 6 images ---- */
function dos(x, y, w, h) {
  // dos unique : aquatinte IV, cuvette de cuivre, ovale bruni au palier III, le dormeur affalé au trait vergé
  const cx = x + w / 2, cy = y + h / 2, rx = w * 0.3, ry = h * 0.28;
  return `${cuivreRect(x, y, w, h)}<rect x="${x + 3.5}" y="${y + 3.5}" width="${w - 7}" height="${h - 7}" fill="none" stroke="${C.p3}" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.p3}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx - 3}" ry="${ry - 3}" fill="none" stroke="${C.p2}" stroke-width=".75"/>
    <g fill="none" stroke="${C.ver}" stroke-width=".9" stroke-linecap="round"><path d="M${cx - 18} ${cy + 12} H${cx + 18}"/><path d="M${cx - 14} ${cy + 12} C${cx - 14} ${cy + 4} ${cx - 6} ${cy + 2} ${cx + 2} ${cy + 4} C${cx + 8} ${cy + 5} ${cx + 12} ${cy + 8} ${cx + 12} ${cy + 12}"/><path d="M${cx - 8} ${cy + 3} C${cx - 9} ${cy - 4} ${cx - 2} ${cy - 7} ${cx + 3} ${cy - 3} C${cx + 6} ${cy} ${cx + 4} ${cy + 3} ${cx + 2} ${cy + 4}"/><path d="M${cx - 16} ${cy + 12} V${cy + 20} M${cx + 16} ${cy + 12} V${cy + 20}"/></g>`;
}
function face(x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.ver}"/>` + cuvette(x + 6, y + 6, w - 12, h - 12, 'papier');
  s += `<rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="58" fill="url(#hach-1-e)"/><rect x="${x + w / 2 - 22}" y="${y + 17}" width="44" height="48" fill="${C.tei}"/>`;
  s += symg('voyante', x + w / 2 - 20, y + 21, 40, C.b900);
  s += `<text x="${x + w / 2}" y="${y + 92}" ${st({ f: 'fell', s: 16, anchor: 'middle' })}>la Voyante</text>`;
  s += cartouche(x + w / 2 - 33, y + 102, 'village', 'Village', PAPIER, 20, 66).svg;
  return s;
}
function brunissage() {
  const W = 96, H = 134;
  const etats = [[0, 'R1 · armement', '0-600 ms, 12 crans'], [8, 'R2 · cran 1', 'r = 8 px'], [24, 'R2 · cran 3', 'r = 24 px'], [48, 'R2 · cran 6', 'r = 48 px'], [72, 'R2 · cran 9', 'r = 72 px'], [999, 'R3 · lue', 'le périmètre décompte 8 s']];
  let s = '';
  etats.forEach(([r, t1, t2], i) => {
    const x = i * 112;
    s += face(x, 0, W, H);
    if (r < 999) {
      const mid = id('br');
      s += `<mask id="${mid}"><rect x="${x}" y="0" width="${W}" height="${H}" fill="#fff"/>${r ? `<circle cx="${x + W / 2}" cy="${H / 2}" r="${r}" fill="#000"/>` : ''}</mask><g mask="url(#${mid})">${dos(x, 0, W, H)}</g>`;
    }
    if (i === 0) s += `<path d="M${x + 1} ${H - 1} V1 H${x + W - 1} V${H * 0.42}" fill="none" stroke="${C.ver}" stroke-width="1.5"/>`;
    if (i === 5) s += `<path d="M${x + 1} ${H - 1} V1 H${x + W - 1} V${H - 1} H${x + W * 0.42}" fill="none" stroke="${C.b900}" stroke-width="1.5"/>`;
    s += `<text x="${x}" y="${H + 18}" ${st({ s: 13, w: 600 })}>${esc(t1)}</text><text x="${x}" y="${H + 34}" ${st({ s: 12, c: C.del })}>${esc(t2)}</text>`;
  });
  // R4 : réencrée
  s += `<g transform="translate(${6 * 112 + 8} 0)">${dos(0, 0, W, H)}<text x="0" y="${H + 18}" ${st({ s: 13, w: 600 })}>R4 · réencrée</text><text x="0" y="${H + 34}" ${st({ s: 12, c: C.del })}>relâcher : en une image</text></g>`;
  // nuit : le carnet, plafonné au palier III
  const nx = 7 * 112 + 40;
  s += `<g transform="translate(${nx} 0)">`;
  const nuitEtats = [['avant', 0], ['brunir', 22], ['lu, palier III', 99]];
  nuitEtats.forEach(([lab, r], i) => {
    const x = i * 120;
    s += cuivreRect(x, 0, 108, H);
    if (r) {
      const mid = id('bn');
      const disc = Math.min(r, 48);
      s += `<mask id="${mid}"><rect x="${x}" y="0" width="108" height="${H}" fill="#000"/><circle cx="${x + 54}" cy="44" r="${r >= 99 ? 30 : disc}" fill="#fff"/></mask><rect x="${x}" y="0" width="108" height="${H}" fill="${C.p3}" mask="url(#${mid})"/>`;
    }
    s += jeton({ x: x + 11, y: 0, d: 'D2', t: { ...CUIVRE, surface: r ? C.p3 : CUIVRE.surface }, chef: 1, nom: 'Bastien', e: r >= 99 ? { mort: false } : {} });
    if (r >= 99) s += cartouche(x + 14, 108, 'meute', 'Loup-garou', CUIVRE, 20, 80).svg;
    s += `<text x="${x}" y="${H + 18}" ${st({ s: 13, w: 600 })}>${esc(lab)}</text>`;
  });
  s += `<text x="0" y="${H + 34}" ${st({ s: 12, c: C.del })}>la nuit, on ne gratte que jusqu’au palier III (N3)</text></g>`;
  return `<svg width="1520" height="${H + 40}" viewBox="0 0 1520 ${H + 40}" role="img" aria-label="Le brunissage en six images, et sa version de nuit">${s}</svg>`;
}

/* ---- L'aube en 4 paliers, sur le haut d'écran ---- */
function aube() {
  const k = 0.55, W = 390 * k, H = 183 * k;
  const etapes = [['IV', 'nuit pleine · 0 ms'], ['III', '80 ms'], ['II', '160 ms'], ['I', '240 ms'], ['papier', 'papier · 320 ms']];
  let s = '';
  etapes.forEach(([p, lab], i) => {
    const x = i * (W + 18);
    const nuit = p === 'IV' || p === 'III';
    const t = nuit ? CUIVRE : PAPIER;
    s += `<g transform="translate(${n(x)} 0) scale(${k})">`;
    if (p === 'papier') s += `<rect width="390" height="183" fill="${C.ver}"/><rect width="390" height="103" fill="url(#hach-h-e)" opacity=".28"/>`;
    else s += palierRect(p, 0, 0, 390, 183);
    s += toits(390, 103, nuit ? CUIVRE : { ...PAPIER, surface: p === 'papier' ? C.bru : PALIERS[p][0] }, 7);
    s += `<rect x="16" y="53" width="44" height="44" fill="${t.surface}" stroke="${t.filetDoux}"/><rect x="68" y="53" width="96" height="44" fill="${t.surface}" stroke="${t.filetDoux}"/><text x="80" y="82" ${st({ f: 'sc', s: 20, c: t.encre })}>Aube II</text>`;
    s += minuterie(16, 106, 'absente', t);
    s += `<rect x="0" y="130" width="390" height="53" fill="${p === 'papier' ? C.ver : PALIERS[p][0]}"/><rect x="12" y="136" width="366" height="40" fill="${t.surface}"/>`;
    s += `<text x="20" y="161" ${st({ s: 16, c: t.encre })}>Le jour se lève sur Thiercelieux.</text></g>`;
    s += `<text x="${n(x)}" y="${n(H + 18)}" ${st({ s: 13, w: 600 })}>${p === 'papier' ? 'papier' : 'palier ' + p}</text><text x="${n(x)}" y="${n(H + 34)}" ${st({ s: 12, c: C.del })}>${esc(lab)}</text>`;
  });
  return `<svg width="1260" height="${n(H + 40)}" viewBox="0 0 1260 ${n(H + 40)}" role="img" aria-label="L’aube en quatre paliers">${s}</svg>`;
}

export function build() {
  const body = [
    entete({ num: 'F·III', titre: 'Les matières', legende: 'Une technique réelle, jamais un effet.', refs: 'SPEC § 4 · textures.svg' }),
    section({ x: 40, y: 140, w: 720, h: 250, lettre: 'A', titre: 'Les quatre paliers d’aquatinte', note: '§ 4.1', contenu: paliers() }),
    section({ x: 800, y: 140, w: 760, h: 280, lettre: 'B', titre: 'Hachures droites et croisées', note: '§ 4.2 · encre (-e) sur papier, vergé (-v) sur cuivre', contenu: hachures() }),
    section({ x: 40, y: 420, w: 290, h: 220, lettre: 'C', titre: 'Hachures courbes', note: '§ 4.3', contenu: courbes() }),
    section({ x: 350, y: 420, w: 620, h: 290, lettre: 'D', titre: 'La cuvette, jour et nuit', note: '§ 4.4', contenu: cuvettes() }),
    section({ x: 1000, y: 440, w: 560, h: 290, lettre: 'E', titre: 'Papier vergé et rousseurs', note: '§ 4.5', contenu: papier() }),
    section({ x: 40, y: 740, w: 500, h: 230, lettre: 'F', titre: 'Le trait mordu : filtré contre dessiné', note: '§ 4.6', contenu: mordu() }),
    section({ x: 570, y: 740, w: 500, h: 230, lettre: 'G', titre: 'Mourir : bruni jusqu’au blanc', note: '--m-bruni-mort · 3 × 160 ms', contenu: mort() }),
    section({ x: 1100, y: 740, w: 460, h: 230, lettre: 'H', titre: 'Coûts de rendu', note: '§ 4.8', contenu: couts() }),
    section({ x: 40, y: 980, w: 1520, h: 210, lettre: 'I', titre: 'Le brunissage en six images', note: 'révélation (seule phase où l’on gratte jusqu’au papier) · puis le carnet de nuit, plafonné', contenu: brunissage() }),
    section({ x: 40, y: 1196, w: 1520, h: 170, lettre: 'J', titre: 'L’aube en quatre paliers', note: 'IV → III → II → I → papier · 80 ms chacun · la table entière s’éclaire au même instant', contenu: aube() }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les matières', defs: LF_DEFS, body, seed: 31 });
}
