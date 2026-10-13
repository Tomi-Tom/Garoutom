# Garoutom — Règles de référence

Document normatif. Toute règle porte un identifiant `Rn` **citable par les
tests** (`it('R41 — une égalité entre loups se tranche au sort', ...)`). En cas
de désaccord entre le code et ce document, c'est le code qui a tort.

Les décisions de fond — pourquoi telle règle, quel écart avec la règle
officielle 2016 — vivent dans [`DECISIONS.md`](DECISIONS.md) et
[`refs/roles.md`](refs/roles.md). Ici, seulement ce qui doit être vrai.

## 1. Le cadre

- **R1** — Une partie compte de **6 à 18 joueurs** (`MIN_PLAYERS`,
  `MAX_PLAYERS`). Chaque joueur occupe un **siège** (`seat`), numéroté de `0`
  à `n-1` : le siège est l'identité du joueur pour le moteur.
- **R2** — Le moteur ne connaît que des mécaniques. Les identifiants de rôles
  (`villageois`, `loup`, `voyante`, `sorciere`, `chasseur`, `cupidon`,
  `salvateur`, `idiot`, ceux de la v2 : `ancien`, `corbeau`, `bouc`,
  `petiteFille`, `loupBlanc`, et ceux de la v3 : `villageois2`, `renard`,
  `ours`, `voleur`, `chienLoup`, `enfantSauvage`, `soeurs`, `freres`) ne
  s'affichent jamais tels quels : le skin les traduit.
- **R3** — Camp d'origine : le loup — et le Loup Blanc — appartiennent aux
  loups, tous les autres au village. Seuls les amoureux peuvent changer de
  camp ; seul le Loup Blanc gagne contre son camp (R98).
- **R4** — Les rôles spéciaux — voyante, sorciere, chasseur, cupidon,
  salvateur, idiot — et les rôles optionnels de la v2 (R90) existent au plus
  en un exemplaire par partie. Seule exception, ouverte par la v3 : les
  fratries (R113) — l'hôte coche l'id **une fois**, et la composition porte
  deux cartes pour les Deux Sœurs, trois pour les Trois Frères.

## 2. La table et les options

- **R10** — Tout ce qui vient du réseau passe par `sanitizeOptions` : une
  valeur invalide ou hors borne retombe sur le défaut, sans discussion.
- **R11** — Les minuteries sont bornées : nuit 15–120 s, jour 60–900 s.
- **R12** — Le moteur transporte le skin sans le lire : un identifiant
  `[a-z0-9-]{1,32}`, sinon le skin par défaut.
- **R13** — Une composition est jouable si : au moins un loup, jamais autant
  de loups que d'autres joueurs, jamais plus de rôles que de places libres.
- **R14** — Options de table : `capitaine` (élection ou pas), `chat` (fil du
  village), `revelerRoles` (rôle d'un mort montré), `mortsVoientTout`,
  `chasseurEmpoisonne`, `sorciereSeSauve`, `capitaineAvantNuit1`,
  `ancienRancunier` (R92), `abandon` (R101) — toutes booléennes, toutes
  filtrées par R10.

## 3. La composition

- **R20** — La composition de référence, pour `auto: true` : 2 loups jusqu'à
  8 joueurs, 3 jusqu'à 12, 4 jusqu'à 16, 5 au-delà ; voyante et sorcière
  toujours, chasseur dès 8, cupidon dès 10, salvateur dès 11, idiot dès 12.
- **R21** — Sinon, l'hôte compose librement : autant de loups, quels rôles
  spéciaux — dans les limites de R13.
- **R22** — Le générateur aléatoire tire dans des bornes cohérentes : le
  nombre de loups à ±1 de la référence, jamais moins de deux ; voyante et
  sorcière toujours ; les autres rôles éligibles au hasard ; toujours au
  moins deux villageois simples.
- **R23** — Les suggestions dépendent du nombre de joueurs : la référence,
  une chasse (un loup de plus, dans la borne), un village outillé (tous les
  rôles éligibles). Le moteur fournit les compositions, le skin les nomme.

## 4. Distribution et révélation

- **R30** — `createGame` mélange la composition avec l'aléa de la graine —
  ou du `Rng` fourni, qui revient au même — et attribue un rôle par siège ;
  l'aléa de la suite part de là, rangé dans l'état (R104).
- **R31** — La partie s'ouvre en **révélation** : chacun découvre sa carte et
  confirme. La phase dure 25 s (`REVEAL_MS`).
- **R32** — Le temps écoulé ouvre la nuit,confirmation ou pas : qui n'a pas
  confirmé ne retarde rien.
- **R33** — La nuit N précède le jour N. Le compteur avance au soir de
  chaque vote ; la première nuit ne le fait pas bouger, qu'elle suive la
  révélation, la phase du Voleur (R110) ou l'élection pré-nocturne.

## 5. La nuit

- **R35** — L'**étape principale** : Cupidon (première nuit seulement),
  Salvateur, Voyante et loups jouent **en même temps**.
- **R36** — La Sorcière joue seule après, si elle fait partie de la
  distribution — morte comprise : son étape fantôme dure un temps
  imprévisible, tiré entre 5 et 10 s par le moteur à l'entrée de l'étape et
  rangé avec elle (R104).
- **R37** — Cupidon désigne deux vivants distincts, lui-même éventuellement,
  la première nuit seulement.
- **R38** — Le Salvateur protège un vivant, jamais le même deux nuits de
  suite. Son bouclier n'arrête pas le poison.
- **R39** — La Voyante sonde un vivant, jamais elle-même. Chaque rôle appris
  s'accumule, à elle seule.
- **R40** — Un loup vote pour un vivant qui n'est pas un loup, ou
  s'abstient ; il peut changer d'avis tant que l'étape court.
- **R41** — À la clôture de l'étape : seules comptent les voix des loups
  vivants ; la majorité l'emporte ; **une égalité se tranche au sort** ;
  aucune voix, aucune victime.
- **R42** — La Sorcière dispose d'une potion de vie et d'une potion de mort,
  une seule fois chacune dans la partie. La vie ne sert que sur la victime
  des loups ; la mort sur n'importe quel vivant, elle-même comprise.
- **R43** — La potion de vie peut servir sur la Sorcière elle-même ; l'option
  `sorciereSeSauve: false` l'interdit (D2).
- **R44** — La potion de vie est consommée même si la victime était déjà
  protégée : la Sorcière ne peut pas le savoir. Le poison n'est contrarié
  par rien.

## 6. L'aube

- **R45** — À l'aube : la victime des loups meurt, sauf si protégée ou
  sauvée ; la cible du poison meurt. Les morts sont annoncés d'un bloc, avec
  leur cause. Aucune mort : « aube paisible ».
- **R46** — Le rôle d'un mort est montré si `revelerRoles` — avec deux
  révélations que l'option ne retient pas, parce que le jeu les impose de
  lui-même : le Chasseur, que son tir désigne (R65), et l'Idiot, que sa grâce
  désigne (R62). La v2 en ajoute deux : l'Ancien dont la rancune frappe
  (R92), le Bouc émissaire qui paie l'égalité (R94).
- **R47** — Quand un amoureux meurt, l'autre meurt de chagrin dans la
  foulée ; le chagrin s'enchaîne de couple en couple — clause qui ne se
  déclenche qu'à partir de deux couples, et la v1 n'en connaît qu'un :
  Cupidon ne joue qu'à la première nuit (R37), la paire est unique.
- **R48** — Le Chasseur mort laisse un déclencheur de tir — sauf pour une
  mort par poison ou par chagrin. L'option `chasseurEmpoisonne: true` le
  laisse tirer pour **toute** mort (D1).
- **R49** — Le capitaine mort laisse un déclencheur de succession.
- **R50** — Les déclencheurs se traitent l'un après l'autre, et une victoire
  ne se regarde qu'une fois la chaîne vide : un tir peut tout renverser.

## 7. Le capitaine

- **R55** — Le capitaine est élu au **matin du jour 1** par défaut. L'option
  `capitaineAvantNuit1` le fait élire **avant la première nuit** ; l'option
  `capitaine: false` supprime la charge (D3).
- **R56** — L'élection : chaque vivant vote pour un vivant ou s'abstient ;
  la majorité l'emporte ; une égalité se tranche au sort ; aucune voix, pas
  de capitaine — et l'élection ne revient pas.
- **R57** — La voix du capitaine compte **double au vote du village**, pas à
  l'élection.
- **R58** — À sa mort, le capitaine désigne un successeur vivant ; au temps
  écoulé, le successeur est pris au hasard parmi les vivants.

## 8. Le jour et le vote

- **R60** — Le jour, chaque vivant qui peut voter — l'Idiot gracié ne vote
  plus — vote pour un vivant autre que lui-même, ou s'abstient. On peut
  changer son vote tant que la phase court.
- **R61** — À la clôture : voix pondérées (capitaine ×2), **majorité
  stricte** ; une égalité ou une absence de voix n'exécute personne.
- **R62** — L'Idiot non encore gracié, condamné par le vote, est **gracié** :
  son rôle est montré, il reste en vie, il ne vote plus jamais.
- **R63** — Tout autre condamné meurt, rôle montré selon `revelerRoles` ;
  ses déclencheurs s'enchaînent.

## 9. Le tir du Chasseur

- **R65** — Quand son déclencheur arrive (R48), le Chasseur abat un vivant
  autre que lui-même — ou tire en l'air.
- **R66** — Il a 30 s (`TRIGGER_MS`) ; sinon il emporte sa balle.
- **R67** — La victime du tir meurt, et ses propres déclencheurs
  s'enchaînent : un tir peut en provoquer un autre.

## 10. Les amoureux et la victoire

- **R70** — Un couple d'amoureux de camps opposés, deux derniers survivants,
  gagne la partie à eux deux. Tout le monde mort en même temps : la partie
  n'est à personne.
- **R71** — Le village gagne quand il ne reste plus un loup ; les loups
  gagnent quand il ne reste qu'eux.
- **R72** — Les issues — `village`, `loups`, `amoureux`, `personne`, et
  `loupBlanc` quand il est de la partie (R98) — ne s'évaluent que
  déclencheurs vidés (R50).

## 11. Le fil de discussion

- **R75** — Cinq canaux : `village`, `loups`, `amoureux`, `fratrie`, `morts`.
  Le canal des loups existe toujours ; le canal village dépend de l'option
  `chat` ; le canal fratrie n'existe que si une fratrie est de la
  distribution (R113, R114).
- **R76** — Peuvent écrire : au village, les vivants de jour (jour,
  élection, chasseur, succession) ; chez les loups, les loups la nuit ; pour
  les amoureux, le couple tant que l'un et l'autre vivent ; chez les morts,
  les morts en tout temps.
- **R77** — Chaque siège ne lit que ses canaux. Les morts lisent tout si
  `mortsVoientTout` ; à la fin de la partie, plus rien n'est caché.
- **R78** — Un message : 280 points de code au plus après nettoyage (R103),
  jamais vide ; le fil garde les **100 derniers de chaque canal** — l'état
  voyage à chaque action —, et la vue d'un siège, les 100 derniers de chaque
  canal qu'il lit. Les messages sont **numérotés par canal** : rien dans la
  vue d'un siège — ni trou de numérotation, ni premier numéro visible, ni
  évènement — ne trahit l'activité des canaux qu'il ne lit pas.

## 12. Le temps

- **R80** — Le moteur ne lit jamais l'horloge : il rend la durée d'une phase
  (`phaseBudgetMs`, pure : la demander ne change rien), le serveur arme la
  minuterie et clôt la phase par `timeoutPhase`, en présentant le numéro de
  la phase qui a armé la minuterie — une minuterie en retard ne clôt rien du
  tout. L'échéance n'appartient qu'au siège qui doit agir : celle des autres
  est un secret.
- **R81** — Qui n'a pas agi n'agit pas : un loup muet ne vote pour personne,
  un village silencieux n'exécute personne.
- **R82** — Durées : révélation 25 s ; phase du Voleur 25 s (`VOLEUR_MS`) ;
  tir du Chasseur et succession 30 s ; élection 90 s ; nuit et étape de la
  Sorcière `tempsNuit` ; jour `tempsJour` ; fin de partie, aucune.

## 13. Déterminisme, reprise et secrets

- **R85** — Aucune fonction du moteur ne modifie l'état reçu : elle rend un
  nouvel état, cloné en profondeur.
- **R86** — Aucune lecture d'horloge, aucun `Math.random` : tout aléa passe
  par le générateur à graine — celui de l'état en partie (R104). Une partie
  se rejoue à l'identique.
- **R87** — Les évènements partent à tous les sièges : aucun ne porte un
  secret. Ce qui ne peut pas être dit à tout le monde ne quitte pas l'état.
- **R88** — La vue d'un siège est `viewFor(state, seat)`, et c'est le seul
  filtre : silence par défaut, un champ ne s'ajoute qu'avec une raison. Le
  récapitulatif complet — la nuit racontée — n'apparaît qu'une fois la
  partie finie.

## 14. Les rôles optionnels (v2)

Cinq cartons de la boîte, ouverts le 11 octobre 2026 (D12 à D16). Aucun
n'entre dans la composition de référence : une table qui ne les coche pas
joue exactement la partie de la v1, état pour état.

- **R90** — Les rôles optionnels — ceux de la v2 (`OPTIONAL_ROLES` :
  `ancien`, `corbeau`, `bouc`, `petiteFille`, `loupBlanc`), puis ceux de la
  v3 (`OPTIONAL_ROLES_V3`, livrés vague par vague, D26) — se cochent comme les
  rôles spéciaux, un exemplaire au plus (R4), et n'entrent **jamais** dans la
  référence (R20) ni dans les suggestions (R23). Le générateur aléatoire, lui,
  ne tire que ceux de la v2, et sur demande (R100) : un rôle v3 ne s'obtient
  que coché, par l'hôte seul. Pour la borne de R13, le
  Loup Blanc compte parmi les loups.
- **R91** — L'**Ancien** survit à la première attaque de la meute qui l'aurait
  tué ; la seconde le tue. Une attaque arrêtée par le bouclier du Salvateur
  ou par la potion de vie ne compte pas — la potion part quand même (R44).
  Le sursis est un secret : l'aube est paisible, aucun évènement ne le dit.
  Le poison, le vote, le tir le tuent du premier coup.
- **R92** — L'Ancien tué **de la main du village** — vote, tir du Chasseur,
  poison — emporte les pouvoirs du village, si l'option `ancienRancunier`
  le veut (défaut : oui). Sa carte se retourne quelle que soit l'option
  (R46) et l'évènement `rancune` l'annonce, après les morts. Dès cet
  instant : la Voyante, le Salvateur, Cupidon, le Corbeau, la Sorcière
  n'ont plus de consigne — l'étape de la Sorcière se tient, fantôme
  (R36) ; la Petite Fille ne voit plus rien ; le Renard ne flaire plus
  (R107) ; un Chasseur dont le tir n'est
  pas encore parti n'en a plus ; l'Idiot condamné n'est plus gracié ; le
  Bouc émissaire meurt toujours de l'égalité, mais ne désigne plus. Ce qui a
  été joué reste joué : sondages, bouclier, marque, potions de la nuit
  même, grâce déjà accordée, amoureux déjà liés. La meute, le Loup Blanc,
  le capitaine et le Montreur d'Ours ne perdent rien — la grogne de
  l'ourson est un instinct, pas un pouvoir du village (R108, D30). Mort
  sous les crocs ou de chagrin, l'Ancien
  ne se venge pas.
- **R93** — Le **Corbeau** joue pendant l'étape principale : il marque un
  vivant, lui compris, ou personne. À l'aube, après les morts, l'évènement
  `corbeau` annonce le siège marqué — jamais le Corbeau. Au vote du jour, ce
  siège porte **deux voix d'office**, ajoutées au décompte ; il vote comme
  les autres. Une marque sur un mort de la nuit ne s'annonce pas et ne
  compte pas ; toute marque s'éteint à la clôture du vote.
- **R94** — Le **Bouc émissaire** : quand le vote du village finit sur une
  égalité — au moins deux sièges en tête, avec au moins une voix — et qu'il
  vit, c'est lui qui meurt, de la main du village, carte retournée
  (évènement `bouc`, puis `morts`) ; le vote, lui, n'a condamné personne.
  Sans Bouc vivant, R61 tient. Son déclencheur passe avant les autres : 30 s
  (`TRIGGER_MS`) pour désigner **au moins un vivant** — ceux-là seuls
  voteront au prochain vote du village (évènement `votants`, public). Au
  temps écoulé, il s'est tu : tout le monde votera. La désignation s'éteint
  à la clôture de ce vote.
- **R95** — La **Petite Fille** n'a pas de consigne : son silence est celui
  d'un villageois. Pendant l'étape principale, et seulement elle, sa vue
  porte `espionnage` : pour chaque cible, le nombre de loups vivants qui la
  visent — jamais lesquels. Elle ne risque pas d'être surprise.
- **R96** — Le **Loup Blanc** est de la meute : il vote la nuit avec elle
  (sa voix compte, R41), lit et écrit son canal, figure dans `pack`. Ses
  complices le voient en loup ordinaire ; lui seul — et la Voyante qui le
  sonde, et les morts qui voient tout — le connaît pour ce qu'il est. La
  meute ne peut pas le viser.
- **R97** — Les **nuits paires**, si le Loup Blanc fait partie de la
  distribution — mort compris —, une étape `loupBlanc` suit l'étape
  principale et précède la Sorcière. Vivant, il peut dévorer un autre loup
  vivant, ou personne ; mort, l'étape dure un temps fantôme, comme celle de
  la Sorcière (R36). Sa proie meurt à l'aube, cause `loups` ; le bouclier du
  Salvateur l'arrête, la Sorcière n'en sait rien.
- **R98** — Les victoires se comptent par **faction** : le village gagne
  quand ni loup ni Loup Blanc ne vivent plus ; la meute, quand il ne reste
  que des loups ordinaires ; le Loup Blanc, quand il reste seul. S'il ne
  reste que la meute, Loup Blanc compris, la partie continue. Un couple
  d'amoureux de deux factions différentes — Loup Blanc et loup compris —,
  derniers survivants, gagne à deux (R70).
- **R99** — Le **huis clos** — il ne reste que la meute, Loup Blanc vivant
  compris — a une borne : au bout de trois nuits (`HUIS_CLOS_NUITS`)
  ouvertes sans une mort, au moment d'en ouvrir une quatrième, la partie se
  clôt sur la victoire de la meute. Toute mort remet le compte à zéro.
- **R100** — Le générateur aléatoire tire les rôles optionnels **sur
  demande** (`randomComposition(n, rng, { optionnels: true })`) : rien sous
  dix joueurs, un au plus jusqu'à treize, deux au plus ensuite ; l'Ancien,
  le Corbeau, le Bouc et la Petite Fille dès dix joueurs, le Loup Blanc dès
  douze ; toujours deux villageois simples, toujours dans la borne de R13.
  Sans la demande, R22 tient à l'identique, graine pour graine.

## 15. La robustesse (D17 à D24)

Ouverte le 11 octobre 2026 ([`ROBUSTESSE.md`](ROBUSTESSE.md)). Une table où
personne ne part, n'écrit de travers ni ne recharge le serveur joue
exactement la partie d'avant, graine pour graine.

- **R101** — La **mort d'abandon** (D18). Un siège vivant que le serveur dit
  absent depuis `ABANDON_MS` (5 min, hors pause) meurt d'abandon à la clôture
  de phase **par l'échéance** qui suit — le serveur passe la liste à
  `timeoutPhase(state, seq, { abandons })` ; jamais au milieu d'une phase,
  jamais au fil d'une action. Les partis meurent d'abord, d'un bloc
  (évènement `morts`, cause `abandon`, rôle montré selon `revelerRoles`) ;
  la phase se clôt ensuite entre vivants : la voix d'un parti, une voix ou
  une proie qui le vise, une flèche de Cupidon vers lui ne comptent plus.
  **Aucun pouvoir** ne part : ni tir — même sous `chasseurEmpoisonne` —, ni
  rancune de l'Ancien, ni dernier mot du Bouc, ni carte retournée d'office.
  Le chagrin de l'amoureux suit (R47), avec ses propres déclencheurs. Un
  capitaine parti lègue sa charge à un vivant tiré au sort, sans phase de
  succession (évènement `capitaine`). Si ces morts décident la partie —
  déclencheurs vidés (R50) —, la nuit s'achève aussitôt ; le jour, la
  victoire se regarde après le dépouillement, comme d'habitude. Un siège
  mort, inconnu ou mal formé est ignoré ; sans l'option `abandon`, la liste
  entière l'est.
- **R102** — Une action venue du réseau se **relit** avant d'être crue
  (`parseAction`, D23) : schéma strict par verbe — sièges entiers sûrs,
  bornés par la table ; booléens stricts ; `null` explicite là où le moteur
  l'entend, jamais un champ absent ; canal dans l'énumération de R75 ; texte
  d'au plus 2 000 unités avant traitement ; votants du Bouc en liste de
  sièges distincts, les doublons fondus. L'objet rendu est reconstruit :
  aucune clé en trop. Un refus est une `IllegalActionError` de code
  `action`. `applyAction` relit aussi ce qu'on lui passe, et le siège de
  l'auteur doit être un entier de la table (code `seat`).
- **R103** — Un texte libre — un message, un pseudo — se **nettoie** : forme
  NFKC, espaces pliés, caractères de contrôle, de format (marques
  bidirectionnelles, zéro-largeur…) et demi-paires orphelines retirés, rives
  rognées, longueur comptée en points de code et jamais coupée au milieu
  d'une paire. Un message en garde 280 (R78), un pseudo 16 (`cleanName`) ;
  ce qui ne dit plus rien est refusé — `empty` au fil, `name` au pseudo.
- **R104** — **L'aléa voyage avec l'état** (D20). Le générateur — un entier
  de 32 bits, `GameState.rng` — avance à chaque tirage du moteur, et de
  lui seul : une partie sérialisée, rangée, relue puis reprise rend
  exactement les mêmes états qu'une partie jamais interrompue. Les durées
  fantômes (R36, R97) se tirent à l'entrée de l'étape et se rangent dans la
  phase ; `phaseBudgetMs` ne tire rien. Un `Rng` passé à `applyAction` ou à
  `timeoutPhase` par un appelant d'avant n'est plus lu. L'aléa ne quitte
  jamais l'état (R88).

## 16. Les rôles de la v3 — première vague (R105 à R108)

Ouverte le 13 octobre 2026 : trois cartons de l'extension Personnages
(D26, D29 à D31), cochés par l'hôte seul (R90, jamais au générateur). Une
table qui n'en coche aucun rejoue la v2 état pour état, graine pour graine.

- **R105** — **Le voisinage des sièges.** L'ordre des sièges est l'ordre du
  cercle : le client pose les rangs en partant du bas et en tournant dans le
  sens des aiguilles d'une montre, le joueur local au rang 0. Un joueur assis
  face au centre a donc son **siège +1 à sa gauche** et son siège −1 à sa
  droite, modulo n. Les voisins d'un siège sont `(seat − 1 + n) mod n` et
  `(seat + 1) mod n` — une fonction pure (`voisinsDe`), dérivée de la seule
  liste des joueurs : aucun champ d'état, aucun champ de vue. Le voisinage
  est une géométrie publique, pas un secret : qui en a besoin le recalcule.
  C'est la convention de toute la v3 — le « premier loup à gauche » du
  Chevalier s'y conformera.
- **R106** — Le **Villageois-Villageois** (`villageois2`) n'a ni vie bonus,
  ni verbe, ni consigne : la carte ne vit que par la certitude publique que
  son porteur est un villageois innocent. Cette certification se lit dans
  toutes les vues : tout siège — le porteur compris — voit `villageois`
  comme rôle du porteur (D31, le recto-verso officiel : le porteur
  lui-même ne sait pas). Seule la fin de partie, où plus rien n'est caché
  (R77), dit `villageois2` — le récapitulatif seul.
- **R107** — Le **Renard** flaire chaque nuit, pendant l'étape principale —
  en parallèle, comme le Corbeau —, s'il a encore son pouvoir. Il désigne un
  joueur central vivant, lui compris (D29), ou personne : l'usage est
  facultatif. Son trio : le central et ses deux voisins **vivants** — un
  voisin mort n'est jamais remplacé, le trio peut être plus petit. Un loup —
  camp d'origine — dans le trio : le signe lui revient en privé, le pouvoir
  demeure. Aucun loup : le pouvoir est perdu **à vie**, et les sièges du trio
  restent des innocents appris. Les trios s'accumulent dans son carnet
  (`renardSavoirs`), pour lui seul. Aucun évènement public : le sondage, le
  signe et la perte ne quittent jamais l'état (R87). La rancune de l'Ancien
  éteint son pouvoir (R92).
- **R108** — Le **Montreur d'Ours** ne joue jamais. Chaque matin où il vit,
  après l'annonce des morts, son évènement public tombe : `ours`
  `{ seat, grogne }`. Grogne si un loup — camp d'origine — est l'un de ses
  deux voisins **vivants** ; un voisin mort ne compte pas. L'aube paisible
  reçoit son évènement comme les autres : `grogne: false` est une
  information, pas un silence. Mort — la nuit qui vient de finir comprise
  —, il ne grogne pas : sa mort est publique, pas de grogne posthume, pas
  d'étape fantôme. La rancune de l'Ancien n'y change rien : la grogne est
  celle d'un animal, pas un pouvoir du village (D30).

## 17. Les rôles de la v3 — deuxième vague (R109 à R114)

Ouverte le 13 octobre 2026 : cinq cartons de plus — le Voleur (jeu de base),
le Chien-Loup, l'Enfant Sauvage, les Deux Sœurs et les Trois Frères
(extension Personnages) — et les deux fondations qu'ils réclament : le camp
effectif et le canal des fratries. Toujours cochés par l'hôte seul (R90,
D26) ; une table qui n'en coche aucun rejoue la v2 état pour état, graine
pour graine.

- **R109** — **Le camp effectif.** Chaque siège porte un camp d'origine
  (R3) et un camp **effectif**. L'état ne porte le second que si un rôle l'a
  écrit — le Chien-Loup rangé (R111), l'Enfant Sauvage transformé (R112) —
  et, absent, il vaut le premier. **Tout ce qui lit un camp lit le camp
  effectif** : la victoire (R71, R98), la meute — ses voix, son canal, ses
  vues —, le huis clos (R99), le trio du Renard (R107), la grogne de
  l'Ours (R108), les cibles que la meute et le Loup Blanc n'ont pas le
  droit de viser. Le Loup Blanc reste à part : son camp est aux loups, sa
  faction à lui seul (R98). La carte d'un siège — celle que la Voyante
  sonde, celle qu'un mort retourne — dit son **rôle courant**, masqué comme
  toute carte (R106) : le Chien-Loup rangé garde sa carte, l'Enfant devenu
  loup montre `loup` (D27). Un couple dont l'un change de camp se relit :
  la victoire des amoureux regarde les factions effectives — un amoureux
  changé de camp peut rendre le couple mixte.
- **R110** — Le **Voleur** joue avant la révélation, dans une phase à lui :
  `{ kind: 'voleur'; seat; cartes: [RoleId, RoleId] }`, 25 s (R82). Le paquet
  compte la composition **plus deux villageois simples** ; le siège du
  Voleur se tire au sort (D44), les cartes restantes se mélangent, et les
  deux qui ne se distribuent pas sont les siennes. Il en prend une —
  `voler { carte: 0 | 1 }` — ou s'abstient : la carte prise devient la
  sienne, un rôle comme un autre ; l'autre — ou les deux, s'il s'abstient —
  sort du jeu, face cachée. **Obligation de prendre une carte si les deux
  sont des loups** ; sinon il reste Voleur, sans pouvoir. Au temps écoulé
  sans action (R81) : la première carte si l'obligation l'exige, sinon il
  reste Voleur (D44b). La clôture enchaîne la révélation ; la première nuit
  qui suit — élection pré-nocturne comprise — ne fait pas bouger le compteur
  (R33). Aucun évènement ne dit son choix : la composition est publique,
  les cartes ne le sont jamais. Les cartes de fratrie (R113) ne tombent
  jamais au talon du Voleur — elles sont distribuées, par construction
  (D44). Pendant sa phase, la vue se tait comme la table : **aucune carte
  n'est retournée** — le Voleur échange sans regarder la sienne, et personne
  n'a encore vu la sienne —, pas de rôle, pas de meute, pas de fratrie
  dans quelque vue que ce soit ; tout se découvre à la révélation (R31,
  D46).
- **R111** — Le **Chien-Loup** joue la première nuit seulement, pendant
  l'étape principale, en parallèle : il se range définitivement —
  `seRanger { camp: 'village' | 'loups' }`. Rangé côté loups, il est un loup
  : camp effectif aux loups (R109), voix à la meute, canal et vues du
  pack — où il passe pour un loup ordinaire, comme le Loup Blanc —, et la
  meute ne peut pas plus le dévorer qu'un autre loup. Sa carte à lui reste
  `chienLoup` : la Voyante qui le sonde la voit, sa mort la montre (D27).
  Rangé côté village, il ne voit jamais rien : un villageois sans consigne.
  Au temps écoulé sans choix (R81), c'est ce dernier cas qui tient. Pour la
  borne de R13, il compte parmi les loups dès le salon — l'hôte ne sait pas
  de quel côté il tombera (D32). Aucun évènement ne dit son choix.
- **R112** — L'**Enfant Sauvage** joue la première nuit seulement, pendant
  l'étape principale, en parallèle : il désigne un modèle —
  `designerModele { target }`, un vivant, lui compris, jamais informé.
  Le modèle meurt — toute cause, l'abandon compris — et l'Enfant devient un
  loup : son **camp effectif passe aux loups immédiatement** (R109) — la
  victoire, l'Ours, le Renard le lisent tout de suite —, sa carte devient
  `loup` — la Voyante qui le sonde la voit, sa mort la montre (D27) —, mais
  la meute ne l'accueille qu'au `startNight` suivant : vues du pack, canal
  des loups et consigne `devorer` attendent la nuit qui vient, fidèle au
  « se réveille avec la meute dès la nuit suivante » (D33). Sans modèle au
  temps écoulé (R81), il ne se transforme jamais. La transformation ne
  produit **aucun évènement** : le secret est absolu, seul le récapitulatif
  de fin le raconte. Un modèle infecté (V5) survit : pas de transformation
  tant qu'il vit.
- **R113** — Les **Deux Sœurs** et les **Trois Frères** n'ont ni verbe, ni
  consigne, ni pouvoir : ils se connaissent. L'hôte coche l'id une fois
  (R4) ; la composition porte deux cartes — ou trois ; les Sœurs se cochent
  dès dix joueurs, les Frères dès douze, et les deux groupes peuvent
  coexister, chacun avec le sien. À la distribution, les sièges d'un même
  groupe se rangent dans `fratries` ; chaque membre connaît les siens dès la
  révélation — dans sa vue, jamais dans un évènement. Les cartes de fratrie
  sont **distribuées** : elles ne tombent jamais au talon du Voleur
  (R110, D44). La rancune de l'Ancien n'y change rien : la connaissance
  n'est pas un pouvoir (R92).
- **R114** — Le **canal fratrie** est permanent, de jour comme de nuit,
  entre les **vivants** d'un même groupe : le précédent des amoureux, non
  le « réveils de temps en temps » du livret (D28). Un mort le quitte — il
  n'y écrit plus, il n'y lit plus ; `mortsVoientTout` le lui rend en
  lecture (R77). Cinquième canal de la table (R75) — et le seul qui se
  partage : quand Sœurs et Frères coexistent, **chaque groupe ne lit que
  ses messages** ; les messages portent leur groupe, la numérotation et la
  borne des cent sont celles du groupe, si bien que rien dans la vue d'un
  siège — ni le texte, ni les trous, ni le rabotnement — ne trahit
  l'activité d'une fratrie qui n'est pas la sienne (R78, D45). Une Sœur
  infectée (V5) garderait son groupe et son canal (D28b).
