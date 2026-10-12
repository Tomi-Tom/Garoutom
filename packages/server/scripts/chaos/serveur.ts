/**
 * Le serveur sous test, lancé en processus enfant : démarrage, santé,
 * mémoire, journal d'erreurs, arrêt brutal et redémarrage.
 *
 * Le serveur est lancé tel quel (`src/index.ts --canal-seul`), avec `tsx` et
 * la sonde (`sonde.ts`) en préchargement : c'est l'équivalent exact de
 * `npx tsx src/index.ts`, avec un canal IPC en plus pour mesurer la mémoire.
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface Mesure {
  t: number;
  rss: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  sockets: number;
  ressources: Record<string, number>;
}

/** Une ligne d'erreur remarquable du serveur. */
export interface IncidentServeur {
  t: number;
  motif: string;
  texte: string;
}

const MOTIFS_ERREUR: [RegExp, string][] = [
  [/Demande en échec/, 'exception-dans-une-demande'],
  [/Message mal traité/, 'message-mal-traite'],
  [/Fermeture mal refermée/, 'fermeture-mal-refermee'],
  [/Canal en erreur/, 'canal-en-erreur'],
  [/Unhandled|unhandled|UnhandledPromiseRejection/, 'rejet-non-rattrape'],
  [/RangeError|TypeError|ReferenceError/, 'erreur-js'],
];

/** Un port libre de la machine, jamais 3004 ni 5177. */
export async function portLibre(): Promise<number> {
  for (;;) {
    const port = await new Promise<number>((resolve, reject) => {
      const s = createServer();
      s.once('error', reject);
      s.listen(0, '127.0.0.1', () => {
        const adresse = s.address();
        const p = typeof adresse === 'object' && adresse ? adresse.port : 0;
        s.close(() => {
          resolve(p);
        });
      });
    });
    if (port !== 3004 && port !== 5177 && port > 0) return port;
  }
}

/** `/health` répond-il `{ ok: true }` en moins de `delai` ms ? */
export function sante(hote: string, port: number, delai = 2_000): Promise<boolean> {
  return new Promise((resolve) => {
    const requete = get({ host: hote, port, path: '/health', timeout: delai }, (reponse) => {
      let corps = '';
      reponse.on('data', (morceau: Buffer) => (corps += morceau.toString()));
      reponse.on('end', () => {
        resolve(reponse.statusCode === 200 && corps.includes('"ok":true'));
      });
    });
    requete.on('timeout', () => {
      requete.destroy();
      resolve(false);
    });
    requete.on('error', () => {
      resolve(false);
    });
  });
}

export class ServeurEnfant {
  private enfant: ChildProcess | null = null;
  private prochainId = 1;
  private readonly attentes = new Map<number, (m: Mesure) => void>();
  readonly incidents: IncidentServeur[] = [];
  readonly sortiesInattendues: { t: number; code: number | null; signal: string | null; dernieres: string[] }[] = [];
  private dernieresLignes: string[] = [];
  private arretVolontaire = false;
  demarrages = 0;

  constructor(
    readonly port: number,
    private readonly journaliser: (ligne: string) => void,
    /** Variables d'environnement en plus (`GAROUTOM_DATA`, `GAROUTOM_PROXY`…). */
    private readonly env: Record<string, string> = {},
    /**
     * Le Worker plutôt que Node : `wrangler dev` sur ce port, son état
     * (Durable Object, SQLite) rangé dans `etat` — le même à chaque relance.
     */
    private readonly wrangler: { etat: string } | null = null,
  ) {}

  /** La commande du serveur : Node (`src/index.ts`) avec la sonde, ou `wrangler dev`. */
  private commande(): { args: string[]; cwd: string; ipc: boolean } {
    if (this.wrangler) {
      const bin = fileURLToPath(new URL('../../../../node_modules/wrangler/bin/wrangler.js', import.meta.url));
      return {
        args: [bin, 'dev', '--port', String(this.port), '--ip', '127.0.0.1', '--persist-to', this.wrangler.etat, '--log-level', 'warn'],
        cwd: fileURLToPath(new URL('../../../worker/', import.meta.url)),
        ipc: false,
      };
    }
    const sonde = pathToFileURL(fileURLToPath(new URL('./sonde.ts', import.meta.url))).href;
    return {
      args: ['--import', 'tsx', '--import', sonde, 'src/index.ts', '--canal-seul'],
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      ipc: true,
    };
  }

  get pid(): number | null {
    return this.enfant?.pid ?? null;
  }

  get vivant(): boolean {
    return this.enfant !== null && this.enfant.exitCode === null && this.enfant.signalCode === null;
  }

  async demarrer(): Promise<void> {
    const { args, cwd, ipc } = this.commande();
    this.arretVolontaire = false;
    const enfant = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, PORT: String(this.port), HOST: '127.0.0.1', WRANGLER_SEND_METRICS: 'false', ...this.env },
      stdio: ipc ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.enfant = enfant;
    this.demarrages += 1;
    const lire = (flux: 'out' | 'err') => (morceau: Buffer) => {
      for (const ligne of morceau.toString().split(/\r?\n/)) {
        if (ligne.trim() === '') continue;
        this.dernieresLignes.push(ligne);
        if (this.dernieresLignes.length > 40) this.dernieresLignes.shift();
        this.journaliser(`[serveur ${flux}] ${ligne}`);
        for (const [motif, nom] of MOTIFS_ERREUR) {
          if (motif.test(ligne)) {
            this.incidents.push({ t: Date.now(), motif: nom, texte: ligne.slice(0, 400) });
            break;
          }
        }
      }
    };
    enfant.stdout?.on('data', lire('out'));
    enfant.stderr?.on('data', lire('err'));
    enfant.on('message', (brut: unknown) => {
      const m = brut as Partial<Mesure> & { type?: string; id?: number };
      if (m.type !== 'mesure' || typeof m.id !== 'number') return;
      const attente = this.attentes.get(m.id);
      this.attentes.delete(m.id);
      attente?.({
        t: Date.now(),
        rss: m.rss ?? 0,
        heapUsed: m.heapUsed ?? 0,
        external: m.external ?? 0,
        arrayBuffers: m.arrayBuffers ?? 0,
        sockets: m.sockets ?? 0,
        ressources: m.ressources ?? {},
      });
    });
    enfant.on('exit', (code, signal) => {
      if (!this.arretVolontaire) {
        this.sortiesInattendues.push({
          t: Date.now(),
          code,
          signal,
          dernieres: [...this.dernieresLignes],
        });
      }
    });

    const limite = Date.now() + (this.wrangler ? 120_000 : 30_000);
    while (Date.now() < limite) {
      if (!this.vivant) throw new Error(`Le serveur est mort au démarrage :\n${this.dernieresLignes.join('\n')}`);
      if (await sante('127.0.0.1', this.port, 1_000)) return;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('Le serveur ne répond pas sur /health');
  }

  /** Mémoire et sockets du processus serveur, ou `null` s'il ne répond pas. */
  mesurer(delai = 2_000): Promise<Mesure | null> {
    const enfant = this.enfant;
    if (!enfant || !this.vivant || !enfant.connected) return Promise.resolve(null);
    const id = this.prochainId++;
    return new Promise((resolve) => {
      const minuterie = setTimeout(() => {
        this.attentes.delete(id);
        resolve(null);
      }, delai);
      this.attentes.set(id, (m) => {
        clearTimeout(minuterie);
        resolve(m);
      });
      try {
        enfant.send({ type: 'mesure', id });
      } catch {
        clearTimeout(minuterie);
        this.attentes.delete(id);
        resolve(null);
      }
    });
  }

  /** Filet de sécurité à la sortie du banc : rien ne doit survivre. */
  tuerSync(): void {
    const enfant = this.enfant;
    if (!enfant || !this.vivant || enfant.pid === undefined) return;
    this.arretVolontaire = true;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      enfant.kill('SIGKILL');
    }
  }

  /**
   * L'arrêt gracieux (D21) : le message IPC `garoutom:arret` — Windows n'a pas
   * de SIGTERM —, puis on attend la sortie ; au-delà de `delai`, arrêt brutal.
   * Rend la durée de l'arrêt.
   */
  async arreterProprement(delai = 6_000): Promise<number> {
    const enfant = this.enfant;
    const debut = Date.now();
    if (!enfant || !this.vivant) return 0;
    this.arretVolontaire = true;
    try {
      enfant.send('garoutom:arret');
    } catch {
      await this.tuer();
      return Date.now() - debut;
    }
    const limite = Date.now() + delai;
    while (this.vivant && Date.now() < limite) await new Promise((r) => setTimeout(r, 50));
    if (this.vivant) await this.tuer();
    this.enfant = null;
    return Date.now() - debut;
  }

  /** Arrêt brutal de tout l'arbre de processus (Windows : taskkill /T /F). */
  async tuer(): Promise<void> {
    const enfant = this.enfant;
    if (!enfant) return;
    this.arretVolontaire = true;
    if (this.vivant && enfant.pid !== undefined) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        enfant.kill('SIGKILL');
      }
    }
    const limite = Date.now() + 5_000;
    while (this.vivant && Date.now() < limite) await new Promise((r) => setTimeout(r, 100));
    this.enfant = null;
  }
}
