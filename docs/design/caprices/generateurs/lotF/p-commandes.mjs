// Planche F-V — Les commandes (SPEC § 5.4-5.6, § 5.3, § 5.17)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, LF_DEFS, NOTE, NOTE_ENCRE, cuivreRect } from './lib.mjs';
import { bouton, barrePouce, resume, pli, minuterie, MINUTERIE_L, cartouche, iconeHtml } from './comp.mjs';

const grainHtml = (w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position: absolute; left: 0; top: 0;" aria-hidden="true">${cuivreRect(0, 0, w, h)}</svg>`;

/* ---- A. Boutons : variantes × états × tirages ---- */
function boutons() {
  const CW = 168, LW = 128, BW = 156;
  const etats = ['repos', 'appuyé · 80 ms', 'survol (desktop)', 'éteint'];
  const cle = ['repos', 'appuye', 'survol', 'eteint'];
  const vide = (t, txt) => `<span style="${ts({ s: 12, lh: 16, c: t.encre2 })}">${txt}</span>`;
  const rows = [
    ['primaire', 'Voter contre Anna', (t, e) => bouton({ v: 'primaire', etat: e, t, label: 'Voter contre Anna', w: BW, raison: 'Il manque 2 joueurs' })],
    ['secondaire', 'S’abstenir', (t, e) => bouton({ v: 'secondaire', etat: e, t, label: 'S’abstenir', w: BW, raison: 'La phase est close' })],
    ['discret', 'Refermer', (t, e) => bouton({ v: 'discret', etat: e, t, label: 'Refermer', w: BW })],
    ['outil', '44 × 44, icône 24', (t, e) => e === 'eteint' ? vide(t, '— (un outil n’est jamais éteint)') : `<div style="display: flex; gap: 8px;">${bouton({ v: 'outil', etat: e, t, ic: 'menu', w: 44, raison: 'Menu' })}${bouton({ v: 'outil', etat: e, t, ic: 'carte', label: 'Carte', w: 76 })}</div>`],
    ['armé (danger)', '1er toucher sur l’irréversible', (t, e) => e === 'repos' ? bouton({ v: 'arme', t, label: 'Confirmer : lier', w: BW }) + `<div style="width: 100px; height: 1px; background: ${t.encre}; margin-top: 4px;"></div>` : e === 'eteint' ? vide(t, 'au bout de 4 s sans second toucher : retour au repos') : vide(t, '—')],
    ['appui long', 'Gardez le pouce : …', (t, e) => e === 'repos' ? bouton({ v: 'appui', t, label: 'Ma carte', w: BW }) : e === 'appuye' ? bouton({ v: 'appui', t, label: 'Ma carte', w: BW, progres: 7 / 12 }) : vide(t, '—')],
    ['en cours (envoi)', 'trois crans en boucle', (t, e) => e === 'repos' ? bouton({ v: 'encours', t, w: BW }) : vide(t, '—')],
  ];
  const tableau = (t, nuit) => {
    let h = `<div style="display: grid; grid-template-columns: repeat(4, ${CW}px); row-gap: 0; position: relative; padding: 8px 8px 0;">`;
    h += etats.map((e) => `<div style="${ts({ s: 12, lh: 16, c: t.encre2 })} height: 22px;">${e}</div>`).join('');
    for (const [, , f] of rows) h += cle.map((e) => `<div style="height: 76px; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 8px; box-sizing: border-box;">${f(t, e)}</div>`).join('');
    h += '</div>';
    return `<div style="position: relative; width: ${4 * CW + 16}px; ${nuit ? '' : `background: ${C.ver};`}">${nuit ? grainHtml(4 * CW + 16, 22 + 7 * 76 + 8) : ''}${h}</div>`;
  };
  const libelles = `<div style="width: ${LW}px; padding-top: 30px;">${rows.map(([v, sous]) => `<div style="height: 76px; box-sizing: border-box; padding-top: 10px;"><div style="${ts({ s: 14, lh: 18, w: 600 })}">${v}</div><div style="${ts({ s: 12, lh: 16, c: C.del })}">${sous}</div></div>`).join('')}</div>`;
  return `<div style="display: flex; gap: 0;">${libelles}<div style="display: flex; flex-direction: column;"><span style="${ts({ f: 'sc', s: 14, lh: 18, ls: '.06em' })}">Papier</span>${tableau(PAPIER, false)}</div><div style="width: 12px;"></div><div style="display: flex; flex-direction: column;"><span style="${ts({ f: 'sc', s: 14, lh: 18, ls: '.06em' })}">Cuivre</span>${tableau(CUIVRE, true)}</div></div>`;
}

/* ---- B. Barres au pouce ---- */
function ecranBas({ t, titre, res, pliO, barre }) {
  const nuit = t === CUIVRE;
  return `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="${ts({ s: 13, lh: 16, w: 600 })}">${titre}</span>
    <div style="position: relative; width: 390px; height: 140px; background: ${t.fond};">${nuit ? grainHtml(390, 68) : ''}<div style="position: relative;">${resume({ t, ...res })}${pli({ t, ...pliO })}${barrePouce({ t, contenu: barre })}</div></div></div>`;
}
function barres() {
  const vote = ecranBas({ t: PAPIER, titre: 'Vote du jour · vous = Tom', res: { gauche: '<b style="font-weight: 600;">Votre voix : Anna</b>', droite: '6 sur 10' }, pliO: { libelle: 'Le village', compte: 3 },
    barre: bouton({ v: 'secondaire', label: 'S’abstenir', w: 120 }) + bouton({ v: 'primaire', label: 'Voter contre Anna', w: 230 }) });
  const arme = ecranBas({ t: PAPIER, titre: 'Armé · second toucher dans les 4 s', res: { gauche: '<b style="font-weight: 600;">Votre voix : Anna</b>', droite: '6 sur 10' }, pliO: { libelle: 'Le village', compte: 3 },
    barre: `<div style="display: flex; flex-direction: column; gap: 3px;">${bouton({ v: 'arme', label: 'Confirmer : Anna à la potence', w: 358 })}<div style="width: 214px; height: 1px; background: ${C.b900}; margin-left: 72px;"></div></div>` });
  const dort = ecranBas({ t: CUIVRE, titre: 'Nuit · le dormeur · vous = Anna', res: {}, pliO: { libelle: 'Le registre' },
    barre: bouton({ v: 'appui', t: CUIVRE, label: 'Gardez le pouce : ma carte', w: 358, nuitBarre: true }) });
  const acteur = ecranBas({ t: CUIVRE, titre: 'Nuit · un acteur · vous = Bastien', res: { gauche: 'Votre choix : Fanny · la meute : Fanny (2)' }, pliO: { camp: 'meute', libelle: 'La meute', compte: 1, trait: C.p2 },
    barre: bouton({ v: 'secondaire', t: CUIVRE, label: 'Ne viser personne', w: 175, nuitBarre: true }) + bouton({ v: 'primaire', t: CUIVRE, label: 'Dévorer Fanny', w: 175 }) });
  return `<div style="display: grid; grid-template-columns: 390px 390px; column-gap: 16px; row-gap: 14px;">${vote}${arme}${dort}${acteur}</div>`;
}

/* ---- C. Minuteries ---- */
function minuteries() {
  const V = [['barre', 'barre (défaut) · 14 crans sur 24', 14, '0:41'], ['discrete', 'discrète (réglage)', 14, '0:41'], ['urgence', 'urgence < 10 s : hach-x, sablier retourné, 600', 3, '0:07'], ['absente', 'absente : même cadre, aucun chiffre', 0, '']];
  const panneau = (t, nuit) => {
    let s = nuit ? cuivreRect(0, 0, 330, 208) : `<rect width="330" height="208" fill="${C.ver}"/>`;
    V.forEach(([v, lab, r, ch], i) => {
      const y = 10 + i * 50;
      s += `<text x="12" y="${y + 12}" ${st({ s: 12, c: t.encre2 })}>${esc(lab)}</text>`;
      s += `<rect x="12" y="${y + 18}" width="${MINUTERIE_L}" height="24" fill="${t.fond === C.ver ? C.ver : C.b900}" stroke="${t.filetDoux}" stroke-width=".5" stroke-dasharray="2 3"/>`;
      s += minuterie(12, y + 18, v, t, r, ch);
    });
    return `<svg width="330" height="208" viewBox="0 0 330 208" role="img" aria-label="Minuterie, tirage ${t.nom}">${s}</svg>`;
  };
  return `<div style="display: flex; gap: 12px;">${panneau(PAPIER, false)}${panneau(CUIVRE, true)}</div>
  <p style="margin: 6px 0 0; ${NOTE}">Ligne fixe de 24 px chez tous les sièges : 24 crans de 5 × 10 au pas de 8. Un cran tombe à la fois. Ni sanguine, ni clignotement, ni tic-tac. La nuit, une minuterie qui court et une absente sont la même ligne grise.</p>`;
}

/* ---- D. Cartouches ---- */
function cartouches() {
  const L = [['village', 'Villageois·e', 'écu'], ['meute', 'Loup-garou', 'mordu'], ['seul', 'Seul', 'mordu double'], ['serment', 'Le serment', 'lacs'], ['audela', 'L’au-delà', 'au-delà'], ['cache', 'Carte cachée', 'ovale vide']];
  const CW = 104;
  let s = `<rect x="0" y="20" width="${6 * CW + 70}" height="92" fill="${C.ver}"/>` + cuivreRect(0, 112, 6 * CW + 70, 92);
  L.forEach(([camp, mot, forme], i) => {
    const x = 70 + i * CW;
    s += `<text x="${x}" y="13" ${st({ s: 12, c: C.del })}>${esc(forme)}</text>`;
    s += cartouche(x, 30, camp, mot, PAPIER, 30, 98).svg;
    s += cartouche(x, 76, camp, mot, PAPIER, 20, 92).svg;
    s += cartouche(x, 122, camp, mot, CUIVRE, 30, 98).svg;
    s += cartouche(x, 168, camp, mot, CUIVRE, 20, 92).svg;
  });
  s += `<text x="6" y="50" ${st({ s: 12, c: C.del })}>papier 30</text><text x="6" y="90" ${st({ s: 12, c: C.del })}>papier 20</text><text x="6" y="142" ${st({ s: 12, c: C.p1 })}>cuivre 30</text><text x="6" y="182" ${st({ s: 12, c: C.p1 })}>cuivre 20</text>`;
  return `<svg width="${6 * CW + 70}" height="206" viewBox="0 0 ${6 * CW + 70} 206" role="img" aria-label="Les six cartouches de camp, deux tirages, deux hauteurs">${s}</svg>
  <p style="margin: 4px 0 0; ${NOTE}">La forme dit le camp, le mot le confirme : un cartouche sans mot est interdit. Fond toujours --surface, jamais transparent sur une trame. « Seul » est plein de sanguine le jour (5,75:1), au filet de craie la nuit.</p>`;
}

/* ---- E. Champ, code, case gravée ---- */
function champs() {
  const champ = (t, focus, nuit) => `<div style="position: relative; width: 260px; padding: 10px 12px; box-sizing: border-box; ${nuit ? '' : `background: ${C.ver};`}">${nuit ? grainHtml(260, 96) : ''}<div style="position: relative; display: flex; flex-direction: column; gap: 6px;">
      <label style="${ts({ f: 'sc', s: 13, lh: 16, c: t.encre2, ls: '.06em' })}">Votre nom à la table</label>
      <input type="text" value="${focus ? 'To' : 'Tom'}" style="box-sizing: border-box; width: 236px; height: 48px; border: none; border-radius: 0; border-bottom: ${focus ? 3 : 1.5}px solid ${t.filet}; background: ${t.creux}; padding: 0 12px; ${ts({ s: 16, lh: 24, c: t.encre })} outline: none;">
      <span style="${ts({ s: 12, lh: 16, c: t.encre2 })}">${focus ? 'focus : filet de 3 px · jamais d’autofocus à l’accueil' : 'repos : filet de 1,5 px, aucun cadre'}</span></div></div>`;
  const caseG = (t, coche, lib, nuit) => `<div style="position: relative; width: 250px; box-sizing: border-box; ${nuit ? '' : `background: ${C.ver};`}">${nuit ? grainHtml(250, 52) : ''}<label style="position: relative; display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 0 12px; cursor: pointer;">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style="flex: none;"><rect x=".75" y=".75" width="22.5" height="22.5" fill="${t.surface}" stroke="${t.filet}" stroke-width="1.5"/>${coche ? `<path d="M6 6.4 L18 17.8 M17.6 6 L6.2 18" stroke="${t.encre}" stroke-width="2" stroke-linecap="round"/>` : ''}</svg>
      <span style="flex: 1; ${ts({ s: 16, lh: 20, c: t.encre })}">${lib}</span><span style="${ts({ s: 12, lh: 16, c: t.encre2 })}">${coche ? 'oui' : 'non'}</span></label></div>`;
  const code = `<div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: ${C.ver};"><label style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })}">Code de la table</label><div style="display: flex; gap: 8px;">${['V', 'R', 'G', 'L'].map((l) => `<div style="box-sizing: border-box; width: 56px; height: 64px; background: ${C.tei}; border-bottom: 1.5px solid ${C.b900}; display: flex; align-items: center; justify-content: center; ${ts({ s: 32, lh: 40, w: 600 })}">${l}</div>`).join('')}</div></div>`;
  return `<div style="display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; gap: 16px; align-items: flex-start;">${champ(PAPIER, false)}${champ(CUIVRE, true, true)}${code}</div>
    <div style="display: flex; gap: 16px; align-items: center;">${caseG(PAPIER, true, 'Fil ouvert par défaut')}${caseG(CUIVRE, true, 'Mouvement réduit', true)}${caseG(PAPIER, false, 'Vibrations')}</div></div>`;
}

export function build() {
  const body = [
    entete({ num: 'F·V', titre: 'Les commandes', legende: 'Rien ne glisse, rien ne rebondit : tout s’imprime.', refs: 'SPEC § 5.3-5.6 · § 5.17' }),
    section({ x: 40, y: 140, w: 1520, h: 620, lettre: 'A', titre: 'Les boutons : variantes, états, deux tirages', note: 'angle vif · 48 (jeu) ou 44 (outil) · aucun bouton n’est rouge · éteint = pointillé et une raison, jamais d’opacité', contenu: boutons() }),
    section({ x: 40, y: 776, w: 800, h: 360, lettre: 'B', titre: 'La barre au pouce', note: '72 = 12 + 48 + 12 · résumé 24 et pli 44 au-dessus', contenu: barres() }),
    section({ x: 870, y: 776, w: 690, h: 290, lettre: 'C', titre: 'La minuterie', note: '4 variantes × 2 tirages', contenu: minuteries() }),
    section({ x: 870, y: 1074, w: 690, h: 300, lettre: 'D', titre: 'Les cartouches de camp', note: '6 formes × 2 tirages × 30 / 20', contenu: cartouches() }),
    section({ x: 40, y: 1150, w: 800, h: 200, lettre: 'E', titre: 'Champ, code, case gravée', note: 'la case gravée remplace l’interrupteur à glissière', contenu: champs() }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les commandes', defs: LF_DEFS, body, seed: 53 });
}
