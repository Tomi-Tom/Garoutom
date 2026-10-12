/**
 * Les cartes retournées (SPEC Caprices § 5.15 ; maquette
 * `C-Fin-Distribution`) : la grille des **petites cartes** — trois colonnes
 * sur mobile, six sur desktop —, le pseudo dessous, puis le sort en statut
 * (« dévoré·e nuit 1 », « exécuté·e jour 2 », « en vie à la fin »), et les
 * marques : gagnant·e, la charge, le serment.
 *
 * Les gagnants se signalent par un **double filet** autour de la carte, et le
 * mot le confirme — jamais par une couleur.
 */

import type { DeathCause, GameView } from '@garoutom/engine';

import { useNoms, useSkinId } from '../../../lib/partie.js';
import { peauDuSkin, resoudre } from '../../../skins/registre.js';
import { CarteRole } from '../../habit/CarteRole.js';
import { decouperLog } from './recit.js';
import { estGagnant } from './verdict.js';

/** Le sort d'un mort, en un participe (il ne s'accorde pas au pseudo). */
const SORTS: Record<DeathCause, string> = {
  loups: 'dévoré·e',
  poison: 'empoisonné·e',
  vote: 'exécuté·e',
  chasseur: 'abattu·e',
  chagrin: 'mort·e de chagrin',
  abandon: 'parti·e',
};

/** « Nuit 2 » → « nuit 2 » : l'heure se lit en minuscule au milieu d'un statut. */
function minuscule(texte: string): string {
  return texte.charAt(0).toLocaleLowerCase('fr') + texte.slice(1);
}

/** Pour chaque mort, sa cause et son heure — lue dans le découpage du récit. */
function sortsDuLog(game: GameView, recit: { nuit: string; jour: string }): Map<number, string> {
  const sorts = new Map<number, string>();
  for (const jour of decouperLog(game.log ?? [])) {
    for (const heure of ['nuit', 'jour'] as const) {
      for (const entree of jour[heure]) {
        if (entree.type !== 'mort') continue;
        const quand = minuscule(resoudre(heure === 'nuit' ? recit.nuit : recit.jour, { n: String(jour.n) }));
        sorts.set(entree.seat, `${SORTS[entree.cause]} ${quand}`);
      }
    }
  }
  return sorts;
}

export function Distribution({ game }: { game: GameView }) {
  const noms = useNoms();
  const peau = peauDuSkin(useSkinId());
  const sorts = sortsDuLog(game, peau.recit);

  return (
    <section aria-labelledby="fin-distribution" className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="fin-distribution" className="t-titre m-0">
          Les cartes retournées
        </h2>
        <p className="t-rubrique m-0 text-encre-2">
          {game.players.length} cartes<span className="max-lg:hidden"> · les gagnants : double filet</span>
        </p>
      </div>
      <ul className="m-0 mt-4 grid list-none grid-cols-3 gap-x-2 gap-y-1.5 p-0 lg:grid-cols-6 lg:gap-y-[18px]">
        {game.players.map((joueur) => {
          const gagnant = estGagnant(game.winner, joueur);
          const moi = game.you?.seat === joueur.seat;
          const sort = joueur.alive ? 'en vie à la fin' : (sorts.get(joueur.seat) ?? 'mort·e');
          const marques = [
            gagnant ? 'gagnant·e' : null,
            joueur.isCaptain ? peau.charge : null,
            joueur.isLover ? 'lié·e' : null,
          ].filter((mot) => mot !== null);
          return (
            <li
              key={joueur.seat}
              data-gagnant={gagnant ? 'oui' : 'non'}
              className="flex min-w-0 flex-col items-center text-center"
            >
              {/* Le double filet des gagnants : 1,5 dehors, 0,75 dedans, 2 d'écart. */}
              <span
                className={`block border-[1.5px] p-[2px] ${gagnant ? 'border-encre' : 'border-transparent'}`}
                data-double-filet={gagnant ? '' : undefined}
              >
                <span className={`block border-[0.75px] ${gagnant ? 'border-encre' : 'border-transparent'}`}>
                  <CarteRole role={joueur.role} retournee taille="petite" />
                </span>
              </span>
              <span className={`t-nom mt-2 max-w-full break-words ${moi ? 'font-bold' : ''}`}>{noms(joueur.seat)}</span>
              <span className="t-statut max-w-[112px]">{moi ? `vous · ${sort}` : sort}</span>
              {marques.length > 0 && <span className="t-statut max-w-[112px]">{marques.join(' · ')}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
