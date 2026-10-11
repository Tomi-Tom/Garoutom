/**
 * Le panneau d'action du jour : le `prompt` du moteur traduit en commandes.
 *
 * Quatre prompts vivent de jour — `voter` (élection ou potence), `tirer` (le
 * Chasseur tombé), `successeur` (le capitaine tombé) et `designerVotants` (le
 * Bouc émissaire tombé, R94) — et tous se jouent de la même façon : on touche
 * un jeton de la place, puis on confirme. Le Bouc, seul, en touche plusieurs :
 * son dernier mot désigne au moins un vivant. Le choix
 * en deux temps est voulu : sur une place de dix-huit jetons, un pouce qui
 * glisse ne doit pas envoyer quelqu'un à la potence — et un dernier vote clôt
 * la phase sur-le-champ. Ce qui ne désigne personne (l'abstention, la balle
 * gardée) est un bouton à part entière, jamais un jeton.
 *
 * Les consignes sont celles du skin (`peau.prompts`) ; les libellés des
 * boutons restent neutres, pour valoir dans tous les univers. Le panneau ne
 * dit jamais ce que la vue ne dit pas : sans prompt, il se contente de la
 * phrase de la phase, ou rappelle aux morts qu'il leur reste l'au-delà.
 *
 * L'état du choix vit chez l'écran parent, qui le partage avec la place :
 * `regleDuChoix` dit quels jetons s'allument pour le prompt en cours.
 */

import { useState, type ReactNode } from 'react';

import type { GameView } from '@garoutom/engine';

import { jouer } from '../../lib/actions.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { peauDuSkin } from '../../skins/registre.js';
import { dire, listeDeNoms } from './Narrateur.js';

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

export interface ActionProps {
  /** Le jeton touché sur la place, en attente de confirmation. */
  choix: number | null;
  /** Rend le choix — `null` pour l'effacer une fois l'action partie. */
  onChoix: (seat: number | null) => void;
  /** Les jetons touchés quand le prompt en veut plusieurs (le Bouc émissaire). */
  selection?: readonly number[];
  /** Rend la sélection — vide pour l'effacer une fois l'action partie. */
  onSelection?: (seats: number[]) => void;
  className?: string;
}

/** La première lettre en capitale — « le Bouc émissaire » ouvre une phrase. */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

export function Action({ choix, onChoix, selection = [], onSelection, className = '' }: ActionProps) {
  const game = useGame();
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  const [envoi, setEnvoi] = useState(false);

  if (game === null || game.you === null) return null;

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
  const phases = peau.narrateur.phases;
  const regle = regleDuChoix(game);
  // Un choix devenu caduc (le jeton est tombé entre-temps) ne se confirme pas.
  const cible = choix !== null && regle?.(choix) === true ? choix : null;

  /* --- Sans prompt : la phrase de la phase, ou l'au-delà --- */
  if (prompt === null) {
    if (!game.you.alive) {
      return (
        <Panneau className={className} ton="lune">
          <p className="font-identite text-xl font-bold">Vous êtes mort·e.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--papier-doux)' }}>
            La partie continue sans vous. Vous pouvez encore écrire dans {voix.libelleCanal('morts')} — les
            vivants ne vous lisent plus.
          </p>
        </Panneau>
      );
    }
    const phrase =
      game.phase === 'chasseur'
        ? phases.chasseur
        : game.phase === 'succession'
          ? phases.succession
          : game.phase === 'bouc'
            ? phases.bouc
            : game.phase === 'election'
              ? phases.election
              : phases.jour;
    // Le lendemain du Bouc, seuls ses désignés votent (R94) : les autres le lisent.
    const nonDesigne =
      game.phase === 'jour' && game.you.canVote && game.votants !== null && !game.votants.includes(game.you.seat);
    return (
      <Panneau className={className} ton="lune">
        <p className="text-sm italic" style={{ color: 'var(--lune)' }}>
          {dire(phrase)}
        </p>
        {game.phase === 'jour' && !game.you.canVote && (
          <p className="mt-1 text-sm" style={{ color: 'var(--papier-doux)' }}>
            Vous ne votez plus — mais la place vous entend encore.
          </p>
        )}
        {nonDesigne && (
          <p className="mt-1 text-sm font-bold" data-testid="non-designe" style={{ color: 'var(--papier)' }}>
            {capitale(voix.nomRole('bouc'))} ne vous a pas désigné·e : vous ne votez pas aujourd’hui — mais la
            place vous entend encore.
          </p>
        )}
      </Panneau>
    );
  }

  /* --- Le vote : élection du matin ou potence du soir --- */
  if (prompt.kind === 'voter') {
    const consigne = prompt.election ? peau.prompts.voter.election : peau.prompts.voter.jour;
    const abstenu = game.acted && game.yourVote === null;
    const etat = !game.acted
      ? 'Vous n’avez pas encore voté.'
      : game.yourVote === null
        ? 'Vous vous abstenez.'
        : `Votre voix va à ${nom(game.yourVote)}.`;
    const dejaLa = cible !== null && game.acted && cible === game.yourVote;
    return (
      <Panneau className={className} ton="lanterne">
        <p className="text-sm leading-snug">{dire(consigne)}</p>
        <p className="mt-1 text-sm font-bold" data-testid="etat-vote" style={{ color: 'var(--lanterne)' }}>
          {etat}
        </p>
        <Commandes>
          <button
            type="button"
            className="btn-village"
            disabled={cible === null || dejaLa || envoi}
            onClick={() => cible !== null && void envoyer({ type: 'voter', target: cible })}
          >
            {cible === null
              ? 'Touchez un jeton'
              : prompt.election
                ? `Voter pour ${nom(cible)}`
                : `Voter contre ${nom(cible)}`}
          </button>
          <button
            type="button"
            className="btn-voisin"
            disabled={abstenu || envoi}
            onClick={() => void envoyer({ type: 'voter', target: null })}
          >
            S’abstenir
          </button>
        </Commandes>
      </Panneau>
    );
  }

  /* --- Le Chasseur tombé : une cible, ou la balle gardée --- */
  if (prompt.kind === 'tirer') {
    return (
      <Panneau className={className} ton="sang">
        <p className="text-sm leading-snug">{dire(peau.prompts.tirer)}</p>
        <Commandes>
          <button
            type="button"
            className="btn-village"
            style={{ background: 'var(--sang)', color: 'var(--nuit-creux)' }}
            disabled={cible === null || envoi}
            onClick={() => cible !== null && void envoyer({ type: 'tirer', target: cible })}
          >
            {cible === null ? 'Touchez un jeton' : `Viser ${nom(cible)}`}
          </button>
          <button
            type="button"
            className="btn-voisin"
            disabled={envoi}
            onClick={() => void envoyer({ type: 'tirer', target: null })}
          >
            Ne viser personne
          </button>
        </Commandes>
      </Panneau>
    );
  }

  /* --- Le capitaine tombé : à qui la charge --- */
  if (prompt.kind === 'successeur') {
    return (
      <Panneau className={className} ton="lanterne">
        <p className="text-sm leading-snug">{dire(peau.prompts.successeur)}</p>
        <Commandes>
          <button
            type="button"
            className="btn-village"
            disabled={cible === null || envoi}
            onClick={() => cible !== null && void envoyer({ type: 'successeur', target: cible })}
          >
            {cible === null ? 'Touchez un jeton' : `Désigner ${nom(cible)}`}
          </button>
        </Commandes>
      </Panneau>
    );
  }

  /* --- Le Bouc émissaire tombé : qui votera demain --- */
  if (prompt.kind === 'designerVotants') {
    const designes = selection.filter((seat) => regle?.(seat) === true);
    return (
      <Panneau className={className} ton="lanterne">
        <p className="text-sm leading-snug">{dire(peau.prompts.designerVotants)}</p>
        <p className="mt-1 text-sm font-bold" data-testid="etat-designation" style={{ color: 'var(--lanterne)' }}>
          {designes.length === 0
            ? 'Touchez les jetons de ceux qui voteront demain.'
            : `Voteront demain : ${listeDeNoms(designes.map(nom))}.`}
        </p>
        <Commandes>
          <button
            type="button"
            className="btn-village"
            disabled={designes.length === 0 || envoi}
            onClick={() => designes.length > 0 && void envoyer({ type: 'designerVotants', seats: [...designes] })}
          >
            {designes.length === 0
              ? 'Désignez au moins un vivant'
              : designes.length === 1
                ? 'Confirmer ce votant'
                : `Confirmer ces ${String(designes.length)} votants`}
          </button>
          {designes.length > 0 && (
            <button type="button" className="btn-voisin" disabled={envoi} onClick={() => onSelection?.([])}>
              Tout effacer
            </button>
          )}
        </Commandes>
      </Panneau>
    );
  }

  // Un prompt de nuit n'a rien à faire ici : la nuit a son propre écran.
  return null;
}

function Panneau({
  children,
  className,
  ton,
}: {
  children: ReactNode;
  className: string;
  ton: 'lanterne' | 'sang' | 'lune';
}) {
  return (
    <section
      aria-label="Votre action"
      data-testid="action"
      className={`carte px-4 py-3 ${className}`}
      style={{ borderTop: `3px solid var(--${ton})` }}
    >
      {children}
    </section>
  );
}

function Commandes({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap gap-2">{children}</div>;
}
