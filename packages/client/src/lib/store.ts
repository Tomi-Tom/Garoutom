/**
 * L'état du client Garoutom.
 *
 * Une seule vérité, et elle vient du serveur : `room` et `game` sont remplis
 * par les `SyncPayload` et par rien d'autre. Un accusé de réussite ne touche
 * pas au magasin — le `sync` qui suit fait foi, et c'est lui, déjà, qui a été
 * taillé pour le siège de ce joueur. Ce que le client ajoute par-dessus est
 * à lui : le fil des avis éphémères, la connexion et le rattachement à sa
 * place, le souvenir de son propre identifiant, et la chronique des
 * évènements reçus.
 */

import { create } from 'zustand';

import {
  eventSeqOf,
  type GameEvent,
  type GameView,
  type NoticePayload,
  type RoomView,
  type SyncPayload,
} from '@garoutom/engine';

/**
 * Un évènement du moteur tel que le client le garde : numéroté à l'arrivée,
 * daté du jour de la partie où il est tombé. La chronique est ce que le
 * narrateur raconte et ce que l'atelier sonore écoute — le `sync` ne fait
 * que la remplir, il ne la rejoue jamais.
 */
export interface EvenementRecu {
  id: number;
  event: GameEvent;
  day: number;
  /** Le numéro public de l'évènement dans le journal de la table (D22), quand le serveur le donne. */
  seq?: number;
  /**
   * Rejoué à la reprise : l'évènement a eu lieu pendant l'absence. Il entre
   * dans la chronique — le journal le raconte, le crieur le résume —, mais
   * l'atelier sonore et les animations l'ignorent : on ne sonne pas le glas
   * d'une mort qu'on lit après coup.
   */
  rejoue?: true;
}

/** Un avis éphémère : le message du serveur ou d'une action refusée. */
export interface Notice {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

/**
 * Le rattachement à sa place, distinct de la connexion (D22) : une socket
 * ouverte n'est assise nulle part tant que le serveur n'a pas accepté la
 * reprise.
 *
 * - `rattache` : la place est tenue — ou il n'y en a aucune à reprendre ;
 * - `perdu` : la liaison est tombée alors qu'on tenait une place ;
 * - `reprise` : connecté, la reprise est en vol ou retentée ;
 * - `echec` : la reprise a échoué sans refus définitif ; un geste la relance.
 *
 * Tant que la place n'est pas `rattache`, les actions de jeu sont suspendues.
 */
export type Rattachement = 'rattache' | 'perdu' | 'reprise' | 'echec';

interface StoreState {
  connected: boolean;
  /** Le navigateur se dit hors ligne (`offline`) : le bandeau le dit tout de suite. */
  horsLigne: boolean;
  rattachement: Rattachement;
  /**
   * La place a été reprise depuis un autre onglet (`CLOSE_REPLACED`) : le
   * canal ne se reconnecte plus tout seul, l'écran propose de reprendre ici.
   */
  remplace: boolean;
  /** L'identifiant public du joueur local, donné par l'accusé d'entrée à la table. */
  playerId: string | null;
  room: RoomView | null;
  game: GameView | null;
  /**
   * `heure du serveur − Date.now()`, ou `null` avant la première estimation.
   *
   * Les échéances du contrat voyagent dans l'horloge du serveur, jamais dans
   * celle du navigateur : une machine décalée de trois minutes doit afficher
   * un compte à rebours juste. Tout l'écran compare donc à
   * `Date.now() + decalageHorloge`, qui est l'heure du serveur vue d'ici.
   *
   * Deux sources : le `serverNow` de chaque `sync` (grossier — il ignore le
   * trajet), et, dès qu'il en donne une, l'estimation du canal sur
   * l'aller-retour le plus court des `ping` (D22), qui l'emporte alors.
   */
  decalageHorloge: number | null;
  /** Vrai dès que le canal a fourni son estimation : les `sync` ne la remplacent plus. */
  horlogeCanal: boolean;
  /**
   * L'heure du serveur à laquelle la pause de la table a été vue (D19), ou
   * `null` hors pause : la minuterie s'y fige, l'échéance reprendra décalée.
   */
  pauseVue: number | null;
  /**
   * Le numéro du dernier évènement public vu (`SyncPayload.seq`), pour la
   * table en cours. Rendu au serveur dans `room:join.lastSeq` à la reprise ;
   * un évènement déjà vu n'entre pas deux fois dans la chronique.
   */
  dernierSeq: number | null;
  /**
   * Les évènements reçus depuis l'entrée à la table, du plus ancien au plus
   * récent, bornés à `MAX_CHRONIQUE`. Remise à zéro par un `debut` (nouvelle
   * partie), par le retour au salon et au départ de la table.
   */
  chronique: EvenementRecu[];
  notices: Notice[];
  /** Le texte de l'unique région `role="status"` de l'application. */
  live: { id: number; text: string } | null;

  setConnected: (connected: boolean) => void;
  setHorsLigne: (horsLigne: boolean) => void;
  setRattachement: (rattachement: Rattachement) => void;
  setRemplace: (remplace: boolean) => void;
  setPlayerId: (playerId: string | null) => void;
  /** L'estimation du canal (D22) : elle fait foi dès qu'elle existe. */
  setDecalageCanal: (decalage: number) => void;
  applySync: (payload: SyncPayload) => void;
  pushNotice: (message: string, tone?: NoticePayload['tone']) => void;
  /** Annonce à la région vocale sans afficher d'avis — pour le narrateur. */
  annoncer: (text: string) => void;
  dismissNotice: (id: number) => void;
  reset: () => void;
}

/** Au-delà, les avis se recouvrent au lieu d'informer. */
const MAX_NOTICES = 3;

/** Ce que la chronique garde : assez pour une partie entière racontée au fil de l'eau. */
export const MAX_CHRONIQUE = 200;

let sequence = 0;
const nextId = (): number => (sequence += 1);

/** Le `seq` d'un `sync`, s'il est lisible — un serveur d'avant D22 n'en envoie pas. */
function seqDe(payload: SyncPayload): number | null {
  const seq: unknown = payload.seq;
  return typeof seq === 'number' && Number.isSafeInteger(seq) && seq >= 0 ? seq : null;
}

export const useStore = create<StoreState>((set) => ({
  connected: false,
  horsLigne: false,
  rattachement: 'rattache',
  remplace: false,
  playerId: null,
  room: null,
  game: null,
  decalageHorloge: null,
  horlogeCanal: false,
  pauseVue: null,
  dernierSeq: null,
  chronique: [],
  notices: [],
  live: null,

  setConnected: (connected) => set({ connected }),

  setHorsLigne: (horsLigne) => set({ horsLigne }),

  setRattachement: (rattachement) => set({ rattachement }),

  setRemplace: (remplace) => set({ remplace }),

  setPlayerId: (playerId) => set({ playerId }),

  setDecalageCanal: (decalage) => set({ decalageHorloge: decalage, horlogeCanal: true }),

  applySync: (payload) =>
    set((state) => {
      const day = payload.game?.day ?? 0;
      const seq = seqDe(payload);
      const rejoue = payload.replay === true;
      // Une autre table : sa chronique et ses numéros ne sont pas les nôtres.
      // Les numéros ne valent que pour la table qu'on tient déjà.
      const autreTable = state.room !== null && state.room.code !== payload.room.code;
      let dernier = state.room?.code === payload.room.code ? state.dernierSeq : null;
      // Un journal qui repart de plus bas a été refait (table rechargée sans
      // son journal) : les anciens numéros ne trient plus rien.
      if (seq !== null && dernier !== null && seq < dernier) dernier = null;

      // Les évènements déjà vus n'entrent pas deux fois : une reprise qui
      // rejoue un peu trop, ou un `sync` en double, ne raconte rien de plus.
      const neufs = payload.events
        .map((event, index) => ({ event, seq: seq === null ? null : eventSeqOf(payload, index) }))
        .filter((recu) => dernier === null || recu.seq === null || recu.seq > dernier);

      let chronique = autreTable ? [] : state.chronique;
      if (neufs.length > 0) {
        // Une partie qui commence repart d'une page blanche : la revanche ne
        // doit pas raconter les morts de la manche d'avant.
        const base = neufs.some((recu) => recu.event.type === 'debut') ? [] : chronique;
        chronique = [
          ...base,
          ...neufs.map(
            (recu): EvenementRecu => ({
              id: nextId(),
              event: recu.event,
              day,
              ...(recu.seq === null ? {} : { seq: recu.seq }),
              ...(rejoue ? { rejoue: true as const } : {}),
            }),
          ),
        ].slice(-MAX_CHRONIQUE);
      } else if (payload.game === null && chronique.length > 0) {
        // Retour au salon : la partie est rangée, sa chronique aussi.
        chronique = [];
      }

      return {
        room: payload.room,
        game: payload.game,
        decalageHorloge: state.horlogeCanal ? state.decalageHorloge : payload.serverNow - Date.now(),
        pauseVue: payload.room.paused === true ? (state.pauseVue ?? payload.serverNow) : null,
        dernierSeq: seq ?? dernier,
        chronique,
      };
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

  annoncer: (text) => set({ live: { id: nextId(), text } }),

  dismissNotice: (id) =>
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),

  // Quitter une table rend l'état à la nuit : rien ne doit y rester d'une
  // partie qu'on a laissée. Les avis restent — ils disent pourquoi on part —,
  // et l'horloge du canal aussi : elle ne dépend pas de la table.
  reset: () =>
    set((state) => ({
      room: null,
      game: null,
      playerId: null,
      decalageHorloge: state.horlogeCanal ? state.decalageHorloge : null,
      pauseVue: null,
      dernierSeq: null,
      rattachement: 'rattache',
      chronique: [],
      live: null,
    })),
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

/** Les actions de jeu sont-elles suspendues, le temps de reprendre sa place ? */
export function actionsSuspendues(state: { rattachement: Rattachement }): boolean {
  return state.rattachement !== 'rattache';
}
