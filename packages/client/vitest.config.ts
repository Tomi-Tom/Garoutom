/**
 * La configuration des tests : celle de Vite (`vite.config.ts`, socle de rendu
 * de la collection compris), plus le préchargement des gravures chargées à la
 * demande (`src/traces.setup.ts`) — les rendus de test les lisent ainsi de
 * façon synchrone. `mergeConfig` ajoute ce fichier aux `setupFiles` du socle
 * sans les remplacer.
 */
import { defineConfig, mergeConfig } from 'vitest/config';

import configVite from './vite.config.js';

export default mergeConfig(
  configVite,
  defineConfig({
    test: {
      setupFiles: ['./src/traces.setup.ts'],
    },
  }),
);
