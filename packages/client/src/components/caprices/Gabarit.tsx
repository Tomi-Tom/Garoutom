/**
 * Le gabarit unique de l'écran de partie (SPEC § 7.1) — la loi N1 en pixels.
 *
 * Mobile 390 × 844, jour et nuit, tous les sièges (acteur, dormeur, mort,
 * spectateur) : les mêmes zones aux mêmes hauteurs. Ce qui change d'un
 * siège à l'autre, c'est le texte dans les zones — jamais leur place. Une
 * zone vide garde donc sa hauteur : la nuit, rien ne bouge d'une ligne.
 *
 * | zone      | hauteur | contenu                                      |
 * |-----------|---------|----------------------------------------------|
 * | frise     | 56      | l'en-tête (§ 5.7)                            |
 * | minuterie | 24      | toujours présente, même absente (§ 5.6)      |
 * | crieur    | 56      | la dernière annonce (§ 5.8)                  |
 * | consigne  | 72      | la consigne, ou la légende du moment         |
 * | place     | 415     | 8 + 399 utiles + 8 (§ 5.16) — le reste       |
 * | résumé    | 24      | « Votre voix : Anna · 7 sur 11 », ou vide    |
 * | pli       | 44      | la poignée du fil (§ 5.14)                   |
 * | barre     | 72      | la barre au pouce (§ 5.5)                    |
 *
 * La barre système et l'indicateur d'accueil sont les marges sûres de
 * l'appareil (`env(safe-area-inset-*)`).
 *
 * Fil ouvert **au tiers** : le crieur et la consigne se replient en une
 * ligne de 40, la place passe en D4 (315), le fil prend 232 à la place du
 * pli. **Plein écran** : le fil couvre la place, le résumé et le pli.
 *
 * Desktop 1440 × 900 : frise de 64 sur toute la largeur (la minuterie
 * dedans), crieur au-dessus de la place, `colonne` de 340 à droite (le fil
 * le jour ; la nuit, la même colonne pour tous), et le **pupitre** — la
 * consigne, le résumé et la barre — au centre de la place.
 */

import type { CSSProperties, ReactNode } from 'react';

export type ZoneGabarit = 'frise' | 'minuterie' | 'crieur' | 'consigne' | 'place' | 'resume' | 'pli' | 'colonne' | 'barre';

export type FilOuvert = 'ferme' | 'tiers' | 'plein';

/** Les hauteurs du gabarit mobile, fil fermé (ou plein : il se pose par-dessus). */
export const HAUTEURS_ZONES: Readonly<Record<Exclude<ZoneGabarit, 'colonne'>, number>> = {
  frise: 56,
  minuterie: 24,
  crieur: 56,
  consigne: 72,
  place: 415,
  resume: 24,
  pli: 44,
  barre: 72,
};

/** Fil ouvert au tiers : crieur et consigne sur une ligne de 40, le fil à la place du pli. */
export const HAUTEURS_FIL_TIERS: Readonly<Record<ZoneGabarit, number>> = {
  ...HAUTEURS_ZONES,
  crieur: 40,
  consigne: 0,
  place: 315,
  pli: 0,
  colonne: 232,
};

/** Le haut du fil plein écran : sous la frise, la minuterie, le crieur et la consigne. */
const HAUT_FIL_PLEIN =
  HAUTEURS_ZONES.frise + HAUTEURS_ZONES.minuterie + HAUTEURS_ZONES.crieur + HAUTEURS_ZONES.consigne;

function Zone({ nom, hauteur, children }: { nom: ZoneGabarit; hauteur: number; children: ReactNode }) {
  return (
    <div className="gabarit-zone" data-zone={nom} style={{ '--zone-h': `${String(hauteur)}px` } as CSSProperties}>
      {children}
    </div>
  );
}

export function Gabarit({
  frise,
  minuterie,
  crieur,
  consigne,
  place,
  resume,
  pli,
  barre,
  colonne,
  filOuvert = 'ferme',
}: {
  frise: ReactNode;
  minuterie: ReactNode;
  crieur: ReactNode;
  consigne: ReactNode;
  place: ReactNode;
  resume: ReactNode;
  pli: ReactNode;
  barre: ReactNode;
  /** Desktop : la colonne droite (fil / registre). Mobile : le fil, quand il est ouvert. */
  colonne?: ReactNode;
  filOuvert?: FilOuvert;
}) {
  // Sans colonne, il n'y a pas de fil à ouvrir : le gabarit reste fermé.
  const fil: FilOuvert = colonne === undefined ? 'ferme' : filOuvert;
  const h = fil === 'tiers' ? HAUTEURS_FIL_TIERS : { ...HAUTEURS_ZONES, colonne: 0 };
  return (
    <div
      className="gabarit"
      data-fil={fil}
      data-colonne={colonne === undefined ? undefined : ''}
      style={{ '--fil-plein-haut': `calc(${String(HAUT_FIL_PLEIN)}px + env(safe-area-inset-top, 0px))` } as CSSProperties}
    >
      <Zone nom="frise" hauteur={h.frise}>
        {frise}
      </Zone>
      <Zone nom="minuterie" hauteur={h.minuterie}>
        {minuterie}
      </Zone>
      <Zone nom="crieur" hauteur={h.crieur}>
        {crieur}
      </Zone>
      <Zone nom="consigne" hauteur={h.consigne}>
        {consigne}
      </Zone>
      <Zone nom="place" hauteur={h.place}>
        {place}
      </Zone>
      <Zone nom="resume" hauteur={h.resume}>
        {resume}
      </Zone>
      <Zone nom="pli" hauteur={h.pli}>
        {pli}
      </Zone>
      {colonne !== undefined && (
        <Zone nom="colonne" hauteur={h.colonne}>
          {colonne}
        </Zone>
      )}
      <Zone nom="barre" hauteur={h.barre}>
        {barre}
      </Zone>
    </div>
  );
}
