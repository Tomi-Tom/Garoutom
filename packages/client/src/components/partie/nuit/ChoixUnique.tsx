/**
 * Un seul vivant à désigner, puis confirmer : le Salvateur, la Voyante, le
 * Corbeau, le Loup Blanc.
 *
 * On touche un jeton, on lit son nom, on confirme. À l'étape principale, une
 * action renvoyée remplace la précédente tant que l'étape court (`game.ts`
 * n'en refuse aucune) : le récapitulatif le dit, et rouvre la place sur
 * demande. Une étape où l'on joue seul (`changeable` faux : le Loup Blanc)
 * se clôt au premier choix — le récapitulatif ne promet alors aucun retour.
 *
 * Quand le rôle peut ne désigner personne (le Corbeau, le Loup Blanc), c'est
 * un bouton à part entière, jamais un jeton : `personne` le décrit.
 */

import { useState, type ReactNode } from 'react';

import { useNoms } from '../../../lib/partie.js';
import { Place, type Teinte } from '../Place.js';
import { COULEUR, Recap } from './commun.js';

/** Le choix de ne désigner personne : son bouton, et ce qu'en dit le récapitulatif. */
export interface ChoixDePersonne {
  libelle: string;
  recap: ReactNode;
  onValider: () => void;
}

export function ChoixUnique({
  acted,
  choisissable,
  teinte,
  label,
  verbe,
  recap,
  recapSansMemoire,
  annotations,
  onValider,
  enPlus,
  personne,
  changeable = true,
}: {
  acted: boolean;
  choisissable: (seat: number) => boolean;
  teinte: Teinte;
  label: string;
  /** Le libellé du bouton de confirmation, le pseudo choisi en main. */
  verbe: (nom: string) => string;
  /** Le récapitulatif, une fois le choix parti. */
  recap: (nom: string) => ReactNode;
  /** Le récapitulatif quand l'écran a oublié le choix (rechargement en pleine nuit). */
  recapSansMemoire: ReactNode;
  annotations?: Readonly<Record<number, ReactNode>>;
  onValider: (seat: number) => void;
  /** Ce qui suit le récapitulatif — le carnet de la Voyante, par exemple. */
  enPlus?: ReactNode;
  /** Le droit de ne désigner personne, quand le rôle l'a. */
  personne?: ChoixDePersonne;
  /** Faux quand le premier choix clôt l'étape : plus de « changer d'avis ». */
  changeable?: boolean;
}) {
  const nom = useNoms();
  const [selection, setSelection] = useState<number | null>(null);
  const [envoye, setEnvoye] = useState<number | 'personne' | null>(null);
  const [modifier, setModifier] = useState(false);

  const enSelection = !acted || modifier;
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

  return (
    <>
      {enSelection ? (
        <>
          <Place
            choisissables={choisissable}
            choisis={selection === null ? [] : [selection]}
            onChoisir={(seat) => setSelection((avant) => (avant === seat ? null : seat))}
            teinte={teinte}
            compacte
            label={label}
            {...(annotations ? { annotations } : {})}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn-village"
              disabled={selection === null}
              onClick={valider}
              style={teinte === 'sang' ? { background: COULEUR.sang, color: 'var(--nuit-creux)' } : undefined}
            >
              {selection === null ? 'Touchez un jeton sur la place' : verbe(nom(selection))}
            </button>
            {personne !== undefined && (
              <button type="button" className="btn-voisin" onClick={validerPersonne}>
                {personne.libelle}
              </button>
            )}
          </div>
        </>
      ) : (
        <Recap changeable={changeable} onChanger={() => setModifier(true)}>
          {envoye === null
            ? recapSansMemoire
            : envoye === 'personne'
              ? (personne?.recap ?? recapSansMemoire)
              : recap(nom(envoye))}
        </Recap>
      )}
      {enPlus}
    </>
  );
}
