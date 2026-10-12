// Écrit les planches du lot F dans canevas/project/ (une par une).
import { writeFileSync } from 'node:fs';
import { fermer } from './lib.mjs';

const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project/';
const PLANCHES = {
  Encres: './p-encres.mjs', Lettres: './p-lettres.mjs', Matieres: './p-matieres.mjs', Jeton: './p-jeton.mjs',
  Commandes: './p-commandes.mjs', Voix: './p-voix.mjs', Icones: './p-icones.mjs',
};

function verifier(nom, html) {
  // équilibre des balises (hors éléments vides HTML)
  const vides = new Set(['meta', 'link', 'input', 'br', 'img', 'hr', '!doctype']);
  const pile = [];
  const re = /<(\/?)([a-zA-Z!][\w:-]*)([^<>]*?)(\/?)>/g;
  let m, err = 0;
  const sansScript = html.replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '').replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(sansScript))) {
    const [, ferme, tag0, , auto] = m; const tag = tag0.toLowerCase();
    if (vides.has(tag) || auto) { if (auto) { console.log(nom, 'auto-fermant restant', m[0].slice(0, 60)); err++; } continue; }
    if (!ferme) pile.push(tag);
    else { const t = pile.pop(); if (t !== tag) { console.log(nom, 'déséquilibre', t, '≠', tag, 'à', m.index); err++; if (err > 5) break; } }
  }
  if (pile.length) console.log(nom, 'non fermés', pile.slice(-5));
  if (/NaN|undefined/.test(sansScript)) console.log(nom, 'contient NaN/undefined', sansScript.match(/.{60}(NaN|undefined).{20}/)?.[0]);
  return err;
}

const choix = process.argv.slice(2);
for (const [nom, mod] of Object.entries(PLANCHES)) {
  if (choix.length && !choix.includes(nom)) continue;
  const { build } = await import(mod);
  const html = fermer(build());
  verifier(nom, html);
  writeFileSync(`${OUT}Caprices-F-${nom}.dc.html`, html, 'utf8');
  console.log(`Caprices-F-${nom}.dc.html`, (html.length / 1024).toFixed(0), 'Ko');
}
