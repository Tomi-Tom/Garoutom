import { describe, expect, it } from 'vitest';
import { ROLES } from '@garoutom/engine';
import {
  CLES_LEGENDE_ECRAN,
  CLES_LEGENDE_RECIT,
  SKINS,
  enregistrerSkin,
  voixDuSkin,
  type Skin,
} from './registre.js';
import { thiercelieux } from './thiercelieux.js';

describe('les légendes du graveur', () => {
  it('compte 21 rôles, 15 écrans, 19 planches du récit, 18 couvre-chefs', () => {
    expect(ROLES).toHaveLength(21);
    expect(CLES_LEGENDE_ECRAN).toHaveLength(15);
    expect(CLES_LEGENDE_RECIT).toHaveLength(19);
    for (const skin of SKINS) {
      expect(Object.keys(skin.legendes.roles).sort()).toEqual([...ROLES].sort());
      expect(Object.keys(skin.legendes.ecrans).sort()).toEqual([...CLES_LEGENDE_ECRAN].sort());
      expect(Object.keys(skin.legendes.recit).sort()).toEqual([...CLES_LEGENDE_RECIT].sort());
      expect(skin.couvreChefs).toHaveLength(18);
    }
  });

  it('ne laisse aucune légende vide, ni ne nomme un pseudo', () => {
    for (const skin of SKINS) {
      const voix = voixDuSkin(skin.id);
      const textes = [
        ...ROLES.map((r) => voix.legendeRole(r)),
        ...CLES_LEGENDE_ECRAN.map((c) => voix.legendeEcran(c)),
        ...CLES_LEGENDE_RECIT.map((c) => voix.legendeRecit(c)),
        ...skin.couvreChefs,
      ];
      for (const texte of textes) {
        expect(texte.trim().length).toBeGreaterThan(0);
        expect(texte).not.toContain('{nom}');
        expect(texte).not.toContain('{');
      }
    }
  });

  it('donne un couvre-chef distinct à chaque siège, et reprend en boucle', () => {
    for (const skin of SKINS) {
      expect(new Set(skin.couvreChefs).size).toBe(18);
      const voix = voixDuSkin(skin.id);
      expect(voix.nomCouvreChef(1)).toBe(skin.couvreChefs[0]);
      expect(voix.nomCouvreChef(18)).toBe(skin.couvreChefs[17]);
      expect(voix.nomCouvreChef(19)).toBe(skin.couvreChefs[0]);
    }
  });

  it('garde la légende de la Petite Fille validée par le propriétaire', () => {
    expect(voixDuSkin('thiercelieux').legendeRole('petiteFille')).toBe('Ne crie pas, petite sotte.');
  });

  it('refuse un skin dont une légende ou un couvre-chef manque', () => {
    const sansLegende: Skin = {
      ...thiercelieux,
      id: 'test-sans-legende',
      legendes: { ...thiercelieux.legendes, ecrans: { ...thiercelieux.legendes.ecrans, fin: ' ' } },
    };
    expect(() => {
      enregistrerSkin(sansLegende);
    }).toThrow(/écran « fin »/);
    const sansCoiffe: Skin = { ...thiercelieux, id: 'test-sans-coiffe', couvreChefs: ['tricorne'] };
    expect(() => {
      enregistrerSkin(sansCoiffe);
    }).toThrow(/18 couvre-chefs/);
  });
});
