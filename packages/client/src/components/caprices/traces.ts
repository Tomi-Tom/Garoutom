/**
 * Les tracés calculés des primitives de « Caprices » — portés tels quels du
 * générateur du lot F (`docs/design/caprices/generateurs/lotF/comp.mjs`) :
 * même hasard à graine, même ordre de tirage, mêmes cotes. Ce sont des
 * données (des chemins SVG), pas des composants : `Frise.tsx` et
 * `Cartouche.tsx` les habillent de variables sémantiques.
 */

/** Le hasard à graine des planches (congruence linéaire, comme `lib.mjs`). */
export function hasard(graine: number): () => number {
  let s = graine >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Arrondi au centième, comme les planches (`n()` de `lib.mjs`). */
const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/* ── Largeur de texte estimée (Source Serif 4), pour un premier rendu ── */

const LARGE = 'MWmw';
const ETROIT = "iljtfr·.,:;’'!|()[] ";

/**
 * Largeur estimée d'un texte en Source Serif 4 — la même règle que le
 * générateur. Sert au premier rendu d'un cartouche, avant toute mesure (et
 * dans jsdom, qui ne mesure rien).
 */
export function largeurTexte(texte: string, taille: number, poids = 400): number {
  let l = 0;
  for (const c of texte) {
    if (ETROIT.includes(c)) l += 0.28;
    else if (LARGE.includes(c)) l += 0.82;
    else if ((c >= 'A' && c <= 'Z') || 'ÉÈÀÂ'.includes(c)) l += 0.66;
    else if (c >= '0' && c <= '9') l += 0.52;
    else l += 0.5;
  }
  return l * taille * (poids >= 600 ? 1.05 : 1);
}

/* ── Cartouches de camp (§ 5.3 ; géométrie de textures.svg) ─────────── */

export type FormeTrace = 'ecu' | 'mordu' | 'mordu2';

/**
 * Le contour d'un cartouche de `l` × `h` : écu à pans coupés, écu mordu à
 * droite (cinq dents irrégulières), ou mordu des deux côtés (« Seul »).
 * La morsure est dessinée dans le tracé, jamais filtrée (§ 4.6).
 */
export function contourCartouche(forme: FormeTrace, l: number, h: number): string {
  const c = h * 0.2;
  const k = h / 30;
  const X = (x: number): string => n(l - (120 - x) * k); // côté droit mordu, relatif au bord droit
  const Xg = (x: number): string => n(x * k); // côté gauche mordu
  const Y = (y: number): string => n(y * k);
  switch (forme) {
    case 'ecu':
      return `M${n(c)} 0.75 H${n(l - c)} L${n(l - 0.75)} ${n(c)} V${n(h - c)} L${n(l - c)} ${n(h - 0.75)} H${n(c)} L0.75 ${n(h - c)} V${n(c)} Z`;
    case 'mordu':
      return `M${n(c)} 1 H${X(100)} L${X(104)} ${Y(6)} L${X(109)} ${Y(2)} L${X(111)} ${Y(10)} L${X(119)} ${Y(13)} L${X(112)} ${Y(17)} L${X(118)} ${Y(23)} L${X(110)} ${Y(25)} L${X(106)} ${n(h - 1)} H${n(c)} L1 ${n(h - c)} V${n(c)} Z`;
    case 'mordu2':
      return `M${Xg(20)} 1 H${X(100)} L${X(104)} ${Y(6)} L${X(109)} ${Y(2)} L${X(111)} ${Y(10)} L${X(119)} ${Y(13)} L${X(112)} ${Y(17)} L${X(118)} ${Y(23)} L${X(110)} ${Y(25)} L${X(106)} ${n(h - 1)} H${Xg(20)} L${Xg(16)} ${Y(24)} L${Xg(11)} ${Y(28)} L${Xg(9)} ${Y(20)} L${Xg(1)} ${Y(17)} L${Xg(8)} ${Y(13)} L${Xg(2)} ${Y(7)} L${Xg(10)} ${Y(5)} L${Xg(14)} 1 Z`;
  }
}

/* ── La frise (§ 5.7) ──────────────────────────────────────────────── */

/**
 * Un trait de la frise. `role` dit quelle variable l'habille :
 * - `toit` : aplat des maisons (`--frise-toit`), trait `--frise-trait` ;
 * - `trait` : trait seul ;
 * - `fenetre` : aplat `--frise-fenetre` ;
 * - `hachure-2` / `hachure-3` : hachure du jour (masquée la nuit) ;
 * - `mur`, `joint`, `colosse`, `yeux` : le Mur de Shiganshina ;
 * - `gyrophares` : les gyrophares du rond-point (la nuit venue seulement) ;
 * - `lune` : la lune du Far West (la nuit venue seulement) ;
 * - `veilleuse` : la veilleuse du comptoir, seul or plein de la frise.
 */
export interface TraitFrise {
  d: string;
  role: 'toit' | 'trait' | 'fenetre' | 'hachure-2' | 'hachure-3' | 'mur' | 'mur-hachure' | 'joint' | 'colosse' | 'yeux' | 'gyrophares' | 'lune' | 'veilleuse';
  epaisseur?: number;
}

const rect = (x: number, y: number, l: number, h: number): string =>
  `M${n(x)} ${n(y)} H${n(x + l)} V${n(y + h)} H${n(x)} Z`;

/**
 * La ligne de toits de Thiercelieux, gravée, bas sur `yb` : maisons au
 * hasard (graine 7), un clocher à une fenêtre vers le tiers, la potence à
 * droite — le seul paysage de l'écran.
 */
export function toits(l: number, yb: number, graine = 7): TraitFrise[] {
  const r = hasard(graine);
  const traits: TraitFrise[] = [];
  let x = -6;
  const clocherX = Math.round(l * 0.36);
  const potenceX = l - 64;
  while (x < l + 10) {
    if (Math.abs(x - clocherX) < 26) {
      x = clocherX + 26;
      continue;
    }
    if (x > potenceX - 30 && x < potenceX + 26) {
      x = potenceX + 26;
      continue;
    }
    const lm = 22 + Math.round(r() * 24);
    const mur = 6 + Math.round(r() * 5);
    const toit = 5 + Math.round(r() * 5);
    const x0 = x;
    const x1 = x + lm;
    const xm = x0 + lm * (0.42 + r() * 0.16);
    const yM = yb - mur;
    const yT = yM - toit;
    traits.push({ role: 'toit', d: `M${n(x0)} ${n(yb)} V${n(yM)} L${n(xm)} ${n(yT)} L${n(x1)} ${n(yM)} V${n(yb)} Z`, epaisseur: 1 });
    traits.push({ role: 'hachure-2', d: `M${n(x0)} ${n(yM)} L${n(xm)} ${n(yT)} L${n(xm)} ${n(yM)} Z` });
    traits.push({ role: 'trait', d: `M${n(x0)} ${n(yM)} H${n(x1)}`, epaisseur: 0.6 });
    if (r() > 0.45) {
      const fx = x0 + 4 + r() * (lm - 10);
      traits.push({ role: 'fenetre', d: rect(fx, yM + 2, 2.4, 3) });
    }
    if (r() > 0.6) {
      const cx = x0 + lm * 0.7;
      traits.push({ role: 'toit', d: rect(cx, yT + toit * 0.2, 3, toit * 0.7), epaisseur: 0.8 });
    }
    x = x1 + (r() > 0.7 ? 2 : 0);
  }
  // Le clocher à une fenêtre.
  const c0 = clocherX - 8;
  traits.push({ role: 'toit', d: `M${n(c0)} ${n(yb)} V${n(yb - 20)} H${n(c0 + 16)} V${n(yb)} Z`, epaisseur: 1 });
  const fleche = `M${n(c0 - 1.5)} ${n(yb - 20)} L${n(c0 + 8)} ${n(yb - 31)} L${n(c0 + 17.5)} ${n(yb - 20)} Z`;
  traits.push({ role: 'toit', d: fleche, epaisseur: 1 });
  traits.push({ role: 'hachure-3', d: fleche });
  traits.push({ role: 'trait', d: `M${n(c0 + 8)} ${n(yb - 31)} V${n(yb - 35)} M${n(c0 + 6.4)} ${n(yb - 33.6)} H${n(c0 + 9.6)}`, epaisseur: 1 });
  traits.push({
    role: 'fenetre',
    d: `M${n(c0 + 5.6)} ${n(yb - 9)} V${n(yb - 14)} A2.4 2.4 0 0 1 ${n(c0 + 10.4)} ${n(yb - 14)} V${n(yb - 9)} Z`,
  });
  // La potence.
  traits.push({
    role: 'trait',
    d: `M${n(potenceX)} ${n(yb)} V${n(yb - 24)} H${n(potenceX + 13)} M${n(potenceX)} ${n(yb - 19)} L${n(potenceX + 5)} ${n(yb - 24)} M${n(potenceX + 12)} ${n(yb - 24)} V${n(yb - 17)}`,
    epaisseur: 1.4,
  });
  const cy = yb - 14.6;
  traits.push({
    role: 'trait',
    d: `M${n(potenceX + 9.6)} ${n(cy)} A2.4 2.4 0 1 0 ${n(potenceX + 14.4)} ${n(cy)} A2.4 2.4 0 1 0 ${n(potenceX + 9.6)} ${n(cy)}`,
    epaisseur: 1,
  });
  traits.push({ role: 'trait', d: `M${n(potenceX - 5)} ${n(yb)} H${n(potenceX + 6)}`, epaisseur: 1.4 });
  return traits;
}

/**
 * Le Mur de Shiganshina (§ 8) : un chemin de ronde crénelé à la place des
 * toits ; la nuit, une tête de Colosse derrière le Mur, en aquatinte, les
 * yeux brunis au palier III — jamais plus clairs.
 */
export function mur(l: number, yb: number): TraitFrise[] {
  const haut = yb - 18;
  const creneau = yb - 12;
  let d = `M0 ${n(yb)} V${n(creneau)}`;
  for (let x = 0; x < l + 10; x += 16) {
    d += ` H${n(x + 6)} V${n(haut)} H${n(x + 12)} V${n(creneau)} H${n(x + 16)}`;
  }
  const fin = Math.ceil((l + 10) / 16) * 16;
  d += ` V${n(yb)} H0 Z`;
  let joints = `M0 ${n(yb - 6)} H${n(fin)}`;
  for (let x = 8; x < l; x += 22) joints += ` M${n(x)} ${n(yb - 6)} V${n(yb)}`;
  const f = (k: number): string => n(l * k);
  const tete = `M${f(0.56)} ${n(yb)} C${f(0.56)} ${n(yb - 22)} ${f(0.6)} ${n(yb - 42)} ${f(0.68)} ${n(yb - 48)} C${f(0.74)} ${n(yb - 52)} ${f(0.8)} ${n(yb - 48)} ${f(0.83)} ${n(yb - 36)} C${f(0.85)} ${n(yb - 26)} ${f(0.85)} ${n(yb - 12)} ${f(0.84)} ${n(yb)} Z`;
  const oeil = (a: number, b: number, c: number): string =>
    `M${f(a)} ${n(yb - 32)} Q${f(b)} ${n(yb - 34)} ${f(c)} ${n(yb - 32)} Q${f(b)} ${n(yb - 30.6)} ${f(a)} ${n(yb - 32)} Z`;
  return [
    { role: 'colosse', d: tete },
    { role: 'yeux', d: `${oeil(0.65, 0.67, 0.69)} ${oeil(0.74, 0.76, 0.78)}` },
    { role: 'mur', d, epaisseur: 1 },
    { role: 'mur-hachure', d },
    { role: 'joint', d: joints, epaisseur: 0.6 },
  ];
}

/**
 * Le rond-point des Gilets Jaunes : l'îlot rond — un cercle, jamais un carré —,
 * la cabane en palette au milieu, le feu de camp, les pins de la
 * départementale ; la nuit, les gyrophares attendent au bord du champ.
 */
export function rondpoint(l: number, yb: number): TraitFrise[] {
  const traits: TraitFrise[] = [];
  const ix = Math.round(l * 0.46);
  // les pins, plantés au bord de la départementale
  const pin = (x: number, h: number): string =>
    `M${n(x)} ${n(yb)} V${n(yb - h - 8)} M${n(x - 5)} ${n(yb - h + 6)} L${n(x)} ${n(yb - h - 2)} L${n(x + 5)} ${n(yb - h + 6)} M${n(x - 3)} ${n(yb - h + 11)} L${n(x)} ${n(yb - h + 5)} L${n(x + 3)} ${n(yb - h + 11)}`;
  traits.push({ role: 'trait', d: [pin(l * 0.15, 16), pin(l * 0.28, 13), pin(l * 0.78, 15), pin(l * 0.9, 17)].join(' '), epaisseur: 1.2 });
  // les gyrophares, au loin à l'entrée du secteur — la nuit venue seulement
  const gx = l * 0.09;
  traits.push({
    role: 'gyrophares',
    d: `M${n(gx - 6)} ${n(yb)} A6 4.5 0 0 1 ${n(gx + 6)} ${n(yb)} Z M${n(gx)} ${n(yb - 6)} V${n(yb - 11)} M${n(gx - 5)} ${n(yb - 8)} L${n(gx - 9)} ${n(yb - 12)} M${n(gx + 5)} ${n(yb - 8)} L${n(gx + 9)} ${n(yb - 12)}`,
  });
  // l'îlot du rond-point
  traits.push({ role: 'toit', d: `M${n(ix - 40)} ${n(yb)} C${n(ix - 40)} ${n(yb - 15)} ${n(ix + 40)} ${n(yb - 15)} ${n(ix + 40)} ${n(yb)} Z`, epaisseur: 1 });
  // la cabane en palette
  traits.push({ role: 'toit', d: `M${n(ix - 15)} ${n(yb - 12)} L${n(ix)} ${n(yb - 24)} L${n(ix + 15)} ${n(yb - 12)} Z`, epaisseur: 1.1 });
  traits.push({ role: 'toit', d: `M${n(ix - 9)} ${n(yb - 12)} V${n(yb - 1)} H${n(ix + 9)} V${n(yb - 12)}`, epaisseur: 1.1 });
  traits.push({ role: 'fenetre', d: rect(ix - 3, yb - 7, 6, 6) });
  // le feu de camp, seule fenêtre chaude du rond-point
  traits.push({ role: 'fenetre', d: `M${n(ix - 30)} ${n(yb - 4)} C${n(ix - 32)} ${n(yb - 9)} ${n(ix - 28)} ${n(yb - 13)} ${n(ix - 30)} ${n(yb - 4)} Z` });
  traits.push({ role: 'trait', d: `M${n(ix - 34)} ${n(yb - 2)} L${n(ix - 26)} ${n(yb + 2)} M${n(ix - 26)} ${n(yb - 2)} L${n(ix - 34)} ${n(yb + 2)}`, epaisseur: 1 });
  traits.push({ role: 'trait', d: `M0 ${n(yb)} H${n(l)}`, epaisseur: 1 });
  return traits;
}

/**
 * La rue principale du bourg du Far West : le saloon à l'auvent à festons et
 * ses portes à battants au milieu, les cactus de la prairie, la potence au
 * bout de la rue ; la nuit, la lune veille sur le désert, et la veilleuse du
 * comptoir — le seul or plein de la frise — brille jour et nuit.
 */
export function rue(l: number, yb: number): TraitFrise[] {
  const traits: TraitFrise[] = [];
  const ix = Math.round(l * 0.46);
  // les cactus de la prairie
  const cactus = (x: number, h: number): string =>
    `M${n(x)} ${n(yb)}V${n(yb - h - 6)}M${n(x - 4)} ${n(yb - h + 5)}C${n(x - 6)} ${n(yb - h + 2)} ${n(x - 6)} ${n(yb - h - 1)} ${n(x - 4)} ${n(yb - h - 2)}M${n(x + 4)} ${n(yb - h + 8)}C${n(x + 6)} ${n(yb - h + 5)} ${n(x + 6)} ${n(yb - h + 2)} ${n(x + 4)} ${n(yb - h - 1)}`;
  traits.push({
    role: 'trait',
    d: [cactus(l * 0.12, 14), cactus(l * 0.83, 17), cactus(l * 0.94, 12)].join(' '),
    epaisseur: 1.2,
  });
  // la nuit, la lune veille au-dessus du désert — et deux étoiles en craie
  traits.push({
    role: 'lune',
    d: `M${n(l * 0.86 - 6)} ${n(yb - 38)}A6 6 0 1 0 ${n(l * 0.86 + 6)} ${n(yb - 38)}A6 6 0 1 0 ${n(l * 0.86 - 6)} ${n(yb - 38)}Z`
      + `M${n(l * 0.07)} ${n(yb - 30)}C${n(l * 0.05)} ${n(yb - 32)} ${n(l * 0.09)} ${n(yb - 32)} ${n(l * 0.07)} ${n(yb - 30)}Z`
      + `M${n(l * 0.11)} ${n(yb - 34)}C${n(l * 0.09)} ${n(yb - 36)} ${n(l * 0.13)} ${n(yb - 36)} ${n(l * 0.11)} ${n(yb - 34)}Z`,
  });
  // le saloon et son auvent à festons, les portes à battants
  traits.push({ role: 'toit', d: `M${n(ix - 36)} ${n(yb)}V${n(yb - 22)}H${n(ix + 36)}V${n(yb)}`, epaisseur: 1.1 });
  traits.push({ role: 'trait', d: `M${n(ix - 40)} ${n(yb - 22)}H${n(ix + 40)}`, epaisseur: 1.1 });
  traits.push({ role: 'trait', d: `M${n(ix - 24)} ${n(yb)}V${n(yb - 10)}M${n(ix + 24)} ${n(yb)}V${n(yb - 10)}`, epaisseur: 0.9 });
  traits.push({
    role: 'trait',
    d: `M${n(ix - 8)} ${n(yb)}V${n(yb - 8)}C${n(ix - 8)} ${n(yb - 11)} ${n(ix - 5)} ${n(yb - 11)} ${n(ix - 5)} ${n(yb - 8)}V${n(yb)}`
      + `M${n(ix + 8)} ${n(yb)}V${n(yb - 8)}C${n(ix + 8)} ${n(yb - 11)} ${n(ix + 5)} ${n(yb - 11)} ${n(ix + 5)} ${n(yb - 8)}V${n(yb)}`,
    epaisseur: 0.9,
  });
  // la veilleuse du comptoir, seul or plein de la frise
  traits.push({ role: 'veilleuse', d: `M${n(ix + 16)} ${n(yb - 5)}A2 2 0 1 0 ${n(ix + 20)} ${n(yb - 5)}A2 2 0 1 0 ${n(ix + 16)} ${n(yb - 5)}Z` });
  traits.push({ role: 'trait', d: `M0 ${n(yb)}H${n(l)}`, epaisseur: 1 });
  return traits;
}
