/* @vitest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type Channel, type GameOptions, type RoomView, type SyncPayload } from '@garoutom/engine';

import { installeCanal } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { Salon } from './Salon.js';

/* ------------------------------------------------------------------ */
/* La table simulée                                                    */
/* ------------------------------------------------------------------ */

/** Un `sync` entier, tel que le serveur le poussera : le magasin seul est touché. */
function sync(nombre: number, options: GameOptions = DEFAULT_OPTIONS): SyncPayload {
  return { room: salle(nombre, options), game: null, events: [], seq: 0, serverNow: Date.now() };
}

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

/** Le canal doublé : le salon n'a à prouver que ce qu'il envoie. */
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

describe('<Salon /> — sur le bureau, trois colonnes', () => {
  let canal: Channel;

  beforeEach(() => {
    fixeLargeur(true);
    localStorage.clear();
    canal = doublureCanal();
    installeCanal(() => canal);
    useStore.setState({
      playerId: null,
      room: null,
      game: null,
      decalageHorloge: null,
      notices: [],
      live: null,
    });
  });

  afterEach(() => {
    window.matchMedia = matchMediaDOrigine;
  });

  it('dit le code à recopier — mono, gros, avec de quoi le copier', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const code = screen.getByText('TEST');
    expect(code).toBeInTheDocument();
    // « La fonction d'un code est de se recopier » : mono et chasse fixe.
    expect(code.className).toContain('font-mono');
    expect(screen.getByRole('button', { name: 'Copier le code' })).toBeInTheDocument();
  });

  it('chaque joueur tient sa ligne : nom, siège, hôte — et rien qui trahisse un rôle', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    for (let seat = 0; seat < 6; seat += 1) {
      expect(screen.getByText(`Joueur ${String(seat)}`, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`siège ${String(seat + 1)}`)).toBeInTheDocument();
    }
    // Un seul hôte, dit comme tel ; le local se reconnaît sans chercher (un mot d'état par jeton).
    expect(screen.getAllByText(/hôte/)).toHaveLength(1);
    expect(screen.getByText('vous · hôte')).toBeInTheDocument();
  });

  it('l’hôte peut lancer à six joueurs, pas avant', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
  });

  it('à cinq joueurs, le lancement attend et le dit', () => {
    useStore.getState().applySync(sync(5));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    const bouton = screen.getByRole('button', { name: 'Lancer la partie' });
    expect(bouton).toBeDisabled();
    // La raison se dit : combien manquent, pas seulement « impossible ».
    expect(screen.getByText(/Il faut 6 joueurs pour lancer — 5 à la table, il en manque 1/)).toBeInTheDocument();
    expect(screen.getByText(/il en manque 1 pour lancer/)).toBeInTheDocument();
    // La table accepte jusqu'à 18 joueurs : treize sièges attendent encore.
    expect(screen.getByText(/13 places libres/)).toBeInTheDocument();
  });

  it('l’invité lit les règles, la main de l’hôte seule peut les toucher', () => {
    // Composition manuelle : les suggestions du moteur sont visibles, et
    // doivent être aussi inviolables que le reste des règles.
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.queryByRole('button', { name: /lancer la partie/i })).toBeNull();
    expect(screen.getByText(/l’hôte peut lancer la partie/)).toBeInTheDocument();
    expect(screen.getByText('réglées par l’hôte')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Le fil du village/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /2 loups · la Voyante · la Sorcière/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Au hasard' })).toBeDisabled();
  });

  it('la composition publique se lit, même automatique', () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    // La composition de référence à six joueurs : publique, car seule
    // l'attribution des cartes est secrète.
    expect(screen.getByText('2 loups · la Voyante · la Sorcière')).toBeInTheDocument();
  });

  it('l’hôte bascule une règle, le salon l’envoie entière au serveur', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('checkbox', { name: /Le fil du village/ }));

    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, chat: false },
      });
    });
  });

  it('une arrivée allume sa fenêtre — puis elle s’éteint', async () => {
    useStore.getState().applySync(sync(2));
    useStore.setState({ playerId: 'p0' });
    const vue = render(<Salon room={useStore.getState().room!} />);

    // Déjà là quand on entre : pas de fenêtre allumée.
    expect(screen.queryByText('a rejoint')).toBeNull();

    useStore.getState().applySync(sync(3));
    vue.rerender(<Salon room={useStore.getState().room!} />);
    expect(screen.getByText('a rejoint')).toBeInTheDocument();

    // Le compte à rebours d'absence se lit dans l'horloge du serveur.
    const absente = salle(3);
    absente.players[2]!.connected = false;
    absente.players[2]!.disconnectedUntil = Date.now() + 30_000;
    useStore.setState({ decalageHorloge: 0 });
    vue.rerender(<Salon room={absente} />);
    expect(screen.getByText(/absent·e · \d+ s/)).toBeInTheDocument();
  });

  it('le sélecteur de skin : l’hôte change d’univers, l’invité le lit', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    const vue = render(<Salon room={useStore.getState().room!} />);

    const univers = screen.getAllByRole('radio', { name: /·/ }).filter((r) => r.closest('[aria-label="Univers de la table"]'));
    expect(univers.length).toBeGreaterThanOrEqual(2);
    await utilisateur.click(univers[1]!);
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: expect.objectContaining({ skin: expect.not.stringMatching(/^thiercelieux$/) }),
      });
    });
    vue.unmount();

    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);
    for (const radio of screen
      .getAllByRole('radio')
      .filter((r) => r.closest('[aria-label="Univers de la table"]'))) {
      expect(radio).toBeDisabled();
    }
  });

  it('la composition parle la voix du skin choisi', () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, skin: 'shiganshina' }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByText(/2 Titans/)).toBeInTheDocument();
    expect(screen.queryByText(/2 loups/)).toBeNull();
  });

  it('copie le code et le lien d’invitation, et le dit', async () => {
    useStore.getState().applySync(sync(6));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('button', { name: 'Copier le code' }));
    expect(await navigator.clipboard.readText()).toBe('TEST');
    await utilisateur.click(screen.getByRole('button', { name: 'Copier le lien d’invitation' }));
    const lien = await navigator.clipboard.readText();
    expect(new URL(lien).searchParams.get('table')).toBe('TEST');
    expect(useStore.getState().notices.some((avis) => /Lien d’invitation copié/.test(avis.message))).toBe(true);
  });

  it('une composition injouable grise le lancement et dit pourquoi', () => {
    useStore
      .getState()
      .applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false, loups: 3, roles: ['voyante'] }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
    expect(screen.getByText(/Trop de loups pour cette table/)).toBeInTheDocument();
  });

  it('sans Sorcière dans la composition, son interrupteur est grisé et expliqué', () => {
    useStore
      .getState()
      .applySync(sync(7, { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante'] }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByRole('checkbox', { name: /peut se sauver/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Élection avant la première nuit/ })).toBeEnabled();
  });

  it('l’hôte coche un rôle optionnel, le salon envoie la liste entière', async () => {
    useStore.getState().applySync(sync(10, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    const groupe = screen.getByRole('group', { name: 'Rôles optionnels' });
    for (const nom of ['Ancien', 'Corbeau', 'Bouc émissaire', 'Petite Fille', 'Loup Blanc']) {
      expect(within(groupe).getByRole('button', { name: new RegExp(nom) })).toBeInTheDocument();
    }
    await utilisateur.click(within(groupe).getByRole('button', { name: /Corbeau/ }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:options', {
        options: { ...DEFAULT_OPTIONS, auto: false, roles: ['voyante', 'sorciere', 'corbeau'] },
      });
    });
  });

  it('l’invité voit les rôles optionnels mais ne peut pas les cocher', () => {
    useStore.getState().applySync(sync(10, { ...DEFAULT_OPTIONS, auto: false, roles: ['voyante', 'bouc'] }));
    useStore.setState({ playerId: 'p3' });
    render(<Salon room={useStore.getState().room!} />);

    const groupe = screen.getByRole('group', { name: 'Rôles optionnels' });
    const boutons = within(groupe).getAllByRole('button');
    expect(boutons).toHaveLength(13);
    for (const bouton of boutons) expect(bouton).toBeDisabled();
    expect(within(groupe).getByRole('button', { name: /Bouc émissaire/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sous le seuil conseillé, la case avertit sans interdire', () => {
    useStore.getState().applySync(sync(8, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByTestId('seuil-loupBlanc')).toHaveTextContent(/Conseillé dès 12 joueurs — la table en compte 8/);
    expect(within(screen.getByTestId('roles-optionnels')).getByRole('button', { name: /Loup Blanc/ })).toBeEnabled();
  });

  it('le Loup Blanc compte parmi les loups dans la phrase de composition', () => {
    useStore
      .getState()
      .applySync(sync(12, { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'loupBlanc'] }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
    expect(screen.getAllByText('3 loups dont le Loup Blanc · la Voyante').length).toBeGreaterThan(0);
  });

  it('Shiganshina dit « 3 Titans dont le Titan Mâchoire »', () => {
    useStore
      .getState()
      .applySync(
        sync(12, { ...DEFAULT_OPTIONS, skin: 'shiganshina', auto: false, loups: 2, roles: ['voyante', 'loupBlanc'] }),
      );
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getAllByText(/3 Titans dont le Titan Mâchoire/).length).toBeGreaterThan(0);
  });

  it('le Loup Blanc compté, la borne de R13 refuse : trop de loups', () => {
    useStore
      .getState()
      .applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['loupBlanc'] }));
    useStore.setState({ playerId: 'p0' });
    render(<Salon room={useStore.getState().room!} />);

    expect(screen.getByText(/Trop de loups pour cette table/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
  });

  it('« Au hasard, rôles optionnels compris » envoie un tirage de composition manuelle', async () => {
    useStore.getState().applySync(sync(16, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p0' });
    const utilisateur = userEvent.setup();
    render(<Salon room={useStore.getState().room!} />);

    await utilisateur.click(screen.getByRole('button', { name: 'Au hasard, rôles optionnels compris' }));
    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith(
        'room:options',
        expect.objectContaining({ options: expect.objectContaining({ auto: false }) as unknown }),
      );
    });
  });

  it('la rancune de l’Ancien est grisée et expliquée sans Ancien, active avec', () => {
    useStore
      .getState()
      .applySync(sync(10, { ...DEFAULT_OPTIONS, auto: false, roles: ['voyante', 'sorciere'] }));
    useStore.setState({ playerId: 'p0' });
    const { unmount } = render(<Salon room={useStore.getState().room!} />);
    expect(screen.getByRole('checkbox', { name: /Rancune de l’Ancien/ })).toBeDisabled();
    expect(screen.getByText(/l’Ancien n’est pas dans la composition/)).toBeInTheDocument();
    unmount();

    useStore
      .getState()
      .applySync(sync(10, { ...DEFAULT_OPTIONS, auto: false, roles: ['voyante', 'ancien'] }));
    render(<Salon room={useStore.getState().room!} />);
    const avec = screen.getByRole('checkbox', { name: /Rancune de l’Ancien/ });
    expect(avec).toBeEnabled();
    expect(avec).toBeChecked();
    expect(screen.getByText(/tous les pouvoirs du village s’éteignent/)).toBeInTheDocument();
  });

  it('rien à l’écran n’est un identifiant brut du moteur', () => {
    useStore.getState().applySync(sync(6, { ...DEFAULT_OPTIONS, auto: false }));
    useStore.setState({ playerId: 'p0' });
    const { container } = render(<Salon room={useStore.getState().room!} />);
    expect(container.textContent).not.toMatch(/(sorciere|voyante|salvateur|chasseur|cupidon|villageois)/);
  });
});
