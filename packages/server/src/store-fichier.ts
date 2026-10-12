/**
 * Le magasin sur disque : les tables survivent au redémarrage (D21).
 *
 * Tout vit en mémoire, comme avant ; ce fichier ajoute seulement la trace.
 * Chaque `save`/`remove` marque le magasin « sale », et une écriture est
 * programmée 300 ms plus tard — dix coups en rafale font une écriture, pas
 * dix. L'écriture est **atomique** :
 *
 * 1. `tables.json.tmp` est écrit en entier, puis `fsync` ;
 * 2. l'ancien `tables.json` est copié en `tables.json.bak` ;
 * 3. `rename` du `.tmp` sur `tables.json` (atomique sur un même volume).
 *
 * Un arrêt brutal laisse donc toujours un fichier complet : le nouveau, ou
 * l'ancien. Au chargement, si `tables.json` est illisible, on retombe sur le
 * `.bak`. Sous Windows, `rename` échoue parfois en `EPERM`/`EBUSY` quand un
 * antivirus ou l'indexeur tient le fichier une seconde : on réessaie.
 *
 * Le fichier contient les **jetons** des joueurs : dossier en 0700, fichiers
 * en 0600 (sous Windows ces modes sont ignorés ; le dossier de données vit
 * dans le profil de l'utilisateur, déjà fermé aux autres comptes).
 */

import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { RoomStore } from './store.js';

/** Version du format du fichier — pas celle des tables (`Room.schema`). */
const FORMAT = 1;
const DELAI_ECRITURE_MS = 300;
const ERREURS_REESSAYABLES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const ESSAIS_RENAME = 8;

export interface OptionsFichier {
  /** Regroupement des écritures (ms). 300 par défaut. */
  delaiMs?: number;
  /** Où journaliser (les tests le font taire). */
  journal?: (message: string, erreur?: unknown) => void;
  /** Horloge, pour `derniereEcritureMs`. */
  now?: () => number;
}

export interface EtatPersistance {
  /** Toujours vrai pour ce magasin ; `/health` le contraste avec `false` (mémoire seule). */
  active: true;
  /** Instant (ms, époque) de la dernière écriture réussie, ou `null`. */
  derniereEcritureMs: number | null;
  /** Le message de la dernière écriture ratée, effacé à la suivante réussie. */
  erreur: string | null;
}

interface Contenu<T> {
  format: number;
  tables: Record<string, T>;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pauseSynchrone(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function codeDe(erreur: unknown): string | undefined {
  return (erreur as NodeJS.ErrnoException | null)?.code;
}

export class FileRoomStore<T> implements RoomStore<T> {
  private readonly tables = new Map<string, T>();
  private readonly fichier: string;
  private readonly tmp: string;
  private readonly bak: string;
  private readonly delaiMs: number;
  private readonly journal: (message: string, erreur?: unknown) => void;
  private readonly now: () => number;

  private sale = false;
  private minuterie: NodeJS.Timeout | null = null;
  /** L'écriture asynchrone en cours : les écritures ne se chevauchent jamais. */
  private enCours: Promise<void> | null = null;
  private derniere: number | null = null;
  private erreur: string | null = null;

  private constructor(
    readonly dossier: string,
    options: OptionsFichier,
  ) {
    this.fichier = join(dossier, 'tables.json');
    this.tmp = join(dossier, 'tables.json.tmp');
    this.bak = join(dossier, 'tables.json.bak');
    this.delaiMs = options.delaiMs ?? DELAI_ECRITURE_MS;
    this.journal =
      options.journal ??
      ((message, erreur) => {
        console.error(`[persistance] ${message}`, erreur ?? '');
      });
    this.now = options.now ?? Date.now;
  }

  /** Ouvre (et crée au besoin) le dossier, puis charge ce qu'il contient. */
  static async ouvrir<T>(dossier: string, options: OptionsFichier = {}): Promise<FileRoomStore<T>> {
    await mkdir(dossier, { recursive: true, mode: 0o700 });
    const magasin = new FileRoomStore<T>(dossier, options);
    await magasin.charger();
    return magasin;
  }

  // ── chargement ─────────────────────────────────────────────────────────

  private async charger(): Promise<void> {
    for (const [nom, chemin] of [
      ['tables.json', this.fichier],
      ['tables.json.bak', this.bak],
    ] as const) {
      let texte: string;
      try {
        texte = await readFile(chemin, 'utf8');
      } catch (erreur) {
        if (codeDe(erreur) !== 'ENOENT') this.journal(`${nom} illisible`, erreur);
        continue;
      }
      try {
        const contenu = JSON.parse(texte) as Partial<Contenu<T>>;
        if (
          typeof contenu !== 'object' ||
          contenu === null ||
          typeof contenu.tables !== 'object' ||
          contenu.tables === null ||
          Array.isArray(contenu.tables)
        ) {
          throw new Error('forme inattendue');
        }
        for (const [code, table] of Object.entries(contenu.tables)) this.tables.set(code, table);
        if (nom !== 'tables.json') {
          this.journal(`tables.json absent ou corrompu : reprise depuis ${nom}`);
          this.sale = true; // réécrire un fichier principal sain
          this.programmer();
        }
        return;
      } catch (erreur) {
        this.journal(`${nom} corrompu`, erreur);
        // On garde la pièce à conviction plutôt que de l'écraser en silence.
        await rename(chemin, `${chemin}.corrompu-${String(this.now())}`).catch(() => undefined);
      }
    }
  }

  // ── le contrat RoomStore ───────────────────────────────────────────────

  has(code: string): Promise<boolean> {
    return Promise.resolve(this.tables.has(code));
  }

  load(code: string): Promise<T | null> {
    const trouvee = this.tables.get(code);
    return Promise.resolve(trouvee === undefined ? null : structuredClone(trouvee));
  }

  save(code: string, room: T): Promise<void> {
    this.tables.set(code, structuredClone(room));
    this.marquer();
    return Promise.resolve();
  }

  remove(code: string): Promise<void> {
    if (this.tables.delete(code)) this.marquer();
    return Promise.resolve();
  }

  count(): Promise<number> {
    return Promise.resolve(this.tables.size);
  }

  codes(): Promise<string[]> {
    return Promise.resolve([...this.tables.keys()]);
  }

  /** Pour `/health`. */
  etat(): EtatPersistance {
    return { active: true, derniereEcritureMs: this.derniere, erreur: this.erreur };
  }

  // ── écriture ───────────────────────────────────────────────────────────

  private marquer(): void {
    this.sale = true;
    this.programmer();
  }

  private programmer(): void {
    if (this.minuterie || this.enCours) return; // la fin de l'écriture en cours reprogramme
    this.minuterie = setTimeout(() => {
      this.minuterie = null;
      void this.ecrire();
    }, this.delaiMs);
    this.minuterie.unref();
  }

  private contenu(): string {
    const tables: Record<string, T> = {};
    for (const [code, table] of this.tables) tables[code] = table;
    return JSON.stringify({ format: FORMAT, tables } satisfies Contenu<T>);
  }

  private async ecrire(): Promise<void> {
    if (this.enCours) return this.enCours;
    if (!this.sale) return;
    this.enCours = this.ecritureAtomique().finally(() => {
      this.enCours = null;
      if (this.sale) this.programmer();
    });
    return this.enCours;
  }

  private async ecritureAtomique(): Promise<void> {
    this.sale = false;
    const texte = this.contenu();
    try {
      await mkdir(this.dossier, { recursive: true, mode: 0o700 });
      const poignee = await open(this.tmp, 'w', 0o600);
      try {
        await poignee.writeFile(texte, 'utf8');
        await poignee.sync();
      } finally {
        await poignee.close();
      }
      if (existsSync(this.fichier)) await copyFile(this.fichier, this.bak).catch(() => undefined);
      await this.renommer();
      this.derniere = this.now();
      this.erreur = null;
    } catch (erreur) {
      this.sale = true; // on réessaiera à la prochaine écriture
      this.erreur = erreur instanceof Error ? erreur.message : String(erreur);
      this.journal('écriture ratée', erreur);
      await rm(this.tmp, { force: true }).catch(() => undefined);
    }
  }

  private async renommer(): Promise<void> {
    for (let essai = 1; ; essai++) {
      try {
        await rename(this.tmp, this.fichier);
        return;
      } catch (erreur) {
        if (!ERREURS_REESSAYABLES.has(codeDe(erreur) ?? '') || essai >= ESSAIS_RENAME) throw erreur;
        await pause(20 * essai);
      }
    }
  }

  /** Écrit tout ce qui est en attente, puis rend la main. */
  async vider(): Promise<void> {
    if (this.minuterie) {
      clearTimeout(this.minuterie);
      this.minuterie = null;
    }
    if (this.enCours) await this.enCours;
    while (this.sale) {
      await this.ecrire();
      if (this.erreur !== null) break; // pas de boucle sur un disque plein
    }
  }

  /**
   * Le même vidage, **synchrone** : pour l'arrêt du processus, où plus rien
   * d'asynchrone n'a le droit d'attendre. Un `rename` ou un `fsync` en cours
   * côté asynchrone n'est pas gênant : on réécrit tout depuis la mémoire.
   */
  viderSync(): void {
    if (this.minuterie) {
      clearTimeout(this.minuterie);
      this.minuterie = null;
    }
    if (!this.sale && !this.enCours) return;
    this.sale = false;
    try {
      mkdirSync(this.dossier, { recursive: true, mode: 0o700 });
      const fd = openSync(this.tmp, 'w', 0o600);
      try {
        writeSync(fd, this.contenu());
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      if (existsSync(this.fichier)) {
        try {
          copyFileSync(this.fichier, this.bak);
        } catch {
          // un .bak manquant vaut mieux qu'une sortie ratée
        }
      }
      for (let essai = 1; ; essai++) {
        try {
          renameSync(this.tmp, this.fichier);
          break;
        } catch (erreur) {
          if (!ERREURS_REESSAYABLES.has(codeDe(erreur) ?? '') || essai >= ESSAIS_RENAME) throw erreur;
          pauseSynchrone(20 * essai);
        }
      }
      this.derniere = this.now();
      this.erreur = null;
    } catch (erreur) {
      this.sale = true;
      this.erreur = erreur instanceof Error ? erreur.message : String(erreur);
      this.journal('vidage synchrone raté', erreur);
    }
  }

  /** Relit le fichier tel qu'il est sur disque (tests, diagnostic). */
  lireDisque(): unknown {
    return JSON.parse(readFileSync(this.fichier, 'utf8'));
  }
}
