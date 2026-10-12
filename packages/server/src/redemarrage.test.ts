/**
 * Le redémarrage réel : aucune partie perdue (D21).
 *
 * Un vrai processus enfant (`node --import tsx src/index.ts`), un dossier de
 * données temporaire, un port libre. On ouvre une table, on y lance une
 * partie à six, on arrête le serveur proprement, on le relance, et chaque
 * joueur reprend son siège avec son jeton — même siège, même phase.
 *
 * Arrêt : sous Windows, `process.kill(pid, 'SIGINT')` ne délivre PAS de
 * signal, il tue le processus d'un coup sans passer par le gestionnaire (doc
 * Node, « Signal events »). Seuls Ctrl+C dans une console et Ctrl+Pause
 * produisent un vrai `SIGINT`/`SIGBREAK`. L'enfant est donc lancé avec un
 * canal IPC et reçoit `'garoutom:arret'`, qui déclenche le même chemin
 * d'arrêt gracieux ; hors Windows, un second test envoie un vrai `SIGTERM`.
 *
 * Ces tests attendent le lot A (`restore`, `tick`, `stats`, quotas du Hub).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { CLOSE_SERVER_RESTART } from '@garoutom/engine';

const RACINE_SERVEUR = fileURLToPath(new URL('..', import.meta.url));

interface Serveur {
  enfant: ChildProcess;
  port: number;
  sortie: Promise<number | null>;
  journal: () => string;
}

const enfants: ChildProcess[] = [];
let dossiers: string[] = [];

async function portLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const sonde = createServer();
    sonde.listen(0, '127.0.0.1', () => {
      const { port } = sonde.address() as { port: number };
      sonde.close(() => {
        resolve(port);
      });
    });
    sonde.on('error', reject);
  });
}

async function lancer(donnees: string, port: number): Promise<Serveur> {
  const enfant = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: RACINE_SERVEUR,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      GAROUTOM_DATA: donnees,
      GAROUTOM_CLIENT: join(donnees, 'inexistant'),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  enfants.push(enfant);
  let texte = '';
  enfant.stdout?.on('data', (m: Buffer) => (texte += m.toString()));
  enfant.stderr?.on('data', (m: Buffer) => (texte += m.toString()));
  const sortie = new Promise<number | null>((resolve) => enfant.on('exit', resolve));

  // Prêt quand /health répond.
  const limite = Date.now() + 20_000;
  for (;;) {
    try {
      const reponse = await fetch(`http://127.0.0.1:${String(port)}/health`);
      if (reponse.ok) break;
    } catch {
      // pas encore
    }
    if (Date.now() > limite) throw new Error(`le serveur ne démarre pas :\n${texte}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { enfant, port, sortie, journal: () => texte };
}

afterEach(async () => {
  for (const enfant of enfants.splice(0)) {
    if (enfant.exitCode === null) enfant.kill('SIGKILL');
  }
  for (const dossier of dossiers.splice(0)) await rm(dossier, { recursive: true, force: true });
});

interface Client {
  ws: WebSocket;
  ferme: Promise<number>;
  demander: (e: string, d: unknown) => Promise<{ ok: boolean; data?: unknown; code?: string }>;
  dernierSync: () => { room: { status: string; players: { id: string; seat: number }[] }; game: { phase?: { kind?: string } } | null } | null;
  avis: string[];
}

async function connecter(port: number): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws?v=2`);
  const attentes = new Map<number, (r: never) => void>();
  let sync: ReturnType<Client['dernierSync']> = null;
  const avis: string[] = [];
  let n = 0;
  const ferme = new Promise<number>((resolve) => ws.on('close', resolve));
  ws.on('error', () => undefined);
  ws.on('message', (brut) => {
    const cadre = JSON.parse(String(brut)) as { t: string; id?: number; r?: never; e?: string; d?: unknown };
    if (cadre.t === 'ack' && cadre.id !== undefined) attentes.get(cadre.id)?.(cadre.r as never);
    if (cadre.t === 'ev' && cadre.e === 'sync') sync = cadre.d as typeof sync;
    if (cadre.t === 'ev' && cadre.e === 'notice') avis.push((cadre.d as { message: string }).message);
  });
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return {
    ws,
    ferme,
    avis,
    dernierSync: () => sync,
    demander: (e, d) =>
      new Promise((resolve) => {
        const id = ++n;
        attentes.set(id, resolve as (r: never) => void);
        ws.send(JSON.stringify({ t: 'req', id, e, d }));
      }),
  };
}

const attendre = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function partieEnCours(port: number): Promise<{
  code: string;
  joueurs: { client: Client; playerId: string; token: string; name: string }[];
}> {
  const hote = await connecter(port);
  const cree = await hote.demander('room:create', { name: 'Alice' });
  expect(cree.ok).toBe(true);
  const { code, playerId, token } = cree.data as { code: string; playerId: string; token: string };
  const joueurs = [{ client: hote, playerId, token, name: 'Alice' }];
  for (const name of ['Bob', 'Carole', 'Dan', 'Eve', 'Fred']) {
    const client = await connecter(port);
    const r = await client.demander('room:join', { code, name });
    expect(r.ok).toBe(true);
    const d = r.data as { playerId: string; token: string };
    joueurs.push({ client, playerId: d.playerId, token: d.token, name });
  }
  const lancee = await hote.demander('room:start', {});
  expect(lancee.ok).toBe(true);
  await attendre(300);
  return { code, joueurs };
}

describe('redémarrage du serveur avec persistance', () => {
  it('rend à chaque joueur son siège et la phase de la partie', async () => {
    const donnees = await mkdtemp(join(tmpdir(), 'garoutom-redem-'));
    dossiers.push(donnees);
    const port = await portLibre();

    const premier = await lancer(donnees, port);
    const { code, joueurs } = await partieEnCours(port);
    const avant = joueurs.map((j) => ({
      playerId: j.playerId,
      seat: j.client.dernierSync()?.room.players.find((p) => p.id === j.playerId)?.seat,
      phase: j.client.dernierSync()?.game?.phase?.kind,
      statut: j.client.dernierSync()?.room.status,
    }));
    expect(avant[0]?.statut).toBe('playing');

    // Arrêt gracieux : avis, vidage, fermeture 1012, sortie 0 en moins de 3 s.
    const debut = Date.now();
    premier.enfant.send('garoutom:arret');
    const fermetures = await Promise.all(joueurs.map((j) => j.client.ferme));
    const code_sortie = await premier.sortie;
    expect(code_sortie).toBe(0);
    expect(Date.now() - debut).toBeLessThan(3500);
    expect(new Set(fermetures)).toEqual(new Set([CLOSE_SERVER_RESTART]));
    expect(joueurs[0]?.client.avis.some((m) => m.includes('redémarre'))).toBe(true);
    expect(JSON.parse(await readFile(join(donnees, 'tables.json'), 'utf8'))).toHaveProperty(`tables.${code}`);

    // Relance sur le même dossier : chacun reprend avec son jeton.
    const second = await lancer(donnees, port);
    const sante = (await (await fetch(`http://127.0.0.1:${String(port)}/health`)).json()) as {
      tables: Record<string, number>;
      persistance: { active: boolean };
    };
    expect(sante.persistance.active).toBe(true);
    expect(sante.tables.playing).toBe(1);

    for (const [i, joueur] of joueurs.entries()) {
      const client = await connecter(second.port);
      const r = await client.demander('room:join', { code, name: joueur.name, token: joueur.token });
      expect(r.ok).toBe(true);
      expect((r.data as { playerId: string }).playerId).toBe(joueur.playerId);
      await attendre(150);
      const sync = client.dernierSync();
      expect(sync?.room.players.find((p) => p.id === joueur.playerId)?.seat).toBe(avant[i]?.seat);
      expect(sync?.room.status).toBe('playing');
      expect(sync?.game?.phase?.kind).toBe(avant[i]?.phase);
      client.ws.close();
    }
    second.enfant.send('garoutom:arret');
    expect(await second.sortie).toBe(0);
  }, 60_000);

  it.skipIf(process.platform === 'win32')('s’arrête aussi sur un vrai SIGTERM', async () => {
    const donnees = await mkdtemp(join(tmpdir(), 'garoutom-sigterm-'));
    dossiers.push(donnees);
    const serveur = await lancer(donnees, await portLibre());
    serveur.enfant.kill('SIGTERM');
    expect(await serveur.sortie).toBe(0);
  }, 30_000);

  it('un second signal force la sortie (code 1)', async () => {
    const donnees = await mkdtemp(join(tmpdir(), 'garoutom-double-'));
    dossiers.push(donnees);
    const serveur = await lancer(donnees, await portLibre());
    serveur.enfant.send('garoutom:arret');
    serveur.enfant.send('garoutom:arret');
    expect(await serveur.sortie).toBe(1);
  }, 30_000);
});
