# Les décisions

Ce document liste les questions à trancher, et garde la réponse une fois
qu'elle est prise. Une décision qui n'est pas écrite ici n'existe pas.

## Questions réglées

### D1 — Le Chasseur empoisonné ne tire pas

**10 octobre 2026.** Par défaut, le poison étouffe le Chasseur : pas de tir
après une mort par poison, ni par chagrin. Une option de table,
`chasseurEmpoisonne`, laisse au contraire déclencher le tir pour toute mort —
le comportement qu'avait d'abord le moteur.

**Pourquoi.** La règle officielle 2016 donne ainsi à la Sorcière une parade au
Chasseur : l'empoisonner devient une décision tactique, pas un accident. Le
défaut suit la table ; l'option laisse chaque hôte faire vivre ses rebondissements.

### D2 — La Sorcière peut se sauver elle-même

**10 octobre 2026.** Par défaut, la potion de vie peut servir sur la Sorcière
elle-même quand les loups l'attaquent. L'option `sorciereSeSauve` permet à
l'hôte de l'interdire, comme le fait la règle officielle 2016.

**Pourquoi.** En ligne, la Sorcière est la cible naturelle de la première
nuit : une partie où elle meurt sans avoir joué est frustrante, et personne
n'est là pour rappeler la règle autour de la table. Le défaut est indulgent ;
l'option restaure la stricte égalité.

### D3 — Le capitaine se choisit, timing compris

**10 octobre 2026.** Par défaut, le capitaine est élu au matin du jour 1,
après la première nuit. L'option `capitaineAvantNuit1` le fait élire avant
la première nuit, comme à la table ; l'option `capitaine` le supprime
carrément. Trois réglages, un seul capitaine.

**Pourquoi.** Chaque horaire raconte une partie différente : au matin du jour
1, l'élection nourrit le premier débat et tout le monde a vécu une nuit
ensemble ; avant la première nuit, tout le monde vote — même celui qui ne
survivra pas à la nuit. À l'hôte de choisir l'histoire.

### D4 — La composition appartient à l'hôte

**10 octobre 2026.** L'hôte compose sa partie librement : autant de loups,
quels rôles spéciaux. Trois aides, sans obligation :

- une **composition de référence** par nombre de joueurs (celle de
  [`refs/roles.md`](refs/roles.md), recalée : Cupidon dès 10 joueurs,
  Salvateur dès 11 — à 9-10, il ne restait que deux villageois simples et
  les nuits devenaient infranchissables pour les loups) ;
- un **générateur aléatoire cohérent** : du hasard dans des bornes
  d'équilibrage, jamais une table jouée d'avance ;
- des **suggestions** à la création, dérivées du nombre de joueurs.

**Pourquoi.** La composition est le premier réglage d'ambiance d'un
loup-garou : une table de chasse n'a rien à voir avec un village blindé de
pouvoirs. La cohérence automatique garantit un minimum d'équilibre ; le
reste regarde l'hôte.

### D5 — Un WebSocket natif, jamais Socket.IO

**10 octobre 2026.** Le canal temps réel est un WebSocket natif dès le
premier jour : trois cadres (`req`, `ack`, `ev`) dans `transport.ts`, la
reconnexion dans `channel.ts`. Pas de cohabitation à ménager avec Socket.IO.

**Pourquoi.** Une partie de loup-garou dure des dizaines de minutes, là où
une fonction d'hébergement coupe la connexion au bout de cinq. Le canal vit
donc dans le Worker Cloudflare, qui n'a de toute façon ni Express ni
Socket.IO — et le client comme le serveur de développement partagent le même
cadrage, tiré du moteur.

### D6 — Le moteur ne connaît que des mécaniques

**10 octobre 2026.** Aucun village, aucune lune, aucun loup dans le moteur :
des camps, des étapes, des pouvoirs. Les identifiants de rôles (`loup`,
`voyante`…) ne s'affichent jamais tels quels. Les noms, les textes,
l'ambiance appartiennent au skin, côté client, choisi par l'hôte et porté
par la partie.

**Pourquoi.** C'est la condition du système de skins : Thiercelieux devient
Shiganshina sans toucher à un équilibrage qui reste unique. Une partie jouée
en skin Thiercelieux et la même en skin Shiganshina produisent exactement
les mêmes états.

### D7 — La palette de Thiercelieux : bleu nocturne, lanterne et sang

**10 octobre 2026.** Le fond de tout l'écran est le bleu nocturne `#131726`,
qu'aucun jeu de la collection n'occupe ; le village a la couleur de la
lanterne `#e6a852`, les loups celle du sang `#dd5f52`, le narrateur et les
morts celle de la lune `#aab4c8`. La nuit brune de Bataillotom a été
écartée : trop voisine du bar de Bataillotom et de la table de Belotom.

**Pourquoi.** La paire lanterne/sang donne un camp une couleur — le bleu
profond les rend lisibles le soir, contrastes mesurés dans
[`refs/design.md`](refs/design.md) : papier à 14,0:1, sang tenu aux aplats.

### D8 — Trois polices : Cormorant, Alegreya Sans, IBM Plex Mono

**10 octobre 2026.** Cormorant pour l'identité (titres, noms de rôles sur
les cartes — jamais dans une phrase), Alegreya Sans pour le corps, IBM Plex
Mono pour les minuteries et le code de salon.

**Pourquoi.** Une garalde de conte pour un jeu de conte ; le sans-serif de
la même fonderie garde le petit texte lisible sur fond sombre ; et aucun jeu
de la collection n'emploie Plex Mono — le code de salon gagne à être neuf.

### D9 — Symboles gravés en v1, l'art ensuite

**10 octobre 2026.** Les cartes de rôles sont typographie + symbole gravé
en v1. L'illustration par rôle et par skin viendra plus tard, sans rien
casser : la carte ne connaît pas la mécanique.

**Pourquoi.** Huit illustrations par skin, c'est un coût réel pour un gain
que la typographie Cormorant donne déjà moitié. Mieux vaut un gravé
définitif qu'une illustration hâtive.

### D10 — Hurlement et glas dès la v1

**10 octobre 2026.** L'atelier sonore compte deux voix propres dès la v1 :
le hurlement bref à la chute de la nuit, le glas à l'annonce des morts —
synthétisés en WebAudio sur `bus()`, zéro fichier, comme le cadre.

**Pourquoi.** Un loup-garou sans hurlement s'entend à peine. Deux voix
synthétisées ne retardent rien ; en skin Shiganshina, le hurlement devient
un cri de Titan sans toucher au moteur.

### D11 — L'habit appartient au skin, l'architecture est contrat

**11 octobre 2026.** Palette, polices et sons appartiennent au skin : chaque
univers choisit ses couleurs, ses lettres et ses voix. Mais l'architecture
sémantique est un contrat que tout skin signe : un accent par camp, une encre
neutre pour le narrateur, une teinte par canal de discussion, un fond
constant, des contrastes AA. Le détail vit dans [`SKINS.md`](SKINS.md).

**Pourquoi.** Le skin doit pouvoir tout changer — sinon Shiganshina n'est
qu'un changement de nom — mais l'information doit survivre au changement :
le village doit se voir village, les loups loups, quel que soit l'habit.
La liberté porte l'ambiance ; le contrat porte la lisibilité.

### D12 — Cinq rôles de plus, tous optionnels, hors de la référence

**11 octobre 2026.** La v2 ouvre l'Ancien, le Corbeau, le Bouc émissaire, la
Petite Fille et le Loup Blanc (R90–R100). Ils vivent dans une liste à part,
`OPTIONAL_ROLES` ; `SPECIAL_ROLES` reste celle des six rôles de la v1, et tout
ce qui s'en dérive — la référence, les suggestions, le générateur par
défaut — ne bouge pas d'un rôle. L'hôte les coche (`CHOOSABLE_ROLES`) ; le
générateur ne les tire que si on le lui demande, avec parcimonie : rien sous
dix joueurs, un jusqu'à treize, deux au-delà, le Loup Blanc dès douze.

**Pourquoi.** L'équilibrage de référence a été recalé avec soin
([`refs/roles.md`](refs/roles.md)) ; un rôle optionnel qui s'y glisserait le
défairait sans bruit. Une table qui ne coche rien rejoue la v1 état pour
état — vérifié sur trois mille parties rejouées contre le moteur d'avant.
Sous dix joueurs, chaque carte spéciale de plus mange un des derniers
villageois simples ; le Loup Blanc veut une meute à trahir.

### D13 — L'Ancien : le sursis ne compte que s'il sauve, la rancune est une option

**11 octobre 2026.** L'attaque qui « compte » est celle qui l'aurait tué :
couverte par le bouclier ou rachetée par la potion de vie, elle ne lui
coûte pas son sursis (R91). Tué de la main du village — vote, tir, poison —,
il emporte les pouvoirs du village (R92), sous l'option `ancienRancunier`
(défaut : la règle officielle). « Perdre ses pouvoirs » est tranché au cas
par cas : plus de consigne de nuit pour le village (l'étape de la Sorcière
reste, fantôme), plus de tir pour un Chasseur qui n'a pas encore tiré —
même tombé la même aube —, plus de grâce pour l'Idiot, plus de dernier mot
pour le Bouc, plus d'espionnage pour la Petite Fille. Ce qui est joué reste
joué. La carte de l'Ancien se retourne quand sa rancune frappe, comme le
tir désigne le Chasseur.

**Pourquoi.** La règle officielle parle d'« attaque » sans trancher le
bouclier ; la lecture la plus lisible est celle du sursis comme seconde vie,
qui ne se perd que si l'on meurt. La perte des pouvoirs, elle, doit se dire :
sans révélation, une table sans `revelerRoles` verrait ses rôles se taire
sans comprendre pourquoi — et chacun l'apprendrait à son absence de
consigne. Enfin, une règle aussi punitive mérite son interrupteur : certaines
tables la trouvent injouable en ligne, où l'Ancien ne peut pas protester.

### D14 — Le Corbeau et le Bouc : des comptes publics

**11 octobre 2026.** La marque du Corbeau s'annonce à l'aube sans dire qui
l'a posée, et pèse deux voix ajoutées au décompte — le marqué vote toujours,
le Corbeau peut se marquer lui-même (R93). Le Bouc émissaire paie toute
égalité qui a au moins une voix, même s'il n'en faisait pas partie, et même
sans pouvoirs (c'est un sort, pas un pouvoir) ; son dernier mot désigne au
moins un votant, et son silence laisse voter tout le monde (R94).

**Pourquoi.** Le Corbeau de la boîte agit en secret mais sa marque est
publique ; la seule chose à cacher est sa main. Pour le Bouc, l'« égalité =
personne » de R61 reste la règle de toutes les tables sans lui : il n'amende
le vote que vivant. Une désignation vide aurait offert au Bouc mourant le
pouvoir d'annuler un jour entier ; au moins un votant, le pouvoir reste un
pouvoir, pas un veto.

### D15 — La Petite Fille ne se fait pas surprendre

**11 octobre 2026.** La Petite Fille voit, pendant l'étape principale, le
nombre de loups qui visent chaque cible — jamais lesquels (R95). La règle
officielle la laisse espionner au risque d'être vue ; Garoutom ne simule
pas ce risque en v2, écart assumé.

**Pourquoi.** Autour d'une table, le risque est un regard croisé ; en ligne,
il faudrait inventer une mécanique de « surprise » — une probabilité, une
action — qui ne serait plus la Petite Fille. L'espionnage anonyme garde le
goût du rôle sans offrir aux loups un détecteur. Son absence de consigne est
celle d'un villageois : rien dans la vue, hors de sa propre carte et de son
espionnage, ne la distingue (testé).

### D16 — Le Loup Blanc : un loup comme les autres, jusqu'aux nuits paires

**11 octobre 2026.** Le Loup Blanc vote avec la meute, qui le voit en loup
ordinaire ; les nuits paires, une étape à lui suit la principale — tenue
mort compris, d'une durée fantôme, pour ne rien trahir (R96, R97). Sa proie
meurt de la cause `loups` : une cause à part désignerait le loup tué aux
yeux d'une table qui ne révèle pas les rôles. Le bouclier du Salvateur
l'arrête ; la Sorcière ne connaît que la victime de la meute. Il ne gagne
que seul ; la meute ne gagne qu'entre loups ordinaires ; un huis clos de la
meute avec lui s'éteint au bout de trois nuits sans mort, sur la victoire
de la meute (R98, R99).

**Pourquoi.** La règle officielle veut le Loup Blanc seul survivant, sans
dire ce qui arrive s'il ne mord pas : un Loup Blanc et un loup qui se
renvoient l'égalité chaque jour feraient tourner la partie à l'infini. Trois
nuits consécutives en comptent toujours une paire : le Loup Blanc a eu sa
chance, et la meute, qui a fait tomber le village, l'emporte. Un couple
d'amoureux Loup Blanc et loup est « mixte » : leurs factions diffèrent.

## Le chantier robustesse (D17 à D24)

**11 octobre 2026.** Quatre audits et un banc de chaos ont convergé : une
grâce éteinte supprimait le joueur, une exception de minuterie tuait le
processus, l'aléa repartait de la graine après un rechargement, une action
`"1"` passait pour un siège. Le détail — constats, lots, fichiers — vit dans
[`ROBUSTESSE.md`](ROBUSTESSE.md) ; voici ce qui est tranché. L'exigence :
aucune place perdue, aucune partie perdue, reprise transparente, aucune
partie figée, aucun client qui casse la table des autres.

### D17 — Le siège appartient au joueur jusqu'à la fin de la partie

En partie, un joueur n'est jamais retiré de la table. Passé
`RECONNECT_GRACE_MS` (60 s), il est **montré absent** (`PlayerInfo.absent`,
public comme `connected`) et son jeton reste valable jusqu'à la revanche ;
un départ volontaire fait de lui un absent, pas un joueur supprimé. Au
salon, la place se libère après `LOBBY_GRACE_MS` (30 s). La charge d'hôte
passe à un joueur connecté.

**Pourquoi.** La grâce de 60 s supprimait le joueur et son jeton : un loup
qui changeait de réseau perdait sa partie pour de bon. Une place se garde ;
ce qu'on fait d'un absent qui ne revient jamais, c'est D18.

### D18 — La mort d'abandon termine toute partie, sans rien avouer

Un siège vivant absent depuis `ABANDON_MS` (5 min, hors pause) meurt
d'abandon — cause `abandon`, publique, rôle selon `revelerRoles` — à la
clôture de phase suivante (R101). Aucun pouvoir ne se déclenche ; le
chagrin de l'amoureux, si ; un capitaine parti lègue sa charge au hasard.
L'option de table `abandon` (défaut : oui) permet d'attendre ses absents.

Le lot 0 a précisé le geste : le serveur passe la liste des partis à la
clôture **par l'échéance** — `timeoutPhase(state, seq, { abandons })` —,
jamais à une clôture provoquée par une action ; les partis meurent d'abord,
la phase se clôt ensuite entre vivants (une voix, une cible, une flèche vers
un parti ne comptent plus). Si ces morts décident la partie, la nuit
s'achève aussitôt ; le jour, la victoire se regarde après le dépouillement.

**Pourquoi.** C'est la réponse à l'ancienne question ouverte « Robots et
rôles cachés » : un robot qui agit avouerait un rôle — un loup qui dévore,
une Voyante qui sonde. L'inertie (R81), puis une mort publique au moment où
la phase se ferme de toute façon, n'avouent rien : l'absence était déjà
publique, l'échéance aussi, et rien ne se clôt plus tôt que prévu. Mourir au
milieu d'une phase, au contraire, pourrait la clore sur-le-champ et dire que
le parti était le dernier attendu — c'est-à-dire qu'il avait un rôle.

### D19 — L'horloge se suspend quand plus aucun vivant n'est là

Si aucun siège vivant n'est connecté, la phase est suspendue
(`RoomView.paused`) ; au premier retour, l'échéance est décalée d'autant.
L'abandon ne court pas pendant une pause.

**Pourquoi.** Une pause pour un seul absent serait exploitable ; une partie
qui tourne à vide pendant la coupure du routeur ne l'est pas moins.

### D20 — Le temps est une donnée, l'aléa voyage avec l'état

L'état du générateur vit dans `GameState.rng` (R104) : le moteur est une
fonction pure de l'état, `applyAction(state, action, seat)` et
`timeoutPhase(state, seq)` n'ont plus besoin de `Rng`. Les durées fantômes
sont tirées à l'entrée de l'étape et rangées dans la phase ; `phaseBudgetMs`
est pur. Côté serveur, aucune minuterie n'est source de vérité : un
`tick(code)` idempotent fait ce qui est dû, un chien de garde force les
échéances dépassées, une erreur inattendue interrompt la partie au lieu de
tuer le processus.

Les anciennes signatures (`applyAction(state, action, rng, seat)`,
`timeoutPhase(state, rng, seq)`, `phaseBudgetMs(state, rng)`) compilent
encore et ignorent le `Rng` : l'état porte le sien. **Une graine donne la
même partie qu'avant** quand le serveur s'en sert comme il le faisait — un
seul `Rng` par table, durées fantômes tirées à l'armement : le tirage
fantôme était déjà le dernier de son pas. Vérifié sur trois mille parties
rejouées contre le moteur d'avant, 283 038 pas, sans un écart. Les tests qui
tiraient leurs durées fantômes d'un `Rng` à part, eux, voient leurs
tirages suivants décalés.

**Pourquoi.** Une table rechargée repartait de la graine : elle rejouait des
tirages déjà joués, et ne réarmait jamais sa minuterie. L'aléa rangé avec
l'état, une partie interrompue reprend exactement — deux mille parties
sérialisées à chaque pas le prouvent.

### D21 — Les tables sont persistées, partout

Node : `FileRoomStore` (écriture atomique, `.bak`, regroupement), arrêt
gracieux. Worker : un Durable Object en hibernation, stockage SQLite, une
alarme pour toutes les tables. Au chargement, une table est réconciliée ;
`Room.schema` est versionné.

**Pourquoi.** Tout l'état vivait en mémoire : un redémarrage, un
déploiement, une éviction effaçaient les parties en cours.

### D22 — Le lien se surveille des deux côtés

Protocole versionné (`PROTOCOL_VERSION` 2, `PROTOCOL_MIN` 1, `?v=` dans
l'URL, cadre `hello`), battement `ping`/`pong` (le `pong` porte l'heure du
serveur), codes de fermeture (1012 redémarrage, 4000 version, 4001 place
reprise ailleurs, 4002 table disparue), `join` idempotent, et rattrapage :
un journal public numéroté, `room:join.lastSeq`, `SyncPayload.seq` et
`replay`.

Le lot 0 a choisi la forme du rattrapage : `events` reste un
`GameEvent[]`, numéroté par un seul champ parallèle — `seq`, le numéro du
dernier ; les évènements d'un `sync` sont consécutifs — et un `sync` rejoué
porte `replay: true`. Un client de version 1 lit le même tableau qu'avant.

**Pourquoi.** Sans battement, un lien à moitié ouvert est invisible des deux
côtés ; sans numéros, un joueur revenu ne sait pas ce qu'il a manqué. Le
champ parallèle laisse le Worker se déployer avant le client (D24).

### D23 — Le serveur ne croit rien et ne tombe pas

Le moteur relit toute action (`parseAction`, R102) et nettoie tout texte
(`cleanText`, `cleanName`, R103) ; le fil garde cent messages **par canal**,
dans l'état comme dans la vue (R78). Quotas dans le `Hub`, analyses d'URL
protégées, `sync` identique jamais renvoyé, origines contrôlées, messages
d'erreur internes jamais renvoyés tels quels, écran identique la nuit pour
tous les sièges sans action, Wake Lock en partie.

Le lot 0 a porté la borne par canal jusque dans l'état : une borne commune
aux quatre canaux faisait tomber les vieux messages du village au rythme
des bavardages de la meute — le premier numéro visible au village trahissait
l'activité des loups, contre R78.

**Pourquoi.** Une action `"1"` passait pour un siège, `[1, 1]` liait un
joueur à lui-même ; trois cents messages de caractères de contrôle gonflaient
la vue au-delà de la borne du cadre, que le client ignorait en silence — la
table gelait.

### D24 — Déploiement prudent

Le Worker d'abord, rétrocompatible, puis le client. Le déploiement refuse
tant que des parties sont en cours (sauf `--force`) ; Wrangler épinglé,
journaux JSON d'une ligne, jamais de jeton.

**Pourquoi.** L'état persisté fait d'un déploiement un simple blip de
reconnexion ; encore faut-il que le nouveau Worker parle aux anciens
clients.

## Le chantier v3 (D25 à D44)

**13 octobre 2026.** La boîte entière s'ouvre en cinq vagues, chacune
livrable et jouable. La première ouvre trois cartons de l'extension
Personnages — le Villageois-Villageois, le Renard, le Montreur d'Ours —
avec la convention de voisinage qui portera toute la suite (R105 à R108).
La deuxième ouvre le Voleur, le Chien-Loup, l'Enfant Sauvage, les Deux
Sœurs et les Trois Frères (R109 à R114), et pose avec eux les deux
fondations de la suite : le camp effectif et le canal des fratries.

### D26 — La v3 vit dans sa liste, livrée vague par vague

**13 octobre 2026.** Les dix-huit cartes officielles qui restent entreront
dans `OPTIONAL_ROLES_V3`, une troisième liste à côté de `SPECIAL_ROLES` et
`OPTIONAL_ROLES` — qui ne bougent pas d'une ligne : référence (R20),
suggestions (R23) et générateur (R22/R100) restent ce qu'ils sont, graine
pour graine. Et la liste ne grandit que vague par vague : n'entre dans
`ROLES` que ce qui est livré — `villageois2`, `renard`, `ours` pour la V1,
pas les dix-huit d'un coup. Le contrat du client est exhaustif —
`Record<RoleId, TexteRole>`, un switch par `prompt.kind`, par verbe, par
évènement — : les dix-huit ids d'un coup exigeraient les dix-huit rôles
livrés immédiatement, art compris. Enfin, aucun rôle v3 ne sort jamais du
générateur, même sur demande : seuls ceux de la v2 s'y tirent (R100) ; un
rôle v3 se coche, par l'hôte seul. Une table qui n'en coche aucun rejoue la
v2 état pour état.

**Pourquoi.** La compatibilité est la première contrainte du chantier :
l'équilibrage de la v2 a été vérifié sur des milliers de parties rejouées,
et une table qui ne coche rien ne doit jamais s'apercevoir que la boîte a
grandi. La livraison vague par vague est la même prudence appliquée au
client : chaque vague est jouable de bout en bout — moteur, art, écrans,
robots — avant d'ouvrir la suivante.

### D29 — Le Renard peut se compter dans son trio

**13 octobre 2026.** Oui. Le livret dit « le joueur désigné et ses deux
voisins » sans exclure le Renard lui-même : il peut être le centre du trio
comme l'un de ses voisins. Le moteur suit le livret — `centre` accepte
n'importe quel vivant, Renard compris.

**Pourquoi.** L'exclure serait une règle maison que nul livret n'écrit. Le
Renard qui se sonde joue sa carte double : un loup voisin lui épargne son
pouvoir, un trio sain le lui coûte — mais il apprend trois innocents, lui
le premier.

### D30 — La grogne de l'Ours survit à la rancune

**13 octobre 2026.** Quand la rancune de l'Ancien emporte les pouvoirs du
village (R92), le Montreur d'Ours ne perd rien : son ourson grogne toujours.
La grogne est celle d'un animal, pas un pouvoir du village — la rancune
éteint des consignes et des pouvoirs, pas un instinct.

**Pourquoi.** La rancune punit le village de la mort de son Ancien ; rien,
dans la boîte ni dans l'histoire, ne dit qu'elle musellerait la bête. Et le
silence de l'ourson après une rancune lirait comme un pouvoir éteint — un
mensonge de plus dans une partie qui n'en a pas besoin.

### D31 — Le porteur du Villageois-Villageois voit « villageois »

**13 octobre 2026.** La carte est recto-verso, et le côté que lit son
porteur dit « Simple Villageois ». La vue de tout siège — le porteur
compris — montre `villageois` comme rôle du porteur ; la certification est
publique, mais indiscernable d'un villageois ordinaire aux yeux de la
table. Seul le récapitulatif de fin — une fois la partie finie, quand plus
rien n'est caché (R77) — dit `villageois2`.

**Pourquoi.** Fidèle au recto-verso officiel : le porteur ne sait pas qu'il
porte la carte double, et c'est tout le sel du rôle — nul ne sait, pas
même lui. Quand l'Infect Père des Loups arrivera (Vague 5), la certification
portera sur la carte, pas sur le camp effectif : la vue restera sincère, et
redoutable.

### D25 — Un prompt composite : une seule consigne, deux décisions

**13 octobre 2026.** Les rôles à double décision — le Juge Bègue, qui vote
et peut convoquer un second vote ; l'Infectée, qui vote avec la meute et
garde son pouvoir d'origine ; le Comédien, qui joue une carte puis le
pouvoir de la carte — ne multiplieront pas les étapes. **Un seul `Prompt` et
un seul `markActed` par siège et par étape** : le prompt principal porte un
champ `secondaire?: Prompt`, et l'action qui le porte acquitte les deux
charges d'un coup. Premier usage en Vague 3 (le Juge), réutilisé en Vague 5
(l'Infectée, le Comédien).

**Pourquoi.** L'alternative — des sous-étapes chaînées — multiplierait les
phases, les budgets et les pas fantômes : chaque clôture intermédiaire est
une fenêtre de fuite (qui a agi, qui n'a pas agi), et une minuterie de plus
par nuit. Le patron composite tient la double décision dans le pas unique
que le serveur sait déjà armer ; la Vague 2 ne fait que le graver ici —
aucun code ne l'utilise encore.

### D27 — La carte lue dit le rôle courant ; le camp se lit effectif

**13 octobre 2026.** Avec les transformations de la Vague 2, deux lectures
divergent : celle de la carte (la Voyante, l'annonce d'une mort) et celle du
camp (la victoire, la meute, l'Ours, le Renard). Tranché :

- **la carte dit le rôle courant** du siège, masqué comme toute carte
  (R106) — la Voyante qui sonde et la mort qui retourne lisent la même
  chose ;
- le **Chien-Loup rangé côté loups garde sa carte** `chienLoup` : la Voyante
  la voit, sa mort la montre — c'est sa carte, la meute n'en sait rien ;
  mais dans les vues du pack il passe pour un loup ordinaire, masqué comme
  le Loup Blanc ;
- l'**Enfant Sauvage transformé devient un loup à part entière** : sa carte
  est réécrite `loup`, la Voyante la voit, sa mort la montre — fidèle au
  « devient un loup-garou » du livret. Son rôle d'origine survit au
  récapitulatif de fin : une ligne `transformation` au journal la raconte,
  et elle seule ;
- **tout lecteur de camp lit le camp effectif** (R109) : `winnerOf` — qui
  lisait des littéraux `role === 'loup'` —, `livingPack`, `requirePack`,
  `speakableChannels`, `readableChannels`, les vues `pack`, `inHuisClos`,
  les cibles interdites de `devorer` et de `trahir`, le trio du Renard, la
  grogne de l'Ours ;
- **`trahir` au camp effectif** : le Loup Blanc dévore tout siège de camp
  loups hors lui-même et le Loup Blanc — le Chien-Loup rangé et l'Enfant
  devenu loup sont des loups-garous comme les autres pour lui ;
- **un couple dont l'un change de camp se relit** : la victoire des
  amoureux compare les factions effectives — un amoureux changé de camp
  peut rendre le couple mixte, et lui rendre la victoire à deux.

**Pourquoi.** La boîte dit « devient un loup-garou », sans dire ce qu'en
lit la Voyante : lire le rôle courant est la seule lecture qui ne mente
jamais à personne — la Voyante sonde la carte qui est sur la table, et la
table retourne la même. Pour le Chien-Loup, le livret est explicite : il
**choisit un camp**, sa carte reste la sienne ; le masquer dans la meute
suit le précédent du Loup Blanc (R96). Le camp effectif est la fondation
que la Vague 4 (le charme par siège) et la Vague 5 (l'Infectée, la
Servante) consomment : l'écrire une fois, ici, avant qu'elles n'arrivent.

### D28 — Le canal des fratries est permanent, entre vivants

**13 octobre 2026.** Les Deux Sœurs et les Trois Frères se concertent « de
temps en temps » autour de la table — souvent un tour sur deux. En ligne,
chaque réveil est une phase de plus, un budget de plus, une fenêtre de
fuite de plus. Tranché : le canal `fratrie` est **permanent, de jour comme
de nuit**, entre les **vivants** d'un même groupe — le précédent des
amoureux (R76), assumé comme l'écart 9 de la v1. Un mort le quitte : il
n'y écrit plus, il n'y lit plus ; `mortsVoientTout` le lui rend en lecture
(R77, R114).

**D28b.** Une Sœur ou un Frère infecté (Vague 5) garderait son groupe et
son canal : l'infection change le camp, jamais la fratrie.

**Pourquoi.** Simuler les réveils intermittents coûterait une mécanique de
phasing par fratrie — quelles nuits, quel budget, quel silence quand l'un
est mort — pour un gain de fidélité que personne ne peut constater en
ligne. Le canal permanent, lui, est muet quand ils n'écrivent pas : rien
ne le distingue d'une absence de fratrie pour qui ne le lit pas (R78), et
la numérotation par canal garde le silence des autres.

### D32 — Le Chien-Loup compte parmi les loups, dès le salon

**13 octobre 2026.** La borne de R13 compte les loups avant de savoir de
quel côté le Chien-Loup tombera. Tranché : il compte **comme un loup**
(`wolvesIn` l'ajoute), conservateur — une table qui le coche avec deux
loups à six joueurs se refuse, plutôt que de risquer trois loups pour
trois villageois. Une table sans Chien-Loup ne change pas d'un chiffre :
l'addition est incrémentale.

**D32b.** Le Chien-Loup rangé côté village reste infectable par l'Infect
Père des Loups (Vague 5) : sa carte est un villageois, le pouvoir de
l'Infect ne regarde pas son choix à venir.

**Pourquoi.** Le livret ne dit rien de la composition ; laisser l'hôte
composer une meute potentielle majoritaire serait lui tendre un piège.
Le conservatisme est la règle de la v3 depuis D26 : ce qui n'est pas
encore joué se compte au pire.

### D33 — L'Enfant Sauvage : camp immédiat, réveil différé

**13 octobre 2026.** Le modèle meurt : le livret dit que l'Enfant « devient
un loup-garou » et « se réveille avec la meute dès la nuit suivante ». Deux
temps, donc, tranchés ainsi :

- le **camp effectif passe aux loups à la mort du modèle**, dans le pas qui
  tue — la victoire, l'Ours, le Renard le lisent tout de suite ; la carte
  est réécrite `loup` (D27) ;
- l'**accès à la meute s'ouvre au `startNight` suivant** — vues du pack,
  canal des loups, consigne `devorer` : un champ `enfantReveil` le retient
  jusqu'au lever de la nuit suivante, qui le consomme.

La transformation ne produit **aucun évènement** : le secret est absolu,
seul le récapitulatif de fin le raconte. **L'abandon du modèle transforme
aussi** — une mort est une mort, l'absence publique du modèle est un
décès comme un autre. **Sans modèle au temps écoulé de la première nuit**
(R81), l'Enfant n'a jamais de modèle : il ne se transforme jamais, fût-ce
à la mort tardive d'un siège qu'il aurait voulu désigner. Un modèle
**infecté** (Vague 5) survit : pas de transformation tant qu'il vit.

**Pourquoi.** Séparer le camp du réveil est la seule lecture qui honore les
deux phrases du livret à la fois : si le camp attendait la nuit, l'Ours
garderait le silence devant un loup assis et la victoire du village
pourrait tomber alors qu'un loup vit ; si le réveil ne patientait pas,
la meute verrait un complice au milieu du jour. Entre les deux, l'état
porte les deux moitiés : la carte et le camp tout de suite, la meute au
lendemain.

### D44 — Le talon du Voleur : un tirage de siège, un mélange, jamais de fratrie

**13 octobre 2026.** Le paquet du Voleur compte la composition plus deux
villageois simples — n+2 cartes pour n sièges. Tranché, dans l'ordre des
tirages (R104) :

1. le **siège du Voleur** se tire au sort — un seul `draw()`, parmi les n
   sièges ;
2. les **n+1 cartes restantes** se mélangent — la carte Voleur est déjà
   retirée du paquet ;
3. les **cartes de fratrie** (R113) passent en tête de la liste mélangée,
   puis les n−1 sièges restants reçoivent les n−1 premières cartes dans
   l'ordre des sièges ;
4. les **deux dernières** — jamais une carte de fratrie, par construction :
   cinq cartes de fratrie au plus, et la plus petite table qui les porte
   toutes compte six sièges à distribuer — sont le talon du Voleur.

**Obligation** : si les deux cartes du talon sont des loups (camp loups,
Loup Blanc compris), le Voleur en prend une ; sinon il reste Voleur sans
pouvoir, et les deux cartes sortent du jeu, face cachée.

**D44b.** Au temps écoulé sans action (R81) : la **première carte** si
l'obligation l'exige — un tirage de moins qu'un choix au sort —, sinon il
reste Voleur.

**Pourquoi.** L'ordre des tirages garantit sans biais que la carte Voleur
est distribuée — la tirer au sort d'abord, c'est la sortir du paquet avant
le mélange, jamais la laisser au talon. Et les cartes de fratrie ne peuvent
pas rester au talon : une Sœur unique serait un rôle cassé, privé de la
moitié de sa raison d'être ; les poser en tête de la distribution, après le
mélange, ne change aucun tirage — seul l'ordre de service des cartes s'en
trouve réécrit. Une table sans Voleur ne subit aucun de ces tirages : la
distribution d'avant tient à l'identique, graine pour graine.

### D45 — Le canal fratrie, un par groupe : le pas d'un million

Attrapé au fil D de la Vague 2, après coup : le canal fratrie était **un
seul fil partagé** — quand Sœurs et Frères coexistent (R113 le permet dès
douze joueurs), chacun y lisait les messages de l'autre, et même masqués,
les trous de la numérotation (R78) puis le rabotnement des cent auraient
compté ses messages. R114 l'interdit mot pour mot : « rien dans la vue d'un
siège ne trahit l'activité d'une fratrie qui n'est pas la sienne ».

**Décision.** Le canal reste unique dans le protocole — le droit est porté
par l'état, comme prévu — mais chaque message y porte son `groupe`
(l'index dans `fratries`), et tout se compte par groupe : la numérotation,
dense depuis un, est posée au-delà d'un pas d'un million par groupe
(`DECALAGE_FRATRIE`, deux groupes au plus à une table, les suites ne se
rencontrent jamais) ; la borne des cent (R78) rabote par groupe ; la vue
n'y garde que les messages du groupe du lecteur — l'omniscient les relit
tous (R77). Chaque groupe voit sa suite dense : aucun trou ne dit l'autre.

**Pourquoi.** Un canal par groupe aurait cassé la liste close
`CHAT_CHANNELS` du protocole et la numérotation `nextMessageId` par canal ;
renuméroter dans la vue aurait déplacé les ids sous les pas du fil (le
compteur de non-lus du client lit `id > dernierVu`). Le pas d'un million
tient les trois : dense pour qui lit, unique pour tous, stable dans l'état
(R104).

### D46 — Avant la révélation, la vue ne dit aucune carte

Découvert au fil D de la Vague 2, en livrant les écrans du Voleur : pendant
la phase du Voleur (R110), la vue disait déjà le rôle de chacun, la meute
aux loups, la fratrie aux Sœurs — une seule phase avant la révélation, mais
`viewFor` est le seul filtre (R87, R88) : ce que la vue dit, la table
l'apprend.

**Décision.** Pendant `phase.kind === 'voleur'`, la vue se tient muette
pour tous les sièges : `you.role` est `null` (le champ devient nullable),
`pack` est `null`, `fratrie` est vide et le canal fratrie n'est ni lisible
ni parlable. Le livret y pousse : le Voleur échange **sans regarder sa
carte** — personne, lui compris, n'a rien découvert avant la révélation
(R31).

**Pourquoi.** Le client masquait déjà la présentation pendant la phase ;
c'est l'état de la vue qui compte, pas son maquillage. Après la clôture de
la phase, tout se découvre à la révélation, à la seconde près — rien ne
change pour une table sans Voleur, qui n'entre jamais dans cette phase.

## Questions ouvertes

La question « Robots et rôles cachés » — que faire d'un joueur qui ne
revient pas, quand son rôle est secret ? — est tranchée par D18.

| Sujet | La question |
|---|---|
| Le fil sur mobile | Tiroir qui pousse la place, ou colonne permanente compacte sous la place ? À décider devant le client réel. |
| Les minuteries | Barre toujours visible, ou mention discrète qui ne s'agite que dans les trente dernières secondes ? À décider devant le client réel. |
| Rôles suivants | Tranché : la v3 ouvre les dix-huit cartes officielles restantes, vague par vague (D26). La Vague 1 livre le Villageois-Villageois, le Renard et le Montreur d'Ours (R105–R108) ; la Vague 2 livre le Voleur, le Chien-Loup, l'Enfant Sauvage, les Deux Sœurs et les Trois Frères (R109–R114) ; les trois vagues suivantes sont planifiées. |
| La Petite Fille surprise | Faut-il un jour un risque pour la Petite Fille (D15) — et sous quelle forme, en ligne ? |
