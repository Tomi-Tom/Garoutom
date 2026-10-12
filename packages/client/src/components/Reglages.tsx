/**
 * Le bouton engrenage et son panneau de préférences locales.
 *
 * Tout ce qui est réglé ici reste dans ce navigateur (`lib/reglages.ts`) :
 * le serveur n'en sait rien, et la table non plus.
 */

import { useVolume } from '@tombp/arcade';
import { useRef, useState, type KeyboardEvent } from 'react';

import { useReglages, type Reglages } from '../lib/reglages.js';
import { Interrupteur } from './Interrupteur.js';
import { Panneau } from './Panneau.js';

export function BoutonReglages({ className }: { className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Réglages"
        aria-haspopup="dialog"
        title="Réglages"
        className={`btn-voisin grid size-11 shrink-0 place-items-center rounded-lg ${className ?? ''}`}
        // `.btn-voisin` porte un rembourrage horizontal hors des couches de
        // Tailwind : un utilitaire `p-0` ne l'emporterait pas, et l'icône
        // s'écrasait en un point dans ses 44 px.
        style={{ padding: 0 }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
        </svg>
      </button>
      {ouvert && <PanneauReglages onFermer={() => setOuvert(false)} />}
    </>
  );
}

function PanneauReglages({ onFermer }: { onFermer: () => void }) {
  const { animations, minuterie, grandTexte, filOuvert, vibrations, tirage, regler } = useReglages();
  const son = useVolume();
  const pourcent = Math.round(son.volume * 100);

  return (
    <Panneau titre="Réglages" onFermer={onFermer} testid="panneau-reglages">
      <p className="mb-4 text-xs" style={{ color: 'var(--papier-doux)' }}>
        Ces préférences restent sur cet appareil : la table ne les voit pas.
      </p>
      <div className="flex flex-col gap-3">
        <ChoixTirage tirage={tirage} onChoisir={(choix) => regler({ tirage: choix })} />

        <div
          className="flex flex-col gap-1.5 rounded-lg p-3"
          style={{ boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}
        >
          <label htmlFor="reglage-volume" className="flex items-baseline justify-between text-sm font-bold">
            Volume
            <span className="font-mono text-xs font-normal" style={{ color: 'var(--papier-doux)' }}>
              {son.coupe ? 'coupé' : `${String(pourcent)} %`}
            </span>
          </label>
          <input
            id="reglage-volume"
            type="range"
            min={0}
            max={100}
            step={5}
            value={pourcent}
            onChange={(evenement) => son.regler(Number(evenement.target.value) / 100)}
            aria-valuetext={son.coupe ? 'coupé' : `${String(pourcent)} pour cent`}
            className="h-11 w-full accent-[var(--lanterne)]"
          />
          <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
            À zéro, le son est coupé : hurlements, glas et bruitages se taisent.
          </span>
        </div>

        <Interrupteur
          id="reglage-animations"
          label="Animations réduites"
          hint="Moins de mouvement à l’écran. Sans cela, on suit le réglage de votre appareil."
          checked={animations === 'reduites'}
          onToggle={(actif) => regler({ animations: actif ? 'reduites' : 'systeme' })}
        />
        <Interrupteur
          id="reglage-minuterie"
          label="Minuterie discrète"
          hint={
            minuterie === 'discrete'
              ? 'Un simple compte de secondes, qui ne s’agite que dans les trente dernières.'
              : 'Une barre toujours visible qui se vide jusqu’à l’échéance.'
          }
          checked={minuterie === 'discrete'}
          onToggle={(actif) => regler({ minuterie: actif ? 'discrete' : 'barre' })}
        />
        <Interrupteur
          id="reglage-grand-texte"
          label="Grand texte"
          hint="Agrandit tous les textes, pour lire de loin, téléphone posé sur la table."
          checked={grandTexte}
          onToggle={(actif) => regler({ grandTexte: actif })}
        />
        <Interrupteur
          id="reglage-fil"
          label="Fil ouvert sur mobile"
          hint="Le fil de discussion s’ouvre déplié plutôt que replié, sur un petit écran."
          checked={filOuvert}
          onToggle={(actif) => regler({ filOuvert: actif })}
        />
        <Interrupteur
          id="reglage-vibrations"
          label="Vibrations"
          hint="Le téléphone vibre quand c’est à vous de jouer, si l’appareil le permet."
          checked={vibrations}
          onToggle={(actif) => regler({ vibrations: actif })}
        />
      </div>
    </Panneau>
  );
}

const CHOIX_TIRAGE: readonly { valeur: Reglages['tirage']; nom: string; note: string }[] = [
  { valeur: 'papier', nom: 'Papier', note: 'par défaut' },
  { valeur: 'cuivre', nom: 'Cuivre', note: 'la nuit, jour compris' },
];

/**
 * « Le jour s'imprime sur : Papier · Cuivre » (SPEC Caprices § 3.2).
 *
 * Deux vignettes, chacune tirée dans son propre tirage (`data-tirage` posé
 * sur la vignette) : on voit ce qu'on choisit. Le choix ne touche jamais la
 * nuit, toujours sur cuivre pour tout le monde. Un groupe radio : une seule
 * cible de tabulation, les flèches passent d'un tirage à l'autre.
 */
function ChoixTirage({ tirage, onChoisir }: { tirage: Reglages['tirage']; onChoisir: (choix: Reglages['tirage']) => void }) {
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const surTouche = (evenement: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pas =
      evenement.key === 'ArrowRight' || evenement.key === 'ArrowDown'
        ? 1
        : evenement.key === 'ArrowLeft' || evenement.key === 'ArrowUp'
          ? -1
          : 0;
    if (pas === 0) return;
    evenement.preventDefault();
    const suivant = (index + pas + CHOIX_TIRAGE.length) % CHOIX_TIRAGE.length;
    const choix = CHOIX_TIRAGE[suivant];
    if (choix === undefined) return;
    onChoisir(choix.valeur);
    boutons.current[suivant]?.focus();
  };

  return (
    <div>
      <p id="reglage-tirage" className="t-rubrique mb-1.5" style={{ color: 'var(--encre-2)' }}>
        Le jour s’imprime sur
      </p>
      <div role="radiogroup" aria-labelledby="reglage-tirage" className="flex gap-2">
        {CHOIX_TIRAGE.map(({ valeur, nom, note }, index) => {
          const coche = tirage === valeur;
          return (
            <button
              key={valeur}
              ref={(el) => {
                boutons.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={coche}
              tabIndex={coche ? 0 : -1}
              onClick={() => onChoisir(valeur)}
              onKeyDown={(evenement) => surTouche(evenement, index)}
              className="flex min-w-0 flex-1 flex-col text-left"
              style={{
                background: 'transparent',
                border: coche ? '1.5px solid var(--filet)' : '1px solid var(--filet-doux)',
                color: 'var(--encre)',
              }}
            >
              {/* La vignette : une frise en miniature, dans son tirage. */}
              <span
                aria-hidden="true"
                data-tirage={valeur}
                className="block h-14 p-px"
                style={{ background: valeur === 'cuivre' ? undefined : 'var(--fond)' }}
              >
                <span
                  className={`flex h-full items-end px-2 pb-1.5 ${valeur === 'cuivre' ? 'aqua-IV' : 'hach-h'}`}
                >
                  <span
                    className="t-heure px-2"
                    style={{ background: 'var(--surface)', border: '1px solid var(--filet-doux)', color: 'var(--encre)' }}
                  >
                    Jour II
                  </span>
                </span>
              </span>
              <span
                className="flex items-center gap-2 px-2 py-1.5"
                style={{ borderTop: coche ? '1px solid var(--filet)' : '1px solid var(--filet-doux)' }}
              >
                <CaseGravee cochee={coche} />
                <span className="block min-w-0">
                  <span className="block text-[15px] leading-5 font-semibold">{nom}</span>
                  <span className="t-statut block">{note}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** La case gravée (§ 5.17) : un carré de 24, filet 1,5 ; cochée, une croix de deux traits. */
function CaseGravee({ cochee }: { cochee: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="flex-none">
      <rect x=".75" y=".75" width="22.5" height="22.5" fill="var(--surface)" stroke="var(--encre)" strokeWidth="1.5" />
      {cochee && (
        <path d="M6.2 6 L17.8 18.1 M17.9 6.1 L6.1 17.9" stroke="var(--encre)" strokeWidth="2" strokeLinecap="square" />
      )}
    </svg>
  );
}
