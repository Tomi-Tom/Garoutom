/**
 * Le buste à couvre-chef d'un siège (SPEC § 5.1.2) : tiré des *Caprichos*,
 * attribué par numéro de siège (public, stable, sans rapport avec le rôle).
 * C'est la silhouette avant le détail — et la satire : tout le village est en
 * costume. Tracés du lot F (`traces/chefs.ts`), boîte 48 × 48, gravés à l'eau-
 * forte (contour, hachures des motifs `hach-N-e` / `-v` selon le tirage) ou en
 * fantôme pour un mort (contour seul au palier I).
 *
 * À Shiganshina, les coiffes du district. Le lot C n'en a gravé que six (sièges
 * 1 à 6) ; les sièges 7 à 18 gardent le couvre-chef de Thiercelieux en
 * attendant les douze autres. Les coiffes voyagent avec les autres gravures du
 * district, chargées à la demande : en les attendant, le couvre-chef du village.
 *
 * Décoratif : le jeton qui le porte dit le nom et l'état du joueur.
 */
import { useGravuresDuSkin } from './gravures.js';
import { COUVRE_CHEFS } from './traces/chefs.js';
import { useTrace } from './Trace.js';

export interface CouvreChefProps {
  /** Le numéro du siège, 1 à 18 (au-delà, on reprend la ronde). */
  numero: number;
  /** Côté en pixels : 72 (médaillon D1) ou 40 (D4). Défaut 40. */
  taille?: 72 | 40;
  skin?: string;
  /** Le tirage des hachures. Défaut : papier. */
  tirage?: 'papier' | 'cuivre';
  /** Mort : le buste devient fantôme (SPEC § 4.7, troisième cran). */
  mort?: boolean;
  className?: string;
}

/** Le rang 0..17 d'un numéro de siège 1..18 (tout entier y retombe). */
export function rangDuSiege(numero: number): number {
  return (((Math.trunc(numero) - 1) % 18) + 18) % 18;
}

export function CouvreChef({ numero, taille = 40, skin, tirage = 'papier', mort = false, className }: CouvreChefProps) {
  const rang = rangDuSiege(numero);
  const gravures = useGravuresDuSkin(skin);
  const coiffe = gravures?.coiffes[rang];
  const chef = COUVRE_CHEFS[rang];
  const noeud = coiffe !== undefined ? coiffe.grave : mort ? chef?.fantome : chef?.grave;
  const cuivre = tirage === 'cuivre';
  const trace = useTrace(
    noeud,
    {
      surface: cuivre ? 'var(--surface, #2A241E)' : 'var(--surface, #F5EFE2)',
      fantome: 'var(--cp-palier-1, #A89D8C)',
      vert: cuivre ? '#8FA07E' : 'var(--cp-hachure-skin, #45523F)',
      fluo: 'var(--cp-hachure-skin, #E8C81A)',
      fluor: 'var(--cp-hachure-skin, #E3B341)',
      or: 'var(--cp-hachure-skin, #C9971F)',
    },
    cuivre ? 'v' : 'e',
  );
  return (
    <svg
      aria-hidden="true"
      width={taille}
      height={taille}
      viewBox="0 0 48 48"
      className={className}
      data-couvre-chef={rang + 1}
      // Une coiffe du district n'a pas de fantôme gravé : elle se brunit par l'encre.
      style={coiffe !== undefined && mort ? { color: 'var(--cp-palier-1, #A89D8C)' } : undefined}
    >
      {trace}
    </svg>
  );
}
