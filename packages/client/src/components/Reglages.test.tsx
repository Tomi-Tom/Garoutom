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
});
