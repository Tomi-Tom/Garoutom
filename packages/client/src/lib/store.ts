/**
 * L'état du client Garoutom.
 *
 * Une seule vérité, et elle vient du serveur : `room` et `game` sont remplis
 * par les `SyncPayload` et par rien d'autre. Un accusé de réussite ne touche
 * pas au magasin — le `sync` qui suit fait foi, et c'est lui, déjà, qui a été
 * taillé pour le siège de ce joueur. Ce que le client ajoute par-dessus est
 * à lui : le fil des avis éphémères, la connexion, le souvenir de son propre
 * identifiant.
 */

import { create } from 'zustand';

import type { GameView, NoticePayload, RoomView, SyncPayload } from '@garoutom/engine';

/** Un avis éphémère : le message du serveur ou d'une action refusée. */
export interface Notice {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

interface StoreState {
  connected: boolean;
  /** L'identifiant public du joueur local, donné par l'accusé d'entrée à la table. */
  playerId: string | null;
  room: RoomView | null;
  game: GameView | null;
  /**
   * `serverNow − Date.now()` au dernier `sync`, ou `null` avant le premier.
   *
   * Les échéances du contrat voyagent dans l'horloge du serveur, jamais dans
   * celle du navigateur : une machine décalée de trois minutes doit afficher
   * un compte à rebours juste. Tout l'écran compare donc à
   * `Date.now() + decalageHorloge`, qui est l'heure du serveur vue d'ici.
   */
  decalageHorloge: number | null;
  notices: Notice[];
  /** Le texte de l'unique région `role="status"` de l'application. */
  live: { id: number; text: string } | null;

  setConnected: (connected: boolean) => void;
  setPlayerId: (playerId: string | null) => void;
  applySync: (payload: SyncPayload) => void;
  pushNotice: (message: string, tone?: NoticePayload['tone']) => void;
  dismissNotice: (id: number) => void;
  reset: () => void;
}

/** Au-delà, les avis se recouvrent au lieu d'informer. */
const MAX_NOTICES = 3;

let sequence = 0;
const nextId = (): number => (sequence += 1);

export const useStore = create<StoreState>((set) => ({
  connected: false,
  playerId: null,
  room: null,
  game: null,
  decalageHorloge: null,
  notices: [],
  live: null,

  setConnected: (connected) => set({ connected }),

  setPlayerId: (playerId) => set({ playerId }),

  applySync: (payload) =>
    set({
      room: payload.room,
      game: payload.game,
      decalageHorloge: payload.serverNow - Date.now(),
    }),

  // Un serveur qui répète son refus ne doit pas noyer l'écran : on ignore la
  // répétition immédiate et l'on ne garde que les derniers messages. La durée
  // de vie, elle, est au composant qui les affiche.
  pushNotice: (message, tone = 'info') =>
    set((state) => {
      const last = state.notices[state.notices.length - 1];
      if (last !== undefined && last.message === message) return state;
      return {
        notices: [...state.notices, { id: nextId(), message, tone }].slice(-MAX_NOTICES),
        live: { id: nextId(), text: message },
      };
    }),

  dismissNotice: (id) =>
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),

  // Quitter une table rend l'état à la nuit : rien ne doit y rester d'une
  // partie qu'on a laissée. Les avis restent — ils disent pourquoi on part.
  reset: () =>
    set({
      room: null,
      game: null,
      playerId: null,
      decalageHorloge: null,
      live: null,
    }),
}));

/* ------------------------------------------------------------------ */
/* Sélecteurs                                                          */
/* ------------------------------------------------------------------ */

/** Le joueur local, tel que la table le décrit — `undefined` hors table. */
export function selectMe(state: { room: RoomView | null; playerId: string | null }) {
  if (state.room === null || state.playerId === null) return undefined;
  const id = state.playerId;
  return state.room.players.find((player) => player.id === id);
}

/** L'heure du serveur vue du navigateur, pour lire les échéances du contrat. */
export function heureServeur(state: { decalageHorloge: number | null }): number {
  return Date.now() + (state.decalageHorloge ?? 0);
}
