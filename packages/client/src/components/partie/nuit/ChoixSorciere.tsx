/**
 * La Sorcière, seule en scène (R36, R42–R44).
 *
 * La victime de la meute est montrée — ou son absence —, avec l'état des
 * deux réserves. Sauver ne s'offre que si la vie reste, qu'il y a quelqu'un à
 * sauver et que la table le permet (`peutSeSauver`) ; empoisonner désigne un
 * vivant sur la place, elle-même comprise, tant que la mort reste. Les deux
 * se cumulent, puis « Valider » ; ou « Ne rien faire ».
 *
 * Elle est seule à jouer cette étape : son choix la clôt sur-le-champ
 * (`settle`), il n'y a donc pas de retour possible — le récapitulatif ne
 * promet rien de tel.
 */

import { useState } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms } from '../../../lib/partie.js';
import { Place } from '../Place.js';
import { EnTeteRole, GabaritRole, Pastille, Recap, usePeau } from './commun.js';
import { textePrompt } from './textes.js';

export function ChoixSorciere() {
  const game = useGame();
  const peau = usePeau();
  const nom = useNoms();
  const [sauver, setSauver] = useState(false);
  const [poison, setPoison] = useState<number | null>(null);
  const [envoye, setEnvoye] = useState<{ save: boolean; kill: number | null } | null>(null);
  if (game?.you == null || game.prompt?.kind !== 'sorciere') return null;
  const moi = game.you;
  const prompt = game.prompt;

  const victime = prompt.victim;
  const peutSauver = prompt.vie && victime !== null && prompt.peutSeSauver;
  const vivant = (seat: number) => game.players[seat]?.alive === true;

  const envoyer = (save: boolean, kill: number | null) => {
    setEnvoye({ save, kill });
    void jouer({ type: 'sorciere', save, kill });
  };

  // Le récapitulatif attend la vue : un refus du serveur laisse la main.
  const fait = game.acted;

  return (
    <GabaritRole teinte="lune" testId="nuit-sorciere">
      <EnTeteRole role={moi.role} teinte="lune" texte={textePrompt(peau, prompt, nom, moi.seat)} />

      {/* --- La victime et les réserves --- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="carte p-4">
          <p className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--papier-doux)' }}>
            Désigné·e cette nuit
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color: victime === null ? 'var(--lune)' : 'var(--sang)' }}>
            {victime === null ? 'Personne' : victime === moi.seat ? `${nom(victime)} (vous)` : nom(victime)}
          </p>
        </div>
        <div className="carte flex flex-col gap-1 p-4" aria-label="Vos réserves">
          <Reserve libelle="Vie" intacte={prompt.vie} />
          <Reserve libelle="Mort" intacte={prompt.mort} />
        </div>
      </div>

      {fait ? (
        <Recap changeable={false}>
          {resume(envoye, nom, victime)}
        </Recap>
      ) : (
        <>
          {peutSauver && victime !== null && (
            <button
              type="button"
              className="btn-voisin self-center"
              aria-pressed={sauver}
              onClick={() => setSauver((v) => !v)}
              style={sauver ? { borderColor: 'var(--lanterne)', color: 'var(--lanterne)' } : undefined}
            >
              {sauver && (
                <span aria-hidden="true" className="mr-1.5">
                  ✓
                </span>
              )}
              Sauver {nom(victime)}
            </button>
          )}

          {prompt.mort && (
            <>
              <Place
                choisissables={vivant}
                choisis={poison === null ? [] : [poison]}
                onChoisir={(seat) => setPoison((avant) => (avant === seat ? null : seat))}
                teinte="sang"
                compacte
                label="Choisir qui empoisonner"
                {...(victime === null
                  ? {}
                  : { annotations: { [victime]: <Pastille teinte="sang">désigné·e</Pastille> } })}
              />
              <p className="text-center text-sm" style={{ color: 'var(--papier-doux)' }} aria-live="polite">
                {poison === null
                  ? 'Touchez un jeton pour empoisonner — ou laissez la place en paix.'
                  : `Empoisonner ${nom(poison)}. Touchez à nouveau pour renoncer.`}
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-village"
              disabled={!sauver && poison === null}
              onClick={() => envoyer(sauver && peutSauver, poison)}
            >
              Valider
            </button>
            <button type="button" className="btn-voisin" onClick={() => envoyer(false, null)}>
              Ne rien faire
            </button>
          </div>
        </>
      )}
    </GabaritRole>
  );
}

function Reserve({ libelle, intacte }: { libelle: string; intacte: boolean }) {
  return (
    <p className="flex items-baseline justify-between gap-3 text-base">
      <span>{libelle}</span>
      <span className="text-sm font-bold" style={{ color: intacte ? 'var(--lanterne)' : 'var(--papier-doux)' }}>
        {intacte ? 'intacte' : 'épuisée'}
      </span>
    </p>
  );
}

function resume(
  envoye: { save: boolean; kill: number | null } | null,
  nom: (seat: number) => string,
  victime: number | null,
): string {
  if (envoye === null) return 'Votre choix est fait.';
  const morceaux: string[] = [];
  if (envoye.save && victime !== null) morceaux.push(`Vous sauvez ${nom(victime)}`);
  if (envoye.kill !== null) morceaux.push(`vous empoisonnez ${nom(envoye.kill)}`);
  if (morceaux.length === 0) return 'Vous ne faites rien cette nuit.';
  const phrase = morceaux.join(', et ');
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}.`;
}
