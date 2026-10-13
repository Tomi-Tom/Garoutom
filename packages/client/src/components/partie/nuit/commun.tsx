/**
 * Ce que tous les écrans de la nuit partagent : la peau du skin, la consigne,
 * la ligne de résumé, la pastille posée sur un jeton, la mention des
 * pouvoirs éteints.
 *
 * Rien ici ne décide de ce qu'un siège a le droit de voir : la `GameView` l'a
 * déjà fait. Ces briques ne font que l'habiller — et toujours de la même
 * façon pour tous (loi N1) : aucune teinte de rôle, aucune lueur, aucune
 * animation qui dépendrait de qui joue (N2, N6). La craie de la meute ne
 * paraît qu'en texte de 12 px, dans une pastille posée sur la place.
 */

import type { RoleId } from '@garoutom/engine';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useSkinId, useVoix } from '../../../lib/partie.js';
import { useStore } from '../../../lib/store.js';
import { peauDuSkin, type Skin } from '../../../skins/registre.js';
import { Bouton } from '../../caprices/index.js';

/** Le temps des yeux fermés : l'écran tombe au palier IV, puis revient. */
const YEUX_FERMES_MS = 3_000;

/**
 * « Fermer les yeux » — le bouton principal de qui n'a rien à jouer (le
 * dormeur, le mort, le spectateur, et l'acteur dont le choix est parti sans
 * retour). Aucun effet de jeu : l'écran tombe un instant au palier IV, comme
 * on baisse les paupières ; un toucher le rouvre. Il existe pour que la barre
 * ait, chez tous, la même forme : deux boutons (arbitrage du chef, N1).
 */
export function BoutonFermerLesYeux() {
  const [fermes, setFermes] = useState(false);
  useEffect(() => {
    if (!fermes) return;
    const minuteur = setTimeout(() => setFermes(false), YEUX_FERMES_MS);
    return () => clearTimeout(minuteur);
  }, [fermes]);
  return (
    <>
      <Bouton variante="primaire" onClick={() => setFermes(true)}>
        Fermer les yeux
      </Bouton>
      {fermes &&
        createPortal(
          <div
            aria-hidden="true"
            data-testid="yeux-fermes"
            className="fixed inset-0 z-[80] bg-[var(--cp-bistre-900)]"
            onPointerDown={() => setFermes(false)}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * Le bouton principal d'un rôle qui ne peut pas passer son tour (la Voyante,
 * le Salvateur, Cupidon), tant que rien n'est choisi : actif, comme chez tous,
 * mais il n'envoie rien — il pose un avis qui dit quoi faire.
 */
export function BoutonChoisir({ libelle, avis }: { libelle: string; avis: string }) {
  return (
    <Bouton variante="primaire" onClick={() => useStore.getState().pushNotice(avis)}>
      {libelle}
    </Bouton>
  );
}

/**
 * La ligne de résumé avec, à droite, un outil au pouce — l'appui long
 * « Carnet » de la Voyante : il vit ici, hors de la barre, pour que la barre
 * garde chez tous ses deux boutons.
 */
export function LigneResume({ children, outil }: { children?: ReactNode; outil?: ReactNode }) {
  return (
    <div className="flex h-6 items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {outil}
    </div>
  );
}

/** La table de textes entière du skin réglé — les prompts n'ont pas de méthode dans `Voix`. */
export function usePeau(): Skin {
  return peauDuSkin(useSkinId());
}

const GRAND_ECRAN = '(min-width: 64rem)';

/** Le grand écran (≥ 64 rem) : la colonne droite y est toujours ouverte (SPEC § 7.1). */
export function useGrandEcran(): boolean {
  const [grand, setGrand] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(GRAND_ECRAN).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const liste = window.matchMedia(GRAND_ECRAN);
    const suivre = () => setGrand(liste.matches);
    suivre();
    liste.addEventListener('change', suivre);
    return () => liste.removeEventListener('change', suivre);
  }, []);
  return grand;
}

/** La première lettre en minuscule — « Sonder Anna » devient « Confirmer : sonder Anna ». */
function minuscule(texte: string): string {
  return texte.charAt(0).toLocaleLowerCase('fr') + texte.slice(1);
}

/**
 * Le libellé armé d'une action (§ 5.4, § 5.5) : « Confirmer : sonder Anna » ;
 * quand le moteur ne permet pas de revenir sur le choix (la Sorcière, le Loup
 * Blanc), le libellé le dit — « Confirmer — sans retour : … ».
 */
export function libelleArme(action: string, changeable: boolean): string {
  return `${changeable ? 'Confirmer : ' : 'Confirmer — sans retour : '}${minuscule(action)}`;
}

/**
 * La zone de consigne (§ 7.1, 72 px) : la consigne du rôle en `--t-jeu`, ou,
 * chez qui n'a rien à faire, la **légende** du moment en italique du graveur.
 * Un titre caché nomme l'écran pour les lecteurs d'écran (le nom du rôle, ou
 * la phrase de l'heure) : il ne se voit pas, il ne déplace rien.
 */
export function Consigne({
  titre,
  texte,
  legende,
  statut = false,
}: {
  titre: string;
  texte?: ReactNode;
  legende?: string;
  /** Le récapitulatif d'un choix : la consigne devient un statut (`role="status"`). */
  statut?: boolean;
}) {
  // Les consignes longues (la Sorcière, le Corbeau) passent en 16/18 pour
  // tenir dans les trois lignes de la zone, comme sur les planches.
  const longue = typeof texte === 'string' && texte.length > 110;
  return (
    <div className="flex h-full w-full flex-col justify-center">
      <h2 className="sr-only">{titre}</h2>
      {legende !== undefined ? (
        <p data-testid="consigne-nuit" className="t-legende m-0 text-center">
          « {legende} »
        </p>
      ) : (
        <p
          data-testid="consigne-nuit"
          role={statut ? 'status' : undefined}
          className={`m-0 max-h-[72px] overflow-hidden text-encre ${longue ? 't-corps text-[16px] leading-[18px]' : 't-jeu'}`}
        >
          {texte}
        </p>
      )}
    </div>
  );
}

/**
 * La ligne de résumé (§ 5.5, 24 px) : « **Votre choix : Fanny** · la meute :
 * Fanny (2) » à gauche, un chiffre à droite. Vide, la ligne reste.
 */
export function Resume({
  gras,
  suite,
  droite,
  icone,
  testId,
}: {
  gras?: ReactNode;
  suite?: ReactNode;
  droite?: ReactNode;
  icone?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex h-6 items-center justify-between gap-2 font-corps text-[14px] leading-6 whitespace-nowrap"
    >
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis text-encre-2">
        {icone !== undefined && <span className="flex shrink-0 text-encre">{icone}</span>}
        {gras !== undefined && <b className="font-semibold text-encre">{gras}</b>}
        {suite}
      </span>
      {droite !== undefined && <span className="t-chiffre shrink-0 text-encre">{droite}</span>}
    </div>
  );
}

/**
 * Une pastille posée sur un jeton (§ 5.1.4, état 17) : 18 px de haut, fond
 * `--surface`, filet `--filet`, texte de 12 px. `meute` écrit en craie — le
 * seul endroit où la couleur de la meute paraît la nuit, en texte (N2).
 */
export function Pastille({ children, ton = 'encre' }: { children: ReactNode; ton?: 'encre' | 'meute' | 'serment' }) {
  const couleur = ton === 'meute' ? 'text-meute' : ton === 'serment' ? 'text-serment' : 'text-encre';
  return (
    <span
      className={`inline-flex h-[18px] max-w-full items-center gap-0.5 border border-filet bg-surface px-1 font-corps text-[12px] leading-4 font-semibold whitespace-nowrap ${couleur}`}
    >
      {children}
    </span>
  );
}

/**
 * Les rôles du village qui ont un pouvoir à perdre quand l'Ancien emporte
 * ceux du village (R92, D13). La meute et le Loup Blanc ne perdent rien ; le
 * villageois n'avait rien ; l'Ancien est mort de cette mort-là. Le Renard y
 * entre : la rancune lui coupe le flair (R107). Le Montreur d'Ours, lui, n'y
 * entre pas — sa grogne survit à la rancune, et il n'a jamais rien à jouer
 * (R108, D30).
 */
export const ROLES_A_POUVOIR: ReadonlySet<RoleId> = new Set<RoleId>([
  'voyante',
  'sorciere',
  'chasseur',
  'cupidon',
  'salvateur',
  'idiot',
  'corbeau',
  'bouc',
  'petiteFille',
  'renard',
]);

/**
 * Ce siège vivant a-t-il perdu ses pouvoirs avec l'Ancien ? D46 : pendant la
 * phase du Voleur, la vue tait la carte (`role` null) — une carte inconnue
 * n'a pas de pouvoirs à éteindre, et la rancune de l'Ancien ne frappe jamais
 * avant la première mort.
 */
export function pouvoirsEteints(
  game: { pouvoirsPerdus: boolean; you: { role: RoleId | null; alive: boolean } | null },
): boolean {
  return (
    game.pouvoirsPerdus &&
    game.you !== null &&
    game.you.alive &&
    game.you.role !== null &&
    ROLES_A_POUVOIR.has(game.you.role)
  );
}

/**
 * La mention sobre d'un pouvoir éteint. La perte est publique — l'annonce de
 * la rancune l'a dite à tous (R92) —, mais seul le siège concerné lit qu'elle
 * le touche : sa nuit sans consigne n'est pas un oubli. La nuit, elle tient
 * dans la ligne de résumé.
 */
export function PouvoirsEteints({ className = '' }: { className?: string }) {
  const voix = useVoix();
  return (
    <span data-testid="pouvoirs-eteints" className={`italic ${className}`}>
      Vos pouvoirs se sont éteints avec {voix.nomRole('ancien')}.
    </span>
  );
}
