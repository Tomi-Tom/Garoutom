/**
 * Le banc de chaos de Garoutom : des tables de robots qui jouent pendant qu'on
 * casse tout autour d'elles, et un rapport chiffré de ce qui a tenu.
 *
 *   npm run chaos -w @garoutom/server -- [options]
 *
 * Par défaut, le banc démarre lui-même un serveur (`src/index.ts --canal-seul`)
 * sur un port libre — persistant (`GAROUTOM_DATA` dans un dossier jetable),
 * derrière un « proxy » (`GAROUTOM_PROXY=1` : chaque table joue depuis son
 * adresse) —, ou le Worker avec `--wrangler`. Il glisse un relais TCP entre
 * les robots et lui (pour geler ou tuer une connexion sans la fermer), lance
 * les tables, injecte les pannes, vérifie les invariants, puis range tout et
 * tue ce qu'il a lancé (Windows : `taskkill /T /F`).
 *
 * Les campagnes de la preuve (lot E du chantier robustesse) :
 *
 *   --tables 3 --duree 6 --graine 20261011                       # référence
 *   --tables 2 --duree 4 --pannes-par-minute 8 --crash-serveur 2 # crash, persistance
 *   --redemarrage-serveur 2                                      # arrêt gracieux (1012)
 *   --seulement mobile,coupure,veille --pannes-par-minute 2      # D17
 *   --seulement mobile --absence-mobile 420-480 --temps-jour 120
 *     --temps-nuit 30 --delai-max-ms 12000 --pannes-par-minute 1 # D18
 *   --seulement tousPartent[,coupure] --pannes-par-minute 3      # D19
 *   --wrangler --tables 2 --duree 4 --crash-serveur 2            # le Worker
 *
 * Voir `--help` pour les options, et `scripts/chaos/table.ts` pour les pannes.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { CHANNEL_PATH, CHOOSABLE_ROLES, MAX_PLAYERS, MIN_PLAYERS, createSeededRng, type RoleId } from '@garoutom/engine';

import { Journal, centile } from './chaos/journal.js';
import { Relais } from './chaos/proxy.js';
import { ServeurEnfant, portLibre, sante, type Mesure } from './chaos/serveur.js';
import { FAMILLE, POIDS_DEFAUT, TYPES_PANNE, Table, type ConfigTables, type TypePanne } from './chaos/table.js';

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

interface Options {
  url: string | null;
  tables: number;
  joueurs: number | null;
  dureeMin: number;
  drainMin: number;
  graine: number;
  tempsNuit: number;
  tempsJour: number;
  delaiMin: number;
  delaiMax: number;
  pannesParMinute: number;
  horsGrace: number;
  poids: Record<TypePanne, number>;
  crashMin: number | null;
  redemarrageMin: number | null;
  persistance: boolean;
  ipParRobot: boolean;
  mobileS: [number, number];
  wrangler: boolean;
  sortie: string;
  bavard: boolean;
  margePhaseS: number;
  repriseMaxMs: number;
  /** Composition imposée à toutes les tables (v3 : un rôle par un, puis en tas). */
  roles: RoleId[];
}

/** Les rôles que l'hôte peut cocher — le banc n'impose rien d'autre. */
const CHOISABLES = CHOOSABLE_ROLES.join(',');

const USAGE = `Usage : npm run chaos -w @garoutom/server -- [options]
  --url ws://hote:port/ws     se brancher sur un serveur existant (sinon : serveur enfant sur un port libre)
  --tables N                  tables en parallèle (3)
  --joueurs N                 robots par table, ${String(MIN_PLAYERS)}–${String(MAX_PLAYERS)} (défaut : tiré au hasard par table)
  --duree M                   minutes d'injection de pannes (6)
  --drain M                   minutes max pour laisser finir les parties en cours (3)
  --graine N                  graine du banc (tailles, pannes, coups) — à rejouer
  --temps-nuit S --temps-jour S   minuteries de la table (15 / 60)
  --delai-max-ms N            robots : délai de jeu entre N/4 et N ms (2000)
  --pannes-par-minute X       par table (6)
  --hors-grace F              part des coupures au-delà de la grâce de 60 s (0.25)
  --sans a,b                  désactive des types de panne (${TYPES_PANNE.join(', ')})
  --seulement a,b             n'injecte que ces types
  --crash-serveur M           tue (taskkill /F) et relance le serveur à la minute M (serveur enfant seulement)
  --redemarrage-serveur M     arrêt gracieux (1012) et relance à la minute M (serveur enfant seulement)
  --sans-persistance          serveur enfant sans GAROUTOM_DATA (les tables meurent avec lui)
  --wrangler                  le serveur enfant est le Worker (wrangler dev, état persistant), pas Node
  --absence-mobile MIN-MAX    absence d'une panne « mobile », en secondes (90-360)
  --ip-par-robot              une adresse par robot (défaut : une par table, le Wi-Fi commun)
  --marge-phase S             marge au-delà du budget d'une phase avant « phase figée » (10)
  --reprise-max-ms N          au-delà, une reprise est jugée lente (3000)
  --sortie DOSSIER            rapport JSON + journal JSONL (défaut : dossier temporaire)
  --roles a,b,c               composition imposée à toutes les tables (parmi ${CHOISABLES})
                              — ex. --roles voleur,chienLoup,enfantSauvage,soeurs,freres
                              pour la deuxième vague de la v3 en tas
  --bavard                    journal de table en direct sur la console`;

function lire(argv: string[]): Options | string {
  const o: Options = {
    url: null,
    tables: 3,
    joueurs: null,
    dureeMin: 6,
    drainMin: 3,
    graine: Date.now() % 1_000_000,
    tempsNuit: 15,
    tempsJour: 60,
    delaiMin: 500,
    delaiMax: 2_000,
    pannesParMinute: 6,
    horsGrace: 0.25,
    poids: { ...POIDS_DEFAUT },
    crashMin: null,
    redemarrageMin: null,
    persistance: true,
    ipParRobot: false,
    mobileS: [90, 360],
    wrangler: false,
    sortie: join(tmpdir(), 'garoutom-chaos'),
    bavard: false,
    margePhaseS: 10,
    repriseMaxMs: 3_000,
    roles: [],
  };
  const nombre = (v: string | undefined, nom: string): number => {
    const n = Number(v);
    if (v === undefined || !Number.isFinite(n)) throw new Error(`${nom} demande un nombre`);
    return n;
  };
  const types = (v: string | undefined): TypePanne[] => {
    const liste = (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    for (const t of liste) if (!(TYPES_PANNE as readonly string[]).includes(t)) throw new Error(`type de panne inconnu : ${t}`);
    return liste as TypePanne[];
  };
  try {
    for (let i = 0; i < argv.length; i += 1) {
      const a = argv[i] ?? '';
      const v = (): string | undefined => argv[++i];
      switch (a) {
        case '--url':
          o.url = v() ?? null;
          break;
        case '--tables':
          o.tables = nombre(v(), a);
          break;
        case '--joueurs':
          o.joueurs = nombre(v(), a);
          break;
        case '--duree':
          o.dureeMin = nombre(v(), a);
          break;
        case '--drain':
          o.drainMin = nombre(v(), a);
          break;
        case '--graine':
          o.graine = nombre(v(), a);
          break;
        case '--temps-nuit':
          o.tempsNuit = nombre(v(), a);
          break;
        case '--temps-jour':
          o.tempsJour = nombre(v(), a);
          break;
        case '--delai-max-ms': {
          const n = nombre(v(), a);
          o.delaiMax = n;
          o.delaiMin = Math.floor(n / 4);
          break;
        }
        case '--pannes-par-minute':
          o.pannesParMinute = nombre(v(), a);
          break;
        case '--hors-grace':
          o.horsGrace = nombre(v(), a);
          break;
        case '--sans':
          for (const t of types(v())) o.poids[t] = 0;
          break;
        case '--seulement': {
          const garder = new Set(types(v()));
          // Un type gardé qui ne pèse rien par défaut (`mobile`, `tousPartent`) reçoit un poids de 1.
          for (const t of TYPES_PANNE) o.poids[t] = garder.has(t) ? o.poids[t] || 1 : 0;
          break;
        }
        case '--crash-serveur':
          o.crashMin = nombre(v(), a);
          break;
        case '--redemarrage-serveur':
          o.redemarrageMin = nombre(v(), a);
          break;
        case '--sans-persistance':
          o.persistance = false;
          break;
        case '--wrangler':
          o.wrangler = true;
          break;
        case '--absence-mobile': {
          const [a1, a2] = (v() ?? '').split('-').map(Number);
          if (!Number.isFinite(a1) || !Number.isFinite(a2) || a1! > a2!) throw new Error('--absence-mobile demande MIN-MAX en secondes');
          o.mobileS = [a1!, a2!];
          break;
        }
        case '--ip-par-robot':
          o.ipParRobot = true;
          break;
        case '--marge-phase':
          o.margePhaseS = nombre(v(), a);
          break;
        case '--reprise-max-ms':
          o.repriseMaxMs = nombre(v(), a);
          break;
        case '--sortie':
          o.sortie = v() ?? o.sortie;
          break;
        case '--roles': {
          const liste = (v() ?? '').split(',').map((x) => x.trim()).filter(Boolean);
          for (const r of liste) {
            if (!(CHOOSABLE_ROLES as readonly string[]).includes(r)) {
              throw new Error(`rôle inconnu ou non cochable : ${r}`);
            }
          }
          if (new Set(liste).size !== liste.length) throw new Error('--roles : un rôle n’existe qu’en un exemplaire');
          o.roles = liste as RoleId[];
          break;
        }
        case '--bavard':
          o.bavard = true;
          break;
        case '--help':
        case '-h':
          return '';
        default:
          return `Option inconnue : ${a}`;
      }
    }
  } catch (error) {
    return (error as Error).message;
  }
  if (o.joueurs !== null && (o.joueurs < MIN_PLAYERS || o.joueurs > MAX_PLAYERS)) return `--joueurs : entre ${String(MIN_PLAYERS)} et ${String(MAX_PLAYERS)}`;
  if ((o.crashMin !== null || o.redemarrageMin !== null) && o.url !== null) return '--crash-serveur / --redemarrage-serveur demandent un serveur enfant (pas de --url)';
  return o;
}

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const mo = (octets: number): string => `${(octets / 1024 / 1024).toFixed(1)} Mo`;

/* ------------------------------------------------------------------ */
/* Le banc                                                             */
/* ------------------------------------------------------------------ */

async function main(): Promise<number> {
  const lu = lire(process.argv.slice(2));
  if (typeof lu === 'string') {
    if (lu) console.error(`${lu}\n`);
    console.error(USAGE);
    return lu ? 2 : 0;
  }
  const o = lu;
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
  const journal = new Journal(join(o.sortie, `chaos-${horodatage}.jsonl`), o.bavard);
  const rng = createSeededRng(o.graine >>> 0);

  // ── le serveur ─────────────────────────────────────────────────────
  let serveur: ServeurEnfant | null = null;
  let dossierDonnees: string | null = null;
  let hote = '127.0.0.1';
  let port: number;
  if (o.url) {
    const u = new URL(o.url);
    hote = u.hostname;
    port = Number(u.port || (u.protocol === 'wss:' ? 443 : 80));
  } else {
    port = await portLibre();
    // Le serveur de production : persistance dans un dossier jetable (D21),
    // et l'adresse du client lue dans `x-forwarded-for` — chaque table du
    // banc joue depuis « son » Wi-Fi, comme dans la vraie vie.
    // Avec `--wrangler`, le même dossier sert d'état au Durable Object.
    if (o.persistance || o.wrangler) dossierDonnees = mkdtempSync(join(tmpdir(), 'garoutom-chaos-donnees-'));
    serveur = new ServeurEnfant(
      port,
      (ligne) => {
        journal.ecrire({ type: 'serveur', ligne });
      },
      { GAROUTOM_PROXY: '1', GAROUTOM_DATA: dossierDonnees ?? 'off' },
      o.wrangler && dossierDonnees ? { etat: dossierDonnees } : null,
    );
  }

  let nettoye = false;
  const tables: Table[] = [];
  let relais: Relais | null = null;
  const nettoyer = async (): Promise<void> => {
    if (nettoye) return;
    nettoye = true;
    await Promise.race([Promise.all(tables.map((t) => t.arreter())), pause(5_000)]);
    await relais?.fermer();
    await serveur?.tuer();
    if (dossierDonnees) rmSync(dossierDonnees, { recursive: true, force: true });
  };
  process.on('exit', () => {
    serveur?.tuerSync();
  });
  process.on('SIGINT', () => {
    console.log('\nInterruption : on range tout…');
    void nettoyer().then(() => process.exit(130));
  });

  if (serveur) {
    await serveur.demarrer();
    console.log(`Serveur Garoutom lancé (pid ${String(serveur.pid)}) sur 127.0.0.1:${String(port)}${dossierDonnees ? `, tables persistées dans ${dossierDonnees}` : ', sans persistance'}`);
  }
  relais = new Relais(hote, port);
  const portRelais = await relais.ouvrir();
  const url = `ws://127.0.0.1:${String(portRelais)}${CHANNEL_PATH}`;

  const config: ConfigTables = {
    url,
    tempsNuit: o.tempsNuit,
    tempsJour: o.tempsJour,
    delaiMin: o.delaiMin,
    delaiMax: o.delaiMax,
    pannesParMinute: o.pannesParMinute,
    poids: o.poids,
    horsGrace: o.horsGrace,
    margePhaseMs: o.margePhaseS * 1_000,
    repriseMaxMs: o.repriseMaxMs,
    desyncMs: 10_000,
    // Au-delà de huit journées entières menées au chrono, une partie est interminable.
    partieMaxMs: Math.max(15 * 60_000, 8 * (o.tempsJour + 3 * o.tempsNuit) * 1_000),
    finSansHoteMs: 30_000,
    ipParRobot: o.ipParRobot,
    mobileMs: [o.mobileS[0] * 1_000, o.mobileS[1] * 1_000],
    roles: o.roles,
  };
  const ctx = { config, journal, relais };

  // ── surveillance du serveur ─────────────────────────────────────────
  const mesures: Mesure[] = [];
  const mesure0 = serveur ? await serveur.mesurer() : null;
  let crashEnCours = false;
  let santeKoConsecutifs = 0;
  let santeKo = 0;
  let santeOk = 0;
  const surveillance = setInterval(() => {
    void (async () => {
      const ok = await sante(hote, port);
      if (ok) {
        santeOk += 1;
        santeKoConsecutifs = 0;
      } else if (!crashEnCours) {
        santeKo += 1;
        santeKoConsecutifs += 1;
        if (santeKoConsecutifs === 2) {
          journal.violation({ invariant: 'serveur-injoignable', gravite: 'critique', table: null, code: null, partie: null, robot: null, siege: null, detail: '/health ne répond plus (2 essais de suite)', sequence: [] });
        }
      }
      const m = await serveur?.mesurer();
      if (m) mesures.push(m);
    })();
  }, 3_000);

  // ── les tables ──────────────────────────────────────────────────────
  const debut = Date.now();
  console.log(`Banc de chaos : graine ${String(o.graine)}, ${String(o.tables)} tables, ${String(o.dureeMin)} min de pannes (${String(o.pannesParMinute)}/min/table), nuit ${String(o.tempsNuit)} s, jour ${String(o.tempsJour)} s`);
  console.log(`Journal : ${journal.fichier ?? '-'}`);
  for (let i = 0; i < o.tables; i += 1) {
    const taille = o.joueurs ?? MIN_PLAYERS + rng.nextInt(MAX_PLAYERS - MIN_PLAYERS + 1);
    tables.push(new Table(i, taille, (o.graine * 31 + i * 1_000_003) >>> 0, ctx));
  }
  const prets = await Promise.all(tables.map((t) => t.demarrer()));
  tables.forEach((t, i) => {
    console.log(`  table ${String(i)} : ${t.code ?? 'ÉCHEC'} — ${String(t.taille)} robots${prets[i] ? '' : ' (création impossible)'}`);
  });

  // ── le crash ou le redémarrage optionnel ────────────────────────────
  let crash: { a: number; indisponibleMs: number; gracieux: boolean } | null = null;
  const panneServeur = o.crashMin ?? o.redemarrageMin;
  if (panneServeur !== null && serveur) {
    const s = serveur;
    const gracieux = o.crashMin === null;
    setTimeout(() => {
      void (async () => {
        crashEnCours = true;
        const t = Date.now();
        console.log(`${journal.t()} ⚡ ${gracieux ? 'arrêt gracieux (1012)' : 'crash du serveur (taskkill /F)'} et redémarrage`);
        for (const table of tables) table.serveurArrete(t);
        if (gracieux && !o.wrangler) await s.arreterProprement();
        else await s.tuer();
        await pause(1_500);
        await s.demarrer();
        crash = { a: t, indisponibleMs: Date.now() - t, gracieux };
        for (const table of tables) table.serveurRevenu(Date.now());
        journal.inc(gracieux ? 'redemarrage-serveur' : 'crash-serveur');
        crashEnCours = false;
        console.log(`${journal.t()} serveur relancé (pid ${String(s.pid)}) après ${String(crash.indisponibleMs)} ms`);
      })();
    }, panneServeur * 60_000);
  }

  // ── déroulement ─────────────────────────────────────────────────────
  const finPannes = debut + o.dureeMin * 60_000;
  let dernierPoint = 0;
  while (Date.now() < finPannes) {
    await pause(1_000);
    if (Date.now() - dernierPoint > 30_000) {
      dernierPoint = Date.now();
      const m = mesures.at(-1);
      console.log(
        `${journal.t()} parties ${String(journal.get('parties-lancees'))} lancées / ${String(journal.get('parties-terminees'))} finies · pannes ${String([...journal.compteurs].filter(([k]) => k.startsWith('panne:')).reduce((s, [, n]) => s + n, 0))} · reprises ${String(journal.get('reprises-reussies'))} ok / ${String(journal.get('reprises-refusees'))} refusées · violations ${String(journal.violations.length)}${m ? ` · heap ${mo(m.heapUsed)} sockets ${String(m.sockets)}` : ''}`,
      );
    }
  }
  console.log(`${journal.t()} fin des pannes : on laisse finir les parties en cours (${String(o.drainMin)} min max)`);
  for (const t of tables) t.finirCampagne();
  const finDrain = Date.now() + o.drainMin * 60_000;
  while (Date.now() < finDrain && tables.some((t) => t.partieEnCours)) await pause(1_000);
  const nonFinies = tables.filter((t) => t.partieEnCours);
  for (const t of nonFinies) {
    const p = t.parties.at(-1);
    const vivante = t.phaseActuelle !== null && Date.now() - t.phaseActuelle.debut < 100_000;
    t.violation(
      'partie-non-terminee-au-drain',
      vivante ? 'mineure' : 'majeure',
      `la partie ${String(t.partieNumero)} tourne encore après ${String(o.drainMin)} min de drain (${String(Math.round((Date.now() - (p?.debut ?? Date.now())) / 1000))} s de jeu, ${String(p?.phases ?? 0)} phases dont ${String(p?.phasesAuChrono ?? 0)} closes par la minuterie, phase actuelle ${t.phaseActuelle?.cle ?? '?'} depuis ${String(Math.round((Date.now() - (t.phaseActuelle?.debut ?? Date.now())) / 1000))} s) — ${vivante ? 'les phases avancent : ce sont des sièges muets qui la rallongent' : 'plus rien n’avance'}`,
      null,
    );
  }

  // ── rangement et mesures finales ─────────────────────────────────────
  await Promise.race([Promise.all(tables.map((t) => t.arreter())), pause(5_000)]);
  await pause(2_500);
  const zombies = relais.zombies.size;
  const mesureAvecZombies = serveur ? await serveur.mesurer() : null;
  relais.purgerZombies();
  await pause(1_500);
  const mesureFinale = serveur ? await serveur.mesurer() : null;
  clearInterval(surveillance);
  const santeFinale = await sante(hote, port);

  if (serveur) {
    for (const s of serveur.sortiesInattendues) {
      journal.violation({ invariant: 'serveur-mort', gravite: 'critique', table: null, code: null, partie: null, robot: null, siege: null, detail: `le processus serveur s'est arrêté (code ${String(s.code)}, signal ${String(s.signal)}). Dernières lignes :\n${s.dernieres.slice(-12).join('\n')}`, sequence: [] });
    }
    const parMotif = new Map<string, { n: number; exemple: string }>();
    for (const inc of serveur.incidents) {
      const e = parMotif.get(inc.motif) ?? { n: 0, exemple: inc.texte };
      e.n += 1;
      parMotif.set(inc.motif, e);
    }
    for (const [motif, e] of parMotif) {
      journal.violation({ invariant: `serveur-${motif}`, gravite: 'majeure', table: null, code: null, partie: null, robot: null, siege: null, detail: `${String(e.n)} ligne(s) d'erreur, ex. : ${e.exemple}`, sequence: [] });
    }
  }

  // ── rapport ──────────────────────────────────────────────────────────
  const rapport = construireRapport({ o, journal, tables, mesure0, mesures, mesureAvecZombies, mesureFinale, zombies, santeOk, santeKo, santeFinale, crash, dureeMs: Date.now() - debut, serveur });
  console.log(rapport.texte);
  const fichier = join(o.sortie, `chaos-${horodatage}.json`);
  writeFileSync(fichier, JSON.stringify(rapport.json, null, 2));
  console.log(`\nRapport JSON : ${fichier}\nJournal JSONL : ${journal.fichier ?? '-'}`);

  await journal.fermer();
  await relais.fermer();
  await serveur?.tuer();
  if (dossierDonnees) rmSync(dossierDonnees, { recursive: true, force: true });
  nettoye = true;
  const graves = journal.violations.filter((v) => v.gravite === 'critique' || v.gravite === 'majeure').length;
  return graves > 0 ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

interface Entrees {
  o: Options;
  journal: Journal;
  tables: Table[];
  mesure0: Mesure | null;
  mesures: Mesure[];
  mesureAvecZombies: Mesure | null;
  mesureFinale: Mesure | null;
  zombies: number;
  santeOk: number;
  santeKo: number;
  santeFinale: boolean;
  crash: { a: number; indisponibleMs: number; gracieux: boolean } | null;
  dureeMs: number;
  serveur: ServeurEnfant | null;
}

function stats(valeurs: number[] | undefined): { n: number; p50: number | null; p95: number | null; max: number | null } {
  const v = valeurs ?? [];
  return { n: v.length, p50: centile(v, 50), p95: centile(v, 95), max: v.length ? Math.max(...v) : null };
}

function construireRapport(e: Entrees): { texte: string; json: unknown } {
  const { journal: j, tables, o } = e;
  const L: string[] = [];
  const parties = tables.flatMap((t) => t.parties.map((p) => ({ table: t.index, code: t.code, ...p })));
  const terminees = parties.filter((p) => p.fin !== null);
  L.push('', '══════════════════ Rapport de chaos Garoutom ══════════════════');
  L.push(`graine ${String(o.graine)} · durée ${String(Math.round(e.dureeMs / 1000))} s · ${String(tables.length)} tables (${tables.map((t) => `${t.code ?? '?'}:${String(t.taille)}`).join(', ')}) · nuit ${String(o.tempsNuit)} s / jour ${String(o.tempsJour)} s · ${String(o.pannesParMinute)} pannes/min/table`);
  L.push('', '── Parties');
  L.push(`lancées ${String(parties.length)} · terminées ${String(terminees.length)} · phases observées ${String(j.get('phases'))} · morts d'abandon ${String(j.get('morts-abandon'))}`);
  for (const p of parties) {
    L.push(`  T${String(p.table)} #${String(p.numero)} : ${String(p.joueurs)} joueurs, ${p.fin === null ? 'NON TERMINÉE' : `${String(Math.round((p.fin - p.debut) / 1000))} s, victoire « ${String(p.gagnant)} » au jour ${String(p.jour)}`}, ${String(p.phases)} phases (dont ${String(p.phasesAuChrono)} closes par la minuterie), ${String(p.pannes)} pannes, ${String(p.placesPerdues)} place(s) perdue(s), ${String(p.abandons)} abandon(s)`);
  }
  L.push('', '── Pannes injectées');
  let totalPannes = 0;
  for (const t of TYPES_PANNE) {
    const n = j.get(`panne:${t}`);
    totalPannes += n;
    if (n > 0) L.push(`  ${t.padEnd(18)} ${String(n).padStart(4)}   (${FAMILLE[t]})`);
  }
  L.push(`  total ${String(totalPannes)}${e.crash ? ` + 1 ${e.crash.gracieux ? 'redémarrage gracieux' : 'crash'} du serveur (indisponible ${String(e.crash.indisponibleMs)} ms, persistance ${o.persistance ? 'oui' : 'non'})` : ''}`);

  L.push('', '── Reconnexions');
  L.push(`réussies ${String(j.get('reprises-reussies'))} · refusées ${String(j.get('reprises-refusees'))} · nouvelle identité ${String(j.get('reprise-nouvelle-identite'))} · fermetures inattendues ${String(j.get('fermetures-inattendues'))}`);
  const detail = [...j.compteurs].filter(([k]) => k.startsWith('reprise-ok:') || k.startsWith('reprise-refusee:')).sort();
  for (const [k, n] of detail) L.push(`  ${k} : ${String(n)}`);
  const lat = stats(j.latences.get('reprise'));
  L.push(`latence de reprise (nouvelle socket → sync complet) : n=${String(lat.n)} p50=${String(lat.p50)} ms p95=${String(lat.p95)} ms max=${String(lat.max)} ms`);
  for (const [k, v] of [...j.latences].filter(([k]) => k.startsWith('reprise:'))) {
    const s = stats(v);
    L.push(`  ${k} : n=${String(s.n)} p50=${String(s.p50)} p95=${String(s.p95)} max=${String(s.max)}`);
  }
  const ratt = stats(j.latences.get('rattrapage-apres-veille'));
  L.push(`rattrapage après veille (dégel → vue à jour) : n=${String(ratt.n)} p50=${String(ratt.p50)} ms p95=${String(ratt.p95)} ms`);
  L.push(`rattrapages par lastSeq : ${String(j.get('rattrapages'))} (${String(j.get('evenements-rejoues'))} évènements rejoués, ${String(j.get('rattrapages-partiels'))} partiels) · hello reçus ${String(j.get('hello'))} · fermetures 4001 ${String(j.get('fermetures-4001'))} · 4002 ${String(j.get('fermetures-4002'))}`);
  const pauses = stats(j.latences.get('pause-tous-partis'));
  if (pauses.n > 0 || j.get('panne:tousPartent') > 0) {
    const ecart = stats(j.latences.get('pause-ecart-echeance'));
    L.push(`départs généraux (D19) : ${String(j.get('panne:tousPartent'))} · vérifiés ${String(j.get('pause-verifiee'))} · pause p50=${String(pauses.p50)} ms max=${String(pauses.max)} ms · écart d'échéance max ${String(ecart.max)} ms · pause vue par un mort ${String(j.get('pause-observee-par-un-mort'))}`);
  }
  const nuits = j.get('nuits-villageois');
  L.push(`silence (D23) : ${String(j.get('syncs-nuit-villageois'))} sync reçus par des villageois sur ${String(nuits)} nuits (${nuits ? (j.get('syncs-nuit-villageois') / nuits).toFixed(1) : '-'} par nuit, dont ${String(j.get('syncs-nuit-villageois-sans-evenement'))} sans évènement) · syncs identiques ${String(j.get('syncs-identiques'))}`);

  L.push('', '── Requêtes');
  for (const k of ['coups-joues', 'coups-refuses', 'coups-perdus-par-coupure', 'coups-sans-accuse', 'requetes-sans-accuse-excusees', 'avis']) {
    L.push(`  ${k} : ${String(j.get(k))}`);
  }

  L.push('', '── Serveur');
  L.push(`/health : ${String(e.santeOk)} ok, ${String(e.santeKo)} ko (hors crash volontaire), état final ${e.santeFinale ? 'OK' : 'KO'}`);
  if (e.serveur) {
    L.push(`démarrages ${String(e.serveur.demarrages)} · sorties inattendues ${String(e.serveur.sortiesInattendues.length)} · lignes d'erreur ${String(e.serveur.incidents.length)}`);
  }
  const ms = e.mesures;
  if (ms.length > 0) {
    const tiers = Math.max(1, Math.floor(ms.length / 3));
    const moy = (xs: Mesure[]): number => xs.reduce((s, m) => s + m.heapUsed, 0) / Math.max(1, xs.length);
    const debutHeap = moy(ms.slice(0, tiers));
    const finHeap = moy(ms.slice(-tiers));
    const maxHeap = Math.max(...ms.map((m) => m.heapUsed));
    const maxRss = Math.max(...ms.map((m) => m.rss));
    L.push(`mémoire : heap ${mo(e.mesure0?.heapUsed ?? 0)} au repos → moyenne 1er tiers ${mo(debutHeap)} → dernier tiers ${mo(finHeap)} (max ${mo(maxHeap)}) · rss max ${mo(maxRss)} · ${String(ms.length)} mesures`);
    if (finHeap > debutHeap * 2 && finHeap - debutHeap > 50 * 1024 * 1024) {
      j.violation({ invariant: 'memoire-croissante', gravite: 'majeure', table: null, code: null, partie: null, robot: null, siege: null, detail: `heap moyen ${mo(debutHeap)} → ${mo(finHeap)}`, sequence: [] });
    }
    L.push(`sockets TCP serveur : repos ${String(e.mesure0?.sockets ?? '?')} · pic ${String(Math.max(...ms.map((m) => m.sockets)))} · après départ des robots ${String(e.mesureAvecZombies?.sockets ?? '?')} (dont zombies NAT encore tenus par le relais : ${String(e.zombies)}) · après purge des zombies ${String(e.mesureFinale?.sockets ?? '?')}`);
    if (e.mesureAvecZombies && e.mesure0 && e.zombies > 0 && e.mesureAvecZombies.sockets - e.mesure0.sockets >= e.zombies) {
      j.violation({ invariant: 'sockets-zombies-jamais-detectees', gravite: 'majeure', table: null, code: null, partie: null, robot: null, siege: null, detail: `${String(e.zombies)} connexion(s) half-open (NAT mort) toujours ouvertes côté serveur en fin de campagne : aucun battement de cœur ne les détecte ni ne libère la place`, sequence: [] });
    }
    if (e.mesureFinale && e.mesure0 && e.mesureFinale.sockets > e.mesure0.sockets + 2) {
      j.violation({ invariant: 'sockets-fuyantes', gravite: 'mineure', table: null, code: null, partie: null, robot: null, siege: null, detail: `sockets serveur ${String(e.mesure0.sockets)} au repos, ${String(e.mesureFinale.sockets)} après le départ de tous`, sequence: [] });
    }
  }

  L.push('', '── Invariants violés');
  const parInv = new Map<string, { gravite: string; n: number }>();
  for (const v of j.violations) {
    const x = parInv.get(v.invariant) ?? { gravite: v.gravite, n: 0 };
    x.n += 1;
    parInv.set(v.invariant, x);
  }
  if (parInv.size === 0) L.push('  aucun');
  const ordre = ['critique', 'majeure', 'mineure', 'info'];
  for (const [inv, x] of [...parInv].sort((a, b) => ordre.indexOf(a[1].gravite) - ordre.indexOf(b[1].gravite))) {
    L.push(`  [${x.gravite}] ${inv} × ${String(x.n)}${j.get(`repetition:${inv}`) ? ` (+${String(j.get(`repetition:${inv}`))} répétitions dédoublonnées)` : ''}`);
  }
  L.push('', '── Détail (premier cas de chaque invariant, avec la séquence)');
  const vus = new Set<string>();
  for (const v of j.violations) {
    if (vus.has(v.invariant)) continue;
    vus.add(v.invariant);
    L.push(`▶ [${v.gravite}] ${v.invariant} — à ${j.t(v.t)}, graine ${String(o.graine)}, table ${String(v.table ?? '-')} ${v.code ?? ''} partie ${String(v.partie ?? '-')} ${v.robot ?? ''} siège ${String(v.siege ?? '-')}`);
    L.push(`    ${v.detail}`);
    for (const s of v.sequence.slice(-8)) L.push(`      · ${s}`);
  }
  L.push('', '── Compteurs bruts');
  for (const [k, n] of [...j.compteurs].sort()) L.push(`  ${k} = ${String(n)}`);

  const json = {
    graine: o.graine,
    options: o,
    dureeMs: e.dureeMs,
    tables: tables.map((t) => ({ index: t.index, code: t.code, taille: t.taille, graine: t.graine, parties: t.parties })),
    compteurs: Object.fromEntries(j.compteurs),
    latences: Object.fromEntries([...j.latences].map(([k, v]) => [k, stats(v)])),
    violations: j.violations,
    serveur: {
      santeOk: e.santeOk,
      santeKo: e.santeKo,
      santeFinale: e.santeFinale,
      sortiesInattendues: e.serveur?.sortiesInattendues ?? [],
      incidents: e.serveur?.incidents ?? [],
      mesure0: e.mesure0,
      mesureAvecZombies: e.mesureAvecZombies,
      mesureFinale: e.mesureFinale,
      zombies: e.zombies,
      mesures: e.mesures,
    },
    crash: e.crash,
  };
  return { texte: L.join('\n'), json };
}

main().then(
  (code) => {
    process.exit(code);
  },
  (error: unknown) => {
    console.error('Le banc a échoué :', error);
    process.exit(3);
  },
);
