/* @vitest-environment jsdom */
/**
 * La présence sur la place (D17, SPEC § 5.1.4 état 11) : un absent porte la
 * hachure croisée et la chaise vide, le mot du skin, et tant que la grâce
 * court son compte à rebours. Toujours une forme et un mot, jamais la seule
 * pâleur.
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

    const libelle = voixDuSkin('thiercelieux').libelleAbsent();
    // L'absent dont la grâce court : le mot et le compte à rebours (§ 5.1.4, état 11).
    const reconnexion = screen.getByTestId('presence-2');
    expect(reconnexion.textContent).toMatch(new RegExp(`^${libelle} · 4[12] s$`));

    const absent = screen.getByTestId('presence-3');
    expect(absent).toHaveTextContent(libelle);
    // La forme, pas la pâleur : le disque se couvre d'une hachure croisée et
    // d'une chaise vide ; le jeton garde son contraste — aucune opacité.
    const jeton = absent.closest('li') as HTMLElement;
    const medaillon = jeton.querySelector('[data-presence="absent"]');
    expect(medaillon).not.toBeNull();
    // (La nuit : le motif « -v », au trait vergé.)
    expect(medaillon?.innerHTML).toMatch(/url\(#hach-x-[ev]\)/);
    expect(medaillon?.querySelector('[data-glyphe="absent"]')).not.toBeNull();
    expect(jeton.querySelector('[data-couvre-chef]')).toBeNull();
    expect(jeton.innerHTML).not.toMatch(/opacity/);

    // Les lecteurs d'écran l'entendent aussi.
    expect(screen.getByText(new RegExp(`Joueur 3 — .*${libelle}`))).toBeInTheDocument();
    expect(screen.getByText(/Joueur 2 — .*reconnexion, 4[12] s de grâce/)).toBeInTheDocument();
    expect(screen.queryByTestId('presence-1')).toBeNull();
  });
});
