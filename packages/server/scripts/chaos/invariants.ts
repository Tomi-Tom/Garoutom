/**
 * Ce qu'un siège a le droit de voir, vérifié de l'extérieur.
 *
 * Le banc ne détient pas l'état brut : il ne peut pas recalculer
 * `viewFor(state, seat)`. Il dispose en revanche de la vérité que les robots
 * lui remontent — chacun connaît son propre rôle — et peut donc vérifier que
 * toute information sur autrui reçue par un siège a une raison d'y être
 * (R77, R80, R88). Fonction pure : elle se teste sans serveur.
 */

import { campOf, type GameView, type RoleId, type RoomView } from '@garoutom/engine';

export interface Fuite {
  type: string;
  detail: string;
}

/** Les rôles qu'un évènement public peut retourner (Idiot, Chasseur, Ancien, Bouc). */
const REVELABLES: ReadonlySet<RoleId> = new Set<RoleId>(['idiot', 'chasseur', 'ancien', 'bouc']);

/**
 * Les fuites d'une vue reçue par le siège `moi`, compte tenu des rôles connus
 * (`verite` : siège → rôle, tel que chaque robot le voit pour lui-même).
 */
export function fuitesDeVue(
  vue: GameView,
  room: RoomView,
  verite: ReadonlyMap<number, RoleId>,
  moi: number,
): Fuite[] {
  const fuites: Fuite[] = [];
  const you = vue.you;
  if (!you) {
    fuites.push({ type: 'vue-sans-siege', detail: `le siège ${String(moi)} reçoit une vue de spectateur` });
    return fuites;
  }
  if (you.seat !== moi) {
    fuites.push({ type: 'siege-incoherent', detail: `vue du siège ${String(you.seat)} reçue par le siège ${String(moi)}` });
  }
  const omniscient = vue.over || (!you.alive && vue.options.mortsVoientTout);
  const loupVivant = you.alive && campOf(you.role) === 'loups';
  const inspectes = new Map<number, RoleId>();
  for (const i of vue.inspections) inspectes.set(i.target, i.role);
  const moiLabel = `siège ${String(moi)} (${you.role}${you.alive ? '' : ', mort'})`;

  for (const p of vue.players) {
    if (p.seat === moi || p.role === null) continue;
    const vrai = verite.get(p.seat);
    const decrit = `${moiLabel} voit « ${p.role} » au siège ${String(p.seat)} (${p.alive ? 'vivant' : 'mort'}, vrai rôle ${vrai ?? '?'})`;
    if (omniscient || (!p.alive && vue.options.revelerRoles)) {
      if (vrai !== undefined && vrai !== p.role) fuites.push({ type: 'role-faux', detail: decrit });
      continue;
    }
    if (loupVivant && p.role === 'loup' && (vrai === undefined || campOf(vrai) === 'loups')) continue;
    if (you.role === 'voyante' && inspectes.get(p.seat) === p.role) continue;
    if (REVELABLES.has(p.role) && (vrai === undefined || vrai === p.role)) continue;
    fuites.push({ type: 'role-visible', detail: decrit });
  }

  if (vue.pack !== null) {
    if (!(loupVivant || (omniscient && !vue.over))) {
      fuites.push({ type: 'meute-visible', detail: `${moiLabel} reçoit la meute ${JSON.stringify(vue.pack.seats)}` });
    } else {
      for (const seat of vue.pack.seats) {
        const vrai = verite.get(seat);
        if (vrai !== undefined && campOf(vrai) !== 'loups') {
          fuites.push({ type: 'meute-fausse', detail: `${moiLabel} : siège ${String(seat)} (${vrai}) listé dans la meute` });
        }
      }
    }
  }
  if (vue.players.some((p) => p.isLover) && !(omniscient || vue.lover !== null || you.role === 'cupidon')) {
    fuites.push({ type: 'amoureux-visibles', detail: `${moiLabel} voit des amoureux sans en être` });
  }
  if (vue.inspections.length > 0 && !(you.role === 'voyante' || omniscient)) {
    fuites.push({ type: 'inspections-visibles', detail: `${moiLabel} reçoit ${String(vue.inspections.length)} sondage(s)` });
  }
  if (vue.espionnage !== null && you.role !== 'petiteFille') {
    fuites.push({ type: 'espionnage-visible', detail: `${moiLabel} reçoit l'espionnage de la Petite Fille` });
  }
  if (vue.log !== null && !vue.over) {
    fuites.push({ type: 'recit-avant-la-fin', detail: `${moiLabel} reçoit le récapitulatif en pleine partie` });
  }
  if (vue.phase === 'nuit' && vue.voted.length > 0) {
    fuites.push({ type: 'votes-de-nuit', detail: `${moiLabel} voit « a voté » la nuit : ${JSON.stringify(vue.voted)}` });
  }
  for (const m of vue.chat) {
    const lisible =
      m.channel === 'village' ||
      omniscient ||
      (m.channel === 'loups' && loupVivant) ||
      (m.channel === 'amoureux' && vue.lover !== null) ||
      (m.channel === 'morts' && !you.alive);
    if (!lisible) {
      fuites.push({ type: 'canal-illisible', detail: `${moiLabel} lit un message du canal « ${m.channel} »` });
      break;
    }
  }
  // R80 : l'échéance n'appartient qu'au siège qui doit agir.
  if (room.deadline !== null && vue.prompt === null) {
    fuites.push({ type: 'echeance-sans-consigne', detail: `${moiLabel} reçoit une échéance en phase ${vue.phase}/${vue.step ?? '-'} sans rien à jouer` });
  }
  return fuites;
}

/** Budget d'une phase selon R82, en ms (0 : pas de minuterie). */
export function budgetPhase(phase: string, step: string | null, tempsNuit: number, tempsJour: number): number {
  switch (phase) {
    case 'revelation':
      return 25_000;
    case 'nuit':
      // Une étape fantôme dure 5 à 10 s : le budget de nuit la couvre.
      return Math.max(tempsNuit * 1_000, step === 'principale' ? 0 : 10_000);
    case 'chasseur':
    case 'succession':
    case 'bouc':
      return 30_000;
    case 'election':
      return 90_000;
    case 'jour':
      return tempsJour * 1_000;
    default:
      return 0;
  }
}
