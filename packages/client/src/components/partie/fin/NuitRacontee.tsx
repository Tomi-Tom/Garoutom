/**
 * La nuit racontée, en portfolio (SPEC Caprices § 5.15, § 6.4 ; maquettes
 * `C-Fin-NuitRacontee`, `C-Fin-Planche`, `C-Fin-Desktop`) : le `log` de la
 * partie finie, récité dans la voix du skin, secrets compris (R88), planche
 * après planche — « Pl. 3 — Nuit 2 », une vignette, la légende du graveur,
 * les lignes du récit. La dernière planche est toujours « Il est l'heure. ».
 *
 * Mobile : le frontispice, puis les planches empilées, la dernière du récit
 * ouverte, les autres repliées sur leur titre et leur légende ; la vignette
 * ouvre la planche en plein écran. Desktop : trois planches par rangée,
 * toutes ouvertes, chacune dans sa cuvette.
 *
 * Une planche repliée garde ses lignes dans la page (masquées) : le récit est
 * complet, et se lit d'un seul tenant.
 */

import { useId, useState } from 'react';

import type { GameView, LogEntry } from '@garoutom/engine';

import { useVoix } from '../../../lib/partie.js';
import { Cuvette } from '../../caprices/index.js';
import { Frontispice } from '../../habit/Frontispice.js';
import { Vignette } from '../../habit/Vignette.js';
import { useEstLarge } from '../../useEstLarge.js';
import { LignesPlanche, PlanchePleinEcran, RubriquePlanche, useLignes, type Ligne } from './Planche.js';
import { planchesDuLog, type Planche } from './planches.js';

/** Le chevron du pli : deux traits, pas une icône de bibliothèque. */
function Chevron({ ouvert }: { ouvert: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="shrink-0 text-encre-2">
      <path d={ouvert ? 'M7 14.5L12 9.5L17 14.5' : 'M7 9.5L12 14.5L17 9.5'} />
    </svg>
  );
}

/** La vignette et la légende ; la vignette ouvre la planche en plein écran. */
function TetePlanche({ planche, onPleinEcran }: { planche: Planche; onPleinEcran: () => void }) {
  const voix = useVoix();
  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        onClick={onPleinEcran}
        aria-label={`Voir la planche ${String(planche.numero)} en plein écran`}
        className="shrink-0 cursor-zoom-in border-0 bg-transparent p-0"
      >
        <Vignette nom={planche.vignette} />
      </button>
      <p className="t-legende m-0 flex-1 text-left">« {voix.legendeRecit(planche.legende)} »</p>
    </div>
  );
}

function PlancheMobile({
  planche,
  ouverteParDefaut,
  ligne,
  onPleinEcran,
}: {
  planche: Planche;
  ouverteParDefaut: boolean;
  ligne: (entree: LogEntry) => Ligne;
  onPleinEcran: () => void;
}) {
  const voix = useVoix();
  const [ouverte, setOuverte] = useState(ouverteParDefaut);
  const id = useId();
  return (
    <li data-planche={planche.numero} className="border-t-[0.75px] border-filet-doux">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={ouverte}
          aria-controls={id}
          onClick={() => setOuverte((o) => !o)}
          className="flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-encre"
        >
          <span className={`t-rubrique ${ouverte ? 'flex-1' : 'w-[92px] shrink-0'}`}>
            <RubriquePlanche planche={planche} />
          </span>
          {!ouverte && (
            <span className="t-legende flex-1 text-[16px] leading-5">« {voix.legendeRecit(planche.legende)} »</span>
          )}
          <Chevron ouvert={ouverte} />
        </button>
      </h3>
      <div id={id} className={ouverte ? 'pb-4' : 'hidden'}>
        <TetePlanche planche={planche} onPleinEcran={onPleinEcran} />
        <LignesPlanche entrees={planche.entrees} ligne={ligne} className="mt-2.5" />
      </div>
    </li>
  );
}

function PlancheDesktop({
  planche,
  ligne,
  onPleinEcran,
}: {
  planche: Planche;
  ligne: (entree: LogEntry) => Ligne;
  onPleinEcran: () => void;
}) {
  return (
    <li data-planche={planche.numero} className="min-w-0">
      <Cuvette className="h-full p-3.5">
        <h3 className="t-rubrique m-0">
          <RubriquePlanche planche={planche} />
        </h3>
        <TetePlanche planche={planche} onPleinEcran={onPleinEcran} />
        <LignesPlanche entrees={planche.entrees} ligne={ligne} className="mt-2.5" />
      </Cuvette>
    </li>
  );
}

export function NuitRacontee({ game }: { game: GameView }) {
  const voix = useVoix();
  const large = useEstLarge();
  const ligne = useLignes(game);
  const [pleinEcran, setPleinEcran] = useState<number | null>(null);
  const roles = new Map(game.players.map((joueur) => [joueur.seat, joueur.role] as const));
  const planches = planchesDuLog(game.log ?? [], (seat) => roles.get(seat) ?? null);
  if (planches.length === 0) return null;
  // La dernière planche du récit est ouverte ; « Il est l'heure. » aussi, qui le clôt.
  const derniereDuRecit = planches.length - 2;

  return (
    <section aria-labelledby="fin-recit" className="w-full">
      <div className="flex items-baseline justify-between gap-3 lg:border-t-[0.75px] lg:border-filet-doux lg:pt-3">
        <h2 id="fin-recit" className="t-titre m-0">
          La nuit racontée
        </h2>
        <p className="t-rubrique m-0 text-encre-2">{planches.length} planches</p>
      </div>

      {!large && (
        <figure className="m-0 mt-2.5 flex flex-col items-center">
          <Frontispice format="bandeau" />
          <figcaption className="t-legende mt-1.5 text-center">« {voix.legendeEcran('revelation')} »</figcaption>
        </figure>
      )}

      <ol className="m-0 mt-4 list-none p-0 lg:grid lg:grid-cols-3 lg:gap-4">
        {planches.map((planche, rang) =>
          large ? (
            <PlancheDesktop key={planche.cle} planche={planche} ligne={ligne} onPleinEcran={() => setPleinEcran(rang)} />
          ) : (
            <PlancheMobile
              key={planche.cle}
              planche={planche}
              ouverteParDefaut={rang >= derniereDuRecit}
              ligne={ligne}
              onPleinEcran={() => setPleinEcran(rang)}
            />
          ),
        )}
      </ol>

      {pleinEcran !== null && (
        <PlanchePleinEcran
          planches={planches}
          rang={pleinEcran}
          ligne={ligne}
          onAller={setPleinEcran}
          onFermer={() => setPleinEcran(null)}
        />
      )}
    </section>
  );
}
