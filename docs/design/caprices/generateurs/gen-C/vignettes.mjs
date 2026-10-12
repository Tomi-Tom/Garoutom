// Les dix-huit vignettes de la nuit racontée (SPEC § 6.4), sur une grille 96.
import { K, hach, hachRect, grain } from './lib.mjs';
import { symboleG } from './roles.mjs';
import { dormeur } from './cartes.mjs';

const I = K.b9;
const P = (d, sw, k, extra = '') => `<path d="${d}" fill="none" stroke="${I}" stroke-width="${(sw * k).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const SYM = { ink: K.b9, bg: K.tei, accent: K.san, mass: K.b9, serment: K.gE, L: '128' };

export const VIGNETTES = [
  { id: 'machoire', prio: '1', evt: 'loupBlanc (cible)', leg: '« Les loups ne se mangent pas entre eux, dit-on. »', nom: 'mâchoire' },
  { id: 'branche', prio: '2', evt: 'rancune', leg: '« Le village a scié sa propre branche. »', nom: 'branche sciée' },
  { id: 'aconit', prio: '3', evt: 'poison', leg: '« Deux fioles, et la mauvaise. »', nom: 'fiole d’aconit' },
  { id: 'cor', prio: '4', evt: 'tir (cible)', leg: '« Il tire mieux mort que vivant. »', nom: 'cor fumant' },
  { id: 'lacs', prio: '5', evt: 'mort, cause chagrin', leg: '« Jusqu’à la mort, et pas un jour de plus. »', nom: 'lacs dénoués' },
  { id: 'corde', prio: '6', evt: 'grace', leg: '« Gracié, et toujours pas écouté. »', nom: 'corde coupée' },
  { id: 'bouc', prio: '7', evt: 'bouc', leg: '« Il fallait bien quelqu’un. »', nom: 'tête de bouc' },
  { id: 'potence', prio: '8 · 9', evt: 'vote (meute · village)', leg: '« Pour une fois. » · « Tous d’accord, donc tous innocents. »', nom: 'potence' },
  { id: 'vie', prio: '10', evt: 'sauvetage', leg: '« La fiole a servi ; nul ne l’a su. »', nom: 'fiole de vie' },
  { id: 'yeux', prio: '11', evt: 'loups (cible) + mort', leg: '« Personne ne nous a vus. »', nom: 'yeux dans le noir' },
  { id: 'canne', prio: '12', evt: 'resistance', leg: '« Jusqu’à la mort, et une fois de plus. »', nom: 'canne à deux encoches' },
  { id: 'porte', prio: '13', evt: 'protection sur la cible', leg: '« Pour une fois, la bonne porte. »', nom: 'porte barrée' },
  { id: 'lettre', prio: '14', evt: 'corbeau', leg: '« La lettre n’était pas signée. »', nom: 'lettre cachetée' },
  { id: 'main', prio: '15', evt: 'voyance (meute)', leg: '« Ce qu’elle voit, nul ne le croit. »', nom: 'main à l’œil' },
  { id: 'fleche', prio: '16', evt: 'amoureux', leg: '« Ils disent oui au premier venu. »', nom: 'flèche et deux cœurs' },
  { id: 'dormeur', prio: '17', evt: 'défaut, nuit', leg: '« Le sommeil de la raison engendre des loups. »', nom: 'le dormeur' },
  { id: 'place', prio: '18', evt: 'défaut, jour', leg: '« Ils ont parlé longtemps. »', nom: 'la place vide' },
  { id: 'sablier', prio: '—', evt: 'dernière planche', leg: '« Il est l’heure. »', nom: 'sablier vide' },
];

const DESS = {
  machoire(k, h) {
    let s = grain('M0 0H96V96H0Z', [0, 0, 96, 96], { f: 'aqua-I', op: 0.5 });
    const haut = 'M10 44C16 30 36 22 58 24C72 25 82 30 88 38L84 46L80 41L76 48L72 42L67 49L62 43L57 50L52 44L47 50L42 44L37 49L32 43L26 47L20 42L14 46Z';
    const bas = 'M16 60L22 55L27 61L32 54L37 60L42 53L47 59L52 53L57 58L62 53L67 58L72 54L78 60C74 70 62 76 48 76C34 76 22 70 16 60Z';
    s += `<g filter="url(#mordu)"><path d="${haut}" fill="${I}"/><path d="${bas}" fill="${I}"/></g>`;
    s += grain(haut + bas, [0, 0, 96, 96], { f: 'aqua-IV', op: 0.3 });
    s += P('M10 44C6 50 8 58 16 60', 2, k);
    s += `<path d="M58 30Q63 28 67 31Q62 32.4 58 30Z" fill="${K.tei}"/>`;
    s += `<path d="M22 52L28 54.4L34 51.6L40 54.4L46 51.6L52 54.4L58 51.6L64 54.4L70 51.6" fill="none" stroke="${K.san}" stroke-width="${(1.4 * k).toFixed(2)}" stroke-linejoin="miter"/>`;
    return s;
  },
  branche(k, h) {
    let s = hachRect(0, 0, 96, 50, { pas: 3 * h, sw: 0.45 * k, color: I, angle: 0, op: 0.45 });
    const tronc = 'M6 92C12 70 13 40 9 4L27 4C25 38 26 66 32 92Z';
    const br = 'M24 30C42 27 62 29 90 24L90 33C64 37 44 38 25 41Z';
    s += `<path d="${tronc}" fill="${K.tei}"/>` + hach('M6 92C12 70 13 40 9 4L15 4C17 40 16 70 14 92Z', [0, 0, 40, 96], { pas: 2.2 * h, sw: 0.5 * k, color: I, angle: 80 });
    s += P(tronc, 1.3, k) + P('M19 10C20 30 19 60 22 86M23 20C22 40 23 56 26 70', 0.5, k);
    s += `<path d="${br}" fill="${K.tei}"/>` + hach('M25 36C44 35 64 33 90 30L90 33C64 37 44 38 25 41Z', [20, 20, 76, 24], { pas: 2 * h, sw: 0.45 * k, color: I, angle: 20 });
    s += P(br, 1.3, k);
    s += `<path d="M38 28.6V35.8" stroke="${K.tei}" stroke-width="${2.2 * k}"/>` + P('M37 28.6L37.6 34.6M39.4 28.4L39 34.2', 0.6, k);
    s += P('M38 38.6V40M37 43V44M39 46V47', 0.8, k);
    // la scie dans l'entaille
    s += P('M30 14L46 31L42 34L26 17Z', 1, k) + P('M26 17L28 17.4L28.6 19.4L30.4 19.8L31 21.8L32.8 22.2L33.4 24.2L35.2 24.6L35.8 26.6L37.6 27L38.2 29L40 29.4L42 34', 0.6, k);
    s += `<path d="M22 8L32 4L34 10L26 14Z" fill="${I}"/>`;
    // celui qui est assis au bout
    s += P('M74 13.4A3.4 3.4 0 1 0 74 13.39M74 17V26.6M74 26.6L80 27M74 20L69 24', 1.1, k);
    s += P('M0 92.5H96', 1, k);
    return s;
  },
  aconit(k, h) {
    let s = hachRect(0, 0, 96, 70, { pas: 4 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += `<circle cx="34" cy="51" r="19" fill="${K.tei}"/><path d="M28 18H40V36H28Z" fill="${K.tei}"/><ellipse cx="68" cy="66" rx="20" ry="9" fill="${K.tei}"/>`;
    s += symboleG('sorciere', 10, 22, 48, SYM);
    s += `<path d="M62 70A10 10 0 1 1 72 76L86 68L84 63L70 60" fill="${K.tei}" stroke="${I}" stroke-width="${1.1 * k}" stroke-linejoin="round"/>`;
    s += P('M84 63L86 68M88 72H94V76H88Z', 1, k);
    s += P('M68 78C74 80 80 79 86 81C90 82 92 84 94 84', 0.7, k);
    s += P('M0 78.5H96', 1.1, k) + hachRect(0, 79, 96, 17, { pas: 2.6 * h, sw: 0.5 * k, color: I, angle: 90 });
    return s;
  },
  cor(k, h) {
    let s = '';
    s += symboleG('chasseur', 6, 36, 60, SYM);
    s += P('M58 60C52 52 64 46 58 38C52 30 66 24 60 14C58 10 61 6 64 6', 0.9, k);
    s += P('M64 62C70 54 62 48 70 40C76 33 68 27 74 20', 0.8, k);
    s += P('M52 44C48 42 48 38 51 36M66 30C70 28 72 30 71 33M60 20C57 19 56 16 58 14', 0.6, k);
    s += P('M0 90.5H96', 1, k) + hachRect(0, 91, 96, 5, { pas: 2 * h, sw: 0.5 * k, color: I, angle: 90 });
    return s;
  },
  lacs(k, h) {
    const G = K.gE;
    let s = hachRect(0, 74, 96, 22, { pas: 3 * h, sw: 0.45 * k, color: I, angle: 0, op: 0.5 });
    const anneau = (cx, cy, r, a0, a1) => {
      const p = (a, rr) => `${(cx + rr * Math.cos(a * Math.PI / 180)).toFixed(2)} ${(cy + rr * Math.sin(a * Math.PI / 180)).toFixed(2)}`;
      return `<path d="M${p(a0, r)}A${r} ${r} 0 1 1 ${p(a1, r)}" fill="none" stroke="${G}" stroke-width="${2 * k}" stroke-linecap="round"/><path d="M${p(a0 + 6, r - 3.5)}A${r - 3.5} ${r - 3.5} 0 1 1 ${p(a1 - 6, r - 3.5)}" fill="none" stroke="${G}" stroke-width="${0.9 * k}" stroke-linecap="round"/>`;
    };
    s += anneau(32, 40, 16, 70, 40);
    s += anneau(64, 48, 16, 250, 220);
    s += `<path d="M40 54C42 62 36 68 40 76C42 80 38 84 40 88" fill="none" stroke="${G}" stroke-width="${1.6 * k}" stroke-linecap="round"/>`;
    s += `<path d="M56 34C54 26 60 20 56 12C54 8 58 6 60 4" fill="none" stroke="${G}" stroke-width="${1.6 * k}" stroke-linecap="round"/>`;
    s += `<path d="M39 88L37 91M40 88L40.4 91.6M41 88L43 90.6" stroke="${G}" stroke-width="${0.7 * k}"/>`;
    return s;
  },
  corde(k, h) {
    let s = '';
    s += `<path d="M4 10H92V18H4Z" fill="${K.tei}"/>` + hachRect(4, 10, 88, 8, { pas: 2.2 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += P('M4 10H92V18H4Z', 1.2, k) + P('M12 18V90M12 34L28 18', 2.2, k);
    s += P('M52 18V40', 1.6, k) + P('M52 40L49 45M52 40L52.4 46M52 40L55 44.6', 0.7, k);
    s += P('M52 22L53.6 23.4M52 26L53.6 27.4M52 30L53.6 31.4M52 34L53.6 35.4', 0.5, k);
    s += P('M40 82C40 78 64 78 64 82C64 86 40 86 40 82ZM62 80C68 74 64 66 58 62', 1.5, k);
    s += P('M58 62L55 59M58 62L58 58M58 62L61 59.6', 0.7, k);
    s += P('M0 88.5H96', 1, k) + hachRect(0, 89, 96, 7, { pas: 2 * h, sw: 0.5 * k, color: I, angle: 90 });
    return s;
  },
  bouc(k, h) {
    let s = hachRect(0, 0, 96, 96, { pas: 6 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += `<ellipse cx="48" cy="46" rx="38" ry="40" fill="${K.tei}"/>`;
    s += symboleG('bouc', 12, 8, 72, SYM);
    return s;
  },
  potence(k, h) {
    let s = hachRect(0, 0, 96, 70, { pas: 3 * h, sw: 0.45 * k, color: I, angle: 0, op: 0.45 });
    const colline = 'M0 96V80C20 74 40 72 60 74C76 76 88 80 96 84V96Z';
    s += `<path d="${colline}" fill="${K.tei}"/>` + hach(colline, [0, 70, 96, 26], { pas: 2.4 * h, sw: 0.5 * k, color: I, angle: 30 });
    s += P('M0 80C20 74 40 72 60 74C76 76 88 80 96 84', 1, k);
    s += `<path d="M28 76V12H31V76ZM26 12H74V15.4H26Z" fill="${I}"/>` + P('M30 30L44 14', 2.2, k);
    s += P('M66 15V40', 1.2, k) + P('M61.6 46A4.4 6.4 0 1 0 70.4 46A4.4 6.4 0 1 0 61.6 46', 1.3, k);
    return s;
  },
  vie(k, h) {
    let s = hachRect(0, 0, 96, 96, { pas: 2.6 * h, sw: 0.8 * k, color: I, angle: 45 });
    s += `<circle cx="48" cy="60" r="20" fill="${K.tei}"/><path d="M40 20H56V42H40Z" fill="${K.tei}"/>`;
    s += P('M42 40V24M54 40V24M39 24H57', 1.6, k) + `<circle cx="48" cy="60" r="20" fill="none" stroke="${I}" stroke-width="${1.6 * k}"/>`;
    s += `<path d="M41.6 8H54.4V22H41.6Z" fill="${I}"/>`;
    s += P('M30.6 56C38 58 58 58 65.4 56', 0.7, k) + P('M58 46A14 14 0 0 1 63 56', 1.2, k, ` stroke="${K.bru}"`).replace(`stroke="${I}" `, '');
    s += P('M0 86.5H96', 1, k);
    return s;
  },
  yeux(k, h) {
    let s = `<rect width="96" height="96" fill="${I}"/><rect width="96" height="96" fill="#000" filter="url(#aqua-IV)" opacity="0.3"/>`;
    const oeil = (x, y, w = 10) => `<path d="M${x - w / 2} ${y}Q${x} ${y - w * 0.42} ${x + w / 2} ${y}Q${x} ${y + w * 0.42} ${x - w / 2} ${y}Z" fill="${K.tei}"/><ellipse cx="${x}" cy="${y}" rx="${(w * 0.08).toFixed(2)}" ry="${(w * 0.19).toFixed(2)}" fill="${K.san}"/>`;
    s += oeil(28, 44) + oeil(43, 43.4) + oeil(58, 62) + oeil(72, 62.6) + oeil(64, 26, 7) + oeil(74, 25.6, 7);
    return s;
  },
  canne(k, h) {
    let s = '';
    s += P('M72 4V84M0 84H96', 1, k);
    s += hachRect(72, 4, 24, 80, { pas: 3 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += hachRect(0, 84, 96, 12, { pas: 2.2 * h, sw: 0.5 * k, color: I, angle: 90 });
    s += P('M38 88L66 16C68 8 78 8 78 14C78 18 73 19 73 16', 2.6, k);
    const enc = (t) => { const x = 38 + 28 * t, y = 88 - 72 * t; return `<path d="M${x - 2.6} ${y - 1}L${x + 2.6} ${y + 1}" stroke="${K.tei}" stroke-width="${1.4 * k}"/>` + P(`M${x - 2.4} ${y - 2}L${x + 0.4} ${y + 0.2}`, 0.6, k); };
    s += enc(0.42) + enc(0.54);
    s += P('M40 89C48 90 58 90 66 89', 0.6, k);
    return s;
  },
  porte(k, h) {
    let s = symboleG('salvateur', 4, 14, 76, SYM);
    s += P('M76 14H86V22', 1.2, k) + P('M80 26H92V42H80ZM84 26V42M88 26V42M80 34H92M78 26L86 20L94 26M84 42L86 46L88 42', 1, k);
    return s;
  },
  lettre(k, h) {
    let s = '';
    s += hachRect(0, 62, 96, 34, { pas: 3 * h, sw: 0.45 * k, color: I, angle: 0, op: 0.5 });
    s += `<path d="M26 54L70 57L68 76L24 73Z" fill="${K.bru}" stroke="${I}" stroke-width="${1 * k}" stroke-linejoin="round"/>`;
    s += P('M24 73L47 63L68 76', 0.7, k) + `<circle cx="47" cy="66" r="4.4" fill="${I}"/>` + P('M45 66H49M47 64V68', 0.7, k, ` stroke="${K.tei}"`).replace(`stroke="${I}" `, '');
    s += `<path d="M6 2H90V60H6Z" fill="${K.tei}"/>` + hachRect(6, 2, 84, 58, { pas: 3 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += P('M6 2H90V60H6ZM27 2V60M48 2V60M69 2V60', 1, k) + `<rect x="6" y="60" width="84" height="3" fill="${I}"/>`;
    s += P('M0 63.5H96', 0.8, k);
    return s;
  },
  main(k, h) {
    let s = hachRect(0, 0, 96, 96, { pas: 6 * h, sw: 0.5 * k, color: I, angle: 45 });
    s += `<ellipse cx="48" cy="48" rx="40" ry="44" fill="${K.tei}"/>` + `<ellipse cx="48" cy="48" rx="40" ry="44" fill="none" stroke="${I}" stroke-width="${0.8 * k}"/>`;
    s += symboleG('voyante', 10, 8, 76, SYM);
    return s;
  },
  fleche(k, h) {
    let s = hachRect(0, 0, 96, 96, { pas: 6 * h, sw: 0.5 * k, color: I, angle: -45 });
    s += `<ellipse cx="48" cy="48" rx="40" ry="42" fill="${K.tei}"/>` + `<ellipse cx="48" cy="48" rx="40" ry="42" fill="none" stroke="${I}" stroke-width="${0.8 * k}"/>`;
    s += symboleG('cupidon', 12, 12, 72, SYM);
    return s;
  },
  dormeur(k, h) {
    let s = '';
    const nuee = 'M0 0H70C64 10 72 18 62 26C52 34 40 30 30 36C20 42 10 38 0 44Z';
    s += `<path d="${nuee}" fill="${I}"/>` + grain(nuee, [0, 0, 72, 44], { f: 'aqua-IV', op: 0.3 });
    s += `<path transform="translate(14 14) scale(0.8)" d="M0 0C3 -4 7 -5 9 -2C10 -5 12 -5 13 -2C15 -5 19 -4 22 0C18 -1 16 0 15 2C13 0 12 1 11 3C10 1 9 0 7 2C6 0 4 -1 0 0Z" fill="${K.tei}"/>`;
    s += `<path transform="translate(40 10) scale(0.6)" d="M0 0C3 -4 7 -5 9 -2C10 -5 12 -5 13 -2C15 -5 19 -4 22 0C18 -1 16 0 15 2C13 0 12 1 11 3C10 1 9 0 7 2C6 0 4 -1 0 0Z" fill="${K.tei}"/>`;
    s += `<g transform="translate(-2 24) scale(0.96)">${dormeur(I, k)}</g>`;
    s += P('M0 101H96', 1, k);
    return s;
  },
  place(k, h) {
    let s = hachRect(0, 0, 96, 44, { pas: 3 * h, sw: 0.45 * k, color: I, angle: 0, op: 0.5 });
    const toits = 'M0 44H8V32L16 24L24 32V44H32V36L40 30L48 36V44H54V20L59 10L64 20V44H70V34L78 27L86 34V44H96V96H0Z';
    s += `<path d="${toits}" fill="${K.tei}"/>`;
    s += P('M0 44H8V32L16 24L24 32V44H32V36L40 30L48 36V44H54V20L59 10L64 20V44H70V34L78 27L86 34V44H96', 1, k);
    s += `<rect x="57.6" y="24" width="3" height="5" fill="${K.tei}" stroke="${I}" stroke-width="${0.6 * k}"/>`;
    s += P('M13 36H17V40H13ZM74 37H78V41H74ZM36 38H40V42H36Z', 0.6, k);
    s += hachRect(54, 20, 4, 24, { pas: 1.4 * h, sw: 0.4 * k, color: I, angle: 90 });
    s += P('M48 44L4 96M48 44L30 96M48 44L66 96M48 44L92 96', 0.4, k);
    s += P('M32 72C32 66 64 66 64 72C64 78 32 78 32 72ZM32 72V76C32 82 64 82 64 76V72M46 70V58M50 70V58M41 58C41 55 55 55 55 58C55 60 41 60 41 58', 1.1, k);
    s += hach('M32 72V76C32 82 64 82 64 76V72C64 76 32 76 32 72Z', [30, 70, 36, 14], { pas: 1.6 * h, sw: 0.45 * k, color: I, angle: 90 });
    s += P('M20 88L34 84M62 84L78 88', 0.5, k);
    return s;
  },
  sablier(k, h) {
    let s = '';
    s += `<path d="M22 8H74V15H22ZM22 81H74V88H22Z" fill="${K.tei}" stroke="${I}" stroke-width="${1.2 * k}"/>`;
    s += hachRect(22, 8, 52, 7, { pas: 2 * h, sw: 0.45 * k, color: I, angle: 90 }) + hachRect(22, 81, 52, 7, { pas: 2 * h, sw: 0.45 * k, color: I, angle: 90 });
    s += P('M27 15V81M69 15V81', 2, k);
    s += P('M34 15C34 34 46 42 47 48C46 54 34 62 34 81M62 15C62 34 50 42 49 48C50 54 62 62 62 81', 1.2, k);
    const tas = 'M35.6 81C37.6 73 43.6 69 48 67.4C52.4 69 58.4 73 60.4 81Z';
    s += hach(tas, [34, 66, 28, 16], { pas: 1.3 * h, sw: 0.55 * k, color: I, angle: 45 }) + P(tas, 0.8, k);
    s += P('M57 22A4 10 0 0 1 58 32', 0.8, k, ` stroke="${K.bru}"`).replace(`stroke="${I}" `, '');
    return s;
  },
};

/** une vignette encadrée de sa cuvette ; size 96 ou 192 */
export function vignette(id, size = 96) {
  const k = size >= 160 ? 0.62 : 1;
  const h = size >= 160 ? 0.7 : 1;
  let s = `<rect width="96" height="96" fill="${K.tei}"/>`;
  s += DESS[id](k, h);
  s += `<path d="M0 96V0H96" fill="none" stroke="${K.b9}" stroke-opacity="0.45" stroke-width="${0.9 * k}"/><path d="M96 0V96H0" fill="none" stroke="${K.bru}" stroke-width="${1.4 * k}"/>`;
  s += `<rect x="${2.2 * k}" y="${2.2 * k}" width="${96 - 4.4 * k}" height="${96 - 4.4 * k}" fill="none" stroke="${K.b9}" stroke-opacity="0.16" stroke-width="${0.8 * k}"/>`;
  const v = VIGNETTES.find((x) => x.id === id);
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" style="display: block; overflow: hidden;" role="img" aria-label="Vignette : ${v ? v.nom : id}">${s}</svg>`;
}
