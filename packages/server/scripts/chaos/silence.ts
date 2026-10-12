/**
 * Le silence (D23) survit-il à une hibernation du Durable Object ?
 *
 *   npx tsx scripts/chaos/silence.ts             # serveur Node
 *   npx tsx scripts/chaos/silence.ts --wrangler  # Worker (wrangler dev)
 *
 * Trois joueurs au salon ; l'hôte renvoie des options identiques, tout de
 * suite puis après 20 et 30 s de calme. Rien n'a changé : aucun siège ne doit
 * recevoir de `sync`. Sous Node, c'est le cas ; sous le Worker, le calme
 * laisse l'objet s'endormir, il renaît avec un `RoomManager` neuf dont les
 * empreintes (`rooms.ts`, `fingerprints`) sont vides, et chaque siège
 * reçoit un `sync` identique au précédent.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { JoinResult, SyncPayload } from '@garoutom/engine';

import { canalNode } from '../canal-node.js';
import { portLibre, ServeurEnfant } from './serveur.js';

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const worker = process.argv.includes('--wrangler');
const port = await portLibre();
const etat = mkdtempSync(join(tmpdir(), 'garoutom-repro-'));
const serveur = new ServeurEnfant(port, () => undefined, { GAROUTOM_PROXY: '1', GAROUTOM_DATA: 'off' }, worker ? { etat } : null);
await serveur.demarrer();
const url = `ws://127.0.0.1:${String(port)}/ws`;
try {
  const recus: number[] = [0, 0, 0];
  const canaux = [0, 1, 2].map((i) => {
    const c = canalNode(url, { entetes: { 'cf-connecting-ip': `10.9.9.${String(i)}`, 'x-forwarded-for': `10.9.9.${String(i)}` } });
    c.on('sync', (_p: SyncPayload) => {
      recus[i] = (recus[i] ?? 0) + 1;
    });
    return c;
  });
  while (!canaux.every((c) => c.connected)) await pause(20);
  const hote = await canaux[0]!.request<JoinResult>('room:create', { name: 'Hôte', options: { tempsNuit: 15 } });
  for (const [i, c] of canaux.entries()) if (i > 0) await c.request('room:join', { code: hote.code, name: `Invité ${String(i)}` });
  await pause(1_000);
  const options = { tempsNuit: 15 };
  for (const attente of [0, 20_000, 30_000]) {
    await pause(attente);
    const avant = [...recus];
    await canaux[0]!.request('room:options', { options });
    await pause(1_000);
    console.log(`${worker ? 'Worker' : 'Node'} — options identiques après ${String(attente / 1000)} s de calme : sync reçus ${JSON.stringify(recus.map((n, i) => n - (avant[i] ?? 0)))}`);
  }
  for (const c of canaux) c.close();
} finally {
  await serveur.tuer();
  rmSync(etat, { recursive: true, force: true });
}
