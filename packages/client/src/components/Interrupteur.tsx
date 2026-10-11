/**
 * L'interrupteur du salon et des réglages : une glissière creusée dans la
 * nuit, un jeton qui coulisse.
 *
 * La case à cocher est le vrai contrôle — le reste est décor, `aria-hidden`.
 * Grisé, il l'est par la seule vraie raison, que `hint` dit en toutes lettres.
 */

import { motion } from 'motion/react';

import { RESSORT_JETON } from '../anim/tokens.js';

export function Interrupteur({
  id,
  label,
  hint,
  checked,
  editable = true,
  onToggle,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  editable?: boolean;
  onToggle: (valeur: boolean) => void;
}) {
  return (
    <label
      className="flex min-h-11 gap-3 rounded-lg p-3"
      style={{
        cursor: editable ? 'pointer' : 'default',
        background: checked ? 'color-mix(in srgb, var(--lanterne) 9%, transparent)' : 'transparent',
        boxShadow: `inset 0 0 0 1px ${checked ? 'color-mix(in srgb, var(--lanterne) 45%, transparent)' : 'var(--arcade-trait)'}`,
        opacity: editable ? 1 : 0.75,
      }}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={!editable}
        onChange={() => {
          if (editable) onToggle(!checked);
        }}
        aria-describedby={`${id}-hint`}
      />
      <Glissiere actif={checked} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-bold">{label}</span>
        <span id={`${id}-hint`} className="text-xs leading-snug" style={{ color: 'var(--papier-doux)' }}>
          {hint}
        </span>
      </span>
    </label>
  );
}

export function Glissiere({ actif }: { actif: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative mt-0.5 block h-6 w-11 shrink-0 rounded-full"
      style={{
        background: actif ? 'var(--lanterne)' : 'var(--nuit-creux)',
        boxShadow: 'inset 0 0 0 1px var(--arcade-trait)',
      }}
    >
      <motion.span
        className="absolute top-0.5 size-5 rounded-full"
        style={{ background: 'var(--papier)' }}
        animate={{ left: actif ? 22 : 2 }}
        transition={RESSORT_JETON}
      />
    </span>
  );
}
