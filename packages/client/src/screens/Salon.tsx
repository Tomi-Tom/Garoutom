/**
 * Le salon : la table qui se remplit.
 *
 * Chaque arrivée allume une fenêtre du village — c'est ici que la partie se
 * décide, et tout l'écran est fait pour qu'elle se décide à plusieurs. La
 * composition choisie est publique : c'est l'attribution des cartes qui est
 * secrète, et le salon peut afficher « 2 loups · la Voyante · la Sorcière »
 * sans rien dévoiler. L'hôte règle, les autres lisent — en lecture seule,
 * mais sans rien perdre de l'explication : arriver à une table sans savoir
 * à quoi on joue est le meilleur moyen de se croire volé au premier mort.
 */

import { BoutonSon, LienArcade } from '@tombp/arcade';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  autoComposition,
  compositionFor,
  DAY_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_SECONDS,
  OPTIONAL_ROLE_MIN_PLAYERS,
  OPTIONAL_ROLES,
  randomComposition,
  SPECIAL_ROLES,
  suggestionsFor,
  wolvesIn,
  type GameOptions,
  type PlayerInfo,
  type RoomView,
  type Rng,
  type ChoosableRoleId,
  type OptionalRoleId,
} from '@garoutom/engine';

import { RESSORT_CARTE, RESSORT_PANNEAU } from '../anim/tokens.js';
import { Interrupteur } from '../components/Interrupteur.js';
import { BoutonReglages } from '../components/Reglages.js';
import { SymboleRole } from '../components/habit/Symbole.js';
import { BoutonRegles } from '../components/Regles.js';
import { lancerPartie, quitterTable, reglerOptions } from '../lib/actions.js';
import { ARCADE_ID } from '../lib/identity.js';
import { useVoix } from '../lib/partie.js';
import { useStore } from '../lib/store.js';
import { peauDuSkin, SKINS, type Voix } from '../skins/registre.js';

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

export function Salon({ room }: { room: RoomView }) {
  const playerId = useStore((state) => state.playerId);
  const decalage = useStore((state) => state.decalageHorloge);
  const pushNotice = useStore((state) => state.pushNotice);

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

  return (
    <div data-testid="salon" className="min-h-full overflow-auto p-4 sm:p-6">
      <motion.main
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={RESSORT_PANNEAU}
        className="mx-auto flex w-[min(56rem,100%)] flex-col gap-4"
      >
        {/* --- Le code : la seule chose qu'on ait à transmettre --- */}
        <header className="carte flex flex-wrap items-center justify-between gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="flex items-center gap-4">
            <LienArcade id={ARCADE_ID} className="shrink-0" />
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.14em] uppercase"
                style={{ color: 'var(--papier-doux)' }}
              >
                Code de la table
              </p>
              {/* La fonction d'un code est de se recopier : mono, gros, chasse
                  fixe — quatre lettres qui ne se lisent pas en chiffre. */}
              <p className="font-mono text-[2.5rem] leading-none font-bold tracking-[0.18em]">
                {room.code}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BoutonRegles />
            <BoutonReglages />
            <BoutonSon />
            <button type="button" onClick={() => void copierCode()} className="btn-voisin min-h-11 px-3">
              Copier le code
            </button>
            <button type="button" onClick={() => void copierLien()} className="btn-voisin min-h-11 px-3">
              Copier le lien d’invitation
            </button>
            <button type="button" onClick={() => void quitterTable()} className="btn-voisin min-h-11 px-3">
              Quitter
            </button>
          </div>
        </header>

        {/* --- Les sièges --- */}
        <section className="carte p-4 sm:p-5">
          <TitreSection
            title="Autour de la table"
            aside={
              assezDeMonde
                ? `${String(nombre)} joueur${nombre > 1 ? 's' : ''} · prêts à lancer`
                : `${String(nombre)} joueur${nombre > 1 ? 's' : ''} · il en manque ${String(manque)} pour lancer`
            }
          />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {assis.map((joueur) => (
              <RangeeJoueur
                key={joueur.id}
                joueur={joueur}
                estMoi={joueur.id === playerId}
                arrive={arrivees.includes(joueur.id)}
                maintenant={maintenant}
              />
            ))}
            {libres > 0 && (
              <li
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm sm:col-span-2"
                style={{ color: 'var(--papier-doux)', boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}
              >
                {String(libres)} place{libres > 1 ? 's' : ''} libre{libres > 1 ? 's' : ''} — la table
                accepte jusqu'à {String(MAX_PLAYERS)} joueurs.
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs max-sm:sr-only" style={{ color: 'var(--papier-doux)' }}>
            Les sièges suivent l'ordre d'arrivée, et ils fixent l'ordre du tour de parole. Une
            place perdue en cours de route tient le temps du délai de grâce, puis se libère.
          </p>
        </section>

        {/* --- Les règles de la table --- */}
        <section className="carte p-4 sm:p-5" data-testid="regles-salon">
          <TitreSection
            title="Les règles de la table"
            aside={hote ? 'vous décidez' : 'réglées par l’hôte'}
          />
          <div className="mt-4 flex flex-col gap-6">
            <ChoixSkin options={room.options} editable={hote} />
            <Composition options={room.options} nombre={nombre} editable={hote} voix={voix} />
            <Minuteries options={room.options} editable={hote} />
            <Interrupteurs options={room.options} editable={hote} voix={voix} />
          </div>
          {!hote && (
            <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--papier-doux)' }}>
              Seul l'hôte peut modifier les règles. Elles se figent au lancement de la partie et ne
              bougent plus jusqu'au bout de la nuit.
            </p>
          )}
        </section>

        {/*
          Le lancement reste sous le pouce. En flux, il tombait au bas d'un
          document de trois écrans : l'hôte devait redescendre tout le salon
          pour lancer, à chaque fois qu'un joueur arrivait. Amarré, il ne
          bouge plus ; là où la place existe, il reprend sa position en flux.
        */}
        <div
          className="sticky bottom-0 -mx-4 flex flex-col border-t bg-nuit px-4 pt-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"
          style={{ borderColor: 'var(--arcade-trait)' }}
        >
          {hote ? (
            <>
              <button
                type="button"
                onClick={() => void lancerPartie()}
                disabled={!peutLancer}
                aria-describedby={peutLancer ? undefined : 'raison-lancement'}
                className="btn-village px-4 py-4 text-lg"
              >
                Lancer la partie
              </button>
              {!peutLancer && (
                <p
                  id="raison-lancement"
                  className="pt-2 text-center text-sm"
                  style={{ color: assezDeMonde ? 'var(--sang)' : 'var(--papier-doux)' }}
                >
                  {assezDeMonde
                    ? `La composition ne tient pas pour ${String(nombre)} joueurs : ${erreurComposition ?? ''}. Changez-la ci-dessus.`
                    : `Il faut ${String(MIN_PLAYERS)} joueurs pour lancer — ${String(nombre)} à la table, il en manque ${String(manque)}. Partagez le code ou le lien d’invitation.`}
                </p>
              )}
            </>
          ) : (
            <p className="py-3 text-center text-sm" style={{ color: 'var(--papier-doux)' }}>
              {peutLancer
                ? 'Tout est prêt — l’hôte peut lancer la partie.'
                : assezDeMonde
                  ? 'La composition de l’hôte ne tient pas encore : il doit la corriger avant de lancer.'
                  : `En attente de joueurs : ${String(nombre)} à la table, ${String(MIN_PLAYERS)} au moins — il en manque ${String(manque)}.`}
            </p>
          )}
        </div>
      </motion.main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Les sièges                                                          */
/* ------------------------------------------------------------------ */

/**
 * Une place à la table : le nom, le siège, et ce que la table a le droit d'en
 * dire. Rien ne trahit un rôle — il n'est même pas encore distribué.
 */
function RangeeJoueur({
  joueur,
  estMoi,
  arrive,
  maintenant,
}: {
  joueur: PlayerInfo;
  estMoi: boolean;
  arrive: boolean;
  maintenant: number;
}) {
  const initial = joueur.name.trim().charAt(0).toUpperCase() || '?';
  const reprise =
    joueur.disconnectedUntil === null
      ? null
      : Math.max(0, Math.ceil((joueur.disconnectedUntil - maintenant) / 1000));

  return (
    <motion.li
      layout
      transition={RESSORT_CARTE}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--nuit-creux)',
        boxShadow: estMoi
          ? 'inset 0 0 0 1px var(--lanterne), inset 0 0 0 2px var(--nuit-creux)'
          : 'inset 0 0 0 1px var(--arcade-trait)',
      }}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full font-identite text-lg font-bold"
        style={{ background: 'var(--nuit)', color: 'var(--lanterne)', border: '1px solid var(--arcade-trait)' }}
      >
        {initial}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold">
          {joueur.name}
          {estMoi && <span style={{ color: 'var(--papier-doux)' }}> (vous)</span>}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--papier-doux)' }}>
          siège {String(joueur.seat + 1)}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        {joueur.isHost && <Badge couleur="var(--lanterne)">Hôte</Badge>}
        {arrive && <Badge couleur="var(--lune)">a rejoint</Badge>}
        {!joueur.connected && (
          <Badge couleur="var(--sang)">
            Absent{reprise === null ? '' : ` · ${String(reprise)} s`}
          </Badge>
        )}
      </span>
    </motion.li>
  );
}

/** Un badge se lit par son texte ; la couleur ne fait que l'accompagner. */
function Badge({ couleur, children }: { couleur: string; children: ReactNode }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase"
      style={{ color: couleur, border: `1px solid color-mix(in srgb, ${couleur} 45%, transparent)` }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* La composition                                                      */
/* ------------------------------------------------------------------ */

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
    <fieldset className="border-0 p-0">
      <legend className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold">La composition</span>
        <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
          publique pour toute la table — seules les cartes sont secrètes
        </span>
      </legend>

      <Interrupteur
        id="auto"
        label="Composition automatique"
        hint={`Les ${voix.motLoups()} et les rôles suivent la référence du moteur, au nombre de joueurs du lancement.`}
        checked={options.auto}
        editable={editable}
        onToggle={(auto) => void reglerOptions({ auto })}
      />

      {options.auto ? (
        <p className="mt-2 rounded-lg px-3 py-2.5 text-sm" style={{ boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}>
          Pour {String(nombre)} joueur{nombre > 1 ? 's' : ''} aujourd'hui :{' '}
          <span className="font-semibold">{phraseComposition(voix, reference.loups, reference.roles)}</span>
          <span className="block text-xs" style={{ color: 'var(--papier-doux)' }}>
            recalculée au nombre réel au lancement.
          </span>
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          <p className="rounded-lg px-3 py-2.5 text-sm" style={{ boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}>
            Composition réglée :{' '}
            <span className="font-semibold" data-testid="composition-reglee">
              {phraseComposition(voix, options.loups, options.roles)}
            </span>
            <span className="block text-xs" style={{ color: 'var(--papier-doux)' }}>
              les autres joueurs sont de simples {voix.nomRole('villageois')}.
            </span>
          </p>
          {/*
            Les suggestions du moteur : la référence, une chasse, un village
            outillé. Des boutons cochables plutôt que des cases : on choisit
            une composition, on n'active pas une option.
          */}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Compositions suggérées">
            {actives.map((suggestion) => {
              const nomSuggestion = suggestionsDuSkin[brutes.indexOf(suggestion)];
              const active =
                options.loups === suggestion.loups && memeRoles(options.roles, suggestion.roles);
              return (
                <button
                  key={phraseComposition(voix, suggestion.loups, suggestion.roles)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!editable}
                  title={nomSuggestion?.note}
                  onClick={() => {
                    if (!editable || active) return;
                    void reglerOptions({ auto: false, loups: suggestion.loups, roles: [...suggestion.roles] });
                  }}
                  className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                  style={{
                    cursor: editable ? 'pointer' : 'default',
                    background: active ? 'color-mix(in srgb, var(--lanterne) 12%, transparent)' : 'transparent',
                    boxShadow: active
                      ? 'inset 0 0 0 1px color-mix(in srgb, var(--lanterne) 55%, transparent)'
                      : 'inset 0 0 0 1px var(--arcade-trait)',
                    color: active ? 'var(--papier)' : 'var(--papier-doux)',
                  }}
                >
                  {nomSuggestion !== undefined && (
                    <span className="block text-[11px] font-bold tracking-[0.06em] uppercase">
                      {nomSuggestion.nom}
                    </span>
                  )}
                  {phraseComposition(voix, suggestion.loups, suggestion.roles)}
                </button>
              );
            })}
            <button
              type="button"
              disabled={!editable}
              onClick={() => {
                if (!editable) return;
                void reglerOptions({ auto: false, ...randomComposition(nombre, hasard) });
              }}
              className="btn-voisin min-h-11 px-3 py-1.5 text-sm"
              title="Le moteur tire des loups et des rôles dans des bornes cohérentes"
            >
              Au hasard
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={() => {
                if (!editable) return;
                void reglerOptions({ auto: false, ...randomComposition(nombre, hasard, { optionnels: true }) });
              }}
              className="btn-voisin min-h-11 px-3 py-1.5 text-sm"
              title={`Comme « Au hasard », mais le tirage peut aussi sortir des rôles optionnels (dès ${String(OPTIONAL_ROLE_MIN_PLAYERS.ancien)} joueurs ; ${voix.nomRole('loupBlanc')} dès ${String(OPTIONAL_ROLE_MIN_PLAYERS.loupBlanc)})`}
            >
              Au hasard, rôles optionnels compris
            </button>
          </div>

          {/*
            La main mise : les loups au compteur, les rôles un par un. Un de
            chaque au plus — le reste du village prend la carte du Villageois.
          */}
          <div className="grid gap-3 rounded-lg p-3" style={{ boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id="loups-hint" className="text-sm font-bold">
                {voix.motLoups().replace(/^./, (lettre) => lettre.toUpperCase())}
                <span className="pl-2 text-xs font-normal" style={{ color: 'var(--papier-doux)' }}>
                  jamais autant que les autres
                </span>
              </span>
              <ChampNombre
                id="loups"
                label={`Nombre de ${voix.motLoups()}`}
                valeur={options.loups}
                min={1}
                max={Math.max(1, Math.floor((nombre - 1) / 2))}
                editable={editable}
                onCommit={(loups) => void reglerOptions({ loups })}
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rôles spéciaux">
              {SPECIAL_ROLES.map((role) => {
                const retenu = options.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={retenu}
                    disabled={!editable}
                    onClick={() => {
                      if (!editable) return;
                      const roles = retenu
                        ? options.roles.filter((pris) => pris !== role)
                        : [...options.roles, role];
                      void reglerOptions({ roles });
                    }}
                    className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                    style={{
                      cursor: editable ? 'pointer' : 'default',
                      background: retenu ? 'color-mix(in srgb, var(--lanterne) 12%, transparent)' : 'transparent',
                      boxShadow: retenu
                        ? 'inset 0 0 0 1px color-mix(in srgb, var(--lanterne) 55%, transparent)'
                        : 'inset 0 0 0 1px var(--arcade-trait)',
                      color: retenu ? 'var(--papier)' : 'var(--papier-doux)',
                    }}
                  >
                    {voix.nomRole(role)}
                  </button>
                );
              })}
            </div>
            <RolesOptionnels options={options} nombre={nombre} editable={editable} voix={voix} />
          </div>
        </div>
      )}
    </fieldset>
  );
}

/**
 * La seconde rangée : les rôles optionnels de la v2 (R90). Hors de la
 * référence et des suggestions, l'hôte les coche à toute table — le moteur
 * n'en refuse que ce que R13 refuse, et le bouton de lancement dit pourquoi.
 * Sous le seuil conseillé (R100), la carte avertit sans interdire.
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
  return (
    <div className="flex flex-col gap-2" data-testid="roles-optionnels">
      <p className="text-sm font-bold">
        Rôles optionnels
        <span className="pl-2 text-xs font-normal" style={{ color: 'var(--papier-doux)' }}>
          pour aller plus loin — jamais dans la composition automatique
        </span>
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2" role="group" aria-label="Rôles optionnels">
        {OPTIONAL_ROLES.map((role) => (
          <CaseRoleOptionnel
            key={role}
            role={role}
            retenu={options.roles.includes(role)}
            nombre={nombre}
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
      </div>
    </div>
  );
}

function CaseRoleOptionnel({
  role,
  retenu,
  nombre,
  editable,
  voix,
  onToggle,
}: {
  role: OptionalRoleId;
  retenu: boolean;
  nombre: number;
  editable: boolean;
  voix: Voix;
  onToggle: () => void;
}) {
  const seuil = OPTIONAL_ROLE_MIN_PLAYERS[role];
  const sousSeuil = nombre < seuil;
  return (
    <button
      type="button"
      aria-pressed={retenu}
      disabled={!editable}
      onClick={onToggle}
      className="flex min-h-11 gap-3 rounded-lg p-3 text-left transition"
      style={{
        cursor: editable ? 'pointer' : 'default',
        background: retenu ? 'color-mix(in srgb, var(--lanterne) 12%, transparent)' : 'transparent',
        boxShadow: retenu
          ? 'inset 0 0 0 1px color-mix(in srgb, var(--lanterne) 55%, transparent)'
          : 'inset 0 0 0 1px var(--arcade-trait)',
        color: retenu ? 'var(--papier)' : 'var(--papier-doux)',
      }}
    >
      <span className="shrink-0">
        <SymboleRole role={role} taille={28} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold">{majuscule(voix.nomRole(role))}</span>
        <span className="text-xs leading-snug font-normal">{voix.descriptionRole(role)}</span>
        {sousSeuil ? (
          <span
            className="text-[11px] font-semibold"
            style={{ color: 'var(--lanterne)' }}
            data-testid={`seuil-${role}`}
          >
            Conseillé dès {String(seuil)} joueurs — la table en compte {String(nombre)}.
          </span>
        ) : (
          <span className="text-[11px] font-normal">Conseillé dès {String(seuil)} joueurs.</span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Les minuteries                                                      */
/* ------------------------------------------------------------------ */

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
    <fieldset className="border-0 p-0">
      <legend className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold">Les minuteries</span>
        <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
          la nuit compte ses étapes, le jour son débat et son vote
        </span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <BrancheMinuteur
          id="tempsNuit"
          label="Temps de la nuit"
          lead={`chaque étape, ${String(NIGHT_SECONDS.min)} à ${String(NIGHT_SECONDS.max)} s`}
          valeur={options.tempsNuit}
          min={NIGHT_SECONDS.min}
          max={NIGHT_SECONDS.max}
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
  editable,
  onCommit,
}: {
  id: string;
  label: string;
  lead: string;
  valeur: number;
  min: number;
  max: number;
  editable: boolean;
  onCommit: (valeur: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}>
      <span id={`${id}-label`} className="text-sm font-bold">
        {label}
        <span className="block text-xs font-normal" style={{ color: 'var(--papier-doux)' }}>
          {lead}
        </span>
      </span>
      <ChampNombre
        id={id}
        label={label}
        valeur={valeur}
        min={min}
        max={max}
        editable={editable}
        onCommit={onCommit}
        decritPar={`${id}-label`}
      />
    </div>
  );
}

/**
 * Un nombre borné, patient avec la frappe.
 *
 * La valeur affichée est un brouillon tant que le champ a le focus : ce
 * n'est qu'en le quittant — ou à l'appui sur Entrée — que la valeur bornée
 * part au serveur. Effacer pour retaper ne doit envoyer rien du tout.
 */
function ChampNombre({
  id,
  label,
  valeur,
  min,
  max,
  editable,
  onCommit,
  decritPar,
}: {
  id: string;
  label: string;
  valeur: number;
  min: number;
  max: number;
  editable: boolean;
  onCommit: (valeur: number) => void;
  decritPar?: string;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? String(valeur);

  const valider = () => {
    if (brouillon === null) return;
    setBrouillon(null);
    const entier = Math.round(Number.parseInt(brouillon, 10));
    if (Number.isNaN(entier) || entier === valeur) return;
    onCommit(Math.min(max, Math.max(min, entier)));
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        id={id}
        value={affiche}
        min={min}
        max={max}
        step={5}
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
        className="champ w-24 py-1.5 text-center font-mono text-base font-bold tabular-nums"
      />
      <span aria-hidden="true" className="font-mono text-sm" style={{ color: 'var(--papier-doux)' }}>
        s
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Les interrupteurs                                                   */
/* ------------------------------------------------------------------ */

type CleInterrupteur = Extract<
  keyof GameOptions,
  'capitaine' | 'capitaineAvantNuit1' | 'chasseurEmpoisonne' | 'sorciereSeSauve' | 'ancienRancunier' | 'chat' | 'revelerRoles' | 'mortsVoientTout'
>;

/**
 * Les interrupteurs de la table, chacun avec la phrase de ce qu'il change.
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
];

/** « de l’Ancien », « du Corbeau », « de la Petite Fille » : le nom du skin porte déjà son article. */
function deNom(nom: string): string {
  if (/^le /i.test(nom)) return `du ${nom.slice(3)}`;
  if (/^les /i.test(nom)) return `des ${nom.slice(4)}`;
  return `de ${nom}`;
}

function majuscule(texte: string): string {
  return texte.replace(/^./, (lettre) => lettre.toUpperCase());
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
    <fieldset className="border-0 p-0">
      <legend className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold">La maison</span>
        <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
          les règles qui changent vraiment la partie, dites en toutes lettres
        </span>
      </legend>
      <div className="grid gap-2 lg:grid-cols-2">
        {REGLAGES.map((reglage) => (
          <Interrupteur
            key={reglage.cle}
            id={reglage.cle}
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

/**
 * L'univers de la table : l'hôte choisit, les autres lisent.
 *
 * Le skin ne change rien à la mécanique (D6) : seulement les noms, les
 * phrases et l'habit. Chaque univers se présente par son nom et par ce qu'on
 * y croisera — ses rôles, dans sa propre voix.
 */
function ChoixSkin({ options, editable }: { options: GameOptions; editable: boolean }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold">L’univers</span>
        <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
          change les noms et l’ambiance, jamais les règles
        </span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Univers de la table">
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
              className="flex min-h-11 flex-col gap-0.5 rounded-lg p-3 text-left transition"
              style={{
                cursor: editable ? 'pointer' : 'default',
                background: actif ? 'color-mix(in srgb, var(--lanterne) 12%, transparent)' : 'transparent',
                boxShadow: actif
                  ? 'inset 0 0 0 1px color-mix(in srgb, var(--lanterne) 55%, transparent)'
                  : 'inset 0 0 0 1px var(--arcade-trait)',
                color: actif ? 'var(--papier)' : 'var(--papier-doux)',
              }}
            >
              <span className="font-identite text-lg leading-tight font-bold">{skin.univers}</span>
              <span className="text-xs leading-snug">{apercu.join(' · ')}…</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Le meuble commun                                                    */
/* ------------------------------------------------------------------ */

function TitreSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2"
      style={{ borderColor: 'var(--arcade-trait)' }}
    >
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <span className="flex items-center gap-3">
        {aside !== undefined && (
          <span className="text-[11px] font-semibold" style={{ color: 'var(--papier-doux)' }}>
            {aside}
          </span>
        )}
        {children}
      </span>
    </div>
  );
}
