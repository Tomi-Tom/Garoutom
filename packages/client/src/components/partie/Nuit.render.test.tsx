/* @vitest-environment jsdom */
/**
 * La nuit, rendue : le village qui dort ne trahit rien, chaque rôle envoie
 * exactement l'action que le moteur attend.
 *
 * Les vues viennent d'une vraie partie du moteur (`nuit/banc.ts`). Les
 * briques des autres agents — la place, le fil, l'habit — sont doublées :
 * ces tests prouvent ce que la nuit leur demande, pas ce qu'elles dessinent.
 * La place doublée rend un bouton par siège choisissable, et les pastilles
 * qu'on lui confie.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jouer } from '../../lib/actions.js';
import { useStore } from '../../lib/store.js';
import {
  agir,
  finirPhase,
  IDENTIFIANT_BRUT,
  installe,
  nouvellePartie,
  siegeDe,
  sieges,
  tousPrets,
  type Banc,
} from './nuit/banc.js';
import { Nuit } from './Nuit.js';

vi.mock('../../lib/actions.js', () => ({ jouer: vi.fn(() => Promise.resolve()) }));

vi.mock('./Place.js', () => ({
  Place: (props: import('./Place.js').PlaceProps) => (
    <div data-testid="place" aria-label={props.label} data-teinte={props.teinte}>
      {Array.from({ length: 18 }, (_, seat) => {
        const choisissable = props.choisissables?.(seat) ?? false;
        const annotation = props.annotations?.[seat];
        return (
          <div key={seat}>
            {choisissable && (
              <button
                type="button"
                aria-pressed={props.choisis?.includes(seat) ?? false}
                onClick={() => props.onChoisir?.(seat)}
              >
                {`siège ${String(seat)}`}
              </button>
            )}
            {annotation !== undefined && <div data-testid={`annotation-${String(seat)}`}>{annotation}</div>}
          </div>
        );
      })}
    </div>
  ),
}));

vi.mock('./Fil.js', () => ({
  Fil: (props: import('./Fil.js').FilProps) => (
    <div data-testid="fil" data-mode={props.mode} data-canaux={props.canaux?.join(',')} />
  ),
}));

vi.mock('../habit/Symbole.js', () => ({ SymboleRole: () => <span data-testid="symbole" /> }));
vi.mock('../habit/Decor.js', () => ({ Decor: () => <div data-testid="decor" /> }));

const jouerMock = vi.mocked(jouer);

function nom(seat: number): string {
  return `Joueur ${String(seat)}`;
}

/** Aucun identifiant du moteur dans le texte de l'écran. */
function sansIdentifiantBrut(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
}

/** Une première nuit ouverte. */
function premiereNuit(): Banc {
  const banc = nouvellePartie();
  tousPrets(banc);
  return banc;
}

/**
 * L'étape principale de la nuit 1 jouée par tous : les loups désignent le
 * premier villageois, et l'étape de la Sorcière s'ouvre.
 */
function etapeSorciere(): { banc: Banc; victime: number } {
  const banc = premiereNuit();
  const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
  const victime = siegeDe(banc, 'villageois');
  agir(banc, siegeDe(banc, 'cupidon'), {
    type: 'cupidon',
    a: siegeDe(banc, 'voyante'),
    b: siegeDe(banc, 'salvateur'),
  });
  agir(banc, siegeDe(banc, 'salvateur'), { type: 'proteger', target: siegeDe(banc, 'voyante') });
  agir(banc, siegeDe(banc, 'voyante'), { type: 'sonder', target: loupA });
  agir(banc, loupA, { type: 'devorer', target: victime });
  agir(banc, loupB, { type: 'devorer', target: victime });
  expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'sorciere' });
  return { banc, victime };
}

describe('<Nuit />', () => {
  beforeEach(() => {
    jouerMock.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('le village qui dort ne montre que la nuit : sa phrase, son numéro, la lune', () => {
    const banc = premiereNuit();
    installe(banc, siegeDe(banc, 'villageois'));
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByText('Nuit 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'La nuit tombe sur Thiercelieux. Le village s’endort.' })).toBeInTheDocument();
    // Rien à toucher que le fil replié — le même pour tous (D23) —, aucun
    // pseudo, aucun compte de qui joue.
    expect(screen.getAllByRole('button').map((bouton) => bouton.textContent)).toEqual(['Fil+']);
    expect(screen.queryByTestId('place')).toBeNull();
    expect(container.textContent).not.toMatch(/Joueur|joué|attend|\d+\s*(\/|sur)\s*\d+/);
    sansIdentifiantBrut(container);
  });

  it('pendant l’étape de la Sorcière, le villageois et la meute voient le même écran', () => {
    const { banc } = etapeSorciere();
    installe(banc, siegeDe(banc, 'villageois'));
    const villageois = render(<Nuit />);
    const texteVillageois = villageois.container.textContent;
    villageois.unmount();

    installe(banc, siegeDe(banc, 'loup'));
    const loup = render(<Nuit />);
    expect(loup.container.textContent).toBe(texteVillageois);
    expect(screen.getByRole('heading', { name: 'La nuit se poursuit.' })).toBeInTheDocument();
  });

  it('un mort voit le village dormir, et l’au-delà où l’on parle', async () => {
    const { banc, victime } = etapeSorciere();
    agir(banc, siegeDe(banc, 'sorciere'), { type: 'sorciere', save: false, kill: null });
    // La victime est tombée à l'aube ; le jour passe sans potence.
    expect(banc.state.players[victime]?.alive).toBe(false);
    finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });

    installe(banc, victime);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByText('Nuit 2')).toBeInTheDocument();
    expect(screen.getByText(/L’au-delà veille avec vous/)).toBeInTheDocument();
    // L'au-delà est dans le fil replié, comme le serment chez les amoureux (D23).
    expect(screen.queryByTestId('fil')).toBeNull();
    await utilisateur.click(screen.getByRole('button', { name: /Fil/ }));
    expect(screen.getByTestId('fil').getAttribute('data-canaux')?.split(',')).toContain('morts');
    sansIdentifiantBrut(container);
  });

  it('la meute vote, voit les voix des siens se poser, et peut s’abstenir', async () => {
    const banc = premiereNuit();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const [proie, autre] = sieges(banc, 'villageois') as [number, number];
    // Le complice a déjà choisi.
    agir(banc, loupB, { type: 'devorer', target: autre });
    installe(banc, loupA);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('place')).toHaveAttribute('data-teinte', 'sang');
    // Les loups ne se mangent pas entre eux : leurs jetons ne se touchent pas.
    expect(screen.queryByRole('button', { name: `siège ${String(loupA)}` })).toBeNull();
    expect(screen.queryByRole('button', { name: `siège ${String(loupB)}` })).toBeNull();
    // La voix du complice se lit sur le jeton qu'il vise, et dans la liste.
    expect(screen.getByTestId(`annotation-${String(autre)}`)).toHaveTextContent(nom(loupB));
    expect(screen.getByText(`vise ${nom(autre)}`)).toBeInTheDocument();
    // Le mini-fil de la meute vit sous les votes.
    expect(screen.getByTestId('fil')).toHaveAttribute('data-canaux', 'loups');

    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(proie)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'devorer', target: proie });

    await utilisateur.click(screen.getByRole('button', { name: 'Ne dévorer personne' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'devorer', target: null });
    sansIdentifiantBrut(container);
  });

  it('un loup qui a voté peut encore changer d’avis tant que la nuit court', () => {
    const banc = premiereNuit();
    const loup = siegeDe(banc, 'loup');
    const proie = siegeDe(banc, 'villageois');
    agir(banc, loup, { type: 'devorer', target: proie });
    installe(banc, loup);
    render(<Nuit />);

    expect(screen.getByText(/Votre voix va à Joueur/)).toHaveTextContent(nom(proie));
    expect(screen.getByText(/changer d’avis tant que la nuit court/)).toBeInTheDocument();
    expect(screen.getByTestId(`annotation-${String(proie)}`)).toHaveTextContent('vous');
    expect(screen.getByRole('button', { name: `siège ${String(proie)}` })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la Sorcière voit la victime et la sauve', async () => {
    const { banc, victime } = etapeSorciere();
    installe(banc, siegeDe(banc, 'sorciere'));
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByText(`La meute a désigné sa victime : ${nom(victime)}.`, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('intacte')).toHaveLength(2);
    // Rien de choisi : « Valider » attend, « Ne rien faire » est toujours là.
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();

    await utilisateur.click(screen.getByRole('button', { name: `Sauver ${nom(victime)}` }));
    await utilisateur.click(screen.getByRole('button', { name: 'Valider' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sorciere', save: true, kill: null });
    sansIdentifiantBrut(container);
  });

  it('la Sorcière empoisonne un vivant — ou ne fait rien', async () => {
    const { banc } = etapeSorciere();
    const sorciere = siegeDe(banc, 'sorciere');
    const loup = siegeDe(banc, 'loup');
    installe(banc, sorciere);
    const utilisateur = userEvent.setup();
    render(<Nuit />);

    // Elle-même est empoisonnable (R42).
    expect(screen.getByRole('button', { name: `siège ${String(sorciere)}` })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(loup)}` }));
    await utilisateur.click(screen.getByRole('button', { name: 'Valider' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sorciere', save: false, kill: loup });

    await utilisateur.click(screen.getByRole('button', { name: 'Ne rien faire' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sorciere', save: false, kill: null });
  });

  it('le Salvateur ne peut pas toucher le protégé d’hier, et l’écran dit pourquoi', async () => {
    const banc = premiereNuit();
    const salvateur = siegeDe(banc, 'salvateur');
    const hier = siegeDe(banc, 'voyante');
    agir(banc, salvateur, { type: 'proteger', target: hier });
    // Le reste de la nuit et le jour passent sans personne de plus.
    finirPhase(banc); // étape principale
    finirPhase(banc); // étape de la Sorcière
    finirPhase(banc); // le jour
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    expect(banc.state.day).toBe(2);

    installe(banc, salvateur);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByText(`${nom(hier)} dormait sous votre bouclier hier`, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `siège ${String(hier)}` })).toBeNull();
    expect(screen.getByTestId(`annotation-${String(hier)}`)).toHaveTextContent('protégé·e hier');
    // Lui-même reste protégeable.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(salvateur)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `Protéger ${nom(salvateur)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'proteger', target: salvateur });
    sansIdentifiantBrut(container);
  });

  it('Cupidon lie deux vivants, pas un de moins', async () => {
    const banc = premiereNuit();
    const cupidon = siegeDe(banc, 'cupidon');
    const [a, b] = sieges(banc, 'villageois') as [number, number];
    installe(banc, cupidon);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('place')).toHaveAttribute('data-teinte', 'serment');
    const lier = screen.getByRole('button', { name: 'Lier ces deux destins' });
    expect(lier).toBeDisabled();
    // Un troisième toucher remplace le plus ancien : le premier est Cupidon lui-même.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(cupidon)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(a)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(b)}` }));
    expect(lier).toBeEnabled();
    await utilisateur.click(lier);
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'cupidon', a, b });
    sansIdentifiantBrut(container);
  });

  it('la Voyante sonde un autre vivant et relit son carnet', async () => {
    const banc = premiereNuit();
    const voyante = siegeDe(banc, 'voyante');
    const loup = siegeDe(banc, 'loup');
    agir(banc, voyante, { type: 'sonder', target: loup });
    finirPhase(banc);
    // L'étape principale close, la vision s'inscrit — et le village qui dort la lui montre.
    installe(banc, voyante);
    const dort = render(<Nuit />);
    expect(screen.getByText(/Votre vision de la nuit/)).toHaveTextContent(`${nom(loup)} est Loup-garou`);
    sansIdentifiantBrut(dort.container);
    dort.unmount();

    finirPhase(banc); // la Sorcière
    finirPhase(banc); // le jour
    installe(banc, voyante);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    // Le carnet garde la nuit 1 ; elle ne peut pas se sonder elle-même.
    const carnet = screen.getByRole('heading', { name: 'Votre carnet' }).closest('section');
    expect(carnet).toHaveTextContent('Nuit 1');
    expect(carnet).toHaveTextContent(nom(loup));
    expect(carnet).toHaveTextContent('Loup-garou');
    expect(screen.queryByRole('button', { name: `siège ${String(voyante)}` })).toBeNull();

    const cible = siegeDe(banc, 'sorciere');
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(cible)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `Sonder ${nom(cible)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sonder', target: cible });
    sansIdentifiantBrut(container);
  });

  it('les amoureux vivants gardent leur serment replié, ouvert d’un geste', async () => {
    const banc = premiereNuit();
    const [a, b] = sieges(banc, 'villageois') as [number, number];
    agir(banc, siegeDe(banc, 'cupidon'), { type: 'cupidon', a, b });
    finirPhase(banc); // l'étape principale scelle le couple
    installe(banc, a);
    const utilisateur = userEvent.setup();
    render(<Nuit />);

    // Le serment n'a plus de bouton à lui : le même « Fil » que chez tous (D23).
    expect(screen.queryByRole('button', { name: /Le serment/ })).toBeNull();
    const fil = screen.getByRole('button', { name: /Fil/ });
    expect(fil).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('fil')).toBeNull();
    await utilisateur.click(fil);
    expect(screen.getByTestId('fil').getAttribute('data-canaux')?.split(',')).toContain('amoureux');
  });
});
