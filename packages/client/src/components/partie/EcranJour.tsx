/**
 * L'écran de jour : la place, l'action, le fil.
 *
 * Il sert cinq phases — l'élection du capitaine, le débat et le vote, le
 * tir du Chasseur, la succession, le dernier mot du Bouc émissaire — qui
 * ont la même géographie : la place au
 * milieu, ce qu'on a à faire dessous, et le fil du village à côté. La règle
 * de `docs/refs/design.md` (« Le vote reste lisible ») est construite, pas
 * négociée :
 *
 * - **grand écran (≥ 1024 px)** : la place au centre, en rond — les jetons
 *   autour du puits, l'action posée au milieu —, le fil en colonne à droite
 *   (≈ 340 px), la barre de vote épinglée en tête de la colonne ;
 * - **petit écran** : une colonne flex — la place défile au-dessus, l'action
 *   et la barre de vote se posent sous elle, et le fil en tiroir ferme la
 *   marche. Le tiroir **pousse** la place, il ne la recouvre jamais : les
 *   pastilles « a voté » vivent sur les jetons, et rien ne passe devant.
 *
 * Le choix d'un jeton vit ici, parce que la place et le panneau d'action le
 * partagent : on touche un jeton, on confirme dans le panneau.
 */

import { useEffect, useState } from 'react';

import type { GameView } from '@garoutom/engine';

import { useGame, useNoms, useVoix } from '../../lib/partie.js';
import { Action, regleDuChoix } from './Action.js';
import { listeDeNoms } from './Narrateur.js';
import { Fil } from './Fil.js';
import { Place, type Teinte } from './Place.js';

/** Le seuil de la colonne, celui de `docs/refs/design.md`. */
const GRAND_ECRAN = '(min-width: 1024px)';

/** Vrai au-delà de 1024 px, suivi en direct quand la fenêtre change de taille. */
export function useGrandEcran(): boolean {
  const lire = () => typeof window !== 'undefined' && window.matchMedia(GRAND_ECRAN).matches;
  const [grand, setGrand] = useState(lire);
  useEffect(() => {
    const requete = window.matchMedia(GRAND_ECRAN);
    const suivre = () => setGrand(requete.matches);
    suivre();
    requete.addEventListener('change', suivre);
    return () => requete.removeEventListener('change', suivre);
  }, []);
  return grand;
}

/**
 * Qui vote, et combien l'ont fait. L'élection appelle tous les vivants
 * (R56) ; la potence, les vivants qui votent encore — l'Idiot gracié n'en
 * est plus (R60) —, et seulement ceux que le Bouc émissaire a désignés quand
 * il a parlé (R94). `voted` ne dit pas pour qui : la barre non plus.
 */
export function compteDesVotes(game: GameView): { ont: number; sur: number } | null {
  if (game.phase !== 'jour' && game.phase !== 'election') return null;
  const designes = game.phase === 'jour' ? game.votants : null;
  const votants = game.players.filter(
    (p) =>
      p.alive && (game.phase === 'election' || (p.canVote && (designes === null || designes.includes(p.seat)))),
  );
  return { ont: game.voted.length, sur: votants.length };
}

/**
 * La marque du Corbeau, pour la place et la barre : le siège marqué, tant
 * qu'il vit. La vue la porte de l'aube à la clôture du vote (R93).
 */
export function marqueDuJour(game: GameView): number | null {
  const marque = game.marque;
  return marque !== null && game.players[marque]?.alive === true ? marque : null;
}

/** Les seuls votants du jour, quand le Bouc les a désignés ; `null` : tout le monde. */
export function votantsDuJour(game: GameView): readonly number[] | null {
  return game.phase === 'jour' ? game.votants : null;
}

export function BarreVoteJour({ game, className = '' }: { game: GameView; className?: string }) {
  const voix = useVoix();
  const nom = useNoms();
  const compte = compteDesVotes(game);
  if (compte === null) return null;
  const { ont, sur } = compte;
  const marque = marqueDuJour(game);
  const designes = votantsDuJour(game);
  return (
    <div data-testid="barre-vote" className={`carte flex flex-col gap-1.5 px-3 py-2 ${className}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: 'var(--lanterne)' }}
        />
        <p className="font-mono text-sm tabular-nums">
          {String(ont)} sur {String(sur)} {ont > 1 ? 'ont voté' : 'a voté'}
        </p>
        <div
          aria-hidden="true"
          className="ml-auto h-1.5 w-16 overflow-hidden rounded-full"
          style={{ background: 'var(--nuit-creux)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${String(sur === 0 ? 0 : Math.round((ont / sur) * 100))}%`,
              background: 'var(--lanterne)',
              transition: 'width 300ms ease',
            }}
          />
        </div>
      </div>
      {marque !== null && (
        <p data-testid="explication-marque" className="flex items-start gap-2 text-sm leading-snug">
          <MarqueCorbeau />
          <span>
            {capitale(voix.nomRole('corbeau'))} a marqué <strong>{nom(marque)}</strong> : deux voix d’office au
            vote du jour.
          </span>
        </p>
      )}
      {designes !== null && (
        <p data-testid="explication-votants" className="text-sm leading-snug" style={{ color: 'var(--papier-doux)' }}>
          {capitale(voix.nomRole('bouc'))} a parlé : seuls votent{' '}
          <strong style={{ color: 'var(--papier)' }}>{listeDeNoms(designes.map(nom))}</strong>.
        </p>
      )}
    </div>
  );
}

/** La première lettre en capitale — « le Corbeau » ouvre une phrase. */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

/** Le « +2 » de la marque, tel qu'il se lit sur le jeton. */
export function MarqueCorbeau() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center rounded-full px-1.5 font-mono text-xs leading-5 font-bold"
      style={{ background: 'var(--sang)', color: 'var(--nuit-creux)' }}
    >
      +2
    </span>
  );
}

export function EcranJour() {
  const game = useGame();
  const grand = useGrandEcran();
  const [choix, setChoix] = useState<number | null>(null);
  // Le Bouc émissaire désigne plusieurs votants : une sélection, pas un choix.
  const [selection, setSelection] = useState<number[]>([]);

  // Une phase nouvelle efface le choix en suspens : on ne confirme pas au
  // Chasseur la cible qu'on visait pour la potence.
  const phase = game?.phase;
  const jour = game?.day;
  useEffect(() => {
    setChoix(null);
    setSelection([]);
  }, [phase, jour]);

  if (game === null) return null;

  const spectateur = game.you === null;
  const regle = spectateur ? undefined : regleDuChoix(game);
  const plusieurs = game.prompt?.kind === 'designerVotants';
  const choisis = plusieurs
    ? selection
    : choix !== null
      ? [choix]
      : game.yourVote !== null
        ? [game.yourVote]
        : [];
  // Quand on hésite, la voix déjà posée reste marquée d'une coche.
  const annotations =
    !plusieurs && choix !== null && game.yourVote !== null && choix !== game.yourVote
      ? { [game.yourVote]: <span style={{ color: 'var(--lanterne)' }}>✓</span> }
      : undefined;
  const teinte: Teinte = game.prompt?.kind === 'tirer' ? 'sang' : 'lanterne';
  const libelle =
    game.prompt?.kind === 'voter'
      ? 'La place du village — touchez un jeton pour désigner'
      : plusieurs
        ? 'La place du village — touchez les jetons de ceux qui voteront demain'
        : game.prompt !== null
          ? 'La place du village — touchez un jeton pour choisir'
          : 'La place du village';
  const basculer = (seat: number) => {
    if (plusieurs) {
      setSelection((avant) =>
        avant.includes(seat) ? avant.filter((s) => s !== seat) : [...avant, seat].sort((a, b) => a - b),
      );
    } else {
      setChoix((avant) => (avant === seat ? null : seat));
    }
  };

  const action = spectateur ? (
    <p className="px-1 text-center text-sm italic" style={{ color: 'var(--lune)' }}>
      Vous regardez la partie depuis le bord de la place.
    </p>
  ) : (
    <Action choix={choix} onChoix={setChoix} selection={selection} onSelection={setSelection} />
  );

  const place = (
    <Place
      choisissables={regle}
      choisis={choisis}
      onChoisir={regle === undefined ? undefined : basculer}
      annotations={annotations}
      marque={marqueDuJour(game)}
      votants={votantsDuJour(game)}
      teinte={teinte}
      label={libelle}
      disposition={grand ? 'cercle' : 'grille'}
      // Sur grand écran, l'action se pose au milieu du rond, sous le puits —
      // ou sous la grille quand le rond ne lui laisse pas la place.
      centre={grand ? action : undefined}
      className={grand ? 'min-h-[24rem] flex-1' : ''}
    />
  );

  if (grand) {
    // La place prend toute la hauteur : les jetons en rond autour du puits,
    // l'action au milieu. La margelle ne défile pas : la barre de vote reste
    // épinglée au-dessus du fil, et seul le fil défile en lui-même.
    return (
      <div data-testid="ecran-jour" className="flex h-full min-h-0 gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pr-1">{place}</div>
        <aside className="flex min-h-0 w-[340px] shrink-0 flex-col gap-2" aria-label="La margelle">
          <BarreVoteJour game={game} className="shrink-0" />
          <Fil mode="colonne" className="min-h-0 flex-1" />
        </aside>
      </div>
    );
  }

  return (
    <div data-testid="ecran-jour" className="flex h-full min-h-0 flex-col gap-2">
      <div className="min-h-24 flex-1 overflow-y-auto">{place}</div>
      <div className="shrink-0">{action}</div>
      <BarreVoteJour game={game} className="shrink-0" />
      <Fil mode="tiroir" className="shrink-0" />
    </div>
  );
}
