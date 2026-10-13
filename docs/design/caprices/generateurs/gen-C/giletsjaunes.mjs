// Planche Gilets Jaunes (lot C — le troisième habit) : 21 symboles, 3 faces,
// dos de la cabane la nuit, frise du rond-point, 18 coiffes.
import { K, F, page, setPfx, hach, hachRect, grain, cartPath, uid } from './lib.mjs';

const S = {
  encre: '#101318', papier: '#E6DDC4', bruni: '#F1EBDB', relief: '#1D232D', teinte: '#D8D3BE',
  bleu: '#24476E', craie: '#9EB9DA', fluo: '#E8C81A', san: K.san, del: K.del, p1: K.p1, p2: K.p2, p3: K.p3,
};
const BOX = [0, 0, 32, 32];

export const SROLES = [
  { id: 'villageois', n: 1, nom: 'Gilet jaune', camp: 'rondpoint', leg: '« Il n’y avait que la chaîne pour le dire. »', motif: 'gilet à deux bandes fluo' },
  { id: 'loup', n: 2, nom: 'CRS', camp: 'ordre', leg: '« Le bouclier ne discute pas. »', motif: 'casque à visière, bouclier de masse' },
  { id: 'voyante', n: 3, nom: 'la Fouilleuse', camp: 'rondpoint', leg: '« Elle fouille les poches, pas la conscience. »', motif: 'main fouillant une poche' },
  { id: 'sorciere', n: 4, nom: 'la Secouriste', camp: 'rondpoint', leg: '« Deux doses, et la mauvaise. »', motif: 'trousse ouverte, deux ampoules' },
  { id: 'chasseur', n: 5, nom: 'le Chasseur', camp: 'rondpoint', leg: '« Il tire mieux mort que debout. »', motif: 'fusil à deux canons' },
  { id: 'cupidon', n: 6, nom: 'le Beau-frère', camp: 'rondpoint', leg: '« La famille, c’est pour la vie, comme il dit. »', motif: 'deux alliances, un ruban' },
  { id: 'salvateur', n: 7, nom: 'l’Avocat', camp: 'rondpoint', leg: '« Il retarde l’inévitable, une nuit à la fois. »', motif: 'rempart de dossiers empilés' },
  { id: 'idiot', n: 8, nom: 'l’Idiot du rond-point', camp: 'rondpoint', leg: '« Gracié, et toujours pas écouté. »', motif: 'pancarte sur bâton' },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'rondpoint', leg: '« Il en a vu d’autres, et pire. »', motif: 'barricade de pneus sous une planche' },
  { id: 'corbeau', n: 10, nom: 'la Balance', camp: 'rondpoint', leg: '« Le mot glissé n’était pas signé. »', motif: 'enveloppe glissée sous une porte' },
  { id: 'bouc', n: 11, nom: 'le Bouc émissaire', camp: 'rondpoint', leg: '« Il fallait bien quelqu’un. »', motif: 'tête de bouc, cornes basses' },
  { id: 'petiteFille', n: 12, nom: 'la Lycéenne', camp: 'rondpoint', leg: '« Chaque charge a sa vidéo. »', motif: 'téléphone sur trépied' },
  { id: 'loupBlanc', n: 13, nom: 'l’Inspecteur', camp: 'seul', leg: '« Les bleus ne contrôlent pas les bleus, dit-on. »', motif: 'tampon d’inspection et sceau' },
  { id: 'renard', n: 14, nom: 'le Renard', camp: 'rondpoint', leg: '« Il connaît le quartier par les trous de nez. »', motif: 'truffe au vent, trois lignes de flair' },
  { id: 'ours', n: 15, nom: 'l’Éleveur', camp: 'rondpoint', leg: '« Le chien le sait avant tout le monde. »', motif: 'chien qui aboie, arcs de voix' },
  { id: 'villageois2', n: 16, nom: 'le Gilet certifié', camp: 'rondpoint', leg: '« Certifié des deux côtés. »', motif: 'deux gilets, un seul pli' },
  { id: 'voleur', n: 17, nom: 'le Chapardeur', camp: 'rondpoint', leg: '« Il ne vole pas : il recycle. »', motif: 'caisse à outils ouverte' },
  { id: 'chienLoup', n: 18, nom: 'le Gendarme', camp: 'rondpoint', leg: '« Deux camps, une seule solde. »', motif: 'képi posé sur une balance' },
  { id: 'enfantSauvage', n: 19, nom: 'l’Apprenti', camp: 'rondpoint', leg: '« Il regarde faire, puis fait pareil. »', motif: 'tablier d’apprenti' },
  { id: 'soeurs', n: 20, nom: 'les Deux Sœurs', camp: 'rondpoint', leg: '« Elles se sont reconnues à voix basse. »', motif: 'deux silhouettes, un seul cache-nez' },
  { id: 'freres', n: 21, nom: 'les Trois Frères', camp: 'rondpoint', leg: '« Trois fois le même menton, trois fois la même parole. »', motif: 'trois silhouettes sur la même dalle' },
];

const st = (d, c, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

const D = {
  villageois(o) {
    // le gilet : deux bandes fluo, jamais en aplat
    const corps = 'M6.8 9.8L13.2 7.6L16 10.4L18.8 7.6L25.2 9.8L26.8 21.4L24.6 26.8H7.4L5.2 21.4Z';
    const b1 = 'M5.9 16H26.1L25.5 19.2H6.3Z';
    const b2 = 'M6.6 22H25.4L24.8 25.2H7Z';
    return hach(b1 + b2, BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.fluo, rule: 'evenodd' })
      + st(corps, o.ink, o.sw)
      + st(b1 + b2, o.fluo, o.sw * 0.7)
      + st('M16 10.4V25.6', o.ink, o.sw * 0.6);
  },
  loup(o) {
    // casque à visière ; le bouclier est la masse de la meute
    const casque = 'M8.8 16.4C8.8 9.4 12 6.2 16 6.2C20 6.2 23.2 9.4 23.2 16.4V18L21.6 19.6H10.4L8.8 18Z';
    const bouclier = 'M25.2 9.4L29.4 10.6V23.8L24.6 26.2V10.2Z';
    return hach(casque, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(casque, o.ink, o.sw)
      + st('M8.8 14.6C11 13.4 13.2 12.8 16 12.8C18.8 12.8 21 13.4 23.2 14.6M10.2 19.6L11.6 21.4M21.8 19.6L20.4 21.4', o.ink, o.sw * 0.6)
      + `<path d="${bouclier}" fill="${o.mass}"/>`
      + st(bouclier, o.ink, o.sw * 0.8)
      + st('M26.6 12.4V20.6', o.ink, o.sw * 0.5);
  },
  voyante(o) {
    // la poche est béante ; le gant y disparaît au poignet
    const poche = 'M3.8 16.6L15.2 14.6L18 27.8L5.2 28.8Z';
    return hach(poche, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(poche, o.ink, o.sw)
      + st('M3.9 20.6L16.4 18.6M3.6 24.6L17.4 22.6', o.ink, o.sw * 0.6)
      + st('M27.4 3.4L20.8 12.2M29.4 5L22.6 14', o.ink, o.sw)
      + st('M20.8 12.2C19.6 14.2 18.2 15.4 16.6 15.8M22.6 14C21.4 15.8 20 16.8 18.6 17.2', o.ink, o.sw * 0.8);
  },
  sorciere(o) {
    // la trousse : deux doses debout, la poignée repliée
    const boite = 'M5.4 13.6H26.6L28.2 27.8H4Z';
    return st(boite, o.ink, o.sw)
      + st('M12.6 13.4C12.6 9.2 19.4 9.2 19.4 13.4', o.ink, o.sw * 0.8)
      + st('M8.6 13.6V9H11.6V13.6M20.6 13.6V8.4H23.8V13.6', o.ink, o.sw * 0.7)
      + `<circle cx="10.1" cy="7.4" r="0.8" fill="${o.ink}"/><circle cx="22.2" cy="6.8" r="0.8" fill="${o.ink}"/>`
      + st('M14.7 17.6H17.3V19.6H19.3V22.4H17.3V24.4H14.7V22.4H12.7V19.6H14.7Z', o.ink, o.sw * 0.8)
      + st('M8 30.4H24.6', o.ink, o.sw * 0.7);
  },
  chasseur(o) {
    // le fusil de chasse, deux canons, crosse à l'épaule
    const canon = 'M4.8 25.8L23.4 6.2L26.6 9L8.2 28.6Z';
    const crosse = 'M4.8 25.8L8.2 28.6L6.4 31.2C4.6 31 3.2 30 2.8 28.2Z';
    return hach(crosse, BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.ink })
      + st(canon, o.ink, o.sw)
      + st('M8.4 28.4L26 9.8', o.ink, o.sw * 0.5)
      + st(crosse, o.ink, o.sw)
      + st('M11 22.4C10 23.6 10.4 25 12 25.2', o.ink, o.sw * 0.7)
      + st('M23.4 6.2C24.6 4.8 26 4.6 27.4 5.4M26.6 9C28.2 8.6 29 8.8 29.8 9.8', o.ink, o.sw * 0.5);
  },
  cupidon(o) {
    // deux alliances, un ruban : le Beau-frère marie tout le monde
    return st('M12.6 17.4A5 5 0 1 0 12.6 17.4M19.4 12.6A5 5 0 1 0 19.4 12.6', o.ink, o.sw * 1.3)
      + st('M16 11.4C14.6 9.2 13.4 8.4 11.8 8.8C10.6 9.2 10.6 10.8 12 11.6M16 11.4C17.4 9.2 18.6 8.4 20.2 8.8C21.4 9.2 21.4 10.8 20 11.6', o.accent, o.sw * 0.8)
      + st('M7 28.6H25', o.ink, o.sw * 0.7)
      + st('M9.6 24.6C11 24 13 23.8 16 23.8C19 23.8 21 24 22.4 24.6', o.ink, o.sw * 0.6);
  },
  salvateur(o) {
    // le rempart de dossiers : briques de papier, ongles en pension
    const dossier = (x, y, w, h) => `M${x} ${y + h}V${y + h * 0.45}H${x + 4}V${y}H${x + w}V${y + h}Z`;
    const rows = [
      dossier(3.2, 17.8, 9, 8.4) + dossier(12.6, 17.8, 9, 8.4) + dossier(21, 17.8, 7.8, 8.4),
      dossier(7.6, 9.4, 9, 7.8) + dossier(16.8, 9.4, 9, 7.8),
    ];
    return st(rows, o.ink, o.sw * 0.9)
      + st('M5 15.2H9.6M14.6 15.2H19M8 23H11M15 23H18.6M24 23H27', o.ink, o.sw * 0.5);
  },
  idiot(o) {
    // la pancarte : trois mots pour un slogan, aucun ne survit à l'assemblée
    const plaque = 'M8 4.6H26V15H8Z';
    return st(plaque, o.ink, o.sw)
      + hach(plaque, BOX, { pas: o.pas * 1.4, sw: o.hw, color: o.ink, op: 0.5 })
      + st('M16.4 15V29.6', o.ink, o.sw)
      + st('M10.8 7.6H23.2M10.8 10H20.6', o.ink, o.sw * 0.8)
      + st('M11 29.8H21.6', o.ink, o.sw * 0.7);
  },
  ancien(o) {
    // la barricade : deux pneus, une planche — il en a vu d'autres
    const pneu = (cx, cy) => `M${cx - 5.2} ${cy}A5.2 5.2 0 1 0 ${cx + 5.2} ${cy}A5.2 5.2 0 1 0 ${cx - 5.2} ${cy}Z M${cx - 2.2} ${cy}A2.2 2.2 0 1 0 ${cx + 2.2} ${cy}A2.2 2.2 0 1 0 ${cx - 2.2} ${cy}Z`;
    const planche = 'M2.4 12.2L29.6 9.2L29.8 11.2L2.6 14.2Z';
    return hach(pneu(10.2, 21.4), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(pneu(10.2, 21.4), o.ink, o.sw * 0.9)
      + hach(pneu(20.8, 24.6), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(pneu(20.8, 24.6), o.ink, o.sw * 0.9)
      + st(planche, o.ink, o.sw * 0.8)
      + st('M6 9.8L6.4 7.8M23.8 8.2L24 6.2', o.ink, o.sw * 0.5);
  },
  corbeau(o) {
    // l'enveloppe glissée : la porte ne demandait rien, elle est entrée
    const porte = 'M3.4 23.2H28.6';
    const env = 'M11.2 15.8L24.6 12.6L26.4 20.6L13 23.8Z';
    return st(porte, o.ink, o.sw * 1.4)
      + st(env, o.ink, o.sw)
      + st('M11.4 16.6L18.4 18.4L24.2 13.4', o.ink, o.sw * 0.6)
      + st('M8 11.6L8.6 13.4M6.4 14.8L7 16.6', o.ink, o.sw * 0.6)
      + st('M4.4 27.4H10.4M13.4 27.4H19.4', o.ink, o.sw * 0.5);
  },
  bouc(o) {
    // la tête la plus proche du fourgon : cornes basses, barbe en pointe
    const tete = 'M10.4 8.8C12 7.2 14 6.6 16 6.6C18 6.6 20 7.2 21.6 8.8C21.6 13.6 20.8 18 18.6 21.2L16 23.4L13.4 21.2C11.2 18 10.4 13.6 10.4 8.8Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(tete, o.ink, o.sw)
      + st('M10.6 8.4C7.4 8.8 5 10.8 4.2 13.8C3.6 15.8 4 17.8 5 19.2C6.2 17.6 8 16.6 9.8 16.4M21.4 8.4C24.6 8.8 27 10.8 27.8 13.8C28.4 15.8 28 17.8 27 19.2C25.8 17.6 24 16.6 22.2 16.4', o.ink, o.sw * 0.9)
      + `<circle cx="13.6" cy="12.4" r="0.9" fill="${o.ink}"/><circle cx="18.4" cy="12.4" r="0.9" fill="${o.ink}"/>`
      + st('M14.6 23.4L16 29.2L17.4 23.4', o.ink, o.sw * 0.8);
  },
  petiteFille(o) {
    // le téléphone sur trépied : trois pieds, une anecdote
    const tel = 'M12.4 3.4H19.6V10.4H12.4Z';
    return st(tel, o.ink, o.sw)
      + `<circle cx="16" cy="5.6" r="0.8" fill="${o.ink}"/>`
      + st('M13.8 8H18.2', o.ink, o.sw * 0.5)
      + st('M16 10.4V16.6', o.ink, o.sw)
      + st('M16 16.6L9 28.8M16 16.6L23 28.8M16 16.6V29.6', o.ink, o.sw * 0.9)
      + st('M9.6 30H13.2M19.2 30H22.8', o.ink, o.sw * 0.6);
  },
  loupBlanc(o) {
    // le tampon d'inspection : la signature est le sceau, jamais la main
    const manche = 'M13.6 9.6A2.4 2.4 0 1 1 18.4 9.6Z';
    const tige = 'M14.4 11.4H17.6V15.8H14.4Z';
    const socle = 'M11 15.8H21V19.6H11Z';
    const sceau = 'M21.6 25.4A4.2 4.2 0 1 0 30 25.4A4.2 4.2 0 1 0 21.6 25.4Z';
    return `<path d="${manche}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw * 0.8}"/>`
      + `<path d="${tige}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw * 0.8}"/>`
      + `<path d="${socle}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw * 0.8}"/>`
      + `<path d="${sceau}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw}"/>`
      + st('M23.4 25.2L25.4 27.4L28.4 23.2', o.accent, o.sw * 0.8);
  },
  villageois2(o) {
    // recto, verso : le même gilet, certifié des deux côtés
    const g = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(4.6)} 10.4L${X(11.6)} 8.2L${X(14.4)} 10.8V26H${X(6.2)}L${X(4.4)} 20.6Z`; };
    const bande = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(5.1)} 17H${X(13.8)}L${X(13.5)} 20H${X(5.4)}Z`; };
    return hach(g(1) + g(0), BOX, { pas: o.pas * 1.3, sw: o.hw * 0.8, color: o.ink, rule: 'evenodd', op: 0.55 })
      + st(g(1) + g(0), o.ink, o.sw * 0.9)
      + hach(bande(1) + bande(0), BOX, { pas: o.pas * 0.9, sw: o.hw, color: o.fluo, rule: 'evenodd' })
      + st(bande(1) + bande(0), o.fluo, o.sw * 0.6)
      + st('M16 5V27', o.accent, o.sw * 0.6, ' stroke-dasharray="1.6 2.4"');
  },
  renard(o) {
    // la truffe au vent : trois lignes de flair, une seule réponse
    const groin = 'M4 17.2C6 15.6 8.6 14.8 11.6 14.8H19.6C22 14.8 23.8 15.8 24.4 17.6C23.8 19.4 22 20.4 19.6 20.4H11.6C8.6 20.4 6 19.6 4 18Z';
    const oreille = 'M20.8 14.8L23.6 10.2L26.2 14.4';
    return hach(groin, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(groin, o.ink, o.sw)
      + st(oreille, o.ink, o.sw * 0.9)
      + st('M5.8 17.2C6.6 16.4 7.6 16.4 8.2 17.2C7.6 18 6.6 18 5.8 17.2Z', o.ink, o.sw * 0.6)
      + st('M2.4 12.6C4 11.8 4.6 10.2 4 8.8M1 16.4C2.8 16.2 3.6 15 3.4 13.6M2.2 20.2C4 19.6 4.8 18.4 4.6 17', o.ink, o.sw * 0.6);
  },
  ours(o) {
    // le chien du rond-point : il aboie avant que personne ne demande
    const tete = 'M6.4 13C6.4 8.8 10 5.8 14.6 5.8C19 5.8 22.6 8.8 22.6 13.4C22.6 14.8 22.2 16 21.4 17L21 19.6L18.6 18.6L17.4 20.8L15.2 18.4C11.6 18.8 6.4 18.4 6.4 13Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(tete, o.ink, o.sw)
      + `<circle cx="17.4" cy="11.6" r="0.9" fill="${o.ink}"/>`
      + st('M11.4 10.4L13 9.2M14.6 8.6L15.8 7.6', o.ink, o.sw * 0.6)
      + st('M24.6 14.2C26.2 13.4 26.8 12 26.6 10.4M26 17.6C27.6 17.2 28.4 16 28.6 14.4', o.ink, o.sw * 0.7)
      + st('M6 30.2H26.4', o.ink, o.sw * 0.7);
  },
  voleur(o) {
    // la caisse à outils ouverte : rien ne s'y perd, tout s'y recycle
    const caisse = 'M4 18.4H28L26.4 27.8H5.6Z';
    const couvercle = 'M5.4 18.2L8.2 11.6H25.2L27 18.2';
    return st(caisse, o.ink, o.sw)
      + st(couvercle, o.ink, o.sw * 0.8)
      + st('M11.6 18.4C11.6 14 20.4 14 20.4 18.4', o.ink, o.sw * 0.8)
      + st('M13.4 11.6L15.6 8M17.6 11.6L20.4 6.4', o.ink, o.sw * 0.7)
      + `<circle cx="15.8" cy="7" r="0.8" fill="${o.ink}"/>`
      + st('M4 30.6H28', o.ink, o.sw * 0.7);
  },
  chienLoup(o) {
    // le képi sur la balance : deux plateaux, une seule solde
    const panG = 'M2.8 18.4H13.6C13.6 21 11.6 22.6 8.2 22.6C4.8 22.6 2.8 21 2.8 18.4Z';
    const panD = 'M20.4 18.4H31.2C31.2 21 29.2 22.6 25.8 22.6C22.4 22.6 20.4 21 20.4 18.4Z';
    return st(panG + panD, o.ink, o.sw * 0.9)
      + st('M5.6 10.2L2.8 18.4M5.6 10.2L10.8 18.2M5.6 10.2H26.4M26.4 10.2L22 18.2M26.4 10.2L29.2 18.4', o.ink, o.sw * 0.7)
      + st('M16 10.2V27.6M10.4 27.6H21.6', o.ink, o.sw)
      + st('M4.4 18.2L10.8 17.6M20.4 18.2L27 17.6', o.ink, o.sw * 0.6)
      + st('M4.6 17.2L11 16.4L11.2 14.6L4.8 15.4ZM23 16.6L28.8 15.8L28.6 14.2L23.2 15Z', o.ink, o.sw * 0.7);
  },
  enfantSauvage(o) {
    // le tablier d'apprenti : il regarde faire, puis fait pareil
    const tablier = 'M10.4 4.6L16 8.8L21.6 4.6';
    const corps = 'M11 8.6H21V14H11Z M9 14H23L25.6 28H6.4Z';
    const poche = 'M12.8 20.6H19.2V25H12.8Z';
    return st(tablier, o.ink, o.sw)
      + st(corps, o.ink, o.sw)
      + hach('M9 14H23L25.6 28H6.4Z', BOX, { pas: o.pas * 1.6, sw: o.hw * 0.7, color: o.ink, op: 0.45 })
      + st(poche, o.ink, o.sw * 0.7)
      + st('M6.4 28H25.6', o.ink, o.sw * 0.6);
  },
  soeurs(o) {
    // deux silhouettes, un seul cache-nez : le murmure les enlace
    const tete = (cx) => `M${cx - 4.4} 14.2A4.4 4.4 0 1 0 ${cx + 4.4} 14.2A4.4 4.4 0 1 0 ${cx - 4.4} 14.2Z`;
    const echarpe = 'M3.6 17.8C7.6 20 24.4 20 28.4 17.8L27.2 22C24 23.8 8 23.8 4.8 22Z';
    return hach(tete(10.4) + tete(21.6), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tete(10.4) + tete(21.6), o.ink, o.sw)
      + st(echarpe, o.ink, o.sw * 0.9)
      + `<circle cx="12" cy="13.4" r="0.9" fill="${o.ink}"/><circle cx="20" cy="13.4" r="0.9" fill="${o.ink}"/>`
      + st('M13.8 20.4C14.6 20 15.4 20 16.2 20.4', o.ink, o.sw * 0.6)
      + st('M6 28.6H26', o.ink, o.sw * 0.7);
  },
  freres(o) {
    // trois fois le même menton : la dalle est commune, la parole aussi
    const tete = (cx, k) => `M${cx - 4.2} 13A4.2 4.2 0 1 0 ${cx + 4.2} 13A4.2 4.2 0 1 0 ${cx - 4.2} 13Z`;
    const mentons = [6.4, 16, 25.6];
    let s = '';
    for (const cx of mentons) s += hach(tete(cx), BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete(cx), o.ink, o.sw);
    return s
      + st('M4 18.8H28M4 21.4H28', o.ink, o.sw * 0.7)
      + st('M6.4 17.2V18.8M16 17.2V18.8M25.6 17.2V18.8', o.ink, o.sw * 0.5);
  },
};

export function gsym(id, size, o = {}) {
  const big = size >= 96;
  const opts = { ink: o.ink ?? S.encre, bg: o.bg ?? S.papier, accent: o.accent ?? S.san, mass: o.mass ?? S.encre, fluo: o.fluo ?? S.fluo, sw: big ? 0.8 : 2, hw: big ? 0.22 : 0.75, pas: big ? 1.05 : 3 };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;" aria-hidden="true">${D[id](opts)}</svg>`;
}

// ---- les 18 coiffes du rond-point (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
const TETE = 'M32 21A8 8 0 1 1 16 21A8 8 0 1 1 32 21Z';
export const GCOIFFES = [
  // le chantier : dôme, bord, crête fluo — le seul à trois pans
  { id: 'chantier', nom: 'casque de chantier', d: 'M16.4 17C16.4 10.6 19.6 7.4 24 7.4C28.4 7.4 31.6 10.6 31.6 17ZM13 16.8H35V19.4H13Z', fluo: 'M21.4 8.2H26.6V4.6H21.4Z' },
  { id: 'laine', nom: 'bonnet de laine', d: 'M16.6 15.6C16.6 9.8 19.8 6.6 24 6.6C28.2 6.6 31.4 9.8 31.4 15.6V17.4H16.6ZM15.4 16.8H32.6V19.6H15.4ZM21.6 5A2.4 2.4 0 1 0 26.4 5A2.4 2.4 0 1 0 21.6 5Z' },
  { id: 'routier', nom: 'casquette de routier', d: 'M17 16.4V9.6C17 7.8 20 6.8 24 6.8C28 6.8 31 7.8 31 9.6V16.4ZM14.8 16.2H33.2V19H14.8ZM31 12.4H41.6V14.8H31Z' },
  // la cagoule couvre tête et cou, deux trous de lumière — jamais la capuche
  { id: 'cagoule', nom: 'cagoule de ski', d: 'M16 13.4H32L30.8 30.4C30.4 34.6 27.6 36.8 24 36.8C20.4 36.8 17.6 34.6 17.2 30.4Z', plis: 'M20 20.4A1.6 1.6 0 1 0 23.2 20.4A1.6 1.6 0 1 0 20 20.4ZM24.8 20.4A1.6 1.6 0 1 0 28 20.4A1.6 1.6 0 1 0 24.8 20.4Z' },
  { id: 'motard', nom: 'bombe de motard', d: 'M15.2 16.4C15.2 9.2 18.8 5.8 24 5.8C29.2 5.8 32.8 9.2 32.8 16.4V17.2H15.2ZM14.2 17.4H33.8V19.2H14.2ZM32.8 17L37.4 17.8V19.4L32.8 19Z' },
  { id: 'beret', nom: 'béret basque', d: 'M13.2 14.6C14 10.8 18.6 8.8 24 8.8C29.4 8.8 34 10.8 34.8 14.6C35 16 33.2 16.8 24 16.8C14.8 16.8 13 16 13.2 14.6ZM23.2 9L24 6.4L24.8 9Z', plis: 'M16.6 13.4C18.4 14.2 29.6 14.2 31.4 13.4' },
  { id: 'bob', nom: 'bob de pêche', d: 'M17.6 15C17.6 11 20 9 24 9C28 9 30.4 11 30.4 15ZM15.4 15.2H32.6L30.8 19.8H17.2Z', plis: 'M18.4 13.4C20 12.6 28 12.6 29.6 13.4' },
  { id: 'bandana', nom: 'bandana de colleur d’affiches', d: 'M15.8 17.2C15.8 11 19.4 8.4 24 8.4C28.6 8.4 32.2 11 32.2 17.2ZM32 12.6L36.2 10L35.2 13.8L37.4 16.2L33.2 16.4Z', plis: 'M18 14.4C20 13.4 28 13.4 30 14.4' },
  { id: 'capuche', nom: 'capuche de survêtement', d: 'M24 5.4C17 5.4 12.4 12 12.4 19.8L10.6 34L7.6 48H40.4L37.4 34L35.6 19.8C35.6 12 31 5.4 24 5.4Z', capuche: true },
  { id: 'paille', nom: 'chapeau de paille', d: 'M8.6 13.6H39.4V15.8H8.6ZM17 13.4C17 9.6 20 7.6 24 7.6C28 7.6 31 9.6 31 13.4Z', plis: 'M18.8 11.2H29.2' },
  { id: 'chasse', nom: 'casquette de chasse', d: 'M17 15.2C17 10.8 20 8.8 24 8.8C28 8.8 31 10.8 31 15.2ZM13.6 15.2H34.4V17.2H13.6ZM31.2 17.2H36.8V19H31.2Z' },
  // le casque de moto garde sa mentonnière ; la cagoule garde le cou
  { id: 'casqueMoto', nom: 'casque de moto', d: 'M15.6 16.2C15.6 9.6 19.2 6.6 24 6.6C28.8 6.6 32.4 9.6 32.4 16.2V19.6C32.4 22.2 29.8 23.6 24 23.6C18.2 23.6 15.6 22.2 15.6 19.6Z', plis: 'M18.6 15.2H29.4' },
  { id: 'foulard', nom: 'foulard de syndicaliste', d: 'M16 15.2C16 10.4 19.6 8 24 8C28.4 8 32 10.4 32 15.2ZM32 12.8L36.8 10.2L35.6 14.2L38.4 17.2L32.8 16.6Z', plis: 'M17.6 12.8C19.6 11.6 28.4 11.6 30.4 12.8' },
  { id: 'canotier', nom: 'canotier de fanfare', d: 'M17.6 15.8V7.6H30.4V15.8ZM12.2 15.8H35.8V17.8H12.2Z', plis: 'M18.6 11.8H29.4' },
  { id: 'pluie', nom: 'chapeau de pluie de maire', d: 'M17 14.6C17 10.4 20 8.4 24 8.4C28 8.4 31 10.4 31 14.6ZM10 15.8C14.4 17.6 33.6 17.6 38 15.8L37.2 19.6C32 21.2 16 21.2 10.8 19.6Z' },
  { id: 'calotte', nom: 'calotte de cantonnier', d: 'M16.8 15.4C16.8 12.2 19.8 10.4 24 10.4C28.2 10.4 31.2 12.2 31.2 15.4ZM15.4 15.4H32.6V16.8H15.4ZM31.2 15.2H35.2V16.6H31.2Z', plis: 'M18.6 13.6H29.4' },
  // la chapka seule a des volets rabattus sur les oreilles
  { id: 'chapka', nom: 'chapka d’huissier', d: 'M16.6 14.6C16.6 10.6 19.4 8.6 24 8.6C28.6 8.6 31.4 10.6 31.4 14.6ZM16.8 12.6C13.8 13.2 12 15.2 12 17.6C12 18.2 12.4 18.6 13 18.4L16.8 17ZM31.2 12.6C34.2 13.2 36 15.2 36 17.6C36 18.2 35.6 18.6 35 18.4L31.2 17Z' },
  { id: 'kepi', nom: 'képi de gendarme', d: 'M17 16V10.6C17 9.2 19.4 8.4 24 8.4C28.6 8.4 31 9.2 31 10.6V16ZM15.6 16H32.4V18H15.6ZM31 16.2H36.6V18H31Z' },
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
  // le fond suit le camp : hachure du rond-point, aquatinte de la meute
  if (r.camp === 'ordre') s += grain(rect + ov, [24, 24, 252, 264], { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
  else s += hach(rect + ov, [24, 24, 252, 264], { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
  s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/><ellipse cx="150" cy="154" rx="96" ry="112" fill="none" stroke="${S.encre}"/><ellipse cx="150" cy="154" rx="92.5" ry="108.5" fill="none" stroke="${S.encre}" stroke-width="0.5"/>`;
  s += gsym(id, 128, { bg: S.teinte }).replace('<svg ', '<svg x="86" y="88" ');
  s += `<rect x="244" y="24" width="32" height="24" fill="${S.teinte}" stroke="${S.encre}" stroke-width="0.75"/><text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${S.del}">${r.n}</text>`;
  s += r.camp === 'rondpoint' ? gcart('ecu', 84, 275, 132, 26, 'Rond-point') : r.camp === 'ordre' ? gcart('mordu', 84, 275, 132, 26, 'Forces de l’ordre') : gcart('mordu2', 84, 275, 132, 26, 'Seul');
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="${r.nom.length > 16 ? 24 : 28}" fill="${S.encre}">${r.nom}</text>`;
  s += `<text x="150" y="364" text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${S.del}">${r.leg}</text>`;
  s += `<text x="150" y="386" text-anchor="middle" font-family="${F.sc}" font-size="13" letter-spacing="0.8" fill="${S.del}">${r.motif}</text>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}
export function gdos() {
  let s = `<rect width="300" height="420" fill="${S.relief}"/><rect x="12" y="12" width="276" height="396" fill="${S.encre}"/><rect x="12" y="12" width="276" height="396" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
  s += `<rect x="12.5" y="12.5" width="275" height="395" fill="none" stroke="${K.p3}"/><rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const V = S.papier;
  // le ciel, les étoiles de corne d'oreille
  s += `<g fill="${S.craie}" opacity="0.5"><circle cx="60" cy="60" r="0.8"/><circle cx="110" cy="42" r="0.7"/><circle cx="170" cy="58" r="0.8"/><circle cx="212" cy="40" r="0.7"/><circle cx="244" cy="64" r="0.8"/></g>`;
  // la départementale et l'horizon
  s += `<path d="M36 148H264" stroke="${V}" stroke-width="1.2"/><path d="M84 148L48 364M216 148L252 364" stroke="${V}" stroke-width="0.9"/><path d="M150 152V364" stroke="${V}" stroke-width="0.7" stroke-dasharray="6 7" opacity="0.7"/>`;
  // les deux pins de la voie
  s += `<path d="M62 148V130M57 140L62 132L67 140M59 135L62 129L65 135M240 148V134M236 142L240 134L244 142M238 137L240 131L242 137" stroke="${V}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  // les gyrophares au loin, à l'entrée du secteur
  s += `<g stroke="${S.craie}" stroke-width="1" fill="none"><circle cx="50" cy="142" r="2.4" fill="${S.craie}" stroke="none"/><path d="M50 136V131M44 138L41 134M56 138L59 134M46 146L42 148M54 146L58 148"/></g>`;
  // le rond-point, l'îlot, la dalle
  s += `<path d="M96 300C96 288 120 281 150 281C180 281 204 288 204 300C204 312 180 319 150 319C120 319 96 312 96 300Z" fill="${S.encre}" stroke="${V}" stroke-width="1.2"/><path d="M126 300C126 295 136 292 150 292C164 292 174 295 174 300C174 305 164 308 150 308C136 308 126 305 126 300Z" fill="none" stroke="${V}" stroke-width="0.8"/>`;
  // la cabane en palette, dressée sur l'îlot
  s += `<path d="M124 245L150 218L176 245" fill="none" stroke="${V}" stroke-width="1.4"/><rect x="132" y="245" width="36" height="52" fill="none" stroke="${V}" stroke-width="1.2"/><path d="M132 258H168M132 272H168M132 286H168" stroke="${V}" stroke-width="0.6"/><path d="M144 297V272H156V297" fill="none" stroke="${V}" stroke-width="1"/>`;
  // le feu de camp : le seul fluo en aplat de toute la planche
  s += `<path d="M110 286C107 292 104 297 110 302C116 297 113 292 110 286Z" fill="${S.fluo}"/><path d="M102 308L118 315M118 308L102 315" stroke="${V}" stroke-width="1.2" stroke-linecap="round"/>`;
  s += `<path d="M30 364H270" stroke="${V}" stroke-width="1"/>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte Gilets Jaunes : la cabane sur le rond-point, la nuit">${s}</svg>`;
}
export function friseRondpoint(w, nuit) {
  const base = 56;
  const ix = w * 0.46;
  const V = S.papier;
  let s = nuit ? `<rect width="${w}" height="56" fill="${S.encre}"/><rect width="${w}" height="56" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>` : `<rect width="${w}" height="56" fill="${S.papier}"/><rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  // les pins de la départementale
  const pin = (x, h) => `M${x} ${base}V${base - h - 8}M${x - 5} ${base - h + 6}L${x} ${base - h - 2}L${x + 5} ${base - h + 6}M${x - 3} ${base - h + 11}L${x} ${base - h + 5}L${x + 3} ${base - h + 11}`;
  s += `<path d="${[pin(w * 0.15, 16), pin(w * 0.28, 13), pin(w * 0.78, 15), pin(w * 0.9, 17)].join('')}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  // la nuit, les gyrophares attendent au bord du champ
  if (nuit) s += `<path d="M${w * 0.08} 42A3 3 0 0 1 ${w * 0.08 + 6} 42A3 3 0 0 1 ${w * 0.08 + 12} 42Z" fill="${S.craie}"/><path d="${`M${w * 0.09} 38L${w * 0.09} 33M${w * 0.09 - 5} 40L${w * 0.09 - 9} 36M${w * 0.09 + 5} 40L${w * 0.09 + 9} 36`}" stroke="${S.craie}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  // l'îlot du rond-point et sa dalle
  s += `<path d="M${ix - 40} ${base}C${ix - 40} ${base - 15} ${ix + 40} ${base - 15} ${ix + 40} ${base}Z" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1"/>`;
  // la cabane en palette
  s += `<path d="M${ix - 15} ${base - 12}L${ix} ${base - 24}L${ix + 15} ${base - 12}Z" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.1"/><path d="M${ix - 9} ${base - 12}V${base - 1}H${ix + 9}V${base - 12}" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.1"/><path d="M${ix - 3} ${base - 1}V${base - 7}H${ix + 3}V${base - 1}" fill="none" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.9"/>`;
  // le feu de camp, seul fluo plein de la frise
  s += `<path d="M${ix - 30} ${base - 4}C${ix - 32} ${base - 9} ${ix - 28} ${base - 13} ${ix - 30} ${base - 4}Z" fill="${S.fluo}"/><path d="M${ix - 34} ${base - 2}L${ix - 26} ${base + 2}M${ix - 26} ${base - 2}L${ix - 34} ${base + 2}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M0 ${base}H${w}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1"/>`;
  return `<svg width="${w * 1.5}" height="84" viewBox="0 0 ${w} 56" style="display: block;" role="img" aria-label="Frise du rond-point, ${nuit ? 'nuit' : 'jour'}">${s}</svg>`;
}
export function giletsjaunes() {
  setPfx('cGJ');
  const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
  const sc = (t) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${S.del};">${t}</div>`;
  const corps = (t, w) => `<p style="margin: 0; font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.del}; width: ${w}px;">${t}</p>`;
  let b = `<svg width="1600" height="1520" viewBox="0 0 1600 1520" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="1600" height="1520" fill="#000" filter="url(#papier)" opacity="0.2"/></svg>`;
  b += abs(48, 36, `${sc('Garoutom · Caprices · lot C — le troisième habit')}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${S.encre};">Gilets Jaunes, dans la même grammaire</h1><p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 18px; line-height: 24px; color: ${S.del};">« Il fallait bien quelqu’un. » — la légende du rond-point.</p>`, 'width: 1000px;');
  b += abs(1100, 40, corps('Seuls changent les valeurs, les motifs et les mots : bitume de nuit #101318 sur papier de départementale #E6DDC4 ; la meute garde sa sanguine ; le fluo du gilet n’existe qu’en hachure à 45° — seul le feu de camp est fluo plein. Règle-signature : le rond-point est un cercle, jamais un carré.', 420));
  b += abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${S.del};">Pl. C-VI</span>`, 'width: 52px; text-align: right;');
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
  const faces = [['loup', 'Le CRS sur l’aquatinte de la meute : casque plein cadre, bouclier au trait de masse. Le bleu de la planche n’existe pas sur la carte.'], ['villageois', 'Le Gilet jaune : l’encre du bitume, la hachure ordinaire, les deux bandes fluo en hachure — jamais en aplat.'], ['loupBlanc', 'L’Inspecteur : carte brunie, aucune aquatinte ; le tampon et le sceau à la sanguine, le cartouche « Seul ».']];
  faces.forEach(([id, t], i) => {
    const x = 48 + i * 330;
    b += abs(x, 456, gface(id));
    b += abs(x, 886, corps(t, 300));
  });
  b += abs(1038, 456, gdos());
  b += abs(1038, 886, corps('Dos de la nuit : la cabane sur l’îlot, le feu de camp seul fluo plein, les gyrophares au loin — le reste au trait de papier sur l’aquatinte IV.', 300));
  b += `<div style="position: absolute; left: 48px; top: 950px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 18 coiffes, deux rangs de neuf
  b += abs(48, 968, sc('Les dix-huit coiffes du rond-point (sièges 1 à 18, moitié en gravure, moitié en silhouette)'));
  GCOIFFES.forEach((c, i) => {
    const x = 48 + (i % 9) * 166;
    const y = i < 9 ? 994 : 1106;
    b += abs(x, y, `<div style="width: 150px;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width: 64px; height: 64px; border: 1px solid ${K.p2}; background: ${S.bruni};">${svg48(gcoiffe(c, S.encre, S.bruni, S.fluo), 62)}</div>${svg48(gcoiffe(c, S.encre, S.bruni, S.fluo, true), 40)}</div><div style="margin-top: 3px; font-family: ${F.ss}; font-size: 12px; line-height: 15px; color: ${S.encre};">${c.nom}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 1240px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // la frise du rond-point
  b += abs(48, 1258, sc('La frise — le rond-point au lieu des toits (mobile 390, agrandie 150 %)'));
  b += abs(48, 1284, friseRondpoint(390, false));
  b += abs(48, 1380, friseRondpoint(390, true));
  // ce qui change
  const rows = [
    ['encre', '#101318 bitume de nuit · la nuit tombée'],
    ['papier', '#E6DDC4 · les verges de la départementale'],
    ['bruni', '#F1EBDB · les matins sans charge'],
    ['le fluo', '#E8C81A en hachure à 45° · plein pour le feu de camp seul'],
    ['la meute', 'même sanguine — les CRS ne changent pas de sang'],
    ['cartouches', '« Rond-point » · « Forces de l’ordre » · « Seul »'],
    ['teinte de planche', '#D8D3BE (proposée ici, à remonter)'],
    ['règle-signature', 'le rond-point est un cercle, jamais un carré'],
  ];
  b += abs(700, 1258, sc('Ce qui change — et rien d’autre'));
  b += abs(700, 1284, `<div style="display: grid; grid-template-columns: 150px 330px; gap: 6px 16px; width: 496px;">${rows.map(([a, c]) => `<div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${S.del};">${a}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.encre};">${c}</div>`).join('')}</div>`);
  // les cartouches
  b += abs(1230, 1258, sc('Cartouches du rond-point'));
  b += abs(1230, 1284, `<svg width="320" height="150" viewBox="0 0 320 150" role="img" aria-label="Cartouches Rond-point, Forces de l’ordre, Seul">${gcart('ecu', 0, 0, 140, 30, 'Rond-point')}${gcart('mordu', 160, 0, 140, 30, 'Forces de l’ordre')}${gcart('mordu2', 0, 50, 140, 30, 'Seul')}${gcart('ecu', 160, 50, 140, 30, 'Le rond-point')}</svg>`);
  return page({ title: 'C-GiletsJaunes', w: 1600, h: 1520, bg: `background-color: ${S.papier}; background-image: repeating-linear-gradient(90deg, rgba(16,19,24,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(16,19,24,.035) 0 .6px, transparent .6px 3px); color: ${S.encre};`, body: b });
}
