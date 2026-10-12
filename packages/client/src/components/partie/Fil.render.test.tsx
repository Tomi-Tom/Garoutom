/* @vitest-environment jsdom */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAction,
  createGame,
  createSeededRng,
  DEFAULT_OPTIONS,
  viewFor,
  type GameState,
  type Phase,
  type RoomView,
} from '@garoutom/engine';

import { useStore } from '../../lib/store.js';
import { Fil } from './Fil.js';

const jouer = vi.hoisted(() => vi.fn((_action: unknown) => Promise.resolve()));
vi.mock('../../lib/actions.js', () => ({ jouer }));

/* ------------------------------------------------------------------ */
/* La table simulée                                                    */
/* ------------------------------------------------------------------ */

const JOUEURS = 8;

function salle(): RoomView {
  return {
    code: 'TEST',
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: Array.from({ length: JOUEURS }, (_, seat) => ({
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
  } as RoomView;
}

/** Une partie à huit posée dans la phase voulue. */
function etat(phase: Phase): GameState {
  const { state } = createGame({ players: JOUEURS, options: DEFAULT_OPTIONS }, createSeededRng(7));
  return { ...state, phase, day: 1 };
}

function siegeDe(state: GameState, loup: boolean): number {
  const siege = state.players.find((p) => (p.role === 'loup') === loup);
  if (!siege) throw new Error('rôle introuvable');
  return siege.seat;
}

function dire(state: GameState, seat: number, channel: 'village' | 'loups', text: string): GameState {
  return applyAction(state, { type: 'dire', channel, text }, createSeededRng(1), seat).state;
}

function poser(state: GameState, seat: number): void {
  useStore.setState({
    room: salle(),
    playerId: `p${String(seat)}`,
    game: viewFor(state, seat),
  });
}

const JOUR: Phase = { kind: 'jour', votes: {} };
const NUIT: Phase = { kind: 'nuit', step: 'principale', acted: [] };

describe('<Fil />', () => {
  beforeEach(() => {
    jouer.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('ne rend rien hors partie', () => {
    const { container } = render(<Fil mode="colonne" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('un villageois ne voit pas la meute, un loup si', () => {
    const jour = etat(JOUR);
    const villageois = siegeDe(jour, false);
    poser(jour, villageois);
    const { unmount } = render(<Fil mode="colonne" />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.queryByRole('tab', { name: /meute/i })).toBeNull();
    unmount();

    const nuit = etat(NUIT);
    poser(nuit, siegeDe(nuit, true));
    render(<Fil mode="colonne" />);
    expect(screen.getAllByRole('tab').length).toBeGreaterThanOrEqual(2);
  });

  it('le journal est un log muet, sans annonce vocale', () => {
    const jour = etat(JOUR);
    poser(jour, siegeDe(jour, false));
    render(<Fil mode="colonne" />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
  });

  it('envoie le message au canal de l’onglet actif', async () => {
    const jour = etat(JOUR);
    poser(jour, siegeDe(jour, false));
    render(<Fil mode="colonne" />);

    const champ = screen.getByRole('textbox', { name: 'Votre message' });
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    await userEvent.type(champ, 'Je suis le simple villageois{Enter}');

    expect(jouer).toHaveBeenCalledWith({
      type: 'dire',
      channel: 'village',
      text: 'Je suis le simple villageois',
    });
    expect(champ).toHaveValue('');
  });

  it('garde le texte si le serveur refuse', async () => {
    jouer.mockImplementationOnce(() => {
      useStore.getState().pushNotice('Vous ne pouvez pas parler ici', 'error');
      return Promise.resolve();
    });
    const jour = etat(JOUR);
    poser(jour, siegeDe(jour, false));
    render(<Fil mode="colonne" />);

    const champ = screen.getByRole('textbox', { name: 'Votre message' });
    await userEvent.type(champ, 'bonjour{Enter}');
    expect(champ).toHaveValue('bonjour');
  });

  it('la nuit, le village se tait et la saisie disparaît', () => {
    const nuit = etat(NUIT);
    poser(nuit, siegeDe(nuit, false));
    render(<Fil mode="colonne" />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByTestId('silence')).toHaveTextContent('Le village se tait la nuit.');
  });

  it('sans chat, le village renvoie à la voix haute', () => {
    const { state } = createGame(
      { players: JOUEURS, options: { ...DEFAULT_OPTIONS, chat: false } },
      createSeededRng(7),
    );
    poser({ ...state, phase: JOUR, day: 1 }, 0);
    render(<Fil mode="colonne" />);
    expect(screen.getAllByText(/parlez à voix haute/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('groupe les messages d’un même auteur et marque les siens', () => {
    let jour = etat(JOUR);
    const moi = siegeDe(jour, false);
    const autre = jour.players.find((p) => p.seat !== moi)!.seat;
    jour = dire(jour, autre, 'village', 'un');
    jour = dire(jour, autre, 'village', 'deux');
    jour = dire(jour, moi, 'village', 'trois');
    poser(jour, moi);
    render(<Fil mode="colonne" />);

    const log = screen.getByRole('log');
    expect(within(log).getAllByText(`Joueur ${String(autre)}`)).toHaveLength(1);
    expect(within(log).getByText('vous')).toBeInTheDocument();
    expect(within(log).getByText('Jour 1')).toBeInTheDocument();
  });

  it('le tiroir est replié, compte les non-lus, puis les efface à l’ouverture', async () => {
    let jour = etat(JOUR);
    const moi = siegeDe(jour, false);
    const autre = jour.players.find((p) => p.seat !== moi)!.seat;
    poser(jour, moi);
    render(<Fil mode="tiroir" />);

    const poignee = screen.getByRole('button', { name: /Discussion/ });
    expect(poignee).toHaveAttribute('aria-expanded', 'false');
    expect(poignee.className).toContain('min-h-11');
    expect(screen.queryByRole('log')).toBeNull();

    jour = dire(dire(jour, autre, 'village', 'psst'), autre, 'village', 'hého');
    act(() => poser(jour, moi));
    expect(screen.getByTestId('non-lus-total')).toHaveTextContent('2');

    await userEvent.click(poignee);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.queryByTestId('non-lus-total')).toBeNull();
  });

  it('le badge d’un onglet compte les messages d’un canal non affiché', () => {
    let nuit = etat(NUIT);
    const loup = siegeDe(nuit, true);
    poser(nuit, loup);
    render(<Fil mode="colonne" />);
    // L'onglet actif est le village : les loups parlent derrière lui.
    const autreLoup = nuit.players.find((p) => p.role === 'loup' && p.seat !== loup)?.seat ?? loup;
    nuit = dire(nuit, autreLoup, 'loups', 'on prend le boulanger');
    act(() => poser(nuit, loup));
    if (autreLoup !== loup) {
      expect(screen.getByTestId('non-lus-loups')).toHaveTextContent('1');
    }
  });
});
