/**
 * La place du village : un jeton par siège.
 *
 * C'est le lieu commun de toute la partie — le jour on y vote, la nuit on y
 * désigne, et à toute heure on y lit l'état de la table : qui est tombé, qui
 * porte la charge, qui a déjà voté. La place ne dit que ce que la `GameView`
 * dit (R88) : un rôle n'y apparaît que si la vue le donne à ce siège — les
 * complices de la meute, le carnet de la Voyante, les morts révélés —, et le
 * cœur des amoureux que si `isLover` le montre.
 *
 * La place ne décide pas qui est choisissable : l'écran qui la pose le lui dit
 * (`choisissables`), parce que la règle change d'un prompt à l'autre — soi
 * permis à l'élection, interdit au vote du jour, jamais un loup pour la
 * meute. Elle se contente de rendre chaque jeton cliquable ou non, surligné ou
 * non, dans la teinte de qui choisit.
 *
 * Deux dispositions : la **grille**, des petits écrans et des écrans de nuit ;
 * le **cercle** des grands écrans de jour, où la place devient un lieu — les
 * jetons en ellipse autour du puits, le joueur local en bas, face aux autres
 * (`place/cercle.ts`). Quand le rond ne tient pas sans que deux jetons se
 * chevauchent, la place retombe sur sa grille, sans rien perdre.
 *
 * Accessibilité : quand l'écran pose `onChoisir`, chaque jeton est un vrai
 * bouton (`aria-pressed`, Entrée et Espace), de 44 px au moins ; sinon c'est
 * une ligne de liste. Les décorations (initiale, brassard, cœur, pastille)
 * sont muettes, et une phrase cachée dit tout ce qu'elles montrent.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

import type { PlayerView, RoleId, RoomView } from '@garoutom/engine';

import { SymboleRole } from '../habit/Symbole.js';
import { useGame, useNoms, useRoom, useSkinId, useVoix } from '../../lib/partie.js';
import { heureServeur, useStore } from '../../lib/store.js';
import { peauDuSkin } from '../../skins/registre.js';
import { disposerEnCercle, rangAutourDe, type Ronde, type Scene } from './place/cercle.js';

/** La teinte d'une sélection : le village, la meute, le serment, la lune. */
export type Teinte = 'lanterne' | 'sang' | 'serment' | 'lune';

export interface PlaceProps {
  /** Le siège est-il cliquable ? Absent : rien ne l'est. */
  choisissables?: (seat: number) => boolean;
  /** Sièges surlignés comme choix courant du joueur local. */
  choisis?: readonly number[];
  onChoisir?: (seat: number) => void;
  /** Teinte de la sélection et du survol. Défaut : `lanterne`. */
  teinte?: Teinte;
  /** Une pastille libre par siège (ex. les votes de la meute). */
  annotations?: Readonly<Record<number, ReactNode>>;
  /** Jetons plus petits, pour les écrans de nuit et les mobiles étroits. */
  compacte?: boolean;
  /**
   * `grille` (défaut) : les jetons en rangs. `cercle` : les jetons en ellipse
   * autour du puits, dans toute la place que le parent lui donne — il doit
   * donc lui donner une hauteur. Repli sur la grille si le rond ne tient pas.
   */
  disposition?: 'grille' | 'cercle';
  /**
   * Ce qui se pose au milieu de la place en rond — le panneau d'action du
   * jour —, sous le puits. Si l'anneau ne lui laisse pas la place, la place
   * retombe sur sa grille et le pose dessous. Ignoré en `grille`.
   */
  centre?: ReactNode;
  /** Libellé accessible du groupe de jetons. */
  label?: string;
  /**
   * Le siège marqué par le Corbeau (R93) : son jeton porte un « +2 » bien
   * visible — les deux voix d'office du vote du jour. Absent : aucun.
   */
  marque?: number | null;
  /**
   * Les seuls votants du jour, désignés par le Bouc émissaire (R94) : les
   * autres vivants portent « ne vote pas ». Absent ou `null` : tout le monde.
   */
  votants?: readonly number[] | null;
  /** Classes de placement posées par l'écran parent. */
  className?: string;
}

/**
 * Les mesures d'un jeton. Tout se déduit du médaillon, pour qu'un jeton
 * agrandi garde ses signes (brassard, cœur, pastille « a voté ») lisibles à
 * la même proportion.
 */
interface Gabarit {
  medaillon: number;
  /** Classe de taille du nom. */
  nom: string;
  /** Classe de rembourrage vertical. */
  py: string;
}

const GABARIT_COMPACT: Gabarit = { medaillon: 38, nom: 'text-xs', py: 'py-1.5' };
const GABARIT_GRILLE: Gabarit = { medaillon: 50, nom: 'text-sm', py: 'py-2' };

function gabaritRond(ronde: Ronde): Gabarit {
  return { medaillon: ronde.medaillon, nom: ronde.medaillon >= 56 ? 'text-base' : 'text-sm', py: 'py-2' };
}

/**
 * Les plus petites scènes qu'on accepte au milieu du rond pour y poser
 * l'action — une consigne, un état, deux boutons : étroite et haute (les
 * boutons passent à la ligne), ou large et basse pour les écrans courts.
 */
const SCENES_MIN: readonly Scene[] = [
  { largeur: 360, hauteur: 220 },
  { largeur: 440, hauteur: 170 },
];

/**
 * L'heure du serveur, rafraîchie chaque seconde tant qu'un compte à rebours
 * d'absence est affiché — et figée sinon : une place sans absent n'a aucune
 * raison de se redessiner.
 */
function useHeureServeur(actif: boolean): number {
  const decalage = useStore((state) => state.decalageHorloge);
  const [, setTic] = useState(0);
  useEffect(() => {
    if (!actif) return;
    const timer = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [actif]);
  return heureServeur({ decalageHorloge: decalage });
}

/**
 * La taille d'un élément, suivie tant qu'il vit. `null` tant qu'elle est
 * inconnue ou nulle — c'est le cas sous jsdom, qui ne mesure rien : la place
 * y garde sa grille.
 */
function useTaille(actif: boolean): [RefObject<HTMLDivElement | null>, { l: number; h: number } | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState<{ l: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!actif || element === null) return;
    const lire = () => {
      const { width, height } = element.getBoundingClientRect();
      const l = Math.round(width);
      const h = Math.round(height);
      setTaille((avant) =>
        l <= 0 || h <= 0 ? null : avant !== null && avant.l === l && avant.h === h ? avant : { l, h },
      );
    };
    lire();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(lire);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [actif]);
  return [ref, taille];
}

/** L'initiale d'un pseudo, pour le médaillon — le premier caractère lisible. */
function initiale(nom: string): string {
  const premier = [...nom.trim()][0];
  return premier === undefined ? '?' : premier.toLocaleUpperCase('fr');
}

export function Place({
  choisissables,
  choisis = [],
  onChoisir,
  teinte = 'lanterne',
  annotations,
  compacte = false,
  disposition = 'grille',
  centre,
  label,
  marque = null,
  votants = null,
  className = '',
}: PlaceProps) {
  const game = useGame();
  const room = useRoom();
  const noms = useNoms();
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const enRond = disposition === 'cercle';
  const [cadre, taille] = useTaille(enRond);

  const absents =
    room?.players.some((joueur) => !joueur.connected && joueur.disconnectedUntil !== null) ?? false;
  const maintenant = useHeureServeur(absents);

  if (game === null) return null;

  const moi = game.you?.seat ?? null;
  // Un écran qui pose `onChoisir` met la place en mode choix : les jetons
  // non choisissables s'effacent un peu, pour que la cible se cherche d'un œil.
  const enChoix = onChoisir !== undefined;
  const total = game.players.length;
  const ronde =
    enRond && taille !== null
      ? disposerEnCercle(total, taille.l, taille.h, centre === undefined ? undefined : SCENES_MIN)
      : null;
  const gabarit = ronde !== null ? gabaritRond(ronde) : compacte ? GABARIT_COMPACT : GABARIT_GRILLE;
  const nuit = game.phase === 'nuit' || game.phase === 'revelation';

  const jetons = game.players.map((joueur) => {
    const point = ronde?.points[rangAutourDe(joueur.seat, moi, total)];
    return (
      <Jeton
        key={joueur.seat}
        joueur={joueur}
        nom={noms(joueur.seat)}
        estMoi={joueur.seat === moi}
        aVote={game.voted.includes(joueur.seat)}
        table={room}
        maintenant={maintenant}
        choisissable={enChoix && (choisissables?.(joueur.seat) ?? false)}
        enChoix={enChoix}
        choisi={choisis.includes(joueur.seat)}
        onChoisir={onChoisir}
        teinte={teinte}
        annotation={annotations?.[joueur.seat]}
        marque={marque === joueur.seat && joueur.alive}
        horsVote={votants !== null && joueur.alive && joueur.canVote && !votants.includes(joueur.seat)}
        gabarit={gabarit}
        position={
          ronde !== null && point !== undefined
            ? { left: point.x, top: point.y, width: ronde.largeur }
            : undefined
        }
        charge={peau.charge}
        nomRole={voix.nomRole}
      />
    );
  });

  const grille = (
    <ul
      aria-label={label ?? 'La place du village'}
      data-testid="place"
      data-disposition="grille"
      className={`grid list-none gap-2 p-0 ${enRond ? 'mx-auto mt-auto w-full max-w-4xl' : className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compacte ? '4.75rem' : '6.25rem'}, 1fr))` }}
    >
      {jetons}
    </ul>
  );

  if (!enRond) return grille;

  // Le cadre mesuré prend toute la place que le parent lui donne. Le rond s'y
  // pose en absolu ; la grille de repli y défile, centrée, la scène dessous
  // (les marges automatiques centrent sans jamais couper le haut).
  if (ronde === null) {
    return (
      <div ref={cadre} className={`relative flex flex-col gap-3 overflow-y-auto ${className}`}>
        {grille}
        {centre !== undefined && <div className="mx-auto mb-auto w-full max-w-2xl shrink-0">{centre}</div>}
      </div>
    );
  }

  const scene = ronde.scene;
  return (
    <div ref={cadre} className={`relative ${className}`}>
      {/* Les jetons d'abord : on désigne, puis on confirme au milieu. */}
      <ul
        aria-label={label ?? 'La place du village'}
        data-testid="place"
        data-disposition="cercle"
        className="pointer-events-none absolute inset-0 m-0 list-none p-0 [&>li]:pointer-events-auto"
      >
        {jetons}
      </ul>
      {centre !== undefined && scene !== null ? (
        <div
          data-testid="scene"
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 overflow-y-auto"
          style={{
            left: ronde.centre.x,
            top: ronde.centre.y,
            width: scene.largeur,
            height: scene.hauteur,
            // `safe` : une action plus haute que la scène défile au lieu de
            // déborder par le haut, hors d'atteinte.
            justifyContent: 'safe center',
          }}
        >
          <Puits nuit={nuit} style={{ flex: '0 1 132px', minHeight: 0, aspectRatio: '1 / 1', maxWidth: '100%' }} />
          <div className="w-full shrink-0">{centre}</div>
        </div>
      ) : (
        ronde.centre.diametre > 0 && (
          <Puits
            nuit={nuit}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: ronde.centre.x,
              top: ronde.centre.y,
              width: ronde.centre.diametre,
              height: ronde.centre.diametre,
            }}
          />
        )
      )}
    </div>
  );
}

interface JetonProps {
  joueur: PlayerView;
  nom: string;
  estMoi: boolean;
  aVote: boolean;
  table: RoomView | null;
  maintenant: number;
  choisissable: boolean;
  enChoix: boolean;
  choisi: boolean;
  onChoisir: ((seat: number) => void) | undefined;
  teinte: Teinte;
  annotation: ReactNode;
  /** Le jeton porte la marque du Corbeau : deux voix d'office. */
  marque: boolean;
  /** Vivant, mais pas parmi les votants désignés par le Bouc. */
  horsVote: boolean;
  gabarit: Gabarit;
  /** Le centre du jeton sur la place en rond, et sa largeur ; absent en grille. */
  position: { left: number; top: number; width: number } | undefined;
  charge: string;
  nomRole: (role: RoleId) => string;
}

function Jeton({
  joueur,
  nom,
  estMoi,
  aVote,
  table,
  maintenant,
  choisissable,
  enChoix,
  choisi,
  onChoisir,
  teinte,
  annotation,
  marque,
  horsVote,
  gabarit,
  position,
  charge,
  nomRole,
}: JetonProps) {
  const { seat, alive, role, canVote, isCaptain, isLover } = joueur;
  const place = table?.players.find((p) => p.seat === seat);
  const absent = place !== undefined && !place.connected;
  const graceS =
    absent && place.disconnectedUntil !== null
      ? Math.max(0, Math.ceil((place.disconnectedUntil - maintenant) / 1000))
      : null;
  const gracie = alive && !canVote;
  // Son propre rôle ne s'affiche pas sur la place : le voisin du canapé la
  // voit aussi. Il vit dans « Ma carte », qu'on ouvre exprès.
  const roleVisible = role !== null && !estMoi ? role : null;

  /* --- La phrase qui dit tout ce que le jeton montre --- */
  const details: string[] = [];
  if (estMoi) details.push('vous');
  if (!alive) details.push('mort·e');
  if (roleVisible !== null) details.push(nomRole(roleVisible));
  if (isCaptain) details.push(charge);
  if (isLover) details.push('lié·e par le destin');
  if (gracie) details.push('ne vote plus');
  if (horsVote) details.push('ne vote pas aujourd’hui');
  if (marque) details.push(`marqué·e par ${nomRole('corbeau')} : deux voix d’office`);
  if (aVote) details.push('a voté');
  if (absent) details.push(graceS === null ? 'absent·e' : `absent·e, ${String(graceS)} s de grâce`);
  const phrase = details.length > 0 ? `${nom} — ${details.join(', ')}` : nom;

  /* --- Les mesures, toutes tirées du médaillon --- */
  const medaillon = gabarit.medaillon;
  const initialePx = Math.round(medaillon * 0.48);
  const symbolePx = Math.round(medaillon * 0.64);
  const croixPx = Math.round(medaillon * 0.4);
  const badgePx = Math.max(14, Math.round(medaillon * 0.36));
  const pointPx = Math.max(12, Math.round(medaillon * 0.22));

  /* --- La matière --- */
  const accent = `var(--${teinte})`;
  const bordure = choisi
    ? ''
    : estMoi
      ? 'border-[var(--papier-doux)]'
      : 'border-[var(--arcade-trait)]';
  const style: CSSProperties = {
    background: choisi
      ? `color-mix(in srgb, ${accent} 20%, var(--nuit-relief))`
      : estMoi
        ? 'color-mix(in srgb, var(--papier) 7%, var(--nuit-relief))'
        : 'color-mix(in srgb, var(--nuit-relief) 88%, transparent)',
    ...(choisi ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` } : {}),
    // Son propre jeton ne s'efface jamais, même quand on ne peut pas se désigner :
    // c'est le repère d'où l'on regarde la place.
    opacity: absent ? 0.6 : enChoix && !choisissable && !choisi && !estMoi ? 0.55 : 1,
    transition: 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.3s ease',
    // La teinte du survol, lue par la classe `hover:` du bouton.
    ['--teinte-jeton' as string]: accent,
  };

  const contenu = (
    <>
      <span className="sr-only">{phrase}</span>
      <span aria-hidden="true" className="relative mx-auto block" style={{ width: medaillon, height: medaillon }}>
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-identite font-bold"
          style={{
            fontSize: initialePx,
            background: 'var(--nuit-creux)',
            color: alive ? 'var(--papier)' : 'var(--papier-doux)',
            border: `${estMoi ? 2 : 1}px solid ${estMoi ? 'var(--papier-doux)' : 'var(--arcade-trait)'}`,
            filter: alive ? undefined : 'grayscale(0.85)',
          }}
        >
          {/* Un mort dont la carte est connue la montre au milieu du médaillon :
              la carte posée sur la place. Sinon, une croix gravée. */}
          {!alive ? (
            role !== null ? (
              <SymboleRole role={role} taille={symbolePx} />
            ) : (
              <Croix taille={croixPx} />
            )
          ) : (
            initiale(nom)
          )}
        </span>

        {isCaptain && <Brassard medaillon={medaillon} />}
        {isLover && <Coeur medaillon={medaillon} />}
        {aVote && (
          <span
            data-testid={`a-vote-${String(seat)}`}
            className="absolute -right-0.5 -bottom-0.5 block rounded-full"
            style={{
              width: pointPx,
              height: pointPx,
              background: 'var(--lanterne)',
              boxShadow: '0 0 0 2px var(--nuit-relief)',
            }}
          />
        )}
        {alive && roleVisible !== null && (
          <span
            className="absolute -bottom-1 -left-1 flex items-center justify-center rounded-full"
            style={{ background: 'var(--nuit-relief)', border: '1px solid var(--arcade-trait)', padding: 1 }}
          >
            <SymboleRole role={roleVisible} taille={badgePx} />
          </span>
        )}
        {absent && <Absence medaillon={medaillon} />}
      </span>

      <span
        aria-hidden="true"
        className={`mt-1 block truncate text-center leading-tight ${gabarit.nom} ${alive ? '' : 'line-through'}`}
        style={{ color: alive ? 'var(--papier)' : 'var(--papier-doux)', fontWeight: estMoi ? 700 : 500 }}
      >
        {nom}
      </span>
      {(estMoi || gracie || horsVote || absent) && (
        <span
          aria-hidden="true"
          className="block truncate text-center text-[11px] leading-tight"
          style={{ color: absent ? 'var(--lune)' : 'var(--papier-doux)' }}
        >
          {absent
            ? graceS === null
              ? 'absent·e'
              : `absent·e · ${String(graceS)} s`
            : gracie
              ? 'ne vote plus'
              : horsVote
                ? estMoi
                  ? 'vous · ne vote pas'
                  : 'ne vote pas'
                : 'vous'}
        </span>
      )}

      {marque && (
        // Le « +2 » de la marque : en haut à gauche du jeton, dans la teinte
        // du sang, assez gros pour se lire d'un bout de la place à l'autre.
        <span
          aria-hidden="true"
          data-testid={`marque-${String(seat)}`}
          className="absolute top-1 left-1 rounded-full px-1.5 font-mono text-[13px] leading-5 font-bold"
          style={{ background: 'var(--sang)', color: 'var(--nuit-creux)', boxShadow: '0 0 0 2px var(--nuit-relief)' }}
        >
          +2
        </span>
      )}

      {annotation !== undefined && annotation !== null && annotation !== false && (
        <span aria-hidden="true" className="absolute top-1 right-1 text-[11px] leading-none font-bold">
          {annotation}
        </span>
      )}
    </>
  );

  const classes = `relative block w-full min-h-[44px] rounded-xl border ${bordure} px-1.5 ${gabarit.py}`;
  // En rond, le jeton est posé par son centre ; en grille, il suit le flux.
  const pose: CSSProperties | undefined =
    position === undefined
      ? undefined
      : {
          position: 'absolute',
          left: position.left,
          top: position.top,
          width: position.width,
          transform: 'translate(-50%, -50%)',
        };

  if (onChoisir !== undefined) {
    return (
      <li className="min-w-0" style={pose}>
        <button
          type="button"
          aria-pressed={choisi}
          disabled={!choisissable}
          onClick={() => onChoisir(seat)}
          className={`${classes} font-[inherit] text-[inherit] enabled:cursor-pointer enabled:hover:border-[var(--teinte-jeton)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lune)]`}
          style={style}
        >
          {contenu}
        </button>
      </li>
    );
  }
  return (
    <li className={`min-w-0 ${classes}`} style={{ ...style, ...pose }}>
      {contenu}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Le centre de la place                                               */
/* ------------------------------------------------------------------ */

/**
 * Le puits du village, au milieu du rond : margelle de pierre, toit de
 * planches, une lanterne pendue à la poulie. Elle brûle à la lanterne le
 * jour, à la lune la nuit. Décoratif — muet pour les lecteurs d'écran. Le
 * halo respire doucement, sauf pour qui a demandé moins de mouvement
 * (`.place-halo` dans `styles.css`).
 */
function Puits({ nuit, style, className = '' }: { nuit: boolean; style: CSSProperties; className?: string }) {
  const lueur = nuit ? 'var(--lune)' : 'var(--lanterne)';
  const halo = useId();
  return (
    <svg
      data-testid="puits"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none block ${className}`}
      style={style}
    >
      <defs>
        <radialGradient id={halo}>
          <stop offset="0" stopColor={lueur} stopOpacity="0.34" />
          <stop offset="0.55" stopColor={lueur} stopOpacity="0.1" />
          <stop offset="1" stopColor={lueur} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="place-halo" cx="60" cy="56" r="58" fill={`url(#${halo})`} />
      {/* L'ombre au sol. */}
      <ellipse cx="60" cy="101" rx="40" ry="7" fill="var(--nuit-creux)" opacity="0.7" />
      {/* Les montants et le toit. */}
      <g stroke="var(--papier-doux)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M37 72 V34 M83 72 V34" />
        <path d="M37 38 H83" />
      </g>
      <path
        d="M27 36 L60 17 L93 36 Z"
        fill="var(--nuit-relief)"
        stroke="var(--papier-doux)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M38 30 L82 30" stroke="var(--arcade-trait)" strokeWidth="1" />
      {/* La corde et la lanterne. */}
      <path d="M60 38 V47" stroke="var(--papier-doux)" strokeWidth="1.2" />
      <rect x="54.5" y="47" width="11" height="14" rx="2" fill="var(--nuit-creux)" stroke={lueur} strokeWidth="1.4" />
      <ellipse cx="60" cy="54" rx="3" ry="4.2" fill={lueur} />
      {/* La margelle : un cylindre de pierre vu de trois quarts. */}
      <path d="M30 72 V94 A30 8 0 0 0 90 94 V72" fill="var(--nuit-relief)" stroke="var(--papier-doux)" strokeWidth="1.5" />
      <ellipse cx="60" cy="72" rx="30" ry="8" fill="var(--nuit-relief)" stroke="var(--papier-doux)" strokeWidth="1.5" />
      <ellipse cx="60" cy="72" rx="23" ry="5" fill="var(--nuit-creux)" />
      <g stroke="var(--arcade-trait)" strokeWidth="1">
        <path d="M30 83 A30 8 0 0 0 90 83" fill="none" />
        <path d="M44 79 V88 M60 80 V90 M76 79 V88 M38 89 V97 M52 91 V99 M68 91 V99 M82 89 V97" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Les signes gravés du jeton                                          */
/* ------------------------------------------------------------------ */

/** Le brassard de la charge : une bande lanterne nouée en haut à gauche. */
function Brassard({ medaillon }: { medaillon: number }) {
  const largeur = Math.max(20, Math.round(medaillon * 0.4));
  return (
    <svg
      data-testid="brassard"
      viewBox="0 0 20 12"
      width={largeur}
      height={Math.round(largeur * 0.6)}
      className="absolute -top-1 -left-1.5"
    >
      <path d="M1 3 L19 1 L19 9 L1 11 Z" fill="var(--lanterne)" stroke="var(--nuit-creux)" strokeWidth="1" />
      <path d="M7 2.4 L7 10.3 M13 1.7 L13 9.6" stroke="var(--nuit-creux)" strokeWidth="1" />
    </svg>
  );
}

/** Le cœur des amoureux, rose passé. */
function Coeur({ medaillon }: { medaillon: number }) {
  const largeur = Math.max(14, Math.round(medaillon * 0.28));
  return (
    <svg
      data-testid="coeur"
      viewBox="0 0 16 14"
      width={largeur}
      height={Math.round((largeur * 12) / 14)}
      className="absolute -top-0.5 -right-1"
    >
      <path
        d="M8 13 C3 9 1 7 1 4.2 A3.2 3.2 0 0 1 8 3 A3.2 3.2 0 0 1 15 4.2 C15 7 13 9 8 13 Z"
        fill="var(--serment)"
        stroke="var(--nuit-creux)"
        strokeWidth="1"
      />
    </svg>
  );
}

/** La croix d'un mort dont la carte reste face contre table. */
function Croix({ taille }: { taille: number }) {
  return (
    <svg viewBox="0 0 20 20" width={taille} height={taille}>
      <path d="M10 2 V18 M4 7 H16" stroke="var(--papier-doux)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Le signe de l'absence : un croissant de lune, la fenêtre éteinte. */
function Absence({ medaillon }: { medaillon: number }) {
  const taille = Math.max(14, Math.round(medaillon * 0.28));
  return (
    <svg
      viewBox="0 0 16 16"
      width={taille}
      height={taille}
      className="absolute -top-1 left-1/2 -translate-x-1/2"
    >
      <circle cx="8" cy="8" r="7" fill="var(--nuit-creux)" stroke="var(--lune)" strokeWidth="1" />
      <path d="M10 4 A4.5 4.5 0 1 0 10 12 A3.5 3.5 0 1 1 10 4 Z" fill="var(--lune)" />
    </svg>
  );
}
