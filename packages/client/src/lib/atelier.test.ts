import { bus, contexte, deverrouiller } from '@tombp/arcade';
import { ContexteAudioFactice } from '@tombp/arcade/test/setup';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { atelier } from './atelier.js';

/* La doublure de la collection ne connaît ni les tampons ni le waveshaper :
   on les lui prête ici, sans rien changer à ce qu'elle compte. */
beforeAll(() => {
  const proto = ContexteAudioFactice.prototype as unknown as Record<string, unknown>;
  proto.sampleRate = 8000;
  proto.createBuffer = (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) });
  proto.createWaveShaper = function (this: { createGain: () => unknown }) {
    return { ...(this.createGain() as object), curve: null };
  };
});

const voix = ['glas', 'tic', 'vote', 'aube', 'detonation', 'croassement'] as const;

describe('atelier', () => {
  it("ne joue rien et ne jette pas tant que le bus n'existe pas", () => {
    expect(bus()).toBeNull();
    expect(() => {
      atelier.hurlement();
      atelier.hurlement('shiganshina');
      atelier.hurlement('giletsjaunes');
      atelier.hurlement('farwest');
      atelier.hurlement('pirates');
      atelier.hurlement('openspace');
      for (const nom of voix) atelier[nom]();
    }).not.toThrow();
    expect(ContexteAudioFactice.noeudsCrees).toBe(0);
  });

  it('crée des nœuds pour chaque voix une fois le bus ouvert', () => {
    deverrouiller();
    expect(contexte()).not.toBeNull();
    const appels: (() => void)[] = [
      () => atelier.hurlement(),
      () => atelier.hurlement('shiganshina'),
      () => atelier.hurlement('giletsjaunes'),
      () => atelier.hurlement('farwest'),
      () => atelier.hurlement('pirates'),
      () => atelier.hurlement('openspace'),
      ...voix.map((nom) => () => atelier[nom]()),
    ];
    for (const appel of appels) {
      const avant = ContexteAudioFactice.noeudsCrees;
      appel();
      expect(ContexteAudioFactice.noeudsCrees).toBeGreaterThan(avant);
    }
  });

  it('arrête ses sources et détache ses nœuds à la fin', () => {
    interface Osc {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      onended?: () => void;
    }
    const sources: Osc[] = [];
    const ctx = contexte() as unknown as { createOscillator: () => unknown };
    const original = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = () => {
      const osc = original() as Osc;
      osc.start = vi.fn();
      osc.stop = vi.fn();
      osc.disconnect = vi.fn();
      sources.push(osc);
      return osc;
    };
    atelier.glas();
    ctx.createOscillator = original;
    // Deux coups de cloche, quatre partiels chacun.
    expect(sources.length).toBe(8);
    for (const osc of sources) {
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
      osc.onended?.();
      expect(osc.disconnect).toHaveBeenCalled();
    }
  });
});
