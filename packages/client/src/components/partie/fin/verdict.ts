/**
 * Qui a gagné, du point de vue d'un siège.
 *
 * À la fin, la vue révèle tous les rôles et les amoureux (`viewFor` : une
 * partie finie est omnisciente) : on peut donc juger chaque siège sans rien
 * deviner. La victoire se juge par **faction** (`factionOf`, R98), jamais
 * par le camp d'origine : le Loup Blanc chasse avec la meute (`campOf` le
 * range chez les loups), mais il ne gagne que seul — et la victoire de la
 * meute n'est pas la sienne. Pour l'issue `amoureux`, seul le couple gagne,
 * quelle que soit sa faction.
 */

import { factionOf, type PlayerView, type Winner } from '@garoutom/engine';

/** Ce joueur fait-il partie des gagnants de l'issue ? `personne` ne gagne personne. */
export function estGagnant(winner: Winner | null, joueur: PlayerView): boolean {
  if (winner === null || joueur.role === null) return false;
  switch (winner) {
    case 'village':
    case 'loups':
    case 'loupBlanc':
      return factionOf(joueur.role) === winner;
    case 'amoureux':
      return joueur.isLover;
    case 'personne':
      return false;
  }
}

export type CouleurFin = 'gagne' | 'perdu' | 'neutre';

export interface VerdictSiege {
  /** Le verdict en un mot, en capitales — le code du son et du partage : GAGNÉ, PERDU, FIN… */
  verdict: string;
  couleur: CouleurFin;
  /**
   * Le sort de ce siège en toutes lettres, titre de la planche du verdict :
   * « Vous avez gagné ». Les capitales sont réservées au code de la table
   * (SPEC Caprices § 3.6) : le mot en capitales ne s'affiche plus.
   */
  phrase: string;
}

const PHRASES: Readonly<Record<string, string>> = {
  GAGNÉ: 'Vous avez gagné',
  PERDU: 'Vous avez perdu',
  FIN: 'La partie est finie',
  'PARTIE NULLE': 'Personne ne l’emporte',
};

function verdict(code: string, couleur: CouleurFin): VerdictSiege {
  return { verdict: code, couleur, phrase: PHRASES[code] ?? code };
}

/**
 * Le verdict du siège : son code en un mot et sa phrase. Spectateur (`siege`
 * nul) : « FIN » ; partie sans vainqueur : « PARTIE NULLE », neutre pour
 * tout le monde.
 */
export function verdictDuSiege(
  winner: Winner | null,
  joueurs: readonly PlayerView[],
  siege: number | null,
): VerdictSiege {
  if (winner === 'personne') return verdict('PARTIE NULLE', 'neutre');
  const moi = siege === null ? undefined : joueurs.find((joueur) => joueur.seat === siege);
  if (winner === null || moi === undefined) return verdict('FIN', 'neutre');
  return estGagnant(winner, moi) ? verdict('GAGNÉ', 'gagne') : verdict('PERDU', 'perdu');
}
