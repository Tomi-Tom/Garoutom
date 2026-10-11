/**
 * Les préférences locales du joueur.
 *
 * Elles vivent dans le navigateur, sous `garoutom.reglages`, et ne partent
 * jamais au serveur : ce que je veux voir et entendre ne regarde pas la table.
 * Le magasin est partagé (`useSyncExternalStore`) pour que le panneau, la
 * minuterie et le fil se mettent à jour ensemble ; deux onglets ouverts se
 * suivent par l'évènement `storage`.
 */

import { useCallback, useSyncExternalStore } from 'react';

export interface Reglages {
  /** `systeme` suit prefers-reduced-motion ; `reduites` force le calme. */
  animations: 'systeme' | 'reduites';
  /** D'après la question ouverte « Les minuteries » : barre toujours, ou discrète sauf les 30 dernières secondes. */
  minuterie: 'barre' | 'discrete';
  /** Texte agrandi pour lire de loin, téléphone posé sur la table. */
  grandTexte: boolean;
  /** Le fil s'ouvre déplié sur mobile. */
  filOuvert: boolean;
  /** Vibrer quand c'est à soi de jouer (mobile). */
  vibrations: boolean;
}

export const REGLAGES_DEFAUT: Reglages = {
  animations: 'systeme',
  minuterie: 'barre',
  grandTexte: false,
  filOuvert: false,
  vibrations: true,
};

export const CLE_REGLAGES = 'garoutom.reglages';

/** Lit un champ : la valeur stockée si elle est du bon type, sinon le défaut. */
function champ<K extends keyof Reglages>(brut: Record<string, unknown>, cle: K): Reglages[K] {
  const valeur = brut[cle];
  const defaut = REGLAGES_DEFAUT[cle];
  if (typeof defaut === 'boolean') {
    return (typeof valeur === 'boolean' ? valeur : defaut) as Reglages[K];
  }
  if (cle === 'animations') {
    return (valeur === 'systeme' || valeur === 'reduites' ? valeur : defaut) as Reglages[K];
  }
  return (valeur === 'barre' || valeur === 'discrete' ? valeur : defaut) as Reglages[K];
}

/**
 * Lit les réglages, champ par champ : un champ corrompu retombe sur son
 * défaut sans entraîner les autres, et un stockage illisible (navigation
 * privée) n'empêche rien.
 */
export function lireReglages(): Reglages {
  let brut: unknown = null;
  try {
    const texte = localStorage.getItem(CLE_REGLAGES);
    brut = texte === null ? null : JSON.parse(texte);
  } catch {
    brut = null;
  }
  const objet =
    typeof brut === 'object' && brut !== null && !Array.isArray(brut)
      ? (brut as Record<string, unknown>)
      : {};
  return {
    animations: champ(objet, 'animations'),
    minuterie: champ(objet, 'minuterie'),
    grandTexte: champ(objet, 'grandTexte'),
    filOuvert: champ(objet, 'filOuvert'),
    vibrations: champ(objet, 'vibrations'),
  };
}

let courant: Reglages = lireReglages();
const abonnes = new Set<() => void>();

/**
 * Les effets qui touchent toute la page : le texte agrandi, et le calme —
 * les animations réduites valent aussi pour les transitions CSS, que
 * `MotionConfig` ne voit pas (`html[data-calme]` dans styles.css).
 */
function appliquer(reglages: Reglages): void {
  if (typeof document === 'undefined') return;
  const racine = document.documentElement;
  if (reglages.grandTexte) racine.setAttribute('data-grand-texte', '');
  else racine.removeAttribute('data-grand-texte');
  if (reglages.animations === 'reduites') racine.setAttribute('data-calme', '');
  else racine.removeAttribute('data-calme');
}

function publier(suivant: Reglages): void {
  courant = suivant;
  appliquer(suivant);
  for (const abonne of abonnes) abonne();
}

appliquer(courant);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (evenement) => {
    if (evenement.key === CLE_REGLAGES || evenement.key === null) publier(lireReglages());
  });
}

/** L'instantané courant, hors React. */
export function reglagesActuels(): Reglages {
  return courant;
}

/** Retouche et enregistre. Un stockage qui jette n'empêche pas le réglage de tenir la session. */
export function regler(retouche: Partial<Reglages>): void {
  const suivant = { ...courant, ...retouche };
  try {
    localStorage.setItem(CLE_REGLAGES, JSON.stringify(suivant));
  } catch {
    // Le réglage vaut pour la session, faute de mieux.
  }
  publier(suivant);
}

/** Relit le stockage (tests, ou stockage modifié sous nos pieds). */
export function relireReglages(): void {
  publier(lireReglages());
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

export function useReglages(): Reglages & { regler: (retouche: Partial<Reglages>) => void } {
  const reglages = useSyncExternalStore(abonner, reglagesActuels, reglagesActuels);
  const retoucher = useCallback((retouche: Partial<Reglages>) => regler(retouche), []);
  return { ...reglages, regler: retoucher };
}
