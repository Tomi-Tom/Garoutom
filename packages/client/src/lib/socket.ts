/**
 * Le canal temps réel du client Garoutom.
 *
 * Le moteur fournit déjà la moitié cliente du WebSocket natif (`Channel`, dans
 * `packages/engine/src/channel.ts`) : corrélation des accusés, délai de garde,
 * et reconnexion automatique à backoff doublé. Ce fichier ne la réécrit pas —
 * il lui donne seulement une porte à ouvrir : l'adresse du canal, construite
 * depuis l'origine de la page, et un `WebSocket` de navigateur adapté à ce que
 * le canal attend.
 *
 * En développement, la même origine passe par le proxy Vite (`/ws` vers le
 * serveur local) ; en production, le Worker sert le canal lui-même. Le client
 * n'a donc jamais d'adresse à configurer : il frappe là où la page a été servie.
 *
 * Le singleton est **paresseux** : rien n'est ouvert à l'import du module, ni
 * dans un test de rendu, ni avant le premier effet de montage de `App`. C'est
 * ce qui permet de doubler le canal dans les tests sans qu'aucun serveur —
 * encore en chantier — ait à exister.
 */

import { Channel, CHANNEL_PATH, type SocketLike } from '@garoutom/engine';

/**
 * L'adresse du canal, en absolu, depuis une origine.
 *
 * Le navigateur exige un schéma WebSocket : `https` devient `wss`, tout le
 * reste `ws`. Une page servie en `https` ne pourrait de toute façon pas ouvrir
 * un canal en clair — le refus tombe à la construction, avant le premier rendu.
 */
export function canalUrl(origin: string): string {
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = CHANNEL_PATH;
  return url.toString();
}

/**
 * Adapte le `WebSocket` du navigateur à ce que le canal attend.
 *
 * Les signatures ne coïncident pas tout à fait — le navigateur passe un
 * évènement là où le canal n'attend rien — et la charge utile peut arriver en
 * autre chose que du texte. Six lignes suffisent à réconcilier les deux.
 */
function socketNavigateur(url: string): SocketLike {
  const brut = new WebSocket(url);
  const like: SocketLike = {
    send: (data) => {
      brut.send(data);
    },
    close: () => {
      brut.close();
    },
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };
  brut.onopen = () => like.onopen?.();
  brut.onclose = () => like.onclose?.();
  brut.onerror = () => like.onerror?.();
  brut.onmessage = (event: MessageEvent) => {
    like.onmessage?.({ data: String(event.data) });
  };
  return like;
}

/** La fabrique par défaut : un canal sur l'origine de la page. */
function canalNavigateur(): Channel {
  return new Channel(() => socketNavigateur(canalUrl(globalThis.location.origin)));
}

let instance: Channel | null = null;
let fabrique: () => Channel = canalNavigateur;

/** Le canal de l'application, ouvert au premier appel puis réutilisé. */
export function canal(): Channel {
  return (instance ??= fabrique());
}

/**
 * Remplace la fabrique du canal — pour les tests, qui n'ont aucun serveur à
 * joindre. À installer avant le premier `canal()` ; l'instance courante, s'il
 * en existe une, est simplement oubliée.
 */
export function installeCanal(doublure: () => Channel): void {
  fabrique = doublure;
  instance = null;
}
