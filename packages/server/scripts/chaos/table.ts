/**
 * Les tables du banc de chaos et leurs robots.
 *
 * Un robot de chaos est un client WebSocket ordinaire : il entre par le code,
 * garde son jeton, lit SA vue et joue au cerveau des robots
 * (`../robots/cerveau.ts`). Il ne réutilise pas le `Channel` du moteur parce
 * qu'il doit pouvoir tout casser à volonté — fermer brutalement, se geler,
 * doubler une connexion — mais il en reprend la politique : accusé attendu
 * 8 s, reconnexion à backoff doublé de 0,5 s à 10 s, reprise par le jeton.
 *
 * La table, elle, est l'observateur : elle suit les phases, compte les
 * parties, tient la vérité des rôles (chaque robot connaît le sien), injecte
 * les pannes et vérifie les invariants.
 */

import WebSocket from 'ws';

import {
  ACK_TIMEOUT_MS,
  CHOOSABLE_ROLES,
  MIN_PLAYERS,
  RECONNECT_GRACE_MS,
  createSeededRng,
  decodeServerFrame,
  encodeFrame,
  type Action,
  type GameView,
  type JoinResult,
  type RoleId,
  type RoomView,
  type Rng,
  type SyncPayload,
} from '@garoutom/engine';

import { cleDeMoment, decider } from '../robots/cerveau.js';
import { budgetPhase, fuitesDeVue } from './invariants.js';
import type { Gravite, Journal } from './journal.js';
import type { Relais } from './proxy.js';

/* ------------------------------------------------------------------ */
/* Réglages                                                            */
/* ------------------------------------------------------------------ */

export const TYPES_PANNE = [
  'coupure',
  'veille',
  'natMort',
  'doublon',
  'horsTour',
  'fuzz',
  'joinDouble',
  'rejoinMemeSocket',
  'enVol',
  'doubleConnexion',
  'hotePart',
] as const;
export type TypePanne = (typeof TYPES_PANNE)[number];

/** La lettre de la consigne (a–f) pour chaque type de panne. */
export const FAMILLE: Record<TypePanne, string> = {
  coupure: 'a · fermeture brutale + reprise',
  veille: 'b · half-open (veille puis réveil)',
  natMort: 'b · half-open (NAT mort, zombie serveur)',
  doublon: 'c · action envoyée deux fois',
  horsTour: 'c · action hors tour',
  fuzz: 'c · charges malformées',
  joinDouble: 'c · room:join en double à la reprise',
  rejoinMemeSocket: 'c · room:join répété sur la même connexion',
  enVol: 'd · reconnexion pendant une requête en vol',
  doubleConnexion: 'e · deux connexions, même jeton',
  hotePart: "f · l'hôte quitte en pleine partie",
};

export const POIDS_DEFAUT: Record<TypePanne, number> = {
  coupure: 4,
  veille: 1.5,
  natMort: 1,
  doublon: 1.5,
  horsTour: 1,
  fuzz: 1,
  joinDouble: 1,
  rejoinMemeSocket: 0.6,
  enVol: 1.5,
  doubleConnexion: 1.2,
  hotePart: 0.5,
};

export interface ConfigTables {
  url: string;
  tempsNuit: number;
  tempsJour: number;
  delaiMin: number;
  delaiMax: number;
  pannesParMinute: number;
  poids: Record<TypePanne, number>;
  /** Part des coupures dont l'absence dépasse la grâce (61–90 s). */
  horsGrace: number;
  margePhaseMs: number;
  /** Au-delà, une reprise est jugée lente (invariant). */
  repriseMaxMs: number;
  /** Un robot qui ne reçoit plus rien alors que la table vit, au-delà de ce délai. */
  desyncMs: number;
  partieMaxMs: number;
  /** Combien de temps on tolère une fin de partie sans hôte pour relancer. */
  finSansHoteMs: number;
}

export interface Contexte {
  config: ConfigTables;
  journal: Journal;
  relais: Relais;
}

const PRENOMS = [
  'Gaston', 'Mireille', 'Hubert', 'Odette', 'Fernand', 'Colette', 'Marcel', 'Josette',
  'Lucien', 'Berthe', 'Armand', 'Ginette', 'Raymond', 'Paulette', 'Gustave', 'Yvonne',
  'Octave', 'Simone',
];

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const unite = (rng: Rng): number => rng.nextInt(1_000_000) / 1_000_000;
const entre = (rng: Rng, min: number, max: number): number => Math.round(min + unite(rng) * (max - min));

/* ------------------------------------------------------------------ */
/* Une connexion                                                       */
/* ------------------------------------------------------------------ */

type Reponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string; code?: string; perdue?: boolean; delai?: boolean };

interface Pendante {
  event: string;
  resume: string;
  envoyeA: number;
  /** La connexion a été gelée pendant la vie de la demande : pas de faute à imputer. */
  excuse: boolean;
  abandonnee: boolean;
  resoudre: (r: Reponse) => void;
}

let compteurConnexions = 0;

class Connexion {
  readonly id = ++compteurConnexions;
  readonly ws: WebSocket;
  readonly creeA = Date.now();
  ouverte = false;
  fermee = false;
  /** La fermeture est voulue par le banc : pas de reconnexion automatique. */
  attendue = false;
  gelee = false;
  localPort: number | null = null;
  syncs = 0;
  derniereSync = 0;
  readonly pendantes = new Map<number, Pendante>();
  private prochainId = 1;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  envoyerBrut(texte: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(texte);
  }

  requete(event: string, payload: unknown): Promise<Reponse> {
    if (this.fermee || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.resolve({ ok: false, error: 'Pas de connexion au serveur', perdue: true });
    }
    const id = this.prochainId++;
    return new Promise<Reponse>((resolve) => {
      let reglee = false;
      const resoudre = (r: Reponse): void => {
        if (reglee) return;
        reglee = true;
        resolve(r);
      };
      this.pendantes.set(id, {
        event,
        resume: `${event} ${JSON.stringify(payload).slice(0, 120)}`,
        envoyeA: Date.now(),
        excuse: this.gelee,
        abandonnee: false,
        resoudre,
      });
      this.ws.send(encodeFrame({ t: 'req', id, e: event, d: payload }));
    });
  }

  /** Un accusé est arrivé : `true` s'il arrivait après abandon (tardif). */
  accuser(id: number, r: Reponse): { tardif: boolean; inconnu: boolean } {
    const p = this.pendantes.get(id);
    if (!p) return { tardif: false, inconnu: true };
    this.pendantes.delete(id);
    p.resoudre(r);
    return { tardif: p.abandonnee, inconnu: false };
  }

  echouerTout(): void {
    for (const p of this.pendantes.values()) {
      p.resoudre({ ok: false, error: 'Connexion perdue', perdue: true });
    }
    this.pendantes.clear();
  }

  geler(): void {
    this.gelee = true;
    for (const p of this.pendantes.values()) p.excuse = true;
  }

  fermerBrutalement(): void {
    this.attendue = true;
    this.ws.terminate();
  }
}

/* ------------------------------------------------------------------ */
/* Un robot                                                            */
/* ------------------------------------------------------------------ */

type Etat = 'normal' | 'coupe' | 'gel' | 'exclu' | 'manoeuvre' | 'arrete';

/** Ce qu'on sait d'un robot au moment où il perd sa connexion. */
interface Reprise {
  type: string;
  depuis: number | null;
  absenceMs: number;
  horsGrace: boolean;
  siege: number | null;
  role: RoleId | null;
  partie: number;
  enPartie: boolean;
  joinDouble: boolean;
  actionEnVol: Action | null;
  momentEnVol: string | null;
  joinEnvoye: boolean;
}

export class Robot {
  readonly nom: string;
  readonly rng: Rng;
  join: JoinResult | null = null;
  conn: Connexion | null = null;
  etat: Etat = 'normal';
  siege: number | null = null;
  role: RoleId | null = null;
  private rolePartie = -1;
  room: RoomView | null = null;
  game: GameView | null = null;
  derniereSync = 0;
  dernierServerNow = 0;
  private moment: string | null = null;
  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 500;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private reprise: Reprise | null = null;
  private rattrapageDepuis: number | null = null;
  /** Le `serverNow` qu'il faut atteindre pour être rattrapé après un gel. */
  private rattrapageCible = 0;
  private desyncSignale = false;
  natMort = false;

  constructor(
    readonly index: number,
    readonly table: Table,
    readonly createur: boolean,
  ) {
    this.nom = `${PRENOMS[index % PRENOMS.length]!} T${String(table.index)}`.slice(0, 16);
    this.rng = createSeededRng((table.graine + index * 7919) >>> 0);
  }

  private get ctx(): Contexte {
    return this.table.ctx;
  }

  private get j(): Journal {
    return this.table.ctx.journal;
  }

  /** Assis à la table selon la dernière vue de la table. */
  get assis(): boolean {
    const id = this.join?.playerId;
    return id !== undefined && (this.table.derniereRoom?.players.some((p) => p.id === id) ?? false);
  }

  get disponible(): boolean {
    return this.etat === 'normal' && this.conn !== null && this.conn.ouverte && !this.conn.fermee && this.assis;
  }

  etiquette(): string {
    return `${this.nom} (siège ${String(this.siege ?? '?')}, ${this.role ?? '?'})`;
  }

  private violation(invariant: string, gravite: Gravite, detail: string, cle?: string): void {
    this.table.violation(invariant, gravite, detail, this, cle);
  }

  // ── connexion ───────────────────────────────────────────────────────

  demarrer(): void {
    this.ouvrir();
  }

  private ouvrir(): Connexion {
    const c = new Connexion(this.ctx.config.url);
    this.conn = c;
    if (this.reprise && this.reprise.depuis === null) this.reprise.depuis = Date.now();
    c.ws.on('open', () => {
      c.ouverte = true;
      const brut = (c.ws as unknown as { _socket?: { localPort?: number } })._socket;
      c.localPort = brut?.localPort ?? null;
      if (this.conn === c) {
        this.retryMs = 500;
        void this.entrer(c);
      }
    });
    c.ws.on('message', (raw: unknown) => {
      this.recevoir(c, String(raw));
    });
    c.ws.on('close', () => {
      c.fermee = true;
      c.echouerTout();
      this.surFermeture(c);
    });
    c.ws.on('error', () => {
      // La fermeture suit.
    });
    return c;
  }

  private surFermeture(c: Connexion): void {
    if (c !== this.conn || c.attendue || this.etat === 'arrete') return;
    if (this.etat === 'gel' && this.natMort) {
      // Le réveil sur un NAT mort : l'OS finit par tuer la socket, on revient.
      this.natMort = false;
      this.etat = 'normal';
    } else {
      this.j.inc('fermetures-inattendues');
      this.table.trace(`${this.etiquette()} : fermeture inattendue de la connexion`);
    }
    this.annulerMinuteur();
    if (!this.reprise && this.join) this.reprise = this.instantane('inattendue', 0);
    this.planifierRetry();
  }

  private planifierRetry(): void {
    if (this.retryTimer !== null || this.etat === 'arrete') return;
    const attente = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, 10_000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.etat === 'arrete') return;
      this.ouvrir();
    }, attente);
  }

  private instantane(type: string, absenceMs: number): Reprise {
    const statut = this.table.derniereRoom?.status;
    return {
      type,
      depuis: null,
      absenceMs,
      horsGrace: absenceMs > RECONNECT_GRACE_MS,
      siege: this.rolePartie === this.table.partieNumero ? this.siege : null,
      role: this.rolePartie === this.table.partieNumero ? this.role : null,
      partie: this.table.partieNumero,
      enPartie: statut === 'playing',
      joinDouble: false,
      actionEnVol: null,
      momentEnVol: null,
      joinEnvoye: false,
    };
  }

  private async entrer(c: Connexion): Promise<void> {
    if (this.etat === 'arrete' || c.fermee) return;
    const { code } = this.table;
    if (this.join) {
      const r = this.reprise;
      if (r) r.joinEnvoye = true;
      const corps = { code: this.join.code, name: this.nom, token: this.join.token };
      const essais = r?.joinDouble ? [c.requete('room:join', corps), c.requete('room:join', corps)] : [c.requete('room:join', corps)];
      const reponses = await Promise.all(essais);
      const premiere = reponses[0]!;
      if (r?.joinDouble) {
        this.j.inc(`joinDouble:${reponses.map((x) => (x.ok ? 'ok' : x.error)).join(' / ')}`);
      }
      if (premiere.ok) {
        const data = premiere.data as JoinResult;
        if (data.playerId !== this.join.playerId) {
          this.j.inc('reprise-nouvelle-identite');
          this.table.trace(`${this.etiquette()} : reprise par le jeton → NOUVELLE place (${data.playerId.slice(0, 8)})`);
        }
        this.join = data;
        if (this.reprise && this.room) this.validerReprise(this.room, this.game);
        if (r?.joinDouble) {
          // Le second join a pu nous désasseoir : vérification différée.
          setTimeout(() => {
            this.verifierToujoursAssis('joinDouble');
          }, 1_500);
        }
      } else if (!premiere.perdue) {
        this.refusReprise(premiere.error);
      }
      return;
    }
    if (this.createur && code === null) {
      const r = await c.requete('room:create', { name: this.nom, options: this.table.optionsInitiales() });
      if (r.ok) {
        this.join = r.data as JoinResult;
        this.table.code = this.join.code;
        this.etat = 'normal';
      } else {
        this.j.inc('creation-refusee');
      }
      return;
    }
    if (code === null) return;
    const r = await c.requete('room:join', { code, name: this.nom });
    if (r.ok) {
      this.join = r.data as JoinResult;
      if (this.etat === 'exclu') {
        this.j.inc('retours-par-le-salon');
        this.table.trace(`${this.nom} revient par le salon (nouvelle place)`);
      }
      this.etat = 'normal';
      this.annulerPoll();
    } else if (!r.perdue) {
      this.devenirExclu(r.error);
    }
  }

  private refusReprise(erreur: string): void {
    const r = this.reprise;
    this.reprise = null;
    this.j.inc('reprises-refusees');
    this.j.inc(`reprise-refusee:${erreur}`);
    if (this.table.statut === 'perdue') {
      this.j.inc('reprise-refusee:apres-crash-serveur');
      this.table.violation(
        'table-perdue-au-redemarrage',
        'critique',
        `après le redémarrage du serveur, la reprise par le jeton répond « ${erreur} » : la partie en cours (${String(this.table.partieNumero)}) est perdue pour toute la table`,
        this,
        `crash:${String(this.table.index)}`,
      );
    } else if (r && r.partie !== this.table.partieNumero) {
      // Absent au moment de la revanche : la revanche l'a rayé de la table.
      this.j.inc(`reprise-refusee:${r.type} (partie suivante déjà lancée)`);
      this.violation(
        'evince-par-la-revanche',
        'majeure',
        `${r.type} pendant la partie ${String(r.partie)} (absence ${String(Math.round(r.absenceMs / 1000))} s, dans la grâce : ${String(!r.horsGrace)}) ; la revanche a été lancée sans lui et son jeton est refusé : « ${erreur} »`,
      );
    } else if (r) {
      this.j.inc(`reprise-refusee:${r.type}${r.horsGrace ? ' (hors grâce)' : ''}`);
      const dansLaGrace = !r.horsGrace;
      this.table.trace(
        `${this.etiquette()} : reprise REFUSÉE après ${r.type} (absence ${String(Math.round(r.absenceMs / 1000))} s) : ${erreur}`,
      );
      if (r.enPartie) {
        this.violation(
          dansLaGrace ? 'reprise-refusee-dans-la-grace' : 'place-perdue-apres-grace',
          dansLaGrace ? 'critique' : 'majeure',
          `${r.type}, absence ${String(Math.round(r.absenceMs / 1000))} s (grâce ${String(RECONNECT_GRACE_MS / 1000)} s) : « ${erreur} » — le joueur ne retrouve ni sa place ni son rôle (${r.role ?? '?'}) ; son siège moteur reste vivant et muet`,
        );
      }
    }
    this.devenirExclu(erreur);
  }

  /** Sans place : on retentera d'entrer par le code, comme un humain qui revient au salon. */
  private devenirExclu(raison: string): void {
    this.etat = 'exclu';
    this.join = null;
    this.siege = null;
    this.annulerMinuteur();
    this.j.inc(`refus-entree:${raison}`);
    this.annulerPoll();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      if (this.etat !== 'exclu') return;
      const c = this.conn;
      if (c && c.ouverte && !c.fermee) void this.entrer(c);
      else this.ouvrir();
    }, 4_000);
  }

  private annulerPoll(): void {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  // ── réception ───────────────────────────────────────────────────────

  private recevoir(c: Connexion, brut: string): void {
    // Aucun jeton d'un autre joueur ne doit jamais traverser le réseau.
    for (const autre of this.table.robots) {
      const jeton = autre.join?.token;
      if (autre !== this && jeton && brut.includes(jeton)) {
        this.violation('fuite-jeton', 'critique', `le jeton de ${autre.nom} arrive chez ${this.nom}`, `jeton:${autre.nom}:${this.nom}`);
      }
    }
    const frame = decodeServerFrame(brut);
    if (!frame) {
      this.j.inc('cadres-illisibles');
      return;
    }
    if (frame.t === 'ack') {
      const r: Reponse = frame.r.ok
        ? { ok: true, data: frame.r.data }
        : { ok: false, error: frame.r.error, ...(frame.r.code === undefined ? {} : { code: frame.r.code }) };
      const { tardif, inconnu } = c.accuser(frame.id, r);
      if (tardif) this.j.inc('accuses-tardifs');
      if (inconnu) this.j.inc('accuses-inconnus');
      return;
    }
    if (frame.e === 'notice') {
      this.j.inc('avis');
      return;
    }
    c.syncs += 1;
    c.derniereSync = Date.now();
    if (c !== this.conn) return; // une connexion secondaire n'anime pas le robot
    this.surSync(frame.d as SyncPayload);
  }

  private surSync(p: SyncPayload): void {
    const maintenant = Date.now();
    this.room = p.room;
    this.game = p.game;
    this.derniereSync = maintenant;
    if (p.serverNow > this.dernierServerNow) this.dernierServerNow = p.serverNow;
    this.desyncSignale = false;
    this.table.noterSync(p, maintenant);

    const moi = p.room.players.find((x) => x.id === this.join?.playerId);
    if (moi) this.siege = moi.seat;
    if (this.reprise?.joinEnvoye) this.validerReprise(p.room, p.game);
    if (this.rattrapageDepuis !== null && p.serverNow >= this.rattrapageCible && p.serverNow > 0) {
      this.j.latence('rattrapage-apres-veille', maintenant - this.rattrapageDepuis);
      this.rattrapageDepuis = null;
    }

    const game = p.game;
    // Un sync en retard (robot dégelé) peut venir de la partie précédente : on ne
    // le compare pas à la vérité de la partie en cours.
    const perime = p.serverNow < this.table.dernierServerNow;
    if (perime) this.j.inc('syncs-perimes-non-verifies');
    if (!perime && game?.you && this.siege !== null && p.room.status !== 'lobby') {
      const partie = this.table.partieNumero;
      if (this.rolePartie === partie && this.role !== null && this.role !== game.you.role) {
        this.violation('role-change', 'critique', `rôle ${this.role} → ${game.you.role} dans la même partie`);
      }
      this.role = game.you.role;
      this.rolePartie = partie;
      this.table.verites.set(game.you.seat, game.you.role);
      for (const f of fuitesDeVue(game, p.room, this.table.verites, this.siege)) {
        this.violation('fuite-information', 'critique', `${f.type} : ${f.detail}`, `fuite:${String(this.table.index)}:${String(partie)}:${f.detail}`);
      }
    }

    if (this.etat !== 'normal') return;
    if (!game || p.room.status === 'lobby') {
      this.moment = null;
      return;
    }
    if (game.over) {
      this.annulerMinuteur();
      return;
    }
    const cle = cleDeMoment(game);
    if (cle === null) this.moment = null;
    if (cle !== null && !game.acted && cle !== this.moment && this.minuteur === null) {
      this.minuteur = setTimeout(() => {
        this.minuteur = null;
        void this.jouer();
      }, this.delai());
    }
  }

  private validerReprise(room: RoomView, game: GameView | null): void {
    const r = this.reprise;
    if (!r || !this.join) return;
    const moi = room.players.find((x) => x.id === this.join?.playerId);
    if (!moi?.connected) return;
    this.reprise = null;
    const lat = Date.now() - (r.depuis ?? Date.now());
    this.j.inc('reprises-reussies');
    this.j.inc(`reprise-ok:${r.type}${r.horsGrace ? ' (hors grâce)' : ''}`);
    this.j.latence('reprise', lat);
    this.j.latence(`reprise:${r.type}`, lat);
    this.moment = null;
    if (lat > this.ctx.config.repriseMaxMs) {
      this.violation('reprise-lente', 'mineure', `${r.type} : sync complet ${String(lat)} ms après la reconnexion (seuil ${String(this.ctx.config.repriseMaxMs)} ms)`);
    }
    if (r.enPartie && room.status !== 'lobby' && r.partie === this.table.partieNumero) {
      if (r.siege !== null && moi.seat !== r.siege) {
        this.violation('siege-change', 'critique', `${r.type} : siège ${String(r.siege)} → ${String(moi.seat)}`);
      }
      if (room.status === 'playing') {
        if (!game?.you) {
          this.violation('sync-incomplet', 'majeure', `${r.type} : reprise sans vue de partie`);
        } else if (r.role !== null && game.you.role !== r.role) {
          this.violation('role-change', 'critique', `${r.type} : rôle ${r.role} → ${game.you.role} après reprise`);
        }
      }
      if (r.actionEnVol && game) {
        const memeMoment = r.momentEnVol !== null && cleDeMoment(game) === r.momentEnVol;
        if (memeMoment) this.j.inc(game.acted ? 'enVol:action-appliquee-sans-accuse' : 'enVol:action-perdue');
        else this.j.inc('enVol:moment-passe');
      }
    } else if (r.enPartie && room.status === 'lobby') {
      this.j.inc('reprise-au-salon-apres-revanche');
    }
  }

  // ── jeu ─────────────────────────────────────────────────────────────

  private delai(): number {
    const { delaiMin, delaiMax } = this.ctx.config;
    return delaiMin + this.rng.nextInt(Math.max(1, delaiMax - delaiMin + 1));
  }

  private annulerMinuteur(): void {
    if (this.minuteur !== null) clearTimeout(this.minuteur);
    this.minuteur = null;
  }

  private async jouer(): Promise<void> {
    const game = this.game;
    const c = this.conn;
    if (!game || !c || this.etat !== 'normal') return;
    const cle = cleDeMoment(game);
    if (cle === null || game.acted || game.over) return;
    const action = decider(game, this.rng, { graine: this.table.graine });
    this.moment = cle;
    if (!action) return;
    const r = await c.requete('game:action', { action });
    if (r.ok) this.j.inc('coups-joues');
    else if (r.perdue) this.j.inc('coups-perdus-par-coupure');
    else if (r.delai) this.j.inc('coups-sans-accuse');
    else {
      this.j.inc('coups-refuses');
      this.j.inc(`coup-refuse:${r.error}`);
    }
  }

  requete(event: string, payload: unknown): Promise<Reponse> {
    const c = this.conn;
    if (!c) return Promise.resolve({ ok: false, error: 'Pas de connexion', perdue: true });
    return c.requete(event, payload);
  }

  // ── invariants propres au robot ─────────────────────────────────────

  verifier(maintenant: number): void {
    const conns = this.conn ? [this.conn] : [];
    for (const c of conns) {
      for (const [id, p] of c.pendantes) {
        if (p.abandonnee || maintenant - p.envoyeA < ACK_TIMEOUT_MS) continue;
        p.abandonnee = true;
        p.resoudre({ ok: false, error: 'Le serveur ne répond pas', delai: true });
        if (p.excuse || c.gelee || c.fermee) {
          this.j.inc('requetes-sans-accuse-excusees');
          continue;
        }
        this.violation('requete-sans-accuse', 'majeure', `demande #${String(id)} « ${p.resume} » sans accusé depuis ${String(ACK_TIMEOUT_MS)} ms sur une connexion saine`);
      }
    }
    // Un robot branché et assis qui n'a pas reçu un sync que le reste de la
    // table a reçu il y a plus de `desyncMs`.
    const t = this.table;
    const ref = t.syncAvant(maintenant - this.ctx.config.desyncMs);
    if (
      ref !== null &&
      this.etat === 'normal' &&
      this.conn?.ouverte === true &&
      !this.conn.fermee &&
      this.conn.creeA < ref.a - 1_000 &&
      this.join !== null &&
      this.assis &&
      this.dernierServerNow < ref.s &&
      !this.desyncSignale
    ) {
      this.desyncSignale = true;
      const enTable = t.derniereRoom?.players.find((p) => p.id === this.join?.playerId);
      this.violation(
        'robot-desynchronise',
        'majeure',
        `connecté mais plus aucun sync depuis ${String(Math.round((maintenant - this.derniereSync) / 1000))} s alors que la table en reçoit ; vu par la table : ${enTable ? `assis, connected=${String(enTable.connected)}` : 'absent de la table'}`,
      );
      // Comme un humain qui recharge la page.
      void this.recharger('desynchronisation');
    }
  }

  private verifierToujoursAssis(pourquoi: string): void {
    const id = this.join?.playerId;
    const room = this.table.derniereRoom;
    if (!id || !room || this.etat === 'arrete') return;
    const moi = room.players.find((p) => p.id === id);
    if (!moi && room.status !== 'lobby') {
      this.violation('joueur-ejecte', 'critique', `après ${pourquoi}, le joueur n'est plus à la table (status ${room.status}) — place perdue en pleine partie`);
      this.devenirExclu('éjecté');
    } else if (moi && !moi.connected) {
      this.violation('joueur-marque-absent', 'majeure', `après ${pourquoi}, le joueur est vu déconnecté alors que sa connexion est ouverte`);
    }
  }

  /** Recharger la page : nouvelle connexion, même jeton. */
  async recharger(type: string): Promise<void> {
    const ancienne = this.conn;
    this.reprise = this.instantane(type, 0);
    ancienne?.fermerBrutalement();
    await pause(50);
    if (this.etat === 'arrete') return;
    this.etat = 'normal';
    this.ouvrir();
  }

  // ── les pannes ──────────────────────────────────────────────────────

  async panne(type: TypePanne): Promise<string> {
    switch (type) {
      case 'coupure':
        return this.coupure(false);
      case 'joinDouble':
        return this.coupure(true);
      case 'veille':
        return this.veille(false);
      case 'natMort':
        return this.veille(true);
      case 'doublon':
        return this.doublon();
      case 'horsTour':
        return this.horsTour();
      case 'fuzz':
        return this.fuzz();
      case 'rejoinMemeSocket':
        return this.rejoinMemeSocket();
      case 'enVol':
        return this.enVol();
      case 'doubleConnexion':
        return this.doubleConnexion();
      case 'hotePart':
        return this.hotePart();
    }
  }

  /** (a) Fermeture brutale (`terminate`) puis retour avec le jeton. */
  private coupure(joinDouble: boolean): string {
    const { horsGrace } = this.ctx.config;
    const t = this.table;
    const absence = joinDouble
      ? entre(t.rng, 300, 3_000)
      : unite(t.rng) < horsGrace
        ? entre(t.rng, 61_000, 90_000)
        : entre(t.rng, 500, 30_000);
    const r = this.instantane(joinDouble ? 'joinDouble' : 'coupure', absence);
    r.joinDouble = joinDouble;
    this.reprise = r;
    this.etat = 'coupe';
    this.annulerMinuteur();
    this.conn?.fermerBrutalement();
    setTimeout(() => {
      if (this.etat === 'arrete') return;
      this.etat = 'normal';
      this.ouvrir();
    }, absence);
    return `absence ${String(absence)} ms${r.horsGrace ? ' (HORS GRÂCE)' : ''}`;
  }

  /** (b) Half-open : plus rien ne passe, rien ne se ferme. */
  private veille(natMort: boolean): string {
    const c = this.conn;
    const tuyau = this.ctx.relais.tuyauDe(c?.localPort ?? null);
    if (!c || !tuyau) return 'annulée (pas de tuyau)';
    const t = this.table;
    const duree = natMort ? entre(t.rng, 5_000, 40_000) : entre(t.rng, 5_000, 45_000);
    const disparition = natMort && unite(t.rng) < 0.35;
    this.etat = 'gel';
    this.annulerMinuteur();
    c.geler();
    tuyau.geler();
    const debut = Date.now();
    const playerId = this.join?.playerId;
    // Pendant le gel, le serveur voit-il l'absence ?
    const sonde = setInterval(() => {
      const vu = t.derniereRoom?.players.find((p) => p.id === playerId);
      if (vu?.connected === true && Date.now() - debut > 4_000) {
        this.j.inc(`absence-non-detectee:${natMort ? 'natMort' : 'veille'}`);
        clearInterval(sonde);
      }
    }, 1_000);
    setTimeout(() => {
      clearInterval(sonde);
      if (this.etat !== 'gel') return;
      if (natMort && disparition) {
        // Le téléphone ne revient pas : le serveur finira-t-il par le voir parti ?
        this.etat = 'coupe';
        c.attendue = true;
        this.reprise = this.instantane('disparition', 0);
        this.ctx.relais.zombifier(tuyau);
        const absence = entre(t.rng, 75_000, 85_000);
        setTimeout(() => {
          const vu = t.derniereRoom?.players.find((p) => p.id === playerId);
          if (vu?.connected === true && t.derniereRoom?.status === 'playing') {
            this.violation(
              'absent-jamais-detecte',
              'majeure',
              `NAT mort depuis ${String(Math.round((Date.now() - debut) / 1000))} s (au-delà de la grâce de ${String(RECONNECT_GRACE_MS / 1000)} s) : le serveur le voit toujours connecté, sans compte à rebours ; sa place, son vote et — s'il est hôte — la relance sont tenus par une socket morte`,
            );
          }
          this.j.inc(`disparition:${vu?.connected === true ? 'toujours-vu-connecte' : vu ? 'vu-absent' : 'libere'}`);
          if (this.etat === 'arrete') return;
          if (this.reprise) {
            this.reprise.absenceMs = Date.now() - debut;
            this.reprise.horsGrace = this.reprise.absenceMs > RECONNECT_GRACE_MS;
          }
          this.etat = 'normal';
          this.ouvrir();
        }, absence - duree);
      } else if (natMort) {
        this.natMort = true;
        this.reprise = this.instantane('natMort', duree);
        this.reprise.depuis = null;
        this.ctx.relais.zombifier(tuyau);
      } else {
        c.gelee = false;
        tuyau.degeler();
        this.etat = 'normal';
        this.moment = null;
        this.rattrapageDepuis = Date.now();
        this.rattrapageCible = t.dernierServerNow;
        // Le réveil : les octets retenus arrivent d'eux-mêmes, le cerveau suit.
      }
    }, duree);
    return `${natMort ? (disparition ? 'NAT mort puis DISPARITION ~80 s' : 'NAT mort') : 'veille'} ${String(duree)} ms`;
  }

  /** (c) La même action, deux fois, sans attendre. */
  private async doublon(): Promise<string> {
    const game = this.game;
    const c = this.conn;
    if (!game || !c || game.acted || !game.prompt) return 'annulée (rien à jouer)';
    const action = decider(game, this.rng, { graine: this.table.graine });
    if (!action) return 'annulée (pas de coup)';
    this.moment = cleDeMoment(game);
    this.annulerMinuteur();
    const [a, b] = await Promise.all([c.requete('game:action', { action }), c.requete('game:action', { action })]);
    const issue = `${a.ok ? 'ok' : a.error} / ${b.ok ? 'ok' : b.error}`;
    this.j.inc(`doublon:${issue}`);
    return `${action.type} ×2 → ${issue}`;
  }

  /** (c) Une action qui n'est pas la sienne en ce moment. */
  private async horsTour(): Promise<string> {
    const game = this.game;
    if (!game) return 'annulée';
    const vivants = game.players.filter((p) => p.alive).map((p) => p.seat);
    const cible = vivants[this.rng.nextInt(Math.max(1, vivants.length))] ?? 0;
    const autre = vivants.find((s) => s !== cible) ?? 0;
    const catalogue: Action[] = [
      { type: 'pret' },
      { type: 'cupidon', a: cible, b: autre },
      { type: 'proteger', target: cible },
      { type: 'sonder', target: cible },
      { type: 'devorer', target: cible },
      { type: 'sorciere', save: true, kill: cible },
      { type: 'tirer', target: cible },
      { type: 'successeur', target: cible },
      { type: 'voter', target: cible },
      { type: 'marquer', target: cible },
      { type: 'trahir', target: cible },
      { type: 'designerVotants', seats: [cible] },
    ];
    const permises = new Set<string>();
    if (game.prompt && !game.acted) permises.add(game.prompt.kind);
    // Un vote peut être changé : rejouer `voter` au jour n'est pas hors tour.
    if (game.prompt?.kind === 'voter') permises.add('voter');
    if (game.prompt?.kind === 'devorer') permises.add('devorer');
    const candidates = catalogue.filter((a) => !permises.has(a.type));
    const action = candidates[this.rng.nextInt(candidates.length)]!;
    const r = await this.requete('game:action', { action });
    if (r.ok) {
      this.violation(
        'action-hors-tour-acceptee',
        'critique',
        `${JSON.stringify(action)} accepté en phase ${game.phase}/${game.step ?? '-'} (consigne : ${game.prompt?.kind ?? 'aucune'}, acted=${String(game.acted)})`,
      );
    }
    this.j.inc(`horsTour:${r.ok ? 'ACCEPTEE' : r.perdue || r.delai ? 'sans réponse' : 'refusee'}`);
    return `${action.type} → ${r.ok ? 'ACCEPTÉE' : r.error}`;
  }

  /** (c) Charges malformées : le serveur doit répondre, refuser, et rester debout. */
  private async fuzz(): Promise<string> {
    const c = this.conn;
    const game = this.game;
    if (!c) return 'annulée';
    const moi = this.siege ?? 0;
    const loup = this.role === 'loup' || this.role === 'loupBlanc';
    const essais: { nom: string; event: string; payload: unknown }[] = [
      { nom: 'cible hors table', event: 'game:action', payload: { action: { type: 'voter', target: 99 } } },
      { nom: 'cible négative', event: 'game:action', payload: { action: { type: 'devorer', target: -1 } } },
      { nom: 'cible décimale', event: 'game:action', payload: { action: { type: 'voter', target: 1.5 } } },
      { nom: 'cible texte', event: 'game:action', payload: { action: { type: 'voter', target: '0' } } },
      { nom: 'cible absente', event: 'game:action', payload: { action: { type: 'sonder' } } },
      { nom: 'cupidon a=b', event: 'game:action', payload: { action: { type: 'cupidon', a: moi, b: moi } } },
      { nom: 'votants vides', event: 'game:action', payload: { action: { type: 'designerVotants', seats: [] } } },
      { nom: 'votants non-tableau', event: 'game:action', payload: { action: { type: 'designerVotants', seats: 'tous' } } },
      { nom: 'sorcière types faux', event: 'game:action', payload: { action: { type: 'sorciere', save: 'oui', kill: 99 } } },
      { nom: 'texte vide', event: 'game:action', payload: { action: { type: 'dire', channel: 'village', text: '   ' } } },
      { nom: 'texte non-chaîne', event: 'game:action', payload: { action: { type: 'dire', channel: 'village', text: 42 } } },
      { nom: 'canal inconnu', event: 'game:action', payload: { action: { type: 'dire', channel: 'cave', text: 'psst' } } },
      { nom: 'action null', event: 'game:action', payload: { action: null } },
      { nom: 'verbe __proto__', event: 'game:action', payload: { action: { type: '__proto__' } } },
      { nom: 'charge tableau', event: 'game:action', payload: [1, 2, 3] },
      { nom: 'évènement inconnu', event: 'room:detruire', payload: {} },
      { nom: 'options en partie', event: 'room:options', payload: { options: { tempsNuit: 15 } } },
      { nom: 'start en partie', event: 'room:start', payload: {} },
      { nom: 'rematch en partie', event: 'room:rematch', payload: {} },
    ];
    if (!loup) essais.push({ nom: 'canal loups (non-loup)', event: 'game:action', payload: { action: { type: 'dire', channel: 'loups', text: 'je suis un loup' } } });
    const choix = [0, 1, 2].map(() => essais[this.rng.nextInt(essais.length)]!);
    // Deux cadres illisibles au passage : ignorés, sans couper la connexion.
    c.envoyerBrut('ceci n’est pas du JSON');
    c.envoyerBrut(JSON.stringify({ t: 'req', id: -4, e: 'game:action' }));
    const issues: string[] = [];
    for (const e of choix) {
      const r = await c.requete(e.event, e.payload);
      if (r.ok) {
        const enPartie = this.table.derniereRoom?.status === 'playing';
        if (enPartie || e.event === 'game:action') {
          this.violation('entree-invalide-acceptee', 'majeure', `fuzz « ${e.nom} » ${JSON.stringify(e.payload)} accepté (phase ${game?.phase ?? '-'})`, `fuzz:${e.nom}:${game?.phase ?? '-'}`);
        }
      }
      this.j.inc(`fuzz:${e.nom}:${r.ok ? 'ACCEPTE' : r.perdue || r.delai ? 'sans réponse' : 'refuse'}`);
      issues.push(`${e.nom}→${r.ok ? 'OK' : r.error}`);
    }
    return issues.join(' ; ');
  }

  /** (c) Le même `room:join` (avec jeton) renvoyé sur la connexion déjà assise. */
  private async rejoinMemeSocket(): Promise<string> {
    const c = this.conn;
    if (!c || !this.join) return 'annulée';
    this.etat = 'manoeuvre';
    const r = await c.requete('room:join', { code: this.join.code, name: this.nom, token: this.join.token });
    this.etat = 'normal';
    if (r.ok) {
      this.join = r.data as JoinResult;
    }
    setTimeout(() => {
      this.verifierToujoursAssis('un room:join répété sur la même connexion');
    }, 1_500);
    this.j.inc(`rejoinMemeSocket:${r.ok ? 'ok' : r.error}`);
    return r.ok ? 'accepté' : `refusé : ${r.error}`;
  }

  /** (d) Une action part, la connexion tombe aussitôt, on revient vite. */
  private async enVol(): Promise<string> {
    const c = this.conn;
    const game = this.game;
    if (!c || !game) return 'annulée';
    let action: Action | null = null;
    let moment: string | null = null;
    if (game.prompt && !game.acted) {
      action = decider(game, this.rng, { graine: this.table.graine });
      moment = cleDeMoment(game);
    }
    if (!action) {
      const canal = game.channels[0];
      action = canal ? { type: 'dire', channel: canal, text: 'je reviens…' } : { type: 'voter', target: null };
    }
    const absence = entre(this.table.rng, 200, 1_500);
    const r = this.instantane('enVol', absence);
    r.actionEnVol = action;
    r.momentEnVol = moment;
    this.reprise = r;
    this.etat = 'coupe';
    this.annulerMinuteur();
    const reponse = c.requete('game:action', { action });
    await pause(this.rng.nextInt(15));
    c.fermerBrutalement();
    const issue = await reponse;
    this.j.inc(`enVol:accuse-${issue.ok ? 'recu' : 'perdu'}`);
    setTimeout(() => {
      if (this.etat === 'arrete') return;
      this.etat = 'normal';
      this.ouvrir();
    }, absence);
    return `${action.type} puis coupure, retour dans ${String(absence)} ms`;
  }

  /** (e) Deux connexions avec le même jeton. */
  private async doubleConnexion(): Promise<string> {
    const a = this.conn;
    if (!a || !this.join) return 'annulée';
    const garderNouvelle = this.rng.nextInt(2) === 0;
    this.etat = 'manoeuvre';
    this.annulerMinuteur();
    const b = new Connexion(this.ctx.config.url);
    b.ws.on('message', (raw: unknown) => {
      this.recevoir(b, String(raw));
    });
    b.ws.on('close', () => {
      b.fermee = true;
      b.echouerTout();
      this.surFermeture(b);
    });
    b.ws.on('error', () => undefined);
    const ouverte = await new Promise<boolean>((resolve) => {
      b.ws.once('open', () => {
        b.ouverte = true;
        resolve(true);
      });
      b.ws.once('close', () => {
        resolve(false);
      });
    });
    if (!ouverte) {
      this.etat = 'normal';
      return 'annulée (2e connexion impossible)';
    }
    const r = await b.requete('room:join', { code: this.join.code, name: this.nom, token: this.join.token });
    if (!r.ok) {
      b.fermerBrutalement();
      this.etat = 'normal';
      this.j.inc(`doubleConnexion:join-refuse:${r.error}`);
      return `2e join refusé : ${r.error}`;
    }
    const syncsA = a.syncs;
    const syncsB = b.syncs;
    await pause(2_500);
    // `room:options` résout la session avant tout : la réponse dit si
    // l'ancienne connexion est encore rattachée à une place.
    const sondeA = await a.requete('room:options', { options: {} });
    const orpheline = !sondeA.ok && /aucune table|plus à cette table/.test(sondeA.error);
    const aFermee = a.fermee;
    const recusA = a.syncs - syncsA;
    const recusB = b.syncs - syncsB;
    this.j.inc(`doubleConnexion:ancienne-${aFermee ? 'fermee-par-le-serveur' : orpheline ? 'orpheline-ouverte' : 'toujours-assise'}`);
    if (orpheline && !aFermee) {
      this.violation(
        'connexion-orpheline-silencieuse',
        'majeure',
        `2e connexion avec le même jeton : l'ancienne reste ouverte, ne reçoit plus rien (${String(recusA)} sync contre ${String(recusB)}) et n'est ni fermée ni prévenue (sonde : « ${sondeA.ok ? 'ok' : sondeA.error} »)`,
        `orpheline:${String(this.table.index)}`,
      );
    }
    let issue: string;
    if (garderNouvelle) {
      // L'ancien onglet se ferme : la nouvelle connexion doit rester assise.
      this.conn = b;
      b.localPort = (b.ws as unknown as { _socket?: { localPort?: number } })._socket?.localPort ?? null;
      a.fermerBrutalement();
      this.etat = 'normal';
      this.moment = null;
      if (this.room) this.surSync({ room: this.room, game: this.game, events: [], serverNow: 0 });
      setTimeout(() => {
        this.verifierToujoursAssis("la fermeture de l'ancienne connexion (même jeton)");
      }, 2_000);
      issue = 'nouvelle gardée';
    } else {
      // Le nouvel onglet se ferme : l'ancien reste, orphelin ou non.
      b.fermerBrutalement();
      this.etat = 'normal';
      await pause(3_000);
      const id = this.join.playerId;
      const vu = this.table.derniereRoom?.players.find((p) => p.id === id);
      const recus = a.syncs - syncsA;
      if (vu && !vu.connected) {
        this.violation(
          'onglet-restant-abandonne',
          'majeure',
          `l'onglet le plus récent se ferme : le serveur marque le joueur absent (grâce lancée) alors que l'ancienne connexion est ouverte ; elle n'a reçu que ${String(recus)} sync et ne reçoit plus rien — figée jusqu'à rechargement`,
          `onglet:${String(this.table.index)}`,
        );
        this.j.inc('doubleConnexion:ancienne-figee');
        await this.recharger('rechargement-apres-double-connexion');
      }
      issue = 'ancienne gardée';
    }
    return `${issue} (ancienne ${aFermee ? 'fermée' : orpheline ? 'orpheline' : 'assise'})`;
  }

  /** (f) L'hôte quitte volontairement en pleine partie. */
  private async hotePart(): Promise<string> {
    const c = this.conn;
    const ancien = this.join?.playerId;
    if (!c || !ancien) return 'annulée';
    this.etat = 'manoeuvre';
    this.annulerMinuteur();
    const r = await c.requete('room:leave', {});
    this.devenirExclu('parti volontairement');
    await pause(2_000);
    const room = this.table.derniereRoom;
    const nouvelHote = room?.players.find((p) => p.id === room.hostId);
    if (!room || room.hostId === ancien || !nouvelHote) {
      this.violation('hote-non-transmis', 'majeure', `l'hôte est parti, hostId=${room?.hostId.slice(0, 8) ?? '?'} (ancien ${ancien.slice(0, 8)})`);
    } else if (!nouvelHote.connected) {
      this.violation('hote-transmis-a-un-absent', 'mineure', `le nouvel hôte (siège ${String(nouvelHote.seat)}) est déconnecté`);
    }
    return `room:leave → ${r.ok ? 'ok' : r.error} ; nouvel hôte siège ${String(nouvelHote?.seat ?? '?')}`;
  }

  // ── arrêt ───────────────────────────────────────────────────────────

  async arreter(): Promise<void> {
    this.etat = 'arrete';
    this.annulerMinuteur();
    this.annulerPoll();
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    const c = this.conn;
    if (c && c.ouverte && !c.fermee && this.join) {
      await Promise.race([c.requete('room:leave', {}), pause(1_500)]);
    }
    if (c) {
      c.attendue = true;
      c.ws.close();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Une table                                                           */
/* ------------------------------------------------------------------ */

export interface Partie {
  numero: number;
  debut: number;
  fin: number | null;
  joueurs: number;
  gagnant: string | null;
  jour: number | null;
  phases: number;
  /** Phases closes par la minuterie plutôt que par les joueurs. */
  phasesAuChrono: number;
  pannes: number;
  /** Joueurs présents au lancement et absents de la table à la fin. */
  placesPerdues: number;
}

interface PhaseCourante {
  cle: string;
  phase: string;
  step: string | null;
  day: number;
  debut: number;
  signalee: boolean;
}

export class Table {
  readonly robots: Robot[] = [];
  readonly rng: Rng;
  code: string | null = null;
  statut: 'attente' | 'lobby' | 'playing' | 'finished' | 'perdue' = 'attente';
  partieNumero = 0;
  readonly parties: Partie[] = [];
  readonly verites = new Map<number, RoleId>();
  derniereRoom: RoomView | null = null;
  derniereSyncA = 0;
  dernierServerNow = 0;
  /** Les syncs nouveaux vus par la table : (reçu à, serverNow). */
  private readonly historique: { a: number; s: number }[] = [];
  private phase: PhaseCourante | null = null;
  private readonly sequence: string[] = [];
  enCampagne = true;
  private lobbyDepuis = 0;
  private finDepuis = 0;
  private lancementEnCours = false;
  private revancheEnCours = false;
  private finSansHoteSignalee = false;
  private hotePartiCettePartie = false;
  private optionsAuto = false;
  private minuteurPanne: ReturnType<typeof setTimeout> | null = null;
  private horloge: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly index: number,
    readonly taille: number,
    readonly graine: number,
    readonly ctx: Contexte,
  ) {
    this.rng = createSeededRng((graine ^ 0x5eed) >>> 0);
  }

  trace(ligne: string): void {
    const t = this.ctx.journal.t();
    this.sequence.push(`${t} ${ligne}`);
    if (this.sequence.length > 40) this.sequence.shift();
    this.ctx.journal.console(`[T${String(this.index)} ${this.code ?? '----'}] ${ligne}`);
  }

  violation(invariant: string, gravite: Gravite, detail: string, robot: Robot | null, cle?: string): void {
    this.ctx.journal.violation(
      {
        invariant,
        gravite,
        table: this.index,
        code: this.code,
        partie: this.partieNumero,
        robot: robot?.nom ?? null,
        siege: robot?.siege ?? null,
        detail,
        sequence: [...this.sequence.slice(-15)],
      },
      cle,
    );
    this.trace(`VIOLATION ${invariant} : ${detail}`);
  }

  /** Options de création : minuteries courtes, et une composition qui varie selon la table. */
  optionsInitiales(): Record<string, unknown> {
    const base = { tempsNuit: this.ctx.config.tempsNuit, tempsJour: this.ctx.config.tempsJour };
    if (this.index % 2 === 0) return { ...base, auto: true };
    // Une table sur deux joue avec des rôles optionnels (Ancien, Corbeau, Bouc, Petite Fille, Loup Blanc…).
    const loups = Math.max(1, Math.floor(this.taille / 4));
    const place = Math.max(0, this.taille - loups - 1);
    const roles = CHOOSABLE_ROLES.filter(() => this.rng.nextInt(100) < 55).slice(0, place);
    return { ...base, auto: false, loups, roles };
  }

  async demarrer(): Promise<boolean> {
    const createur = new Robot(0, this, true);
    this.robots.push(createur);
    createur.demarrer();
    const limite = Date.now() + 15_000;
    while (this.code === null && Date.now() < limite) await pause(50);
    if (this.code === null) return false;
    this.trace(`table créée, ${String(this.taille)} robots attendus, graine ${String(this.graine)}`);
    for (let i = 1; i < this.taille; i += 1) {
      const r = new Robot(i, this, false);
      this.robots.push(r);
      r.demarrer();
      await pause(60);
    }
    this.lobbyDepuis = Date.now();
    this.horloge = setInterval(() => {
      this.tic();
    }, 500);
    this.planifierPanne();
    return true;
  }

  // ── observation ─────────────────────────────────────────────────────

  noterSync(p: SyncPayload, maintenant: number): void {
    // Un sync en retard (robot dégelé) ne réécrit pas l'histoire de la table.
    if (p.serverNow < this.dernierServerNow) return;
    const nouveau = p.serverNow > this.dernierServerNow;
    this.dernierServerNow = p.serverNow;
    this.derniereRoom = p.room;
    this.derniereSyncA = maintenant;

    const status = p.room.status;
    if (status === 'playing' && this.statut !== 'playing') this.nouvellePartie(p.room, maintenant);
    if (status === 'lobby' && this.statut !== 'lobby') {
      this.statut = 'lobby';
      this.lobbyDepuis = maintenant;
    }
    if (status === 'finished' && this.statut !== 'finished') {
      this.statut = 'finished';
      this.finDepuis = maintenant;
      this.finSansHoteSignalee = false;
      this.phase = null;
      const partie = this.parties.at(-1);
      if (partie && partie.fin === null) {
        partie.fin = maintenant;
        partie.gagnant = p.game?.winner ?? null;
        partie.jour = p.game?.day ?? null;
        partie.placesPerdues = Math.max(0, partie.joueurs - p.room.players.length);
        this.ctx.journal.inc('parties-terminees');
        this.trace(`fin de la partie ${String(partie.numero)} : victoire « ${String(partie.gagnant)} » au jour ${String(partie.jour)} après ${String(Math.round((maintenant - partie.debut) / 1000))} s`);
      }
    }
    if (!nouveau) return;
    this.historique.push({ a: maintenant, s: p.serverNow });
    while (this.historique.length > 0 && maintenant - this.historique[0]!.a > 120_000) this.historique.shift();
    for (const e of p.events) {
      if (e.type === 'phase') this.nouvellePhase(e.phase, e.step ?? null, e.day, maintenant);
    }
    const g = p.game;
    if (g && !g.over && status === 'playing') {
      const cle = `${g.phase}|${g.step ?? ''}|${String(g.day)}`;
      if (this.phase?.cle !== cle) this.nouvellePhase(g.phase, g.step, g.day, maintenant);
    }
  }

  private nouvellePartie(room: RoomView, maintenant: number): void {
    this.statut = 'playing';
    this.partieNumero += 1;
    this.verites.clear();
    this.phase = null;
    this.hotePartiCettePartie = false;
    this.parties.push({
      numero: this.partieNumero,
      debut: maintenant,
      fin: null,
      joueurs: room.players.length,
      gagnant: null,
      jour: null,
      phases: 0,
      phasesAuChrono: 0,
      pannes: 0,
      placesPerdues: 0,
    });
    this.ctx.journal.inc('parties-lancees');
    this.trace(`partie ${String(this.partieNumero)} lancée à ${String(room.players.length)} joueurs (options ${JSON.stringify({ auto: room.options.auto, loups: room.options.loups, roles: room.options.roles })})`);
  }

  private nouvellePhase(phase: string, step: string | null, day: number, maintenant: number): void {
    const cle = `${phase}|${step ?? ''}|${String(day)}`;
    if (this.phase && this.phase.cle === cle && maintenant - this.phase.debut < 1_000) return;
    const partie = this.parties.at(-1);
    const precedente = this.phase;
    if (precedente && partie) {
      const { tempsNuit, tempsJour } = this.ctx.config;
      const duree = maintenant - precedente.debut;
      const budget = budgetPhase(precedente.phase, precedente.step, tempsNuit, tempsJour);
      // Une phase menée jusqu'au bout de sa minuterie : quelqu'un n'a pas joué.
      if (budget > 0 && duree >= budget - 1_500 && precedente.step !== 'sorciere' && precedente.step !== 'loupBlanc') {
        partie.phasesAuChrono += 1;
        this.ctx.journal.inc('phases-au-chrono');
      }
      this.ctx.journal.ecrire({ type: 'phase', table: this.index, partie: partie.numero, cle: precedente.cle, dureeMs: duree, budgetMs: budget });
    }
    this.phase = { cle, phase, step, day, debut: maintenant, signalee: false };
    if (partie) partie.phases += 1;
    this.ctx.journal.inc('phases');
  }

  get phaseActuelle(): { cle: string; debut: number } | null {
    return this.phase;
  }

  /** Le plus récent sync reçu par la table avant `limite`. */
  syncAvant(limite: number): { a: number; s: number } | null {
    for (let i = this.historique.length - 1; i >= 0; i -= 1) {
      const h = this.historique[i]!;
      if (h.a <= limite) return h;
    }
    return null;
  }

  robotHote(): Robot | undefined {
    const id = this.derniereRoom?.hostId;
    return this.robots.find((r) => r.join?.playerId === id);
  }

  // ── pilotage et invariants (toutes les 500 ms) ─────────────────────

  private tic(): void {
    const maintenant = Date.now();
    this.piloter(maintenant);
    for (const r of this.robots) r.verifier(maintenant);

    const { config } = this.ctx;
    if (this.statut === 'playing' && this.phase && !this.phase.signalee) {
      const budget = budgetPhase(this.phase.phase, this.phase.step, config.tempsNuit, config.tempsJour);
      const ecoule = maintenant - this.phase.debut;
      if (budget > 0 && ecoule > budget + config.margePhaseMs && maintenant - this.derniereSyncA < 5_000) {
        this.phase.signalee = true;
        this.violation('phase-figee', 'critique', `phase ${this.phase.cle} ouverte depuis ${String(Math.round(ecoule / 1000))} s (budget ${String(budget / 1000)} s + marge ${String(config.margePhaseMs / 1000)} s)`, null);
      } else if (budget > 0 && ecoule > budget + config.margePhaseMs) {
        this.phase.signalee = true;
        this.violation('phase-figee', 'critique', `phase ${this.phase.cle} : aucun signe de vie depuis ${String(Math.round(ecoule / 1000))} s (aucun robot ne reçoit plus rien)`, null);
      }
    }
    const partie = this.parties.at(-1);
    if (partie && partie.fin === null && maintenant - partie.debut > config.partieMaxMs && this.statut === 'playing') {
      this.violation('partie-interminable', 'critique', `partie ${String(partie.numero)} en cours depuis ${String(Math.round((maintenant - partie.debut) / 1000))} s`, null, `interminable:${String(this.index)}:${String(partie.numero)}`);
    }
  }

  private piloter(maintenant: number): void {
    const room = this.derniereRoom;
    if (!room || !this.enCampagne) return;
    if (this.statut === 'lobby' && !this.lancementEnCours) {
      const hote = this.robotHote();
      if (!hote?.disponible) return;
      const presents = room.players.filter((p) => p.connected).length;
      const attendus = this.robots.filter((r) => r.etat !== 'arrete').length;
      const attente = maintenant - this.lobbyDepuis;
      if (presents >= MIN_PLAYERS && attente > 2_000 && (presents >= attendus || attente > 12_000)) {
        this.lancementEnCours = true;
        void hote
          .requete('room:start', {})
          .then(async (r) => {
            if (!r.ok) {
              this.ctx.journal.inc(`lancement-refuse:${r.error}`);
              this.trace(`lancement refusé : ${r.error}`);
              if (!this.optionsAuto && !r.perdue) {
                // Composition impossible à ce nombre : on repasse en automatique.
                this.optionsAuto = true;
                await hote.requete('room:options', {
                  options: { tempsNuit: this.ctx.config.tempsNuit, tempsJour: this.ctx.config.tempsJour, auto: true },
                });
              }
            }
          })
          .finally(() => {
            this.lancementEnCours = false;
            this.lobbyDepuis = Date.now();
          });
      }
    }
    if (this.statut === 'finished' && !this.revancheEnCours && maintenant - this.finDepuis > 3_000) {
      const hote = this.robotHote();
      if (!hote?.disponible) {
        if (!this.finSansHoteSignalee && maintenant - this.finDepuis > this.ctx.config.finSansHoteMs) {
          this.finSansHoteSignalee = true;
          const vu = room.players.find((p) => p.id === room.hostId);
          this.violation(
            'table-bloquee-hote-absent',
            'majeure',
            `partie finie depuis ${String(Math.round((maintenant - this.finDepuis) / 1000))} s, l'hôte (siège ${String(vu?.seat ?? '?')}, connected=${String(vu?.connected)}, état robot ${hote?.etat ?? 'inconnu'}) ne peut pas relancer et personne d'autre n'en a le droit`,
            hote ?? null,
          );
        }
        return;
      }
      this.revancheEnCours = true;
      void hote
        .requete('room:rematch', {})
        .then((r) => {
          if (!r.ok) this.ctx.journal.inc(`revanche-refusee:${r.error}`);
        })
        .finally(() => {
          this.revancheEnCours = false;
        });
    }
  }

  // ── pannes ──────────────────────────────────────────────────────────

  private planifierPanne(): void {
    const { pannesParMinute } = this.ctx.config;
    if (pannesParMinute <= 0) return;
    const moyenne = 60_000 / pannesParMinute;
    const tirage = -Math.log(1 - Math.min(0.999, unite(this.rng))) * moyenne;
    const delai = Math.min(Math.max(tirage, 1_000), moyenne * 4);
    this.minuteurPanne = setTimeout(() => {
      this.minuteurPanne = null;
      if (!this.enCampagne) return;
      void this.injecter();
      this.planifierPanne();
    }, delai);
  }

  private tirerType(): TypePanne {
    const { poids } = this.ctx.config;
    const total = TYPES_PANNE.reduce((s, t) => s + Math.max(0, poids[t]), 0);
    let x = unite(this.rng) * total;
    for (const t of TYPES_PANNE) {
      x -= Math.max(0, poids[t]);
      if (x < 0) return t;
    }
    return 'coupure';
  }

  private async injecter(): Promise<void> {
    if (this.statut !== 'playing') return;
    const type = this.tirerType();
    let victime: Robot | undefined;
    if (type === 'hotePart') {
      if (this.hotePartiCettePartie) return;
      victime = this.robotHote();
      if (!victime?.disponible) return;
      this.hotePartiCettePartie = true;
    } else {
      let candidats = this.robots.filter((r) => r.disponible);
      if (type === 'doublon' || type === 'enVol') {
        // Ces pannes n'ont de sens que sur un coup encore à jouer.
        const aJouer = candidats.filter((r) => r.game?.prompt && !r.game.acted);
        if (aJouer.length > 0) candidats = aJouer;
      }
      if (candidats.length === 0) return;
      victime = candidats[this.rng.nextInt(candidats.length)];
    }
    if (!victime) return;
    const partie = this.parties.at(-1);
    if (partie) partie.pannes += 1;
    this.ctx.journal.inc(`panne:${type}`);
    const qui = victime.etiquette();
    const phase = this.phase?.cle ?? '?';
    this.trace(`PANNE ${type} → ${qui} en ${phase}`);
    try {
      const detail = await victime.panne(type);
      this.ctx.journal.ecrire({ type: 'panne', table: this.index, code: this.code, partie: this.partieNumero, panne: type, robot: qui, phase, detail });
      this.trace(`   ${type} ${qui} : ${detail}`);
    } catch (error) {
      this.trace(`   ${type} ${qui} : erreur du banc ${(error as Error).message}`);
    }
  }

  /** Le serveur a redémarré : les tables en mémoire sont perdues. */
  marquerPerdue(): void {
    this.statut = 'perdue';
  }

  async arreter(): Promise<void> {
    this.enCampagne = false;
    if (this.minuteurPanne !== null) clearTimeout(this.minuteurPanne);
    if (this.horloge !== null) clearInterval(this.horloge);
    await Promise.all(this.robots.map((r) => r.arreter()));
  }

  /** Plus de pannes ni de relance ; la partie en cours va à son terme. */
  finirCampagne(): void {
    this.enCampagne = false;
    if (this.minuteurPanne !== null) clearTimeout(this.minuteurPanne);
  }

  get partieEnCours(): boolean {
    return this.statut === 'playing';
  }
}
