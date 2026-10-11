/**
 * Le canal natif, monté sur un serveur HTTP Node.
 *
 * C'est l'unique fichier du paquet qui connaît `ws` : le branchement vit
 * ici et nulle part ailleurs, pour que le cœur des tables (store, rooms,
 * hub) se transpose au Worker sans une ligne de différence. Le jour où les
 * tables déménagent dans un Durable Object, seul ce fichier est remplacé.
 */

import type { Server as HttpServer } from 'node:http';

import { WebSocketServer, type WebSocket } from 'ws';

import { CHANNEL_PATH, MAX_FRAME_BYTES } from '@garoutom/engine';

import type { Hub } from './hub.js';

/**
 * Ouvre le canal sur le serveur donné.
 *
 * `noServer` plutôt qu'un port à soi : c'est le serveur HTTP qui tient la
 * bascule de protocole, et nous n'acceptons la bascule que sur notre chemin —
 * un seul chemin, et il s'appelle `/ws`.
 */
export function mountChannel(httpServer: HttpServer, hub: Hub, path = CHANNEL_PATH): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => {
      attach(hub, client);
    });
  });
}

function attach(hub: Hub, client: WebSocket): void {
  const session = hub.attach({
    send: (data) => {
      // Une socket qui se ferme pendant qu'on lui parle n'est pas une erreur.
      if (client.readyState === client.OPEN) client.send(data);
    },
    close: () => {
      client.close();
    },
  });

  client.on('message', (raw: unknown) => {
    void session.receive(String(raw)).catch((error: unknown) => {
      console.error('Message mal traité', error);
    });
  });

  client.on('close', () => {
    void session.close().catch((error: unknown) => {
      console.error('Fermeture mal refermée', error);
    });
  });

  client.on('error', (error: Error) => {
    console.error('Canal en erreur', error.message);
  });
}
