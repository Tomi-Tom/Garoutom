/**
 * L'adresse du canal : l'origine de la page par défaut, l'adresse du Worker
 * quand le build la fournit. Et le réveil du canal sur la vie de la page (D22).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { brancherReveil, canalUrl } from './socket.js';

describe('brancherReveil', () => {
  let debrancher: () => void = () => undefined;
  let visibilite: DocumentVisibilityState = 'visible';

  afterEach(() => {
    debrancher();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function brancher() {
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilite);
    const canal = { wake: vi.fn() };
    const reseau = vi.fn();
    debrancher = brancherReveil(canal, reseau);
    return { canal, reseau };
  }

  function basculer(etat: DocumentVisibilityState): void {
    visibilite = etat;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('réveille le canal au retour au premier plan, en disant combien de temps il est resté caché', () => {
    vi.useFakeTimers();
    visibilite = 'visible';
    const { canal } = brancher();
    basculer('hidden');
    expect(canal.wake).not.toHaveBeenCalled();
    vi.advanceTimersByTime(42_000);
    basculer('visible');
    expect(canal.wake).toHaveBeenCalledWith({ hiddenMs: 42_000 });
  });

  it('rouvre tout à la sortie du cache de navigation, pas à un affichage ordinaire', () => {
    const { canal } = brancher();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    expect(canal.wake).not.toHaveBeenCalled();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(canal.wake).toHaveBeenCalledWith({ hiddenMs: Number.POSITIVE_INFINITY });
  });

  it('dit le réseau perdu tout de suite, et réveille le canal à son retour', () => {
    const { canal, reseau } = brancher();
    window.dispatchEvent(new Event('offline'));
    expect(reseau).toHaveBeenLastCalledWith(false);
    expect(canal.wake).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('online'));
    expect(reseau).toHaveBeenLastCalledWith(true);
    expect(canal.wake).toHaveBeenCalledTimes(1);
  });

  it('se débranche', () => {
    const { canal } = brancher();
    debrancher();
    window.dispatchEvent(new Event('online'));
    basculer('visible');
    expect(canal.wake).not.toHaveBeenCalled();
  });
});

describe('canalUrl', () => {
  it('frappe à l’origine de la page, au chemin du canal', () => {
    expect(canalUrl('http://localhost:5177')).toBe('ws://localhost:5177/ws');
    expect(canalUrl('http://192.168.1.42:3004')).toBe('ws://192.168.1.42:3004/ws');
    expect(canalUrl('https://garoutom.tombp.fr')).toBe('wss://garoutom.tombp.fr/ws');
  });

  it('ignore une adresse configurée vide', () => {
    expect(canalUrl('https://garoutom.tombp.fr', '')).toBe('wss://garoutom.tombp.fr/ws');
    expect(canalUrl('https://garoutom.tombp.fr', '   ')).toBe('wss://garoutom.tombp.fr/ws');
    expect(canalUrl('https://garoutom.tombp.fr', undefined)).toBe('wss://garoutom.tombp.fr/ws');
  });

  it('préfère l’adresse configurée au build', () => {
    expect(
      canalUrl('https://garoutom.tombp.fr', 'wss://garoutom.tombp.workers.dev/ws'),
    ).toBe('wss://garoutom.tombp.workers.dev/ws');
  });

  it('tolère une adresse configurée un peu incomplète', () => {
    // Un schéma HTTP devient son pendant WebSocket.
    expect(canalUrl('https://garoutom.tombp.fr', 'https://canal.example')).toBe(
      'wss://canal.example/ws',
    );
    expect(canalUrl('http://localhost:5177', 'http://localhost:8787/ws')).toBe(
      'ws://localhost:8787/ws',
    );
    // Un chemin seul se résout contre la page.
    expect(canalUrl('https://garoutom.tombp.fr', '/canal')).toBe('wss://garoutom.tombp.fr/canal');
  });
});
