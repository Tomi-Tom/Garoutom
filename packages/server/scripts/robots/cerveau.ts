/**
 * Le cerveau des robots : une décision pure, prise sur la seule vue du siège.
 *
 * Aucune entrée-sortie, aucun `Math.random` : l'aléa est injecté, comme dans le
 * moteur, pour que la décision se teste sur des centaines de parties rejouables.
 * Le robot n'a droit qu'à ce que sa `GameView` lui dit — c'est un client
 * ordinaire, pas un oracle.
 */

import {
  createSeededRng,
  type Action,
  type ChatChannel,
  type GameView,
  type Rng,
} from '@garoutom/engine';

/** Réglages optionnels : de quoi faire voter la table d'un seul souffle. */
export interface ReglagesCerveau {
  /**
   * Graine commune à tous les robots d'une table. Au jour, chacun tire sa cible
   * dans la même urne (graine + jour) : sans se voir, ils se retrouvent souvent
   * sur le même nom et une majorité se dégage.
   */
  graine?: number;
}

/** Probabilité de s'abstenir au vote du jour. */
const ABSTENTION_JOUR = 0.15;
/** Probabilité qu'un loup ne désigne personne. */
const LOUP_SANS_PROIE = 0.1;
/** Probabilité que la Sorcière sauve la victime, si elle le peut. */
const SORCIERE_SAUVE = 0.6;
/** Probabilité que la Sorcière empoisonne, si elle le peut. */
const SORCIERE_TUE = 0.3;
/** Probabilité que le Chasseur ne tire sur personne. */
const CHASSEUR_SANS_CIBLE = 0.1;
/** Probabilité que le Corbeau ne marque personne. */
const CORBEAU_SANS_MARQUE = 0.2;
/** Probabilité que le Loup Blanc épargne la meute une nuit où il le pourrait. */
const LOUP_BLANC_CLEMENT = 0.3;
/** Probabilité, pour chaque vivant, d'être désigné votant par le Bouc. */
const BOUC_DESIGNE = 0.6;
/**
 * Probabilité que le Chien-Loup tente la meute : il ne voit ni les loups ni
 * les cartes avant de se ranger (R111), sa vue ne lui apprend rien — il
 * resterait villageois tout seul si le hasard n'y mettait du sien.
 */
const CHIEN_LOUP_AVEC_LA_MEUTE = 0.3;
/** Probabilité que le Voleur laisse le talon quand le moteur le permet (R110). */
const VOLEUR_SABSTIENT = 0.25;

function vivants(view: GameView): number[] {
  return view.players.filter((p) => p.alive).map((p) => p.seat);
}

function pioche(items: number[], rng: Rng): number | null {
  if (items.length === 0) return null;
  return items[rng.nextInt(items.length)] ?? null;
}

/**
 * La cible commune d'un jour : même graine, même jour, même urne de vivants,
 * donc même nom chez tous les robots qui voient le même village.
 */
function cibleCommune(view: GameView, graine: number, election: boolean): number | null {
  const rng = createSeededRng((graine ^ Math.imul(view.day + 1, 0x9e3779b1) ^ (election ? 0x5bd1e995 : 0)) >>> 0);
  return pioche(vivants(view), rng);
}

/**
 * Le coup du robot, ou `null` s'il n'a rien à jouer (ou l'a déjà fait).
 *
 * Les votes se jouent une fois : `acted` vrai, on ne revient pas dessus.
 */
export function decider(view: GameView, rng: Rng, reglages: ReglagesCerveau = {}): Action | null {
  const prompt = view.prompt;
  const you = view.you;
  if (!prompt || !you || view.over || view.acted) return null;
  const moi = you.seat;
  const autres = vivants(view).filter((seat) => seat !== moi);

  switch (prompt.kind) {
    case 'pret':
      return { type: 'pret' };

    case 'cupidon': {
      const urne = vivants(view);
      const a = pioche(urne, rng);
      if (a === null) return null;
      const b = pioche(
        urne.filter((seat) => seat !== a),
        rng,
      );
      return b === null ? null : { type: 'cupidon', a, b };
    }

    case 'proteger': {
      const target = pioche(
        vivants(view).filter((seat) => seat !== prompt.forbidden),
        rng,
      );
      return target === null ? null : { type: 'proteger', target };
    }

    case 'sonder': {
      const target = pioche(autres, rng);
      return target === null ? null : { type: 'sonder', target };
    }

    case 'devorer': {
      if (rng.nextInt(100) < LOUP_SANS_PROIE * 100) return { type: 'devorer', target: null };
      const meute = new Set(view.pack?.seats ?? [moi]);
      const target = pioche(
        vivants(view).filter((seat) => !meute.has(seat)),
        rng,
      );
      return { type: 'devorer', target };
    }

    case 'sorciere': {
      const save =
        prompt.vie &&
        prompt.victim !== null &&
        prompt.peutSeSauver &&
        rng.nextInt(100) < SORCIERE_SAUVE * 100;
      const kill =
        prompt.mort && rng.nextInt(100) < SORCIERE_TUE * 100 ? pioche(autres, rng) : null;
      return { type: 'sorciere', save, kill };
    }

    case 'tirer': {
      if (rng.nextInt(100) < CHASSEUR_SANS_CIBLE * 100) return { type: 'tirer', target: null };
      return { type: 'tirer', target: pioche(autres, rng) };
    }

    case 'successeur': {
      const target = pioche(autres, rng);
      return target === null ? null : { type: 'successeur', target };
    }

    case 'marquer': {
      // Le Corbeau marque un vivant — lui compris, c'est permis — ou personne.
      if (rng.nextInt(100) < CORBEAU_SANS_MARQUE * 100) return { type: 'marquer', target: null };
      return { type: 'marquer', target: pioche(vivants(view), rng) };
    }

    case 'flairer': {
      // Le Renard ne flaire pas au hasard : un trio sans loup lui retire son
      // pouvoir à vie (R107). Il ne sonde qu'un trio qui peut lui apprendre
      // un siège nouveau — lui-même est su innocent, et les trios déjà en
      // carnet ne se relisent pas — puis s'abstient quand il a vu tout le
      // village vivant : à ce point, un flair de plus ne peut que le perdre.
      const appris = new Set<number>([moi]);
      for (const savoir of view.renardSavoirs) for (const seat of savoir.seats) appris.add(seat);
      const vivant = new Map(view.players.map((p) => [p.seat, p.alive]));
      const n = view.players.length;
      // Le trio réel du moteur : le centre et ses deux voisins vivants, lui
      // compris (R105, D29). Un voisin mort ne compte pas — l'ignorer ferait
      // sonder un trio entièrement su, qui ne peut plus rien apprendre.
      const urne = vivants(view).filter((centre) =>
        [centre, (centre - 1 + n) % n, (centre + 1) % n].some(
          (seat) => vivant.get(seat) === true && !appris.has(seat),
        ),
      );
      return { type: 'flairer', centre: pioche(urne, rng) };
    }

    case 'trahir': {
      // Le Loup Blanc ne voit ses complices qu'en loups ordinaires : il vise
      // la meute qu'il connaît, lui excepté.
      if (rng.nextInt(100) < LOUP_BLANC_CLEMENT * 100) return { type: 'trahir', target: null };
      const meute = new Set(view.pack?.seats ?? []);
      const target = pioche(
        vivants(view).filter((seat) => seat !== moi && meute.has(seat)),
        rng,
      );
      return { type: 'trahir', target };
    }

    case 'designerVotants': {
      // Au moins un votant : le moteur refuse une liste vide.
      const urne = vivants(view);
      const seats = urne.filter(() => rng.nextInt(100) < BOUC_DESIGNE * 100);
      if (seats.length === 0) {
        const seul = pioche(urne, rng);
        if (seul === null) return null;
        seats.push(seul);
      }
      return { type: 'designerVotants', seats };
    }

    case 'voler': {
      // Le Voleur ne voit que son prompt : ses deux cartes, à lui seul
      // (R110). Stratégie simple et honnête — une pièce pile ou face entre
      // les deux, sans lire le camp : les deux cartes doivent se prendre au
      // banc. Deux loups au talon l'obligent à choisir ; sinon, il peut
      // laisser le talon et rester Voleur sans pouvoir.
      if (prompt.obligatoire) return { type: 'voler', carte: rng.nextInt(2) === 0 ? 0 : 1 };
      if (rng.nextInt(100) < VOLEUR_SABSTIENT * 100) return { type: 'voler', carte: null };
      return { type: 'voler', carte: rng.nextInt(2) === 0 ? 0 : 1 };
    }

    case 'seRanger': {
      // Le Chien-Loup, avant de se ranger, a la vue d'un villageois : ni
      // meute, ni cartes, rien à calculer (R111). Il reste au village par
      // défaut — le choix est définitif, et le camp des loups ne pardonne
      // pas — puis tente la meute une fois sur trois, de quoi voir les deux
      // camps au banc.
      return {
        type: 'seRanger',
        camp: rng.nextInt(100) < CHIEN_LOUP_AVEC_LA_MEUTE * 100 ? 'loups' : 'village',
      };
    }

    case 'designerModele': {
      // L'Enfant Sauvage désigne son modèle au hasard parmi les vivants, lui
      // compris — le moteur l'autorise, et le modèle n'en saura jamais rien
      // (R112). Le prompt ne montre que la liste des joueurs : c'est assez.
      const target = pioche(vivants(view), rng);
      return target === null ? null : { type: 'designerModele', target };
    }

    case 'voter': {
      if (prompt.election) {
        const cible =
          reglages.graine === undefined
            ? pioche(vivants(view), rng)
            : cibleCommune(view, reglages.graine, true);
        return { type: 'voter', target: cible };
      }
      if (rng.nextInt(100) < ABSTENTION_JOUR * 100) return { type: 'voter', target: null };
      let cible = reglages.graine === undefined ? null : cibleCommune(view, reglages.graine, false);
      // La cible commune est soi-même : on se rabat sur un autre au hasard.
      if (cible === null || cible === moi) cible = pioche(autres, rng);
      return { type: 'voter', target: cible };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Bavardage                                                           */
/* ------------------------------------------------------------------ */

const PHRASES_VILLAGE = [
  'Moi je dis que ça sent le loup par ici.',
  'Quelqu’un a vu quelque chose cette nuit ?',
  'Je suis innocent, je le jure sur ma tête !',
  'On ne devrait pas se précipiter.',
  'Ça fait un moment que je ne vous ai pas entendu, vous.',
  'Votons vite, la nuit tombe.',
  'Hmm, drôle de silence à cette table…',
];

const PHRASES_LOUPS = [
  'On prend le plus bavard ?',
  'Pas de pitié ce soir.',
  'Restons discrets demain.',
  'Je sens que la voyante rôde.',
];

const PHRASES_AMOUREUX = ['Je ne te lâche pas.', 'Fais attention à toi.'];
const PHRASES_MORTS = ['Bon, on regarde le spectacle.', 'Ils se trompent encore…'];
const PHRASES_FRATRIE = ['On reste soudés.', 'Je te couvre.', 'Personne ne sait qu’on se parle.'];

/** Une phrase courte et le canal où la dire, ou `null` si le robot doit se taire. */
export function parler(view: GameView, rng: Rng): { channel: ChatChannel; text: string } | null {
  if (view.over || view.channels.length === 0) return null;
  const channel = view.channels[rng.nextInt(view.channels.length)];
  if (!channel) return null;
  const phrases =
    channel === 'loups'
      ? PHRASES_LOUPS
      : channel === 'amoureux'
        ? PHRASES_AMOUREUX
        : channel === 'fratrie'
          ? PHRASES_FRATRIE
          : channel === 'morts'
            ? PHRASES_MORTS
            : PHRASES_VILLAGE;
  return { channel, text: phrases[rng.nextInt(phrases.length)] ?? '…' };
}

/**
 * La clé qui dit « c'est le même moment de jeu » : le serveur garde son
 * `phaseSeq` pour lui, le robot se contente de ce que sa vue lui montre.
 */
export function cleDeMoment(view: GameView): string | null {
  if (!view.prompt) return null;
  return `${view.phase}|${view.step ?? ''}|${String(view.day)}|${view.prompt.kind}`;
}
