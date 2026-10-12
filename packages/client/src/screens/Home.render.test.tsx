/* @vitest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('habille le dos de boîte : frise, frontispice du Caprice 43 et sa légende', () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    const { container } = render(<Home />);

    expect(container.querySelector('.frise')).not.toBeNull();
    expect(container.querySelector('[data-frontispice="yeux"]')).not.toBeNull();
    expect(container.querySelector('[data-legende="accueil"]')).toHaveTextContent(
      /^«\s+Le sommeil de la raison engendre des loups\.\s+»$/,
    );
    // La fiche TBP-012 reste celle du catalogue.
    expect(container.querySelector('.arcade-dos')).not.toBeNull();
  });

  it('n’a pas d’autofocus : le clavier masquerait les boutons', () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    render(<Home />);
    expect(screen.getByLabelText('Votre pseudo')).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('le code tient en quatre cases, une lettre par case, sur une seule vraie zone de saisie', async () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    const utilisateur = userEvent.setup();
    const { container } = render(<Home />);

    const cases = container.querySelectorAll('[data-case-code]');
    expect(cases).toHaveLength(4);
    await utilisateur.type(screen.getByLabelText('Code de la table'), 'vrg');
    expect([...cases].map((c) => c.textContent)).toEqual(['V', 'R', 'G', '']);

    // Le collage se répartit tout seul, et ne garde que les lettres du serveur.
    await utilisateur.clear(screen.getByLabelText('Code de la table'));
    await utilisateur.click(screen.getByLabelText('Code de la table'));
    await utilisateur.paste('vr-g1t');
    expect([...cases].map((c) => c.textContent)).toEqual(['V', 'R', 'G', 'T']);
    // Les cases ne sont que le dessin : les lecteurs d'écran n'ont qu'un champ.
    for (const laCase of cases) expect(laCase).toHaveAttribute('aria-hidden', 'true');
  });

  it('« Ouvrir une table » est le primaire — « Rejoindre » le devient avec un lien d’invitation', () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    const { unmount } = render(<Home />);
    expect(screen.getByRole('button', { name: 'Ouvrir une table' })).toHaveClass('bouton-primaire');
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toHaveClass('bouton-secondaire');
    unmount();

    window.history.replaceState(null, '', '/?table=VRGT');
    try {
      render(<Home />);
      expect(screen.getByLabelText('Code de la table')).toHaveValue('VRGT');
      expect(screen.getByRole('button', { name: 'Rejoindre' })).toHaveClass('bouton-primaire');
      expect(screen.getByRole('button', { name: 'Ouvrir une table' })).toHaveClass('bouton-secondaire');
      // Le primaire passe en tête de la barre au pouce.
      const barre = screen.getByRole('group', { name: 'Votre action' });
      expect(within(barre).getAllByRole('button').map((b) => b.textContent)).toEqual(['Rejoindre', 'Ouvrir une table']);
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('un bouton éteint dit pourquoi : il faut un pseudo', async () => {
    installeCanal(() => doublureCanal(Promise.resolve({ code: 'TEST', playerId: 'p0', token: 'j' })));
    const utilisateur = userEvent.setup();
    render(<Home />);
    // Le pseudo d'un test précédent survit en mémoire : on l'efface.
    await utilisateur.clear(screen.getByLabelText('Votre pseudo'));
    const ouvrir = screen.getByRole('button', { name: 'Ouvrir une table' });
    expect(ouvrir).toBeDisabled();
    expect(ouvrir).toHaveAccessibleDescription('Écrivez d’abord votre pseudo.');
    await utilisateur.type(screen.getByLabelText('Votre pseudo'), 'Léa');
    expect(ouvrir).toBeEnabled();
    expect(screen.queryByText('Écrivez d’abord votre pseudo.')).toBeNull();
  });
});
