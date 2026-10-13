// Extraction des tracés définitifs vers le client (lot V1-B, « iconographie »).
//
// Ce script IMPORTE les générateurs des lots C et F (et lit, pour les deux
// frontispices du lot E1, les maquettes qu'il a produites) puis écrit des
// modules TypeScript de données dans `packages/client/src/components/habit/traces/`.
// Rien n'est retracé à la main : on appelle les fonctions qui dessinent les
// planches, avec des encres « sentinelles » à la place des couleurs, puis on
// traduit chaque SVG en arbre de nœuds prêt pour React :
//
//   Noeud = [balise, props, ...enfants]   (props déjà en camelCase React)
//
// Conventions des valeurs :
//   '$jeton'      une encre sémantique, résolue par le composant (palette) ;
//   'url(#@c1)'   un identifiant LOCAL, préfixé à chaque rendu (useId) pour
//                 que deux symboles d'une même page ne se marchent pas dessus ;
//   'url(#hach-2-§)'  un motif de textures.svg dont le suffixe -e / -v suit le
//                 tirage (papier / cuivre) ;
//   'url(#aqua-IV)', 'url(#mordu)'…  les matières globales de textures.svg,
//                 posées une fois par <Matieres/> (lot V1-A), inchangées.
//
// Usage :  node docs/design/caprices/generateurs/extraire.mjs
// Régénérer après toute retouche d'un générateur ; les modules produits ne
// s'éditent pas à la main.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..', '..', '..');
const SORTIE = join(RACINE, 'packages', 'client', 'src', 'components', 'habit', 'traces');
const MAQUETTES = join(ICI, '..', 'maquettes');
const importer = (chemin) => import(pathToFileURL(join(ICI, chemin)).href);

const { ROLES, symbole } = await importer('gen-C/roles.mjs');
const { carteDos, frontispice } = await importer('gen-C/cartes.mjs');
const { VIGNETTES, vignette } = await importer('gen-C/vignettes.mjs');
const { SROLES, ssym, sdos, shiganshina, COIFFES } = await importer('gen-C/shig.mjs');
const { SROLES: SROLES_GJ, gsym, gdos, giletsjaunes: plancheGJ, GCOIFFES } = await importer('gen-C/giletsjaunes.mjs');
const { PAPIER, CUIVRE, hach, hachRect, grain, cartPath } = await importer('gen-C/lib.mjs');
const { ICONES, GLYPHES } = await importer('lotF/traces.mjs');
const { CHEFS, buste } = await importer('lotF/chefs.mjs');

/* ------------------------------------------------------------------ */
/* Lecture d'un SVG en arbre                                           */
/* ------------------------------------------------------------------ */

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decoder = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITES[e] ?? m;
  });

/** Analyse un fragment SVG (balises explicites ou auto-fermantes) ; renvoie la liste des nœuds racines. */
function analyser(svg) {
  const racine = { balise: '#', attrs: {}, enfants: [] };
  const pile = [racine];
  const re = /<!--[\s\S]*?-->|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[0].startsWith('<!--')) continue;
    const haut = pile[pile.length - 1];
    if (m[1]) {
      if (haut.balise !== m[1]) throw new Error(`balise ${m[1]} fermée hors de propos (ouverte : ${haut.balise})`);
      pile.pop();
    } else if (m[2]) {
      const attrs = {};
      for (const a of m[3].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decoder(a[2] ?? a[3]);
      const noeud = { balise: m[2], attrs, enfants: [] };
      haut.enfants.push(noeud);
      if (!m[4]) pile.push(noeud);
    } else if (m[5] && m[5].trim() !== '') {
      haut.enfants.push({ texte: decoder(m[5]) });
    }
  }
  if (pile.length !== 1) throw new Error(`balise ${pile[pile.length - 1].balise} jamais fermée`);
  return racine.enfants;
}

/** Le premier <svg> d'un fragment. */
function premierSvg(svg) {
  const n = analyser(svg).find((x) => x.balise === 'svg');
  if (!n) throw new Error('aucun <svg>');
  return n;
}

/* ------------------------------------------------------------------ */
/* Transformations                                                     */
/* ------------------------------------------------------------------ */

/** Retire récursivement les nœuds pour lesquels `rejeter` répond vrai. */
function filtrer(n, rejeter) {
  if (n.texte !== undefined) return n;
  return { ...n, enfants: n.enfants.filter((e) => !rejeter(e)).map((e) => filtrer(e, rejeter)) };
}
const sansTexte = (n) => filtrer(n, (e) => e.balise === 'text');

/** Remplace les couleurs par des jetons, selon une table hex (minuscules) → valeur. */
const ATTRS_COULEUR = ['fill', 'stroke', 'color', 'stop-color', 'flood-color'];
function teinter(n, table) {
  if (n.texte !== undefined) return n;
  const attrs = { ...n.attrs };
  for (const a of ATTRS_COULEUR) {
    const v = attrs[a];
    if (v !== undefined && table[v.toLowerCase()] !== undefined) attrs[a] = table[v.toLowerCase()];
  }
  if (attrs.style) {
    attrs.style = attrs.style.replace(/(fill|stroke|color)\s*:\s*(#[0-9a-fA-F]{3,6})/g, (m, p, c) => (table[c.toLowerCase()] !== undefined ? `${p}: ${table[c.toLowerCase()]}` : m));
  }
  return { ...n, attrs, enfants: n.enfants.map((e) => teinter(e, table)) };
}

/** Renomme les identifiants locaux en '@c1', '@c2'… et réécrit leurs références. */
function localiser(n) {
  const noms = new Map();
  const collecter = (x) => {
    if (x.texte !== undefined) return;
    if (x.attrs.id) noms.set(x.attrs.id, `@c${(noms.size + 1).toString(36)}`);
    x.enfants.forEach(collecter);
  };
  collecter(n);
  const recrire = (v) => v.replace(/url\(#([^)]+)\)/g, (m, id) => (noms.has(id) ? `url(#${noms.get(id)})` : m)).replace(/^#(.+)$/, (m, id) => (noms.has(id) ? `#${noms.get(id)}` : m));
  const parcourir = (x) => {
    if (x.texte !== undefined) return x;
    const attrs = {};
    for (const [k, v] of Object.entries(x.attrs)) attrs[k] = k === 'id' ? noms.get(v) : recrire(v);
    return { ...x, attrs, enfants: x.enfants.map(parcourir) };
  };
  return parcourir(n);
}

/* ------------------------------------------------------------------ */
/* Vers les props React                                                */
/* ------------------------------------------------------------------ */

const camel = (k) => k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
function nomProp(k) {
  if (k === 'class') return 'className';
  if (k === 'xlink:href') return 'href';
  if (k.startsWith('data-') || k.startsWith('aria-')) return k;
  return camel(k.replace(':', '-'));
}
function styleObjet(s) {
  const o = {};
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim(), v = decl.slice(i + 1).trim();
    if (k) o[camel(k)] = v;
  }
  return o;
}
// Les générateurs calculent en flottants (7.8999999999999995) : on arrondit au millième, sans effet visible.
const arrondir = (v) => v.replace(/-?\d*\.\d{4,}/g, (m) => String(Number(Number(m).toFixed(3))));
/** Noeud → tableau [balise, props, ...enfants] (les attributs de mise en page du <svg> racine sont retirés). */
function versTableau(n, racine = false) {
  if (n.texte !== undefined) return n.texte;
  const props = {};
  for (const [k, v] of Object.entries(n.attrs)) {
    if (racine && ['width', 'height', 'viewBox', 'style', 'role', 'aria-label', 'aria-hidden', 'xmlns'].includes(k)) continue;
    if (k === 'role' || k === 'aria-label' || k === 'aria-hidden') continue; // l'accessibilité est l'affaire du composant
    props[nomProp(k)] = k === 'style' ? styleObjet(v) : k === 'id' ? v : arrondir(v);
  }
  return [racine ? 'g' : n.balise, props, ...n.enfants.map((e) => versTableau(e))];
}

/** SVG complet → { viewBox, trace } prêt à écrire. */
function extraire(svg, { table = {}, garderTexte = false, retouche } = {}) {
  let n = premierSvg(svg);
  if (!garderTexte) n = sansTexte(n);
  n = teinter(n, table);
  if (retouche) n = retouche(n);
  n = localiser(n);
  return { viewBox: n.attrs.viewBox, trace: versTableau(n, true) };
}
/** Fragment (sans <svg>) → trace. */
const fragment = (inner, viewBox, opts) => extraire(`<svg viewBox="${viewBox}">${inner}</svg>`, opts);

/* ------------------------------------------------------------------ */
/* Encres sentinelles                                                  */
/* ------------------------------------------------------------------ */

// Des couleurs qu'aucun générateur n'emploie : elles marquent un rôle d'encre.
const S = { reserve: '#0a0b01', meute: '#0a0b02', serment: '#0a0b03', masse: '#0a0b04', surface: '#0a0b05', fantome: '#0a0b06', encre: '#0a0b07' };
const JETONS = Object.fromEntries(Object.entries(S).map(([k, v]) => [v, `$${k}`]));

/* ------------------------------------------------------------------ */
/* 1. Les vingt-et-un symboles (lot C) — 128 / 32 / 16, et Shiganshina  */
/* ------------------------------------------------------------------ */

const NIVEAUX = ['128', '32', '16'];
const optsSymbole = (L) => ({ L, ink: 'currentColor', bg: S.reserve, accent: S.meute, serment: S.serment, mass: S.masse });

/**
 * Retouche d'arbitrage n° 3 (face de carte du Loup Blanc) : la figure est en
 * réserve sur le fond d'aquatinte de la planche, sans la masse sombre qui
 * l'entoure dans le symbole 128 — le loup se lit au trait mordu et à la
 * sanguine, jamais à une masse plus sombre. On retire la masse ($masse) et le
 * grain découpé par la même forme.
 */
function sansMasse(n) {
  const formes = new Set();
  const voir = (x) => {
    if (x.texte !== undefined) return;
    if (x.attrs.fill === '$masse' && x.attrs.d) formes.add(x.attrs.d);
    x.enfants.forEach(voir);
  };
  voir(n);
  const clips = new Set();
  const voirClips = (x) => {
    if (x.texte !== undefined) return;
    if (x.balise === 'clipPath' && x.enfants.some((e) => formes.has(e.attrs?.d))) clips.add(x.attrs.id);
    x.enfants.forEach(voirClips);
  };
  voirClips(n);
  return filtrer(n, (e) =>
    e.texte === undefined && (
      (e.attrs.fill === '$masse' && formes.has(e.attrs.d)) ||
      (e.balise === 'clipPath' && clips.has(e.attrs.id)) ||
      (e.attrs['clip-path'] && [...clips].some((c) => e.attrs['clip-path'] === `url(#${c})`))));
}

const symboles = {};
for (const r of ROLES) {
  symboles[r.id] = {};
  for (const L of NIVEAUX) symboles[r.id][L] = extraire(symbole(r.id, 32, optsSymbole(L)), { table: JETONS }).trace;
}
const symbolesFace = {
  loupBlanc: extraire(symbole('loupBlanc', 32, optsSymbole('128')), { table: JETONS, retouche: sansMasse }).trace,
};

// Shiganshina : 21 symboles, deux niveaux (grand ≥ 96 px, petit). Les identifiants du
// lot C (habitant, titan…) se rangent sous les rôles du moteur par leur numéro de planche.
const PAR_NUMERO = Object.fromEntries(ROLES.map((r) => [r.n, r.id]));
const MAIN_TITAN = 'M7.4 18C7 12 8.6 6';
/** La main du Colosse est une masse : elle suit l'encre de masse, comme celle du loup. */
function mainEnMasse(n) {
  if (n.texte !== undefined) return n;
  const attrs = { ...n.attrs };
  if (attrs.d?.startsWith(MAIN_TITAN) && attrs.fill === 'currentColor') attrs.fill = '$masse';
  return { ...n, attrs, enfants: n.enfants.map(mainEnMasse) };
}
const symbolesShig = {};
for (const r of SROLES) {
  const role = PAR_NUMERO[r.n];
  const o = { ink: 'currentColor', bg: S.reserve, accent: S.meute };
  symbolesShig[role] = {
    grand: extraire(ssym(r.id, 128, o), { table: JETONS, retouche: mainEnMasse }).trace,
    petit: extraire(ssym(r.id, 32, o), { table: JETONS, retouche: mainEnMasse }).trace,
  };
}

// Gilets Jaunes : 21 symboles, deux niveaux, et une encre de plus — le fluo du
// gilet, une sentinelle propre qui devient le jeton `$fluo` (des hachures,
// jamais un aplat ; le feu de camp seul est fluo plein).
const TABLE_GJ = { ...JETONS, '#0a0b08': '$fluo' };
const symbolesGJ = {};
for (const r of SROLES_GJ) {
  const role = PAR_NUMERO[r.n];
  if (!role) throw new Error(`Gilets Jaunes : le numéro ${r.n} ne correspond à aucun rôle`);
  const o = { ink: 'currentColor', bg: S.reserve, accent: S.meute, mass: S.masse, fluo: '#0a0b08' };
  symbolesGJ[role] = {
    grand: extraire(gsym(r.id, 128, o), { table: TABLE_GJ }).trace,
    petit: extraire(gsym(r.id, 32, o), { table: TABLE_GJ }).trace,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Les cartes : fonds d'image, cartouches, dos                       */
/* ------------------------------------------------------------------ */

const OVALE = (cx, cy, rx, ry) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
// Géométrie des faces (cartes.mjs : carteGrande, carteMoyenne, cartePetite).
const FORMATS = {
  grande: { x: 24, y: 24, w: 252, h: 264, cx: 150, cy: 154, rx: 96, ry: 112 },
  moyenne: { x: 16, y: 16, w: 184, h: 168, cx: 108, cy: 100, rx: 66, ry: 72 },
};
const fonds = {};
for (const [f, g] of Object.entries(FORMATS)) {
  const rect = `M${g.x} ${g.y}h${g.w}v${g.h}h${-g.w}Z`;
  const box = [g.x, g.y, g.w, g.h];
  // imageV1 : le village en hachure H1, la meute en aquatinte (palier I), l'ovale en réserve.
  const village = hach(rect + OVALE(g.cx, g.cy, g.rx, g.ry), box, { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
  const meute = grain(rect + OVALE(g.cx, g.cy, g.rx, g.ry), box, { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
  fonds[f] = {
    village: fragment(village, '0 0 300 420', { table: JETONS }).trace,
    meute: fragment(meute, '0 0 300 420', { table: JETONS }).trace,
  };
}
// cartePetite : le cartouche d'image est un rectangle (10, 10, 76, 54) et un ovale réservé.
fonds.petite = {
  village: fragment(hachRect(10, 10, 76, 54, { pas: 6, sw: 0.6, color: S.encre }), '0 0 96 134', { table: JETONS }).trace,
  meute: fragment(grain('M10 10h76v54h-76Z', [10, 10, 76, 54], { f: 'aqua-I', op: 0.5 }), '0 0 96 134', { table: JETONS }).trace,
};

const cartouches = {};
for (const [f, [w, h]] of Object.entries({ grande: [132, 26], moyenne: [100, 22], petite: [68, 20] })) {
  cartouches[f] = { ecu: cartPath('ecu', w, h), mordu: cartPath('mordu', w, h), mordu2: cartPath('mordu2', w, h) };
}

// Le dos (Caprice 43) : marge de papier ou de cuivre selon le tirage ; Shiganshina : la Porte.
const dos = {
  papier: extraire(carteDos({ t: PAPIER })),
  cuivre: extraire(carteDos({ t: CUIVRE })),
  shiganshina: extraire(sdos()),
  giletsjaunes: extraire(gdos()),
};

/* ------------------------------------------------------------------ */
/* 3. Les couvre-chefs (lot F) et les coiffes du district (lot C)       */
/* ------------------------------------------------------------------ */

const chefs = CHEFS.map((nom, i) => ({
  nom,
  grave: fragment(buste(i, { k: 'currentColor', p: S.surface, suf: '§', mode: 'grav' }), '0 0 48 48', { table: JETONS }).trace,
  fantome: fragment(buste(i, { k: 'currentColor', p: S.surface, suf: '§', mode: 'fantome', ghost: S.fantome }), '0 0 48 48', { table: JETONS }).trace,
}));

// Les six coiffes de Shiganshina vivent dans la planche C-V : on les lit dans
// sa sortie (vignettes 62 px, dans l'ordre de COIFFES).
const planchShig = shiganshina();
const coiffesSvg = [...planchShig.matchAll(/<svg width="62" height="62" viewBox="0 0 48 48"[^>]*>[\s\S]*?<\/svg>/g)].map((m) => m[0]);
if (coiffesSvg.length !== COIFFES.length) throw new Error(`coiffes : ${coiffesSvg.length} trouvées, ${COIFFES.length} attendues`);
const TABLE_SHIG = { '#141614': 'currentColor', '#f1efe8': '$surface', '#45523f': '$vert' };
const coiffes = COIFFES.map((c, i) => ({ nom: c.nom, grave: extraire(coiffesSvg[i], { table: TABLE_SHIG }).trace }));

// Les dix-huit coiffes du rond-point vivent dans la planche C-VI, lues pareil.
const planche = plancheGJ();
const coiffesGJSvg = [...planche.matchAll(/<svg width="62" height="62" viewBox="0 0 48 48"[^>]*>[\s\S]*?<\/svg>/g)].map((m) => m[0]);
if (coiffesGJSvg.length !== GCOIFFES.length) throw new Error(`coiffes GJ : ${coiffesGJSvg.length} trouvées, ${GCOIFFES.length} attendues`);
const TABLE_COIFFES_GJ = { '#101318': 'currentColor', '#f1ebdb': '$surface', '#e8c81a': '$fluo' };
const coiffesGJ = GCOIFFES.map((c, i) => ({ nom: c.nom, grave: extraire(coiffesGJSvg[i], { table: TABLE_COIFFES_GJ }).trace }));

/* ------------------------------------------------------------------ */
/* 4. Icônes (33) et glyphes d'état (11) — lot F                        */
/* ------------------------------------------------------------------ */

// Le contrat d'implémentation nomme « abstention » l'icône que le lot F appelle « abstenir ».
const NOMS_ICONES = { abstenir: 'abstention' };
const icones = Object.fromEntries(ICONES.map((ic) => [NOMS_ICONES[ic.id] ?? ic.id, fragment(ic.svg, '0 0 24 24').trace]));
// Les glyphes portent le nom de l'état qu'ils disent (SPEC § 5.1.4).
const NOMS_GLYPHES = { sceau: 'a-vote', chandelle: 'mort', corde: 'gracie', horsvote: 'hors-vote', chaise: 'absent', index: 'votera', lacs: 'lie', plume: 'marque', 'bouclier-barre': 'interdit', oeil: 'oeil', pate: 'refuse' };
const glyphes = Object.fromEntries(GLYPHES.map((g) => [NOMS_GLYPHES[g.id], fragment(g.svg.replace('SURENCRE', S.surface), '0 0 16 16', { table: { [S.surface]: '$surEncre' } }).trace]));
if (Object.keys(glyphes).length !== 11) throw new Error('glyphes : il en faut 11');

/* ------------------------------------------------------------------ */
/* 5. Vignettes du récit (18) et frontispices                           */
/* ------------------------------------------------------------------ */

const vignettes = Object.fromEntries(VIGNETTES.map((v) => [v.id, { nom: v.nom, 96: extraire(vignette(v.id, 96)).trace, 192: extraire(vignette(v.id, 192)).trace }]));

// Le frontispice du lot C (bandeau 358 × 160) : son inscription est retirée, le
// composant la compose avec la légende du skin.
const frontBandeau = extraire(frontispice());
// Les deux frontispices de l'accueil (lot E1) : lus dans les maquettes, où ils sont déposés tels quels.
const lireMaquette = (fichier, entete) => {
  const html = readFileSync(join(MAQUETTES, fichier), 'utf8');
  const i = html.indexOf(entete);
  if (i < 0) throw new Error(`${fichier} : frontispice introuvable`);
  // le <svg> du frontispice ne contient pas d'autre <svg>
  return html.slice(i, html.indexOf('</svg>', i) + 6);
};
const frontYeux = extraire(lireMaquette('Caprices-E1-Accueil.dc.html', '<svg width="358" height="160" viewBox="0 0 358 160" role="img" aria-label="Frontispice'));
const frontPortrait = extraire(lireMaquette('Caprices-E1-Accueil-Desktop.dc.html', '<svg width="640" height="720" viewBox="0 0 640 720" role="img" aria-label="Frontispice'));

/* ------------------------------------------------------------------ */
/* Écriture                                                            */
/* ------------------------------------------------------------------ */

const ENTETE = (quoi, sources) => `// Généré par docs/design/caprices/generateurs/extraire.mjs — ne pas éditer à la main.
// ${quoi}
// Sources : ${sources}.
/* eslint-disable */
import type { Noeud } from '../Trace.js';
`;
const js = (v) => JSON.stringify(v);
function ecrire(nom, contenu) {
  mkdirSync(SORTIE, { recursive: true });
  writeFileSync(join(SORTIE, nom), contenu);
  console.log(`${nom.padEnd(24)} ${(contenu.length / 1024).toFixed(1).padStart(6)} Ko`);
}

// Le découpage suit le chargement du client : les tracés des écrans courants
// restent dans des modules importés statiquement ; les vignettes du récit, le
// frontispice du recueil (fin de partie) et tout ce qui est propre à
// Shiganshina sont chargés à la demande (`import()` dynamique, voir
// `components/habit/paresseux.ts`). Déplacer un tracé d'un module à l'autre
// change ce que le joueur télécharge avant son premier écran : mesurer avec
// `npm run build -w @garoutom/client`.

ecrire('symboles.ts', `${ENTETE('Les vingt-et-un symboles de rôle, grille 32 : niveaux 128 (carte), 32 (trait 2) et 16 (simplifié). Shiganshina : shiganshina.ts (chargé à la demande).', 'gen-C/roles.mjs')}
export type NiveauSymbole = '128' | '32' | '16';
/** Le numéro de planche de chaque rôle (SPEC § 6.1), imprimé sur la carte. */
export const NUMEROS: Record<string, number> = ${js(Object.fromEntries(ROLES.map((r) => [r.id, r.n])))};
/** Thiercelieux : par rôle du moteur, puis par niveau. */
export const SYMBOLES: Record<string, Record<NiveauSymbole, Noeud>> = ${js(symboles)};
/** Variantes de face de carte (arbitrage n° 3 : aucune masse plus sombre que le village). */
export const SYMBOLES_FACE: Record<string, Noeud> = ${js(symbolesFace)};
`);

ecrire('cartes.ts', `${ENTETE('Les pièces des cartes : fonds d’image (hachure du village, aquatinte de la meute), cartouches de camp, dos. Le dos de Shiganshina : shiganshina.ts (chargé à la demande).', 'gen-C/cartes.mjs, gen-C/lib.mjs')}
export type FormatCarte = 'grande' | 'moyenne' | 'petite';
/** Fond de la zone d'image, en coordonnées de la carte (300 × 420, 216 × 302, 96 × 134). */
export const FONDS_IMAGE: Record<FormatCarte, { village: Noeud; meute: Noeud }> = ${js(fonds)};
/** Chemins des cartouches de camp (SPEC § 5.3), à la taille de chaque format. */
export const CARTOUCHES: Record<FormatCarte, { ecu: string; mordu: string; mordu2: string }> = ${js(cartouches)};
/** Le dos unique (300 × 420) : marge de papier ou de cuivre selon le tirage. */
export const DOS: Record<'papier' | 'cuivre', { viewBox: string; trace: Noeud }> = ${js({ papier: dos.papier, cuivre: dos.cuivre })};
`);

ecrire('chefs.ts', `${ENTETE('Les dix-huit couvre-chefs (buste 48 × 48), gravés et en fantôme (mort brunie). Les coiffes du district : shiganshina.ts (chargé à la demande).', 'lotF/chefs.mjs')}
export const COUVRE_CHEFS: readonly { nom: string; grave: Noeud; fantome: Noeud }[] = ${js(chefs)};
`);

ecrire('shiganshina.ts', `${ENTETE('Ce qui est propre au skin Shiganshina, chargé à la demande : les vingt-et-un symboles (deux niveaux), le dos (la Porte du district), les six coiffes.', 'gen-C/shig.mjs (dont la planche C-V)')}
/** Les symboles, par rôle du moteur (numéro de planche) : grand (≥ 96 px) ou petit. */
export const SYMBOLES_SHIGANSHINA: Record<string, { grand: Noeud; petit: Noeud }> = ${js(symbolesShig)};
/** Le dos (300 × 420) : la Porte du district. */
export const DOS_SHIGANSHINA: { viewBox: string; trace: Noeud } = ${js(dos.shiganshina)};
/** Les coiffes du district (buste 48 × 48), sièges 1 à 6. */
export const COIFFES_SHIGANSHINA: readonly { nom: string; grave: Noeud }[] = ${js(coiffes)};
`);

ecrire('giletsjaunes.ts', `${ENTETE('Ce qui est propre au skin Gilets Jaunes, chargé à la demande : les vingt-et-un symboles (deux niveaux), le dos (la cabane sur le rond-point, la nuit), les dix-huit coiffes.', 'gen-C/giletsjaunes.mjs (dont la planche C-VI)')}
/** Les symboles, par rôle du moteur (numéro de planche) : grand (≥ 96 px) ou petit. */
export const SYMBOLES_GILETSJAUNES: Record<string, { grand: Noeud; petit: Noeud }> = ${js(symbolesGJ)};
/** Le dos (300 × 420) : la cabane sur le rond-point, la nuit. */
export const DOS_GILETSJAUNES: { viewBox: string; trace: Noeud } = ${js(dos.giletsjaunes)};
/** Les coiffes du rond-point (buste 48 × 48), un par siège. */
export const COIFFES_GILETSJAUNES: readonly { nom: string; grave: Noeud }[] = ${js(coiffesGJ)};
`);

ecrire('icones.ts', `${ENTETE('Les 33 icônes d’interface (grille 24, trait 1,5) et les 11 glyphes d’état (grille 16, trait 1,25).', 'lotF/traces.mjs')}
export const ICONES = ${js(icones)} as const satisfies Record<string, Noeud>;
export const GLYPHES = ${js(glyphes)} as const satisfies Record<string, Noeud>;
`);

ecrire('vignettes.ts', `${ENTETE('Les dix-huit vignettes de la nuit racontée (grille 96), à 96 et à 192 px. Chargé à la demande.', 'gen-C/vignettes.mjs')}
export const VIGNETTES: Record<string, { nom: string; 96: Noeud; 192: Noeud }> = ${js(vignettes)};
`);

ecrire('frontispice.ts', `${ENTETE('Les frontispices du Caprice 43 pour l’accueil (lot E1) : bandeau aux yeux, portrait 640 × 720. Le bandeau du recueil : frontispice-recueil.ts (chargé à la demande).', 'maquettes Caprices-E1-Accueil(-Desktop).dc.html')}
export const FRONTISPICES: Record<'yeux' | 'portrait', { viewBox: string; trace: Noeud }> = ${js({ yeux: frontYeux, portrait: frontPortrait })};
`);

ecrire('frontispice-recueil.ts', `${ENTETE('Le frontispice du Caprice 43, bandeau du recueil (358 × 160, sans son inscription), pour la nuit racontée. Chargé à la demande.', 'gen-C/cartes.mjs')}
export const FRONTISPICE_RECUEIL: { viewBox: string; trace: Noeud } = ${js(frontBandeau)};
`);
