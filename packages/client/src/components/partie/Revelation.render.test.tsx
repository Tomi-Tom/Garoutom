/* @vitest-environment jsdom */
/**
 * La révélation, rendue (SPEC Caprices § 5.2, R0 → R5) : la carte se lit à
 * l'appui long — 8 s au plus, recachée au relâchement et au changement
 * d'onglet —, la meute ne se voit que sous le pouce, « Je sais qui je suis »
 * ne vient qu'après une première lecture, et rien ne compte qui est prêt.
 *
 * La carte de l'habit est doublée : ces tests prouvent ce que la révélation
 * lui demande (le dos, puis la face pouce posé), pas comment elle se dessine.
 * Le geste passe par le clavier (Entrée ouvre une lecture, Entrée la
 * referme) et par les minuteurs : c'est le même `AppuiLong` que le pouce.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jouer } from '../../lib/actions.js';
import { useStore } from '../../lib/store.js';
import { thiercelieux } from '../../skins/thiercelieux.js';
import { agir, IDENTIFIANT_BRUT, installe, nouvellePartie, siegeDe, sieges } from './nuit/banc.js';
import { Revelation } from './Revelation.js';

vi.mock('../../lib/actions.js', () => ({ jouer: vi.fn(() => Promise.resolve()) }));

// Le brunissage s'ouvre d'un coup (mouvement réduit) : pas d'images à compter.
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  useReducedMotion: () => true,
}));

vi.mock('../habit/CarteRole.js', () => ({
  CarteRole: (props: import('../habit/CarteRole.js').CarteRoleProps) => (
    <div
      data-testid="carte"
      data-retournee={String(props.retournee)}
      data-taille={props.taille}
      data-tirage={props.tirage}
      data-role={props.role === null ? 'inconnu' : 'connu'}
    />
  ),
}));

const large = vi.hoisted(() => ({ valeur: false }));
vi.mock('../useEstLarge.js', () => ({ useEstLarge: () => large.valeur }));

const jouerMock = vi.mocked(jouer);

/** L'appui long de la barre au pouce. */
function appui(): HTMLElement {
  return screen.getByRole('button', { name: /Gardez le pouce|Relâch|Revoir/ });
}

/** Entrée : une lecture s'ouvre (8 s au plus) ; Entrée encore : elle se referme. */
function entree(): void {
  fireEvent.keyDown(appui(), { key: 'Enter' });
}

/** Une zone du gabarit. */
function zone(nom: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-zone="${nom}"]`);
  if (element === null) throw new Error(`pas de zone ${nom}`);
  return element;
}

function faces(): HTMLElement[] {
  return screen.queryAllByTestId('carte').filter((carte) => carte.dataset.retournee === 'true');
}

describe('<Revelation />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    large.valeur = false;
    jouerMock.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('R0 : la carte est au dos, rien ne se lit, rien ne se confirme', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    const { container } = render(<Revelation />);

    expect(screen.getByText(thiercelieux.prompts.pret)).toBeInTheDocument();
    const cartes = screen.getAllByTestId('carte');
    expect(cartes).toHaveLength(1);
    expect(cartes[0]).toHaveAttribute('data-retournee', 'false');
    expect(cartes[0]).toHaveAttribute('data-role', 'inconnu');
    expect(cartes[0]).toHaveAttribute('data-tirage', 'cuivre');
    expect(appui()).toHaveAccessibleName('Gardez le pouce : retourner la carte');
    expect(within(zone('place')).getByText('« Nul ne se connaît. »')).toBeInTheDocument();
    // Le rôle n'existe pas dans la page avant le geste (P2-19).
    expect(container.textContent ?? '').not.toContain('la Voyante');
    expect(screen.queryByRole('button', { name: 'Je sais qui je suis' })).toBeNull();
  });

  it('R3 → R5 : lue sous le pouce, recachée au relâchement, puis « Je sais qui je suis »', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    const { container } = render(<Revelation />);

    entree();
    expect(faces()).toHaveLength(1);
    expect(faces()[0]).toHaveAttribute('data-tirage', 'papier');
    expect(screen.getByRole('heading', { name: 'la Voyante' })).toBeInTheDocument();
    expect(screen.getByText(/son rôle s’inscrit dans votre carnet, nuit après nuit/)).toBeInTheDocument();
    expect(appui()).toHaveAccessibleName('Relâchez pour cacher · 8 s');
    expect(document.querySelector('[data-perimetre="ouverte"]')).not.toBeNull();

    act(() => vi.advanceTimersByTime(2_100));
    expect(appui()).toHaveAccessibleName('Relâchez pour cacher · 6 s');

    entree();
    // R4 : réencrée d'une image — la face et le rôle quittent la page.
    expect(faces()).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'la Voyante' })).toBeNull();
    expect(document.querySelector('[data-perimetre]')).toBeNull();

    // R5 : la lecture a duré plus d'une seconde.
    fireEvent.click(screen.getByRole('button', { name: 'Je sais qui je suis' }));
    expect(jouerMock).toHaveBeenCalledWith({ type: 'pret' });
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
  });

  it('une lecture trop brève ne suffit pas à se dire prêt·e', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    render(<Revelation />);

    entree();
    act(() => vi.advanceTimersByTime(400));
    entree();
    expect(screen.queryByRole('button', { name: 'Je sais qui je suis' })).toBeNull();
  });

  it('la carte se recache d’elle-même au bout de 8 s, et quand l’onglet passe derrière', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    render(<Revelation />);

    entree();
    expect(faces()).toHaveLength(1);
    act(() => vi.advanceTimersByTime(8_000));
    expect(faces()).toHaveLength(0);

    entree();
    expect(faces()).toHaveLength(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(faces()).toHaveLength(0);
  });

  it('une fois confirmé, on attend en silence — aucun compteur de prêts', () => {
    const banc = nouvellePartie();
    agir(banc, 0, { type: 'pret' });
    agir(banc, 1, { type: 'pret' });
    installe(banc, 0);
    const { container } = render(<Revelation />);

    expect(screen.getByText('Les autres retournent leur carte.')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: 'Je sais qui je suis' })).toBeNull();
    // La carte reste à soi : on peut la relire.
    expect(appui()).toHaveAccessibleName('Gardez le pouce : ma carte');
    expect(container.textContent).not.toMatch(/\d+\s*(\/|sur)\s*\d+|prêts/);
  });

  it('un loup ne voit ses complices que sous le pouce', () => {
    const banc = nouvellePartie();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    installe(banc, loupA);
    const { container } = render(<Revelation />);

    expect(screen.queryByText(/Vos complices/)).toBeNull();

    entree();
    expect(screen.getByRole('heading', { name: 'Loup-garou' })).toBeInTheDocument();
    expect(screen.getByText(/Vos complices/)).toHaveTextContent(`Joueur ${String(loupB)}`);
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);

    entree();
    expect(screen.queryByText(/Vos complices/)).toBeNull();
  });

  it('le Loup Blanc découvre la meute — qui, elle, le prend pour l’un des siens', () => {
    const banc = nouvellePartie({ roles: ['loupBlanc', 'voyante'], loups: 2 }, 9);
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const blanc = siegeDe(banc, 'loupBlanc');
    installe(banc, blanc);
    const vue = render(<Revelation />);

    entree();
    expect(screen.getByRole('heading', { name: 'le Loup Blanc' })).toBeInTheDocument();
    expect(screen.getByText(/Vous ne gagnez que seul/)).toBeInTheDocument();
    const meute = screen.getByText(/Vous chassez aux côtés de la meute/);
    expect(meute).toHaveTextContent(`Joueur ${String(loupA)}`);
    expect(meute).toHaveTextContent(`Joueur ${String(loupB)}`);
    // La carte du skin dit « dévorer un loup » en toutes lettres : c'est du
    // français, pas un identifiant. Le reste de l'écran ne doit rien laisser fuir.
    const description = thiercelieux.roles.loupBlanc.description;
    expect((vue.container.textContent ?? '').replace(description, '')).not.toMatch(IDENTIFIANT_BRUT);
    vue.unmount();

    // Un loup ordinaire compte le Loup Blanc parmi ses complices, sans le savoir blanc.
    installe(banc, loupA);
    render(<Revelation />);
    entree();
    expect(screen.getByText(/Vos complices/)).toHaveTextContent(`Joueur ${String(blanc)}`);
    expect(screen.queryByText(/Loup Blanc/)).toBeNull();
  });

  it('un spectateur voit la place, sans carte ni geste', () => {
    const banc = nouvellePartie();
    installe(banc, null);
    render(<Revelation />);

    expect(screen.queryByTestId('carte')).toBeNull();
    expect(screen.queryByRole('button', { name: /Gardez le pouce/ })).toBeNull();
    expect(within(zone('consigne')).getByText('« Nul ne se connaît. »')).toBeInTheDocument();
    expect(screen.getByText('Les joueurs retournent leur carte.')).toBeInTheDocument();
    expect(screen.getByText('Vous suivez la table en spectateur.')).toBeInTheDocument();
  });

  it('le gabarit unique : les mêmes zones pour le joueur et le spectateur', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    const joueur = render(<Revelation />);
    const zones = (racine: HTMLElement) =>
      [...racine.querySelectorAll('[data-zone]')].map((zone) => zone.getAttribute('data-zone'));
    const zonesJoueur = zones(joueur.container);
    joueur.unmount();

    installe(banc, null);
    const spectateur = render(<Revelation />);
    expect(zonesJoueur).toEqual(['frise', 'minuterie', 'crieur', 'consigne', 'place', 'resume', 'pli', 'barre']);
    expect(zones(spectateur.container)).toEqual(zonesJoueur);
  });

  it('desktop : la carte grande au pupitre, la description et « Je sais qui je suis » dans la colonne', () => {
    large.valeur = true;
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    render(<Revelation />);

    expect(screen.getByTestId('carte')).toHaveAttribute('data-taille', 'grande');
    const pret = screen.getByRole('button', { name: 'Je sais qui je suis' });
    expect(pret).toBeDisabled();
    expect(pret).toHaveAccessibleDescription('Lisez votre carte une première fois.');
    expect(screen.getByText('Bouton tenu à la souris, ou Espace tenu.')).toBeInTheDocument();

    entree();
    expect(screen.getByRole('heading', { name: 'la Voyante' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_500));
    entree();
    expect(screen.getByRole('button', { name: 'Je sais qui je suis' })).toBeEnabled();
  });
});
