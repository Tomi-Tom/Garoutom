/* @vitest-environment jsdom */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type Channel, type GameOptions, type RoomView, type SyncPayload } from '@garoutom/engine';

import { installeCanal } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { voixDuSkin } from '../skins/registre.js';
import { Salon } from './Salon.js';

/*
 * Le salon de « Caprices » : ce que la vague 2 ajoute aux tests historiques
 * de `Salon.render.test.tsx` — la case d'abandon, les jetons à couvre-chef,
 * les fenêtres de la frise, les trois colonnes du bureau, les trois étapes
 * du téléphone.
 */

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
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

function sync(nombre: number, options: GameOptions = DEFAULT_OPTIONS): SyncPayload {
  return { room: salle(nombre, options), game: null, events: [], seq: 0, serverNow: Date.now() };
}

function doublureCanal(): Channel {
  return { request: vi.fn(() => Promise.resolve(null)) } as unknown as Channel;
}

/**
 * Le salon a deux plans : trois étapes sur le téléphone, trois colonnes sur le
 * bureau (min-width 64rem). jsdom n'a pas de mise en page : on dit au test de
 * quelle largeur il est.
 */
const matchMediaDOrigine = window.matchMedia;
function fixeLargeur(large: boolean): void {
  window.matchMedia = ((query: string) =>
    ({
      matches: large,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

function prepare(large: boolean): Channel {
  fixeLargeur(large);
  localStorage.clear();
  const canal = doublureCanal();
  installeCanal(() => canal);
  useStore.setState({ playerId: null, room: null, game: null, decalageHorloge: null, notices: [], live: null });
  return canal;
}

describe('<Salon /> — sur le bureau, trois colonnes', () => {
  let canal: Channel;

  beforeEach(() => {
    canal = prepare(true);
  });

  afterEach(() => {
    window.matchMedia = matchMediaDOrigine;
  });

  it('la mort d’abandon (R101) a sa case, cochée par défaut, et l’explique en une ligne', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    const laCase = screen.getByRole('checkbox', { name: /Mort d’abandon/ });
    expect(laCase).toBeEnabled();
    expect(laCase).toBeChecked();
    expect(screen.getByText(/absent depuis cinq minutes meurt d’abandon/)).toBeInTheDocument();

    await utilisateur.click(laCase);
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, abandon: false },
      });
    });
  });

  it('l’invité voit la case d’abandon, sans pouvoir la toucher', () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, abandon: false }));
    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);
    const laCase = screen.getByRole('checkbox', { name: /Mort d’abandon/ });
    expect(laCase).toBeDisabled();
    expect(laCase).not.toBeChecked();
  });

  it('chaque siège porte son couvre-chef, nommé dans la voix du skin, et « moi » son cadre', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p2' });
    const { container } = render(<Salon room={useStore.getState().room!} />);

    expect(container.querySelectorAll('[data-jeton]')).toHaveLength(6);
    const voix = voixDuSkin('thiercelieux');
    for (let siege = 1; siege <= 6; siege += 1) {
      const jeton = container.querySelector(`[data-jeton="${String(siege)}"]`)!;
      expect(jeton.querySelector(`[data-couvre-chef="${String(siege)}"]`)).not.toBeNull();
      expect(jeton).toHaveTextContent(voix.nomCouvreChef(siege));
    }
    expect(container.querySelectorAll('[data-moi]')).toHaveLength(1);
    expect(container.querySelector('[data-moi]')).toHaveTextContent('Joueur 2');
    expect(container.querySelector('[data-moi]')).toHaveTextContent('vous');
  });

  it('à Shiganshina, les couvre-chefs ont les noms du district', () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, skin: 'shiganshina' }));
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);
    const voix = voixDuSkin('shiganshina');
    expect(container.querySelector('[data-jeton="1"]')).toHaveTextContent(voix.nomCouvreChef(1));
  });

  it('aux Gilets Jaunes, les couvre-chefs ont les noms du rond-point', () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, skin: 'giletsjaunes' }));
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);
    const voix = voixDuSkin('giletsjaunes');
    expect(container.querySelector('[data-jeton="1"]')).toHaveTextContent(voix.nomCouvreChef(1));
  });

  it('une arrivée allume une fenêtre dans la frise, au siège de l’arrivant — puis elle s’éteint', () => {
    vi.useFakeTimers();
    try {
      useStore.getState().applySync(sync(2));
      useStore.setState({ playerId: 'p0' });
      const vue = render(<Salon room={useStore.getState().room!} />);
      expect(document.querySelector('[data-fenetre-allumee]')).toBeNull();

      useStore.getState().applySync(sync(3));
      vue.rerender(<Salon room={useStore.getState().room!} />);
      const fenetre = document.querySelector('[data-fenetre-allumee]');
      expect(fenetre).not.toBeNull();
      expect(fenetre?.getAttribute('data-fenetre-allumee')).toBe('2');
      // La fenêtre est dans la frise, pas dans la page.
      expect(fenetre?.closest('.frise')).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(8_100);
      });
      expect(document.querySelector('[data-fenetre-allumee]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sous six joueurs, la table montre la place qui attend encore', () => {
    useStore.getState().applySync(sync(5));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);
    expect(screen.getByLabelText('Sixième place, libre')).toBeInTheDocument();
  });

  it('la table est un cercle jusqu’à douze joueurs ; au-delà, une grille', () => {
    useStore.getState().applySync(sync(12));
    useStore.setState({ playerId: 'p0' });
    const { container, unmount } = render(<Salon room={useStore.getState().room!} />);
    expect(container.querySelector('[data-cercle]')).not.toBeNull();
    unmount();

    useStore.getState().applySync(sync(13));
    const autre = render(<Salon room={useStore.getState().room!} />);
    expect(autre.container.querySelector('[data-cercle]')).toBeNull();
  });

  it('les trois colonnes sont là d’un coup, et « Lancer la partie » est au bas de la colonne centrale', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);
    const donne = screen.getByTestId('donne-salon');
    expect(within(donne).getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
    expect(screen.getByTestId('regles-salon')).toBeInTheDocument();
    // Pas de cartouches d'étapes sur le bureau.
    expect(screen.queryByRole('navigation', { name: 'Étapes du salon' })).toBeNull();
  });

  it('les minuteries se règlent pas à pas, bornées par le moteur', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('button', { name: /Temps de la nuit : plus 5 secondes/ }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, tempsNuit: DEFAULT_OPTIONS.tempsNuit + 5 },
      });
    });
  });

  it('la main mise : huit cartes à cocher, une carte du reste du village, les loups au pas', async () => {
    useStore.getState().applySync(sync(10, { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante'] }));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    const { container } = render(<Salon room={useStore.getState().room!} />);

    const speciaux = screen.getByRole('group', { name: 'Rôles spéciaux' });
    expect(within(speciaux).getAllByRole('button')).toHaveLength(6);
    expect(within(speciaux).getByRole('button', { name: /Voyante/ })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-carte-village]')).toHaveTextContent('× 7, le reste');

    await utilisateur.click(screen.getByRole('button', { name: /Nombre de loups : plus un loup/ }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, auto: false, loups: 3, roles: ['voyante'] },
      });
    });
  });

  it('la donne se lit en vignettes de rôle, sans en parler aux lecteurs d’écran (la phrase suffit)', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);
    const vignettes = container.querySelector('[data-vignettes]');
    expect(vignettes).toHaveAttribute('aria-hidden', 'true');
    // Loups, Voyante, Sorcière : trois vignettes à six joueurs.
    expect(vignettes?.querySelectorAll('li')).toHaveLength(3);
    expect(vignettes).toHaveTextContent('×2');
  });
});

describe('<Salon /> — sur le téléphone, trois étapes pour l’hôte', () => {
  let canal: Channel;

  beforeEach(() => {
    canal = prepare(false);
  });

  afterEach(() => {
    window.matchMedia = matchMediaDOrigine;
  });

  const etapeCourante = () => screen.getByRole('button', { current: 'step' }).textContent;

  it('l’hôte commence par la table : cartouches d’étapes, « Suivant : la donne » collé en bas', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const etapes = screen.getByRole('navigation', { name: 'Étapes du salon' });
    expect(within(etapes).getAllByRole('button').map((b) => b.textContent)).toEqual(['La table', 'La donne', 'Les règles']);
    expect(etapeCourante()).toBe('La table');
    expect(screen.getByRole('button', { name: 'Suivant : la donne' })).toBeEnabled();
    // Seule l'étape courante est à l'écran.
    expect(screen.queryByTestId('donne-salon')).toBeNull();
    expect(screen.queryByTestId('regles-salon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Lancer la partie' })).toBeNull();
  });

  it('sous six joueurs, « Suivant » est éteint et dit pourquoi', () => {
    useStore.getState().applySync(sync(5));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const suivant = screen.getByRole('button', { name: 'Suivant : la donne' });
    expect(suivant).toBeDisabled();
    expect(screen.getByText('Il manque 1 joueur')).toBeInTheDocument();
    expect(suivant).toHaveAccessibleDescription('Il manque 1 joueur');
    // La raison complète est dite sur la page : combien, et que faire.
    expect(screen.getByText(/Il faut 6 joueurs pour lancer — 5 à la table, il en manque 1/)).toBeInTheDocument();
  });

  it('les cartouches et « Suivant » parcourent la table, la donne, les règles — puis « Lancer la partie »', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('button', { name: 'Suivant : la donne' }));
    expect(etapeCourante()).toBe('La donne');
    expect(screen.getByTestId('donne-salon')).toBeInTheDocument();
    expect(screen.queryByTestId('regles-salon')).toBeNull();
    // La barre porte le résumé de la donne.
    expect(screen.getByText(/pour 6 joueurs/)).toBeInTheDocument();

    await utilisateur.click(screen.getByRole('button', { name: 'Suivant : les règles' }));
    expect(etapeCourante()).toBe('Les règles');
    expect(screen.getByTestId('regles-salon')).toBeInTheDocument();
    expect(screen.getByTestId('recap-salon')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Mort d’abandon/ })).toBeEnabled();

    await utilisateur.click(screen.getByRole('button', { name: 'Lancer la partie' }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:start', {});
    });

    // Un cartouche ramène à l'étape voulue.
    await utilisateur.click(screen.getByRole('button', { name: /La table/ }));
    expect(etapeCourante()).toBe('La table');
  });

  it('à la dernière étape, une composition injouable éteint le lancement et dit pourquoi', async () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false, loups: 3, roles: ['voyante'] }));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);
    await utilisateur.click(screen.getByRole('button', { name: /Les règles/ }));

    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
    expect(screen.getByText(/Trop de loups pour cette table/)).toBeInTheDocument();
  });

  it('les autres joueurs lisent les trois chapitres d’une traite, avec un bouton éteint « En attente de l’hôte »', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.queryByRole('navigation', { name: 'Étapes du salon' })).toBeNull();
    expect(screen.getByTestId('donne-salon')).toBeInTheDocument();
    expect(screen.getByTestId('regles-salon')).toBeInTheDocument();
    const attente = screen.getByRole('button', { name: 'En attente de l’hôte' });
    expect(attente).toBeDisabled();
    expect(attente).toHaveAccessibleDescription(/l’hôte peut lancer la partie/);
    expect(screen.queryByRole('button', { name: /lancer la partie/i })).toBeNull();
  });

  it('l’univers se choisit dans les règles sur le téléphone, dans la donne sur le bureau', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    const { unmount } = render(<Salon room={useStore.getState().room!} />);
    await utilisateur.click(screen.getByRole('button', { name: /La donne/ }));
    expect(screen.queryByRole('radiogroup', { name: 'Univers de la table' })).toBeNull();
    await utilisateur.click(screen.getByRole('button', { name: /Les règles/ }));
    expect(screen.getByRole('radiogroup', { name: 'Univers de la table' })).toBeInTheDocument();
    unmount();

    fixeLargeur(true);
    render(<Salon room={useStore.getState().room!} />);
    expect(
      within(screen.getByTestId('donne-salon')).getByRole('radiogroup', { name: 'Univers de la table' }),
    ).toBeInTheDocument();
  });
});

describe('<Salon /> — la frise tient dans le téléphone, la table dit les noms entiers', () => {
  let canal: Channel;

  afterEach(() => {
    window.matchMedia = matchMediaDOrigine;
  });

  it('sous le bureau, la frise garde le son et range règles, réglages et « Quitter » dans le menu', async () => {
    canal = prepare(false);
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p3' });
    const utilisateur = userEvent.setup();
    const { container } = render(<Salon room={useStore.getState().room!} />);

    const frise = container.querySelector<HTMLElement>('.frise')!;
    // À droite : le menu « … » et le son, deux boutons de 44 — rien d'autre.
    const droite = frise.querySelector<HTMLElement>('.frise-droite')!;
    expect(within(droite).getByRole('button', { name: 'Menu du salon' })).toHaveAttribute('aria-haspopup', 'dialog');
    expect(within(droite).getByRole('button', { name: /le son/ })).toBeInTheDocument();
    expect(within(frise).queryByRole('button', { name: 'Règles' })).toBeNull();
    expect(within(frise).queryByRole('button', { name: 'Réglages' })).toBeNull();
    expect(within(frise).queryByRole('button', { name: 'Quitter' })).toBeNull();

    // Le menu ouvre une feuille basse : règles, réglages, quitter.
    await utilisateur.click(within(droite).getByRole('button', { name: 'Menu du salon' }));
    const feuille = screen.getByRole('dialog', { name: 'Table TEST' });
    expect(within(feuille).getByRole('button', { name: 'Règles' })).toBeInTheDocument();
    expect(within(feuille).getByRole('button', { name: 'Réglages' })).toBeInTheDocument();
    await utilisateur.click(within(feuille).getByRole('button', { name: 'Quitter la table' }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:leave', {});
    });
  });

  it('sur le bureau, règles, réglages, son et « Quitter » restent à vue dans la frise, sans menu', () => {
    prepare(true);
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);
    const droite = container.querySelector<HTMLElement>('.frise-droite')!;
    for (const nom of ['Règles', 'Réglages', 'Quitter']) {
      expect(within(droite).getByRole('button', { name: nom })).toBeInTheDocument();
    }
    expect(within(droite).queryByRole('button', { name: 'Menu du salon' })).toBeNull();
  });

  it('autour du cercle, aucun nom n’est tronqué ni ne passe sous la carte du milieu', () => {
    prepare(true);
    const pseudos = ['Anna', 'Bot Fernand', 'Bot Mireille', 'Bot Colette', 'Bot Gaston', 'Bot Hortense', 'Bot Isidore', 'Bot Jules'];
    const room = salle(8);
    room.players = room.players.map((joueur, i) => ({ ...joueur, name: pseudos[i] ?? joueur.name }));
    useStore.getState().applySync({ room, game: null, events: [], seq: 0, serverNow: Date.now() });
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);

    expect(container.querySelector('[data-cercle]')).not.toBeNull();
    // Le nom passe à la ligne s'il le faut, il n'est plus coupé en « Bot Fern… ».
    for (const nom of container.querySelectorAll('[data-nom]')) {
      expect(nom.className).not.toMatch(/truncate/);
    }
    expect(screen.getByText('Bot Mireille')).toBeInTheDocument();

    // Les boîtes posées : ni sous la carte, ni l'une sur l'autre, ni hors du cercle.
    const boite = (el: Element) => {
      const s = (el as HTMLElement).style;
      return { x: parseFloat(s.left), y: parseFloat(s.top), l: parseFloat(s.width), h: parseFloat(s.height) };
    };
    const touche = (a: ReturnType<typeof boite>, b: ReturnType<typeof boite>) =>
      a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.h && b.y < a.y + a.h;
    const cadre = boite(container.querySelector('[data-cercle]')!);
    const carte = boite(container.querySelector('[data-carte-table]')!);
    const jetons = [...container.querySelectorAll('[data-jeton]')].map(boite);
    expect(jetons).toHaveLength(8);
    for (const [i, jeton] of jetons.entries()) {
      expect(jeton.l).toBeGreaterThanOrEqual(112);
      expect(touche(jeton, carte)).toBe(false);
      expect(jeton.x).toBeGreaterThanOrEqual(0);
      expect(jeton.x + jeton.l).toBeLessThanOrEqual(cadre.l);
      for (const autre of jetons.slice(i + 1)) expect(touche(jeton, autre)).toBe(false);
    }
  });
});
