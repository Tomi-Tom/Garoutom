/**
 * La mécanique pure du fil : quels onglets, quels groupes de messages, quelle
 * phrase quand on ne peut pas écrire. Rien ici ne touche au DOM, tout se
 * teste à la main.
 */
import type { ChatChannel, ChatMessage, GameView } from '@garoutom/engine';

/** Longueur maximale d'un message (R78). */
export const LIMITE_MESSAGE = 280;

/** À partir de là le compteur de caractères apparaît. */
export const SEUIL_COMPTEUR = 240;

/** L'ordre des onglets, du plus public au plus secret. */
export const ORDRE_CANAUX: readonly ChatChannel[] = ['village', 'loups', 'amoureux', 'morts'];

/** La teinte d'un canal, en variable CSS de la palette. */
export const TEINTE_CANAL: Record<ChatChannel, string> = {
  village: 'var(--lanterne)',
  loups: 'var(--sang)',
  amoureux: 'var(--serment)',
  morts: 'var(--lune)',
};

/**
 * Les onglets : seulement ce que ce siège peut lire. Un canal est lisible
 * s'il a déjà parlé dans la vue (le serveur la filtre) ou si l'on peut y
 * écrire maintenant ; le village s'affiche toujours quand le chat est ouvert.
 * `restreint` (le mode intégré) ne fait que réduire la liste.
 */
export function ongletsVisibles(game: GameView, restreint?: readonly ChatChannel[]): ChatChannel[] {
  const presents = new Set<ChatChannel>(game.channels);
  for (const message of game.chat) presents.add(message.channel);
  if (game.options.chat) presents.add('village');
  const visibles = ORDRE_CANAUX.filter(
    (canal) => presents.has(canal) && (restreint === undefined || restreint.includes(canal)),
  );
  // Chat coupé et rien à lire : le village reste là pour dire « parlez à voix haute ».
  if (visibles.length === 0 && (restreint === undefined || restreint.includes('village'))) return ['village'];
  return visibles;
}

/** Les messages d'un canal, dans l'ordre d'arrivée. */
export function messagesDuCanal(game: GameView, canal: ChatChannel): ChatMessage[] {
  return game.chat.filter((message) => message.channel === canal);
}

/** Combien de messages des autres n'ont pas encore été vus dans ce canal. */
export function compterNonLus(
  game: GameView,
  canal: ChatChannel,
  dernierVu: number,
): number {
  const moi = game.you?.seat;
  return game.chat.filter(
    (message) => message.channel === canal && message.id > dernierVu && message.seat !== moi,
  ).length;
}

/** Un message ou une coupure du fil. */
export type Ligne =
  | { type: 'separateur'; cle: string; jour: number }
  | { type: 'groupe'; cle: string; seat: number; messages: ChatMessage[] };

/**
 * Les lignes du fil : un séparateur à chaque changement de jour, et les
 * messages consécutifs d'un même auteur réunis sous un seul pseudo.
 */
export function ordonner(messages: readonly ChatMessage[]): Ligne[] {
  const lignes: Ligne[] = [];
  let jour: number | null = null;
  for (const message of messages) {
    if (message.day !== jour) {
      jour = message.day;
      lignes.push({ type: 'separateur', cle: `j${String(jour)}-${String(message.id)}`, jour });
    }
    const derniere = lignes[lignes.length - 1];
    if (derniere?.type === 'groupe' && derniere.seat === message.seat) {
      derniere.messages.push(message);
    } else {
      lignes.push({
        type: 'groupe',
        cle: `m${String(message.id)}`,
        seat: message.seat,
        messages: [message],
      });
    }
  }
  return lignes;
}

/**
 * Pourquoi l'on ne peut pas écrire dans ce canal maintenant — dans la voix
 * sobre de la table, sans jamais en dire plus que la vue n'en sait.
 */
export function raisonSilence(game: GameView, canal: ChatChannel): string {
  const vivant = game.you?.alive === true;
  const spectateur = game.you === null;
  switch (canal) {
    case 'village':
      if (!game.options.chat) return 'Discussion à la table : parlez à voix haute.';
      if (spectateur) return 'Vous regardez la table sans y siéger.';
      if (!vivant) return 'Les morts ne parlent qu’aux morts.';
      if (game.phase === 'nuit' || game.phase === 'revelation') return 'Le village se tait la nuit.';
      return 'Le village n’a pas la parole pour l’instant.';
    case 'loups':
      // Un mort qui voit tout lit la meute sans en être.
      if (!vivant) return 'Un loup mort ne rejoint plus la meute : vous ne faites que l’écouter.';
      if (game.phase !== 'nuit') return 'La meute ne parle qu’une fois la nuit tombée.';
      return 'Vous entendez la meute, sans pouvoir lui répondre.';
    case 'amoureux':
      if (game.lover === null) return 'Ce murmure n’est pas le vôtre : vous ne faites que l’entendre.';
      return 'Le serment est brisé : plus un mot ne passe.';
    case 'morts':
      return 'Seuls les morts prennent la parole ici.';
  }
}
