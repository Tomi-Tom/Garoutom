/**
 * La fin de partie : l'écran de fin commun de l'arcade (`EcranFin`) habillé du
 * verdict de CE siège, puis les cartes retournées et la nuit racontée.
 *
 * Le chiffre est le moment où la partie s'est arrêtée, dans les mots du skin :
 * « Nuit 3 » si la dernière chose racontée est de la nuit, « Jour 4 » sinon
 * (à défaut de log, le numéro du jour de la vue). Les trois lignes sont la
 * phrase de fin du narrateur, le sort de ce siège, et les survivants.
 */

import { EcranFin } from '@tombp/arcade';
import { useState } from 'react';

import type { GameView } from '@garoutom/engine';

import { quitterTable, revanche } from '../../lib/actions.js';
import { ARCADE_ID } from '../../lib/identity.js';
import { useGame, useNoms, useRoom, useSkinId, useVoix } from '../../lib/partie.js';
import { useStore } from '../../lib/store.js';
import { peauDuSkin, resoudre } from '../../skins/registre.js';
import { Fil } from './Fil.js';
import { Distribution } from './fin/Distribution.js';
import { NuitRacontee } from './fin/NuitRacontee.js';
import { finitDeNuit } from './fin/recit.js';
import { verdictDuSiege } from './fin/verdict.js';

/** « Nuit 3 » ou « Jour 4 » : où la partie s'est arrêtée. */
function chiffreDe(game: GameView, recit: { nuit: string; jour: string }): string {
  const log = game.log ?? [];
  const derniere = log[log.length - 1];
  const nuit = finitDeNuit(log);
  if (derniere === undefined || nuit === null) return resoudre(recit.jour, { n: String(game.day) });
  // L'heure de la dernière entrée se lit dans le fil du log, comme au récit :
  // une rancune ou un chagrin du soir restent au jour.
  return resoudre(nuit ? recit.nuit : recit.jour, { n: String(derniere.day) });
}

export function Fin() {
  const game = useGame();
  const room = useRoom();
  const playerId = useStore((state) => state.playerId);
  const voix = useVoix();
  const noms = useNoms();
  const recit = peauDuSkin(useSkinId()).recit;
  const [filOuvert, setFilOuvert] = useState(false);

  if (game === null) return null;

  const siege = game.you?.seat ?? null;
  const { verdict, couleur } = verdictDuSiege(game.winner, game.players, siege);
  const estHote = room !== null && playerId !== null && room.hostId === playerId;
  const vivants = game.players.filter((joueur) => joueur.alive);

  const ligneRole =
    game.you === null
      ? 'Vous suivez la table en spectateur.'
      : `Vous étiez ${voix.nomRole(game.you.role)}, ${game.you.alive ? 'debout à la fin' : 'tombé·e avant la fin'}.`;
  const ligneSurvivants =
    vivants.length === 0
      ? 'Personne ne reste debout.'
      : `${String(vivants.length)} ${vivants.length > 1 ? 'survivants' : 'survivant'} sur ${String(game.players.length)} : ${vivants.map((joueur) => noms(joueur.seat)).join(', ')}`;
  const lignes = [voix.phraseFin(game.winner ?? 'personne'), ligneRole, ligneSurvivants];

  return (
    <EcranFin
      id={ARCADE_ID}
      verdict={verdict}
      couleur={couleur}
      chiffre={chiffreDe(game, recit)}
      lignes={lignes}
      surRejouer={estHote ? () => void revanche() : undefined}
      actions={[{ libelle: 'Quitter la table', surClic: () => void quitterTable() }]}
      // Dans le `main` en colonne de la partie, le gabarit centré se laissait
      // rétrécir à la hauteur de l'écran : la nuit racontée débordait alors
      // des deux côtés, et le verdict partait au-dessus, hors d'atteinte.
      className="shrink-0"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-1 text-left">
        {!estHote && <p className="text-center text-papier-doux">L’hôte peut relancer une revanche.</p>}
        <Distribution game={game} />
        <NuitRacontee game={game} />
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className="btn-voisin min-h-11"
            aria-expanded={filOuvert}
            onClick={() => setFilOuvert((o) => !o)}
          >
            {filOuvert ? 'Refermer le fil' : 'Relire le fil'}
          </button>
          {filOuvert && (
            <div className="carte w-full p-3">
              <Fil mode="integre" />
            </div>
          )}
        </div>
      </div>
    </EcranFin>
  );
}
