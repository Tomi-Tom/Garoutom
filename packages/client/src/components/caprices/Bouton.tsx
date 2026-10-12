/**
 * Les boutons de « Caprices » (SPEC § 5.4) : angle vif, 48 px pour une
 * action de jeu (44 pour un outil), texte `--t-bouton`. **Aucun bouton n'est
 * rouge** : la sanguine reste à la meute ; le danger se dit par l'armement.
 *
 * - `primaire` : l'encre déposée (`--action-fond`) ;
 * - `secondaire` : un filet, pas d'aplat ;
 * - `discret` : un mot souligné ;
 * - `danger` : l'habit du primaire au repos — une action irréversible, que
 *   l'on arme (`arme`) ;
 * - `outil` : 44 × 44, une icône de 24, le libellé à côté si la place le
 *   permet (frise, en-têtes).
 *
 * **L'armement en deux temps** (P0-6) : avec `arme`, le premier toucher
 * n'agit pas — le bouton s'arme (double filet, repères de visée aux quatre
 * coins, libellé « Confirmer : … », un filet qui se rétracte sous lui en
 * 4 s) ; un second toucher dans les 4 s confirme (`arme.onConfirmer`) ;
 * sinon il se désarme. Échap le désarme aussi.
 *
 * Éteint : jamais d'opacité — un pointillé et l'encre délavée ; la raison
 * s'écrit dans la `BarrePouce`, à laquelle le bouton se relie seul.
 */

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactElement, type Ref } from 'react';

import { ARMEMENT_CONFIRMATION_MS } from '../../anim/tokens.js';
import { Icone, type NomIcone } from '../habit/Icone.js';
import { useRaisonBarre } from './BarrePouce.js';

export type VarianteBouton = 'primaire' | 'secondaire' | 'discret' | 'danger' | 'outil';

export interface ArmementBouton {
  /** Le libellé armé : « Confirmer : Anna à la potence », « Confirmer — sans retour : … ». */
  libelle: string;
  /** Le second toucher, dans les 4 s. */
  onConfirmer: () => void;
}

export interface ProprietesBouton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante: VarianteBouton;
  /** Une action irréversible : armement en deux temps (4 s). */
  arme?: ArmementBouton;
  /**
   * L'icône, à gauche du libellé : un nom du § 6.3 (`<Icone>` du lot V1-B,
   * dessinée à 24 en `currentColor`), ou un dessin déjà fait.
   */
  icone?: NomIcone | ReactElement;
  ref?: Ref<HTMLButtonElement>;
}

const COINS = ['no', 'ne', 'so', 'se'] as const;

export function Bouton({
  variante,
  arme,
  icone,
  children,
  className,
  onClick,
  onKeyDown,
  disabled,
  type = 'button',
  ref,
  ...reste
}: ProprietesBouton) {
  const [estArme, setArme] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raison = useRaisonBarre();

  const desarmer = useCallback(() => {
    if (minuteur.current !== null) clearTimeout(minuteur.current);
    minuteur.current = null;
    setArme(false);
  }, []);

  // Un bouton éteint, ou qui perd son armement, se désarme ; démonté, il
  // n'emporte pas de minuteur avec lui.
  const eteint = disabled === true || reste['aria-disabled'] === true || reste['aria-disabled'] === 'true';
  useEffect(() => {
    if (eteint || arme === undefined) desarmer();
  }, [eteint, arme, desarmer]);
  useEffect(() => desarmer, [desarmer]);

  const surClic: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (evenement) => {
    onClick?.(evenement);
    if (evenement.defaultPrevented || arme === undefined || eteint) return;
    if (!estArme) {
      setArme(true);
      minuteur.current = setTimeout(desarmer, ARMEMENT_CONFIRMATION_MS);
      return;
    }
    desarmer();
    arme.onConfirmer();
  };

  const classes = ['bouton', `bouton-${variante}`];
  if (className !== undefined) classes.push(className);
  const decrit = reste['aria-describedby'] ?? (eteint ? raison : undefined);

  return (
    <button
      {...reste}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-describedby={decrit}
      className={classes.join(' ')}
      data-arme={estArme ? '' : undefined}
      onClick={surClic}
      onKeyDown={(evenement) => {
        onKeyDown?.(evenement);
        if (evenement.key === 'Escape' && estArme) desarmer();
      }}
    >
      {estArme && arme !== undefined ? (
        <>
          {COINS.map((coin) => (
            <span key={coin} className="bouton-visee" data-coin={coin} aria-hidden="true" />
          ))}
          <span className="bouton-libelle">{arme.libelle}</span>
          <span className="bouton-filet-arme" aria-hidden="true" data-anim-fonctionnelle="" />
        </>
      ) : (
        <>
          {icone !== undefined && (
            <span className="bouton-icone" aria-hidden="true">
              {typeof icone === 'string' ? <Icone nom={icone} /> : icone}
            </span>
          )}
          {children !== undefined && children !== null && <span className="bouton-libelle">{children}</span>}
        </>
      )}
    </button>
  );
}
