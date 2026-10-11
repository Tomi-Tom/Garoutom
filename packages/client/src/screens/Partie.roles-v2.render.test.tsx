/* @vitest-environment jsdom */
/**
 * La table des rôles optionnels (R90–R99), rendue sur des vues du moteur.
 *
 * Même méthode que `Partie.render.test.tsx` : une partie menée pas à pas par
 * le moteur, taillée pour un siège par `viewFor`, poussée au magasin comme un
 * `sync` du serveur. Les écrans des autres ateliers sont doublés. On prouve
 * ici le jour : la marque du Corbeau sur la place (grille et rond), le
 * dernier mot du Bouc émissaire, le vote restreint du lendemain — et ce que
 * le narrateur en crie.
 */
import { act, render, screen, within } from '@testing-library/react';
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
  type GameEvent,
  type GameOptions,
  type GameState,
  type RoleId,
  type RoomView,
  type Rng,
} from '@garoutom/engine';

import { jouer } from '../lib/actions.js';
import { useStore } from '../lib/store.js';
import { Partie } from './Partie.js';

vi.mock('../lib/actions.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/actions.js')>()),
  jouer: vi.fn(() => Promise.resolve()),
  quitterTable: vi.fn(() => Promise.resolve()),
}));

vi.mock('../components/partie/Fil.js', async () => {
  const { createElement } = await import('react');
  return { Fil: ({ mode }: { mode: string }) => createElement('div', { 'data-testid': `fil-${mode}` }) };
});
vi.mock('../components/partie/Nuit.js', async () => {
  const { createElement } = await import('react');
  return { Nuit: () => createElement('div', { 'data-testid': 'ecran-nuit' }) };
});
vi.mock('../components/partie/Revelation.js', async () => {
  const { createElement } = await import('react');
  return { Revelation: () => createElement('div', { 'data-testid': 'ecran-revelation' }) };
});
vi.mock('../components/partie/Fin.js', async () => {
  const { createElement } = await import('react');
  return { Fin: () => createElement('div', { 'data-testid': 'ecran-fin' }) };
});

/* ------------------------------------------------------------------ */
/* Une partie menée par le moteur                                      */
/* ------------------------------------------------------------------ */

class Banc {
  rng: Rng;
  state: GameState;
  events: GameEvent[] = [];

  constructor(joueurs: number, ecarts: Partial<GameOptions>, graine = 7) {
    this.rng = createSeededRng(graine);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, capitaine: false, ...ecarts };
    const pas = createGame({ players: joueurs, options }, this.rng);
    this.state = pas.state;
    this.events.push(...pas.events);
  }

  agir(siege: number, action: Action): this {
    const pas = applyAction(this.state, action, this.rng, siege);
    this.state = pas.state;
    this.events.push(...pas.events);
    return this;
  }

  cloturer(): this {
    const pas = timeoutPhase(this.state, this.rng, this.state.phaseSeq);
    this.state = pas.state;
    this.events.push(...pas.events);
    return this;
  }

  /** Tout le monde retourne sa carte. */
  prets(): this {
    for (const joueur of this.state.players) this.agir(joueur.seat, { type: 'pret' });
    return this;
  }

  /** La nuit passe sans que personne d'autre ne joue. */
  jusquAuMatin(): this {
    if (this.state.phase.kind === 'revelation') this.prets();
    while (this.state.phase.kind === 'nuit') this.cloturer();
    return this;
  }

  siege(role: RoleId): number {
    const joueur = this.state.players.find((p) => p.role === role);
    if (!joueur) throw new Error(`personne ne joue ${role}`);
    return joueur.seat;
  }

  sieges(role: RoleId): number[] {
    return this.state.players.filter((p) => p.role === role).map((p) => p.seat);
  }
}

function salle(nombre: number, options: GameOptions): RoomView {
  return {
    code: 'LOUP',
    status: 'playing',
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
    deadline: Date.now() + 60_000,
    deadlineDurationMs: 240_000,
  };
}

/** Pousse la vue d'un siège au magasin, comme un `sync` du serveur. */
function publier(banc: Banc, siege: number | null, depuis = 0): RoomView {
  const room = salle(banc.state.players.length, banc.state.options);
  useStore.getState().applySync({
    room,
    game: viewFor(banc.state, siege),
    events: banc.events.slice(depuis),
    serverNow: Date.now(),
  });
  useStore.setState({ playerId: siege === null ? null : `p${String(siege)}` });
  return room;
}

function simulerGrandEcran(): () => void {
  const avant = window.matchMedia;
  window.matchMedia = (query: string) =>
    ({
      matches: /min-width:\s*1024px/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  return () => {
    window.matchMedia = avant;
  };
}

function nom(seat: number): string {
  return `Joueur ${String(seat)}`;
}

/** Le jeton d'un joueur sur la place : son nom ouvre la phrase qui le décrit. */
function jeton(seat: number) {
  return within(screen.getByTestId('place')).getByRole('button', { name: new RegExp(`^${nom(seat)}( —|$)`) });
}

/** Le jeton, qu'il soit bouton ou ligne de liste. */
function jetonQuelconque(seat: number) {
  return within(screen.getByTestId('place')).getByText(new RegExp(`^${nom(seat)}( —|$)`), { selector: '.sr-only' });
}

/** Les identifiants du moteur, nus : jamais à l'écran. */
const IDENTIFIANTS_BRUTS =
  /\b(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot|ancien|corbeau|bouc|petiteFille|loupBlanc|designerVotants|election|succession)\b/;

/**
 * Le jour 1 d'une table avec un Bouc émissaire : la place se partage à
 * égalité entre deux villageois, et l'égalité retombe sur le Bouc (R94).
 */
function egaliteSurLeBouc(): { banc: Banc; bouc: number; a: number; b: number } {
  const banc = new Banc(8, { roles: ['bouc', 'voyante'] }).jusquAuMatin();
  expect(banc.state.phase.kind).toBe('jour');
  const bouc = banc.siege('bouc');
  const [a, b] = banc.sieges('villageois') as [number, number];
  const autres = banc.state.players.filter((p) => p.alive && p.seat !== a && p.seat !== b);
  banc.agir(a, { type: 'voter', target: b }).agir(b, { type: 'voter', target: a });
  autres.forEach((joueur, rang) => banc.agir(joueur.seat, { type: 'voter', target: rang % 2 === 0 ? a : b }));
  expect(banc.state.phase).toMatchObject({ kind: 'bouc', seat: bouc });
  return { banc, bouc, a, b };
}

describe('<Partie /> — les rôles optionnels', () => {
  beforeEach(() => {
    vi.mocked(jouer).mockClear();
    useStore.setState({ playerId: null, room: null, game: null, chronique: [], notices: [], live: null });
  });

  it('la marque du Corbeau : un « +2 » sur le jeton, l’explication dans la barre de vote', () => {
    const banc = new Banc(8, { roles: ['corbeau', 'voyante'] }).prets();
    const corbeau = banc.siege('corbeau');
    const marque = banc.siege('villageois');
    banc.agir(corbeau, { type: 'marquer', target: marque }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('jour');

    const temoin = banc.state.players.find((p) => p.seat !== marque && p.seat !== corbeau)!.seat;
    const room = publier(banc, temoin);
    const { container } = render(<Partie room={room} />);

    // L'aube l'a criée — la marque, jamais la main.
    expect(screen.getByTestId('crieur')).toHaveTextContent(`Le Corbeau a désigné ${nom(marque)}`);
    expect(screen.getByTestId('crieur')).not.toHaveTextContent(nom(corbeau));
    // Le jeton marqué porte son « +2 », et le dit aux lecteurs d'écran.
    expect(screen.getByTestId(`marque-${String(marque)}`)).toHaveTextContent('+2');
    expect(jeton(marque)).toHaveAccessibleName(/marqué·e par le Corbeau : deux voix d’office/);
    expect(screen.queryAllByText('+2', { selector: '[data-testid^="marque-"]' })).toHaveLength(1);
    // La barre explique : qui, et ce que ça pèse.
    const explication = screen.getByTestId('explication-marque');
    expect(within(screen.getByTestId('barre-vote')).getByTestId('explication-marque')).toBe(explication);
    expect(explication).toHaveTextContent(`Le Corbeau a marqué ${nom(marque)} : deux voix d’office au vote du jour.`);
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
  });

  it('sur grand écran, le rond porte la même marque et la margelle la même explication', () => {
    const restaurer = simulerGrandEcran();
    const mesure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 980,
      height: 620,
      top: 0,
      left: 0,
      right: 980,
      bottom: 620,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    try {
      const banc = new Banc(8, { roles: ['corbeau', 'voyante'] }).prets();
      const marque = banc.siege('villageois');
      banc.agir(banc.siege('corbeau'), { type: 'marquer', target: marque }).jusquAuMatin();
      const room = publier(banc, 0);
      render(<Partie room={room} />);

      expect(screen.getByTestId('place')).toHaveAttribute('data-disposition', 'cercle');
      expect(screen.getByTestId(`marque-${String(marque)}`)).toHaveTextContent('+2');
      expect(screen.getByLabelText('La margelle')).toContainElement(screen.getByTestId('explication-marque'));
    } finally {
      mesure.mockRestore();
      restaurer();
    }
  });

  it('le Bouc émissaire désigne plusieurs votants sur la place, puis confirme', async () => {
    const { banc, bouc, a, b } = egaliteSurLeBouc();
    const room = publier(banc, bouc);
    const utilisateur = userEvent.setup();
    const { container } = render(<Partie room={room} />);

    expect(screen.getByTestId('partie')).toHaveAttribute('data-phase', 'bouc');
    expect(screen.getByTestId('crieur')).toHaveTextContent(`c’est ${nom(bouc)}, le Bouc émissaire, qui paie pour tous`);
    const action = screen.getByTestId('action');
    expect(action).toHaveTextContent('Votre dernier mot : désignez qui votera demain');
    // Lui est tombé : son jeton ne se touche pas.
    expect(jeton(bouc)).toBeDisabled();
    expect(within(action).getByRole('button', { name: 'Désignez au moins un vivant' })).toBeDisabled();

    await utilisateur.click(jeton(b));
    await utilisateur.click(jeton(a));
    expect(jeton(a)).toHaveAttribute('aria-pressed', 'true');
    expect(jeton(b)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('etat-designation')).toHaveTextContent(
      `Voteront demain : ${nom(Math.min(a, b))} et ${nom(Math.max(a, b))}.`,
    );
    // Un second toucher retire un votant.
    await utilisateur.click(jeton(b));
    expect(jeton(b)).toHaveAttribute('aria-pressed', 'false');
    await utilisateur.click(jeton(b));
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer ces 2 votants' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'designerVotants', seats: [a, b].sort((x, y) => x - y) });
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
  });

  it('pendant le dernier mot du Bouc, les autres lisent la phrase de la phase', () => {
    const { banc, bouc } = egaliteSurLeBouc();
    const autre = banc.state.players.find((p) => p.alive && p.seat !== bouc)!.seat;
    const room = publier(banc, autre);
    render(<Partie room={room} />);

    expect(screen.getByTestId('action')).toHaveTextContent(
      'Le Bouc émissaire rend l’âme. Son dernier mot peut désigner qui votera demain.',
    );
    expect(within(screen.getByTestId('place')).queryAllByRole('button')).toHaveLength(0);
  });

  it('le lendemain, seuls les désignés votent : les autres le lisent, la barre ne compte qu’eux', async () => {
    const { banc, bouc, a, b } = egaliteSurLeBouc();
    const avant = banc.events.length;
    banc.agir(bouc, { type: 'designerVotants', seats: [a, b] });
    const temoin = banc.state.players.find((p) => p.alive && p.seat !== a && p.seat !== b)!.seat;

    // Le narrateur crie le dernier mot, sans accolade.
    let room = publier(banc, temoin);
    const vue = render(<Partie room={room} />);
    act(() => {
      publier(banc, temoin, avant);
    });
    expect(screen.getByTestId('crieur')).toHaveTextContent(
      `Dernier mot du Bouc émissaire : demain, seuls voteront ${nom(Math.min(a, b))} et ${nom(Math.max(a, b))}.`,
    );
    vue.unmount();

    banc.jusquAuMatin();
    expect(banc.state.phase.kind).toBe('jour');
    expect(banc.state.votants).toEqual([a, b].sort((x, y) => x - y));

    // Un vivant non désigné : pas de vote, et il le lit.
    useStore.setState({ chronique: [] });
    room = publier(banc, temoin);
    const temoinVue = render(<Partie room={room} />);
    expect(screen.getByTestId('non-designe')).toHaveTextContent('vous ne votez pas aujourd’hui');
    expect(screen.queryByRole('button', { name: 'S’abstenir' })).toBeNull();
    expect(screen.getByTestId('barre-vote')).toHaveTextContent('0 sur 2 a voté');
    expect(screen.getByTestId('explication-votants')).toHaveTextContent(
      `Le Bouc émissaire a parlé : seuls votent ${nom(Math.min(a, b))} et ${nom(Math.max(a, b))}.`,
    );
    expect(jetonQuelconque(temoin)).toHaveTextContent('ne vote pas aujourd’hui');
    expect(jetonQuelconque(a)).not.toHaveTextContent('ne vote pas');
    expect(temoinVue.container.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
    temoinVue.unmount();

    // Un désigné vote comme d'habitude ; la barre avance sur deux.
    banc.agir(a, { type: 'voter', target: temoin });
    room = publier(banc, b);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);
    expect(screen.getByTestId('barre-vote')).toHaveTextContent('1 sur 2 a voté');
    await utilisateur.click(jeton(temoin));
    await utilisateur.click(screen.getByRole('button', { name: `Voter contre ${nom(temoin)}` }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: temoin });
  });

  it('aucun identifiant du moteur ne s’affiche, quel que soit le siège, au dernier mot du Bouc', () => {
    const { banc } = egaliteSurLeBouc();
    for (const siege of [null, ...banc.state.players.map((p) => p.seat)]) {
      const room = publier(banc, siege);
      const vue = render(<Partie room={room} />);
      expect(document.body.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
      vue.unmount();
    }
  });
});
