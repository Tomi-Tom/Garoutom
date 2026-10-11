/**
 * L'adresse du canal : l'origine de la page par défaut, l'adresse du Worker
 * quand le build la fournit.
 */

import { describe, expect, it } from 'vitest';

import { canalUrl } from './socket.js';

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
