// Lot E2a — aubes en planche, fil au tiers et plein écran, dépouillement (mobiles).
import { page, PAPIER as T, st, esc, abs, icone, cartouche, FELL, SERIF } from './base.mjs';
import { grille } from './jeton.mjs';
import { ecranMobile, voix, bouton, voile, crieur, consigne, barreSysteme, frise, minuterie, resume, pli, barre } from './gabarit.mjs';
import { table, scene12, MORTS_J2, ROLE, PROMPT_JOUR, PROMPT_JOUR_COURT, CRIEUR_J2 } from './tables.mjs';
import { vignette, planche, heureSC, legende, filetDoux, ligneCrieur, crans, batons, rubrique } from './planches.mjs';

/* ---------- Les aubes : la planche par-dessus l'écran de jour ---------- */
function aube({ fichier, titre, derriere, heure, vign, leg, lignes, plein = 2 }) {
  const contenu = `${heureSC(T, heure)}${vignette(vign, T)}${legende(T, leg)}${filetDoux(T, 96)}
<div style="${st({ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' })}">${lignes.map(([t, g]) => ligneCrieur(T, t, g)).join('')}</div>
<button type="button" style="${st({ marginTop: 'auto', minHeight: 44, background: 'none', border: 0, padding: '0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: SERIF, fontSize: 12, lineHeight: '16px', color: T.encre2, cursor: 'pointer' })}">${crans(T, 5, plein)}<span>Toucher pour passer</span></button>`;
  page({ fichier, titre, w: 390, h: 844, T, corps: derriere + voile(T, 103, 741) + planche(T, { top: 127, h: 611, label: `${heure} — ${leg}`, contenu }) });
}

// derrière l'aube I : le Jour I s'ouvre sur l'élection
const jourI = (n, etats, vous) => ecranMobile(T, {
  heure: 'Jour I', minuterie: { reste: '1:00', pleins: 24 },
  crieur: { rub: 'Aube I', txt: 'La meute a dévoré Clément — c’était Villageois·e.', mort: true },
  consigne: { txt: 'Élisez votre capitaine — un vivant, vous compris — ou abstenez-vous.' },
  place: grille(table(n, etats), n > 12 ? 'D3' : 'D2', T, 263, 399),
  resume: { g: '', d: `0 sur ${n - 1}` }, pli: { type: 'ecu', txt: 'Le village' },
  barre: bouton(T, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(T, 'eteint', 'Élire', { icon: 'index' }),
});

aube({ fichier: 'Caprices-E2-Aube-Planche.dc.html', titre: 'E2 · Aube', heure: 'Aube I', vign: 'yeux', leg: 'Personne ne nous a vus.',
  derriere: jourI(12, { Clément: MORTS_J2.Clément, Tom: { moi: true } }),
  lignes: [['La meute a dévoré Clément — c’était Villageois·e.', 'chandelle']] });

aube({ fichier: 'Caprices-E2-Aube-Paisible.dc.html', titre: 'E2 · Aube paisible', heure: 'Aube II', vign: 'dormeur', leg: 'Tous sont là. Personne n’est rassuré.', plein: 3,
  derriere: ecranMobile(T, {
    heure: 'Jour II', minuterie: { reste: '3:00', pleins: 24 }, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
    place: grille(table(12, { ...MORTS_J2, Étienne: { capitaine: true }, Tom: { moi: true, nonChoisissable: true } }), 'D2', T, 263, 399),
    resume: { g: '', d: '0 sur 10' }, pli: { type: 'ecu', txt: 'Le village' },
    barre: bouton(T, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(T, 'eteint', 'Voter', { icon: 'index' }),
  }),
  lignes: [['Personne n’est mort cette nuit. Le village se réveille entier.', null]] });

aube({ fichier: 'Caprices-E2-Aube-Corbeau.dc.html', titre: 'E2 · Aube du Corbeau', heure: 'Aube I', vign: 'lettre', leg: 'La lettre n’était pas signée.', plein: 1,
  derriere: jourI(18, { Clément: MORTS_J2.Clément, Bastien: { marque: true }, Rose: { moi: true } }),
  lignes: [['La meute a dévoré Clément — c’était Villageois·e.', 'chandelle'], ['Le Corbeau a désigné Bastien : au vote du jour, deux voix sont déjà comptées.', 'plume']] });

/* ---------- Le fil ---------- */
const FILETS = {
  village: (c) => `border-left: 1px solid ${c};`,
  serment: (c) => `border-left: 3px double ${c};`,
};
function message(T, canal, nom, txt, soi = false) {
  const col = canal === 'serment' ? T.serment : T.encre;
  const n = soi ? `<span style="${st({ fontFamily: "'IM Fell French Canon SC', Georgia, serif", fontSize: 13, letterSpacing: '.06em', color: T.encre2, marginRight: 6 })}">vous</span>`
    : `<b style="${st({ fontWeight: 600, fontSize: 15, color: col, marginRight: 6 })}">${esc(nom)}</b>`;
  return `<p style="margin: 0; padding: 0 0 0 10px; ${FILETS[canal](col)} font-size: 16px; line-height: 24px; color: ${T.encre};">${n}${esc(txt)}</p>`;
}
function saisie(T, top, ph) {
  return `<div style="${abs(16, top, 358, 48, { display: 'flex', gap: 8 })}"><label for="saisie-fil" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">${esc(ph)}</label><input id="saisie-fil" type="text" placeholder="${esc(ph)}" style="${st({ flex: '1 1 0', minWidth: 0, height: 48, boxSizing: 'border-box', background: T.creux, border: 0, borderBottom: `1.5px solid ${T.filet}`, borderRadius: 0, padding: '0 12px', fontFamily: SERIF, fontSize: 16, color: T.encre })}"><button type="button" aria-label="Envoyer" style="${st({ width: 48, height: 48, flex: 'none', background: 'transparent', border: `1px solid ${T.filetDoux}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })}">${icone('plume', T)}</button></div>`;
}
function onglets(T, top, liste) {
  const tabs = liste.map(([type, txt, actif, n]) => {
    const c = cartouche(type, n ? `${txt} · ${n}` : txt, T, { h: 44, fs: 15, plein: actif, gras: actif });
    return `<button type="button" role="tab" aria-selected="${actif}" style="background: none; border: 0; padding: 0; cursor: pointer; display: block;">${c.svg}</button>`;
  }).join('');
  return `<div style="${abs(0, top, 390, 44 + 8, { padding: '4px 16px 4px', display: 'flex', gap: 8, alignItems: 'center', borderTop: `1.5px solid ${T.filet}` })}"><span aria-hidden="true" style="${abs(0, 3, 390, 1, { display: 'block', height: 0.75, background: T.filet })}"></span><div role="tablist" style="display: flex; gap: 8px;">${tabs}</div><button type="button" aria-label="Refermer le fil" style="${st({ marginLeft: 'auto', width: 44, height: 44, background: 'transparent', border: `1px solid ${T.filetDoux}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })}">${icone('chevron-bas', T)}</button></div>`;
}

// Fil ouvert au tiers — vous = Tom : place D4, crieur + consigne sur une ligne de 40
{
  const ligne40 = `<button type="button" aria-label="Déplier le crieur et la consigne — ${esc(PROMPT_JOUR)}" style="${abs(0, 127, 390, 40, { background: 'none', border: 0, borderTop: `1px solid ${T.filetDoux}`, borderBottom: `1px solid ${T.filetDoux}`, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: SERIF, color: T.encre, cursor: 'pointer' })}"><span style="${st({ fontFamily: "'IM Fell French Canon SC', Georgia, serif", fontSize: 13, letterSpacing: '.06em', color: T.encre2, flex: 'none' })}">Jour II</span><span style="${st({ flex: '1 1 0', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 16, lineHeight: '24px' })}">Désignez qui montera à la potence — un autre vivant que vous.</span>${icone('chevron-bas', T, 20)}</button>`;
  const fil = onglets(T, 482 + 24, [['ecu', 'Le village', true]]) +
    `<div role="log" aria-label="Le village" style="${abs(16, 558, 358, 132, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, overflow: 'hidden' })}">${[
      message(T, 'village', 'Delphine', 'Bastien a voté bien vite hier.'),
      message(T, 'village', 'Bastien', 'Parce que Jules mentait, voilà.'),
      message(T, 'village', 'Gaspard', 'Et Anna ? Elle n’a rien dit.'),
      message(T, 'village', '', 'Anna défendait Jules hier soir.', true)].join('')}</div>` + saisie(T, 690, 'Parler au village…');
  page({ fichier: 'Caprices-E2-Jour-Fil-Tiers.dc.html', titre: 'E2 · Fil au tiers', w: 390, h: 844, T, corps: ecranMobile(T, {
    heure: 'Jour II', minuterie: { reste: '1:42', pleins: 14 }, ligne40,
    placeTop: 167, placeH: 315, place: grille(scene12(), 'D4', T, 171, 307),
    resumeTop: 482, resume: { g: voix(T, 'Anna'), d: '6 sur 10' },
    milieu: fil, barre: bouton(T, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(T, 'primaire', 'Voter contre Anna', { icon: 'index' }),
  }) });
}

// Fil plein écran — vous = Anna, canal du serment ouvert
{
  const fil = `<div style="${abs(0, 255, 390, 483, { background: T.fond })}"></div>` +
    resume(T, voix(T, 'Bastien'), '7 sur 10', { top: 259 }) +
    onglets(T, 287, [['ecu', 'Le village', false, 3], ['lacs', 'Le serment', true]]) +
    `<div role="log" aria-label="Le serment" style="${abs(16, 343, 358, 339, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, overflow: 'hidden' })}">${[
      message(T, 'serment', 'Étienne', 'Ma voix compte double. Je la mets sur Bastien.'),
      message(T, 'serment', '', 'Tom tourne autour de moi depuis l’aube.', true),
      message(T, 'serment', 'Étienne', 'Il cherche quelqu’un. Ne lui donne rien.'),
      message(T, 'serment', '', 'Si l’un tombe, l’autre suit. Je n’oublie pas.', true),
      message(T, 'serment', 'Étienne', 'Alors on reste debout. Vote avec moi.')].join('')}</div>` + saisie(T, 690, 'Murmurer…');
  page({ fichier: 'Caprices-E2-Jour-Fil-Plein.dc.html', titre: 'E2 · Fil plein écran', w: 390, h: 844, T, corps: ecranMobile(T, {
    heure: 'Jour II', minuterie: { reste: '1:20', pleins: 11 }, crieur: CRIEUR_J2, consigne: { txt: PROMPT_JOUR_COURT },
    place: '', resume: false, milieu: fil,
    barre: bouton(T, 'secondaire', 'S’abstenir', { w: 120 }) + bouton(T, 'primaire', 'Voter contre Bastien', { icon: 'index' }),
  }) });
}

/* ---------- Le dépouillement (table de 18, vous = Tom) ---------- */
{
  const lignes = [
    ['Anna', 7, [{}, {}, { double: true }, {}, {}, {}], 'Tom, Delphine, Étienne ×2, Gaspard, Léa, Nour'],
    ['Bastien', 5, [{ corbeau: true }, {}, {}, {}], 'le Corbeau +2 · Fanny, Hélène, Rose'],
    ['Gaspard', 2, [{}, {}], 'Bastien, Octave'],
  ];
  const row = ([nom, n, v, qui]) => `<div style="${st({ alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 40px', rowGap: 2, alignItems: 'center' })}">
<span style="font-size: 16px; line-height: 20px; font-weight: 600;">${esc(nom)}</span><span style="font-size: 16px; line-height: 20px; text-align: right; font-variant-numeric: tabular-nums lining-nums;">${n}</span>
<span style="grid-column: 1 / 3;">${batons(T, v)}</span>
<span style="${st({ gridColumn: '1 / 3', fontSize: 12, lineHeight: '16px', color: T.encre2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}">${esc(qui)}</span></div>`;
  const abst = `<div style="${st({ alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 40px', alignItems: 'center' })}"><span style="font-size: 16px; line-height: 20px;">Abstention</span><span style="font-size: 16px; text-align: right; font-variant-numeric: tabular-nums;">3</span><span style="${st({ gridColumn: '1 / 3', fontSize: 12, lineHeight: '16px', color: T.encre2 })}">Inès, Malo, Quentin · Paulette, absente, n’a pas voté</span></div>`;
  const fourche = `<svg width="48" height="48" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(8 16 16)" fill="none" stroke="${T.encre}" stroke-width="2" stroke-linecap="round"><path d="M16 30 V12 M10 12 H22 M10 12 V5 M16 12 V3.5 M22 12 V5"></path></g></svg>`;
  const ecu = cartouche('ecu', 'Village', T, { h: 20 });
  const carte = `<div role="img" aria-label="La carte d’Anna se retourne : Villageois·e" style="${st({ width: 96, height: 134, flex: 'none', position: 'relative', boxSizing: 'border-box', background: T.surface, padding: 6 })}"><div style="${st({ position: 'absolute', left: 6, top: 6, right: 6, bottom: 6, borderRadius: 2, borderStyle: 'solid', borderWidth: '1px 1.5px 1.5px 1px', borderColor: `rgba(23,19,15,.38) ${T.surface} ${T.surface} rgba(23,19,15,.38)`, background: T.fondPlanche, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 4 })}">${fourche}<span style="${st({ fontFamily: FELL, fontSize: 16, lineHeight: '20px' })}">Villageois·e</span>${ecu.svg}</div></div>`;
  const contenu = `<h2 style="${st({ margin: 0, fontFamily: FELL, fontWeight: 400, fontSize: 28, lineHeight: '32px' })}">Les voix sont comptées</h2>
${lignes.map(row).join('')}${abst}
<div style="${st({ alignSelf: 'stretch', display: 'flex', gap: 12, alignItems: 'center' })}">${carte}<div style="display: flex; flex-direction: column; gap: 6px;">${ligneCrieur(T, 'Les voix sont comptées : la potence est pour Anna.', null)}<span style="font-size: 12px; line-height: 16px; color: ${T.encre2};">Anna · exécutée jour II</span></div></div>
${legende(T, 'Les voix sont comptées ; les raisons, jamais.')}`;
  let h = barreSysteme(T) + frise(T, 'Jour II') + minuterie(T, { etat: 'absente' });
  h += planche(T, { top: 127, h: 567, label: 'Le dépouillement', contenu, gap: 12 });
  h += pli(T, { type: 'ecu', txt: 'Le village', n: 5 });
  h += barre(T, bouton(T, 'secondaire', 'Toucher pour passer'));
  page({ fichier: 'Caprices-E2-Depouillement.dc.html', titre: 'E2 · Dépouillement', w: 390, h: 844, T, corps: h });
}
