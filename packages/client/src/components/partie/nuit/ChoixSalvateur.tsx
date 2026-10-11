/**
 * Le Salvateur : un vivant sous le bouclier, lui-même permis — jamais celui
 * d'hier (R38). Le jeton interdit reste sur la place, grisé par `Place` faute
 * d'être choisissable, et une pastille dit pourquoi ; la consigne du skin le
 * nomme déjà (« {ancien} dormait sous votre bouclier hier »).
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { EnTeteRole, GabaritRole, Pastille, usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixSalvateur() {
  const game = useGame();
  const peau = usePeau();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'proteger') return null;
  const moi = game.you;
  const interdit = game.prompt.forbidden;

  const choisissable = (seat: number) => game.players[seat]?.alive === true && seat !== interdit;

  return (
    <GabaritRole teinte="lune" testId="nuit-salvateur">
      <EnTeteRole role={moi.role} teinte="lune" texte={textePrompt(peau, game.prompt, nom, moi.seat)} />
      <ChoixUnique
        acted={game.acted}
        choisissable={choisissable}
        teinte="lune"
        label="Choisir qui protéger cette nuit"
        verbe={(qui) => `Protéger ${qui}`}
        recap={(qui) => (
          <>
            Votre bouclier veille sur <strong>{qui}</strong>.
          </>
        )}
        recapSansMemoire="Votre bouclier est posé."
        onValider={(target) => void jouer({ type: 'proteger', target })}
        {...(interdit === null
          ? {}
          : { annotations: { [interdit]: <Pastille teinte="lune">protégé·e hier</Pastille> } })}
      />
    </GabaritRole>
  );
}
