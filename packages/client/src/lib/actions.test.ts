/**
 * La reprise de sa place (D22) : retentée sur un échec passager, abandonnée
 * sur un refus définitif, sans pseudo exigé, avec `lastSeq` ; et les actions
 * suspendues tant qu'elle n'est pas confirmée.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChannelError, DEFAULT_OPTIONS, type Channel, type RoomView } from '@garoutom/engine';

import {
  codeDeLUrl,
  inscrireCodeDansLUrl,
  jouer,
  rechargerPourVersion,
  reprendrePlace,
} from './actions.js';
import { loadToken, oublierMemoire, saveName, saveToken } from './identity.js';
import { installeCanal } from './socket.js';
import { useStore } from './store.js';

interface Doublure {
  connected: boolean;
  request: ReturnType<typeof vi.fn>;
}

let doublure: Doublure;

function poserCanal(): Doublure {
  doublure = { connected: true, request: vi.fn() };
  installeCanal(() => doublure as unknown as Channel);
  return doublure;
}

function salle(code: string): RoomView {
  return {
    code,
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: [],
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
    paused: false,
  };
}

const reussite = { code: 'BRUM', playerId: 'p3', token: 'jeton-neuf' };

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  oublierMemoire();
  useStore.setState({
    room: null,
    game: null,
    playerId: null,
    notices: [],
    live: null,
    rattachement: 'rattache',
    dernierSeq: null,
    chronique: [],
  });
  poserCanal();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('reprendrePlace', () => {
  it('reprend par le jeton seul, sans pseudo, et demande tout le journal après un rechargement', async () => {
    saveToken('BRUM', 'jeton');
    doublure.request.mockResolvedValueOnce(reussite);

    await expect(reprendrePlace('BRUM')).resolves.toBe(true);

    expect(doublure.request).toHaveBeenCalledWith('room:join', {
      code: 'BRUM',
      name: '',
      token: 'jeton',
      lastSeq: 0,
    });
    expect(useStore.getState().rattachement).toBe('rattache');
    expect(useStore.getState().playerId).toBe('p3');
    expect(loadToken('BRUM')).toBe('jeton-neuf');
  });

  it('rend le dernier numéro vu de la table en cours', async () => {
    saveToken('BRUM', 'jeton');
    saveName('Anna');
    useStore.setState({ room: salle('BRUM'), dernierSeq: 57 });
    doublure.request.mockResolvedValueOnce(reussite);
    await reprendrePlace('BRUM');
    expect(doublure.request).toHaveBeenCalledWith('room:join', {
      code: 'BRUM',
      name: 'Anna',
      token: 'jeton',
      lastSeq: 57,
    });
  });

  it('dit « reprise » tant que la place n’est pas rendue, et suspend les actions', async () => {
    saveToken('BRUM', 'jeton');
    let rendre: (valeur: unknown) => void = () => undefined;
    doublure.request.mockReturnValueOnce(new Promise((resolve) => (rendre = resolve)));
    const reprise = reprendrePlace('BRUM');
    expect(useStore.getState().rattachement).toBe('reprise');

    await jouer({ type: 'voter', target: 2 });
    expect(doublure.request).toHaveBeenCalledTimes(1);
    expect(useStore.getState().notices.at(-1)?.message).toMatch(/Reprise de votre place/);

    rendre(reussite);
    await reprise;
    expect(useStore.getState().rattachement).toBe('rattache');
    doublure.request.mockResolvedValueOnce(null);
    await jouer({ type: 'voter', target: 2 });
    expect(doublure.request).toHaveBeenLastCalledWith('game:action', { action: { type: 'voter', target: 2 } });
  });

  it('retente après 1, 2 puis 4 s sur un échec passager, puis s’arrête', async () => {
    saveToken('BRUM', 'jeton');
    doublure.request.mockRejectedValue(new Error('Le serveur ne répond pas'));
    const reprise = reprendrePlace('BRUM');

    await vi.advanceTimersByTimeAsync(0);
    expect(doublure.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(doublure.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(doublure.request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(doublure.request).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(doublure.request).toHaveBeenCalledTimes(4);

    await expect(reprise).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(doublure.request).toHaveBeenCalledTimes(4);
    expect(useStore.getState().rattachement).toBe('echec');
    // Le jeton reste : la place n'est pas perdue, seulement pas encore reprise.
    expect(loadToken('BRUM')).toBe('jeton');
  });

  it('retente un quota dépassé, et finit par reprendre', async () => {
    saveToken('BRUM', 'jeton');
    doublure.request
      .mockRejectedValueOnce(new ChannelError('Trop de demandes', 'rate'))
      .mockResolvedValueOnce(reussite);
    const reprise = reprendrePlace('BRUM');
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(reprise).resolves.toBe(true);
    expect(doublure.request).toHaveBeenCalledTimes(2);
  });

  it('table disparue : oublie jeton et adresse, revient à l’accueil, le dit', async () => {
    saveToken('BRUM', 'jeton');
    inscrireCodeDansLUrl('BRUM');
    useStore.setState({ room: salle('BRUM'), playerId: 'p3' });
    doublure.request.mockRejectedValueOnce(new ChannelError('Table introuvable', 'gone'));

    await expect(reprendrePlace('BRUM')).resolves.toBe(false);

    expect(loadToken('BRUM')).toBeUndefined();
    expect(codeDeLUrl()).toBeNull();
    expect(useStore.getState().room).toBeNull();
    expect(useStore.getState().rattachement).toBe('rattache');
    expect(useStore.getState().notices.at(-1)?.message).toBe('La table a disparu.');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(doublure.request).toHaveBeenCalledTimes(1);
  });

  it('jeton inconnu d’une partie lancée : la place n’existe plus', async () => {
    saveToken('BRUM', 'jeton');
    doublure.request.mockRejectedValueOnce(new ChannelError('La partie a commencé', 'started'));
    await reprendrePlace('BRUM');
    expect(loadToken('BRUM')).toBeUndefined();
    expect(useStore.getState().notices.at(-1)?.message).toBe('Votre place à cette table n’existe plus.');
  });

  it('se tait quand la liaison retombe : la reconnexion relancera', async () => {
    saveToken('BRUM', 'jeton');
    doublure.request.mockImplementationOnce(() => {
      doublure.connected = false;
      return Promise.reject(new Error('Connexion perdue'));
    });
    await expect(reprendrePlace('BRUM')).resolves.toBe(false);
    expect(useStore.getState().rattachement).toBe('perdu');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(doublure.request).toHaveBeenCalledTimes(1);
  });

  it('sans jeton, rien à reprendre', async () => {
    await expect(reprendrePlace('BRUM')).resolves.toBe(false);
    expect(doublure.request).not.toHaveBeenCalled();
    expect(useStore.getState().rattachement).toBe('rattache');
  });
});

describe('le jeton', () => {
  it('survit en mémoire quand le stockage local est indisponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    saveToken('BRUM', 'jeton-secret');
    saveName('Anna');
    expect(loadToken('brum')).toBe('jeton-secret');
  });
});

describe('le rechargement pour version', () => {
  it('ne recharge pas deux fois de suite : il le dit', () => {
    sessionStorage.setItem('garoutom.rechargement-version', String(Date.now()));
    rechargerPourVersion();
    expect(useStore.getState().notices.at(-1)?.message).toMatch(/nouvelle version/);
  });
});
