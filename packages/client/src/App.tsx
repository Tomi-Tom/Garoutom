/**
 * Racine du client Garoutom.
 *
 * Pour l'heure, l'accueil seul existe : le moteur est écrit et testé, la table
 * et son canal viendront avec le serveur. La structure reste celle de la
 * collection — un `App` qui choisit l'écran, des écrans dans `screens/` —
 * pour que le branchement du WebSocket natif (`CHANNEL_PATH`, dans le
 * moteur) n'y change rien.
 */

import { Home } from './screens/Home.js';

export function App() {
  return <Home />;
}
