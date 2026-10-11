# Chantier « robustesse » — aucune partie perdue, aucune place perdue

**Ouvert le 11 octobre 2026.** Quatre audits indépendants (réseau, état
serveur, sécurité, hébergement) et un banc de chaos ont examiné le serveur et
le canal. Ils convergent. Ce document tranche les décisions (D17 à D24, à
reporter dans `DECISIONS.md` par le lot 0) et découpe le travail en lots aux
fichiers disjoints.

## L'exigence, honnêtement formulée

« Aucune déconnexion pendant les parties » n'est pas atteignable au pied de
la lettre : un réseau mobile coupe, un téléphone se verrouille, et un
déploiement Cloudflare ferme toujours toutes les WebSockets. Ce que l'on
garantit à la place :

1. **Aucune place perdue** — un joueur garde son siège jusqu'à la fin de la
   partie, quelle que soit la durée de son absence (sauf mort d'abandon, D18).
2. **Aucune partie perdue** — l'état survit à un redémarrage du serveur, à un
   déploiement du Worker, à une éviction du Durable Object.
3. **Reprise transparente** — un lien mort est détecté en moins de 30 s des
   deux côtés ; au retour (réseau, écran déverrouillé), le joueur est rattaché
   en moins de 3 s avec un `sync` complet et les évènements manqués.
4. **Aucune partie figée** — toute phase se clôt à son échéance, même après une
   exception, un redémarrage ou l'absence de tous les joueurs.
5. **Aucun client ne casse la table des autres** — entrées validées, quotas,
   aucun crash du processus sur une entrée hostile.

## Les constats bloquants (tous reproduits ou prouvés à la lecture)

| # | Constat | Où |
|---|---|---|
| 1 | La grâce de 60 s éteinte **supprime** le joueur et son jeton : retour impossible | `rooms.ts` `graceExpired` → `release` |
| 2 | Aucun keepalive : liens à moitié ouverts invisibles des deux côtés | `channel.ts`, `ws-node.ts`, worker |
| 3 | Un second `room:join` sur une socket déjà assise **expulse** le joueur | `rooms.ts` `join` → `depart` d'abord |
| 4 | Une exception dans une minuterie → `unhandledRejection` → **processus tué** ; et la phase n'est jamais réarmée | `rooms.ts` `void this.phaseTimedOut`, `quietly` |
| 5 | Une requête HTTP `GET //[` **tue le processus** Node | `app.ts`, `ws-node.ts`, `static.ts` (`new URL`) |
| 6 | Tout l'état est en mémoire ; l'aléa repart de la graine ; une table rechargée ne se réarme jamais | `MemoryRoomStore`, `rngFor`, `armPhase` |
| 7 | Salon sans hôte après une coupure de l'hôte : la partie ne peut plus démarrer | `handOverHost` absent de `join` |
| 8 | Actions acceptées avec des types faux (`"1"`, `[1]`) : vote contre soi, amoureux `[1,1]`… | `sanitizeAction`, `game.ts` |
| 9 | Chat de caractères de contrôle → `sync` > 512 Kio ignoré en silence → **table gelée** | `say()`, `decodeServerFrame` |
| 10 | Aucun quota (flood, `room:create` en masse, devinette de codes) | `hub.ts` |

## Les décisions

### D17 — Le siège appartient au joueur jusqu'à la fin de la partie

En partie, un `ServerPlayer` n'est **jamais** retiré de `room.players`. La
grâce (`RECONNECT_GRACE_MS`, 60 s) ne sert plus qu'à l'affichage : passé ce
délai, le joueur est montré **absent** (champ public `absent: boolean` dans
`PlayerInfo` — l'absence est déjà publique via `connected`, rien ne fuit). Son
jeton reste valable jusqu'à la revanche. Le départ volontaire (`room:leave`)
en partie fait de lui un absent immédiat, pas un joueur supprimé. Au salon :
grâce courte de **30 s** avant de libérer la place ; la revanche garde les
joueurs en grâce. La charge d'hôte passe à un joueur **connecté** quand l'hôte
est absent, et `join`/`reattach` la réattribuent si l'hôte n'existe plus.

### D18 — La mort d'abandon termine toute partie, sans rien avouer

Un siège vivant absent depuis **5 minutes** (`ABANDON_MS`) meurt d'abandon à
la prochaine clôture de phase (le moteur l'applique dans `closePhase` via une
liste `abandons` fournie par le serveur — le moteur ne lit pas l'horloge).
Nouvelle `DeathCause` **`abandon`**, publique, rôle montré selon
`revelerRoles`. **Aucun pouvoir** ne se déclenche (pas de tir, pas de rancune
de l'Ancien, pas de désignation du Bouc) ; le chagrin de l'amoureux s'applique
(R47) ; un capitaine abandonné lègue sa charge au hasard. Option de table
`abandon` (défaut `true`) pour les tables qui préfèrent attendre. C'est la
réponse à la question ouverte « Robots et rôles cachés » : un robot qui agit
avouerait un rôle ; l'inertie (R81) puis l'abandon public n'avouent rien.

### D19 — L'horloge se suspend quand plus aucun vivant n'est là

Si **aucun siège vivant** n'est connecté, la phase en cours est suspendue
(`pausedAt` dans `RoomTiming`) ; au premier retour, l'échéance est décalée de
la durée de la pause. Une pause pour un seul absent serait exploitable ; une
partie qui tourne à vide pendant la coupure du routeur ne l'est pas moins.
L'abandon (D18) ne court pas pendant une pause.

### D20 — Le temps est une donnée, l'aléa voyage avec l'état

- L'état du générateur vit **dans `GameState`** (`rng: number`) ; le moteur
  devient une fonction pure de l'état (`createGame`/`applyAction`/
  `timeoutPhase` n'ont plus besoin d'un `Rng` externe, ou l'acceptent pour la
  rétrocompatibilité des tests). Les durées fantômes (Sorcière, Loup Blanc)
  sont tirées **par le moteur** à l'entrée de l'étape et rangées dans la
  phase ; `phaseBudgetMs` devient pur et ne consomme plus d'aléa.
- Le serveur ne garde **aucune** minuterie comme source de vérité :
  `nextWake(room)` (min des échéances : phase, grâces, abandon, recyclage)
  est rangé, et un `tick(code)` **idempotent** fait tout ce qui est dû. Les
  hôtes (Node : `setTimeout` ; Worker : une alarme et une table `wakeups`)
  ne font que réveiller `tick`.
- Un **chien de garde** (toutes les 10 s) force toute table `playing` dont
  l'échéance est dépassée de plus de 5 s.
- Une erreur inattendue dans `tick` : journalisée, nouvel essai à délai
  croissant (5 s, ×3), puis **partie interrompue** (`status: 'finished'`,
  avis, revanche possible). Jamais de rejet non rattrapé ; filets
  `unhandledRejection`/`uncaughtException` dans le processus Node.

### D21 — Les tables sont persistées, partout

- **Node** : `FileRoomStore` (écriture atomique `tmp` → `rename`, `.bak`,
  regroupement 300 ms), activé par `GAROUTOM_DATA` — par défaut
  `.garoutom-data/` pour `npm start`/`npm run serve`, désactivé en `npm run
  dev`. Arrêt gracieux sur `SIGINT`/`SIGTERM`/`SIGBREAK` : avis aux joueurs,
  vidage, fermeture `1012`.
- **Worker** : un seul Durable Object (D5 tient), **WebSocket Hibernation**
  (`ctx.acceptWebSocket`, attachements), stockage **SQLite** synchrone
  (`rooms`, `wakeups`, `meta`), une alarme pour toutes les tables
  (planificateur), `setWebSocketAutoResponse` pour le ping. Un DO par table
  reste l'évolution prévue au-delà de 50 tables simultanées.
- Au chargement, une table est **réconciliée** : tout `socketId` qui n'est
  plus vivant devient absent avec sa grâce.
- `Room.schema` versionné et `upgradeRoom()`.

### D22 — Le lien se surveille des deux côtés

- Cadres `{t:'ping', id}` → `{t:'pong', id, now}` ajoutés au transport. Le
  client pinge toutes les **20 s** (onglet visible), abandonne la socket sans
  réponse en **10 s**, abandonne une ouverture qui traîne **6 s**, et rouvre
  aussitôt sans attendre `onclose`. Le `now` du pong corrige l'horloge
  (aller-retour minimal).
- Node : `ws.ping()` toutes les 25 s, `terminate()` sans pong. Worker :
  auto-réponse + fermeture des sockets muettes depuis 70 s.
- `visibilitychange` (visible), `pageshow`, `online` réveillent le canal
  (`Channel.wake()`) : ping immédiat, ou reconnexion directe après > 20 s
  caché.
- Reconnexion : première tentative 0–300 ms, puis aléa plein jusqu'à
  `min(5 s, 500 ms × 2ⁿ)` (15 s onglet caché). Jamais d'abandon.
- Le client distingue **connecté** et **rattaché** : bandeau « Reprise de
  votre place… » et actions suspendues tant que la reprise n'est pas
  confirmée ; reprise retentée (1, 2, 4 s) sauf refus définitif. Jeton gardé
  aussi en mémoire (localStorage peut être indisponible).
- `join` est **idempotent** : un jeton déjà rattaché à cette socket répond ok.
  Une reprise depuis une autre socket ferme l'ancienne en **4001**
  (« partie ouverte ailleurs ») ; un client fermé en 4001 ne reprend pas tout
  seul (sinon deux onglets se volent la place en boucle).
- Rattrapage : chaque table tient un journal public numéroté (`seq`, 200
  derniers évènements — aucun secret, R87) ; `room:join` porte `lastSeq`, la
  reprise rejoue les évènements manqués marqués `replay`.
- Protocole versionné : `PROTOCOL_VERSION`, `?v=N` dans l'URL, cadre `hello`
  (version, capacités, battement) ; hors plage → fermeture **4000** et
  rechargement côté client. Codes : 1012 redémarrage serveur, 4000 version,
  4001 remplacé, 4002 table disparue.
- Table disparue (code `gone`) : le client oublie jeton et adresse, revient à
  l'accueil avec un avis.

### D23 — Le serveur ne croit rien et ne tombe pas

- Validation **stricte** des actions dans le moteur (`parseAction(raw)`) :
  sièges `Number.isSafeInteger` bornés, booléens stricts, `text` chaîne ≤
  2 000 avant traitement, canaux énumérés, objet reconstruit.
- Texte (chat, pseudos) : NFKC, retrait de `\p{Cc}\p{Cf}\p{Cs}` (dont bidi,
  zéro-largeur), espaces pliés, longueur en points de code ; pseudo vide
  refusé ; doublons suffixés (« Tom 2 »).
- Crash : toute analyse d'URL protégée (400 / socket détruite), délais HTTP,
  `maxPayload` 16 Kio entrant.
- Quotas dans le `Hub` (communs aux deux hôtes, IP passée par l'hôte) :
  10 cadres/s (rafale 30), `dire` 1/s (rafale 5), `room:create` 3/min/IP,
  10 `join` ratés/min/IP, socket non assise fermée après 30 s, 10 sockets/IP,
  `bufferedAmount` > 1 Mio → fermeture. Table vidée au salon : recyclée en
  2 min ; `MAX_ROOMS` 200.
- Silence (R87-R88) : le serveur **n'envoie pas** un `sync` identique au
  précédent pour un siège (empreinte par socket) — la nuit, un villageois ne
  reçoit plus rien quand la Voyante sonde.
- Contrôle d'origine : `GAROUTOM_ORIGINES` (Node, défaut : même hôte que
  `Host`) ; `ORIGINES` obligatoire en production côté Worker.
- Messages d'erreur internes jamais renvoyés tels quels.
- Chat dans la vue : 100 derniers messages par canal lisible ; un cadre trop
  gros côté client déclenche une reconnexion bruyante, pas un silence.
- **Silence à l'écran** (relevé par la recherche UX) : la nuit, la silhouette
  de l'écran est identique pour tous les sièges — la minuterie absente laisse
  un cadre vide de même taille dans l'en-tête, et l'accès au canal des
  amoureux n'est pas un élément visible chez eux seuls. Un test compare la
  structure du DOM de deux sièges sans action la nuit (un villageois, un
  amoureux, un mort).
- **Écran allumé** : Wake Lock en partie, redemandé à chaque retour au
  premier plan.

### D24 — Déploiement prudent

Le Worker d'abord, rétrocompatible, puis le client. `npm run worker:deploy`
refuse tant que `/health?profond=1` compte des parties en cours (sauf
`--force`) ; l'état persisté fait de toute façon d'un déploiement un simple
blip de reconnexion. Wrangler épinglé, `[observability]` activé, journaux
JSON d'une ligne, jamais de jeton.

## Les lots

Le **lot 0** pose les contrats, seul et d'abord. Les lots A à D partent
ensuite **en parallèle**, fichiers disjoints. Le lot E (chaos) les vérifie.

| Lot | Contenu | Fichiers possédés |
|---|---|---|
| **0 — Moteur & contrats** | D18 (cause `abandon`, option, `abandonSeats` dans la clôture), D20 (aléa dans l'état, fantômes tirés par le moteur, `phaseBudgetMs` pur), D23 (`parseAction`, assainissement du texte, chat 100/canal dans la vue), protocole D22 (version, `hello`, ping/pong, codes de fermeture, `lastSeq`, `seq`/`replay`, `PlayerInfo.absent`), skins (`abandon` dans les deux), `DECISIONS.md` D17–D24, `RULES.md` | `packages/engine/**`, `packages/client/src/skins/**`, `docs/RULES.md`, `docs/DECISIONS.md` |
| **A — Cœur serveur** | D17, D18 (horloge d'absence → `abandons`), D19, D20 (`nextWake`/`tick`/chien de garde/interruption), `join` idempotent, hôte, journal d'évènements, sync dédupliqué, réconciliation au chargement, `Room.schema`/`upgradeRoom`, quotas et sérialisation par socket dans le `Hub`, interfaces `SessionDirectory`/`SocketDirectory`/`wake` | `packages/server/src/{rooms,hub,store,lib}.ts` + tests, nouveaux `packages/server/src/{planif,journal,quotas}.ts` |
| **B — Worker** | D21 Worker (hibernation, SQLite, planificateur d'alarme, annuaire de sockets, auto-réponse ping, balayage), D24 (garde de déploiement, observabilité, Wrangler épinglé), `ORIGINES` | `packages/worker/**` |
| **C — Hôte Node** | D21 Node (`FileRoomStore`, planificateur `setTimeout`, arrêt gracieux, filets de processus), D22 côté Node (ping `ws`, `maxPayload`, IP, origine), D23 (URL protégées, délais HTTP), `/health` enrichi | `packages/server/src/{app,index,ws-node,static}.ts`, nouveaux `packages/server/src/{store-fichier,planif-node}.ts`, `package.json` racine (scripts), `.gitignore` |
| **D — Client** | D22 côté client (`Channel` : ping, chien de garde, `wake`, backoff, codes de fermeture ; état rattaché ; reprise retentée ; jeton en mémoire ; `gone` ; 4000/4001 ; rattrapage `replay` dans la chronique), affichage des absents et de la mort d'abandon, bandeaux | `packages/engine/src/channel.ts` *(après le lot 0)*, `packages/client/src/{App.tsx,lib/**}`, `components/partie/Place.tsx` (absent), `components/partie/Narrateur.tsx` (abandon, replay) |
| **E — Chaos** | Rejouer le banc de chaos sur le nouveau code, étendre ses invariants (aucune place perdue, reprise < 3 s, aucune phase figée, redémarrage serveur sans perte avec persistance), robots capables de reprise | `packages/server/scripts/**` |

Le lot 0 publie dans son rapport les **signatures exactes** dont A–D
dépendent ; les lots A–D les reçoivent dans leur consigne.
