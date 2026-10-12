/**
 * La porte du Worker : un chemin pour le canal, un pour la santé, rien d'autre.
 *
 * (Ce module n'est pas le point d'entrée : `index.ts` n'exporte que le
 * gestionnaire et la classe de l'objet — le runtime refuse tout autre export
 * nommé du module principal, une constante comme une fonction utilitaire.)
 *
 * Le client est servi par Vercel ; le Worker ne sert que le canal. Une page
 * de `garoutom.tombp.fr` ouvre donc son WebSocket sur une autre origine —
 * l'adresse que le build du client lit dans `VITE_CHANNEL_URL`. Toute
 * demande `/ws` est remise à l'unique objet `TablesDO` (voir `tables.ts`),
 * atteint par un nom fixe : où qu'ils se connectent, tous les joueurs du
 * monde arrivent au même endroit.
 *
 * ## La santé
 *
 * - `/health` répond sans réveiller l'objet : c'est la sonde des moniteurs,
 *   elle doit rester instantanée et ne rien coûter.
 * - `/health?profond=1` interroge l'objet (tables par statut, sockets,
 *   prochaine alarme, retard d'alarme, schéma, version) ; elle exige
 *   `Authorization: Bearer <ADMIN_TOKEN>` — un secret posé par
 *   `wrangler secret put ADMIN_TOKEN`. Sans secret posé, elle est fermée.
 *   C'est elle que la garde de déploiement interroge (D24).
 *
 * ## Les origines (D23)
 *
 * Une bascule WebSocket n'est pas soumise au CORS : le navigateur l'envoie
 * à n'importe qui, en joignant seulement son en-tête `Origin`. La variable
 * `ORIGINES` (liste séparée par des virgules) refuse les bascules venues
 * d'une autre page. Elle est **obligatoire en production** ; tant qu'elle
 * n'est pas posée, la porte laisse passer et l'écrit au journal (une fois par
 * instance) — pour ne pas couper la production en place. À poser au prochain
 * déploiement : `ORIGINES = "https://garoutom.tombp.fr"` (voir
 * `wrangler.toml`). C'est une politesse plus qu'une sécurité : un client
 * hors navigateur choisit son `Origin`, et c'est pourquoi une demande sans
 * `Origin` passe. La sécurité, elle, est au serveur, qui ne croit rien.
 */

import { CHANNEL_PATH, PROTOCOL_VERSION } from '@garoutom/engine';

import { noter } from './journal.js';
import { CHEMIN_SANTE } from './tables.js';

export interface Env {
  TABLES: DurableObjectNamespace;
  /** Les pages admises à ouvrir le canal. Obligatoire en production (D23). */
  ORIGINES?: string;
  /** Le secret de `/health?profond=1`. */
  ADMIN_TOKEN?: string;
  /** `[version_metadata]` : la version déployée. */
  VERSION?: { id: string; tag?: string; timestamp?: string };
}

/**
 * Le nom de l'unique objet.
 *
 * `idFromName` est déterministe : le même nom donne le même objet, partout.
 */
export const NOM_DE_L_OBJET = 'tables';

/** Les origines admises, nettoyées ; une liste vide veut dire « aucune liste ». */
function admises(liste: string | undefined): string[] {
  return (liste ?? '')
    .split(',')
    .map((entree) => entree.trim().replace(/\/+$/, ''))
    .filter((entree) => entree.length > 0);
}

/** Cette page peut-elle ouvrir le canal ? */
export function origineAdmise(origine: string | null, liste: string | undefined): boolean {
  const permises = admises(liste);
  if (permises.length === 0 || origine === null) return true;
  return permises.includes('*') || permises.includes(origine);
}

/** L'avertissement « ORIGINES absente » ne s'écrit qu'une fois par instance. */
let origineSignalee = false;

/** Comparaison en temps constant : la durée ne dit pas où les chaînes divergent. */
export function memeSecret(recu: string, attendu: string): boolean {
  const a = new TextEncoder().encode(recu);
  const b = new TextEncoder().encode(attendu);
  let difference = a.length ^ b.length;
  for (let i = 0; i < b.length; i += 1) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

const ENTETES_SANTE = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };

/** La santé rapide : se lit de partout, ne réveille rien. */
function sante(env: Env): Response {
  return Response.json(
    { ok: true, canal: CHANNEL_PATH, protocole: PROTOCOL_VERSION, version: env.VERSION?.id ?? null },
    { headers: ENTETES_SANTE },
  );
}

/** La santé profonde : l'objet compte ses tables, sur présentation du secret. */
async function santeProfonde(request: Request, env: Env): Promise<Response> {
  const secret = env.ADMIN_TOKEN ?? '';
  if (secret.length === 0) {
    return Response.json({ ok: false, erreur: 'Santé profonde fermée : ADMIN_TOKEN absent' }, { status: 404, headers: ENTETES_SANTE });
  }
  const entete = request.headers.get('Authorization') ?? '';
  const recu = entete.startsWith('Bearer ') ? entete.slice('Bearer '.length) : '';
  if (!memeSecret(recu, secret)) {
    return Response.json({ ok: false, erreur: 'Jeton refusé' }, { status: 401, headers: ENTETES_SANTE });
  }
  const objet = env.TABLES.get(env.TABLES.idFromName(NOM_DE_L_OBJET));
  const reponse = await objet.fetch(new Request(`https://tables.interne${CHEMIN_SANTE}`));
  return new Response(reponse.body, { status: reponse.status, headers: { ...ENTETES_SANTE, 'content-type': 'application/json' } });
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Adresse illisible', { status: 400 });
    }
    const { pathname, searchParams } = url;

    if (pathname === '/health') {
      return searchParams.get('profond') === '1' ? santeProfonde(request, env) : sante(env);
    }

    if (pathname !== CHANNEL_PATH) {
      return new Response('Rien ici : le canal est sur ' + CHANNEL_PATH, { status: 404 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Ce point d’entrée attend une connexion WebSocket', { status: 426 });
    }

    if (admises(env.ORIGINES).length === 0) {
      if (!origineSignalee) {
        origineSignalee = true;
        noter('avert', 'origines-absentes', {
          message: 'ORIGINES n’est pas posée : toute origine est admise. À poser en production (D23).',
        });
      }
    } else if (!origineAdmise(request.headers.get('Origin'), env.ORIGINES)) {
      return new Response('Cette page n’est pas admise à la table', { status: 403 });
    }

    // La requête part telle quelle : l'objet y lit `?v=` et `CF-Connecting-IP`.
    return env.TABLES.get(env.TABLES.idFromName(NOM_DE_L_OBJET)).fetch(request);
  },
} satisfies ExportedHandler<Env>;
