/**
 * L’Enfant Sauvage, la première nuit : désigner son modèle parmi les vivants,
 * lui compris (R112).
 *
 * Il joue à l’étape principale, en parallèle des autres : son choix peut
 * changer tant que l’étape court, et rien ici ne dit à un autre siège qu’il a
 * joué. Le modèle, vivant, n’est jamais informé — ni cette nuit, ni le jour
 * où sa mort transformera l’Enfant : la transformation ne se crie pas, seul
 * le récapitulatif de fin la raconte (D33).
 */

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixModele() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la première nuit, carte connue. Le garde est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'designerModele') return null;

  // N’importe quel vivant, lui compris : le modèle ne sait jamais qu’il l’est
  // (R112) — l’Enfant peut se désigner lui-même, et ne se transformera alors
  // qu’à sa propre mort, qui ne laisse personne derrière.
  const choisissable = (seat: number) => game.players[seat]?.alive === true;
  const designer = (target: number) => void jouer({ type: 'designerModele', target });

  return (
    <ChoixUnique
      game={game}
      testId="nuit-enfant-sauvage"
      titre={voix.nomRole(moi.role)}
      consigne={textePrompt(peau, game.prompt, nom, moi.seat)}
      choisissable={choisissable}
      label="Choisir votre modèle"
      verbe={(qui) => `Prendre ${qui} pour modèle`}
      recap={(qui) => (
        <>
          Votre modèle est <strong>{qui}</strong> — personne ne le lui dira. À sa mort, vous rejoindrez la
          meute.
        </>
      )}
      // Un choix parti reste inconnu de l’écran sans la vue : le silence du
      // récapitulatif ne promet rien.
      recapSansMemoire="Votre modèle est choisi : il ne le saura jamais."
      onValider={designer}
    />
  );
}
