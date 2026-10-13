/**
 * Le Voleur, avant la révélation : le talon des deux cartes qui restent
 * (R110, R87).
 *
 * La phase du Voleur précède la révélation — elle n'est pas la nuit des
 * pouvoirs, mais elle en a le gabarit : mêmes zones, mêmes hauteurs, le pli,
 * les deux boutons au pouce (N1). Le talon ne se montre qu'à lui : tous les
 * autres sièges — et le spectateur — tombent sur l’écran du village qui
 * dort, identique à celui de n’importe quelle nuit ; rien dans sa forme ne
 * dit qu’à cette table quelqu’un est en train de choisir.
 *
 * Les deux cartes se lisent dans la place, en tirage de cuivre comme tout ce
 * qui se montre la nuit (N3) : toucher une carte l’arme, le bouton principal
 * dit ce qui partira — « Choisir la Voyante » — et s’arme en deux temps
 * (P0-6). Le choix clôt la phase : « sans retour », comme chez la Sorcière.
 * Quand le talon porte deux loups (le Loup Blanc compris), l’abstention est
 * impossible (R110) : le principal n’offre que l’avis de toucher une carte ;
 * sinon, « Rester le Voleur » s’arme comme le reste — garder sa carte,
 * c’est aussi un choix, et aucun pouvoir ne se jouera.
 */

import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { CarteRole } from '../../habit/CarteRole.js';
import { BoutonChoisir, Consigne, libelleArme, Resume, usePeau } from './commun.js';
import { EcranNuit } from './EcranNuit.js';
import { VillageDort } from './VillageDort.js';

export function ChoixVoleur() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const [selection, setSelection] = useState<0 | 1 | null>(null);
  if (game === null) return null;
  // Le talon n'appartient qu'au Voleur (R110) : tous les autres — vivants,
  // morts, spectateur — dorment comme n'importe quelle nuit.
  if (game.you === null || !game.you.alive || game.prompt?.kind !== 'voler') return <VillageDort />;
  const moi = game.you;
  const prompt = game.prompt;
  // D46 : la vue tait sa propre carte pendant sa phase — le titre ne peut
  // venir que du geste qu'on lui demande. Seul le Voleur reçoit « voler » :
  // c'est lui, et l'écran le lui dit sans dire sa carte.
  const titre = voix.nomRole('voleur');

  const prendre = (carte: 0 | 1 | null) => void jouer({ type: 'voler', carte });

  // Les pastilles de la place sont muettes : le talon, dit aux lecteurs
  // d'écran — et l'obligation avec, quand les deux cartes sont des loups.
  const talonEnMots: ReactNode = (
    <section aria-label="Le talon" className="sr-only">
      <ul aria-live="polite">
        <li>{`Première carte : ${voix.nomRole(prompt.cartes[0])}`}</li>
        <li>{`Seconde carte : ${voix.nomRole(prompt.cartes[1])}`}</li>
        {prompt.obligatoire ? <li>Deux loups : il faut en prendre une.</li> : null}
      </ul>
    </section>
  );

  const consigne = prompt.obligatoire ? peau.prompts.voler.obligatoire : peau.prompts.voler.libre;
  const action =
    selection === null
      ? null
      : `Choisir ${voix.nomRole(prompt.cartes[selection])}`;

  return (
    <EcranNuit
      testId="nuit-voleur"
      consigne={<Consigne titre={titre} texte={consigne} />}
      place={
        <div className="flex h-full w-full items-center justify-center gap-4 p-4">
          {([0, 1] as const).map((rang) => (
            <button
              key={rang}
              type="button"
              aria-pressed={selection === rang}
              aria-label={`Prendre la carte : ${voix.nomRole(prompt.cartes[rang])}`}
              onClick={() => setSelection((avant) => (avant === rang ? null : rang))}
              className="aspect-[216/302] h-full max-w-[45%] border-2 bg-transparent p-0"
              style={{
                cursor: 'pointer',
                borderColor: selection === rang ? 'var(--action-texte)' : 'transparent',
              }}
            >
              <CarteRole role={prompt.cartes[rang]} retournee taille="moyenne" tirage="cuivre" pleineLargeur />
            </button>
          ))}
        </div>
      }
      apresPlace={talonEnMots}
      resume={
        selection === null ? null : (
          <Resume gras={`Votre choix : ${voix.nomRole(prompt.cartes[selection])}`} />
        )
      }
      action={
        action !== null ? (
          <Bouton
            key={selection}
            variante="primaire"
            // Le choix clôt la phase : « sans retour » (R110).
            arme={{ libelle: libelleArme(action, false), onConfirmer: () => prendre(selection) }}
          >
            {action}
          </Bouton>
        ) : prompt.obligatoire ? (
          // Deux loups au talon : l'abstention est impossible (R110).
          <BoutonChoisir libelle="Choisissez une carte" avis="Touchez une des deux cartes, puis confirmez." />
        ) : (
          // Garder sa carte, c'est aussi un choix : aucun pouvoir ne se jouera.
          <Bouton
            key="garder"
            variante="primaire"
            arme={{ libelle: libelleArme('Rester le Voleur', false), onConfirmer: () => prendre(null) }}
          >
            Rester le Voleur
          </Bouton>
        )
      }
    />
  );
}
