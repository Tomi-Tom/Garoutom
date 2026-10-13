# Les rôles, la nuit, les compositions

Référence des rôles de la première version. Ce document fait foi pour recaler
la composition automatique du moteur, aujourd'hui marquée « Provisoire » dans
`packages/engine/src/options.ts` (lignes 73 à 88), et pour nourrir
[`DECISIONS.md`](../DECISIONS.md) sur les points restés ouverts. Les règles
officielles de référence sont celles de la nouvelle édition 2016 des Loups-Garous
de Thiercelieux ; chaque écart est signalé, avec le fichier et la ligne du moteur.

Les identifiants du moteur sont en français sans accent (`voyante`, `sorciere`…)
et ne s'affichent jamais tels quels : le skin les traduit (`types.ts:20-34`).

## Les huit rôles de la première version

| Rôle | Camp | Quand il joue | En une phrase |
|---|---|---|---|
| `villageois` | village | le jour, au vote | Pas de pouvoir, seulement sa voix et son flair |
| `loup` | loups | la nuit, dans la meute | Dévore une victime chaque nuit |
| `voyante` | village | la nuit, en parallèle | Découvre le rôle d'un joueur |
| `sorciere` | village | la nuit, après la meute | Une potion de vie, une potion de mort, une seule fois chacune |
| `chasseur` | village | à sa mort | Abat un joueur de son choix |
| `cupidon` | village | la première nuit seulement | Désigne deux amoureux liés jusqu'à la mort |
| `salvateur` | village | la nuit, en parallèle | Protège un joueur des loups, jamais le même deux nuits de suite |
| `idiot` | village | jamais la nuit | Gracié au vote du village, mais ne vote plus jamais |

Le camp d'origine est fixe (`campOf`, `types.ts:53-55`) ; seuls les amoureux
peuvent en changer, et seul le mélange des deux camps crée une victoire à part.

### Le Villageois

Il dort, il écoute, il vote. C'est la mesure de tout le reste : chaque rôle
spécial se juge à ce qu'il ajoute ou retire à la majorité silencieuse. Le
moteur n'a rien à en dire, et c'est voulu.

### Le Loup-Garou

Chaque nuit, la meute dévore une victime. Autour d'une table, les loups
s'accordent à voix basse ; en ligne, chacun vote de son côté :

- la **majorité** des loups vivants l'emporte (`game.ts:282-287`) ;
- une **égalité se tranche au sort** — la meute a faim, elle ne renonce pas
  faute d'accord (`game.ts:289-291`) ;
- un loup peut **changer d'avis** tant que la meute n'a pas fini de voter
  (`game.ts:641-643`), et s'abstenir (`target: null`) ;
- les loups **ne se mangent pas entre eux** (`game.ts:636-639`).

Le canal des loups existe toujours, même sans discussion intégrée au village :
la nuit, ils n'ont pas d'autre moyen de se parler (`types.ts:88-90`,
`game.ts:557`). L'égalité tranchée au sort est une adaptation maison : la règle
officielle exige un accord, qu'un serveur ne peut pas constater.

### La Voyante

Chaque nuit, elle sonde un joueur vivant et apprend son rôle. Le résultat
s'accumule nuit après nuit (`inspections`, `types.ts:206-207`). Elle ne peut pas
se sonder elle-même (`game.ts:626`) — elle se connaît déjà. Elle joue pendant
l'étape principale, en même temps que les autres rôles de nuit.

### La Sorcière

Deux potions, utilisables une seule fois chacune dans la partie
(`potions`, `types.ts:203`) :

- la **potion de vie** ressuscite la victime des loups, qu'elle connaît avant
  de décider (`night.victim`, `types.ts:150`) ;
- la **potion de mort** tue n'importe quel joueur vivant, en plus de la victime
  des loups s'il y en a une.

Elle joue seule, après l'étape principale, parce qu'elle doit savoir qui la
meute a désigné. Les deux potions peuvent partir la même nuit, comme à la
table. **Divergence à trancher :** la règle officielle 2016 lui interdit de se
servir de la potion de vie sur elle-même ; le moteur ne l'empêche pas
(`game.ts:647-661` ne vérifie ni la potion gaspillée ni la cible elle-même).

### Le Chasseur

À sa mort, il abat un joueur vivant de son choix — jamais lui-même
(`game.ts:668-669`). Le tir est un droit, pas une obligation : s'il laisse
passer les 30 secondes (`TRIGGER_MS`, `game.ts:43`), **il emporte sa balle**
(`game.ts:486-491`). Le moteur pousse le déclencheur pour **toute** mort
(`game.ts:340`), poison et chagrin compris — voir « Cases limites » : c'est le
point qui diverge le plus nettement de la règle officielle.

### Cupidon

Il ne joue que la **première nuit** (`game.ts:142`, `game.ts:601`) : il désigne
deux amoureux vivants, lui-même éventuellement — la règle officielle l'y
autorise aussi, et le moteur se contente d'exiger deux personnes distinctes
(`game.ts:602-604`). Les amoureux se connaissent et disposent d'un canal privé
permanent, de jour comme de nuit (`game.ts:558-560`). Si l'un meurt, l'autre
meurt de chagrin dans la foulée (`game.ts:343-347`).

Deux amoureux de camps opposés ne gagnent plus avec leur camp : s'ils sont les
deux derniers survivants, la victoire est à eux seuls (`game.ts:360-367`). Deux
amoureux du même camp gagnent normalement avec lui.

### Le Salvateur

Chaque nuit, il protège un joueur de l'attaque des loups — lui compris. Une
seule limite : **pas deux nuits de suite la même personne**
(`game.ts:613-617`, `lastProtected`, `types.ts:205`). Comme à la table, son
bouclier n'arrête pas le poison : la potion de la Sorcière tue quand même
(`game.ts:305-316`).

### L'Idiot du Village

S'il est **condamné par le vote du village**, il est gracié : son rôle est
montré à tous (`revealed`, `types.ts:116-117`), il reste en vie, mais il ne
vote plus jamais (`canVote = false`, `game.ts:450-457`). La grâce n'existe
qu'au vote : dévoré, empoisonné ou abattu, il meurt comme les autres. Il
continue de débattre — un idiot muet ne servirait rien.

## Le capitaine

Ce n'est pas un rôle, c'est une charge, incompatible avec la grâce d'ailleurs
impossible ici : l'élection n'a lieu que le premier jour, avant tout vote.

- Élu au **jour 1** si l'option est active (`game.ts:409-411`), au suffrage de
  tous les vivants, abstention permise. Une égalité donne un capitaine **tiré
  au sort** (`game.ts:424`) ; aucun suffrage, pas de capitaine — et il n'y a
  pas de seconde chance, l'élection ne revient pas.
- Sa voix compte **double** au vote du village (`game.ts:438-441`).
- À sa mort, il **désigne un successeur** vivant (`game.ts:341`,
  `game.ts:682-688`). S'il laisse filer les 30 secondes, le successeur est
  pris **au hasard** parmi les vivants (`game.ts:493-496`) — adaptation
  maison, la règle officielle n'a pas de plan B.

**Divergence à trancher :** la règle officielle fait élire le capitaine *avant*
la première nuit ; Garoutom l'élit au matin du jour 1, après la première nuit
(`game.ts:409-411`). Un capitaine dévoré pendant la nuit 1 est donc impossible
ici.

## Le fil d'une nuit et d'un jour

Tel que le moteur le joue, sans exception :

1. **Révélation** (25 s, `REVEAL_MS`, `game.ts:42`). Chacun découvre sa carte
   et confirme. La nuit 1 précède le jour 1 : le compteur ne bouge pas
   (`types.ts:194-196`, `game.ts:235-238`).
2. **Nuit, étape principale.** Cupidon (nuit 1 seulement), Salvateur, Voyante
   et loups jouent **en même temps** (`game.ts:140-148`). Aucun n'a besoin du
   choix des autres, et appeler les rôles un par un ferait attendre dix-huit
   personnes pour rien. C'est l'écart le plus visible avec la table, où le
   meneur appelle chaque rôle dans l'ordre.
3. **Bascule de l'étape.** Les amoureux sont liés, la protection retenue, la
   voyance enregistrée, la victime des loups tranchée (`game.ts:263-291`).
4. **Sorcière**, si elle fait partie de la distribution — morte comprise
   (`inGame`, `game.ts:293`) : sauter son tour dirait à tous qu'elle n'est
   plus là. Morte, son étape fantôme dure un temps imprévisible, tiré entre
   5 et 10 secondes (`GHOST_STEP_MS`, `game.ts:52-53`).
5. **Aube.** Les morts sont annoncées d'un bloc : dévoré — sauf si protégé ou
   ressuscité —, empoisonné, mort de chagrin. Nuit blanche : « aube paisible »
   (`game.ts:321`).
6. **Déclencheurs.** Le Chasseur mort tire (30 s), le capitaine mort désigne
   (30 s), l'un après l'autre, la chaîne peut s'enchaîner (`game.ts:376-394`).
7. **Victoire**, regardée seulement déclencheurs vidés : le Chasseur tire même
   quand son camp a déjà perdu, et son tir peut tout renverser
   (`game.ts:352-355`, `game.ts:396`). Quatre issues : le village (plus aucun
   loup), les loups (plus que des loups), les amoureux (couple mixte, deux
   derniers survivants), personne (table morte en même temps)
   (`game.ts:356-373`).
8. **Jour 1 : élection** du capitaine (90 s, `ELECTION_MS`, `game.ts:44`), si
   l'option est active. Les jours suivants sautent directement au suivant.
9. **Jour : débat et vote** (`tempsJour`). La voix du capitaine double,
   l'abstention est permise, **une égalité n'exécute personne** — le village
   ne condamne pas au hasard (`game.ts:442-445`). L'Idiot gracié le cas
   échéant.
10. **Nuit suivante.** Le compteur avance, et tout recommence.

Le temps écoulé tranche ce qui n'est pas joué : qui n'a pas agi n'agit pas
(`game.ts:718-723`). Un loup muet ne vote pour personne, une Voyante endormie
ne voit rien, un village qui n'a pas voté n'exécute personne. La règle
officielle n'a pas de minuteries ; c'est la contrepartie obligatoire d'une
partie en ligne.

### Les écarts assumés avec la règle officielle

| # | Sujet | Règle officielle 2016 | Garoutom | Où |
|---|---|---|---|---|
| 1 | Appel des rôles | un par un, dans l'ordre | en parallèle pendant l'étape principale | `types.ts:135-141` |
| 2 | Égalité chez les loups | la meute doit s'accorder | victime tirée au sort | `game.ts:289-291` |
| 3 | Égalité au village | second scrutin entre les ex aequo | personne n'est exécuté | `game.ts:442-445` |
| 4 | Élection du capitaine | avant la première nuit | au matin du jour 1 | `game.ts:409-411` |
| 5 | Chasseur empoisonné | il ne peut pas tirer | il tire | `game.ts:340` |
| 6 | Sorcière | ne peut pas se sauver elle-même | elle le peut | `game.ts:647-661` |
| 7 | Successeur du capitaine | désigné par le capitaine, sans faute | au hasard si le temps est dépassé | `game.ts:493-496` |
| 8 | Minuteries | aucune | qui n'a pas agi n'agit pas | `game.ts:718-723` |
| 9 | Amoureux | se reconnaissent la première nuit | canal privé permanent, jour et nuit | `game.ts:558-560` |

Les écarts 1, 2, 3, 7, 8 et 9 sont des adaptations nécessaires ou commodes à
une table en ligne : ils tiennent debout. Les écarts 4, 5 et 6 sont des
incidences du code plutôt que des choix, et méritent une décision explicite
dans [`DECISIONS.md`](../DECISIONS.md).

## Les compositions recommandées

### Ce que le moteur propose aujourd'hui

`autoComposition` (`options.ts:80-88`) : 2 loups jusqu'à 8 joueurs, 3 jusqu'à
12, 4 jusqu'à 16, 5 au-delà ; voyante et sorcière toujours, chasseur dès 8,
cupidon dès 9, salvateur dès 10, idiot dès 12. Deux garde-fous dans
`compositionFor` : jamais autant de loups que d'autres joueurs
(`options.ts:100-103`), jamais plus de rôles que de joueurs
(`options.ts:104-106`).

L'ossature est saine : un loup pour trois à quatre joueurs, c'est le ratio
qu'autorisent les rôles spéciaux — la règle officielle, elle, tourne autour
d'un loup pour quatre à cinq dans une boîte sans rôles, et ne descend pas
sous huit joueurs. Les 6-7 joueurs de Garoutom sont du territoire maison.

Deux seuils méritent un décalage, d'un palier chacun :

- **Cupidon dès 9** (`options.ts:84`) tombe mal : à 9 joueurs, il ne reste
  que 2 villageois simples, et un couple mixte crée une troisième faction
  dans un village minuscule. On le repousse à 10.
- **Le salvateur dès 10** (`options.ts:85`) cumule, à ce palier, bouclier,
  deux potions et voyance : les nuits des loups deviennent très difficiles à
  passer, et il ne reste que 2 villageois. On le repousse à 11.

### La composition recommandée

| Joueurs | Loups | Rôles spéciaux | Villageois | L'équilibre |
|---|---|---|---|---|
| 6 | 2 | voyante, sorcière | 2 | Sous le plancher officiel de 8. Le village a besoin des deux rôles d'information ; parties courtes, chaque voix pèse. |
| 7 | 2 | voyante, sorcière | 3 | Même chose, un villageois de plus pour respirer. |
| 8 | 2 | + chasseur | 3 | Le plancher officiel. Le Chasseur entre : un loup abattu de jour n'est jamais gratuit. |
| 9 | 3 | voyante, sorcière, chasseur | 3 | Le palier le plus agressif : 33 % de loups. Il se tient parce que le village garde trois rôles actifs — mais Cupidon attend. |
| 10 | 3 | + cupidon | 3 | Cupidon entre. Le couple mixte, troisième faction, a du monde autour. |
| 11 | 3 | + salvateur | 3 | Le bouclier entre en dernier : jusqu'ici, les nuits des loups restaient franchissables. |
| 12 | 3 | + idiot | 3 | Le moteur et cette page convergent : 3 loups, les six rôles, la composition classique. |
| 13-14 | 4 | les six rôles | 3-4 | Le quatrième loup compense un village complètement outillé. |
| 15-16 | 4 | les six rôles | 5-6 | Même composition, le village s'étoffe : les villageois simples reviennent. |
| 17-18 | 5 | les six rôles | 6-7 | Cinq loups, soit 28-29 % : la meute se cache dans la foule, les claims de rôles deviennent un sport. |

Règles de construction, valables pour toute composition manuelle :

- au moins **deux loups** : un canal secret d'une personne n'est pas un
  canal ;
- au moins **deux ou trois villageois simples** : une table où tout le monde
  a un pouvoir perd le sel du bluff, et les réclamations de rôles ne
  veulent plus rien dire ;
- un loup pour **trois à quatre joueurs**, à ajuster selon le nombre de rôles
  qui arment le village ;
- un seul exemplaire de chaque rôle spécial au plus (`options.ts:80`).

Si les premières parties à 9 joueurs tournent à la foire d'empoigne côté
loups, le bon réflexe n'est pas de retirer un loup — avec trois rôles de
village, deux loups seraient des agneaux — mais d'attendre un joueur de plus
pour y entrer.

## Cases limites

1. **Le Chasseur empoisonné.** La règle officielle est claire : le poison
   l'étouffe, il ne tire pas. Le moteur pousse le déclencheur pour toute mort
   (`game.ts:340`), poison compris — et même mort de chagrin, que la règle
   officielle n'a jamais eu à envisager. En l'état, il tire. Divergence à
   trancher ; si on la garde, l'assumer comme un choix dans
   [`DECISIONS.md`](../DECISIONS.md).
2. **L'Idiot dévoré.** Pas de grâce : elle n'existe qu'au vote du village
   (`game.ts:450-457`). Dévoré, empoisonné ou abattu par le Chasseur, l'Idiot
   meurt. C'est la règle officielle, et le moteur la suit.
3. **Le capitaine mort.** Le déclencheur de succession part pour toute mort
   (`game.ts:341`) ; il désigne un successeur vivant, ou en hérite un au
   hasard si le temps file (`game.ts:493-496`). En v1, un capitaine ne peut
   pas mourir la première nuit : il n'existe pas encore.
4. **Les amoureux mixtes.** Derniers survivants, ils gagnent à eux deux
   (`game.ts:360-367`). L'un meurt — dévoré, empoisonné, exécuté, abattu —
   l'autre meurt de chagrin (`game.ts:343-347`), et ce chagrin peut
   enclencher un tir de Chasseur ou une succession.
5. **La Sorcière sur une victime protégée.** Si le Salvateur couvrait déjà la
   victime, la potion de vie part quand même (`game.ts:305-311`) : elle ne
   peut pas savoir, et c'est fidèle à la table. La potion se perd pour rien.
6. **La Sorcière qui empoisonne la victime des loups.** Une seule mort : le
   second coup frappe un mort (`game.ts:333-335`). Le carnet note le poison,
   la mort reste attribuée aux loups.
7. **Les loups abstentionnistes.** Tous à null : nuit blanche, « aube
   paisible » (`game.ts:321`). La règle officielle oblige la meute à manger ;
   le moteur laisse le choix, à charge pour les loups d'assumer un silence
   suspect.
8. **Le tir en chaîne.** La victime du Chasseur peut être capitaine
   (succession enchaînée) ou amoureuse (chagrin en cascade). La victoire
   n'est regardée qu'une fois la chaîne vide (`game.ts:376-396`) : un tir
   peut renverser une partie déjà perdue.
9. **Le Chasseur dernier survivant.** Personne à viser : le déclencheur est
   sauté (`game.ts:383-384`).
10. **Le temps écoulé.** Personne n'agit après la cloche (`game.ts:718-723`).
    Le Chasseur silencieux emporte sa balle, le capitaine muet lègue sa charge
    au hasard.

## Les rôles de la v2

Ouverts le 11 octobre 2026 (D12 à D16, règles R90 à R100). Tous
**optionnels** : la composition de référence ne les tire jamais, l'hôte les
coche, le générateur ne les propose que sur demande — rien sous dix joueurs,
un jusqu'à treize, deux au-delà, le Loup Blanc dès douze.

| Rôle | Camp | Quand il joue | En une phrase |
|---|---|---|---|
| `ancien` | village | jamais, il encaisse | Survit à la première attaque de la meute ; tué par le village, il emporte ses pouvoirs |
| `corbeau` | village | la nuit, en parallèle | Marque un vivant, qui porte deux voix d'office au vote du jour |
| `bouc` | village | au vote, à sa mort | Meurt à la place d'une égalité, et désigne qui votera le lendemain |
| `petiteFille` | village | la nuit, sans agir | Voit combien de loups visent chaque cible, jamais lesquels |
| `loupBlanc` | loups (gagne seul) | la nuit, avec la meute ; seul les nuits paires | Chasse avec la meute, dévore un loup une nuit sur deux, ne gagne que seul |

### L'Ancien

Il a deux vies contre la meute, une seule contre tout le reste. La première
attaque qui l'aurait tué le laisse debout, et personne n'en sait rien : l'aube
est paisible. Une attaque couverte par le bouclier ou rachetée par la potion
de vie ne lui coûte rien — la potion, elle, part (R44). Le poison, le vote,
la balle du Chasseur le tuent du premier coup.

Tué **de la main du village** — vote, tir, poison —, il se venge : sa carte
se retourne, et le village perd ses pouvoirs (R92), sous l'option de table
`ancienRancunier` (défaut : oui, la règle officielle). Concrètement : plus de
consigne de nuit pour la Voyante, le Salvateur, Cupidon, le Corbeau, la
Sorcière (son étape se tient, fantôme) ; plus de regard pour la Petite
Fille ; plus de balle pour un Chasseur qui n'a pas encore tiré, même tombé à
la même aube ; plus de grâce pour l'Idiot ; plus de dernier mot pour le Bouc,
qui paie toujours les égalités. Ce qui a été joué reste joué.

### Le Corbeau

Pendant l'étape principale, il marque un vivant — lui compris — ou personne.
À l'aube, après les morts, l'annonce tombe : « le Corbeau a désigné X », sans
jamais dire qui est le Corbeau. Au vote du jour, X porte deux voix d'office,
qui s'ajoutent au décompte ; X vote comme les autres. Une marque sur un mort
de la nuit s'éteint sans bruit.

### Le Bouc émissaire

Il est la seule exception à « une égalité n'exécute personne » (R61) : s'il
vit, l'égalité — au moins une voix en tête, à plusieurs — le tue, même s'il
n'en faisait pas partie. Sa carte se retourne. Son dernier mot, 30 s : il
désigne au moins un vivant, et ceux-là seuls voteront au prochain vote du
village. S'il se tait, tout le monde vote.

### La Petite Fille

Elle n'a pas de consigne — sa vue est celle d'un villageois, au rôle près.
Pendant l'étape principale, elle voit pour chaque cible combien de loups la
visent, jamais lesquels (`espionnage`). Elle ne risque pas d'être surprise :
écart assumé avec la boîte (D15).

### Le Loup Blanc

Il chasse avec la meute, qui le prend pour un loup ordinaire : il vote, lit
et écrit le canal des loups. Les nuits paires, s'il fait partie de la
distribution, une étape à lui suit l'étape principale : il peut dévorer un
autre loup, ou personne. Mort, son étape se tient quand même, d'une durée
fantôme, comme celle de la Sorcière. Sa proie meurt de la cause `loups`. Il
ne gagne que **seul** ; la meute ne gagne plus qu'entre loups ordinaires ; et
si la meute reste seule avec lui, la partie continue — trois nuits au plus
sans une mort, puis la meute l'emporte (R99).

### Les écarts de la v2 avec la boîte

| # | Sujet | Règle officielle | Garoutom | Où |
|---|---|---|---|---|
| 10 | Ancien et bouclier | non tranché | l'attaque arrêtée ne compte pas | R91, D13 |
| 11 | Rancune de l'Ancien | toujours | option `ancienRancunier`, vraie par défaut | R92, D13 |
| 12 | Chasseur et rancune simultanée | non tranché | le tir qui reste à jouer est perdu | R92, D13 |
| 13 | Bouc sans pouvoirs | non tranché | meurt toujours de l'égalité, ne désigne plus | R94, D14 |
| 14 | Petite Fille | risque d'être surprise | aucun risque, espionnage anonyme | R95, D15 |
| 15 | Victime du Loup Blanc | annoncée comme un mort de la nuit | cause `loups`, la Sorcière ne la connaît pas | R97, D16 |
| 16 | Loup Blanc qui ne mord pas | non tranché | trois nuits de huis clos sans mort, la meute gagne | R99, D16 |

## Les rôles de la v3 — première vague

Ouverts le 13 octobre 2026 (D26, D29 à D31, règles R105 à R108). Trois
cartons de l'extension Personnages, cochés par l'hôte seul : jamais dans la
référence, jamais dans les suggestions, jamais au générateur — une table qui
n'en coche aucun rejoue la v2 état pour état, graine pour graine.

| Rôle | Camp | Quand il joue | En une phrase |
|---|---|---|---|
| `villageois2` | village | jamais | La carte certifie son porteur innocent aux yeux de tous — lui compris |
| `renard` | village | la nuit, en parallèle | Flaire un trio de voisins : un loup dedans garde son pouvoir, un trio sain le lui retire à vie |
| `ours` | village | jamais, son ourson grogne | À l'aube, la bête gronde si un loup vivant s'assied à côté de lui |

### Le voisinage

L'ordre des sièges est l'ordre du cercle (R105) : le client pose les rangs
depuis le bas, en tournant dans le sens des aiguilles d'une montre — un
joueur assis face au centre a son **siège +1 à sa gauche**, son siège −1 à
sa droite, modulo n. C'est la convention de toute la v3 : le Chevalier à
l'Épée Rouillée (Vague 3) cherchera « le premier loup à sa gauche » dans ce
sens. Le voisinage se dérive — `voisinsDe`, fonction pure — de la seule
liste des joueurs : c'est une géométrie publique, ni un état, ni un secret.

### Le Villageois-Villageois

Aucun pouvoir, aucun verbe, aucune consigne : la carte ne vit que par la
**certitude publique** que son porteur est un villageois innocent — aucune
vie bonus, fidèle au recto-verso officiel. Et le porteur lui-même n'en sait
rien : toutes les vues — la sienne comprise — lisent `villageois` (D31).
Seul le récapitulatif de fin, où plus rien n'est caché, dit `villageois2`.
Quand l'Infect Père des Loups arrivera (Vague 5), la certification portera
sur la carte, pas sur le camp effectif : la vue restera sincère — et la
carte redoutable.

### Le Renard

Chaque nuit, pendant l'étape principale — en parallèle, comme le Corbeau —,
il flaire un trio : un joueur central vivant de son choix et les deux
voisins **vivants** de ce centre (un voisin mort n'est jamais remplacé, le
trio peut être plus petit). L'usage est facultatif : ne rien sonder ne coûte
rien. Le Renard peut se compter dans son trio, au centre ou à l'aile (D29).
Un loup dedans — camp d'origine — : le signe lui revient en privé, son
pouvoir demeure. Aucun loup : le pouvoir est perdu **à vie**, et les sièges
du trio restent des innocents appris. Les trios s'accumulent dans son
carnet privé (`renardSavoirs`), pour lui seul ; aucun évènement public ne
dit un sondage, un signe ni une perte (R87). La rancune de l'Ancien éteint
son flair (R92).

### Le Montreur d'Ours

Il ne joue jamais. Chaque matin où il vit, après l'annonce des morts, un
évènement public tombe : l'ourson gronde si un loup — camp d'origine — est
l'un des deux voisins **vivants** de son maître ; un voisin mort ne compte
pas. L'aube paisible reçoit son évènement comme les autres : `grogne:
false` est une information, pas un silence. Mort — la nuit qui vient de
finir comprise —, il ne grogne pas : sa mort est publique, pas de grogne
posthume, pas d'étape fantôme. La rancune de l'Ancien n'y change rien
(D30) : la grogne est celle d'un animal, pas un pouvoir du village.

### Les écarts de la V1 avec la boîte

| # | Sujet | Règle officielle | Garoutom | Où |
|---|---|---|---|---|
| 17 | Renard dans son trio | non tranché | il peut s'y compter, au centre ou à l'aile | D29 |
| 18 | Grogne et rancune | non tranché | la grogne survit : un animal, pas un pouvoir du village | D30 |
| 19 | Porteur du Villageois-Villageois | non tranché | il lit « villageois » comme les autres ; la fin seule dit la vérité | D31 |

## Les rôles de la v3 — deuxième vague

Ouverts le 13 octobre 2026 (D25, D27, D28, D32, D33, D44 ; règles R109 à
R114). Cinq cartons — le Voleur du jeu de base, et le Chien-Loup, l'Enfant
Sauvage, les Deux Sœurs et les Trois Frères de l'extension Personnages —
toujours cochés par l'hôte seul : jamais dans la référence, jamais dans les
suggestions, jamais au générateur. Une table qui n'en coche aucun rejoue la
v2 état pour état, graine pour graine. La vague pose en même temps les deux
fondations de la suite : le **camp effectif** (R109) et le **canal
fratrie** (R114).

| Rôle | Camp | Quand il joue | En une phrase |
|---|---|---|---|
| `voleur` | selon la carte volée | avant la révélation | Regarde les deux cartes non distribuées et en prend une — obligé si ce sont deux loups |
| `chienLoup` | il choisit | la première nuit seulement | Se range définitivement côté village — aveugle — ou côté loups — meute |
| `enfantSauvage` | village, puis loup | la première nuit ; à la mort de son modèle | Désigne un modèle : mort, il devient un loup qui se réveille avec la meute la nuit suivante |
| `soeurs` | village | jamais | Deux cartes : elles se connaissent, et disposent d'un canal permanent entre vivantes |
| `freres` | village | jamais | Trois cartes, idem Sœurs ; les deux groupes peuvent coexister |

### Le camp effectif

Chaque siège porte un camp d'origine (R3) et un camp **effectif** : l'état
ne porte le second que si un rôle l'a écrit — le Chien-Loup rangé,
l'Enfant Sauvage transformé — et tout lecteur de camp le lit (R109) : la
victoire, la meute, le huis clos, le trio du Renard, la grogne de l'Ours,
les cibles interdites. La carte lue — la Voyante qui sonde, la mort qui
retourne — dit le **rôle courant**, masqué comme toute carte (R106). Le
Loup Blanc reste spécial : camp aux loups, faction à lui seul (R98).

### Le Voleur

Avant la révélation, une phase à lui (25 s) : le paquet compte la
composition plus deux villageois simples ; son siège se tire au sort, les
cartes restantes se mélangent, les deux non distribuées sont les siennes
(D44). Il en prend une — elle devient sa carte, un rôle comme un autre,
joué dès la première nuit — ou s'abstient, si aucune obligation ne s'y
attache ; l'autre carte — ou les deux — sort du jeu, face cachée.
**Obligation de prendre une carte si les deux sont des loups** ; au temps
écoulé, la première carte si l'obligation l'exige, sinon il reste Voleur
sans pouvoir (D44b). Les cartes de fratrie ne tombent jamais à son talon :
elles sont distribuées par construction. Aucun évènement ne dit son
choix ; la première nuit qui suit ne fait pas bouger le compteur de jours
(R33).

### Le Chien-Loup

La première nuit, pendant l'étape principale, il se range définitivement.
Côté loups, il est un loup : camp effectif aux loups, voix à la meute,
canal et vues du pack — où il passe pour un loup ordinaire, comme le Loup
Blanc —, indévorable par la meute et dévorable par le Loup Blanc (D27).
Sa carte reste `chienLoup` : la Voyante qui le sonde la voit, sa mort la
montre. Côté village — ou au temps écoulé —, il ne voit jamais rien : un
villageois sans consigne (R81). Pour la borne de R13, il compte parmi les
loups dès le salon, l'hôte ne sachant pas de quel côté il tombera (D32) ;
rangé côté village, il resterait infectable par l'Infect Père des Loups
(D32b). Aucun évènement ne dit son choix.

### L'Enfant Sauvage

La première nuit, pendant l'étape principale, il désigne un modèle : un
vivant, lui compris, jamais informé. Le modèle meurt — toute cause,
l'abandon compris — et l'Enfant devient un loup (D33) : camp effectif aux
loups **immédiatement** — la victoire, l'Ours, le Renard le lisent tout de
suite —, carte réécrite `loup` — la Voyante la voit, sa mort la montre —,
mais la meute ne l'accueille qu'à la nuit suivante : vues du pack, canal
des loups et consigne `devorer` attendent le `startNight` qui vient. La
transformation ne produit aucun évènement : le secret est absolu, seul le
récapitulatif de fin le raconte. Sans modèle au temps écoulé de la
première nuit, il ne se transforme jamais ; un modèle infecté (Vague 5)
survit : pas de transformation tant qu'il vit.

### Les Deux Sœurs et les Trois Frères

Ni verbe, ni consigne, ni pouvoir : ils se connaissent. L'hôte coche
l'id une fois — la composition porte deux cartes pour les Sœurs, trois
pour les Frères (R4, R113) ; les Sœurs se cochent dès dix joueurs, les
Frères dès douze, et les deux groupes peuvent coexister, chacun avec le
sien. Chaque membre connaît les siens dès la révélation — dans sa vue,
jamais dans un évènement — et leur canal est permanent, de jour comme de
nuit, entre vivants du groupe (D28) : un mort le quitte, `mortsVoientTout`
le rend en lecture. Les cartes de fratrie sont distribuées, jamais au
talon du Voleur. La rancune de l'Ancien n'y change rien : la connaissance
n'est pas un pouvoir (R92).

### Les écarts de la V2 avec la boîte

| # | Sujet | Règle officielle | Garoutom | Où |
|---|---|---|---|---|
| 20 | Voyante et transformations | non tranché | elle lit le rôle courant ; l'Enfant devenu loup montre `loup`, le Chien-Loup garde sa carte | D27 |
| 21 | Réveils des fratries | « de temps en temps », souvent un tour sur deux | canal permanent entre vivants, le précédent des amoureux | D28, R114 |
| 22 | Chien-Loup et la borne de loups | non tranché | compté comme un loup dès le salon, conservateur | D32 |
| 23 | Enfant : moment de la transformation | « devient un loup-garou », « se réveille avec la meute dès la nuit suivante » | camp immédiat, réveil différé au `startNight` suivant | D33 |
| 24 | Talon du Voleur | deux cartes non distribuées | siège tiré au sort puis mélange ; les cartes fratrie hors talon par construction ; obligation si deux loups | D44 |
| 25 | Voleur et la découverte des cartes | le Voleur échange sans regarder sa carte | la vue se tait pour tous pendant sa phase : aucun rôle, ni meute, ni fratrie avant la révélation | D46, R110 |
| 26 | Deux fratries à la même table | chaque groupe se reconnaît séparément | un seul canal au protocole, tout y est par groupe : messages, numérotation, rabotnement — aucun trou ne dit l'autre | D45, R114 |

## Les rôles envisagés pour plus tard

Ce qui reste de la boîte, du moins au plus coûteux à câbler.

| Rôle | Ce qu'il apporterait | Coût |
|---|---|---|
| Joueur de flûte | Charme chaque nuit, gagne seul si tout le village est charmé | Élevé — une troisième condition de victoire et un état caché par joueur |

Le Bouc émissaire, le Corbeau, l'Ancien, la Petite Fille et le Loup Blanc,
envisagés ici au temps de la v1, sont passés dans la section v2 ; le Renard,
envisagé au même moment, vient de passer dans la section v3 ; le Voleur,
envisagé au même moment, vient de passer dans la section v3 — deuxième
vague.
