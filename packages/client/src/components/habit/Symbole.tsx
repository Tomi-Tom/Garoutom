/**
 * Le symbole gravé d'un rôle (SPEC § 6.1-6.2) — SVG au trait `currentColor`,
 * repris tel quel des planches du lot C (`traces/symboles.ts`, régénéré par
 * `extraire.mjs`). Trois niveaux de gravure selon la taille :
 *
 * - 128 (≥ 96 px) : la carte — trait fin, hachures et détails de gravure ;
 * - 32 (24 à 95 px) : trait 2, hachure au pas 3, contours fermés ;
 * - 16 (< 24 px) : simplifié — sans hachure, trait épaissi.
 *
 * Le contexte colore : l'encre du texte (`currentColor`) pour le trait, la
 * sanguine de la meute pour la morsure (`--camp-meute`), la réserve (le papier
 * laissé blanc) prend `--symbole-reserve` ou, à défaut, le fond. Un skin grave
 * autrement : à Shiganshina, les treize planches des *Désastres*.
 *
 * Sans rôle, la carte au dos hachuré : « carte face cachée ».
 */
import type { RoleId } from '@garoutom/engine';

import { useSkinId, useVoix } from '../../lib/partie.js';
import { voixDuSkin } from '../../skins/registre.js';
import { gravuresDuSkin, useGravuresDuSkin } from './gravures.js';
import { ICONES } from './traces/icones.js';
import { SYMBOLES, type NiveauSymbole } from './traces/symboles.js';
import { useTrace, type Noeud, type Palette } from './Trace.js';

/** Les tailles du dessin (SPEC § 6.2) ; toute autre taille prend le niveau de sa tranche. */
export type TailleSymbole = 128 | 32 | 24 | 16;

export interface SymboleRoleProps {
  /** `null` : la carte face cachée. */
  role: RoleId | null;
  /**
   * Côté en pixels. Les tailles du dessin sont 128, 32, 24 et 16 ; une taille
   * intermédiaire (les écrans d'avant Caprices passent 52, 28…) est acceptée
   * et prend le niveau de gravure de sa tranche. Défaut 32.
   */
  taille?: TailleSymbole | (number & {});
  /** Le skin dont le symbole porte le nom et la gravure. Défaut : celui de la table. */
  skin?: string;
  className?: string;
  /** Décoratif (le nom est écrit à côté) : caché des lecteurs d'écran. */
  decoratif?: boolean;
  /** Encre de la réserve (le blanc du papier dans le dessin). */
  reserve?: string;
  /** Encre des masses d'aquatinte (le loup, la main du Colosse). Défaut : `currentColor`. */
  masse?: string;
  /** Encre de la morsure et de la vapeur (meute). Défaut : `--camp-meute`. */
  accent?: string;
  /** Encre du serment (les cœurs de Cupidon, au niveau 128). */
  serment?: string;
}

/** Le niveau de gravure d'une taille en pixels (même règle que le générateur du lot C). */
export function niveauSymbole(taille: number): NiveauSymbole {
  return taille >= 96 ? '128' : taille >= 24 ? '32' : '16';
}

/**
 * Le tracé d'un rôle pour un skin et un niveau (Thiercelieux pour tout skin
 * sans gravure propre). Celles du skin sont chargées à la demande
 * (`gravuresDuSkin`) : tant qu'elles ne sont pas là, Thiercelieux tient la
 * place. Le composant qui l'appelle s'abonne à leur arrivée avec
 * `useGravuresDuSkin(skin)`.
 */
export function traceSymbole(role: RoleId, skin: string, niveau: NiveauSymbole): Noeud | undefined {
  const s = gravuresDuSkin(skin)?.traces.courant()?.symboles[role];
  if (s !== undefined) return niveau === '128' ? s.grand : s.petit;
  return SYMBOLES[role]?.[niveau];
}

/** La réserve hors d'une carte : ce que le conteneur déclare, sinon le fond de l'écran. */
export const RESERVE_PAR_DEFAUT = 'var(--symbole-reserve, var(--fond, #E8DFCB))';

export function SymboleRole({
  role,
  taille = 32,
  skin,
  className,
  decoratif = false,
  reserve,
  masse,
  accent,
  serment,
}: SymboleRoleProps) {
  const skinTable = useSkinId();
  const voixTable = useVoix();
  const skinId = skin ?? skinTable;
  const voix = skin === undefined ? voixTable : voixDuSkin(skin);
  const label = role === null ? 'carte face cachée' : voix.nomRole(role);
  useGravuresDuSkin(skinId);

  const palette: Palette = {
    reserve: reserve ?? RESERVE_PAR_DEFAUT,
    meute: accent ?? 'var(--camp-meute, #A23B24)',
    serment: serment ?? 'var(--camp-serment, #8A3A5C)',
    masse: masse ?? 'currentColor',
    fluo: 'var(--cp-hachure-skin, #E8C81A)',
    fluor: 'var(--cp-hachure-skin, #E3B341)',
  };
  const trace = role === null ? undefined : traceSymbole(role, skinId, niveauSymbole(taille));
  const gravure = useTrace(trace, palette);
  const dos = useTrace(role === null ? ICONES.carte : undefined, {});

  const accessibilite = decoratif
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label } as const);

  if (role === null) {
    // La carte au dos hachuré (icône « ma carte » du lot F), sur la grille 24.
    return (
      <svg
        {...accessibilite}
        width={taille}
        height={taille}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        data-symbole="dos"
      >
        {dos}
      </svg>
    );
  }
  return (
    <svg
      {...accessibilite}
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      className={className}
      data-symbole={role}
      style={{ overflow: 'visible' }}
    >
      {gravure}
    </svg>
  );
}
