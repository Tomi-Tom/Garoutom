/**
 * Les glyphes d'état du jeton (SPEC § 5.1.3-5.1.4) : grille 16, trait 1,25,
 * `currentColor` — le contexte colore (les lacs prennent `--camp-serment`).
 * Tracés du lot F (`traces/icones.ts`), nommés par l'état qu'ils disent.
 *
 * Le brassard du capitaine n'a pas de glyphe propre au lot F (il se pose en
 * bandeau sous le médaillon) : `capitaine` reprend l'icône « brassard » sur la
 * grille 24, au même trait rendu.
 *
 * Un glyphe est décoratif : la phrase cachée du jeton dit tout. `libelle` en
 * fait une image nommée.
 */
import { GLYPHES, ICONES } from './traces/icones.js';
import { useTrace, type Noeud } from './Trace.js';

export type NomGlyphe =
  | 'a-vote'
  | 'capitaine'
  | 'marque'
  | 'absent'
  | 'mort'
  | 'gracie'
  | 'hors-vote'
  | 'votera'
  | 'lie'
  | 'interdit'
  | 'oeil'
  | 'refuse';

/** Les douze noms : les onze glyphes du lot F et le brassard. */
export const NOMS_GLYPHES: readonly NomGlyphe[] = [...(Object.keys(GLYPHES) as NomGlyphe[]), 'capitaine'];

export interface GlypheProps {
  nom: NomGlyphe;
  /** Côté en pixels. Défaut 16 (la grille). */
  taille?: number;
  className?: string;
  libelle?: string;
}

export function Glyphe({ nom, taille = 16, className, libelle }: GlypheProps) {
  const brassard = nom === 'capitaine';
  const noeud = (brassard ? ICONES.brassard : GLYPHES[nom]) as Noeud;
  const trace = useTrace(noeud, { surEncre: 'var(--sur-encre, #F5EFE2)' });
  return (
    <svg
      {...(libelle === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': libelle })}
      width={taille}
      height={taille}
      viewBox={brassard ? '0 0 24 24' : '0 0 16 16'}
      fill="none"
      stroke="currentColor"
      // 1,25 px rendus à la grille 16 ; 1,875 sur la grille 24 du brassard.
      strokeWidth={brassard ? 1.875 : 1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-glyphe={nom}
      style={{ flex: 'none' }}
    >
      {trace}
    </svg>
  );
}
