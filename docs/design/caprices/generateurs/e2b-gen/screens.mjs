import {
  INK, DEL, P2, P1, P3, VER, BRU, TEI, SAN, FELL, FELLSC, SERIF,
  page, write, resetUid, cartouche, jeton, DENS, icon, frise, minuterie, crieur, consigne, resume, pli,
  btnPrim, btnSec, btnAppuiLong, btnArme, barre, barreSysteme, accueil, place, rub, outil, btnCarte,
  heureCart, toits, crans, carteMini, cuvetteStyle, cuvetteInner,
} from './lib.mjs';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const B = (t) => `<b style="font-weight: 600;">${t}</b>`;

// Cartouches des morts (rôles publics)
const mV = { kind: 'ecu', text: 'Villageois·e' };
const mL = { kind: 'mordu', text: 'Loup-garou' };
const mCh = { kind: 'ecu', text: 'le Chasseur' };
// Densités D3/D4 : la cellule est trop étroite pour le nom du rôle — le cartouche dit le camp (§ 5.1.4 n° 14)
const mV3 = { kind: 'ecu', text: 'Village', w: 60, full: 'Villageois·e' };
const mL3 = { kind: 'mordu', text: 'Meute', w: 60, full: 'Loup-garou' };
const mV4 = { kind: 'ecu', text: 'Village', w: 56, full: 'Villageois·e' };
const mL4 = { kind: 'mordu', text: 'Meute', w: 56, full: 'Loup-garou' };

const CONSIGNE_JOUR = 'Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.';
const CRIEUR_JOUR = 'Le jour se lève sur Thiercelieux. Le village délibère.';
const CRIEUR_CHASSEUR = 'Le Chasseur rend l’âme, la main sur la gâchette. La partie attend son dernier geste.';

/** États du Jour II, table de 12 (écran de référence Jour-12, § 7.8). */
function etatsJour12({ recon = false, d4 = false } = {}) {
  const v = d4 ? mV4 : mV, l = d4 ? mL4 : mL;
  return {
    1: { choisi: true, interactive: true, statut: 'votre choix' },
    2: { vote: true, interactive: true, statut: 'a voté' },
    3: { mort: v },
    4: { vote: true, interactive: true, statut: 'a voté' },
    5: { cap: true, vote: true, interactive: true, statut: 'a voté' },
    6: { interactive: true, statut: 'délibère' },
    7: { vote: true, interactive: true, statut: 'a voté' },
    8: { interactive: true, statut: 'délibère' },
    9: { interactive: true, statut: 'délibère' },
    10: { mort: l },
    11: recon ? { moi: true, recon: true, statut: 'reconnexion…' } : { moi: true, statut: 'vous' },
    12: { vote: true, interactive: true, statut: 'a voté' },
  };
}

const placeD2 = (etats, h = 415, label = 'La place, douze joueurs') =>
  place({ cells: range(1, 12).map((s) => jeton(s, DENS.D2, etats[s] || {})), cols: 4, colW: 85, colGap: 6, rowGap: 8, h, label });

/** Le gabarit unique mobile 390 × 844 (§ 7.1). */
function ecran({ heure, clocherX = 170, potenceX = 181, minut, crieurO, consigneO, placeHtml, resumeO, pliO, barreHtml, bandeau = '' }) {
  return `<div style="position: relative; width: 390px; height: 844px; display: flex; flex-direction: column;">
${barreSysteme()}
${bandeau}
${frise({ W: 390, heure, clocherX, potenceX })}
${minuterie(minut)}
${crieur(crieurO)}
${consigne(consigneO)}
${placeHtml}
${resume(resumeO)}
${pli(pliO)}
${barre(barreHtml)}
${accueil()}
</div>`;
}

const jour12 = (opts = {}) => ecran({
  heure: 'Jour II',
  minut: { n: 17, txt: '1:42' },
  crieurO: { rubrique: 'Jour II', texte: CRIEUR_JOUR },
  consigneO: { texte: CONSIGNE_JOUR },
  placeHtml: placeD2(etatsJour12(opts), opts.placeH || 415),
  resumeO: { gauche: B('Votre voix : Anna'), droite: '6 sur 10' },
  pliO: { kind: 'ecu', label: 'Le village', w: 96, count: 3 },
  barreHtml: btnSec('S’abstenir') + btnPrim('Voter contre Anna'),
  bandeau: opts.bandeau || '',
});

/* ================================================================== */
/* 1. Chasseur — le tireur (vous = Gaspard)                            */
/* ================================================================== */
function etatsChasseur(vous) {
  const e = {};
  for (const s of [1, 2, 4, 5, 6, 8, 9, 11, 12]) e[s] = { interactive: vous === 7 };
  e[3] = { mort: mV }; e[10] = { mort: mL }; e[7] = { mort: mCh };
  e[5] = { ...e[5], cap: true, statut: 'capitaine' };
  if (vous === 7) { e[7].moi = true; e[2] = { interactive: true, choisi: true, statut: 'votre choix' }; }
  if (vous === 1) { e[1] = { moi: true, statut: 'vous' }; }
  return e;
}

resetUid();
write('Caprices-E2-Chasseur-Tireur.dc.html', page({
  title: 'Chasseur — le tireur', w: 390, h: 844,
  body: `<!-- vous = Gaspard (siège 7, le Chasseur), exécuté au vote du Jour II. Papier. -->
` + ecran({
    heure: 'Jour II',
    minut: { n: 14, txt: '0:23', label: 'Il vous reste 0:23 pour tirer' },
    crieurO: { rubrique: 'Jour II', texte: CRIEUR_CHASSEUR, carte: true },
    consigneO: { texte: 'Votre dernière balle : abattez un vivant — ou tirez en l’air.' },
    placeHtml: placeD2(etatsChasseur(7)),
    resumeO: { gauche: B('Votre balle : Bastien') },
    pliO: { kind: 'audela', label: 'L’au-delà', w: 92, count: 2 },
    barreHtml: btnSec('Tirer en l’air', ' padding: 0 12px;') + btnArme({ l1: 'Confirmer — sans retour', l2: 'tirer sur Bastien', aria: 'Confirmer — sans retour : tirer sur Bastien' }),
  }),
}));

/* ================================================================== */
/* 2. Chasseur — l'attente (vous = Anna)                               */
/* ================================================================== */
resetUid();
write('Caprices-E2-Chasseur-Attente.dc.html', page({
  title: 'Chasseur — l’attente', w: 390, h: 844,
  body: `<!-- vous = Anna (siège 1). Même instant que Chasseur-Tireur ; minuterie absente (cadre vide, même taille) ; place non interactive. -->
` + ecran({
    heure: 'Jour II',
    minut: { txt: null },
    crieurO: { rubrique: 'Jour II', texte: CRIEUR_CHASSEUR, carte: true },
    consigneO: { legende: 'Il tire mieux mort que vivant.' },
    placeHtml: placeD2(etatsChasseur(1)),
    resumeO: {},
    pliO: { kind: 'ecu', label: 'Le village', w: 96, count: 3 },
    barreHtml: btnAppuiLong('Gardez le pouce : ma carte'),
  }),
}));

/* ================================================================== */
/* 3. Succession (vous = Étienne)                                      */
/* ================================================================== */
resetUid();
{
  const e = {};
  for (const s of [2, 4, 6, 7, 8, 9, 11, 12]) e[s] = { interactive: true };
  e[1] = { mort: mV, };            // le chagrin a suivi Étienne
  e[3] = { mort: mV }; e[10] = { mort: mL };
  e[5] = { moi: true, mort: mV, cap: true };
  e[12] = { interactive: true, choisi: true, statut: 'votre choix' };
  write('Caprices-E2-Succession.dc.html', page({
    title: 'Succession', w: 390, h: 844,
    body: `<!-- vous = Étienne (siège 5), capitaine dévoré la Nuit III ; Anna l’a suivi (chagrin). Papier. -->
` + ecran({
      heure: 'Jour III', clocherX: 176, potenceX: 186,
      minut: { n: 16, txt: '0:26', label: 'Il vous reste 0:26 pour transmettre le brassard' },
      crieurO: { rubrique: 'Jour III', texte: 'Le capitaine est tombé : le brassard attend une main.' },
      consigneO: { texte: 'Dernier ordre : désignez qui portera le brassard.' },
      placeHtml: placeD2(e),
      resumeO: { gauche: B('Votre choix : Léa'), droite: '' },
      pliO: { kind: 'audela', label: 'L’au-delà', w: 92, count: 1 },
      barreHtml: btnArme({ l1: 'Confirmer — sans retour', l2: 'transmettre le brassard à Léa', aria: 'Confirmer — sans retour : transmettre le brassard à Léa' }),
    }),
  }));
}

/* ================================================================== */
/* 4. Bouc émissaire — le dernier mot (vous = Quentin), table de 18    */
/* ================================================================== */
resetUid();
{
  const e = {};
  for (const s of range(1, 18)) e[s] = { interactive: true };
  e[3] = { mort: mV3 }; e[10] = { mort: mL3 };
  e[17] = { moi: true, mort: { kind: 'ecu', text: 'Village', w: 60, full: 'le Bouc émissaire' } };
  e[5] = { interactive: true, cap: true, statut: 'capitaine' };
  for (const s of [1, 12, 18]) e[s] = { interactive: true, choisi: true, statut: 'votre choix' };
  const cells = range(1, 18).map((s) => jeton(s, DENS.D3, e[s]));
  write('Caprices-E2-Bouc-DernierMot.dc.html', page({
    title: 'Bouc — le dernier mot', w: 390, h: 844,
    body: `<!-- vous = Quentin (siège 17, le Bouc émissaire), mort sur l’égalité du Jour II. Table de 18, D3, sélection multiple. -->
` + ecran({
      heure: 'Jour II',
      minut: { n: 18, txt: '0:41', label: 'Il vous reste 0:41 pour votre dernier mot' },
      crieurO: { rubrique: 'Jour II', texte: 'Le Bouc émissaire rend l’âme. Son dernier mot peut désigner qui votera demain.' },
      consigneO: { texte: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont au vote.' },
      placeHtml: place({ cells, cols: 5, colW: 68, colGap: 4, rowGap: 4, label: 'La place, dix-huit joueurs — plusieurs choix possibles' }),
      resumeO: { gauche: B('3 votants : Anna, Léa, Rose') },
      pliO: { kind: 'audela', label: 'L’au-delà', w: 92, count: 2 },
      barreHtml: btnSec('Se taire') + btnPrim('Désigner ces 3 votants'),
    }),
  }));
}

/* ================================================================== */
/* Feuille basse (§ 5.12) et voile                                     */
/* ================================================================== */
const voile = (W = 390, H = 844) => `<div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px;"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display: block;"><rect x="0" y="0" width="${W}" height="${H}" fill="${P2}" opacity="0.6"></rect><rect x="0" y="0" width="${W}" height="${H}" fill="#000" filter="url(#aqua-II)" opacity="0.14"></rect></svg></div>`;

const refermer = `<button type="button" style="height: 44px; flex: none; margin: 0; padding: 0 4px; background: none; border: 0; font-family: ${SERIF}; font-size: 16px; line-height: 20px; color: ${INK}; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; cursor: pointer;">Refermer</button>`;

function feuille({ h, titreHtml, aria, corps }) {
  return `${voile()}
<section role="dialog" aria-modal="true" aria-label="${aria}" style="position: absolute; left: 0; bottom: 0; width: 390px; height: ${h}px; box-sizing: border-box; background: ${BRU}; border-top: 1.5px solid ${INK}; display: flex; flex-direction: column;">
<div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 3px; border-top: 0.75px solid ${INK};"></div>
<div aria-hidden="true" style="width: 40px; height: 4px; flex: none; margin: 12px auto 0; background: ${P2};"></div>
<div style="height: 56px; flex: none; box-sizing: border-box; padding: 0 12px 0 16px; display: flex; align-items: center; justify-content: space-between;">${titreHtml}${refermer}</div>
<div style="flex: 1; min-height: 0; box-sizing: border-box; padding: 0 16px; display: flex; flex-direction: column;">${corps}</div>
${accueil()}
</section>`;
}

/* ================================================================== */
/* 5. Menu de table (vous = Tom)                                       */
/* ================================================================== */
resetUid();
{
  const ligne = (ic, label) => `<button type="button" style="width: 100%; height: 56px; flex: none; box-sizing: border-box; margin: 0; padding: 0; display: flex; align-items: center; gap: 14px; background: transparent; border: 0; border-bottom: 0.75px solid ${P2}; font-family: ${SERIF}; font-size: 17px; line-height: 24px; color: ${INK}; text-align: left; cursor: pointer;">${icon(ic)}<span style="flex: 1;">${label}</span>${icon('i-suite')}</button>`;
  const titre = `<h2 style="margin: 0; display: flex; align-items: baseline; gap: 12px; font-family: ${FELL}; font-weight: 400; font-size: 28px; line-height: 32px;">Table <span style="font-family: ${SERIF}; font-weight: 600; font-size: 26px; line-height: 32px; letter-spacing: .24em;">VRGL</span></h2>`;
  const corps = `<p style="margin: 0 0 8px; font-size: 12px; line-height: 16px; color: ${DEL}; font-variation-settings: 'opsz' 12;">12 sièges · Jour II</p>
<div style="border-top: 0.75px solid ${P2};"></div>
${ligne('i-regles', 'Règles')}
${ligne('i-reglages', 'Réglages')}
${ligne('i-aide', 'Aide')}
<div role="group" aria-labelledby="q-titre" style="padding-top: 8px;">
<div id="q-titre" style="height: 44px; display: flex; align-items: center; gap: 14px; font-size: 17px; line-height: 24px; font-weight: 600;">${icon('i-quitter')}<span>Quitter la table ?</span></div>
<div style="display: flex; gap: 8px; margin-top: 8px;">${btnSec('Rester', ' flex: 1;')}${btnArme({ l1: 'Oui, quitter', aria: 'Oui, quitter — touchez encore pour confirmer' })}</div>
</div>`;
  write('Caprices-E2-Menu-Table.dc.html', page({
    title: 'Menu de table', w: 390, h: 844,
    body: `<!-- vous = Tom. Feuille basse « Table VRGL » posée sur Jour-12 ; « Quitter » a été touché une fois : « Oui, quitter » est armé (4 s). -->
` + jour12() + feuille({ h: 452, titreHtml: titre, aria: 'Menu de la table VRGL', corps }),
  }));
}

/* ================================================================== */
/* 6. Le registre (vous = Tom)                                         */
/* ================================================================== */
resetUid();
{
  const chand = `<svg width="16" height="16" aria-hidden="true" style="flex: none; margin-top: 4px;"><use href="#g-chandelle" width="16" height="16"></use></svg>`;
  const vide = `<span aria-hidden="true" style="width: 16px; flex: none;"></span>`;
  const l = (txt, { mort = false, cart = '' } = {}) => `<li style="display: flex; align-items: flex-start; gap: 8px; font-size: 16px; line-height: 24px;">${mort ? chand : vide}<span style="flex: 1; min-width: 0;">${txt}${cart ? `&#8194;<span style="display: inline-flex; vertical-align: -5px;">${cart}</span>` : ''}</span></li>`;
  const tete = (heure, ouvert, nb = '') => `<button type="button" aria-expanded="${ouvert}" style="width: 100%; height: 44px; flex: none; box-sizing: border-box; margin: 0; padding: 0; display: flex; align-items: center; gap: 10px; background: transparent; border: 0; border-bottom: 0.75px solid ${INK}; font: inherit; color: ${INK}; cursor: pointer;">${rub(heure)}<span style="flex: 1;"></span>${nb ? `<span style="font-size: 12px; line-height: 16px; color: ${DEL};">${nb}</span>` : ''}${icon(ouvert ? 'i-haut' : 'i-bas')}</button>`;
  const bloc = (heure, lignes) => `<section>${tete(heure, true)}<ol style="list-style: none; margin: 0; padding: 10px 0 14px; display: flex; flex-direction: column; gap: 8px;">${lignes.join('')}</ol></section>`;
  const corps = `<div style="flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;">
${bloc('Jour II', [
    l('Personne n’est mort cette nuit. Le village se réveille entier.'),
    l(CRIEUR_JOUR),
  ])}
<section>${tete('Nuit II', false, '2 annonces')}</section>
${bloc('Jour I', [
    l('La meute a dévoré Clément.', { mort: true, cart: cartouche('ecu', 80, 20, 'Villageois·e') }),
    l('Le village se choisit un capitaine.'),
    l('Étienne prend le brassard : sa voix comptera double.'),
    l(CRIEUR_JOUR),
    l('Les voix sont comptées : la potence est pour Jules.'),
    l('Le village a exécuté Jules.', { mort: true, cart: cartouche('mordu', 80, 20, 'Loup-garou') }),
  ])}
<section>${tete('Nuit I', false, '3 annonces')}</section>
</div>`;
  const titre = `<h2 style="margin: 0; display: flex; align-items: center; gap: 10px; font-family: ${FELL}; font-weight: 400; font-size: 28px; line-height: 32px;">${icon('i-registre')}Le registre</h2>`;
  write('Caprices-E2-Journal.dc.html', page({
    title: 'Le registre', w: 390, h: 844,
    body: `<!-- vous = Tom. Feuille « Le registre » sur Jour-12 : le bloc le plus récent en haut, ouvert ; Jour I rouvert à la main. Aucune couleur hors cartouche. -->
` + jour12() + feuille({ h: 740, titreHtml: titre, aria: 'Le registre', corps }),
  }));
}

/* ================================================================== */
/* 7. Réseau — reconnexion (vous = Tom)                                */
/* ================================================================== */
resetUid();
{
  const bandeau = `<div role="status" style="position: relative; height: 32px; flex: none; box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; background: ${P3};">
<svg width="390" height="32" viewBox="0 0 390 32" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><rect x="0" y="0" width="390" height="32" fill="url(#hach-1-v)" opacity="0.5"></rect></svg>
<span style="position: relative; height: 24px; box-sizing: border-box; padding: 0 8px 0 6px; display: inline-flex; align-items: center; gap: 6px; background: ${P3}; color: ${VER}; font-size: 14px; line-height: 20px;">${icon('i-renoue', 20, VER)}Reconnexion… la table vous garde votre place.</span>
</div>`;
  write('Caprices-E2-Reseau-Reconnexion.dc.html', page({
    title: 'Réseau — reconnexion', w: 390, h: 844,
    body: `<!-- vous = Tom. Jour-12 décalé de 32 px par le bandeau réseau (pour soi seulement) ; le jeton « moi » en état reconnexion (anneau 4/2). La place perd 32 px : 383, D2 tient (328). -->
` + jour12({ recon: true, placeH: 383, bandeau }),
  }));
}

/* ================================================================== */
/* 8. Réseau — la table disparue                                       */
/* ================================================================== */
resetUid();
{
  const gravure = `<svg width="294" height="200" viewBox="0 0 294 200" role="img" aria-label="Gravure : une table vide sur la place, une chaise renversée, une chandelle soufflée" style="display: block;">
<rect x="0" y="0" width="294" height="148" fill="url(#hach-h-e)" opacity="0.28"></rect>
<path d="M0 148 H294" stroke="${INK}" stroke-width="1"></path>
<rect x="0" y="148" width="294" height="52" fill="url(#hach-1-e)" opacity="0.7"></rect>
<!-- ombre portée vers le bas-gauche (lumière haut-droite) -->
<path d="M52 178 L214 168 L236 176 L74 188 Z" fill="${TEI}"></path><path d="M52 178 L214 168 L236 176 L74 188 Z" fill="url(#hach-3-e)"></path>
<!-- la table -->
<path d="M64 110 L226 103 L246 117 L82 126 Z" fill="${BRU}" stroke="${INK}" stroke-width="1.2"></path>
<path d="M82 126 L246 117 L246 123 L82 132 Z" fill="url(#hach-3-e)" stroke="${INK}" stroke-width="1"></path>
<path d="M88 132 L90 172 M240 123 L242 164 M70 113 L68 150 M222 106 L224 142" stroke="${INK}" stroke-width="2" stroke-linecap="round"></path>
<!-- cartes laissées face contre table -->
<g stroke="${INK}" stroke-width="0.8"><rect x="104" y="111" width="11" height="8" fill="url(#hach-2-e)" transform="rotate(-9 109 115)"></rect><rect x="121" y="114" width="11" height="8" fill="url(#hach-2-e)" transform="rotate(14 126 118)"></rect><rect x="186" y="108" width="11" height="8" fill="url(#hach-2-e)" transform="rotate(-4 191 112)"></rect><rect x="168" y="181" width="11" height="8" fill="url(#hach-2-e)" transform="rotate(22 173 185)"></rect></g>
<!-- chandelle soufflée -->
<rect x="150" y="96" width="5" height="12" fill="${BRU}" stroke="${INK}" stroke-width="1"></rect>
<path d="M152.5 94 C150 90 155 87 152 82 C150 79 153 77 151.5 74 M154 93 C157 89 153 86 156 81" fill="none" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"></path>
<!-- chaise restée debout, poussée en arrière -->
<g transform="translate(26 150)" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"><path d="M0 0 V-62 M0 -58 H14 M0 -46 H14 M14 -62 V-22 M0 -22 H28 V0 M14 -22 V0"></path></g>
<!-- chaise renversée -->
<g transform="translate(286 184) rotate(-90)" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"><path d="M0 0 V-62 M0 -58 H14 M0 -46 H14 M14 -62 V-22 M0 -22 H28 V0 M14 -22 V0"></path></g>
</svg>`;
  const corps = `<main style="flex: 1; min-height: 0; box-sizing: border-box; padding: 24px;">
<div style="position: relative; height: 100%; ${cuvetteStyle} padding: 32px 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;">
${cuvetteInner}
${rub('Table VRGL')}
${gravure}
<p style="margin: 0; text-align: center; font-family: ${FELL}; font-style: italic; font-size: 20px; line-height: 28px; color: ${DEL};">« La table s’est levée sans vous. »</p>
</div>
</main>`;
  write('Caprices-E2-Reseau-TableDisparue.dc.html', page({
    title: 'Réseau — table disparue', w: 390, h: 844,
    body: `<!-- vous = Tom. La partie n’existe plus côté serveur : planche de fin réduite, une seule action. Variante « double onglet » : même écran, « La partie est ouverte dans un autre onglet. » + « Jouer ici » (encart hors artboard, à poser par le chef). -->
<div style="position: relative; width: 390px; height: 844px; display: flex; flex-direction: column;">
${barreSysteme()}
${frise({ W: 390, heure: null, clocherX: 196, potenceX: 290, droite: outil('i-son', 'Couper le son') })}
${corps}
${barre(btnPrim('Retour à l’accueil'))}
${accueil()}
</div>`,
  }));
}

/* ================================================================== */
/* 9. Étroit 320 × 568 (vous = Tom)                                    */
/* ================================================================== */
resetUid();
{
  const e = etatsJour12({ d4: true });
  const cells = range(1, 12).map((s) => jeton(s, DENS.D4, e[s]));
  const hc = `<h1 style="margin: 0; height: 44px; flex: none; box-sizing: border-box; padding: 0 8px; display: flex; align-items: center; background: ${BRU}; border: 1px solid ${P2}; font-family: ${FELLSC}; font-weight: 400; font-size: 20px; line-height: 24px; letter-spacing: .02em;">Jour II</h1>`;
  write('Caprices-E2-Etroit-320.dc.html', page({
    title: 'Jour — 320', w: 320, h: 568,
    body: `<!-- vous = Tom. Jour-12 à 320 × 568 : gouttière 12, D4, crieur sur une ligne, consigne sur deux, « Carte » en icône seule. -->
<div style="position: relative; width: 320px; height: 568px; display: flex; flex-direction: column;">
${barreSysteme(20, 320)}
${frise({ W: 320, gutter: 12, clocherX: 154, potenceX: 296, gauche: outil('i-retour', 'Retour à l’arcade') + hc, droite: btnCarte(false) + outil('i-menu', 'Menu de la table') + outil('i-son', 'Couper le son') })}
${minuterie({ n: 17, txt: '1:42', gutter: 12 })}
${crieur({ rubrique: 'Jour II', texte: CRIEUR_JOUR, gutter: 12, lignes: 1, h: 32 })}
${consigne({ texte: CONSIGNE_JOUR, gutter: 12, h: 48, lignes: 2 })}
${place({ cells, cols: 5, colW: 56, colGap: 4, rowGap: 4, h: 248, gutter: 12, label: 'La place, douze joueurs' })}
${resume({ gauche: B('Votre voix : Anna'), droite: '6 sur 10', gutter: 12 })}
${pli({ kind: 'ecu', label: 'Le village', w: 96, count: 3, gutter: 12 })}
${barre(btnSec('S’abstenir', ' padding: 0 12px;') + btnPrim('Voter contre Anna', ' padding: 0 10px;'), { gutter: 12 })}
</div>`,
  }));
}

/* ================================================================== */
/* 10. Paysage 844 × 390 (vous = Tom)                                  */
/* ================================================================== */
resetUid();
{
  const e = etatsJour12({ d4: true });
  const cells = range(1, 12).map((s) => jeton(s, DENS.D4, e[s]));
  write('Caprices-E2-Paysage.dc.html', page({
    title: 'Jour — paysage', w: 844, h: 390,
    body: `<!-- vous = Tom. Jour-12 en paysage : encoche à gauche (47 px réservés), indicateur d’accueil 21 px. Colonne gauche : minuterie + place D4 ; colonne droite : crieur, consigne, résumé, pli, barre. -->
<div style="position: relative; width: 844px; height: 390px; display: flex; flex-direction: column;">
${frise({ W: 844, heure: 'Jour II', gutter: 16, insetL: 31, clocherX: 452, potenceX: 600 })}
<div style="height: 313px; flex: none; display: flex;">
<div style="width: 359px; flex: none; box-sizing: border-box; padding-left: 31px; display: flex; flex-direction: column;">
${minuterie({ n: 17, txt: '1:42' })}
${place({ cells, cols: 5, colW: 56, colGap: 4, rowGap: 4, h: 289, label: 'La place, douze joueurs' })}
</div>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; border-left: 0.75px solid ${P2};">
${crieur({ rubrique: 'Jour II', texte: CRIEUR_JOUR, gutter: 20 })}
${consigne({ texte: CONSIGNE_JOUR, gutter: 20 })}
<div style="flex: 1;"></div>
${resume({ gauche: B('Votre voix : Anna'), droite: '6 sur 10', gutter: 20 })}
${pli({ kind: 'ecu', label: 'Le village', w: 96, count: 3, gutter: 20 })}
${barre(btnSec('S’abstenir') + btnPrim('Voter contre Anna'), { gutter: 20 })}
</div>
</div>
<div aria-hidden="true" style="height: 21px; flex: none; display: flex; justify-content: center;"><div style="width: 134px; height: 5px; margin-top: 8px; background: ${INK};"></div></div>
</div>`,
  }));
}

/* ================================================================== */
/* Desktop : frise 64, cercle, pupitre, colonne                        */
/* ================================================================== */
function friseDesk({ heure, minutN = null, minutTxt = null, droite, clocherX = 780, potenceX = 1110, minutLabel = '' }) {
  const code = `<div aria-label="Code de table : VRGL" style="height: 44px; flex: none; box-sizing: border-box; padding: 0 10px 0 14px; display: flex; align-items: center; background: ${BRU}; border: 1px solid ${P2}; font-family: ${SERIF}; font-weight: 600; font-size: 20px; line-height: 24px; letter-spacing: .24em;">VRGL</div>`;
  const absent = minutTxt === null;
  const minut = `<div role="timer" aria-label="${absent ? 'Pas de minuterie pour vous' : (minutLabel || `Il reste ${minutTxt}`)}" style="height: 44px; flex: none; box-sizing: border-box; padding: 0 14px; display: flex; align-items: center; gap: 8px; background: ${BRU}; border: 1px solid ${P2};">${icon('i-sablier', 16)}${crans(absent ? 0 : minutN)}<span style="width: 44px; text-align: right; font-size: 16px; line-height: 20px; font-variant-numeric: tabular-nums lining-nums;${absent ? ` color: ${DEL};` : ''}">${absent ? '—' : minutTxt}</span></div>`;
  return `<header style="position: absolute; left: 0; top: 0; width: 1440px; height: 64px;">
<svg width="1440" height="64" viewBox="0 0 1440 64" aria-hidden="true" style="position: absolute; left: 0; top: 0;"><rect x="0" y="0" width="1440" height="64" fill="url(#hach-h-e)" opacity="0.28"></rect>${toits(1440, 62.5, clocherX, potenceX, 11)}<line x1="0" y1="63.25" x2="1440" y2="63.25" stroke="${INK}" stroke-width="1.5"></line></svg>
<div style="position: relative; height: 64px; box-sizing: border-box; padding: 6px 32px 0; display: flex; align-items: flex-start; gap: 8px;">${outil('i-retour', 'Retour à l’arcade')}${heureCart(heure, 22, 28)}${code}${minut}<div style="flex: 1;"></div>${droite}</div>
</header>`;
}

/** Positions sur l'ellipse ; « moi » à 6 heures. Renvoie {x,y} du centre du médaillon. */
const ellipse = (k, n, ref, cx, cy, rx, ry) => {
  const th = (Math.PI / 180) * (90 + (k - ref) * (360 / n));
  return { x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) };
};

/* ================================================================== */
/* 11. Chasseur — desktop (vous = Gaspard)                             */
/* ================================================================== */
resetUid();
{
  const D = DENS.C72;
  const e = etatsChasseur(7);
  e[2] = { ...e[2], mire: true };
  // place x 32-1036, y 120-868 ; centre (534, 494) ; rx 442, ry 304 ; médaillon 18 px au-dessus du centre de cellule
  let cells = '';
  for (const s of range(1, 12)) {
    const p = ellipse(s, 12, 7, 534, 494, 442, 304);
    const left = p.x - D.w / 2 - 32, top = p.y - 60 - 120;
    cells += `<div style="position: absolute; left: ${left.toFixed(1)}px; top: ${top.toFixed(1)}px;">${jeton(s, D, e[s])}</div>\n`;
  }
  const pupitre = `<div style="position: absolute; left: ${354 - 32}px; top: ${394 - 120}px; width: 360px; height: 200px; ${cuvetteStyle} padding: 16px 16px 14px; display: flex; flex-direction: column;">
${cuvetteInner}
<p style="position: relative; margin: 0; font-size: 18px; line-height: 28px; font-variation-settings: 'opsz' 18;">Votre dernière balle : abattez un vivant — ou tirez en l’air.</p>
<div style="position: relative; margin-top: 4px; font-size: 15px; line-height: 24px;">${B('Votre balle : Bastien')}</div>
<div style="position: relative; margin-top: auto; display: flex; gap: 8px;">${btnSec('Tirer en l’air', ' padding: 0 14px;')}${btnPrim('Tirer sur Bastien', ' padding: 0 12px;')}</div>
</div>`;
  const msg = (nom, t) => `<div style="padding-left: 10px; background: repeating-linear-gradient(180deg, ${DEL} 0 1.5px, transparent 1.5px 4.5px) left top / 1px 100% no-repeat;"><div style="font-size: 16px; line-height: 20px; font-weight: 600; color: ${DEL};">${nom}</div><div style="font-size: 16px; line-height: 24px; font-style: italic; color: ${DEL};">${t}</div></div>`;
  const tab = (kind, label, actif, w) => `<button type="button" role="tab" aria-selected="${actif}" style="margin: 0; padding: 0; border: 0; background: none; cursor: pointer;">${cartouche(kind, w, 44, label, { plein: actif, fontSize: 16 })}</button>`;
  const colonne = `<aside aria-label="Le fil" style="position: absolute; left: 1068px; top: 80px; width: 340px; height: 788px; box-sizing: border-box; background: ${BRU}; border: 1px solid ${P2}; display: flex; flex-direction: column;">
<div style="flex: none; padding: 12px 16px; border-bottom: 0.75px solid ${P2}; display: flex; justify-content: space-between; align-items: baseline; font-size: 15px; line-height: 24px;">${B('Votre balle : Bastien')}<span style="font-size: 13px; line-height: 16px; color: ${DEL};">sans retour</span></div>
<div role="tablist" aria-label="Canaux" style="flex: none; display: flex; gap: 8px; padding: 12px 16px 0;">${tab('ecu', 'Le village', false, 128)}${tab('audela', 'L’au-delà', true, 128)}</div>
<div role="tabpanel" aria-label="L’au-delà" style="flex: 1; min-height: 0; box-sizing: border-box; padding: 16px; display: flex; flex-direction: column; justify-content: flex-end; gap: 16px;">
${msg('Clément', 'Enfin un peu de compagnie.')}
${msg('Jules', 'Vise bien, Chasseur. On regarde tous.')}
${msg('Clément', 'Il hésite entre deux têtes, ça se voit d’ici.')}
${msg('Jules', 'Moi, je ne dis rien. Je suis mort.')}
</div>
<div style="flex: none; padding: 10px 16px 16px; border-top: 0.75px solid ${P2};">
<label for="saisie-audela" style="display: block; margin-bottom: 6px;">${rub('L’au-delà')}</label>
<div style="display: flex; gap: 8px; align-items: center;"><input id="saisie-audela" type="text" placeholder="Commenter d’outre-tombe…" style="flex: 1; min-width: 0; height: 48px; box-sizing: border-box; margin: 0; padding: 0 12px; border: 0; border-bottom: 1.5px solid ${INK}; border-radius: 0; background: ${TEI}; font-family: ${SERIF}; font-size: 16px; color: ${INK};">${outil('i-plume', 'Envoyer')}</div>
</div>
</aside>`;
  write('Caprices-E2-Chasseur-Desktop.dc.html', page({
    title: 'Chasseur — desktop', w: 1440, h: 900,
    body: `<!-- vous = Gaspard (le Chasseur), exécuté au Jour II. Gabarit desktop : frise 64, crieur 56, place 1 004 × 748 en cercle (m 72), pupitre 360 × 200, colonne 340. Mire sur Bastien. -->
${friseDesk({ heure: 'Jour II', minutN: 14, minutTxt: '0:23', minutLabel: 'Il vous reste 0:23 pour tirer', droite: btnCarte(true) + outil('i-menu', 'Menu de la table') + outil('i-son', 'Couper le son') })}
<div style="position: absolute; left: 32px; top: 64px; width: 1004px;">${crieur({ rubrique: 'Jour II', texte: CRIEUR_CHASSEUR, carte: true, gutter: 0, lignes: 2 })}</div>
<div role="group" aria-label="La place, douze joueurs, en cercle" style="position: absolute; left: 32px; top: 120px; width: 1004px; height: 748px;">
${pupitre}
${cells}
</div>
${colonne}`,
  }));
}

/* ================================================================== */
/* 12. Scène TV — écran partagé, sans secret                           */
/* ================================================================== */
resetUid();
{
  const D = DENS.TV;
  // Jour I, vote en cours : Clément dévoré la Nuit I, Étienne vient de prendre le brassard ; 7 sur 11 ont voté
  const e = {
    1: { vote: true, statut: 'a voté' }, 2: { vote: true, statut: 'a voté' }, 3: { mort: { kind: 'ecu', text: 'Villageois·e', w: 120 } },
    4: { vote: true, statut: 'a voté' }, 5: { cap: true, vote: true, statut: 'a voté' }, 6: { statut: 'délibère' },
    7: { vote: true, statut: 'a voté' }, 8: { vote: true, statut: 'a voté' }, 9: { statut: 'délibère' },
    10: { statut: 'délibère' }, 11: { statut: 'délibère' }, 12: { vote: true, statut: 'a voté' },
  };
  let cells = '';
  for (const s of range(1, 12)) {
    const p = ellipse(s, 12, 7, 720, 458, 600, 332); // siège 1 en haut, 7 en bas
    cells += `<div style="position: absolute; left: ${(p.x - D.w / 2).toFixed(1)}px; top: ${(p.y - 54).toFixed(1)}px;">${jeton(s, D, e[s])}</div>\n`;
  }
  const centre = `<section aria-label="Le crieur" style="position: absolute; left: 300px; top: 458px; width: 840px; transform: translateY(-50%); ${cuvetteStyle} padding: 24px 40px; display: flex; flex-direction: column; align-items: center; text-align: center;">
${cuvetteInner}
<div style="position: relative;">${rub('Jour I', 20, 28)}</div>
<p aria-live="polite" style="position: relative; margin: 8px 0 0; font-family: ${FELL}; font-weight: 400; font-size: 56px; line-height: 60px; text-wrap: balance;">Le jour se lève sur Thiercelieux. Le village délibère.</p>
<p style="position: relative; margin: 20px 0 0; display: flex; align-items: baseline; gap: 14px;"><span style="font-size: 40px; line-height: 48px; font-weight: 600; font-variant-numeric: tabular-nums lining-nums;">7 sur 11</span><span style="font-size: 24px; line-height: 32px;">ont voté</span></p>
<p style="position: relative; margin: 8px 0 0; font-family: ${FELL}; font-style: italic; font-size: 20px; line-height: 28px; color: ${DEL};">« Tous d’accord, donc tous innocents. »</p>
</section>`;
  write('Caprices-E2-Scene-TV.dc.html', page({
    title: 'Scène TV', w: 1440, h: 900,
    body: `<!-- Écran partagé au centre de la table, SANS AUCUN SECRET : ni consigne, ni fil, ni « Ma carte », ni minuterie de siège, ni lacs, ni choix. Seule la minuterie publique de la phase (la même horloge pour tous). Jour I, 7 sur 11 ont voté. -->
${friseDesk({ heure: 'Jour I', minutN: 13, minutTxt: '2:10', minutLabel: 'Il reste 2:10 au vote du village', clocherX: 700, potenceX: 1240, droite: outil('i-son', 'Couper le son') })}
<div role="group" aria-label="La place, douze joueurs" style="position: absolute; left: 0; top: 0; width: 1440px; height: 900px;">
${centre}
${cells}
</div>`,
  }));
}
