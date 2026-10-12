/**
 * L'écran allumé : le verrou est demandé à table, redemandé au retour au
 * premier plan, rendu hors table — et rien ne casse sans lui.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEcranAllume } from './ecranAllume.js';

interface FausseSentinelle {
  released: boolean;
  release: ReturnType<typeof vi.fn>;
}

let visibilite: DocumentVisibilityState = 'visible';

function installerVerrou() {
  const sentinelles: FausseSentinelle[] = [];
  const request = vi.fn(() => {
    const sentinelle: FausseSentinelle = {
      released: false,
      release: vi.fn(() => {
        sentinelle.released = true;
        return Promise.resolve();
      }),
    };
    sentinelles.push(sentinelle);
    return Promise.resolve(sentinelle);
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilite);
  return { request, sentinelles };
}

/** Laisse les promesses du verrou se résoudre. */
const laisserFiler = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  vi.restoreAllMocks();
  visibilite = 'visible';
});

describe('useEcranAllume', () => {
  it('garde l’écran allumé à table, et le rend en la quittant', async () => {
    const { request, sentinelles } = installerVerrou();
    const { rerender, unmount } = renderHook(({ actif }) => useEcranAllume(actif), {
      initialProps: { actif: false },
    });
    expect(request).not.toHaveBeenCalled();

    rerender({ actif: true });
    await laisserFiler();
    expect(request).toHaveBeenCalledWith('screen');

    rerender({ actif: false });
    expect(sentinelles[0]?.release).toHaveBeenCalled();
    unmount();
  });

  it('le redemande à chaque retour au premier plan', async () => {
    const { request, sentinelles } = installerVerrou();
    renderHook(() => useEcranAllume(true));
    await laisserFiler();
    expect(request).toHaveBeenCalledTimes(1);

    // L'onglet passe derrière : le navigateur relâche le verrou de lui-même.
    visibilite = 'hidden';
    if (sentinelles[0]) sentinelles[0].released = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);

    visibilite = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await laisserFiler();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('se tait sans verrou, ou quand le navigateur le refuse', async () => {
    const sans = renderHook(() => useEcranAllume(true));
    sans.unmount();

    const refus = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    Object.defineProperty(navigator, 'wakeLock', { value: { request: refus }, configurable: true });
    const { unmount } = renderHook(() => useEcranAllume(true));
    await laisserFiler();
    expect(refus).toHaveBeenCalled();
    unmount();
  });
});
