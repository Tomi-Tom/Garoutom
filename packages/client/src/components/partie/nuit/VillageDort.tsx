/**
 * Le village qui dort.
 *
 * L'écran de tous ceux que la nuit n'appelle pas — et c'est un bel écran, pas
 * une salle d'attente : la place sous la lune, la phrase de la nuit, son
 * numéro. Rien d'autre. **Jamais** « 3 joueurs n'ont pas encore joué » :
 * savoir qui n'a pas joué, c'est savoir qui a un rôle (views.ts, « la règle
 * par défaut est le silence »). L'écran est le même pour le villageois, pour
 * la meute pendant l'étape de la Sorcière, pour le spectateur et pour le mort
 * — le voisin qui jette un œil ne doit rien pouvoir en tirer.
 *
 * Le décor de nuit est posé une fois pour tout l'écran par `Partie` : on ne
 * le redouble pas ici, deux ciels superposés assombriraient la place.
 *
 * Cinq ajouts seulement, chacun réservé à qui le lit déjà dans sa vue :
 * l'au-delà pour les morts, le serment replié pour les amoureux vivants, la
 * vision de la nuit pour la Voyante une fois l'étape principale close, la
 * porte entrouverte de la Petite Fille pendant cette étape (`espionnage`,
 * R95) — et, pour un rôle du village qui en avait, la mention de ses
 * pouvoirs éteints avec l'Ancien (R92).
 */

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { RESSORT_CARTE, RESSORT_PANNEAU } from '../../../anim/tokens.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Fil } from '../Fil.js';
import { Place } from '../Place.js';
import { CanalReplie, Lune, Pastille, pouvoirsEteints, PouvoirsEteints, usePeau } from './commun.js';
import { numeroDeNuit } from './textes.js';

/** La première lettre en capitale — « la meute » ouvre une phrase. */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

/**
 * La Petite Fille entrouvre la porte (R95, D15) : sur la place, combien de
 * loups visent chaque habitant, en direct — **jamais lesquels**. La vue ne
 * lui donne que des nombres par cible ; l'écran n'y ajoute rien : aucun
 * pseudo de loup, aucune pastille sur un loup, aucun ordre d'arrivée.
 */
function PorteEntrouverte({ espionnage }: { espionnage: Readonly<Record<number, number>> }) {
  const voix = useVoix();
  const nom = useNoms();
  const cibles = Object.entries(espionnage)
    .map(([siege, nombre]) => ({ seat: Number(siege), nombre }))
    .filter((cible) => cible.nombre > 0)
    .sort((a, b) => b.nombre - a.nombre || a.seat - b.seat);
  const annotations: Record<number, ReactNode> = {};
  for (const cible of cibles) {
    annotations[cible.seat] = <Pastille teinte="sang">{`×${String(cible.nombre)}`}</Pastille>;
  }

  return (
    <section
      data-testid="porte-entrouverte"
      aria-labelledby="titre-porte"
      className="flex w-[min(40rem,100%)] flex-col gap-3 text-left"
    >
      <div className="carte px-4 py-3">
        <h3 id="titre-porte" className="font-identite text-xl font-semibold" style={{ color: 'var(--sang)' }}>
          Vous entrouvrez la porte…
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--papier-doux)' }}>
          {capitale(voix.nomCamp('loups'))} choisit sa proie. Chaque chiffre dit combien de {voix.motLoups()}{' '}
          visent cet habitant — jamais lesquels.
        </p>
        {/* Les pastilles de la place sont muettes : la même chose, dite. */}
        <ul className="sr-only" aria-live="polite">
          {cibles.length === 0 ? (
            <li>Personne n’est encore visé.</li>
          ) : (
            cibles.map((cible) => <li key={cible.seat}>{`${nom(cible.seat)} : ${String(cible.nombre)}`}</li>)
          )}
        </ul>
      </div>
      <Place compacte annotations={annotations} label="Ce que vous entrevoyez sur la place" />
    </section>
  );
}

export function VillageDort() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  if (game === null) return null;

  const moi = game.you;
  const etape = game.step ?? 'principale';
  const mort = moi !== null && !moi.alive;
  // Le fil de l'au-delà : ouvert aux morts qui peuvent y écrire, ou qui y lisent déjà.
  const auDela = mort && (game.channels.includes('morts') || game.chat.some((m) => m.channel === 'morts'));
  // Le serment : seulement tant que les deux amoureux vivent, puisque c'est là qu'ils parlent.
  const serment = moi !== null && moi.alive && game.channels.includes('amoureux');
  // La Voyante retrouve sa vision de la nuit une fois l'étape principale close.
  const vision =
    moi !== null && moi.alive && moi.role === 'voyante'
      ? game.inspections.find((entree) => entree.day === game.day)
      : undefined;

  return (
    <section
      data-testid="village-dort"
      aria-labelledby="titre-nuit"
      className="relative isolate flex min-h-full shrink-0 flex-col items-center gap-5 overflow-hidden px-4 py-10 text-center"
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={RESSORT_PANNEAU}
      >
        <Lune taille={128} />
      </motion.div>

      <p className="font-mono text-sm tracking-[0.18em] uppercase" style={{ color: 'var(--lune)' }}>
        {numeroDeNuit(peau, game.day)}
      </p>
      <motion.h2
        id="titre-nuit"
        key={etape}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={RESSORT_CARTE}
        className="font-identite max-w-[30rem] text-3xl leading-tight font-semibold"
      >
        {peau.narrateur.phases.nuit[etape]}
      </motion.h2>

      {vision !== undefined && (
        <motion.p
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={RESSORT_CARTE}
          className="carte max-w-[30rem] px-4 py-3 text-base"
        >
          Votre vision de la nuit : <strong>{nom(vision.target)}</strong> est{' '}
          <strong className="font-identite text-lg">{voix.nomRole(vision.role)}</strong>.
        </motion.p>
      )}

      {game.espionnage !== null && <PorteEntrouverte espionnage={game.espionnage} />}

      {pouvoirsEteints(game) && <PouvoirsEteints className="max-w-[30rem]" />}

      {mort && (
        <div className="flex w-[min(32rem,100%)] flex-col gap-3">
          <p className="text-base" style={{ color: 'var(--lune)' }}>
            Votre nuit est finie. {auDela ? `${voix.libelleCanal('morts')} veille avec vous : on y parle librement.` : ''}
          </p>
          {auDela && <Fil mode="integre" canaux={['morts']} className="text-left" />}
        </div>
      )}

      {serment && (
        <div className="w-[min(32rem,100%)] text-left">
          <CanalReplie canal="amoureux" teinte="serment" />
        </div>
      )}
    </section>
  );
}
