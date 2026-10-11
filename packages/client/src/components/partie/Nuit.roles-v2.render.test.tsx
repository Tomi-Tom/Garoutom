/* @vitest-environment jsdom */
/**
 * La nuit des rôles optionnels (R90–R97), rendue sur des vues du moteur.
 *
 * Mêmes doublures que `Nuit.render.test.tsx` : la place rend un bouton par
 * siège choisissable et les pastilles qu'on lui confie, le fil un repère.
 * On prouve ce que la nuit demande au moteur — le Corbeau marque, le Loup
 * Blanc trahit —, ce que la Petite Fille entrevoit sans jamais lire un nom de
 * loup, et la mention des pouvoirs éteints avec l'Ancien.
 */

import { act, render, screen } from '@testing-library/react';
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

/** Le pseudo d'un siège, en mot entier : « Joueur 1 » ne doit pas trouver « Joueur 10 ». */
function motif(seat: number): RegExp {
  return new RegExp(`${nom(seat)}\\b`);
}

function sansIdentifiantBrut(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
}

/** La nuit passe sans que personne ne joue. */
function laNuitPasse(banc: Banc): void {
  while (banc.state.phase.kind === 'nuit') finirPhase(banc);
}

describe('<Nuit /> — les rôles optionnels', () => {
  beforeEach(() => {
    jouerMock.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('le Corbeau marque un vivant — lui compris — ou personne, et peut changer d’avis', async () => {
    const banc = nouvellePartie({ roles: ['corbeau', 'voyante'] });
    tousPrets(banc);
    const corbeau = siegeDe(banc, 'corbeau');
    const loup = siegeDe(banc, 'loup');
    installe(banc, corbeau);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    expect(screen.getByTestId('nuit-corbeau')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'le Corbeau' })).toBeInTheDocument();
    expect(screen.getByText(/deux voix pèseront d’office/)).toBeInTheDocument();
    // Tout vivant se marque, le Corbeau lui-même et les loups compris.
    expect(screen.getByRole('button', { name: `siège ${String(corbeau)}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `siège ${String(loup)}` })).toBeInTheDocument();

    // Rien ne part avant la confirmation.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(corbeau)}` }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: `Marquer ${nom(corbeau)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'marquer', target: corbeau });
    sansIdentifiantBrut(vue.container);
    vue.unmount();

    // Une fois la marque posée, le récapitulatif — et le droit de se raviser.
    agir(banc, corbeau, { type: 'marquer', target: loup });
    installe(banc, corbeau);
    render(<Nuit />);
    expect(screen.getByRole('status')).toHaveTextContent('l’aube dira la marque, jamais votre main');
    await utilisateur.click(screen.getByRole('button', { name: 'Changer d’avis' }));
    await utilisateur.click(screen.getByRole('button', { name: 'Ne marquer personne' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'marquer', target: null });
    expect(screen.getByRole('status')).toHaveTextContent('Vous ne marquez personne cette nuit.');
  });

  it('le Loup Blanc, seul en scène une nuit paire, ne peut dévorer qu’un autre loup — ou épargner la meute', async () => {
    const banc = nouvellePartie({ roles: ['loupBlanc', 'voyante'], loups: 2 }, 9);
    tousPrets(banc);
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const blanc = siegeDe(banc, 'loupBlanc');
    const villageois = siegeDe(banc, 'villageois');
    // La nuit 1 est impaire : pas d'étape à lui. Le jour 1 passe sans potence.
    laNuitPasse(banc);
    expect(banc.state.phase.kind).toBe('jour');
    finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
    while (banc.state.phase.kind === 'nuit' && banc.state.phase.step === 'principale') finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });

    installe(banc, blanc);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    expect(screen.getByTestId('nuit-loup-blanc')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'le Loup Blanc' })).toBeInTheDocument();
    expect(screen.getByText(/Dévorez l’un de ses loups/)).toBeInTheDocument();
    expect(screen.getByTestId('place')).toHaveAttribute('data-teinte', 'sang');
    // Seuls les autres loups se touchent : ni lui, ni le village.
    const touchables = screen
      .getAllByRole('button', { name: /^siège / })
      .map((bouton) => Number(bouton.textContent?.replace('siège ', '')));
    expect(touchables.sort((a, b) => a - b)).toEqual([loupA, loupB].sort((a, b) => a - b));
    expect(screen.queryByRole('button', { name: `siège ${String(villageois)}` })).toBeNull();
    // La meute dort : ni son canal, ni ses voix.
    expect(screen.queryByTestId('fil')).toBeNull();

    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(loupA)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `Dévorer ${nom(loupA)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'trahir', target: loupA });
    await utilisateur.click(screen.getByRole('button', { name: 'Épargner la meute' }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'trahir', target: null });
    sansIdentifiantBrut(vue.container);
    vue.unmount();

    // Son choix clôt l'étape : le récapitulatif ne promet aucun retour.
    agir(banc, blanc, { type: 'trahir', target: null });
    expect(banc.state.phase).not.toMatchObject({ step: 'loupBlanc' });
  });

  it('pendant l’étape du Loup Blanc, la meute et le village voient le même écran', () => {
    const banc = nouvellePartie({ roles: ['loupBlanc', 'voyante'], loups: 2 }, 9);
    tousPrets(banc);
    laNuitPasse(banc);
    finirPhase(banc);
    while (banc.state.phase.kind === 'nuit' && banc.state.phase.step === 'principale') finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });

    installe(banc, siegeDe(banc, 'villageois'));
    const villageois = render(<Nuit />);
    const texte = villageois.container.textContent;
    villageois.unmount();

    installe(banc, siegeDe(banc, 'loup'));
    const loup = render(<Nuit />);
    expect(loup.container.textContent).toBe(texte);
    expect(screen.getByRole('heading', { name: 'La nuit se poursuit.' })).toBeInTheDocument();
  });

  it('la Petite Fille entrevoit combien de loups visent chaque habitant, en direct — jamais lesquels', () => {
    const banc = nouvellePartie({ roles: ['petiteFille', 'voyante'], loups: 2 });
    tousPrets(banc);
    const petite = siegeDe(banc, 'petiteFille');
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const [proie, autre] = sieges(banc, 'villageois') as [number, number];

    agir(banc, loupA, { type: 'devorer', target: proie });
    installe(banc, petite);
    const { container } = render(<Nuit />);

    // Elle n'a pas de consigne : c'est le village qui dort, porte entrouverte.
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByTestId('porte-entrouverte')).toHaveTextContent('Vous entrouvrez la porte…');
    expect(screen.getByTestId(`annotation-${String(proie)}`)).toHaveTextContent('×1');
    // Rien à toucher : elle regarde, elle n'agit pas.
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    const aucunLoupNomme = () => {
      const texte = container.textContent ?? '';
      expect(texte).not.toMatch(motif(loupA));
      expect(texte).not.toMatch(motif(loupB));
    };
    aucunLoupNomme();

    // Le second loup rejoint le premier : le chiffre monte, sans dire qui.
    act(() => {
      agir(banc, loupB, { type: 'devorer', target: proie });
      installe(banc, petite);
    });
    expect(screen.getByTestId(`annotation-${String(proie)}`)).toHaveTextContent('×2');
    aucunLoupNomme();

    // Un loup change d'avis : les chiffres suivent.
    act(() => {
      agir(banc, loupA, { type: 'devorer', target: autre });
      installe(banc, petite);
    });
    expect(screen.getByTestId(`annotation-${String(proie)}`)).toHaveTextContent('×1');
    expect(screen.getByTestId(`annotation-${String(autre)}`)).toHaveTextContent('×1');
    // Jamais une pastille sur un loup.
    expect(screen.queryByTestId(`annotation-${String(loupA)}`)).toBeNull();
    expect(screen.queryByTestId(`annotation-${String(loupB)}`)).toBeNull();
    aucunLoupNomme();
    sansIdentifiantBrut(container);
  });

  it('personne d’autre n’entrouvre la porte, et elle se referme avec l’étape', () => {
    const banc = nouvellePartie({ roles: ['petiteFille', 'voyante'], loups: 2 });
    tousPrets(banc);
    const loup = siegeDe(banc, 'loup');
    agir(banc, loup, { type: 'devorer', target: siegeDe(banc, 'villageois') });

    installe(banc, siegeDe(banc, 'villageois'));
    const villageois = render(<Nuit />);
    expect(screen.queryByTestId('porte-entrouverte')).toBeNull();
    villageois.unmount();

    while (banc.state.phase.kind === 'nuit' && banc.state.phase.step === 'principale') finirPhase(banc);
    installe(banc, siegeDe(banc, 'petiteFille'));
    render(<Nuit />);
    expect(screen.queryByTestId('porte-entrouverte')).toBeNull();
  });

  it('les pouvoirs éteints avec l’Ancien se disent, sobrement, aux seuls rôles qui en avaient', () => {
    const banc = nouvellePartie({ roles: ['ancien', 'voyante'], loups: 2 });
    tousPrets(banc);
    laNuitPasse(banc);
    expect(banc.state.phase.kind).toBe('jour');
    // Le village condamne son propre Ancien (R92).
    const ancien = siegeDe(banc, 'ancien');
    const autre = banc.state.players.find((p) => p.alive && p.seat !== ancien)!.seat;
    for (const joueur of banc.state.players.filter((p) => p.alive)) {
      agir(banc, joueur.seat, { type: 'voter', target: joueur.seat === ancien ? autre : ancien });
    }
    expect(banc.state.pouvoirsPerdus).toBe(true);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });

    // La Voyante n'a plus de consigne : le village qui dort, et la mention.
    installe(banc, siegeDe(banc, 'voyante'));
    const voyante = render(<Nuit />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByTestId('pouvoirs-eteints')).toHaveTextContent('Vos pouvoirs se sont éteints avec l’Ancien.');
    sansIdentifiantBrut(voyante.container);
    voyante.unmount();

    // Le villageois n'avait rien à perdre ; la meute ne perd rien.
    installe(banc, siegeDe(banc, 'villageois'));
    const villageois = render(<Nuit />);
    expect(screen.queryByTestId('pouvoirs-eteints')).toBeNull();
    villageois.unmount();

    installe(banc, siegeDe(banc, 'loup'));
    render(<Nuit />);
    expect(screen.getByTestId('nuit-meute')).toBeInTheDocument();
    expect(screen.queryByTestId('pouvoirs-eteints')).toBeNull();
  });
});
