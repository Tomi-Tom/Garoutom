/**
 * Le salon : la table qui se remplit.
 *
 * Chaque arrivée allume une fenêtre du village — dans la frise, en tête —,
 * et c'est ici que la partie se décide : tout l'écran est fait pour qu'elle
 * se décide à plusieurs. La composition choisie est publique : c'est
 * l'attribution des cartes qui est secrète, et le salon peut afficher
 * « 2 loups · la Voyante · la Sorcière » sans rien dévoiler. L'hôte règle, les
 * autres lisent — en lecture seule, mais sans rien perdre de l'explication :
 * arriver à une table sans savoir à quoi on joue est le meilleur moyen de se
 * croire volé au premier mort.
 *
 * Trois chapitres, « La table · La donne · Les règles » (SPEC § 7.7) :
 * - sur le téléphone, l'hôte les parcourt en trois étapes (des cartouches
 *   cliquables en tête, « Suivant : … » collé au pouce, « Lancer la partie »
 *   au bout) ; les autres joueurs lisent les trois d'une traite ;
 * - sur le bureau, ce sont trois colonnes, et « Lancer la partie » tombe au
 *   bas de la colonne centrale.
 */

import { BoutonSon, LienArcade } from '@tombp/arcade';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import {
  autoComposition,
  compositionFor,
  DAY_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_SECONDS,
  OPTIONAL_ROLE_MIN_PLAYERS,
  OPTIONAL_ROLES,
  OPTIONAL_ROLES_V3,
  randomComposition,
  SPECIAL_ROLES,
  suggestionsFor,
  wolvesIn,
  type ChoosableRoleId,
  type GameOptions,
  type OptionalRoleId,
  type OptionalRoleIdV3,
  type PlayerInfo,
  type RoomView,
  type Rng,
} from '@garoutom/engine';

import { BarrePouce, Bouton, Cuvette, Frise } from '../components/caprices/index.js';
import { CouvreChef } from '../components/habit/CouvreChef.js';
import { gravuresDuSkin, MINIATURE_COMMUNE } from '../components/habit/gravures.js';
import { Glyphe } from '../components/habit/glyphes.js';
import { SymboleRole } from '../components/habit/Symbole.js';
import { Interrupteur } from '../components/Interrupteur.js';
import { FeuilleBasse } from '../components/partie/fil/FeuilleBasse.js';
import { BoutonReglages } from '../components/Reglages.js';
import { BoutonRegles } from '../components/Regles.js';
import { useEstLarge } from '../components/useEstLarge.js';
import { lancerPartie, quitterTable, reglerOptions } from '../lib/actions.js';
import { ARCADE_ID } from '../lib/identity.js';
import { useVoix } from '../lib/partie.js';
import { useReglages } from '../lib/reglages.js';
import { useStore } from '../lib/store.js';
import { peauDuSkin, SKINS, type Voix } from '../skins/registre.js';
import {
  CERCLE_ETIQUETTE,
  CERCLE_NOM_PX,
  grilleSieges,
  lignesDuNom,
  poserTable,
  type TableEnRond,
} from './salonTable.js';

/** Combien de temps la fenêtre d'une arrivée reste allumée. */
const DUREE_ARRIVEE_MS = 8_000;

/**
 * La composition dite comme la table la lira en cours de partie, dans la
 * voix du skin : « 2 loups · la Voyante » ici, « 2 Titans · l'Éclaireuse »
 * ailleurs. Les identifiants du moteur ne s'affichent jamais tels quels.
 */
function phraseComposition(voix: Voix, loups: number, roles: readonly ChoosableRoleId[]): string {
  // Le Loup Blanc chasse avec la meute et compte parmi les loups (R13, R96) :
  // la phrase le dit, « 3 loups dont le Loup Blanc », au lieu de l'ajouter
  // comme un rôle de plus.
  const blanc = roles.includes('loupBlanc');
  const meute = voix.compteLoups(wolvesIn(loups, roles)) + (blanc ? ` dont ${voix.nomRole('loupBlanc')}` : '');
  const autres = roles.filter((role) => role !== 'loupBlanc').map((role) => voix.nomRole(role));
  return [meute, ...autres].join(' · ');
}

function memeRoles(a: readonly ChoosableRoleId[], b: readonly ChoosableRoleId[]): boolean {
  return a.length === b.length && a.every((role) => b.includes(role));
}

/**
 * Une seule case retournée, sous une forme que `reglerOptions` accepte.
 *
 * Les clés calculées et `Partial<GameOptions>` ne font pas bon ménage en
 * TypeScript : cette petite fabrique porte le cast une fois pour toutes,
 * là où chaque interrupteur l'aurait recopié.
 */
function bascule<C extends CleInterrupteur>(cle: C, valeur: boolean): Pick<GameOptions, C> {
  return { [cle]: valeur } as Pick<GameOptions, C>;
}

/**
 * Le hasard du salon.
 *
 * La règle « jamais `Math.random` » (R86) lie le moteur : une partie doit
 * pouvoir être rejouée à l'identique. L'écran n'a rien à rejouer — un clic
 * sur « composition au hasard » ne doit pas produire deux fois la même.
 */
const hasard: Rng = { nextInt: (max) => Math.floor(Math.random() * max) };

type Etape = 'table' | 'donne' | 'regles';
const ETAPES: readonly { cle: Etape; titre: string }[] = [
  { cle: 'table', titre: 'La table' },
  { cle: 'donne', titre: 'La donne' },
  { cle: 'regles', titre: 'Les règles' },
];
const SUIVANT: Record<Exclude<Etape, 'regles'>, Etape> = { table: 'donne', donne: 'regles' };

function pluriel(nombre: number, mot: string): string {
  return `${String(nombre)} ${mot}${nombre > 1 ? 's' : ''}`;
}

export function Salon({ room }: { room: RoomView }) {
  const playerId = useStore((state) => state.playerId);
  const decalage = useStore((state) => state.decalageHorloge);
  const pushNotice = useStore((state) => state.pushNotice);
  const large = useEstLarge();

  const moi = room.players.find((player) => player.id === playerId);
  const hote = moi?.isHost ?? false;
  const nombre = room.players.length;
  const voix = useVoix();
  const manque = Math.max(0, MIN_PLAYERS - nombre);
  const assezDeMonde = manque === 0;
  // La composition réglée doit être jouable pour ce nombre de joueurs : le
  // moteur a le dernier mot (R13), et sa raison se dit au bouton grisé.
  let erreurComposition: string | null = null;
  if (assezDeMonde) {
    try {
      compositionFor(nombre, room.options);
    } catch (erreur) {
      erreurComposition = erreur instanceof Error ? erreur.message : 'Composition impossible';
    }
  }
  const peutLancer = assezDeMonde && erreurComposition === null;
  const assis = [...room.players].sort((a, b) => a.seat - b.seat);
  const libres = MAX_PLAYERS - nombre;

  /*
    « A rejoint » : chaque arrivée allume une fenêtre du village, puis
    s'efface. Les joueurs déjà là quand on entre ne l'allument pas — la
    fenêtre dit une arrivée, pas une présence. Les minuteurs vivent dans un
    pli du composant et se vident à sa sortie : le badge reste honnête même
    quand la liste des joueurs change sous lui.
  */
  const connus = useRef<Set<string>>(new Set(room.players.map((player) => player.id)));
  const [arrivees, setArrivees] = useState<readonly string[]>([]);
  const minuteurs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const enVol = minuteurs.current;
    return () => {
      for (const timer of enVol) clearTimeout(timer);
      enVol.clear();
    };
  }, []);

  useEffect(() => {
    const nouvelles = room.players.filter((player) => !connus.current.has(player.id));
    if (nouvelles.length === 0) return;
    const ids = nouvelles.map((player) => player.id);
    for (const id of ids) connus.current.add(id);
    setArrivees((precedent) => [...precedent, ...ids]);
    for (const id of ids) {
      const timer = setTimeout(() => {
        minuteurs.current.delete(timer);
        setArrivees((precedent) => precedent.filter((reste) => reste !== id));
      }, DUREE_ARRIVEE_MS);
      minuteurs.current.add(timer);
    }
  }, [room.players]);

  // L'heure du serveur, pour lire `disconnectedUntil` — jamais l'horloge du
  // navigateur, dont le décalage ferait mentir le compte à rebours.
  const maintenant = Date.now() + (decalage ?? 0);

  const copierCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      pushNotice(`Code ${room.code} copié — transmettez-le à qui doit vous rejoindre`);
    } catch {
      pushNotice(`Partagez le code ${room.code}`);
    }
  };

  // Le lien d'invitation : l'adresse de la page, sans ce qui la suit, plus le
  // code. L'accueil lit `?table=` et remplit le code d'avance.
  const copierLien = async () => {
    const lien = new URL(window.location.href);
    lien.search = '';
    lien.hash = '';
    lien.searchParams.set('table', room.code);
    try {
      await navigator.clipboard.writeText(lien.toString());
      pushNotice('Lien d’invitation copié — il ouvre l’accueil avec le code déjà rempli');
    } catch {
      pushNotice(`Partagez ce lien : ${lien.toString()}`);
    }
  };

  /* --- Les étapes de l'hôte (téléphone) --- */
  const [etape, setEtape] = useState<Etape>('table');
  const parEtapes = hote && !large;
  const visible = (chapitre: Etape): boolean => !parEtapes || etape === chapitre;
  const defilement = useRef<HTMLElement>(null);
  useEffect(() => {
    // Une étape nouvelle s'ouvre en haut de page.
    defilement.current?.scrollTo?.({ top: 0 });
  }, [etape]);

  /* --- Pourquoi le lancement ne part pas (dit en toutes lettres, jamais « impossible ») --- */
  const raisonLongue = peutLancer
    ? null
    : assezDeMonde
      ? `La composition ne tient pas pour ${String(nombre)} joueurs : ${erreurComposition ?? ''}. Changez-la dans la donne.`
      : `Il faut ${String(MIN_PLAYERS)} joueurs pour lancer — ${String(nombre)} à la table, il en manque ${String(manque)}. Partagez le code ou le lien d’invitation.`;
  const raisonCourte = peutLancer
    ? undefined
    : assezDeMonde
      ? 'La composition ne tient pas'
      : `Il manque ${pluriel(manque, 'joueur')}`;
  const raisonLancement = raisonLongue === null ? null : (
    <p
      id="raison-lancement"
      className="t-statut m-0 text-center"
      style={{ color: assezDeMonde ? 'var(--encre)' : 'var(--encre-2)' }}
    >
      {raisonLongue}
    </p>
  );

  const boutonLancer = (
    <Bouton
      variante="primaire"
      onClick={() => void lancerPartie()}
      disabled={!peutLancer}
      aria-describedby={peutLancer ? undefined : 'raison-lancement'}
    >
      Lancer la partie
    </Bouton>
  );

  /* --- Ce que dit le salon à qui ne lance pas --- */
  const attente = peutLancer
    ? 'Tout est prêt — l’hôte peut lancer la partie.'
    : assezDeMonde
      ? 'La composition de l’hôte ne tient pas encore : il doit la corriger avant de lancer.'
      : `En attente de joueurs : ${String(nombre)} à la table, ${String(MIN_PLAYERS)} au moins — il en manque ${String(manque)}.`;

  const panneauTable = (
    <PanneauTable
      room={room}
      assis={assis}
      playerId={playerId}
      arrivees={arrivees}
      maintenant={maintenant}
      libres={libres}
      manque={manque}
      assezDeMonde={assezDeMonde}
      nombre={nombre}
      large={large}
      voix={voix}
      onCopierCode={() => void copierCode()}
      onCopierLien={() => void copierLien()}
      avertissement={hote && !large && manque > 0 ? raisonLancement : null}
    />
  );

  const panneauDonne = (
    <PanneauDonne
      options={room.options}
      nombre={nombre}
      editable={hote}
      voix={voix}
      avecUnivers={large || !hote}
      bas={
        large ? (
          hote ? (
            <div className="mt-2 flex flex-col gap-2">
              {boutonLancer}
              {raisonLancement}
            </div>
          ) : (
            <p className="t-statut m-0 text-center">{attente}</p>
          )
        ) : null
      }
    />
  );

  const panneauRegles = (
    <PanneauRegles
      options={room.options}
      nombre={nombre}
      editable={hote}
      voix={voix}
      avecUnivers={!(large || !hote)}
      recap={parEtapes && etape === 'regles' ? <Recap options={room.options} nombre={nombre} voix={voix} aviser={raisonLancement} /> : null}
    />
  );

  /* --- La barre au pouce --- */
  let barre: ReactNode = null;
  if (!large) {
    if (!hote) {
      barre = (
        <BarrePouce raison={attente}>
          <Bouton variante="primaire" disabled>
            En attente de l’hôte
          </Bouton>
        </BarrePouce>
      );
    } else if (etape === 'table') {
      barre = (
        <BarrePouce raison={manque > 0 ? raisonCourte : undefined}>
          <Bouton variante="primaire" disabled={!assezDeMonde} onClick={() => setEtape(SUIVANT.table)}>
            Suivant : la donne
          </Bouton>
        </BarrePouce>
      );
    } else if (etape === 'donne') {
      barre = (
        <BarrePouce>
          <ResumeDonne options={room.options} nombre={nombre} voix={voix} />
          <Bouton variante="primaire" style={{ flex: '0 0 196px' }} onClick={() => setEtape(SUIVANT.donne)}>
            Suivant : les règles
          </Bouton>
        </BarrePouce>
      );
    } else {
      barre = <BarrePouce raison={raisonCourte}>{boutonLancer}</BarrePouce>;
    }
  }

  return (
    <div data-testid="salon" className="flex h-full min-h-0 flex-col bg-fond text-encre">
      <Frise
        titre="Salon"
        gauche={
          <>
            <LienArcade id={ARCADE_ID} className="shrink-0" />
            <FenetresAllumees arrivees={arrivees} joueurs={room.players} />
          </>
        }
        droite={
          large ? (
            <>
              <BoutonRegles />
              <BoutonReglages />
              <BoutonSon />
              <Bouton
                variante="outil"
                icone="quitter"
                aria-label="Quitter"
                title="Quitter la table"
                onClick={() => void quitterTable()}
              />
            </>
          ) : (
            // Sous le bureau, quatre boutons de 44 ne tiennent pas à côté du
            // titre à 360 : les règles, les réglages et « Quitter » passent
            // dans le menu (§ 5.7), le son reste à portée de pouce.
            <>
              <MenuSalon code={room.code} />
              <BoutonSon />
            </>
          )
        }
      />

      {parEtapes && <EtapesHote etape={etape} onChoisir={setEtape} />}

      <main ref={defilement} className="min-h-0 flex-1 overflow-y-auto">
        {large ? (
          // La table prend la plus grande part de la place libre : à 1 400 px
          // et plus, ~530 px, de quoi asseoir douze noms entiers en rond.
          <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(400px,3fr)_392px_minmax(0,2fr)] items-start gap-8 p-8">
            <div className="flex flex-col gap-4">{panneauTable}</div>
            <div className="flex flex-col gap-4">{panneauDonne}</div>
            <div className="flex flex-col gap-4">{panneauRegles}</div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-6 px-4 py-4">
            {visible('table') && panneauTable}
            {visible('donne') && (
              <div className={parEtapes ? '' : 'border-t pt-6'} style={{ borderColor: 'var(--filet-doux)' }}>
                {panneauDonne}
              </div>
            )}
            {visible('regles') && (
              <div className={parEtapes ? '' : 'border-t pt-6'} style={{ borderColor: 'var(--filet-doux)' }}>
                {panneauRegles}
              </div>
            )}
          </div>
        )}
      </main>

      {barre}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* La frise : les fenêtres qui s'allument                              */
/* ------------------------------------------------------------------ */

/**
 * Une fenêtre du village s'allume à chaque arrivée (SPEC § 7.7). Posées sur
 * la ligne des toits, à une place que le siège de l'arrivant fixe : deux
 * arrivées ne s'allument pas au même endroit, et la même s'allume toujours là.
 * Décoratif : l'arrivée se dit aussi au jeton (« a rejoint »).
 */
function FenetresAllumees({ arrivees, joueurs }: { arrivees: readonly string[]; joueurs: readonly PlayerInfo[] }) {
  if (arrivees.length === 0) return null;
  return (
    <span aria-hidden="true" data-fenetres="" className="pointer-events-none absolute inset-0">
      {arrivees.map((id) => {
        const siege = joueurs.find((joueur) => joueur.id === id)?.seat ?? 0;
        return (
          <span
            key={id}
            data-fenetre-allumee={siege}
            style={{
              position: 'absolute',
              left: `${String(14 + ((siege * 29) % 72))}%`,
              bottom: 5,
              width: 6,
              height: 9,
              background: 'var(--frise-fenetre)',
              outline: '1px solid var(--frise-trait)',
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * Le menu du salon, sous la largeur du bureau : le « … » de la frise (les
 * trois traits de burin, 44 px), qui ouvre une feuille basse — les règles,
 * les réglages, quitter la table. Calqué sur le menu de la table en partie
 * (`MenuTable`), sans le registre : au salon, rien n'est encore arrivé.
 * « Quitter » garde le comportement du bouton du bureau : il quitte.
 */
function MenuSalon({ code }: { code: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Bouton
        variante="outil"
        icone="menu"
        aria-label="Menu du salon"
        title="Règles, réglages, quitter"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls="menu-salon"
        onClick={() => setOuvert(true)}
        className="shrink-0"
      />
      {/* La feuille se pose sur la page, pas dans la frise : la frise isole
          ses couches (`isolation: isolate`), et la table passerait dessus. */}
      {ouvert &&
        createPortal(
          <FeuilleBasse titre={`Table ${code}`} onFermer={() => setOuvert(false)}>
            <div id="menu-salon" data-testid="menu-salon" className="flex flex-col gap-3 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <BoutonRegles />
                <span className="t-statut">Règles</span>
                <BoutonReglages />
                <span className="t-statut">Réglages</span>
              </div>
              <Bouton variante="secondaire" icone="quitter" onClick={() => void quitterTable()}>
                Quitter la table
              </Bouton>
            </div>
          </FeuilleBasse>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Les étapes de l'hôte                                                */
/* ------------------------------------------------------------------ */

/** « La table · La donne · Les règles » : trois cartouches cliquables, la courante pleine, les faites scellées. */
function EtapesHote({ etape, onChoisir }: { etape: Etape; onChoisir: (etape: Etape) => void }) {
  const rang = ETAPES.findIndex((candidate) => candidate.cle === etape);
  return (
    <nav aria-label="Étapes du salon" className="flex shrink-0 gap-2 px-4 pt-3 pb-1">
      {ETAPES.map(({ cle, titre }, i) => {
        const courante = cle === etape;
        const faite = i < rang;
        return (
          <button
            key={cle}
            type="button"
            aria-current={courante ? 'step' : undefined}
            onClick={() => onChoisir(cle)}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 text-[15px] leading-5"
            style={{
              background: courante ? 'var(--action-fond)' : 'transparent',
              color: courante ? 'var(--action-texte)' : 'var(--encre)',
              border: '1.5px solid var(--filet)',
              fontWeight: courante ? 600 : 400,
            }}
          >
            {faite && <Glyphe nom="a-vote" taille={16} />}
            {titre}
            {faite && <span className="sr-only"> (faite)</span>}
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Le meuble commun                                                    */
/* ------------------------------------------------------------------ */

/** Le titre d'un chapitre : un grand titre sur le bureau, une rubrique sur le téléphone. */
function TitreChapitre({
  titre,
  aside,
  large,
  niveau = 2,
}: {
  titre: string;
  aside?: string;
  large: boolean;
  niveau?: 1 | 2;
}) {
  const Titre = niveau === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <Titre
        className={large ? 'm-0' : 't-rubrique m-0'}
        style={
          large
            ? { fontFamily: 'var(--font-identite)', fontSize: 36, lineHeight: '40px', fontWeight: 400 }
            : { color: 'var(--encre-2)' }
        }
      >
        {titre}
      </Titre>
      {aside !== undefined && <span className="t-statut">{aside}</span>}
    </div>
  );
}

/** Une rubrique de chapitre : petites capitales, puis un commentaire d'une ligne. */
function Rubrique({ titre, aside, id }: { titre: string; aside?: string; id?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span id={id} className="t-rubrique" style={{ color: 'var(--encre-2)' }}>
        {titre}
      </span>
      {aside !== undefined && <span className="t-statut">{aside}</span>}
    </div>
  );
}

function majuscule(texte: string): string {
  return texte.replace(/^./, (lettre) => lettre.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* La table : le code, les sièges                                      */
/* ------------------------------------------------------------------ */

function PanneauTable({
  room,
  assis,
  playerId,
  arrivees,
  maintenant,
  libres,
  manque,
  assezDeMonde,
  nombre,
  large,
  voix,
  onCopierCode,
  onCopierLien,
  avertissement,
}: {
  room: RoomView;
  assis: readonly PlayerInfo[];
  playerId: string | null;
  arrivees: readonly string[];
  maintenant: number;
  libres: number;
  manque: number;
  assezDeMonde: boolean;
  nombre: number;
  large: boolean;
  voix: Voix;
  onCopierCode: () => void;
  onCopierLien: () => void;
  avertissement: ReactNode;
}) {
  const legende = voix.legendeEcran('salon');
  const tirage = useReglages().tirage;
  // La table se pose à la largeur réelle de sa colonne : le cercle sur le
  // bureau s'il y tient sans qu'aucun nom ne passe sous la carte ni ne sorte
  // par le bord, la grille sinon (et toujours sur le téléphone).
  const mesure = useRef<HTMLDivElement>(null);
  const largeurTable = useLargeur(mesure, large ? LARGEUR_TABLE_BUREAU : LARGEUR_TABLE_TELEPHONE);
  const lignes = assis.some((joueur) => lignesDuNom(joueur.name, CERCLE_ETIQUETTE, CERCLE_NOM_PX) === 2) ? 2 : 1;
  const table = large ? poserTable(nombre, largeurTable, lignes) : null;
  const cercle = table !== null;
  const phraseLibres = `${pluriel(libres, 'place')} libre${libres > 1 ? 's' : ''} — la table accepte jusqu'à ${String(MAX_PLAYERS)} joueurs.`;

  const sieges = (
    <Sieges
      assis={assis}
      playerId={playerId}
      arrivees={arrivees}
      maintenant={maintenant}
      table={table}
      largeur={largeurTable}
      tirage={tirage}
      skin={room.options.skin}
      voix={voix}
      pupitre={
        cercle ? (
          <>
            <p className="t-legende m-0 text-center">«&nbsp;{legende.replace(/^[«\s]+|[»\s]+$/g, '')}&nbsp;»</p>
            {libres > 0 && <p className="t-statut m-0 text-center">{phraseLibres}</p>}
          </>
        ) : null
      }
    />
  );

  return (
    <section className="flex flex-col gap-4" aria-label="La table">
      <div className="flex flex-col gap-1">
        <TitreChapitre titre="La table" large={large} niveau={1} />
        {/* La fonction d'un code est de se recopier : gros, chasse fixe — quatre
            lettres qui ne se lisent pas en chiffre. */}
        <p className="t-code font-mono m-0" style={{ fontSize: large ? 40 : 32, lineHeight: large ? '48px' : '40px' }}>
          {room.code}
        </p>
      </div>
      {!cercle && <p className="t-legende m-0">«&nbsp;{legende.replace(/^[«\s]+|[»\s]+$/g, '')}&nbsp;»</p>}

      <div className="flex flex-wrap gap-2">
        <Bouton variante="secondaire" style={{ minHeight: 44 }} onClick={onCopierCode}>
          Copier le code
        </Bouton>
        <Bouton variante="secondaire" style={{ minHeight: 44 }} onClick={onCopierLien}>
          Copier le lien d’invitation
        </Bouton>
      </div>

      <div className="flex flex-col gap-2">
        <Rubrique
          titre="Autour de la table"
          aside={
            assezDeMonde
              ? `${pluriel(nombre, 'joueur')} · prêts à lancer`
              : `${pluriel(nombre, 'joueur')} · il en manque ${String(manque)} pour lancer`
          }
        />
        <div ref={mesure} className="w-full min-w-0">
          {sieges}
        </div>
        {!cercle && libres > 0 &&<p className="t-statut m-0 text-center">{phraseLibres}</p>}
        <p className="t-statut m-0 max-sm:sr-only">
          Les sièges suivent l'ordre d'arrivée, et ils fixent l'ordre du tour de parole. Une place
          perdue en cours de route tient le temps du délai de grâce, puis se libère.
        </p>
      </div>

      {avertissement}
    </section>
  );
}

/** Les largeurs de la table tant qu'on ne l'a pas mesurée (et sous jsdom) : la colonne du bureau à 1 440, le téléphone à 390. */
const LARGEUR_TABLE_BUREAU = 528;
const LARGEUR_TABLE_TELEPHONE = 358;

/** La largeur réelle d'un élément, suivie au redimensionnement ; `defaut` tant qu'on n'a pas mesuré. */
function useLargeur(ref: RefObject<HTMLElement | null>, defaut: number): number {
  const [largeur, setLargeur] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const mesurer = () => {
      const l = Math.floor(el.getBoundingClientRect().width);
      if (l > 0) setLargeur(l);
    };
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [ref]);
  return largeur ?? defaut;
}

function Sieges({
  assis,
  playerId,
  arrivees,
  maintenant,
  table,
  largeur,
  tirage,
  skin,
  voix,
  pupitre,
}: {
  assis: readonly PlayerInfo[];
  playerId: string | null;
  arrivees: readonly string[];
  maintenant: number;
  /** Le cercle posé par `poserTable`, ou `null` : la grille. */
  table: TableEnRond | null;
  largeur: number;
  tirage: 'papier' | 'cuivre';
  skin: string;
  voix: Voix;
  pupitre: ReactNode;
}) {
  const nombre = assis.length;
  const etiquette = `Autour de la table, ${pluriel(nombre, 'joueur')}`;

  if (table !== null) {
    // Le cercle du bureau : « moi » à six heures, les autres dans l'ordre des
    // sièges ; chaque étiquette a sa boîte, que rien ne chevauche — ni sa
    // voisine, ni la carte du milieu, ni le bord.
    const places = table.sieges.length;
    const moiRang = Math.max(
      0,
      assis.findIndex((joueur) => joueur.id === playerId),
    );
    const boite = (i: number) => {
      const b = table.sieges[(((i - moiRang) % places) + places) % places];
      return b === undefined
        ? undefined
        : ({ position: 'absolute', left: b.x, top: b.y, width: b.largeur, height: b.hauteur } as const);
    };
    return (
      <div
        className="relative mx-auto"
        style={{ width: table.largeur, height: table.hauteur }}
        data-cercle=""
        data-lignes={table.lignes}
      >
        <ul aria-label={etiquette} className="m-0 list-none p-0">
          {assis.map((joueur, i) => (
            <Jeton
              key={joueur.id}
              joueur={joueur}
              estMoi={joueur.id === playerId}
              arrive={arrivees.includes(joueur.id)}
              maintenant={maintenant}
              m={table.medaillon}
              largeur={CERCLE_ETIQUETTE}
              nomPx={CERCLE_NOM_PX}
              tirage={tirage}
              skin={skin}
              voix={voix}
              style={boite(i)}
            />
          ))}
          {Array.from({ length: Math.max(0, places - nombre) }, (_, k) => (
            <PlaceLibre
              key={`libre-${String(k)}`}
              rang={nombre + k + 1}
              m={table.medaillon}
              nomPx={CERCLE_NOM_PX}
              style={boite(nombre + k)}
            />
          ))}
        </ul>
        <div
          className="absolute"
          style={{ left: table.carte.x, top: table.carte.y, width: table.carte.largeur, height: table.carte.hauteur }}
          data-carte-table=""
        >
          <Cuvette className="box-border flex size-full flex-col items-center justify-center gap-2 overflow-hidden px-3">
            {pupitre}
          </Cuvette>
        </div>
      </div>
    );
  }

  const d = grilleSieges(nombre, largeur);
  // Sous six, les places qui manquent encore se montrent : la table se dresse.
  const vides = Math.max(0, MIN_PLAYERS - nombre);
  return (
    <ul
      aria-label={etiquette}
      className="m-0 grid list-none p-0"
      data-colonnes={d.colonnes}
      style={{
        gridTemplateColumns: `repeat(${String(d.colonnes)}, minmax(0, 1fr))`,
        gap: d.ecart,
      }}
    >
      {assis.map((joueur) => (
        <Jeton
          key={joueur.id}
          joueur={joueur}
          estMoi={joueur.id === playerId}
          arrive={arrivees.includes(joueur.id)}
          maintenant={maintenant}
          m={d.m}
          nomPx={d.nom}
          tirage={tirage}
          skin={skin}
          voix={voix}
        />
      ))}
      {Array.from({ length: vides }, (_, i) => (
        <PlaceLibre key={`libre-${String(i)}`} rang={nombre + i + 1} m={d.m} nomPx={d.nom} />
      ))}
    </ul>
  );
}

/** Le numéro d'ordre d'une place en toutes lettres : « Sixième place, libre ». */
const ORDINAUX = ['Première', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième', 'Sixième'];

function PlaceLibre({ rang, m, nomPx, style }: { rang: number; m: number; nomPx: number; style?: CSSProperties }) {
  const ordinal = ORDINAUX[rang - 1] ?? `${String(rang)}ᵉ`;
  return (
    <li aria-label={`${ordinal} place, libre`} className="flex flex-col items-center" data-place-libre="" style={style}>
      <span
        aria-hidden="true"
        className="block rounded-full"
        style={{ width: m, height: m, margin: '4px 0', border: '1.4px dashed var(--encre-2)' }}
      />
      <span aria-hidden="true" className="block text-center" style={{ fontSize: nomPx, lineHeight: '20px', color: 'var(--encre-2)' }}>
        {`${String(rang)}ᵉ place`}
      </span>
      <span aria-hidden="true" className="t-statut block h-4 text-center">
        libre
      </span>
    </li>
  );
}

/**
 * Un jeton à sa place (SPEC § 5.1) : le médaillon, son couvre-chef — celui du
 * siège, public et stable, sans rapport avec le rôle —, le nom, et **un seul
 * mot** d'état. Rien ne trahit un rôle : il n'est même pas encore distribué.
 *
 * Priorité du mot : absent·e > a rejoint > vous · hôte > vous > hôte. Tout
 * est dit aux lecteurs d'écran : le siège, le couvre-chef, l'état.
 */
function Jeton({
  joueur,
  estMoi,
  arrive,
  maintenant,
  m,
  largeur,
  nomPx,
  tirage,
  skin,
  voix,
  style,
}: {
  joueur: PlayerInfo;
  estMoi: boolean;
  arrive: boolean;
  maintenant: number;
  m: number;
  /** La largeur de l'étiquette (le cercle) ; sans elle, toute la cellule (la grille). */
  largeur?: number;
  nomPx: number;
  tirage: 'papier' | 'cuivre';
  skin: string;
  voix: Voix;
  style?: CSSProperties;
}) {
  const reprise =
    joueur.disconnectedUntil === null
      ? null
      : Math.max(0, Math.ceil((joueur.disconnectedUntil - maintenant) / 1000));
  const absent = !joueur.connected;

  let statut = '';
  if (absent) statut = reprise === null || reprise === 0 ? 'absent·e' : `absent·e · ${String(reprise)} s`;
  else if (arrive) statut = 'a rejoint';
  else if (estMoi) statut = joueur.isHost ? 'vous · hôte' : 'vous';
  else if (joueur.isHost) statut = 'hôte';
  const fort = arrive && !absent;

  const S = m + 16;
  const disque = m - 8;
  const buste = 0.75 * m;
  const cadre = m + 14;

  return (
    <li
      className="flex flex-col items-center"
      style={{ width: largeur ?? '100%', ...style }}
      data-jeton={joueur.seat + 1}
      data-moi={estMoi ? '' : undefined}
    >
      <span aria-hidden="true" className="relative block" style={{ width: S, height: S, margin: '-4px 0' }}>
        {estMoi && (
          <>
            {/* Le cadre « moi » : deux filets, 1,5 puis 0,75, à 2 px d'écart. */}
            <span
              className="absolute block"
              style={{ left: (S - cadre) / 2, top: (S - cadre) / 2, width: cadre, height: cadre, border: '1.5px solid var(--encre)' }}
            />
            <span
              className="absolute block"
              style={{
                left: (S - cadre) / 2 + 2.75,
                top: (S - cadre) / 2 + 2.75,
                width: cadre - 5.5,
                height: cadre - 5.5,
                border: '0.75px solid var(--encre)',
              }}
            />
          </>
        )}
        <span
          className="absolute block rounded-full"
          style={{ left: 8, top: 8, width: m, height: m, border: '1.5px solid var(--encre)', background: 'var(--surface)' }}
        />
        <span
          className={`absolute block overflow-hidden rounded-full ${absent ? 'hach-x' : 'hach-1'}`}
          style={{
            left: 12,
            top: 12,
            width: disque,
            height: disque,
            backgroundColor: 'var(--surface)',
            border: '0.75px solid var(--encre)',
          }}
        >
          {absent ? (
            <span
              className="absolute flex items-center justify-center"
              style={{
                left: (disque - 0.36 * m - 4) / 2,
                top: (disque - 0.36 * m - 4) / 2,
                width: 0.36 * m + 4,
                height: 0.36 * m + 4,
                background: 'var(--surface)',
              }}
            >
              <Glyphe nom="absent" taille={Math.round(0.36 * m)} />
            </span>
          ) : (
            <span
              className="absolute block"
              style={{ left: (disque - buste) / 2, top: disque / 2 - (buste * 22) / 48, width: buste, height: buste }}
            >
              <CouvreChef numero={joueur.seat + 1} taille={m >= 60 ? 72 : 40} skin={skin} tirage={tirage} className="size-full" />
            </span>
          )}
        </span>
      </span>
      <span
        // Le nom entier : à la ligne plutôt que tronqué (deux lignes au plus —
        // au-delà, ce qui ne tient pas s'efface en points de suspension).
        className="line-clamp-2 w-full text-center"
        data-nom=""
        style={{
          overflowWrap: 'anywhere',
          fontSize: nomPx,
          lineHeight: nomPx >= 15 ? '20px' : '16px',
          fontWeight: estMoi ? 700 : 600,
        }}
      >
        {joueur.name}
      </span>
      <span
        className="t-statut block h-4 text-center whitespace-nowrap"
        style={{ color: fort ? 'var(--encre)' : undefined, fontWeight: fort ? 600 : undefined }}
      >
        {statut}
      </span>
      <span className="sr-only">siège {joueur.seat + 1}</span>
      <span className="sr-only">coiffé : {voix.nomCouvreChef(joueur.seat + 1)}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* La donne                                                            */
/* ------------------------------------------------------------------ */

/** La composition qui sera jouée à ce nombre de joueurs : celle du moteur ou celle de l'hôte. */
function compositionEffective(options: GameOptions, nombre: number): { loups: number; roles: readonly ChoosableRoleId[] } {
  return options.auto ? autoComposition(nombre) : { loups: options.loups, roles: options.roles };
}

function PanneauDonne({
  options,
  nombre,
  editable,
  voix,
  avecUnivers,
  bas,
}: {
  options: GameOptions;
  nombre: number;
  editable: boolean;
  voix: Voix;
  avecUnivers: boolean;
  bas: ReactNode;
}) {
  const large = useEstLarge();
  return (
    <section className="flex flex-col gap-4" aria-label="La donne" data-testid="donne-salon">
      <div className="flex flex-col gap-1">
        <TitreChapitre titre="La donne" large={large} />
        <span className="t-statut">publique pour toute la table — seules les cartes sont secrètes</span>
      </div>
      {avecUnivers && <ChoixSkin options={options} editable={editable} />}
      <Composition options={options} nombre={nombre} editable={editable} voix={voix} />
      {bas}
    </section>
  );
}

/** Le résumé d'une composition, en petites vignettes de rôle (décor : la phrase le dit en toutes lettres). */
function Vignettes({ options, nombre }: { options: GameOptions; nombre: number }) {
  const { loups, roles } = compositionEffective(options, nombre);
  return (
    <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-2 p-0" data-vignettes="">
      <Vignette role="loup" fois={loups} />
      {roles.map((role) => (
        <Vignette key={role} role={role} />
      ))}
    </ul>
  );
}

function Vignette({ role, fois }: { role: ChoosableRoleId | 'loup'; fois?: number }) {
  return (
    <li
      className="relative flex flex-col items-center justify-center"
      style={{ width: 46, height: 64, background: 'var(--creux)', border: '0.75px solid var(--filet-doux)', color: role === 'loup' || role === 'loupBlanc' ? 'var(--camp-meute)' : 'var(--encre)' }}
    >
      <SymboleRole role={role} taille={32} decoratif />
      {fois !== undefined && fois > 1 && (
        <span className="absolute bottom-0.5 text-[14px] leading-4 font-semibold" style={{ color: 'var(--camp-meute)' }}>
          ×{fois}
        </span>
      )}
    </li>
  );
}

/** « 2 loups · 6 rôles / 4 Villageois·e / pour 12 joueurs » : le résumé de la barre, étape de la donne. */
function ResumeDonne({ options, nombre, voix }: { options: GameOptions; nombre: number; voix: Voix }) {
  const { loups, roles } = compositionEffective(options, nombre);
  const meute = wolvesIn(loups, roles);
  const speciaux = roles.filter((role) => role !== 'loupBlanc').length;
  const simples = Math.max(0, nombre - meute - speciaux);
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
      <span className="t-statut" style={{ color: 'var(--encre)', fontWeight: 600 }}>
        {voix.compteLoups(meute)} · {pluriel(speciaux, 'rôle')}
      </span>
      <span className="t-statut" style={{ color: 'var(--encre)' }}>
        {simples} {voix.nomRole('villageois')}
      </span>
      <span className="t-statut">pour {pluriel(nombre, 'joueur')}</span>
    </div>
  );
}

/** Le récapitulatif, dernière étape : ce que la table va jouer, dit une dernière fois avant de lancer. */
function Recap({
  options,
  nombre,
  voix,
  aviser,
}: {
  options: GameOptions;
  nombre: number;
  voix: Voix;
  aviser: ReactNode;
}) {
  const { loups, roles } = compositionEffective(options, nombre);
  const charge = peauDuSkin(options.skin).charge;
  const secondes = (valeur: number): string =>
    valeur >= 120 && valeur % 60 === 0 ? `${String(valeur / 60)} minutes` : `${String(valeur)} secondes`;
  const lignes: [string, string][] = [
    ['La donne', `${phraseComposition(voix, loups, roles)} — les autres joueurs sont de simples ${voix.nomRole('villageois')}.`],
    [
      `Le ${charge}`,
      !options.capitaine
        ? 'Pas de charge à cette table.'
        : options.capitaineAvantNuit1
          ? 'Élu avant la première nuit.'
          : 'Élu au matin du premier jour.',
    ],
    ['Minuteries', `Nuit : ${secondes(options.tempsNuit)} par étape. Jour : ${secondes(options.tempsJour)}.`],
  ];
  return (
    <section className="flex flex-col gap-2" aria-label="Récapitulatif" data-testid="recap-salon">
      <Rubrique titre="Récapitulatif" aside="réglé par vous" />
      <dl className="m-0 flex flex-col gap-1.5">
        {lignes.map(([terme, definition]) => (
          <div key={terme} className="flex gap-3">
            <dt className="t-rubrique w-24 flex-none" style={{ color: 'var(--encre-2)' }}>
              {terme}
            </dt>
            <dd className="m-0 min-w-0 flex-1 text-sm leading-5">{definition}</dd>
          </div>
        ))}
      </dl>
      {aviser}
    </section>
  );
}

/**
 * Qui chasse la nuit : le mode automatique, ou la main de l'hôte.
 *
 * Derrière `auto`, trois façons de composer — les suggestions du moteur, le
 * hasard borné, la main mise — et toutes écrivent la même paire `loups` et
 * `roles`. La composition est publique ; c'est l'attribution qui est secrète.
 */
function Composition({
  options,
  nombre,
  editable,
  voix,
}: {
  options: GameOptions;
  nombre: number;
  editable: boolean;
  voix: Voix;
}) {
  const suggestionsDuSkin = peauDuSkin(options.skin).suggestions;
  /*
    Les suggestions du moteur, sans doublon : à six joueurs, la référence, la
    chasse et le village outillé du moteur coïncident — trois boutons identiques
    ne seraient pas trois choix. La composition seule décide de l'identité.
  */
  const brutes = suggestionsFor(nombre);
  const actives = brutes.filter(
    (suggestion, rang) =>
      brutes.findIndex(
        (autre) => autre.loups === suggestion.loups && memeRoles(autre.roles, suggestion.roles),
      ) === rang,
  );
  const reference = autoComposition(nombre);

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="sr-only">La composition</legend>
      <Vignettes options={options} nombre={nombre} />

      <Interrupteur
        id="auto"
        label="Composition automatique"
        hint={`Les ${voix.motLoups()} et les rôles suivent la référence du moteur, au nombre de joueurs du lancement.`}
        checked={options.auto}
        editable={editable}
        onToggle={(auto) => void reglerOptions({ auto })}
        separe={false}
      />

      {options.auto ? (
        <p className="m-0 text-sm leading-5">
          Pour {String(nombre)} joueur{nombre > 1 ? 's' : ''} aujourd'hui :{' '}
          <span className="font-semibold">{phraseComposition(voix, reference.loups, reference.roles)}</span>
          <span className="t-statut block">recalculée au nombre réel au lancement.</span>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm leading-5">
            Composition réglée :{' '}
            <span className="font-semibold" data-testid="composition-reglee">
              {phraseComposition(voix, options.loups, options.roles)}
            </span>
            <span className="t-statut block">les autres joueurs sont de simples {voix.nomRole('villageois')}.</span>
          </p>
          {/*
            Les suggestions du moteur : la référence, une chasse, un village
            outillé. Des cartouches cochables plutôt que des cases : on choisit
            une composition, on n'active pas une option.
          */}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Compositions suggérées">
            {actives.map((suggestion) => {
              const nomSuggestion = suggestionsDuSkin[brutes.indexOf(suggestion)];
              const active = options.loups === suggestion.loups && memeRoles(options.roles, suggestion.roles);
              return (
                <button
                  key={phraseComposition(voix, suggestion.loups, suggestion.roles)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!editable}
                  onClick={() => {
                    if (!editable || active) return;
                    void reglerOptions({ auto: false, loups: suggestion.loups, roles: [...suggestion.roles] });
                  }}
                  className="flex min-h-11 min-w-[9rem] flex-1 flex-col items-start px-2.5 py-2 text-left"
                  style={{
                    cursor: editable ? 'pointer' : 'default',
                    background: active ? 'var(--surface)' : 'transparent',
                    border: active ? '1.5px solid var(--filet)' : '1px solid var(--filet-doux)',
                    boxShadow: active ? 'inset 0 0 0 2px var(--surface), inset 0 0 0 2.75px var(--filet)' : undefined,
                    color: 'var(--encre)',
                  }}
                >
                  {nomSuggestion !== undefined && <span className="t-rubrique">{nomSuggestion.nom}</span>}
                  {nomSuggestion !== undefined && <span className="t-statut">{nomSuggestion.note}</span>}
                  <span className="text-[13px] leading-4">{phraseComposition(voix, suggestion.loups, suggestion.roles)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Bouton
              variante="secondaire"
              disabled={!editable}
              style={{ minHeight: 44, fontSize: 16 }}
              title="Le moteur tire des loups et des rôles dans des bornes cohérentes"
              onClick={() => {
                if (!editable) return;
                void reglerOptions({ auto: false, ...randomComposition(nombre, hasard) });
              }}
            >
              Au hasard
            </Bouton>
            <Bouton
              variante="secondaire"
              disabled={!editable}
              style={{ minHeight: 44, fontSize: 16, lineHeight: '18px' }}
              title={`Comme « Au hasard », mais le tirage peut aussi sortir des rôles optionnels (dès ${String(OPTIONAL_ROLE_MIN_PLAYERS.ancien)} joueurs ; ${voix.nomRole('loupBlanc')} dès ${String(OPTIONAL_ROLE_MIN_PLAYERS.loupBlanc)})`}
              onClick={() => {
                if (!editable) return;
                void reglerOptions({ auto: false, ...randomComposition(nombre, hasard, { optionnels: true }) });
              }}
            >
              Au hasard, rôles optionnels compris
            </Bouton>
          </div>

          {/*
            La main mise : les loups au compteur, les rôles un par un. Un de
            chaque au plus — le reste du village prend la carte du Villageois.
          */}
          <div className="flex flex-col gap-2 p-2" style={{ border: '1px solid var(--filet-doux)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id="loups-hint" className="flex items-center gap-2">
                <span style={{ color: 'var(--camp-meute)' }}>
                  <SymboleRole role="loup" taille={24} decoratif />
                </span>
                <span>
                  <span className="block text-[15px] leading-5 font-semibold" style={{ color: 'var(--camp-meute)' }}>
                    {majuscule(voix.motLoups())}
                  </span>
                  <span className="t-statut block">jamais autant que les autres</span>
                </span>
              </span>
              <PasAPas
                id="loups"
                label={`Nombre de ${voix.motLoups()}`}
                valeur={options.loups}
                min={1}
                max={Math.max(1, Math.floor((nombre - 1) / 2))}
                pas={1}
                nomPas="un loup"
                largeur={144}
                editable={editable}
                onCommit={(loups) => void reglerOptions({ loups })}
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Rôles spéciaux">
              {SPECIAL_ROLES.map((role) => (
                <CarteAcocher
                  key={role}
                  role={role}
                  retenu={options.roles.includes(role)}
                  editable={editable}
                  voix={voix}
                  onToggle={() => {
                    if (!editable) return;
                    const roles = options.roles.includes(role)
                      ? options.roles.filter((pris) => pris !== role)
                      : [...options.roles, role];
                    void reglerOptions({ roles });
                  }}
                />
              ))}
              <CarteVillage nombre={nombre} options={options} voix={voix} />
            </div>
            <RolesOptionnels options={options} nombre={nombre} editable={editable} voix={voix} />
          </div>
        </div>
      )}
    </fieldset>
  );
}

/** Une petite carte de rôle à cocher : le symbole, le nom, et — pour les optionnels — le mot « optionnel ». */
function CarteAcocher({
  role,
  retenu,
  editable,
  voix,
  onToggle,
  optionnel = false,
}: {
  role: ChoosableRoleId;
  retenu: boolean;
  editable: boolean;
  voix: Voix;
  onToggle: () => void;
  optionnel?: boolean;
}) {
  const meute = role === 'loupBlanc';
  const couleur = retenu ? 'var(--action-texte)' : meute ? 'var(--camp-meute)' : 'var(--encre)';
  return (
    <button
      type="button"
      aria-pressed={retenu}
      disabled={!editable}
      onClick={onToggle}
      className="flex min-h-[84px] min-w-0 flex-col items-start gap-0.5 px-1.5 pt-1.5 pb-1 text-left"
      style={{
        cursor: editable ? 'pointer' : 'default',
        background: retenu ? 'var(--action-fond)' : 'transparent',
        border: retenu ? '1.5px solid var(--filet)' : '1px solid var(--filet-doux)',
        color: couleur,
      }}
    >
      <SymboleRole role={role} taille={24} decoratif />
      <span className="block text-[14px] leading-4 font-semibold" style={{ overflowWrap: 'anywhere' }}>
        {majuscule(voix.nomRole(role))}
      </span>
      {optionnel ? <span className="t-statut" style={{ color: retenu ? 'var(--action-texte)' : undefined }}>optionnel</span> : null}
    </button>
  );
}

/** La carte du reste du village : pas un choix, un compte (le Villageois prend les sièges que personne n'a pris). */
function CarteVillage({ nombre, options, voix }: { nombre: number; options: GameOptions; voix: Voix }) {
  const meute = wolvesIn(options.loups, options.roles);
  const simples = Math.max(0, nombre - meute - options.roles.filter((role) => role !== 'loupBlanc').length);
  return (
    <div
      className="flex min-h-[84px] min-w-0 flex-col items-start gap-0.5 px-1.5 pt-1.5 pb-1"
      style={{ background: 'var(--creux)' }}
      data-carte-village=""
    >
      <SymboleRole role="villageois" taille={24} decoratif />
      <span className="block text-[14px] leading-4 font-semibold" style={{ overflowWrap: 'anywhere' }}>
        {voix.nomRole('villageois')}
      </span>
      <span className="t-statut">× {simples}, le reste</span>
    </div>
  );
}

/** Les rôles optionnels, v2 et v3 confondues : la table en coche ce qu'elle veut. */
const TOUS_OPTIONNELS = [...OPTIONAL_ROLES, ...OPTIONAL_ROLES_V3] as const;

/**
 * La seconde rangée : les rôles optionnels (v2 puis v3). Hors de la
 * référence et des suggestions, l'hôte les coche à toute table — le moteur
 * n'en refuse que ce que R13 refuse, et le bouton de lancement dit pourquoi.
 * Sous le seuil conseillé (R100), la table avertit sans interdire.
 */
function RolesOptionnels({
  options,
  nombre,
  editable,
  voix,
}: {
  options: GameOptions;
  nombre: number;
  editable: boolean;
  voix: Voix;
}) {
  const sousSeuil = TOUS_OPTIONNELS.filter((role) => nombre < OPTIONAL_ROLE_MIN_PLAYERS[role]);
  return (
    <div className="flex flex-col gap-1.5" data-testid="roles-optionnels">
      <p className="m-0 text-sm font-bold">
        Rôles optionnels
        <span className="t-statut pl-2 font-normal">pour aller plus loin — jamais dans la composition automatique</span>
      </p>
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Rôles optionnels">
        {TOUS_OPTIONNELS.map((role) => (
          <CarteAcocher
            key={role}
            role={role}
            retenu={options.roles.includes(role)}
            editable={editable}
            voix={voix}
            optionnel
            onToggle={() => {
              if (!editable) return;
              const roles = options.roles.includes(role)
                ? options.roles.filter((pris) => pris !== role)
                : [...options.roles, role];
              void reglerOptions({ roles });
            }}
          />
        ))}
      </div>
      {/* Le seuil conseillé (R100) : dit sans interdire, rôle par rôle. */}
      {sousSeuil.map((role) => (
        <SeuilConseille key={role} role={role} nombre={nombre} voix={voix} />
      ))}
    </div>
  );
}

function SeuilConseille({
  role,
  nombre,
  voix,
}: {
  role: OptionalRoleId | OptionalRoleIdV3;
  nombre: number;
  voix: Voix;
}) {
  const seuil = OPTIONAL_ROLE_MIN_PLAYERS[role];
  return (
    <p className="t-statut m-0" data-testid={`seuil-${role}`} style={{ color: 'var(--encre)' }}>
      {majuscule(voix.nomRole(role))} : Conseillé dès {String(seuil)} joueurs — la table en compte {String(nombre)}.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Les règles : minuteries, maison, univers                            */
/* ------------------------------------------------------------------ */

function PanneauRegles({
  options,
  nombre,
  editable,
  voix,
  avecUnivers,
  recap,
}: {
  options: GameOptions;
  nombre: number;
  editable: boolean;
  voix: Voix;
  avecUnivers: boolean;
  recap: ReactNode;
}) {
  const large = useEstLarge();
  return (
    <section className="flex flex-col gap-5" aria-label="Les règles de la table" data-testid="regles-salon">
      <TitreChapitre titre="Les règles" aside={editable ? 'vous décidez' : 'réglées par l’hôte'} large={large} />
      {avecUnivers && <ChoixSkin options={options} editable={editable} />}
      <Minuteries options={options} editable={editable} />
      <Interrupteurs options={options} editable={editable} voix={voix} />
      {!editable && (
        <p className="t-statut m-0">
          Seul l'hôte peut modifier les règles. Elles se figent au lancement de la partie et ne bougent
          plus jusqu'au bout de la nuit.
        </p>
      )}
      {recap}
    </section>
  );
}

/**
 * Les minuteries, bornées par le moteur.
 *
 * Une valeur hors borne ne se rapproche pas de la borne côté serveur (R10) :
 * elle retombe sur le défaut. Le champ borne donc lui-même avant d'envoyer —
 * sinon, taper « 5 » en route vers « 50 » remettrait la minuterie à son
 * défaut sans que personne n'ait rien choisi.
 */
function Minuteries({ options, editable }: { options: GameOptions; editable: boolean }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="p-0">
        <Rubrique titre="Les minuteries" aside="la nuit compte ses étapes, le jour son débat et son vote" />
      </legend>
      <div className="grid grid-cols-2 gap-3 max-[22rem]:grid-cols-1">
        <BrancheMinuteur
          id="tempsNuit"
          label="Temps de la nuit"
          lead={`chaque étape, ${String(NIGHT_SECONDS.min)} à ${String(NIGHT_SECONDS.max)} s`}
          valeur={options.tempsNuit}
          min={NIGHT_SECONDS.min}
          max={NIGHT_SECONDS.max}
          pas={5}
          editable={editable}
          onCommit={(tempsNuit) => void reglerOptions({ tempsNuit })}
        />
        <BrancheMinuteur
          id="tempsJour"
          label="Temps du jour"
          lead={`le débat et le vote, ${String(DAY_SECONDS.min)} à ${String(DAY_SECONDS.max)} s`}
          valeur={options.tempsJour}
          min={DAY_SECONDS.min}
          max={DAY_SECONDS.max}
          pas={15}
          editable={editable}
          onCommit={(tempsJour) => void reglerOptions({ tempsJour })}
        />
      </div>
    </fieldset>
  );
}

function BrancheMinuteur({
  id,
  label,
  lead,
  valeur,
  min,
  max,
  pas,
  editable,
  onCommit,
}: {
  id: string;
  label: string;
  lead: string;
  valeur: number;
  min: number;
  max: number;
  pas: number;
  editable: boolean;
  onCommit: (valeur: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id={`${id}-label`} className="text-[15px] leading-5 font-semibold">
        {label}
      </span>
      <span className="t-statut block min-h-8">{lead}</span>
      <PasAPas
        id={id}
        label={label}
        valeur={valeur}
        min={min}
        max={max}
        pas={pas}
        nomPas={`${String(pas)} secondes`}
        unite="s"
        editable={editable}
        onCommit={onCommit}
        decritPar={`${id}-label`}
      />
    </div>
  );
}

/**
 * Un nombre borné, pas à pas : « − » et « + » de 48, et au milieu un champ
 * patient avec la frappe.
 *
 * La valeur affichée est un brouillon tant que le champ a le focus : ce
 * n'est qu'en le quittant — ou à l'appui sur Entrée — que la valeur bornée
 * part au serveur. Effacer pour retaper ne doit envoyer rien du tout.
 */
function PasAPas({
  id,
  label,
  valeur,
  min,
  max,
  pas,
  nomPas,
  unite,
  largeur,
  editable,
  onCommit,
  decritPar,
}: {
  id: string;
  label: string;
  valeur: number;
  min: number;
  max: number;
  pas: number;
  nomPas: string;
  unite?: string;
  largeur?: number;
  editable: boolean;
  onCommit: (valeur: number) => void;
  decritPar?: string;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? String(valeur);
  const borne = (n: number): number => Math.min(max, Math.max(min, n));

  const valider = () => {
    if (brouillon === null) return;
    setBrouillon(null);
    const entier = Math.round(Number.parseInt(brouillon, 10));
    if (Number.isNaN(entier) || entier === valeur) return;
    onCommit(borne(entier));
  };

  const bouton = (sens: -1 | 1) => {
    const eteint = !editable || (sens < 0 ? valeur <= min : valeur >= max);
    return (
      <button
        type="button"
        disabled={eteint}
        aria-label={`${label} : ${sens < 0 ? 'moins' : 'plus'} ${nomPas}`}
        onClick={() => {
          setBrouillon(null);
          onCommit(borne(valeur + sens * pas));
        }}
        className="grid size-12 flex-none place-items-center p-0"
        style={{
          background: 'transparent',
          color: eteint ? 'var(--encre-2)' : 'var(--encre)',
          border: eteint ? '1.5px dashed var(--filet-doux)' : '1.5px solid var(--filet)',
          cursor: eteint ? 'default' : 'pointer',
        }}
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
          <path d={sens < 0 ? 'M6 12h12' : 'M6 12h12M12 6v12'} />
        </svg>
      </button>
    );
  };

  return (
    <div role="group" aria-label={label} className="flex min-w-0" style={largeur === undefined ? undefined : { width: largeur }}>
      {bouton(-1)}
      <span className="relative flex min-w-0 flex-1">
        <input
          type="number"
          inputMode="numeric"
          id={id}
          value={affiche}
          min={min}
          max={max}
          step={pas}
          disabled={!editable}
          aria-label={label}
          aria-describedby={decritPar}
          onChange={(event) => {
            if (editable) setBrouillon(event.target.value);
          }}
          onBlur={valider}
          onKeyDown={(event) => {
            if (event.key === 'Enter') valider();
          }}
          className="champ h-12 min-w-0 px-0 text-center text-xl font-semibold tabular-nums"
          style={{ minHeight: 48, color: editable ? undefined : 'var(--encre-2)', MozAppearance: 'textfield' }}
        />
        {unite !== undefined && (
          <span aria-hidden="true" className="t-statut pointer-events-none absolute top-1/2 right-1 -translate-y-1/2">
            {unite}
          </span>
        )}
      </span>
      {bouton(1)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Les cases                                                           */
/* ------------------------------------------------------------------ */

type CleInterrupteur = Extract<
  keyof GameOptions,
  | 'capitaine'
  | 'capitaineAvantNuit1'
  | 'chasseurEmpoisonne'
  | 'sorciereSeSauve'
  | 'ancienRancunier'
  | 'chat'
  | 'revelerRoles'
  | 'mortsVoientTout'
  | 'abandon'
>;

/**
 * Les cases de la table, chacune avec la phrase de ce qu'elle change.
 * Les noms de rôles viennent de la voix du skin : aucun n'est écrit en dur.
 */
const REGLAGES: readonly {
  cle: CleInterrupteur;
  label: (voix: Voix, charge: string) => string;
  hint: (voix: Voix, charge: string) => string;
}[] = [
  {
    cle: 'capitaine',
    label: (_voix, charge) => `Élire ${charge}`,
    hint: (_voix, charge) =>
      `La table élit ${charge} : sa voix compte double au vote du village, et mort, il désigne son successeur.`,
  },
  {
    cle: 'capitaineAvantNuit1',
    label: () => 'Élection avant la première nuit',
    hint: () =>
      'Par défaut l’élection a lieu au matin du premier jour. Ici, avant la nuit 1 : celui qui ne survivra pas à la nuit vote quand même.',
  },
  {
    cle: 'chasseurEmpoisonne',
    label: (voix) => `${majuscule(voix.nomRole('chasseur'))} empoisonné tire`,
    hint: (voix) =>
      `Par défaut, ${voix.nomRole('chasseur')} mort empoisonné ou de chagrin n’emporte personne. Ici, il tire quelle que soit sa mort.`,
  },
  {
    cle: 'sorciereSeSauve',
    label: (voix) => `${majuscule(voix.nomRole('sorciere'))} peut se sauver`,
    hint: (voix) =>
      `${majuscule(voix.nomRole('sorciere'))} peut servir sa potion de vie sur elle-même quand la meute l’attaque. Désactivé, elle ne le peut pas.`,
  },
  {
    cle: 'ancienRancunier',
    label: (voix) => `Rancune ${deNom(voix.nomRole('ancien'))}`,
    hint: (voix) =>
      `Si ${voix.nomRole('ancien')} meurt de la main du village — vote, tir ou poison —, tous les pouvoirs du village s’éteignent avec lui. Désactivé, il meurt sans se venger.`,
  },
  {
    cle: 'chat',
    label: () => 'Le fil du village',
    hint: () =>
      'Un fil de discussion écrit le jour. Sans lui, on parle à voix haute autour de la table — le canal secret de la meute, lui, existe toujours.',
  },
  {
    cle: 'revelerRoles',
    label: () => 'Rôles révélés des morts',
    hint: (voix) =>
      `La carte d’un mort se retourne devant tous. Sans cela, elle reste cachée — sauf deux que le jeu retourne de lui-même : ${voix.nomRole('chasseur')} au moment de tirer, et ${voix.nomRole('idiot')} à sa grâce.`,
  },
  {
    cle: 'mortsVoientTout',
    label: () => 'Les morts voient tout',
    hint: () =>
      'Les morts connaissent les rôles de tous et lisent les canaux secrets : la partie est finie pour eux.',
  },
  {
    // R101 : l'option moteur `abandon`, longtemps sans case au salon.
    cle: 'abandon',
    label: () => 'Mort d’abandon',
    hint: () =>
      'Un vivant absent depuis cinq minutes meurt d’abandon à la fin de la phase, sans pouvoir : ni tir, ni rancune. Désactivé, la table attend ses absents.',
  },
];

/** « de l’Ancien », « du Corbeau », « de la Petite Fille » : le nom du skin porte déjà son article. */
function deNom(nom: string): string {
  if (/^le /i.test(nom)) return `du ${nom.slice(3)}`;
  if (/^les /i.test(nom)) return `des ${nom.slice(4)}`;
  return `de ${nom}`;
}

function Interrupteurs({
  options,
  editable,
  voix,
}: {
  options: GameOptions;
  editable: boolean;
  voix: Voix;
}) {
  // La Sorcière n'existe pas toujours : en composition automatique elle est
  // toujours là (R20), en manuel l'hôte peut la retirer.
  const charge = peauDuSkin(options.skin).charge;
  const sorciereEnJeu = options.auto || options.roles.includes('sorciere');
  // L'Ancien n'entre jamais dans la composition automatique (R90).
  const ancienEnJeu = !options.auto && options.roles.includes('ancien');
  return (
    <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
      <legend className="p-0 pb-1">
        <Rubrique titre="La maison" aside="les règles qui changent vraiment la partie, dites en toutes lettres" />
      </legend>
      <div className="flex flex-col">
        {REGLAGES.map((reglage, rang) => (
          <Interrupteur
            key={reglage.cle}
            id={reglage.cle}
            separe={rang > 0}
            label={reglage.label(voix, charge)}
            hint={
              reglage.cle === 'capitaineAvantNuit1' && !options.capitaine
                ? `${reglage.hint(voix, charge)} Nécessite un capitaine.`
                : reglage.cle === 'sorciereSeSauve' && !sorciereEnJeu
                  ? `${reglage.hint(voix, charge)} Sans effet : aucune ${voix.nomRole('sorciere')} dans la composition.`
                  : reglage.cle === 'ancienRancunier' && !ancienEnJeu
                    ? `${reglage.hint(voix, charge)} Sans effet : ${voix.nomRole('ancien')} n’est pas dans la composition — cochez-le parmi les rôles optionnels.`
                    : reglage.hint(voix, charge)
            }
            checked={options[reglage.cle]}
            editable={
              editable &&
              !(reglage.cle === 'capitaineAvantNuit1' && !options.capitaine) &&
              !(reglage.cle === 'sorciereSeSauve' && !sorciereEnJeu) &&
              !(reglage.cle === 'ancienRancunier' && !ancienEnJeu)
            }
            onToggle={(valeur) => void reglerOptions(bascule(reglage.cle, valeur))}
          />
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Le skin                                                             */
/* ------------------------------------------------------------------ */

/** Une miniature d'univers (32 × 32) : les toits de Thiercelieux, ou le Mur de Shiganshina. */
function MiniUnivers({ skin }: { skin: string }) {
  const miniature = gravuresDuSkin(skin)?.miniature ?? MINIATURE_COMMUNE;
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" className="flex-none" style={{ display: 'block' }}>
      <rect width="32" height="32" fill="url(#hach-h-e)" opacity=".5" />
      <path d={miniature.silhouette} fill="var(--surface)" stroke="var(--encre)" strokeWidth="1" />
      <path d={miniature.silhouette} fill={miniature.hachure} />
      {miniature.detail.sorte === 'rectangle' ? (
        <rect
          x={miniature.detail.x}
          y={miniature.detail.y}
          width={miniature.detail.largeur}
          height={miniature.detail.hauteur}
          fill="var(--encre)"
        />
      ) : (
        <path d={miniature.detail.d} fill="var(--encre)" />
      )}
    </svg>
  );
}

/**
 * L'univers de la table : l'hôte choisit, les autres lisent.
 *
 * Le skin ne change rien à la mécanique (D6) : seulement les noms, les
 * phrases et l'habit. Chaque univers se présente par sa petite planche, son
 * nom et ce qu'on y croisera — ses rôles, dans sa propre voix.
 */
function ChoixSkin({ options, editable }: { options: GameOptions; editable: boolean }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="p-0 pb-1">
        <Rubrique titre="L’univers" aside="change les noms et l’ambiance, jamais les règles" />
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Univers de la table">
        {SKINS.map((skin) => {
          const actif = options.skin === skin.id || (!SKINS.some((autre) => autre.id === options.skin) && skin === SKINS[0]);
          const apercu = [skin.roles.loup.nom, skin.roles.voyante.nom, skin.roles.sorciere.nom, skin.roles.chasseur.nom];
          return (
            <button
              key={skin.id}
              type="button"
              role="radio"
              aria-checked={actif}
              disabled={!editable}
              onClick={() => {
                if (!editable || actif) return;
                void reglerOptions({ skin: skin.id });
              }}
              className="relative flex min-h-12 min-w-[9rem] flex-1 items-center gap-2 px-2 py-1.5 text-left"
              style={{
                cursor: editable ? 'pointer' : 'default',
                background: actif ? 'var(--surface)' : 'transparent',
                border: actif ? '1.5px solid var(--filet)' : '1px solid var(--filet-doux)',
                color: 'var(--encre)',
              }}
            >
              {actif && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 block" style={{ border: '0.75px solid var(--filet)' }} />
              )}
              <MiniUnivers skin={skin.id} />
              <span className="block min-w-0">
                <span className="block text-[14px] leading-4 font-semibold">{skin.univers}</span>
                <span className="t-statut block">{apercu.join(' · ')}…</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

