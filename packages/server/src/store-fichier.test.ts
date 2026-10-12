/**
 * Le magasin sur disque : écriture atomique, repli sur la copie, regroupement.
 *
 * De vrais fichiers dans un dossier temporaire : c'est le disque qu'on teste,
 * pas une imitation. La suite de contrat du lot A (`store.contract.ts`) est
 * rejouée dès qu'elle existe.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileRoomStore } from './store-fichier.js';

interface Table {
  n: number;
  jeton?: string;
}

let dossier: string;
const ouverts: FileRoomStore<Table>[] = [];

const muet = (): void => undefined;

async function ouvrir(delaiMs = 20): Promise<FileRoomStore<Table>> {
  const magasin = await FileRoomStore.ouvrir<Table>(dossier, { delaiMs, journal: muet });
  ouverts.push(magasin);
  return magasin;
}

beforeEach(async () => {
  dossier = await mkdtemp(join(tmpdir(), 'garoutom-fichier-'));
});

afterEach(async () => {
  for (const magasin of ouverts.splice(0)) await magasin.vider();
  await rm(dossier, { recursive: true, force: true });
});

const attendre = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('FileRoomStore', () => {
  it('range, relit des copies, liste les codes', async () => {
    const magasin = await ouvrir();
    await magasin.save('ABCD', { n: 1 });
    await magasin.save('WXYZ', { n: 2 });
    const lue = await magasin.load('ABCD');
    if (!lue) throw new Error('la table devrait exister');
    lue.n = 99;
    expect(await magasin.load('ABCD')).toEqual({ n: 1 });
    expect((await magasin.codes()).sort()).toEqual(['ABCD', 'WXYZ']);
    expect(await magasin.count()).toBe(2);
    await magasin.remove('ABCD');
    expect(await magasin.has('ABCD')).toBe(false);
    expect(await magasin.load('ABCD')).toBeNull();
  });

  it('regroupe les écritures : une rafale, un fichier, et pas de .tmp qui traîne', async () => {
    const magasin = await ouvrir(30);
    for (let n = 0; n < 20; n++) await magasin.save('ABCD', { n });
    expect(existsSync(join(dossier, 'tables.json'))).toBe(false); // pas encore
    await attendre(150);
    const contenu = JSON.parse(await readFile(join(dossier, 'tables.json'), 'utf8')) as {
      tables: Record<string, Table>;
    };
    expect(contenu.tables.ABCD).toEqual({ n: 19 });
    expect(await readdir(dossier)).not.toContain('tables.json.tmp');
  });

  it('survit à un redémarrage : ce qui est vidé est relu', async () => {
    const premier = await ouvrir();
    await premier.save('ABCD', { n: 7, jeton: 'secret' });
    await premier.vider();

    const second = await ouvrir();
    expect(await second.load('ABCD')).toEqual({ n: 7, jeton: 'secret' });
    expect(await second.codes()).toEqual(['ABCD']);
  });

  it('garde une copie .bak de l’écriture précédente', async () => {
    const magasin = await ouvrir();
    await magasin.save('ABCD', { n: 1 });
    await magasin.vider();
    await magasin.save('ABCD', { n: 2 });
    await magasin.vider();
    const bak = JSON.parse(await readFile(join(dossier, 'tables.json.bak'), 'utf8')) as {
      tables: Record<string, Table>;
    };
    expect(bak.tables.ABCD).toEqual({ n: 1 });
  });

  it('retombe sur le .bak quand tables.json est corrompu', async () => {
    const magasin = await ouvrir();
    await magasin.save('ABCD', { n: 1 });
    await magasin.vider();
    await magasin.save('ABCD', { n: 2 });
    await magasin.vider(); // tables.json = n:2, .bak = n:1
    await writeFile(join(dossier, 'tables.json'), '{"format":1,"tables":{"ABCD":{"n":'); // coupé net

    const relu = await ouvrir();
    expect(await relu.load('ABCD')).toEqual({ n: 1 });
    // La pièce à conviction est gardée, et le fichier principal est réécrit sain.
    expect((await readdir(dossier)).some((nom) => nom.includes('.corrompu-'))).toBe(true);
    await relu.vider();
    expect(JSON.parse(await readFile(join(dossier, 'tables.json'), 'utf8'))).toMatchObject({
      tables: { ABCD: { n: 1 } },
    });
  });

  it('démarre à vide si tout est corrompu, sans lever', async () => {
    await writeFile(join(dossier, 'tables.json'), 'pas du json');
    await writeFile(join(dossier, 'tables.json.bak'), '[1,2');
    const magasin = await ouvrir();
    expect(await magasin.count()).toBe(0);
  });

  it('refuse une forme inattendue comme un fichier corrompu', async () => {
    await writeFile(join(dossier, 'tables.json'), '{"format":1,"tables":[1,2]}');
    const magasin = await ouvrir();
    expect(await magasin.count()).toBe(0);
  });

  it('vide de façon synchrone (arrêt du processus)', async () => {
    const magasin = await ouvrir(10_000);
    await magasin.save('ABCD', { n: 5 });
    magasin.viderSync();
    expect(JSON.parse(await readFile(join(dossier, 'tables.json'), 'utf8'))).toMatchObject({
      tables: { ABCD: { n: 5 } },
    });
    expect(magasin.etat().derniereEcritureMs).not.toBeNull();
  });

  it('signale la dernière écriture dans son état', async () => {
    const magasin = await ouvrir();
    expect(magasin.etat()).toEqual({ active: true, derniereEcritureMs: null, erreur: null });
    await magasin.save('ABCD', { n: 1 });
    await magasin.vider();
    expect(magasin.etat().derniereEcritureMs).toBeGreaterThan(0);
  });
});

// La suite de contrat commune, quand le lot A l'a livrée.
const chemin = './store.contract.js';
const contrat = (await import(/* @vite-ignore */ chemin).catch(() => null)) as {
  contratMagasin: (nom: string, fabrique: () => Promise<unknown>, nettoyer?: () => Promise<void>) => void;
} | null;
if (contrat) {
  /** Ce que chaque épreuve du contrat a ouvert : vidé puis effacé après elle. */
  const contrats: { magasin: FileRoomStore<unknown>; dossier: string }[] = [];
  contrat.contratMagasin(
    'FileRoomStore',
    async () => {
      const parent = await mkdtemp(join(tmpdir(), 'garoutom-contrat-'));
      const magasin = await FileRoomStore.ouvrir<unknown>(parent, { delaiMs: 5, journal: muet });
      contrats.push({ magasin, dossier: parent });
      return magasin;
    },
    async () => {
      // Vider d'abord : une écriture en attente recréerait le dossier effacé.
      for (const { magasin, dossier: parent } of contrats.splice(0)) {
        await magasin.vider();
        await rm(parent, { recursive: true, force: true });
      }
    },
  );
}
