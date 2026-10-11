/**
 * Racine du client Garoutom : branchement du canal, choix de l'écran, avis.
 *
 * Tout ce qui vient du serveur entre par le canal et va droit au magasin —
 * ici, pas de file d'affichage à ménager : le loup-garou n'a pas de dé à
 * faire attendre, et le salon n'a rien à mettre en scène. Le `sync` est la
 * seule vérité d'état ; les avis sont la seule voix du serveur.
 *
 * Le choix d’écran se lit en une ligne : pas de table → l’accueil ; salon →
 * la table qui se remplit ; partie lancée ou finie → l’écran de partie.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import type { NoticePayload, SyncPayload } from '@garoutom/engine';

import { DUREE_AVIS_MS, RESSORT_CARTE, RESSORT_PANNEAU } from './anim/tokens.js';
import { codeDeLUrl, inscrireCodeDansLUrl, reprendrePlace } from './lib/actions.js';
import { canal } from './lib/socket.js';
import { useStore, type Notice } from './lib/store.js';
import { Home } from './screens/Home.js';
import { Partie } from './screens/Partie.js';
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
  //
  // Après un rechargement, le magasin est vide : c'est l'adresse qui se
  // souvient de la table (`?table=ABCD`, tenue à jour juste en dessous), et
  // le jeton rangé sur cette machine qui prouve que la place est la nôtre.
  useEffect(() => {
    if (!connected) return;
    const code = useStore.getState().room?.code ?? codeDeLUrl();
    if (code === null) return;
    void reprendrePlace(code);
  }, [connected, epoque]);

  // L'adresse suit la table : un rechargement y retrouve son chemin, et le
  // lien de la barre d'adresse est déjà un lien d'invitation. On n'efface le
  // code qu'en quittant une table — pas au premier rendu, où le magasin est
  // vide le temps que la reprise aboutisse.
  const codeTable = room?.code ?? null;
  const codePrecedent = useRef<string | null>(null);
  useEffect(() => {
    if (codeTable !== null) inscrireCodeDansLUrl(codeTable);
    else if (codePrecedent.current !== null) inscrireCodeDansLUrl(null);
    codePrecedent.current = codeTable;
  }, [codeTable]);

  const ecran =
    room === null ? (
      <Home />
    ) : room.status === 'lobby' ? (
      <Salon room={room} />
    ) : (
      <Partie room={room} />
    );

  return (
    <div className="relative h-full" data-skin={room?.options.skin ?? 'thiercelieux'}>
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
