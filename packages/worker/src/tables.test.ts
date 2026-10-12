/**
 * L'objet des tables, branché sur le vrai cœur (`RoomManager`, `Hub`), sous
 * Node : base SQLite réelle, sockets et alarme doublées (`essais/doublures.ts`).
 *
 * Trois vies sont simulées :
 *
 * - **l'hibernation** — un nouvel objet sur le même `ctx` : mêmes sockets
 *   (leurs attachements compris), même base, mémoire vierge ;
 * - **le déploiement** — un nouvel objet sur un `ctx` neuf qui ne partage que
 *   la base : toutes les sockets sont tombées ;
 * - **le temps** — l'horloge avancée à la main, l'alarme sonnée à la main.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { FausseSocket, FauxCtx, FauxStockage } from './essais/doublures.js';
import { TablesDO } from './tables.js';

interface Ack {
  t: 'ack';
  id: number;
  r: { ok: boolean; data?: Record<string, unknown>; error?: string; code?: string };
}

afterEach(() => {
  vi.useRealTimers();
});

async function objet(ctx: FauxCtx): Promise<TablesDO> {
  const tables = new TablesDO(ctx.commeEtat(), { VERSION: { id: 'v-essai' } });
  await tables.pret;
  return tables;
}

function ouvrir(tables: TablesDO, protocole = 2): FausseSocket {
  const socket = new FausseSocket();
  tables.brancher(socket as unknown as WebSocket, protocole, '203.0.113.9');
  return socket;
}

let numero = 0;
async function demander(tables: TablesDO, socket: FausseSocket, e: string, d: unknown): Promise<Ack['r']> {
  numero += 1;
  const id = numero;
  await tables.webSocketMessage(socket as unknown as WebSocket, JSON.stringify({ t: 'req', id, e, d }));
  const ack = socket.recus.find((cadre): cadre is Ack & Record<string, unknown> => cadre.t === 'ack' && cadre.id === id);
  if (!ack) throw new Error(`Pas d’accusé pour ${e}`);
  return ack.r;
}

/** Une table de six joueurs, partie lancée. */
async function partie(tables: TablesDO): Promise<{ code: string; sockets: FausseSocket[]; jetons: string[] }> {
  const hote = ouvrir(tables);
  const creee = await demander(tables, hote, 'room:create', { name: 'Hôte' });
  expect(creee.ok).toBe(true);
  const code = String(creee.data?.code);
  const sockets = [hote];
  const jetons = [String(creee.data?.token)];
  for (let i = 1; i < 6; i += 1) {
    const socket = ouvrir(tables);
    const rejoint = await demander(tables, socket, 'room:join', { code, name: `Joueur ${String(i)}` });
    expect(rejoint.ok).toBe(true);
    sockets.push(socket);
    jetons.push(String(rejoint.data?.token));
  }
  const lancee = await demander(tables, hote, 'room:start', {});
  expect(lancee).toMatchObject({ ok: true });
  return { code, sockets, jetons };
}

type TableRangee = { status: string; game: { phaseSeq: number } | null; timing: { deadline: number } | null };

describe('l’objet des tables — l’ouverture', () => {
  it('dit bonjour, crée une table et la range dans SQLite', async () => {
    const stockage = await FauxStockage.ouvrir();
    const tables = await objet(new FauxCtx(stockage));
    const socket = ouvrir(tables);
    expect(socket.cadres('hello')).toHaveLength(1);

    const reponse = await demander(tables, socket, 'room:create', { name: 'Tom' });
    expect(reponse.ok).toBe(true);
    const code = String(reponse.data?.code);
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(socket.cadres('ev').some((cadre) => cadre.e === 'sync')).toBe(true);

    const ligne = stockage.sql.exec('SELECT status FROM rooms WHERE code = ?', code).toArray()[0];
    expect(ligne).toEqual({ status: 'lobby' });
  });

  it('répond au ping du protocole par un pong portant son id et l’heure', async () => {
    const tables = await objet(new FauxCtx(await FauxStockage.ouvrir()));
    const socket = ouvrir(tables);
    await tables.webSocketMessage(socket as unknown as WebSocket, JSON.stringify({ t: 'ping', id: 41 }));
    expect(socket.cadres('pong')).toEqual([expect.objectContaining({ t: 'pong', id: 41, now: expect.any(Number) })]);
  });

  it('ignore un cadre illisible sans couper la connexion', async () => {
    const tables = await objet(new FauxCtx(await FauxStockage.ouvrir()));
    const socket = ouvrir(tables);
    await tables.webSocketMessage(socket as unknown as WebSocket, 'pas du json');
    await tables.webSocketMessage(socket as unknown as WebSocket, new ArrayBuffer(4));
    expect(socket.fermeture).toBeNull();
  });
});

describe('l’objet des tables — l’hibernation', () => {
  it('se réveille sans rien oublier : session, table, et pas de second bonjour', async () => {
    const ctx = new FauxCtx(await FauxStockage.ouvrir());
    const avant = await objet(ctx);
    const socket = ouvrir(avant);
    const creee = await demander(avant, socket, 'room:create', { name: 'Tom' });
    const code = String(creee.data?.code);

    // Mémoire vierge, mêmes sockets, même base.
    const apres = await objet(ctx);
    const reglage = await demander(apres, socket, 'room:options', { options: {} });
    expect(reglage).toMatchObject({ ok: true });
    expect(socket.cadres('hello')).toHaveLength(1);
    expect(await apres.magasin.has(code)).toBe(true);
  });

  it('garde le silence à travers le sommeil : la Voyante sonde, le villageois ne reçoit rien (D23)', async () => {
    const ctx = new FauxCtx(await FauxStockage.ouvrir());
    const avant = await objet(ctx);
    const hote = ouvrir(avant);
    const options = { auto: false, loups: 1, roles: ['voyante'], capitaine: false };
    const creee = await demander(avant, hote, 'room:create', { name: 'Hôte', options });
    const code = String(creee.data?.code);
    const sockets = [hote];
    for (let i = 1; i < 6; i += 1) {
      const socket = ouvrir(avant);
      expect(await demander(avant, socket, 'room:join', { code, name: `Joueur ${String(i)}` })).toMatchObject({ ok: true });
      sockets.push(socket);
    }
    expect(await demander(avant, hote, 'room:start', {})).toMatchObject({ ok: true });
    // Tout le monde confirme sa carte : la nuit tombe.
    for (const socket of sockets) await demander(avant, socket, 'game:action', { action: { type: 'pret' } });

    const rangee = (await avant.magasin.load(code)) as { game: { players: { seat: number; role: string }[] } };
    const siege = (role: string): number => rangee.game.players.find((joueur) => joueur.role === role)?.seat ?? -1;
    const voyante = sockets[siege('voyante')]!;
    const villageois = sockets[siege('villageois')]!;
    const syncs = (socket: FausseSocket): number => socket.cadres('ev').filter((cadre) => cadre.e === 'sync').length;

    const avantSommeil = syncs(villageois);
    // L'objet s'endort : mémoire vierge, mêmes sockets (attachements compris), même base.
    const apres = await objet(ctx);
    expect(await demander(apres, voyante, 'game:action', { action: { type: 'sonder', target: siege('villageois') } })).toMatchObject({
      ok: true,
    });

    expect(syncs(villageois)).toBe(avantSommeil);
    // La Voyante, elle, voit son geste compté.
    const derniere = voyante.cadres('ev').filter((cadre) => cadre.e === 'sync').at(-1) as { d: { game: { acted: boolean } } };
    expect(derniere.d.game.acted).toBe(true);
    // L'empreinte dort dans l'attachement : seize caractères, loin des 16 Kio.
    const attache = villageois.deserializeAttachment() as { empreinte: string };
    expect(attache.empreinte).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(attache).length).toBeLessThan(400);
  });

  it('rend la fermeture d’une socket au cœur, même après un sommeil', async () => {
    const ctx = new FauxCtx(await FauxStockage.ouvrir());
    const avant = await objet(ctx);
    const hote = ouvrir(avant);
    const creee = await demander(avant, hote, 'room:create', { name: 'Hôte' });
    const code = String(creee.data?.code);
    const invite = ouvrir(avant);
    await demander(avant, invite, 'room:join', { code, name: 'Invité' });

    const apres = await objet(ctx);
    invite.readyState = 3;
    await apres.webSocketClose(invite as unknown as WebSocket, 1001);
    await apres.webSocketError(invite as unknown as WebSocket, new Error('doublon'));
    const table = (await apres.magasin.load(code)) as { players: { name: string; socketId: string | null }[] } | null;
    const invitee = table?.players.find((joueur) => joueur.name === 'Invité');
    // Au salon, la place se libère après une grâce, ou tout de suite : elle n'est plus tenue par la socket.
    expect(invitee?.socketId ?? null).toBeNull();
  });
});

describe('l’objet des tables — le temps', () => {
  it('confie l’échéance de phase à l’alarme, et la clôt au réveil même sur une instance neuve', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_800_000_000_000);
    const stockage = await FauxStockage.ouvrir();
    const ctx = new FauxCtx(stockage);
    const avant = await objet(ctx);
    const { code } = await partie(avant);

    const rangee = (await avant.magasin.load(code)) as TableRangee;
    expect(rangee.status).toBe('playing');
    const seq = rangee.game?.phaseSeq ?? -1;
    const echeance = rangee.timing?.deadline ?? Number.NaN;
    expect(Number.isFinite(echeance)).toBe(true);
    expect(stockage.alarme).not.toBeNull();
    expect(stockage.alarme).toBeLessThanOrEqual(echeance);

    // L'objet s'endort (ou est évincé) ; l'heure passe ; l'alarme sonne.
    vi.setSystemTime(echeance + 50);
    const apres = await objet(ctx);
    await apres.alarm();

    const relue = (await apres.magasin.load(code)) as TableRangee;
    expect(relue.game?.phaseSeq ?? -1).toBeGreaterThan(seq);
    expect(stockage.alarme).not.toBeNull();
    expect(stockage.alarme).toBeGreaterThan(echeance);
  });

  it('survit à un déploiement : sockets perdues, table retrouvée par jeton', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_800_000_000_000);
    const stockage = await FauxStockage.ouvrir();
    const avant = await objet(new FauxCtx(stockage));
    const { code, jetons } = await partie(avant);

    // Nouveau code, nouvelle mémoire, plus aucune socket : seule la base reste.
    const deploye = new TablesDO(new FauxCtx(stockage).commeEtat(), { VERSION: { id: 'v-suivante' } });
    await deploye.pret;
    const revenu = ouvrir(deploye);
    const reprise = await demander(deploye, revenu, 'room:join', { code, name: 'Hôte', token: jetons[0], lastSeq: 0 });
    expect(reprise).toMatchObject({ ok: true });
    expect(reprise.data?.token).toBe(jetons[0]);
    const sync = revenu.cadres('ev').find((cadre) => cadre.e === 'sync');
    expect(sync).toBeDefined();
    expect((await deploye.magasin.load(code)) as TableRangee).toMatchObject({ status: 'playing' });
  });

  it('ferme une socket de protocole 2 muette depuis 70 s, jamais une de protocole 1', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_800_000_000_000);
    const tables = await objet(new FauxCtx(await FauxStockage.ouvrir()));
    // Assises toutes deux : une socket qui n'a rejoint aucune table est
    // fermée par le concentrateur au bout de 30 s, pour une autre raison.
    const moderne = ouvrir(tables, 2);
    const creee = await demander(tables, moderne, 'room:create', { name: 'Moderne' });
    const ancienne = ouvrir(tables, 1);
    await demander(tables, ancienne, 'room:join', { code: creee.data?.code, name: 'Ancienne' });
    vi.setSystemTime(1_800_000_000_000 + 71_000);
    await tables.alarm();
    expect(moderne.fermeture?.code).toBe(1001);
    expect(ancienne.fermeture).toBeNull();
  });

  it('dit sa santé profonde : tables par statut, sockets, alarme, schéma', async () => {
    const tables = await objet(new FauxCtx(await FauxStockage.ouvrir()));
    const socket = ouvrir(tables);
    await demander(tables, socket, 'room:create', { name: 'Tom' });
    const sante = await tables.sante();
    expect(sante).toMatchObject({ ok: true, version: 'v-essai', schema: 1, sockets: 1, tables: { lobby: 1, playing: 0, finished: 0 } });
  });
});
