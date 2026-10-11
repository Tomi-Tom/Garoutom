/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Channel, JoinResult } from '@garoutom/engine';

import { installeCanal } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { Home } from './Home.js';

/*
 * Le canal est doublé : aucun serveur n'existe encore — il s'écrit en
 * parallèle — et l'accueil n'a à prouver que ce qu'il envoie, pas ce que le
 * serveur répond. La doublure rend un accusé de réussite, ou le refus qu'on
 * lui demande de jouer.
 */
function doublureCanal(reponse: Promise<JoinResult> | Error): Channel {
  return {
    request: vi.fn(() => (reponse instanceof Error ? Promise.reject(reponse) : reponse)),
  } as unknown as Channel;
}

describe('<Home />', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ playerId: null, room: null, notices: [], live: null });
  });

  it('garde le dos de boîte de la collection et y pose les commandes du village', () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    render(<Home />);

    // La fiche TBP-012 vient du catalogue du hub, jamais recopiée ici.
    expect(screen.getByRole('heading', { name: 'GAROUTOM' })).toBeInTheDocument();
    // Le bouton du paquet s'appelle « Couper le son » quand le son est actif :
    // c'est le même bouton, la même clé `tombp.volume`, dans toute la collection.
    expect(screen.getByRole('button', { name: /son/i })).toBeInTheDocument();

    expect(screen.getByLabelText('Votre pseudo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir une table' })).toBeInTheDocument();
    expect(screen.getByLabelText('Code de la table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeInTheDocument();
  });

  it('n\'ouvre ni ne rejoint rien sans pseudo, et rien sans code entier', async () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    const utilisateur = userEvent.setup();
    render(<Home />);

    expect(screen.getByRole('button', { name: 'Ouvrir une table' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeDisabled();

    await utilisateur.type(screen.getByLabelText('Votre pseudo'), 'Jeanne');
    expect(screen.getByRole('button', { name: 'Ouvrir une table' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeDisabled();

    // Le code ne retient que les lettres du serveur, en majuscules : un
    // chiffre glissé dans la frappe ne doit pas se retrouver dans le champ.
    await utilisateur.type(screen.getByLabelText('Code de la table'), 'a1b2');
    expect(screen.getByLabelText('Code de la table')).toHaveValue('AB');
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeDisabled();

    await utilisateur.type(screen.getByLabelText('Code de la table'), 'c3d4');
    expect(screen.getByLabelText('Code de la table')).toHaveValue('ABCD');
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeEnabled();
  });

  it('ouvre une table par le canal, mémorise la place et le pseudo', async () => {
    const canal = doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'jeton' }));
    installeCanal(() => canal);
    const utilisateur = userEvent.setup();
    render(<Home />);

    await utilisateur.type(screen.getByLabelText('Votre pseudo'), 'Jeanne');
    await utilisateur.click(screen.getByRole('button', { name: 'Ouvrir une table' }));

    await waitFor(() => {
      expect(canal.request).toHaveBeenCalledWith('room:create', { name: 'Jeanne' });
    });
    // La place est tenue : identifiant au magasin, jeton en machine — le
    // serveur rendra le siège au rechargement tant que durera la grâce.
    await waitFor(() => {
      expect(useStore.getState().playerId).toBe('p0');
    });
    expect(localStorage.getItem('garoutom.jetons')).toContain('TEST');
    expect(localStorage.getItem('garoutom.nom')).toContain('Jeanne');
  });

  it('dit le refus du serveur en avis, jamais en alerte', async () => {
    const canal = doublureCanal(new Error('Ce pseudo est déjà pris à cette table'));
    installeCanal(() => canal);
    const espionAlerte = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const utilisateur = userEvent.setup();
    render(<Home />);

    await utilisateur.type(screen.getByLabelText('Votre pseudo'), 'Jeanne');
    await utilisateur.click(screen.getByRole('button', { name: 'Ouvrir une table' }));

    await waitFor(() => {
      const dernier = useStore.getState().notices.at(-1);
      expect(dernier?.message).toBe('Ce pseudo est déjà pris à cette table');
      expect(dernier?.tone).toBe('error');
    });
    expect(espionAlerte).not.toHaveBeenCalled();
    // Rien n'a été mémorisé d'une entrée refusée.
    expect(useStore.getState().playerId).toBeNull();
    expect(localStorage.getItem('garoutom.jetons')).toBeNull();
  });
});
