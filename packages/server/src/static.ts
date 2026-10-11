/**
 * Le client buildé, servi par le serveur lui-même.
 *
 * En développement, Vite sert la page et relaie `/ws` ; en ligne, Vercel sert
 * la page et le Worker tient le canal. Entre les deux, il y a la soirée entre
 * amis : un ordinateur, un `npm run serve`, et tout le monde sur le même
 * Wi-Fi. Pour elle, un seul port doit tout porter — la page, ses fichiers, et
 * le canal. Ce fichier est la moitié « page » de ce port.
 *
 * Volontairement sans dépendance : `node:fs/promises` et `node:path` suffisent
 * à servir un dossier `dist` de Vite, qui ne contient que des fichiers
 * nommés d'avance. Trois règles, et rien de plus :
 *
 * 1. **Rien ne sort du dossier.** Le chemin demandé est décodé, résolu, puis
 *    comparé à la racine : `..`, `%2e%2e`, une barre inverse sous Windows —
 *    tout ce qui atterrit hors du dossier est refusé avant d'être lu.
 * 2. **Une route inconnue rend l'application.** Le client est une page
 *    unique : `/table/ABCD` n'existe pas sur le disque, mais doit ouvrir
 *    `index.html`. Sauf si la demande vise visiblement un fichier (`.js`,
 *    `.css`…) : un script manquant doit rester un 404, pas du HTML qu'un
 *    navigateur essaierait d'exécuter.
 * 3. **Le cache suit le nom.** Ce qui vit dans `/assets/` porte une empreinte
 *    dans son nom et ne change jamais : un an, immuable. `index.html` change
 *    à chaque build : jamais en cache. Le reste (icônes, polices hors
 *    empreinte) : une heure.
 */

import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** Les types que produit un build Vite, et ceux du dossier `public`. */
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

const TEXTE = 'text/plain; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

const CACHE_IMMUABLE = 'public, max-age=31536000, immutable';
const CACHE_COURT = 'public, max-age=3600';
const CACHE_JAMAIS = 'no-cache';

export function typeDe(fichier: string): string {
  return TYPES[extname(fichier).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Le fichier visé par un chemin d'URL, ou `null` s'il sortirait du dossier.
 *
 * Le chemin est décodé **avant** la vérification : c'est la forme décodée que
 * le système de fichiers lira, donc c'est elle qu'il faut juger.
 */
export function cheminSur(racine: string, cheminUrl: string): string | null {
  let decode: string;
  try {
    decode = decodeURIComponent(cheminUrl);
  } catch {
    return null;
  }
  if (decode.includes('\0')) return null;

  const base = resolve(racine);
  const cible = resolve(base, '.' + (decode.startsWith('/') ? decode : '/' + decode));
  const ecart = relative(base, cible);
  if (ecart === '') return base;
  if (ecart === '..' || ecart.startsWith('..' + sep) || isAbsolute(ecart)) return null;
  return cible;
}

/** Le dossier contient-il un client buildé ? Il en faut au moins la page. */
export async function clientPret(racine: string): Promise<boolean> {
  try {
    return (await stat(join(racine, 'index.html'))).isFile();
  } catch {
    return false;
  }
}

/** Un fichier ordinaire du dossier, ou `null`. */
async function lire(fichier: string): Promise<Buffer | null> {
  try {
    if (!(await stat(fichier)).isFile()) return null;
    return await readFile(fichier);
  } catch {
    return null;
  }
}

function repondre(
  response: ServerResponse,
  methode: string,
  statut: number,
  entetes: Record<string, string>,
  corps: Buffer | string,
): void {
  const octets = typeof corps === 'string' ? Buffer.from(corps, 'utf8') : corps;
  response.writeHead(statut, {
    ...entetes,
    'content-length': String(octets.length),
    'x-content-type-options': 'nosniff',
  });
  // HEAD reçoit les mêmes en-têtes, sans le corps.
  response.end(methode === 'HEAD' ? undefined : octets);
}

/**
 * Le service du dossier, prêt à brancher sur un serveur HTTP Node.
 *
 * Seuls GET et HEAD ont un sens ici : un client statique ne reçoit rien.
 */
export function servirStatique(
  racine: string,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  const base = resolve(racine);
  const page = join(base, 'index.html');

  return async (request, response) => {
    const methode = request.method ?? 'GET';
    if (methode !== 'GET' && methode !== 'HEAD') {
      repondre(response, methode, 405, { allow: 'GET, HEAD', 'content-type': TEXTE }, '');
      return;
    }

    const cheminUrl = new URL(request.url ?? '/', 'http://localhost').pathname;
    const fichier = cheminSur(base, cheminUrl);
    if (fichier === null) {
      repondre(response, methode, 400, { 'content-type': TEXTE }, 'Chemin refusé');
      return;
    }

    const contenu = fichier === base ? null : await lire(fichier);
    if (contenu !== null) {
      const cache =
        fichier === page
          ? CACHE_JAMAIS
          : cheminUrl.startsWith('/assets/')
            ? CACHE_IMMUABLE
            : CACHE_COURT;
      repondre(response, methode, 200, { 'content-type': typeDe(fichier), 'cache-control': cache }, contenu);
      return;
    }

    // Un fichier manquant reste manquant ; une route manquante est une page.
    if (extname(cheminUrl) !== '' && extname(cheminUrl) !== '.html') {
      repondre(response, methode, 404, { 'content-type': TEXTE }, 'Introuvable');
      return;
    }

    const index = await lire(page);
    if (index === null) {
      repondre(
        response,
        methode,
        503,
        { 'content-type': TEXTE },
        'Le client n’est pas construit : lancez npm run build',
      );
      return;
    }
    repondre(response, methode, 200, { 'content-type': HTML, 'cache-control': CACHE_JAMAIS }, index);
  };
}
