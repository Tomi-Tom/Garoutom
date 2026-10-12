// Les 18 écrans du lot E1b, dérivés du gabarit unique. Seul le contenu des zones change.
import { writeFileSync } from 'node:fs';
import {
  CUIVRE, MORSURE2, SIEGES, FELL, FELLSC, SERIF, GEOM, ICONES, GLYPHES,
  jeton, toits, bouton, appuiLong, boutonArme, cartouchePli, page,
} from './gabarit.mjs';

const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project/';

/* ── Le gabarit mobile 390 × 844 (§ 7.1) — ne JAMAIS modifier par écran ── */
const Z = {
  systeme: [0, 47], frise: [47, 56], minuterie: [103, 24], crieur: [127, 56],
  consigne: [183, 72], place: [255, 415], resume: [670, 24], pli: [694, 44],
  barre: [738, 72], accueil: [810, 34],
};
const zone = (nom, inner, extra = '') => {
  const [top, h] = Z[nom];
  return `<div class="z z-${nom}" data-zone="${nom}" style="position: absolute; left: 0; top: ${top}px; width: 390px; height: ${h}px; box-sizing: border-box; overflow: hidden;${extra}">\n${inner}\n</div>`;
};
const zoneLibre = (nom, top, h, inner, extra = '') => `<div class="z z-${nom}" data-zone="${nom}" style="position: absolute; left: 0; top: ${top}px; width: 390px; height: ${h}px; box-sizing: border-box; overflow: hidden;${extra}">\n${inner}\n</div>`;

/* contenus de zones */
function cSysteme(T) {
  return `<span style="position: absolute; left: 32px; top: 15px; font-family: ${SERIF}; font-size: 16px; line-height: 20px; font-weight: 600; color: ${T.encre}; font-variant-numeric: tabular-nums;">9:41</span>
<svg width="64" height="12" viewBox="0 0 64 12" aria-hidden="true" style="position: absolute; right: 24px; top: 19px;"><rect x="0" y="8" width="3" height="4" fill="${T.encre}"></rect><rect x="5" y="6" width="3" height="6" fill="${T.encre}"></rect><rect x="10" y="3.5" width="3" height="8.5" fill="${T.encre}"></rect><rect x="15" y="1" width="3" height="11" fill="${T.encre}"></rect><rect x="34.5" y="0.5" width="24" height="11" fill="none" stroke="${T.encre}" stroke-width="1"></rect><rect x="37" y="3" width="15" height="6" fill="${T.encre}"></rect><rect x="59.5" y="4" width="2" height="4" fill="${T.encre}"></rect></svg>`;
}
const outil = (label, icone, T, w = 44) => `<button type="button" aria-label="${label}" style="width: ${w}px; height: 44px; flex: 0 0 auto; padding: 0; display: flex; align-items: center; justify-content: center; gap: 4px; background: ${T.surface}; border: 1px solid ${T.filetDoux}; border-radius: 0; color: ${T.encre}; font-family: ${SERIF}; font-size: 14px; line-height: 16px;">${icone}</button>`;
function cFrise(heure, T) {
  return `<svg width="390" height="56" viewBox="0 0 390 56" aria-hidden="true" style="position: absolute; left: 0; top: 0;">${toits(390, 56, 172, 376, T)}<line x1="0" y1="55.25" x2="390" y2="55.25" stroke="${T.filet}" stroke-width="1.5"></line></svg>
<div style="position: absolute; left: 16px; top: 6px; display: flex; gap: 8px;">
${outil('Retour à l’arcade', ICONES.retour(24), T)}
<div style="height: 44px; padding: 0 12px; box-sizing: border-box; display: flex; align-items: center; background: ${T.surface}; border: 1px solid ${T.filetDoux};"><span style="font-family: ${FELLSC}; font-size: 20px; line-height: 24px; letter-spacing: .04em; color: ${T.encre};">${heure}</span></div>
</div>
<div style="position: absolute; right: 16px; top: 6px; display: flex; gap: 8px;">
${outil('Ma carte — gardez le pouce pour la voir', `${ICONES.carte(22)}<span>Carte</span>`, T, 76)}
${outil('Menu de table', ICONES.menu(24), T)}
${outil('Son : activé', ICONES.cloche(24), T)}
</div>`;
}
function cMinuterie(m, T) {
  const plein = m.absente ? 0 : m.crans;
  let crans = '';
  for (let i = 0; i < 24; i++) crans += i < plein
    ? `<rect x="${i * 8}" y="0" width="5" height="10" fill="${T.cranPlein}"></rect>`
    : `<rect x="${i * 8 + 0.5}" y="0.5" width="4" height="9" fill="none" stroke="${T.cranVide}" stroke-width="1"></rect>`;
  const chiffre = m.absente
    ? `<span style="color: ${T.encre2};">—</span>`
    : `<span style="color: ${T.encre};">${m.texte}</span>`;
  return `<div role="timer" aria-label="${m.absente ? 'Pas de minuterie pour vous' : `Il reste ${m.texte}`}" style="position: absolute; inset: 0;">
<span style="position: absolute; left: 16px; top: 4px; color: ${T.encre2};">${GLYPHES.sablier(16)}</span>
<svg width="189" height="10" viewBox="0 0 189 10" aria-hidden="true" style="position: absolute; left: 40px; top: 7px;">${crans}</svg>
<span style="position: absolute; right: 16px; top: 2px; width: 44px; text-align: right; font-family: ${SERIF}; font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums;">${chiffre}</span>
</div>`;
}
function cCrieur(c, T) {
  const chand = c.chandelle ? `<span style="color: ${T.encre}; margin-right: 6px;">${GLYPHES.chandelle(16)}</span>` : '';
  return `<div role="status" style="position: absolute; left: 16px; right: 16px; top: 4px; font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T.encre}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"><span style="font-family: ${FELLSC}; font-size: 13px; letter-spacing: .06em; color: ${T.narrateur}; margin-right: 8px;">${c.rub}</span>${chand}${c.texte}</div>
<span aria-hidden="true" style="position: absolute; left: 16px; right: 16px; bottom: 0; height: 0; border-top: 0.75px solid ${T.filetDoux};"></span>`;
}
function cConsigne(c, T) {
  if (c.legende) return `<p style="margin: 0; position: absolute; inset: 0 16px; display: flex; align-items: center; justify-content: center; text-align: center; font-family: ${FELL}; font-style: italic; font-size: 18px; line-height: 24px; color: ${T.narrateur};">« ${c.legende} »</p>`;
  const long = c.long;
  return `<p style="margin: 0; position: absolute; left: 16px; right: 16px; top: ${long ? 0 : 0}px; height: 72px; overflow: hidden; font-family: ${SERIF}; font-size: ${long ? 16 : 18}px; line-height: ${long ? 18 : 24}px; color: ${T.encre}; font-variation-settings: 'opsz' ${long ? 16 : 18};">${c.texte}</p>`;
}
function grille(D, sieges, etats, T, top) {
  const g = GEOM[D];
  const cells = sieges.map((s) => `<div style="display: flex; justify-content: center;">${jeton(s, D, T, etats[s] ?? {})}</div>`).join('\n');
  return `<div role="group" aria-label="La place, ${sieges.length} sièges" style="position: absolute; left: 16px; top: ${top}px; width: 358px; display: grid; grid-template-columns: repeat(${g.cols}, minmax(0, 1fr)); column-gap: ${g.gapC}px; row-gap: ${g.gapR}px;">
${cells}
</div>`;
}
function cResume(r, T) {
  if (!r) return '';
  return `<div style="position: absolute; left: 16px; right: 16px; top: 0; height: 24px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-family: ${SERIF}; font-size: 14px; line-height: 24px; white-space: nowrap;">
<span style="overflow: hidden; text-overflow: ellipsis; color: ${T.encre2};">${r.icone ? `<span style="color: ${T.encre}; margin-right: 6px;">${r.icone}</span>` : ''}<b style="font-weight: 600; color: ${T.encre};">${r.gras ?? ''}</b>${r.suite ?? ''}</span>
${r.droite ? `<span style="font-size: 16px; color: ${T.encre}; font-variant-numeric: tabular-nums lining-nums;">${r.droite}</span>` : ''}
</div>`;
}
function cPli(p, T, { ouvert = false } = {}) {
  const compte = p.compte != null ? `<span style="font-family: ${SERIF}; font-size: 16px; line-height: 20px; color: ${T.encre}; font-variant-numeric: tabular-nums;">· ${p.compte}</span>` : '';
  return `<button type="button" aria-label="${ouvert ? 'Réduire' : 'Ouvrir'} : ${p.mot}${p.compte != null ? `, ${p.compte} non lu` : ''}" style="position: absolute; left: 0; top: 0; width: 390px; height: 44px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: none; border: 0; border-top: 0.75px solid ${T.filetDoux}; border-radius: 0; color: ${T.encre}; font: inherit;">
${cartouchePli(p.type, p.mot, T)}${compte}<span style="margin-left: auto; width: 44px; height: 44px; display: flex; align-items: center; justify-content: flex-end; color: ${T.encre};">${ouvert ? ICONES.chevronBas(24) : ICONES.chevronHaut(24)}</span>
</button>`;
}
function cBarre(b, T) {
  let inner = '';
  if (b.type === 'appui') inner = appuiLong(b.label, T, { tenu: b.tenu });
  if (b.type === 'deux') inner = bouton(b.sec, T, { primaire: false }) + bouton(b.prim, T, { flex: true, aria: b.aria });
  if (b.type === 'un') inner = bouton(b.prim, T, { flex: true });
  if (b.type === 'sec') inner = bouton(b.sec, T, { primaire: false, flex: true });
  if (b.type === 'arme') inner = boutonArme(b.label, T);
  return `<div style="position: absolute; left: 16px; right: 16px; top: 12px; height: 48px; display: flex; gap: 8px;">${inner}</div>`;
}
const barreFond = (T) => ` background: ${T.surface}; border-top: 1.5px solid ${T.filet};`;
function cAccueil(T) {
  return `<span aria-hidden="true" style="position: absolute; left: 128px; top: 21px; width: 134px; height: 5px; background: ${T.filet};"></span>`;
}

/* ── Les sièges de la partie témoin, Nuit II ── */
function etatsBase(n, vous, { nuitUne = false } = {}) {
  const e = {};
  for (let s = 1; s <= n; s++) e[s] = {};
  if (!nuitUne) {
    e[3] = { mort: { camp: 'village', mot: 'Villageois·e' } };
    e[10] = { mort: { camp: 'meute', mot: 'Loup-garou' } };
    e[5] = { capitaine: true };
  }
  e[vous] = { ...e[vous], moi: true };
  return e;
}
const interactif = (e, sauf = []) => { for (const k of Object.keys(e)) if (!sauf.includes(Number(k))) e[k].interactif = true; return e; };
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const PLACE_TOP = { D2: 44, D3: 26 }; // 8 de marge + centrage dans les 399 utiles

const CRIEUR_NUIT2 = { rub: 'Jour I', chandelle: true, texte: 'Le village a exécuté Jules — c’était Loup-garou.' };
const DORMEUR = 'Dormez : d’autres veillent pour vous.';
const APPUI_CARTE = { type: 'appui', label: 'Gardez le pouce : ma carte' };
const REGISTRE = { type: 'registre', mot: 'Le registre' };

/* ── Assemblage d'un écran mobile ── */
function mobile(c) {
  const T = c.T ?? CUIVRE;
  const D = c.D ?? 'D2';
  const sieges = range(c.n ?? 12);
  const corps = [
    zone('systeme', cSysteme(T)),
    zone('frise', cFrise(c.heure ?? 'Nuit II', T)),
    zone('minuterie', cMinuterie(c.minuterie ?? { absente: true }, T)),
    zone('crieur', cCrieur(c.crieur ?? CRIEUR_NUIT2, T)),
    zone('consigne', cConsigne(c.consigne, T)),
    zone('place', grille(D, sieges, c.etats, T, PLACE_TOP[D]) + (c.surPlace ?? '')),
    zone('resume', cResume(c.resume, T)),
    zone('pli', cPli(c.pli ?? REGISTRE, T)),
    zone('barre', cBarre(c.barre ?? APPUI_CARTE, T), barreFond(T)),
    zone('accueil', cAccueil(T), ` background: ${T.surface};`),
  ].join('\n');
  return page({ titre: c.titre, w: 390, h: 844, T, corps, vous: c.vous });
}

const ecrire = (nom, html) => { writeFileSync(OUT + nom + '.dc.html', html, 'utf8'); console.log('écrit', nom); };

/* ═════════════════════════ Les écrans mobiles ═════════════════════════ */

// 1. Nuit-Tombe — vous = Anna ; l'instant de la morsure II
ecrire('Caprices-E1-Nuit-Tombe', mobile({
  titre: 'Nuit tombe', vous: 'Anna', T: MORSURE2,
  crieur: { rub: 'Nuit II', texte: 'La nuit tombe sur Thiercelieux. Le village' },
  consigne: { legende: DORMEUR },
  etats: etatsBase(12, 1),
}));

// 2. Nuit-Dort — vous = Anna ; LE gabarit de référence
ecrire('Caprices-E1-Nuit-Dort', mobile({
  titre: 'Nuit dort', vous: 'Anna',
  consigne: { legende: DORMEUR },
  etats: etatsBase(12, 1),
}));

// 3. Nuit-Dort-Mort — vous = Clément
{
  const e = etatsBase(12, 3);
  ecrire('Caprices-E1-Nuit-Dort-Mort', mobile({
    titre: 'Nuit mort', vous: 'Clément',
    consigne: { legende: 'Tout voir, enfin, et trop tard.' },
    etats: e,
    pli: { type: 'audela', mot: 'L’au-delà', compte: 4 },
  }));
}

// 4. Nuit-Dort-Serment — identique à Nuit-Dort sauf le pli
ecrire('Caprices-E1-Nuit-Dort-Serment', mobile({
  titre: 'Nuit serment', vous: 'Anna',
  consigne: { legende: DORMEUR },
  etats: etatsBase(12, 1),
  pli: { type: 'serment', mot: 'Le serment', compte: 2 },
}));

// 5. Nuit-PetiteFille — vous = Nour ; table de 18, D3
{
  const e = etatsBase(18, 14);
  e[6] = { ...e[6], pf: '1' };
  e[7] = { ...e[7], pf: '1' };
  ecrire('Caprices-E1-Nuit-PetiteFille', mobile({
    titre: 'Nuit Petite Fille', vous: 'Nour', n: 18, D: 'D3',
    minuterie: { crans: 17, texte: '0:41' },
    consigne: { legende: DORMEUR },
    etats: e,
    resume: { icone: GLYPHES.porte(16), gras: 'Porte entrouverte' },
  }));
}

// 6. Nuit-Meute — vous = Bastien ; table de 18 ; aucune teinte de surface (N2)
function etatsMeute(D) {
  const e = interactif(etatsBase(18, 2), [2, 15]);
  e[2] = { ...e[2], nonchoix: true, interactif: false };
  e[15] = { ...e[15], nonchoix: true };
  e[6] = { ...e[6], choisi: true, pastille: 'B·O' };
  return e;
}
const CONSIGNE_DEVORER = 'La meute a faim. Désignez un habitant à dévorer — ou laissez le village dormir.';
const RESUME_MEUTE = { gras: 'Votre choix : Fanny', suite: ' · la meute : Fanny (2)' };
const BARRE_MEUTE = { type: 'deux', sec: 'Ne viser personne', prim: 'Dévorer Fanny', aria: 'Dévorer Fanny — demandera une confirmation' };
ecrire('Caprices-E1-Nuit-Meute', mobile({
  titre: 'Nuit meute', vous: 'Bastien', n: 18, D: 'D3',
  minuterie: { crans: 17, texte: '0:41' },
  consigne: { texte: CONSIGNE_DEVORER },
  etats: etatsMeute('D3'),
  resume: RESUME_MEUTE,
  pli: { type: 'meute', mot: 'La meute', compte: 1 },
  barre: BARRE_MEUTE,
}));

// 7. Nuit-Meute-Fil — le fil de la meute ouvert au tiers (place D4)
{
  const T = CUIVRE;
  const e = etatsMeute('D4');
  const dent = (h) => { let d = 'M2 0'; for (let y = 0; y < h; y += 4) d += ` L${y % 8 === 0 ? 4 : 0} ${y + 4}`; return `<svg width="4" height="${h}" viewBox="0 0 4 ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><path d="${d}" fill="none" stroke="${T.meuteForme}" stroke-width="1.5"></path></svg>`; };
  const msg = (nom, texte, moi = false) => `<li style="position: relative; list-style: none; margin: 0; padding: 0 0 0 12px; height: 40px;">${dent(40)}<span style="display: block; ${moi ? `font-family: ${FELLSC}; font-size: 13px; letter-spacing: .06em;` : `font-family: ${SERIF}; font-size: 14px; font-weight: 600;`} line-height: 16px; color: ${T.meute};">${nom}</span><span style="display: block; font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T.encre}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${texte}</span></li>`;
  const fil = `<section aria-label="Le fil de la meute" style="position: absolute; inset: 0; background: ${T.surface};">
<span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 0; border-top: 1.5px solid ${T.filet};"></span><span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 4.5px; border-top: 0.75px solid ${T.filet};"></span>
<div style="position: absolute; left: 0; top: 6px; width: 390px; height: 44px;">${cPli({ type: 'meute', mot: 'La meute' }, { ...T, filetDoux: 'transparent' }, { ouvert: true })}</div>
<ol style="position: absolute; left: 16px; right: 16px; top: 54px; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;">
${msg('Octave', 'Fanny se doutait de Jules.')}
${msg('vous', 'Alors Fanny, cette nuit.', true)}
${msg('Octave', 'Je pose ma pastille.')}
</ol>
<label style="position: absolute; left: 16px; right: 16px; top: 183px; height: 48px; display: flex; align-items: center; gap: 8px; background: ${T.creux}; border-bottom: 1.5px solid ${T.filet}; box-sizing: border-box; padding: 0 0 0 12px;"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">Message à la meute</span><input type="text" placeholder="Parler à la meute…" style="flex: 1 1 auto; min-width: 0; height: 44px; background: transparent; border: 0; color: ${T.encre}; font-family: ${SERIF}; font-size: 16px;"><button type="button" aria-label="Envoyer" style="width: 44px; height: 44px; background: none; border: 0; color: ${T.encre}; display: flex; align-items: center; justify-content: center;">${ICONES.plume(24)}</button></label>
</section>`;
  const corps = [
    zone('systeme', cSysteme(T)),
    zone('frise', cFrise('Nuit II', T)),
    zone('minuterie', cMinuterie({ crans: 16, texte: '0:38' }, T)),
    zoneLibre('crieur-consigne', 127, 40, `<p style="margin: 0; position: absolute; left: 16px; right: 16px; top: 8px; font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T.encre}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${CONSIGNE_DEVORER}</p><span aria-hidden="true" style="position: absolute; left: 16px; right: 16px; bottom: 0; border-top: 0.75px solid ${T.filetDoux};"></span>`),
    zoneLibre('place', 167, 316, grille('D4', range(18), e, T, 0)),
    zoneLibre('resume', 483, 24, cResume(RESUME_MEUTE, T)),
    zoneLibre('fil', 507, 231, fil),
    zone('barre', cBarre(BARRE_MEUTE, T), barreFond(T)),
    zone('accueil', cAccueil(T), ` background: ${T.surface};`),
  ].join('\n');
  ecrire('Caprices-E1-Nuit-Meute-Fil', page({ titre: 'Nuit meute fil', w: 390, h: 844, T, corps, vous: 'Bastien' }));
}

// 8. Nuit-Voyante — vous = Tom
{
  const e = interactif(etatsBase(12, 11), [11]);
  e[11] = { ...e[11], nonchoix: true };
  e[2] = { ...e[2], choisi: true };
  ecrire('Caprices-E1-Nuit-Voyante', mobile({
    titre: 'Nuit Voyante', vous: 'Tom',
    minuterie: { crans: 19, texte: '0:47' },
    consigne: { texte: 'Sondez un vivant, jamais vous : son rôle s’inscrit dans votre carnet.' },
    etats: e,
    resume: { gras: 'Votre choix : Bastien' },
    barre: { type: 'un', prim: 'Sonder Bastien' },
  }));
}

// 9. Nuit-Voyante-Lecture — le carnet sous le pouce, bruni au palier III (N3)
{
  const e = etatsBase(12, 11);
  e[2] = { ...e[2], brunie: { camp: 'meute', mot: 'Loup-garou' } };
  ecrire('Caprices-E1-Nuit-Voyante-Lecture', mobile({
    titre: 'Voyante carnet', vous: 'Tom',
    consigne: { legende: DORMEUR },
    etats: e,
    resume: { gras: 'Relâchez pour cacher', droite: '6 s' },
    barre: { type: 'appui', label: 'Gardez le pouce : lire le carnet', tenu: true },
  }));
}

// 10. Nuit-Sorciere — vous = Hélène ; victime : Fanny
const CONSIGNE_VICTIME = 'La meute a désigné sa victime : Fanny. Sauvez-la avec votre potion de vie, ou laissez-la partir — et votre potion de mort peut frapper un autre vivant.';
{
  const e = interactif(etatsBase(12, 8), [8]);
  e[6] = { ...e[6], mire: true };
  ecrire('Caprices-E1-Nuit-Sorciere', mobile({
    titre: 'Nuit Sorcière', vous: 'Hélène',
    minuterie: { crans: 14, texte: '0:35' },
    consigne: { texte: CONSIGNE_VICTIME, long: true },
    etats: e,
    resume: { gras: `${GLYPHES.fioleVie(16)} Vie : 1`, suite: ` · <span style="color: ${CUIVRE.encre};">${GLYPHES.fioleMort(16)}</span> Mort : 1` },
    barre: { type: 'deux', sec: 'Ne rien faire', prim: 'Sauver Fanny' },
  }));
}

// 11. Nuit-Sorciere-SansVictime — fiole de vie épuisée ; Léa choisie ; armé
{
  const e = interactif(etatsBase(12, 8), [8]);
  e[12] = { ...e[12], choisi: true };
  ecrire('Caprices-E1-Nuit-Sorciere-SansVictime', mobile({
    titre: 'Sorcière sans victime', vous: 'Hélène',
    minuterie: { crans: 11, texte: '0:27' },
    consigne: { texte: 'La meute n’a dévoré personne cette nuit. Votre potion de mort peut encore frapper — ou vous ne faites rien.' },
    etats: e,
    resume: { gras: `${GLYPHES.fioleEpuisee(16)} Vie : épuisée`, suite: ` · <span style="color: ${CUIVRE.encre};">${GLYPHES.fioleMort(16)}</span> Mort : 1` },
    barre: { type: 'arme', label: 'Confirmer — sans retour : empoisonner Léa' },
  }));
}

// 12. Nuit-Salvateur — vous = Delphine ; Fanny interdite ; Gaspard choisi
function etatsSalvateur(inter) {
  const e = etatsBase(12, 4);
  if (inter) interactif(e, [6]);
  e[6] = { ...e[6], interdit: true, interactif: false };
  e[7] = { ...e[7], choisi: true };
  return e;
}
ecrire('Caprices-E1-Nuit-Salvateur', mobile({
  titre: 'Nuit Salvateur', vous: 'Delphine',
  minuterie: { crans: 20, texte: '0:50' },
  consigne: { texte: 'Fanny dormait sous votre bouclier hier : pas deux nuits de suite — choisissez une autre maison.' },
  etats: etatsSalvateur(true),
  resume: { gras: 'Votre choix : Gaspard' },
  barre: { type: 'un', prim: 'Protéger Gaspard' },
}));

// 13. Nuit-Cupidon — vous = Fanny ; Nuit I ; lacs provisoire Anna — Étienne
{
  const T = CUIVRE;
  const e = interactif(etatsBase(12, 6, { nuitUne: true }));
  e[1] = { ...e[1], choisi: true };
  e[5] = { ...e[5], choisi: true };
  // place : grille D2 à top 44 ; colonne 0 → cellule x 16 ; O = cx − 0,52 m
  const ox = 16 + 42.5 - 0.52 * 60, yA = 44 + 32, yE = 44 + 112 + 32;
  const lacs = (y) => `<rect x="${ox - 10}" y="${y - 8}" width="20" height="16" fill="${T.fond}"></rect><circle cx="${ox - 2}" cy="${y}" r="4.2" fill="none" stroke="${T.serment}" stroke-width="1.6"></circle><circle cx="${ox + 2}" cy="${y}" r="4.2" fill="none" stroke="${T.serment}" stroke-width="1.6"></circle>`;
  const sur = `<svg width="390" height="415" viewBox="0 0 390 415" aria-hidden="true" style="position: absolute; left: 0; top: 0; pointer-events: none;"><path d="M${ox - 1.5} ${yA + 9} V${yE - 9} M${ox + 1.5} ${yA + 9} V${yE - 9}" stroke="${T.serment}" stroke-width="1" stroke-dasharray="3 3"></path>${lacs(yA)}${lacs(yE)}</svg>`;
  ecrire('Caprices-E1-Nuit-Cupidon', mobile({
    titre: 'Nuit Cupidon', vous: 'Fanny', heure: 'Nuit I',
    minuterie: { crans: 15, texte: '0:39' },
    crieur: { rub: 'Nuit I', texte: 'La table est dressée à Thiercelieux. Que la partie commence.' },
    consigne: { texte: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un meurt, l’autre le suit.' },
    etats: e, surPlace: sur,
    resume: { gras: 'Vos deux choix : Anna et Étienne' },
    barre: { type: 'arme', label: 'Confirmer : lier Anna et Étienne' },
  }));
}

// 14. Nuit-Corbeau — vous = Malo ; table de 18
{
  const e = interactif(etatsBase(18, 13));
  e[2] = { ...e[2], choisi: true };
  ecrire('Caprices-E1-Nuit-Corbeau', mobile({
    titre: 'Nuit Corbeau', vous: 'Malo', n: 18, D: 'D3',
    minuterie: { crans: 21, texte: '0:52' },
    consigne: { texte: 'Désignez un vivant, vous compris : au vote du jour, deux voix pèseront d’office contre ce vivant — ou ne marquez personne. La marque sera annoncée, jamais votre main.', long: true },
    etats: e,
    resume: { gras: 'Votre choix : Bastien' },
    barre: { type: 'deux', sec: 'Ne marquer personne', prim: 'Marquer Bastien' },
  }));
}

// 15. Nuit-LoupBlanc — vous = Octave ; seul Bastien choisissable
{
  const e = etatsBase(18, 15);
  for (let s = 1; s <= 18; s++) if (!e[s].mort && s !== 2) e[s] = { ...e[s], nonchoix: true };
  e[2] = { ...e[2], choisi: true, interactif: true };
  ecrire('Caprices-E1-Nuit-LoupBlanc', mobile({
    titre: 'Nuit Loup Blanc', vous: 'Octave', n: 18, D: 'D3',
    minuterie: { crans: 18, texte: '0:44' },
    consigne: { texte: 'La meute dort. Dévorez l’un de ses loups — ou épargnez-la cette nuit.' },
    etats: e,
    resume: { gras: 'Votre choix : Bastien', suite: ' · sans retour' },
    barre: { type: 'deux', sec: 'Épargner la meute', prim: 'Dévorer Bastien', aria: 'Dévorer Bastien — demandera une confirmation, sans retour' },
  }));
}

// 16. Nuit-Recap — vous = Delphine ; après le choix
ecrire('Caprices-E1-Nuit-Recap', mobile({
  titre: 'Nuit récap', vous: 'Delphine',
  minuterie: { crans: 12, texte: '0:29' },
  consigne: { texte: 'Bouclier posé sur Gaspard. Vous pouvez changer tant que l’étape court.' },
  etats: etatsSalvateur(false),
  resume: { gras: 'Votre choix : Gaspard', suite: ' · envoyé' },
  barre: { type: 'sec', sec: 'Changer' },
}));

/* ═════════════════════════ Le gabarit desktop 1440 × 900 ═════════════════════════ */
// frise 0-64 · crieur x32-1036 y64-120 · place x32-1036 y120-868 · colonne x1068-1408 y80-868
const ZB = { frise: [0, 0, 1440, 64], crieur: [32, 64, 1004, 56], place: [32, 120, 1004, 748], colonne: [1068, 80, 340, 788] };
const zoneB = (nom, inner, extra = '') => { const [l, t, w, h] = ZB[nom]; return `<div class="z z-${nom}" data-zone="${nom}" style="position: absolute; left: ${l}px; top: ${t}px; width: ${w}px; height: ${h}px; box-sizing: border-box;${extra}">\n${inner}\n</div>`; };

function bFrise(m, T) {
  let crans = '';
  for (let i = 0; i < 24; i++) crans += i < (m.absente ? 0 : m.crans)
    ? `<rect x="${i * 8}" y="0" width="5" height="10" fill="${T.cranPlein}"></rect>`
    : `<rect x="${i * 8 + 0.5}" y="0.5" width="4" height="9" fill="none" stroke="${T.cranVide}" stroke-width="1"></rect>`;
  const cart = (inner, extra = '') => `<div style="height: 44px; padding: 0 12px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; background: ${T.surface}; border: 1px solid ${T.filetDoux};${extra}">${inner}</div>`;
  return `<svg width="1440" height="64" viewBox="0 0 1440 64" aria-hidden="true" style="position: absolute; left: 0; top: 0;">${toits(1440, 64, 880, 1414, T)}<line x1="0" y1="63.25" x2="1440" y2="63.25" stroke="${T.filet}" stroke-width="1.5"></line></svg>
<div style="position: absolute; left: 32px; top: 8px; display: flex; gap: 8px;">
${outil('Retour à l’arcade', ICONES.retour(24), T)}
${cart(`<span style="font-family: ${FELLSC}; font-size: 22px; line-height: 28px; letter-spacing: .04em; color: ${T.encre};">Nuit II</span>`)}
${cart(`<span style="font-family: ${SERIF}; font-size: 13px; line-height: 16px; color: ${T.encre2};">Table</span><span style="font-family: ${SERIF}; font-size: 20px; line-height: 24px; font-weight: 600; letter-spacing: .24em; color: ${T.encre};">VRGL</span>`)}
${cart(`<span style="color: ${T.encre2};">${GLYPHES.sablier(16)}</span><svg width="189" height="10" viewBox="0 0 189 10" aria-hidden="true">${crans}</svg><span role="timer" style="width: 44px; text-align: right; font-family: ${SERIF}; font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums; color: ${m.absente ? T.encre2 : T.encre};">${m.absente ? '—' : m.texte}</span>`)}
</div>
<div style="position: absolute; right: 32px; top: 8px; display: flex; gap: 8px;">
${outil('Ma carte — gardez le pouce pour la voir', `${ICONES.carte(22)}<span>Carte</span>`, T, 88)}
${outil('Menu de table', ICONES.menu(24), T)}
${outil('Son : activé', ICONES.cloche(24), T)}
</div>`;
}
function bCrieur(c, T) {
  return `<div role="status" style="position: absolute; left: 0; right: 0; top: 16px; font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T.encre}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><span style="font-family: ${FELLSC}; font-size: 14px; letter-spacing: .06em; color: ${T.narrateur}; margin-right: 10px;">${c.rub}</span>${c.chandelle ? `<span style="margin-right: 6px;">${GLYPHES.chandelle(16)}</span>` : ''}${c.texte}</div>
<span aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; border-top: 0.75px solid ${T.filetDoux};"></span>`;
}
// cercle : centre (502, 370) local à la place ; rx 442, ry 304 ; « moi » à 6 heures
function bPlace(n, moi, etats, pupitre, T) {
  const cx = 502, cy = 370, rx = 442, ry = 304;
  let s = '';
  for (let k = 0; k < n; k++) {
    const seat = ((moi - 1 + k) % n) + 1;
    const a = (90 + k * 360 / n) * Math.PI / 180;
    const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
    s += `<div style="position: absolute; left: ${(x - 48).toFixed(1)}px; top: ${(y - 32).toFixed(1)}px;">${jeton(seat, 'DK', T, etats[seat] ?? {})}</div>\n`;
  }
  const pup = `<section class="pupitre cuvette" aria-label="Le pupitre" style="position: absolute; left: 322px; top: 270px; width: 360px; height: 200px; box-sizing: border-box; border: 1px solid ${T.filetDoux}; border-radius: 2px;">
<span aria-hidden="true" style="position: absolute; inset: 2px; border: 1px solid ${T.surface};"></span>
${pupitre}
</section>`;
  return `<div role="group" aria-label="La place, ${n} sièges en cercle" style="position: absolute; inset: 0;">\n${s}</div>\n${pup}`;
}
function bPupitre(p, T) {
  const consigne = p.legende
    ? `<p style="margin: 0; position: absolute; left: 16px; right: 16px; top: 14px; height: 84px; display: flex; align-items: center; justify-content: center; text-align: center; font-family: ${FELL}; font-style: italic; font-size: 20px; line-height: 28px; color: ${T.narrateur};">« ${p.legende} »</p>`
    : `<p style="margin: 0; position: absolute; left: 16px; right: 16px; top: 14px; height: 84px; overflow: hidden; font-family: ${SERIF}; font-size: 18px; line-height: 28px; color: ${T.encre};">${p.texte}</p>`;
  const resume = `<div style="position: absolute; left: 16px; right: 16px; top: 100px; height: 24px;">${p.resume ? cResume(p.resume, T).replace('left: 16px; right: 16px;', 'left: 0; right: 0;') : ''}</div>`;
  return `${consigne}\n${resume}\n<div style="position: absolute; left: 16px; right: 16px; top: 136px; height: 48px; display: flex; gap: 8px;">${p.boutons}</div>`;
}
function bColonne(c, T) {
  return `<div style="position: absolute; inset: 0; background: ${T.surface}; border: 1px solid ${T.filetDoux};"></div>
<div style="position: absolute; left: 16px; right: 16px; top: 8px; height: 44px; display: flex; align-items: center; gap: 8px;">${c.tete}</div>
<span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 60px; border-top: 1.5px solid ${T.filet};"></span><span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 64.5px; border-top: 0.75px solid ${T.filet};"></span>
<div style="position: absolute; left: 16px; right: 16px; top: 80px; bottom: 80px; overflow: hidden;">${c.corps}</div>
<div style="position: absolute; left: 16px; right: 16px; bottom: 16px; height: 48px;">${c.pied}</div>`;
}
function bureau(c) {
  const T = CUIVRE;
  const corps = [
    zoneB('frise', bFrise(c.minuterie, T)),
    zoneB('crieur', bCrieur(CRIEUR_NUIT2, T)),
    zoneB('place', bPlace(18, c.moi, c.etats, bPupitre(c.pupitre, T), T)),
    zoneB('colonne', bColonne(c.colonne, T)),
  ].join('\n');
  return page({ titre: c.titre, w: 1440, h: 900, T, corps, vous: c.vous });
}

// Le registre (public, identique pour tous)
const T0 = CUIVRE;
const bloc = (rub, lignes, premier = false) => `<section style="margin: ${premier ? 0 : 20}px 0 0;"><h3 style="margin: 0; padding: 0 0 6px; font-family: ${FELLSC}; font-weight: 400; font-size: 14px; line-height: 20px; letter-spacing: .06em; color: ${T0.narrateur}; border-bottom: 0.75px solid ${T0.filet};">${rub}</h3><ul style="margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">${lignes.map((l) => `<li style="font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T0.encre};">${l}</li>`).join('')}</ul></section>`;
const chand = `<span style="margin-right: 6px;">${GLYPHES.chandelle(16)}</span>`;
const cartFin = (camp, mot) => `<span style="display: inline-block; vertical-align: -5px; margin-left: 6px;">${(camp === 'meute'
  ? `<svg width="86" height="20" viewBox="0 0 86 20" role="img" aria-label="Cartouche mordu : ${mot}"><path d="M4 1 H70 L73 4.5 L77 1.5 L78.5 7 L85 9 L79.5 12 L84 16.5 L78 17.5 L75.5 19 H4 L1 16 V4 Z" fill="${T0.surface}" stroke="${T0.meute}" stroke-width="2" stroke-linejoin="round"></path><text x="38.5" y="14" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" font-weight="600" fill="${T0.meute}">${mot}</text></svg>`
  : `<svg width="82" height="20" viewBox="0 0 82 20" role="img" aria-label="Cartouche écu : ${mot}"><path d="M4 0.75 H78 L81.25 4 V16 L78 19.25 H4 L0.75 16 V4 Z" fill="${T0.surface}" stroke="${T0.encre}" stroke-width="1.5"></path><text x="41" y="14" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="12" fill="${T0.encre}">${mot}</text></svg>`)}</span>`;
const REGISTRE_CORPS = [
  bloc('Nuit II', ['La nuit tombe sur Thiercelieux. Le village s’endort.'], true),
  bloc('Jour I', [
    `${chand}La meute a dévoré Clément — c’était Villageois·e.${cartFin('village', 'Villageois·e')}`,
    'Le village se choisit un capitaine.',
    'Étienne prend le brassard : sa voix comptera double.',
    'Le jour se lève sur Thiercelieux. Le village délibère.',
    'Les voix sont comptées : la potence est pour Jules.',
    `${chand}Le village a exécuté Jules — c’était Loup-garou.${cartFin('meute', 'Loup-garou')}`,
  ]),
  bloc('Nuit I', [
    'La table est dressée à Thiercelieux. Que la partie commence.',
    'Les cartes sont distribuées, face contre table. À vous de les retourner.',
    'La nuit tombe sur Thiercelieux. Le village s’endort.',
  ]),
].join('');
const piedFerme = (texte) => `<div style="height: 48px; box-sizing: border-box; display: flex; align-items: center; padding: 0 12px; background: ${T0.creux}; border-bottom: 1.5px dashed ${T0.filetDoux}; font-family: ${SERIF}; font-size: 14px; line-height: 20px; color: ${T0.encre2};">${texte}</div>`;

// 17. Nuit-Dort-Desktop — vous = Anna ; table de 18
ecrire('Caprices-E1-Nuit-Dort-Desktop', bureau({
  titre: 'Nuit dort bureau', vous: 'Anna', moi: 1,
  minuterie: { absente: true },
  etats: etatsBase(18, 1),
  pupitre: { legende: DORMEUR, boutons: appuiLong('Gardez le pouce : ma carte', T0) },
  colonne: {
    tete: cartouchePli('registre', 'Le registre', T0, 168, 32),
    corps: REGISTRE_CORPS,
    pied: piedFerme('Le fil du village se tait jusqu’à l’aube.'),
  },
}));

// 18. Nuit-Meute-Desktop — vous = Bastien ; même gabarit au pixel
{
  const T = CUIVRE;
  const ongletVillage = `<button type="button" aria-label="Onglet : Le village" style="height: 44px; padding: 0; background: none; border: 0; display: flex; align-items: center;">${cartouchePli('village', 'Le village', T, 132, 32)}</button>`;
  const ongletMeute = `<button type="button" aria-label="Onglet actif : La meute" aria-pressed="true" style="height: 44px; padding: 0; background: none; border: 0; display: flex; align-items: center;">${cartouchePli('meute', 'La meute', { ...T, surface: T.actionFond }, 140, 32)}</button>`;
  const dent = (h) => { let d = 'M2 0'; for (let y = 0; y < h; y += 4) d += ` L${y % 8 === 0 ? 4 : 0} ${y + 4}`; return `<svg width="4" height="${h}" viewBox="0 0 4 ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><path d="${d}" fill="none" stroke="${T.meuteForme}" stroke-width="1.5"></path></svg>`; };
  const msg = (nom, texte, moi = false, h = 44) => `<li style="position: relative; list-style: none; margin: 0; padding: 0 0 0 12px; min-height: ${h}px;">${dent(h)}<span style="display: block; ${moi ? `font-family: ${FELLSC}; font-size: 14px; letter-spacing: .06em;` : `font-family: ${SERIF}; font-size: 16px; font-weight: 600;`} line-height: 20px; color: ${T.meute};">${nom}</span><span style="display: block; font-family: ${SERIF}; font-size: 16px; line-height: 24px; color: ${T.encre};">${texte}</span></li>`;
  const fil = `<ol aria-label="Le fil de la meute" style="margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;">
${msg('Octave', 'Fanny se doutait de Jules.')}
${msg('vous', 'Alors Fanny, cette nuit.', true)}
${msg('Octave', 'Et la Voyante ? Elle a dû sonder l’un de nous.', false, 68)}
${msg('vous', 'Demain. Ce soir, Fanny.', true)}
${msg('Octave', 'Je pose ma pastille.')}
</ol>`;
  const pied = `<label style="height: 48px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: 0 0 0 12px; background: ${T.creux}; border-bottom: 1.5px solid ${T.filet};"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">Message à la meute</span><input type="text" placeholder="Parler à la meute…" style="flex: 1 1 auto; min-width: 0; height: 44px; background: transparent; border: 0; color: ${T.encre}; font-family: ${SERIF}; font-size: 16px;"><button type="button" aria-label="Envoyer" style="width: 44px; height: 44px; background: none; border: 0; color: ${T.encre}; display: flex; align-items: center; justify-content: center;">${ICONES.plume(24)}</button></label>`;
  ecrire('Caprices-E1-Nuit-Meute-Desktop', bureau({
    titre: 'Nuit meute bureau', vous: 'Bastien', moi: 2,
    minuterie: { crans: 17, texte: '0:41' },
    etats: etatsMeute('DK'),
    pupitre: {
      texte: CONSIGNE_DEVORER, resume: RESUME_MEUTE,
      boutons: bouton('Ne viser personne', T, { primaire: false }) + bouton('Dévorer Fanny', T, { flex: true, aria: 'Dévorer Fanny — demandera une confirmation' }),
    },
    colonne: { tete: ongletVillage + ongletMeute, corps: fil, pied },
  }));
}
