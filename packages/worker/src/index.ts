/**
 * Le point d'entrée du Worker : le gestionnaire HTTP et la classe de l'objet,
 * **rien d'autre**.
 *
 * Le runtime lit chaque export nommé du module principal comme un point
 * d'entrée (classe d'objet, `WorkerEntrypoint`…) et refuse de démarrer sur
 * une constante ou une fonction utilitaire. La porte et ses aides vivent donc
 * dans `porte.ts`, l'objet dans `tables.ts`.
 */

export { default } from './porte.js';
export { TablesDO } from './tables.js';
