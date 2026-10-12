/* @vitest-environment jsdom */
/**
 * La fin des parties à rôles optionnels, rendue sur des parties que le moteur
 * a vraiment jouées : le verdict se juge par faction (R98) — le Loup Blanc
 * gagne seul, et la victoire de la meute n'est pas la sienne —, et la nuit
 * racontée récite les lignes nouvelles (R91–R97) à leur heure.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAction,
  campOf,
  createGame,
  createSeededRng,
  DEFAULT_OPTIONS,
  timeoutPhase,
  viewFor,
  type Action,
  type GameOptions,
  type GameState,
  type RoleId,
  type RoomView,
  type Rng,
} from '@garoutom/engine';

import { useStore } from '../../lib/store.js';
import { verdictPour } from '../../lib/useSonsPartie.js';
import { Fin } from './Fin.js';
import { decouperLog, finitDeNuit } from './fin/recit.js';
import { verdictDuSiege } from './fin/verdict.js';

const { revanche, quitterTable } = vi.hoisted(() => ({
  revanche: vi.fn(() => Promise.resolve(null)),
  quitterTable: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../lib/actions.js', () => ({ revanche, quitterTable }));

/* ------------------------------------------------------------------ */
/* Des parties menées par le moteur                                    */
/* ------------------------------------------------------------------ */

class Banc {
  rng: Rng;
  state: GameState;

  constructor(joueurs: number, ecarts: Partial<GameOptions>, graine = 11) {
    this.rng = createSeededRng(graine);
    const options: GameOptions = { ...DEFAULT_OPTIONS, auto: false, loups: 2, capitaine: false, ...ecarts };
    this.state = createGame({ players: joueurs, options }, this.rng).state;
  }

  agir(siege: number, action: Action): this {
    this.state = applyAction(this.state, action, this.rng, siege).state;
    return this;
  }

  cloturer(): this {
    this.state = timeoutPhase(this.state, this.rng, this.state.phaseSeq).state;
    return this;
  }

  prets(): this {
    for (const joueur of this.state.players) this.agir(joueur.seat, { type: 'pret' });
    return this;
  }

  siege(role: RoleId): number {
    const joueur = this.state.players.find((p) => p.role === role);
    if (!joueur) throw new Error(`personne ne joue ${role}`);
    return joueur.seat;
  }

  sieges(role: RoleId): number[] {
    return this.state.players.filter((p) => p.role === role).map((p) => p.seat);
  }

  vivants(): number[] {
    return this.state.players.filter((p) => p.alive).map((p) => p.seat);
  }

  /**
   * Joue jusqu'au bout en suivant les consignes de chaque siège, comme un
   * robot : la meute dévore le village, le village vote contre la meute, les
   * pouvoirs se taisent. La minuterie débloque le reste.
   */
  finir(): this {
    for (let tour = 0; tour < 600 && !this.state.over; tour += 1) {
      let agi = false;
      for (const joueur of this.state.players) {
        if (this.state.over) break;
        const vue = viewFor(this.state, joueur.seat);
        if (vue.prompt === null || vue.acted) continue;
        const autres = this.state.players.filter((p) => p.alive && p.seat !== joueur.seat);
        const loup = autres.find((p) => campOf(p.role) === 'loups');
        const proie = autres.find((p) => campOf(p.role) === 'village');
        let action: Action | null = null;
        switch (vue.prompt.kind) {
          case 'pret':
            action = { type: 'pret' };
            break;
          case 'devorer':
            action = { type: 'devorer', target: proie?.seat ?? null };
            break;
          case 'voter':
            action = {
              type: 'voter',
              target: vue.prompt.election
                ? null
                : campOf(joueur.role) === 'loups'
                  ? (proie?.seat ?? null)
                  : (loup?.seat ?? null),
            };
            break;
          case 'marquer':
            action = { type: 'marquer', target: null };
            break;
          case 'trahir':
            action = { type: 'trahir', target: null };
            break;
          case 'designerVotants':
            action = { type: 'designerVotants', seats: [autres[0]?.seat ?? joueur.seat] };
            break;
          case 'tirer':
            action = { type: 'tirer', target: null };
            break;
          default:
            break;
        }
        if (action === null) continue;
        try {
          this.state = applyAction(this.state, action, this.rng, joueur.seat).state;
          agi = true;
        } catch {
          // Refusée : la minuterie débloquera.
        }
      }
      if (!agi && !this.state.over) this.cloturer();
    }
    expect(this.state.over).toBe(true);
    return this;
  }
}

/**
 * Six joueurs : un loup, le Loup Blanc, quatre villageois. La meute mange le
 * village ; la nuit 2, le Loup Blanc dévore son complice — ou l'épargne.
 */
function partieDuLoupBlanc(trahit: boolean): { banc: Banc; loup: number; blanc: number } {
  const banc = new Banc(6, { loups: 1, roles: ['loupBlanc'] }).prets();
  const loup = banc.siege('loup');
  const blanc = banc.siege('loupBlanc');
  const [v1, v2, v3, v4] = banc.sieges('villageois') as [number, number, number, number];

  // Nuit 1 : la meute dévore v1.
  banc.agir(loup, { type: 'devorer', target: v1 }).agir(blanc, { type: 'devorer', target: v1 });
  expect(banc.state.phase.kind).toBe('jour');
  // Jour 1 : la potence pour v2.
  for (const seat of banc.vivants()) banc.agir(seat, { type: 'voter', target: seat === v2 ? v3 : v2 });
  expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'principale' });
  // Nuit 2 : la meute dévore v3, puis l'étape du Loup Blanc.
  banc.agir(loup, { type: 'devorer', target: v3 }).agir(blanc, { type: 'devorer', target: v3 });
  expect(banc.state.phase).toMatchObject({ kind: 'nuit', step: 'loupBlanc' });
  banc.agir(blanc, { type: 'trahir', target: trahit ? loup : null });
  expect(banc.state.phase.kind).toBe('jour');

  if (trahit) {
    // Restent le Loup Blanc et v4 : égalité au jour 2, puis la nuit 3 le laisse seul.
    banc.agir(blanc, { type: 'voter', target: v4 }).agir(v4, { type: 'voter', target: blanc });
    banc.agir(blanc, { type: 'devorer', target: v4 });
  } else {
    // Jour 2 : la meute pend v4 ; il ne reste qu'elle — le huis clos finit sur sa victoire (R99).
    for (const seat of banc.vivants()) banc.agir(seat, { type: 'voter', target: seat === v4 ? loup : v4 });
    while (!banc.state.over) banc.cloturer();
  }
  return { banc, loup, blanc };
}

/**
 * Huit joueurs : deux loups, l'Ancien, le Corbeau, le Bouc émissaire. La
 * meute mord l'Ancien, qui tient ; le Corbeau marque un villageois ; le vote
 * finit à égalité, le Bouc paie ; son dernier mot est dit — ou tu ; le
 * lendemain, le village pend son Ancien, et les pouvoirs s'éteignent.
 */
function partieDuBouc(parle: boolean): { banc: Banc; ancien: number; bouc: number; marque: number; designe: number } {
  const banc = new Banc(8, { roles: ['ancien', 'corbeau', 'bouc'] }).prets();
  const [loupA, loupB] = banc.sieges('loup') as [number, number];
  const ancien = banc.siege('ancien');
  const bouc = banc.siege('bouc');
  const [marque, autre, designe] = banc.sieges('villageois') as [number, number, number];

  banc
    .agir(loupA, { type: 'devorer', target: ancien })
    .agir(loupB, { type: 'devorer', target: ancien })
    .agir(banc.siege('corbeau'), { type: 'marquer', target: marque });
  expect(banc.state.phase.kind).toBe('jour');
  expect(banc.state.players[ancien]?.alive).toBe(true);

  // Deux voix contre `autre`, deux d'office contre le marqué : égalité.
  for (const seat of banc.vivants()) {
    banc.agir(seat, { type: 'voter', target: seat === loupA || seat === loupB ? autre : null });
  }
  expect(banc.state.phase).toMatchObject({ kind: 'bouc', seat: bouc });
  if (parle) banc.agir(bouc, { type: 'designerVotants', seats: [designe] });
  else banc.cloturer();

  // La nuit 2 passe sans un geste.
  while (banc.state.phase.kind === 'nuit') banc.cloturer();
  expect(banc.state.phase.kind).toBe('jour');
  // Le village pend son Ancien.
  const votants = parle ? [designe] : banc.vivants();
  for (const seat of votants) banc.agir(seat, { type: 'voter', target: seat === ancien ? autre : ancien });
  expect(banc.state.pouvoirsPerdus).toBe(true);
  banc.finir();
  return { banc, ancien, bouc, marque, designe };
}

function salle(nombre: number): RoomView {
  return {
    code: 'TEST',
    status: 'finished',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: Array.from({ length: nombre }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: `Joueur ${String(seat)}`,
      seat,
      connected: true,
      isHost: seat === 0,
      disconnectedUntil: null,
      absent: false,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

function poser(state: GameState, siege: number | null): void {
  useStore.getState().applySync({
    room: salle(state.players.length),
    game: viewFor(state, siege),
    events: [],
    seq: 0,
    serverNow: Date.now(),
  });
  useStore.setState({ playerId: siege === null ? null : `p${String(siege)}` });
}

function verdict(): string | null {
  return screen.getByRole('heading', { level: 1 }).textContent;
}

function nom(seat: number): string {
  return `Joueur ${String(seat)}`;
}

/** Un nœud de texte qui ne serait que l'identifiant du moteur. */
const IDENTIFIANTS_BRUTS =
  /^(villageois|loup|voyante|sorciere|chasseur|cupidon|salvateur|idiot|ancien|corbeau|bouc|petiteFille|loupBlanc|resistance|rancune|votants)$/;

function aucunIdentifiantBrut(): void {
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (marcheur.nextNode()) {
    expect((marcheur.currentNode.textContent ?? '').trim()).not.toMatch(IDENTIFIANTS_BRUTS);
  }
  expect(document.body.textContent).not.toMatch(/[{}]|undefined|null/);
}

describe('<Fin /> — les rôles optionnels', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('le Loup Blanc seul debout : GAGNÉ pour lui, PERDU pour la meute comme pour le village', () => {
    const { banc, loup, blanc } = partieDuLoupBlanc(true);
    expect(banc.state.winner).toBe('loupBlanc');
    const villageois = banc.siege('villageois');

    poser(banc.state, blanc);
    const vue = render(<Fin />);
    expect(verdict()).toBe('GAGNÉ');
    expect(screen.getByText(/Le Loup Blanc se tient seul sur la place déserte/)).toBeInTheDocument();
    // Un seul gagnant sur la table : lui.
    const gagnants = document.querySelectorAll('[data-gagnant="oui"]');
    expect(gagnants).toHaveLength(1);
    expect(gagnants[0]).toHaveTextContent(nom(blanc));
    // La nuit racontée dit sa trahison.
    expect(
      screen.getByText(`Le Loup Blanc a dévoré ${nom(loup)}, un loup de sa propre meute.`),
    ).toBeInTheDocument();
    aucunIdentifiantBrut();
    vue.unmount();

    for (const perdant of [loup, villageois]) {
      poser(banc.state, perdant);
      const autre = render(<Fin />);
      expect(verdict()).toBe('PERDU');
      autre.unmount();
    }

    // Le son du verdict suit la même faction.
    expect(verdictPour(viewFor(banc.state, blanc), 'loupBlanc')).toBe('gagne');
    expect(verdictPour(viewFor(banc.state, loup), 'loupBlanc')).toBe('perdu');
  });

  it('la meute gagne le huis clos : le Loup Blanc, qui chassait avec elle, a perdu', () => {
    const { banc, loup, blanc } = partieDuLoupBlanc(false);
    expect(banc.state.winner).toBe('loups');

    poser(banc.state, loup);
    const vueLoup = render(<Fin />);
    expect(verdict()).toBe('GAGNÉ');
    expect(screen.getAllByText('Le Loup Blanc a épargné la meute.').length).toBeGreaterThan(0);
    vueLoup.unmount();

    poser(banc.state, blanc);
    render(<Fin />);
    expect(verdict()).toBe('PERDU');
    const gagnants = [...document.querySelectorAll('[data-gagnant="oui"]')];
    expect(gagnants).toHaveLength(1);
    expect(gagnants[0]).toHaveTextContent(nom(loup));
    aucunIdentifiantBrut();

    const vue = viewFor(banc.state, blanc);
    expect(verdictDuSiege('loups', vue.players, blanc).verdict).toBe('PERDU');
    expect(verdictPour(vue, 'loups')).toBe('perdu');
    expect(verdictPour(viewFor(banc.state, loup), 'loups')).toBe('gagne');
  });

  it('la nuit racontée récite l’Ancien, le Corbeau, le Bouc et son dernier mot, chacun à son heure', () => {
    const { banc, ancien, bouc, marque, designe } = partieDuBouc(true);
    poser(banc.state, 0);
    render(<Fin />);

    expect(screen.getByText(`La meute a attaqué ${nom(ancien)} : l’Ancien a tenu bon.`)).toBeInTheDocument();
    expect(screen.getByText(`Le Corbeau a marqué ${nom(marque)}.`)).toBeInTheDocument();
    expect(screen.getByText(`L’égalité est retombée sur ${nom(bouc)}, le Bouc émissaire.`)).toBeInTheDocument();
    expect(
      screen.getByText(`Le Bouc émissaire a désigné les votants du lendemain : ${nom(designe)}.`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`En tuant ${nom(ancien)}, son Ancien, le village a perdu ses pouvoirs.`),
    ).toBeInTheDocument();
    aucunIdentifiantBrut();

    // Les heures : la résistance et la marque sont de la nuit 1 ; le Bouc et
    // son dernier mot du jour 1 ; la rancune, du jour où l'Ancien est pendu.
    const jours = decouperLog(banc.state.log);
    const types = (n: number, heure: 'nuit' | 'jour') =>
      jours.find((jour) => jour.n === n)?.[heure].map((entree) => entree.type) ?? [];
    expect(types(1, 'nuit')).toEqual(expect.arrayContaining(['corbeau', 'loups', 'resistance']));
    expect(types(1, 'jour')).toEqual(expect.arrayContaining(['vote', 'bouc', 'mort', 'votants']));
    expect(types(2, 'jour')).toEqual(expect.arrayContaining(['vote', 'mort', 'rancune']));
    expect(types(2, 'nuit')).not.toContain('rancune');
  });

  it('le Bouc qui se tait : la nuit racontée le dit, tout le village a voté', () => {
    const { banc } = partieDuBouc(false);
    poser(banc.state, null);
    render(<Fin />);
    expect(screen.getByText('Le Bouc émissaire n’a désigné personne.')).toBeInTheDocument();
    aucunIdentifiantBrut();
  });
});

describe('recit — les lignes de la v2', () => {
  it('la rancune garde l’heure de la mort qui l’a déclenchée', () => {
    const jours = decouperLog([
      { day: 2, type: 'loups', target: null },
      { day: 2, type: 'poison', target: 4 },
      { day: 2, type: 'mort', seat: 4, cause: 'poison' },
      { day: 2, type: 'rancune', seat: 4 },
      { day: 2, type: 'vote', tally: { 5: 1 }, executed: 5 },
      { day: 2, type: 'mort', seat: 5, cause: 'vote' },
    ]);
    expect(jours[0]!.nuit.map((e) => e.type)).toEqual(['loups', 'poison', 'mort', 'rancune']);
    expect(jours[0]!.jour.map((e) => e.type)).toEqual(['vote', 'mort']);
  });

  it('la partie s’arrête à l’heure de sa dernière ligne, lue dans le fil du log', () => {
    expect(finitDeNuit([])).toBeNull();
    expect(
      finitDeNuit([
        { day: 1, type: 'vote', tally: { 2: 3 }, executed: 2 },
        { day: 1, type: 'mort', seat: 2, cause: 'vote' },
        { day: 1, type: 'rancune', seat: 2 },
      ]),
    ).toBe(false);
    expect(
      finitDeNuit([
        { day: 3, type: 'loups', target: 1 },
        { day: 3, type: 'loupBlanc', target: 2 },
        { day: 3, type: 'mort', seat: 1, cause: 'loups' },
      ]),
    ).toBe(true);
  });
});
