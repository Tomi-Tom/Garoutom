/**
 * Les actions du joueur : le seul endroit du client qui demande au serveur.
 *
 * La règle des accusés tient en deux mots : succès → rien, échec → avis. Un
 * accusé de réussite ne modifie ni l'écran ni le magasin — le `sync` qui suit
 * fait foi, et il arrive déjà taillé pour le siège de ce joueur. Un refus,
 * lui, doit être dit : le message du serveur part dans le fil des avis, ton
 * erreur, sans jamais casser l'écran qui l'a déclenché.
 */

import type { Action, GameOptions, JoinResult } from '@garoutom/engine';

import { forgetToken, loadName, loadToken, saveName, saveToken } from './identity.js';
import { canal } from './socket.js';
import { useStore } from './store.js';

/** Longueur d'un code de table, telle que le serveur les fabrique. */
export const CODE_LENGTH = 4;

/** Les lettres des codes de table — pas de I ni de O, qu'on recopie en chiffres. */
export const CODE_LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Ne garde des lettres de code que ce que le serveur sait émettre. */
export function normaliseCode(brut: string): string {
  return brut
    .toUpperCase()
    .split('')
    .filter((caractere) => CODE_LETTRES.includes(caractere))
    .slice(0, CODE_LENGTH)
    .join('');
}

function notify(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Action impossible';
  useStore.getState().pushNotice(message, 'error');
}

/** Exécute une demande et signale l'échec au joueur sans casser l'interface. */
async function run<T>(tache: () => Promise<T>): Promise<T | undefined> {
  try {
    return await tache();
  } catch (error) {
    notify(error);
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* La table                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ouvrir une table. Les options ne partent pas d'ici : le serveur pose les
 * siennes par défaut, et l'hôte les règle au salon, où chacun peut les lire
 * avant que la partie ne commence.
 */
export async function ouvrirTable(nom: string): Promise<void> {
  saveName(nom);
  const result = await run(() => canal().request<JoinResult>('room:create', { name: nom }));
  if (result === undefined) return;
  saveToken(result.code, result.token);
  useStore.getState().setPlayerId(result.playerId);
}

/**
 * Rejoindre une table — ou la reprendre : un jeton connu fait de la demande
 * une rentrée, pas une arrivée, et le serveur rend la place tenue pendant le
 * délai de grâce.
 */
export async function rejoindreTable(code: string, nom: string): Promise<void> {
  saveName(nom);
  const propre = code.trim().toUpperCase();
  const jeton = loadToken(propre);
  const result = await run(() =>
    canal().request<JoinResult>('room:join', {
      code: propre,
      name: nom,
      // `token` absent plutôt que `undefined` : le serveur distingue « je
      // reviens » de « j'arrive », et une clé présente à vide brouillerait ça.
      ...(jeton === undefined ? {} : { token: jeton }),
    }),
  );
  if (result === undefined) return;
  saveToken(result.code, result.token);
  useStore.getState().setPlayerId(result.playerId);
}

/**
 * Reprendre sa place après une coupure, en silence.
 *
 * Chaque reconnexion ouvre un WebSocket que le serveur ne rattache à personne :
 * il faut se réinscrire à la table, sinon on reste connecté sans plus rien
 * recevoir. Renvoie `true` si la place a été reprise. Un échec ne vide pas le
 * salon : la coupure peut être passagère, et la tentative repartira à la
 * reconnexion suivante — tant que le serveur dit autre chose qu'un refus.
 */
export async function reprendrePlace(code: string): Promise<boolean> {
  const jeton = loadToken(code);
  const nom = loadName();
  if (jeton === undefined || nom === '') return false;
  const result = await run(() =>
    canal().request<JoinResult>('room:join', { code, name: nom, token: jeton }),
  );
  if (result === undefined) return false;
  useStore.getState().setPlayerId(result.playerId);
  return true;
}

/**
 * Nombre d'envois d'options encore en vol, et l'intention la plus récente.
 *
 * Les options partent en entier, pas par différence. Tant que l'écran partait
 * de `room.options`, rafraîchi seulement au `sync` qui suit, cocher deux cases
 * coup sur coup envoyait la seconde calculée sur l'état d'avant : la première
 * coche revenait s'effacer une demi-seconde plus tard. On empile donc les
 * intentions localement.
 */
let optionsEnVol = 0;
let brouillon: GameOptions | null = null;

export async function reglerOptions(retouche: Partial<GameOptions>): Promise<void> {
  const base = brouillon ?? useStore.getState().room?.options;
  if (base === undefined) return;
  const options: GameOptions = { ...base, ...retouche };

  brouillon = options;
  optionsEnVol += 1;
  try {
    // Réussite : rien. Le `sync` qui suit fait foi.
    await run(() => canal().request<null>('room:options', { options }));
  } finally {
    optionsEnVol -= 1;
    // Le brouillon ne vaut que tant qu'un envoi est en vol : au repos, la
    // vérité est celle du serveur, y compris s'il a refusé nos options.
    if (optionsEnVol === 0) brouillon = null;
  }
}

export const lancerPartie = (): Promise<null | undefined> =>
  run(() => canal().request<null>('room:start', {}));

export async function quitterTable(): Promise<void> {
  const code = useStore.getState().room?.code;
  await run(() => canal().request<null>('room:leave', {}));
  // On part volontairement : garder le jeton ferait reprendre la place tout
  // seul à la reconnexion suivante, ce qui n'est pas ce qu'on a demandé.
  if (code !== undefined) forgetToken(code);
  useStore.getState().reset();
}

/* ------------------------------------------------------------------ */
/* Le jeu                                                              */
/* ------------------------------------------------------------------ */

/**
 * Une intention de jeu à la fois.
 *
 * Un double clic — ou la touche Entrée maintenue — partirait deux fois, et la
 * seconde reviendrait en refus métier. Le verrou tient jusqu'au retour de
 * l'accusé : le canal règle lui-même les trois façons de ne jamais revenir
 * (refus, silence, coupure), donc il n'a pas besoin d'échéance.
 */
let occupe = false;

/** Jouer un coup, dans le vocabulaire du moteur ; le siège ne voyage jamais. */
export async function jouer(action: Action): Promise<void> {
  if (occupe) return;
  occupe = true;
  try {
    await run(() => canal().request<null>('game:action', { action }));
  } finally {
    occupe = false;
  }
}
