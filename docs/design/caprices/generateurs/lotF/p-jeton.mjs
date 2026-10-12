// Planche F-IV — Le jeton (SPEC § 5.1)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, LF_DEFS, NOTE, NOTE_ENCRE, cuivreRect } from './lib.mjs';
import { jeton, DENS, tw } from './comp.mjs';
import { CHEFS, buste } from './chefs.mjs';

// partie témoin (SPEC § 7.3) — siège → [pseudo, couvre-chef (index)]
const T12 = ['Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Fanny', 'Gaspard', 'Hélène', 'Inès', 'Jules', 'Tom', 'Léa'];
const T18 = [...T12, 'Malo', 'Nour', 'Octave', 'Paulette', 'Quentin', 'Rose'];

// les 17 états : [n°, nom, siège (1..18), statut, fort, e, statutD3]
const ETATS = [
  [1, 'normal', 1, 'délibère', false, {}],
  [2, 'choisi', 1, 'votre choix', true, { choisi: true }],
  [3, 'a voté', 2, 'a voté', false, { aVote: true }],
  [4, 'moi', 11, 'vous', false, { moi: true }],
  [5, 'mort', 3, null, false, { mort: { camp: 'village', mot: 'Villageois·e' } }],
  [6, 'gracié', 9, null, false, { gracie: { camp: 'village', mot: 'l’Idiot du village' } }],
  [7, 'hors vote', 12, 'ne vote pas', false, { horsVote: true }],
  [8, 'marqué +2', 2, 'délibère', false, { marque: true }],
  [9, 'capitaine', 5, 'capitaine', false, { capitaine: true }],
  [10, 'amoureux · sous le pouce', 5, null, false, { amoureux: true }],
  [11, 'absent', 7, 'absent·e · 23 s', false, { absent: true }, 'absent·e'],
  [12, 'reconnexion', 11, 'reconnexion…', false, { moi: true, reconnexion: true }],
  [13, 'désigné-votant', 4, 'votera', false, { votera: true }],
  [14, 'rôle connu · sous le pouce', 2, null, false, { badge: { sym: 'loup', camp: 'meute' } }],
  [15, 'non choisissable', 8, null, false, { nonChoisi: true }],
  [16, 'interdit (« hier »)', 6, 'hier', false, { interdit: true }],
  [17, 'annoté', 6, null, false, { annote: { txt: 'B·J' } }, null, { annote: { compte: 2 } }],
];

function etats() {
  let s = '';
  ETATS.forEach(([num, nom, siege, statut, fort, e, sD3, eD3], i) => {
    const col = i % 7, row = Math.floor(i / 7);
    const x = col * 194, y = row * 132;
    const p = T18[siege - 1];
    s += jeton({ x, y, d: 'D1', chef: siege - 1, nom: p, statut, statutFort: fort, e });
    s += jeton({ x: x + 118, y, d: 'D3', chef: siege - 1, nom: p, statut: sD3 ?? statut, statutFort: fort, e: eD3 ?? e });
    s += `<text x="${x + 118}" y="${y + 104}" ${st({ s: 13, w: 700, extra: 'font-variant-numeric="tabular-nums"' })}>${num}</text>`;
    const mots = nom.split(' '); let a = '', b = '';
    for (const m of mots) { if (!b && tw(a + ' ' + m, 12) < 64) a = (a ? a + ' ' : '') + m; else b = (b ? b + ' ' : '') + m; }
    s += `<text x="${x + 134}" y="${y + 104}" ${st({ s: 12, c: C.del })}>${esc(a)}</text>`;
    if (b) s += `<text x="${x + 118}" y="${y + 120}" ${st({ s: 12, c: C.del })}>${esc(b)}</text>`;
  });
  // le sous-ensemble nocturne, en cuivre, sur la fin de la troisième rangée
  const NUIT = [1, 2, 4, 5, 6, 9, 10, 11, 12, 14, 15, 16, 17];
  const nx = 3 * 194 + 12, ny = 2 * 132 - 4, nw = 13 * 70 + 16;
  s += cuivreRect(nx, ny, nw, 132);
  NUIT.forEach((num, i) => {
    const [, nom, siege, statut, , e, sD3, eD3] = ETATS[num - 1];
    const ee = { ...(eD3 ?? e) };
    let stt = sD3 ?? statut;
    if (num === 1 || num === 17) stt = null; // la nuit, pas de statut « délibère »
    if (num === 2) stt = 'votre choix';
    s += jeton({ x: nx + 8 + i * 70, y: ny + 22, d: 'D3', t: CUIVRE, chef: siege - 1, nom: T18[siege - 1], statut: stt, statutFort: num === 2, e: ee });
    s += `<text x="${nx + 8 + i * 70 + 34}" y="${ny + 16}" ${st({ s: 12, w: 700, c: C.ver, anchor: 'middle' })}>${num}</text>`;
  });
  return `<svg width="1520" height="392" viewBox="0 0 1520 392" role="img" aria-label="Les dix-sept états du jeton, en D1 et en D3, puis le sous-ensemble nocturne">${s}</svg>`;
}

function combinaisons() {
  const L = [
    ['capitaine + a voté + moi', 5, 'capitaine', { capitaine: true, aVote: true, moi: true }, 'vu par Étienne'],
    ['mort + rôle public (meute)', 10, null, { mort: { camp: 'meute', mot: 'Loup-garou' } }],
    ['gracié + capitaine', 9, null, { gracie: { camp: 'village', mot: 'l’Idiot du village' }, capitaine: true }],
    ['marqué + a voté', 2, 'a voté', { marque: true, aVote: true }],
    ['hors vote + capitaine', 5, 'ne vote pas', { horsVote: true, capitaine: true }],
    ['absent + capitaine', 5, 'absent·e · 23 s', { absent: true, capitaine: true }],
    ['choisi + marqué', 2, 'votre choix', { choisi: true, marque: true }, null, true],
    ['annoté + non choisissable', 15, null, { annote: { txt: 'B·J' }, nonChoisi: true }, 'nuit, vue de la meute'],
    ['amoureux sous le pouce + moi', 1, 'vous', { amoureux: true, moi: true }, 'vu par Anna'],
  ];
  let s = '';
  L.forEach(([lab, siege, statut, e, note, fort], i) => {
    const x = i * 122;
    const nuit = i === 7;
    if (nuit) s += cuivreRect(x - 3, 0, 120, 128);
    s += jeton({ x: x + 0, y: 2, d: 'D1', t: nuit ? CUIVRE : PAPIER, chef: siege - 1, nom: T18[siege - 1], statut, statutFort: fort, e });
    const mots = lab.split(' '); let a = '', b = '';
    for (const m of mots) { if (!b && tw(a + ' ' + m, 12) < 112) a = (a ? a + ' ' : '') + m; else b = (b ? b + ' ' : '') + m; }
    s += `<text x="${x}" y="140" ${st({ s: 12, w: 600 })}>${esc(a)}</text>${b ? `<text x="${x}" y="153" ${st({ s: 12, w: 600 })}>${esc(b)}</text>` : ''}`;
    if (note) s += `<text x="${x}" y="${b ? 166 : 153}" ${st({ s: 12, c: C.del })}>${esc(note)}</text>`;
  });
  return `<svg width="1100" height="168" viewBox="0 0 1100 168" role="img" aria-label="Les neuf combinaisons de référence">${s}</svg>`;
}

function emplacements() {
  let s = jeton({ x: 0, y: 0, d: 'G', chef: 4, nom: 'Étienne', statut: 'capitaine', e: { moi: true, aVote: true, marque: true, amoureux: true, capitaine: true, votera: true } });
  const cx = 75, cy = 22 + 48, m = 96;
  const reperes = [['NE', cx + 0.35 * m, cy - 0.35 * m, 'sceau, pastille de meute, compte'], ['NO', cx - 0.40 * m, cy - 0.36 * m, 'cartouche « +2 » du Corbeau'], ['O', cx - 0.52 * m, cy, 'lacs (sous le pouce)'], ['SO', cx - 0.35 * m, cy + 0.35 * m, 'glyphe d’état ou badge Ø 20'], ['S', cx, cy + 0.42 * m, 'brassard « ×2 »'], ['cadre', cx + 55, cy + 50, 'carré m + 14, double : « moi »']];
  reperes.forEach(([nom, x, y, txt], i) => {
    const ly = 12 + i * 22;
    s += `<path d="M${n(x)} ${n(y)} L${n(170)} ${ly - 4} H180" fill="none" stroke="${C.b900}" stroke-width=".5" stroke-dasharray="1.5 2"/><circle cx="${n(x)}" cy="${n(y)}" r="1.5" fill="${C.b900}"/>`;
    s += `<text x="184" y="${ly}" ${st({ s: 12, w: 700 })}>${nom}</text><text x="226" y="${ly}" ${st({ s: 12, c: C.del })}>${esc(txt)}</text>`;
  });
  return `<svg width="420" height="176" viewBox="0 0 420 176" role="img" aria-label="Les emplacements des signes autour du médaillon">${s}</svg>`;
}

function chefs() {
  let s = '';
  CHEFS.forEach((nom, i) => {
    const x = i * 84;
    // médaillon 72 (D1, sans nom) et 40 (D4), puis l'ombre chinoise à 40
    s += jeton({ x: x + 42 - 57, y: -9, d: 'D1', chef: i, nom: '' });
    s += jeton({ x: x - 6, y: 76, d: 'D4', chef: i, nom: '' });
    s += `<g transform="translate(${x + 42} 81)"><svg width="40" height="40" viewBox="0 0 48 48" overflow="hidden">${buste(i, { k: C.b900, p: C.b900, suf: 'e', mode: 'ombre' })}</svg></g>`;
    s += `<text x="${x + 2}" y="138" ${st({ s: 12, w: 700, extra: 'font-variant-numeric="tabular-nums"' })}>${i + 1}</text>`;
    const mots = nom.split(' '); let a = '', b = '';
    for (const m of mots) { if (!b && tw(a + ' ' + m, 12) < 62) a = (a ? a + ' ' : '') + m; else b = (b ? b + ' ' : '') + m; }
    s += `<text x="${x + 18}" y="138" ${st({ s: 12, c: C.b900 })}>${esc(a)}</text>${b ? `<text x="${x + 2}" y="152" ${st({ s: 12, c: C.b900 })}>${esc(b)}</text>` : ''}`;
  });
  return `<svg width="1520" height="156" viewBox="0 0 1520 156" role="img" aria-label="Les dix-huit couvre-chefs à 72 et 40 pixels, et leur ombre chinoise">${s}</svg>`;
}

/* ---- Les 4 densités en grille réelle ---- */
function grille(d, joueurs, cols, ecart, rangEcart, etatsDe, titre, sous) {
  const D = DENS[d];
  const W = cols * D.w + (cols - 1) * ecart;
  const rows = Math.ceil(joueurs.length / cols);
  const H = rows * D.h + (rows - 1) * rangEcart;
  let s = `<rect x="0" y="0" width="374" height="${H}" fill="${C.ver}"/><rect x="8" y="0" width="358" height="${H}" fill="none" stroke="${C.p2}" stroke-width=".5" stroke-dasharray="2 3"/>`;
  joueurs.forEach((p, i) => {
    const [statut, e, fort] = etatsDe(p, i);
    s += jeton({ x: 8 + (i % cols) * (D.w + ecart), y: Math.floor(i / cols) * (D.h + rangEcart), d, chef: T18.indexOf(p), nom: p, statut, statutFort: fort, e });
  });
  return `<div style="display: flex; flex-direction: column; gap: 4px;"><div style="display: flex; justify-content: space-between; width: 366px;"><span style="${ts({ s: 13, lh: 16, w: 600 })}">${titre}</span><span style="${ts({ s: 12, lh: 16, c: C.del })}">${sous}</span></div><svg width="374" height="${H}" viewBox="0 0 374 ${H}" style="overflow: visible;" role="img" aria-label="${esc(titre)}">${s}</svg></div>`;
}
const jour12 = (p) => {
  switch (p) {
    case 'Anna': return ['votre choix', { choisi: true }, true];
    case 'Clément': return [null, { mort: { camp: 'village', mot: 'Villageois·e' } }];
    case 'Jules': return [null, { mort: { camp: 'meute', mot: 'Loup-garou' } }];
    case 'Étienne': return ['a voté', { capitaine: true, aVote: true }];
    case 'Tom': return ['vous', { moi: true }];
    case 'Bastien': case 'Delphine': case 'Gaspard': case 'Hélène': return ['a voté', { aVote: true }];
    default: return ['délibère', {}];
  }
};
const jour18 = (p) => {
  if (p === 'Bastien') return ['a voté', { marque: true, aVote: true }];
  if (p === 'Paulette') return ['absent·e', { absent: true }];
  if (p === 'Rose') return ['vous', { moi: true }];
  if (p === 'Tom') return ['délibère', {}];
  return jour12(p);
};

export function build() {
  const g6 = grille('D1', ['Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Tom'], 3, 8, 8, jour12, 'D1 · 6 joueurs · vous = Tom', 'm 72 · hauteur 256');
  const g12 = grille('D2', T12, 4, 6, 8, jour12, 'D2 · 12 joueurs · vous = Tom', 'm 60 · hauteur 328');
  const g18 = grille('D3', T18, 5, 4.5, 4, jour18, 'D3 · 18 joueurs · vous = Rose', 'm 48 · hauteur 364');
  const g18b = grille('D4', T18, 5, 4.5, 4, jour18, 'D4 · 18 joueurs · fil ouvert', 'm 40 · hauteur 316');
  const body = [
    entete({ num: 'F·IV', titre: 'Le jeton', legende: 'Tout le village est en costume.', refs: 'SPEC § 5.1', vous: 'partie témoin VRGL, Jour II' }),
    section({ x: 40, y: 140, w: 1520, h: 430, lettre: 'A', titre: 'Les dix-sept états, en D1 et en D3, papier', note: 'à droite de la dernière rangée : le sous-ensemble nocturne, en cuivre (13 états)', contenu: etats() }),
    section({ x: 40, y: 568, w: 1100, h: 198, lettre: 'B', titre: 'Les neuf combinaisons de référence', note: 'priorité du mot : absent > reconnexion > votre choix > ne vote plus > ne vote pas > votera > a voté > capitaine > vous > délibère', contenu: combinaisons() }),
    section({ x: 1160, y: 568, w: 400, h: 198, lettre: 'C', titre: 'Les emplacements', note: 'repère : centre, diamètre m', contenu: emplacements() }),
    section({ x: 40, y: 770, w: 1520, h: 188, lettre: 'D', titre: 'Les dix-huit couvre-chefs', note: 'à 72 et 40, puis l’ombre chinoise à 40 : deux à deux, aucune silhouette ne se répète · attribués par siège, jamais par rôle', contenu: chefs() }),
    section({ x: 40, y: 960, w: 1520, h: 412, lettre: 'E', titre: 'Les quatre densités, en grille réelle', note: 'zone de place 399 px utiles · aucun défilement pour voter, de 6 à 18', contenu: `<div style="display: flex; gap: 0; justify-content: space-between; width: 1520px;">${g6}${g12}${g18}${g18b}</div>` }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Le jeton', defs: LF_DEFS, body, seed: 41 });
}
