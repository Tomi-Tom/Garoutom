/**
 * Le Worker, éprouvé sous Node sans miniflare.
 *
 * Trois morceaux ne dépendent d'aucun global de Cloudflare, et c'est exprès :
 * la prise (une fausse socket suffit à jouer une vraie conversation avec le
 * cœur des tables), le tirage uniforme, et la porte — dont l'objet est
 * remplacé par une doublure. Ce qui reste, `TablesDO.fetch`, tient en dix
 * lignes de câblage sur `WebSocketPair` ; il s'éprouve avec `wrangler dev`.
 */

import { describe, expect, it } from 'vitest';

import { encodeFrame, type JoinResult } from '@garoutom/engine';
import { Hub, MemoryRoomStore, RoomManager, type Room } from '@garoutom/server';

import { entierUniforme, servicesWorker } from './hote.js';
import worker, { NOM_DE_L_OBJET, origineAdmise, type Env } from './index.js';
import { brancher, type SocketServeur } from './prise.js';

/** Une socket de serveur qui garde tout ce qu'on lui dit. */
class FausseSocket implements SocketServeur {
  readonly recus: unknown[] = [];
  fermetures = 0;
  fermee = false;

  send(data: string): void {
    if (this.fermee) throw new Error('Socket fermée');
    this.recus.push(JSON.parse(data));
  }

  close(): void {
    this.fermetures += 1;
    if (this.fermee) throw new Error('Déjà fermée');
    this.fermee = true;
  }
}

function tables(): Hub {
  const services = servicesWorker();
  const hub = new Hub(services.uuid);
  hub.serve(new RoomManager(hub, new MemoryRoomStore<Room>(), services));
  return hub;
}

/** Laisse filer les promesses du concentrateur. */
const attendre = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('la prise du Durable Object', () => {
  it('ouvre une table par le protocole, accusé et état compris', async () => {
    const socket = new FausseSocket();
    const prise = brancher(tables(), socket);

    prise.message(encodeFrame({ t: 'req', id: 1, e: 'room:create', d: { name: 'Tom' } }));
    await attendre();

    const ack = socket.recus.find(
      (cadre): cadre is { t: 'ack'; id: number; r: { ok: true; data: JoinResult } } =>
        (cadre as { t?: string }).t === 'ack',
    );
    expect(ack?.id).toBe(1);
    expect(ack?.r.ok).toBe(true);
    expect(ack?.r.data.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(socket.recus).toContainEqual(expect.objectContaining({ t: 'ev', e: 'sync' }));
  });

  it('ignore un cadre illisible sans couper la connexion', async () => {
    const socket = new FausseSocket();
    const prise = brancher(tables(), socket);

    prise.message('pas du json');
    prise.message(new ArrayBuffer(4));
    await attendre();

    expect(socket.recus).toEqual([]);
    expect(socket.fermetures).toBe(0);
  });

  it('ne signale le départ qu’une fois, même sur erreur puis fermeture', async () => {
    const socket = new FausseSocket();
    const prise = brancher(tables(), socket);

    prise.fin();
    prise.fin();
    await attendre();
    // La poignée de main de fermeture est rendue une fois, sans exception.
    expect(socket.fermetures).toBe(1);

    // Après la fin, plus rien ne part ni n'est traité.
    prise.message(encodeFrame({ t: 'req', id: 2, e: 'room:create', d: { name: 'Tom' } }));
    await attendre();
    expect(socket.recus).toEqual([]);
  });
});

describe('le tirage uniforme', () => {
  it('reste dans ses bornes, jusqu’à 2³²', () => {
    for (const borne of [1, 2, 24, 1000, 0x1_0000_0000]) {
      for (let tour = 0; tour < 200; tour += 1) {
        const valeur = entierUniforme(borne, crypto);
        expect(Number.isInteger(valeur)).toBe(true);
        expect(valeur).toBeGreaterThanOrEqual(0);
        expect(valeur).toBeLessThan(borne);
      }
    }
  });

  it('rejette la tranche incomplète plutôt que de biaiser', () => {
    // 3 ne divise pas 2³² : le dernier tirage possible est hors plafond.
    const tirages = [0xffff_ffff, 7];
    const hasard = {
      getRandomValues<T extends Uint32Array>(tableau: T): T {
        tableau[0] = tirages.shift() ?? 0;
        return tableau;
      },
    };
    expect(entierUniforme(3, hasard)).toBe(1);
    expect(tirages).toEqual([]);
  });

  it('refuse une borne absurde', () => {
    expect(() => entierUniforme(0, crypto)).toThrow(RangeError);
    expect(() => entierUniforme(0x1_0000_0001, crypto)).toThrow(RangeError);
  });
});

describe('la porte du Worker', () => {
  /** Une doublure de l'espace d'objets : elle note qui on a réveillé. */
  function environnement(origines?: string): { env: Env; noms: string[] } {
    const noms: string[] = [];
    const tablesDO = {
      idFromName: (nom: string) => {
        noms.push(nom);
        return nom;
      },
      get: () => ({ fetch: () => Promise.resolve(new Response('objet', { status: 200 })) }),
    };
    return { env: { TABLES: tablesDO as unknown as DurableObjectNamespace, ORIGINES: origines }, noms };
  }

  const bascule = (origine?: string): Request =>
    new Request('https://garoutom.example/ws', {
      headers: { Upgrade: 'websocket', ...(origine ? { Origin: origine } : {}) },
    });

  it('répond à la santé sans réveiller l’objet', async () => {
    const { env, noms } = environnement();
    const reponse = await worker.fetch(new Request('https://garoutom.example/health'), env);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, canal: '/ws' });
    expect(noms).toEqual([]);
  });

  it('remet le canal à l’unique objet des tables', async () => {
    const { env, noms } = environnement();
    const reponse = await worker.fetch(bascule('https://garoutom.tombp.fr'), env);
    expect(await reponse.text()).toBe('objet');
    expect(noms).toEqual([NOM_DE_L_OBJET]);
  });

  it('refuse ce qui n’est pas le canal, ou pas une bascule', async () => {
    const { env } = environnement();
    expect((await worker.fetch(new Request('https://garoutom.example/'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://garoutom.example/ws'), env)).status).toBe(426);
  });

  it('filtre les origines quand la liste est posée', async () => {
    const { env, noms } = environnement('https://garoutom.tombp.fr/, http://localhost:5177');
    expect((await worker.fetch(bascule('https://ailleurs.example'), env)).status).toBe(403);
    expect((await worker.fetch(bascule('http://localhost:5177'), env)).status).toBe(200);
    expect(noms).toEqual([NOM_DE_L_OBJET]);
  });

  it('admet tout le monde sans liste, et les clients sans Origin', () => {
    expect(origineAdmise('https://ailleurs.example', undefined)).toBe(true);
    expect(origineAdmise(null, 'https://garoutom.tombp.fr')).toBe(true);
    expect(origineAdmise('https://ailleurs.example', '*')).toBe(true);
    expect(origineAdmise('https://ailleurs.example', 'https://garoutom.tombp.fr')).toBe(false);
  });
});
