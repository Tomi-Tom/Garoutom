/**
 * La fin de partie, en portfolio (SPEC Caprices § 5.15 ; maquettes
 * `C-Fin-Verdict`, `C-Fin-Distribution`, `C-Fin-NuitRacontee`,
 * `C-Fin-Planche`, `C-Fin-Desktop`). Tirage papier — l'épreuve imprimée.
 *
 * Sous la frise : le **verdict** dans sa cuvette (la légende « Il est
 * l'heure. », le cartouche du vainqueur, le verdict du crieur, le sort de ce
 * siège, l'heure où la partie s'est arrêtée, son rôle, les survivants), puis
 * **les cartes retournées** en petites cartes, la **nuit racontée** en
 * planches numérotées, et le fil à relire. Desktop : le verdict à gauche
 * (cuvette de 420), le reste à droite ; la page défile, et c'est le seul
 * écran de partie qui défile.
 *
 * L'écran de fin commun de la collection (`EcranFin`) est abandonné : son
 * verdict en capitales, ses boutons en pastille, ses lignes à 85 %
 * d'opacité contredisent la direction (capitales réservées au code, angles
 * vifs, aucune opacité sur un texte). Sa promesse est tenue ici à la main :
 * les trois actions de la collection, **dans leur ordre** — Rejouer (l'hôte
 * seul), L'arcade, Partager —, puis Quitter la table ; le verdict annoncé
 * par une région vive ; le son du verdict, lui, part de `useSonsPartie` à
 * l'évènement `fin`.
 *
 * Le chiffre est le moment où la partie s'est arrêtée, dans les mots du skin :
 * « Nuit 3 » si la dernière chose racontée est de la nuit, « Jour 4 » sinon
 * (à défaut de log, le numéro du jour de la vue).
 */

import { useState } from 'react';

import type { GameView } from '@garoutom/engine';

import { useGame, useRoom, useSkinId } from '../../lib/partie.js';
import { useStore } from '../../lib/store.js';
import { peauDuSkin, resoudre } from '../../skins/registre.js';
import { Bouton, Cuvette } from '../caprices/index.js';
import { useEstLarge } from '../useEstLarge.js';
import { Fil } from './Fil.js';
import { Distribution } from './fin/Distribution.js';
import { NuitRacontee } from './fin/NuitRacontee.js';
import { finitDeNuit } from './fin/recit.js';
import { ActionsFin, Verdict } from './fin/PlancheVerdict.js';
import { verdictDuSiege } from './fin/verdict.js';
import { useZonesCommunes } from './zones.js';

/** « Nuit 3 » ou « Jour 4 » : où la partie s'est arrêtée. */
function chiffreDe(game: GameView, recit: { nuit: string; jour: string }): string {
  const log = game.log ?? [];
  const derniere = log[log.length - 1];
  const nuit = finitDeNuit(log);
  if (derniere === undefined || nuit === null) return resoudre(recit.jour, { n: String(game.day) });
  // L'heure de la dernière entrée se lit dans le fil du log, comme au récit :
  // une rancune ou un chagrin du soir restent au jour.
  return resoudre(nuit ? recit.nuit : recit.jour, { n: String(derniere.day) });
}

/** Le fil de la partie, à relire sous le récit. */
function RelireLeFil() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <Bouton variante="secondaire" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        {ouvert ? 'Refermer le fil' : 'Relire le fil'}
      </Bouton>
      {ouvert && (
        <Cuvette className="w-full p-3">
          <Fil mode="integre" />
        </Cuvette>
      )}
    </div>
  );
}

export function Fin() {
  const game = useGame();
  const room = useRoom();
  const playerId = useStore((state) => state.playerId);
  const recit = peauDuSkin(useSkinId()).recit;
  const large = useEstLarge();
  const zones = useZonesCommunes();

  if (game === null) return null;

  const siege = game.you?.seat ?? null;
  const sort = verdictDuSiege(game.winner, game.players, siege);
  const estHote = room !== null && playerId !== null && room.hostId === playerId;
  const chiffre = chiffreDe(game, recit);
  const actions = (disposition: 'grille' | 'barre' | 'portes') => (
    <ActionsFin disposition={disposition} estHote={estHote} verdict={sort.verdict} chiffre={chiffre} />
  );

  return (
    <div data-testid="fin" data-verdict={sort.couleur} className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">{zones.frise}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-[var(--gouttiere)] pt-6 pb-10 lg:grid lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="max-lg:mx-2 lg:sticky lg:top-6">
            <Verdict game={game} sort={sort} chiffre={chiffre} actions={actions(large ? 'grille' : 'portes')} />
          </div>
          <div className="flex min-w-0 flex-col gap-10">
            <Distribution game={game} />
            <NuitRacontee game={game} />
            <RelireLeFil />
          </div>
        </div>
      </div>
      {!large && <div className="shrink-0 bg-surface pb-[env(safe-area-inset-bottom,0px)]">{actions('barre')}</div>}
    </div>
  );
}
