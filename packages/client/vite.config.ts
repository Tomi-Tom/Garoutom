import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { configVitestRendu } from '@tombp/arcade/test';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

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
      proxy: {
        // Le canal est un WebSocket natif sur /ws : en développement il
        // rejoindra le serveur local ; en production, le Worker Cloudflare.
        '/ws': {
          target: 'http://localhost:3004',
          ws: true,
        },
      },
    },
  }),
);
