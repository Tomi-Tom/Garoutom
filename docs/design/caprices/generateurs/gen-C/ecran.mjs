// Les pièces des écrans de partie : barre système, frise, minuterie, crieur, pli, barre au pouce,
// boutons, jetons et couvre-chefs. Dessinés d'après la spec (lot F fait foi sur ces composants).
import { K, F, PAPIER, CUIVRE, hach, rnd, cartouche, uid, grainCuivre, grainPapier, BG_PAPIER, BG_CUIVRE } from './lib.mjs';

export const SIEGES = [
  null,
  { n: 1, nom: 'Anna', chapeau: 'tricorne' }, { n: 2, nom: 'Bastien', chapeau: 'mantille' }, { n: 3, nom: 'Clément', chapeau: 'bonnet' },
  { n: 4, nom: 'Delphine', chapeau: 'coroza' }, { n: 5, nom: 'Étienne', chapeau: 'chambergo' }, { n: 6, nom: 'Fanny', chapeau: 'montera' },
  { n: 7, nom: 'Gaspard', chapeau: 'capuche' }, { n: 8, nom: 'Hélène', chapeau: 'cofia' }, { n: 9, nom: 'Inès', chapeau: 'bicorne' },
  { n: 10, nom: 'Jules', chapeau: 'turban' }, { n: 11, nom: 'Tom', chapeau: 'boina' }, { n: 12, nom: 'Léa', chapeau: 'catogan' },
];

// ---------------------------------------------------------------- icônes (grille 24, trait 1,5)
const ic = (inner, size = 24, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display: block;" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
export const ICONES = {
  retour: (c) => ic('<path d="M14.5 5.5L8 12L14.5 18.5"/><path d="M8.6 12H19.4" stroke-width="1"/>', 24, c),
  carte: (c) => ic('<path d="M6 3.5H15.5L18.5 6.5V20.5H6Z"/><path d="M15.5 3.5V6.5H18.5"/><path d="M8.6 9L11.4 6.4M8.6 13L15.6 6.6M8.6 17L16 10.2" stroke-width="0.75"/>', 24, c),
  menu: (c) => ic('<path d="M4 7H20M4 12H17M4 17H19"/>', 24, c),
  cloche: (c) => ic('<path d="M7 16.5C7 11 7.4 6.5 12 6.5C16.6 6.5 17 11 17 16.5L18.6 18H5.4Z"/><path d="M12 4.5V6.5M10.6 19.6A1.6 1.6 0 0 0 13.4 19.6"/><path d="M9 9.5V15M10.4 8.6V15" stroke-width="0.75"/>', 24, c),
  registre: (c) => ic('<path d="M5 4.5H17.5V19.5H5Z"/><path d="M7.5 4.5V19.5"/><path d="M17.5 10H20V14H17.5"/><path d="M10 8H15M10 10.6H14" stroke-width="0.75"/>', 24, c),
  chevronHaut: (c) => ic('<path d="M7 14.5L12 9.5L17 14.5"/>', 24, c),
  chevronG: (c) => ic('<path d="M14.5 6L8.5 12L14.5 18"/>', 24, c),
  chevronD: (c) => ic('<path d="M9.5 6L15.5 12L9.5 18"/>', 24, c),
  sablier: (c, n = 16) => `<svg width="${n}" height="${n}" viewBox="0 0 16 16" aria-hidden="true" style="display: block;"><g fill="none" stroke="${c}" stroke-width="1.25" stroke-linecap="round"><path d="M3.5 1.5H12.5M3.5 14.5H12.5M4.6 1.8C4.6 5.6 7.4 6.6 7.4 8C7.4 9.4 4.6 10.4 4.6 14.2M11.4 1.8C11.4 5.6 8.6 6.6 8.6 8C8.6 9.4 11.4 10.4 11.4 14.2"/><path d="M5.8 13.4L8 11.4L10.2 13.4" stroke-width="0.75"/></g></svg>`,
  case: (c) => ic('<path d="M4 4H20V20H4Z"/><path d="M7.4 12.4L10.6 15.6L16.8 8.4" stroke-width="2"/>', 24, c),
  plume: (c) => ic('<path d="M19.5 4.5C12 5.5 7 10 5 19.5M19.5 4.5C18.5 11 13 15 7 15.6"/><path d="M8.6 13L12.6 9M10.4 14.2L14.4 10.2" stroke-width="0.75"/>', 24, c),
};

// ---------------------------------------------------------------- barre système
export function barreSysteme(t, w = 390) {
  const c = t.encre;
  return `<div style="position: absolute; left: 0; top: 0; width: ${w}px; height: 47px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px 0 32px; box-sizing: border-box; color: ${c}; background: ${t.fond};">
<span style="font-family: ${F.ss}; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums lining-nums;">9:41</span>
<svg width="64" height="12" viewBox="0 0 64 12" aria-hidden="true"><g fill="${c}"><rect x="0" y="8" width="3" height="4"/><rect x="5" y="6" width="3" height="6"/><rect x="10" y="3.5" width="3" height="8.5"/><rect x="15" y="1" width="3" height="11"/></g><rect x="36.5" y="0.5" width="22" height="11" fill="none" stroke="${c}" stroke-width="1"/><rect x="38.5" y="2.5" width="15" height="7" fill="${c}"/><rect x="59.5" y="4" width="2" height="4" fill="${c}"/></svg>
</div>`;
}

// ---------------------------------------------------------------- la frise de Thiercelieux
export function toits(w, base, t, seed = 7) {
  const r = rnd(seed);
  const nuit = t.nom === 'cuivre';
  const fillT = nuit ? K.b8 : K.tei, line = nuit ? K.p2 : K.b9;
  let d = `M0 ${base}`, x = 0, fen = '', fait = false;
  const clocher = Math.round(w * 0.36), potence = w - 46;
  while (x < w) {
    if (!fait && x >= clocher - 30) {
      // le clocher à une seule fenêtre
      fait = true;
      d += `V${base - 8}H${x + 4}V${base - 13}L${x + 9} ${base - 18}L${x + 14} ${base - 13}V${base - 8}H${x + 18}`;
      fen += `<rect x="${x + 7.6}" y="${base - 12.4}" width="2.8" height="3.4" fill="${nuit ? K.p3 : K.bru}" stroke="${line}" stroke-width="0.6"/>`;
      x += 18;
      continue;
    }
    if (x > potence - 40) break;
    const ww = 16 + Math.round(r() * 22), hh = 5 + Math.round(r() * 6), pk = 3 + Math.round(r() * 3);
    d += `V${base - hh}L${x + ww / 2} ${base - hh - pk}L${x + ww} ${base - hh}`;
    if (r() > 0.55) fen += `<rect x="${x + ww / 2 - 1.2}" y="${base - hh + 2}" width="2.4" height="2.6" fill="none" stroke="${line}" stroke-width="0.5"/>`;
    x += ww;
  }
  d += `V${base - 2}H${w}V${base}Z`;
  let s = `<path d="${d}" fill="${fillT}" stroke="${line}" stroke-width="${nuit ? 0.8 : 1}" stroke-linejoin="round"/>` + fen;
  // la potence, à droite
  s += `<path d="M${potence + 14} ${base - 2}V${base - 17}H${potence + 28}M${potence + 14} ${base - 12}L${potence + 19} ${base - 17}M${potence + 26} ${base - 17}V${base - 12}" fill="none" stroke="${line}" stroke-width="${nuit ? 1 : 1.2}"/><ellipse cx="${potence + 26}" cy="${base - 10.4}" rx="1.4" ry="1.8" fill="none" stroke="${line}" stroke-width="0.7"/>`;
  if (!nuit) s += hach(d, [0, base - 22, w, 22], { pas: 2.4, sw: 0.45, color: K.b9, angle: 45, op: 0.7 });
  return s;
}

const caseFrise = (t, inner, w, extra = '') => `<div style="width: ${w}px; height: 44px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux}; display: flex; align-items: center; justify-content: center; gap: 6px; color: ${t.encre}; ${extra}">${inner}</div>`;
const btnFrise = (t, inner, w, label, extra = '') => `<button type="button" aria-label="${label}" style="width: ${w}px; height: 44px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux}; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0; color: ${t.encre}; font-family: ${F.ss}; font-size: 14px; cursor: pointer; ${extra}">${inner}</button>`;

/** frise mobile ; carte : 'repos' | 'tenu' | 'vide' */
export function frise({ t, heure, carte = 'repos', w = 390, y = 47 }) {
  const nuit = t.nom === 'cuivre';
  let ciel = nuit ? '' : `<rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"/>`;
  const svg = `<svg width="${w}" height="56" viewBox="0 0 ${w} 56" style="position: absolute; left: 0; top: 0;" aria-hidden="true">${ciel}${toits(w, 56, t)}</svg>`;
  let carteBtn;
  if (carte === 'vide') carteBtn = `<div aria-hidden="true" style="width: 76px; height: 44px; box-sizing: border-box; border: 1px dashed ${t.filetDoux};"></div>`;
  else if (carte === 'tenu') carteBtn = btnFrise(t, `${ICONES.carte(t.surEncre)}<span style="color: ${t.surEncre}; font-weight: 600;">Carte</span>`, 76, 'Ma carte : gardez le pouce', `background-color: ${t.encre}; background-image: repeating-linear-gradient(45deg, ${t.surface} 0 1.1px, transparent 1.1px 2.6px); border-color: ${t.encre};`);
  else carteBtn = btnFrise(t, `${ICONES.carte(t.encre)}<span>Carte</span>`, 76, 'Ma carte : gardez le pouce');
  return `<div style="position: absolute; left: 0; top: ${y}px; width: ${w}px; height: 56px; background: ${nuit ? 'transparent' : t.fond};">${svg}
<div style="position: absolute; left: 16px; top: 6px; display: flex; gap: 4px;">${btnFrise(t, ICONES.retour(t.encre), 44, 'Retour à l’arcade')}${caseFrise(t, `<span style="font-family: ${F.sc}; font-size: 20px; line-height: 24px; letter-spacing: .02em;">${heure}</span>`, 'auto', 'padding: 0 12px;')}</div>
<div style="position: absolute; right: 16px; top: 6px; display: flex; gap: 4px;">${carteBtn}${btnFrise(t, ICONES.menu(t.encre), 44, 'Menu de la table')}${btnFrise(t, ICONES.cloche(t.encre), 44, 'Couper le son')}</div>
</div>`;
}

// ---------------------------------------------------------------- minuterie (24 crans)
export function minuterie({ t, restant = 18, chiffre = '0:38', variante = 'barre', y = 103, w = 390, x = 0 }) {
  let crans = '';
  for (let i = 0; i < 24; i++) {
    const plein = variante !== 'absente' && i < restant;
    crans += plein ? `<rect x="${i * 8}" y="7" width="5" height="10" fill="${t.cranPlein}"/>` : `<rect x="${i * 8 + 0.5}" y="7.5" width="4" height="9" fill="none" stroke="${t.cranVide}" stroke-width="1"/>`;
  }
  const lab = variante === 'absente' ? 'Pas de minuterie' : `Il reste ${chiffre}`;
  return `<div role="timer" aria-label="${lab}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: 24px; display: flex; align-items: center; gap: 8px; padding: 0 16px; box-sizing: border-box;">
${ICONES.sablier(t.encre2)}<svg width="189" height="24" viewBox="0 0 189 24" aria-hidden="true">${crans}</svg>
<span style="margin-left: auto; width: 44px; text-align: right; font-family: ${F.ss}; font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums; color: ${variante === 'absente' ? t.encre2 : t.encre};">${variante === 'absente' ? '—' : chiffre}</span></div>`;
}

// ---------------------------------------------------------------- crieur
export function crieur({ t, rub, txt, y = 127, w = 390, x = 0, h = 56 }) {
  return `<div aria-live="polite" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 4px 16px 0; border-bottom: 0.75px solid ${t.filetDoux};">
<p style="margin: 0; font-family: ${F.ss}; font-size: 16px; line-height: 24px; color: ${t.encre}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"><span style="font-family: ${F.sc}; font-size: 13px; letter-spacing: .06em; color: ${t.encre2}; margin-right: 8px;">${rub}</span>${txt}</p></div>`;
}

// ---------------------------------------------------------------- légende du graveur
export function legende(txt, t, { size = 18, lh = 24 } = {}) {
  return `<p style="margin: 0; font-family: ${F.fell}; font-style: italic; font-size: ${size}px; line-height: ${lh}px; color: ${t.narr}; text-align: center;">${txt}</p>`;
}

// ---------------------------------------------------------------- le pli
export function pli({ t, kind = 'registre', label = 'Le registre', count = '', y = 694, w = 390 }) {
  let tete;
  if (kind === 'registre') tete = ICONES.registre(t.encre);
  else {
    const map = { village: 'ecu', meute: 'mordu', serment: 'lacs', audela: 'audela' };
    tete = `<svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">${cartouche(map[kind], 0, 0, 28, 20, '', t, { fs: 12 })}</svg>`;
  }
  return `<button type="button" aria-expanded="false" style="position: absolute; left: 0; top: ${y}px; width: ${w}px; height: 44px; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: ${t.fond}; border: 0; border-top: 1px solid ${t.filetDoux}; border-radius: 0; color: ${t.encre}; font-family: ${F.ss}; font-size: 16px; cursor: pointer; text-align: left;">${tete}<span>${label}</span>${count ? `<span style="font-variant-numeric: tabular-nums lining-nums; color: ${t.encre2};">· ${count}</span>` : ''}<span style="margin-left: auto;">${ICONES.chevronHaut(t.encre2)}</span></button>`;
}

// ---------------------------------------------------------------- boutons
/** anneau d'appui long Ø 26 ; p = 0..1 */
export function anneau(t, p = 0, nuit = false) {
  const r = 11.5, C = 2 * Math.PI * r;
  const track = nuit ? K.p2 : K.p2, prog = nuit ? K.ver : t.encre;
  let crans = '';
  for (let i = 0; i < 12; i++) { const a = (i * 30 - 90) * Math.PI / 180; crans += `M${(13 + 9 * Math.cos(a)).toFixed(2)} ${(13 + 9 * Math.sin(a)).toFixed(2)}L${(13 + 7.4 * Math.cos(a)).toFixed(2)} ${(13 + 7.4 * Math.sin(a)).toFixed(2)}`; }
  return `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex: none;"><circle cx="13" cy="13" r="${r}" fill="none" stroke="${track}" stroke-width="3"/>${p > 0 ? `<circle cx="13" cy="13" r="${r}" fill="none" stroke="${prog}" stroke-width="3" stroke-dasharray="${(C * p).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 13 13)"/>` : ''}<path d="${crans}" stroke="${track}" stroke-width="0.75"/></svg>`;
}
/**
 * kind : primaire | secondaire | appui | eteint | arme
 * etat : repos | appuye
 */
export function bouton({ t, kind = 'primaire', label, w = '100%', etat = 'repos', p = 0, flex = '', icone = '', h = 48, aria = '' }) {
  const nuit = t.nom === 'cuivre';
  let bg = 'transparent', fg = t.encre, bord = `1.5px solid ${t.filet}`, wt = 400, img = 'none', extra = '';
  if (kind === 'primaire') { bg = t.actionFond; fg = t.actionTexte; bord = `1.5px solid ${t.actionBord}`; wt = 600; }
  if (kind === 'appui' && nuit) { bg = K.p3; fg = K.ver; bord = `1.5px solid ${K.p1}`; }
  if (kind === 'eteint') { bg = 'transparent'; fg = t.encre2; bord = `1.5px dashed ${t.filetDoux}`; }
  if (etat === 'appuye') {
    if (kind === 'primaire' || (kind === 'appui' && nuit)) img = `repeating-linear-gradient(45deg, ${nuit ? K.b8 : K.b9} 0 1.1px, transparent 1.1px 2.6px)`;
    else img = `repeating-linear-gradient(45deg, ${t.encre} 0 .6px, transparent .6px 6px)`;
  }
  const lead = kind === 'appui' ? anneau(t, p, nuit) : icone;
  return `<button type="button"${aria} style="${flex ? `flex: ${flex};` : `width: ${w}${typeof w === 'number' ? 'px' : ''};`} height: ${h}px; box-sizing: border-box; border-radius: 0; border: ${bord}; background-color: ${bg}; background-image: ${img}; color: ${fg}; font-family: ${F.ss}; font-size: 17px; line-height: 20px; font-weight: ${wt}; display: flex; align-items: center; justify-content: ${kind === 'appui' ? 'flex-start' : 'center'}; gap: 10px; padding: 0 16px; cursor: pointer; ${extra}">${lead}<span>${label}</span></button>`;
}

// ---------------------------------------------------------------- barre au pouce (+ indicateur d'accueil)
export function barrePouce({ t, inner, y = 738, w = 390, gap = 8 }) {
  return `<div style="position: absolute; left: 0; top: ${y}px; width: ${w}px; height: ${844 - y}px; box-sizing: border-box; background: ${t.surface}; border-top: 1.5px solid ${t.filet};">
<div style="height: 72px; box-sizing: border-box; padding: 12px 16px; display: flex; gap: ${gap}px;">${inner}</div>
<div aria-hidden="true" style="position: absolute; left: ${(w - 134) / 2}px; bottom: 9px; width: 134px; height: 5px; background: ${t.nom === 'cuivre' ? K.p2 : K.b9};"></div></div>`;
}

// ---------------------------------------------------------------- couvre-chefs et bustes (grille 48)
const EPAULES = 'M8 48C9 36 16 31 24 31C32 31 39 36 40 48Z';
export const CHAPEAUX = {
  tricorne: { d: 'M10 15L24 8L38 15L33 17C28 14 20 14 15 17Z' },
  mantille: { d: 'M17 12.4C16.6 2.6 31.4 2.6 31 12.4C27 10.6 21 10.6 17 12.4ZM15.6 14.6C12.6 22 11.4 30 10.4 37L14.2 35C15 27 15.8 20.6 17.4 15.6ZM32.4 14.6C35.4 22 36.6 30 37.6 37L33.8 35C33 27 32.2 20.6 30.6 15.6Z', peigne: 'M19.6 9.6L20.4 4.8M24 9.2V3.6M28.4 9.6L27.6 4.8' },
  bonnet: { d: 'M15.6 17.4C15 9 22 6 29 9C34 11 37 16 37.4 21.6C35.4 18.6 32 15.4 28 15C24 14.6 19 15.4 16.6 18.4Z', pompon: [37.6, 23.6, 2.6] },
  coroza: { d: 'M17 16L24 0L31 16Z', head: 22 },
  chambergo: { d: 'M3 16.4C3 13.4 45 13.4 45 16.4C45 18.8 3 18.8 3 16.4ZM16 15C16 8.6 32 8.6 32 15Z' },
  montera: { d: 'M14 17.4C11 11 16 8 19.4 12C20.4 6 27.6 6 28.6 12C32 8 37 11 34 17.4C28 15 20 15 14 17.4Z' },
  capuche: { d: 'M24 1.6L33 14C36.6 20 36.6 28 34.4 33L41 48H7L13.6 33C11.4 28 11.4 20 15 14ZM24 15.6A6.4 6.4 0 1 0 24 28.4A6.4 6.4 0 1 0 24 15.6Z', capuche: true },
  cofia: { d: 'M13.8 19.6C11.6 5.6 36.4 5.6 34.2 19.6L32.6 17.8L31 19.8L29.4 17.8L27.8 19.8L26.2 17.8L24.6 19.8L23 17.8L21.4 19.8L19.8 17.8L18.2 19.8L16.6 17.8L15.2 19.8Z' },
  bicorne: { d: 'M5 15.6C11 5 37 5 43 15.6C35 12.4 13 12.4 5 15.6Z' },
  turban: { d: 'M13.6 16.6C12.4 6.4 35.6 6.4 34.4 16.6C30 18.8 18 18.8 13.6 16.6Z', spires: 'M16 12.6C22 9.4 30 10.2 33 13.2M14.8 15.4C22 12.4 30 13.2 34 15.6' },
  boina: { d: 'M12.6 14.4C12.6 9 32 7 39.4 11C41.6 12.4 38.4 14.8 34 15.2C28 15.8 18 15.8 12.6 14.4ZM23.6 8.4L24.4 5.2L25.6 8.2Z' },
  catogan: { d: 'M15.4 18.4C15 10 33 10 32.6 18.4C29 15.4 19 15.4 15.4 18.4ZM12.6 21A2.6 1.9 0 1 0 17.8 21A2.6 1.9 0 1 0 12.6 21ZM12.6 25A2.6 1.9 0 1 0 17.8 25A2.6 1.9 0 1 0 12.6 25ZM30.2 21A2.6 1.9 0 1 0 35.4 21A2.6 1.9 0 1 0 30.2 21ZM30.2 25A2.6 1.9 0 1 0 35.4 25A2.6 1.9 0 1 0 30.2 25ZM31 29.4L37.4 25.6L36.6 32ZM31 29.4L35.6 34.6L30.4 32.4Z' },
};
/** buste dans une boîte 48 ; ink = encre du trait ; mort = contour palier-1 */
export function buste(chapeau, { ink, mort = false, sil = false }) {
  const c = CHAPEAUX[chapeau];
  const hy = c.head ?? 21;
  const tete = `M32 ${hy}A8 8 0 1 1 16 ${hy}A8 8 0 1 1 32 ${hy}Z`;
  if (sil) return `<path d="${EPAULES}" fill="${ink}"/>${c.capuche ? '' : `<path d="${tete}" fill="${ink}"/>`}<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>${c.pompon ? `<circle cx="${c.pompon[0]}" cy="${c.pompon[1]}" r="${c.pompon[2]}" fill="${ink}"/>` : ''}`;
  if (mort) {
    let s = `<path d="${EPAULES}" fill="none" stroke="${K.p1}" stroke-width="1"/><path d="${tete}" fill="none" stroke="${K.p1}" stroke-width="1"/>`;
    s += `<path d="${c.d}" fill="none" stroke="${K.p1}" stroke-width="1" fill-rule="evenodd"/>`;
    return s;
  }
  let s = '';
  if (!c.capuche) {
    s += hach(EPAULES, [0, 24, 48, 24], { pas: 4, sw: 0.8, color: ink }) + `<path d="${EPAULES}" fill="none" stroke="${ink}" stroke-width="1"/>`;
    s += hach(tete, [14, hy - 10, 20, 20], { pas: 6, sw: 0.6, color: ink }) + `<path d="${tete}" fill="none" stroke="${ink}" stroke-width="1"/>`;
  } else {
    s += hach('M24 15.6A6.4 6.4 0 1 0 24 28.4A6.4 6.4 0 1 0 24 15.6Z', [16, 14, 16, 16], { pas: 6, sw: 0.6, color: ink }) + `<circle cx="24" cy="22" r="6.4" fill="none" stroke="${ink}" stroke-width="1"/>`;
  }
  s += `<path d="${c.d}" fill="${ink}" fill-rule="evenodd"/>`;
  if (c.pompon) s += `<circle cx="${c.pompon[0]}" cy="${c.pompon[1]}" r="${c.pompon[2]}" fill="${ink}"/>`;
  if (c.peigne) s += `<path d="${c.peigne}" stroke="${ink}" stroke-width="1"/>`;
  return s;
}

// ---------------------------------------------------------------- le jeton
/**
 * cx, cy : centre du médaillon ; m : diamètre
 * o : { t, siege, nom, statut, moi, mort, choisi, vote, capitaine, lacs, cart:[kind, mot, mort?], brunie (place sous le pouce : sans hachure) }
 */
export function jeton(cx, cy, m, o) {
  const t = o.t, nuit = t.nom === 'cuivre';
  const ink = t.encre;
  const r = m / 2;
  let s = '';
  if (o.moi) {
    const a = r + 7;
    s += `<rect x="${cx - a}" y="${cy - a}" width="${2 * a}" height="${2 * a}" fill="none" stroke="${ink}" stroke-width="1.5"/><rect x="${cx - a + 2.75}" y="${cy - a + 2.75}" width="${2 * a - 5.5}" height="${2 * a - 5.5}" fill="none" stroke="${ink}" stroke-width="0.75"/>`;
  }
  const disque = `M${cx - r + 4} ${cy}A${r - 4} ${r - 4} 0 1 0 ${cx + r - 4} ${cy}A${r - 4} ${r - 4} 0 1 0 ${cx - r + 4} ${cy}Z`;
  if (o.mort) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.surface}" stroke="${t.mortTrait}" stroke-width="1"/>`;
  } else {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.surface}" stroke="${ink}" stroke-width="${o.choisi ? 3.5 : 1.5}"/>`;
    if (!o.brunie) s += hach(disque, [cx - r, cy - r, m, m], { pas: 6, sw: 0.6, color: ink });
    s += `<circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${ink}" stroke-width="0.75"/>`;
  }
  // buste coupé par le disque
  const cid = uid('bu');
  const bs = 0.75 * m;
  s += `<clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r - 4}"/></clipPath><g clip-path="url(#${cid})"><svg x="${cx - bs / 2}" y="${cy - bs / 2 + m * 0.08}" width="${bs}" height="${bs}" viewBox="0 0 48 48">${buste(SIEGES[o.siege].chapeau, { ink, mort: o.mort })}</svg></g>`;
  if (o.choisi) {
    const g = r + 2 + (o.choisi ? 1.75 : 0);
    s += `<path d="M${cx} ${cy - g}V${cy - g - 6}M${cx} ${cy + g}V${cy + g + 6}M${cx - g} ${cy}H${cx - g - 6}M${cx + g} ${cy}H${cx + g + 6}" stroke="${ink}" stroke-width="2.4"/>`;
  }
  if (o.vote) {
    const d = Math.max(16, 0.28 * m);
    const x = cx + 0.35 * m, y = cy - 0.35 * m;
    s += `<circle cx="${x}" cy="${y}" r="${d / 2}" fill="${ink}"/><path d="M${x - d * 0.22} ${y + d * 0.01}L${x - d * 0.06} ${y + d * 0.16}L${x + d * 0.23} ${y - d * 0.16}" fill="none" stroke="${t.surEncre}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (o.capitaine) {
    const bw = 0.8 * m, by = cy + r - 14;
    s += `<path d="M${cx - bw / 2} ${by}H${cx + bw / 2}L${cx + bw / 2 - 5} ${by + 14}H${cx - bw / 2 + 5}Z" fill="${o.mort ? t.surface : ink}" stroke="${o.mort ? t.mortTrait : ink}" stroke-width="1"/><text x="${cx}" y="${by + 11}" text-anchor="middle" font-family="${F.ss}" font-size="12" font-weight="700" fill="${o.mort ? t.mortTexte : t.surEncre}">×2</text>`;
  }
  if (o.lacs) {
    const x = cx - 0.52 * m, y = cy;
    s += `<circle cx="${x}" cy="${y}" r="10" fill="${t.surface}"/><circle cx="${x - 3}" cy="${y}" r="4.6" fill="none" stroke="${t.serment}" stroke-width="1.6"/><circle cx="${x + 3}" cy="${y}" r="4.6" fill="none" stroke="${t.serment}" stroke-width="1.6"/>`;
  }
  // nom et statut
  const fs = m >= 60 ? 15 : 14;
  const ny = cy + r + (o.moi ? 24 : 20);
  const ncol = o.mort ? t.mortTexte : ink;
  s += `<text x="${cx}" y="${ny}" text-anchor="middle" font-family="${F.ss}" font-size="${fs}" font-weight="${o.moi ? 700 : 600}" fill="${ncol}"${o.choisi ? ' text-decoration="underline"' : ''}>${o.nom}</text>`;
  if (o.mort) {
    const tw = o.nom.length * fs * 0.52;
    s += `<path d="M${cx - tw / 2} ${ny - fs * 0.32}H${cx + tw / 2}" stroke="${t.mortTexte}" stroke-width="1"/>`;
  }
  if (o.cart) {
    const [kind, mot, cm] = o.cart;
    const cw = Math.max(64, mot.length * 7 + 18);
    s += cartouche(kind, cx - cw / 2, ny + 4, cw, 20, mot, t, { fs: 12, mort: !!cm });
  } else if (o.statut) {
    s += `<text x="${cx}" y="${ny + 16}" text-anchor="middle" font-family="${F.ss}" font-size="12" font-weight="${o.statut === 'votre choix' ? 600 : 400}" fill="${o.statut === 'votre choix' ? ink : t.encre2}">${o.statut}</text>`;
  }
  return s;
}

/** grille D2 (12 joueurs) ; etats : { [siege]: {...} } ; renvoie un <svg> de la zone de place */
export function placeD2({ t, etats = {}, y0 = 255, h = 415, w = 390, voile = false }) {
  const m = 60, cw = 85, ch = 104, gx = 6, gy = 8;
  const top = 8 + (399 - (3 * ch + 2 * gy)) / 2;
  let s = '';
  for (let i = 1; i <= 12; i++) {
    const col = (i - 1) % 4, row = Math.floor((i - 1) / 4);
    const x = 16 + col * (cw + gx), y = top + row * (ch + gy);
    const e = etats[i] ?? {};
    s += jeton(x + cw / 2, y + 6 + m / 2, m, { t, siege: i, nom: SIEGES[i].nom, ...e });
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: ${y0}px;" role="img" aria-label="La place : douze sièges">${s}</svg>`;
}

/** coque d'un écran mobile 390 × 844 */
export function coque(t, seed = 1) {
  return t.nom === 'cuivre' ? { bg: BG_CUIVRE, base: grainCuivre(390, 844) } : { bg: BG_PAPIER, base: grainPapier(390, 844, seed) };
}
