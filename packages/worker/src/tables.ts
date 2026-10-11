/**
 * Toutes les tables de Garoutom dans un Durable Object.
 *
 * Raison d'être (D5) : **une partie de loup-garou dure des dizaines de
 * minutes**, et une fonction d'hébergement coupe la connexion au bout de
 * cinq. Un Durable Object n'a pas d'invocation, donc pas de plafond : la
 * connexion vit aussi longtemps que le joueur la tient. Le serveur reste
 * l'unique autorité, et le cœur qui tranche est exactement celui du serveur
 * Node — `RoomManager` et `Hub`, repris tels quels de `@garoutom/server`.
 *
 * ## Un objet pour toutes les tables, pas un par table
 *
 * Un objet par table serait le dessin canonique — un salon, un écrivain.
 * Mais le client ouvre son canal **avant** de connaître sa table : l'accueil
 * crée ou rejoint par le canal lui-même. Il faudrait revoir tout le flux pour
 * n'ouvrir la connexion qu'une fois le code connu. L'objet unique, atteint par
 * `idFromName('tables')`, évite ce détour : le gestionnaire multi-tables y
 * tourne tel quel, l'attribution des codes reste globale comme au serveur
 * Node, et le client n'a rien à apprendre. C'est le choix de la collection
 * (Yamstom, Belotom). L'objet est monofilaire : deux actions ne s'y croisent
 * jamais, la file par table de `rooms.ts` n'a plus rien à arbitrer.
 *
 * Si l'objet saturait un jour, la sortie est connue : répartir les tables sur
 * plusieurs objets selon la première lettre du code. Elle appartiendra à
 * `docs/DECISIONS.md`.
 *
 * ## Pourquoi `accept()` et pas l'hibernation
 *
 * L'API d'hibernation (`state.acceptWebSocket`) laisse l'objet s'endormir
 * entre deux messages en gardant les sockets ouvertes. Mais au réveil, la
 * mémoire est vierge : plus de concentrateur, plus de sessions, plus de
 * minuteries — tout ce que `RoomManager` et `Hub` tiennent en mémoire, et
 * que rien ne sait encore reconstruire. On prend donc `server.accept()`,
 * le branchement simple : l'objet reste éveillé tant qu'une connexion est
 * ouverte, et sa durée est comptée. Le palier gratuit couvre largement une
 * soirée de parties ; un onglet oublié ouvert des jours, beaucoup moins.
 *
 * L'hibernation demandera, le jour venu : des sessions retrouvées par les
 * étiquettes de socket (`getTags`), les tables dans le stockage de l'objet
 * plutôt qu'en mémoire, et les échéances confiées à une alarme (voir
 * `hote.ts`). Ni le protocole ni le client n'en seront touchés.
 *
 * ## Où vivent les tables
 *
 * En mémoire de l'objet (`MemoryRoomStore`), comme au serveur Node. Un
 * redéploiement ou une éviction efface donc les tables en cours. Un magasin
 * adossé à `state.storage` ne suffirait pas à les sauver : sans réarmement
 * des minuteries ni des sessions au réveil, une table rechargée resterait
 * figée. Le magasin durable viendra avec l'hibernation, pas avant.
 */

import { Hub, MemoryRoomStore, RoomManager, type Room } from '@garoutom/server';

import { servicesWorker } from './hote.js';
import { brancher } from './prise.js';

export class TablesDO implements DurableObject {
  private readonly hub: Hub;

  constructor(_state: DurableObjectState, _env: unknown) {
    const services = servicesWorker();
    this.hub = new Hub(services.uuid);
    this.hub.serve(new RoomManager(this.hub, new MemoryRoomStore<Room>(), services));
  }

  fetch(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Ce point d’entrée attend une connexion WebSocket', { status: 426 });
    }

    const [client, serveur] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    serveur.accept();

    const prise = brancher(this.hub, serveur);
    serveur.addEventListener('message', (event: MessageEvent) => {
      prise.message(event.data);
    });
    serveur.addEventListener('close', () => {
      prise.fin();
    });
    serveur.addEventListener('error', () => {
      prise.fin();
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
