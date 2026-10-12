/**
 * Les doublures du runtime Cloudflare, pour éprouver l'objet sous Node.
 *
 * Pourquoi pas `@cloudflare/vitest-pool-workers` (tests sous workerd) : la
 * version courante exige Vitest 4, le dépôt est sur Vitest 3, et la dernière
 * version compatible Vitest 3 embarque un workerd plus ancien que notre date
 * de compatibilité. Plutôt que de tirer le dépôt vers Vitest 4 au milieu d'un
 * chantier à quatre lots, on double ce que l'objet touche — et l'on éprouve
 * le vrai runtime avec `wrangler dev` (voir le rapport du lot B).
 *
 * - **La base** est une vraie SQLite : `node:sqlite` (Node ≥ 22), derrière
 *   l'interface de `ctx.storage.sql`. Mêmes requêtes, même SQL, mêmes
 *   contraintes — seule la machine change.
 * - **L'alarme** est une valeur notée : on la lit, on la fait sonner à la main.
 * - **Les sockets** gardent ce qu'on leur envoie et leur attachement (copié,
 *   comme le runtime le sérialise).
 *
 * Une « hibernation » se simule en construisant un **nouvel** objet sur le
 * même `FauxCtx` (mêmes sockets, même base, mémoire neuve) ; un
 * « déploiement », sur un `FauxCtx` neuf qui partage seulement la base.
 */

import type { SocketHibernable } from '../annuaire.js';
import type { StockageAlarme } from '../planificateur.js';
import type { CurseurSql } from '../stockage.js';

interface Instruction {
  all(...valeurs: unknown[]): Record<string, unknown>[];
}
interface BaseNode {
  prepare(requete: string): Instruction;
  exec(requete: string): void;
}

/** `node:sqlite`, chargé par un nom calculé : le typage du Worker ne connaît pas Node. */
async function ouvrirBase(): Promise<BaseNode> {
  const nom = 'node:sqlite';
  const module = (await import(/* @vite-ignore */ nom)) as { DatabaseSync: new (chemin: string) => BaseNode };
  return new module.DatabaseSync(':memory:');
}

/** Le stockage d'un objet : SQL réel, transactions, alarme notée. */
export class FauxStockage implements StockageAlarme {
  alarme: number | null = null;
  /** Chaque écriture d'alarme, dans l'ordre (`null` : effacement). */
  readonly ecrituresAlarme: (number | null)[] = [];
  readonly sql: { exec(requete: string, ...valeurs: SqlStorageValue[]): CurseurSql };

  private constructor(private readonly base: BaseNode) {
    this.sql = {
      exec: (requete, ...valeurs) => {
        const lignes = this.base.prepare(requete).all(...valeurs);
        // Le runtime rend des objets ordinaires ; `node:sqlite` des objets sans prototype.
        const copies = lignes.map((ligne) => ({ ...ligne }) as Record<string, SqlStorageValue>);
        return { toArray: () => copies };
      },
    };
  }

  static async ouvrir(): Promise<FauxStockage> {
    return new FauxStockage(await ouvrirBase());
  }

  transactionSync<T>(geste: () => T): T {
    this.base.exec('BEGIN');
    try {
      const resultat = geste();
      this.base.exec('COMMIT');
      return resultat;
    } catch (erreur) {
      this.base.exec('ROLLBACK');
      throw erreur;
    }
  }

  setAlarm(heure: number): Promise<void> {
    this.alarme = heure;
    this.ecrituresAlarme.push(heure);
    return Promise.resolve();
  }

  deleteAlarm(): Promise<void> {
    this.alarme = null;
    this.ecrituresAlarme.push(null);
    return Promise.resolve();
  }

  getAlarm(): Promise<number | null> {
    return Promise.resolve(this.alarme);
  }
}

/** Une socket côté serveur : elle garde tout ce qu'on lui dit. */
export class FausseSocket implements SocketHibernable {
  readyState = 1;
  /** Les cadres reçus par le client, décodés. */
  readonly recus: Record<string, unknown>[] = [];
  fermeture: { code: number | undefined; raison: string | undefined } | null = null;
  private attachement: unknown = null;

  send(message: string): void {
    if (this.readyState !== 1) throw new Error('Socket fermée');
    this.recus.push(JSON.parse(message) as Record<string, unknown>);
  }

  close(code?: number, raison?: string): void {
    if (this.readyState === 3) throw new Error('Déjà fermée');
    this.readyState = 3;
    this.fermeture = { code, raison };
  }

  serializeAttachment(valeur: unknown): void {
    const texte = JSON.stringify(valeur);
    if (texte.length > 16_384) throw new Error('Attachement trop gros');
    this.attachement = JSON.parse(texte) as unknown;
  }

  deserializeAttachment(): unknown {
    return structuredClone(this.attachement);
  }

  /** Les cadres d'un type donné. */
  cadres(t: string): Record<string, unknown>[] {
    return this.recus.filter((cadre) => cadre.t === t);
  }
}

/** Le `ctx` d'un objet : le stockage, les sockets hibernables et leurs étiquettes. */
export class FauxCtx {
  readonly sockets: { socket: FausseSocket; etiquettes: string[] }[] = [];
  autoReponse: unknown = null;

  constructor(readonly storage: FauxStockage) {}

  acceptWebSocket(socket: FausseSocket, etiquettes: string[] = []): void {
    this.sockets.push({ socket, etiquettes });
  }

  getWebSockets(etiquette?: string): FausseSocket[] {
    return this.sockets
      .filter(({ socket, etiquettes }) => socket.readyState !== 3 && (etiquette === undefined || etiquettes.includes(etiquette)))
      .map(({ socket }) => socket);
  }

  getTags(socket: FausseSocket): string[] {
    const trouvee = this.sockets.find((entree) => entree.socket === socket);
    if (!trouvee) throw new Error('Socket inconnue');
    return trouvee.etiquettes;
  }

  setWebSocketAutoResponse(paire?: unknown): void {
    this.autoReponse = paire ?? null;
  }

  getWebSocketAutoResponseTimestamp(): Date | null {
    return null;
  }

  blockConcurrencyWhile<T>(geste: () => Promise<T>): Promise<T> {
    return geste();
  }

  /** Vu comme le runtime le présente à l'objet. */
  commeEtat(): DurableObjectState {
    return this as unknown as DurableObjectState;
  }
}
