/**
 * Le Loup Blanc, une nuit paire : dévorer un autre loup vivant, ou épargner
 * la meute (R97).
 *
 * L'étape est la sienne, seul en scène : la meute dort, son canal n'est pas
 * là, et le premier choix clôt l'étape (`settle`) — pas de retour possible :
 * le libellé armé le dit (« Confirmer — sans retour : … »). Les jetons qu'il
 * peut toucher sont ceux de la meute (`pack.seats`), sauf le sien ; les
 * autres restent sur la place, non choisissables — rien d'autre ne les
 * distingue, et aucune teinte de sang (N2).
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixLoupBlanc() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'trahir') return null;
  const moi = game.you;

  const meute = game.pack?.seats ?? [];
  const choisissable = (seat: number) =>
    seat !== moi.seat && meute.includes(seat) && game.players[seat]?.alive === true;
  const trahir = (target: number | null) => void jouer({ type: 'trahir', target });

  return (
    <ChoixUnique
      game={game}
      testId="nuit-loup-blanc"
      titre={voix.nomRole(moi.role)}
      consigne={textePrompt(peau, game.prompt, nom, moi.seat)}
      choisissable={choisissable}
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
  );
}
