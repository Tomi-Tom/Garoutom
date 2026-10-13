// Planche Open Space (lot C — le sixième habit) : 21 symboles, 3 faces,
// dos du plateau la nuit, frise des bureaux, 18 coiffes.
import { K, F, page, setPfx, hach, grain, cartPath } from './lib.mjs';

const S = {
  encre: '#0D1420', papier: '#ECEDEA', bruni: '#F7F8F5', relief: '#162234', teinte: '#DCDEDA',
  bleu: '#2D4E8A', craie: '#8FB6E8', rose: '#F0438E', san: K.san, del: K.del, p1: K.p1, p2: K.p2, p3: K.p3,
};
/**
 * La sentinelle du rose : l’intégration (extraire.mjs) la passe en option
 * `rose` et la remappe vers le jeton `$fluo` — des hachures, jamais un aplat.
 * Ici, la planche dessine le vrai rose #F0438E ; seul le voyant de la machine
 * à café, sur le dos, garde un rose plein.
 */
export const ROSE_SENTINELLE = '#1a1400';
const BOX = [0, 0, 32, 32];

export const SROLES = [
  { id: 'villageois', n: 1, nom: 'Salarié', camp: 'plateau', leg: '« Pas de pouvoir — la voix, et le badge. »', motif: 'badge au cordon, gobelet à la main' },
  { id: 'loup', n: 2, nom: 'Manager', camp: 'direction', leg: '« Le sourire ne discute pas. »', motif: 'costume, cravate de masse, badge de direction' },
  { id: 'voyante', n: 3, nom: 'la Contrôleuse de gestion', camp: 'plateau', leg: '« Elle inspecte les lignes, pas les personnes. »', motif: 'tableur passé à la loupe' },
  { id: 'sorciere', n: 4, nom: 'la Pharmacienne', camp: 'plateau', leg: '« Deux remèdes, et le mauvais. »', motif: 'trousse ouverte, deux gélules' },
  { id: 'chasseur', n: 5, nom: 'le Directeur des ventes', camp: 'plateau', leg: '« Il vend mieux mort que debout. »', motif: 'combiné en diagonale, flèche de relance' },
  { id: 'cupidon', n: 6, nom: 'l’Animateur du séminaire', camp: 'plateau', leg: '« La team, c’est pour la vie, comme il dit. »', motif: 'deux badges, un seul ruban' },
  { id: 'salvateur', n: 7, nom: 'le Syndicaliste', camp: 'plateau', leg: '« Il gagne une nuit à la fois. »', motif: 'rempart de cartons d’archives' },
  { id: 'idiot', n: 8, nom: 'l’Idiot de l’open space', camp: 'plateau', leg: '« Invité à toutes les réunions, jamais écouté. »', motif: 'paperboard sur trépied' },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'plateau', leg: '« Deux plans sociaux, et toujours là. »', motif: 'fauteuil des deux plans sociaux' },
  { id: 'corbeau', n: 10, nom: 'l’Enquête annuelle', camp: 'plateau', leg: '« Le questionnaire était anonyme. »', motif: 'post-it glissé dans la boîte à idées' },
  { id: 'bouc', n: 11, nom: 'l’Alternant', camp: 'plateau', leg: '« La chaise la plus proche de la porte RH. »', motif: 'chaise vide près de la porte RH' },
  { id: 'petiteFille', n: 12, nom: 'la Stagiaire', camp: 'plateau', leg: '« Chaque réunion a sa photo. »', motif: 'téléphone sur trépied, cœur d’écran' },
  { id: 'loupBlanc', n: 13, nom: 'le Consultant', camp: 'seul', leg: '« La mission ne se discute pas. »', motif: 'tampon de mission et sceau' },
  { id: 'renard', n: 14, nom: 'l’Analyste de flux', camp: 'plateau', leg: '« Il connaît le plateau par les cloisons. »', motif: 'trois flux vers un seul nœud' },
  { id: 'ours', n: 15, nom: 'le Gardien de nuit', camp: 'plateau', leg: '« Le chien le sait avant les badges. »', motif: 'chien qui aboie, arcs de voix' },
  { id: 'villageois2', n: 16, nom: 'le Salarié moteur', camp: 'plateau', leg: '« Moteur des deux côtés. »', motif: 'contrat recto-verso, surlignage rose' },
  { id: 'voleur', n: 17, nom: 'le Piqueur de stylos', camp: 'plateau', leg: '« Il ne vole pas : il mutualise. »', motif: 'tiroir de la photocopieuse, deux cartes' },
  { id: 'chienLoup', n: 18, nom: 'l’Intérimaire', camp: 'plateau', leg: '« Deux camps, une seule mission. »', motif: 'badge d’intérim sur une balance' },
  { id: 'enfantSauvage', n: 19, nom: 'le Cadet', camp: 'plateau', leg: '« Il observe, puis refait pareil. »', motif: 't-shirt trois tailles trop grand' },
  { id: 'soeurs', n: 20, nom: 'les Deux Sœurs', camp: 'plateau', leg: '« Elles se sont reconnues à la machine à café. »', motif: 'deux silhouettes, un seul gobelet' },
  { id: 'freres', n: 21, nom: 'les Trois Frères', camp: 'plateau', leg: '« Trois fois le même badge, trois fois la même idée. »', motif: 'trois silhouettes, le même badge' },
];

const st = (d, c, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

const D = {
  villageois(o) {
    // le badge au cordon ; le gobelet tient la main libre
    const cordon = 'M12.8 6.8L15.8 2.8M19.2 6.8L16.2 2.8';
    const badge = 'M11.6 6.6H20.4V14.8H11.6Z';
    const photo = 'M13.2 8.4H18.8V11.6H13.2Z';
    const gobelet = 'M18.6 21H27.8L26.6 28.6H19.8Z';
    return st(cordon, o.ink, o.sw * 0.7)
      + st(badge, o.ink, o.sw)
      + hach(photo, BOX, { pas: o.pas * 1.3, sw: o.hw * 0.8, color: o.ink, op: 0.55 })
      + st(photo, o.ink, o.sw * 0.6)
      + st(gobelet, o.ink, o.sw)
      + st('M20.8 19.2C19.8 17.8 19.8 16.4 21 15.2M24 19.2C23 17.8 23 16.4 24.2 15.2', o.ink, o.sw * 0.5)
      + st('M8 30.4H24.6', o.ink, o.sw * 0.6);
  },
  loup(o) {
    // le costume : col de chemise, cravate de masse, badge de direction
    const noeud = 'M14.6 11.4L17.4 11.4L18.4 13.4L16 15.4L13.6 13.4Z';
    const lame = 'M14.8 15.2L17.2 15.2L18.6 27.4L16 30L13.4 27.4Z';
    const badge = 'M21.8 18.4H27.2V24.6H21.8Z';
    return st('M6.4 30.4L8.8 8.4M25.6 30.4L23.2 8.4', o.ink, o.sw)
      + st('M8.8 8.4L12.4 11.6L16 8.4L19.6 11.6L23.2 8.4', o.ink, o.sw)
      + `<path d="${lame}" fill="${o.mass}"/>`
      + st(noeud, o.ink, o.sw * 0.8)
      + st(lame, o.ink, o.sw * 0.8)
      + st(badge, o.ink, o.sw * 0.8)
      + st('M22.8 20.4H26.2M22.8 22.4H25', o.ink, o.sw * 0.5);
  },
  voyante(o) {
    // le tableur passe à la loupe : la ligne visée s'assombrit dans la lentille
    const feuille = 'M3.6 7.6H28.4V26.4H3.6Z';
    const grille = 'M3.6 12.6H28.4M3.6 17.6H28.4M3.6 22.6H28.4M9.6 7.6V26.4M16.6 7.6V26.4M23.6 7.6V26.4';
    return st(feuille, o.ink, o.sw)
      + st(grille, o.ink, o.sw * 0.45)
      + `<circle cx="20" cy="20" r="6.4" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.sw}"/>`
      + hach('M16.6 17.6H23.6V22.6H16.6Z', BOX, { pas: o.pas * 1.4, sw: o.hw, color: o.ink, op: 0.75 })
      + st('M16.6 17.6H23.6V22.6H16.6Z', o.ink, o.sw * 0.5)
      + st('M24.4 24.8L29 29.4', o.ink, o.sw)
      + st('M16.6 17C17.4 16 18.6 15.4 19.8 15.6', o.ink, o.sw * 0.6);
  },
  sorciere(o) {
    // la trousse d'entreprise : croix, poignée, deux gélules debout
    const boite = 'M5.4 14.6H26.6L28.2 27.8H4Z';
    return st(boite, o.ink, o.sw)
      + st('M12.6 14.4C12.6 10.6 19.4 10.6 19.4 14.4', o.ink, o.sw * 0.8)
      + st('M8.6 14.6V10.4H11.6V14.6M20.6 14.6V9.8H23.8V14.6', o.ink, o.sw * 0.7)
      + `<circle cx="10.1" cy="8.8" r="0.8" fill="${o.ink}"/><circle cx="22.2" cy="8.2" r="0.8" fill="${o.ink}"/>`
      + st('M14.8 19.4V24.4M12.3 21.9H17.3', o.ink, o.sw * 0.8)
      + st('M8 30.4H24.6', o.ink, o.sw * 0.7);
  },
  chasseur(o) {
    // le combiné en diagonale ; la dernière relance part en flèche
    const earpiece = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="3" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.sw}"/>`;
    return st('M7.4 21.6C11 18 14.6 14.4 18.2 10.8C19.6 9.4 21 8 22.4 6.6', o.ink, o.sw * 1.3)
      + earpiece(6.4, 22.6) + earpiece(23.4, 5.6)
      + st('M23.6 13L30 6.6', o.ink, o.sw * 0.9)
      + st('M30 6.6L26.2 7M30 6.6L29.6 10.4', o.ink, o.sw * 0.9)
      + st('M4.4 27.6H8.8M23.6 2.8H27.6', o.ink, o.sw * 0.6);
  },
  cupidon(o) {
    // deux badges liés d'un même ruban : le séminaire marie tout le monde
    const b = (x) => `M${x} 10.2H${x + 7.4}V19H${x}Z`;
    const photo = (x) => `M${x + 1.7} 12.4H${x + 5.7}V15.4H${x + 1.7}Z`;
    return st(b(4) + b(20.6), o.ink, o.sw)
      + st(photo(4) + photo(20.6), o.ink, o.sw * 0.6)
      + `<circle cx="7.7" cy="8.4" r="0.8" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.5}"/><circle cx="24.3" cy="8.4" r="0.8" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.5}"/>`
      + st('M8.6 8C11 6.2 15.8 6.2 20.4 8', o.accent, o.sw * 0.8)
      + st('M7 28.6H25', o.ink, o.sw * 0.7)
      + st('M9.6 24.6C11 24 13 23.8 16 23.8C19 23.8 21 24 22.4 24.6', o.ink, o.sw * 0.6);
  },
  salvateur(o) {
    // le rempart : des cartons d'archives, une négociation par étage
    const carton = (x, y, w, h) => `M${x} ${y + h}V${y + h * 0.45}H${x + 4}V${y}H${x + w}V${y + h}Z`;
    const rows = [
      carton(3.2, 17.8, 9, 8.4) + carton(12.6, 17.8, 9, 8.4) + carton(21, 17.8, 7.8, 8.4),
      carton(7.6, 9.4, 9, 7.8) + carton(16.8, 9.4, 9, 7.8),
    ];
    return st(rows, o.ink, o.sw * 0.9)
      + st('M5 15.2H9.6M14.6 15.2H19M8 23H11M15 23H18.6M24 23H27', o.ink, o.sw * 0.5);
  },
  idiot(o) {
    // le paperboard du matin : deux traits de marqueur rose, aucun ne survit à la réunion
    const plaque = 'M7.4 4.4H24.6V14.6H7.4Z';
    const marque = 'M9 6.8H19.4V8.8H9Z M9 10.6H23V12.6H9Z';
    return st(plaque, o.ink, o.sw)
      + hach(marque, BOX, { pas: o.pas * 1.2, sw: o.hw, color: o.rose, rule: 'evenodd' })
      + st(marque, o.rose, o.sw * 0.5)
      + st('M16 14.6L9.4 29.4M16 14.6L22.6 29.4M16 14.6V29.6', o.ink, o.sw * 0.9)
      + st('M10.6 29.8H21.4', o.ink, o.sw * 0.7);
  },
  ancien(o) {
    // le fauteuil des deux plans sociaux : l'assise a pris le pli
    const dossier = 'M9.4 4.4H22.6V15.4H9.4Z';
    const assise = 'M7 15.4H25V19.8H7Z';
    return hach(dossier, BOX, { pas: o.pas * 1.2, sw: o.hw * 0.8, color: o.ink, op: 0.5 })
      + st(dossier, o.ink, o.sw)
      + st(assise, o.ink, o.sw * 0.9)
      + st('M16 19.8V25.6', o.ink, o.sw)
      + st('M16 25.6L9.4 29.4M16 25.6L22.6 29.4M16 25.6V29.8', o.ink, o.sw * 0.9)
      + st('M10.6 8.4H17.2', o.ink, o.sw * 0.5);
  },
  corbeau(o) {
    // la boîte à idées : le post-it glissé n'était pas signé
    const mur = 'M6.4 16.4V27.8H25.6V16.4';
    const levres = 'M6.4 16.4H11.4M20.6 16.4H25.6';
    const postit = 'M15.4 6.8H24.2V15.8H15.4Z';
    return st(mur, o.ink, o.sw * 1.2)
      + hach(postit, BOX, { pas: o.pas * 1.4, sw: o.hw, color: o.rose })
      + st(postit, o.rose, o.sw * 0.6)
      + st('M15.4 9.8H21.4M15.4 12.8H19.4', o.rose, o.sw * 0.5)
      + st(levres, o.ink, o.sw * 1.2)
      + st('M4.4 30.6H27.6', o.ink, o.sw * 0.6);
  },
  bouc(o) {
    // la chaise la plus proche de la porte RH : le malheur a une adresse
    const chaise = 'M6.4 10.4H13.6V20H6.4Z';
    return st(chaise, o.ink, o.sw * 0.9)
      + st('M4.6 20H15.4V23.4H4.6Z', o.ink, o.sw * 0.8)
      + st('M5.6 23.4V28.6M14.4 23.4V28.6', o.ink, o.sw * 0.8)
      + st('M22.4 4.4H28.8V28.6H22.4', o.ink, o.sw)
      + `<circle cx="26.4" cy="16.4" r="0.9" fill="${o.ink}"/>`
      + st('M4.4 30.6H15.6M22.4 30.6H28.8', o.ink, o.sw * 0.5);
  },
  petiteFille(o) {
    // le téléphone sur trépied : le cœur d'écran ne filme que des costumes
    const tel = 'M12.4 3.4H19.6V11.4H12.4Z';
    const coeur = 'M16 9.8C15.6 9.2 14.8 8.8 14.2 9.2C13.4 9.8 13.6 10.8 14.6 11.4L16 12.2L17.4 11.4C18.4 10.8 18.6 9.8 17.8 9.2C17.2 8.8 16.4 9.2 16 9.8Z';
    return st(tel, o.ink, o.sw)
      + hach(coeur, BOX, { pas: o.pas * 1.6, sw: o.hw * 0.8, color: o.rose })
      + st(coeur, o.rose, o.sw * 0.5)
      + `<circle cx="16" cy="5" r="0.7" fill="${o.ink}"/>`
      + st('M16 11.4V16.6', o.ink, o.sw)
      + st('M16 16.6L9 28.8M16 16.6L23 28.8M16 16.6V29.6', o.ink, o.sw * 0.9)
      + st('M9.6 30H13.2M19.2 30H22.8', o.ink, o.sw * 0.6);
  },
  loupBlanc(o) {
    // le tampon de mission : la signature est le sceau, jamais la main
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
    // recto, verso : le même contrat, surligné des deux côtés
    const page = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(4.6)} 7.4H${X(14.4)}V25.8H${X(4.6)}Z`; };
    const marque = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(6.4)} 13.4H${X(12.6)}V16.2H${X(6.4)}Z`; };
    const lignes = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(6.4)} 9.8H${X(12.6)}M${X(6.4)} 19.2H${X(12.6)}M${X(6.4)} 21.8H${X(11.4)}M${X(6.4)} 24.4H${X(10.6)}`; };
    return hach(marque(1) + marque(0), BOX, { pas: o.pas * 1.2, sw: o.hw, color: o.rose, rule: 'evenodd' })
      + st(marque(1) + marque(0), o.rose, o.sw * 0.5)
      + st(page(1) + page(0), o.ink, o.sw * 0.9)
      + st(lignes(1) + lignes(0), o.ink, o.sw * 0.45)
      + st('M16 4V28.6', o.accent, o.sw * 0.6, ' stroke-dasharray="1.6 2.4"');
  },
  renard(o) {
    // trois flux convergent, un seul nœud : le flair répond au bout
    const fleches = 'M3.4 8.6L17.6 14M3.4 16H17.4M3.4 23.4L17.6 18';
    const tetes = 'M15.2 12.2L17.6 14L15.8 15.6M15 14.4L17.4 16L15 17.6M15.8 16.4L17.6 18L15.2 19.8';
    return st(fleches + ' ' + tetes, o.ink, o.sw * 0.8)
      + `<circle cx="21.6" cy="16" r="3.6" fill="none" stroke="${o.ink}" stroke-width="${o.sw}"/>`
      + `<circle cx="20.3" cy="15" r="0.7" fill="${o.ink}"/><circle cx="22.9" cy="15" r="0.7" fill="${o.ink}"/><circle cx="21.6" cy="17.6" r="0.7" fill="${o.ink}"/>`
      + st('M25.4 16H29.4', o.ink, o.sw * 0.7);
  },
  ours(o) {
    // le chien du Gardien : il aboie avant que les badges ne répondent
    const tete = 'M11 12.4C11 7.8 14.6 4.8 19 4.8C23.4 4.8 27 7.8 27 12.6C27 14 26.6 15.2 25.8 16.2L25.4 18.8L23 17.8L21.8 20L19.6 17.6C15.8 18 11 17.6 11 12.4Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(tete, o.ink, o.sw)
      + `<circle cx="17.8" cy="11.2" r="0.9" fill="${o.ink}"/>`
      + st('M11.4 9.6L13 8.4M14.8 7.6L16 6.6', o.ink, o.sw * 0.6)
      + st('M5.6 8.6C7 8.2 7.6 7 7.4 5.6M6.4 11.6C8 11.2 8.8 10 8.8 8.6', o.ink, o.sw * 0.6)
      + st('M7 30.2H25.4', o.ink, o.sw * 0.7);
  },
  voleur(o) {
    // le tiroir de la photocopieuse : deux cartes et un stylo, tout se mutualise
    const caisse = 'M4 18.4H28L26.4 27.8H5.6Z';
    const couvercle = 'M5.4 18.2L8.2 11.6H25.2L27 18.2';
    return st(caisse, o.ink, o.sw)
      + st(couvercle, o.ink, o.sw * 0.8)
      + st('M10.4 14.2L13.6 10.8L16 12.6L12.8 16Z', o.ink, o.sw * 0.7)
      + st('M15.4 13L18.6 9.6L21 11.4L17.8 14.8Z', o.ink, o.sw * 0.7)
      + st('M23 10.4L27.4 4.6', o.ink, o.sw * 0.8)
      + st('M24.2 8.4L26.9 5.2M26.2 5.9L27.9 4.9', o.ink, o.sw * 0.5)
      + st('M4 30.6H28', o.ink, o.sw * 0.7);
  },
  chienLoup(o) {
    // le badge d'intérim sur la balance : deux plateaux, une seule mission
    const panG = 'M2.8 18.4H13.6C13.6 21 11.6 22.6 8.2 22.6C4.8 22.6 2.8 21 2.8 18.4Z';
    const panD = 'M20.4 18.4H31.2C31.2 21 29.2 22.6 25.8 22.6C22.4 22.6 20.4 21 20.4 18.4Z';
    return st(panG + panD, o.ink, o.sw * 0.9)
      + st('M5.6 10.2L2.8 18.4M5.6 10.2L10.8 18.2M5.6 10.2H26.4M26.4 10.2L22 18.2M26.4 10.2L29.2 18.4', o.ink, o.sw * 0.7)
      + st('M16 10.2V27.6M10.4 27.6H21.6', o.ink, o.sw)
      + st('M4.4 18.2L10.8 17.6M20.4 18.2L27 17.6', o.ink, o.sw * 0.6)
      + st('M5.6 13.6L7.4 11.6L10.4 13L9 15.2L6 14.8ZM23.4 13.6L25.2 11.6L28.2 13L26.8 15.2L23.8 14.8Z', o.ink, o.sw * 0.7);
  },
  enfantSauvage(o) {
    // le t-shirt du Cadet : trois tailles de trop, il grandira dedans
    const tshirt = 'M8 8.4L12.4 6.4C13.4 8 18.6 8 19.6 6.4L24 8.4L27.4 11.6L24.4 15L22.6 13.6V26.4H9.4V13.6L7.6 15L4.6 11.6Z';
    return st(tshirt, o.ink, o.sw)
      + hach('M9.4 13.6H22.6V26.4H9.4Z', BOX, { pas: o.pas * 1.6, sw: o.hw * 0.7, color: o.ink, op: 0.45 })
      + `<circle cx="16" cy="18.4" r="2.2" fill="none" stroke="${o.ink}" stroke-width="${o.sw * 0.6}"/>`
      + st('M13.6 22.6H18.4', o.ink, o.sw * 0.5)
      + st('M9.4 26.4H22.6', o.ink, o.sw * 0.6);
  },
  soeurs(o) {
    // deux têtes, un seul gobelet : le murmure passe par la vapeur
    const tete = (cx) => `M${cx - 4.4} 12.4A4.4 4.4 0 1 0 ${cx + 4.4} 12.4A4.4 4.4 0 1 0 ${cx - 4.4} 12.4Z`;
    const gobelet = 'M12.8 21.4H19.2L18.4 27H13.6Z';
    return hach(tete(10.4) + tete(21.6), BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(tete(10.4) + tete(21.6), o.ink, o.sw)
      + `<circle cx="12" cy="11.4" r="0.9" fill="${o.ink}"/><circle cx="20" cy="11.4" r="0.9" fill="${o.ink}"/>`
      + st(gobelet, o.ink, o.sw * 0.9)
      + st('M14.6 19.6C14 18.6 14 17.4 15 16.4M17.4 19.6C16.8 18.6 16.8 17.4 17.8 16.4', o.ink, o.sw * 0.5)
      + st('M6 29H26', o.ink, o.sw * 0.7);
  },
  freres(o) {
    // trois fois le même badge : la banquette est commune, la parole aussi
    const tete = (cx) => `M${cx - 4.2} 11.6A4.2 4.2 0 1 0 ${cx + 4.2} 11.6A4.2 4.2 0 1 0 ${cx - 4.2} 11.6Z`;
    let s = '';
    for (const cx of [6.4, 16, 25.6]) s += hach(tete(cx), BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete(cx), o.ink, o.sw);
    return s
      + st('M4 16.8H28M4 19.6H28', o.ink, o.sw * 0.7)
      + st('M6.4 15V16.8M16 15V16.8M25.6 15V16.8', o.ink, o.sw * 0.5)
      + st('M6.8 23H11.2V26.6H6.8ZM14.3 23H18.7V26.6H14.3ZM20.8 23H25.2V26.6H20.8Z', o.ink, o.sw * 0.6);
  },
};

export function gsym(id, size, o = {}) {
  const big = size >= 96;
  const opts = {
    ink: o.ink ?? S.encre, bg: o.bg ?? S.papier, accent: o.accent ?? S.bleu, mass: o.mass ?? S.encre,
    // la planche dessine au rose vrai ; l'extraction passe la sentinelle (ROSE_SENTINELLE)
    rose: o.rose ?? S.rose, sw: big ? 0.8 : 2, hw: big ? 0.22 : 0.75, pas: big ? 1.05 : 3,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;" aria-hidden="true">${D[id](opts)}</svg>`;
}

// ---- les 18 coiffes du plateau (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
const TETE = 'M32 21A8 8 0 1 1 16 21A8 8 0 1 1 32 21Z';
export const GCOIFFES = [
  // le casque du vendredi porte le seul rose plein de la rangée
  { id: 'isolation', nom: 'casque à isolation active', d: 'M15.8 17C15.8 10.6 19.4 7.4 24 7.4C28.6 7.4 32.2 10.6 32.2 17ZM11.4 17H15.8V21.4C15.8 22.6 14.8 23.4 13.6 23.4C12.4 23.4 11.4 22.6 11.4 21.4ZM32.2 17H35.4C36 17 36.6 17.6 36.6 18.2V21.4C36.6 22.6 35.6 23.4 34.4 23.4C33.2 23.4 32.2 22.6 32.2 21.4Z', plis: 'M18.4 13.4C20 12.6 28 12.6 29.6 13.4' },
  { id: 'bonneAmbiance', nom: 'casquette de la bonne ambiance', d: 'M17 15.6C17 10.8 20 8.4 24 8.4C28 8.4 31 10.8 31 15.6ZM14.6 15.6H33.4V17.6H14.6ZM31.4 17.6H41.6V19.6H31.4Z', plis: 'M18.4 13.4C20 12.6 28 12.6 29.6 13.4' },
  // la capuche couvre tête et cou, deux trous de lumière — jamais le cagoule bâclée
  { id: 'capucheDev', nom: 'capuche de développeur', d: 'M24 5.4C17 5.4 12.4 12 12.4 19.8L10.6 34L7.6 48H40.4L37.4 34L35.6 19.8C35.6 12 31 5.4 24 5.4Z', capuche: true },
  { id: 'bobSeminaire', nom: 'bob du séminaire d’été', d: 'M17.6 15C17.6 11 20 9 24 9C28 9 30.4 11 30.4 15ZM14.8 15.2H33.2L31 20.4H17Z', plis: 'M18.4 13.4C20 12.6 28 12.6 29.6 13.4' },
  { id: 'beretDesigner', nom: 'béret de designer', d: 'M13.2 14.6C14 10.8 18.6 8.8 24 8.8C29.4 8.8 34 10.8 34.8 14.6C35 16 33.2 16.8 24 16.8C14.8 16.8 13 16 13.2 14.6ZM23.2 9L24 6.4L24.8 9Z', plis: 'M16.6 13.4C18.4 14.2 29.6 14.2 31.4 13.4' },
  { id: 'feteVendredi', nom: 'chapeau de fête du vendredi', d: 'M24 5.4L30.6 16.8H17.4ZM15.8 16.8H32.2V18.6H15.8ZM22.6 3.4A1.4 1.4 0 1 0 25.4 3.4A1.4 1.4 0 1 0 22.6 3.4Z', fluo: 'M19.8 12.4H28.2L29.5 14.8H18.5Z' },
  { id: 'chantierLocaux', nom: 'casque de chantier des locaux', d: 'M16.4 17C16.4 10.6 19.6 7.4 24 7.4C28.4 7.4 31.6 10.6 31.6 17ZM13 16.8H35V19.4H13Z', plis: 'M24 7.8V16.6' },
  { id: 'foulardYoga', nom: 'foulard du cours de yoga', d: 'M16 15.2C16 10.4 19.6 8 24 8C28.4 8 32 10.4 32 15.2ZM32 12.8L36.8 10.2L35.6 14.2L38.4 17.2L32.8 16.6Z', plis: 'M17.6 12.8C19.6 11.6 28.4 11.6 30.4 12.8' },
  { id: 'bonnetHiver', nom: 'bonnet du bureau d’hiver', d: 'M16.6 15.6C16.6 9.8 19.8 6.6 24 6.6C28.2 6.6 31.4 9.8 31.4 15.6V17.4H16.6ZM15.4 16.8H32.6V19.6H15.4ZM21.6 5A2.4 2.4 0 1 0 26.4 5A2.4 2.4 0 1 0 21.6 5Z', plis: 'M19.4 9V15M24 7.8V15M28.6 9V15' },
  { id: 'pluieVelo', nom: 'chapeau de pluie du vélo partagé', d: 'M17 14.6C17 10.4 20 8.4 24 8.4C28 8.4 31 10.4 31 14.6ZM10 15.8C14.4 17.6 33.6 17.6 38 15.8L37.2 19.6C32 21.2 16 21.2 10.8 19.6Z', plis: 'M18.8 11.6H29.2' },
  { id: 'casquetteRetournee', nom: 'casquette retournée du pôle croissance', d: 'M17 15.6C17 10.8 20 8.4 24 8.4C28 8.4 31 10.8 31 15.6ZM14.6 15.6H33.4V17.6H14.6ZM17 17.6H6.6V19.6H17Z', plis: 'M18.4 13.4C20 12.6 28 12.6 29.6 13.4' },
  { id: 'bombeMoto', nom: 'bombe de moto du commercial itinérant', d: 'M15.2 16.4C15.2 9.2 18.8 5.8 24 5.8C29.2 5.8 32.8 9.2 32.8 16.4V17.2H15.2ZM14.2 17.4H33.8V19.2H14.2ZM32.8 17L37.4 17.8V19.4L32.8 19Z' },
  { id: 'canotierDecembre', nom: 'canotier du déguisement de décembre', d: 'M17.6 15.8V7.6H30.4V15.8ZM12.2 15.8H35.8V17.8H12.2Z', plis: 'M18.6 10.4H29.4M18.6 13.4H29.4' },
  { id: 'turbanCreatif', nom: 'turban du week-end créatif', d: 'M15.4 15.6C15.4 9.6 19 6.4 24 6.4C29 6.4 32.6 9.6 32.6 15.6ZM13.8 15.6H34.2V17.4H13.8ZM32.6 12.4L36.4 10.6L35.2 13.4L37 15.8L33.4 15.4Z', plis: 'M17 9.4C19.4 11.8 28.6 11.8 31 9.4M19.6 6.9C21.6 9.4 26.4 9.4 28.4 6.9' },
  { id: 'casquetteFoodtruck', nom: 'casquette du food-truck du mercredi', d: 'M16.8 14.4C16.8 9 20 6.4 24 6.4C28 6.4 31.2 9 31.2 14.4ZM14.4 14.4H33.6V16.6H14.4ZM31.2 16.6H41.8V18.8H31.2Z', plis: 'M24 6.8V14M19.6 7.6L20.2 13.6M28.4 7.6L27.8 13.6' },
  { id: 'cowboyCommercial', nom: 'chapeau de cow-boy du service commercial', d: 'M17.4 12.4C17.4 6.8 19.8 4.6 24 4.6C28.2 4.6 30.6 6.8 30.6 12.4ZM8.6 16.4C11 13.2 16 11.6 24 11.6C32 11.6 37 13.2 39.4 16.4C36 18.2 30 19.4 24 19.4C18 19.4 12 18.2 8.6 16.4Z', plis: 'M20.6 6.4C22 7.6 26 7.6 27.4 6.4' },
  { id: 'calotteTricotee', nom: 'calotte tricotée par une collègue', d: 'M16.8 15.4C16.8 12.2 19.8 10.4 24 10.4C28.2 10.4 31.2 12.2 31.2 15.4ZM15.4 15.4H32.6V16.8H15.4Z', plis: 'M17.6 13.2L19.4 11.8L21.2 13.2L23 11.8L24.8 13.2L26.6 11.8L28.4 13.2L30.2 11.8' },
  { id: 'casqueStandard', nom: 'casque du standard qui n’existe plus', d: 'M13.8 17C13.8 9.8 18.2 6.2 24 6.2C29.8 6.2 34.2 9.8 34.2 17L31.8 17C31.8 11 28.4 8.2 24 8.2C19.6 8.2 16.2 11 16.2 17ZM13.4 16.8C13.4 15.2 14.6 14 16.2 14C17.8 14 19 15.2 19 16.8V20.2C19 21.8 17.8 23 16.2 23C14.6 23 13.4 21.8 13.4 20.2ZM29 16.8C29 15.2 30.2 14 31.8 14C33.4 14 34.6 15.2 34.6 16.8V20.2C34.6 21.8 33.4 23 31.8 23C30.2 23 29 21.8 29 20.2ZM15.8 22.6C14.2 26.4 16 28.8 20 29L20.2 27.2C17.4 27 16.4 25.6 17.4 23Z' },
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
  if (c.plis) s += `<path d="${c.plis}" stroke="${bg}" stroke-width="0.8" fill="none"/>`;
  return s;
}
const svg48 = (inner, size) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display: block;" aria-hidden="true">${inner}</svg>`;

// ---- les faces
function gcuv(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${S.teinte}"/><path d="M${x} ${y + h}V${y}H${x + w}" fill="none" stroke="${S.encre}" stroke-opacity="0.38"/><path d="M${x + w} ${y}V${y + h}H${x}" fill="none" stroke="${S.bruni}" stroke-width="1.5"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="none" stroke="${S.encre}" stroke-opacity="0.14"/>`;
}
function gcart(kind, x, y, w, h, mot) {
  // la direction garde le bleu costume : la sanguine est au plateau, pas à la meute
  const ordre = kind !== 'ecu';
  return `<path d="${cartPath(kind, w, h)}" transform="translate(${x} ${y})" fill="${S.bruni}" stroke="${ordre ? S.bleu : S.encre}" stroke-width="${ordre ? 2 : 1.5}"/><text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="${F.ss}" font-size="14" font-weight="${ordre ? 600 : 400}" fill="${ordre ? S.bleu : S.encre}">${mot}</text>`;
}
export function gface(id) {
  const r = SROLES.find((x) => x.id === id);
  let s = `<rect width="300" height="420" fill="${S.bruni}"/><rect x="0.5" y="0.5" width="299" height="419" fill="none" stroke="${K.p2}"/>`;
  s += gcuv(12, 12, 276, 396);
  const rect = 'M24 24h252v264h-252Z', ov = 'M54 154A96 112 0 1 0 246 154A96 112 0 1 0 54 154Z';
  // le fond suit le camp : hachure du plateau, aquatinte de la meute
  if (r.camp === 'direction') s += grain(rect + ov, [24, 24, 252, 264], { f: 'aqua-I', op: 0.55 }).replace('<path d=', '<path clip-rule="evenodd" d=');
  else s += hach(rect + ov, [24, 24, 252, 264], { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
  s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/><ellipse cx="150" cy="154" rx="96" ry="112" fill="none" stroke="${S.encre}"/><ellipse cx="150" cy="154" rx="92.5" ry="108.5" fill="none" stroke="${S.encre}" stroke-width="0.5"/>`;
  s += gsym(id, 128, { bg: S.teinte }).replace('<svg ', '<svg x="86" y="88" ');
  s += `<rect x="244" y="24" width="32" height="24" fill="${S.teinte}" stroke="${S.encre}" stroke-width="0.75"/><text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${S.del}">${r.n}</text>`;
  s += r.camp === 'plateau' ? gcart('ecu', 84, 275, 132, 26, 'Le plateau') : r.camp === 'direction' ? gcart('mordu', 84, 275, 132, 26, 'La direction') : gcart('mordu2', 84, 275, 132, 26, 'Seul');
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="${r.nom.length > 16 ? 24 : 28}" fill="${S.encre}">${r.nom}</text>`;
  s += `<text x="150" y="364" text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${S.del}">${r.leg}</text>`;
  s += `<text x="150" y="386" text-anchor="middle" font-family="${F.sc}" font-size="13" letter-spacing="0.8" fill="${S.del}">${r.motif}</text>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}
export function gdos() {
  let s = `<rect width="300" height="420" fill="${S.relief}"/><rect x="12" y="12" width="276" height="396" fill="${S.encre}"/><rect x="12" y="12" width="276" height="396" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
  s += `<rect x="12.5" y="12.5" width="275" height="395" fill="none" stroke="${K.p3}"/><rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const V = S.papier;
  // les diodes du plafonnier, en veille elles aussi
  s += `<g fill="${S.craie}" opacity="0.5"><circle cx="70" cy="56" r="0.8"/><circle cx="120" cy="44" r="0.7"/><circle cx="180" cy="50" r="0.8"/><circle cx="226" cy="42" r="0.7"/><circle cx="252" cy="60" r="0.8"/></g>`;
  // le mur du fond, et le couloir RH éclairé — la seule porte ouverte
  s += `<path d="M36 148H264" stroke="${V}" stroke-width="1.2"/><path d="M126 102H174V148H126Z" fill="${S.craie}" opacity="0.22" stroke="${V}" stroke-width="0.9"/><path d="M150 102V148" stroke="${V}" stroke-width="0.6" opacity="0.7"/>`;
  // les cloisons, lignes brisées — jamais des murs pleins (règle-signature)
  s += `<path d="M40 148V128M62 148V128M40 128H62M40 128L62 120M238 148V128M260 148V128M238 128H260M260 128L238 120" stroke="${V}" stroke-width="0.8" fill="none" opacity="0.8"/>`;
  // le rang des bureaux, au loin
  s += `<g stroke="${V}" stroke-width="0.8" fill="none"><path d="M48 206H92M48 206V218M92 206V218M70 199V206"/><path d="M108 206H152M108 206V218M152 206V218M130 199V206"/><path d="M212 206H256M212 206V218M256 206V218M234 199V206"/></g>`;
  s += `<g fill="${S.craie}" opacity="0.6"><circle cx="70" cy="202" r="0.7"/><circle cx="130" cy="202" r="0.7"/><circle cx="234" cy="202" r="0.7"/></g>`;
  // la multiprise du rang du fond : trois diodes qui ne dorment jamais
  s += `<path d="M186 214H210V220H186Z" stroke="${V}" stroke-width="0.7" fill="none"/><g fill="${S.craie}"><circle cx="190" cy="217" r="0.6"/><circle cx="196" cy="217" r="0.6"/><circle cx="202" cy="217" r="0.6"/></g>`;
  // les deux bureaux du premier rang, écran en veille
  s += `<g stroke="${V}" stroke-width="1" fill="none"><path d="M28 312H100M28 312V332M100 312V332M64 296V312"/><rect x="50" y="282" width="28" height="18"/><path d="M64 300V306"/><path d="M200 312H272M200 312V332M272 312V332M236 296V312"/><rect x="222" y="282" width="28" height="18"/><path d="M236 300V306"/></g>`;
  s += `<circle cx="64" cy="291" r="1" fill="${S.craie}"/><circle cx="236" cy="291" r="1" fill="${S.craie}"/>`;
  // le ficus du fond, légèrement fatigué
  s += `<path d="M44 148V128M44 132C38 126 32 124 26 126M44 130C50 124 56 122 62 124M44 136C40 142 36 144 30 144" stroke="${V}" stroke-width="0.9" fill="none" stroke-linecap="round"/><path d="M38 148H50L48 160H40Z" stroke="${V}" stroke-width="0.8" fill="none"/>`;
  // la machine à café : le seul rose plein de la planche, elle veille
  s += `<path d="M244 232H268V266H244Z" stroke="${V}" stroke-width="1.2" fill="none"/><path d="M244 240H268M248 232V226H264V232" stroke="${V}" stroke-width="0.7" fill="none"/><circle cx="256" cy="244" r="1.6" fill="${S.rose}"/><path d="M252 258H260L259 264H253Z" stroke="${V}" stroke-width="0.8" fill="none"/><path d="M255 268C254 271 255 273 257 275M258 268C257 271 258 273 260 275" stroke="${V}" stroke-width="0.6" fill="none" opacity="0.8"/>`;
  s += `<path d="M30 364H270" stroke="${V}" stroke-width="1"/>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte Open Space : le plateau la nuit, la machine à café veille">${s}</svg>`;
}
export function friseOpenSpace(w, nuit) {
  const base = 56;
  const ix = w * 0.46;
  const V = S.papier;
  let s = nuit ? `<rect width="${w}" height="56" fill="${S.encre}"/><rect width="${w}" height="56" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>` : `<rect width="${w}" height="56" fill="${S.papier}"/><rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  // la plante et l'écran en veille, meubles du plateau
  const plante = (x) => `M${x} ${base}V${base - 12}M${x} ${base - 8}C${x - 5} ${base - 14} ${x - 9} ${base - 15} ${x - 11} ${base - 18}M${x} ${base - 8}C${x + 5} ${base - 14} ${x + 9} ${base - 15} ${x + 11} ${base - 18}`;
  const ecran = (x) => `M${x - 7} ${base}V${base - 8}H${x + 7}V${base}Z M${x} ${base}V${base + 3}`;
  s += `<path d="${[plante(w * 0.15), ecran(w * 0.28), ecran(w * 0.78), plante(w * 0.9)].join(' ')}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  // la nuit, les diodes veillent au sol
  if (nuit) s += `<g fill="${S.craie}"><circle cx="${w * 0.28}" cy="${base - 4}" r="0.9"/><circle cx="${w * 0.78}" cy="${base - 4}" r="0.9"/><circle cx="${w * 0.08}" cy="${base - 2}" r="0.9"/><circle cx="${w * 0.08 + 6}" cy="${base - 2}" r="0.9"/></g>`;
  // la cloison du fond, ligne brisée — jamais un mur plein
  s += `<path d="M${ix - 70} ${base - 9}V${base}M${ix - 70} ${base - 9}H${ix - 58}V${base}M${ix + 70} ${base - 9}V${base}M${ix + 70} ${base - 9}H${ix + 58}V${base}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.9" fill="none" opacity="0.8"/>`;
  // la machine à café, seul rose plein de la frise
  s += `<path d="M${ix - 11} ${base - 14}H${ix + 11}V${base - 2}H${ix - 11}Z" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1.1"/><path d="M${ix - 11} ${base - 9}H${ix + 11}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.7"/><circle cx="${ix}" cy="${base - 11}" r="1.3" fill="${S.rose}"/><path d="M${ix - 3} ${base - 4}H${ix + 3}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="0.9"/>`;
  s += `<path d="M0 ${base}H${w}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1"/>`;
  return `<svg width="${w * 1.5}" height="84" viewBox="0 0 ${w} 56" style="display: block;" role="img" aria-label="Frise du plateau, ${nuit ? 'nuit' : 'jour'}">${s}</svg>`;
}
export function openspace() {
  setPfx('cOS');
  const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
  const sc = (t) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${S.del};">${t}</div>`;
  const corps = (t, w) => `<p style="margin: 0; font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.del}; width: ${w}px;">${t}</p>`;
  let b = `<svg width="1600" height="1520" viewBox="0 0 1600 1520" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="1600" height="1520" fill="#000" filter="url(#papier)" opacity="0.2"/></svg>`;
  b += abs(48, 36, `${sc('Garoutom · Caprices · lot C — le sixième habit')}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${S.encre};">Open Space — le plateau contre la direction</h1><p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 18px; line-height: 24px; color: ${S.del};">« Le questionnaire était anonyme. » — la légende du plateau.</p>`, 'width: 1000px;');
  b += abs(1100, 40, corps('Seuls changent les valeurs, les motifs et les mots : bistre de nuit #0D1420 sur papier machine #ECEDEA ; la meute ne garde pas la sanguine, elle prend le bleu costume #2D4E8A ; le rose du post-it n’existe qu’en hachure à 45° — seul le voyant de la machine à café est rose plein. Règle-signature : les cloisons sont des lignes brisées, jamais des murs pleins.', 420));
  b += abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${S.del};">Pl. C-IX</span>`, 'width: 52px; text-align: right;');
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
  const faces = [['loup', 'Le Manager sur l’aquatinte de la meute : costume au trait, cravate en masse de meute, badge de direction. Le bleu de la planche n’existe pas sur la carte.'], ['villageois', 'Le Salarié : l’encre du bistre, la hachure ordinaire, le badge au cordon — le gobelet garde la main libre.'], ['loupBlanc', 'Le Consultant : carte brunie, aucune aquatinte ; le tampon et le sceau au bleu costume, le cartouche « Seul ».']];
  faces.forEach(([id, t], i) => {
    const x = 48 + i * 330;
    b += abs(x, 456, gface(id));
    b += abs(x, 886, corps(t, 300));
  });
  b += abs(1038, 456, gdos());
  b += abs(1038, 886, corps('Dos de la nuit : les bureaux en rang, les écrans en veille, le couloir RH éclairé au fond — et la machine à café, seul rose plein de la planche, qui veille sur l’aquatinte IV.', 300));
  b += `<div style="position: absolute; left: 48px; top: 950px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 18 coiffes, deux rangs de neuf
  b += abs(48, 968, sc('Les dix-huit coiffes du plateau (sièges 1 à 18, moitié en gravure, moitié en silhouette)'));
  GCOIFFES.forEach((c, i) => {
    const x = 48 + (i % 9) * 166;
    const y = i < 9 ? 994 : 1106;
    b += abs(x, y, `<div style="width: 150px;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width: 64px; height: 64px; border: 1px solid ${K.p2}; background: ${S.bruni};">${svg48(gcoiffe(c, S.encre, S.bruni, S.rose), 62)}</div>${svg48(gcoiffe(c, S.encre, S.bruni, S.rose, true), 40)}</div><div style="margin-top: 3px; font-family: ${F.ss}; font-size: 12px; line-height: 15px; color: ${S.encre};">${c.nom}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 1240px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // la frise du plateau
  b += abs(48, 1258, sc('La frise — les bureaux en rang au lieu des toits (mobile 390, agrandie 150 %)'));
  b += abs(48, 1284, friseOpenSpace(390, false));
  b += abs(48, 1380, friseOpenSpace(390, true));
  // ce qui change
  const rows = [
    ['encre', '#0D1420 bistre de nuit · le plateau après le départ'],
    ['papier', '#ECEDEA · les vergeures du papier machine'],
    ['bruni', '#F7F8F5 · les matins sans réunion'],
    ['le rose', '#F0438E en hachure à 45° · plein pour le voyant de la machine à café seul'],
    ['la meute', '#2D4E8A bleu costume — cette direction change de sang, elle'],
    ['cartouches', '« Le plateau » · « La direction » · « Seul »'],
    ['teinte de planche', '#DCDEDA (proposée ici, à remonter)'],
    ['règle-signature', 'les cloisons sont des lignes brisées, jamais des murs pleins'],
  ];
  b += abs(700, 1258, sc('Ce qui change — et rien d’autre'));
  b += abs(700, 1284, `<div style="display: grid; grid-template-columns: 150px 330px; gap: 6px 16px; width: 496px;">${rows.map(([a, c]) => `<div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${S.del};">${a}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.encre};">${c}</div>`).join('')}</div>`);
  // les cartouches
  b += abs(1230, 1258, sc('Cartouches du plateau'));
  b += abs(1230, 1284, `<svg width="320" height="150" viewBox="0 0 320 150" role="img" aria-label="Cartouches Le plateau, La direction, Seul">${gcart('ecu', 0, 0, 140, 30, 'Le plateau')}${gcart('mordu', 160, 0, 140, 30, 'La direction')}${gcart('mordu2', 0, 50, 140, 30, 'Seul')}${gcart('ecu', 160, 50, 140, 30, 'Le plateau')}</svg>`);
  return page({ title: 'C-OpenSpace', w: 1600, h: 1520, bg: `background-color: ${S.papier}; background-image: repeating-linear-gradient(90deg, rgba(13,20,32,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(13,20,32,.035) 0 .6px, transparent .6px 3px); color: ${S.encre};`, body: b });
}
