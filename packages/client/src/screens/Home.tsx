/**
 * L'accueil : le dos de la boîte, gabarit commun de la collection.
 *
 * La fiche TBP-012 vit dans le catalogue du hub — titre, pitch, statut, tout
 * vient de là et de nulle part ailleurs. Le jeu n'écrit que ses commandes ;
 * ici, tant que la table n'existe pas, il écrit l'état du chantier et rien
 * de plus. Un bouton qui ne fait rien est un mensonge ; une phrase honnête
 * est un rendez-vous.
 */

import { DosDeBoite } from '@tombp/arcade';

export function Home() {
  return (
    <DosDeBoite id="TBP-012">
      <p className="m-0 max-w-[52ch] text-[1.02rem] leading-relaxed" style={{ color: 'var(--lune)' }}>
        Le moteur est écrit et les règles sont posées. La table s'assemble : ouvrez une partie
        quand le village s'éclaire.
      </p>
    </DosDeBoite>
  );
}
