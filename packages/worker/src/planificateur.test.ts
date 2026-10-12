/**
 * Le planificateur : une alarme pour toutes les tables, qui ne lève jamais.
 */

import { describe, expect, it } from 'vitest';

import { FauxStockage } from './essais/doublures.js';
import { delaiEssai, LOT_DE_REVEILS, Planificateur, type OptionsPlanificateur } from './planificateur.js';
import { lireMetaNombre } from './stockage.js';

async function monter(options: OptionsPlanificateur = {}): Promise<{ stockage: FauxStockage; planif: Planificateur }> {
  const stockage = await FauxStockage.ouvrir();
  return { stockage, planif: new Planificateur(stockage, { maintenant: () => 0, ...options }) };
}

describe('le planificateur — l’alarme', () => {
  it('arme l’alarme sur la plus proche échéance, et l’efface quand il n’y a plus rien', async () => {
    const { stockage, planif } = await monter();
    planif.wake('BBBB', 5_000);
    expect(stockage.alarme).toBe(5_000);
    planif.wake('AAAA', 2_000);
    expect(stockage.alarme).toBe(2_000);
    planif.wake('CCCC', 9_000);
    expect(stockage.alarme).toBe(2_000);

    // Le dernier appel pour un code remplace le précédent.
    planif.wake('AAAA', 7_000);
    expect(stockage.alarme).toBe(5_000);
    planif.wake('BBBB', null);
    expect(stockage.alarme).toBe(7_000);
    planif.wake('AAAA', null);
    planif.wake('CCCC', null);
    expect(stockage.alarme).toBeNull();
  });

  it('n’écrit l’alarme que si elle change', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 2_000);
    planif.wake('BBBB', 5_000);
    planif.wake('CCCC', 9_000);
    planif.rearm();
    expect(stockage.ecrituresAlarme).toEqual([2_000]);
  });

  it('tient compte de la veille et du balayage', async () => {
    let veille: number | null = 1_500;
    const { stockage, planif } = await monter({ veille: () => veille, aBalayer: () => true, balayageMs: 60_000 });
    planif.wake('AAAA', 2_000);
    expect(stockage.alarme).toBe(1_500);
    veille = null;
    planif.rearm();
    expect(stockage.alarme).toBe(2_000);
    planif.wake('AAAA', null);
    // Il reste des tables : le balayage horaire tient l’alarme.
    expect(stockage.alarme).toBe(60_000);
  });

  it('une échéance invalide vaut un oubli', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 2_000);
    planif.wake('AAAA', Number.NaN);
    expect(planif.reveils()).toEqual([]);
    expect(stockage.alarme).toBeNull();
  });
});

describe('le planificateur — les passages', () => {
  it('ne réveille que les tables dues, et consomme leur réveil', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 1_000);
    planif.wake('BBBB', 2_000);
    planif.wake('CCCC', 10_000);
    const appeles: string[] = [];
    const passage = await planif.run(2_500, (code) => {
      appeles.push(code);
      return Promise.resolve();
    });
    expect(appeles).toEqual(['AAAA', 'BBBB']);
    expect(passage).toMatchObject({ traites: 2, echecs: 0 });
    expect(planif.reveils().map((r) => r.code)).toEqual(['CCCC']);
    expect(stockage.alarme).toBe(10_000);
  });

  it('garde le réveil que la table redemande pendant son tick', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 1_000);
    await planif.run(1_000, (code) => {
      planif.wake(code, 31_000);
      return Promise.resolve();
    });
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 31_000, essais: 0 }]);
    expect(stockage.alarme).toBe(31_000);
  });

  it('décale d’une seconde une table qui se redemande dans le passé', async () => {
    const { planif } = await monter();
    planif.wake('AAAA', 1_000);
    await planif.run(5_000, (code) => {
      planif.wake(code, 4_000);
      return Promise.resolve();
    });
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 6_000, essais: 0 }]);
  });

  it('isole une table en échec, la repousse à délai croissant, sans retarder les autres', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 1_000);
    planif.wake('BBBB', 1_000);
    const casse = (code: string): Promise<void> =>
      code === 'AAAA' ? Promise.reject(new Error('boum')) : Promise.resolve();

    const premier = await planif.run(1_000, casse);
    expect(premier).toMatchObject({ traites: 1, echecs: 1 });
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 1_000 + 2_000, essais: 1 }]);
    expect(stockage.alarme).toBe(3_000);

    await planif.run(3_000, casse);
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 3_000 + 4_000, essais: 2 }]);
    await planif.run(7_000, casse);
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 7_000 + 8_000, essais: 3 }]);

    // Une demande neuve du cœur remet le compteur à zéro.
    planif.wake('AAAA', 20_000);
    expect(planif.reveils()).toEqual([{ code: 'AAAA', at: 20_000, essais: 0 }]);
  });

  it('plafonne le délai à 60 s', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 30].map(delaiEssai)).toEqual([
      2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000,
    ]);
  });

  it('ne lève jamais, même si tick lève de façon synchrone ou si le balayage casse', async () => {
    const { stockage, planif } = await monter({
      aBalayer: () => true,
      balayageMs: 1_000,
      balayer: () => {
        throw new Error('balayage cassé');
      },
    });
    planif.wake('AAAA', 1_000);
    const passage = await planif.run(5_000, () => {
      throw new Error('synchrone');
    });
    expect(passage.echecs).toBe(1);
    expect(stockage.alarme).not.toBeNull();
  });

  it('est idempotent : un second passage au même instant ne refait rien', async () => {
    const { planif } = await monter();
    planif.wake('AAAA', 1_000);
    let appels = 0;
    const tick = (): Promise<void> => {
      appels += 1;
      return Promise.resolve();
    };
    await planif.run(1_000, tick);
    await planif.run(1_000, tick);
    expect(appels).toBe(1);
  });

  it('prend 50 tables par passage, et réarme aussitôt pour la suite', async () => {
    const { stockage, planif } = await monter();
    for (let i = 0; i < LOT_DE_REVEILS + 7; i += 1) planif.wake(`T${String(i).padStart(3, '0')}`, 1_000 + i);
    const premier = await planif.run(10_000, () => Promise.resolve());
    expect(premier.traites).toBe(LOT_DE_REVEILS);
    expect(stockage.alarme).toBeLessThanOrEqual(10_000);
    const second = await planif.run(10_000, () => Promise.resolve());
    expect(second.traites).toBe(7);
    expect(stockage.alarme).toBeNull();
  });

  it('mesure le retard de l’alarme, le dernier et le pire', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 1_000);
    expect((await planif.run(1_250, () => Promise.resolve())).retardMs).toBe(250);
    planif.wake('AAAA', 2_000);
    expect((await planif.run(2_040, () => Promise.resolve())).retardMs).toBe(40);
    expect(lireMetaNombre(stockage, 'retard_dernier_ms')).toBe(40);
    expect(planif.mesures()).toMatchObject({ dernierRetardMs: 40, pireRetardMs: 250 });
  });

  it('balaye une fois par intervalle, quand il y a des tables', async () => {
    let balayages = 0;
    const { planif } = await monter({
      aBalayer: () => true,
      balayageMs: 10_000,
      balayer: () => {
        balayages += 1;
        return Promise.resolve();
      },
    });
    planif.rearm(); // programme le balayage à 10 000
    expect((await planif.run(5_000, () => Promise.resolve())).balaye).toBe(false);
    expect((await planif.run(10_000, () => Promise.resolve())).balaye).toBe(true);
    expect((await planif.run(12_000, () => Promise.resolve())).balaye).toBe(false);
    expect((await planif.run(20_000, () => Promise.resolve())).balaye).toBe(true);
    expect(balayages).toBe(2);
  });

  it('survit à une instance neuve : les réveils sont dans la base', async () => {
    const { stockage, planif } = await monter();
    planif.wake('AAAA', 1_000);
    const renee = new Planificateur(stockage, { maintenant: () => 0 });
    const appeles: string[] = [];
    await renee.run(1_000, (code) => {
      appeles.push(code);
      return Promise.resolve();
    });
    expect(appeles).toEqual(['AAAA']);
  });
});
