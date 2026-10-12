/**
 * Les crochets partagés de l'écran de partie.
 *
 * Chaque brique de la table (la place, la nuit, le fil, la fin…) lit le
 * magasin par ici plutôt que de recomposer elle-même les mêmes trois
 * choses : la voix du skin réglé, le pseudo d'un siège, et l'échéance du
 * siège local. Ces noms sont un contrat entre les briques — on peut en
 * ajouter, jamais en retirer ni en renommer (voir docs/CHANTIER-TABLE.md).
 */

import { useEffect, useMemo, useState } from 'react';

import type { GameView, RoomView } from '@garoutom/engine';

import { voixDuSkin, type Voix } from '../skins/registre.js';
import { heureServeur, useStore } from './store.js';

/** Le skin de la table : celui que porte la partie, sinon celui du salon. */
export function useSkinId(): string {
  const skinPartie = useStore((state) => state.game?.options.skin);
  const skinSalon = useStore((state) => state.room?.options.skin);
  return skinPartie ?? skinSalon ?? 'thiercelieux';
}

/** La voix du skin réglé — nom des rôles, phrases du narrateur, libellés. */
export function useVoix(): Voix {
  const id = useSkinId();
  return useMemo(() => voixDuSkin(id), [id]);
}

/**
 * Le pseudo d'un siège. Un siège sans joueur (parti, grâce éteinte) garde un
 * nom lisible : le moteur, lui, ne libère jamais un siège.
 */
export function nomDuSiege(room: RoomView | null, seat: number): string {
  const joueur = room?.players.find((player) => player.seat === seat);
  return joueur?.name ?? `Siège ${String(seat + 1)}`;
}

/** `(siège) => pseudo`, stable tant que la table ne change pas. */
export function useNoms(): (seat: number) => string {
  const room = useStore((state) => state.room);
  return useMemo(() => (seat: number) => nomDuSiege(room, seat), [room]);
}

/** La vue de partie du siège local, ou `null` hors partie. */
export function useGame(): GameView | null {
  return useStore((state) => state.game);
}

/** La table, ou `null` hors table. */
export function useRoom(): RoomView | null {
  return useStore((state) => state.room);
}

/** Ce que l'échéance du siège local dit, recalculé quatre fois par seconde. */
export interface Echeance {
  /** Millisecondes restantes, jamais négatives. */
  restantMs: number;
  /** Durée pleine de la minuterie. */
  dureeMs: number;
  /** De 1 (vient d'armer) à 0 (échue). */
  fraction: number;
  /** Secondes restantes arrondies au-dessus, pour l'affichage. */
  secondes: number;
  /** L'horloge de la table est suspendue (D19) : le temps restant est figé. */
  figee: boolean;
}

/**
 * L'échéance du siège local, ou `null` s'il n'a rien à jouer (R80 : celle
 * des autres est un secret, le serveur ne l'envoie pas).
 *
 * Quand la table est en pause (`RoomView.paused`, D19), le temps restant se
 * fige là où la pause l'a trouvé : l'échéance reprendra, décalée d'autant.
 */
export function useEcheance(): Echeance | null {
  const deadline = useStore((state) => state.room?.deadline ?? null);
  const duree = useStore((state) => state.room?.deadlineDurationMs ?? null);
  const pauseVue = useStore((state) => (state.room?.paused === true ? state.pauseVue : null));
  const [, setTic] = useState(0);

  useEffect(() => {
    if (deadline === null || pauseVue !== null) return;
    const timer = setInterval(() => setTic((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, [deadline, pauseVue]);

  if (deadline === null || duree === null || duree <= 0) return null;
  const maintenant = pauseVue ?? heureServeur(useStore.getState());
  const restantMs = Math.max(0, deadline - maintenant);
  return {
    restantMs,
    dureeMs: duree,
    fraction: Math.min(1, restantMs / duree),
    secondes: Math.ceil(restantMs / 1000),
    figee: pauseVue !== null,
  };
}

/** La table attend son village : plus aucun vivant n'est là, l'horloge est suspendue (D19). */
export function usePause(): boolean {
  return useStore((state) => state.room?.paused === true);
}

/** Les sièges vivants, dans l'ordre de la table. */
export function siegesVivants(game: GameView): number[] {
  return game.players.filter((player) => player.alive).map((player) => player.seat);
}

/** Formate des secondes en `m:ss`. */
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`;
}
