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
  `salvateur`, `idiot`, et ceux de la v2 : `ancien`, `corbeau`, `bouc`,
  `petiteFille`, `loupBlanc`) ne s'affichent jamais tels quels : le skin les
  traduit.
- **R3** — Camp d'origine : le loup — et le Loup Blanc — appartiennent aux
  loups, tous les autres au village. Seuls les amoureux peuvent changer de
  camp ; seul le Loup Blanc gagne contre son camp (R98).
- **R4** — Les rôles spéciaux — voyante, sorciere, chasseur, cupidon,
  salvateur, idiot — et les rôles optionnels de la v2 (R90) existent au plus
  en un exemplaire par partie.

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
  `ancienRancunier` (R92) — toutes booléennes, toutes filtrées par R10.

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

- **R30** — `createGame` mélange la composition avec le `Rng` injecté et
  attribue un rôle par siège.
- **R31** — La partie s'ouvre en **révélation** : chacun découvre sa carte et
  confirme. La phase dure 25 s (`REVEAL_MS`).
- **R32** — Le temps écoulé ouvre la nuit,confirmation ou pas : qui n'a pas
  confirmé ne retarde rien.
- **R33** — La nuit N précède le jour N. Le compteur avance au soir de
  chaque vote ; la première nuit ne le fait pas bouger, qu'elle suive la
  révélation ou l'élection pré-nocturne.

## 5. La nuit

- **R35** — L'**étape principale** : Cupidon (première nuit seulement),
  Salvateur, Voyante et loups jouent **en même temps**.
- **R36** — La Sorcière joue seule après, si elle fait partie de la
  distribution — morte comprise : son étape fantôme dure un temps
  imprévisible, tiré entre 5 et 10 s.
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

- **R75** — Quatre canaux : `village`, `loups`, `amoureux`, `morts`. Le
  canal des loups existe toujours ; le canal village dépend de l'option
  `chat`.
- **R76** — Peuvent écrire : au village, les vivants de jour (jour,
  élection, chasseur, succession) ; chez les loups, les loups la nuit ; pour
  les amoureux, le couple tant que l'un et l'autre vivent ; chez les morts,
  les morts en tout temps.
- **R77** — Chaque siège ne lit que ses canaux. Les morts lisent tout si
  `mortsVoientTout` ; à la fin de la partie, plus rien n'est caché.
- **R78** — Un message : 280 caractères au plus après normalisation des
  espaces, jamais vide ; le fil garde les 300 derniers — l'état voyage à
  chaque action. Les messages sont **numérotés par canal** : rien dans la vue
  d'un siège — ni trou de numérotation, ni évènement — ne trahit l'activité
  des canaux qu'il ne lit pas.

## 12. Le temps

- **R80** — Le moteur ne lit jamais l'horloge : il rend la durée d'une phase
  (`phaseBudgetMs`), le serveur arme la minuterie et clôt la phase par
  `timeoutPhase`, en présentant le numéro de la phase qui a armé la
  minuterie — une minuterie en retard ne clôt rien du tout. L'échéance
  n'appartient qu'au siège qui doit agir : celle des autres est un secret.
- **R81** — Qui n'a pas agi n'agit pas : un loup muet ne vote pour personne,
  un village silencieux n'exécute personne.
- **R82** — Durées : révélation 25 s ; tir du Chasseur et succession 30 s ;
  élection 90 s ; nuit et étape de la Sorcière `tempsNuit` ; jour
  `tempsJour` ; fin de partie, aucune.

## 13. Déterminisme, reprise et secrets

- **R85** — Aucune fonction du moteur ne modifie l'état reçu : elle rend un
  nouvel état, cloné en profondeur.
- **R86** — Aucune lecture d'horloge, aucun `Math.random` : tout aléa passe
  par le `Rng` injecté. Une partie se rejoue à l'identique.
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

- **R90** — Les rôles optionnels — `ancien`, `corbeau`, `bouc`,
  `petiteFille`, `loupBlanc` (`OPTIONAL_ROLES`) — se cochent comme les rôles
  spéciaux, un exemplaire au plus (R4), et n'entrent **jamais** dans la
  référence (R20) ni dans les suggestions (R23). Pour la borne de R13, le
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
  (R36) ; la Petite Fille ne voit plus rien ; un Chasseur dont le tir n'est
  pas encore parti n'en a plus ; l'Idiot condamné n'est plus gracié ; le
  Bouc émissaire meurt toujours de l'égalité, mais ne désigne plus. Ce qui a
  été joué reste joué : sondages, bouclier, marque, potions de la nuit
  même, grâce déjà accordée, amoureux déjà liés. La meute, le Loup Blanc et
  le capitaine ne perdent rien. Mort sous les crocs ou de chagrin, l'Ancien
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
