/**
 * Le serveur Node : la santé, le canal, et — s'il est construit — le client.
 *
 * `createGaroutomServer` ne se met pas à l'écoute : elle rend le serveur nu,
 * et c'est `index.ts` qui ouvre le port. Rien d'autre ne vit ici que
 * l'assemblage — le magasin, le gestionnaire de tables, le concentrateur, le
 * canal, le dossier statique — et les services d'hôte de Node, que le Worker
 * remplace par les siens (`packages/worker/src/hote.ts`).
 *
 * Un seul port porte tout, dans cet ordre : `/health`, puis la bascule
 * WebSocket sur `/ws` (tenue par `ws-node.ts`, avant même le gestionnaire
 * HTTP), puis le client. C'est ce qui rend une soirée en réseau local possible
 * sans proxy ni second processus.
 */

import { randomInt, randomUUID } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';

import { MemoryRoomStore } from './store.js';
import { Hub } from './hub.js';
import { RoomManager, type HostServices, type Room, type TimerHandle } from './rooms.js';
import { servirStatique } from './static.js';
import { mountChannel } from './ws-node.js';

/**
 * Les services d'hôte de Node : l'horloge réelle, le générateur
 * cryptographique, et des minuteries qui ne maintiennent pas le processus en
 * vie à elles seules.
 */
export function nodeHostServices(): HostServices {
  return {
    now: () => Date.now(),
    uuid: () => randomUUID(),
    randomInt: (maxExclusive) => randomInt(maxExclusive),
    set: (run, delay) => {
      const timer = setTimeout(run, delay);
      (timer as { unref?: () => void }).unref?.();
      return timer;
    },
    clear: (handle: TimerHandle) => {
      clearTimeout(handle as NodeJS.Timeout);
    },
  };
}

export interface GaroutomServerOptions {
  /**
   * Le dossier du client buildé (`packages/client/dist`), ou `null` pour ne
   * servir que le canal — le cas du développement, où Vite sert la page.
   */
  client?: string | null;
}

export function createGaroutomServer(options: GaroutomServerOptions = {}): HttpServer {
  const hub = new Hub(randomUUID);
  const store = new MemoryRoomStore<Room>();
  const manager = new RoomManager(hub, store, nodeHostServices());
  hub.serve(manager);

  const statique = options.client ? servirStatique(options.client) : null;

  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname === '/health') {
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (statique) {
      statique(request, response).catch((error: unknown) => {
        console.error('Fichier mal servi', error);
        if (!response.headersSent) response.writeHead(500);
        response.end();
      });
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end();
  });

  mountChannel(server, hub);
  return server;
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
