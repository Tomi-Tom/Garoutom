/* @vitest-environment jsdom */
/**
 * Les polices de « Caprices » (SPEC § 3.6) : deux familles, une identité
 * (IM Fell French Canon) et un corps (Source Serif 4), en sous-ensemble
 * latin. IM Fell titre et légende ; elle n'entre **jamais** dans une phrase
 * d'interface — bouton, consigne, statut.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';

import { render } from '@testing-library/react';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { AppuiLong } from './components/caprices/AppuiLong.js';
import { BarrePouce } from './components/caprices/BarrePouce.js';
import { Bouton } from './components/caprices/Bouton.js';
import { Cartouche } from './components/caprices/Cartouche.js';
import { Pli } from './components/caprices/Pli.js';

const racine = process.cwd();
const lire = (chemin: string) => readFileSync(resolve(racine, chemin), 'utf8');
const css = lire('src/styles.css');
const main = lire('src/main.tsx');
const exiger = createRequire(resolve(racine, 'package.json'));

/** Les classes et jetons qui portent IM Fell. */
const IDENTITE = /\b(font-identite(-sc)?|t-(planche|titre|heure|legende|rubrique))\b/;

/** Les règles CSS d'un sélecteur (toutes ses occurrences). */
function regles(selecteur: string): string[] {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[\\s,])${echappe}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'gm'))].map((m) => m[1] ?? '');
}

describe('les polices chargées', () => {
  const imports = [...main.matchAll(/^import '(@fontsource[^']+)';$/gm)].map((m) => m[1] ?? '');

  it('IM Fell (romain, italique, petites capitales) et Source Serif 4 variable, rien d’autre', () => {
    expect(imports).toEqual([
      '@fontsource/im-fell-french-canon/latin-400.css',
      '@fontsource/im-fell-french-canon/latin-400-italic.css',
      '@fontsource/im-fell-french-canon-sc/latin-400.css',
      '@fontsource-variable/source-serif-4/opsz.css',
      '@fontsource-variable/source-serif-4/opsz-italic.css',
    ]);
    const paquet = JSON.parse(lire('package.json')) as { dependencies: Record<string, string> };
    const polices = Object.keys(paquet.dependencies).filter((nom) => nom.startsWith('@fontsource'));
    expect(polices.sort()).toEqual([
      '@fontsource-variable/source-serif-4',
      '@fontsource/im-fell-french-canon',
      '@fontsource/im-fell-french-canon-sc',
    ]);
  });

  it('sous-ensembles latins : IM Fell par ses fichiers latins, Source Serif bornée par unicode-range', () => {
    for (const chemin of imports) {
      const source = readFileSync(exiger.resolve(chemin), 'utf8');
      const faces = source.split('@font-face').slice(1);
      expect(faces.length, chemin).toBeGreaterThan(0);
      if (chemin.includes('im-fell')) {
        for (const face of faces) expect(face).toMatch(/-latin-400-(normal|italic)\.woff2/);
      } else {
        // Chaque coupe est bornée : le navigateur ne charge que la latine.
        for (const face of faces) expect(face).toMatch(/unicode-range:/);
        expect(source).toMatch(/source-serif-4-latin-opsz-(normal|italic)\.woff2/);
        expect(source).toMatch(/font-weight: 200 900;/);
      }
    }
  });

  it('les familles déclarées sont celles du thème', () => {
    expect(css).toContain("--font-identite: 'IM Fell French Canon', Georgia, serif;");
    expect(css).toContain("--font-identite-sc: 'IM Fell French Canon SC', 'IM Fell French Canon', Georgia, serif;");
    expect(css).toContain("--font-corps: 'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif;");
    expect(css).not.toMatch(/Cormorant|Alegreya|Plex/);
  });
});

describe('IM Fell jamais dans un bouton, une consigne, un statut', () => {
  it('les jetons d’interface sont en Source Serif', () => {
    for (const classe of ['.t-jeu', '.t-corps', '.t-bouton', '.t-nom', '.t-statut', '.t-chiffre', '.t-code']) {
      const corps = regles(classe).find((r) => r.includes('font-family'));
      expect(corps, classe).toContain('font-family: var(--font-corps);');
    }
    for (const classe of ['.t-planche', '.t-titre', '.t-legende', '.t-heure', '.t-rubrique']) {
      const corps = regles(classe).find((r) => r.includes('font-family'));
      expect(corps, classe).toMatch(/font-family: var\(--font-identite(-sc)?\);/);
    }
    const bouton = regles('.bouton').find((r) => r.includes('font-family'));
    expect(bouton).toContain('font-family: var(--font-corps);');
  });

  it('les primitives n’écrivent jamais en IM Fell', () => {
    const { container } = render(
      createElement(
        Fragment,
        null,
        createElement(BarrePouce, {
          raison: 'Il manque 1 joueur',
          children: [
            createElement(Bouton, { key: 'p', variante: 'primaire', disabled: true, icone: 'voter' }, 'Lancer la partie'),
            createElement(Bouton, { key: 's', variante: 'secondaire' }, 'S’abstenir'),
          ],
        }),
        createElement(AppuiLong, { libelle: 'Gardez le pouce : ma carte', onDebut: () => {}, onFin: () => {} }),
        createElement(Pli, { libelle: 'Le registre', icone: 'registre', onOuvrir: () => {} }),
        createElement(Cartouche, { forme: 'mordu', children: 'Loup-garou' }),
      ),
    );
    for (const el of container.querySelectorAll('*')) {
      expect(el.getAttribute('class') ?? '', el.outerHTML.slice(0, 80)).not.toMatch(IDENTITE);
    }
    expect(container.querySelector('.barre-pouce-raison')).toHaveClass('t-statut');
  });

  it('aucun <button> de l’app ne porte IM Fell (hors héritage de la vague 2)', () => {
    // Écrans d'avant Caprices, refaits en vague 2 (lots V2-C et V2-E) : à
    // retirer de cette liste en les refaisant.
    const HERITAGE = new Set(['components/partie/Fil.tsx', 'components/partie/fin/NuitRacontee.tsx']);
    const fautes: string[] = [];
    const parcourir = function* (dossier: string): Generator<string> {
      for (const entree of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, entree.name);
        if (entree.isDirectory()) yield* parcourir(chemin);
        else if (entree.name.endsWith('.tsx') && !entree.name.includes('.test.')) yield chemin;
      }
    };
    const src = resolve(racine, 'src');
    for (const fichier of parcourir(src)) {
      const nom = relative(src, fichier).replaceAll('\\', '/');
      if (HERITAGE.has(nom)) continue;
      const source = readFileSync(fichier, 'utf8');
      for (const ouverture of source.matchAll(/<(button|Bouton|AppuiLong)\b/g)) {
        // La balise ouvrante, accolades JSX comprises.
        let profondeur = 0;
        let fin = ouverture.index;
        for (; fin < source.length; fin += 1) {
          const c = source[fin];
          if (c === '{') profondeur += 1;
          else if (c === '}') profondeur -= 1;
          else if (c === '>' && profondeur === 0 && source[fin - 1] !== '=') break;
        }
        if (IDENTITE.test(source.slice(ouverture.index, fin))) {
          fautes.push(`${nom}:${String(source.slice(0, ouverture.index).split('\n').length)}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
