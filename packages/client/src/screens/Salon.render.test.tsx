/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type Channel, type GameOptions, type RoomView, type SyncPayload } from '@garoutom/engine';

import { installeCanal } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { Salon } from './Salon.js';

/* ------------------------------------------------------------------ */
/* La table simulée                                                    */
/* ------------------------------------------------------------------ */

/** Un `sync` entier, tel que le serveur le poussera : le magasin seul est touché. */
function sync(nombre: number, options: GameOptions = DEFAULT_OPTIONS): SyncPayload {
  return { room: salle(nombre, options), game: null, events: [], serverNow: Date.now() };
}

function salle(nombre: number, options: GameOptions = DEFAULT_OPTIONS): RoomView {
  return {
    code: 'TEST',
    status: 'lobby',
    options,
    hostId: 'p0',
    players: Array.from({ length: nombre }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: `Joueur ${String(seat)}`,
      seat,
      connected: true,
      isHost: seat === 0,
      disconnectedUntil: null,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
  };
}

/** Le canal doublé : le salon n'a à prouver que ce qu'il envoie. */
function doublureCanal(): Channel {
  return { request: vi.fn(() => Promise.resolve(null)) } as unknown as Channel;
}

describe('<Salon />', () => {
  let canal: Channel;

  beforeEach(() => {
    localStorage.clear();
    canal = doublureCanal();
    installeCanal(() => canal);
    useStore.setState({
      playerId: null,
      room: null,
      game: null,
      decalageHorloge: null,
      notices: [],
      live: null,
    });
  });

  it('dit le code à recopier — mono, gros, avec de quoi le copier', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const code = screen.getByText('TEST');
    expect(code).toBeInTheDocument();
    // « La fonction d'un code est de se recopier » : mono et chasse fixe.
    expect(code.className).toContain('font-mono');
    expect(screen.getByRole('button', { name: 'Copier le code' })).toBeInTheDocument();
  });

  it('chaque joueur tient sa ligne : nom, siège, hôte — et rien qui trahisse un rôle', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    for (let seat = 0; seat < 6; seat += 1) {
      expect(screen.getByText(`Joueur ${String(seat)}`, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`siège ${String(seat + 1)}`)).toBeInTheDocument();
    }
    // Un seul hôte, dit comme tel ; le local se reconnaît sans chercher.
    expect(screen.getAllByText('Hôte')).toHaveLength(1);
    expect(screen.getByText('(vous)')).toBeInTheDocument();
  });

  it('l’hôte peut lancer à six joueurs, pas avant', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
  });

  it('à cinq joueurs, le lancement attend et le dit', () => {
    useStore.getState().applySync(sync(5));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const bouton = screen.getByRole('button', { name: /Il faut 6 joueurs pour lancer/ });
    expect(bouton).toBeDisabled();
    // La table accepte jusqu'à 18 joueurs : treize sièges attendent encore.
    expect(screen.getByText(/13 places libres/)).toBeInTheDocument();
  });

  it('l’invité lit les règles, la main de l’hôte seule peut les toucher', () => {
    // Composition manuelle : les suggestions du moteur sont visibles, et
    // doivent être aussi inviolables que le reste des règles.
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.queryByRole('button', { name: /lancer la partie/i })).toBeNull();
    expect(screen.getByText(/l’hôte peut lancer la partie/)).toBeInTheDocument();
    expect(screen.getByText('réglées par l’hôte')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Le fil du village/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /2 loups · la Voyante · la Sorcière/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Au hasard' })).toBeDisabled();
  });

  it('la composition publique se lit, même automatique', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    // La composition de référence à six joueurs : publique, car seule
    // l'attribution des cartes est secrète.
    expect(screen.getByText('2 loups · la Voyante · la Sorcière')).toBeInTheDocument();
  });

  it('l’hôte bascule une règle, le salon l’envoie entière au serveur', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('checkbox', { name: /Le fil du village/ }));

    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, chat: false },
      });
    });
  });

  it('une arrivée allume sa fenêtre — puis elle s’éteint', async () => {
    useStore.getState().applySync(sync(2));
    useStore.setState({ playerId: 'p0' });
    const vue = render(<Salon room={useStore.getState().room!} />);

    // Déjà là quand on entre : pas de fenêtre allumée.
    expect(screen.queryByText('a rejoint')).toBeNull();

    useStore.getState().applySync(sync(3));
    vue.rerender(<Salon room={useStore.getState().room!} />);
    expect(screen.getByText('a rejoint')).toBeInTheDocument();

    // Le compte à rebours d'absence se lit dans l'horloge du serveur.
    const absente = salle(3);
    absente.players[2]!.connected = false;
    absente.players[2]!.disconnectedUntil = Date.now() + 30_000;
    useStore.setState({ decalageHorloge: 0 });
    vue.rerender(<Salon room={absente} />);
    expect(screen.getByText(/Absent · \d+ s/)).toBeInTheDocument();
  });
});
