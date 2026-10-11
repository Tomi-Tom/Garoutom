/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, ROLES } from '@garoutom/engine';

import { PALETTES } from '../../skins/habits.js';
import { peauDuSkin } from '../../skins/registre.js';
import { useStore } from '../../lib/store.js';
import { CarteRole } from './CarteRole.js';
import { Decor, type Moment } from './Decor.js';
import { SymboleRole } from './Symbole.js';

/** Pose le skin du salon dans le magasin, comme le ferait un `sync`. */
function reglerSkin(skin: string): void {
  useStore.setState({
    room: {
      code: 'TEST',
      status: 'lobby',
      options: { ...DEFAULT_OPTIONS, skin },
      hostId: 'p0',
      players: [],
      reconnectGraceMs: 60_000,
      deadline: null,
      deadlineDurationMs: null,
    },
    game: null,
  });
}

describe('habit', () => {
  beforeEach(() => {
    reglerSkin('thiercelieux');
  });

  for (const skin of ['thiercelieux', 'shiganshina']) {
    it(`chaque rôle a un symbole nommé par le skin ${skin}`, () => {
      reglerSkin(skin);
      const peau = peauDuSkin(skin);
      for (const role of ROLES) {
        const { unmount } = render(<SymboleRole role={role} />);
        expect(screen.getByRole('img', { name: peau.roles[role].nom })).toBeInTheDocument();
        unmount();
      }
    });
  }

  it('le dos de carte porte son libellé', () => {
    render(<SymboleRole role={null} />);
    expect(screen.getByRole('img', { name: 'carte face cachée' })).toBeInTheDocument();
  });

  it('la face montre le nom et la description du rôle', () => {
    render(<CarteRole role="voyante" retournee />);
    const peau = peauDuSkin('thiercelieux');
    expect(screen.getByText(peau.roles.voyante.nom)).toBeInTheDocument();
    expect(screen.getByText(peau.roles.voyante.description)).toBeInTheDocument();
  });

  it('la petite carte tait la description par défaut', () => {
    render(<CarteRole role="voyante" retournee taille="petite" />);
    expect(screen.queryByText(peauDuSkin('thiercelieux').roles.voyante.description)).toBeNull();
  });

  it('le dos reste face cachée tant que la carte est inconnue', () => {
    const { container } = render(<CarteRole role={null} retournee />);
    expect(container.querySelector('[data-face="recto"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('img', { name: 'carte face cachée' })).toBeInTheDocument();
  });

  it('devient un bouton avec onClic', async () => {
    const onClic = vi.fn();
    render(<CarteRole role="loup" retournee={false} onClic={onClic} />);
    const bouton = screen.getByRole('button', { name: 'Retourner votre carte' });
    await userEvent.click(bouton);
    expect(onClic).toHaveBeenCalledTimes(1);
  });

  it('sans onClic, aucun bouton', () => {
    render(<CarteRole role="loup" retournee />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('le décor se rend pour chaque moment, caché des lecteurs d’écran', () => {
    const moments: Moment[] = ['salon', 'nuit', 'aube', 'jour', 'fin'];
    for (const moment of moments) {
      const { container, unmount } = render(<Decor moment={moment} />);
      const decor = container.querySelector(`[data-decor="${moment}"]`);
      expect(decor).toHaveAttribute('aria-hidden', 'true');
      expect(decor?.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });

  it('styles.css recopie fidèlement la palette de Shiganshina', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const bloc = css.slice(css.indexOf("[data-skin='shiganshina'] {"));
    const noms = {
      nuit: '--nuit',
      nuitCreux: '--nuit-creux',
      nuitRelief: '--nuit-relief',
      papier: '--papier',
      papierDoux: '--papier-doux',
      lune: '--lune',
      lanterne: '--lanterne',
      sang: '--sang',
      sangCreux: '--sang-creux',
      serment: '--serment',
    } as const;
    const palette = PALETTES['shiganshina'];
    for (const [cle, variable] of Object.entries(noms)) {
      const valeur = palette?.[cle as keyof typeof noms] ?? '?';
      expect(bloc).toContain(`${variable}: ${valeur};`);
      expect(bloc).toContain(`--color-${variable.slice(2)}: ${valeur};`);
    }
  });

  it('les palettes couvrent les skins du registre, sans trou', () => {
    for (const skin of ['thiercelieux', 'shiganshina']) {
      const palette = PALETTES[skin];
      expect(palette).toBeDefined();
      for (const couleur of Object.values(palette ?? {})) expect(couleur).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
