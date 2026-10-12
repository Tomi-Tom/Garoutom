/* @vitest-environment jsdom */
/**
 * Le module chargé à la demande : le repli tant qu'il charge, le rendu à son
 * arrivée, la lecture synchrone une fois en cache, rien de chargé quand il
 * n'est pas demandé, et une nouvelle tentative après un échec.
 */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { paresseux } from './paresseux.js';

/** Un chargement qu'on résout à la main. */
function chargementManuel() {
  let resoudre: (m: { mot: string }) => void = () => undefined;
  let rejeter: (e: Error) => void = () => undefined;
  const charger = vi.fn(
    () =>
      new Promise<{ mot: string }>((ok, ko) => {
        resoudre = ok;
        rejeter = ko;
      }),
  );
  return { charger, resoudre: (m: { mot: string }) => resoudre(m), rejeter: (e: Error) => rejeter(e) };
}

describe('paresseux', () => {
  it('rend le repli tant que le module charge, puis le module à son arrivée', async () => {
    const { charger, resoudre } = chargementManuel();
    const module = paresseux(charger);
    function Lecteur() {
      const m = module.useModule();
      return <p>{m === undefined ? 'repli' : m.mot}</p>;
    }

    render(<Lecteur />);
    expect(screen.getByText('repli')).toBeInTheDocument();
    expect(charger).toHaveBeenCalledTimes(1);

    await act(async () => {
      resoudre({ mot: 'gravure' });
      await module.precharger();
    });
    expect(screen.getByText('gravure')).toBeInTheDocument();
    expect(module.courant()).toEqual({ mot: 'gravure' });

    // En cache : un nouveau rendu le lit tout de suite, sans recharger.
    render(<Lecteur />);
    expect(screen.getAllByText('gravure')).toHaveLength(2);
    expect(charger).toHaveBeenCalledTimes(1);
  });

  it('ne charge rien tant que le module n’est pas demandé', () => {
    const { charger } = chargementManuel();
    const module = paresseux(charger);
    function Lecteur({ actif }: { actif: boolean }) {
      return <p>{module.useModule(actif) === undefined ? 'rien' : 'là'}</p>;
    }
    render(<Lecteur actif={false} />);
    expect(screen.getByText('rien')).toBeInTheDocument();
    expect(charger).not.toHaveBeenCalled();
  });

  it('un module déjà préchargé est rendu au premier rendu', async () => {
    const module = paresseux(() => Promise.resolve({ mot: 'prêt' }));
    await module.precharger();
    function Lecteur() {
      return <p>{module.useModule()?.mot ?? 'repli'}</p>;
    }
    render(<Lecteur />);
    expect(screen.getByText('prêt')).toBeInTheDocument();
  });

  it('après un échec, le préchargement suivant réessaie', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { charger, rejeter } = chargementManuel();
    const module = paresseux(charger);
    const premier = module.precharger();
    rejeter(new Error('réseau'));
    await expect(premier).rejects.toThrow('réseau');
    expect(module.courant()).toBeUndefined();

    const second = module.precharger();
    expect(charger).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(premier);
    avertir.mockRestore();
  });
});
