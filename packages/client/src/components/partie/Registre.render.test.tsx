/* @vitest-environment jsdom */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, type GameEvent, type RoomView } from '@garoutom/engine';

import { useStore, type EvenementRecu } from '../../lib/store.js';
import { Registre } from './Registre.js';

function salle(): RoomView {
  return {
    code: 'TEST',
    status: 'playing',
    options: DEFAULT_OPTIONS,
    hostId: 'p0',
    players: Array.from({ length: 4 }, (_, seat) => ({
      id: `p${String(seat)}`,
      name: ['Anna', 'Clément', 'Jules', 'Tom'][seat] ?? '?',
      seat,
      connected: true,
      isHost: seat === 0,
      disconnectedUntil: null,
    })),
    reconnectGraceMs: 60_000,
    deadline: null,
    deadlineDurationMs: null,
  } as RoomView;
}

let n = 0;
const recu = (event: GameEvent, day = 1): EvenementRecu => ({ id: (n += 1), event, day });

function chronique(): EvenementRecu[] {
  return [
    recu({ type: 'debut' }),
    recu({ type: 'phase', phase: 'nuit', day: 1 }),
    recu({ type: 'morts', deaths: [{ seat: 1, cause: 'loups', role: 'loup' }] }),
    recu({ type: 'phase', phase: 'jour', day: 1 }, 1),
    recu({ type: 'aube-paisible' }, 2),
    recu({ type: 'phase', phase: 'nuit', day: 2 }, 2),
  ];
}

describe('<Registre />', () => {
  beforeEach(() => {
    n = 0;
    useStore.setState({ room: salle(), game: null, chronique: [], notices: [], live: null });
  });

  it('est une feuille basse titrée « Le registre », avec « Refermer » et Échap', async () => {
    const onFermer = vi.fn();
    render(<Registre onFermer={onFermer} />);
    const feuille = screen.getByRole('dialog', { name: 'Le registre' });
    expect(feuille).toHaveAttribute('aria-modal', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Refermer' }));
    expect(onFermer).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onFermer).toHaveBeenCalledTimes(2);
  });

  it('le toucher du voile referme aussi', async () => {
    const onFermer = vi.fn();
    render(<Registre onFermer={onFermer} />);
    await userEvent.click(document.querySelector('.voile')!);
    expect(onFermer).toHaveBeenCalledTimes(1);
  });

  it('range la chronique par heure, le plus récent en haut et ouvert', () => {
    act(() => useStore.setState({ chronique: chronique() }));
    render(<Registre onFermer={() => undefined} />);
    const blocs = screen.getByTestId('registre').querySelectorAll('details');
    expect([...blocs].map((b) => b.getAttribute('data-heure'))).toEqual(['nuit-2', 'jour-1', 'nuit-1']);
    expect(blocs[0]).toHaveAttribute('open');
    expect(blocs[1]).not.toHaveAttribute('open');
    expect(within(blocs[0]!).getByRole('heading', { name: 'Nuit 2' })).toBeInTheDocument();
    expect(within(blocs[2]!).getByRole('heading', { name: 'Nuit 1' })).toBeInTheDocument();
  });

  it('une mort : la chandelle et le rôle révélé en cartouche de 20', () => {
    act(() => useStore.setState({ chronique: chronique() }));
    render(<Registre onFermer={() => undefined} />);
    const nuit1 = screen.getByTestId('registre').querySelector('[data-heure="nuit-1"]')!;
    const mort = [...nuit1.querySelectorAll('li')].find((li) => li.querySelector('[data-mort]'))!;
    expect(mort.querySelector('[data-icone="chandelle"]')).not.toBeNull();
    const cartouche = mort.querySelector('.cartouche')!;
    expect(cartouche).toHaveAttribute('data-taille', '20');
    expect(cartouche).toHaveAttribute('data-forme', 'mordu');
    expect(cartouche.textContent ?? '').toMatch(/\S/);
  });

  it('dit son vide', () => {
    render(<Registre onFermer={() => undefined} />);
    expect(screen.getByText('Rien n’a encore été dit.')).toBeInTheDocument();
  });
});
