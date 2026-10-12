/**
 * Le Salvateur : un vivant sous le bouclier, lui-même permis — jamais celui
 * d'hier (R38). Le jeton interdit reste sur la place, non choisissable, et
 * la place le dessine dans l'état 16 (« hier », bouclier barré) ; la
 * consigne du skin le nomme déjà (« {ancien} dormait sous votre bouclier
 * hier »).
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixSalvateur() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'proteger') return null;
  const moi = game.you;
  const interdit = game.prompt.forbidden;

  const choisissable = (seat: number) => game.players[seat]?.alive === true && seat !== interdit;

  return (
    <ChoixUnique
      game={game}
      testId="nuit-salvateur"
      titre={voix.nomRole(moi.role)}
      consigne={textePrompt(peau, game.prompt, nom, moi.seat)}
      choisissable={choisissable}
      label="Choisir qui protéger cette nuit"
      verbe={(qui) => `Protéger ${qui}`}
      recap={(qui) => (
        <>
          Bouclier posé sur <strong>{qui}</strong>.
        </>
      )}
      recapSansMemoire="Votre bouclier est posé."
      onValider={(target) => void jouer({ type: 'proteger', target })}
      {...(interdit === null ? {} : { interdits: [interdit] })}
    />
  );
}
