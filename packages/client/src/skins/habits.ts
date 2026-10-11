/**
 * La table « matière » des skins — l'habit visuel, côté couleurs.
 *
 * `docs/SKINS.md` (« la frontière des couleurs ») veut que la palette
 * appartienne au skin sans que l'architecture sémantique bouge : un accent
 * par camp (`lanterne` pour le village, `sang` pour le camp qui chasse), une
 * encre neutre (`papier`), le fond qui ne change pas entre nuit et jour.
 * Les dix noms ci-dessous sont ceux des variables de `styles.css`.
 *
 * Cette table est la source des valeurs ; `styles.css` (section `[data-skin]`)
 * les recopie en CSS, un test les compare — une palette ne se maintient pas à
 * deux endroits sans garde-fou.
 *
 * Contrastes mesurés (WCAG, luminance relative), texte courant AA ≥ 4,5 :
 *
 * Thiercelieux — sur nuit / nuit-relief
 *   papier 13,82 / 11,95 · papier-doux 7,44 / 6,44 · lune 8,03 / 6,95
 *   lanterne 7,27 / 6,29 · sang 5,06 / 4,38 (4,38 : réservé aux grands
 *   titres et pictogrammes sur le relief, AA 3:1) · serment 7,81 / 6,75
 *   encre nuit sur papier (cartes) 13,82 · nuit-creux sur lanterne (bouton) 7,86
 *
 * Shiganshina — sur nuit / nuit-relief
 *   papier 13,95 / 12,53 · papier-doux 7,38 / 6,63 · lune 8,55 / 7,68
 *   lanterne (vert du Bataillon) 8,56 / 7,69 · sang (rouge Titan) 5,83 / 5,04
 *   serment 6,81 / 6,11
 *   encre nuit sur papier 13,95 · nuit-creux sur lanterne (bouton) 9,19
 *   Le rouge Titan est éclairci (#e9715b) pour passer AA sur le relief
 *   aussi : 5,83 sur nuit, 5,04 sur nuit-relief.
 */

export interface PaletteSkin {
  /** Le fond de la table. */
  nuit: string;
  /** Tiroirs, champs : plus creux que le fond. */
  nuitCreux: string;
  /** Panneaux et cartes : plus clair que le fond. */
  nuitRelief: string;
  /** L'encre principale et le recto des cartes. */
  papier: string;
  papierDoux: string;
  /** La voix neutre du narrateur (lune à Thiercelieux, pierre des murs à Shiganshina). */
  lune: string;
  /** L'accent du village. */
  lanterne: string;
  /** L'accent du camp qui chasse. */
  sang: string;
  /** Aplat sombre du même camp (liserés, fonds), jamais du texte. */
  sangCreux: string;
  /** Le lien des amoureux. */
  serment: string;
}

export const PALETTES: Readonly<Record<string, PaletteSkin>> = {
  thiercelieux: {
    nuit: '#131726',
    nuitCreux: '#0c0f19',
    nuitRelief: '#1b2133',
    papier: '#ece3cd',
    papierDoux: '#b0a68f',
    lune: '#aab4c8',
    lanterne: '#e6a852',
    sang: '#dd5f52',
    sangCreux: '#8c2f28',
    serment: '#cf8f96',
  },
  shiganshina: {
    nuit: '#161a1a', // pierre des murs, à la tombée du jour
    nuitCreux: '#0e1111',
    nuitRelief: '#212727',
    papier: '#ebe4d0', // parchemin des ordres de la garnison
    papierDoux: '#aea995',
    lune: '#a8b2aa', // pierre claire
    lanterne: '#86b45e', // le vert du manteau du Bataillon d'exploration
    sang: '#e9715b', // le rouge Titan, vapeur et chair
    sangCreux: '#8f2e22',
    serment: '#d1a574', // cuir et laiton des harnais
  },
};

/** La palette d'un skin ; un inconnu retombe sur Thiercelieux (règle d'or n° 4). */
export function paletteDuSkin(id: string): PaletteSkin {
  return PALETTES[id] ?? PALETTES['thiercelieux']!;
}
