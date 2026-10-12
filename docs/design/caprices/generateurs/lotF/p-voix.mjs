// Planche F-VI — Les voix : frise, crieur, légende, registre, fil, pli, réseau, feuille, avis, voile (SPEC § 5.7-5.14)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, LF_DEFS, NOTE, NOTE_ENCRE, cuivreRect, palierRect, cuvette, FELL } from './lib.mjs';
import { frise, minuterie, cartouche, cartForme, pli, bouton, jeton, tw, iconeHtml } from './comp.mjs';
import { glg, icg } from './traces.mjs';

const grain = (w, h, p = 'IV') => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: 0;" aria-hidden="true">${p === 'IV' ? cuivreRect(0, 0, w, h) : palierRect(p, 0, 0, w, h)}</svg>`;
const lab = (t, s = '') => `<div style="display: flex; justify-content: space-between; align-items: baseline;"><span style="${ts({ s: 13, lh: 18, w: 600 })}">${t}</span><span style="${ts({ s: 12, lh: 16, c: C.del })}">${s}</span></div>`;

/* ---- A. Frises ---- */
function frises() {
  const d = (t, heure) => `<svg width="1440" height="64" viewBox="0 0 1440 64" role="img" aria-label="Frise desktop, ${heure}">${frise({ w: 1440, t, heure, desktop: true, seed: 5 })}</svg>`;
  return `<div style="display: flex; flex-direction: column; gap: 6px;">${lab('Desktop 1440 · jour · 64 px, minuterie dans la frise, code à côté de l’heure', 'ciel hach-h à 28 % · toits de Thiercelieux : clocher à une fenêtre, potence à droite')}${d(PAPIER, 'Jour II')}${lab('Desktop 1440 · nuit', 'ciel en aquatinte IV · toits au palier III · rien de plus clair')}${d(CUIVRE, 'Nuit II')}</div>`;
}
function friseMobile(t, heure, absente = false) {
  return `<svg width="390" height="80" viewBox="0 0 390 80" role="img" aria-label="Frise mobile, ${heure}">${frise({ w: 390, t, heure, seed: 9 })}${t === CUIVRE ? cuivreRect(0, 56, 390, 24) : `<rect x="0" y="56" width="390" height="24" fill="${C.ver}"/>`}${minuterie(16, 56, absente ? 'absente' : 'barre', t, 14, '0:41')}</svg>`;
}

/* ---- B. Crieur ---- */
function crieur(t, rubrique, html) {
  const nuit = t === CUIVRE;
  return `<div style="position: relative; box-sizing: border-box; width: 390px; height: 56px; ${nuit ? '' : `background: ${C.ver};`} border-bottom: 0.75px solid ${t.filetDoux};">${nuit ? grain(390, 56) : ''}<div style="position: relative; display: flex; gap: 8px; padding: 6px 16px 0;"><span style="${ts({ f: 'sc', s: 13, lh: 22, c: t.encre2, ls: '.06em', extra: 'flex: none;' })}">${rubrique}</span><span style="${ts({ s: 16, lh: 22, c: t.encre })} display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${html}</span></div></div>`;
}
const chandelle = (c) => `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="display: inline-block; vertical-align: -2px; margin-right: 4px;">${glg('chandelle', 0, 0, 16, c)}</svg>`;
const cartInline = (camp, mot, t) => { const c = cartouche(0, 0, camp, mot, t, 20); return `<svg width="${c.w}" height="20" viewBox="0 0 ${c.w} 20" aria-hidden="true" style="display: inline-block; vertical-align: -5px; margin-left: 4px;">${c.svg}</svg>`; };

/* ---- Bandeau réseau ---- */
function bandeau(texte) {
  return `<div style="position: relative; box-sizing: border-box; width: 390px; height: 32px; background-color: ${C.p3}; background-image: repeating-linear-gradient(45deg, ${C.ver} 0 .6px, transparent .6px 6px); display: flex; align-items: center; padding: 0 16px;"><span style="display: flex; align-items: center; gap: 6px; background: ${C.p3}; padding: 2px 8px; ${ts({ s: 14, lh: 20, c: C.ver })}">${iconeHtml(texte.startsWith('Hors') ? 'coupe' : 'renoue', 18, C.ver)}${texte}</span></div>`;
}
function ecranPlein(legende, primaire, secondaire) {
  return `<div style="position: relative; box-sizing: border-box; width: 390px; height: 132px; background: ${C.ver}; padding: 10px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
    <svg width="358" height="56" viewBox="0 0 358 56" aria-hidden="true" style="position: absolute; left: 16px; top: 8px;">${cuvette(0, 0, 358, 56)}</svg>
    <p style="position: relative; margin: 8px 0 0; ${ts({ f: 'fell', s: 20, lh: 28, it: true, c: C.del })}">« ${esc(legende)} »</p>
    <div style="position: relative; margin-top: 12px; display: flex; gap: 8px;">${secondaire ? bouton({ v: 'secondaire', label: secondaire, w: 120 }) : ''}${bouton({ v: 'primaire', label: primaire, w: secondaire ? 200 : 260 })}</div></div>`;
}

/* ---- E. Le fil ---- */
const MARGE = {
  village: (h, t) => `<path d="M1 0 V${h}" stroke="${t.village}" stroke-width="2"/>`,
  meute: (h, t) => { let d = 'M2 0'; for (let y = 0; y < h; y += 4) d += ` L${y % 8 ? 2 : 0} ${y + 2} L${y % 8 ? 0 : 4} ${y + 4}`; return `<path d="M2 0 ${Array.from({ length: Math.ceil(h / 4) }, (_, i) => `L${i % 2 ? 0.5 : 4.5} ${i * 4 + 4}`).join(' ')}" fill="none" stroke="${t.meute}" stroke-width="2" stroke-linejoin="miter"/>`; },
  serment: (h, t) => `<path d="M.5 0 V${h} M3.5 0 V${h}" stroke="${t.serment}" stroke-width="1"/>`,
  audela: (h, t) => `<path d="M1 0 V${h}" stroke="${t.audela}" stroke-width="1" stroke-dasharray="1.5 3"/>`,
};
function message(canal, nom, texte, t, h, soi = false) {
  const coul = { village: t.encre, meute: t.meute, serment: t.serment, audela: t.audela }[canal];
  const corps = canal === 'audela' ? ts({ s: 16, lh: 22, c: t.encre2, it: true }) : ts({ s: 16, lh: 22, c: t.encre });
  const tete = soi ? `<span style="${ts({ f: 'sc', s: 13, lh: 20, c: t.encre2, ls: '.06em' })}">vous</span>` : `<span style="${ts({ s: 15, lh: 20, w: 600, c: coul })}">${esc(nom)}</span>`;
  return `<div style="display: flex; gap: 10px; min-height: ${h}px;"><svg width="6" height="${h}" viewBox="0 0 6 ${h}" aria-hidden="true" style="flex: none;">${MARGE[canal](h, t)}</svg><div style="display: flex; flex-direction: column;">${tete}<span style="${corps}">${esc(texte)}</span></div></div>`;
}
function onglet(canal, mot, t, actif) {
  const forme = { village: 'ecu', meute: 'mordu', serment: 'lacs', audela: 'audela' }[canal];
  const fs = 15, w = Math.ceil(tw(mot, fs, 600) + 28 + (canal === 'meute' ? 20 : 0));
  const coul = { village: t.encre, meute: t.meute, serment: t.serment, audela: t.audela }[canal];
  const fill = actif ? t.encre : t.surface, tc = actif ? t.surEncre : coul;
  let shape;
  if (forme === 'lacs') shape = `<rect x="1" y="1" width="${w - 2}" height="42" rx="21" fill="${fill}" stroke="${coul}" stroke-width="2"/><rect x="4.5" y="4.5" width="${w - 9}" height="35" rx="17.5" fill="none" stroke="${actif ? t.surEncre : coul}" stroke-width=".9"/>`;
  else shape = `<path d="${cartForme(forme === 'audela' ? 'ecu' : forme, w, 44)}" fill="${fill}" stroke="${actif ? t.encre : coul}" stroke-width="${forme === 'audela' ? 1.2 : forme === 'mordu' ? 2 : 1.5}" ${forme === 'audela' ? 'stroke-dasharray="1.5 3"' : ''}/>`;
  const cx = canal === 'meute' ? (w - 20) / 2 + 2 : w / 2;
  return `<svg width="${w}" height="44" viewBox="0 0 ${w} 44" role="tab" aria-selected="${actif}" aria-label="${esc(mot)}" style="flex: none;">${shape}<text x="${n(cx)}" y="27.5" ${st({ s: fs, w: 600, c: tc, anchor: 'middle', it: canal === 'audela' && !actif })}>${esc(mot)}</text></svg>`;
}
function saisie(t, ph) {
  return `<div style="display: flex; gap: 8px; align-items: center;"><input type="text" placeholder="${esc(ph)}" aria-label="${esc(ph)}" style="box-sizing: border-box; flex: 1; height: 48px; border: none; border-radius: 0; border-bottom: 1.5px solid ${t.filet}; background: ${t.creux}; padding: 0 12px; ${ts({ s: 16, lh: 24, c: t.encre })}"><button type="button" aria-label="Envoyer" style="box-sizing: border-box; width: 44px; height: 44px; border-radius: 0; background: ${t.surface}; border: 1px solid ${t.filetDoux}; display: flex; align-items: center; justify-content: center; padding: 0;">${iconeHtml('envoyer', 24, t.encre)}</button></div>`;
}
function fil() {
  const P = PAPIER, K = CUIVRE;
  const jour = `<div style="box-sizing: border-box; width: 390px; background: ${P.surface}; border-top: 1.5px solid ${P.filet}; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 8px;" role="tablist">${onglet('village', 'Le village', P, true)}${onglet('serment', 'Le serment', P, false)}</div>
    ${message('village', 'Étienne', 'Bastien a voté vite hier. Trop vite.', P, 44)}
    ${message('village', 'Anna', 'Je le regarde depuis la première nuit.', P, 44, true)}
    ${message('serment', 'Étienne', 'Quoi qu’il arrive, pas contre moi.', P, 44)}
    ${message('audela', 'Jules', 'Je vous l’avais dit, pourtant.', P, 44)}
    ${saisie(P, 'Parler au village…')}</div>`;
  const nuit = `<div style="position: relative; box-sizing: border-box; width: 390px; height: 222px;">${grain(390, 222)}<div style="position: relative; box-sizing: border-box; width: 390px; height: 222px; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; background: transparent;">
    <div style="display: flex; gap: 8px;">${onglet('meute', 'La meute', K, true)}</div>
    ${message('meute', 'Octave', 'Fanny, cette nuit. Elle a lié les deux autres.', K, 44)}
    ${message('meute', 'Bastien', 'D’accord pour Fanny.', K, 22, true)}
    ${saisie(K, 'Parler à la meute…')}</div></div>`;
  const ong = `<div style="display: flex; gap: 8px; flex-wrap: wrap;">${onglet('village', 'Le village', P, false)}${onglet('meute', 'La meute', P, false)}${onglet('serment', 'Le serment', P, false)}${onglet('audela', 'L’au-delà', P, true)}</div>`;
  return `<div style="display: flex; flex-direction: column; gap: 6px;">${lab('Jour II · vous = Anna · spécimen : un message par canal', 'pas de bulle, pas d’avatar, pas d’heure')}${jour}${lab('Nuit II · vous = Bastien · la meute', 'noms en craie, filet dentelé')}${nuit}</div>`;
}

/* ---- F. Le pli ---- */
function plis() {
  const L = [['dormeur', { libelle: 'Le registre' }], ['amoureux vivant', { camp: 'serment', libelle: 'Le serment', compte: 2 }], ['loup, pendant l’étape', { camp: 'meute', libelle: 'La meute', compte: 1, trait: C.p2 }], ['mort', { camp: 'audela', libelle: 'L’au-delà', compte: 4 }]];
  return `<div style="position: relative; width: 390px;">${grain(390, 4 * 62)}<div style="position: relative; display: flex; flex-direction: column;">${L.map(([qui, o]) => `<div style="height: 18px; padding: 2px 16px 0; ${ts({ s: 12, lh: 16, c: C.p1 })}">${qui}</div>${pli({ t: { ...CUIVRE, fond: 'transparent' }, ...o })}`).join('')}</div></div>`;
}

/* ---- D. Le registre en feuille basse, sur voile ---- */
function registre() {
  const H = 600;
  let fond = `<svg width="390" height="${H}" viewBox="0 0 390 ${H}" style="position: absolute; left: 0; top: 0;" aria-hidden="true"><rect width="390" height="${H}" fill="${C.ver}"/>`;
  const T12 = ['Anna', 'Bastien', 'Clément', 'Delphine', 'Étienne', 'Fanny', 'Gaspard', 'Hélène'];
  T12.forEach((p, i) => { fond += jeton({ x: 16 + (i % 4) * 91, y: 12 + Math.floor(i / 4) * 112, d: 'D2', chef: i, nom: p, statut: 'délibère' }); });
  fond += `<rect width="390" height="${H}" fill="${C.p2}" opacity=".6"/><rect width="390" height="${H}" fill="#000" filter="url(#aqua-II)" opacity=".13"/></svg>`;
  const bloc = (heure, lignes, ouvert = true) => `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })} border-bottom: 0.75px solid ${C.b900}; padding-bottom: 3px;">${heure}</div>${ouvert ? lignes.map((l) => `<div style="${ts({ s: 16, lh: 22 })}">${l}</div>`).join('') : ''}</div>`;
  const feuille = `<div style="position: absolute; left: 0; bottom: 0; box-sizing: border-box; width: 390px; height: 452px; background: ${C.bru}; border-top: 1.5px solid ${C.b900}; padding: 0 16px 16px;">
    <div style="height: 3px;"></div><div style="height: 0.75px; background: ${C.b900};"></div>
    <div style="width: 40px; height: 4px; background: ${C.p2}; margin: 8px auto 0;"></div>
    <div style="display: flex; justify-content: space-between; align-items: center; height: 48px;"><h2 style="margin: 0; ${ts({ f: 'fell', s: 28, lh: 32 })}">Le registre</h2>${bouton({ v: 'discret', label: 'Refermer' })}</div>
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${bloc('Jour II', ['Le jour se lève sur Thiercelieux. Le village délibère.'])}
      ${bloc('Nuit II', ['La nuit tombe sur Thiercelieux. Le village s’endort.', 'Personne n’est mort cette nuit. Le village se réveille entier.'])}
      ${bloc('Jour I', ['Étienne prend le brassard : sa voix comptera double.', `Les voix sont comptées : la potence est pour Jules.`, `${chandelle(C.b900)}Le village a exécuté Jules ${cartInline('meute', 'Loup-garou', PAPIER)}`])}
      ${bloc('Nuit I', [], false)}
    </div></div>`;
  return `<div style="position: relative; width: 390px; height: ${H}px; overflow: hidden;">${fond}${feuille}</div>`;
}
function voiles() {
  const ech = (nuit) => `<div style="position: relative; width: 187px; height: 120px; overflow: hidden;"><svg width="187" height="120" viewBox="0 0 187 120" style="position: absolute; left: 0; top: 0;" aria-hidden="true">${nuit ? cuivreRect(0, 0, 187, 120) : `<rect width="187" height="120" fill="${C.ver}"/>`}${jeton({ x: 8, y: 6, d: 'D2', t: nuit ? CUIVRE : PAPIER, chef: 10, nom: 'Tom', e: { moi: true } })}${jeton({ x: 96, y: 6, d: 'D2', t: nuit ? CUIVRE : PAPIER, chef: 11, nom: 'Léa' })}
    <rect x="0" y="0" width="187" height="120" fill="${nuit ? C.b900 : C.p2}" opacity="${nuit ? .72 : .6}"/><rect x="0" y="0" width="187" height="120" fill="#000" filter="url(#aqua-${nuit ? 'IV' : 'II'})" opacity="${nuit ? .28 : .22}"/></svg></div>`;
  return `<div style="display: flex; gap: 16px;"><div style="display: flex; flex-direction: column; gap: 4px;">${ech(false)}<span style="${ts({ s: 12, lh: 16, c: C.del })}">jour : palier II à 60 %</span></div><div style="display: flex; flex-direction: column; gap: 4px;">${ech(true)}<span style="${ts({ s: 12, lh: 16, c: C.del })}">nuit : palier IV à 72 %</span></div></div>`;
}

/* ---- C. Légende ---- */
function legende() {
  return `<div style="display: flex; flex-direction: column; gap: 14px; width: 270px;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; background: ${C.ver}; padding: 12px 0;">
      <svg width="192" height="120" viewBox="0 0 192 120" role="img" aria-label="Planche : la potence">${cuvette(0, 0, 192, 120)}<rect x="12" y="12" width="168" height="96" fill="url(#hach-h-e)" opacity=".5"/><path d="M60 104 V30 H112 M60 44 L74 30 M108 30 V44" fill="none" stroke="${C.b900}" stroke-width="3" stroke-linecap="square"/><circle cx="108" cy="52" r="7" fill="none" stroke="${C.b900}" stroke-width="2"/><path d="M40 104 H128" stroke="${C.b900}" stroke-width="3"/></svg>
      <p style="margin: 0; text-align: center; ${ts({ f: 'fell', s: 18, lh: 24, it: true, c: C.del })}">« Tous d’accord, donc tous innocents. »</p></div>
    <div style="position: relative; box-sizing: border-box; height: 72px; padding: 12px 16px;">${grain(270, 72)}<p style="position: relative; margin: 0; ${ts({ f: 'fell', s: 18, lh: 24, it: true, c: C.p1 })}">« Dormez : d’autres veillent pour vous. »</p></div>
    <p style="margin: 0; ${NOTE}">IM Fell italique 18/24, entre « », centrée sous la planche qu’elle commente, deux lignes au plus. Jamais un bouton, jamais une consigne : chez qui n’a rien à faire, elle occupe la zone de consigne (ci-dessus, le dormeur).</p></div>`;
}

/* ---- I. Avis ---- */
function avis(ic, html) {
  return `<div role="status" style="box-sizing: border-box; max-width: 270px; min-height: 44px; padding: 12px 16px; background: ${C.bru}; border: 1px solid ${C.b900}; display: flex; gap: 10px; align-items: flex-start;">${iconeHtml(ic, 16, C.b900).replace('style="display: block;', 'style="display: block; margin-top: 2px;')}<span style="${ts({ s: 14, lh: 20 })}">${html}</span></div>`;
}

export function build() {
  const col1 = `<div style="display: flex; flex-direction: column; gap: 8px;">
    ${lab('Mobile 390 · jour', '56 + minuterie 24')}${friseMobile(PAPIER, 'Jour II')}
    ${lab('Mobile 390 · nuit', 'identique pour tous les sièges')}${friseMobile(CUIVRE, 'Nuit II', true)}
    ${lab('Le crieur · jour', 'zone fixe 56 · rubrique, puis la dernière annonce')}${crieur(PAPIER, 'Aube II', `${chandelle(C.b900)}La meute a dévoré Clément — c’était Villageois·e.`)}
    ${lab('Le crieur · nuit', 'il tait les phrases d’heure')}${crieur(CUIVRE, 'Jour I', `${chandelle(C.ver)}Le village a exécuté Jules ${cartInline('meute', 'Loup-garou', CUIVRE)}`)}
    <div style="height: 4px;"></div>
    <div style="${ts({ f: 'sc', s: 15, lh: 20, ls: '.06em' })} border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px;">G · Le bandeau réseau</div>
    ${lab('reconnexion · 32 px entre la barre d’état et la frise')}${bandeau('Reconnexion… la table vous garde votre place.')}
    ${lab('hors ligne · tout l’écran sous un voile hach-1 à 20 %')}${bandeau('Hors ligne — dernier état connu.')}
    ${lab('table disparue · écran plein')}${ecranPlein('La table s’est levée sans vous.', 'Retour à l’accueil')}
    ${lab('double onglet · écran plein')}${ecranPlein('La partie est ouverte dans un autre onglet.', 'Jouer ici')}
  </div>`;
  const col4 = `<div style="display: flex; flex-direction: column; gap: 10px;">
    ${legende()}
    <div style="${ts({ f: 'sc', s: 15, lh: 20, ls: '.06em' })} border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px; margin-top: 8px;">I · L’avis</div>
    ${lab('info · au-dessus de la barre, 6 s')}${avis('sablier', 'L’écran peut s’éteindre : gardez-le allumé dans vos réglages.')}
    ${lab('refus · pâté d’encre, pas de rouge')}${avis('pate', '<b style="font-weight: 600;">Refusé :</b> aucune table à ce code.')}
    <p style="margin: 0; width: 270px; ${NOTE}">358 px au plus, 44 au moins ; trois au plus, le plus récent en bas ; paraît en --m-impression (deux crans). « Sans Wake Lock » vit au salon, en avis permanent discret.</p>
  </div>`;
  const body = [
    entete({ num: 'F·VI', titre: 'Les voix', legende: 'Deux mains : le crieur et le graveur.', refs: 'SPEC § 5.7-5.14' }),
    section({ x: 40, y: 140, w: 1520, h: 200, lettre: 'A', titre: 'La frise, jour et nuit, à 390 et 1440', note: 'le seul paysage de l’écran · tout mot posé sur un cartouche plein', contenu: frises() }),
    section({ x: 40, y: 356, w: 390, h: 1020, lettre: 'B', titre: 'Frise mobile, crieur', contenu: col1 }),
    section({ x: 460, y: 356, w: 390, h: 1020, lettre: 'E', titre: 'Le fil : quatre canaux', contenu: fil() + `<div style="height: 14px;"></div><div style="${ts({ f: 'sc', s: 15, lh: 20, ls: '.06em' })} border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px; margin-bottom: 8px;">F · Le pli : une forme, quatre libellés (nuit)</div>${plis()}` }),
    section({ x: 880, y: 356, w: 390, h: 1020, lettre: 'D', titre: 'Le registre, en feuille basse', note: 'sur l’écran de jour', contenu: registre() + `<div style="height: 14px;"></div><div style="${ts({ f: 'sc', s: 15, lh: 20, ls: '.06em' })} border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px; margin-bottom: 8px;">H · Le voile : un grain, jamais un flou</div>${voiles()}<p style="margin: 10px 0 0; ${NOTE}">Feuille : fond --surface, double filet 1,5 + 0,75 à 3 px, languette 40 × 4, titre --t-titre, « Refermer » discret. 90 % au plus. Échap, voile ou glissé vers le bas la ferment.</p>` }),
    section({ x: 1290, y: 356, w: 270, h: 1020, lettre: 'C', titre: 'La légende', contenu: col4 }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les voix', defs: LF_DEFS, body, seed: 61 });
}
