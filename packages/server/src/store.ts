/**
 * Où vit une table.
 *
 * La v1 garde tout dans la mémoire du processus : le serveur de développement
 * n'a qu'une vie, et une table qui disparaît avec lui n'étonne personne. Mais
 * le jour où les tables déménagent dans un Durable Object, leur état devra
 * traverser une frontière sérialisable — et c'est derrière cette interface
 * qu'il vivra. Le cœur des tables (rooms.ts) ne parle donc qu'au magasin,
 * jamais à une Map en particulier.
 *
 * Deux règles gouvernent ce fichier :
 *
 * 1. **On lit et on écrit des copies.** Jamais une référence partagée. Le
 *    magasin en mémoire se comporte déjà comme un magasin distant, sans quoi
 *    les tests prouveraient quelque chose que la production ne fera pas.
 * 2. **Les codes sont la clé.** Un code de salon identifie une table pour
 *    toute sa vie, du premier « Ouvrir une table » au recyclage final.
 */

/** Ce qu'on range : une table, clé par son code. */
export interface RoomStore<T = unknown> {
  /** Ce code est-il pris, parmi les tables vivantes ? */
  has(code: string): Promise<boolean>;
  /** La table sous ce code, ou `null` si plus rien n'y vit. */
  load(code: string): Promise<T | null>;
  /** Range la table sous ce code, écrasant ce qui s'y trouvait. */
  save(code: string, room: T): Promise<void>;
  /** Recycle la table : son code redevient disponible. */
  remove(code: string): Promise<void>;
  /** Combien de tables vivantes — pour les garde-fous d'ouverture. */
  count(): Promise<number>;
}

/**
 * Le magasin d'une seule instance — le comportement de la v1.
 *
 * Copie comme le ferait un magasin distant : une table chargée est à celui
 * qui l'a chargée, et ce qu'il en fait ne s'écrit pas tout seul.
 */
export class MemoryRoomStore<T> implements RoomStore<T> {
  private readonly entries = new Map<string, T>();

  has(code: string): Promise<boolean> {
    return Promise.resolve(this.entries.has(code));
  }

  load(code: string): Promise<T | null> {
    const found = this.entries.get(code);
    return Promise.resolve(found === undefined ? null : structuredClone(found));
  }

  save(code: string, room: T): Promise<void> {
    this.entries.set(code, structuredClone(room));
    return Promise.resolve();
  }

  remove(code: string): Promise<void> {
    this.entries.delete(code);
    return Promise.resolve();
  }

  count(): Promise<number> {
    return Promise.resolve(this.entries.size);
  }
}
