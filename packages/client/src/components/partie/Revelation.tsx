/**
 * La révélation (SPEC Caprices § 5.2, R0 → R5 ; maquettes `C-Revelation-*`) :
 * chacun seul avec sa carte, au gabarit unique, en tirage cuivre.
 *
 * - **R0** — la carte est posée au dos (le dormeur du Caprice 43) ; la barre
 *   au pouce porte l'appui long « Gardez le pouce : retourner la carte ».
 * - **R1** — l'armement (600 ms) : l'anneau du bouton se remplit, un filet
 *   court sur le périmètre de la cuvette au même rythme.
 * - **R2** — le brunissage : un masque à bord franc s'ouvre depuis le centre
 *   de la carte, par crans de 8 px ; à la révélation **seulement**, il gratte
 *   jusqu'au papier (tous les sièges font le même geste au même moment :
 *   cette clarté ne désigne aucun rôle — exception à la loi N3).
 * - **R3** — lue, pouce posé : la face, sa description, et pour la meute ses
 *   complices ; le filet du périmètre décompte les 8 s.
 * - **R4** — réencrée : relâchement, changement d'onglet ou 8 s, retour à R0
 *   en une image.
 * - **R5** — après une première lecture d'au moins une seconde, « Je sais
 *   qui je suis » (prompt `pret`) ; ensuite : « Les autres retournent leur
 *   carte. » — sans compteur : le moment n'en a pas besoin, et le temps
 *   écoulé ouvre la nuit de toute façon (R32).
 *
 * Le rôle n'existe dans le DOM qu'après le geste (P2-19) : la face n'est
 * montée que pouce posé. Le spectateur, lui, voit la place, sans carte.
 *
 * Mobile : la carte (format moyen, agrandi à la zone de la place) tient la
 * place, la description prend la consigne pendant la lecture. Desktop : la
 * carte grande au pupitre, au milieu du cercle ; la description et la meute
 * dans la colonne de droite.
 */

import { useReducedMotion } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { campOf, type GameView, type RoleId } from '@garoutom/engine';

import { CRAN_BRUNIR_PX } from '../../anim/tokens.js';
import { jouer } from '../../lib/actions.js';
import { useGame, useNoms, useSkinId, useVoix } from '../../lib/partie.js';
import { peauDuSkin } from '../../skins/registre.js';
import { AppuiLong, BarrePouce, Bouton, Cartouche, Gabarit, Pli } from '../caprices/index.js';
import { CarteRole } from '../habit/CarteRole.js';
import { useEstLarge } from '../useEstLarge.js';
import { Perimetre, useLecture, type EtatLecture, type FormatLecture } from './MaCarte.js';
import { Place } from './Place.js';
import { Registre } from './Registre.js';
import { useZonesCommunes } from './zones.js';

/** Les dimensions des cartes de la révélation (CarteRole). */
const CARTES: Record<FormatLecture, { W: number; H: number }> = {
  grande: { W: 300, H: 420 },
  moyenne: { W: 216, H: 302 },
};

/** La ligne sous la carte, sur mobile : la légende, ou la meute pendant la lecture. */
const SOUS_LA_CARTE = 36;

/** Une première lecture « complète » : au moins une seconde de pouce posé (R5). */
const LECTURE_MIN_MS = 1_000;

/* ------------------------------------------------------------------ */
/* Le brunissage (§ 4.7)                                               */
/* ------------------------------------------------------------------ */

/**
 * Le rayon du masque : +8 px par image jusqu'à couvrir la carte ; relâché,
 * 0 dans la même image (`--m-reencrer`). Mouvement réduit : ouvert d'un coup.
 */
function useBrunissage(ouverte: boolean, rayonMax: number): number {
  const reduit = useReducedMotion() === true;
  const [rayon, setRayon] = useState(0);
  useEffect(() => {
    if (!ouverte) {
      setRayon(0);
      return;
    }
    if (reduit || typeof requestAnimationFrame !== 'function') {
      setRayon(rayonMax);
      return;
    }
    let r = 0;
    let image = 0;
    const pas = () => {
      r = Math.min(rayonMax, r + CRAN_BRUNIR_PX);
      setRayon(r);
      if (r < rayonMax) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [ouverte, rayonMax, reduit]);
  return ouverte ? rayon : 0;
}

/**
 * La carte de la révélation : le dos de cuivre par-dessus, brunissable ; la
 * face de papier dessous, montée seulement pouce posé ; le filet du
 * périmètre par-dessus tout.
 */
function CarteBrunie({
  role,
  etat,
  format,
  largeur,
}: {
  role: RoleId;
  etat: EtatLecture;
  format: FormatLecture;
  largeur: number | null;
}) {
  const { W, H } = CARTES[format];
  const l = largeur ?? W;
  const ouverte = etat === 'ouverte';
  const rayon = useBrunissage(ouverte, Math.ceil(Math.hypot(l, (l * H) / W) / 2) + 1);
  return (
    <div
      data-revelation-carte={etat}
      className="relative max-w-full shrink-0"
      style={{ width: l, aspectRatio: `${String(W)} / ${String(H)}` }}
    >
      {ouverte && (
        <div className="absolute inset-0" aria-hidden="true">
          <CarteRole role={role} retournee taille={format} tirage="papier" avecDescription={false} />
        </div>
      )}
      <div className="brunir absolute inset-0" style={{ '--r': `${String(rayon)}px` } as CSSProperties} aria-hidden="true">
        <CarteRole role={null} retournee={false} taille={format} tirage="cuivre" />
      </div>
      <Perimetre etat={etat} format={format} tirage={ouverte ? 'papier' : 'cuivre'} />
    </div>
  );
}

/** La largeur que la carte peut prendre dans sa boîte, ligne du dessous réservée. `null` tant qu'on n'a pas mesuré. */
function useLargeurCarte(format: FormatLecture, reserve: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState<number | null>(null);
  const { W, H } = CARTES[format];
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const mesurer = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const l = Math.max(96, Math.floor(Math.min(width, ((height - reserve) * W) / H)));
      setLargeur((avant) => (avant === l ? avant : l));
    };
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [W, H, reserve]);
  return { ref, largeur };
}

/* ------------------------------------------------------------------ */
/* Le savoir de la meute, sous le pouce                                */
/* ------------------------------------------------------------------ */

/**
 * Toute la meute se reconnaît, le Loup Blanc compris (R96) : il chasse avec
 * elle. Ses complices le prennent pour l'un des leurs (la vue le leur donne
 * « loup ») ; lui sait, et sa carte lui dit déjà qu'il ne gagnera que seul —
 * ce ne sont pas des complices, ce sont, un jour, des proies.
 */
function Meute({ game, role, className = '' }: { game: GameView; role: RoleId; className?: string }) {
  const voix = useVoix();
  const nom = useNoms();
  const moi = game.you;
  if (moi === null || campOf(role) !== 'loups') return null;
  const complices = game.pack === null ? [] : game.pack.seats.filter((seat) => seat !== moi.seat);
  if (complices.length === 0) {
    return <p className={className}>Aucun complice : vous chassez sans personne à vos côtés.</p>;
  }
  const noms = <span className="font-semibold">{complices.map(nom).join(' · ')}</span>;
  if (role === 'loupBlanc') {
    return (
      <p className={className}>
        Vous chassez aux côtés de {voix.nomCamp('loups')} : {noms}
      </p>
    );
  }
  return (
    <p className={className}>
      Vos complices :{' '}
      <Cartouche forme="mordu" taille={20}>
        {voix.nomRole('loup')}
      </Cartouche>{' '}
      {noms}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* L'écran                                                             */
/* ------------------------------------------------------------------ */

/** Le pli de la révélation : le registre, le même pour tous (N1). */
function PliRegistre() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Pli libelle="Le registre" icone="registre" onOuvrir={() => setOuvert(true)} />
      {ouvert && createPortal(<Registre onFermer={() => setOuvert(false)} />, document.body)}
    </>
  );
}

function Legende({ texte, className = '' }: { texte: string; className?: string }) {
  return <p className={`t-legende m-0 text-center ${className}`}>« {texte} »</p>;
}

export function Revelation() {
  const game = useGame();
  const voix = useVoix();
  const peau = peauDuSkin(useSkinId());
  const large = useEstLarge();
  const zones = useZonesCommunes();
  const [lu, setLu] = useState(false);
  const lecture = useLecture({
    surFin: (duree) => {
      if (duree >= LECTURE_MIN_MS) setLu(true);
    },
  });
  const format: FormatLecture = large ? 'grande' : 'moyenne';
  const { ref: boiteCarte, largeur } = useLargeurCarte(format, SOUS_LA_CARTE);
  const idRaison = useId();

  if (game === null) return null;
  const moi = game.you;
  const legende = voix.legendeEcran('revelation');

  // Spectateur, ou siège sans consigne : la table attend, sans rien compter.
  if (moi === null || !moi.alive || game.prompt?.kind !== 'pret') {
    return (
      <section data-testid="revelation" data-vue="spectateur" className="contents">
        <Gabarit
          {...zones}
          consigne={
            <div className="flex w-full flex-col items-center gap-1">
              <Legende texte={legende} />
              <p className="t-statut m-0 text-center text-[14px] leading-5">Les joueurs retournent leur carte.</p>
            </div>
          }
          place={
            <Place
              label="La place du village"
              disposition={large ? 'cercle' : 'grille'}
              className={large ? 'h-full' : undefined}
            />
          }
          resume={null}
          pli={<PliRegistre />}
          barre={
            <BarrePouce>
              <p className="t-corps m-0 self-center text-center text-encre-2">
                {moi === null ? 'Vous suivez la table en spectateur.' : 'La nuit tombera bientôt.'}
              </p>
            </BarrePouce>
          }
        />
      </section>
    );
  }

  const role = moi.role;
  const etat = lecture.etat;
  const ouverte = etat === 'ouverte';
  const pret = game.acted;
  const peutConfirmer = lu && !pret;
  const confirmer = () => void jouer({ type: 'pret' });

  // Le libellé de l'appui long suit la lecture ; à côté de « Je sais qui je
  // suis », il se fait court pour laisser la place au bouton.
  const court = peutConfirmer && !large;
  const libelleAppui = ouverte
    ? `${court ? 'Relâcher' : 'Relâchez pour cacher'} · ${String(lecture.restant)} s`
    : court
      ? 'Revoir'
      : pret || lu
        ? 'Gardez le pouce : ma carte'
        : 'Gardez le pouce : retourner la carte';

  const appui = (
    <span className="flex min-w-0 flex-1" {...lecture.ecouteurs}>
      <AppuiLong libelle={libelleAppui} onDebut={lecture.surDebut} onFin={lecture.surFin} className="w-full" />
    </span>
  );

  const statut = pret ? (
    <p role="status" className="t-statut m-0 w-full text-center text-[14px] leading-6">
      Les autres retournent leur carte.
    </p>
  ) : null;

  if (large) {
    return (
      <section data-testid="revelation" data-vue="joueur" className="contents">
        <Gabarit
          {...zones}
          consigne={
            <div className="flex w-full justify-center pb-3">
              <CarteBrunie role={role} etat={etat} format={format} largeur={null} />
            </div>
          }
          place={<Place label="La place du village" disposition="cercle" className="h-full" />}
          resume={<p className="t-statut m-0 w-full text-center">Bouton tenu à la souris, ou Espace tenu.</p>}
          pli={null}
          barre={<BarrePouce>{appui}</BarrePouce>}
          colonne={
            <div className="flex h-full flex-col border border-filet-doux bg-surface p-6 text-encre">
              <p className="t-rubrique m-0 text-encre-2">Votre carte</p>
              <div aria-live="polite">
                {ouverte ? (
                  <>
                    <h2 className="t-titre m-0 mt-2">{voix.nomRole(role)}</h2>
                    <p className="t-corps m-0 mt-3">{voix.descriptionRole(role)}</p>
                    {campOf(role) === 'loups' && (
                      <div className="mt-7 border-t-[0.75px] border-filet-doux pt-4">
                        <p className="t-rubrique m-0 text-encre-2">
                          {role === 'loupBlanc' ? 'Ceux qui chassent avec vous' : 'Votre meute'}
                        </p>
                        <Meute game={game} role={role} className="t-corps m-0 mt-2.5" />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="t-jeu m-0 mt-2">
                    {pret ? 'Votre carte est retournée face contre table.' : peau.prompts.pret}
                  </p>
                )}
              </div>
              <div className="mt-7 border-t-[0.75px] border-filet-doux pt-4">
                <Legende texte={legende} className="text-left" />
              </div>
              <div className="mt-auto pt-6">
                {pret ? (
                  statut
                ) : (
                  <>
                    <Bouton
                      variante="secondaire"
                      className="w-full"
                      disabled={!lu}
                      aria-describedby={lu ? undefined : idRaison}
                      onClick={confirmer}
                    >
                      Je sais qui je suis
                    </Bouton>
                    {!lu && (
                      <p id={idRaison} className="t-statut m-0 mt-1.5">
                        Lisez votre carte une première fois.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          }
        />
      </section>
    );
  }

  return (
    <section data-testid="revelation" data-vue="joueur" className="contents">
      <Gabarit
        {...zones}
        consigne={
          ouverte ? (
            <p className="t-corps m-0 max-h-full w-full overflow-y-auto">{voix.descriptionRole(role)}</p>
          ) : pret ? (
            <Legende texte={legende} className="w-full" />
          ) : (
            <p className="t-jeu m-0 w-full">{peau.prompts.pret}</p>
          )
        }
        place={
          <div className="flex h-full flex-col items-center px-[var(--gouttiere)]">
            <div ref={boiteCarte} className="flex min-h-0 w-full flex-1 flex-col items-center">
              <CarteBrunie role={role} etat={etat} format={format} largeur={largeur} />
              <div className="flex w-full shrink-0 items-center justify-center" style={{ height: SOUS_LA_CARTE }}>
                {ouverte ? (
                  <Meute game={game} role={role} className="m-0 text-center text-[14px] leading-[18px]" />
                ) : pret ? null : (
                  <Legende texte={legende} />
                )}
              </div>
            </div>
            {/* Ce qu'un lecteur d'écran entend quand la carte se retourne — rien avant. */}
            <div className="sr-only" aria-live="polite">
              {ouverte && (
                <>
                  <p className="m-0">Vous êtes</p>
                  <h2 className="m-0">{voix.nomRole(role)}</h2>
                  <p className="m-0">« {voix.legendeRole(role)} »</p>
                </>
              )}
            </div>
          </div>
        }
        resume={statut}
        pli={<PliRegistre />}
        barre={
          <BarrePouce>
            {appui}
            {peutConfirmer && (
              <Bouton variante="secondaire" className="flex-1" onClick={confirmer}>
                Je sais qui je suis
              </Bouton>
            )}
          </BarrePouce>
        }
      />
    </section>
  );
}
