// Lot E2a — gabarit desktop 1440 × 900 (§ 7.1, § 5.16) : cercle, pupitre, colonne du fil.
import { page, PAPIER as T, st, esc, abs, icone, cartouche, FELL, FELLSC, SERIF } from './base.mjs';
import { jeton, DENS } from './jeton.mjs';
import { bouton, minuterie, crieur, voix } from './gabarit.mjs';
import { table, scene12, MORTS_J2, PROMPT_JOUR_COURT, CRIEUR_J2 } from './tables.mjs';
import { legende, batons, ligneCrieur } from './planches.mjs';

const W = 1440, H = 900, CX = 534, CY = 480, RX = 442, RY = 304;

function friseDesktop(heure, minu) {
  let toits = 'M0 64 V52';
  for (let x = 0; x < W; x += 64) toits += ` L${x + 16} ${44 + (x / 64) % 3 * 2} L${x + 32} 52 V49 L${x + 46} ${41 + (x / 64) % 2 * 3} L${x + 60} 49 V53 H${x + 64}`;
  toits += ` V64 Z`;
  const svg = `<svg width="${W}" height="64" viewBox="0 0 ${W} 64" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><rect width="${W}" height="64" fill="url(#hach-h-e)" opacity="0.28"></rect><path d="${toits}" fill="url(#hach-x-e)" stroke="${T.filet}" stroke-width="1"></path>
<path d="M700 54 V30 L710 18 L720 30 V54 Z" fill="url(#hach-x-e)" stroke="${T.filet}" stroke-width="1"></path><rect x="707.5" y="34" width="5" height="8" fill="${T.surface}" stroke="${T.filet}" stroke-width="0.75"></rect>
<path d="M740 56 V30 H754 M740 35 L745 30 M752.5 30 V35" fill="none" stroke="${T.encre}" stroke-width="2"></path><circle cx="752.5" cy="37.6" r="2.4" fill="none" stroke="${T.encre}" stroke-width="1"></circle>
<line x1="0" y1="63.25" x2="${W}" y2="63.25" stroke="${T.filet}" stroke-width="1.5"></line></svg>`;
  const boite = (l, w, inner, lab, tag = 'button') => `<${tag}${tag === 'button' ? ` type="button" aria-label="${lab}"` : ''} style="${abs(l, 10, w, 44, { background: T.surface, border: `1px solid ${T.filetDoux}`, borderRadius: 0, padding: tag === 'button' ? 0 : '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: T.encre, fontFamily: SERIF, fontSize: 15, cursor: tag === 'button' ? 'pointer' : 'default' })}">${inner}</${tag}>`;
  let h = svg;
  h += boite(32, 44, icone('retour', T), 'Retour à l’arcade');
  h += boite(84, 104, `<span style="font-family: ${FELLSC}; font-size: 22px; line-height: 28px;">${esc(heure)}</span>`, '', 'div');
  h += boite(196, 104, `<span style="font-size: 20px; font-weight: 600; letter-spacing: .24em; line-height: 24px;">VRGL</span>`, '', 'div');
  h += `<div style="${abs(308, 10, 300, 44, { background: T.surface, border: `1px solid ${T.filetDoux}` })}"></div>` + minuterie(T, minu, { top: 20, left: 320, w: 928 }).replace(`width: 288px`, `width: 276px`);
  h += boite(W - 32 - 44 - 8 - 44 - 8 - 76, 76, `${icone('carte', T)}<span>Carte</span>`, 'Ma carte — gardez la souris ou Espace pour la voir');
  h += boite(W - 32 - 44 - 8 - 44, 44, icone('menu', T), 'Menu de la table');
  h += boite(W - 32 - 44, 44, icone('cloche', T), 'Son : activé');
  return `<header style="${abs(0, 0, W, 64)}">${h}</header>`;
}

function cercle(joueurs, Dn, moiIndex, opts = {}) {
  const D = DENS[Dn], n = joueurs.length, pos = [];
  const html = joueurs.map((j, i) => {
    const t = (Math.PI / 2) + (i - moiIndex) * 2 * Math.PI / n;
    const x = CX + RX * Math.cos(t), y = CY + RY * Math.sin(t);
    pos.push([x, y]);
    return jeton(j, D, T, Math.round(x - D.W / 2), Math.round(y - D.cy), opts);
  }).join('\n');
  return { html, pos };
}

function cuvette(l, t, w, h, inner, extra = {}) {
  return `<div style="${abs(l, t, w, h, { background: T.fondPlanche, borderRadius: 2, borderStyle: 'solid', borderWidth: '1px 1.5px 1.5px 1px', borderColor: `rgba(23,19,15,.38) ${T.surface} ${T.surface} rgba(23,19,15,.38)`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, ...extra })}"><span aria-hidden="true" style="${abs(2, 2, w - 6.5, h - 6.5, { border: '1px solid rgba(23,19,15,.14)', pointerEvents: 'none' })}"></span>${inner}</div>`;
}

function pupitre(nom, compte) {
  return cuvette(CX - 180, CY - 100, 360, 200, `<p style="margin: 0; font-size: 18px; line-height: 24px;">${esc(PROMPT_JOUR_COURT)}</p>
<div style="${st({ display: 'flex', justifyContent: 'space-between', fontSize: 16, lineHeight: '24px', whiteSpace: 'nowrap', marginTop: 'auto' })}"><span>${voix(T, nom)}</span><span style="font-variant-numeric: tabular-nums;">${compte}</span></div>
<div style="display: flex; gap: 8px;">${bouton(T, 'secondaire', 'S’abstenir', { w: 120 })}${bouton(T, 'primaire', `Voter contre ${nom}`)}</div>`);
}

function message(nom, txt, soi = false) {
  const n = soi ? `<span style="${st({ fontFamily: FELLSC, fontSize: 14, letterSpacing: '.06em', color: T.encre2, marginRight: 6 })}">vous</span>` : `<b style="font-weight: 600; margin-right: 6px;">${esc(nom)}</b>`;
  return `<p style="margin: 0; padding-left: 10px; border-left: 1px solid ${T.encre}; font-size: 16px; line-height: 24px;">${n}${esc(txt)}</p>`;
}
function colonne(resumeHTML, compte, messages, nonLus) {
  const c = cartouche('ecu', 'Le village', T, { h: 44, fs: 15, plein: true, gras: true });
  return `<aside aria-label="Le fil" style="${abs(1068, 80, 340, 788, { background: T.surface, borderTop: `1.5px solid ${T.filet}`, display: 'flex', flexDirection: 'column' })}">
<div style="${st({ height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${T.filetDoux}`, fontSize: 16, whiteSpace: 'nowrap' })}"><span>${resumeHTML}</span><span style="font-variant-numeric: tabular-nums;">${compte}</span></div>
<div role="tablist" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; flex: none;"><button type="button" role="tab" aria-selected="true" style="background: none; border: 0; padding: 0;">${c.svg}</button>${nonLus ? `<span style="font-size: 13px; color: ${T.encre2};">${nonLus}</span>` : ''}</div>
<div role="log" aria-label="Le village" style="flex: 1 1 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; padding: 8px 16px; overflow: hidden;">${messages.map(([n, t, s]) => message(n, t, s)).join('')}</div>
<div style="display: flex; gap: 8px; padding: 12px 16px 16px; flex: none;"><label for="fil-d" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">Parler au village</label><input id="fil-d" type="text" placeholder="Parler au village…" style="${st({ flex: '1 1 0', minWidth: 0, height: 48, boxSizing: 'border-box', background: T.creux, border: 0, borderBottom: `1.5px solid ${T.filet}`, borderRadius: 0, padding: '0 12px', fontFamily: SERIF, fontSize: 16, color: T.encre })}"><button type="button" aria-label="Envoyer" style="${st({ width: 48, height: 48, background: 'transparent', border: `1px solid ${T.filetDoux}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' })}">${icone('plume', T)}</button></div></aside>`;
}

const MSG12 = [['Delphine', 'Bastien a voté bien vite hier, comme s’il savait.'], ['Bastien', 'Parce que Jules mentait, voilà tout.'], ['Hélène', 'Personne n’est mort cette nuit. Quelqu’un a de la chance.'],
  ['Gaspard', 'Et Anna ? Elle n’a rien dit depuis l’aube.'], ['Anna', 'Je dors, comme vous. Je n’ai rien à dire.'], ['', 'Anna défendait Jules hier soir. Je m’en souviens.', true], ['Étienne', 'Ma voix compte double : réfléchissez avant de suivre.']];

function ecran(fichier, titre, { heure = 'Jour II', minu, crieurL, cercleHTML, centre, col }) {
  const corps = friseDesktop(heure, minu) + crieur(T, crieurL, { top: 64, w: 1036, h: 56 }).replace('left: 0px; top: 64px', 'left: 32px; top: 64px').replace('width: 1036px', 'width: 1004px')
    + `<section aria-label="La place" style="${abs(32, 120, 1004, 748)}"></section>` + cercleHTML + centre + col;
  page({ fichier, titre, w: W, h: H, T, corps });
}

/* Cercle de 12 — vous = Tom */
{
  const c = cercle(scene12(), 'C72', 10);
  ecran('Caprices-E2-Jour-Cercle-12.dc.html', 'E2 · Cercle de 12', { minu: { reste: '1:42', pleins: 14 }, crieurL: CRIEUR_J2, cercleHTML: c.html,
    centre: pupitre('Anna', '6 sur 10'), col: colonne(voix(T, 'Anna'), '6 sur 10', MSG12, '') });
}

/* Cercle de 18 — vous = Rose ; marque +2, absente */
{
  const j = table(18, { ...MORTS_J2, Anna: { choisi: true }, Bastien: { marque: true, vote: true }, Delphine: { vote: true }, Étienne: { capitaine: true, vote: true },
    Gaspard: { vote: true }, Léa: { vote: true }, Malo: { vote: true }, Nour: { vote: true }, Paulette: { absent: '23 s' }, Rose: { moi: true, nonChoisissable: true } });
  const c = cercle(j, 'C56', 17);
  ecran('Caprices-E2-Jour-Cercle-18.dc.html', 'E2 · Cercle de 18', { minu: { reste: '1:42', pleins: 14 },
    crieurL: { rub: 'Aube II', txt: 'Le Corbeau a désigné Bastien : au vote du jour, deux voix sont déjà comptées.' }, cercleHTML: c.html,
    centre: pupitre('Anna', '8 sur 16'), col: colonne(voix(T, 'Anna'), '8 sur 16', [['Malo', 'Deux voix contre Bastien avant même d’ouvrir la bouche.'], ['Bastien', 'Le Corbeau se cache et moi je paie.'], ['Nour', 'Paulette ne répond plus depuis tout à l’heure.'], ['Octave', 'Laissons Bastien. Anna a trop peu parlé.'], ['', 'Moi, je dis Anna. Elle se tait trop.', true]], '') });
}

/* Dépouillement desktop — vous = Tom ; les voix partent de chaque votant vers sa cible */
{
  const joueurs = scene12({ Tom: { moi: true, vote: true }, Anna: { vote: true }, Fanny: { vote: true }, Hélène: { vote: true }, Inès: { vote: true } });
  const c = cercle(joueurs, 'C72', 10, { interactif: false });
  const P = (nom) => c.pos[joueurs.findIndex((j) => j.nom === nom)];
  const VOTES = [['Tom', 'Anna'], ['Delphine', 'Anna'], ['Étienne', 'Anna', true], ['Gaspard', 'Anna'], ['Léa', 'Anna'], ['Anna', 'Bastien'], ['Fanny', 'Bastien'], ['Hélène', 'Bastien'], ['Bastien', 'Gaspard']];
  let traits = '';
  for (const [de, a, dbl] of VOTES) {
    const [x1, y1] = P(de), [x2, y2] = P(a), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const sx = x1 + ux * 40, sy = y1 + uy * 40, ex = x2 - ux * 44, ey = y2 - uy * 44;
    const mx = (sx + ex) / 2 + (CX - (sx + ex) / 2) * 0.35, my = (sy + ey) / 2 + (CY - (sy + ey) / 2) * 0.35;
    const path = (o) => `<path d="M${(sx - uy * o).toFixed(1)} ${(sy + ux * o).toFixed(1)} Q${(mx - uy * o).toFixed(1)} ${(my + ux * o).toFixed(1)} ${(ex - uy * o).toFixed(1)} ${(ey + ux * o).toFixed(1)}" fill="none" stroke="${T.encre}" stroke-width="1.2" stroke-linecap="round"></path>`;
    traits += dbl ? path(-1.6) + path(1.6) : path(0);
    // le bâton gravé, au bout du trait
    traits += `<path d="M${(ex - ux * 4 - uy * 6).toFixed(1)} ${(ey - uy * 4 + ux * 6).toFixed(1)} L${(ex - ux * 4 + uy * 6).toFixed(1)} ${(ey - uy * 4 - ux * 6).toFixed(1)}" stroke="${T.encre}" stroke-width="2.2" stroke-linecap="round"></path>`;
  }
  const lignesVoix = `<svg width="1004" height="748" viewBox="32 120 1004 748" aria-hidden="true" style="${abs(32, 120, 1004, 748)}">${traits}</svg>`;
  const row = (nom, n, v, qui) => `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 32px; row-gap: 2px; align-items: center;"><span style="font-size: 16px; line-height: 20px; font-weight: 600;">${esc(nom)}</span><span style="text-align: right; font-size: 16px; font-variant-numeric: tabular-nums;">${n}</span><span style="grid-column: 1 / 3;">${v ? batons(T, v) : ''}</span><span style="grid-column: 1 / 3; font-size: 13px; line-height: 16px; color: ${T.encre2};">${esc(qui)}</span></div>`;
  const fourche = `<svg width="48" height="48" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(8 16 16)" fill="none" stroke="${T.encre}" stroke-width="2" stroke-linecap="round"><path d="M16 30 V12 M10 12 H22 M10 12 V5 M16 12 V3.5 M22 12 V5"></path></g></svg>`;
  const carte = `<div role="img" aria-label="La carte d’Anna se retourne : Villageois·e" style="${st({ width: 96, height: 134, flex: 'none', position: 'relative', background: T.surface })}"><div style="${abs(6, 6, 84, 122, { borderRadius: 2, borderStyle: 'solid', borderWidth: '1px 1.5px 1.5px 1px', borderColor: `rgba(23,19,15,.38) ${T.surface} ${T.surface} rgba(23,19,15,.38)`, background: T.fondPlanche, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 4 })}">${fourche}<span style="font-family: ${FELL}; font-size: 16px; line-height: 20px;">Villageois·e</span>${cartouche('ecu', 'Village', T, { h: 20 }).svg}</div></div>`;
  const centre = cuvette(CX - 270, CY - 165, 540, 330, `<h2 style="margin: 0; font-family: ${FELL}; font-weight: 400; font-size: 36px; line-height: 40px; text-align: center;">Les voix sont comptées</h2>
<div style="display: flex; gap: 24px; flex: 1 1 0;"><div style="flex: 1 1 0; display: flex; flex-direction: column; gap: 8px;">
${row('Anna', 6, [{}, {}, { double: true }, {}, {}], 'Tom, Delphine, Étienne ×2, Gaspard, Léa')}${row('Bastien', 3, [{}, {}, {}], 'Anna, Fanny, Hélène')}${row('Gaspard', 1, [{}], 'Bastien')}${row('Abstention', 1, null, 'Inès')}</div>
<div style="width: 200px; display: flex; flex-direction: column; align-items: center; gap: 8px;">${carte}${ligneCrieur(T, 'Les voix sont comptées : la potence est pour Anna.', null)}</div></div>
${legende(T, 'Les voix sont comptées ; les raisons, jamais.', 20)}`, { padding: '16px 24px', gap: 10 });
  ecran('Caprices-E2-Depouillement-Desktop.dc.html', 'E2 · Dépouillement desktop', { minu: { etat: 'absente' }, crieurL: { rub: 'Jour II', txt: 'Les voix sont comptées : la potence est pour Anna.' },
    cercleHTML: lignesVoix + c.html, centre, col: colonne(voix(T, 'Anna', ''), '10 sur 10', MSG12, '') });
}
