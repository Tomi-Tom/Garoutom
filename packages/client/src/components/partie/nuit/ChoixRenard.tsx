/**
 * Le Renard : flaire le trio d'un vivant — lui compris — ou personne (R107).
 *
 * Il joue à l'étape principale, en parallèle des autres : son choix peut
 * changer tant que l'étape court, et rien ici ne dit à un autre siège qu'il
 * a joué. Le centre du trio est n'importe quel vivant, lui-même compris
 * (D29) ; le trio, c'est ce centre et ses deux voisins **vivants** — un
 * voisin mort ne compte pas, le trio se réduit (R107). Le voisinage se
 * dérive côté client, géométrie pure (R105) : l'ordre des sièges est l'ordre
 * du cercle, et le siège suivant est assis à gauche de qui fait face au
 * centre.
 *
 * Avant confirmation, le trio se lit sur la place : une pastille « centre »,
 * « à sa gauche », « à sa droite » — des mots de géométrie, jamais un nom de
 * rôle, jamais une teinte (N2). Le bouton principal et le résumé redisent
 * le trio qu'on s'apprête à envoyer ; rien ne part avant le second toucher
 * (P0-6). Le signe, lui, ne s'inscrira dans le carnet qu'à la clôture de
 * l'étape.
 */

import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { Consigne, libelleArme, Pastille, Resume, usePeau } from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { textePrompt } from './textes.js';

/**
 * Les voisins d'un siège (R105) : le siège suivant dans l'ordre du cercle est
 * à gauche de qui fait face au centre, le précédent à sa droite.
 */
function voisinsDu(centre: number, total: number): { gauche: number; droite: number } {
  return { gauche: (centre + 1) % total, droite: (centre - 1 + total) % total };
}

export function ChoixRenard() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const [selection, setSelection] = useState<number | null>(null);
  // `undefined` : l'écran ne sait pas ce qui est parti (rechargement en
  // pleine nuit) ; `null` : l'abstention.
  const [envoye, setEnvoye] = useState<number | null | undefined>(undefined);
  const [modifier, setModifier] = useState(false);
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la nuit, carte connue. Le garde sur le rôle est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'flairer') return null;
  const total = game.players.length;
  const vivant = (seat: number) => game.players[seat]?.alive === true;

  // Le trio flairé (R107) : le centre — le Renard lui-même compris (D29) — et
  // ses deux voisins vivants ; un voisin mort ne compte pas.
  const trioDe = (centre: number): number[] => {
    const { gauche, droite } = voisinsDu(centre, total);
    return [centre, gauche, droite].filter((seat, rang, tous) => vivant(seat) && tous.indexOf(seat) === rang);
  };

  const flairer = (centre: number | null) => {
    setEnvoye(centre);
    setSelection(null);
    setModifier(false);
    void jouer({ type: 'flairer', centre });
  };

  // Le trio en mots, pour les lecteurs d'écran : les pastilles de la place
  // sont de la géométrie muette.
  const trioEnMots = (centre: number): ReactNode => {
    const { gauche, droite } = voisinsDu(centre, total);
    return (
      <section aria-label="Le trio" className="sr-only">
        <ul aria-live="polite">
          <li>{`${nom(centre)} : centre du trio`}</li>
          {trioDe(centre)
            .filter((seat) => seat !== centre)
            .map((seat) => (
              <li key={seat}>{`${nom(seat)} : à ${seat === gauche ? 'gauche' : 'droite'} du centre`}</li>
            ))}
        </ul>
      </section>
    );
  };

  if (!game.acted || modifier) {
    // Le trio se lit sur la place avant confirmation (R105, N2).
    const annotations: Record<number, ReactNode> = {};
    if (selection !== null) {
      const { gauche, droite } = voisinsDu(selection, total);
      annotations[selection] = (
        <Pastille>
          centre<span className="sr-only"> du trio</span>
        </Pastille>
      );
      // Un voisin mort ne compte pas (R107) : sa place reste muette.
      if (vivant(gauche)) {
        annotations[gauche] = (
          <Pastille>
            à sa gauche<span className="sr-only"> du centre du trio</span>
          </Pastille>
        );
      }
      if (vivant(droite)) {
        annotations[droite] = (
          <Pastille>
            à sa droite<span className="sr-only"> du centre du trio</span>
          </Pastille>
        );
      }
    }

    const action =
      selection === null ? (
        // Rien de touché : le silence du Renard, en deux temps comme le reste.
        <Bouton
          key="personne"
          variante="primaire"
          arme={{ libelle: libelleArme('Ne sondez personne', true), onConfirmer: () => flairer(null) }}
        >
          Ne sondez personne
        </Bouton>
      ) : (
        <Bouton
          key={selection}
          variante="primaire"
          arme={{
            libelle: libelleArme(`Envoyer votre flair vers ${nom(selection)}`, true),
            onConfirmer: () => flairer(selection),
          }}
        >
          Envoyer votre flair vers {nom(selection)}
        </Bouton>
      );

    return (
      <EcranNuit
        testId="nuit-renard"
        consigne={<Consigne titre={voix.nomRole(moi.role)} texte={textePrompt(peau, game.prompt, nom, moi.seat)} />}
        place={
          <PlaceDeNuit
            label="Choisir le centre du trio"
            choisissables={vivant}
            choisis={selection === null ? [] : [selection]}
            onChoisir={(seat) => setSelection((avant) => (avant === seat ? null : seat))}
            annotations={annotations}
          />
        }
        apresPlace={selection === null ? null : trioEnMots(selection)}
        resume={
          selection === null ? null : (
            <Resume
              gras={`Votre choix : ${nom(selection)}`}
              suite={` · le trio : ${trioDe(selection)
                .map((seat) => nom(seat))
                .join(' · ')}`}
            />
          )
        }
        action={action}
      />
    );
  }

  // Le récapitulatif : la place ne répond plus, la consigne dit ce qui est parti.
  const dit =
    envoye === undefined ? (
      'Votre flair s’est posé sur la place : le signe s’inscrira dans votre carnet quand la nuit aura tourné.'
    ) : envoye === null ? (
      'Vous ne sondez personne cette nuit.'
    ) : (
      <>
        Votre flair entoure <strong>{nom(envoye)}</strong> — le trio :{' '}
        {trioDe(envoye)
          .map((seat) => nom(seat))
          .join(' · ')}
        . Le signe s’inscrira dans votre carnet quand la nuit aura tourné.
      </>
    );
  return (
    <EcranNuit
      testId="nuit-renard"
      consigne={
        <Consigne
          titre={voix.nomRole(moi.role)}
          statut
          texte={
            <>
              {dit} Vous pouvez changer tant que l’étape court.
            </>
          }
        />
      }
      place={
        <PlaceDeNuit label="Choisir le centre du trio" choisis={typeof envoye === 'number' ? [envoye] : []} />
      }
      apresPlace={typeof envoye === 'number' ? trioEnMots(envoye) : null}
      resume={
        typeof envoye === 'number' ? (
          <Resume
            gras={`Votre flair : ${nom(envoye)}`}
            suite={` · le trio : ${trioDe(envoye)
              .map((seat) => nom(seat))
              .join(' · ')}`}
          />
        ) : null
      }
      action={
        <Bouton variante="primaire" onClick={() => setModifier(true)}>
          Changer
        </Bouton>
      }
    />
  );
}
