// Planche Far West (lot C — le quatrième habit) : 21 symboles, 3 faces,
// dos de la rue principale la nuit, frise du bourg, 18 coiffes.
import { K, F, page, setPfx, hach, grain, cartPath } from './lib.mjs';

const S = {
  encre: '#131A2E', papier: '#E9DAB7', bruni: '#F2E8CD', relief: '#0C0F1E', teinte: '#E0CFA9',
  craie: '#E08A70', or: '#E3B341', san: K.san, del: K.del, p1: K.p1, p2: K.p2, p3: K.p3,
};
const BOX = [0, 0, 32, 32];

export const SROLES = [
  { id: 'villageois', n: 1, nom: 'Pionnier', camp: 'bourg', leg: '« Le convoi passait. Personne n’a dormi. »', motif: 'carriole à couverture arquée' },
  { id: 'loup', n: 2, nom: 'Hors-la-loi', camp: 'bande', leg: '« Le bandana ne pardonne pas. »', motif: 'bandana sur le bas du visage' },
  { id: 'voyante', n: 3, nom: 'la Cartomancienne', camp: 'bourg', leg: '« Elle lit les cartes, jamais les visages. »', motif: 'trois cartes en éventail' },
  { id: 'sorciere', n: 4, nom: 'la Guérisseuse', camp: 'bourg', leg: '« Deux remèdes, et le mauvais. »', motif: 'mortier, deux fioles debout' },
  { id: 'chasseur', n: 5, nom: 'le Trappeur', camp: 'bourg', leg: '« Il vise mieux mort que debout. »', motif: 'carabine à levier, crosse à l’épaule' },
  { id: 'cupidon', n: 6, nom: 'le Prédicateur', camp: 'bourg', leg: '« Devant Dieu, il a dit. »', motif: 'bible ouverte, deux alliances' },
  { id: 'salvateur', n: 7, nom: 'le Juge de paix', camp: 'bourg', leg: '« Il retarde la corde, une nuit à la fois. »', motif: 'balance de juge de paix' },
  { id: 'idiot', n: 8, nom: 'l’Idiot du saloon', camp: 'bourg', leg: '« Pardonné au pied du gibet, et jamais écouté. »', motif: 'pinte renversée sur le comptoir' },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'bourg', leg: '« Il en a enterré d’autres, et pire. »', motif: 'puits à margelle et corde' },
  { id: 'corbeau', n: 10, nom: 'la Moucharde', camp: 'bourg', leg: '« Le mot glissé n’était pas signé. »', motif: 'affiche clouée au mur' },
  { id: 'bouc', n: 11, nom: 'l’Étranger', camp: 'bourg', leg: '« Un étranger pend mieux qu’un voisin. »', motif: 'manteau d’ailleurs, valise au pied' },
  { id: 'petiteFille', n: 12, nom: 'la Guetteuse', camp: 'bourg', leg: '« Compter les fusils, c’est déjà tirer. »', motif: 'lunette de laiton sur trépied' },
  { id: 'loupBlanc', n: 13, nom: 'le Chasseur de primes', camp: 'seul', leg: '« La bande ne trie pas ses balles, dit-on. »', motif: 'étoile de shérif barrée' },
  { id: 'villageois2', n: 14, nom: 'l’Honnête Fermier', camp: 'bourg', leg: '« Honnête des deux côtés du brevet. »', motif: 'brevet recto-verso, sceau d’or' },
  { id: 'renard', n: 15, nom: 'le Pisteur', camp: 'bourg', leg: '« Il lit la piste mieux que l’écriture. »', motif: 'fer à cheval, cinq trous' },
  { id: 'ours', n: 16, nom: 'le Rancher', camp: 'bourg', leg: '« Le chien le sait avant tout le monde. »', motif: 'portail de ranch et lasso' },
  { id: 'voleur', n: 17, nom: 'le Filou', camp: 'bourg', leg: '« Il ne vole pas : il emprunte sans rendre. »', motif: 'deux cartes face contre le bar' },
  { id: 'chienLoup', n: 18, nom: 'le Marshal', camp: 'bourg', leg: '« Deux camps, une seule étoile. »', motif: 'une étoile, deux moitiés' },
  { id: 'enfantSauvage', n: 19, nom: 'l’Émule', camp: 'bourg', leg: '« Il regarde faire, puis fait pareil. »', motif: 'un chapeau trop grand pour la tête' },
  { id: 'soeurs', n: 20, nom: 'les Deux Sœurs', camp: 'bourg', leg: '« Elles se sont reconnues à voix basse. »', motif: 'deux silhouettes, un seul voile' },
  { id: 'freres', n: 21, nom: 'les Trois Frères', camp: 'bourg', leg: '« Trois fois le même menton, trois fois la même parole. »', motif: 'trois silhouettes sous le même porche' },
];

const st = (d, c, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

const D = {
  villageois(o) {
    // la carriole du convoi : la couverture arquée, deux grosses roues
    const caisse = 'M4 20.6H28V26.8H4Z';
    return st('M5.4 20.6C6.4 13.2 11 9 16 9C21 9 25.6 13.2 26.6 20.6', o.ink, o.sw)
      + st(caisse, o.ink, o.sw)
      + st('M6 23.4H26', o.ink, o.sw * 0.5)
      + `<circle cx="8" cy="28.6" r="2.6" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.8}"/><circle cx="24" cy="28.6" r="2.6" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.8}"/>`
      + st('M4 31.2H9.4M22.6 31.2H28', o.ink, o.sw * 0.6);
  },
  loup(o) {
    // le bandana couvre le bas du visage ; le noeud flotte sur le côté
    const tete = 'M7 9.2C7 5.8 11 4.8 16 4.8C21 4.8 25 5.8 25 9.2V15C25 18.8 21 21.2 16 21.2C11 21.2 7 18.8 7 15Z';
    const bandeau = 'M6.8 13.2C9.8 15.2 22.2 15.2 25.2 13.2V16.8C22.8 19.6 19.6 21 16 21C12.4 21 9.2 19.6 6.8 16.8Z';
    const noeud = 'M25.2 15.4L28.8 12.8L27.6 17.6L31.2 16.2';
    return hach(bandeau, BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tete, o.ink, o.sw)
      + st(bandeau, o.ink, o.sw * 0.8)
      + `<circle cx="12.4" cy="10.8" r="0.9" fill="${o.ink}"/><circle cx="19.6" cy="10.8" r="0.9" fill="${o.ink}"/>`
      + st(noeud, o.ink, o.sw * 0.7);
  },
  voyante(o) {
    // trois cartes en éventail ; seule la carte du milieu garde sa lune
    const c1 = 'M10.4 5.6L16.8 7L13.4 19.8L7 18.4Z';
    const c2 = 'M14.6 4.6H21.2L20.2 17.8H13.8Z';
    const c3 = 'M24.4 6.4L19.6 4.4L18.4 17.2L24.8 18.2Z';
    return st(c1 + c2 + c3, o.ink, o.sw * 0.9)
      + st('M9.2 9.4L11 9.8M18.4 8.2H20.6', o.ink, o.sw * 0.5)
      + `<circle cx="17.2" cy="11.6" r="1.6" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.6}"/>`
      + st('M6.6 24.4C10 26 22 26 25.4 24.4', o.ink, o.sw * 0.6)
      + st('M6 28.4H26', o.ink, o.sw * 0.5);
  },
  sorciere(o) {
    // le mortier : deux fioles debout, le pilon en travers
    const mortier = 'M6.6 19.8H25.4L24 27.6H8Z';
    return st(mortier, o.ink, o.sw)
      + st('M4 19.8H28', o.ink, o.sw * 0.9)
      + st('M9 19.6V15H11.4V19.6M20.8 19.6V13.8H23.4V19.6', o.ink, o.sw * 0.7)
      + `<circle cx="10.2" cy="13.6" r="0.9" fill="${o.ink}"/><circle cx="22.1" cy="12.4" r="0.9" fill="${o.ink}"/>`
      + st('M6 30.4H26', o.ink, o.sw * 0.6);
  },
  chasseur(o) {
    // la carabine à levier : un canon, une boucle sous la gâchette
    const canon = 'M4.8 25.8L23.4 6.2L26.6 9L8.2 28.6Z';
    const crosse = 'M4.8 25.8L8.2 28.6L6.4 31.2C4.6 31 3.2 30 2.8 28.2Z';
    return hach(crosse, BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.ink })
      + st(canon, o.ink, o.sw)
      + st('M8.4 28.4L26 9.8', o.ink, o.sw * 0.5)
      + st(crosse, o.ink, o.sw)
      + st('M12.4 21.4C11.6 23.4 12.6 25.2 14.8 25.2C15.8 25.2 16.4 24.8 16.4 24.2', o.ink, o.sw * 0.7)
      + st('M23.4 6.2C24.6 4.8 26 4.6 27.4 5.4M26.6 9C28.2 8.6 29 8.8 29.8 9.8', o.ink, o.sw * 0.5);
  },
  cupidon(o) {
    // la bible ouverte sur le pupitre ; deux alliances posées dessus
    const livre = 'M4 12.6L16 9.4L28 12.6V26L16 22.8L4 26Z';
    return st(livre, o.ink, o.sw)
      + st('M16 9.4V22.8', o.ink, o.sw * 0.8)
      + st('M6.6 17L13 15.2M18.8 15.2L25.4 17', o.ink, o.sw * 0.5)
      + st('M11 6.6A2.6 2.6 0 1 0 16.2 6.6A2.6 2.6 0 1 0 11 6.6Z', o.accent, o.sw * 0.8)
      + st('M17.8 6.6A2.6 2.6 0 1 0 23 6.6A2.6 2.6 0 1 0 17.8 6.6Z', o.accent, o.sw * 0.8);
  },
  salvateur(o) {
    // la balance du juge de paix : deux plateaux, une loi pour deux nuits
    const panG = 'M2.8 17.4H13.6C13.6 20 11.6 21.6 8.2 21.6C4.8 21.6 2.8 20 2.8 17.4Z';
    const panD = 'M20.4 17.4H31.2C31.2 20 29.2 21.6 25.8 21.6C22.4 21.6 20.4 20 20.4 17.4Z';
    return st(panG + panD, o.ink, o.sw * 0.9)
      + st('M5.6 9.2L2.8 17.4M5.6 9.2L10.8 17.2M5.6 9.2H26.4M26.4 9.2L22 17.2M26.4 9.2L29.2 17.4', o.ink, o.sw * 0.7)
      + st('M16 9.2V27.6M10.4 27.6H21.6', o.ink, o.sw)
      + st('M4.6 17.2L11 17M20.4 17.2L27 17', o.ink, o.sw * 0.6)
      + st('M13.4 9.2C14.2 8 17.8 8 18.6 9.2', o.ink, o.sw * 0.6);
  },
  idiot(o) {
    // la pinte renversée : le comptoir tache, le bourg n'a pas soif
    const pinte = 'M10 12.4L20.8 14.2L19.2 22.6L9 20.6Z';
    return st('M3.4 22.8H28.6', o.ink, o.sw * 1.3)
      + st(pinte, o.ink, o.sw)
      + st('M20.8 15.4C23.4 15.8 23.6 18.4 21.2 19.6', o.ink, o.sw * 0.7)
      + st('M9.4 20.6C9 23.4 9.6 25.6 8.6 27.6M12.2 21C11.8 23 12 25.2 12.8 27', o.ink, o.sw * 0.6)
      + st('M6 30.4H26', o.ink, o.sw * 0.6);
  },
  ancien(o) {
    // le puits : la margelle de pierres, la corde qui sait depuis quand
    const margelle = 'M6 18.4H26L24.6 26H7.4Z';
    return hach(margelle, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(margelle, o.ink, o.sw)
      + st('M9 18.4L11 7.4M23 18.4L21 7.4M11 7.4H21', o.ink, o.sw * 0.8)
      + st('M16 7.4V14', o.ink, o.sw * 0.7)
      + st('M14 16.4C14 15.2 18 15.2 18 16.4', o.ink, o.sw * 0.6)
      + st('M5 29.4H27', o.ink, o.sw * 0.6);
  },
  corbeau(o) {
    // l'affiche clouée : la prime ne signe pas, elle attend
    const affiche = 'M6.4 5H25.6V24.4H6.4Z';
    return st(affiche, o.ink, o.sw)
      + hach(affiche, BOX, { pas: o.pas * 1.4, sw: o.hw, color: o.ink, op: 0.5 })
      + `<circle cx="9" cy="7.6" r="0.8" fill="${o.ink}"/><circle cx="23" cy="7.6" r="0.8" fill="${o.ink}"/>`
      + st('M9 17.4H23M9 20.4H19', o.ink, o.sw * 0.6)
      + st('M12 10.8C13.2 10.8 14 9.4 15.2 10C15.8 11.4 14.4 12.2 13.6 13C12.6 13.8 11.4 12.8 12 11.6C12.4 11 12.4 10.8 12 10.8Z', o.ink, o.sw * 0.7)
      + st('M5.4 27.4H26.6', o.ink, o.sw * 0.6);
  },
  bouc(o) {
    // l'étranger : le chapeau bas, la valise posée, personne ne sait d'où
    const manteau = 'M8.4 30.4L10.4 13.6H21.6L23.6 30.4Z';
    const valise = 'M22.6 26H29.4V30.4H22.6Z';
    return st(manteau, o.ink, o.sw)
      + st('M13 13.6C13 8.6 14.6 6.4 16 6.4C17.4 6.4 19 8.6 19 13.6', o.ink, o.sw * 0.8)
      + st('M10.4 16.4H21.6', o.ink, o.sw * 0.5)
      + st('M9 8.4H23', o.ink, o.sw * 0.9)
      + st(valise, o.ink, o.sw * 0.8)
      + st('M24.2 26V24.6H27.6V26', o.ink, o.sw * 0.5);
  },
  petiteFille(o) {
    // la lunette de laiton : trois pieds, une gorge qui voit large
    const tube = 'M8.4 20.4L22 12.2L24.4 16.8L10.8 25Z';
    return st(tube, o.ink, o.sw)
      + st('M20.6 13L23 16.8', o.ink, o.sw * 0.5)
      + st('M16 25.4V29', o.ink, o.sw * 0.8)
      + st('M16 29L9 30.8M16 29V31M16 29L23 30.8', o.ink, o.sw * 0.8)
      + st('M25.4 11.4C26.8 10.4 27.8 10.6 28.4 11.8', o.ink, o.sw * 0.6)
      + st('M5 28.6H27', o.ink, o.sw * 0.6);
  },
  loupBlanc(o) {
    // l'étoile barrée d'un trait : la prime ne se collecte pas entre amis
    const etoile = 'M16 3.4L18.7 10.9L26.8 11L20.5 16.2L22.9 24L16 19.4L9.1 24L11.5 16.2L5.2 11L13.3 10.9Z';
    return hach(etoile, BOX, { pas: o.pas, sw: o.hw, color: o.fluo })
      + st(etoile, o.fluo, o.sw * 0.9)
      + st('M3.6 26.4L28.6 5.6', o.ink, o.sw * 0.9)
      + st('M6 29.4C10 31 22 31 26 29.4', o.ink, o.sw * 0.6);
  },
  villageois2(o) {
    // le brevet recto-verso ; le sceau d'or, lui, n'a qu'une face
    const f1 = 'M4.6 7H15V26H4.6Z';
    const f2 = 'M14.2 9H26V28H14.2Z';
    return st(f2, o.ink, o.sw)
      + st(f1, o.ink, o.sw)
      + st('M7 11H12.4M7 14.4H11', o.ink, o.sw * 0.5)
      + hach('M16.8 22.6A3.4 3.4 0 1 0 23.6 22.6A3.4 3.4 0 1 0 16.8 22.6Z', BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.fluo })
      + st('M16.8 22.6A3.4 3.4 0 1 0 23.6 22.6A3.4 3.4 0 1 0 16.8 22.6Z', o.fluo, o.sw * 0.6)
      + st('M18.4 17.4C19.4 18 21 18 22 17.4', o.ink, o.sw * 0.5);
  },
  renard(o) {
    // le fer à cheval : cinq trous, une piste qui ne s'excuse pas
    const fer = 'M16 26.4C10.2 26.4 7.2 21.6 7.2 15.6C7.2 15.1 7.5 14.8 8 14.8H9.8C10.3 14.8 10.6 15.1 10.6 15.6C10.6 20.4 12.8 23.2 16 23.2C19.2 23.2 21.4 20.4 21.4 15.6C21.4 15.1 21.7 14.8 22.2 14.8H24C24.5 14.8 24.8 15.1 24.8 15.6C24.8 21.6 21.8 26.4 16 26.4Z';
    return hach(fer, BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(fer, o.ink, o.sw * 0.9)
      + `<circle cx="9.2" cy="12.8" r="0.7" fill="${o.ink}"/><circle cx="12.2" cy="10.6" r="0.7" fill="${o.ink}"/><circle cx="16" cy="9.6" r="0.7" fill="${o.ink}"/><circle cx="19.8" cy="10.6" r="0.7" fill="${o.ink}"/><circle cx="22.8" cy="12.8" r="0.7" fill="${o.ink}"/>`
      + st('M6 30.2H26', o.ink, o.sw * 0.6);
  },
  ours(o) {
    // le portail du ranch : la corde en boucle au milieu, le chien veille
    return st('M6 28V9.6M26 28V9.6', o.ink, o.sw)
      + st('M6 10.8C13 9.6 19 9.6 26 10.8M6 14.6C13 13.6 19 13.6 26 14.6', o.ink, o.sw * 0.6)
      + st('M19 19A3.6 3.6 0 1 0 26.2 19A3.6 3.6 0 1 0 19 19Z', o.ink, o.sw * 0.8)
      + st('M23.6 22.2L27.4 28.6', o.ink, o.sw * 0.8)
      + st('M6 30.6H26', o.ink, o.sw * 0.6);
  },
  voleur(o) {
    // deux cartes face contre le bar ; le talon, lui, n'a pas d'yeux
    const bar = 'M3 22.6H29';
    return st(bar, o.ink, o.sw * 1.2)
      + st('M9.6 8.6L16.8 9L16.2 21.4H9.4Z', o.ink, o.sw * 0.9)
      + st('M17.2 9L24.4 8.6L24.6 21.4L17.8 21.4Z', o.ink, o.sw * 0.9)
      + st('M13 11.2H13.6M13.8 19H14.4M21 11.4H21.6M21.8 19H22.4', o.ink, o.sw * 0.5)
      + st('M3 25.6H29', o.ink, o.sw * 0.6);
  },
  chienLoup(o) {
    // une étoile, deux moitiés : l'encre du bourg, l'or de la bande
    const etoile = 'M16 3.4L18.7 10.9L26.8 11L20.5 16.2L22.9 24L16 19.4L9.1 24L11.5 16.2L5.2 11L13.3 10.9Z';
    return hach('M16 3.4L13.3 10.9L5.2 11L11.5 16.2L9.1 24L16 19.4Z', BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + hach('M16 3.4L18.7 10.9L26.8 11L20.5 16.2L22.9 24L16 19.4Z', BOX, { pas: o.pas, sw: o.hw, color: o.fluo })
      + st(etoile, o.ink, o.sw * 0.9)
      + st('M16 3.6V19.4', o.ink, o.sw * 0.6)
      + st('M6 28.4C10 30 22 30 26 28.4', o.ink, o.sw * 0.6);
  },
  enfantSauvage(o) {
    // le chapeau trop grand : la tête grandira, le journal du lit non
    const bords = 'M4.4 18.2C8 20.2 24 20.2 27.6 18.2';
    return st(bords, o.ink, o.sw)
      + st('M9.8 17.4C9.8 11 12 8.4 16 8.4C20 8.4 22.2 11 22.2 17.4', o.ink, o.sw * 0.9)
      + st('M12.4 15.4C14.4 14.6 17.6 14.6 19.6 15.4', o.ink, o.sw * 0.5)
      + st('M16 20.2V22.6A4 4 0 0 1 8 22.6M16 20.2V22.6A4 4 0 0 0 24 22.6', o.ink, o.sw * 0.8)
      + st('M16 26.6V30.4', o.ink, o.sw * 0.6);
  },
  soeurs(o) {
    // deux silhouettes, un seul voile : le murmure les épouse
    const tete = (cx) => `M${cx - 4.4} 13.6A4.4 4.4 0 1 0 ${cx + 4.4} 13.6A4.4 4.4 0 1 0 ${cx - 4.4} 13.6Z`;
    const voile = 'M3.6 17.6C7.6 19.8 24.4 19.8 28.4 17.6L27.2 22C24 23.8 8 23.8 4.8 22Z';
    return hach(tete(10.4) + tete(21.6), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tete(10.4) + tete(21.6), o.ink, o.sw)
      + st(voile, o.ink, o.sw * 0.9)
      + st('M5.6 11C7.6 9.8 12.8 9.4 15 9.6M18.8 9.6C21 9.4 26.2 9.8 28.2 11', o.ink, o.sw * 0.6)
      + st('M6 28.6H26', o.ink, o.sw * 0.6);
  },
  freres(o) {
    // trois fois le même menton : le porche est commun, la parole aussi
    const tete = (cx) => `M${cx - 4.2} 12.4A4.2 4.2 0 1 0 ${cx + 4.2} 12.4A4.2 4.2 0 1 0 ${cx - 4.2} 12.4Z`;
    const mentons = [6.4, 16, 25.6];
    let s = '';
    for (const cx of mentons) s += hach(tete(cx), BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete(cx), o.ink, o.sw);
    return s
      + st('M2 17H30M4.6 17.4V27.2M27.4 17.4V27.2', o.ink, o.sw * 0.7)
      + st('M2 27.2H30', o.ink, o.sw * 0.7);
  },
};

export function gsym(id, size, o = {}) {
  const big = size >= 96;
  const opts = { ink: o.ink ?? S.encre, bg: o.bg ?? S.papier, accent: o.accent ?? S.san, mass: o.mass ?? S.encre, fluo: o.fluo ?? S.or, sw: big ? 0.8 : 2, hw: big ? 0.22 : 0.75, pas: big ? 1.05 : 3 };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;" aria-hidden="true">${D[id](opts)}</svg>`;
}

// ---- les 18 coiffes du bourg (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
const TETE = 'M32 21A8 8 0 1 1 16 21A8 8 0 1 1 32 21Z';
export const GCOIFFES = [
  // le chapeau de cow-boy garde ses bords relevés ; jamais droit sur la tête
  { id: 'cowboy', nom: 'chapeau de cow-boy', d: 'M15.4 17V10C15.4 8.2 19.4 7.2 24 7.2C28.6 7.2 32.6 8.2 32.6 10V17ZM8 17.6C13.4 19.4 34.6 19.4 40 17.6C39.2 21 30 21.6 24 21.6C18 21.6 8.8 21 8 17.6Z', plis: 'M18.4 12.4C20 11.6 28 11.6 29.6 12.4' },
  { id: 'sombrero', nom: 'sombrero de voyageur', d: 'M17.2 15.8L20.4 6.6H27.6L30.8 15.8ZM10.4 15.8C14 17.4 34 17.4 37.6 15.8L36.2 11.8C33 13.2 15 13.2 11.8 11.8Z', plis: 'M21.8 10.6H26.2' },
  // le casque de mineur porte sa lampe en avant ; la seule flamme en aplat
  { id: 'mineur', nom: 'casque de mineur', d: 'M16.6 16C16.6 10 19.6 7.4 24 7.4C28.4 7.4 31.4 10 31.4 16ZM14.6 16.4H33.4V19H14.6Z', fluo: 'M29.6 11.6A1.8 1.8 0 1 0 33.2 11.6A1.8 1.8 0 1 0 29.6 11.6Z', plis: 'M17.6 12.8C19.6 12 28.4 12 30.4 12.8' },
  { id: 'elixir', nom: 'casquette de vendeur d’élixir', d: 'M16.8 15.8C16.8 10.6 19.8 8 24 8C28.2 8 31.2 10.6 31.2 15.8ZM14.6 15.6H33.2V17.8H14.6ZM31.2 15.8H39.8V18.2H31.2Z', plis: 'M19 12.6C20.6 11.6 27.4 11.6 29 12.6' },
  { id: 'chercheurOr', nom: 'feutre de chercheur d’or', d: 'M16 16V9C16 7 19.6 6.4 24 6.4C28.4 6.4 32 7 32 9V16ZM14.6 16.2H33.4V18.6H14.6ZM15.6 18.4C14 19 12.6 18.6 12 17.4M32.4 18.4C34 19 35.4 18.6 36 17.4', plis: 'M22.2 8.6V15' },
  { id: 'pasteur', nom: 'chapeau plat de pasteur', d: 'M15.8 15V11C15.8 9.6 19.6 8.8 24 8.8C28.4 8.8 32.2 9.6 32.2 11V15ZM13.6 15H34.4V17.6H13.6Z', plis: 'M19 10.8H29' },
  // le bonnet de fourrure garde ses rabats sur les oreilles, comme la chapka
  { id: 'trappeur', nom: 'bonnet de fourrure du trappeur', d: 'M14.8 16C13 10 17 7.2 24 7.2C31 7.2 35 10 33.2 16ZM14.8 14.6L10.4 15.4V19.4L15.2 18.6M33.2 14.6L37.6 15.4V19.4L32.8 18.6', plis: 'M18 11.4L19.2 13L20.8 11.6L22.2 13.2M24.4 11.4L25.6 13L27.2 11.6L28.6 13.2' },
  { id: 'cagoule', nom: 'cagoule de bandit', d: 'M16 13.4H32L30.8 30.4C30.4 34.6 27.6 36.8 24 36.8C20.4 36.8 17.6 34.6 17.2 30.4Z', plis: 'M20 20.4A1.6 1.6 0 1 0 23.2 20.4A1.6 1.6 0 1 0 20 20.4ZM24.8 20.4A1.6 1.6 0 1 0 28 20.4A1.6 1.6 0 1 0 24.8 20.4Z' },
  { id: 'bandana', nom: 'bandana de voleur de bétail', d: 'M16.2 15.4C15.8 10.6 19 8.6 24 8.6C29 8.6 32.2 10.6 31.8 15.4ZM31.8 12.4L37.2 10.8L35.6 14.4L38.4 17.2L33.6 17', plis: 'M18.4 12.8C20 11.6 28 11.6 29.6 12.8' },
  // le képi de shérif porte son étoile en or, seul aplat du rang
  { id: 'kepi', nom: 'képi de shérif', d: 'M17 16V10.6C17 9.2 19.4 8.4 24 8.4C28.6 8.4 31 9.2 31 10.6V16ZM15.6 16H32.4V18H15.6ZM31 16.2H36.6V18H31Z', fluo: 'M25.4 9.6L26.2 10.9L27.8 11.1L26.6 12.1L27 13.6L25.4 12.9L23.8 13.6L24.2 12.1L23 11.1L24.6 10.9Z' },
  { id: 'train', nom: 'casquette de conducteur de train', d: 'M16.8 16V10C16.8 8.8 19.8 8.2 24 8.2C28.2 8.2 31.2 8.8 31.2 10V16ZM15.6 16.4H33.2V18.4H15.6ZM31.2 16.6H41.6V18.6H31.2Z', plis: 'M19 10.8C20.6 10 27.4 10 29 10.8' },
  { id: 'veuve', nom: 'bonnet de veuve', d: 'M16.6 15.2C16.6 10 19.6 7.4 24 7.4C28.4 7.4 31.4 10 31.4 15.2ZM15.4 15.4C15 20 15.6 24 17.4 26.4M32.6 15.4C33 20 32.4 24 30.6 26.4', plis: 'M18 12.6C20 11.6 28 11.6 30 12.6' },
  { id: 'ferme', nom: 'foulard de dame de ferme', d: 'M16.4 15.6C16.4 10.6 19.6 8 24 8C28.4 8 31.6 10.6 31.6 15.6ZM31.6 13.2L36.8 10.8L35.4 14.8L37.6 17.6L33.6 17', plis: 'M17.6 13C19.6 11.8 28.4 11.8 30.4 13' },
  { id: 'banquier', nom: 'chapeau haut de forme du banquier', d: 'M17.4 6.8H30.6V15.6H17.4ZM12.6 15.6H35.4V18.2H12.6Z', plis: 'M17.4 12.4H30.6' },
  { id: 'cavalier', nom: 'capuche de cavalier', d: 'M24 5.4C17 5.4 12.4 12 12.4 19.8L10.6 34L7.6 48H40.4L37.4 34L35.6 19.8C35.6 12 31 5.4 24 5.4Z', capuche: true },
  { id: 'calot', nom: 'calot de télégraphiste', d: 'M17 15.6C17 12.2 20 10.4 24 10.4C28 10.4 31 12.2 31 15.6ZM30 15.4H39.2V17H30Z', plis: 'M18.8 13.4H29.2' },
  { id: 'croqueMort', nom: 'bonnet de nuit du croque-mort', d: 'M16.8 16C16.8 10.4 20 7.4 24 7.4C26.8 7.4 28.6 9 28.6 9L27 12.2L31.6 10.8C31.6 13.4 30.2 15.6 28.4 16Z', plis: 'M28.6 9C28.2 11 27 12.8 25.2 13.8M31.6 10.8L34.6 9.8' },
  { id: 'danseuse', nom: 'chapeau à plumes de danseuse', d: 'M17.4 14.6C17.4 11.4 20 9.6 24 9.6C28 9.6 30.6 11.4 30.6 14.6ZM13.8 16.4C14 15.2 15 14.6 24 14.6C33 14.6 34 15.2 34.2 16.4C34 17.8 32 18.6 24 18.6C16 18.6 14 17.8 13.8 16.4Z', fluo: 'M30.6 11.4C33.8 9.4 35.6 7.4 35 5C32 5.6 30 8 29 11Z', plis: 'M18.8 12.4C20.4 11.6 27.6 11.6 29.2 12.4' },
];
function gcoiffe(c, ink, bg, fluo, sil = false) {
  if (sil) return `<path d="${EPAULES}" fill="${ink}"/>${c.capuche ? '' : `<path d="${TETE}" fill="${ink}"/>`}<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>`;
  let s = '';
  if (!c.capuche) {
    s += hach(EPAULES, [0, 24, 48, 24], { pas: 4, sw: 0.8, color: ink }) + `<path d="${EPAULES}" fill="none" stroke="${ink}" stroke-width="1"/>`;
    s += hach(TETE, [14, 11, 20, 20], { pas: 6, sw: 0.6, color: ink }) + `<path d="${TETE}" fill="none" stroke="${ink}" stroke-width="1"/>`;
    s += `<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>`;
  } else {
    s += hach(c.d, [6, 4, 36, 44], { pas: 2.4, sw: 0.7, color: ink, rule: 'evenodd' }) + `<path d="${c.d}" fill="none" stroke="${ink}" stroke-width="1.2" fill-rule="evenodd"/>`;
    s += hach(TETE, [16, 13, 16, 16], { pas: 6, sw: 0.6, color: ink }) + `<path d="${TETE}" fill="none" stroke="${ink}" stroke-width="0.8"/>`;
  }
  if (c.fluo) s += `<path d="${c.fluo}" fill="${fluo}" fill-rule="evenodd"/>`;
  if (c.plis) s += `<path d="${c.plis}" stroke="${bg}" stroke-width="0.8"/>`;
  return s;
}
const svg48 = (inner, size) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display: block;" aria-hidden="true">${inner}</svg>`;

// ---- les faces
function gcuv(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${S.teinte}"/><path d="M${x} ${y + h}V${y}H${x + w}" fill="none" stroke="${S.encre}" stroke-opacity="0.38"/><path d="M${x + w} ${y}V${y + h}H${x}" fill="none" stroke="${S.bruni}" stroke-width="1.5"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="none" stroke="${S.encre}" stroke-opacity="0.14"/>`;
}
function gcart(kind, x, y, w, h, mot) {
  const ordre = kind !== 'ecu';
  return `<path d="${cartPath(kind, w, h)}" transform="translate(${x} ${y})" fill="${S.bruni}" stroke="${ordre ? S.san : S.encre}" stroke-width="${ordre ? 2 : 1.5}"/><text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="${F.ss}" font-size="14" font-weight="${ordre ? 600 : 400}" fill="${ordre ? S.san : S.encre}">${mot}</text>`;
}
export function gface(id) {
  const r = SROLES.find((x) => x.id === id);
  let s = `<rect width="300" height="420" fill="${S.bruni}"/><rect x="0.5" y="0.5" width="299" height="419" fill="none" stroke="${K.p2}"/>`;
  s += gcuv(12, 12, 276, 396);
  const rect = 'M24 24h252v264h-252Z', ov = 'M54 154A96 112 0 1 0 246 154A96 112 0 1 0 54 154Z';
  // le fond suit le camp : hachure du bourg, aquatinte de la bande
  if (r.camp === 'bande') s += grain(rect + ov, [24, 24, 252, 264], { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
  else s += hach(rect + ov, [24, 24, 252, 264], { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
  s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/><ellipse cx="150" cy="154" rx="96" ry="112" fill="none" stroke="${S.encre}"/><ellipse cx="150" cy="154" rx="92.5" ry="108.5" fill="none" stroke="${S.encre}" stroke-width="0.5"/>`;
  s += gsym(id, 128, { bg: S.teinte }).replace('<svg ', '<svg x="86" y="88" ');
  s += `<rect x="244" y="24" width="32" height="24" fill="${S.teinte}" stroke="${S.encre}" stroke-width="0.75"/><text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${S.del}">${r.n}</text>`;
  s += r.camp === 'bourg' ? gcart('ecu', 84, 275, 132, 26, 'Le bourg') : r.camp === 'bande' ? gcart('mordu', 84, 275, 132, 26, 'La bande') : gcart('mordu2', 84, 275, 132, 26, 'Seul');
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="${r.nom.length > 16 ? 24 : 28}" fill="${S.encre}">${r.nom}</text>`;
  s += `<text x="150" y="364" text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${S.del}">${r.leg}</text>`;
  s += `<text x="150" y="386" text-anchor="middle" font-family="${F.sc}" font-size="13" letter-spacing="0.8" fill="${S.del}">${r.motif}</text>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}
export function gdos() {
  let s = `<rect width="300" height="420" fill="${S.relief}"/><rect x="12" y="12" width="276" height="396" fill="${S.encre}"/><rect x="12" y="12" width="276" height="396" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
  s += `<rect x="12.5" y="12.5" width="275" height="395" fill="none" stroke="${K.p3}"/><rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const V = S.papier;
  // la lune sur le désert, pleine et cratéreuse
  s += `<circle cx="244" cy="60" r="17" fill="none" stroke="${V}" stroke-width="1.2"/><circle cx="238" cy="56" r="2.4" fill="none" stroke="${V}" stroke-width="0.6"/><circle cx="249" cy="64" r="1.6" fill="none" stroke="${V}" stroke-width="0.6"/>`;
  // les étoiles de la prairie
  s += `<g fill="${S.craie}" opacity="0.5"><circle cx="50" cy="48" r="0.8"/><circle cx="96" cy="36" r="0.7"/><circle cx="150" cy="54" r="0.8"/><circle cx="190" cy="40" r="0.7"/><circle cx="80" cy="70" r="0.7"/></g>`;
  // la rue principale et l'horizon
  s += `<path d="M36 150H264" stroke="${V}" stroke-width="1.2"/><path d="M96 150L62 364M208 150L240 364" stroke="${V}" stroke-width="0.9"/><path d="M150 152V364" stroke="${V}" stroke-width="0.7" stroke-dasharray="6 7" opacity="0.7"/>`;
  // l'église au clocher carré, à gauche
  s += `<path d="M42 150V116H78V150" fill="none" stroke="${V}" stroke-width="1.2"/><path d="M52 116V92H68V116" fill="none" stroke="${V}" stroke-width="1"/><path d="M60 92V84M56 87H64" stroke="${V}" stroke-width="0.8"/>`;
  // les deux cactus du désert
  s += `<path d="M230 150V134M226 140V132C226 130 228 129 229 130V140M234 136V129C234 127 236 127 236 129V136" stroke="${V}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
  // le saloon au milieu : l'auvent à festons, les portes à battants
  s += `<path d="M112 150V108H188V150" fill="none" stroke="${V}" stroke-width="1.4"/><path d="M108 108H192" stroke="${V}" stroke-width="1.4"/><path d="M112 118H188" stroke="${V}" stroke-width="0.8"/><path d="M124 130V150M176 130V150" stroke="${V}" stroke-width="0.8"/><path d="M136 150V132C136 130 138 129 140 129V150M160 150V132C160 130 158 129 156 129V150" stroke="${V}" stroke-width="0.9" fill="none"/><path d="M118 108L122 114M188 108L184 114" stroke="${V}" stroke-width="0.8"/>`;
  // la veilleuse du comptoir : le seul or en aplat de toute la planche
  s += `<path d="M168 138A5 5 0 1 0 178 138A5 5 0 1 0 168 138Z" fill="${S.or}"/><path d="M170 144L172 150" stroke="${V}" stroke-width="0.9"/>`;
  // la potence au bout de la rue, à droite
  s += `<path d="M252 150V96M252 96H272" stroke="${V}" stroke-width="1.4" stroke-linecap="round"/><path d="M268 96V112" stroke="${V}" stroke-width="0.9"/><path d="M266 112C264 116 268 120 268 116" stroke="${V}" stroke-width="0.7" fill="none"/><path d="M246 150H258" stroke="${V}" stroke-width="1.4"/>`;
  s += `<path d="M30 364H270" stroke="${V}" stroke-width="1"/>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte Far West : la rue principale du bourg, la nuit">${s}</svg>`;
}
export function friseRue(w, nuit) {
  const base = 56;
  const ix = w * 0.46;
  const V = S.papier;
  let s = nuit ? `<rect width="${w}" height="56" fill="${S.encre}"/><rect width="${w}" height="56" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>` : `<rect width="${w}" height="56" fill="${S.papier}"/><rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  // les cactus de la prairie
  const cactus = (x, h) => `M${x} ${base}V${base - h - 6}M${x - 4} ${base - h + 5}C${x - 6} ${base - h + 2} ${x - 6} ${base - h - 1} ${x - 4} ${base - h - 2}M${x + 4} ${base - h + 8}C${x + 6} ${base - h + 5} ${x + 6} ${base - h + 2} ${x + 4} ${base - h - 1}`;
  s += `<path d="${[cactus(w * 0.12, 14), cactus(w * 0.83, 17), cactus(w * 0.94, 12)].join('')}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  // la nuit, la lune veille au-dessus du désert
  if (nuit) s += `<circle cx="${w * 0.86}" cy="18" r="6" fill="none" stroke="${S.craie}" stroke-width="1"/><path d="M${w * 0.07} 26C${w * 0.05} 24 ${w * 0.09} 24 ${w * 0.07} 26ZM${w * 0.11} 22C${w * 0.09} 20 ${w * 0.13} 20 ${w * 0.11} 22Z" stroke="${S.craie}" stroke-width="1" fill="none"/>`;
  // le saloon et son auvent à festons
  s += `<path d="M${ix - 36} ${base}V${base - 22}H${ix + 36}V${base}" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.1"/><path d="M${ix - 40} ${base - 22}H${ix + 40}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.1"/><path d="M${ix - 24} ${base}V${base - 10}M${ix + 24} ${base}V${base - 10}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.9"/><path d="M${ix - 8} ${base}V${base - 8}C${ix - 8} ${base - 11} ${ix - 5} ${base - 11} ${ix - 5} ${base - 8}V${base}M${ix + 8} ${base}V${base - 8}C${ix + 8} ${base - 11} ${ix + 5} ${base - 11} ${ix + 5} ${base - 8}V${base}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.9" fill="none"/>`;
  // la veilleuse du comptoir, seul or plein de la frise
  s += `<path d="M${ix + 16} ${base - 5}A2 2 0 1 0 ${ix + 20} ${base - 5}A2 2 0 1 0 ${ix + 16} ${base - 5}Z" fill="${S.or}"/>`;
  s += `<path d="M0 ${base}H${w}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1"/>`;
  return `<svg width="${w * 1.5}" height="84" viewBox="0 0 ${w} 56" style="display: block;" role="img" aria-label="Frise de la rue principale, ${nuit ? 'nuit' : 'jour'}">${s}</svg>`;
}
export function farwest() {
  setPfx('cFW');
  const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
  const sc = (t) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${S.del};">${t}</div>`;
  const corps = (t, w) => `<p style="margin: 0; font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.del}; width: ${w}px;">${t}</p>`;
  let b = `<svg width="1600" height="1520" viewBox="0 0 1600 1520" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="1600" height="1520" fill="#000" filter="url(#papier)" opacity="0.2"/></svg>`;
  b += abs(48, 36, `${sc('Garoutom · Caprices · lot C — le quatrième habit')}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${S.encre};">Far West — le désert contre la bande</h1><p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 18px; line-height: 24px; color: ${S.del};">« Un étranger pend mieux qu’un voisin. » — la légende du bourg.</p>`, 'width: 1000px;');
  b += abs(1100, 40, corps('Seuls changent les valeurs, les motifs et les mots : nuit bleue du territoire #131A2E sur poussière de sentier #E9DAB7 ; la bande garde sa sanguine ; l’or de l’étoile n’existe qu’en hachure à 45° — seule la veilleuse du comptoir est or plein. Règle-signature : la potence se dresse au bout de la rue, jamais au centre.', 420));
  b += abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${S.del};">Pl. C-VII</span>`, 'width: 52px; text-align: right;');
  b += `<div style="position: absolute; left: 48px; top: 132px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 21 symboles
  const pasSym = 1504 / SROLES.length;
  SROLES.forEach((r, i) => {
    const x = 48 + i * pasSym;
    b += abs(x + (pasSym - 64) / 2, 152, gsym(r.id, 64));
    b += abs(x, 226, `<div style="width: ${pasSym - 8}px;">${sc(`${r.n} · ${r.nom}`)}<p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 16px; line-height: 20px; color: ${S.del};">${r.leg}</p><div style="margin-top: 4px; font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${S.encre};">${r.motif}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 436px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // trois faces et le dos
  const faces = [['loup', 'Le Hors-la-loi sur l’aquatinte de la bande : bandana en hachure, noeud au vent — l’encre de la planche n’existe pas sur la carte.'], ['villageois', 'Le Pionnier : l’encre de la nuit bleue, la hachure ordinaire, la carriole du convoi posée droite.'], ['loupBlanc', 'Le Chasseur de primes : carte brunie, aucune aquatinte ; l’étoile d’or barrée, le cartouche « Seul ».']];
  faces.forEach(([id, t], i) => {
    const x = 48 + i * 330;
    b += abs(x, 456, gface(id));
    b += abs(x, 886, corps(t, 300));
  });
  b += abs(1038, 456, gdos());
  b += abs(1038, 886, corps('Dos de la nuit : la rue principale au clair de lune — le saloon, l’église au clocher carré, la potence au bout ; la veilleuse du comptoir seul or plein, le reste au trait de papier sur l’aquatinte IV.', 300));
  b += `<div style="position: absolute; left: 48px; top: 950px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 18 coiffes, deux rangs de neuf
  b += abs(48, 968, sc('Les dix-huit coiffes du bourg (sièges 1 à 18, moitié en gravure, moitié en silhouette)'));
  GCOIFFES.forEach((c, i) => {
    const x = 48 + (i % 9) * 166;
    const y = i < 9 ? 994 : 1106;
    b += abs(x, y, `<div style="width: 150px;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width: 64px; height: 64px; border: 1px solid ${K.p2}; background: ${S.bruni};">${svg48(gcoiffe(c, S.encre, S.bruni, S.or), 62)}</div>${svg48(gcoiffe(c, S.encre, S.bruni, S.or, true), 40)}</div><div style="margin-top: 3px; font-family: ${F.ss}; font-size: 12px; line-height: 15px; color: ${S.encre};">${c.nom}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 1240px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // la frise de la rue principale
  b += abs(48, 1258, sc('La frise — la rue du bourg au lieu des toits (mobile 390, agrandie 150 %)'));
  b += abs(48, 1284, friseRue(390, false));
  b += abs(48, 1380, friseRue(390, true));
  // ce qui change
  const rows = [
    ['encre', '#131A2E nuit bleue du territoire · la nuit tombée'],
    ['papier', '#E9DAB7 · la poussière du long sentier'],
    ['bruni', '#F2E8CD · les midi sans diligence'],
    ['l’or', '#E3B341 en hachure à 45° · plein pour la veilleuse seule'],
    ['la bande', 'même sanguine — les hors-la-loi ne changent pas de sang'],
    ['cartouches', '« Le bourg » · « La bande » · « Seul »'],
    ['teinte de planche', '#E0CFA9 (proposée ici, à remonter)'],
    ['règle-signature', 'la potence se dresse au bout de la rue, jamais au centre'],
  ];
  b += abs(700, 1258, sc('Ce qui change — et rien d’autre'));
  b += abs(700, 1284, `<div style="display: grid; grid-template-columns: 150px 330px; gap: 6px 16px; width: 496px;">${rows.map(([a, c]) => `<div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${S.del};">${a}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.encre};">${c}</div>`).join('')}</div>`);
  // les cartouches
  b += abs(1230, 1258, sc('Cartouches du bourg'));
  b += abs(1230, 1284, `<svg width="320" height="150" viewBox="0 0 320 150" role="img" aria-label="Cartouches Le bourg, La bande, Seul">${gcart('ecu', 0, 0, 140, 30, 'Le bourg')}${gcart('mordu', 160, 0, 140, 30, 'La bande')}${gcart('mordu2', 0, 50, 140, 30, 'Seul')}${gcart('ecu', 160, 50, 140, 30, 'Le bourg')}</svg>`);
  return page({ title: 'C-FarWest', w: 1600, h: 1520, bg: `background-color: ${S.papier}; background-image: repeating-linear-gradient(90deg, rgba(19,26,46,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(19,26,46,.035) 0 .6px, transparent .6px 3px); color: ${S.encre};`, body: b });
}
