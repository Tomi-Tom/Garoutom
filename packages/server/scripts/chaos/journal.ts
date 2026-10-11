/**
 * Le carnet du banc : compteurs, latences, violations d'invariants, et un
 * journal JSONL horodaté de tout ce qui s'est passé — de quoi rejouer une
 * séquence à la main.
 */

import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { dirname } from 'node:path';

export type Gravite = 'critique' | 'majeure' | 'mineure' | 'info';

export interface Violation {
  invariant: string;
  gravite: Gravite;
  t: number;
  table: number | null;
  code: string | null;
  partie: number | null;
  robot: string | null;
  siege: number | null;
  detail: string;
  /** Les derniers évènements de la table : la séquence qui y a mené. */
  sequence: string[];
}

export class Journal {
  readonly t0 = Date.now();
  readonly compteurs = new Map<string, number>();
  readonly latences = new Map<string, number[]>();
  readonly violations: Violation[] = [];
  private readonly dejaVues = new Set<string>();
  private readonly flux: WriteStream | null;

  constructor(
    readonly fichier: string | null,
    private readonly bavard: boolean,
  ) {
    if (fichier) {
      mkdirSync(dirname(fichier), { recursive: true });
      this.flux = createWriteStream(fichier, { flags: 'w' });
    } else {
      this.flux = null;
    }
  }

  /** Secondes écoulées depuis le début, pour les journaux. */
  t(at = Date.now()): string {
    return `${((at - this.t0) / 1000).toFixed(1)}s`;
  }

  inc(cle: string, n = 1): void {
    this.compteurs.set(cle, (this.compteurs.get(cle) ?? 0) + n);
  }

  get(cle: string): number {
    return this.compteurs.get(cle) ?? 0;
  }

  latence(cle: string, ms: number): void {
    const liste = this.latences.get(cle) ?? [];
    liste.push(ms);
    this.latences.set(cle, liste);
  }

  ecrire(evenement: Record<string, unknown>): void {
    this.flux?.write(`${JSON.stringify({ at: this.t(), ...evenement })}\n`);
  }

  console(ligne: string): void {
    this.ecrire({ type: 'log', ligne });
    if (this.bavard) console.log(`${this.t()} ${ligne}`);
  }

  /**
   * Une violation, dédoublonnée sur `cle` si fournie : une même fuite vue à
   * chaque sync ne compte qu'une fois.
   */
  violation(v: Omit<Violation, 't'>, cle?: string): void {
    if (cle !== undefined) {
      if (this.dejaVues.has(cle)) {
        this.inc(`repetition:${v.invariant}`);
        return;
      }
      this.dejaVues.add(cle);
    }
    const complete: Violation = { ...v, t: Date.now() };
    this.violations.push(complete);
    this.inc(`violation:${v.invariant}`);
    this.ecrire({ type: 'violation', ...complete });
    if (v.gravite !== 'info') {
      console.log(
        `${this.t()} ✗ [${v.gravite}] ${v.invariant} — table ${String(v.table ?? '-')} ${v.code ?? ''} ${v.robot ?? ''} : ${v.detail}`,
      );
    }
  }

  fermer(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.flux) {
        resolve();
        return;
      }
      this.flux.end(() => {
        resolve();
      });
    });
  }
}

export function centile(valeurs: number[], p: number): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const rang = Math.min(tri.length - 1, Math.max(0, Math.ceil((p / 100) * tri.length) - 1));
  return tri[rang] ?? null;
}
