/**
 * Toutes les tables de Garoutom dans un Durable Object — qui dort, et qui
 * n'oublie rien (D21).
 *
 * Raison d'être (D5) : **une partie de loup-garou dure des dizaines de
 * minutes**, et une fonction d'hébergement coupe la connexion au bout de
 * cinq. Un Durable Object n'a pas d'invocation, donc pas de plafond : la
 * connexion vit aussi longtemps que le joueur la tient. Le serveur reste
 * l'unique autorité, et le cœur qui tranche est exactement celui du serveur
 * Node — `RoomManager` et `Hub`, repris tels quels de `@garoutom/server`.
 *
 * ## Un objet pour toutes les tables, pas un par table
 *
 * Le client ouvre son canal **avant** de connaître sa table : l'accueil crée
 * ou rejoint par le canal lui-même. L'objet unique, atteint par
 * `idFromName('tables')`, garde ce flux intact, et l'attribution des codes
 * reste globale. Un objet par table reste l'évolution prévue au-delà d'une
 * cinquantaine de tables simultanées (D21).
 *
 * ## L'état rangé est la seule vérité
 *
 * Un déploiement ferme toutes les sockets et relance l'objet sur une mémoire
 * vierge ; une éviction aussi ; une hibernation garde les sockets mais vide
 * la mémoire. Rien de ce qui compte n'y vit donc :
 *
 * - les tables sont dans SQLite (`stockage.ts`), lues à la demande, gardées
 *   en cache tant que l'instance vit ;
 * - le temps est dans la table `wakeups` et **une alarme** (`planificateur.ts`)
 *   — aucun `setTimeout`, qui mourrait avec l'instance et l'empêcherait de
 *   dormir ;
 * - le lien socket → (table, joueur) est dans l'attachement de chaque socket
 *   (`annuaire.ts`), et l'identifiant de connexion est son étiquette.
 *
 * Au réveil (constructeur rejoué), l'objet reconstruit un concentrateur et
 * un gestionnaire neufs, et rattache au concentrateur les sockets encore
 * ouvertes. Après un déploiement, il n'y en a plus aucune : les clients se
 * reconnectent, renvoient `room:join` avec leur jeton et leur `lastSeq`, et
 * le cœur recharge la table, la réconcilie (tout `socketId` mort devient
 * absent) et les rattache. Une fois par version déployée, `restore()` passe
 * sur toutes les tables pour réarmer leurs réveils.
 *
 * ## Le ping (D22) : le concentrateur répond, pas l'auto-réponse
 *
 * `setWebSocketAutoResponse` répondrait sans réveiller l'objet — mais il ne
 * sait que rendre une chaîne **fixe** à une chaîne **fixe**. Or le cadre du
 * protocole est `{t:'ping', id}` avec un `id` croissant, et le `pong` doit
 * rendre cet `id` et l'heure du serveur (`now`, qui corrige l'horloge du
 * client). Impossible en chaîne fixe : c'est donc le concentrateur qui répond,
 * au prix d'un réveil par ping (facturé au vingtième d'une requête, et l'objet
 * est de toute façon éveillé dès qu'une table joue). L'auto-réponse est tout
 * de même posée, pour la chaîne nue `ping` → `pong` : une sonde, ou un futur
 * client, peut vérifier le lien sans réveiller l'objet, et l'heure de cette
 * réponse compte comme signe de vie.
 *
 * Sans `ws.ping()` côté Worker, un lien à moitié ouvert ne se voit qu'au
 * silence : une socket de protocole ≥ 2 (qui pinge toutes les 20 s) muette
 * depuis `SILENT_SOCKET_MS` est fermée, au passage d'alarme (une veille toutes
 * les 30 s tant qu'il y a des sockets) ou au fil des messages. Une socket de
 * protocole 1 — l'ancien client, qui ne pinge pas — n'est jamais fermée pour
 * silence : on la casserait au premier quart d'heure calme.
 */

import {
  CLOSE_VERSION,
  negotiateProtocol,
  PROTOCOL_PARAM,
  PROTOCOL_VERSION,
  SILENT_SOCKET_MS,
} from '@garoutom/engine';
import { Hub, RoomManager, type HubSession, type Room } from '@garoutom/server';

import { AnnuaireSockets, lireAttache, type Attache } from './annuaire.js';
import { servicesWorker } from './hote.js';
import { noter, raconter } from './journal.js';
import { Planificateur } from './planificateur.js';
import { prise } from './prise.js';
import { ecrireMeta, lireMeta, lireMetaNombre, SqlRoomStore } from './stockage.js';

/** Ce que l'objet lit de son environnement. */
export interface EnvTables {
  /** `[version_metadata]` : l'identifiant de la version déployée. */
  VERSION?: { id: string; tag?: string; timestamp?: string };
}

/** Le chemin interne de la santé profonde — seule la porte (`index.ts`) y mène. */
export const CHEMIN_SANTE = '/sante';

/** La veille des sockets muettes : un contrôle toutes les 30 s tant qu'il y a des sockets. */
export const VEILLE_MS = 30_000;

/** Fermeture d'une socket muette : « je m'en vais » — le client se reconnectera s'il vit. */
export const FERMETURE_MUETTE = 1001;

/** Ce que rend `/health?profond=1`. */
export interface SanteProfonde {
  ok: true;
  version: string | null;
  protocole: number;
  schema: number | null;
  tables: Record<string, number>;
  sockets: number;
  alarme: number | null;
  reveils: number;
  dernierRetardMs: number | null;
  pireRetardMs: number | null;
  maintenant: number;
}

export class TablesDO implements DurableObject {
  readonly magasin: SqlRoomStore<Room>;
  readonly planificateur: Planificateur;
  readonly annuaire: AnnuaireSockets<WebSocket>;
  /** Résolue quand le démarrage (restauration d'une nouvelle version) est fait. */
  readonly pret: Promise<void>;

  private readonly hub: Hub;
  private readonly manager: RoomManager;
  private prochaineVeille: number | null = null;
  private dernierControle = 0;
  /** Les connexions dont la fin a déjà été traitée — `error` puis `close` arrivent souvent tous deux. */
  private readonly finies = new Set<string>();

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: EnvTables = {},
  ) {
    this.annuaire = new AnnuaireSockets<WebSocket>(ctx);
    this.magasin = new SqlRoomStore<Room>(ctx.storage);
    this.planificateur = new Planificateur(ctx.storage, {
      veille: () => this.veille(),
      aBalayer: () => this.magasin.aDesTables(),
      balayer: () => this.balayer(),
    });
    const services = servicesWorker((code, at) => {
      this.planificateur.wake(code, at);
    });
    this.hub = new Hub(services.uuid, { now: services.now });
    this.manager = new RoomManager(this.hub, this.magasin, services, this.annuaire);
    this.hub.serve(this.manager);

    this.poserAutoReponse();
    this.rattacherTout();
    this.pret = ctx.blockConcurrencyWhile(() => this.demarrer());
  }

  /* ── les requêtes : la santé, et l'ouverture du canal ─────────────── */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === CHEMIN_SANTE) return Response.json(await this.sante());

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Ce point d’entrée attend une connexion WebSocket', { status: 426 });
    }

    const [client, serveur] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    const protocole = negotiateProtocol(url.searchParams.get(PROTOCOL_PARAM));
    if (protocole === null) {
      // Hors plage : on accepte pour pouvoir dire pourquoi, puis on ferme en
      // `CLOSE_VERSION` — le client se recharge (D22). Acceptée en mode
      // hibernable, sans attachement : ses évènements passent par
      // `webSocketClose`/`webSocketError`, qui n'ont rien à en dire au cœur.
      // (Avec `accept()`, la coupure côté client remontait en « Uncaught
      // Error: Network connection lost ».)
      this.ctx.acceptWebSocket(serveur, ['refusee']);
      serveur.close(CLOSE_VERSION, 'Version du protocole non prise en charge');
      noter('avert', 'version-refusee', { demandee: url.searchParams.get(PROTOCOL_PARAM) });
      return new Response(null, { status: 101, webSocket: client });
    }

    this.brancher(serveur, protocole, request.headers.get('CF-Connecting-IP'));
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Accepte une socket en mode hibernable, range son attachement et la
   * présente au concentrateur (qui lui dit `hello`). Rend son identifiant.
   */
  brancher(serveur: WebSocket, protocole: number, ip: string | null): string {
    const id = crypto.randomUUID();
    const maintenant = Date.now();
    const attache: Attache = { id, protocol: protocole, code: null, playerId: null, depuis: maintenant, vu: maintenant, ip };
    this.ctx.acceptWebSocket(serveur, [id]);
    serveur.serializeAttachment(attache);
    this.hub.attach(prise(serveur, attache, false), id);
    // Une première socket ouvre la veille des muettes.
    this.planificateur.rearm();
    return id;
  }

  /* ── les évènements des sockets hibernables ───────────────────────── */

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const maintenant = Date.now();
    this.annuaire.signeDeVie(socket, maintenant);
    const session = this.sessionDe(socket);
    if (session) {
      try {
        await session.receive(message);
      } catch (erreur) {
        noter('erreur', 'message-mal-traite', raconter(erreur));
      }
    }
    this.controlerMuettes(maintenant, false);
  }

  async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    await this.fin(socket, code);
  }

  async webSocketError(socket: WebSocket, erreur: unknown): Promise<void> {
    noter('avert', 'socket-en-erreur', raconter(erreur));
    await this.fin(socket, null);
  }

  /* ── l'alarme : les tables dues, le chien de garde, la veille ─────── */

  async alarm(): Promise<void> {
    const maintenant = Date.now();
    // `run` ne lève jamais ; le chien de garde non plus, en principe — on ne
    // prend pas le risque d'une alarme qui lève : le runtime la retenterait
    // six fois, puis l'abandonnerait, et toutes les tables avec elle.
    await this.planificateur.run(maintenant, (code) => this.manager.tick(code));
    try {
      await this.manager.watchdog();
    } catch (erreur) {
      noter('erreur', 'chien-de-garde', raconter(erreur));
    }
    try {
      // Les connexions qui n'ont rejoint aucune table en 30 s (D23).
      this.hub.sweep();
    } catch (erreur) {
      noter('erreur', 'balayage-du-concentrateur', raconter(erreur));
    }
    this.controlerMuettes(maintenant, true);
    this.planificateur.rearm();
  }

  /* ── la santé profonde ────────────────────────────────────────────── */

  async sante(): Promise<SanteProfonde> {
    const mesures = this.planificateur.mesures();
    let alarme: number | null = mesures.prochaineAlarme;
    try {
      alarme = await this.ctx.storage.getAlarm();
    } catch {
      /* la valeur rangée suffit */
    }
    return {
      ok: true,
      version: this.env.VERSION?.id ?? null,
      protocole: PROTOCOL_VERSION,
      schema: lireMetaNombre(this.ctx.storage, 'schema_version'),
      tables: this.magasin.parStatut(),
      sockets: this.ctx.getWebSockets().length,
      alarme,
      reveils: mesures.reveils,
      dernierRetardMs: mesures.dernierRetardMs,
      pireRetardMs: mesures.pireRetardMs,
      maintenant: Date.now(),
    };
  }

  /* ── détails ──────────────────────────────────────────────────────── */

  /**
   * Une fois par version déployée : `restore()` recharge toutes les tables,
   * les réconcilie (les sockets d'avant le déploiement sont mortes) et
   * réarme leurs réveils. Une hibernation ne change pas de version : ce
   * n'est fait qu'au premier réveil d'un nouveau code.
   */
  private async demarrer(): Promise<void> {
    const version = this.env.VERSION?.id ?? 'inconnue';
    try {
      if (lireMeta(this.ctx.storage, 'version_restauree') === version) return;
      await this.manager.restore();
      ecrireMeta(this.ctx.storage, 'version_restauree', version);
      noter('info', 'demarrage', { version, tables: this.magasin.parStatut() });
    } catch (erreur) {
      // Jamais de constructeur qui lève : l'objet serait réinitialisé en boucle.
      // Le balayage horaire et la réconciliation au chargement rattrapent.
      noter('erreur', 'restauration-en-echec', { version, ...raconter(erreur) });
    }
  }

  private poserAutoReponse(): void {
    if (typeof WebSocketRequestResponsePair !== 'function') return; // sous Node
    try {
      this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    } catch (erreur) {
      noter('avert', 'auto-reponse-refusee', raconter(erreur));
    }
  }

  /** Au réveil, le concentrateur est neuf : on lui rend les sockets encore ouvertes, sans `hello`. */
  private rattacherTout(): void {
    for (const { socket, attache } of this.annuaire.toutes()) {
      if (!this.hub.session(attache.id)) this.hub.attach(prise(socket, attache, true), attache.id);
    }
  }

  /** La session du concentrateur pour cette socket, rattachée au besoin. */
  private sessionDe(socket: WebSocket): HubSession | null {
    const attache = lireAttache(socket);
    if (!attache) {
      // Une socket sans attachement lisible n'a pas été ouverte par ce code.
      try {
        socket.close(FERMETURE_MUETTE, 'Connexion inconnue');
      } catch {
        /* déjà fermée */
      }
      return null;
    }
    return this.hub.session(attache.id) ?? this.hub.attach(prise(socket, attache, true), attache.id);
  }

  private async fin(socket: WebSocket, code: number | null): Promise<void> {
    const attache = lireAttache(socket);
    if (!attache) {
      // Une socket refusée à l'ouverture (version) : personne à prévenir.
      try {
        socket.close(1000, 'Au revoir');
      } catch {
        /* déjà fermée */
      }
      return;
    }
    const id = attache.id;
    if (this.finies.has(id)) return;
    // Une mémoire bornée : l'instance peut vivre longtemps entre deux sommeils.
    if (this.finies.size > 10_000) this.finies.clear();
    this.finies.add(id);
    // Avec `web_socket_auto_reply_to_close` (date de compatibilité ≥ 2026-04-07),
    // le runtime rend lui-même la poignée de fermeture ; la rendre encore est
    // sans effet. Un code que `close()` refuse (1005, 1006…) devient 1000.
    try {
      socket.close(code ?? 1000, code === FERMETURE_MUETTE ? 'Lien muet' : 'Au revoir');
    } catch {
      try {
        socket.close(1000, 'Au revoir');
      } catch {
        /* déjà fermée */
      }
    }
    // Fermée, la socket ne sort plus de `getWebSockets` : on la garde sous la
    // main pour que le cœur lise encore sa session dans l'attachement.
    this.annuaire.retenir(id, socket);
    try {
      // Rattachée seulement si elle tenait une place : une socket que le
      // concentrateur a déjà détachée (fermeture 4001, quota…) n'a plus rien
      // à dire au cœur.
      const session =
        this.hub.session(id) ?? (attache && attache.code !== null ? this.sessionDe(socket) : null);
      await session?.close();
    } catch (erreur) {
      noter('erreur', 'fermeture-mal-refermee', raconter(erreur));
    } finally {
      this.annuaire.relacher(id);
    }
  }

  /** L'échéance de la veille des muettes : dans 30 s tant qu'il y a des sockets. */
  private veille(): number | null {
    if (this.ctx.getWebSockets().length === 0) {
      this.prochaineVeille = null;
      return null;
    }
    const maintenant = Date.now();
    if (this.prochaineVeille === null || this.prochaineVeille <= maintenant) {
      this.prochaineVeille = maintenant + VEILLE_MS;
    }
    return this.prochaineVeille;
  }

  /**
   * Ferme les sockets de protocole ≥ 2 muettes depuis `SILENT_SOCKET_MS`.
   * Au fil des messages, au plus toutes les `VEILLE_MS` ; à l'alarme, toujours.
   */
  private controlerMuettes(maintenant: number, force: boolean): void {
    if (!force && maintenant - this.dernierControle < VEILLE_MS) return;
    this.dernierControle = maintenant;
    for (const { socket, attache } of this.annuaire.toutes()) {
      if (attache.protocol < 2) continue;
      let vu = attache.vu;
      try {
        const auto = this.ctx.getWebSocketAutoResponseTimestamp(socket);
        if (auto) vu = Math.max(vu, auto.getTime());
      } catch {
        /* sans auto-réponse, l'attachement suffit */
      }
      if (maintenant - vu <= SILENT_SOCKET_MS) continue;
      noter('info', 'socket-muette', { code: attache.code, silenceMs: maintenant - vu });
      void this.fin(socket, FERMETURE_MUETTE);
    }
  }

  /** Le balayage horaire : chaque table passe par `tick`, les réveils orphelins s'effacent. */
  private async balayer(): Promise<void> {
    const codes = await this.magasin.codes();
    for (const code of codes) {
      try {
        await this.manager.tick(code);
      } catch (erreur) {
        noter('erreur', 'balayage-tick', { code, ...raconter(erreur) });
      }
    }
    const orphelins = this.planificateur.oublierOrphelins();
    noter('info', 'balayage', { tables: codes.length, orphelins });
  }
}
