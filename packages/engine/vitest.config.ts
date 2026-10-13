/**
 * La configuration des tests du moteur.
 *
 * Sous Windows, le pool « forks » par défaut de Vitest perd son RPC au bout
 * d’une minute de suites saturées — « Timeout calling onTaskUpdate », une
 * erreur non traitée qui fait échouer `npm test` alors que tous les tests
 * passent. Les deux bancs de simulation (v2 et v3, plusieurs milliers de
 * parties chacun) font passer la suite entière au-dessus de ce seuil depuis la
 * vague 2 de la v3. Le pool « threads » tient la charge sans rien changer
 * aux tests eux-mêmes.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
  },
});
