/**
 * L'écran de partie : la table, de la première carte retournée au verdict.
 *
 * Il ne joue rien lui-même. Il pose le décor de l'heure, l'en-tête (le lien
 * de la collection, le code de la table, le numéro de la nuit ou du jour, la
 * minuterie du siège, sa carte à portée de main, les règles, les réglages, le
 * son), le narrateur qui raconte la chronique — puis il route selon la phase :
 *
 * - `revelation` → la carte qu'on retourne (`Revelation`) ;
 * - `nuit` → l'écran du rôle ou le village qui dort (`Nuit`) ;
 * - `election`, `jour`, `chasseur`, `succession`, `bouc` → la place, l'action,
 *   le fil (`EcranJour`) — le dernier mot du Bouc émissaire se dit en plein
 *   jour, sur la place qui vient de le condamner ;
 * - `fin` → le verdict et la nuit racontée (`Fin`).
 *
 * Un spectateur (`game.you === null`) n'a jamais de prompt : il voit la place,
 * rien d'autre — pas même une carte à retourner.
 *
 * Les sons de la partie s'écoutent ici, une seule fois (`useSonsPartie`) :
 * chaque brique qui monte et démonte au fil des phases n'a pas à s'en soucier.
 */

import { BoutonSon, LienArcade } from '@tombp/arcade';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { GameView, PhaseKind, RoomView } from '@garoutom/engine';

import { RESSORT_CARTE, RESSORT_PANNEAU } from '../anim/tokens.js';
import { CarteRole } from '../components/habit/CarteRole.js';
import { Decor, type Moment } from '../components/habit/Decor.js';
import { EcranJour, useGrandEcran } from '../components/partie/EcranJour.js';
import { Fin } from '../components/partie/Fin.js';
import { Minuterie } from '../components/partie/Minuterie.js';
import { Narrateur } from '../components/partie/Narrateur.js';
import { Nuit } from '../components/partie/Nuit.js';
import { pouvoirsEteints, PouvoirsEteints } from '../components/partie/nuit/commun.js';
import { Place } from '../components/partie/Place.js';
import { Revelation } from '../components/partie/Revelation.js';
import { BoutonReglages } from '../components/Reglages.js';
import { BoutonRegles } from '../components/Regles.js';
import { quitterTable } from '../lib/actions.js';
import { ARCADE_ID } from '../lib/identity.js';
import { useGame, useNoms, useSkinId, useVoix } from '../lib/partie.js';
import { useSonsPartie } from '../lib/useSonsPartie.js';
import { peauDuSkin, resoudre } from '../skins/registre.js';

/** Le décor de chaque heure : la révélation se fait déjà sous la lune. */
const MOMENT: Record<PhaseKind, Moment> = {
  revelation: 'nuit',
  nuit: 'nuit',
  election: 'jour',
  jour: 'jour',
  chasseur: 'jour',
  succession: 'jour',
  bouc: 'jour',
  fin: 'fin',
};

/** La première lettre en capitale — « la meute » devient un titre. */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

export function Partie({ room }: { room: RoomView }) {
  useSonsPartie();
  const game = useGame();

  if (game === null) {
    // Le salon est fermé, la vue n'est pas encore arrivée : un instant de
    // carton posé, pas un écran vide.
    return (
      <div data-testid="partie" className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <LienArcade id={ARCADE_ID} />
        <p className="font-identite text-2xl font-bold">La table se dresse…</p>
        <p className="font-mono text-sm" style={{ color: 'var(--papier-doux)' }}>
          {room.code}
        </p>
      </div>
    );
  }

  const heure = game.phase === 'nuit' || game.phase === 'revelation' ? 'nuit' : 'jour';

  return (
    <div
      data-testid="partie"
      data-phase={game.phase}
      data-heure={heure}
      className="relative isolate flex h-full min-h-0 flex-col"
    >
      {/* Le décor se pose lui-même derrière (absolute, -z-10) : `isolate` le
          garde au-dessus du fond de la page. */}
      <Decor moment={MOMENT[game.phase]} />
      {game.phase === 'revelation' && <VoileRevelation />}

      <EnTete room={room} game={game} />

      {game.phase !== 'fin' && <Narrateur className="shrink-0 px-3 pt-2 sm:px-4" />}

      <motion.main
        key={ecranDe(game)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={RESSORT_PANNEAU}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-2 pb-3 sm:px-4"
      >
        <Ecran game={game} />
      </motion.main>
    </div>
  );
}

/** L'écran que la phase appelle — sa clé suffit à rejouer l'entrée. */
function ecranDe(game: GameView): string {
  switch (game.phase) {
    case 'revelation':
      return game.you === null ? 'spectateur' : 'revelation';
    case 'nuit':
      return 'nuit';
    case 'fin':
      return 'fin';
    default:
      return 'jour';
  }
}

/**
 * Le voile de la révélation : l'écran s'assombrit autour de la carte. Il est
 * posé ici, sur toute la table et derrière tout ce qui s'y lit, plutôt que
 * dans l'écran qui défile : un voile pris dans le défilement laissait une
 * bande claire au bas de l'écran.
 */
function VoileRevelation() {
  return (
    <motion.div
      aria-hidden="true"
      data-testid="voile-revelation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={RESSORT_PANNEAU}
      className="pointer-events-none absolute inset-0 -z-[5]"
      style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 16%, rgb(12 15 25 / 0.88) 70%)' }}
    />
  );
}

function Ecran({ game }: { game: GameView }) {
  switch (ecranDe(game)) {
    case 'spectateur':
      return <PlaceDuSpectateur />;
    case 'revelation':
      return <Revelation />;
    case 'nuit':
      return <Nuit />;
    case 'fin':
      return <Fin />;
    default:
      return <EcranJour />;
  }
}

/** Le spectateur de la révélation : la place, en rond sur grand écran. */
function PlaceDuSpectateur() {
  const grand = useGrandEcran();
  if (grand) return <Place label="La place du village" disposition="cercle" className="min-h-[24rem] flex-1" />;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Place label="La place du village" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* L'en-tête                                                           */
/* ------------------------------------------------------------------ */

function EnTete({ room, game }: { room: RoomView; game: GameView }) {
  const peau = peauDuSkin(useSkinId());
  const nuit = game.phase === 'nuit' || game.phase === 'revelation';
  const numero =
    game.phase === 'fin' ? null : resoudre(nuit ? peau.recit.nuit : peau.recit.jour, { n: String(game.day) });

  return (
    <header className="relative z-20 shrink-0 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="carte flex flex-col gap-2 px-2 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 sm:gap-x-3">
          <LienArcade id={ARCADE_ID} className="shrink-0" />
          <div className="flex min-w-0 items-baseline gap-3">
            {/* Sous 640 px, le code de la table passe dans le menu « … » :
                il se recopie, il n'a pas à occuper la ligne. */}
            <p
              className="font-mono text-lg leading-none font-medium tracking-[0.16em] max-sm:hidden"
              aria-label={`Table ${room.code}`}
            >
              {room.code}
            </p>
            {numero !== null && (
              <p
                data-testid="numero"
                className="font-identite text-xl leading-none font-bold whitespace-nowrap"
                style={{ color: nuit ? 'var(--lune)' : 'var(--lanterne)' }}
              >
                {numero}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2">
            {game.you !== null && <MaCarte game={game} />}
            <MenuTable code={room.code} />
            <BoutonSon />
          </div>
        </div>
        {/* La ligne de la minuterie garde sa hauteur pour tous, qu'il y ait un
            compte à rebours ou non (D23, « Silence à l'écran »). La pause, elle,
            est publique : tout le monde la lit. */}
        <div className="flex h-5 min-w-0 items-center gap-3">
          <Minuterie className="flex-1" />
          {room.paused && (
            <p
              data-testid="pause"
              className="shrink-0 font-mono text-xs leading-5 whitespace-nowrap"
              style={{ color: 'var(--lune)' }}
            >
              La partie attend son village
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Le menu de la table                                                 */
/* ------------------------------------------------------------------ */

/**
 * Les commandes de second rang : les règles, les réglages, quitter. Sur
 * grand écran elles s'alignent dans l'en-tête ; sous 640 px, où la ligne
 * n'a place que pour le lien de l'arcade, le numéro de l'heure, sa carte et
 * le son, elles se replient derrière un bouton « … » — et le code de la
 * table avec elles.
 *
 * Un seul jeu de commandes dans le DOM, que le CSS range autrement selon la
 * largeur : les panneaux des règles et des réglages vivent dans leurs
 * boutons, ils ne doivent pas se démonter quand le menu change de forme.
 */
function MenuTable({ code }: { code: string }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (evenement: PointerEvent) => {
      if (boite.current !== null && !boite.current.contains(evenement.target as Node)) setOuvert(false);
    };
    // Échap ferme le menu ; un panneau ouvert dedans arrête lui-même la touche.
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dehors);
    window.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('pointerdown', dehors);
      window.removeEventListener('keydown', surTouche);
    };
  }, [ouvert]);

  return (
    <div ref={boite} className="relative flex items-center">
      {/* `.btn-voisin` impose son `display` hors des couches de Tailwind : on
          masque l'enveloppe, pas le bouton. */}
      <div className="sm:hidden">
        <button
          ref={bouton}
          type="button"
          className="btn-voisin"
          style={{ padding: 0, width: 44 }}
          aria-label="Plus de commandes"
          aria-expanded={ouvert}
          aria-controls="menu-table"
          onClick={() => setOuvert((valeur) => !valeur)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
      <div
        id="menu-table"
        className={`flex items-center gap-2 max-sm:absolute max-sm:top-full max-sm:right-0 max-sm:z-40 max-sm:mt-2 max-sm:w-max max-sm:max-w-[calc(100vw-2rem)] max-sm:flex-wrap max-sm:justify-end max-sm:rounded-[14px] max-sm:border max-sm:border-[var(--arcade-trait)] max-sm:bg-[var(--nuit-relief)] max-sm:p-3 max-sm:shadow-2xl ${ouvert ? '' : 'max-sm:hidden'}`}
      >
        <p className="font-mono text-base font-medium tracking-[0.16em] sm:hidden" style={{ color: 'var(--papier-doux)' }}>
          {`Table ${code}`}
        </p>
        <BoutonRegles />
        <BoutonReglages />
        <Quitter />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ma carte                                                            */
/* ------------------------------------------------------------------ */

/**
 * Le rappel de sa propre carte, et de ce qu'elle seule sait : son amoureux,
 * sa meute, le carnet de la Voyante. Fermé par défaut — le voisin du canapé
 * n'a pas à lire par-dessus l'épaule —, il s'ouvre exprès et se referme d'un
 * geste ou d'Échap.
 */
function MaCarte({ game }: { game: GameView }) {
  const [ouvert, setOuvert] = useState(false);
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  const moi = game.you;
  if (moi === null) return null;

  const complices = game.pack?.seats.filter((seat) => seat !== moi.seat) ?? [];
  const carnet = game.inspections;

  return (
    <div>
      <button
        ref={bouton}
        type="button"
        // Sous 640 px, le bouton n'est plus qu'une carte dessinée ; son nom
        // reste aux lecteurs d'écran (`btn-icone-etroit` dans styles.css).
        className="btn-voisin btn-icone-etroit gap-2"
        aria-expanded={ouvert}
        aria-controls="ma-carte"
        title="Ma carte"
        onClick={() => setOuvert((valeur) => !valeur)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <rect x="5.5" y="3" width="13" height="18" rx="2" />
          <path d="M12 8.5 L14.5 12 L12 15.5 L9.5 12 Z" fill="currentColor" stroke="none" />
        </svg>
        <span className="max-sm:sr-only">Ma carte</span>
      </button>
      {ouvert && (
        <motion.div
          id="ma-carte"
          role="dialog"
          aria-label="Ma carte"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={RESSORT_CARTE}
          className="carte absolute top-full right-3 z-40 mt-2 sm:right-4 flex max-h-[75vh] w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto p-4 shadow-2xl"
        >
          <div className="flex justify-center">
            <CarteRole role={moi.role} retournee avecDescription />
          </div>
          {!moi.alive && (
            <p className="text-center text-sm" style={{ color: 'var(--lune)' }}>
              Vous êtes tombé·e — la carte reste à vous.
            </p>
          )}
          {pouvoirsEteints(game) && <PouvoirsEteints className="text-center" />}

          {game.lover !== null && (
            <InfoPrivee titre="Votre âme sœur" teinte="serment">
              {nom(game.lover)}
            </InfoPrivee>
          )}

          {complices.length > 0 && (
            <InfoPrivee titre={capitale(voix.nomCamp('loups'))} teinte="sang">
              {complices.map((seat) => nom(seat)).join(' · ')}
            </InfoPrivee>
          )}

          {carnet.length > 0 && (
            <InfoPrivee titre={`Le carnet de ${voix.nomRole('voyante')}`} teinte="lune">
              <ul className="flex list-none flex-col gap-0.5 p-0">
                {carnet.map((page) => (
                  <li key={`${String(page.day)}-${String(page.target)}`}>
                    <span style={{ color: 'var(--papier-doux)' }}>
                      {resoudre(peau.recit.nuit, { n: String(page.day) })} —
                    </span>{' '}
                    {nom(page.target)} : <strong>{voix.nomRole(page.role)}</strong>
                  </li>
                ))}
              </ul>
            </InfoPrivee>
          )}

          <button
            type="button"
            className="btn-voisin self-center"
            onClick={() => {
              setOuvert(false);
              bouton.current?.focus();
            }}
          >
            Refermer
          </button>
        </motion.div>
      )}
    </div>
  );
}

function InfoPrivee({
  titre,
  teinte,
  children,
}: {
  titre: string;
  teinte: 'serment' | 'sang' | 'lune';
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--nuit-creux)', borderLeft: `3px solid var(--${teinte})` }}>
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: `var(--${teinte})` }}>
        {titre}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quitter                                                             */
/* ------------------------------------------------------------------ */

/** Quitter la table, après une confirmation posée sur place — jamais une boîte du navigateur. */
function Quitter() {
  const [confirmer, setConfirmer] = useState(false);
  if (!confirmer) {
    return (
      <button type="button" className="btn-voisin" onClick={() => setConfirmer(true)}>
        Quitter
      </button>
    );
  }
  return (
    <div role="group" aria-label="Quitter la partie ?" className="flex flex-wrap items-center gap-2">
      <span className="text-sm" style={{ color: 'var(--papier-doux)' }}>
        Quitter la partie ?
      </span>
      <button
        type="button"
        className="btn-village"
        style={{ background: 'var(--sang)', color: 'var(--nuit-creux)' }}
        onClick={() => void quitterTable()}
      >
        Oui, quitter
      </button>
      <button type="button" className="btn-voisin" onClick={() => setConfirmer(false)} autoFocus>
        Rester
      </button>
    </div>
  );
}
