// Lot E1a (hors partie) de Caprices : génère les 11 artboards .dc.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project';
const TEX = readFileSync('D:/TomArcade/Garoutom/docs/design/caprices/textures.svg', 'utf8');
// le vrai bloc, en début de ligne (le commentaire d’en-tête de textures.svg cite aussi « <defs> »)
const DEFS_TEX = TEX.match(/^<defs>[\s\S]*?^<\/defs>/m)[0];

const B9 = '#17130F', B8 = '#2A241E', P3 = '#4A433B', P2 = '#7A7064', P1 = '#A89D8C', DEL = '#5E554A';
const TEI = '#E1D7C1', VER = '#E8DFCB', BRU = '#F5EFE2', SAN = '#A23B24', ROU = '#8C6A3F';
const FELL = "'IM Fell French Canon', Georgia, serif";
const FSC = "'IM Fell French Canon SC', Georgia, serif";
const SER = "'Source Serif 4', Georgia, serif";
const SYS = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const NB = '\u00a0';

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=IM+Fell+French+Canon:ital@0;1'
  + '&amp;family=IM+Fell+French+Canon+SC&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;'
  + '0,8..60,600;0,8..60,700;1,8..60,400&amp;display=swap" rel="stylesheet">';

const PAPER_BG = `background-color: ${VER}; background-image: repeating-linear-gradient(90deg, rgba(23,19,15,.05) 0 1px, transparent 1px 40px), `
  + 'repeating-linear-gradient(0deg, rgba(23,19,15,.035) 0 .6px, transparent .6px 3px);';

const g = (v) => String(Math.round(v * 100) / 100);

function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { uniform: (lo, hi) => lo + (hi - lo) * next(), choice: (arr) => arr[Math.floor(next() * arr.length)] };
}

// ---------------------------------------------------------------- symboles des rôles (32)
const SA = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const ROLE_SYM = {
  // 1 · fourche à trois dents inclinée de 8°
  villageois: `<g transform="rotate(8 16 16)" ${SA} stroke-width="2"><path d="M16 30 V13"/><path d="M9.5 13 H22.5"/><path d="M9.5 13 V6.5 L10.2 3.6 M16 13 V5.5 L16 2.6 M22.5 13 V6.5 L21.8 3.6"/></g>`,
  // 2 · profil humain en masse, nuque mordue, un œil fendu en réserve
  loup: '<path fill="currentColor" d="M12 3.5 C17.5 2.5 23 5 24.5 9.5 L25.5 13 L28 16.5 L25.6 17.6 L26 20.2 L24.4 21 C24.6 23.8 23.2 25.6 20.2 25.6 L19.6 29 L10.5 29 L11.2 26.8 L8.6 26.2 L9.8 24.1 L6.6 23 L8.9 21.3 L5.8 19.2 L8.6 17.6 L5.4 14.9 L8.4 13.4 L6.2 10.6 L9 9.6 L7.9 6.4 L10.6 6.1 Z"/>'
    + `<path fill="${BRU}" d="M16.8 11.1 L23.8 11.9 L17 13.1 Z"/><circle cx="4.1" cy="22.6" r=".8" fill="currentColor"/>`,
  // 3 · main ouverte, l’œil au creux de la paume
  voyante: `<g ${SA} stroke-width="1.5"><path d="M8.5 15.5 V7.6 A1.7 1.7 0 0 1 11.9 7.6 V14 M11.9 14 V5 A1.7 1.7 0 0 1 15.3 5 V14 M15.3 14 V5.5 A1.7 1.7 0 0 1 18.7 5.5 V14 M18.7 14.5 V8.2 A1.7 1.7 0 0 1 22.1 8.2 V19 C22.1 24.6 19.4 28.6 15.4 28.6 C11.6 28.6 9.7 26.4 8.5 23.8 L5.3 17.4 A1.7 1.7 0 0 1 8.2 15.6 L8.5 16.3"/>`
    + '<path d="M10.6 21.4 Q15.4 17.9 20.2 21.4 Q15.4 24.9 10.6 21.4 Z" stroke-width="1.2"/></g><circle cx="15.4" cy="21.4" r="1.5" fill="currentColor"/>',
  // 4 · fiole bouchée, l’aconit dedans
  sorciere: `<g ${SA} stroke-width="2"><path d="M13.5 9 V13.6 C9.5 15 7.5 18 7.5 21.5 C7.5 26.2 11.3 29.5 16 29.5 C20.7 29.5 24.5 26.2 24.5 21.5 C24.5 18 22.5 15 18.5 13.6 V9"/><path d="M12.5 9 H19.5"/></g>`
    + '<rect x="13" y="3" width="6" height="5.5" fill="currentColor"/>'
    + '<path d="M13.4 24.6 C13.2 21 14.4 18.9 16.5 18.7 C18.5 18.6 19.3 20.1 18.6 21.2 C19.9 21.7 20 23.6 18.9 24.6 Z" fill="currentColor"/>'
    + '<path d="M16 24.6 V27.2" stroke="currentColor" stroke-width="1.2"/>',
  // 5 · cor de louveterie, pavillon à droite
  chasseur: `<g ${SA} stroke-width="2"><path d="M5.2 18.5 C4.6 11 9.8 6.6 15.6 6.6 C21.2 6.6 24.7 10.6 24.1 15.1 C23.6 19.6 19.6 22.4 15.2 22 C11.2 21.6 9.2 18.6 10 15.6 C10.8 12.6 14.2 11.6 16.6 13.2 L22.6 19.6"/><path d="M5.2 18.5 L4.2 21.4"/>`
    + '<path d="M21.4 17.6 L27.8 24.4 M19.6 21.2 L26.2 26.6" stroke-width="1.6"/><path d="M27.8 24.4 C27.4 26 26.9 26.6 26.2 26.6" stroke-width="1.6"/></g>'
    + `<g ${SA} stroke-width=".75"><path d="M22.6 21.8 L25.2 24.4 M21.6 22.8 L24 25.2"/></g>`,
  // 6 · flèche à 45° qui enfile deux cœurs
  cupidon: `<g ${SA}><path d="M5 27 L27 5" stroke-width="1.8"/><path d="M27 5 L20.6 6.3 M27 5 L25.7 11.4" stroke-width="1.8"/>`
    + '<path d="M5 27 L4.3 22.8 M5 27 L9.2 27.7 M7 25 L6.3 20.8 M7 25 L11.2 25.7 M9 23 L8.3 18.8 M9 23 L13.2 23.7" stroke-width="1.1"/>'
    + '<path d="M13.5 22.6 C9.2 19.6 9.6 15.6 13.4 16.9 C15.1 13.2 18.8 14.6 16.6 19.4 Z" stroke-width="1.5"/>'
    + '<path d="M19.5 16.6 C15.2 13.6 15.6 9.6 19.4 10.9 C21.1 7.2 24.8 8.6 22.6 13.4 Z" stroke-width="1.5"/></g>',
  // 7 · porte cintrée barrée d’une planche
  salvateur: `<g ${SA} stroke-width="2"><path d="M7 30 V12 A9 9 0 0 1 25 12 V30 Z"/></g>`
    + `<g ${SA} stroke-width="1.5"><path d="M6.4 22.6 L25.6 12 L25.6 16 L6.4 26.6 Z"/></g>`
    + '<circle cx="9.6" cy="22.6" r="1" fill="currentColor"/><circle cx="22.4" cy="16" r="1" fill="currentColor"/>',
  // 8 · bonnet à un grelot
  idiot: `<g ${SA} stroke-width="2"><path d="M6.5 25 C7.4 15 12 8 19 6.5 C24.5 5.3 27.6 9 26.4 13.4 C25.8 15.6 25 17 24.6 18.6"/><path d="M19 6.5 C21.4 12 23.4 18 25.4 25"/><path d="M5.5 25 H26.5 V29 H5.5 Z"/></g>`
    + `<g ${SA} stroke-width=".75"><path d="M8.5 25.5 L11 28.5 M12.5 25.5 L15 28.5 M16.5 25.5 L19 28.5 M20.5 25.5 L23 28.5"/></g>`
    + `<circle cx="24.6" cy="21" r="2.5" fill="${BRU}" stroke="currentColor" stroke-width="1.5"/>`,
  // 9 · le vieillard courbé, canne à deux encoches
  ancien: `<g ${SA} stroke-width="2"><circle cx="14.6" cy="8.4" r="3.2"/><path d="M11.6 11 C8.2 13.2 7.4 17.4 8.6 21.6 L9.4 29.6"/><path d="M12.8 13.6 C15 15.2 17.6 16.4 20.6 16.8"/><path d="M9.8 22.2 L14.4 23.6 L15 29.6"/><path d="M21.6 15 V30"/></g>`
    + `<g ${SA} stroke-width="1.2"><path d="M20 20 H23.2 M20 23.6 H23.2"/></g>`,
  // 10 · corbeau posé, corps en hachure serrée
  corbeau: '<path d="M6 20 C6 14 11 10.5 16.5 10.5 C19 10.5 20.5 9 22 7.8 L28.6 9.6 L23.5 11.2 C23.8 14.5 22 18.5 18 21 L10 24.5 L4 27.5 L6.5 23.5 Z" fill="url(#hach-3-e)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
    + `<circle cx="21" cy="9.7" r="1.1" fill="${BRU}"/>`
    + `<g ${SA} stroke-width="1.4"><path d="M14 22.4 V27.6 M17.2 21.2 V27.6 M11.6 27.6 H20"/><path d="M5.4 24.6 L2.6 26.4 M6 25.4 L3.8 29 M7.4 25.6 L6.4 29.6" stroke-width="1.1"/></g>`,
  // 11 · tête de bouc, cornes en lyre, cordon noué
  bouc: `<g ${SA} stroke-width="2"><path d="M11 12.4 C11 18.4 12.6 23 16 26 C19.4 23 21 18.4 21 12.4 C19 10.9 13 10.9 11 12.4 Z"/><path d="M12.8 10.8 C9.6 9.4 5.8 6.8 7.4 2.6 M19.2 10.8 C22.6 9.4 26.4 6.6 24.4 2.4"/><path d="M11 13.4 L6.4 14.8 L11 15.8 M21 13.4 L25.6 14.8 L21 15.8"/><path d="M16 26 L15 30.4 L17.2 28.4"/></g>`
    + `<g ${SA} stroke-width="1.2"><path d="M12.4 8.8 C14.8 10 17.2 10 19.6 8.8 M16 9.7 L14.9 12 M16 9.7 L17.3 12"/></g>`
    + '<circle cx="16" cy="9.7" r="1.1" fill="currentColor"/><circle cx="13.8" cy="16.2" r=".95" fill="currentColor"/><circle cx="18.2" cy="16.2" r=".95" fill="currentColor"/>',
  // 12 · capuchon en cloche, un œil ouvert, un œil fermé
  petiteFille: '<path d="M16 3 C8.5 3 5.5 10 5.5 18 C5.5 24 4.5 27 3.5 29.5 H28.5 C27.5 27 26.5 24 26.5 18 C26.5 10 23.5 3 16 3 Z" fill="url(#hach-2-e)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
    + `<ellipse cx="16" cy="17.4" rx="6" ry="7" fill="${BRU}" stroke="currentColor" stroke-width="1.5"/>`
    + '<circle cx="13.6" cy="16.6" r="1.15" fill="currentColor"/><path d="M17.2 16.8 Q18.6 17.8 20 16.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  // 13 · le loup inversé : tête en réserve, mordu des deux côtés
  loupBlanc: `<path fill="${BRU}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 3.5 L14.2 2.6 L15.4 4.2 L18 3.4 L19.2 5.4 L22 5.8 L22.6 8.4 L24.6 9.6 L24.8 12.6 L27.6 16.4 L25.4 17.6 L25.8 20.2 L24.2 21.2 C24.4 24 23 25.6 20.2 25.6 L19.6 29 L10.5 29 L11.2 26.8 L8.6 26.2 L9.8 24.1 L6.6 23 L8.9 21.3 L5.8 19.2 L8.6 17.6 L5.4 14.9 L8.4 13.4 L6.2 10.6 L9 9.6 L7.9 6.4 L10.6 6.1 Z"/>`
    + '<path fill="currentColor" d="M16.8 11.1 L23.8 11.9 L17 13.1 Z"/><circle cx="4.1" cy="22.6" r=".8" fill="currentColor"/>',
};

const ROLES = {
  villageois: ['Villageois·e', 'Pas de pouvoir. Votre arme, c’est votre voix au vote du jour — et votre flair.', 'Le jour, au vote.', 'village'],
  loup: ['Loup-garou', 'Chaque nuit, la meute dévore un habitant. Le jour, vous vous tenez sur la place comme les autres.', 'La nuit, avec la meute.', 'meute'],
  voyante: ['la Voyante', 'Chaque nuit, sondez un vivant : son rôle s’inscrit dans votre carnet, nuit après nuit.', 'La nuit.', 'village'],
  sorciere: ['la Sorcière', 'Deux potions, une seule fois chacune : la vie pour la victime des loups, la mort pour qui vous voulez.', 'La nuit, après la meute.', 'village'],
  chasseur: ['le Chasseur', '', '', 'village'],
  cupidon: ['Cupidon', '', '', 'village'],
  salvateur: ['le Salvateur', '', '', 'village'],
  idiot: ['l’Idiot du village', '', '', 'village'],
  ancien: ['l’Ancien', '', '', 'village'],
  corbeau: ['le Corbeau', '', '', 'village'],
  bouc: ['le Bouc émissaire', '', '', 'village'],
  petiteFille: ['la Petite Fille', '', '', 'village'],
  loupBlanc: ['le Loup Blanc', '', '', 'meute'],
};
const SPECIAUX = ['voyante', 'sorciere', 'chasseur', 'cupidon', 'salvateur', 'idiot'];
const OPTIONNELS = ['ancien', 'corbeau', 'bouc', 'petiteFille', 'loupBlanc'];

// ---------------------------------------------------------- couvre-chefs (§ 5.1.2)
const BODY = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48 Z" fill="${BRU}"/>`
  + `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48 Z" fill="url(#hach-2-e)" stroke="${B9}" stroke-width="1"/>`;
const HEAD = `<circle cx="24" cy="22" r="8" fill="${BRU}"/><circle cx="24" cy="22" r="8" fill="url(#hach-1-e)" stroke="${B9}" stroke-width="1"/>`;
const HATS = {
  tricorne: `<path d="M10 16 L24 9 L38 16 L33 18 C28 15 20 15 15 18 Z" fill="${B9}"/>`,
  mantille: `<path d="M17.5 15 C17 9 19 4 24 2.4 C29 4 31 9 30.5 15 C28 13.6 20 13.6 17.5 15 Z" fill="${B9}"/>`
    + `<path d="M20 12.6 L19.6 6.4 M22.6 12.2 L22.6 4.2 M25.4 12.2 L25.6 4.2 M28 12.6 L28.6 6.4" stroke="${BRU}" stroke-width=".8"/>`
    + `<path d="M16.2 16 C13.6 22 13 28 9.6 35 C13.8 34 16 32.6 17 30.4 C16.8 25 17 20.4 18.6 17 Z M31.8 16 C34.4 22 35.2 28 38.6 35 C34.2 34 32 32.6 31 30.4 C31.2 25 31 20.4 29.4 17 Z" fill="${B9}"/>`,
  bonnet: `<path d="M15.6 19 C15 11 20 6.4 27 7.4 C33 8.4 37.6 13 38.6 21 L36 21.6 C35 16 32 13 29 12.5 C31.6 15 32.6 17 32.6 19 Z" fill="${B9}"/><circle cx="37.3" cy="24" r="2.6" fill="${B9}"/>`,
  coroza: `<path d="M17 16 L24 0 L31 16 Z" fill="${B9}"/><path d="M19.4 11 H28.6" stroke="${BRU}" stroke-width=".8"/>`,
  chambergo: `<path d="M17 15.6 C17 9.6 31 9.6 31 15.6 Z" fill="${B9}"/><ellipse cx="24" cy="15.6" rx="20" ry="3.2" fill="${B9}"/><path d="M17.8 13.6 H30.2" stroke="${BRU}" stroke-width=".8"/>`,
  montera: `<path d="M14.5 17 C13.5 12 17.5 9.5 21 11.5 C21.5 7 26.5 7 27 11.5 C30.5 9.5 34.5 12 33.5 17 C27 15 21 15 14.5 17 Z" fill="${B9}"/><circle cx="14.4" cy="19.4" r="3.1" fill="${B9}"/><circle cx="33.6" cy="19.4" r="3.1" fill="${B9}"/>`,
  cofia: `<path d="M15.5 21 C15 10.6 33 10.6 32.5 21 A1.5 1.5 0 0 1 29.67 21 A1.5 1.5 0 0 1 26.83 21 A1.5 1.5 0 0 1 24 21 A1.5 1.5 0 0 1 21.17 21 A1.5 1.5 0 0 1 18.33 21 A1.5 1.5 0 0 1 15.5 21 Z" fill="${B9}"/>`
    + `<path d="M17 18.4 C20 17.4 28 17.4 31 18.4" fill="none" stroke="${BRU}" stroke-width=".8" stroke-dasharray="1.2 1.4"/>`,
  bicorne: `<path d="M7 16 C10 5 38 5 41 16 C33 12.4 15 12.4 7 16 Z" fill="${B9}"/><circle cx="24" cy="9.4" r="1.6" fill="none" stroke="${BRU}" stroke-width=".8"/>`,
  turban: `<path d="M14.5 18.5 C12 13 14 6.5 24 6.5 C34 6.5 36 13 33.5 18.5 C28 16.5 20 16.5 14.5 18.5 Z" fill="${B9}"/><path d="M16 15.6 C20 11 29 10.6 32.6 14.2 M17.6 11.4 C21 8.4 28 8.4 31 11.2" fill="none" stroke="${BRU}" stroke-width="1"/>`,
  boina: `<path d="M14.5 16 C14 11.5 22 9 31 10 C37 10.6 40.5 13 39 15 C35 16.5 22 16.5 14.5 16 Z" fill="${B9}"/><path d="M25 9.8 L25.7 7.2" stroke="${B9}" stroke-width="1.5"/>`,
  catogan: `<path d="M15.5 21 C15 12 33 12 32.5 21 C30 17.5 18 17.5 15.5 21 Z" fill="${B9}"/>`
    + `<g fill="${BRU}" stroke="${B9}" stroke-width="1.5"><ellipse cx="14.8" cy="21.6" rx="2.4" ry="1.7"/><ellipse cx="14.8" cy="25.2" rx="2.4" ry="1.7"/><ellipse cx="33.2" cy="21.6" rx="2.4" ry="1.7"/><ellipse cx="33.2" cy="25.2" rx="2.4" ry="1.7"/></g>`
    + `<path d="M24 31.4 L19 28.4 V34.4 Z M24 31.4 L29 28.4 V34.4 Z" fill="${B9}"/>`,
  hautdeforme: `<path d="M18.5 15 L16.4 1.4 H31.6 L29.5 15 Z" fill="${B9}"/><rect x="13.6" y="13.8" width="20.8" height="2.6" fill="${B9}"/><path d="M17.8 11.4 H30.2" stroke="${BRU}" stroke-width="1"/>`,
};
function busteSymbol(key) {
  if (key === 'capuche') {
    const hood = `<path d="M10.5 40 C10.5 25 15 12 24 2.6 C33 12 37.5 25 37.5 40 Z" fill="${B9}"/>`;
    const face = `<circle cx="24" cy="23" r="7.4" fill="${BRU}"/><circle cx="24" cy="23" r="7.4" fill="url(#hach-1-e)" stroke="${B9}" stroke-width="1"/>`;
    return `<symbol id="cc-capuche" viewBox="0 0 48 48">${BODY}${hood}${face}</symbol>`;
  }
  return `<symbol id="cc-${key}" viewBox="0 0 48 48">${BODY}${HEAD}${HATS[key]}</symbol>`;
}
const CC_KEYS = [...Object.keys(HATS), 'capuche'];

// ---------------------------------------------------------------- icônes (24, burin)
const I = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
function molette() {
  let spokes = '', knobs = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 + 15) * Math.PI / 180;
    spokes += `M${g(12 + 1.9 * Math.cos(a))} ${g(12 + 1.9 * Math.sin(a))} L${g(12 + 9.4 * Math.cos(a))} ${g(12 + 9.4 * Math.sin(a))} `;
    knobs += `<circle cx="${g(12 + 10.3 * Math.cos(a))}" cy="${g(12 + 10.3 * Math.sin(a))}" r="1.1" fill="currentColor"/>`;
  }
  return `<circle cx="12" cy="12" r="6.2" ${I}/><circle cx="12" cy="12" r="1.9" ${I}/><path d="${spokes.trim()}" ${I}/>${knobs}`;
}
const ICONS = {
  'ic-retour': `<path d="M13.5 5 L6.5 12 L13.5 19" ${I}/><path d="M7.5 12 H19.5" ${I}/>`,
  'ic-regles': `<path d="M3 6.2 C6 4.6 9 4.6 12 6.2 C15 4.6 18 4.6 21 6.2 V19.2 C18 17.6 15 17.6 12 19.2 C9 17.6 6 17.6 3 19.2 Z M12 6.2 V19.2" ${I}/><path d="M5.6 9.2 H9.6 M5.6 12 H9.6 M5.6 14.8 H8.6 M14.4 9.2 H18.4 M14.4 12 H18.4" fill="none" stroke="currentColor" stroke-width=".75" stroke-linecap="round"/>`,
  'ic-reglages': molette(),
  'ic-son': `<path d="M6.5 17.5 C6.5 11.5 8 7 12 7 C16 7 17.5 11.5 17.5 17.5 Z" ${I}/><path d="M4.5 17.5 H19.5 M12 7 V4.4" ${I}/><circle cx="12" cy="19.9" r="1.3" ${I}/><path d="M9 11 L8.4 15 M10.6 10 L10.2 15" fill="none" stroke="currentColor" stroke-width=".75" stroke-linecap="round"/>`,
  'ic-quitter': `<path d="M4.5 3.5 H14.5 V8.5 M14.5 15.5 V20.5 H4.5 Z" ${I}/><path d="M4.5 3.5 L10.2 5.4 V22 L4.5 20.5" ${I}/><path d="M12.6 12 H21 M18 9 L21 12 L18 15" ${I}/>`,
  'ic-moins': '<path d="M5 12.3 L19 11.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>',
  'ic-plus': '<path d="M5 12.2 L19 11.9 M12.1 5 L11.9 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>',
  'ic-carte': `<path d="M6 3.5 H15 L18.5 7 V20.5 H6 Z" ${I}/><path d="M15 3.5 V7 H18.5" ${I}/><path d="M8.4 9 L11.4 6 M8.4 12.4 L14.6 6.2 M8.4 15.8 L16.2 8 M9.6 18 L16.2 11.4 M13 18 L16.2 14.8" fill="none" stroke="currentColor" stroke-width=".75" stroke-linecap="round"/>`,
  'ic-menu': '<path d="M4 7 H20 M4 12 H17 M4 17 H19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  'ic-sablier': `<path d="M6.5 3.5 H17.5 M6.5 20.5 H17.5 M7.8 3.5 C7.8 9 16.2 9 16.2 12 C16.2 15 7.8 15 7.8 20.5 M16.2 3.5 C16.2 9 7.8 9 7.8 12 C7.8 15 16.2 15 16.2 20.5" ${I}/><path d="M9.4 18.6 L12 16.2 L14.6 18.6 Z" fill="currentColor"/>`,
  'ic-pate': '<path d="M7 2.6 C9.4 1.4 11.6 3 12.4 4.6 C14.6 4.8 15.2 7.4 13.8 8.8 C15 11 13 13.6 10.6 12.6 C9.2 14.6 6 14.2 5.4 12 C3 12.2 1.8 9.4 3.4 8 C2 5.8 4 3.4 6 4 Z" fill="currentColor"/><circle cx="14.6" cy="13.8" r="1" fill="currentColor"/><circle cx="1.8" cy="13.2" r=".7" fill="currentColor"/>',
};

function clips() {
  let out = '';
  for (const m of [40, 48, 56, 60, 72]) {
    const S = m + 16, c = S / 2, r = (m - 8) / 2;
    out += `<clipPath id="clip-m${m}"><circle cx="${g(c)}" cy="${g(c)}" r="${g(r)}"/></clipPath>`;
  }
  return out;
}

const EXTRA_DEFS = '<defs>' + clips()
  + CC_KEYS.map(busteSymbol).join('')
  + Object.entries(ROLE_SYM).map(([k, v]) => `<symbol id="r-${k}" viewBox="0 0 32 32">${v}</symbol>`).join('')
  + Object.entries(ICONS).map(([k, v]) => { const s = k === 'ic-pate' ? 16 : 24; return `<symbol id="${k}" viewBox="0 0 ${s} ${s}">${v}</symbol>`; }).join('')
  + '</defs>';

const DEFS_BLOCK = '<svg width="0" height="0" style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true" focusable="false">'
  + DEFS_TEX + EXTRA_DEFS + '</svg>';

// ------------------------------------------------------------ squelette
function grain(w, h, seed = 7) {
  const r = rng(seed + w);
  const n = w < 500 ? 7 : 16;
  let spots = '';
  for (let i = 0; i < n; i++) spots += `<circle cx="${r.uniform(12, w - 12).toFixed(0)}" cy="${r.uniform(12, h - 12).toFixed(0)}" r="${r.uniform(2, 9).toFixed(1)}" opacity="${r.uniform(.04, .08).toFixed(3)}"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0; pointer-events: none;">`
    + `<rect width="${w}" height="${h}" fill="#000" filter="url(#papier)" opacity="0.22"/><g fill="${ROU}">${spots}</g></svg>`;
}

function page(title, w, h, body) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
${FONT_LINK}
<style>
body{margin:0}
a{color:#666}a:hover{color:#333}
</style>
</helmet>
<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; position: relative; overflow: hidden; ${PAPER_BG} font-family: ${SER}; color: ${B9};">
<!-- les <defs> de textures.svg, collées telles quelles ; puis celles du lot E1a (couvre-chefs, symboles, icônes) -->
${DEFS_BLOCK}
${grain(w, h)}
${body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;
}

function statusbar() {
  let sig = '';
  for (let i = 0; i < 4; i++) sig += `<rect x="${i * 5}" y="${10 - (4 + 2 * i)}" width="3" height="${4 + 2 * i}" fill="${B9}"/>`;
  const wifi = `<path d="M28 4.2 C31.4 1.2 36.6 1.2 40 4.2 M30 6.4 C32.4 4.4 35.6 4.4 38 6.4" fill="none" stroke="${B9}" stroke-width="1.4" stroke-linecap="round"/><circle cx="34" cy="8.8" r="1.3" fill="${B9}"/>`;
  const batt = `<rect x="45.5" y=".5" width="20" height="10" fill="none" stroke="${B9}" stroke-width="1"/><rect x="47.5" y="2.5" width="13" height="6" fill="${B9}"/><rect x="66.5" y="3.5" width="1.5" height="4" fill="${B9}"/>`;
  return `<div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 47px; background: ${VER}; display: flex; align-items: center; justify-content: space-between; padding: 4px 28px 0 34px; box-sizing: border-box;">`
    + `<span style="font-family: ${SER}; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums;">9:41</span>`
    + `<svg width="69" height="11" viewBox="0 0 69 11">${sig}${wifi}${batt}</svg></div>`;
}

function home() {
  return `<div aria-hidden="true" style="position: absolute; left: 0; top: 810px; width: 390px; height: 34px; background: ${BRU}; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px; box-sizing: border-box;">`
    + `<div style="width: 134px; height: 5px; background: ${B9};"></div></div>`;
}

// ---------------------------------------------------------------- la frise (§ 5.7)
function roofline(W, H, clocher, potence, lit = [], seed = 5, band = 18) {
  const r = rng(seed);
  const out = [];
  const wins = [];
  let x = -6;
  while (x < W) {
    const w = r.choice([20, 24, 26, 30, 34]);
    const eave = H - r.uniform(7.5, 10.5);
    const peak = Math.max(H - band, eave - r.uniform(5, 7.5));
    const d = `M${g(x)} ${H} V${g(eave)} L${g(x + w / 2)} ${g(peak)} L${g(x + w)} ${g(eave)} V${H} Z`;
    out.push(`<path d="${d}" fill="${VER}"/><path d="${d}" fill="url(#hach-2-e)" stroke="${B9}" stroke-width="1"/>`);
    wins.push([x + w / 2, eave]);
    x += w - 1;
  }
  const litSet = new Set();
  for (const lx of lit) {
    let best = 0;
    wins.forEach((wv, i) => { if (Math.abs(wv[0] - lx) < Math.abs(wins[best][0] - lx)) best = i; });
    litSet.add(best);
  }
  wins.forEach(([cx, eave], i) => {
    if (litSet.has(i)) out.push(`<rect x="${g(cx - 2)}" y="${g(eave + 1.6)}" width="4" height="5" fill="${BRU}" stroke="${B9}" stroke-width=".7"/><path d="M${g(cx)} ${g(eave + 1.6)} V${g(eave + 6.6)}" stroke="${B9}" stroke-width=".5"/>`);
    else out.push(`<rect x="${g(cx - 1.6)}" y="${g(eave + 2)}" width="3.2" height="4.2" fill="${B9}"/>`);
  });
  if (clocher != null) {
    const cx = clocher, t = H - 30;
    out.push(`<path d="M${g(cx - 6)} ${H} V${t} H${g(cx + 6)} V${H} Z" fill="${VER}"/><path d="M${g(cx - 6)} ${H} V${t} H${g(cx + 6)} V${H} Z" fill="url(#hach-1-e)" stroke="${B9}" stroke-width="1"/>`
      + `<path d="M${g(cx - 7.5)} ${t} L${g(cx)} ${t - 11} L${g(cx + 7.5)} ${t} Z" fill="url(#hach-3-e)" stroke="${B9}" stroke-width="1"/>`
      + `<path d="M${g(cx)} ${t - 11} V${t - 15} M${g(cx - 2)} ${t - 13.5} H${g(cx + 2)}" stroke="${B9}" stroke-width="1"/>`
      + `<path d="M${g(cx - 2.2)} ${t + 9} V${t + 5} A2.2 2.2 0 0 1 ${g(cx + 2.2)} ${t + 5} V${t + 9} Z" fill="${B9}"/>`);
  }
  if (potence != null) {
    const px = potence;
    out.push(`<path d="M${g(px)} ${H} V${H - 34} H${g(px + 17)} M${g(px)} ${H - 26} L${g(px + 8)} ${H - 34} M${g(px + 15)} ${H - 34} V${H - 26}" fill="none" stroke="${B9}" stroke-width="2.2"/>`
      + `<circle cx="${g(px + 15)}" cy="${H - 23}" r="3" fill="none" stroke="${B9}" stroke-width="1.1"/>`
      + `<path d="M${g(px - 5)} ${H} H${g(px + 5)}" stroke="${B9}" stroke-width="2.2"/>`);
  }
  return out.join('');
}

function frise({ W = 390, H = 56, top = 47, left = '', right = '', clocher = null, potence = null, lit = [], seed = 5, pad = 16 } = {}) {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position: absolute; left: 0; top: 0;">`
    + `<rect width="${W}" height="${H}" fill="${VER}"/><rect width="${W}" height="${H}" fill="url(#hach-h-e)" opacity=".28"/>`
    + roofline(W, H, clocher, potence, lit, seed)
    + `<line x1="0" y1="${H - .75}" x2="${W}" y2="${H - .75}" stroke="${B9}" stroke-width="1.5"/></svg>`;
  const by = (H - 44) / 2 - (H === 56 ? 3 : 2);
  return `<header style="position: absolute; left: 0; top: ${top}px; width: ${W}px; height: ${H}px;">${svg}`
    + `<div style="position: absolute; left: 0; top: ${g(by)}px; width: ${W}px; height: 44px; padding: 0 ${pad}px; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;">`
    + `<div style="display: flex; gap: 8px; align-items: center;">${left}</div><div style="display: flex; gap: 8px; align-items: center;">${right}</div></div></header>`;
}

function outil(icon, label, texte = null) {
  if (texte) {
    return `<button type="button" style="height: 44px; padding: 0 14px 0 10px; display: flex; align-items: center; gap: 8px; background: ${BRU}; border: 1px solid ${P2}; border-radius: 0; color: ${B9}; font-family: ${SER}; font-size: 16px; line-height: 20px;">`
      + `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="#${icon}"/></svg>${texte}</button>`;
  }
  return `<button type="button" aria-label="${label}" style="width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; background: ${BRU}; border: 1px solid ${P2}; border-radius: 0; color: ${B9};">`
    + `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="#${icon}"/></svg></button>`;
}
const lienArcade = () => outil('ic-retour', 'Retour à l’arcade');
function cartoucheHeure(text, size = 20) {
  return `<div style="height: 44px; display: flex; align-items: center; padding: 0 12px; background: ${BRU}; border: 1px solid ${P2}; box-sizing: border-box; `
    + `font-family: ${FSC}; font-size: ${size}px; line-height: 24px; letter-spacing: .04em; color: ${B9}; white-space: nowrap;">${text}</div>`;
}
const SALON_DROITE = outil('ic-regles', 'Règles') + outil('ic-reglages', 'Réglages') + outil('ic-son', 'Son : couper') + outil('ic-quitter', 'Quitter la table');

// ---------------------------------------------------------------- boutons (§ 5.4)
function bp(label, { w = null, extra = '' } = {}) {
  const ws = w ? `width: ${w}px; flex: none;` : 'width: 100%;';
  return `<button type="button" style="${ws} height: 48px; padding: 0 16px; background: ${B9}; color: ${BRU}; border: 1.5px solid ${B9}; border-radius: 0; `
    + `font-family: ${SER}; font-size: 17px; line-height: 20px; font-weight: 600;${extra}">${label}</button>`;
}
function bs(label, { w = null, h = 48, extra = '', size = 17 } = {}) {
  const ws = w ? `width: ${w}px; flex: none;` : 'width: 100%;';
  return `<button type="button" style="${ws} height: ${h}px; padding: 0 14px; background: transparent; color: ${B9}; border: 1.5px solid ${B9}; border-radius: 0; `
    + `font-family: ${SER}; font-size: ${size}px; line-height: 20px; font-weight: 400;${extra}">${label}</button>`;
}
function boff(label, rid, raison) {
  return `<button type="button" disabled aria-disabled="true" aria-describedby="${rid}" style="width: 100%; height: 48px; padding: 0 16px; background: transparent; color: ${DEL}; `
    + `border: 1.5px dashed ${P2}; border-radius: 0; font-family: ${SER}; font-size: 17px; line-height: 20px; font-weight: 600;">${label}</button>`
    + `<p id="${rid}" style="margin: 0; font-size: 12px; line-height: 16px; color: ${DEL}; text-align: center;">${raison}</p>`;
}
function bdisc(label) {
  return `<button type="button" style="height: 44px; padding: 0 4px; background: transparent; border: 0; border-radius: 0; color: ${B9}; font-family: ${SER}; font-size: 16px; line-height: 20px; `
    + `text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px;">${label}</button>`;
}
function barre(inner, { top = 738, h = 72, direction = 'column', W = 390 } = {}) {
  return `<div style="position: absolute; left: 0; top: ${top}px; width: ${W}px; height: ${h}px; box-sizing: border-box; padding: 12px 16px; background: ${BRU}; `
    + `border-top: 1.5px solid ${B9}; display: flex; flex-direction: ${direction}; gap: ${direction === 'column' ? '4px' : '8px'}; align-items: stretch;">${inner}</div>`;
}

// ---------------------------------------------------------------- textes
const rub = (text, extra = '') => `<div style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${DEL};${extra}">${text}</div>`;
const legende = (text, size = 18, lh = 24, extra = '') => `<p style="margin: 0; font-family: ${FELL}; font-style: italic; font-size: ${size}px; line-height: ${lh}px; color: ${DEL}; text-align: center;${extra}">«${NB}${text}${NB}»</p>`;
const statut = (text, extra = '') => `<p style="margin: 0; font-size: 12px; line-height: 16px; color: ${DEL};${extra}">${text}</p>`;
const absDiv = (x, y, w, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px;${extra}">${inner}</div>`;
const rubRow = (titre, aside, { x = 16, y = 0, w = 358 } = {}) => absDiv(x, y, w, `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">${rub(titre)}`
  + `<span style="font-size: 12px; line-height: 16px; color: ${DEL}; text-align: right;">${aside}</span></div>`);

// ---------------------------------------------------------------- jeton (§ 5.1)
function jeton(nom, cc, m, { moi = false, st = '', fort = false, absent = false, libre = false, cw = 68, nomPx = 14, nomLh = 16, stPx = 12, aria = null } = {}) {
  const S = m + 16, c = S / 2, R = m / 2, r = (m - 8) / 2, s = .75 * m;
  const p = [];
  if (libre) {
    p.push(`<circle cx="${g(c)}" cy="${g(c)}" r="${g(R)}" fill="none" stroke="${DEL}" stroke-width="1.4" stroke-dasharray="3 3"/>`);
  } else {
    if (moi) {
      const side = m + 14, x0 = c - side / 2;
      p.push(`<rect x="${g(x0)}" y="${g(x0)}" width="${g(side)}" height="${g(side)}" fill="none" stroke="${B9}" stroke-width="1.5"/>`
        + `<rect x="${g(x0 + 2.75)}" y="${g(x0 + 2.75)}" width="${g(side - 5.5)}" height="${g(side - 5.5)}" fill="none" stroke="${B9}" stroke-width=".75"/>`);
    }
    p.push(`<circle cx="${g(c)}" cy="${g(c)}" r="${g(R)}" fill="${BRU}" stroke="${B9}" stroke-width="1.5"/>`);
    if (absent) {
      const gs = .36 * m;
      p.push(`<circle cx="${g(c)}" cy="${g(c)}" r="${g(r)}" fill="url(#hach-x-e)" stroke="${B9}" stroke-width=".75"/>`
        + `<rect x="${g(c - gs / 2 - 2)}" y="${g(c - gs / 2 - 2)}" width="${g(gs + 4)}" height="${g(gs + 4)}" fill="${BRU}"/>`
        + `<use href="#g-chaise" x="${g(c - gs / 2)}" y="${g(c - gs / 2)}" width="${g(gs)}" height="${g(gs)}"/>`);
    } else {
      p.push(`<circle cx="${g(c)}" cy="${g(c)}" r="${g(r)}" fill="url(#hach-1-e)" stroke="${B9}" stroke-width=".75"/>`
        + `<g clip-path="url(#clip-m${m})"><use href="#cc-${cc}" x="${g(c - s / 2)}" y="${g(c - s * 22 / 48)}" width="${g(s)}" height="${g(s)}"/></g>`);
    }
  }
  const col = libre ? DEL : B9;
  const wt = moi ? 700 : (libre ? 400 : 600);
  const nomHtml = `<span style="display: block; max-width: ${cw}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${nomPx}px; line-height: ${nomLh}px; `
    + `font-weight: ${wt}; color: ${col}; text-align: center;">${nom}</span>`;
  const stHtml = `<span style="display: block; height: 16px; font-size: ${stPx}px; line-height: 16px; color: ${fort ? B9 : DEL}; font-weight: ${fort ? 600 : 400}; text-align: center; white-space: nowrap;">${st}</span>`;
  const al = aria || (st ? `${nom}, ${st}` : nom);
  return `<div role="listitem" aria-label="${al}" style="width: ${cw}px; display: flex; flex-direction: column; align-items: center;">`
    + `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" aria-hidden="true" style="display: block; margin: -4px 0; overflow: visible;">${p.join('')}</svg>`
    + nomHtml + stHtml + '</div>';
}

const TEMOIN = [
  ['Anna', 'tricorne'], ['Bastien', 'mantille'], ['Clément', 'bonnet'], ['Delphine', 'coroza'],
  ['Étienne', 'chambergo'], ['Fanny', 'montera'], ['Gaspard', 'capuche'], ['Hélène', 'cofia'],
  ['Inès', 'bicorne'], ['Jules', 'turban'], ['Tom', 'boina'], ['Léa', 'catogan'], ['Malo', 'hautdeforme'],
];

// ---------------------------------------------------------------- case gravée (§ 5.17)
function caseSvg(checked, off = false) {
  const stroke = off ? P2 : B9;
  const dash = off ? ' stroke-dasharray="3 2"' : '';
  const fill = off ? 'none' : BRU;
  const cross = checked ? `<path d="M6.2 6 L17.8 18.1 M17.9 6.1 L6.1 17.9" stroke="${stroke}" stroke-width="2" stroke-linecap="square"/>` : '';
  return `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style="flex: none; display: block;">`
    + `<rect x=".75" y=".75" width="22.5" height="22.5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${dash}/>${cross}</svg>`;
}
function caseRow(label, checked, hint = null, { off = false, clamp = false, minh = 44, sep = true, hintId = null } = {}) {
  const mot = checked ? 'oui' : 'non';
  const labCol = off ? DEL : B9;
  let hintHtml = '';
  if (hint) {
    const cl = clamp ? 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' : '';
    hintHtml = `<span${hintId ? ` id="${hintId}"` : ''} style="display: block; font-size: 12px; line-height: 16px; color: ${DEL}; ${cl}">${hint}</span>`;
  }
  const attrs = off ? ' disabled aria-disabled="true"' : '';
  const bt = sep ? `border-top: .75px solid ${P2};` : '';
  const desc = hintId ? ` aria-describedby="${hintId}"` : '';
  return `<button type="button" role="checkbox" aria-checked="${checked}"${attrs}${desc} style="width: 100%; min-height: ${minh}px; display: flex; align-items: flex-start; gap: 12px; `
    + `padding: 6px 0; background: transparent; border: 0; ${bt} border-radius: 0; text-align: left; color: ${B9}; font-family: ${SER};">`
    + `<span style="flex: none;">${caseSvg(checked, off)}</span>`
    + `<span style="flex: 1; min-width: 0; display: block;"><span style="display: block; font-size: 15px; line-height: 20px; font-weight: 600; color: ${labCol};">${label}</span>${hintHtml}</span>`
    + `<span style="flex: none; font-size: 12px; line-height: 20px; color: ${DEL};">${mot}</span></button>`;
}

function stepper(valeur, label, { w = 175, vw = null, unite = '5 secondes' } = {}) {
  vw = vw ?? (w - 96);
  const btn = (icon, sens) => `<button type="button" aria-label="${label} : ${sens} ${unite}" style="width: 48px; height: 48px; flex: none; padding: 0; display: flex; align-items: center; justify-content: center; background: transparent; border: 1.5px solid ${B9}; border-radius: 0; color: ${B9};"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="#${icon}"/></svg></button>`;
  return `<div role="group" aria-label="${label}" style="display: flex; width: ${w}px;">${btn('ic-moins', 'moins')}`
    + `<output style="width: ${vw}px; height: 48px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: ${TEI}; border-bottom: 1.5px solid ${B9}; `
    + `font-size: 20px; line-height: 24px; font-weight: 600; font-variant-numeric: tabular-nums lining-nums;">${valeur}</output>${btn('ic-plus', 'plus')}</div>`;
}

function sym(role, size, color = null) {
  const col = color || (ROLES[role][3] === 'meute' ? SAN : 'currentColor');
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" style="display: block; flex: none; color: ${col};"><use href="#r-${role}"/></svg>`;
}

// ---------------------------------------------------------------- étapes de l’hôte
function etapes(active, faites = []) {
  const items = [['table', 'La table'], ['donne', 'La donne'], ['regles', 'Les règles']];
  let html = '';
  for (const [key, lab] of items) {
    const on = key === active;
    const sceau = faites.includes(key) && !on;
    const mark = sceau ? '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="flex: none;"><use href="#g-sceau"/></svg>' : '';
    html += `<button type="button"${on ? ' aria-current="step"' : ''} style="flex: 1; height: 44px; padding: 0 6px; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${on ? B9 : 'transparent'}; `
      + `color: ${on ? BRU : B9}; border: 1.5px solid ${B9}; border-radius: 0; font-family: ${SER}; font-size: 15px; line-height: 20px; font-weight: ${on ? 600 : 400};">${mark}${lab}</button>`;
  }
  return `<nav aria-label="Étapes du salon" style="position: absolute; left: 16px; top: 111px; width: 358px; display: flex; gap: 8px;">${html}</nav>`;
}

// ---------------------------------------------------------------- frontispice (Caprice 43)
const eye = (x, y, w, h) => `M${g(x - w)} ${g(y)} Q${g(x)} ${g(y - h * 2)} ${g(x + w)} ${g(y)} Q${g(x)} ${g(y + h * 1.6)} ${g(x - w)} ${g(y)} Z `;
function eyes(pairs) {
  let d = '';
  for (const [x, y, gap, w, tilt] of pairs) d += eye(x, y, w, w * .42) + eye(x + gap, y + tilt, w * .92, w * .4);
  return `<path d="${d.trim()}" fill="${VER}"/>`;
}
function dormeur() {
  // Le dormeur affalé sur son pupitre (Caprice 43), boîte 0 0 210 160, sans visage.
  const corps = 'M30 156 C27 130 33 108 52 95 C68 85 92 84 110 93 C118 97 124 102 127 106 L60 106 C52 118 48 136 50 156 Z';
  const bras = 'M78 107 C84 98 106 95 132 100 C142 102 148 105 149 107 Z';
  return `<path d="M24 92 V156 M20 92 H32" fill="none" stroke="${B9}" stroke-width="1.4"/>`
    + `<path d="${corps}" fill="${BRU}"/><path d="${corps}" fill="url(#hach-2-e)" stroke="${B9}" stroke-width="1.2"/>`
    + `<path d="M44 104 C50 96 62 91 74 90" fill="none" stroke="${B9}" stroke-width=".8"/>`
    + `<path d="M12 108 L30 99 H206 L188 108 Z" fill="${BRU}" stroke="${B9}" stroke-width="1.2"/>`
    + `<ellipse cx="118" cy="95" rx="15" ry="10.5" fill="${BRU}"/><ellipse cx="118" cy="95" rx="15" ry="10.5" fill="url(#hach-3-e)" stroke="${B9}" stroke-width="1.1"/>`
    + `<path d="${bras}" fill="${BRU}"/><path d="${bras}" fill="url(#hach-1-e)" stroke="${B9}" stroke-width="1.1"/>`
    + `<path d="M96 104 C104 100 116 99 128 101" fill="none" stroke="${B9}" stroke-width=".8"/>`
    + `<rect x="12" y="108" width="176" height="44" fill="url(#hach-1-e)" stroke="${B9}" stroke-width="1.2"/>`
    + `<rect x="22" y="115" width="156" height="30" fill="${BRU}" stroke="${B9}" stroke-width=".75"/>`
    + `<rect x="25" y="118" width="150" height="24" fill="none" stroke="${B9}" stroke-width=".5"/>`
    + `<path d="M188 108 L206 99 V143 L188 152 Z" fill="url(#hach-x-e)" stroke="${B9}" stroke-width="1.2"/>`
    + `<path d="M150 104.5 L160 100.5 H182 L172 104.5 Z" fill="${BRU}" stroke="${B9}" stroke-width=".8"/>`
    + `<path d="M164 103 L186 80 M186 80 C181 81 177 85 175 90 M186 80 C185 85 181 89 177 92" fill="none" stroke="${B9}" stroke-width="1"/>`;
}
function frontispiceMobile() {
  const nuit = 'M104 0 H358 V128 C338 136 320 120 298 127 C276 134 256 118 234 123 C214 128 200 112 190 98 C180 84 166 78 154 62 C140 44 124 36 114 22 C108 14 105 7 104 0 Z';
  const lisiere = 'M86 0 H358 V146 C336 152 318 136 296 143 C272 151 252 134 230 139 C210 144 194 126 184 110 C174 94 158 88 146 72 C132 54 114 46 102 30 C94 20 88 10 86 0 Z';
  const yx = eyes([[158, 26, 11, 3.6, .6], [202, 14, 12, 4.2, -.8], [244, 44, 11, 3.8, 1.1], [290, 22, 13, 4.6, -.4],
    [328, 52, 12, 4, .9], [304, 96, 11, 3.6, -.6], [258, 86, 10, 3.2, .4], [212, 66, 9.5, 3.2, -1],
    [334, 12, 10, 3.4, .3], [184, 46, 9, 2.8, .7], [276, 112, 9, 2.6, -.3]]);
  return '<svg width="358" height="160" viewBox="0 0 358 160" role="img" aria-label="Frontispice d’après le Caprice 43 : un homme dort, affalé sur son pupitre ; derrière lui, dans le noir, des yeux s’ouvrent." style="display: block;">'
    + `<path d="${lisiere}" fill="url(#hach-2-e)"/>`
    + `<path d="${nuit}" fill="${B9}"/><path d="${nuit}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`
    + yx + dormeur() + '<rect x="0" y="152" width="358" height="8" fill="url(#hach-h-e)"/></svg>';
}
function frontispiceDesktop() {
  const nuit = 'M0 0 H640 V556 C612 568 590 544 560 552 C530 562 508 536 478 542 C450 548 430 526 414 504 C396 478 372 472 352 448 C330 422 300 416 280 388 C258 358 226 356 200 330 C172 302 138 300 110 276 C80 250 46 246 20 222 C10 214 4 206 0 196 Z';
  const lisiere = 'M0 0 H640 V588 C610 600 588 576 556 584 C524 594 500 566 470 572 C442 578 418 556 400 532 C380 504 356 498 334 474 C312 448 282 442 262 414 C240 384 208 382 182 356 C154 328 120 326 92 302 C62 276 30 272 0 246 Z';
  const yx = eyes([[70, 60, 16, 5.6, .8], [150, 120, 18, 6.2, -1], [238, 64, 17, 6, 1.2], [330, 140, 19, 6.6, -.6],
    [420, 70, 18, 6.2, .9], [520, 130, 20, 7, -1.1], [584, 46, 16, 5.4, .4], [470, 236, 18, 6, .8],
    [380, 300, 16, 5.6, -.7], [560, 330, 17, 6, .5], [278, 236, 15, 5, 1], [110, 196, 14, 4.8, -.5],
    [604, 440, 16, 5.6, -.9], [500, 420, 15, 5.2, .6], [198, 34, 13, 4.4, .3], [350, 26, 14, 4.6, -.4]]);
  return '<svg width="640" height="720" viewBox="0 0 640 720" role="img" aria-label="Frontispice d’après le Caprice 43 : un homme dort, affalé sur son pupitre ; au-dessus de lui, la nuit se peuple d’yeux." style="display: block;">'
    + `<path d="${lisiere}" fill="url(#hach-2-e)"/>`
    + `<path d="${nuit}" fill="${B9}"/><path d="${nuit}" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>`
    + yx + `<g transform="translate(24 440) scale(1.74)">${dormeur()}</g>`
    + '<rect x="0" y="704" width="640" height="16" fill="url(#hach-h-e)"/></svg>';
}

function cuvette(x, y, w, h, inner, extra = '') {
  return `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; border-radius: 2px; background: ${TEI}; `
    + `border-style: solid; border-color: rgba(23,19,15,.38) ${BRU} ${BRU} rgba(23,19,15,.38); border-width: 1px 1.5px 1.5px 1px; overflow: hidden;${extra}">`
    + `<div aria-hidden="true" style="position: absolute; inset: 2px; border: 1px solid rgba(23,19,15,.14); pointer-events: none;"></div>${inner}</div>`;
}

// ---------------------------------------------------------------- dos de boîte
const PITCH = 'Le village compte ses habitants, la meute compte les siens. Des cartes distribuées en secret, un fil pour se parler le jour, '
  + 'et des nuits où chacun ne voit que ce que son rôle lui permet de savoir : la Voyante sonde, la Sorcière hésite, les loups choisissent. '
  + 'Les skins changent l’habit, jamais les règles — à Thiercelieux on cherche des loups-garous, à Shiganshina des Titans, et la mécanique reste la même.';

function metaRow() {
  return '<div style="display: flex; align-items: center; gap: 10px;">'
    + `<span style="font-size: 12px; line-height: 16px; color: ${DEL}; font-variant-numeric: tabular-nums; letter-spacing: .04em;">TBP-012</span>`
    + `<span style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; padding: 1px 7px 2px; border: 1px solid ${B9}; background: ${BRU};">En chantier</span></div>`;
}
function champ(label, fid, { valeur = '', placeholder = '', w = 358 } = {}) {
  const attr = valeur ? `value="${valeur}"` : `placeholder="${placeholder}"`;
  return `<label for="${fid}" style="display: block; font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${DEL}; margin-bottom: 4px;">${label}</label>`
    + `<input id="${fid}" type="text" ${attr} autocomplete="nickname" maxlength="20" style="display: block; width: ${w}px; height: 48px; box-sizing: border-box; padding: 0 12px; `
    + `background: ${TEI}; border: 0; border-bottom: 1.5px solid ${B9}; border-radius: 0; font-family: ${SER}; font-size: 17px; line-height: 24px; color: ${valeur ? B9 : DEL};">`;
}
function codeCases(lettres, focus = false) {
  let cells = '';
  for (const l of lettres) {
    cells += `<span style="width: 56px; height: 64px; display: flex; align-items: center; justify-content: center; background: ${TEI}; border-bottom: 1.5px solid ${B9}; `
      + `font-size: 32px; line-height: 40px; font-weight: 600;">${l}</span>`;
  }
  const fo = focus ? ` outline: 2px solid ${B9}; outline-offset: 3px;` : '';
  return `<div role="textbox" aria-label="Code de la table, quatre lettres" style="display: flex; gap: 8px; width: max-content;${fo}">${cells}</div>`;
}

// ================================================================= ARTBOARDS MOBILES
function accueil() {
  const b = [];
  b.push(absDiv(16, 115, 358, metaRow()));
  b.push(absDiv(16, 141, 358, `<h1 style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 40px; line-height: 44px;">Garoutom</h1>`));
  b.push(absDiv(16, 189, 358, '<p style="margin: 0; font-size: 16px; line-height: 24px;">Loup-garou en ligne · 6 à 18 joueurs</p>'));
  b.push(cuvette(16, 225, 358, 160, frontispiceMobile()));
  b.push(absDiv(16, 393, 358, legende('Le sommeil de la raison engendre des loups.')));
  b.push(absDiv(16, 433, 358, champ('Votre pseudo', 'pseudo', { placeholder: 'Jean-Mi' })));
  b.push(absDiv(16, 509, 358, statut('Une partie se tient à six joueurs au moins.')));
  b.push(absDiv(16, 541, 358, `<div style="border-top: .75px solid ${P2}; padding-top: 12px;"><p style="margin: 0; font-size: 16px; line-height: 24px;">${PITCH}</p></div>`));
  b.push(barre(bp('Ouvrir une table') + '<div style="height: 4px;"></div>' + bs('Rejoindre une table'), { top: 682, h: 128 }));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: outil('ic-son', 'Son : couper'), clocher: 196, potence: 288, seed: 11 }));
  return page('E1 Accueil', 390, 844, b.join('\n'));
}

function clavier() {
  const rows = [[...'AZERTYUIOP'], [...'QSDFGHJKLM'], ['⇧', ...'WXCVBN', '’', '⌫']];
  let out = '', y = 8;
  rows.forEach((row) => {
    let x = 3;
    for (const k of row) {
      const sp = k === '⇧' || k === '⌫';
      const wk = sp ? 42 : 33;
      const fill = sp ? '#ABB0BA' : '#FCFCFE';
      out += `<rect x="${x}" y="${y + 1}" width="${wk}" height="42" rx="5" fill="#898A8D"/><rect x="${x}" y="${y}" width="${wk}" height="42" rx="5" fill="${fill}"/>`
        + `<text x="${x + wk / 2}" y="${y + 28}" text-anchor="middle" font-family="${SYS}" font-size="${/[A-Z]/.test(k) ? 20 : 17}" fill="#000">${k}</text>`;
      x += wk + (k === '⇧' ? 10 : 6);
    }
    y += 54;
  });
  const key = (x, w, fill, label) => `<rect x="${x}" y="${y + 1}" width="${w}" height="42" rx="5" fill="#898A8D"/><rect x="${x}" y="${y}" width="${w}" height="42" rx="5" fill="${fill}"/>`
    + `<text x="${x + w / 2}" y="${y + 27}" text-anchor="middle" font-family="${SYS}" font-size="16" fill="#000">${label}</text>`;
  out += key(3, 88, '#ABB0BA', '123') + key(97, 196, '#FCFCFE', 'espace') + key(299, 88, '#ABB0BA', 'OK');
  return '<!-- clavier du système (iOS) : hors habit, dessiné pour la place qu’il prend -->'
    + '<svg width="390" height="291" viewBox="0 0 390 291" aria-hidden="true" style="position: absolute; left: 0; top: 553px;">'
    + `<rect width="390" height="291" fill="#D1D3D9"/>${out}<rect x="128" y="278" width="134" height="5" fill="#000"/></svg>`;
}

function accueilRejoindre() {
  const b = [];
  // la page a défilé : le haut du frontispice passe sous la frise
  b.push(cuvette(16, 36, 358, 160, frontispiceMobile()));
  b.push(absDiv(16, 204, 358, legende('Le sommeil de la raison engendre des loups.')));
  b.push(absDiv(16, 245, 358, champ('Votre pseudo', 'pseudo', { valeur: 'Léa' })));
  b.push(absDiv(16, 329, 358, `<div style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${DEL}; margin-bottom: 4px;">Code de la table</div>` + codeCases([...'VRGT'], true)));
  const avis = `<div role="status" style="width: 358px; min-height: 44px; box-sizing: border-box; padding: 12px 16px; background: ${BRU}; border: 1px solid ${B9}; display: flex; align-items: center; gap: 10px;">`
    + `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="flex: none; color: ${B9};"><use href="#ic-pate"/></svg>`
    + '<span style="font-size: 14px; line-height: 20px;"><b style="font-weight: 600;">Refusé :</b> aucune table avec ce code.</span></div>';
  b.push(absDiv(16, 425, 358, avis));
  b.push(barre(bp('Rejoindre la table'), { top: 481, h: 72 }));
  b.push(clavier());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: outil('ic-son', 'Son : couper'), clocher: 196, potence: 288, seed: 11 }));
  return page('E1 Accueil — rejoindre', 390, 844, b.join('\n'));
}

function vignette(role, n = null) {
  const col = ROLES[role][3] === 'meute' ? SAN : B9;
  const num = n ? `<text x="23" y="59" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="14" font-weight="600" fill="${SAN}">×${n}</text>` : '';
  return `<svg width="46" height="64" viewBox="0 0 46 64" role="img" aria-label="${ROLES[role][0]}${n ? ` × ${n}` : ''}" style="display: block; flex: none;">`
    + `<rect x=".5" y=".5" width="45" height="63" fill="${BRU}" stroke="${P2}" stroke-width="1"/>`
    + `<rect x="4" y="4" width="38" height="56" fill="${TEI}"/><path d="M4 60 V4 H42" fill="none" stroke="${B9}" stroke-opacity=".38" stroke-width="1"/>`
    + `<path d="M42 4 V60 H4" fill="none" stroke="${BRU}" stroke-width="1.5"/>`
    + `<svg x="7" y="${n ? 8 : 16}" width="32" height="32" viewBox="0 0 32 32" style="color: ${col};"><use href="#r-${role}"/></svg>${num}</svg>`;
}

const MAISON = [
  ['Élire le capitaine', true, 'La table élit le capitaine : sa voix compte double au vote du village, et mort, il désigne son successeur.', false],
  ['Élection avant la première nuit', false, 'Par défaut l’élection a lieu au matin du premier jour. Ici, avant la nuit 1 : celui qui ne survivra pas à la nuit vote quand même.', false],
  ['Le Chasseur empoisonné tire', false, 'Par défaut, le Chasseur mort empoisonné ou de chagrin n’emporte personne. Ici, il tire quelle que soit sa mort.', false],
  ['La Sorcière peut se sauver', true, 'La Sorcière peut servir sa potion de vie sur elle-même quand la meute l’attaque. Désactivé, elle ne le peut pas.', false],
  ['Rancune de l’Ancien', true, 'Si l’Ancien meurt de la main du village — vote, tir ou poison —, tous les pouvoirs du village s’éteignent avec lui. Désactivé, il meurt sans se venger. Sans effet : l’Ancien n’est pas dans la composition — cochez-le parmi les rôles optionnels.', true],
  ['Le fil du village', true, 'Un fil de discussion écrit le jour. Sans lui, on parle à voix haute autour de la table — le canal secret de la meute, lui, existe toujours.', false],
  ['Rôles révélés des morts', true, 'La carte d’un mort se retourne devant tous. Sans cela, elle reste cachée — sauf deux que le jeu retourne de lui-même : le Chasseur au moment de tirer, et l’Idiot du village à sa grâce.', false],
  ['Les morts voient tout', true, 'Les morts connaissent les rôles de tous et lisent les canaux secrets : la partie est finie pour eux.', false],
  // option du moteur (GameOptions.abandon, R101) sans case dans Salon.tsx : libellé et indication à valider (à remonter)
  ['Mort d’abandon', true, 'Un vivant absent depuis cinq minutes meurt d’abandon à la clôture de la phase suivante. Désactivé, la table attend ses absents.', false],
];
const ANCIEN_COURT = 'Sans effet : l’Ancien n’est pas dans la composition — cochez-le parmi les rôles optionnels.';
const PHRASE_TEMOIN = '2 loups · la Voyante · la Sorcière · le Chasseur · Cupidon · le Salvateur · l’Idiot du village';

function salonJoueur() {
  const b = [];
  b.push(absDiv(16, 109, 358, `<h1 style="margin: 0; display: flex; align-items: baseline; gap: 12px;"><span style="font-family: ${FELL}; font-weight: 400; font-size: 28px; line-height: 32px;">La table</span>`
    + `<span style="font-family: ${SER}; font-size: 32px; line-height: 40px; font-weight: 600; letter-spacing: .24em;">VRGL</span></h1>`));
  b.push(absDiv(16, 153, 358, legende('Assis en rond, comme d’honnêtes gens.')));
  b.push(rubRow('Autour de la table', '13 joueurs · prêts à lancer', { y: 189 }));
  const cells = TEMOIN.map(([nom, cc]) => {
    let kw = {};
    if (nom === 'Léa') kw = { moi: true, st: 'vous' };
    else if (nom === 'Tom') kw = { st: 'hôte' };
    else if (nom === 'Malo') kw = { st: 'a rejoint', fort: true };
    else if (nom === 'Jules') kw = { absent: true, st: 'absent·e · 41 s' };
    return jeton(nom, cc, 48, { cw: 68, ...kw });
  }).join('');
  const libres = `<div role="listitem" style="grid-column: span 2; height: 80px; margin-top: 4px; box-sizing: border-box; border: 1.4px dashed ${DEL}; display: flex; align-items: center; justify-content: center; padding: 0 10px;">`
    + `<span style="font-size: 12px; line-height: 16px; color: ${DEL}; text-align: center;">5 places libres — la table accepte jusqu’à 18 joueurs.</span></div>`;
  b.push(absDiv(16, 213, 358, `<div role="list" aria-label="Autour de la table, 13 joueurs" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); column-gap: 4px; row-gap: 0;">${cells}${libres}</div>`));
  b.push(rubRow('La donne', 'publique : seules les cartes sont secrètes', { y: 489 }));
  const vigs = vignette('loup', 2) + SPECIAUX.map((r) => vignette(r)).join('');
  b.push(absDiv(16, 511, 358, `<div style="display: flex; justify-content: space-between;">${vigs}</div>`));
  b.push(absDiv(16, 583, 358, `<p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: 600;">${PHRASE_TEMOIN}</p>` + statut('les autres joueurs sont de simples Villageois·e.')));
  b.push(rubRow('Les règles de la table', 'réglées par l’hôte', { y: 651 }));
  const lect = MAISON.map(([l, c, , o]) => `<div style="display: flex; align-items: flex-start; gap: 8px; min-height: 28px;">${caseSvg(c, o)}<span style="flex: 1; font-size: 14px; line-height: 18px; color: ${o ? DEL : B9};">${l}</span></div>`).join('');
  b.push(absDiv(16, 673, 358, `<div aria-label="Les règles de la table, en lecture" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; row-gap: 6px;">${lect}</div>`));
  b.push(barre(boff('En attente de l’hôte', 'raison-attente', 'Tout est prêt — l’hôte peut lancer la partie.'), { top: 722, h: 88 }));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, lit: [120], seed: 21 }));
  return page('E1 Salon — vous = Léa', 390, 844, b.join('\n'));
}

function salonHoteTable() {
  const b = [etapes('table')];
  b.push(absDiv(16, 163, 358, rub('Code de la table')));
  b.push(absDiv(16, 183, 358, '<div style="display: flex; justify-content: space-between; align-items: center; height: 48px;">'
    + `<span style="font-size: 32px; line-height: 40px; font-weight: 600; letter-spacing: .24em;">VRGL</span>${bs('Copier le code', { w: 160, h: 44, size: 16 })}</div>`));
  b.push(absDiv(16, 239, 358, bs('Copier le lien d’invitation', { h: 44, size: 16 })));
  b.push(rubRow('Autour de la table', '5 joueurs · il en manque 1 pour lancer', { y: 297 }));
  const seats = [['Anna', 'tricorne', {}], ['Bastien', 'mantille', {}], ['Clément', 'bonnet', {}],
    ['Delphine', 'coroza', { st: 'a rejoint', fort: true }], ['Tom', 'boina', { moi: true, st: 'vous · hôte' }]];
  let cells = seats.map(([n, c, k]) => jeton(n, c, 72, { cw: 114, nomPx: 15, nomLh: 20, ...k })).join('');
  cells += jeton('6ᵉ place', null, 72, { cw: 114, nomPx: 15, nomLh: 20, libre: true, st: 'libre', aria: 'Sixième place, libre' });
  b.push(absDiv(16, 321, 358, `<div role="list" aria-label="Autour de la table, 5 joueurs" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 8px; row-gap: 8px;">${cells}</div>`));
  b.push(absDiv(16, 577, 358, statut('13 places libres — la table accepte jusqu’à 18 joueurs.', ' text-align: center;')));
  b.push(absDiv(16, 605, 358, legende('Assis en rond, comme d’honnêtes gens.')));
  b.push(absDiv(16, 645, 358, `<div style="display: flex; justify-content: center;">${bdisc('Quitter la table')}</div>`));
  b.push(barre(boff('Suivant : la donne', 'raison-suivant', 'Il manque 1 joueur'), { top: 722, h: 88 }));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, lit: [118], seed: 21 }));
  return page('E1 Salon hôte — la table — vous = Tom', 390, 844, b.join('\n'));
}

function carteRole(role, retenu, optionnel = false, w = 81, h = 84) {
  const nom = ROLES[role][0];
  const meute = ROLES[role][3] === 'meute';
  const bg = retenu ? B9 : 'transparent';
  const col = retenu ? BRU : (meute ? SAN : B9);
  const bd = retenu ? `1.5px solid ${B9}` : `1px solid ${P2}`;
  const tag = optionnel ? `<span style="font-size: 12px; line-height: 16px; color: ${retenu ? BRU : DEL};">optionnel</span>` : '<span style="height: 16px;"></span>';
  return `<button type="button" aria-pressed="${retenu}" style="width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 6px 6px 4px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; `
    + `background: ${bg}; border: ${bd}; border-radius: 0; text-align: left; font-family: ${SER}; color: ${col};">`
    + `${sym(role, 24, col)}<span style="display: block; height: 32px; font-size: 14px; line-height: 16px; font-weight: 600; color: ${col};">${nom}</span>${tag}</button>`;
}
function grilleRoles(retenus, { w = 81, h = 84, nbVill = 4, gap = 6 } = {}) {
  let cells = SPECIAUX.map((r) => carteRole(r, retenus.has(r), false, w, h)).join('')
    + OPTIONNELS.map((r) => carteRole(r, retenus.has(r), true, w, h)).join('');
  cells += `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 6px 6px 4px; background: ${TEI}; display: flex; flex-direction: column; gap: 2px;">`
    + `${sym('villageois', 24, B9)}<span style="font-size: 14px; line-height: 16px; font-weight: 600; height: 32px;">Villageois·e</span>`
    + `<span style="font-size: 12px; line-height: 16px; color: ${DEL};">× ${nbVill}, le reste</span></div>`;
  return `<div role="group" aria-label="Rôles de la donne" style="display: grid; grid-template-columns: repeat(4, ${w}px); gap: ${gap}px;">${cells}</div>`;
}

const SUGG = [
  ['La référence', 'L’équilibre du jeu, calculé pour cette table.', '3 loups · la Voyante · la Sorcière · le Chasseur · Cupidon · le Salvateur · l’Idiot du village'],
  ['La chasse', 'Un loup de plus : la meute a les dents longues.', '4 loups · la Voyante · la Sorcière · le Chasseur · Cupidon · le Salvateur · l’Idiot du village'],
];
function suggestion([nom, note, phrase], w = 175, h = 64) {
  return `<button type="button" role="radio" aria-checked="false" aria-label="${nom} : ${phrase}" style="width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 8px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 0; `
    + `background: transparent; border: 1px solid ${P2}; border-radius: 0; text-align: left; font-family: ${SER}; color: ${B9};">`
    + `<span style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${B9};">${nom}</span>`
    + `<span style="font-size: 12px; line-height: 16px; color: ${DEL};">${note}</span></button>`;
}
function loupsRow(w = 342) {
  return `<div style="display: flex; align-items: center; justify-content: space-between; width: ${w}px; height: 48px;">`
    + `<div style="display: flex; align-items: center; gap: 8px;">${sym('loup', 24)}<div><div style="font-size: 15px; line-height: 20px; font-weight: 600; color: ${SAN};">Loups</div>`
    + `<div style="font-size: 12px; line-height: 16px; color: ${DEL};">jamais autant que les autres</div></div></div>`
    + `${stepper('2', 'Nombre de loups', { w: 144, vw: 48, unite: 'un loup' })}</div>`;
}

function salonHoteComposition() {
  const b = [etapes('donne', ['table'])];
  b.push(absDiv(16, 163, 358, `<div style="display: flex; justify-content: space-between; align-items: center; height: 44px;">${rub('La donne')}`
    + `<button type="button" role="checkbox" aria-checked="false" style="height: 44px; display: flex; align-items: center; gap: 8px; padding: 0; background: transparent; border: 0; border-radius: 0; font-family: ${SER}; color: ${B9};">`
    + `${caseSvg(false)}<span style="font-size: 15px; line-height: 20px; font-weight: 600;">Composition automatique</span><span style="font-size: 12px; line-height: 16px; color: ${DEL};">non</span></button></div>`));
  b.push(absDiv(16, 209, 358, statut('publique pour toute la table — seules les cartes sont secrètes')));
  b.push(absDiv(16, 233, 358, `<div role="radiogroup" aria-label="Compositions suggérées" style="display: flex; gap: 8px;">${SUGG.map((s) => suggestion(s)).join('')}</div>`));
  b.push(absDiv(16, 305, 358, `<div style="display: flex; gap: 8px;">${bs('Au hasard', { w: 175, size: 16 })}${bs('Au hasard, rôles optionnels compris', { w: 175, size: 16, extra: ' line-height: 18px; padding: 0 8px;' })}</div>`));
  const encart = `<div style="box-sizing: border-box; width: 358px; padding: 8px; border: 1px solid ${P2}; display: flex; flex-direction: column; gap: 8px;">`
    + `${loupsRow()}${grilleRoles(new Set(SPECIAUX))}</div>`;
  b.push(absDiv(16, 365, 358, encart));
  const resume = '<div style="flex: 1; display: flex; flex-direction: column; justify-content: center; font-variant-numeric: tabular-nums lining-nums;">'
    + '<span style="font-size: 12px; line-height: 16px; font-weight: 600;">2 loups · 6 rôles</span><span style="font-size: 12px; line-height: 16px;">4 Villageois·e</span>'
    + `<span style="font-size: 12px; line-height: 16px; color: ${DEL};">pour 12 joueurs</span></div>`;
  b.push(barre(resume + bp('Suivant : les règles', { w: 196 }), { direction: 'row' }));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, seed: 21 }));
  return page('E1 Salon hôte — la donne — vous = Tom', 390, 844, b.join('\n'));
}

function miniUnivers(kind) {
  if (kind === 'thiercelieux') {
    const d = 'M0 32 V22 L6 17 L12 22 V20 L17 15 L22 20 V8 L25 4 L28 8 V32 Z';
    return `<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style="flex: none; display: block;"><rect width="32" height="32" fill="url(#hach-h-e)" opacity=".5"/>`
      + `<path d="${d}" fill="${BRU}" stroke="${B9}" stroke-width="1"/><path d="${d}" fill="url(#hach-2-e)"/><rect x="24" y="11" width="2" height="3" fill="${B9}"/></svg>`;
  }
  const d = 'M0 32 V14 H4 V11 H8 V14 H12 V11 H16 V14 H20 V11 H24 V14 H28 V11 H32 V32 Z';
  return `<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style="flex: none; display: block;"><rect width="32" height="32" fill="url(#hach-h-e)" opacity=".5"/>`
    + `<path d="${d}" fill="${BRU}" stroke="${B9}" stroke-width="1"/><path d="${d}" fill="url(#hach-x-e)"/><path d="M12 32 V24 A4 4 0 0 1 20 24 V32" fill="${B9}"/></svg>`;
}
function plancheUnivers(kind, nom, actif, { w = 175, h = 48, apercu = null } = {}) {
  const bd = actif ? `1.5px solid ${B9}` : `1px solid ${P2}`;
  const inner = actif ? `<span aria-hidden="true" style="position: absolute; inset: 2px; border: .75px solid ${B9};"></span>` : '';
  const ap = apercu ? `<span style="display: block; font-size: 12px; line-height: 16px; color: ${DEL};">${apercu}</span>` : '';
  return `<button type="button" role="radio" aria-checked="${actif}" style="position: relative; width: ${w}px; min-height: ${h}px; box-sizing: border-box; padding: 7px 8px; display: flex; align-items: center; gap: 8px; `
    + `background: ${actif ? BRU : 'transparent'}; border: ${bd}; border-radius: 0; text-align: left; font-family: ${SER}; color: ${B9};">${inner}${miniUnivers(kind)}`
    + `<span style="display: block;"><span style="display: block; font-size: 14px; line-height: 16px; font-weight: 600;">${nom}</span>${ap}</span></button>`;
}
function minuterieBloc(label, lead, valeur, w = 175) {
  return `<div style="width: ${w}px;"><div style="font-size: 15px; line-height: 20px; font-weight: 600;">${label}</div>`
    + `<div style="height: 32px; font-size: 12px; line-height: 16px; color: ${DEL};">${lead}</div><div style="height: 4px;"></div>${stepper(valeur, label, { w })}</div>`;
}

function salonHoteOptions() {
  const b = [etapes('regles', ['table', 'donne'])];
  b.push(absDiv(16, 163, 358, '<div role="radiogroup" aria-label="Univers de la table" style="display: flex; gap: 8px;">'
    + plancheUnivers('thiercelieux', 'Les Loups-Garous de Thiercelieux', true) + plancheUnivers('shiganshina', 'Attack on Titan', false) + '</div>'));
  b.push(absDiv(16, 219, 358, `<div style="display: flex; gap: 8px;">${minuterieBloc('Temps de la nuit', 'chaque étape, 15 à 120 s', '40 s')}`
    + `${minuterieBloc('Temps du jour', 'le débat et le vote, 60 à 900 s', '240 s')}</div>`));
  const rows = MAISON.map(([l, c, h, o], i) => caseRow(l, c, o ? ANCIEN_COURT : h, { off: o, clamp: true, sep: i > 0, hintId: `indic-${i}` })).join('');
  b.push(absDiv(16, 331, 358, `<fieldset style="margin: 0; padding: 0; border: 0;"><legend style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">La maison</legend>${rows}</fieldset>`));
  b.push(barre(bp('Suivant : relire et lancer')));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, seed: 21 }));
  return page('E1 Salon hôte — les règles — vous = Tom', 390, 844, b.join('\n'));
}

function dlRow(terme, definition, tw = 96) {
  return `<div style="display: flex; gap: 12px;"><dt style="width: ${tw}px; flex: none; font-family: ${FSC}; font-size: 13px; line-height: 20px; letter-spacing: .06em; color: ${DEL};">${terme}</dt>`
    + `<dd style="margin: 0; flex: 1; font-size: 14px; line-height: 20px;">${definition}</dd></div>`;
}

function salonHoteLancer() {
  const b = [etapes('table', ['table', 'donne', 'regles'])];
  b.push(rubRow('Autour de la table', '12 joueurs · prêts à lancer', { y: 163 }));
  const cells = TEMOIN.slice(0, 12).map(([nom, cc]) => jeton(nom, cc, 60, { cw: 85, nomPx: 15, nomLh: 20, ...(nom === 'Tom' ? { moi: true, st: 'vous · hôte' } : {}) })).join('');
  b.push(absDiv(16, 187, 358, `<div role="list" aria-label="Autour de la table, 12 joueurs" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 6px; row-gap: 4px;">${cells}</div>`));
  b.push(absDiv(16, 511, 358, statut('6 places libres — la table accepte jusqu’à 18 joueurs.', ' text-align: center;')));
  b.push(rubRow('Récapitulatif', 'réglé par vous', { y: 543 }));
  const recap = '<dl style="margin: 0; display: flex; flex-direction: column; gap: 6px;">'
    + dlRow('La donne', `${PHRASE_TEMOIN} — les autres joueurs sont de simples Villageois·e.`)
    + dlRow('Le capitaine', 'Élu au matin du premier jour.')
    + dlRow('Minuteries', 'Nuit : 40 secondes par étape. Jour : 4 minutes.') + '</dl>';
  b.push(absDiv(16, 567, 358, recap));
  b.push(barre(bp('Lancer la partie')));
  b.push(home());
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, seed: 21 }));
  return page('E1 Salon hôte — lancer — vous = Tom', 390, 844, b.join('\n'));
}

function voile(h) {
  return `<div aria-hidden="true" style="position: absolute; left: 0; top: 47px; width: 390px; height: ${h - 47}px;">`
    + `<svg width="390" height="${h - 47}" viewBox="0 0 390 ${h - 47}" style="display: block;"><rect width="390" height="${h - 47}" fill="${P2}" opacity=".6"/>`
    + `<rect width="390" height="${h - 47}" fill="#000" filter="url(#aqua-II)" opacity=".22"/></svg></div>`;
}
function feuille(top, titre, inner) {
  return `<section role="dialog" aria-modal="true" aria-labelledby="titre-feuille" style="position: absolute; left: 0; top: ${top}px; width: 390px; height: ${844 - top}px; background: ${BRU}; border-top: 1.5px solid ${B9}; box-sizing: border-box;">`
    + `<div aria-hidden="true" style="position: absolute; left: 0; top: 3px; width: 390px; height: .75px; background: ${B9};"></div>`
    + `<div aria-hidden="true" style="position: absolute; left: 175px; top: 8px; width: 40px; height: 4px; background: ${P2};"></div>`
    + '<div style="position: absolute; left: 16px; top: 18px; width: 358px; height: 44px; display: flex; justify-content: space-between; align-items: center;">'
    + `<h2 id="titre-feuille" style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 28px; line-height: 32px;">${titre}</h2>${bdisc('Refermer')}</div>${inner}</section>`;
}
function onglets(items, actif) {
  const html = items.map((lab) => {
    const on = lab === actif;
    return `<button type="button" role="tab" aria-selected="${on}" style="flex: 1; height: 44px; padding: 0 4px; background: ${on ? B9 : 'transparent'}; color: ${on ? BRU : B9}; `
      + `border: 1.5px solid ${B9}; border-radius: 0; font-family: ${SER}; font-size: 15px; line-height: 20px; font-weight: ${on ? 600 : 400};">${lab}</button>`;
  }).join('');
  return `<div role="tablist" aria-label="Chapitres des règles" style="display: flex; gap: 4px; width: 358px;">${html}</div>`;
}

function petiteCarte(role) {
  const [nom, , , camp] = ROLES[role];
  const meute = camp === 'meute';
  const col = meute ? SAN : B9;
  let cuv;
  if (meute) {
    const r = rng(4);
    let pts = 'M6 6 H82 L86 10 L83 16 L88 22';
    let y = 22;
    while (y < 120) { y += r.uniform(6, 10); pts += ` L${g(88 - r.uniform(0, 4))} ${g(Math.min(y, 128))}`; }
    pts += ' L86 128 H6 Z';
    cuv = `<path d="${pts}" fill="${TEI}" stroke="${SAN}" stroke-width="1"/>`;
  } else {
    cuv = `<rect x="6" y="6" width="84" height="122" fill="${TEI}"/><path d="M6 128 V6 H90" fill="none" stroke="${B9}" stroke-opacity=".38" stroke-width="1"/>`
      + `<path d="M90 6 V128 H6" fill="none" stroke="${BRU}" stroke-width="1.5"/><rect x="8.5" y="8.5" width="79" height="117" fill="none" stroke="${B9}" stroke-opacity=".14" stroke-width="1"/>`;
  }
  const cart = meute ? 'cart-mordu' : 'cart-ecu';
  const mot = meute ? 'Meute' : 'Village';
  return `<svg width="96" height="134" viewBox="0 0 96 134" role="img" aria-label="${nom}, carte du camp : ${mot.toLowerCase()}" style="display: block; flex: none;">`
    + `<rect x=".5" y=".5" width="95" height="133" fill="${BRU}" stroke="${P2}" stroke-width="1"/>${cuv}`
    + '<rect x="12" y="12" width="72" height="62" fill="url(#hach-1-e)"/>'
    + `<svg x="24" y="19" width="48" height="48" viewBox="0 0 32 32" style="color: ${col};"><use href="#r-${role}"/></svg>`
    + `<text x="48" y="92" text-anchor="middle" font-family="IM Fell French Canon, Georgia, serif" font-size="16" fill="${B9}">${nom}</text>`
    + `<use href="#${cart}" x="12" y="100" width="72" height="20"/>`
    + `<text x="${meute ? 46 : 48}" y="114" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="${meute ? 600 : 400}" fill="${col}">${mot}</text></svg>`;
}

function regles() {
  const b = [];
  b.push(statusbar());
  const carte = outil('ic-carte', 'Ma carte — gardez le pouce', 'Carte');
  b.push(frise({ left: lienArcade() + cartoucheHeure('Jour II'), right: carte + outil('ic-menu', 'Menu de la table') + outil('ic-son', 'Son : couper'), clocher: 176, potence: 196, seed: 31 }));
  b.push(voile(84));
  const rows = ['villageois', 'loup', 'voyante', 'sorciere'].map((role) => {
    const [, desc, quand] = ROLES[role];
    return `<li style="display: flex; gap: 12px; align-items: flex-start;">${petiteCarte(role)}`
      + `<div style="flex: 1; min-width: 0;"><p style="margin: 0; font-size: 16px; line-height: 24px;">${desc}</p>`
      + `<p style="margin: 4px 0 0; font-size: 12px; line-height: 16px; color: ${DEL};">${quand}</p></div></li>`;
  }).join('');
  const inner = `<div style="position: absolute; left: 16px; top: 70px; width: 358px;">${onglets(['Le but', 'Une manche', 'Les rôles', 'Cette table'], 'Les rôles')}</div>`
    + `<div role="tabpanel" style="position: absolute; left: 16px; top: 126px; width: 358px;">${rub('Les rôles — Les Loups-Garous de Thiercelieux')}`
    + `<ul style="margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px;">${rows}</ul></div>`;
  b.push(feuille(84, 'Les règles', inner));
  return page('E1 Règles — vous = Tom', 390, 844, b.join('\n'));
}

function miniEcran(cuivre) {
  const roofsD = 'M0 24 V17 L9 12 L18 17 V15 L27 10 L36 15 V6 L40 2 L44 6 V24 Z M100 24 V16 L110 11 L120 16 L130 12 L140 17 V24 Z';
  let s;
  if (cuivre) {
    s = `<rect width="171" height="96" fill="${B9}"/><rect width="171" height="96" fill="#000" filter="url(#aqua-IV)" opacity=".28"/>`
      + `<path d="${roofsD}" fill="${P3}"/><line x1="0" y1="24.5" x2="171" y2="24.5" stroke="${P2}" stroke-width="1"/>`
      + [0, 1, 2, 3, 4].map((i) => `<circle cx="${22 + i * 32}" cy="46" r="10" fill="${B8}" stroke="${VER}" stroke-width="1"/><rect x="${14 + i * 32}" y="61" width="16" height="3" fill="${P1}"/>`).join('')
      + `<rect x="0" y="76" width="171" height="20" fill="${B8}"/><line x1="0" y1="76.5" x2="171" y2="76.5" stroke="${P2}"/><rect x="62" y="80" width="98" height="12" fill="${P3}" stroke="${P1}" stroke-width=".75"/>`;
  } else {
    s = `<rect width="171" height="96" fill="${VER}"/><rect width="171" height="24" fill="url(#hach-h-e)" opacity=".4"/>`
      + `<path d="${roofsD}" fill="url(#hach-2-e)" stroke="${B9}" stroke-width=".75"/><line x1="0" y1="24.5" x2="171" y2="24.5" stroke="${B9}" stroke-width="1"/>`
      + [0, 1, 2, 3, 4].map((i) => `<circle cx="${22 + i * 32}" cy="46" r="10" fill="${BRU}" stroke="${B9}" stroke-width="1"/><circle cx="${22 + i * 32}" cy="46" r="7.5" fill="url(#hach-1-e)"/><rect x="${14 + i * 32}" y="61" width="16" height="3" fill="${B9}"/>`).join('')
      + `<rect x="0" y="76" width="171" height="20" fill="${BRU}"/><line x1="0" y1="76.5" x2="171" y2="76.5" stroke="${B9}"/><rect x="62" y="80" width="98" height="12" fill="${B9}"/>`;
  }
  return `<svg width="171" height="96" viewBox="0 0 171 96" aria-hidden="true" style="display: block;">${s}</svg>`;
}
function choixTirage(nom, sous, cuivre, actif) {
  const bd = actif ? `1.5px solid ${B9}` : `1px solid ${P2}`;
  return `<button type="button" role="radio" aria-checked="${actif}" style="width: 175px; box-sizing: border-box; padding: 0; display: flex; flex-direction: column; gap: 0; background: transparent; border: ${bd}; border-radius: 0; text-align: left; font-family: ${SER}; color: ${B9};">`
    + `<span style="display: block; padding: 1px;">${miniEcran(cuivre)}</span>`
    + `<span style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-top: 1px solid ${actif ? B9 : P2};">${caseSvg(actif)}`
    + `<span style="display: block;"><span style="display: block; font-size: 15px; line-height: 20px; font-weight: 600;">${nom}</span><span style="display: block; font-size: 12px; line-height: 16px; color: ${DEL};">${sous}</span></span></span></button>`;
}
function miniMinuterie(discrete) {
  const sab = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="color: ${B9};"><use href="#ic-sablier"/></svg>`;
  if (discrete) return `<span style="display: flex; align-items: center; gap: 6px; height: 20px;">${sab}<span style="font-size: 14px; line-height: 16px; color: ${DEL}; font-variant-numeric: tabular-nums;">41</span></span>`;
  let crans = '';
  for (let i = 0; i < 16; i++) crans += i < 12 ? `<rect x="${i * 6}" y="0" width="4" height="10" fill="${B9}"/>` : `<rect x="${i * 6 + .5}" y=".5" width="3" height="9" fill="none" stroke="${P2}" stroke-width="1"/>`;
  return `<span style="display: flex; align-items: center; gap: 6px; height: 20px;">${sab}<svg width="96" height="10" viewBox="0 0 96 10" aria-hidden="true">${crans}</svg>`
    + '<span style="font-size: 14px; line-height: 16px; font-variant-numeric: tabular-nums;">0:41</span></span>';
}
function choixMinuterie(nom, discrete, actif) {
  const bd = actif ? `1.5px solid ${B9}` : `1px solid ${P2}`;
  return `<button type="button" role="radio" aria-checked="${actif}" style="width: 175px; height: 60px; box-sizing: border-box; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center; gap: 4px; `
    + `background: ${actif ? BRU : 'transparent'}; border: ${bd}; border-radius: 0; text-align: left; font-family: ${SER}; color: ${B9};">`
    + `<span style="display: flex; align-items: center; gap: 8px; font-size: 15px; line-height: 20px; font-weight: 600;">${caseSvg(actif)}${nom}</span>${miniMinuterie(discrete)}</button>`;
}

function reglages() {
  const b = [];
  b.push(statusbar());
  b.push(frise({ left: lienArcade(), right: SALON_DROITE, clocher: 96, potence: 136, seed: 21 }));
  b.push(etapes('table', ['table', 'donne', 'regles']));
  b.push(voile(84));
  let crans = '';
  for (let i = 0; i < 20; i++) crans += i < 14 ? `<rect x="${g(i * 17.9)}" y="2" width="10" height="16" fill="${B9}"/>` : `<rect x="${g(i * 17.9 + .5)}" y="2.5" width="9" height="15" fill="none" stroke="${P2}" stroke-width="1"/>`;
  const volume = '<div><div style="display: flex; justify-content: space-between; align-items: baseline;"><span id="lab-volume" style="font-size: 15px; line-height: 20px; font-weight: 600;">Volume</span>'
    + '<span style="font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums;">70 %</span></div>'
    + '<div role="slider" aria-labelledby="lab-volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70" aria-valuetext="70 pour cent" tabindex="0" style="height: 44px; display: flex; align-items: center;">'
    + `<svg width="358" height="20" viewBox="0 0 358 20" aria-hidden="true">${crans}</svg></div>`
    + `${statut('À zéro, le son est coupé : hurlements, glas et bruitages se taisent.', ' margin-top: -8px;')}</div>`;
  const cases = caseRow('Animations réduites', false, 'Moins de mouvement à l’écran. Sans cela, on suit le réglage de votre appareil.', { sep: false })
    + caseRow('Grand texte', false, 'Agrandit tous les textes, pour lire de loin, téléphone posé sur la table.')
    + caseRow('Fil ouvert sur mobile', false, 'Le fil de discussion s’ouvre déplié plutôt que replié, sur un petit écran.')
    + caseRow('Vibrations', true, 'Le téléphone vibre quand c’est à vous de jouer, si l’appareil le permet.');
  const inner = '<div style="position: absolute; left: 16px; top: 64px; width: 358px; display: flex; flex-direction: column; gap: 10px;">'
    + statut('Ces préférences restent sur cet appareil : la table ne les voit pas.')
    + `<div>${rub('Le jour s’imprime sur', ' margin-bottom: 6px;')}<div role="radiogroup" aria-label="Le jour s’imprime sur" style="display: flex; gap: 8px;">`
    + `${choixTirage('Papier', 'par défaut', false, true)}${choixTirage('Cuivre', 'la nuit, jour compris', true, false)}</div></div>`
    + `<div>${rub('La minuterie', ' margin-bottom: 6px;')}<div role="radiogroup" aria-label="La minuterie" style="display: flex; gap: 8px;">`
    + `${choixMinuterie('Barre', false, true)}${choixMinuterie('Discrète', true, false)}</div>`
    + `${statut('Une barre toujours visible qui se vide jusqu’à l’échéance.', ' margin-top: 4px;')}</div>`
    + `${volume}<div>${cases}</div></div>`;
  b.push(feuille(84, 'Réglages', inner));
  return page('E1 Réglages — vous = Tom', 390, 844, b.join('\n'));
}

// ================================================================= DESKTOP
function accueilDesktop() {
  const b = [];
  b.push(cuvette(72, 92, 640, 720, frontispiceDesktop()));
  b.push(absDiv(72, 828, 640, legende('Le sommeil de la raison engendre des loups.', 20, 28)));
  const col = [];
  col.push(metaRow());
  col.push(`<h1 style="margin: 16px 0 0; font-family: ${FELL}; font-weight: 400; font-size: 56px; line-height: 60px;">Garoutom</h1>`);
  col.push('<p style="margin: 4px 0 0; font-size: 18px; line-height: 28px;">Loup-garou en ligne · 6 à 18 joueurs</p>');
  col.push(`<p style="margin: 20px 0 0; font-size: 16px; line-height: 24px; max-width: 560px;">${PITCH}</p>`);
  const specs = [['Genre', 'Social / déduction'], ['Joueurs', '6 à 18 joueurs'], ['Année', '2026']]
    .map(([a, v]) => `<div><dt style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${DEL};">${a}</dt><dd style="margin: 4px 0 0; font-size: 16px; line-height: 20px;">${v}</dd></div>`).join('');
  col.push(`<dl style="margin: 20px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 480px;">${specs}</dl>`);
  col.push(`<div style="margin-top: 24px; border-top: .75px solid ${P2}; padding-top: 24px; width: 560px;">${champ('Votre pseudo', 'pseudo', { placeholder: 'Jean-Mi', w: 376 })}</div>`);
  col.push(`<div style="margin-top: 16px;">${bp('Ouvrir une table', { w: 376 })}</div>`);
  col.push(`<div style="margin-top: 24px;"><div style="font-family: ${FSC}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${DEL}; margin-bottom: 4px;">Code de la table</div>`
    + `<div style="display: flex; gap: 16px; align-items: flex-end;">${codeCases(['', '', '', ''])}${bs('Rejoindre', { w: 112 })}</div></div>`);
  col.push(statut('Une partie se tient à six joueurs au moins. Le code d’une table compte quatre lettres — celles qui ne se recopient pas en chiffre.', ' margin-top: 12px; max-width: 480px;'));
  b.push(absDiv(776, 100, 592, col.join('')));
  b.push(absDiv(776, 860, 592, `<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: ${DEL};"><span>TBP-012</span><span>fait par <a href="https://www.tombp.fr" style="color: ${B9};">Tomi-Tom</a></span></div>`));
  b.push(frise({ W: 1440, H: 64, top: 0, left: lienArcade(), right: outil('ic-son', 'Son : couper', 'Son'), clocher: 640, potence: 1180, seed: 41, pad: 32 }));
  return page('E1 Accueil — bureau', 1440, 900, b.join('\n'));
}

function salonDesktop() {
  const b = [];
  // colonne 1 : la table
  const c1 = 32;
  b.push(absDiv(c1, 84, 400, `<div style="display: flex; justify-content: space-between; align-items: baseline;"><h2 style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 36px; line-height: 40px;">La table</h2>`
    + `<span style="font-size: 13px; line-height: 16px; color: ${DEL};">12 joueurs · prêts à lancer</span></div>`));
  b.push(absDiv(c1, 136, 400, rub('Code de la table')));
  b.push(absDiv(c1, 156, 400, '<div style="display: flex; justify-content: space-between; align-items: center; height: 48px;">'
    + `<span style="font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: .24em;">VRGL</span>${bs('Copier le code', { w: 150, h: 44, size: 16 })}</div>`));
  b.push(absDiv(c1, 212, 400, `<div style="display: flex; justify-content: space-between; align-items: center;">${bs('Copier le lien d’invitation', { w: 250, h: 44, size: 16 })}${bdisc('Quitter la table')}</div>`));
  const cx = c1 + 200, cy = 580, rx = 156, ry = 232;
  const jetons = TEMOIN.slice(0, 12).map(([nom, cc], i) => {
    const th = (90 + (i + 1 - 11) * 30) * Math.PI / 180;
    const x = cx + rx * Math.cos(th), y = cy + ry * Math.sin(th);
    return `<div style="position: absolute; left: ${g(x - 42)}px; top: ${g(y - 32)}px;">${jeton(nom, cc, 56, { cw: 84, nomPx: 16, nomLh: 20, stPx: 13, ...(nom === 'Tom' ? { moi: true, st: 'vous · hôte' } : {}) })}</div>`;
  }).join('');
  b.push(`<div role="list" aria-label="Autour de la table, 12 joueurs, dans l’ordre des sièges">${jetons}</div>`);
  const pupitre = '<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 0 18px;">'
    + legende('Assis en rond, comme d’honnêtes gens.', 20, 28) + statut('6 places libres — la table accepte jusqu’à 18 joueurs.', ' text-align: center;') + '</div>';
  b.push(cuvette(cx - 120, cy - 64, 240, 128, pupitre));
  // colonne 2 : la donne
  const c2 = 464, w2 = 392;
  b.push(absDiv(c2, 84, w2, `<h2 style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 36px; line-height: 40px;">La donne</h2>` + statut('publique pour toute la table — seules les cartes sont secrètes')));
  b.push(absDiv(c2, 148, w2, `<div style="display: flex; align-items: baseline; gap: 10px;">${rub('L’univers')}<span style="font-size: 12px; line-height: 16px; color: ${DEL};">change les noms et l’ambiance, jamais les règles</span></div>`));
  b.push(absDiv(c2, 168, w2, '<div role="radiogroup" aria-label="Univers de la table" style="display: flex; gap: 8px;">'
    + plancheUnivers('thiercelieux', 'Les Loups-Garous de Thiercelieux', true, { w: 192, h: 64, apercu: 'Loup-garou · la Voyante · la Sorcière · le Chasseur…' })
    + plancheUnivers('shiganshina', 'Attack on Titan', false, { w: 192, h: 64, apercu: 'Titan · l’Éclaireuse · la Scientifique · le Caporal…' }) + '</div>'));
  b.push(absDiv(c2, 252, w2, caseRow('Composition automatique', false, 'Les loups et les rôles suivent la référence du moteur, au nombre de joueurs du lancement.', { sep: false })));
  b.push(absDiv(c2, 318, w2, `<div role="radiogroup" aria-label="Compositions suggérées" style="display: flex; gap: 8px;">${SUGG.map((s) => suggestion(s, 192)).join('')}</div>`));
  b.push(absDiv(c2, 390, w2, `<div style="display: flex; gap: 8px;">${bs('Au hasard', { w: 124, size: 16 })}${bs('Au hasard, rôles optionnels compris', { w: 260, size: 16 })}</div>`));
  const encart = `<div style="box-sizing: border-box; width: ${w2}px; padding: 8px; border: 1px solid ${P2}; display: flex; flex-direction: column; gap: 8px;">`
    + `${loupsRow(w2 - 18)}${grilleRoles(new Set(SPECIAUX), { w: 89, h: 84 })}</div>`;
  b.push(absDiv(c2, 450, w2, encart));
  b.push(absDiv(c2, 790, w2, `<p style="margin: 0; font-size: 13px; line-height: 16px; font-variant-numeric: tabular-nums;"><b style="font-weight: 600;">${PHRASE_TEMOIN}</b> — 4 Villageois·e, pour 12 joueurs.</p>`));
  b.push(absDiv(c2, 832, w2, bp('Lancer la partie')));
  // colonne 3 : les règles
  const c3 = 888, w3 = 520;
  b.push(absDiv(c3, 84, w3, `<div style="display: flex; justify-content: space-between; align-items: baseline;"><h2 style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 36px; line-height: 40px;">Les règles</h2>`
    + `<span style="font-size: 13px; line-height: 16px; color: ${DEL};">vous décidez</span></div>`));
  b.push(rubRow('Les minuteries', 'la nuit compte ses étapes, le jour son débat et son vote', { x: c3, y: 140, w: w3 }));
  b.push(absDiv(c3, 164, w3, `<div style="display: flex; gap: 24px;">${minuterieBloc('Temps de la nuit', 'chaque étape, 15 à 120 s', '40 s', 248)}${minuterieBloc('Temps du jour', 'le débat et le vote, 60 à 900 s', '240 s', 248)}</div>`));
  b.push(rubRow('La maison', 'les règles qui changent vraiment la partie, dites en toutes lettres', { x: c3, y: 280, w: w3 }));
  const rows = MAISON.map(([l, c, h, o], i) => caseRow(l, c, h, { off: o, sep: i > 0, hintId: `maison-${i}`, minh: 40 })).join('');
  b.push(absDiv(c3, 300, w3, `<fieldset style="margin: 0; padding: 0; border: 0;"><legend style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">La maison</legend>${rows}</fieldset>`));
  const droite = outil('ic-regles', 'Règles', 'Règles') + outil('ic-reglages', 'Réglages', 'Réglages') + outil('ic-son', 'Son : couper') + outil('ic-quitter', 'Quitter', 'Quitter');
  const code = `<span style="height: 44px; display: flex; align-items: center; padding: 0 12px; background: ${BRU}; border: 1px solid ${P2}; box-sizing: border-box; font-size: 20px; line-height: 24px; font-weight: 600; letter-spacing: .24em;">VRGL</span>`;
  b.push(frise({ W: 1440, H: 64, top: 0, left: lienArcade() + cartoucheHeure('Le salon', 22) + code, right: droite, clocher: 700, potence: 760, seed: 43, pad: 32 }));
  return page('E1 Salon — bureau — vous = Tom, hôte', 1440, 900, b.join('\n'));
}

const FILES = {
  'Caprices-E1-Accueil.dc.html': accueil,
  'Caprices-E1-Accueil-Rejoindre.dc.html': accueilRejoindre,
  'Caprices-E1-Salon-Joueur.dc.html': salonJoueur,
  'Caprices-E1-Salon-Hote-Table.dc.html': salonHoteTable,
  'Caprices-E1-Salon-Hote-Composition.dc.html': salonHoteComposition,
  'Caprices-E1-Salon-Hote-Options.dc.html': salonHoteOptions,
  'Caprices-E1-Salon-Hote-Lancer.dc.html': salonHoteLancer,
  'Caprices-E1-Regles.dc.html': regles,
  'Caprices-E1-Reglages.dc.html': reglages,
  'Caprices-E1-Accueil-Desktop.dc.html': accueilDesktop,
  'Caprices-E1-Salon-Desktop.dc.html': salonDesktop,
};
for (const [name, fn] of Object.entries(FILES)) {
  const html = fn();
  writeFileSync(join(OUT, name), html, 'utf8');
  console.log(`${name}: ${Math.round(Buffer.byteLength(html) / 1024)} Ko`);
}
