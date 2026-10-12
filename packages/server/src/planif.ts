/**
 * Le temps est une donnée (D20).
 *
 * Le serveur ne garde aucune minuterie comme source de vérité. Ce qui est dû
 * — clôturer une phase, éteindre une grâce, recycler une table vide — se lit
 * dans la table elle-même, en dates. `nextWake` dit quand il faudra revenir ;
 * l'hôte (Node : un `setTimeout` ; Worker : une alarme) ne fait que réveiller
 * `RoomManager.tick`, qui refait le calcul et agit. Un réveil en retard, en
 * double ou perdu ne change donc rien à ce qui se passe — seulement à quand.
 */

import { isAlive } from '@garoutom/engine';

import type { Room } from './modele.js';

/** Une table vidée au salon est recyclée au bout de deux minutes (D23). */
export const EMPTY_LOBBY_TTL_MS = 2 * 60_000;
/** Une table finie que plus personne ne regarde est recyclée au bout d'un quart d'heure. */
export const EMPTY_ROOM_TTL_MS = 15 * 60_000;
/**
 * Une table sans la moindre écriture depuis six heures est balayée, quel que
 * soit son état : une partie suspendue faute de vivants (D19) n'attend pas
 * éternellement.
 */
export const IDLE_ROOM_MS = 6 * 60 * 60_000;
/** Le chien de garde force toute table dont un réveil est dû depuis plus de 5 s (D20). */
export const WATCHDOG_LATE_MS = 5_000;
/** Une erreur inattendue dans `tick` : nouvel essai après 5, 10, puis 20 s ; ensuite, interruption. */
export const RETRY_DELAYS_MS: readonly number[] = [5_000, 10_000, 20_000];

/**
 * Le délai de recyclage d'une table vide, selon son état — `null` pour une
 * partie en cours : elle ne se recycle pas parce que tout le monde est parti,
 * elle se suspend (D19) et attend son monde ; seul le balayage des tables
 * oubliées la retire.
 */
export function emptyTtl(room: Room): number | null {
  if (room.status === 'lobby') return EMPTY_LOBBY_TTL_MS;
  if (room.status === 'finished') return EMPTY_ROOM_TTL_MS;
  return null;
}

/** La table est vide depuis assez longtemps, ou oubliée depuis trop longtemps : on la recycle. */
export function isRecyclable(room: Room, now: number): boolean {
  if (now >= room.updatedAt + IDLE_ROOM_MS) return true;
  if (room.emptySince === null) return false;
  if (room.players.some((player) => player.socketId !== null)) return false;
  const ttl = emptyTtl(room);
  return ttl !== null && now >= room.emptySince + ttl;
}

/**
 * La prochaine date à laquelle quelque chose sera dû pour cette table, ou
 * `null` si rien ne l'est. Fonction pure.
 *
 * Le minimum de :
 * - l'échéance de la phase, si l'horloge n'est pas suspendue (R80, D19) ;
 * - la fin de chaque grâce — au salon, la place se libère ; en partie, le
 *   joueur est montré absent (D17) ;
 * - chaque échéance d'abandon à venir d'un siège vivant (D18) ;
 * - le recyclage d'une table vide, et le balayage des tables oubliées.
 *
 * Une échéance d'abandon déjà passée n'y figure pas : elle ne se réalise qu'à
 * la clôture de la phase (R101), qui a déjà sa propre date.
 */
export function nextWake(room: Room, now: number): number | null {
  let at = room.updatedAt + IDLE_ROOM_MS;
  const consider = (date: number | null): void => {
    if (date !== null && date < at) at = date;
  };

  const timing = room.timing;
  const paused = timing !== null && timing.pausedAt !== null;
  if (room.status === 'playing' && timing !== null && !paused) consider(timing.deadline);

  for (const player of room.players) {
    if (player.socketId !== null) continue;
    if (!player.absent) consider(player.disconnectedUntil);
    if (
      room.status === 'playing' &&
      !paused &&
      player.abandonAt !== null &&
      player.abandonAt > now &&
      room.game !== null &&
      seatIsAlive(room, player.seat)
    ) {
      consider(player.abandonAt);
    }
  }

  const ttl = emptyTtl(room);
  if (room.emptySince !== null && ttl !== null) consider(room.emptySince + ttl);
  return at;
}

function seatIsAlive(room: Room, seat: number): boolean {
  const game = room.game;
  if (!game || seat < 0 || seat >= game.players.length) return false;
  return isAlive(game, seat);
}
