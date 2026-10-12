/**
 * La prise : une socket hibernable du Durable Object, présentée au
 * concentrateur.
 *
 * C'est le pendant de `ws-node.ts` côté serveur Node — l'unique endroit qui
 * sait à quoi ressemble une socket de l'hôte. Le concentrateur ne connaît que
 * `send`, `close`, l'adresse du client (quotas) et la version de protocole
 * négociée ; la prise les lui donne, tirés de la socket et de son attachement.
 *
 * ## Le `hello` d'un réveil
 *
 * Le concentrateur envoie `hello` dès qu'on lui attache une connexion. À
 * l'ouverture, c'est voulu. Mais après une hibernation, l'objet renaît avec un
 * concentrateur vide, et il faut lui **rattacher** les sockets déjà ouvertes
 * — sans redire bonjour à des clients qui sont là depuis une heure. La prise
 * d'un rattachement avale donc le premier cadre s'il est un `hello`.
 * (Une option `attach(socket, id, { rattachement: true })` dans le Hub serait
 * plus nette ; elle n'est pas au contrat, on s'en passe.)
 *
 * Elle ne touche à aucun global de Cloudflare : on la teste sous Node avec
 * une fausse socket.
 */

import type { HubSocket } from '@garoutom/server';

import type { Attache, SocketHibernable } from './annuaire.js';

/** Code de fermeture « normale » du protocole WebSocket (RFC 6455, 7.4.1). */
export const FERMETURE_NORMALE = 1000;

export function prise(socket: SocketHibernable, attache: Attache, rattachement: boolean): HubSocket {
  let avalerHello = rattachement;
  const hubSocket: HubSocket = {
    protocol: attache.protocol,
    send: (data) => {
      if (avalerHello) {
        avalerHello = false;
        if (data.startsWith('{"t":"hello"')) return;
      }
      // Une socket qui se ferme pendant qu'on lui parle n'est pas une erreur :
      // l'évènement de fermeture suit, et c'est lui qui fera le ménage.
      try {
        socket.send(data);
      } catch {
        /* la fermeture suit */
      }
    },
    close: (code = FERMETURE_NORMALE, reason = '') => {
      // Fermer une socket déjà fermée lève dans le runtime : la fin est la fin.
      try {
        socket.close(code, reason);
      } catch {
        /* déjà fermée */
      }
    },
  };
  if (attache.ip !== null) hubSocket.ip = attache.ip;
  return hubSocket;
}
