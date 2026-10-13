/**
 * Le tirage de l'écran : papier ou cuivre (SPEC Caprices § 3.2).
 *
 * Choisi par **l'heure publique**, jamais par le rôle : le talon du Voleur
 * (avant la révélation), la révélation et la nuit sont sur cuivre pour tout
 * le monde ; le reste (élection, jour,
 * chasseur, succession, bouc, fin, salon, accueil) est sur papier — sauf si
 * le réglage local « Cuivre » garde tout l'écran sur le tirage de nuit. Ce
 * réglage ne touche jamais la nuit : il ne peut donc rien trahir.
 *
 * `useTirage()` pose `data-tirage` et `data-heure` sur <html> — la page
 * entière, `body` compris, change d'encre — et, quand l'heure bascule avec
 * le tirage, `data-bascule` le temps des quatre paliers (320 ms, le voile de
 * `<Matieres/>`). Au même instant pour tous les sièges : c'est l'horloge du
 * `sync`, pas un geste.
 */

import { useEffect, useRef } from 'react';

import type { PhaseKind } from '@garoutom/engine';

import { MORSURE } from '../../anim/tokens.js';
import { useReglages } from '../../lib/reglages.js';
import { useStore } from '../../lib/store.js';
import { encresDuSkin, type Tirage } from '../../skins/habits.js';

export type { Tirage };
export type Heure = 'jour' | 'nuit';

/** Les phases sur cuivre pour tout le monde. */
const PHASES_CUIVRE: ReadonlySet<PhaseKind> = new Set<PhaseKind>(['voleur', 'revelation', 'nuit']);

/** L'heure publique d'une phase ; hors partie (accueil, salon), le jour. */
export function heureDe(phase: PhaseKind | null): Heure {
  return phase !== null && PHASES_CUIVRE.has(phase) ? 'nuit' : 'jour';
}

/** Le tirage d'une phase, compte tenu du réglage local. */
export function tirageDe(phase: PhaseKind | null, reglage: Tirage): Tirage {
  return reglage === 'cuivre' || heureDe(phase) === 'nuit' ? 'cuivre' : 'papier';
}

/** Pose les attributs sur la racine et accorde la barre du navigateur. */
function poser(tirage: Tirage, heure: Heure, skin: string): void {
  const racine = document.documentElement;
  racine.setAttribute('data-tirage', tirage);
  racine.setAttribute('data-heure', heure);
  const encres = encresDuSkin(skin);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', tirage === 'cuivre' ? encres.bistre900 : encres.verge);
}

/**
 * Le tirage et l'heure de l'écran, posés sur <html>.
 *
 * Sans argument, la phase vient du magasin (`game.phase`) ; un argument
 * explicite la remplace (tests, écrans hors partie qui veulent forcer).
 */
export function useTirage(phase?: PhaseKind | null): { tirage: Tirage; heure: Heure } {
  const phaseDuMagasin = useStore((etat) => etat.game?.phase ?? null);
  const skin = useStore((etat) => etat.room?.options.skin ?? 'thiercelieux');
  const { tirage: reglage } = useReglages();
  const phaseEffective = phase === undefined ? phaseDuMagasin : phase;
  const heure = heureDe(phaseEffective);
  const tirage = tirageDe(phaseEffective, reglage);

  // La bascule ne se joue que si l'heure ET le tirage changent ensemble :
  // un réglage qu'on bascule, ou l'aube sous le réglage « Cuivre », ne font
  // pas de théâtre.
  const precedent = useRef<{ tirage: Tirage; heure: Heure } | null>(null);
  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { tirage, heure };
    if (avant === null || avant.tirage === tirage || avant.heure === heure) return;
    const racine = document.documentElement;
    racine.setAttribute('data-bascule', tirage === 'cuivre' ? 'morsure' : 'aube');
    const minuteur = setTimeout(() => racine.removeAttribute('data-bascule'), MORSURE.duree);
    return () => {
      clearTimeout(minuteur);
      racine.removeAttribute('data-bascule');
    };
  }, [tirage, heure]);

  useEffect(() => {
    poser(tirage, heure, skin);
  }, [tirage, heure, skin]);

  // Démonté (tests, rechargement à chaud) : la racine retrouve son état nu.
  useEffect(
    () => () => {
      const racine = document.documentElement;
      racine.removeAttribute('data-tirage');
      racine.removeAttribute('data-heure');
      racine.removeAttribute('data-bascule');
    },
    [],
  );

  return { tirage, heure };
}
