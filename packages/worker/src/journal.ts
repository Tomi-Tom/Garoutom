/**
 * Le journal du Worker : une ligne JSON par fait (D24).
 *
 * Avec `[observability]` activé, Cloudflare range chaque `console.*` et sait
 * en lire les champs quand la ligne est un objet JSON : on filtre alors par
 * `evenement`, par `code` de table, par durée. Une phrase libre ne se filtre
 * pas ; un objet, si.
 *
 * Deux règles : **jamais de jeton** (ni celui d'un joueur, ni `ADMIN_TOKEN`),
 * et une erreur se réduit à son nom et son message — la pile, Cloudflare la
 * joint déjà quand elle remonte jusqu'au runtime.
 */

export type Niveau = 'info' | 'avert' | 'erreur';

/** Une erreur rendue racontable : son nom et son message, rien de plus. */
export function raconter(erreur: unknown): { nom: string; message: string } {
  if (erreur instanceof Error) return { nom: erreur.name, message: erreur.message };
  return { nom: typeof erreur, message: String(erreur) };
}

/** Écrit une ligne. Ne lève jamais : un journal qui tombe ne doit rien emporter. */
export function noter(niveau: Niveau, evenement: string, champs: Record<string, unknown> = {}): void {
  try {
    const ligne = JSON.stringify({ niveau, evenement, ...champs });
    if (niveau === 'erreur') console.error(ligne);
    else if (niveau === 'avert') console.warn(ligne);
    else console.log(ligne);
  } catch {
    /* un champ circulaire : tant pis pour cette ligne */
  }
}
