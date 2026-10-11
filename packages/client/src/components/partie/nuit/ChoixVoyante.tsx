/**
 * La Voyante : sonder un vivant, jamais elle-même (R39), et tenir son carnet.
 *
 * Le carnet (`inspections`) garde chaque nuit apprise, à elle seule. La
 * vision de la nuit en cours ne s'y inscrit qu'à la clôture de l'étape
 * principale (`closePrincipal`) : d'ici là, l'écran dit honnêtement qu'elle
 * viendra — et le village qui dort la lui montre ensuite.
 */

import { motion } from 'motion/react';

import type { GameView } from '@garoutom/engine';

import { RESSORT_CARTE } from '../../../anim/tokens.js';
import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { ChoixUnique } from './ChoixUnique.js';
import { EnTeteRole, GabaritRole, usePeau } from './commun.js';
import { numeroDeNuit, textePrompt } from './textes.js';

export function ChoixVoyante() {
  const game = useGame();
  const peau = usePeau();
  const nom = useNoms();
  if (game?.you == null || game.prompt?.kind !== 'sonder') return null;
  const moi = game.you;

  const choisissable = (seat: number) => game.players[seat]?.alive === true && seat !== moi.seat;
  const visionDuJour = game.inspections.find((entree) => entree.day === game.day);

  return (
    <GabaritRole teinte="lune" testId="nuit-voyante">
      <EnTeteRole role={moi.role} teinte="lune" texte={textePrompt(peau, game.prompt, nom, moi.seat)} />
      <ChoixUnique
        acted={game.acted}
        choisissable={choisissable}
        teinte="lune"
        label="Choisir qui sonder cette nuit"
        verbe={(qui) => `Sonder ${qui}`}
        recap={(qui) => (
          <>
            Votre regard s’est posé sur <strong>{qui}</strong>.{' '}
            {visionDuJour ? '' : 'La vision s’inscrira dans votre carnet quand la nuit aura tourné.'}
          </>
        )}
        recapSansMemoire="Votre regard s’est posé. La vision s’inscrira dans votre carnet quand la nuit aura tourné."
        onValider={(target) => void jouer({ type: 'sonder', target })}
        enPlus={<Carnet game={game} />}
      />
    </GabaritRole>
  );
}

/** Le carnet : une ligne par nuit apprise, la plus récente en tête. */
function Carnet({ game }: { game: GameView }) {
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const lignes = [...game.inspections].sort((x, y) => y.day - x.day);
  return (
    <section aria-labelledby="titre-carnet" className="carte p-4">
      <h3 id="titre-carnet" className="font-identite text-xl font-semibold">
        Votre carnet
      </h3>
      {lignes.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--papier-doux)' }}>
          Encore vierge : chaque vision s’y inscrira, nuit après nuit.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {lignes.map((ligne) => (
            <motion.li
              key={`${String(ligne.day)}-${String(ligne.target)}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={RESSORT_CARTE}
              className="flex flex-wrap items-baseline gap-x-3 text-base"
            >
              <span className="font-mono text-xs" style={{ color: 'var(--papier-doux)' }}>
                {numeroDeNuit(peau, ligne.day)}
              </span>
              <span>{nom(ligne.target)}</span>
              <span className="font-identite text-lg font-semibold" style={{ color: 'var(--lune)' }}>
                {voix.nomRole(ligne.role)}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
