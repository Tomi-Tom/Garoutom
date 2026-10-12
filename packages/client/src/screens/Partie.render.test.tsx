/* @vitest-environment jsdom */
/**
 * L'écran de partie, rendu sur des vues que le moteur a vraiment produites.
 *
 * Aucune `GameView` n'est écrite à la main : une partie est menée pas à pas
 * avec `createGame`, `applyAction` et `timeoutPhase`, puis taillée pour un
 * siège par `viewFor` — exactement ce que le serveur pousserait. Les briques
 * des autres ateliers (le fil, la nuit, la révélation, la fin) sont doublées
 * par des repères muets : on prouve ici la table, pas leurs écrans. Le
 * registre (lot du fil) reste vrai : le crieur l'ouvre d'un toucher.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

import { Narrateur } from '../components/partie/Narrateur.js';
import { jouer, quitterTable } from '../lib/actions.js';
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
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: Date.now() + 60_000,
    deadlineDurationMs: 240_000,
    paused: false,
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
    seq: banc.events.length,
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
    vi.mocked(quitterTable).mockClear();
    useStore.setState({ playerId: null, room: null, game: null, chronique: [], notices: [], live: null });
  });

  it('le jour : on touche un jeton, on confirme en deux temps, le vote part au moteur', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('jour');
    // Deux voix déjà posées : les sceaux et le résumé le disent.
    banc.agir(1, { type: 'voter', target: 2 }).agir(2, { type: 'voter', target: null });
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('partie')).toHaveAttribute('data-phase', 'jour');
    // La frise : l'heure, et le code de la table (à côté de l'heure sur desktop, dans le menu sur mobile).
    expect(screen.getByText('Jour 1', { selector: '.frise-titre' })).toBeInTheDocument();
    expect(screen.getByLabelText('Code de table : LOUP')).toHaveTextContent('LOUP');
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByTestId('barre-vote')).toHaveTextContent('2 sur 8 ont voté');
    expect(screen.getByTestId('a-vote-1')).toBeInTheDocument();
    expect(screen.queryByTestId('a-vote-3')).toBeNull();
    // Le fil vit derrière le pli sur un petit écran.
    expect(screen.getByTestId('fil-tiroir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Le village/ })).toBeInTheDocument();

    // Pas contre soi-même (R60).
    expect(jeton('Joueur 0')).toBeDisabled();

    await utilisateur.click(jeton('Joueur 3'));
    expect(jeton('Joueur 3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('etat-vote')).toHaveTextContent('Votre voix : Joueur 3 · à confirmer');
    // Premier toucher : le bouton s'arme, rien ne part.
    await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 3' }));
    expect(jouer).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer : Joueur 3 à la potence' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 3 });

    // L'abstention aussi se confirme en deux temps (P0-6).
    await utilisateur.click(screen.getByRole('button', { name: 'S’abstenir' }));
    expect(jouer).toHaveBeenCalledTimes(1);
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer l’abstention' }));
    expect(jouer).toHaveBeenLastCalledWith({ type: 'voter', target: null });
  });

  it('le vote posé est surligné, et l’on peut en changer', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    banc.agir(0, { type: 'voter', target: 5 });
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('etat-vote')).toHaveTextContent('Votre voix : Joueur 5 · modifiable');
    expect(jeton('Joueur 5')).toHaveAttribute('aria-pressed', 'true');
    // La voix déjà posée ne se renvoie pas.
    expect(screen.getByRole('button', { name: 'Voter contre…' })).toBeDisabled();
    await utilisateur.click(jeton('Joueur 4'));
    await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 4' }));
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer : Joueur 4 à la potence' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 4 });
  });

  it('l’élection : on peut voter pour soi, tous les vivants comptent', async () => {
    const banc = new Banc(8, { capitaine: true }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('election');
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(screen.getByTestId('barre-vote')).toHaveTextContent('0 sur 8 a voté');
    expect(screen.getByTestId('consigne')).toHaveTextContent(/Élisez votre capitaine/);
    await utilisateur.click(jeton('Joueur 0'));
    await utilisateur.click(screen.getByRole('button', { name: 'Élire Joueur 0' }));
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer : élire Joueur 0' }));
    expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 0 });
  });

  it('le Chasseur tombé tire — ou tire en l’air, sans retour ; les autres attendent', async () => {
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

    // Le crieur : la scène du Chasseur d'abord, le dépouillement ensuite.
    const crieur = screen.getByTestId('crieur');
    expect(crieur).toHaveTextContent(/La partie attend son dernier geste/);
    expect(crieur).toHaveTextContent(`la potence est pour Joueur ${String(chasseur)}`);
    expect(screen.getByTestId('consigne')).toHaveTextContent(/abattez un vivant/);
    await utilisateur.click(jeton(`Joueur ${String(cible)}`));
    expect(screen.getByTestId('resume')).toHaveTextContent(`Votre balle : Joueur ${String(cible)}`);
    await utilisateur.click(screen.getByRole('button', { name: `Tirer sur Joueur ${String(cible)}` }));
    await utilisateur.click(
      screen.getByRole('button', { name: `Confirmer — sans retour : tirer sur Joueur ${String(cible)}` }),
    );
    expect(jouer).toHaveBeenCalledWith({ type: 'tirer', target: cible });
    await utilisateur.click(screen.getByRole('button', { name: 'Tirer en l’air' }));
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer — sans retour : tirer en l’air' }));
    expect(jouer).toHaveBeenLastCalledWith({ type: 'tirer', target: null });
    vue.unmount();

    // Un autre vivant : la légende du graveur, sa carte sous le pouce, aucun bouton de tir.
    publier(banc, cible);
    render(<Partie room={room} />);
    expect(screen.queryByRole('button', { name: 'Tirer en l’air' })).toBeNull();
    expect(screen.getByTestId('consigne')).toHaveTextContent('« Il tire mieux mort que vivant. »');
    expect(screen.getByTestId('crieur')).toHaveTextContent(/La partie attend son dernier geste/);
    expect(screen.getByRole('button', { name: 'Gardez le pouce : ma carte' })).toBeInTheDocument();
  });

  it('le spectateur voit la place, jamais un prompt ni une carte', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, null);
    render(<Partie room={room} />);

    expect(screen.getByTestId('place')).toBeInTheDocument();
    expect(within(screen.getByTestId('place')).queryAllByRole('button')).toHaveLength(0);
    // L'emplacement de « Carte » reste, vide : la silhouette de la frise ne bouge pas.
    expect(screen.queryByRole('button', { name: 'Ma carte' })).toBeNull();
    expect(document.querySelector('[data-ma-carte="vide"]')).not.toBeNull();
    expect(screen.getByTestId('consigne')).toHaveAttribute('data-legende');
    expect(screen.queryByRole('button', { name: 'S’abstenir' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Gardez le pouce/ })).toBeNull();
  });

  it('les phases des autres ateliers sont routées vers leurs écrans', () => {
    const banc = new Banc(8);
    const room = publier(banc, 0);
    const vue = render(<Partie room={room} />);
    expect(screen.getByTestId('ecran-revelation')).toBeInTheDocument();
    vue.unmount();

    // Le spectateur de la révélation : la place et la légende, aucune carte.
    publier(banc, null);
    const spectateur = render(<Partie room={room} />);
    expect(screen.queryByTestId('ecran-revelation')).toBeNull();
    expect(screen.getByTestId('place')).toBeInTheDocument();
    expect(screen.getByTestId('consigne')).toHaveTextContent('« Nul ne se connaît. »');
    spectateur.unmount();

    for (const joueur of banc.state.players) banc.agir(joueur.seat, { type: 'pret' });
    publier(banc, 0);
    render(<Partie room={room} />);
    expect(screen.getByTestId('ecran-nuit')).toBeInTheDocument();
    expect(screen.getByTestId('partie')).toHaveAttribute('data-heure', 'nuit');
  });

  it('le narrateur parle à la région vocale, et un toucher du crieur ouvre le registre', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    expect(useStore.getState().live?.text).toMatch(/Le jour se lève/);
    // L'aube paisible : la rubrique « Aube 1 », la phrase d'heure tue (la frise la dit).
    expect(screen.getByTestId('crieur-rubrique')).toHaveTextContent('Aube 1');
    expect(screen.getByTestId('crieur')).toHaveTextContent('Personne n’est mort cette nuit');
    expect(screen.getByTestId('crieur')).not.toHaveTextContent('Le jour se lève');

    await utilisateur.click(screen.getByRole('button', { name: 'Le crieur — ouvrir le registre' }));
    const registre = screen.getByTestId('registre');
    expect(within(registre).getByText('Nuit 1')).toBeInTheDocument();
    expect(within(registre).getByText('Jour 1')).toBeInTheDocument();
    expect(registre).toHaveTextContent('Personne n’est mort cette nuit');
  });

  it('« Carte » montre la carte et les secrets du siège tant que le pouce est posé — et la place les imprime', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const loup = banc.siege('loup');
    const complice = banc.state.players.find((p) => p.role === 'loup' && p.seat !== loup)!.seat;
    const room = publier(banc, loup);
    render(<Partie room={room} />);

    const phraseDuComplice = () =>
      within(screen.getByTestId('place')).getByText(new RegExp(`^Joueur ${String(complice)}( —|$)`), {
        selector: '.sr-only',
      });
    // Le savoir privé ne se pose pas sur la place (§ 5.1.6).
    expect(phraseDuComplice()).not.toHaveTextContent('Loup-garou');
    expect(screen.queryByTestId('ma-carte')).toBeNull();

    // Entrée : une lecture de 8 s au plus (le clavier de l'appui long).
    const bouton = screen.getByRole('button', { name: 'Ma carte' });
    act(() => {
      fireEvent.keyDown(bouton, { key: 'Enter' });
    });
    const carte = screen.getByTestId('ma-carte');
    expect(carte).toHaveTextContent('Vos complices');
    expect(carte).toHaveTextContent(`Joueur ${String(complice)}`);
    expect(phraseDuComplice()).toHaveTextContent('Loup-garou');

    // Relâché : tout se recache d'une image.
    act(() => {
      fireEvent.keyDown(bouton, { key: 'Escape' });
    });
    expect(screen.queryByTestId('ma-carte')).toBeNull();
    expect(phraseDuComplice()).not.toHaveTextContent('Loup-garou');
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

    // La nuit, l'écran (doublé ici) porte le crieur des zones communes.
    publier(banc, null);
    render(<Narrateur />);
    const annonce = `la potence est pour Joueur ${String(condamne)}`;
    expect(screen.getByTestId('crieur')).toHaveTextContent(annonce);
    // La nuit, le crieur tait la phrase d'heure : la frise la dit déjà.
    expect(screen.getByTestId('crieur')).not.toHaveTextContent('La nuit tombe');
    expect(screen.getByTestId('narrateur')).toHaveAttribute('data-discret');
    // Le vote du soir reste rangé sous son heure.
    expect(screen.getByTestId('crieur-rubrique')).toHaveTextContent('Jour 1');

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

    // L'aube : le crieur reprend la parole, la mort d'abord, sous « Aube 2 ».
    const avantAube = banc.events.length;
    while (banc.state.phase.kind === 'nuit') banc.cloturer();
    expect(banc.state.phase.kind).toBe('jour');
    act(() => {
      publier(banc, null, avantAube);
    });
    await waitFor(() => expect(screen.getByTestId('crieur')).not.toHaveTextContent(annonce));
    const crieur = screen.getByTestId('crieur');
    expect(screen.getByTestId('crieur-rubrique')).toHaveTextContent('Aube 2');
    expect(screen.getByTestId('narrateur')).not.toHaveAttribute('data-discret');
    const premiere = crieur.querySelector('[data-ligne]');
    expect(premiere).toHaveAttribute('data-mort');
    expect(premiere).toHaveTextContent(new RegExp(`Joueur ${String(victime)}`));
  });

  it('le menu « … » de la frise ouvre la feuille de la table ; quitter se confirme en deux temps', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);

    const menu = screen.getByRole('button', { name: 'Menu de la table' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await utilisateur.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    const feuille = screen.getByRole('dialog', { name: 'Table LOUP' });
    expect(within(feuille).getByText('8 sièges · Jour 1')).toBeInTheDocument();
    expect(within(feuille).getByRole('button', { name: 'Règles' })).toBeInTheDocument();
    expect(within(feuille).getByRole('button', { name: 'Réglages' })).toBeInTheDocument();
    expect(within(feuille).getByRole('button', { name: 'Le registre' })).toBeInTheDocument();

    await utilisateur.click(within(feuille).getByRole('button', { name: 'Quitter' }));
    await utilisateur.click(within(feuille).getByRole('button', { name: 'Oui, quitter' }));
    expect(quitterTable).not.toHaveBeenCalled();
    await utilisateur.click(within(feuille).getByRole('button', { name: 'Confirmer : quitter la table' }));
    expect(quitterTable).toHaveBeenCalled();

    await utilisateur.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Table LOUP' })).toBeNull();
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('un vote qui se clôt pose la planche du dépouillement, à bâtons gravés', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const condamne = banc.siege('villageois');
    const room = publier(banc, 0);
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);
    // Rien au montage : seul un vote qui arrive pose la planche.
    expect(screen.queryByTestId('depouillement')).toBeNull();

    const avant = banc.events.length;
    for (const joueur of banc.state.players) {
      banc.agir(joueur.seat, { type: 'voter', target: joueur.seat === condamne ? null : condamne });
    }
    act(() => {
      publier(banc, 0, avant);
    });
    const planche = screen.getByRole('dialog', { name: 'Le dépouillement' });
    expect(planche).toHaveTextContent('Les voix sont comptées');
    expect(within(planche).getByTestId('verdict')).toHaveTextContent(`la potence est pour Joueur ${String(condamne)}`);
    expect(planche.querySelector(`[data-cible="${String(condamne)}"] [data-batons="7"]`)).not.toBeNull();
    expect(planche).toHaveTextContent('« Les voix sont comptées ; les raisons, jamais. »');
    expect(planche.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);

    await utilisateur.click(within(planche).getByRole('button', { name: 'Toucher pour passer' }));
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('sur grand écran, la place est un cercle autour du pupitre — et les jetons se choisissent toujours', async () => {
    const restaurer = simulerGrandEcran();
    // jsdom ne mesure rien : on lui prête la taille d'une place de bureau.
    const mesure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1004,
      height: 748,
      top: 0,
      left: 0,
      right: 1004,
      bottom: 748,
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
      // Le fil tient la colonne de droite, le résumé épinglé en tête.
      expect(screen.getByTestId('fil-colonne')).toBeInTheDocument();
      // Le joueur local est assis en bas, au milieu : le plus bas des jetons.
      const hauteurs = within(place)
        .getAllByRole('listitem')
        .map((li) => Number.parseFloat(li.style.top));
      expect(Math.max(...hauteurs)).toBe(hauteurs[0]);

      await utilisateur.click(jeton('Joueur 3'));
      await utilisateur.click(screen.getByRole('button', { name: 'Voter contre Joueur 3' }));
      await utilisateur.click(screen.getByRole('button', { name: 'Confirmer : Joueur 3 à la potence' }));
      expect(jouer).toHaveBeenCalledWith({ type: 'voter', target: 3 });
    } finally {
      mesure.mockRestore();
      restaurer();
    }
  });
});
