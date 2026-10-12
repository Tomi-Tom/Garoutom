/**
 * Les primitives de « Caprices » (SPEC § 4, § 5, § 7.1) — figées pour la
 * vague 2 (docs/design/caprices/IMPLEMENTATION.md, lot V1-A).
 */

export { AppuiLong } from './AppuiLong.js';
export { BarrePouce, useRaisonBarre } from './BarrePouce.js';
export { Bouton, type ArmementBouton, type ProprietesBouton, type VarianteBouton } from './Bouton.js';
export { Cartouche, type FormeCartouche } from './Cartouche.js';
export { Cuvette } from './Cuvette.js';
export { Frise } from './Frise.js';
export { Gabarit, HAUTEURS_FIL_TIERS, HAUTEURS_ZONES, type FilOuvert, type ZoneGabarit } from './Gabarit.js';
export { DEFS_MATIERES, Matieres } from './Matieres.js';
export { Pli } from './Pli.js';
export { heureDe, tirageDe, useTirage, type Heure, type Tirage } from './useTirage.js';
