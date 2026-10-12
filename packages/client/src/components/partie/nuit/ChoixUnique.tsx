/**
 * Un seul vivant à désigner, puis confirmer : le Salvateur, la Voyante, le
 * Corbeau, le Loup Blanc — dans le gabarit unique de la nuit.
 *
 * La barre a, comme chez tous, deux boutons : « ma carte » et le principal.
 * On touche un jeton : le résumé dit « Votre choix : Anna », le principal
 * devient « Sonder Anna ». Le premier toucher l'**arme** (§ 5.4), le second
 * dans les 4 s envoie (P0-6). À l'étape principale, une action renvoyée
 * remplace la précédente tant que l'étape court (`game.ts` n'en refuse
 * aucune) : le récapitulatif le dit, et « Changer » rouvre la place. Une
 * étape où l'on joue seul (`changeable` faux : le Loup Blanc) se clôt au
 * premier choix — le libellé armé le dit, « sans retour ».
 *
 * Sans jeton touché, le principal dit ce que vaut le silence : « Ne marquer
 * personne », « Épargner la meute » (armés eux aussi) quand le rôle peut ne
 * désigner personne ; sinon « Choisissez un vivant », qui n'envoie rien et
 * pose un avis (la Voyante, le Salvateur ne passent pas leur tour).
 */

import type { GameView } from '@garoutom/engine';
import { useState, type ReactNode } from 'react';

import { useNoms } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { BoutonChoisir, BoutonFermerLesYeux, Consigne, libelleArme, LigneResume, Resume } from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { useCarnet } from './sousLePouce.js';

/** Le choix de ne désigner personne : son bouton, et ce qu'en dit le récapitulatif. */
export interface ChoixDePersonne {
  libelle: string;
  recap: ReactNode;
  onValider: () => void;
}

export function ChoixUnique({
  game,
  testId,
  titre,
  consigne,
  choisissable,
  label,
  verbe,
  recap,
  recapSansMemoire,
  annotations,
  interdits,
  onValider,
  personne,
  changeable = true,
}: {
  game: GameView;
  testId: string;
  /** Le nom du rôle : le titre caché de l'écran. */
  titre: string;
  /** La consigne du prompt, dans la voix du skin. */
  consigne: string;
  choisissable: (seat: number) => boolean;
  label: string;
  /** Le libellé du bouton de confirmation, le pseudo choisi en main. */
  verbe: (nom: string) => string;
  /** Le récapitulatif, une fois le choix parti. */
  recap: (nom: string) => ReactNode;
  /** Le récapitulatif quand l'écran a oublié le choix (rechargement en pleine nuit). */
  recapSansMemoire: ReactNode;
  annotations?: Readonly<Record<number, ReactNode>>;
  /** Les sièges interdits (« hier » du Salvateur, état 16). */
  interdits?: readonly number[];
  onValider: (seat: number) => void;
  /** Le droit de ne désigner personne, quand le rôle l'a. */
  personne?: ChoixDePersonne;
  /** Faux quand le premier choix clôt l'étape : plus de « Changer ». */
  changeable?: boolean;
}) {
  const nom = useNoms();
  const carnet = useCarnet(game);
  const [selection, setSelection] = useState<number | null>(null);
  const [envoye, setEnvoye] = useState<number | 'personne' | null>(null);
  const [modifier, setModifier] = useState(false);

  const enSelection = !game.acted || modifier;
  const valider = () => {
    if (selection === null || !choisissable(selection)) return;
    setEnvoye(selection);
    setModifier(false);
    onValider(selection);
  };
  const validerPersonne = () => {
    if (personne === undefined) return;
    setEnvoye('personne');
    setSelection(null);
    setModifier(false);
    personne.onValider();
  };

  const avecPastilles = {
    ...(annotations === undefined ? {} : { annotations }),
    ...(interdits === undefined ? {} : { interdits }),
  };
  // Le carnet de la Voyante vit dans la ligne de résumé, jamais dans la barre.
  const ligne = (contenu: ReactNode) =>
    carnet.disponible ? <LigneResume outil={carnet.appui('Carnet')}>{contenu}</LigneResume> : contenu;

  if (enSelection) {
    const action = selection === null ? null : verbe(nom(selection));
    const principal =
      action !== null ? (
        <Bouton
          // Un autre jeton touché désarme : on ne confirme que ce qu'on lit.
          key={selection ?? 'aucun'}
          variante="primaire"
          arme={{ libelle: libelleArme(action, changeable), onConfirmer: valider }}
        >
          {action}
        </Bouton>
      ) : personne !== undefined ? (
        // Rien de touché : le principal propose de ne désigner personne, en deux temps.
        <Bouton
          key="personne"
          variante="primaire"
          arme={{ libelle: libelleArme(personne.libelle, changeable), onConfirmer: validerPersonne }}
        >
          {personne.libelle}
        </Bouton>
      ) : (
        <BoutonChoisir libelle="Choisissez un vivant" avis="Touchez un vivant sur la place, puis confirmez." />
      );
    return (
      <EcranNuit
        testId={testId}
        consigne={<Consigne titre={titre} texte={consigne} />}
        place={
          <PlaceDeNuit
            label={label}
            choisissables={choisissable}
            choisis={selection === null ? [] : [selection]}
            onChoisir={(seat) => setSelection((avant) => (avant === seat ? null : seat))}
            {...avecPastilles}
          />
        }
        apresPlace={carnet.lecteur}
        resume={ligne(carnet.resume ?? (selection === null ? null : <Resume gras={`Votre choix : ${nom(selection)}`} />))}
        action={principal}
      />
    );
  }

  // Le récapitulatif : la place ne répond plus, la consigne dit ce qui est parti.
  const dit =
    envoye === null ? recapSansMemoire : envoye === 'personne' ? (personne?.recap ?? recapSansMemoire) : recap(nom(envoye));
  return (
    <EcranNuit
      testId={testId}
      consigne={
        <Consigne
          titre={titre}
          statut
          texte={
            <>
              {dit} {changeable ? 'Vous pouvez changer tant que l’étape court.' : 'Rendormez-vous.'}
            </>
          }
        />
      }
      place={
        <PlaceDeNuit
          label={label}
          choisis={typeof envoye === 'number' ? [envoye] : []}
          {...avecPastilles}
        />
      }
      apresPlace={carnet.lecteur}
      resume={ligne(
        carnet.resume ??
          (typeof envoye === 'number' ? <Resume gras={`Votre choix : ${nom(envoye)}`} suite=" · envoyé" /> : null),
      )}
      action={
        changeable ? (
          <Bouton variante="primaire" onClick={() => setModifier(true)}>
            Changer
          </Bouton>
        ) : (
          <BoutonFermerLesYeux />
        )
      }
    />
  );
}
