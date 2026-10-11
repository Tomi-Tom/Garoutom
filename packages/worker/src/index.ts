/**
 * La porte du Worker : un chemin pour le canal, un pour la santé, rien d'autre.
 *
 * Le client est servi par Vercel ; le Worker ne sert que le canal. Une page
 * de `garoutom.tombp.fr` ouvre donc son WebSocket sur une autre origine —
 * l'adresse que le build du client lit dans `VITE_CHANNEL_URL`. Toute
 * demande `/ws` est remise à l'unique objet `TablesDO` (voir `tables.ts`),
 * atteint par un nom fixe : où qu'ils se connectent, tous les joueurs du
 * monde arrivent au même endroit.
 *
 * ## Les origines
 *
 * Une bascule WebSocket n'est pas soumise au CORS : le navigateur l'envoie
 * à n'importe qui, en joignant seulement son en-tête `Origin`. Si la
 * variable `ORIGINES` est posée (liste séparée par des virgules, par exemple
 * `https://garoutom.tombp.fr,http://localhost:5177`), une bascule venue d'une
 * autre page est refusée. C'est une politesse, pas une sécurité : un client
 * hors navigateur choisit son `Origin`, et c'est pourquoi une demande sans
 * `Origin` passe. La sécurité, elle, est au serveur, qui ne croit rien.
 */

import { CHANNEL_PATH } from '@garoutom/engine';

export { TablesDO } from './tables.js';

export interface Env {
  TABLES: DurableObjectNamespace;
  /** Les pages admises à ouvrir le canal ; absente, toutes le sont. */
  ORIGINES?: string;
}

/**
 * Le nom de l'unique objet.
 *
 * `idFromName` est déterministe : le même nom donne le même objet, partout.
 */
export const NOM_DE_L_OBJET = 'tables';

/** Cette page peut-elle ouvrir le canal ? */
export function origineAdmise(origine: string | null, liste: string | undefined): boolean {
  const admises = (liste ?? '')
    .split(',')
    .map((entree) => entree.trim().replace(/\/+$/, ''))
    .filter((entree) => entree.length > 0);
  if (admises.length === 0 || origine === null) return true;
  return admises.includes('*') || admises.includes(origine);
}

/** La santé se lit de partout : c'est elle que l'on interroge pour vérifier un déploiement. */
function sante(): Response {
  return Response.json(
    { ok: true, canal: CHANNEL_PATH },
    { headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' } },
  );
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/health') return sante();

    if (pathname !== CHANNEL_PATH) {
      return new Response('Rien ici : le canal est sur ' + CHANNEL_PATH, { status: 404 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Ce point d’entrée attend une connexion WebSocket', { status: 426 });
    }

    if (!origineAdmise(request.headers.get('Origin'), env.ORIGINES)) {
      return new Response('Cette page n’est pas admise à la table', { status: 403 });
    }

    return env.TABLES.get(env.TABLES.idFromName(NOM_DE_L_OBJET)).fetch(request);
  },
} satisfies ExportedHandler<Env>;
