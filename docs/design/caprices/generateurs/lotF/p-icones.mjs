// Planche F-VII — Les icônes (SPEC § 6.2-6.3), glyphes d'état, symboles, et le jeu final à copier
import { C, page, entete, section, ts, st, esc, n, LF_DEFS, NOTE, NOTE_ENCRE, SERIF } from './lib.mjs';
import { ICONES, GLYPHES, SYMBOLES, icg, glg, symg } from './traces.mjs';
import { CHEFS, buste } from './chefs.mjs';

function tuile(x, y, taille, grille, zone, trace) {
  const k = taille / grille;
  let s = `<rect x="${x}" y="${y}" width="${taille}" height="${taille}" fill="${C.bru}"/>`;
  const pas = grille === 32 ? 4 : 2;
  let d = '';
  for (let i = pas; i < grille; i += pas) d += `M${n(x + i * k)} ${y}V${y + taille}M${x} ${n(y + i * k)}H${x + taille}`;
  s += `<path d="${d}" stroke="${C.p1}" stroke-width=".4"/>`;
  const m = (grille - zone) / 2;
  s += `<rect x="${n(x + m * k)}" y="${n(y + m * k)}" width="${n(zone * k)}" height="${n(zone * k)}" fill="none" stroke="${C.del}" stroke-width=".6" stroke-dasharray="2 2"/>`;
  s += `<circle cx="${n(x + taille / 2)}" cy="${n(y + taille / 2)}" r="${n((zone / 2) * k)}" fill="none" stroke="${C.p1}" stroke-width=".5"/>`;
  s += `<path d="M${n(x + taille / 2)} ${y}V${y + taille}M${x} ${n(y + taille / 2)}H${x + taille}" stroke="${C.p1}" stroke-width=".5" stroke-dasharray="1 2"/>`;
  s += `<rect x="${x + .5}" y="${y + .5}" width="${taille - 1}" height="${taille - 1}" fill="none" stroke="${C.b900}" stroke-width=".75"/>`;
  return s + trace;
}

function icones() {
  const CW = 137, RH = 86;
  let s = '';
  ICONES.forEach((ic, i) => {
    const x = (i % 11) * CW, y = Math.floor(i / 11) * RH;
    s += tuile(x, y, 60, 24, 20, icg(ic.id, x, y, 60, C.b900));
    // à 24, puis dans sa cible 44
    s += icg(ic.id, x + 68, y, 24, C.b900);
    s += `<rect x="${x + 68.5}" y="${y + 28.5}" width="43" height="43" fill="${C.bru}" stroke="${C.p2}" stroke-width="1"/>` + icg(ic.id, x + 78, y + 38, 24, C.b900);
    s += `<text x="${x}" y="${y + 76 + 0}" ${st({ s: 12, w: 600 })}>${esc(ic.nom)}</text>`;
  });
  return `<svg width="1510" height="${3 * RH - 4}" viewBox="0 0 1510 ${3 * RH - 4}" role="img" aria-label="Les icônes d’interface sur grille 24, à 24 et dans leur cible de 44">${s}</svg>`;
}

function glyphes() {
  let s = '';
  GLYPHES.forEach((g, i) => {
    const x = i * 137;
    s += tuile(x, 0, 40, 16, 16, glg(g.id, x, 0, 40, C.b900));
    s += glg(g.id, x + 50, 2, 16, g.id === 'lacs' ? C.gE : C.b900);
    s += `<text x="${x}" y="58" ${st({ s: 12, w: 600 })}>${esc(g.nom)}</text>`;
  });
  return `<svg width="1510" height="62" viewBox="0 0 1510 62" role="img" aria-label="Glyphes d’état 16 pixels">${s}</svg>`;
}

function symboles() {
  let s = '';
  SYMBOLES.forEach((sy, i) => {
    const x = i * 116;
    const col = sy.camp === 'village' ? C.b900 : C.san;
    s += tuile(x, 0, 64, 32, 28, symg(sy.id, x, 0, 64, col));
    s += symg(sy.id, x + 72, 0, 32, col);
    s += symg(sy.id, x + 72, 40, 16, col, true);
    s += `<text x="${x}" y="80" ${st({ s: 12, w: 700, extra: 'font-variant-numeric="tabular-nums"' })}>${sy.n}</text><text x="${x + 16}" y="80" ${st({ s: 12, c: C.b900 })}>${esc(sy.nom.replace('l’Idiot du village', 'l’Idiot'))}</text>`;
  });
  return `<svg width="1510" height="84" viewBox="0 0 1510 84" role="img" aria-label="Les treize symboles de rôle à 64, 32 et 16">${s}</svg>`;
}

/* ---- le jeu final ---- */
const court = (svg) => svg
  .replace(/(-?\d+\.\d)\d+/g, '$1')
  .replace(/\s*\/>/g, '/>')
  .replace(/stroke="SURENCRE"/g, 'style="stroke:var(--sur-encre,#F5EFE2)"');
export function sprite() {
  const ic = ICONES.map((i) => `<symbol id="ic-${i.id}" viewBox="0 0 24 24">${court(i.svg)}</symbol>`).join('\n');
  const gl = GLYPHES.map((g) => `<symbol id="gl-${g.id}" viewBox="0 0 16 16">${court(g.svg)}</symbol>`).join('\n');
  return { ic, gl };
}
function code() {
  const { ic } = sprite();
  const css = `/* habit/icones.css */
.ic{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.gl{fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}

<!-- emploi -->
<svg class="ic" width="24" height="24" aria-hidden="true"><use href="#ic-menu"/></svg>
<svg class="gl" width="16" height="16" aria-hidden="true"><use href="#gl-sceau"/></svg>

<!-- habit/icones.svg : 33 icônes (grille 24) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${ic.split(String.fromCharCode(10)).join('')}
</svg>
<!-- glyphes d’état (gl-*), symboles (sym-*, sym-*-16) et couvre-chefs (cc-1…cc-18) : dans les defs de ce fichier -->`;
  return `<pre aria-label="Jeu final d’icônes en SVG" style="margin: 0; width: 1520px; height: 664px; overflow: hidden; column-count: 5; column-gap: 24px; column-rule: 0.75px solid ${C.p2}; white-space: pre-wrap; word-break: break-all; font-family: ${SERIF}; font-size: 12px; line-height: 15px; color: ${C.b900}; font-variant-numeric: tabular-nums;">${esc(css)}</pre>`;
}

/** Sprite caché, posé dans les defs de la page : ic-*, gl-*, sym-*, cc-* (copiables depuis la source). */
function spriteDefs() {
  const { ic, gl } = sprite();
  const sym = SYMBOLES.map((s) => `<symbol id="sym-${s.id}" viewBox="0 0 32 32">${s.f('sym-' + s.id, false)}</symbol>\n<symbol id="sym-${s.id}-16" viewBox="0 0 32 32">${s.f('sym-' + s.id + '-16', true)}</symbol>`).join('\n');
  const cc = CHEFS.map((nom, i) => `<!-- siège ${i + 1} : ${nom} -->\n<symbol id="cc-${i + 1}" viewBox="0 0 48 48">${buste(i, { k: '#17130F', p: '#F5EFE2', suf: 'e', mode: 'grav' })}</symbol>`).join('\n');
  return `\n<!-- ===== LOT F : jeu final (icônes, glyphes, symboles de rôle, couvre-chefs) ===== -->\n${ic}\n${gl}\n${sym}\n${cc}\n`;
}

export function build() {
  const body = [
    entete({ num: 'F·VII', titre: 'Les icônes', legende: 'Chaque icône est redessinée au burin.', refs: 'SPEC § 6.2-6.3 · § 13' }),
    section({ x: 40, y: 140, w: 1520, h: 290, lettre: 'A', titre: 'Trente-trois icônes d’interface', note: 'grille 24, zone vive 20 (pointillé), trait 1,5 currentColor, extrémités rondes · au plus une zone de hachure (3 traits de 0,75) · aplat ≤ 30 % · à gauche × 2,5 avec construction, puis à 24 et dans la cible de 44', contenu: icones() }),
    section({ x: 40, y: 440, w: 1520, h: 100, lettre: 'B', titre: 'Glyphes d’état, 16 px', note: 'trait 1,25 · posés sur le jeton aux emplacements fixes (F·IV)', contenu: glyphes() }),
    section({ x: 40, y: 550, w: 1520, h: 124, lettre: 'C', titre: 'Les treize symboles de rôle', note: 'grille 32, zone 28 · village : trait 2, contours fermés, hachure seulement dans les formes ≥ 10 px · meute : masse, morsure dessinée, une seule réserve · puis 32 et 16 simplifié (sans hachure) · à aligner avec le lot C', contenu: symboles() }),
    section({ x: 40, y: 684, w: 1520, h: 700, lettre: 'D', titre: 'Le jeu final, prêt à copier', note: 'les 33 icônes ci-dessous ; glyphes (gl-*), symboles (sym-*, sym-*-16) et couvre-chefs (cc-1 à cc-18) dans les &lt;defs&gt; de ce fichier', contenu: code() }),
  ].join('\n');
  return page({ titre: 'Caprices — F · Les icônes', defs: LF_DEFS + spriteDefs(), body, seed: 71 });
}
