/**
 * L'écran de jour (SPEC § 7.1, § 7.8) : le gabarit unique, rempli pour le
 * jour.
 *
 * Il sert cinq phases — l'élection du capitaine, le débat et le vote, le tir
 * du Chasseur, la succession, le dernier mot du Bouc émissaire — qui ont la
 * même géographie, zone par zone :
 *
 * | zone      | contenu                                                        |
 * |-----------|----------------------------------------------------------------|
 * | frise     | lien retour, « Jour 2 », Carte (appui long), menu, son         |
 * | minuterie | la règle graduée — ou son cadre vide, même taille              |
 * | crieur    | la dernière annonce (« Aube 2 · La meute a dévoré… »)          |
 * | consigne  | la consigne du prompt, ou la légende du graveur                |
 * | place     | D1-D4 sans défilement (mobile), le cercle autour du pupitre    |
 * | résumé    | « Votre voix : Anna · modifiable » · « 6 sur 10 »              |
 * | pli       | « Le village · 3 » (ou « L'au-delà » pour un mort)             |
 * | barre     | « S'abstenir » / « Voter contre Anna », armés en deux temps    |
 *
 * Le fil (`Fil.tsx`) vit derrière le pli : ouvert au tiers, il pousse la
 * place (D4) et replie le crieur et la consigne en une ligne ; plein écran,
 * il couvre la place, le résumé épinglé en tête. Sur desktop, il tient la
 * colonne de droite et le pupitre se dresse au centre du cercle.
 *
 * Le choix d'un jeton vit ici, parce que la place et la barre le partagent.
 */

import { useEffect, useState } from 'react';

import { Gabarit, Pli, type FilOuvert } from '../caprices/index.js';
import { useGame, useVoix } from '../../lib/partie.js';
import { regleDuChoix, useActionDuJour, marqueDuJour, votantsDuJour } from './Action.js';
import { Fil } from './Fil.js';
import { FORME_CANAL } from './fil/logique.js';
import { Place, useMedia } from './Place.js';
import { useZonesCommunes } from './zones.js';

export { compteDesVotes, marqueDuJour, votantsDuJour } from './Action.js';

/** Le seuil du desktop (§ 7.1). */
const GRAND_ECRAN = '(min-width: 1024px)';

/** Vrai au-delà de 1024 px, suivi en direct quand la fenêtre change de taille. */
export function useGrandEcran(): boolean {
  return useMedia(GRAND_ECRAN);
}

export function EcranJour() {
  const game = useGame();
  const voix = useVoix();
  const grand = useGrandEcran();
  const [choix, setChoix] = useState<number | null>(null);
  // Le Bouc émissaire désigne plusieurs votants : une sélection, pas un choix.
  const [selection, setSelection] = useState<number[]>([]);
  const [fil, setFil] = useState<FilOuvert>('ferme');
  const [nonLus, setNonLus] = useState(0);

  // Une phase nouvelle efface le choix en suspens : on ne confirme pas au
  // Chasseur la cible qu'on visait pour la potence.
  const phase = game?.phase;
  const jour = game?.day;
  useEffect(() => {
    setChoix(null);
    setSelection([]);
  }, [phase, jour]);

  const ouvert: FilOuvert = grand ? 'ferme' : fil;
  const zones = useZonesCommunes({ crieurUneLigne: ouvert === 'tiers' });
  const action = useActionDuJour({ choix, onChoix: setChoix, selection, onSelection: setSelection });
  // Le résumé épinglé en tête du fil (plein écran, colonne) : un second exemplaire, à ses propres identifiants.
  const epingle = useActionDuJour({ choix, onChoix: setChoix, selection, onSelection: setSelection });

  if (game === null || action === null) return null;

  const regle = game.you === null ? undefined : regleDuChoix(game);
  const plusieurs = game.prompt?.kind === 'designerVotants';
  const choisis = plusieurs ? selection : choix !== null ? [choix] : game.yourVote !== null ? [game.yourVote] : [];
  const libelle =
    game.prompt?.kind === 'voter'
      ? 'La place du village — touchez un jeton pour désigner'
      : plusieurs
        ? 'La place du village — touchez les jetons de ceux qui voteront demain'
        : game.prompt !== null
          ? 'La place du village — touchez un jeton pour choisir'
          : 'La place du village';
  const basculer = (seat: number) => {
    if (plusieurs) {
      setSelection((avant) =>
        avant.includes(seat) ? avant.filter((s) => s !== seat) : [...avant, seat].sort((a, b) => a - b),
      );
    } else {
      setChoix((avant) => (avant === seat ? null : seat));
    }
  };

  // Le pli dit le canal de ce siège : l'au-delà pour un mort, le village sinon.
  const canal = game.you !== null && !game.you.alive && game.channels.includes('morts') ? 'morts' : 'village';

  return (
    <div data-testid="ecran-jour" data-phase={game.phase} className="h-full">
      <Gabarit
        {...zones}
        consigne={action.consigne}
        place={
          <Place
            choisissables={regle}
            choisis={choisis}
            onChoisir={regle === undefined ? undefined : basculer}
            marque={marqueDuJour(game)}
            votants={votantsDuJour(game)}
            teinte={game.prompt?.kind === 'tirer' ? 'sang' : 'lanterne'}
            label={libelle}
            disposition={grand ? 'cercle' : 'grille'}
            filOuvert={ouvert === 'tiers'}
          />
        }
        resume={action.resume}
        pli={
          <Pli
            libelle={voix.libelleCanal(canal)}
            forme={FORME_CANAL[canal]}
            {...(nonLus > 0 ? { compte: nonLus } : {})}
            onOuvrir={() => setFil('tiers')}
          />
        }
        barre={action.barre}
        colonne={
          grand ? (
            <Fil mode="colonne" resume={epingle?.resume} className="h-full" />
          ) : (
            <Fil mode="tiroir" etendue={fil} onEtendre={setFil} resume={epingle?.resume} onNonLus={setNonLus} />
          )
        }
        filOuvert={ouvert}
      />
    </div>
  );
}
