/**
 * Le symbole gravé d'un rôle — SVG inline, un seul trait `currentColor`, à la
 * manière d'une linogravure simple (D9 : symboles en v1, l'art ensuite). Le
 * trait suit la couleur du texte : la carte l'encre en nuit, l'écran en
 * papier. Sans rôle, le motif du dos de carte (rosace et lune).
 *
 * Un skin peut graver autrement : à Shiganshina le « loup » est un crâne de
 * Titan, la rosace du dos devient la porte des remparts.
 */
import type { ReactNode } from 'react';

import type { RoleId } from '@garoutom/engine';

import { useSkinId, useVoix } from '../../lib/partie.js';

export interface SymboleRoleProps {
  role: RoleId | null;
  /** Côté en pixels. Défaut 48. */
  taille?: number;
  className?: string;
}

/** Les gravures, sur une grille de 64 × 64. */
const GRAVURES: Record<RoleId, ReactNode> = {
  // Une maison à la porte basse, la cheminée fume.
  villageois: (
    <>
      <path d="M8 32 32 12l24 20" />
      <path d="M15 27v26h34V27" />
      <path d="M28 53V39h8v14" />
      <path d="M44 20v-7h5v11" />
      <path d="M20 33h5M39 33h5" />
    </>
  ),
  // Une tête de loup, de face, les oreilles dressées.
  loup: (
    <>
      <path d="M13 12l13 11h12l13-11 3 24-17 20H27L10 36z" />
      <path d="M22 33l7 3M42 33l-7 3" />
      <path d="M28 45h8l-4 5z" />
      <path d="M32 50v5" />
    </>
  ),
  // Un œil ouvert sous trois rayons.
  voyante: (
    <>
      <path d="M5 36C15 20 49 20 59 36 49 52 15 52 5 36z" />
      <circle cx="32" cy="36" r="9" />
      <circle cx="32" cy="36" r="2.5" fill="currentColor" />
      <path d="M32 6v8M16 11l4 6M48 11l-4 6" />
    </>
  ),
  // Une fiole ventrue, son bouchon, son poison.
  sorciere: (
    <>
      <path d="M25 7h14M28 7v17L13 50c-2 4 0 7 4 7h30c4 0 6-3 4-7L36 24V7" />
      <path d="M19 43h26" />
      <circle cx="29" cy="49" r="2" />
      <circle cx="37" cy="46" r="1.5" />
    </>
  ),
  // Une cible et son viseur.
  chasseur: (
    <>
      <circle cx="32" cy="32" r="21" />
      <circle cx="32" cy="32" r="11" />
      <circle cx="32" cy="32" r="2.5" fill="currentColor" />
      <path d="M32 4v13M32 47v13M4 32h13M47 32h13" />
    </>
  ),
  // Un cœur traversé d'une flèche.
  cupidon: (
    <>
      <path d="M32 54C10 39 7 23 19 18c6-2 11 2 13 7 2-5 7-9 13-7 12 5 9 21-13 36z" />
      <path d="M6 58 58 6M58 6H47M58 6v11" />
      <path d="M6 58l1-9M6 58l9-1" />
    </>
  ),
  // Un écu, une croix en son centre.
  salvateur: (
    <>
      <path d="M32 6l21 7v19c0 14-10 22-21 27C21 54 11 46 11 32V13z" />
      <path d="M32 19v25M21 30h22" />
    </>
  ),
  // Un bonnet à trois pointes, trois grelots.
  idiot: (
    <>
      <path d="M11 47 15 24l13 12 4-20 4 20 13-12 4 23" />
      <path d="M10 47h44v7H10z" />
      <circle cx="15" cy="19" r="3.5" />
      <circle cx="32" cy="11" r="3.5" />
      <circle cx="49" cy="19" r="3.5" />
    </>
  ),

  /* --- Les rôles optionnels de la v2 : placeholders gravés, même trait --- */

  // Un sablier : le temps a endurci l'Ancien, le sable coule encore.
  ancien: (
    <>
      <path d="M17 7h30M17 57h30" />
      <path d="M21 7c0 15 22 17 22 25S21 42 21 57M43 7c0 15-22 17-22 25s22 10 22 25" />
      <path d="M26 51c3-3 9-3 12 0" />
      <path d="M32 33v6" />
    </>
  ),
  // Une plume noire, sa hampe et ses barbes : la marque du Corbeau.
  corbeau: (
    <>
      <path d="M12 58 46 10" />
      <path d="M46 10c4 13-2 26-16 34-5 3-9 4-12 7 2-13 9-31 28-41z" />
      <path d="M24 42l8-2M28 34l9-3M33 26l8-3" />
    </>
  ),
  // Une tête de bouc, les cornes recourbées, la barbiche.
  bouc: (
    <>
      <path d="M22 20c-5-9-14-10-16-2 4-2 9 0 11 6M42 20c5-9 14-10 16-2-4-2-9 0-11 6" />
      <path d="M22 18h20l-2 22-8 13-8-13z" />
      <path d="M26 29h3M35 29h3" />
      <path d="M29 45h6" />
      <path d="M32 53v7" />
    </>
  ),
  // Une porte entrouverte et le trou de serrure par où l'on regarde.
  petiteFille: (
    <>
      <path d="M12 6h40v52H12z" />
      <path d="M32 16a8 8 0 0 0-4.5 14.6L24 48h16l-3.5-17.4A8 8 0 0 0 32 16z" />
      <circle cx="32" cy="24" r="1.8" fill="currentColor" />
    </>
  ),
  // Une tête de loup sous la lune pleine : le loup qui chasse seul.
  loupBlanc: (
    <>
      <circle cx="32" cy="9" r="5" />
      <path d="M15 19l11 9h12l11-9 3 21-16 18h-8L12 40z" />
      <path d="M23 36l6 2M41 36l-6 2" />
      <path d="M28 46h8l-4 5z" />
    </>
  ),
};

/** Variantes d'un skin : seuls les rôles qui changent de visage sont listés. */
const GRAVURES_SKIN: Record<string, Partial<Record<RoleId, ReactNode>>> = {
  shiganshina: {
    // Un crâne de Titan : orbites creuses, sourire figé.
    loup: (
      <>
        <path d="M14 30C14 15 22 8 32 8s18 7 18 22c0 7-3 11-5 13v10H19V43c-2-2-5-6-5-13z" />
        <path d="M19 28h9l-2 7h-6zM45 28h-9l2 7h6z" />
        <path d="M24 53v-6M32 53v-6M40 53v-6" />
        <path d="M23 43h18" />
      </>
    ),
    // Le Titan Mâchoire : deux mâchoires, les crocs serrés.
    loupBlanc: (
      <>
        <path d="M10 27c6-11 38-11 44 0l-4 9H14z" />
        <path d="M14 41h36l-4 11c-8 5-20 5-28 0z" />
        <path d="M20 36v5M27 36v5M37 36v5M44 36v5" />
      </>
    ),
  },
};

/** Le dos de carte : rosace, croissant, aiguilles d'étoiles. */
const DOS_LUNE = (
  <>
    <circle cx="32" cy="32" r="25" />
    <circle cx="32" cy="32" r="19" strokeDasharray="1.5 4" />
    <path d="M37 19a13 13 0 1 0 0 26 10 10 0 1 1 0-26z" />
    <path d="M45 22v6M42 25h6" />
    <path d="M32 3v5M32 56v5M3 32h5M56 32h5" />
  </>
);

/** Le dos de Shiganshina : la porte des remparts, un arc entre deux tours. */
const DOS_PORTE = (
  <>
    <circle cx="32" cy="32" r="25" />
    <path d="M18 52V26h28v26" />
    <path d="M24 52V38a8 8 0 0 1 16 0v14" />
    <path d="M18 26l3-5h4l3 5M36 26l3-5h4l3 5" />
    <path d="M32 30v22" />
  </>
);

export function SymboleRole({ role, taille = 48, className }: SymboleRoleProps) {
  const voix = useVoix();
  const skin = useSkinId();
  const label = role === null ? 'carte face cachée' : voix.nomRole(role);
  const dos = skin === 'shiganshina' ? DOS_PORTE : DOS_LUNE;
  const gravure = role === null ? dos : (GRAVURES_SKIN[skin]?.[role] ?? GRAVURES[role]);

  return (
    <svg
      role="img"
      aria-label={label}
      width={taille}
      height={taille}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-symbole={role ?? 'dos'}
    >
      {gravure}
    </svg>
  );
}
