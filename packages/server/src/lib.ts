/**
 * Le paquet vu du dehors — le cœur réutilisable, et rien de Node.
 *
 * Tout ce que le Worker Cloudflare reprendra est ici : le magasin de tables,
 * la logique des tables, le concentrateur. Ni `ws`, ni `node:http` : le
 * branchement transport appartient à l'hôte, pas au cœur.
 */

export * from './store.js';
export * from './rooms.js';
export * from './hub.js';
