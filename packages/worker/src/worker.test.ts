/**
 * Le Worker, éprouvé sous Node : les morceaux qui ne dépendent pas du cœur.
 *
 * La porte (son objet remplacé par une doublure), le tirage uniforme,
 * l'annuaire des sockets et la prise. L'objet lui-même, branché sur le cœur
 * des tables, s'éprouve dans `tables.test.ts` — et en vrai sous
 * `wrangler dev`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnuaireSockets, lireAttache, PAS_VU_MS, type Attache } from './annuaire.js';
import { FausseSocket, FauxCtx, FauxStockage } from './essais/doublures.js';
import { entierUniforme } from './hote.js';
import worker, { memeSecret, NOM_DE_L_OBJET, origineAdmise, type Env } from './porte.js';
import { prise } from './prise.js';

afterEach(() => {
  vi.restoreAllMocks();
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

describe('l’annuaire des sockets', () => {
  async function monter(): Promise<{ ctx: FauxCtx; annuaire: AnnuaireSockets<FausseSocket>; socket: FausseSocket }> {
    const ctx = new FauxCtx(await FauxStockage.ouvrir());
    const socket = new FausseSocket();
    ctx.acceptWebSocket(socket, ['s1']);
    socket.serializeAttachment({ id: 's1', protocol: 2, code: null, playerId: null, depuis: 100, vu: 100, ip: '203.0.113.7' } satisfies Attache);
    return { ctx, annuaire: new AnnuaireSockets(ctx), socket };
  }

  it('range la session dans l’attachement, et la retrouve après un « réveil »', async () => {
    const { ctx, annuaire } = await monter();
    expect(annuaire.get('s1')).toBeUndefined();
    annuaire.set('s1', { code: 'ABCD', playerId: 'p1' });
    // Un annuaire neuf sur le même ctx : la mémoire est vierge, les sockets non.
    const reveil = new AnnuaireSockets(ctx);
    expect(reveil.get('s1')).toEqual({ code: 'ABCD', playerId: 'p1' });
    expect(reveil.attache('s1')).toMatchObject({ ip: '203.0.113.7', protocol: 2, depuis: 100 });
    reveil.delete('s1');
    expect(annuaire.get('s1')).toBeUndefined();
  });

  it('ne connaît pas une socket inconnue, ni ne lève pour elle', async () => {
    const { annuaire } = await monter();
    expect(annuaire.get('inconnue')).toBeUndefined();
    annuaire.set('inconnue', { code: 'ABCD', playerId: 'p1' });
    annuaire.delete('inconnue');
    expect(annuaire.isLive('inconnue')).toBe(false);
  });

  it('dit vivante une socket ouverte, et plus après sa fermeture', async () => {
    const { annuaire, socket } = await monter();
    expect(annuaire.isLive('s1')).toBe(true);
    socket.readyState = 2; // en cours de fermeture
    expect(annuaire.isLive('s1')).toBe(false);
  });

  it('ne réécrit le signe de vie qu’après un pas', async () => {
    const { annuaire, socket } = await monter();
    const ecrire = vi.spyOn(socket, 'serializeAttachment');
    annuaire.signeDeVie(socket, 100 + PAS_VU_MS - 1);
    expect(ecrire).not.toHaveBeenCalled();
    annuaire.signeDeVie(socket, 100 + PAS_VU_MS);
    expect(lireAttache(socket)?.vu).toBe(100 + PAS_VU_MS);
  });

  it('garde l’empreinte de la dernière vue à travers un « réveil », et l’oublie avec la session (D23)', async () => {
    const { ctx, annuaire, socket } = await monter();
    expect(annuaire.fingerprint('s1')).toBeUndefined();
    annuaire.set('s1', { code: 'ABCD', playerId: 'p1' });
    annuaire.setFingerprint('s1', '0123456789abcdef');
    expect(new AnnuaireSockets(ctx).fingerprint('s1')).toBe('0123456789abcdef');

    // Une empreinte inchangée ne coûte pas d'écriture ; une démesurée est ignorée.
    const ecrire = vi.spyOn(socket, 'serializeAttachment');
    annuaire.setFingerprint('s1', '0123456789abcdef');
    expect(ecrire).not.toHaveBeenCalled();
    annuaire.setFingerprint('s1', 'x'.repeat(10_000));
    expect(annuaire.fingerprint('s1')).toBeUndefined();

    annuaire.setFingerprint('s1', 'fedcba9876543210');
    annuaire.setFingerprint('s1', '');
    expect(annuaire.fingerprint('s1')).toBeUndefined();
    annuaire.setFingerprint('s1', 'fedcba9876543210');
    annuaire.set('s1', { code: 'WXYZ', playerId: 'p2' });
    expect(annuaire.fingerprint('s1')).toBeUndefined();
    annuaire.setFingerprint('s1', 'fedcba9876543210');
    annuaire.delete('s1');
    expect(annuaire.fingerprint('s1')).toBeUndefined();
    // Une socket inconnue ne lève pas.
    annuaire.setFingerprint('inconnue', 'fedcba9876543210');
    expect(annuaire.fingerprint('inconnue')).toBeUndefined();
  });

  it('ignore un attachement qui n’a pas la forme attendue', () => {
    const socket = new FausseSocket();
    socket.serializeAttachment({ id: 3 });
    expect(lireAttache(socket)).toBeNull();
  });
});

describe('la prise', () => {
  const attache: Attache = { id: 's1', protocol: 2, code: null, playerId: null, depuis: 0, vu: 0, ip: '198.51.100.1' };

  it('présente la socket au concentrateur : envoi, fermeture, adresse, protocole', () => {
    const socket = new FausseSocket();
    const branchee = prise(socket, attache, false);
    expect(branchee.ip).toBe('198.51.100.1');
    expect(branchee.protocol).toBe(2);
    branchee.send('{"t":"hello","protocol":2}');
    expect(socket.recus).toEqual([{ t: 'hello', protocol: 2 }]);
    branchee.close(4001, 'Partie ouverte ailleurs');
    expect(socket.fermeture).toEqual({ code: 4001, raison: 'Partie ouverte ailleurs' });
    // Ni l'envoi ni la fermeture d'une socket fermée ne lèvent.
    branchee.send('{"t":"ev"}');
    branchee.close();
  });

  it('avale le hello d’un rattachement, et seulement lui', () => {
    const socket = new FausseSocket();
    const rattachee = prise(socket, attache, true);
    rattachee.send('{"t":"hello","protocol":2}');
    rattachee.send('{"t":"hello","protocol":2}');
    expect(socket.recus).toEqual([{ t: 'hello', protocol: 2 }]);

    const autre = new FausseSocket();
    const sansHello = prise(autre, attache, true);
    sansHello.send('{"t":"pong","id":1,"now":5}');
    expect(autre.recus).toEqual([{ t: 'pong', id: 1, now: 5 }]);
  });
});

describe('la porte du Worker', () => {
  /** Une doublure de l'espace d'objets : elle note qui on a réveillé, et ce qu'on lui a demandé. */
  function environnement(vars: Partial<Env> = {}): { env: Env; noms: string[]; chemins: string[] } {
    const noms: string[] = [];
    const chemins: string[] = [];
    const tablesDO = {
      idFromName: (nom: string) => {
        noms.push(nom);
        return nom;
      },
      get: () => ({
        fetch: (requete: Request) => {
          chemins.push(new URL(requete.url).pathname);
          return Promise.resolve(Response.json({ ok: true, tables: { playing: 0 } }));
        },
      }),
    };
    return { env: { TABLES: tablesDO as unknown as DurableObjectNamespace, ...vars }, noms, chemins };
  }

  const bascule = (origine?: string): Request =>
    new Request('https://garoutom.example/ws', {
      headers: { Upgrade: 'websocket', ...(origine ? { Origin: origine } : {}) },
    });

  it('répond à la santé sans réveiller l’objet', async () => {
    const { env, noms } = environnement({ VERSION: { id: 'v-essai' } });
    const reponse = await worker.fetch(new Request('https://garoutom.example/health'), env);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, canal: '/ws', protocole: 2, version: 'v-essai' });
    expect(noms).toEqual([]);
  });

  it('ferme la santé profonde sans secret posé, ou sur un mauvais jeton', async () => {
    const sansSecret = environnement();
    const profonde = new Request('https://garoutom.example/health?profond=1', { headers: { Authorization: 'Bearer x' } });
    expect((await worker.fetch(profonde, sansSecret.env)).status).toBe(404);

    const { env, noms } = environnement({ ADMIN_TOKEN: 'le-bon' });
    expect((await worker.fetch(new Request('https://garoutom.example/health?profond=1'), env)).status).toBe(401);
    expect((await worker.fetch(profonde, env)).status).toBe(401);
    expect(noms).toEqual([]);
  });

  it('remet la santé profonde à l’objet sur le bon jeton', async () => {
    const { env, chemins } = environnement({ ADMIN_TOKEN: 'le-bon' });
    const reponse = await worker.fetch(
      new Request('https://garoutom.example/health?profond=1', { headers: { Authorization: 'Bearer le-bon' } }),
      env,
    );
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, tables: { playing: 0 } });
    expect(chemins).toEqual(['/sante']);
  });

  it('remet le canal à l’unique objet des tables', async () => {
    const { env, noms } = environnement({ ORIGINES: 'https://garoutom.tombp.fr' });
    const reponse = await worker.fetch(bascule('https://garoutom.tombp.fr'), env);
    expect(reponse.status).toBe(200);
    expect(noms).toEqual([NOM_DE_L_OBJET]);
  });

  it('refuse ce qui n’est pas le canal, ou pas une bascule', async () => {
    const { env } = environnement();
    expect((await worker.fetch(new Request('https://garoutom.example/'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://garoutom.example/ws'), env)).status).toBe(426);
  });

  it('filtre les origines quand la liste est posée', async () => {
    const { env, noms } = environnement({ ORIGINES: 'https://garoutom.tombp.fr/, http://localhost:5177' });
    expect((await worker.fetch(bascule('https://ailleurs.example'), env)).status).toBe(403);
    expect((await worker.fetch(bascule('http://localhost:5177'), env)).status).toBe(200);
    expect(noms).toEqual([NOM_DE_L_OBJET]);
  });

  it('sans liste, laisse passer mais le dit au journal — une fois', async () => {
    const avert = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { env } = environnement();
    expect((await worker.fetch(bascule('https://ailleurs.example'), env)).status).toBe(200);
    expect((await worker.fetch(bascule('https://ailleurs.example'), env)).status).toBe(200);
    const lignes = avert.mock.calls.map(([ligne]) => String(ligne)).filter((ligne) => ligne.includes('origines-absentes'));
    expect(lignes.length).toBeLessThanOrEqual(1);
  });

  it('admet tout le monde sans liste, et les clients sans Origin', () => {
    expect(origineAdmise('https://ailleurs.example', undefined)).toBe(true);
    expect(origineAdmise(null, 'https://garoutom.tombp.fr')).toBe(true);
    expect(origineAdmise('https://ailleurs.example', '*')).toBe(true);
    expect(origineAdmise('https://ailleurs.example', 'https://garoutom.tombp.fr')).toBe(false);
  });

  it('compare les secrets sans se tromper de longueur', () => {
    expect(memeSecret('abc', 'abc')).toBe(true);
    expect(memeSecret('abd', 'abc')).toBe(false);
    expect(memeSecret('ab', 'abc')).toBe(false);
    expect(memeSecret('abcd', 'abc')).toBe(false);
    expect(memeSecret('', 'abc')).toBe(false);
  });
});
