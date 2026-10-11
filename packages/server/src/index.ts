/** Démarrage autonome : un port, un processus, la table de jeu servie sur /ws. */

import { CHANNEL_PATH } from '@garoutom/engine';

import { createGaroutomServer } from './app.js';

// 3004 par défaut : chacun son rang dans l'arcade, et deux jeux qui se battent
// pour un port sont deux jeux dont un ne démarre pas.
const PORT = Number(process.env.PORT ?? 3004);

createGaroutomServer().listen(PORT, () => {
  console.log(`Garoutom écoute sur http://localhost:${String(PORT)} (canal ${CHANNEL_PATH})`);
});
