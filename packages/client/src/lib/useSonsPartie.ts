/**
 * Les sons de la partie. Le crochet écoute la chronique du magasin et joue
 * chaque évènement une seule fois ; monté une seule fois, par l'écran de
 * partie.
 *
 * Trois règles tiennent ce fichier :
 * - **jamais de rejeu** : au montage, tout ce que la chronique contient déjà
 *   est de l'histoire (on arrive en cours de partie, on se reconnecte) ;
 * - **un message ne fait pas de bruit** : le chat n'est pas dans la
 *   chronique, et rien ici ne le lit ;
 * - **pas de collision** : le glas des morts et la cloche de l'aube qui le
 *   suit sont décalés, et l'aube ne sonne qu'une fois par nuit.
 */

import { useEffect, useRef } from 'react';

import { bruitages, type Verdict } from '@tombp/arcade';

import { factionOf, type GameView, type Winner } from '@garoutom/engine';

import { atelier } from './atelier.js';
import { useEcheance, useSkinId } from './partie.js';
import { useReglages } from './reglages.js';
import { useStore } from './store.js';

/** Le délai entre le glas et la cloche du matin qui le suit. */
const DELAI_AUBE_MS = 1500;

/** Ce qu'occupe une claque avant le son suivant du même lot. */
const DELAI_CLAQUE_MS = 400;

/** Ce qu'occupe le croassement du Corbeau avant le son suivant. */
const DELAI_CROASSEMENT_MS = 600;

/** Ce qu'occupe la cloche claire du matin avant le son suivant. */
const DELAI_CLOCHE_MS = 900;

/** Les secondes de fin de minuterie où le tic égrène. */
const SECONDES_DE_TIC = 10;

/** Le motif de vibration d'un prompt qui arrive (court, discret). */
const MOTIF_VIBRATION = [40, 60, 40];

/** Ce que la fin de partie sonne pour CE siège. */
export function verdictPour(game: GameView | null, winner: Winner): Verdict {
  if (!game?.you || winner === 'personne') return 'neutre';
  if (winner === 'amoureux') {
    const moi = game.players.find((player) => player.seat === game.you?.seat);
    return moi?.isLover === true || game.lover !== null ? 'gagne' : 'perdu';
  }
  // Par faction, jamais par camp (R98) : le Loup Blanc chasse avec la meute
  // mais ne gagne pas avec elle, et la meute perd quand il reste seul.
  return factionOf(game.you.role) === winner ? 'gagne' : 'perdu';
}

/** Joue maintenant, ou dans `delaiMs` si c'est différé. */
type Planifier = (delaiMs: number, son: () => void) => void;

export function useSonsPartie(): void {
  const chronique = useStore((state) => state.chronique);
  const skin = useSkinId();
  const echeance = useEcheance();
  const { vibrations } = useReglages();
  const prompt = useStore((state) => state.game?.prompt ?? null);
  const yourVote = useStore((state) => state.game?.yourVote ?? null);

  // L'histoire déjà écrite au montage ne se rejoue pas.
  const dernierId = useRef<number | null>(null);
  dernierId.current ??= chronique.reduce((max, ev) => Math.max(max, ev.id), 0);
  const phasePrecedente = useRef<string | null>(null);
  const aubeJouee = useRef(false);
  const minuteurs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const initialise = useRef(false);

  if (!initialise.current) {
    initialise.current = true;
    for (const { event } of chronique) {
      if (event.type !== 'phase') continue;
      phasePrecedente.current = event.phase;
      if (event.phase === 'nuit') aubeJouee.current = false;
    }
  }

  // Les minuteurs en vol s'éteignent avec l'écran.
  useEffect(
    () => () => {
      for (const minuteur of minuteurs.current) clearTimeout(minuteur);
      minuteurs.current = [];
    },
    [],
  );

  useEffect(() => {
    const vus = dernierId.current ?? 0;
    const nouveaux = chronique.filter((recu) => recu.id > vus);
    if (nouveaux.length === 0) return;
    dernierId.current = Math.max(vus, ...nouveaux.map((recu) => recu.id));

    const planifier: Planifier = (delaiMs, son) => {
      if (delaiMs <= 0) {
        son();
        return;
      }
      minuteurs.current.push(setTimeout(son, delaiMs));
    };

    /*
      Le curseur du lot : les sons qui se suivent dans une même annonce — la
      claque du vote, celle du Bouc, le glas, la rancune, le Corbeau, la
      cloche du matin — se posent l'un après l'autre, chacun à la fin du
      précédent, au lieu de sonner tous ensemble.
    */
    let curseur = 0;
    const aLaSuite = (son: () => void, dureeMs: number): void => {
      planifier(curseur, son);
      curseur += dureeMs;
    };

    let glasDansLeLot = false;
    const sonnerGlas = (): void => {
      // Une seule fois, même s'il y a plusieurs morts dans l'évènement ou
      // plusieurs évènements dans le lot.
      if (glasDansLeLot) return;
      glasDansLeLot = true;
      aLaSuite(atelier.glas, DELAI_AUBE_MS);
    };
    const sonnerAube = (): void => {
      if (aubeJouee.current) return;
      aubeJouee.current = true;
      aLaSuite(atelier.aube, DELAI_CLOCHE_MS);
    };

    for (const { event } of nouveaux) {
      switch (event.type) {
        case 'phase': {
          if (event.phase === 'nuit') {
            aubeJouee.current = false;
            // Les bascules d'étape (Loup Blanc, Sorcière) se taisent : le
            // hurlement est celui de la nuit qui tombe, une fois.
            if (event.step === undefined || event.step === 'principale') atelier.hurlement(skin);
          } else if (
            (event.phase === 'jour' || event.phase === 'election') &&
            phasePrecedente.current === 'nuit'
          ) {
            sonnerAube();
          }
          phasePrecedente.current = event.phase;
          break;
        }
        case 'morts':
          sonnerGlas();
          break;
        case 'rancune':
          // Les pouvoirs du village s'éteignent : un second glas, après celui
          // de la mort qui l'a déclenché.
          aLaSuite(atelier.glas, DELAI_AUBE_MS);
          break;
        case 'bouc':
          // Le maillet retombe une seconde fois — sur le Bouc —, puis le glas
          // (celui de sa mort, qui suit dans le lot, ne sonnera pas deux fois).
          aLaSuite(() => bruitages.claque(), DELAI_CLAQUE_MS);
          sonnerGlas();
          break;
        case 'corbeau':
          aLaSuite(atelier.croassement, DELAI_CROASSEMENT_MS);
          break;
        case 'aube-paisible':
          sonnerAube();
          break;
        case 'vote':
          aLaSuite(() => bruitages.claque(), DELAI_CLAQUE_MS);
          break;
        case 'tir':
          atelier.detonation();
          break;
        case 'capitaine':
          bruitages.cloche();
          break;
        case 'fin': {
          const game = useStore.getState().game;
          bruitages.verdict(verdictPour(game, event.winner));
          break;
        }
        case 'debut':
        case 'grace':
        // Le dernier mot du Bouc se lit : la mort qui l'a précédé a déjà sonné.
        case 'votants':
          break;
      }
    }
  }, [chronique, skin]);

  // Le tic : un par seconde, seulement sur SA minuterie (l'échéance des
  // autres n'est pas envoyée, R80), seulement sur les dernières secondes.
  const secondes = echeance?.secondes ?? null;
  useEffect(() => {
    if (secondes !== null && secondes >= 1 && secondes <= SECONDES_DE_TIC) atelier.tic();
  }, [secondes]);

  // Le sien : le « toc » du pion posé, quand son vote change de cible.
  const voteVu = useRef<number | null>(yourVote);
  useEffect(() => {
    if (yourVote !== null && yourVote !== voteVu.current) atelier.vote();
    voteVu.current = yourVote;
  }, [yourVote]);

  // La vibration : un prompt qui vient d'arriver pour soi.
  const avaitPrompt = useRef(prompt !== null);
  useEffect(() => {
    const aUnPrompt = prompt !== null;
    if (aUnPrompt && !avaitPrompt.current && vibrations && typeof navigator !== 'undefined') {
      if ('vibrate' in navigator) navigator.vibrate(MOTIF_VIBRATION);
    }
    avaitPrompt.current = aUnPrompt;
  }, [prompt, vibrations]);
}
