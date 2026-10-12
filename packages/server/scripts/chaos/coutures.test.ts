/**
 * Les coutures entre le client (lot D) et le serveur (lots A et C), essayées
 * de bout en bout : un vrai serveur Node en processus enfant, de vrais canaux
 * du moteur (`Channel`) branchés sur `ws`, comme un navigateur.
 *
 * Ce que le client suppose, et qu'on vérifie ici :
 *
 * - (a) une reprise par jeton avec un pseudo vide est acceptée — un stockage
 *   vidé ne doit pas coûter la place (`reprendrePlace` envoie `loadName()`) ;
 * - (b) un jeton inconnu dans une partie lancée est un refus définitif
 *   (`started`, ou `gone`/`full`), un quota un refus passager (`rate`) ;
 * - (c) `lastSeq: 0` rejoue tout le journal public (`replay: true`), et `seq`
 *   croît pour toute la vie de la table, revanche comprise ;
 * - (d) une pause (D19) ne touche pas l'échéance rangée : au retour, elle est
 *   décalée exactement de la durée de la pause.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ChannelError,
  createSeededRng,
  eventSeqOf,
  type Channel,
  type HelloFrame,
  type JoinResult,
  type SyncPayload,
} from '@garoutom/engine';

import { canalNode } from '../canal-node.js';
import { decider } from '../robots/cerveau.js';
import { portLibre, ServeurEnfant } from './serveur.js';

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

let serveur: ServeurEnfant;
let url: string;
const ouverts: Client[] = [];

/** Un onglet : un canal, et ce qu'il a reçu. */
class Client {
  readonly canal: Channel;
  readonly syncs: SyncPayload[] = [];
  readonly hellos: HelloFrame[] = [];
  join: JoinResult | null = null;
  private joue = false;

  constructor(readonly ip: string) {
    this.canal = canalNode(url, { entetes: { 'x-forwarded-for': ip } });
    this.canal.on('sync', (p) => {
      this.syncs.push(p);
      if (this.joue) this.jouer(p);
    });
    this.canal.on('hello', (h) => this.hellos.push(h));
    ouverts.push(this);
  }

  async pret(): Promise<this> {
    const limite = Date.now() + 5_000;
    while (!this.canal.connected && Date.now() < limite) await pause(10);
    if (!this.canal.connected) throw new Error('canal jamais ouvert');
    return this;
  }

  get dernier(): SyncPayload | undefined {
    return this.syncs.at(-1);
  }

  /** Attend un `sync` reçu après `depuis` (index) qui vérifie `pred`. */
  async attendre(pred: (p: SyncPayload) => boolean, depuis = 0, ms = 8_000): Promise<SyncPayload> {
    const limite = Date.now() + ms;
    for (;;) {
      const trouve = this.syncs.slice(depuis).find(pred);
      if (trouve) return trouve;
      if (Date.now() > limite) throw new Error(`sync attendu non reçu (${String(this.syncs.length)} reçus)`);
      await pause(20);
    }
  }

  async demander<T>(event: string, payload: unknown): Promise<T> {
    return this.canal.request<T>(event, payload);
  }

  /** Joue au cerveau des robots, à chaque `sync`, sans délai. */
  jouerSeul(): void {
    this.joue = true;
    const p = this.dernier;
    if (p) this.jouer(p);
  }

  private jouer(p: SyncPayload): void {
    const game = p.game;
    if (!game || game.over || game.acted || !game.prompt) return;
    const action = decider(game, createSeededRng(p.serverNow >>> 0), { graine: 7 });
    if (action) this.canal.request('game:action', { action }).catch(() => undefined);
  }

  fermer(): void {
    this.canal.close();
  }
}

/** Le code machine d'un refus. */
async function refus(promesse: Promise<unknown>): Promise<string | undefined> {
  try {
    await promesse;
    return 'ok';
  } catch (error) {
    return error instanceof ChannelError ? error.code : `sans code : ${(error as Error).message}`;
  }
}

/** Une table de six : l'hôte et cinq invités, tous assis. */
async function table(ip: string, options: Record<string, unknown> = {}): Promise<Client[]> {
  const hote = await new Client(ip).pret();
  hote.join = await hote.demander<JoinResult>('room:create', { name: 'Hôte', options });
  const autres: Client[] = [];
  for (let i = 1; i < 6; i += 1) {
    const c = await new Client(ip).pret();
    c.join = await c.demander<JoinResult>('room:join', { code: hote.join.code, name: `Invité ${String(i)}` });
    autres.push(c);
  }
  return [hote, ...autres];
}

beforeAll(async () => {
  const port = await portLibre();
  url = `ws://127.0.0.1:${String(port)}/ws`;
  serveur = new ServeurEnfant(port, () => undefined, { GAROUTOM_PROXY: '1', GAROUTOM_DATA: 'off' });
  await serveur.demarrer();
}, 40_000);

afterAll(async () => {
  for (const c of ouverts) c.fermer();
  await serveur.tuer();
});

describe('coutures client ↔ serveur, de bout en bout', () => {
  it('se présente (hello) et annonce le battement', async () => {
    const c = await new Client('10.0.0.1').pret();
    const limite = Date.now() + 3_000;
    while (c.hellos.length === 0 && Date.now() < limite) await pause(10);
    expect(c.hellos[0]).toMatchObject({ t: 'hello', protocol: 2, heartbeatMs: 20_000 });
    expect(c.canal.capabilities.has('ping')).toBe(true);
    c.fermer();
  });

  it('(a) reprend une place par le jeton avec un pseudo vide, au salon comme en partie', async () => {
    const [hote, b] = await table('10.0.1.1');
    const join = b!.join!;
    b!.fermer();
    const b2 = await new Client('10.0.1.1').pret();
    const repris = await b2.demander<JoinResult>('room:join', { code: join.code, name: '', token: join.token });
    expect(repris.playerId).toBe(join.playerId);

    await hote!.demander('room:start', {});
    await b2.attendre((p) => p.room.status === 'playing');
    b2.fermer();
    const b3 = await new Client('10.0.1.1').pret();
    const reprisEnPartie = await b3.demander<JoinResult>('room:join', { code: join.code, name: '', token: join.token, lastSeq: 1 });
    expect(reprisEnPartie.playerId).toBe(join.playerId);
    const s = await b3.attendre((p) => p.game !== null);
    expect(s.game?.you?.seat).toBe(1);
  });

  it('(b) refuse un jeton inconnu en partie (started), un code inconnu (gone), un quota (rate)', async () => {
    const [hote] = await table('10.0.2.1');
    await hote!.demander('room:start', {});
    const code = hote!.join!.code;
    const intrus = await new Client('10.0.2.2').pret();
    expect(await refus(intrus.demander('room:join', { code, name: 'Intrus', token: 'pas-un-jeton' }))).toBe('started');
    expect(await refus(intrus.demander('room:join', { code, name: 'Intrus' }))).toBe('started');
    expect(await refus(intrus.demander('room:join', { code: 'ZZZZ', name: 'Intrus', token: 'x' }))).toBe('gone');

    // Trois tables par minute et par adresse : la quatrième est un refus passager.
    const codes: (string | undefined)[] = [];
    for (let i = 0; i < 4; i += 1) {
      const nouveau = await new Client('10.0.2.3').pret();
      codes.push(await refus(nouveau.demander('room:create', { name: `Ouvreur ${String(i)}` })));
    }
    expect(codes).toEqual(['ok', 'ok', 'ok', 'rate']);

    // Dix `join` ratés par minute et par adresse : au-delà, même un jeton
    // valable attend — c'est un refus passager, que le client retente.
    const devin = await new Client('10.0.2.4').pret();
    const reponses: (string | undefined)[] = [];
    for (let i = 0; i < 11; i += 1) reponses.push(await refus(devin.demander('room:join', { code: 'QQQQ', name: 'Devin' })));
    expect(reponses.slice(0, 10).every((r) => r === 'gone')).toBe(true);
    expect(reponses[10]).toBe('rate');
  });

  it('(c) lastSeq 0 rejoue tout le journal ; seq croît pour la vie de la table, revanche comprise', async () => {
    const joueurs = await table('10.0.3.1', { tempsNuit: 15, tempsJour: 60 });
    const [hote, b] = joueurs;
    await hote!.demander('room:start', {});
    for (const j of joueurs) j.jouerSeul();
    await b!.attendre((p) => p.room.status === 'playing');
    await pause(1_500);

    // Reprise depuis un nouvel onglet, sans souvenir : lastSeq 0.
    const join = b!.join!;
    const avant = b!.dernier!.seq;
    b!.fermer();
    const b2 = await new Client('10.0.3.1').pret();
    await b2.demander('room:join', { code: join.code, name: '', token: join.token, lastSeq: 0 });
    const rejoue = await b2.attendre((p) => p.replay === true);
    expect(rejoue.events.length).toBeGreaterThan(0);
    expect(eventSeqOf(rejoue, 0)).toBe(1);
    expect(rejoue.events[0]?.type).toBe('debut');
    expect(rejoue.seq).toBeGreaterThanOrEqual(avant);
    // Une reprise qui sait où elle en est ne rejoue que la suite.
    b2.fermer();
    const b3 = await new Client('10.0.3.1').pret();
    await b3.demander('room:join', { code: join.code, name: '', token: join.token, lastSeq: rejoue.seq });
    const suite = await b3.attendre(() => true);
    if (suite.replay) expect(eventSeqOf(suite, 0)).toBe(rejoue.seq + 1);
    else expect(suite.seq).toBe(rejoue.seq);
    b3.jouerSeul();

    // La partie va à son terme (les robots jouent sans délai), puis la revanche.
    const fin = await hote!.attendre((p) => p.room.status === 'finished', 0, 150_000);
    const seqFin = fin.seq;
    const nSync = hote!.syncs.length;
    await hote!.demander('room:rematch', {});
    const salon = await hote!.attendre((p) => p.room.status === 'lobby', nSync);
    expect(salon.seq).toBe(seqFin);
    await hote!.demander('room:start', {});
    const relance = await hote!.attendre((p) => p.room.status === 'playing' && p.events.length > 0, nSync);
    expect(eventSeqOf(relance, 0)).toBe(seqFin + 1);
    // Tous les numéros vus par l'hôte, du premier au dernier : jamais de recul.
    const vus = hote!.syncs.map((p) => p.seq);
    expect(vus.every((s, i) => i === 0 || s >= vus[i - 1]!)).toBe(true);

    // Après la revanche, lastSeq 0 ne rejoue que la nouvelle partie.
    b3.fermer();
    const b4 = await new Client('10.0.3.1').pret();
    await b4.demander('room:join', { code: join.code, name: '', token: join.token, lastSeq: 0 });
    const nouvelle = await b4.attendre((p) => p.replay === true);
    expect(eventSeqOf(nouvelle, 0)).toBe(seqFin + 1);
    expect(nouvelle.events[0]?.type).toBe('debut');
    for (const j of joueurs) j.fermer();
  }, 200_000);

  it('(d) une pause garde l’échéance d’origine et la décale de sa durée au retour', async () => {
    const joueurs = await table('10.0.4.1');
    const [hote] = joueurs;
    await hote!.demander('room:start', {});
    // La révélation : chacun doit dire « prêt », chacun voit l'échéance.
    const vues = await Promise.all(joueurs.map((j) => j.attendre((p) => p.room.status === 'playing' && p.room.deadline !== null)));
    const echeance = vues[0]!.room.deadline!;
    expect(vues.every((v) => v.room.deadline === echeance && !v.room.paused)).toBe(true);

    // Tout le monde part : plus aucun vivant, l'horloge se suspend.
    const jetons = joueurs.map((j) => j.join!);
    for (const j of joueurs) j.fermer();
    const PAUSE_MS = 4_000;
    await pause(PAUSE_MS);

    const retour = await new Client('10.0.4.1').pret();
    const t = Date.now();
    await retour.demander('room:join', { code: jetons[2]!.code, name: '', token: jetons[2]!.token });
    const repris = await retour.attendre((p) => p.room.deadline !== null);
    expect(repris.room.paused).toBe(false);
    const decalage = repris.room.deadline! - echeance;
    // La pause a duré de la dernière fermeture au retour : ~PAUSE_MS.
    expect(decalage).toBeGreaterThan(PAUSE_MS - 500);
    expect(decalage).toBeLessThan(Date.now() - t + PAUSE_MS + 1_500);
    // Et l'échéance n'est pas déjà passée : la phase n'a pas été close pendant la pause.
    expect(repris.game?.phase).toBe('revelation');
  }, 40_000);
});
