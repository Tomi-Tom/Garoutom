/**
 * La Voyante : sonder un vivant, jamais elle-même (R39), et tenir son carnet.
 *
 * Le carnet (`inspections`) garde chaque nuit apprise, à elle seule — et ne
 * se montre que **sous le pouce** (§ 5.1.6) : l'appui long « Carnet » de la
 * barre imprime, le temps qu'il est tenu, le cartouche du rôle sur chaque
 * jeton sondé. La vision de la nuit en cours ne s'y inscrit qu'à la clôture
 * de l'étape principale (`closePrincipal`) : d'ici là, le récapitulatif dit
 * honnêtement qu'elle viendra — et le village qui dort la lui laisse relire
 * (« Gardez le pouce : lire le carnet »).
 *
 * Elle ne peut pas passer son tour : pas de bouton « personne ».
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixVoyante() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la nuit, carte connue. Le garde sur le rôle est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'sonder') return null;

  const choisissable = (seat: number) => game.players[seat]?.alive === true && seat !== moi.seat;
  const visionDuJour = game.inspections.find((entree) => entree.day === game.day);

  return (
    <ChoixUnique
      game={game}
      testId="nuit-voyante"
      titre={voix.nomRole(moi.role)}
      consigne={textePrompt(peau, game.prompt, nom, moi.seat)}
      choisissable={choisissable}
      label="Choisir qui sonder cette nuit"
      verbe={(qui) => `Sonder ${qui}`}
      recap={(qui) => (
        <>
          Votre regard s’est posé sur <strong>{qui}</strong>.
          {visionDuJour ? '' : ' La vision s’inscrira dans votre carnet quand la nuit aura tourné.'}
        </>
      )}
      recapSansMemoire="Votre regard s’est posé. La vision s’inscrira dans votre carnet quand la nuit aura tourné."
      onValider={(target) => void jouer({ type: 'sonder', target })}
    />
  );
}
