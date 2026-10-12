/**
 * Le village qui dort.
 *
 * L'écran de tous ceux que la nuit n'appelle pas : le villageois, la meute
 * pendant l'étape de la Sorcière, l'amoureux, le mort, le spectateur — et la
 * Voyante une fois son regard posé. C'est le **gabarit de référence** de la
 * nuit (`Caprices-E1-Nuit-Dort`) : la place, non interactive ; à la place de
 * la consigne, la légende du graveur (« Dormez : d'autres veillent pour
 * vous. », ou pour le mort « Tout voir, enfin, et trop tard. ») ; le pli ; et
 * dans la barre, comme chez tous, deux boutons : l'appui long « Gardez le
 * pouce : ma carte » — le dormeur a, lui aussi, un geste au pouce (N5) — et
 * « Fermer les yeux », qui ne fait que baisser l'écran un instant.
 *
 * **Jamais** « 3 joueurs n'ont pas encore joué » : savoir qui n'a pas joué,
 * c'est savoir qui a un rôle (views.ts, « la règle par défaut est le
 * silence »).
 *
 * Trois ajouts restent propres à un siège, chacun **dans une zone prévue**
 * et sans rien déplacer :
 *
 * - la Voyante relit son carnet **sous le pouce** (l'appui long « Carnet » de
 *   la ligne de résumé) — la place imprime les cartouches sur les jetons
 *   sondés tant que le pouce tient ;
 * - la Petite Fille entrouvre la porte pendant l'étape principale (R95) :
 *   sur la place, combien de loups visent chaque habitant — jamais lesquels —,
 *   et « Porte entrouverte » dans le résumé ;
 * - un rôle du village qui avait des pouvoirs lit, dans le résumé, qu'ils se
 *   sont éteints avec l'Ancien (R92).
 */

import type { GameView } from '@garoutom/engine';
import type { ReactNode } from 'react';

import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Glyphe } from '../../habit/glyphes.js';
import { Icone } from '../../habit/Icone.js';
import {
  BoutonFermerLesYeux,
  Consigne,
  LigneResume,
  Pastille,
  pouvoirsEteints,
  PouvoirsEteints,
  Resume,
  usePeau,
} from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { useCarnet } from './sousLePouce.js';

/**
 * La Petite Fille entrouvre la porte (R95, D15) : sur la place, combien de
 * loups visent chaque habitant, en direct — **jamais lesquels**. La vue ne
 * lui donne que des nombres par cible ; l'écran n'y ajoute rien : aucun
 * pseudo de loup, aucune pastille sur un loup, aucun ordre d'arrivée.
 */
function porteEntrouverte(
  espionnage: Readonly<Record<number, number>>,
  nom: (seat: number) => string,
): { annotations: Record<number, ReactNode>; lecteur: ReactNode } {
  const cibles = Object.entries(espionnage)
    .map(([siege, nombre]) => ({ seat: Number(siege), nombre }))
    .filter((cible) => cible.nombre > 0)
    .sort((a, b) => b.nombre - a.nombre || a.seat - b.seat);
  const annotations: Record<number, ReactNode> = {};
  for (const cible of cibles) {
    annotations[cible.seat] = (
      <Pastille>
        <Glyphe nom="oeil" taille={12} />
        <span className="sr-only">visé·e par </span>
        {String(cible.nombre)}
      </Pastille>
    );
  }
  // Les pastilles de la place sont muettes : la même chose, dite.
  const lecteur = (
    <ul className="sr-only" aria-live="polite" aria-label="Ce que vous entrevoyez sur la place">
      {cibles.length === 0 ? (
        <li>Personne n’est encore visé.</li>
      ) : (
        cibles.map((cible) => <li key={cible.seat}>{`${nom(cible.seat)} : ${String(cible.nombre)}`}</li>)
      )}
    </ul>
  );
  return { annotations, lecteur };
}

export function VillageDort() {
  const game = useGame();
  if (game === null) return null;
  return <VillageQuiDort game={game} />;
}

function VillageQuiDort({ game }: { game: GameView }) {
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const carnet = useCarnet(game);

  const moi = game.you;
  const etape = game.step ?? 'principale';
  const mort = moi !== null && !moi.alive;
  const porte = game.espionnage === null ? null : porteEntrouverte(game.espionnage, nom);

  const annotations = porte?.annotations;
  const resume =
    carnet.resume ??
    (porte !== null ? (
      <Resume testId="porte-entrouverte" icone={<Icone nom="porte" className="size-4" />} gras="Porte entrouverte" />
    ) : pouvoirsEteints(game) ? (
      <Resume suite={<PouvoirsEteints />} />
    ) : null);

  return (
    <EcranNuit
      testId="village-dort"
      consigne={
        <Consigne
          titre={peau.narrateur.phases.nuit[etape]}
          legende={voix.legendeEcran(mort ? 'mort' : 'nuitDormeur')}
        />
      }
      place={
        <PlaceDeNuit label="La place du village" {...(annotations ? { annotations } : {})} />
      }
      apresPlace={
        <>
          {carnet.lecteur}
          {porte?.lecteur}
        </>
      }
      resume={carnet.disponible ? <LigneResume outil={carnet.appui('Carnet')}>{resume}</LigneResume> : resume}
      action={<BoutonFermerLesYeux />}
    />
  );
}
