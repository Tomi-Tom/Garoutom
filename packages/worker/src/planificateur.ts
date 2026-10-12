/**
 * Le planificateur : toutes les échéances de toutes les tables, une alarme.
 *
 * Un Durable Object n'a **qu'une** alarme (`setAlarm` remplace la précédente),
 * et un `setTimeout` meurt avec l'instance — à l'hibernation, à l'éviction, au
 * déploiement. Le cœur des tables (`rooms.ts`, D20) ne garde donc aucune
 * minuterie : il demande à son hôte « réveille-moi pour ce code à telle
 * heure » (`HostServices.wake`), et c'est ici que la demande devient durable.
 *
 * - `wake(code, at)` range l'échéance dans la table `wakeups` (une ligne par
 *   code, la dernière demande remplace la précédente ; `null` l'efface), puis
 *   réarme l'alarme sur la plus proche.
 * - `run(now, tick)` est appelé par `alarm()` : il prend les codes dus (50 au
 *   plus par passage — le reste suit aussitôt, l'alarme étant réarmée dans le
 *   passé), appelle `tick` pour chacun, **isolément**, et réarme toujours.
 *
 * Il ne lève jamais : une alarme qui lève est retentée par le runtime, six
 * fois au plus, puis abandonnée — et toutes les tables avec elle. Une table
 * dont le `tick` échoue (ce qui ne devrait pas arriver : le cœur rattrape ses
 * propres erreurs) est repoussée à délai croissant, `min(60 s, 2^essais s)`,
 * sans retarder les autres.
 *
 * ## Le retard d'alarme
 *
 * L'heure de l'alarme armée est rangée dans `meta` ; au passage suivant, la
 * différence avec l'horloge est le retard réel du runtime. On garde le
 * dernier et le pire, lus par `/health?profond=1` : c'est la mesure qui dira
 * si une phase peut se clore en retard, et de combien.
 *
 * ## Le balayage
 *
 * Une fois par heure (tant qu'il y a des tables), `balayer` passe sur tout le
 * magasin : un réveil perdu — un bogue, une ligne effacée à la main — ne peut
 * pas figer une table plus d'une heure. Le cœur, idempotent, ne fait que ce
 * qui est dû.
 */

import { noter, raconter } from './journal.js';
import { ecrireMeta, lireMetaNombre, migrer, type StockageSql } from './stockage.js';

/** Ce qu'il faut de l'alarme de l'objet. `DurableObjectStorage` le satisfait. */
export interface StockageAlarme extends StockageSql {
  setAlarm(heure: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

export interface OptionsPlanificateur {
  /** L'horloge (ms) ; `Date.now` par défaut. */
  maintenant?: () => number;
  /**
   * Une échéance supplémentaire, hors tables : la veille des sockets muettes
   * (voir `tables.ts`). `null` : rien à surveiller.
   */
  veille?: () => number | null;
  /** Le passage horaire sur tout le magasin. */
  balayer?: (maintenant: number) => Promise<void>;
  /** Y a-t-il quelque chose à balayer ? Sans tables, pas d'alarme horaire. */
  aBalayer?: () => boolean;
  /** L'intervalle du balayage ; une heure par défaut. */
  balayageMs?: number;
}

/** Ce que rend un passage d'alarme — pour le journal et les tests. */
export interface Passage {
  traites: number;
  echecs: number;
  /** Retard de ce passage sur l'heure armée, en ms (`null` si inconnue). */
  retardMs: number | null;
  balaye: boolean;
}

/** Codes pris à chaque passage. */
export const LOT_DE_REVEILS = 50;
/** Plafond du délai entre deux essais d'une table en échec. */
export const DELAI_MAX_ESSAI_MS = 60_000;
/** Un réveil redemandé dans le passé pendant son propre `tick` part au plus tôt dans une seconde. */
export const ANTI_BOUCLE_MS = 1_000;
const HEURE_MS = 3_600_000;

/** Le délai avant l'essai numéro `essais` (1, 2, 3…) : 2 s, 4 s, 8 s… plafonné à 60 s. */
export function delaiEssai(essais: number): number {
  return Math.min(DELAI_MAX_ESSAI_MS, 2 ** Math.max(1, essais) * 1_000);
}

export class Planificateur {
  private readonly maintenant: () => number;
  /** L'heure que l'on croit armée ; `undefined` : inconnue, il faut (ré)écrire. */
  private armee: number | null | undefined = undefined;
  /**
   * Un compteur par code, incrémenté à chaque `wake` : il dit si `tick` a
   * redemandé un réveil pendant son passage (alors la ligne lui appartient)
   * ou non (alors la ligne due est consommée).
   */
  private readonly generations = new Map<string, number>();

  constructor(
    private readonly stockage: StockageAlarme,
    private readonly options: OptionsPlanificateur = {},
  ) {
    this.maintenant = options.maintenant ?? (() => Date.now());
    migrer(stockage);
  }

  /** `HostServices.wake` : range (ou oublie) le réveil d'une table, puis réarme. */
  wake(code: string, at: number | null): void {
    try {
      this.generations.set(code, (this.generations.get(code) ?? 0) + 1);
      if (at === null || !Number.isFinite(at)) {
        this.stockage.sql.exec('DELETE FROM wakeups WHERE code = ?', code);
      } else {
        this.stockage.sql.exec(
          `INSERT INTO wakeups (code, at, essais) VALUES (?, ?, 0)
           ON CONFLICT(code) DO UPDATE SET at = excluded.at, essais = 0`,
          code,
          Math.round(at),
        );
      }
    } catch (erreur) {
      noter('erreur', 'reveil-non-range', { code, ...raconter(erreur) });
    }
    this.rearm();
  }

  /** La plus proche échéance de table, ou `null`. */
  prochainReveil(): number | null {
    const ligne = this.stockage.sql.exec('SELECT MIN(at) AS at FROM wakeups').toArray()[0];
    const at = ligne?.at;
    return typeof at === 'number' ? at : null;
  }

  /** Les réveils rangés, pour le dépannage et les tests. */
  reveils(): { code: string; at: number; essais: number }[] {
    return this.stockage.sql
      .exec('SELECT code, at, essais FROM wakeups ORDER BY at, code')
      .toArray()
      .map((ligne) => ({ code: String(ligne.code), at: Number(ligne.at), essais: Number(ligne.essais) }));
  }

  /** L'heure à laquelle l'alarme doit sonner : la plus proche de toutes les échéances. */
  cible(): number | null {
    const candidates: number[] = [];
    const reveil = this.prochainReveil();
    if (reveil !== null) candidates.push(reveil);
    const veille = this.options.veille?.() ?? null;
    if (veille !== null && Number.isFinite(veille)) candidates.push(veille);
    if (this.options.aBalayer?.() === true) {
      let balayage = lireMetaNombre(this.stockage, 'balayage_at');
      if (balayage === null) {
        // Rangé tout de suite : une cible recalculée à chaque appel
        // réécrirait l'alarme à chaque `wake`.
        balayage = this.maintenant() + this.balayageMs();
        ecrireMeta(this.stockage, 'balayage_at', balayage);
      }
      candidates.push(balayage);
    }
    return candidates.length === 0 ? null : Math.min(...candidates);
  }

  /**
   * Arme l'alarme sur la plus proche échéance, ou l'efface s'il n'y en a pas.
   * N'écrit que si la cible change. Ne lève jamais.
   */
  rearm(): void {
    try {
      const cible = this.cible();
      if (cible === this.armee) return;
      this.armee = cible;
      ecrireMeta(this.stockage, 'alarme_at', cible);
      const ecriture = cible === null ? this.stockage.deleteAlarm() : this.stockage.setAlarm(cible);
      // La porte de sortie de l'objet attend cette écriture avant tout envoi :
      // on n'a pas à l'attendre nous-mêmes, seulement à ne pas perdre l'erreur.
      void Promise.resolve(ecriture).catch((erreur: unknown) => {
        this.armee = undefined;
        noter('erreur', 'alarme-non-armee', { cible, ...raconter(erreur) });
      });
    } catch (erreur) {
      this.armee = undefined;
      noter('erreur', 'alarme-non-armee', raconter(erreur));
    }
  }

  /**
   * Un passage d'alarme : chaque table due, isolément, puis le balayage s'il
   * est dû, puis le réarmement. Ne lève jamais.
   */
  async run(maintenant: number, tick: (code: string) => Promise<void>): Promise<Passage> {
    const passage: Passage = { traites: 0, echecs: 0, retardMs: null, balaye: false };
    // L'alarme qui sonne est consommée : ce que l'on croyait armé ne l'est plus.
    this.armee = undefined;
    try {
      passage.retardMs = this.mesurerRetard(maintenant);
      const dus = this.stockage.sql
        .exec('SELECT code, at, essais FROM wakeups WHERE at <= ? ORDER BY at LIMIT ?', maintenant, LOT_DE_REVEILS)
        .toArray();
      for (const ligne of dus) {
        const code = String(ligne.code);
        const essais = Number(ligne.essais);
        const generation = this.generations.get(code) ?? 0;
        try {
          await tick(code);
          passage.traites += 1;
          this.apresTick(code, Number(ligne.at), generation, maintenant);
        } catch (erreur) {
          passage.echecs += 1;
          this.repousser(code, essais + 1, maintenant, erreur);
        }
      }
      passage.balaye = await this.balayerSiDu(maintenant);
    } catch (erreur) {
      noter('erreur', 'passage-alarme', raconter(erreur));
    } finally {
      this.rearm();
    }
    if (passage.echecs > 0 || (passage.retardMs ?? 0) > 5_000) {
      noter('avert', 'passage-alarme', { ...passage });
    }
    return passage;
  }

  /** Les mesures du planificateur, pour `/health?profond=1`. */
  mesures(): { prochaineAlarme: number | null; dernierRetardMs: number | null; pireRetardMs: number | null; reveils: number } {
    const ligne = this.stockage.sql.exec('SELECT COUNT(*) AS n FROM wakeups').toArray()[0];
    return {
      prochaineAlarme: lireMetaNombre(this.stockage, 'alarme_at'),
      dernierRetardMs: lireMetaNombre(this.stockage, 'retard_dernier_ms'),
      pireRetardMs: lireMetaNombre(this.stockage, 'retard_pire_ms'),
      reveils: Number(ligne?.n ?? 0),
    };
  }

  /** Efface les réveils des codes absents de `rooms` (balayage). Rend leur nombre. */
  oublierOrphelins(): number {
    const avant = this.stockage.sql.exec('SELECT COUNT(*) AS n FROM wakeups').toArray()[0]?.n;
    this.stockage.sql.exec('DELETE FROM wakeups WHERE code NOT IN (SELECT code FROM rooms)');
    const apres = this.stockage.sql.exec('SELECT COUNT(*) AS n FROM wakeups').toArray()[0]?.n;
    return Number(avant ?? 0) - Number(apres ?? 0);
  }

  /* ── détails ───────────────────────────────────────────────────────── */

  private balayageMs(): number {
    return this.options.balayageMs ?? HEURE_MS;
  }

  private mesurerRetard(maintenant: number): number | null {
    const armee = lireMetaNombre(this.stockage, 'alarme_at');
    if (armee === null) return null;
    const retard = Math.max(0, maintenant - armee);
    ecrireMeta(this.stockage, 'retard_dernier_ms', retard);
    const pire = lireMetaNombre(this.stockage, 'retard_pire_ms') ?? 0;
    if (retard > pire) ecrireMeta(this.stockage, 'retard_pire_ms', retard);
    return retard;
  }

  /**
   * Après un `tick` réussi : si la table n'a rien redemandé, la ligne due est
   * consommée ; si elle a redemandé une échéance déjà passée, on la décale
   * d'une seconde pour qu'un cœur qui se réveille en boucle ne fige pas
   * l'objet.
   */
  private apresTick(code: string, atLu: number, generation: number, maintenant: number): void {
    if ((this.generations.get(code) ?? 0) === generation) {
      this.stockage.sql.exec('DELETE FROM wakeups WHERE code = ? AND at = ?', code, atLu);
      return;
    }
    this.stockage.sql.exec(
      'UPDATE wakeups SET at = ? WHERE code = ? AND at <= ?',
      maintenant + ANTI_BOUCLE_MS,
      code,
      maintenant,
    );
  }

  private repousser(code: string, essais: number, maintenant: number, erreur: unknown): void {
    const at = maintenant + delaiEssai(essais);
    noter('erreur', 'tick-en-echec', { code, essais, prochainEssai: at, ...raconter(erreur) });
    try {
      this.stockage.sql.exec(
        `INSERT INTO wakeups (code, at, essais) VALUES (?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET at = excluded.at, essais = excluded.essais`,
        code,
        at,
        essais,
      );
    } catch (autre) {
      noter('erreur', 'reveil-non-range', { code, ...raconter(autre) });
    }
  }

  private async balayerSiDu(maintenant: number): Promise<boolean> {
    if (this.options.aBalayer?.() !== true) {
      ecrireMeta(this.stockage, 'balayage_at', null);
      return false;
    }
    const du = lireMetaNombre(this.stockage, 'balayage_at');
    // Jamais programmé : il l'est par `cible()` au réarmement qui suit.
    if (du === null || du > maintenant) return false;
    // Programmé d'abord : un balayage qui échoue ne se rejoue pas en boucle.
    ecrireMeta(this.stockage, 'balayage_at', maintenant + this.balayageMs());
    try {
      await this.options.balayer?.(maintenant);
    } catch (erreur) {
      noter('erreur', 'balayage-en-echec', raconter(erreur));
    }
    return true;
  }
}
