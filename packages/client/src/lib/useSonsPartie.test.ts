import type { GameEvent, GameView } from '@garoutom/engine';
import { bruitages } from '@tombp/arcade';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { atelier } from './atelier.js';
import { type EvenementRecu, useStore } from './store.js';
import { useSonsPartie, verdictPour } from './useSonsPartie.js';

let compteur = 1000;
const recu = (event: GameEvent): EvenementRecu => ({ id: (compteur += 1), event, day: 1 });
const poser = (...events: GameEvent[]): void => {
  act(() => {
    useStore.setState((s) => ({ chronique: [...s.chronique, ...events.map(recu)] }));
  });
};

const mort = { seat: 1, cause: 'loups' } as never;

function partie(extra: Partial<GameView> = {}): GameView {
  return {
    you: { seat: 0, role: 'loup', alive: true, canVote: true },
    options: { skin: 'thiercelieux' },
    phase: 'jour',
    step: null,
    day: 1,
    players: [
      { seat: 0, alive: true, role: 'loup', canVote: true, isCaptain: false, isLover: false },
      { seat: 1, alive: true, role: null, canVote: true, isCaptain: false, isLover: false },
    ],
    captain: null,
    prompt: null,
    acted: false,
    voted: [],
    yourVote: null,
    pack: null,
    lover: null,
    inspections: [],
    chat: [],
    channels: [],
    over: false,
    winner: null,
    log: null,
    ...extra,
  } as unknown as GameView;
}

let spies: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ chronique: [], game: null, room: null });
  const rien = () => undefined;
  spies = {
    hurlement: vi.spyOn(atelier, 'hurlement').mockImplementation(rien),
    glas: vi.spyOn(atelier, 'glas').mockImplementation(rien),
    aube: vi.spyOn(atelier, 'aube').mockImplementation(rien),
    tic: vi.spyOn(atelier, 'tic').mockImplementation(rien),
    vote: vi.spyOn(atelier, 'vote').mockImplementation(rien),
    detonation: vi.spyOn(atelier, 'detonation').mockImplementation(rien),
    croassement: vi.spyOn(atelier, 'croassement').mockImplementation(rien),
    claque: vi.spyOn(bruitages, 'claque').mockImplementation(rien),
    cloche: vi.spyOn(bruitages, 'cloche').mockImplementation(rien),
    verdict: vi.spyOn(bruitages, 'verdict').mockImplementation(rien),
  } as unknown as typeof spies;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useSonsPartie', () => {
  it("ne rejoue pas l'historique présent au montage", () => {
    useStore.setState({
      chronique: [
        recu({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 }),
        recu({ type: 'morts', deaths: [mort] }),
      ],
    });
    renderHook(() => useSonsPartie());
    act(() => void vi.advanceTimersByTime(5000));
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it('ne sonne rien de ce que la reprise rejoue, mais suit l’heure (D22)', () => {
    renderHook(() => useSonsPartie());
    act(() => {
      useStore.setState((s) => ({
        chronique: [
          ...s.chronique,
          ...[
            { type: 'phase', phase: 'nuit', step: 'principale', day: 2 } as GameEvent,
            { type: 'morts', deaths: [mort] } as GameEvent,
            { type: 'vote', tally: {}, executed: 1 } as GameEvent,
            { type: 'fin', winner: 'village' } as GameEvent,
          ].map((event) => ({ ...recu(event), rejoue: true as const })),
        ],
      }));
    });
    act(() => void vi.advanceTimersByTime(5000));
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();

    // La nuit rejouée est bien comptée : l'aube neuve qui suit sonne.
    poser({ type: 'phase', phase: 'jour', day: 2 });
    expect(spies.aube).toHaveBeenCalledTimes(1);
  });

  it('hurle à la tombée de la nuit, une fois', () => {
    const { rerender } = renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    expect(spies.hurlement).toHaveBeenCalledTimes(1);
    expect(spies.hurlement).toHaveBeenCalledWith('thiercelieux');
    rerender();
    expect(spies.hurlement).toHaveBeenCalledTimes(1);
  });

  it("ne hurle pas pour l'étape de la sorcière", () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'sorciere', day: 1 });
    expect(spies.hurlement).not.toHaveBeenCalled();
  });

  it("sonne le glas une seule fois pour plusieurs morts, puis l'aube décalée", () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    poser(
      { type: 'morts', deaths: [mort, { seat: 2, cause: 'poison' } as never] },
      { type: 'phase', phase: 'jour', day: 1 },
    );
    expect(spies.glas).toHaveBeenCalledTimes(1);
    expect(spies.aube).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1600));
    expect(spies.aube).toHaveBeenCalledTimes(1);
  });

  it("sonne l'aube une seule fois pour aube-paisible suivie du jour", () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    poser({ type: 'aube-paisible' }, { type: 'phase', phase: 'jour', day: 1 });
    expect(spies.aube).toHaveBeenCalledTimes(1);
    expect(spies.glas).not.toHaveBeenCalled();
  });

  it('vote, tir, capitaine et fin ont leur son ; le début se tait', () => {
    useStore.setState({ game: partie() });
    renderHook(() => useSonsPartie());
    poser({ type: 'debut' });
    expect(spies.claque).not.toHaveBeenCalled();
    poser({ type: 'vote', tally: {}, executed: null });
    expect(spies.claque).toHaveBeenCalledTimes(1);
    poser({ type: 'tir', hunter: 0, target: 1 });
    expect(spies.detonation).toHaveBeenCalledTimes(1);
    poser({ type: 'capitaine', seat: 0, from: null });
    expect(spies.cloche).toHaveBeenCalledTimes(1);
    poser({ type: 'fin', winner: 'loups' });
    expect(spies.verdict).toHaveBeenCalledWith('gagne');
  });

  it('ne fait aucun bruit pour un message de chat', () => {
    renderHook(() => useSonsPartie());
    act(() => {
      useStore.setState({
        game: partie({ chat: [{ id: 1, seat: 1, text: 'salut', channel: 'village' } as never] }),
      });
    });
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it('tic seulement dans les dix dernières secondes de sa minuterie', () => {
    vi.setSystemTime(100_000);
    const salon = (restant: number) =>
      ({ options: { skin: "thiercelieux" }, deadline: Date.now() + restant, deadlineDurationMs: 60_000 }) as never;
    act(() => useStore.setState({ room: salon(30_000) }));
    renderHook(() => useSonsPartie());
    expect(spies.tic).not.toHaveBeenCalled();
    act(() => useStore.setState({ room: salon(9_500) }));
    expect(spies.tic).toHaveBeenCalledTimes(1);
  });

  it('la rancune de l’Ancien sonne un second glas, après celui de sa mort, avant la cloche du matin', () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    poser(
      { type: 'morts', deaths: [mort] },
      { type: 'rancune', seat: 1 },
      { type: 'phase', phase: 'jour', day: 1 },
    );
    expect(spies.glas).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1500));
    expect(spies.glas).toHaveBeenCalledTimes(2);
    expect(spies.aube).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1500));
    expect(spies.aube).toHaveBeenCalledTimes(1);
  });

  it('le Bouc émissaire : une seconde claque, puis un seul glas pour sa mort', () => {
    renderHook(() => useSonsPartie());
    poser(
      { type: 'vote', tally: { 1: 1, 2: 1 }, executed: null },
      { type: 'bouc', seat: 3 },
      { type: 'morts', deaths: [{ seat: 3, cause: 'vote' } as never] },
      { type: 'phase', phase: 'bouc', day: 1 },
    );
    expect(spies.claque).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(400));
    expect(spies.claque).toHaveBeenCalledTimes(2);
    expect(spies.glas).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(400));
    expect(spies.glas).toHaveBeenCalledTimes(1);
    // Le dernier mot se lit, il ne sonne pas.
    poser({ type: 'votants', bouc: 3, seats: [1] });
    act(() => void vi.advanceTimersByTime(5000));
    expect(spies.glas).toHaveBeenCalledTimes(1);
    expect(spies.claque).toHaveBeenCalledTimes(2);
  });

  it('la marque du Corbeau croasse à l’aube, sans couvrir la cloche du matin', () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    poser({ type: 'aube-paisible' }, { type: 'corbeau', target: 2 }, { type: 'phase', phase: 'jour', day: 1 });
    // L'aube paisible sonne d'abord ; le croassement attend la fin de la cloche.
    expect(spies.aube).toHaveBeenCalledTimes(1);
    expect(spies.croassement).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(900));
    expect(spies.croassement).toHaveBeenCalledTimes(1);
  });

  it('après les morts de l’aube, le glas, puis le Corbeau, puis la cloche', () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
    poser({ type: 'morts', deaths: [mort] }, { type: 'corbeau', target: 2 }, { type: 'phase', phase: 'jour', day: 1 });
    expect(spies.glas).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1500));
    expect(spies.croassement).toHaveBeenCalledTimes(1);
    expect(spies.aube).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(600));
    expect(spies.aube).toHaveBeenCalledTimes(1);
  });

  it('les étapes du Loup Blanc et de la Sorcière ne hurlent pas', () => {
    renderHook(() => useSonsPartie());
    poser({ type: 'phase', phase: 'nuit', step: 'loupBlanc', day: 2 });
    poser({ type: 'phase', phase: 'nuit', step: 'sorciere', day: 2 });
    expect(spies.hurlement).not.toHaveBeenCalled();
  });

  it('la fin du Loup Blanc sonne par faction', () => {
    useStore.setState({ game: partie({ you: { seat: 0, role: 'loupBlanc', alive: true, canVote: true } }) });
    renderHook(() => useSonsPartie());
    poser({ type: 'fin', winner: 'loupBlanc' });
    expect(spies.verdict).toHaveBeenLastCalledWith('gagne');
  });
});

describe('verdictPour', () => {
  it('juge par faction : le Loup Blanc chasse avec la meute, mais ne gagne que seul', () => {
    const blanc = partie({ you: { seat: 0, role: 'loupBlanc', alive: true, canVote: true } });
    expect(verdictPour(blanc, 'loupBlanc')).toBe('gagne');
    expect(verdictPour(blanc, 'loups')).toBe('perdu');
    expect(verdictPour(blanc, 'village')).toBe('perdu');
    expect(verdictPour(partie(), 'loupBlanc')).toBe('perdu');
    const ancien = partie({ you: { seat: 0, role: 'ancien', alive: true, canVote: true } });
    expect(verdictPour(ancien, 'village')).toBe('gagne');
    expect(verdictPour(ancien, 'loupBlanc')).toBe('perdu');
  });

  it('colore la fin selon le camp du siège', () => {
    expect(verdictPour(partie(), 'loups')).toBe('gagne');
    expect(verdictPour(partie(), 'village')).toBe('perdu');
    expect(verdictPour(partie(), 'personne')).toBe('neutre');
    expect(verdictPour(null, 'loups')).toBe('neutre');
    expect(verdictPour(partie({ you: null }), 'village')).toBe('neutre');
    expect(verdictPour(partie(), 'amoureux')).toBe('perdu');
    const amoureuse = partie();
    const moi = amoureuse.players[0];
    if (moi) moi.isLover = true;
    expect(verdictPour(amoureuse, 'amoureux')).toBe('gagne');
  });
});
