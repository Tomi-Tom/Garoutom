/**
 * Cupidon, la première nuit : deux vivants distincts, lui-même permis (R37).
 *
 * La flèche est double, la sélection aussi : un troisième jeton touché
 * remplace le plus ancien des deux, pour qu'on n'ait jamais à défaire avant
 * de refaire. Les deux choisis portent un lacs provisoire (garance, en
 * pastille). Le lien ne part que du bouton principal de la barre, armé en
 * deux temps — « Confirmer : lier Anna et Étienne » : un pouce qui glisse
 * sur la place ne doit pas sceller deux destins. Sans paire, le principal
 * dit « Choisissez deux vivants » et pose un avis.
 */

import { useState, type ReactNode } from 'react';

import { jouer } from '../../../lib/actions.js';
import { useGame, useNoms, useVoix } from '../../../lib/partie.js';
import { Bouton } from '../../caprices/index.js';
import { Glyphe } from '../../habit/glyphes.js';
import { BoutonChoisir, Consigne, libelleArme, Pastille, Resume, usePeau } from './commun.js';
import { EcranNuit, PlaceDeNuit } from './EcranNuit.js';
import { textePrompt } from './textes.js';

export function ChoixCupidon() {
  const game = useGame();
  const peau = usePeau();
  const voix = useVoix();
  const nom = useNoms();
  const [paire, setPaire] = useState<readonly number[]>([]);
  const [envoyee, setEnvoyee] = useState<readonly [number, number] | null>(null);
  const [modifier, setModifier] = useState(false);
  if (game === null) return null;
  const moi = game.you;
  // D46 : la vue tait la carte pendant la phase du Voleur — ce prompt ne
  // vit qu'à la nuit, carte connue. Le garde sur le rôle est pour le type.
  if (moi === null || moi.role === null || game.prompt?.kind !== 'cupidon') return null;
  const titre = voix.nomRole(moi.role);

  const vivant = (seat: number) => game.players[seat]?.alive === true;
  const choisir = (seat: number) =>
    setPaire((avant) => (avant.includes(seat) ? avant.filter((s) => s !== seat) : [...avant, seat].slice(-2)));
  const [a, b] = paire;
  const lier = () => {
    if (a === undefined || b === undefined) return;
    setEnvoyee([a, b]);
    setModifier(false);
    void jouer({ type: 'cupidon', a, b });
  };

  const enSelection = !game.acted || modifier;

  if (!enSelection) {
    const lies = envoyee ?? null;
    return (
      <EcranNuit
        testId="nuit-cupidon"
        consigne={
          <Consigne
            titre={titre}
            statut
            texte={`${lies ? `Vous avez lié ${nom(lies[0])} et ${nom(lies[1])}.` : 'Votre flèche est partie.'} Vous pouvez changer tant que l’étape court.`}
          />
        }
        place={<PlaceDeNuit label="La place du village" choisis={lies ?? []} />}
        resume={lies ? <Resume gras={`Vos deux choix : ${nom(lies[0])} et ${nom(lies[1])}`} suite=" · envoyé" /> : null}
        action={
          <Bouton variante="primaire" onClick={() => setModifier(true)}>
            Changer
          </Bouton>
        }
      />
    );
  }

  const annotations: Record<number, ReactNode> = {};
  for (const seat of paire) {
    annotations[seat] = (
      <Pastille ton="serment">
        <Glyphe nom="lie" taille={12} />
        <span className="sr-only">lié·e</span>
      </Pastille>
    );
  }
  const action = a !== undefined && b !== undefined ? `Lier ${nom(a)} et ${nom(b)}` : null;

  return (
    <EcranNuit
      testId="nuit-cupidon"
      consigne={<Consigne titre={titre} texte={textePrompt(peau, game.prompt, nom, moi.seat)} />}
      place={
        <PlaceDeNuit
          label="Choisir deux vivants à lier"
          choisissables={vivant}
          choisis={paire}
          onChoisir={choisir}
          annotations={annotations}
        />
      }
      resume={
        <div aria-live="polite">
          {paire.length === 1 && a !== undefined ? (
            <Resume gras={`Votre choix : ${nom(a)}`} suite="… et qui d’autre ?" />
          ) : a !== undefined && b !== undefined ? (
            <Resume gras={`Vos deux choix : ${nom(a)} et ${nom(b)}`} />
          ) : null}
        </div>
      }
      action={
        action === null ? (
          // Cupidon ne passe pas son tour : sans paire, le principal n'envoie rien, il le dit.
          <BoutonChoisir libelle="Choisissez deux vivants" avis="Touchez deux vivants sur la place, puis confirmez." />
        ) : (
          <Bouton key={action} variante="primaire" arme={{ libelle: libelleArme(action, true), onConfirmer: lier }}>
            {action}
          </Bouton>
        )
      }
    />
  );
}
