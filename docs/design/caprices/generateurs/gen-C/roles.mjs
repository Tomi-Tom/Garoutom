// Les treize rôles : données (SPEC § 6.1, thiercelieux.ts) et symboles gravés.
// Tous les symboles sont dessinés sur une grille 32 (zone vive 28).
// Trois niveaux : '128' (carte : trait fin, hachures et détails de gravure),
// '32' (trait 2, hachure pas 3), '16' (simplifié : trait 3 dans la grille = 1,5 px, sans hachure).
import { K, hach, grain, uid, courbes } from './lib.mjs';

export const ROLES = [
  { id: 'villageois', n: 1, nom: 'Villageois·e', camp: 'village', leg: ['« Rien vu, rien entendu,', 'tout compris. »'],
    desc: 'Pas de pouvoir. Votre arme, c’est votre voix au vote du jour — et votre flair.',
    motif: 'La foule en couvre-chefs brandit fourches et lanternes derrière un homme qui regarde ailleurs.' },
  { id: 'loup', n: 2, nom: 'Loup-garou', camp: 'meute', leg: ['« Personne n’a voté', 'plus fort que lui. »'],
    desc: 'Chaque nuit, la meute dévore un habitant. Le jour, vous vous tenez sur la place comme les autres.',
    motif: 'Un notable vote main levée sur la place ; son ombre portée sur le mur est un loup.' },
  { id: 'voyante', n: 3, nom: 'la Voyante', camp: 'village', leg: ['« Ce qu’elle voit,', 'nul ne le croit. »'],
    desc: 'Chaque nuit, sondez un vivant : son rôle s’inscrit dans votre carnet, nuit après nuit.',
    motif: 'Une vieille femme au châle ; au-dessus de ses mains, un œil immense flotte comme une lampe ; hiboux et chat dans le noir.' },
  { id: 'sorciere', n: 4, nom: 'la Sorcière', camp: 'village', leg: ['« Elle a sauvé tout le monde,', 'sauf qui il fallait. »'],
    desc: 'Deux potions, une seule fois chacune : la vie pour la victime des loups, la mort pour qui vous voulez.',
    motif: 'Elle compte ses deux fioles au-dessus d’un chaudron tripode ; derrière, un balai de bouleau lié.' },
  { id: 'chasseur', n: 5, nom: 'le Chasseur', camp: 'village', leg: ['« Il tire mieux', 'mort que vivant. »'],
    desc: 'En tombant, vous pouvez abattre le joueur de votre choix — votre dernière balle.',
    motif: 'Tombé à terre, il épaule encore ; la fumée de son coup monte au-dessus des têtes.' },
  { id: 'cupidon', n: 6, nom: 'Cupidon', camp: 'village', leg: ['« Ils disent oui', 'au premier venu. »'],
    desc: 'La première nuit seulement, liez deux vivants d’un même destin : si l’un meurt, l’autre le suit.',
    motif: 'Un enfant aux yeux bandés tire au hasard dans la foule ; deux passants se retrouvent cousus l’un à l’autre. [Caprice 2]' },
  { id: 'salvateur', n: 7, nom: 'le Salvateur', camp: 'village', leg: ['« Il garde la porte ;', 'on entre par la fenêtre. »'],
    desc: 'Chaque nuit, votre bouclier protège un habitant des loups — jamais le même deux nuits de suite, et le poison passe toujours.',
    motif: 'Il garde une porte, lanterne levée ; à la fenêtre d’à côté passe une ombre.' },
  { id: 'idiot', n: 8, nom: 'l’Idiot du village', camp: 'village', leg: ['« Gracié, et toujours', 'pas écouté. »'],
    desc: 'Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    motif: 'On lui ôte la corde du cou ; la foule est déçue.' },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'village', leg: ['« Jusqu’à la mort,', 'et une fois de plus. »'],
    desc: 'Vous avez la peau dure : la première attaque de la meute ne vous tue pas, la seconde si. Et si le village vous tue de sa main, il peut perdre ses pouvoirs avec vous.',
    motif: 'Un vieillard se pomponne devant un miroir, la Mort en coiffeuse. [Caprice 55]' },
  { id: 'corbeau', n: 10, nom: 'le Corbeau', camp: 'village', leg: ['« La lettre', 'n’était pas signée. »'],
    desc: 'Chaque nuit, désignez un vivant : au vote du jour, deux voix pèseront d’office contre ce vivant. La marque est annoncée, jamais sa main.',
    motif: 'Un corbeau glisse une lettre cachetée sous une porte.' },
  { id: 'bouc', n: 11, nom: 'le Bouc émissaire', camp: 'village', leg: ['« Il fallait bien', 'quelqu’un. »'],
    desc: 'Si le vote du village finit à égalité, c’est vous qui payez pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    motif: 'Il s’en va seul sur la lande, chargé du fagot du village.' },
  { id: 'petiteFille', n: 12, nom: 'la Petite Fille', camp: 'village', leg: ['« Ne crie pas,', 'petite sotte. »'],
    desc: 'Pendant que la meute choisit sa proie, vous entrouvrez les yeux : vous voyez combien de loups visent chaque habitant — jamais lesquels.',
    motif: 'Derrière une porte entrouverte, elle compte des ombres. [Caprice 74]' },
  { id: 'loupBlanc', n: 13, nom: 'le Loup Blanc', camp: 'seul', leg: ['« Les loups ne se mangent pas', 'entre eux, dit-on. »'],
    desc: 'Vous chassez avec la meute, qui vous prend pour l’un des siens. Une nuit sur deux, vous pouvez dévorer un loup. Vous ne gagnez que seul.',
    motif: 'Un loup clair dîne parmi les siens, tous de dos ; c’est lui qui mange.' },
];
export const R = Object.fromEntries(ROLES.map((r) => [r.id, r]));
export const campCart = (r) => (r.camp === 'meute' ? ['mordu', 'Meute'] : r.camp === 'seul' ? ['mordu2', 'Seul'] : ['ecu', 'Village']);

// ---------------------------------------------------------------- tracés
const LOUP = 'M15 3.2C20 2.6 25.5 5 27 9.5L25.6 11L27.6 12.6L26.2 14.8L28 17L25.8 18.6L26.9 21.2L24.6 22.4L25.2 25.6L23.4 27L24.2 30L12.6 30C13.2 28 13.4 26.4 12.6 25.4C11 25.6 9.4 25 9 23.6C8.8 22.6 9.2 21.8 8.6 21.2C8 20.6 8.4 19.8 8.8 19.4C8 19 7.6 18.4 8 17.6C6.4 17.2 5.6 16.4 6.2 15.6C7.2 14 8 13 8.2 11.6C8 8 10.4 3.8 15 3.2Z';
const LOUP_OEIL = 'M9.2 12.6Q12.5 10.9 15.8 12.2Q12.4 13.6 9.2 12.6Z';
const LOUP_MORSURE = 'M27.9 9.7L26.5 11.2L28.5 12.8L27.1 15L28.9 17.2L26.7 18.8L27.8 21.4L25.5 22.6L26.1 25.8L24.3 27.2L25.1 29.8';
const BLANC = 'M15 3.2C20 2.6 25.5 5 27 9.5L25.6 11L27.6 12.6L26.2 14.8L28 17L25.8 18.6L26.9 21.2L24.6 22.4L25.2 25.6L23.4 27L24.2 30L12.6 30L13.4 27.6L12.2 26.6L12.9 25.5C11 25.6 9.4 25 9 23.6L10 22.6L8.4 21.4L9.2 20.6L8 19.6L8.6 18.6L7.2 18L7.8 17.2C6.4 17 5.6 16.4 6.2 15.6L7.6 14.8L6.8 13.6L8.6 12.6L7.8 11L9 10.2C9.2 7 11 3.8 15 3.2Z';
const BLANC_MASSE = 'M3 6.4L6.2 2.6L9.4 4.2L12.6 1.4L16.4 3L20.2 1.2L23.4 3.4L27.2 2.2L29.2 5.8L31 9.6L29.4 13.2L31.2 17L29.6 20.6L31 24.6L29.2 28.4L30.4 31L25.6 30.2L21.8 31.4L17.4 30L13.6 31.6L9.4 30.2L5.6 31.4L2.6 28.6L3.8 24.8L1.2 21.2L3 17.4L1.4 13.6L3.2 10Z';
const MAIN = 'M12.2 30.2C12.2 28.6 11.4 27.4 10.4 26.2L5.2 19.4C4.2 18 4.6 16.2 6.2 16.4C7.2 16.6 8.2 17.6 9.4 19.4L9.4 8.2C9.4 6.4 12 6.4 12 8.2L12.2 15.4L12.6 5.2C12.6 3.2 15.4 3.2 15.4 5.2L15.6 15L16 6C16 4.2 18.8 4.2 18.8 6L18.8 15.6L19.4 9.8C19.4 8.2 21.8 8.2 21.8 9.8L21.8 19.6C21.8 23.4 21 25.8 20 27.4C19.6 28.2 19.6 29.2 19.6 30.2';
const MAIN_FERMEE = MAIN + 'Z';
const POUCE = 'M10.4 26.2L5.2 19.4C4.2 18 4.6 16.2 6.2 16.4C7.2 16.6 8.2 17.6 9.4 19.4L10.4 23Z';
const OEIL = 'M10.6 21.6Q15.6 16.6 20.6 21.6Q15.6 26.6 10.6 21.6Z';
const PORTE = 'M7 30V13A9 9 0 0 1 25 13V30';
const PORTE_F = 'M7 30.2V13A9 9 0 0 1 25 13V30.2Z';
const PLANCHE = 'M7.8 25.2L24.2 13L24.2 17.4L7.8 29.6Z';
const BONNET = 'M7.6 22.4C7.2 14.6 10.6 6.8 17.4 5C22.6 3.6 27 6.4 27.4 11.4C27.6 13.2 27.1 14.6 26.2 15.4C25.4 13.4 23.8 12.2 22 12.4C23.6 15.4 24.4 18.6 24.6 22.2';
const BONNET_F = BONNET + 'Z';
const BOURRELET = 'M5.2 25.6C5.2 22.8 9.6 21.8 16 21.8C22.4 21.8 26.8 22.8 26.8 25.6C26.8 28.4 22.4 29.4 16 29.4C9.6 29.4 5.2 28.4 5.2 25.6Z';
const MANTEAU = 'M13.2 12C15.6 9.4 20.6 9.6 23.4 13.4C25.8 16.8 25.4 21.8 23.8 25.2L24.6 30L14.6 30L15.6 25C13.8 22.4 12.6 18.4 12.4 15.2C12.4 13.8 12.6 12.8 13.2 12Z';
const CORBEAU = 'M5 11.6L9.6 10C11 7.6 13.6 6.6 16 7.2C19.4 8 21 11 22.4 14L29.6 19.6L29 21.6L27.2 20.8L27.6 23L25.4 21.8L22 22.6C19 24 14.6 23.6 12.4 21C10.6 18.8 10.4 16 11 13.4L5 12.6Z';
const TETE_BOUC = 'M11.4 10.6C12.6 9.4 19.4 9.4 20.6 10.6C21.6 12.6 20.6 17 19 21C18.2 23.2 17.2 24.4 16 24.4C14.8 24.4 13.8 23.2 13 21C11.4 17 10.4 12.6 11.4 10.6Z';
const CAPUCHON = 'M16 3C10 3 7.4 8 7 14C6.6 20 5 25 3.6 29.6L28.4 29.6C27 25 25.4 20 25 14C24.6 8 22 3 16 3Z';
const VISAGE = 'M16 9.6C12.4 9.6 11 12.8 11 16C11 19.6 13 22 16 22C19 22 21 19.6 21 16C21 12.8 19.6 9.6 16 9.6Z';
const coeur = (cx, cy) => `M${cx} ${cy + 3.4}C${cx - 1} ${cy + 2.4} ${cx - 4} ${cy + 0.4} ${cx - 4} ${cy - 1.6}C${cx - 4} ${cy - 3.8} ${cx - 1.4} ${cy - 4.4} ${cx} ${cy - 2.2}C${cx + 1.4} ${cy - 4.4} ${cx + 4} ${cy - 3.8} ${cx + 4} ${cy - 1.6}C${cx + 4} ${cy + 0.4} ${cx + 1} ${cy + 2.4} ${cx} ${cy + 3.4}Z`;
const BOX = [0, 0, 32, 32];

/**
 * o = { L: '128'|'32'|'16', ink, bg (réserve), accent (meute), serment, mass (masse meute), sil (ombre chinoise) }
 * retourne les éléments SVG dans l'espace 32.
 */
export const DESSINS = {
  villageois(o) {
    const sw = o.sw, fin = o.fin;
    const H = (x, y) => `M${x - 0.7} ${y}L${x} ${y - 2}L${x + 0.7} ${y}Z`;
    let s = `<g transform="rotate(8 16 17)" fill="none" stroke="${o.ink}" stroke-linecap="round" stroke-linejoin="round">`;
    s += `<path d="M16 30.2V14.4" stroke-width="${sw}"/>`;
    s += `<path d="M8.6 4.6V10.4C8.6 13.4 11.6 14.4 16 14.4C20.4 14.4 23.4 13.4 23.4 10.4V4.6M16 3.6V14.4" stroke-width="${sw}"/>`;
    s += `<path d="${H(8.6, 4.8)}${H(16, 3.8)}${H(23.4, 4.8)}" fill="${o.ink}" stroke="none"/>`;
    if (o.L === '128') {
      s += `<path d="M15 15.4L17 16.2M15 16.6L17 17.4M15 17.8L17 18.6" stroke-width="${fin}"/>`;
      s += `<path d="M16.5 20V29.4M15.6 22.6V27" stroke-width="${fin * 0.7}"/>`;
      s += `<path d="M9.4 10.8C9.6 12.6 11.4 13.4 13.4 13.6M22.6 10.8C22.4 12.4 21 13.2 19.4 13.5" stroke-width="${fin * 0.7}"/>`;
    }
    s += '</g>';
    if (o.L === '128') s += `<path d="M7.6 30.6H24.6M9 30.6L8 29.4M10.6 30.6L10.2 29.2M21.4 30.6L22.2 29.4M23 30.6L23.6 29.6" stroke="${o.ink}" stroke-width="${fin}" stroke-linecap="round" fill="none"/>`;
    return s;
  },
  loup(o) {
    const m = o.mass ?? o.ink;
    let s = '';
    if (o.L === '128') {
      s += `<path d="${LOUP}" fill="${m}"/>`;
      s += grain(LOUP, [0, 0, 32, 32], { f: 'aqua-IV', op: 0.34, sc: 0.25 });
      s += `<path d="${LOUP_MORSURE}" fill="none" stroke="${o.accent}" stroke-width="0.5" stroke-linejoin="miter"/>`;
      s += `<circle cx="28.8" cy="19.9" r="0.45" fill="${o.accent}"/><circle cx="26.4" cy="28.7" r="0.35" fill="${o.accent}"/>`;
    } else {
      s += `<path d="${LOUP}" fill="${o.sil ? o.ink : m}"/>`;
      s += `<circle cx="28.7" cy="20" r="0.55" fill="${m}"/><circle cx="26.3" cy="28.8" r="0.45" fill="${m}"/>`;
    }
    if (!o.sil) s += `<path d="${LOUP_OEIL}" fill="${o.bg}"${o.L === '16' ? ' transform="translate(12.5 12.4) scale(1.35) translate(-12.5 -12.4)"' : ''}/>`;
    return s;
  },
  voyante(o) {
    const sw = o.L === '32' ? 1.5 : o.sw, fin = o.fin;
    let s = '';
    if (o.L === '128') {
      s += hach(POUCE, BOX, { pas: 1.05, sw: 0.2, color: o.ink, angle: 45 });
      s += hach('M9.6 22C9.8 25 11 27.6 12.2 29.6L19.6 29.6C20.2 28 20.8 26.4 21 25Z', BOX, { pas: 1.05, sw: 0.18, color: o.ink, angle: 45 });
    } else if (o.L === '32' && !o.sil) {
      s += hach(POUCE, BOX, { pas: 2.6, sw: 0.7, color: o.ink });
    }
    if (o.sil) s += `<path d="${MAIN_FERMEE}" fill="${o.ink}"/>`;
    s += `<path d="${o.sil ? OEIL : OEIL}" fill="${o.sil ? o.bg : o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.4 : sw * 0.9}"/>`;
    s += `<path d="${MAIN}" fill="none" stroke="${o.ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<circle cx="15.6" cy="21.6" r="1.5" fill="${o.ink}"/>`;
    if (o.L === '128') {
      s += `<g fill="none" stroke="${o.ink}" stroke-width="${fin}" stroke-linecap="round">`;
      s += '<path d="M9.9 11.4Q10.7 11.9 11.5 11.4M13.1 9.4Q14 9.9 14.9 9.4M16.4 10Q17.4 10.5 18.3 10M19.8 12.8Q20.6 13.2 21.4 12.8"/>';
      s += '<path d="M9.9 13.2Q10.7 13.6 11.5 13.2M13.1 11.6Q14 12 14.9 11.6M16.4 12.2Q17.4 12.6 18.3 12.2M19.8 14.8Q20.6 15.1 21.4 14.8"/>';
      s += '<path d="M12.3 17.6C13.6 17 17.6 16.8 19.8 17.6M11.2 25.4C13.4 27 17.6 27.2 20 25.8"/>';
      s += '</g>';
      s += `<path d="M15.1 20.9A0.6 0.6 0 0 1 16 20.7" stroke="${o.bg}" stroke-width="0.35" fill="none"/>`;
    }
    return s;
  },
  sorciere(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    const panse = 'M22.8 21.4A6.8 6.8 0 1 1 9.2 21.4A6.8 6.8 0 1 1 22.8 21.4Z';
    if (!o.sil) {
      s += hach(panse, BOX, o.L === '128' ? { pas: 1.0, sw: 0.2, color: o.ink, angle: 45 } : { pas: 3, sw: 0.8, color: o.ink });
      if (o.L === '128') s += hach('M9.6 22A6.6 6.6 0 0 0 20 27.4L9.6 27.4Z', BOX, { pas: 1.0, sw: 0.2, color: o.ink, angle: -45 });
    } else s += `<path d="${panse}" fill="${o.ink}"/>`;
    // l'aconit en réserve
    const fleurs = 'M14 19.6C13.6 16.6 15.2 15.4 17 15.8C18.6 16.2 18.8 17.8 18 19.2C17.2 19.8 15.2 20 14 19.6ZM12.4 23C12.1 21.4 13.1 20.8 14.1 21.1C14.8 21.4 14.8 22.4 14.4 23ZM17.6 24.6C17.4 23.1 18.4 22.5 19.4 22.8C20 23.1 20 24.1 19.6 24.6Z';
    if (!o.sil && o.L !== '16') {
      s += `<path d="M16 27.6V19.4M14.2 22.8L16 24M19.2 24.4L16 26" stroke="${o.bg}" stroke-width="${o.L === '128' ? 0.9 : 1.4}" fill="none" stroke-linecap="round"/>`;
      s += `<path d="${fleurs}" fill="${o.bg}" stroke="${o.L === '128' ? o.ink : 'none'}" stroke-width="${fin * 0.8}"/>`;
      if (o.L === '128') s += `<path d="M16 27.4V19.6" stroke="${o.ink}" stroke-width="${fin * 0.6}"/><path d="M19.6 16.6A5.4 5.4 0 0 1 21.9 20.4" stroke="${o.bg}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
    }
    if (o.L === '16') s += `<path d="${fleurs.split('Z')[0]}Z" fill="${o.ink}"/>`;
    s += `<circle cx="16" cy="21.4" r="7" fill="none" stroke="${o.ink}" stroke-width="${sw}"/>`;
    s += `<path d="M14 14.8V9.6M18 14.8V9.6M12.8 9.6H19.2" fill="none" stroke="${o.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
    s += `<path d="M13.9 4.2H18.1V9.2H13.9Z" fill="${o.ink}"/>`;
    if (o.L === '128') s += `<path d="M14.2 11.6C15.4 12.2 16.8 12.2 18 11.6M17.6 11.8C19.6 12.6 20.6 13.8 21 15.4M14.6 5.6H17.4M14.6 7H17.4" stroke="${o.L === '128' ? o.ink : o.ink}" stroke-width="${fin * 0.8}" fill="none"/><path d="M14.6 5.6H17.4M14.6 7H17.4" stroke="${o.bg}" stroke-width="0.3"/>`;
    return s;
  },
  chasseur(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    const pav = 'M20.2 15.6C23 15.2 25.2 13.6 27.4 11.8L27.8 23C25.2 21.2 23 19.6 20.2 19.2Z';
    if (o.sil) return `<path d="${pav}" fill="${o.ink}"/><circle cx="12" cy="17.4" r="8.2" fill="none" stroke="${o.ink}" stroke-width="3.2"/><path d="M6.4 11.2L3.2 8M2 9.2L4.4 6.8" stroke="${o.ink}" stroke-width="2" fill="none"/><ellipse cx="27.8" cy="17.4" rx="1.6" ry="5.6" fill="${o.ink}"/>`;
    if (o.L === '128') {
      s += `<g fill="none" stroke="${o.ink}" stroke-width="${fin}" stroke-linecap="round">`;
      s += '<circle cx="12" cy="17.4" r="8.8"/><circle cx="12" cy="17.4" r="7.4"/><path d="M6.4 17.4A5.6 5.6 0 0 1 17.6 17.4M7.6 17.4A4.4 4.4 0 0 1 16.4 17.4"/>';
      s += '</g>';
      // ombre du tube : traits radiaux côté bas-gauche
      let t = '';
      for (let a = 100; a <= 220; a += 7) { const r1 = 7.5, r2 = 8.7, c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180); t += `M${(12 + r1 * c).toFixed(2)} ${(17.4 + r1 * si).toFixed(2)}L${(12 + r2 * c).toFixed(2)} ${(17.4 + r2 * si).toFixed(2)}`; }
      s += `<path d="${t}" stroke="${o.ink}" stroke-width="0.22"/>`;
      s += `<path d="M5.4 11.6C2.4 4.6 13.4 1 20.6 5.2C22.6 6.4 22.8 8.8 21.8 10.8" fill="none" stroke="${o.ink}" stroke-width="${fin * 0.7}" stroke-dasharray="0.9 0.5"/>`;
      // hachures courbes dans le pavillon
      s += `<clipPath id="${o.cid}"><path d="${pav}"/></clipPath><g clip-path="url(#${o.cid})" fill="none" stroke="${o.ink}" stroke-width="0.2">`;
      for (let r = 1.6; r < 7; r += 0.7) s += `<ellipse cx="28.4" cy="17.4" rx="${(r * 0.55).toFixed(2)}" ry="${r.toFixed(2)}"/>`;
      s += '</g>';
    } else {
      s += `<circle cx="12" cy="17.4" r="8.2" fill="none" stroke="${o.ink}" stroke-width="${sw}"/>`;
      if (o.L === '32') s += `<path d="M6.4 17.4A5.6 5.6 0 0 1 17.6 17.4" fill="none" stroke="${o.ink}" stroke-width="${sw * 0.75}"/>`;
    }
    s += `<path d="${pav}" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.2 : sw}" stroke-linejoin="round"/>`;
    if (o.L === '128') s += `<clipPath id="${o.cid}b"><path d="${pav}"/></clipPath><g clip-path="url(#${o.cid}b)" fill="none" stroke="${o.ink}" stroke-width="0.22">${[2.2, 3, 3.8, 4.6, 5.4].map((r) => `<ellipse cx="28.6" cy="17.4" rx="${(r * 0.62).toFixed(2)}" ry="${r}"/>`).join('')}</g>`;
    s += `<ellipse cx="27.8" cy="17.4" rx="1.6" ry="5.6" fill="${o.L === '16' ? o.ink : o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.2 : sw}"/>`;
    s += `<path d="M6.4 11.2L3.2 8M2 9.2L4.4 6.8" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.6 : sw}" stroke-linecap="round"/>`;
    return s;
  },
  cupidon(o) {
    const sw = o.sw, fin = o.fin, g = o.L === '128' ? (o.serment ?? o.ink) : o.ink;
    let s = `<path d="M4.4 27.6L27 5" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linecap="round"/>`;
    s += `<path d="M29.2 2.8L22.6 5.2L26.8 9.4Z" fill="${o.ink}"/>`;
    let f = '';
    for (const t of [0, 1.8, 3.6]) { const x = 5.6 + t, y = 26.4 - t; f += `M${x} ${y}L${x - 3.2} ${y + 0.2}M${x} ${y}L${x - 0.2} ${y + 3.2}`; }
    s += `<path d="${f}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.1 : sw * 0.7}" stroke-linecap="round" fill="none"/>`;
    for (const [cx, cy] of [[11.4, 21], [19.8, 12.6]]) {
      if (o.sil) { s += `<path d="${coeur(cx, cy)}" fill="${o.ink}"/>`; continue; }
      s += `<path d="${coeur(cx, cy)}" fill="${o.bg}"/>`;
      if (o.L === '128') s += hach(coeur(cx, cy), BOX, { pas: 0.9, sw: 0.2, color: g, angle: -45 });
      s += `<path d="${coeur(cx, cy)}" fill="none" stroke="${g}" stroke-width="${o.L === '128' ? fin * 1.4 : sw}" stroke-linejoin="round"/>`;
    }
    return s;
  },
  salvateur(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    if (o.sil) return `<path d="${PORTE_F}" fill="${o.ink}"/><path d="M4.4 30.2H27.6" stroke="${o.ink}" stroke-width="2"/><path d="${PLANCHE}" fill="${o.bg}"/>`;
    if (o.L === '128') {
      s += hach(PORTE_F, BOX, { pas: 0.95, sw: 0.2, color: o.ink, angle: 45 });
      s += `<path d="M11.5 9V30M16 4.2V30M20.5 9V30" stroke="${o.ink}" stroke-width="${fin * 0.7}"/>`;
      s += `<path d="M5.2 13A10.8 10.8 0 0 1 26.8 13" fill="none" stroke="${o.ink}" stroke-width="${fin}"/>`;
      let v = ''; for (let a = 190; a <= 350; a += 20) { const c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180); v += `M${(16 + 9 * c).toFixed(2)} ${(13 + 9 * si).toFixed(2)}L${(16 + 10.8 * c).toFixed(2)} ${(13 + 10.8 * si).toFixed(2)}`; }
      s += `<path d="${v}" stroke="${o.ink}" stroke-width="${fin * 0.8}"/>`;
    } else if (o.L === '32') {
      s += hach(PORTE_F, BOX, { pas: 3, sw: 0.8, color: o.ink });
    }
    s += `<path d="${PORTE}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linejoin="round"/>`;
    s += `<path d="M4.4 30.2H27.6" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linecap="round"/>`;
    s += `<path d="${PLANCHE}" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.3 : sw * 0.8}" stroke-linejoin="round"/>`;
    if (o.L === '128') s += `<path d="M9 26.6L23 16.2" stroke="${o.ink}" stroke-width="${fin * 0.5}"/>`;
    s += `<circle cx="10.2" cy="26.4" r="${o.L === '16' ? 1.1 : 0.9}" fill="${o.ink}"/><circle cx="21.8" cy="16.6" r="${o.L === '16' ? 1.1 : 0.9}" fill="${o.ink}"/>`;
    return s;
  },
  idiot(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    if (o.sil) return `<path d="${BONNET_F}" fill="${o.ink}"/><path d="${BOURRELET}" fill="${o.ink}"/><circle cx="26.4" cy="18.2" r="2.5" fill="${o.ink}"/>`;
    if (o.L === '128') {
      s += hach('M7.6 22.4C7.2 14.6 10.6 6.8 17.4 5C14 8.6 12.6 14.6 13 22Z', BOX, { pas: 0.9, sw: 0.2, color: o.ink, angle: 45 });
      s += hach('M22 12.4C23.6 15.4 24.4 18.6 24.6 22.2L21.6 22C21.2 18.4 20 15 22 12.4Z', BOX, { pas: 0.9, sw: 0.2, color: o.ink, angle: -45 });
      s += hach(BOURRELET, BOX, { pas: 1.1, sw: 0.2, color: o.ink, angle: 80 });
    } else if (o.L === '32') {
      s += hach('M7.6 22.4C7.2 14.6 10.6 6.8 17.4 5C14 8.6 12.6 14.6 13 22Z', BOX, { pas: 2.6, sw: 0.7, color: o.ink });
    }
    s += `<path d="${BONNET}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<path d="${BOURRELET}" fill="${o.L === '128' ? 'none' : o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}"/>`;
    if (o.L === '128') s += `<path d="M10.4 21.9C11 18 12 13.4 15 9.6M18.6 21.8C19 17.6 19.6 13.2 21.4 9.4" fill="none" stroke="${o.ink}" stroke-width="${fin * 0.7}"/>`;
    s += `<path d="M26.2 15.4L26.4 15.8" stroke="${o.ink}" stroke-width="${sw}"/>`;
    s += `<circle cx="26.4" cy="18.2" r="2.5" fill="${o.L === '16' ? o.ink : o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.4 : sw * 0.8}"/>`;
    if (o.L !== '16') s += `<path d="M24.4 18.8H28.4" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin : 0.9}"/><circle cx="26.4" cy="19.7" r="0.5" fill="${o.ink}"/>`;
    if (o.L === '128') s += hach('M26.4 15.7A2.5 2.5 0 0 0 24 18.4H26.4Z', BOX, { pas: 0.6, sw: 0.16, color: o.ink, angle: -45 });
    return s;
  },
  ancien(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    if (o.sil) return `<path d="${MANTEAU}" fill="${o.ink}"/><circle cx="10.8" cy="9.6" r="3.1" fill="${o.ink}"/><path d="M14.4 14.6C12.6 15.8 10.6 16.8 8.6 17.2M8 15.4V30.4" stroke="${o.ink}" stroke-width="2" fill="none"/>`;
    if (o.L === '128') {
      s += hach(MANTEAU, BOX, { pas: 0.95, sw: 0.2, color: o.ink, angle: 45 });
      s += hach('M18 10.2C21.6 10.6 24.6 14 24.8 18.6C24.9 21.4 24.4 23.6 23.8 25.2L24.4 29.8L21 29.8C22 25 22.4 18 18 10.2Z', BOX, { pas: 0.9, sw: 0.2, color: o.ink, angle: -40 });
    } else if (o.L === '32') s += hach(MANTEAU, BOX, { pas: 3, sw: 0.8, color: o.ink });
    s += `<path d="${MANTEAU}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linejoin="round"/>`;
    s += `<circle cx="10.8" cy="9.6" r="3.1" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}"/>`;
    s += `<path d="M14.4 14.6C12.6 15.8 10.6 16.8 8.6 17.2" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linecap="round"/>`;
    s += `<path d="M8 15.4V30.4" stroke="${o.ink}" stroke-width="${o.L === '128' ? 0.5 : sw}" stroke-linecap="round"/>`;
    if (o.L === '128') {
      s += `<path d="M7.6 21L8.4 21.6L7.6 22.2M7.6 24.6L8.4 25.2L7.6 25.8" fill="none" stroke="${o.bg}" stroke-width="0.35"/>`;
      s += `<path d="M7.1 20.8L8.9 21.6M7.1 24.4L8.9 25.2" stroke="${o.ink}" stroke-width="0.25"/>`;
      s += `<path d="M9.6 11.8C9 13.6 10 15 11.2 14.4C12 14 11.6 12.8 10.8 13.2" fill="none" stroke="${o.ink}" stroke-width="${fin * 0.7}" stroke-linecap="round"/>`;
      s += `<path d="M8.4 8.2C9.2 7.2 11 6.8 12.6 7.6M14.6 30H13M24.6 30H26.4M17.6 13.4C18.6 17.6 18.4 22.6 17.4 26.6" fill="none" stroke="${o.ink}" stroke-width="${fin * 0.7}" stroke-linecap="round"/>`;
    } else {
      s += `<path d="M6.2 21.2H9.8M6.2 24.4H9.8" stroke="${o.ink}" stroke-width="${o.L === '16' ? 1.4 : 1}"/>`;
    }
    return s;
  },
  corbeau(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    const corps = `${CORBEAU}M13.8 10.2A1 1 0 1 0 11.8 10.2A1 1 0 1 0 13.8 10.2Z`;
    if (o.sil) return `<path d="${CORBEAU}" fill="${o.ink}"/><path d="M16.6 23.4L16 28.4M19.4 23.6L19.8 28.4M8 28.6H26" stroke="${o.ink}" stroke-width="1.6"/>`;
    if (o.L === '128') s += hach(corps, BOX, { pas: 0.68, sw: 0.27, color: o.ink, angle: 45, rule: 'evenodd' });
    else if (o.L === '32') s += hach(corps, BOX, { pas: 2.6, sw: 1.1, color: o.ink, rule: 'evenodd' });
    s += `<path d="${CORBEAU}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linejoin="round"/>`;
    s += `<circle cx="12.8" cy="10.2" r="1" fill="${o.bg}" stroke="${o.L === '16' ? 'none' : o.ink}" stroke-width="0.4"/>`;
    if (o.L === '16') s += `<circle cx="12.8" cy="10.2" r="1.1" fill="${o.ink}"/>`;
    if (o.L === '128') s += `<path d="M13.6 13.6C17 15.4 21 17.6 25.6 20.2M15 17.4C18 18.8 20.6 20 23 21M5.2 12.1L10.6 12.2" fill="none" stroke="${o.bg}" stroke-width="0.45" stroke-linecap="round"/>`;
    s += `<path d="M16.6 23.4L16 28.4M19.4 23.6L19.8 28.4M14.6 28.4H17.4M18.6 28.4H21.4" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.2 : sw * 0.7}" stroke-linecap="round"/>`;
    s += `<path d="M7 29.2C12 28.6 20 28.8 27 29.4" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.4 : sw * 0.8}" stroke-linecap="round"/>`;
    if (o.L === '128') s += `<path d="M24 29.3L26.6 31M10 28.9L8.6 30.8" stroke="${o.ink}" stroke-width="${fin}" stroke-linecap="round"/>`;
    return s;
  },
  bouc(o) {
    const sw = o.sw, fin = o.fin;
    const W = o.L === '128' ? fin * 1.5 : sw;
    let s = '';
    const cornes = 'M13.8 10C12.4 7.4 9.2 6.6 8.6 4.4C8.2 2.8 9.6 2 10.6 3M18.2 10C19.8 7.2 23 6.8 23.6 4.2C23.9 2.7 22.4 2.1 21.4 3.1';
    const oreilles = 'M11.6 12.2C9 12.8 6.2 13.8 4.4 13.2C5.8 11 9 10.4 11.4 10.9M20.4 12C23.2 12.4 25.8 13.2 27.8 12.4C26.2 10.6 23.2 10.2 20.6 10.8';
    if (o.sil) return `<path d="${TETE_BOUC}" fill="${o.ink}"/><path d="${cornes}${oreilles}" stroke="${o.ink}" stroke-width="2.2" fill="${o.ink}"/><path d="M14.8 23.6C14.8 26 15.4 28.4 16.2 30C16.6 28 17.2 25.8 17.2 23.6Z" fill="${o.ink}"/>`;
    if (o.L === '128') {
      s += hach('M11.4 10.6C10.4 12.6 11.4 17 13 21C13.8 23.2 14.8 24.4 16 24.4L14.6 18C13.6 15 13 12 13.6 10Z', BOX, { pas: 0.85, sw: 0.2, color: o.ink, angle: 45 });
      s += hach('M20.6 10.6C21.6 12.6 20.6 17 19 21C18.4 22.6 17.8 23.6 17 24.1L18.4 17C18.8 14.6 19 12.2 18.6 10Z', BOX, { pas: 0.85, sw: 0.2, color: o.ink, angle: -45 });
    } else if (o.L === '32') s += hach(TETE_BOUC, BOX, { pas: 3, sw: 0.75, color: o.ink, angle: 90 });
    s += `<path d="${TETE_BOUC}" fill="${o.L === '32' ? 'none' : 'none'}" stroke="${o.ink}" stroke-width="${W}" stroke-linejoin="round"/>`;
    s += `<path d="${oreilles}" fill="${o.bg}" stroke="${o.ink}" stroke-width="${W}" stroke-linejoin="round"/>`;
    s += `<path d="${cornes}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 2.2 : sw}" stroke-linecap="round"/>`;
    if (o.L === '128') {
      let t = ''; for (const [x, y] of [[12.6, 8.4], [11.4, 7.6], [10.2, 6.8], [9.2, 5.8], [19.4, 8.4], [20.6, 7.6], [21.8, 6.8], [22.8, 5.8]]) t += `M${x - 0.5} ${y - 0.5}L${x + 0.5} ${y + 0.5}`;
      s += `<path d="${t}" stroke="${o.bg}" stroke-width="0.25"/>`;
    }
    s += `<path d="M9.8 6.4C12.2 7.6 14.2 7.4 16 6.8C17.8 7.4 19.8 7.4 22.2 6" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.2 : sw * 0.6}"/>`;
    s += `<circle cx="16" cy="6.9" r="${o.L === '16' ? 1.2 : 1}" fill="${o.ink}"/>`;
    s += `<path d="M15.6 7.6L14.8 10.2M16.4 7.6L17.4 10" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin : sw * 0.5}" stroke-linecap="round"/>`;
    s += `<path d="M14.8 23.6C14.8 26 15.4 28.4 16.2 30C16.6 28 17.2 25.8 17.2 23.6" fill="${o.L === '16' ? o.ink : o.bg}" stroke="${o.ink}" stroke-width="${W}" stroke-linejoin="round"/>`;
    if (o.L === '128') s += `<path d="M15.6 25.4L16 28.6M16.4 25L16.6 27.2" stroke="${o.ink}" stroke-width="0.2"/>`;
    s += `<path d="M12.8 14.2L14.8 14.4M17.4 14.4L19.4 14.1" stroke="${o.ink}" stroke-width="${o.L === '16' ? 1.6 : (o.L === '128' ? fin * 1.6 : 1.2)}" stroke-linecap="round"/>`;
    if (o.L !== '16') s += `<path d="M14.6 21.6L15.2 22.2M17.4 21.6L16.8 22.2" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin : 0.9}" stroke-linecap="round"/>`;
    return s;
  },
  petiteFille(o) {
    const sw = o.sw, fin = o.fin;
    let s = '';
    if (o.sil) return `<path d="${CAPUCHON}${VISAGE}" fill="${o.ink}" fill-rule="evenodd"/>`;
    const cape = CAPUCHON + VISAGE;
    if (o.L === '128') {
      s += hach(cape, BOX, { pas: 0.95, sw: 0.2, color: o.ink, angle: 45, rule: 'evenodd' });
      s += hach('M7 14C6.6 20 5 25 3.6 29.6L10.4 29.6C9.4 25 9 20 9.6 13.4C10 9.6 11.4 6.2 13.6 3.4C9.6 4.6 7.4 8.6 7 14Z', BOX, { pas: 0.9, sw: 0.2, color: o.ink, angle: -45 });
    } else if (o.L === '32') s += hach(cape, BOX, { pas: 2.6, sw: 0.8, color: o.ink, rule: 'evenodd' });
    s += `<path d="${CAPUCHON}" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.5 : sw}" stroke-linejoin="round"/>`;
    s += `<path d="${VISAGE}" fill="${o.bg}" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 2.2 : sw}"/>`;
    s += `<circle cx="13.8" cy="15.4" r="${o.L === '16' ? 1.4 : 1.1}" fill="${o.ink}"/>`;
    s += `<path d="M16.9 15.8Q18 16.5 19.2 15.6" fill="none" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.3 : (o.L === '16' ? 1.6 : 1.1)}" stroke-linecap="round"/>`;
    if (o.L !== '16') s += `<path d="M16 22L14.4 25.6M16 22L17.8 25.4" stroke="${o.ink}" stroke-width="${o.L === '128' ? fin * 1.2 : 1}" stroke-linecap="round"/>`;
    if (o.L === '128') s += `<path d="M16 3.4C15 6 15 8 16 9.6M10.6 7.4C11.2 9.4 11.4 11 11 12.6M21.4 7.4C20.8 9.4 20.6 11 21 12.6M15.4 18.8Q16 19.2 16.6 18.8" fill="none" stroke="${o.ink}" stroke-width="${fin * 0.7}" stroke-linecap="round"/>`;
    return s;
  },
  loupBlanc(o) {
    let s = '';
    const mass = o.mass ?? o.ink;
    if (o.L === '128' && !o.sil) {
      s += `<path d="${BLANC_MASSE}" fill="${mass}"/>`;
      s += grain(BLANC_MASSE, [0, 0, 32, 32], { f: 'aqua-IV', op: 0.3, sc: 0.25 });
    }
    if (o.sil) return `<path d="${BLANC}" fill="${o.ink}"/>`;
    s += `<path d="${BLANC}" fill="${o.bg}" stroke="${o.accent}" stroke-width="${o.L === '128' ? 0.55 : o.L === '16' ? 2.4 : 2}" stroke-linejoin="miter"/>`;
    s += `<path d="${LOUP_OEIL}" fill="${o.accent}"${o.L === '16' ? ' transform="translate(12.5 12.4) scale(1.4) translate(-12.5 -12.4)"' : ''}/>`;
    if (o.L === '128') s += `<circle cx="29.6" cy="7.8" r="0.4" fill="${o.accent}"/>`;
    return s;
  },
};

/**
 * Symbole en SVG autonome.
 * size : px ; o : { ink, bg, accent, serment, mass, sil, L (forcé) }
 */
export function symbole(id, size, o = {}) {
  const L = o.L ?? (size >= 96 ? '128' : size >= 24 ? '32' : '16');
  const sw = L === '128' ? 0.7 : L === '32' ? 2 : 3;
  const fin = L === '128' ? 0.32 : 0.75;
  const ink = o.ink ?? 'currentColor';
  const opts = { L, sw, fin, ink, bg: o.bg ?? K.tei, accent: o.accent ?? ink, serment: o.serment, mass: o.mass, sil: !!o.sil, cid: uid('cs') };
  const inner = DESSINS[id](opts);
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display: block; overflow: visible;${o.color ? ` color: ${o.color};` : ''}" aria-hidden="true">${inner}</svg>`;
}
/** la même chose, mais en <g> positionné dans un SVG parent */
export function symboleG(id, x, y, size, o = {}) {
  const s = symbole(id, size, o);
  return s.replace(/^<svg width="(\d+(\.\d+)?)" height="(\d+(\.\d+)?)"/, `<svg x="${x}" y="${y}" width="$1" height="$3"`);
}
