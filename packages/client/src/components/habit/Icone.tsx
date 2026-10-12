/**
 * Les 33 icônes d'interface (SPEC § 6.3), redessinées au burin par le lot F :
 * grille 24, zone vive 20, trait 1,5 `currentColor`, extrémités rondes. Aucune
 * icône de bibliothèque. Tracés repris tels quels (`traces/icones.ts`).
 *
 * Une icône est décorative : le bouton qui la porte dit ce qu'il fait. Pour
 * une icône seule, `libelle` en fait une image nommée.
 */
import { ICONES } from './traces/icones.js';
import { useTrace, type Noeud } from './Trace.js';

export type NomIcone =
  | 'menu'
  | 'carte'
  | 'regles'
  | 'reglages'
  | 'son'
  | 'son-coupe'
  | 'quitter'
  | 'fil'
  | 'envoyer'
  | 'voter'
  | 'abstention'
  | 'aucun'
  | 'viser'
  | 'vie'
  | 'mort'
  | 'vie-epuisee'
  | 'mort-epuisee'
  | 'bouclier'
  | 'bouclier-barre'
  | 'oeil'
  | 'lacs'
  | 'brassard'
  | 'plume'
  | 'machoire'
  | 'porte'
  | 'chandelle'
  | 'corde'
  | 'sablier'
  | 'registre'
  | 'aide'
  | 'renoue'
  | 'coupe'
  | 'pate';

// Les noms ci-dessus et les tracés extraits se répondent exactement.
type Exact = [keyof typeof ICONES] extends [NomIcone] ? ([NomIcone] extends [keyof typeof ICONES] ? true : never) : never;
const exact: Exact = true;
void exact;

/** Les 33 noms, dans l'ordre de la planche F-VII. */
export const NOMS_ICONES = Object.keys(ICONES) as NomIcone[];

export interface IconeProps {
  nom: NomIcone;
  /** 24 : le dessin ; 44 : le même dessin à 24, centré dans sa cible tactile de 44. Défaut 24. */
  taille?: 24 | 44;
  className?: string;
  /** Nomme l'icône pour les lecteurs d'écran ; sans lui, elle est décorative. */
  libelle?: string;
}

export function Icone({ nom, taille = 24, className, libelle }: IconeProps) {
  const trace = useTrace(ICONES[nom] as Noeud, {});
  const marge = (taille - 24) / 2;
  return (
    <svg
      {...(libelle === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': libelle })}
      width={taille}
      height={taille}
      viewBox={`${String(-marge)} ${String(-marge)} ${String(taille)} ${String(taille)}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-icone={nom}
      style={{ flex: 'none' }}
    >
      {trace}
    </svg>
  );
}
