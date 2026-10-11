/**
 * Les mouvement du village, en trois ressorts.
 *
 * La direction artistique veut des « montées discrètes » : rien qui rebondisse,
 * rien qui dure. Trois ressorts suffisent à tout le client — un panneau qui se
 * pose, une carte qui s'installe, un jeton qui coulisse — et `MotionConfig
 * reducedMotion="user"` (posé dans `main.tsx`) neutralise déjà les
 * transformations pour qui a demandé moins de mouvement au système.
 */

/** Un panneau entier : le salon, la table, ce qui remplace un écran. */
export const RESSORT_PANNEAU = { type: 'spring', stiffness: 170, damping: 26 } as const;

/** Une ligne, une carte, un avis : ce qui s'installe sans faire lever la tête. */
export const RESSORT_CARTE = { type: 'spring', stiffness: 320, damping: 30 } as const;

/** Le jeton d'un interrupteur qui coulisse dans sa glissière. */
export const RESSORT_JETON = { type: 'spring', stiffness: 520, damping: 34 } as const;

/** Combien de temps un avis reste à l'écran avant de s'effacer de lui-même. */
export const DUREE_AVIS_MS = 6_000;
