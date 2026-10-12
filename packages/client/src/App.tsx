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
 * Seul l'accueil voyage dans le paquet initial : le salon et l'écran de partie
 * sont des morceaux à part (`screens/ecrans.ts`), préchargés dès le premier
 * rendu ; les gravures de la fin et de Shiganshina, au moment où la table en
 * aura besoin.
 *
 * Depuis D22, la racine tient aussi le lien : le réveil du canal sur la vie
 * de la page, la reprise de sa place à chaque connexion, et ce que disent les
 * codes de fermeture — partie ouverte ailleurs, version refusée, table
 * disparue. Et l'écran reste allumé tant qu'on est à table.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { NoticePayload, SyncPayload } from '@garoutom/engine';

import { DUREE_AVIS_MS, IMPRESSION } from './anim/tokens.js';
import { Bouton, Cartouche, Cuvette, Matieres, useTirage } from './components/caprices/index.js';
import { Glyphe } from './components/habit/glyphes.js';
import { prechargerFinDePartie, prechargerShiganshina } from './components/habit/traces-paresseuses.js';
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
import { ECRAN_PARTIE, ECRAN_SALON, prechargerEcrans } from './screens/ecrans.js';
import { Home } from './screens/Home.js';
import { voixDuSkin } from './skins/registre.js';

/** La table qui s'est levée sans nous : ce qu'il faut pour la dire, après qu'on l'a oubliée. */
interface TableDisparue {
  code: string;
  skin: string;
}

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
  const [disparue, setDisparue] = useState<TableDisparue | null>(null);

  useEffect(() => {
    const leCanal = canal();
    const store = useStore.getState();
    const surSync = (payload: SyncPayload) => store.applySync(payload);
    const surAvis = ({ message, tone, code }: NoticePayload) => {
      // La table a disparu sous nos pieds : on oublie tout, et on le dit.
      const table = code === 'gone' ? codeCourant() : null;
      if (table !== null) {
        setDisparue({ code: table, skin: useStore.getState().room?.options.skin ?? 'thiercelieux' });
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
      if (code === null) return;
      setDisparue({ code, skin: useStore.getState().room?.options.skin ?? 'thiercelieux' });
      placePerdue(code, 'gone');
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

  // Papier le jour, cuivre la nuit (Caprices § 3.2) : posé sur <html>.
  useTirage();

  // Le dernier état reste lisible le temps de reprendre sa place ; hors ligne,
  // un voile le couvre et plus rien n'y répond (SPEC § 5.11) — sans jamais
  // passer le texte à l'opacité.
  const suspendu = room !== null && (!connected || rattachement !== 'rattache');
  const horsLigne = useStore((state) => state.horsLigne);

  // Les morceaux à part : les écrans de table dès le premier rendu (l'accueil
  // est déjà peint) ; la fin de partie quand la partie se joue ; les gravures
  // du district quand la table passe à Shiganshina. Un échec réseau se
  // retentera au rendu qui en a besoin.
  const statut = room?.status ?? null;
  const skinTable = room?.options.skin ?? null;
  useEffect(() => {
    prechargerEcrans().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (statut !== null && statut !== 'lobby') prechargerFinDePartie().catch(() => undefined);
  }, [statut]);
  useEffect(() => {
    if (skinTable === 'shiganshina') prechargerShiganshina().catch(() => undefined);
  }, [skinTable]);

  // Tant qu'un écran de table n'est pas arrivé (presque jamais : il est
  // préchargé), la page reste nue un instant.
  const salon = ECRAN_SALON.useModule(statut === 'lobby');
  const partie = ECRAN_PARTIE.useModule(statut !== null && statut !== 'lobby');
  const ecran =
    room === null ? (
      <Home />
    ) : room.status === 'lobby' ? (
      salon !== undefined && <salon.Salon room={room} />
    ) : (
      partie !== undefined && <partie.Partie room={room} />
    );

  return (
    <div className="relative flex h-full flex-col" data-skin={room?.options.skin ?? 'thiercelieux'}>
      <Bandeau />

      <div className="relative min-h-0 flex-1">
        <div
          className="h-full"
          data-suspendu={suspendu ? '' : undefined}
          aria-busy={suspendu || undefined}
          inert={horsLigne && room !== null ? true : undefined}
        >
          {ecran}
        </div>
        {horsLigne && room !== null && (
          <div
            aria-hidden="true"
            data-testid="voile-hors-ligne"
            className="hach-x absolute inset-0 z-[90]"
            style={{ opacity: 0.2 }}
          />
        )}
      </div>

      <Matieres />
      <RegionVivante />
      <Avis />
      {remplace && <AutreOnglet />}
      {disparue !== null && <TableSansVous table={disparue} onRetour={() => setDisparue(null)} />}
    </div>
  );
}

/**
 * Le bandeau du lien (SPEC § 5.11) : 32 px entre la barre d'état et la frise,
 * qui décale l'écran — l'état réseau n'est pas un secret de rôle. Pour soi
 * seul, et sans jamais dire pourquoi les autres sont absents (recherche 04,
 * P1 n° 13). Fond palier-3 sous des hachures verticales, texte vergé sur un
 * cartouche palier-3 plein.
 *
 * - hors ligne : tout de suite, dès que le navigateur le dit ;
 * - reconnexion : le canal se rebranche, sans jamais renoncer ;
 * - reprise de votre place : connecté, la place n'est pas encore rendue —
 *   les actions attendent ;
 * - reprise impossible : un geste la relance.
 *
 * (La partie ouverte ailleurs a son propre écran, `AutreOnglet`.)
 */
function Bandeau() {
  const connected = useStore((state) => state.connected);
  const horsLigne = useStore((state) => state.horsLigne);
  const rattachement = useStore((state) => state.rattachement);
  const remplace = useStore((state) => state.remplace);

  const message: { texte: string; etat: string; relancer?: true } | null = remplace
    ? null
    : horsLigne
      ? { etat: 'hors-ligne', texte: 'Hors ligne — dernier état connu.' }
      : !connected
        ? { etat: 'reconnexion', texte: 'Reconnexion… la table vous garde votre place.' }
        : rattachement === 'reprise' || rattachement === 'perdu'
          ? { etat: 'reprise', texte: 'Reprise de votre place…' }
          : rattachement === 'echec'
            ? { etat: 'echec', texte: 'Votre place n’a pas pu être reprise.', relancer: true }
            : null;

  return (
    <AnimatePresence initial={false}>
      {message !== null && (
        <motion.div
          key="bandeau"
          initial={{ height: 0 }}
          animate={{ height: 32 }}
          exit={{ height: 0 }}
          transition={IMPRESSION}
          data-testid="bandeau-lien"
          data-etat={message.etat}
          aria-hidden={message.relancer ? undefined : 'true'}
          className="relative z-[120] flex shrink-0 items-center justify-center gap-2 overflow-visible"
          style={{
            background: 'var(--cp-palier-3)',
            backgroundImage:
              'repeating-linear-gradient(90deg, var(--cp-palier-2) 0 0.6px, transparent 0.6px 6px)',
            color: 'var(--cp-verge)',
          }}
        >
          <Cartouche
            forme="ecu"
            taille={20}
            className="[--cartouche-fond:var(--cp-palier-3)] [--cartouche-texte:var(--cp-verge)] [--cartouche-trait:var(--cp-palier-3)]"
          >
            {message.texte}
          </Cartouche>
          {message.relancer && (
            <button
              type="button"
              className="t-statut relative shrink-0 cursor-pointer border-0 bg-transparent p-0 underline underline-offset-2 before:absolute before:inset-x-[-8px] before:inset-y-[-8px] before:content-['']"
              style={{ color: 'var(--cp-verge)' }}
              onClick={reprendreSiPossible}
            >
              Réessayer
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Un écran plein, posé sur tout : la table s'est levée, ou la partie se joue ailleurs. */
function EcranPlein({
  testid,
  titre,
  idTitre,
  children,
}: {
  testid: string;
  titre: string;
  idTitre: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      data-testid={testid}
      className="fixed inset-0 z-[130] grid place-items-center p-6"
      style={{ background: 'var(--fond)' }}
    >
      <Cuvette className="w-full max-w-[24rem]">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <h2 id={idTitre} className="t-titre">
            {titre}
          </h2>
          {children}
        </div>
      </Cuvette>
    </div>
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
    <EcranPlein testid="autre-onglet" idTitre="titre-autre-onglet" titre="Partie ouverte dans un autre onglet">
      <p className="t-corps">
        La partie est ouverte dans un autre onglet. Votre place est tenue ailleurs — un autre onglet, ou un autre
        appareil.
      </p>
      <Bouton variante="primaire" onClick={reprendreIci} autoFocus>
        Reprendre ici
      </Bouton>
    </EcranPlein>
  );
}

/**
 * La table a disparu sous nos pieds (fermeture 4002, ou l'avis `gone`). La
 * place est déjà oubliée et l'accueil derrière l'écran ; celui-ci le dit, avec
 * la légende du skin, et laisse y revenir d'un geste.
 */
function TableSansVous({ table, onRetour }: { table: TableDisparue; onRetour: () => void }) {
  const legende = voixDuSkin(table.skin).legendeEcran('tableDisparue');
  return (
    <EcranPlein testid="table-disparue" idTitre="titre-table-disparue" titre={`Table ${table.code}`}>
      <p className="t-legende" data-testid="legende-table-disparue">
        {legende}
      </p>
      <Bouton variante="primaire" onClick={onRetour} autoFocus>
        Retour à l’accueil
      </Bouton>
    </EcranPlein>
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

/** Le plus d'avis qui se montrent d'un coup (SPEC § 5.13) : le plus récent en bas. */
const AVIS_VISIBLES = 3;

/** Les avis éphémères, juste au-dessus de la barre au pouce : la voix du serveur. */
function Avis() {
  const notices = useStore((state) => state.notices);
  const retirer = useStore((state) => state.dismissNotice);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-[110] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(var(--barre-pouce-h) + env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <AnimatePresence initial={false}>
        {notices.slice(-AVIS_VISIBLES).map((notice) => (
          <CarteAvis key={notice.id} notice={notice} onDone={() => retirer(notice.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Un avis : du papier, un filet, un glyphe de 16. Il paraît à l'impression
 * (pas de ressort, pas de rebond) et s'efface après 6 s. Un refus s'écrit
 * « Refusé : » en 600, avec le pâté d'encre — jamais de rouge.
 */
function CarteAvis({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DUREE_AVIS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const erreur = notice.tone === 'error';
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={IMPRESSION}
      data-avis={erreur ? 'refus' : 'info'}
      className="pointer-events-auto flex min-h-11 w-full max-w-[358px] items-center gap-2 px-4 py-3 text-sm leading-5"
      style={{
        background: 'var(--surface)',
        color: 'var(--encre)',
        border: '1px solid var(--filet)',
      }}
    >
      <Glyphe nom={erreur ? 'refuse' : 'marque'} />
      <span className="min-w-0 flex-1">
        {erreur && <strong className="font-semibold">Refusé : </strong>}
        {notice.message}
      </span>
    </motion.div>
  );
}
