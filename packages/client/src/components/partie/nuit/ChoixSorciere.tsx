/**
 * La Sorcière, seule en scène (R36, R42–R44), dans le gabarit unique.
 *
 * La consigne nomme la victime de la meute — ou son absence ; sur la place,
 * la victime porte la pastille « victime » ; le résumé tient les deux fioles
 * (« Vie : 1 · Mort : 1 », « Vie : épuisée »). Le bouton principal de la
 * barre (à droite de « ma carte », comme chez tous) dit exactement ce qui
 * partira :
 *
 * - rien de touché : « Ne rien faire » ;
 * - toucher la victime (si la vie reste et que la table le permet,
 *   `peutSeSauver`) : « Sauver Fanny » ; la toucher à nouveau y renonce ;
 * - toucher un autre jeton (tant que la mort reste) : « Empoisonner Léa » ;
 *   les deux se cumulent : « Sauver Fanny et empoisonner Léa ».
 *
 * Tout s'arme en deux temps, et le libellé armé le dit : « Confirmer — sans
 * retour : … » — son choix clôt l'étape sur-le-champ (`settle`).
 */

import type { GameView, Prompt, RoleId } from '@garoutom/engine';
import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { Icone } from '../../habit/Icone.js';
import { BoutonFermerLesYeux, Consigne, libelleArme, Pastille, Resume, usePeau } from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { textePrompt } from './textes.js';

export function ChoixSorciere() {
  const game = useGame();
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la nuit, carte connue. Le garde sur le rôle est pour le type,
  // et le type de la prop le porte à la sous-composante.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'sorciere') return null;
  // Le garde a fait le tri : la carte est connue, la prop le dit au type.
  return <Sorciere game={game} moi={{ ...moi, role: moi.role }} prompt={game.prompt} />;
}

type PromptSorciere = Extract<Prompt, { kind: 'sorciere' }>;

function Sorciere({
  game,
  moi,
  prompt,
}: {
  game: GameView;
  /** La Sorcière, carte connue : le garde de D46 a déjà fait le tri. */
  moi: NonNullable<GameView['you']> & { role: RoleId };
  prompt: PromptSorciere;
}) {
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const [sauverTouche, setSauverTouche] = useState(false);
  const [poison, setPoison] = useState<number | null>(null);
  const [envoye, setEnvoye] = useState<{ save: boolean; kill: number | null } | null>(null);

  const victime = prompt.victim;
  const peutSauver = prompt.vie && victime !== null && prompt.peutSeSauver;
  // Rien n'est versé tant qu'elle n'a pas touché la victime.
  const sauver = peutSauver && sauverTouche;
  const vivant = (seat: number) => game.players[seat]?.alive === true;

  const envoyer = (save: boolean, kill: number | null) => {
    setEnvoye({ save, kill });
    void jouer({ type: 'sorciere', save, kill });
  };

  // Le récapitulatif attend la vue : un refus du serveur laisse la main.
  const fait = game.acted;

  const choisissable = (seat: number) =>
    !fait && vivant(seat) && (prompt.mort || (peutSauver && seat === victime));
  const choisir = (seat: number) => {
    if (peutSauver && seat === victime) setSauverTouche(!sauver);
    else if (prompt.mort) setPoison((avant) => (avant === seat ? null : seat));
  };

  const annotations: Record<number, ReactNode> =
    victime === null ? {} : { [victime]: <Pastille>{sauver ? 'sauvé·e' : 'victime'}</Pastille> };

  const morceaux: string[] = [];
  if (sauver && victime !== null) morceaux.push(`sauver ${nom(victime)}`);
  if (poison !== null) morceaux.push(`empoisonner ${nom(poison)}`);
  const action = morceaux.length === 0 ? null : capitale(morceaux.join(' et '));

  const fioles = (
    <Resume
      icone={<Icone nom={prompt.vie ? 'vie' : 'vie-epuisee'} className="size-4" />}
      gras={`Vie : ${prompt.vie ? '1' : 'épuisée'}`}
      suite={
        <>
          <span aria-hidden="true">·</span>
          <span className="flex text-encre">
            <Icone nom={prompt.mort ? 'mort' : 'mort-epuisee'} className="size-4" />
          </span>
          <b className="font-semibold text-encre">{`Mort : ${prompt.mort ? '1' : 'épuisée'}`}</b>
        </>
      }
    />
  );

  return (
    <EcranNuit
      testId="nuit-sorciere"
      consigne={
        fait ? (
          <Consigne titre={voix.nomRole(moi.role)} statut texte={`${resume(envoye, nom, victime)} Rendormez-vous.`} />
        ) : (
          <Consigne titre={voix.nomRole(moi.role)} texte={textePrompt(peau, prompt, nom, moi.seat)} />
        )
      }
      place={
        <PlaceDeNuit
          label={prompt.mort ? 'Choisir qui empoisonner' : 'La place du village'}
          choisissables={choisissable}
          choisis={[...(sauver && victime !== null ? [victime] : []), ...(poison === null ? [] : [poison])]}
          onChoisir={choisir}
          annotations={annotations}
        />
      }
      resume={fioles}
      action={
        fait ? (
          <BoutonFermerLesYeux />
        ) : action === null ? (
          <Bouton
            key="rien"
            variante="primaire"
            arme={{ libelle: libelleArme('Ne rien faire', false), onConfirmer: () => envoyer(false, null) }}
          >
            Ne rien faire
          </Bouton>
        ) : (
          <Bouton
            key={action}
            variante="primaire"
            arme={{ libelle: libelleArme(action, false), onConfirmer: () => envoyer(sauver, poison) }}
          >
            {action}
          </Bouton>
        )
      }
    />
  );
}

function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
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
  return `${capitale(morceaux.join(', et '))}.`;
}
