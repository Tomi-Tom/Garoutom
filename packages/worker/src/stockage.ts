/**
 * Le magasin des tables, dans la base SQLite du Durable Object (D21).
 *
 * L'état rangé est la seule vérité : un déploiement ferme toutes les sockets
 * et repart d'une mémoire vierge, une éviction aussi. Tout ce qu'une table
 * doit retrouver vit donc ici, dans `ctx.storage.sql` — synchrone, local à
 * l'objet, écrit avant que la moindre réponse ne quitte l'objet (la « porte
 * de sortie » du runtime retient les envois tant que l'écriture n'est pas
 * confirmée). Ce qui est en mémoire n'est qu'un cache.
 *
 * ## Le schéma
 *
 * - `meta(cle, valeur)` — petites valeurs de service : `schema_version`, et
 *   ce que le planificateur garde d'un réveil à l'autre (heure de l'alarme
 *   armée, dernier retard mesuré, prochain balayage) ;
 * - `rooms(code, status, schema, updated_at, data)` — une table de jeu par
 *   ligne ; `data` est le JSON de la `Room`, les autres colonnes en sont des
 *   extraits pour les statistiques et le dépannage ;
 * - `wakeups(code, at, essais)` — les réveils demandés par le cœur (voir
 *   `planificateur.ts`).
 *
 * Les migrations sont idempotentes (`CREATE … IF NOT EXISTS`) et rejouées à
 * chaque construction de l'objet : c'est le moins cher des contrôles, et il
 * ne dépend d'aucune mémoire. Une évolution future s'ajoute comme une étape
 * `schema_version` n → n + 1 dans `MIGRATIONS`, jamais en modifiant une
 * étape déjà déployée.
 */

import type { RoomStore } from '@garoutom/server';

/** Le curseur d'une requête : on ne s'en sert que pour tout lire d'un coup. */
export interface CurseurSql {
  toArray(): Record<string, SqlStorageValue>[];
}

/**
 * Ce qu'il faut du stockage de l'objet : la base SQL et ses transactions.
 *
 * `DurableObjectStorage` le satisfait tel quel ; sous Node, une doublure
 * adossée à `node:sqlite` aussi (voir `doublures.test-utils.ts`).
 */
export interface StockageSql {
  readonly sql: { exec(requete: string, ...valeurs: SqlStorageValue[]): CurseurSql };
  transactionSync<T>(geste: () => T): T;
}

/** La version du schéma que ce code sait lire et écrire. */
export const SCHEMA_STOCKAGE = 1;

/** Les étapes de migration, de la version `n - 1` à la version `n` (index `n - 1`). */
const MIGRATIONS: readonly (readonly string[])[] = [
  [
    `CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, valeur TEXT)`,
    `CREATE TABLE IF NOT EXISTS rooms (
       code TEXT PRIMARY KEY,
       status TEXT,
       schema INTEGER,
       updated_at INTEGER NOT NULL,
       data TEXT NOT NULL
     )`,
    `CREATE INDEX IF NOT EXISTS rooms_par_statut ON rooms (status)`,
    `CREATE TABLE IF NOT EXISTS wakeups (
       code TEXT PRIMARY KEY,
       at INTEGER NOT NULL,
       essais INTEGER NOT NULL DEFAULT 0
     )`,
    `CREATE INDEX IF NOT EXISTS wakeups_par_echeance ON wakeups (at)`,
  ],
];

/** Lit une valeur de `meta`, ou `null`. */
export function lireMeta(stockage: StockageSql, cle: string): string | null {
  const ligne = stockage.sql.exec('SELECT valeur FROM meta WHERE cle = ?', cle).toArray()[0];
  const valeur = ligne?.valeur;
  return typeof valeur === 'string' ? valeur : null;
}

/** Écrit (ou efface, avec `null`) une valeur de `meta`. */
export function ecrireMeta(stockage: StockageSql, cle: string, valeur: string | number | null): void {
  if (valeur === null) {
    stockage.sql.exec('DELETE FROM meta WHERE cle = ?', cle);
    return;
  }
  stockage.sql.exec(
    'INSERT INTO meta (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur',
    cle,
    String(valeur),
  );
}

/** Une valeur numérique de `meta`, ou `null`. */
export function lireMetaNombre(stockage: StockageSql, cle: string): number | null {
  const brut = lireMeta(stockage, cle);
  if (brut === null) return null;
  const nombre = Number(brut);
  return Number.isFinite(nombre) ? nombre : null;
}

/**
 * Amène la base à `SCHEMA_STOCKAGE`. Idempotent ; chaque étape dans sa
 * transaction, pour qu'une migration interrompue ne laisse rien à moitié.
 *
 * Une base **plus récente** que ce code (retour arrière d'un déploiement) est
 * laissée telle quelle : on ne descend jamais un schéma. Les colonnes que ce
 * code connaît y sont toujours — une migration ajoute, elle ne retire pas.
 */
export function migrer(stockage: StockageSql): number {
  // `meta` d'abord, hors transaction : c'est elle qui dit où l'on en est.
  stockage.sql.exec(MIGRATIONS[0]?.[0] ?? '');
  const actuelle = lireMetaNombre(stockage, 'schema_version') ?? 0;
  for (let version = actuelle + 1; version <= SCHEMA_STOCKAGE; version += 1) {
    stockage.transactionSync(() => {
      for (const requete of MIGRATIONS[version - 1] ?? []) stockage.sql.exec(requete);
      ecrireMeta(stockage, 'schema_version', version);
    });
  }
  return Math.max(actuelle, SCHEMA_STOCKAGE);
}

/** Les champs d'une table que l'on extrait en colonnes, lus sans rien supposer. */
function extraits(table: unknown, maintenant: number): { status: string | null; schema: number | null; misAJour: number } {
  const objet = typeof table === 'object' && table !== null ? (table as Record<string, unknown>) : {};
  const { status, schema, updatedAt } = objet;
  return {
    status: typeof status === 'string' ? status : null,
    schema: typeof schema === 'number' && Number.isFinite(schema) ? schema : null,
    misAJour: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : maintenant,
  };
}

/**
 * Le magasin SQL des tables, avec un cache des tables déjà lues.
 *
 * Le cache tient les tables **telles qu'elles sont relues** (après un aller-
 * retour JSON), et l'on n'en rend jamais que des copies : le cœur peut
 * modifier ce qu'il a chargé sans que rien ne s'écrive tout seul — la règle
 * de `MemoryRoomStore`. L'objet est l'unique écrivain de sa base, le cache ne
 * peut donc pas se périmer ; il meurt avec l'instance, et c'est très bien.
 */
export class SqlRoomStore<T = unknown> implements RoomStore<T> {
  private readonly cache = new Map<string, T>();

  constructor(
    private readonly stockage: StockageSql,
    private readonly maintenant: () => number = () => Date.now(),
  ) {
    migrer(stockage);
  }

  has(code: string): Promise<boolean> {
    if (this.cache.has(code)) return Promise.resolve(true);
    const ligne = this.stockage.sql.exec('SELECT 1 AS present FROM rooms WHERE code = ?', code).toArray()[0];
    return Promise.resolve(ligne !== undefined);
  }

  load(code: string): Promise<T | null> {
    try {
      const connue = this.cache.get(code);
      if (connue !== undefined) return Promise.resolve(structuredClone(connue));
      const ligne = this.stockage.sql.exec('SELECT data FROM rooms WHERE code = ?', code).toArray()[0];
      if (ligne === undefined) return Promise.resolve(null);
      const { data } = ligne;
      // Une ligne illisible n'est pas une table disparue : on lève plutôt que
      // de répondre `null`, qui ferait oublier son jeton à chaque joueur. La
      // ligne reste en place pour qu'on puisse la lire à la main.
      if (typeof data !== 'string') throw new Error(`Table ${code} : données illisibles`);
      const table = JSON.parse(data) as T;
      this.cache.set(code, table);
      return Promise.resolve(structuredClone(table));
    } catch (erreur) {
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  save(code: string, room: T): Promise<void> {
    try {
      const texte = JSON.stringify(room);
      const { status, schema, misAJour } = extraits(room, this.maintenant());
      this.stockage.sql.exec(
        `INSERT INTO rooms (code, status, schema, updated_at, data) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET status = excluded.status, schema = excluded.schema,
           updated_at = excluded.updated_at, data = excluded.data`,
        code,
        status,
        schema,
        misAJour,
        texte,
      );
      // Le cache garde la table relue, pas l'objet du cœur : mêmes surprises
      // qu'au rechargement (un `undefined` disparaît, une date devient texte).
      this.cache.set(code, JSON.parse(texte) as T);
      return Promise.resolve();
    } catch (erreur) {
      this.cache.delete(code);
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  remove(code: string): Promise<void> {
    this.cache.delete(code);
    this.stockage.sql.exec('DELETE FROM rooms WHERE code = ?', code);
    return Promise.resolve();
  }

  count(): Promise<number> {
    const ligne = this.stockage.sql.exec('SELECT COUNT(*) AS n FROM rooms').toArray()[0];
    return Promise.resolve(Number(ligne?.n ?? 0));
  }

  codes(): Promise<string[]> {
    const lignes = this.stockage.sql.exec('SELECT code FROM rooms ORDER BY code').toArray();
    return Promise.resolve(lignes.map((ligne) => String(ligne.code)));
  }

  /** Y a-t-il au moins une table rangée ? Synchrone : le planificateur s'en sert pour réarmer. */
  aDesTables(): boolean {
    return this.stockage.sql.exec('SELECT 1 AS present FROM rooms LIMIT 1').toArray().length > 0;
  }

  /** Le nombre de tables par statut, lu dans la base (pour `/health?profond=1`). */
  parStatut(): Record<string, number> {
    const lignes = this.stockage.sql
      .exec('SELECT COALESCE(status, ?) AS status, COUNT(*) AS n FROM rooms GROUP BY 1', 'inconnu')
      .toArray();
    const compte: Record<string, number> = { lobby: 0, playing: 0, finished: 0 };
    for (const ligne of lignes) compte[String(ligne.status)] = Number(ligne.n);
    return compte;
  }

  /** Oublie le cache — l'équivalent d'un réveil sur une mémoire vierge (tests). */
  oublier(): void {
    this.cache.clear();
  }
}
