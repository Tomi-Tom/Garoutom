/* @vitest-environment jsdom */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import textures from '../../../../../docs/design/caprices/textures.svg?raw';

import { APPUI_ARMEMENT_MS, ARMEMENT_CONFIRMATION_MS, LECTURE_MAX_MS, MORSURE } from '../../anim/tokens.js';
import { regler, relireReglages } from '../../lib/reglages.js';
import { AppuiLong } from './AppuiLong.js';
import { BarrePouce } from './BarrePouce.js';
import { Bouton } from './Bouton.js';
import { Cartouche } from './Cartouche.js';
import { Cuvette } from './Cuvette.js';
import { Frise } from './Frise.js';
import { Gabarit, HAUTEURS_FIL_TIERS, HAUTEURS_ZONES } from './Gabarit.js';
import { Matieres } from './Matieres.js';
import { Pli } from './Pli.js';
import { heureDe, tirageDe, useTirage } from './useTirage.js';

/** Les zones d'un gabarit, dans l'ordre du DOM, avec leur hauteur déclarée. */
function zones(conteneur: HTMLElement): [string, string][] {
  return [...conteneur.querySelectorAll<HTMLElement>('[data-zone]')].map((zone) => [
    zone.dataset['zone'] ?? '?',
    zone.style.getPropertyValue('--zone-h'),
  ]);
}

const VIDE = {
  frise: null,
  minuterie: null,
  crieur: null,
  consigne: null,
  place: null,
  resume: null,
  pli: null,
  barre: null,
};

describe('<Gabarit /> — la loi N1 en pixels', () => {
  it('pose les huit zones aux hauteurs du § 7.1, même vides', () => {
    const { container } = render(<Gabarit {...VIDE} />);
    expect(zones(container)).toEqual([
      ['frise', '56px'],
      ['minuterie', '24px'],
      ['crieur', '56px'],
      ['consigne', '72px'],
      ['place', '415px'],
      ['resume', '24px'],
      ['pli', '44px'],
      ['barre', '72px'],
    ]);
    // 47 de barre système + 34 d'indicateur d'accueil : 844 au total.
    const total = Object.values(HAUTEURS_ZONES).reduce((a, b) => a + b, 0);
    expect(47 + total + 34).toBe(844);
  });

  it('dormeur, acteur, mort : le même arbre de zones aux mêmes hauteurs', () => {
    const dormeur = render(
      <Gabarit {...VIDE} consigne={<p>Dormez : d’autres veillent pour vous.</p>} pli={<span>Le registre</span>} />,
    );
    const acteur = render(
      <Gabarit
        {...VIDE}
        minuterie={<span>0:41</span>}
        consigne={<p>Choisissez votre proie.</p>}
        resume={<span>Votre choix : Fanny</span>}
        pli={<span>La meute · 1</span>}
        barre={<button type="button">Dévorer Fanny</button>}
      />,
    );
    const mort = render(<Gabarit {...VIDE} consigne={<p>Tout voir, enfin, et trop tard.</p>} />);
    expect(zones(acteur.container)).toEqual(zones(dormeur.container));
    expect(zones(mort.container)).toEqual(zones(dormeur.container));
  });

  it('fil au tiers : crieur et consigne sur 40, la place à 315, le fil à 232 à la place du pli', () => {
    const { container } = render(<Gabarit {...VIDE} colonne={<p>Le fil</p>} filOuvert="tiers" />);
    expect(container.querySelector('.gabarit')).toHaveAttribute('data-fil', 'tiers');
    expect(Object.fromEntries(zones(container))).toMatchObject({
      crieur: '40px',
      consigne: '0px',
      place: '315px',
      pli: '0px',
      colonne: '232px',
    });
    const somme = Object.entries(HAUTEURS_FIL_TIERS).reduce((a, [, b]) => a + b, 0);
    expect(47 + somme + 34).toBe(844);
  });

  it('sans colonne, pas de fil à ouvrir : le gabarit reste fermé', () => {
    const { container } = render(<Gabarit {...VIDE} filOuvert="plein" />);
    expect(container.querySelector('.gabarit')).toHaveAttribute('data-fil', 'ferme');
    expect(container.querySelector('[data-zone="colonne"]')).toBeNull();
  });
});

/** Un écran qui montre un secret tant que l'appui long le dit. */
function Secret({ dureeMs }: { dureeMs?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      {visible && <p>Vous êtes la Voyante.</p>}
      <AppuiLong
        libelle="Gardez le pouce : ma carte"
        dureeMs={dureeMs}
        onDebut={() => setVisible(true)}
        onFin={() => setVisible(false)}
      />
    </>
  );
}

describe('<AppuiLong /> — visible seulement pouce posé', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  const bouton = () => screen.getByRole('button', { name: 'Gardez le pouce : ma carte' });

  it("s'arme 600 ms, montre tant que le pouce est posé, recache au relâchement", () => {
    render(<Secret />);
    fireEvent.pointerDown(bouton(), { button: 0, pointerId: 1 });
    expect(bouton()).toHaveAttribute('data-etat', 'armement');
    act(() => vi.advanceTimersByTime(APPUI_ARMEMENT_MS - 1));
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    expect(bouton()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.pointerUp(bouton(), { pointerId: 1 });
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
    expect(bouton()).toHaveAttribute('data-etat', 'repos');
  });

  it("relâché pendant l'armement : rien n'a paru, rien ne se recache", () => {
    const onDebut = vi.fn();
    const onFin = vi.fn();
    render(<AppuiLong libelle="Gardez le pouce : ma carte" onDebut={onDebut} onFin={onFin} />);
    fireEvent.pointerDown(bouton(), { button: 0 });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerUp(bouton());
    act(() => vi.advanceTimersByTime(LECTURE_MAX_MS));
    expect(onDebut).not.toHaveBeenCalled();
    expect(onFin).not.toHaveBeenCalled();
  });

  it("recache quand l'onglet passe derrière (visibilitychange)", () => {
    render(<Secret />);
    fireEvent.pointerDown(bouton(), { button: 0 });
    act(() => vi.advanceTimersByTime(APPUI_ARMEMENT_MS));
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
  });

  it('recache au bout de dureeMs (8 s par défaut), pouce toujours posé', () => {
    render(<Secret />);
    fireEvent.pointerDown(bouton(), { button: 0 });
    act(() => vi.advanceTimersByTime(APPUI_ARMEMENT_MS + LECTURE_MAX_MS - 1));
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
  });

  it('au clavier : Espace tenu fait le même geste', () => {
    render(<Secret />);
    fireEvent.keyDown(bouton(), { key: ' ' });
    act(() => vi.advanceTimersByTime(APPUI_ARMEMENT_MS));
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    // La répétition de la touche tenue ne relance rien.
    fireEvent.keyDown(bouton(), { key: ' ', repeat: true });
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    fireEvent.keyUp(bouton(), { key: ' ' });
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
  });

  it('au clavier : Entrée ouvre une lecture de dureeMs au plus', () => {
    render(<Secret dureeMs={3_000} />);
    fireEvent.keyDown(bouton(), { key: 'Enter' });
    expect(screen.getByText('Vous êtes la Voyante.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.queryByText('Vous êtes la Voyante.')).toBeNull();
  });
});

describe('<Bouton /> — l’armement en deux temps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('le premier toucher arme, le second dans les 4 s confirme', () => {
    const onConfirmer = vi.fn();
    render(
      <Bouton variante="primaire" arme={{ libelle: 'Confirmer : Anna à la potence', onConfirmer }}>
        Voter contre Anna
      </Bouton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Voter contre Anna' }));
    expect(onConfirmer).not.toHaveBeenCalled();
    const arme = screen.getByRole('button', { name: 'Confirmer : Anna à la potence' });
    expect(arme).toHaveAttribute('data-arme');
    expect(arme.querySelectorAll('.bouton-visee')).toHaveLength(4);
    act(() => vi.advanceTimersByTime(ARMEMENT_CONFIRMATION_MS - 1));
    fireEvent.click(arme);
    expect(onConfirmer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Voter contre Anna' })).not.toHaveAttribute('data-arme');
  });

  it('au bout de 4 s sans second toucher, il se désarme', () => {
    const onConfirmer = vi.fn();
    render(
      <Bouton variante="secondaire" arme={{ libelle: 'Confirmer l’abstention', onConfirmer }}>
        S’abstenir
      </Bouton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'S’abstenir' }));
    act(() => vi.advanceTimersByTime(ARMEMENT_CONFIRMATION_MS));
    const repos = screen.getByRole('button', { name: 'S’abstenir' });
    expect(repos).not.toHaveAttribute('data-arme');
    // Le toucher suivant réarme : il ne confirme pas.
    fireEvent.click(repos);
    expect(onConfirmer).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmer l’abstention' })).toHaveAttribute('data-arme');
  });

  it('Échap désarme', () => {
    render(
      <Bouton variante="danger" arme={{ libelle: 'Oui, quitter', onConfirmer: () => {} }}>
        Quitter
      </Bouton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Oui, quitter' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Quitter' })).not.toHaveAttribute('data-arme');
  });

  it('sans armement, un clic agit tout de suite', () => {
    const onClick = vi.fn();
    render(
      <Bouton variante="secondaire" onClick={onClick}>
        Changer
      </Bouton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Changer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Changer' })).toHaveClass('bouton', 'bouton-secondaire');
  });

  it('éteint dans la barre : relié à la raison, jamais armé', () => {
    const onConfirmer = vi.fn();
    render(
      <BarrePouce raison="La grâce vous a coûté votre voix.">
        <Bouton variante="primaire" disabled arme={{ libelle: 'Confirmer', onConfirmer }}>
          Voter
        </Bouton>
      </BarrePouce>,
    );
    const voter = screen.getByRole('button', { name: 'Voter' });
    expect(voter).toHaveAccessibleDescription('La grâce vous a coûté votre voix.');
    fireEvent.click(voter);
    expect(voter).not.toHaveAttribute('data-arme');
    expect(onConfirmer).not.toHaveBeenCalled();
  });
});

describe('<BarrePouce />, <Pli />, <Cartouche />, <Cuvette />', () => {
  it('la barre est un groupe « Votre action »', () => {
    render(
      <BarrePouce>
        <Bouton variante="secondaire">S’abstenir</Bouton>
        <Bouton variante="primaire">Voter contre Anna</Bouton>
      </BarrePouce>,
    );
    const groupe = screen.getByRole('group', { name: 'Votre action' });
    expect(groupe).toHaveClass('barre-pouce');
    expect(groupe).not.toHaveAttribute('data-raison');
  });

  it('le pli : cartouche du canal, compteur, ouverture', () => {
    const onOuvrir = vi.fn();
    render(<Pli libelle="Le village" compte={3} onOuvrir={onOuvrir} />);
    const pli = screen.getByRole('button', { name: /Le village/ });
    expect(pli).toHaveTextContent('Le village· 3');
    expect(pli.querySelector('.cartouche')).toHaveAttribute('data-forme', 'ecu');
    fireEvent.click(pli);
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it('chaque forme de cartouche porte son mot et son tracé', () => {
    const { container } = render(
      <>
        <Cartouche forme="ecu">Villageois·e</Cartouche>
        <Cartouche forme="mordu">Loup-garou</Cartouche>
        <Cartouche forme="seul">Seul</Cartouche>
        <Cartouche forme="lacs" taille={20}>
          Le serment
        </Cartouche>
        <Cartouche forme="bruni">L’au-delà</Cartouche>
        <Cartouche forme="neutre">Carte cachée</Cartouche>
      </>,
    );
    const formes = [...container.querySelectorAll<HTMLElement>('.cartouche')].map((c) => [
      c.dataset['forme'],
      c.textContent,
    ]);
    expect(formes).toEqual([
      ['ecu', 'Villageois·e'],
      ['mordu', 'Loup-garou'],
      ['seul', 'Seul'],
      ['lacs', 'Le serment'],
      ['bruni', 'L’au-delà'],
      ['neutre', 'Carte cachée'],
    ]);
    expect(container.querySelector('[data-forme="lacs"]')).toHaveAttribute('data-taille', '20');
    expect(container.querySelectorAll('[data-forme="lacs"] rect')).toHaveLength(2);
    expect(container.querySelector('[data-forme="neutre"] ellipse')).toHaveAttribute('stroke-dasharray', '3 3');
    expect(container.querySelector('[data-forme="bruni"] path')).toHaveAttribute('stroke-dasharray', '1.5 3');
    // Le mordu a ses dents : plus de sommets qu'un écu.
    const sommets = (forme: string) =>
      (container.querySelector(`[data-forme="${forme}"] path`)?.getAttribute('d') ?? '').split('L').length;
    expect(sommets('mordu')).toBeGreaterThan(sommets('ecu'));
    expect(sommets('seul')).toBeGreaterThan(sommets('mordu'));
  });

  it('la cuvette porte son numéro de planche', () => {
    const { container } = render(
      <Cuvette numero="4" className="p-3">
        <p>la Sorcière</p>
      </Cuvette>,
    );
    expect(container.firstChild).toHaveClass('cuvette', 'p-3');
    expect(container.querySelector('.cuvette-numero')).toHaveTextContent('4');
  });
});

describe('<Frise />', () => {
  it("l'heure au milieu de ses cartouches, les toits de Thiercelieux par défaut", () => {
    const { container } = render(
      <Frise titre="Nuit II" gauche={<a href="/">Retour</a>} droite={<button type="button">Menu</button>} />,
    );
    const frise = container.querySelector('header.frise');
    expect(frise).toHaveAttribute('data-decor', 'toits');
    expect(screen.getByText('Nuit II')).toHaveClass('t-heure');
    expect(frise?.querySelector('.frise-gauche')).toHaveTextContent('Retour');
    expect(frise?.querySelector('.frise-droite')).toHaveTextContent('Menu');
    // Le décor est muet : aucun mot ne passe par lui.
    expect(frise?.querySelector('svg.frise-decor')).toHaveAttribute('aria-hidden', 'true');
    expect(frise?.querySelectorAll('svg.frise-decor path').length).toBeGreaterThan(20);
  });

  it('Shiganshina : le Mur, et la tête du Colosse pour la nuit seulement', () => {
    const { container } = render(<Frise titre="Jour III" skin="shiganshina" />);
    expect(container.querySelector('header.frise')).toHaveAttribute('data-decor', 'mur');
    expect(container.querySelectorAll('.frise-nuit-seule')).toHaveLength(2);
  });

  it('Gilets Jaunes : le rond-point, et les gyrophares pour la nuit seulement', () => {
    const { container } = render(<Frise titre="Jour III" skin="giletsjaunes" />);
    expect(container.querySelector('header.frise')).toHaveAttribute('data-decor', 'rondpoint');
    expect(container.querySelectorAll('.frise-nuit-seule').length).toBeGreaterThan(0);
  });

  it('Far West : la rue du bourg, la lune pour la nuit seulement — et la veilleuse toujours', () => {
    const { container } = render(<Frise titre="Jour III" skin="farwest" />);
    expect(container.querySelector('header.frise')).toHaveAttribute('data-decor', 'rue');
    expect(container.querySelectorAll('.frise-nuit-seule')).toHaveLength(1);
  });
});

describe('<Matieres />', () => {
  it('porte une seule fois les <defs> de textures.svg, identifiants inchangés', () => {
    const { container } = render(<Matieres />);
    const svg = container.querySelector('svg[data-testid="matieres"]');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    const ids = [...textures.matchAll(/<(?:pattern|filter|symbol|mask)\s+id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(30);
    for (const id of ids) expect(svg?.querySelector(`[id="${id ?? ''}"]`), id).not.toBeNull();
    for (const id of ['lf-barre-v', 'lf-hachx-p2', 'lf-hach-1-p2']) expect(svg?.querySelector(`#${id}`)).not.toBeNull();
    expect(container.querySelector('.voile-bascule')).toHaveAttribute('aria-hidden', 'true');
  });

  it('en tuiles (mobile, défaut) : mêmes identifiants, aucun bruit calculé ; en direct : les filtres d’origine', () => {
    const tuiles = render(<Matieres mode="tuiles" />).container.querySelector('svg[data-testid="matieres"]');
    expect(tuiles).toHaveAttribute('data-mode', 'tuiles');
    expect(tuiles?.querySelector('feTurbulence')).toBeNull();
    for (const id of ['aqua-I', 'aqua-II', 'aqua-III', 'aqua-IV', 'papier', 'mordu', 'mordu-fin']) {
      const filtre = tuiles?.querySelector(`filter[id="${id}"]`);
      expect(filtre, id).not.toBeNull();
      expect(filtre?.querySelector('feImage'), id).not.toBeNull();
    }
    expect(tuiles?.querySelector('filter[id="mordu"] feDisplacementMap')).not.toBeNull();

    const direct = render(<Matieres mode="direct" />).container.querySelector('svg[data-testid="matieres"]');
    expect(direct?.querySelector('filter[id="aqua-IV"] feTurbulence')).not.toBeNull();
  });
});

describe('useTirage() — papier le jour, cuivre la nuit', () => {
  beforeEach(() => {
    localStorage.clear();
    relireReglages();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("l'heure publique choisit le tirage, jamais le rôle", () => {
    expect(tirageDe('nuit', 'papier')).toBe('cuivre');
    expect(tirageDe('revelation', 'papier')).toBe('cuivre');
    for (const phase of ['election', 'jour', 'chasseur', 'succession', 'bouc', 'fin'] as const) {
      expect(tirageDe(phase, 'papier')).toBe('papier');
      expect(heureDe(phase)).toBe('jour');
      // Le réglage « Cuivre » garde le tirage de nuit, à toute heure.
      expect(tirageDe(phase, 'cuivre')).toBe('cuivre');
    }
    expect(tirageDe(null, 'papier')).toBe('papier');
    expect(heureDe('nuit')).toBe('nuit');
  });

  it('pose data-tirage et data-heure sur <html>, et les retire démonté', () => {
    const { rerender, unmount } = renderHook(({ phase }) => useTirage(phase), {
      initialProps: { phase: 'nuit' as 'nuit' | 'jour' },
    });
    const racine = document.documentElement;
    expect(racine).toHaveAttribute('data-tirage', 'cuivre');
    expect(racine).toHaveAttribute('data-heure', 'nuit');
    rerender({ phase: 'jour' });
    expect(racine).toHaveAttribute('data-tirage', 'papier');
    expect(racine).toHaveAttribute('data-heure', 'jour');
    act(() => regler({ tirage: 'cuivre' }));
    expect(racine).toHaveAttribute('data-tirage', 'cuivre');
    expect(racine).toHaveAttribute('data-heure', 'jour');
    unmount();
    expect(racine).not.toHaveAttribute('data-tirage');
    expect(racine).not.toHaveAttribute('data-heure');
  });

  it("l'aube et la tombée de la nuit se jouent en quatre paliers, 320 ms", () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(({ phase }) => useTirage(phase), {
      initialProps: { phase: 'nuit' as 'nuit' | 'jour' },
    });
    const racine = document.documentElement;
    expect(racine).not.toHaveAttribute('data-bascule');
    rerender({ phase: 'jour' });
    expect(racine).toHaveAttribute('data-bascule', 'aube');
    act(() => vi.advanceTimersByTime(MORSURE.duree));
    expect(racine).not.toHaveAttribute('data-bascule');
    rerender({ phase: 'nuit' });
    expect(racine).toHaveAttribute('data-bascule', 'morsure');
  });

  it('sous le réglage « Cuivre », l’aube ne joue pas de théâtre', () => {
    regler({ tirage: 'cuivre' });
    const { rerender } = renderHook(({ phase }) => useTirage(phase), {
      initialProps: { phase: 'nuit' as 'nuit' | 'jour' },
    });
    rerender({ phase: 'jour' });
    expect(document.documentElement).not.toHaveAttribute('data-bascule');
  });
});

describe('<AppuiLong libelleCourt />', () => {
  it('porte les deux libellés, garde le long pour nom accessible, et le court ne se lit pas deux fois', () => {
    render(<AppuiLong libelle="Gardez le pouce : ma carte" libelleCourt="Ma carte" onDebut={() => {}} onFin={() => {}} />);
    const bouton = screen.getByRole('button', { name: 'Gardez le pouce : ma carte' });
    expect(bouton).toHaveAttribute('data-libelle-court');
    expect(bouton.querySelector('.appui-libelle-long')).toHaveTextContent('Gardez le pouce : ma carte');
    const court = bouton.querySelector('.appui-libelle-court');
    expect(court).toHaveTextContent('Ma carte');
    expect(court).toHaveAttribute('aria-hidden', 'true');
  });

  it('sans libellé court, rien ne change', () => {
    render(<AppuiLong libelle="Gardez le pouce : ma carte" onDebut={() => {}} onFin={() => {}} />);
    const bouton = screen.getByRole('button', { name: 'Gardez le pouce : ma carte' });
    expect(bouton).not.toHaveAttribute('data-libelle-court');
    expect(bouton).not.toHaveAttribute('aria-label');
  });
});
