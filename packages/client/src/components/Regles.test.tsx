/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
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
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

/**
 * Les règles se lisent par chapitres (feuille basse à onglets) : pour
 * vérifier ce qu'elles disent en tout, on les feuillette — chaque onglet
 * à son tour — et l'on recolle le texte.
 */
async function toutLire(utilisateur: UserEvent): Promise<string> {
  const dialogue = screen.getByRole('dialog');
  let texte = '';
  for (const onglet of within(dialogue).getAllByRole('tab')) {
    await utilisateur.click(onglet);
    texte += within(dialogue).getByRole('tabpanel').textContent;
  }
  return texte;
}

describe('<BoutonRegles />', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null });
  });

  it('ouvre une feuille modale avec les rôles du skin, et se ferme à Échap', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);

    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const dialogue = screen.getByRole('dialog');
    expect(dialogue).toHaveAttribute('aria-modal', 'true');
    await utilisateur.click(within(dialogue).getByRole('tab', { name: 'Les rôles' }));
    const voix = voixDuSkin('thiercelieux');
    for (const role of ROLES) {
      expect(within(dialogue).getAllByText(voix.nomRole(role), { exact: false }).length).toBeGreaterThan(0);
    }
    await utilisateur.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quatre chapitres — le but, une manche, les rôles, cette table — et le premier ouvert', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));

    const noms = screen.getAllByRole('tab').map((onglet) => onglet.textContent);
    expect(noms).toEqual(['Le but', 'Une manche', 'Les rôles', 'Cette table']);
    expect(screen.getByRole('tab', { name: 'Le but' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Le but');

    // Les flèches passent d'un chapitre à l'autre ; le panneau suit.
    screen.getByRole('tab', { name: 'Le but' }).focus();
    await utilisateur.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Une manche' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Une manche' })).toHaveFocus();
    expect(screen.getByRole('tabpanel').textContent).toMatch(/Révélation/);
  });

  it('hors table, il n’y a pas de chapitre « Cette table »', async () => {
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    expect(screen.getAllByRole('tab').map((onglet) => onglet.textContent)).toEqual([
      'Le but',
      'Une manche',
      'Les rôles',
    ]);
  });

  it('chaque rôle porte sa petite carte, sa description et sa légende', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    await utilisateur.click(screen.getByRole('tab', { name: 'Les rôles' }));

    const lignes = document.querySelectorAll('[data-role-regle]');
    expect(lignes).toHaveLength(ROLES.length);
    const voix = voixDuSkin('thiercelieux');
    for (const role of ROLES) {
      expect(within(screen.getByRole('tabpanel')).getAllByText(voix.legendeRole(role)).length).toBeGreaterThan(0);
    }
    expect(document.querySelectorAll('[data-carte="petite"]')).toHaveLength(ROLES.length);
  });

  it('parle la voix de Shiganshina et dit les réglages de la table', async () => {
    useStore.setState({
      room: salle({ ...DEFAULT_OPTIONS, skin: 'shiganshina', capitaineAvantNuit1: true, chasseurEmpoisonne: true }),
    });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const dialogue = screen.getByRole('dialog');

    await utilisateur.click(within(dialogue).getByRole('tab', { name: 'Les rôles' }));
    expect(within(dialogue).getAllByText(/Titan/).length).toBeGreaterThan(0);
    await utilisateur.click(within(dialogue).getByRole('tab', { name: 'Cette table' }));
    expect(within(dialogue).getByText('Élu avant la première nuit.')).toBeInTheDocument();
    expect(within(dialogue).getByText(/Tire même s’il meurt empoisonné/)).toBeInTheDocument();
    expect(within(dialogue).getByText(/Nuit : 40 secondes par étape. Jour : 4 minutes/)).toBeInTheDocument();
  });

  it('dit la mort d’abandon (R101) dans les réglages de la table, selon l’option', async () => {
    const utilisateur = userEvent.setup();
    useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, abandon: true }) });
    const { unmount } = render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    await utilisateur.click(screen.getByRole('tab', { name: 'Cette table' }));
    expect(screen.getByText(/absent depuis cinq minutes meurt d’abandon, sans pouvoir/)).toBeInTheDocument();
    unmount();

    useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, abandon: false }) });
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    await utilisateur.click(screen.getByRole('tab', { name: 'Cette table' }));
    expect(screen.getByText(/La table attend ses absents/)).toBeInTheDocument();
  });

  it('affiche les cinq rôles optionnels dans les cinq skins, sous leur propre titre', async () => {
    for (const skin of ['thiercelieux', 'shiganshina', 'giletsjaunes', 'farwest', 'pirates']) {
      useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, skin }) });
      const utilisateur = userEvent.setup();
      const { unmount } = render(<BoutonRegles />);
      await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
      const dialogue = screen.getByRole('dialog');
      await utilisateur.click(within(dialogue).getByRole('tab', { name: 'Les rôles' }));
      expect(within(dialogue).getByRole('heading', { name: 'Rôles optionnels' })).toBeInTheDocument();
      const voix = voixDuSkin(skin);
      for (const role of OPTIONAL_ROLES) {
        expect(within(dialogue).getAllByText(voix.nomRole(role), { exact: false }).length).toBeGreaterThan(0);
      }
      expect(await toutLire(utilisateur)).not.toMatch(/de le |de la le /);
      unmount();
    }
  }, 15_000);

  it('la victoire solitaire du Loup Blanc et la rancune de l’Ancien ne se disent que si la table les a', async () => {
    useStore.setState({ room: salle(DEFAULT_OPTIONS) });
    const utilisateur = userEvent.setup();
    const { unmount } = render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    expect(await toutLire(utilisateur)).not.toMatch(/joue pour lui seul/);
    unmount();

    useStore.setState({
      room: salle({ ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'ancien', 'loupBlanc'], ancienRancunier: false }),
    });
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const texte = await toutLire(utilisateur);
    expect(texte).toMatch(/Le Loup Blanc est de la meute, mais joue pour lui seul/);
    expect(texte).toMatch(/3 loups dont le Loup Blanc/);
    expect(texte).toMatch(/Meurt sans se venger/);
    expect(texte).not.toMatch(/ancienRancunier|loupBlanc|petiteFille/);
  });

  it('aucun identifiant brut du moteur dans la feuille', async () => {
    useStore.setState({ room: salle({ ...DEFAULT_OPTIONS, auto: false, loups: 2, roles: ['voyante', 'idiot'] }) });
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const texte = await toutLire(utilisateur);
    // Les identifiants sans accent du moteur ne sont jamais des mots du skin.
    expect(texte).not.toMatch(/sorciere|salvateur/);
    expect(texte).not.toMatch(/undefined|\[object|\{[a-z]+\}/);
  });
});

describe('<Panneau /> — la feuille basse', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null });
  });

  it('garde le contrat d’accessibilité : dialogue nommé, languette, voile, focus piégé', async () => {
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    const declencheur = screen.getByRole('button', { name: 'Règles' });
    await utilisateur.click(declencheur);

    const dialogue = screen.getByRole('dialog', { name: 'Règles' });
    expect(dialogue).toHaveAttribute('aria-modal', 'true');
    expect(dialogue.querySelector('[data-languette]')).not.toBeNull();
    expect(document.querySelector('[data-voile]')).not.toBeNull();
    // Le focus entre dans la feuille, et n'en sort pas à la tabulation.
    expect(dialogue).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 12; i += 1) {
      await utilisateur.tab();
      expect(dialogue).toContainElement(document.activeElement as HTMLElement);
    }
    // Échap referme, et le focus revient à l'outil qui l'avait ouverte.
    await utilisateur.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(declencheur).toHaveFocus();
  });

  it('se referme par « Refermer » et par le toucher du voile', async () => {
    const utilisateur = userEvent.setup();
    render(<BoutonRegles />);
    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    await utilisateur.click(screen.getByRole('button', { name: 'Refermer' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await utilisateur.click(screen.getByRole('button', { name: 'Règles' }));
    const voile = document.querySelector('[data-voile]');
    expect(voile).not.toBeNull();
    await utilisateur.pointer({ keys: '[MouseLeft]', target: voile as Element });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
