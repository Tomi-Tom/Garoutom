/**
 * Ce qu’un siège a le droit de savoir — et rien d’autre.
 *
 * Le loup-garou est un jeu d’information cachée : l’état brut ne quitte jamais
 * le serveur, et `viewFor(state, seat)` est le seul filtre. Un champ oublié
 * dans `views.ts`, c’est un rôle qui fuit dans l’onglet réseau du navigateur :
 * ces tests sont la preuve que rien ne fuit. Chaque affirmation se fait depuis
 * la vue d’un siège, jamais depuis l’état nu.
 *
 * Discipline commune :
 * - l’aléa passe par `createSeededRng` (R86), jamais `Math.random`, jamais de
 *   minuterie réelle : le temps qui passe, c’est `timeoutPhase` qu’on appelle ;
 * - l’état reçu n’est jamais modifié (R85) : chaque action enchaîne l’état que
 *   la précédente a rendu.
 */

import { describe, expect, it } from 'vitest';

import { applyAction, createGame, timeoutPhase } from './game.js';
import { DEFAULT_OPTIONS } from './options.js';
import { createSeededRng } from './rng.js';
import type { Action, ChatChannel, GameEvent, GameOptions, GameState, RoleId } from './types.js';
import { viewFor, type GameView } from './views.js';

/* ------------------------------------------------------------------ */
/* La tablée de laboratoire                                            */
/* ------------------------------------------------------------------ */

/** Des options de travail : composition manuelle, pas de capitaine, table secrète. */
function options(surcharges: Partial<GameOptions> = {}): GameOptions {
  return {
    ...DEFAULT_OPTIONS,
    auto: false,
    loups: 2,
    roles: [],
    capitaine: false,
    mortsVoientTout: false,
    revelerRoles: false,
    ...surcharges,
  };
}

/** Le siège du n-ième porteur de ce rôle — mort ou vif. */
function siege(state: GameState, role: RoleId, n = 0): number {
  const joueur = state.players.filter((p) => p.role === role)[n];
  if (!joueur) throw new Error(`pas de « ${role} » dans cette partie`);
  return joueur.seat;
}

/** Une action de joueur : l’état suivant (R85), la graine fixée (R86). */
function agir(state: GameState, seat: number, action: Action): GameState {
  return applyAction(state, action, createSeededRng(42), seat).state;
}

/** Le temps est écoulé : la phase se clôt, sans qu’aucune horloge tourne (R80). */
function passer(state: GameState): GameState {
  return timeoutPhase(state, createSeededRng(42), state.phaseSeq).state;
}

/** Une partie distribuée où chacun a vu sa carte : la suite est ouverte. */
function partir(joueurs: number, opts: GameOptions): GameState {
  let state = createGame({ players: joueurs, options: opts }, createSeededRng(42)).state;
  for (const { seat } of state.players) {
    state = agir(state, seat, { type: 'pret' });
  }
  return state;
}

/** Les numéros de message d’un canal, tels que ce siège les lit. */
function numeros(vue: GameView, canal: ChatChannel): number[] {
  return vue.chat.filter((message) => message.channel === canal).map((message) => message.id);
}

/** Le rôle d’un siège tel qu’un autre le voit — `null` s’il l’ignore. */
function roleVu(vue: GameView, seat: number): RoleId | null {
  return vue.players.find((p) => p.seat === seat)?.role ?? null;
}

/** Toute la tablée votante vote contre un siège, qui vote donc quelqu’un d’autre. */
function voterContre(state: GameState, accuse: number): GameState {
  const electeurs = state.players.filter((p) => p.alive && p.canVote).map((p) => p.seat);
  for (const electeur of electeurs) {
    const cible = electeur === accuse ? electeurs.find((s) => s !== electeur) : accuse;
    if (cible === undefined) throw new Error('personne à accuser');
    state = agir(state, electeur, { type: 'voter', target: cible });
  }
  return state;
}

/* ------------------------------------------------------------------ */
/* Les scénarios rejouables                                            */
/* ------------------------------------------------------------------ */

/**
 * Une partie courte où les loups mangent le village : nuit, vote, nuit, vote —
 * fin. Sert la fin de partie, le récapitulatif et le déterminisme (R86).
 */
function defaiteDuVillage(opts: GameOptions): {
  auJourDeux: GameState;
  fin: GameState;
  l1: number;
  l2: number;
  v1: number;
} {
  let state = partir(6, opts);
  const l1 = siege(state, 'loup', 0);
  const l2 = siege(state, 'loup', 1);
  const v1 = siege(state, 'villageois', 0);
  const v2 = siege(state, 'villageois', 1);
  const v3 = siege(state, 'villageois', 2);
  const v4 = siege(state, 'villageois', 3);

  // Nuit 1 : la meute emporte v1.
  state = agir(state, l1, { type: 'devorer', target: v1 });
  state = agir(state, l2, { type: 'devorer', target: v1 });
  // Jour 1 : le village exécute v2 — à côté.
  state = voterContre(state, v2);
  // Nuit 2 : la meute cause, puis emporte v3.
  state = agir(state, l1, { type: 'dire', channel: 'loups', text: 'On tient le village.' });
  state = agir(state, l1, { type: 'devorer', target: v3 });
  state = agir(state, l2, { type: 'devorer', target: v3 });
  const auJourDeux = state;
  // Jour 2 : le village exécute v4 — il ne reste que la meute.
  state = voterContre(state, v4);
  return { auJourDeux, fin: state, l1, l2, v1 };
}

/**
 * La meute converse, le village exécute un loup : il reste un loup vivant,
 * veillant sur un loup mort qui n’entend plus rien.
 */
function partieDuLoupMort(opts: GameOptions): {
  pendantLaNuit: GameState;
  auLendemain: GameState;
  l1: number;
  l2: number;
  v1: number;
} {
  let state = partir(6, opts);
  const l1 = siege(state, 'loup', 0);
  const l2 = siege(state, 'loup', 1);
  const v1 = siege(state, 'villageois', 0);

  // Nuit 1 : un loup parle et vote, l’autre attend encore.
  state = agir(state, l1, { type: 'dire', channel: 'loups', text: 'Ce soir, le siège d’à côté.' });
  state = agir(state, l1, { type: 'devorer', target: v1 });
  const pendantLaNuit = state;
  // L’autre loup suit : l’aube emporte v1.
  state = agir(state, l2, { type: 'devorer', target: v1 });
  // Jour 1 : le mort cause en bas, le village exécute un loup.
  state = agir(state, v1, { type: 'dire', channel: 'morts', text: 'Salut d’en bas.' });
  state = voterContre(state, l1);
  // Nuit 2 : le survivant parle à sa meute.
  state = agir(state, l2, { type: 'dire', channel: 'loups', text: 'Seul désormais.' });
  return { pendantLaNuit, auLendemain: state, l1, l2, v1 };
}

/** Cupidon marie deux villageois, la meute mange à côté : le jour suivant. */
function partieDesAmoureux(opts: GameOptions): {
  auMatin: GameState;
  cupidon: number;
  v0: number;
  v1: number;
  v3: number;
} {
  let state = partir(8, opts);
  const cupidon = siege(state, 'cupidon');
  const v0 = siege(state, 'villageois', 0);
  const v1 = siege(state, 'villageois', 1);
  const v3 = siege(state, 'villageois', 3);

  // Nuit 1 : Cupidon tire sa flèche, la meute mange à côté.
  state = agir(state, cupidon, { type: 'cupidon', a: v0, b: v1 });
  state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: siege(state, 'villageois', 2) });
  state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: siege(state, 'villageois', 2) });
  // → jour 1 : le couple est formé, et il cause.
  state = agir(state, v0, { type: 'dire', channel: 'village', text: 'Bonjour le village.' });
  state = agir(state, v0, { type: 'dire', channel: 'amoureux', text: 'À toi, toujours.' });
  return { auMatin: state, cupidon, v0, v1, v3 };
}

/** Trois canaux actifs sur quatre : la numérotation doit rester discrète (R78). */
function partieBavarde(opts: GameOptions): { l1: number; v1: number; v2: number; veille: GameState } {
  let state = partir(6, opts);
  const l1 = siege(state, 'loup', 0);
  const l2 = siege(state, 'loup', 1);
  const v1 = siege(state, 'villageois', 0);
  const v2 = siege(state, 'villageois', 1);

  // Nuit 1 : la meute cause en travaillant.
  state = agir(state, l1, { type: 'dire', channel: 'loups', text: 'Ce soir, le siège d’à côté.' });
  state = agir(state, l1, { type: 'devorer', target: v1 });
  state = agir(state, l2, { type: 'dire', channel: 'loups', text: 'Bien reçu.' });
  state = agir(state, l2, { type: 'devorer', target: v1 });
  // → jour 1 : v1 est mort. Le village cause, le mort aussi.
  state = agir(state, v2, { type: 'dire', channel: 'village', text: 'Bonjour à tous.' });
  state = agir(state, v1, { type: 'dire', channel: 'morts', text: 'Salut d’en bas.' });
  state = agir(state, l1, { type: 'dire', channel: 'village', text: 'Bonjour de ma part.' });
  // Le jour passe sans exécution, puis la meute recause.
  state = passer(state);
  state = agir(state, l1, { type: 'dire', channel: 'loups', text: 'Encore une belle nuit.' });
  return { l1, v1, v2, veille: state };
}

/** Nuit 1 close : la Sorcière est appelée, sa potion devant elle. */
function nuitDeLaSorciere(sorciereSeSauve: boolean, victime: 'villageois' | 'sorciere'): GameState {
  let state = partir(6, options({ roles: ['sorciere'], sorciereSeSauve }));
  const sorciere = siege(state, 'sorciere');
  const proie = victime === 'sorciere' ? sorciere : siege(state, 'villageois', 0);
  state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: proie });
  state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: proie });
  return state; // phase : nuit, étape sorciere
}

/* ------------------------------------------------------------------ */
/* R88 — le silence par défaut                                         */
/* ------------------------------------------------------------------ */

describe('R88 — le silence par défaut', () => {
  it('R88 — un villageois ne lit ni les rôles des vivants, ni les amoureux, ni la meute, ni les sondages', () => {
    const opts = options({ roles: ['voyante', 'cupidon'] });
    let state = partir(8, opts);
    const voyante = siege(state, 'voyante');
    const l1 = siege(state, 'loup', 0);
    const l2 = siege(state, 'loup', 1);
    const v0 = siege(state, 'villageois', 0);
    const v1 = siege(state, 'villageois', 1);
    const victime = siege(state, 'villageois', 2);
    const temoin = siege(state, 'villageois', 3);

    // Nuit 1 : Cupidon marie v0 et v1, la Voyante sonde un loup,
    // la meute emporte la victime.
    state = agir(state, siege(state, 'cupidon'), { type: 'cupidon', a: v0, b: v1 });
    state = agir(state, voyante, { type: 'sonder', target: l1 });
    state = agir(state, l1, { type: 'devorer', target: victime });
    state = agir(state, l2, { type: 'devorer', target: victime });
    // → jour 1 : la victime est morte, le couple est formé, la Voyante sait.

    const vue = viewFor(state, temoin);
    expect(vue.you).toMatchObject({ seat: temoin, role: 'villageois', alive: true });
    expect(vue.log).toBeNull();
    // Silence, la règle par défaut : sans raison de savoir, on ne sait pas.
    for (const joueur of vue.players) {
      if (joueur.seat === temoin) {
        expect(joueur.role).toBe('villageois'); // sa carte à lui
      } else {
        expect(joueur.role).toBeNull(); // ni vivant, ni mort : rien
        expect(joueur.isLover).toBe(false);
      }
    }
    expect(vue.pack).toBeNull();
    expect(vue.lover).toBeNull();
    expect(vue.inspections).toEqual([]);

    // La Voyante, elle, a appris un rôle — un seul, plus le sien.
    const vueVoyante = viewFor(state, voyante);
    expect(vueVoyante.inspections).toEqual([{ day: 1, target: l1, role: 'loup' }]);
    expect(roleVu(vueVoyante, l1)).toBe('loup');
    expect(roleVu(vueVoyante, l2)).toBeNull();
    // Les amoureux se connaissent, sans connaître leurs cartes.
    const vueAmoureuse = viewFor(state, v0);
    expect(vueAmoureuse.lover).toBe(v1);
    expect(roleVu(vueAmoureuse, v1)).toBeNull();
    expect(vueAmoureuse.players.filter((p) => p.isLover).map((p) => p.seat)).toEqual([v0, v1]);
  });

  it('R39/R88 — les sondages de la Voyante s’accumulent, et pour elle seule', () => {
    const opts = options({ roles: ['voyante'] });
    let state = partir(6, opts);
    const voyante = siege(state, 'voyante');
    const l1 = siege(state, 'loup', 0);
    const v1 = siege(state, 'villageois', 0);
    const victime = siege(state, 'villageois', 1);

    // Avant d’agir, la Voyante a son prompt ; personne ne sait qu’elle existe.
    expect(viewFor(state, voyante).prompt).toEqual({ kind: 'sonder' });

    state = agir(state, voyante, { type: 'sonder', target: v1 });
    state = agir(state, l1, { type: 'devorer', target: victime });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: victime });
    // → jour 1 : la Voyante sait une chose, et elle seule.
    const vueVoyante = viewFor(state, voyante);
    expect(vueVoyante.inspections).toEqual([{ day: 1, target: v1, role: 'villageois' }]);
    expect(roleVu(vueVoyante, v1)).toBe('villageois');
    const vueSonde = viewFor(state, v1);
    expect(vueSonde.inspections).toEqual([]);
    expect(roleVu(vueSonde, voyante)).toBeNull(); // la cible d’une voyance ne sait rien
    expect(viewFor(state, victime).inspections).toEqual([]); // la morte non plus
    expect(viewFor(state, null).inspections).toEqual([]); // le spectateur non plus

    // Nuit suivante, autre sondage : le carnet s’accumule (R39).
    state = passer(state);
    state = agir(state, voyante, { type: 'sonder', target: l1 });
    state = agir(state, l1, { type: 'devorer', target: siege(state, 'villageois', 2) });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: siege(state, 'villageois', 2) });
    const vueDeuxiemeNuit = viewFor(state, voyante);
    expect(vueDeuxiemeNuit.inspections).toEqual([
      { day: 1, target: v1, role: 'villageois' },
      { day: 2, target: l1, role: 'loup' },
    ]);
    expect(roleVu(vueDeuxiemeNuit, l1)).toBe('loup');
  });

  it('R88 — un mort n’a plus de prompt la nuit, même pour son rôle', () => {
    const opts = options({ roles: ['voyante'] });
    let state = partir(6, opts);
    const voyante = siege(state, 'voyante');
    // Nuit 1 : la Voyante sonde, puis la meute la choisit pour proie.
    state = agir(state, voyante, { type: 'sonder', target: siege(state, 'villageois', 0) });
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: voyante });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: voyante });
    // → jour 1 : la Voyante est morte. Le jour passe sans exécution.
    state = passer(state);
    // → nuit 2 : les vivants jouent, la morte n’a plus rien à faire.
    const vueMorte = viewFor(state, voyante);
    expect(vueMorte.prompt).toBeNull();
    expect(vueMorte.channels).toEqual(['morts']);
    // À côté, le loup vivant, lui, a bien un prompt.
    expect(viewFor(state, siege(state, 'loup', 0)).prompt).toEqual({ kind: 'devorer' });
  });

  it('R88 — un spectateur n’a ni carte, ni canal, ni prompt', () => {
    const opts = options({});
    let state = partir(6, opts);
    state = agir(state, siege(state, 'loup', 0), { type: 'dire', channel: 'loups', text: 'Il fait noir.' });
    const vue = viewFor(state, null);
    expect(vue.you).toBeNull();
    expect(vue.channels).toEqual([]);
    expect(vue.prompt).toBeNull();
    expect(vue.pack).toBeNull();
    expect(vue.lover).toBeNull();
    expect(vue.inspections).toEqual([]);
    expect(vue.log).toBeNull();
    expect(vue.players.every((p) => p.role === null)).toBe(true);
    // Il lirait le village — où personne n’a parlé — et rien d’autre.
    expect(vue.chat).toEqual([]);
    // Le loup, lui, relit son message : le secret existe, il est filtré.
    expect(viewFor(state, siege(state, 'loup', 0)).chat.length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* R77 — les canaux lisibles                                           */
/* ------------------------------------------------------------------ */

describe('R77 — les canaux lisibles', () => {
  it('R77 — un loup vivant lit la meute et le vote de ses complices', () => {
    const { pendantLaNuit, l1, l2, v1 } = partieDuLoupMort(options({}));
    const vue = viewFor(pendantLaNuit, l2);
    // La nuit, un loup n’écrit qu’à sa meute.
    expect(vue.channels).toEqual(['loups']);
    // La meute, et le vote déjà déposé — pas encore celui de l’autre.
    expect(vue.pack).not.toBeNull();
    expect(vue.pack?.seats).toEqual(expect.arrayContaining([l1, l2]));
    expect(vue.pack?.votes).toEqual({ [l1]: v1 });
    // Le village, lui, ne sait rien de la meute.
    expect(viewFor(pendantLaNuit, v1).pack).toBeNull();
  });

  it('R77 — un loup mort ne lit plus la meute ni ses complices', () => {
    const { auLendemain, l1, l2 } = partieDuLoupMort(options({}));
    const vueMort = viewFor(auLendemain, l1);
    expect(vueMort.you).toMatchObject({ seat: l1, role: 'loup', alive: false }); // sa carte, il la garde
    expect(vueMort.pack).toBeNull(); // ses complices, non
    expect(vueMort.channels).toEqual(['morts']);
    expect(numeros(vueMort, 'loups')).toEqual([]); // plus un mot de la meute
    expect(numeros(vueMort, 'morts')).toEqual([1]); // mais les morts, oui
    // Le survivant, lui, lit toute la meute — y compris le silence du mort.
    const vueVivant = viewFor(auLendemain, l2);
    expect(numeros(vueVivant, 'loups')).toEqual([1, 2]);
    expect(vueVivant.pack?.seats).toEqual(expect.arrayContaining([l1, l2]));
    // Le mort ne connaît même plus le rôle de son ancien complice.
    expect(roleVu(vueMort, l2)).toBeNull();
  });

  it('R77 — le mort lit le canal des morts', () => {
    const { auLendemain, v1 } = partieDuLoupMort(options({}));
    const vue = viewFor(auLendemain, v1);
    expect(vue.channels).toEqual(['morts']);
    const canalMorts = vue.chat.filter((m) => m.channel === 'morts');
    expect(canalMorts.map((m) => [m.id, m.seat])).toEqual([[1, v1]]); // son propre message
  });

  it('R77 — les amoureux se lisent tant que le couple vit, et Cupidon connaît le couple sans le lire', () => {
    const { auMatin, cupidon, v0, v1, v3 } = partieDesAmoureux(options({ roles: ['cupidon'] }));
    const vueAmoureuse = viewFor(auMatin, v0);
    expect(vueAmoureuse.channels).toEqual(expect.arrayContaining(['village', 'amoureux']));
    expect(numeros(vueAmoureuse, 'village')).toEqual([1]);
    expect(numeros(vueAmoureuse, 'amoureux')).toEqual([1]); // numérotation par canal (R78)
    expect(vueAmoureuse.lover).toBe(v1);
    expect(vueAmoureuse.players.filter((p) => p.isLover).map((p) => p.seat)).toEqual([v0, v1]);
    // L’autre lit le canal, lui aussi.
    expect(viewFor(auMatin, v1).lover).toBe(v0);
    expect(numeros(viewFor(auMatin, v1), 'amoureux')).toEqual([1]);
    // Un tiers ne voit rien du couple.
    const vueTiers = viewFor(auMatin, v3);
    expect(numeros(vueTiers, 'amoureux')).toEqual([]);
    expect(vueTiers.lover).toBeNull();
    expect(vueTiers.players.every((p) => !p.isLover)).toBe(true);
    // Cupidon connaît son œuvre, mais n’entre pas dans le canal.
    const vueCupidon = viewFor(auMatin, cupidon);
    expect(vueCupidon.players.filter((p) => p.isLover).map((p) => p.seat)).toEqual([v0, v1]);
    expect(vueCupidon.lover).toBeNull();
    expect(numeros(vueCupidon, 'amoureux')).toEqual([]);
  });

  it('R77/R46 — la mort du couple ne le désigne jamais', () => {
    const { auMatin, v0, v3 } = partieDesAmoureux(options({ roles: ['cupidon'] }));
    // Le jour passe, la meute emporte une amoureuse : l’autre suit de chagrin (R47).
    let state = passer(auMatin);
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: v0 });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: v0 });
    // → jour 2 : v0 et v1 sont morts, sans que rien ne les désigne.
    const vue = viewFor(state, v3);
    expect(vue.lover).toBeNull();
    expect(vue.players.every((p) => !p.isLover)).toBe(true);
    expect(roleVu(vue, v0)).toBeNull();
    expect(roleVu(vue, siege(state, 'villageois', 1))).toBeNull();
  });

  it('R77 — avec mortsVoientTout, un mort lit tout', () => {
    const opts = options({ mortsVoientTout: true });
    let state = partir(6, opts);
    const l1 = siege(state, 'loup', 0);
    const l2 = siege(state, 'loup', 1);
    const v1 = siege(state, 'villageois', 0);
    state = agir(state, l1, { type: 'dire', channel: 'loups', text: 'Cette nuit, le siège d’à côté.' });
    state = agir(state, l1, { type: 'devorer', target: v1 });
    state = agir(state, l2, { type: 'devorer', target: v1 });
    // → jour 1 : v1 est mort, et la table lui laisse tout lire.
    const vueMorte = viewFor(state, v1);
    expect(vueMorte.channels).toEqual(['morts']); // il n’écrit qu’aux morts…
    expect(numeros(vueMorte, 'loups')).toEqual([1]); // …mais il lit la meute
    expect(vueMorte.pack).not.toBeNull(); // la meute, même mort
    expect(vueMorte.pack?.seats).toEqual(expect.arrayContaining([l1, l2]));
    expect(vueMorte.players.every((p) => p.role !== null)).toBe(true); // et toutes les cartes
    // Le vivant, lui, n’en sait pas plus pour autant.
    const vueVivante = viewFor(state, siege(state, 'villageois', 1));
    expect(numeros(vueVivante, 'loups')).toEqual([]);
    expect(vueVivante.pack).toBeNull();
    expect(roleVu(vueVivante, l1)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* R46 — les révélations                                               */
/* ------------------------------------------------------------------ */

describe('R46 — les révélations', () => {
  it('R46 — revelerRoles montre le rôle d’un mort', () => {
    let state = partir(6, options({ revelerRoles: true }));
    const victime = siege(state, 'villageois', 0);
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: victime });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: victime });
    // → jour 1 : la mort est annoncée, et sa carte avec.
    expect(roleVu(viewFor(state, siege(state, 'villageois', 1)), victime)).toBe('villageois');
    expect(roleVu(viewFor(state, null), victime)).toBe('villageois');
  });

  it('R46 — sans revelerRoles, le rôle d’un mort reste caché — sa carte à lui', () => {
    let state = partir(6, options({ revelerRoles: false }));
    const victime = siege(state, 'villageois', 0);
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: victime });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: victime });
    // → jour 1 : la mort est annoncée, sa carte ne l’est pas.
    expect(roleVu(viewFor(state, siege(state, 'villageois', 1)), victime)).toBeNull();
    expect(roleVu(viewFor(state, null), victime)).toBeNull();
    // Le mort, lui, garde sa propre carte.
    const vueMorte = viewFor(state, victime);
    expect(vueMorte.you?.role).toBe('villageois');
    expect(roleVu(vueMorte, victime)).toBe('villageois');
  });

  it('R46 — l’Idiot gracié est montré quelle que soit l’option', () => {
    let state = partir(8, options({ roles: ['idiot'], revelerRoles: false }));
    const idiot = siege(state, 'idiot');
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: siege(state, 'villageois', 0) });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: siege(state, 'villageois', 0) });
    // → jour 1 : le village condamne l’Idiot, qui est gracié (R62).
    state = voterContre(state, idiot);
    const vue = viewFor(state, siege(state, 'villageois', 1));
    const vuIdiot = vue.players.find((p) => p.seat === idiot);
    expect(vuIdiot).toMatchObject({ role: 'idiot', alive: true, canVote: false });
    // La grâce est un fait public, même pour un spectateur.
    expect(roleVu(viewFor(state, null), idiot)).toBe('idiot');
  });

  // Corrigé le 11 octobre : ouvrir la phase « chasseur » désigne le mort à
  // toute la table, et `game.ts` retourne désormais sa carte à ce moment-là
  // (R46) — qu’il tire ou emporte sa balle, et même si `revelerRoles` est
  // faux. Avant, seul l’Idiot gracié était marqué `revealed`.
  it('R46 — le Chasseur est montré par son tir, même sans revelerRoles', () => {
    let state = partir(8, options({ roles: ['chasseur'], revelerRoles: false }));
    const chasseur = siege(state, 'chasseur');
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: chasseur });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: chasseur });
    // → le Chasseur meurt, son déclencheur ouvre la phase « chasseur » (R48).
    expect(state.phase).toMatchObject({ kind: 'chasseur', seat: chasseur });
    state = agir(state, chasseur, { type: 'tirer', target: siege(state, 'villageois', 1) });
    // Son tir le désigne publiquement : sa carte doit se retourner.
    const vue = viewFor(state, siege(state, 'villageois', 2));
    expect(roleVu(vue, chasseur)).toBe('chasseur');
  });
});

/* ------------------------------------------------------------------ */
/* R78 — le fil de discussion                                          */
/* ------------------------------------------------------------------ */

describe('R78 — le fil de discussion', () => {
  it('R78 — les messages sont numérotés par canal, sans trou', () => {
    const { l1, veille } = partieBavarde(options({}));
    const vue = viewFor(veille, l1);
    // La meute a causé trois fois, le village deux : chaque canal compte seul.
    expect(numeros(vue, 'loups')).toEqual([1, 2, 3]);
    expect(numeros(vue, 'village')).toEqual([1, 2]);
  });

  it('R78 — un message des loups n’apparaît jamais dans la vue d’un villageois — ni son numéro, ni le trou qui le trahirait', () => {
    const { v1, v2, veille } = partieBavarde(options({}));
    const vueVivante = viewFor(veille, v2);
    // Le villageois ne lit que le village : deux messages, numérotés 1 et 2.
    // Une numérotation globale les aurait numérotés 3 et 5 — les trous auraient
    // compté les messages des loups et des morts à sa place.
    expect(vueVivante.chat.map((m) => m.channel)).toEqual(['village', 'village']);
    expect(numeros(vueVivante, 'village')).toEqual([1, 2]);
    // Le mort non plus ne lit pas la meute — la table n’a pas dit mortsVoientTout.
    const vueMorte = viewFor(veille, v1);
    expect(numeros(vueMorte, 'loups')).toEqual([]);
    expect(numeros(vueMorte, 'morts')).toEqual([1]);
    expect(numeros(vueMorte, 'village')).toEqual([1, 2]);
  });
});

/* ------------------------------------------------------------------ */
/* R43 — le prompt de la Sorcière                                      */
/* ------------------------------------------------------------------ */

describe('R43 — le prompt de la Sorcière', () => {
  it('R43 — peutSeSauver est vrai si l’option le permet, ou si la victime est un autre', () => {
    const cas = [
      { sorciereSeSauve: true, victime: 'villageois' },
      { sorciereSeSauve: false, victime: 'villageois' },
      { sorciereSeSauve: true, victime: 'sorciere' },
    ] as const;
    for (const unCas of cas) {
      const state = nuitDeLaSorciere(unCas.sorciereSeSauve, unCas.victime);
      const sorciere = siege(state, 'sorciere');
      const proie = unCas.victime === 'sorciere' ? sorciere : siege(state, 'villageois', 0);
      expect(viewFor(state, sorciere).prompt).toMatchObject({
        kind: 'sorciere',
        victim: proie,
        vie: true,
        mort: true,
        peutSeSauver: true,
      });
    }
  });

  it('R43 — peutSeSauver est faux seulement quand la victime est la Sorcière et que l’option l’interdit', () => {
    const state = nuitDeLaSorciere(false, 'sorciere');
    const sorciere = siege(state, 'sorciere');
    expect(viewFor(state, sorciere).prompt).toMatchObject({
      kind: 'sorciere',
      victim: sorciere,
      peutSeSauver: false,
    });
    // Le prompt de la Sorcière n’est pour personne d’autre.
    expect(viewFor(state, siege(state, 'villageois', 0)).prompt).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Les votes vus de la salle                                           */
/* ------------------------------------------------------------------ */

describe('les votes vus de la salle', () => {
  it('R60/R88 — la vue montre qui a voté, jamais pour qui', () => {
    let state = partir(6, options({}));
    const v1 = siege(state, 'villageois', 0);
    const v2 = siege(state, 'villageois', 1);
    const v3 = siege(state, 'villageois', 2);
    const v4 = siege(state, 'villageois', 3);
    state = agir(state, siege(state, 'loup', 0), { type: 'devorer', target: v1 });
    state = agir(state, siege(state, 'loup', 1), { type: 'devorer', target: v1 });
    // → jour 1 : deux électeurs ont voté, les autres attendent.
    state = agir(state, v2, { type: 'voter', target: v3 });
    state = agir(state, v4, { type: 'voter', target: v3 });

    // Qui, sans pour qui : les cibles ne se révèlent qu’au dépouillement.
    const vueTiers = viewFor(state, siege(state, 'loup', 0));
    expect([...vueTiers.voted].sort((a, b) => a - b)).toEqual([v2, v4]);
    expect(vueTiers.yourVote).toBeNull();
    expect(vueTiers.prompt).toMatchObject({ kind: 'voter', election: false });
    // Son propre vote, pour se le voir surligné.
    expect(viewFor(state, v2).yourVote).toBe(v3);
    // Le mort ne vote plus, et n’a rien à se surligner.
    const vueMorte = viewFor(state, v1);
    expect(vueMorte.prompt).toBeNull();
    expect(vueMorte.yourVote).toBeNull();
    expect([...vueMorte.voted].sort((a, b) => a - b)).toEqual([v2, v4]);
    // Le spectateur voit les pastilles « a voté », rien de plus.
    const vueSpectateur = viewFor(state, null);
    expect(vueSpectateur.yourVote).toBeNull();
    expect([...vueSpectateur.voted].sort((a, b) => a - b)).toEqual([v2, v4]);
  });

  it('R56/R88 — même silence à l’élection, et le prompt porte election', () => {
    let state = partir(6, options({ capitaine: true, capitaineAvantNuit1: true }));
    expect(state.phase).toMatchObject({ kind: 'election' });
    const v1 = siege(state, 'villageois', 0);
    const v2 = siege(state, 'villageois', 1);
    const v3 = siege(state, 'villageois', 2);
    const v4 = siege(state, 'villageois', 3);
    state = agir(state, v1, { type: 'voter', target: v2 });
    state = agir(state, v3, { type: 'voter', target: v2 });
    const vueTiers = viewFor(state, v4);
    expect(vueTiers.prompt).toMatchObject({ kind: 'voter', election: true });
    expect([...vueTiers.voted].sort((a, b) => a - b)).toEqual([v1, v3]);
    expect(vueTiers.yourVote).toBeNull();
    expect(viewFor(state, v1).yourVote).toBe(v2);
    // L’élection se termine : v2 prend le commandement, la nuit tombe.
    state = agir(state, v2, { type: 'voter', target: null });
    state = agir(state, v4, { type: 'voter', target: v2 });
    state = agir(state, siege(state, 'loup', 0), { type: 'voter', target: v2 });
    state = agir(state, siege(state, 'loup', 1), { type: 'voter', target: v2 });
    const vueSoir = viewFor(state, v4);
    expect(vueSoir.captain).toBe(v2);
    expect(vueSoir.phase).toBe('nuit');
    expect(vueSoir.voted).toEqual([]); // un vote clos n’est plus un vote en cours
  });
});

/* ------------------------------------------------------------------ */
/* La fin de partie                                                    */
/* ------------------------------------------------------------------ */

describe('la fin de partie', () => {
  const partie = defaiteDuVillage(options({}));

  it('R88 — le récapitulatif n’apparaît qu’une fois la partie finie', () => {
    // Tant que la partie court — même mort — le récit de la nuit est caché.
    expect(viewFor(partie.auJourDeux, partie.v1).log).toBeNull();
    expect(viewFor(partie.auJourDeux, partie.l1).log).toBeNull();
    // Une fois finie, la nuit entière est racontée, secrets compris.
    const vue = viewFor(partie.fin, partie.v1);
    expect(vue.over).toBe(true);
    expect(vue.winner).toBe('loups');
    expect(vue.log).not.toBeNull();
    expect(vue.log).toContainEqual({ day: 1, type: 'loups', target: partie.v1 });
  });

  it('R88 — plus de prompt pour personne une fois la partie finie', () => {
    expect(viewFor(partie.fin, partie.l1).prompt).toBeNull(); // le loup vivant, vainqueur
    expect(viewFor(partie.fin, partie.v1).prompt).toBeNull(); // la morte
    expect(viewFor(partie.fin, null).prompt).toBeNull(); // le spectateur
  });

  it('R77 — à la fin de la partie, plus rien n’est caché', () => {
    // La morte — sans même `mortsVoientTout` — lit la meute et toutes les cartes.
    const vue = viewFor(partie.fin, partie.v1);
    expect(vue.players.every((p) => p.role !== null)).toBe(true);
    expect(numeros(vue, 'loups')).toEqual([1]);
    // Le spectateur aussi : une partie finie n’a plus de secrets.
    const vueSpectateur = viewFor(partie.fin, null);
    expect(vueSpectateur.you).toBeNull();
    expect(vueSpectateur.players.every((p) => p.role !== null)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* R85/R86 — pureté et déterminisme                                    */
/* ------------------------------------------------------------------ */

describe('R85/R86 — pureté et déterminisme', () => {
  it('R85 — viewFor ne touche pas à l’état reçu', () => {
    let state = partir(6, options({}));
    state = agir(state, siege(state, 'loup', 0), { type: 'dire', channel: 'loups', text: 'Il fait noir.' });
    const avant = structuredClone(state);
    const vueLoup = viewFor(state, siege(state, 'loup', 0));
    const vueSpectateur = viewFor(state, null);
    expect(state).toEqual(avant); // l’état est intact, au mot près
    // Et deux visées du même siège voient la même chose : rien n’est consommé.
    expect(viewFor(state, siege(state, 'loup', 0))).toEqual(vueLoup);
    expect(viewFor(state, null)).toEqual(vueSpectateur);
  });

  it('R86 — la même graine rejoue la même partie, vue pour vue', () => {
    const premiere = defaiteDuVillage(options({}));
    const seconde = defaiteDuVillage(options({}));
    expect(seconde.auJourDeux).toEqual(premiere.auJourDeux);
    expect(seconde.fin).toEqual(premiere.fin);
    for (const seat of [0, 1, 2, 3, 4, 5]) {
      expect(viewFor(seconde.fin, seat)).toEqual(viewFor(premiere.fin, seat));
    }
    expect(viewFor(seconde.fin, null)).toEqual(viewFor(premiere.fin, null));
  });
});

/* ------------------------------------------------------------------ */
/* R87 — les évènements ne portent aucun secret                        */
/* ------------------------------------------------------------------ */

describe('R87 — les évènements ne portent aucun secret', () => {
  it('R87 — aucun évènement ne révèle un rôle quand la table ne le révèle pas', () => {
    const opts = options({ roles: ['voyante', 'chasseur'], revelerRoles: false });
    let state = createGame({ players: 8, options: opts }, createSeededRng(42)).state;
    const evenements: GameEvent[] = [];
    const avancer = (seat: number, action: Action): void => {
      const pas = applyAction(state, action, createSeededRng(42), seat);
      state = pas.state;
      evenements.push(...pas.events);
    };

    for (const { seat } of state.players) avancer(seat, { type: 'pret' });
    const voyante = siege(state, 'voyante');
    const chasseur = siege(state, 'chasseur');
    const sonde = siege(state, 'villageois', 0);
    avancer(voyante, { type: 'sonder', target: sonde });
    avancer(siege(state, 'loup', 0), { type: 'devorer', target: chasseur });
    avancer(siege(state, 'loup', 1), { type: 'devorer', target: chasseur });
    // → le Chasseur meurt, son déclencheur ouvre la phase « chasseur » ; il tire.
    expect(state.phase).toMatchObject({ kind: 'chasseur', seat: chasseur });
    avancer(chasseur, { type: 'tirer', target: siege(state, 'villageois', 1) });

    // Les morts sont annoncées, jamais leurs cartes : la table ne révèle pas.
    const deces = evenements.flatMap((evenement) =>
      evenement.type === 'morts' ? evenement.deaths : [],
    );
    expect(deces.length).toBeGreaterThan(0);
    expect(deces.every((mort) => mort.role === null)).toBe(true);
    // Aucun évènement ne porte un rôle, sous quelque champ que ce soit.
    expect(JSON.stringify(evenements)).not.toMatch(/"role":"[a-z]+"/);
    // Le secret, lui, existe bien dans l’état — il n’en est simplement jamais sorti.
    expect(state.inspections).toEqual([{ day: 1, target: sonde, role: 'villageois' }]);
  });
});
