/**
 * Les quotas du concentrateur (D23) : aucun client ne casse la table des autres.
 *
 * Des seaux à jetons, rien de plus : un seau se remplit à un rythme fixe
 * jusqu'à sa contenance, et chaque geste coûte un jeton. La rafale est la
 * contenance, le rythme est la cadence soutenue. L'horloge est injectée —
 * les tests la font avancer à la main, comme tout le reste du serveur.
 *
 * Les quotas sont communs aux deux hôtes : Node et le Worker passent
 * l'adresse du client (`HubSocket.ip`) quand ils la connaissent, et le
 * concentrateur fait le reste.
 */

/** Les bornes, toutes réglables (`new Hub(uuid, { quotas })`). */
export interface Quotas {
  /** Cadres par seconde et par socket, en cadence soutenue… */
  framesPerSecond: number;
  /** … et en rafale. */
  frameBurst: number;
  /** Messages au fil (`dire`) par seconde et par socket… */
  direPerSecond: number;
  /** … et en rafale. */
  direBurst: number;
  /** Tables ouvertes par minute et par adresse. */
  createsPerMinute: number;
  /** `room:join` refusés par minute et par adresse — la devinette de codes. */
  failedJoinsPerMinute: number;
  /** Une socket assise à aucune table est fermée au bout de ce délai. */
  unseatedMs: number;
  /**
   * Sockets ouvertes par adresse. Plus large que les 10 de `ROBUSTESSE.md` :
   * derrière le Worker, dix-huit amis sur le même Wi-Fi n'ont qu'une adresse
   * publique, et chacun peut avoir deux onglets le temps d'une reprise.
   */
  socketsPerIp: number;
  /** Refus de quota tolérés en dix secondes avant de fermer la socket (`CLOSE_POLICY`). */
  refusalsBeforeClose: number;
}

export const DEFAULT_QUOTAS: Quotas = {
  framesPerSecond: 10,
  frameBurst: 30,
  direPerSecond: 1,
  direBurst: 5,
  createsPerMinute: 3,
  failedJoinsPerMinute: 10,
  unseatedMs: 30_000,
  socketsPerIp: 40,
  refusalsBeforeClose: 50,
};

/** Un seau à jetons. */
export class Bucket {
  private tokens: number;
  private last: number;

  /**
   * @param perMs jetons regagnés par milliseconde
   * @param burst contenance du seau
   */
  constructor(
    private readonly perMs: number,
    private readonly burst: number,
    now: number,
  ) {
    this.tokens = burst;
    this.last = now;
  }

  private refill(now: number): void {
    const elapsed = Math.max(0, now - this.last);
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.perMs);
    this.last = Math.max(this.last, now);
  }

  /** Prend un jeton s'il y en a un ; dit si le geste est permis. */
  take(now: number): boolean {
    this.refill(now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  /** Reste-t-il au moins un jeton, sans en prendre ? */
  available(now: number): boolean {
    this.refill(now);
    return this.tokens >= 1;
  }

  /** Le seau est plein : on peut l'oublier sans rien changer. */
  full(now: number): boolean {
    this.refill(now);
    return this.tokens >= this.burst;
  }
}

/** Le même seau, une fois par clé — par adresse, typiquement. */
export class KeyedBuckets {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly perMs: number,
    private readonly burst: number,
    /** Au-delà, les seaux pleins sont oubliés : la mémoire ne croît pas sans fin. */
    private readonly maxKeys = 10_000,
  ) {}

  private bucket(key: string, now: number): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) this.prune(now);
      bucket = new Bucket(this.perMs, this.burst, now);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  take(key: string, now: number): boolean {
    return this.bucket(key, now).take(now);
  }

  available(key: string, now: number): boolean {
    return this.buckets.get(key)?.available(now) ?? true;
  }

  prune(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.full(now)) this.buckets.delete(key);
  }
}

/** Une cadence « n par seconde » en jetons par milliseconde. */
export function perSecond(n: number): number {
  return n / 1000;
}

/** Une cadence « n par minute » en jetons par milliseconde. */
export function perMinute(n: number): number {
  return n / 60_000;
}
