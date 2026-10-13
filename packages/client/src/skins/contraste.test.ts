/**
 * Les contrastes de « Caprices » (SPEC § 3.4), verrouillés pour chaque skin,
 * et la recopie fidèle des encres dans styles.css (patron MastomMind : une
 * palette ne se maintient pas à deux endroits sans garde-fou).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DUREES_CSS } from '../anim/tokens.js';
import {
  contraste,
  ENCRES,
  luminance,
  PAIRES_CONTRASTE,
  semantiques,
  VARIABLES_ENCRES,
  type Encres,
  type Semantiques,
  type Tirage,
} from './habits.js';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** Le premier bloc de déclarations qui suit un sélecteur exact. */
function bloc(selecteur: string): string {
  const debut = css.indexOf(`${selecteur} {`);
  if (debut < 0) throw new Error(`styles.css : bloc introuvable — ${selecteur}`);
  return css.slice(debut, css.indexOf('}', debut));
}

/** `fondPlanche` → `--fond-planche`, `encre2` → `--encre-2`. */
function variable(cle: keyof Semantiques): string {
  return `--${cle.replace(/([A-Z])/g, '-$1').replace(/(\d)/, '-$1').toLowerCase()}`;
}

describe('les paires du § 3.4, pour chaque skin', () => {
  for (const [skin, encres] of Object.entries(ENCRES)) {
    describe(skin, () => {
      for (const paire of PAIRES_CONTRASTE) {
        const ratio = contraste(encres[paire.texte], encres[paire.fond]);
        it(`${paire.tirage} — ${paire.texte} sur ${paire.fond} (${paire.emploi}) : ${ratio.toFixed(2)} ≥ ${String(paire.minimum)}`, () => {
          expect(ratio).toBeGreaterThanOrEqual(paire.minimum);
        });
      }

      it('la sanguine d’encre est interdite la nuit : la craie la remplace', () => {
        expect(contraste(encres.sanguine, encres.bistre900)).toBeLessThan(4.5);
        expect(semantiques(encres, 'cuivre').campMeute).toBe(encres.craie);
        expect(semantiques(encres, 'papier').campMeute).toBe(encres.sanguine);
      });

      it('N3 — la nuit, aucune surface plus claire que le palier III', () => {
        const nuit = semantiques(encres, 'cuivre');
        const plafond = luminance(encres.palier3);
        for (const surface of [nuit.fond, nuit.fondPlanche, nuit.surface, nuit.creux, nuit.actionFond]) {
          expect(luminance(surface)).toBeLessThanOrEqual(plafond);
        }
      });

      it('chaque texte sémantique passe AA sur chaque fond de son tirage', () => {
        for (const tirage of ['papier', 'cuivre'] as const) {
          const s = semantiques(encres, tirage);
          const fonds = tirage === 'papier' ? [s.fond, s.fondPlanche, s.surface] : [s.fond, s.surface];
          for (const texte of [s.encre, s.encre2, s.encreNarrateur, s.campMeute, s.campSerment, s.etatMortTexte]) {
            for (const fond of fonds) expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
          }
          expect(contraste(s.actionTexte, s.actionFond)).toBeGreaterThanOrEqual(4.5);
          // Les filets porteurs d'information : 3:1 au moins.
          for (const fond of fonds) expect(contraste(s.filet, fond)).toBeGreaterThanOrEqual(3);
        }
      });
    });
  }

  it('Thiercelieux : les valeurs calculées du § 3.4, au centième', () => {
    const t = ENCRES['thiercelieux'] as Encres;
    const attendus: [keyof Encres, keyof Encres, number][] = [
      ['bistre900', 'verge', 13.95],
      ['bistre900', 'bruni', 16.13],
      ['bistre900', 'teinte', 12.93],
      ['delave', 'verge', 5.51],
      ['delave', 'bruni', 6.38],
      ['delave', 'teinte', 5.11],
      ['sanguine', 'verge', 4.97],
      ['sanguine', 'bruni', 5.75],
      ['sanguine', 'teinte', 4.61],
      ['garanceEncre', 'verge', 5.58],
      ['garanceEncre', 'bruni', 6.45],
      ['garanceEncre', 'teinte', 5.17],
      ['verge', 'bistre800', 11.57],
      ['verge', 'palier3', 7.35],
      ['palier1', 'bistre900', 6.92],
      ['palier1', 'bistre800', 5.74],
      ['craie', 'bistre900', 5.89],
      ['craie', 'bistre800', 4.88],
      ['garanceCraie', 'bistre900', 7.84],
      ['garanceCraie', 'bistre800', 6.51],
    ];
    for (const [texte, fond, ratio] of attendus) expect(contraste(t[texte], t[fond]).toFixed(2)).toBe(ratio.toFixed(2));
  });

  it('Shiganshina : les valeurs du § 8', () => {
    const s = ENCRES['shiganshina'] as Encres;
    expect(contraste(s.bistre900, s.verge).toFixed(2)).toBe('13.78');
    expect(contraste(s.bistre900, s.bruni).toFixed(2)).toBe('15.81');
    expect(contraste(s.verge, s.bistre800).toFixed(2)).toBe('11.15');
    expect(contraste(s.delave, s.verge).toFixed(2)).toBe('5.54');
    expect(contraste(s.craie, s.bistre900).toFixed(2)).toBe('5.79');
  });

  it('Gilets Jaunes : les valeurs de « goudron et fluo »', () => {
    const g = ENCRES['giletsjaunes'] as Encres;
    expect(contraste(g.bistre900, g.verge).toFixed(2)).toBe('13.74');
    expect(contraste(g.bistre900, g.bruni).toFixed(2)).toBe('15.64');
    expect(contraste(g.bistre900, g.teinte).toFixed(2)).toBe('12.39');
    expect(contraste(g.delave, g.verge).toFixed(2)).toBe('5.68');
    expect(contraste(g.sanguine, g.verge).toFixed(2)).toBe('7.04');
    expect(contraste(g.garanceEncre, g.verge).toFixed(2)).toBe('5.23');
    expect(contraste(g.verge, g.bistre800).toFixed(2)).toBe('11.65');
    expect(contraste(g.verge, g.palier3).toFixed(2)).toBe('7.42');
    expect(contraste(g.palier1, g.bistre900).toFixed(2)).toBe('8.48');
    expect(contraste(g.palier1, g.bistre800).toFixed(2)).toBe('7.19');
    expect(contraste(g.craie, g.bistre900).toFixed(2)).toBe('9.22');
    expect(contraste(g.craie, g.bistre800).toFixed(2)).toBe('7.82');
    expect(contraste(g.garanceCraie, g.bistre900).toFixed(2)).toBe('9.23');
    expect(contraste(g.sanguine, g.bistre900).toFixed(2)).toBe('1.95');
  });

  it('Far West : les valeurs de « Wanted » et de la prairie', () => {
    const f = ENCRES['farwest'] as Encres;
    expect(contraste(f.bistre900, f.verge).toFixed(2)).toBe('12.49');
    expect(contraste(f.bistre900, f.bruni).toFixed(2)).toBe('14.16');
    expect(contraste(f.bistre900, f.teinte).toFixed(2)).toBe('11.25');
    expect(contraste(f.delave, f.verge).toFixed(2)).toBe('5.16');
    expect(contraste(f.sanguine, f.verge).toFixed(2)).toBe('5.23');
    expect(contraste(f.garanceEncre, f.verge).toFixed(2)).toBe('5.62');
    expect(contraste(f.verge, f.bistre800).toFixed(2)).toBe('10.87');
    expect(contraste(f.verge, f.palier3).toFixed(2)).toBe('7.24');
    expect(contraste(f.palier1, f.bistre900).toFixed(2)).toBe('7.18');
    expect(contraste(f.palier1, f.bistre800).toFixed(2)).toBe('6.25');
    expect(contraste(f.craie, f.bistre900).toFixed(2)).toBe('6.62');
    expect(contraste(f.craie, f.bistre800).toFixed(2)).toBe('5.76');
    expect(contraste(f.garanceCraie, f.bistre900).toFixed(2)).toBe('8.69');
    expect(contraste(f.sanguine, f.bistre900).toFixed(2)).toBe('2.39');
  });

  it('Pirates : les valeurs de la carte marine et de la cale', () => {
    const p = ENCRES['pirates'] as Encres;
    expect(contraste(p.bistre900, p.verge).toFixed(2)).toBe('12.73');
    expect(contraste(p.bistre900, p.bruni).toFixed(2)).toBe('14.65');
    expect(contraste(p.bistre900, p.teinte).toFixed(2)).toBe('11.67');
    expect(contraste(p.delave, p.verge).toFixed(2)).toBe('5.64');
    expect(contraste(p.sanguine, p.verge).toFixed(2)).toBe('5.45');
    expect(contraste(p.garanceEncre, p.verge).toFixed(2)).toBe('5.40');
    expect(contraste(p.verge, p.bistre800).toFixed(2)).toBe('9.99');
    expect(contraste(p.verge, p.palier3).toFixed(2)).toBe('6.71');
    expect(contraste(p.palier1, p.bistre900).toFixed(2)).toBe('8.17');
    expect(contraste(p.palier1, p.bistre800).toFixed(2)).toBe('6.41');
    expect(contraste(p.craie, p.bistre900).toFixed(2)).toBe('6.13');
    expect(contraste(p.craie, p.bistre800).toFixed(2)).toBe('4.81');
    expect(contraste(p.garanceCraie, p.bistre900).toFixed(2)).toBe('9.36');
    expect(contraste(p.sanguine, p.bistre900).toFixed(2)).toBe('2.34');
  });

  it('Open Space : les valeurs du plateau et de la veille', () => {
    const o = ENCRES['openspace'] as Encres;
    expect(contraste(o.bistre900, o.verge).toFixed(2)).toBe('15.70');
    expect(contraste(o.bistre900, o.bruni).toFixed(2)).toBe('17.31');
    expect(contraste(o.bistre900, o.teinte).toFixed(2)).toBe('13.62');
    expect(contraste(o.delave, o.verge).toFixed(2)).toBe('5.91');
    expect(contraste(o.sanguine, o.verge).toFixed(2)).toBe('6.96');
    expect(contraste(o.garanceEncre, o.verge).toFixed(2)).toBe('5.44');
    expect(contraste(o.verge, o.bistre800).toFixed(2)).toBe('13.61');
    expect(contraste(o.verge, o.palier3).toFixed(2)).toBe('9.65');
    expect(contraste(o.palier1, o.bistre900).toFixed(2)).toBe('7.18');
    expect(contraste(o.palier1, o.bistre800).toFixed(2)).toBe('6.22');
    expect(contraste(o.craie, o.bistre900).toFixed(2)).toBe('8.81');
    expect(contraste(o.craie, o.bistre800).toFixed(2)).toBe('7.64');
    expect(contraste(o.garanceCraie, o.bistre900).toFixed(2)).toBe('9.17');
    expect(contraste(o.sanguine, o.bistre900).toFixed(2)).toBe('2.26');
  });
});

describe('styles.css recopie fidèlement habits.ts', () => {
  const thiercelieux = ENCRES['thiercelieux'] as Encres;

  it('les encres de Thiercelieux, à la racine', () => {
    const racine = bloc(':root');
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      expect(racine).toContain(`${nom}: ${thiercelieux[cle as keyof Encres]};`);
    }
  });

  it('les encres de Shiganshina : seules celles qui changent, toutes celles qui changent', () => {
    const shiganshina = ENCRES['shiganshina'] as Encres;
    const skin = bloc(":root:has([data-skin='shiganshina'])");
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      const k = cle as keyof Encres;
      if (shiganshina[k] === thiercelieux[k]) expect(skin).not.toContain(`${nom}:`);
      else expect(skin).toContain(`${nom}: ${shiganshina[k]};`);
    }
  });

  it('les encres de Gilets Jaunes : seules celles qui changent, toutes celles qui changent', () => {
    const giletsjaunes = ENCRES['giletsjaunes'] as Encres;
    const skin = bloc(":root:has([data-skin='giletsjaunes'])");
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      const k = cle as keyof Encres;
      if (giletsjaunes[k] === thiercelieux[k]) expect(skin).not.toContain(`${nom}:`);
      else expect(skin).toContain(`${nom}: ${giletsjaunes[k]};`);
    }
  });

  it('les encres de Far West : seules celles qui changent, toutes celles qui changent', () => {
    const farwest = ENCRES['farwest'] as Encres;
    const skin = bloc(":root:has([data-skin='farwest'])");
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      const k = cle as keyof Encres;
      if (farwest[k] === thiercelieux[k]) expect(skin).not.toContain(`${nom}:`);
      else expect(skin).toContain(`${nom}: ${farwest[k]};`);
    }
  });

  it('les encres de Pirates : seules celles qui changent, toutes celles qui changent', () => {
    const pirates = ENCRES['pirates'] as Encres;
    const skin = bloc(":root:has([data-skin='pirates'])");
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      const k = cle as keyof Encres;
      if (pirates[k] === thiercelieux[k]) expect(skin).not.toContain(`${nom}:`);
      else expect(skin).toContain(`${nom}: ${pirates[k]};`);
    }
  });

  it('les encres de Open Space : seules celles qui changent, toutes celles qui changent', () => {
    const openspace = ENCRES['openspace'] as Encres;
    const skin = bloc(":root:has([data-skin='openspace'])");
    for (const [cle, nom] of Object.entries(VARIABLES_ENCRES)) {
      const k = cle as keyof Encres;
      if (openspace[k] === thiercelieux[k]) expect(skin).not.toContain(`${nom}:`);
      else expect(skin).toContain(`${nom}: ${openspace[k]};`);
    }
  });

  it('chaque sémantique de chaque tirage pointe vers la bonne encre', () => {
    const blocs: Record<Tirage, string> = {
      papier: bloc("[data-tirage='papier']"),
      cuivre: bloc("[data-tirage='cuivre'] [data-skin]:not([data-tirage='papier'])"),
    };
    // Par la valeur : `--fond: var(--cp-verge)` doit donner ce que dit habits.ts.
    const valeurDe = (nomEncre: string): string | undefined => {
      const cle = Object.entries(VARIABLES_ENCRES).find(([, nom]) => nom === nomEncre)?.[0];
      return cle === undefined ? undefined : thiercelieux[cle as keyof Encres];
    };
    for (const tirage of ['papier', 'cuivre'] as const) {
      const attendu = semantiques(thiercelieux, tirage);
      for (const [cle, valeur] of Object.entries(attendu)) {
        const nom = variable(cle as keyof Semantiques);
        const trouve = new RegExp(`\\s${nom}: var\\((--cp-[a-z0-9-]+)\\);`).exec(blocs[tirage]);
        expect(trouve, `${tirage} ${nom}`).not.toBeNull();
        expect(valeurDe(trouve?.[1] ?? ''), `${tirage} ${nom}`).toBe(valeur);
      }
    }
  });

  it('les durées du mouvement suivent anim/tokens.ts', () => {
    const racine = bloc(':root');
    for (const [nom, valeur] of Object.entries(DUREES_CSS)) expect(racine).toContain(`${nom}: ${valeur};`);
  });

  it('rayons à 0, aucune ombre, aucun flou (§ 3.8, § 4)', () => {
    expect(css).toMatch(/--shadow-\*: initial;/);
    expect(css).toMatch(/--blur-\*: initial;/);
    for (const taille of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']) expect(css).toContain(`--radius-${taille}: 0;`);
    // Hors des commentaires : jamais de box-shadow, de flou, de dégradé décoratif.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/box-shadow\s*:/);
    expect(code).not.toMatch(/blur\(/);
    expect(code).not.toMatch(/(?<!repeating-)linear-gradient\(/);
  });
});
