/* @vitest-environment jsdom */
/**
 * La fin en portfolio (SPEC Caprices § 5.15) : le verdict dans sa cuvette
 * avec le cartouche du vainqueur, les petites cartes et leur sort, la nuit
 * racontée en planches numérotées (repliables, et une à une en plein écran),
 * et les actions de la collection dans leur ordre.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAction,
  createGame,
  createSeededRng,
  DEFAULT_OPTIONS,
  viewFor,
  type GameState,
  type RoomView,
} from '@garoutom/engine';

import { useStore } from '../../lib/store.js';
import { Fin } from './Fin.js';

const { revanche, quitterTable } = vi.hoisted(() => ({
  revanche: vi.fn(() => Promise.resolve(null)),
  quitterTable: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../lib/actions.js', () => ({ revanche, quitterTable }));

const large = vi.hoisted(() => ({ valeur: false }));
vi.mock('../useEstLarge.js', () => ({ useEstLarge: () => large.valeur }));

const JOUEURS = 6;

/**
 * Six joueurs, un loup : la meute dévore un villageois la nuit 1, le village
 * pend le loup au jour 1. Le village gagne.
 */
function partie(): { state: GameState; loup: number; victime: number } {
  const rng = createSeededRng(4);
  const options = { ...DEFAULT_OPTIONS, auto: false, loups: 1, roles: [], capitaine: false };
  let state = createGame({ players: JOUEURS, options }, rng).state;
  const agir = (seat: number, action: Parameters<typeof applyAction>[1]) => {
    state = applyAction(state, action, rng, seat).state;
  };
  for (const joueur of state.players) agir(joueur.seat, { type: 'pret' });
  const loup = state.players.find((p) => p.role === 'loup')!.seat;
  const victime = state.players.find((p) => p.role !== 'loup')!.seat;
  agir(loup, { type: 'devorer', target: victime });
  const vivants = state.players.filter((p) => p.alive);
  const autre = vivants.find((p) => p.seat !== loup)!.seat;
  for (const joueur of vivants) agir(joueur.seat, { type: 'voter', target: joueur.seat === loup ? autre : loup });
  expect(state.over && state.winner).toBe('village');
  return { state, loup, victime };
}

function salle(): RoomView {
  return {
    code: 'TEST',
    status: 'finished',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: Array.from({ length: JOUEURS }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: `Joueur ${String(seat)}`,
      seat,
      connected: true,
      isHost: seat === 0,
      disconnectedUntil: null,
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

function poser(state: GameState, siege: number | null): void {
  useStore.getState().applySync({ room: salle(), game: viewFor(state, siege), events: [], seq: 0, serverNow: Date.now() });
  useStore.setState({ playerId: siege === null ? null : `p${String(siege)}` });
}

describe('<Fin /> — le portfolio', () => {
  const { state, loup, victime } = partie();
  const villageois = state.players.find((p) => p.role !== 'loup' && p.seat !== victime && p.seat !== 0)!.seat;

  beforeEach(() => {
    large.valeur = false;
    revanche.mockClear();
    quitterTable.mockClear();
    useStore.getState().reset();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('le verdict : « Il est l’heure. », le cartouche du vainqueur, le sort du siège', () => {
    poser(state, villageois);
    render(<Fin />);
    const verdict = screen.getByRole('heading', { level: 1 }).closest('section')!;
    expect(within(verdict).getByText('« Il est l’heure. »')).toBeInTheDocument();
    const cartouche = verdict.querySelector('[data-vainqueur]');
    expect(cartouche).toHaveAttribute('data-vainqueur', 'village');
    expect(cartouche).toHaveTextContent('Le village');
    expect(within(verdict).getByText('Jour 1')).toBeInTheDocument();
    // Annoncé aux lecteurs d'écran, sans capitales à l'écran.
    expect(within(verdict).getByRole('status')).toHaveTextContent('Vous avez gagné · Jour 1');
    expect(document.body.textContent).not.toMatch(/GAGNÉ|PERDU/);
  });

  it('les petites cartes : le sort de chacun, et les gagnants en double filet', () => {
    poser(state, villageois);
    render(<Fin />);
    const cartes = screen.getByRole('heading', { name: 'Les cartes retournées' }).closest('section')!;
    const ligne = (seat: number) => within(cartes).getByText(`Joueur ${String(seat)}`).closest('li')!;

    expect(within(ligne(victime)).getByText('dévoré·e nuit 1')).toBeInTheDocument();
    expect(within(ligne(loup)).getByText('exécuté·e jour 1')).toBeInTheDocument();
    expect(within(ligne(villageois)).getByText('vous · en vie à la fin')).toBeInTheDocument();
    expect(ligne(villageois).querySelector('[data-double-filet]')).not.toBeNull();
    expect(ligne(loup).querySelector('[data-double-filet]')).toBeNull();
    expect(cartes.querySelectorAll('[data-double-filet]')).toHaveLength(JOUEURS - 1);
  });

  it('la nuit racontée : des planches numérotées, légendées, la dernière du récit ouverte', () => {
    poser(state, villageois);
    render(<Fin />);
    const recit = screen.getByRole('heading', { name: 'La nuit racontée' }).closest('section')!;

    expect(within(recit).getByText('3 planches')).toBeInTheDocument();
    const nuit = within(recit).getByRole('button', { name: /^Pl\. 1/ });
    const jour = within(recit).getByRole('button', { name: /^Pl\. 2/ });
    const fin = within(recit).getByRole('button', { name: /^Pl\. 3/ });
    expect(nuit).toHaveAttribute('aria-expanded', 'false');
    expect(jour).toHaveAttribute('aria-expanded', 'true');
    expect(fin).toHaveAttribute('aria-expanded', 'true');
    // Repliée, la planche dit encore son titre et sa légende.
    expect(nuit).toHaveTextContent('Pl. 1 — Nuit 1');
    expect(nuit).toHaveTextContent('« Personne ne nous a vus. »');
    expect(within(recit).getAllByText('« Pour une fois. »').length).toBeGreaterThan(0);
    expect(fin).toHaveTextContent('Pl. 3 — La fin');
    expect(within(recit).getAllByText('« Il est l’heure. »').length).toBeGreaterThan(0);

    fireEvent.click(nuit);
    expect(nuit).toHaveAttribute('aria-expanded', 'true');

    // Le nom d'un rôle de la meute s'écrit à la sanguine, au mot.
    const sanguine = within(recit).getByText('Loup-garou', { selector: 'b' });
    expect(sanguine).toHaveClass('text-meute');
  });

  it('une planche en plein écran, et l’on va de l’une à l’autre', () => {
    poser(state, villageois);
    render(<Fin />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir la planche 2 en plein écran' }));

    const planche = screen.getByRole('dialog', { name: 'Pl. 2 — Jour 1' });
    expect(within(planche).getByText('2 sur 3')).toBeInTheDocument();
    expect(within(planche).getByRole('img', { name: 'Vignette : la potence' })).toBeInTheDocument();
    expect(within(planche).getByRole('button', { name: 'Refermer' })).toHaveFocus();

    fireEvent.click(within(planche).getByRole('button', { name: 'Planche précédente : Pl. 1' }));
    expect(screen.getByRole('dialog', { name: 'Pl. 1 — Nuit 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aucune planche avant' })).toBeDisabled();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByRole('dialog', { name: 'Pl. 3 — La fin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aucune planche après' })).toBeDisabled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mobile : Rejouer et Quitter sous le pouce, L’arcade et Partager dans la cuvette', async () => {
    const ecrire = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: ecrire } });
    poser(state, 0);
    render(<Fin />);

    const barre = screen.getByRole('group', { name: 'Votre action' });
    expect(within(barre).getAllByRole('button').map((b) => b.textContent)).toEqual(['Quitter la table', 'Rejouer']);
    fireEvent.click(within(barre).getByRole('button', { name: 'Rejouer' }));
    expect(revanche).toHaveBeenCalledTimes(1);

    const portes = screen.getByRole('navigation', { name: 'La collection' });
    expect(within(portes).getByRole('link', { name: 'L’arcade' })).toHaveAttribute('href', 'https://arcade.tombp.fr/#TBP-012');
    await act(async () => {
      fireEvent.click(within(portes).getByRole('button', { name: 'Partager' }));
      await Promise.resolve();
    });
    expect(ecrire).toHaveBeenCalledWith(expect.stringContaining('GAGNÉ · Jour 1'));
    expect(within(portes).getByRole('button', { name: 'Copié' })).toBeInTheDocument();
  });

  it('desktop : les quatre actions au pied du verdict, dans l’ordre de la collection', () => {
    large.valeur = true;
    poser(state, 0);
    render(<Fin />);
    const actions = screen.getByRole('navigation', { name: 'Fin de partie' });
    expect([...actions.querySelectorAll('button, a')].map((a) => a.textContent)).toEqual([
      'Rejouer',
      'L’arcade',
      'Partager',
      'Quitter la table',
    ]);
    expect(screen.queryByRole('group', { name: 'Votre action' })).toBeNull();
    // Toutes les planches ouvertes, chacune dans sa cuvette.
    expect(document.querySelectorAll('[data-planche] .cuvette')).toHaveLength(3);
  });
});
