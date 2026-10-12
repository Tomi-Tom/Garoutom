/**
 * Le cadrage des messages, dans les deux sens.
 *
 * C'est la seule chose qui touche des octets venus du réseau : tout ce qui
 * entre ici est hostile jusqu'à preuve du contraire. Les tests portent donc
 * autant sur ce qui doit être refusé que sur ce qui doit passer.
 */

import { describe, expect, it } from 'vitest';

import {
  ABANDON_MS,
  CLOSE_GONE,
  CLOSE_REPLACED,
  CLOSE_SERVER_RESTART,
  CLOSE_VERSION,
  eventSeqOf,
  LOBBY_GRACE_MS,
  negotiateProtocol,
  PROTOCOL_MIN,
  PROTOCOL_VERSION,
  RECONNECT_GRACE_MS,
} from './protocol.js';
import {
  decodeClientFrame,
  decodeServerFrame,
  encodeFrame,
  inspectServerFrame,
  MAX_FRAME_BYTES,
  MAX_SERVER_FRAME_BYTES,
} from './transport.js';

describe('D22 — le lien se surveille', () => {
  it('D22 — hello, ping et pong font l’aller-retour', () => {
    const hello = { t: 'hello', protocol: 2, capabilities: ['ping', 'replay'], heartbeatMs: 20_000 } as const;
    expect(decodeServerFrame(encodeFrame({ ...hello, capabilities: [...hello.capabilities] }))).toEqual(hello);
    expect(decodeClientFrame(encodeFrame({ t: 'ping', id: 3 }))).toEqual({ t: 'ping', id: 3 });
    expect(decodeServerFrame(encodeFrame({ t: 'pong', id: 3, now: 1_760_000_000_000 }))).toEqual({
      t: 'pong',
      id: 3,
      now: 1_760_000_000_000,
    });
  });

  it('D22 — un ping ou un pong mal formé est refusé', () => {
    for (const id of ['1', -1, 1.5, null]) {
      expect(decodeClientFrame(JSON.stringify({ t: 'ping', id }))).toBeNull();
      expect(decodeServerFrame(JSON.stringify({ t: 'pong', id, now: 1 }))).toBeNull();
    }
    expect(decodeServerFrame(JSON.stringify({ t: 'pong', id: 1, now: 'midi' }))).toBeNull();
    expect(decodeServerFrame(JSON.stringify({ t: 'hello', protocol: '2', capabilities: [], heartbeatMs: 1 }))).toBeNull();
    // le serveur n'accepte pas un pong, ni le client un ping
    expect(decodeClientFrame(encodeFrame({ t: 'pong', id: 1, now: 1 }))).toBeNull();
    expect(decodeServerFrame(encodeFrame({ t: 'ping', id: 1 }))).toBeNull();
  });

  it('D22 — une capacité inconnue s’ignore, le hello passe', () => {
    const lu = decodeServerFrame(
      JSON.stringify({ t: 'hello', protocol: 3, capabilities: ['ping', 'teleportation', 7], heartbeatMs: 15_000 }),
    );
    expect(lu).toEqual({ t: 'hello', protocol: 3, capabilities: ['ping'], heartbeatMs: 15_000 });
  });

  it('D22 — le client tolère un cadre d’une version future, et dit qu’un cadre est trop gros', () => {
    expect(inspectServerFrame('{"t":"aurore","x":1}')).toEqual({ kind: 'unknown' });
    expect(inspectServerFrame('{"t":"ev","e":"bientot","d":null}')).toEqual({ kind: 'unknown' });
    expect(inspectServerFrame('pas du json')).toEqual({ kind: 'malformed' });
    expect(inspectServerFrame('{"t":42}')).toEqual({ kind: 'malformed' });
    const enorme = JSON.stringify({ t: 'ev', e: 'sync', d: 'a'.repeat(MAX_SERVER_FRAME_BYTES) });
    // trop gros : pas un silence, une raison de se reconnecter (D23)
    expect(inspectServerFrame(enorme)).toEqual({ kind: 'too-big' });
    expect(inspectServerFrame(encodeFrame({ t: 'ev', e: 'sync', d: null }))).toEqual({
      kind: 'frame',
      frame: { t: 'ev', e: 'sync', d: null },
    });
  });

  it('D22 — la version : 2 parlée, 1 encore servie, le reste refusé', () => {
    expect(PROTOCOL_VERSION).toBe(2);
    expect(PROTOCOL_MIN).toBe(1);
    expect(negotiateProtocol('2')).toBe(2);
    expect(negotiateProtocol('1')).toBe(1);
    // sans `?v=`, c'est un client d'avant D22
    expect(negotiateProtocol(null)).toBe(1);
    expect(negotiateProtocol(undefined)).toBe(1);
    expect(negotiateProtocol('')).toBe(1);
    for (const mauvais of ['0', '3', '99', '2.0', ' 2', '-1', 'deux', '1e1']) {
      expect(negotiateProtocol(mauvais)).toBeNull();
    }
  });

  it('D22 — les codes de fermeture et les délais de présence', () => {
    expect([CLOSE_SERVER_RESTART, CLOSE_VERSION, CLOSE_REPLACED, CLOSE_GONE]).toEqual([1012, 4000, 4001, 4002]);
    expect(RECONNECT_GRACE_MS).toBe(60_000);
    expect(LOBBY_GRACE_MS).toBe(30_000);
    expect(ABANDON_MS).toBe(300_000);
  });

  it('D22 — les évènements d’un sync se numérotent depuis `seq`', () => {
    const payload = { seq: 12, events: [{ type: 'debut' }, { type: 'aube-paisible' }, { type: 'debut' }] as const };
    expect([0, 1, 2].map((i) => eventSeqOf({ seq: payload.seq, events: [...payload.events] }, i))).toEqual([10, 11, 12]);
  });
});

describe('aller-retour', () => {
  it('conserve une demande', () => {
    const frame = {
      t: 'req',
      id: 7,
      e: 'game:action',
      d: { action: { type: 'voter', target: 3 } },
    } as const;
    expect(decodeClientFrame(encodeFrame(frame))).toEqual(frame);
  });

  it('conserve un accusé favorable', () => {
    const frame = {
      t: 'ack',
      id: 7,
      r: { ok: true, data: { code: 'ABCD', playerId: 'p1', token: 'secret' } },
    } as const;
    expect(decodeServerFrame(encodeFrame(frame))).toEqual(frame);
  });

  it('conserve un accusé de refus', () => {
    const frame = {
      t: 'ack',
      id: 8,
      r: { ok: false, error: 'La table est complète', code: 'full' },
    } as const;
    expect(decodeServerFrame(encodeFrame(frame))).toEqual(frame);
  });

  it('conserve un état poussé par le serveur', () => {
    const frame = { t: 'ev', e: 'sync', d: { room: { code: 'ABCD' } } } as const;
    expect(decodeServerFrame(encodeFrame(frame))).toEqual(frame);
  });

  it('conserve un avis poussé par le serveur', () => {
    const frame = { t: 'ev', e: 'notice', d: { message: 'Le village s’endort', tone: 'info' } } as const;
    expect(decodeServerFrame(encodeFrame(frame))).toEqual(frame);
  });
});

describe('ce qui doit être refusé', () => {
  it('refuse ce qui n’est pas du JSON', () => {
    expect(decodeClientFrame('{')).toBeNull();
    expect(decodeServerFrame('pas du json')).toBeNull();
  });

  it('refuse ce qui n’est pas une chaîne', () => {
    expect(decodeClientFrame(42)).toBeNull();
    expect(decodeClientFrame(null)).toBeNull();
    expect(decodeClientFrame({ t: 'req', id: 1, e: 'x', d: null })).toBeNull();
  });

  it('refuse une demande trop grosse, sans même l’analyser', () => {
    const huge = JSON.stringify({ t: 'req', id: 1, e: 'x', d: 'a'.repeat(MAX_FRAME_BYTES) });
    expect(decodeClientFrame(huge)).toBeNull();
  });

  it('refuse un état trop gros côté serveur, mais laisse passer le fil de discussion', () => {
    // Dix-huit joueurs bavards : la borne côté serveur doit être bien plus
    // haute que celle des demandes, sans quoi le village se tairait.
    expect(MAX_SERVER_FRAME_BYTES).toBeGreaterThan(MAX_FRAME_BYTES);
    const bavard = JSON.stringify({
      t: 'ev',
      e: 'sync',
      d: 'a'.repeat(MAX_SERVER_FRAME_BYTES),
    });
    expect(decodeServerFrame(bavard)).toBeNull();
    const normal = JSON.stringify({
      t: 'ev',
      e: 'sync',
      d: 'a'.repeat(MAX_FRAME_BYTES),
    });
    expect(decodeServerFrame(normal)).not.toBeNull();
  });

  it('refuse une demande sans numéro utilisable', () => {
    expect(decodeClientFrame('{"t":"req","e":"x","d":null}')).toBeNull();
    expect(decodeClientFrame('{"t":"req","id":"7","e":"x","d":null}')).toBeNull();
    expect(decodeClientFrame('{"t":"req","id":1.5,"e":"x","d":null}')).toBeNull();
  });

  it('refuse une demande sans nom d’évènement', () => {
    expect(decodeClientFrame('{"t":"req","id":1,"d":null}')).toBeNull();
    expect(decodeClientFrame('{"t":"req","id":1,"e":"","d":null}')).toBeNull();
  });

  it('refuse un type de cadre inconnu', () => {
    expect(decodeClientFrame('{"t":"coucou","id":1,"e":"x","d":null}')).toBeNull();
    expect(decodeServerFrame('{"t":"coucou"}')).toBeNull();
  });

  it('refuse un évènement serveur hors du contrat', () => {
    expect(decodeServerFrame('{"t":"ev","e":"autre","d":null}')).toBeNull();
  });

  it('refuse un accusé mal formé', () => {
    expect(decodeServerFrame('{"t":"ack","id":1}')).toBeNull();
    expect(decodeServerFrame('{"t":"ack","id":1,"r":{"ok":"oui"}}')).toBeNull();
    expect(decodeServerFrame('{"t":"ack","id":1,"r":{"ok":false}}')).toBeNull();
  });

  it('ne confond pas les deux sens', () => {
    const request = encodeFrame({ t: 'req', id: 1, e: 'room:start', d: null });
    expect(decodeServerFrame(request)).toBeNull();
    const event = encodeFrame({ t: 'ev', e: 'sync', d: null });
    expect(decodeClientFrame(event)).toBeNull();
  });
});
