/**
 * La phase `nuit` : l'écran du rôle si un prompt de nuit parle à ce siège,
 * sinon le village qui dort.
 *
 * `Partie` délègue ici tout l'écran sous son en-tête (la minuterie, elle,
 * reste dans l'en-tête). Le tri est celui de la vue, et seulement d'elle :
 * un spectateur, un mort, ou un vivant que l'étape n'appelle pas voient le
 * même village endormi — personne ne doit pouvoir deviner, à l'écran d'un
 * voisin, qui joue cette nuit.
 *
 * La Petite Fille n'a pas de prompt (R95) : elle voit le village qui dort,
 * comme un villageois — sa porte entrouverte s'y ajoute, et à elle seule.
 *
 * Les amoureux vivants gardent un accès replié à leur serment, quel que soit
 * l'écran : le canal leur appartient la nuit comme le jour.
 */

import { useGame } from '../../lib/partie.js';
import { ChoixCorbeau } from './nuit/ChoixCorbeau.js';
import { ChoixCupidon } from './nuit/ChoixCupidon.js';
import { ChoixLoupBlanc } from './nuit/ChoixLoupBlanc.js';
import { ChoixMeute } from './nuit/ChoixMeute.js';
import { ChoixSalvateur } from './nuit/ChoixSalvateur.js';
import { ChoixSorciere } from './nuit/ChoixSorciere.js';
import { ChoixVoyante } from './nuit/ChoixVoyante.js';
import { CanalReplie } from './nuit/commun.js';
import { estPromptDeNuit } from './nuit/textes.js';
import { VillageDort } from './nuit/VillageDort.js';

export function Nuit() {
  const game = useGame();
  if (game === null) return null;

  const moi = game.you;
  const prompt = game.prompt;
  if (moi === null || !moi.alive || !estPromptDeNuit(prompt)) return <VillageDort />;

  const ecran = (() => {
    switch (prompt.kind) {
      case 'cupidon':
        return <ChoixCupidon />;
      case 'proteger':
        return <ChoixSalvateur />;
      case 'sonder':
        return <ChoixVoyante />;
      case 'devorer':
        return <ChoixMeute />;
      case 'sorciere':
        return <ChoixSorciere />;
      case 'marquer':
        return <ChoixCorbeau />;
      case 'trahir':
        return <ChoixLoupBlanc />;
    }
  })();

  // `shrink-0` : le `main` de la partie est une colonne qui défile ; un écran
  // qui s'y laisserait rétrécir déborderait hors d'atteinte au lieu de défiler.
  return (
    <div className="flex min-h-full shrink-0 flex-col pb-6">
      {ecran}
      {game.channels.includes('amoureux') && (
        <div className="mx-auto w-[min(44rem,100%)] px-4">
          <CanalReplie canal="amoureux" teinte="serment" />
        </div>
      )}
    </div>
  );
}
