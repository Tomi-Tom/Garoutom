/**
 * Le serveur Node : la santé, le canal, et — s'il est construit — le client.
 *
 * `creerGaroutom` ne se met pas à l'écoute : elle rend le serveur nu avec ses
 * poignées (démarrage, arrêt gracieux, vidage), et c'est `index.ts` qui ouvre
 * le port. Rien d'autre ne vit ici que l'assemblage — le magasin, le
 * gestionnaire de tables, le concentrateur, le canal, le dossier statique — et
 * les services d'hôte de Node, que le Worker remplace par les siens
 * (`packages/worker/src/hote.ts`).
 *
 * Un seul port porte tout, dans cet ordre : la bascule WebSocket sur `/ws`
 * (tenue par `ws-node.ts`, avant même le gestionnaire HTTP), puis `/health`,
 * puis le client. C'est ce qui rend une soirée en réseau local possible sans
 * proxy ni second processus.
 *
 * Robustesse (D21-D23) : aucune URL n'est analysée sans filet, les délais
 * HTTP sont courts, et l'état des tables survit au redémarrage quand un
 * dossier de données est donné.
 */

import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type Server as HttpServer, type ServerResponse } from 'node:http';
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';

import { CLOSE_SERVER_RESTART, PROTOCOL_VERSION } from '@garoutom/engine';

import { MemoryRoomStore, type RoomStore } from './store.js';
import { Hub } from './hub.js';
import { RoomManager, type HostServices, type Room } from './rooms.js';
import { FileRoomStore, type EtatPersistance } from './store-fichier.js';
import { creerPlanificateur, lancerChienDeGarde } from './planif-node.js';
import { analyserUrl, ENTETES_SECURITE, servirStatique } from './static.js';
import { mountChannel, type Canal } from './ws-node.js';

/** Les délais et plafonds HTTP : un client lent ou bavard ne tient pas un fil. */
export const DELAI_ENTETES_MS = 10_000;
export const TAILLE_ENTETES_MAX = 8 * 1024;
export const CONNEXIONS_MAX = 500;
/** Temps laissé à l'arrêt gracieux pour fermer les sockets. */
export const DELAI_ARRET_MS = 1_500;

/**
 * Les services d'hôte de Node : l'horloge réelle, le générateur
 * cryptographique, et le réveil confié au planificateur (`planif-node.ts`).
 */
export function nodeHostServices(wake: HostServices['wake']): HostServices {
  return {
    now: () => Date.now(),
    uuid: () => randomUUID(),
    randomInt: (maxExclusive) => randomInt(maxExclusive),
    wake,
  };
}

export interface GaroutomServerOptions {
  /**
   * Le dossier du client buildé (`packages/client/dist`), ou `null` pour ne
   * servir que le canal — le cas du développement, où Vite sert la page.
   */
  client?: string | null;
  /**
   * Le dossier où persister les tables (`tables.json`), ou `null` pour les
   * garder en mémoire seulement. Seule `creerGaroutom` ouvre le disque.
   */
  donnees?: string | null;
  /** Origines WebSocket supplémentaires (`GAROUTOM_ORIGINES`). */
  origines?: readonly string[];
  /** Croire `x-forwarded-for` (`GAROUTOM_PROXY=1`). */
  proxy?: boolean;
  /** Période du ping de protocole (ms) — les tests la raccourcissent. */
  pingMs?: number;
  /** Période du chien de garde (ms). 10 s par défaut. */
  chienDeGardeMs?: number;
  /** Regroupement des écritures disque (ms). 300 par défaut. */
  delaiEcritureMs?: number;
}

/** Ce que le magasin disque offre en plus du contrat `RoomStore`. */
interface Persistance {
  etat(): EtatPersistance;
  vider(): Promise<void>;
  viderSync(): void;
}

export interface Garoutom {
  server: HttpServer;
  manager: RoomManager;
  canal: Canal;
  /** Recharge les tables du disque et lance le chien de garde — avant d'écouter. */
  demarrer(): Promise<void>;
  /**
   * L'arrêt gracieux : plus de nouvelle connexion, avis aux joueurs, vidage
   * synchrone, sockets fermées en `CLOSE_SERVER_RESTART`. Idempotent. Ne
   * quitte pas le processus : c'est à `index.ts`.
   */
  arreter(): Promise<void>;
  /** Vide la persistance de façon synchrone (sortie sur exception). */
  viderSync(): void;
}

function versionDuPaquet(): string {
  try {
    const brut = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    return (JSON.parse(brut) as { version?: string }).version ?? 'inconnue';
  } catch {
    return 'inconnue';
  }
}

export function createGaroutomServer(options: GaroutomServerOptions = {}): HttpServer {
  return assembler(options, new MemoryRoomStore<Room>(), null).server;
}

/** Comme `createGaroutomServer`, mais avec ses poignées, et le disque si `donnees` est donné. */
export async function creerGaroutom(options: GaroutomServerOptions = {}): Promise<Garoutom> {
  if (options.donnees) {
    const fichier = await FileRoomStore.ouvrir<Room>(options.donnees, {
      delaiMs: options.delaiEcritureMs,
    });
    return assembler(options, fichier, fichier);
  }
  return assembler(options, new MemoryRoomStore<Room>(), null);
}

function repondreSimple(response: ServerResponse, statut: number, corps = ''): void {
  if (!response.headersSent) {
    response.writeHead(statut, { 'content-type': 'text/plain; charset=utf-8', ...ENTETES_SECURITE });
  }
  response.end(corps);
}

function assembler(
  options: GaroutomServerOptions,
  store: RoomStore<Room>,
  persistance: Persistance | null,
): Garoutom {
  const hub = new Hub(randomUUID);
  // Le gestionnaire naît après le planificateur (il en a besoin pour `wake`),
  // mais le planificateur ne le touche qu'à l'échéance : lecture tardive.
  let manager!: RoomManager;
  const planif = creerPlanificateur(() => manager);
  manager = new RoomManager(hub, store, nodeHostServices(planif.wake.bind(planif)));
  hub.serve(manager);

  const statique = options.client ? servirStatique(options.client) : null;
  const version = versionDuPaquet();
  const debut = Date.now();

  async function sante(): Promise<string> {
    const { tables, sockets } = await manager.stats();
    const etat = persistance?.etat();
    return JSON.stringify({
      ok: true,
      version,
      protocole: PROTOCOL_VERSION,
      uptime: Math.round((Date.now() - debut) / 1000),
      tables,
      sockets,
      persistance: {
        active: persistance !== null,
        derniereEcritureMs: etat?.derniereEcritureMs ?? null,
      },
    });
  }

  const server = createServer({ maxHeaderSize: TAILLE_ENTETES_MAX }, (request, response) => {
    try {
      // `new URL` lève sur `//[` : sans ce filet, une requête tuait le processus.
      const url = analyserUrl(request.url);
      if (!url) {
        repondreSimple(response, 400, 'Requête illisible');
        return;
      }
      if (url.pathname === '/health') {
        sante().then(
          (corps) => {
            response.writeHead(200, {
              'content-type': 'application/json',
              'cache-control': 'no-store',
              ...ENTETES_SECURITE,
            });
            response.end(request.method === 'HEAD' ? undefined : corps);
          },
          (error: unknown) => {
            console.error('Santé en échec', error);
            repondreSimple(response, 503);
          },
        );
        return;
      }
      if (statique) {
        statique(request, response).catch((error: unknown) => {
          console.error('Fichier mal servi', error);
          repondreSimple(response, 500);
        });
        return;
      }
      repondreSimple(response, 404);
    } catch (error) {
      console.error('Requête mal traitée', error);
      repondreSimple(response, 500);
    }
  });
  server.requestTimeout = DELAI_ENTETES_MS;
  server.headersTimeout = DELAI_ENTETES_MS;
  server.maxConnections = CONNEXIONS_MAX;
  // Une requête malformée est refusée en 400 ; une socket qui claque pendant
  // ce temps ne doit pas remonter en exception.
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    else socket.destroy();
  });

  const canal = mountChannel(server, hub, {
    origines: options.origines,
    proxy: options.proxy,
    pingMs: options.pingMs,
  });

  let arretChien: (() => void) | null = null;
  let arret: Promise<void> | null = null;

  return {
    server,
    manager,
    canal,

    async demarrer() {
      await manager.restore();
      // Au même pas que le chien de garde des tables, le concentrateur ferme
      // les connexions restées trente secondes sans s'asseoir nulle part.
      arretChien = lancerChienDeGarde(
        () => ({
          watchdog: async () => {
            hub.sweep();
            await manager.watchdog();
          },
        }),
        options.chienDeGardeMs,
      );
    },

    arreter() {
      arret ??= (async () => {
        canal.refuser();
        server.close();
        planif.arreter();
        arretChien?.();
        canal.avertir('Le serveur redémarre, reprise automatique');
        // D'abord ce qu'on sait : si la suite traîne, la table est déjà sur disque.
        persistance?.viderSync();
        await canal.fermerTout(CLOSE_SERVER_RESTART, 'Le serveur redémarre', DELAI_ARRET_MS);
        // Les fermetures ont marqué les joueurs absents ; laisser les
        // écritures asynchrones du cœur se poser avant le dernier vidage.
        await new Promise((resolve) => setTimeout(resolve, 100));
        persistance?.viderSync();
        canal.arreter();
        server.closeAllConnections();
      })();
      return arret;
    },

    viderSync() {
      persistance?.viderSync();
    },
  };
}

/**
 * Les adresses où l'on peut joindre le serveur, à annoncer au démarrage.
 *
 * `localhost` pour soi, puis chaque IPv4 non interne : ce sont elles qu'on
 * dicte aux amis du même Wi-Fi. L'IPv6 est laissée de côté — personne ne
 * recopie `fe80::…` à voix haute.
 */
export function adressesEcoute(
  port: number,
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): { locale: string; reseau: string[] } {
  const reseau: string[] = [];
  for (const liste of Object.values(interfaces)) {
    for (const entree of liste ?? []) {
      if (entree.family === 'IPv4' && !entree.internal) {
        reseau.push(`http://${entree.address}:${String(port)}`);
      }
    }
  }
  return { locale: `http://localhost:${String(port)}`, reseau: [...new Set(reseau)] };
}
