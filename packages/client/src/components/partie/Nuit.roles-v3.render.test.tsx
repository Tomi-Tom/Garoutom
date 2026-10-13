/* @vitest-environment jsdom */
/**
 * La nuit des rôles de la v3 (R105–R114), rendue sur des vues du moteur.
 *
 * Mêmes doublures que `Nuit.render.test.tsx` : la place rend un bouton par
 * siège choisissable et les pastilles qu'on lui confie, le fil un repère. On
 * prouve ce que la nuit demande au moteur — le Renard flaire un trio, lui
 * compris, ou s'abstient —, que le trio se lit sur la place avant
 * confirmation (un voisin mort ne compte pas : le trio se réduit), et que qui
 * n'est pas le Renard voit la même nuit qu'avant (N1).
 *
 * La deuxième vague y entre : le talon du Voleur — sa phase précède la
 * révélation, c'est `ChoixVoleur` qu'on rend, depuis l'aiguillage de
 * `Partie` —, les deux solitaires de la première nuit (le Chien-Loup se
 * range, l'Enfant Sauvage choisit son modèle), et le murmure des fratries :
 * l'onglet et le pli ne paraissent qu'après la révélation (R113), la
 * pastille de sang ne se pose que sous le pouce (R114).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jouer } from '../../lib/actions.js';
import { useStore } from '../../lib/store.js';
import { voixDuSkin } from '../../skins/registre.js';
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
import { annotationsDeMaCarte } from './MaCarte.js';
import { ChoixVoleur } from './nuit/ChoixVoleur.js';
import { ongletsVisibles } from './fil/logique.js';
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
    <div data-testid="fil" data-mode={props.mode} data-etendue={props.etendue} data-canaux={props.canaux?.join(',')} />
  ),
}));

const jouerMock = vi.mocked(jouer);

function nom(seat: number): string {
  return `Joueur ${String(seat)}`;
}

function sansIdentifiantBrut(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(IDENTIFIANT_BRUT);
}

/** Le geste en deux temps : un toucher arme, le second confirme. */
async function armerPuisConfirmer(utilisateur: ReturnType<typeof userEvent.setup>, nomBouton: string | RegExp) {
  await utilisateur.click(screen.getByRole('button', { name: nomBouton }));
  await utilisateur.click(screen.getByRole('button', { name: /^Confirmer/ }));
}

/** La nuit passe sans que personne ne joue. */
function laNuitPasse(banc: Banc): void {
  while (banc.state.phase.kind === 'nuit') finirPhase(banc);
}

describe('<Nuit /> — les rôles de la v3', () => {
  beforeEach(() => {
    jouerMock.mockClear();
    useStore.setState({ room: null, game: null, playerId: null, notices: [], live: null });
  });

  it('le Renard flaire le trio d’un vivant — lui compris — ou s’abstient, et le trio se lit avant confirmation', async () => {
    const banc = nouvellePartie({ roles: ['renard', 'voyante'] });
    tousPrets(banc);
    const renard = siegeDe(banc, 'renard');
    const loup = siegeDe(banc, 'loup');
    const centre = siegeDe(banc, 'villageois');
    const total = banc.nombre;
    const gauche = (centre + 1) % total;
    const droite = (centre - 1 + total) % total;

    installe(banc, renard);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    expect(screen.getByTestId('nuit-renard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'le Renard' })).toBeInTheDocument();
    expect(screen.getByText(/vous flairerez son trio/)).toBeInTheDocument();
    // Tout vivant peut être le centre, le Renard lui-même compris (D29).
    expect(screen.getByRole('button', { name: `siège ${String(renard)}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `siège ${String(loup)}` })).toBeInTheDocument();

    // Rien ne part avant la confirmation ; le trio se lit sur la place (R105).
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(centre)}` }));
    expect(jouerMock).not.toHaveBeenCalled();
    expect(screen.getByTestId(`annotation-${String(centre)}`)).toHaveTextContent('centre');
    expect(screen.getByTestId(`annotation-${String(gauche)}`)).toHaveTextContent('à sa gauche');
    expect(screen.getByTestId(`annotation-${String(droite)}`)).toHaveTextContent('à sa droite');
    // Le résumé redit le trio qu'on s'apprête à envoyer.
    expect(screen.getByText(/le trio :/)).toHaveTextContent(
      `le trio : ${[centre, gauche, droite]
        .map((seat) => nom(seat))
        .join(' · ')}`,
    );

    // La barre arme, puis confirme : le moteur reçoit le centre du trio.
    await utilisateur.click(screen.getByRole('button', { name: `Envoyer votre flair vers ${nom(centre)}` }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: `Confirmer : envoyer votre flair vers ${nom(centre)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'flairer', centre });
    sansIdentifiantBrut(vue.container);
    vue.unmount();

    // Une fois le flair parti, le récapitulatif — et le droit de se raviser
    // vers l'abstention.
    agir(banc, renard, { type: 'flairer', centre });
    installe(banc, renard);
    render(<Nuit />);
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent('Votre flair s’est posé sur la place');
    await utilisateur.click(screen.getByRole('button', { name: 'Changer' }));
    await armerPuisConfirmer(utilisateur, 'Ne sondez personne');
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'flairer', centre: null });
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent('Vous ne sondez personne cette nuit.');
  });

  it('un voisin mort ne compte pas : le trio se réduit au vivants', async () => {
    const banc = nouvellePartie({ roles: ['renard', 'voyante'] });
    tousPrets(banc);
    const renard = siegeDe(banc, 'renard');
    const [loupA, loupB] = sieges(banc, 'loup') as [number, number];
    const total = banc.nombre;
    // Deux villageois voisins dans l'ordre du cercle : l'un sera le centre du
    // trio, l'autre — son voisin de gauche (R105) — la proie de la meute.
    const paire = banc.state.players.find(
      (p) => p.role === 'villageois' && banc.state.players[(p.seat + 1) % total]?.role === 'villageois',
    );
    expect(paire).toBeDefined();
    const centre = paire?.seat as number;
    const mortVivant = (centre + 1) % total;
    const droite = (centre - 1 + total) % total;

    // La première nuit : le Renard s'abstient (son pouvoir lui reste), la
    // meute dévore le voisin de gauche.
    agir(banc, renard, { type: 'flairer', centre: null });
    agir(banc, loupA, { type: 'devorer', target: mortVivant });
    agir(banc, loupB, { type: 'devorer', target: mortVivant });
    laNuitPasse(banc);
    expect(banc.state.players[mortVivant]?.alive).toBe(false);
    // Le jour passe sans potence : la seconde nuit tombe.
    expect(banc.state.phase.kind).toBe('jour');
    finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });

    installe(banc, renard);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    // La place du mort ne se touche pas, et sa pastille ne paraît pas.
    expect(screen.queryByRole('button', { name: `siège ${String(mortVivant)}` })).toBeNull();
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(centre)}` }));
    expect(screen.getByTestId(`annotation-${String(centre)}`)).toHaveTextContent('centre');
    expect(screen.queryByTestId(`annotation-${String(mortVivant)}`)).toBeNull();
    expect(screen.getByTestId(`annotation-${String(droite)}`)).toHaveTextContent('à sa droite');
    // Le trio réduit : le centre et son seul voisin vivant.
    expect(screen.getByText(/le trio :/)).toHaveTextContent(`le trio : ${nom(centre)} · ${nom(droite)}`);

    await utilisateur.click(screen.getByRole('button', { name: `Envoyer votre flair vers ${nom(centre)}` }));
    await utilisateur.click(screen.getByRole('button', { name: `Confirmer : envoyer votre flair vers ${nom(centre)}` }));
    expect(jouerMock).toHaveBeenLastCalledWith({ type: 'flairer', centre });
    sansIdentifiantBrut(vue.container);
  });

  it('qui n’est pas le Renard voit la même nuit qu’avant : rien du trio ne fuit', () => {
    const banc = nouvellePartie({ roles: ['renard', 'voyante'] });
    tousPrets(banc);
    const renard = siegeDe(banc, 'renard');
    agir(banc, renard, { type: 'flairer', centre: siegeDe(banc, 'villageois') });

    installe(banc, siegeDe(banc, 'villageois'));
    const { container } = render(<Nuit />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    // Aucune pastille, aucun mot du trio : la nuit du dormeur est celle
    // d'avant (N1, R87 — le flair ne se crie pas).
    expect(screen.queryByText(/trio/)).toBeNull();
    expect(screen.queryByTestId(/^annotation-/)).toBeNull();
    sansIdentifiantBrut(container);
  });

  /* ---------------------------------------------------------------- */
  /* R110 — le Voleur, avant la révélation                            */
  /* ---------------------------------------------------------------- */

  it('le Voleur voit son talon, deux loups l’obligent à prendre — et rien ne part avant la confirmation', async () => {
    const banc = nouvellePartie({ roles: ['voleur', 'voyante'] });
    const phase = banc.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    // Talon fabriqué : deux loups — l’obligation, à elle seule (R110).
    banc.state.phase = { kind: 'voleur', seat: phase.seat, cartes: ['loup', 'loup'] };
    const voleur = phase.seat;

    installe(banc, voleur);
    const utilisateur = userEvent.setup();
    const vue = render(<ChoixVoleur />);

    expect(screen.getByTestId('nuit-voleur')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'le Voleur' })).toBeInTheDocument();
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/il faut en prendre une/);
    // Les deux cartes du talon, chacune sous son propre bouton — jamais le
    // bouton de la carte, qui ne dirait que le nom du rôle.
    const cartes = screen.getAllByRole('button', { name: 'Prendre la carte : Loup-garou' });
    expect(cartes).toHaveLength(2);
    // Le talon dit aux lecteurs d’écran, l’obligation avec.
    expect(screen.getByText('Première carte : Loup-garou')).toBeInTheDocument();
    expect(screen.getByText('Deux loups : il faut en prendre une.')).toBeInTheDocument();

    // Rien de touché : l’abstention est impossible, le principal pose un avis.
    expect(screen.getByRole('button', { name: 'Choisissez une carte' })).toBeInTheDocument();
    expect(jouerMock).not.toHaveBeenCalled();

    // Le toucher arme ; la confirmation seule part, sans retour (R110).
    await utilisateur.click(cartes[0] as HTMLElement);
    expect(jouerMock).not.toHaveBeenCalled();
    expect(cartes[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Votre choix : Loup-garou')).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: 'Choisir Loup-garou' }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer — sans retour : choisir Loup-garou' }));
    expect(jouerMock).toBeCalledWith({ type: 'voler', carte: 0 });
    sansIdentifiantBrut(vue.container);
  });

  it('sans obligation, le Voleur peut rester le Voleur — un choix lui aussi, en deux temps', async () => {
    const banc = nouvellePartie({ roles: ['voleur'] });
    const phase = banc.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    banc.state.phase = { kind: 'voleur', seat: phase.seat, cartes: ['voyante', 'sorciere'] };
    const voleur = phase.seat;

    installe(banc, voleur);
    const utilisateur = userEvent.setup();
    const vue = render(<ChoixVoleur />);

    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/ou restez le Voleur/);
    expect(screen.getByRole('button', { name: 'Prendre la carte : la Voyante' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prendre la carte : la Sorcière' })).toBeInTheDocument();

    // Garder sa carte s’arme comme le reste : aucun pouvoir ne se jouera.
    await utilisateur.click(screen.getByRole('button', { name: 'Rester le Voleur' }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer — sans retour : rester le Voleur' }));
    expect(jouerMock).toBeCalledWith({ type: 'voler', carte: null });
    sansIdentifiantBrut(vue.container);
  });

  it('pendant la phase du Voleur, tous les autres dorment comme n’importe quelle nuit — et le pli ne dit rien des fratries', () => {
    const banc = nouvellePartie({ roles: ['voleur', 'soeurs'] });
    const phase = banc.state.phase;
    if (phase.kind !== 'voleur') throw new Error('le Voleur n’a pas ouvert la partie');
    const [soeurA, soeurB] = sieges(banc, 'soeurs') as [number, number];
    expect(soeurA).not.toBe(soeurB);
    // D46 : la vue elle-même est muette pendant la phase du Voleur — ni
    // fratrie, ni canal. La connaissance naît à la révélation (R113) : ce
    // n’est plus le masquage de l’écran qui la retient, c’est la vérité de
    // la vue.
    const voix = voixDuSkin('thiercelieux');
    installe(banc, soeurA);
    const avant = useStore.getState().game;
    if (avant === null) throw new Error('pas de vue');
    expect(avant.fratrie).toEqual([]);
    expect(annotationsDeMaCarte(avant, voix)).toEqual({});
    expect(ongletsVisibles(avant)).not.toContain('fratrie');

    // L’écran d’un autre siège : le village qui dort, rien du talon — ni
    // bouton de prise, ni le dire aux lecteurs d’écran —, et le pli reste
    // muet sur le murmure (R113, R114). Le crieur, lui, dit la phase à
    // tous : « Deux cartes restent sur la table », sans la main qui choisit.
    const { container } = render(<ChoixVoleur />);
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.queryByTestId('nuit-voleur')).toBeNull();
    expect(screen.queryByRole('button', { name: /Prendre la carte/ })).toBeNull();
    expect(screen.queryByText(/Première carte/)).toBeNull();
    expect(screen.queryByText('La fratrie')).toBeNull();
    expect(screen.getByText('Le registre')).toBeInTheDocument();
    sansIdentifiantBrut(container);
  });

  /* ---------------------------------------------------------------- */
  /* R111, R112 — les deux solitaires de la première nuit             */
  /* ---------------------------------------------------------------- */

  it('le Chien-Loup se range pour toujours — deux bords de même encre, changeable tant que l’étape court', async () => {
    const banc = nouvellePartie({ roles: ['chienLoup', 'voyante'] });
    tousPrets(banc);
    const chien = siegeDe(banc, 'chienLoup');

    installe(banc, chien);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    expect(screen.getByTestId('nuit-chien-loup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'le Chien-Loup' })).toBeInTheDocument();
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/rangez-vous pour toujours/);
    // Les deux bords : même gabarit, même encre — le choix ne se colore pas (N2).
    const village = screen.getByRole('button', { name: 'Le village' });
    const meute = screen.getByRole('button', { name: 'La meute' });
    expect(village).toBeInTheDocument();
    expect(meute).toBeInTheDocument();

    // Rien ne part avant la confirmation ; le résumé dit le bord choisi.
    await utilisateur.click(meute);
    expect(jouerMock).not.toHaveBeenCalled();
    expect(meute).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Votre choix : la meute')).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: 'Se ranger avec la meute' }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: 'Confirmer : se ranger avec la meute' }));
    expect(jouerMock).toBeCalledWith({ type: 'seRanger', camp: 'loups' });
    sansIdentifiantBrut(vue.container);

    // Le camp une fois pris, le récapitulatif — l’écran réinstallé ne sait
    // plus lequel : il ne le promet pas (R111).
    agir(banc, chien, { type: 'seRanger', camp: 'loups' });
    installe(banc, chien);
    vue.unmount();
    render(<Nuit />);
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/Votre camp est choisi pour toujours/);
    await utilisateur.click(screen.getByRole('button', { name: 'Changer' }));
    // La place rouvre vide : sans bord touché, le principal ne promet rien.
    expect(screen.getByRole('button', { name: 'Choisissez votre camp' })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: 'Le village' }));
    expect(screen.getByRole('button', { name: 'Se ranger avec le village' })).toBeInTheDocument();
  });

  it('l’Enfant Sauvage prend un vivant pour modèle — lui compris, jamais informé', async () => {
    const banc = nouvellePartie({ roles: ['enfantSauvage', 'voyante'] });
    tousPrets(banc);
    const enfant = siegeDe(banc, 'enfantSauvage');
    const villageois = siegeDe(banc, 'villageois');

    installe(banc, enfant);
    const utilisateur = userEvent.setup();
    const vue = render(<Nuit />);

    expect(screen.getByTestId('nuit-enfant-sauvage')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'l’Enfant Sauvage' })).toBeInTheDocument();
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/il ne le saura jamais/);
    // N’importe quel vivant, lui compris (R112).
    expect(screen.getByRole('button', { name: `siège ${String(enfant)}` })).toBeInTheDocument();

    // Rien ne part avant la confirmation (P0-6).
    await utilisateur.click(screen.getByRole('button', { name: `siège ${String(villageois)}` }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole('button', { name: `Prendre ${nom(villageois)} pour modèle` }));
    expect(jouerMock).not.toHaveBeenCalled();
    await utilisateur.click(
      screen.getByRole('button', { name: `Confirmer : prendre ${nom(villageois)} pour modèle` }),
    );
    expect(jouerMock).toBeCalledWith({ type: 'designerModele', target: villageois });
    sansIdentifiantBrut(vue.container);

    // Le modèle parti, le récapitulatif le redit — et « Changer » rouvre la place.
    agir(banc, enfant, { type: 'designerModele', target: villageois });
    installe(banc, enfant);
    vue.unmount();
    render(<Nuit />);
    expect(screen.getByTestId('consigne-nuit')).toHaveTextContent(/Votre modèle est choisi/);
    expect(screen.getByRole('button', { name: 'Changer' })).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /* R113, R114 — les fratries                                         */
  /* ---------------------------------------------------------------- */

  it('la sœur reconnaît sa sœur à la révélation : pli, onglet et pastille — jamais un nom de rôle', () => {
    const banc = nouvellePartie({ roles: ['soeurs', 'voyante'] });
    const [soeurA, soeurB] = sieges(banc, 'soeurs') as [number, number];
    const voix = voixDuSkin('thiercelieux');

    // La révélation passe, la première nuit tombe.
    tousPrets(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit' });

    installe(banc, soeurA);
    const game = useStore.getState().game;
    if (game === null) throw new Error('pas de vue');
    // Le murmure est lisible dès la révélation, la nuit comme le jour (R114).
    expect(ongletsVisibles(game)).toContain('fratrie');
    const { container } = render(<Nuit />);
    // La sœur n’a rien à jouer : le village dort, et le pli ouvre son murmure.
    expect(screen.getByTestId('village-dort')).toBeInTheDocument();
    expect(screen.getByText('La fratrie')).toBeInTheDocument();
    sansIdentifiantBrut(container);

    // La pastille de sang ne se pose que sous le pouce, et dit le lien, pas
    // la carte : « ta sœur », jamais « les Deux Sœurs » (R113, N2).
    const annotations = annotationsDeMaCarte(game, voix);
    expect(Object.keys(annotations)).toEqual([String(soeurB)]);
    const { container: pastille } = render(<div>{annotations[soeurB]}</div>);
    expect(screen.getByText('ta sœur')).toBeInTheDocument();
    expect(screen.getByText(/de votre fratrie/)).toBeInTheDocument();
    sansIdentifiantBrut(pastille);
  });
});
