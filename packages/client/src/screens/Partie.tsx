/**
 * L'écran de partie : la table, de la première carte retournée au verdict.
 *
 * Il ne joue rien lui-même, et ne porte plus d'en-tête : chaque écran de
 * phase compose son propre gabarit (SPEC § 7.1) avec les zones communes —
 * frise, minuterie, crieur (`components/partie/zones.tsx`). Il route :
 *
 * - `voleur` → le talon du Voleur (`ChoixVoleur`), avant la révélation : à
 *   lui les deux cartes, à tous les autres le village qui dort — l'heure,
 *   elle, compte déjà pour la nuit ;
 * - `revelation` → la carte qu'on retourne (`Revelation`) ; le spectateur,
 *   lui, voit la place et la légende, jamais une carte ;
 * - `nuit` → la nuit (`Nuit`), un seul gabarit pour tous les sièges ;
 * - `election`, `jour`, `chasseur`, `succession`, `bouc` → l'écran de jour
 *   (`EcranJour`) — le dernier mot du Bouc émissaire se dit en plein jour,
 *   sur la place qui vient de le condamner ;
 * - `fin` → le verdict et la nuit racontée (`Fin`).
 *
 * Par-dessus, des choses publiques, au même instant pour tous :
 *
 * - **les planches passagères** (`place/PlanchePassagere.tsx`) : quand un
 *   vote se clôt, « Les voix sont comptées » ; quand la nuit cède au jour,
 *   l'aube (« Aube II », ses morts ou sa paix, la marque du Corbeau). Quatre
 *   secondes, un toucher les passe, jamais à la fin de partie, jamais
 *   rejouées au montage ni à la reprise ;
 * - **la Scène TV** : une vue sans siège ouverte avec `?scene=1` devient
 *   l'écran partagé du milieu de la table.
 *
 * Les sons de la partie s'écoutent ici, une seule fois (`useSonsPartie`).
 */

import { LienArcade } from '@tombp/arcade';

import type { GameView, RoomView } from '@garoutom/engine';

import { Gabarit } from '../components/caprices/index.js';
import { LegendeDuGraveur } from '../components/partie/Action.js';
import { EcranJour, useGrandEcran } from '../components/partie/EcranJour.js';
import { Fin } from '../components/partie/Fin.js';
import { Nuit } from '../components/partie/Nuit.js';
import { Place } from '../components/partie/Place.js';
import { Aube } from '../components/partie/place/Aube.js';
import { Depouillement } from '../components/partie/place/Depouillement.js';
import { usePlanchesPassageres } from '../components/partie/place/PlanchePassagere.js';
import { estSceneTV, SceneTV } from '../components/partie/place/SceneTV.js';
import { Revelation } from '../components/partie/Revelation.js';
import { ChoixVoleur } from '../components/partie/nuit/ChoixVoleur.js';
import { useZonesCommunes } from '../components/partie/zones.js';
import { ARCADE_ID } from '../lib/identity.js';
import { useGame, useVoix } from '../lib/partie.js';
import { useSonsPartie } from '../lib/useSonsPartie.js';

export function Partie({ room }: { room: RoomView }) {
  useSonsPartie();
  const game = useGame();
  const { planche, debut, passer } = usePlanchesPassageres(game);

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

  // La phase du Voleur se joue la nuit venue, avant la révélation : l'heure
  // des zones — cuivre, lune, frise — est déjà celle de la nuit (R110).
  const heure = game.phase === 'nuit' || game.phase === 'revelation' || game.phase === 'voleur' ? 'nuit' : 'jour';
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
      {planche?.genre === 'depouillement' && (
        <Depouillement key={planche.cle} recu={planche.recu} debut={debut} onPasser={() => passer(planche.cle)} />
      )}
      {planche?.genre === 'aube' && (
        <Aube key={planche.cle} planche={planche} debut={debut} onPasser={() => passer(planche.cle)} />
      )}
    </div>
  );
}

/** L'écran que la phase appelle — sa clé suffit à rejouer l'entrée. */
function ecranDe(game: GameView): string {
  switch (game.phase) {
    case 'voleur':
      return 'voleur';
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
    case 'voleur':
      return <ChoixVoleur />;
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
