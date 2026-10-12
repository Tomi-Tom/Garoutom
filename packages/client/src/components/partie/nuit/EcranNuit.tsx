/**
 * Le gabarit de la nuit — la loi N1 en pixels (SPEC § 3.5, § 7.1).
 *
 * Pendant `nuit`, **tous** les sièges — le dormeur, le mort, l'amoureux,
 * chaque rôle qui agit, le spectateur — montrent le même squelette : la
 * frise, la minuterie et le crieur (`useZonesCommunes`), puis la consigne, la
 * place, le résumé, le pli et la barre au pouce, aux mêmes hauteurs. Ce qui
 * change d'un siège à l'autre, c'est le texte dans les zones, et si les
 * jetons répondent au toucher. Un voisin à un mètre ne lit pas l'écran d'à
 * côté : il en voit la forme — et la forme est la même.
 *
 * Le **pli** est le même pour tous ; seul son libellé suit la vue (§ 5.14) :
 * « Le registre » (qui dort), « Le serment » (l'amoureux vivant), « La
 * meute » (le loup pendant l'étape), « L'au-delà » (le mort). Il ouvre le fil
 * au tiers ; sur grand écran, le fil vit dans la colonne droite, ouverte
 * pour tous.
 *
 * La **barre au pouce** a, chez tous, exactement deux boutons de même
 * gabarit (arbitrage du chef) : à gauche l'appui long « Gardez le pouce : ma
 * carte » (`<MaCarte declencheur="barre"/>`), à droite l'action principale —
 * « Dévorer Fanny », « Ne viser personne », « Choisissez un vivant », ou chez
 * qui n'a rien à jouer « Fermer les yeux ». Qui agit et qui dort ne se
 * distinguent plus au nombre de boutons.
 */

import type { ChatChannel } from '@garoutom/engine';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { useGame, useVoix } from '../../../lib/partie.js';
import { BarrePouce, Gabarit, Pli, type FilOuvert, type FormeCartouche } from '../../caprices/index.js';
import type { NomIcone } from '../../habit/Icone.js';
import { Fil } from '../Fil.js';
import { Place, type PlaceProps } from '../Place.js';
import { useZonesCommunes } from '../zones.js';
import { useGrandEcran } from './commun.js';
import { appuiMaCarte } from './sousLePouce.js';

/** Ce que l'écran de nuit dit à sa place : le fil ouvert, le grand écran. */
const ContexteNuit = createContext<{ filOuvert: boolean; grand: boolean }>({ filOuvert: false, grand: false });

/**
 * La place de la nuit : la `<Place/>` de la table, avec ce que tous les
 * sièges partagent — la densité suit la table (D2 à 12, D3 à 18 ; D4 quand le
 * fil est ouvert au tiers), le cercle autour du pupitre sur grand écran.
 * Aucune teinte : le choix ne se colore jamais (§ 5.1.4, N2).
 */
export function PlaceDeNuit(props: Omit<PlaceProps, 'teinte' | 'compacte' | 'filOuvert' | 'disposition'>) {
  const { filOuvert, grand } = useContext(ContexteNuit);
  return <Place {...props} teinte="lune" filOuvert={filOuvert} disposition={grand ? 'cercle' : 'grille'} />;
}

interface PliDeNuit {
  libelle: string;
  forme: FormeCartouche;
  icone: NomIcone;
  /** Les canaux que le fil montre derrière ce pli (absent : tous ceux que ce siège lit). */
  canaux?: readonly ChatChannel[];
}

/** Le libellé du pli selon la vue — la forme, elle, ne change jamais. */
function usePliDeNuit(meute: boolean): PliDeNuit {
  const game = useGame();
  const voix = useVoix();
  const moi = game?.you ?? null;
  if (meute) return { libelle: voix.libelleCanal('loups'), forme: 'mordu', icone: 'fil', canaux: ['loups'] };
  if (moi !== null && !moi.alive) return { libelle: voix.libelleCanal('morts'), forme: 'bruni', icone: 'fil' };
  if (moi !== null && (game?.lover != null || game?.channels.includes('amoureux') === true)) {
    return { libelle: voix.libelleCanal('amoureux'), forme: 'lacs', icone: 'fil' };
  }
  return { libelle: 'Le registre', forme: 'ecu', icone: 'registre' };
}

export function EcranNuit({
  testId,
  consigne,
  place,
  apresPlace,
  resume,
  action,
  meute = false,
}: {
  testId: string;
  /** La zone de consigne (`<Consigne/>`). */
  consigne: ReactNode;
  /** La place (`<PlaceDeNuit …/>`). */
  place: ReactNode;
  /** Ce que la place dit aux seuls lecteurs d'écran (votes de la meute, carnet…). */
  apresPlace?: ReactNode;
  /** La ligne de résumé ; vide, elle garde sa hauteur. */
  resume?: ReactNode;
  /**
   * Le bouton principal de la barre, à droite de « ma carte » : un seul
   * `<Bouton variante="primaire">`, jamais éteint (§ 5.4, arbitrage du chef).
   */
  action: ReactNode;
  /** L'écran de la meute : le pli ouvre son canal. */
  meute?: boolean;
}) {
  const game = useGame();
  const zones = useZonesCommunes();
  const grand = useGrandEcran();
  const pli = usePliDeNuit(meute);
  const [fil, setFil] = useState<FilOuvert>('ferme');
  const [nonLus, setNonLus] = useState(0);

  return (
    <section data-testid={testId} aria-label="La nuit" className="h-full min-h-0">
      <Gabarit
        frise={zones.frise}
        minuterie={zones.minuterie}
        crieur={zones.crieur}
        consigne={consigne}
        place={
          <ContexteNuit.Provider value={{ filOuvert: fil === 'tiers', grand }}>
            <div className="relative h-full">
              {place}
              {apresPlace}
            </div>
          </ContexteNuit.Provider>
        }
        resume={<div className="h-full">{resume}</div>}
        pli={
          // N2 : le cartouche mordu de la meute mord au palier I ; seul son mot est en craie.
          <div className="h-full [&_[data-forme=mordu]]:[--cartouche-trait:var(--cp-palier-1)]">
            <Pli
              libelle={pli.libelle}
              forme={pli.forme}
              icone={pli.icone}
              {...(nonLus > 0 ? { compte: nonLus } : {})}
              onOuvrir={() => setFil('tiers')}
            />
          </div>
        }
        colonne={
          grand ? (
            <Fil mode="colonne" {...(pli.canaux ? { canaux: pli.canaux } : {})} />
          ) : (
            <Fil
              mode="tiroir"
              etendue={fil}
              onEtendre={setFil}
              onNonLus={setNonLus}
              {...(pli.canaux ? { canaux: pli.canaux } : {})}
            />
          )
        }
        filOuvert={fil}
        barre={
          <BarrePouce>
            {game === null ? null : appuiMaCarte(game)}
            {action}
          </BarrePouce>
        }
      />
    </section>
  );
}
