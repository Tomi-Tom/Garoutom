/**
 * La carte d'un rôle (SPEC § 5.2), en « planche typographique » (§ 9, v1) :
 * dans la cuvette de cuivre, le symbole 128 sur la hachure H1 (le village) ou
 * sur l'aquatinte (la meute), le numéro de planche, le cartouche du camp, le
 * nom, et la légende du graveur quand le skin la fournit. Le dos est unique :
 * le dormeur du Caprice 43 dans son ovale bruni (la Porte du district à
 * Shiganshina).
 *
 * Deux tirages : papier (la face imprimée — révélation, verdict, distribution)
 * et cuivre (la plaque avant l'impression, sombre par nature — Ma carte la
 * nuit). Le tirage est posé sur la carte elle-même (`data-tirage`) : la carte
 * garde ses encres quel que soit l'écran qui la porte.
 *
 * Le retournement s'imprime (SPEC § 3.9, `--m-impression`) : la face paraît en
 * deux crans de 60 ms ; qui demande moins de mouvement la voit venir en un
 * fondu de 120 ms. Elle se recache en une image (`--m-reencrer`).
 *
 * Arbitrage n° 3 : toutes les faces papier ont la même luminance moyenne
 * (± 3 %, vérifié par `luminance.test.tsx`). Le loup se lit au trait mordu et
 * à la sanguine : sur la face, ses masses s'impriment au palier I et
 * l'aquatinte de son fond est dosée (`DENSITE_AQUATINTE`) ; le Loup Blanc s'y
 * tient en réserve, sans la masse qui l'entoure dans le symbole, sa figure
 * brunie jusqu'au blanc pour rendre la clarté que lui prend le cartouche plein.
 */
import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

import { campOf, type RoleId } from '@garoutom/engine';

import { useSkinId, useVoix } from '../../lib/partie.js';
import { voixDuSkin, type Voix } from '../../skins/registre.js';
import { gravuresDuSkin, useGravuresDuSkin } from './gravures.js';
import { niveauSymbole, traceSymbole } from './Symbole.js';
import { CARTOUCHES, DOS, FONDS_IMAGE, type FormatCarte } from './traces/cartes.js';
import { NUMEROS, SYMBOLES_FACE } from './traces/symboles.js';
import { useTrace, type Noeud } from './Trace.js';

export type TirageCarte = 'papier' | 'cuivre';

export interface CarteRoleProps {
  /** `null` : carte inconnue, le dos seul se montre. */
  role: RoleId | null;
  /** Face visible. Le passage de false à true imprime la face (reduced-motion respecté). */
  retournee: boolean;
  taille?: 'petite' | 'moyenne' | 'grande';
  /** Le tirage de la face. Défaut : papier. */
  tirage?: TirageCarte;
  /** Le tirage du dos, s'il diffère (la révélation : dos de cuivre, face de papier). Défaut : `tirage`. */
  tirageDos?: TirageCarte;
  /** La description du rôle, sous la carte (jamais sur la carte, SPEC § 5.2). Défaut : vrai en `grande`. */
  avecDescription?: boolean;
  /** La légende du graveur, si le skin la fournit. Défaut : vrai sauf en `petite`. */
  avecLegende?: boolean;
  /** Carte d'un mort : brunie — plus de hachure, le trait au palier II. */
  morte?: boolean;
  /** Rend la carte cliquable (bouton accessible) — ex. retourner à la révélation. */
  onClic?: () => void;
  className?: string;
  /** Le skin dont la carte porte les mots et la gravure. Défaut : celui de la table. */
  skin?: string;
  /**
   * La carte prend toute la largeur de son conteneur, au-delà de sa taille
   * nominale (la révélation l'ajuste à la zone qui la porte). Défaut : elle ne
   * dépasse jamais sa taille nominale.
   */
  pleineLargeur?: boolean;
}

/* ------------------------------------------------------------------ */
/* Géométrie (cartes.mjs du lot C : carteGrande, carteMoyenne, cartePetite) */
/* ------------------------------------------------------------------ */

type Boite = readonly [x: number, y: number, w: number, h: number];
interface Format {
  W: number;
  H: number;
  cuvette: Boite;
  /** Cadre de l'image (absent en petite : le fond y est un rectangle sans filet). */
  image: Boite | null;
  ovale: readonly [cx: number, cy: number, rx: number, ry: number];
  symbole: readonly [x: number, y: number, taille: number];
  cartel: Boite | null;
  cartouche: Boite;
  fsCartouche: number;
  nom: { y: number; h: number; fs: number; fsLong: number; lh: number };
  legende: { y: number; lh: number; fs: number } | null;
}
const FORMATS: Record<FormatCarte, Format> = {
  grande: {
    W: 300, H: 420, cuvette: [12, 12, 276, 396], image: [24, 24, 252, 264], ovale: [150, 154, 96, 112],
    symbole: [86, 88, 128], cartel: [244, 24, 32, 24], cartouche: [84, 275, 132, 26], fsCartouche: 14,
    nom: { y: 306, h: 36, fs: 28, fsLong: 24, lh: 36 }, legende: { y: 346, lh: 20, fs: 16 },
  },
  moyenne: {
    W: 216, H: 302, cuvette: [8, 8, 200, 286], image: [16, 16, 184, 168], ovale: [108, 100, 66, 72],
    symbole: [60, 50, 96], cartel: [176, 16, 24, 22], cartouche: [58, 173, 100, 22], fsCartouche: 12,
    nom: { y: 202, h: 32, fs: 24, fsLong: 20, lh: 32 }, legende: { y: 236, lh: 20, fs: 16 },
  },
  petite: {
    W: 96, H: 134, cuvette: [6, 6, 84, 122], image: null, ovale: [48, 37, 29, 25],
    symbole: [24, 13, 48], cartel: null, cartouche: [14, 101, 68, 20], fsCartouche: 12,
    nom: { y: 66, h: 34, fs: 16, fsLong: 16, lh: 16 }, legende: null,
  },
};

/* ------------------------------------------------------------------ */
/* Encres, par tirage (SPEC § 3.3 ; repli : les primitifs du § 3.1)    */
/* ------------------------------------------------------------------ */

interface Encres {
  carte: string;
  cuvette: string;
  filetCarte: string;
  arete: string;
  areteInterieure: string;
  cadre: string;
  encre: string;
  encre2: string;
  narr: string;
  meute: string;
  serment: string;
  surEncre: string;
  masse: string;
  mortTrait: string;
  mortTexte: string;
  surface: string;
}
const ENCRES: Record<TirageCarte, Encres> = {
  papier: {
    carte: 'var(--surface, #F5EFE2)',
    cuvette: 'var(--fond-planche, #E1D7C1)',
    filetCarte: 'var(--filet-doux, #7A7064)',
    arete: 'var(--encre, #17130F)',
    areteInterieure: 'var(--encre, #17130F)',
    cadre: 'var(--encre, #17130F)',
    encre: 'var(--encre, #17130F)',
    encre2: 'var(--encre-2, #5E554A)',
    narr: 'var(--encre-narrateur, #5E554A)',
    meute: 'var(--camp-meute, #A23B24)',
    serment: 'var(--camp-serment, #8A3A5C)',
    surEncre: 'var(--sur-encre, #F5EFE2)',
    // Arbitrage n° 3 : sur la face imprimée, les masses de la meute sont au palier I.
    masse: 'var(--cp-palier-1, #A89D8C)',
    mortTrait: 'var(--etat-mort-trait, #7A7064)',
    mortTexte: 'var(--etat-mort-texte, #5E554A)',
    surface: 'var(--surface, #F5EFE2)',
  },
  cuivre: {
    carte: 'var(--surface, #2A241E)',
    cuvette: 'var(--surface, #2A241E)',
    filetCarte: 'var(--filet-doux, #4A433B)',
    arete: 'var(--filet-doux, #4A433B)',
    areteInterieure: 'var(--surface, #2A241E)',
    cadre: 'var(--filet-doux, #4A433B)',
    encre: 'var(--encre, #E8DFCB)',
    encre2: 'var(--encre-2, #A89D8C)',
    narr: 'var(--encre-narrateur, #A89D8C)',
    meute: 'var(--camp-meute, #D9765A)',
    serment: 'var(--camp-serment, #D29AA6)',
    surEncre: 'var(--sur-encre, #17130F)',
    masse: 'var(--cp-palier-3, #4A433B)',
    mortTrait: 'var(--etat-mort-trait, #7A7064)',
    mortTexte: 'var(--etat-mort-texte, #A89D8C)',
    surface: 'var(--surface, #2A241E)',
  },
};

/**
 * Densité de l'aquatinte du fond (facteur sur l'opacité du lot C), par rôle de
 * la meute, sur la face papier : calibrée pour que la face ait la luminance
 * moyenne du village (arbitrage n° 3, `luminance.test.tsx`).
 */
export const DENSITE_AQUATINTE: Partial<Record<RoleId, number>> = { loup: 0.27, loupBlanc: 0 };

type Cartouche = 'ecu' | 'mordu' | 'mordu2';
/** La forme du cartouche : le Loup Blanc chasse avec la meute, mais il est seul (R98). */
function formeDuCamp(role: RoleId): Cartouche {
  if (role === 'loupBlanc') return 'mordu2';
  return campOf(role) === 'loups' ? 'mordu' : 'ecu';
}

/**
 * Le mot du cartouche, tiré du nom de camp du skin sans son article :
 * « le village » → « Village », « les Titans » → « Titans ». Le Loup Blanc
 * porte « Seul » dans les deux habits (SPEC § 5.3, § 8).
 */
export function motDuCartouche(role: RoleId, voix: Voix): string {
  if (role === 'loupBlanc') return 'Seul';
  const nom = voix.nomCamp(campOf(role)).replace(/^(les|le|la|l['’])\s*/i, '');
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

/* ------------------------------------------------------------------ */
/* La gravure de la face (sans texte)                                  */
/* ------------------------------------------------------------------ */

export interface FaceGraveeProps {
  role: RoleId;
  format: FormatCarte;
  tirage: TirageCarte;
  skin: string;
  morte?: boolean;
  /** Occupe son conteneur (la carte) plutôt que sa taille nominale. */
  pleineTaille?: boolean;
}

/** La face d'une carte, sans ses mots : papier, cuvette, image, cartel, cartouche. */
export function FaceGravee({ role, format, tirage, skin, morte = false, pleineTaille = false }: FaceGraveeProps) {
  const f = FORMATS[format];
  const e = ENCRES[tirage];
  const papier = tirage === 'papier';
  const forme = formeDuCamp(role);
  const meute = forme !== 'ecu';
  const seul = forme === 'mordu2';
  const trait = morte ? e.mortTrait : e.encre;

  const fond = papier && !morte ? FONDS_IMAGE[format][meute ? 'meute' : 'village'] : undefined;
  const traceFond = useTrace(fond, { encre: e.encre });

  const [sx, sy, st] = f.symbole;
  const niveau = niveauSymbole(st);
  useGravuresDuSkin(skin);
  const face: Noeud | undefined =
    papier && !morte && niveau === '128' && gravuresDuSkin(skin)?.facesPropres !== true
      ? SYMBOLES_FACE[role]
      : undefined;
  // Le Loup Blanc est « mordu, bruni » (SPEC § 6.1) : sur la face imprimée, sa
  // figure en réserve est brunie jusqu'au blanc — ce qui rend à la planche la
  // clarté que lui prend son cartouche plein (arbitrage n° 3).
  const brunie = role === 'loupBlanc' && papier && !morte;
  const traceSym = useTrace(face ?? traceSymbole(role, skin, niveau), {
    reserve: brunie ? e.surface : e.cuvette,
    meute: morte ? trait : e.meute,
    serment: morte ? trait : e.serment,
    masse: morte ? trait : e.masse,
  });
  const [cx, cy, cw, ch] = f.cuvette;
  const [ox, oy, orx, ory] = f.ovale;
  const numero = NUMEROS[role] ?? 0;

  // La cuvette (SPEC § 4.4 ; cuvetteSvg du lot C) : arêtes mordues pour la meute.
  let cuvette: ReactNode;
  if (papier) {
    const sombre = (
      <path
        d={`M${cx} ${cy + ch}V${cy}H${cx + cw}`}
        fill="none"
        style={{ stroke: e.arete }}
        strokeOpacity={meute ? 0.6 : 0.38}
        strokeWidth={meute ? 1.4 : 1}
      />
    );
    const clair = <path d={`M${cx + cw} ${cy}V${cy + ch}H${cx}`} fill="none" style={{ stroke: e.surface }} strokeWidth={1.5} />;
    const interieur = (
      <rect
        x={cx + 2.5}
        y={cy + 2.5}
        width={cw - 5}
        height={ch - 5}
        fill="none"
        style={{ stroke: e.areteInterieure }}
        strokeOpacity={seul ? 0.45 : 0.14}
        strokeWidth={1}
      />
    );
    cuvette = (
      <>
        <rect x={cx} y={cy} width={cw} height={ch} style={{ fill: e.cuvette }} />
        {meute ? <g filter="url(#mordu)">{sombre}{clair}</g> : <>{sombre}{clair}</>}
        {seul ? <g filter="url(#mordu)">{interieur}</g> : interieur}
      </>
    );
  } else {
    const arete = <rect x={cx + 0.5} y={cy + 0.5} width={cw - 1} height={ch - 1} fill="none" style={{ stroke: e.arete }} strokeWidth={1} />;
    const interieur = (
      <rect
        x={cx + 3.5}
        y={cy + 3.5}
        width={cw - 7}
        height={ch - 7}
        fill="none"
        style={{ stroke: seul ? e.cadre : e.areteInterieure }}
        strokeWidth={1}
      />
    );
    cuvette = (
      <>
        <rect x={cx} y={cy} width={cw} height={ch} style={{ fill: e.cuvette }} />
        {meute ? <g filter="url(#mordu)">{arete}</g> : arete}
        {seul ? <g filter="url(#mordu)">{interieur}</g> : interieur}
      </>
    );
  }

  // L'image : le fond (hachure ou aquatinte, l'ovale en réserve), ses filets, le symbole.
  let image: ReactNode;
  const densite = meute ? (DENSITE_AQUATINTE[role] ?? 1) : 1;
  if (f.image !== null) {
    const [ix, iy, iw, ih] = f.image;
    const cadre = morte ? e.mortTrait : e.cadre;
    image = papier ? (
      <>
        {traceFond !== null && (meute ? <g opacity={densite}>{traceFond}</g> : traceFond)}
        <rect x={ix + 0.4} y={iy + 0.4} width={iw - 0.8} height={ih - 0.8} fill="none" style={{ stroke: cadre }} strokeWidth={0.75} />
        <ellipse cx={ox} cy={oy} rx={orx} ry={ory} fill="none" style={{ stroke: cadre }} strokeWidth={1} />
        <ellipse cx={ox} cy={oy} rx={orx - 3.5} ry={ory - 3.5} fill="none" style={{ stroke: cadre }} strokeWidth={0.5} />
      </>
    ) : (
      <>
        <rect x={ix + 0.5} y={iy + 0.5} width={iw - 1} height={ih - 1} fill="none" style={{ stroke: cadre }} strokeWidth={1} />
        <ellipse cx={ox} cy={oy} rx={orx} ry={ory} fill="none" style={{ stroke: cadre }} strokeWidth={1} />
      </>
    );
  } else if (papier) {
    image = morte ? (
      <ellipse cx={ox} cy={oy} rx={orx} ry={ory} fill="none" style={{ stroke: e.mortTrait }} strokeWidth={0.6} />
    ) : (
      <>
        {traceFond !== null && (meute ? <g opacity={densite}>{traceFond}</g> : traceFond)}
        <ellipse cx={ox} cy={oy} rx={orx} ry={ory} style={{ fill: e.cuvette }} />
      </>
    );
  }

  // Le cartouche du camp (SPEC § 5.3) : sa forme ici, son mot en surimpression HTML.
  const [kx, ky] = f.cartouche;
  const cartoucheFill = seul && papier && !morte ? e.meute : e.surface;
  const cartoucheTrait = morte ? e.mortTrait : meute ? e.meute : e.encre;

  return (
    <svg
      aria-hidden="true"
      width={pleineTaille ? '100%' : f.W}
      height={pleineTaille ? '100%' : f.H}
      viewBox={`0 0 ${String(f.W)} ${String(f.H)}`}
      style={{ display: 'block' }}
      data-face-gravee={format}
    >
      {/* le papier de la carte (papierCarte du lot C) */}
      <rect width={f.W} height={f.H} style={{ fill: e.carte }} />
      {papier && (
        <>
          <rect width={f.W} height={f.H} fill="url(#verge)" />
          <g style={{ fill: 'var(--cp-rousseur, #8C6A3F)' }}>
            <circle cx={Math.round(f.W * 0.83)} cy={Math.round(f.H * 0.06 + numero)} r={3} opacity={0.06} />
            <circle cx={Math.round(f.W * 0.08)} cy={Math.round(f.H * 0.93)} r={2} opacity={0.07} />
          </g>
        </>
      )}
      <rect x={0.5} y={0.5} width={f.W - 1} height={f.H - 1} fill="none" style={{ stroke: e.filetCarte }} strokeWidth={1} />
      {cuvette}
      {image}
      <svg x={sx} y={sy} width={st} height={st} viewBox="0 0 32 32" overflow="visible" style={{ color: trait }}>
        {traceSym}
      </svg>
      {f.cartel !== null && (
        <rect
          x={f.cartel[0]}
          y={f.cartel[1]}
          width={f.cartel[2]}
          height={f.cartel[3]}
          style={{ fill: e.cuvette, stroke: morte ? e.mortTrait : e.cadre }}
          strokeWidth={0.75}
        />
      )}
      <path
        d={CARTOUCHES[format][forme]}
        transform={`translate(${String(kx)} ${String(ky)})`}
        style={{ fill: cartoucheFill, stroke: cartoucheTrait }}
        strokeWidth={meute ? 2 : 1.5}
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/**
 * Le dos unique (300 × 420, mis à l'échelle de la carte). La Porte du district
 * est chargée à la demande avec les autres gravures de Shiganshina : en
 * l'attendant, le dormeur du tirage.
 */
function DosGrave({ tirage, skin, cache }: { tirage: TirageCarte; skin: string; cache: boolean }) {
  const gravures = useGravuresDuSkin(skin);
  const dos = gravures?.dos ?? DOS[tirage];
  const trace = useTrace(dos.trace, {});
  return (
    <svg
      {...(cache ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'carte face cachée' })}
      width="100%"
      height="100%"
      viewBox={dos.viewBox}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {trace}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* La carte                                                            */
/* ------------------------------------------------------------------ */

/** Une boîte HTML posée sur la gravure, en coordonnées de la carte. */
function boite(f: Format, x: number, y: number, w: number, h: number): CSSProperties {
  return {
    position: 'absolute',
    left: `${String((x / f.W) * 100)}%`,
    top: `${String((y / f.H) * 100)}%`,
    width: `${String((w / f.W) * 100)}%`,
    height: `${String((h / f.H) * 100)}%`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    margin: 0,
    overflow: 'hidden',
  };
}
/** Une taille de caractère en unités de la carte (elle suit la largeur de la carte). */
const corps = (f: Format, px: number): string => `${String((px / f.W) * 100)}cqw`;

const FELL = 'var(--font-identite, "IM Fell French Canon", Georgia, serif)';
const SERIF = 'var(--font-corps, "Source Serif 4", Georgia, serif)';

/** L'impression en deux crans (`--m-impression`) : 0 → 0,5 → 1. */
const deuxCrans = (t: number): number => (t >= 1 ? 1 : Math.floor(t * 2) / 2);

export function CarteRole({
  role,
  retournee,
  taille = 'grande',
  tirage = 'papier',
  tirageDos,
  avecDescription,
  avecLegende,
  morte = false,
  onClic,
  className,
  skin,
  pleineLargeur = false,
}: CarteRoleProps) {
  const voixTable = useVoix();
  const skinTable = useSkinId();
  const skinId = skin ?? skinTable;
  const voix = skin === undefined ? voixTable : voixDuSkin(skin);
  const reduit = useReducedMotion() === true;
  const f = FORMATS[taille];
  const e = ENCRES[tirage];
  const description = (avecDescription ?? taille === 'grande') && role !== null;
  // Une carte inconnue ne se retourne pas : son dos est tout ce qu'on en sait.
  const faceVisible = retournee && role !== null;

  const legende =
    role !== null && f.legende !== null && (avecLegende ?? true) ? voix.legendeRole(role) : undefined;

  let mots: ReactNode = null;
  if (faceVisible) {
    const nom = voix.nomRole(role);
    const forme = formeDuCamp(role);
    const meute = forme !== 'ecu';
    const couleurMot = morte
      ? e.mortTexte
      : forme === 'mordu2' && tirage === 'papier'
        ? e.surEncre
        : meute
          ? e.meute
          : e.encre;
    const [kx, ky, kw, kh] = f.cartouche;
    const fsNom = nom.length > 16 ? f.nom.fsLong : f.nom.fs;
    mots = (
      <>
        {f.cartel !== null && (
          <span
            aria-hidden="true"
            style={{
              ...boite(f, ...f.cartel),
              fontFamily: FELL,
              fontSize: corps(f, 16),
              lineHeight: 1,
              color: morte ? e.mortTexte : e.encre2,
            }}
          >
            {NUMEROS[role]}
          </span>
        )}
        <span
          style={{
            ...boite(f, kx, ky, kw, kh),
            fontFamily: SERIF,
            fontSize: corps(f, f.fsCartouche),
            fontWeight: meute && !morte ? 600 : 400,
            lineHeight: 1,
            color: couleurMot,
          }}
        >
          {motDuCartouche(role, voix)}
        </span>
        <span
          style={{
            ...boite(f, 8, f.nom.y, f.W - 16, f.nom.h),
            fontFamily: FELL,
            fontSize: corps(f, fsNom),
            lineHeight: corps(f, f.nom.lh),
            color: morte ? e.mortTexte : e.encre,
            overflowWrap: 'anywhere',
          }}
        >
          {nom}
        </span>
        {legende !== undefined && legende !== '' && f.legende !== null && (
          <span
            style={{
              ...boite(f, 24, f.legende.y, f.W - 48, f.legende.lh * 2 + 2),
              alignItems: 'flex-start',
              fontFamily: FELL,
              fontStyle: 'italic',
              fontSize: corps(f, f.legende.fs),
              lineHeight: corps(f, f.legende.lh),
              color: morte ? e.mortTexte : e.narr,
            }}
          >
            {legende}
          </span>
        )}
      </>
    );
  }

  const carte = (
    <>
      <div data-face="verso" data-tirage={tirageDos ?? tirage} aria-hidden={faceVisible ? true : undefined} style={{ position: 'absolute', inset: 0 }}>
        <DosGrave tirage={tirageDos ?? tirage} skin={skinId} cache={faceVisible} />
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: faceVisible ? 1 : 0 }}
        transition={
          faceVisible
            ? { duration: 0.12, ease: reduit ? 'linear' : deuxCrans }
            : { duration: 0 }
        }
        aria-hidden={faceVisible ? undefined : true}
        data-face="recto"
        data-tirage={tirage}
        style={{ position: 'absolute', inset: 0 }}
      >
        {faceVisible && (
          <>
            <FaceGravee role={role} format={taille} tirage={tirage} skin={skinId} morte={morte} pleineTaille />
            {mots}
          </>
        )}
      </motion.div>
    </>
  );

  const dimensions: CSSProperties = {
    position: 'relative',
    width: pleineLargeur ? '100%' : taille === 'petite' ? f.W : `min(${String(f.W)}px, 100%)`,
    aspectRatio: `${String(f.W)} / ${String(f.H)}`,
    containerType: 'inline-size',
    flexShrink: 0,
    borderRadius: 0,
  };
  const attributs = { 'data-carte': taille, 'data-morte': morte ? '' : undefined };

  const corpsCarte =
    onClic !== undefined ? (
      <button
        type="button"
        onClick={onClic}
        aria-label={faceVisible ? voix.nomRole(role) : 'Retourner votre carte'}
        className={description ? undefined : className}
        {...attributs}
        style={{ ...dimensions, display: 'block', padding: 0, border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer' }}
      >
        {carte}
      </button>
    ) : (
      <div className={description ? undefined : className} {...attributs} style={dimensions}>
        {carte}
      </div>
    );

  if (!description) return corpsCarte;
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {corpsCarte}
      {faceVisible && <p style={{ margin: 0, maxWidth: f.W + 58, textAlign: 'center' }}>{voix.descriptionRole(role)}</p>}
    </div>
  );
}
