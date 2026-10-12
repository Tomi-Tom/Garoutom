/**
 * Le cœur des tables, éprouvé sans réseau ni horloge réelle.
 *
 * L'émetteur n'est qu'un carnet : tout ce qui part y est consigné, siège par
 * siège. L'horloge avance à la main, et les réveils que le cœur demande à
 * son hôte (D20) sont tenus par le banc, qui appelle `tick` à leur date —
 * exactement ce que font Node et le Worker. Ce qu'on éprouve ici, les deux
 * hôtes le reprennent tel quel.
 *
 * Les règles citées sont celles de `docs/RULES.md` ; les décisions, celles
 * de `docs/DECISIONS.md` (D17 à D23).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ABANDON_MS,
  CLOSE_GONE,
  CLOSE_REPLACED,
  eventSeqOf,
  LOBBY_GRACE_MS,
  RECONNECT_GRACE_MS,
  REVEAL_MS,
  type GameEvent,
} from '@garoutom/engine';

import {
  banc,
  DEBUT,
  lastSyncOf,
  noticesOf,
  ouvrirTable,
  passerRevelation,
  siegeDuRole,
  syncsOf,
  type Banc,
} from './banc.js';
import {
  EMPTY_LOBBY_TTL_MS,
  IDLE_ROOM_MS,
  MAX_ROOMS,
  nextWake,
  RoomManager,
  upgradeRoom,
  type Room,
} from './rooms.js';
import { appendJournal, emptyJournal, JOURNAL_SIZE, missedSince, readJournal } from './journal.js';
import { MemoryRoomStore } from './store.js';

/** Une composition courte et sans hasard de rôles : un loup, des villageois. */
const COURTE = { auto: false, loups: 1, roles: [], capitaine: false };
/** La même, avec une Voyante. */
const AVEC_VOYANTE = { auto: false, loups: 1, roles: ['voyante'], capitaine: false };

let erreurs: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Le cœur journalise ses incidents sur la console d'erreur : on les tait
  // ici, et les épreuves qui les provoquent les comptent.
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  erreurs.mockRestore();
});

async function lancer(b: Banc, n: number, options?: unknown): Promise<Awaited<ReturnType<typeof ouvrirTable>>> {
  const table = await ouvrirTable(b, n, options);
  await b.manager.start('s0');
  return table;
}

function morts(events: GameEvent[]): { seat: number; cause: string }[] {
  return events.flatMap((event) => (event.type === 'morts' ? event.deaths : []));
}

/* ------------------------------------------------------------------ */
/* La table, son code, ses jetons                                      */
/* ------------------------------------------------------------------ */

describe('la table, son code, ses jetons', () => {
  it('crée une table : quatre lettres sans ambiguïté, un jeton pour revenir', async () => {
    const b = banc();
    const result = await b.manager.create('s0', 'Alice', undefined);

    expect(result.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(result.token).toBeTruthy();

    const room = await b.manager.peek(result.code);
    expect(room?.hostId).toBe(result.playerId);
    expect(room?.players[0]?.seat).toBe(0);
    expect(room?.schema).toBe(1);

    const sync = lastSyncOf(b.sent, 's0');
    expect(sync.room.code).toBe(result.code);
    expect(sync.room.status).toBe('lobby');
    expect(sync.room.players[0]?.name).toBe('Alice');
    expect(sync.room.players[0]?.isHost).toBe(true);
    expect(sync.room.players[0]?.absent).toBe(false);
    expect(sync.room.paused).toBe(false);
    expect(sync.seq).toBe(0);
    expect(sync.game).toBeNull();
  });

  it('range les sièges dans l’ordre d’arrivée ; l’hôte est le premier venu', async () => {
    const b = banc();
    const { code, sieges } = await ouvrirTable(b, 3);

    expect(sieges.map((siege) => siege.seat)).toEqual([0, 1, 2]);
    const room = await b.manager.peek(code);
    expect(room?.hostId).toBe(sieges[0]?.playerId);
  });

  it('ne tire jamais deux fois le même code parmi les tables vivantes', async () => {
    // Les tirages sont forcés : la première table prend AAAA, la seconde doit se distinguer.
    const b = banc({ script: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] });
    const premiere = await b.manager.create('s0', 'Alice', undefined);
    const seconde = await b.manager.create('s1', 'Brice', undefined);

    expect(premiere.code).toBe('AAAA');
    expect(seconde.code).toBe('AAAB');
  });

  it('refuse un code inconnu, ou mal formé, en code `gone`', async () => {
    const b = banc();
    const refus = b.manager.join('s0', 'ZZZZ', 'Alice', undefined);
    await expect(refus).rejects.toThrow('Aucune table avec ce code');
    await expect(refus).rejects.toMatchObject({ code: 'gone' });
    await expect(b.manager.join('s0', { code: 'ABCD' }, 'Alice')).rejects.toMatchObject({ code: 'gone' });
    await expect(b.manager.join('s0', 'AB', 'Alice')).rejects.toMatchObject({ code: 'gone' });
  });

  it('refuse la table complète au-delà de dix-huit joueurs', async () => {
    const b = banc();
    const { code } = await ouvrirTable(b, 18);
    const refus = b.manager.join('s18', code, 'Supplément', undefined);
    await expect(refus).rejects.toThrow('La table est complète');
    await expect(refus).rejects.toMatchObject({ code: 'full' });
  });

  it('exige un pseudo nettoyé, et le borne à seize signes (R103)', async () => {
    const b = banc();
    await expect(b.manager.create('s0', '   ', undefined)).rejects.toThrow('Il faut un pseudo');
    await expect(b.manager.create('s0', '‮​', undefined)).rejects.toMatchObject({ code: 'name' });
    await expect(b.manager.create('s0', 42, undefined)).rejects.toMatchObject({ code: 'name' });

    const result = await b.manager.create('s0', 'Alexandrine-Victoire', undefined);
    const room = await b.manager.peek(result.code);
    expect(room?.players[0]?.name).toHaveLength(16);
  });

  it('suffixe un pseudo déjà pris : « Tom », puis « Tom 2 »', async () => {
    const b = banc();
    const { code } = await b.manager.create('s0', 'Tom', undefined);
    await b.manager.join('s1', code, 'tom', undefined);
    await b.manager.join('s2', code, 'Tom', undefined);
    await b.manager.join('s3', code, 'Maximilien-Albert', undefined);
    await b.manager.join('s4', code, 'Maximilien-Albert', undefined);

    const noms = (await b.manager.peek(code))?.players.map((player) => player.name);
    expect(noms).toEqual(['Tom', 'tom 2', 'Tom 3', 'Maximilien-Alber', 'Maximilien-Alb 2']);
  });

  it(`n’ouvre pas plus de ${String(MAX_ROOMS)} tables`, async () => {
    const store = new MemoryRoomStore<Room>();
    for (let i = 0; i < MAX_ROOMS; i += 1) await store.save(`X${String(i)}`, {} as Room);
    const b = banc({ store });
    await expect(b.manager.create('s0', 'Alice')).rejects.toMatchObject({ code: 'rate' });
  });
});

/* ------------------------------------------------------------------ */
/* Le join idempotent (D22)                                            */
/* ------------------------------------------------------------------ */

describe('le join est idempotent (D22)', () => {
  it('un second room:join sur une socket déjà assise ne l’éjecte pas — avec ou sans jeton', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    const brice = sieges[1]!;

    const sansJeton = await b.manager.join(brice.socketId, code, 'Brice', undefined);
    const avecJeton = await b.manager.join(brice.socketId, code, 'Brice', brice.token);

    expect(sansJeton).toEqual({ code, playerId: brice.playerId, token: brice.token });
    expect(avecJeton).toEqual({ code, playerId: brice.playerId, token: brice.token });
    const room = await b.manager.peek(code);
    expect(room?.players).toHaveLength(6);
    const place = room?.players.find((player) => player.id === brice.playerId);
    expect(place?.socketId).toBe(brice.socketId);
    expect(place?.absent).toBe(false);
    expect(b.closed).toEqual([]);
    // Il peut toujours jouer.
    await b.manager.action(brice.socketId, { type: 'pret' });
  });

  it('au salon aussi : le même joueur, la même place, rien ne bouge', async () => {
    const b = banc();
    const { code, sieges } = await ouvrirTable(b, 3);
    await b.manager.join('s1', code, 'Brice', undefined);
    await b.manager.join('s1', code, 'Brice', undefined);
    const room = await b.manager.peek(code);
    expect(room?.players.map((player) => player.id)).toEqual(sieges.map((siege) => siege.playerId));
  });

  it('chaque reprise renvoie un sync complet, même si rien n’a changé', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    const avant = syncsOf(b.sent, 's1').length;
    await b.manager.join('s1', code, 'Brice', sieges[1]!.token);
    expect(syncsOf(b.sent, 's1').length).toBe(avant + 1);
  });

  it('valide tout avant de quitter une autre table : un join refusé ne coûte pas la place', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    const autre = await b.manager.create('t0', 'Zoé');
    await b.manager.join('t1', autre.code, 'Yann');
    await b.manager.start('t0').catch(() => undefined);

    // Brice, assis à la première, tente une table qui n'existe pas, puis une
    // partie commencée sans jeton : il garde sa place à chaque fois.
    await expect(b.manager.join('s1', 'ZZZZ', 'Brice')).rejects.toMatchObject({ code: 'gone' });
    await expect(b.manager.join('s1', code, '')).resolves.toBeDefined(); // idempotent, le pseudo n'y fait rien
    const room = await b.manager.peek(code);
    expect(room?.players.find((player) => player.socketId === 's1')).toBeDefined();
    await b.manager.action('s1', { type: 'pret' });
  });

  it('rejoindre une autre table quitte l’ancienne — une fois la nouvelle rangée', async () => {
    const b = banc();
    const premiere = await ouvrirTable(b, 3);
    const seconde = await b.manager.create('t0', 'Zoé');
    await b.manager.join('s2', seconde.code, 'Céline');

    expect((await b.manager.peek(premiere.code))?.players).toHaveLength(2);
    expect((await b.manager.peek(seconde.code))?.players).toHaveLength(2);
  });

  it('une reprise depuis un autre onglet ferme l’ancien en 4001, qui se tait', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    const brice = sieges[1]!;

    const reprise = await b.manager.join('onglet-2', code, 'Brice', brice.token);
    expect(reprise.playerId).toBe(brice.playerId);
    expect(b.closed).toEqual([{ socketId: brice.socketId, code: CLOSE_REPLACED, reason: expect.any(String) }]);

    // L'ancienne socket n'est plus assise, et ne reçoit plus rien.
    expect(b.manager.seated(brice.socketId)).toBe(false);
    const recus = syncsOf(b.sent, brice.socketId).length;
    await b.manager.action('s0', { type: 'pret' });
    expect(syncsOf(b.sent, brice.socketId).length).toBe(recus);
    await expect(b.manager.action(brice.socketId, { type: 'pret' })).rejects.toMatchObject({ code: 'session' });
    // Sa fermeture, quand l'hôte la signale, ne déconnecte pas la nouvelle.
    await b.manager.disconnect(brice.socketId);
    const place = (await b.manager.peek(code))?.players.find((player) => player.id === brice.playerId);
    expect(place?.socketId).toBe('onglet-2');
  });
});

/* ------------------------------------------------------------------ */
/* L'hôte (D17)                                                        */
/* ------------------------------------------------------------------ */

describe('la charge d’hôte (D17)', () => {
  it('un salon vidé par la coupure de l’hôte retrouve un hôte au premier qui entre', async () => {
    const b = banc();
    const { code } = await b.manager.create('s0', 'Alice');
    await b.manager.disconnect('s0');
    await b.avancer(LOBBY_GRACE_MS);
    expect((await b.manager.peek(code))?.players).toHaveLength(0);

    const brice = await b.manager.join('s1', code, 'Brice');
    const room = await b.manager.peek(code);
    expect(room?.hostId).toBe(brice.playerId);
    expect(lastSyncOf(b.sent, 's1').room.players[0]?.isHost).toBe(true);
    // Et la partie peut démarrer : la table n'est plus orpheline.
    for (let i = 2; i < 7; i += 1) await b.manager.join(`s${String(i)}`, code, `Joueur ${String(i)}`);
    await b.manager.start('s1');
    expect((await b.manager.peek(code))?.status).toBe('playing');
  });

  it('l’hôte qui part volontairement du salon passe la main à un joueur connecté', async () => {
    const b = banc();
    const { code, sieges } = await ouvrirTable(b, 3);
    await b.manager.disconnect('s1'); // Brice coupé, en grâce
    await b.manager.leave('s0');
    expect((await b.manager.peek(code))?.hostId).toBe(sieges[2]?.playerId);
  });

  it('au salon, l’hôte en grâce reste l’hôte ; sa grâce éteinte, la charge passe', async () => {
    const b = banc();
    const { code, sieges } = await ouvrirTable(b, 3);
    await b.manager.disconnect('s0');
    expect((await b.manager.peek(code))?.hostId).toBe(sieges[0]?.playerId);
    await b.avancer(LOBBY_GRACE_MS);
    const room = await b.manager.peek(code);
    expect(room?.players).toHaveLength(2);
    expect(room?.hostId).toBe(sieges[1]?.playerId);
  });

  it('en partie, l’hôte montré absent passe la main ; revenu, il ne la reprend pas', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, { abandon: false });
    await b.manager.disconnect('s0');
    expect((await b.manager.peek(code))?.hostId).toBe(sieges[0]?.playerId);
    await b.avancer(RECONNECT_GRACE_MS);
    expect((await b.manager.peek(code))?.hostId).toBe(sieges[1]?.playerId);
    await b.manager.join('s0-bis', code, 'Alice', sieges[0]!.token);
    expect((await b.manager.peek(code))?.hostId).toBe(sieges[1]?.playerId);
  });
});

/* ------------------------------------------------------------------ */
/* Les options                                                         */
/* ------------------------------------------------------------------ */

describe('les options de la table', () => {
  it('passe tout par sanitizeOptions : rien d’illisible ne traverse', async () => {
    const b = banc();
    const { code } = await ouvrirTable(b, 2);
    await b.manager.setOptions('s0', {
      tempsNuit: 999,
      auto: 'peut-être',
      roles: ['voyante', 'martien', 3],
    });

    const room = await b.manager.peek(code);
    expect(room?.options.tempsNuit).toBe(40); // hors borne : le défaut, pas la borne (R10)
    expect(room?.options.auto).toBe(true);
    expect(room?.options.roles).toEqual(['voyante']);
  });

  it('réserve les options à l’hôte, et au salon', async () => {
    const b = banc();
    await ouvrirTable(b, 6);
    const refus = b.manager.setOptions('s1', { chat: false });
    await expect(refus).rejects.toThrow('Seul l’hôte peut faire cela');
    await expect(refus).rejects.toMatchObject({ code: 'host' });

    await b.manager.start('s0');
    await expect(b.manager.setOptions('s0', { chat: false })).rejects.toThrow('La partie a déjà commencé');
  });

  it('une socket assise nulle part reçoit le code `session`', async () => {
    const b = banc();
    await expect(b.manager.start('perdu')).rejects.toMatchObject({ code: 'session' });
  });
});

/* ------------------------------------------------------------------ */
/* Le lancement                                                        */
/* ------------------------------------------------------------------ */

describe('le lancement de la partie', () => {
  it('refuse en dessous de six joueurs', async () => {
    const b = banc();
    await ouvrirTable(b, 5);
    await expect(b.manager.start('s0')).rejects.toThrow(/entre 6 et 18 joueurs/);
  });

  it('refuse une composition injouable avec l’erreur lisible du moteur', async () => {
    const b = banc();
    await ouvrirTable(b, 6, { auto: false, loups: 4, roles: [] });
    const refus = b.manager.start('s0');

    await expect(refus).rejects.toThrow('Trop de loups pour cette table');
    await expect(refus).rejects.toMatchObject({ code: 'composition' });
  });

  it('distribue les cartes à six joueurs et raconte le début à chacun, numéroté', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);

    const room = await b.manager.peek(code);
    expect(room?.status).toBe('playing');
    expect(room?.game?.players).toHaveLength(6);
    expect(room?.game?.rng).toEqual(expect.any(Number));

    for (const siege of sieges) {
      const sync = lastSyncOf(b.sent, siege.socketId);
      expect(sync.game?.you?.seat).toBe(siege.seat);
      expect(sync.game?.phase).toBe('revelation');
      expect(sync.events).toContainEqual({ type: 'debut' });
      expect(sync.seq).toBe(sync.events.length);
      expect(eventSeqOf(sync, 0)).toBe(1);
      expect(sync.game?.options).toEqual(room?.options);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Les actions                                                         */
/* ------------------------------------------------------------------ */

describe('les actions du jeu', () => {
  it('applique une action légale ; le siège vient de la session, jamais de la charge utile', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);

    await b.manager.action('s1', { type: 'pret', seat: 4 });

    const room = await b.manager.peek(code);
    expect(room?.game?.phase).toEqual({ kind: 'revelation', ready: [1] });

    const sync = lastSyncOf(b.sent, 's1');
    expect(sync.game?.acted).toBe(true);
    expect(sync.events).toEqual([]);
  });

  it('refuse une action illégale : le message et le code du moteur reviennent', async () => {
    const b = banc();
    await lancer(b, 6);

    const refus = b.manager.action('s0', { type: 'voter', target: 1 });
    await expect(refus).rejects.toThrow('Ce n’est pas le moment de voter');
    await expect(refus).rejects.toMatchObject({ code: 'wrong-phase' });
  });

  it('refuse un verbe inconnu, une charge illisible, un siège mal typé (R102)', async () => {
    const b = banc();
    await lancer(b, 6);

    await expect(b.manager.action('s0', { type: 'regarder' })).rejects.toThrow('Action inconnue');
    await expect(b.manager.action('s0', 'pas une action')).rejects.toThrow('Action illisible');
    await expect(b.manager.action('s0', { type: 'voter', target: '1' })).rejects.toMatchObject({ code: 'action' });
    // Borné par la table : le siège 7 n'existe pas à six.
    await expect(b.manager.action('s0', { type: 'voter', target: 7 })).rejects.toMatchObject({ code: 'action' });
  });

  it('refuse le jeu hors partie avec le code `playing`', async () => {
    const b = banc();
    await ouvrirTable(b, 6);
    await expect(b.manager.action('s0', { type: 'pret' })).rejects.toMatchObject({ code: 'playing' });
  });
});

/* ------------------------------------------------------------------ */
/* Le silence                                                          */
/* ------------------------------------------------------------------ */

describe('le silence est la loi (R87–R88, D23)', () => {
  it('le villageois ne voit pas la meute ; le loup, si', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);

    const loup = await siegeDuRole(b, code, 'loup');
    const villageois = await siegeDuRole(b, code, 'villageois');
    const syncLoup = lastSyncOf(b.sent, sieges[loup]!.socketId);
    const syncVillageois = lastSyncOf(b.sent, sieges[villageois]!.socketId);

    expect(syncVillageois.game?.pack).toBeNull();
    expect(syncVillageois.game?.players[loup]?.role).toBeNull();
    expect(syncVillageois.game?.players.filter((player) => player.role !== null)).toHaveLength(1);

    expect(syncLoup.game?.pack?.seats).toContain(loup);
    expect(syncLoup.game?.players[loup]?.role).toBe('loup');
  });

  it('l’échéance n’appartient qu’au siège qui doit agir (R80)', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);

    const sync = lastSyncOf(b.sent, 's1');
    expect(sync.room.deadline).toBe(sync.serverNow + REVEAL_MS);
    expect(sync.room.deadlineDurationMs).toBe(REVEAL_MS);

    await b.manager.action('s1', { type: 'pret' });
    expect(lastSyncOf(b.sent, 's1').room.deadline).toBeNull();
    expect(lastSyncOf(b.sent, 's2').room.deadline).not.toBeNull();

    for (const siege of sieges) {
      if (siege.socketId !== 's1') await b.manager.action(siege.socketId, { type: 'pret' });
    }
    const loup = await siegeDuRole(b, code, 'loup');
    const villageois = await siegeDuRole(b, code, 'villageois');
    const syncLoup = lastSyncOf(b.sent, sieges[loup]!.socketId);
    const syncVillageois = lastSyncOf(b.sent, sieges[villageois]!.socketId);

    expect(syncVillageois.game?.phase).toBe('nuit');
    expect(syncVillageois.room.deadline).toBeNull();
    expect(syncLoup.room.deadline).toBe(syncLoup.serverNow + 40_000);
    expect(syncLoup.room.deadlineDurationMs).toBe(40_000);
  });

  it('la nuit, quand la Voyante sonde ou que la meute parle, le villageois ne reçoit rien', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, AVEC_VOYANTE);
    await passerRevelation(b, sieges);

    const voyante = await siegeDuRole(b, code, 'voyante');
    const loup = await siegeDuRole(b, code, 'loup');
    const villageois = await siegeDuRole(b, code, 'villageois');
    const socketVillageois = sieges[villageois]!.socketId;
    const recus = syncsOf(b.sent, socketVillageois).length;
    const recusLoup = syncsOf(b.sent, sieges[loup]!.socketId).length;

    await b.manager.action(sieges[voyante]!.socketId, { type: 'sonder', target: villageois });
    await b.manager.action(sieges[loup]!.socketId, { type: 'dire', channel: 'loups', text: 'On mange qui ?' });

    expect(syncsOf(b.sent, socketVillageois).length).toBe(recus);
    // La Voyante, elle, voit son geste compté ; le loup, son message.
    expect(lastSyncOf(b.sent, sieges[voyante]!.socketId).game?.acted).toBe(true);
    expect(syncsOf(b.sent, sieges[loup]!.socketId).length).toBe(recusLoup + 1);
  });

  it('un sync qui porte des évènements part toujours, même à vue inchangée', async () => {
    const b = banc();
    const { sieges } = await lancer(b, 6, COURTE);
    await passerRevelation(b, sieges);
    // Le passage à la nuit est un évènement : tout le monde l'a reçu.
    for (const siege of sieges) {
      expect(lastSyncOf(b.sent, siege.socketId).events).toContainEqual(
        expect.objectContaining({ type: 'phase', phase: 'nuit' }),
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* Le temps                                                            */
/* ------------------------------------------------------------------ */

describe('le temps est une donnée (R80–R82, D20)', () => {
  it('l’échéance clôt la phase ; qui n’a pas agi n’agit pas (R81)', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    expect(b.wakes.get(code)).toBe(DEBUT + REVEAL_MS);

    await b.avancer(REVEAL_MS);

    const room = await b.manager.peek(code);
    expect(room?.game?.phase).toEqual({ kind: 'nuit', step: 'principale', acted: [] });
    const sync = lastSyncOf(b.sent, 's1');
    expect(sync.game?.phase).toBe('nuit');
    expect(sync.events).toContainEqual({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
  });

  it('tick est idempotent : un réveil en avance ou en double ne clôt rien de plus', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    const avant = await b.manager.peek(code);
    const bruit = b.sent.length;

    // En avance : rien n'est dû, rien ne s'écrit, rien ne part.
    await b.manager.tick(code);
    await b.manager.tick(code);
    expect(await b.manager.peek(code)).toEqual(avant);
    expect(b.sent.length).toBe(bruit);

    // À l'échéance, deux fois : une seule phase se clôt.
    b.horloge.now = DEBUT + REVEAL_MS;
    await Promise.all([b.manager.tick(code), b.manager.tick(code)]);
    const apres = await b.manager.peek(code);
    expect(apres?.game?.phaseSeq).toBe((avant?.game?.phaseSeq ?? 0) + 1);
    expect(apres?.game?.phase.kind).toBe('nuit');
  });

  it('une phase change sans que l’échéance d’avant ne la clôture (R80)', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    await b.avancer(REVEAL_MS - 1_000);
    await passerRevelation(b, sieges);
    const nuit = await b.manager.peek(code);
    // L'échéance de la nuit est neuve : elle part de la fin de la révélation.
    expect(nuit?.timing?.deadline).toBe(b.horloge.now + 40_000);
    await b.avancer(2_000);
    expect((await b.manager.peek(code))?.game?.phaseSeq).toBe(nuit?.game?.phaseSeq);
  });

  it('le chien de garde force une échéance oubliée par l’hôte', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    b.wakes.clear(); // l'hôte a perdu le réveil
    b.horloge.now = DEBUT + REVEAL_MS + 3_000;
    await b.manager.watchdog();
    expect((await b.manager.peek(code))?.game?.phase.kind).toBe('revelation'); // pas encore 5 s de retard
    b.horloge.now = DEBUT + REVEAL_MS + 6_000;
    await b.manager.watchdog();
    expect((await b.manager.peek(code))?.game?.phase.kind).toBe('nuit');
  });

  it('nextWake est pur, et prend le minimum de ce qui est dû', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    await b.manager.disconnect('s3');
    const room = (await b.manager.peek(code))!;
    const copie = structuredClone(room);
    const now = b.horloge.now;
    expect(nextWake(room, now)).toBe(DEBUT + REVEAL_MS);
    expect(room).toEqual(copie);
    // Sans échéance de phase, la grâce d'affichage ; sans grâce, l'abandon.
    room.timing = null;
    expect(nextWake(room, now)).toBe(now + RECONNECT_GRACE_MS);
    room.players[3]!.disconnectedUntil = null;
    room.players[3]!.absent = true;
    expect(nextWake(room, now)).toBe(now + ABANDON_MS);
    room.players[3]!.abandonAt = null;
    expect(nextWake(room, now)).toBe(room.updatedAt + IDLE_ROOM_MS);
  });
});

/* ------------------------------------------------------------------ */
/* L'erreur inattendue (D20)                                           */
/* ------------------------------------------------------------------ */

class MagasinCapricieux extends MemoryRoomStore<Room> {
  echecs = 0;
  override save(code: string, room: Room): Promise<void> {
    if (this.echecs > 0) {
      this.echecs -= 1;
      return Promise.reject(new Error('disque plein'));
    }
    return super.save(code, room);
  }
}

describe('une erreur dans tick n’abat rien (D20)', () => {
  it('nouvel essai à 5, 10, 20 s, puis la partie est interrompue — revanche possible', async () => {
    const store = new MagasinCapricieux();
    const b = banc({ store });
    const { code } = await lancer(b, 6);

    store.echecs = 4;
    b.horloge.now = DEBUT + REVEAL_MS;
    await expect(b.manager.tick(code)).resolves.toBeUndefined();
    expect(b.wakes.get(code)).toBe(DEBUT + REVEAL_MS + 5_000);
    expect((await b.manager.peek(code))?.game?.phase.kind).toBe('revelation');

    await b.avancer(5_000);
    expect(b.wakes.get(code)).toBe(b.horloge.now + 10_000);
    await b.avancer(10_000);
    expect(b.wakes.get(code)).toBe(b.horloge.now + 20_000);
    await b.avancer(20_000);

    const room = await b.manager.peek(code);
    expect(room?.status).toBe('finished');
    expect(noticesOf(b.sent, 's1').at(-1)).toMatchObject({ tone: 'error' });
    expect(lastSyncOf(b.sent, 's1').room.status).toBe('finished');
    expect(erreurs).toHaveBeenCalled();

    await b.manager.rematch('s0');
    expect((await b.manager.peek(code))?.status).toBe('lobby');
  });

  it('une erreur passagère est rattrapée au nouvel essai, sans interrompre', async () => {
    const store = new MagasinCapricieux();
    const b = banc({ store });
    const { code } = await lancer(b, 6);
    store.echecs = 1;
    await b.avancer(REVEAL_MS + 5_000);
    const room = await b.manager.peek(code);
    expect(room?.status).toBe('playing');
    expect(room?.game?.phase.kind).toBe('nuit');
  });

  it('une action en échec inattendu ne range rien et ne fige pas la table', async () => {
    const store = new MagasinCapricieux();
    const b = banc({ store });
    const { code } = await lancer(b, 6);
    store.echecs = 1;
    await expect(b.manager.action('s1', { type: 'pret' })).rejects.toThrow('disque plein');
    expect((await b.manager.peek(code))?.game?.phase).toEqual({ kind: 'revelation', ready: [] });
    await b.avancer(REVEAL_MS);
    expect((await b.manager.peek(code))?.game?.phase.kind).toBe('nuit');
  });
});

/* ------------------------------------------------------------------ */
/* La présence (D17)                                                   */
/* ------------------------------------------------------------------ */

describe('le siège appartient au joueur jusqu’à la fin (D17)', () => {
  it('coupé en partie : sa place est gardée, puis il est montré absent — jamais retiré', async () => {
    const b = banc();
    const { code } = await lancer(b, 6, { abandon: false });

    await b.manager.disconnect('s2');
    const sync = lastSyncOf(b.sent, 's1');
    const place = sync.room.players.find((player) => player.seat === 2);
    expect(place).toMatchObject({ connected: false, absent: false });
    expect(place?.disconnectedUntil).toBe(sync.serverNow + RECONNECT_GRACE_MS);

    await b.avancer(RECONNECT_GRACE_MS);
    const room = await b.manager.peek(code);
    expect(room?.players).toHaveLength(6);
    const apres = lastSyncOf(b.sent, 's1').room.players.find((player) => player.seat === 2);
    expect(apres).toMatchObject({ connected: false, absent: true, disconnectedUntil: null });
  });

  it('grâce éteinte : le jeton reprend le même siège, dix minutes après', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, { abandon: false });
    const parti = sieges[2]!;

    await b.manager.disconnect(parti.socketId);
    await b.avancer(10 * 60_000);

    const retour = await b.manager.join('s9', code, 'Peu importe le nom', parti.token);
    expect(retour.playerId).toBe(parti.playerId);
    const revenu = (await b.manager.peek(code))?.players.find((player) => player.id === parti.playerId);
    expect(revenu).toMatchObject({ seat: 2, socketId: 's9', absent: false, disconnectedUntil: null });
    expect(lastSyncOf(b.sent, 's9').game?.you?.seat).toBe(2);

    // Le jeton n'a voyagé dans aucune charge utile.
    for (const livraison of b.sent) expect(JSON.stringify(livraison.payload)).not.toContain(parti.token);
  });

  it('quitter en cours de partie : absent aussitôt, la table prévenue, le jeton toujours bon', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);

    await b.manager.leave('s2');
    const room = await b.manager.peek(code);
    expect(room?.players).toHaveLength(6);
    expect(room?.players[2]).toMatchObject({ socketId: null, absent: true });
    expect(room?.game?.players).toHaveLength(6);
    expect(noticesOf(b.sent, 's1').at(-1)?.message).toMatch(/quitte la table/);
    expect(b.manager.seated('s2')).toBe(false);

    await b.manager.join('s2-retour', code, 'Céline', sieges[2]!.token);
    expect((await b.manager.peek(code))?.players[2]?.socketId).toBe('s2-retour');
  });

  it('au salon, une coupure garde la place trente secondes, puis la libère', async () => {
    const b = banc();
    const { code, sieges } = await ouvrirTable(b, 3);

    await b.manager.disconnect('s1');
    expect((await b.manager.peek(code))?.players).toHaveLength(3);
    await b.avancer(LOBBY_GRACE_MS - 1);
    // Revenu à temps : même place, même siège.
    await b.manager.join('s1-bis', code, 'Brice', sieges[1]!.token);
    expect((await b.manager.peek(code))?.players[1]?.id).toBe(sieges[1]?.playerId);

    await b.manager.disconnect('s1-bis');
    await b.avancer(LOBBY_GRACE_MS);
    const room = await b.manager.peek(code);
    expect(room?.players).toHaveLength(2);
    expect(room?.players[1]?.seat).toBe(1); // recalé : pas de trou dans la numérotation
  });

  it('au salon, partir volontairement libère la place aussitôt', async () => {
    const b = banc();
    const { code } = await ouvrirTable(b, 3);
    await b.manager.leave('s1');
    expect((await b.manager.peek(code))?.players).toHaveLength(2);
  });

  it('une table vidée au salon est recyclée en deux minutes ; son code se libère', async () => {
    const b = banc();
    const { code } = await b.manager.create('s0', 'Alice');
    await b.manager.leave('s0');
    await b.avancer(EMPTY_LOBBY_TTL_MS - 1_000);
    expect(await b.store.has(code)).toBe(true);
    await b.avancer(1_000);
    expect(await b.store.has(code)).toBe(false);
    expect(b.wakes.has(code)).toBe(false);
    await expect(b.manager.join('s1', code, 'Brice')).rejects.toMatchObject({ code: 'gone' });
  });

  it('une partie que tout le monde a quittée n’est pas recyclée : elle attend (D19)', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    for (const siege of sieges) await b.manager.disconnect(siege.socketId);
    await b.avancer(60 * 60_000);
    expect((await b.manager.peek(code))?.status).toBe('playing');
  });

  it('une table oubliée depuis six heures est balayée, ses connexions prévenues en 4002', async () => {
    const b = banc();
    const { code } = await ouvrirTable(b, 2);
    b.wakes.clear();
    b.horloge.now += IDLE_ROOM_MS;
    await b.manager.watchdog();
    expect(await b.store.has(code)).toBe(false);
    expect(b.closed.map((fermeture) => fermeture.code)).toEqual([CLOSE_GONE, CLOSE_GONE]);
  });
});

/* ------------------------------------------------------------------ */
/* L'abandon (D18) et la pause (D19)                                   */
/* ------------------------------------------------------------------ */

describe('l’abandon (D18)', () => {
  it('un vivant absent depuis cinq minutes meurt d’abandon à la clôture suivante — pas avant', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, COURTE);
    const parti = await siegeDuRole(b, code, 'villageois');

    await b.manager.disconnect(sieges[parti]!.socketId);
    await b.avancer(ABANDON_MS - 10_000);
    expect((await b.manager.peek(code))?.game?.players[parti]?.alive).toBe(true);

    await b.avancer(5 * 60_000);
    const room = await b.manager.peek(code);
    expect(room?.game?.players[parti]?.alive).toBe(false);
    const evenements = room?.journal.entries.map((entry) => entry.event) ?? [];
    expect(morts(evenements)).toContainEqual(expect.objectContaining({ seat: parti, cause: 'abandon' }));
    // Le mort reste assis : sa place est toujours à lui.
    expect(room?.players.find((player) => player.seat === parti)).toBeDefined();
  });

  it('revenir remet l’horloge d’abandon à zéro', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, COURTE);
    const parti = await siegeDuRole(b, code, 'villageois');
    const siege = sieges[parti]!;

    await b.manager.disconnect(siege.socketId);
    await b.avancer(4 * 60_000);
    await b.manager.join('retour', code, 'x', siege.token);
    await b.manager.disconnect('retour');
    await b.avancer(4 * 60_000);
    expect((await b.manager.peek(code))?.game?.players[parti]?.alive).toBe(true);
  });
});

describe('la pause (D19)', () => {
  it('plus aucun vivant connecté : l’horloge se suspend ; au retour, l’échéance recule d’autant', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    for (const siege of sieges.slice(1)) await b.manager.disconnect(siege.socketId);
    expect((await b.manager.peek(code))?.timing?.pausedAt).toBeNull();

    b.horloge.now += 5_000;
    await b.manager.disconnect('s0');
    const enPause = await b.manager.peek(code);
    expect(enPause?.timing?.pausedAt).toBe(DEBUT + 5_000);

    await b.avancer(10 * 60_000);
    const pendant = await b.manager.peek(code);
    expect(pendant?.game?.phase.kind).toBe('revelation');
    // Personne n'est mort d'abandon : il ne court pas pendant une pause.
    expect(pendant?.game?.players.every((player) => player.alive)).toBe(true);

    await b.manager.join('s0-retour', code, 'Alice', sieges[0]!.token);
    const reprise = await b.manager.peek(code);
    expect(reprise?.timing?.pausedAt).toBeNull();
    expect(reprise?.timing?.deadline).toBe(DEBUT + REVEAL_MS + 10 * 60_000);
    const sync = lastSyncOf(b.sent, 's0-retour');
    expect(sync.room.paused).toBe(false);

    await b.avancer(REVEAL_MS - 5_000);
    expect((await b.manager.peek(code))?.game?.phase.kind).toBe('nuit');
  });

  it('la pause se voit dans la vue, et les absents ne meurent pas tant qu’elle dure', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, COURTE);
    // Un seul reste ; il voit l'horloge tourner, puis part à son tour.
    for (const siege of sieges.slice(1)) await b.manager.disconnect(siege.socketId);
    expect(lastSyncOf(b.sent, 's0').room.paused).toBe(false);
    await b.manager.leave('s0');
    await b.avancer(ABANDON_MS * 3);
    const room = await b.manager.peek(code);
    expect(room?.timing?.pausedAt).not.toBeNull();
    expect(room?.game?.players.every((player) => player.alive)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Le journal (D22)                                                    */
/* ------------------------------------------------------------------ */

describe('le journal public numéroté (D22)', () => {
  it('le joueur revenu reçoit ce qu’il a manqué, numéroté, marqué replay', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6, COURTE);
    const vu = lastSyncOf(b.sent, 's5').seq;
    expect(vu).toBe(2);

    await b.manager.disconnect('s5');
    await passerRevelation(b, sieges.slice(0, 5));
    await b.avancer(REVEAL_MS); // la révélation se clôt pour le dernier
    const room = await b.manager.peek(code);
    const dernier = room?.journal.seq ?? 0;
    expect(dernier).toBeGreaterThan(vu);

    await b.manager.join('s5-retour', code, 'Farid', sieges[5]!.token, vu);
    const sync = lastSyncOf(b.sent, 's5-retour');
    expect(sync.replay).toBe(true);
    expect(sync.seq).toBe(dernier);
    expect(sync.events).toHaveLength(dernier - vu);
    expect(eventSeqOf(sync, 0)).toBe(vu + 1);
    expect(sync.events).toEqual(room?.journal.entries.filter((entry) => entry.seq > vu).map((entry) => entry.event));
    // Les autres ne reçoivent pas de rejeu.
    expect(syncsOf(b.sent, 's1').some((payload) => payload.replay === true)).toBe(false);
  });

  it('sans lastSeq, ou déjà à jour, la reprise n’a rien à rejouer', async () => {
    const b = banc();
    const { code, sieges } = await lancer(b, 6);
    await b.manager.disconnect('s5');
    await b.manager.join('a', code, 'x', sieges[5]!.token);
    expect(lastSyncOf(b.sent, 'a')).toMatchObject({ events: [], seq: 2 });
    expect(lastSyncOf(b.sent, 'a').replay).toBeUndefined();
    await b.manager.join('b', code, 'x', sieges[5]!.token, 2);
    expect(lastSyncOf(b.sent, 'b').events).toEqual([]);
    await b.manager.join('c', code, 'x', sieges[5]!.token, 99);
    expect(lastSyncOf(b.sent, 'c').events).toEqual([]);
  });

  it('ne garde que les deux cents derniers, consécutifs, et se répare à la relecture', () => {
    const journal = emptyJournal();
    const phase: GameEvent = { type: 'aube-paisible' };
    appendJournal(journal, Array.from({ length: 250 }, () => phase));
    expect(journal.seq).toBe(250);
    expect(journal.entries).toHaveLength(JOURNAL_SIZE);
    expect(journal.entries[0]?.seq).toBe(51);
    expect(missedSince(journal, 240)).toHaveLength(10);
    expect(missedSince(journal, 250)).toEqual([]);
    expect(missedSince(journal, 9_999)).toEqual([]);
    // Un trou de numérotation ne se rejoue pas : on garde le numéro, pas les entrées.
    expect(readJournal({ seq: 5, entries: [{ seq: 1, event: phase }] })).toEqual({ seq: 5, entries: [] });
    expect(readJournal('n’importe quoi')).toEqual({ seq: 0, entries: [] });
  });
});

/* ------------------------------------------------------------------ */
/* La fin et la revanche                                               */
/* ------------------------------------------------------------------ */

describe('la fin et la revanche', () => {
  async function jouerJusquAuVillage(b: Banc): Promise<{ code: string; sieges: Awaited<ReturnType<typeof ouvrirTable>>['sieges'] }> {
    const { code, sieges } = await lancer(b, 6, COURTE);
    const loup = await siegeDuRole(b, code, 'loup');
    const proie = await siegeDuRole(b, code, 'villageois');
    await passerRevelation(b, sieges);
    await b.manager.action(sieges[loup]!.socketId, { type: 'devorer', target: proie });

    const roomJour = await b.manager.peek(code);
    const vivants = roomJour?.game?.players.filter((player) => player.alive) ?? [];
    const autre = vivants.find((player) => player.seat !== loup)?.seat ?? null;
    for (const vivant of vivants) {
      const socketId = sieges[vivant.seat]!.socketId;
      await b.manager.action(socketId, { type: 'voter', target: vivant.seat === loup ? autre : loup });
    }
    return { code, sieges };
  }

  it('la victoire clôt la table ; la revanche rouvre le salon', async () => {
    const b = banc();
    const { code } = await jouerJusquAuVillage(b);

    const room = await b.manager.peek(code);
    expect(room?.status).toBe('finished');
    expect(room?.timing).toBeNull();

    const sync = lastSyncOf(b.sent, 's0');
    expect(sync.game?.over).toBe(true);
    expect(sync.game?.winner).toBe('village');
    expect(sync.game?.log).not.toBeNull();
    expect(sync.events).toContainEqual({ type: 'fin', winner: 'village' });

    await expect(b.manager.rematch('s1')).rejects.toThrow('Seul l’hôte');
    await b.manager.rematch('s0');

    const apres = await b.manager.peek(code);
    expect(apres?.status).toBe('lobby');
    expect(apres?.game).toBeNull();

    await b.manager.setOptions('s0', { tempsJour: 120 });
    const nouveau = await b.manager.join('s9', code, 'Gwenaël', undefined);
    expect(nouveau.token).toBeTruthy();
  });

  it('la revanche garde les joueurs en grâce et laisse partir les absents', async () => {
    const b = banc();
    const { code, sieges } = await jouerJusquAuVillage(b);
    expect((await b.manager.peek(code))?.status).toBe('finished');
    const seq = (await b.manager.peek(code))?.journal.seq ?? 0;

    // Céline coupe, et sa grâce s'éteint : elle est montrée absente.
    await b.manager.disconnect(sieges[2]!.socketId);
    await b.avancer(RECONNECT_GRACE_MS);
    // Dora vient de couper : elle est encore en grâce.
    await b.manager.disconnect(sieges[3]!.socketId);

    await b.manager.rematch('s0');
    const salon = await b.manager.peek(code);
    const ids = salon?.players.map((player) => player.id);
    expect(ids).toContain(sieges[3]!.playerId);
    expect(ids).not.toContain(sieges[2]!.playerId);
    expect(salon?.players.map((player) => player.seat)).toEqual([0, 1, 2, 3, 4]);
    // Le numéro du journal ne redescend jamais ; la partie d'avant ne se rejoue plus.
    expect(salon?.journal.seq).toBe(seq);
    expect(salon?.journal.entries).toEqual([]);

    // Dora revient avec son jeton : sa place l'attendait.
    await b.manager.join('dora', code, 'Dora', sieges[3]!.token);
    expect((await b.manager.peek(code))?.players.find((p) => p.id === sieges[3]!.playerId)?.socketId).toBe('dora');
    // Céline, absente, a perdu son jeton avec la revanche : elle rentre comme tout le monde.
    const celine = await b.manager.join('celine', code, 'Céline', sieges[2]!.token);
    expect(celine.playerId).not.toBe(sieges[2]!.playerId);
  });
});

/* ------------------------------------------------------------------ */
/* La forme rangée (D21)                                               */
/* ------------------------------------------------------------------ */

describe('la table rangée se relit (D21)', () => {
  it('upgradeRoom remet une table d’avant schema à la forme courante', async () => {
    const b = banc();
    const { code } = await lancer(b, 6);
    const room = (await b.manager.peek(code))!;
    const ancienne = structuredClone(room) as Partial<Room> & Record<string, unknown>;
    delete ancienne.schema;
    delete ancienne.journal;
    delete ancienne.emptySince;
    for (const player of ancienne.players ?? []) {
      delete (player as Partial<typeof player>).absent;
      delete (player as Partial<typeof player>).abandonAt;
    }
    const relue = upgradeRoom(ancienne, 5);
    expect(relue.schema).toBe(1);
    expect(relue.journal).toEqual({ seq: 0, entries: [] });
    expect(relue.players[0]).toMatchObject({ absent: false, abandonAt: null });
    expect(relue.game).toEqual(room.game);
  });

  it('upgradeRoom refuse l’illisible', () => {
    expect(() => upgradeRoom(null)).toThrow();
    expect(() => upgradeRoom({ code: 'ABCD' })).toThrow();
    expect(() => upgradeRoom({ schema: 99, code: 'ABCD', status: 'lobby', hostId: '', players: [] })).toThrow();
    expect(() =>
      upgradeRoom({ code: 'ABCD', status: 'lobby', hostId: '', players: [{ id: 1 }] }),
    ).toThrow();
  });

  it('une table illisible dans le magasin est laissée de côté, sans faire tomber les autres', async () => {
    const store = new MemoryRoomStore<Room>();
    await store.save('GGGG', { pas: 'une table' } as unknown as Room);
    const b = banc({ store });
    const { code } = await ouvrirTable(b, 2);
    await b.manager.restore();
    await b.manager.watchdog();
    await expect(b.manager.join('x', 'GGGG', 'Zoé')).rejects.toMatchObject({ code: 'gone' });
    expect((await b.manager.stats()).tables.lobby).toBe(1);
    expect(await b.manager.peek(code)).toBeDefined();
  });

  it('stats compte les tables par état, et les connexions assises', async () => {
    const b = banc();
    await lancer(b, 6);
    const autre = await b.manager.create('t0', 'Zoé');
    await b.manager.join('t1', autre.code, 'Yann');
    await b.manager.disconnect('t1');
    expect(await b.manager.stats()).toEqual({ tables: { lobby: 1, playing: 1, finished: 0 }, sockets: 7 });
  });
});

/* ------------------------------------------------------------------ */
/* Le constructeur                                                     */
/* ------------------------------------------------------------------ */

describe('le gestionnaire', () => {
  it('se construit sans annuaire : il en prend un en mémoire', () => {
    const manager = new RoomManager(
      { toSocket: () => undefined, close: () => undefined },
      new MemoryRoomStore<Room>(),
      { now: () => 0, uuid: () => 'x', randomInt: () => 0, wake: () => undefined },
    );
    expect(manager.seated('rien')).toBe(false);
  });
});
