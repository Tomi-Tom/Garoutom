/**
 * Le fil de discussion — la brique neuve de Garoutom.
 *
 * - `colonne` : la colonne droite des grands écrans (≥ 1024 px), pleine
 *   hauteur dans la place que lui donne le parent ;
 * - `tiroir` : le tiroir du bas des petits écrans. Il est dans le flux : il
 *   POUSSE la place au lieu de la recouvrir. Replié, il n'est qu'une poignée
 *   de 44 px avec le compte des non-lus ;
 * - `integre` : un mini-fil posé dans un autre écran (la meute la nuit),
 *   limité aux `canaux` donnés.
 *
 * Un message ne fait jamais de bruit : ni son, ni annonce vocale (le journal
 * est `aria-live="off"`), ni pastille qui clignote.
 */
import { useEffect, useId, useState } from 'react';

import type { ChatChannel } from '@garoutom/engine';

import { useGame } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';
import { Corps } from './fil/Corps.js';
import { compterNonLus, messagesDuCanal, ongletsVisibles } from './fil/logique.js';

export interface FilProps {
  mode: 'colonne' | 'tiroir' | 'integre';
  /** Restreint les onglets à ces canaux (mode `integre`). Absent : tous les lisibles. */
  canaux?: readonly ChatChannel[];
  className?: string;
}

export function Fil({ mode, canaux, className = '' }: FilProps) {
  const game = useGame();
  const { filOuvert } = useReglages();
  const id = useId();
  const [choisi, setChoisi] = useState<ChatChannel | null>(null);
  const [vus, setVus] = useState<Partial<Record<ChatChannel, number>>>({});
  const [ouvert, setOuvert] = useState(filOuvert);
  const [plein, setPlein] = useState(false);

  const onglets = game === null ? [] : ongletsVisibles(game, canaux);
  const actif = choisi !== null && onglets.includes(choisi) ? choisi : onglets[0];
  const visible = mode !== 'tiroir' || ouvert;
  const dernierActif =
    game === null || actif === undefined ? -1 : (messagesDuCanal(game, actif).at(-1)?.id ?? -1);

  // L'onglet qu'on a sous les yeux est lu : son badge retombe à zéro.
  useEffect(() => {
    if (!visible || actif === undefined) return;
    setVus((avant) => (avant[actif] === dernierActif ? avant : { ...avant, [actif]: dernierActif }));
  }, [visible, actif, dernierActif]);

  if (game === null || actif === undefined) return null;

  const total = onglets.reduce(
    (somme, canal) =>
      somme + (canal === actif && visible ? 0 : compterNonLus(game, canal, vus[canal] ?? -1)),
    0,
  );

  const corps = (
    <Corps game={game} onglets={onglets} actif={actif} onChoisir={setChoisi} vus={vus} idPrefix={id} />
  );

  if (mode === 'colonne') {
    return (
      <section
        aria-label="Discussion"
        className={`carte flex h-full min-h-0 flex-col overflow-hidden ${className}`}
      >
        {corps}
      </section>
    );
  }

  if (mode === 'integre') {
    return (
      <section
        aria-label="Discussion"
        className={`carte flex h-[220px] max-h-[220px] min-h-0 flex-col overflow-hidden ${className}`}
      >
        {corps}
      </section>
    );
  }

  // Tiroir : dans le flux, jamais en `fixed`. Ouvert, il prend un tiers de la
  // hauteur ; plein écran, l'essentiel — la place se replie au-dessus.
  const hauteur = plein ? 'h-[85dvh]' : 'h-[33dvh] min-h-[220px]';
  return (
    <section
      aria-label="Discussion"
      data-etat={ouvert ? (plein ? 'plein' : 'ouvert') : 'replie'}
      className={`carte flex shrink-0 flex-col overflow-hidden rounded-b-none ${className}`}
    >
      <div className="flex shrink-0">
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls={`${id}-tiroir`}
          onClick={() => {
            setOuvert(!ouvert);
            if (ouvert) setPlein(false);
          }}
          className="flex min-h-11 flex-1 items-center justify-between gap-3 px-4 text-left font-identite text-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--lune)]"
        >
          <span>Discussion</span>
          <span className="flex items-center gap-2">
            {!ouvert && total > 0 && (
              <span
                data-testid="non-lus-total"
                aria-label={`${String(total)} messages non lus`}
                className="rounded-full bg-[var(--lanterne)] px-2 text-sm font-semibold text-[var(--nuit-creux)]"
              >
                {total > 99 ? '99+' : total}
              </span>
            )}
            <span aria-hidden="true" className="text-[var(--papier-doux)]">
              {ouvert ? '▾' : '▴'}
            </span>
          </span>
        </button>
        {ouvert && (
          <button
            type="button"
            aria-pressed={plein}
            aria-label={plein ? 'Réduire le fil' : 'Fil en plein écran'}
            onClick={() => setPlein(!plein)}
            className="min-h-11 min-w-11 px-3 text-[var(--papier-doux)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--lune)]"
          >
            <span aria-hidden="true">{plein ? '⤡' : '⤢'}</span>
          </button>
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
