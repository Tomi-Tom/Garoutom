/**
 * La table des gravures des skins — la moitié visuelle du registre.
 *
 * Un skin ne se contente pas de rebaptiser les rôles (la voix,
 * `skins/registre.ts`) : il grave aussi ses propres planches — symboles, dos,
 * coiffes, décor de frise, miniature d'univers. Tout ici est un ajout sur le
 * fond commun de Thiercelieux ; un skin sans entrée dans `GRAVURES` reste
 * entièrement dans ce fond commun, et chaque consultation y replie
 * (symbole par symbole, coiffe par coiffe) tant que les gravures du skin
 * ne sont pas là.
 *
 * Le cri de la nuit tombée reste à l'atelier (`lib/atelier.ts`) : la voix
 * choisit seule, elle n'a pas besoin de cette table.
 */
import { mur, rondpoint, rue, toits, type TraitFrise } from '../caprices/traces.js';
import { paresseux, type ModuleParesseux } from '../../lib/paresseux.js';

import { TRACES_FARWEST, TRACES_GILETSJAUNES, TRACES_SHIGANSHINA, prechargerFinDePartie, type TracesDuSkin } from './traces-paresseuses.js';

/** Le décor de frise d'un skin : son nom (pour `data-decor`) et son tracé. */
export interface DecorFrise {
  nom: string;
  dessiner: (l: number, h: number) => TraitFrise[];
}

/** Le petit détail à l'encre qui distingue une miniature d'univers. */
export type DetailMiniature =
  | { sorte: 'rectangle'; x: number; y: number; largeur: number; hauteur: number }
  | { sorte: 'chemin'; d: string };

/** La miniature d'univers du sélecteur de skins (un carré de 32). */
export interface MiniatureUnivers {
  /** Le chemin de la silhouette, dans un carré de 32. */
  silhouette: string;
  /** La hachure qui remplit la silhouette (les motifs de `textures.svg`). */
  hachure: string;
  /** Le détail posé sur la silhouette, à l'encre pleine. */
  detail: DetailMiniature;
}

/** Ce qu'un skin ajoute au fond commun de Thiercelieux. */
export interface GravuresDuSkin {
  /** Ses gravures, chargées à la demande (repli : celles de Thiercelieux). */
  traces: ModuleParesseux<TracesDuSkin>;
  /** Son décor de frise, jour et nuit. */
  frise: DecorFrise;
  /** Sa miniature d'univers. */
  miniature: MiniatureUnivers;
  /** Vrai quand ses grands symboles tiennent lieu de faces : la face gravée commune ne s'ajoute pas derrière le 128. */
  facesPropres?: boolean;
}

/** Le fond commun : les toits de Thiercelieux, pour tout skin sans gravures propres. */
export const FRISE_COMMUNE: DecorFrise = { nom: 'toits', dessiner: toits };

/** La miniature commune : les toits de Thiercelieux et leur cheminée. */
export const MINIATURE_COMMUNE: MiniatureUnivers = {
  silhouette: 'M0 32 V22 L6 17 L12 22 V20 L17 15 L22 20 V8 L25 4 L28 8 V32 Z',
  hachure: 'url(#hach-2-e)',
  detail: { sorte: 'rectangle', x: 24, y: 11, largeur: 2, hauteur: 3 },
};

/** La table : une entrée par skin à gravures propres ; Thiercelieux est le fond commun, il n'y figure pas. */
const GRAVURES: Readonly<Record<string, GravuresDuSkin>> = {
  shiganshina: {
    traces: TRACES_SHIGANSHINA,
    frise: { nom: 'mur', dessiner: mur },
    miniature: {
      silhouette: 'M0 32 V14 H4 V11 H8 V14 H12 V11 H16 V14 H20 V11 H24 V14 H28 V11 H32 V32 Z',
      hachure: 'url(#hach-x-e)',
      detail: { sorte: 'chemin', d: 'M12 32 V24 A4 4 0 0 1 20 24 V32' },
    },
    facesPropres: true,
  },
  giletsjaunes: {
    traces: TRACES_GILETSJAUNES,
    frise: { nom: 'rondpoint', dessiner: rondpoint },
    miniature: {
      silhouette: 'M2 32V27.6L4.8 27.4V20L8.4 17L12 20V27.2C20 24.8 27 25.2 30.2 26.6V32Z',
      hachure: 'url(#hach-fluo)',
      detail: { sorte: 'rectangle', x: 7.1, y: 24.2, largeur: 2.6, hauteur: 4.9 },
    },
    facesPropres: true,
  },
  farwest: {
    traces: TRACES_FARWEST,
    frise: { nom: 'rue', dessiner: rue },
    miniature: {
      // le chapeau de cow-boy : bords relevés, calotte creuse, le bandeau seul en plein
      silhouette:
        'M2 24C4 21.5 9 20.8 16 20.8C23 20.8 28 21.5 30 24C30 28 24 30.5 16 30.5C8 30.5 2 28 2 24Z M11 24.5V13.5C11 11 13 9.5 16 9.5C19 9.5 21 11 21 13.5V24.5Z',
      hachure: 'url(#hach-or)',
      detail: { sorte: 'rectangle', x: 11, y: 19, largeur: 10, hauteur: 2.5 },
    },
    facesPropres: true,
  },
};

/** Les gravures propres à un skin, s'il en a — sinon le fond commun de Thiercelieux. */
export function gravuresDuSkin(skin: string): GravuresDuSkin | undefined {
  return GRAVURES[skin];
}

/** Les gravures propres au skin : à précharger dès que la table le prend. */
export function prechargerGravures(skin: string): Promise<unknown> {
  return gravuresDuSkin(skin)?.traces.precharger() ?? Promise.resolve();
}

/** Tout ce qui est chargé à la demande (les tests de rendu l'attendent avant de rendre). */
export function prechargerToutesLesTraces(): Promise<unknown> {
  return Promise.all([prechargerFinDePartie(), ...Object.values(GRAVURES).map((g) => g.traces.precharger())]);
}

/**
 * Le module des skins sans gravures propres : il n'est souscrit qu'inactif,
 * il ne charge rien — il n'existe que pour tenir le crochet stable quand la
 * table change de peau en cours de route.
 */
const TRACES_SANS_GRAVURES = paresseux<TracesDuSkin>(() => new Promise(() => {}));

/** S'abonne aux gravures du skin s'il en a (ou du skin de la table), et re-rend à leur arrivée. */
export function useGravuresDuSkin(skin: string | undefined): TracesDuSkin | undefined {
  const gravures = skin !== undefined ? gravuresDuSkin(skin) : undefined;
  return (gravures?.traces ?? TRACES_SANS_GRAVURES).useModule(gravures !== undefined);
}
