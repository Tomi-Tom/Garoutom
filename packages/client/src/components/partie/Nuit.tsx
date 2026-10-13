/**
 * La phase `nuit` : l'écran du rôle si un prompt de nuit parle à ce siège,
 * sinon le village qui dort.
 *
 * Chaque écran compose **le même** `<Gabarit/>` (SPEC § 7.1, loi N1) : la
 * frise, la minuterie et le crieur communs (`useZonesCommunes`), puis la
 * consigne, la place, le résumé, le pli et la barre au pouce — mêmes zones,
 * mêmes hauteurs pour le dormeur, le mort, l'amoureux, chaque rôle qui agit
 * et le spectateur (`nuit/EcranNuit.tsx`). Ce qui change, c'est le texte dans
 * les zones, et si les jetons répondent au toucher.
 *
 * Le tri est celui de la vue, et seulement d'elle : un spectateur, un mort,
 * ou un vivant que l'étape n'appelle pas voient le même village endormi —
 * personne ne doit pouvoir deviner, à l'écran d'un voisin, qui joue cette
 * nuit. La Petite Fille n'a pas de prompt (R95) : elle voit le village qui
 * dort, sa porte entrouverte en plus, à elle seule. Le serment des amoureux
 * n'est plus une ligne de plus chez eux seuls : c'est le libellé du pli,
 * dont la forme est celle de tous.
 *
 * Les deux solitaires de la première nuit jouent ici comme les autres, à
 * l'étape principale : le Chien-Loup s'y range (R111), l'Enfant Sauvage y
 * désigne son modèle (R112). Le Voleur, lui, choisit avant la révélation —
 * sa phase n'est pas `nuit`, et c'est `ChoixVoleur` qui la porte, depuis
 * l'aiguillage de `Partie`.
 */

import { useGame } from '../../lib/partie.js';
import { ChoixChienLoup } from './nuit/ChoixChienLoup.js';
import { ChoixCorbeau } from './nuit/ChoixCorbeau.js';
import { ChoixCupidon } from './nuit/ChoixCupidon.js';
import { ChoixLoupBlanc } from './nuit/ChoixLoupBlanc.js';
import { ChoixMeute } from './nuit/ChoixMeute.js';
import { ChoixModele } from './nuit/ChoixModele.js';
import { ChoixRenard } from './nuit/ChoixRenard.js';
import { ChoixSalvateur } from './nuit/ChoixSalvateur.js';
import { ChoixSorciere } from './nuit/ChoixSorciere.js';
import { ChoixVoyante } from './nuit/ChoixVoyante.js';
import { estPromptDeNuit } from './nuit/textes.js';
import { VillageDort } from './nuit/VillageDort.js';

export function Nuit() {
  const game = useGame();
  if (game === null) return null;

  const moi = game.you;
  const prompt = game.prompt;
  if (moi === null || !moi.alive || !estPromptDeNuit(prompt)) return <VillageDort />;

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
    case 'flairer':
      return <ChoixRenard />;
    case 'trahir':
      return <ChoixLoupBlanc />;
    case 'seRanger':
      return <ChoixChienLoup />;
    case 'designerModele':
      return <ChoixModele />;
  }
}
