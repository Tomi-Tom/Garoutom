/**
 * Les planches passagères (SPEC § 7.8) : le dépouillement d'un vote, l'aube.
 *
 * Une planche se pose quand son évènement **arrive** — jamais pour un
 * évènement déjà dans la chronique au montage, ni pour un évènement rejoué à
 * la reprise —, reste `DUREE_PLANCHE_MS` (la même pour tous les sièges, loi
 * N6), et un toucher la passe. Elle ne bloque jamais : elle couvre la place
 * quelques secondes, la barre au pouce reste dessous, à portée.
 *
 * La fermeture ne dépend pas d'un seul minuteur, que Chrome bride dans un
 * onglet en arrière-plan : chaque planche porte une **échéance absolue**
 * (l'heure d'arrivée de l'évènement + la durée), vérifiée par le minuteur,
 * au retour de visibilité (`visibilitychange`, `focus`, `pageshow`) et à
 * chaque nouvelle vue de partie. Une planche se referme aussi dès que
 * l'heure change encore (la nuit cède au jour, le jour à la nuit) : elle
 * disait un moment qui n'est plus.
 *
 * Deux planches qui se suivent font une file : la seconde attend que la
 * première se referme, puis tient à son tour sa durée. La fin de partie a
 * son verdict : aucune planche ne s'y pose.
 *
 * Loi N1 : la nuit, la planche se comporte pareil chez tous les sièges — on
 * ne la referme pas plus tôt chez qui a une action, ce qui trahirait les
 * rôles. Elle reste courte et passable, pour tous.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { GameView } from '@garoutom/engine';

import { Cuvette } from '../../caprices/index.js';
import { useStore, type EvenementRecu } from '../../../lib/store.js';

/** Combien de temps une planche reste posée (SPEC § 7.8 : 3 à 5 s). */
export const DUREE_PLANCHE_MS = 4_000;

/** Une planche à poser, telle que la chronique la fait naître. */
export type Planche =
  | { genre: 'depouillement'; cle: number; recu: EvenementRecu }
  | {
      genre: 'aube';
      cle: number;
      /** Le jour qui se lève — « Aube II ». */
      jour: number;
      /** Ce que l'aube annonce, dans l'ordre : les morts (ou la paix), puis la marque du Corbeau… */
      recus: EvenementRecu[];
    };

/** Une planche dans la file : son heure d'arrivée, et le moment qu'elle raconte. */
interface Entree {
  planche: Planche;
  /** `Date.now()` à l'arrivée de l'évènement. */
  arrivee: number;
  /** La phase (et le jour) où elle est née : quand elle change, la planche n'a plus lieu d'être. */
  moment: string;
}

interface File {
  entrees: readonly Entree[];
  /** Quand la planche précédente s'est refermée : la suivante ne commence pas avant. */
  fin: number;
}

const FILE_VIDE: File = { entrees: [], fin: 0 };

/**
 * Le moment d'une vue : l'heure (nuit, jour, fin) et son numéro. Les étapes
 * de nuit n'en changent pas, ni les scènes de jour qui s'enchaînent (la
 * succession, le Chasseur, l'élection qui cède au vote) : l'aube garde ses
 * quelques secondes. La nuit qui tombe, le jour qui se lève, la fin, si.
 */
export function momentDe(game: GameView | null): string {
  if (game === null) return '';
  const heure = game.phase === 'fin' ? 'fin' : game.phase === 'nuit' || game.phase === 'revelation' ? 'nuit' : 'jour';
  return `${heure}-${String(game.day)}`;
}

/** Le début d'affichage de la tête de file : pas avant son arrivée, pas avant la fin de la précédente. */
function debutDe(file: File): number {
  const tete = file.entrees[0];
  return tete === undefined ? 0 : Math.max(tete.arrivee, file.fin);
}

/**
 * La file à l'instant `maintenant`, dans le moment `moment` : les planches
 * d'un autre moment tombent, celles dont l'échéance est passée aussi — en
 * chaîne, chacune ayant tenu sa durée après la précédente. Rend la même
 * file quand rien ne change.
 */
export function purger(file: File, maintenant: number, moment: string): File {
  let { entrees, fin } = file;
  if (moment.startsWith('fin-')) return entrees.length === 0 ? file : { entrees: [], fin: maintenant };
  if (entrees.some((entree) => entree.moment !== moment)) {
    // La tête affichée se referme maintenant — ou à son échéance, si elle
    // était déjà passée (un onglet qui rattrape son retard ne prolonge pas
    // la suivante d'autant).
    if (entrees[0] !== undefined && entrees[0].moment !== moment) {
      fin = Math.max(fin, Math.min(maintenant, debutDe(file) + DUREE_PLANCHE_MS));
    }
    entrees = entrees.filter((entree) => entree.moment === moment);
  }
  for (;;) {
    const tete = entrees[0];
    if (tete === undefined) break;
    const echeance = Math.max(tete.arrivee, fin) + DUREE_PLANCHE_MS;
    if (echeance > maintenant) break;
    fin = echeance;
    entrees = entrees.slice(1);
  }
  return entrees === file.entrees && fin === file.fin ? file : { entrees, fin };
}

/** Le jour qu'ouvre une phase de jour (ou une scène de jour) — `null` pour la nuit, la révélation, la fin. */
function jourDuLever(recu: EvenementRecu): number | null {
  const event = recu.event;
  if (event.type !== 'phase' || event.phase === 'nuit' || event.phase === 'revelation' || event.phase === 'fin') {
    return null;
  }
  return event.day;
}

/**
 * Ce que l'aube annonce : les évènements entre la dernière phase de nuit et
 * le lever. `null` si le lever ne suit pas une nuit (le jour qui reprend
 * après le Chasseur, l'élection qui cède au vote…), ou si la nuit ne s'est
 * pas résolue sous nos yeux (ni morts ni aube paisible).
 */
function recitDeLAube(chronique: readonly EvenementRecu[], lever: number): EvenementRecu[] | null {
  const rang = chronique.findIndex((recu) => recu.id === lever);
  const recus: EvenementRecu[] = [];
  for (let i = rang - 1; i >= 0; i -= 1) {
    const recu = chronique[i];
    if (recu === undefined) break;
    if (recu.event.type === 'phase') {
      if (recu.event.phase !== 'nuit') return null;
      const resolue = recus.some((r) => r.event.type === 'morts' || r.event.type === 'aube-paisible');
      return resolue ? recus.reverse() : null;
    }
    recus.push(recu);
  }
  return null;
}

/** Les planches que font naître des évènements qui viennent d'arriver. Les rejoués n'en font aucune. */
export function planchesArrivees(chronique: readonly EvenementRecu[], neufs: readonly EvenementRecu[]): Planche[] {
  const planches: Planche[] = [];
  for (const recu of neufs) {
    if (recu.rejoue === true) continue;
    if (recu.event.type === 'vote') {
      planches.push({ genre: 'depouillement', cle: recu.id, recu });
      continue;
    }
    const jour = jourDuLever(recu);
    if (jour === null) continue;
    const recus = recitDeLAube(chronique, recu.id);
    if (recus !== null) planches.push({ genre: 'aube', cle: recu.id, jour, recus });
  }
  return planches;
}

/**
 * Le crochet des planches passagères : la planche à poser maintenant, son
 * heure de début (pour le décompte), et le geste qui la passe.
 */
export function usePlanchesPassageres(game: GameView | null): {
  planche: Planche | null;
  debut: number;
  passer: (cle: number) => void;
} {
  const chronique = useStore((state) => state.chronique);
  const dernierId = chronique[chronique.length - 1]?.id ?? 0;
  // Au montage, tout ce qui est déjà là est passé : rien ne se rejoue.
  const vu = useRef(dernierId);
  const [file, setFile] = useState<File>(FILE_VIDE);
  const moment = momentDe(game);
  const momentCourant = useRef(moment);

  useEffect(() => {
    momentCourant.current = moment;
  }, [moment]);

  // Les évènements qui arrivent : chacun peut poser sa planche.
  useEffect(() => {
    if (dernierId <= vu.current) return;
    const neufs = chronique.filter((recu) => recu.id > vu.current);
    vu.current = dernierId;
    const planches = planchesArrivees(chronique, neufs);
    if (planches.length === 0) return;
    const maintenant = Date.now();
    // L'heure d'arrivée est celle de l'évènement qui fait naître la planche
    // (le vote, le lever du jour), pas celle où l'écran s'en aperçoit.
    const arrivees = planches.map((planche): Entree => {
      const recu = planche.genre === 'aube' ? chronique.find((r) => r.id === planche.cle) : planche.recu;
      return { planche, arrivee: Math.min(maintenant, recu?.recuA ?? maintenant), moment };
    });
    setFile((avant) => purger({ ...avant, entrees: [...avant.entrees, ...arrivees] }, maintenant, moment));
  }, [chronique, dernierId, moment]);

  // Chaque nouvelle vue de partie revérifie les échéances — et le moment.
  useEffect(() => {
    setFile((avant) => purger(avant, Date.now(), moment));
  }, [game, moment]);

  // Le retour au premier plan : les minuteurs bridés ont pu manquer l'échéance.
  useEffect(() => {
    const reverifier = () => setFile((avant) => purger(avant, Date.now(), momentCourant.current));
    document.addEventListener('visibilitychange', reverifier);
    window.addEventListener('focus', reverifier);
    window.addEventListener('pageshow', reverifier);
    return () => {
      document.removeEventListener('visibilitychange', reverifier);
      window.removeEventListener('focus', reverifier);
      window.removeEventListener('pageshow', reverifier);
    };
  }, []);

  // Le minuteur de la tête de file. À son terme, l'échéance est atteinte —
  // même s'il part une milliseconde trop tôt.
  const tete = file.entrees[0];
  const debut = debutDe(file);
  useEffect(() => {
    if (tete === undefined) return;
    const echeance = debut + DUREE_PLANCHE_MS;
    const minuteur = setTimeout(
      () => setFile((avant) => purger(avant, Math.max(Date.now(), echeance), momentCourant.current)),
      Math.max(0, echeance - Date.now()),
    );
    return () => clearTimeout(minuteur);
  }, [tete, debut]);

  const passer = useCallback((cle: number) => {
    setFile((avant) =>
      avant.entrees[0]?.planche.cle === cle ? { entrees: avant.entrees.slice(1), fin: Date.now() } : avant,
    );
  }, []);

  const fin = game?.phase === 'fin';
  return { planche: fin || tete === undefined ? null : tete.planche, debut, passer };
}

/** Le décompte sous « Toucher pour passer » : une case par seconde, la première pleine dès la pose. */
const CASES = Math.round(DUREE_PLANCHE_MS / 1_000);

function Decompte({ debut }: { debut: number }) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 250);
    return () => clearInterval(minuteur);
  }, []);
  const pleines = Math.max(1, Math.min(CASES, Math.floor((maintenant - debut) / 1_000) + 1));
  const largeur = CASES * 8 + (CASES - 1) * 3 - 3;
  return (
    <svg aria-hidden="true" width={largeur} height={10} viewBox={`0 0 ${String(largeur)} 10`} className="block" data-decompte={pleines}>
      {Array.from({ length: CASES }, (_, i) =>
        i < pleines ? (
          <rect key={i} x={i * 8} y={0} width={5} height={10} fill="var(--encre)" />
        ) : (
          <rect key={i} x={i * 8 + 0.5} y={0.5} width={4} height={9} fill="none" stroke="var(--filet)" strokeWidth={1} />
        ),
      )}
    </svg>
  );
}

/**
 * Le cadre commun d'une planche passagère : sur mobile, un papier posé
 * entre la minuterie et la barre au pouce (la barre reste à portée), la
 * cuvette à 24 px ; sur grand écran, la cuvette seule au centre de la
 * place, le pupitre et le fil autour restant vivants. Un toucher n'importe
 * où sur la planche la passe ; « Toucher pour passer » le dit, avec le
 * décompte des secondes.
 */
export function CadrePlanche({
  libelle,
  testId,
  debut,
  onPasser,
  children,
  className = '',
}: {
  libelle: string;
  testId: string;
  debut: number;
  onPasser: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-label={libelle}
      data-testid={testId}
      data-planche=""
      className={
        'fixed inset-x-0 top-[calc(80px_+_env(safe-area-inset-top,0px))] bottom-[calc(var(--barre-pouce-h,72px)_+_env(safe-area-inset-bottom,0px))] z-[60] flex border-y-[1.5px] border-[var(--encre)] bg-[var(--fond)] text-[var(--encre)] ' +
        'lg:pointer-events-none lg:top-[120px] lg:right-[calc(340px_+_2*var(--gouttiere))] lg:bottom-[var(--gouttiere)] lg:left-[var(--gouttiere)] lg:items-center lg:justify-center lg:border-0 lg:bg-transparent'
      }
      onClick={onPasser}
    >
      <Cuvette
        className={`m-6 flex min-h-0 flex-1 flex-col items-center gap-3.5 overflow-hidden px-5 pt-5 pb-4 lg:pointer-events-auto lg:m-0 lg:max-h-full lg:w-[540px] lg:flex-none ${className}`}
      >
        {children}
        <button
          type="button"
          onClick={(evenement) => {
            evenement.stopPropagation();
            onPasser();
          }}
          className="mt-auto flex min-h-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 border-0 bg-transparent px-2 font-[inherit] text-[12px] leading-4 text-[var(--encre-2)]"
        >
          <Decompte debut={debut} />
          <span>Toucher pour passer</span>
        </button>
      </Cuvette>
    </div>
  );
}
