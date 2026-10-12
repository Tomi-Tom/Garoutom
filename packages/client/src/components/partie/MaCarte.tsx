/**
 * « Ma carte » (SPEC Caprices § 5.1.6, § 5.2, § 5.7, maquettes
 * `C-MaCarte-Jour` / `C-MaCarte-Nuit`) : le rappel de sa propre carte, et de
 * ce qu'elle seule sait — son âme sœur, sa meute, le carnet de la Voyante.
 *
 * Rien de tout cela ne reste à l'écran : le secret paraît **tant que le pouce
 * tient** l'appui long (`AppuiLong`), 8 s au plus, et se recache au
 * relâchement, au changement d'onglet (`visibilitychange`) ou à la perte du
 * focus. Le même geste existe pour tous les sièges (loi N5) : la nuit, le
 * dormeur a « Ma carte » dans sa barre au pouce, comme l'acteur a ses
 * boutons.
 *
 * Deux déclencheurs, une seule mécanique :
 * - `frise` : le bouton « Carte » de l'en-tête (76 × 44, icône seule sous
 *   360 px) ; le lot de la table (V2-A) le pose dans la frise ;
 * - `barre` : l'appui long plein-largeur de la barre au pouce, « Gardez le
 *   pouce : ma carte » — le dormeur de la nuit (V2-B), le mort.
 *
 * Pouce posé, la carte s'imprime par-dessus la place — en tirage cuivre la
 * nuit (la plaque avant l'impression, sombre par nature, loi N3), papier le
 * jour —, un filet décompte les 8 s sur son périmètre, et le savoir privé
 * **s'imprime sur les jetons** : le pouce posé se dit au magasin de la place
 * (`poserLePouce`, `place/savoir.ts`), qui imprime d'elle-même complices,
 * carnet et lacs. Pour une place qui ne l'écouterait pas, les mêmes signes
 * passent par son API existante (`annotations`) : l'écran les lit avec
 * `useAnnotationsSousLePouce()` (ou `useAnnotationsAvecMaCarte(base)` pour
 * les fondre dans les siennes) — jamais les deux à la fois, sans quoi ils
 * s'impriment deux fois. Relâché, la place redevient muette.
 *
 * Un spectateur n'a pas de carte : la frise garde l'emplacement, vide
 * (silhouette constante) ; la barre dit qu'il suit la table.
 */

import { motion } from 'motion/react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { campOf, type GameView, type RoleId } from '@garoutom/engine';

import { APPUI_ARMEMENT_MS, APPUI_CRANS, LECTURE_MAX_MS } from '../../anim/tokens.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';
import { peauDuSkin, resoudre, type Voix } from '../../skins/registre.js';
import { AppuiLong } from '../caprices/AppuiLong.js';
import { Cartouche, type FormeCartouche } from '../caprices/Cartouche.js';
import { tirageDe, type Tirage } from '../caprices/useTirage.js';
import { CarteRole } from '../habit/CarteRole.js';
import { Glyphe } from '../habit/glyphes.js';
import { Icone } from '../habit/Icone.js';
import { useEstLarge } from '../useEstLarge.js';
import { pouvoirsEteints, PouvoirsEteints } from './nuit/commun.js';
import { poserLePouce, useSousLePouce } from './place/savoir.js';

/* ------------------------------------------------------------------ */
/* Le pouce posé : un état de la page, lu par la place                 */
/* ------------------------------------------------------------------ */

/**
 * Le pouce tient-il « Ma carte » en ce moment (frise ou barre) ? C'est le
 * petit magasin de la place (`place/savoir.ts`, lot de la table) : la place
 * l'écoute pour imprimer d'elle-même le savoir privé sur ses jetons.
 */
export const useMaCarteTenue = useSousLePouce;

/* ------------------------------------------------------------------ */
/* La lecture à l'appui long : armement, lecture, décompte             */
/* ------------------------------------------------------------------ */

export type EtatLecture = 'repos' | 'armement' | 'ouverte';

export interface Lecture {
  etat: EtatLecture;
  /** Les secondes qui restent avant que la carte ne se recache (8 → 1). */
  restant: number;
  /** À passer à `AppuiLong` : la carte paraît. */
  surDebut: () => void;
  /** À passer à `AppuiLong` : la carte se recache. */
  surFin: () => void;
  /**
   * À étaler sur un conteneur de l'`AppuiLong` : il y lit le pouce qui se
   * pose (l'armement, 600 ms) et qui se lève avant la fin de l'armement —
   * l'appui long ne le dit pas lui-même.
   */
  ecouteurs: {
    onPointerDownCapture: (evenement: { button: number }) => void;
    onPointerUpCapture: () => void;
    onPointerCancelCapture: () => void;
    onKeyDownCapture: (evenement: { key: string; repeat: boolean }) => void;
    onKeyUpCapture: (evenement: { key: string }) => void;
    onBlurCapture: () => void;
  };
}

const SECONDES_MAX = Math.round(LECTURE_MAX_MS / 1000);

/**
 * L'état d'une lecture à l'appui long (révélation, Ma carte) : R1 armement,
 * R3 lue (avec les secondes qui restent), R4 réencrée. `surFin` reçoit la
 * durée de la lecture — la révélation en tire R5 (« Je sais qui je suis »
 * après une première lecture d'au moins une seconde).
 */
export function useLecture(options: { surFin?: (dureeMs: number) => void } = {}): Lecture {
  const [etat, setEtat] = useState<EtatLecture>('repos');
  const [restant, setRestant] = useState(SECONDES_MAX);
  const debut = useRef<number | null>(null);
  const rappel = useRef(options.surFin);
  rappel.current = options.surFin;

  useEffect(() => {
    if (etat !== 'ouverte') return;
    const minuteur = setInterval(() => {
      if (debut.current === null) return;
      const ecoule = Date.now() - debut.current;
      setRestant(Math.max(1, Math.ceil((LECTURE_MAX_MS - ecoule) / 1000)));
    }, 250);
    return () => clearInterval(minuteur);
  }, [etat]);

  const surDebut = useCallback(() => {
    debut.current = Date.now();
    setRestant(SECONDES_MAX);
    setEtat('ouverte');
  }, []);

  const surFin = useCallback(() => {
    const duree = debut.current === null ? 0 : Date.now() - debut.current;
    debut.current = null;
    setEtat('repos');
    rappel.current?.(duree);
  }, []);

  const relache = useCallback(() => setEtat((avant) => (avant === 'armement' ? 'repos' : avant)), []);

  const ecouteurs = useMemo<Lecture['ecouteurs']>(
    () => ({
      onPointerDownCapture: (evenement) => {
        if (evenement.button > 0) return;
        setEtat((avant) => (avant === 'repos' ? 'armement' : avant));
      },
      onPointerUpCapture: relache,
      onPointerCancelCapture: relache,
      onKeyDownCapture: (evenement) => {
        if (evenement.key === ' ' && !evenement.repeat) setEtat((avant) => (avant === 'repos' ? 'armement' : avant));
      },
      onKeyUpCapture: (evenement) => {
        if (evenement.key === ' ') relache();
      },
      onBlurCapture: relache,
    }),
    [relache],
  );

  return { etat, restant, surDebut, surFin, ecouteurs };
}

/* ------------------------------------------------------------------ */
/* Le filet du périmètre (R1, R3)                                      */
/* ------------------------------------------------------------------ */

/** Les cartes qui se lisent sous le pouce, et leur cuvette (CarteRole, cartes.mjs du lot C). */
const DIMENSIONS = {
  grande: { W: 300, H: 420, cuvette: [12, 12, 276, 396] },
  moyenne: { W: 216, H: 302, cuvette: [8, 8, 200, 286] },
} as const;

export type FormatLecture = keyof typeof DIMENSIONS;

/** Les 12 crans de l'armement (`--m-armement`). */
const crans = (t: number): number => (t >= 1 ? 1 : Math.floor(t * APPUI_CRANS) / APPUI_CRANS);

/**
 * Le filet de 1,5 px qui court sur le périmètre de la cuvette : il se trace
 * en 12 crans pendant l'armement (R1), puis se rétracte en 8 s pendant la
 * lecture (R3) — le décompte se lit sans chiffre. Il prend l'encre de ce qui
 * est visible dessous : bistre sur une face papier, palier I sur le cuivre.
 */
export function Perimetre({ etat, format, tirage }: { etat: EtatLecture; format: FormatLecture; tirage: Tirage }) {
  if (etat === 'repos') return null;
  const { W, H, cuvette } = DIMENSIONS[format];
  const [x, y, l, h] = cuvette;
  const p = 2 * (l + h);
  const m = 0.75;
  const d = `M${String(x + l / 2)} ${String(y + m)}H${String(x + l - m)}V${String(y + h - m)}H${String(x + m)}V${String(y + m)}H${String(x + l / 2)}`;
  const ouverte = etat === 'ouverte';
  const encre = tirage === 'papier' ? 'var(--cp-bistre-900, #17130F)' : 'var(--cp-palier-1, #A89D8C)';
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-perimetre={etat}
    >
      <motion.path
        key={etat}
        d={d}
        fill="none"
        stroke={encre}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={`${String(p)} ${String(p)}`}
        initial={{ strokeDashoffset: ouverte ? 0 : p }}
        animate={{ strokeDashoffset: ouverte ? p : 0 }}
        transition={
          ouverte
            ? { duration: LECTURE_MAX_MS / 1000, ease: 'linear' }
            : { duration: APPUI_ARMEMENT_MS / 1000, ease: crans }
        }
        data-anim-fonctionnelle=""
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Le savoir privé, imprimé sur les jetons                             */
/* ------------------------------------------------------------------ */

/** La forme du cartouche d'un rôle : le village à l'écu, la meute mordue, le Loup Blanc seul. */
export function formeDuRole(role: RoleId): FormeCartouche {
  if (role === 'loupBlanc') return 'seul';
  return campOf(role) === 'loups' ? 'mordu' : 'ecu';
}

/** Les sièges liés par le serment, tels que ce siège les connaît. */
function liesDe(game: GameView): Set<number> {
  const lies = new Set<number>();
  if (game.lover !== null) {
    lies.add(game.lover);
    if (game.you !== null) lies.add(game.you.seat);
  }
  // Cupidon voit les deux amoureux (`isLover`) sans en être.
  for (const joueur of game.players) if (joueur.isLover) lies.add(joueur.seat);
  return lies;
}

/**
 * Ce que la carte de ce siège sait de chaque autre siège, en signes posés sur
 * les jetons : le cartouche du rôle (carnet de la Voyante, complices de la
 * meute — le Loup Blanc y paraît « loup », comme la vue le donne, R96) et les
 * lacs du serment. Rien d'autre : la place dit déjà ce qui est public.
 */
export function annotationsDeMaCarte(game: GameView, voix: Voix): Record<number, ReactNode> {
  const roles = new Map<number, RoleId>();
  // Le carnet : la dernière voyance d'un siège fait foi.
  for (const page of game.inspections) roles.set(page.target, page.role);
  if (game.pack !== null && game.you !== null) {
    for (const seat of game.pack.seats) {
      if (seat === game.you.seat) continue;
      roles.set(seat, game.players.find((joueur) => joueur.seat === seat)?.role ?? 'loup');
    }
  }
  const lies = liesDe(game);

  const annotations: Record<number, ReactNode> = {};
  for (const joueur of game.players) {
    const role = roles.get(joueur.seat);
    const lie = lies.has(joueur.seat);
    if (role === undefined && !lie) continue;
    annotations[joueur.seat] = (
      <span data-sous-le-pouce="" className="inline-flex items-center gap-1">
        {lie && (
          <span className="inline-flex text-serment">
            <Glyphe nom="lie" />
            <span className="sr-only">lié·e</span>
          </span>
        )}
        {role !== undefined && (
          <Cartouche forme={formeDuRole(role)} taille={20}>
            {voix.nomRole(role)}
          </Cartouche>
        )}
      </span>
    );
  }
  return annotations;
}

/**
 * Les signes à poser sur la place tant que le pouce tient « Ma carte » ;
 * `undefined` sinon. À passer tel quel à `<Place annotations>`.
 */
export function useAnnotationsSousLePouce(): Readonly<Record<number, ReactNode>> | undefined {
  const tenu = useMaCarteTenue();
  const game = useGame();
  const voix = useVoix();
  return useMemo(() => (tenu && game !== null ? annotationsDeMaCarte(game, voix) : undefined), [tenu, game, voix]);
}

/**
 * Les annotations de l'écran (`base` : les votes de la meute, l'œil de la
 * Petite Fille…) fondues avec celles de Ma carte quand le pouce la tient :
 * un siège qui porte les deux reçoit les deux, côte à côte.
 */
export function useAnnotationsAvecMaCarte(
  base?: Readonly<Record<number, ReactNode>>,
): Readonly<Record<number, ReactNode>> | undefined {
  const sousLePouce = useAnnotationsSousLePouce();
  return useMemo(() => {
    if (sousLePouce === undefined) return base;
    if (base === undefined) return sousLePouce;
    const fondues: Record<number, ReactNode> = { ...base };
    for (const [cle, signe] of Object.entries(sousLePouce)) {
      const seat = Number(cle);
      const avant = fondues[seat];
      fondues[seat] =
        avant === undefined ? (
          signe
        ) : (
          <span className="inline-flex items-center gap-1">
            <Fragment>{avant}</Fragment>
            <Fragment>{signe}</Fragment>
          </span>
        );
    }
    return fondues;
  }, [base, sousLePouce]);
}

/* ------------------------------------------------------------------ */
/* La carte sous le pouce                                              */
/* ------------------------------------------------------------------ */

/** Le nom de l'âme sœur, des complices : ce que la carte rappelle en mots. */
function useSavoir(game: GameView | null) {
  const voix = useVoix();
  const nom = useNoms();
  const peau = peauDuSkin(useSkinId());
  if (game === null || game.you === null) return null;
  const moi = game.you;
  const complices = game.pack?.seats.filter((seat) => seat !== moi.seat) ?? [];
  const carnet = game.inspections.map((page) => ({
    cle: `${String(page.day)}-${String(page.target)}`,
    texte: `${resoudre(peau.recit.nuit, { n: String(page.day) })} — ${nom(page.target)} : ${voix.nomRole(page.role)}`,
  }));
  return {
    moi,
    ame: game.lover === null ? null : nom(game.lover),
    complices: complices.map(nom),
    roleComplice: voix.nomRole('loup'),
    carnet,
  };
}

function Infos({ game }: { game: GameView }) {
  const savoir = useSavoir(game);
  if (savoir === null) return null;
  const { moi, ame, complices, roleComplice } = savoir;
  const lignes: ReactNode[] = [];
  if (ame !== null) {
    lignes.push(
      <Cartouche key="ame" forme="lacs">
        Votre âme sœur : {ame}
      </Cartouche>,
    );
  }
  if (complices.length > 0) {
    lignes.push(
      <p key="meute" className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-5">
        <span>{moi.role === 'loupBlanc' ? 'Vous chassez aux côtés de :' : 'Vos complices :'}</span>
        <Cartouche forme="mordu" taille={20}>
          {roleComplice}
        </Cartouche>
        <span className="font-semibold">{complices.join(' · ')}</span>
      </p>,
    );
  }
  if (!moi.alive) {
    lignes.push(
      <p key="mort" className="t-statut m-0 text-[14px]">
        Vous êtes tombé·e — la carte reste à vous.
      </p>,
    );
  }
  if (pouvoirsEteints(game)) {
    lignes.push(
      <p key="pouvoirs" className="t-statut m-0 text-[14px]">
        <PouvoirsEteints />
      </p>,
    );
  }
  if (lignes.length === 0) return null;
  return <div className="flex flex-col items-center gap-2 border border-filet-doux bg-surface px-3 py-2 text-encre">{lignes}</div>;
}

/** La phrase que lit un lecteur d'écran quand le pouce se pose : tout ce que la carte montre. */
function useAnnonce(game: GameView | null): string {
  const voix = useVoix();
  const savoir = useSavoir(game);
  if (savoir === null) return '';
  const { moi, ame, complices, carnet } = savoir;
  const morceaux = [`Votre carte : ${voix.nomRole(moi.role)}.`, `« ${voix.legendeRole(moi.role)} »`];
  if (ame !== null) morceaux.push(`Votre âme sœur : ${ame}.`);
  if (complices.length > 0) {
    morceaux.push(`${moi.role === 'loupBlanc' ? 'Vous chassez aux côtés de' : 'Vos complices'} : ${complices.join(', ')}.`);
  }
  if (carnet.length > 0) morceaux.push(`Votre carnet : ${carnet.map((page) => page.texte).join(' ; ')}.`);
  if (!moi.alive) morceaux.push('Vous êtes tombé·e — la carte reste à vous.');
  return morceaux.filter((m) => m !== '« »').join(' ');
}

/** La carte imprimée par-dessus la place, tant que le pouce la tient. */
function CarteSousLePouce({
  game,
  tirage,
  cote,
}: {
  game: GameView;
  tirage: Tirage;
  cote: 'gauche' | 'droite';
}) {
  const large = useEstLarge();
  const moi = game.you;
  if (moi === null) return null;
  const format: FormatLecture = large ? 'grande' : 'moyenne';
  const { W } = DIMENSIONS[format];
  // Mobile : au-dessus du résumé, du pli et de la barre (24 + 44 + 72), du
  // côté opposé à la main qui tient ; desktop : au centre de la place.
  const position = large
    ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
    : cote === 'droite'
      ? 'right-[var(--gouttiere)]'
      : 'left-[var(--gouttiere)]';
  return createPortal(
    <div
      data-testid="ma-carte"
      data-tirage={tirage}
      aria-hidden="true"
      className={`pointer-events-none fixed z-[80] flex flex-col items-center gap-2 ${position}`}
      style={
        large
          ? { width: W }
          : { width: `min(${String(W)}px, calc(100vw - 2 * var(--gouttiere)))`, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 148px)' }
      }
    >
      <div className="relative w-full" style={{ aspectRatio: `${String(W)} / ${String(DIMENSIONS[format].H)}` }}>
        <CarteRole role={moi.role} retournee taille={format} tirage={tirage} avecDescription={false} morte={!moi.alive} />
        <Perimetre etat="ouverte" format={format} tirage={tirage} />
      </div>
      <Infos game={game} />
    </div>,
    document.body,
  );
}

/**
 * Le rappel de sa carte à l'appui long. Signature FIGÉE pour le lot V2-A
 * (frise) et le lot V2-B (barre du dormeur).
 */
export function MaCarte({ declencheur }: { declencheur: 'frise' | 'barre' }) {
  const game = useGame();
  const { tirage: reglage } = useReglages();
  const lecture = useLecture();
  const ouverte = lecture.etat === 'ouverte';
  const annonce = useAnnonce(ouverte ? game : null);

  // Le pouce posé se dit à la place ; démonté pouce posé, il se lève.
  const posee = useRef(false);
  useEffect(() => {
    if (ouverte === posee.current) return;
    posee.current = ouverte;
    poserLePouce(ouverte);
  }, [ouverte]);
  useEffect(
    () => () => {
      if (posee.current) poserLePouce(false);
    },
    [],
  );

  if (game === null || game.you === null) {
    // Le spectateur : la silhouette reste, vide (frise) ; la barre le dit.
    return declencheur === 'frise' ? (
      <span aria-hidden="true" data-ma-carte="vide" className="block h-11 w-[76px] border border-dashed border-filet-doux" />
    ) : (
      <p data-ma-carte="vide" className="t-corps m-0 self-center text-center text-encre-2">
        Vous suivez la table en spectateur.
      </p>
    );
  }

  const tirage = tirageDe(game.phase, reglage);
  const vive = (
    <span className="sr-only" aria-live="polite">
      {annonce}
    </span>
  );
  const carte = ouverte ? <CarteSousLePouce game={game} tirage={tirage} cote={declencheur === 'frise' ? 'droite' : 'gauche'} /> : null;

  if (declencheur === 'barre') {
    return (
      <>
        <span className="flex min-w-0 flex-1" {...lecture.ecouteurs}>
          <AppuiLong
            libelle={ouverte ? `Relâchez pour cacher · ${String(lecture.restant)} s` : 'Gardez le pouce : ma carte'}
            libelleCourt={ouverte ? `Relâcher · ${String(lecture.restant)} s` : 'Ma carte'}
            onDebut={lecture.surDebut}
            onFin={lecture.surFin}
            className="w-full"
          />
        </span>
        {vive}
        {carte}
      </>
    );
  }

  // La frise : un bouton de 76 × 44 qui montre une carte gravée et « Carte »
  // (l'icône seule sous 360 px) ; son nom, pour un lecteur d'écran, reste
  // « Ma carte ». Tenu, il s'encre : on voit que la carte est levée.
  return (
    <span className="relative inline-flex" {...lecture.ecouteurs}>
      <AppuiLong
        libelle="Ma carte"
        onDebut={lecture.surDebut}
        onFin={lecture.surFin}
        className="peer h-11 min-h-11 w-[76px] border border-filet-doux bg-surface p-0 max-[22.5rem]:w-11 data-[etat=armement]:border-2 data-[etat=armement]:border-encre data-[etat=ouvert]:border-encre data-[etat=ouvert]:bg-encre [&>*]:sr-only"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-[14px] text-encre peer-data-[etat=ouvert]:font-semibold peer-data-[etat=ouvert]:text-sur-encre"
      >
        <Icone nom="carte" />
        <span className="max-[22.5rem]:hidden">Carte</span>
      </span>
      {vive}
      {carte}
    </span>
  );
}
