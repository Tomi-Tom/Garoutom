/**
 * Les services d'hôte du Durable Object.
 *
 * Le cœur des tables (`rooms.ts`) ne lit jamais l'horloge ni le hasard
 * lui-même : il les emprunte à son hôte. Au serveur Node, `node:crypto` ; ici,
 * les primitives Web que tout Worker possède sans drapeau de compatibilité —
 * `Date.now()`, `crypto.randomUUID()`, `crypto.getRandomValues()`.
 *
 * ## Le temps : aucune minuterie, des réveils (D20, D21)
 *
 * Un `setTimeout` vit dans la mémoire de l'objet : il meurt à l'hibernation,
 * à l'éviction, au déploiement — et, tant qu'il est en attente, il empêche
 * l'objet de s'endormir. Le cœur ne garde donc plus aucune minuterie : il
 * range ses échéances dans la table (`nextWake`) et demande à son hôte de le
 * réveiller (`wake(code, at)`). Ici, `wake` est le planificateur
 * (`planificateur.ts`) : une ligne SQLite par table et **une alarme** pour
 * toutes, qui réveille l'objet même vide, même après un déploiement.
 */

import type { HostServices } from '@garoutom/server';

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
 * graines de partie (`randomInt(2 ** 32)` dans `rooms.ts`).
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

/** Les services d'hôte du Worker : primitives Web, et les réveils du planificateur. */
export function servicesWorker(
  wake: HostServices['wake'],
  hasard: Hasard = crypto,
  maintenant: () => number = () => Date.now(),
): HostServices {
  return {
    now: maintenant,
    uuid: () => hasard.randomUUID(),
    randomInt: (borne) => entierUniforme(borne, hasard),
    wake,
  };
}
