/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPTIONS, ROLES, type RoleId } from '@garoutom/engine';

import { peauDuSkin, voixDuSkin } from '../../skins/registre.js';
import { useStore } from '../../lib/store.js';
import { CarteRole } from './CarteRole.js';
import { CouvreChef } from './CouvreChef.js';
import { Decor, type Moment } from './Decor.js';
import { Frontispice, deuxLignes } from './Frontispice.js';
import { Glyphe, NOMS_GLYPHES } from './glyphes.js';
import { Icone, NOMS_ICONES } from './Icone.js';
import { SymboleRole } from './Symbole.js';
import { VIGNETTES } from './traces/vignettes.js';
import { NOMS_VIGNETTES, Vignette } from './Vignette.js';

// La palette des skins et sa recopie dans styles.css sont vérifiées par
// skins/contraste.test.ts (Caprices, lot V1-A) : l'habit d'avant n'existe plus.
// La luminance des faces (arbitrage n° 3) : luminance.test.tsx.

const SKINS = ['thiercelieux', 'shiganshina', 'giletsjaunes', 'farwest', 'pirates', 'openspace'] as const;
/** Les identifiants du moteur qui ne sont pas des mots : ils ne doivent jamais s'afficher. La v3 comprise (R105–R114). */
const IDENTIFIANTS_BRUTS =
  /\b(petiteFille|loupBlanc|sorciere|villageois|villageois2|salvateur|chasseur|cupidon|renard|ours|flairer|voleur|chienLoup|enfantSauvage|soeurs|freres)\b/;

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
      paused: false,
    },
    game: null,
  });
}

/** Un rendu sans ses identifiants locaux (préfixés par `useId`, propres à chaque montage). */
const sansIds = (html: string): string => html.replace(/g\w*-c[0-9a-z]+/g, 'ID');

/** Un SVG rendu porte un dessin : au moins un élément graphique. */
function dessine(svg: Element | null): boolean {
  return svg !== null && svg.querySelector('path, circle, ellipse, rect, line, polygon') !== null;
}

/** Chaque `url(#…)` local d'un rendu désigne un élément présent (les matières globales mises à part). */
const MATIERES = /^(hach-|verge|aqua-|papier|mordu|cart-|g-|buste-|brunir-|lf-)/;
function referencesResolues(racine: Element): void {
  for (const [, id] of racine.innerHTML.matchAll(/url\(#([^)]+)\)/g)) {
    if (id === undefined || MATIERES.test(id)) continue;
    expect(racine.querySelector(`[id="${id}"]`), `#${id}`).not.toBeNull();
  }
}

describe('symboles de rôle', () => {
  beforeEach(() => {
    reglerSkin('thiercelieux');
  });

  for (const skin of SKINS) {
    it(`chaque rôle a un symbole nommé par le skin ${skin}, à chaque taille`, () => {
      reglerSkin(skin);
      const peau = peauDuSkin(skin);
      for (const role of ROLES) {
        for (const taille of [128, 32, 24, 16] as const) {
          const { container, unmount } = render(<SymboleRole role={role} taille={taille} />);
          const img = screen.getByRole('img', { name: peau.roles[role].nom });
          expect(img.getAttribute('aria-label')).not.toBe(role);
          expect(dessine(img)).toBe(true);
          expect(container.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
          referencesResolues(container);
          unmount();
        }
      }
    });
  }

  it('le skin passé en prop l’emporte sur celui de la table', () => {
    render(<SymboleRole role="loup" skin="shiganshina" />);
    expect(screen.getByRole('img', { name: peauDuSkin('shiganshina').roles.loup.nom })).toBeInTheDocument();
  });

  it('Shiganshina grave autrement que Thiercelieux', () => {
    const { container: a } = render(<SymboleRole role="voyante" skin="thiercelieux" taille={128} />);
    const { container: b } = render(<SymboleRole role="voyante" skin="shiganshina" taille={128} />);
    expect(a.querySelector('svg')?.innerHTML).not.toBe(b.querySelector('svg')?.innerHTML);
  });

  it('trois niveaux de gravure selon la taille', () => {
    const { container } = render(
      <>
        <SymboleRole role="sorciere" taille={128} />
        <SymboleRole role="sorciere" taille={32} />
        <SymboleRole role="sorciere" taille={16} />
      </>,
    );
    // les identifiants locaux mis à part, chaque niveau est un autre dessin
    const dessins = [...container.querySelectorAll('svg')].map((s) => sansIds(s.innerHTML));
    expect(new Set(dessins).size).toBe(3);
  });

  it('deux symboles d’une même page ne partagent pas leurs découpes', () => {
    const { container } = render(
      <>
        <SymboleRole role="corbeau" taille={128} />
        <SymboleRole role="corbeau" taille={128} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    referencesResolues(container);
  });

  it('le dos de carte porte son libellé', () => {
    render(<SymboleRole role={null} />);
    expect(screen.getByRole('img', { name: 'carte face cachée' })).toBeInTheDocument();
  });

  it('décoratif, il se tait', () => {
    const { container } = render(<SymboleRole role="loup" decoratif />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('carte de rôle', () => {
  beforeEach(() => {
    reglerSkin('thiercelieux');
  });

  it('la face montre le numéro, le nom, le cartouche et la légende du skin', () => {
    const voix = voixDuSkin('thiercelieux');
    const { container } = render(<CarteRole role="sorciere" retournee />);
    expect(screen.getByText(voix.nomRole('sorciere'))).toBeInTheDocument();
    expect(screen.getByText(voix.legendeRole('sorciere'))).toBeInTheDocument();
    expect(screen.getByText('Village')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(container.querySelector('[data-face-gravee="grande"]')).not.toBeNull();
    referencesResolues(container);
  });

  it('la description vit sous la carte, quand on la demande', () => {
    const voix = voixDuSkin('thiercelieux');
    const { container } = render(<CarteRole role="voyante" retournee avecDescription />);
    const description = screen.getByText(voix.descriptionRole('voyante'));
    expect(container.querySelector('[data-carte]')?.contains(description)).toBe(false);
  });

  it('la petite carte tait la description et la légende', () => {
    const voix = voixDuSkin('thiercelieux');
    render(<CarteRole role="voyante" retournee taille="petite" />);
    expect(screen.getByText(voix.nomRole('voyante'))).toBeInTheDocument();
    expect(screen.queryByText(voix.descriptionRole('voyante'))).toBeNull();
    expect(screen.queryByText(voix.legendeRole('voyante'))).toBeNull();
  });

  it('avecLegende={false} tait la légende', () => {
    render(<CarteRole role="voyante" retournee avecLegende={false} />);
    expect(screen.queryByText(voixDuSkin('thiercelieux').legendeRole('voyante'))).toBeNull();
  });

  it('le cartouche dit le camp du skin : Village, Meute, Seul — District, Titans — Rond-point, Forces de l’ordre — Bourg, Hors-la-loi — Équipage, Mutins — Plateau, Managers', () => {
    const cas: [string, RoleId, string][] = [
      ['thiercelieux', 'idiot', 'Village'],
      ['thiercelieux', 'loup', 'Meute'],
      ['thiercelieux', 'loupBlanc', 'Seul'],
      ['shiganshina', 'idiot', 'District'],
      ['shiganshina', 'loup', 'Titans'],
      ['giletsjaunes', 'idiot', 'Rond-point'],
      ['giletsjaunes', 'loup', 'Forces de l’ordre'],
      ['giletsjaunes', 'loupBlanc', 'Seul'],
      ['farwest', 'idiot', 'Bourg'],
      ['farwest', 'loup', 'Hors-la-loi'],
      ['farwest', 'loupBlanc', 'Seul'],
      ['pirates', 'idiot', 'Équipage'],
      ['pirates', 'loup', 'Mutins'],
      ['pirates', 'loupBlanc', 'Seul'],
      ['openspace', 'idiot', 'Plateau'],
      ['openspace', 'loup', 'Managers'],
      ['openspace', 'loupBlanc', 'Seul'],
    ];
    for (const [skin, role, mot] of cas) {
      const { unmount } = render(<CarteRole role={role} retournee skin={skin} avecDescription={false} />);
      // le nom du rôle peut dire le même mot que le cartouche (Hors-la-loi)
      expect(screen.getAllByText(mot).length).toBeGreaterThan(0);
      unmount();
    }
  });

  for (const skin of SKINS) {
    it(`chaque face (${skin}) se grave dans les trois formats et les deux tirages, sans identifiant brut`, () => {
      reglerSkin(skin);
      for (const role of ROLES) {
        for (const taille of ['petite', 'moyenne', 'grande'] as const) {
          for (const tirage of ['papier', 'cuivre'] as const) {
            const { container, unmount } = render(<CarteRole role={role} retournee taille={taille} tirage={tirage} />);
            const recto = container.querySelector('[data-face="recto"]');
            expect(recto).toHaveAttribute('data-tirage', tirage);
            expect(dessine(recto?.querySelector('svg') ?? null)).toBe(true);
            expect(container.textContent ?? '').not.toMatch(IDENTIFIANTS_BRUTS);
            unmount();
          }
        }
      }
    });
  }

  it('face cachée, le rôle n’est pas dans la page', () => {
    const { container } = render(<CarteRole role="loup" retournee={false} />);
    expect(screen.queryByText(voixDuSkin('thiercelieux').nomRole('loup'))).toBeNull();
    expect(container.querySelector('[data-face="recto"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('img', { name: 'carte face cachée' })).toBeInTheDocument();
  });

  it('le dos reste face cachée tant que la carte est inconnue', () => {
    const { container } = render(<CarteRole role={null} retournee />);
    expect(container.querySelector('[data-face="recto"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('img', { name: 'carte face cachée' })).toBeInTheDocument();
  });

  it('le dos suit son propre tirage, et Shiganshina y grave la Porte', () => {
    const { container: a } = render(<CarteRole role={null} retournee={false} tirage="papier" tirageDos="cuivre" />);
    expect(a.querySelector('[data-face="verso"]')).toHaveAttribute('data-tirage', 'cuivre');
    const { container: b } = render(<CarteRole role={null} retournee={false} tirage="cuivre" />);
    const { container: c } = render(<CarteRole role={null} retournee={false} tirage="cuivre" skin="shiganshina" />);
    const verso = (x: HTMLElement) => sansIds(x.querySelector('[data-face="verso"]')?.innerHTML ?? '');
    expect(verso(b)).not.toBe(verso(c));
  });

  it('morte, la carte est brunie : plus d’aquatinte, le trait au palier des morts', () => {
    const { container: vive } = render(<CarteRole role="loup" retournee />);
    expect(vive.querySelector('[filter="url(#aqua-I)"]')).not.toBeNull();
    const { container: morte } = render(<CarteRole role="loup" retournee morte />);
    expect(morte.querySelector('[data-carte]')).toHaveAttribute('data-morte');
    expect(morte.querySelector('[filter="url(#aqua-I)"]')).toBeNull();
    expect(morte.querySelector('[data-face-gravee]')?.innerHTML).toContain('--etat-mort-trait');
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
});

describe('icônes, glyphes, couvre-chefs', () => {
  it('les 33 icônes se dessinent, décoratives par défaut', () => {
    expect(NOMS_ICONES).toHaveLength(33);
    for (const nom of NOMS_ICONES) {
      for (const taille of [24, 44] as const) {
        const { container, unmount } = render(<Icone nom={nom} taille={taille} />);
        const svg = container.querySelector('svg');
        expect(dessine(svg), nom).toBe(true);
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('width', String(taille));
        unmount();
      }
    }
  });

  it('une icône nommée devient une image', () => {
    render(<Icone nom="reglages" libelle="Réglages" />);
    expect(screen.getByRole('img', { name: 'Réglages' })).toBeInTheDocument();
  });

  it('les glyphes d’état se dessinent (les onze du lot F et le brassard)', () => {
    expect(NOMS_GLYPHES).toHaveLength(12);
    for (const nom of NOMS_GLYPHES) {
      const { container, unmount } = render(<Glyphe nom={nom} />);
      expect(dessine(container.querySelector('svg')), nom).toBe(true);
      unmount();
    }
  });

  for (const skin of SKINS) {
    it(`les dix-huit couvre-chefs se dessinent (${skin}), vifs et morts, aux deux tailles`, () => {
      for (let numero = 1; numero <= 18; numero++) {
        for (const taille of [72, 40] as const) {
          for (const mort of [false, true]) {
            const { container, unmount } = render(<CouvreChef numero={numero} taille={taille} skin={skin} mort={mort} />);
            const svg = container.querySelector('svg');
            expect(dessine(svg), `siège ${String(numero)}`).toBe(true);
            expect(svg).toHaveAttribute('aria-hidden', 'true');
            referencesResolues(container);
            unmount();
          }
        }
      }
    });
  }

  it('dix-huit silhouettes distinctes, et les coiffes du district aux six premiers sièges', () => {
    const dessin = (x: HTMLElement) => sansIds(x.innerHTML.replace(/data-couvre-chef="\d+"/, ''));
    const rendus = new Set<string>();
    for (let numero = 1; numero <= 18; numero++) {
      const { container, unmount } = render(<CouvreChef numero={numero} />);
      rendus.add(dessin(container));
      unmount();
    }
    expect(rendus.size).toBe(18);
    const { container: a } = render(<CouvreChef numero={3} skin="thiercelieux" />);
    const { container: b } = render(<CouvreChef numero={3} skin="shiganshina" />);
    expect(dessin(a)).not.toBe(dessin(b));
  });

  it('les hachures des couvre-chefs suivent le tirage', () => {
    const { container: a } = render(<CouvreChef numero={1} tirage="papier" />);
    const { container: b } = render(<CouvreChef numero={1} tirage="cuivre" />);
    expect(a.innerHTML).toContain('url(#hach-3-e)');
    expect(b.innerHTML).toContain('url(#hach-3-v)');
  });
});

describe('vignettes, frontispice, décor', () => {
  beforeEach(() => {
    reglerSkin('thiercelieux');
  });

  it('les dix-huit vignettes du récit se dessinent, à 96 et à 192', () => {
    expect(NOMS_VIGNETTES).toHaveLength(18);
    // La liste écrite à la main (le module des tracés est chargé à part) suit celle du générateur.
    expect([...NOMS_VIGNETTES]).toEqual(Object.keys(VIGNETTES));
    for (const nom of NOMS_VIGNETTES) {
      for (const taille of [96, 192] as const) {
        const { container, unmount } = render(<Vignette nom={nom} taille={taille} />);
        expect(dessine(container.querySelector('svg')), nom).toBe(true);
        referencesResolues(container);
        unmount();
      }
    }
  });

  it('une vignette inconnue laisse sa place vide', () => {
    const { container } = render(<Vignette nom="licorne" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '96');
    expect(dessine(container.querySelector('svg'))).toBe(false);
  });

  it('le frontispice du recueil grave la légende d’accueil du skin sur le pupitre', () => {
    const { container } = render(<Frontispice format="bandeau" />);
    const lignes = deuxLignes(voixDuSkin('thiercelieux').legendeEcran('accueil'));
    for (const ligne of lignes) expect(container.textContent).toContain(ligne);
    referencesResolues(container);
  });

  it('les frontispices de l’accueil : bandeau aux yeux et portrait', () => {
    for (const props of [{ format: 'bandeau', motif: 'yeux' }, { format: 'portrait' }] as const) {
      const { container, unmount } = render(<Frontispice {...props} libelle="Le dormeur" />);
      expect(dessine(screen.getByRole('img', { name: 'Le dormeur' }))).toBe(true);
      referencesResolues(container);
      unmount();
    }
  });

  it('deuxLignes coupe au plus près du milieu, sans guillemets', () => {
    expect(deuxLignes('« Le sommeil de la raison engendre des loups. »')).toEqual([
      'Le sommeil de la raison',
      'engendre des loups.',
    ]);
    expect(deuxLignes('Seul')).toEqual(['Seul']);
  });

  it('le décor ne rend plus que le fond de matière, caché des lecteurs d’écran', () => {
    const moments: Moment[] = ['salon', 'nuit', 'aube', 'jour', 'fin'];
    for (const moment of moments) {
      const { container, unmount } = render(<Decor moment={moment} />);
      const decor = container.querySelector(`[data-decor="${moment}"]`);
      expect(decor).toHaveAttribute('aria-hidden', 'true');
      expect(decor?.querySelector('rect[fill="url(#verge)"]')).not.toBeNull();
      unmount();
    }
  });
});
