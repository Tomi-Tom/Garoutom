/**
 * Le narrateur : la chronique de la partie, dans la voix du skin.
 *
 * Il ne dit que ce que les évènements disent (R87) — et les évènements partent
 * à tous, ils ne portent donc jamais un secret. La mécanique (`GameEvent`) est
 * au moteur ; la phrase est au skin (`narrateur` de la peau, `phraseMort`,
 * `phraseFin`…). Le narrateur ne commente pas, n'invente pas, ne compte pas
 * ce qu'il ne voit pas.
 *
 * Deux surfaces :
 *
 * - **le crieur** (SPEC § 5.8) : une zone fixe de 56 px sous l'en-tête — la
 *   rubrique de l'heure (« Aube 2 ») en tête de ligne, puis la dernière
 *   annonce, deux lignes au plus ; elle « s'écrit » un mot toutes les 40 ms
 *   (1,2 s au plus), une mort se précède de la chandelle soufflée, et un
 *   toucher ouvre le registre. Quand il n'a rien à dire, le graveur y pose
 *   sa légende du moment. La dernière annonce : les évènements arrivés
 *   ensemble, ceux d'une même action ou d'une même clôture. Une simple
 *   bascule d'étape de nuit (« la nuit se poursuit ») ne le remplace pas :
 *   elle n'apprend rien, et l'annonce qu'elle chasserait — le vote du soir —
 *   est celle qu'on veut encore lire. Les phrases d'heure (« le jour se
 *   lève ») se taisent dès qu'il y a une nouvelle : la frise dit l'heure ; la
 *   nuit, elles se taisent toujours ;
 * - **le registre** (`Registre.tsx`, la feuille basse du § 5.9) : tout ce
 *   qui a été crié depuis le début de la partie, par nuit et par jour.
 *
 * Chaque annonce part une fois, et une seule, à la région vocale de
 * l'application (`annoncer`) : un lecteur d'écran entend l'aube comme les
 * autres la lisent.
 *
 * Deux cas venus de la robustesse (D18, D22) :
 *
 * - **la reprise** : les évènements manqués pendant une absence arrivent
 *   rejoués (`rejoue`). Le journal les range à leur heure, comme les autres ;
 *   le crieur, lui, ne les rejoue pas un à un — il les **résume** sous
 *   « Pendant votre absence », sans phrases d'heure, sans animation, en
 *   gardant les dernières nouvelles ;
 * - **la mort d'abandon** : un siège parti depuis trop longtemps meurt à la
 *   clôture d'une échéance. Son évènement `morts` précède, dans le lot de
 *   cette clôture, l'évènement `phase` qui ouvre l'heure suivante : il reste
 *   donc dans le chapitre de l'heure qui s'achève — la nuit s'il tombe à la
 *   fin d'une étape de nuit, le jour s'il tombe au vote. La phrase est celle
 *   du skin (`morts.abandon`), qui ne dit jamais pourquoi.
 */

import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import type { GameEvent, PhaseKind } from '@garoutom/engine';

import { CRIEUR } from '../../anim/tokens.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { useStore, type EvenementRecu } from '../../lib/store.js';
import { peauDuSkin, resoudre, type CleLegendeEcran, type Skin, type Voix } from '../../skins/registre.js';
import { Icone } from '../habit/Icone.js';
import { Registre } from './Registre.js';

/** Le ton d'une ligne : la teinte de son liseré. */
type Ton = 'lune' | 'sang' | 'lanterne';

/** Une ligne du narrateur, prête à l'écran. */
export interface Ligne {
  cle: string;
  texte: string;
  ton: Ton;
  /** Le mini-dépouillement d'un vote : une voix comptée par siège. */
  depouillement?: { seat: number; nom: string; voix: number }[];
  /** Une phrase d'heure (« la nuit tombe », « le jour se lève ») : le décor, pas la nouvelle. */
  heure?: true;
}

/** Ce que le crieur garde d'un premier montage : les derniers évènements, pas toute la partie. */
const LOT_INITIAL = 4;

/**
 * Le plus haut identifiant d'évènement déjà confié à la région vocale. Il vit
 * hors du composant : un écran qui se remonte (reconnexion, retour d'onglet)
 * ne doit pas relire à voix haute ce qui a déjà été dit.
 */
let dernierAnnonce = 0;

/**
 * Une phrase de skin, ses variables résolues. Une variable que l'évènement ne
 * fournit pas disparaît plutôt que de s'afficher entre accolades (SKINS.md,
 * « Les variables » : jamais une accolade ne s'affiche).
 */
export function dire(phrase: string, variables: Record<string, string> = {}): string {
  return resoudre(phrase, variables)
    .replace(/\{[a-z]+\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Une liste de pseudos, à la française : « A », « A et B », « A, B et C ».
 * C'est la valeur de `{noms}` — les votants désignés par le Bouc (R94).
 */
export function listeDeNoms(noms: readonly string[]): string {
  if (noms.length <= 1) return noms[0] ?? '';
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1] ?? ''}`;
}

/** Les lignes que raconte un évènement. Certaines n'en racontent aucune. */
export function raconter(
  recu: EvenementRecu,
  voix: Voix,
  peau: Skin,
  nom: (seat: number) => string,
): Ligne[] {
  const { event, id } = recu;
  const cle = String(id);
  const n = peau.narrateur;
  switch (event.type) {
    case 'debut':
      return [{ cle, texte: dire(n.debut), ton: 'lune' }];
    case 'phase':
      return [
        { cle, texte: phraseDePhase(event, voix, peau), ton: event.phase === 'nuit' ? 'lune' : 'lanterne', heure: true },
      ];
    case 'morts':
      return event.deaths.map((mort, rang) => ({
        cle: `${cle}-${String(rang)}`,
        texte: dire(voix.phraseMort(mort.cause, nom(mort.seat), mort.role)),
        ton: 'sang' as const,
      }));
    case 'aube-paisible':
      return [{ cle, texte: dire(voix.phraseAubePaisible()), ton: 'lanterne' }];
    case 'grace':
      return [
        {
          cle,
          texte: dire(n.grace, { nom: nom(event.seat), role: voix.nomRole('idiot') }),
          ton: 'lanterne',
        },
      ];
    case 'vote': {
      const texte =
        event.executed === null ? dire(n.vote.personne) : dire(n.vote.condamne, { nom: nom(event.executed) });
      const depouillement = Object.entries(event.tally)
        .map(([siege, voixComptees]) => ({ seat: Number(siege), nom: nom(Number(siege)), voix: voixComptees }))
        .filter((ligne) => ligne.voix > 0)
        .sort((a, b) => b.voix - a.voix || a.seat - b.seat);
      return [{ cle, texte, ton: event.executed === null ? 'lune' : 'sang', depouillement }];
    }
    case 'capitaine':
      return [
        {
          cle,
          texte:
            event.from === null
              ? dire(n.capitaine.elu, { nom: nom(event.seat) })
              : dire(n.capitaine.successeur, { nom: nom(event.seat), ancien: nom(event.from) }),
          ton: 'lanterne',
        },
      ];
    case 'tir':
      return [
        {
          cle,
          texte:
            event.target === null
              ? dire(n.tir.enLair, { nom: nom(event.hunter) })
              : dire(n.tir.atteint, { cible: nom(event.target), nom: nom(event.hunter) }),
          ton: event.target === null ? 'lune' : 'sang',
        },
      ];
    case 'rancune':
      // La carte de l'Ancien se retourne, les pouvoirs du village s'éteignent (R92).
      return [{ cle, texte: dire(n.rancune, { nom: nom(event.seat), role: voix.nomRole('ancien') }), ton: 'sang' }];
    case 'corbeau':
      // La marque, jamais la main : l'évènement ne porte que la cible (R93).
      return [{ cle, texte: dire(n.corbeau, { nom: nom(event.target) }), ton: 'lune' }];
    case 'bouc':
      return [{ cle, texte: dire(n.bouc, { nom: nom(event.seat), role: voix.nomRole('bouc') }), ton: 'sang' }];
    case 'votants':
      return [
        {
          cle,
          texte:
            event.seats === null
              ? dire(n.votants.personne, { nom: nom(event.bouc) })
              : dire(n.votants.designes, { noms: listeDeNoms(event.seats.map(nom)), nom: nom(event.bouc) }),
          ton: 'lanterne',
        },
      ];
    case 'fin':
      return [{ cle, texte: dire(voix.phraseFin(event.winner)), ton: 'lanterne' }];
  }
}

function phraseDePhase(event: Extract<GameEvent, { type: 'phase' }>, voix: Voix, peau: Skin): string {
  const phases = peau.narrateur.phases;
  switch (event.phase) {
    case 'nuit':
      // Les étapes du Loup Blanc et de la Sorcière ont leur phrase (plate, par
      // choix du skin) ; l'étape principale est la nuit qui tombe.
      return dire(
        event.step === 'sorciere' || event.step === 'loupBlanc'
          ? phases.nuit[event.step]
          : voix.phraseNuitQuiTombe(event.day),
      );
    case 'revelation':
      return dire(phases.revelation);
    case 'chasseur':
      return dire(phases.chasseur);
    case 'succession':
      return dire(phases.succession);
    case 'bouc':
      return dire(phases.bouc);
    case 'election':
      return dire(phases.election);
    case 'jour':
      return dire(phases.jour);
    case 'fin':
      return dire(phases.fin);
  }
}

/** Un chapitre du journal : une nuit ou un jour. */
export interface Chapitre {
  cle: string;
  /** L'heure du chapitre — `nuit-2`, `jour-3` — pour savoir s'il faut en ouvrir un autre. */
  heure: string;
  titre: string;
  lignes: Ligne[];
  /** Les évènements du chapitre. */
  ids: number[];
}

/**
 * La chronique découpée en nuits et en jours. La partie s'ouvre sur la nuit 1
 * (la révélation la précède), et chaque évènement `phase` ouvre le chapitre
 * de son heure : les morts de l'aube restent ainsi dans la nuit qui les a
 * faits, le dépouillement dans le jour qui l'a voté.
 */
export function chapitres(chronique: readonly EvenementRecu[], voix: Voix, peau: Skin, nom: (seat: number) => string): Chapitre[] {
  const resultat: Chapitre[] = [];
  for (const recu of chronique) {
    const event = recu.event;
    let ouverture: { heure: 'nuit' | 'jour'; numero: number } | null = null;
    if (event.type === 'phase' && event.phase !== 'fin') {
      const heure = event.phase === 'nuit' || event.phase === 'revelation' ? 'nuit' : 'jour';
      ouverture = { heure, numero: event.day };
    } else if (resultat.length === 0) {
      // Le début de partie est toujours de la nuit 1, même reçu dans le même
      // lot qu'un jour plus avancé (reconnexion) : `recu.day` est le jour de la
      // vue qui l'a apporté, pas le sien.
      ouverture = { heure: 'nuit', numero: event.type === 'debut' ? 1 : Math.max(1, recu.day) };
    }
    if (ouverture !== null) {
      const heure = `${ouverture.heure}-${String(ouverture.numero)}`;
      if (resultat[resultat.length - 1]?.heure !== heure) {
        const titre = dire(peau.recit[ouverture.heure], { n: String(ouverture.numero) });
        // Le rang rend la clé unique, même si une même heure revenait plus loin.
        resultat.push({ cle: `${heure}-${String(resultat.length)}`, heure, titre, lignes: [], ids: [] });
      }
    }
    resultat[resultat.length - 1]?.lignes.push(...raconter(recu, voix, peau, nom));
    resultat[resultat.length - 1]?.ids.push(recu.id);
  }
  return resultat;
}

/**
 * Une bascule d'étape : la nuit passe la main à l'étape suivante (le Loup
 * Blanc ou la Sorcière, seuls en scène). Elle ne raconte rien de neuf — elle
 * va au journal, jamais au crieur.
 */
export function estBascule(event: GameEvent): boolean {
  return event.type === 'phase' && event.phase === 'nuit' && event.step !== undefined && event.step !== 'principale';
}

/**
 * Un lot du crieur, repéré par son dernier évènement. Les bascules d'étape
 * n'en font pas partie. `resume` : le lot n'est fait que d'évènements rejoués
 * à la reprise — le crieur le résume au lieu de le crier.
 */
interface Lot {
  cle: number;
  ids: number[];
  resume: boolean;
}

function lotDe(recus: readonly EvenementRecu[]): Lot | null {
  const crie = recus.filter((recu) => !estBascule(recu.event));
  const dernier = crie[crie.length - 1];
  if (dernier === undefined) return null;
  return { cle: dernier.id, ids: crie.map((recu) => recu.id), resume: crie.every((recu) => recu.rejoue === true) };
}

/** Ce que le résumé d'une absence garde : les dernières nouvelles, pas toute la nuit. */
export const MAX_RESUME = 5;

/** L'intitulé du résumé des évènements manqués. */
export const PENDANT_ABSENCE = 'Pendant votre absence';

/**
 * Le résumé d'évènements rejoués : sans les phrases d'heure (le décor les
 * dit), les dernières nouvelles seulement.
 */
export function resumer(lignes: readonly Ligne[]): Ligne[] {
  return lignes.filter((ligne) => ligne.heure !== true).slice(-MAX_RESUME);
}


/** La légende du graveur quand le crieur n'a rien à dire : celle du moment (§ 6.4). */
export function cleLegendeDuMoment(phase: PhaseKind | undefined): CleLegendeEcran {
  switch (phase) {
    case 'revelation':
      return 'revelation';
    case 'election':
      return 'election';
    case 'jour':
      return 'vote';
    case 'chasseur':
      return 'chasseurAttente';
    case 'succession':
      return 'succession';
    case 'bouc':
      return 'boucDernierMot';
    case 'fin':
      return 'fin';
    default:
      // La nuit, le frontispice : « Le sommeil de la raison engendre des loups. »
      return 'accueil';
  }
}

/**
 * La rubrique du lot : « Pendant votre absence » pour un résumé ; « Aube 2 »
 * quand l'aube crie ses morts (ou sa paix) ; sinon le titre de l'heure où
 * l'annonce s'est faite — le vote du soir reste « Jour 1 » pendant la nuit 2.
 */
function rubriqueDuLot(
  lot: Lot,
  chronique: readonly EvenementRecu[],
  premiere: number | undefined,
  voix: Voix,
  peau: Skin,
  nom: (seat: number) => string,
): string {
  if (lot.resume) return PENDANT_ABSENCE;
  // L'aube : la première ligne dite est une mort (ou la paix) que suit, dans
  // le même lot, le lever du jour.
  const recus = chronique.filter((recu) => lot.ids.includes(recu.id));
  const rangPremier = recus.findIndex((recu) => recu.id === premiere);
  const premier = recus[rangPremier]?.event;
  const lever = recus
    .slice(rangPremier + 1)
    .map((recu) => recu.event)
    .find(
      (event): event is Extract<GameEvent, { type: 'phase' }> =>
        event.type === 'phase' && (event.phase === 'jour' || event.phase === 'election'),
    );
  if (lever !== undefined && (premier?.type === 'morts' || premier?.type === 'aube-paisible')) {
    return `Aube ${String(lever.day)}`;
  }
  const chapitre = chapitres(chronique, voix, peau, nom).find((c) => premiere !== undefined && c.ids.includes(premiere));
  return chapitre?.titre ?? '';
}

/** Une phrase d'heure qui ouvre une scène (le Chasseur, la succession, le Bouc, l'élection). */
function estScene(event: GameEvent): boolean {
  return (
    event.type === 'phase' &&
    (event.phase === 'chasseur' || event.phase === 'succession' || event.phase === 'bouc' || event.phase === 'election')
  );
}

/** Les mots qui « s'écrivent » : un toutes les 40 ms, 1,2 s au plus ; d'un coup si l'on demande le calme. */
function useEcriture(cle: number, mots: number, immediat: boolean): [number, () => void] {
  const [ecrits, setEcrits] = useState<{ cle: number; n: number }>({ cle, n: immediat ? mots : 0 });
  const courant = immediat ? mots : ecrits.cle === cle ? ecrits.n : 0;
  if (ecrits.cle !== cle) setEcrits({ cle, n: courant });
  useEffect(() => {
    if (immediat || mots === 0) return;
    const pas = Math.max(8, Math.min(CRIEUR.motMs, Math.floor(CRIEUR.maxMs / mots)));
    const minuteur = setInterval(() => {
      setEcrits((avant) => {
        const n = Math.min(mots, (avant.cle === cle ? avant.n : 0) + 1);
        if (n >= mots) clearInterval(minuteur);
        return { cle, n };
      });
    }, pas);
    return () => clearInterval(minuteur);
  }, [cle, mots, immediat]);
  return [courant, () => setEcrits({ cle, n: mots })];
}

export function Narrateur({ className = '', uneLigne = false }: { className?: string; uneLigne?: boolean }) {
  const chronique = useStore((state) => state.chronique);
  const phase = useGame()?.phase;
  const nuit = phase === 'nuit';
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();
  const calme = useReducedMotion() === true;
  const [registre, setRegistre] = useState(false);

  /*
    Le lot du crieur : les évènements arrivés ensemble. On retient
    l'identifiant du dernier évènement vu ; tout ce qui le dépasse au rendu
    suivant forme le nouveau lot — sauf s'il ne contient qu'une bascule
    d'étape, auquel cas l'annonce d'avant reste affichée. Au premier montage,
    on ne reprend que la queue de la chronique — le crieur annonce, il ne
    récite pas. Le lot se déduit pendant le rendu, pas dans un effet.
  */
  const dernierId = chronique[chronique.length - 1]?.id ?? 0;
  const [crieur, setCrieur] = useState<{ vu: number; lot: Lot | null }>(() => ({
    vu: dernierId,
    lot: lotDe(chronique.filter((recu) => !estBascule(recu.event)).slice(-LOT_INITIAL)),
  }));
  if (dernierId !== crieur.vu) {
    const nouveau = dernierId === 0 ? null : lotDe(chronique.filter((recu) => recu.id > crieur.vu));
    setCrieur({ vu: dernierId, lot: dernierId === 0 ? null : (nouveau ?? crieur.lot) });
  }
  const lot = crieur.lot;

  useEffect(() => {
    // La région vocale : une fois par évènement, jamais deux.
    const inedits = chronique.filter((recu) => recu.id > dernierAnnonce);
    const aDire = dernierAnnonce === 0 ? inedits.slice(-LOT_INITIAL) : inedits;
    if (aDire.length > 0) {
      dernierAnnonce = Math.max(...aDire.map((recu) => recu.id));
      const rejoues = resumer(
        aDire.filter((recu) => recu.rejoue === true).flatMap((recu) => raconter(recu, voix, peau, nom)),
      ).map((ligne) => ligne.texte);
      const neufs = aDire
        .filter((recu) => recu.rejoue !== true)
        .flatMap((recu) => raconter(recu, voix, peau, nom))
        .map((ligne) => ligne.texte);
      const texte = [...(rejoues.length > 0 ? [`${PENDANT_ABSENCE} :`, ...rejoues] : []), ...neufs].join(' ');
      if (texte !== '') useStore.getState().annoncer(texte);
    }
  }, [chronique, voix, peau, nom]);

  const { lignes, premiere } = useMemo(() => {
    if (lot === null) return { lignes: [] as Ligne[], premiere: undefined };
    const recus = chronique.filter((recu) => lot.ids.includes(recu.id));
    const toutes = recus.flatMap((recu) =>
      raconter(recu, voix, peau, nom).map((ligne) => ({
        ligne,
        id: recu.id,
        scene: estScene(recu.event),
        devant: estScene(recu.event) && !(recu.event.type === 'phase' && recu.event.phase === 'election'),
      })),
    );
    // Les phrases d'heure nues (« le jour se lève », « la nuit tombe ») se
    // taisent la nuit, et le jour dès qu'il y a une nouvelle : la frise dit
    // l'heure. Celles qui ouvrent une scène (le Chasseur, la succession, le
    // Bouc, l'élection) parlent, et en premier : c'est ce qu'on attend.
    const nouvelles = toutes.filter(({ ligne, scene }) => ligne.heure !== true || (scene && !nuit));
    const choisies = lot.resume
      ? toutes.filter(({ ligne }) => ligne.heure !== true).slice(-MAX_RESUME)
      : nuit
        ? toutes.filter(({ ligne }) => ligne.heure !== true)
        : nouvelles.length > 0
          ? [...nouvelles.filter(({ devant }) => devant), ...nouvelles.filter(({ devant }) => !devant)]
          : toutes;
    return { lignes: choisies.map(({ ligne }) => ligne), premiere: choisies[0]?.id };
  }, [lot, chronique, voix, peau, nom, nuit]);

  const rubrique = lot === null || lignes.length === 0 ? '' : rubriqueDuLot(lot, chronique, premiere, voix, peau, nom);
  const mots = lignes.map((ligne) => ligne.texte.split(/\s+/).filter((mot) => mot !== ''));
  const total = mots.reduce((somme, liste) => somme + liste.length, 0);
  const [ecrits, toutEcrire] = useEcriture(lot?.cle ?? 0, total, calme || lot?.resume === true);

  let rang = 0;
  const vide = lignes.length === 0;
  const lignesMax = uneLigne ? 'line-clamp-1' : 'line-clamp-2 max-[359px]:line-clamp-1';

  return (
    <section
      aria-label="Le narrateur"
      data-testid="narrateur"
      data-discret={nuit ? '' : undefined}
      className={`h-full ${className}`}
    >
      <button
        type="button"
        aria-label="Le crieur — ouvrir le registre"
        aria-haspopup="dialog"
        onClick={() => {
          toutEcrire();
          setRegistre(true);
        }}
        className="box-border flex h-full w-full cursor-pointer items-center border-0 border-y border-solid border-[var(--filet-doux)] bg-transparent px-[var(--gouttiere)] py-[3px] text-left font-[inherit] text-[var(--encre)]"
      >
        {vide ? (
          // Rien à crier : la légende du graveur, manuscrite.
          <span
            aria-hidden="true"
            data-testid="crieur-legende"
            className={`t-legende block w-full overflow-hidden text-center text-[var(--encre-narrateur)] ${lignesMax}`}
          >
            « {voix.legendeEcran(cleLegendeDuMoment(phase))} »
          </span>
        ) : (
          <span
            aria-hidden="true"
            data-testid="crieur"
            data-resume={lot?.resume === true ? '' : undefined}
            className={`block w-full overflow-hidden text-[16px] leading-6 ${lignesMax}`}
          >
            {rubrique !== '' && (
              <span data-testid="crieur-rubrique" className="t-rubrique mr-2 text-[var(--encre-2)]">
                {rubrique}
              </span>
            )}
            {lignes.map((ligne, i) => {
              const mort = ligne.ton === 'sang';
              const liste = mots[i] ?? [];
              return (
                <span key={ligne.cle} data-ligne="" data-mort={mort ? '' : undefined}>
                  {mort && (
                    <span className="mr-1 inline-flex size-4 align-[-2px] [&>svg]:size-4">
                      <Icone nom="chandelle" />
                    </span>
                  )}
                  {liste.map((mot, j) => {
                    rang += 1;
                    return (
                      <span key={j} className={rang > ecrits ? 'invisible' : undefined}>
                        {j < liste.length - 1 ? `${mot} ` : mot}
                      </span>
                    );
                  })}
                  {i < lignes.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </span>
        )}
      </button>
      {registre && <Registre onFermer={() => setRegistre(false)} />}
    </section>
  );
}
