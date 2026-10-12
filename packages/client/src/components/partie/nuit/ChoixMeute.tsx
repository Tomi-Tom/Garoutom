/**
 * La meute : dévorer — et voir les siens voter.
 *
 * Chaque loup vote pour un vivant qui n'est pas des leurs, ou s'abstient, et
 * peut changer d'avis tant que l'étape court (R40). Le bouton principal de la
 * barre dit « Ne viser personne » tant que rien n'est touché ; il touche un
 * jeton, le principal devient « Dévorer Fanny » (toucher le jeton à nouveau
 * le rend au silence) — l'un et l'autre armés en deux temps (P0-6). La barre
 * a ainsi deux boutons, comme chez tous. La meute voit les voix se poser en temps
 * réel (`pack.votes`) : sur le jeton visé, une pastille aux initiales des
 * loups (« B·O ») — le seul endroit où la craie paraît, en texte de 12 px —
 * et dans le résumé, la cible qui mène. Le fil de la meute est derrière le
 * pli « La meute ».
 *
 * **Aucune teinte de surface** (N2) : l'écran de la meute est, à un mètre,
 * celui du village qui dort. Ses complices sont seulement non choisissables
 * (état 15) — rien d'autre ne les distingue.
 *
 * Seules comptent les voix des loups vivants (R41) : la liste et les
 * pastilles ne montrent qu'eux.
 */

import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { Consigne, libelleArme, Pastille, Resume, usePeau } from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { textePrompt } from './textes.js';

/**
 * Les initiales des loups (« B·O ») : la première lettre, et autant de
 * lettres de plus qu'il en faut pour départager deux loups (trois au plus).
 */
function initialesDe(loups: readonly number[], nom: (seat: number) => string): Map<number, string> {
  const prefixe = (seat: number, n: number) => {
    const pseudo = nom(seat).trim();
    return pseudo.charAt(0).toLocaleUpperCase('fr') + pseudo.slice(1, n);
  };
  const resultat = new Map<number, string>();
  for (const loup of loups) {
    let n = 1;
    while (n < 3 && loups.some((autre) => autre !== loup && prefixe(autre, n) === prefixe(loup, n))) n += 1;
    resultat.set(loup, prefixe(loup, n));
  }
  return resultat;
}

export function ChoixMeute() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  // `undefined` : rien touché depuis le dernier envoi — le choix suit la voix envoyée.
  const [touche, setTouche] = useState<number | null | undefined>(undefined);
  if (game?.you == null || game.prompt?.kind !== 'devorer') return null;
  const moi = game.you;

  const meute = game.pack?.seats ?? [moi.seat];
  const votes = game.pack?.votes ?? {};
  const vivants = meute.filter((seat) => game.players[seat]?.alive === true);
  const monVote: number | null | undefined = votes[moi.seat];
  const choix = touche !== undefined ? touche : typeof monVote === 'number' ? monVote : null;

  const choisissable = (seat: number) => game.players[seat]?.alive === true && !meute.includes(seat);
  const devorer = (target: number | null) => {
    setTouche(undefined);
    void jouer({ type: 'devorer', target });
  };

  // Les voix des loups vivants, par cible.
  const parCible = new Map<number, number[]>();
  for (const loup of vivants) {
    const cible = votes[loup];
    if (cible === undefined || cible === null) continue;
    parCible.set(cible, [...(parCible.get(cible) ?? []), loup]);
  }
  const initiales = initialesDe(vivants, nom);
  const annotations: Record<number, ReactNode> = {};
  for (const [cible, loups] of parCible) {
    annotations[cible] = (
      <Pastille ton="meute">
        {loups.map((loup) => initiales.get(loup)).join('·')}
        <span className="sr-only">{` : ${loups.map((loup) => (loup === moi.seat ? 'vous' : nom(loup))).join(', ')}`}</span>
      </Pastille>
    );
  }
  // La cible qui mène : « la meute : Fanny (2) ».
  const enTete = [...parCible.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];

  const action = choix === null ? null : `Dévorer ${nom(choix)}`;
  const gras =
    choix !== null
      ? `${choix === monVote ? 'Votre voix' : 'Votre choix'} : ${nom(choix)}`
      : monVote === null
        ? 'Vous laissez le village dormir'
        : undefined;

  return (
    <EcranNuit
      testId="nuit-meute"
      meute
      consigne={<Consigne titre={voix.nomRole(moi.role)} texte={textePrompt(peau, game.prompt, nom, moi.seat)} />}
      place={
        <PlaceDeNuit
          label="Choisir qui dévorer cette nuit"
          choisissables={choisissable}
          choisis={choix === null ? [] : [choix]}
          onChoisir={(seat) => setTouche(choix === seat ? null : seat)}
          annotations={annotations}
        />
      }
      apresPlace={
        // Les voix de la meute, dites aux lecteurs d'écran : les pastilles de la place sont muettes.
        <section aria-label={voix.nomCamp('loups')} className="sr-only">
          <ul>
            {vivants.map((loup) => {
              const cible = votes[loup];
              return (
                <li key={loup}>
                  <span>
                    {nom(loup)}
                    {loup === moi.seat ? ' (vous)' : ''}
                  </span>{' '}
                  <span>
                    {cible === undefined ? 'n’a pas encore choisi' : cible === null ? 's’abstient' : `vise ${nom(cible)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      }
      resume={
        <Resume
          {...(gras === undefined ? {} : { gras })}
          {...(enTete === undefined ? {} : { suite: ` · la meute : ${nom(enTete[0])} (${String(enTete[1].length)})` })}
        />
      }
      action={
        action === null || choix === null ? (
          // Rien de touché (ou le jeton choisi touché à nouveau) : le silence de la meute, en deux temps.
          <Bouton
            key="personne"
            variante="primaire"
            aria-pressed={monVote === null}
            arme={{ libelle: libelleArme('Ne viser personne', true), onConfirmer: () => devorer(null) }}
          >
            Ne viser personne
          </Bouton>
        ) : (
          <Bouton
            key={choix}
            variante="primaire"
            arme={{ libelle: libelleArme(action, true), onConfirmer: () => devorer(choix) }}
          >
            {action}
          </Bouton>
        )
      }
    />
  );
}
