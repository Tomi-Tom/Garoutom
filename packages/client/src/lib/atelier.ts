/**
 * L'atelier sonore de Garoutom (D10) : les voix propres au jeu, synthétisées
 * en WebAudio et branchées sur `bus()` de @tombp/arcade — zéro fichier, zéro
 * requête, et le volume de l'utilisateur pour rien de plus.
 *
 * Même méthode que les quatre bruitages du cadre : le contexte est celui de la
 * collection, chaque son est une petite chaîne oscillateur → enveloppe →
 * filtre → bus, programmée d'un coup avec un temps de départ. Tant que
 * personne n'a touché l'écran il n'y a pas de bus : on ne joue rien, sans
 * erreur. Chaque nœud est libéré (`stop` puis `disconnect`) à la fin de sa
 * source, pour qu'une longue partie ne laisse rien traîner dans le graphe.
 */

import { bus, contexte, lireVolume } from '@tombp/arcade';

/** Un son sous les yeux : le contexte, la sortie, et le départ en secondes. */
interface Scene {
  ctx: AudioContext;
  sortie: GainNode;
  t0: number;
}

/**
 * Ouvre une scène si le bus existe et que le volume n'est pas à zéro. Un son
 * qui échoue (navigateur ancien, contexte fermé) ne doit jamais faire tomber
 * l'écran : la partie se joue aussi en silence.
 */
function jouer(dessiner: (scene: Scene) => void): void {
  try {
    const ctx = contexte();
    const sortie = bus();
    if (!ctx || !sortie) return;
    if (lireVolume() <= 0) return;
    dessiner({ ctx, sortie, t0: ctx.currentTime });
  } catch {
    /* un son raté n'est pas une erreur de jeu */
  }
}

/** Libère la chaîne quand ses sources ont fini (idempotent, chacune s'en charge). */
function liberer(sources: AudioScheduledSourceNode[], noeuds: AudioNode[]): void {
  const tous: AudioNode[] = [...sources, ...noeuds];
  for (const source of sources) {
    source.onended = () => {
      for (const noeud of tous) {
        try {
          noeud.disconnect();
        } catch {
          /* déjà détaché */
        }
      }
    };
  }
}

/** Programme départ et arrêt d'une source. */
function lancer(source: AudioScheduledSourceNode, t0: number, duree: number): void {
  source.start(t0);
  source.stop(t0 + duree + 0.05);
}

/** Une enveloppe : montée exponentielle courte, puis chute jusqu'à `fin`. */
function enveloppe(ctx: AudioContext, t0: number, gain: number, attaque: number, fin: number): GainNode {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + attaque);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + fin);
  return env;
}

interface Partiel {
  freq: number;
  vers?: number;
  duree: number;
  gain: number;
  attaque?: number;
  type?: OscillatorType;
  retard?: number;
}

/** Un partiel isolé : oscillateur → enveloppe → bus. */
function partiel(scene: Scene, p: Partiel): void {
  const { ctx, sortie } = scene;
  const t0 = scene.t0 + (p.retard ?? 0);
  const osc = ctx.createOscillator();
  osc.type = p.type ?? 'sine';
  osc.frequency.setValueAtTime(p.freq, t0);
  if (p.vers) osc.frequency.exponentialRampToValueAtTime(p.vers, t0 + p.duree);
  const env = enveloppe(ctx, t0, p.gain, p.attaque ?? 0.006, p.duree);
  osc.connect(env).connect(sortie);
  liberer([osc], [env]);
  lancer(osc, t0, p.duree);
}

/** Une source de bruit blanc de `duree` secondes, prête à être branchée. */
function bruit(ctx: AudioContext, duree: number): AudioBufferSourceNode {
  const taille = Math.max(1, Math.ceil(ctx.sampleRate * duree));
  const tampon = ctx.createBuffer(1, taille, ctx.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < taille; i += 1) donnees[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  return source;
}

/** Une courbe de saturation douce (tanh) pour le cri du Titan. */
function courbeDouce(force: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const courbe = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    courbe[i] = Math.tanh(x * force);
  }
  return courbe;
}

/** Le hurlement du loup : glissando montant puis descendant, vibrato léger. */
function hurlementLoup(scene: Scene): void {
  const { ctx, sortie, t0 } = scene;
  const duree = 1.6;
  const noeuds: AudioNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];

  const filtre = ctx.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.frequency.setValueAtTime(700, t0);
  filtre.frequency.exponentialRampToValueAtTime(1100, t0 + 0.7);
  filtre.frequency.exponentialRampToValueAtTime(650, t0 + duree);
  filtre.Q.value = 1.6;
  const env = enveloppe(ctx, t0, 0.55, 0.35, duree);
  filtre.connect(env).connect(sortie);
  noeuds.push(filtre, env);

  // Le vibrato : un oscillateur lent qui fait trembler la hauteur.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const profondeur = ctx.createGain();
  profondeur.gain.value = 9;
  lfo.connect(profondeur);
  noeuds.push(profondeur);
  sources.push(lfo);

  // La voix : une dent de scie, et son octave plus faible pour l'étoffe.
  for (const [rapport, niveau] of [
    [1, 0.7],
    [2, 0.22],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330 * rapport, t0);
    osc.frequency.exponentialRampToValueAtTime(640 * rapport, t0 + 0.7);
    osc.frequency.exponentialRampToValueAtTime(430 * rapport, t0 + duree);
    profondeur.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = niveau;
    osc.connect(g).connect(filtre);
    noeuds.push(g);
    sources.push(osc);
  }

  liberer(sources, noeuds);
  for (const source of sources) lancer(source, t0, duree);
}

/** Le cri du Titan : plus grave, du bruit filtré, une distorsion douce. */
function criTitan(scene: Scene): void {
  const { ctx, sortie, t0 } = scene;
  const duree = 1.2;

  const saturation = ctx.createWaveShaper();
  saturation.curve = courbeDouce(3.2);
  const grave = ctx.createBiquadFilter();
  grave.type = 'lowpass';
  grave.frequency.setValueAtTime(1800, t0);
  grave.frequency.exponentialRampToValueAtTime(500, t0 + duree);
  const env = enveloppe(ctx, t0, 0.5, 0.12, duree);
  saturation.connect(grave).connect(env).connect(sortie);

  const voix = ctx.createOscillator();
  voix.type = 'sawtooth';
  voix.frequency.setValueAtTime(62, t0);
  voix.frequency.exponentialRampToValueAtTime(118, t0 + 0.35);
  voix.frequency.exponentialRampToValueAtTime(48, t0 + duree);
  const gv = ctx.createGain();
  gv.gain.value = 0.8;
  voix.connect(gv).connect(saturation);

  const souffle = bruit(ctx, duree);
  const bande = ctx.createBiquadFilter();
  bande.type = 'bandpass';
  bande.frequency.value = 420;
  bande.Q.value = 0.9;
  const gs = ctx.createGain();
  gs.gain.value = 0.55;
  souffle.connect(bande).connect(gs).connect(saturation);

  liberer([voix, souffle], [saturation, grave, env, gv, bande, gs]);
  lancer(voix, t0, duree);
  lancer(souffle, t0, duree);
}

type PartielsDeCloche = readonly (readonly [rapport: number, gain: number, duree: number])[];

/** Un coup de cloche inharmonique : les partiels s'éteignent à des vitesses différentes. */
function coupDeCloche(scene: Scene, fondamentale: number, partiels: PartielsDeCloche, retard = 0): void {
  for (const [rapport, gain, duree] of partiels) {
    partiel(scene, { freq: fondamentale * rapport, duree, gain, attaque: 0.004, retard });
  }
}

const PARTIELS_GLAS: PartielsDeCloche = [
  [1, 0.34, 3.0],
  [2.0, 0.2, 2.4],
  [2.76, 0.13, 1.8],
  [5.4, 0.06, 1.0],
];

const PARTIELS_AUBE: PartielsDeCloche = [
  [1, 0.22, 1.5],
  [2.0, 0.12, 1.1],
  [2.76, 0.07, 0.8],
  [4.1, 0.04, 0.5],
];

export const atelier = {
  /** La nuit tombe : hurlement bref (cri de Titan en skin Shiganshina). */
  hurlement: (skin?: string): void => jouer(skin === 'shiganshina' ? criTitan : hurlementLoup),

  /** L'annonce des morts : le glas, deux partiels graves, deux coups. */
  glas: (): void =>
    jouer((scene) => {
      coupDeCloche(scene, 110, PARTIELS_GLAS);
      coupDeCloche(scene, 110, PARTIELS_GLAS, 1.4);
    }),

  /** Les dix dernières secondes de SA minuterie : un tic discret. */
  tic: (): void =>
    jouer((scene) => {
      partiel(scene, { freq: 1700, duree: 0.025, gain: 0.07, attaque: 0.002, type: 'square' });
    }),

  /** Un vote se pose (le sien) : le « toc » mat d'un pion de bois. */
  vote: (): void =>
    jouer((scene) => {
      partiel(scene, { freq: 240, vers: 130, duree: 0.09, gain: 0.34, attaque: 0.004 });
      partiel(scene, { freq: 520, vers: 300, duree: 0.04, gain: 0.14, attaque: 0.002, type: 'triangle' });
    }),

  /** Le jour se lève : la cloche claire du matin. */
  aube: (): void => jouer((scene) => coupDeCloche(scene, 523, PARTIELS_AUBE)),

  /** Le chasseur tire : un souffle de bruit court et un coup sourd. */
  detonation: (): void =>
    jouer((scene) => {
      const { ctx, sortie, t0 } = scene;
      const duree = 0.22;
      const source = bruit(ctx, duree);
      const passeBas = ctx.createBiquadFilter();
      passeBas.type = 'lowpass';
      passeBas.frequency.setValueAtTime(3200, t0);
      passeBas.frequency.exponentialRampToValueAtTime(300, t0 + duree);
      const env = enveloppe(ctx, t0, 0.5, 0.004, duree);
      source.connect(passeBas).connect(env).connect(sortie);
      liberer([source], [passeBas, env]);
      lancer(source, t0, duree);
      partiel(scene, { freq: 120, vers: 45, duree: 0.2, gain: 0.45, attaque: 0.003 });
    }),

  /**
   * La marque du Corbeau, à l'aube : un croassement court et rauque. Une
   * dent de scie qui glisse vers le bas, hachée par une modulation rapide
   * (le grain de la gorge), et un souffle de bruit filtré dans la même
   * bande — le tout serré dans un passe-bande, environ 0,4 s.
   */
  croassement: (): void =>
    jouer((scene) => {
      const { ctx, sortie, t0 } = scene;
      const duree = 0.4;

      const bande = ctx.createBiquadFilter();
      bande.type = 'bandpass';
      bande.frequency.setValueAtTime(1300, t0);
      bande.frequency.exponentialRampToValueAtTime(800, t0 + duree);
      bande.Q.value = 2.2;
      const env = enveloppe(ctx, t0, 0.42, 0.02, duree);
      bande.connect(env).connect(sortie);

      // La voix : un glissando descendant, de l'aigu éraillé vers le rauque.
      const voix = ctx.createOscillator();
      voix.type = 'sawtooth';
      voix.frequency.setValueAtTime(560, t0);
      voix.frequency.exponentialRampToValueAtTime(330, t0 + duree);
      // Le grain : le volume de la voix tremble à 70 Hz.
      const grain = ctx.createGain();
      grain.gain.value = 0.55;
      const hachoir = ctx.createOscillator();
      hachoir.type = 'square';
      hachoir.frequency.value = 70;
      const profondeur = ctx.createGain();
      profondeur.gain.value = 0.45;
      hachoir.connect(profondeur).connect(grain.gain);
      voix.connect(grain).connect(bande);

      // Le souffle : du bruit dans la même bande, pour l'âpreté.
      const souffle = bruit(ctx, duree);
      const gs = ctx.createGain();
      gs.gain.value = 0.35;
      souffle.connect(gs).connect(bande);

      liberer([voix, hachoir, souffle], [bande, env, grain, profondeur, gs]);
      lancer(voix, t0, duree);
      lancer(hachoir, t0, duree);
      lancer(souffle, t0, duree);
    }),

  /**
   * La grogne du Montreur d'Ours, à l'aube (R108) : un grondement bas et
   * bref. Une dent de scie qui descend au plus grave, hachée par une
   * modulation lente (le roulement de la gorge), un souffle de bruit sourd
   * par-dessus — le tout serré dans un passe-bas, environ 0,55 s. Le silence
   * de la bête, lui, ne sonne pas : il se lit.
   */
  grogne: (): void =>
    jouer((scene) => {
      const { ctx, sortie, t0 } = scene;
      const duree = 0.55;

      const grave = ctx.createBiquadFilter();
      grave.type = 'lowpass';
      grave.frequency.setValueAtTime(420, t0);
      grave.frequency.exponentialRampToValueAtTime(170, t0 + duree);
      const env = enveloppe(ctx, t0, 0.5, 0.04, duree);
      grave.connect(env).connect(sortie);

      // La voix : un râle qui glisse vers le plus grave.
      const voix = ctx.createOscillator();
      voix.type = 'sawtooth';
      voix.frequency.setValueAtTime(130, t0);
      voix.frequency.exponentialRampToValueAtTime(72, t0 + duree);
      // Le grain : le volume tremble lentement, comme la gorge qui roule.
      const grain = ctx.createGain();
      grain.gain.value = 0.6;
      const hachoir = ctx.createOscillator();
      hachoir.type = 'square';
      hachoir.frequency.value = 27;
      const profondeur = ctx.createGain();
      profondeur.gain.value = 0.4;
      hachoir.connect(profondeur).connect(grain.gain);
      voix.connect(grain).connect(grave);

      // Le souffle : du bruit sourd par-dessus, pour l'étoffe du pelage.
      const souffle = bruit(ctx, duree);
      const passeBas = ctx.createBiquadFilter();
      passeBas.type = 'lowpass';
      passeBas.frequency.value = 300;
      const gs = ctx.createGain();
      gs.gain.value = 0.4;
      souffle.connect(passeBas).connect(gs).connect(grave);

      liberer([voix, hachoir, souffle], [grave, env, grain, profondeur, passeBas, gs]);
      lancer(voix, t0, duree);
      lancer(hachoir, t0, duree);
      lancer(souffle, t0, duree);
    }),
};
