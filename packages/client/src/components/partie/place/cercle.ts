/**
 * La géométrie de la place en rond : où poser chaque jeton autour du puits.
 *
 * Sur grand écran, la place n'est plus une grille mais un lieu — les sièges
 * en anneau autour d'un centre, comme on s'assoit autour d'un feu. Le calcul
 * est pur (une largeur, une hauteur, un nombre de sièges), donc testable sans
 * navigateur : jsdom ne mesure rien, mais une fonction se vérifie.
 *
 * Quatre choix :
 *
 * - **le joueur local en bas, au milieu** : c'est sa place à la table, celle
 *   d'où il regarde les autres ; les sièges suivants tournent dans le sens des
 *   aiguilles d'une montre ;
 * - **un anneau un peu carré** (une superellipse), la forme d'une place pavée
 *   plus que d'un compas : il donne plus de tour aux jetons sans cesser d'être
 *   un rond ;
 * - **un espacement égal « en jetons »** : un pas horizontal compte en
 *   largeurs de jeton, un pas vertical en hauteurs — c'est la mesure même du
 *   chevauchement, et elle répartit les jetons au mieux sur les côtés comme
 *   en haut et en bas ;
 * - **le plus grand jeton qui tient** : on essaie du plus large au plus étroit
 *   — en gardant au milieu, si on le demande, la scène où se pose l'action —,
 *   et si même le plus petit chevauche son voisin, on rend `null` : la place
 *   retombe alors sur sa grille, qui ne se chevauche jamais.
 */

/** Un point de la place, en pixels depuis le coin haut gauche du conteneur. */
export interface Point {
  x: number;
  y: number;
}

/** Un rectangle centré sur la place : la scène du milieu. */
export interface Scene {
  largeur: number;
  hauteur: number;
}

export interface Ronde {
  /** Largeur d'un jeton, en pixels. */
  largeur: number;
  /** Hauteur réservée à un jeton (médaillon, nom, mention). */
  hauteur: number;
  /** Diamètre du médaillon. */
  medaillon: number;
  /** Le centre de chaque jeton, dans l'ordre des rangs (0 = en bas, au milieu). */
  points: Point[];
  /** Le centre de la place, et le diamètre du puits qu'on y pose seul (0 : pas la place). */
  centre: Point & { diametre: number };
  /** La scène du milieu, quand on l'a demandée : la plus grande qui tient, bornée. */
  scene: Scene | null;
}

/** Les largeurs essayées, du plus confortable au plus serré. */
const LARGEUR_MAX = 136;
const LARGEUR_MIN = 84;
const PAS = 4;
/** L'air entre deux jetons, et entre un jeton et le bord. */
const AIR = 6;
const MARGE = 6;
/** Finesse de l'échantillonnage de l'anneau pour l'espacement égal. */
const ECHANTILLONS = 720;
/** L'exposant de la superellipse : 2 serait une ellipse, l'infini un rectangle. */
const ARRONDI = 2.6;
/** La plus grande scène qu'on donne au milieu : la largeur d'une lecture. */
const SCENE_MAX: Scene = { largeur: 520, hauteur: 460 };

/** Le médaillon d'un jeton de cette largeur : la moitié, sans descendre sous 44 px au pouce. */
export function medaillonPour(largeur: number): number {
  return Math.max(44, Math.min(68, Math.round(largeur * 0.5)));
}

/** La hauteur d'un jeton : le médaillon, le nom, la mention (« vous »), le rembourrage. */
export function hauteurPour(medaillon: number): number {
  return medaillon + 58;
}

/** Un point de l'anneau au paramètre `theta`, relatif au centre. */
function surAnneau(theta: number, rx: number, ry: number): Point {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    x: rx * Math.sign(c) * Math.abs(c) ** (2 / ARRONDI),
    y: ry * Math.sign(s) * Math.abs(s) ** (2 / ARRONDI),
  };
}

/**
 * `n` points également espacés « en jetons » le long de l'anneau, relatifs au
 * centre, en partant du bas (π/2 : l'axe y descend à l'écran) et en tournant
 * dans le sens des aiguilles d'une montre.
 */
function pointsEquidistants(
  n: number,
  rx: number,
  ry: number,
  largeur: number,
  hauteur: number,
  decalage: number,
): Point[] {
  const depart = Math.PI / 2;
  const echantillons: Point[] = [];
  const cumul: number[] = [0];
  for (let i = 0; i <= ECHANTILLONS; i += 1) {
    const point = surAnneau(depart + (i / ECHANTILLONS) * 2 * Math.PI, rx, ry);
    const precedent = echantillons[i - 1];
    if (precedent !== undefined) {
      const pas = Math.max(Math.abs(point.x - precedent.x) / largeur, Math.abs(point.y - precedent.y) / hauteur);
      cumul.push((cumul[i - 1] ?? 0) + pas);
    }
    echantillons.push(point);
  }
  const total = cumul[ECHANTILLONS] ?? 0;
  const points: Point[] = [];
  let i = 0;
  for (let rang = 0; rang < n; rang += 1) {
    const cible = ((rang + decalage) / n) * total;
    while (i < ECHANTILLONS - 1 && (cumul[i + 1] ?? total) < cible) i += 1;
    const avant = cumul[i] ?? 0;
    const apres = cumul[i + 1] ?? total;
    const part = apres === avant ? 0 : (cible - avant) / (apres - avant);
    const a = echantillons[i] ?? { x: 0, y: 0 };
    const b = echantillons[i + 1] ?? a;
    points.push({ x: a.x + (b.x - a.x) * part, y: a.y + (b.y - a.y) * part });
  }
  return points;
}

/** Deux jetons se chevauchent-ils ? Deux boîtes séparées sur un axe ne se touchent pas. */
function chevauchent(a: Point, b: Point, largeur: number, hauteur: number): boolean {
  return Math.abs(a.x - b.x) < largeur + AIR && Math.abs(a.y - b.y) < hauteur + AIR;
}

/** Une scène centrée tient-elle sans toucher aucun jeton (points relatifs au centre) ? */
function sceneLibre(scene: Scene, points: readonly Point[], largeur: number, hauteur: number): boolean {
  return points.every(
    (p) =>
      Math.abs(p.x) >= scene.largeur / 2 + largeur / 2 + AIR || Math.abs(p.y) >= scene.hauteur / 2 + hauteur / 2 + AIR,
  );
}

/** La scène agrandie tant qu'elle tient : d'abord en largeur, puis en hauteur. */
function agrandir(min: Scene, points: readonly Point[], largeur: number, hauteur: number): Scene {
  let scene = min;
  while (scene.largeur + 8 <= SCENE_MAX.largeur) {
    const plus = { ...scene, largeur: scene.largeur + 8 };
    if (!sceneLibre(plus, points, largeur, hauteur)) break;
    scene = plus;
  }
  while (scene.hauteur + 8 <= SCENE_MAX.hauteur) {
    const plus = { ...scene, hauteur: scene.hauteur + 8 };
    if (!sceneLibre(plus, points, largeur, hauteur)) break;
    scene = plus;
  }
  return scene;
}

/**
 * Pose `n` jetons en anneau dans un conteneur de `largeur` × `hauteur`
 * pixels — ou rend `null` quand la place est trop petite pour un rond lisible.
 * Avec `sceneMin`, l'anneau garde en son milieu au moins cette scène libre.
 */
export function disposerEnCercle(
  n: number,
  largeur: number,
  hauteur: number,
  sceneMin?: Scene | readonly Scene[],
): Ronde | null {
  if (n <= 0 || largeur <= 0 || hauteur <= 0) return null;
  // Plusieurs scènes possibles : une haute pour les places carrées, une
  // large et basse pour les écrans courts. La première qui tient l'emporte.
  const scenes: readonly (Scene | undefined)[] =
    sceneMin === undefined ? [undefined] : Array.isArray(sceneMin) ? sceneMin : [sceneMin as Scene];
  for (let jeton = LARGEUR_MAX; jeton >= LARGEUR_MIN; jeton -= PAS) {
    const medaillon = medaillonPour(jeton);
    const haut = hauteurPour(medaillon);
    const rx = largeur / 2 - jeton / 2 - MARGE;
    const ry = hauteur / 2 - haut / 2 - MARGE;
    // Un anneau plus étroit qu'un jeton n'est plus un rond, c'est une pile.
    if (rx < jeton * 0.9 || ry < haut * 0.6) continue;

    // Le joueur local pile en bas d'abord ; à défaut, décalé d'un demi-pas —
    // un nombre pair de sièges se range parfois mieux de biais.
    for (const decalage of [0, 0.5]) {
      const relatifs = pointsEquidistants(n, rx, ry, jeton + AIR, haut + AIR, decalage);
      if (!sansChevauchement(relatifs, jeton, haut)) continue;
      const scene = scenes.find((s) => s === undefined || sceneLibre(s, relatifs, jeton, haut));
      if (sceneMin !== undefined && scene === undefined) continue;

      const cx = largeur / 2;
      const cy = hauteur / 2;
      // Le puits seul : ce qui reste au milieu de l'anneau.
      const interieur = Math.min(rx - jeton / 2, ry - haut / 2) * 2 - 2 * AIR;
      const diametre = interieur >= 64 ? Math.min(220, Math.round(interieur)) : 0;
      return {
        largeur: jeton,
        hauteur: haut,
        medaillon,
        points: relatifs.map((p) => ({ x: cx + p.x, y: cy + p.y })),
        centre: { x: cx, y: cy, diametre },
        scene: scene === undefined ? null : agrandir(scene, relatifs, jeton, haut),
      };
    }
  }
  return null;
}

/** Aucun jeton de l'anneau ne touche un autre. */
function sansChevauchement(points: readonly Point[], largeur: number, hauteur: number): boolean {
  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      const pa = points[a];
      const pb = points[b];
      if (pa !== undefined && pb !== undefined && chevauchent(pa, pb, largeur, hauteur)) return false;
    }
  }
  return true;
}

/**
 * Le rang d'un siège autour de la place : le joueur local au rang 0 (en bas),
 * les autres à sa suite dans l'ordre des sièges. Un spectateur regarde depuis
 * le siège 0.
 */
export function rangAutourDe(seat: number, moi: number | null, total: number): number {
  const origine = moi ?? 0;
  return (((seat - origine) % total) + total) % total;
}
