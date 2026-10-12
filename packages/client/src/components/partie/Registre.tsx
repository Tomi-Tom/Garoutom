/**
 * Le registre (SPEC § 5.9) : le journal de la table, en feuille basse.
 *
 * Des blocs par heure — « Nuit II », « Jour II » —, titrés en rubrique avec un
 * filet de 0,75 pleine largeur ; le plus récent en haut, ouvert, les autres
 * repliés sous leur nombre d'annonces. Une mort : la chandelle soufflée, et le
 * rôle révélé en cartouche de 20 à la fin de la ligne. Aucune couleur hors
 * cartouche.
 *
 * Le registre ne dit que ce que les évènements publics disent (R87) : c'est la
 * chronique du magasin, la même que le crieur — rien de privé n'y passe.
 */
import { useMemo } from 'react';

import { campOf, type GameEvent, type RoleId } from '@garoutom/engine';

import { useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { useStore, type EvenementRecu } from '../../lib/store.js';
import { peauDuSkin, type Skin, type Voix } from '../../skins/registre.js';
import { Cartouche, type FormeCartouche } from '../caprices/Cartouche.js';
import { Icone } from '../habit/Icone.js';
import { FeuilleBasse } from './fil/FeuilleBasse.js';
import { dire, raconter } from './Narrateur.js';

/** Une ligne du registre : une phrase, et le rôle d'un mort quand la table le révèle. */
interface Annonce {
  cle: string;
  texte: string;
  mort?: boolean;
  role?: RoleId;
}

interface Bloc {
  cle: string;
  heure: string;
  titre: string;
  annonces: Annonce[];
}

/** La forme du cartouche d'un rôle révélé : le village à l'écu, la meute mordue, le Loup Blanc seul. */
export function formeDuRole(role: RoleId): FormeCartouche {
  if (role === 'loupBlanc') return 'seul';
  return campOf(role) === 'loups' ? 'mordu' : 'ecu';
}

/**
 * La chronique découpée en nuits et en jours : la partie s'ouvre sur la nuit I,
 * et chaque évènement `phase` ouvre le bloc de son heure — les morts de l'aube
 * restent dans la nuit qui les a faites.
 */
export function blocsDuRegistre(
  chronique: readonly EvenementRecu[],
  voix: Voix,
  peau: Skin,
  nom: (seat: number) => string,
): Bloc[] {
  const blocs: Bloc[] = [];
  for (const recu of chronique) {
    const event: GameEvent = recu.event;
    let ouverture: { heure: 'nuit' | 'jour'; numero: number } | null = null;
    if (event.type === 'phase' && event.phase !== 'fin') {
      const heure = event.phase === 'nuit' || event.phase === 'revelation' ? 'nuit' : 'jour';
      ouverture = { heure, numero: event.day };
    } else if (blocs.length === 0) {
      ouverture = { heure: 'nuit', numero: event.type === 'debut' ? 1 : Math.max(1, recu.day) };
    }
    if (ouverture !== null) {
      const heure = `${ouverture.heure}-${String(ouverture.numero)}`;
      if (blocs[blocs.length - 1]?.heure !== heure) {
        blocs.push({
          cle: `${heure}-${String(blocs.length)}`,
          heure,
          titre: dire(peau.recit[ouverture.heure], { n: String(ouverture.numero) }),
          annonces: [],
        });
      }
    }
    const courant = blocs[blocs.length - 1];
    if (courant === undefined) continue;
    if (event.type === 'morts') {
      event.deaths.forEach((mort, rang) => {
        courant.annonces.push({
          cle: `${String(recu.id)}-${String(rang)}`,
          texte: dire(voix.phraseMort(mort.cause, nom(mort.seat), mort.role)),
          mort: true,
          ...(mort.role === null ? {} : { role: mort.role }),
        });
      });
    } else {
      for (const ligne of raconter(recu, voix, peau, nom)) {
        courant.annonces.push({ cle: ligne.cle, texte: ligne.texte });
      }
    }
  }
  return blocs;
}

export function Registre({ onFermer }: { onFermer: () => void }) {
  const chronique = useStore((state) => state.chronique);
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  // Le plus récent en haut, ouvert.
  const blocs = useMemo(() => blocsDuRegistre(chronique, voix, peau, nom).reverse(), [chronique, voix, peau, nom]);

  return (
    <FeuilleBasse titre="Le registre" onFermer={onFermer}>
      <div data-testid="registre">
        {blocs.length === 0 && <p className="t-statut py-4 italic">Rien n’a encore été dit.</p>}
        {blocs.map((bloc, rang) => (
          <details key={bloc.cle} open={rang === 0} data-heure={bloc.heure} className="mb-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-b-[0.75px] border-[var(--filet)]">
              <h3 className="t-rubrique">{bloc.titre}</h3>
              <span className="t-statut">
                {bloc.annonces.length} {bloc.annonces.length > 1 ? 'annonces' : 'annonce'}
              </span>
            </summary>
            <ol className="m-0 flex list-none flex-col gap-2 p-0 pt-2">
              {bloc.annonces.map((annonce) => (
                <li key={annonce.cle} className="t-corps flex items-start gap-2">
                  {annonce.mort === true && (
                    <span className="mt-0.5 shrink-0" data-mort="">
                      <Icone nom="chandelle" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {annonce.texte}
                    {annonce.role !== undefined && (
                      <>
                        {' '}
                        <Cartouche forme={formeDuRole(annonce.role)} taille={20}>
                          {voix.nomRole(annonce.role)}
                        </Cartouche>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </FeuilleBasse>
  );
}
