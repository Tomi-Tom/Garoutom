/**
 * Le canal natif, monté sur un serveur HTTP Node.
 *
 * C'est l'unique fichier du paquet qui connaît `ws` : le branchement vit
 * ici et nulle part ailleurs, pour que le cœur des tables (store, rooms,
 * hub) se transpose au Worker sans une ligne de différence. Le jour où les
 * tables déménagent dans un Durable Object, seul ce fichier est remplacé.
 *
 * Ce que l'hôte Node ajoute au cœur (D22, D23) :
 *
 * - **rien ne tue le processus** : toute analyse d'URL est protégée, une
 *   bascule illisible détruit sa socket ;
 * - **limites** : `maxPayload` 16 Kio entrant, compression au-delà de 1 Kio,
 *   fermeture d'une socket dont la file d'envoi dépasse 1 Mio ;
 * - **version** : `?v=` négocié, hors plage on accepte puis on ferme en
 *   `CLOSE_VERSION` (le client sait alors recharger la page) ;
 * - **origine** : par défaut, celle de l'en-tête `Host` ; `GAROUTOM_ORIGINES`
 *   en ajoute d'autres. Une requête sans `Origin` (robots, outils) passe ;
 * - **IP** : `socket.remoteAddress`, ou `x-forwarded-for` seulement derrière
 *   un proxy déclaré (`GAROUTOM_PROXY=1`) — sinon n'importe qui l'invente ;
 * - **lien vivant** : un `ping` de protocole toutes les `SERVER_PING_MS`,
 *   `terminate()` pour qui n'a pas répondu avant le tour suivant.
 */

import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';

import { WebSocketServer, type WebSocket } from 'ws';

import {
  CHANNEL_PATH,
  CLOSE_TOO_BIG,
  CLOSE_VERSION,
  MAX_FRAME_BYTES,
  PROTOCOL_PARAM,
  SERVER_PING_MS,
  encodeFrame,
  negotiateProtocol,
} from '@garoutom/engine';

import type { Hub } from './hub.js';
import { analyserUrl } from './static.js';

/** Au-delà, le client ne lit plus : on le coupe plutôt que d'enfler en mémoire. */
export const TAMPON_MAX_OCTETS = 1024 * 1024;

export interface OptionsCanal {
  /** Le chemin du canal. `/ws` par défaut. */
  path?: string;
  /** Origines supplémentaires acceptées (`https://exemple.fr` ou `hote:port`). */
  origines?: readonly string[];
  /** Croire `x-forwarded-for` (derrière un proxy de confiance). */
  proxy?: boolean;
  /** Période du ping de protocole (ms). `SERVER_PING_MS` par défaut. */
  pingMs?: number;
}

/** La poignée que rend `mountChannel` : de quoi arrêter proprement. */
export interface Canal {
  /** Sockets ouvertes en ce moment. */
  readonly ouvertes: number;
  /** Refuse désormais toute nouvelle bascule (503). */
  refuser(): void;
  /** Envoie un avis à chaque socket ouverte (même cadre `notice` que le Hub). */
  avertir(message: string): void;
  /** Ferme chaque socket avec ce code ; rend quand toutes sont fermées (ou `delaiMs` écoulé). */
  fermerTout(code: number, raison: string, delaiMs: number): Promise<void>;
  /** Arrête le ping. */
  arreter(): void;
}

/** Liste lue dans `GAROUTOM_ORIGINES` : séparée par virgules ou espaces. */
export function lireListe(brut: string | undefined): string[] {
  return (brut ?? '')
    .split(/[\s,]+/)
    .map((entree) => entree.trim().toLowerCase().replace(/\/+$/, ''))
    .filter((entree) => entree !== '');
}

/**
 * L'origine d'une bascule est-elle acceptable ?
 *
 * Sans `Origin` : oui (pas un navigateur — un script hors navigateur peut de
 * toute façon tout écrire, il n'y a rien à protéger). Avec `Origin` : même
 * hôte que l'en-tête `Host`, ou présente dans la liste (origine complète ou
 * simple hôte).
 */
export function origineAcceptee(
  origine: string | undefined,
  hote: string | undefined,
  liste: readonly string[] = [],
): boolean {
  if (origine === undefined || origine === '') return true;
  const normale = origine.trim().toLowerCase().replace(/\/+$/, '');
  if (liste.includes(normale)) return true;
  let hoteOrigine: string;
  try {
    hoteOrigine = new URL(normale).host;
  } catch {
    return false; // « null », ou une valeur illisible
  }
  if (liste.includes(hoteOrigine)) return true;
  return hote !== undefined && hote.toLowerCase() === hoteOrigine;
}

/** L'adresse du client, normalisée (sans le préfixe IPv4-mappé). */
export function adresseClient(request: IncomingMessage, proxy: boolean): string | undefined {
  let brute: string | undefined;
  if (proxy) {
    const transmis = request.headers['x-forwarded-for'];
    const premier = (Array.isArray(transmis) ? transmis[0] : transmis)?.split(',')[0]?.trim();
    if (premier) brute = premier;
  }
  brute ??= request.socket.remoteAddress;
  return brute?.replace(/^::ffff:/i, '');
}

function refuser(socket: Duplex, statut: string): void {
  try {
    socket.write(`HTTP/1.1 ${statut}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  } catch {
    // la socket est peut-être déjà morte : rien à dire
  }
  socket.destroy();
}

interface Cliente {
  alive: boolean;
}

/**
 * Ouvre le canal sur le serveur donné.
 *
 * `noServer` plutôt qu'un port à soi : c'est le serveur HTTP qui tient la
 * bascule de protocole, et nous n'acceptons la bascule que sur notre chemin —
 * un seul chemin, et il s'appelle `/ws`.
 */
export function mountChannel(
  httpServer: HttpServer,
  hub: Hub,
  options: OptionsCanal = {},
): Canal {
  const path = options.path ?? CHANNEL_PATH;
  const origines = (options.origines ?? []).map((o) => o.trim().toLowerCase().replace(/\/+$/, ''));
  const proxy = options.proxy ?? false;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME_BYTES,
    perMessageDeflate: {
      threshold: 1024,
      zlibDeflateOptions: { level: 3 },
      serverNoContextTakeover: true,
      clientNoContextTakeover: true,
      concurrencyLimit: 10,
    },
  });
  const clientes = new Map<WebSocket, Cliente>();
  let ferme = false;

  httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Une socket qui claque avant la bascule émettrait `error` sans écouteur.
    socket.on('error', () => undefined);
    try {
      if (ferme) return refuser(socket, '503 Service Unavailable');

      const url = analyserUrl(request.url);
      if (!url) return refuser(socket, '400 Bad Request');
      if (url.pathname !== path) return refuser(socket, '404 Not Found');

      if (!origineAcceptee(request.headers.origin, request.headers.host, origines)) {
        return refuser(socket, '403 Forbidden');
      }

      const protocole = negotiateProtocol(url.searchParams.get(PROTOCOL_PARAM));
      const ip = adresseClient(request, proxy);

      wss.handleUpgrade(request, socket, head, (client) => {
        client.on('error', (error: Error) => {
          console.error('Canal en erreur', error.message);
        });
        if (protocole === null) {
          // On accepte puis on ferme : le navigateur ne voit un code de
          // fermeture que sur une bascule réussie.
          client.close(CLOSE_VERSION, 'Version du jeu trop ancienne : rechargez la page');
          return;
        }
        attach(hub, client, clientes, { ip, protocole });
      });
    } catch (error) {
      console.error('Bascule mal traitée', error);
      socket.destroy();
    }
  });

  // Le ping de protocole : le navigateur répond `pong` tout seul, sans que
  // l'application s'en mêle. Sans réponse en un tour, la socket est morte.
  const pingMs = options.pingMs ?? SERVER_PING_MS;
  const ping = setInterval(() => {
    for (const [client, etat] of clientes) {
      if (!etat.alive) {
        client.terminate();
        continue;
      }
      etat.alive = false;
      try {
        client.ping();
      } catch {
        client.terminate();
      }
    }
  }, pingMs);
  ping.unref();

  return {
    get ouvertes() {
      return clientes.size;
    },
    refuser() {
      ferme = true;
    },
    avertir(message) {
      const cadre = encodeFrame({ t: 'ev', e: 'notice', d: { message, tone: 'info' } });
      for (const client of clientes.keys()) {
        if (client.readyState === client.OPEN) client.send(cadre);
      }
    },
    fermerTout(code, raison, delaiMs) {
      const restantes = [...clientes.keys()];
      if (restantes.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let attente = restantes.length;
        const delai = setTimeout(() => {
          for (const client of restantes) client.terminate();
          resolve();
        }, delaiMs);
        for (const client of restantes) {
          client.once('close', () => {
            attente -= 1;
            if (attente === 0) {
              clearTimeout(delai);
              resolve();
            }
          });
          client.close(code, raison);
        }
      });
    },
    arreter() {
      clearInterval(ping);
    },
  };
}

function attach(
  hub: Hub,
  client: WebSocket,
  clientes: Map<WebSocket, Cliente>,
  contexte: { ip: string | undefined; protocole: number },
): void {
  const etat: Cliente = { alive: true };
  clientes.set(client, etat);

  const session = hub.attach({
    ip: contexte.ip,
    protocol: contexte.protocole,
    send: (data) => {
      // Une socket qui se ferme pendant qu'on lui parle n'est pas une erreur.
      if (client.readyState !== client.OPEN) return;
      // Un lecteur qui ne lit plus fait gonfler la file : on coupe.
      if (client.bufferedAmount > TAMPON_MAX_OCTETS) {
        client.close(CLOSE_TOO_BIG, 'Connexion trop lente');
        return;
      }
      client.send(data);
    },
    close: (code?: number, reason?: string) => {
      client.close(code, reason);
    },
  });

  client.on('pong', () => {
    etat.alive = true;
  });

  client.on('message', (raw: unknown) => {
    etat.alive = true;
    void session.receive(String(raw)).catch((error: unknown) => {
      console.error('Message mal traité', error);
    });
  });

  client.on('close', () => {
    clientes.delete(client);
    void session.close().catch((error: unknown) => {
      console.error('Fermeture mal refermée', error);
    });
  });
}
