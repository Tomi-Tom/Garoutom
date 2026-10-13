/* @vitest-environment jsdom */
/**
 * Les planches passagères — le dépouillement et l'aube — sur des vues que le
 * moteur a vraiment produites (une partie menée avec `createGame`,
 * `applyAction`, `timeoutPhase`, taillée par `viewFor`).
 *
 * Ce qu'on prouve : la planche se pose quand l'évènement **arrive** (jamais
 * au montage, jamais pour un évènement rejoué), se referme seule après
 * `DUREE_PLANCHE_MS` — par le minuteur, mais aussi au retour de visibilité
 * ou à la vue suivante quand le minuteur a été bridé —, se passe d'un
 * toucher, cède quand la phase change, et ne se pose pas à la fin.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

import { useStore, type EvenementRecu } from '../../../lib/store.js';
import { Partie } from '../../../screens/Partie.js';
import { chiffreRomain } from './Aube.js';
import { DUREE_PLANCHE_MS, planchesArrivees, purger } from './PlanchePassagere.js';

vi.mock('../../../lib/actions.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/actions.js')>()),
  jouer: vi.fn(() => Promise.resolve()),
  quitterTable: vi.fn(() => Promise.resolve()),
}));

// Les écrans des autres ateliers : un repère, rien de plus.
vi.mock('../Fil.js', async () => {
  const { createElement } = await import('react');
  return { Fil: ({ mode }: { mode: string }) => createElement('div', { 'data-testid': `fil-${mode}` }) };
});
vi.mock('../Nuit.js', async () => {
  const { createElement } = await import('react');
  return { Nuit: () => createElement('div', { 'data-testid': 'ecran-nuit' }) };
});
vi.mock('../Revelation.js', async () => {
  const { createElement } = await import('react');
  return { Revelation: () => createElement('div', { 'data-testid': 'ecran-revelation' }) };
});
vi.mock('../Fin.js', async () => {
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

  /** Tout le monde retourne sa carte : la nuit tombe. */
  jusquALaNuit(): this {
    for (const joueur of this.state.players) this.agir(joueur.seat, { type: 'pret' });
    return this;
  }

  /** La nuit passe, sans plus personne pour jouer. */
  jusquAuJour(): this {
    while (this.state.phase.kind === 'nuit') this.cloturer();
    return this;
  }

  /** La meute dévore `cible`, d'une seule voix. */
  devorer(cible: number): this {
    for (const loup of this.state.players.filter((p) => p.alive && p.role === 'loup')) {
      this.agir(loup.seat, { type: 'devorer', target: cible });
    }
    return this;
  }

  /** Tout le village vote contre `cible` (qui s'abstient). */
  voterContre(cible: number): this {
    for (const joueur of this.state.players.filter((p) => p.alive)) {
      if (this.state.phase.kind !== 'jour') break;
      this.agir(joueur.seat, { type: 'voter', target: joueur.seat === cible ? null : cible });
    }
    return this;
  }

  siege(role: RoleId, sauf: number[] = []): number {
    const joueur = this.state.players.find((p) => p.role === role && p.alive && !sauf.includes(p.seat));
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

/** Pousse la vue du siège 0 au magasin, comme un `sync` du serveur. */
function publier(
  banc: Banc,
  { depuis = 0, rejoue = false, retouche }: { depuis?: number; rejoue?: boolean; retouche?: (vue: GameView) => void } = {},
): RoomView {
  const room = salle(banc.state.players.length, banc.state.options);
  const game = viewFor(banc.state, 0);
  retouche?.(game);
  useStore.getState().applySync({
    room,
    game,
    events: banc.events.slice(depuis),
    seq: banc.events.length,
    serverNow: Date.now(),
    ...(rejoue ? { replay: true } : {}),
  });
  useStore.setState({ playerId: 'p0' });
  return room;
}

/** Une partie de 8, montée en pleine nuit 1. */
function monterLaNuit(ecarts: Partial<GameOptions> = {}): { banc: Banc; demonter: () => void } {
  const banc = new Banc(8, { capitaine: false, ...ecarts }).jusquALaNuit();
  expect(banc.state.phase.kind).toBe('nuit');
  const room = publier(banc);
  const vue = render(<Partie room={room} />);
  expect(screen.queryByTestId('aube')).toBeNull();
  return { banc, demonter: vue.unmount };
}

/** Publie ce que `faire` a produit depuis le dernier `sync`. */
function arrive(banc: Banc, faire: () => void, options: { rejoue?: boolean; retouche?: (vue: GameView) => void } = {}) {
  const avant = banc.events.length;
  faire();
  act(() => {
    publier(banc, { ...options, depuis: avant });
  });
}

/** Les identifiants du moteur, nus et en minuscules : jamais à l'écran. */
const IDENTIFIANTS_BRUTS = /\b(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot|corbeau|election)\b/;

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/');
  useStore.setState({ playerId: null, room: null, game: null, chronique: [], notices: [], live: null, dernierSeq: null });
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* Le dépouillement                                                    */
/* ------------------------------------------------------------------ */

/** Une partie montée au jour 1, puis un vote qui se clôt sur un villageois. */
function monterUnVote(): { banc: Banc; demonter: () => void; condamne: number } {
  const banc = new Banc(8, { capitaine: false }).jusquALaNuit().jusquAuJour();
  expect(banc.state.phase.kind).toBe('jour');
  const room = publier(banc);
  const vue = render(<Partie room={room} />);
  // Rien au montage : ni le dépouillement, ni l'aube déjà passée.
  expect(screen.queryByRole('dialog', { name: 'Le dépouillement' })).toBeNull();
  expect(screen.queryByTestId('aube')).toBeNull();
  const condamne = banc.siege('villageois');
  arrive(banc, () => banc.voterContre(condamne));
  return { banc, demonter: vue.unmount, condamne };
}

describe('la planche du dépouillement', () => {
  it('se referme seule après quatre secondes, la même durée pour tous', () => {
    const { condamne } = monterUnVote();
    const planche = screen.getByRole('dialog', { name: 'Le dépouillement' });
    expect(within(planche).getByTestId('verdict')).toHaveTextContent(`la potence est pour Joueur ${String(condamne)}`);
    expect(within(planche).getByRole('button', { name: 'Toucher pour passer' })).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(DUREE_PLANCHE_MS - 50));
    expect(screen.getByTestId('depouillement')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(50));
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('se passe d’un toucher sur « Toucher pour passer »', () => {
    monterUnVote();
    fireEvent.click(within(screen.getByTestId('depouillement')).getByRole('button', { name: 'Toucher pour passer' }));
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('un toucher n’importe où sur la planche la passe aussi', () => {
    monterUnVote();
    fireEvent.click(screen.getByText('Les voix sont comptées'));
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('ne réapparaît pas au remontage de l’écran', () => {
    const { demonter } = monterUnVote();
    expect(screen.getByTestId('depouillement')).toBeInTheDocument();
    demonter();
    const room = useStore.getState().room!;
    render(<Partie room={room} />);
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('minuteur bridé (onglet en arrière-plan) : l’échéance absolue la referme au retour de visibilité', () => {
    monterUnVote();
    // L'heure avance sans que le minuteur ne parte, comme dans un onglet caché.
    vi.setSystemTime(Date.now() + DUREE_PLANCHE_MS + 1_000);
    expect(screen.getByTestId('depouillement')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('minuteur bridé : la vue de partie suivante la referme aussi', () => {
    const { banc } = monterUnVote();
    vi.setSystemTime(Date.now() + DUREE_PLANCHE_MS + 1_000);
    act(() => {
      publier(banc, { depuis: banc.events.length });
    });
    expect(screen.queryByTestId('depouillement')).toBeNull();
  });

  it('cède dès que la phase change encore : la nuit passe, l’aube prend sa place', () => {
    const { banc, condamne } = monterUnVote();
    expect(banc.state.phase.kind).toBe('nuit');
    expect(screen.getByTestId('depouillement')).toBeInTheDocument();
    const victime = banc.siege('villageois', [condamne]);
    arrive(banc, () => banc.devorer(victime).jusquAuJour());
    expect(screen.queryByTestId('depouillement')).toBeNull();
    expect(screen.getByTestId('aube')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* L'aube                                                              */
/* ------------------------------------------------------------------ */

describe('la planche d’aube', () => {
  it('avec des morts : « Aube I », les yeux dans le noir, « Personne ne nous a vus. », la mort criée', () => {
    const { banc } = monterLaNuit();
    const victime = banc.siege('villageois');
    arrive(banc, () => banc.devorer(victime).jusquAuJour());

    const planche = screen.getByRole('dialog', { name: 'Aube I — Personne ne nous a vus.' });
    expect(within(planche).getByTestId('aube-titre')).toHaveTextContent('Aube I');
    expect(planche.querySelector('[data-vignette="yeux"]')).not.toBeNull();
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« Personne ne nous a vus. »');
    const ligne = planche.querySelector('[data-ligne][data-mort]');
    expect(ligne).toHaveTextContent(`Joueur ${String(victime)}`);
    expect(ligne?.querySelector('[data-icone="chandelle"]')).not.toBeNull();
    expect(planche.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
  });

  it('paisible : le dormeur, « Tous sont là. Personne n’est rassuré. », le village entier', () => {
    const { banc } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour());

    const planche = screen.getByTestId('aube');
    expect(planche).toHaveAccessibleName('Aube I — Tous sont là. Personne n’est rassuré.');
    expect(planche.querySelector('[data-vignette="dormeur"]')).not.toBeNull();
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« Tous sont là. Personne n’est rassuré. »');
    expect(planche).toHaveTextContent('Personne n’est mort cette nuit. Le village se réveille entier.');
    expect(planche.querySelector('[data-mort]')).toBeNull();
  });

  it('le Corbeau : la lettre cachetée, « La lettre n’était pas signée. », la mort puis la marque', () => {
    const { banc } = monterLaNuit({ roles: ['corbeau', 'voyante'], auto: false, loups: 2 });
    const marque = banc.siege('villageois');
    const victime = banc.siege('villageois', [marque]);
    arrive(banc, () => banc.agir(banc.siege('corbeau'), { type: 'marquer', target: marque }).devorer(victime).jusquAuJour());

    const planche = screen.getByTestId('aube');
    expect(planche.querySelector('[data-vignette="lettre"]')).not.toBeNull();
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« La lettre n’était pas signée. »');
    const lignes = [...planche.querySelectorAll('[data-ligne]')];
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toHaveTextContent(`Joueur ${String(victime)}`);
    expect(lignes[1]).toHaveTextContent(
      `Le Corbeau a désigné Joueur ${String(marque)} : au vote du jour, deux voix sont déjà comptées.`,
    );
    expect(lignes[1]?.querySelector('[data-icone="plume"]')).not.toBeNull();
  });

  it('Shiganshina : les légendes et les phrases du skin, jamais celles de Thiercelieux', () => {
    const { banc } = monterLaNuit({ skin: 'shiganshina' });
    const victime = banc.siege('villageois');
    arrive(banc, () => banc.devorer(victime).jusquAuJour());
    const planche = screen.getByTestId('aube');
    expect(within(planche).getByTestId('aube-titre')).toHaveTextContent('Aube I');
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« On ne les a pas entendus venir. »');
    expect(planche).not.toHaveTextContent('La meute');
  });

  it('Gilets Jaunes : les légendes et les phrases du rond-point, jamais celles de Thiercelieux', () => {
    const { banc } = monterLaNuit({ skin: 'giletsjaunes' });
    const victime = banc.siege('villageois');
    arrive(banc, () => banc.devorer(victime).jusquAuJour());
    const planche = screen.getByTestId('aube');
    expect(within(planche).getByTestId('aube-titre')).toHaveTextContent('Aube I');
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« Les balcons n’ont rien vu. »');
    expect(planche).not.toHaveTextContent('La meute');
  });

  it('Far West : les légendes et les phrases du bourg, jamais celles de Thiercelieux', () => {
    const { banc } = monterLaNuit({ skin: 'farwest' });
    const victime = banc.siege('villageois');
    arrive(banc, () => banc.devorer(victime).jusquAuJour());
    const planche = screen.getByTestId('aube');
    expect(within(planche).getByTestId('aube-titre')).toHaveTextContent('Aube I');
    expect(within(planche).getByTestId('aube-legende')).toHaveTextContent('« La rue ne dira rien. »');
    expect(planche).not.toHaveTextContent('La meute');
  });

  it('se referme seule, et un toucher la passe', () => {
    const { banc } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour());
    expect(screen.getByTestId('aube')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(DUREE_PLANCHE_MS));
    expect(screen.queryByTestId('aube')).toBeNull();
    // Le jour reste là, intact, avec son action.
    expect(screen.getByTestId('ecran-jour')).toBeInTheDocument();
  });

  it('les scènes de jour qui s’enchaînent ne l’écourtent pas : l’élection cède au vote, l’aube reste', () => {
    const { banc } = monterLaNuit({ capitaine: true });
    arrive(banc, () => banc.jusquAuJour());
    expect(banc.state.phase.kind).toBe('election');
    expect(screen.getByTestId('aube')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1_000));
    arrive(banc, () => banc.cloturer());
    expect(banc.state.phase.kind).toBe('jour');
    expect(screen.getByTestId('aube')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(DUREE_PLANCHE_MS - 1_000));
    expect(screen.queryByTestId('aube')).toBeNull();
  });

  it('un toucher la passe', () => {
    const { banc } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour());
    fireEvent.click(within(screen.getByTestId('aube')).getByRole('button', { name: 'Toucher pour passer' }));
    expect(screen.queryByTestId('aube')).toBeNull();
  });

  it('n’apparaît pas pour une chronique rejouée à la reprise', () => {
    const { banc } = monterLaNuit();
    const victime = banc.siege('villageois');
    arrive(banc, () => banc.devorer(victime).jusquAuJour(), { rejoue: true });
    expect(useStore.getState().chronique.some((recu) => recu.event.type === 'morts' && recu.rejoue === true)).toBe(true);
    expect(screen.queryByTestId('aube')).toBeNull();
  });

  it('n’apparaît pas au montage d’un jour déjà levé, ni au remontage', () => {
    const { banc, demonter } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour());
    expect(screen.getByTestId('aube')).toBeInTheDocument();
    demonter();
    render(<Partie room={useStore.getState().room!} />);
    expect(screen.queryByTestId('aube')).toBeNull();
  });

  it('ne se pose pas à la fin de partie : la fin a son verdict', () => {
    const { banc } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour(), {
      retouche: (vue) => {
        vue.phase = 'fin';
      },
    });
    expect(screen.queryByTestId('aube')).toBeNull();
  });

  it('le deuxième matin : « Aube II »', () => {
    const { banc } = monterLaNuit();
    arrive(banc, () => banc.jusquAuJour());
    act(() => void vi.advanceTimersByTime(DUREE_PLANCHE_MS));
    const condamne = banc.siege('villageois');
    arrive(banc, () => banc.voterContre(condamne));
    expect(screen.getByTestId('depouillement')).toBeInTheDocument();
    arrive(banc, () => banc.jusquAuJour());
    expect(screen.queryByTestId('depouillement')).toBeNull();
    expect(screen.getByTestId('aube-titre')).toHaveTextContent('Aube II');
  });
});

/* ------------------------------------------------------------------ */
/* La file, en logique pure                                            */
/* ------------------------------------------------------------------ */

describe('la file des planches', () => {
  const vote = (id: number, recuA: number): EvenementRecu => ({
    id,
    day: 1,
    recuA,
    event: { type: 'vote', tally: { 1: 3 }, executed: 1 },
  });
  const entree = (id: number, arrivee: number, moment = 'jour-1') => ({
    planche: { genre: 'depouillement' as const, cle: id, recu: vote(id, arrivee) },
    arrivee,
    moment,
  });

  it('deux planches qui se suivent : la seconde attend la première, puis tient sa durée', () => {
    const file = { entrees: [entree(1, 1_000), entree(2, 1_500)], fin: 0 };
    expect(purger(file, 4_999, 'jour-1')).toBe(file);
    const apres = purger(file, 5_000, 'jour-1');
    expect(apres.entrees.map((e) => e.planche.cle)).toEqual([2]);
    expect(apres.fin).toBe(5_000);
    expect(purger(apres, 8_999, 'jour-1').entrees).toHaveLength(1);
    expect(purger(apres, 9_000, 'jour-1').entrees).toHaveLength(0);
  });

  it('un onglet qui revient longtemps après ne rejoue rien : tout est échu', () => {
    const file = { entrees: [entree(1, 1_000, 'nuit-1'), entree(2, 3_000, 'jour-1')], fin: 0 };
    expect(purger(file, 60_000, 'jour-1').entrees).toHaveLength(0);
  });

  it('la phase change : la planche d’un autre moment tombe, la suivante part de là', () => {
    const file = { entrees: [entree(1, 1_000, 'nuit-1'), entree(2, 2_000, 'jour-1')], fin: 0 };
    const apres = purger(file, 2_000, 'jour-1');
    expect(apres.entrees.map((e) => e.planche.cle)).toEqual([2]);
    expect(apres.fin).toBe(2_000);
  });

  it('la fin de partie vide la file', () => {
    const file = { entrees: [entree(1, 1_000)], fin: 0 };
    expect(purger(file, 1_500, 'fin-3').entrees).toHaveLength(0);
  });

  it('un évènement rejoué ne fait naître aucune planche', () => {
    const recu = { ...vote(1, 0), rejoue: true as const };
    expect(planchesArrivees([recu], [recu])).toEqual([]);
    expect(planchesArrivees([vote(2, 0)], [vote(2, 0)]).map((p) => p.genre)).toEqual(['depouillement']);
  });

  it('les jours en chiffres romains', () => {
    expect([1, 2, 3, 4, 9, 12, 14, 40].map(chiffreRomain)).toEqual(['I', 'II', 'III', 'IV', 'IX', 'XII', 'XIV', 'XL']);
  });
});
