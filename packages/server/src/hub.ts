/**
 * Le concentrateur : identités de connexion, aiguillage, battement, quotas.
 *
 * Le cœur des tables décide ; le concentrateur transporte. Il ne connaît
 * aucune règle du jeu : il donne un nom à chaque connexion, se présente
 * (`hello`), répond aux `ping`, route les demandes vers le gestionnaire de
 * tables et rend les accusés à qui les attend. Volontairement ignorant du
 * transport — il ne connaît que `send` et `close` — il tourne aussi bien
 * derrière un serveur Node (paquet `ws`) que dans un Worker, sans qu'une
 * ligne ne bouge.
 *
 * Trois garde-fous vivent ici, parce qu'ils sont communs aux deux hôtes :
 *
 * - **les quotas** (D23) — un client qui inonde, ouvre des tables en masse ou
 *   devine des codes ne casse pas la table des autres ;
 * - **une demande à la fois par connexion** — la fermeture d'une socket
 *   attend la fin de la demande en vol : un `room:join` qui aboutit après la
 *   coupure ne laisse pas un joueur fantôme « connecté » ;
 * - **le silence sur l'incident** — une erreur inattendue part en code
 *   `internal`, jamais avec son message : il pourrait dire ce qui ne regarde
 *   personne.
 */

import {
  CAPABILITIES,
  CLOSE_POLICY,
  decodeClientFrame,
  encodeFrame,
  HEARTBEAT_MS,
  IllegalActionError,
  PROTOCOL_VERSION,
  type Ack,
  type ServerFrame,
} from '@garoutom/engine';

import { Bucket, DEFAULT_QUOTAS, KeyedBuckets, perMinute, perSecond, type Quotas } from './quotas.js';
import { RoomError, type Emitter, type RoomManager } from './rooms.js';

export { DEFAULT_QUOTAS, type Quotas } from './quotas.js';

/** Ce que le concentrateur attend d'une connexion, et rien de plus. */
export interface HubSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  /** Adresse du client (quotas), si l'hôte la connaît. */
  ip?: string;
  /** Version de protocole négociée par l'hôte (`negotiateProtocol`). */
  protocol?: number;
}

/** De quoi piloter une connexion attachée. */
export interface HubSession {
  id: string;
  /** Un message brut arrivé du réseau. Ne rejette jamais. */
  receive(raw: unknown): Promise<void>;
  /** La connexion est finie, dans un sens ou dans l'autre. Ne rejette jamais. */
  close(): Promise<void>;
}

type Handler = (context: {
  manager: RoomManager;
  id: string;
  payload: Record<string, unknown>;
}) => Promise<unknown>;

/**
 * La table d'aiguillage.
 *
 * Un nom d'évènement absent d'ici est refusé : c'est la seule liste qui fait
 * foi, et un client ne peut donc atteindre que ce qu'on a explicitement
 * ouvert. Le siège de l'auteur d'une action ne voyage jamais dans la charge
 * utile — il vient de la session.
 */
const HANDLERS: Record<string, Handler> = {
  'room:create': ({ manager, id, payload }) => manager.create(id, payload.name, payload.options),
  'room:join': ({ manager, id, payload }) =>
    manager.join(id, payload.code, payload.name, payload.token, payload.lastSeq),
  'room:options': ({ manager, id, payload }) => manager.setOptions(id, payload.options),
  'room:start': ({ manager, id }) => manager.start(id),
  'room:rematch': ({ manager, id }) => manager.rematch(id),
  'room:leave': ({ manager, id }) => manager.leave(id),
  'game:action': ({ manager, id, payload }) => manager.action(id, payload.action),
};

/** Les demandes qui cherchent une place : elles ne ferment pas une socket non assise. */
const SEATING = new Set(['room:create', 'room:join']);

/** La fenêtre où l'on compte les refus de quota avant de fermer. */
const REFUSAL_WINDOW_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Une demande qui porte un jeton de reprise (sa validité, seule la table la connaît). */
function carriesToken(data: unknown): boolean {
  return isRecord(data) && typeof data.token === 'string' && data.token.length > 0;
}

/** Le refus d'un `join` de trop — devinette de codes ou martelage de jetons. */
const TOO_MANY_JOINS: Ack<unknown> = { ok: false, error: 'Trop d’essais : réessayez dans une minute', code: 'rate' };

/** Une connexion attachée, et ce qu'on sait d'elle. */
interface Connexion {
  id: string;
  socket: HubSocket;
  ip: string | undefined;
  frames: Bucket;
  dire: Bucket;
  /** Les `room:join` portant un jeton : un plafond large, par socket. */
  tokenJoins: Bucket;
  /** La demande en cours et celles qui attendent : une à la fois. */
  chain: Promise<void>;
  /** La fermeture est demandée : plus rien n'entre. */
  closing: boolean;
  detached: Promise<void> | null;
  /** Depuis quand la connexion n'est assise à aucune table. */
  unseatedSince: number | null;
  refusals: number;
  refusalWindow: number;
  session: HubSession;
}

export class Hub implements Emitter {
  private manager: RoomManager | null = null;
  private readonly connexions = new Map<string, Connexion>();
  private readonly perIp = new Map<string, number>();
  private readonly now: () => number;
  private readonly quotas: Quotas;
  private readonly creates: KeyedBuckets;
  private readonly failedJoins: KeyedBuckets;

  constructor(
    private readonly uuid: () => string,
    options: { now?: () => number; quotas?: Partial<Quotas> } = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.quotas = { ...DEFAULT_QUOTAS, ...options.quotas };
    this.creates = new KeyedBuckets(perMinute(this.quotas.createsPerMinute), this.quotas.createsPerMinute);
    this.failedJoins = new KeyedBuckets(
      perMinute(this.quotas.failedJoinsPerMinute),
      this.quotas.failedJoinsPerMinute,
    );
  }

  /**
   * Donne au concentrateur le gestionnaire qu'il servira.
   *
   * En deux temps parce que la dépendance est circulaire : le gestionnaire a
   * besoin du concentrateur comme émetteur, et le concentrateur a besoin du
   * gestionnaire pour lui passer les demandes.
   */
  serve(manager: RoomManager): void {
    this.manager = manager;
  }

  /**
   * Attache une connexion et se présente aussitôt (`hello`). `id` imposé
   * possible : le Worker reprend l'étiquette d'une socket hibernée.
   */
  attach(socket: HubSocket, id?: string): HubSession {
    const connexionId = id ?? this.uuid();
    const known = this.connexions.get(connexionId);
    if (known) return known.session;

    const now = this.now();
    const session: HubSession = {
      id: connexionId,
      receive: (raw) => this.receive(connexionId, raw),
      close: () => this.detach(connexionId),
    };
    const connexion: Connexion = {
      id: connexionId,
      socket,
      ip: socket.ip,
      frames: new Bucket(perSecond(this.quotas.framesPerSecond), this.quotas.frameBurst, now),
      dire: new Bucket(perSecond(this.quotas.direPerSecond), this.quotas.direBurst, now),
      tokenJoins: new Bucket(perMinute(this.quotas.tokenJoinsPerMinute), this.quotas.tokenJoinsPerMinute, now),
      chain: Promise.resolve(),
      closing: false,
      detached: null,
      unseatedSince: now,
      refusals: 0,
      refusalWindow: now,
      session,
    };
    this.connexions.set(connexionId, connexion);

    if (connexion.ip !== undefined) {
      const count = (this.perIp.get(connexion.ip) ?? 0) + 1;
      this.perIp.set(connexion.ip, count);
      if (count > this.quotas.socketsPerIp) {
        this.close(connexionId, CLOSE_POLICY, 'Trop de connexions depuis cette adresse');
        return session;
      }
    }

    this.push(connexion, {
      t: 'hello',
      protocol: socket.protocol ?? PROTOCOL_VERSION,
      capabilities: [...CAPABILITIES],
      heartbeatMs: HEARTBEAT_MS,
    });
    return session;
  }

  /** Retrouve une session par identifiant (le Worker, après hibernation). */
  session(id: string): HubSession | undefined {
    return this.connexions.get(id)?.session;
  }

  /**
   * Ferme les connexions assises à aucune table depuis `unseatedMs` (D23).
   * À appeler régulièrement par l'hôte, avec le chien de garde ; le même
   * contrôle se fait aussi, paresseusement, à chaque cadre reçu.
   */
  sweep(): void {
    const now = this.now();
    for (const connexion of [...this.connexions.values()]) this.checkUnseated(connexion, now);
  }

  // ── émission ───────────────────────────────────────────────────────────

  toSocket(socketId: string, event: 'sync' | 'notice', payload: unknown): void {
    const connexion = this.connexions.get(socketId);
    // Une connexion déjà partie n'est pas une erreur : la table adresse tous
    // ses sièges, et l'un d'eux vient peut-être de se fermer.
    if (connexion) this.push(connexion, { t: 'ev', e: event, d: payload });
  }

  close(socketId: string, code: number, reason: string): void {
    const connexion = this.connexions.get(socketId);
    if (!connexion || connexion.closing) return;
    connexion.closing = true;
    try {
      connexion.socket.close(code, reason);
    } catch (error) {
      console.error('[garoutom] fermeture de socket en échec', error);
    }
    // L'hôte nous rappellera sans doute par `session.close()` ; on n'attend
    // pas : se détacher deux fois ne fait rien, et `detach` ne rejette pas.
    this.detach(socketId).catch(() => undefined);
  }

  private push(connexion: Connexion, frame: ServerFrame): void {
    try {
      connexion.socket.send(encodeFrame(frame));
    } catch (error) {
      // Une socket qui se ferme pendant qu'on lui parle n'est pas un incident
      // du serveur ; on la laisse à sa fermeture.
      console.error('[garoutom] envoi en échec', error);
    }
  }

  // ── réception ──────────────────────────────────────────────────────────

  private receive(id: string, raw: unknown): Promise<void> {
    const connexion = this.connexions.get(id);
    if (!connexion || connexion.closing) return Promise.resolve();
    const now = this.now();

    if (!connexion.frames.take(now)) {
      this.refuse(connexion, raw, now);
      return Promise.resolve();
    }

    const frame = decodeClientFrame(raw);
    // Un cadre illisible est ignoré : couper la connexion pour un octet de
    // travers ferait boucler un client déjà en peine.
    if (!frame) return Promise.resolve();

    // Le battement ne passe pas par la file : un `join` lent ne doit pas
    // faire croire au client que le lien est mort.
    if (frame.t === 'ping') {
      this.checkUnseated(connexion, now);
      if (!connexion.closing) this.push(connexion, { t: 'pong', id: frame.id, now });
      return Promise.resolve();
    }

    if (!SEATING.has(frame.e)) {
      this.checkUnseated(connexion, now);
      if (connexion.closing) return Promise.resolve();
    }

    const refusal = this.quotaFor(connexion, frame.e, frame.d, now);
    if (refusal !== null) {
      this.countRefusal(connexion, now);
      this.push(connexion, { t: 'ack', id: frame.id, r: refusal });
      return Promise.resolve();
    }

    // Une reprise par jeton passe même quand l'adresse a épuisé ses `join`
    // ratés — mais alors **par son jeton seulement** : sans pseudo, elle ne
    // peut pas s'asseoir comme nouvelle venue, et tout refus devient le refus
    // du quota. Un jeton bidon ne rouvre donc ni la devinette de codes, ni ce
    // qu'un refus (`gone`, `started`…) dirait de l'existence d'une table.
    const tokenOnly =
      frame.e === 'room:join' &&
      carriesToken(frame.d) &&
      connexion.ip !== undefined &&
      !this.failedJoins.available(connexion.ip, now);
    const data = tokenOnly && isRecord(frame.d) ? { ...frame.d, name: undefined } : frame.d;

    const run = connexion.chain.then(async () => {
      let result = await this.run(connexion, frame.e, data);
      if (frame.e === 'room:join' && !result.ok && connexion.ip !== undefined) {
        this.failedJoins.take(connexion.ip, this.now());
        if (tokenOnly) result = TOO_MANY_JOINS;
      }
      this.refreshSeat(connexion);
      this.push(connexion, { t: 'ack', id: frame.id, r: result });
    });
    connexion.chain = run.catch((error: unknown) => {
      console.error('[garoutom] demande mal traitée', error);
    });
    return connexion.chain;
  }

  /** Les quotas propres à une demande : `null` si elle passe, l'accusé de refus sinon. */
  private quotaFor(connexion: Connexion, event: string, data: unknown, now: number): Ack<unknown> | null {
    const rate = (error: string): Ack<unknown> => ({ ok: false, error, code: 'rate' });
    if (event === 'game:action' && isRecord(data) && isRecord(data.action) && data.action.type === 'dire') {
      if (!connexion.dire.take(now)) return rate('Doucement : un message à la fois');
    }
    if (connexion.ip !== undefined) {
      if (event === 'room:create' && !this.creates.take(connexion.ip, now)) {
        return rate('Trop de tables ouvertes : réessayez dans une minute');
      }
      // Une reprise par jeton n'est pas refusée d'avance : seul son échec compte.
      if (event === 'room:join' && !carriesToken(data) && !this.failedJoins.available(connexion.ip, now)) {
        return TOO_MANY_JOINS;
      }
    }
    if (event === 'room:join' && carriesToken(data) && !connexion.tokenJoins.take(now)) {
      return TOO_MANY_JOINS;
    }
    return null;
  }

  /** Un cadre au-delà de la cadence : refusé, et la socket fermée si elle insiste. */
  private refuse(connexion: Connexion, raw: unknown, now: number): void {
    this.countRefusal(connexion, now);
    if (connexion.closing) return;
    // Une demande reçoit tout de même son accusé : un client honnête saura
    // pourquoi rien ne s'est passé.
    const frame = decodeClientFrame(raw);
    if (frame?.t === 'req') {
      this.push(connexion, {
        t: 'ack',
        id: frame.id,
        r: { ok: false, error: 'Trop de messages', code: 'rate' },
      });
    }
  }

  private countRefusal(connexion: Connexion, now: number): void {
    if (now - connexion.refusalWindow > REFUSAL_WINDOW_MS) {
      connexion.refusalWindow = now;
      connexion.refusals = 0;
    }
    connexion.refusals += 1;
    if (connexion.refusals > this.quotas.refusalsBeforeClose) {
      this.close(connexion.id, CLOSE_POLICY, 'Trop de messages');
    }
  }

  /** Assise ou non, d'après le gestionnaire. */
  private refreshSeat(connexion: Connexion): void {
    const seated = this.manager?.seated(connexion.id) ?? false;
    if (seated) connexion.unseatedSince = null;
    else connexion.unseatedSince ??= this.now();
  }

  private checkUnseated(connexion: Connexion, now: number): void {
    if (connexion.closing) return;
    this.refreshSeat(connexion);
    const since = connexion.unseatedSince;
    if (since !== null && now - since >= this.quotas.unseatedMs) {
      this.close(connexion.id, CLOSE_POLICY, 'Aucune table rejointe');
    }
  }

  private async run(connexion: Connexion, event: string, data: unknown): Promise<Ack<unknown>> {
    const manager = this.manager;
    if (!manager) return { ok: false, error: 'Le serveur n’est pas prêt', code: 'internal' };

    const handler = HANDLERS[event];
    if (!handler) return { ok: false, error: 'Demande inconnue', code: 'unknown' };

    try {
      const payload = isRecord(data) ? data : {};
      const result = await handler({ manager, id: connexion.id, payload });
      return { ok: true, data: result ?? null };
    } catch (error) {
      // Le refus d'une table est un fait du jeu, pas un incident : il part
      // avec son code, pour que le client sache dire pourquoi.
      if (error instanceof RoomError || error instanceof IllegalActionError) {
        return error.code === undefined
          ? { ok: false, error: error.message }
          : { ok: false, error: error.message, code: error.code };
      }
      // Une erreur inattendue se journalise ici, et ne sort pas d'ici.
      console.error('[garoutom] demande en échec', event, error);
      return { ok: false, error: 'Le serveur a rencontré un problème', code: 'internal' };
    }
  }

  // ── déconnexion ────────────────────────────────────────────────────────

  /**
   * La connexion est finie. La fermeture attend la demande en vol — c'est
   * tout l'intérêt de la file — puis prévient le gestionnaire.
   */
  private detach(id: string): Promise<void> {
    const connexion = this.connexions.get(id);
    if (!connexion) return Promise.resolve();
    if (connexion.detached) return connexion.detached;
    connexion.closing = true;
    connexion.detached = connexion.chain
      .then(async () => {
        this.connexions.delete(id);
        if (connexion.ip !== undefined) {
          const left = (this.perIp.get(connexion.ip) ?? 1) - 1;
          if (left <= 0) this.perIp.delete(connexion.ip);
          else this.perIp.set(connexion.ip, left);
        }
        await this.manager?.disconnect(id);
      })
      .catch((error: unknown) => {
        console.error('[garoutom] fermeture mal refermée', error);
      });
    return connexion.detached;
  }
}
