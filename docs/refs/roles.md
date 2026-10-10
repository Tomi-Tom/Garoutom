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

## Les rôles envisagés pour plus tard

Une ligne chacun, pour un jour où [`DECISIONS.md`](../DECISIONS.md) s'ouvrira
aux autres cartons de la boîte. Classés du moins au plus coûteux à câbler.

| Rôle | Ce qu'il apporterait | Coût |
|---|---|---|
| Bouc émissaire | Meurt à la place des ex aequo : rend le vote à majorité molle dangereux | Faible — une branche dans `closeDay`, mais il remet en cause l'« égalité = personne » |
| Corbeau | Ajoute un vote secret contre un suspect chaque nuit : plus de pression sur les loups | Faible — un tour de nuit de plus, un décompte pondéré |
| Voleur | Choisit sa carte parmi deux au début : le doute sur la distribution | Moyen — une phase avant la révélation, un choix caché |
| Ancien | Survit à la première attaque des loups : un sursis qui se joue | Moyen — un état par joueur, des interactions avec le bouclier et le poison |
| Petite Fille | Espionne le vote des loups, au risque de s'y faire prendre | Moyen — une fuite d'information dans l'étape de la meute, la plus délicate à projeter sans rien dire |
| Loup Blanc | Un loup qui dévore aussi la meute et gagne seul | Moyen — une étape de nuit en plus, une victoire solitaire dans `Winner` |
| Renard | Sonne un triplet de voisins d'un coup : la voyance devient pari | Moyen — une sonde à trois cibles et une contrainte de placement |
| Joueur de flûte | Charme chaque nuit, gagne seul si tout le village est charmé | Élevé — une troisième condition de victoire et un état caché par joueur |

Aucun n'est prévu pour la v1. Les trois premiers sont des variantes de
comptage ; tout ce qui touche à une victoire solitaire ou à une information
qui fuit mérite d'attendre que les huit rôles actuels aient fait leurs
preuves.
