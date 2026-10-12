/* @vitest-environment jsdom */
/**
 * La loi N1 en pixels (SPEC § 3.5, § 7.1) : la nuit, un voisin à un mètre ne
 * lit pas l'écran d'à côté, il en voit la **forme**. Tous les sièges — le
 * dormeur, le mort, l'amoureux, la Petite Fille, le spectateur, et chaque
 * rôle qui agit — montrent donc le même arbre de zones, aux mêmes hauteurs,
 * avec une seule barre au pouce de 72 px — et dedans exactement deux boutons
 * du même gabarit, « ma carte » et le principal (arbitrage du chef) —, un
 * seul pli, une seule consigne.
 *
 * Les écrans sont rendus en entier (frise, minuterie et crieur compris), sur
 * des vues d'une vraie partie du moteur ; rien n'est doublé.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { HAUTEURS_ZONES } from '../../caprices/index.js';
import { useStore } from '../../../lib/store.js';
import { Nuit } from '../Nuit.js';
import {
  agir,
  finirPhase,
  installe,
  nouvellePartie,
  salle,
  siegeDe,
  sieges,
  tousPrets,
  type Banc,
} from './banc.js';

/**
 * La silhouette d'un arbre du DOM : balises et classes, sans aucun texte ni
 * attribut de contenu. Un dessin (`svg`) compte pour une seule forme — sa
 * boîte, pas ses traits — et la place, propre à chaque siège (le cadre
 * « moi » est sur son propre jeton), pour une seule zone.
 */
function silhouette(element: Element): string {
  const balise = element.tagName.toLowerCase();
  const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort().join('.');
  const feuille = balise === 'svg' || element.getAttribute('data-zone') === 'place';
  const enfants = feuille ? '' : [...element.children].map(silhouette).join(',');
  return `${balise}${classes === '' ? '' : `.${classes}`}[${enfants}]`;
}

/** Les zones du gabarit, dans l'ordre, avec leur hauteur. */
function zones(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('.gabarit > [data-zone]')].map(
    (zone) => `${zone.dataset.zone ?? '?'}:${zone.style.getPropertyValue('--zone-h')}`,
  );
}

function zone(container: HTMLElement, nom: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-zone="${nom}"]`);
  if (element === null) throw new Error(`Pas de zone « ${nom} »`);
  return element;
}

/** L'arbre de référence : frise, minuterie, crieur, consigne, place, résumé, pli, colonne (fermée), barre. */
const ZONES_DE_LA_NUIT = [
  `frise:${String(HAUTEURS_ZONES.frise)}px`,
  `minuterie:${String(HAUTEURS_ZONES.minuterie)}px`,
  `crieur:${String(HAUTEURS_ZONES.crieur)}px`,
  `consigne:${String(HAUTEURS_ZONES.consigne)}px`,
  `place:${String(HAUTEURS_ZONES.place)}px`,
  `resume:${String(HAUTEURS_ZONES.resume)}px`,
  `pli:${String(HAUTEURS_ZONES.pli)}px`,
  'colonne:0px',
  `barre:${String(HAUTEURS_ZONES.barre)}px`,
];

interface Mesure {
  zones: string[];
  boutonsDeLaBarre: number;
  /** Le gabarit des boutons de la barre : leurs classes, dans l'ordre. */
  gabaritDeLaBarre: string;
  forme: string;
  texte: string;
}

/** Ce qu'un voisin voit de l'écran d'un siège : sa forme. */
function mesurer(container: HTMLElement): Mesure {
  const barre = zone(container, 'barre');
  // Une barre, un rang, des boutons de la même famille — aucune teinte de rôle.
  expect(barre.querySelectorAll('.barre-pouce')).toHaveLength(1);
  const rang = barre.querySelector('.barre-pouce-rang');
  expect(rang).not.toBeNull();
  const boutons = [...barre.querySelectorAll('button')];
  for (const bouton of boutons) {
    expect(bouton).toHaveClass('bouton');
    expect(bouton.getAttribute('style')).toBeNull();
    expect(bouton).toBeEnabled();
  }
  // À gauche « ma carte » (dans son enveloppe), à droite le principal, enfant direct du rang.
  expect(boutons[0]).toHaveClass('appui-long');
  expect(boutons[1]?.parentElement).toBe(rang);
  // Un pli, une consigne.
  expect(zone(container, 'pli').querySelectorAll('button.pli')).toHaveLength(1);
  expect(within(zone(container, 'consigne')).getAllByTestId('consigne-nuit')).toHaveLength(1);
  // Aucune teinte de sang, nulle part (N2).
  expect(container.innerHTML).not.toMatch(/--sang|-sang\b|teinte="sang"/);
  return {
    zones: zones(container),
    boutonsDeLaBarre: boutons.length,
    gabaritDeLaBarre: boutons.map((bouton) => bouton.className).join(' | '),
    forme: silhouette(container),
    texte: container.textContent ?? '',
  };
}

function rendre(banc: Banc, seat: number | null): Mesure & { demonter: () => void } {
  installe(banc, seat);
  const vue = render(<Nuit />);
  return { ...mesurer(vue.container), demonter: vue.unmount };
}

/**
 * La deuxième nuit d'une table de dix : deux villageois liés par Cupidon, un
 * troisième dévoré la première nuit, un quatrième qui dort sans histoire ; le
 * Salvateur a protégé la Voyante hier.
 */
function deuxiemeNuit(): { banc: Banc; villageois: number; amoureux: number; mort: number } {
  const banc = nouvellePartie({}, 10);
  tousPrets(banc);
  const [a, b, proie, temoin] = sieges(banc, 'villageois') as [number, number, number, number];
  agir(banc, siegeDe(banc, 'cupidon'), { type: 'cupidon', a, b });
  agir(banc, siegeDe(banc, 'salvateur'), { type: 'proteger', target: siegeDe(banc, 'voyante') });
  agir(banc, siegeDe(banc, 'voyante'), { type: 'sonder', target: siegeDe(banc, 'loup') });
  for (const loup of sieges(banc, 'loup')) agir(banc, loup, { type: 'devorer', target: proie });
  for (let garde = 0; garde < 10; garde += 1) {
    const phase = banc.state.phase;
    if (phase.kind === 'nuit' && phase.step === 'principale' && banc.state.day === 2) break;
    finirPhase(banc);
  }
  expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
  expect(banc.state.day).toBe(2);
  expect(banc.state.players[proie]?.alive).toBe(false);
  expect(banc.state.lovers).toEqual([a, b]);
  return { banc, villageois: temoin, amoureux: a, mort: proie };
}

/** Une nuit paire, l'étape du Loup Blanc ouverte. */
function etapeDuLoupBlanc(): Banc {
  const banc = nouvellePartie({ roles: ['loupBlanc', 'voyante'], loups: 2 }, 9);
  tousPrets(banc);
  // Une fonction plutôt qu'un champ : la phase change sous les pieds du compilateur.
  const phase = () => banc.state.phase;
  while (phase().kind === 'nuit') finirPhase(banc);
  finirPhase(banc); // le jour 1, sans potence
  const principale = () => {
    const courante = phase();
    return courante.kind === 'nuit' && courante.step === 'principale';
  };
  while (principale()) finirPhase(banc);
  expect(phase()).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });
  return banc;
}

describe('la loi N1, la nuit : un seul gabarit pour tous les sièges', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null, playerId: null, chronique: [], notices: [], live: null });
  });

  it('un villageois, un amoureux et un mort ont la même silhouette, au trait près', () => {
    const { banc, villageois, amoureux, mort } = deuxiemeNuit();

    const formes = [villageois, amoureux, mort].map((seat) => {
      const rendu = rendre(banc, seat);
      expect(screen.getByTestId('village-dort')).toBeInTheDocument();
      rendu.demonter();
      return rendu;
    });

    expect(formes[1]?.forme).toBe(formes[0]?.forme);
    expect(formes[2]?.forme).toBe(formes[0]?.forme);
    for (const forme of formes) expect(forme.boutonsDeLaBarre).toBe(2);
  });

  it('tous les écrans de la nuit — dormeurs et rôles qui agissent — ont le même arbre de zones, aux mêmes hauteurs', async () => {
    const mesures = new Map<string, Mesure>();
    const garder = (nom: string, rendu: Mesure & { demonter: () => void }) => {
      mesures.set(nom, rendu);
      rendu.demonter();
    };

    // La deuxième nuit d'une table de dix.
    const { banc, villageois, amoureux, mort } = deuxiemeNuit();
    garder('dormeur', rendre(banc, villageois));
    garder('amoureux', rendre(banc, amoureux));
    garder('mort', rendre(banc, mort));
    garder('spectateur', rendre(banc, null));
    garder('salvateur (interdit)', rendre(banc, siegeDe(banc, 'salvateur')));
    garder('voyante', rendre(banc, siegeDe(banc, 'voyante')));
    garder('meute', rendre(banc, siegeDe(banc, 'loup')));

    // La Voyante qui lit son carnet sous le pouce, une fois l'étape close.
    const voyante = siegeDe(banc, 'voyante');
    agir(banc, voyante, { type: 'sonder', target: siegeDe(banc, 'sorciere') });
    installe(banc, voyante);
    {
      const vue = render(<Nuit />);
      const appui = within(zone(vue.container, 'resume')).getByRole('button', { name: 'Carnet' });
      act(() => {
        fireEvent.keyDown(appui, { key: 'Enter' });
      });
      expect(screen.getByTestId('carnet')).toBeInTheDocument();
      garder('voyante, récapitulatif + carnet tenu', { ...mesurer(vue.container), demonter: vue.unmount });
    }
    // Le Salvateur a posé son bouclier : le récapitulatif.
    agir(banc, siegeDe(banc, 'salvateur'), { type: 'proteger', target: villageois });
    garder('salvateur, récapitulatif', rendre(banc, siegeDe(banc, 'salvateur')));

    // La Sorcière : avec une victime, puis sans (une autre table, où la meute s'abstient).
    for (const loup of sieges(banc, 'loup')) agir(banc, loup, { type: 'devorer', target: villageois });
    while (banc.state.phase.kind === 'nuit' && banc.state.phase.step === 'principale') finirPhase(banc);
    expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'sorciere' });
    garder('sorcière', rendre(banc, siegeDe(banc, 'sorciere')));
    garder('meute pendant la Sorcière', rendre(banc, siegeDe(banc, 'loup')));
    {
      installe(banc, siegeDe(banc, 'sorciere'));
      const vue = render(<Nuit />);
      const utilisateur = userEvent.setup();
      await utilisateur.click(screen.getByRole('button', { name: 'Ne rien faire' }));
      // L'armement ne change ni la place des zones, ni le nombre de boutons.
      expect(screen.getByRole('button', { name: /^Confirmer/ })).toBeInTheDocument();
      garder('sorcière, bouton armé', { ...mesurer(vue.container), demonter: vue.unmount });
    }

    const sansVictime = nouvellePartie();
    tousPrets(sansVictime);
    for (const loup of sieges(sansVictime, 'loup')) agir(sansVictime, loup, { type: 'devorer', target: null });
    while (sansVictime.state.phase.kind === 'nuit' && sansVictime.state.phase.step === 'principale') finirPhase(sansVictime);
    garder('sorcière sans victime', rendre(sansVictime, siegeDe(sansVictime, 'sorciere')));

    // Cupidon, la première nuit.
    const premiere = nouvellePartie();
    tousPrets(premiere);
    garder('cupidon', rendre(premiere, siegeDe(premiere, 'cupidon')));

    // Le Corbeau et la Petite Fille.
    const corbeau = nouvellePartie({ roles: ['corbeau', 'petiteFille'], loups: 2 });
    tousPrets(corbeau);
    agir(corbeau, siegeDe(corbeau, 'loup'), { type: 'devorer', target: siegeDe(corbeau, 'villageois') });
    garder('corbeau', rendre(corbeau, siegeDe(corbeau, 'corbeau')));
    garder('petite fille', rendre(corbeau, siegeDe(corbeau, 'petiteFille')));

    // Le Loup Blanc, seul en scène.
    const blanc = etapeDuLoupBlanc();
    garder('loup blanc', rendre(blanc, siegeDe(blanc, 'loupBlanc')));
    garder('meute pendant le Loup Blanc', rendre(blanc, siegeDe(blanc, 'loup')));

    // Le même arbre, aux mêmes hauteurs, partout.
    for (const [nom, mesure] of mesures) expect(mesure.zones, nom).toEqual(ZONES_DE_LA_NUIT);

    // La barre au pouce (arbitrage du chef) : EXACTEMENT deux boutons chez
    // tous, du même gabarit — « ma carte » à gauche, le principal à droite.
    // Qui agit et qui dort ne se comptent plus au nombre de boutons.
    expect(mesures.size).toBe(18);
    const reference = mesures.get('dormeur')?.gabaritDeLaBarre;
    expect(reference).toBe('bouton bouton-secondaire appui-long w-full | bouton bouton-primaire');
    for (const [nom, mesure] of mesures) {
      expect(mesure.boutonsDeLaBarre, nom).toBe(2);
      expect(mesure.gabaritDeLaBarre, nom).toBe(reference);
    }
  });

  it('la minuterie absente laisse, dans sa zone, un cadre de la même forme que la minuterie', () => {
    const { banc, villageois } = deuxiemeNuit();
    // Le cadre : sa classe, et la suite de ses balises.
    const cadre = (container: HTMLElement) => {
      const element = zone(container, 'minuterie').firstElementChild;
      return element === null ? '' : `${element.className}|${[...element.children].map((e) => e.tagName).join(',')}`;
    };
    installe(banc, villageois);
    const sans = render(<Nuit />);
    const cadreSans = cadre(sans.container);
    sans.unmount();

    // Le même siège, une échéance en main : la minuterie prend exactement le cadre.
    const room = { ...salle(banc.nombre), deadline: Date.now() + 30_000, deadlineDurationMs: 60_000 };
    useStore.setState({ room, decalageHorloge: 0 });
    const avec = render(<Nuit />);
    expect(cadre(avec.container)).toBe(cadreSans);
    expect(zones(avec.container)).toEqual(ZONES_DE_LA_NUIT);
  });

  it('le pli, de la même forme chez tous, n’ouvre que les canaux que chacun sait lire', async () => {
    const { banc, villageois, amoureux } = deuxiemeNuit();
    const utilisateur = userEvent.setup();

    installe(banc, amoureux);
    const vue = render(<Nuit />);
    await utilisateur.click(within(zone(vue.container, 'pli')).getByRole('button', { name: /Le serment/ }));
    expect(screen.getByRole('tab', { name: /serment/i })).toBeInTheDocument();
    vue.unmount();

    installe(banc, villageois);
    const autre = render(<Nuit />);
    await utilisateur.click(within(zone(autre.container, 'pli')).getByRole('button', { name: /Le registre/ }));
    expect(screen.queryByRole('tab', { name: /serment/i })).toBeNull();
  });
});
