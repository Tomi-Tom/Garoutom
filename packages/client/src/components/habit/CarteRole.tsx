/**
 * La carte d'un rôle : une carte à jouer verticale (5:7), papier et encre,
 * cadre gravé, symbole au centre, nom en Cormorant. Son dos est la nuit et sa
 * lune. Le passage de `retournee` à vrai la retourne en 3D ; qui a demandé
 * moins de mouvement ne voit qu'un fondu.
 */
import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';

import { campOf, type RoleId } from '@garoutom/engine';

import { RESSORT_PANNEAU } from '../../anim/tokens.js';
import { useVoix } from '../../lib/partie.js';
import { SymboleRole } from './Symbole.js';

export interface CarteRoleProps {
  /** `null` : carte inconnue, le dos seul se montre. */
  role: RoleId | null;
  /** Face visible. Le passage de false à true retourne la carte (animé, reduced-motion respecté). */
  retournee: boolean;
  taille?: 'petite' | 'grande';
  /** Rend la carte cliquable (bouton accessible) — ex. retourner à la révélation. */
  onClic?: () => void;
  /** Montre la description du rôle sur la face. Défaut : vrai en `grande`. */
  avecDescription?: boolean;
  className?: string;
}

/** Le liseré du camp : lanterne pour le village, sang pour la meute. */
function teinteDuCamp(role: RoleId): string {
  return campOf(role) === 'loups' ? 'var(--sang-creux)' : 'var(--lanterne)';
}

const FACE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  borderRadius: 'inherit',
  boxSizing: 'border-box',
  boxShadow: '0 6px 18px rgb(0 0 0 / 0.45)',
};

export function CarteRole({
  role,
  retournee,
  taille = 'grande',
  onClic,
  avecDescription,
  className,
}: CarteRoleProps) {
  const voix = useVoix();
  const reduit = useReducedMotion() === true;
  const grande = taille === 'grande';
  const description = avecDescription ?? grande;
  // Une carte inconnue ne se retourne pas : son dos est tout ce qu'on en sait.
  const faceVisible = retournee && role !== null;
  const epaisseur = grande ? 3 : 2;

  const dimensions: CSSProperties = grande
    ? { width: 'min(260px, 70vw)', aspectRatio: '5 / 7' }
    : { width: 72, height: 100 };

  const contenu = (
    <motion.div
      initial={false}
      animate={{ rotateY: reduit || faceVisible ? 0 : 180 }}
      transition={RESSORT_PANNEAU}
      style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', borderRadius: 'inherit' }}
    >
      {/* Le recto : papier, encre de nuit. */}
      <motion.div
        initial={false}
        animate={{ opacity: reduit && !faceVisible ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        aria-hidden={faceVisible ? undefined : true}
        data-face="recto"
        style={{
          ...FACE,
          background: 'var(--papier)',
          color: 'var(--nuit)',
          border: `${String(epaisseur)}px solid ${role === null ? 'var(--papier-doux)' : teinteDuCamp(role)}`,
          padding: grande ? 10 : 4,
        }}
      >
        <div
          style={{
            height: '100%',
            boxSizing: 'border-box',
            border: '1px solid currentColor',
            borderRadius: 'inherit',
            padding: grande ? 10 : 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            textAlign: 'center',
            gap: grande ? 6 : 2,
            overflow: 'hidden',
          }}
        >
          {role !== null && (
            <>
              <SymboleRole role={role} taille={grande ? 96 : 38} />
              <span
                className="font-identite"
                style={{
                  fontWeight: 700,
                  fontSize: grande ? '1.5rem' : '0.8rem',
                  lineHeight: 1.1,
                  overflowWrap: 'anywhere',
                }}
              >
                {voix.nomRole(role)}
              </span>
              {description && (
                <span style={{ fontSize: '0.8rem', lineHeight: 1.25 }}>{voix.descriptionRole(role)}</span>
              )}
            </>
          )}
        </div>
      </motion.div>
      {/* Le verso : la nuit, sa lune. */}
      <motion.div
        initial={false}
        animate={{ opacity: reduit && faceVisible ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        aria-hidden={faceVisible ? true : undefined}
        data-face="verso"
        style={{
          ...FACE,
          transform: 'rotateY(180deg)',
          background: 'var(--nuit-relief)',
          color: 'var(--lune)',
          border: `${String(epaisseur)}px solid var(--papier)`,
          padding: grande ? 10 : 4,
        }}
      >
        <div
          style={{
            height: '100%',
            boxSizing: 'border-box',
            border: '1px solid var(--lune)',
            borderRadius: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymboleRole role={null} taille={grande ? 120 : 46} />
        </div>
      </motion.div>
    </motion.div>
  );

  const commun: CSSProperties = {
    ...dimensions,
    position: 'relative',
    perspective: 1000,
    borderRadius: grande ? 14 : 8,
    flexShrink: 0,
  };

  if (onClic !== undefined) {
    return (
      <button
        type="button"
        onClick={onClic}
        aria-label={faceVisible && role !== null ? voix.nomRole(role) : 'Retourner votre carte'}
        className={className}
        style={{
          ...commun,
          padding: 0,
          border: 0,
          background: 'transparent',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        {contenu}
      </button>
    );
  }
  return (
    <div className={className} style={commun}>
      {contenu}
    </div>
  );
}
