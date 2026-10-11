/**
 * Cupidon, la première nuit : deux vivants distincts, lui-même permis (R37).
 *
 * La flèche est double, la sélection aussi : un troisième jeton touché
 * remplace le plus ancien des deux, pour qu'on n'ait jamais à défaire avant
 * de refaire. Le lien ne part qu'au bouton — un pouce qui glisse sur la place
 * ne doit pas sceller deux destins.
 */

import { useState } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms } from '../../../lib/partie.js';
import { Place } from '../Place.js';
import { EnTeteRole, GabaritRole, Recap, usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixCupidon() {
  const game = useGame();
  const peau = usePeau();
  const nom = useNoms();
  const [paire, setPaire] = useState<readonly number[]>([]);
  const [envoyee, setEnvoyee] = useState<readonly [number, number] | null>(null);
  const [modifier, setModifier] = useState(false);
  if (game?.you == null || game.prompt?.kind !== 'cupidon') return null;
  const moi = game.you;

  const vivant = (seat: number) => game.players[seat]?.alive === true;
  const choisir = (seat: number) =>
    setPaire((avant) =>
      avant.includes(seat) ? avant.filter((s) => s !== seat) : [...avant, seat].slice(-2),
    );
  const [a, b] = paire;
  const lier = () => {
    if (a === undefined || b === undefined) return;
    setEnvoyee([a, b]);
    setModifier(false);
    void jouer({ type: 'cupidon', a, b });
  };

  const enSelection = !game.acted || modifier;

  return (
    <GabaritRole teinte="serment" testId="nuit-cupidon">
      <EnTeteRole role={moi.role} teinte="serment" texte={textePrompt(peau, game.prompt, nom, moi.seat)} />
      {enSelection ? (
        <>
          <Place
            choisissables={vivant}
            choisis={paire}
            onChoisir={choisir}
            teinte="serment"
            compacte
            label="Choisir deux vivants à lier"
          />
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm" style={{ color: 'var(--papier-doux)' }} aria-live="polite">
              {paire.length === 0
                ? 'Touchez deux jetons sur la place.'
                : paire.length === 1 && a !== undefined
                  ? `${nom(a)}… et qui d’autre ?`
                  : a !== undefined && b !== undefined
                    ? `${nom(a)} et ${nom(b)}`
                    : ''}
            </p>
            <button type="button" className="btn-village" disabled={paire.length !== 2} onClick={lier}>
              Lier ces deux destins
            </button>
          </div>
        </>
      ) : (
        <Recap changeable onChanger={() => setModifier(true)}>
          {envoyee
            ? `Vous avez lié ${nom(envoyee[0])} et ${nom(envoyee[1])}.`
            : 'Votre flèche est partie.'}
        </Recap>
      )}
    </GabaritRole>
  );
}
