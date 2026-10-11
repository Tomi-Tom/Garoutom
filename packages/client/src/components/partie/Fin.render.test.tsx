/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAction,
  createGame,
  createSeededRng,
  DEFAULT_OPTIONS,
  timeoutPhase,
  viewFor,
  type Action,
  type GameState,
  type RoomView,
} from '@garoutom/engine';

import { useStore } from '../../lib/store.js';
import { Fin } from './Fin.js';
import { decouperLog } from './fin/recit.js';

const { revanche, quitterTable } = vi.hoisted(() => ({
  revanche: vi.fn(() => Promise.resolve(null)),
  quitterTable: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../lib/actions.js', () => ({ revanche, quitterTable }));

/* ------------------------------------------------------------------ */
/* Une partie jouée jusqu'au bout par le moteur                        */
/* ------------------------------------------------------------------ */

const JOUEURS = 7;

/**
 * Joue la partie en suivant les consignes de chaque siège (`prompt` de la
 * vue), comme le ferait un robot : les loups dévorent un non-loup, et le
 * village vote soit contre la meute (`village`), soit les loups contre le
 * village (`loups`). Le moteur seul tranche, la minuterie débloque le reste.
 */
function jouerJusquaLaFin(issue: 'village' | 'loups', graine: number): GameState {
  const rng = createSeededRng(graine);
  const options = {
    ...DEFAULT_OPTIONS,
    auto: false,
    loups: 2,
    roles: ['voyante', 'sorciere', 'chasseur'] as typeof DEFAULT_OPTIONS.roles,
  };
  let state = createGame({ players: JOUEURS, options }, rng).state;

  for (let tour = 0; tour < 600 && !state.over; tour += 1) {
    let agi = false;
    for (const joueur of state.players) {
      if (state.over) break;
      const vue = viewFor(state, joueur.seat);
      if (vue.prompt === null || vue.acted) continue;
      const vivants = state.players.filter((p) => p.alive && p.seat !== joueur.seat);
      const loupVivant = vivants.find((p) => p.role === 'loup');
      const autre = vivants.find((p) => p.role !== 'loup');
      let action: Action | null = null;
      switch (vue.prompt.kind) {
        case 'pret':
          action = { type: 'pret' };
          break;
        case 'sonder':
          action = { type: 'sonder', target: (vivants[0] ?? joueur).seat };
          break;
        case 'devorer':
          action = { type: 'devorer', target: autre?.seat ?? null };
          break;
        case 'sorciere':
          action = { type: 'sorciere', save: false, kill: null };
          break;
        case 'tirer':
          action = { type: 'tirer', target: null };
          break;
        case 'successeur':
          action = { type: 'successeur', target: (vivants[0] ?? joueur).seat };
          break;
        case 'voter':
          if (vue.prompt.election) action = { type: 'voter', target: null };
          else if (issue === 'village') {
            action = { type: 'voter', target: joueur.role === 'loup' ? null : (loupVivant?.seat ?? null) };
          } else {
            action = { type: 'voter', target: joueur.role === 'loup' ? (autre?.seat ?? null) : null };
          }
          break;
        default:
          break;
      }
      if (action === null) continue;
      try {
        state = applyAction(state, action, rng, joueur.seat).state;
        agi = true;
      } catch {
        // Une action refusée : la minuterie débloquera.
      }
    }
    if (!agi && !state.over) state = timeoutPhase(state, rng, state.phaseSeq).state;
  }
  return state;
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
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
  };
}

/** Pose la table finie vue du siège `siege` (ou d'un spectateur) dans le magasin. */
function poser(state: GameState, siege: number | null, playerId: string | null): void {
  useStore.getState().applySync({
    room: salle(),
    game: viewFor(state, siege),
    events: [],
    serverNow: Date.now(),
  });
  useStore.setState({ playerId });
}

/**
 * Un identifiant du moteur n'a pas sa place à l'écran. « loup » est aussi un
 * mot de la prose du skin : on cherche donc les nœuds de texte qui ne sont
 * que l'identifiant.
 */
const IDENTIFIANTS_BRUTS = /^(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot)$/;

function textesBruts(): string[] {
  const noeuds: string[] = [];
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (marcheur.nextNode()) noeuds.push((marcheur.currentNode.textContent ?? '').trim());
  return noeuds.filter((texte) => IDENTIFIANTS_BRUTS.test(texte));
}

describe('<Fin />', () => {
  beforeEach(() => {
    revanche.mockClear();
    quitterTable.mockClear();
    useStore.getState().reset();
  });

  const village = jouerJusquaLaFin('village', 3);
  const meute = jouerJusquaLaFin('loups', 5);

  it('les parties de test vont bien au bout, chacune à son issue', () => {
    expect(village.over && village.winner).toBe('village');
    expect(meute.over && meute.winner).toBe('loups');
  });

  it('GAGNÉ pour un gagnant, PERDU pour un perdant', () => {
    const villageois = village.players.find((p) => p.role === 'villageois')!.seat;
    const loup = village.players.find((p) => p.role === 'loup')!.seat;

    poser(village, villageois, `p${String(villageois)}`);
    const vue = render(<Fin />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('GAGNÉ');
    vue.unmount();

    poser(village, loup, `p${String(loup)}`);
    render(<Fin />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('PERDU');
  });

  it('les loups gagnent : le verdict suit le camp du siège', () => {
    const loup = meute.players.find((p) => p.role === 'loup')!.seat;
    poser(meute, loup, `p${String(loup)}`);
    render(<Fin />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('GAGNÉ');
    expect(screen.getByText(/La meute a pris Thiercelieux/)).toBeInTheDocument();
  });

  it('un spectateur lit FIN, sans bouton de revanche', () => {
    poser(village, null, null);
    render(<Fin />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('FIN');
    expect(screen.queryByRole('button', { name: 'REJOUER' })).toBeNull();
    expect(screen.getByText(/spectateur/)).toBeInTheDocument();
  });

  it('REJOUER seulement pour l’hôte ; les autres lisent qu’il peut relancer', async () => {
    poser(village, 0, 'p0');
    const vue = render(<Fin />);
    const bouton = screen.getByRole('button', { name: 'REJOUER' });
    await userEvent.setup().click(bouton);
    expect(revanche).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/L’hôte peut relancer une revanche/)).toBeNull();
    vue.unmount();

    poser(village, 1, 'p1');
    render(<Fin />);
    expect(screen.queryByRole('button', { name: 'REJOUER' })).toBeNull();
    expect(screen.getByText(/L’hôte peut relancer une revanche/)).toBeInTheDocument();
  });

  it('Quitter la table passe par quitterTable()', async () => {
    poser(village, 1, 'p1');
    render(<Fin />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quitter la table' }));
    expect(quitterTable).toHaveBeenCalledTimes(1);
  });

  it('la nuit racontée récite le log dans la voix du skin, nuit puis jour', () => {
    poser(village, 1, 'p1');
    render(<Fin />);

    expect(screen.getByRole('heading', { name: 'La nuit racontée' })).toBeInTheDocument();
    expect(screen.getAllByText('Nuit 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/La meute a désigné Joueur \d/).length).toBeGreaterThan(0);
    // Le vote : la phrase du narrateur et le décompte en petit.
    expect(screen.getAllByText(/Le village a condamné Joueur \d à la potence/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Joueur \d ×\d/).length).toBeGreaterThan(0);
    // Les rôles des morts sont révélés dans leur phrase.
    expect(screen.getAllByText(/— c’était/).length).toBeGreaterThan(0);
  });

  it('la distribution montre chaque joueur, ses états et les gagnants', () => {
    poser(village, 1, 'p1');
    render(<Fin />);
    for (let seat = 0; seat < JOUEURS; seat += 1) {
      expect(screen.getAllByText(new RegExp(`Joueur ${String(seat)}`)).length).toBeGreaterThan(0);
    }
    const gagnants = document.querySelectorAll('[data-gagnant="oui"]');
    const attendus = village.players.filter((p) => p.role !== 'loup').length;
    expect(gagnants).toHaveLength(attendus);
    const premier = gagnants[0] as HTMLElement;
    expect(within(premier).getByText(/gagnant/)).toBeInTheDocument();
  });

  it('aucun identifiant moteur ni accolade ne parvient à l’écran', () => {
    for (const [etat, siege] of [
      [village, 1],
      [meute, 2],
    ] as const) {
      useStore.getState().reset();
      poser(etat, siege, `p${String(siege)}`);
      const vue = render(<Fin />);
      const texte = document.body.textContent;
      expect(textesBruts()).toEqual([]);
      expect(texte).not.toContain('sorciere');
      expect(texte).not.toMatch(/[{}]|undefined|null/);
      vue.unmount();
    }
  });

  it('« Relire le fil » ouvre le fil dans un panneau', async () => {
    poser(village, 1, 'p1');
    render(<Fin />);
    const bouton = screen.getByRole('button', { name: 'Relire le fil' });
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(bouton);
    expect(screen.getByRole('button', { name: 'Refermer le fil' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('decouperLog', () => {
  it('range les victimes de l’aube dans la nuit et le vote dans le jour', () => {
    const jours = decouperLog([
      { day: 1, type: 'loups', target: 2 },
      { day: 1, type: 'mort', seat: 2, cause: 'loups' },
      { day: 1, type: 'vote', tally: { 3: 2 }, executed: 3 },
      { day: 1, type: 'mort', seat: 3, cause: 'vote' },
      { day: 1, type: 'mort', seat: 4, cause: 'chagrin' },
      { day: 2, type: 'loups', target: null },
    ]);
    expect(jours).toHaveLength(2);
    expect(jours[0]!.nuit.map((e) => e.type)).toEqual(['loups', 'mort']);
    // Le chagrin qui suit un vote appartient au jour, pas à la nuit.
    expect(jours[0]!.jour.map((e) => e.type)).toEqual(['vote', 'mort', 'mort']);
    expect(jours[1]!.nuit.map((e) => e.type)).toEqual(['loups']);
  });
});
