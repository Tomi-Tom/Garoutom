/**
 * La nuit racontée : le `log` de la partie finie, récité nuit après nuit dans
 * la voix du skin, secrets compris (R88). Le log dit, le skin récite : rien
 * n'est inventé ici, on pose seulement les pseudos et les noms de rôles dans
 * les modèles de phrase du skin.
 *
 * Mobile : chaque jour est un bloc repliable (le dernier est ouvert).
 * Grand écran (≥ 1024 px) : tout est déplié, le bouton n'est plus qu'un titre.
 */

import { useState } from 'react';

import type { GameView, LogEntry } from '@garoutom/engine';

import { useNoms, useSkinId, useVoix } from '../../../lib/partie.js';
import { peauDuSkin, resoudre } from '../../../skins/registre.js';
import { listeDeNoms } from '../Narrateur.js';
import { decouperLog, type JourRaconte } from './recit.js';

interface Ligne {
  texte: string;
  /** Le décompte d'un vote, en petit. */
  detail?: string;
  /** La teinte du filet à gauche. */
  filet: string;
}

function useLignes(game: GameView): (entree: LogEntry) => Ligne {
  const voix = useVoix();
  const noms = useNoms();
  const lignes = peauDuSkin(useSkinId()).recit.lignes;
  const roles = new Map(game.players.map((joueur) => [joueur.seat, joueur.role] as const));

  return (entree) => {
    switch (entree.type) {
      case 'amoureux':
        return {
          texte: resoudre(lignes.amoureux, { nom: noms(entree.seats[0]), ancien: noms(entree.seats[1]) }),
          filet: 'var(--serment)',
        };
      case 'protection':
        return { texte: resoudre(lignes.protection, { nom: noms(entree.target) }), filet: 'var(--lanterne)' };
      case 'voyance':
        return {
          texte: resoudre(lignes.voyance, { nom: noms(entree.target), role: voix.nomRole(entree.role) }),
          filet: 'var(--lune)',
        };
      case 'loups':
        return {
          texte:
            entree.target === null
              ? lignes.loups.personne
              : resoudre(lignes.loups.cible, { nom: noms(entree.target) }),
          filet: 'var(--sang)',
        };
      case 'sauvetage':
        return { texte: resoudre(lignes.sauvetage, { nom: noms(entree.target) }), filet: 'var(--lanterne)' };
      case 'poison':
        return { texte: resoudre(lignes.poison, { nom: noms(entree.target) }), filet: 'var(--sang)' };
      case 'mort':
        return {
          texte: voix.phraseMort(entree.cause, noms(entree.seat), roles.get(entree.seat) ?? null),
          filet: 'var(--sang-creux)',
        };
      case 'grace':
        return { texte: resoudre(lignes.grace, { nom: noms(entree.seat) }), filet: 'var(--lanterne)' };
      case 'capitaine':
        return { texte: resoudre(lignes.capitaine, { nom: noms(entree.seat) }), filet: 'var(--lanterne)' };
      case 'tir':
        return {
          texte:
            entree.target === null
              ? lignes.tir.personne
              : resoudre(lignes.tir.cible, { nom: noms(entree.target) }),
          filet: 'var(--sang)',
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
          filet: 'var(--lune)',
        };
      }
      case 'resistance':
        return { texte: resoudre(lignes.resistance, { nom: noms(entree.seat) }), filet: 'var(--lanterne)' };
      case 'rancune':
        return { texte: resoudre(lignes.rancune, { nom: noms(entree.seat) }), filet: 'var(--sang-creux)' };
      case 'corbeau':
        return { texte: resoudre(lignes.corbeau, { nom: noms(entree.target) }), filet: 'var(--lune)' };
      case 'bouc':
        return { texte: resoudre(lignes.bouc, { nom: noms(entree.seat) }), filet: 'var(--sang)' };
      case 'votants':
        // `null` : le Bouc s'est tu (ou son temps a filé), tout le monde vote.
        return {
          texte:
            entree.seats === null
              ? lignes.votants.personne
              : resoudre(lignes.votants.designes, { noms: listeDeNoms(entree.seats.map(noms)) }),
          filet: 'var(--lanterne)',
        };
      case 'loupBlanc':
        return {
          texte:
            entree.target === null
              ? lignes.loupBlanc.personne
              : resoudre(lignes.loupBlanc.cible, { nom: noms(entree.target) }),
          filet: 'var(--sang)',
        };
    }
  };
}

function Bloc({
  titre,
  entrees,
  ligne,
}: {
  titre: string;
  entrees: LogEntry[];
  ligne: (entree: LogEntry) => Ligne;
}) {
  if (entrees.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="font-identite text-lg text-lanterne">{titre}</h4>
      <ol className="mt-1 flex flex-col gap-1.5">
        {entrees.map((entree, i) => {
          const l = ligne(entree);
          return (
            <li
              key={`${entree.type}-${String(i)}`}
              className="border-l-2 pl-3 text-papier"
              style={{ borderColor: l.filet }}
            >
              {l.texte}
              {l.detail && <span className="block text-sm text-papier-doux">{l.detail}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Jour({
  jour,
  ouvertParDefaut,
  ligne,
}: {
  jour: JourRaconte;
  ouvertParDefaut: boolean;
  ligne: (entree: LogEntry) => Ligne;
}) {
  const recit = peauDuSkin(useSkinId()).recit;
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const id = `fin-jour-${String(jour.n)}`;
  const n = String(jour.n);
  return (
    <section className="carte p-3">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-identite text-xl text-papier lg:pointer-events-none"
        >
          <span>
            {resoudre(recit.nuit, { n })} · {resoudre(recit.jour, { n })}
          </span>
          <span aria-hidden className="text-papier-doux lg:hidden">
            {ouvert ? '−' : '+'}
          </span>
        </button>
      </h3>
      <div id={id} className={ouvert ? 'block' : 'hidden lg:block'}>
        <Bloc titre={resoudre(recit.nuit, { n })} entrees={jour.nuit} ligne={ligne} />
        <Bloc titre={resoudre(recit.jour, { n })} entrees={jour.jour} ligne={ligne} />
      </div>
    </section>
  );
}

export function NuitRacontee({ game }: { game: GameView }) {
  const ligne = useLignes(game);
  const jours = decouperLog(game.log ?? []);
  if (jours.length === 0) return null;
  return (
    <section aria-labelledby="fin-recit" className="w-full">
      <h2 id="fin-recit" className="font-identite text-2xl text-papier">
        La nuit racontée
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {jours.map((jour, i) => (
          <Jour key={jour.n} jour={jour} ouvertParDefaut={i === jours.length - 1} ligne={ligne} />
        ))}
      </div>
    </section>
  );
}
