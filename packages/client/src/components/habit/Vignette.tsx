/**
 * Les dix-huit vignettes de la nuit racontée (SPEC § 6.4, lot C) : grille 96,
 * cuvette comprise, tirées sur papier (leurs encres sont celles de l'épreuve).
 * À 192 px, le trait s'affine (le générateur règle l'épaisseur pour la taille).
 *
 * Décorative : la légende du graveur, à côté, dit le moment. `libelle` en fait
 * une image nommée.
 *
 * Les tracés (le plus gros module de gravures) sont chargés à la demande
 * (`TRACES_VIGNETTES`, préchargés au lancement de la partie) : tant qu'ils ne
 * sont pas là, la vignette garde sa place, vide.
 */
import { TRACES_VIGNETTES } from './traces-paresseuses.js';
import { useTrace } from './Trace.js';

/** Les vignettes, dans l'ordre de priorité du récit (§ 6.4) — celui de `traces/vignettes.ts`. */
export const NOMS_VIGNETTES = [
  'machoire',
  'branche',
  'aconit',
  'cor',
  'lacs',
  'corde',
  'bouc',
  'potence',
  'vie',
  'yeux',
  'canne',
  'porte',
  'lettre',
  'main',
  'fleche',
  'dormeur',
  'place',
  'sablier',
] as const;
export type NomVignette = (typeof NOMS_VIGNETTES)[number];

export interface VignetteProps {
  /** Une des dix-huit (`NomVignette`) ; un nom inconnu laisse la place vide. */
  nom: NomVignette | (string & {});
  taille?: 96 | 192;
  className?: string;
  libelle?: string;
}

export function Vignette({ nom, taille = 96, className, libelle }: VignetteProps) {
  const vignette = TRACES_VIGNETTES.useModule()?.VIGNETTES[nom];
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
