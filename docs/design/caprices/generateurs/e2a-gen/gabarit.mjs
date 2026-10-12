// Le gabarit unique mobile 390 × 844 (§ 7.1) et ses zones, au pixel.
import { esc, abs, st, glyphe, icone, cartouche, larg, FELL, FELLSC, SERIF } from './base.mjs';

export const Y = { sys: 0, frise: 47, minu: 103, crieur: 127, consigne: 183, place: 255, placeUtile: 263, resume: 670, pli: 694, barre: 738, accueil: 810 };

export function barreSysteme(T, w = 390) {
  return `<div aria-hidden="true" style="${abs(0, 0, w, 47, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 26px 0 32px', fontSize: 15, fontWeight: 600, color: T.encre, fontVariantNumeric: 'tabular-nums' })}"><span>9:41</span><svg width="58" height="12" viewBox="0 0 58 12"><path d="M1 11 V8 M5 11 V6 M9 11 V4 M13 11 V2" stroke="${T.encre}" stroke-width="2.2"></path><path d="M21 5.2 C24 2.4 29 2.4 32 5.2 M23.4 7.6 C25.2 6 27.8 6 29.6 7.6" fill="none" stroke="${T.encre}" stroke-width="1.5"></path><rect x="26" y="9.2" width="1.2" height="1.2" fill="${T.encre}"></rect><rect x="36.75" y="1.75" width="18.5" height="8.5" fill="none" stroke="${T.encre}" stroke-width="1.5"></rect><rect x="39" y="4" width="11" height="4" fill="${T.encre}"></rect><rect x="56" y="4.5" width="1.6" height="3" fill="${T.encre}"></rect></svg></div>`;
}

/** La frise (§ 5.7) : ciel, toits de Thiercelieux (clocher, potence), cartouches pleins dessus. */
export function frise(T, heure, { top = 47, w = 390, carteVide = false } = {}) {
  const pap = T.nom === 'papier';
  const roofFill = pap ? 'url(#hach-x-e)' : 'url(#hach-1-v)';
  const sky = pap ? `<rect width="${w}" height="56" fill="url(#hach-h-e)" opacity="0.28"></rect>` : '';
  const toits = `M0 56 V44 L14 36 L28 44 V40 L44 31 L60 40 V46 H70 L84 38 L98 46 H110 V42 L124 34 L138 42 V46 H150 V40 L158 40 V44 H160 V31 L168 20 L176 31 V44 H186 V41 L202 32 L218 41 V46 H230 L246 37 L262 46 V41 L278 33 L294 41 V46 H302 L318 36 L334 46 H344 V40 L360 32 L376 40 V45 H${w} V56 Z`;
  const svg = `<svg width="${w}" height="56" viewBox="0 0 ${w} 56" aria-hidden="true" style="position: absolute; left: 0; top: 0;">${sky}
<path d="${toits}" fill="${roofFill}" stroke="${T.filet}" stroke-width="1"></path><path d="${toits}" fill="${pap ? 'none' : T.surface}" fill-opacity="${pap ? 0 : 0.55}" stroke="none"></path>
<rect x="165.5" y="33" width="5" height="7" fill="${pap ? T.surface : '#4A433B'}" stroke="${T.filet}" stroke-width="0.75"></rect>
<path d="M181 46 V22 H193 M181 27 L186 22 M191.5 22 V26.5" fill="none" stroke="${T.encre}" stroke-width="2"></path><circle cx="191.5" cy="29" r="2.4" fill="none" stroke="${T.encre}" stroke-width="1"></circle>
<line x1="0" y1="55.25" x2="${w}" y2="55.25" stroke="${T.filet}" stroke-width="1.5"></line></svg>`;
  const outil = (l, inner, lab, wd = 44) => `<button type="button" aria-label="${lab}" style="${abs(l, 6, wd, 44, { background: T.surface, border: `1px solid ${T.filetDoux}`, borderRadius: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: T.encre, fontFamily: SERIF, fontSize: 15, cursor: 'pointer' })}">${inner}</button>`;
  const hw = Math.max(80, Math.round(heure.length * 9.6) + 24);
  let h = svg;
  h += outil(16, icone('retour', T), 'Retour à l’arcade');
  h += `<div style="${abs(64, 6, hw, 44, { background: T.surface, border: `1px solid ${T.filetDoux}`, display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: FELLSC, fontSize: 20, lineHeight: '24px', color: T.encre })}">${esc(heure)}</div>`;
  h += carteVide
    ? `<div aria-hidden="true" style="${abs(w - 196, 6, 76, 44, { border: `1px dashed ${T.filetDoux}` })}"></div>`
    : outil(w - 196, `${icone('carte', T)}<span>Carte</span>`, 'Ma carte — gardez le pouce pour la voir', 76);
  h += outil(w - 112, icone('menu', T), 'Menu de la table');
  h += outil(w - 60, icone('cloche', T), 'Son : activé');
  return `<header style="${abs(0, top, w, 56)}">${h}</header>`;
}

/** Minuterie en crans (§ 5.6) : barre | absente | urgence. */
export function minuterie(T, { reste = '1:42', pleins = 14, etat = 'barre' } = {}, { top = 103, left = 16, w = 390 } = {}) {
  let crans = '';
  for (let i = 0; i < 24; i++) {
    const x = i * 8;
    const plein = etat !== 'absente' && i < pleins;
    crans += plein
      ? `<rect x="${x}" y="0" width="5" height="10" fill="${etat === 'urgence' ? `url(#hach-x-${T.h})` : T.cranPlein}"${etat === 'urgence' ? ` stroke="${T.cranPlein}" stroke-width="1"` : ''}></rect>`
      : `<rect x="${x + 0.5}" y="0.5" width="4" height="9" fill="none" stroke="${T.cranVide}" stroke-width="1"></rect>`;
  }
  const chiffre = etat === 'absente' ? `<span style="color: ${T.encre2}">—</span>` : esc(reste);
  return `<div role="timer" aria-label="${etat === 'absente' ? 'Pas de minuterie' : `Il reste ${reste}`}" style="${abs(left, top, w - left * 2, 24, { display: 'flex', alignItems: 'center', gap: 8 })}">${icone(etat === 'urgence' ? 'sablier-retourne' : 'sablier', T, 16)}<svg width="189" height="10" viewBox="0 0 189 10" aria-hidden="true" style="display: block;">${crans}</svg><span style="${st({ marginLeft: 'auto', width: 44, textAlign: 'right', fontSize: 16, lineHeight: '20px', fontVariantNumeric: 'tabular-nums lining-nums', fontWeight: etat === 'urgence' ? 600 : 400 })}">${chiffre}</span></div>`;
}

/** Le crieur (§ 5.8) : rubrique + dernière annonce, deux lignes au plus. */
export function crieur(T, { rub, txt, mort = false }, { top = 127, w = 390, h = 56 } = {}) {
  const ch = mort ? `<span style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">${glyphe('chandelle', 8, 8, 16, T)}</svg></span>` : '';
  return `<button type="button" aria-label="Le crieur — ouvrir le registre" style="${abs(0, top, w, h, { background: 'none', border: 0, borderTop: `1px solid ${T.filetDoux}`, borderBottom: `1px solid ${T.filetDoux}`, padding: '3px 16px', textAlign: 'left', fontFamily: SERIF, color: T.encre, cursor: 'pointer' })}"><span aria-live="polite" style="${st({ display: '-webkit-box', WebkitLineClamp: '2',WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 16, lineHeight: '24px' })}"><span style="${st({ fontFamily: FELLSC, fontSize: 13, letterSpacing: '.06em', color: T.encre2, marginRight: 8 })}">${esc(rub)}</span>${ch}${esc(txt)}</span></button>`;
}

/** La consigne (§ 7.1) : --t-jeu 18/24, trois lignes ; ou la légende du graveur. */
export function consigne(T, c, { top = 183, w = 390, h = 72, left = 16 } = {}) {
  if (c.legende) return `<p style="${abs(left, top, w - 2 * left, h, { margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FELL, fontStyle: 'italic', fontSize: 18, lineHeight: '24px', color: T.narr })}">« ${esc(c.legende)} »</p>`;
  return `<p style="${abs(left, top, w - 2 * left, h, { margin: 0, display: 'flex', alignItems: 'center', fontSize: 18, lineHeight: '24px', color: T.encre, fontVariationSettings: "'opsz' 18" })}">${esc(c.txt)}</p>`;
}

/** Ligne de résumé (24 px) : gauche (HTML), droite (chiffre). */
export function resume(T, gauche, droite, { top = 670, w = 390, id } = {}) {
  return `<div${id ? ` id="${id}"` : ''} style="${abs(16, top, w - 32, 24, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, lineHeight: '24px', whiteSpace: 'nowrap' })}"><span>${gauche || ''}</span><span style="font-variant-numeric: tabular-nums lining-nums;">${droite ? esc(droite) : ''}</span></div>`;
}
export const voix = (T, nom, suite = ' · modifiable') => `Votre voix : <b style="font-weight: 600">${esc(nom)}</b><span style="${st({ fontSize: 12, color: T.encre2 })}">${esc(suite)}</span>`;

/** Le pli (§ 5.14) : cartouche du canal + libellé + compteur + chevron. */
export function pli(T, { type = 'ecu', txt = 'Le village', n }, { top = 694, w = 390 } = {}) {
  const c = cartouche(type, txt, T, { h: 20 });
  return `<button type="button" aria-label="${esc(txt)}${n ? `, ${n} non lus` : ''} — ouvrir" style="${abs(0, top, w, 44, { background: 'none', border: 0, borderTop: `1px solid ${T.filetDoux}`, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, color: T.encre, fontFamily: SERIF, cursor: 'pointer' })}">${c.svg}${n ? `<span style="font-size: 16px; font-variant-numeric: tabular-nums;">· ${n}</span>` : ''}<span style="margin-left: auto; display: flex; gap: 4px; align-items: center;">${icone('phylactere', T)}${icone('chevron-haut', T, 20)}</span></button>`;
}

/* ---------- Boutons (§ 5.4) ---------- */
export function bouton(T, v, label, { w, icon, describedby, armeFilet = 0.62, aria } = {}) {
  const base = { height: 48, width: w, flex: w ? 'none' : '1 1 0', minWidth: 0, borderRadius: 0, padding: '0 16px', fontFamily: SERIF, fontSize: 17, lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' };
  const ic = icon ? icone(icon, T, 20, v === 'primaire' ? T.actionTexte : v === 'eteint' ? T.encre2 : T.encre) : '';
  const ad = describedby ? ` aria-describedby="${describedby}"` : '';
  const al = aria ? ` aria-label="${esc(aria)}"` : '';
  if (v === 'primaire') return `<button type="button"${al} style="${st({ ...base, background: T.actionFond, color: T.actionTexte, border: `1.5px solid ${T.actionBord}`, fontWeight: 600 })}">${ic}<span>${esc(label)}</span></button>`;
  if (v === 'secondaire') return `<button type="button"${al} style="${st({ ...base, background: 'transparent', color: T.encre, border: `1.5px solid ${T.filet}`, fontWeight: 400 })}">${ic}<span>${esc(label)}</span></button>`;
  if (v === 'outil') return `<button type="button"${al} style="${st({ ...base, width: 48, flex: 'none', padding: 0, background: 'transparent', border: `1.5px solid ${T.filet}` })}">${icone(icon, T, 24)}</button>`;
  if (v === 'eteint') return `<button type="button" aria-disabled="true"${ad}${al} style="${st({ ...base, background: 'transparent', color: T.encre2, border: `1.5px dashed ${T.filetDoux}`, fontWeight: 600, cursor: 'default' })}">${ic}<span>${esc(label)}</span></button>`;
  if (v === 'appui') {
    const ring = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex: none;"><circle cx="13" cy="13" r="11" fill="none" stroke="#7A7064" stroke-width="3"></circle></svg>`;
    return `<button type="button"${al} style="${st({ ...base, justifyContent: 'flex-start', background: T.nom === 'cuivre' ? T.actionFond : 'transparent', color: T.encre, border: `1.5px solid ${T.nom === 'cuivre' ? T.actionBord : T.filet}`, fontWeight: 400 })}">${ring}<span>${esc(label)}</span></button>`;
  }
  if (v === 'arme') {
    // double filet (3 dehors + 1 dedans, écart 2), repères de visée aux 4 coins, filet de 4 s qui se rétracte dessous
    const coin = (pos) => `<span aria-hidden="true" style="${st({ position: 'absolute', width: 8, height: 8, ...pos })}"></span>`;
    const c = 2.4, L = 7, o = -6;
    const marks = [
      { left: o, top: o, borderLeft: `${c}px solid ${T.encre}`, borderTop: `${c}px solid ${T.encre}` },
      { right: o, top: o, borderRight: `${c}px solid ${T.encre}`, borderTop: `${c}px solid ${T.encre}` },
      { left: o, bottom: o, borderLeft: `${c}px solid ${T.encre}`, borderBottom: `${c}px solid ${T.encre}` },
      { right: o, bottom: o, borderRight: `${c}px solid ${T.encre}`, borderBottom: `${c}px solid ${T.encre}` },
    ].map((p) => coin({ ...p, width: L, height: L })).join('');
    return `<button type="button"${al} style="${st({ position: 'relative', flex: w ? 'none' : '1 1 0', width: w, minWidth: 0, height: 48, boxSizing: 'border-box', border: `3px solid ${T.encre}`, borderRadius: 0, padding: 2, background: 'transparent', cursor: 'pointer', display: 'block' })}">${marks}<span style="${st({ ...base, cursor: undefined, width: '100%', height: 38, padding: '0 10px', background: T.actionFond, color: T.actionTexte, border: `1px solid ${T.encre}`, fontWeight: 600, fontSize: 17 })}">${esc(label)}</span><span aria-hidden="true" style="${st({ position: 'absolute', left: -3, top: 49, height: 1, width: `${Math.round(armeFilet * 100)}%`, background: T.encre })}"></span></button>`;
  }
  return '';
}

/** Barre au pouce (§ 5.5) + indicateur d'accueil. */
export function barre(T, contenu, { top = 738, w = 390 } = {}) {
  return `<div role="group" aria-label="Votre action" style="${abs(0, top, w, 72, { background: T.surface, borderTop: `1.5px solid ${T.filet}`, padding: '11px 16px 12px', display: 'flex', gap: 8, alignItems: 'center' })}">${contenu}</div>
<div aria-hidden="true" style="${abs(0, top + 72, w, 34, { background: T.surface })}"><span style="${abs(Math.round(w / 2 - 67), 21, 134, 5, { background: T.encre, display: 'block' })}"></span></div>`;
}

/** Voile d'aquatinte (§ 3.8) : jamais un flou. */
export function voile(T, top, h, w = 390) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="${abs(0, top, w, h)}"><rect width="${w}" height="${h}" fill="${T.voile}" opacity="${T.voileOp}"></rect><rect width="${w}" height="${h}" fill="#000" filter="url(#aqua-II)" opacity="0.22"></rect></svg>`;
}

/** Écran de partie mobile, zones du gabarit unique. */
export function ecranMobile(T, o) {
  let h = barreSysteme(T);
  h += frise(T, o.heure, o.frise || {});
  h += minuterie(T, o.minuterie || {});
  if (o.ligne40) h += o.ligne40;
  else { h += crieur(T, o.crieur); h += consigne(T, o.consigne); }
  h += `<section aria-label="La place" style="${abs(0, o.placeTop || 255, 390, o.placeH || 415)}"></section>`;
  h += o.place;
  if (o.milieu) h += o.milieu;
  if (o.resume !== false) h += resume(T, o.resume?.g, o.resume?.d, { top: o.resumeTop || 670, id: o.resume?.id });
  if (o.pli) h += pli(T, o.pli);
  h += barre(T, o.barre);
  if (o.dessus) h += o.dessus;
  return h;
}
