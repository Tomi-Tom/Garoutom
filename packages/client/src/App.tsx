/**
 * Racine du client Garoutom : branchement du canal, choix de l'écran, avis.
 *
 * Tout ce qui vient du serveur entre par le canal et va droit au magasin —
 * ici, pas de file d'affichage à ménager : le loup-garou n'a pas de dé à
 * faire attendre, et le salon n'a rien à mettre en scène. Le `sync` est la
 * seule vérité d'état ; les avis sont la seule voix du serveur.
 *
 * Le choix d'écran se lit en une ligne : pas de table → l'accueil ; salon →
 * la table qui se remplit ; partie lancée → l'écran de jeu, qui n'existe pas
 * encore et dit honnêtement sa place en attendant.
 */

import { LienArcade } from '@tombp/arcade';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import type { NoticePayload, RoomView, SyncPayload } from '@garoutom/engine';

import { DUREE_AVIS_MS, RESSORT_CARTE, RESSORT_PANNEAU } from './anim/tokens.js';
import { quitterTable, reprendrePlace } from './lib/actions.js';
import { ARCADE_ID } from './lib/identity.js';
import { canal } from './lib/socket.js';
import { useStore, type Notice } from './lib/store.js';
import { Home } from './screens/Home.js';
import { Salon } from './screens/Salon.js';

export function App() {
  const room = useStore((state) => state.room);
  const connected = useStore((state) => state.connected);

  // Chaque reconnexion ouvre un WebSocket que le serveur ne rattache à
  // personne : il faut reprendre sa place, sinon on reste branché sans plus
  // rien recevoir. `epoque` compte les ouvertures, et déclenche la reprise.
  const [epoque, setEpoque] = useState(0);

  useEffect(() => {
    const leCanal = canal();
    const store = useStore.getState();
    const surSync = (payload: SyncPayload) => store.applySync(payload);
    const surAvis = ({ message, tone }: NoticePayload) => store.pushNotice(message, tone);
    const surConnexion = () => {
      store.setConnected(true);
      setEpoque((valeur) => valeur + 1);
    };
    const surCoupe = () => store.setConnected(false);

    leCanal.on('sync', surSync);
    leCanal.on('notice', surAvis);
    leCanal.on('connect', surConnexion);
    leCanal.on('disconnect', surCoupe);
    store.setConnected(leCanal.connected);
    return () => {
      leCanal.off('sync', surSync);
      leCanal.off('notice', surAvis);
      leCanal.off('connect', surConnexion);
      leCanal.off('disconnect', surCoupe);
    };
  }, []);

  // Reprendre sa place, à la première connexion comme après chaque coupure :
  // on ne rentrera tout seul que si cette machine tient encore un jeton pour
  // cette table. L'entrée volontaire (ouverture, code tapé) passe par les
  // actions des écrans, pas par ici.
  useEffect(() => {
    if (!connected) return;
    const code = useStore.getState().room?.code;
    if (code === undefined) return;
    void reprendrePlace(code);
  }, [connected, epoque]);

  const ecran =
    room === null ? (
      <Home />
    ) : room.status === 'lobby' ? (
      <Salon room={room} />
    ) : (
      <TableAttente room={room} />
    );

  return (
    <div className="relative h-full">
      {ecran}

      <RegionVivante />
      <Avis />

      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ y: -30 }}
            animate={{ y: 0 }}
            exit={{ y: -30 }}
            transition={RESSORT_PANNEAU}
            aria-hidden="true"
            className="fixed inset-x-0 top-0 z-120 py-1.5 text-center font-mono text-xs font-bold"
            style={{ background: 'var(--lune)', color: 'var(--nuit-creux)' }}
          >
            Liaison perdue — le village vous raccroche…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * L'écran de table, pour l'heure honnête : une phrase, pas un faux jeu.
 *
 * L'écran réel — cartes, votes, fil du village — s'assemble sur un chantier
 * voisin ; ce socle ne dessine rien qui ressemble à une partie, pour que la
 * suite le remplace sans qu'aucune habitude n'ait été prise. Il ne retient
 * qu'une chose qui ne trompe pas : la sortie.
 */
function TableAttente({ room }: { room: RoomView }) {
  return (
    <div className="grid min-h-full place-items-center overflow-auto p-5">
      <motion.main
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={RESSORT_PANNEAU}
        className="carte flex w-[min(30rem,100%)] flex-col items-center gap-4 p-7 text-center"
      >
        <p className="m-0 font-identite text-3xl leading-tight">La partie est lancée</p>
        <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--papier-doux)' }}>
          L'écran de la table — cartes, votes, fil du village — s'assemble encore. Ce
          socle lui cède sa place sans rien casser d'autre.
        </p>
        <LienArcade id={ARCADE_ID} className="mt-1" />
        <button type="button" onClick={() => void quitterTable()} className="btn-voisin">
          Quitter la table
        </button>
        <p className="m-0 font-mono text-xs" style={{ color: 'var(--lune)' }}>
          table {room.code}
        </p>
      </motion.main>
    </div>
  );
}

/**
 * L'unique région vocale de l'application.
 *
 * Les avis visibles sont `aria-hidden` : ils redisent ce qui est déjà annoncé
 * ici, et deux régions vives qui se répondent sont pires qu'aucune.
 */
function RegionVivante() {
  const live = useStore((state) => state.live);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {live?.text ?? ''}
    </div>
  );
}

/** Le fil des avis éphémères, en bas de l'écran : la voix du serveur. */
function Avis() {
  const notices = useStore((state) => state.notices);
  const retirer = useStore((state) => state.dismissNotice);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-110 flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {notices.map((notice) => (
          <CarteAvis key={notice.id} notice={notice} onDone={() => retirer(notice.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CarteAvis({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DUREE_AVIS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const erreur = notice.tone === 'error';
  return (
    <motion.div
      layout
      initial={{ y: 12, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 6, opacity: 0, scale: 0.97 }}
      transition={RESSORT_CARTE}
      className="pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-semibold"
      style={{
        background: erreur ? 'var(--sang)' : 'var(--nuit-relief)',
        color: erreur ? 'var(--papier)' : 'var(--lune)',
        border: `1px solid ${erreur ? 'var(--sang-creux)' : 'var(--arcade-trait)'}`,
      }}
    >
      {notice.message}
    </motion.div>
  );
}
