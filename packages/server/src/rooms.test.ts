/**
 * Le cœur des tables, éprouvé sans réseau ni horloge réelle.
 *
 * L'émetteur n'est qu'un carnet : tout ce qui part y est consigné, siège par
 * siège. Les services d'hôte sont remplacés par des compteurs et un
 * générateur déterministe ; les minuteries, par l'horloge simulée de Vitest —
 * ou, quand il s'agit de tirer une minuterie périmée, par des rappels gardés
 * en main. Ce qu'on éprouve ici, le Worker le reprendra tel quel.
 *
 * Les règles citées sont celles de `docs/RULES.md`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RECONNECT_GRACE_MS,
  REVEAL_MS,
  type NoticePayload,
  type SyncPayload,
} from '@garoutom/engine';

import { RoomManager, type Emitter, type HostServices, type Room } from './rooms.js';
import { MemoryRoomStore } from './store.js';

/* ------------------------------------------------------------------ */
/* Le banc d'essai                                                     */
/* ------------------------------------------------------------------ */

interface Livraison {
  socketId: string;
  event: 'sync' | 'notice';
  payload: unknown;
}

interface Harness {
  manager: RoomManager;
  sent: Livraison[];
  /** Les rappels de minuteries, quand elles sont congelées. */
  fired: Array<() => void>;
}

/**
 * Un hôte de laboratoire : horloge simulée, identifiants comptés, aléa
 * déterministe. `script` force les prochains tirages (pour les collisions de
 * codes) ; `freeze` retient les minuteries au lieu de les armer, pour les
 * tirer à la main.
 */
function harness(script: number[] = [], freeze = false): Harness {
  const sent: Livraison[] = [];
  const fired: Array<() => void> = [];
  let counter = 0;
  let draw = 0;
  let state = 1;

  const emitter: Emitter = {
    toSocket: (socketId, event, payload) => {
      sent.push({ socketId, event, payload });
    },
  };
  const host: HostServices = {
    now: () => Date.now(),
    uuid: () => {
      counter += 1;
      return `id-${String(counter)}`;
    },
    randomInt: (maxExclusive) => {
      const forced = script[draw];
      draw += 1;
      if (forced !== undefined) return forced % maxExclusive;
      // Un petit générateur déterministe : les codes varient, les tests se relisent à l'identique.
      state = Math.imul(state, 1_103_515_245) + 12_345 >>> 0;
      return Math.floor((state / 4294967296) * maxExclusive);
    },
    set: freeze
      ? (run) => {
          fired.push(run);
          return fired.length;
        }
      : (run, delay) => setTimeout(run, delay),
    clear: freeze ? () => undefined : (handle) => clearTimeout(handle as NodeJS.Timeout),
  };

  const manager = new RoomManager(emitter, new MemoryRoomStore<Room>(), host);
  return { manager, sent, fired };
}

/** Laisse les chaînes de promesses des minuteries tirées à la main s'épuiser. */
async function drain(): Promise<void> {
  for (let i = 0; i < 64; i += 1) await Promise.resolve();
}

function syncsOf(sent: Livraison[], socketId: string): SyncPayload[] {
  return sent
    .filter((livraison) => livraison.socketId === socketId && livraison.event === 'sync')
    .map((livraison) => livraison.payload as SyncPayload);
}

function lastSyncOf(sent: Livraison[], socketId: string): SyncPayload {
  const last = syncsOf(sent, socketId).at(-1);
  if (!last) throw new Error(`aucun sync reçu par ${socketId}`);
  return last;
}

function noticesOf(sent: Livraison[]): NoticePayload[] {
  return sent
    .filter((livraison) => livraison.event === 'notice')
    .map((livraison) => livraison.payload as NoticePayload);
}

interface Siege {
  socketId: string;
  playerId: string;
  token: string;
  seat: number;
}

const NOMS = [
  'Alice',
  'Brice',
  'Céline',
  'Dora',
  'Émile',
  'Farid',
  'Gwen',
  'Hakim',
  'Iris',
  'Jules',
  'Karim',
  'Lila',
  'Mona',
  'Nils',
  'Olga',
  'Pablo',
  'Quentin',
  'Rosa',
];

/** Ouvre une table et la remplit de `n` joueurs, dans l'ordre d'arrivée. */
async function ouvrirTable(
  h: Harness,
  n: number,
  options?: unknown,
): Promise<{ code: string; sieges: Siege[] }> {
  const sieges: Siege[] = [];
  const premiere = await h.manager.create('s0', NOMS[0], options);
  sieges.push({ socketId: 's0', playerId: premiere.playerId, token: premiere.token, seat: 0 });
  for (let i = 1; i < n; i += 1) {
    const socketId = `s${String(i)}`;
    const result = await h.manager.join(socketId, premiere.code, NOMS[i], undefined);
    sieges.push({ socketId, playerId: result.playerId, token: result.token, seat: i });
  }
  return { code: premiere.code, sieges };
}

/** Le siège moteur d'un rôle donné, dans la partie en cours. */
async function siegeDuRole(h: Harness, code: string, role: string): Promise<number> {
  const room = await h.manager.peek(code);
  const trouve = room?.game?.players.find((player) => player.role === role);
  if (trouve === undefined) throw new Error(`aucun ${role} dans cette partie`);
  return trouve.seat;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* La table, son code, ses jetons                                      */
/* ------------------------------------------------------------------ */

describe('la table, son code, ses jetons', () => {
  it('crée une table : quatre lettres sans ambiguïté, un jeton pour revenir', async () => {
    const h = harness();
    const result = await h.manager.create('s0', 'Alice', undefined);

    expect(result.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(result.token).toBeTruthy();

    const room = await h.manager.peek(result.code);
    expect(room?.hostId).toBe(result.playerId);
    expect(room?.players[0]?.seat).toBe(0);

    const sync = lastSyncOf(h.sent, 's0');
    expect(sync.room.code).toBe(result.code);
    expect(sync.room.status).toBe('lobby');
    expect(sync.room.players[0]?.name).toBe('Alice');
    expect(sync.room.players[0]?.isHost).toBe(true);
    expect(sync.game).toBeNull();
  });

  it('range les sièges dans l’ordre d’arrivée ; l’hôte est le premier venu', async () => {
    const h = harness();
    const { code, sieges } = await ouvrirTable(h, 3);

    expect(sieges.map((siege) => siege.seat)).toEqual([0, 1, 2]);
    const room = await h.manager.peek(code);
    expect(room?.hostId).toBe(sieges[0]?.playerId);
  });

  it('ne tire jamais deux fois le même code parmi les tables vivantes', async () => {
    // Les tirages sont forcés : la première table prend AAAA, la seconde doit se distinguer.
    const h = harness([0, 0, 0, 0, 0, 0, 0, 1]);
    const premiere = await h.manager.create('s0', 'Alice', undefined);
    const seconde = await h.manager.create('s1', 'Brice', undefined);

    expect(seconde.code).not.toBe(premiere.code);
    expect(seconde.code).toBe('AAAB');
  });

  it('refuse un code inconnu', async () => {
    const h = harness();
    await expect(h.manager.join('s0', 'ZZZZ', 'Alice', undefined)).rejects.toThrow(
      'Aucune table avec ce code',
    );
  });

  it('refuse la table complète au-delà de dix-huit joueurs', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 18);
    await expect(h.manager.join('s18', code, 'Supplément', undefined)).rejects.toThrow(
      'La table est complète',
    );
  });

  it('exige un pseudo, et le borne à seize signes', async () => {
    const h = harness();
    await expect(h.manager.create('s0', '   ', undefined)).rejects.toThrow('Il faut un pseudo');

    const result = await h.manager.create('s0', 'Alexandrine-Victoire', undefined);
    const room = await h.manager.peek(result.code);
    expect(room?.players[0]?.name).toHaveLength(16);
  });
});

/* ------------------------------------------------------------------ */
/* Les options                                                         */
/* ------------------------------------------------------------------ */

describe('les options de la table', () => {
  it('passe tout par sanitizeOptions : rien d’illisible ne traverse', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 2);
    await h.manager.setOptions('s0', {
      tempsNuit: 999,
      auto: 'peut-être',
      roles: ['voyante', 'martien', 3],
    });

    const room = await h.manager.peek(code);
    expect(room?.options.tempsNuit).toBe(40); // hors borne : le défaut, pas la borne (R10)
    expect(room?.options.auto).toBe(true);
    expect(room?.options.roles).toEqual(['voyante']);
  });

  it('réserve les options à l’hôte, et au salon', async () => {
    const h = harness();
    await ouvrirTable(h, 6);
    await expect(h.manager.setOptions('s1', { chat: false })).rejects.toThrow(
      'Seul l’hôte peut faire cela',
    );

    await h.manager.start('s0');
    await expect(h.manager.setOptions('s0', { chat: false })).rejects.toThrow(
      'La partie a déjà commencé',
    );
  });
});

/* ------------------------------------------------------------------ */
/* Le lancement                                                        */
/* ------------------------------------------------------------------ */

describe('le lancement de la partie', () => {
  it('refuse en dessous de six joueurs', async () => {
    const h = harness();
    await ouvrirTable(h, 5);
    await expect(h.manager.start('s0')).rejects.toThrow(/entre 6 et 18 joueurs/);
  });

  it('refuse une composition injouable avec l’erreur lisible du moteur', async () => {
    const h = harness();
    await ouvrirTable(h, 6, { auto: false, loups: 4, roles: [] });
    const refus = h.manager.start('s0');

    await expect(refus).rejects.toThrow('Trop de loups pour cette table');
    await expect(refus).rejects.toMatchObject({ code: 'composition' });
  });

  it('distribue les cartes à six joueurs et raconte le début à chacun', async () => {
    const h = harness();
    const { code, sieges } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    const room = await h.manager.peek(code);
    expect(room?.status).toBe('playing');
    expect(room?.game?.players).toHaveLength(6);

    for (const siege of sieges) {
      const sync = lastSyncOf(h.sent, siege.socketId);
      expect(sync.game?.you?.seat).toBe(siege.seat);
      expect(sync.game?.phase).toBe('revelation');
      expect(sync.events).toContainEqual({ type: 'debut' });
      expect(sync.game?.options).toEqual(room?.options);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Les actions                                                         */
/* ------------------------------------------------------------------ */

describe('les actions du jeu', () => {
  it('applique une action légale ; le siège vient de la session, jamais de la charge utile', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    await h.manager.action('s1', { type: 'pret' });

    const room = await h.manager.peek(code);
    expect(room?.game?.phase).toEqual({ kind: 'revelation', ready: [1] });

    const sync = lastSyncOf(h.sent, 's1');
    expect(sync.game?.acted).toBe(true);
    expect(sync.events).toEqual([]);
  });

  it('refuse une action illégale : le message et le code du moteur reviennent', async () => {
    const h = harness();
    await ouvrirTable(h, 6);
    await h.manager.start('s0');

    const refus = h.manager.action('s0', { type: 'voter', target: 1 });
    await expect(refus).rejects.toThrow('Ce n’est pas le moment de voter');
    await expect(refus).rejects.toMatchObject({ code: 'wrong-phase' });
  });

  it('refuse un verbe qui n’est pas dans le vocabulaire du moteur', async () => {
    const h = harness();
    await ouvrirTable(h, 6);
    await h.manager.start('s0');

    await expect(h.manager.action('s0', { type: 'regarder' })).rejects.toThrow('Action inconnue');
    await expect(h.manager.action('s0', 'pas une action')).rejects.toThrow('Action illisible');
  });
});

/* ------------------------------------------------------------------ */
/* Le silence                                                          */
/* ------------------------------------------------------------------ */

describe('le silence est la loi (R87–R88)', () => {
  it('le villageois ne voit pas la meute ; le loup, si', async () => {
    const h = harness();
    const { code, sieges } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    const loup = await siegeDuRole(h, code, 'loup');
    const villageois = await siegeDuRole(h, code, 'villageois');
    const syncLoup = lastSyncOf(h.sent, sieges[loup]?.socketId ?? '');
    const syncVillageois = lastSyncOf(h.sent, sieges[villageois]?.socketId ?? '');

    expect(syncVillageois.game?.pack).toBeNull();
    expect(syncVillageois.game?.players[loup]?.role).toBeNull();
    // R88 : le villageois ne connaît que sa propre carte.
    expect(syncVillageois.game?.players.filter((player) => player.role !== null)).toHaveLength(1);

    expect(syncLoup.game?.pack?.seats).toContain(loup);
    expect(syncLoup.game?.players[loup]?.role).toBe('loup');
  });

  it('l’échéance n’appartient qu’au siège qui doit agir (R80)', async () => {
    const h = harness();
    const { code, sieges } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    // Révélation : tout le monde doit confirmer, tout le monde a une échéance.
    const sync = lastSyncOf(h.sent, 's1');
    expect(sync.room.deadline).toBe(sync.serverNow + REVEAL_MS);
    expect(sync.room.deadlineDurationMs).toBe(REVEAL_MS);

    // Celui qui a confirmé n’a plus rien à jouer : plus d’échéance pour lui.
    await h.manager.action('s1', { type: 'pret' });
    expect(lastSyncOf(h.sent, 's1').room.deadline).toBeNull();
    expect(lastSyncOf(h.sent, 's2').room.deadline).not.toBeNull();

    // La nuit tombe : le villageois dort sans compte à rebours, le loup a le sien.
    for (const siege of sieges) {
      if (siege.socketId !== 's1') await h.manager.action(siege.socketId, { type: 'pret' });
    }
    const loup = await siegeDuRole(h, code, 'loup');
    const villageois = await siegeDuRole(h, code, 'villageois');
    const syncLoup = lastSyncOf(h.sent, sieges[loup]?.socketId ?? '');
    const syncVillageois = lastSyncOf(h.sent, sieges[villageois]?.socketId ?? '');

    expect(syncVillageois.game?.phase).toBe('nuit');
    expect(syncVillageois.room.deadline).toBeNull();
    expect(syncLoup.room.deadline).toBe(syncLoup.serverNow + 40_000);
    expect(syncLoup.room.deadlineDurationMs).toBe(40_000);
  });
});

/* ------------------------------------------------------------------ */
/* Le temps                                                            */
/* ------------------------------------------------------------------ */

describe('le temps (R80–R82)', () => {
  it('la minuterie clôt la phase à l’échéance ; qui n’a pas agi n’agit pas (R81)', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    await vi.advanceTimersByTimeAsync(REVEAL_MS);

    const room = await h.manager.peek(code);
    expect(room?.game?.phase).toEqual({ kind: 'nuit', step: 'principale', acted: [] });

    const sync = lastSyncOf(h.sent, 's1');
    expect(sync.game?.phase).toBe('nuit');
    expect(sync.events).toContainEqual({ type: 'phase', phase: 'nuit', step: 'principale', day: 1 });
  });

  it('une minuterie périmée ne clôt rien (R80)', async () => {
    // Minuteries congelées : on garde les rappels en main pour tirer la mauvaise.
    const h = harness([], true);
    const { code, sieges } = await ouvrirTable(h, 6);
    await h.manager.start('s0');
    expect(h.fired).toHaveLength(1); // la révélation a armé sa minuterie

    for (const siege of sieges) await h.manager.action(siege.socketId, { type: 'pret' });
    expect(h.fired).toHaveLength(2); // la nuit a armé la sienne — pas une de plus par action

    const avant = await h.manager.peek(code);
    const bruitAvant = h.sent.length;

    // La minuterie de la révélation arrive en retard : le moteur la rejette.
    h.fired[0]?.();
    await drain();

    const apresStale = await h.manager.peek(code);
    expect(apresStale?.game?.phase).toEqual(avant?.game?.phase);
    expect(apresStale?.game?.phaseSeq).toBe(avant?.game?.phaseSeq);
    expect(h.sent.length).toBe(bruitAvant); // rien à raconter

    // Celle de la nuit, elle, clôt la phase.
    h.fired[1]?.();
    await drain();

    const apres = await h.manager.peek(code);
    expect(apres?.game?.phase).toEqual({ kind: 'nuit', step: 'sorciere', acted: [] });
  });
});

/* ------------------------------------------------------------------ */
/* La grâce de reconnexion                                             */
/* ------------------------------------------------------------------ */

describe('la grâce de reconnexion', () => {
  it('un joueur coupé garde sa place soixante secondes, puis la libère', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    await h.manager.disconnect('s2');

    // Sa place est gardée, visible comme vacante.
    const sync = lastSyncOf(h.sent, 's1');
    const place = sync.room.players.find((player) => player.seat === 2);
    expect(place?.connected).toBe(false);
    expect(place?.disconnectedUntil).toBe(sync.serverNow + RECONNECT_GRACE_MS);

    // Puis le silence du délai libère la place — le siège moteur, lui, reste.
    await vi.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);

    const room = await h.manager.peek(code);
    expect(room?.players).toHaveLength(5);
    expect(room?.game?.players).toHaveLength(6);

    // Un avis pour toute la table : il part une fois à chaque connexion vivante.
    const avis = noticesOf(h.sent);
    expect(avis.length).toBeGreaterThan(0);
    for (const unAvis of avis) {
      expect(unAvis.message).toMatch(/n’est pas revenu/);
      expect(unAvis.tone).toBe('info');
    }
  });

  it('le jeton reprend la place avant la fin du délai — et ne sort jamais', async () => {
    const h = harness();
    const { code, sieges } = await ouvrirTable(h, 6);
    await h.manager.start('s0');
    const parti = sieges[2];
    if (!parti) throw new Error('siège manquant');

    await h.manager.disconnect(parti.socketId);
    await vi.advanceTimersByTimeAsync(30_000);

    const retour = await h.manager.join('s9', code, 'Peu importe le nom', parti.token);
    expect(retour.playerId).toBe(parti.playerId);

    const room = await h.manager.peek(code);
    const revenu = room?.players.find((player) => player.id === parti.playerId);
    expect(revenu?.seat).toBe(2);
    expect(revenu?.disconnectedUntil).toBeNull();

    // La place ne se libère plus : la minuterie de grâce est éteinte.
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await h.manager.peek(code))?.players).toHaveLength(6);

    // Le jeton n’a voyagé dans aucune charge utile.
    for (const livraison of h.sent) {
      expect(JSON.stringify(livraison.payload)).not.toContain(parti.token);
    }
  });

  it('au salon, une coupure libère la place aussitôt', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 3);

    await h.manager.disconnect('s1');
    const room = await h.manager.peek(code);
    expect(room?.players).toHaveLength(2);
    expect(room?.players[1]?.seat).toBe(1); // recalé : pas de trou dans la numérotation
  });

  it('quitter en cours de partie : le joueur part, le siège moteur reste', async () => {
    const h = harness();
    const { code } = await ouvrirTable(h, 6);
    await h.manager.start('s0');

    await h.manager.leave('s2');

    const room = await h.manager.peek(code);
    expect(room?.players).toHaveLength(5);
    expect(room?.game?.players).toHaveLength(6);

    const avis = noticesOf(h.sent);
    expect(avis.at(-1)?.message).toMatch(/quitte la table/);
  });
});

/* ------------------------------------------------------------------ */
/* La fin et la revanche                                               */
/* ------------------------------------------------------------------ */

describe('la fin et la revanche', () => {
  it('la victoire clôt la table ; la revanche rouvre le salon', async () => {
    const h = harness();
    // Un seul loup, ni capitaine ni rôles : une partie courte, pour l’essai.
    const { code, sieges } = await ouvrirTable(h, 6, {
      auto: false,
      loups: 1,
      roles: [],
      capitaine: false,
    });
    await h.manager.start('s0');

    const loup = await siegeDuRole(h, code, 'loup');
    const proie = await siegeDuRole(h, code, 'villageois');
    const socketDuLoup = sieges[loup]?.socketId;
    if (!socketDuLoup) throw new Error('siège manquant');

    // Chacun découvre sa carte, puis la nuit tombe.
    for (const siege of sieges) await h.manager.action(siege.socketId, { type: 'pret' });

    // La nuit : le loup dévore.
    await h.manager.action(socketDuLoup, { type: 'devorer', target: proie });

    // Le jour : le village vote, et condamne le loup — qui ne peut voter
    // contre lui-même, et désigne donc un autre vivant.
    const roomJour = await h.manager.peek(code);
    const vivants = roomJour?.game?.players.filter((player) => player.alive) ?? [];
    const boucEmissaire = vivants.find((player) => player.seat !== loup)?.seat;
    for (const vivant of vivants) {
      const socketId = sieges[vivant.seat]?.socketId;
      if (!socketId) continue;
      const cible = vivant.seat === loup ? boucEmissaire : loup;
      await h.manager.action(socketId, { type: 'voter', target: cible ?? null });
    }

    const room = await h.manager.peek(code);
    expect(room?.status).toBe('finished');

    const sync = lastSyncOf(h.sent, 's0');
    expect(sync.game?.over).toBe(true);
    expect(sync.game?.winner).toBe('village');
    // R88 : le récit complet n’apparaît qu’une fois la partie finie.
    expect(sync.game?.log).not.toBeNull();
    expect(sync.events).toContainEqual({ type: 'fin', winner: 'village' });

    // La revanche est à l’hôte, et elle rouvre tout : le salon, les options, la porte.
    await expect(h.manager.rematch('s1')).rejects.toThrow('Seul l’hôte');
    await h.manager.rematch('s0');

    const apres = await h.manager.peek(code);
    expect(apres?.status).toBe('lobby');
    expect(apres?.game).toBeNull();

    await h.manager.setOptions('s0', { tempsJour: 120 });
    const nouveau = await h.manager.join('s9', code, 'Gwenaël', undefined);
    expect(nouveau.token).toBeTruthy();
  });
});
