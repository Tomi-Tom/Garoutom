/**
 * L'annuaire des sockets : qui est au bout de quelle connexion, même après
 * un sommeil.
 *
 * Avec l'hibernation, l'objet peut s'endormir entre deux messages en gardant
 * ses sockets ouvertes ; à son réveil, sa mémoire est vierge. Ce qui doit
 * survivre au sommeil est donc rangé **sur la socket elle-même** :
 *
 * - son **étiquette** (`ctx.acceptWebSocket(socket, [id])`) est l'identifiant
 *   de connexion que le concentrateur et le cœur connaissent — on retrouve la
 *   socket par `ctx.getWebSockets(id)` ;
 * - son **attachement** (`serializeAttachment`, 16 Kio au plus — on en prend
 *   une centaine d'octets) porte le reste : version de protocole, table et
 *   joueur assis, adresse du client, heure d'ouverture, dernier signe de vie.
 *
 * C'est le `SessionDirectory` du contrat (lot A) : le cœur y lit et y écrit
 * le lien socket → (table, joueur) comme dans une `Map`, sans savoir qu'il
 * dort dans les sockets. `isLive` sert à la réconciliation : au chargement
 * d'une table, tout `socketId` qui n'est plus ici devient absent.
 *
 * Un déploiement, lui, ferme toutes les sockets : leurs attachements partent
 * avec elles. Rien de grave — la place appartient au joueur par son jeton,
 * rangé avec la table, et le client la reprend en se reconnectant.
 */

import type { SessionDirectory } from '@garoutom/server';

/** `WebSocket.OPEN`, sans dépendre d'un global absent sous Node. */
export const OUVERTE = 1;

/** Ce que l'annuaire range sur chaque socket. */
export interface Attache {
  /** L'identifiant de connexion — aussi l'étiquette de la socket. */
  id: string;
  /** La version de protocole négociée à l'ouverture (`?v=`). */
  protocol: number;
  /** La table où la connexion est assise, ou `null`. */
  code: string | null;
  playerId: string | null;
  /** Ouverture de la connexion (ms). */
  depuis: number;
  /** Dernier cadre reçu (ms), mis à jour au plus toutes les `PAS_VU_MS`. */
  vu: number;
  /** Adresse du client (`CF-Connecting-IP`), pour les quotas du concentrateur. */
  ip: string | null;
}

/** Ce qu'il faut d'une socket hibernable. Le `WebSocket` de Cloudflare le satisfait. */
export interface SocketHibernable {
  readonly readyState: number;
  send(message: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(valeur: unknown): void;
  deserializeAttachment(): unknown;
}

/** Ce qu'il faut de `ctx` pour retrouver les sockets. `DurableObjectState` le satisfait. */
export interface PorteSockets<S extends SocketHibernable = SocketHibernable> {
  getWebSockets(etiquette?: string): S[];
}

/** On ne réécrit `vu` qu'après ce délai : un attachement par cadre serait du gâchis. */
export const PAS_VU_MS = 10_000;

/** Lit un attachement sans rien croire : `null` s'il n'a pas la forme attendue. */
export function lireAttache(socket: SocketHibernable): Attache | null {
  let brut: unknown;
  try {
    brut = socket.deserializeAttachment();
  } catch {
    return null;
  }
  if (typeof brut !== 'object' || brut === null) return null;
  const a = brut as Record<string, unknown>;
  if (typeof a.id !== 'string' || typeof a.protocol !== 'number' || typeof a.depuis !== 'number') return null;
  return {
    id: a.id,
    protocol: a.protocol,
    code: typeof a.code === 'string' ? a.code : null,
    playerId: typeof a.playerId === 'string' ? a.playerId : null,
    depuis: a.depuis,
    vu: typeof a.vu === 'number' ? a.vu : a.depuis,
    ip: typeof a.ip === 'string' ? a.ip : null,
  };
}

export class AnnuaireSockets<S extends SocketHibernable = SocketHibernable> implements SessionDirectory {
  /**
   * Les sockets « en main » : celles dont on traite la fermeture. Le runtime
   * ne les rend plus par `getWebSockets` une fois fermées, mais leur
   * attachement se lit encore — et le cœur doit y trouver la session pour
   * marquer le joueur déconnecté.
   */
  private readonly enMain = new Map<string, S>();

  constructor(private readonly porte: PorteSockets<S>) {}

  /** La socket de cette connexion, si elle est encore là (ou en main). */
  socket(id: string): S | undefined {
    return this.enMain.get(id) ?? this.porte.getWebSockets(id)[0];
  }

  /** Garde une socket sous la main le temps de traiter sa fermeture. */
  retenir(id: string, socket: S): void {
    this.enMain.set(id, socket);
  }

  /** La fermeture est traitée : la socket n'est plus sous la main. */
  relacher(id: string): void {
    this.enMain.delete(id);
  }

  /** L'attachement de cette connexion, si elle est encore là. */
  attache(id: string): Attache | null {
    const socket = this.socket(id);
    return socket ? lireAttache(socket) : null;
  }

  /** Toutes les connexions ouvertes, avec leur attachement lisible. */
  toutes(): { socket: S; attache: Attache }[] {
    const liste: { socket: S; attache: Attache }[] = [];
    for (const socket of this.porte.getWebSockets()) {
      const attache = lireAttache(socket);
      if (attache) liste.push({ socket, attache });
    }
    return liste;
  }

  /** Réécrit l'attachement d'une socket avec quelques champs changés. */
  modifier(socket: S, changement: Partial<Omit<Attache, 'id'>>): void {
    const attache = lireAttache(socket);
    if (!attache) return;
    try {
      socket.serializeAttachment({ ...attache, ...changement } satisfies Attache);
    } catch {
      /* socket déjà fermée : son attachement part avec elle */
    }
  }

  /** Note un signe de vie, sans réécrire l'attachement à chaque cadre. */
  signeDeVie(socket: S, maintenant: number): void {
    const attache = lireAttache(socket);
    if (attache && maintenant - attache.vu >= PAS_VU_MS) this.modifier(socket, { vu: maintenant });
  }

  /* ── SessionDirectory ─────────────────────────────────────────────── */

  get(socketId: string): { code: string; playerId: string } | undefined {
    const attache = this.attache(socketId);
    if (!attache || attache.code === null || attache.playerId === null) return undefined;
    return { code: attache.code, playerId: attache.playerId };
  }

  set(socketId: string, session: { code: string; playerId: string }): void {
    const socket = this.socket(socketId);
    if (socket) this.modifier(socket, { code: session.code, playerId: session.playerId });
  }

  delete(socketId: string): void {
    const socket = this.socket(socketId);
    if (socket) this.modifier(socket, { code: null, playerId: null });
  }

  isLive(socketId: string): boolean {
    // `getWebSockets` peut encore rendre une socket en cours de fermeture :
    // seule une socket ouverte compte comme présente.
    return this.porte.getWebSockets(socketId).some((socket) => socket.readyState === OUVERTE);
  }
}
