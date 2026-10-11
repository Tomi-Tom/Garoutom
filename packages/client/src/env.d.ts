/**
 * Les variables que Vite injecte au build, typées une à une.
 *
 * `vite/client` (dans `tsconfig.json`) déclare déjà `import.meta.env` ; on n'y
 * ajoute que les nôtres, pour qu'une faute de frappe dans leur nom se voie au
 * typecheck plutôt qu'en production.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * L'adresse complète du canal (`wss://…/ws`), quand il ne vit pas sur
   * l'origine de la page — en ligne, le Worker Cloudflare. Absente, le client
   * frappe à sa propre origine (voir `lib/socket.ts`).
   */
  readonly VITE_CHANNEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
