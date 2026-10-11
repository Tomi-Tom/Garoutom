/**
 * Le bouton « Règles » et son panneau.
 *
 * Quatre parties : le but, le déroulé d'une manche, les rôles dans la voix du
 * skin de la table, et — s'il y a une table — ses réglages dits en clair.
 * Chaque phrase suit `docs/RULES.md` ; aucun identifiant du moteur n'atteint
 * l'écran, tout nom passe par la voix du skin (D6).
 */

import {
  autoComposition,
  OPTIONAL_ROLES,
  ROLES,
  SPECIAL_ROLES,
  wolvesIn,
  type GameOptions,
  type OptionalRoleId,
  type RoleId,
} from '@garoutom/engine';
import { useState, type ReactNode } from 'react';

import { useRoom, useSkinId, useVoix } from '../lib/partie.js';
import { peauDuSkin, type Voix } from '../skins/registre.js';
import { SymboleRole } from './habit/Symbole.js';
import { Panneau } from './Panneau.js';

export function BoutonRegles({ className }: { className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Règles"
        aria-haspopup="dialog"
        title="Règles"
        className={`btn-voisin inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${className ?? ''}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
          <path d="M9 8h7M9 12h5" />
        </svg>
        <span className="max-sm:sr-only">Règles</span>
      </button>
      {ouvert && <PanneauRegles onFermer={() => setOuvert(false)} />}
    </>
  );
}

/** Le moment où chaque rôle agit — une mécanique, sans nom d'univers. */
const QUAND: Record<RoleId, string> = {
  villageois: 'Le jour, au vote.',
  loup: 'La nuit, avec la meute.',
  voyante: 'La nuit.',
  sorciere: 'La nuit, après la meute.',
  chasseur: 'À sa mort.',
  cupidon: 'La première nuit seulement.',
  salvateur: 'La nuit.',
  idiot: 'Au vote du village, s’il est condamné.',
  ancien: 'Sans rien faire : il encaisse.',
  corbeau: 'La nuit.',
  bouc: 'Au vote du village, et à sa mort.',
  petiteFille: 'La nuit, pendant le choix de la meute.',
  loupBlanc: 'La nuit, avec la meute ; les nuits paires, seul.',
};

/**
 * Le détail mécanique des rôles optionnels (R91 à R97) — dit sans nom
 * d'univers : la carte du skin raconte, cette ligne précise.
 */
const DETAIL: Record<OptionalRoleId, string> = {
  ancien:
    'Survit à la première attaque de la meute, pas à la seconde (le bouclier ou la potion de vie qui l’arrête ne compte pas). Le poison, le vote et le tir le tuent du premier coup. Le sursis reste secret : l’aube est paisible.',
  corbeau:
    'Marque un vivant, lui compris, ou personne. À l’aube, la marque est annoncée, jamais sa main ; au vote du jour, le joueur marqué porte deux voix de plus, annoncées d’avance.',
  bouc: 'Si le vote du village finit à égalité, il meurt au lieu de personne. Puis il désigne au moins un vivant : seuls ceux-là voteront au prochain vote (30 secondes, sinon tout le village vote).',
  petiteFille:
    'Sans consigne : elle joue comme un simple villageois, mais voit en direct, pendant le choix de la meute, combien de loups visent chaque joueur — jamais lesquels.',
  loupBlanc:
    'Vote avec la meute, qui le prend pour l’un des siens, et compte parmi les loups pour la borne de la composition. Une nuit sur deux (les nuits paires), il peut dévorer un autre loup. Il gagne seul, s’il est le dernier en vie.',
};

function majuscule(texte: string): string {
  return texte.replace(/^./, (lettre) => lettre.toUpperCase());
}

function PanneauRegles({ onFermer }: { onFermer: () => void }) {
  const voix = useVoix();
  const skin = peauDuSkin(useSkinId());
  const room = useRoom();
  const village = voix.nomCamp('village');
  const loups = voix.nomCamp('loups');
  const charge = skin.charge;
  const blancEnJeu = room !== null && !room.options.auto && room.options.roles.includes('loupBlanc');

  return (
    <Panneau titre="Règles" onFermer={onFermer} testid="panneau-regles">
      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Section titre="Le but">
          <p>
            Deux camps : {village} et {loups}. Chaque joueur reçoit une carte secrète. {village}{' '}
            gagne quand il ne reste plus un seul {voix.compteLoups(1).replace(/^1 /, '')} ; {loups}{' '}
            gagne quand il ne reste que lui.
          </p>
          <p>
            Cupidon peut lier deux joueurs en amoureux, même de camps opposés. Si ce couple mixte
            finit seul, les deux derniers survivants, il gagne à lui seul. Si tout le monde meurt en
            même temps, la partie n’est à personne.
          </p>
          {blancEnJeu && (
            <p>
              {majuscule(voix.nomRole('loupBlanc'))} est de la meute, mais joue pour lui seul : il ne
              gagne que s’il reste le dernier en vie, contre {village} comme contre {loups}. S’il ne reste que
              {loups}, lui compris, la partie continue — trois nuits sans mort la closent sur la victoire des {voix.motLoups()}.
            </p>
          )}
        </Section>

        <Section titre="Une manche">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            <li>
              <b>Révélation.</b> Chacun découvre sa carte et confirme, pendant 25 secondes. Le temps
              écoulé ouvre la nuit, confirmé ou non.
            </li>
            <li>
              <b>Élection du {charge}</b>, si la table en a un : au matin du premier jour par défaut,
              ou avant la première nuit selon les réglages. Chaque vivant vote pour un vivant ou
              s’abstient ; la majorité l’emporte, une égalité est tranchée au sort, sans voix il n’y
              a personne — et l’élection ne revient pas.
            </li>
            <li>
              <b>Nuit.</b> Les rôles de nuit jouent en même temps, chacun de son côté. {loups} désigne
              une victime : la majorité l’emporte, une égalité se tranche au sort, sans voix il n’y a
              pas de victime. Puis {voix.nomRole('sorciere')} joue seule — même morte, pour ne rien
              trahir.
            </li>
            <li>
              <b>Aube.</b> Les morts de la nuit sont annoncés d’un bloc, avec leur cause. Aucune mort :
              l’aube est paisible. Quand un amoureux meurt, l’autre meurt de chagrin aussitôt.
            </li>
            <li>
              <b>Déclencheurs.</b> {voix.nomRole('chasseur')} mort abat quelqu’un (30 secondes, sinon
              il emporte sa balle) ; le {charge} mort désigne son successeur (30 secondes, sinon le
              hasard choisit). Un tir peut tout renverser : la victoire ne se regarde qu’ensuite.
            </li>
            <li>
              <b>Jour.</b> On débat, puis chaque vivant qui peut voter désigne un autre joueur ou
              s’abstient, et peut changer d’avis jusqu’au bout. La voix du {charge} compte double. Il
              faut une majorité stricte : en cas d’égalité, ou sans voix, personne n’est exécuté.
              Condamné, {voix.nomRole('idiot')} est gracié : sa carte est montrée, il reste en vie
              mais ne vote plus jamais.
            </li>
            <li>
              <b>Nuit suivante.</b> Et tout recommence jusqu’à la victoire d’un camp.
            </li>
          </ol>
          <p style={{ color: 'var(--papier-doux)' }}>
            Qui n’a pas agi quand le temps est écoulé n’agit pas : un loup muet ne vote pour personne,
            un village silencieux n’exécute personne.
          </p>
        </Section>

        <Section titre={`Les rôles — ${voix.nomUnivers()}`}>
          <ul className="flex flex-col gap-2">
            {ROLES.filter((role) => !OPTIONAL_ROLES.some((optionnel) => optionnel === role)).map((role) => (
              <LigneRole key={role} role={role} voix={voix} />
            ))}
          </ul>
        </Section>

        <Section titre="Rôles optionnels">
          <p style={{ color: 'var(--papier-doux)' }}>
            Absents de la composition automatique : l’hôte les ajoute à la main, ou le tirage au hasard
            peut les sortir. Un exemplaire au plus de chacun.
          </p>
          <ul className="flex flex-col gap-2">
            {OPTIONAL_ROLES.map((role) => (
              <LigneRole key={role} role={role} voix={voix} detail={DETAIL[role]} />
            ))}
          </ul>
        </Section>

        {room !== null && (
          <Section titre="Les réglages de cette table">
            <ReglagesTable options={room.options} nombre={room.players.length} voix={voix} charge={charge} />
          </Section>
        )}
      </div>
    </Panneau>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="border-b pb-1 text-base font-bold" style={{ borderColor: 'var(--arcade-trait)' }}>
        {titre}
      </h3>
      {children}
    </section>
  );
}

function LigneRole({ role, voix, detail }: { role: RoleId; voix: Voix; detail?: string }) {
  return (
    <li
      className="flex gap-3 rounded-lg p-3"
      style={{ background: 'var(--nuit-creux)', boxShadow: 'inset 0 0 0 1px var(--arcade-trait)' }}
    >
      <span className="shrink-0">
        <SymboleRole role={role} taille={32} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-identite text-lg leading-tight font-bold">{voix.nomRole(role)}</span>
        <span>{voix.descriptionRole(role)}</span>
        {detail !== undefined && <span>{detail}</span>}
        <span className="text-xs" style={{ color: 'var(--papier-doux)' }}>
          {QUAND[role]}
        </span>
      </span>
    </li>
  );
}

function secondes(valeur: number): string {
  if (valeur >= 120 && valeur % 60 === 0) return `${String(valeur / 60)} minutes`;
  return `${String(valeur)} secondes`;
}

/** La composition lue en clair, à la voix du skin. */
export function dirComposition(options: GameOptions, nombre: number, voix: Voix): string {
  const { loups, roles } = options.auto
    ? autoComposition(Math.max(nombre, 6))
    : { loups: options.loups, roles: options.roles };
  const speciaux = [...SPECIAL_ROLES, ...OPTIONAL_ROLES]
    .filter((role) => role !== 'loupBlanc' && roles.some((pris) => pris === role))
    .map((role) => voix.nomRole(role));
  // Le Loup Blanc compte parmi les loups (R13, R96) : « 3 loups dont le Loup Blanc ».
  const blanc = roles.some((role) => role === 'loupBlanc');
  const meute = voix.compteLoups(wolvesIn(loups, roles)) + (blanc ? ` dont ${voix.nomRole('loupBlanc')}` : '');
  return [meute, ...speciaux].join(' · ');
}

function ReglagesTable({
  options,
  nombre,
  voix,
  charge,
}: {
  options: GameOptions;
  nombre: number;
  voix: Voix;
  charge: string;
}) {
  const sorciere = options.auto || options.roles.includes('sorciere');
  const lignes: [string, string][] = [
    [
      'Composition',
      options.auto
        ? `${dirComposition(options, nombre, voix)} — celle du moteur, recalculée au nombre réel de joueurs au lancement. Les autres joueurs sont de simples ${voix.nomRole('villageois')}.`
        : `${dirComposition(options, nombre, voix)} — les autres joueurs sont de simples ${voix.nomRole('villageois')}.`,
    ],
    [
      `Le ${charge}`,
      !options.capitaine
        ? 'Pas de charge à cette table.'
        : options.capitaineAvantNuit1
          ? 'Élu avant la première nuit.'
          : 'Élu au matin du premier jour.',
    ],
    [
      voix.nomRole('chasseur'),
      options.chasseurEmpoisonne
        ? 'Tire même s’il meurt empoisonné ou de chagrin.'
        : 'Ne tire pas s’il meurt empoisonné ou de chagrin.',
    ],
  ];
  if (sorciere) {
    lignes.push([
      voix.nomRole('sorciere'),
      options.sorciereSeSauve
        ? 'Peut se sauver elle-même avec sa potion de vie.'
        : 'Ne peut pas se sauver elle-même.',
    ]);
  }
  if (!options.auto && options.roles.includes('ancien')) {
    lignes.push([
      majuscule(voix.nomRole('ancien')),
      options.ancienRancunier
        ? 'S’il meurt de la main du village (vote, tir, poison), tous les pouvoirs du village s’éteignent avec lui.'
        : 'Meurt sans se venger : les pouvoirs du village lui survivent.',
    ]);
  }
  lignes.push(
    [
      'Rôles des morts',
      options.revelerRoles
        ? 'La carte d’un mort est montrée à tous.'
        : // Les noms du skin portent leur article (« le Chasseur », « la
          // Goinfre ») : la phrase les pose après un deux-points, sans « de ».
          'La carte d’un mort reste cachée, sauf deux que le jeu retourne de lui-même : ' +
          voix.nomRole('chasseur') +
          ' au moment de tirer, et ' +
          voix.nomRole('idiot') +
          ' à sa grâce.',
    ],
    [
      'Les morts',
      options.mortsVoientTout
        ? 'Voient tous les rôles et lisent tous les canaux.'
        : `Ne lisent que ${voix.libelleCanal('village')} et ${voix.libelleCanal('morts')} ; les rôles restent cachés jusqu’à la fin.`,
    ],
    [
      'Fil de discussion',
      options.chat
        ? `${voix.libelleCanal('village')} discute par écrit le jour ; ${voix.libelleCanal('loups')} a son canal la nuit.`
        : `Pas de fil écrit le jour ; seul ${voix.libelleCanal('loups')} a son canal la nuit.`,
    ],
    ['Minuteries', `Nuit : ${secondes(options.tempsNuit)} par étape. Jour : ${secondes(options.tempsJour)}.`],
  );

  return (
    <dl className="flex flex-col gap-2">
      {lignes.map(([terme, definition]) => (
        <div key={terme} className="flex flex-col gap-0.5">
          <dt className="font-bold">{terme}</dt>
          <dd style={{ color: 'var(--papier-doux)' }}>{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
