/**
 * Le Chien-Loup, la première nuit : choisir son camp pour toujours (R111).
 *
 * Il joue à l’étape principale, en parallèle des autres solitaires de la
 * première nuit : son choix peut changer tant que l’étape court, et rien ici
 * ne dit à un autre siège qu’il a joué. La place ne montre pas le village —
 * elle montre les deux bords où se ranger, dans la voix du skin ; la meute
 * n’y prend pas sa craie (N2) : les deux bords pèsent le même poids d’encre,
 * le choix n’a pas à être guidé par une couleur.
 *
 * Le bouton principal dit ce qui partira — « Se ranger avec la meute » — et
 * s’arme en deux temps comme tout (P0-6). Le camp une fois pris ne se rend
 * plus : ni la consigne ni le récapitulatif ne le rediront jamais à un autre
 * siège — c’est la nuit du Chien-Loup, et elle n’appartient qu’à lui.
 */

import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { BoutonChoisir, Consigne, libelleArme, Resume, usePeau } from './commun.js';
import { EcranNuit } from './EcranNuit.js';
import { textePrompt } from './textes.js';

/** Les deux bords du Chien-Loup (R111) — dans l’ordre de la consigne : le village, puis la meute. */
const CAMPS = ['village', 'loups'] as const;

export function ChoixChienLoup() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const [selection, setSelection] = useState<(typeof CAMPS)[number] | null>(null);
  // `undefined` : l’écran ne sait pas ce qui est parti (rechargement en
  // pleine nuit) ; le récapitulatif alors ne promet rien.
  const [envoye, setEnvoye] = useState<(typeof CAMPS)[number] | undefined>(undefined);
  const [modifier, setModifier] = useState(false);
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la première nuit, carte connue. Le garde est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'seRanger') return null;
  const titre = voix.nomRole(moi.role);

  const seRanger = (camp: (typeof CAMPS)[number]) => {
    setEnvoye(camp);
    setSelection(null);
    setModifier(false);
    void jouer({ type: 'seRanger', camp });
  };

  if (!game.acted || modifier) {
    const action =
      selection === null ? null : `Se ranger avec ${voix.nomCamp(selection)}`;
    return (
      <EcranNuit
        testId="nuit-chien-loup"
        consigne={<Consigne titre={titre} texte={textePrompt(peau, game.prompt, nom, moi.seat)} />}
        place={<LesDeuxBords voix={voix} selection={selection} onChoisir={setSelection} />}
        resume={
          selection === null ? null : (
            <Resume gras={`Votre choix : ${voix.nomCamp(selection)}`} />
          )
        }
        action={
          action !== null && selection !== null ? (
            <Bouton
              key={selection}
              variante="primaire"
              arme={{ libelle: libelleArme(action, true), onConfirmer: () => seRanger(selection) }}
            >
              {action}
            </Bouton>
          ) : (
            // Le Chien-Loup ne passe pas son tour : sans bord touché, le
            // principal n’envoie rien, il le dit.
            <BoutonChoisir libelle="Choisissez votre camp" avis="Touchez un des deux bords, puis confirmez." />
          )
        }
      />
    );
  }

  // Le récapitulatif : la place ne répond plus, la consigne dit ce qui est parti.
  const dit: ReactNode =
    envoye === undefined ? (
      'Votre camp est choisi pour toujours.'
    ) : (
      <>
        Vous vous êtes rangé avec <strong>{voix.nomCamp(envoye)}</strong>.
      </>
    );
  return (
    <EcranNuit
      testId="nuit-chien-loup"
      consigne={
        <Consigne
          titre={titre}
          statut
          texte={
            <>
              {dit} Vous pouvez changer tant que l’étape court.
            </>
          }
        />
      }
      place={<LesDeuxBords voix={voix} selection={envoye ?? null} onChoisir={setSelection} muet />}
      resume={envoye === undefined ? null : <Resume gras={`Votre camp : ${voix.nomCamp(envoye)}`} suite=" · envoyé" />}
      action={
        <Bouton variante="primaire" onClick={() => setModifier(true)}>
          Changer
        </Bouton>
      }
    />
  );
}

/**
 * Les deux bords où se ranger, dans la place : deux cartouches de même
 * gabarit, sans teinte de camp (N2) — le choix se lit, il ne se colore pas.
 * `muet` : le récapitulatif montre le bord pris sans le laisser reprendre.
 */
function LesDeuxBords({
  voix,
  selection,
  onChoisir,
  muet = false,
}: {
  voix: ReturnType<typeof useVoix>;
  selection: (typeof CAMPS)[number] | null;
  onChoisir: (camp: (typeof CAMPS)[number]) => void;
  muet?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Les deux bords où se ranger"
      className="flex h-full w-full flex-wrap content-center items-stretch justify-center gap-3 p-3"
    >
      {CAMPS.map((camp) => {
        const retenu = selection === camp;
        return (
          <button
            key={camp}
            type="button"
            aria-pressed={retenu}
            disabled={muet}
            onClick={() => onChoisir(camp)}
            className="flex min-h-[84px] min-w-[7.5rem] flex-1 basis-40 flex-col items-center justify-center gap-1 border px-3 py-4 font-corps"
            style={{
              cursor: muet ? 'default' : 'pointer',
              background: retenu ? 'var(--action-fond)' : 'var(--surface)',
              borderColor: retenu ? 'var(--action-texte)' : 'var(--filet)',
              maxWidth: '18rem',
            }}
          >
            <span className="t-jeu text-encre">{capitale(voix.nomCamp(camp))}</span>
          </button>
        );
      })}
    </div>
  );
}

function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}
