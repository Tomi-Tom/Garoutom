/**
 * Le concentrateur, éprouvé de bout en bout — mais sans réseau.
 *
 * Chaque connexion de laboratoire est un petit client brut : il écrit des
 * cadres `req`/`ping` comme le ferait le canal, et lit ce qui revient —
 * `hello`, `ack`, `ev`, `pong`, fermetures. Volontairement indépendant du
 * `Channel` du client : ce qu'on éprouve ici, c'est la moitié serveur du
 * contrat de transport, cadre par cadre.
 *
 * L'horloge du concentrateur et celle des tables sont la même horloge à la
 * main : les quotas et les grâces avancent ensemble.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CAPABILITIES,
  CLOSE_POLICY,
  CLOSE_REPLACED,
  HEARTBEAT_MS,
  PROTOCOL_VERSION,
  type Ack,
  type JoinResult,
  type ServerFrame,
  type SyncPayload,
} from '@garoutom/engine';

import { DEBUT, NOMS } from './banc.js';
import { Hub, type HubSession } from './hub.js';
import { RoomManager, type HostServices, type Room } from './rooms.js';
import { MemoryRoomStore } from './store.js';

/* ------------------------------------------------------------------ */
/* Le banc d'essai                                                     */
/* ------------------------------------------------------------------ */

const horloge = { now: DEBUT };

class Client {
  readonly frames: ServerFrame[] = [];
  closed: { code: number | undefined; reason: string | undefined } | null = null;
  readonly session: HubSession;
  private next = 1;

  constructor(hub: Hub, options: { ip?: string; protocol?: number; id?: string } = {}) {
    this.session = hub.attach(
      {
        send: (data) => {
          this.frames.push(JSON.parse(data) as ServerFrame);
        },
        close: (code, reason) => {
          this.closed = { code, reason };
        },
        ...(options.ip === undefined ? {} : { ip: options.ip }),
        ...(options.protocol === undefined ? {} : { protocol: options.protocol }),
      },
      options.id,
    );
  }

  /** Une demande, et son accusé. */
  async req(e: string, d: unknown = {}): Promise<Ack<unknown>> {
    const id = this.next;
    this.next += 1;
    await this.session.receive(JSON.stringify({ t: 'req', id, e, d }));
    const ack = this.frames.find((frame) => frame.t === 'ack' && frame.id === id);
    if (!ack || ack.t !== 'ack') throw new Error(`aucun accusé pour ${e}`);
    return ack.r;
  }

  /** Une demande qui doit réussir. */
  async ok<T>(e: string, d: unknown = {}): Promise<T> {
    const r = await this.req(e, d);
    if (!r.ok) throw new Error(`${e} refusé : ${r.error}`);
    return r.data as T;
  }

  get syncs(): SyncPayload[] {
    return this.frames.flatMap((frame) => (frame.t === 'ev' && frame.e === 'sync' ? [frame.d as SyncPayload] : []));
  }
}

interface Monte {
  hub: Hub;
  manager: RoomManager;
  store: MemoryRoomStore<Room>;
}

function monter(options: { store?: MemoryRoomStore<Room>; quotas?: ConstructorParameters<typeof Hub>[1] } = {}): Monte {
  let counter = 0;
  let state = 7;
  const hub = new Hub(
    () => {
      counter += 1;
      return `connexion-${String(counter)}`;
    },
    { now: () => horloge.now, ...options.quotas },
  );
  const host: HostServices = {
    now: () => horloge.now,
    uuid: () => {
      counter += 1;
      return `id-${String(counter)}`;
    },
    randomInt: (maxExclusive) => {
      state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
      return Math.floor((state / 4294967296) * maxExclusive);
    },
    wake: () => undefined,
  };
  const store = options.store ?? new MemoryRoomStore<Room>();
  // Le concentrateur est l'émetteur : parler à une connexion, c'est son métier.
  const manager = new RoomManager(hub, store, host);
  hub.serve(manager);
  return { hub, manager, store };
}

interface Place {
  client: Client;
  playerId: string;
  token: string;
}

/** Ouvre une table par le concentrateur et la remplit de `n` connexions. */
async function remplir(hub: Hub, n: number): Promise<{ code: string; places: Place[] }> {
  const places: Place[] = [];
  const premiere = new Client(hub);
  const result = await premiere.ok<JoinResult>('room:create', { name: NOMS[0] });
  places.push({ client: premiere, playerId: result.playerId, token: result.token });
  for (let i = 1; i < n; i += 1) {
    const client = new Client(hub);
    const joint = await client.ok<JoinResult>('room:join', { code: result.code, name: NOMS[i] });
    places.push({ client, playerId: joint.playerId, token: joint.token });
  }
  return { code: result.code, places };
}

let erreurs: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  horloge.now = DEBUT;
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  erreurs.mockRestore();
});

/* ------------------------------------------------------------------ */
/* Les épreuves                                                        */
/* ------------------------------------------------------------------ */

describe('le concentrateur : présentation et battement (D22)', () => {
  it('se présente aussitôt attaché : version, capacités, battement', () => {
    const { hub } = monter();
    const client = new Client(hub, { protocol: 1 });
    expect(client.frames[0]).toEqual({
      t: 'hello',
      protocol: 1,
      capabilities: [...CAPABILITIES],
      heartbeatMs: HEARTBEAT_MS,
    });
    expect(new Client(hub).frames[0]).toMatchObject({ t: 'hello', protocol: PROTOCOL_VERSION });
  });

  it('répond aux ping par pong, avec son heure, sans passer par les tables', async () => {
    const hub = new Hub(() => 'seule', { now: () => 1234 });
    const client = new Client(hub); // aucun gestionnaire servi
    await client.session.receive(JSON.stringify({ t: 'ping', id: 9 }));
    expect(client.frames.at(-1)).toEqual({ t: 'pong', id: 9, now: 1234 });
  });

  it('retrouve une session par son identifiant, et accepte un identifiant imposé', () => {
    const { hub } = monter();
    const client = new Client(hub, { id: 'etiquette' });
    expect(client.session.id).toBe('etiquette');
    expect(hub.session('etiquette')).toBe(client.session);
    expect(hub.session('inconnue')).toBeUndefined();
  });
});

describe('le concentrateur : aiguillage', () => {
  it('sert un aller-retour complet : la place, le jeton, puis l’état qui suit', async () => {
    const { hub } = monter();
    const alice = new Client(hub);

    const result = await alice.ok<JoinResult>('room:create', { name: 'Alice' });

    expect(result.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(result.token).toBeTruthy();
    expect(alice.syncs.at(-1)?.room.players[0]?.name).toBe('Alice');
  });

  it('refuse ce qui n’est pas dans la table d’aiguillage, et survit à l’illisible', async () => {
    const { hub } = monter();
    const alice = new Client(hub);

    expect(await alice.req('room:explode')).toMatchObject({ ok: false, error: 'Demande inconnue' });
    await alice.session.receive('ce n’est pas du json');
    await alice.session.receive(JSON.stringify({ t: 'req', id: 'x', e: 'room:create' }));
    const result = await alice.ok<JoinResult>('room:create', { name: 'Alice' });
    expect(result.code).toBeTruthy();
  });

  it('une action refusée revient avec le message et le code du moteur', async () => {
    const { hub } = monter();
    const { places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');

    const refus = await places[1]!.client.req('game:action', { action: { type: 'voter', target: 0 } });
    expect(refus).toEqual({ ok: false, error: 'Ce n’est pas le moment de voter', code: 'wrong-phase' });
  });

  it('une erreur inattendue part en code internal, jamais avec son message', async () => {
    const { hub, manager } = monter();
    vi.spyOn(manager, 'create').mockRejectedValue(new Error('secret : /srv/garoutom/.env'));
    const alice = new Client(hub);
    const refus = await alice.req('room:create', { name: 'Alice' });
    expect(refus).toMatchObject({ ok: false, code: 'internal' });
    expect(JSON.stringify(refus)).not.toContain('secret');
    expect(erreurs).toHaveBeenCalled();
  });

  it('le silence traverse le concentrateur : chaque siège reçoit sa vue', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');

    const roles = (await manager.peek(code))?.game?.players ?? [];
    const loup = roles.find((player) => player.role === 'loup')!.seat;
    const villageois = roles.find((player) => player.role === 'villageois')!.seat;

    const vueLoup = places[loup]!.client.syncs.at(-1)!;
    const vueVillageois = places[villageois]!.client.syncs.at(-1)!;
    expect(vueVillageois.game?.pack).toBeNull();
    expect(vueLoup.game?.pack?.seats).toContain(loup);
    expect(vueVillageois.room.deadline).toBe(vueVillageois.serverNow + 25_000);
  });
});

describe('le concentrateur : reprise et join idempotent (D17, D22)', () => {
  it('un second room:join sur la même socket ne l’éjecte pas', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');
    const brice = places[1]!;

    const encore = await brice.client.ok<JoinResult>('room:join', { code, name: 'Brice', token: brice.token });
    expect(encore.playerId).toBe(brice.playerId);
    const place = (await manager.peek(code))?.players.find((player) => player.id === brice.playerId);
    expect(place?.socketId).toBe(brice.client.session.id);
    expect(brice.client.closed).toBeNull();
    expect(await brice.client.req('game:action', { action: { type: 'pret' } })).toMatchObject({ ok: true });
  });

  it('la reprise depuis un autre onglet ferme l’ancien en 4001', async () => {
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');
    const brice = places[1]!;

    const onglet = new Client(hub);
    await onglet.ok('room:join', { code, name: 'Brice', token: brice.token });
    expect(brice.client.closed?.code).toBe(CLOSE_REPLACED);
    // L'hôte signale la fermeture : la nouvelle place n'en est pas affectée.
    await brice.client.session.close();
    const place = (await manager.peek(code))?.players.find((player) => player.id === brice.playerId);
    expect(place?.socketId).toBe(onglet.session.id);
  });

  it('le jeton reprend la place même après la grâce (D17 — il n’y a plus de jeton périmé en partie)', async () => {
    // Avant D17, la grâce éteinte supprimait le joueur et ce jeton ne
    // rouvrait plus rien ; désormais le siège l'attend jusqu'à la fin.
    const { hub, manager } = monter();
    const { code, places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');

    const parti = places[2]!;
    await parti.client.session.close();
    horloge.now += 10 * 60_000;
    await manager.watchdog();

    const retour = new Client(hub);
    const reprise = await retour.ok<JoinResult>('room:join', { code, name: 'Céline', token: parti.token });
    expect(reprise.playerId).toBe(parti.playerId);
    const revenu = (await manager.peek(code))?.players.find((player) => player.id === parti.playerId);
    expect(revenu).toMatchObject({ seat: 2, socketId: retour.session.id, absent: false });
  });

  it('une fermeture pendant un join en vol ne laisse pas de joueur fantôme connecté', async () => {
    const store = new (class extends MemoryRoomStore<Room> {
      lent = false;
      override async load(code: string): Promise<Room | null> {
        if (this.lent) await new Promise((resolve) => setTimeout(resolve, 5));
        return super.load(code);
      }
    })();
    const { hub, manager } = monter({ store });
    const alice = new Client(hub);
    const { code } = await alice.ok<JoinResult>('room:create', { name: 'Alice' });

    store.lent = true;
    const brice = new Client(hub);
    const enVol = brice.req('room:join', { code, name: 'Brice' });
    const fermeture = brice.session.close();
    await Promise.all([enVol, fermeture]);

    const room = await manager.peek(code);
    const fantome = room?.players.find((player) => player.name === 'Brice');
    expect(fantome?.socketId ?? null).toBeNull();
    expect(manager.seated(brice.session.id)).toBe(false);
  });
});

describe('le concentrateur : quotas (D23)', () => {
  it('au-delà de la rafale de 30 cadres, refus `rate` ; la cadence revient avec le temps', async () => {
    const { hub } = monter();
    const client = new Client(hub);
    await client.ok('room:create', { name: 'Alice' });
    const refus: Ack<unknown>[] = [];
    for (let i = 0; i < 35; i += 1) refus.push(await client.req('room:explode'));
    expect(refus.filter((r) => !r.ok && r.code === 'rate')).toHaveLength(35 - 29);
    horloge.now += 1_000;
    expect(await client.req('room:explode')).toMatchObject({ code: 'unknown' });
  });

  it('une socket qui insiste au-delà des refus tolérés est fermée', async () => {
    const { hub } = monter();
    const client = new Client(hub);
    for (let i = 0; i < 100; i += 1) await client.session.receive(JSON.stringify({ t: 'ping', id: i }));
    expect(client.closed?.code).toBe(CLOSE_POLICY);
  });

  it('le fil : un message par seconde, rafale de cinq', async () => {
    const { hub } = monter();
    const { places } = await remplir(hub, 6);
    await places[0]!.client.ok('room:start');
    const dire = { action: { type: 'dire', channel: 'village', text: 'bonsoir' } };
    const reponses: Ack<unknown>[] = [];
    for (let i = 0; i < 6; i += 1) reponses.push(await places[1]!.client.req('game:action', dire));
    expect(reponses.slice(0, 5).every((r) => !r.ok && r.code !== 'rate')).toBe(true); // refusés par le moteur, pas par le quota
    expect(reponses[5]).toMatchObject({ ok: false, code: 'rate' });
  });

  it('trois tables par minute et par adresse', async () => {
    const { hub } = monter();
    const resultats: Ack<unknown>[] = [];
    for (let i = 0; i < 4; i += 1) {
      resultats.push(await new Client(hub, { ip: '203.0.113.7' }).req('room:create', { name: 'Alice' }));
    }
    expect(resultats.slice(0, 3).every((r) => r.ok)).toBe(true);
    expect(resultats[3]).toMatchObject({ ok: false, code: 'rate' });
    // Une autre adresse n'en pâtit pas.
    expect(await new Client(hub, { ip: '198.51.100.1' }).req('room:create', { name: 'Brice' })).toMatchObject({
      ok: true,
    });
    horloge.now += 60_000;
    expect(await new Client(hub, { ip: '203.0.113.7' }).req('room:create', { name: 'Alice' })).toMatchObject({
      ok: true,
    });
  });

  it('dix join ratés par minute et par adresse : la devinette de codes s’arrête', async () => {
    const { hub } = monter();
    const { code } = await remplir(hub, 1);
    const devin = new Client(hub, { ip: '203.0.113.9' });
    for (let i = 0; i < 10; i += 1) {
      expect(await devin.req('room:join', { code: 'ZZZZ', name: 'Devin' })).toMatchObject({ code: 'gone' });
    }
    expect(await devin.req('room:join', { code, name: 'Devin' })).toMatchObject({ ok: false, code: 'rate' });
  });

  it('une socket assise à aucune table est fermée au bout de 30 s', async () => {
    const { hub } = monter();
    const oisive = new Client(hub);
    const assise = new Client(hub);
    await assise.ok('room:create', { name: 'Alice' });
    horloge.now += 29_000;
    hub.sweep();
    expect(oisive.closed).toBeNull();
    horloge.now += 1_000;
    hub.sweep();
    expect(oisive.closed?.code).toBe(CLOSE_POLICY);
    expect(assise.closed).toBeNull();
  });

  it('un ping d’une socket oisive depuis 30 s la ferme aussi', async () => {
    const { hub } = monter();
    const oisive = new Client(hub);
    horloge.now += 30_000;
    await oisive.session.receive(JSON.stringify({ t: 'ping', id: 1 }));
    expect(oisive.closed?.code).toBe(CLOSE_POLICY);
  });

  it('borne les sockets par adresse', async () => {
    const { hub } = monter({ quotas: { quotas: { socketsPerIp: 2 } } });
    const a = new Client(hub, { ip: '192.0.2.1' });
    const b = new Client(hub, { ip: '192.0.2.1' });
    const c = new Client(hub, { ip: '192.0.2.1' });
    expect(a.closed).toBeNull();
    expect(b.closed).toBeNull();
    expect(c.closed?.code).toBe(CLOSE_POLICY);
    await a.session.close();
    expect(new Client(hub, { ip: '192.0.2.1' }).closed).toBeNull();
  });
});
