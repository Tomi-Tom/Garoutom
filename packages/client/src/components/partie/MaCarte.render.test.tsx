/* @vitest-environment jsdom */
/**
 * « Ma carte » (SPEC Caprices § 5.1.6, § 5.2) : la carte et le savoir privé
 * ne paraissent que pouce posé — 8 s au plus, recachés au relâchement et au
 * changement d'onglet —, en tirage cuivre la nuit, papier le jour ; la place
 * l'apprend par son magasin (`place/savoir.ts`) ou par `annotations`.
 *
 * La carte de l'habit est doublée ; le geste passe par le clavier (Entrée
 * ouvre une lecture, Entrée la referme), le même `AppuiLong` que le pouce.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { viewFor } from '@garoutom/engine';

import { useStore } from '../../lib/store.js';
import { voixDuSkin } from '../../skins/registre.js';
import { annotationsDeMaCarte, MaCarte, useAnnotationsSousLePouce, useMaCarteTenue } from './MaCarte.js';
import { agir, finirPhase, installe, nouvellePartie, siegeDe, sieges, tousPrets, type Banc } from './nuit/banc.js';

vi.mock('../habit/CarteRole.js', () => ({
  CarteRole: (props: import('../habit/CarteRole.js').CarteRoleProps) => (
    <div data-testid="carte" data-tirage={props.tirage} data-taille={props.taille} data-morte={String(props.morte)} />
  ),
}));

/** Ce que la place entend : le pouce, et les signes à poser. */
function Sonde() {
  const tenu = useMaCarteTenue();
  const annotations = useAnnotationsSousLePouce();
  return (
    <p data-testid="sonde" data-tenu={String(tenu)}>
      {annotations === undefined ? '' : Object.keys(annotations).join(',')}
    </p>
  );
}

/**
 * La nuit 2 d'une table de dix : Cupidon a lié deux villageois, la Voyante a
 * sondé un loup, la meute a dévoré un troisième villageois.
 */
function deuxiemeNuit(): { banc: Banc; a: number; b: number; loup: number } {
  const banc = nouvellePartie({}, 10);
  tousPrets(banc);
  const [a, b, proie] = sieges(banc, 'villageois') as [number, number, number];
  const loup = siegeDe(banc, 'loup');
  agir(banc, siegeDe(banc, 'cupidon'), { type: 'cupidon', a, b });
  agir(banc, siegeDe(banc, 'voyante'), { type: 'sonder', target: loup });
  for (const l of sieges(banc, 'loup')) agir(banc, l, { type: 'devorer', target: proie });
  for (let garde = 0; garde < 10; garde += 1) {
    const phase = banc.state.phase;
    if (phase.kind === 'nuit' && phase.step === 'principale' && banc.state.day === 2) break;
    finirPhase(banc);
  }
  expect(banc.state.day).toBe(2);
  return { banc, a, b, loup };
}

function ouvrir(nom: string | RegExp): void {
  fireEvent.keyDown(screen.getByRole('button', { name: nom }), { key: 'Enter' });
}

describe('<MaCarte />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('frise : « Ma carte » ne montre rien tant que le pouce n’est pas posé', () => {
    const { banc } = deuxiemeNuit();
    installe(banc, siegeDe(banc, 'voyante'));
    render(
      <>
        <MaCarte declencheur="frise" />
        <Sonde />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Ma carte' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('ma-carte')).toBeNull();
    expect(screen.getByTestId('sonde')).toHaveAttribute('data-tenu', 'false');

    ouvrir('Ma carte');
    const carte = screen.getByTestId('ma-carte');
    // La nuit, la carte est la plaque avant l'impression : tirage cuivre.
    expect(carte).toHaveAttribute('data-tirage', 'cuivre');
    expect(within(carte).getByTestId('carte')).toHaveAttribute('data-tirage', 'cuivre');
    expect(carte.querySelector('[data-perimetre="ouverte"]')).not.toBeNull();
    // La place l'apprend, et reçoit le carnet sur le jeton sondé.
    expect(screen.getByTestId('sonde')).toHaveAttribute('data-tenu', 'true');
    expect(screen.getByTestId('sonde').textContent).not.toBe('');

    ouvrir('Ma carte');
    expect(screen.queryByTestId('ma-carte')).toBeNull();
    expect(screen.getByTestId('sonde')).toHaveAttribute('data-tenu', 'false');
    expect(screen.getByTestId('sonde').textContent).toBe('');
  });

  it('le jour, la carte est sur papier ; l’âme sœur se dit en cartouche lacs', () => {
    const { banc, a, b } = deuxiemeNuit();
    while (banc.state.phase.kind === 'nuit') finirPhase(banc);
    expect(banc.state.phase.kind).toBe('jour');
    installe(banc, a);
    render(<MaCarte declencheur="frise" />);

    ouvrir('Ma carte');
    const carte = screen.getByTestId('ma-carte');
    expect(carte).toHaveAttribute('data-tirage', 'papier');
    expect(within(carte).getByText(`Votre âme sœur : Joueur ${String(b)}`).closest('[data-forme]')).toHaveAttribute(
      'data-forme',
      'lacs',
    );
  });

  it('barre : le décompte, puis la carte se recache seule au bout de 8 s', () => {
    const { banc } = deuxiemeNuit();
    installe(banc, sieges(banc, 'villageois')[3]!);
    render(<MaCarte declencheur="barre" />);

    ouvrir('Gardez le pouce : ma carte');
    expect(screen.getByRole('button', { name: 'Relâchez pour cacher · 8 s' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3_100));
    expect(screen.getByRole('button', { name: 'Relâchez pour cacher · 5 s' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByTestId('ma-carte')).toBeNull();
    expect(screen.getByRole('button', { name: 'Gardez le pouce : ma carte' })).toBeInTheDocument();
  });

  it('l’onglet qui passe derrière recache la carte', () => {
    const { banc } = deuxiemeNuit();
    installe(banc, siegeDe(banc, 'voyante'));
    render(<MaCarte declencheur="barre" />);

    ouvrir('Gardez le pouce : ma carte');
    expect(screen.getByTestId('ma-carte')).toBeInTheDocument();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByTestId('ma-carte')).toBeNull();
  });

  it('un loup lit ses complices sous le pouce', () => {
    const { banc } = deuxiemeNuit();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    installe(banc, loupA);
    render(<MaCarte declencheur="barre" />);
    expect(document.body.textContent).not.toContain('Vos complices');

    ouvrir('Gardez le pouce : ma carte');
    expect(within(screen.getByTestId('ma-carte')).getByText(/Vos complices/).closest('p')).toHaveTextContent(
      `Joueur ${String(loupB)}`,
    );
  });

  it('le spectateur : l’emplacement vide dans la frise, une phrase dans la barre', () => {
    const { banc } = deuxiemeNuit();
    installe(banc, null);
    const frise = render(<MaCarte declencheur="frise" />);
    expect(frise.container.querySelector('[data-ma-carte="vide"]')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    frise.unmount();

    render(<MaCarte declencheur="barre" />);
    expect(screen.getByText('Vous suivez la table en spectateur.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('annotationsDeMaCarte', () => {
  const voix = voixDuSkin('thiercelieux');

  it('le carnet de la Voyante : le rôle sondé en cartouche, mordu pour la meute', () => {
    const { banc, loup } = deuxiemeNuit();
    const annotations = annotationsDeMaCarte(viewFor(banc.state, siegeDe(banc, 'voyante')), voix);
    const { container } = render(<>{annotations[loup]}</>);
    expect(container.querySelector('[data-forme="mordu"]')).toHaveTextContent('Loup-garou');
  });

  it('la meute : chaque complice, et rien sur soi', () => {
    const { banc } = deuxiemeNuit();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const annotations = annotationsDeMaCarte(viewFor(banc.state, loupA), voix);
    expect(Object.keys(annotations).map(Number)).toEqual([loupB]);
  });

  it('le serment : les lacs sur soi et sur l’âme sœur', () => {
    const { banc, a, b } = deuxiemeNuit();
    const annotations = annotationsDeMaCarte(viewFor(banc.state, a), voix);
    expect(Object.keys(annotations).map(Number).sort()).toEqual([a, b].sort());
    const { container } = render(<>{annotations[b]}</>);
    expect(container.querySelector('[data-glyphe="lie"]')).not.toBeNull();
    expect(container).toHaveTextContent('lié·e');
  });
});
