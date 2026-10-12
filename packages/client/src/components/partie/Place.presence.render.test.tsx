/* @vitest-environment jsdom */
/**
 * La présence sur la place (D17) : un joueur qui se reconnecte porte la lune
 * éteinte et son compte à rebours de grâce ; un absent — grâce passée, place
 * gardée — porte un cerne en pointillés et le mot du skin. Toujours une
 * forme et un mot, jamais la seule pâleur.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from '../../lib/store.js';
import { voixDuSkin } from '../../skins/registre.js';
import { installe, nouvellePartie, salle, tousPrets } from './nuit/banc.js';
import { Place } from './Place.js';

describe('<Place /> — la présence', () => {
  beforeEach(() => {
    useStore.setState({ room: null, game: null, playerId: null, chronique: [], notices: [], live: null });
  });

  it('distingue la reconnexion (grâce qui court) de l’absence (place gardée)', () => {
    const banc = nouvellePartie();
    tousPrets(banc);
    installe(banc, 0);
    const room = salle(banc.nombre);
    const maintenant = Date.now();
    room.players[2] = { ...room.players[2]!, connected: false, disconnectedUntil: maintenant + 42_000 };
    room.players[3] = { ...room.players[3]!, connected: false, disconnectedUntil: null, absent: true };
    useStore.setState({ room, decalageHorloge: 0 });

    render(<Place />);

    const reconnexion = screen.getByTestId('presence-2');
    expect(reconnexion.textContent).toMatch(/^reconnexion · 4[12] s$/);

    const absent = screen.getByTestId('presence-3');
    const libelle = voixDuSkin('thiercelieux').libelleAbsent();
    expect(absent).toHaveTextContent(libelle);
    // La forme, pas la pâleur : le médaillon change de cerne, le jeton garde son contraste.
    const medaillon = absent.parentElement?.querySelector('[data-presence="absent"]');
    expect(medaillon).not.toBeNull();
    expect((medaillon as HTMLElement).style.border).toContain('dashed');
    expect((absent.closest('li') as HTMLElement).style.opacity).toBe('1');

    // Les lecteurs d'écran l'entendent aussi.
    expect(screen.getByText(new RegExp(`Joueur 3 — .*${libelle}`))).toBeInTheDocument();
    expect(screen.getByText(/Joueur 2 — .*reconnexion, 4[12] s de grâce/)).toBeInTheDocument();
    expect(screen.queryByTestId('presence-1')).toBeNull();
  });
});
