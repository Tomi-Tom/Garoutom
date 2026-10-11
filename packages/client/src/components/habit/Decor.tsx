/**
 * Le décor plein cadre derrière un écran : la place du village selon l'heure.
 * Purement décoratif (aria-hidden), posé en `absolute inset-0 -z-10` par son
 * parent.
 *
 * Tout est SVG et dégradés CSS, jamais de filtre animé : les moments se
 * répondent par des fondus d'opacité (ciel, lune, étoiles, fenêtres, brume),
 * ce qui coûte peu et que `prefers-reduced-motion` ramène à un changement
 * instantané. Le fond reste sombre à toute heure — le texte posé dessus est
 * du papier, et le fond ne change pas de thème entre la nuit et le jour
 * (design.md) : un éclairage change, pas un monde.
 */
import { motion, useReducedMotion } from 'motion/react';

export type Moment = 'salon' | 'nuit' | 'aube' | 'jour' | 'fin';

/** Les ciels, du zénith à l'horizon. Les couleurs viennent du skin. */
const CIELS: Record<Moment, string> = {
  salon: 'linear-gradient(to bottom, var(--nuit) 0%, var(--nuit-relief) 100%)',
  nuit: 'linear-gradient(to bottom, var(--nuit-creux) 0%, var(--nuit) 70%, var(--nuit-relief) 100%)',
  aube: 'linear-gradient(to bottom, var(--nuit) 0%, color-mix(in srgb, var(--serment) 22%, var(--nuit)) 60%, color-mix(in srgb, var(--lanterne) 40%, var(--nuit)) 100%)',
  jour: 'linear-gradient(to bottom, color-mix(in srgb, var(--lune) 24%, var(--nuit)) 0%, color-mix(in srgb, var(--lune) 12%, var(--nuit)) 65%, color-mix(in srgb, var(--lanterne) 20%, var(--nuit)) 100%)',
  fin: 'linear-gradient(to bottom, var(--nuit) 0%, var(--nuit-relief) 100%)',
};

const MOMENTS = Object.keys(CIELS) as Moment[];

/** Ce que chaque heure allume : lune, étoiles, fenêtres, brume (0 à 1). */
const ETATS: Record<Moment, { lune: number; etoiles: number; fenetres: number; brume: number }> = {
  salon: { lune: 0.5, etoiles: 0.35, fenetres: 1, brume: 0 },
  nuit: { lune: 0.95, etoiles: 0.8, fenetres: 0, brume: 0.1 },
  aube: { lune: 0.2, etoiles: 0.15, fenetres: 0.35, brume: 0.3 },
  jour: { lune: 0, etoiles: 0, fenetres: 0.6, brume: 0.1 },
  fin: { lune: 0.3, etoiles: 0.2, fenetres: 0.15, brume: 0.7 },
};

/** Les maisons : abscisse, largeur, hauteur du mur, hauteur du toit. Le sol est à y = 285. */
const MAISONS = [
  { x: 8, w: 46, h: 34, r: 20 },
  { x: 62, w: 38, h: 46, r: 24 },
  { x: 108, w: 52, h: 30, r: 22 },
  { x: 250, w: 44, h: 42, r: 26 },
  { x: 302, w: 54, h: 32, r: 20 },
  { x: 362, w: 40, h: 48, r: 24 },
];

const SOL = 285;

const ETOILES = [
  [30, 30],
  [78, 62],
  [120, 24],
  [170, 70],
  [232, 38],
  [300, 78],
  [350, 28],
  [388, 66],
  [206, 112],
  [64, 118],
];

export function Decor({ moment, className }: { moment: Moment; className?: string }) {
  const reduit = useReducedMotion() === true;
  const etat = ETATS[moment];
  const fondu = { duration: reduit ? 0 : 1.4, ease: 'easeInOut' } as const;

  return (
    <div
      aria-hidden="true"
      data-decor={moment}
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ''}`}
    >
      {MOMENTS.map((m) => (
        <motion.div
          key={m}
          initial={false}
          animate={{ opacity: m === moment ? 1 : 0 }}
          transition={fondu}
          style={{ position: 'absolute', inset: 0, background: CIELS[m] }}
        />
      ))}

      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <motion.g initial={false} animate={{ opacity: etat.etoiles }} transition={fondu}>
          {ETOILES.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="var(--papier)" />
          ))}
        </motion.g>

        <motion.g initial={false} animate={{ opacity: etat.lune }} transition={fondu}>
          <circle cx={312} cy={58} r={22} fill="var(--lune)" opacity={0.1} />
          <circle cx={312} cy={58} r={14} fill="var(--lune)" />
          <circle cx={317} cy={54} r={12} fill="var(--nuit-creux)" opacity={0.18} />
        </motion.g>

        {/* La silhouette du village : mur, toit, fenêtre. */}
        <g fill="var(--nuit-creux)">
          <rect x={0} y={SOL - 4} width={400} height={20} />
          {MAISONS.map((m) => (
            <g key={m.x}>
              <rect x={m.x} y={SOL - m.h} width={m.w} height={m.h + 4} />
              <polygon
                points={`${String(m.x - 4)},${String(SOL - m.h)} ${String(m.x + m.w / 2)},${String(SOL - m.h - m.r)} ${String(m.x + m.w + 4)},${String(SOL - m.h)}`}
              />
            </g>
          ))}
          {/* L'église : nef, clocher, flèche. */}
          <rect x={170} y={SOL - 40} width={70} height={44} />
          <polygon points="166,245 205,226 244,245" />
          <rect x={192} y={SOL - 92} width={26} height={60} />
          <polygon points="188,193 205,150 222,193" />
          <rect x={204} y={138} width={2} height={14} />
          <rect x={199} y={143} width={12} height={2} />
        </g>

        {/* Les fenêtres : la lanterne y brûle selon l'heure. */}
        <motion.g initial={false} animate={{ opacity: etat.fenetres }} transition={fondu} fill="var(--lanterne)">
          {MAISONS.map((m) => (
            <rect key={m.x} x={m.x + m.w / 2 - 4} y={SOL - m.h + 9} width={8} height={10} rx={1} />
          ))}
          <rect x={201} y={SOL - 78} width={8} height={14} rx={4} />
          <rect x={184} y={SOL - 26} width={8} height={12} rx={1} />
          <rect x={218} y={SOL - 26} width={8} height={12} rx={1} />
        </motion.g>
      </svg>

      {/* La brume : un voile au ras du sol, sans filtre. */}
      <motion.div
        initial={false}
        animate={{ opacity: etat.brume }}
        transition={fondu}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '45%',
          background: 'linear-gradient(to top, color-mix(in srgb, var(--lune) 38%, transparent), transparent)',
        }}
      />
    </div>
  );
}
