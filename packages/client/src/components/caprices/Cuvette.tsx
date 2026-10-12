/**
 * La cuvette de cuivre (SPEC § 4.4) : la marque que la plaque laisse dans le
 * papier sous la presse — arête sombre côté ombre, reflet côté lumière,
 * contre-arête à l'intérieur, teinte de planche plus sombre que la marge.
 * Le cadre de toute carte, de toute planche de récit, du pupitre, du
 * verdict. La nuit, c'est le cuivre encré (aquatinte IV, arête palier III).
 *
 * Le numéro de planche (« 4 », « Pl. 3 ») se pose au coin haut-droit.
 */

import type { ReactNode } from 'react';

export function Cuvette({
  children,
  numero,
  className,
}: {
  children: ReactNode;
  numero?: string;
  className?: string;
}) {
  return (
    <div className={className === undefined ? 'cuvette' : `cuvette ${className}`}>
      {numero !== undefined && (
        <span className="cuvette-numero" aria-hidden="true">
          {numero}
        </span>
      )}
      {children}
    </div>
  );
}
