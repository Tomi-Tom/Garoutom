/* @vitest-environment jsdom */
/**
 * Arbitrage n° 3 du chef (IMPLEMENTATION.md) : les faces de cartes ont toutes
 * la même luminance moyenne, à ± 3 %. Le loup se lit au trait mordu et à la
 * sanguine, jamais à une masse plus sombre — la loi N4 de la nuit (§ 3.5),
 * étendue à la révélation, où tous les sièges brunissent leur carte au même
 * instant et où un voisin voit l'éclat de l'écran d'à côté.
 *
 * Méthode : chaque face gravée (`FaceGravee` : papier, cuvette, image,
 * symbole, cartel, forme du cartouche — sans les mots, qui sont du texte HTML
 * et changent avec le skin) est rendue en SVG, ses variables CSS prennent leur
 * valeur de repli (les encres du tirage, SPEC § 3.1), les matières de
 * `textures.svg` (hachures, aquatinte, morsure, vergeures) sont jointes, puis
 * `@resvg/resvg-js` la rastérise à sa taille nominale (1 px CSS = 1 pixel). La
 * luminance moyenne est la moyenne, sur tous les pixels, de la luminance
 * relative Y de WCAG 2.x (sRGB linéarisé, 0,2126 R + 0,7152 G + 0,0722 B) —
 * la grandeur des contrastes du § 3.4. Chaque face doit tenir à ± 3 % de la
 * moyenne des vingt-et-unes, format par format, pour les deux skins.
 *
 * Ce qui est vérifié : le tirage papier — la face de la révélation (« la carte
 * s'y brunit jusqu'au papier », N3), de Ma carte le jour et du verdict — aux
 * formats où le rôle est encore un secret : grande (révélation, Ma carte
 * desktop) et moyenne (Ma carte mobile). La petite carte ne sert qu'à la
 * distribution de fin et aux règles, où tous les rôles sont publics : son
 * cartouche « Seul » plein (68 × 20 sur 96 × 134) assombrit la face du Loup
 * Blanc de ~10 % sans rien trahir. Le tirage cuivre (Ma carte, la nuit) n'a
 * pas d'image : sa luminance tient au seul trait des symboles (rapport V1-B).
 *
 * Rastériser 84 faces prend plusieurs secondes, davantage quand toute la suite
 * tourne en parallèle : le délai est porté à 30 s pour ce fichier. Le rendu
 * serveur n'exécute pas d'effets : les gravures de Shiganshina (chargées à la
 * demande dans l'app) sont attendues avant de mesurer.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { ROLES, type RoleId } from '@garoutom/engine';

import { FaceGravee } from './CarteRole.js';
import { TRACES_SHIGANSHINA } from './traces-paresseuses.js';
import type { FormatCarte } from './traces/cartes.js';

const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js') as typeof import('@resvg/resvg-js');

const TEXTURES = readFileSync(resolve(process.cwd(), '../../docs/design/caprices/textures.svg'), 'utf8');
const DEFS = /^<defs>[\s\S]*?^<\/defs>/m.exec(TEXTURES)?.[0] ?? '';

/** Le SVG d'une face, autonome : variables résolues à leur repli, matières jointes. */
function svgAutonome(markup: string): string {
  let svg = markup;
  // `var(--x, repli)` → `repli`, de l'intérieur vers l'extérieur
  for (let i = 0; i < 4 && svg.includes('var('); i++) svg = svg.replace(/var\(--[\w-]+,\s*([^()]+?)\)/g, '$1');
  return svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"').replace(/(<svg[^>]*>)/, `$1${DEFS}`);
}

const lineaire = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const LIN = Array.from({ length: 256 }, (_, c) => lineaire(c));

/** Luminance relative moyenne (WCAG) d'une face rastérisée. */
function luminanceMoyenne(role: RoleId, format: FormatCarte, skin: string, tirage: 'papier' | 'cuivre' = 'papier'): number {
  const markup = renderToStaticMarkup(<FaceGravee role={role} format={format} tirage={tirage} skin={skin} />);
  const svg = svgAutonome(markup);
  expect(svg).not.toContain('var(');
  const { pixels } = new Resvg(svg).render();
  let somme = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    somme += 0.2126 * (LIN[pixels[i] ?? 0] ?? 0) + 0.7152 * (LIN[pixels[i + 1] ?? 0] ?? 0) + 0.0722 * (LIN[pixels[i + 2] ?? 0] ?? 0);
  }
  return somme / (pixels.length / 4);
}

describe('arbitrage n° 3 — la luminance des faces', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    await TRACES_SHIGANSHINA.precharger();
  });

  for (const skin of ['thiercelieux', 'shiganshina']) {
    for (const format of ['grande', 'moyenne'] as const) {
      it(`${skin}, ${format} : les vingt-et-unes faces papier à ± 3 % de leur moyenne`, () => {
        const mesures = ROLES.map((role) => [role, luminanceMoyenne(role, format, skin)] as const);
        const moyenne = mesures.reduce((s, [, y]) => s + y, 0) / mesures.length;
        const ecarts = mesures.map(([role, y]) => `${role} ${((y / moyenne - 1) * 100).toFixed(1)} %`).join(', ');
        for (const [role, y] of mesures) {
          expect(Math.abs(y / moyenne - 1), `${role} — ${ecarts}`).toBeLessThanOrEqual(0.03);
        }
      });
    }
  }
});
