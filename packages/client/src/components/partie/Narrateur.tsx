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
 * - **le crieur** : la dernière annonce — les évènements arrivés ensemble,
 *   ceux d'une même action ou d'une même clôture —, posée sous l'en-tête avec
 *   une entrée discrète. Une simple bascule d'étape de nuit (« la nuit se
 *   poursuit ») ne le remplace pas : elle n'apprend rien, et l'annonce qu'elle
 *   chasserait — le vote du soir — est celle qu'on veut encore lire. La nuit,
 *   le crieur se fait discret et tait les phrases d'heure : l'écran du village
 *   qui dort les dit déjà en grand ;
 * - **le journal** : tout ce qui a été crié depuis le début de la partie,
 *   dépliable, groupé par nuit et par jour avec les titres du récit du skin.
 *
 * Chaque annonce part une fois, et une seule, à la région vocale de
 * l'application (`annoncer`) : un lecteur d'écran entend l'aube comme les
 * autres la lisent.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import type { GameEvent } from '@garoutom/engine';

import { RESSORT_CARTE } from '../../anim/tokens.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { useStore, type EvenementRecu } from '../../lib/store.js';
import { peauDuSkin, resoudre, type Skin, type Voix } from '../../skins/registre.js';

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
interface Chapitre {
  cle: string;
  /** L'heure du chapitre — `nuit-2`, `jour-3` — pour savoir s'il faut en ouvrir un autre. */
  heure: string;
  titre: string;
  lignes: Ligne[];
}

/**
 * La chronique découpée en nuits et en jours. La partie s'ouvre sur la nuit 1
 * (la révélation la précède), et chaque évènement `phase` ouvre le chapitre
 * de son heure : les morts de l'aube restent ainsi dans la nuit qui les a
 * faits, le dépouillement dans le jour qui l'a voté.
 */
function chapitres(chronique: readonly EvenementRecu[], voix: Voix, peau: Skin, nom: (seat: number) => string): Chapitre[] {
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
        resultat.push({ cle: `${heure}-${String(resultat.length)}`, heure, titre, lignes: [] });
      }
    }
    resultat[resultat.length - 1]?.lignes.push(...raconter(recu, voix, peau, nom));
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

/** Un lot du crieur, repéré par son dernier évènement. Les bascules d'étape n'en font pas partie. */
function lotDe(recus: readonly EvenementRecu[]): { cle: number; ids: number[] } | null {
  const crie = recus.filter((recu) => !estBascule(recu.event));
  const dernier = crie[crie.length - 1];
  return dernier === undefined ? null : { cle: dernier.id, ids: crie.map((recu) => recu.id) };
}

export function Narrateur({ className = '' }: { className?: string }) {
  const chronique = useStore((state) => state.chronique);
  const nuit = useGame()?.phase === 'nuit';
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const nom = useNoms();

  /*
    Le lot du crieur : les évènements arrivés ensemble. On retient
    l'identifiant du dernier évènement vu ; tout ce qui le dépasse au rendu
    suivant forme le nouveau lot — sauf s'il ne contient qu'une bascule
    d'étape, auquel cas l'annonce d'avant reste affichée. Au premier montage,
    on ne reprend que la queue de la chronique — le crieur annonce, il ne
    récite pas.

    Le lot se déduit pendant le rendu, pas dans un effet : sinon l'ancien
    lot se peindrait une fois sous la nouvelle heure (au matin, avec ses
    phrases de nuit qu'on taisait), puis resterait le temps de sa sortie.
  */
  const dernierId = chronique[chronique.length - 1]?.id ?? 0;
  const [crieur, setCrieur] = useState<{ vu: number; lot: { cle: number; ids: number[] } | null }>(() => ({
    vu: dernierId,
    lot: lotDe(chronique.filter((recu) => !estBascule(recu.event)).slice(-LOT_INITIAL)),
  }));
  if (dernierId !== crieur.vu) {
    // Les identifiants ne font que croître : ce qui dépasse le dernier vu est
    // neuf. Une chronique vidée (retour au salon) éteint le crieur.
    const nouveau = dernierId === 0 ? null : lotDe(chronique.filter((recu) => recu.id > crieur.vu));
    setCrieur({ vu: dernierId, lot: dernierId === 0 ? null : (nouveau ?? crieur.lot) });
  }
  const lot = crieur.lot;

  useEffect(() => {
    // La région vocale : une fois par évènement, jamais deux. Au tout premier
    // montage, seule la queue de la chronique est dite.
    const inedits = chronique.filter((recu) => recu.id > dernierAnnonce);
    const aDire = dernierAnnonce === 0 ? inedits.slice(-LOT_INITIAL) : inedits;
    if (aDire.length > 0) {
      dernierAnnonce = Math.max(...aDire.map((recu) => recu.id));
      const texte = aDire
        .flatMap((recu) => raconter(recu, voix, peau, nom))
        .map((ligne) => ligne.texte)
        .join(' ');
      if (texte !== '') useStore.getState().annoncer(texte);
    }
  }, [chronique, voix, peau, nom]);

  const lignesDuLot = useMemo(() => {
    if (lot === null) return [];
    return chronique
      .filter((recu) => lot.ids.includes(recu.id))
      .flatMap((recu) => raconter(recu, voix, peau, nom));
  }, [lot, chronique, voix, peau, nom]);

  const [journalOuvert, setJournalOuvert] = useState(false);
  const journal = useMemo(
    () => (journalOuvert ? chapitres(chronique, voix, peau, nom) : []),
    [journalOuvert, chronique, voix, peau, nom],
  );

  if (chronique.length === 0) return null;

  // La nuit, les phrases d'heure se taisent : le village qui dort et l'en-tête
  // les disent déjà. Reste ce qui s'est passé au crépuscule — le vote, ses morts.
  const lignes = nuit ? lignesDuLot.filter((ligne) => ligne.heure !== true) : lignesDuLot;
  const derniere = lignes[lignes.length - 1];
  const tonDuLot: Ton = lignes.some((ligne) => ligne.ton === 'sang') ? 'sang' : (derniere?.ton ?? 'lune');

  const boutonJournal = (
    <button
      type="button"
      className="btn-voisin shrink-0 text-sm"
      // `.btn-voisin` est hors des couches de Tailwind : un `px-3` n'y suffirait pas.
      style={{ paddingInline: '0.75rem' }}
      aria-expanded={journalOuvert}
      aria-controls="journal-partie"
      onClick={() => setJournalOuvert((ouvert) => !ouvert)}
    >
      {journalOuvert ? 'Fermer le journal' : 'Journal'}
    </button>
  );

  return (
    <section
      aria-label="Le narrateur"
      data-testid="narrateur"
      data-discret={nuit ? '' : undefined}
      className={`flex flex-col gap-2 ${className}`}
    >
      {lignes.length === 0 ? (
        // Rien à crier : la nuit garde le silence, le journal reste à portée.
        <div className="flex justify-end">{boutonJournal}</div>
      ) : (
        <div
          className={`carte flex items-start gap-3 sm:px-4 ${nuit ? 'px-3 py-1.5' : 'px-3 py-2.5'}`}
          style={{ borderLeft: `3px solid var(--${tonDuLot})` }}
        >
          {/* Le crieur : aria-hidden, parce que la région vocale le dit déjà. */}
          <div aria-hidden="true" className="min-w-0 flex-1 self-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={lot?.cle ?? 0}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={RESSORT_CARTE}
                data-testid="crieur"
                className={`flex flex-col gap-1 overflow-y-auto sm:max-h-none ${nuit ? 'max-h-20' : 'max-h-28'}`}
              >
                {lignes.map((ligne, rang) => (
                  <LigneDite
                    key={ligne.cle}
                    ligne={ligne}
                    // Les morts se lisent en grand, même quand l'heure parle
                    // après elles (« le jour se lève » suit les morts de l'aube).
                    // La nuit, tout reste en petit : le crieur s'efface.
                    principale={!nuit && (rang === lignes.length - 1 || ligne.ton === 'sang')}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          {boutonJournal}
        </div>
      )}

      {journalOuvert && (
        <div
          id="journal-partie"
          data-testid="journal"
          className="carte max-h-[40vh] overflow-y-auto px-3 py-3 sm:px-4"
        >
          {journal.map((chapitre) => (
            <section key={chapitre.cle} className="mb-3 last:mb-0">
              <h3 className="font-identite text-lg font-bold" style={{ color: 'var(--lune)' }}>
                {chapitre.titre}
              </h3>
              <ol className="mt-1 flex list-none flex-col gap-1 p-0">
                {chapitre.lignes.map((ligne) => (
                  <li key={ligne.cle}>
                    <LigneDite ligne={ligne} principale={false} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

/** Une ligne du narrateur, avec son dépouillement quand c'est un vote. */
function LigneDite({ ligne, principale }: { ligne: Ligne; principale: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={principale ? 'text-base leading-snug' : 'text-sm leading-snug'}
        style={{ color: principale ? 'var(--papier)' : 'var(--papier-doux)' }}
      >
        {ligne.texte}
      </p>
      {ligne.depouillement !== undefined && ligne.depouillement.length > 0 && (
        <ul className="mt-1 flex list-none flex-wrap gap-1.5 p-0" aria-label="Le dépouillement">
          {ligne.depouillement.map((compte) => (
            <li
              key={compte.seat}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: 'var(--nuit-creux)', color: 'var(--papier-doux)' }}
            >
              {compte.nom} <span className="font-mono" style={{ color: 'var(--papier)' }}>{String(compte.voix)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
