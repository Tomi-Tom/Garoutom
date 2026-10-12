# Contrat des lots A–D du chantier robustesse

Écrit le 11 octobre 2026 par le chef d'orchestre, après le lot 0. Complète
`docs/ROBUSTESSE.md` (décisions D17–D24) : ici, seulement les **signatures
exactes** que les lots codent en parallèle. Une signature de ce fichier ne
change pas sans passer par le chef.

## 1. Ce que le moteur exporte depuis le lot 0 (`@garoutom/engine`)

```ts
// types.ts
type DeathCause = 'loups'|'poison'|'vote'|'chasseur'|'chagrin'|'abandon';
const DEATH_CAUSES;  GameOptions { …; abandon: boolean }   // défaut true
GameState { …; rng: number }                                  // secret, jamais dans viewFor
Phase nuit { kind:'nuit'; step; acted; ghostMs?: number }
IllegalActionError(message, code)                             // codes 'action' | 'seat' | 'name' | 'stale' | 'over' | …

// rng.ts
createSeededRng(seed): SeededRng; resumeSeededRng(state); rngDraw(state, max); isRngState(v)

// game.ts
createGame({ players, options }, seed: number | Rng): Step     // le serveur passe un NOMBRE
applyAction(state, action, seat): Step                          // (ancienne signature avec rng : dépréciée)
timeoutPhase(state, armedSeq, closure?: { abandons?: readonly number[] }): Step
phaseBudgetMs(state): number                                    // pur, relisible à volonté
MAX_CHAT_PER_CHANNEL = 100; MAX_CHAT_MESSAGES = 400; MAX_MESSAGE_LENGTH = 280

// input.ts
parseAction(raw: unknown, seats = MAX_PLAYERS): Action          // IllegalActionError 'action'
cleanText(raw: string, max: number): string; cleanName(raw: unknown): string  // 'name'
MAX_NAME_LENGTH = 16; MAX_RAW_TEXT_LENGTH = 2000; CHAT_CHANNELS

// protocol.ts
PROTOCOL_VERSION = 2; PROTOCOL_MIN = 1; PROTOCOL_PARAM = 'v'
negotiateProtocol(param): number | null       // absent → 1 ; hors plage → null → fermer en CLOSE_VERSION
CAPABILITIES = ['ping','replay','pause','abandon']
HEARTBEAT_MS = 20_000; PONG_TIMEOUT_MS = 10_000; OPEN_TIMEOUT_MS = 6_000
SERVER_PING_MS = 25_000; SILENT_SOCKET_MS = 70_000
CLOSE_SERVER_RESTART = 1012; CLOSE_POLICY = 1008; CLOSE_TOO_BIG = 1009
CLOSE_VERSION = 4000; CLOSE_REPLACED = 4001; CLOSE_GONE = 4002
RECONNECT_GRACE_MS = 60_000; LOBBY_GRACE_MS = 30_000; ABANDON_MS = 300_000
ROOM_ERROR_CODES = ['gone','started','full','version','rate','action','name','host',
  'lobby','playing','finished','players','composition','session','internal']
PlayerInfo { …; absent: boolean }      RoomView { …; paused: boolean }
SyncPayload { room; game; events: GameEvent[]; seq: number; replay?: boolean; serverNow }
eventSeqOf(payload, index) = seq - events.length + 1 + index
'room:join' payload { code; name; token?; lastSeq?: number }

// transport.ts
PingFrame { t:'ping'; id }  (client → serveur)
HelloFrame { t:'hello'; protocol; capabilities; heartbeatMs }   PongFrame { t:'pong'; id; now }
ClientFrame = RequestFrame | PingFrame ;  ServerFrame = AckFrame | EventFrame | HelloFrame | PongFrame
inspectServerFrame(raw): {kind:'frame',frame} | {kind:'unknown'} | {kind:'too-big'} | {kind:'malformed'}
```

Appels du serveur : création `createGame(setup, host.randomInt(2**32))` (plus de
`Rng` ni de `rngFor`) ; action `applyAction(game, parseAction(raw, n), seat)` ;
pseudo `cleanName` ; minuterie `phaseBudgetMs(game)` rangée dans `RoomTiming` ;
clôture `timeoutPhase(game, timing.seq, { abandons })` (`stale`/`over` → rien) ;
reprise : l'état JSON suffit.

## 2. Le cœur serveur (lot A) — interfaces que B et C consomment

Fichiers du lot A : `packages/server/src/{rooms,hub,store,lib}.ts` (+ nouveaux
modules internes). `lib.ts` exporte tout ce qui suit.

```ts
// rooms.ts
export interface HostServices {
  now(): number;
  uuid(): string;
  /** Entier uniforme dans [0, maxExclusive[ — codes de table, graines. */
  randomInt(maxExclusive: number): number;
  /**
   * Demande à l'hôte d'appeler `manager.tick(code)` à l'instant `at` (ms,
   * horloge de `now()`), ou d'oublier le réveil si `at` vaut null. Le dernier
   * appel pour un code remplace le précédent. L'hôte peut réveiller en
   * retard ou deux fois : `tick` est idempotent.
   */
  wake(code: string, at: number | null): void;
}

/** Les sessions de connexion : où vit le lien socket → (table, joueur). */
export interface SessionDirectory {
  get(socketId: string): { code: string; playerId: string } | undefined;
  set(socketId: string, session: { code: string; playerId: string }): void;
  delete(socketId: string): void;
  /** La socket est-elle encore ouverte sur cette instance ? (réconciliation) */
  isLive(socketId: string): boolean;
}
export class MemorySessionDirectory implements SessionDirectory { … }   // pour Node et les tests

/** L'émetteur : parler à une connexion, ou la fermer. */
export interface Emitter {
  toSocket(socketId: string, event: 'sync' | 'notice', payload: unknown): void;
  close(socketId: string, code: number, reason: string): void;
}

export interface Room { schema: 1; …; timing: RoomTiming | null; emptySince: number | null;
                        updatedAt: number; journal: …; /* aucun Rng, aucune minuterie */ }
export function upgradeRoom(raw: unknown): Room;   // lève si illisible
export function nextWake(room: Room, now: number): number | null;  // pur

export class RoomManager {
  constructor(emitter: Emitter, store: RoomStore<Room>, host: HostServices,
              sessions?: SessionDirectory /* défaut : MemorySessionDirectory */);
  create(socketId, name, options?): Promise<JoinResult>;
  join(socketId, code, name, token?, lastSeq?): Promise<JoinResult>;   // idempotent
  setOptions / start / rematch / leave / action(socketId, raw)
  disconnect(socketId): Promise<void>;
  /** Fait tout ce qui est dû pour cette table (clôture de phase, grâces, abandons, recyclage). Idempotent, ne lève jamais. */
  tick(code: string): Promise<void>;
  /** Chien de garde : force les tables `playing` dont l'échéance est dépassée de plus de 5 s. */
  watchdog(): Promise<void>;
  /** Recharge toutes les tables du magasin (démarrage Node), les réconcilie et réarme leurs réveils. */
  restore(): Promise<void>;
  /** Pour /health. */
  stats(): Promise<{ tables: Record<RoomStatus, number>; sockets: number }>;
}

// store.ts
export interface RoomStore<T> {
  has(code): Promise<boolean>; load(code): Promise<T | null>; save(code, room): Promise<void>;
  remove(code): Promise<void>; count(): Promise<number>;
  /** Tous les codes rangés — pour `restore()` et le balayage. */
  codes(): Promise<string[]>;
}
export class MemoryRoomStore<T> implements RoomStore<T>;
/** Suite de contrat réutilisable par chaque magasin (Node fichier, Worker SQL). */
export function contratMagasin(nom: string, fabrique: () => Promise<RoomStore<unknown>>): void;  // dans store.contract.ts (vitest describe/it)

// hub.ts
export interface HubSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  /** Adresse du client (quotas), si l'hôte la connaît. */
  ip?: string;
  /** Version de protocole négociée par l'hôte (`negotiateProtocol`). */
  protocol?: number;
}
export class Hub implements Emitter {
  constructor(uuid: () => string, options?: { now?: () => number; quotas?: Partial<Quotas> });
  serve(manager: RoomManager): void;
  /** Attache une connexion ; envoie aussitôt le cadre `hello`. `id` imposé possible (Worker : l'étiquette de la socket). */
  attach(socket: HubSocket, id?: string): HubSession;
  /** Retrouve une session par identifiant (Worker après hibernation). */
  session(id: string): HubSession | undefined;
}
export interface HubSession { id: string; receive(raw: unknown): Promise<void>; close(): Promise<void>; }
// Le Hub répond lui-même aux `ping` par `pong` (sans passer par le gestionnaire),
// applique les quotas de D23 (10 cadres/s rafale 30, `dire` 1/s rafale 5,
// `room:create` 3/min/IP, 10 `join` ratés/min/IP, socket non assise fermée à
// 30 s via `close(CLOSE_POLICY)`), et ne renvoie jamais un message d'erreur
// interne brut (code 'internal').
```

## 3. Le Worker (lot B) et l'hôte Node (lot C)

Chacun fournit ses `HostServices` (avec `wake`), son `RoomStore` durable, son
`SessionDirectory`, le ping de protocole, et branche `Hub` + `RoomManager` :

- **Node (C)** : `wake` = un `setTimeout` (unref) par code ; `FileRoomStore`
  (activé par `GAROUTOM_DATA`) ; `restore()` au démarrage ; `watchdog()` toutes
  les 10 s ; arrêt gracieux.
- **Worker (B)** : `wake` = table SQLite `wakeups` + une alarme ; `SqlRoomStore` ;
  sessions dans les attachements des sockets hibernées ; `alarm()` appelle
  `tick` pour chaque code dû puis `watchdog()`.

Tant que le lot A n'a pas livré, B et C codent contre ces signatures ; une
erreur de compilation qui vient d'un manque du lot A n'est pas la leur.
