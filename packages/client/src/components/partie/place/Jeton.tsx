/**
 * Le jeton de joueur (SPEC § 5.1) : un médaillon gravé, un buste à
 * couvre-chef, des signes à leurs emplacements fixes, un nom, un mot.
 *
 * Du fond vers le dessus : la cellule (≥ 44 × 44, focus sur elle) ;
 * l'anneau du médaillon (Ø m, 1,5) ; le disque intérieur (Ø m − 8, hachure
 * `hach-1`) ; le buste à couvre-chef du siège (0,75 m, coupé par le disque) ;
 * les signes ; le nom ; le statut (un seul mot).
 *
 * Les emplacements, repère au centre du médaillon :
 *
 * | emplacement | centre              | porte                                        |
 * |-------------|---------------------|----------------------------------------------|
 * | NE          | (+0,35 m, −0,35 m)  | sceau « a voté », pastille de la meute       |
 * | NO          | (−0,40 m, −0,36 m)  | cartouche « +2 » du Corbeau                  |
 * | SO          | (−0,35 m, +0,35 m)  | gracié, hors vote, votera, interdit          |
 * | O           | (−0,52 m, 0)        | lacs (sous le pouce seulement)               |
 * | bandeau S   | bas du disque       | brassard « ×2 » du capitaine                 |
 * | cadre       | carré m + 14        | « moi »                                      |
 * | couverture  | disque intérieur    | absent                                       |
 *
 * **Aucune opacité** : un jeton qu'on ne peut pas choisir perd son grain et
 * son trait (état 15), pas son contraste ; un absent se couvre d'une hachure
 * croisée et d'une chaise vide (état 11). Tout ce que le jeton montre est dit
 * dans la phrase cachée.
 */

import { useId, type CSSProperties, type ReactNode } from 'react';

import { campOf, type PlayerView, type RoleId } from '@garoutom/engine';

import { Cartouche, type FormeCartouche } from '../../caprices/Cartouche.js';
import { CouvreChef } from '../../habit/CouvreChef.js';
import { Glyphe, type NomGlyphe } from '../../habit/glyphes.js';

/** La présence d'un joueur, telle que la table la publie — jamais pourquoi. */
export type Presence = 'present' | 'reconnexion' | 'absent';

export interface MesuresJeton {
  medaillon: number;
  /** Hauteur de la cellule (grille) ; absente : au contenu. */
  hauteur?: number;
  haut: number;
  nom: { taille: number; ligne: number };
  statut: number;
  roleEntier: boolean;
}

export interface JetonProps {
  joueur: PlayerView;
  nom: string;
  mesures: MesuresJeton;
  tirage: 'papier' | 'cuivre';
  skin: string;
  estMoi: boolean;
  /** Le sceau « a voté » (jour de vote seulement). */
  aVote: boolean;
  /** Le jour de vote : un vivant qui n'a pas voté « délibère ». */
  delibere: boolean;
  enChoix: boolean;
  choisissable: boolean;
  choisi: boolean;
  onChoisir: ((seat: number) => void) | undefined;
  annotation: ReactNode;
  marque: boolean;
  horsVote: boolean;
  votera: boolean;
  /** Interdit (« hier ») : le Salvateur ne protège pas deux nuits de suite. */
  interdit: boolean;
  presence: Presence;
  /** Secondes de grâce qui restent à un absent, s'il en reste. */
  graceS: number | null;
  /** Soi, le canal coupé : l'anneau se pointille (état 12). */
  reconnexionSoi: boolean;
  /** Le pouce tient « Ma carte » : le savoir privé s'imprime. */
  sousLePouce: boolean;
  charge: string;
  nomRole: (role: RoleId) => string;
  /** Le mot du cartouche d'un camp (« Village », « Meute », « Seul »). */
  motCamp: (role: RoleId) => string;
  libelleAbsent: string;
  nomCouvreChef: string;
  /** En cercle : le centre de la cellule et sa largeur. */
  position?: { left: number; top: number; width: number };
}

/** La forme du cartouche d'un rôle : écu du village, mordu de la meute, « Seul » du Loup Blanc. */
export function formeDuRoleJeton(role: RoleId): FormeCartouche {
  if (role === 'loupBlanc') return 'seul';
  return campOf(role) === 'loups' ? 'mordu' : 'ecu';
}

/** Un signe posé à son emplacement, centré sur (dx, dy) depuis le centre du médaillon. */
function Signe({ dx, dy, children, testid }: { dx: number; dy: number; children: ReactNode; testid?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid={testid}
      className="absolute flex items-center justify-center"
      style={{ left: `calc(50% + ${String(dx)}px)`, top: `calc(50% + ${String(dy)}px)`, transform: 'translate(-50%, -50%)' }}
    >
      {children}
    </span>
  );
}

/** Un glyphe d'état dans son badge rond (SO) : Ø 20, fond `--surface`, filet doux. */
function Badge({ nom, couleur = 'var(--encre)' }: { nom: NomGlyphe; couleur?: string }) {
  return (
    <span
      className="flex size-5 items-center justify-center rounded-full border-[0.75px] border-[var(--filet-doux)] bg-[var(--surface)]"
      style={{ color: couleur }}
    >
      <Glyphe nom={nom} taille={16} />
    </span>
  );
}

export function Jeton(props: JetonProps) {
  const {
    joueur,
    nom,
    mesures,
    tirage,
    skin,
    estMoi,
    aVote,
    delibere,
    enChoix,
    choisissable,
    choisi,
    onChoisir,
    annotation,
    marque,
    horsVote,
    votera,
    interdit,
    presence,
    graceS,
    reconnexionSoi,
    sousLePouce,
    charge,
    nomRole,
    motCamp,
    libelleAbsent,
    nomCouvreChef,
    position,
  } = props;
  const clip = useId();
  const { seat, alive, role, canVote, isCaptain, isLover } = joueur;
  const m = mesures.medaillon;
  const v = tirage === 'cuivre' ? 'v' : 'e';
  const absent = presence !== 'present';
  const gracie = alive && !canVote;
  // Un rôle se lit sur la place s'il est public (un mort, un gracié) ; un rôle
  // connu en privé (complice, carnet) ne paraît que sous le pouce (§ 5.1.6).
  // Le sien ne s'y lit jamais : il vit dans « Ma carte ».
  const rolePublic = role !== null && !estMoi && (!alive || gracie) ? role : null;
  const rolePrive = role !== null && !estMoi && alive && !gracie && sousLePouce ? role : null;
  const lacs = isLover && sousLePouce && !estMoi;
  const nonChoisissable = enChoix && !choisissable && !choisi && alive;

  /* --- La phrase qui dit tout ce que le jeton montre --- */
  const details: string[] = [];
  if (estMoi) details.push('vous');
  if (!alive) details.push('mort·e');
  if (rolePublic !== null) details.push(nomRole(rolePublic));
  if (rolePrive !== null) details.push(nomRole(rolePrive));
  if (isCaptain) details.push(charge);
  if (lacs || (isLover && estMoi && sousLePouce)) details.push('lié·e par le destin');
  if (gracie) details.push('ne vote plus');
  if (horsVote) details.push('ne vote pas aujourd’hui');
  if (votera) details.push('votera');
  if (marque) details.push(`marqué·e par ${nomRole('corbeau')} : deux voix d’office`);
  if (interdit) details.push('protégé·e hier');
  if (aVote) details.push('a voté');
  if (choisi) details.push('votre choix');
  if (presence === 'absent') details.push(libelleAbsent);
  if (presence === 'reconnexion')
    details.push(graceS === null ? 'reconnexion' : `reconnexion, ${String(graceS)} s de grâce`);
  if (reconnexionSoi) details.push('reconnexion');
  const phrase = details.length > 0 ? `${nom} — ${details.join(', ')}` : nom;

  /* --- Le mot du statut : un seul, par priorité (§ 5.1.4) --- */
  const statut = absent
    ? graceS === null
      ? libelleAbsent
      : `${libelleAbsent} · ${String(graceS)} s`
    : reconnexionSoi
      ? 'reconnexion…'
      : choisi
        ? 'votre choix'
        : interdit
          ? 'hier'
          : gracie
            ? 'ne vote plus'
            : horsVote
              ? 'ne vote pas'
              : votera
                ? 'votera'
                : aVote
                  ? 'a voté'
                  : isCaptain && alive
                    ? 'capitaine'
                    : estMoi
                      ? 'vous'
                      : delibere
                        ? 'délibère'
                        : null;

  /* --- Le médaillon --- */
  const r = m / 2;
  const anneau = !alive
    ? { trait: 'var(--etat-mort-trait)', largeur: 1 }
    : choisi
      ? { trait: 'var(--encre)', largeur: 3.5 }
      : nonChoisissable || interdit
        ? { trait: 'var(--filet-doux)', largeur: 1 }
        : { trait: 'var(--jeton-anneau, var(--encre))', largeur: 1.5 };
  const remplissage = !alive
    ? 'none'
    : absent
      ? `url(#hach-x-${v})`
      : nonChoisissable || interdit
        ? 'var(--surface)'
        : horsVote
          ? tirage === 'cuivre'
            ? 'url(#lf-barre-v)'
            : 'url(#hach-barre-e)'
          : `url(#hach-1-${v})`;
  const buste = 0.75 * m;
  const cote = buste / 40;

  const medaillon = (
    <span aria-hidden="true" className="relative mx-auto block shrink-0" style={{ width: m, height: m }}>
      {estMoi && (
        <>
          <span className="absolute border-[1.5px] border-[var(--encre)]" style={{ inset: -7 }} />
          <span className="absolute border-[0.75px] border-[var(--encre)]" style={{ inset: -4 }} />
        </>
      )}
      <svg
        width={m}
        height={m}
        viewBox={`0 0 ${String(m)} ${String(m)}`}
        className="absolute inset-0 overflow-visible"
        data-presence={presence === 'present' ? undefined : presence}
        data-anneau={reconnexionSoi ? 'pointille' : undefined}
      >
        <defs>
          <clipPath id={clip}>
            <circle cx={r} cy={r} r={r - 4.4} />
          </clipPath>
        </defs>
        <circle
          cx={r}
          cy={r}
          r={r}
          fill="var(--surface)"
          stroke={anneau.trait}
          strokeWidth={anneau.largeur}
          strokeDasharray={reconnexionSoi ? '4 2' : undefined}
        />
        <circle
          cx={r}
          cy={r}
          r={r - 4}
          fill={remplissage}
          stroke={!alive ? 'var(--cp-palier-1)' : nonChoisissable || interdit ? 'var(--filet-doux)' : 'var(--encre)'}
          strokeWidth={!alive ? 0.6 : 0.75}
        />
        {absent ? (
          <>
            <circle cx={r} cy={r} r={0.266 * m} fill="var(--surface)" />
            <g transform={`translate(${String(r - 0.18 * m)} ${String(r - 0.18 * m)}) scale(${String((0.36 * m) / 16)})`}>
              <Glyphe nom="absent" taille={16} />
            </g>
          </>
        ) : (
          <g clipPath={`url(#${clip})`}>
            <g transform={`translate(${String(r - buste / 2)} ${String(r - buste / 2 + 0.06 * m)}) scale(${String(cote)})`}>
              <CouvreChef numero={seat + 1} taille={40} skin={skin} tirage={tirage} mort={!alive} />
            </g>
          </g>
        )}
        {choisi && (
          // Les quatre repères de visée, hors de l'anneau (§ 5.1.4, état 2).
          <path
            d={`M${String(r)} ${String(-2.75)}V${String(-8.75)}M${String(r)} ${String(m + 2.75)}V${String(m + 8.75)}M${String(-2.75)} ${String(r)}H${String(-8.75)}M${String(m + 2.75)} ${String(r)}H${String(m + 8.75)}`}
            stroke="var(--encre)"
            strokeWidth={2.4}
          />
        )}
      </svg>

      {isCaptain && (
        // Le brassard « ×2 » : un trapèze d'encre au bas du disque.
        <span
          data-testid="brassard"
          className="absolute flex items-center justify-center bg-[var(--encre)] text-[12px] leading-none font-bold text-[var(--sur-encre)] tabular-nums"
          style={{
            left: 0.1 * m,
            width: 0.8 * m,
            top: r + 0.217 * m,
            height: 14,
            clipPath: 'polygon(0 0, 100% 0, 87.5% 100%, 12.5% 100%)',
          }}
        >
          ×2
        </span>
      )}

      {aVote && (
        <Signe dx={0.35 * m} dy={-0.35 * m} testid={`a-vote-${String(seat)}`}>
          <span className="flex items-center justify-center rounded-full bg-[var(--surface)] p-[2px]">
            <Glyphe nom="a-vote" taille={Math.max(16, Math.round(0.28 * m))} />
          </span>
        </Signe>
      )}
      {annotation !== undefined && annotation !== null && annotation !== false && (
        <Signe dx={0.35 * m} dy={-0.35 * m} testid={`annotation-${String(seat)}`}>
          {annotation}
        </Signe>
      )}

      {marque && (
        <Signe dx={-0.4 * m} dy={-0.36 * m}>
          <span
            data-testid={`marque-${String(seat)}`}
            className="flex items-center gap-px bg-[var(--encre)] px-[2px] text-[12px] leading-4 font-bold text-[var(--sur-encre)] tabular-nums"
            style={{ height: m <= 40 ? 16 : 18, minWidth: m <= 40 ? 22 : 26 }}
          >
            <Glyphe nom="marque" taille={10} />
            +2
          </span>
        </Signe>
      )}

      {(gracie || horsVote || votera || interdit) && alive && (
        <Signe dx={-0.35 * m} dy={0.35 * m}>
          <Badge nom={gracie ? 'gracie' : horsVote ? 'hors-vote' : votera ? 'votera' : 'interdit'} />
        </Signe>
      )}

      {lacs && (
        <Signe dx={-0.52 * m} dy={0}>
          <span className="flex size-[19px] items-center justify-center rounded-full bg-[var(--surface)] text-[var(--camp-serment)]">
            <Glyphe nom="lie" taille={16} />
          </span>
        </Signe>
      )}
    </span>
  );

  const roleSousNom = rolePublic ?? rolePrive;
  const ligneNom = (
    <span
      aria-hidden="true"
      className="mt-[3px] block w-full truncate text-center"
      style={{
        fontSize: mesures.nom.taille,
        lineHeight: `${String(mesures.nom.ligne)}px`,
        fontWeight: estMoi ? 700 : alive ? 600 : 400,
        color: alive ? 'var(--encre)' : 'var(--etat-mort-texte)',
        textDecorationLine: !alive ? 'line-through' : choisi ? 'underline' : 'none',
        textDecorationThickness: choisi ? '1.5px' : '1px',
        textUnderlineOffset: 3,
      }}
    >
      {nom}
    </span>
  );

  const contenu = (
    <>
      <span className="sr-only">{phrase}</span>
      <span aria-hidden="true" className="block" style={{ height: mesures.haut }} />
      {medaillon}
      {ligneNom}
      {statut !== null && alive && (
        <span
          aria-hidden="true"
          data-testid={absent ? `presence-${String(seat)}` : undefined}
          className="block w-full truncate text-center text-[12px] tabular-nums"
          style={{
            lineHeight: `${String(mesures.statut)}px`,
            color: choisi ? 'var(--encre)' : 'var(--encre-2)',
            fontWeight: choisi ? 600 : 400,
          }}
        >
          {statut}
        </span>
      )}
      {roleSousNom !== null ? (
        <span aria-hidden="true" className="flex justify-center">
          <Cartouche forme={formeDuRoleJeton(roleSousNom)} taille={20}>
            {mesures.roleEntier && !gracie ? nomRole(roleSousNom) : motCamp(roleSousNom)}
          </Cartouche>
        </span>
      ) : (
        !alive && (
          <span aria-hidden="true" className="flex justify-center">
            <Cartouche forme="neutre" taille={20}>
              Carte cachée
            </Cartouche>
          </span>
        )
      )}
    </>
  );

  const titre = `${nom} — ${nomCouvreChef}`;
  const cellule: CSSProperties = {
    height: mesures.hauteur,
    ...(position === undefined
      ? {}
      : {
          position: 'absolute',
          left: position.left,
          top: position.top,
          width: position.width,
          transform: 'translate(-50%, -50%)',
        }),
  };
  const classes = 'relative flex min-h-11 w-full min-w-11 flex-col items-center overflow-visible p-0';

  if (onChoisir !== undefined) {
    return (
      <li className="min-w-0 list-none" style={cellule} data-siege={seat}>
        <button
          type="button"
          aria-pressed={choisi}
          disabled={!choisissable}
          title={titre}
          onClick={() => onChoisir(seat)}
          className={`${classes} h-full cursor-pointer border-0 bg-transparent font-[inherit] text-[inherit] disabled:cursor-default`}
        >
          {contenu}
        </button>
      </li>
    );
  }
  return (
    <li className={`min-w-0 list-none ${classes}`} style={cellule} title={titre} data-siege={seat}>
      {contenu}
    </li>
  );
}
