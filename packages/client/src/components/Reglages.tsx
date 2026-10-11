/**
 * Le bouton engrenage et son panneau de préférences locales.
 *
 * Tout ce qui est réglé ici reste dans ce navigateur (`lib/reglages.ts`) :
 * le serveur n'en sait rien, et la table non plus.
 */

import { useVolume } from '@tombp/arcade';
import { useState } from 'react';

import { useReglages } from '../lib/reglages.js';
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
  const { animations, minuterie, grandTexte, filOuvert, vibrations, regler } = useReglages();
  const son = useVolume();
  const pourcent = Math.round(son.volume * 100);

  return (
    <Panneau titre="Réglages" onFermer={onFermer} testid="panneau-reglages">
      <p className="mb-4 text-xs" style={{ color: 'var(--papier-doux)' }}>
        Ces préférences restent sur cet appareil : la table ne les voit pas.
      </p>
      <div className="flex flex-col gap-3">
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
