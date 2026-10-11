/**
 * Démarrage autonome : un port, un processus, la table de jeu servie sur /ws.
 *
 * Deux usages, un seul fichier :
 *
 * - **`npm start`** (après `npm run build`) — le serveur sert aussi le client
 *   buildé, sur le même port. C'est la soirée entre amis : chacun ouvre
 *   l'adresse du réseau local annoncée ci-dessous, et c'est tout.
 * - **`npm run dev`** — Vite sert la page et relaie `/ws` jusqu'ici ; le
 *   script racine passe `--canal-seul` pour qu'un vieux `dist` ne soit pas
 *   servi par erreur à côté du client vivant.
 *
 * Réglages par l'environnement : `PORT` (3004), `HOST` (`0.0.0.0`, toutes les
 * interfaces — c'est ce qui ouvre la table au Wi-Fi), `GAROUTOM_CLIENT` (le
 * dossier du client, `packages/client/dist` par défaut).
 */

import { fileURLToPath } from 'node:url';

import { CHANNEL_PATH } from '@garoutom/engine';

import { adressesEcoute, createGaroutomServer } from './app.js';
import { clientPret } from './static.js';

// 3004 par défaut : chacun son rang dans l'arcade, et deux jeux qui se battent
// pour un port sont deux jeux dont un ne démarre pas.
const PORT = Number(process.env.PORT ?? 3004);
const HOST = process.env.HOST ?? '0.0.0.0';
const CANAL_SEUL = process.argv.includes('--canal-seul');
const DOSSIER_CLIENT =
  process.env.GAROUTOM_CLIENT ?? fileURLToPath(new URL('../../client/dist', import.meta.url));

const client = !CANAL_SEUL && (await clientPret(DOSSIER_CLIENT)) ? DOSSIER_CLIENT : null;
const server = createGaroutomServer({ client });

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Le port ${String(PORT)} est déjà pris. Fermez l'autre serveur, ou choisissez-en un autre (variable PORT).`,
    );
  } else {
    console.error('Le serveur n’a pas pu démarrer', error.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const { locale, reseau: interfaces } = adressesEcoute(PORT);
  // Les adresses du réseau ne valent que si l'on écoute sur toutes les
  // interfaces ; `HOST=127.0.0.1` ferme justement la porte aux voisins.
  const reseau = HOST === '0.0.0.0' || HOST === '::' ? interfaces : [];
  const lignes: string[] = [];

  if (CANAL_SEUL) {
    lignes.push(`Garoutom — canal ${CHANNEL_PATH} sur ${locale} (la page est servie par Vite)`);
  } else if (client) {
    lignes.push('Garoutom est ouvert. Jouez sur :', `  ${locale}`);
    if (reseau.length > 0) {
      lignes.push('Et pour les amis du même réseau :', ...reseau.map((adresse) => `  ${adresse}`));
    }
  } else {
    lignes.push(
      `Garoutom — canal ${CHANNEL_PATH} sur ${locale}, mais aucune page à servir :`,
      `  le client n'est pas construit (${DOSSIER_CLIENT}).`,
      '  Lancez npm run build, puis npm start — ou npm run serve, qui fait les deux.',
    );
  }
  console.log(lignes.join('\n'));
});
