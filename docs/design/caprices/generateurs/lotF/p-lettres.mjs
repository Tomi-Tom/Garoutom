// Planche F-II — Les lettres (SPEC § 3.6, § 2.2, § 5.8, § 5.17)
import { C, PAPIER, CUIVRE, page, entete, section, ts, st, esc, n, LF_DEFS, NOTE, NOTE_ENCRE, FELL, SC, SERIF, cuvette, cuivreRect } from './lib.mjs';
import { glg, icg } from './traces.mjs';
import { cartouche, tw } from './comp.mjs';

const fam = { fell: FELL, sc: SC, serif: SERIF };
const ECH = [
  // token, police, [taille mobile, lh], [desktop], graisse, emploi, plancher, spécimen, options
  ['--t-planche', 'IM Fell', [40, 44], [56, 60], '400', 'verdict, accueil, planche plein écran', '—', 'Il est l’heure.', { f: 'fell' }],
  ['--t-titre', 'IM Fell', [28, 32], [36, 40], '400', 'titre de feuille, nom de rôle', '24', 'la Sorcière', { f: 'fell' }],
  ['--t-heure', 'IM Fell SC', [20, 24], [22, 28], '400', 'l’heure de l’en-tête', '20', 'Nuit II', { f: 'sc' }],
  ['--t-legende', 'IM Fell italique', [18, 24], [20, 28], '400', 'légende du graveur', '16', '« Personne ne nous a vus. »', { f: 'fell', it: true, c: C.del }],
  ['--t-rubrique', 'IM Fell SC', [13, 16], [14, 20], '400 · .06em', 'intitulé de section', '13', 'Aube II', { f: 'sc', ls: '.06em', c: C.del }],
  ['--t-jeu', 'Source Serif 4', [18, 24], [18, 28], '400 · opsz 18', 'consigne du rôle', '18', 'Désignez qui montera à la potence — un autre vivant que vous.', {}],
  ['--t-corps', 'Source Serif 4', [16, 24], [16, 24], '400', 'crieur, fil, règles', '16', 'La meute a dévoré Clément — c’était Villageois·e.', {}],
  ['--t-bouton', 'Source Serif 4', [17, 20], [17, 20], '600 / 400', 'bouton primaire / secondaire', '16', 'Voter contre Anna', { w: 600, btn: true }],
  ['--t-nom', 'Source Serif 4', [15, 20], [16, 20], '600 · 700 vous', 'nom sur jeton (compact 14/16)', '13', 'Étienne', { w: 600, nom: true }],
  ['--t-statut', 'Source Serif 4', [12, 16], [13, 16], '400 · opsz 12', 'statut, horodatage, raison', '12', 'a voté · absent·e · 23 s · Il manque 2 joueurs', { c: C.del }],
  ['--t-chiffre', 'Source Serif 4', [16, 20], [16, 20], '400 · 600 urgence', 'minuterie, décomptes', '16', '0:41 · 7 sur 11', { tab: true, urg: true }],
  ['--t-code', 'Source Serif 4', [32, 40], [40, 48], '600 · .24em · capitales', 'code de table', '—', 'VRGL', { w: 600, ls: '.24em' }],
];

function echelle() {
  let rows = '';
  const head = `<div style="display: grid; grid-template-columns: 250px 600px 600px 70px; column-gap: 0; border-bottom: 0.75px solid ${C.b900}; padding-bottom: 4px;">
    <span style="${ts({ s: 12, lh: 16, c: C.del })}">token · police · graisse · emploi</span>
    <span style="${ts({ s: 12, lh: 16, c: C.del })}">mobile — à la taille réelle</span>
    <span style="${ts({ s: 12, lh: 16, c: C.del })}">desktop — à la taille réelle</span>
    <span style="${ts({ s: 12, lh: 16, c: C.del })}">plancher</span></div>`;
  for (const [tok, pol, mo, de, gr, emploi, plancher, spec, o] of ECH) {
    const specimen = ([s, lh], desk) => {
      const style = `font-family: ${fam[o.f || 'serif']}; font-size: ${s}px; line-height: ${lh}px; font-weight: ${o.w || 400}; color: ${o.c || C.b900};${o.it ? ' font-style: italic;' : ''}${o.ls ? ` letter-spacing: ${o.ls};` : ''}${o.tab ? ' font-variant-numeric: tabular-nums lining-nums;' : ''}${(o.f || 'serif') === 'serif' ? ' font-optical-sizing: auto;' : ''}`;
      if (o.btn) return `<span style="display: inline-flex; gap: 8px; align-items: center;"><span style="${style} display: inline-flex; align-items: center; height: 48px; padding: 0 16px; background: ${C.b900}; color: ${C.bru}; box-sizing: border-box; border: 1.5px solid ${C.b900};">Voter contre Anna</span><span style="${style} font-weight: 400; display: inline-flex; align-items: center; height: 48px; padding: 0 16px; border: 1.5px solid ${C.b900}; box-sizing: border-box;">S’abstenir</span></span>`;
      if (o.nom) return `<span style="${style}">Étienne</span><span style="${style} margin-left: 16px; font-weight: 700;">Tom</span><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'margin-left: 8px;' })}">vous (700)</span>${desk ? '' : `<span style="font-family: ${SERIF}; font-size: 14px; line-height: 16px; font-weight: 600; margin-left: 16px;">Clément</span><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'margin-left: 6px;' })}">compact 14/16</span>`}`;
      if (o.urg) return `<span style="${style}">${esc(spec)}</span><span style="${style} font-size: 20px; line-height: 24px; font-weight: 600; margin-left: 18px;">0:07</span><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'margin-left: 6px;' })}">urgence 20/24 · 600</span>`;
      return `<span style="${style}">${esc(spec)}</span>`;
    };
    const h = Math.max(36, de[1] + 4, o.btn ? 52 : 0);
    rows += `<div style="display: grid; grid-template-columns: 250px 600px 600px 70px; align-items: center; min-height: ${h}px; border-bottom: 0.75px solid ${C.p2};">
      <div style="display: flex; flex-direction: column; padding: 4px 0;"><span style="${ts({ s: 13, lh: 16, w: 600 })}">${tok}</span><span style="${ts({ s: 12, lh: 16, c: C.del })}">${esc(pol)} · ${esc(gr)} · ${esc(emploi)}</span></div>
      <div style="display: flex; align-items: center; padding: 4px 16px 4px 0; overflow: hidden;"><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'width: 52px; flex: none; font-variant-numeric: tabular-nums;' })}">${mo[0]}/${mo[1]}</span><span>${specimen(mo, false)}</span></div>
      <div style="display: flex; align-items: center; padding: 4px 16px 4px 0; overflow: hidden;"><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'width: 52px; flex: none; font-variant-numeric: tabular-nums;' })}">${de[0]}/${de[1]}</span><span>${specimen(de, true)}</span></div>
      <div style="${ts({ s: 16, lh: 20, w: 600, extra: 'font-variant-numeric: tabular-nums;' })}">${plancher}</div></div>`;
  }
  return head + rows;
}

/* ---- B. Planchers ---- */
function planchers() {
  const ligne = (ok, html, note) => `<div style="display: flex; align-items: baseline; gap: 12px; min-height: 26px; border-bottom: 0.75px solid ${C.p2};"><span style="${ts({ s: 13, lh: 18, w: 700, c: C.b900, extra: 'width: 52px; flex: none;' })}">${ok ? 'oui' : 'refusé'}</span><span style="flex: 1;${ok ? '' : ' text-decoration: line-through; text-decoration-thickness: 1px;'}">${html}</span><span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'width: 150px; flex: none; text-align: right;' })}">${note}</span></div>`;
  return `<div style="display: flex; flex-direction: column; gap: 0;">
    ${ligne(true, `<span style="${ts({ s: 12, lh: 16, c: C.del })}">a voté · délibère · Il manque 2 joueurs</span>`, 'Source Serif · 12 px')}
    ${ligne(false, `<span style="${ts({ s: 11, lh: 14, c: C.del })}">a voté · délibère · Il manque 2 joueurs</span>`, '11 px : sous le plancher')}
    ${ligne(true, `<span style="${ts({ f: 'fell', s: 16, lh: 24, it: true, c: C.del })}">« Tous d’accord, donc tous innocents. »</span>`, 'IM Fell italique · 16')}
    ${ligne(false, `<span style="${ts({ f: 'fell', s: 13, lh: 18, it: true, c: C.del })}">« Tous d’accord, donc tous innocents. »</span>`, 'IM Fell romain/ital. · 13')}
    ${ligne(true, `<span style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })}">Nuit II · Le registre</span>`, 'IM Fell SC · 13')}
    ${ligne(false, `<span style="${ts({ f: 'sc', s: 11, lh: 14, c: C.del, ls: '.06em' })}">Nuit II · Le registre</span>`, 'IM Fell SC · 11')}
    ${ligne(true, `<span style="${ts({ s: 12, lh: 16, c: C.del })}">absent·e · 23 s</span>`, 'la nuance par --encre-2')}
    ${ligne(false, `<span style="${ts({ s: 12, lh: 16, c: C.b900, extra: 'opacity: .55;' })}">absent·e · 23 s</span>`, 'opacité sur du texte')}
    ${ligne(false, `<span style="${ts({ s: 16, lh: 20, w: 600, ls: '.08em' })}">VOTER CONTRE ANNA</span>`, 'capitales hors code')}
  </div>`;
}

/* ---- C. Crieur contre graveur ---- */
function deuxMains() {
  const col = (titre, sous, contenu, regles) => `<div style="width: 262px; display: flex; flex-direction: column; gap: 10px;">
    <div><div style="${ts({ f: 'fell', s: 24, lh: 28 })}">${titre}</div><div style="${ts({ s: 12, lh: 16, c: C.del })}">${sous}</div></div>
    ${contenu}
    <div style="display: flex; flex-direction: column; gap: 4px;">${regles.map((r) => `<div style="${ts({ s: 13, lh: 18, c: C.b900 })}">${r}</div>`).join('')}</div></div>`;
  const crieur = `<div style="box-sizing: border-box; width: 262px; height: 56px; background: ${C.ver}; border-top: 0.75px solid ${C.p2}; border-bottom: 0.75px solid ${C.p2}; padding: 6px 0; display: flex; gap: 8px;">
      <span style="${ts({ f: 'sc', s: 13, lh: 20, c: C.del, ls: '.06em', extra: 'flex: none;' })}">Aube II</span>
      <span style="display: flex; gap: 4px; align-items: flex-start;"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="flex: none; margin-top: 3px;">${glg('chandelle', 0, 0, 16, C.b900)}</svg><span style="${ts({ s: 16, lh: 22 })}">La meute a dévoré Clément — c’était Villageois·e.</span></span></div>`;
  const graveur = `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 262px;">
      <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="Vignette : des yeux dans le noir">${cuvette(0, 0, 96, 96, 'cuivre')}<path d="M30 46 C34 42 40 42 44 46 C40 49 34 49 30 46 Z M54 47 C58 43 64 43 68 47 C64 50 58 50 54 47 Z" fill="${C.p3}"/><circle cx="37" cy="46" r="1.6" fill="${C.b900}"/><circle cx="61" cy="47" r="1.6" fill="${C.b900}"/></svg>
      <p style="margin: 0; text-align: center; ${ts({ f: 'fell', s: 18, lh: 24, it: true, c: C.del })}">« Personne ne nous a vus. »</p></div>`;
  return `<div style="display: flex; gap: 24px;">
    ${col('Le crieur', 'les évènements · textes de thiercelieux.ts, inchangés', crieur, ['Source Serif 4, 16-18 px, droit.', 'Peut nommer un joueur : c’est son métier.', 'Une seule région vive : il est annoncé.', 'Ne s’accorde jamais au pseudo (règle 1).'])}
    <div style="width: 0.75px; align-self: stretch; background: ${C.b900};"></div>
    ${col('Le graveur', 'une légende ironique, fixe, sous une planche', graveur, ['IM Fell italique, 18-20 px, entre « ».', 'Ne nomme jamais un joueur, ni un secret.', 'Pas d’aria-live : lu au parcours.', 'S’accorde au rôle, ou ne s’accorde pas.'])}
  </div>`;
}

/* ---- D. Code de table ---- */
function code() {
  const cases = (lettres, taille, cw, ch, etat) => lettres.map((l, i) => `<div style="box-sizing: border-box; width: ${cw}px; height: ${ch}px; background: ${C.tei}; border-bottom: ${etat === 'focus' && i === lettres.filter(Boolean).length ? 3 : 1.5}px solid ${C.b900}; display: flex; align-items: center; justify-content: center; ${ts({ s: taille, lh: taille + 8, w: 600, extra: 'letter-spacing: 0; font-variant-numeric: lining-nums;' })}">${l || ''}</div>`).join('');
  return `<div style="display: flex; flex-direction: column; gap: 14px;">
    <div style="display: flex; gap: 32px; align-items: flex-end;">
      <div style="display: flex; flex-direction: column; gap: 6px;"><label style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })}">Code de la table</label><div style="display: flex; gap: 8px;">${cases(['V', 'R', 'G', 'L'], 32, 56, 64)}</div><span style="${ts({ s: 12, lh: 16, c: C.del })}">mobile · 4 cases 56 × 64 · 32/40 · 600</span></div>
      <div style="display: flex; flex-direction: column; gap: 6px;"><label style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })}">en cours de saisie</label><div style="display: flex; gap: 8px;">${cases(['V', 'R', '', ''], 32, 56, 64, 'focus')}</div><span style="${ts({ s: 12, lh: 16, c: C.del })}">la case suivante porte le filet de 3 px</span></div>
    </div>
    <div style="display: flex; gap: 28px; align-items: center;">
      <div style="display: flex; flex-direction: column; gap: 4px;"><div style="${ts({ s: 40, lh: 48, w: 600, ls: '.24em' })}">VRGL</div><span style="${ts({ s: 12, lh: 16, c: C.del })}">desktop · 40/48 · .24em · capitales</span></div>
      <div style="display: flex; align-items: center; gap: 8px; background: ${C.bru}; border: 1px solid ${C.p2}; height: 44px; padding: 0 12px; box-sizing: border-box;"><span style="${ts({ f: 'sc', s: 22, lh: 28 })}">Jour II</span><span style="width: 0.75px; height: 24px; background: ${C.p2};"></span><span style="${ts({ s: 20, lh: 24, w: 600, ls: '.24em' })}">VRGL</span></div>
      <span style="${ts({ s: 12, lh: 16, c: C.del, extra: 'width: 170px;' })}">dans la frise desktop, à côté de l’heure, réduit à 20</span>
    </div>
    <p style="margin: 0; ${NOTE}">Collé d’un coup, le code se répartit dans les quatre cases. Les capitales n’existent que pour ce code.</p></div>`;
}

/* ---- E. IM Fell jamais dans une phrase ---- */
function phrase() {
  const ecran = (fell) => {
    const f = (s, lh, w = 400, c = C.b900) => fell ? ts({ f: 'fell', s, lh, c }) : ts({ s, lh, w, c });
    return `<div style="box-sizing: border-box; width: 440px; background: ${C.ver}; border: 0.75px solid ${C.b900}; padding: 16px; display: flex; flex-direction: column; gap: 12px; position: relative;">
      <div style="${ts({ f: 'sc', s: 13, lh: 16, c: C.del, ls: '.06em' })}">Jour II · la consigne</div>
      <p style="margin: 0; ${f(18, 24)}">Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.</p>
      <div style="display: flex; gap: 8px;">
        <button type="button" style="box-sizing: border-box; height: 48px; width: 120px; border-radius: 0; background: transparent; border: 1.5px solid ${C.b900}; ${f(17, 20)}">S’abstenir</button>
        <button type="button" style="box-sizing: border-box; height: 48px; flex: 1; border-radius: 0; background: ${C.b900}; border: 1.5px solid ${C.b900}; ${f(17, 20, 600, C.bru)}">Voter contre Anna</button>
      </div>
      <span style="${f(12, 16, 400, C.del)}">Votre voix : Anna · modifiable tant que la phase court</span>
      ${fell ? `<svg width="440" height="100%" viewBox="0 0 440 250" preserveAspectRatio="none" style="position: absolute; left: 0; top: 0; height: 100%; pointer-events: none;" aria-hidden="true"><path d="M6 244 L434 6" stroke="${C.b900}" stroke-width="2"/></svg>` : ''}
    </div>`;
  };
  return `<div style="display: flex; gap: 24px;">
    <div style="display: flex; flex-direction: column; gap: 8px;">${ecran(false)}<span style="${ts({ s: 13, lh: 18, w: 600 })}">Oui — Source Serif 4 porte la phrase : consigne, bouton, statut.</span></div>
    <div style="display: flex; flex-direction: column; gap: 8px;">${ecran(true)}<span style="${ts({ s: 13, lh: 18, w: 600 })}">Refusé — IM Fell dans une consigne, un bouton, un statut.</span></div>
  </div>
  <p style="margin: 12px 0 0; width: 904px; ${NOTE}">IM Fell titre et légende — l’heure, le nom d’un rôle, la légende du graveur, le numéro de planche, la rubrique — et rien d’autre. Son petit œil et ses fûts irréguliers sont sa beauté au-dessus de 18 px, son défaut en dessous. <span style="font-style: italic;">polices.test.ts</span> vérifie son absence des boutons, consignes et statuts.</p>`;
}

export function build() {
  const body = [
    entete({ num: 'F·II', titre: 'Les lettres', legende: 'Le crieur annonce ; le graveur légende.', refs: 'SPEC § 3.6 · § 2.2 · § 5.17' }),
    section({ x: 40, y: 140, w: 1520, h: 600, lettre: 'A', titre: 'L’échelle, en vrai', note: 'deux familles : IM Fell French Canon (identité), Source Serif 4 (corps) · interlignage en multiples de 4', contenu: echelle() }),
    section({ x: 40, y: 760, w: 560, h: 330, lettre: 'C', titre: 'Deux mains : le crieur contre le graveur', contenu: deuxMains() }),
    section({ x: 40, y: 1104, w: 560, h: 270, lettre: 'D', titre: 'Le code de table', note: '--t-code', contenu: code() }),
    section({ x: 640, y: 760, w: 920, h: 360, lettre: 'E', titre: 'IM Fell n’entre jamais dans une phrase', note: 'l’exemple et le contre-exemple', contenu: phrase() }),
    section({ x: 640, y: 1096, w: 920, h: 270, lettre: 'B', titre: 'Les planchers', note: 'jamais de texte sous 12 px ; IM Fell jamais sous 16 (13 en SC)', contenu: `<div style="display: flex; gap: 32px;"><div style="width: 560px;">${planchers()}</div><div style="width: 320px; display: flex; flex-direction: column; gap: 8px;"><p style="margin: 0; ${NOTE_ENCRE}">Au soleil, le discours secondaire en Source Serif 12 px délavé tient 5,51:1 sur vergé — c’est le plancher, pas une habitude.</p><p style="margin: 0; ${NOTE}">Un seul curseur : <span style="font-style: italic;">html[data-grand-texte]</span> multiplie toute l’échelle par 1,2.</p><p style="margin: 0; ${NOTE}">La nuance passe par la couleur sémantique <span style="font-style: italic;">--encre-2</span>, jamais par l’opacité : un texte translucide prend la couleur de la trame qu’il recouvre.</p></div></div>` }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les lettres', defs: LF_DEFS, body, seed: 23 });
}
