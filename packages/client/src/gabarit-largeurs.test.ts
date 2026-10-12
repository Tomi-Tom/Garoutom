/**
 * Les largeurs qui ne doivent rien couper (revue en vrai de « Caprices ») :
 *
 * - un libellé d'action ne s'abrège jamais (« Élire Bo… », « Voter co… ») :
 *   trop long, il passe à la ligne ;
 * - le pupitre desktop est assez large pour « Voter contre Bot Fernand » à
 *   côté de « S'abstenir », et la feuille de style et la place (qui garde ce
 *   pupitre libre au milieu du cercle) parlent de la même largeur ;
 * - les commandes de droite de la frise ne se tassent pas (un bouton coupé
 *   au bord ne se touche plus) : sur mobile, le lien de l'arcade se réduit
 *   à son losange de 44, et sous 360 px le son passe dans le menu « … ».
 *
 * jsdom ne mesure rien : ces règles se lisent dans la feuille de style.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LARGEUR_PUPITRE } from './components/partie/Place.js';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** Les corps (mis bout à bout) des règles dont le dernier sélecteur est `selecteur`. */
function regle(selecteur: string): string {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trouves = [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${echappe}\\s*\\{([^}]*)\\}`, 'g'))];
  if (trouves.length === 0) throw new Error(`règle introuvable : ${selecteur}`);
  return trouves.map((trouve) => trouve[1] ?? '').join('\n');
}

describe('les libellés et les commandes ne se coupent pas', () => {
  it('un libellé de bouton passe à la ligne au lieu de s’abréger', () => {
    const libelle = regle('.bouton-libelle');
    expect(libelle).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(libelle).toMatch(/white-space:\s*normal/);
    const arme = regle(".bouton[data-arme] .bouton-libelle");
    expect(arme).not.toMatch(/nowrap/);
    expect(arme).not.toMatch(/ellipsis/);
  });

  it('le pupitre desktop a la largeur que la place lui réserve', () => {
    expect(LARGEUR_PUPITRE).toBeGreaterThanOrEqual(400);
    expect(css).toContain(`--pupitre-l: ${String(LARGEUR_PUPITRE)}px;`);
    expect(css).toMatch(/width:\s*min\(var\(--pupitre-l\), 100%\)/);
  });

  it('la droite de la frise ne se tasse pas ; le lien de l’arcade se réduit au losange sur mobile', () => {
    expect(regle('.frise-droite')).toMatch(/flex:\s*none/);
    expect(regle('.frise .arcade-lien')).toMatch(/width:\s*44px/);
    expect(regle('.frise .arcade-lien-mot')).toMatch(/clip-path:\s*inset\(50%\)/);
  });

  it('sous 360 px, le son quitte la frise pour le menu', () => {
    expect(css).toMatch(/@media \(width < 22\.5rem\) \{\s*\.frise-droite \.frise-son \{\s*display: none;/);
    expect(regle('.frise-son-etroit')).toMatch(/display:\s*none/);
  });
});

describe('l’appui long à côté d’un autre bouton', () => {
  it('prend son libellé court sous 210 px au lieu de passer sur trois lignes', () => {
    expect(regle('.appui-long[data-libelle-court]')).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/@container \(width < 210px\) \{\s*\.appui-libelle-long \{\s*display: none;/);
  });
});
