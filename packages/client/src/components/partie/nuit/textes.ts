/**
 * La consigne d'un prompt de nuit, dans la voix du skin.
 *
 * Les variantes suivent les champs du `Prompt` du moteur, et seulement eux
 * (SKINS.md, « Les prompts ») : le Salvateur lit la phrase de l'interdit
 * quand `forbidden` désigne quelqu'un, la Sorcière celle qui répond à sa
 * victime — ou à son absence, ou à l'interdit de se sauver soi-même. Les
 * variables sont résolues ici ; jamais une accolade n'atteint l'écran.
 */

import type { Prompt } from '@garoutom/engine';

import { resoudre, type Skin } from '../../../skins/registre.js';

/**
 * Les prompts qu'on rencontre la nuit — les autres appartiennent au jour. Le
 * Corbeau marque à l'étape principale (R93) ; le Loup Blanc trahit à la
 * sienne, les nuits paires (R97).
 */
const KINDS_DE_NUIT = ['cupidon', 'proteger', 'sonder', 'devorer', 'sorciere', 'marquer', 'trahir'] as const;

export type PromptDeNuit = Extract<Prompt, { kind: (typeof KINDS_DE_NUIT)[number] }>;

export function estPromptDeNuit(prompt: Prompt | null): prompt is PromptDeNuit {
  return prompt !== null && (KINDS_DE_NUIT as readonly string[]).includes(prompt.kind);
}

export function textePrompt(
  peau: Skin,
  prompt: PromptDeNuit,
  nom: (seat: number) => string,
  moi: number,
): string {
  const textes = peau.prompts;
  switch (prompt.kind) {
    case 'cupidon':
      return textes.cupidon;
    case 'proteger':
      return prompt.forbidden === null
        ? textes.proteger.base
        : resoudre(textes.proteger.interdit, { ancien: nom(prompt.forbidden) });
    case 'sonder':
      return textes.sonder;
    case 'devorer':
      return textes.devorer;
    case 'sorciere':
      if (prompt.victim === null) return textes.sorciere.sansVictime;
      if (prompt.victim === moi && !prompt.peutSeSauver) return textes.sorciere.soiMemeInterdit;
      return resoudre(textes.sorciere.victime, { victime: nom(prompt.victim) });
    case 'marquer':
      return textes.marquer;
    case 'trahir':
      return textes.trahir;
  }
}

/** « Nuit 3 », dans la voix du skin : le compteur est l'affaire de l'écran (le carnet, le registre). */
export function numeroDeNuit(peau: Skin, jour: number): string {
  return resoudre(peau.recit.nuit, { n: String(jour) });
}
