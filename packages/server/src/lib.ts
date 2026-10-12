/**
 * Le paquet vu du dehors — le cœur réutilisable, et rien de Node.
 *
 * Tout ce que le Worker Cloudflare reprend est ici : le magasin de tables,
 * la logique des tables (et leur temps, leur journal, leur forme rangée), le
 * concentrateur et ses quotas. Ni `ws`, ni `node:http` : le branchement
 * transport appartient à l'hôte, pas au cœur.
 *
 * La suite de contrat des magasins vit à part, sous
 * `@garoutom/server/store.contract` : elle importe Vitest, qui n'a rien à
 * faire dans un serveur en production.
 */

export * from './store.js';
export * from './rooms.js';
export * from './hub.js';
