/* @vitest-environment jsdom */
/**
 * L'habit Caprices du fil (SPEC § 5.10) : la forme, le mot et la teinte de
 * chaque canal, le filet de marge, la saisie, les trois modes — dont le
 * tiroir que compose le gabarit (`etendue` = `filOuvert`).
 */
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

function etat(phase: Phase): GameState {
  const { state } = createGame({ players: JOUEURS, options: DEFAULT_OPTIONS }, createSeededRng(7));
  return { ...state, phase, day: 1 };
}

function siegeDe(state: GameState, loup: boolean): number {
  const siege = state.players.find((p) => (p.role === 'loup') === loup);
  if (!siege) throw new Error('rôle introuvable');
  return siege.seat;
}

function dire(state: GameState, seat: number, channel: 'village' | 'loups' | 'morts', text: string): GameState {
  return applyAction(state, { type: 'dire', channel, text }, createSeededRng(1), seat).state;
}

function poser(state: GameState, seat: number): void {
  useStore.setState({ room: salle(), playerId: `p${String(seat)}`, game: viewFor(state, seat) });
}

const JOUR: Phase = { kind: 'jour', votes: {} };
const NUIT: Phase = { kind: 'nuit', step: 'principale', acted: [] };

describe('<Fil /> — l’habit Caprices', () => {
  beforeEach(() => {
    jouer.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('chaque onglet est un cartouche dont la forme dit le canal, le mot restant écrit', () => {
    const nuit = etat(NUIT);
    poser(nuit, siegeDe(nuit, true));
    const { container } = render(<Fil mode="colonne" />);
    const village = screen.getByRole('tab', { name: /village/i });
    const meute = screen.getByRole('tab', { name: /meute/i });
    expect(village).toHaveAttribute('data-forme', 'ecu');
    expect(meute).toHaveAttribute('data-forme', 'mordu');
    expect(village.querySelector('.cartouche')).toHaveAttribute('data-forme', 'ecu');
    expect(meute.querySelector('.cartouche')).toHaveAttribute('data-forme', 'mordu');
    expect(meute).toHaveTextContent(/meute/i);
    for (const onglet of container.querySelectorAll('[role="tab"]')) expect(onglet.className).toContain('min-h-11');
  });

  it('la meute a son filet dentelé et son indication de saisie ; le village, le filet droit', async () => {
    let nuit = etat(NUIT);
    const loup = siegeDe(nuit, true);
    const autre = nuit.players.find((p) => p.role === 'loup' && p.seat !== loup)?.seat ?? loup;
    nuit = dire(nuit, autre, 'loups', 'on prend le boulanger');
    poser(nuit, loup);
    render(<Fil mode="colonne" />);

    await userEvent.click(screen.getByRole('tab', { name: /meute/i }));
    expect(screen.getByRole('textbox', { name: 'Votre message' })).toHaveAttribute('placeholder', 'Parler à la meute…');
    const log = screen.getByRole('log');
    expect(log.querySelector('[data-filet="dentele"]')).not.toBeNull();
    // Pas de bulle : le message est un paragraphe nu, sans fond ni bordure.
    const style = within(log).getByText('on prend le boulanger').getAttribute('style') ?? '';
    expect(style).not.toMatch(/background|border/);
  });

  it('la craie de la meute ne fait ni fond ni bordure de zone (N2)', async () => {
    const nuit = etat(NUIT);
    poser(nuit, siegeDe(nuit, true));
    const { container } = render(<Fil mode="colonne" />);
    await userEvent.click(screen.getByRole('tab', { name: /meute/i }));
    const zones = container.querySelectorAll<HTMLElement>('section, [role="tablist"], [role="tabpanel"], [role="log"], form');
    for (const el of zones) expect(el.getAttribute('style') ?? '').not.toMatch(/canal-meute/);
  });

  it('le village trace un filet droit, l’au-delà un filet pointillé et parle en italique', async () => {
    let jour = etat(JOUR);
    const mort = siegeDe(jour, false);
    const vivant = jour.players.find((p) => p.seat !== mort)!.seat;
    jour = dire(jour, vivant, 'village', 'bonjour');
    jour = { ...jour, players: jour.players.map((p) => (p.seat === mort ? { ...p, alive: false } : p)) };
    jour = dire(jour, mort, 'morts', 'trop tard');
    poser(jour, mort);
    render(<Fil mode="colonne" />);

    expect(screen.getByRole('log').querySelector('[data-filet="droit"]')).not.toBeNull();
    const audela = screen.getByRole('tab', { name: /au-delà/i });
    expect(audela).toHaveAttribute('data-forme', 'bruni');
    await userEvent.click(audela);
    const log = screen.getByRole('log');
    expect(log.querySelector('[data-filet="pointille"]')).not.toBeNull();
    expect(within(log).getByText('trop tard').className).toContain('italic');
    expect(screen.getByRole('textbox', { name: 'Votre message' })).toHaveAttribute(
      'placeholder',
      'Commenter d’outre-tombe…',
    );
  });

  it('composé par le gabarit : fermé il se tait mais compte, au tiers il se lit, plein il épingle le résumé', async () => {
    let jour = etat(JOUR);
    const moi = siegeDe(jour, false);
    const autre = jour.players.find((p) => p.seat !== moi)!.seat;
    poser(jour, moi);
    const surNonLus = vi.fn();
    const surEtendre = vi.fn();
    const resume = <span>Votre voix : Anna</span>;
    const { rerender } = render(
      <Fil mode="tiroir" etendue="ferme" onNonLus={surNonLus} onEtendre={surEtendre} resume={resume} />,
    );
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByRole('button', { name: /Discussion/ })).toBeNull();

    jour = dire(dire(jour, autre, 'village', 'un'), autre, 'village', 'deux');
    act(() => poser(jour, moi));
    expect(surNonLus).toHaveBeenLastCalledWith(2);

    rerender(<Fil mode="tiroir" etendue="tiers" onNonLus={surNonLus} onEtendre={surEtendre} resume={resume} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(surNonLus).toHaveBeenLastCalledWith(0);
    expect(screen.queryByTestId('fil-resume')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Fil en plein écran' }));
    expect(surEtendre).toHaveBeenLastCalledWith('plein');
    await userEvent.click(screen.getByRole('button', { name: 'Refermer le fil' }));
    expect(surEtendre).toHaveBeenLastCalledWith('ferme');

    rerender(<Fil mode="tiroir" etendue="plein" onNonLus={surNonLus} onEtendre={surEtendre} resume={resume} />);
    expect(screen.getByTestId('fil-resume')).toHaveTextContent('Votre voix : Anna');
    expect(screen.getByRole('button', { name: 'Réduire le fil' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('en colonne, le résumé du vote est épinglé au-dessus des onglets', () => {
    const jour = etat(JOUR);
    poser(jour, siegeDe(jour, false));
    render(<Fil mode="colonne" resume="Votre voix : Anna · 6 sur 10" />);
    expect(screen.getByRole('textbox', { name: 'Votre message' })).toHaveAttribute('placeholder', 'Parler au village…');
    const resume = screen.getByTestId('fil-resume');
    const onglets = screen.getByRole('tablist');
    expect(resume.compareDocumentPosition(onglets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('le mode intégré se limite aux canaux demandés', () => {
    const nuit = etat(NUIT);
    poser(nuit, siegeDe(nuit, true));
    render(<Fil mode="integre" canaux={['loups']} />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /meute/i })).toBeInTheDocument();
  });
});
