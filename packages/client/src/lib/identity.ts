/**
 * Identité locale : pseudo mémorisé, jetons de reconnexion par table.
 *
 * Le jeton est un secret. Il ne sert qu'à reprendre sa propre place après un
 * rechargement ou une coupure — ce que le serveur autorise pendant le délai de
 * grâce (`RECONNECT_GRACE_MS`) — et il ne quitte jamais cette machine autrement
 * que vers le serveur qui l'a émis. Jamais vers un autre joueur, jamais dans un
 * lien, jamais dans l'état du magasin.
 */

/**
 * L'identifiant du jeu dans le catalogue de la collection (`@tombp/arcade`).
 *
 * C'est lui que le lien de retour met dans l'adresse du hub, pour rouvrir le
 * rack sur cette cartouche et pas sur la première venue. Le pitch, le titre et
 * la palette de la cartouche vivent dans le catalogue, jamais recopiés ici.
 */
export const ARCADE_ID = 'TBP-012';

const CLE_NOM = 'garoutom.nom';
const CLE_JETONS = 'garoutom.jetons';

/**
 * Longueur maximale d’un pseudo, alignée sur la borne du serveur
 * (`MAX_NAME_LENGTH` de `packages/server/src/rooms.ts`) : au-delà, le serveur
 * couperait en silence ce que le champ aurait laissé taper.
 */
export const MAX_NAME_LENGTH = 16;

function lire<T>(cle: string, repli: T): T {
  try {
    const brut = localStorage.getItem(cle);
    if (brut === null) return repli;
    const valeur: unknown = JSON.parse(brut);
    return valeur as T;
  } catch {
    return repli;
  }
}

function ecrire(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Navigation privée ou stockage plein : le jeu reste jouable, seules la
    // mémoire du pseudo et la reprise automatique de place sont perdues.
  }
}

export function loadName(): string {
  const nom = lire<unknown>(CLE_NOM, '');
  return typeof nom === 'string' ? nom : '';
}

export function saveName(nom: string): void {
  ecrire(CLE_NOM, nom);
}

function lireJetons(): Record<string, string> {
  const tous = lire<unknown>(CLE_JETONS, {});
  if (typeof tous !== 'object' || tous === null) return {};
  const jetons: Record<string, string> = {};
  for (const [code, jeton] of Object.entries(tous)) {
    if (typeof jeton === 'string') jetons[code] = jeton;
  }
  return jetons;
}

export function loadToken(code: string): string | undefined {
  return lireJetons()[code.toUpperCase()];
}

export function saveToken(code: string, jeton: string): void {
  const tous = lireJetons();
  tous[code.toUpperCase()] = jeton;
  ecrire(CLE_JETONS, tous);
}

/** Oublie une table qu'on vient de quitter volontairement. */
export function forgetToken(code: string): void {
  const tous = lireJetons();
  delete tous[code.toUpperCase()];
  ecrire(CLE_JETONS, tous);
}
