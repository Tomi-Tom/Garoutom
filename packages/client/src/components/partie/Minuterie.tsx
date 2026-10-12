/**
 * La minuterie du siège local.
 *
 * Elle ne dit que l'échéance que le serveur a confiée à ce siège (R80) : celle
 * des autres est un secret, et un villageois qui n'a rien à jouer la nuit ne
 * voit donc rien du tout — c'est voulu. Mais « rien » ne veut pas dire
 * « moins haut » : la minuterie absente laisse **un cadre vide de même
 * taille** (D23, « Silence à l'écran »). Sans lui, l'en-tête d'un téléphone
 * rétrécissait la nuit chez qui n'agit pas, et le voisin à un mètre voyait
 * qui joue sans rien lire.
 *
 * Deux présentations, au choix du joueur (question ouverte n° 6 de
 * `docs/refs/design.md`) :
 *
 * - `barre` : une barre qui se vide et le temps en IBM Plex Mono, toujours ;
 * - `discrete` : une mention discrète, qui ne se réveille en barre que dans
 *   les trente dernières secondes.
 *
 * Les deux tiennent dans le même cadre, de hauteur fixe. Les dix dernières
 * secondes passent au sang : c'est la seule urgence que l'écran se permet.
 * La barre se vide par une transition CSS linéaire, que
 * `prefers-reduced-motion` n'a pas à couper — elle ne se déplace pas, elle
 * raccourcit. Quand la table attend son village (D19), le temps se fige et
 * le dit.
 */

import { useEcheance, formatDuree } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';

/** Sous ce seuil, la présentation discrète se réveille. */
const SEUIL_REVEIL_S = 30;
/** Sous ce seuil, la minuterie passe au sang. */
const SEUIL_URGENCE_S = 10;

/**
 * Le cadre de la minuterie : même balise, mêmes classes de mise en page,
 * même hauteur, qu'il y ait un compte à rebours ou non.
 */
const CADRE = 'flex h-5 min-w-0 items-center gap-2';

export function Minuterie({ className = '' }: { className?: string }) {
  const echeance = useEcheance();
  const { minuterie } = useReglages();

  if (echeance === null) {
    // Le cadre vide : rien à lire, mais la place tenue.
    return <div aria-hidden="true" data-testid="minuterie-cadre" className={`${CADRE} ${className}`} />;
  }

  const { secondes, fraction, figee } = echeance;
  const urgence = secondes <= SEUIL_URGENCE_S && !figee;
  const teinte = figee ? 'var(--lune)' : urgence ? 'var(--sang)' : 'var(--lanterne)';
  const temps = formatDuree(secondes);
  const libelle = figee ? `Temps suspendu : ${temps}` : `Temps restant : ${temps}`;

  // Discrète et loin de l'échéance : une mention, sans barre ni teinte.
  if (minuterie === 'discrete' && secondes > SEUIL_REVEIL_S) {
    return (
      <div
        role="timer"
        aria-label={libelle}
        data-testid="minuterie"
        data-figee={figee ? '' : undefined}
        className={`${CADRE} ${className}`}
      >
        <span aria-hidden="true" className="font-mono text-xs" style={{ color: 'var(--papier-doux)' }}>
          {temps}
        </span>
      </div>
    );
  }

  return (
    <div
      role="timer"
      aria-label={libelle}
      data-testid="minuterie"
      data-figee={figee ? '' : undefined}
      className={`${CADRE} ${className}`}
    >
      <div
        aria-hidden="true"
        className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full"
        style={{ background: 'var(--nuit-creux)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${String(Math.round(fraction * 1000) / 10)}%`,
            background: teinte,
            transition: figee ? 'none' : 'width 250ms linear, background-color 400ms ease',
          }}
        />
      </div>
      <span
        aria-hidden="true"
        className="shrink-0 font-mono text-sm leading-5 font-medium tabular-nums"
        style={{ color: urgence ? 'var(--sang)' : 'var(--papier)' }}
      >
        {temps}
      </span>
    </div>
  );
}
