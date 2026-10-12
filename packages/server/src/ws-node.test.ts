/**
 * Le canal Node : les entrées hostiles ne tuent rien, la version et l'origine
 * sont jugées, la socket muette est fermée par le ping.
 *
 * Un vrai serveur sur un port libre, de vrais clients `ws` et des sockets
 * brutes. Les tests qui interrogent `/health` attendent `manager.stats()` du
 * lot A.
 */

import { request as requeteHttp } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { CLOSE_VERSION, CLOSE_TOO_BIG, MAX_FRAME_BYTES } from '@garoutom/engine';

import { creerGaroutom, type Garoutom } from './app.js';
import { adresseClient, lireListe, origineAcceptee } from './ws-node.js';

let garoutom: Garoutom;
let port: number;

beforeAll(async () => {
  garoutom = await creerGaroutom({ pingMs: 120, origines: ['https://jeu.exemple.fr'] });
  await new Promise<void>((resolve) => garoutom.server.listen(0, '127.0.0.1', resolve));
  port = (garoutom.server.address() as AddressInfo).port;
});

afterAll(async () => {
  await garoutom.arreter();
});

function sante(): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = requeteHttp({ host: '127.0.0.1', port, path: '/health' }, (res) => {
      res.resume();
      res.on('end', () => {
        resolve(res.statusCode ?? 0);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/** Écrit des octets bruts, rend ce que le serveur répond avant de fermer. */
function brut(octets: string): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(octets);
    });
    let recu = '';
    socket.setEncoding('utf8');
    socket.on('data', (morceau: string) => (recu += morceau));
    socket.on('close', () => {
      resolve(recu);
    });
    socket.on('error', () => undefined);
    setTimeout(() => {
      socket.destroy();
    }, 1500);
  });
}

const entetesBascule =
  'Host: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n' +
  'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n';

function fermeture(client: WebSocket): Promise<{ code: number; raison: string }> {
  return new Promise((resolve) => {
    client.on('close', (code, raison) => {
      resolve({ code, raison: raison.toString() });
    });
    client.on('error', () => undefined);
  });
}

describe('les entrées hostiles', () => {
  it('une bascule sur //[ est refusée sans tuer le processus', async () => {
    const reponse = await brut(`GET //[ HTTP/1.1\r\n${entetesBascule}\r\n`);
    expect(reponse).toMatch(/^HTTP\/1\.1 (400|404)/);
    expect(await sante()).toBe(200);
  });

  it('une bascule sur un chemin inconnu, une forme absolue ou * est refusée', async () => {
    for (const cible of ['/autre', 'http://x/ws', '*']) {
      const reponse = await brut(`GET ${cible} HTTP/1.1\r\n${entetesBascule}\r\n`);
      expect(reponse).toMatch(/^HTTP\/1\.1 (400|404)/);
    }
    expect(await sante()).toBe(200);
  });

  it('une requête HTTP //[ ne tue pas le processus', async () => {
    const reponse = await brut('GET //[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
    expect(reponse).toMatch(/^HTTP\/1\.1 /);
    expect(await sante()).toBe(200);
  });

  it('refuse des en-têtes de plus de 8 Ko', async () => {
    const reponse = await brut(`GET /health HTTP/1.1\r\nHost: x\r\nX-Gros: ${'a'.repeat(9000)}\r\n\r\n`);
    expect(reponse).toMatch(/^HTTP\/1\.1 (400|431)/);
    expect(await sante()).toBe(200);
  });

  it('refuse une origine étrangère (403) et accepte celle de la liste', async () => {
    const mauvaise = new WebSocket(`ws://127.0.0.1:${String(port)}/ws`, { origin: 'https://pirate.example' });
    const erreur = await new Promise<string>((resolve) => {
      mauvaise.on('unexpected-response', (_req, res) => {
        resolve(String(res.statusCode));
      });
      mauvaise.on('error', () => undefined);
    });
    expect(erreur).toBe('403');

    const bonne = new WebSocket(`ws://127.0.0.1:${String(port)}/ws`, { origin: 'https://jeu.exemple.fr' });
    await new Promise((resolve, reject) => {
      bonne.on('open', resolve);
      bonne.on('error', reject);
    });
    const meme = new WebSocket(`ws://127.0.0.1:${String(port)}/ws`, { origin: `http://127.0.0.1:${String(port)}` });
    await new Promise((resolve, reject) => {
      meme.on('open', resolve);
      meme.on('error', reject);
    });
    bonne.close();
    meme.close();
  });

  it('coupe un cadre de plus de 16 Kio (maxPayload)', async () => {
    const client = new WebSocket(`ws://127.0.0.1:${String(port)}/ws?v=2`);
    const fini = fermeture(client);
    await new Promise((resolve) => client.on('open', resolve));
    client.send('x'.repeat(MAX_FRAME_BYTES + 10));
    expect((await fini).code).toBe(CLOSE_TOO_BIG);
    expect(await sante()).toBe(200);
  });
});

describe('la version', () => {
  it('accepte puis ferme en CLOSE_VERSION une version hors plage', async () => {
    for (const v of ['99', '0', 'abc']) {
      const client = new WebSocket(`ws://127.0.0.1:${String(port)}/ws?v=${v}`);
      const fini = fermeture(client);
      await new Promise((resolve) => client.on('open', resolve));
      expect((await fini).code).toBe(CLOSE_VERSION);
    }
  });

  it('garde ouverte une version supportée, ou absente', async () => {
    for (const requete of ['?v=1', '?v=2', '']) {
      const client = new WebSocket(`ws://127.0.0.1:${String(port)}/ws${requete}`);
      await new Promise((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });
      client.close();
    }
  });
});

describe('le lien vivant', () => {
  it('ferme par le ping une socket muette, pas une socket qui répond', async () => {
    const muette = new WebSocket(`ws://127.0.0.1:${String(port)}/ws?v=2`, { autoPong: false });
    const vivante = new WebSocket(`ws://127.0.0.1:${String(port)}/ws?v=2`);
    const muetteFermee = fermeture(muette);
    let vivanteFermee = false;
    vivante.on('close', () => {
      vivanteFermee = true;
    });
    vivante.on('error', () => undefined);
    await Promise.all([
      new Promise((resolve) => muette.on('open', resolve)),
      new Promise((resolve) => vivante.on('open', resolve)),
    ]);

    await muetteFermee; // pingMs = 120 : terminate au deuxième tour
    expect(vivanteFermee).toBe(false);
    vivante.close();
  });
});

describe('les outils', () => {
  it('juge les origines', () => {
    expect(origineAcceptee(undefined, 'h:1')).toBe(true);
    expect(origineAcceptee('http://h:1', 'h:1')).toBe(true);
    expect(origineAcceptee('http://H:1/', 'h:1')).toBe(true);
    expect(origineAcceptee('http://autre', 'h:1')).toBe(false);
    expect(origineAcceptee('null', 'h:1')).toBe(false);
    expect(origineAcceptee('http://autre', 'h:1', ['http://autre'])).toBe(true);
    expect(origineAcceptee('http://autre:9', 'h:1', ['autre:9'])).toBe(true);
  });

  it('lit la liste d’origines', () => {
    expect(lireListe(' https://A.fr/ , b.fr  c.fr ')).toEqual(['https://a.fr', 'b.fr', 'c.fr']);
    expect(lireListe(undefined)).toEqual([]);
  });

  it('ne croit x-forwarded-for que derrière un proxy déclaré', () => {
    const requete = {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      socket: { remoteAddress: '::ffff:192.168.1.5' },
    } as never;
    expect(adresseClient(requete, false)).toBe('192.168.1.5');
    expect(adresseClient(requete, true)).toBe('203.0.113.9');
  });
});
