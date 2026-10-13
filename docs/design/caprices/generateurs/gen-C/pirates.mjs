// Planche Pirates (lot C — le quatrième habit) : 21 symboles, 3 faces,
// dos du trois-mâts la nuit, frise du bastingage, 18 coiffes.
import { K, F, page, setPfx, hach, grain, cartPath } from './lib.mjs';

const S = {
  encre: '#10171A', papier: '#E2D8BA', bruni: '#EFE7CE', relief: '#1A2E30', teinte: '#DACFB0',
  rouge: '#962E20', craie: '#DE7B60', or: '#C9971F', san: K.san, del: K.del, p1: K.p1, p2: K.p2, p3: K.p3,
};
const BOX = [0, 0, 32, 32];

export const SROLES = [
  { id: 'villageois', n: 1, nom: 'Matelot', camp: 'equipage', leg: '« Deux mains calleuses, aucun ordre à donner. »', motif: 'corde à deux mains, poulie de drisse' },
  { id: 'loup', n: 2, nom: 'Mutin', camp: 'mutinerie', leg: '« Le couteau dort sous la couchette. »', motif: 'couteau sous la couchette' },
  { id: 'voyante', n: 3, nom: 'la Vigie', camp: 'equipage', leg: '« Elle voit tout, du haut du grand mât. »', motif: 'longue-vue sur son support' },
  { id: 'sorciere', n: 4, nom: 'la Guérisseuse', camp: 'equipage', leg: '« Deux remèdes, et la mauvaise. »', motif: 'sacoche de bord, deux fioles' },
  { id: 'chasseur', n: 5, nom: 'le Canonnier', camp: 'equipage', leg: '« Il vise mieux couché que debout. »', motif: 'canon de bord et son boulet' },
  { id: 'cupidon', n: 6, nom: 'le Barbier', camp: 'equipage', leg: '« Un rasoir, et deux anneaux. »', motif: 'rasoir, deux anneaux, un ruban' },
  { id: 'salvateur', n: 7, nom: 'le Charpentier', camp: 'equipage', leg: '« Il calfate la brèche, pas la tempête. »', motif: 'marteau à calfat sur les planches' },
  { id: 'idiot', n: 8, nom: 'l’Idiot de l’équipage', camp: 'equipage', leg: '« Gracié, et toujours pas écouté. »', motif: 'pancarte clouée au grand mât' },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'equipage', leg: '« Trois naufrages à son tableau de service. »', motif: 'ancre couchée sur sa chaîne' },
  { id: 'corbeau', n: 10, nom: 'la Bouteille à la mer', camp: 'equipage', leg: '« Le parchemin n’était pas signé. »', motif: 'bouteille couchée sur les flots' },
  { id: 'bouc', n: 11, nom: 'le Nouveau', camp: 'equipage', leg: '« Embarqué la veille, sacrifié le lendemain. »', motif: 'rouleau de matelas ficelé' },
  { id: 'petiteFille', n: 12, nom: 'la Clandestine', camp: 'equipage', leg: '« Du grand mât, elle compte les couteaux. »', motif: 'œil au bordage, trois planches' },
  { id: 'loupBlanc', n: 13, nom: 'le Flibustier', camp: 'seul', leg: '« La cale ne contrôle pas la cale, dit-on. »', motif: 'bourse de doublons, pièce à pied' },
  { id: 'renard', n: 14, nom: 'la Fouine', camp: 'equipage', leg: '« Elle connaît le navire par l’odeur. »', motif: 'trappe de cale entrouverte' },
  { id: 'ours', n: 15, nom: 'le Boucanier', camp: 'equipage', leg: '« Le chien le sait avant la vigie. »', motif: 'chien de bord, arcs de grognement' },
  { id: 'villageois2', n: 16, nom: 'le Corsaire', camp: 'equipage', leg: '« Lettres de marque des deux côtés. »', motif: 'lettres ouvertes, ruban d’or' },
  { id: 'voleur', n: 17, nom: 'le Forban', camp: 'equipage', leg: '« Il ne vole pas : il repêche. »', motif: 'deux cartes repêchées des flots' },
  { id: 'chienLoup', n: 18, nom: 'le Renégat', camp: 'equipage', leg: '« Deux pavillons, une seule part. »', motif: 'deux pavillons, un doublon' },
  { id: 'enfantSauvage', n: 19, nom: 'le Moussaillon', camp: 'equipage', leg: '« Il regarde faire, puis fait pareil. »', motif: 'trois-mâts dans sa bouteille' },
  { id: 'soeurs', n: 20, nom: 'les Deux Sœurs', camp: 'equipage', leg: '« Elles se sont reconnues à voix basse. »', motif: 'deux têtes, un seul bandana' },
  { id: 'freres', n: 21, nom: 'les Trois Frères', camp: 'equipage', leg: '« Trois fois la même houle, trois fois la même parole. »', motif: 'trois têtes sur la lisse' },
];

const st = (d, c, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

const D = {
  villageois(o) {
    // la drisse : deux mains sur la corde, la poulie en haut
    const corde = 'M5.4 26.6L26.6 5.4';
    return st(corde, o.ink, o.sw)
      + st('M5.4 26.6L7 28.2L8.6 26.6L7 25Z M26.6 5.4L25 7L23.4 5.4L25 3.8Z', o.ink, o.sw * 0.6)
      + st('M10.8 17.8C9.2 19 9.4 21.2 11.4 21.6C12.4 20 12.4 18.6 10.8 17.8Z M19.2 9.4C17.6 10.6 17.8 12.8 19.8 13.2C20.8 11.6 20.8 10.2 19.2 9.4Z', o.ink, o.sw * 0.8)
      + `<circle cx="26" cy="6" r="3.2" fill="none" stroke="${o.ink}" stroke-width="${o.sw}"/><circle cx="26" cy="6" r="1.1" fill="${o.ink}"/>`
      + st('M9.4 21.8L11 24.2M18.2 13.4L19.8 15.8', o.ink, o.sw * 0.5)
      + st('M8.4 28.8H24.8', o.ink, o.sw * 0.7);
  },
  loup(o) {
    // le couteau sous la couchette : il dort, la pointe au bordage
    const couchette = 'M6.4 6.4H25.6M6.4 6.4V24.8M25.6 6.4V24.8M6.4 12H25.6';
    const lame = 'M6.8 25.6L20.4 23.2L23.2 25L20.6 26.8L7.2 26.9Z';
    return st(couchette, o.ink, o.sw)
      + hach('M6.4 12H25.6V24.8H6.4Z', BOX, { pas: o.pas * 1.8, sw: o.hw * 0.7, color: o.ink, op: 0.4 })
      + hach(lame, BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.mass, rule: 'evenodd' })
      + st(lame, o.ink, o.sw * 0.9)
      + st('M20.4 23.2L23.2 25L20.6 26.8', o.mass, o.sw * 0.5)
      + st('M6 29.6H26', o.ink, o.sw * 0.6);
  },
  voyante(o) {
    // la longue-vue sur son support, trois traits de mire
    const tube = 'M6.6 20.4L14 13L19.6 18.6L12.2 26L6.6 20.4Z';
    const gros = 'M19.6 18.6L24.6 13.4L29 17.8L25.4 23Z';
    return hach(tube, BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tube, o.ink, o.sw)
      + st(gros, o.ink, o.sw)
      + st('M14 13L19.6 18.6M12.2 26L6.6 20.4', o.ink, o.sw * 0.6)
      + st('M16 11L13.2 8.2M19.8 9.4L17.8 5.6M23.4 9.8L22.6 6.4', o.ink, o.sw * 0.7)
      + st('M4.4 28.8H10.8', o.ink, o.sw * 0.7);
  },
  sorciere(o) {
    // la sacoche de bord : deux fioles debout, le rabat entrouvert
    const sac = 'M4.6 13.4H27.4L28.8 27.8H3.6Z';
    return st(sac, o.ink, o.sw)
      + st('M4.6 13.4L8.8 8.6L14.6 13.4', o.ink, o.sw * 0.8)
      + st('M11.4 13.2C11.4 9.2 18.6 9.2 18.6 13.2M18.6 13.2C18.6 9.2 25.4 9.2 25.4 13.2', o.ink, o.sw * 0.7)
      + `<circle cx="15" cy="7.4" r="0.9" fill="${o.ink}"/><circle cx="22" cy="7.4" r="0.9" fill="${o.ink}"/>`
      + st('M7.4 18.4H24.6', o.ink, o.sw * 0.6)
      + st('M3.8 30.4H28.2', o.ink, o.sw * 0.7);
  },
  chasseur(o) {
    // le canon de bord : gueule à gauche, roue sous l'affût, boulet au sol
    const tube = 'M4.4 12.6H26.2V17.4H4.4Z';
    return st(tube, o.ink, o.sw)
      + st('M4.4 10.4V19.6M2.4 11.4V18.6', o.ink, o.sw * 0.9)
      + st('M26.2 12.6V17.4H28.8V12.6Z', o.ink, o.sw * 0.7)
      + st('M8 17.4L10 22.6M22 17.4L20 22.6M10 22.6H20', o.ink, o.sw * 0.8)
      + `<circle cx="15" cy="24.6" r="3.6" fill="none" stroke="${o.ink}" stroke-width="${o.sw}"/><circle cx="15" cy="24.6" r="1.2" fill="${o.ink}"/>`
      + st('M25.8 24.4C27.6 24 29 24.8 29.2 26.4', o.ink, o.sw * 0.8)
      + st('M7.6 29.6H26', o.ink, o.sw * 0.6);
  },
  cupidon(o) {
    // le rasoir du Barbier : deux anneaux, un ruban
    const lame = 'M5.2 24.4L22.6 7L25.8 10.2L8.4 27.6Z';
    return st(lame, o.ink, o.sw)
      + st('M22.6 7L25.8 10.2', o.ink, o.sw * 0.6)
      + st('M12.6 18.4A5 5 0 1 0 12.6 18.4M20.4 12.6A5 5 0 1 0 20.4 12.6', o.ink, o.sw * 1.3)
      + st('M14.2 23.8C13 25.6 11.4 26.4 9.6 26C8.4 25.6 8.4 24 9.6 23.4', o.accent, o.sw * 0.8)
      + st('M5.2 29.6H26.8', o.ink, o.sw * 0.7);
  },
  salvateur(o) {
    // le marteau à calfat : couture de suif entre deux planches
    const planches = 'M3.4 20.4H28.6M3.4 24.6H28.6';
    const teteM = 'M6.6 8.4H19L17.6 12.4H8Z';
    return st(planches, o.ink, o.sw * 0.9)
      + st('M3.4 20.4V24.6H28.6V20.4', o.ink, o.sw * 0.5)
      + hach('M3.4 20.4H28.6V24.6H3.4Z', BOX, { pas: o.pas * 1.6, sw: o.hw * 0.7, color: o.ink, op: 0.45 })
      + st(teteM, o.ink, o.sw)
      + st('M12.8 12.4L13.8 19.6', o.ink, o.sw)
      + st('M4.8 28.4C8 27.2 12 26.8 16 26.8C20 26.8 24 27.2 27.2 28.4', o.ink, o.sw * 0.6);
  },
  idiot(o) {
    // la pancarte clouée au grand mât : trois mots, zéro réponse
    const plaque = 'M8 4.6H26V15H8Z';
    return st(plaque, o.ink, o.sw)
      + hach(plaque, BOX, { pas: o.pas * 1.4, sw: o.hw, color: o.ink, op: 0.5 })
      + st('M10.8 7.6H23.2M10.8 10H20.6', o.ink, o.sw * 0.8)
      + st('M16.4 2.4V29.6', o.ink, o.sw)
      + `<circle cx="16.4" cy="9" r="0.8" fill="${o.ink}"/>`
      + st('M11 29.8H21.6', o.ink, o.sw * 0.7);
  },
  ancien(o) {
    // l'ancre couchée : trois naufrages, une seule chaîne
    const ancre = 'M6 8.6L21.4 24M21.4 24C22.6 25.2 22.6 26.8 21.4 27.2C20.2 27.6 18.6 27 18 25.8C19 26.8 20.4 27 21.4 24Z';
    return st('M6 8.6L8.4 6.2M6 8.6L18.2 22.6M8.4 6.2L4.8 9.8', o.ink, o.sw * 0.8)
      + st(ancre, o.ink, o.sw)
      + st('M9.8 12.4L14.4 8.4M12.2 15.2L17.4 11', o.ink, o.sw * 0.7)
      + hach('M20.4 8.6A2 2 0 1 0 24.4 8.6A2 2 0 1 0 20.4 8.6ZM22.6 16A2 2 0 1 0 26.6 16A2 2 0 1 0 22.6 16Z', BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st('M20.4 8.6A2 2 0 1 0 24.4 8.6A2 2 0 1 0 20.4 8.6ZM22.6 16A2 2 0 1 0 26.6 16A2 2 0 1 0 22.6 16ZM23.4 10.6V14M23.4 18V22.4', o.ink, o.sw * 0.8)
      + st('M5.4 29.6H26.6', o.ink, o.sw * 0.6);
  },
  corbeau(o) {
    // la bouteille à la mer : le parchemin roule dans le verre
    const corps = 'M7.4 15.2L19.6 9.6L23.4 17.6L11.2 23.2Z';
    const goulot = 'M19.6 9.6L24.6 8.2L26.6 14.6L23.4 17.6';
    return hach(corps, BOX, { pas: o.pas * 1.2, sw: o.hw * 0.8, color: o.ink, op: 0.4, rule: 'evenodd' })
      + st(corps, o.ink, o.sw)
      + st(goulot, o.ink, o.sw)
      + st('M24.9 8L27.2 7.4L28.6 11.4L26.7 11.9', o.ink, o.sw * 0.7)
      + st('M10.6 17L14 15.4L16 19.4L12.6 21', o.ink, o.sw * 0.6)
      + st('M4.6 26.2C7 24.6 9 24.6 11.4 26.2C13.4 27.6 15.4 27.6 17.4 26.2M13 28.8C15 27.4 16.6 27.4 18.6 28.4C20 29 21.4 29 22.8 28.4', o.ink, o.sw * 0.8);
  },
  bouc(o) {
    // le rouleau du Nouveau : ficelé la veille, déjà sacrifié
    const rouleau = 'M5.8 11.6H22.6V19.6H5.8Z';
    const boudin = 'M22.6 13.4C26.4 12.6 28.6 14.2 28.2 16.2C27.8 18 25.2 18.6 22.6 17.8';
    return hach(rouleau, BOX, { pas: o.pas * 1.3, sw: o.hw * 0.8, color: o.ink, rule: 'evenodd' })
      + st(rouleau, o.ink, o.sw)
      + st(boudin, o.ink, o.sw * 0.9)
      + st('M9.6 11.6V19.6M18.6 11.6V19.6', o.ink, o.sw * 0.9)
      + st('M9.6 11.4C9.6 9.8 12 9.8 12 11.4M18.6 19.8C18.6 21.4 16.2 21.4 16.2 19.8', o.ink, o.sw * 0.5)
      + st('M4.4 25H27.6M7.4 27.6H24.6', o.ink, o.sw * 0.7);
  },
  petiteFille(o) {
    // l'œil au bordage : trois planches, un seul interstice
    const planches = 'M6 4.6V27.4M13.4 4.6V27.4M18.6 4.6V27.4M26 4.6V27.4';
    return st(planches, o.ink, o.sw)
      + hach('M6 4.6H13.4V27.4H6ZM18.6 4.6H26V27.4H18.6Z', BOX, { pas: o.pas * 1.5, sw: o.hw * 0.8, color: o.ink, rule: 'evenodd' })
      + st('M13.4 10.2C12.4 11.6 12.4 14.4 13.4 15.8C14.4 14.4 14.4 11.6 13.4 10.2ZM13.4 16.2C12.6 17.4 12.6 19.6 13.4 20.8C14.2 19.6 14.2 17.4 13.4 16.2Z', o.ink, o.sw * 0.7)
      + `<circle cx="16" cy="13" r="2.4" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.sw * 0.8}"/><circle cx="16" cy="13" r="0.9" fill="${o.ink}"/>`
      + st('M4 29.8H28', o.ink, o.sw * 0.6);
  },
  loupBlanc(o) {
    // la bourse du Flibustier : les doublons sont à lui seul
    const bourse = 'M12.4 13.2C8.6 16.4 6.4 20.4 6.4 24.4C6.4 27 8.2 28.4 11.2 28.4H19.6C22.6 28.4 24.4 27 24.4 24.4C24.4 20.4 22.2 16.4 18.4 13.2Z';
    const cordon = 'M13.6 11.4C14.8 10 17.2 10 18.4 11.4';
    return hach(bourse, BOX, { pas: o.pas, sw: o.hw, color: o.accent, rule: 'evenodd' })
      + st(bourse, o.accent, o.sw)
      + st(cordon, o.accent, o.sw * 0.9)
      + st('M14 12.2C14.8 13 15.6 13 16.4 12.2M16.4 12.2C17.2 13 18 13 18.8 12.2', o.accent, o.sw * 0.6)
      + hach('M20.4 7.4A2.2 2.2 0 1 0 24.8 7.4A2.2 2.2 0 1 0 20.4 7.4Z', BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.or, rule: 'evenodd' })
      + st('M20.4 7.4A2.2 2.2 0 1 0 24.8 7.4A2.2 2.2 0 1 0 20.4 7.4Z', o.or, o.sw * 0.8)
      + hach('M22.6 4.2A1.8 1.8 0 1 0 26.2 4.2A1.8 1.8 0 1 0 22.6 4.2Z', BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.or, rule: 'evenodd' })
      + st('M22.6 4.2A1.8 1.8 0 1 0 26.2 4.2A1.8 1.8 0 1 0 22.6 4.2Z', o.or, o.sw * 0.8);
  },
  renard(o) {
    // la trappe de cale : elle connaît le navire par l'odeur
    const cadre = 'M5.4 22.6L20.6 16.6L25.8 29.6L10.6 25.6Z';
    const panneau = 'M5.4 22.6L20.6 16.6L22.6 21.6L7.4 27.6Z';
    return st(cadre, o.ink, o.sw)
      + hach(panneau, BOX, { pas: o.pas * 1.2, sw: o.hw * 0.8, color: o.ink, rule: 'evenodd', op: 0.6 })
      + st(panneau, o.ink, o.sw * 0.7)
      + st('M13.2 20.4L14.2 22.4M17.6 18.8L18.6 20.8', o.ink, o.sw * 0.6)
      + st('M12.2 10.4C13.4 10.4 14 11.2 14 12.2C14 13.4 13 14.2 11.8 14.2C10.4 14.2 9.6 13.2 9.6 11.8C9.6 10 11 8.6 13 8.6C14.8 8.6 16 9.6 16.6 11M19 6.6C20.6 7.4 21.4 8.8 21.4 10.6C21.4 12.8 19.8 14.4 17.6 14.6', o.ink, o.sw * 0.7);
  },
  ours(o) {
    // le chien de bord : collier à pointes, il grogne avant la vigie
    const tete = 'M8.4 13C8.4 9 11.6 6.4 15.4 6.4C19.2 6.4 22.4 9 22.4 13.4C22.4 15 21.8 16.2 20.8 17.2L20.4 19.6H17.6L16.6 21.4L14.6 19.4C11.4 19 8.4 17.4 8.4 13Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(tete, o.ink, o.sw)
      + `<circle cx="17.8" cy="11.8" r="0.9" fill="${o.ink}"/>`
      + st('M10.8 10.2L12.6 8.6M13.8 8.2L14.8 6.6', o.ink, o.sw * 0.6)
      + st('M6.4 22.6C8.4 22 9.4 20.8 9.2 19.2', o.ink, o.sw * 0.9)
      + st('M25.4 12.6C27 12 27.8 10.8 27.6 9.2M24.6 16.6C26.4 16.2 27.4 15 27.4 13.4', o.ink, o.sw * 0.7)
      + st('M5.4 25.6C7 25 7.8 23.8 7.6 22.4M6.2 28C7.6 27.4 8.2 26.4 8 25.2', o.ink, o.sw * 0.6);
  },
  villageois2(o) {
    // les lettres de marque : un seul ruban pour deux volets
    const volet = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(4.6)} 8.6L${X(14)} 7L${X(15.6)} 9.4L${X(14.4)} 26H${X(4.4)}L${X(4.6)} 8.6Z`; };
    const ruban = 'M15.2 7.4L16.8 6.4L17.6 26.4L16 27.4Z';
    return hach(volet(1) + volet(0), BOX, { pas: o.pas * 1.4, sw: o.hw * 0.8, color: o.ink, rule: 'evenodd', op: 0.55 })
      + st(volet(1) + volet(0), o.ink, o.sw * 0.9)
      + st('M7 12.4H12M7 16H11M20 12.4H25M21 16H25', o.ink, o.sw * 0.5)
      + hach(ruban, BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.or, rule: 'evenodd' })
      + st(ruban, o.or, o.sw * 0.6)
      + `<circle cx="16" cy="22" r="2.2" fill="none" stroke="${o.accent}" stroke-width="${o.sw * 0.8}"/>`;
  },
  voleur(o) {
    // deux cartes repêchées : le forban ne vole rien, la mer rend
    const carte1 = 'M6.6 13.2L15.4 9.6L18.2 16.4L9.4 20Z';
    const carte2 = 'M17.4 14.6L26.4 12.8L27.6 20.6L18.6 22.4Z';
    return st(carte1, o.ink, o.sw)
      + st(carte2, o.ink, o.sw)
      + st('M14.8 11.4L16.8 15.8M22.6 14.6L24.6 18.8', o.ink, o.sw * 0.5)
      + st('M23.4 13.4L26 12.8', o.ink, o.sw * 0.5)
      + st('M4.4 25.4C6.6 23.8 8.8 23.8 11 25.4C13 26.8 15 26.8 17 25.4M15 27.8C17 26.4 18.8 26.4 20.8 27.6C22.4 28.6 24.2 28.6 26 27.8', o.ink, o.sw * 0.8);
  },
  chienLoup(o) {
    // deux pavillons hissés, une seule part au partage
    const margeG = 'M4.4 4.6V27.6M4.4 4.6L7.2 6.6L4.4 8.6';
    const margeD = 'M27.6 4.6V27.6M27.6 4.6L24.8 6.6L27.6 8.6';
    const fanionG = 'M4.4 6.4H12.6L9.8 9L12.6 11.6H4.4Z';
    const fanionD = 'M27.6 12.6H19.4L22.2 15.2L19.4 17.8H27.6Z';
    return st(margeG + margeD, o.ink, o.sw)
      + hach(fanionG, BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(fanionG, o.ink, o.sw * 0.9)
      + hach(fanionD, BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(fanionD, o.ink, o.sw * 0.9)
      + hach('M13.4 22.8A3 3 0 1 0 19.4 22.8A3 3 0 1 0 13.4 22.8Z', BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.or, rule: 'evenodd' })
      + st('M13.4 22.8A3 3 0 1 0 19.4 22.8A3 3 0 1 0 13.4 22.8Z', o.or, o.sw * 0.8)
      + st('M3.4 28.4H28.6', o.ink, o.sw * 0.7);
  },
  enfantSauvage(o) {
    // le trois-mâts dans sa bouteille : il regarde faire, puis fait pareil
    const corps = 'M9.4 16.2C9.4 12.8 12.6 10.8 16.6 10.8H20.6C24.6 10.8 27.8 12.8 27.8 16.2C27.8 19.6 24.6 21.6 20.6 21.6H16.6C12.6 21.6 9.4 19.6 9.4 16.2Z';
    return st(corps, o.ink, o.sw)
      + st('M20.6 10.8V7.6H23.4V13.6M9.4 16.2H27.8', o.ink, o.sw * 0.6)
      + st('M4.6 8.8H7.2M7.2 8.8L5.4 9.4C6.4 10.2 6.4 11 5.4 11.8L7.2 12.4H4.6', o.ink, o.sw * 0.6)
      + st('M12.8 18.6H24.6L23.4 20.4H14Z', o.ink, o.sw * 0.8)
      + st('M15 18V14.6M18.6 18V14.6M22.2 18V14.6', o.ink, o.sw * 0.7)
      + st('M14.2 14.6H23.4M14.6 12.8H23', o.ink, o.sw * 0.5)
      + st('M7.8 25.4C9.4 24 11 24 12.6 25.4C14 26.6 15.6 26.6 17 25.4C18.6 24 20.2 24 21.8 25.4C23.2 26.6 24.8 26.6 26.2 25.4', o.ink, o.sw * 0.7);
  },
  soeurs(o) {
    // deux têtes, un seul bandana noué des deux fronts
    const tete = (cx) => `M${cx - 4.4} 14.6A4.4 4.4 0 1 0 ${cx + 4.4} 14.6A4.4 4.4 0 1 0 ${cx - 4.4} 14.6Z`;
    const bandeau = 'M5.8 11.6C9.8 13.4 22.2 13.4 26.2 11.6L25.6 14.4C22 15.8 10 15.8 6.4 14.4Z';
    const noeud = 'M16 12.6L14.2 17.4M16 12.6L18.2 16.4';
    return hach(tete(10.4) + tete(21.6), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tete(10.4) + tete(21.6), o.ink, o.sw)
      + st(bandeau, o.accent, o.sw * 0.9)
      + st(noeud, o.accent, o.sw * 0.8)
      + `<circle cx="12" cy="17.6" r="0.9" fill="${o.ink}"/><circle cx="20" cy="17.6" r="0.9" fill="${o.ink}"/>`
      + st('M13.8 23.8C14.6 23.4 15.4 23.4 16.2 23.8', o.ink, o.sw * 0.6)
      + st('M6 27.8H26', o.ink, o.sw * 0.7);
  },
  freres(o) {
    // trois têtes sur la lisse : la même houle, la même parole
    const tete = (cx) => `M${cx - 4.2} 12.6A4.2 4.2 0 1 0 ${cx + 4.2} 12.6A4.2 4.2 0 1 0 ${cx - 4.2} 12.6Z`;
    let s = '';
    for (const cx of [6.4, 16, 25.6]) s += hach(tete(cx), BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete(cx), o.ink, o.sw);
    return s
      + st('M3.6 19.4H28.4M3.6 22H28.4', o.ink, o.sw * 0.7)
      + st('M6.4 17.2V22M16 17.2V22M25.6 17.2V22', o.ink, o.sw * 0.5)
      + st('M5 27.4C7.2 26.2 9 26.2 11 27.4C13 28.6 14.8 28.6 16.8 27.4C18.8 26.2 20.6 26.2 22.6 27.4C24.6 28.6 26.2 28.6 27.6 27.4', o.ink, o.sw * 0.6);
  },
};

export function gsym(id, size, o = {}) {
  const big = size >= 96;
  const opts = { ink: o.ink ?? S.encre, bg: o.bg ?? S.papier, accent: o.accent ?? S.san, mass: o.mass ?? S.encre, or: o.or ?? S.or, sw: big ? 0.8 : 2, hw: big ? 0.22 : 0.75, pas: big ? 1.05 : 3 };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;" aria-hidden="true">${D[id](opts)}</svg>`;
}

// ---- les 18 coiffes du bord (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
const TETE = 'M32 21A8 8 0 1 1 16 21A8 8 0 1 1 32 21Z';
export const GCOIFFES = [
  // le tricorne : trois cornes relevées, la cocarde du côté du cœur
  { id: 'tricorne', nom: 'tricorne de capitaine', d: 'M15 16.4C14.6 10 18.6 6.4 24 6.4C29.4 6.4 33.4 10 33 16.4ZM13 16.8L19.4 11.8L24 15.6L28.6 11.8L35 16.8L33.4 18.6L28 15.4L24 18.6L20 15.4L14.6 18.6Z', plis: 'M17.4 13C19.4 12.2 28.6 12.2 30.6 13' },
  { id: 'bicorne', nom: 'bicorne d’officier', d: 'M16.2 16.8C15 10.8 18.8 7.2 24 7.2C29.2 7.2 33 10.8 31.8 16.8ZM12.8 16.6H35.2V19.2H12.8Z', plis: 'M18 12.6C20 11.6 28 11.6 30 12.6' },
  { id: 'bandana', nom: 'bandana rouge', d: 'M15.8 17.2C15.8 11 19.4 8.4 24 8.4C28.6 8.4 32.2 11 32.2 17.2ZM31.6 12.4L36.2 9.8L35 13.8L37.6 16.8L32.6 16.6Z', plis: 'M18 14.4C20 13.4 28 13.4 30 14.4' },
  { id: 'gabier', nom: 'calotte de gabier', d: 'M16.6 15.4C16.6 11.6 19.6 9.6 24 9.6C28.4 9.6 31.4 11.6 31.4 15.4ZM15.4 15.4H32.6V17H15.4Z', plis: 'M18.6 13.6H29.4' },
  { id: 'laine', nom: 'bonnet de laine', d: 'M16.6 15.6C16.6 9.8 19.8 6.6 24 6.6C28.2 6.6 31.4 9.8 31.4 15.6V17.4H16.6ZM15.4 16.8H32.6V19.6H15.4Z', plis: 'M19 11.2C21 10.4 27 10.4 29 11.2' },
  { id: 'paille', nom: 'chapeau de paille de pêcheur', d: 'M7 14.6H41V16.6H7ZM17 14.4C17 10.6 20 8.6 24 8.6C28 8.6 31 10.6 31 14.4Z', plis: 'M18.8 12.2H29.2M19.8 10.2H28.2' },
  { id: 'plume', nom: 'chapeau à plume', d: 'M15.4 15.6C15.4 10.6 19 8.4 24 8.4C29 8.4 32.6 10.6 32.6 15.6ZM13.6 15.4H34.4C33.2 18 29.4 18.8 24 18.8C18.6 18.8 14.8 18 13.6 15.4ZM14.4 14.4C13 12.6 12.8 10 14 7.6C15 9.2 15.2 11 14.4 14.4Z', plis: 'M17 13.4C19 12.4 29 12.4 31 13.4' },
  // la capuche de ciré couvre tête et épaules — jamais le visage
  { id: 'cirot', nom: 'capuche de ciré', d: 'M24 4.6C17 4.6 12.4 11.4 12.4 19.2L10.6 34L7.6 48H40.4L37.4 34L35.6 19.2C35.6 11.4 31 4.6 24 4.6Z', capuche: true },
  { id: 'suroit', nom: 'suroit de quart', d: 'M16.8 15.4C16.8 11.6 19.8 9.6 24 9.6C28.2 9.6 31.2 11.6 31.2 15.4ZM15.6 15.2H32.4L31 18.8C28.4 19.8 19.6 19.8 17 18.8Z', plis: 'M18.6 13.6H29.4' },
  { id: 'maitre', nom: 'foulard de maître d’équipage', d: 'M16 15.2C16 10.4 19.6 8 24 8C28.4 8 32 10.4 32 15.2ZM31.8 12.8L36.4 10.4L35.2 14.4L38 17.2L32.6 16.6Z', plis: 'M17.6 12.8C19.6 11.6 28.4 11.6 30.4 12.8' },
  { id: 'turban', nom: 'turban de cuisinier', d: 'M15.6 15.4C14 10.4 17.8 6 24 6C30.2 6 34 10.4 32.4 15.4ZM14.8 15.4H33.2V17.6H14.8Z', plis: 'M17.2 13.2C19.2 12 28.8 12 30.8 13.2M19 10.4C21 9.6 27 9.6 29 10.4' },
  { id: 'calfat', nom: 'casquette de calfat', d: 'M17 16.4V10.6C17 9.2 20 8.4 24 8.4C28 8.4 31 9.2 31 10.6V16.4ZM16.6 16.4H33.4V18H16.6ZM31 16.4H38.6V18.8H31Z', plis: 'M19.6 13.4C21.6 12.6 26.4 12.6 28.4 13.4' },
  { id: 'pompon', nom: 'bonnet à pompon', d: 'M17 16.8C17 9.8 19.8 6.4 24 6.4C28.2 6.4 31 9.8 31 16.8ZM16 16.8C16 15.6 32 15.6 32 16.8C32 18.2 16 18.2 16 16.8Z', plis: 'M21.8 5.4A2.2 2.2 0 1 0 26.2 5.4A2.2 2.2 0 1 0 21.8 5.4Z' },
  { id: 'capeline', nom: 'capeline de pillard', d: 'M16.8 15.2C16.8 11.4 19.8 9.4 24 9.4C28.2 9.4 31.2 11.4 31.2 15.2ZM14.8 15.2C16.4 15.8 20.4 16.4 24 16.4C27.6 16.4 31.6 15.8 33.2 15.2L31.8 19.6C28.6 20.4 19.4 20.4 16.2 19.6Z', plis: 'M18.4 13.4C21 12.6 27 12.6 29.6 13.4' },
  { id: 'tambour', nom: 'chapeau de tambour de marine', d: 'M17.6 15.2V8.8H30.4V15.2ZM15.6 15.2H32.4V17.6H15.6Z', plis: 'M18.6 11.4H29.4M20 8.8L18 5.4M24 8.8L24.4 5.4' },
  // la bombe d'artilleur garde sa crête ; personne d'autre n'en a
  { id: 'bombe', nom: 'bombe d’artilleur', d: 'M15.6 16.4C15.6 9.6 19.2 6.4 24 6.4C28.8 6.4 32.4 9.6 32.4 16.4V17.2H15.6ZM14.4 17.4H33.6V19H14.4Z', plis: 'M15.4 10.4C17.8 9 30.2 9 32.6 10.4' },
  { id: 'cagoule', nom: 'cagoule d’abordage', d: 'M16 13.4H32L30.8 30.4C30.4 34.6 27.6 36.8 24 36.8C20.4 36.8 17.6 34.6 17.2 30.4Z', plis: 'M20 20.4A1.6 1.6 0 1 0 23.2 20.4A1.6 1.6 0 1 0 20 20.4ZM24.8 20.4A1.6 1.6 0 1 0 28 20.4A1.6 1.6 0 1 0 24.8 20.4ZM19.4 33.4C21.4 34.6 26.6 34.6 28.6 33.4' },
  { id: 'perruque', nom: 'perruque poudrée de comptoir', d: 'M15.2 15.4C14.8 10.6 18.4 7.4 24 7.4C29.6 7.4 33.2 10.6 32.8 15.4ZM13.8 15.2C12.2 15.4 11.4 16.4 11.6 17.6C12.2 18.4 13.2 18.4 14 18M34.2 15.2C35.8 15.4 36.6 16.4 36.4 17.6C35.8 18.4 34.8 18.4 34 18M15.2 15.4C17 15 31 15 32.8 15.4', plis: 'M17.2 12.2C19 11.4 29 11.4 30.8 12.2' },
];
function gcoiffe(c, ink, bg, or, sil = false) {
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
  if (c.or) s += `<path d="${c.or}" fill="${or}" fill-rule="evenodd"/>`;
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
  // le fond suit le camp : hachure de l'équipage, aquatinte de la mutinerie
  if (r.camp === 'mutinerie') s += grain(rect + ov, [24, 24, 252, 264], { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
  else s += hach(rect + ov, [24, 24, 252, 264], { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
  s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/><ellipse cx="150" cy="154" rx="96" ry="112" fill="none" stroke="${S.encre}"/><ellipse cx="150" cy="154" rx="92.5" ry="108.5" fill="none" stroke="${S.encre}" stroke-width="0.5"/>`;
  s += gsym(id, 128, { bg: S.teinte }).replace('<svg ', '<svg x="86" y="88" ');
  s += `<rect x="244" y="24" width="32" height="24" fill="${S.teinte}" stroke="${S.encre}" stroke-width="0.75"/><text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${S.del}">${r.n}</text>`;
  s += r.camp === 'equipage' ? gcart('ecu', 84, 275, 132, 26, 'Équipage') : r.camp === 'mutinerie' ? gcart('mordu', 84, 275, 132, 26, 'La mutinerie') : gcart('mordu2', 84, 275, 132, 26, 'Seul');
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="${r.nom.length > 16 ? 24 : 28}" fill="${S.encre}">${r.nom}</text>`;
  s += `<text x="150" y="364" text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${S.del}">${r.leg}</text>`;
  s += `<text x="150" y="386" text-anchor="middle" font-family="${F.sc}" font-size="13" letter-spacing="0.8" fill="${S.del}">${r.motif}</text>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}
export function gdos() {
  let s = `<rect width="300" height="420" fill="${S.relief}"/><rect x="12" y="12" width="276" height="396" fill="${S.encre}"/><rect x="12" y="12" width="276" height="396" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
  s += `<rect x="12.5" y="12.5" width="275" height="395" fill="none" stroke="${K.p3}"/><rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const V = S.papier;
  // le ciel, les étoiles de quart
  s += `<g fill="${S.craie}" opacity="0.5"><circle cx="56" cy="58" r="0.8"/><circle cx="104" cy="40" r="0.7"/><circle cx="168" cy="56" r="0.8"/><circle cx="214" cy="38" r="0.7"/><circle cx="248" cy="62" r="0.8"/></g>`;
  // la lune sur les flots
  s += `<circle cx="238" cy="74" r="16" fill="none" stroke="${V}" stroke-width="1.2"/><circle cx="232" cy="68" r="2.2" fill="${V}" opacity="0.6"/><circle cx="244" cy="80" r="1.6" fill="${V}" opacity="0.6"/>`;
  // la mer, la houle
  s += `<path d="M28 288C46 282 62 282 80 288C98 294 114 294 132 288C150 282 166 282 184 288C202 294 218 294 236 288C252 282 266 283 272 286" stroke="${V}" stroke-width="1" fill="none"/>`;
  // le trois-mâts : coque vue du pont, voiles ferlées sur les vergues
  s += `<path d="M70 282L74 244H226L230 282Z" fill="${S.encre}" stroke="${V}" stroke-width="1.3"/>`;
  s += `<path d="M70 282L74 244M230 282L226 244M78 270H222" stroke="${V}" stroke-width="0.7"/>`;
  s += `<path d="M100 244L110 208L146 208L142 244Z" fill="none" stroke="${V}" stroke-width="1"/><path d="M104 236H140M108 226H138" stroke="${V}" stroke-width="0.6"/>`;
  s += `<path d="M128 244V206" stroke="${V}" stroke-width="1"/>`;
  s += `<path d="M150 244V188" stroke="${V}" stroke-width="1.2"/>`;
  s += `<path d="M130 196H170L166 190H134Z" fill="none" stroke="${V}" stroke-width="0.8"/><path d="M134 196L138 244M166 196L162 244" stroke="${V}" stroke-width="0.7"/><path d="M138 206H162M140 220H160" stroke="${V}" stroke-width="0.6"/>`;
  s += `<path d="M160 206L196 206L192 200L164 200Z" fill="none" stroke="${V}" stroke-width="0.8"/><path d="M162 206L166 244M194 206L190 244" stroke="${V}" stroke-width="0.7"/><path d="M166 214H190M168 228H188" stroke="${V}" stroke-width="0.6"/>`;
  // le haubanage en médaillons réguliers, jamais en fouillis
  s += `<path d="M128 216L106 244M128 228L116 244M152 216L174 244M152 228L164 244" stroke="${V}" stroke-width="0.6" fill="none"/><circle cx="120" cy="235" r="2" fill="none" stroke="${V}" stroke-width="0.7"/><circle cx="180" cy="235" r="2" fill="none" stroke="${V}" stroke-width="0.7"/>`;
  s += `<path d="M128 244L118 278M152 244L162 278" stroke="${V}" stroke-width="0.7"/><circle cx="124" cy="262" r="2" fill="none" stroke="${V}" stroke-width="0.7"/><circle cx="156" cy="262" r="2" fill="none" stroke="${V}" stroke-width="0.7"/>`;
  // le pavillon au grand mât, et les flots
  s += `<path d="M150 188L150 178L166 181L150 186" fill="none" stroke="${V}" stroke-width="0.9"/>`;
  s += `<path d="M30 302C48 296 64 296 82 302C100 308 116 308 134 302C152 296 168 296 186 302C204 308 220 308 238 302C252 297 262 297 270 300M36 320C54 314 70 314 88 320C106 326 122 326 140 320C158 314 174 314 192 320C210 326 226 326 244 320C254 316 262 316 266 318" stroke="${V}" stroke-width="1" fill="none"/>`;
  // la lanterne de poupe : le seul or en aplat de toute la planche
  s += `<path d="M62 284L68 284L67 292L63 292Z" fill="${S.or}" stroke="${V}" stroke-width="0.8"/><path d="M66 292C69 296 69 300 66 304" stroke="${V}" stroke-width="0.8" fill="none"/><path d="M58 284H50" stroke="${V}" stroke-width="0.8"/>`;
  s += `<path d="M30 348H270" stroke="${V}" stroke-width="1"/>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte Pirates : le trois-mâts sur la houle, la nuit">${s}</svg>`;
}
export function friseBastingage(w, nuit) {
  const base = 56;
  const V = S.papier;
  let s = nuit ? `<rect width="${w}" height="56" fill="${S.encre}"/><rect width="${w}" height="56" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>` : `<rect width="${w}" height="56" fill="${S.papier}"/><rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  const encre = nuit ? K.p2 : S.encre;
  // les haubans obliques, poulies en médaillons réguliers
  s += `<path d="M${w * 0.06} ${base}L${w * 0.14} 10M${w * 0.14} ${base}L${w * 0.22} 10M${w * 0.86} ${base}L${w * 0.78} 10M${w * 0.94} ${base}L${w * 0.86} 10" stroke="${encre}" stroke-width="0.8" fill="none"/>`;
  s += `<circle cx="${w * 0.1}" cy="32" r="2.4" fill="none" stroke="${encre}" stroke-width="0.9"/><circle cx="${w * 0.18}" cy="22" r="2.4" fill="none" stroke="${encre}" stroke-width="0.9"/><circle cx="${w * 0.9}" cy="32" r="2.4" fill="none" stroke="${encre}" stroke-width="0.9"/><circle cx="${w * 0.82}" cy="22" r="2.4" fill="none" stroke="${encre}" stroke-width="0.9"/>`;
  // le grand mât et sa vergue ferlée
  const mx = w * 0.5;
  s += `<path d="M${mx} ${base}V6" stroke="${encre}" stroke-width="1.4"/><path d="M${mx - 10} ${base - 6}H${mx + 10}" stroke="${encre}" stroke-width="1"/><path d="M${mx - 8} ${base - 8}H${mx + 8}" stroke="${encre}" stroke-width="0.7"/><path d="M${mx + 3} 6L${mx + 16} 9L${mx + 3} 13Z" fill="${nuit ? S.relief : S.teinte}" stroke="${encre}" stroke-width="0.9"/>`;
  s += `<circle cx="${mx - 4}" cy="${base - 16}" r="2" fill="none" stroke="${encre}" stroke-width="0.8"/><circle cx="${mx + 4}" cy="${base - 8}" r="2" fill="none" stroke="${encre}" stroke-width="0.8"/>`;
  // la lisse du bâtiment, et la lanterne de poupe — seul or plein de la frise
  s += `<path d="M0 ${base}H${w}" stroke="${encre}" stroke-width="1"/><path d="M0 ${base - 8}C${w * 0.2} ${base - 3} ${w * 0.8} ${base - 3} ${w} ${base - 8}" stroke="${encre}" stroke-width="0.8" fill="none"/>`;
  s += `<path d="M${w * 0.955} ${base - 10}L${w * 0.98} ${base - 10}L${w * 0.977} ${base - 3}L${w * 0.958} ${base - 3}Z" fill="${S.or}" stroke="${encre}" stroke-width="0.7"/><path d="M${w * 0.968} ${base - 3}C${w * 0.972} ${base + 1} ${w * 0.966} ${base + 3} ${w * 0.96} ${base + 5}" stroke="${encre}" stroke-width="0.8" fill="none"/>`;
  return `<svg width="${w * 1.5}" height="84" viewBox="0 0 ${w} 56" style="display: block;" role="img" aria-label="Frise du bastingage, ${nuit ? 'nuit' : 'jour'}">${s}</svg>`;
}
export function pirates() {
  setPfx('cPI');
  const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
  const sc = (t) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${S.del};">${t}</div>`;
  const corps = (t, w) => `<p style="margin: 0; font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.del}; width: ${w}px;">${t}</p>`;
  let b = `<svg width="1600" height="1520" viewBox="0 0 1600 1520" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="1600" height="1520" fill="#000" filter="url(#papier)" opacity="0.2"/></svg>`;
  b += abs(48, 36, `${sc('Garoutom · Caprices · lot C — le quatrième habit')}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${S.encre};">Pirates, dans la même grammaire</h1><p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 18px; line-height: 24px; color: ${S.del};">« La mer ne rend pas ce qu’elle prend. » — la légende du bord.</p>`, 'width: 1000px;');
  b += abs(1100, 40, corps('Seuls changent les valeurs, les motifs et les mots : cale noire-verte #10171A sur carte marine #E2D8BA ; la meute garde sa sanguine de bandana ; l’or des doublons n’existe qu’en hachure — seule la lanterne de poupe est or plein. Règle-signature : le gréement est en médaillons réguliers, jamais en fouillis.', 420));
  b += abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${S.del};">Pl. C-VIII</span>`, 'width: 52px; text-align: right;');
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
  const faces = [['loup', 'Le Mutin sur l’aquatinte de la meute : couchette pleine cadre, couteau en trait de masse. La sanguine de la planche n’existe pas sur la carte.'], ['villageois', 'Le Matelot : l’encre de la cale, la hachure ordinaire, la corde et la poulie — jamais d’or en aplat.'], ['loupBlanc', 'Le Flibustier : carte brunie, aucune aquatinte ; la bourse et la pièce à la sanguine, les doublons en hachure d’or, le cartouche « Seul ».']];
  faces.forEach(([id, t], i) => {
    const x = 48 + i * 330;
    b += abs(x, 456, gface(id));
    b += abs(x, 886, corps(t, 300));
  });
  b += abs(1038, 456, gdos());
  b += abs(1038, 886, corps('Dos de la nuit : le trois-mâts sur la houle, la lanterne de poupe seule or plein, la lune et les étoiles de quart — le reste au trait de papier sur l’aquatinte IV.', 300));
  b += `<div style="position: absolute; left: 48px; top: 950px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 18 coiffes, deux rangs de neuf
  b += abs(48, 968, sc('Les dix-huit coiffes du bord (sièges 1 à 18, moitié en gravure, moitié en silhouette)'));
  GCOIFFES.forEach((c, i) => {
    const x = 48 + (i % 9) * 166;
    const y = i < 9 ? 994 : 1106;
    b += abs(x, y, `<div style="width: 150px;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width: 64px; height: 64px; border: 1px solid ${K.p2}; background: ${S.bruni};">${svg48(gcoiffe(c, S.encre, S.bruni, S.or), 62)}</div>${svg48(gcoiffe(c, S.encre, S.bruni, S.or, true), 40)}</div><div style="margin-top: 3px; font-family: ${F.ss}; font-size: 12px; line-height: 15px; color: ${S.encre};">${c.nom}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 1240px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // la frise du bastingage
  b += abs(48, 1258, sc('La frise — le bastingage au lieu des toits (mobile 390, agrandie 150 %)'));
  b += abs(48, 1284, friseBastingage(390, false));
  b += abs(48, 1380, friseBastingage(390, true));
  // ce qui change
  const rows = [
    ['encre', '#10171A cale noire-verte · la nuit tombée'],
    ['papier', '#E2D8BA · les verges de la carte marine'],
    ['bruni', '#EFE7CE · les matinées sans houle'],
    ['l’or', '#C9971F en hachure · plein pour la lanterne de poupe seule'],
    ['la meute', 'sanguine de bandana #962E20 — les mutins ne changent pas de sang'],
    ['cartouches', '« Équipage » · « La mutinerie » · « Seul »'],
    ['teinte de planche', '#DACFB0 (proposée ici, à remonter)'],
    ['règle-signature', 'le gréement est en médaillons réguliers, jamais en fouillis'],
  ];
  b += abs(700, 1258, sc('Ce qui change — et rien d’autre'));
  b += abs(700, 1284, `<div style="display: grid; grid-template-columns: 150px 330px; gap: 6px 16px; width: 496px;">${rows.map(([a, c]) => `<div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${S.del};">${a}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.encre};">${c}</div>`).join('')}</div>`);
  // les cartouches
  b += abs(1230, 1258, sc('Cartouches du bord'));
  b += abs(1230, 1284, `<svg width="320" height="150" viewBox="0 0 320 150" role="img" aria-label="Cartouches Équipage, La mutinerie, Seul">${gcart('ecu', 0, 0, 140, 30, 'Équipage')}${gcart('mordu', 160, 0, 140, 30, 'La mutinerie')}${gcart('mordu2', 0, 50, 140, 30, 'Seul')}${gcart('ecu', 160, 50, 140, 30, 'L’équipage')}</svg>`);
  return page({ title: 'C-Pirates', w: 1600, h: 1520, bg: `background-color: ${S.papier}; background-image: repeating-linear-gradient(90deg, rgba(16,23,26,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(16,23,26,.035) 0 .6px, transparent .6px 3px); color: ${S.encre};`, body: b });
}
