/**
 * Le verdict (SPEC Caprices § 5.15 ; maquettes `C-Fin-Verdict`,
 * `C-Fin-Desktop`) : une planche dans sa cuvette. En tête, la légende « Il est
 * l'heure. » (Caprice 80, *Ya es hora*) ; au centre, le **cartouche du
 * vainqueur** en grand (240 × 56, la forme du camp : écu, mordu, lacs,
 * mordu des deux côtés ; « Personne » : l'ovale vide), le verdict du crieur ;
 * puis le sort de ce siège, l'heure où la partie s'est arrêtée, son rôle et
 * les survivants.
 *
 * Les actions de fin (`ActionsFin`) se posent dessous : la cuvette les porte
 * sur desktop ; sur mobile, la barre au pouce porte « Rejouer » et « Quitter
 * la table », et la cuvette les deux portes de la collection.
 */

import { fiche } from '@tombp/arcade';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { GameView, Winner } from '@garoutom/engine';

import { quitterTable, revanche } from '../../../lib/actions.js';
import { ARCADE_ID } from '../../../lib/identity.js';
import { useNoms, useVoix } from '../../../lib/partie.js';
import { useReglages } from '../../../lib/reglages.js';
import { BarrePouce, Bouton, Cuvette, tirageDe } from '../../caprices/index.js';
import { contourCartouche } from '../../caprices/traces.js';
import { Vignette } from '../../habit/Vignette.js';
import type { VerdictSiege } from './verdict.js';

/* ------------------------------------------------------------------ */
/* Le cartouche du vainqueur                                           */
/* ------------------------------------------------------------------ */

const L = 240;
const H = 56;

/** La première lettre en capitale : « la meute » devient « La meute ». */
function capitale(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
}

/**
 * Le cartouche du camp vainqueur, en grand (§ 5.3 à 56 px) : la forme dit le
 * camp, le mot le confirme. Le Loup Blanc, seul, est plein sur papier ; la
 * nuit (réglage « Cuivre »), son plein devient filet, comme au § 5.3.
 */
export function CartoucheVainqueur({ winner, plein }: { winner: Winner; plein: boolean }) {
  const voix = useVoix();
  const mot = capitale(voix.nomVainqueur(winner));
  let forme: ReactNode;
  let couleur = 'var(--encre)';
  let poids = 400;
  switch (winner) {
    case 'village':
      forme = <path d={contourCartouche('ecu', L, H)} fill="var(--surface)" stroke="var(--camp-village)" strokeWidth={1.5} />;
      break;
    case 'loups':
      forme = <path d={contourCartouche('mordu', L, H)} fill="var(--surface)" stroke="var(--camp-meute)" strokeWidth={2} />;
      couleur = 'var(--camp-meute)';
      poids = 600;
      break;
    case 'loupBlanc':
      forme = (
        <path
          d={contourCartouche('mordu2', L, H)}
          fill={plein ? 'var(--camp-meute)' : 'var(--surface)'}
          stroke="var(--camp-meute)"
          strokeWidth={2}
        />
      );
      couleur = plein ? 'var(--sur-encre)' : 'var(--camp-meute)';
      poids = 600;
      break;
    case 'amoureux':
      forme = (
        <>
          <rect x={1} y={1} width={L - 2} height={H - 2} rx={H / 2 - 1} fill="var(--surface)" stroke="var(--camp-serment)" strokeWidth={2} />
          <rect x={4.5} y={4.5} width={L - 9} height={H - 9} rx={H / 2 - 4.5} fill="none" stroke="var(--camp-serment)" strokeWidth={0.9} />
        </>
      );
      couleur = 'var(--camp-serment)';
      break;
    case 'personne':
      forme = (
        <ellipse cx={L / 2} cy={H / 2} rx={L / 2 - 1} ry={H / 2 - 1} fill="var(--surface)" stroke="var(--encre-2)" strokeWidth={1.4} strokeDasharray="3 3" />
      );
      couleur = 'var(--encre-2)';
      break;
  }
  return (
    <span
      data-vainqueur={winner}
      className="relative inline-flex max-w-full items-center justify-center"
      style={{ width: L, height: H }}
    >
      <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${String(L)} ${String(H)}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {forme}
      </svg>
      <span className="relative px-8 text-[20px] leading-6" style={{ color: couleur, fontWeight: poids }}>
        {mot}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Les actions de fin                                                  */
/* ------------------------------------------------------------------ */

/** L'adresse du hub, rouvert sur la cartouche du jeu (le chemin de `LienArcade`). */
const HUB = 'https://arcade.tombp.fr';

/** Partager le verdict : la feuille de partage du téléphone, sinon le presse-papier. */
function usePartage(verdict: string, chiffre: string): { libelle: string; partager: () => void } {
  const [copie, setCopie] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (minuteur.current !== null) clearTimeout(minuteur.current);
    },
    [],
  );
  const partager = () => {
    const f = fiche(ARCADE_ID);
    const texte = `${f.title} — ${verdict} · ${chiffre}\n${f.url ?? HUB}`;
    const partageNatif = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
    if (partageNatif) {
      void partageNatif.call(navigator, { title: f.title, text: texte }).catch(() => undefined);
      return;
    }
    void navigator.clipboard?.writeText(texte).then(() => {
      setCopie(true);
      minuteur.current = setTimeout(() => setCopie(false), 2000);
    });
  };
  return { libelle: copie ? 'Copié' : 'Partager', partager };
}

const RAISON_HOTE = 'L’hôte peut relancer une revanche.';

/**
 * Les actions de la fin — les trois de la collection, **dans leur ordre** :
 * Rejouer (l'hôte seul : la revanche se lance pour toute la table) ·
 * L'arcade · Partager ; puis celle du jeu, Quitter la table.
 *
 * - `grille` (desktop) : les quatre en deux colonnes, au pied du verdict ;
 * - `barre` (mobile) : la barre au pouce, « Quitter la table » et
 *   « Rejouer » sous le pouce ;
 * - `portes` (mobile) : L'arcade et Partager, discrets, dans la cuvette.
 */
export function ActionsFin({
  disposition,
  estHote,
  verdict,
  chiffre,
}: {
  disposition: 'grille' | 'barre' | 'portes';
  estHote: boolean;
  verdict: string;
  chiffre: string;
}) {
  const partage = usePartage(verdict, chiffre);
  const rejouer = estHote ? (
    <Bouton variante="primaire" onClick={() => void revanche()}>
      Rejouer
    </Bouton>
  ) : null;
  const quitter = (
    <Bouton variante="secondaire" onClick={() => void quitterTable()}>
      Quitter la table
    </Bouton>
  );
  const arcade = (variante: 'secondaire' | 'discret') => (
    <a className={`bouton bouton-${variante}`} href={`${HUB}/#${ARCADE_ID}`} title="Retour à l’arcade">
      L’arcade
    </a>
  );
  const partager = (variante: 'secondaire' | 'discret') => (
    <Bouton variante={variante} onClick={partage.partager}>
      {partage.libelle}
    </Bouton>
  );

  switch (disposition) {
    case 'barre':
      return (
        <BarrePouce raison={estHote ? undefined : RAISON_HOTE}>
          {quitter}
          {rejouer}
        </BarrePouce>
      );
    case 'portes':
      return (
        <nav aria-label="La collection" className="mt-3 flex items-center justify-center gap-4">
          {arcade('discret')}
          {partager('discret')}
        </nav>
      );
    case 'grille':
      return (
        <nav aria-label="Fin de partie" className="mt-8 w-full">
          <div className="grid grid-cols-2 gap-2">
            {rejouer}
            {arcade('secondaire')}
            {partager('secondaire')}
            {quitter}
          </div>
          {!estHote && <p className="t-statut m-0 mt-2 text-center">{RAISON_HOTE}</p>}
        </nav>
      );
  }
}

/* ------------------------------------------------------------------ */
/* La planche du verdict                                               */
/* ------------------------------------------------------------------ */

export function Verdict({
  game,
  sort,
  chiffre,
  actions,
}: {
  game: GameView;
  sort: VerdictSiege;
  chiffre: string;
  actions: ReactNode;
}) {
  const voix = useVoix();
  const noms = useNoms();
  const { tirage: reglage } = useReglages();
  const vivants = game.players.filter((joueur) => joueur.alive);

  const ligneRole =
    game.you === null
      ? 'Vous suivez la table en spectateur.'
      : `Vous étiez ${voix.nomRole(game.you.role)}, ${game.you.alive ? 'debout à la fin' : 'tombé·e avant la fin'}.`;
  const ligneSurvivants =
    vivants.length === 0
      ? 'Personne ne reste debout.'
      : `${String(vivants.length)} ${vivants.length > 1 ? 'survivants' : 'survivant'} sur ${String(game.players.length)} : ${vivants.map((joueur) => noms(joueur.seat)).join(', ')}`;

  return (
    <section aria-labelledby="fin-verdict">
      <Cuvette className="flex flex-col items-center px-5 py-6 text-center lg:px-7 lg:py-7">
        {/* Sans région vive, la fin est muette pour un lecteur d'écran. */}
        <p role="status" className="sr-only">
          {sort.phrase} · {chiffre}
        </p>
        <p className="t-legende m-0 text-[20px] leading-7">« {voix.legendeEcran('fin')} »</p>
        <span className="mt-3.5 max-lg:hidden">
          <Vignette nom="sablier" />
        </span>
        {game.winner !== null && (
          <span className="mt-5 max-w-full">
            <CartoucheVainqueur winner={game.winner} plein={tirageDe('fin', reglage) === 'papier'} />
          </span>
        )}
        <p className="t-jeu m-0 mt-[18px]">{voix.phraseFin(game.winner ?? 'personne')}</p>
        <h1 id="fin-verdict" className="t-titre m-0 mt-[18px]">
          {sort.phrase}
        </h1>
        <p className="t-rubrique m-0 mt-1 text-encre-2">{chiffre}</p>
        <p className="t-corps m-0 mt-3 text-encre-2">
          <span className="block">{ligneRole}</span>
          <span className="block">{ligneSurvivants}</span>
        </p>
        {actions}
      </Cuvette>
    </section>
  );
}

