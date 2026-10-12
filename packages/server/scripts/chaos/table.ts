/**
 * Les tables du banc de chaos et leurs robots.
 *
 * Un robot de chaos est un joueur ordinaire qui parle par le **canal du
 * moteur** (`Channel`, comme le navigateur) : battement, chien de garde,
 * reconnexion à aléa plein, codes de fermeture (4001 : on ne reprend pas ;
 * 1012 : on revient aussitôt), `hello` lu, reprise par le jeton avec
 * `lastSeq` (D22). Chaque « onglet » est un canal ; un téléphone en veille
 * est un onglet dont la porte est fermée (minuteries et évènements retenus,
 * `canal-node.ts`) pendant que le relais TCP gèle ses octets ; un réseau
 * coupé est une fabrique de sockets qui refuse d'ouvrir. Au retour, le robot
 * fait ce que fait la page : `wake()`.
 *
 * Le robot reprend la politique de `client/src/lib/actions.ts`
 * (`reprendrePlace`) : refus passager (`rate`, `internal`, silence) retenté
 * après 1, 2 puis 4 s, refus définitif (`gone`, `started`, `full`) qui fait
 * oublier la table.
 *
 * La table, elle, est l'observateur : elle suit les phases et leurs
 * échéances, compte les parties, tient la vérité des rôles (chaque robot
 * connaît le sien), injecte les pannes et vérifie les invariants.
 */

import type WebSocket from 'ws';

import {
  ABANDON_MS,
  ChannelError,
  CHOOSABLE_ROLES,
  MIN_PLAYERS,
  RECONNECT_GRACE_MS,
  WAKE_HIDDEN_MS,
  createSeededRng,
  eventSeqOf,
  type Action,
  type Channel,
  type GameView,
  type JoinResult,
  type RoleId,
  type RoomView,
  type Rng,
  type SyncPayload,
} from '@garoutom/engine';

import { canalNode, Porte } from '../canal-node.js';
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
  'mobile',
  'tousPartent',
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
  mobile: 'g · coupure longue 90 s – 6 min (D17, D18)',
  tousPartent: 'h · toute la table part, retour décalé (D19)',
};

/** Les poids de la campagne de référence : `mobile` et `tousPartent` sont des campagnes à part. */
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
  mobile: 0,
  tousPartent: 0,
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
  /** Un robot qui ne reçoit plus un évènement public que la table a reçu, au-delà de ce délai. */
  desyncMs: number;
  partieMaxMs: number;
  /** Combien de temps on tolère une fin de partie sans hôte pour relancer. */
  finSansHoteMs: number;
  /** Une adresse par robot plutôt qu'une par table (le Wi-Fi commun). */
  ipParRobot: boolean;
  /** Les bornes d'une absence « mobile », en ms. */
  mobileMs: [number, number];
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

/** Les refus que le client ne retente pas (`client/src/lib/actions.ts`). */
const REFUS_DEFINITIFS: ReadonlySet<string> = new Set(['gone', 'started', 'full']);
/** Les attentes entre deux reprises ratées, comme le client. */
const DELAIS_REPRISE_MS: readonly number[] = [1_000, 2_000, 4_000];
/** La phase la plus longue (élection) : la marge d'une mort d'abandon. */
const PHASE_MAX_MS = 90_000;

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const unite = (rng: Rng): number => rng.nextInt(1_000_000) / 1_000_000;
const entre = (rng: Rng, min: number, max: number): number => Math.round(min + unite(rng) * (max - min));

/* ------------------------------------------------------------------ */
/* Un onglet : un canal du moteur                                      */
/* ------------------------------------------------------------------ */

type Reponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string; code?: string; perdue?: boolean; delai?: boolean; excuse?: boolean };

let compteurOnglets = 0;

class Onglet {
  readonly id = ++compteurOnglets;
  readonly porte = new Porte();
  readonly canal: Channel;
  readonly creeA = Date.now();
  /** La socket brute courante (le banc la tue, la retrouve dans le relais). */
  ws: WebSocket | null = null;
  /** Réseau coupé : la fabrique de sockets refuse d'ouvrir. */
  horsLigne = false;
  ferme = false;
  /** Fermé en 4001 : la place vit ailleurs. */
  remplace = false;
  syncs = 0;
  hellos = 0;
  sockets = 0;
  /** Nombre de gels subis : une demande sans accusé pendant un gel est excusée. */
  gels = 0;
  /** L'empreinte du dernier `sync` reçu, pour la règle du silence (D23). */
  empreinte: string | null = null;
  /** Les `sync` attendus en réponse à une entrée : ils peuvent répéter le précédent. */
  attenteFresh = 0;
  dernierSync: SyncPayload | null = null;

  constructor(url: string, ip: string, journal: Journal) {
    this.canal = canalNode(url, {
      // Node (GAROUTOM_PROXY=1) lit x-forwarded-for ; le Worker, CF-Connecting-IP.
      entetes: { 'x-forwarded-for': ip, 'cf-connecting-ip': ip },
      porte: this.porte,
      horsLigne: () => this.horsLigne,
      surSocket: (ws) => {
        this.ws = ws;
        this.sockets += 1;
      },
      log: (message) => {
        journal.inc(`canal:${message.replace(/^Garoutom : /, '').replace(/\(.*\)$/, '').trim()}`);
      },
    });
    this.canal.on('connect', () => {
      this.empreinte = null;
      this.attenteFresh = 0;
    });
  }

  get connecte(): boolean {
    return this.canal.connected;
  }

  get localPort(): number | null {
    const brut = (this.ws as unknown as { _socket?: { localPort?: number } } | null)?._socket;
    return brut?.localPort ?? null;
  }

  async demander(event: string, payload: unknown): Promise<Reponse> {
    const gels = this.gels;
    try {
      const data = await this.canal.request(event, payload);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof ChannelError) {
        return error.code === undefined ? { ok: false, error: error.message } : { ok: false, error: error.message, code: error.code };
      }
      const message = (error as Error).message;
      if (message === 'Le serveur ne répond pas') {
        return { ok: false, error: message, delai: true, excuse: this.gels !== gels || this.porte.fermee };
      }
      return { ok: false, error: message, perdue: true };
    }
  }

  /**
   * Une entrée (`room:join`, `room:create`) : le serveur y répond par un
   * `sync` forcé, envoyé avant l'accusé — il peut répéter le précédent.
   */
  async entree(event: string, payload: unknown): Promise<Reponse> {
    this.attenteFresh += 1;
    try {
      return await this.demander(event, payload);
    } finally {
      this.attenteFresh = Math.max(0, this.attenteFresh - 1);
    }
  }

  envoyerBrut(texte: string): void {
    if (this.ws && this.ws.readyState === this.ws.OPEN) this.ws.send(texte);
  }

  /** Fermeture brutale de la socket courante, sans prévenir le serveur proprement. */
  terminer(): void {
    this.ws?.terminate();
  }

  /** L'onglet se ferme (ou la page se recharge) : plus de reconnexion. */
  fermer(): void {
    this.ferme = true;
    this.porte.ouvrir();
    this.canal.close();
  }
}

/* ------------------------------------------------------------------ */
/* Un robot                                                            */
/* ------------------------------------------------------------------ */

type Etat = 'normal' | 'coupe' | 'gel' | 'exclu' | 'manoeuvre' | 'arrete';

/** Ce qu'on sait d'un robot au moment où il perd sa connexion. */
interface Reprise {
  type: string;
  /** Le retour (réseau revenu, écran rallumé) : la latence de reprise part d'ici. */
  depuis: number | null;
  absenceMs: number;
  horsGrace: boolean;
  siege: number | null;
  role: RoleId | null;
  vivant: boolean | null;
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
  onglet: Onglet;
  etat: Etat = 'normal';
  /** La reprise par le jeton est confirmée sur l'onglet courant. */
  rattache = false;
  siege: number | null = null;
  role: RoleId | null = null;
  rolePartie = -1;
  room: RoomView | null = null;
  game: GameView | null = null;
  derniereSync = 0;
  dernierServerNow = 0;
  /** Le dernier numéro d'évènement vu (D22) : rendu dans `room:join.lastSeq`. */
  dernierSeq = 0;
  /** Depuis quand le serveur ne nous voit plus (au plus tôt) : les morts d'abandon s'y comparent. */
  absentDepuis: number | null = null;
  private moment: string | null = null;
  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private reprise: Reprise | null = null;
  /** La perte de connexion qui suit est voulue par le banc : ce n'est pas une surprise. */
  private attendue = false;
  private rattrapageDepuis: number | null = null;
  private rattrapageCible = 0;
  /** Le dernier réveil : les octets retenus par le relais mettent un instant à arriver. */
  private reveilA = 0;
  private desyncSignale = false;
  private entreeEnCours = false;
  private readonly nuits = new Set<string>();

  constructor(
    readonly index: number,
    readonly table: Table,
    readonly createur: boolean,
  ) {
    this.nom = `${PRENOMS[index % PRENOMS.length]!} T${String(table.index)}`.slice(0, 16);
    this.rng = createSeededRng((table.graine + index * 7919) >>> 0);
    this.onglet = this.nouvelOnglet();
  }

  private get ctx(): Contexte {
    return this.table.ctx;
  }

  private get j(): Journal {
    return this.table.ctx.journal;
  }

  get ip(): string {
    return this.ctx.config.ipParRobot ? `10.77.${String(this.table.index)}.${String(100 + this.index)}` : `10.77.${String(this.table.index)}.1`;
  }

  /** Assis à la table selon la dernière vue de la table. */
  get assis(): boolean {
    const id = this.join?.playerId;
    return id !== undefined && (this.table.derniereRoom?.players.some((p) => p.id === id) ?? false);
  }

  get disponible(): boolean {
    return this.etat === 'normal' && this.rattache && this.onglet.connecte && this.assis;
  }

  etiquette(): string {
    return `${this.nom} (siège ${String(this.siege ?? '?')}, ${this.role ?? '?'})`;
  }

  private violation(invariant: string, gravite: Gravite, detail: string, cle?: string): void {
    this.table.violation(invariant, gravite, detail, this, cle);
  }

  // ── onglets ─────────────────────────────────────────────────────────

  /** Un onglet neuf, branché sur ce robot ; il n'anime le robot que s'il est l'onglet courant. */
  private nouvelOnglet(): Onglet {
    const o = new Onglet(this.ctx.config.url, this.ip, this.j);
    o.canal.on('connect', () => {
      if (o !== this.onglet || this.etat === 'arrete') return;
      if (this.reprise && this.reprise.depuis === null) this.reprise.depuis = Date.now();
      void this.entrer(o);
    });
    o.canal.on('disconnect', () => {
      if (o !== this.onglet) return;
      this.surPerte(o);
    });
    o.canal.on('sync', (p) => {
      this.recevoir(o, p);
    });
    o.canal.on('notice', () => {
      this.j.inc('avis');
    });
    o.canal.on('hello', (h) => {
      o.hellos += 1;
      this.j.inc('hello');
      if (!h.capabilities.includes('ping')) {
        this.violation('hello-sans-ping', 'majeure', `hello sans la capacité ping : ${JSON.stringify(h)}`, 'hello');
      }
    });
    o.canal.on('replaced', () => {
      o.remplace = true;
      this.j.inc('fermetures-4001');
      if (o !== this.onglet || this.etat === 'manoeuvre' || this.etat === 'arrete') return;
      // Personne d'autre n'a pris la place : un 4001 inattendu.
      this.violation('remplace-inattendu', 'majeure', `fermé en 4001 (partie ouverte ailleurs) sans seconde connexion`);
      setTimeout(() => {
        if (o === this.onglet && this.etat !== 'arrete') o.canal.connect();
      }, 2_000);
    });
    o.canal.on('gone', () => {
      this.j.inc('fermetures-4002');
    });
    return o;
  }

  demarrer(): void {
    // Le canal s'ouvre de lui-même : `connect` appellera `entrer`.
  }

  /** Le serveur répond de nouveau : la latence d'une reprise de redémarrage part d'ici. */
  serveurRevenu(a: number): void {
    if (this.reprise?.type === 'redemarrage' && this.reprise.depuis === null) this.reprise.depuis = a;
  }

  /** La connexion de l'onglet courant est tombée. */
  private surPerte(o: Onglet): void {
    this.rattache = false;
    this.annulerMinuteur();
    if (this.etat === 'arrete') return;
    if (!this.attendue && this.etat === 'normal') {
      this.j.inc('fermetures-inattendues');
      this.table.trace(`${this.etiquette()} : fermeture inattendue de la connexion (onglet ${String(o.id)})`);
    }
    this.absentDepuis ??= Date.now();
    if (!this.reprise && this.join) {
      const type = this.table.serveurEnBas ? 'redemarrage' : this.attendue ? 'reveil' : 'inattendue';
      this.reprise = this.instantane(type, 0);
      // Le retour est immédiat : le canal rouvre de lui-même.
      if (type !== 'redemarrage') this.reprise.depuis = Date.now();
    }
  }

  private instantane(type: string, absenceMs: number): Reprise {
    const statut = this.table.derniereRoom?.status;
    const meme = this.rolePartie === this.table.partieNumero;
    const moi = this.game?.you;
    return {
      type,
      depuis: null,
      absenceMs,
      horsGrace: absenceMs > RECONNECT_GRACE_MS,
      siege: meme ? this.siege : null,
      role: meme ? this.role : null,
      vivant: meme && moi ? moi.alive : null,
      partie: this.table.partieNumero,
      enPartie: statut === 'playing',
      joinDouble: false,
      actionEnVol: null,
      momentEnVol: null,
      joinEnvoye: false,
    };
  }

  /** Entrer, ou reprendre sa place, sur l'onglet qui vient de s'ouvrir. */
  private async entrer(o: Onglet): Promise<void> {
    if (this.etat === 'arrete' || o.ferme || this.entreeEnCours) return;
    this.entreeEnCours = true;
    try {
      await this.entrerSansGarde(o);
    } finally {
      this.entreeEnCours = false;
    }
  }

  private async entrerSansGarde(o: Onglet): Promise<void> {
    const { code } = this.table;
    if (this.join) {
      const r = this.reprise;
      if (r) r.joinEnvoye = true;
      for (let essai = 0; ; essai += 1) {
        // Un stockage vidé ne coûte pas la place : une fois sur cinq, sans pseudo.
        const corps = {
          code: this.join.code,
          name: this.rng.nextInt(5) === 0 ? '' : this.nom,
          token: this.join.token,
          lastSeq: this.dernierSeq,
        };
        const essais = r?.joinDouble && essai === 0 ? [o.entree('room:join', corps), o.entree('room:join', corps)] : [o.entree('room:join', corps)];
        const reponses = await Promise.all(essais);
        const premiere = reponses[0]!;
        if (r?.joinDouble && essai === 0) {
          this.j.inc(`joinDouble:${reponses.map((x) => (x.ok ? 'ok' : (x.code ?? x.error))).join(' / ')}`);
        }
        if (premiere.ok) {
          const data = premiere.data as JoinResult;
          if (data.playerId !== this.join.playerId) {
            this.j.inc('reprise-nouvelle-identite');
            this.table.trace(`${this.etiquette()} : reprise par le jeton → NOUVELLE place (${data.playerId.slice(0, 8)})`);
          }
          this.join = data;
          this.rattache = o === this.onglet;
          if (this.etat === 'exclu') this.etat = 'normal';
          if (this.reprise && this.room) this.validerReprise(this.room, this.game);
          if (r?.joinDouble) {
            setTimeout(() => {
              this.verifierToujoursAssis('joinDouble');
            }, 1_500);
          }
          return;
        }
        if (premiere.perdue || !o.connecte) return; // la reconnexion relancera la reprise
        const passager = premiere.delai === true || premiere.code === 'rate' || premiere.code === 'internal';
        const attente = DELAIS_REPRISE_MS[essai];
        if (passager && attente !== undefined) {
          this.j.inc(`reprise-retentee:${premiere.code ?? premiere.error}`);
          await pause(attente);
          if (o !== this.onglet || !o.connecte || this.etat === 'arrete') return;
          continue;
        }
        if (passager) {
          // Le client passe en « échec » et attend la prochaine reconnexion.
          this.j.inc(`reprise-echec:${premiere.code ?? premiere.error}`);
          this.violation('reprise-bloquee', 'majeure', `reprise refusée quatre fois de suite (${premiere.code ?? premiere.error}) : « ${premiere.error} »`, `bloquee:${this.nom}`);
          this.pollTimer = setTimeout(() => {
            this.pollTimer = null;
            if (o === this.onglet && o.connecte) void this.entrer(o);
          }, 10_000);
          return;
        }
        this.refusReprise(premiere.error, premiere.code);
        return;
      }
    }
    if (this.createur && code === null) {
      const r = await o.entree('room:create', { name: this.nom, options: this.table.optionsInitiales() });
      if (r.ok) {
        this.join = r.data as JoinResult;
        this.table.code = this.join.code;
        this.rattache = true;
        this.etat = 'normal';
      } else {
        this.j.inc(`creation-refusee:${r.code ?? r.error}`);
      }
      return;
    }
    if (code === null) return;
    const r = await o.entree('room:join', { code, name: this.nom });
    if (r.ok) {
      this.join = r.data as JoinResult;
      this.rattache = true;
      if (this.etat === 'exclu') {
        this.j.inc('retours-par-le-salon');
        this.table.trace(`${this.nom} revient par le salon (nouvelle place)`);
      }
      this.etat = 'normal';
      this.annulerPoll();
    } else if (!r.perdue) {
      this.devenirExclu(r.code ?? r.error);
    }
  }

  private refusReprise(erreur: string, code: string | undefined): void {
    const r = this.reprise;
    const absentDepuis = this.absentDepuis;
    this.reprise = null;
    this.j.inc('reprises-refusees');
    this.j.inc(`reprise-refusee:${code ?? erreur}`);
    if (code === 'gone' && this.table.apresRedemarrage(Date.now())) {
      this.j.inc('reprise-refusee:apres-redemarrage-serveur');
      this.table.violation(
        'table-perdue-au-redemarrage',
        'critique',
        `après le redémarrage du serveur, la reprise par le jeton répond « ${erreur} » : la partie en cours (${String(this.table.partieNumero)}) est perdue pour toute la table`,
        this,
        `crash:${String(this.table.index)}`,
      );
    } else if (r && (r.partie !== this.table.partieNumero || (absentDepuis !== null && this.table.revancheA > absentDepuis))) {
      // Une revanche a eu lieu pendant l'absence. D17 : le jeton vaut jusqu'à
      // la revanche, et la revanche garde ceux qui sont encore en grâce.
      const auRevanche = absentDepuis === null ? null : this.table.revancheA - absentDepuis;
      if (auRevanche !== null && auRevanche < RECONNECT_GRACE_MS - 2_000) {
        this.violation(
          'evince-par-la-revanche',
          'majeure',
          `${r.type} pendant la partie ${String(r.partie)} ; absent depuis ${String(Math.round(auRevanche / 1000))} s quand la revanche a été lancée (dans la grâce) — elle l'a rayé de la table : « ${erreur} »`,
        );
      } else {
        this.j.inc(`reprise-refusee:revanche-apres-la-grace (D17)`);
      }
    } else if (r?.enPartie) {
      const dansLaGrace = !r.horsGrace;
      this.table.trace(`${this.etiquette()} : reprise REFUSÉE après ${r.type} (absence ${String(Math.round(r.absenceMs / 1000))} s) : ${erreur}`);
      this.violation(
        dansLaGrace ? 'reprise-refusee-dans-la-grace' : 'place-perdue-apres-grace',
        dansLaGrace ? 'critique' : 'majeure',
        `${r.type}, absence ${String(Math.round(r.absenceMs / 1000))} s (grâce ${String(RECONNECT_GRACE_MS / 1000)} s) : « ${erreur} » (${code ?? 'sans code'}) — le joueur ne retrouve ni sa place ni son rôle (${r.role ?? '?'})`,
      );
    }
    this.devenirExclu(code ?? erreur);
  }

  /** Sans place : on retentera d'entrer par le code, comme un humain qui revient au salon. */
  private devenirExclu(raison: string): void {
    this.etat = 'exclu';
    this.join = null;
    this.siege = null;
    this.rattache = false;
    this.reprise = null;
    this.absentDepuis = null;
    this.annulerMinuteur();
    this.j.inc(`refus-entree:${raison}`);
    this.planifierPoll();
  }

  private planifierPoll(): void {
    this.annulerPoll();
    // Pas trop souvent : les `join` ratés comptent contre le Wi-Fi de toute la table.
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      if (this.etat !== 'exclu') return;
      const o = this.onglet;
      if (o.connecte) void this.entrer(o);
      this.planifierPoll();
    }, 20_000);
  }

  private annulerPoll(): void {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  // ── réception ───────────────────────────────────────────────────────

  private recevoir(o: Onglet, p: SyncPayload): void {
    // Aucun jeton d'un autre joueur ne doit jamais traverser le réseau.
    const brut = JSON.stringify(p);
    for (const autre of this.table.robots) {
      const jeton = autre.join?.token;
      if (autre !== this && jeton && brut.includes(jeton)) {
        this.violation('fuite-jeton', 'critique', `le jeton de ${autre.nom} arrive chez ${this.nom}`, `jeton:${autre.nom}:${this.nom}`);
      }
    }
    o.syncs += 1;
    o.dernierSync = p;

    // D23 : jamais deux fois le même `sync` sur une connexion, hors réponse à une entrée.
    const empreinte = JSON.stringify([p.room, p.game, p.seq]);
    if (empreinte === o.empreinte && o.attenteFresh === 0 && p.events.length === 0 && p.replay !== true) {
      this.j.inc('syncs-identiques');
      this.violation('sync-identique', 'majeure', `le même sync reçu deux fois de suite (phase ${p.game?.phase ?? p.room.status}, seq ${String(p.seq)})`, `identique:${String(this.table.index)}`);
    }
    o.empreinte = empreinte;

    if (o !== this.onglet) return; // un onglet secondaire n'anime pas le robot
    this.surSync(p);
  }

  private surSync(p: SyncPayload): void {
    const maintenant = Date.now();
    // Le journal public est numéroté pour la vie de la table (D22).
    if (p.seq < this.dernierSeq) {
      this.violation('seq-recule', 'majeure', `seq ${String(this.dernierSeq)} → ${String(p.seq)}`, `seq:${this.nom}:${String(this.dernierSeq)}`);
    }
    if (p.replay === true) {
      this.j.inc('rattrapages');
      this.j.inc('evenements-rejoues', p.events.length);
      if (p.events.length > 0 && eventSeqOf(p, 0) !== this.dernierSeq + 1) this.j.inc('rattrapages-partiels');
    }
    this.dernierSeq = Math.max(this.dernierSeq, p.seq);
    this.room = p.room;
    this.game = p.game;
    this.derniereSync = maintenant;
    if (p.serverNow > this.dernierServerNow) this.dernierServerNow = p.serverNow;
    this.desyncSignale = false;
    // Un sync en retard (robot dégelé) peut venir de la partie précédente : on
    // ne le compare pas à la vérité de la partie en cours.
    const perime = p.serverNow < this.table.dernierServerNow;
    if (perime) this.j.inc('syncs-perimes-non-verifies');
    this.table.noterSync(p, maintenant, this);

    const moi = p.room.players.find((x) => x.id === this.join?.playerId);
    if (moi) this.siege = moi.seat;
    if (this.reprise?.joinEnvoye) this.validerReprise(p.room, p.game);
    if (!this.reprise && moi?.connected && this.etat === 'normal') this.absentDepuis = null;
    if (this.rattrapageDepuis !== null && p.serverNow >= this.rattrapageCible && p.serverNow > 0) {
      this.j.latence('rattrapage-apres-veille', maintenant - this.rattrapageDepuis);
      this.rattrapageDepuis = null;
    }

    const game = p.game;
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
      // Le silence de la nuit, vu d'un villageois (D23).
      if (game.phase === 'nuit' && game.you.role === 'villageois' && game.you.alive && !game.over) {
        const nuit = `${String(partie)}:${String(game.day)}`;
        if (!this.nuits.has(nuit)) {
          this.nuits.add(nuit);
          this.j.inc('nuits-villageois');
        }
        this.j.inc('syncs-nuit-villageois');
        if (p.events.length === 0) this.j.inc('syncs-nuit-villageois-sans-evenement');
      }
    }

    if (this.etat !== 'normal' || !this.rattache) return;
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
    if (!moi?.connected || !this.rattache) return;
    this.reprise = null;
    const absence = this.absentDepuis === null ? 0 : Date.now() - this.absentDepuis;
    this.absentDepuis = null;
    const lat = Date.now() - (r.depuis ?? Date.now());
    this.j.inc('reprises-reussies');
    this.j.inc(`reprise-ok:${r.type}${r.horsGrace ? ' (hors grâce)' : ''}`);
    // Un redémarrage du serveur se mesure à part : la panne n'est pas celle du réseau.
    // Un retour qui tombe pendant un redémarrage du serveur attend le serveur, pas le réseau.
    const redemarrage = r.type === 'redemarrage' || this.table.redemarrageEntre(r.depuis ?? Date.now(), Date.now());
    if (!redemarrage) this.j.latence('reprise', lat);
    this.j.latence(`reprise:${redemarrage && r.type !== 'redemarrage' ? `${r.type} (pendant un redémarrage)` : r.type}`, lat);
    this.moment = null;
    if (lat > this.ctx.config.repriseMaxMs && !redemarrage) {
      this.violation('reprise-lente', 'mineure', `${r.type} : sync complet ${String(lat)} ms après le retour (seuil ${String(this.ctx.config.repriseMaxMs)} ms)`);
    }
    if (r.enPartie && room.status !== 'lobby' && r.partie === this.table.partieNumero) {
      if (r.siege !== null && moi.seat !== r.siege) {
        this.violation('siege-change', 'critique', `${r.type} : siège ${String(r.siege)} → ${String(moi.seat)}`);
      }
      if (room.status === 'playing') {
        if (!game?.you) {
          this.violation('sync-incomplet', 'majeure', `${r.type} : reprise sans vue de partie`);
        } else {
          if (r.role !== null && game.you.role !== r.role) {
            this.violation('role-change', 'critique', `${r.type} : rôle ${r.role} → ${game.you.role} après reprise`);
          }
          // D18 : au-delà de cinq minutes d'absence (et d'une phase pour la clôture), le siège est mort.
          if (
            r.vivant === true &&
            game.you.alive &&
            absence > ABANDON_MS + PHASE_MAX_MS + 15_000 &&
            !this.table.pauseDepuis(Date.now() - absence)
          ) {
            this.violation('abandon-manquant', 'majeure', `${r.type} : absent ${String(Math.round(absence / 1000))} s en pleine partie, revenu toujours vivant (D18 : abandon après ${String(ABANDON_MS / 1000)} s)`);
          }
          if (r.vivant === true && absence > ABANDON_MS) {
            this.j.inc(game.you.alive ? 'retour-apres-5-min:vivant' : 'retour-apres-5-min:mort');
          }
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
    const o = this.onglet;
    if (!game || this.etat !== 'normal' || !this.rattache) return;
    const cle = cleDeMoment(game);
    if (cle === null || game.acted || game.over) return;
    const action = decider(game, this.rng, { graine: this.table.graine });
    this.moment = cle;
    if (!action) return;
    const r = await o.demander('game:action', { action });
    this.compterReponse(r, 'coups');
  }

  private compterReponse(r: Reponse, prefixe: string): void {
    if (r.ok) this.j.inc(`${prefixe}-joues`);
    else if (r.perdue) this.j.inc(`${prefixe}-perdus-par-coupure`);
    else if (r.delai) {
      this.j.inc(`${prefixe}-sans-accuse`);
      if (r.excuse) this.j.inc('requetes-sans-accuse-excusees');
      else if (this.etat === 'normal') {
        this.violation('requete-sans-accuse', 'majeure', `demande sans accusé depuis 8 s sur une connexion saine`);
      }
    } else {
      this.j.inc(`${prefixe}-refuses`);
      this.j.inc(`coup-refuse:${r.code ?? r.error}`);
    }
  }

  requete(event: string, payload: unknown): Promise<Reponse> {
    return this.onglet.demander(event, payload);
  }

  // ── invariants propres au robot ─────────────────────────────────────

  verifier(maintenant: number): void {
    // Un robot branché et assis qui n'a pas reçu un évènement public que le
    // reste de la table a reçu il y a plus de `desyncMs`. (Un sync sans
    // évènement peut, lui, ne pas le concerner : la règle du silence, D23.)
    const t = this.table;
    const ref = t.syncAvant(maintenant - this.ctx.config.desyncMs);
    const o = this.onglet;
    if (
      ref !== null &&
      this.etat === 'normal' &&
      this.rattache &&
      o.connecte &&
      !o.porte.fermee &&
      maintenant - this.reveilA > 3_000 &&
      o.creeA < ref.a - 1_000 &&
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
        `connecté mais aucun évènement public depuis ${String(Math.round((maintenant - this.derniereSync) / 1000))} s alors que la table en reçoit ; vu par la table : ${enTable ? `assis, connected=${String(enTable.connected)}` : 'absent de la table'}`,
      );
      // Comme un humain qui recharge la page.
      this.recharger('desynchronisation');
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
    } else if (moi && !moi.connected && this.onglet.connecte) {
      this.violation('joueur-marque-absent', 'majeure', `après ${pourquoi}, le joueur est vu déconnecté alors que sa connexion est ouverte`);
    }
  }

  /** Plus de coup joué (le joueur pose son téléphone) ; la connexion reste. */
  suspendre(): void {
    this.etat = 'manoeuvre';
    this.annulerMinuteur();
  }

  /** Recharger la page : l'onglet se ferme, un autre s'ouvre, même jeton. */
  recharger(type: string): void {
    const ancien = this.onglet;
    this.reprise = this.instantane(type, 0);
    this.reprise.depuis = Date.now();
    this.rattache = false;
    this.onglet = this.nouvelOnglet();
    ancien.fermer();
    if (this.etat !== 'arrete' && this.etat !== 'exclu') this.etat = 'normal';
  }

  // ── les pannes ──────────────────────────────────────────────────────

  async panne(type: TypePanne): Promise<string> {
    switch (type) {
      case 'coupure':
        return this.coupure(false);
      case 'joinDouble':
        return this.coupure(true);
      case 'mobile':
        return this.mobile();
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
      case 'tousPartent':
        return 'panne de table';
    }
  }

  /**
   * Le réseau tombe (socket tuée, rien de propre) et revient au bout de
   * `absence` : la page reçoit `online` et réveille le canal.
   */
  partir(type: string, absence: number, joinDouble = false): Reprise {
    const r = this.instantane(type, absence);
    r.joinDouble = joinDouble;
    this.reprise = r;
    this.etat = 'coupe';
    this.rattache = false;
    this.annulerMinuteur();
    const o = this.onglet;
    o.horsLigne = true;
    this.attendue = true;
    this.absentDepuis = Date.now();
    o.terminer();
    setTimeout(() => {
      if (this.etat === 'arrete' || o !== this.onglet) return;
      o.horsLigne = false;
      this.etat = 'normal';
      this.attendue = false;
      r.depuis = Date.now();
      o.canal.wake();
    }, absence);
    return r;
  }

  /** (a) Fermeture brutale puis retour avec le jeton. */
  private coupure(joinDouble: boolean): string {
    const { horsGrace } = this.ctx.config;
    const t = this.table;
    const absence = joinDouble
      ? entre(t.rng, 300, 3_000)
      : unite(t.rng) < horsGrace
        ? entre(t.rng, 61_000, 90_000)
        : entre(t.rng, 500, 30_000);
    const r = this.partir(joinDouble ? 'joinDouble' : 'coupure', absence, joinDouble);
    return `absence ${String(absence)} ms${r.horsGrace ? ' (HORS GRÂCE)' : ''}`;
  }

  /** (g) Le téléphone dans la poche : 90 s à 6 min sans réseau (D17, D18). */
  private mobile(): string {
    const [min, max] = this.ctx.config.mobileMs;
    const absence = entre(this.table.rng, min, max);
    this.partir('mobile', absence);
    return `absence ${String(Math.round(absence / 1000))} s${absence > ABANDON_MS ? ' (au-delà de l’abandon)' : ''}`;
  }

  /** (b) Half-open : plus rien ne passe, rien ne se ferme ; le téléphone dort. */
  private veille(natMort: boolean): string {
    const o = this.onglet;
    const tuyau = this.ctx.relais.tuyauDe(o.localPort);
    if (!o.connecte || !tuyau) return 'annulée (pas de tuyau)';
    const t = this.table;
    const duree = natMort ? entre(t.rng, 5_000, 40_000) : entre(t.rng, 5_000, 45_000);
    const disparition = natMort && unite(t.rng) < 0.35;
    this.etat = 'gel';
    this.annulerMinuteur();
    o.gels += 1;
    o.porte.fermer();
    tuyau.geler();
    const debut = Date.now();
    this.absentDepuis ??= debut;
    const playerId = this.join?.playerId;
    // Pendant le gel, le serveur voit-il l'absence ?
    const sonde = setInterval(() => {
      const vu = t.derniereRoom?.players.find((p) => p.id === playerId);
      if (vu?.connected === true && Date.now() - debut > 4_000) {
        this.j.inc(`absence-non-detectee:${natMort ? 'natMort' : 'veille'}`);
        clearInterval(sonde);
      }
    }, 1_000);
    const reveil = (hiddenMs: number): void => {
      if (this.etat === 'arrete' || o !== this.onglet) return;
      this.etat = 'normal';
      this.moment = null;
      this.reveilA = Date.now();
      this.attendue = true;
      o.porte.ouvrir();
      o.canal.wake({ hiddenMs });
      this.attendue = false;
      if (this.reprise) this.reprise.depuis ??= Date.now();
    };
    setTimeout(() => {
      clearInterval(sonde);
      if (this.etat !== 'gel' || o !== this.onglet) return;
      if (natMort && disparition) {
        // Le téléphone ne revient pas : le serveur finira-t-il par le voir parti ?
        this.ctx.relais.zombifier(tuyau);
        o.horsLigne = true;
        const absence = entre(t.rng, 75_000, 85_000);
        setTimeout(() => {
          const vu = t.derniereRoom?.players.find((p) => p.id === playerId);
          if (vu?.connected === true && t.derniereRoom?.status === 'playing') {
            this.violation(
              'absent-jamais-detecte',
              'majeure',
              `NAT mort depuis ${String(Math.round((Date.now() - debut) / 1000))} s (au-delà de la grâce de ${String(RECONNECT_GRACE_MS / 1000)} s) : le serveur le voit toujours connecté`,
            );
          }
          this.j.inc(`disparition:${vu?.connected === true ? 'toujours-vu-connecte' : vu ? 'vu-absent' : 'libere'}`);
          if (this.etat === 'arrete' || o !== this.onglet) return;
          this.reprise = this.instantane('disparition', Date.now() - debut);
          this.reprise.depuis = Date.now();
          o.horsLigne = false;
          reveil(Date.now() - debut);
        }, absence - duree);
      } else if (natMort) {
        // Au réveil, la socket est morte côté téléphone ; le serveur garde la sienne, muette.
        this.reprise = this.instantane('natMort', duree);
        this.reprise.depuis = Date.now();
        this.ctx.relais.zombifier(tuyau);
        reveil(duree);
      } else {
        tuyau.degeler();
        this.rattrapageDepuis = Date.now();
        this.rattrapageCible = t.dernierServerNow;
        reveil(duree);
        if (o.connecte && !this.reprise) this.absentDepuis = null;
      }
    }, duree);
    return `${natMort ? (disparition ? 'NAT mort puis DISPARITION ~80 s' : 'NAT mort') : 'veille'} ${String(duree)} ms${duree > WAKE_HIDDEN_MS ? ' (réveil : nouvelle socket)' : ''}`;
  }

  /** (c) La même action, deux fois, sans attendre. */
  private async doublon(): Promise<string> {
    const game = this.game;
    const o = this.onglet;
    if (!game || !this.rattache || game.acted || !game.prompt) return 'annulée (rien à jouer)';
    const action = decider(game, this.rng, { graine: this.table.graine });
    if (!action) return 'annulée (pas de coup)';
    this.moment = cleDeMoment(game);
    this.annulerMinuteur();
    const [a, b] = await Promise.all([o.demander('game:action', { action }), o.demander('game:action', { action })]);
    const issue = `${a.ok ? 'ok' : (a.code ?? a.error)} / ${b.ok ? 'ok' : (b.code ?? b.error)}`;
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
    // « Prêt » se redit sans effet tant que dure la révélation (le moteur est idempotent).
    if (game.phase === 'revelation') permises.add('pret');
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
    const o = this.onglet;
    const game = this.game;
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
      { nom: 'texte de contrôle', event: 'game:action', payload: { action: { type: 'dire', channel: 'village', text: '‮​\u0000' } } },
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
    o.envoyerBrut('ceci n’est pas du JSON');
    o.envoyerBrut(JSON.stringify({ t: 'req', id: -4, e: 'game:action' }));
    const issues: string[] = [];
    for (const e of choix) {
      const r = await o.demander(e.event, e.payload);
      if (r.ok) {
        const enPartie = this.table.derniereRoom?.status === 'playing';
        if (enPartie || e.event === 'game:action') {
          this.violation('entree-invalide-acceptee', 'majeure', `fuzz « ${e.nom} » ${JSON.stringify(e.payload)} accepté (phase ${game?.phase ?? '-'})`, `fuzz:${e.nom}:${game?.phase ?? '-'}`);
        }
      }
      if (!r.ok && r.code === 'internal') {
        this.violation('erreur-interne-sur-entree', 'majeure', `fuzz « ${e.nom} » → code internal`, `fuzz-internal:${e.nom}`);
      }
      this.j.inc(`fuzz:${e.nom}:${r.ok ? 'ACCEPTE' : r.perdue || r.delai ? 'sans réponse' : 'refuse'}`);
      issues.push(`${e.nom}→${r.ok ? 'OK' : (r.code ?? r.error)}`);
    }
    return issues.join(' ; ');
  }

  /** (c) Le même `room:join` (avec jeton) renvoyé sur la connexion déjà assise. */
  private async rejoinMemeSocket(): Promise<string> {
    const o = this.onglet;
    if (!this.rattache || !this.join) return 'annulée';
    const avant = this.join.playerId;
    this.etat = 'manoeuvre';
    const r = await o.entree('room:join', { code: this.join.code, name: this.nom, token: this.join.token, lastSeq: this.dernierSeq });
    if (this.etat === 'manoeuvre') this.etat = 'normal';
    if (r.ok) {
      const data = r.data as JoinResult;
      if (data.playerId !== avant) this.violation('join-non-idempotent', 'critique', `room:join répété sur la même connexion : nouvelle identité`);
      this.join = data;
    }
    setTimeout(() => {
      this.verifierToujoursAssis('un room:join répété sur la même connexion');
    }, 1_500);
    this.j.inc(`rejoinMemeSocket:${r.ok ? 'ok' : (r.code ?? r.error)}`);
    return r.ok ? 'accepté' : `refusé : ${r.error}`;
  }

  /** (d) Une action part, la connexion tombe aussitôt, on revient vite. */
  private async enVol(): Promise<string> {
    const o = this.onglet;
    const game = this.game;
    if (!this.rattache || !game) return 'annulée';
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
    const reponse = o.demander('game:action', { action });
    await pause(this.rng.nextInt(15));
    const r = this.partir('enVol', absence);
    r.actionEnVol = action;
    r.momentEnVol = moment;
    const issue = await reponse;
    this.j.inc(`enVol:accuse-${issue.ok ? 'recu' : 'perdu'}`);
    return `${action.type} puis coupure, retour dans ${String(absence)} ms`;
  }

  /** (e) Deux onglets avec le même jeton. */
  private async doubleConnexion(): Promise<string> {
    const a = this.onglet;
    if (!this.rattache || !this.join) return 'annulée';
    const join = this.join;
    const garderNouvelle = this.rng.nextInt(2) === 0;
    this.etat = 'manoeuvre';
    this.annulerMinuteur();
    const b = this.nouvelOnglet();
    const limite = Date.now() + 6_000;
    while (!b.connecte && Date.now() < limite) await pause(20);
    if (!b.connecte) {
      b.fermer();
      this.etat = 'normal';
      return 'annulée (2e connexion impossible)';
    }
    const r = await b.entree('room:join', { code: join.code, name: this.nom, token: join.token, lastSeq: this.dernierSeq });
    if (!r.ok) {
      b.fermer();
      this.etat = 'normal';
      this.j.inc(`doubleConnexion:join-refuse:${r.code ?? r.error}`);
      return `2e join refusé : ${r.error}`;
    }
    const syncsA = a.syncs;
    const syncsB = b.syncs;
    await pause(2_500);
    // L'ancien onglet doit avoir été fermé en 4001 (« partie ouverte ailleurs ») :
    // sinon il reste ouvert, muet, et le joueur ne sait pas pourquoi.
    const prevenue = a.remplace;
    let orpheline = false;
    if (!prevenue && a.connecte) {
      const sonde = await a.demander('room:options', { options: {} });
      orpheline = !sonde.ok && sonde.code === 'session';
      if (orpheline) {
        this.violation(
          'connexion-orpheline-silencieuse',
          'majeure',
          `2e connexion avec le même jeton : l'ancienne reste ouverte, ne reçoit plus rien (${String(a.syncs - syncsA)} sync contre ${String(b.syncs - syncsB)}) et n'est ni fermée ni prévenue`,
          `orpheline:${String(this.table.index)}`,
        );
      }
    }
    this.j.inc(`doubleConnexion:ancienne-${prevenue ? 'fermee-4001' : orpheline ? 'orpheline-ouverte' : a.connecte ? 'toujours-assise' : 'fermee-autrement'}`);
    let issue: string;
    if (garderNouvelle) {
      // L'ancien onglet se ferme : le nouveau reste assis.
      this.onglet = b;
      this.rattache = true;
      // La perte de l'ancien onglet (4001) n'était pas une absence : la place vit dans le nouveau.
      this.reprise = null;
      this.absentDepuis = null;
      a.fermer();
      this.etat = 'normal';
      this.moment = null;
      if (b.dernierSync) this.surSync(b.dernierSync);
      setTimeout(() => {
        this.verifierToujoursAssis("la fermeture de l'ancien onglet (même jeton)");
      }, 2_000);
      issue = 'nouvelle gardée';
    } else {
      // Le nouvel onglet se ferme ; on revient à l'ancien, qui dit « partie
      // ouverte ailleurs » : le joueur touche « reprendre ici ».
      b.fermer();
      await pause(entre(this.table.rng, 500, 3_000));
      if ((this.etat as Etat) === 'arrete') return 'arrêt';
      if (!a.remplace && a.connecte) {
        const id = join.playerId;
        const vu = this.table.derniereRoom?.players.find((p) => p.id === id);
        if (vu && !vu.connected) {
          this.violation(
            'onglet-restant-abandonne',
            'majeure',
            `l'onglet le plus récent se ferme : le serveur marque le joueur absent alors que l'ancien onglet est ouvert et n'a pas été prévenu (pas de 4001) — figé jusqu'à rechargement`,
            `onglet:${String(this.table.index)}`,
          );
        }
        this.recharger('rechargement-apres-double-connexion');
      } else {
        this.reprise = this.instantane('reprendre-ici', 0);
        this.reprise.depuis = Date.now();
        this.rattache = false;
        this.etat = 'normal';
        a.canal.connect();
      }
      issue = 'ancienne gardée (reprendre ici)';
    }
    return `${issue} (ancienne ${prevenue ? 'fermée en 4001' : orpheline ? 'orpheline' : 'assise'})`;
  }

  /** (f) L'hôte quitte volontairement en pleine partie. */
  private async hotePart(): Promise<string> {
    const o = this.onglet;
    const ancien = this.join?.playerId;
    if (!this.rattache || !ancien) return 'annulée';
    this.etat = 'manoeuvre';
    this.annulerMinuteur();
    const r = await o.demander('room:leave', {});
    // Le client oublie le jeton en partant (`quitterTable`).
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
    const o = this.onglet;
    const assis = this.rattache && this.join !== null && o.connecte;
    this.etat = 'arrete';
    this.annulerMinuteur();
    this.annulerPoll();
    if (assis) await Promise.race([o.demander('room:leave', {}), pause(1_500)]);
    o.fermer();
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
  /** Morts d'abandon (D18). */
  abandons: number;
}

interface PhaseCourante {
  cle: string;
  phase: string;
  step: string | null;
  day: number;
  debut: number;
  /** La plus tardive échéance vue pour cette phase (horloge du serveur). */
  echeance: number | null;
  signalee: boolean;
}

/** Toute la table est partie (D19) : ce qu'on en sait au départ. */
interface Episode {
  debut: number;
  /** Le dernier retour prévu. */
  fin: number;
  cle: string | null;
  echeance: number | null;
  verifie: boolean;
  premierRetour: number | null;
  /** Un mort est revenu le premier : il peut agir (succession, tir) et faire avancer la partie sans horloge. */
  mortRevenu: boolean;
}

export class Table {
  readonly robots: Robot[] = [];
  readonly rng: Rng;
  code: string | null = null;
  statut: 'attente' | 'lobby' | 'playing' | 'finished' = 'attente';
  partieNumero = 0;
  readonly parties: Partie[] = [];
  readonly verites = new Map<number, RoleId>();
  derniereRoom: RoomView | null = null;
  derniereSyncA = 0;
  dernierServerNow = 0;
  /** Le dernier passage au salon après une partie (la revanche). */
  revancheA = 0;
  /** Le serveur est arrêté (crash ou redémarrage voulu). */
  serveurEnBas = false;
  /** Les redémarrages du serveur : [arrêt, retour]. */
  private readonly redemarrages: { debut: number; fin: number | null }[] = [];
  /** Les syncs porteurs d'évènements publics vus par la table : (reçu à, serverNow). */
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
  private tousPartisCettePartie = false;
  private episode: Episode | null = null;
  private readonly episodes: Episode[] = [];
  private readonly abandonsVus = new Set<string>();
  /** Le dernier instant où aucun vivant n'était connecté : la table a pu se suspendre (D19). */
  private sansVivantA = 0;
  private dernierTic = Date.now();
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

  noterSync(p: SyncPayload, maintenant: number, robot: Robot): void {
    // Un sync en retard (robot dégelé) ne réécrit pas l'histoire de la table.
    if (p.serverNow < this.dernierServerNow) return;
    this.dernierServerNow = p.serverNow;
    this.derniereRoom = p.room;
    this.derniereSyncA = maintenant;

    const status = p.room.status;
    if (status === 'playing' && this.statut !== 'playing') this.nouvellePartie(p.room, maintenant);
    if (status === 'lobby' && this.statut !== 'lobby') {
      if (this.statut === 'finished') this.revancheA = maintenant;
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
    // Les morts d'abandon (D18), vues dans les évènements — neufs ou rejoués.
    for (const e of p.events) {
      if (e.type !== 'morts') continue;
      for (const mort of e.deaths) if (mort.cause === 'abandon') this.noterAbandon(mort.seat, maintenant);
    }
    this.verifierEpisode(p, robot, maintenant);
    if (p.events.length > 0 && p.replay !== true) {
      this.historique.push({ a: maintenant, s: p.serverNow });
      while (this.historique.length > 0 && maintenant - this.historique[0]!.a > 120_000) this.historique.shift();
      for (const e of p.events) {
        if (e.type === 'phase') this.nouvellePhase(e.phase, e.step ?? null, e.day, maintenant);
      }
    }
    const g = p.game;
    if (g && !g.over && status === 'playing') {
      const cle = `${g.phase}|${g.step ?? ''}|${String(g.day)}`;
      if (this.phase?.cle !== cle) this.nouvellePhase(g.phase, g.step, g.day, maintenant);
      if (this.phase && p.room.deadline !== null && (this.phase.echeance === null || p.room.deadline > this.phase.echeance)) {
        this.phase.echeance = p.room.deadline;
      }
    }
  }

  /** D18 : une mort d'abandon ne frappe qu'un siège absent depuis cinq minutes. */
  private noterAbandon(seat: number, maintenant: number): void {
    const cle = `${String(this.partieNumero)}:${String(seat)}`;
    if (this.abandonsVus.has(cle)) return;
    this.abandonsVus.add(cle);
    this.ctx.journal.inc('morts-abandon');
    const partie = this.parties.at(-1);
    if (partie) partie.abandons += 1;
    const id = this.derniereRoom?.players.find((p) => p.seat === seat)?.id;
    const victime = this.robots.find((r) => r.join?.playerId === id);
    if (!victime) {
      this.trace(`mort d'abandon du siège ${String(seat)} (joueur parti)`);
      return;
    }
    const absence = victime.absentDepuis === null ? null : maintenant - victime.absentDepuis;
    this.trace(`mort d'abandon : ${victime.etiquette()} (absent depuis ${absence === null ? 'jamais' : `${String(Math.round(absence / 1000))} s`})`);
    if (absence === null || absence < ABANDON_MS - 2_000) {
      this.violation(
        'abandon-a-tort',
        'critique',
        `siège ${String(seat)} mort d'abandon alors qu'il ${absence === null ? 'est connecté' : `n'est absent que depuis ${String(Math.round(absence / 1000))} s`} (D18 : ${String(ABANDON_MS / 1000)} s)`,
        victime,
        `abandon:${cle}`,
      );
    }
  }

  private nouvellePartie(room: RoomView, maintenant: number): void {
    this.statut = 'playing';
    this.partieNumero += 1;
    this.verites.clear();
    this.phase = null;
    this.hotePartiCettePartie = false;
    this.tousPartisCettePartie = false;
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
      abandons: 0,
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
      const auChrono = precedente.echeance !== null ? maintenant >= precedente.echeance - 1_500 : budget > 0 && duree >= budget - 1_500;
      if (auChrono && precedente.step !== 'sorciere' && precedente.step !== 'loupBlanc') {
        partie.phasesAuChrono += 1;
        this.ctx.journal.inc('phases-au-chrono');
      }
      this.ctx.journal.ecrire({ type: 'phase', table: this.index, partie: partie.numero, cle: precedente.cle, dureeMs: duree, budgetMs: budget });
    }
    this.phase = { cle, phase, step, day, debut: maintenant, echeance: null, signalee: false };
    if (partie) partie.phases += 1;
    this.ctx.journal.inc('phases');
  }

  get phaseActuelle(): { cle: string; debut: number } | null {
    return this.phase;
  }

  /** Le plus récent évènement public reçu par la table avant `limite`. */
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

  // ── redémarrages du serveur ─────────────────────────────────────────

  serveurArrete(a: number): void {
    this.serveurEnBas = true;
    this.redemarrages.push({ debut: a, fin: null });
  }

  serveurRevenu(a: number): void {
    this.serveurEnBas = false;
    const r = this.redemarrages.at(-1);
    if (r && r.fin === null) r.fin = a;
    for (const robot of this.robots) robot.serveurRevenu(a);
    // (La phase suspendue le temps de la panne est décomptée par `tic` : aucun vivant n'était connecté.)
  }

  /** Dans les deux minutes qui suivent un redémarrage (ou pendant). */
  /** Un redémarrage du serveur a-t-il recouvert l'intervalle [a, b] ? */
  redemarrageEntre(a: number, b: number): boolean {
    return this.redemarrages.some((r) => r.debut <= b && (r.fin ?? b) >= a);
  }

  apresRedemarrage(maintenant: number): boolean {
    return this.redemarrages.some((r) => maintenant >= r.debut && maintenant - (r.fin ?? maintenant) < 120_000);
  }

  /** Une pause (ou un redémarrage) a-t-elle eu lieu depuis `depuis` ? */
  pauseDepuis(depuis: number): boolean {
    return (
      this.redemarrages.some((r) => (r.fin ?? Date.now()) >= depuis) ||
      this.episodes.some((e) => e.fin >= depuis) ||
      this.sansVivantA >= depuis ||
      this.derniereRoom?.paused === true
    );
  }

  // ── pilotage et invariants (toutes les 500 ms) ─────────────────────

  private tic(): void {
    const maintenant = Date.now();
    const precedent = this.dernierTic;
    this.dernierTic = maintenant;
    this.piloter(maintenant);
    for (const r of this.robots) r.verifier(maintenant);

    const { config } = this.ctx;
    const ph = this.phase;
    if (
      this.statut === 'playing' &&
      !this.robots.some((r) => r.etat !== 'arrete' && r.rattache && r.onglet.connecte && r.game?.you?.alive === true)
    ) {
      this.sansVivantA = maintenant;
      // Sans vivant connecté, l'horloge de la table est suspendue (D19) : la
      // vigie de phase ne compte pas ce temps-là.
      const suspendu = maintenant - precedent;
      if (this.phase) {
        this.phase.debut += suspendu;
        if (this.phase.echeance !== null) this.phase.echeance += suspendu;
      }
    }
    const quelquUn = this.robots.some((r) => r.etat === 'normal' && r.onglet.connecte);
    const suspendue = this.derniereRoom?.paused === true || this.episode !== null || this.serveurEnBas;
    if (this.statut === 'playing' && ph && !ph.signalee && !suspendue && quelquUn) {
      const budget = budgetPhase(ph.phase, ph.step, config.tempsNuit, config.tempsJour);
      const ecoule = maintenant - ph.debut;
      if (ph.echeance !== null && maintenant > ph.echeance + config.margePhaseMs) {
        // L'échéance que le serveur a lui-même annoncée est dépassée.
        ph.signalee = true;
        this.violation('phase-figee', 'critique', `phase ${ph.cle} : échéance annoncée dépassée de ${String(Math.round((maintenant - ph.echeance) / 1000))} s`, null);
      } else if (ph.echeance === null && budget > 0 && ecoule > budget + config.margePhaseMs + 30_000) {
        ph.signalee = true;
        this.violation('phase-figee', 'critique', `phase ${ph.cle} ouverte depuis ${String(Math.round(ecoule / 1000))} s sans échéance vue (budget ${String(budget / 1000)} s)`, null);
      }
    }
    const partie = this.parties.at(-1);
    if (partie && partie.fin === null && maintenant - partie.debut > config.partieMaxMs && this.statut === 'playing') {
      this.violation('partie-interminable', 'critique', `partie ${String(partie.numero)} en cours depuis ${String(Math.round((maintenant - partie.debut) / 1000))} s`, null, `interminable:${String(this.index)}:${String(partie.numero)}`);
    }
    if (this.episode && maintenant > this.episode.fin + 30_000) {
      this.episodes.push(this.episode);
      this.episode = null;
    }
  }

  private piloter(maintenant: number): void {
    const room = this.derniereRoom;
    if (!room || !this.enCampagne || this.serveurEnBas) return;
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
              this.ctx.journal.inc(`lancement-refuse:${r.code ?? r.error}`);
              this.trace(`lancement refusé : ${r.error}`);
              if (!this.optionsAuto && !r.perdue && r.code === 'composition') {
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
        // Un hôte encore dans sa grâce garde la charge (D17) : on ne juge qu'au-delà.
        const hoteVu = room.players.find((p) => p.id === room.hostId);
        const enGrace = hoteVu !== undefined && !hoteVu.connected && !hoteVu.absent;
        if (!this.finSansHoteSignalee && !enGrace && maintenant - this.finDepuis > this.ctx.config.finSansHoteMs) {
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
          if (!r.ok) this.ctx.journal.inc(`revanche-refusee:${r.code ?? r.error}`);
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
    if (this.statut !== 'playing' || this.serveurEnBas || this.episode !== null) return;
    const type = this.tirerType();
    if (type === 'tousPartent') {
      this.tousPartent();
      return;
    }
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

  /**
   * (h) Toute la table part — la box du salon redémarre — puis revient en
   * ordre dispersé. D19 : l'horloge se suspend tant qu'aucun vivant n'est là ;
   * au retour, la phase est la même et son échéance décalée de la pause.
   */
  private tousPartent(): void {
    if (this.tousPartisCettePartie) return;
    // Toute la table, vraiment : un robot assis mais déjà dehors (une coupure
    // en cours) reviendrait pendant l'épisode et relancerait l'horloge.
    if (this.robots.some((r) => r.join !== null && r.etat !== 'exclu' && !r.disponible)) return;
    const presents = this.robots.filter((r) => r.disponible);
    if (presents.length < MIN_PLAYERS) return;
    this.tousPartisCettePartie = true;
    const partie = this.parties.at(-1);
    if (partie) partie.pannes += 1;
    this.ctx.journal.inc('panne:tousPartent');
    // Plus personne ne joue, puis on laisse les coups en vol aboutir : la
    // phase relevée au départ est bien celle que le serveur tient.
    for (const r of presents) r.suspendre();
    const absence = entre(this.rng, 40_000, 150_000);
    setTimeout(() => {
      const maintenant = Date.now();
      const ph = this.phase;
      let fin = maintenant;
      for (const r of presents) {
        if (r.etat === 'arrete') continue;
        const retour = absence + entre(this.rng, 0, 20_000);
        fin = Math.max(fin, maintenant + retour);
        r.partir('tousPartent', retour);
      }
      this.episode = { debut: maintenant, fin, cle: ph?.cle ?? null, echeance: ph?.echeance ?? null, verifie: false, premierRetour: null, mortRevenu: false };
      this.tracerDepart(presents.length, absence, ph, maintenant);
    }, 1_500);
  }

  private tracerDepart(n: number, absence: number, ph: PhaseCourante | null, maintenant: number): void {
    this.trace(`PANNE tousPartent : ${String(n)} robots partent ~${String(Math.round(absence / 1000))} s en phase ${ph?.cle ?? '?'} (échéance ${ph?.echeance === null || ph === null ? '?' : `dans ${String(Math.round((ph.echeance - maintenant) / 1000))} s`})`);
  }

  /** Le premier vivant revenu d'un départ général retrouve la même phase, l'échéance décalée (D19). */
  private verifierEpisode(p: SyncPayload, robot: Robot, maintenant: number): void {
    const ep = this.episode;
    if (!ep || ep.verifie || p.room.status !== 'playing' || !p.game) return;
    const g = p.game;
    const cle = `${g.phase}|${g.step ?? ''}|${String(g.day)}`;
    if (maintenant < ep.debut + 2_000) return;
    if (!g.you?.alive) {
      // Un mort revenu le premier : la table doit être en pause.
      ep.mortRevenu = true;
      if (p.room.paused) this.ctx.journal.inc('pause-observee-par-un-mort');
      // Un vivant revenu entre-temps relance l'horloge : c'est la vue elle-même qui le dit.
      else if (!p.room.players.some((pl) => pl.connected && g.players.some((gp) => gp.seat === pl.seat && gp.alive))) {
        this.violation('pause-absente', 'majeure', `aucun vivant connecté et la table n'est pas suspendue (D19)`, robot, `pause-absente:${String(this.partieNumero)}`);
      }
      return;
    }
    ep.verifie = true;
    ep.premierRetour = maintenant;
    const pauseMs = maintenant - ep.debut;
    this.ctx.journal.latence('pause-tous-partis', pauseMs);
    const encoreValable = ep.echeance === null || ep.echeance > ep.debut + 1_000;
    if (ep.cle !== null && cle !== ep.cle && encoreValable && ep.mortRevenu) {
      this.ctx.journal.inc('pause:phase-avancee-par-un-mort');
    } else if (ep.cle !== null && cle !== ep.cle && encoreValable) {
      this.violation('pause-non-tenue', 'critique', `toute la table partie ${String(Math.round(pauseMs / 1000))} s en phase ${ep.cle} ; au retour du premier vivant, la phase est ${cle} — elle s'est close sans personne (D19)`, robot);
      return;
    }
    if (ep.echeance !== null && p.room.deadline !== null && cle === ep.cle) {
      const attendue = ep.echeance + pauseMs;
      const ecart = p.room.deadline - attendue;
      this.ctx.journal.latence('pause-ecart-echeance', Math.abs(ecart));
      if (Math.abs(ecart) > 3_000) {
        this.violation('echeance-non-decalee', 'majeure', `après ${String(Math.round(pauseMs / 1000))} s de pause, échéance ${String(Math.round((p.room.deadline - ep.echeance) / 1000))} s plus tard que l'originale (attendu ≈ ${String(Math.round(pauseMs / 1000))} s)`, robot);
      }
    }
    this.ctx.journal.inc('pause-verifiee');
    // L'échéance de la phase a reculé d'autant : la vigie de phase repart de là.
    // (La vigie de phase a déjà décompté le temps sans vivant, dans `tic`.)
    if (this.phase && p.room.deadline !== null) this.phase.echeance = p.room.deadline;
    this.episodes.push(ep);
    this.episode = null;
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
