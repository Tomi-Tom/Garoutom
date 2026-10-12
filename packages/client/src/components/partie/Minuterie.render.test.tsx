/* @vitest-environment jsdom */
/**
 * La minuterie : un cadre de hauteur fixe, plein ou vide (D23), et un temps
 * figé quand la table attend son village (D19).
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type RoomView, type SyncPayload } from '@garoutom/engine';

import { Partie } from '../../screens/Partie.js';
import { useStore } from '../../lib/store.js';
import { installe, nouvellePartie, salle as salleDuBanc, tousPrets } from './nuit/banc.js';
import { Minuterie } from './Minuterie.js';

function salle(ecarts: Partial<RoomView>): RoomView {
  return {
    code: 'LOUP',
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

function sync(room: RoomView, serverNow: number): SyncPayload {
  return { room, game: null, events: [], seq: 0, serverNow };
}

describe('<Minuterie />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ room: null, game: null, pauseVue: null, decalageHorloge: null, horlogeCanal: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sans échéance : un cadre vide, muet, de la même forme', () => {
    useStore.setState({ room: salle({}) });
    render(<Minuterie />);
    const cadre = screen.getByTestId('minuterie-cadre');
    expect(cadre).toBeEmptyDOMElement();
    expect(cadre).toHaveAttribute('aria-hidden', 'true');
    expect(cadre.className).toContain('h-5');
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('se fige quand la table attend son village, et repart à la reprise', () => {
    const debut = Date.now();
    const echeance = { deadline: debut + 30_000, deadlineDurationMs: 60_000 };
    act(() => useStore.getState().applySync(sync(salle({ ...echeance, paused: true }), debut)));
    render(<Minuterie />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps suspendu : 0:30');
    expect(screen.getByRole('timer')).toHaveAttribute('data-figee');

    act(() => void vi.advanceTimersByTime(20_000));
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps suspendu : 0:30');

    // La pause levée, l'échéance a été décalée d'autant par le serveur.
    act(() =>
      useStore
        .getState()
        .applySync(sync(salle({ ...echeance, deadline: echeance.deadline + 20_000 }), Date.now())),
    );
    act(() => void vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Temps restant : 0:25');
    expect(screen.getByRole('timer')).not.toHaveAttribute('data-figee');
  });
});

describe('<Partie /> — la pause', () => {
  it('dit à tous que la partie attend son village', () => {
    const banc = nouvellePartie();
    tousPrets(banc);
    installe(banc, 0);
    const room = { ...salleDuBanc(banc.nombre), paused: true };
    useStore.setState({ room });
    render(<Partie room={room} />);
    expect(screen.getByTestId('pause')).toHaveTextContent('La partie attend son village');
  });
});
