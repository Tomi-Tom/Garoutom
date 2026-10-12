/**
 * La place du village : un jeton par siège (SPEC § 5.1, § 5.16).
 *
 * C'est le lieu commun de toute la partie — le jour on y vote, la nuit on y
 * désigne, et à toute heure on y lit l'état de la table : qui est tombé, qui
 * porte le brassard, qui a déjà voté. La place ne dit que ce que la
 * `GameView` dit (R88) ; et le savoir **privé** — complices, carnet de la
 * Voyante, lacs des amoureux — ne s'y imprime que **sous le pouce**, tant
 * qu'on tient « Ma carte » (§ 5.1.6, `place/savoir.ts`).
 *
 * La place ne décide pas qui est choisissable : l'écran qui la pose le lui
 * dit (`choisissables`). Un jeton qu'on ne peut pas choisir perd son grain,
 * jamais son contraste — aucune opacité (§ 10, point 6).
 *
 * Deux dispositions :
 *
 * - **la grille** (mobile) : quatre densités D1-D4 (`place/densite.ts`),
 *   dans la zone de 399 px du gabarit, l'ordre des sièges, « moi » à sa
 *   place — et **aucun défilement** pour voter, de 6 à 18 ;
 * - **le cercle** (desktop) : les jetons en ellipse autour du **pupitre**
 *   (que le gabarit pose au centre), « moi » à six heures (`place/cercle.ts`),
 *   m 72 jusqu'à 12 joueurs, 56 au-delà. Repli sur la grille si deux
 *   médaillons se chevauchent.
 *
 * Accessibilité : quand l'écran pose `onChoisir`, chaque jeton est un vrai
 * bouton (`aria-pressed`), de 44 px au moins ; sinon c'est une ligne de
 * liste. Les signes sont muets ; une phrase cachée dit tout ce qu'ils
 * montrent.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import type { RoomView } from '@garoutom/engine';

import { tirageDe } from '../caprices/useTirage.js';
import { motDuCartouche } from '../habit/CarteRole.js';
import { useGame, useNoms, useRoom, useSkinId, useVoix } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';
import { heureServeur, useStore } from '../../lib/store.js';
import { peauDuSkin } from '../../skins/registre.js';
import { disposerEnCercle, rangAutourDe, type Scene } from './place/cercle.js';
import { DENSITES, densitePour, jetonDuCercle, type Densite } from './place/densite.js';
import { Jeton, type Presence } from './place/Jeton.js';
import { useSousLePouce } from './place/savoir.js';

/** La teinte d'une sélection. Gardée pour les écrans qui la donnent : le choix, lui, ne se colore jamais (§ 5.1.4). */
export type Teinte = 'lanterne' | 'sang' | 'serment' | 'lune';

export interface PlaceProps {
  /** Le siège est-il cliquable ? Absent : rien ne l'est. */
  choisissables?: (seat: number) => boolean;
  /** Sièges choisis par le joueur local. */
  choisis?: readonly number[];
  onChoisir?: (seat: number) => void;
  /** Teinte de l'écran qui choisit (posée en `data-teinte`, sans effet de couleur). */
  teinte?: Teinte;
  /** Un signe libre par siège, posé en NE (pastille de la meute, compte de la Petite Fille). */
  annotations?: Readonly<Record<number, ReactNode>>;
  /** Force la densité la plus serrée (D4). */
  compacte?: boolean;
  /** Force une densité ; sinon elle suit la table, le fil et la largeur. */
  densite?: Densite;
  /** Le fil est ouvert au tiers : la place passe en D4. */
  filOuvert?: boolean;
  /** `grille` (défaut, mobile) ou `cercle` (desktop, autour du pupitre). */
  disposition?: 'grille' | 'cercle';
  /** Libellé accessible du groupe de jetons. */
  label?: string;
  /** Le siège marqué par le Corbeau (R93) : cartouche « +2 » en NO. */
  marque?: number | null;
  /** Les seuls votants du jour, désignés par le Bouc (R94) : « votera », les autres « ne vote pas ». */
  votants?: readonly number[] | null;
  /** Les sièges interdits (« hier » du Salvateur, état 16). */
  interdits?: readonly number[];
  /** La scène que le cercle garde libre en son milieu (le pupitre). */
  pupitre?: Scene;
  className?: string;
}

/**
 * La largeur du pupitre desktop (§ 7.1 : 360, élargi à 440 pour que les
 * libellés d'action — « Voter contre Bot Fernand » à côté de « S'abstenir » —
 * tiennent sans s'abréger). `styles.css` la déclare aussi (`--pupitre-l`).
 */
export const LARGEUR_PUPITRE = 440;

/** Le pupitre desktop (§ 5.16) : 440 × 200, un peu d'air autour. */
const PUPITRE: Scene = { largeur: LARGEUR_PUPITRE + 16, hauteur: 216 };

/** L'heure du serveur, rafraîchie chaque seconde tant qu'un compte à rebours d'absence court. */
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

/** Une requête média suivie en direct. */
export function useMedia(requete: string): boolean {
  const lire = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(requete).matches;
  const [vrai, setVrai] = useState(lire);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(requete);
    const suivre = () => setVrai(media.matches);
    suivre();
    media.addEventListener('change', suivre);
    return () => media.removeEventListener('change', suivre);
  }, [requete]);
  return vrai;
}

/** La taille d'un élément, suivie tant qu'il vit ; `null` sous jsdom, qui ne mesure rien. */
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
      setTaille((avant) => (l <= 0 || h <= 0 ? null : avant !== null && avant.l === l && avant.h === h ? avant : { l, h }));
    };
    lire();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(lire);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [actif]);
  return [ref, taille];
}

function presenceDe(place: RoomView['players'][number] | undefined): Presence {
  if (place === undefined || place.connected) return 'present';
  return place.absent === true ? 'absent' : 'reconnexion';
}

export function Place({
  choisissables,
  choisis = [],
  onChoisir,
  teinte = 'lanterne',
  annotations,
  compacte = false,
  densite,
  filOuvert = false,
  disposition = 'grille',
  label,
  marque = null,
  votants = null,
  interdits = [],
  pupitre = PUPITRE,
  className = '',
}: PlaceProps) {
  const game = useGame();
  const room = useRoom();
  const noms = useNoms();
  const voix = useVoix();
  const skin = useSkinId();
  const peau = peauDuSkin(skin);
  const { tirage: reglageTirage } = useReglages();
  const rattachement = useStore((state) => state.rattachement);
  const sousLePouce = useSousLePouce();
  const etroit = useMedia('(max-width: 359px)');
  const enRond = disposition === 'cercle';
  const [cadre, taille] = useTaille(enRond);

  const enGrace =
    room?.players.some((joueur) => !joueur.connected && joueur.absent !== true && joueur.disconnectedUntil !== null) ??
    false;
  const maintenant = useHeureServeur(enGrace);

  if (game === null) return null;

  const moi = game.you?.seat ?? null;
  const enChoix = onChoisir !== undefined;
  const total = game.players.length;
  const tirage = tirageDe(game.phase, reglageTirage);
  const jourDeVote = game.phase === 'jour' || game.phase === 'election';
  const jetonRond = jetonDuCercle(total);
  const ronde =
    enRond && taille !== null ? disposerEnCercle(total, taille.l, taille.h, pupitre, jetonRond) : null;
  const choixDensite: Densite =
    densite ?? (compacte ? 'D4' : densitePour(total, { filOuvert, etroit }));
  const mesuresGrille = DENSITES[choixDensite];
  const reconnexionSoi = rattachement === 'perdu' || rattachement === 'reprise';

  const jetons = game.players.map((joueur) => {
    const point = ronde?.points[rangAutourDe(joueur.seat, moi, total)];
    const place = room?.players.find((p) => p.seat === joueur.seat);
    const presence = joueur.seat === moi ? 'present' : presenceDe(place);
    const graceS =
      presence === 'reconnexion' && place?.disconnectedUntil != null
        ? Math.max(0, Math.ceil((place.disconnectedUntil - maintenant) / 1000))
        : null;
    const peutVoter = joueur.alive && joueur.canVote;
    const designe = votants !== null && peutVoter && votants.includes(joueur.seat);
    const voteDuJour = jourDeVote && (game.phase === 'election' ? joueur.alive : peutVoter && (votants === null || designe));
    const aVote = jourDeVote && game.voted.includes(joueur.seat);
    return (
      <Jeton
        key={joueur.seat}
        joueur={joueur}
        nom={noms(joueur.seat)}
        mesures={
          ronde !== null
            ? { medaillon: ronde.medaillon, haut: 4, nom: { taille: 16, ligne: 20 }, statut: 16, roleEntier: true }
            : mesuresGrille
        }
        tirage={tirage}
        skin={skin}
        estMoi={joueur.seat === moi}
        aVote={aVote}
        delibere={voteDuJour && !aVote}
        enChoix={enChoix}
        choisissable={enChoix && (choisissables?.(joueur.seat) ?? false)}
        choisi={choisis.includes(joueur.seat)}
        onChoisir={onChoisir}
        annotation={annotations?.[joueur.seat]}
        marque={marque === joueur.seat && joueur.alive}
        horsVote={votants !== null && peutVoter && !designe}
        votera={designe}
        interdit={interdits.includes(joueur.seat)}
        presence={presence}
        graceS={graceS}
        reconnexionSoi={joueur.seat === moi && reconnexionSoi}
        sousLePouce={sousLePouce}
        charge={peau.charge}
        nomRole={voix.nomRole}
        motCamp={(role) => motDuCartouche(role, voix)}
        libelleAbsent={voix.libelleAbsent()}
        nomCouvreChef={voix.nomCouvreChef(joueur.seat + 1)}
        position={
          ronde !== null && point !== undefined ? { left: point.x, top: point.y, width: ronde.largeur } : undefined
        }
      />
    );
  });

  const nomListe = label ?? 'La place du village';

  if (ronde !== null) {
    return (
      <div ref={cadre} className={`relative h-full w-full ${className}`}>
        <ul
          aria-label={nomListe}
          data-testid="place"
          data-disposition="cercle"
          data-teinte={teinte}
          className="absolute inset-0 m-0 list-none p-0"
        >
          {jetons}
        </ul>
      </div>
    );
  }

  const grille = (
    <ul
      aria-label={nomListe}
      data-testid="place"
      data-disposition="grille"
      data-densite={choixDensite}
      data-teinte={teinte}
      className={`m-0 grid w-full list-none content-center p-0 px-[var(--gouttiere)] ${choixDensite === 'D4' ? '-my-2' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${String(mesuresGrille.colonnes)}, minmax(0, 1fr))`,
        columnGap: mesuresGrille.ecartX,
        rowGap: mesuresGrille.ecartY,
        boxSizing: 'border-box',
      }}
    >
      {jetons}
    </ul>
  );

  // En rond mais sans mesure (premier rendu, jsdom) ou sans la place : la
  // grille, dans le cadre mesuré qui continue d'écouter sa taille.
  return (
    <div ref={enRond ? cadre : undefined} className={`flex h-full w-full items-center ${className}`}>
      {grille}
    </div>
  );
}
