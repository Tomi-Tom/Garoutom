/* @vitest-environment jsdom */
/**
 * Le silence à l'écran (D23) : la nuit, un voisin à un mètre ne lit pas
 * l'écran d'à côté, il en voit la **forme**. Trois sièges sans action — un
 * villageois, un amoureux, un mort — doivent donc montrer exactement la même
 * silhouette : mêmes balises, mêmes classes de mise en page, dans le même
 * ordre. Seuls les mots peuvent différer — et la mort, elle, est publique.
 *
 * L'écran entier de la partie est rendu, en-tête compris : c'est là que la
 * minuterie absente creusait la différence.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Partie } from '../../../screens/Partie.js';
import { useStore } from '../../../lib/store.js';
import { agir, finirPhase, installe, nouvellePartie, salle, siegeDe, sieges, tousPrets, type Banc } from './banc.js';

/**
 * La silhouette d'un arbre du DOM : balises et classes, sans aucun texte ni
 * attribut de contenu. Les identifiants générés (`useId`) et les styles
 * d'animation en ligne n'y entrent pas.
 */
function silhouette(element: Element): string {
  const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort().join('.');
  const enfants = [...element.children].map(silhouette).join(',');
  return `${element.tagName.toLowerCase()}${classes === '' ? '' : `.${classes}`}[${enfants}]`;
}

/**
 * La deuxième nuit d'une table de dix : deux villageois liés par Cupidon, un
 * troisième dévoré la première nuit, un quatrième qui dort sans histoire.
 */
function deuxiemeNuit(): { banc: Banc; villageois: number; amoureux: number; mort: number } {
  const banc = nouvellePartie({}, 10);
  tousPrets(banc);
  const [a, b, proie, temoin] = sieges(banc, 'villageois') as [number, number, number, number];
  agir(banc, siegeDe(banc, 'cupidon'), { type: 'cupidon', a, b });
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

function rendreSiege(banc: Banc, seat: number): { forme: string; texte: string; demonter: () => void } {
  installe(banc, seat);
  const room = salle(banc.nombre);
  const vue = render(<Partie room={room} />);
  return { forme: silhouette(vue.container), texte: vue.container.textContent ?? '', demonter: vue.unmount };
}

describe('le silence à l’écran, la nuit', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null, playerId: null, chronique: [], notices: [], live: null });
  });

  it('un villageois, un amoureux et un mort ont la même silhouette', () => {
    const { banc, villageois, amoureux, mort } = deuxiemeNuit();

    const formes = [villageois, amoureux, mort].map((seat) => {
      const rendu = rendreSiege(banc, seat);
      expect(screen.getByTestId('village-dort')).toBeInTheDocument();
      rendu.demonter();
      return rendu;
    });

    expect(formes[1]?.forme).toBe(formes[0]?.forme);
    expect(formes[2]?.forme).toBe(formes[0]?.forme);
    // Le villageois et l'amoureux, tous deux vivants, lisent même les mêmes mots.
    expect(formes[1]?.texte).toBe(formes[0]?.texte);
  });

  it('la minuterie absente laisse un cadre de la même forme que la minuterie', () => {
    const { banc, villageois } = deuxiemeNuit();
    installe(banc, villageois);
    const sans = render(<Partie room={salle(banc.nombre)} />);
    const cadre = screen.getByTestId('minuterie-cadre');
    const classesDuCadre = cadre.className;
    expect(cadre).toBeEmptyDOMElement();
    sans.unmount();

    // Le même siège, une échéance en main : la minuterie prend exactement le cadre.
    const room = { ...salle(banc.nombre), deadline: Date.now() + 30_000, deadlineDurationMs: 60_000 };
    useStore.setState({ room, decalageHorloge: 0 });
    render(<Partie room={room} />);
    expect(screen.getByRole('timer').className).toBe(classesDuCadre);
  });

  it('le fil, replié chez tous, n’ouvre que les canaux que chacun sait lire', async () => {
    const { banc, villageois, amoureux } = deuxiemeNuit();
    const utilisateur = userEvent.setup();

    installe(banc, amoureux);
    const vue = render(<Partie room={salle(banc.nombre)} />);
    await utilisateur.click(screen.getByRole('button', { name: /^Fil/ }));
    expect(screen.getByRole('tab', { name: /serment/i })).toBeInTheDocument();
    vue.unmount();

    installe(banc, villageois);
    render(<Partie room={salle(banc.nombre)} />);
    await utilisateur.click(screen.getByRole('button', { name: /^Fil/ }));
    expect(screen.queryByRole('tab', { name: /serment/i })).toBeNull();
  });
});
