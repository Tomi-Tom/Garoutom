/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { CLE_REGLAGES, lireReglages, regler, REGLAGES_DEFAUT, relireReglages } from './reglages.js';

describe('réglages locaux', () => {
  beforeEach(() => {
    localStorage.clear();
    relireReglages();
  });

  it('sans rien de stocké, les défauts', () => {
    expect(lireReglages()).toEqual(REGLAGES_DEFAUT);
  });

  it('persiste une retouche sous garoutom.reglages', () => {
    regler({ grandTexte: true, minuterie: 'discrete' });
    expect(JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? '{}')).toMatchObject({
      grandTexte: true,
      minuterie: 'discrete',
    });
    expect(lireReglages()).toMatchObject({ grandTexte: true, minuterie: 'discrete', vibrations: true });
  });

  it('le grand texte pose son attribut sur la page, et le retire', () => {
    regler({ grandTexte: true });
    expect(document.documentElement.hasAttribute('data-grand-texte')).toBe(true);
    regler({ grandTexte: false });
    expect(document.documentElement.hasAttribute('data-grand-texte')).toBe(false);
  });

  it('un JSON illisible retombe sur les défauts', () => {
    localStorage.setItem(CLE_REGLAGES, '{pas du json');
    expect(lireReglages()).toEqual(REGLAGES_DEFAUT);
    localStorage.setItem(CLE_REGLAGES, '[1,2]');
    expect(lireReglages()).toEqual(REGLAGES_DEFAUT);
  });

  it('une valeur invalide retombe sur le défaut, champ par champ', () => {
    localStorage.setItem(
      CLE_REGLAGES,
      JSON.stringify({ animations: 'folles', minuterie: 'discrete', grandTexte: 'oui', filOuvert: true, vibrations: 3 }),
    );
    expect(lireReglages()).toEqual({
      ...REGLAGES_DEFAUT,
      minuterie: 'discrete',
      filOuvert: true,
    });
  });
});
