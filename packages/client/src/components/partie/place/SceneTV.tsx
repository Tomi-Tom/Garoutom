/**
 * La Scène TV (SPEC § 7.8, `Caprices-E2-Scene-TV`) : l'écran partagé posé au
 * centre de la table — une vue de **spectateur** (`?scene=1`), donc **sans
 * aucun secret**.
 *
 * La frise (l'heure, le code de la table, le son), la place en grand cercle,
 * et au milieu le crieur en grand (`--t-planche`), le compte du vote
 * (« 7 sur 11 ont voté ») et la légende du graveur. Ni consigne, ni fil, ni
 * « Carte », ni minuterie de siège : la TV n'a pas de siège.
 *
 * Elle ne s'affiche que pour une vue sans siège (`game.you === null`) : un
 * joueur qui ouvrirait `?scene=1` garde son écran de joueur.
 */

import { BoutonSon, LienArcade } from '@tombp/arcade';
import { useMemo } from 'react';

import { Frise } from '../../caprices/index.js';
import { ARCADE_ID } from '../../../lib/identity.js';
import { useGame, useNoms, useRoom, useSkinId, useVoix } from '../../../lib/partie.js';
import { useStore } from '../../../lib/store.js';
import { peauDuSkin } from '../../../skins/registre.js';
import { compteDesVotes } from '../Action.js';
import { cleLegendeDuMoment, estBascule, raconter } from '../Narrateur.js';
import { Place } from '../Place.js';
import { titreDeLaFrise } from '../zones.js';

/** La TV est-elle demandée ? `?scene=1` dans l'adresse. */
export function estSceneTV(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('scene') === '1';
}

export function SceneTV() {
  const game = useGame();
  const room = useRoom();
  const chronique = useStore((state) => state.chronique);
  const voix = useVoix();
  const skin = useSkinId();
  const peau = peauDuSkin(skin);
  const nom = useNoms();

  const annonce = useMemo(() => {
    // Les dernières nouvelles : la phrase d'heure seulement s'il n'y a rien d'autre.
    const derniers = chronique.filter((recu) => !estBascule(recu.event)).slice(-4);
    const lignes = derniers.flatMap((recu) => raconter(recu, voix, peau, nom));
    const nouvelles = lignes.filter((ligne) => ligne.heure !== true);
    const choisies = nouvelles.length > 0 ? nouvelles.slice(-2) : lignes.slice(-1);
    return choisies.map((ligne) => ligne.texte).join(' ');
  }, [chronique, voix, peau, nom]);

  if (game === null) return null;
  const compte = compteDesVotes(game);
  const titre = titreDeLaFrise(game.phase, game.day, peau.recit);

  return (
    <div data-testid="scene-tv" className="flex h-full min-h-0 flex-col">
      <Frise
        titre={titre}
        skin={skin}
        gauche={<LienArcade id={ARCADE_ID} className="shrink-0" />}
        droite={
          <>
            <span aria-label={`Code de table : ${room?.code ?? ''}`} className="t-code flex h-11 items-center border border-[var(--filet-doux)] bg-[var(--surface)] px-3 !text-[20px]">
              {room?.code}
            </span>
            <BoutonSon className="shrink-0" />
          </>
        }
      />
      <div className="relative min-h-0 flex-1 p-8">
        <Place disposition="cercle" label="La place du village" pupitre={{ largeur: 560, hauteur: 300 }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex max-w-[540px] flex-col items-center gap-4 text-center">
            {annonce !== '' && (
              <p data-testid="scene-crieur" className="t-planche m-0 line-clamp-3">
                {annonce}
              </p>
            )}
            {compte !== null && (
              <p data-testid="scene-compte" className="m-0 text-[28px] leading-8 tabular-nums">
                {compte.ont} sur {compte.sur} <span className="text-[18px] text-[var(--encre-2)]">{compte.ont > 1 ? 'ont voté' : 'a voté'}</span>
              </p>
            )}
            <p className="t-legende m-0 text-[var(--encre-narrateur)]">« {voix.legendeEcran(cleLegendeDuMoment(game.phase))} »</p>
          </div>
        </div>
      </div>
    </div>
  );
}
