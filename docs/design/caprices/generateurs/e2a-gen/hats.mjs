// Les dix-huit couvre-chefs des Caprichos (§ 5.1.2), boîte 48 × 48, tête en (24, 23) r 8.
// Eau-forte du village : le couvre-chef est au trait net, jamais mordu.
// [chemins pleins, traits] — les traits clairs (spires, ruban) sont « réservés » dans l'aplat.
const H = {
  1: { nom: 'tricorne', plein: 'M8 17.5 L24 8.5 L40 17.5 L34 19.6 C29 16.4 19 16.4 14 19.6 Z' },
  2: { nom: 'mantille', plein: 'M16.5 15.5 C16 9 19 3.5 24 2.5 C29 3.5 32 9 31.5 15.5 C28 14 20 14 16.5 15.5 Z',
       trait: 'M15.6 17 C13.6 24 12.2 30 9.6 37 M32.4 17 C34.4 24 35.8 30 38.4 37', reserve: 'M20 12 L21 5.5 M24 12 V4 M28 12 L27 5.5' },
  3: { nom: 'bonnet de nuit', plein: 'M15.2 19 C14.4 10.5 21 7 27 8 C33 9 37.5 14 38.6 23.5 L36 22.8 C34.6 18.6 32 15.6 28.6 15.2 C24 14.8 19.6 16.2 15.2 19 Z',
       disque: [38.2, 26.6, 2.6] },
  4: { nom: 'coroza', plein: 'M17.6 17.2 L23.4 0.8 L24.6 0.8 L30.4 17.2 C27 16 21 16 17.6 17.2 Z' },
  5: { nom: 'chambergo', plein: 'M3.5 18.2 C10 14.6 38 14.6 44.5 18.2 C38 20.4 10 20.4 3.5 18.2 Z M17 16.4 C16.8 11 19.6 8.6 24 8.6 C28.4 8.6 31.2 11 31 16.4 Z' },
  6: { nom: 'montera', plein: 'M13.4 20.8 C11 14.8 13.6 9.6 19 10.6 C21 8.8 27 8.8 29 10.6 C34.4 9.6 37 14.8 34.6 20.8 C31.4 17 16.6 17 13.4 20.8 Z', disque: [24, 8.4, 3.2] },
  7: { nom: 'capuche', plein: 'M12.5 34 C11.4 22 15 12 23.6 2.6 C33 12 36.6 22 35.5 34 L31.2 34 C31.6 24.6 29 17.6 24 16.4 C19 17.6 16.4 24.6 16.8 34 Z' },
  8: { nom: 'cofia', plein: 'M14.6 20.6 C14 11.2 34 11.2 33.4 20.6 Q32 22.6 30.6 20.8 Q29 23 27.4 20.8 Q25.8 23 24 20.8 Q22.2 23 20.6 20.8 Q19 23 17.4 20.8 Q16 22.6 14.6 20.6 Z',
       reserve: 'M17 15.6 C21 13.6 27 13.6 31 15.6' },
  9: { nom: 'bicorne', plein: 'M5.5 17.4 C11 6.4 37 6.4 42.5 17.4 C35 12.6 13 12.6 5.5 17.4 Z' },
  10: { nom: 'turban', plein: 'M13.6 20 C11.6 9.6 36.4 9.6 34.4 20 C28 17.6 20 17.6 13.6 20 Z', reserve: 'M16 17.2 C20 12.4 29 12.6 32 16.6 M18.4 13.6 C22 10.8 27.4 11 29.8 13.6' },
  11: { nom: 'boina', plein: 'M12.6 17.4 C13.2 11.4 26 9.8 36 12.4 C39.6 13.4 39.2 16.6 35.6 17 C28 18 19 18.4 12.6 17.4 Z M23.4 10.2 L24.4 7.6 L25.6 10.2 Z' },
  12: { nom: 'catogan', plein: 'M15.6 18.6 C15.6 12 32.4 12 32.4 18.6 C28 16.6 20 16.6 15.6 18.6 Z M31.6 30.6 L37.4 27 L36.6 34.4 Z',
        disque2: [[14.6, 22.4, 3.2], [14.6, 28, 2.6], [33.4, 22.4, 3.2], [33.4, 28, 2.6]] },
  13: { nom: 'haut-de-forme', plein: 'M18.4 16 L15.6 1.6 L32.4 1.6 L29.6 16 Z M13 16 H35 V18.6 H13 Z', reserve: 'M17.6 12.6 H30.4' },
  14: { nom: 'fichu', trait3: 'M14.8 26.6 C12.6 11.6 35.4 11.6 33.2 26.6', trait: 'M22.6 31.2 L18.6 37.6 M25.4 31.2 L29.6 37.4', disque: [24, 31, 1.9] },
  15: { nom: 'calotte', plein: 'M18.4 16.4 C18.4 10.6 29.6 10.6 29.6 16.4 C26 15.4 22 15.4 18.4 16.4 Z' },
  16: { nom: 'cornette', plein: 'M23 15.6 L6 5 L12.4 19.2 Z M25 15.6 L42 5 L35.6 19.2 Z M15.6 16.6 H32.4 V19.4 H15.6 Z' },
  17: { nom: 'paille', plein: 'M4.6 18.4 L7 16.4 L9 18 L11.6 15.8 L14 17.4 L16.6 15.4 H31.4 L34 17.4 L36.4 15.8 L39 18 L41 16.4 L43.4 18.4 L40.6 19.6 L37.4 19 L34 20.2 H14 L10.6 19 L7.4 19.6 Z M17 16 C16.8 10 19.6 7.6 24 7.6 C28.4 7.6 31.2 10 31 16 Z',
        reserve: 'M17.2 13.6 H30.8' },
  18: { nom: 'plumet', plein: 'M9.6 18.6 C14 15.6 30 15 36.6 14.6 L38.4 8.6 C35 12 30 12.6 24 12 C19 11.6 16 13 15.4 16.2 Z', trait: 'M31 11.4 C33 5.4 37 7.6 38.6 3.4 C39.6 1 42 0.8 43 2.4' },
};
export const nomCouvreChef = (siege) => H[siege].nom;

/** Buste à couvre-chef, dans une boîte 48. mode 'vif' (eau-forte hachurée) | 'mort' (bruni : contour palier-1). */
export function buste(siege, mode, T) {
  const h = H[siege];
  const enc = T.encre, hx = T.h;
  if (mode === 'mort') {
    const c = T.silhouette;
    let s = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48" fill="none" stroke="${c}" stroke-width="1"></path><circle cx="24" cy="23" r="8" fill="none" stroke="${c}" stroke-width="1"></circle>`;
    if (h.plein) s += `<path d="${h.plein}" fill="none" stroke="${c}" stroke-width="1"></path>`;
    if (h.trait) s += `<path d="${h.trait}" fill="none" stroke="${c}" stroke-width="1"></path>`;
    if (h.trait3) s += `<path d="${h.trait3}" fill="none" stroke="${c}" stroke-width="1.6"></path>`;
    if (h.disque) s += `<circle cx="${h.disque[0]}" cy="${h.disque[1]}" r="${h.disque[2]}" fill="none" stroke="${c}" stroke-width="1"></circle>`;
    if (h.disque2) s += h.disque2.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="1"></circle>`).join('');
    return s;
  }
  let s = `<path d="M8 48 C9 36 16 31 24 31 C32 31 39 36 40 48 Z" fill="url(#hach-2-${hx})" stroke="${enc}" stroke-width="1"></path>`;
  s += `<circle cx="24" cy="23" r="8" fill="${T.surface}" stroke="${enc}" stroke-width="1"></circle><path d="M18.4 26.4 A7 7 0 0 0 24.6 30" fill="none" stroke="${enc}" stroke-width="0.6"></path><path d="M17.6 23.6 A6.8 6.8 0 0 0 19 27.6" fill="none" stroke="${enc}" stroke-width="0.6"></path>`;
  if (h.plein) s += `<path d="${h.plein}" fill="${enc}" fill-rule="nonzero"></path>`;
  if (h.trait) s += `<path d="${h.trait}" fill="none" stroke="${enc}" stroke-width="1.5" stroke-linecap="round"></path>`;
  if (h.trait3) s += `<path d="${h.trait3}" fill="none" stroke="${enc}" stroke-width="3.2" stroke-linecap="round"></path>`;
  if (h.disque) s += `<circle cx="${h.disque[0]}" cy="${h.disque[1]}" r="${h.disque[2]}" fill="${enc}"></circle>`;
  if (h.disque2) s += h.disque2.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${enc}"></circle>`).join('');
  if (h.reserve) s += `<path d="${h.reserve}" fill="none" stroke="${T.surface}" stroke-width="0.9" stroke-linecap="round"></path>`;
  return s;
}
