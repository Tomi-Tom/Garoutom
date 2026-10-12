/**
 * Le canal temps réel du client Garoutom.
 *
 * Le moteur fournit déjà la moitié cliente du WebSocket natif (`Channel`, dans
 * `packages/engine/src/channel.ts`) : corrélation des accusés, délai de garde,
 * battement et chien de garde du lien, reconnexion qui ne renonce jamais
 * (D22). Ce fichier ne la réécrit pas — il lui donne seulement une porte à
 * ouvrir : l'adresse du canal, construite depuis l'origine de la page, un
 * `WebSocket` de navigateur adapté à ce que le canal attend, et le réveil
 * branché sur la vie de la page (`brancherReveil`).
 *
 * Deux façons de trouver le canal :
 *
 * - **par défaut, l'origine de la page.** En développement, le proxy Vite
 *   relaie `/ws` vers le serveur local ; entre amis (`npm run serve`), le
 *   serveur Node sert la page et le canal sur le même port. Rien à régler.
 * - **`VITE_CHANNEL_URL`, lue au build.** En ligne, la page vient de Vercel et
 *   le canal du Worker Cloudflare, sur une autre origine : l'adresse complète
 *   du Worker (`wss://garoutom.<compte>.workers.dev/ws`) se pose alors dans
 *   les variables d'environnement du build.
 *
 * Le singleton est **paresseux** : rien n'est ouvert à l'import du module, ni
 * dans un test de rendu, ni avant le premier effet de montage de `App`. C'est
 * ce qui permet de doubler le canal dans les tests sans qu'aucun serveur —
 * encore en chantier — ait à exister.
 */

import { Channel, CHANNEL_PATH, withProtocolVersion, type SocketLike } from '@garoutom/engine';

/**
 * L'adresse du canal, en absolu.
 *
 * Sans adresse configurée, le canal est sur l'origine de la page, au chemin
 * `/ws`. Avec une adresse configurée (`VITE_CHANNEL_URL`), c'est elle qui
 * gagne ; on la tolère un peu incomplète — un `https://` au lieu de `wss://`,
 * un chemin oublié, voire un chemin seul résolu contre la page — parce qu'une
 * faute de frappe dans un tableau de bord Vercel ne doit pas coûter un
 * déploiement de plus.
 *
 * Le navigateur exige un schéma WebSocket : `https` devient `wss`, `http`
 * devient `ws`. Une page servie en `https` ne pourrait de toute façon pas ouvrir
 * un canal en clair — le refus tombe à la construction, avant le premier rendu.
 */
export function canalUrl(origin: string, configuree?: string | null): string {
  const adresse = configuree?.trim() ?? '';
  if (adresse.length === 0) {
    const url = new URL(origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = CHANNEL_PATH;
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  const url = new URL(adresse, origin);
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.pathname === '/' || url.pathname === '') url.pathname = CHANNEL_PATH;
  return url.toString();
}

/**
 * Adapte le `WebSocket` du navigateur à ce que le canal attend.
 *
 * Les signatures ne coïncident pas tout à fait — le navigateur passe un
 * évènement là où le canal n'attend que le code de fermeture — et la charge
 * utile peut arriver en autre chose que du texte. Quelques lignes suffisent à
 * réconcilier les deux.
 */
function socketNavigateur(url: string): SocketLike {
  const brut = new WebSocket(url);
  const like: SocketLike = {
    send: (data) => {
      // Une socket qui se ferme refuse d'émettre : le canal le saura par `onclose`.
      if (brut.readyState === WebSocket.OPEN) brut.send(data);
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
  // Le code dit pourquoi : partie ouverte ailleurs, version refusée, table disparue (D22).
  brut.onclose = (event: CloseEvent) => like.onclose?.({ code: event.code });
  brut.onerror = () => like.onerror?.();
  brut.onmessage = (event: MessageEvent) => {
    like.onmessage?.({ data: String(event.data) });
  };
  return like;
}

/**
 * La fabrique par défaut : le canal configuré au build, ou l'origine de la
 * page — avec la version du protocole que parle ce client (`?v=2`).
 */
function canalNavigateur(): Channel {
  const adresse = withProtocolVersion(canalUrl(globalThis.location.origin, import.meta.env.VITE_CHANNEL_URL));
  return new Channel(() => socketNavigateur(adresse));
}

/**
 * Branche le réveil du canal sur la vie de la page (D22), et rend de quoi le
 * débrancher :
 *
 * - l'onglet redevient visible → `wake({ hiddenMs })` : un ping immédiat, ou
 *   une reconnexion directe si l'absence a passé 20 s (un téléphone
 *   verrouillé a souvent perdu sa socket sans le savoir) ;
 * - la page sort du cache de navigation (`pageshow` persistant) → reconnexion
 *   directe : rien de ce qui était ouvert n'a survécu au gel ;
 * - le réseau revient (`online`) → réveil, et le bandeau se retire ;
 * - le réseau s'en va (`offline`) → le bandeau, tout de suite, sans attendre
 *   que le chien de garde du canal tranche.
 */
export function brancherReveil(
  leCanal: Pick<Channel, 'wake'>,
  surReseau: (enLigne: boolean) => void = () => undefined,
): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined;

  let cacheDepuis: number | null = document.visibilityState === 'hidden' ? Date.now() : null;
  const surVisibilite = (): void => {
    if (document.visibilityState === 'hidden') {
      cacheDepuis ??= Date.now();
      return;
    }
    const hiddenMs = cacheDepuis === null ? 0 : Date.now() - cacheDepuis;
    cacheDepuis = null;
    leCanal.wake({ hiddenMs });
  };
  const surPageshow = (event: PageTransitionEvent): void => {
    if (event.persisted) leCanal.wake({ hiddenMs: Number.POSITIVE_INFINITY });
  };
  const surEnLigne = (): void => {
    surReseau(true);
    leCanal.wake();
  };
  const surHorsLigne = (): void => surReseau(false);

  document.addEventListener('visibilitychange', surVisibilite);
  window.addEventListener('pageshow', surPageshow);
  window.addEventListener('online', surEnLigne);
  window.addEventListener('offline', surHorsLigne);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) surReseau(false);
  return () => {
    document.removeEventListener('visibilitychange', surVisibilite);
    window.removeEventListener('pageshow', surPageshow);
    window.removeEventListener('online', surEnLigne);
    window.removeEventListener('offline', surHorsLigne);
  };
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
