/**
 * Le rendu des tracés gravés.
 *
 * Les tracés ne sont pas écrits ici : `docs/design/caprices/generateurs/extraire.mjs`
 * les lit dans les générateurs des planches (lots C et F) et les dépose dans
 * `traces/*.ts` sous forme d'arbres `[balise, props, ...enfants]`. Ce module
 * les change en éléments SVG React, en résolvant trois conventions :
 *
 * - `'$jeton'` : une encre sémantique (réserve, meute, masse…), que chaque
 *   composant fournit dans sa palette — posée en `style`, pour que les
 *   variables CSS du tirage s'y résolvent ;
 * - `'@c1'` : un identifiant local (`clipPath`, `mask`), préfixé à chaque rendu
 *   pour que deux gravures d'une même page ne partagent pas leurs découpes ;
 * - `'§'` : le suffixe des motifs de `textures.svg` (`hach-2-e` / `hach-2-v`),
 *   qui suit le tirage.
 *
 * Les matières globales (`url(#aqua-IV)`, `url(#mordu)`, `url(#verge)`…) sont
 * laissées telles quelles : `<Matieres/>` les pose une fois pour l'app.
 */
import { createElement, useId, useMemo, type CSSProperties, type ReactNode } from 'react';

/** Les attributs d'un nœud, déjà nommés comme les props React. */
export interface PropsTrace {
  readonly [prop: string]: string | { readonly [propriete: string]: string };
}
/** Un nœud de tracé : `[balise, props, ...enfants]` (les enfants sont des nœuds ou du texte). */
export interface Noeud extends ReadonlyArray<string | PropsTrace | Noeud> {
  readonly 0: string;
  readonly 1: PropsTrace;
}

/** Les encres d'un rendu : jeton (sans `$`) → couleur CSS. */
export type Palette = Readonly<Record<string, string>>;

export interface ContexteTrace {
  palette: Palette;
  /** Préfixe des identifiants locaux, unique par rendu. */
  prefixe: string;
  /** Suffixe des motifs de hachure : `e` (encre, tirage papier) ou `v` (vergé, tirage cuivre). */
  suffixe?: 'e' | 'v';
}

const PROPS_COULEUR = new Set(['fill', 'stroke', 'color', 'stopColor', 'floodColor']);

function resoudreValeur(valeur: string, ctx: ContexteTrace): string {
  let v = valeur;
  if (v.includes('@')) v = v.replace(/#@/g, `#${ctx.prefixe}`).replace(/^@/, ctx.prefixe);
  if (v.includes('§')) v = v.replace(/§/g, ctx.suffixe ?? 'e');
  return v;
}

function couleur(jeton: string, ctx: ContexteTrace): string {
  return ctx.palette[jeton.slice(1)] ?? 'currentColor';
}

/** Un nœud (et sa descendance) en éléments React. */
export function rendreTrace(noeud: Noeud | string, ctx: ContexteTrace): ReactNode {
  if (typeof noeud === 'string') return noeud;
  const balise = noeud[0];
  const brutes = noeud[1];
  const enfants = noeud.slice(2) as (Noeud | string)[];
  const props: Record<string, unknown> = {};
  let style: Record<string, string> | undefined;
  for (const [cle, valeur] of Object.entries(brutes)) {
    if (typeof valeur !== 'string') {
      // un `style` hérité du générateur (les <svg> imbriqués d'une vignette)
      style = { ...style };
      for (const [p, v] of Object.entries(valeur)) style[p] = v.startsWith('$') ? couleur(v, ctx) : resoudreValeur(v, ctx);
      continue;
    }
    if (PROPS_COULEUR.has(cle) && valeur.startsWith('$')) {
      style = { ...style, [cle]: couleur(valeur, ctx) };
      continue;
    }
    props[cle] = resoudreValeur(valeur, ctx);
  }
  if (style !== undefined) props.style = style as CSSProperties;
  return createElement(balise, props, ...enfants.map((e) => rendreTrace(e, ctx)));
}

/** Un préfixe d'identifiant sûr dans `url(#…)`, tiré de `useId`. */
export function usePrefixe(): string {
  const id = useId();
  return `g${id.replace(/[^a-zA-Z0-9_-]/g, '')}-`;
}

/** Le rendu mémorisé d'un tracé (le tracé et la palette changent rarement). */
export function useTrace(noeud: Noeud | undefined, palette: Palette, suffixe?: 'e' | 'v'): ReactNode {
  const prefixe = usePrefixe();
  // La palette est comparée par valeur : les composants la recomposent à chaque rendu.
  const cle = JSON.stringify(palette);
  return useMemo(
    () => (noeud === undefined ? null : rendreTrace(noeud, { palette: JSON.parse(cle) as Palette, prefixe, suffixe })),
    [noeud, cle, prefixe, suffixe],
  );
}
