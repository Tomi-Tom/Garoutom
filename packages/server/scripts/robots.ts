/**
 * Le banc de robots : de vrais clients WebSocket qui jouent à la table.
 *
 * Aucun privilège : chaque robot ouvre sa propre connexion, rejoint par le code
 * comme n'importe quel joueur, lit SA vue et joue un coup légal au hasard
 * (`robots/cerveau.ts`). Le serveur ne sait pas qu'ils sont des robots.
 *
 *   npm run robots -w @garoutom/server -- <CODE> [nombre=5] [--url ws://localhost:3004/ws]
 *        [--vitesse lent|normal|rapide] [--delai-max-ms N] [--bavards]
 *        [--creer [--lancer]] [--rejouer] [--sortir]
 */

import WebSocket from 'ws';

import {
  CHANNEL_PATH,
  Channel,
  MIN_PLAYERS,
  createSeededRng,
  type GameView,
  type JoinResult,
  type RoomView,
  type Rng,
  type SocketLike,
  type SyncPayload,
  type Action,
} from '@garoutom/engine';

import { cleDeMoment, decider, parler } from './robots/cerveau.js';

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

interface Config {
  code: string | null;
  nombre: number;
  url: string;
  delaiMin: number;
  delaiMax: number;
  bavards: boolean;
  creer: boolean;
  lancer: boolean;
  rejouer: boolean;
  sortir: boolean;
}

const VITESSES: Record<string, [number, number]> = {
  lent: [3_000, 9_000],
  normal: [1_000, 4_000],
  rapide: [50, 200],
};

const USAGE = `Usage : npm run robots -w @garoutom/server -- <CODE> [nombre=5] [options]
  --url ws://localhost:3004/ws   adresse du canal
  --vitesse lent|normal|rapide   rythme de jeu (normal : 1-4 s)
  --delai-max-ms N               délai humain entre N/4 et N ms (prime sur --vitesse)
  --bavards                      les robots écrivent parfois dans le fil
  --creer                        sans CODE : le premier robot crée la table et en est l'hôte
  --lancer                       (avec --creer) lance la partie dès que ≥ ${String(MIN_PLAYERS)} joueurs
  --rejouer                      l'hôte robot enchaîne revanche + lancement
  --sortir                       quitte la table à la fin de la partie`;

function lireArguments(argv: string[]): Config | string {
  const config: Config = {
    code: null,
    nombre: 5,
    url: `ws://localhost:3004${CHANNEL_PATH}`,
    delaiMin: VITESSES.normal![0],
    delaiMax: VITESSES.normal![1],
    bavards: false,
    creer: false,
    lancer: false,
    rejouer: false,
    sortir: false,
  };
  const positionnels: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const valeur = (): string | undefined => argv[++i];
    switch (arg) {
      case '--url': {
        const v = valeur();
        if (!v) return '--url demande une adresse';
        config.url = v;
        break;
      }
      case '--vitesse': {
        const v = valeur();
        const plage = v ? VITESSES[v] : undefined;
        if (!plage) return '--vitesse : lent, normal ou rapide';
        [config.delaiMin, config.delaiMax] = plage;
        break;
      }
      case '--delai-max-ms': {
        const n = Number(valeur());
        if (!Number.isFinite(n) || n < 0) return '--delai-max-ms demande un nombre';
        config.delaiMax = n;
        config.delaiMin = Math.floor(n / 4);
        break;
      }
      case '--bavards':
        config.bavards = true;
        break;
      case '--creer':
        config.creer = true;
        break;
      case '--lancer':
        config.lancer = true;
        break;
      case '--rejouer':
        config.rejouer = true;
        break;
      case '--sortir':
        config.sortir = true;
        break;
      case '--help':
      case '-h':
        return '';
      default:
        if (arg.startsWith('--')) return `Option inconnue : ${arg}`;
        positionnels.push(arg);
    }
  }
  if (config.creer) {
    if (positionnels[0]) config.nombre = Number(positionnels[0]);
  } else {
    config.code = (positionnels[0] ?? '').toUpperCase();
    if (!config.code) return 'Il faut un CODE de table, ou --creer';
    if (positionnels[1]) config.nombre = Number(positionnels[1]);
  }
  if (!Number.isInteger(config.nombre) || config.nombre < 1 || config.nombre > 18) {
    return 'Le nombre de robots doit être entre 1 et 18';
  }
  return config;
}

/* ------------------------------------------------------------------ */
/* Socket                                                              */
/* ------------------------------------------------------------------ */

/** Adapte le `ws` de Node à ce que le `Channel` attend, comme le client le fait pour le navigateur. */
function ouvrirSocket(url: string): SocketLike {
  const brut = new WebSocket(url);
  const like: SocketLike = {
    send: (data) => {
      if (brut.readyState === WebSocket.OPEN) brut.send(data);
    },
    close: () => {
      brut.close();
    },
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };
  brut.on('open', () => like.onopen?.());
  brut.on('close', () => like.onclose?.());
  brut.on('error', () => like.onerror?.());
  brut.on('message', (raw: unknown) => like.onmessage?.({ data: String(raw) }));
  return like;
}

/* ------------------------------------------------------------------ */
/* Le banc                                                             */
/* ------------------------------------------------------------------ */

const PRENOMS = [
  'Gaston', 'Mireille', 'Hubert', 'Odette', 'Fernand', 'Colette', 'Marcel', 'Josette',
  'Lucien', 'Berthe', 'Armand', 'Ginette', 'Raymond', 'Paulette', 'Gustave', 'Yvonne',
  'Octave', 'Simone',
];

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Ce que tous les robots d'une table partagent : la graine du vote et le journal de fin. */
interface Commun {
  config: Config;
  code: string;
  graine: number;
  /** Numéro de partie dont la fin a déjà été annoncée (une seule fois pour la table). */
  finAnnoncee: boolean;
  lanceAuto: boolean;
  robots: Robot[];
}

function hashCode(code: string): number {
  let h = 2166136261;
  for (const c of code) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

class Robot {
  readonly nom: string;
  private readonly canal: Channel;
  private readonly rng: Rng;
  private join: JoinResult | null = null;
  private room: RoomView | null = null;
  private game: GameView | null = null;
  /** Dernier moment de jeu pour lequel on a déjà essayé un coup. */
  private moment: string | null = null;
  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private derniereParole = 0;
  private rejoint = false;
  private rematchPlanifie = false;
  private partieVue = false;

  constructor(
    readonly index: number,
    private readonly commun: Commun,
    private readonly creer: boolean,
  ) {
    this.nom = `Bot ${PRENOMS[index % PRENOMS.length]!}`.slice(0, 16);
    this.rng = createSeededRng((commun.graine + index * 7919) >>> 0);
    this.canal = new Channel(() => ouvrirSocket(commun.config.url));
    this.canal.on('connect', () => void this.entrer());
    this.canal.on('sync', (p) => {
      this.recevoir(p);
    });
    this.canal.on('notice', (p) => {
      if (p.tone === 'error') this.dire(`avis : ${p.message}`);
    });
    this.canal.on('disconnect', () => {
      this.dire('connexion perdue, nouvel essai…');
    });
  }

  /** Attend d'avoir une place à la table (création ou arrivée). */
  async attendreEntree(delaiMs = 10_000): Promise<boolean> {
    const fin = Date.now() + delaiMs;
    while (Date.now() < fin) {
      if (this.rejoint) return true;
      await pause(50);
    }
    return false;
  }

  get code(): string | null {
    return this.join?.code ?? null;
  }

  // ── entrée en table ──────────────────────────────────────────────────

  private async entrer(): Promise<void> {
    try {
      if (this.join) {
        // Reprise après coupure : le jeton rend la place.
        await this.canal.request('room:join', {
          code: this.join.code,
          name: this.nom,
          token: this.join.token,
        });
        this.dire('de retour à la table');
      } else if (this.creer) {
        this.join = await this.canal.request<JoinResult>('room:create', { name: this.nom });
        this.commun.code = this.join.code;
        this.dire(`crée la table ${this.join.code}`);
      } else {
        this.join = await this.canal.request<JoinResult>('room:join', {
          code: this.commun.code,
          name: this.nom,
        });
        this.dire(`rejoint la table ${this.join.code}`);
      }
      this.rejoint = true;
    } catch (error) {
      this.dire(`entrée refusée : ${(error as Error).message}`);
    }
  }

  // ── journal ──────────────────────────────────────────────────────────

  private etiquette(): string {
    const siege = this.game?.you?.seat ?? this.room?.players.find((p) => p.id === this.join?.playerId)?.seat;
    const role = this.game?.you?.role;
    return [this.nom, siege === undefined ? null : `siège ${String(siege)}`, role ?? null]
      .filter((x) => x !== null)
      .join(' · ');
  }

  dire(message: string): void {
    console.log(`[${this.etiquette()}] ${message}`);
  }

  private nomDuSiege(seat: number | null): string {
    if (seat === null) return 'personne';
    return this.room?.players.find((p) => p.seat === seat)?.name ?? `siège ${String(seat)}`;
  }

  private phrase(action: Action): string {
    switch (action.type) {
      case 'pret':
        return 'est prêt';
      case 'cupidon':
        return `lie ${this.nomDuSiege(action.a)} et ${this.nomDuSiege(action.b)}`;
      case 'proteger':
        return `protège ${this.nomDuSiege(action.target)}`;
      case 'sonder':
        return `sonde ${this.nomDuSiege(action.target)}`;
      case 'devorer':
        return action.target === null ? 'ne dévore personne' : `dévore ${this.nomDuSiege(action.target)}`;
      case 'sorciere': {
        const morceaux = [
          action.save ? 'sauve la victime' : null,
          action.kill !== null ? `empoisonne ${this.nomDuSiege(action.kill)}` : null,
        ].filter((x) => x !== null);
        return morceaux.length > 0 ? morceaux.join(' et ') : 'laisse faire';
      }
      case 'tirer':
        return action.target === null ? 'ne tire sur personne' : `tire sur ${this.nomDuSiege(action.target)}`;
      case 'successeur':
        return `désigne ${this.nomDuSiege(action.target)} pour lui succéder`;
      case 'voter':
        return action.target === null ? 's’abstient' : `vote contre ${this.nomDuSiege(action.target)}`;
      case 'marquer':
        return action.target === null ? 'ne marque personne' : `marque ${this.nomDuSiege(action.target)}`;
      case 'trahir':
        return action.target === null ? 'épargne la meute' : `trahit ${this.nomDuSiege(action.target)}`;
      case 'designerVotants':
        return `désigne ${action.seats.map((seat) => this.nomDuSiege(seat)).join(', ')} pour voter demain`;
      case 'dire':
        return `dit (${action.channel}) « ${action.text} »`;
    }
  }

  // ── écoute ───────────────────────────────────────────────────────────

  private recevoir(payload: SyncPayload): void {
    this.room = payload.room;
    this.game = payload.game;
    const game = payload.game;

    if (game === null || payload.room.status === 'lobby') {
      this.partieVue = false;
      this.moment = null;
      this.verifierLancement();
      return;
    }

    if (game.over) {
      this.finDePartie(game);
      return;
    }
    this.partieVue = true;
    this.commun.finAnnoncee = false;

    const cle = cleDeMoment(game);
    // Plus d'invite : le prochain moment identique (deux chasseurs de suite)
    // doit pouvoir rejouer.
    if (cle === null) this.moment = null;
    if (cle !== null && !game.acted && cle !== this.moment && this.minuteur === null) {
      this.minuteur = setTimeout(() => {
        this.minuteur = null;
        void this.jouer();
      }, this.delai());
    }

    if (this.commun.config.bavards) this.peutParler();
  }

  /** Le lobby : l'hôte robot lance quand la table est prête. */
  verifierLancement(): void {
    const { config } = this.commun;
    const room = this.room;
    if (!room || !this.join || room.status !== 'lobby') return;
    const hote = room.hostId === this.join.playerId;
    if (!hote || !config.lancer || this.commun.lanceAuto) return;
    if (room.players.length < MIN_PLAYERS) return;
    // On attend que tous les robots aient pris place, puis un répit pour qu'un
    // humain en train d'arriver ne soit pas laissé dehors.
    if (this.commun.robots.some((r) => !r.rejoint)) return;
    this.commun.lanceAuto = true;
    setTimeout(() => {
      void this.canal
        .request('room:start', {})
        .then(() => {
          this.dire(`lance la partie (${String(room.players.length)} joueurs)`);
        })
        .catch((error: unknown) => {
          this.commun.lanceAuto = false;
          this.dire(`lancement refusé : ${(error as Error).message}`);
        });
    }, 3_000);
  }

  private delai(): number {
    const { delaiMin, delaiMax } = this.commun.config;
    return delaiMin + this.rng.nextInt(Math.max(1, delaiMax - delaiMin + 1));
  }

  private async jouer(): Promise<void> {
    const game = this.game;
    if (!game) return;
    const cle = cleDeMoment(game);
    if (cle === null || game.acted || game.over) return;
    const action = decider(game, this.rng, { graine: this.commun.graine });
    // Un seul essai par moment, réussi ou non : un refus ne boucle pas.
    this.moment = cle;
    if (!action) return;
    try {
      await this.canal.request('game:action', { action });
      this.dire(this.phrase(action));
    } catch (error) {
      this.dire(`coup refusé (${action.type}) : ${(error as Error).message}`);
    }
  }

  private peutParler(): void {
    const game = this.game;
    if (!game) return;
    const maintenant = Date.now();
    if (maintenant - this.derniereParole < 20_000 || this.rng.nextInt(100) >= 25) return;
    const mot = parler(game, this.rng);
    if (!mot) return;
    this.derniereParole = maintenant;
    const action: Action = { type: 'dire', channel: mot.channel, text: mot.text };
    this.canal.request('game:action', { action }).then(
      () => {
        this.dire(this.phrase(action));
      },
      (error: unknown) => {
        this.dire(`parole refusée : ${(error as Error).message}`);
      },
    );
  }

  private finDePartie(game: GameView): void {
    if (this.minuteur) clearTimeout(this.minuteur);
    this.minuteur = null;
    if (!this.commun.finAnnoncee) {
      this.commun.finAnnoncee = true;
      console.log(`=== Fin de partie au jour ${String(game.day)} : victoire de « ${String(game.winner)} » ===`);
      if (this.commun.config.sortir) {
        setTimeout(() => {
          void arreter(this.commun, 0);
        }, 1_000);
      }
    }
    const hote = this.room?.hostId === this.join?.playerId;
    if (this.commun.config.rejouer && hote && !this.rematchPlanifie && this.partieVue) {
      this.rematchPlanifie = true;
      setTimeout(() => {
        void this.canal
          .request('room:rematch', {})
          .then(async () => {
            this.dire('relance une partie');
            await pause(1_500);
            await this.canal.request('room:start', {});
          })
          .catch((error: unknown) => {
            this.dire(`revanche refusée : ${(error as Error).message}`);
          })
          .finally(() => {
            this.rematchPlanifie = false;
            this.partieVue = false;
          });
      }, 5_000);
    }
  }

  // ── départ ───────────────────────────────────────────────────────────

  async quitter(): Promise<void> {
    if (this.minuteur) clearTimeout(this.minuteur);
    this.minuteur = null;
    if (this.canal.connected && this.join) {
      try {
        await Promise.race([this.canal.request('room:leave', {}), pause(1_500)]);
      } catch {
        // On part de toute façon.
      }
    }
    this.canal.close();
  }
}

let arretEnCours = false;

async function arreter(commun: Commun, code: number): Promise<void> {
  if (arretEnCours) return;
  arretEnCours = true;
  console.log('Les robots quittent la table…');
  await Promise.all(commun.robots.map((r) => r.quitter()));
  process.exit(code);
}

async function main(): Promise<void> {
  const lu = lireArguments(process.argv.slice(2));
  if (typeof lu === 'string') {
    if (lu) console.error(`${lu}\n`);
    console.error(USAGE);
    process.exit(lu ? 1 : 0);
  }
  const config = lu;
  const commun: Commun = {
    config,
    code: config.code ?? '',
    graine: hashCode(config.code ?? String(Date.now())),
    finAnnoncee: false,
    lanceAuto: false,
    robots: [],
  };

  process.on('SIGINT', () => void arreter(commun, 0));
  process.on('SIGTERM', () => void arreter(commun, 0));

  for (let i = 0; i < config.nombre; i += 1) {
    const robot = new Robot(i, commun, config.creer && i === 0);
    commun.robots.push(robot);
    if (!(await robot.attendreEntree())) {
      console.error(`${robot.nom} n’a pas pu entrer (serveur injoignable ou table introuvable)`);
      await arreter(commun, 1);
    }
    if (i === 0 && config.creer) {
      // Les suivants rejoignent par le code, la graine suit celui de la table.
      commun.graine = hashCode(commun.code);
      console.log(`\n  Table ${commun.code} — rejoignez-la depuis le navigateur.\n`);
    }
    await pause(150);
  }

  // Le dernier accusé d'entrée arrive après la dernière vue du salon : on revérifie.
  for (const robot of commun.robots) robot.verifierLancement();

  if (config.creer && !config.lancer) {
    console.log('Les robots attendent au salon : lancez la partie depuis l’écran de l’hôte (ou relancez avec --lancer).');
  }
}

void main();
