/**
 * La planche d'aube (SPEC § 7.8 — `Caprices-E2-Aube-Planche`, `-Paisible`,
 * `-Corbeau`) : au passage de la nuit au jour, quelques secondes, la même
 * pour tous ; un toucher la passe (`PlanchePassagere`).
 *
 * Dans la cuvette : « Aube II » (le titre du skin, le jour en chiffres
 * romains), la vignette et la légende du graveur, puis les lignes du crieur
 * — exactement les phrases du narrateur (`raconter`), jamais d'autres :
 *
 * | l'aube annonce            | vignette          | légende                         |
 * |---------------------------|-------------------|---------------------------------|
 * | la marque du Corbeau      | lettre cachetée   | `legendeRecit('corbeau')`       |
 * | des morts                 | yeux dans le noir | `legendeEcran('aubeMorts')`     |
 * | personne                  | le dormeur        | `legendeEcran('aubePaisible')`  |
 *
 * La marque du Corbeau l'emporte, même sur une mort (la maquette
 * `Aube-Corbeau` en fait foi) : c'est la nouvelle qui pèse sur le vote du jour.
 */

import { useNoms, useSkinId, useVoix } from '../../../lib/partie.js';
import { peauDuSkin } from '../../../skins/registre.js';
import { Icone } from '../../habit/Icone.js';
import { Vignette, type NomVignette } from '../../habit/Vignette.js';
import { dire, raconter } from '../Narrateur.js';
import { CadrePlanche, type Planche } from './PlanchePassagere.js';

/** Un nombre en chiffres romains : 1 → I, 4 → IV, 12 → XII. Au-delà de 3 999, en chiffres arabes. */
export function chiffreRomain(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 4_000) return String(n);
  const valeurs: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let reste = n;
  let resultat = '';
  for (const [valeur, chiffre] of valeurs) {
    while (reste >= valeur) {
      resultat += chiffre;
      reste -= valeur;
    }
  }
  return resultat;
}

type PlancheAube = Extract<Planche, { genre: 'aube' }>;

export function Aube({ planche, debut, onPasser }: { planche: PlancheAube; debut: number; onPasser: () => void }) {
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();

  const corbeau = planche.recus.some((recu) => recu.event.type === 'corbeau');
  const morts = planche.recus.some((recu) => recu.event.type === 'morts' && recu.event.deaths.length > 0);
  const vignette: NomVignette = corbeau ? 'lettre' : morts ? 'yeux' : 'dormeur';
  const legende = corbeau
    ? voix.legendeRecit('corbeau')
    : voix.legendeEcran(morts ? 'aubeMorts' : 'aubePaisible');
  const titre = dire(peau.recit.aube ?? 'Aube {n}', { n: chiffreRomain(Math.max(1, planche.jour)) });
  const lignes = planche.recus.flatMap((recu) =>
    raconter(recu, voix, peau, nom)
      .filter((ligne) => ligne.heure !== true)
      .map((ligne) => ({ ...ligne, corbeau: recu.event.type === 'corbeau' })),
  );

  return (
    <CadrePlanche libelle={`${titre} — ${legende}`} testId="aube" debut={debut} onPasser={onPasser}>
      <p data-testid="aube-titre" className="t-heure m-0 text-center">
        {titre}
      </p>
      <Vignette nom={vignette} taille={96} />
      <p data-testid="aube-legende" className="t-legende m-0 text-center text-[var(--encre-narrateur)]">
        « {legende} »
      </p>
      <span aria-hidden="true" className="block h-[0.75px] w-24 shrink-0 bg-[var(--filet)]" />
      <div className="flex min-h-0 flex-col gap-2 self-stretch overflow-hidden">
        {lignes.map((ligne) => {
          const icone = ligne.corbeau ? 'plume' : ligne.ton === 'sang' ? 'chandelle' : null;
          return (
            <p
              key={ligne.cle}
              data-ligne=""
              data-mort={ligne.ton === 'sang' ? '' : undefined}
              className="m-0 flex items-start gap-1.5 text-left text-[16px] leading-6"
            >
              {icone !== null && (
                <span className="mt-1 inline-flex size-4 shrink-0 [&>svg]:size-4">
                  <Icone nom={icone} />
                </span>
              )}
              <span>{ligne.texte}</span>
            </p>
          );
        })}
      </div>
    </CadrePlanche>
  );
}
