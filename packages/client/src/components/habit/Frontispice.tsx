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
import { TRACE_RECUEIL } from './traces-paresseuses.js';
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

/** La boîte du bandeau du recueil, connue avant que sa planche n'arrive (la place est gardée). */
const BOITE_RECUEIL = '0 0 358 160';

export function Frontispice({ format, motif = 'recueil', className, libelle }: FrontispiceProps) {
  const voix = useVoix();
  const cle = format === 'portrait' ? 'portrait' : motif;
  // Le recueil n'orne que la nuit racontée : sa planche est chargée à la
  // demande (préchargée au lancement de la partie) ; l'accueil a les siennes.
  const recueil = TRACE_RECUEIL.useModule(cle === 'recueil')?.FRONTISPICE_RECUEIL;
  const planche = cle === 'recueil' ? recueil : FRONTISPICES[cle];
  const trace = useTrace(planche?.trace, {});
  const inscription = cle === 'recueil' && planche !== undefined ? voix.legendeEcran('accueil') : undefined;
  const viewBox = planche?.viewBox ?? BOITE_RECUEIL;
  const [largeur, hauteur] = viewBox.split(' ').slice(2).map(Number);

  return (
    <svg
      {...(libelle === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': libelle })}
      width={largeur}
      height={hauteur}
      viewBox={viewBox}
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
