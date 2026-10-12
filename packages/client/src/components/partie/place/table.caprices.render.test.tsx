/* @vitest-environment jsdom */
/**
 * La table « Caprices » (lot V2-A) : le jeton et ses dix-sept états, les
 * densités, le savoir privé sous le pouce, le crieur, le gabarit du jour, le
 * dépouillement et la Scène TV — sur des vues que le moteur a produites.
 *
 * Quand un état est rare (le gracié, l'interdit…), la vue du moteur est prise
 * telle quelle puis retouchée sur le seul champ en jeu : on prouve ici le
 * dessin, pas la règle (le moteur a ses propres tests).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  type GameView,
  type RoleId,
  type RoomView,
  type Rng,
} from '@garoutom/engine';

import { jouer } from '../../../lib/actions.js';
import { useStore } from '../../../lib/store.js';
import { Partie } from '../../../screens/Partie.js';
import { HAUTEURS_ZONES } from '../../caprices/index.js';
import { Narrateur } from '../Narrateur.js';
import { Place } from '../Place.js';
import { poserLePouce } from './savoir.js';

vi.mock('../../../lib/actions.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/actions.js')>()),
  jouer: vi.fn(() => Promise.resolve()),
  quitterTable: vi.fn(() => Promise.resolve()),
}));
vi.mock('../Fil.js', async () => {
  const { createElement } = await import('react');
  return { Fil: ({ mode }: { mode: string }) => createElement('div', { 'data-testid': `fil-${mode}` }) };
});

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

  jusquAuMatin(): this {
    if (this.state.phase.kind === 'revelation') {
      for (const joueur of this.state.players) this.agir(joueur.seat, { type: 'pret' });
    }
    while (this.state.phase.kind === 'nuit') {
      const pas = timeoutPhase(this.state, this.rng, this.state.phaseSeq);
      this.state = pas.state;
      this.events.push(...pas.events);
    }
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
    code: 'VRGL',
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

/** Pousse la vue d'un siège, éventuellement retouchée. */
function publier(banc: Banc, siege: number | null, retouche?: (vue: GameView) => void, depuis = 0): RoomView {
  const room = salle(banc.state.players.length, banc.state.options);
  const game = viewFor(banc.state, siege);
  retouche?.(game);
  useStore.getState().applySync({
    room,
    game,
    events: banc.events.slice(depuis),
    seq: banc.events.length,
    serverNow: Date.now(),
  });
  useStore.setState({ playerId: siege === null ? null : `p${String(siege)}` });
  return room;
}

/** La cellule d'un jeton, par sa phrase cachée. */
function cellule(seat: number): HTMLElement {
  const phrase = within(screen.getByTestId('place')).getByText(new RegExp(`^Joueur ${String(seat)}( —|$)`), {
    selector: '.sr-only',
  });
  return phrase.closest('li') as HTMLElement;
}

describe('la table Caprices', () => {
  beforeEach(() => {
    vi.mocked(jouer).mockClear();
    useStore.setState({ playerId: null, room: null, game: null, chronique: [], notices: [], live: null });
    poserLePouce(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('les densités suivent la table : D1 à 6, D2 à 12, D3 à 18 — et le fil ouvert passe en D4', () => {
    for (const [n, densite, colonnes] of [
      [6, 'D1', 3],
      [12, 'D2', 4],
      [18, 'D3', 5],
    ] as const) {
      const banc = new Banc(n).jusquAuMatin();
      publier(banc, 0);
      const vue = render(<Place />);
      const place = screen.getByTestId('place');
      expect(place).toHaveAttribute('data-densite', densite);
      expect(place.style.gridTemplateColumns).toBe(`repeat(${String(colonnes)}, minmax(0, 1fr))`);
      vue.unmount();
    }
    const banc = new Banc(12).jusquAuMatin();
    publier(banc, 0);
    render(<Place filOuvert />);
    expect(screen.getByTestId('place')).toHaveAttribute('data-densite', 'D4');
  });

  it('chaque siège porte son couvre-chef ; aucun texte ni jeton ne se pâlit par l’opacité', () => {
    const banc = new Banc(12, { capitaine: false }).jusquAuMatin();
    publier(banc, 0);
    render(<Place choisissables={(seat) => seat % 2 === 0} onChoisir={() => {}} />);
    for (let seat = 0; seat < 12; seat += 1) {
      expect(cellule(seat).querySelector('[data-couvre-chef]')).toHaveAttribute('data-couvre-chef', String(seat + 1));
    }
    expect(screen.getByTestId('place').innerHTML).not.toMatch(/opacity/);
    // Non choisissable (état 15) : le disque perd son grain, le jeton garde son contraste.
    const disque = cellule(1).querySelectorAll('circle')[2];
    expect(disque).toHaveAttribute('fill', 'var(--surface)');
    expect(cellule(2).querySelectorAll('circle')[2]?.getAttribute('fill')).toMatch(/^url\(#hach-1-/);
  });

  it('les états du jour : moi, capitaine, a voté, mort au cartouche public, gracié, marqué, interdit', () => {
    const banc = new Banc(12, { capitaine: false }).jusquAuMatin();
    banc.agir(2, { type: 'voter', target: 4 });
    const loup = banc.siege('loup');
    publier(banc, 0, (vue) => {
      vue.players[1] = { ...vue.players[1]!, isCaptain: true };
      vue.players[3] = { ...vue.players[3]!, alive: false, role: loup === 3 ? 'loup' : 'villageois' };
      vue.players[5] = { ...vue.players[5]!, canVote: false, role: 'idiot' };
      vue.players[6] = { ...vue.players[6]!, alive: false, role: null };
      vue.marque = 7;
    });
    render(<Place marque={7} interdits={[8]} />);

    // Moi : le cadre double, « vous », jamais son rôle.
    expect(cellule(0)).toHaveTextContent('vous');
    // Le capitaine : le brassard « ×2 ».
    expect(within(cellule(1)).getByTestId('brassard')).toHaveTextContent('×2');
    // A voté : le sceau en NE, le mot.
    expect(within(cellule(2)).getByTestId('a-vote-2')).toBeInTheDocument();
    expect(cellule(2)).toHaveTextContent('a voté');
    // Un vivant qui n'a pas encore voté délibère.
    expect(cellule(4)).toHaveTextContent('délibère');
    // Le mort au rôle public : barré, et son cartouche (le rôle entier en D2).
    expect(cellule(3).querySelector('.cartouche')).toHaveTextContent(/Villageois·e|Loup-garou/);
    // Le mort à la carte cachée : l'ovale vide.
    expect(cellule(6).querySelector('.cartouche[data-forme="neutre"]')).toHaveTextContent('Carte cachée');
    // Le gracié : la corde coupée, « ne vote plus », et le cartouche du camp.
    expect(cellule(5).querySelector('[data-glyphe="gracie"]')).not.toBeNull();
    expect(cellule(5)).toHaveTextContent('ne vote plus');
    expect(cellule(5).querySelector('.cartouche')).toHaveTextContent('Village');
    // Le marqué : le cartouche « +2 » en NO.
    expect(within(cellule(7)).getByTestId('marque-7')).toHaveTextContent('+2');
    // L'interdit : le bouclier barré et « hier ».
    expect(cellule(8).querySelector('[data-glyphe="interdit"]')).not.toBeNull();
    expect(cellule(8)).toHaveTextContent('hier');
  });

  it('un seul mot de statut, par priorité : « votre choix » l’emporte sur « a voté » et « capitaine »', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    banc.agir(3, { type: 'voter', target: 4 });
    publier(banc, 0, (vue) => {
      vue.players[3] = { ...vue.players[3]!, isCaptain: true };
    });
    const { rerender } = render(<Place choisis={[]} />);
    expect(within(cellule(3)).getAllByText(/^(a voté|capitaine|votre choix)$/)).toHaveLength(1);
    expect(within(cellule(3)).getByText(/^(a voté|capitaine|votre choix)$/)).toHaveTextContent('a voté');
    rerender(<Place choisis={[3]} />);
    expect(within(cellule(3)).getAllByText(/^(a voté|capitaine|votre choix)$/)).toHaveLength(1);
    expect(within(cellule(3)).getByText(/^(a voté|capitaine|votre choix)$/)).toHaveTextContent('votre choix');
  });

  it('le savoir privé ne s’imprime que sous le pouce : complices et lacs', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const loup = banc.siege('loup');
    const complice = banc.state.players.find((p) => p.role === 'loup' && p.seat !== loup)!.seat;
    const amoureux = banc.state.players.find((p) => p.seat !== loup && p.seat !== complice)!.seat;
    publier(banc, loup, (vue) => {
      vue.players[amoureux] = { ...vue.players[amoureux]!, isLover: true };
    });
    render(<Place />);
    expect(cellule(complice).querySelector('.cartouche')).toBeNull();
    expect(cellule(amoureux).querySelector('[data-glyphe="lie"]')).toBeNull();

    act(() => poserLePouce(true));
    expect(cellule(complice).querySelector('.cartouche[data-forme="mordu"]')).toHaveTextContent('Loup-garou');
    expect(cellule(amoureux).querySelector('[data-glyphe="lie"]')).not.toBeNull();

    act(() => poserLePouce(false));
    expect(cellule(complice).querySelector('.cartouche')).toBeNull();
  });

  it('le crieur sans rien à dire pose la légende du graveur ; une annonce s’écrit mot à mot', () => {
    vi.useFakeTimers();
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    publier(banc, 0);
    useStore.setState({ chronique: [] });
    const { rerender } = render(<Narrateur />);
    expect(screen.getByTestId('crieur-legende')).toHaveTextContent('« Tous d’accord, donc tous innocents. »');

    act(() => {
      useStore.setState({
        chronique: [{ id: 9_001, day: 1, event: { type: 'capitaine', seat: 2, from: null } }],
      });
    });
    rerender(<Narrateur />);
    const crieur = screen.getByTestId('crieur');
    // Le texte entier est là (lu par la région vocale), mais il s'imprime mot à mot.
    expect(crieur).toHaveTextContent('Joueur 2');
    expect(crieur.querySelectorAll('.invisible').length).toBeGreaterThan(0);
    act(() => void vi.advanceTimersByTime(1_300));
    expect(crieur.querySelectorAll('.invisible')).toHaveLength(0);
  });

  it('l’écran de jour suit le gabarit unique : huit zones, aux hauteurs du § 7.1', () => {
    const banc = new Banc(12, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    const { container } = render(<Partie room={room} />);
    const zones = [...container.querySelectorAll<HTMLElement>('.gabarit > .gabarit-zone')].map((zone) => [
      zone.dataset.zone,
      zone.style.getPropertyValue('--zone-h'),
    ]);
    expect(zones).toEqual([
      ['frise', `${String(HAUTEURS_ZONES.frise)}px`],
      ['minuterie', `${String(HAUTEURS_ZONES.minuterie)}px`],
      ['crieur', `${String(HAUTEURS_ZONES.crieur)}px`],
      ['consigne', `${String(HAUTEURS_ZONES.consigne)}px`],
      ['place', `${String(HAUTEURS_ZONES.place)}px`],
      ['resume', `${String(HAUTEURS_ZONES.resume)}px`],
      ['pli', `${String(HAUTEURS_ZONES.pli)}px`],
      ['colonne', '0px'],
      ['barre', `${String(HAUTEURS_ZONES.barre)}px`],
    ]);
    // La frise : le menu « … » à trois traits de burin, « Carte » à l'appui long, le son.
    expect(screen.getByRole('button', { name: 'Menu de la table' }).querySelector('[data-icone="menu"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ma carte' })).toHaveAttribute('aria-keyshortcuts', 'Space Enter');
  });

  it('un mort lit « Tout voir, enfin, et trop tard. », garde sa carte sous le pouce et le pli de l’au-delà', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const condamne = banc.siege('villageois');
    for (const joueur of banc.state.players) {
      if (joueur.seat !== condamne && joueur.seat !== 0) banc.agir(joueur.seat, { type: 'voter', target: condamne });
    }
    // Encore en jour (le siège 0 n'a pas voté) : on regarde la place d'un mort retouché.
    const room = publier(banc, condamne, (vue) => {
      vue.you = { ...vue.you!, alive: false };
      vue.players[condamne] = { ...vue.players[condamne]!, alive: false };
      vue.prompt = null;
      vue.channels = ['morts'];
    });
    render(<Partie room={room} />);
    expect(screen.getByTestId('consigne')).toHaveTextContent('« Tout voir, enfin, et trop tard. »');
    expect(screen.getByTestId('resume')).toHaveTextContent('Les morts ne votent pas.');
    expect(screen.getByRole('button', { name: 'Gardez le pouce : ma carte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /L’au-delà/ })).toBeInTheDocument();
  });

  it('le gracié : la légende de l’Idiot, le bouton éteint et sa raison — jamais par la pâleur', () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0, (vue) => {
      vue.you = { ...vue.you!, canVote: false };
      vue.players[0] = { ...vue.players[0]!, canVote: false };
      vue.prompt = null;
    });
    render(<Partie room={room} />);
    expect(screen.getByTestId('consigne')).toHaveTextContent('« Gracié, et toujours pas écouté. »');
    const raison = screen.getByTestId('gracie');
    expect(raison).toHaveTextContent('La grâce vous a coûté votre voix.');
    const voter = screen.getByRole('button', { name: 'Voter' });
    expect(voter).toBeDisabled();
    expect(voter).toHaveAttribute('aria-describedby', raison.id);
  });

  it('la succession : un seul bouton, armé « sans retour »', async () => {
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0, (vue) => {
      vue.phase = 'succession';
      vue.prompt = { kind: 'successeur' };
      vue.you = { ...vue.you!, alive: false };
      vue.players[0] = { ...vue.players[0]!, alive: false, isCaptain: true };
    });
    const utilisateur = userEvent.setup();
    render(<Partie room={room} />);
    expect(screen.getByRole('button', { name: 'Transmettre…' })).toBeDisabled();
    await utilisateur.click(within(screen.getByTestId('place')).getByRole('button', { name: /^Joueur 4( —|$)/ }));
    expect(screen.getByTestId('resume')).toHaveTextContent('Votre choix : Joueur 4');
    await utilisateur.click(screen.getByRole('button', { name: 'Transmettre à Joueur 4' }));
    await utilisateur.click(
      screen.getByRole('button', { name: 'Confirmer — sans retour : transmettre le brassard à Joueur 4' }),
    );
    expect(jouer).toHaveBeenCalledWith({ type: 'successeur', target: 4 });
  });

  it('les bâtons du dépouillement : la marque du Corbeau se signe d’une plume', () => {
    const banc = new Banc(8, { capitaine: false, roles: ['corbeau', 'voyante'], auto: false, loups: 2 });
    for (const joueur of banc.state.players) banc.agir(joueur.seat, { type: 'pret' });
    const corbeau = banc.siege('corbeau');
    const marque = banc.state.players.find((p) => p.role === 'villageois')!.seat;
    banc.agir(corbeau, { type: 'marquer', target: marque }).jusquAuMatin();
    expect(banc.state.phase.kind).toBe('jour');
    const room = publier(banc, null);
    render(<Partie room={room} />);

    const avant = banc.events.length;
    for (const joueur of banc.state.players.filter((p) => p.alive)) {
      if (banc.state.phase.kind !== 'jour') break;
      banc.agir(joueur.seat, { type: 'voter', target: joueur.seat === marque ? null : marque });
    }
    act(() => {
      publier(banc, null, undefined, avant);
    });
    const ligne = screen.getByTestId('depouillement').querySelector(`[data-cible="${String(marque)}"]`) as HTMLElement;
    expect(ligne.querySelector('[data-glyphe="marque"]')).not.toBeNull();
    expect(ligne).toHaveTextContent('le Corbeau +2');
    // Un trait par voix (le +2 compris), le cinquième en travers.
    const voix = Number(ligne.querySelector('[data-batons]')?.getAttribute('data-batons'));
    expect(voix).toBeGreaterThanOrEqual(2);
    expect(ligne.querySelector('[data-batons] > path')?.getAttribute('d')?.match(/M/g)).toHaveLength(voix);
  });

  it('la Scène TV (?scene=1, sans siège) : le cercle, le crieur en grand, le compte — sans consigne ni carte', () => {
    window.history.replaceState(null, '', '/?scene=1');
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    banc.agir(1, { type: 'voter', target: 2 });
    const room = publier(banc, null);
    render(<Partie room={room} />);
    expect(screen.getByTestId('scene-tv')).toBeInTheDocument();
    expect(screen.getByTestId('scene-compte')).toHaveTextContent('1 sur 8 a voté');
    expect(screen.getByTestId('scene-crieur')).toHaveTextContent('Personne n’est mort cette nuit');
    expect(screen.queryByTestId('consigne')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ma carte' })).toBeNull();
    expect(screen.queryByTestId('fil-tiroir')).toBeNull();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('un joueur qui ouvre ?scene=1 garde son écran de joueur', () => {
    window.history.replaceState(null, '', '/?scene=1');
    const banc = new Banc(8, { capitaine: false }).jusquAuMatin();
    const room = publier(banc, 0);
    render(<Partie room={room} />);
    expect(screen.queryByTestId('scene-tv')).toBeNull();
    expect(screen.getByTestId('ecran-jour')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ma carte' }), { key: 'Escape' });
  });
});
