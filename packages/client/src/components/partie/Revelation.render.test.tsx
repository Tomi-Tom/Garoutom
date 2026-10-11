/* @vitest-environment jsdom */
/**
 * La révélation, rendue : on retourne sa carte, on lit son rôle dans la voix
 * du skin, on confirme — et rien ne compte qui est prêt.
 *
 * La carte de l'habit est doublée : ces tests prouvent ce que la révélation
 * lui demande (face cachée, puis retournée), pas comment elle se dessine.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jouer } from '../../lib/actions.js';
import { useStore } from '../../lib/store.js';
import { agir, IDENTIFIANT_BRUT, installe, nouvellePartie, siegeDe, sieges } from './nuit/banc.js';
import { thiercelieux } from '../../skins/thiercelieux.js';
import { Revelation } from './Revelation.js';

vi.mock('../../lib/actions.js', () => ({ jouer: vi.fn(() => Promise.resolve()) }));

vi.mock('../habit/CarteRole.js', () => ({
  CarteRole: (props: import('../habit/CarteRole.js').CarteRoleProps) => (
    <div data-testid="carte" data-retournee={String(props.retournee)} data-taille={props.taille} />
  ),
}));

const jouerMock = vi.mocked(jouer);

describe('<Revelation />', () => {
  beforeEach(() => {
    jouerMock.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('la carte se retourne à son rythme, puis on se dit prêt·e', async () => {
    const banc = nouvellePartie();
    const voyante = siegeDe(banc, 'voyante');
    installe(banc, voyante);
    const utilisateur = userEvent.setup();
    const { container } = render(<Revelation />);

    expect(screen.getByText('Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.')).toBeInTheDocument();
    expect(screen.getByTestId('carte')).toHaveAttribute('data-retournee', 'false');
    expect(screen.getByTestId('carte')).toHaveAttribute('data-taille', 'grande');
    // Face cachée, rien ne se lit et l'on ne confirme pas encore.
    expect(screen.queryByText('la Voyante')).toBeNull();
    expect(screen.getByRole('button', { name: /Retournez d’abord votre carte/ })).toBeDisabled();

    await utilisateur.click(screen.getByRole('button', { name: 'Retourner ma carte' }));
    expect(screen.getByTestId('carte')).toHaveAttribute('data-retournee', 'true');
    expect(screen.getByRole('heading', { name: 'la Voyante' })).toBeInTheDocument();
    expect(screen.getByText(/son rôle s’inscrit dans votre carnet, nuit après nuit/)).toBeInTheDocument();

    await utilisateur.click(screen.getByRole('button', { name: 'Je suis prêt·e' }));
    expect(jouerMock).toHaveBeenCalledWith({ type: 'pret' });
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
  });

  it('une fois confirmé, on attend en silence — aucun compteur de prêts', () => {
    const banc = nouvellePartie();
    agir(banc, 0, { type: 'pret' });
    agir(banc, 1, { type: 'pret' });
    installe(banc, 0);
    const { container } = render(<Revelation />);

    expect(screen.getByText(/C’est noté/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prêt/ })).toBeNull();
    expect(container.textContent).not.toMatch(/\d+\s*(\/|sur)\s*\d+|prêts/);
  });

  it('un loup découvre ses complices', async () => {
    const banc = nouvellePartie();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    installe(banc, loupA);
    const utilisateur = userEvent.setup();
    const { container } = render(<Revelation />);

    await utilisateur.click(screen.getByRole('button', { name: 'Retourner ma carte' }));
    expect(screen.getByRole('heading', { name: 'Loup-garou' })).toBeInTheDocument();
    expect(screen.getByText(/Vos complices/)).toHaveTextContent(`Joueur ${String(loupB)}`);
    expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
  });

  it('le Loup Blanc découvre la meute — qui, elle, le prend pour l’un des siens', async () => {
    const banc = nouvellePartie({ roles: ['loupBlanc', 'voyante'], loups: 2 }, 9);
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const blanc = siegeDe(banc, 'loupBlanc');
    installe(banc, blanc);
    const utilisateur = userEvent.setup();
    const vue = render(<Revelation />);

    await utilisateur.click(screen.getByRole('button', { name: 'Retourner ma carte' }));
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
    await utilisateur.click(screen.getByRole('button', { name: 'Retourner ma carte' }));
    expect(screen.getByText(/Vos complices/)).toHaveTextContent(`Joueur ${String(blanc)}`);
    expect(screen.queryByText(/Loup Blanc/)).toBeNull();
  });

  it('un spectateur attend sans carte ni bouton', () => {
    const banc = nouvellePartie();
    installe(banc, null);
    render(<Revelation />);

    expect(screen.getByTestId('carte')).toHaveAttribute('data-retournee', 'false');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/Les cartes sont distribuées/)).toBeInTheDocument();
  });
});
