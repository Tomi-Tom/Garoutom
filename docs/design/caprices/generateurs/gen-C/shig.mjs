// Planche Shiganshina (SPEC § 8) : 21 symboles, 3 faces, dos aux Portes, frise du Mur, 6 coiffes.
import { K, F, page, setPfx, hach, hachRect, grain, cartPath, tlines, uid, rnd } from './lib.mjs';

const S = {
  encre: '#141614', papier: '#E4E0D4', bruni: '#F1EFE8', relief: '#262926', teinte: '#DCD7CA',
  vert: '#45523F', vertNuit: '#8FA07E', san: K.san, cra: K.cra, del: K.del, p1: K.p1, p2: K.p2, p3: K.p3,
};
const BOX = [0, 0, 32, 32];

export const SROLES = [
  { id: 'habitant', n: 1, nom: 'Habitant·e du district', camp: 'district', leg: '« Tristes pressentiments. »', ref: 'Désastre 1', motif: 'miche de ration fendue' },
  { id: 'titan', n: 2, nom: 'Titan', camp: 'titans', leg: '« On ne sait pas pourquoi. »', ref: 'Désastre 35', motif: 'main de Colosse agrippée au créneau ; vapeur' },
  { id: 'eclaireuse', n: 3, nom: 'l’Éclaireuse', camp: 'district', leg: '« Je l’ai vu. »', ref: 'Désastre 44', motif: 'longue-vue à trois tirages' },
  { id: 'scientifique', n: 4, nom: 'la Scientifique', camp: 'district', leg: '« Ceci est pire. »', ref: 'Désastre 37', motif: 'seringue à demi pleine' },
  { id: 'caporal', n: 5, nom: 'le Caporal', camp: 'district', leg: '« Et il n’y a pas de remède. »', ref: 'Désastre 15', motif: 'lame droite et sa poignée' },
  { id: 'ymir', n: 6, nom: 'Ymir', camp: 'district', leg: '« Avec raison ou sans. »', ref: 'Désastre 2', motif: 'arbre dont deux racines se nouent' },
  { id: 'sentinelle', n: 7, nom: 'la Sentinelle', camp: 'district', leg: '« Elle garde la Porte ; ils passent par le Mur. »', ref: '', motif: 'lanterne de ronde' },
  { id: 'goinfre', n: 8, nom: 'la Goinfre', camp: 'district', leg: '« Graciée, la bouche pleine. »', ref: '', motif: 'pomme de terre croquée' },
  { id: 'veteran', n: 9, nom: 'le Vétéran', camp: 'district', leg: '« Il en a vu d’autres. Il en verra moins. »', ref: '', motif: 'épée brisée, la pointe à part' },
  { id: 'brigadier', n: 10, nom: 'le Brigadier', camp: 'district', leg: '« Enterrer et se taire. »', ref: 'Désastre 18', motif: 'fusil de la Brigade' },
  { id: 'eldien', n: 11, nom: 'l’Eldien', camp: 'district', leg: '« C’est pour cela que vous êtes nés. »', ref: 'Désastre 12', motif: 'fers reliés par trois maillons' },
  { id: 'recrue', n: 12, nom: 'la Recrue', camp: 'district', leg: '« On ne peut pas regarder. »', ref: 'Désastre 26', motif: 'un œil dans l’embrasure du créneau' },
  { id: 'machoire', n: 13, nom: 'le Titan Mâchoire', camp: 'seul', leg: '« Les Titans ne se mangent pas entre eux, dit-on. »', ref: '', motif: 'mâchoire en réserve, mordue des deux côtés' },
  { id: 'pisteur', n: 14, nom: 'le Pisteur', camp: 'district', leg: '« Le voisin sent le voisin. »', ref: '', motif: 'groin au vent, trois traces sur la dalle' },
  { id: 'ours', n: 15, nom: 'l’Ours de foire', camp: 'district', leg: '« Il grogne à l’aube, dit-on. »', ref: '', motif: 'gueule entrouverte, haleine en traits' },
  { id: 'double', n: 16, nom: 'l’Habitant double', camp: 'district', leg: '« Recto, verso : le même visage. »', ref: '', motif: 'deux profils frappés sur la même pièce' },
  { id: 'escamoteur', n: 17, nom: 'l’Escamoteur', camp: 'district', leg: '« La main est plus vite que l’œil. »', ref: '', motif: 'carte de ration au coin levé, sur le talon' },
  { id: 'chien', n: 18, nom: 'le Chien de garde', camp: 'district', leg: '« Le collier d’abord, la dent ensuite. »', ref: '', motif: 'tête à demi mordue d’ombre' },
  { id: 'gamin', n: 19, nom: 'l’Enfant des ruelles', camp: 'district', leg: '« Il désigne ; l’ombre grandit. »', ref: '', motif: 'un doigt levé, une ombre basse derrière' },
  { id: 'lavoir', n: 20, nom: 'les Sœurs du lavoir', camp: 'district', leg: '« Deux têtes, un seul chuchotement. »', ref: '', motif: 'deux têtes sous un même fichu' },
  { id: 'casques', n: 21, nom: 'les Trois de la mine', camp: 'district', leg: '« Trois casques sur la même dalle. »', ref: '', motif: 'trois casques de mineur en rang' },
];

const st = (d, c, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const MAIN_TITAN = 'M7.4 18C7 12 8.6 6 11.4 4.2L13.6 4.6C12.6 8 12.4 12 13 16.4L14.4 16.4C14 10 15.2 3.6 18 2.6L20.2 3.4C19 8 18.8 12 19.4 16.4L20.8 16.6C21 11.4 22.6 7 25.2 6.4L26.8 7.4C25.6 10.6 25.2 14 25.8 18.4L24.4 19.6L22.6 18.8L21 20L19.2 19L17.4 20.2L15.6 19L13.8 20.2L12 19.2L10.2 20.2L8.6 19.2Z';
const MUR = 'M2 30V20H6V16.6H10V20H14V16.6H18V20H22V16.6H26V20H30V30Z';

const D = {
  habitant(o) {
    const miche = 'M5 19.6C5 12.4 10.4 8 16 8C21.6 8 27 12.4 27 19.6C27 23.6 22 26 16 26C10 26 5 23.6 5 19.6Z';
    return hach('M5 19.6C5 23.6 10 26 16 26C22 26 27 23.6 27 19.6C24 22 8 22 5 19.6Z', BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(miche, o.ink, o.sw) + st('M10.4 13.6L13.4 17.4M15 11.6L18.4 16.4M20 12.6L23 16.4', o.ink, o.sw * 0.8) + st('M3.6 28.4H28.4', o.ink, o.sw * 0.7);
  },
  titan(o) {
    let s = hach(MUR, BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(MUR, o.ink, o.sw * 0.8);
    s += `<path d="${MAIN_TITAN}" fill="${o.ink}"/>`;
    s += st('M22.8 3.4C21.6 2.2 23.2 1.2 22.4 0M26.6 5C25.8 3.8 27.4 3 26.8 1.6', o.accent, o.sw * 0.6);
    return s;
  },
  eclaireuse(o) {
    const a = 'M4.2 23.6L8.4 27.8L14 22.2L9.8 18Z', b = 'M10.4 17.4L14.6 21.6L21 15.2L16.8 11Z', c = 'M16.6 10.6L21.4 15.4L28.4 8.4L23.6 3.6Z';
    return hach(c, BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(a + b + c, o.ink, o.sw) + st('M12.4 19.4L12.2 19.6M18.6 13.2L18.4 13.4', o.ink, o.sw) + st('M23.6 3.6L28.4 8.4', o.ink, o.sw * 1.4);
  },
  scientifique(o) {
    const fut = 'M9.6 20.6L19.6 10.6L23.4 14.4L13.4 24.4Z';
    return hach('M14.6 15.6L19.6 10.6L23.4 14.4L18.4 19.4Z', BOX, { pas: o.pas * 0.8, sw: o.hw, color: o.ink }) + st(fut, o.ink, o.sw) + st('M21.5 12.5L24.6 9.4M24.6 9.4L29.4 4.6M11.5 22.5L7 27M5.2 25.2L8.8 28.8', o.ink, o.sw) + st('M13.4 17.2L14.8 18.6M15.8 14.8L17.2 16.2M18.2 12.4L19.6 13.8', o.ink, o.sw * 0.5);
  },
  caporal(o) {
    const lame = 'M14.4 22V5.6L17.6 2.4V22Z';
    return hach('M16 22V4L17.6 2.4V22Z', BOX, { pas: o.pas * 0.8, sw: o.hw, color: o.ink }) + st(lame, o.ink, o.sw) + st('M11.4 22.4H20.6M14.4 22.4L13.8 30H18.2L17.6 22.4M18.2 26.6C21 26.6 21.4 29.4 18.6 29.6', o.ink, o.sw);
  },
  ymir(o) {
    return st('M16 27V15M16 19L10 12.6M16 17.2L22.4 10M16 15V5.4M10 12.6L6.6 9.6M10 12.6L9.2 7.2M22.4 10L26.6 8.4M22.4 10L23.2 5', o.ink, o.sw) + st('M16 27C12 27 10 29.6 6 29.4M16 27C20 27 22 29.6 26 29.4M12.4 27.6C15.6 29.2 17.6 29.6 20 28', o.ink, o.sw * 0.8);
  },
  sentinelle(o) {
    return hach('M11 10.6H16V23.4H11Z', BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st('M11 10.6H21V23.4H11ZM16 10.6V23.4M11 17H21M9.6 10.6L16 5.4L22.4 10.6M9.6 23.4H22.4V26H9.6Z', o.ink, o.sw) + st('M14.4 5.4A1.6 1.6 0 1 1 17.6 5.4', o.ink, o.sw * 0.8);
  },
  goinfre(o) {
    const p = 'M6 18C5.4 11.4 10.6 6.8 16.6 7C20.6 7.2 22.6 8.4 24 10.2C22.8 10.6 22.6 12 23.6 12.8C22.6 13.6 22.8 15 24 15.4C25.2 15.6 26.4 15 27 14.4C27.4 15.6 27.4 17 27.2 18.4C26.6 23 22 26 16 26C10.4 26 6.4 23 6 18Z';
    return hach('M6 18C6.4 23 10.4 26 16 26C12 23.6 9 19.6 9.6 12.4C7.4 13.6 5.8 15.4 6 18Z', BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(p, o.ink, o.sw) + `<circle cx="13" cy="15" r="0.9" fill="${o.ink}"/><circle cx="17.6" cy="20.4" r="0.9" fill="${o.ink}"/><circle cx="11.6" cy="21.2" r="0.8" fill="${o.ink}"/>`;
  },
  veteran(o) {
    return st('M14.6 23V12.6L15.6 11L16.2 12.6L17 11.2L17.4 12.8V23ZM10 23.2H22M16 23.2V29.6', o.ink, o.sw) + `<circle cx="16" cy="30.2" r="1.2" fill="${o.ink}"/>` + st('M20.2 3.6L22.6 4L22.2 9.4L21.2 8.4L20.4 9.6Z', o.ink, o.sw * 0.8);
  },
  brigadier(o) {
    return `<path d="M2.6 26.4L9.2 21.6L11.6 24.2L5.6 29Z" fill="${o.ink}"/>` + st('M9.2 21.6L27.4 6M11.6 24.2L29 9.2M27.4 6L29 9.2M13.4 22.8C13 25.4 15.4 26 16.4 24.6M25.6 7.6L30 3.4', o.ink, o.sw * 0.9);
  },
  eldien(o) {
    return st('M10 15.4A5.6 5.6 0 1 0 10 26.6A5.6 5.6 0 1 0 10 15.4ZM22 15.4A5.6 5.6 0 1 0 22 26.6A5.6 5.6 0 1 0 22 15.4Z', o.ink, o.sw * 1.2) + st('M13.6 12.4C14.6 10.8 17.4 10.8 18.4 12.4M12.6 15.4L13.6 12.4M19.4 15.4L18.4 12.4M14.6 9.4C15.6 8 16.4 8 17.4 9.4', o.ink, o.sw * 0.8);
  },
  recrue(o) {
    const mur = 'M2 30V15H9V11H13V15H19V11H23V15H30V30Z';
    return hach(mur, BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(mur, o.ink, o.sw) + `<path d="M13.4 13Q16 10.6 18.6 13Q16 15.4 13.4 13Z" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.sw * 0.6}"/><circle cx="16" cy="13" r="1" fill="${o.ink}"/>`;
  },
  machoire(o) {
    const h = 'M3 13L6 9.4L9 10.4L12 8.6L16 9.6L20 8.4L24 9.8L27 8.6L29.4 11L28 16L25.6 13.6L23.2 16.4L20.8 13.8L18.4 16.6L16 14L13.6 16.6L11.2 13.8L8.8 16.4L6.4 13.8L4.6 15.6Z';
    const b = 'M5.6 20.6L8 18.4L10.4 20.8L12.8 18.2L15.2 20.8L17.6 18.2L20 20.8L22.4 18.2L24.8 20.6L27.6 18.6L28.6 22C27 26 21.4 28.6 15.4 28.4C10.2 28.2 6.6 25.8 5.6 20.6Z';
    return `<path d="${h}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw}" stroke-linejoin="miter"/><path d="${b}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.sw}" stroke-linejoin="miter"/>`;
  },
  pisteur(o) {
    const tete = 'M10.2 4.4L8.4 10L3.4 13.4L8.6 14.4L7.4 16.6C10 17 12.4 18.4 13.8 20.6L14.8 24.6L19.8 22.6L23.8 18.4L21 9.6L18.4 3.4L14.6 8.4L12.6 8L10.2 4.4Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete, o.ink, o.sw)
      + `<circle cx="4.4" cy="13.6" r="0.9" fill="${o.ink}"/>`
      + st('M18.4 27.6H28.6M20.6 25.8V27.6M23 25.8V27.6M25.4 25.8V27.6', o.ink, o.sw * 0.8);
  },
  ours(o) {
    const tete = 'M4.4 12.2L10.8 9.4L14.2 5.6C14.8 4 16.2 3.2 17.5 3.5C18.8 3.8 19.6 4.8 19.8 6.2L25.4 12.4C26.7 15.6 26.7 19.4 25.3 22.6L23.6 27.2L9.2 27.4L9.6 23.2L6.9 18.6L5.4 15.8L4.6 13.8Z';
    return hach(tete, BOX, { pas: o.pas, sw: o.hw, color: o.ink }) + st(tete, o.ink, o.sw)
      + `<circle cx="13" cy="12.4" r="0.9" fill="${o.ink}"/><circle cx="5.2" cy="13.2" r="0.9" fill="${o.ink}"/>`
      + st('M5.1 15.2L8 16L7.2 17.4M3.1 15.4L2 16.2M3.4 17.2L2.4 18.4M7 30H23.6', o.ink, o.sw * 0.8);
  },
  double(o) {
    const profil = (m) => { const X = (x) => (m ? x : 32 - x); return `M${X(9.6)} 22.2C${X(9)} 17.6 ${X(9.7)} 12.6 ${X(11.6)} 9.8C${X(12.6)} 8.4 ${X(13.8)} 8.2 ${X(14.6)} 9.4L${X(15.4)} 11L${X(14.2)} 11.5L${X(14.9)} 12.7L${X(13.9)} 13.1L${X(14.4)} 14.6L${X(13.2)} 15L${X(12.4)} 17.8L${X(11.4)} 21.4Z`; };
    return st('M16 2.9A13.1 13.1 0 1 0 16 29.1A13.1 13.1 0 1 0 16 2.9Z', o.ink, o.sw)
      + st(profil(1) + profil(0), o.ink, o.sw * 0.9)
      + `<circle cx="12.6" cy="11.3" r="0.8" fill="${o.ink}"/><circle cx="19.4" cy="11.3" r="0.8" fill="${o.ink}"/>`
      + st('M16 8.6V22.6', o.ink, o.sw * 0.6);
  },
  escamoteur(o) {
    // la carte de ration, face cachée ; le coin se lève — ce n’est pas un vol, c’est un choix
    const carte = 'M11 3.8L21.4 5.9L23 8.8L21.4 26.8L9.2 24.2Z';
    const coin = 'M21.4 5.9L23 8.8L19.6 8.1Z';
    return hach(carte, BOX, { pas: o.pas, sw: o.hw, color: o.ink })
      + st(carte, o.ink, o.sw)
      + `<path d="${coin}" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.sw * 0.8}" stroke-linejoin="round"/>`
      + st('M8 30.4H24', o.ink, o.sw * 0.7);
  },
  chien(o) {
    // mi-chien mi-loup : l’oreille tombante d’un côté, la moitié mordue d’ombre de l’autre
    const crane = 'M16 4.4C10.6 4.4 7.2 8.2 7.2 12.8C7.2 17.6 10.4 21.4 14.2 22.8L16 23.2L17.8 22.8C21.6 21.4 24.8 17.6 24.8 12.8C24.8 8.2 21.4 4.4 16 4.4Z';
    const demi = 'M16 4.4C21.4 4.4 24.8 8.2 24.8 12.8C24.8 17.6 21.6 21.4 17.8 22.8L16 23.2Z';
    const flop = 'M9.5 6.6C7.6 8.2 6.8 11.2 7.1 14.4C7.3 16 8.2 16.9 9.2 16.6C10 16.3 10.3 15 10.1 13.7';
    const droite = 'M21.8 6.6L24.3 2C24.8 1.5 25.5 1.8 25.5 2.6L24.8 8.2';
    return hach(demi, BOX, { pas: o.pas * 0.8, sw: o.hw, color: o.ink })
      + st(crane, o.ink, o.sw) + st('M16 4.8V22.8', o.ink, o.sw * 0.7)
      + st(flop + droite, o.ink, o.sw)
      + `<circle cx="12.4" cy="12" r="0.9" fill="${o.ink}"/>`
      + `<path d="M18.4 11.2Q20 10.4 21.4 11.6Q19.6 12.4 18.4 11.2Z" fill="${o.ink}"/>`
      + st('M13 20.4Q14.5 21 16 20.8L17.2 21.6L18.2 20.7L19.1 21.4L19.9 20.6', o.ink, o.sw * 0.7)
      + st('M7.6 30.2H24.4', o.ink, o.sw * 0.7);
  },
  gamin(o) {
    // l’enfant qui désigne du doigt ; l’ombre grandit derrière lui
    const tete = 'M12.4 9.6A3.2 3.2 0 1 0 18.8 9.6A3.2 3.2 0 1 0 12.4 9.6Z';
    const cheveux = 'M13.2 7L12 4.2L14.2 6.1L14.6 3L16.3 5.5L17.4 2.6L18.6 5.9L20.2 4.3L19.2 7.2';
    const ombre = 'M2.8 28.8C3.6 27.2 5 26.3 6.6 26.6L9.2 24.8C9.7 24.4 10.3 24.7 10.2 25.3L9.8 27.2C11.6 27.7 13.1 28.9 13.6 30.2C10.8 30.6 7.1 30.6 4.8 29.8C3.6 29.4 2.9 29.3 2.8 28.8Z';
    return `<path d="${ombre}" fill="${o.ink}"/>`
      + st(cheveux, o.ink, o.sw * 0.9)
      + st(tete, o.ink, o.sw)
      + `<circle cx="15.8" cy="9.1" r="0.9" fill="${o.ink}"/>`
      + st('M16 13.2C18 12.6 19.8 13.3 21.4 14.3C23.2 14.9 25 13.8 26.2 12.4L28.2 11.6', o.ink, o.sw)
      + st('M13.7 13.6C12.9 16 12.7 19 13.1 21.8M15 13.4C14.7 17.4 14.9 21.4 15.6 24.8M14.1 24.9L13.4 30.2M17 24.9L18 30.2', o.ink, o.sw * 0.9)
      + st('M8 30.4H27.2', o.ink, o.sw * 0.7);
  },
  lavoir(o) {
    // deux têtes sous un même fichu ; le chuchotement entre les deux
    const fichu = 'M4.4 14.2C5.9 3.6 26.1 3.6 27.6 14.2';
    const fichu2 = 'M6.6 14.4C7.9 5.6 24.1 5.6 25.4 14.4';
    const tete = (cx) => `M${cx - 4.4} 14A4.4 4.4 0 1 0 ${cx + 4.4} 14A4.4 4.4 0 1 0 ${cx - 4.4} 14Z`;
    return hach(fichu + 'Z' + fichu2 + 'Z', BOX, { pas: o.pas, sw: o.hw, color: o.ink, rule: 'evenodd' })
      + st(fichu + fichu2, o.ink, o.sw * 0.9)
      + `<path d="${tete(10.4)}${tete(21.6)}" fill="${o.bg}" fill-rule="evenodd" stroke="${o.ink}" stroke-width="${o.sw}"/>`
      + `<circle cx="9.4" cy="13.4" r="0.9" fill="${o.ink}"/><circle cx="22.6" cy="13.4" r="0.9" fill="${o.ink}"/>`
      + `<circle cx="16" cy="13.6" r="0.7" fill="${o.ink}"/><circle cx="16" cy="16" r="0.7" fill="${o.ink}"/>`;
  },
  casques(o) {
    // trois casques de mineur sur la même dalle : le rang se lit à la répétition
    const dome = (c) => `M${c - 4.8} 17.2C${c - 4.8} 11.6 ${c - 2.4} 8.6 ${c} 8.6C${c + 2.4} 8.6 ${c + 4.8} 11.6 ${c + 4.8} 17.2Z`;
    const brim = (c) => `M${c - 5.6} 17.4H${c + 5.6}`;
    const lampe = (c) => `M${c - 1.2} 7.6H${c + 1.2}V10.4H${c - 1.2}Z`;
    let s = '';
    for (const c of [7, 16, 25]) {
      s += hach(dome(c), BOX, { pas: o.pas, sw: o.hw, color: o.ink })
        + st(dome(c), o.ink, o.sw)
        + st(brim(c), o.ink, o.sw * 0.9)
        + `<path d="${lampe(c)}" fill="${o.ink}"/>`;
    }
    return s + st('M2 20.6H30', o.ink, o.sw * 0.8) + st('M4.6 22.4V20.6M11.4 22.4V20.6M20.6 22.4V20.6M27.4 22.4V20.6', o.ink, o.sw * 0.6);
  },
};

export function ssym(id, size, o = {}) {
  const big = size >= 96;
  const opts = { ink: o.ink ?? S.encre, bg: o.bg ?? S.papier, accent: o.accent ?? S.san, sw: big ? 0.8 : 2, hw: big ? 0.22 : 0.75, pas: big ? 1.05 : 3 };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;" aria-hidden="true">${D[id](opts)}</svg>`;
}

// ---- les 6 coiffes du district (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
export const COIFFES = [
  { id: 'capuche', nom: 'capuche du Bataillon', d: 'M24 5.6C17 5.6 12.6 12 12.6 20L10.6 34L7 48H41L37.4 34L35.4 20C35.4 12 31 5.6 24 5.6ZM24 15.6A6.4 6.4 0 1 0 24 28.4A6.4 6.4 0 1 0 24 15.6Z', capuche: true },
  { id: 'kepi', nom: 'képi de la Garnison', d: 'M16 16.4L16.6 8.6C20 7.4 28 7.4 31.4 8.6L32 16.4ZM14.6 16H35L32.6 18.8H14.6Z' },
  { id: 'casquette', nom: 'casquette de la Brigade', d: 'M14 16.4C13.6 9.4 32 7.6 35 13L33.6 16.4ZM30 15.6L43 17.2L33 18.8Z' },
  { id: 'foulard', nom: 'foulard de marchande', d: 'M15 21C13.6 11 34.4 11 33 21L30.4 16.6C26.4 14.4 21.6 14.4 17.6 16.6ZM21.6 10.4L23 5.4L24.6 9.4L27.4 6.2L26.6 10.6Z' },
  { id: 'toque', nom: 'toque de boulanger', d: 'M16 16.6V8.6C13.6 4.6 19.4 1.6 22 4C24 0.8 28.4 1.8 28.6 4.4C32.6 3.4 34.6 7.8 32 9.6V16.6Z', plis: 'M20 8.6V16M24 6.6V16M28 8.6V16' },
  { id: 'mineur', nom: 'casque de mineur', d: 'M14 17.4C14 8.6 34 8.6 34 17.4ZM11.6 17.2H36.4V19H11.6ZM21.6 9.6H26.4V13.6H21.6Z' },
];
function coiffe(c, ink, bg, sil = false) {
  const tete = 'M32 21A8 8 0 1 1 16 21A8 8 0 1 1 32 21Z';
  if (sil) return `<path d="${EPAULES}" fill="${ink}"/>${c.capuche ? '' : `<path d="${tete}" fill="${ink}"/>`}<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>`;
  let s = '';
  if (!c.capuche) {
    s += hach(EPAULES, [0, 24, 48, 24], { pas: 4, sw: 0.8, color: ink }) + `<path d="${EPAULES}" fill="none" stroke="${ink}" stroke-width="1"/>`;
    s += hach(tete, [14, 11, 20, 20], { pas: 6, sw: 0.6, color: ink }) + `<path d="${tete}" fill="none" stroke="${ink}" stroke-width="1"/>`;
    s += `<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>`;
  } else {
    s += hach(c.d, [6, 4, 36, 44], { pas: 2.4, sw: 0.7, color: ink, rule: 'evenodd' }) + `<path d="${c.d}" fill="none" stroke="${ink}" stroke-width="1.2" fill-rule="evenodd"/>`;
    s += hach('M24 15.6A6.4 6.4 0 1 0 24 28.4A6.4 6.4 0 1 0 24 15.6Z', [16, 14, 16, 16], { pas: 6, sw: 0.6, color: ink });
    s += hach('M7 48L10.6 34L12.6 20C12.6 14 15 9.6 19 7.4L16.6 26L14 48Z', [6, 6, 14, 42], { pas: 3.5, sw: 1.2, color: S.vert });
  }
  if (c.plis) s += `<path d="${c.plis}" stroke="${bg}" stroke-width="0.8"/>`;
  return s;
}
const svg48 = (inner, size) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display: block;" aria-hidden="true">${inner}</svg>`;

// ---- les faces
function cuv(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${S.teinte}"/><path d="M${x} ${y + h}V${y}H${x + w}" fill="none" stroke="${S.encre}" stroke-opacity="0.38"/><path d="M${x + w} ${y}V${y + h}H${x}" fill="none" stroke="${S.bruni}" stroke-width="1.5"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="none" stroke="${S.encre}" stroke-opacity="0.14"/>`;
}
function cart(kind, x, y, w, h, mot) {
  const meute = kind !== 'ecu';
  return `<path d="${cartPath(kind, w, h)}" transform="translate(${x} ${y})" fill="${S.bruni}" stroke="${meute ? S.san : S.encre}" stroke-width="${meute ? 2 : 1.5}"/><text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="${F.ss}" font-size="14" font-weight="${meute ? 600 : 400}" fill="${meute ? S.san : S.encre}">${mot}</text>`;
}
export function sface(id) {
  const r = SROLES.find((x) => x.id === id);
  let s = `<rect width="300" height="420" fill="${S.bruni}"/><rect x="0.5" y="0.5" width="299" height="419" fill="none" stroke="${K.p2}"/>`;
  s += cuv(12, 12, 276, 396);
  const cid = uid('sf');
  if (id === 'titan') {
    // un Titan est toujours trop grand pour le cadre : il déborde la cuvette, coupé par son bord
    s += grain('M24 24h252v264h-252Z', [24, 24, 252, 264], { f: 'aqua-I', op: 0.55 });
    s += `<clipPath id="${cid}"><rect x="24" y="24" width="252" height="264"/></clipPath><g clip-path="url(#${cid})">`;
    const corps = 'M40 288C44 240 60 200 92 176C86 150 84 110 96 70C104 40 124 10 150 -40L230 -40C238 10 232 50 224 80C236 120 232 160 214 184C238 206 256 246 262 288Z';
    s += `<g filter="url(#mordu)"><path d="${corps}" fill="${S.encre}"/></g>` + grain(corps, [24, 24, 252, 264], { f: 'aqua-IV', op: 0.32 });
    s += `<path d="M108 176C126 186 170 188 196 176M118 120C136 112 176 112 192 122" fill="none" stroke="${S.teinte}" stroke-width="1.2" stroke-opacity="0.5"/>`;
    s += `<path d="M24 262H276V288H24Z" fill="${S.teinte}"/>` + hach('M24 262H276V288H24Z', [24, 262, 252, 26], { pas: 4, sw: 0.7, color: S.encre }) + `<path d="M24 262H276" stroke="${S.encre}" stroke-width="1"/>`;
    for (let x = 30; x < 276; x += 24) s += `<rect x="${x}" y="254" width="12" height="8" fill="${S.teinte}" stroke="${S.encre}" stroke-width="1"/>`;
    s += `<path d="M232 60C224 46 240 40 232 26C226 14 240 8 234 -4M248 92C240 78 256 70 248 56M70 200C62 188 76 180 68 166" fill="none" stroke="${S.san}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += '</g>';
    s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/>`;
  } else {
    const rect = 'M24 24h252v264h-252Z', ov = 'M54 154A96 112 0 1 0 246 154A96 112 0 1 0 54 154Z';
    if (id === 'eclaireuse') s += hach(rect + ov, [24, 24, 252, 264], { pas: 3.5, sw: 1.3, color: S.vert, rule: 'evenodd' });
    else s += hach(rect + ov, [24, 24, 252, 264], { pas: 6, sw: 0.6, color: S.encre, rule: 'evenodd' });
    s += `<rect x="24.4" y="24.4" width="251.2" height="263.2" fill="none" stroke="${S.encre}" stroke-width="0.75"/><ellipse cx="150" cy="154" rx="96" ry="112" fill="none" stroke="${S.encre}"/><ellipse cx="150" cy="154" rx="92.5" ry="108.5" fill="none" stroke="${S.encre}" stroke-width="0.5"/>`;
    s += ssym(id, 128, { bg: S.teinte }).replace('<svg ', '<svg x="86" y="88" ');
  }
  s += `<rect x="244" y="24" width="32" height="24" fill="${S.teinte}" stroke="${S.encre}" stroke-width="0.75"/><text x="260" y="40" text-anchor="middle" font-family="${F.fell}" font-size="16" fill="${S.del}">${r.n}</text>`;
  s += id === 'titan' ? cart('mordu', 84, 275, 132, 26, 'Titans') : cart('ecu', 84, 275, 132, 26, 'District');
  s += `<text x="150" y="334" text-anchor="middle" font-family="${F.fell}" font-size="${r.nom.length > 16 ? 24 : 28}" fill="${S.encre}">${r.nom}</text>`;
  s += `<text x="150" y="364" text-anchor="middle" font-family="${F.fell}" font-style="italic" font-size="16" fill="${S.del}">${r.leg}</text>`;
  if (r.ref) s += `<text x="150" y="386" text-anchor="middle" font-family="${F.sc}" font-size="13" letter-spacing="0.8" fill="${S.del}">${r.ref}</text>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Carte : ${r.nom}">${s}</svg>`;
}
export function sdos() {
  let s = `<rect width="300" height="420" fill="${S.relief}"/><rect x="12" y="12" width="276" height="396" fill="${S.encre}"/><rect x="12" y="12" width="276" height="396" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`;
  s += `<rect x="12.5" y="12.5" width="275" height="395" fill="none" stroke="${K.p3}"/><rect x="20.5" y="20.5" width="259" height="379" fill="none" stroke="${K.p2}"/><rect x="24.5" y="24.5" width="251" height="371" fill="none" stroke="${K.p2}" stroke-width="0.5"/>`;
  const V = S.papier;
  // le mur et la Porte, battants clos
  let pierres = '';
  for (let y = 96, i = 0; y < 360; y += 16, i++) { pierres += `M36 ${y}H264`; for (let x = 36 + (i % 2) * 22; x < 264; x += 44) pierres += `M${x} ${y}V${y + 16}`; }
  s += `<clipPath id="${uid('dp')}"><path d="M36 80H264V360H36ZM96 360V196A54 54 0 0 1 204 196V360Z" clip-rule="evenodd"/></clipPath>`;
  const clip = s.match(/<clipPath id="([^"]+)"><path d="M36 80H264V360H36Z/)[1];
  s += `<g clip-path="url(#${clip})"><path d="${pierres}" stroke="${V}" stroke-width="0.6" stroke-opacity="0.55" fill="none"/></g>`;
  s += `<path d="M36 80H264V360H36Z" fill="none" stroke="${V}" stroke-width="1"/>`;
  for (let x = 36; x < 264; x += 28) s += `<path d="M${x} 80V68H${x + 14}V80" fill="none" stroke="${V}" stroke-width="1"/>`;
  s += `<path d="M96 360V196A54 54 0 0 1 204 196V360" fill="${S.relief}" stroke="${V}" stroke-width="1.6"/><path d="M90 360V196A60 60 0 0 1 210 196V360" fill="none" stroke="${V}" stroke-width="0.8"/>`;
  s += `<path d="M150 142V360M96 230H204M96 300H204" stroke="${V}" stroke-width="1.2"/>`;
  s += hach('M96 360V196A54 54 0 0 1 150 142V360Z', [96, 142, 54, 218], { pas: 3, sw: 0.5, color: V, angle: 80, op: 0.55 });
  for (const y of [230, 300]) for (let x = 104; x < 204; x += 12) s += `<circle cx="${x}" cy="${y}" r="1.2" fill="${V}"/>`;
  s += `<path d="M30 360H270" stroke="${V}" stroke-width="1"/>`;
  return `<svg width="300" height="420" viewBox="0 0 300 420" style="display: block;" role="img" aria-label="Dos de carte Shiganshina : la Porte du district">${s}</svg>`;
}
export function friseMur(w, nuit) {
  const base = 56;
  let s = nuit ? `<rect width="${w}" height="56" fill="${S.encre}"/><rect width="${w}" height="56" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>` : `<rect width="${w}" height="56" fill="${S.papier}"/><rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  if (nuit) {
    const tete = `M${w * 0.56} 56C${w * 0.56} 34 ${w * 0.6} 14 ${w * 0.68} 8C${w * 0.74} 4 ${w * 0.8} 8 ${w * 0.83} 20C${w * 0.85} 30 ${w * 0.85} 44 ${w * 0.84} 56Z`;
    s += `<path d="${tete}" fill="${S.relief}"/>` + grain(tete, [w * 0.55, 0, w * 0.32, 56], { f: 'aqua-III', op: 0.18 });
    s += `<path d="M${w * 0.65} 24Q${w * 0.67} 22 ${w * 0.69} 24Q${w * 0.67} 25.4 ${w * 0.65} 24ZM${w * 0.74} 24Q${w * 0.76} 22 ${w * 0.78} 24Q${w * 0.76} 25.4 ${w * 0.74} 24Z" fill="${K.p3}"/>`;
  }
  let d = `M0 ${base}V${base - 12}`;
  for (let x = 0; x < w; x += 16) d += `H${x + 6}V${base - 18}H${x + 12}V${base - 12}H${x + 16}`;
  d += `V${base}Z`;
  s += `<path d="${d}" fill="${nuit ? S.relief : S.teinte}" stroke="${nuit ? K.p2 : S.encre}" stroke-width="1"/>`;
  if (!nuit) s += hach(d, [0, base - 18, w, 18], { pas: 2.4, sw: 0.45, color: S.encre, op: 0.7 });
  let joints = '';
  for (let x = 8; x < w; x += 22) joints += `M${x} ${base - 6}V${base}`;
  s += `<path d="M0 ${base - 6}H${w}${joints}" stroke="${nuit ? K.p3 : S.encre}" stroke-width="0.6" stroke-opacity="${nuit ? 1 : 0.6}"/>`;
  return `<svg width="${w * 1.5}" height="84" viewBox="0 0 ${w} 56" style="display: block;" role="img" aria-label="Frise du Mur, ${nuit ? 'nuit' : 'jour'}">${s}</svg>`;
}

export function shiganshina() {
  setPfx('cSh');
  const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
  const sc = (t) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${S.del};">${t}</div>`;
  const corps = (t, w) => `<p style="margin: 0; font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.del}; width: ${w}px;">${t}</p>`;
  let b = `<svg width="1600" height="1400" viewBox="0 0 1600 1400" style="position: absolute; left: 0; top: 0; pointer-events: none;" aria-hidden="true"><rect width="1600" height="1400" fill="#000" filter="url(#papier)" opacity="0.2"/></svg>`;
  b += abs(48, 36, `${sc('Garoutom · Caprices · lot C — le second habit')}<h1 style="margin: 6px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 40px; line-height: 44px; color: ${S.encre};">Shiganshina, dans la même grammaire</h1><p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 18px; line-height: 24px; color: ${S.del};">« Ils étaient trop grands pour la place. » — Goya, <i>Les Désastres de la guerre</i>, <i>El Coloso</i>.</p>`, 'width: 1000px;');
  b += abs(1100, 40, corps('Seuls changent les valeurs, les motifs et les mots : encre de fumée #141614 sur papier de munition #E4E0D4 (13,78:1) ; la vapeur des Titans est la même sanguine ; le vert du Bataillon n’existe qu’en hachure à 45°. Règle-signature : un Titan déborde toujours sa cuvette d’au moins 20 % de sa hauteur.', 420));
  b += abs(1500, 36, `<span style="font-family: ${F.fell}; font-size: 20px; color: ${S.del};">Pl. C-V</span>`, 'width: 52px; text-align: right;');
  b += `<div style="position: absolute; left: 48px; top: 132px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // les 21 symboles
  const pasSym = 1504 / SROLES.length;
  SROLES.forEach((r, i) => {
    const x = 48 + i * pasSym;
    const o = r.id === 'machoire' ? { accent: S.san } : {};
    b += abs(x + (pasSym - 64) / 2, 152, ssym(r.id, 64, o));
    b += abs(x, 226, `<div style="width: ${pasSym - 8}px;">${sc(`${r.n} · ${r.nom}`)}<p style="margin: 6px 0 0; font-family: ${F.fell}; font-style: italic; font-size: 16px; line-height: 20px; color: ${S.del};">${r.leg}</p>${r.ref ? `<div style="margin-top: 2px; font-family: ${F.ss}; font-size: 12px; color: ${S.del};">[${r.ref}]</div>` : ''}<div style="margin-top: 4px; font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${S.encre};">${r.motif}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 436px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // trois faces et le dos
  const faces = [['titan', 'Le Titan déborde par le haut : la tête est coupée par l’arête de la plaque ; vapeur en traits de sanguine.'], ['eclaireuse', 'Fond en hachure vert du Bataillon — le seul emploi du vert, jamais en aplat.'], ['habitant', 'L’habitant : l’encre de fumée, la hachure ordinaire, le cartouche « District ».']];
  faces.forEach(([id, t], i) => {
    const x = 48 + i * 330;
    b += abs(x, 456, sface(id));
    b += abs(x, 886, corps(t, 300));
  });
  b += abs(1038, 456, sdos());
  b += abs(1038, 886, corps('Dos aux Portes : la Porte du district, battants clos, au trait de papier sur l’aquatinte IV ; marge en relief #262926.', 300));
  // les coiffes
  b += abs(1370, 456, sc('Six coiffes du district'));
  COIFFES.forEach((c, i) => {
    const y = 480 + i * 76;
    b += abs(1370, y, `<div style="display: flex; align-items: center; gap: 8px;"><div style="width: 64px; height: 64px; border: 1px solid ${K.p2}; background: ${S.bruni};">${svg48(coiffe(c, S.encre, S.bruni), 62)}</div>${svg48(coiffe(c, S.encre, S.bruni), 40)}${svg48(coiffe(c, S.encre, S.bruni, true), 40)}<div style="width: 60px; font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${S.encre};">${c.nom}</div></div>`);
  });
  b += `<div style="position: absolute; left: 48px; top: 950px; width: 1504px; border-top: 0.75px solid ${K.p2};"></div>`;
  // la frise du Mur
  b += abs(48, 968, sc('La frise — le Mur au lieu des toits (mobile 390, agrandie 150 %)'));
  b += abs(48, 994, friseMur(390, false));
  b += abs(48, 1090, friseMur(390, true));
  b += abs(48, 1182, corps('Jour : chemin de ronde crénelé sur ciel en hachure horizontale à 28 %. Nuit : derrière le Mur, la tête d’un Colosse en aquatinte, au relief #262926, les yeux brunis au palier III — jamais plus clairs : la nuit ne trahit personne.', 585));
  // ce qui change
  const rows = [
    ['encre', '#141614 noir de fumée'], ['papier', '#E4E0D4 · encre dessus 13,78:1'], ['bruni', '#F1EFE8 · 15,81:1'], ['cuivre en relief', '#262926 · papier dessus 11,15:1'],
    ['les Titans', 'même sanguine, c’est la vapeur · craie la nuit'], ['le pacte', 'même garance'], ['vert du Bataillon', '#45523F en hachure seulement · #8FA07E la nuit'],
    ['cartouches', '« District » · « Titans » · « Le pacte » · « Les Chemins »'], ['teinte de planche', '#DCD7CA (proposée ici, à remonter)'],
  ];
  b += abs(700, 968, sc('Ce qui change — et rien d’autre'));
  b += abs(700, 994, `<div style="display: grid; grid-template-columns: 150px 330px; gap: 6px 16px; width: 496px;">${rows.map(([a, c]) => `<div style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${S.del};">${a}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 18px; color: ${S.encre};">${c}</div>`).join('')}</div>`);
  b += abs(1230, 968, sc('Cartouches du district'));
  b += abs(1230, 994, `<svg width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="Cartouches District et Titans">${cart('ecu', 0, 0, 140, 30, 'District')}${cart('mordu', 160, 0, 140, 30, 'Titans')}<path d="M1.5 51.5H138.5A13.5 13.5 0 0 1 138.5 78.5H1.5" fill="none"/><rect x="1" y="50" width="138" height="28" rx="14" fill="${S.bruni}" stroke="${K.gE}" stroke-width="2"/><rect x="4.5" y="53.5" width="131" height="21" rx="10.5" fill="none" stroke="${K.gE}" stroke-width="0.9"/><text x="70" y="69" text-anchor="middle" font-family="${F.ss}" font-size="14" fill="${K.gE}">Le pacte</text><path d="${cartPath('audela', 140, 30)}" transform="translate(160 49)" fill="none" stroke="${S.del}" stroke-width="1.2" stroke-dasharray="1.5 3"/><text x="230" y="69" text-anchor="middle" font-family="${F.ss}" font-style="italic" font-size="14" fill="${S.del}">Les Chemins</text></svg>`);
  return page({ title: 'C-Shiganshina', w: 1600, h: 1400, bg: `background-color: ${S.papier}; background-image: repeating-linear-gradient(90deg, rgba(20,22,20,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(20,22,20,.035) 0 .6px, transparent .6px 3px); color: ${S.encre};`, body: b });
}
