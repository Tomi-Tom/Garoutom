/**
 * L'écran de partie : la table, de la première carte retournée au verdict.
 *
 * Il ne joue rien lui-même, et ne porte plus d'en-tête : chaque écran de
 * phase compose son propre gabarit (SPEC § 7.1) avec les zones communes —
 * frise, minuterie, crieur (`components/partie/zones.tsx`). Il route :
 *
 * - `revelation` → la carte qu'on retourne (`Revelation`) ; le spectateur,
 *   lui, voit la place et la légende, jamais une carte ;
 * - `nuit` → la nuit (`Nuit`), un seul gabarit pour tous les sièges ;
 * - `election`, `jour`, `chasseur`, `succession`, `bouc` → l'écran de jour
 *   (`EcranJour`) — le dernier mot du Bouc émissaire se dit en plein jour,
 *   sur la place qui vient de le condamner ;
 * - `fin` → le verdict et la nuit racontée (`Fin`).
 *
 * Par-dessus, deux choses publiques, au même instant pour tous :
 *
 * - **le dépouillement** : quand un vote se clôt, la planche « Les voix sont
 *   comptées » se pose quelques secondes (un toucher la passe) ;
 * - **la Scène TV** : une vue sans siège ouverte avec `?scene=1` devient
 *   l'écran partagé du milieu de la table.
 *
 * Les sons de la partie s'écoutent ici, une seule fois (`useSonsPartie`).
 */

import { LienArcade } from '@tombp/arcade';
import { useEffect, useRef, useState } from 'react';

import type { GameView, RoomView } from '@garoutom/engine';

import { Gabarit } from '../components/caprices/index.js';
import { LegendeDuGraveur } from '../components/partie/Action.js';
import { EcranJour, useGrandEcran } from '../components/partie/EcranJour.js';
import { Fin } from '../components/partie/Fin.js';
import { Nuit } from '../components/partie/Nuit.js';
import { Place } from '../components/partie/Place.js';
import { Depouillement, DUREE_DEPOUILLEMENT_MS } from '../components/partie/place/Depouillement.js';
import { estSceneTV, SceneTV } from '../components/partie/place/SceneTV.js';
import { Revelation } from '../components/partie/Revelation.js';
import { useZonesCommunes } from '../components/partie/zones.js';
import { ARCADE_ID } from '../lib/identity.js';
import { useGame, useVoix } from '../lib/partie.js';
import { useStore, type EvenementRecu } from '../lib/store.js';
import { useSonsPartie } from '../lib/useSonsPartie.js';

export function Partie({ room }: { room: RoomView }) {
  useSonsPartie();
  const game = useGame();
  const depouillement = useDepouillement(game);

  if (game === null) {
    // Le salon est fermé, la vue n'est pas encore arrivée : un instant de
    // carton posé, pas un écran vide.
    return (
      <div data-testid="partie" className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <LienArcade id={ARCADE_ID} />
        <p className="t-titre m-0">La table se dresse…</p>
        <p className="t-code m-0">{room.code}</p>
      </div>
    );
  }

  const heure = game.phase === 'nuit' || game.phase === 'revelation' ? 'nuit' : 'jour';
  const scene = game.you === null && estSceneTV();

  return (
    <div
      data-testid="partie"
      data-phase={game.phase}
      data-heure={heure}
      className="relative isolate flex h-full min-h-0 flex-col"
    >
      <main key={ecranDe(game)} className="flex min-h-0 flex-1 flex-col">
        {scene ? <SceneTV /> : <Ecran game={game} />}
      </main>
      {depouillement.recu !== null && <Depouillement recu={depouillement.recu} onPasser={depouillement.passer} />}
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

function Ecran({ game }: { game: GameView }) {
  switch (ecranDe(game)) {
    case 'spectateur':
      return <RevelationDuSpectateur />;
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

/**
 * Le spectateur de la révélation : la place (non interactive), le crieur,
 * la légende « Nul ne se connaît. » — l'emplacement de « Carte » reste vide,
 * aucune carte.
 */
function RevelationDuSpectateur() {
  const zones = useZonesCommunes();
  const voix = useVoix();
  const grand = useGrandEcran();
  return (
    <Gabarit
      {...zones}
      consigne={<LegendeDuGraveur texte={voix.legendeEcran('revelation')} />}
      place={<Place label="La place du village" disposition={grand ? 'cercle' : 'grille'} />}
      resume={null}
      pli={null}
      barre={
        <div className="barre-pouce">
          <p className="t-statut m-0 text-center">Vous regardez la partie depuis le bord de la place.</p>
        </div>
      }
    />
  );
}

/**
 * Le dépouillement d'un vote : la planche se pose quand un vote **arrive**
 * (jamais pour un vote déjà dans la chronique au montage, ni pour un vote
 * rejoué à la reprise), reste `DUREE_DEPOUILLEMENT_MS`, et se passe d'un
 * toucher. La fin a son verdict : la planche ne s'y pose pas.
 */
function useDepouillement(game: GameView | null): { recu: EvenementRecu | null; passer: () => void } {
  const chronique = useStore((state) => state.chronique);
  const dernierVote = [...chronique]
    .reverse()
    .find((recu) => recu.event.type === 'vote' && recu.rejoue !== true);
  const vu = useRef<number>(dernierVote?.id ?? 0);
  const [planche, setPlanche] = useState<EvenementRecu | null>(null);

  useEffect(() => {
    if (dernierVote === undefined || dernierVote.id <= vu.current) return;
    vu.current = dernierVote.id;
    setPlanche(dernierVote);
  }, [dernierVote]);

  useEffect(() => {
    if (planche === null) return;
    const minuteur = setTimeout(() => setPlanche(null), DUREE_DEPOUILLEMENT_MS);
    return () => clearTimeout(minuteur);
  }, [planche]);

  const fin = game?.phase === 'fin';
  return { recu: fin ? null : planche, passer: () => setPlanche(null) };
}
