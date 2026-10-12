/* @vitest-environment jsdom */
/**
 * La nuit, rendue : le village qui dort ne trahit rien, chaque rôle envoie
 * exactement l'action que le moteur attend — après la confirmation en deux
 * temps de la barre au pouce (SPEC § 5.4, § 5.5, P0-6).
 *
 * Les vues viennent d'une vraie partie du moteur (`nuit/banc.ts`). Les
 * briques des autres lots — la place, le fil — sont doublées : ces tests
 * prouvent ce que la nuit leur demande, pas ce qu'elles dessinent. La place
 * doublée rend un bouton par siège choisissable, et les pastilles qu'on lui
 * confie ; le fil doublé dit son mode, son étendue et ses canaux.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    <div
      data-testid="place"
      aria-label={props.label}
      data-teinte={props.teinte}
      data-compacte={props.compacte === true ? '' : undefined}
      data-interdits={props.interdits?.join(',')}
    >
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
    <div data-testid="fil" data-mode={props.mode} data-etendue={props.etendue} data-canaux={props.canaux?.join(',')} />
  ),
}));

const jouerMock = vi.mocked(jouer);

function nom(seat: number): string {
  return `Joueur ${String(seat)}`;
}

/** Aucun identifiant du moteur dans le texte de l'écran. */
function sansIdentifiantBrut(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
}

/** Une zone du gabarit. */
function zone(container: HTMLElement, nomZone: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-zone="${nomZone}"]`);
  if (element === null) throw new Error(`Pas de zone « ${nomZone} »`);
  return element;
}

/** Les libellés des boutons de la barre au pouce. */
function boutonsDeLaBarre(container: HTMLElement): string[] {
  return within(zone(container, 'barre'))
    .getAllByRole('button')
    // Le nom du bouton : l'appui long porte un libellé court pour la barre étroite.
    .map((bouton) => bouton.getAttribute('aria-label') ?? bouton.textContent ?? '');
}

/** Le geste en deux temps : un toucher arme, le second confirme. */
async function armerPuisConfirmer(utilisateur: ReturnType<typeof userEvent.setup>, nomBouton: string | RegExp) {
  await utilisateur.click(screen.getByRole('button', { name: nomBouton }));
  expect(jouerMock).not.toHaveBeenCalled();
  await utilisateur.click(screen.getByRole('button', { name: /^Confirmer/ }));
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
    useStore.setState({ room: null, game: null, playerId: null, chronique: [], notices: [], live: null });
  });

  it('le village qui dort : la légende du dormeur, la place immobile, sa carte sous le pouce — rien d’autre', () => {
    const banc = premiereNuit();
    installe(banc, siegeDe(banc, 'villageois'));
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'La nuit tombe sur Thiercelieux. Le village s’endort.' })).toBeInTheDocument();
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent('« Dormez : d’autres veillent pour vous. »');
    // La place est là, mais rien ne s'y touche.
    expect(within(zone(container, 'place')).getByTestId('place')).toBeInTheDocument();
    expect(within(zone(container, 'place')).queryAllByRole('button')).toEqual([]);
    // Le dormeur a lui aussi un geste au pouce (N5), deux boutons comme tous, et un pli.
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Fermer les yeux']);
    expect(within(zone(container, 'pli')).getByRole('button')).toHaveTextContent('Le registre');
    // Aucun pseudo, aucun compte de qui joue.
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

  it('la carte se lit sous le pouce, en tirage cuivre, et se recache au relâchement', () => {
    const banc = premiereNuit();
    installe(banc, siegeDe(banc, 'villageois'));
    const { container } = render(<Nuit />);
    expect(screen.queryByTestId('ma-carte')).toBeNull();

    const appui = screen.getByRole('button', { name: 'Gardez le pouce : ma carte' });
    act(() => {
      fireEvent.keyDown(appui, { key: 'Enter' });
    });
    expect(screen.getByTestId('ma-carte')).toBeInTheDocument();
    expect(within(zone(container, 'barre')).getByRole('button', { name: /Relâchez pour cacher/ })).toBeInTheDocument();
    // La nuit ne se brunit jamais jusqu'au papier (N3) : la carte tenue est de cuivre.
    expect(document.querySelectorAll('[data-tirage]').length).toBeGreaterThan(0);
    for (const tirage of document.querySelectorAll('[data-tirage]')) {
      expect(tirage.getAttribute('data-tirage')).toBe('cuivre');
    }
    // La place est prévenue : elle imprime le savoir privé tant que le pouce tient.
    expect(container.querySelector('[data-zone="barre"] [aria-pressed="true"]')).not.toBeNull();

    act(() => {
      fireEvent.keyDown(appui, { key: 'Escape' });
    });
    expect(screen.queryByTestId('ma-carte')).toBeNull();
  });

  it('un spectateur n’a pas de carte, mais sa barre garde la forme de tous', () => {
    const banc = premiereNuit();
    installe(banc, null);
    const { container } = render(<Nuit />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Fermer les yeux']);
    const appui = screen.getByRole('button', { name: 'Gardez le pouce : ma carte' });
    expect(appui).toBeEnabled();
    act(() => {
      fireEvent.keyDown(appui, { key: 'Enter' });
    });
    expect(screen.queryByTestId('ma-carte')).toBeNull();
  });

  it('« Fermer les yeux » ne joue rien : l’écran tombe un instant au palier IV, un toucher le rouvre', async () => {
    const banc = premiereNuit();
    installe(banc, siegeDe(banc, 'villageois'));
    const utilisateur = userEvent.setup();
    render(<Nuit />);
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer les yeux' }));
    const voile = screen.getByTestId('yeux-fermes');
    expect(voile.className).toContain('--cp-bistre-900');
    expect(jouerMock).not.toHaveBeenCalled();
    fireEvent.pointerDown(voile);
    expect(screen.queryByTestId('yeux-fermes')).toBeNull();
  });

  it('un mort voit le village dormir, la légende des morts, et l’au-delà derrière le pli', async () => {
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
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent('Tout voir, enfin, et trop tard.');
    const pli = within(zone(container, 'pli')).getByRole('button');
    expect(pli).toHaveTextContent('L’au-delà');
    // Le fil reste fermé tant qu'on ne tire pas le pli.
    expect(screen.getByTestId('fil')).toHaveAttribute('data-etendue', 'ferme');
    await utilisateur.click(pli);
    expect(screen.getByTestId('fil')).toHaveAttribute('data-etendue', 'tiers');
    sansIdentifiantBrut(container);
  });

  it('la meute vote en deux temps, voit les voix des siens se poser — et rien ne se teinte de sang (N2)', async () => {
    const banc = premiereNuit();
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const [proie, autre] = sieges(banc, 'villageois') as [number, number];
    // Le complice a déjà choisi.
    agir(banc, loupB, { type: 'devorer', target: autre });
    installe(banc, loupA);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('nuit-meute')).toBeInTheDocument();
    expect(screen.getByTestId('place')).not.toHaveAttribute('data-teinte', 'sang');
    // Les loups ne se mangent pas entre eux : leurs jetons ne se touchent pas.
    expect(screen.queryByRole('button', { name: `siège ${String(loupA)}` })).toBeNull();
    expect(screen.queryByRole('button', { name: `siège ${String(loupB)}` })).toBeNull();
    // La voix du complice se lit sur le jeton qu'il vise (ses initiales), et se dit aux lecteurs d'écran.
    expect(screen.getByTestId(`annotation-${String(autre)}`)).toHaveTextContent(nom(loupB));
    expect(screen.getByText(`vise ${nom(autre)}`)).toBeInTheDocument();
    expect(within(zone(container, 'resume')).getByText(/la meute : Joueur/)).toHaveTextContent(`${nom(autre)} (1)`);
    // La craie ne paraît qu'en texte, dans les pastilles de la place.
    expect(container.innerHTML).not.toMatch(/--sang|-sang\b|teinte="sang"/);
    for (const craie of container.querySelectorAll('.text-meute')) {
      expect(zone(container, 'place').contains(craie)).toBe(true);
      expect(craie.className).toContain('text-[12px]');
    }

    // Le fil de la meute est derrière le pli « La meute ».
    const pli = within(zone(container, 'pli')).getByRole('button');
    expect(pli).toHaveTextContent('La meute');
    expect(screen.getByTestId('fil')).toHaveAttribute('data-canaux', 'loups');
    await utilisateur.click(pli);
    expect(screen.getByTestId('fil')).toHaveAttribute('data-etendue', 'tiers');

    // Deux boutons, comme chez tous : « ma carte », et le principal — sans jeton, le silence.
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Ne viser personne']);
    // Toucher un jeton ne vote pas : le principal change, s'arme, puis confirme.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(proie)}` }));
    expect(jouerMock).not.toHaveBeenCalled();
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', `Dévorer ${nom(proie)}`]);
    await armerPuisConfirmer(utilisateur, `Dévorer ${nom(proie)}`);
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'devorer', target: proie });

    jouerMock.mockClear();
    await armerPuisConfirmer(utilisateur, 'Ne viser personne');
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'devorer', target: null });
    sansIdentifiantBrut(container);
  });

  it('un loup qui a voté retrouve sa voix et peut encore la changer', async () => {
    const banc = premiereNuit();
    const loup = siegeDe(banc, 'loup');
    const proie = siegeDe(banc, 'villageois');
    agir(banc, loup, { type: 'devorer', target: proie });
    installe(banc, loup);
    const { container } = render(<Nuit />);

    expect(within(zone(container, 'resume')).getByText(`Votre voix : ${nom(proie)}`)).toBeInTheDocument();
    expect(screen.getByTestId(`annotation-${String(proie)}`)).toHaveTextContent('vous');
    expect(screen.getByRole('button', { name: `siège ${String(proie)}` })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: `Dévorer ${nom(proie)}` })).toBeEnabled();
    // Toucher à nouveau son jeton rend le principal au silence.
    await userEvent.setup().click(screen.getByRole('button', { name: `siège ${String(proie)}` }));
    expect(screen.getByRole('button', { name: 'Ne viser personne' })).toBeInTheDocument();
  });

  it('la Sorcière voit la victime et la sauve — sans retour', async () => {
    const { banc, victime } = etapeSorciere();
    installe(banc, siegeDe(banc, 'sorciere'));
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByText(`La meute a désigné sa victime : ${nom(victime)}.`, { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId(`annotation-${String(victime)}`)).toHaveTextContent('victime');
    expect(within(zone(container, 'resume')).getByText('Vie : 1')).toBeInTheDocument();
    expect(within(zone(container, 'resume')).getByText('Mort : 1')).toBeInTheDocument();
    // Rien de touché : le principal ne verse rien.
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Ne rien faire']);

    // Toucher la victime : « Sauver ».
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(victime)}` }));
    expect(screen.getByTestId(`annotation-${String(victime)}`)).toHaveTextContent('sauvé·e');
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', `Sauver ${nom(victime)}`]);
    await utilisateur.click(screen.getByRole('button', { name: `Sauver ${nom(victime)}` }));
    expect(screen.getByRole('button', { name: `Confirmer — sans retour : sauver ${nom(victime)}` })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: /^Confirmer/ }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sorciere', save: true, kill: null });
    sansIdentifiantBrut(container);
  });

  it('la Sorcière empoisonne un vivant, cumule s’il le faut — ou ne fait rien', async () => {
    const { banc, victime } = etapeSorciere();
    const sorciere = siegeDe(banc, 'sorciere');
    const loup = siegeDe(banc, 'loup');
    installe(banc, sorciere);
    const utilisateur = userEvent.setup();
    render(<Nuit />);

    // Elle-même est empoisonnable (R42).
    expect(screen.getByRole('button', { name: `siège ${String(sorciere)}` })).toBeInTheDocument();
    // Toucher un autre jeton : le principal empoisonne.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(loup)}` }));
    expect(screen.getByTestId(`annotation-${String(victime)}`)).toHaveTextContent('victime');
    // Toucher la victime en plus : les deux se cumulent, et le libellé le dit.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(victime)}` }));
    expect(screen.getByRole('button', { name: `Sauver ${nom(victime)} et empoisonner ${nom(loup)}` })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(victime)}` }));
    await armerPuisConfirmer(utilisateur, `Empoisonner ${nom(loup)}`);
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sorciere', save: false, kill: loup });

    // Le jeton touché à nouveau : plus rien n'est versé, le principal dit « Ne rien faire ».
    jouerMock.mockClear();
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(loup)}` }));
    await utilisateur.click(screen.getByRole('button', { name: 'Ne rien faire' }));
    expect(screen.getByRole('button', { name: 'Confirmer — sans retour : ne rien faire' })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: /^Confirmer/ }));
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
    // La place dessine l'interdit (état 16).
    expect(screen.getByTestId('place')).toHaveAttribute('data-interdits', String(hier));
    // Lui-même reste protégeable.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(salvateur)}` }));
    expect(within(zone(container, 'resume')).getByText(`Votre choix : ${nom(salvateur)}`)).toBeInTheDocument();
    await armerPuisConfirmer(utilisateur, `Protéger ${nom(salvateur)}`);
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'proteger', target: salvateur });
    sansIdentifiantBrut(container);
  });

  it('le Salvateur, son bouclier posé, lit le récapitulatif et peut changer', async () => {
    const banc = premiereNuit();
    const salvateur = siegeDe(banc, 'salvateur');
    agir(banc, salvateur, { type: 'proteger', target: siegeDe(banc, 'voyante') });
    installe(banc, salvateur);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent('Vous pouvez changer tant que l’étape court.');
    expect(within(zone(container, 'place')).queryAllByRole('button')).toEqual([]);
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Changer']);
    await utilisateur.click(screen.getByRole('button', { name: 'Changer' }));
    expect(within(zone(container, 'place')).getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('Cupidon lie deux vivants, pas un de moins, et confirme', async () => {
    const banc = premiereNuit();
    const cupidon = siegeDe(banc, 'cupidon');
    const [a, b] = sieges(banc, 'villageois') as [number, number];
    installe(banc, cupidon);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    expect(screen.getByTestId('place')).not.toHaveAttribute('data-teinte', 'sang');
    // Sans paire, le principal est actif mais n'envoie rien : il pose un avis.
    await utilisateur.click(screen.getByRole('button', { name: 'Choisissez deux vivants' }));
    expect(jouerMock).not.toHaveBeenCalled();
    expect(useStore.getState().notices.at(-1)?.message).toMatch(/Touchez deux vivants/);
    // Un troisième toucher remplace le plus ancien : le premier est Cupidon lui-même.
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(cupidon)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(a)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(b)}` }));
    expect(screen.getByTestId(`annotation-${String(a)}`)).toHaveTextContent('lié·e');
    await utilisateur.click(screen.getByRole('button', { name: `Lier ${nom(a)} et ${nom(b)}` }));
    expect(screen.getByRole('button', { name: `Confirmer : lier ${nom(a)} et ${nom(b)}` })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: /^Confirmer/ }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'cupidon', a, b });
    sansIdentifiantBrut(container);
  });

  it('la Voyante sonde un autre vivant, et ne relit son carnet que sous le pouce', async () => {
    const banc = premiereNuit();
    const voyante = siegeDe(banc, 'voyante');
    const loup = siegeDe(banc, 'loup');
    agir(banc, voyante, { type: 'sonder', target: loup });
    finirPhase(banc);
    // L'étape principale close, la vision s'inscrit — sous le pouce seulement.
    installe(banc, voyante);
    const dort = render(<Nuit />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(dort.container.textContent).not.toMatch(/Loup-garou/);
    // La barre est celle de tous ; le carnet vit dans la ligne de résumé.
    expect(boutonsDeLaBarre(dort.container)).toEqual(['Gardez le pouce : ma carte', 'Fermer les yeux']);
    const lire = within(zone(dort.container, 'resume')).getByRole('button', { name: 'Carnet' });
    act(() => {
      fireEvent.keyDown(lire, { key: 'Enter' });
    });
    expect(screen.getByTestId('carnet')).toHaveTextContent(`${nom(loup)} est Loup-garou`);
    act(() => {
      fireEvent.keyDown(lire, { key: 'Escape' });
    });
    expect(screen.queryByTestId('carnet')).toBeNull();
    sansIdentifiantBrut(dort.container);
    dort.unmount();

    finirPhase(banc); // la Sorcière
    finirPhase(banc); // le jour
    installe(banc, voyante);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    // Le carnet garde la nuit 1, sous le pouce : l'appui long « Carnet » de la ligne de résumé.
    expect(screen.queryByTestId('carnet')).toBeNull();
    const carnet = within(zone(container, 'resume')).getByRole('button', { name: 'Carnet' });
    act(() => {
      fireEvent.keyDown(carnet, { key: 'Enter' });
    });
    expect(screen.getByTestId('carnet')).toHaveTextContent('Nuit 1');
    expect(screen.getByTestId('carnet')).toHaveTextContent(`${nom(loup)} est Loup-garou`);
    act(() => {
      fireEvent.keyDown(carnet, { key: 'Escape' });
    });
    // Elle ne peut pas se sonder elle-même, ni passer son tour.
    expect(screen.queryByRole('button', { name: `siège ${String(voyante)}` })).toBeNull();
    expect(screen.queryByRole('button', { name: /personne/ })).toBeNull();
    expect(boutonsDeLaBarre(container)).toEqual(['Gardez le pouce : ma carte', 'Choisissez un vivant']);
    await utilisateur.click(screen.getByRole('button', { name: 'Choisissez un vivant' }));
    expect(jouerMock).not.toHaveBeenCalled();
    expect(useStore.getState().notices.at(-1)?.message).toMatch(/Touchez un vivant/);

    const cible = siegeDe(banc, 'sorciere');
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(cible)}` }));
    await armerPuisConfirmer(utilisateur, `Sonder ${nom(cible)}`);
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'sonder', target: cible });
    sansIdentifiantBrut(container);
  });

  it('les amoureux vivants ont leur serment derrière le pli de tous', async () => {
    const banc = premiereNuit();
    const [a, b] = sieges(banc, 'villageois') as [number, number];
    agir(banc, siegeDe(banc, 'cupidon'), { type: 'cupidon', a, b });
    finirPhase(banc); // l'étape principale scelle le couple
    installe(banc, a);
    const utilisateur = userEvent.setup();
    const { container } = render(<Nuit />);

    // Le serment n'est plus une ligne de plus : c'est le libellé du pli, de la même forme pour tous.
    const pli = within(zone(container, 'pli')).getByRole('button');
    expect(pli).toHaveTextContent('Le serment');
    expect(screen.getByTestId('fil')).toHaveAttribute('data-etendue', 'ferme');
    await utilisateur.click(pli);
    expect(screen.getByTestId('fil')).toHaveAttribute('data-etendue', 'tiers');
  });
});
