/**
 * La révélation : chacun seul avec sa carte.
 *
 * Le moment le plus intime du jeu (design.md, « Révélation de carte ») :
 * l'écran s'assombrit autour d'une carte face cachée, on la retourne à son
 * rythme — un clic, ou Entrée —, on lit son rôle dans la voix du skin, puis
 * on confirme (prompt `pret`). Le retournement est l'affaire de `CarteRole`,
 * qui respecte `prefers-reduced-motion`.
 *
 * Pas de « 4 joueurs prêts sur 8 » : le moment n'a pas besoin d'un compteur
 * pour être solennel, et le temps écoulé ouvre la nuit de toute façon (R32).
 * Une carte retournée peut se recacher — le voisin du canapé n'a pas à lire
 * par-dessus l'épaule pendant qu'on attend.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';

import { campOf } from '@garoutom/engine';

import { RESSORT_CARTE, RESSORT_PANNEAU } from '../../anim/tokens.js';
import { jouer } from '../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../lib/partie.js';
import { CarteRole } from '../habit/CarteRole.js';
import { usePeau } from './nuit/commun.js';

export function Revelation() {
  const game = useGame();
  const voix = useVoix();
  const peau = usePeau();
  const nom = useNoms();
  // Une carte déjà confirmée (rechargement de page) revient face visible.
  const [retournee, setRetournee] = useState(() => game?.acted === true);

  if (game === null) return null;
  const moi = game.you;

  // Spectateur, ou siège sans consigne : la table attend, sans rien compter.
  if (moi === null || !moi.alive || game.prompt?.kind !== 'pret') {
    return (
      <Voile>
        <CarteRole role={null} retournee={false} taille="grande" />
        <p className="font-identite max-w-[28rem] text-2xl leading-snug font-semibold">
          {peau.narrateur.phases.revelation}
        </p>
        <p className="text-base" style={{ color: 'var(--papier-doux)' }}>
          Chacun découvre sa carte. La nuit tombera bientôt.
        </p>
      </Voile>
    );
  }

  const role = moi.role;
  // Toute la meute se reconnaît, le Loup Blanc compris (R96) : il chasse avec
  // elle. Ses complices le prennent pour l'un des leurs ; lui sait, et sa
  // carte lui dit déjà qu'il ne gagnera que seul.
  const deLaMeute = campOf(role) === 'loups';
  const complices = deLaMeute && game.pack !== null ? game.pack.seats.filter((seat) => seat !== moi.seat) : [];
  const retourner = () => setRetournee((v) => !v);

  return (
    <Voile>
      <p className="max-w-[30rem] text-base leading-relaxed" style={{ color: 'var(--papier-doux)' }}>
        {peau.prompts.pret}
      </p>

      <CarteRole role={role} retournee={retournee} taille="grande" avecDescription={false} onClic={retourner} />

      <button type="button" className="btn-voisin" onClick={retourner} aria-pressed={retournee}>
        {retournee ? 'Cacher ma carte' : 'Retourner ma carte'}
      </button>

      <div aria-live="polite" className="flex min-h-[6rem] w-[min(32rem,100%)] flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          {retournee && (
            <motion.div
              key="lecture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={RESSORT_CARTE}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--papier-doux)' }}>
                Vous êtes
              </p>
              <h2 className="font-identite text-4xl leading-tight font-bold">{voix.nomRole(role)}</h2>
              <p className="text-base leading-relaxed">{voix.descriptionRole(role)}</p>
              {deLaMeute && (
                <p className="mt-1 text-base" style={{ color: 'var(--sang)' }}>
                  {complices.length === 0
                    ? 'Aucun complice : vous chassez sans personne à vos côtés.'
                    : role === 'loupBlanc'
                      ? // Ce ne sont pas des complices : ce sont, un jour, des proies.
                        `Vous chassez aux côtés de ${voix.nomCamp('loups')} : ${complices.map(nom).join(', ')}.`
                      : `Vos complices : ${complices.map(nom).join(', ')}.`}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {game.acted ? (
        <motion.p
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={RESSORT_CARTE}
          className="max-w-[28rem] text-base"
          style={{ color: 'var(--lune)' }}
        >
          C’est noté. Gardez votre secret : la nuit tombera bientôt.
        </motion.p>
      ) : (
        <button type="button" className="btn-village" disabled={!retournee} onClick={() => void jouer({ type: 'pret' })}>
          {retournee ? 'Je suis prêt·e' : 'Retournez d’abord votre carte'}
        </button>
      )}
    </Voile>
  );
}

/**
 * Une colonne au centre de l'écran assombri. L'assombrissement lui-même est
 * posé par `Partie` sur toute la table (`VoileRevelation`) : pris dans
 * l'écran qui défile, il laissait une bande claire au bas de l'écran.
 *
 * `shrink-0` : dans le `main` en colonne qui défile, une colonne centrée qui
 * se laisserait rétrécir à la hauteur de l'écran déborderait des deux côtés,
 * et son haut partirait hors d'atteinte du défilement.
 */
function Voile({ children }: { children: ReactNode }) {
  return (
    <motion.section
      data-testid="revelation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={RESSORT_PANNEAU}
      className="relative flex min-h-full shrink-0 flex-col items-center justify-center gap-5 px-4 py-8 text-center"
    >
      {children}
    </motion.section>
  );
}
