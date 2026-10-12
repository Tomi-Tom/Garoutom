/**
 * L'action du jour : le `prompt` du moteur traduit en trois zones du gabarit
 * (SPEC § 5.5, § 7.1) — la **consigne**, la ligne de **résumé**
 * (« Votre voix : Anna · modifiable » · « 6 sur 10 ») et la **barre au
 * pouce** (primaire + secondaire, 48 px, collée en bas).
 *
 * Quatre prompts vivent de jour — `voter` (élection ou potence), `tirer` (le
 * Chasseur tombé), `successeur` (le capitaine tombé) et `designerVotants` (le
 * Bouc émissaire tombé, R94). Tous se jouent de la même façon : on touche un
 * jeton de la place, puis on confirme **en deux temps** (P0-6) — le premier
 * toucher arme le bouton (« Confirmer : Anna à la potence »), le second dans
 * les 4 s envoie. Ce qui ne désigne personne (s'abstenir, tirer en l'air) est
 * un bouton à part entière, armé lui aussi, jamais un jeton. Le vote se
 * refait tant que la phase court : pas d'« annuler ». Ce qui est sans retour
 * (le tir, la transmission, le dernier mot) le dit : « Confirmer — sans
 * retour : … ».
 *
 * Qui n'a rien à jouer lit la **légende** du graveur à la place de la
 * consigne, et garde dans la barre l'appui long « ma carte » — ou, s'il ne
 * vote pas, le bouton éteint et sa raison (la grâce, le Bouc).
 *
 * L'état du choix vit chez l'écran parent, qui le partage avec la place :
 * `regleDuChoix` dit quels jetons s'allument pour le prompt en cours.
 */

import { useId, useState, type ReactNode } from 'react';

import type { GameView } from '@garoutom/engine';

import { BarrePouce, Bouton } from '../caprices/index.js';
import { jouer } from '../../lib/actions.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { peauDuSkin, type CleLegendeEcran } from '../../skins/registre.js';
import { dire, listeDeNoms } from './Narrateur.js';
import { MaCarte } from './MaCarte.js';

/**
 * Les jetons qu'un prompt de jour permet de désigner — ou `undefined` quand
 * rien n'est à désigner. Les règles sont celles du moteur, rien de plus :
 * l'élection admet le vote pour soi (R56), la potence non (R60), le Chasseur
 * ne se vise pas (R65), le capitaine mort transmet à un vivant (R58).
 */
export function regleDuChoix(game: GameView): ((seat: number) => boolean) | undefined {
  const prompt = game.prompt;
  const moi = game.you?.seat ?? null;
  if (prompt === null || moi === null) return undefined;
  const vivant = (seat: number) => game.players[seat]?.alive === true;
  switch (prompt.kind) {
    case 'voter':
      return prompt.election ? vivant : (seat) => vivant(seat) && seat !== moi;
    case 'tirer':
    case 'successeur':
      return (seat) => vivant(seat) && seat !== moi;
    case 'designerVotants':
      // Tout vivant peut être désigné ; le Bouc, lui, est déjà tombé.
      return vivant;
    default:
      return undefined;
  }
}

/**
 * Qui vote, et combien l'ont fait. L'élection appelle tous les vivants
 * (R56) ; la potence, les vivants qui votent encore — l'Idiot gracié n'en
 * est plus (R60) —, et seulement ceux que le Bouc émissaire a désignés (R94).
 * `voted` ne dit pas pour qui : le résumé non plus.
 */
export function compteDesVotes(game: GameView): { ont: number; sur: number } | null {
  if (game.phase !== 'jour' && game.phase !== 'election') return null;
  const designes = game.phase === 'jour' ? game.votants : null;
  const votants = game.players.filter(
    (p) => p.alive && (game.phase === 'election' || (p.canVote && (designes === null || designes.includes(p.seat)))),
  );
  return { ont: game.voted.length, sur: votants.length };
}

/** La marque du Corbeau, tant que le siège marqué vit (R93). */
export function marqueDuJour(game: GameView): number | null {
  const marque = game.marque;
  return marque !== null && game.players[marque]?.alive === true ? marque : null;
}

/** Les seuls votants du jour, quand le Bouc les a désignés ; `null` : tout le monde. */
export function votantsDuJour(game: GameView): readonly number[] | null {
  return game.phase === 'jour' ? game.votants : null;
}

export interface ActionProps {
  /** Le jeton touché sur la place, en attente de confirmation. */
  choix: number | null;
  /** Rend le choix — `null` pour l'effacer une fois l'action partie. */
  onChoix: (seat: number | null) => void;
  /** Les jetons touchés quand le prompt en veut plusieurs (le Bouc émissaire). */
  selection?: readonly number[];
  /** Rend la sélection — vide pour l'effacer une fois l'action partie. */
  onSelection?: (seats: number[]) => void;
}

/** Les trois zones que l'action remplit dans le gabarit. */
export interface ZonesAction {
  consigne: ReactNode;
  resume: ReactNode;
  barre: ReactNode;
}

/** La première lettre en capitale — « le Bouc émissaire » ouvre une phrase. */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

/** La consigne du rôle (`--t-jeu`, trois lignes au plus). */
function Consigne({ children }: { children: ReactNode }) {
  return (
    <p data-testid="consigne" className="t-jeu m-0 line-clamp-3 w-full max-[359px]:line-clamp-2">
      {children}
    </p>
  );
}

/** La légende du graveur, à la place de la consigne chez qui n'a rien à faire. */
export function LegendeDuGraveur({ texte }: { texte: string }) {
  return (
    <p data-testid="consigne" data-legende="" className="t-legende m-0 line-clamp-2 w-full text-center text-[var(--encre-narrateur)]">
      « {texte} »
    </p>
  );
}

/** La ligne de résumé : à gauche ce qu'on a fait, à droite le compte. */
function Resume({ gauche, droite }: { gauche?: ReactNode; droite?: ReactNode }) {
  return (
    <div data-testid="resume" className="flex h-full items-center justify-between gap-3 text-[16px] leading-6 whitespace-nowrap">
      <span className="min-w-0 truncate">{gauche}</span>
      {droite}
    </div>
  );
}

/** « 6 sur 10 », et pour les lecteurs d'écran ce qui ne se voit que sur la place. */
function Compte({ game }: { game: GameView }) {
  const voix = useVoix();
  const nom = useNoms();
  const compte = compteDesVotes(game);
  if (compte === null) return null;
  const marque = marqueDuJour(game);
  const designes = votantsDuJour(game);
  return (
    <span data-testid="barre-vote" className="shrink-0" style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
      {String(compte.ont)} sur {String(compte.sur)}
      <span className="sr-only"> {compte.ont > 1 ? 'ont voté' : 'a voté'}</span>
      {/* La marque et les votants se lisent sur les jetons et dans le crieur ;
          les lecteurs d'écran les entendent ici, au compte du vote. */}
      {marque !== null && (
        <span data-testid="explication-marque" className="sr-only">
          {' '}
          {capitale(voix.nomRole('corbeau'))} a marqué {nom(marque)} : deux voix d’office au vote du jour.
        </span>
      )}
      {designes !== null && (
        <span data-testid="explication-votants" className="sr-only">
          {' '}
          {capitale(voix.nomRole('bouc'))} a parlé : seuls votent {listeDeNoms(designes.map(nom))}.
        </span>
      )}
    </span>
  );
}

/** La barre de qui n'a rien à jouer : sa carte, à l'appui long. */
function BarreMaCarte() {
  return (
    <BarrePouce>
      <MaCarte declencheur="barre" />
    </BarrePouce>
  );
}

/** L'action du jour, en trois zones. */
export function useActionDuJour({ choix, onChoix, selection = [], onSelection }: ActionProps): ZonesAction | null {
  const game = useGame();
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  const [envoi, setEnvoi] = useState(false);
  const raison = useId();

  if (game === null) return null;

  const compte = <Compte game={game} />;
  const legende = (cle: CleLegendeEcran) => <LegendeDuGraveur texte={voix.legendeEcran(cle)} />;
  const cleDuMoment: CleLegendeEcran =
    game.phase === 'chasseur'
      ? 'chasseurAttente'
      : game.phase === 'succession'
        ? 'succession'
        : game.phase === 'bouc'
          ? 'boucDernierMot'
          : game.phase === 'election'
            ? 'election'
            : 'vote';

  /* --- Le spectateur : la place, rien d'autre --- */
  if (game.you === null) {
    return {
      consigne: legende(cleDuMoment),
      resume: <Resume droite={compte} />,
      barre: (
        <div className="barre-pouce">
          <p className="t-statut m-0 text-center">Vous regardez la partie depuis le bord de la place.</p>
        </div>
      ),
    };
  }

  const moi = game.you;
  const envoyer = async (action: Parameters<typeof jouer>[0]) => {
    setEnvoi(true);
    try {
      await jouer(action);
    } finally {
      setEnvoi(false);
      onChoix(null);
      onSelection?.([]);
    }
  };
  const prompt = game.prompt;
  const regle = regleDuChoix(game);
  // Un choix devenu caduc (le jeton est tombé entre-temps) ne se confirme pas.
  const cible = choix !== null && regle?.(choix) === true ? choix : null;

  /* --- Sans prompt : la légende, et sa carte sous le pouce --- */
  if (prompt === null) {
    if (!moi.alive) {
      const jourDeVote = game.phase === 'jour' || game.phase === 'election';
      return {
        consigne: legende('mort'),
        resume: <Resume gauche={jourDeVote ? <span className="t-statut">Les morts ne votent pas.</span> : null} droite={compte} />,
        barre: <BarreMaCarte />,
      };
    }
    if (game.phase === 'jour') {
      // L'Idiot gracié ne vote plus (R60) ; le lendemain du Bouc, seuls ses désignés votent (R94).
      const gracie = !moi.canVote;
      const nonDesigne = !gracie && game.votants !== null && !game.votants.includes(moi.seat);
      if (gracie || nonDesigne) {
        return {
          consigne: gracie ? <LegendeDuGraveur texte={voix.legendeRole('idiot')} /> : legende('boucDernierMot'),
          resume: (
            <Resume
              gauche={
                <span id={raison} data-testid={gracie ? 'gracie' : 'non-designe'} className="t-statut">
                  {gracie
                    ? 'La grâce vous a coûté votre voix.'
                    : `${capitale(voix.nomRole('bouc'))} ne vous a pas désigné·e.`}
                </span>
              }
              droite={compte}
            />
          ),
          barre: (
            <BarrePouce>
              <Bouton variante="primaire" icone="voter" disabled aria-describedby={raison}>
                Voter
              </Bouton>
            </BarrePouce>
          ),
        };
      }
    }
    return { consigne: legende(cleDuMoment), resume: <Resume droite={compte} />, barre: <BarreMaCarte /> };
  }

  /* --- Le vote : élection du matin ou potence du soir --- */
  if (prompt.kind === 'voter') {
    const election = prompt.election;
    const consigne = election ? peau.prompts.voter.election : peau.prompts.voter.jour;
    const abstenu = game.acted && game.yourVote === null;
    const dejaLa = cible !== null && game.acted && cible === game.yourVote;
    const montre = cible ?? (game.acted ? game.yourVote : null);
    const enAttente = cible !== null && !dejaLa;
    const etat =
      montre !== null ? (
        <>
          Votre voix : <b className="font-semibold">{nom(montre)}</b>
          <span className="text-[12px] text-[var(--encre-2)]">{enAttente ? ' · à confirmer' : ' · modifiable'}</span>
        </>
      ) : abstenu ? (
        <>
          Vous vous abstenez.<span className="text-[12px] text-[var(--encre-2)]"> · modifiable</span>
        </>
      ) : (
        <span className="t-statut">Touchez un jeton pour choisir.</span>
      );
    const libelle =
      cible === null ? (election ? 'Élire…' : 'Voter contre…') : election ? `Élire ${nom(cible)}` : `Voter contre ${nom(cible)}`;
    return {
      consigne: <Consigne>{dire(consigne)}</Consigne>,
      resume: (
        <Resume
          gauche={
            <span id={raison} data-testid="etat-vote">
              {etat}
            </span>
          }
          droite={compte}
        />
      ),
      barre: (
        <BarrePouce>
          <Bouton
            variante="secondaire"
            icone="abstention"
            disabled={abstenu || envoi}
            arme={{ libelle: 'Confirmer l’abstention', onConfirmer: () => void envoyer({ type: 'voter', target: null }) }}
          >
            S’abstenir
          </Bouton>
          <Bouton
            variante="primaire"
            icone="voter"
            disabled={cible === null || dejaLa || envoi}
            aria-describedby={cible === null || dejaLa ? raison : undefined}
            arme={
              cible === null
                ? undefined
                : {
                    libelle: election ? `Confirmer : élire ${nom(cible)}` : `Confirmer : ${nom(cible)} à la potence`,
                    onConfirmer: () => void envoyer({ type: 'voter', target: cible }),
                  }
            }
          >
            {libelle}
          </Bouton>
        </BarrePouce>
      ),
    };
  }

  /* --- Le Chasseur tombé : une cible, ou en l'air --- */
  if (prompt.kind === 'tirer') {
    return {
      consigne: <Consigne>{dire(peau.prompts.tirer)}</Consigne>,
      resume: (
        <Resume
          gauche={
            <span id={raison}>
              {cible === null ? (
                <span className="t-statut">Touchez un jeton pour viser.</span>
              ) : (
                <>
                  Votre balle : <b className="font-semibold">{nom(cible)}</b>
                </>
              )}
            </span>
          }
        />
      ),
      barre: (
        <BarrePouce>
          <Bouton
            variante="secondaire"
            disabled={envoi}
            arme={{ libelle: 'Confirmer — sans retour : tirer en l’air', onConfirmer: () => void envoyer({ type: 'tirer', target: null }) }}
          >
            Tirer en l’air
          </Bouton>
          <Bouton
            variante="danger"
            icone="viser"
            disabled={cible === null || envoi}
            aria-describedby={cible === null ? raison : undefined}
            arme={
              cible === null
                ? undefined
                : {
                    libelle: `Confirmer — sans retour : tirer sur ${nom(cible)}`,
                    onConfirmer: () => void envoyer({ type: 'tirer', target: cible }),
                  }
            }
          >
            {cible === null ? 'Tirer sur…' : `Tirer sur ${nom(cible)}`}
          </Bouton>
        </BarrePouce>
      ),
    };
  }

  /* --- Le capitaine tombé : à qui le brassard --- */
  if (prompt.kind === 'successeur') {
    return {
      consigne: <Consigne>{dire(peau.prompts.successeur)}</Consigne>,
      resume: (
        <Resume
          gauche={
            <span id={raison}>
              {cible === null ? (
                <span className="t-statut">Touchez un jeton pour transmettre.</span>
              ) : (
                <>
                  Votre choix : <b className="font-semibold">{nom(cible)}</b>
                </>
              )}
            </span>
          }
        />
      ),
      barre: (
        <BarrePouce>
          <Bouton
            variante="danger"
            icone="brassard"
            disabled={cible === null || envoi}
            aria-describedby={cible === null ? raison : undefined}
            arme={
              cible === null
                ? undefined
                : {
                    libelle: `Confirmer — sans retour : transmettre le brassard à ${nom(cible)}`,
                    onConfirmer: () => void envoyer({ type: 'successeur', target: cible }),
                  }
            }
          >
            {cible === null ? 'Transmettre…' : `Transmettre à ${nom(cible)}`}
          </Bouton>
        </BarrePouce>
      ),
    };
  }

  /* --- Le Bouc émissaire tombé : qui votera demain --- */
  if (prompt.kind === 'designerVotants') {
    const designes = selection.filter((seat) => regle?.(seat) === true);
    const n = designes.length;
    const quoi = n === 1 ? 'ce votant' : `ces ${String(n)} votants`;
    return {
      consigne: <Consigne>{dire(peau.prompts.designerVotants)}</Consigne>,
      resume: (
        <Resume
          gauche={
            <span id={raison} data-testid="etat-designation">
              {n === 0 ? (
                <span className="t-statut">Touchez les jetons de ceux qui voteront demain.</span>
              ) : (
                `${String(n)} ${n > 1 ? 'votants' : 'votant'} : ${listeDeNoms(designes.map(nom))}`
              )}
            </span>
          }
        />
      ),
      barre: (
        <BarrePouce>
          {n > 0 && (
            <Bouton variante="secondaire" disabled={envoi} onClick={() => onSelection?.([])}>
              Tout effacer
            </Bouton>
          )}
          <Bouton
            variante="danger"
            disabled={n === 0 || envoi}
            aria-describedby={n === 0 ? raison : undefined}
            arme={
              n === 0
                ? undefined
                : {
                    libelle: `Confirmer — sans retour : désigner ${quoi}`,
                    onConfirmer: () => void envoyer({ type: 'designerVotants', seats: [...designes] }),
                  }
            }
          >
            {n === 0 ? 'Désignez au moins un vivant' : `Désigner ${quoi}`}
          </Bouton>
        </BarrePouce>
      ),
    };
  }

  // Un prompt de nuit n'a rien à faire ici : la nuit a son propre écran.
  return { consigne: legende(cleDuMoment), resume: <Resume droite={compte} />, barre: <BarreMaCarte /> };
}
