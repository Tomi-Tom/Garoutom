/**
 * Le pli (SPEC § 5.14) : une rangée de 44 px juste au-dessus de la barre au
 * pouce, présente sur **tous** les écrans de partie, jour et nuit —
 * cartouche du canal, libellé, compteur, chevron. C'est la poignée du fil
 * le jour ; la nuit, sa forme est la même pour tous et seul le libellé
 * change selon la vue : « Le registre » (dormeur), « Le serment · 2 »
 * (amoureux vivant), « La meute · 1 » (loup, pendant l'étape),
 * « L'au-delà · 4 » (mort). Le serment n'est ainsi plus une ligne en plus
 * chez les seuls amoureux.
 *
 * Le compteur s'écrit en chiffres (`--t-chiffre`) : jamais de pastille qui
 * clignote, jamais de son.
 */

import { Icone, type NomIcone } from '../habit/Icone.js';
import { Cartouche, type FormeCartouche } from './Cartouche.js';

export function Pli({
  libelle,
  compte,
  forme = 'ecu',
  icone = 'fil',
  onOuvrir,
}: {
  libelle: string;
  compte?: number;
  forme?: FormeCartouche;
  /** L'icône avant le chevron : le phylactère du fil, ou le registre. */
  icone?: NomIcone;
  onOuvrir: () => void;
}) {
  return (
    <button type="button" className="pli" onClick={onOuvrir} aria-haspopup="true">
      <Cartouche forme={forme} taille={20}>
        {libelle}
      </Cartouche>
      {compte !== undefined && <span className="t-chiffre">· {compte}</span>}
      <span className="pli-chevron" aria-hidden="true">
        <Icone nom={icone} />
        <svg width="20" height="20" viewBox="0 0 24 24" focusable="false">
          <path
            d="M6 15 L12 9 L18 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
