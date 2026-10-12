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
import { CRANS, Minuterie } from './Minuterie.js';

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

  it('sans échéance : le cadre vide, muet, exactement de la forme de la règle', () => {
    useStore.setState({ room: salle({}) });
    const vide = render(<Minuterie />);
    const cadre = screen.getByTestId('minuterie-cadre');
    expect(cadre).toHaveAttribute('aria-hidden', 'true');
    expect(cadre.className).toContain('h-6');
    expect(screen.queryByRole('timer')).toBeNull();
    // 24 crans en contour, aucun plein, et un tiret long à la place du chiffre.
    expect(cadre.querySelectorAll('rect')).toHaveLength(CRANS);
    expect(cadre.querySelector('[data-crans-pleins]')).toHaveAttribute('data-crans-pleins', '0');
    expect(cadre).toHaveTextContent('—');
    const classes = cadre.className;
    vide.unmount();

    // Une échéance en main : la règle prend exactement le cadre.
    const debut = Date.now();
    act(() => useStore.getState().applySync(sync(salle({ deadline: debut + 30_000, deadlineDurationMs: 60_000 }), debut)));
    render(<Minuterie />);
    const regle = screen.getByRole('timer');
    expect(regle.className).toBe(classes);
    expect(regle.querySelectorAll('rect')).toHaveLength(CRANS);
    expect(regle.querySelector('[data-crans-pleins]')).toHaveAttribute('data-crans-pleins', '12');
  });

  it('l’urgence se dit par la texture et le sablier retourné, jamais par une couleur', () => {
    const debut = Date.now();
    act(() => useStore.getState().applySync(sync(salle({ deadline: debut + 8_000, deadlineDurationMs: 60_000 }), debut)));
    render(<Minuterie />);
    const regle = screen.getByRole('timer');
    expect(regle).toHaveAttribute('data-urgence');
    const pleins = [...regle.querySelectorAll('rect')].filter((rect) => rect.getAttribute('fill')?.startsWith('url('));
    expect(pleins.length).toBeGreaterThan(0);
    expect(pleins.every((rect) => rect.getAttribute('fill') === 'url(#hach-x-e)')).toBe(true);
    expect(regle.innerHTML).not.toMatch(/sang|meute|#A23B24|#D9765A/i);
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
