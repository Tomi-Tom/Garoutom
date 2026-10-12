/* @vitest-environment jsdom */
/**
 * Le narrateur face à la reprise et à l'abandon (D18, D22) : les évènements
 * rejoués se résument sous « Pendant votre absence » sans phrases d'heure ni
 * animation ; une mort d'abandon se dit dans la voix du skin, et reste dans
 * le chapitre de l'heure qu'elle clôt.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import type { GameEvent } from '@garoutom/engine';

import { useStore, type EvenementRecu } from '../../lib/store.js';
import { installe, nouvellePartie, salle, tousPrets } from './nuit/banc.js';
import { MAX_RESUME, Narrateur, PENDANT_ABSENCE } from './Narrateur.js';

let compteur = 5_000;
const recu = (event: GameEvent, rejoue = false): EvenementRecu => ({
  id: (compteur += 1),
  event,
  day: 2,
  ...(rejoue ? { rejoue: true as const } : {}),
});

function poserPartie(): void {
  const banc = nouvellePartie();
  tousPrets(banc);
  installe(banc, 0);
  useStore.setState({ room: salle(banc.nombre) });
}

describe('<Narrateur /> — reprise et abandon', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null, playerId: null, chronique: [], notices: [], live: null });
  });

  it('résume ce qui s’est passé pendant l’absence, sans phrases d’heure', () => {
    poserPartie();
    const { rerender } = render(<Narrateur />);
    useStore.setState({
      chronique: [
        recu({ type: 'phase', phase: 'jour', day: 1 }, true),
        recu({ type: 'vote', tally: { 3: 4 }, executed: 3 }, true),
        recu({ type: 'morts', deaths: [{ seat: 3, cause: 'vote', role: null }] }, true),
        recu({ type: 'phase', phase: 'nuit', step: 'principale', day: 2 }, true),
      ],
    });
    rerender(<Narrateur />);

    const crieur = screen.getByTestId('crieur');
    expect(crieur).toHaveAttribute('data-resume');
    expect(crieur).toHaveTextContent(PENDANT_ABSENCE);
    expect(crieur).toHaveTextContent('Joueur 3');
    expect(crieur.textContent).not.toMatch(/se lève|tombe sur/);
    // La région vocale le dit aussi, une seule fois, sous le même intitulé.
    expect(useStore.getState().live?.text).toMatch(new RegExp(`^${PENDANT_ABSENCE} :`));
  });

  it('ne garde que les dernières nouvelles d’une longue absence', () => {
    poserPartie();
    const { rerender } = render(<Narrateur />);
    useStore.setState({
      chronique: Array.from({ length: 12 }, (_, i) =>
        recu({ type: 'capitaine', seat: i % 8, from: null }, true),
      ),
    });
    rerender(<Narrateur />);
    expect(screen.getByTestId('crieur').querySelectorAll('[data-ligne]')).toHaveLength(MAX_RESUME);
    expect(screen.getByTestId('crieur-rubrique')).toHaveTextContent(PENDANT_ABSENCE);
  });

  it('dit la mort d’abandon dans la voix du skin, et la range dans la nuit qu’elle clôt', async () => {
    poserPartie();
    const utilisateur = userEvent.setup();
    const { rerender } = render(<Narrateur />);
    useStore.setState({
      chronique: [
        recu({ type: 'phase', phase: 'nuit', step: 'principale', day: 2 }),
        recu({ type: 'morts', deaths: [{ seat: 5, cause: 'abandon', role: null }] }),
        recu({ type: 'phase', phase: 'jour', day: 2 }),
      ],
    });
    rerender(<Narrateur />);
    expect(screen.getByTestId('crieur')).toHaveTextContent('Joueur 5 a quitté le village sans un mot.');
    expect(screen.getByTestId('crieur')).not.toHaveAttribute('data-resume');

    // Un toucher du crieur ouvre le registre : la mort reste dans la nuit qu'elle clôt.
    await utilisateur.click(screen.getByRole('button', { name: 'Le crieur — ouvrir le registre' }));
    const blocs = screen.getByTestId('registre').querySelectorAll('[data-heure]');
    const nuit = [...blocs].find((bloc) => bloc.querySelector('h3')?.textContent === 'Nuit 2');
    expect(nuit).toHaveTextContent('a quitté le village');
  });
});
