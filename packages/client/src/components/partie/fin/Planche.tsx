/**
 * Une planche de la nuit racontée (SPEC Caprices § 5.15 ; maquettes
 * `C-Fin-NuitRacontee`, `C-Fin-Planche`) : son numéro et son heure en
 * rubrique, la vignette du graveur, sa légende, puis les lignes du récit.
 *
 * Les lignes sont celles du skin (le log dit, le skin récite : rien n'est
 * inventé ici, on pose les pseudos et les noms de rôles dans les modèles de
 * phrase). Seule la meute a une couleur : le nom d'un rôle de la meute
 * s'écrit à la sanguine, au mot (§ 2.3) ; tout le reste est encre.
 *
 * `PlanchePleinEcran` montre une planche seule, vignette à 192, avec la
 * navigation « ‹ Pl. 2 · 3 sur 7 · Pl. 4 › » dans la barre au pouce.
 */

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { campOf, type GameView, type LogEntry, type RoleId } from '@garoutom/engine';

import { useNoms, useSkinId, useVoix } from '../../../lib/partie.js';
import { peauDuSkin, resoudre } from '../../../skins/registre.js';
import { BarrePouce, Bouton, Cuvette } from '../../caprices/index.js';
import { Vignette } from '../../habit/Vignette.js';
import { listeDeNoms } from '../Narrateur.js';
import { SUJET_DE_LA_VIGNETTE, type Planche } from './planches.js';

export interface Ligne {
  texte: string;
  /** Le nom d'un rôle de la meute dans la phrase : il s'écrit à la sanguine. */
  meute?: string;
  /** Le décompte d'un vote, en statut. */
  detail?: string;
}

/** La phrase de chaque entrée du log, dans la voix du skin. */
export function useLignes(game: GameView): (entree: LogEntry) => Ligne {
  const voix = useVoix();
  const noms = useNoms();
  const lignes = peauDuSkin(useSkinId()).recit.lignes;
  const roles = new Map(game.players.map((joueur) => [joueur.seat, joueur.role] as const));
  const accent = (role: RoleId | null | undefined): string | undefined =>
    role !== null && role !== undefined && campOf(role) === 'loups' ? voix.nomRole(role) : undefined;

  return (entree) => {
    switch (entree.type) {
      case 'amoureux':
        return { texte: resoudre(lignes.amoureux, { nom: noms(entree.seats[0]), ancien: noms(entree.seats[1]) }) };
      case 'protection':
        return { texte: resoudre(lignes.protection, { nom: noms(entree.target) }) };
      case 'voyance':
        return {
          texte: resoudre(lignes.voyance, { nom: noms(entree.target), role: voix.nomRole(entree.role) }),
          meute: accent(entree.role),
        };
      case 'loups':
        return {
          texte: entree.target === null ? lignes.loups.personne : resoudre(lignes.loups.cible, { nom: noms(entree.target) }),
        };
      case 'sauvetage':
        return { texte: resoudre(lignes.sauvetage, { nom: noms(entree.target) }) };
      case 'poison':
        return { texte: resoudre(lignes.poison, { nom: noms(entree.target) }) };
      case 'mort': {
        const role = roles.get(entree.seat) ?? null;
        return { texte: voix.phraseMort(entree.cause, noms(entree.seat), role), meute: accent(role) };
      }
      case 'grace':
        return { texte: resoudre(lignes.grace, { nom: noms(entree.seat) }) };
      case 'capitaine':
        return { texte: resoudre(lignes.capitaine, { nom: noms(entree.seat) }) };
      case 'tir':
        return {
          texte: entree.target === null ? lignes.tir.personne : resoudre(lignes.tir.cible, { nom: noms(entree.target) }),
        };
      case 'vote': {
        const decompte = Object.entries(entree.tally)
          .map(([siege, nombre]) => ({ siege: Number(siege), nombre }))
          .sort((a, b) => b.nombre - a.nombre || a.siege - b.siege)
          .map(({ siege, nombre }) => `${noms(siege)} ×${String(nombre)}`)
          .join(', ');
        return {
          texte:
            entree.executed === null
              ? lignes.vote.personne
              : resoudre(lignes.vote.condamne, { nom: noms(entree.executed) }),
          detail: decompte === '' ? undefined : decompte,
        };
      }
      case 'resistance':
        return { texte: resoudre(lignes.resistance, { nom: noms(entree.seat) }) };
      case 'rancune':
        return { texte: resoudre(lignes.rancune, { nom: noms(entree.seat) }) };
      case 'corbeau':
        return { texte: resoudre(lignes.corbeau, { nom: noms(entree.target) }) };
      case 'bouc':
        return { texte: resoudre(lignes.bouc, { nom: noms(entree.seat) }) };
      case 'votants':
        // `null` : le Bouc s'est tu (ou son temps a filé), tout le monde vote.
        return {
          texte:
            entree.seats === null
              ? lignes.votants.personne
              : resoudre(lignes.votants.designes, { noms: listeDeNoms(entree.seats.map(noms)) }),
        };
      case 'loupBlanc':
        return {
          texte:
            entree.target === null
              ? lignes.loupBlanc.personne
              : resoudre(lignes.loupBlanc.cible, { nom: noms(entree.target) }),
        };
      case 'renard':
        // Le log ne dit que le centre du trio (R107) : la conclusion suffit.
        return {
          texte: entree.loups
            ? resoudre(lignes.renard.loups, { nom: noms(entree.centre) })
            : resoudre(lignes.renard.sain, { nom: noms(entree.centre) }),
        };
      case 'ours':
        return {
          texte: entree.grogne
            ? resoudre(lignes.ours.grogne, { nom: noms(entree.seat) })
            : resoudre(lignes.ours.silence, { nom: noms(entree.seat) }),
        };
      case 'voleur':
        // L'abstention se lit à la formule du moteur — la carte gardée
        // s'inscrit « voleur » (R110) : le récit ne nomme jamais la main qui
        // a pris, le log ne la connaît pas.
        return entree.carte === 'voleur'
          ? { texte: lignes.voleur.garde }
          : {
              texte: resoudre(lignes.voleur.prise, { role: voix.nomRole(entree.carte) }),
              meute: accent(entree.carte),
            };
      case 'chienLoup':
        return {
          texte: resoudre(entree.camp === 'village' ? lignes.chienLoup.village : lignes.chienLoup.loups, {
            nom: noms(entree.seat),
          }),
        };
      case 'modele':
        return {
          texte: resoudre(lignes.modele, { enfant: noms(entree.seat), nom: noms(entree.target) }),
        };
      case 'transformation':
        // Le siège est celui de l'Enfant : son pseudo dit de qui le modèle
        // est mort (R112, D33).
        return { texte: resoudre(lignes.transformation, { nom: noms(entree.seat) }) };
    }
  };
}

/** Le titre d'une planche : « Pl. 3 — Nuit 2 » ; l'heure dans les mots du skin. */
export function useTitrePlanche(): (planche: Planche) => { numero: string; heure: string } {
  const recit = peauDuSkin(useSkinId()).recit;
  return (planche) => ({
    numero: `Pl. ${String(planche.numero)}`,
    heure:
      planche.heure === 'fin'
        ? 'La fin'
        : resoudre(planche.heure === 'nuit' ? recit.nuit : recit.jour, { n: String(planche.n) }),
  });
}

/** Une phrase du récit, le nom d'un rôle de la meute à la sanguine. */
function TexteLigne({ ligne }: { ligne: Ligne }) {
  const rang = ligne.meute === undefined ? -1 : ligne.texte.lastIndexOf(ligne.meute);
  if (ligne.meute === undefined || rang < 0) return <>{ligne.texte}</>;
  return (
    <>
      {ligne.texte.slice(0, rang)}
      <b className="font-semibold text-meute">{ligne.meute}</b>
      {ligne.texte.slice(rang + ligne.meute.length)}
    </>
  );
}

/** Les lignes d'une planche. */
export function LignesPlanche({
  entrees,
  ligne,
  className = '',
}: {
  entrees: readonly LogEntry[];
  ligne: (entree: LogEntry) => Ligne;
  className?: string;
}) {
  if (entrees.length === 0) return null;
  return (
    <ol className={`m-0 flex list-none flex-col gap-1 p-0 ${className}`}>
      {entrees.map((entree, i) => {
        const l = ligne(entree);
        return (
          <li key={`${entree.type}-${String(i)}`} className="t-corps">
            <TexteLigne ligne={l} />
            {l.detail !== undefined && <span className="t-statut block">{l.detail}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** La rubrique « Pl. 3 — Nuit 2 », l'heure dans son propre nœud. */
export function RubriquePlanche({ planche }: { planche: Planche }) {
  const titre = useTitrePlanche()(planche);
  return (
    <>
      {titre.numero} — <span>{titre.heure}</span>
    </>
  );
}

/**
 * Une planche en plein écran : la cuvette à 24 px des bords, la vignette à
 * 192, la légende, les lignes ; la barre au pouce pour aller d'une planche à
 * l'autre (et les flèches du clavier) ; « Refermer » ou Échap pour revenir.
 */
export function PlanchePleinEcran({
  planches,
  rang,
  ligne,
  onAller,
  onFermer,
}: {
  planches: readonly Planche[];
  rang: number;
  ligne: (entree: LogEntry) => Ligne;
  onAller: (rang: number) => void;
  onFermer: () => void;
}) {
  const voix = useVoix();
  const idTitre = useId();
  const refermer = useRef<HTMLButtonElement>(null);
  const rappels = useRef({ onAller, onFermer, rang, total: planches.length });
  rappels.current = { onAller, onFermer, rang, total: planches.length };

  // Le focus entre dans la planche et revient d'où il venait.
  useEffect(() => {
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    refermer.current?.focus();
    const surTouche = (evenement: KeyboardEvent) => {
      const { onAller: aller, onFermer: fermer, rang: ici, total } = rappels.current;
      if (evenement.key === 'Escape') {
        evenement.stopPropagation();
        fermer();
      } else if (evenement.key === 'ArrowLeft' && ici > 0) {
        aller(ici - 1);
      } else if (evenement.key === 'ArrowRight' && ici < total - 1) {
        aller(ici + 1);
      }
    };
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('keydown', surTouche);
      avant?.focus();
    };
  }, []);

  const planche = planches[rang];
  if (planche === undefined) return null;
  const avant = planches[rang - 1];
  const apres = planches[rang + 1];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      data-testid="planche-plein-ecran"
      className="fixed inset-0 z-[90] flex flex-col bg-fond text-encre"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex h-14 shrink-0 items-center justify-end px-[var(--gouttiere)]">
        <Bouton ref={refermer} variante="discret" onClick={onFermer}>
          Refermer
        </Bouton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <Cuvette className="mx-auto flex min-h-full max-w-[560px] flex-col items-center px-6 py-6 text-center">
          <h2 id={idTitre} className="t-rubrique m-0">
            <RubriquePlanche planche={planche} />
          </h2>
          <div className="mt-5">
            <Vignette
              nom={planche.vignette}
              taille={192}
              libelle={`Vignette : ${SUJET_DE_LA_VIGNETTE[planche.vignette]}`}
            />
          </div>
          <p className="t-legende m-0 mt-[22px] max-w-[300px] text-[20px] leading-7">« {voix.legendeRecit(planche.legende)} »</p>
          {planche.entrees.length > 0 && (
            <LignesPlanche
              entrees={planche.entrees}
              ligne={ligne}
              className="mt-[22px] w-full max-w-[294px] border-t-[0.75px] border-filet-doux pt-3.5 text-left"
            />
          )}
        </Cuvette>
      </div>
      <BarrePouce>
        <Bouton
          variante="secondaire"
          disabled={avant === undefined}
          aria-label={avant === undefined ? 'Aucune planche avant' : `Planche précédente : Pl. ${String(avant.numero)}`}
          onClick={() => onAller(rang - 1)}
        >
          {avant === undefined ? '‹' : `‹ Pl. ${String(avant.numero)}`}
        </Bouton>
        <p className="t-chiffre m-0 self-center text-center text-encre-2" aria-live="polite">
          {rang + 1} sur {planches.length}
        </p>
        <Bouton
          variante="secondaire"
          disabled={apres === undefined}
          aria-label={apres === undefined ? 'Aucune planche après' : `Planche suivante : Pl. ${String(apres.numero)}`}
          onClick={() => onAller(rang + 1)}
        >
          {apres === undefined ? '›' : `Pl. ${String(apres.numero)} ›`}
        </Bouton>
      </BarrePouce>
    </div>,
    document.body,
  );
}
