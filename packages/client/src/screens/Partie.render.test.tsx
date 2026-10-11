/* @vitest-environment jsdom */
/**
 * L'écran de partie, rendu sur des vues que le moteur a vraiment produites.
 *
 * Aucune `GameView` n'est écrite à la main : une partie est menée pas à pas
 * avec `createGame`, `applyAction` et `timeoutPhase`, puis taillée pour un
 * siège par `viewFor` — exactement ce que le serveur pousserait. Les briques
 * des autres ateliers (le fil, la nuit, la révélation, la fin) sont doublées
 * par des repères muets : on prouve ici la table, pas leurs écrans.
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
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

// Les écrans des autres ateliers : un repère, rien de plus.
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

  constructor(joueurs: number, ecarts: Partial<GameOptions> = {}, graine = 7) {
    this.rng = createSeededRng(graine);
    const pas = createGame({ players: joueurs, options: { ...DEFAULT_OPTIONS, ...ecarts } }, this.rng);
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

  /** Tout le monde retourne sa carte, puis la nuit passe sans que personne ne joue. */
  jusquAuMatin(): this {
    for (const joueur of this.state.players) this.agir(joueur.seat, { type: 'pret' });
    while (this.state.phase.kind === 'nuit') this.cloturer();
    return this;
  }

  siege(role: RoleId): number {
    const joueur = this.state.players.find((p) => p.role === role);
    if (!joueur) throw new Error(`personne ne joue ${role}`);
    return joueur.seat;
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

/**
 * Pousse la vue d'un siège au magasin, comme un `sync` du serveur. `depuis`
 * ne pousse que les évènements nés après ce rang — le `sync` suivant d'une
 * table déjà montée, qui ne répète pas ce qu'il a déjà dit.
 */
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

/** Un `matchMedia` de grand écran (≥ 1024 px), à rendre ensuite. */
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

/** Le jeton d'un joueur sur la place : son nom ouvre la phrase qui le décrit. */
function jeton(nom: string) {
  return within(screen.getByTestId('place')).getByRole('button', { name: new RegExp(`^${nom}( —|$)`) });
}

/** Les identifiants du moteur, nus et en minuscules : jamais à l'écran. */
const IDENTIFIANTS_BRUTS = /\b(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot|election|succession)\b/;

describe('<Partie />', () => {
  beforeEach(() => {
    vi.mocked(jouer).mockClear();
    useStore.setState({ playerId: null, room: null, game: null, chronique: [], notices: [], live: null });
  });

  it('le jour : on touche un jeton, on confirme, le vote part au moteur', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('jour');
    // Deux voix déjà posées : les pastilles et la barre le disent.
    banc.agir(1, { type: 'voter', target: 2 }).agir(2, { type: 'voter', target: null });
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('partie')).toHaveAttribute('data-phase', 'jour');
    expect(screen.getByText('LOUP')).toHaveClass('font-mono');
    expect(screen.getByTestId('numero')).toHaveTextContent('Jour 1');
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByTestId('barre-vote')).toHaveTextContent('2 sur 8 ont voté');
    expect(screen.getByTestId('a-vote-1')).toBeInTheDocument();
    expect(screen.queryByTestId('a-vote-3')).toBeNull();
    // Le fil vit en tiroir sous la place sur un petit écran.
    expect(screen.getByTestId('fil-tiroir')).toBeInTheDocument();

    // Pas contre soi-même (R60).
    expect(jeton('Joueur 0')).toBeDisabled();

    await utilisateur.click(jeton('Joueur 3'));
    expect(jeton('Joueur 3')).toHaveAttribute('aria-pressed', 'true');
    await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 3' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 3 });

    await utilisateur.click(screen.getByRole('button', { name: 'S’abstenir' }));
    expect(jouer).toHaveBeenLastCalledWith({ type: 'voter', target: null });
  });

  it('le vote posé est surligné, et l’on peut en changer', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    banc.agir(0, { type: 'voter', target: 5 });
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('etat-vote')).toHaveTextContent('Votre voix va à Joueur 5.');
    expect(jeton('Joueur 5')).toHaveAttribute('aria-pressed', 'true');
    await utilisateur.click(jeton('Joueur 4'));
    await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 4' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 4 });
  });

  it('l’élection : on peut voter pour soi, tous les vivants comptent', async () => {
    const banc = new Banc(8, { capitaine: true }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('election');
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('barre-vote')).toHaveTextContent('0 sur 8 a voté');
    expect(screen.getByText(/Élisez votre capitaine/)).toBeInTheDocument();
    await utilisateur.click(jeton('Joueur 0'));
    await utilisateur.click(screen.getByRole('button', { name: 'Voter pour Joueur 0' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 0 });
  });

  it('le Chasseur tombé vise — ou garde sa balle ; les autres attendent', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const chasseur = banc.siege('chasseur');
    for (const joueur of banc.state.players) {
      banc.agir(joueur.seat, { type: 'voter', target: joueur.seat === chasseur ? null : chasseur });
    }
    expect(banc.state.phase.kind).toBe('chasseur');
    const cible = banc.state.players.find((p) => p.alive && p.seat !== chasseur)!.seat;

    const room = publier(banc, chasseur);
    const utilisateur = userEvent.setup();
    const vue = render(<Partie room={room} />);

    // Le narrateur a crié le dépouillement.
    expect(screen.getByTestId('crieur')).toHaveTextContent(`la potence est pour Joueur ${String(chasseur)}`);
    expect(screen.getByText(/abattez un vivant/)).toBeInTheDocument();
    await utilisateur.click(jeton(`Joueur ${String(cible)}`));
    await utilisateur.click(screen.getByRole('button', { name: `Viser Joueur ${String(cible)}` }));
    expect(jouer).toHaveBeenCalledWith({ type: 'tirer', target: cible });
    await utilisateur.click(screen.getByRole('button', { name: 'Ne viser personne' }));
    expect(jouer).toHaveBeenLastCalledWith({ type: 'tirer', target: null });
    vue.unmount();

    // Un autre vivant : la phrase de la phase, aucun bouton de tir.
    publier(banc, cible);
    render(<Partie room={room} />);
    expect(screen.queryByRole('button', { name: 'Ne viser personne' })).toBeNull();
    expect(within(screen.getByTestId('action')).getByText(/La partie attend son dernier geste/)).toBeInTheDocument();
  });

  it('le spectateur voit la place, jamais un prompt ni une carte', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, null);
    render(<Partie room={room} />);

    expect(screen.getByTestId('place')).toBeInTheDocument();
    expect(within(screen.getByTestId('place')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Ma carte' })).toBeNull();
    expect(screen.queryByTestId('action')).toBeNull();
    expect(screen.queryByRole('button', { name: 'S’abstenir' })).toBeNull();
  });

  it('les phases des autres ateliers sont routées vers leurs écrans', () => {
    const banc = new Banc(8);
    const room = publier(banc, 0);
    const vue = render(<Partie room={room} />);
    expect(screen.getByTestId('ecran-revelation')).toBeInTheDocument();
    vue.unmount();

    for (const joueur of banc.state.players) banc.agir(joueur.seat, { type: 'pret' });
    publier(banc, 0);
    render(<Partie room={room} />);
    expect(screen.getByTestId('ecran-nuit')).toBeInTheDocument();
    expect(screen.getByTestId('numero')).toHaveTextContent('Nuit 1');
  });

  it('le narrateur parle à la région vocale, et son journal se déplie', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(useStore.getState().live?.text).toMatch(/Le jour se lève/);
    await utilisateur.click(screen.getByRole('button', { name: 'Journal' }));
    const journal = screen.getByTestId('journal');
    expect(within(journal).getByText('Nuit 1')).toBeInTheDocument();
    expect(within(journal).getByText('Jour 1')).toBeInTheDocument();
    expect(journal).toHaveTextContent('Personne n’est mort cette nuit');
  });

  it('« Ma carte » rappelle les secrets du siège : la meute pour un loup', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const loup = banc.siege('loup');
    const complice = banc.state.players.find((p) => p.role === 'loup' && p.seat !== loup)!.seat;
    const room = publier(banc, loup);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    await utilisateur.click(screen.getByRole('button', { name: 'Ma carte' }));
    const carte = screen.getByRole('dialog', { name: 'Ma carte' });
    expect(carte).toHaveTextContent('La meute');
    expect(carte).toHaveTextContent(`Joueur ${String(complice)}`);
  });

  it('aucun identifiant du moteur ne s’affiche, quel que soit le siège', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const chasseur = banc.siege('chasseur');
    for (const joueur of banc.state.players) {
      banc.agir(joueur.seat, { type: 'voter', target: joueur.seat === chasseur ? null : chasseur });
    }
    const sieges = [null, ...banc.state.players.map((p) => p.seat)];
    for (const siege of sieges) {
      const room = publier(banc, siege);
      const vue = render(<Partie room={room} />);
      expect(document.body.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
      vue.unmount();
    }
  });

  it('le crieur : une bascule d’étape de nuit n’efface pas l’annonce du vote, l’aube crie ses morts', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    // La potence pour un villageois : ni Chasseur ni capitaine, la nuit tombe aussitôt.
    const condamne = banc.siege('villageois');
    for (const joueur of banc.state.players) {
      banc.agir(joueur.seat, { type: 'voter', target: joueur.seat === condamne ? null : condamne });
    }
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });

    const room = publier(banc, null);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);
    const annonce = `la potence est pour Joueur ${String(condamne)}`;
    expect(screen.getByTestId('crieur')).toHaveTextContent(annonce);
    // La nuit, le crieur tait la phrase d'heure : le village qui dort la dit déjà en grand.
    expect(screen.getByTestId('crieur')).not.toHaveTextContent('La nuit tombe');
    expect(screen.getByTestId('narrateur')).toHaveAttribute('data-discret');

    // La meute choisit sa proie, la nuit passe à l'étape de la Sorcière : une
    // simple bascule, qui ne chasse pas l'annonce du vote.
    const victime = banc.state.players.find(
      (p) => p.alive && p.seat !== condamne && p.role !== 'loup' && p.role !== 'chasseur',
    )!.seat;
    const avantBascule = banc.events.length;
    for (const loup of banc.state.players.filter((p) => p.alive && p.role === 'loup')) {
      banc.agir(loup.seat, { type: 'devorer', target: victime });
    }
    while (banc.state.phase.kind === 'nuit' && banc.state.phase.step === 'principale') banc.cloturer();
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'sorciere' });
    act(() => {
      publier(banc, null, avantBascule);
    });
    expect(screen.getByTestId('crieur')).toHaveTextContent(annonce);
    expect(screen.getByTestId('crieur')).not.toHaveTextContent('La nuit se poursuit');

    // La bascule n'est pas perdue : le journal la garde.
    await utilisateur.click(screen.getByRole('button', { name: 'Journal' }));
    expect(screen.getByTestId('journal')).toHaveTextContent('La nuit se poursuit.');

    // L'aube : le crieur reprend la parole, et la mort se lit en grand même
    // si « le jour se lève » vient après elle.
    const avantAube = banc.events.length;
    while (banc.state.phase.kind === 'nuit') banc.cloturer();
    expect(banc.state.phase.kind).toBe('jour');
    act(() => {
      publier(banc, null, avantAube);
    });
    // L'annonce du soir sort en fondu (`AnimatePresence` en mode « wait ») avant que l'aube entre.
    await waitFor(() => expect(screen.getByTestId('crieur')).not.toHaveTextContent(annonce));
    const crieur = screen.getByTestId('crieur');
    expect(crieur).toHaveTextContent(/Le jour se lève/);
    expect(screen.getByTestId('narrateur')).not.toHaveAttribute('data-discret');
    const mort = within(crieur).getByText(new RegExp(`Joueur ${String(victime)}`));
    expect(mort).toHaveClass('text-base');
  });

  it('l’en-tête replie ses commandes de second rang derrière « … », sans les démonter', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    // Un seul jeu de commandes : le CSS les range autrement sous 640 px.
    const plus = screen.getByRole('button', { name: 'Plus de commandes' });
    const menu = document.getElementById('menu-table')!;
    expect(plus).toHaveAttribute('aria-controls', 'menu-table');
    expect(menu).toHaveClass('max-sm:hidden');
    expect(within(menu).getByRole('button', { name: 'Règles' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Réglages' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Quitter' })).toBeInTheDocument();
    expect(within(menu).getByText('Table LOUP')).toHaveClass('sm:hidden');
    // Sa carte et le son restent sur la ligne ; « Ma carte » garde son nom sous l'icône.
    expect(within(menu).queryByRole('button', { name: 'Ma carte' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ma carte' })).toHaveClass('btn-icone-etroit');

    await utilisateur.click(plus);
    expect(plus).toHaveAttribute('aria-expanded', 'true');
    expect(menu).not.toHaveClass('max-sm:hidden');
    await utilisateur.keyboard('{Escape}');
    expect(plus).toHaveAttribute('aria-expanded', 'false');
    expect(plus).toHaveFocus();
  });

  it('sur grand écran, la place est un rond autour du puits — et les jetons se choisissent toujours', async () => {
    const restaurer = simulerGrandEcran();
    // jsdom ne mesure rien : on lui prête la taille d'une place de bureau.
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
      const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
      const room = publier(banc, 0);
      const utilisateur = userEvent.setup();
      render(<Partie room={room} />);

      const place = screen.getByTestId('place');
      expect(place).toHaveAttribute('data-disposition', 'cercle');
      // L'action se pose au milieu du rond, sous le puits ; la barre de vote reste sur la margelle.
      const scene = screen.getByTestId('scene');
      expect(within(scene).getByTestId('puits')).toBeInTheDocument();
      expect(within(scene).getByTestId('action')).toBeInTheDocument();
      expect(screen.getByTestId('fil-colonne')).toBeInTheDocument();
      expect(screen.getByLabelText('La margelle')).toContainElement(screen.getByTestId('barre-vote'));
      // Le joueur local est assis en bas, au milieu : le plus bas des jetons.
      const hauteurs = within(place)
        .getAllByRole('listitem')
        .map((li) => Number.parseFloat(li.style.top));
      expect(Math.max(...hauteurs)).toBe(hauteurs[0]);

      await utilisateur.click(jeton('Joueur 3'));
      await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 3' }));
      expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 3 });
    } finally {
      mesure.mockRestore();
      restaurer();
    }
  });
});
