/**
 * Le savoir privé sous le pouce (SPEC § 5.1.6, P0-3).
 *
 * La nuit, rien de ce qu'un siège sait seul ne reste à l'écran : sa carte, le
 * carnet de la Voyante, son âme sœur, sa meute. Ils paraissent **tant que le
 * pouce tient** l'appui long de la barre, et se recachent d'une image au
 * relâchement, au changement d'onglet, ou au bout de 8 s (`AppuiLong`). Le
 * geste est le même pour tous (N5) : le dormeur a sa carte sous le pouce, la
 * Voyante son carnet — même bouton, même habit, seuls les mots changent.
 *
 * Le pouce posé, la place imprime elle-même ce que ce siège sait (complices,
 * rôles sondés, lacs) : on le lui dit par `poserLePouce` (`place/savoir.ts`,
 * lot de la table). La carte, elle, est `<MaCarte declencheur="barre"/>` (lot
 * des cartes) : en tirage cuivre la nuit — jamais brunie jusqu'au papier (N3).
 */

import type { GameView } from '@garoutom/engine';
import { useEffect, useState, type ReactNode } from 'react';

import { LECTURE_MAX_MS } from '../../../anim/tokens.js';
import { useNoms, useVoix } from '../../../lib/partie.js';
import { AppuiLong } from '../../caprices/index.js';
import { MaCarte } from '../MaCarte.js';
import { poserLePouce } from '../place/savoir.js';
import { Resume, usePeau } from './commun.js';
import { numeroDeNuit } from './textes.js';

/** Les secondes qui restent à une lecture sous le pouce (8 s au plus, P0-2). */
function useDecompte(): number {
  const total = Math.ceil(LECTURE_MAX_MS / 1000);
  const [reste, setReste] = useState(total);
  useEffect(() => {
    const debut = Date.now();
    const minuteur = setInterval(() => {
      setReste(Math.max(0, total - Math.floor((Date.now() - debut) / 1000)));
    }, 250);
    return () => clearInterval(minuteur);
  }, [total]);
  return reste;
}

/** La ligne de résumé d'une lecture : « Relâchez pour cacher · 6 s ». */
function ResumeLecture() {
  const reste = useDecompte();
  return <Resume gras="Relâchez pour cacher" droite={`${String(reste)} s`} />;
}

/**
 * « Gardez le pouce : ma carte » — le déclencheur `barre` de `<MaCarte/>`
 * (lot des cartes, signature figée) : la carte du siège dans le tirage de
 * l'heure, ce que lui seul sait, et la place qui imprime son savoir privé.
 * Un spectateur n'a pas de carte, mais la barre garde chez lui sa forme : le
 * même appui long, à la même place, qui ne montre rien.
 */
export function appuiMaCarte(game: GameView): ReactNode {
  if (game.you !== null) return <MaCarte declencheur="barre" />;
  return (
    <span className="flex min-w-0 flex-1">
      <AppuiLong libelle="Gardez le pouce : ma carte" libelleCourt="Ma carte" onDebut={() => {}} onFin={() => {}} className="w-full" />
    </span>
  );
}

export interface Carnet {
  /** La Voyante vivante a-t-elle déjà appris quelque chose ? */
  disponible: boolean;
  /** Le carnet est-il sous le pouce ? */
  tenu: boolean;
  /** L’appui long de la ligne de résumé (« Carnet »), avec son libellé. */
  appui: (libelle: string) => ReactNode;
  /** Ce que la lecture dit aux lecteurs d'écran (rien hors lecture). */
  lecteur: ReactNode;
  /** « Relâchez pour cacher · 6 s » pendant la lecture (`null` sinon). */
  resume: ReactNode;
}

/**
 * « Gardez le pouce : lire le carnet » — la Voyante relit ce qu'elle a vu.
 * Le pouce posé, la place imprime sur chaque jeton sondé le cartouche de son
 * rôle (craie pour la meute, sous le pouce seulement) ; la liste entière se
 * dit aux lecteurs d'écran ; le résumé décompte. Relâché, plus rien.
 */
export function useCarnet(game: GameView): Carnet {
  const voix = useVoix();
  const peau = usePeau();
  const nom = useNoms();
  const [tenu, setTenu] = useState(false);
  const moi = game.you;
  const disponible = moi !== null && moi.alive && moi.role === 'voyante' && game.inspections.length > 0;
  const lu = tenu && disponible;

  const lignes = [...game.inspections].sort((a, b) => b.day - a.day);
  const lecteur = lu ? (
    <section data-testid="carnet" aria-label="Votre carnet" className="sr-only">
      <ul aria-live="polite">
        {lignes.map((ligne) => (
          <li key={`${String(ligne.day)}-${String(ligne.target)}`}>
            {`${numeroDeNuit(peau, ligne.day)} : ${nom(ligne.target)} est ${voix.nomRole(ligne.role)}.`}
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  return {
    disponible,
    tenu: lu,
    lecteur,
    appui: (libelle: string) => (
      <AppuiLong
        libelle={libelle}
        // Un outil de la ligne de résumé (24 px), pas une action de la barre.
        className="!h-6 !min-h-6 shrink-0 !gap-1.5 !px-2 !text-[14px] !font-normal [&_.appui-anneau]:!size-4"
        onDebut={() => {
          setTenu(true);
          poserLePouce(true);
        }}
        onFin={() => {
          setTenu(false);
          poserLePouce(false);
        }}
      />
    ),
    resume: lu ? <ResumeLecture /> : null,
  };
}
