// La partie témoin (§ 7.3). Clément meurt la nuit I (aube I), Jules est exécuté le jour I,
// l'aube II est paisible (choix aligné sur le lot E2b).
export const NOMS = ['Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Fanny', 'Gaspard', 'Hélène', 'Inès', 'Jules', 'Tom', 'Léa',
  'Malo', 'Nour', 'Octave', 'Paulette', 'Quentin', 'Rose'];

export const ROLE = {
  villageois: { type: 'ecu', txt: 'Villageois·e', camp: 'Village' },
  loup: { type: 'mordu', txt: 'Loup-garou', camp: 'Meute' },
  idiot: { type: 'ecu', txt: 'l’Idiot du village', camp: 'Village' },
  bouc: { type: 'ecu', txt: 'le Bouc émissaire', camp: 'Village' },
};

/** Table de n (6, 12, 18) avec états ; `etats` : { nom: {…} } */
export function table(n, etats = {}) {
  let noms = n === 6 ? ['Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Tom'] : NOMS.slice(0, n);
  return noms.map((nom, i) => ({ siege: i + 1, nom, e: { ...(etats[nom] || {}) } }));
}

// Les morts publics du Jour II
export const MORTS_J2 = { Clément: { mort: true, role: ROLE.villageois }, Jules: { mort: true, role: ROLE.loup } };

/** La scène de référence : Jour II à 12, vous = Tom (§ 7.8 Jour-12) */
export function scene12(extra = {}) {
  return table(12, {
    ...MORTS_J2,
    Anna: { choisi: true },
    Bastien: { vote: true },
    Delphine: { vote: true },
    Étienne: { capitaine: true, vote: true },
    Gaspard: { vote: true },
    Léa: { vote: true },
    Tom: { moi: true, nonChoisissable: true },
    ...extra,
  });
}

export const PROMPT_JOUR_COURT = 'Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise.';
export const PROMPT_JOUR = 'Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.';
export const CRIEUR_J2 = { rub: 'Aube II', txt: 'Personne n’est mort cette nuit. Le village se réveille entier.' };
