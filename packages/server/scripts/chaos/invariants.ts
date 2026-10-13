/**
 * Ce qu'un siège a le droit de voir, vérifié de l'extérieur.
 *
 * Le banc ne détient pas l'état brut : il ne peut pas recalculer
 * `viewFor(state, seat)`. Il dispose en revanche de la vérité que les robots
 * lui remontent — chacun connaît son propre rôle — et peut donc vérifier que
 * toute information sur autrui reçue par un siège a une raison d'y être
 * (R77, R80, R88). Fonction pure : elle se teste sans serveur.
 */

import { campOf, cartePublique, type GameView, type RoleId, type RoomView } from '@garoutom/engine';

export interface Fuite {
  type: string;
  detail: string;
}

/**
 * Les rôles qu'un évènement public peut retourner (Idiot, Chasseur, Ancien,
 * Bouc). Les rôles de la v3 n'y entrent pas : aucun évènement ne retourne
 * « renard » ni « ours » dans une vue, et le Villageois-Villageois ne se
 * montre jamais — la table le lit « villageois » jusqu'à la fin (R106,
 * D31), ce que la comparaison via `cartePublique` ci-dessous vérifie.
 */
const REVELABLES: ReadonlySet<RoleId> = new Set<RoleId>(['idiot', 'chasseur', 'ancien', 'bouc']);

/**
 * Les sièges dont le camp a pu basculer sans que la vue du banc le montre :
 * le Chien-Loup rangé chez les loups (R111), le Voleur qui a pris une carte
 * de loup au talon (R110), l'Enfant Sauvage transformé (R112). Le banc lit
 * le rôle chez chaque robot, jamais le camp effectif — ces sièges peuvent
 * donc y paraître « loup » à bon droit, dans la meute comme sous la plume
 * d'un complice. Le camp des autres, lui, ne bouge jamais : la garde reste
 * stricte pour eux.
 */
function peutEtreLoup(vrai: RoleId | undefined): boolean {
  return vrai === 'chienLoup' || vrai === 'voleur' || vrai === 'enfantSauvage';
}

/**
 * Les cartes que la partie réécrit elle-même : le Voleur prend un rôle au
 * talon (R110) — n'importe lequel, le banc n'en saura rien —, et l'Enfant
 * Sauvage devient loup à la mort de son modèle (R112, D27). La vérité du
 * banc monte chez chaque robot : entre le changement et le sync de
 * l'intéressé, sa carte est inconnue — le banc ne compare pas ce qu'il ne
 * connaît pas.
 */
function carteInconnue(vrai: RoleId | undefined, role: RoleId): boolean {
  return vrai === 'voleur' || (vrai === 'enfantSauvage' && role === 'loup');
}

/**
 * Les fuites d'une vue reçue par le siège `moi`, compte tenu des rôles connus
 * (`verite` : siège → rôle, tel que chaque robot le voit pour lui-même).
 */
export function fuitesDeVue(
  vue: GameView,
  room: RoomView,
  verite: ReadonlyMap<number, RoleId>,
  moi: number,
  /** Le numéro du groupe de fratrie du lecteur, quand l'appelant tient l'état (D45) ; `null` : le banc, qui ne le connaît pas. */
  groupe: number | null = null,
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
  // Le Chien-Loup rangé chez les loups lit la meute et son canal (R111,
  // R109) — mais son rangement est un secret que sa vue ne porte pas : le
  // banc ne peut pas le vérifier, il le tient pour loup tant qu'il vit.
  // L'Enfant transformé, lui, se lit « loup » (D27) : campOf le dit déjà.
  // D46 : pendant la phase du Voleur, la carte du siège est null dans sa
  // propre vue — pas encore vue. Une carte inconnue n'ouvre ni meute ni
  // canal de loups : le banc ne la tient pour rien.
  const loupVivant =
    you.role !== null && you.alive && (campOf(you.role) === 'loups' || you.role === 'chienLoup');
  const inspectes = new Map<number, RoleId>();
  for (const i of vue.inspections) inspectes.set(i.target, i.role);
  const moiLabel = `siège ${String(moi)} (${you.role}${you.alive ? '' : ', mort'})`;

  for (const p of vue.players) {
    if (p.seat === moi || p.role === null) continue;
    const vrai = verite.get(p.seat);
    // Le visage public de la vérité : le Villageois-Villageois se lit
    // « villageois » de toute la table, morts voyants tout compris — seule
    // la fin de partie, où plus rien n'est caché, dit villageois2 (R106).
    const attendu = vue.over ? vrai : vrai === undefined ? undefined : cartePublique(vrai);
    const decrit = `${moiLabel} voit « ${p.role} » au siège ${String(p.seat)} (${p.alive ? 'vivant' : 'mort'}, vrai rôle ${vrai ?? '?'})`;
    if (omniscient || (!p.alive && vue.options.revelerRoles)) {
      if (
        attendu !== undefined &&
        attendu !== p.role &&
        // Fin de partie : la vraie carte du Villageois-Villageois se révèle
        // (R77) alors que la vérité du banc — lue chez le porteur pendant
        // la partie — n'en a encore que le visage masqué (R106, D31).
        !(vue.over && cartePublique(p.role) === attendu) &&
        // La carte du Voleur prise au talon, l'Enfant devenu loup : la
        // partie les réécrit (R110, R112) et la vérité du banc peut être en
        // retard d'un sync.
        !carteInconnue(vrai, p.role)
      ) fuites.push({ type: 'role-faux', detail: decrit });
      continue;
    }
    if (
      loupVivant &&
      p.role === 'loup' &&
      (vrai === undefined || campOf(vrai) === 'loups' || peutEtreLoup(vrai))
    ) continue;
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
        // Le Chien-Loup rangé, le Voleur déguisé, l'Enfant transformé : leur
        // camp a pu basculer, la vérité du banc n'y voit que la carte
        // d'origine (R109, R111, R112).
        if (vrai !== undefined && campOf(vrai) !== 'loups' && !peutEtreLoup(vrai)) {
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
  // Le carnet du Renard, comme les sondages de la Voyante : à lui seul — et
  // à qui voit tout (R107). Le flair ne quitte jamais l'état autrement.
  if (vue.renardSavoirs.length > 0 && !(you.role === 'renard' || omniscient)) {
    fuites.push({ type: 'renard-savoirs-visibles', detail: `${moiLabel} reçoit ${String(vue.renardSavoirs.length)} flair(s) du Renard` });
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
      // Le canal de la fratrie : seuls les vivants d'une fratrie y lisent,
      // et par groupe (R114, D45) — quand Sœurs et Frères coexistent, une
      // Sœur n'y voit jamais un message de Frère. Les morts le referment ;
      // ceux qui voient tout le relisent, tous groupes compris. La vue ne
      // dit « fratrie » qu'aux membres : elle est le seul témoin du banc,
      // qui ne tient pas l'état — il reconnaît le groupe du lecteur à ses
      // sièges, et exige que l'auteur du message y siège. Qui connaît le
      // vrai numéro du groupe (le moteur, dans les simulations) vérifie
      // en plus l'étiquette du message.
      (m.channel === 'fratrie' &&
        you.alive &&
        vue.fratrie.length > 0 &&
        vue.fratrie.includes(m.seat) &&
        (groupe === null || m.groupe === groupe)) ||
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
    // Le Voleur devant ses deux cartes, avant la révélation (R82, R110) :
    // 25 s, pas une de plus.
    case 'voleur':
      return 25_000;
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
