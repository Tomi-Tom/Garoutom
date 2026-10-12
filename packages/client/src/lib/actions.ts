/**
 * Les actions du joueur : le seul endroit du client qui demande au serveur.
 *
 * La règle des accusés tient en deux mots : succès → rien, échec → avis. Un
 * accusé de réussite ne modifie ni l'écran ni le magasin — le `sync` qui suit
 * fait foi, et il arrive déjà taillé pour le siège de ce joueur. Un refus,
 * lui, doit être dit : le message du serveur part dans le fil des avis, ton
 * erreur, sans jamais casser l'écran qui l'a déclenché.
 *
 * Depuis D22, une règle de plus : **tant que la place n'est pas reprise**
 * (`rattachement` autre que `rattache`), aucune action de jeu ne part. Un
 * vote lancé sur une socket que le serveur n'a encore rattachée à personne
 * reviendrait en refus — ou pire, partirait au mauvais moment.
 */

import { ChannelError, type Action, type GameOptions, type JoinResult } from '@garoutom/engine';

import { forgetToken, loadName, loadToken, saveName, saveToken } from './identity.js';
import { canal } from './socket.js';
import { actionsSuspendues, useStore } from './store.js';

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

/** Le paramètre d'adresse qui porte le code d'une table : `?table=ABCD`. */
export const PARAM_TABLE = 'table';

/**
 * Le code de table que porte l'adresse de la page, s'il est complet.
 *
 * C'est le lien d'invitation (le salon le copie), et c'est aussi ce qui
 * permet de reprendre sa place après un rechargement : `App` garde
 * l'adresse au code de la table en cours.
 */
export function codeDeLUrl(): string | null {
  try {
    const brut = new URL(globalThis.location.href).searchParams.get(PARAM_TABLE);
    const code = normaliseCode(brut ?? '');
    return code.length === CODE_LENGTH ? code : null;
  } catch {
    return null;
  }
}

/** Écrit (ou efface) le code de table dans l'adresse, sans recharger ni empiler l'historique. */
export function inscrireCodeDansLUrl(code: string | null): void {
  try {
    const url = new URL(globalThis.location.href);
    if (code === null) url.searchParams.delete(PARAM_TABLE);
    else url.searchParams.set(PARAM_TABLE, code);
    if (url.href !== globalThis.location.href) globalThis.history.replaceState(null, '', url.href);
  } catch {
    // Adresse illisible (bac à sable, test) : le jeu se passe très bien du rappel.
  }
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

/** Le code machine d'un refus du serveur, s'il en porte un. */
function codeDuRefus(error: unknown): string | undefined {
  return error instanceof ChannelError ? error.code : undefined;
}

/**
 * Les actions qui supposent une place tenue attendent qu'elle soit reprise.
 * Rend `true` — et le dit — quand il faut s'abstenir.
 */
function suspendu(): boolean {
  const store = useStore.getState();
  if (!actionsSuspendues(store)) return false;
  store.pushNotice('Reprise de votre place… un instant.', 'info');
  return true;
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
  useStore.getState().setRattachement('rattache');
}

/**
 * Rejoindre une table — ou la reprendre : un jeton connu fait de la demande
 * une rentrée, pas une arrivée, et le serveur rend la place, gardée jusqu'à
 * la fin de la partie (D17).
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
      ...(jeton === undefined ? {} : { token: jeton, lastSeq: dernierSeqPour(propre) }),
    }),
  );
  if (result === undefined) return;
  saveToken(result.code, result.token);
  useStore.getState().setPlayerId(result.playerId);
  useStore.getState().setRattachement('rattache');
}

/**
 * Le dernier évènement vu de cette table, pour `room:join.lastSeq`. Sans
 * souvenir (un rechargement a vidé le magasin), `0` : le serveur rejoue tout
 * son journal public, et le narrateur retrouve la partie racontée.
 */
function dernierSeqPour(code: string): number {
  const state = useStore.getState();
  return state.room?.code === code ? (state.dernierSeq ?? 0) : 0;
}

/** Les attentes entre deux reprises ratées (D22) : 1, 2, puis 4 s. */
export const DELAIS_REPRISE_MS: readonly number[] = [1_000, 2_000, 4_000];

/**
 * Les refus qui ne se retentent pas : la table n'existe plus (`gone`), ou
 * elle ne connaît plus ce jeton — la partie a commencé sans nous, ou la
 * place est donnée (`started`, `full`).
 */
const REFUS_DEFINITIFS: ReadonlySet<string> = new Set(['gone', 'started', 'full']);

/** Les refus passagers, qui valent un nouvel essai : quota, panne du serveur. */
const REFUS_PASSAGERS: ReadonlySet<string> = new Set(['rate', 'internal']);

/** Chaque reprise lancée annule la précédente : une seule boucle à la fois. */
let generation = 0;

/** Oublie la reprise en cours — un départ, une table disparue, une nouvelle socket. */
export function annulerReprise(): void {
  generation += 1;
}

const attendre = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reprendre sa place après une coupure, en silence.
 *
 * Chaque reconnexion ouvre un WebSocket que le serveur ne rattache à personne :
 * il faut se réinscrire à la table, sinon on reste connecté sans plus rien
 * recevoir. Le jeton suffit : le pseudo n'est pas exigé (un stockage vidé ne
 * doit pas coûter la place) ; `lastSeq` demande les évènements manqués.
 *
 * Tant que la reprise n'est pas confirmée, le magasin dit `reprise` — le
 * bandeau l'affiche, les actions attendent. Un échec passager (silence,
 * quota, panne) se retente après 1, 2 puis 4 s ; au-delà, `echec`, et c'est
 * la prochaine reconnexion ou un geste du joueur qui relance. Un refus
 * définitif oublie la table (`placePerdue`).
 *
 * Renvoie `true` si la place a été reprise.
 */
export async function reprendrePlace(code: string): Promise<boolean> {
  const store = useStore.getState();
  const jeton = loadToken(code);
  if (jeton === undefined) {
    store.setRattachement('rattache');
    return false;
  }
  annulerReprise();
  const moi = generation;
  store.setRattachement('reprise');

  for (let essai = 0; ; essai += 1) {
    if (moi !== generation) return false;
    if (!canal().connected) {
      // La liaison est retombée : la reconnexion relancera la reprise.
      useStore.getState().setRattachement('perdu');
      return false;
    }
    try {
      const result = await canal().request<JoinResult>('room:join', {
        code,
        name: loadName(),
        token: jeton,
        lastSeq: dernierSeqPour(code),
      });
      if (moi !== generation) return false;
      saveToken(result.code, result.token);
      useStore.getState().setPlayerId(result.playerId);
      useStore.getState().setRattachement('rattache');
      return true;
    } catch (error) {
      if (moi !== generation) return false;
      const refus = codeDuRefus(error);
      if (refus === 'version') {
        rechargerPourVersion();
        return false;
      }
      if (refus !== undefined && REFUS_DEFINITIFS.has(refus)) {
        placePerdue(code, refus);
        return false;
      }
      if (!canal().connected) {
        useStore.getState().setRattachement('perdu');
        return false;
      }
      const passager = refus === undefined || REFUS_PASSAGERS.has(refus);
      const attente = DELAIS_REPRISE_MS[essai];
      if (!passager || attente === undefined) {
        useStore.getState().setRattachement('echec');
        notify(error);
        return false;
      }
      await attendre(attente);
    }
  }
}

/**
 * La place n'existe plus : la table a disparu, ou ne connaît plus ce jeton.
 * On oublie jeton et adresse, on revient à l'accueil, et on le dit.
 */
export function placePerdue(code: string, raison: string = 'gone'): void {
  annulerReprise();
  forgetToken(code);
  inscrireCodeDansLUrl(null);
  const store = useStore.getState();
  store.reset();
  store.pushNotice(
    raison === 'gone' ? 'La table a disparu.' : 'Votre place à cette table n’existe plus.',
    'error',
  );
}

/** La clé de session qui retient le dernier rechargement pour cause de version. */
const CLE_RECHARGEMENT = 'garoutom.rechargement-version';

/** Deux rechargements pour version à moins de cette durée : on n'insiste pas. */
const RECHARGEMENT_MIN_MS = 60_000;

/**
 * Le serveur ne parle plus la version de ce client (`CLOSE_VERSION`) :
 * recharger la page, qui ira chercher la bonne. Une seule fois par minute —
 * un cache qui sert encore l'ancienne version ne doit pas faire tourner la
 * page en boucle ; on le dit alors au joueur.
 */
export function rechargerPourVersion(): void {
  let dernier = 0;
  try {
    dernier = Number(sessionStorage.getItem(CLE_RECHARGEMENT) ?? 0);
  } catch {
    // Pas de stockage de session : on rechargera, une fois de plus.
  }
  if (Date.now() - dernier < RECHARGEMENT_MIN_MS) {
    useStore
      .getState()
      .pushNotice('Une nouvelle version de Garoutom est en ligne : rechargez la page.', 'error');
    return;
  }
  try {
    sessionStorage.setItem(CLE_RECHARGEMENT, String(Date.now()));
  } catch {
    // Idem.
  }
  try {
    globalThis.location.reload();
  } catch {
    // Un bac à sable qui refuse : l'avis suffira.
  }
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
  if (suspendu()) return;
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
  suspendu() ? Promise.resolve(undefined) : run(() => canal().request<null>('room:start', {}));

/** La revanche : l'hôte ramène la table au salon, mêmes options, présents seulement. */
export const revanche = (): Promise<null | undefined> =>
  suspendu() ? Promise.resolve(undefined) : run(() => canal().request<null>('room:rematch', {}));

export async function quitterTable(): Promise<void> {
  const code = useStore.getState().room?.code;
  annulerReprise();
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
  if (suspendu()) return;
  occupe = true;
  try {
    await run(() => canal().request<null>('game:action', { action }));
  } finally {
    occupe = false;
  }
}
