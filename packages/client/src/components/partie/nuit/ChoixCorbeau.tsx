/**
 * Le Corbeau : marquer un vivant — lui compris — ou personne (R93).
 *
 * Il joue à l'étape principale, avec les autres : son choix peut changer tant
 * qu'elle court. La marque sera annoncée à l'aube, deux voix d'office contre
 * le marqué au vote du jour — jamais sa main : rien ici ne dit à un autre
 * siège qu'il a joué.
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixCorbeau() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la nuit, carte connue. Le garde sur le rôle est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'marquer') return null;

  // Un vivant, soi compris : le Corbeau peut se marquer lui-même (R93).
  const choisissable = (seat: number) => game.players[seat]?.alive === true;
  const marquer = (target: number | null) => void jouer({ type: 'marquer', target });

  return (
    <ChoixUnique
      game={game}
      testId="nuit-corbeau"
      titre={voix.nomRole(moi.role)}
      consigne={textePrompt(peau, game.prompt, nom, moi.seat)}
      choisissable={choisissable}
      label="Choisir qui marquer cette nuit"
      verbe={(qui) => `Marquer ${qui}`}
      recap={(qui) => (
        <>
          Votre marque est posée sur <strong>{qui}</strong> : deux voix l’attendront au vote du jour.
        </>
      )}
      recapSansMemoire="Votre choix est fait : l’aube dira la marque, jamais votre main."
      onValider={(target) => marquer(target)}
      personne={{
        libelle: 'Ne marquer personne',
        recap: 'Vous ne marquez personne cette nuit.',
        onValider: () => marquer(null),
      }}
    />
  );
}
