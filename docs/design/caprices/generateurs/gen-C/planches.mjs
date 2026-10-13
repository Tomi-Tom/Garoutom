// Les cinq planches de documentation du lot C (1600 × 1400).
import { K, F, PAPIER, CUIVRE, page, setPfx, BG_PAPIER, grainPapier, grainCuivre, cartoucheSvg, rubrique } from './lib.mjs';
import { ROLES, R, symbole } from './roles.mjs';
import { carteGrande, carteMoyenne, cartePetite, carteVignette, carteDos, frontispice, esquisse } from './cartes.mjs';
import { VIGNETTES, vignette } from './vignettes.mjs';

const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
const corps = (txt, { size = 13, lh = 18, col = K.del, w } = {}) => `<p style="margin: 0; font-family: ${F.ss}; font-size: ${size}px; line-height: ${lh}px; color: ${col};${w ? ` width: ${w}px;` : ''}">${txt}</p>`;
const titre = (txt, size = 28) => `<h2 style="margin: 0; font-family: ${F.fell}; font-weight: 400; font-size: ${size}px; line-height: ${size + 4}px; color: ${K.b9};">${txt}</h2>`;
const leg = (txt, size = 18, lh = 24, col = K.del) => `<p style="margin: 0; font-family: ${F.fell}; font-style: italic; font-size: ${size}px; line-height: ${lh}px; color: ${col};">${txt}</p>`;

function entete(pl, rub, t1, sous, note) {
  return abs(48, 36, `${rubrique(rub)}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${K.b9};">${t1}</h1><div style="margin-top: 6px;">${leg(sous)}</div>`, 'width: 900px;')
    + abs(1100, 40, corps(note, { size: 13, lh: 18, w: 380 }))
    + abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${K.del};">${pl}</span>`, 'width: 52px; text-align: right;')
    + `<div style="position: absolute; left: 48px; top: 132px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
}
function racine(nom, titreDoc, body, seed) {
  setPfx(nom);
  return page({ title: titreDoc, w: 1600, h: 1400, bg: BG_PAPIER, body: grainPapier(1600, 1400, seed) + body });
}
const trait = (r) => (r.camp === 'meute' ? 'mordu · aquatinte' : r.camp === 'seul' ? 'mordu des deux côtés · bruni' : 'net · eau-forte');

// ============================================================ Faces-1
export function faces1() {
  let b = entete('Pl. C-I', 'Garoutom · Caprices · lot C — les cartes', 'Les faces, planches 1 à 7',
    '« Nul ne se connaît. » — la v1 se tire en planches typographiques.',
    'Carte grande 300 × 420 (SPEC § 5.2). En v1, l’image est le symbole du rôle à 128 px, gravé dans un ovale réservé sur la hachure <i>hach-1</i> (la meute : sur un grain d’aquatinte, jamais de hachure). Sous chaque carte, l’esquisse de mise en place de la planche illustrée à venir (§ 6.1, § 9).');
  const slot = (i, row) => [48 + i * 401, row === 0 ? 156 : 760];
  const ids = ['villageois', 'loup', 'voyante', 'sorciere', 'chasseur', 'cupidon', 'salvateur'];
  ids.forEach((id, k) => {
    const r = R[id];
    const [x, y] = slot(k % 4, k < 4 ? 0 : 1);
    b += abs(x, y, carteGrande(id));
    b += abs(x, y + 434, esquisse(id, 126));
    b += abs(x + 140, y + 432, `${rubrique(`N° ${r.n} · ${trait(r)}`)}<div style="margin-top: 4px;">${corps(r.motif, { w: 160 })}</div>`);
  });
  // l'anatomie
  const [ax, ay] = slot(3, 1);
  const S = 0.6, sc = (v) => v * S;
  const box = (x, y, w, h, n, dash = '3 3') => `<rect x="${sc(x)}" y="${sc(y)}" width="${sc(w)}" height="${sc(h)}" fill="none" stroke="${K.del}" stroke-width="1" stroke-dasharray="${dash}"/>` + mk(sc(x) + sc(w) - 2, sc(y) + 2, n);
  const mk = (x, y, n) => `<circle cx="${x}" cy="${y}" r="9" fill="${K.b9}"/><text x="${x}" y="${y + 4.2}" text-anchor="middle" font-family="${F.ss}" font-size="12" font-weight="700" fill="${K.bru}">${n}</text>`;
  let an = `<rect width="180" height="252" fill="${K.bru}" stroke="${K.p2}"/><rect x="${sc(12)}" y="${sc(12)}" width="${sc(276)}" height="${sc(396)}" fill="${K.tei}"/>`;
  an += mk(10, 10, 1) + box(12, 12, 276, 396, 2, '0') + box(24, 24, 252, 264, 4) + box(244, 24, 32, 24, 3, '0');
  an += `<ellipse cx="${sc(150)}" cy="${sc(154)}" rx="${sc(96)}" ry="${sc(112)}" fill="none" stroke="${K.p2}" stroke-width="0.75"/>`;
  an += box(84, 275, 132, 26, 5, '0') + box(40, 308, 220, 32, 6) + box(40, 346, 220, 42, 7);
  b += abs(ax, ay, `${rubrique('Anatomie de la carte grande')}<svg width="200" height="262" viewBox="-10 -10 200 262" style="display: block; margin-top: 10px; overflow: visible;" role="img" aria-label="Anatomie de la carte grande">${an}</svg>`);
  const lignes = [
    ['1', 'marge 12 px · papier bruni, vergeures, rousseurs ocre'],
    ['2', 'cuvette (12, 12) 276 × 396 · arête 38 %, reflet bruni ; meute : arêtes mordues'],
    ['3', 'numéro de planche · base y 40 · IM Fell 16, sur un cartel plein'],
    ['4', 'image (24, 24) 252 × 264 · symbole 128 dans un ovale réservé'],
    ['5', 'cartouche de camp · 132 × 26, centré sur y 288'],
    ['6', 'nom · base y 334 · IM Fell 28/32'],
    ['7', 'légende · y 346-388 · IM Fell italique 16/20, deux lignes'],
  ];
  b += abs(ax, ay + 296, lignes.map(([n, t]) => `<div style="display: flex; gap: 8px; margin-bottom: 6px;"><span style="font-family: ${F.ss}; font-size: 13px; font-weight: 700; color: ${K.b9}; width: 12px;">${n}</span>${corps(t, { w: 270 })}</div>`).join(''));
  return racine('cF1', 'C-Faces-1', b, 11);
}

// ============================================================ Faces-2
export function faces2() {
  let b = entete('Pl. C-II', 'Garoutom · Caprices · lot C — les cartes', 'Les faces, planches 8 à 13 ; le dos',
    '« Les loups ne se mangent pas entre eux, dit-on. »',
    'Le Loup Blanc garde le gabarit du loup, inversé : tête en réserve, cernée d’un trait mordu des deux côtés, posée dans une masse d’aquatinte ; sa cuvette est mordue à l’arête et à la contre-arête. Le dos est unique : aquatinte IV, le dormeur du Caprice 43 dans un ovale bruni au palier III, rien d’autre.');
  const slot = (i, row) => [48 + i * 401, row === 0 ? 156 : 760];
  const ids = ['idiot', 'ancien', 'corbeau', 'bouc', 'petiteFille', 'loupBlanc'];
  ids.forEach((id, k) => {
    const r = R[id];
    const [x, y] = slot(k % 4, k < 4 ? 0 : 1);
    b += abs(x, y, carteGrande(id));
    b += abs(x, y + 434, `${rubrique(`N° ${r.n} · ${trait(r)}`)}<div style="margin-top: 4px;">${corps('Planche à venir : ' + r.motif.charAt(0).toLowerCase() + r.motif.slice(1), { w: 300 })}</div>`);
  });
  // dos papier
  let [x, y] = slot(2, 1);
  b += abs(x, y, carteDos({ t: PAPIER }));
  b += abs(x, y + 434, `${rubrique('Dos · posé sur le papier')}<div style="margin-top: 4px;">${corps('Aquatinte IV pleine dans la cuvette de cuivre ; double filet palier II à 8 px du bord ; ovale 120 × 160 bruni au palier III, le dormeur au trait vergé. Ni logo, ni camp.', { w: 300 })}</div>`);
  // dos cuivre, sur sa nuit
  [x, y] = slot(3, 1);
  b += `<div style="position: absolute; left: ${x - 24}px; top: ${y - 24}px; width: 348px; height: 468px; overflow: hidden;">${grainCuivre(348, 468)}<div style="position: absolute; left: 24px; top: 24px;">${carteDos({ t: CUIVRE })}</div></div>`;
  b += abs(x, y + 458, `${rubrique('Dos · tirage cuivre')}<div style="margin-top: 4px;">${corps('La nuit, la marge passe au cuivre en relief #2A241E : la carte reste une tache sombre, au même palier pour tous les sièges.', { w: 300 })}</div>`);
  return racine('cF2', 'C-Faces-2', b, 12);
}

// ============================================================ Formats
export function formats() {
  let b = entete('Pl. C-III', 'Garoutom · Caprices · lot C — les cartes', 'Les formats, du grand au glyphe',
    '« Il fallait bien quelqu’un. » — et chacun a son format.',
    'Petite 96 × 134 (symbole 48, nom IM Fell 16, cartouche 20) · vignette 48 × 67 (symbole 32 seul) · symboles 32 et 24 (trait 2, hachure pas 3) · 16 simplifié (trait 1,5, sans hachure) · ombre chinoise à 24 : deux symboles ne partagent jamais leur silhouette.');
  // A — la matrice des rôles. La colonne suit le nombre de planches : la
  // rangée tient toute la largeur de la page, vague après vague — à seize
  // planches, la petite carte (96 px) touche sa voisine d'un poil, et le
  // nom s'étale sur deux lignes plutôt que de sortir du cadre.
  const colW = 1504 / ROLES.length;
  let grid = '';
  ROLES.forEach((r, i) => {
    const x = 48 + i * colW;
    const c = (w) => x + (colW - w) / 2;
    const sOpts = { ink: K.b9, bg: K.tei, accent: K.san, mass: K.b9 };
    const sOpts32 = { ink: K.b9, bg: K.ver, accent: K.san, mass: K.b9 };
    grid += abs(x, 150, `<div style="width: ${colW - 2}px;"><div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${K.del}; min-height: 32px;">${r.n} · ${r.nom}</div></div>`);
    grid += abs(c(96), 188, cartePetite(r.id));
    grid += abs(c(48), 336, carteVignette(r.id));
    grid += abs(c(32), 418, symbole(r.id, 32, sOpts32));
    grid += abs(c(24), 462, symbole(r.id, 24, sOpts32));
    grid += abs(c(16), 498, symbole(r.id, 16, sOpts32));
    grid += abs(c(24), 530, symbole(r.id, 24, { ink: K.b9, bg: K.ver, sil: true }));
  });
  b += grid;
  const lab = (y, t) => abs(1556, y, `<span style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${K.del}; writing-mode: vertical-rl;">${t}</span>`);
  b += lab(196, 'petite') + lab(340, 'vignette') + lab(414, '32') + lab(458, '24') + lab(494, '16') + lab(526, 'ombre');
  b += `<div style="position: absolute; left: 48px; top: 578px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;

  // B — faces en tirage cuivre
  b += `<div style="position: absolute; left: 48px; top: 600px; width: 1000px; height: 520px; overflow: hidden;">${grainCuivre(1000, 520)}
<div style="position: absolute; left: 24px; top: 18px; font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${K.p1};">Tirage cuivre — la face avant l’impression (Ma carte la nuit) : bistre-800, symbole au trait vergé, aucune clarté au-delà du palier III</div>
<div style="position: absolute; left: 24px; top: 48px; display: flex; gap: 28px;">${carteGrande('loup', { t: CUIVRE })}${carteGrande('voyante', { t: CUIVRE })}${carteGrande('villageois', { t: CUIVRE })}</div></div>`;

  // C — la carte morte, brunie en trois crans ; les cartouches en usage
  b += abs(1080, 600, `${rubrique('Carte morte — brunie en trois crans de 160 ms')}<div style="display: flex; gap: 16px; margin-top: 14px;">${['vif', 'mort1', 'mort2', 'mort3'].map((e, i) => `<div>${cartePetite('chasseur', { etat: e })}<div style="margin-top: 6px; font-family: ${F.ss}; font-size: 12px; color: ${K.del}; width: 96px;">${['vivante', '1 · la hachure s’en va', '2 · contour palier II', '3 · silhouette palier I'][i]}</div></div>`).join('')}</div>`);
  const carts = [['ecu', 'Village'], ['mordu', 'Meute'], ['mordu2', 'Seul'], ['lacs', 'Le serment'], ['audela', 'L’au-delà'], ['ovale', 'Carte cachée']];
  b += abs(1080, 846, `${rubrique('Cartouches de camp en usage — carte (26) · jeton (20)')}
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 10px; margin-top: 12px; width: 470px;">${carts.map(([k, m]) => `<div style="display: flex; flex-direction: column; gap: 6px;">${cartoucheSvg(k, 132, 26, m, PAPIER, { fs: 14 })}${cartoucheSvg(k, 100, 20, m, PAPIER, { fs: 12 })}</div>`).join('')}</div>`);
  b += `<div style="position: absolute; left: 1080px; top: 1010px; width: 472px; height: 110px; overflow: hidden;">${grainCuivre(472, 110)}<div style="position: absolute; left: 14px; top: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 444px;">${carts.map(([k, m]) => cartoucheSvg(k, 132, 26, m, CUIVRE, { fs: 14 })).join('')}</div></div>`;

  // D — la révélation R0 → R5
  b += `<div style="position: absolute; left: 48px; top: 1140px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  b += abs(48, 1152, rubrique('La révélation à l’appui long — états R0 à R5 (SPEC § 5.2), en vignettes'));
  const etats = [
    ['R0', 'dos posé', 'Gardez le pouce : retourner la carte', 'dos', 0],
    ['R1', 'armement 0-600 ms', 'L’anneau se remplit en 12 crans ; un filet court sur la cuvette.', 'arme', 0.5],
    ['R2', 'brunissage', 'Le masque s’ouvre depuis le pouce, par crans de 8 px.', 'brunit', 1],
    ['R3', 'lue, pouce posé', 'Relâchez pour cacher · 6 s', 'lue', 0.75],
    ['R4', 'réencrée', 'Relâché, onglet changé ou 8 s : le dos revient en une image.', 'dos', 0],
    ['R5', 'prête', 'Je sais qui je suis', 'pret', 0],
  ];
  etats.forEach(([n, nom, txt, mode, p], i) => {
    const x = 48 + i * 252;
    let carte;
    const W = 96, H = 134;
    const dosS = carteDos({ t: CUIVRE, W, H });
    if (mode === 'dos' || mode === 'pret') carte = dosS;
    else if (mode === 'arme') carte = `<div style="position: relative;">${dosS}<svg width="96" height="134" viewBox="0 0 96 134" style="position: absolute; left: 0; top: 0;" aria-hidden="true"><path d="M4 4H92V130H4Z" fill="none" stroke="${K.ver}" stroke-width="1.5" stroke-dasharray="${(428 * p).toFixed(0)} 428"/></svg></div>`;
    else if (mode === 'brunit') carte = `<div style="position: relative; width: 96px; height: 134px;">${cartePetite('voyante')}<div style="position: absolute; inset: 0; -webkit-mask: radial-gradient(circle at 48px 104px, transparent 40px, #000 40.5px); mask: radial-gradient(circle at 48px 104px, transparent 40px, #000 40.5px);">${dosS}</div></div>`;
    else carte = `<div style="position: relative;">${cartePetite('voyante')}<svg width="96" height="134" viewBox="0 0 96 134" style="position: absolute; left: 0; top: 0;" aria-hidden="true"><path d="M4 4H92V130H4Z" fill="none" stroke="${K.b9}" stroke-width="1.5" stroke-dasharray="${(428 * p).toFixed(0)} 428"/></svg></div>`;
    b += `<div style="position: absolute; left: ${x}px; top: 1180px; width: 236px; height: 190px; overflow: hidden;">${grainCuivre(236, 190)}<div style="position: absolute; left: 12px; top: 12px;">${carte}</div>
<div style="position: absolute; left: 120px; top: 12px; width: 106px;"><div style="font-family: ${F.fell}; font-size: 20px; color: ${K.ver};">${n}</div><div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${K.p1}; margin-top: 2px;">${nom}</div><p style="margin: 8px 0 0; font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${K.ver};">${txt}</p></div>
${mode === 'pret' ? `<div style="position: absolute; left: 12px; top: 154px; width: 212px; height: 24px; box-sizing: border-box; border: 1.5px solid ${K.p2}; display: flex; align-items: center; justify-content: center; font-family: ${F.ss}; font-size: 12px; color: ${K.ver};">Je sais qui je suis</div>` : `<div style="position: absolute; left: 12px; top: 154px; width: 212px; height: 24px; box-sizing: border-box; background: ${K.p3}; border: 1.5px solid ${K.p1}; display: flex; align-items: center; gap: 6px; padding: 0 6px; font-family: ${F.ss}; font-size: 12px; color: ${K.ver};"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="${K.p2}" stroke-width="2"/>${p > 0 ? `<circle cx="7" cy="7" r="5.5" fill="none" stroke="${K.ver}" stroke-width="2" stroke-dasharray="${(34.6 * Math.min(p, 1)).toFixed(1)} 34.6" transform="rotate(-90 7 7)"/>` : ''}</svg>${mode === 'lue' ? 'Relâchez pour cacher · 6 s' : 'Gardez le pouce'}</div>`}</div>`;
  });
  return racine('cFo', 'C-Formats', b, 13);
}

// ============================================================ Vignettes
export function vignettesPlanche() {
  let b = entete('Pl. C-IV', 'Garoutom · Caprices · lot C — la nuit racontée', 'Les dix-huit vignettes du récit',
    '« Les voix sont comptées ; les raisons, jamais. »',
    'Chaque planche du récit prend la vignette de son premier évènement, dans l’ordre de priorité du § 6.4 ; la potence sert aux deux votes. Gravées à 96 × 96 dans leur cuvette ; la sanguine n’y paraît que là où la meute a mordu, la garance que pour le serment.');
  VIGNETTES.forEach((v, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const x = 48 + col * 252, y = 152 + row * 196;
    b += abs(x, y, vignette(v.id, 96));
    b += abs(x + 108, y, `<div style="width: 136px;">${rubrique(`${v.prio === '—' ? 'fin' : 'priorité ' + v.prio}`)}<div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${K.b9}; margin-top: 2px;">${v.nom}</div><div style="font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${K.del}; margin-top: 2px;">${v.evt}</div></div>`);
    b += abs(x, y + 104, `<div style="width: 236px;">${leg(v.leg, 16, 20)}</div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 746px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  b += abs(48, 762, rubrique('Trois vignettes à 192 — la planche en plein écran (Fin-Planche)'));
  [['yeux', '« Personne ne nous a vus. »'], ['main', '« Ce qu’elle voit, nul ne le croit. »'], ['aconit', '« Deux fioles, et la mauvaise. »']].forEach(([id, l], i) => {
    const x = 48 + i * 300;
    b += abs(x, 792, vignette(id, 192));
    b += abs(x, 996, `<div style="width: 260px;">${leg(l, 18, 24)}</div>`);
  });
  b += abs(960, 762, rubrique('Le frontispice — accueil, 358 × 160 [Caprice 43]'));
  b += abs(960, 792, `<div style="padding: 0; width: 358px;">${frontispice()}</div>`);
  b += abs(960, 968, `<div style="width: 560px;">${leg('« Le sommeil de la raison engendre des loups. »', 20, 28, K.b9)}<div style="margin-top: 10px;">${corps('Le dormeur affalé sur son bureau ; derrière lui la nuée d’aquatinte, mordue sur son bord, d’où sortent hiboux et chauves-souris en réserve ; à ses pieds, à la place du lynx de Goya, un loup couché qui le regarde — son œil est la seule sanguine de l’accueil. L’inscription est typographiée sur un cartel plein, jamais gravée dans l’image.', { w: 560 })}</div>`);
  b += `<div style="position: absolute; left: 48px; top: 1120px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  b += abs(48, 1136, rubrique('Règles de dessin des vignettes'));
  b += abs(48, 1162, corps('Grille 96, cuvette au bord (arête 45 %, reflet bruni). Trait 1 à 2,6 px, extrémités rondes ; volumes en hachures droites (pas 2 à 6) ou courbes ; ciels en hachure horizontale. La meute (mâchoire, yeux) se dit en masses d’aquatinte au bord mordu, jamais en hachure. Aucune lune, aucun halo, aucun visage. À 192, l’épaisseur du trait est ramenée à 62 % et les pas resserrés : on agrandit la planche, pas le burin.', { size: 16, lh: 24, w: 960, col: K.b9 }));
  return racine('cVi', 'C-Vignettes', b, 14);
}
