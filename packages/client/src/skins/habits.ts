/**
 * La table « matière » des skins — l'habit visuel, côté encres (SPEC
 * Caprices § 3.1, § 3.3, § 8).
 *
 * Trois niveaux, comme dans `styles.css` (§ 3.10) :
 *
 * 1. les **encres** (primitifs `--cp-*`) : un jeu par skin, le seul niveau
 *    qu'un skin surcharge ;
 * 2. les **sémantiques** (`--fond`, `--encre`, `--camp-meute`…), un jeu par
 *    **tirage** : papier le jour, cuivre la nuit et la révélation — ou à
 *    toute heure si le réglage local « Cuivre » est choisi ;
 * 3. les composants, qui ne connaissent que les sémantiques.
 *
 * Cette table est la source des valeurs ; `styles.css` les recopie en CSS et
 * `contraste.test.ts` vérifie à la fois la recopie et chaque paire du § 3.4
 * (WCAG 2.x, luminance relative) pour chaque skin. Une palette ne se
 * maintient pas à deux endroits sans garde-fou.
 *
 * Contrastes de référence (Thiercelieux / Shiganshina), texte AA ≥ 4,5 :
 *
 *   Papier — sur vergé · bruni · teinte
 *     encre      13,95 · 16,13 · 12,93   /  13,78 · 15,81 · 12,66
 *     délavé      5,51 ·  6,38 ·  5,11   /   5,54 ·  6,35 ·  5,09
 *     sanguine    4,97 ·  5,75 ·  4,61   /   4,99 ·  5,73 ·  4,59
 *     garance     5,58 ·  6,45 ·  5,17   /   5,60 ·  6,43 ·  5,15
 *     palier-2    3,66 ·  4,23 ·  3,39 (non-texte ≥ 3)
 *   Cuivre — sur bistre-900 · bistre-800 · palier-3
 *     vergé      13,95 · 11,57 ·  7,35   /  13,78 · 11,15 ·  7,38
 *     palier-1    6,92 ·  5,74            /   6,81 ·  5,51
 *     craie       5,89 ·  4,88            /   5,79 ·  4,69
 *     garance     7,84 ·  6,51            /   7,72 ·  6,24
 *     palier-2    3,81 ·  3,16 (non-texte ≥ 3)
 */

/** Les deux tirages d'une même planche (§ 3.2). */
export type Tirage = 'papier' | 'cuivre';

/** Les encres d'un skin : les primitifs du § 3.1. */
export interface Encres {
  /** L'encre ; la nuit pleine (palier IV) : texte du papier, fond du cuivre. */
  bistre900: string;
  /** Le cuivre en relief : surfaces de nuit (barre, feuille, cartouche). */
  bistre800: string;
  /** Morsure III : aplats de nuit, bouton primaire de nuit. */
  palier3: string;
  /** Morsure II : filets non-texte, crans vides, contour des morts. */
  palier2: string;
  /** Morsure I : texte secondaire de nuit, silhouette des morts. */
  palier1: string;
  /** L'encre délavée : texte secondaire du jour, narrateur, au-delà. */
  delave: string;
  /** La teinte de planche : intérieur de la cuvette, creux du jour. */
  teinte: string;
  /** Le papier vergé : fond du jour, texte de nuit. */
  verge: string;
  /** Le blanc bruni : surfaces du jour. */
  bruni: string;
  /** La sanguine d'encre : la meute, sur papier. */
  sanguine: string;
  /** La sanguine de craie : la meute, sur cuivre. */
  craie: string;
  /** La laque de garance : le serment, sur papier. */
  garanceEncre: string;
  /** La garance pâle : le serment, sur cuivre. */
  garanceCraie: string;
  /** La rousseur : décor du papier seulement (≤ 8 %), jamais de texte. */
  rousseur: string;
  /** Le creux d'un champ de saisie, la nuit. */
  creuxNuit: string;
  /** Le vert du Bataillon (Shiganshina) : en hachure seulement, jamais en aplat ni en texte. */
  hachureSkin: string;
}

/** Le nom de la variable CSS de chaque encre (`styles.css`, niveau 1). */
export const VARIABLES_ENCRES: Readonly<Record<keyof Encres, string>> = {
  bistre900: '--cp-bistre-900',
  bistre800: '--cp-bistre-800',
  palier3: '--cp-palier-3',
  palier2: '--cp-palier-2',
  palier1: '--cp-palier-1',
  delave: '--cp-delave',
  teinte: '--cp-teinte',
  verge: '--cp-verge',
  bruni: '--cp-bruni',
  sanguine: '--cp-sanguine',
  craie: '--cp-craie',
  garanceEncre: '--cp-garance-encre',
  garanceCraie: '--cp-garance-craie',
  rousseur: '--cp-rousseur',
  creuxNuit: '--cp-creux-nuit',
  hachureSkin: '--cp-hachure-skin',
};

const THIERCELIEUX: Encres = {
  bistre900: '#17130F',
  bistre800: '#2A241E',
  palier3: '#4A433B',
  palier2: '#7A7064',
  palier1: '#A89D8C',
  delave: '#5E554A',
  teinte: '#E1D7C1',
  verge: '#E8DFCB',
  bruni: '#F5EFE2',
  sanguine: '#A23B24',
  craie: '#D9765A',
  garanceEncre: '#8A3A5C',
  garanceCraie: '#D29AA6',
  rousseur: '#8C6A3F',
  creuxNuit: '#0F0C09',
  // Thiercelieux n'a pas de hachure de couleur : l'encre seule.
  hachureSkin: '#17130F',
};

/**
 * Shiganshina (§ 8) : *Les Désastres de la guerre*. Ne changent que l'encre
 * (noir de fumée), le papier (de munition) et le relief ; la sanguine reste
 * la vapeur des Titans, la garance le pacte. Le vert du Bataillon n'existe
 * qu'en hachure (`hach-vert`).
 */
const SHIGANSHINA: Encres = {
  ...THIERCELIEUX,
  bistre900: '#141614',
  bistre800: '#262926',
  teinte: '#DCD7CA',
  verge: '#E4E0D4',
  bruni: '#F1EFE8',
  hachureSkin: '#45523F',
};

/**
 * Gilets Jaunes : goudron et fluo. Le jour se lit sur papier kraft de tract ;
 * la nuit est en goudron, bitume bleu-noir de départementale. La sanguine
 * devient le bleu d'uniforme — la craie le même bleu, passé à la lampe des
 * gyrophares ; la garance garde le rose-orangé fluo des tourtereaux.
 */
const GILETS_JAUNES: Encres = {
  bistre900: '#101318',
  bistre800: '#1D232D',
  palier3: '#39434F',
  palier2: '#67707C',
  palier1: '#A6B0BD',
  delave: '#5A5245',
  teinte: '#D8D3BE',
  verge: '#E6DDC4',
  bruni: '#F1EBDB',
  sanguine: '#24476E',
  craie: '#9EB9DA',
  garanceEncre: '#8E3E53',
  garanceCraie: '#EBA3B2',
  rousseur: '#7E5A33',
  creuxNuit: '#0A0C10',
  // Le fluo du gilet — hachure seule, jamais en aplat ni en texte : le pattern
  // `hach-fluo` de `textures.svg` en tire les bandeaux, et les composants de
  // gravure encrent le jeton `$fluo` au moyen de `--cp-hachure-skin`.
  hachureSkin: '#E8C81A',
};

export const ENCRES: Readonly<Record<string, Encres>> = {
  thiercelieux: THIERCELIEUX,
  shiganshina: SHIGANSHINA,
  giletsjaunes: GILETS_JAUNES,
};

/** Les encres d'un skin ; un inconnu retombe sur Thiercelieux (règle d'or n° 4). */
export function encresDuSkin(id: string): Encres {
  return ENCRES[id] ?? THIERCELIEUX;
}

/** Les sémantiques du § 3.3 — les seuls noms qu'un composant connaisse. */
export interface Semantiques {
  fond: string;
  fondPlanche: string;
  surface: string;
  creux: string;
  encre: string;
  encre2: string;
  encreNarrateur: string;
  filet: string;
  filetDoux: string;
  surEncre: string;
  campVillage: string;
  campMeute: string;
  campSerment: string;
  canalAudela: string;
  etatMortTrait: string;
  etatMortTexte: string;
  etatFocus: string;
  actionFond: string;
  actionTexte: string;
  actionBord: string;
}

/**
 * Les sémantiques d'un skin pour un tirage : le miroir exact des deux blocs
 * `[data-tirage]` de `styles.css` (§ 3.10).
 */
export function semantiques(encres: Encres, tirage: Tirage): Semantiques {
  const e = encres;
  if (tirage === 'papier') {
    return {
      fond: e.verge,
      fondPlanche: e.teinte,
      surface: e.bruni,
      creux: e.teinte,
      encre: e.bistre900,
      encre2: e.delave,
      encreNarrateur: e.delave,
      filet: e.bistre900,
      filetDoux: e.palier2,
      surEncre: e.bruni,
      campVillage: e.bistre900,
      campMeute: e.sanguine,
      campSerment: e.garanceEncre,
      canalAudela: e.delave,
      etatMortTrait: e.palier2,
      etatMortTexte: e.delave,
      etatFocus: e.bistre900,
      actionFond: e.bistre900,
      actionTexte: e.bruni,
      actionBord: e.bistre900,
    };
  }
  return {
    fond: e.bistre900,
    fondPlanche: e.bistre900,
    surface: e.bistre800,
    creux: e.creuxNuit,
    encre: e.verge,
    encre2: e.palier1,
    encreNarrateur: e.palier1,
    filet: e.palier2,
    filetDoux: e.palier3,
    surEncre: e.bistre900,
    campVillage: e.verge,
    campMeute: e.craie,
    campSerment: e.garanceCraie,
    canalAudela: e.palier1,
    etatMortTrait: e.palier2,
    etatMortTexte: e.palier1,
    etatFocus: e.verge,
    actionFond: e.palier3,
    actionTexte: e.verge,
    actionBord: e.palier1,
  };
}

/** Une paire texte / fond autorisée (§ 3.4) et son plancher de contraste. */
export interface PaireContraste {
  tirage: Tirage;
  texte: keyof Encres;
  fond: keyof Encres;
  /** 4,5 pour du texte (AA), 3 pour un trait porteur d'information. */
  minimum: 4.5 | 3;
  emploi: string;
}

/**
 * Les paires **en gras** du § 3.4 (texte, AA ≥ 4,5), plus les traits
 * non-texte (≥ 3) et les textes posés sur un aplat. Toute paire absente de
 * cette liste est interdite pour du texte.
 */
export const PAIRES_CONTRASTE: readonly PaireContraste[] = [
  ...(['verge', 'bruni', 'teinte'] as const).flatMap((fond) => [
    { tirage: 'papier', texte: 'bistre900', fond, minimum: 4.5, emploi: 'tout texte' } as const,
    { tirage: 'papier', texte: 'delave', fond, minimum: 4.5, emploi: 'texte secondaire ≥ 12 px' } as const,
    { tirage: 'papier', texte: 'sanguine', fond, minimum: 4.5, emploi: 'texte meute ≥ 14 px (600)' } as const,
    { tirage: 'papier', texte: 'garanceEncre', fond, minimum: 4.5, emploi: 'texte serment ≥ 14 px' } as const,
    { tirage: 'papier', texte: 'palier2', fond, minimum: 3, emploi: 'non-texte : filets, crans, morts' } as const,
  ]),
  { tirage: 'papier', texte: 'bruni', fond: 'bistre900', minimum: 4.5, emploi: 'bouton primaire' },
  { tirage: 'papier', texte: 'bruni', fond: 'sanguine', minimum: 4.5, emploi: 'cartouche « Seul » plein' },
  { tirage: 'papier', texte: 'bruni', fond: 'garanceEncre', minimum: 4.5, emploi: 'aplat du serment' },
  ...(['bistre900', 'bistre800', 'palier3'] as const).map(
    (fond) => ({ tirage: 'cuivre', texte: 'verge', fond, minimum: 4.5, emploi: 'tout texte' }) as const,
  ),
  ...(['bistre900', 'bistre800'] as const).flatMap((fond) => [
    { tirage: 'cuivre', texte: 'palier1', fond, minimum: 4.5, emploi: 'texte secondaire' } as const,
    { tirage: 'cuivre', texte: 'craie', fond, minimum: 4.5, emploi: 'texte meute ≥ 14 px (600)' } as const,
    { tirage: 'cuivre', texte: 'garanceCraie', fond, minimum: 4.5, emploi: 'texte serment' } as const,
    { tirage: 'cuivre', texte: 'palier2', fond, minimum: 3, emploi: 'non-texte : filets, crans' } as const,
  ]),
];

/** Luminance relative WCAG 2.x d'une couleur `#RRGGBB`. */
export function luminance(hex: string): number {
  const canal = (i: number): number => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** Rapport de contraste WCAG 2.x entre deux couleurs `#RRGGBB`. */
export function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (clair + 0.05) / (sombre + 0.05);
}
