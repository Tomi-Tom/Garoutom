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
 * Et, depuis D22, le lien surveillé : battement seulement si le serveur
 * l'annonce, chien de garde qui abandonne une socket muette sans attendre son
 * `onclose`, ouverture qui traîne, réveil, reconnexion qui ne renonce jamais,
 * codes de fermeture, horloge du serveur.
 *
 * La fabrique de socket est injectée : ces tests n'ouvrent aucune connexion,
 * et tournent en faux temps.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLOSE_GONE,
  CLOSE_REPLACED,
  CLOSE_SERVER_RESTART,
  CLOSE_VERSION,
  HEARTBEAT_MS,
  MAX_SERVER_FRAME_BYTES,
  OPEN_TIMEOUT_MS,
  PONG_TIMEOUT_MS,
  PROTOCOL_VERSION,
} from './index.js';
import { decodeClientFrame, encodeFrame } from './transport.js';

import {
  ACK_TIMEOUT_MS,
  Channel,
  ChannelError,
  reconnectDelay,
  RECONNECT_HIDDEN_MAX_MS,
  RECONNECT_MAX_MS,
  withProtocolVersion,
  type ChannelOptions,
  type SocketLike,
} from './channel.js';

/** Un WebSocket de laboratoire, piloté à la main. */
class FakeSocket implements SocketLike {
  static last: FakeSocket | null = null;
  static opened = 0;

  onopen: (() => void) | null = null;
  onclose: ((event?: { code?: number }) => void) | null = null;
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

  /** La connexion tombe, avec un code de fermeture si on en donne un. */
  drop(code?: number): void {
    this.closed = true;
    this.onclose?.(code === undefined ? undefined : { code });
  }

  /** Les numéros des `ping` émis, dans l'ordre. */
  pings(): number[] {
    const ids: number[] = [];
    for (const raw of this.sent) {
      const frame = decodeClientFrame(raw);
      if (frame?.t === 'ping') ids.push(frame.id);
    }
    return ids;
  }

  /** Le serveur se présente (D22). */
  hello(capabilities: string[] = ['ping', 'replay', 'pause', 'abandon'], heartbeatMs = HEARTBEAT_MS): void {
    this.receive({ t: 'hello', protocol: PROTOCOL_VERSION, capabilities, heartbeatMs });
  }

  /** La dernière demande émise, décodée. */
  lastRequest(): { id: number; e: string; d: unknown } {
    const raw = this.sent.at(-1);
    const frame = decodeClientFrame(raw);
    if (frame?.t !== 'req') throw new Error('aucune demande lisible');
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

/* ------------------------------------------------------------------ */
/* D22 — le lien surveillé                                             */
/* ------------------------------------------------------------------ */

/**
 * Un canal neuf, réglé à la main : visibilité, aléa, journal. Le canal du
 * `beforeEach` est fermé d'abord, pour qu'une seule socket vive à la fois.
 */
interface Banc {
  canal: Channel;
  visible: { valeur: boolean };
  journal: string[];
  vus: string[];
}

function banc(options: Partial<ChannelOptions> = {}): Banc {
  channel.close();
  FakeSocket.last = null;
  FakeSocket.opened = 0;
  const visible = { valeur: true };
  const journal: string[] = [];
  const canal = new Channel(() => new FakeSocket(), {
    visible: () => visible.valeur,
    random: () => 0.5,
    log: (message) => journal.push(message),
    ...options,
  });
  channel = canal;
  const vus: string[] = [];
  for (const nom of ['connect', 'disconnect', 'replaced', 'version', 'gone'] as const) {
    canal.on(nom, () => vus.push(nom));
  }
  return { canal, visible, journal, vus };
}

/** Le canal ouvert, et le serveur qui s'est présenté. */
function ouvert(capabilities?: string[], heartbeatMs?: number): FakeSocket {
  const socket = connect();
  socket.hello(capabilities, heartbeatMs);
  return socket;
}

function derniere(): FakeSocket {
  const socket = FakeSocket.last;
  if (!socket) throw new Error('aucune socket');
  return socket;
}

describe('l’adresse versionnée', () => {
  it('ajoute la version du protocole à l’adresse du canal', () => {
    expect(withProtocolVersion('wss://garoutom.example/ws')).toBe(
      `wss://garoutom.example/ws?v=${String(PROTOCOL_VERSION)}`,
    );
    expect(withProtocolVersion('ws://localhost:3004/ws?x=1')).toBe(
      `ws://localhost:3004/ws?x=1&v=${String(PROTOCOL_VERSION)}`,
    );
  });

  it('remplace une version déjà présente et garde l’ancre', () => {
    expect(withProtocolVersion('wss://a/ws?v=1&x=2#h', 2)).toBe('wss://a/ws?v=2&x=2#h');
    expect(withProtocolVersion('wss://a/ws?x=2&v=9', 2)).toBe('wss://a/ws?x=2&v=2');
  });
});

describe('l’attente entre deux tentatives', () => {
  it('part presque tout de suite la première fois', () => {
    expect(reconnectDelay(0, false, () => 0)).toBe(0);
    expect(reconnectDelay(0, false, () => 0.9999)).toBeLessThan(300);
    expect(reconnectDelay(0, true, () => 0.9999)).toBeLessThan(300);
  });

  it('tire un aléa plein sous un plafond qui double, borné à 5 s', () => {
    expect(reconnectDelay(1, false, () => 0.9999)).toBeLessThan(1_000);
    expect(reconnectDelay(2, false, () => 0.9999)).toBeLessThan(2_000);
    expect(reconnectDelay(3, false, () => 0.9999)).toBeLessThan(4_000);
    expect(reconnectDelay(4, false, () => 0.9999)).toBeLessThan(RECONNECT_MAX_MS);
    expect(reconnectDelay(40, false, () => 0.9999)).toBeLessThan(RECONNECT_MAX_MS);
    expect(reconnectDelay(40, false, () => 0.9999)).toBeGreaterThan(RECONNECT_MAX_MS - 10);
    expect(reconnectDelay(5, false, () => 0)).toBe(0);
  });

  it('se borne à 15 s quand l’onglet est caché', () => {
    expect(reconnectDelay(40, true, () => 0.9999)).toBeLessThan(RECONNECT_HIDDEN_MAX_MS);
    expect(reconnectDelay(40, true, () => 0.9999)).toBeGreaterThan(RECONNECT_MAX_MS);
  });
});

describe('le battement', () => {
  it('ne pingue pas un serveur qui n’annonce pas la capacité', () => {
    banc();
    const socket = ouvert(['replay']);
    vi.advanceTimersByTime(HEARTBEAT_MS * 5);
    expect(socket.pings()).toEqual([]);
  });

  it('ne pingue pas sans `hello` (serveur d’avant D22), même au réveil', () => {
    const { canal } = banc();
    const socket = connect();
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    canal.wake();
    expect(socket.pings()).toEqual([]);
    expect(canal.connected).toBe(true);
  });

  it('pingue au rythme annoncé tant que l’onglet est visible, se tait caché', () => {
    const { visible } = banc();
    const socket = ouvert();
    vi.advanceTimersByTime(HEARTBEAT_MS - 1);
    expect(socket.pings()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(socket.pings()).toHaveLength(1);
    socket.receive({ t: 'pong', id: socket.pings()[0], now: Date.now() });

    visible.valeur = false;
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    expect(socket.pings()).toHaveLength(1);

    visible.valeur = true;
    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(socket.pings()).toHaveLength(2);
  });

  it('suit le rythme donné par le serveur', () => {
    banc();
    const socket = ouvert(['ping'], 5_000);
    vi.advanceTimersByTime(5_000);
    expect(socket.pings()).toHaveLength(1);
  });

  it('garde un lien qui répond', () => {
    const { vus } = banc();
    const socket = ouvert();
    for (let tour = 0; tour < 5; tour += 1) {
      vi.advanceTimersByTime(HEARTBEAT_MS);
      const id = socket.pings().at(-1);
      vi.advanceTimersByTime(200);
      socket.receive({ t: 'pong', id, now: Date.now() });
    }
    expect(socket.pings()).toHaveLength(5);
    expect(FakeSocket.opened).toBe(1);
    expect(vus).toEqual(['connect']);
  });

  it('se contente de n’importe quel message pour croire le lien vivant', () => {
    banc();
    const socket = ouvert();
    vi.advanceTimersByTime(HEARTBEAT_MS);
    vi.advanceTimersByTime(PONG_TIMEOUT_MS - 1);
    socket.receive({ t: 'ev', e: 'notice', d: { message: 'coucou', tone: 'info' } });
    vi.advanceTimersByTime(PONG_TIMEOUT_MS);
    expect(socket.closed).toBe(false);
    expect(FakeSocket.opened).toBe(1);
  });
});

describe('le chien de garde', () => {
  it('abandonne une socket muette sans attendre sa fermeture, et en rouvre une', async () => {
    const { canal, vus } = banc();
    const socket = ouvert();

    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(socket.pings()).toHaveLength(1);
    vi.advanceTimersByTime(PONG_TIMEOUT_MS - 1);
    expect(socket.closed).toBe(false);
    // Une demande partie juste avant que le lien soit jugé mort.
    const enVol = canal.request('room:start', {});
    const rejet = expect(enVol).rejects.toThrow(/connexion/i);
    vi.advanceTimersByTime(1);

    // La socket muette est fermée et débranchée ; personne n'a attendu `onclose`.
    expect(socket.closed).toBe(true);
    expect(socket.onclose).toBeNull();
    expect(socket.onmessage).toBeNull();
    expect(canal.connected).toBe(false);
    expect(vus).toEqual(['connect', 'disconnect']);
    await rejet;

    // Le lien avait tenu : la nouvelle tentative part presque aussitôt.
    vi.advanceTimersByTime(300);
    expect(FakeSocket.opened).toBe(2);
    connect();
    expect(vus).toEqual(['connect', 'disconnect', 'connect']);
  });

  it('ignore ce que l’ancienne socket dit encore après l’abandon', () => {
    const { canal, vus } = banc();
    const ancienne = ouvert();
    const syncs: unknown[] = [];
    canal.on('sync', (payload) => syncs.push(payload));
    const onmessage = ancienne.onmessage;
    const onclose = ancienne.onclose;

    vi.advanceTimersByTime(HEARTBEAT_MS + PONG_TIMEOUT_MS);
    vi.advanceTimersByTime(300);
    const neuve = connect();

    // Des gestionnaires gardés par un tiers ne doivent plus rien toucher.
    onmessage?.({ data: encodeFrame({ t: 'ev', e: 'sync', d: 'fantôme' }) });
    onclose?.({ code: CLOSE_REPLACED });
    expect(syncs).toEqual([]);
    expect(canal.connected).toBe(true);
    expect(canal.replaced).toBe(false);
    expect(FakeSocket.last).toBe(neuve);
    expect(vus).toEqual(['connect', 'disconnect', 'connect']);
  });

  it('abandonne une ouverture qui traîne, puis réessaie', () => {
    banc();
    const lente = derniere();
    vi.advanceTimersByTime(OPEN_TIMEOUT_MS - 1);
    expect(lente.closed).toBe(false);
    vi.advanceTimersByTime(1);
    expect(lente.closed).toBe(true);
    expect(lente.onopen).toBeNull();
    vi.advanceTimersByTime(RECONNECT_MAX_MS);
    expect(FakeSocket.opened).toBe(2);
  });

  it('pingue aussitôt quand un accusé tarde', async () => {
    const { canal } = banc();
    const socket = ouvert();
    const demande = canal.request('room:start', {});
    const rejet = expect(demande).rejects.toThrow(/ne répond pas/);
    await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS);
    await rejet;
    expect(socket.pings()).toHaveLength(1);
    // Et sans réponse, le chien de garde tranche.
    vi.advanceTimersByTime(PONG_TIMEOUT_MS);
    expect(socket.closed).toBe(true);
  });

  it('recycle bruyamment la socket sur un cadre trop gros', () => {
    const { journal, vus } = banc();
    const socket = ouvert();
    const enorme = encodeFrame({ t: 'ev', e: 'sync', d: 'x'.repeat(MAX_SERVER_FRAME_BYTES) });
    socket.onmessage?.({ data: enorme });
    expect(socket.closed).toBe(true);
    expect(journal.some((ligne) => ligne.includes('trop gros'))).toBe(true);
    expect(vus).toEqual(['connect', 'disconnect']);
    vi.advanceTimersByTime(RECONNECT_MAX_MS);
    expect(FakeSocket.opened).toBe(2);
  });
});

describe('le réveil', () => {
  it('pingue tout de suite après une courte absence', () => {
    const { canal } = banc();
    const socket = ouvert();
    vi.advanceTimersByTime(3_000);
    canal.wake({ hiddenMs: 5_000 });
    expect(socket.pings()).toHaveLength(1);
    expect(FakeSocket.opened).toBe(1);
  });

  it('rouvre directement après plus de 20 s caché', () => {
    const { canal, vus } = banc();
    const socket = ouvert();
    canal.wake({ hiddenMs: 21_000 });
    expect(socket.closed).toBe(true);
    // Aucune attente : la nouvelle socket est déjà là.
    expect(FakeSocket.opened).toBe(2);
    expect(vus).toEqual(['connect', 'disconnect']);
  });

  it('rouvre directement après plus de 25 s de silence d’un serveur qui pingue', () => {
    const { canal, visible } = banc();
    const socket = ouvert();
    visible.valeur = false;
    vi.advanceTimersByTime(26_000);
    visible.valeur = true;
    canal.wake();
    expect(socket.closed).toBe(true);
    expect(FakeSocket.opened).toBe(2);
  });

  it('n’attend pas la fin d’un délai de reconnexion', () => {
    const { canal } = banc({ random: () => 0.9999 });
    connect();
    derniere().drop();
    expect(FakeSocket.opened).toBe(1);
    canal.wake();
    expect(FakeSocket.opened).toBe(2);
  });

  it('laisse une ouverture en cours suivre son cours', () => {
    const { canal } = banc();
    canal.wake({ hiddenMs: 60_000 });
    expect(FakeSocket.opened).toBe(1);
  });
});

/** Fait tourner l'horloge ; chaque tentative est refusée aussitôt par le serveur. */
function refuserToutPendant(dureeMs: number): number[] {
  const ouvertures: number[] = [];
  let avant = FakeSocket.opened;
  for (let ms = 0; ms < dureeMs; ms += 100) {
    vi.advanceTimersByTime(100);
    if (FakeSocket.opened !== avant) {
      avant = FakeSocket.opened;
      ouvertures.push(ms);
      derniere().drop();
    }
  }
  return ouvertures;
}

describe('la reconnexion', () => {
  it('ne renonce jamais, et ne martèle pas', () => {
    banc({ random: () => 0.9999 });
    connect();
    derniere().drop();
    const ouvertures = refuserToutPendant(10 * 60_000);
    // Une tentative toutes les 5 s au plus près, et on essaie toujours au bout de 10 min.
    expect(ouvertures.length).toBeGreaterThan(100);
    expect(ouvertures.length).toBeLessThan((10 * 60_000) / 4_000);
    expect(ouvertures.at(-1)).toBeGreaterThan(9 * 60_000);
  });

  it('espace davantage onglet caché', () => {
    const { visible } = banc({ random: () => 0.9999 });
    visible.valeur = false;
    connect();
    derniere().drop();
    const ouvertures = refuserToutPendant(5 * 60_000);
    expect(ouvertures.length).toBeLessThan((5 * 60_000) / 12_000);
    expect(ouvertures.length).toBeGreaterThan(5);
  });

  it('repart d’une tentative immédiate après une connexion qui a tenu', () => {
    banc({ random: () => 0.9999 });
    // Des échecs de suite font monter l'attente…
    for (let i = 0; i < 3; i += 1) {
      derniere().drop();
      vi.advanceTimersByTime(RECONNECT_MAX_MS);
    }
    // … puis une connexion tient, et tombe : on repart presque aussitôt.
    connect();
    vi.advanceTimersByTime(60_000);
    const avant = FakeSocket.opened;
    derniere().drop();
    vi.advanceTimersByTime(300);
    expect(FakeSocket.opened).toBe(avant + 1);
  });

  it('se reconnecte vite au redémarrage annoncé du serveur', () => {
    const { vus } = banc({ random: () => 0.9999 });
    ouvert();
    derniere().drop(CLOSE_SERVER_RESTART);
    expect(vus).toEqual(['connect', 'disconnect']);
    vi.advanceTimersByTime(300);
    expect(FakeSocket.opened).toBe(2);
  });
});

describe('les codes de fermeture', () => {
  it('« partie ouverte ailleurs » : ne reprend pas tout seul', () => {
    const { canal, vus } = banc();
    ouvert();
    derniere().drop(CLOSE_REPLACED);
    expect(vus).toEqual(['connect', 'disconnect', 'replaced']);
    expect(canal.replaced).toBe(true);

    vi.advanceTimersByTime(10 * 60_000);
    canal.wake({ hiddenMs: 60_000 });
    expect(FakeSocket.opened).toBe(1);

    // « Reprendre ici » : c'est l'application qui le demande.
    canal.connect();
    expect(FakeSocket.opened).toBe(2);
    expect(canal.replaced).toBe(false);
    connect();
    expect(canal.connected).toBe(true);
  });

  it('version refusée : demande un rechargement, réessaie sans presse', () => {
    const { vus } = banc({ random: () => 0.9999 });
    ouvert();
    derniere().drop(CLOSE_VERSION);
    expect(vus).toEqual(['connect', 'disconnect', 'version']);
    vi.advanceTimersByTime(1_000);
    expect(FakeSocket.opened).toBe(1);
    vi.advanceTimersByTime(RECONNECT_MAX_MS);
    expect(FakeSocket.opened).toBe(2);
  });

  it('table disparue : le dit, et se reconnecte quand même', () => {
    const { vus } = banc();
    ouvert();
    derniere().drop(CLOSE_GONE);
    expect(vus).toEqual(['connect', 'disconnect', 'gone']);
    vi.advanceTimersByTime(300);
    expect(FakeSocket.opened).toBe(2);
  });
});

describe('l’horloge du serveur', () => {
  it('estime le décalage sur l’aller-retour le plus court', () => {
    const { canal } = banc();
    const decalages: number[] = [];
    canal.on('clock', (offset) => decalages.push(offset));
    const socket = ouvert();
    expect(canal.clockOffset).toBeNull();

    // Aller-retour de 400 ms ; le serveur avance de 10 s.
    canal.wake();
    const premier = socket.pings().at(-1);
    const envoi = Date.now();
    vi.advanceTimersByTime(400);
    socket.receive({ t: 'pong', id: premier, now: envoi + 10_000 + 200 });
    expect(canal.clockOffset).toBe(10_000);

    // Un aller-retour plus lent, et plus trompeur, ne remplace pas le meilleur.
    vi.advanceTimersByTime(5_000);
    canal.wake();
    const lent = socket.pings().at(-1);
    const envoiLent = Date.now();
    vi.advanceTimersByTime(3_000);
    socket.receive({ t: 'pong', id: lent, now: envoiLent + 10_000 + 2_900 });
    expect(canal.clockOffset).toBe(10_000);

    // Un plus rapide, si.
    vi.advanceTimersByTime(5_000);
    canal.wake();
    const vif = socket.pings().at(-1);
    const envoiVif = Date.now();
    vi.advanceTimersByTime(40);
    socket.receive({ t: 'pong', id: vif, now: envoiVif + 10_050 + 20 });
    expect(canal.clockOffset).toBe(10_050);
    expect(decalages).toEqual([10_000, 10_050]);
  });

  it('ignore un `pong` qui ne répond à rien', () => {
    const { canal } = banc();
    const socket = ouvert();
    socket.receive({ t: 'pong', id: 999, now: Date.now() + 50_000 });
    expect(canal.clockOffset).toBeNull();
  });
});

describe('ce que dit le serveur', () => {
  it('un refus porte son code machine', async () => {
    const { canal } = banc();
    const socket = ouvert();
    const demande = canal.request('room:join', { code: 'ABCD', name: 'A' });
    const { id } = socket.lastRequest();
    socket.receive({ t: 'ack', id, r: { ok: false, error: 'La table a disparu', code: 'gone' } });
    const erreur = await demande.catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ChannelError);
    expect((erreur as ChannelError).code).toBe('gone');
    expect((erreur as ChannelError).message).toBe('La table a disparu');
  });

  it('le `hello` arrive à qui l’écoute, capacités connues seulement', () => {
    const { canal } = banc();
    const recus: unknown[] = [];
    canal.on('hello', (hello) => recus.push(hello.capabilities));
    ouvert(['ping', 'inconnue']);
    expect(recus).toEqual([['ping']]);
    expect(canal.capabilities.has('ping')).toBe(true);
  });
});
