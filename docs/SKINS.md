# Le contrat des skins

Garoutom est né deux fois : une fois en moteur, une fois en univers. Le moteur
([D6](DECISIONS.md)) ne connaît que des mécaniques — des camps qui s'opposent,
des étapes de nuit, des pouvoirs ; l'univers est un habit que le client change
sans toucher à une règle. Ce document est le contrat entre les deux : ce qu'un
skin est, ce qu'il fournit, ce qu'il n'a pas le droit d'approcher — puis le skin
de référence, `thiercelieux`, écrit en entier, comme la table que le client
implémentera, et l'esquisse du second, `shiganshina`.

`types.ts` le promet en tête : « les noms, les textes, l'ambiance appartiennent
au skin, côté client (voir `docs/SKINS.md`) ». Voici la page. Le client n'existe
pas encore : ce qui suit se veut complet sur les textes, et explicitement
propositionnel sur le format.

## 1. Ce qu'un skin est

### L'identifiant

Pour le moteur, un skin tient en une chaîne : l'option `skin` (**R12**), un
identifiant `[a-z0-9-]{1,32}` transporté sans être lu. Le moteur vérifie la
forme, jamais l'existence — « le client retombe sur le défaut s'il ne le
connaît pas » (`options.ts`). L'identifiant part dans la partie et la partie le
porte : tout le monde habite le même univers, du salon à la fin.

Pour le client, un skin est trois choses :

1. **un identifiant** — celui de l'option ;
2. **un nom d'univers** — « Les Loups-Garous de Thiercelieux », « Attack on
   Titan » — affiché au salon et dans la fiche de la partie ;
3. **une table de textes** — tout ce que le jeu dit — posée sur un habit
   visuel et sonore (palette, polices, symboles gravés, art, atelier).

### Ce que le skin fournit — l'inventaire exhaustif

Le moteur rend des identifiants stables ; le skin les habille. Tout ce qui
suit est **obligatoire** : le registre client refuse un skin incomplet plutôt
que d'afficher un identifiant brut ([`refs/design.md`](refs/design.md), « le
contrat »).

| Le moteur rend | Le skin fournit |
|---|---|
| `RoleId` — les 13 rôles (8 de la v1, 5 optionnels de la v2) | un nom affiché et une description de carte pour chacun |
| `GameEvent` — les 13 types d'évènements | les phrases du narrateur, avec leurs variables (siège, cause, rôle révélé ou non) |
| `DeathCause` — les 5 causes | la phrase de mort de chaque cause |
| `Prompt` — les 12 consignes | le texte d'action montré au siège concerné |
| `ChatChannel` — les 4 canaux | le libellé de chaque canal (sa teinte est design) |
| `Winner` — les 5 issues | le verdict de fin de partie |
| `PhaseKind` et `NightStep` | les phrases de changement de phase et d'étape |
| `suggestionsFor` — les compositions | le nom et une ligne d'ambiance pour chacune (R23 : le moteur rend des compositions, le skin les nomme) |
| la charge de capitaine | son nom — « le capitaine » n'est pas un `RoleId`, mais c'est un mot que l'écran affiche |
| `LogEntry` — les 17 types de lignes | la nuit racontée : la voix qui récite le récapitulatif final, secrets compris (R88) |
| — | l'habit : palette, polices, symboles, art, atelier sonore (voir plus bas) |

Les `Action`, elles, n'ont rien à traduire : ce sont des entrées, pas des
textes. Chaque action à consigne a déjà son prompt ; `dire` n'en a pas — le fil
se parle tout seul, et les mots des joueurs ne regardent aucun univers.

### Ce qu'un skin ne touche jamais

La liste est courte et sans exception :

- **la mécanique** — pas un rôle en plus, pas un pouvoir réécrit, pas une
  victoire inventée. Une partie Thiercelieux et la même en Shiganshina
  produisent exactement les mêmes états (D6) : c'est la condition d'un
  équilibrage unique pour tous les univers.
- **les durées** — les minuteries appartiennent à l'hôte et au moteur
  (R11, R82) ; un univers qui « se vivrait plus lentement » n'est pas une
  option.
- **les vues et les secrets** — le filtrage est fait par `viewFor` avant que
  le skin existe (R88, silence par défaut). Un skin ne peut rien dévoiler,
  précisément parce qu'il ne reçoit rien que la vue ne contienne déjà.
- **le cadre commun de l'arcade** — lien retour, bouton son, `DosDeBoite`,
  `EcranFin`, `Rideau`, cibles ≥ 44 px, `prefers-reduced-motion` : le cadre est
  commun, l'intérieur est libre.

### La frontière des couleurs

On aurait pu trancher « le skin change les mots et les symboles gravés, pas
les couleurs du meuble ». [`refs/design.md`](refs/design.md) a tranché
autrement, et ce document le suit : **la palette, les polices, les symboles,
l'art et l'atelier sonore appartiennent au skin** (« la matière, le lieu,
l'heure ; la palette — qui remplit `--arcade-*` et ses tokens — ; les
polices » ; et D10 promet déjà que « le hurlement devient un cri de Titan »).
C'est la bonne coupe : un Shiganshina qui garderait le bleu nocturne, la
lanterne et le hurlement de Thiercelieux serait un déguisement à moitié
porté.

Mais la liberté de repeindre n'est pas celle de déplacer les murs porteurs.
L'architecture **sémantique** de l'habit est contrat, pas style :

- **un accent par camp** — le village a sa couleur, le camp qui chasse la nuit
  a la sienne ; un skin peut changer les valeurs, pas la distinction ;
- **une encre neutre pour le narrateur** — la voix qui dit les morts ne porte
  jamais la couleur d'un camp ;
- **une teinte par canal**, lisible dans les deux mondes ;
- **le fond ne bouge pas entre la nuit et le jour** — un éclairage change,
  pas un thème (design.md, section 1) ;
- **les contrastes restent mesurés** — AA sur les deux fonds, verrouillé par
  test comme chez MastomMind ;
- **trois polices au plus**, une identité qui n'entre jamais dans une phrase.

En une formule : le skin change les mots, les symboles et la lumière de la
pièce — pas la pièce.

## 2. Thiercelieux — le skin de référence, écrit en entier

### La voix

Celle de [`refs/design.md`](refs/design.md) : **la place du village, entre
chien et loup**. Le narrateur parle comme on raconte une histoire le soir —
des phrases courtes, un vocabulaire de village (la place, la meute, la
potence, le brassard, le bouclier), jamais un jeu de mots qui grince, jamais
de familiarité. Il annonce, il ne commente pas : quand tout le monde est mort,
il ne s'apitoie pas, il pose la carte.

Trois règles de plume, qui valent pour tout skin :

1. **Aucun mot ne s'accorde avec un pseudo.** Les participes suivent leurs
   compléments (« la meute a dévoré {nom} » — aucun accord, quel que soit le
   nom), les adjectifs sont portés par les rôles, pas par les joueurs. Un
   pseudo n'a pas de genre ; la grammaire du narrateur non plus.
2. **Dans un prompt, l'accord suit le rôle, jamais la personne.** Le prompt
   parle à « la Voyante », à « la Sorcière » : les rôles ont un genre, le
   costume grammatical va avec. C'est la seule place où l'accord est permis.
3. **Les compteurs ne sont pas dans la bouche du narrateur.** Numéros de nuit
   et de jour, minuteries, décomptes de voix : c'est l'affiche, en mono — pas
   la phrase. Le narrateur dit « la nuit tombe », l'écran dit « nuit 3 ».

### Les variables

Le client résout les modèles de phrase avec ce qu'il sait — les pseudos de la
session, les noms de rôles du skin lui-même :

| Variable | Ce qu'elle vaut |
|---|---|
| `{nom}` | le pseudo d'un joueur désigné par l'évènement |
| `{victime}` | la victime désignée par la meute (prompt de la Sorcière) |
| `{cible}` | la cible d'un tir |
| `{ancien}` | le joueur que le contexte désigne en second : celui que le Salvateur protégeait hier, le capitaine défunt, ou le second amoureux du récit |
| `{role}` | le nom **traduit** du rôle — jamais l'identifiant (R2) |
| `{n}` | un numéro de bloc dans la nuit racontée |
| `{noms}` | une liste de pseudos, mise en forme par le client : les votants désignés par le Bouc émissaire (R94) |

### Les rôles

| `RoleId` | Nom affiché | Description de carte |
|---|---|---|
| `villageois` | Villageois·e | Pas de pouvoir. Votre arme, c'est votre voix au vote du jour — et votre flair. |
| `loup` | Loup-garou | Chaque nuit, la meute dévore un habitant. Le jour, vous vous tenez sur la place comme les autres. |
| `voyante` | la Voyante | Chaque nuit, sondez un vivant : son rôle s'inscrit dans votre carnet, nuit après nuit. |
| `sorciere` | la Sorcière | Deux potions, une seule fois chacune : la vie pour la victime des loups, la mort pour qui vous voulez. |
| `chasseur` | le Chasseur | En tombant, vous pouvez abattre le joueur de votre choix — votre dernière balle. *(La carte ne dit pas quand la balle est possible : selon la mort, la table en décide — D1.)* |
| `cupidon` | Cupidon | La première nuit seulement, liez deux vivants d'un même destin : si l'un meurt, l'autre le suit. |
| `salvateur` | le Salvateur | Chaque nuit, votre bouclier protège un habitant des loups — jamais le même deux nuits de suite, et le poison passe toujours. |
| `idiot` | l'Idiot du village | Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais. |
| `ancien` | l'Ancien | Vous avez la peau dure : la première attaque de la meute ne vous tue pas, la seconde si. Et si le village vous tue de sa main, il peut perdre ses pouvoirs avec vous. *(« peut » : la rancune est une option de table — R92, D13.)* |
| `corbeau` | le Corbeau | Chaque nuit, désignez un vivant : au vote du jour, deux voix pèseront d'office contre ce vivant. La marque est annoncée, jamais sa main. |
| `bouc` | le Bouc émissaire | Si le vote du village finit à égalité, c'est vous qui payez pour tous. Votre dernier mot : désigner qui votera le lendemain. |
| `petiteFille` | la Petite Fille | Pendant que la meute choisit sa proie, vous entrouvrez les yeux : vous voyez combien de loups visent chaque habitant — jamais lesquels. |
| `loupBlanc` | le Loup Blanc | Vous chassez avec la meute, qui vous prend pour l'un des siens. Une nuit sur deux, vous pouvez dévorer un loup. Vous ne gagnez que seul. |

Le Loup Blanc n'a ce nom que sur sa propre carte : ses complices le voient
en `loup` (R96) — le skin n'a rien à cacher, la vue l'a déjà fait. Sa carte
porte la teinte de la meute, son camp d'origine.

La carte du Chasseur est le seul texte qui marche sur des œufs : promettre le
tir « à votre mort » serait mentir quand le poison étouffe (D1, défaut). La
phrase annonce le pouvoir ; la table connaît ses limites. Même prudence pour
toute description : elle décrit ce que le moteur fait, pas ce que l'ambiance
aimerait.

### Les phrases du narrateur — les évènements

Un évènement part à tous les sièges et ne porte jamais un secret (**R87**) :
les phrases ci-dessous ne disent donc que ce que l'évènement dit. Quand
plusieurs morts tombent d'un bloc à l'aube, le client récite une phrase par
mort, dans l'ordre du tableau `deaths`.

**`debut`**

> La table est dressée à Thiercelieux. Que la partie commence.

**`phase`** — une phrase par `PhaseKind` :

| Phase | Phrase |
|---|---|
| `revelation` | Les cartes sont distribuées, face contre table. À vous de les retourner. |
| `nuit` (étape `principale`) | La nuit tombe sur Thiercelieux. Le village s'endort. |
| `nuit` (étape `loupBlanc`) | La nuit se poursuit. |
| `nuit` (étape `sorciere`) | La nuit se poursuit. |
| `chasseur` | Le Chasseur rend l'âme, la main sur la gâchette. La partie attend son dernier geste. |
| `succession` | Le capitaine est tombé : le brassard attend une main. |
| `bouc` | Le Bouc émissaire rend l'âme. Son dernier mot peut désigner qui votera demain. |
| `election` | Le village se choisit un capitaine. |
| `jour` | Le jour se lève sur Thiercelieux. Le village délibère. |
| `fin` | La dernière carte est posée sur la place. |

Deux mots d'explication sur l'étape `sorciere`. L'évènement `phase` la porte à
tous, et la composition de la partie est publique : dire « la Sorcière consulte
ses potions » ne trahirait donc rien. Le narrateur s'en abstient quand même —
l'étape est un fait d'architecture, pas un fait de récit, et le village qui
dort n'a pas à savoir où en est la nuit. Phrase plate, par choix. Même
chose pour l'étape `loupBlanc` (R97) : elle se tient les nuits paires, Loup
Blanc mort compris, et le narrateur ne la souligne pas davantage.

**`morts`** — une phrase par cause, un suffixe si le rôle est révélé :

| `DeathCause` | Phrase |
|---|---|
| `loups` | La meute a dévoré {nom}. |
| `poison` | Le poison a emporté {nom}. |
| `vote` | Le village a exécuté {nom}. |
| `chasseur` | La balle du Chasseur a atteint {nom}. |
| `chagrin` | Le chagrin a eu raison de {nom}. |

Si `role` n'est pas `null` (l'option `revelerRoles`, ou une révélation que le
jeu impose, R46), la phrase reçoit son suffixe :

> — c'était {role}.

« La meute a dévoré Marcel — c'était la Voyante. » Si `role` est `null`, rien :
la carte reste face contre table, et le narrateur n'insiste pas. Le silence
n'est pas un mensonge.

**`aube-paisible`**

> Personne n'est mort cette nuit. Le village se réveille entier.

**`grace`**

> La corde s'est détendue à temps : {nom} est l'Idiot du village. La grâce est
> accordée — et le droit de vote perdu.

**`vote`** — le dépouillement du jour :

| Cas | Phrase |
|---|---|
| un condamné | Les voix sont comptées : la potence est pour {nom}. |
| personne (égalité, abstentions) | Les voix sont comptées : personne ne montera à la potence. |

**`capitaine`** — l'évènement de la charge :

| Cas | Phrase |
|---|---|
| `from` nul (élection) | {nom} prend le brassard : sa voix comptera double. |
| `from` désigné (succession) | Le brassard de {ancien} passe à {nom} : la voix double passe avec. |

**`tir`** — le dernier geste du Chasseur :

| Cas | Phrase |
|---|---|
| cible atteinte | Le Chasseur lâche sa dernière balle : elle emporte {cible}. |
| `target` nul | Le Chasseur a emporté sa balle. |

La seconde phrase est celle du moteur, reprise telle quelle — « il emporte sa
balle » (`game.ts`) était déjà la bonne formule.

**`rancune`** — l'Ancien tué de la main du village (R92), dit après les morts :

> Le village a tué son propre Ancien, {nom} : tous les pouvoirs du village
> s'éteignent.

**`corbeau`** — la marque, à l'aube, après les morts (R93). L'évènement ne
porte que la cible : la phrase ne peut pas nommer la main, et ne le fait pas.

> Le Corbeau a désigné {nom} : au vote du jour, deux voix sont déjà comptées.

**`bouc`** — l'égalité retombe sur le Bouc émissaire (R94), dit entre le
dépouillement (« personne ne montera à la potence ») et la mort :

> Les voix se partagent, la place ne tranche pas : c'est {nom}, le Bouc
> émissaire, qui paie pour tous.

**`votants`** — le dernier mot du Bouc :

| Cas | Phrase |
|---|---|
| `seats` désignés | Dernier mot du Bouc émissaire : demain, seuls voteront {noms}. |
| `seats` nul (il s'est tu) | Le Bouc émissaire s'est tu : demain, tout le village votera. |

L'Ancien qui encaisse la meute (R91) n'a pas de phrase : aucun évènement ne
le dit, l'aube est paisible — il n'apparaît qu'au récit final.

**`fin`** — les verdicts, un par `Winner` :

| `Winner` | Verdict |
|---|---|
| `village` | Le village a triomphé : plus un loup ne rôde autour de Thiercelieux. |
| `loups` | La meute a pris Thiercelieux. Le village ne répond plus. |
| `amoureux` | Les deux amoureux restent seuls au monde : la partie est à eux. |
| `loupBlanc` | Le Loup Blanc se tient seul sur la place déserte : il a dévoré jusqu'à sa propre meute. |
| `personne` | Il ne reste personne pour raconter cette histoire. |

### Les prompts

Le prompt parle au siège concerné, à lui seul. Les variantes suivent les
champs du `Prompt` du moteur — elles existent parce que le moteur les rend,
pas par goût :

| Prompt | Texte |
|---|---|
| `pret` | Découvrez votre carte. Quand vous savez qui vous êtes, confirmez. |
| `cupidon` | Désignez deux vivants, vous compris : leurs destins seront liés — l'un meurt, l'autre le suit. |
| `proteger` | Choisissez qui dormira sous votre bouclier cette nuit. |
| `proteger`, `forbidden` désigné | {ancien} dormait sous votre bouclier hier : pas deux nuits de suite — choisissez une autre maison. |
| `sonder` | Sondez un vivant, jamais vous : son rôle s'inscrit dans votre carnet. |
| `devorer` | La meute a faim. Désignez un habitant à dévorer — ou laissez le village dormir. |
| `sorciere`, victime désignée | La meute a désigné sa victime : {victime}. Sauvez-la avec votre potion de vie, ou laissez-la partir — et votre potion de mort peut frapper un autre vivant. |
| `sorciere`, sans victime | La meute n'a dévoré personne cette nuit. Votre potion de mort peut encore frapper — ou vous ne faites rien. |
| `sorciere`, la victime est vous et la table l'interdit | C'est vous que la meute a désignée. La table interdit la potion de vie sur soi : le poison, lui, reste. |
| `tirer` | Votre dernière balle : abattez un vivant — ou tirez en l'air. |
| `successeur` | Dernier ordre : désignez qui portera le brassard. |
| `voter`, `election` vraie | Élisez votre capitaine — un vivant, vous compris — ou abstenez-vous. |
| `voter`, `election` fausse | Désignez qui montera à la potence — un autre vivant que vous. L'abstention est permise, et votre vote peut changer tant que la phase court. |
| `marquer` | Désignez un vivant, vous compris : au vote du jour, deux voix pèseront d'office contre ce vivant — ou ne marquez personne. La marque sera annoncée, jamais votre main. |
| `trahir` | La meute dort. Dévorez l'un de ses loups — ou épargnez-la cette nuit. |
| `designerVotants` | Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont au vote. |

La Petite Fille n'a pas de prompt (R95) : son espionnage est un champ de
vue, pas une consigne — l'écran le montre, aucun texte ne l'appelle.

Chaque texte est calé sur ce que le moteur permet, au mot près : l'élection
autorise le vote pour soi (R56), le vote du jour l'interdit (R60) ; seul le
vote peut « changer tant que la phase court » (R60) — le prompt de la Voyante
ne le promet pas ; l'abstention existe chez la meute (R40) comme au village.
La Sorcière vouvoyée au féminin applique la règle d'accord : c'est « la
Sorcière » que le prompt regarde.

### Les canaux

| `ChatChannel` | Libellé | Teinte (design.md, section 3) |
|---|---|---|
| `village` | Le village | `--lanterne` |
| `loups` | La meute | `--sang` |
| `amoureux` | Le serment | `--serment` |
| `morts` | L'au-delà | `--lune` |

Le libellé ne fait qu'habiller l'onglet : qui lit, qui écrit, quand — tout est
mécanique (R75–R78). Le skin nomme la pièce, jamais les droits d'entrée.

### Les suggestions

Le moteur rend les compositions dans un ordre fixe — la référence, une chasse
(un loup de plus), un village outillé (tous les rôles éligibles) — et le skin
les nomme (R23). Par position : la première est toujours la référence, et avec
les seuils actuels les trois passent toujours le filtre de jouabilité de R13
(vérifié de 6 à 18 joueurs) ; si les seuils bougent un jour, les noms suivront
l'ordre reçu, jamais une nature supposée.

| Position | Nom | Une ligne d'ambiance |
|---|---|---|
| 1 | La référence | L'équilibre du jeu, calculé pour cette table. |
| 2 | La chasse | Un loup de plus : la meute a les dents longues. |
| 3 | Le village outillé | Tous les rôles possibles à cette table : le village a des cartes en main. |

### La nuit racontée

Une fois la partie finie, le `log` part à tous (R88) et le récit se déroule
nuit par nuit, secrets compris — « la récompense de la partie perdue, et
l'écran qui prouve le système de skins ». Deux titres de bloc :

| Bloc | Titre |
|---|---|
| nuit | Nuit {n} |
| jour | Jour {n} |

Puis une phrase par ligne de log, dans la voix du narrateur :

| `LogEntry` | Phrase |
|---|---|
| `amoureux` | Cupidon a lié {nom} et {ancien} d'un même destin. |
| `protection` | Le Salvateur a veillé sur {nom}. |
| `voyance` | La Voyante a sondé {nom} : {role}. |
| `loups`, cible désignée | La meute a désigné {nom}. |
| `loups`, cible nulle | La meute n'a désigné personne. |
| `sauvetage` | La potion de vie a sauvé {nom}. |
| `poison` | La potion de mort a emporté {nom}. |
| `mort` | *(reprend la phrase de la cause de la table `morts`, avec le suffixe de rôle si le rôle était révélé)* |
| `grace` | Le vote a épargné {nom} : l'Idiot du village ne vote plus jamais. |
| `capitaine` | {nom} a reçu le brassard. |
| `tir`, cible atteinte | Le Chasseur a abattu {nom}. |
| `tir`, cible nulle | Le Chasseur a emporté sa balle. |
| `vote`, condamné | Le village a condamné {nom} à la potence. |
| `vote`, personne | Le village n'a condamné personne. |
| `resistance` | La meute a attaqué {nom} : l'Ancien a tenu bon. |
| `rancune` | En tuant {nom}, son Ancien, le village a perdu ses pouvoirs. |
| `corbeau` | Le Corbeau a marqué {nom}. |
| `bouc` | L'égalité est retombée sur {nom}, le Bouc émissaire. |
| `votants`, désignés | Le Bouc émissaire a désigné les votants du lendemain : {noms}. |
| `votants`, nul | Le Bouc émissaire n'a désigné personne. |
| `loupBlanc`, cible | Le Loup Blanc a dévoré {nom}, un loup de sa propre meute. |
| `loupBlanc`, nulle | Le Loup Blanc a épargné la meute. |

La ligne `amoureux` lie deux sièges : le modèle utilise `{nom}` pour le
premier et `{ancien}` pour le second — le récit étant le seul endroit où deux
noms se posent dans une même phrase, le client les résout tous les deux.

Le récit dit tout ce que le log dit — protections, voyances, victimes,
grâces, tirs, votes — et rien de plus : c'est le log qui parle, le skin qui
récite.

## 3. Shiganshina — le second habit

**Esquisse.** Le mapping est celui de [`refs/design.md`](refs/design.md),
« ébauche, à affiner avec un connaisseur de l'univers » ; rien dans cette
section n'engage encore la moindre ligne de code.

À Thiercelieux, on cherche des loups-garous parmi les villageois. En skin
`shiganshina`, le district de Shiganshina boucle ses Portes le soir : parmi
ses habitants se cachent des Titans — des humains qui sortent de leur peau la
nuit venue et dévorent. Le jour, on compte les survivants, on délibère, on
livre un suspect à l'extérieur. Mêmes états, mêmes tests, autre histoire.

### Le jour et la nuit, traduits

Les Titans n'ont pas de « nuit » au sens de Thiercelieux — et le skin n'a pas
besoin d'en inventer une autre : il **renomme le crépuscule**. La mécanique,
elle, ne bouge pas d'un pixel : la phase `nuit` reste l'étape où le camp qui
chasse frappe, la phase `jour` celle où le village vote.

| Vocabulaire Thiercelieux | Ce qu'il devient |
|---|---|
| « la nuit tombe sur le village » | « les Portes se ferment » — le district s'enferme, et c'est à l'intérieur que le Titan caché sort de sa peau |
| « le jour se lève » | « les Portes s'ouvrent » — on relève les disparus, on délibère |
| « déchiré par les loups » | « dévoré par un Titan » |
| l'aube paisible | « une nuit sans assaut » |
| le hurlement de l'atelier | un cri de Titan (D10 l'a déjà promis) |

Le mot « nuit » peut rester où l'écran le réclame (minuteries, « nuit 3 ») :
dans l'univers aussi, les assauts ont lieu la nuit. Mais le narrateur de
Shiganshina ne connaît ni la lune, ni la meute, ni la potence : il parle de
Portes, d'assauts, de lames, de sérum. La palette et les symboles gravés
suivent — la lune de Thiercelieux n'a rien à faire sur les remparts.

### Les rôles

| `RoleId` (moteur) | Skin Shiganshina | L'esprit |
|---|---|---|
| `villageois` | Habitant·e du district | pas de pouvoir, une voix à l'assemblée |
| `loup` | Titan | la peau qui bout, la nuit venue |
| `voyante` | l'Éclaireuse | le bataillon d'exploration sonde sous la peau |
| `sorciere` | la Scientifique | deux sérums, pas deux potions |
| `chasseur` | le Caporal | une dernière lame en tombant |
| `cupidon` | Ymir | lie deux destins d'un pacte |
| `salvateur` | la Sentinelle | veille chaque nuit sur l'un des siens |
| `idiot` | la Goinfre | graciée, la bouche pleine, muette au vote |
| `ancien` | le Vétéran | le vieux de la Garnison, qui a survécu à tant d'assauts |
| `corbeau` | le Brigadier | la Brigade spéciale désigne ses suspects sans signer |
| `bouc` | l'Eldien | le monde entier fait porter la faute aux Eldiens |
| `petiteFille` | la Recrue | tapie sur le chemin de ronde, elle compte les Titans |
| `loupBlanc` | le Titan Mâchoire | le Titan qui dévore les autres Titans (son gravé : deux mâchoires) |

Les phrases de la v2 suivent les mêmes miroirs : « Le district a abattu son
propre Vétéran, {nom} : tous les régiments perdent leurs pouvoirs. » ; « La
Brigade a désigné {nom} : à l'assemblée, deux voix sont déjà comptées. » ;
« Le Titan Mâchoire se tient seul sur les remparts : il a dévoré jusqu'aux
siens. » Le détail vit dans `packages/client/src/skins/shiganshina.ts`.

### Les canaux

| `ChatChannel` | Libellé proposé |
|---|---|
| `village` | Le district |
| `loups` | Les Titans |
| `amoureux` | Le pacte |
| `morts` | Les Chemins |

« Les Chemins » pour l'au-delà : dans l'univers, les sujets d'Ymir se
rejoignent au-delà de la mort par les chemins — un au-delà qui parle aux
spectateurs, comme la lune parlait aux morts de Thiercelieux.

### Les compositions suggérées

| Position | Nom proposé | Une ligne d'ambiance |
|---|---|---|
| 1 | La garnison | La garnison tient le district : l'équilibre, calculé pour cette table. |
| 2 | L'irruption | Un Titan de plus : les Portes ne tiendront pas toutes seules. |
| 3 | Toutes les lames | Tous les régiments réunis : le district a réponse à tout. |

### Le narrateur — un exemple par évènement

L'esprit, pas l'intégralité : chaque phrase suivante est à la place exacte de
sa consœur de Thiercelieux — mêmes variables, mêmes cas, même silence sur les
rôles non révélés.

| Évènement | Phrase |
|---|---|
| `debut` | Les Portes de Shiganshina se referment. Découvrez qui vous êtes. |
| `phase` — `nuit` | Les Portes se ferment. Shiganshina retient son souffle. |
| `phase` — `jour` | Les Portes s'ouvrent sur le district. L'assemblée siège. |
| `morts`, cause `loups` | Un Titan a dévoré {nom}. |
| `morts`, cause `poison` | Le sérum de la Scientifique a emporté {nom}. |
| `morts`, cause `vote` | Le district a livré {nom} aux Titans. |
| `morts`, cause `chasseur` | La lame du Caporal a atteint {nom}. |
| `morts`, cause `chagrin` | Le pacte brisé a eu raison de {nom}. |
| `aube-paisible` | Les Portes s'ouvrent : une nuit sans assaut, tout le monde est là. |
| `grace` | Le district allait livrer {nom} aux Titans — mais c'est la Goinfre. La bouche pleine, elle ne vote plus. |
| `vote`, condamné | Les voix sont comptées : {nom} passera les Portes. |
| `capitaine`, élu | {nom} prend le commandement du district. |
| `tir`, cible atteinte | De sa dernière force, le Caporal a planté sa lame dans {cible}. |
| `tir`, cible nulle | Le Caporal a rendu sa lame au fourreau. |
| `fin`, `village` | Plus une trace de Titan entre les murs : Shiganshina tient encore. |
| `fin`, `loups` | Les Titans ont franchi les Portes. Shiganshina ne répond plus. |
| `fin`, `amoureux` | Deux amoureux restent seuls dans un district debout : la partie est à eux. |
| `fin`, `personne` | Il ne reste personne pour fermer les Portes. |

Et deux prompts, pour donner la main :

| Prompt | Texte |
|---|---|
| `devorer` | La peau bout. Sortez, et dévorez un habitant — ou épargnez le district ce soir. |
| `sonder` | Les yeux de l'Éclaireuse : observez un habitant — vous verrez son vrai visage. |

### Les limites

Ce que Shiganshina **ne change pas**, c'est tout le reste :

- **aucune mécanique** — les mêmes états, les mêmes tests ; la carte de
  l'Éclaireuse répond au même prompt `sonder` que celle de la Voyante (D6) ;
- **aucune durée** — l'assaut dure `tempsNuit` secondes comme la nuit ;
- **aucun secret** — le narrateur ne dit que ce que les évènements disent
  (R87) : le district ignore qui a la peau qui bout, jusqu'au récit final ;
- **aucun identifiant brut** — `loup`, `sorciere` ne s'affichent jamais
  (R2) : Shiganshina dit « Titan », « la Scientifique ».

Le moteur, lui, ne sait même pas que cet univers existe : il transporte la
chaîne `shiganshina`, et c'est tout.

## 4. Les règles d'or

Cinq règles, sans exception ni clause de style.

1. **Jamais un identifiant mécanique à l'écran (R2).** Ni `voyante`, ni
   `loups`, ni `aube-paisible`. Les clés du skin reprennent les identifiants
   du moteur — c'est la seule place où ils existent — mais aucune valeur
   affichée ne les contient. Un skin incomplet est **refusé** par le registre
   client : mieux vaut le repli que `villageois` affiché en clair.
2. **Le narrateur ne dit que ce que l'évènement dit (R87).** Pas
   d'invention, pas d'insinuation, pas de compte à rebours dans la phrase.
   Un rôle non révélé est un silence, pas un « rôle caché » ; une étape de
   nuit n'est pas une annonce publique ; une cause de mort dit ce qui est
   arrivé, jamais qui l'a voulu.
3. **Un prompt ne promet que ce que le moteur permet.** Le prompt du jour
   n'offre pas de vote pour soi (R60) ; celui de l'élection le peut (R56) ;
   seul le vote « peut changer tant que la phase court » (R60) ; la carte du
   Chasseur ne promet pas un tir après le poison (D1). Toute divergence entre
   un texte et une règle est un bug du texte.
4. **Un skin inconnu retombe sur thiercelieux (R12).** Le moteur valide la
   forme de l'identifiant ; le client valide l'existence. Une partie dont le
   skin manque habite Thiercelieux — silencieusement, sans bannière
   d'erreur : la partie n'a pas à s'arrêter pour un habit absent.
5. **Le skin ne change ni la mécanique, ni les durées, ni les vues, ni les
   secrets, ni l'équilibrage (D6, R88).** Il repeint la pièce et lui donne
   une voix ; les murs porteurs — un accent par camp, une encre neutre pour
   le narrateur, des contrastes mesurés — restent debout.

## 5. Le format de fichier — proposition

**Proposition, rien de plus** : le client n'existe pas, et ce format n'engage
que ce document. Un skin serait un dossier — `packages/client/src/skins/<id>/`
(design.md, section 4) : les textes dans un JSON embarqué, les tokens de
palette à côté, l'art et l'atelier sonore autour. Un objet par skin, clé
identifiant, valeurs en français ; les clés qui nomment une mécanique
reprennent l'identifiant du moteur, les clés éditoriales sont libres.

```json
{
  "id": "thiercelieux",
  "univers": "Les Loups-Garous de Thiercelieux",
  "charge": "le capitaine",
  "roles": {
    "villageois": { "nom": "Villageois·e", "description": "…" },
    "loup":       { "nom": "Loup-garou",  "description": "…" }
  },
  "narrateur": {
    "debut": "…",
    "phases": {
      "revelation": "…",
      "nuit": { "principale": "…", "sorciere": "…" },
      "chasseur": "…", "succession": "…", "election": "…", "jour": "…", "fin": "…"
    },
    "morts": {
      "causes": { "loups": "…", "poison": "…", "vote": "…", "chasseur": "…", "chagrin": "…" },
      "roleRevele": "— c'était {role}."
    },
    "aubePaisible": "…",
    "grace": "…",
    "vote": { "condamne": "…", "personne": "…" },
    "capitaine": { "elu": "…", "successeur": "…" },
    "tir": { "atteint": "…", "enLair": "…" },
    "fin": { "village": "…", "loups": "…", "amoureux": "…", "personne": "…" }
  },
  "prompts": {
    "pret": "…",
    "cupidon": "…",
    "proteger": { "base": "…", "interdit": "…" },
    "sonder": "…",
    "devorer": "…",
    "sorciere": { "victime": "…", "sansVictime": "…", "soiMemeInterdit": "…" },
    "tirer": "…",
    "successeur": "…",
    "voter": { "election": "…", "jour": "…" }
  },
  "canaux": { "village": "Le village", "loups": "La meute", "amoureux": "Le serment", "morts": "L'au-delà" },
  "suggestions": [
    { "nom": "La référence", "note": "…" },
    { "nom": "La chasse",    "note": "…" },
    { "nom": "Le village outillé", "note": "…" }
  ],
  "recit": {
    "nuit": "Nuit {n}", "jour": "Jour {n}",
    "lignes": { "amoureux": "…", "protection": "…", "voyance": "…", "loups": { "cible": "…", "personne": "…" }, "sauvetage": "…", "poison": "…", "mort": "— comme la cause —", "grace": "…", "capitaine": "…", "tir": { "cible": "…", "personne": "…" }, "vote": { "condamne": "…", "personne": "…" } }
  }
}
```

Autour du dossier, un registre — un module TypeScript qui liste les skins
connus et sert de garde-fous (design.md : « tout `RoleId` du moteur doit avoir
sa traduction, tout `DeathCause` sa phrase ») :

- `skinConnu(id)` — l'entrée du registre, ou `thiercelieux` (règle d'or n° 4) ;
- un test de complétude parcourt `ROLES`, `DeathCause`, `Winner`,
  `ChatChannel`, les `Prompt` et les `PhaseKind` du moteur et exige leur
  pendant dans chaque skin — un test qui échoue vaut mieux qu'un identifiant
  affiché.

Le moteur, lui, ne sait toujours pas que le registre existe. C'était la
condition de tout le reste.
