/**
 * Les services d'hôte du Durable Object.
 *
 * Le cœur des tables (`rooms.ts`) ne lit jamais l'horloge ni le hasard
 * lui-même : il les emprunte à son hôte. Au serveur Node, `node:crypto` ; ici,
 * les primitives Web que tout Worker possède sans drapeau de compatibilité —
 * `Date.now()`, `crypto.randomUUID()`, `crypto.getRandomValues()` — et les
 * minuteries ordinaires.
 *
 * ## Les minuteries, et leur limite
 *
 * Un `setTimeout` vit dans la mémoire de l'objet. Tant qu'une connexion est
 * ouverte, l'objet reste éveillé et la minuterie part à l'heure : c'est le cas
 * de toute partie en cours, puisqu'une partie, ce sont des joueurs connectés.
 * Mais un objet sans connexion ni requête en vol peut être évincé au bout de
 * quelques secondes, et ses minuteries partent avec lui. Concrètement : une
 * table où **tout le monde** a perdu le réseau en même temps ne verra jamais
 * sa grâce expirer, ni son recyclage — l'objet s'éteint, et la table avec.
 * Personne n'y était plus assis ; on l'assume.
 *
 * La piste, le jour où les tables devront survivre à une éviction : ranger
 * les échéances dans le stockage de l'objet et les confier à **une alarme**
 * (`storage.setAlarm` sur la plus proche), qui réveille l'objet même vide.
 * Le contrat `HostServices` le permet déjà — `set` et `clear` sont les seuls
 * points à changer — mais il faudra aussi que `rooms.ts` sache réarmer une
 * phase à partir de `room.timing` après un réveil, ce qu'il ne fait pas
 * encore : aujourd'hui, une minuterie déjà rangée pour la phase en cours
 * n'est jamais réarmée.
 */

import type { HostServices, TimerHandle } from '@garoutom/server';

/** Ce qu'il faut de `crypto` pour tirer au sort — injectable dans les tests. */
export interface Hasard {
  getRandomValues<T extends Uint32Array>(tableau: T): T;
  randomUUID(): string;
}

const DEUX_PUISSANCE_32 = 0x1_0000_0000;

/**
 * Un entier uniforme dans `[0, borne[`, tiré d'un générateur cryptographique.
 *
 * Le simple modulo biaiserait les petites valeurs dès que la borne ne divise
 * pas 2³² : on rejette donc les tirages qui tombent dans la dernière tranche
 * incomplète, et l'on retire. La borne va jusqu'à 2³² inclus — c'est celle des
 * graines de partie (`randomInt(0x1_0000_0000)` dans `rooms.ts`).
 */
export function entierUniforme(borne: number, hasard: Pick<Hasard, 'getRandomValues'>): number {
  if (!Number.isSafeInteger(borne) || borne <= 0 || borne > DEUX_PUISSANCE_32) {
    throw new RangeError(`Borne de tirage invalide : ${String(borne)}`);
  }
  const plafond = DEUX_PUISSANCE_32 - (DEUX_PUISSANCE_32 % borne);
  const tirage = new Uint32Array(1);
  for (;;) {
    hasard.getRandomValues(tirage);
    const valeur = tirage[0] ?? 0;
    if (valeur < plafond) return valeur % borne;
  }
}

/** Les services d'hôte du Worker, sur les primitives Web de l'objet global. */
export function servicesWorker(hasard: Hasard = crypto): HostServices {
  return {
    now: () => Date.now(),
    uuid: () => hasard.randomUUID(),
    randomInt: (borne) => entierUniforme(borne, hasard),
    set: (run, delay) => setTimeout(run, delay),
    clear: (handle: TimerHandle) => {
      clearTimeout(handle as number);
    },
  };
}
