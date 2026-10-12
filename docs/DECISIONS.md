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

## Questions ouvertes

La question « Robots et rôles cachés » — que faire d'un joueur qui ne
revient pas, quand son rôle est secret ? — est tranchée par D18.

| Sujet | La question |
|---|---|
| Le fil sur mobile | Tiroir qui pousse la place, ou colonne permanente compacte sous la place ? À décider devant le client réel. |
| Les minuteries | Barre toujours visible, ou mention discrète qui ne s'agite que dans les trente dernières secondes ? À décider devant le client réel. |
| Rôles suivants | Cinq sont ouverts en v2 (D12–D16). Restent le Voleur, le Renard, le Joueur de flûte (`refs/roles.md`) : lesquels, et quand ? |
| La Petite Fille surprise | Faut-il un jour un risque pour la Petite Fille (D15) — et sous quelle forme, en ligne ? |
