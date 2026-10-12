/**
 * Le fil de discussion (SPEC § 5.10) — quatre canaux, distingués par la
 * forme, le mot et la teinte.
 *
 * - `colonne` : la colonne droite des grands écrans (340 px, pleine hauteur
 *   sous la frise), onglets en tête, résumé du vote épinglé au-dessus ;
 * - `tiroir` : le fil des petits écrans. Il vit derrière le **pli**. Quand
 *   l'écran de partie le compose dans le `<Gabarit/>`, il passe `etendue`
 *   (le `filOuvert` du gabarit) : `ferme` (rien à voir), `tiers` (≈ 232 px,
 *   à la place du pli), `plein` (il couvre la place, le résumé du vote
 *   épinglé en tête) ; le fil reste monté fermé, pour que les non-lus
 *   continuent de se compter (`onNonLus` les remonte au pli). Sans `etendue`,
 *   le tiroir se tient seul : une poignée de 44 px, repliée par défaut (ou
 *   dépliée selon le réglage), qui le pousse dans le flux ;
 * - `integre` : un mini-fil posé dans un autre écran (la meute la nuit),
 *   limité aux `canaux` donnés.
 *
 * Un message ne fait jamais de bruit : ni son, ni annonce vocale (le journal
 * est `aria-live="off"`), jamais de pastille qui clignote — des chiffres.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';

import type { ChatChannel } from '@garoutom/engine';

import { useGame, useVoix } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';
import { Bouton } from '../caprices/Bouton.js';
import { Cartouche } from '../caprices/Cartouche.js';
import type { FilOuvert } from '../caprices/Gabarit.js';
import { Corps } from './fil/Corps.js';
import { compterNonLus, FORME_CANAL, messagesDuCanal, ongletsVisibles } from './fil/logique.js';

export interface FilProps {
  mode: 'colonne' | 'tiroir' | 'integre';
  /** Restreint les onglets à ces canaux (mode `integre`). Absent : tous les lisibles. */
  canaux?: readonly ChatChannel[];
  className?: string;
  /**
   * Mode `tiroir` composé par le gabarit : l'étendue que lui donne
   * `filOuvert`. Absent, le tiroir se tient seul (poignée comprise).
   */
  etendue?: FilOuvert;
  /** Le fil demande une autre étendue (plein écran, réduction, refermer). */
  onEtendre?: (etendue: FilOuvert) => void;
  /** La ligne de résumé du vote, épinglée en tête (plein écran, colonne). */
  resume?: ReactNode;
  /** Le total des non-lus (canal affiché exclu), pour le compteur du pli. */
  onNonLus?: (total: number) => void;
}

/** Deux chevrons qui s'éloignent / se rapprochent — des traits, pas une icône de bibliothèque. */
function Agrandir({ plein }: { plein: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {plein ? (
        <path d="M5 9 L9 9 L9 5 M19 9 L15 9 L15 5 M5 15 L9 15 L9 19 M19 15 L15 15 L15 19" />
      ) : (
        <path d="M5 9 L5 5 L9 5 M19 9 L19 5 L15 5 M5 15 L5 19 L9 19 M19 15 L19 19 L15 19" />
      )}
    </svg>
  );
}

function Refermer() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

export function Fil({ mode, canaux, className = '', etendue, onEtendre, resume, onNonLus }: FilProps) {
  const game = useGame();
  const voix = useVoix();
  const { filOuvert } = useReglages();
  const id = useId();
  const [choisi, setChoisi] = useState<ChatChannel | null>(null);
  const [vus, setVus] = useState<Partial<Record<ChatChannel, number>>>({});
  const [ouvert, setOuvert] = useState(filOuvert);
  const [plein, setPlein] = useState(false);

  const compose = mode === 'tiroir' && etendue !== undefined;
  const onglets = game === null ? [] : ongletsVisibles(game, canaux);
  const actif = choisi !== null && onglets.includes(choisi) ? choisi : onglets[0];
  const visible = mode !== 'tiroir' || (compose ? etendue !== 'ferme' : ouvert);
  const dernierActif =
    game === null || actif === undefined ? -1 : (messagesDuCanal(game, actif).at(-1)?.id ?? -1);

  // L'onglet qu'on a sous les yeux est lu : son compteur retombe à zéro.
  useEffect(() => {
    if (!visible || actif === undefined) return;
    setVus((avant) => (avant[actif] === dernierActif ? avant : { ...avant, [actif]: dernierActif }));
  }, [visible, actif, dernierActif]);

  const total =
    game === null
      ? 0
      : onglets.reduce(
          (somme, canal) =>
            somme + (canal === actif && visible ? 0 : compterNonLus(game, canal, vus[canal] ?? -1)),
          0,
        );

  useEffect(() => {
    onNonLus?.(total);
  }, [total, onNonLus]);

  if (game === null || actif === undefined) return null;

  const resumeEpingle = visible && (mode === 'colonne' || (compose && etendue === 'plein')) ? resume : undefined;

  const outils = compose ? (
    <div className="flex shrink-0 items-center">
      <Bouton
        variante="outil"
        aria-pressed={etendue === 'plein'}
        aria-label={etendue === 'plein' ? 'Réduire le fil' : 'Fil en plein écran'}
        icone={<Agrandir plein={etendue === 'plein'} />}
        onClick={() => onEtendre?.(etendue === 'plein' ? 'tiers' : 'plein')}
      />
      <Bouton
        variante="outil"
        aria-label="Refermer le fil"
        icone={<Refermer />}
        onClick={() => onEtendre?.('ferme')}
      />
    </div>
  ) : undefined;

  const corps = (
    <Corps
      game={game}
      onglets={onglets}
      actif={actif}
      onChoisir={setChoisi}
      vus={vus}
      idPrefix={id}
      resume={resumeEpingle}
      outils={outils}
    />
  );

  if (mode === 'colonne') {
    return (
      <section
        aria-label="Discussion"
        data-mode="colonne"
        className={`flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)] ${className}`}
      >
        {corps}
      </section>
    );
  }

  if (mode === 'integre') {
    return (
      <section
        aria-label="Discussion"
        data-mode="integre"
        className={`flex h-[220px] max-h-[220px] min-h-0 flex-col overflow-hidden border border-[var(--filet-doux)] bg-[var(--surface)] ${className}`}
      >
        {corps}
      </section>
    );
  }

  // Tiroir composé par le gabarit : il remplit la zone que celui-ci lui donne
  // (≈ 232 px au tiers, la place entière en plein écran). Fermé, il reste monté
  // pour compter les non-lus, mais n'occupe rien.
  if (compose) {
    return (
      <section
        aria-label="Discussion"
        data-mode="tiroir"
        data-etat={etendue}
        hidden={etendue === 'ferme'}
        className={`flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)] ${className}`}
      >
        {etendue !== 'ferme' && corps}
      </section>
    );
  }

  // Tiroir autonome : dans le flux, jamais en `fixed`. Ouvert, il prend un tiers
  // de la hauteur ; plein écran, l'essentiel — la place se replie au-dessus.
  const hauteur = plein ? 'h-[85dvh]' : 'h-[33dvh] min-h-[220px]';
  const libelle = voix.libelleCanal(actif);
  return (
    <section
      aria-label="Discussion"
      data-mode="tiroir"
      data-etat={ouvert ? (plein ? 'plein' : 'ouvert') : 'replie'}
      className={`flex shrink-0 flex-col overflow-hidden bg-[var(--surface)] ${className}`}
    >
      <div className="flex shrink-0">
        <button
          type="button"
          className="pli min-h-11 flex-1"
          aria-expanded={ouvert}
          aria-controls={`${id}-tiroir`}
          aria-label="Discussion"
          onClick={() => {
            setOuvert(!ouvert);
            if (ouvert) setPlein(false);
          }}
        >
          <Cartouche forme={FORME_CANAL[actif]} taille={20}>
            {libelle}
          </Cartouche>
          {!ouvert && total > 0 && (
            <span data-testid="non-lus-total" aria-label={`${String(total)} messages non lus`} className="t-chiffre">
              · {total > 99 ? '99+' : total}
            </span>
          )}
          <span className="pli-chevron" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d={ouvert ? 'M6 9 L12 15 L18 9' : 'M6 15 L12 9 L18 15'} />
            </svg>
          </span>
        </button>
        {ouvert && (
          <Bouton
            variante="outil"
            aria-pressed={plein}
            aria-label={plein ? 'Réduire le fil' : 'Fil en plein écran'}
            icone={<Agrandir plein={plein} />}
            onClick={() => setPlein(!plein)}
          />
        )}
      </div>
      {ouvert && (
        <div id={`${id}-tiroir`} className={`flex min-h-0 flex-col ${hauteur}`}>
          {corps}
        </div>
      )}
    </section>
  );
}
