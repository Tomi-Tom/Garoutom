// Les 11 écrans mobiles et les 2 écrans desktop du lot C.
import { K, F, PAPIER, CUIVRE, page, setPfx, cartoucheSvg, cartouche, grainCuivre, grainPapier, BG_PAPIER, BG_CUIVRE } from './lib.mjs';
import { R } from './roles.mjs';
import { carteGrande, carteMoyenne, cartePetite, carteDos, frontispice } from './cartes.mjs';
import { vignette } from './vignettes.mjs';
import { barreSysteme, frise, minuterie, crieur, legende, pli, bouton, barrePouce, placeD2, coque, jeton, SIEGES, ICONES, toits, anneau } from './ecran.mjs';

const abs = (x, y, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; ${extra}">${inner}</div>`;
const DESC = (txt, t, w = 358) => `<p style="margin: 0; width: ${w}px; font-family: ${F.ss}; font-size: 16px; line-height: 24px; color: ${t.encre}; text-align: center;">${txt}</p>`;
const ROLE_PRET = 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.';

function mobile(nom, titre, t, body, seed = 1) {
  setPfx(nom);
  const c = coque(t, seed);
  return page({ title: titre, w: 390, h: 844, bg: c.bg, body: c.base + body });
}
/** filet qui décompte sur le périmètre de la cuvette d'une carte (x,y = coin de la carte) */
function perimetre(x, y, W, H, m, frac, color) {
  const a = m + 0.75, w = W - 2 * a, h = H - 2 * a, L = 2 * (w + h);
  const d = `M${W / 2} ${a}H${W - a}V${H - a}H${a}V${a}H${W / 2}`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: ${x}px; top: ${y}px; pointer-events: none;" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="${(L * frac).toFixed(1)} ${L.toFixed(1)}"/></svg>`;
}
const resume = (t, gauche, droite = '') => `<div style="position: absolute; left: 0; top: 670px; width: 390px; height: 24px; box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; gap: 8px; font-family: ${F.ss}; font-size: 14px; line-height: 20px; color: ${t.encre};">${gauche}${droite ? `<span style="margin-left: auto; font-size: 16px; font-variant-numeric: tabular-nums lining-nums;">${droite}</span>` : ''}</div>`;

const crieurRev = (t) => crieur({ t, rub: 'Nuit I', txt: 'Les cartes sont distribuées, face contre table. À vous de les retourner.' });
const enteteRev = (t, carte = 'repos') => barreSysteme(t) + frise({ t, heure: 'Nuit I', carte }) + minuterie({ t, restant: 19, chiffre: '0:47' }) + crieurRev(t);

// ============================================================ Révélation — dos (R0)
export function revDos() {
  const t = CUIVRE;
  let b = enteteRev(t);
  b += abs(45, 196, carteDos({ t: CUIVRE }));
  b += abs(16, 628, legende('« Nul ne se connaît. »', t), 'width: 358px;');
  b += pli({ t });
  b += barrePouce({ t, inner: bouton({ t, kind: 'appui', label: 'Gardez le pouce : retourner la carte', w: '100%', p: 0 }) });
  return mobile('cRD', 'C-Revelation-Dos', t, b, 21);
}
// ============================================================ Révélation — appui (R3, la Voyante)
function revFace(nom, titre, id, extra) {
  const t = CUIVRE;
  let b = enteteRev(t);
  b += abs(45, 196, carteGrande(id, { t: PAPIER }));
  b += perimetre(45, 196, 300, 420, 12, 0.75, K.b9);
  b += abs(16, 622, DESC(R[id].desc, t));
  if (extra) b += extra;
  b += pli({ t });
  b += barrePouce({ t, inner: bouton({ t, kind: 'appui', label: 'Relâchez pour cacher · 6 s', w: '100%', p: 1, etat: 'appuye' }) });
  return mobile(nom, titre, t, b, 22);
}
export const revAppui = () => revFace('cRA', 'C-Revelation-Appui', 'voyante');
export const revLoup = () => revFace('cRL', 'C-Revelation-Loup', 'loup',
  resume(CUIVRE, `<span>Votre meute :</span>${cartoucheSvg('mordu', 92, 20, 'Loup-garou', CUIVRE, { fs: 12 })}<span style="font-weight: 600; font-size: 15px;">Jules</span>`));

// ============================================================ Révélation — prête (R5)
export function revPret() {
  const t = CUIVRE;
  let b = enteteRev(t);
  b += abs(45, 196, carteDos({ t: CUIVRE }));
  b += abs(16, 620, `<button type="button" aria-pressed="true" style="width: 358px; height: 48px; box-sizing: border-box; border-radius: 0; border: 1.5px solid ${t.filet}; background-color: transparent; background-image: repeating-linear-gradient(45deg, ${K.p3} 0 .8px, transparent .8px 6px); color: ${t.encre}; font-family: ${F.ss}; font-size: 17px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;">${ICONES.case(t.encre)}<span>Je sais qui je suis</span></button>`);
  b += `<div role="status" style="position: absolute; left: 0; top: 670px; width: 390px; height: 24px; text-align: center; font-family: ${F.ss}; font-size: 14px; line-height: 24px; color: ${t.encre2};">Les autres retournent leur carte.</div>`;
  b += pli({ t });
  b += barrePouce({ t, inner: bouton({ t, kind: 'appui', label: 'Gardez le pouce : retourner la carte', w: '100%', p: 0 }) });
  return mobile('cRP', 'C-Revelation-Pret', t, b, 23);
}
// ============================================================ Révélation — spectateur
export function revSpect() {
  const t = CUIVRE;
  let b = barreSysteme(t) + frise({ t, heure: 'Nuit I', carte: 'vide' }) + minuterie({ t, restant: 19, chiffre: '0:47' }) + crieurRev(t);
  b += abs(16, 195, legende('« Nul ne se connaît. »', t, { size: 20, lh: 28 }), 'width: 358px;');
  b += abs(16, 227, `<p style="margin: 0; width: 358px; text-align: center; font-family: ${F.ss}; font-size: 14px; line-height: 20px; color: ${t.encre2};">Les joueurs retournent leur carte.</p>`);
  b += placeD2({ t, etats: {} });
  b += pli({ t });
  b += barrePouce({ t, inner: `<p style="margin: 0; flex: 1; align-self: center; text-align: center; font-family: ${F.ss}; font-size: 16px; color: ${t.encre2};">Vous suivez la table en spectateur.</p>` });
  return mobile('cRS', 'C-Revelation-Spectateur', t, b, 24);
}

// ============================================================ Ma carte — jour (Anna)
export function maCarteJour() {
  const t = PAPIER;
  let b = barreSysteme(t) + frise({ t, heure: 'Jour II', carte: 'tenu' }) + minuterie({ t, restant: 14, chiffre: '1:42' });
  b += crieur({ t, rub: 'Jour II', txt: 'Le jour se lève sur Thiercelieux. Le village délibère.' });
  b += `<div style="position: absolute; left: 16px; top: 183px; width: 358px; height: 72px; overflow: hidden;"><p style="margin: 0; padding-top: 2px; font-family: ${F.ss}; font-size: 18px; line-height: 24px; color: ${t.encre}; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.</p></div>`;
  const pub = (k, m) => ({ mort: true, cart: [k, m, false] });
  b += placeD2({ t, etats: {
    1: { moi: true, lacs: true, brunie: true, statut: 'vous' }, 2: { vote: true, brunie: true, statut: 'a voté' }, 3: { ...pub('ecu', 'Villageois·e') },
    4: { vote: true, brunie: true, statut: 'a voté' }, 5: { capitaine: true, vote: true, lacs: true, brunie: true, statut: 'a voté' }, 6: { brunie: true, statut: 'délibère' },
    7: { vote: true, brunie: true, statut: 'a voté' }, 8: { vote: true, brunie: true, statut: 'a voté' }, 9: { brunie: true, statut: 'délibère' },
    10: { ...pub('mordu', 'Loup-garou') }, 11: { brunie: true, statut: 'délibère' }, 12: { brunie: true, statut: 'délibère' },
  } });
  b += abs(158, 318, carteMoyenne('villageois', { t: PAPIER }));
  b += perimetre(158, 318, 216, 302, 8, 0.875, K.b9);
  b += abs(158, 628, cartoucheSvg('lacs', 216, 30, 'Votre âme sœur : Étienne', PAPIER, { fs: 14 }));
  b += resume(t, `<span style="color: ${t.encre2};">Touchez un jeton pour choisir.</span>`, '5 sur 10');
  b += pli({ t, kind: 'village', label: 'Le village', count: '3' });
  b += barrePouce({ t, inner: bouton({ t, kind: 'secondaire', label: 'S’abstenir', w: 120 }) + bouton({ t, kind: 'eteint', label: 'Voter contre…', flex: '1' }) });
  return mobile('cMJ', 'C-MaCarte-Jour', t, b, 25);
}

// ============================================================ Ma carte — nuit (Tom, la Voyante)
export function maCarteNuit() {
  const t = CUIVRE;
  let b = barreSysteme(t) + frise({ t, heure: 'Nuit III', carte: 'repos' }) + minuterie({ t, restant: 10, chiffre: '0:24' });
  b += crieur({ t, rub: 'Nuit III', txt: 'La nuit se poursuit.' });
  b += abs(16, 183, `<div style="height: 72px; display: flex; align-items: center; justify-content: center; width: 358px;">${legende('« Dormez : d’autres veillent pour vous. »', t)}</div>`);
  const mortV = { mort: true, cart: ['ecu', 'Villageois·e', true] };
  b += placeD2({ t, etats: {
    1: mortV, 2: { cart: ['mordu', 'Loup-garou', false] }, 3: { mort: true, cart: ['ecu', 'Villageois·e', false] }, 5: { ...mortV, capitaine: false },
    10: { mort: true, cart: ['mordu', 'Loup-garou', true] }, 11: { moi: true, statut: 'vous' },
  } });
  b += abs(16, 412, carteMoyenne('voyante', { t: CUIVRE }));
  b += perimetre(16, 412, 216, 302, 8, 0.875, K.p1);
  b += pli({ t });
  b += barrePouce({ t, inner: bouton({ t, kind: 'appui', label: 'Relâchez pour cacher · 7 s', w: '100%', p: 1, etat: 'appuye' }) });
  return mobile('cMN', 'C-MaCarte-Nuit', t, b, 26);
}

// ============================================================ Fin — les données de la partie témoin
const DISTRIB = [
  [1, 'villageois', 'exécuté·e jour II', true], [2, 'loup', 'abattu·e jour III', false], [3, 'villageois', 'dévoré·e nuit I', true],
  [4, 'salvateur', 'en vie à la fin', true], [5, 'villageois', 'chagrin · jour II', true], [6, 'cupidon', 'en vie à la fin', true],
  [7, 'chasseur', 'dévoré·e nuit III', true], [8, 'sorciere', 'en vie à la fin', true], [9, 'idiot', 'en vie à la fin', true],
  [10, 'loup', 'exécuté·e jour I', false], [11, 'voyante', 'vous · en vie', true], [12, 'villageois', 'en vie à la fin', true],
];
const PLANCHES = [
  { n: 1, h: 'Nuit I', v: 'yeux', leg: '« Personne ne nous a vus. »', l: ['Cupidon a lié Anna et Étienne d’un même destin.', 'Le Salvateur a veillé sur Hélène.', 'La Voyante a sondé Clément : Villageois·e.', 'La meute a désigné Clément.', 'La meute a dévoré Clément — c’était Villageois·e.'] },
  { n: 2, h: 'Jour I', v: 'potence', leg: '« Pour une fois. »', l: ['Étienne a reçu le brassard.', 'Le village a condamné Jules à la potence.', 'Le village a exécuté Jules — c’était Loup-garou.'] },
  { n: 3, h: 'Nuit II', v: 'main', leg: '« Ce qu’elle voit, nul ne le croit. »', l: ['Le Salvateur a veillé sur Gaspard.', 'La Voyante a sondé Bastien : <b style="color: #A23B24; font-weight: 600;">Loup-garou</b>.', 'La meute n’a désigné personne.'] },
  { n: 4, h: 'Jour II', v: 'lacs', leg: '« Jusqu’à la mort, et pas un jour de plus. »', l: ['Le village a condamné Anna à la potence.', 'Le village a exécuté Anna — c’était Villageois·e.', 'Le chagrin a eu raison d’Étienne — c’était Villageois·e.', 'Léa a reçu le brassard.'] },
  { n: 5, h: 'Nuit III', v: 'yeux', leg: '« Personne ne nous a vus. »', l: ['Le Salvateur a veillé sur Hélène.', 'La Voyante a sondé Inès : l’Idiot du village.', 'La meute a désigné Gaspard.', 'La meute a dévoré Gaspard — c’était le Chasseur.'] },
  { n: 6, h: 'Jour III', v: 'cor', leg: '« Il tire mieux mort que vivant. »', l: ['Le Chasseur a abattu Bastien.', 'La balle du Chasseur a atteint Bastien — c’était Loup-garou.'] },
  { n: 7, h: 'Fin', v: 'sablier', leg: '« Il est l’heure. »', l: ['La dernière carte est posée sur la place.'] },
];
const FIN_LIGNES = ['Le village a triomphé : plus un loup ne rôde autour de Thiercelieux.', 'Vous étiez la Voyante, debout à la fin.', '6 survivants sur 12 : Delphine, Fanny, Hélène, Inès, Tom, Léa'];
const barreFin = (t) => barrePouce({ t, inner: bouton({ t, kind: 'secondaire', label: 'Quitter la table', flex: '1' }) + bouton({ t, kind: 'primaire', label: 'Rejouer', flex: '1' }) });
const cuvetteHtml = (x, y, w, h, inner, extra = '') => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; background: ${K.tei}; border: 1px solid; border-color: rgba(23,19,15,.38) ${K.bru} ${K.bru} rgba(23,19,15,.38); border-right-width: 1.5px; border-bottom-width: 1.5px; border-radius: 2px; overflow: hidden; ${extra}"><div aria-hidden="true" style="position: absolute; inset: 2px; border: 1px solid rgba(23,19,15,.14); pointer-events: none;"></div>${inner}</div>`;
const sc13 = (txt, col = K.del) => `<div style="font-family: ${F.sc}; font-size: 13px; line-height: 16px; letter-spacing: .06em; color: ${col};">${txt}</div>`;

function verdictBloc(w, vign = true) {
  const t = PAPIER;
  return `<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0; width: ${w}px;">
${legende('« Il est l’heure. »', t, { size: 20, lh: 28 })}
${vign ? `<div style="margin-top: 14px;">${vignette('sablier', 96)}</div>` : ''}
<div style="margin-top: 20px;">${cartoucheSvg('ecu', 240, 56, 'Le village', PAPIER, { fs: 26 }).replace(`font-family="${F.ss}" font-size="26"`, `font-family="${F.fell}" font-size="26"`)}</div>
<p style="margin: 18px 0 0; font-family: ${F.ss}; font-size: 18px; line-height: 24px; color: ${K.b9};">${FIN_LIGNES[0]}</p>
<h1 style="margin: 18px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 28px; line-height: 32px; color: ${K.b9};">Vous avez gagné</h1>
<div style="margin-top: 4px;">${sc13('Jour III')}</div>
<p style="margin: 12px 0 0; font-family: ${F.ss}; font-size: 16px; line-height: 24px; color: ${K.del};">${FIN_LIGNES[1]}<br>${FIN_LIGNES[2]}</p></div>`;
}

// ============================================================ Fin — verdict
export function finVerdict() {
  const t = PAPIER;
  let b = barreSysteme(t) + frise({ t, heure: 'Jour III', carte: 'repos' });
  let inner = `<div style="position: absolute; left: 20px; top: 22px;">${verdictBloc(302, false)}</div>`;
  inner += `<div style="position: absolute; left: 20px; top: 430px; width: 302px; border-top: 0.75px solid ${K.p2}; padding-top: 10px; display: flex; justify-content: space-between;">${sc13('Les cartes retournées')}<span style="font-family: ${F.ss}; font-size: 12px; color: ${K.del};">12 cartes · plus bas</span></div>`;
  inner += `<div style="position: absolute; left: 20px; top: 466px; display: flex; gap: 7px;">${cartePetite('villageois', { gagnant: true })}${cartePetite('loup')}${cartePetite('villageois', { gagnant: true })}</div>`;
  b += cuvetteHtml(24, 127, 342, 587, inner);
  b += barreFin(t);
  return mobile('cFV', 'C-Fin-Verdict', t, b, 27);
}

// ============================================================ Fin — distribution
export function finDistribution() {
  const t = PAPIER;
  let b = barreSysteme(t);
  b += abs(16, 55, `<div style="display: flex; justify-content: space-between; align-items: baseline; width: 358px;"><h2 style="margin: 0; font-family: ${F.fell}; font-weight: 400; font-size: 28px; line-height: 32px; color: ${K.b9};">Les cartes retournées</h2>${sc13('12')}</div>`);
  const cells = DISTRIB.map(([s, id, sort, g]) => `<div style="display: flex; flex-direction: column; align-items: center;">${cartePetite(id, { gagnant: g })}<div style="margin-top: 8px; font-family: ${F.ss}; font-size: 15px; line-height: 20px; font-weight: ${s === 11 ? 700 : 600}; color: ${K.b9};">${SIEGES[s].nom}</div><div style="font-family: ${F.ss}; font-size: 12px; line-height: 16px; color: ${K.del}; text-align: center; width: 112px;">${sort}</div></div>`).join('');
  b += abs(16, 98, `<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 8px; width: 358px;">${cells}</div>`);
  b += `<div aria-hidden="true" style="position: absolute; left: 128px; top: 830px; width: 134px; height: 5px; background: ${K.b9};"></div>`;
  return mobile('cFD', 'C-Fin-Distribution', t, b, 28);
}

// ============================================================ Fin — la nuit racontée (portfolio)
const ligneRecit = (l) => `<p style="margin: 0 0 4px; font-family: ${F.ss}; font-size: 16px; line-height: 24px; color: ${K.b9};">${l}</p>`;
export function finNuitRacontee() {
  const t = PAPIER;
  let b = barreSysteme(t);
  b += abs(16, 51, `<div style="display: flex; justify-content: space-between; align-items: baseline; width: 358px;"><h2 style="margin: 0; font-family: ${F.fell}; font-weight: 400; font-size: 28px; line-height: 32px; color: ${K.b9};">La nuit racontée</h2>${sc13('7 planches')}</div>`);
  b += abs(16, 92, `${frontispice()}<div style="margin-top: 6px;">${legende('« Nul ne se connaît. »', t, { size: 18, lh: 24 })}</div>`);
  const p1 = PLANCHES[0];
  b += abs(16, 290, `<div style="width: 358px; border-top: 0.75px solid ${K.p2}; padding-top: 10px;"><button type="button" aria-expanded="true" style="all: unset; display: flex; width: 358px; justify-content: space-between; align-items: center; cursor: pointer;">${sc13(`Pl. ${p1.n} — ${p1.h}`, K.b9)}<span style="transform: rotate(180deg); display: block;">${ICONES.chevronHaut(K.del)}</span></button>
<div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">${vignette(p1.v, 96)}<div style="flex: 1;">${legende(p1.leg, t, { size: 18, lh: 24 }).replace('text-align: center', 'text-align: left')}</div></div>
<div style="margin-top: 10px;">${p1.l.map(ligneRecit).join('')}</div></div>`);
  PLANCHES.slice(1, 4).forEach((p, i) => {
    b += abs(16, 608 + i * 58, `<button type="button" aria-expanded="false" style="all: unset; box-sizing: border-box; width: 358px; height: 52px; border-top: 0.75px solid ${K.p2}; display: flex; align-items: center; gap: 10px; cursor: pointer;"><div style="width: 92px;">${sc13(`Pl. ${p.n} — ${p.h}`, K.b9)}</div><div style="flex: 1; font-family: ${F.fell}; font-style: italic; font-size: 16px; line-height: 20px; color: ${K.del};">${p.leg}</div>${ICONES.chevronHaut(K.del)}</button>`);
  });
  b += `<div aria-hidden="true" style="position: absolute; left: 128px; top: 830px; width: 134px; height: 5px; background: ${K.b9};"></div>`;
  return mobile('cFN', 'C-Fin-NuitRacontee', t, b, 29);
}

// ============================================================ Fin — une planche en plein écran
export function finPlanche() {
  const t = PAPIER;
  const p = PLANCHES[2];
  let b = barreSysteme(t);
  let inner = `<div style="position: absolute; left: 0; top: 24px; width: 342px; display: flex; flex-direction: column; align-items: center; text-align: center;">${sc13(`Pl. ${p.n} — ${p.h}`, K.b9)}
<div style="margin-top: 20px;">${vignette(p.v, 192)}</div>
<div style="margin-top: 22px; width: 300px;">${legende(p.leg, t, { size: 20, lh: 28 })}</div>
<div style="margin-top: 22px; width: 294px; border-top: 0.75px solid ${K.p2}; padding-top: 14px; text-align: left;">${p.l.map(ligneRecit).join('')}</div></div>`;
  b += cuvetteHtml(24, 71, 342, 643, inner);
  b += barrePouce({ t, inner: bouton({ t, kind: 'secondaire', label: 'Pl. 2', icone: ICONES.chevronG(t.encre), flex: '1', aria: ' aria-label="Planche précédente : Pl. 2"' }) + `<div style="flex: none; align-self: center; font-family: ${F.ss}; font-size: 14px; color: ${t.encre2}; font-variant-numeric: tabular-nums lining-nums;">3 sur 7</div>` + bouton({ t, kind: 'secondaire', label: `Pl. 4</span>${ICONES.chevronD(t.encre)}<span>`, flex: '1', aria: ' aria-label="Planche suivante : Pl. 4"' }) });
  return mobile('cFP', 'C-Fin-Planche', t, b, 30);
}

// ============================================================ desktop
function friseDesktop({ t, heure, minut = true, carte = 'repos' }) {
  const W = 1440;
  const nuit = t.nom === 'cuivre';
  const svg = `<svg width="${W}" height="64" viewBox="0 0 ${W} 64" style="position: absolute; left: 0; top: 0;" aria-hidden="true">${nuit ? '' : `<rect width="${W}" height="64" fill="url(#hach-h-e)" opacity="0.28"/>`}${toits(W, 64, t, 9)}</svg>`;
  const b = (inner, w, label, extra = '') => `<button type="button" aria-label="${label}" style="width: ${w}px; height: 44px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux}; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 6px; color: ${t.encre}; font-family: ${F.ss}; font-size: 14px; cursor: pointer; ${extra}">${inner}</button>`;
  let gauche = b(ICONES.retour(t.encre), 44, 'Retour à l’arcade');
  gauche += `<div style="height: 44px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux}; display: flex; align-items: center; gap: 16px; padding: 0 14px; color: ${t.encre};"><span style="font-family: ${F.sc}; font-size: 22px; letter-spacing: .02em;">${heure}</span><span style="font-family: ${F.ss}; font-size: 20px; font-weight: 600; letter-spacing: .24em; color: ${t.encre2};">VRGL</span></div>`;
  if (minut) gauche += `<div style="position: relative; width: 300px; height: 44px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux};">${minuterie({ t, restant: 19, chiffre: '0:47', y: 9, w: 298 })}</div>`;
  const droite = (carte === 'vide' ? '' : b(`${ICONES.carte(t.encre)}<span>Ma carte</span>`, 120, 'Ma carte : gardez le pouce')) + b(ICONES.menu(t.encre), 44, 'Menu de la table') + b(ICONES.cloche(t.encre), 44, 'Couper le son');
  return `<div style="position: absolute; left: 0; top: 0; width: ${W}px; height: 64px; background: ${nuit ? 'transparent' : t.fond};">${svg}<div style="position: absolute; left: 32px; top: 10px; display: flex; gap: 6px;">${gauche}</div><div style="position: absolute; right: 32px; top: 10px; display: flex; gap: 6px;">${droite}</div></div>`;
}

export function revDesktop() {
  setPfx('cRX');
  const t = CUIVRE;
  let b = grainCuivre(1440, 900);
  b += friseDesktop({ t, heure: 'Nuit I' });
  b += crieur({ t, rub: 'Nuit I', txt: 'Les cartes sont distribuées, face contre table. À vous de les retourner.', y: 64, x: 32, w: 1004 });
  // la place en cercle, la carte au centre
  const cx = 534, cy = 494, rx = 442, ry = 304;
  let s = '';
  const sieges = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = 0; i < 12; i++) {
    const seat = ((2 - 1 + i) % 12) + 1;
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 12;
    const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a) - 16;
    s += jeton(x - 32, y - 120, 56, { t, siege: seat, nom: SIEGES[seat].nom, moi: seat === 2, statut: seat === 2 ? 'vous' : '' });
  }
  b += `<svg width="1004" height="748" viewBox="0 0 1004 748" style="position: absolute; left: 32px; top: 120px;" role="img" aria-label="La place : douze sièges en cercle">${s}</svg>`;
  b += abs(384, 238, carteGrande('loup', { t: PAPIER }));
  b += perimetre(384, 238, 300, 420, 12, 0.75, K.b9);
  b += abs(384, 668, bouton({ t, kind: 'appui', label: 'Relâchez pour cacher · 6 s', w: 300, p: 1, etat: 'appuye' }));
  b += abs(384, 720, `<p style="margin: 0; width: 300px; text-align: center; font-family: ${F.ss}; font-size: 13px; line-height: 16px; color: ${t.encre2};">Bouton tenu à la souris, ou Espace tenu.</p>`);
  // la colonne de droite
  const col = `<div style="position: absolute; left: 1068px; top: 80px; width: 340px; height: 788px; box-sizing: border-box; background: ${t.surface}; border: 1px solid ${t.filetDoux}; padding: 24px;">
${sc13('Votre carte', t.encre2)}
<h2 style="margin: 8px 0 0; font-family: ${F.fell}; font-weight: 400; font-size: 36px; line-height: 40px; color: ${t.encre};">Loup-garou</h2>
<p style="margin: 14px 0 0; font-family: ${F.ss}; font-size: 16px; line-height: 24px; color: ${t.encre};">${R.loup.desc}</p>
<div style="margin-top: 28px; border-top: 0.75px solid ${t.filetDoux}; padding-top: 16px;">${sc13('Votre meute', t.encre2)}
<div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">${cartoucheSvg('mordu', 100, 20, 'Loup-garou', CUIVRE, { fs: 12 })}<span style="font-family: ${F.ss}; font-size: 16px; font-weight: 600; color: ${t.encre};">Jules</span></div></div>
<div style="margin-top: 28px; border-top: 0.75px solid ${t.filetDoux}; padding-top: 16px;">${legende('« Nul ne se connaît. »', t, { size: 20, lh: 28 }).replace('text-align: center', 'text-align: left')}</div>
<div style="position: absolute; left: 24px; right: 24px; bottom: 24px;">${bouton({ t, kind: 'eteint', label: 'Je sais qui je suis', w: '100%' })}<p style="margin: 6px 0 0; font-family: ${F.ss}; font-size: 13px; line-height: 16px; color: ${t.encre2};">Lisez votre carte une première fois.</p></div></div>`;
  b += col;
  return page({ title: 'C-Revelation-Desktop', w: 1440, h: 900, bg: BG_CUIVRE, body: b });
}

export function finDesktop() {
  setPfx('cFX');
  const t = PAPIER;
  let b = grainPapier(1440, 900, 31);
  b += friseDesktop({ t, heure: 'Jour III', minut: false });
  // verdict
  let inner = `<div style="position: absolute; left: 28px; top: 28px;">${verdictBloc(364)}</div>`;
  inner += `<div style="position: absolute; left: 28px; bottom: 28px; width: 364px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">${bouton({ t, kind: 'primaire', label: 'Rejouer' })}${bouton({ t, kind: 'secondaire', label: 'L’arcade' })}${bouton({ t, kind: 'secondaire', label: 'Partager' })}${bouton({ t, kind: 'secondaire', label: 'Quitter la table' })}</div>`;
  b += cuvetteHtml(32, 88, 420, 788, inner);
  // distribution en 6 colonnes
  b += abs(484, 88, `<div style="display: flex; justify-content: space-between; align-items: baseline; width: 924px;"><h2 style="margin: 0; font-family: ${F.fell}; font-weight: 400; font-size: 36px; line-height: 40px; color: ${K.b9};">Les cartes retournées</h2>${sc13('les gagnants : double filet')}</div>`);
  const cells = DISTRIB.map(([s, id, sort, g]) => `<div style="display: flex; flex-direction: column; align-items: center;">${cartePetite(id, { gagnant: g })}<div style="margin-top: 8px; font-family: ${F.ss}; font-size: 16px; line-height: 20px; font-weight: ${s === 11 ? 700 : 600}; color: ${K.b9};">${SIEGES[s].nom}</div><div style="font-family: ${F.ss}; font-size: 13px; line-height: 16px; color: ${K.del};">${sort}</div></div>`).join('');
  b += abs(484, 142, `<div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px 8px; width: 924px;">${cells}</div>`);
  // la nuit racontée, 3 planches par rangée
  b += abs(484, 532, `<div style="display: flex; justify-content: space-between; align-items: baseline; width: 924px; border-top: 0.75px solid ${K.p2}; padding-top: 12px;"><h2 style="margin: 0; font-family: ${F.fell}; font-weight: 400; font-size: 36px; line-height: 40px; color: ${K.b9};">La nuit racontée</h2>${sc13('7 planches · la page défile')}</div>`);
  PLANCHES.slice(0, 6).forEach((p, i) => {
    const x = 484 + (i % 3) * 316, y = 592 + Math.floor(i / 3) * 360;
    const pin = `<div style="padding: 14px;">${sc13(`Pl. ${p.n} — ${p.h}`, K.b9)}<div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">${vignette(p.v, 96)}<div style="flex: 1;">${legende(p.leg, t, { size: 18, lh: 24 }).replace('text-align: center', 'text-align: left')}</div></div><div style="margin-top: 10px;">${p.l.map(ligneRecit).join('')}</div></div>`;
    b += cuvetteHtml(x, y, 300, 344, pin);
  });
  return page({ title: 'C-Fin-Desktop', w: 1440, h: 900, bg: BG_PAPIER, body: b });
}
