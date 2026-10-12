/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { CLE_REGLAGES, relireReglages } from '../lib/reglages.js';
import { BoutonReglages } from './Reglages.js';

describe('<BoutonReglages />', () => {
  beforeEach(() => {
    localStorage.clear();
    relireReglages();
  });

  it('ouvre le panneau, enregistre un interrupteur, se ferme à Échap', async () => {
    const utilisateur = userEvent.setup();
    render(<BoutonReglages />);
    await utilisateur.click(screen.getByRole('button', { name: 'Réglages' }));
    expect(screen.getByRole('dialog', { name: 'Réglages' })).toHaveAttribute('aria-modal', 'true');

    await utilisateur.click(screen.getByRole('checkbox', { name: /Grand texte/ }));
    expect(JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? '{}')).toMatchObject({ grandTexte: true });

    await utilisateur.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('« Le jour s’imprime sur » : un groupe radio, Papier puis Cuivre', async () => {
    const utilisateur = userEvent.setup();
    render(<BoutonReglages />);
    await utilisateur.click(screen.getByRole('button', { name: 'Réglages' }));
    const groupe = screen.getByRole('radiogroup', { name: 'Le jour s’imprime sur' });
    expect(groupe).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Papier/ })).toHaveAttribute('aria-checked', 'true');

    await utilisateur.click(screen.getByRole('radio', { name: /Cuivre/ }));
    expect(JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? '{}')).toMatchObject({ tirage: 'cuivre' });
    expect(screen.getByRole('radio', { name: /Cuivre/ })).toHaveAttribute('aria-checked', 'true');

    // Les flèches passent d'un tirage à l'autre.
    await utilisateur.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: /Papier/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Papier/ })).toHaveFocus();
  });
});
