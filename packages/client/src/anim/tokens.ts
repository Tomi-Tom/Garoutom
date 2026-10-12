/**
 * Le mouvement du village, en crans (SPEC Caprices § 3.9).
 *
 * Rien ne glisse, rien ne rebondit : tout s'imprime. Le mouvement procède
 * par crans (`steps()`), comme la morsure d'un acide ou le passage d'une
 * presse. Les trois ressorts d'avant sont retirés ; leurs noms survivent, le
 * temps de la vague 2, comme alias vers les crans (en bas de ce fichier).
 *
 * Les valeurs vivent ici pour le code (motion, minuteries) et dans
 * `styles.css` (`--m-*`) pour le CSS ; un test les compare.
 *
 * Mouvement réduit (le système, ou `data-calme`) : chaque cran a son
 * équivalent (`*_REDUIT`, ou la note du commentaire). Les durées
 * **fonctionnelles** — l'anneau d'un appui long, la fenêtre d'un bouton
 * armé, la lecture maximale d'une révélation — ne changent pas : elles disent
 * combien de temps on a, pas comment c'est joli.
 */

/** Tombée de la nuit (vergé → I → II → III → IV) : 320 ms en quatre paliers. */
export const MORSURE = { duree: 320, paliers: 4 } as const;
/** Lever du jour (IV → III → II → I → papier) : la même horloge, à rebours. */
export const AUBE = { duree: 320, paliers: 4 } as const;
/** Mouvement réduit : la morsure et l'aube deviennent un fondu de 160 ms. */
export const BASCULE_REDUITE_MS = 160;

/** Une carte, un avis, un écran qui paraît : opacité 0 → 0,5 → 1 (deux crans côté CSS). */
export const IMPRESSION = { duration: 0.12, ease: 'linear' } as const;
/** Mouvement réduit : un fondu de la même durée. */
export const IMPRESSION_REDUITE = { duration: 0.12, ease: 'linear' } as const;

/** La feuille basse tirée vers le haut — le seul glissement : un papier qu'on tire. */
export const TIRAGE_FEUILLE = { type: 'tween', duration: 0.24, ease: [0.2, 0, 0, 1] } as const;
/** Mouvement réduit : la feuille paraît en fondu. */
export const TIRAGE_FEUILLE_REDUIT = { type: 'tween', duration: 0.16, ease: 'linear' } as const;

/** L'anneau d'un appui long : 12 crans de 50 ms. Fonctionnel : inchangé en mouvement réduit. */
export const APPUI_ARMEMENT_MS = 600;
export const APPUI_CRANS = 12;

/** Durée maximale d'une révélation tenue sous le pouce (P0-2). Inchangée. */
export const LECTURE_MAX_MS = 8_000;

/** Fenêtre d'un bouton armé avant désarmement. Inchangée. */
export const ARMEMENT_CONFIRMATION_MS = 4_000;

/** Le brunissage avance de 8 px par image (16 ms). Réduit : il s'ouvre d'un coup. */
export const CRAN_BRUNIR_PX = 8;

/** Le crieur « s'écrit » : un mot toutes les 40 ms, 1 200 ms au plus. Réduit : posé d'un coup. */
export const CRIEUR = { motMs: 40, maxMs: 1_200 } as const;

/** Un jeton meurt : trois crans de 160 ms (hachure → contour → silhouette). Réduit : fondu de 160 ms. */
export const BRUNI_MORT = { cranMs: 160, crans: 3 } as const;

/** L'anneau de 3,5 px et les repères de visée : 80 ms en deux crans. Réduit : instantané. */
export const CHOIX = { duree: 80, crans: 2 } as const;

/** Combien de temps un avis reste à l'écran avant de s'effacer de lui-même. */
export const DUREE_AVIS_MS = 6_000;

/**
 * Les durées telles que `styles.css` les déclare (`--m-*`). La source reste
 * les constantes ci-dessus ; ce tableau n'existe que pour le test qui vérifie
 * que la feuille de style ne s'en écarte pas.
 */
export const DUREES_CSS = {
  '--m-morsure': `${String(MORSURE.duree)}ms`,
  '--m-aube': `${String(AUBE.duree)}ms`,
  '--m-impression': `${String(IMPRESSION.duration * 1000)}ms`,
  '--m-tirage': `${String(TIRAGE_FEUILLE.duration * 1000)}ms`,
  '--m-armement': `${String(APPUI_ARMEMENT_MS)}ms`,
  '--m-arme': `${String(ARMEMENT_CONFIRMATION_MS)}ms`,
  '--m-lecture-max': `${String(LECTURE_MAX_MS)}ms`,
  '--m-bruni-mort': `${String(BRUNI_MORT.cranMs * BRUNI_MORT.crans)}ms`,
  '--m-choix': `${String(CHOIX.duree)}ms`,
} as const;

/* -- Alias de transition (vague 2) --------------------------------------
   Les écrans d'avant importent encore les trois ressorts. Ils pointent
   désormais vers l'impression de Caprices : plus de rebond nulle part, et
   les écrans de la vague 2 les remplaceront par les noms ci-dessus. À retirer
   quand plus personne ne les importe. */

/** @deprecated Caprices : `IMPRESSION`, ou `TIRAGE_FEUILLE` pour une feuille basse. */
export const RESSORT_PANNEAU = IMPRESSION;
/** @deprecated Caprices : `IMPRESSION`. */
export const RESSORT_CARTE = IMPRESSION;
/** @deprecated Caprices : `IMPRESSION` (l'interrupteur devient une case gravée, § 5.17). */
export const RESSORT_JETON = IMPRESSION;
