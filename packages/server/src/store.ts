/**
 * Où vit une table.
 *
 * Depuis D21, une table survit à son processus : le serveur Node la range dans
 * des fichiers, le Worker dans le SQLite de son Durable Object. Le magasin en
 * mémoire reste celui des tests et du développement. Le cœur des tables
 * (rooms.ts) ne parle qu'à cette interface, jamais à une Map en particulier ;
 * chaque magasin passe la même suite de contrat (`store.contract.ts`).
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
  /** Tous les codes rangés — pour `restore()`, le chien de garde et le balayage. */
  codes(): Promise<string[]>;
}

/**
 * Le magasin d'une seule instance.
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

  codes(): Promise<string[]> {
    return Promise.resolve([...this.entries.keys()]);
  }
}
