// Icônes (grille 24), glyphes d'état (grille 16) et symboles de rôle (grille 32).
// Tout en currentColor. Conventions des icônes : le <svg class="ic"> porteur fixe
// fill:none ; stroke:currentColor ; stroke-width:1.5 ; caps/joins ronds.
import { n } from './lib.mjs';

const P = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
const pt = ([x, y]) => `${n(x)} ${n(y)}`;
const FILL = 'fill="currentColor" stroke="none"';

/** Trait de burin : fuseau effilé à l'entrée, arrondi à la sortie. */
function burin(x0, y, x1, w = 1.9) {
  const L = x1 - x0, e = 0.75;
  return `M${n(x0)} ${n(y)} C${n(x0 + L * 0.28)} ${n(y - w / 2)} ${n(x0 + L * 0.62)} ${n(y - w / 2)} ${n(x1 - e)} ${n(y - e)} A${e} ${e} 0 0 1 ${n(x1 - e)} ${n(y + e)} C${n(x0 + L * 0.62)} ${n(y + w / 2)} ${n(x0 + L * 0.28)} ${n(y + w / 2)} ${n(x0)} ${n(y)} Z`;
}

/** Cordes à 45° d'un cercle (hachure calculée, sans motif). */
function cordes(cx, cy, r, pas, decal = 0) {
  let d = '';
  for (let s = -r + pas / 2 + decal; s < r; s += pas) {
    const h = Math.sqrt(r * r - s * s);
    const mx = cx + s * Math.SQRT1_2, my = cy + s * Math.SQRT1_2;
    d += `M${n(mx - h * Math.SQRT1_2)} ${n(my + h * Math.SQRT1_2)}L${n(mx + h * Math.SQRT1_2)} ${n(my - h * Math.SQRT1_2)}`;
  }
  return d;
}

/** Lignes à 45° couvrant une boîte (à découper par un clipPath). */
function lignes45(x0, y0, x1, y1, pas) {
  let d = '';
  for (let c = x0 + y0; c <= x1 + y1 + pas; c += pas) d += `M${n(x0)} ${n(c - x0)}L${n(x1)} ${n(c - x1)}`;
  return d;
}

function anneauxEntrelaces(ax, bx, cy, r, ecart = 17) {
  const dx = (bx - ax) / 2;
  const a = (Math.atan2(Math.sqrt(r * r - dx * dx), dx) * 180) / Math.PI; // angle du croisement bas, vu de A
  // A passe dessous au croisement bas (lacune autour de +a) ; B passe dessous en haut (lacune autour de 180+a côté B, soit -180+a… )
  const A0 = P(ax, cy, r, a + ecart), A1 = P(ax, cy, r, a - ecart + 360);
  const bTop = -(180 - a); // croisement haut vu de B
  const B0 = P(bx, cy, r, bTop + ecart), B1 = P(bx, cy, r, bTop - ecart + 360);
  return `<path d="M${pt(A0)} A${r} ${r} 0 1 1 ${pt(A1)}"/><path d="M${pt(B0)} A${r} ${r} 0 1 1 ${pt(B1)}"/>`;
}

function molette() {
  let d = '';
  let k = '';
  for (let i = 0; i < 6; i++) {
    const a = 15 + i * 60;
    d += `M${pt(P(12, 12, 2.3, a))}L${pt(P(12, 12, 8.2, a))}`;
    const [x, y] = P(12, 12, 8.9, a);
    k += `<circle cx="${n(x)}" cy="${n(y)}" r="1.1" ${FILL}/>`;
  }
  return `<circle cx="12" cy="12" r="2.3"/><circle cx="12" cy="12" r="6"/><path d="${d}"/>${k}`;
}

const SON = `<path d="M5.5 17.5c1.6-1.4 1.6-4.4 2-7.4C8 7 9.8 5.4 12 5.4s4 1.6 4.5 4.7c.4 3 .4 6 2 7.4z"/><path d="M12 5.4V3.2"/><circle cx="12" cy="19.7" r="1.4"/><path stroke-width=".75" d="M8.4 15.8l1.6-1.6M8.7 12.8l1.6-1.6M9.3 9.8l1.3-1.3"/>`;
const FIOLE_DROITE = 'M10.4 3.8v3c-1.6.8-2.2 2-2.2 3.4v9c0 1.2.8 1.8 2 1.8h3.6c1.2 0 2-.6 2-1.8v-9c0-1.4-.6-2.6-2.2-3.4v-3';
const FIOLE_RONDE = 'M10.4 3.8v4a6.2 6.2 0 1 0 3.2 0v-4';
const BOUCLIER = 'M7.2 3h9.6l3 3v6.4c0 4.2-3.4 7.4-7.8 9.2-4.4-1.8-7.8-5-7.8-9.2V6z';

export const ICONES = [
  { id: 'menu', nom: 'menu', motif: 'trois traits de burin (16, 13, 15)', svg: `<path ${FILL} d="${burin(4, 7, 20)}${burin(4.6, 12, 17.6)}${burin(4.2, 17, 19.2)}"/>` },
  { id: 'carte', nom: 'ma carte', motif: 'carte au dos hachuré, coin corné', svg: `<path d="M6 3h8.5L18 6.5V21H6z"/><path d="M14.5 3v3.5H18"/><path stroke-width=".75" d="M8.2 17.6l6.6-6.6M8.2 13.8l4.4-4.4M10.8 19l5.2-5.2"/>` },
  { id: 'regles', nom: 'règles', motif: 'livret ouvert, deux pages lignées', svg: `<path d="M12 6.2C9.6 4.8 6 4.6 3 5.4V19c3-.8 6.6-.6 9 .9 2.4-1.5 6-1.7 9-.9V5.4c-3-.8-6.6-.6-9 .8zM12 6.2v13.7"/><path stroke-width=".75" d="M5.4 9.2h4.2M5.4 12h4.2M5.4 14.8h3M14.4 9.2h4.2M14.4 12h4.2M14.4 14.8h4.2"/>` },
  { id: 'reglages', nom: 'réglages', motif: 'molette de presse : six rayons, moyeu', svg: molette() },
  { id: 'son', nom: 'son', motif: 'cloche à battant', svg: SON },
  { id: 'son-coupe', nom: 'son coupé', motif: 'la cloche barrée', svg: SON + `<path d="M3.6 3.6l16.8 16.8"/>` },
  { id: 'quitter', nom: 'quitter', motif: 'porte entrouverte, flèche qui sort', svg: `<path d="M3.5 21.5h9.5M13.5 9V3H4.5v18.5M13.5 15v6.5"/><path d="M4.5 3l5 1.8v17.2l-5-.5"/><circle cx="8.2" cy="13.4" r=".8" ${FILL}/><path d="M11.6 12h9.6M18.4 9.2L21.2 12l-2.8 2.8"/>` },
  { id: 'fil', nom: 'fil', motif: 'phylactère : banderole ondulée, deux lignes', svg: `<path d="M5 7.5c3-1.6 5.6 1.6 8.6 0s5-1.4 6.4 0v8c-1.4-1.4-3.4-1.6-6.4 0s-5.6-1.6-8.6 0z"/><path d="M5 7.5C3.4 7.5 2.6 8.6 3 10c.3 1 1.4 1.2 2 .6M20 15.5c1.6 0 2.4 1.1 2 2.5-.3 1-1.4 1.2-2 .6"/><path stroke-width=".75" d="M7.6 10.6c2-.8 3.6.8 5.6 0s3.2-.6 4.4 0M7.6 13.4c2-.8 3.6.8 5.6 0"/>` },
  { id: 'envoyer', nom: 'envoyer', motif: 'plume d’oie qui écrit', svg: `<path d="M20 3c-5.4.8-9.6 4.4-11.2 9.6l1.4 1.6c5.2-1.4 9.4-5.8 9.8-11.2z"/><path d="M8.8 14.2l-2.4 4.6"/><path stroke-width=".75" d="M12.6 9.6l1.6 1.4M15.2 7l1.2 1.4M17.6 4.8l.9 1.2"/><path d="M3 21c2.2-.8 4.2.6 6.2-.2s3.4-.6 5 0"/>` },
  { id: 'voter', nom: 'voter', motif: 'index pointé (l’accusation)', svg: `<path d="M2.5 8.6h3v8.8h-3z"/><path d="M5.5 9.3c1.5-.9 3.2-1.2 4.8-.9H20c1.4 0 1.4 2.6 0 2.6h-6.4c1.3 0 2 .7 2 1.6 0 .8-.6 1.5-1.6 1.5h-.4c.9 0 1.5.7 1.5 1.5s-.6 1.5-1.5 1.5H8.8c-1.4 0-2.5-.3-3.3-.8"/><path stroke-width="1" d="M11.4 11c-1.1.3-1.8 1-1.8 2M12.2 14.1h1.4"/>` },
  { id: 'abstenir', nom: 's’abstenir', motif: 'main ouverte, paume face', svg: `<path d="M8.2 21.6v-3.4L5.2 15c-.9-.9-.4-2.6 1-2.1l1.6 1.3V7.6a1.1 1.1 0 0 1 2.2 0v4.2V5.4a1.2 1.2 0 0 1 2.4 0v6.2V6a1.2 1.2 0 0 1 2.4 0v5.8V8a1.1 1.1 0 0 1 2.2 0v8c0 2-.4 3.2-1 4v1.6"/><path stroke-width=".75" d="M10.2 16c1.6.8 3.4.8 5 0"/>` },
  { id: 'aucun', nom: 'ne viser personne', motif: 'mire vide barrée', svg: `<circle cx="12" cy="12" r="6"/><path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3"/><path d="M5.2 18.8L18.8 5.2"/>` },
  { id: 'viser', nom: 'viser (Chasseur)', motif: 'mire : cercle et quatre repères', svg: `<circle cx="12" cy="12" r="6"/><path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3"/><circle cx="12" cy="12" r="1.2" ${FILL}/>` },
  { id: 'vie', nom: 'potion de vie', motif: 'fiole droite pleine, contenu en réserve', svg: `<path d="${FIOLE_DROITE}"/><path d="M9.4 3.8h5.2"/><path ${FILL} d="M10.3 1.4h3.4l-.3 2h-2.8z"/><path stroke-width=".75" d="M8.4 10.8c2.4.7 4.8.7 7.2 0M14.3 12.8v5.2"/>` },
  { id: 'mort', nom: 'potion de mort', motif: 'fiole à l’aconit, contenu en hachure serrée', svg: `<path d="${FIOLE_RONDE}"/><path d="M9.4 3.8h5.2"/><path ${FILL} d="M10.3 1.4h3.4l-.3 2h-2.8z"/><path stroke-width=".9" d="${cordes(12, 13.8, 4.6, 2.3)}"/>` },
  { id: 'vie-epuisee', nom: 'potion de vie épuisée', motif: 'fiole droite en pointillé, vide', svg: `<path stroke-dasharray="2 2" d="${FIOLE_DROITE}"/><path d="M9.4 3.8h5.2"/>` },
  { id: 'mort-epuisee', nom: 'potion de mort épuisée', motif: 'fiole ronde en pointillé, vide', svg: `<path stroke-dasharray="2 2" d="${FIOLE_RONDE}"/><path d="M9.4 3.8h5.2"/>` },
  { id: 'bouclier', nom: 'bouclier', motif: 'écu à pans coupés (le cartouche du village)', svg: `<path d="${BOUCLIER}"/><path stroke-width=".75" d="M5.8 15.6l5-5M7.4 18.4l3.8-3.8M5 12.2l3.8-3.8"/>` },
  { id: 'bouclier-barre', nom: 'bouclier barré', motif: 'le même, trait oblique — « interdit »', svg: `<path d="${BOUCLIER}"/><path stroke-width=".75" d="M5.8 15.6l5-5M7.4 18.4l3.8-3.8M5 12.2l3.8-3.8"/><path d="M3.4 20.6L20.6 3.4"/>` },
  { id: 'oeil', nom: 'œil (sonder)', motif: 'amande, pupille pleine, cinq cils', svg: `<path d="M2.8 12.4C6.6 7.2 17.4 7.2 21.2 12.4 17.4 17.6 6.6 17.6 2.8 12.4z"/><circle cx="12" cy="12.4" r="3.1"/><circle cx="12" cy="12.4" r="1.5" ${FILL}/><path stroke-width="1" d="M6.4 9.4L5.2 7.6M9 8.2l-.7-2M12 7.8V5.6M15 8.2l.7-2M17.6 9.4l1.2-1.8"/>` },
  { id: 'lacs', nom: 'lacs', motif: 'deux anneaux entrelacés (serment)', svg: anneauxEntrelaces(9, 15, 12, 5.4) },
  { id: 'brassard', nom: 'brassard', motif: 'trapèze « ×2 » (capitaine)', svg: `<path d="M3 7.4h18l-2.2 9.2H5.2z"/><path stroke-width="1.3" d="M8 10.2l3 3.6M11 10.2l-3 3.6M13.6 10.8c.3-.9 1.1-1.4 2-1.4 1.1 0 1.9.8 1.9 1.7 0 1.4-2.4 2.4-3.9 3.9h4.1"/>` },
  { id: 'plume', nom: 'plume (marquer)', motif: 'plume de corbeau', svg: `<path d="M18.8 3.2c-5.6.6-9.8 4.6-11.4 10.4l1.2 3c6.8-2 10.6-7.4 10.2-13.4zM12.4 13.2l1.4.8"/><path d="M18.8 3.2C12.6 6.4 8.4 12.4 5.2 20.8"/><path stroke-width=".75" d="M9.4 10.8l2.6 1.2M11.2 8.4l2.6 1.1M13.4 6.4l2.4 1"/>` },
  { id: 'machoire', nom: 'mâchoire (trahir)', motif: 'mâchoire ouverte, dents mordues', svg: `<path d="M3 10.8C4.4 6 8 3.6 12 3.6s7.6 2.4 9 7.2"/><path d="M3 10.8l1.6 2.6 1.4-2.2 1.8 3 1.4-2.6 1.6 3.4 1.2-3.2 1.8 3 1.4-2.8 1.6 2.6 1.4-2.2 1.2 1.6"/><path d="M4 15.6c1.4 3.4 4.4 5 8 5s6.6-1.6 8-5"/><path d="M4 15.6l1.6-2 1.4 1.6 1.6-2.6 1.4 2.4 1.6-2.8 1.2 2.6 1.8-2.4 1.4 2 1.4-2 1.6 1.4.4.4"/>` },
  { id: 'porte', nom: 'porte entrouverte', motif: 'porte, rai de lumière en hachure (Petite Fille)', svg: `<path d="M3 21.5h18M5 21.5v-19h11v19"/><path d="M5 2.5l8 1.4v17.6"/><circle cx="11" cy="12.6" r=".8" ${FILL}/><path stroke-width=".75" d="M14.6 19.6l5 1.3M14.6 16.4l5.6 3M14.6 13.2l5.8 4.6"/>` },
  { id: 'chandelle', nom: 'chandelle soufflée', motif: 'chandelle, deux volutes de fumée (mort)', svg: `<path d="M10 9.8h4v10.4h-4z"/><path d="M6.4 20.4h11.2M8 20.6c0 1 1.6 1.4 4 1.4s4-.4 4-1.4M12 9.8V8.2"/><path stroke-width="1" d="M11.8 7.4c-1.2-1.4.8-2.4-.4-4.2M13.2 7c1.4-1 .6-2.4 1.8-3.8"/><path stroke-width=".75" d="M14 11.8c-.6.6-.6 1.8 0 2.4"/>` },
  { id: 'corde', nom: 'corde coupée', motif: 'nœud coulant tranché (gracié)', svg: `<path d="M12 2.4v4.2M12 9.2v.4"/><path stroke-width="1" d="M11.2 6.8l-.6 1M12.8 6.8l.6 1M8.4 9l7.2-2.6"/><path d="M10.4 9.8h3.2v4.8h-3.2zM10.4 11.4h3.2M10.4 13h3.2"/><path d="M10.6 14.6c-3 .5-4.6 2.4-4.6 4.2 0 2 2.6 3 6 3s6-1 6-3c0-1.8-1.6-3.7-4.6-4.2"/>` },
  { id: 'sablier', nom: 'sablier', motif: 'sable en hachure ; retourné en urgence', svg: `<path d="M5 3.4h14M5 20.6h14M7 3.4c0 4.6 4 6.4 4 8.6s-4 4-4 8.6M17 3.4c0 4.6-4 6.4-4 8.6s4 4 4 8.6"/><path stroke-width=".75" d="M12 12.8v4.4M8.4 20.4c.7-2 2-3.1 3.6-3.4 1.6.3 2.9 1.4 3.6 3.4M10.2 19.4l1.6-1.6M12.4 19.6l1.6-1.6"/>` },
  { id: 'registre', nom: 'registre', motif: 'livre fermé à fermoir (journal)', svg: `<path d="M6.2 3.4H18v17.2H6.2c-1.2 0-2.2-.9-2.2-2.1V5.6c0-1.3 1-2.2 2.2-2.2zM6.2 3.4v17.2"/><path d="M15.2 10.4h5.4v3.2h-5.4z"/><path stroke-width=".75" d="M8.6 6.6h5.2v3h-5.2z"/>` },
  { id: 'aide', nom: 'aide', motif: '« ? » dans un écu', svg: `<path d="${BOUCLIER}"/><path d="M9.6 9.4c0-1.6 1.1-2.6 2.5-2.6s2.5.9 2.5 2.2c0 1.9-2.5 2.2-2.5 4.4"/><circle cx="12.1" cy="16.4" r="1" ${FILL}/>` },
  { id: 'renoue', nom: 'reconnexion', motif: 'fil renoué', svg: `<path d="M2.6 15.2c2.6-.4 4.4-2 6.4-3.4"/><path d="M9 11.8c1-1.6 3.6-1.8 4.2-.2.5 1.4-1.4 2.4-2.6 1.6-1-.7-.4-2.4.8-2.6"/><path d="M13.2 11.4c2.4-.8 4.2.2 5.6 1.6.9.9 1.8 1.4 2.6 1.4"/><path stroke-width="1" d="M11 13.6l-.8 2.2M12.4 13.8l1 2"/>` },
  { id: 'coupe', nom: 'hors ligne', motif: 'fil coupé', svg: `<path d="M2.6 15.2c2.6-.4 4.4-2 6.6-3"/><path d="M14.8 11.8c2.2-.6 3.8.4 5 1.4.8.7 1.6 1.2 2.6 1.2"/><path stroke-width="1" d="M9.2 12.2l.9-1.4M9.2 12.2l1.4.2M9.2 12.2l.7 1.2M14.8 11.8l-1-.9M14.8 11.8l-1.2.6M14.8 11.8l-.4 1.3"/>` },
  { id: 'pate', nom: 'pâté d’encre', motif: 'tache irrégulière (avis d’erreur)', svg: `<path ${FILL} d="M11.6 7.2c1.4-.8 2.4.6 3.4.4 1.4-.2 2.6.8 2.4 2.2-.1 1 .9 1.6.6 2.8-.3 1.4-1.6 1.4-1.8 2.6-.2 1.4-1.4 2.6-3 2.2-1.2-.3-1.6.8-2.8.4-1.4-.5-1.2-1.8-2.2-2.6-1.2-.9-1-2.6.2-3.2 1-.5.6-1.8 1.4-2.6.6-.6 1.2-.6 1.8-.2z"/><circle cx="5.6" cy="8.4" r=".9" ${FILL}/><circle cx="18.6" cy="17.8" r=".7" ${FILL}/><circle cx="17.8" cy="5.6" r=".6" ${FILL}/><circle cx="6.4" cy="18.2" r=".5" ${FILL}/>` },
];
export const IC = Object.fromEntries(ICONES.map((i) => [i.id, i.svg]));

/** <svg> d'icône prêt à poser. */
export function icone(idOrSvg, taille = 24, couleur = 'currentColor', extra = '') {
  const inner = IC[idOrSvg] ?? idOrSvg;
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" aria-hidden="true" style="display: block; color: ${couleur}; flex: none;" ${extra}><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}
/** Groupe d'icône à poser dans un SVG parent (x, y, taille). */
export function icg(idOrSvg, x, y, taille = 24, couleur = 'currentColor', sw = 1.5) {
  const inner = IC[idOrSvg] ?? idOrSvg;
  const s = taille / 24;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" color="${couleur}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

/* ===================== Glyphes d'état — grille 16, trait 1,25 ===================== */
export const GLYPHES = [
  { id: 'sceau', nom: 'a voté', svg: `<circle cx="8" cy="8" r="7.5" ${FILL}/><path d="M4.5 8.2L7 10.6l4.6-5.2" stroke="SURENCRE" stroke-width="1.8"/>` },
  { id: 'chandelle', nom: 'mort (crieur)', svg: `<path d="M6 15V7h4v8z"/><path stroke-width=".9" d="M8 6c-1-1.5 1-2.5 0-4.5M8.8 5.5c1.2-1 .6-2.5 1.6-3.5"/><path d="M4 15h8"/>` },
  { id: 'corde', nom: 'gracié', svg: `<path d="M8 1v5.5M8 9.5V11"/><path stroke-width="1" d="M6.2 6.6l3.6 2.8"/><circle cx="8" cy="13" r="2"/>` },
  { id: 'horsvote', nom: 'hors vote', svg: `<path d="M1.5 5.5H10c1 0 1 2 0 2H6M10 5.5c2.5 0 4 1.5 4 4V11c0 1.8-1.2 3-3 3H7.5C6 14 5 13 5 11.5v-4"/><path stroke-width="1.5" d="M2 14.5L14.5 2"/>` },
  { id: 'chaise', nom: 'absent', svg: `<path stroke-linecap="square" d="M5 1.5h5V9M5 1.5V15M5 9h7.5M12.5 9v6M10 9v4"/>` },
  { id: 'index', nom: 'votera', svg: `<path d="M1.5 5.5H10c1 0 1 2 0 2H6M10 5.5c2.5 0 4 1.5 4 4V11c0 1.8-1.2 3-3 3H7.5C6 14 5 13 5 11.5v-4M7.5 10.5h4"/>` },
  { id: 'lacs', nom: 'lié·e', svg: `<circle cx="6" cy="8" r="4.2" stroke-width="1.6"/><circle cx="10" cy="8" r="4.2" stroke-width="1.6"/>` },
  { id: 'plume', nom: 'marqué', svg: `<path d="M14 2C8 3 4 7 2.5 14M14 2c-1 5-5 9-10 9.5"/><path stroke-width=".75" d="M6 9.5l3-3M7.5 10.5l3-3"/>` },
  { id: 'bouclier-barre', nom: 'interdit (« hier »)', svg: `<path d="M4.8 1.8h6.4l2 2V8.4c0 2.8-2.2 4.8-5.2 6-3-1.2-5.2-3.2-5.2-6V3.8z"/><path stroke-width="1.4" d="M2 14.4L14 2"/>` },
  { id: 'oeil', nom: 'œil (Petite Fille)', svg: `<path d="M1.5 8C4 4.6 12 4.6 14.5 8 12 11.4 4 11.4 1.5 8z"/><circle cx="8" cy="8" r="2.2" ${FILL}/>` },
  { id: 'pate', nom: 'refusé', svg: `<path ${FILL} d="M7.6 3.4c1-.6 1.7.4 2.4.3 1-.1 1.8.6 1.7 1.6 0 .7.6 1.1.4 2-.2 1-1.1 1-1.3 1.8-.1 1-1 1.8-2.1 1.6-.8-.2-1.1.6-2 .3-1-.4-.8-1.3-1.5-1.8-.8-.6-.7-1.8.1-2.2.7-.4.4-1.3 1-1.8.4-.4.8-.4 1.3-.1z"/><circle cx="3.2" cy="4.2" r=".7" ${FILL}/><circle cx="12.8" cy="12.6" r=".55" ${FILL}/>` },
];
export const GL = Object.fromEntries(GLYPHES.map((g) => [g.id, g.svg]));
export function glg(id, x, y, taille = 16, couleur = 'currentColor', surEncre) {
  const s = taille / 16;
  let inner = GL[id];
  inner = inner.replace('SURENCRE', surEncre || '#F5EFE2');
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" color="${couleur}" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

/* ===================== Symboles de rôle — grille 32 ===================== */
// Chaque symbole : fonction (pref, simple) → contenu SVG en currentColor.
// simple = version 16 px : sans hachure, trait épaissi (1,5 px rendu), détails retirés.

const LOUP_D = 'M11 4.2 C13 3.4 14.8 3 16.2 3.2 L16.8 4.2 L17.6 3.3 C19.8 3.6 21.6 4.6 22.6 6 C24 7.6 24.2 9 24.6 10.2 L28 15.6 L25.6 16.6 C26.4 17.4 26.6 18 25.6 18.6 L26 20.2 C25.6 21.6 25 23.2 23.4 24 L22.4 23.6 L21.8 24.6 C20.8 24.8 19.8 24.8 19.2 25 L19.4 29.4 H10.4 L10.8 26.6 L8.6 25.4 L9.4 23.2 L6.8 21.8 L8 19.6 L5.4 17 L7.2 15.2 L5.2 12.4 L7.4 10.8 L6.2 8 L8.6 7.2 L8.8 5 Z';
const LOUP_OEIL = 'M17.4 11.6 C18.8 10.6 21.4 10.4 24 11 C21.6 12.1 19 12.3 17.4 11.6 Z';
const LOUP_OEIL_S = 'M16.6 11.8 C18.4 9.8 21.8 9.6 24.4 10.8 C21.8 13 18.6 13.2 16.6 11.8 Z';
const LOUPB_D = 'M11 4.2 C13 3.4 14.8 3 16.2 3.2 L16.8 4.2 L17.6 3.3 C19.8 3.6 21.6 4.6 22.6 6 L23.6 7 L23.2 8.2 C24 8.8 24.2 9.4 24.6 10.2 L26.2 12.6 L27.4 12.8 L28 15.6 L25.6 16.6 C26.4 17.4 26.6 18 25.6 18.6 L26 20.2 L24.8 21 C25 22.4 24.6 23.4 23.4 24 L22.4 23.6 L21.8 24.6 C20.8 24.8 19.8 24.8 19.2 25 L19.4 29.4 H10.4 L10.8 26.6 L8.6 25.4 L9.4 23.2 L6.8 21.8 L8 19.6 L5.4 17 L7.2 15.2 L5.2 12.4 L7.4 10.8 L6.2 8 L8.6 7.2 L8.8 5 Z';

function cupidonFleche(simple) {
  // empennage : trois barbes de part et d'autre de la hampe (axe à 45°)
  const u = [Math.SQRT1_2, -Math.SQRT1_2], v = [Math.SQRT1_2, Math.SQRT1_2];
  let d = '';
  const nb = simple ? 2 : 3;
  for (let i = 0; i < nb; i++) {
    const t = 1.2 + i * 2.1;
    const p = [5 + u[0] * t, 27 + u[1] * t];
    const q1 = [p[0] - u[0] * 2.2 - v[0] * 2.4, p[1] - u[1] * 2.2 - v[1] * 2.4];
    const q2 = [p[0] - u[0] * 2.2 + v[0] * 2.4, p[1] - u[1] * 2.2 + v[1] * 2.4];
    d += `M${pt(q1)}L${pt(p)}L${pt(q2)}`;
  }
  return d;
}
function coeur(cx, cy) {
  return `M${n(cx)} ${n(cy + 3.6)} C${n(cx - 1)} ${n(cy + 2.6)} ${n(cx - 4)} ${n(cy + 0.6)} ${n(cx - 4)} ${n(cy - 1.6)} C${n(cx - 4)} ${n(cy - 3.4)} ${n(cx - 2.6)} ${n(cy - 4)} ${n(cx - 1.6)} ${n(cy - 4)} C${n(cx - 0.8)} ${n(cy - 4)} ${n(cx - 0.2)} ${n(cy - 3.4)} ${n(cx)} ${n(cy - 2.6)} C${n(cx + 0.2)} ${n(cy - 3.4)} ${n(cx + 0.8)} ${n(cy - 4)} ${n(cx + 1.6)} ${n(cy - 4)} C${n(cx + 2.6)} ${n(cy - 4)} ${n(cx + 4)} ${n(cy - 3.4)} ${n(cx + 4)} ${n(cy - 1.6)} C${n(cx + 4)} ${n(cy + 0.6)} ${n(cx + 1)} ${n(cy + 2.6)} ${n(cx)} ${n(cy + 3.6)} Z`;
}

const IDIOT_BONNET = 'M8 21.8 C7.6 13.4 11.4 6.6 18 5.6 C23.6 4.8 27.6 8.4 27.6 15.4 C26.4 13.4 24.6 12.2 22.8 12.8 C21.4 13.6 22.8 17.8 24 21.8 Z';
const ANCIEN_CORPS = 'M15.6 12.8 C13.2 10.6 10 10.8 8.8 13.8 C7.8 16.4 8 20.6 7.6 24.4 H17.2 C16.4 21.6 16 17.8 16.8 14.6 Z';
const CORBEAU_D = 'M3.4 11.4 L8.8 8.8 C10.4 6.8 13.4 6 15.8 7.4 C18.2 8.8 20.6 12.2 24 15.8 L30 19.8 L28.8 20.8 L30.2 22 L28.4 22.8 L29 24.6 L22.6 21.2 C20 22.2 16.6 22.2 13.6 20.8 C10.6 19.4 9 16.4 8.8 13.2 Z';
const PF_CAPUCHON = 'M16 3 C10.4 3 7.4 8.4 7 14.4 C6.6 20 5.4 25 3.6 29 H28.4 C26.6 25 25.4 20 25 14.4 C24.6 8.4 21.6 3 16 3 Z';
const PF_VISAGE = 'M16 10 C12.4 10 10.8 12.8 10.8 16.2 C10.8 19.8 12.8 22.6 16 22.6 C19.2 22.6 21.2 19.8 21.2 16.2 C21.2 12.8 19.6 10 16 10 Z';
const ACONIT = 'M13.8 24.8 C12.8 21.4 13.6 17.8 16.2 17 C18.8 16.6 20 18.8 19.4 20.8 C20.8 21.2 20.6 23.4 19.2 24 L18.8 25.2 H14.2 Z';

const W = (d, sw, extra = '') => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const M = (d, extra = '') => `<path d="${d}" fill="currentColor" ${extra}/>`;

export const SYMBOLES = [
  { id: 'villageois', n: 1, nom: 'Villageois·e', camp: 'village',
    f: (p, s) => `<g transform="rotate(8 16 16)">${W('M16 30 V13.6', s ? 3 : 2)}${W('M7.5 6.6 V10.6 C7.5 12.6 9 13.6 11 13.6 H21 C23 13.6 24.5 12.6 24.5 10.6 V6.6 M16 13.6 V6.6', s ? 3 : 2)}${M('M6.4 6.8 L7.5 2.6 L8.6 6.8 Z M14.9 6.8 L16 2.4 L17.1 6.8 Z M23.4 6.8 L24.5 2.6 L25.6 6.8 Z')}${s ? '' : W('M14.6 15.6 H17.4 M14.6 17.4 H17.4', 1)}</g>` },
  { id: 'loup', n: 2, nom: 'Loup-garou', camp: 'meute',
    f: (p, s) => M(`${LOUP_D} ${s ? LOUP_OEIL_S : LOUP_OEIL}`, 'fill-rule="evenodd"') + (s ? '' : '<circle cx="4.2" cy="20.8" r=".6" fill="currentColor"/><circle cx="6.6" cy="27.2" r=".5" fill="currentColor"/><circle cx="3.8" cy="9.6" r=".45" fill="currentColor"/>') },
  { id: 'voyante', n: 3, nom: 'la Voyante', camp: 'village',
    f: (p, s) => W('M10.8 30 V25.4 L6.6 21 C5.4 19.8 6 17.6 7.8 18.2 L9.8 19.8 V9.8 A1.4 1.4 0 0 1 12.6 9.8 V15.4 V6.6 A1.5 1.5 0 0 1 15.6 6.6 V15.2 V7.4 A1.5 1.5 0 0 1 18.6 7.4 V15.6 V10.8 A1.4 1.4 0 0 1 21.4 10.8 V21.4 C21.4 24 20.8 25.6 20.2 26.4 V30', s ? 2.6 : 1.5) +
      (s ? W('M11.4 21.6 C13.4 19.4 17.8 19.4 19.8 21.6 C17.8 23.8 13.4 23.8 11.4 21.6 Z', 2) + `<circle cx="15.6" cy="21.6" r="1.6" fill="currentColor"/>`
         : W('M10.6 21.4 C13 18.8 18.2 18.8 20.6 21.4 C18.2 24 13 24 10.6 21.4 Z', 1.2) + `<circle cx="15.6" cy="21.4" r="1.5" fill="currentColor"/>` + W('M10.8 27.8 H20.2', 0.75)) },
  { id: 'sorciere', n: 4, nom: 'la Sorcière', camp: 'village',
    f: (p, s) => W('M14 8.4 V14.4 A7 7 0 1 0 18 14.4 V8.4', s ? 3 : 1.6) + W('M12.8 8.4 H19.2', s ? 2.6 : 1.6) + M('M14.2 3.6 H17.8 L17.4 7.6 H14.6 Z') +
      (s ? W('M16.2 17.4 V25', 2.2) + M('M14 19.4 C14 17 15.4 16 16.6 16.2 C18.2 16.6 18.6 18.6 17.8 19.8 Z')
         : `<mask id="${p}-m"><rect x="0" y="0" width="32" height="32" fill="#fff"/><path d="${ACONIT}" fill="#000" stroke="#000" stroke-width="1.6"/></mask>` +
           W(cordes(16, 21, 6.1, 3), 0.8, `mask="url(#${p}-m)"`) + W(ACONIT, 1.1) + W('M16.4 25.2 V27.4', 1)) },
  { id: 'chasseur', n: 5, nom: 'le Chasseur', camp: 'village',
    f: (p, s) => W('M19.9 12.2 A9 9 0 1 1 17.5 10.2 C16.6 10.9 16.2 11.8 16 12.8 A6 6 0 1 1 7.4 20 L3.8 21.4', s ? 3 : 2) +
      W('M19.9 12.2 C22.6 10.8 25 9.2 27.6 7.8 M20.7 13.9 C23 14.6 25.4 15.8 27.6 17.6', s ? 2.6 : 1.6) +
      W('M27.6 7.8 A2.2 4.9 0 0 1 27.6 17.6 A2.2 4.9 0 0 1 27.6 7.8 Z', s ? 2.4 : 1.4) +
      (s ? '' : W('M23.4 11.2 C24.3 12.5 24.3 14 23.6 15 M25.2 10.2 C26.3 12 26.3 14.4 25.4 16', 0.75) + W('M3 20.2 L3.6 22.8', 1.2)) },
  { id: 'cupidon', n: 6, nom: 'Cupidon', camp: 'village',
    f: (p, s) => W(coeur(12.2, 20.2) + coeur(19.4, 13), s ? 2.4 : 1.5) + W('M5 27 L24.6 7.4', s ? 2.6 : 1.6) + M('M27.8 4.2 L21.6 6.2 L25.8 10.4 Z') + W(cupidonFleche(s), s ? 2 : 1.1) },
  { id: 'salvateur', n: 7, nom: 'le Salvateur', camp: 'village',
    f: (p, s) => W('M7 29 V12 A9 9 0 0 1 25 12 V29 Z', s ? 3 : 1.6) + W('M7.6 24.4 L22.6 9.6 L24.6 11.8 L9.6 26.6 Z', s ? 2.4 : 1.3) +
      (s ? '' : W('M13 3.9 V18.6 M13 23.6 V29 M19 3.9 V12.6 M19 17.6 V29', 0.75) + '<circle cx="11.6" cy="22.4" r="1" fill="currentColor"/><circle cx="20.6" cy="13.4" r="1" fill="currentColor"/>') },
  { id: 'idiot', n: 8, nom: 'l’Idiot du village', camp: 'village',
    f: (p, s) => (s ? '' : `<clipPath id="${p}-c"><path d="${IDIOT_BONNET}"/></clipPath>` + W(lignes45(6, 4, 28, 22, 3), 0.8, `clip-path="url(#${p}-c)"`)) +
      W(IDIOT_BONNET, s ? 2.6 : 1.6) + W('M6 24.6 C6 22.4 8 21.6 16 21.6 C24 21.6 26 22.4 26 24.6 C26 26.8 24 27.6 16 27.6 C8 27.6 6 26.8 6 24.6 Z', s ? 2.6 : 1.6) +
      W('M27.4 18.4 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0', s ? 2.2 : 1.3) + (s ? '' : W('M25.6 19.2 H29.2', 0.75)) },
  { id: 'ancien', n: 9, nom: 'l’Ancien', camp: 'village',
    f: (p, s) => (s ? '' : `<clipPath id="${p}-c"><path d="${ANCIEN_CORPS}"/></clipPath>` + W(lignes45(6, 10, 13, 25, 2.8), 0.75, `clip-path="url(#${p}-c)"`)) +
      W(ANCIEN_CORPS, s ? 2.6 : 1.6) + W('M18.4 9.6 m-3.2 0 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0', s ? 2.4 : 1.5) +
      W('M10.8 24.4 L10.2 29.6 M14.6 24.4 L15.2 29.6 M16.4 15 C18.4 15.6 20 16.4 21.6 17.4', s ? 2.4 : 1.5) +
      W('M22 14.4 V29.6 M22 14.4 C22 12.4 24.6 12.2 24.8 14.2', s ? 2.6 : 2) + (s ? '' : W('M20.8 21.8 L23.2 21.2 M20.8 24.4 L23.2 23.8', 1)) },
  { id: 'corbeau', n: 10, nom: 'le Corbeau', camp: 'village',
    f: (p, s) => (s ? M(`${CORBEAU_D} M11.6 9.8 m-1.4 0 a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0 Z`, 'fill-rule="evenodd" opacity="1"').replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"')
        : `<clipPath id="${p}-c"><path d="${CORBEAU_D} M11.6 9.8 m-1.2 0 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0 Z" clip-rule="evenodd"/></clipPath>` + W(lignes45(3, 5, 31, 25, 2.6), 1.1, `clip-path="url(#${p}-c)"`) + W(CORBEAU_D, 1.5)) +
      (s ? `<circle cx="11.6" cy="9.8" r="1.2" fill="currentColor"/>` : W('M11.6 9.8 m-1.2 0 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0', 0.8)) +
      W('M15 21.6 L14.4 25.8 M18.4 21.8 L18.8 25.8 M7.6 26.2 H25.6', s ? 2.2 : 1.4) + (s ? '' : W('M3.8 11.4 L8.6 11.2', 0.75)) },
  { id: 'bouc', n: 11, nom: 'le Bouc émissaire', camp: 'village',
    f: (p, s) => W('M12 11 C12 9 14 8.4 16 8.4 C18 8.4 20 9 20 11 C20.4 15 19.6 20 18 23.4 C17.4 24.6 16.6 25 16 25 C15.4 25 14.6 24.6 14 23.4 C12.4 20 11.6 15 12 11 Z', s ? 2.6 : 1.5) +
      W('M12.2 12 C9.6 11.6 7 12.6 5.4 14.2 C7.6 15 10.2 14.6 12.2 13.8 M19.8 12 C22.6 11.4 25 12.4 26.8 13.8 C24.6 14.8 21.8 14.6 19.8 13.8', s ? 2 : 1.3) +
      W('M13.6 9.2 C11 7.6 8 6.8 7.8 4 C7.6 2.6 8.8 2 9.6 3 M18.4 9.2 C21 7.6 24 6.8 24.2 4 C24.4 2.6 23.2 2 22.4 3', s ? 2.6 : 2) +
      W('M14.6 24.6 L15.2 29 L16 27.4 L16.8 29.4 L17.4 24.6', s ? 2 : 1.2) +
      (s ? '' : W('M10.2 5.6 C13 6.8 19 6.8 21.8 5.6', 1) + `<circle cx="16" cy="6.5" r="1.1" fill="currentColor"/>` + W('M15.8 7.4 L15 9 M16.2 7.4 L17.2 8.8', 0.8) +
        W('M13 14.6 H15 M17 14.6 H19', 1.2) + `<circle cx="15.2" cy="22" r=".55" fill="currentColor"/><circle cx="16.8" cy="22" r=".55" fill="currentColor"/>` +
        W('M9.4 6.2 L10.4 5.4 M8.4 4.6 L9.6 4.2 M22.6 6.2 L21.6 5.4 M23.6 4.6 L22.4 4.2', 0.7)) },
  { id: 'petiteFille', n: 12, nom: 'la Petite Fille', camp: 'village',
    f: (p, s) => (s ? '' : `<clipPath id="${p}-c"><path d="${PF_CAPUCHON} ${PF_VISAGE}" clip-rule="evenodd"/></clipPath>` + W(lignes45(3, 2, 29, 30, 3), 0.8, `clip-path="url(#${p}-c)"`)) +
      W(PF_CAPUCHON, s ? 2.6 : 1.6) + W(PF_VISAGE, s ? 2.2 : 1.2) +
      `<circle cx="13.8" cy="16" r="${s ? 1.6 : 1.1}" fill="currentColor"/>` + W('M17.2 16.2 C17.8 16.8 18.8 16.8 19.4 16.2', s ? 1.8 : 1.1) +
      (s ? '' : W('M15.2 19.6 H16.8', 0.9) + W('M11.6 22 L10 29 M20.4 22 L22 29', 1)) },
  { id: 'loupBlanc', n: 13, nom: 'le Loup Blanc', camp: 'seul',
    f: (p, s) => W(LOUPB_D, s ? 2.6 : 2) + M(s ? LOUP_OEIL_S : LOUP_OEIL) +
      (s ? '' : '<circle cx="4.2" cy="20.8" r=".6" fill="currentColor"/><circle cx="29.2" cy="14.2" r=".5" fill="currentColor"/><circle cx="12.4" cy="20.2" r=".45" fill="currentColor"/><circle cx="26.8" cy="22.6" r=".5" fill="currentColor"/>') },
];
export const SYM = Object.fromEntries(SYMBOLES.map((s) => [s.id, s]));
let symN = 0;
/** Symbole à poser dans un SVG parent. */
export function symg(id, x, y, taille = 32, couleur = 'currentColor', simple = false) {
  const s = taille / 32;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" color="${couleur}">${SYM[id].f(`sy${++symN}`, simple)}</g>`;
}
