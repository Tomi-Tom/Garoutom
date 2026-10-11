/**
 * La minuterie du siège local.
 *
 * Elle ne dit que l'échéance que le serveur a confiée à ce siège (R80) : celle
 * des autres est un secret, et un villageois qui n'a rien à jouer la nuit ne
 * voit donc rien du tout — c'est voulu. Deux présentations, au choix du
 * joueur (question ouverte n° 6 de `docs/refs/design.md`) :
 *
 * - `barre` : une barre qui se vide et le temps en IBM Plex Mono, toujours ;
 * - `discrete` : une mention discrète, qui ne se réveille en barre que dans
 *   les trente dernières secondes.
 *
 * Les dix dernières secondes passent au sang : c'est la seule urgence que
 * l'écran se permet. La barre se vide par une transition CSS linéaire, que
 * `prefers-reduced-motion` n'a pas à couper — elle ne se déplace pas, elle
 * raccourcit.
 */

import { useEcheance, formatDuree } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';

/** Sous ce seuil, la présentation discrète se réveille. */
const SEUIL_REVEIL_S = 30;
/** Sous ce seuil, la minuterie passe au sang. */
const SEUIL_URGENCE_S = 10;

export function Minuterie({ className = '' }: { className?: string }) {
  const echeance = useEcheance();
  const { minuterie } = useReglages();
  if (echeance === null) return null;

  const { secondes, fraction } = echeance;
  const urgence = secondes <= SEUIL_URGENCE_S;
  const teinte = urgence ? 'var(--sang)' : 'var(--lanterne)';
  const temps = formatDuree(secondes);
  const libelle = `Temps restant : ${temps}`;

  // Discrète et loin de l'échéance : une mention, sans barre ni teinte.
  if (minuterie === 'discrete' && secondes > SEUIL_REVEIL_S) {
    return (
      <p
        role="timer"
        aria-label={libelle}
        data-testid="minuterie"
        className={`font-mono text-xs ${className}`}
        style={{ color: 'var(--papier-doux)' }}
      >
        {temps}
      </p>
    );
  }

  return (
    <div
      role="timer"
      aria-label={libelle}
      data-testid="minuterie"
      className={`flex min-w-0 items-center gap-2 ${className}`}
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
            transition: 'width 250ms linear, background-color 400ms ease',
          }}
        />
      </div>
      <span
        aria-hidden="true"
        className="shrink-0 font-mono text-sm font-medium tabular-nums"
        style={{ color: urgence ? 'var(--sang)' : 'var(--papier)' }}
      >
        {temps}
      </span>
    </div>
  );
}
