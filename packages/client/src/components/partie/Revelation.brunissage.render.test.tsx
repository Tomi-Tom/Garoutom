/* @vitest-environment jsdom */
/**
 * Le brunissage de la révélation (SPEC § 4.7, § 5.2 R2 → R3) : sous le
 * pouce, le masque s'ouvre par crans de 8 px depuis le centre de la carte
 * jusqu'à la découvrir **entière** — même quand le navigateur bride ses
 * images (onglet en arrière-plan, iframe) : le rayon se lit sur l'horloge.
 * Le dos et la face occupent toute la boîte de la carte, sans quoi le disque
 * s'ouvre à côté de la carte et ne la découvre jamais.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '../../lib/store.js';
import { installe, nouvellePartie, siegeDe } from './nuit/banc.js';
import { largeurCarteDesktop, rayonBruni, Revelation } from './Revelation.js';

vi.mock('../../lib/actions.js', () => ({ jouer: vi.fn(() => Promise.resolve()) }));

// Le mouvement n'est PAS réduit ici : on compte les crans.
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  useReducedMotion: () => false,
}));

vi.mock('../habit/CarteRole.js', () => ({
  CarteRole: (props: import('../habit/CarteRole.js').CarteRoleProps) => (
    <div
      data-testid="carte"
      data-retournee={String(props.retournee)}
      data-pleine-largeur={String(props.pleineLargeur === true)}
    />
  ),
}));

const large = vi.hoisted(() => ({ valeur: false }));
vi.mock('../useEstLarge.js', () => ({ useEstLarge: () => large.valeur }));

function masque(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.brunir');
  if (element === null) throw new Error('pas de masque');
  return element;
}

describe('rayonBruni', () => {
  it('avance de 8 px par image de 16 ms, le premier cran tout de suite, jusqu’à la carte entière', () => {
    expect(rayonBruni(0, 260)).toBe(8);
    expect(rayonBruni(15, 260)).toBe(8);
    expect(rayonBruni(16, 260)).toBe(16);
    expect(rayonBruni(160, 260)).toBe(88);
    expect(rayonBruni(10_000, 260)).toBe(260);
  });

  it('une image sautée (navigateur bridé) ne retarde pas la fin : le rayon suit l’horloge', () => {
    // Une seule image peinte au bout d'une seconde : la carte est entière.
    expect(rayonBruni(1_000, 258)).toBe(258);
  });
});

describe('largeurCarteDesktop', () => {
  it('la carte grande quand la place est haute, réduite pour que le pupitre tienne entre les jetons', () => {
    expect(largeurCarteDesktop(null, 116)).toBe(300);
    expect(largeurCarteDesktop(1_000, 116)).toBe(300);
    // Place de 608 px (écran de 744) : le pupitre (carte + 120) tient entre
    // le jeton du haut et celui du bas (116 + 12 chacun) et 16 d'air.
    const l = largeurCarteDesktop(608, 116);
    const hauteurCarte = (l * 420) / 300;
    expect(hauteurCarte + 120 + 16 + 2 * (116 + 12)).toBeLessThanOrEqual(608);
    expect(l).toBeGreaterThanOrEqual(140);
  });
});

describe('<Revelation /> — le brunissage sous le pouce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    large.valeur = false;
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('s’ouvre par crans depuis le centre jusqu’à découvrir la face entière, puis se referme d’une image', () => {
    const banc = nouvellePartie();
    installe(banc, siegeDe(banc, 'voyante'));
    render(<Revelation />);

    // Le dos et la face prennent toute la boîte de la carte : le centre du
    // masque est le centre de la carte.
    for (const carte of screen.getAllByTestId('carte')) {
      expect(carte).toHaveAttribute('data-pleine-largeur', 'true');
    }

    fireEvent.keyDown(screen.getByRole('button', { name: /Gardez le pouce/ }), { key: 'Enter' });
    const premier = Number(masque().dataset.rayon);
    expect(premier).toBe(8);
    expect(masque().style.getPropertyValue('--r')).toBe('8px');
    expect(document.querySelector('[data-bruni="complet"]')).toBeNull();

    act(() => vi.advanceTimersByTime(64));
    const ensuite = Number(masque().dataset.rayon);
    expect(ensuite).toBeGreaterThan(premier);

    // R3 : en un peu plus d'une demi-seconde, la carte est entière.
    act(() => vi.advanceTimersByTime(600));
    expect(document.querySelector('[data-bruni="complet"]')).not.toBeNull();
    const rayon = Number(masque().dataset.rayon);
    // La demi-diagonale de la carte moyenne (216 × 302) : tout est découvert.
    expect(rayon).toBeGreaterThanOrEqual(Math.hypot(216, 302) / 2);

    // R4 : relâchée, réencrée d'une image.
    fireEvent.keyDown(screen.getByRole('button', { name: /Relâch/ }), { key: 'Enter' });
    expect(masque().style.getPropertyValue('--r')).toBe('0px');
  });
});
