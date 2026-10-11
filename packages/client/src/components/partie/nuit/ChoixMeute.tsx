/**
 * La meute : dévorer — et voir les siens voter.
 *
 * Chaque loup vote pour un vivant qui n'est pas des leurs, ou s'abstient, et
 * peut changer d'avis tant que l'étape court (R40). Le vote part au premier
 * toucher : c'est un vote vivant, que la meute voit se poser en temps réel
 * (`pack.votes`) — une pastille au nom de chaque loup sur le jeton qu'il
 * vise. Sous les votes, le mini-fil du canal de la meute : on y parle en
 * regardant les voix se poser à côté des mots (design.md, section 3).
 *
 * Seules comptent les voix des loups vivants (R41) : la liste et les
 * pastilles ne montrent qu'eux.
 */

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { RESSORT_CARTE } from '../../../anim/tokens.js';
import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Fil } from '../Fil.js';
import { Place } from '../Place.js';
import { EnTeteRole, GabaritRole, Pastille, usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixMeute() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'devorer') return null;
  const moi = game.you;

  const meute = game.pack?.seats ?? [moi.seat];
  const votes = game.pack?.votes ?? {};
  const vivants = meute.filter((seat) => game.players[seat]?.alive === true);
  const monVote: number | null | undefined = votes[moi.seat];

  const choisissable = (seat: number) => game.players[seat]?.alive === true && !meute.includes(seat);
  const devorer = (target: number | null) => void jouer({ type: 'devorer', target });

  // Une pastille par loup sur le jeton qu'il vise.
  const parCible = new Map<number, number[]>();
  for (const loup of vivants) {
    const cible = votes[loup];
    if (cible === undefined || cible === null) continue;
    parCible.set(cible, [...(parCible.get(cible) ?? []), loup]);
  }
  const annotations: Record<number, ReactNode> = {};
  for (const [cible, loups] of parCible) {
    annotations[cible] = (
      <span className="flex flex-wrap justify-center gap-0.5">
        {loups.map((loup) => (
          <Pastille key={loup} teinte="sang">
            {loup === moi.seat ? 'vous' : nom(loup)}
          </Pastille>
        ))}
      </span>
    );
  }

  return (
    <GabaritRole teinte="sang" testId="nuit-meute">
      <EnTeteRole role={moi.role} teinte="sang" texte={textePrompt(peau, game.prompt, nom, moi.seat)} />

      <Place
        choisissables={choisissable}
        choisis={typeof monVote === 'number' ? [monVote] : []}
        onChoisir={(seat) => {
          if (seat !== monVote) devorer(seat);
        }}
        teinte="sang"
        annotations={annotations}
        compacte
        label="Choisir qui dévorer cette nuit"
      />

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="btn-voisin"
          aria-pressed={monVote === null}
          onClick={() => devorer(null)}
          style={monVote === null ? { borderColor: 'var(--sang)', color: 'var(--sang)' } : undefined}
        >
          Ne dévorer personne
        </button>
        {game.acted && (
          <p className="text-sm" style={{ color: 'var(--papier-doux)' }} role="status">
            {typeof monVote === 'number'
              ? `Votre voix va à ${nom(monVote)}.`
              : 'Vous laissez le village dormir.'}{' '}
            Vous pouvez changer d’avis tant que la nuit court.
          </p>
        )}
      </div>

      {/* --- La meute et ses voix --- */}
      <section aria-labelledby="titre-meute" className="carte p-4" style={{ borderColor: 'var(--sang-creux)' }}>
        <h3 id="titre-meute" className="font-identite text-xl font-semibold first-letter:uppercase" style={{ color: 'var(--sang)' }}>
          {voix.nomCamp('loups')}
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {vivants.map((loup) => {
            const cible = votes[loup];
            return (
              <motion.li
                key={loup}
                layout
                transition={RESSORT_CARTE}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-base"
              >
                <span>
                  {nom(loup)}
                  {loup === moi.seat && (
                    <span className="ml-1 text-sm" style={{ color: 'var(--papier-doux)' }}>
                      (vous)
                    </span>
                  )}
                </span>
                <span className="text-sm" style={{ color: cible === undefined ? 'var(--papier-doux)' : 'var(--papier)' }}>
                  {cible === undefined ? 'n’a pas encore choisi' : cible === null ? 's’abstient' : `vise ${nom(cible)}`}
                </span>
              </motion.li>
            );
          })}
        </ul>
        <Fil mode="integre" canaux={['loups']} className="mt-3" />
      </section>
    </GabaritRole>
  );
}
