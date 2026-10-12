/**
 * Les zones communes du gabarit de partie — frise, minuterie, crieur.
 *
 * Chaque écran de phase (le jour, la nuit, la révélation, la fin) compose son
 * propre `<Gabarit/>` ; ces trois zones-là, elles, sont les mêmes partout et
 * pour tous les sièges (loi N1 : la nuit, rien ne bouge d'une ligne d'un siège
 * à l'autre). Les écrans les prennent ici plutôt que de les recomposer.
 *
 * - **la frise** (§ 5.7) : à gauche le lien retour de l'arcade puis l'heure
 *   (« Nuit 2 ») ; à droite « Carte » (appui long, 76 × 44 ; vide mais à sa
 *   place pour un spectateur), le menu de la table (44), le son (44). Le
 *   code de la table vit dans le menu sur mobile, à côté de l'heure sur
 *   desktop ;
 * - **la minuterie** (§ 5.6) : toujours présente — cadre vide de même taille
 *   pour qui n'a rien à jouer, urgence par la texture ;
 * - **le crieur** (§ 5.8) : la dernière annonce, ou la légende du graveur.
 *
 * Signature FIGÉE (docs/design/caprices/IMPLEMENTATION.md, vague 2) ; le lot
 * V2-A (la table) en possède l'implémentation. Les options ajoutées sont
 * facultatives.
 */

import { BoutonSon, LienArcade } from '@tombp/arcade';
import type { ReactNode } from 'react';

import { Frise } from '../caprices/index.js';
import { ARCADE_ID } from '../../lib/identity.js';
import { useGame, useRoom, useSkinId } from '../../lib/partie.js';
import { peauDuSkin, resoudre } from '../../skins/registre.js';
import { Minuterie } from './Minuterie.js';
import { MaCarte } from './MaCarte.js';
import { Narrateur } from './Narrateur.js';
import { MenuTable } from './place/MenuTable.js';

export interface ZonesCommunes {
  frise: ReactNode;
  minuterie: ReactNode;
  crieur: ReactNode;
}

/** Le titre de la frise : « Nuit 2 », « Jour 3 », dans la voix du skin. */
export function titreDeLaFrise(phase: string | undefined, jour: number, recit: { nuit: string; jour: string }): string {
  const nuit = phase === 'nuit' || phase === 'revelation';
  return resoudre(nuit ? recit.nuit : recit.jour, { n: String(Math.max(1, jour)) });
}

/** La droite de la frise : Carte, menu, son — et le code de la table sur desktop. */
function DroiteDeLaFrise({ code, titre }: { code: string; titre: string }) {
  return (
    <>
      <span
        aria-label={`Code de table : ${code}`}
        className="t-code hidden h-11 items-center border border-[var(--filet-doux)] bg-[var(--surface)] px-3 !text-[20px] lg:flex"
      >
        {code}
      </span>
      <MaCarte declencheur="frise" />
      <MenuTable code={code} titre={titre} />
      <BoutonSon className="frise-son shrink-0" />
    </>
  );
}

export function useZonesCommunes(
  options: {
    droite?: ReactNode;
    gauche?: ReactNode;
    /** Le crieur sur une seule ligne (fil ouvert au tiers : 40 px). */
    crieurUneLigne?: boolean;
  } = {},
): ZonesCommunes {
  const game = useGame();
  const room = useRoom();
  const skin = useSkinId();
  const peau = peauDuSkin(skin);
  const titre = titreDeLaFrise(game?.phase, game?.day ?? 1, peau.recit);
  const code = room?.code ?? '';
  return {
    frise: (
      <Frise
        titre={titre}
        gauche={options.gauche ?? <LienArcade id={ARCADE_ID} className="shrink-0" />}
        droite={options.droite ?? <DroiteDeLaFrise code={code} titre={titre} />}
        skin={skin}
      />
    ),
    minuterie: <Minuterie />,
    crieur: <Narrateur uneLigne={options.crieurUneLigne === true} />,
  };
}
