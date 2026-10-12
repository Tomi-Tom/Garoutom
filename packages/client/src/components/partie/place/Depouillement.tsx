/**
 * Le dépouillement (SPEC § 7.8, `Caprices-E2-Depouillement`) : une planche
 * « Les voix sont comptées », posée sur la table quelques secondes après la
 * clôture d'un vote — au même instant, pour le même temps, chez tous les
 * sièges (N6) ; un toucher la passe.
 *
 * Par cible, des **bâtons gravés** : un trait par voix, le cinquième barre
 * les quatre autres ; les deux voix d'office du Corbeau (R93) se marquent
 * d'une plume. Puis la petite carte du condamné se retourne (si la table
 * révèle les rôles), le verdict du crieur, et la légende du graveur.
 *
 * Ce que la planche ne dit pas, parce que l'évènement public ne le dit pas
 * (R87) : **qui** a voté pour qui, ni la voix double du capitaine — le
 * `tally` ne porte que des sommes par cible.
 */

import type { GameEvent, RoleId } from '@garoutom/engine';

import { DUREE_AVIS_MS } from '../../../anim/tokens.js';
import { BarrePouce, Bouton, Cuvette } from '../../caprices/index.js';
import { CarteRole } from '../../habit/CarteRole.js';
import { Glyphe } from '../../habit/glyphes.js';
import { useNoms, useSkinId, useVoix } from '../../../lib/partie.js';
import { useStore, type EvenementRecu } from '../../../lib/store.js';
import { peauDuSkin } from '../../../skins/registre.js';
import { dire } from '../Narrateur.js';

/** Combien de temps la planche reste posée. */
export const DUREE_DEPOUILLEMENT_MS = DUREE_AVIS_MS;

type EvenementVote = Extract<GameEvent, { type: 'vote' }>;

/** Les bâtons d'une cible : un trait par voix, le cinquième en travers ; la plume avant les voix du Corbeau. */
export function Batons({ voix, corbeau }: { voix: number; corbeau: boolean }) {
  const plume = corbeau ? 16 : 0;
  const traits: string[] = [];
  let x = plume + 2;
  for (let i = 0; i < voix; i += 1) {
    if (i % 5 === 4) {
      // Le cinquième barre les quatre précédents.
      traits.push(`M${String(x - 25)} 15L${String(x - 3)} 4`);
      x += 4;
    } else {
      traits.push(`M${String(x)} 2V18`);
      x += 6;
    }
  }
  const largeur = Math.max(plume + 4, x);
  return (
    <svg aria-hidden="true" width={largeur} height={20} viewBox={`0 0 ${String(largeur)} 20`} className="block shrink-0" data-batons={voix}>
      {corbeau && (
        <g transform="translate(0 2)" color="var(--encre)">
          <Glyphe nom="marque" taille={14} />
        </g>
      )}
      <path d={traits.join('')} stroke="var(--encre)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** La marque du Corbeau en vigueur pour ce vote : la dernière posée depuis le vote d'avant. */
function marqueAuVote(chronique: readonly EvenementRecu[], id: number): number | null {
  let marque: number | null = null;
  for (const recu of chronique) {
    if (recu.id >= id) break;
    if (recu.event.type === 'vote') marque = null;
    if (recu.event.type === 'corbeau') marque = recu.event.target;
  }
  return marque;
}

/** Le rôle révélé du condamné, s'il l'est : la mort qui suit le vote. */
function roleDuCondamne(chronique: readonly EvenementRecu[], id: number, seat: number): RoleId | null {
  for (const recu of chronique) {
    if (recu.id <= id || recu.event.type !== 'morts') continue;
    const mort = recu.event.deaths.find((d) => d.seat === seat);
    if (mort !== undefined) return mort.role;
  }
  return null;
}

export function Depouillement({ recu, onPasser }: { recu: EvenementRecu; onPasser: () => void }) {
  const chronique = useStore((state) => state.chronique);
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  const event = recu.event as EvenementVote;
  const marque = marqueAuVote(chronique, recu.id);
  const lignes = Object.entries(event.tally)
    .map(([siege, compte]) => ({ seat: Number(siege), voix: compte }))
    .filter((ligne) => ligne.voix > 0)
    .sort((a, b) => b.voix - a.voix || a.seat - b.seat);
  const condamne = event.executed;
  const role = condamne === null ? null : roleDuCondamne(chronique, recu.id, condamne);
  const verdict =
    condamne === null ? dire(peau.narrateur.vote.personne) : dire(peau.narrateur.vote.condamne, { nom: nom(condamne) });

  return (
    <div
      role="dialog"
      aria-label="Le dépouillement"
      data-testid="depouillement"
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-col bg-[var(--fond)] text-[var(--encre)] lg:top-16"
      style={{ top: 'calc(80px + env(safe-area-inset-top, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onClick={onPasser}
    >
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden border-t-[1.5px] border-[var(--filet)] px-6 py-6">
        <Cuvette className="flex w-full max-w-[420px] flex-col items-center gap-3 overflow-hidden px-5 pt-5 pb-4">
          <h2 className="t-titre m-0 text-center">Les voix sont comptées</h2>
          <ul className="m-0 flex w-full list-none flex-col gap-2 p-0" aria-label="Les voix, par cible">
            {lignes.map((ligne) => {
              const corbeau = marque === ligne.seat;
              return (
                <li key={ligne.seat} data-cible={ligne.seat} className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-y-0.5">
                  <span className="truncate text-[16px] leading-5 font-semibold">{nom(ligne.seat)}</span>
                  <span className="text-right text-[16px] leading-5 tabular-nums">{ligne.voix}</span>
                  <span className="col-span-2">
                    <Batons voix={ligne.voix} corbeau={corbeau} />
                  </span>
                  {corbeau && (
                    <span className="t-statut col-span-2">
                      {voix.nomRole('corbeau')} +2
                    </span>
                  )}
                  <span className="sr-only">
                    {`${String(ligne.voix)} voix${corbeau ? `, dont deux d’office par ${voix.nomRole('corbeau')}` : ''}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex w-full items-center gap-3">
            {condamne !== null && (
              <span
                role="img"
                aria-label={role === null ? `La carte de ${nom(condamne)} reste face contre table` : `La carte de ${nom(condamne)} se retourne : ${voix.nomRole(role)}`}
                className="block shrink-0"
              >
                <CarteRole role={role} retournee={role !== null} taille="petite" />
              </span>
            )}
            <p data-testid="verdict" className="m-0 text-[16px] leading-6">
              {verdict}
            </p>
          </div>
          <p className="t-legende m-0 text-center text-[var(--encre-narrateur)]">« {voix.legendeEcran('depouillement')} »</p>
        </Cuvette>
      </div>
      <BarrePouce>
        <Bouton variante="secondaire" onClick={onPasser}>
          Toucher pour passer
        </Bouton>
      </BarrePouce>
    </div>
  );
}
