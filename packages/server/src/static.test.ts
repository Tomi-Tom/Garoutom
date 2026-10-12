/**
 * Le client servi par le serveur : la page, le cache, et les murs du dossier.
 *
 * Un vrai serveur HTTP sur un port libre, un vrai dossier temporaire : c'est
 * le chemin que suivra un navigateur, pas une imitation.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as requeteHttp, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adressesEcoute, createGaroutomServer } from './app.js';
import { analyserUrl, cheminSur, clientPret, typeDe } from './static.js';

let racine: string;
let serveur: Server;
let port: number;

beforeAll(async () => {
  const parent = await mkdtemp(join(tmpdir(), 'garoutom-static-'));
  racine = join(parent, 'dist');
  await mkdir(join(racine, 'assets'), { recursive: true });
  await writeFile(join(racine, 'index.html'), '<!doctype html><title>Garoutom</title>');
  await writeFile(join(racine, 'assets', 'index-abc123.js'), 'console.log("loup")');
  await writeFile(join(racine, 'favicon.svg'), '<svg/>');
  // Un secret hors du dossier, que rien ne doit pouvoir atteindre.
  await writeFile(join(parent, 'secret.txt'), 'ne pas lire');

  serveur = createGaroutomServer({ client: racine });
  await new Promise<void>((resolve) => serveur.listen(0, '127.0.0.1', resolve));
  port = (serveur.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((resolve) => serveur.close(resolve));
  await rm(join(racine, '..'), { recursive: true, force: true });
});

interface Reponse {
  statut: number;
  entetes: Record<string, string | string[] | undefined>;
  corps: string;
}

/** Une requête brute : le chemin part tel quel, sans normalisation du client. */
function demander(chemin: string, methode = 'GET'): Promise<Reponse> {
  return new Promise((resolve, reject) => {
    const req = requeteHttp({ host: '127.0.0.1', port, path: chemin, method: methode }, (res) => {
      let corps = '';
      res.setEncoding('utf8');
      res.on('data', (morceau: string) => (corps += morceau));
      res.on('end', () => {
        resolve({ statut: res.statusCode ?? 0, entetes: res.headers, corps });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('le client servi', () => {
  it('sert la page à la racine, jamais en cache', async () => {
    const r = await demander('/');
    expect(r.statut).toBe(200);
    expect(r.entetes['content-type']).toBe('text/html; charset=utf-8');
    expect(r.entetes['cache-control']).toBe('no-cache');
    expect(r.corps).toContain('<title>Garoutom</title>');
  });

  it('sert les fichiers à empreinte avec un cache long', async () => {
    const r = await demander('/assets/index-abc123.js');
    expect(r.statut).toBe(200);
    expect(r.entetes['content-type']).toBe('text/javascript; charset=utf-8');
    expect(r.entetes['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(r.corps).toBe('console.log("loup")');
  });

  it('sert le reste avec un cache court et le bon type', async () => {
    const r = await demander('/favicon.svg');
    expect(r.entetes['content-type']).toBe('image/svg+xml');
    expect(r.entetes['cache-control']).toBe('public, max-age=3600');
  });

  it('rend l’application pour une route inconnue', async () => {
    const r = await demander('/table/ABCD');
    expect(r.statut).toBe(200);
    expect(r.corps).toContain('<title>Garoutom</title>');
  });

  it('garde un 404 pour un fichier manquant', async () => {
    const r = await demander('/assets/manquant.js');
    expect(r.statut).toBe(404);
  });

  it('ne sort jamais du dossier', async () => {
    for (const chemin of [
      '/../secret.txt',
      '/%2e%2e/secret.txt',
      '/assets/..%2f..%2fsecret.txt',
      '/..%5csecret.txt',
    ]) {
      const r = await demander(chemin);
      expect(r.corps).not.toContain('ne pas lire');
    }
  });

  it('répond à HEAD sans corps et refuse les autres verbes', async () => {
    const tete = await demander('/', 'HEAD');
    expect(tete.statut).toBe(200);
    expect(tete.corps).toBe('');
    expect(Number(tete.entetes['content-length'])).toBeGreaterThan(0);

    const envoi = await demander('/', 'POST');
    expect(envoi.statut).toBe(405);
    expect(envoi.entetes.allow).toBe('GET, HEAD');
  });

  it('laisse la santé au serveur', async () => {
    const r = await demander('/health');
    expect(JSON.parse(r.corps)).toMatchObject({ ok: true, persistance: { active: false } });
  });

  it('pose les en-têtes de sécurité sur chaque réponse', async () => {
    for (const chemin of ['/', '/favicon.svg', '/assets/manquant.js']) {
      const r = await demander(chemin);
      expect(r.entetes['content-security-policy']).toContain("default-src 'self'");
      expect(r.entetes['content-security-policy']).toContain("style-src 'self' 'unsafe-inline'");
      expect(r.entetes['x-frame-options']).toBe('DENY');
      expect(r.entetes['referrer-policy']).toBe('no-referrer');
    }
  });

  it('survit à `GET //[` (la cible qui tuait le processus)', async () => {
    expect((await demander('//[')).statut).toBeLessThan(500);
    expect((await demander('/health')).statut).toBe(200);
  });
});

describe('les outils du dossier', () => {
  it('analyse les cibles sans jamais lever', () => {
    expect(analyserUrl('//[')?.pathname).toBe('//[');
    expect(analyserUrl('*')).toBeNull();
    expect(analyserUrl('http://x/y')).toBeNull();
    expect(analyserUrl(undefined)).toBeNull();
    expect(analyserUrl('//hote/chemin?v=2')?.pathname).toBe('//hote/chemin');
    expect(analyserUrl('/ws?v=2')?.searchParams.get('v')).toBe('2');
  });

  it('juge les chemins une fois décodés', () => {
    expect(cheminSur('/srv/dist', '/assets/a.js')).not.toBeNull();
    expect(cheminSur('/srv/dist', '/../etc/passwd')).toBeNull();
    expect(cheminSur('/srv/dist', '/%2e%2e/etc/passwd')).toBeNull();
    expect(cheminSur('/srv/dist', '/%E0%A4%A')).toBeNull();
    expect(cheminSur('/srv/dist', '/a%00.js')).toBeNull();
  });

  it('connaît les types d’un build Vite', () => {
    expect(typeDe('a.woff2')).toBe('font/woff2');
    expect(typeDe('a.CSS')).toBe('text/css; charset=utf-8');
    expect(typeDe('a.inconnu')).toBe('application/octet-stream');
  });

  it('sait dire si le client est construit', async () => {
    expect(await clientPret(racine)).toBe(true);
    expect(await clientPret(join(racine, 'assets'))).toBe(false);
  });

  it('annonce localhost puis les IPv4 du réseau local', () => {
    const { locale, reseau } = adressesEcoute(3004, {
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true } as never],
      wifi: [
        { address: '192.168.1.42', family: 'IPv4', internal: false } as never,
        { address: 'fe80::1', family: 'IPv6', internal: false } as never,
      ],
    });
    expect(locale).toBe('http://localhost:3004');
    expect(reseau).toEqual(['http://192.168.1.42:3004']);
  });
});
