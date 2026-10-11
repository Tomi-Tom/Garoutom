import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { configVitestRendu } from '@tombp/arcade/test';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Le serveur Node local : le canal et la santé y vivent, la page ici.
 *
 * Le même relais sert à `vite` et à `vite preview` : un client buildé se
 * prévisualise ainsi contre le serveur local, sans rien régler. En ligne, ce
 * relais n'existe pas — le client lit `VITE_CHANNEL_URL` (voir
 * `src/lib/socket.ts`).
 */
const relais = {
  '/ws': { target: 'http://localhost:3004', ws: true },
  '/health': { target: 'http://localhost:3004' },
};

export default defineConfig(
  // Le socle de test de rendu de la collection : jsdom, les doublures de
  // `matchMedia` et d'`AudioContext`, le nettoyage entre deux tests. Les tests
  // purs tourneront dans le même environnement : jsdom ne leur coûte rien de
  // mesurable, et un seul environnement vaut mieux que deux règles de nommage.
  configVitestRendu({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@garoutom/engine': resolve('../engine/src/index.ts'),
        '@': resolve('./src'),
      },
    },
    server: {
      // Écoute sur toutes les interfaces : en développement, on veut pouvoir
      // ouvrir le village depuis un téléphone du même réseau.
      host: true,
      port: 5177,
      // Le canal est un WebSocket natif sur /ws : en développement il
      // rejoint le serveur local ; en production, le Worker Cloudflare.
      proxy: relais,
    },
    preview: {
      host: true,
      port: 4177,
      proxy: relais,
    },
  }),
);
