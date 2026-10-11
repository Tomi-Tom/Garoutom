/**
 * La distribution révélée : toutes les cartes retournées, avec le pseudo, le
 * sort de chacun, le brassard, le serment — et les gagnants surlignés.
 */

import type { GameView } from '@garoutom/engine';

import { useNoms, useSkinId, useVoix } from '../../../lib/partie.js';
import { peauDuSkin } from '../../../skins/registre.js';
import { CarteRole } from '../../habit/CarteRole.js';
import { estGagnant } from './verdict.js';

export function Distribution({ game }: { game: GameView }) {
  const voix = useVoix();
  const noms = useNoms();
  const charge = peauDuSkin(useSkinId()).charge;

  return (
    <section aria-labelledby="fin-distribution" className="w-full">
      <h2 id="fin-distribution" className="font-identite text-2xl text-papier">
        Les cartes sur la table
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {game.players.map((joueur) => {
          const gagnant = estGagnant(game.winner, joueur);
          const moi = game.you?.seat === joueur.seat;
          const etat = [
            joueur.alive ? 'vivant' : 'mort',
            joueur.isCaptain ? charge : null,
            joueur.isLover ? 'amoureux' : null,
            gagnant ? 'gagnant' : null,
          ].filter((mot) => mot !== null);
          return (
            <li
              key={joueur.seat}
              data-gagnant={gagnant ? 'oui' : 'non'}
              className={`carte flex flex-col items-center gap-1 p-3 text-center ${
                gagnant ? 'border-lanterne ring-1 ring-lanterne' : ''
              } ${joueur.alive ? '' : 'opacity-80'}`}
            >
              <CarteRole role={joueur.role} retournee taille="petite" />
              <span className="font-identite text-lg leading-tight break-words text-papier">
                {noms(joueur.seat)}
                {moi ? ' (vous)' : ''}
              </span>
              {joueur.role !== null && <span className="sr-only">{voix.nomRole(joueur.role)}</span>}
              <span className="text-sm text-papier-doux">{etat.join(' · ')}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
