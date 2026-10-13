/**
 * Les gardes du banc, testées seules : `fuitesDeVue` est une fonction pure,
 * elle se vérifie sans serveur. Ici, les rôles de la v3 — le silence du
 * carnet du Renard (R107), le masque du Villageois-Villageois (R106, D31),
 * puis la deuxième vague : la garde du canal de la fratrie (R114), par
 * groupe quand Sœurs et Frères coexistent (D45), la meute du Chien-Loup
 * rangé (R111), les cartes que la partie réécrit (R110, R112) et la carte
 * voilée pendant la phase du Voleur (D46).
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_OPTIONS, type GameView, type RoleId, type RoomView } from '@garoutom/engine';

import { budgetPhase, fuitesDeVue } from './invariants.js';

/** Une vue minimale — seul ce que `fuitesDeVue` lit importe. */
function vueDe(
  moi: { seat: number; role: RoleId; alive: boolean } | null,
  champs: Partial<GameView> = {},
): GameView {
  return {
    you: moi === null ? null : { seat: moi.seat, role: moi.role, alive: moi.alive, canVote: true },
    options: { ...DEFAULT_OPTIONS, mortsVoientTout: false, revelerRoles: false },
    phase: 'jour',
    step: null,
    day: 3,
    players: [],
    captain: null,
    prompt: null,
    acted: false,
    voted: [],
    yourVote: null,
    pack: null,
    lover: null,
    fratrie: [],
    inspections: [],
    renardSavoirs: [],
    espionnage: null,
    pouvoirsPerdus: false,
    marque: null,
    votants: null,
    chat: [],
    channels: [],
    over: false,
    winner: null,
    log: null,
    ...champs,
  };
}

/** La salle, dont le banc ne lit que l'échéance. */
const SALLE = { deadline: null } as unknown as RoomView;

const FLAIRS = [{ day: 2, seats: [1, 2, 3], loups: true }];

describe('fuitesDeVue — les rôles de la v3', () => {
  it('le carnet du Renard ne fuit que chez le Renard (R107)', () => {
    const verite = new Map<number, RoleId>([[4, 'renard']]);
    // Un villageois qui reçoit des flairs : fuite critique.
    const curieux = fuitesDeVue(vueDe({ seat: 0, role: 'villageois', alive: true }, { renardSavoirs: FLAIRS }), SALLE, verite, 0);
    expect(curieux.map((f) => f.type)).toContain('renard-savoirs-visibles');
    // Le Renard lui-même, et qui voit tout (la fin comprise) : légitime.
    expect(fuitesDeVue(vueDe({ seat: 4, role: 'renard', alive: true }, { renardSavoirs: FLAIRS }), SALLE, verite, 4)).toEqual([]);
    expect(
      fuitesDeVue(
        vueDe({ seat: 0, role: 'villageois', alive: true }, { renardSavoirs: FLAIRS, over: true }),
        SALLE,
        verite,
        0,
      ).map((f) => f.type),
    ).not.toContain('renard-savoirs-visibles');
  });

  it('le Villageois-Villageois se lit « villageois » de toute la table (R106, D31)', () => {
    const verite = new Map<number, RoleId>([[5, 'villageois2']]);
    const porteur = { seat: 5, role: 'villageois' as RoleId, alive: false, canVote: false, isCaptain: false, isLover: false };
    // Mort et retourné (revelerRoles) : la vue dit « villageois », et c'est
    // sincère — pas une fuite.
    expect(
      fuitesDeVue(
        vueDe({ seat: 0, role: 'villageois', alive: true }, { options: { ...DEFAULT_OPTIONS, mortsVoientTout: false, revelerRoles: true }, players: [porteur] }),
        SALLE,
        verite,
        0,
      ),
    ).toEqual([]);
    // Un mort qui voit tout, en pleine partie : la carte reste masquée.
    expect(
      fuitesDeVue(
        vueDe({ seat: 0, role: 'villageois', alive: false }, { options: { ...DEFAULT_OPTIONS, mortsVoientTout: true, revelerRoles: false }, players: [{ ...porteur, alive: true }] }),
        SALLE,
        verite,
        0,
      ),
    ).toEqual([]);
    // À la fin, plus rien n'est caché : la vue dit « villageois2 », vrai.
    expect(
      fuitesDeVue(
        vueDe({ seat: 0, role: 'villageois', alive: true }, { over: true, players: [{ ...porteur, role: 'villageois2', alive: true }] }),
        SALLE,
        verite,
        0,
      ),
    ).toEqual([]);
    // …et quand la vérité du banc n'a encore que le visage masqué (lu chez
    // le porteur pendant la partie), la révélation finale reste légitime.
    const masque = new Map<number, RoleId>([[5, 'villageois']]);
    expect(
      fuitesDeVue(
        vueDe({ seat: 0, role: 'villageois', alive: true }, { over: true, players: [{ ...porteur, role: 'villageois2', alive: true }] }),
        SALLE,
        masque,
        0,
      ),
    ).toEqual([]);
  });

  it('le masque ne couvre que le Villageois-Villageois — un vrai rôle déguisé reste une fuite', () => {
    const verite = new Map<number, RoleId>([[5, 'renard']]);
    // À la fin, la vue du siège 5 dit « villageois » alors qu'il était le
    // Renard : role-faux, le garde n'a pas été affaibli.
    const fuites = fuitesDeVue(
      vueDe({ seat: 0, role: 'villageois', alive: true }, { over: true, players: [{ seat: 5, role: 'villageois', alive: false, canVote: false, isCaptain: false, isLover: false }] }),
      SALLE,
      verite,
      0,
    );
    expect(fuites.map((f) => f.type)).toContain('role-faux');
  });

  it('la fratrie ne se lit qu’entre fratrie vivante (R114)', () => {
    const message = { id: 1_000_001, channel: 'fratrie' as const, seat: 2, text: 'on reste soudés', day: 3, groupe: 0 };
    // Une Sœur vivante lit son canal : légitime.
    expect(
      fuitesDeVue(
        vueDe({ seat: 2, role: 'soeurs', alive: true }, { chat: [message], fratrie: [2, 7] }),
        SALLE,
        new Map<number, RoleId>(),
        2,
      ),
    ).toEqual([]);
    // Un vivant sans fratrie, puis une Sœur morte qui ne voit pas tout : le
    // canal leur est fermé.
    expect(
      fuitesDeVue(vueDe({ seat: 0, role: 'villageois', alive: true }, { chat: [message] }), SALLE, new Map<number, RoleId>(), 0).map((f) => f.type),
    ).toContain('canal-illisible');
    expect(
      fuitesDeVue(
        vueDe({ seat: 2, role: 'soeurs', alive: false }, { chat: [message], fratrie: [2, 7] }),
        SALLE,
        new Map<number, RoleId>(),
        2,
      ).map((f) => f.type),
    ).toContain('canal-illisible');
    // Un mort qui voit tout le relit — sans jamais y écrire.
    expect(
      fuitesDeVue(
        vueDe(
          { seat: 0, role: 'villageois', alive: false },
          { options: { ...DEFAULT_OPTIONS, mortsVoientTout: true, revelerRoles: false }, chat: [message] },
        ),
        SALLE,
        new Map<number, RoleId>(),
        0,
      ),
    ).toEqual([]);
  });

  it('le canal fratrie se lit par groupe — une Sœur ne lit pas les Frères (R114, D45)', () => {
    // Deux groupes à la table : les Sœurs (sièges 2 et 7, groupe 0), les
    // Frères (sièges 9, 10, 11, groupe 1). Les numéros de message suivent
    // la numérotation dense du moteur, par groupe (D45).
    const soeur = { id: 1_000_001, channel: 'fratrie' as const, seat: 7, text: 'je te couvre', day: 2, groupe: 0 };
    const frere = { id: 2_000_001, channel: 'fratrie' as const, seat: 9, text: 'nous trois aussi', day: 2, groupe: 1 };
    const vueSoeur = (chat: typeof soeur[]) =>
      vueDe({ seat: 2, role: 'soeurs', alive: true }, { fratrie: [2, 7], chat });
    // Le message de sa Sœur se lit — le banc sans le numéro du groupe, la
    // simulation avec.
    expect(fuitesDeVue(vueSoeur([soeur]), SALLE, new Map<number, RoleId>(), 2)).toEqual([]);
    expect(fuitesDeVue(vueSoeur([soeur]), SALLE, new Map<number, RoleId>(), 2, 0)).toEqual([]);
    // Celui des Frères, jamais : l'auteur ne siège pas dans la fratrie du
    // lecteur — le banc le voit sans connaître les numéros.
    expect(
      fuitesDeVue(vueSoeur([soeur, frere]), SALLE, new Map<number, RoleId>(), 2).map((f) => f.type),
    ).toContain('canal-illisible');
    expect(
      fuitesDeVue(vueSoeur([soeur, frere]), SALLE, new Map<number, RoleId>(), 2, 0).map((f) => f.type),
    ).toContain('canal-illisible');
    // La simulation tient l'état : l'étiquette du groupe se vérifie en
    // plus — un message de sa Sœur mal étiqueté ne passe pas.
    expect(
      fuitesDeVue(vueSoeur([{ ...soeur, groupe: 1 }]), SALLE, new Map<number, RoleId>(), 2, 0).map((f) => f.type),
    ).toContain('canal-illisible');
    // L'omniscient relit tout — les deux groupes (D45).
    expect(
      fuitesDeVue(
        vueDe(
          { seat: 0, role: 'villageois', alive: false },
          { options: { ...DEFAULT_OPTIONS, mortsVoientTout: true, revelerRoles: false }, chat: [soeur, frere] },
        ),
        SALLE,
        new Map<number, RoleId>(),
        0,
      ),
    ).toEqual([]);
  });

  it('la meute du Chien-Loup rangé ne se vérifie pas — celle des autres, si (R109, R111)', () => {
    const verite = new Map<number, RoleId>([
      [1, 'loup'],
      [3, 'chienLoup'],
      [4, 'ancien'],
    ]);
    const meute = { seats: [1, 3], votes: {} };
    // Le Chien-Loup vivant qui reçoit la meute : le banc ne voit pas son camp,
    // il le tient pour loup — c'est le moteur qui garde la vérité (R111).
    expect(fuitesDeVue(vueDe({ seat: 3, role: 'chienLoup', alive: true }, { pack: meute }), SALLE, verite, 3)).toEqual([]);
    // Un loup vivant voit la meute ; le Chien-Loup rangé peut y figurer sans
    // être « meute-fausse » — sa carte d'origine ne dit plus son camp.
    expect(fuitesDeVue(vueDe({ seat: 1, role: 'loup', alive: true }, { pack: meute }), SALLE, verite, 1)).toEqual([]);
    // Mais un villageois qui reçoit la meute : fuite, toujours.
    expect(
      fuitesDeVue(vueDe({ seat: 0, role: 'villageois', alive: true }, { pack: meute }), SALLE, verite, 0).map((f) => f.type),
    ).toContain('meute-visible');
    // Et la meute d'un loup qui liste un vrai villageois reste fausse : la
    // garde n'a pas été affaiblie pour les campes qui ne bougent pas.
    expect(
      fuitesDeVue(vueDe({ seat: 1, role: 'loup', alive: true }, { pack: { seats: [1, 4], votes: {} } }), SALLE, verite, 1).map((f) => f.type),
    ).toContain('meute-fausse');
  });

  it('les cartes que la partie réécrit ne sont pas des fuites (R110, R112, D27)', () => {
    // Le Voleur a pris la Voyante, l'Enfant Sauvage est devenu loup : la
    // vérité du banc peut être en retard d'un sync sur l'un comme l'autre.
    const verite = new Map<number, RoleId>([
      [5, 'voleur'],
      [6, 'enfantSauvage'],
    ]);
    const voleur = { seat: 5, role: 'voyante' as RoleId, alive: false, canVote: false, isCaptain: false, isLover: false };
    const enfant = { seat: 6, role: 'loup' as RoleId, alive: true, canVote: true, isCaptain: false, isLover: false };
    expect(
      fuitesDeVue(vueDe({ seat: 0, role: 'villageois', alive: true }, { over: true, players: [voleur, enfant] }), SALLE, verite, 0),
    ).toEqual([]);
    expect(
      fuitesDeVue(
        vueDe(
          { seat: 0, role: 'villageois', alive: false },
          { options: { ...DEFAULT_OPTIONS, mortsVoientTout: true, revelerRoles: false }, players: [enfant] },
        ),
        SALLE,
        verite,
        0,
      ),
    ).toEqual([]);
    // Mais la carte prise par le Voleur ne couvre pas n'importe quel déguisement :
    // un Renard montré en Voyante reste role-faux, le garde tient toujours.
    const faux = new Map<number, RoleId>([[5, 'renard']]);
    expect(
      fuitesDeVue(vueDe({ seat: 0, role: 'villageois', alive: true }, { over: true, players: [voleur] }), SALLE, faux, 0).map((f) => f.type),
    ).toContain('role-faux');
  });

  it('la carte voilée du Voleur n’est pas une fuite — pour personne (D46)', () => {
    // Pendant la phase du Voleur, chaque vue est muette : la carte du siège
    // est null, pas encore vue — la sienne comme celle des autres, la meute
    // et la fratrie closes. Le banc ne tient pas ce voile pour un déguisement.
    const voilee = vueDe(
      { seat: 3, role: 'voleur', alive: true },
      {
        you: { seat: 3, role: null, alive: true, canVote: true },
        phase: 'voleur',
        prompt: { kind: 'voler', cartes: ['voyante', 'ancien'], obligatoire: false },
        players: [{ seat: 0, role: null, alive: true, canVote: true, isCaptain: false, isLover: false }],
      },
    );
    expect(fuitesDeVue(voilee, SALLE, new Map<number, RoleId>([[3, 'voleur']]), 3)).toEqual([]);
  });

  it('le Voleur a son budget, et les autres phases ne bougent pas (R82, R110)', () => {
    expect(budgetPhase('voleur', null, 15, 60)).toBe(25_000);
    expect(budgetPhase('revelation', null, 15, 60)).toBe(25_000);
    expect(budgetPhase('nuit', 'principale', 15, 60)).toBe(15_000);
    expect(budgetPhase('jour', null, 15, 60)).toBe(60_000);
  });
});
