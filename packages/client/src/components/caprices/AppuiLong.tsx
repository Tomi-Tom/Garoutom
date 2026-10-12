/**
 * L'appui long (SPEC § 5.2, § 5.4) : le geste qui montre un secret — sa
 * carte, son carnet — sans jamais le laisser à l'écran.
 *
 * - Pouce posé : l'anneau se remplit en 12 crans (600 ms), puis `onDebut()`
 *   — le secret paraît.
 * - Il reste visible **tant que le pouce est posé**, et se recache
 *   (`onFin()`) au relâchement, au changement d'onglet (`visibilitychange`),
 *   à la perte du focus, et au plus tard après `dureeMs` (8 s, P0-2).
 * - Relâché pendant l'armement : rien n'a paru, rien ne se recache.
 * - Clavier : **Espace tenu** fait le même geste ; Entrée ouvre une lecture
 *   de `dureeMs` au plus (Entrée ou Échap la referment).
 *
 * La nuit, il prend l'habit des autres boutons de la barre (palier III) :
 * rien ne distingue un bouton qui agit d'un bouton qui montre la carte (N2,
 * N5). La durée est la même horloge pour tous (N6).
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { APPUI_ARMEMENT_MS, APPUI_CRANS, LECTURE_MAX_MS } from '../../anim/tokens.js';

type Etat = 'repos' | 'armement' | 'ouvert';

/** Les 12 crans de l'anneau, gravés en travers de la piste. */
const CRANS = Array.from({ length: APPUI_CRANS }, (_, i) => {
  const a = (i / APPUI_CRANS) * 2 * Math.PI;
  const p = (r: number) => `${(13 + r * Math.sin(a)).toFixed(2)} ${(13 - r * Math.cos(a)).toFixed(2)}`;
  return `M${p(8.2)}L${p(11.8)}`;
}).join('');

export function AppuiLong({
  libelle,
  dureeMs = LECTURE_MAX_MS,
  onDebut,
  onFin,
  className,
  disabled,
}: {
  libelle: string;
  dureeMs?: number;
  onDebut: () => void;
  onFin: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [etat, setEtat] = useState<Etat>('repos');
  // L'état vit aussi dans une référence : les écouteurs (minuteurs,
  // `visibilitychange`) le lisent sans attendre un nouveau rendu.
  const etatRef = useRef<Etat>('repos');
  const armement = useRef<ReturnType<typeof setTimeout> | null>(null);
  const echeance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rappels = useRef({ onDebut, onFin });
  rappels.current = { onDebut, onFin };

  const changer = (suivant: Etat) => {
    etatRef.current = suivant;
    setEtat(suivant);
  };

  const effacerMinuteurs = () => {
    if (armement.current !== null) clearTimeout(armement.current);
    if (echeance.current !== null) clearTimeout(echeance.current);
    armement.current = null;
    echeance.current = null;
  };

  /** Recache, d'une image (`--m-reencrer` : 0 ms). */
  const fermer = useCallback(() => {
    effacerMinuteurs();
    const etaitOuvert = etatRef.current === 'ouvert';
    if (etatRef.current !== 'repos') changer('repos');
    if (etaitOuvert) rappels.current.onFin();
  }, []);

  const ouvrir = useCallback(() => {
    effacerMinuteurs();
    changer('ouvert');
    rappels.current.onDebut();
    echeance.current = setTimeout(fermer, dureeMs);
  }, [dureeMs, fermer]);

  const armer = () => {
    if (disabled === true || etatRef.current !== 'repos') return;
    changer('armement');
    armement.current = setTimeout(ouvrir, APPUI_ARMEMENT_MS);
  };

  // L'onglet qui passe derrière, la page qu'on quitte : le secret se recache.
  useEffect(() => {
    const surVisibilite = () => {
      if (document.visibilityState === 'hidden') fermer();
    };
    document.addEventListener('visibilitychange', surVisibilite);
    window.addEventListener('pagehide', fermer);
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite);
      window.removeEventListener('pagehide', fermer);
    };
  }, [fermer]);

  // Démonté pouce posé : on recache quand même.
  useEffect(() => fermer, [fermer]);

  // Éteint en plein geste : on recache.
  useEffect(() => {
    if (disabled === true) fermer();
  }, [disabled, fermer]);

  const surPointeurBas = (evenement: PointerEvent<HTMLButtonElement>) => {
    // Le bouton principal seulement (un clic droit ne montre rien).
    if (evenement.button > 0) return;
    // Le pouce peut glisser hors du bouton sans le relâcher.
    if (evenement.currentTarget.setPointerCapture !== undefined) {
      try {
        evenement.currentTarget.setPointerCapture(evenement.pointerId);
      } catch {
        // Un pointeur synthétique (tests) n'a rien à capturer.
      }
    }
    armer();
  };

  const surTouche = (evenement: KeyboardEvent<HTMLButtonElement>) => {
    if (evenement.key === ' ') {
      evenement.preventDefault();
      if (!evenement.repeat) armer();
    } else if (evenement.key === 'Enter') {
      evenement.preventDefault();
      if (evenement.repeat) return;
      if (etatRef.current === 'repos' && disabled !== true) ouvrir();
      else fermer();
    } else if (evenement.key === 'Escape') {
      fermer();
    }
  };

  const classes = ['bouton', 'bouton-secondaire', 'appui-long'];
  if (className !== undefined) classes.push(className);

  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-etat={etat}
      aria-pressed={etat === 'ouvert'}
      aria-keyshortcuts="Space Enter"
      disabled={disabled}
      onPointerDown={surPointeurBas}
      onPointerUp={fermer}
      onPointerCancel={fermer}
      onLostPointerCapture={fermer}
      onKeyDown={surTouche}
      onKeyUp={(evenement) => {
        if (evenement.key === ' ') fermer();
      }}
      onBlur={fermer}
      onClick={(evenement) => evenement.preventDefault()}
      onContextMenu={(evenement) => evenement.preventDefault()}
    >
      <svg className="appui-anneau" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
        <circle className="appui-anneau-piste" cx={13} cy={13} r={10} />
        <circle className="appui-anneau-progres" cx={13} cy={13} r={10} data-anim-fonctionnelle="" />
        <path className="appui-anneau-crans" d={CRANS} />
      </svg>
      <span className="bouton-libelle">{libelle}</span>
    </button>
  );
}
