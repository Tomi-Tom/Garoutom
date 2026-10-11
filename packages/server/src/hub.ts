/**
 * Le concentrateur : identités de connexion et aiguillage.
 *
 * Le cœur des tables décide ; le concentrateur transporte. Il ne connaît
 * aucune règle du jeu : il donne un nom à chaque connexion, route les
 * demandes vers le gestionnaire de tables, et rend les accusés à qui les
 * attend. Volontairement ignorant du transport — il ne connaît que `send`
 * et `close` — c'est ce qui lui permet de tourner aussi bien derrière un
 * serveur Node (paquet `ws`) que dans un Worker (`WebSocketPair`), sans
 * qu'une ligne ne bouge.
 */

import { decodeClientFrame, encodeFrame, type Ack, type ServerFrame } from '@garoutom/engine';

import { RoomError, type Emitter, type RoomManager } from './rooms.js';

/** Ce que le concentrateur attend d'une connexion, et rien de plus. */
export interface HubSocket {
  send: (data: string) => void;
  close: () => void;
}

/** De quoi piloter une connexion attachée. */
export interface HubSession {
  id: string;
  /** Un message brut arrivé du réseau. */
  receive: (raw: unknown) => Promise<void>;
  /** La connexion est finie, dans un sens ou dans l'autre. */
  close: () => Promise<void>;
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
    manager.join(id, payload.code, payload.name, payload.token),
  'room:options': ({ manager, id, payload }) => manager.setOptions(id, payload.options),
  'room:start': ({ manager, id }) => manager.start(id),
  'room:rematch': ({ manager, id }) => manager.rematch(id),
  'room:leave': ({ manager, id }) => manager.leave(id),
  'game:action': ({ manager, id, payload }) => manager.action(id, payload.action),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class Hub implements Emitter {
  private manager: RoomManager | null = null;
  private readonly sockets = new Map<string, HubSocket>();

  constructor(private readonly uuid: () => string) {}

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

  attach(socket: HubSocket): HubSession {
    const id = this.uuid();
    this.sockets.set(id, socket);
    return {
      id,
      receive: (raw) => this.receive(id, raw),
      close: () => this.detach(id),
    };
  }

  // ── émission ───────────────────────────────────────────────────────────

  toSocket(socketId: string, event: 'sync' | 'notice', payload: unknown): void {
    this.push(socketId, { t: 'ev', e: event, d: payload });
  }

  private push(socketId: string, frame: ServerFrame): void {
    const socket = this.sockets.get(socketId);
    // Une connexion déjà partie n'est pas une erreur : la table adresse tous
    // ses sièges, et l'un d'eux vient peut-être de se fermer.
    if (!socket) return;
    socket.send(encodeFrame(frame));
  }

  // ── réception ──────────────────────────────────────────────────────────

  private async receive(id: string, raw: unknown): Promise<void> {
    const frame = decodeClientFrame(raw);
    // Un cadre illisible est ignoré : couper la connexion pour un octet de
    // travers ferait boucler un client déjà en peine.
    if (!frame) return;

    this.push(id, { t: 'ack', id: frame.id, r: await this.run(id, frame.e, frame.d) });
  }

  private async run(id: string, event: string, data: unknown): Promise<Ack<unknown>> {
    const manager = this.manager;
    if (!manager) return { ok: false, error: 'Le serveur n’est pas prêt' };

    const handler = HANDLERS[event];
    if (!handler) return { ok: false, error: 'Demande inconnue', code: 'unknown' };

    try {
      const payload = isRecord(data) ? data : {};
      const result = await handler({ manager, id, payload });
      return { ok: true, data: result };
    } catch (error) {
      // Le refus d'une table est un fait du jeu, pas un incident : il part
      // avec son code, pour que le client sache dire pourquoi.
      if (error instanceof RoomError) {
        return { ok: false, error: error.message, code: error.code };
      }
      // Une erreur inattendue ne doit pas être maquillée en refus ordinaire,
      // mais elle ne doit pas non plus abattre la connexion.
      const message = error instanceof Error ? error.message : 'Erreur inattendue';
      console.error('Demande en échec', event, error);
      return { ok: false, error: message };
    }
  }

  // ── déconnexion ────────────────────────────────────────────────────────

  private detach(id: string): Promise<void> {
    this.sockets.delete(id);
    return this.manager?.disconnect(id) ?? Promise.resolve();
  }
}
