/**
 * Le serveur de développement : HTTP pour la santé, WebSocket pour le jeu.
 *
 * `createGaroutomServer` ne se met pas à l'écoute : elle rend le serveur nu,
 * et c'est `index.ts` qui ouvre le port. Rien d'autre ne vit ici que
 * l'assemblage — le magasin, le gestionnaire de tables, le concentrateur, le
 * canal — et les services d'hôte de Node, que le Worker remplacera par les
 * siens.
 */

import { randomInt, randomUUID } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';

import { MemoryRoomStore } from './store.js';
import { Hub } from './hub.js';
import { RoomManager, type HostServices, type Room, type TimerHandle } from './rooms.js';
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

export function createGaroutomServer(): HttpServer {
  const hub = new Hub(randomUUID);
  const store = new MemoryRoomStore<Room>();
  const manager = new RoomManager(hub, store, nodeHostServices());
  hub.serve(manager);

  const server = createServer((request, response) => {
    if ((request.url ?? '/') === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end();
  });

  mountChannel(server, hub);
  return server;
}
