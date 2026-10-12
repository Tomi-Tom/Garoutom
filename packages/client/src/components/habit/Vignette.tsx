/**
 * Les dix-huit vignettes de la nuit racontée (SPEC § 6.4, lot C) : grille 96,
 * cuvette comprise, tirées sur papier (leurs encres sont celles de l'épreuve).
 * À 192 px, le trait s'affine (le générateur règle l'épaisseur pour la taille).
 *
 * Décorative : la légende du graveur, à côté, dit le moment. `libelle` en fait
 * une image nommée.
 */
import { VIGNETTES } from './traces/vignettes.js';
import { useTrace } from './Trace.js';

/** Les vignettes, dans l'ordre de priorité du récit (§ 6.4). */
export const NOMS_VIGNETTES = Object.keys(VIGNETTES);
export type NomVignette =
  | 'machoire'
  | 'branche'
  | 'aconit'
  | 'cor'
  | 'lacs'
  | 'corde'
  | 'bouc'
  | 'potence'
  | 'vie'
  | 'yeux'
  | 'canne'
  | 'porte'
  | 'lettre'
  | 'main'
  | 'fleche'
  | 'dormeur'
  | 'place'
  | 'sablier';

export interface VignetteProps {
  /** Une des dix-huit (`NomVignette`) ; un nom inconnu laisse la place vide. */
  nom: NomVignette | (string & {});
  taille?: 96 | 192;
  className?: string;
  libelle?: string;
}

export function Vignette({ nom, taille = 96, className, libelle }: VignetteProps) {
  const vignette = VIGNETTES[nom];
  const trace = useTrace(vignette?.[taille], {});
  return (
    <svg
      {...(libelle === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': libelle })}
      width={taille}
      height={taille}
      viewBox="0 0 96 96"
      className={className}
      data-vignette={nom}
      style={{ display: 'block', overflow: 'hidden', flex: 'none' }}
    >
      {trace}
    </svg>
  );
}
