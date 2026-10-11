/**
 * Le Loup Blanc, une nuit paire : dévorer un autre loup vivant, ou épargner
 * la meute (R97).
 *
 * L'étape est la sienne, seul en scène : la meute dort, son canal n'est pas
 * là, et le premier choix clôt l'étape (`settle`) — pas de retour possible.
 * Les jetons qu'il peut toucher sont ceux de la meute (`pack.seats`), sauf
 * le sien ; la teinte est celle du sang.
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { EnTeteRole, GabaritRole, usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixLoupBlanc() {
  const game = useGame();
  const peau = usePeau();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'trahir') return null;
  const moi = game.you;

  const meute = game.pack?.seats ?? [];
  const choisissable = (seat: number) =>
    seat !== moi.seat && meute.includes(seat) && game.players[seat]?.alive === true;
  const trahir = (target: number | null) => void jouer({ type: 'trahir', target });

  return (
    <GabaritRole teinte="sang" testId="nuit-loup-blanc">
      <EnTeteRole role={moi.role} teinte="sang" texte={textePrompt(peau, game.prompt, nom, moi.seat)} />
      <ChoixUnique
        acted={game.acted}
        choisissable={choisissable}
        teinte="sang"
        label="Choisir quel loup dévorer cette nuit"
        verbe={(qui) => `Dévorer ${qui}`}
        recap={(qui) => (
          <>
            Vous avez choisi <strong>{qui}</strong>.
          </>
        )}
        recapSansMemoire="Votre choix est fait."
        onValider={(target) => trahir(target)}
        personne={{
          libelle: 'Épargner la meute',
          recap: 'Vous épargnez la meute cette nuit.',
          onValider: () => trahir(null),
        }}
        changeable={false}
      />
    </GabaritRole>
  );
}
