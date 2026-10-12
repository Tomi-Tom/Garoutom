/**
 * Le magasin SQL des tables, sur une vraie SQLite (`node:sqlite`).
 *
 * Deux suites : la suite de contrat du lot A (`contratMagasin`, commune à tous
 * les magasins) quand elle est là, et l'équivalent local — qui reste, parce
 * qu'il éprouve aussi ce que seul ce magasin promet : les migrations
 * rejouables, la survie à une instance neuve, les colonnes d'extraits.
 */

import { describe, expect, it } from 'vitest';

import { FauxStockage } from './essais/doublures.js';
import { lireMetaNombre, migrer, SCHEMA_STOCKAGE, SqlRoomStore } from './stockage.js';

interface Contrat {
  contratMagasin(nom: string, fabrique: () => Promise<SqlRoomStore>): void;
}

// La suite partagée vit hors de ce paquet (et hors de ses exports) : on la
// charge par son chemin, sans la rendre obligatoire tant que le lot A ne l'a
// pas livrée.
const cheminContrat = '../../server/src/store.contract.ts';
const contrat = (await import(/* @vite-ignore */ cheminContrat).catch(() => null)) as Contrat | null;

const fabrique = async (): Promise<SqlRoomStore> => new SqlRoomStore(await FauxStockage.ouvrir());

if (contrat) contrat.contratMagasin('SqlRoomStore', fabrique);

describe('SqlRoomStore — le contrat, en local', () => {
  it('range, relit, sait ce qu’il a, compte et oublie', async () => {
    const magasin = await fabrique();
    expect(await magasin.has('ABCD')).toBe(false);
    expect(await magasin.load('ABCD')).toBeNull();
    expect(await magasin.count()).toBe(0);

    await magasin.save('ABCD', { code: 'ABCD', status: 'lobby', n: 1 });
    await magasin.save('WXYZ', { code: 'WXYZ', status: 'playing', n: 2 });
    expect(await magasin.has('ABCD')).toBe(true);
    expect(await magasin.load('ABCD')).toEqual({ code: 'ABCD', status: 'lobby', n: 1 });
    expect(await magasin.count()).toBe(2);
    expect(await magasin.codes()).toEqual(['ABCD', 'WXYZ']);

    await magasin.remove('ABCD');
    expect(await magasin.has('ABCD')).toBe(false);
    expect(await magasin.load('ABCD')).toBeNull();
    expect(await magasin.codes()).toEqual(['WXYZ']);
  });

  it('écrase sous le même code', async () => {
    const magasin = await fabrique();
    await magasin.save('ABCD', { v: 1 });
    await magasin.save('ABCD', { v: 2 });
    expect(await magasin.load('ABCD')).toEqual({ v: 2 });
    expect(await magasin.count()).toBe(1);
  });

  it('rend des copies : ni l’objet rangé ni l’objet lu ne sont partagés', async () => {
    const magasin = await fabrique();
    const table = { joueurs: [{ nom: 'Tom' }] };
    await magasin.save('ABCD', table);
    table.joueurs[0]!.nom = 'Muté après rangement';
    const lue = (await magasin.load('ABCD')) as typeof table;
    expect(lue.joueurs[0]?.nom).toBe('Tom');
    lue.joueurs[0]!.nom = 'Muté après lecture';
    expect(((await magasin.load('ABCD')) as typeof table).joueurs[0]?.nom).toBe('Tom');
  });

  it('relit ce qu’une sérialisation JSON rend, cache ou pas', async () => {
    const magasin = await fabrique();
    await magasin.save('ABCD', { absent: undefined, liste: [1, undefined] });
    const depuisCache = await magasin.load('ABCD');
    magasin.oublier();
    const depuisBase = await magasin.load('ABCD');
    expect(depuisCache).toEqual(depuisBase);
    expect(depuisBase).toEqual({ liste: [1, null] });
  });
});

describe('SqlRoomStore — ce que la base garde', () => {
  it('survit à une instance neuve sur la même base (réveil, déploiement)', async () => {
    const stockage = await FauxStockage.ouvrir();
    await new SqlRoomStore(stockage).save('ABCD', { code: 'ABCD', status: 'playing', schema: 1, updatedAt: 42 });

    const renee = new SqlRoomStore(stockage);
    expect(await renee.load('ABCD')).toEqual({ code: 'ABCD', status: 'playing', schema: 1, updatedAt: 42 });
    const ligne = stockage.sql.exec('SELECT status, schema, updated_at FROM rooms WHERE code = ?', 'ABCD').toArray()[0];
    expect(ligne).toEqual({ status: 'playing', schema: 1, updated_at: 42 });
  });

  it('compte les tables par statut', async () => {
    const magasin = await fabrique();
    await magasin.save('AAAA', { status: 'lobby' });
    await magasin.save('BBBB', { status: 'playing' });
    await magasin.save('CCCC', { status: 'playing' });
    await magasin.save('DDDD', { pas: 'de statut' });
    expect(magasin.parStatut()).toEqual({ lobby: 1, playing: 2, finished: 0, inconnu: 1 });
    expect(magasin.aDesTables()).toBe(true);
  });

  it('migre une fois, et rejoue sans dommage', async () => {
    const stockage = await FauxStockage.ouvrir();
    expect(migrer(stockage)).toBe(SCHEMA_STOCKAGE);
    await new SqlRoomStore(stockage).save('ABCD', { v: 1 });
    expect(migrer(stockage)).toBe(SCHEMA_STOCKAGE);
    expect(lireMetaNombre(stockage, 'schema_version')).toBe(SCHEMA_STOCKAGE);
    expect(await new SqlRoomStore(stockage).load('ABCD')).toEqual({ v: 1 });
  });

  it('lève sur une ligne illisible plutôt que de répondre « disparue »', async () => {
    const stockage = await FauxStockage.ouvrir();
    const magasin = new SqlRoomStore(stockage);
    stockage.sql.exec('INSERT INTO rooms (code, updated_at, data) VALUES (?, ?, ?)', 'ABCD', 0, '{pas du json');
    await expect(magasin.load('ABCD')).rejects.toThrow();
    // La ligne reste, pour qu'on puisse la lire à la main.
    expect(await magasin.has('ABCD')).toBe(true);
  });
});
