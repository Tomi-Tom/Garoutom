import { writeFileSync } from 'node:fs';
import { faces1, faces2, formats, vignettesPlanche } from './planches.mjs';
import { shiganshina } from './shig.mjs';
import { giletsjaunes } from './giletsjaunes.mjs';
import { farwest } from './farwest.mjs';
import { pirates } from './pirates.mjs';
import * as E from './ecrans.mjs';

const OUT = 'C:/Users/tomp6/AppData/Local/Temp/claude/C--WINDOWS-system32/7f0c4639-b273-4269-9c8e-411b1d64c068/scratchpad/canevas/project/';
const jobs = {
  'Caprices-C-Faces-1': faces1, 'Caprices-C-Faces-2': faces2, 'Caprices-C-Formats': formats,
  'Caprices-C-Vignettes': vignettesPlanche, 'Caprices-C-Shiganshina': shiganshina, 'Caprices-C-GiletsJaunes': giletsjaunes,
  'Caprices-C-FarWest': farwest,
  'Caprices-C-Pirates': pirates,
  'Caprices-C-Revelation-Dos': E.revDos, 'Caprices-C-Revelation-Appui': E.revAppui, 'Caprices-C-Revelation-Loup': E.revLoup,
  'Caprices-C-Revelation-Pret': E.revPret, 'Caprices-C-Revelation-Spectateur': E.revSpect,
  'Caprices-C-MaCarte-Jour': E.maCarteJour, 'Caprices-C-MaCarte-Nuit': E.maCarteNuit,
  'Caprices-C-Fin-Verdict': E.finVerdict, 'Caprices-C-Fin-Distribution': E.finDistribution,
  'Caprices-C-Fin-NuitRacontee': E.finNuitRacontee, 'Caprices-C-Fin-Planche': E.finPlanche,
  'Caprices-C-Revelation-Desktop': E.revDesktop, 'Caprices-C-Fin-Desktop': E.finDesktop,
};
const only = process.argv[2];
for (const [nom, fn] of Object.entries(jobs)) {
  if (only && !nom.includes(only)) continue;
  const html = fn();
  // contrôles : ids uniques, pas de balise auto-fermante, pas de data: URI
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  const selfc = (html.match(/<[a-zA-Z][^<>]*\/>/g) || []).length;
  const refs = [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]).filter((r) => !ids.includes(r));
  writeFileSync(OUT + nom + '.dc.html', html);
  console.log(nom, (html.length / 1024).toFixed(0) + ' Ko', dup.length ? 'DOUBLONS ' + [...new Set(dup)].slice(0, 5) : '', selfc ? 'AUTOFERM ' + selfc : '', refs.length ? 'REFS ' + [...new Set(refs)] : '', html.includes('data:') ? 'DATA-URI' : '');
}
