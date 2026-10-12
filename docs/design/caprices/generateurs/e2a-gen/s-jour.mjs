// Lot E2a — les écrans de jour mobiles (gabarit unique). Jour-12 est la référence.
import { page, PAPIER, CUIVRE, st, esc } from './base.mjs';
import { grille } from './jeton.mjs';
import { ecranMobile, voix, bouton } from './gabarit.mjs';
import { table, scene12, MORTS_J2, ROLE, PROMPT_JOUR_COURT, CRIEUR_J2 } from './tables.mjs';

const MINU = { reste: '1:42', pleins: 14 };
const barreVote = (T, nom) => bouton(T, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(T, 'primaire', `Voter contre ${nom}`, { icon: 'index' });
const raison = (T, id, txt) => `<span id="${id}" style="${st({ fontSize: 12, lineHeight: '16px', color: T.encre2 })}">${esc(txt)}</span>`;

/* 1. Jour-12 — l'écran de référence */
export function jour12(T = PAPIER, fichier = 'Caprices-E2-Jour-12.dc.html', titre = 'E2 · Jour 12') {
  page({ fichier, titre, w: 390, h: 844, T, corps: ecranMobile(T, {
    heure: 'Jour II', minuterie: MINU, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
    place: grille(scene12(), 'D2', T, 263, 399),
    resume: { g: voix(T, 'Anna'), d: '6 sur 10' },
    pli: { type: 'ecu', txt: 'Le village', n: 3 },
    barre: barreVote(T, 'Anna'),
  }) });
}
jour12();

/* 2. Jour-6 — D1 */
page({ fichier: 'Caprices-E2-Jour-6.dc.html', titre: 'E2 · Jour 6', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour II', minuterie: MINU, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
  place: grille(table(6, { Clément: MORTS_J2.Clément, Anna: { choisi: true }, Bastien: { vote: true }, Étienne: { capitaine: true, vote: true }, Tom: { moi: true, nonChoisissable: true } }), 'D1', PAPIER, 263, 399),
  resume: { g: voix(PAPIER, 'Anna'), d: '3 sur 5' },
  pli: { type: 'ecu', txt: 'Le village', n: 3 },
  barre: barreVote(PAPIER, 'Anna'),
}) });

/* 3. Jour-18 — D3, vous = Rose ; Bastien marqué +2, Paulette absente */
page({ fichier: 'Caprices-E2-Jour-18.dc.html', titre: 'E2 · Jour 18', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour II', minuterie: MINU,
  crieur: { rub: 'Aube II', txt: 'Le Corbeau a désigné Bastien : au vote du jour, deux voix sont déjà comptées.' },
  consigne: { txt: PROMPT_JOUR_COURT },
  place: grille(table(18, { ...MORTS_J2, Anna: { choisi: true }, Bastien: { marque: true, vote: true }, Delphine: { vote: true }, Étienne: { capitaine: true, vote: true },
    Gaspard: { vote: true }, Léa: { vote: true }, Malo: { vote: true }, Nour: { vote: true }, Paulette: { absent: '23 s' }, Rose: { moi: true, nonChoisissable: true } }), 'D3', PAPIER, 263, 399),
  resume: { g: voix(PAPIER, 'Anna'), d: '8 sur 16' },
  pli: { type: 'ecu', txt: 'Le village', n: 7 },
  barre: barreVote(PAPIER, 'Anna'),
}) });

/* 4. Jour-Arme — premier toucher sur « Voter contre Anna » */
page({ fichier: 'Caprices-E2-Jour-Arme.dc.html', titre: 'E2 · Jour armé', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour II', minuterie: { reste: '1:38', pleins: 14 }, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
  place: grille(scene12(), 'D2', PAPIER, 263, 399),
  resume: { g: voix(PAPIER, 'Anna', ' · touchez encore pour confirmer'), d: '6 sur 10' },
  pli: { type: 'ecu', txt: 'Le village', n: 3 },
  barre: bouton(PAPIER, 'outil', '', { icon: 'main', aria: 'S’abstenir' }) + bouton(PAPIER, 'arme', 'Confirmer : Anna à la potence', { armeFilet: 0.62 }),
}) });

/* 5. Jour-Abstention — le secondaire armé */
page({ fichier: 'Caprices-E2-Jour-Abstention.dc.html', titre: 'E2 · Abstention armée', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour II', minuterie: { reste: '1:36', pleins: 13 }, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
  place: grille(scene12(), 'D2', PAPIER, 263, 399),
  resume: { g: voix(PAPIER, 'Anna', ' · l’abstention la retire'), d: '6 sur 10' },
  pli: { type: 'ecu', txt: 'Le village', n: 3 },
  barre: bouton(PAPIER, 'arme', 'Confirmer l’abstention', { armeFilet: 0.4 }) + bouton(PAPIER, 'outil', '', { icon: 'index', aria: 'Voter contre Anna' }),
}) });

/* 6. Jour-12-Cuivre — le repli de l'amendement D11 */
jour12(CUIVRE, 'Caprices-E2-Jour-12-Cuivre.dc.html', 'E2 · Jour 12 cuivre');

/* 7. Jour-Mort — vous = Clément */
page({ fichier: 'Caprices-E2-Jour-Mort.dc.html', titre: 'E2 · Jour mort', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour II', minuterie: MINU, crieur: CRIEUR_J2, consigne: { legende: 'Tout voir, enfin, et trop tard.' },
  place: grille(table(12, { ...MORTS_J2, Clément: { ...MORTS_J2.Clément, moi: true }, Bastien: { vote: true }, Delphine: { vote: true }, Étienne: { capitaine: true, vote: true }, Gaspard: { vote: true }, Léa: { vote: true } }), 'D2', PAPIER, 263, 399, { interactif: false }),
  resume: { g: raison(PAPIER, 'r-mort', 'Les morts ne votent pas.'), d: '5 sur 10' },
  pli: { type: 'audela', txt: 'L’au-delà', n: 4 },
  barre: bouton(PAPIER, 'appui', 'Gardez le pouce : ma carte'),
}) });

/* 8. Jour-Gracie — vous = Inès, Jour III */
page({ fichier: 'Caprices-E2-Jour-Gracie.dc.html', titre: 'E2 · Jour gracié', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour III', minuterie: { reste: '2:10', pleins: 17 },
  crieur: { rub: 'Aube III', txt: 'La meute a dévoré Fanny — c’était Cupidon.', mort: true },
  consigne: { legende: 'Gracié, et toujours pas écouté.' },
  place: grille(table(12, { ...MORTS_J2, Fanny: { mort: true, role: { type: 'ecu', txt: 'Cupidon', camp: 'Village' } }, Inès: { moi: true, gracie: true, role: ROLE.idiot },
    Bastien: { vote: true }, Delphine: { vote: true }, Étienne: { capitaine: true, vote: true }, Léa: { vote: true } }), 'D2', PAPIER, 263, 399, { interactif: false }),
  resume: { g: raison(PAPIER, 'r-grace', 'La grâce vous a coûté votre voix.'), d: '4 sur 8' },
  pli: { type: 'ecu', txt: 'Le village', n: 2 },
  barre: bouton(PAPIER, 'eteint', 'Voter', { icon: 'index', describedby: 'r-grace' }),
}) });

/* 9. Jour-Bouc-Votants — vous = Rose, table de 18, Jour III */
const designes = ['Anna', 'Léa', 'Malo'];
const etBouc = { Clément: MORTS_J2.Clément, Jules: MORTS_J2.Jules, Quentin: { mort: true, role: ROLE.bouc } };
for (const n of ['Anna', 'Bastien', 'Delphine', 'Étienne', 'Fanny', 'Gaspard', 'Hélène', 'Inès', 'Tom', 'Léa', 'Malo', 'Nour', 'Octave', 'Paulette', 'Rose'])
  etBouc[n] = designes.includes(n) ? { votera: true } : { horsVote: true };
etBouc.Malo.vote = true; etBouc.Étienne.capitaine = true; etBouc.Rose.moi = true;
page({ fichier: 'Caprices-E2-Jour-Bouc-Votants.dc.html', titre: 'E2 · Votants du Bouc', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour III', minuterie: { reste: '2:40', pleins: 21 },
  crieur: { rub: 'Jour II', txt: 'Dernier mot du Bouc émissaire : demain, seuls voteront Anna, Léa et Malo.' },
  consigne: { legende: 'Il fallait bien quelqu’un.' },
  place: grille(table(18, etBouc), 'D3', PAPIER, 263, 399, { interactif: false }),
  resume: { g: raison(PAPIER, 'r-bouc', 'Le Bouc émissaire ne vous a pas désigné·e.'), d: '1 sur 3' },
  pli: { type: 'ecu', txt: 'Le village', n: 4 },
  barre: bouton(PAPIER, 'eteint', 'Voter', { icon: 'index', describedby: 'r-bouc' }),
}) });

/* 10. Election — Jour I, vous = Tom (soi choisissable) */
page({ fichier: 'Caprices-E2-Election.dc.html', titre: 'E2 · Élection', w: 390, h: 844, T: PAPIER, corps: ecranMobile(PAPIER, {
  heure: 'Jour I', minuterie: { reste: '0:52', pleins: 9 },
  crieur: { rub: 'Jour I', txt: 'Le village se choisit un capitaine.' },
  consigne: { txt: 'Élisez votre capitaine — un vivant, vous compris — ou abstenez-vous.' },
  place: grille(table(12, { Clément: MORTS_J2.Clément, Étienne: { choisi: true }, Bastien: { vote: true }, Delphine: { vote: true }, Hélène: { vote: true }, Tom: { moi: true } }), 'D2', PAPIER, 263, 399),
  resume: { g: voix(PAPIER, 'Étienne'), d: '4 sur 11' },
  pli: { type: 'ecu', txt: 'Le village', n: 5 },
  barre: bouton(PAPIER, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(PAPIER, 'primaire', 'Élire Étienne', { icon: 'index' }),
}) });
