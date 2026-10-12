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
 * Réglages par l'environnement :
 *
 * - `PORT` (3004), `HOST` (`0.0.0.0`, toutes les interfaces — c'est ce qui
 *   ouvre la table au Wi-Fi), `GAROUTOM_CLIENT` (le dossier du client,
 *   `packages/client/dist` par défaut) ;
 * - `GAROUTOM_DATA` : le dossier où les tables survivent au redémarrage
 *   (`.garoutom-data/` à la racine du dépôt par défaut ; `off` pour la
 *   mémoire seule). Avec `--canal-seul` (`npm run dev`), la persistance est
 *   coupée sauf si la variable est donnée ;
 * - `GAROUTOM_ORIGINES` : origines WebSocket acceptées en plus de l'hôte de
 *   la requête (liste séparée par des virgules) ;
 * - `GAROUTOM_PROXY=1` : croire `x-forwarded-for` (derrière un proxy).
 *
 * Arrêt : `SIGINT`/`SIGTERM`/`SIGBREAK` (Ctrl+C, Ctrl+Pause) lancent l'arrêt
 * gracieux ; un second signal sort sur-le-champ. Sous Windows,
 * `process.kill(pid, 'SIGINT')` n'envoie pas de signal : il **tue** le
 * processus sans passer par le gestionnaire. Un processus lancé avec un canal
 * IPC (`child_process.fork`, `stdio: 'ipc'`) peut donc recevoir le message
 * `'garoutom:arret'` — c'est ce que font les tests.
 */

import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHANNEL_PATH } from '@garoutom/engine';

import { adressesEcoute, creerGaroutom } from './app.js';
import { clientPret } from './static.js';
import { lireListe } from './ws-node.js';

/** Au-delà, on sort quoi qu'il arrive : un redémarrage qui traîne vaut une panne. */
const DELAI_SORTIE_MS = 3_000;
/** Le message IPC qui déclenche l'arrêt gracieux là où les signaux n'existent pas. */
export const MESSAGE_ARRET = 'garoutom:arret';

// 3004 par défaut : chacun son rang dans l'arcade, et deux jeux qui se battent
// pour un port sont deux jeux dont un ne démarre pas.
const PORT = Number(process.env.PORT ?? 3004);
const HOST = process.env.HOST ?? '0.0.0.0';
const CANAL_SEUL = process.argv.includes('--canal-seul');
const DOSSIER_CLIENT =
  process.env.GAROUTOM_CLIENT ?? fileURLToPath(new URL('../../client/dist', import.meta.url));

/** Le dossier de données, ou `null` pour la mémoire seule. */
function dossierDonnees(): string | null {
  const brut = process.env.GAROUTOM_DATA;
  if (brut === undefined) {
    return CANAL_SEUL ? null : fileURLToPath(new URL('../../../.garoutom-data', import.meta.url));
  }
  const valeur = brut.trim();
  if (['', '0', 'off', 'non', 'false'].includes(valeur.toLowerCase())) return null;
  return isAbsolute(valeur) ? valeur : resolve(valeur);
}

const DONNEES = dossierDonnees();

// Les filets : une promesse oubliée ne doit pas coucher le serveur, mais une
// exception non rattrapée laisse un état douteux — on sauve les tables, on sort.
let garoutom: Awaited<ReturnType<typeof creerGaroutom>> | null = null;

process.on('unhandledRejection', (raison) => {
  console.error('Promesse rejetée non rattrapée (le serveur continue)', raison);
});
process.on('uncaughtException', (error) => {
  console.error('Exception non rattrapée, vidage puis sortie', error);
  try {
    garoutom?.viderSync();
  } catch (erreurVidage) {
    console.error('Vidage impossible', erreurVidage);
  }
  process.exit(1);
});

let enArret = false;
function arreter(cause: string): void {
  if (enArret) {
    console.error(`${cause} : second signal, sortie immédiate`);
    process.exit(1);
  }
  enArret = true;
  console.log(`${cause} : arrêt gracieux (les tables sont sauvegardées)`);
  // Plafond dur : quoi qu'il arrive, on part dans la fenêtre annoncée.
  setTimeout(() => {
    garoutom?.viderSync();
    process.exit(0);
  }, DELAI_SORTIE_MS);
  const fait = garoutom ? garoutom.arreter() : Promise.resolve();
  fait.then(
    () => process.exit(0),
    (error: unknown) => {
      console.error('Arrêt en échec', error);
      garoutom?.viderSync();
      process.exit(1);
    },
  );
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
  process.on(signal, () => {
    arreter(signal);
  });
}
process.on('message', (message) => {
  if (message === MESSAGE_ARRET) arreter('message IPC');
});

const client = !CANAL_SEUL && (await clientPret(DOSSIER_CLIENT)) ? DOSSIER_CLIENT : null;
garoutom = await creerGaroutom({
  client,
  donnees: DONNEES,
  origines: lireListe(process.env.GAROUTOM_ORIGINES),
  proxy: process.env.GAROUTOM_PROXY === '1',
});
const { server } = garoutom;

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

// Les tables du disque sont rechargées et réarmées AVANT d'ouvrir la porte :
// un joueur qui revient ne doit pas trouver une table à moitié réveillée.
await garoutom.demarrer();

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
  lignes.push(
    DONNEES
      ? `Les tables survivent au redémarrage (${DONNEES}).`
      : 'Les tables restent en mémoire : arrêter le serveur les efface.',
  );
  console.log(lignes.join('\n'));
});
