/**
 * Le frontispice : « Le sommeil de la raison engendre des loups » [Caprice 43].
 *
 * - `bandeau` (358 × 160) : par défaut la planche du recueil (lot C) — le
 *   dormeur sur son pupitre, le loup couché à ses pieds, hiboux et chauves-
 *   souris dans la nuée ; l'inscription du pupitre est la légende d'écran du
 *   skin (`legendeEcran('accueil')`), laissée nue si le skin n'en a pas.
 *   `motif="yeux"` donne le bandeau de l'accueil (lot E1) : la nuit qui s'y
 *   peuple d'yeux.
 * - `portrait` (640 × 720) : l'accueil desktop (lot E1).
 *
 * Tirés sur papier, avec leurs encres d'épreuve. Décoratif par défaut (la
 * légende est écrite à côté) ; `libelle` en fait une image nommée.
 */
import { useVoix } from '../../lib/partie.js';
import { FRONTISPICES } from './traces/frontispice.js';
import { useTrace } from './Trace.js';

export interface FrontispiceProps {
  format: 'bandeau' | 'portrait';
  /** Le bandeau : la planche du recueil (défaut) ou celle de l'accueil, aux yeux. */
  motif?: 'recueil' | 'yeux';
  className?: string;
  libelle?: string;
}

/** Une légende en deux lignes, coupée à l'espace le plus proche du milieu, sans ses guillemets. */
export function deuxLignes(texte: string): [string, string] | [string] {
  const nu = texte.replace(/^[«\s]+|[»\s]+$/g, '');
  const espaces = [...nu.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (espaces.length === 0) return [nu];
  const milieu = nu.length / 2;
  const coupe = espaces.reduce((a, b) => (Math.abs(b - milieu) < Math.abs(a - milieu) ? b : a));
  return [nu.slice(0, coupe), nu.slice(coupe + 1)];
}

export function Frontispice({ format, motif = 'recueil', className, libelle }: FrontispiceProps) {
  const voix = useVoix();
  const cle = format === 'portrait' ? 'portrait' : motif;
  const planche = FRONTISPICES[cle];
  const trace = useTrace(planche.trace, {});
  const inscription = cle === 'recueil' ? voix.legendeEcran('accueil') : undefined;
  const [largeur, hauteur] = planche.viewBox.split(' ').slice(2).map(Number);

  return (
    <svg
      {...(libelle === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': libelle })}
      width={largeur}
      height={hauteur}
      viewBox={planche.viewBox}
      className={className}
      data-frontispice={cle}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {trace}
      {inscription !== undefined && inscription !== '' && (
        // La plaque du pupitre (54, 111, 166 × 44) : deux lignes d'italique, comme au lot C.
        <text
          textAnchor="middle"
          fontFamily="'IM Fell French Canon', Georgia, serif"
          fontStyle="italic"
          fontSize={16}
          fill="#17130F"
        >
          {deuxLignes(inscription).map((ligne, i, lignes) => (
            <tspan key={i} x={137} y={(lignes.length === 1 ? 138 : 129) + i * 19}>
              {ligne}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}
