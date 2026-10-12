/**
 * La minuterie du siège local (SPEC § 5.6) : une règle graduée de graveur.
 *
 * Elle ne dit que l'échéance que le serveur a confiée à ce siège (R80) : celle
 * des autres est un secret. Mais « rien » ne veut pas dire « moins haut » : la
 * ligne de 24 px est présente chez **tous** les sièges, et la minuterie
 * absente dessine **le même cadre** — 24 crans en contour, un tiret long à la
 * place du chiffre (P0-4, D23).
 *
 * - **barre** (défaut) : sablier 16 · 24 crans de 5 × 10 au pas de 8 · le
 *   chiffre aligné à droite sur 44 px. Les crans restants pleins, les
 *   écoulés en contour ; un cran tombe à la fois, sans glissement ;
 * - **discrète** (réglage) : sablier et chiffre seuls ; sous 30 s, elle
 *   bascule en barre et le chiffre grossit (P1-12) ;
 * - **urgence** (< 10 s) : **un seul** changement — les crans pleins passent
 *   en hachure croisée (la texture, jamais la couleur), le sablier se
 *   retourne d'un cran, le chiffre passe à 600. Ni sanguine, ni clignotement.
 *
 * La nuit, les crans pleins sont au palier II et les vides au palier III
 * (`--cran-plein`, `--cran-vide`) : à un mètre, une minuterie qui court et une
 * minuterie absente sont la même ligne grise.
 *
 * Quand la table attend son village (D19), le temps se fige et la ligne le
 * dit : « La partie attend son village » — c'est public, tout le monde le lit.
 */

import { formatDuree, useEcheance, useGame, usePause } from '../../lib/partie.js';
import { useReglages } from '../../lib/reglages.js';
import { tirageDe } from '../caprices/useTirage.js';
import { Icone } from '../habit/Icone.js';

/** Sous ce seuil, la présentation discrète se réveille. */
const SEUIL_REVEIL_S = 30;
/** Sous ce seuil, l'urgence : la texture change. */
const SEUIL_URGENCE_S = 10;
/** Les crans de la règle. */
export const CRANS = 24;

/** Le cadre : même balise, mêmes classes, même hauteur, qu'il y ait un compte à rebours ou non. */
const CADRE = 'flex h-6 min-w-0 items-center gap-2';

/** La règle graduée : `pleins` crans pleins sur 24, en hachure croisée à l'urgence. */
function Regle({ pleins, urgence, cuivre = false }: { pleins: number; urgence: boolean; cuivre?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={189}
      height={10}
      viewBox="0 0 189 10"
      className="block shrink-0"
      data-crans-pleins={pleins}
    >
      {Array.from({ length: CRANS }, (_, i) =>
        i < pleins ? (
          <rect
            key={i}
            x={i * 8}
            y={0}
            width={5}
            height={10}
            fill={urgence ? (cuivre ? 'url(#hach-x-v)' : 'url(#hach-x-e)') : 'var(--cran-plein)'}
            stroke={urgence ? 'var(--cran-plein)' : 'none'}
            strokeWidth={urgence ? 1 : 0}
            className={urgence ? 'cran-urgence' : undefined}
          />
        ) : (
          <rect key={i} x={i * 8 + 0.5} y={0.5} width={4} height={9} fill="none" stroke="var(--cran-vide)" strokeWidth={1} />
        ),
      )}
    </svg>
  );
}

function Sablier({ retourne }: { retourne: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4"
      style={retourne ? { transform: 'rotate(180deg)' } : undefined}
    >
      <Icone nom="sablier" />
    </span>
  );
}

export function Minuterie({ className = '' }: { className?: string }) {
  const echeance = useEcheance();
  const pause = usePause();
  const { minuterie, tirage } = useReglages();
  const cuivre = tirageDe(useGame()?.phase ?? null, tirage) === 'cuivre';

  const mentionPause = pause ? (
    <span data-testid="pause" className="truncate text-[12px] leading-4 text-[var(--encre-2)]">
      La partie attend son village
    </span>
  ) : null;

  if (echeance === null) {
    // Le cadre vide : 24 crans en contour, un tiret long — la place tenue.
    return (
      <div aria-hidden={pause ? undefined : true} data-testid="minuterie-cadre" className={`${CADRE} ${className}`}>
        <Sablier retourne={false} />
        {mentionPause ?? <Regle pleins={0} urgence={false} />}
        <span className="ml-auto w-11 shrink-0 text-right text-[16px] leading-5 text-[var(--encre-2)]">—</span>
      </div>
    );
  }

  const { secondes, fraction, figee } = echeance;
  const urgence = secondes < SEUIL_URGENCE_S && !figee;
  const temps = formatDuree(secondes);
  const libelle = figee ? `Temps suspendu : ${temps}` : `Temps restant : ${temps}`;
  const discrete = minuterie === 'discrete' && secondes > SEUIL_REVEIL_S;
  const reveillee = minuterie === 'discrete' && !discrete;
  const pleins = Math.max(0, Math.min(CRANS, Math.ceil(fraction * CRANS)));

  return (
    <div
      role="timer"
      aria-label={libelle}
      data-testid="minuterie"
      data-figee={figee ? '' : undefined}
      data-urgence={urgence ? '' : undefined}
      className={`${CADRE} ${className}`}
    >
      <Sablier retourne={urgence} />
      {mentionPause ?? (discrete ? null : <Regle pleins={pleins} urgence={urgence} cuivre={cuivre} />)}
      <span
        aria-hidden="true"
        className="ml-auto w-11 shrink-0 text-right tabular-nums"
        style={{
          fontSize: discrete ? 14 : reveillee ? 20 : 16,
          lineHeight: discrete ? '20px' : reveillee ? '24px' : '20px',
          fontWeight: urgence ? 600 : 400,
          color: discrete ? 'var(--encre-2)' : 'var(--encre)',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}
      >
        {temps}
      </span>
    </div>
  );
}
