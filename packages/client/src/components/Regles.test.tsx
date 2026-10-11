/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_OPTIONS, OPTIONAL_ROLES, ROLES, type GameOptions, type RoomView } from '@garoutom/engine';

import { useStore } from '../lib/store.js';
import { voixDuSkin } from '../skins/registre.js';
import { BoutonRegles } from './Regles.js';

function salle(options: GameOptions): RoomView {
  return {
    code: 'TEST',
    status: 'lobby',
    options,
    hostId: 'p0',
    players: Array.from({ length: 7 }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: `J${String(seat)}`,
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

describe('<BoutonRegles />', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null });
  });

  it('ouvre un dialogue modal avec les rôles du skin, et se ferme à Échap', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);

    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const dialogue = screen.getByRole('dialog');
    expect(dialogue).toHaveAttribute('aria-modal', 'true');
    const voix = voixDuSkin('thiercelieux');
    for (const role of ROLES) {
      expect(within(dialogue).getAllByText(voix.nomRole(role), { exact: false }).length).toBeGreaterThan(0);
    }
    await utilisateur.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('parle la voix de Shiganshina et dit les réglages de la table', async () => {
    useStore.setState({
      room: salle({ ...DEFAULT_OPTIONS, skin: 'shiganshina', capitaineAvantNuit1: true, chasseurEmpoisonne: true }),
    });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const dialogue = screen.getByRole('dialog');

    expect(within(dialogue).getAllByText(/Titan/).length).toBeGreaterThan(0);
    expect(within(dialogue).getByText('Élu avant la première nuit.')).toBeInTheDocument();
    expect(within(dialogue).getByText(/Tire même s’il meurt empoisonné/)).toBeInTheDocument();
    expect(within(dialogue).getByText(/Nuit : 40 secondes par étape. Jour : 4 minutes/)).toBeInTheDocument();
  });

  it('affiche les cinq rôles optionnels dans les deux skins, sous leur propre titre', async () => {
    for (const skin of ['thiercelieux', 'shiganshina']) {
      useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, skin }) });
      const utilisateur = userEvent.setup();
      const { unmount } = render(<BoutonRegles />);
      await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
      const dialogue = screen.getByRole('dialog');
      expect(within(dialogue).getByRole('heading', { name: 'Rôles optionnels' })).toBeInTheDocument();
      const voix = voixDuSkin(skin);
      for (const role of OPTIONAL_ROLES) {
        expect(within(dialogue).getAllByText(voix.nomRole(role), { exact: false }).length).toBeGreaterThan(0);
      }
      expect(dialogue.textContent).not.toMatch(/de le |de la le /);
      unmount();
    }
  });

  it('la victoire solitaire du Loup Blanc et la rancune de l’Ancien ne se disent que si la table les a', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    const { unmount } = render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    expect(screen.getByRole('dialog').textContent).not.toMatch(/joue pour lui seul/);
    unmount();

    useStore.setState({
      room: salle({ ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'ancien', 'loupBlanc'], ancienRancunier: false }),
    });
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const texte = screen.getByRole('dialog').textContent;
    expect(texte).toMatch(/Le Loup Blanc est de la meute, mais joue pour lui seul/);
    expect(texte).toMatch(/3 loups dont le Loup Blanc/);
    expect(texte).toMatch(/Meurt sans se venger/);
    expect(texte).not.toMatch(/ancienRancunier|loupBlanc|petiteFille/);
  });

  it('aucun identifiant brut du moteur dans le panneau', async () => {
    useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'idiot'] }) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const texte = screen.getByRole('dialog').textContent;
    // Les identifiants sans accent du moteur ne sont jamais des mots du skin.
    expect(texte).not.toMatch(/sorciere|salvateur/);
    expect(texte).not.toMatch(/undefined|\[object|\{[a-z]+\}/);
  });
});
