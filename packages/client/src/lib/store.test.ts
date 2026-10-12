/**
 * Le magasin face à la reprise (D22) : les évènements numérotés n'entrent
 * qu'une fois, les rejoués sont marqués, l'horloge du canal l'emporte sur
 * celle des `sync`, la pause fige l'échéance.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_OPTIONS, type GameEvent, type RoomView, type SyncPayload } from '@garoutom/engine';

import { actionsSuspendues, useStore } from './store.js';

function salle(code = 'LOUP', ecarts: Partial<RoomView> = {}): RoomView {
  return {
    code,
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: [],
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
    ...ecarts,
  };
}

const vote = (executed: number | null): GameEvent => ({ type: 'vote', tally: {}, executed });
const nuit = (day: number): GameEvent => ({ type: 'phase', phase: 'nuit', step: 'principale', day });

function sync(events: GameEvent[], seq: number, ecarts: Partial<SyncPayload> = {}): SyncPayload {
  return { room: salle(), game: null, events, seq, serverNow: Date.now(), ...ecarts };
}

/** Les évènements de la chronique, sans leurs numéros locaux. */
function chronique() {
  return useStore.getState().chronique.map(({ event, seq, rejoue }) => ({ type: event.type, seq, rejoue }));
}

beforeEach(() => {
  useStore.setState({
    room: null,
    game: null,
    chronique: [],
    dernierSeq: null,
    decalageHorloge: null,
    horlogeCanal: false,
    pauseVue: null,
    rattachement: 'rattache',
  });
});

describe('la chronique numérotée', () => {
  it('range chaque évènement avec son numéro public', () => {
    // `game` non nul : un `sync` sans partie viderait la chronique (retour au salon).
    const partie = { day: 1 } as SyncPayload['game'];
    useStore.getState().applySync(sync([nuit(1), vote(null)], 2, { game: partie }));
    expect(chronique()).toEqual([
      { type: 'phase', seq: 1, rejoue: undefined },
      { type: 'vote', seq: 2, rejoue: undefined },
    ]);
    expect(useStore.getState().dernierSeq).toBe(2);
  });

  it('n’ajoute pas deux fois ce qu’une reprise rejoue en trop', () => {
    const partie = { day: 1 } as SyncPayload['game'];
    useStore.getState().applySync(sync([nuit(1), vote(null)], 2, { game: partie }));
    // La reprise rejoue depuis 1 : seul le 3 est neuf.
    useStore.getState().applySync(sync([vote(null), vote(3)], 3, { game: partie, replay: true }));
    expect(chronique().map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(chronique()[2]?.rejoue).toBe(true);
    expect(useStore.getState().dernierSeq).toBe(3);
  });

  it('un `sync` sans évènement garde le numéro qu’il annonce', () => {
    const partie = { day: 1 } as SyncPayload['game'];
    useStore.getState().applySync(sync([], 41, { game: partie }));
    expect(useStore.getState().dernierSeq).toBe(41);
  });

  it('repart de zéro quand le journal de la table a été refait', () => {
    const partie = { day: 1 } as SyncPayload['game'];
    useStore.getState().applySync(sync([nuit(1), vote(null)], 2, { game: partie }));
    useStore.getState().applySync(sync([vote(4)], 1, { game: partie }));
    expect(chronique().map((e) => e.seq)).toEqual([1, 2, 1]);
    expect(useStore.getState().dernierSeq).toBe(1);
  });

  it('une autre table repart d’une chronique vierge', () => {
    const partie = { day: 1 } as SyncPayload['game'];
    useStore.getState().applySync(sync([nuit(1)], 1, { game: partie }));
    useStore.getState().applySync(sync([vote(null)], 1, { game: partie, room: salle('AUTR') }));
    expect(chronique()).toEqual([{ type: 'vote', seq: 1, rejoue: undefined }]);
  });

  it('accepte encore un serveur sans numéros (protocole 1)', () => {
    const partie = { day: 1 } as SyncPayload['game'];
    const ancien = { room: salle(), game: partie, events: [vote(null)], serverNow: Date.now() } as unknown as SyncPayload;
    useStore.getState().applySync(ancien);
    useStore.getState().applySync(ancien);
    expect(chronique()).toHaveLength(2);
    expect(useStore.getState().dernierSeq).toBeNull();
  });
});

describe('l’horloge et la pause', () => {
  it('l’estimation du canal l’emporte sur le `serverNow` des `sync`', () => {
    useStore.getState().applySync(sync([], 0, { serverNow: Date.now() + 90_000 }));
    expect(useStore.getState().decalageHorloge).toBeGreaterThan(80_000);
    useStore.getState().setDecalageCanal(1_234);
    useStore.getState().applySync(sync([], 0, { serverNow: Date.now() + 90_000 }));
    expect(useStore.getState().decalageHorloge).toBe(1_234);
    // Quitter la table ne la perd pas : elle ne dépend pas de la table.
    useStore.getState().reset();
    expect(useStore.getState().decalageHorloge).toBe(1_234);
  });

  it('retient l’instant où la pause a été vue, et l’oublie à la reprise', () => {
    const debut = Date.now();
    useStore.getState().applySync(sync([], 0, { room: salle('LOUP', { paused: true }), serverNow: debut }));
    useStore.getState().applySync(sync([], 0, { room: salle('LOUP', { paused: true }), serverNow: debut + 5_000 }));
    expect(useStore.getState().pauseVue).toBe(debut);
    useStore.getState().applySync(sync([], 0, { serverNow: debut + 9_000 }));
    expect(useStore.getState().pauseVue).toBeNull();
  });
});

describe('le rattachement', () => {
  it('suspend les actions tant que la place n’est pas reprise', () => {
    expect(actionsSuspendues(useStore.getState())).toBe(false);
    for (const etat of ['perdu', 'reprise', 'echec'] as const) {
      useStore.getState().setRattachement(etat);
      expect(actionsSuspendues(useStore.getState())).toBe(true);
    }
    useStore.getState().reset();
    expect(useStore.getState().rattachement).toBe('rattache');
  });
});
