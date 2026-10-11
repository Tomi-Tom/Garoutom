/**
 * La prise : un WebSocket du Worker, branché sur le concentrateur.
 *
 * C'est le pendant exact de `ws-node.ts` côté serveur Node — l'unique endroit
 * qui sait à quoi ressemble une socket de l'hôte. Le concentrateur ne connaît
 * que `send` et `close` ; la prise lui présente le côté serveur d'une
 * `WebSocketPair`, et rend en échange les deux gestes que l'objet branchera
 * sur les évènements `message` et `close`/`error`.
 *
 * Elle ne touche à aucun global de Cloudflare : on la teste donc sous Node
 * avec une fausse socket, sans miniflare, et c'est tout l'intérêt de l'avoir
 * sortie de `tables.ts`.
 */

import type { Hub } from '@garoutom/server';

/** Ce que la prise attend d'une socket : envoyer et fermer, rien de plus. */
export interface SocketServeur {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** Les deux gestes que l'hôte branche sur ses évènements. */
export interface Branchement {
  /** L'identifiant de connexion attribué par le concentrateur. */
  id: string;
  /** Un message est arrivé du client. */
  message(data: unknown): void;
  /** La connexion est finie — `close` ou `error`, appelé autant qu'on veut. */
  fin(): void;
}

/** Code de fermeture « normale » du protocole WebSocket (RFC 6455, 7.4.1). */
const FERMETURE_NORMALE = 1000;

export function brancher(hub: Hub, socket: SocketServeur): Branchement {
  let finie = false;

  const fermer = (): void => {
    // Fermer une socket déjà fermée lève une exception dans le runtime : ce
    // n'est pas une erreur pour nous, la fin est la fin.
    try {
      socket.close(FERMETURE_NORMALE, 'Au revoir');
    } catch {
      /* déjà fermée */
    }
  };

  const session = hub.attach({
    send: (data) => {
      if (finie) return;
      // Une socket qui se ferme pendant qu'on lui parle n'est pas une erreur :
      // l'évènement de fermeture suit, et c'est lui qui fera le ménage.
      try {
        socket.send(data);
      } catch {
        /* la fermeture suit */
      }
    },
    close: fermer,
  });

  return {
    id: session.id,
    message: (data) => {
      if (finie) return;
      // Le client n'envoie que du texte ; un cadre binaire finira refusé par
      // le décodage du concentrateur, qui l'ignore sans couper.
      void session.receive(data).catch((error: unknown) => {
        console.error('Message mal traité', error);
      });
    },
    fin: () => {
      // `error` puis `close` arrivent souvent tous les deux : la table ne
      // doit apprendre le départ qu'une fois.
      if (finie) return;
      finie = true;
      // Sans hibernation, le runtime attend qu'on rende la poignée de main de
      // fermeture nous-mêmes ; la rendre deux fois est sans effet.
      fermer();
      void session.close().catch((error: unknown) => {
        console.error('Fermeture mal refermée', error);
      });
    },
  };
}
