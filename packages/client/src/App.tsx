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
 *
 * Depuis D22, la racine tient aussi le lien : le réveil du canal sur la vie
 * de la page, la reprise de sa place à chaque connexion, et ce que disent les
 * codes de fermeture — partie ouverte ailleurs, version refusée, table
 * disparue. Et l'écran reste allumé tant qu'on est à table.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import type { NoticePayload, SyncPayload } from '@garoutom/engine';

import { DUREE_AVIS_MS, RESSORT_CARTE, RESSORT_PANNEAU } from './anim/tokens.js';
import {
  annulerReprise,
  codeDeLUrl,
  inscrireCodeDansLUrl,
  placePerdue,
  rechargerPourVersion,
  reprendrePlace,
} from './lib/actions.js';
import { useEcranAllume } from './lib/ecranAllume.js';
import { loadToken } from './lib/identity.js';
import { brancherReveil, canal } from './lib/socket.js';
import { useStore, type Notice } from './lib/store.js';
import { Home } from './screens/Home.js';
import { Partie } from './screens/Partie.js';
import { Salon } from './screens/Salon.js';

/** La table qu'on tient, ou qu'on cherche à reprendre : le magasin, sinon l'adresse. */
function codeCourant(): string | null {
  return useStore.getState().room?.code ?? codeDeLUrl();
}

/** Reprendre sa place si cette machine tient un jeton pour la table courante. */
function reprendreSiPossible(): void {
  const code = codeCourant();
  if (code === null || loadToken(code) === undefined) {
    useStore.getState().setRattachement('rattache');
    return;
  }
  void reprendrePlace(code);
}

export function App() {
  const room = useStore((state) => state.room);
  const connected = useStore((state) => state.connected);
  const remplace = useStore((state) => state.remplace);
  const rattachement = useStore((state) => state.rattachement);

  // Chaque reconnexion ouvre un WebSocket que le serveur ne rattache à
  // personne : il faut reprendre sa place, sinon on reste branché sans plus
  // rien recevoir. `epoque` compte les ouvertures, et déclenche la reprise.
  const [epoque, setEpoque] = useState(0);

  useEffect(() => {
    const leCanal = canal();
    const store = useStore.getState();
    const surSync = (payload: SyncPayload) => store.applySync(payload);
    const surAvis = ({ message, tone, code }: NoticePayload) => {
      // La table a disparu sous nos pieds : on oublie tout, et on le dit.
      const table = code === 'gone' ? codeCourant() : null;
      if (table !== null) {
        placePerdue(table, 'gone');
        return;
      }
      store.pushNotice(message, tone);
    };
    const surConnexion = () => {
      store.setConnected(true);
      setEpoque((valeur) => valeur + 1);
    };
    const surCoupe = () => {
      store.setConnected(false);
      annulerReprise();
      // On tenait une place (ou on allait la reprendre) : elle est à reprendre.
      const code = codeCourant();
      if (code !== null && loadToken(code) !== undefined) store.setRattachement('perdu');
    };
    const surRemplace = () => {
      store.setRemplace(true);
      store.setRattachement('perdu');
    };
    const surDisparue = () => {
      const code = codeCourant();
      if (code !== null) placePerdue(code, 'gone');
    };
    const surHorloge = (decalage: number) => store.setDecalageCanal(decalage);

    leCanal.on('sync', surSync);
    leCanal.on('notice', surAvis);
    leCanal.on('connect', surConnexion);
    leCanal.on('disconnect', surCoupe);
    leCanal.on('replaced', surRemplace);
    leCanal.on('version', rechargerPourVersion);
    leCanal.on('gone', surDisparue);
    leCanal.on('clock', surHorloge);
    store.setConnected(leCanal.connected);
    if (leCanal.clockOffset !== null) store.setDecalageCanal(leCanal.clockOffset);
    const debrancher = brancherReveil(leCanal, (enLigne) => store.setHorsLigne(!enLigne));
    return () => {
      debrancher();
      leCanal.off('sync', surSync);
      leCanal.off('notice', surAvis);
      leCanal.off('connect', surConnexion);
      leCanal.off('disconnect', surCoupe);
      leCanal.off('replaced', surRemplace);
      leCanal.off('version', rechargerPourVersion);
      leCanal.off('gone', surDisparue);
      leCanal.off('clock', surHorloge);
    };
  }, []);

  // Reprendre sa place, à la première connexion comme après chaque coupure :
  // on ne rentrera tout seul que si cette machine tient encore un jeton pour
  // cette table. L'entrée volontaire (ouverture, code tapé) passe par les
  // actions des écrans, pas par ici.
  //
  // Après un rechargement, le magasin est vide : c'est l'adresse qui se
  // souvient de la table (`?table=ABCD`, tenue à jour juste en dessous), et
  // le jeton rangé sur cette machine — ou en mémoire — qui prouve que la
  // place est la nôtre.
  useEffect(() => {
    if (!connected) return;
    reprendreSiPossible();
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

  // L'écran reste allumé à table — salon compris —, et s'éteint quand on la quitte.
  useEcranAllume(room !== null);

  // Le dernier état reste lisible, grisé, le temps de reprendre sa place.
  const suspendu = room !== null && (!connected || rattachement !== 'rattache');

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
      <div
        className="h-full"
        data-suspendu={suspendu ? '' : undefined}
        aria-busy={suspendu || undefined}
        style={{ opacity: suspendu ? 0.55 : 1, transition: 'opacity 0.3s ease' }}
      >
        {ecran}
      </div>

      <RegionVivante />
      <Avis />
      <Bandeau />
      {remplace && <AutreOnglet />}
    </div>
  );
}

/**
 * Le bandeau du lien, en haut de l'écran : pour soi seul, et sans jamais
 * dire pourquoi les autres sont absents (recherche 04, P1 n° 13).
 *
 * - hors ligne : tout de suite, dès que le navigateur le dit ;
 * - liaison perdue : le canal se reconnecte, sans jamais renoncer ;
 * - reprise de votre place : connecté, la place n'est pas encore rendue —
 *   les actions attendent ;
 * - reprise impossible : un geste la relance.
 */
function Bandeau() {
  const connected = useStore((state) => state.connected);
  const horsLigne = useStore((state) => state.horsLigne);
  const rattachement = useStore((state) => state.rattachement);
  const remplace = useStore((state) => state.remplace);

  const message: { texte: string; relancer?: true } | null = remplace
    ? null
    : horsLigne
      ? { texte: 'Hors ligne — votre place vous attend.' }
      : !connected
        ? { texte: 'Liaison perdue — le village vous raccroche…' }
        : rattachement === 'reprise' || rattachement === 'perdu'
          ? { texte: 'Reprise de votre place…' }
          : rattachement === 'echec'
            ? { texte: 'Votre place n’a pas pu être reprise.', relancer: true }
            : null;

  return (
    <AnimatePresence>
      {message !== null && (
        <motion.div
          key="bandeau"
          initial={{ y: -30 }}
          animate={{ y: 0 }}
          exit={{ y: -30 }}
          transition={RESSORT_PANNEAU}
          data-testid="bandeau-lien"
          aria-hidden={message.relancer ? undefined : 'true'}
          className="fixed inset-x-0 top-0 z-120 flex items-center justify-center gap-3 py-1.5 text-center font-mono text-xs font-bold"
          style={{ background: 'var(--lune)', color: 'var(--nuit-creux)' }}
        >
          <span>{message.texte}</span>
          {message.relancer && (
            <button type="button" className="underline underline-offset-2" onClick={reprendreSiPossible}>
              Réessayer
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * La place a été reprise depuis un autre onglet, un autre appareil
 * (`CLOSE_REPLACED`). Celui-ci ne la reprend pas tout seul — deux onglets se
 * la voleraient en boucle — : c'est au joueur de dire où il joue.
 */
function AutreOnglet() {
  const reprendreIci = () => {
    useStore.getState().setRemplace(false);
    // La connexion qui s'ouvre relance la reprise de la place (effet de `App`).
    canal().connect();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-autre-onglet"
      data-testid="autre-onglet"
      className="fixed inset-0 z-130 grid place-items-center p-6"
      style={{ background: 'rgb(12 15 25 / 0.92)' }}
    >
      <div className="carte flex max-w-[24rem] flex-col items-center gap-4 p-6 text-center">
        <h2 id="titre-autre-onglet" className="font-identite text-2xl font-bold">
          Partie ouverte dans un autre onglet
        </h2>
        <p className="text-base" style={{ color: 'var(--papier-doux)' }}>
          Votre place est tenue ailleurs — un autre onglet, ou un autre appareil.
        </p>
        <button type="button" className="btn-village" onClick={reprendreIci} autoFocus>
          Reprendre ici
        </button>
      </div>
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
