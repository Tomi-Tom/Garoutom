/* @vitest-environment jsdom */
/**
 * La racine face au lien (D22) : la reprise de sa place à chaque connexion,
 * le bandeau qui distingue « liaison perdue » de « reprise de votre place »,
 * l'écran « partie ouverte dans un autre onglet », le hors-ligne immédiat,
 * l'horloge du canal.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type Channel, type RoomView, type SyncPayload } from '@garoutom/engine';

import { App } from './App.js';
import { inscrireCodeDansLUrl } from './lib/actions.js';
import { oublierMemoire, saveToken } from './lib/identity.js';
import { installeCanal } from './lib/socket.js';
import { useStore } from './lib/store.js';

/** Un canal de laboratoire : on lui fait dire ce qu'on veut, quand on veut. */
class CanalDouble {
  connected = false;
  clockOffset: number | null = null;
  private readonly ecoutes = new Map<string, Set<(valeur?: unknown) => void>>();
  readonly request = vi.fn();
  readonly wake = vi.fn();
  readonly connect = vi.fn(() => {
    this.ouvrir();
  });

  on(evenement: string, gestionnaire: (valeur?: unknown) => void): void {
    const ensemble = this.ecoutes.get(evenement) ?? new Set();
    ensemble.add(gestionnaire);
    this.ecoutes.set(evenement, ensemble);
  }

  off(evenement: string, gestionnaire: (valeur?: unknown) => void): void {
    this.ecoutes.get(evenement)?.delete(gestionnaire);
  }

  emettre(evenement: string, valeur?: unknown): void {
    for (const gestionnaire of [...(this.ecoutes.get(evenement) ?? [])]) gestionnaire(valeur);
  }

  ouvrir(): void {
    this.connected = true;
    this.emettre('connect');
  }

  couper(): void {
    this.connected = false;
    this.emettre('disconnect');
  }
}

function salon(): RoomView {
  return {
    code: 'BRUM',
    status: 'lobby',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: [
      { id: 'p0', name: 'Anna', seat: 0, connected: true, isHost: true, disconnectedUntil: null, absent: false },
    ],
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

const sync = (): SyncPayload => ({ room: salon(), game: null, events: [], seq: 0, serverNow: Date.now() });

let canal: CanalDouble;

beforeEach(() => {
  localStorage.clear();
  oublierMemoire();
  inscrireCodeDansLUrl(null);
  useStore.setState({
    connected: false,
    horsLigne: false,
    rattachement: 'rattache',
    remplace: false,
    room: null,
    game: null,
    playerId: null,
    notices: [],
    live: null,
    chronique: [],
    dernierSeq: null,
    decalageHorloge: null,
    horlogeCanal: false,
  });
  canal = new CanalDouble();
  installeCanal(() => canal as unknown as Channel);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<App /> — le lien', () => {
  it('reprend sa place à la connexion, et le dit tant qu’elle n’est pas rendue', async () => {
    saveToken('BRUM', 'jeton');
    inscrireCodeDansLUrl('BRUM');
    let rendre: (valeur: unknown) => void = () => undefined;
    canal.request.mockReturnValueOnce(new Promise((resolve) => (rendre = resolve)));
    render(<App />);

    act(() => canal.ouvrir());
    expect(canal.request).toHaveBeenCalledWith('room:join', { code: 'BRUM', name: '', token: 'jeton', lastSeq: 0 });
    expect(screen.getByTestId('bandeau-lien')).toHaveTextContent('Reprise de votre place…');

    await act(async () => {
      rendre({ code: 'BRUM', playerId: 'p0', token: 'jeton' });
      canal.emettre('sync', sync());
    });
    await waitFor(() => expect(screen.queryByTestId('bandeau-lien')).toBeNull());
    expect(useStore.getState().rattachement).toBe('rattache');
  });

  it('une coupure à table : liaison perdue, écran grisé, puis reprise au retour', async () => {
    saveToken('BRUM', 'jeton');
    inscrireCodeDansLUrl('BRUM');
    canal.request.mockResolvedValue({ code: 'BRUM', playerId: 'p0', token: 'jeton' });
    const { container } = render(<App />);
    act(() => canal.ouvrir());
    await act(async () => canal.emettre('sync', sync()));
    await waitFor(() => expect(useStore.getState().rattachement).toBe('rattache'));

    act(() => canal.couper());
    expect(screen.getByTestId('bandeau-lien')).toHaveTextContent('Liaison perdue');
    expect(container.querySelector('[data-suspendu]')).not.toBeNull();

    act(() => canal.ouvrir());
    await waitFor(() => expect(canal.request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelector('[data-suspendu]')).toBeNull());
  });

  it('partie ouverte dans un autre onglet : rien de tout seul, « Reprendre ici » relance', async () => {
    saveToken('BRUM', 'jeton');
    inscrireCodeDansLUrl('BRUM');
    canal.request.mockResolvedValue({ code: 'BRUM', playerId: 'p0', token: 'jeton' });
    const utilisateur = userEvent.setup();
    render(<App />);
    act(() => canal.ouvrir());
    await act(async () => canal.emettre('sync', sync()));

    act(() => {
      canal.couper();
      canal.emettre('replaced');
    });
    expect(screen.getByRole('dialog', { name: 'Partie ouverte dans un autre onglet' })).toBeInTheDocument();
    expect(canal.connect).not.toHaveBeenCalled();

    await utilisateur.click(screen.getByRole('button', { name: 'Reprendre ici' }));
    expect(canal.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('autre-onglet')).toBeNull();
    await waitFor(() => expect(canal.request).toHaveBeenCalledTimes(2));
  });

  it('hors ligne : le bandeau tout de suite ; en ligne : le canal réveillé', async () => {
    render(<App />);
    act(() => canal.ouvrir());
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByTestId('bandeau-lien')).toHaveTextContent('Hors ligne');
    act(() => void window.dispatchEvent(new Event('online')));
    expect(canal.wake).toHaveBeenCalled();
    expect(useStore.getState().horsLigne).toBe(false);
    await waitFor(() => expect(screen.queryByText(/Hors ligne/)).toBeNull());
  });

  it('table disparue (fermeture 4002) : retour à l’accueil, jeton oublié, avis', async () => {
    saveToken('BRUM', 'jeton');
    canal.request.mockResolvedValue({ code: 'BRUM', playerId: 'p0', token: 'jeton' });
    render(<App />);
    act(() => canal.ouvrir());
    await act(async () => canal.emettre('sync', sync()));
    act(() => {
      canal.couper();
      canal.emettre('gone');
    });
    expect(useStore.getState().room).toBeNull();
    expect(useStore.getState().notices.at(-1)?.message).toBe('La table a disparu.');
    expect(localStorage.getItem('garoutom.jetons')).toBe('{}');
  });

  it('prend l’horloge du canal', () => {
    render(<App />);
    act(() => canal.emettre('clock', 4_200));
    expect(useStore.getState().decalageHorloge).toBe(4_200);
    expect(useStore.getState().horlogeCanal).toBe(true);
  });
});
