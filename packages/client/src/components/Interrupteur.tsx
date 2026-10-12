/**
 * La case gravée (SPEC Caprices § 5.17) — elle remplace l'interrupteur à
 * glissière, étranger au cuivre : un carré de 24, filet 1,5 ; cochée, une
 * croix de deux traits de 2 px ; le mot « oui » ou « non » à droite en
 * `--t-statut` ; la ligne entière se touche (≥ 44).
 *
 * La case à cocher est le vrai contrôle — le carré est un dessin,
 * `aria-hidden`. Éteinte, elle l'est par la seule vraie raison, que `hint`
 * dit en toutes lettres : jamais d'opacité, un filet en pointillé.
 */

export function Interrupteur({
  id,
  label,
  hint,
  checked,
  editable = true,
  onToggle,
  separe = true,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  editable?: boolean;
  onToggle: (valeur: boolean) => void;
  /** Un filet fin au-dessus de la ligne, entre deux cases d'une liste. */
  separe?: boolean;
}) {
  return (
    <label
      className="flex min-h-11 items-start gap-3 py-1.5"
      style={{
        cursor: editable ? 'pointer' : 'default',
        borderTop: separe ? '0.75px solid var(--filet-doux)' : undefined,
      }}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={!editable}
        onChange={() => {
          if (editable) onToggle(!checked);
        }}
        aria-describedby={`${id}-hint`}
      />
      <CaseGravee cochee={checked} eteinte={!editable} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="text-[15px] leading-5 font-semibold"
          style={{ color: editable ? 'var(--encre)' : 'var(--encre-2)' }}
        >
          {label}
        </span>
        <span id={`${id}-hint`} className="t-statut">
          {hint}
        </span>
      </span>
      <span aria-hidden="true" className="t-statut flex-none leading-5">
        {checked ? 'oui' : 'non'}
      </span>
    </label>
  );
}

/** Le carré gravé : cochée, deux traits en croix ; éteinte, un filet pointillé. */
export function CaseGravee({ cochee, eteinte = false }: { cochee: boolean; eteinte?: boolean }) {
  const encre = eteinte ? 'var(--filet-doux)' : 'var(--encre)';
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="mt-0.5 flex-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
      data-case={cochee ? 'cochee' : 'vide'}
    >
      <rect
        x=".75"
        y=".75"
        width="22.5"
        height="22.5"
        fill={eteinte ? 'none' : 'var(--surface)'}
        stroke={encre}
        strokeWidth="1.5"
        strokeDasharray={eteinte ? '3 2' : undefined}
      />
      {cochee && (
        <path d="M6.2 6 L17.8 18.1 M17.9 6.1 L6.1 17.9" stroke={encre} strokeWidth="2" strokeLinecap="square" />
      )}
    </svg>
  );
}
