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
  OPTIONAL_ROLES_V3,
  ROLES,
  SPECIAL_ROLES,
  wolvesIn,
  type GameOptions,
  type OptionalRoleId,
  type OptionalRoleIdV3,
  type RoleId,
} from '@garoutom/engine';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { useRoom, useSkinId, useVoix } from '../lib/partie.js';
import { peauDuSkin, type Voix } from '../skins/registre.js';
import { Bouton } from './caprices/index.js';
import { CarteRole } from './habit/CarteRole.js';
import { Panneau } from './Panneau.js';

/** L'outil « Règles » de la frise : 44 × 44, l'icône du recueil, la feuille basse derrière. */
export function BoutonRegles({ className }: { className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Bouton
        variante="outil"
        icone="regles"
        onClick={() => setOuvert(true)}
        aria-label="Règles"
        aria-haspopup="dialog"
        title="Règles"
        className={className}
      />
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
  // Les v3 (R105 à R108).
  villageois2: 'Jamais : ni pouvoir, ni annonce.',
  renard: 'La nuit, tant que son flair lui reste.',
  ours: 'À l’aube, chaque matin qu’il vit.',
  // La deuxième vague (R109 à R114).
  voleur: 'Avant la révélation, avant tout le monde.',
  chienLoup: 'La première nuit seulement.',
  enfantSauvage: 'La première nuit ; puis, à la mort de son modèle.',
  soeurs: 'Jamais : ni pouvoir, ni consigne.',
  freres: 'Jamais : ni pouvoir, ni consigne.',
};

/**
 * Le détail mécanique des rôles optionnels (R91 à R97, puis R105 à R108) —
 * dit sans nom d'univers : la carte du skin raconte, cette ligne précise.
 */
const DETAIL: Record<OptionalRoleId | OptionalRoleIdV3, string> = {
  ancien:
    'Survit à la première attaque de la meute, pas à la seconde (le bouclier ou la potion de vie qui l’arrête ne compte pas). Le poison, le vote et le tir le tuent du premier coup. Le sursis reste secret : l’aube est paisible.',
  corbeau:
    'Marque un vivant, lui compris, ou personne. À l’aube, la marque est annoncée, jamais sa main ; au vote du jour, le joueur marqué porte deux voix de plus, annoncées d’avance.',
  bouc: 'Si le vote du village finit à égalité, il meurt au lieu de personne. Puis il désigne au moins un vivant : seuls ceux-là voteront au prochain vote (30 secondes, sinon tout le village vote).',
  petiteFille:
    'Sans consigne : elle joue comme un simple villageois, mais voit en direct, pendant le choix de la meute, combien de loups visent chaque joueur — jamais lesquels.',
  loupBlanc:
    'Vote avec la meute, qui le prend pour l’un des siens, et compte parmi les loups pour la borne de la composition. Une nuit sur deux (les nuits paires), il peut dévorer un autre loup. Il gagne seul, s’il est le dernier en vie.',
  // Les v3 (R105 à R108) : jamais au tirage au hasard, l’hôte les coche (D26).
  villageois2:
    'La carte est publique et sans effet : toute la table — la Voyante qui la sonde comme le porteur lui-même — lit « villageois », et le porteur croit être un simple villageois. Seul le récit de fin de partie retourne la carte double.',
  renard:
    'Chaque nuit, tant que son pouvoir tient, il flaire le trio d’un vivant — ce joueur et ses deux voisins vivants, lui-même compris. Un loup dans le trio : il le sait, et son pouvoir demeure. Un trio sans loup : le trio entier est appris innocent, et son pouvoir s’éteint à vie. La rancune de l’Ancien lui coupe aussi le flair.',
  ours:
    'Il ne joue jamais. Chaque matin où il vit, après l’annonce des morts, sa bête dit ce qui s’assied à côté de lui : elle grogne si un loup — au camp d’origine, quoi qu’il advienne — est l’un de ses voisins vivants, elle se tait sinon. Le silence est une information comme une autre, et la grogne survit à la rancune.',
  // La deuxième vague (R109 à R114) : comme les premiers v3, jamais au
  // tirage au hasard — l’hôte les coche (D26).
  voleur:
    'Avant la révélation, deux cartes restent sur la table, à lui seul : il en prend une — pour la jouer dès cette nuit — ou garde la sienne, sans aucun pouvoir alors. Deux loups au talon (le Loup Blanc compris) : il faut en prendre une, et le temps écoulé prend la première. La carte laissée sort du jeu ; nul ne sait ce qu’il a pris, ni même s’il a pris — seul le récit de fin de partie le dira.',
  chienLoup:
    'La première nuit, il choisit son camp pour toujours : côté village, sans rien ; côté meute, il y dévore chaque nuit et la meute le reconnaît pour l’un des siens. Ce n’est pas un pouvoir du village : la rancune de l’Ancien ne lui coupe rien. Sans choix au temps écoulé, il reste au village.',
  enfantSauvage:
    'La première nuit, il désigne son modèle parmi les vivants, lui compris : le modèle n’en saura jamais rien. Le modèle mort, l’Enfant devient un loup-garou dans le silence — la meute ne le reconnaît qu’à la nuit suivante. Ce n’est pas un pouvoir du village : la rancune de l’Ancien n’y peut rien. Sans choix au temps écoulé, il n’aura pas de modèle.',
  soeurs:
    'Deux cartes d’un seul cochage. Elles se reconnaissent à la révélation, comme les amoureux, et partagent un murmure permanent — la nuit comme le jour, que seule la mort referme. La connaissance, elle, ne meurt pas : une morte garde ses siens à l’œil. Ni pouvoir, ni annonce : elles gagnent avec le village.',
  freres:
    'Trois cartes d’un seul cochage. Ils se reconnaissent à la révélation, comme les amoureux, et partagent un murmure permanent — la nuit comme le jour, que seule la mort referme. La connaissance, elle, ne meurt pas : un mort garde les siens à l’œil. Ni pouvoir, ni annonce : ils gagnent avec le village.',
};

function majuscule(texte: string): string {
  return texte.replace(/^./, (lettre) => lettre.toUpperCase());
}

type Chapitre = 'but' | 'manche' | 'roles' | 'table';

/** Le rang voisin d'un onglet au clavier : flèches, début et fin (motif des onglets, WAI-ARIA). */
function chapitreVoisin(touche: string, rang: number, total: number): number | null {
  switch (touche) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (rang + 1) % total;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (rang - 1 + total) % total;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}

function PanneauRegles({ onFermer }: { onFermer: () => void }) {
  const voix = useVoix();
  const skin = peauDuSkin(useSkinId());
  const room = useRoom();
  const idBase = useId();
  const village = voix.nomCamp('village');
  const loups = voix.nomCamp('loups');
  const charge = skin.charge;
  const blancEnJeu = room !== null && !room.options.auto && room.options.roles.includes('loupBlanc');

  const chapitres: readonly { cle: Chapitre; titre: string }[] = [
    { cle: 'but', titre: 'Le but' },
    { cle: 'manche', titre: 'Une manche' },
    { cle: 'roles', titre: 'Les rôles' },
    ...(room !== null ? [{ cle: 'table' as const, titre: 'Cette table' }] : []),
  ];
  const [actif, setActif] = useState<Chapitre>('but');
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);

  const surTouche = (evenement: KeyboardEvent<HTMLButtonElement>, rang: number) => {
    const suivant = chapitreVoisin(evenement.key, rang, chapitres.length);
    const chapitre = suivant === null ? undefined : chapitres[suivant];
    if (suivant === null || chapitre === undefined) return;
    evenement.preventDefault();
    setActif(chapitre.cle);
    onglets.current[suivant]?.focus();
  };

  return (
    <Panneau titre="Règles" onFermer={onFermer} testid="panneau-regles">
      <div role="tablist" aria-label="Chapitres des règles" className="mb-4 flex gap-1">
        {chapitres.map(({ cle, titre }, rang) => {
          const choisi = cle === actif;
          return (
            <button
              key={cle}
              ref={(el) => {
                onglets.current[rang] = el;
              }}
              type="button"
              role="tab"
              id={`${idBase}-onglet-${cle}`}
              aria-selected={choisi}
              aria-controls={`${idBase}-panneau-${cle}`}
              tabIndex={choisi ? 0 : -1}
              onClick={() => setActif(cle)}
              onKeyDown={(evenement) => surTouche(evenement, rang)}
              className="min-h-11 min-w-0 flex-1 px-1 text-[15px] leading-5"
              style={{
                background: choisi ? 'var(--action-fond)' : 'transparent',
                color: choisi ? 'var(--action-texte)' : 'var(--encre)',
                border: '1.5px solid var(--filet)',
                fontWeight: choisi ? 600 : 400,
              }}
            >
              {titre}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${idBase}-panneau-${actif}`}
        aria-labelledby={`${idBase}-onglet-${actif}`}
        className="flex flex-col gap-4 text-[16px] leading-6"
      >
        {actif === 'but' && (
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
                gagne que s’il reste le dernier en vie, contre {village} comme contre {loups}. S’il ne reste que{' '}
                {loups}, lui compris, la partie continue — trois nuits sans mort la closent sur la victoire des {voix.motLoups()}.
              </p>
            )}
          </Section>
        )}

        {actif === 'manche' && (
          <Section titre="Une manche">
            <ol className="flex list-decimal flex-col gap-2 pl-5">
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
            <p className="t-statut">
              Qui n’a pas agi quand le temps est écoulé n’agit pas : un loup muet ne vote pour personne,
              un village silencieux n’exécute personne.
            </p>
          </Section>
        )}

        {actif === 'roles' && (
          <>
            <Section titre={`Les rôles — ${voix.nomUnivers()}`}>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {ROLES.filter(
                  (role) =>
                    !OPTIONAL_ROLES.some((optionnel) => optionnel === role) &&
                    !OPTIONAL_ROLES_V3.some((optionnel) => optionnel === role),
                ).map((role) => (
                  <LigneRole key={role} role={role} voix={voix} />
                ))}
              </ul>
            </Section>

            <Section titre="Rôles optionnels">
              <p className="t-statut">
                Absents de la composition automatique : l’hôte les ajoute à la main, un exemplaire au plus
                de chacun. Le tirage au hasard peut sortir les cinq premiers ; les huit de la v3 ne
                viennent que cochés — et les fratries, elles, portent leurs deux ou trois cartes d’une
                seule case.
              </p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {[...OPTIONAL_ROLES, ...OPTIONAL_ROLES_V3].map((role) => (
                  <LigneRole key={role} role={role} voix={voix} detail={DETAIL[role]} />
                ))}
              </ul>
            </Section>
          </>
        )}

        {actif === 'table' && room !== null && (
          <Section titre="Les réglages de cette table">
            <ReglagesTable options={room.options} nombre={room.players.length} voix={voix} charge={charge} />
          </Section>
        )}
      </div>
    </Panneau>
  );
}

/** Une rubrique du chapitre : un titre en petites capitales, un filet, puis le texte. */
function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3
        className="t-rubrique m-0 pb-1"
        style={{ borderBottom: '0.75px solid var(--filet-doux)', color: 'var(--encre-2)' }}
      >
        {titre}
      </h3>
      {children}
    </section>
  );
}

/**
 * Un rôle : sa petite carte (96 × 134), puis ce qu'il fait, quand il agit
 * et — en italique, de la main du graveur — sa légende.
 */
function LigneRole({ role, voix, detail }: { role: RoleId; voix: Voix; detail?: string }) {
  const legende = voix.legendeRole(role);
  // Le survol rend son nom d'origine au rôle rebaptisé par la peau.
  const reference = voix.nomRoleReference(role);
  const origine = reference === voix.nomRole(role) ? undefined : `Rôle d’origine : ${reference}`;
  return (
    <li className="flex items-start gap-3" data-role-regle="" title={origine}>
      <CarteRole role={role} retournee taille="petite" avecDescription={false} avecLegende={false} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0">{voix.descriptionRole(role)}</p>
        {detail !== undefined && <p className="m-0">{detail}</p>}
        <p className="t-statut m-0">{QUAND[role]}</p>
        {legende !== '' && (
          <p className="t-legende m-0" style={{ fontSize: 16, lineHeight: '22px' }}>
            {legende}
          </p>
        )}
      </div>
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
  const speciaux = [...SPECIAL_ROLES, ...OPTIONAL_ROLES, ...OPTIONAL_ROLES_V3]
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
    [
      'Absents',
      options.abandon
        ? 'Un vivant absent depuis cinq minutes meurt d’abandon, sans pouvoir.'
        : 'La table attend ses absents : personne ne meurt d’abandon.',
    ],
    ['Minuteries', `Nuit : ${secondes(options.tempsNuit)} par étape. Jour : ${secondes(options.tempsJour)}.`],
  );

  return (
    <dl className="m-0 flex flex-col gap-3">
      {lignes.map(([terme, definition]) => (
        <div key={terme} className="flex flex-col gap-0.5">
          <dt className="t-rubrique" style={{ color: 'var(--encre-2)' }}>
            {terme}
          </dt>
          <dd className="m-0">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
