/**
 * Le cadrage des messages, dans les deux sens.
 *
 * C'est la seule chose qui touche des octets venus du réseau : tout ce qui
 * entre ici est hostile jusqu'à preuve du contraire. Les tests portent donc
 * autant sur ce qui doit être refusé que sur ce qui doit passer.
 */

import { describe, expect, it } from 'vitest';

import {
  decodeClientFrame,
  decodeServerFrame,
  encodeFrame,
  MAX_FRAME_BYTES,
  MAX_SERVER_FRAME_BYTES,
} from './transport.js';

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
