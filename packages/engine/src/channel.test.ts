/**
 * Le canal côté client : corréler les accusés, survivre aux coupures.
 *
 * C'est la pièce que Socket.IO fournissait et qu'il faut désormais tenir
 * soi-même. Deux comportements comptent plus que tous les autres :
 *
 * - **une demande obtient sa réponse, et pas celle du voisin** — deux clics
 *   rapprochés ne doivent jamais voir leurs accusés échangés ;
 * - **une coupure ne laisse aucun bouton bloqué** — toute demande en vol est
 *   rejetée, sinon l'écran attend une réponse qui ne viendra jamais.
 *
 * La fabrique de socket est injectée : ces tests n'ouvrent aucune connexion.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decodeClientFrame, encodeFrame } from './transport.js';

import { Channel, type SocketLike } from './channel.js';

/** Un WebSocket de laboratoire, piloté à la main. */
class FakeSocket implements SocketLike {
  static last: FakeSocket | null = null;
  static opened = 0;

  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;

  readonly sent: string[] = [];
  closed = false;

  constructor() {
    FakeSocket.last = this;
    FakeSocket.opened += 1;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Le serveur accepte la connexion. */
  open(): void {
    this.onopen?.();
  }

  /** Le serveur envoie un message. */
  receive(frame: unknown): void {
    this.onmessage?.({ data: encodeFrame(frame as never) });
  }

  /** La connexion tombe. */
  drop(): void {
    this.closed = true;
    this.onclose?.();
  }

  /** La dernière demande émise, décodée. */
  lastRequest(): { id: number; e: string; d: unknown } {
    const raw = this.sent.at(-1);
    const frame = decodeClientFrame(raw);
    if (!frame) throw new Error('aucune demande lisible');
    return frame;
  }
}

let channel: Channel;

function connect(): FakeSocket {
  const socket = FakeSocket.last;
  if (!socket) throw new Error('aucune socket ouverte');
  socket.open();
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.last = null;
  FakeSocket.opened = 0;
  channel = new Channel(() => new FakeSocket());
});

afterEach(() => {
  channel.close();
  vi.useRealTimers();
});

describe('la connexion', () => {
  it('s’annonce ouverte et prévient qui écoute', () => {
    const seen: string[] = [];
    channel.on('connect', () => seen.push('connect'));
    expect(channel.connected).toBe(false);

    connect();

    expect(channel.connected).toBe(true);
    expect(seen).toEqual(['connect']);
  });

  it('se rouvre toute seule après une coupure', () => {
    connect();
    expect(FakeSocket.opened).toBe(1);

    FakeSocket.last?.drop();
    expect(channel.connected).toBe(false);

    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.opened).toBeGreaterThan(1);
  });

  it('espace ses tentatives au lieu de marteler le serveur', () => {
    connect();
    FakeSocket.last?.drop();

    vi.advanceTimersByTime(1);
    const immédiat = FakeSocket.opened;
    vi.advanceTimersByTime(30_000);
    const après = FakeSocket.opened;

    // Quelques tentatives en trente secondes, pas des centaines.
    expect(après - immédiat).toBeLessThan(12);
    expect(après).toBeGreaterThan(immédiat);
  });

  it('ne prévient plus un auditeur retiré', () => {
    const seen: string[] = [];
    const handler = (): void => void seen.push('connect');
    channel.on('connect', handler);
    channel.off('connect', handler);
    connect();
    expect(seen).toEqual([]);
  });
});

describe('les demandes', () => {
  it('numérote chaque demande', () => {
    const socket = connect();
    // Ces demandes n'auront jamais de réponse : la fermeture les rejettera, et
    // un rejet que personne n'attend reste un rejet — on le déclare ici.
    const ignore = (): undefined => undefined;
    void channel.request('room:start', null).catch(ignore);
    const first = socket.lastRequest().id;
    void channel.request('room:leave', null).catch(ignore);
    expect(socket.lastRequest().id).not.toBe(first);
  });

  it('rend la donnée quand le serveur accepte', async () => {
    const socket = connect();
    const promise = channel.request<{ code: string }>('room:create', { name: 'Alice' });
    const { id } = socket.lastRequest();

    socket.receive({ t: 'ack', id, r: { ok: true, data: { code: 'ABCD' } } });

    await expect(promise).resolves.toEqual({ code: 'ABCD' });
  });

  it('rejette avec le message du serveur quand il refuse', async () => {
    const socket = connect();
    const promise = channel.request('game:action', { action: { type: 'voter', target: 2 } });
    const { id } = socket.lastRequest();

    socket.receive({ t: 'ack', id, r: { ok: false, error: 'Ce n’est pas le moment de voter', code: 'wrong-phase' } });

    await expect(promise).rejects.toThrow('Ce n’est pas le moment de voter');
  });

  it('ne confond jamais deux réponses', async () => {
    const socket = connect();
    const first = channel.request<string>('room:start', null);
    const idOne = socket.lastRequest().id;
    const second = channel.request<string>('room:leave', null);
    const idTwo = socket.lastRequest().id;

    // Le serveur répond dans le désordre, ce qu'il a parfaitement le droit de faire.
    socket.receive({ t: 'ack', id: idTwo, r: { ok: true, data: 'deux' } });
    socket.receive({ t: 'ack', id: idOne, r: { ok: true, data: 'un' } });

    await expect(first).resolves.toBe('un');
    await expect(second).resolves.toBe('deux');
  });

  it('ignore un accusé qui ne correspond à rien', async () => {
    const socket = connect();
    const promise = channel.request<string>('room:start', null);
    const { id } = socket.lastRequest();

    socket.receive({ t: 'ack', id: id + 999, r: { ok: true, data: 'perdu' } });
    socket.receive({ t: 'ack', id, r: { ok: true, data: 'bon' } });

    await expect(promise).resolves.toBe('bon');
  });

  it('renonce quand le serveur ne répond jamais', async () => {
    connect();
    const promise = channel.request('room:start', null);
    const assertion = expect(promise).rejects.toThrow(/ne répond pas/);
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it('rejette ce qui était en vol quand la connexion tombe', async () => {
    const socket = connect();
    const promise = channel.request('room:start', null);
    const assertion = expect(promise).rejects.toThrow(/connexion/i);
    socket.drop();
    await assertion;
  });

  it('refuse d’émettre tant que rien n’est ouvert', async () => {
    await expect(channel.request('room:start', null)).rejects.toThrow(/connexion/i);
  });
});

describe('les messages poussés par le serveur', () => {
  it('transmet un état à qui l’écoute', () => {
    const socket = connect();
    const received: unknown[] = [];
    channel.on('sync', (payload) => received.push(payload));

    socket.receive({ t: 'ev', e: 'sync', d: { room: { code: 'ABCD' } } });

    expect(received).toEqual([{ room: { code: 'ABCD' } }]);
  });

  it('transmet un avis à qui l’écoute', () => {
    const socket = connect();
    const received: unknown[] = [];
    channel.on('notice', (payload) => received.push(payload));

    socket.receive({ t: 'ev', e: 'notice', d: { message: 'Le village s’endort', tone: 'info' } });

    expect(received).toEqual([{ message: 'Le village s’endort', tone: 'info' }]);
  });

  it('ignore un message illisible sans rien casser', () => {
    const socket = connect();
    const received: unknown[] = [];
    channel.on('sync', (payload) => received.push(payload));

    socket.onmessage?.({ data: 'pas du json' });
    socket.receive({ t: 'ev', e: 'sync', d: 'après' });

    expect(received).toEqual(['après']);
  });
});

describe('la coupure demandée', () => {
  it('ferme sans rouvrir toute seule', () => {
    connect();
    expect(FakeSocket.opened).toBe(1);

    channel.disconnect();
    expect(channel.connected).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.opened).toBe(1);
  });

  it('rouvre quand on le lui demande', () => {
    connect();
    channel.disconnect();

    channel.connect();
    connect();

    expect(channel.connected).toBe(true);
    expect(FakeSocket.opened).toBe(2);
  });

  it('reprend ses reconnexions après une réouverture', () => {
    connect();
    channel.disconnect();
    channel.connect();
    connect();

    FakeSocket.last?.drop();
    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.opened).toBeGreaterThan(2);
  });
});
