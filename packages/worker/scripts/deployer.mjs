#!/usr/bin/env node
/**
 * La garde de déploiement du Worker (D24).
 *
 * Un déploiement Cloudflare ferme **toutes** les WebSockets. Avec les tables
 * persistées (D21), ce n'est qu'un blip : les clients se reconnectent et
 * reprennent leur place par jeton. Mais un blip en pleine nuit de jeu reste
 * un blip : on ne déploie donc pas pendant qu'une partie se joue, sauf à le
 * vouloir (`--force`).
 *
 * La garde interroge `/health?profond=1` du Worker en ligne avec le secret
 * `ADMIN_TOKEN` (variable d'environnement — jamais sur la ligne de commande,
 * jamais écrit). Elle refuse si :
 *
 * - des parties sont `playing` ;
 * - la santé profonde ne répond pas, ou pas avec des comptes (ancienne
 *   version en ligne, secret absent ou refusé) : on ne sait pas, donc non.
 *
 * Puis elle lance le Wrangler **épinglé** du paquet, avec les arguments
 * restants (`npm run deploy -w @garoutom/worker -- --dry-run`, par exemple).
 *
 * Variables :
 *   ADMIN_TOKEN            le secret posé par `wrangler secret put ADMIN_TOKEN`
 *   GAROUTOM_WORKER_URL    l'adresse du Worker (défaut : la production)
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADRESSE = (process.env.GAROUTOM_WORKER_URL ?? 'https://garoutom.yamstom-worker.workers.dev').replace(/\/+$/, '');
const args = process.argv.slice(2);
const force = args.includes('--force');
const transmis = args.filter((arg) => arg !== '--force');
const paquet = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Rend `{ ok: true, enJeu, detail }` ou `{ ok: false, raison }`. */
async function sonder() {
  const jeton = process.env.ADMIN_TOKEN ?? '';
  if (jeton.length === 0) return { ok: false, raison: 'ADMIN_TOKEN absent de l’environnement' };
  let reponse;
  try {
    reponse = await fetch(`${ADRESSE}/health?profond=1`, {
      headers: { Authorization: `Bearer ${jeton}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erreur) {
    return { ok: false, raison: `santé injoignable (${erreur instanceof Error ? erreur.message : String(erreur)})` };
  }
  if (!reponse.ok) return { ok: false, raison: `santé profonde en ${reponse.status}` };
  let corps;
  try {
    corps = await reponse.json();
  } catch {
    return { ok: false, raison: 'santé profonde illisible' };
  }
  const tables = corps?.tables;
  if (typeof tables !== 'object' || tables === null || typeof tables.playing !== 'number') {
    return { ok: false, raison: 'la version en ligne ne compte pas ses parties (antérieure à D21 ?)' };
  }
  return { ok: true, enJeu: tables.playing, detail: corps };
}

const sonde = await sonder();
if (sonde.ok) {
  const { detail } = sonde;
  console.log(
    `Worker en ligne : version ${detail.version ?? '?'}, tables ${JSON.stringify(detail.tables)}, ` +
      `${detail.sockets} socket(s), schéma ${detail.schema ?? '?'}.`,
  );
}

if (!sonde.ok) {
  if (!force) {
    console.error(`Déploiement refusé : impossible de vérifier les parties en cours — ${sonde.raison}.`);
    console.error('Relancer avec --force pour passer outre (les parties en cours vivront un blip de reconnexion).');
    process.exit(1);
  }
  console.warn(`Vérification impossible (${sonde.raison}) — --force : on déploie quand même.`);
} else if (sonde.enJeu > 0) {
  if (!force) {
    console.error(`Déploiement refusé : ${sonde.enJeu} partie(s) en cours. Attendre, ou relancer avec --force.`);
    process.exit(1);
  }
  console.warn(`${sonde.enJeu} partie(s) en cours — --force : elles se reconnecteront (état persisté).`);
}

// Le Wrangler du dépôt, pas celui du poste : `npx` résout d'abord les
// node_modules locaux (racine des workspaces comprise).
const resultat = spawnSync('npx', ['--no-install', 'wrangler', 'deploy', ...transmis], {
  cwd: paquet,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(resultat.status ?? 1);
