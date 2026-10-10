# Design — l'identité de Garoutom

Document de référence pour la direction artistique, écrit en préproduction :
le client n'existe pas encore, et c'est le moment où l'identité se fixe le
moins cher. Le cadre commun est déjà accepté
([`conventions-collection.md`](conventions-collection.md)) : lien retour en haut
à gauche, bouton son en haut à droite, cibles ≥ 44 px, rien qui se coupe à
320 px, `prefers-reduced-motion`, contrastes mesurés. « Le cadre est commun,
l'intérieur est libre. » Ici, on meuble l'intérieur.

## Ce que la collection apprend à Garoutom

Le relevé fait dans les autres dépôts donne un patron remarquablement stable,
que Garoutom n'a aucune raison de fuir :

- **Un seul fichier CSS racine** (`styles.css`, `app.css`, `index.css`) qui
  déclare la matière, le lieu et l'heure en commentaire de tête, remplit les
  variables du cadre (`--arcade-encre`, `--arcade-fond`, `--arcade-trait`,
  `--arcade-accent`, `--arcade-fond-sur-accent`, définies dans
  `hub-mini-games/packages/arcade/src/arcade.css`), puis nomme sa palette par
  matière — souvent doublée d'une table jumelle TypeScript
  (`Lutom/packages/client/src/anim/tokens.ts`).
- **Un accent, deux valeurs** : « un accent ne s'emploie pas sur deux fonds :
  deux valeurs, une par fond » (Lutom, `styles.css`), contrastes verrouillés
  par un test dédié (`MastomMind/lib/contraste.test.ts` exige AA sur les deux
  fonds ; Wolfenstom a son `check:tint`).
- **Trois polices, jamais plus** : une identité (titres, « jamais dans une
  phrase » — règle de Lutom vérifiée par `anim/polices.test.ts`), un corps, un
  mono pour les chiffres tabulaires et les codes. En `@fontsource` avec
  sous-ensemble latin nommé (`@fontsource/oswald/latin-600.css` chez
  MastomMind, `@fontsource/zen-dots/latin-400.css` chez Rythmotom).
- **Quatre bruitages du cadre** (`clic`, `claque`, `cloche`,
  `verdict(gagne|perdu|neutre)`), puis un atelier propre sur le même `bus()`,
  où chaque bruit est « décrit par ce qu'il imite » — la carte qui claque
  (Belotom), la louche qui verse (Tartotom). Zéro fichier audio.
- **Des écrans connus** : accueil en `<DosDeBoite>` (`TBP-012`), fin en
  `<EcranFin>`, transition en `<Rideau>` (320 ms).

Le paysage des heures déjà prises, d'après
`Lutom/docs/refonte/synthese-collection.md` : la chaufferie à la lampe
(Wolfenstom), l'hippodrome dimanche quinze heures (Lutom), la dernière table
après la fermeture (Belotom), la borne d'écoute de minuit (Rythmotom), la
vitrine du soir (Tartotom), la salle d'écoute 1974 (MastomMind), le bar de
Corte (Bataillotom), le plateau à 20 h 05 (Motustom), la boîte ouverte un
dimanche de novembre (Puzzlotom), la coulée de nuit (Rafalotom). Il reste une
heure à Garoutom, et elle lui va comme un gant.

## 1. L'identité Thiercelieux — le skin par défaut

> **Choisi le 10 octobre 2026.** La palette, les polices, les symboles gravés
> et l'atelier sonore sont validés ; les questions restées ouvertes — le fil
> sur mobile, la présentation des minuteries — attendent le client réel, et
> sont suivies dans [`../DECISIONS.md`](../DECISIONS.md).

**La place du village, entre chien et loup.** La matière est le **carton
jauni des cartes à jouer** posé sur la pierre de la place ; la lumière est la
**lanterne d'un côté, la lune de l'autre** ; l'heure est **entre chien et
loup** — l'expression française qui nomme le crépuscule et donne son sujet au
jeu : on ne sait plus, dans la lumière qui baisse, ce qui est un chien et ce
qui est un loup. Deux voisins s'éclairent déjà d'une lampe (Belotom et son
feutre, Yamstom et son carnet) : Garoutom s'en distingue par le lieu — une
place extérieure, pas une pièce — et par la teinte dominante, **un bleu
nocturne**, qu'aucun jeu de la collection n'occupe.

### La palette (choisie)

| Nom | Hex | Rôle | Contraste sur `--nuit` |
|---|---|---|---|
| `--nuit` | `#131726` | le fond de tout l'écran, bleu-nocturne, jamais noir pur | — |
| `--nuit-creux` | `#0c0f19` | creux : tiroirs, champ de saisie, fond d'accent | — |
| `--nuit-relief` | `#1b2133` | panneaux, cartes face cachée, lignes de la table | — |
| `--papier` | `#ece3cd` | texte principal ; le recto des cartes | 14,0 : 1 (AAA) |
| `--papier-doux` | `#b0a68f` | texte secondaire, horodatages | 7,4 : 1 (AA) |
| `--lune` | `#aab4c8` | le narrateur, l'information neutre, le canal des morts | 8,6 : 1 (AA) |
| `--lanterne` | `#e6a852` | le village : actions, accent du jour, pastille « a voté » | 8,6 : 1 (AA) |
| `--sang` | `#dd5f52` | les loups : danger, morts, canal des loups — aplats et gros corps | 5,0 : 1 |
| `--sang-creux` | `#8c2f28` | aplat des fonds loups, bouton en position armée | — |
| `--serment` | `#cf8f96` | les amoureux : discret, rose passé | 6,8 : 1 (AA) |

Le raisonnement des contrastes, pour un jeu qui se joue le soir, sur un fond
sombre constant :

- **Le fond ne bouge jamais.** Nuit et jour partagent `--nuit` ; seul
  l'éclairage change (voir plus bas). Un basculement clair/sombre au fil des
  phases serait un clignotement de douze écrans dans une pièce éteinte.
- **Deux encres mesurées** : `--papier` porte tout ce qui se lit longtemps
  (cartes, fil du chat) à 14,0 : 1 ; `--papier-doux` ce qui se parcourt. C'est
  la leçon de Tartotom (« l'opacité ne sert jamais à nuancer du texte ») et de
  MastomMind (encres hiérarchisées `--ink-hi/mid/lo`).
- **Le sang n'est pas une erreur, c'est un camp.** À 5,0 : 1 sur `--nuit`, il
  passe AA partout ; on le réserve pourtant aux aplats et gros corps — un
  rouge qui court en petit texte fatigue l'œil du soir. Belotom fait déjà la
  distinction « cerise du jeu » / « rouge d'erreur ».
- **Chaque accent a sa version par fond**, comme Lutom : sur `--nuit-relief`,
  `--sang` retombe à 4,45 : 1, juste sous la barre AA — la table jumelle
  `anim/tokens.ts` prévoira donc deux valeurs par accent, et un
  `contraste.test.ts` les verrouillera AA sur les deux fonds, comme
  MastomMind.

Variables du cadre remplies :

```css
--arcade-encre: var(--papier-doux);
--arcade-fond: rgb(12 15 25 / 0.72);
--arcade-trait: color-mix(in srgb, var(--lune) 30%, transparent);
--arcade-accent: var(--lanterne);
--arcade-fond-sur-accent: var(--nuit-creux);
```

### Les polices (choisies)

| Emploi | Police | `@fontsource` | Usage |
|---|---|---|---|
| Identité | **Cormorant** 600/700 | `@fontsource/cormorant/latin-600.css`, `latin-700.css` | le nom du jeu, le verdict, le nom d'un rôle sur sa carte — jamais dans une phrase |
| Corps | **Alegreya Sans** 400/500/700 | `@fontsource/alegreya-sans/latin-400.css` (+500, 700) | tout le texte courant, le fil du chat, les boutons |
| Chiffres | **IBM Plex Mono** 400/500 | `@fontsource/ibm-plex-mono/latin-400.css` (+500) | minuteries, décomptes, code de salon — chiffres tabulaires |

Cormorant est une garalde de conte : le lion d'un titre sans devenir une
enseigne de fête foraine. Alegreya Sans est son sans-serif de la même fonderie
— le corps reste lisible en petit sur fond sombre. IBM Plex Mono n'est utilisé
par aucun jeu de la collection : le code de salon, dont « la fonction est de
se recopier, pas de s'afficher » (Lutom), gagne à être neuf. Sous-ensembles
latin nommés, vérifiés par un `polices.test.ts` comme chez Rythmotom.

### La nuit et le jour : un éclairage, pas un thème

Le fond reste `--nuit` en toute occasion ; ce qui change, c'est la lumière
posée dessus. Un attribut `data-heure="nuit|jour"` sur la racine fait varier
trois variables seulement : la nuit, l'UI s'éclaire à la lune (accent neutre
`--lune`, relief refroidi) ; le jour, à la lanterne (`--lanterne`, relief
réchauffé). La bascule passe par le `<Rideau>` du cadre (320 ms), qui devient
ici le coucher et le lever du jour — `prefers-reduced-motion` respecté. Le
jour n'est jamais « clair » : c'est la même nuit avec une fenêtre éclairée.

## 2. La cartographie des écrans

Le moteur (`packages/engine/src/types.ts`, `views.ts`) fixe la mécanique de
chaque écran ; le design n'a à décider que de l'ambiance et du son. Récapitulatif :

| Écran | Ce que dit le moteur | Son |
|---|---|---|
| Accueil | hors partie : pseudo, « Ouvrir une table · Rejoindre », code 4 lettres | `clic`, `claque` |
| Salon d'attente | sièges 6–18, options de l'hôte | `clic` |
| Révélation | phase `revelation`, prompt `pret` | `claque` (la carte se pose) |
| Nuit — le village qui dort | phase `nuit`, aucun prompt pour ce siège | hurlement (atelier) |
| Nuit — l'écran du rôle | prompts `cupidon`, `proteger`, `sonder`, `devorer`, `sorciere` | `clic` discret |
| Aube et morts | évènements `morts`, `aube-paisible`, `grace` | `cloche`, puis glas (atelier) |
| Élection du capitaine | phase `election`, prompt `voter` | `claque` |
| Jour — débat et vote | phase `jour`, prompt `voter`, `voted[]`, `yourVote` | `claque` au vote |
| Chasseur | phase `chasseur`, prompt `tirer` | `claque` grave |
| Succession | phase `succession`, prompt `successeur` | `clic` |
| Fin et récit | phase `fin`, `winner`, `log` | `verdict` |

### Accueil

Le dos de boîte `TBP-012` : la place vide, la lanterne posée au centre. Un
champ pseudo (il part dans la session, pas dans le moteur), puis « Ouvrir une
table · Rejoindre » et, sous le second, le code de salon — quatre lettres sur
`ABCDEFGHJKLMNPQRSTUVWXYZ`, en IBM Plex Mono.

### Salon d'attente

La table se remplit : chaque arrivée allume une fenêtre du village. La liste
des sièges (6 à 18, `MIN_PLAYERS`/`MAX_PLAYERS` dans `options.ts`), l'hôte
voit les options — composition, loups, rôles spéciaux, capitaine, chat,
révélation des rôles des morts, minuteries (`tempsNuit` 15–120 s,
`tempsJour` 60–900 s), et **le skin**. Détail utile : la composition choisie
est publique (`GameView.options` part à tous), c'est l'attribution qui est
secrète — le salon peut afficher « 2 loups · Voyante · Sorcière » sans rien
dévoiler.

### Révélation de carte

Le moment le plus intime du jeu : chacun seul avec sa carte. Face cachée au
centre, l'écran assombri autour, on la retourne à son rythme, on lit son rôle
(traduit par le skin), on confirme avec le prompt `pret` ; le retournement
respecte `prefers-reduced-motion`. Pas de « 4 joueurs prêts sur 8 » : le
moment n'a pas besoin d'un compteur pour être solennel. Son : la `claque` du
carton qui se pose.

### Nuit — le village qui dort

Pour les villageois et tous ceux que la nuit n'appelle pas. La nuit tombe
(rideau), le village s'éteint, et l'écran ne montre que cela : la place sous la
lune, le numéro de la nuit. **Règle d'or héritée de `views.ts`** — « la règle
par défaut est le silence » : jamais de « 3 joueurs n'ont pas encore joué ».
Savoir combien n'ont pas joué, c'est savoir combien de loups et de rôles
existent ; `pendingActors` est un calcul du serveur, et il y reste. Le village
qui dort ne compte rien. Son : un hurlement bref de l'atelier, une fois, à la
chute de la nuit.

### Nuit — l'écran du rôle

Quand `prompt` parle à ce siège, la lune se lève sur **sa** carte : un
rayon froid, l'icône du rôle, l'action.

- **Cupidon** (nuit 1 seulement) : désigner deux joueurs à lier. Flèche
  double, sourire maladroit.
- **Salvateur** : protéger quelqu'un ; sa cible de la veille (`forbidden`)
  est grisée — « pas deux nuits de suite la même personne ».
- **Voyante** : sonder ; son carnet (`inspections`) garde chaque nuit apprise,
  à elle seule.
- **Loups** : dévorer — et voir la meute : `pack.seats` et les votes de nuit
  de chacun en temps réel. Leur écran teinte le village de `--sang`, et le
  mini-fil du canal loups vit ici (section 3).
- **Sorcière** (étape `sorciere`, seule en scène) : la victime désignée est
  montrée, avec l'état de ses deux potions (`vie`, `mort`). Sauver, empoisonner,
  ou rendormir.

Le villageois qui n'a rien à faire voit le village dormir — c'est son écran,
à lui, et il est beau. Personne ne sait qui voit quoi.

### Aube et annonce des morts

L'évènement `phase` ramène le jour ; l'aube se lève sur le rideau, la cloche
du cadre sonne (la cloche « tombe à pic pour un village », disait déjà le
relevé). Puis le narrateur prend la parole — le skin la lui donne — et
énumère : évènement `morts` (avec sa cause, que le skin traduit en phrase),
`aube-paisible` (« personne n'est mort cette nuit »), ou `grace` (l'Idiot est
épargné : il survit, `canVote` passe à faux, son rôle est montré). Chaque mort
a sa carte posée sur la place, avec son rôle si la table a choisi de le
révéler. Son : le glas de l'atelier — deux partiels graves, comme une vraie
cloche, sur le modèle de la sonnerie du four de Tartotom.

### Élection du capitaine

Le premier jour, si l'option est levée : phase `election`, tous votent
(prompt `voter`, `election: true`), nul n'est éliminé — le plus voté prend le
brassard (évènement `capitaine`), sa voix comptera double. Visuellement, un
vote du jour sans potence : le dépouillement désigne un élu, et le brassard
apparaît sur son jeton.

### Jour — débat et vote

Le cœur visible du jeu, `tempsJour` par défaut 240 s. Trois zones : la place
(jetons des joueurs, pastilles « a voté » en `--lanterne`, son propre vote
`yourVote` surligné, l'Idiot gracié grisé), le fil du village (section 3), et
l'action — voter, changer d'avis tant que la phase court (le prompt reste
affiché après action, c'est prévu par le moteur), ou s'abstenir (`voter`
accepte `target: null`). La minuterie vit en haut, en IBM Plex Mono. Le
dépouillement (évènement `vote`, décompte complet et élu à la potence) est un
moment narré : les voix se posent une à une, la carte du condamné se retourne.

### Le tir du chasseur

Phase `chasseur` : le Chasseur vient de mourir, sa carte se retourne
complètement, et lui seul voit le prompt `tirer` — les autres savent que la
partie s'arrête sur lui. Un écran suspendu : la cible, ou le silence
(`target: null`, « il emporte sa balle », le moteur le journalise). Son : la
`claque` la plus grave de l'atelier, sèche.

### La succession du capitaine

Phase `succession` : le capitaine mort désigne son successeur (prompt
`successeur`), le brassard passe (évènement `capitaine` avec `from`). Court,
solennel, sans minuterie visible pour les autres.

### Fin de partie et la nuit racontée

Phase `fin`. L'écran de fin du cadre : le verdict (le camp du gagnant —
`village`, `loups`, `amoureux`, `personne` — traduit par le skin), le
`verdict` sonore du cadre à la couleur du camp de **ce siège**.

Puis **la nuit racontée** : `log` part à tous une fois la partie finie, et
tout s'y révèle — amoureux liés, protections, voyances, victimes, grâces,
tirs, votes. Le récit se déroule nuit par nuit, dans la voix du narrateur du
skin, secrets compris : c'est la récompense de la partie perdue, et l'écran
qui prouve le système de skins — le même `log` mécanique raconté par deux
narrateurs différents.

## 3. Le chat — la grosse brique neuve

Aucun jeu de la collection n'a de fil de discussion ; celui-ci est à Garoutom
ce que le feutre est à Belotom. Le moteur a déjà tout tranché côté secrets
(`readableChannels`, `speakableChannels`, `views.ts` et `game.ts`) : chaque
siège ne reçoit que les messages des canaux qu'il a le droit de lire.

### Les canaux

| Canal | Qui le lit | Qui peut y écrire, quand | Teinte |
|---|---|---|---|
| `village` | tous | les vivants, le jour (phases `jour`, `election`, `chasseur`, `succession`) ; tous à la fin | `--lanterne` |
| `loups` | les loups (et les morts voyant tout) | les loups, la nuit seulement | `--sang` |
| `amoureux` | le couple (et Cupidon, et les morts voyant tout) | les amoureux, tant que l'un et l'autre vivent | `--serment` |
| `morts` | les morts | les morts, en tout temps | `--lune` |

Les onglets du fil n'affichent **que les canaux lisibles par ce siège** : le
`GameView.chat` du serveur est déjà filtré, l'UI se contente de ne pas
inventer d'onglets vides. Personne ne voit un canal dont il n'est pas.

### Où vit le fil pendant le jour

- **Grand écran (≥ 1024 px)** : la place au centre, le fil en colonne droite
  (≈ 340 px, sur la margelle) — un lieu de la place, pas un utilitaire.
- **Petit écran (< 1024 px)** : le fil est un tiroir en bas — poignée ≥ 44 px,
  un tiers de hauteur ouvert, plein écran d'un geste. **Il pousse la place au
  lieu de la recouvrir** : la grille des joueurs se replie au-dessus, elle ne
  disparaît jamais sous le fil.

Règle de silence : **un message ne fait pas de bruit** — dix-huit joueurs,
chaque message biperait dix-sept fois. Un badge discret compte les non-lus
sur la poignée, la pastille ne clignote pas.

### Les canaux secrets

- **Les loups, la nuit** : le mini-fil vit dans l'écran de la meute, sous les
  votes — teinte `--sang`, ils voient les votes de chacun se poser à côté des
  mots. Le canal n'existe pour personne d'autre, pas même comme onglet.
- **Les amoureux** : la plus grande intimité du jeu. Onglet discret
  `--serment`, refermable d'un geste — le voisin du canapé ne doit lire
  « crois-moi » qu'à celui à qui c'est dit.
- **Les morts** : l'au-delà est teinté de `--lune` ; ils y commentent la
  partie avec tous les rôles sous les yeux (`mortsVoientTout`), d'un ton de
  spectateurs. S'ils voient tout, c'est que la partie est finie pour eux.

### Le vote reste lisible

La contrainte donnée par le moteur : les pastilles « a voté » (`voted`) sont
l'information du jour, et le fil est son bruit. Trois règles :

1. **Les pastilles vivent sur les jetons de la place, pas dans le fil.** Le
   fil ne peut donc pas les masquer — c'est construit, pas négocié.
2. **Le fil ne passe jamais devant la place** : tiroir qui pousse (mobile) ou
   colonne (grand écran), jamais de superposition.
3. **Une barre de vote épinglée au-dessus du fil** — « 7 sur 11 ont voté », en
   IBM Plex Mono — résume l'état sans lire la place. Un message ne fait ni
   son ni mouvement de la place : le vote ne se noie pas dans le débat.

## 4. Le système de skins — la frontière moteur/skin

Le moteur ne connaît « pas qu'il y a un village, une lune ou des loups »
(`types.ts`, commentaire de tête) : il connaît un camp qui chasse la nuit, un
camp qui vote le jour, des rôles qui ont un pouvoir. `options.skin` est une
chaîne qu'il transporte sans la lire, validée `[a-z0-9-]{1,32}` avec repli sur
`'thiercelieux'` (`options.ts` : « le client retombe sur le défaut s'il ne le
connaît pas »).

Les identifiants de rôles du moteur sont `'villageois'`, `'loup'`, `'voyante'`,
`'sorciere'`, `'chasseur'`, `'cupidon'`, `'salvateur'`, `'idiot'` — et « ils
ne s'affichent jamais tels quels, le skin les traduit » (`types.ts`). Une
partie Thiercelieux et la même en Shiganshina produisent exactement les mêmes
états ; c'est la seule façon de garder un équilibrage unique pour tous les
univers.

### Le contrat

| Reste au moteur (mécanique pure) | Fourni par le skin |
|---|---|
| `RoleId`, `Camp`, `Winner`, `DeathCause` — les identifiants stables | le nom affiché de chaque rôle, sa description, sa carte |
| phases, prompts, actions, votes, minuteries | la matière, le lieu, l'heure ; la palette (remplit `--arcade-*` et ses tokens) ; les polices |
| le filtrage des vues et des canaux (`viewFor`, `readableChannels`) | les textes du narrateur : phrases d'aube, phrases de mort par `DeathCause`, annonces de phase |
| le `log` mécanique de fin de partie | la voix qui le raconte, nuit par nuit — « la nuit racontée » |
| le protocole du chat (ids de canaux stables) | le libellé et la teinte de chaque canal |
| — | l'art (cartes, jetons, couverture `CoverArt` de l'arcade) et l'atelier sonore (le hurlement est un cri de Titan en skin Shiganshina) |

Côté client : un dossier par skin (`packages/client/src/skins/<id>/` : tokens,
textes, art), un registre qui sert de garde-fous — tout `RoleId` du moteur
doit avoir sa traduction, tout `DeathCause` sa phrase, sinon le client refuse
le skin plutôt que d'afficher un identifiant brut. Le moteur, lui, ne sait
même pas que le registre existe.

### Ébauche de mapping : Thiercelieux ↔ Shiganshina

Les huit rôles de la v1 (ébauche, à affiner avec un connaisseur de
l'univers) :

| `RoleId` (moteur) | Skin Thiercelieux | Skin Shiganshina (Attack on Titan) |
|---|---|---|
| `villageois` | Villageois·e | Habitant·e du district |
| `loup` | Loup-garou | Titan |
| `voyante` | la Voyante | l'Éclaireuse — le bataillon d'exploration sonde sous la peau |
| `sorciere` | la Sorcière | la Scientifique — deux sérums, pas deux potions |
| `chasseur` | le Chasseur | le Caporal — une dernière lame en tombant |
| `cupidon` | Cupidon | Ymir — lie deux destins d'un pacte |
| `salvateur` | le Salvateur | la Sentinelle — veille chaque nuit sur l'un des siens |
| `idiot` | l'Idiot du village | la Goinfre — graciée, la bouche pleine, muette au vote |

Lieux et narration : le village s'appelle Thiercelieux, ou Shiganshina ; « la
nuit tombe sur le village » devient « les Portes se ferment » ; « déchiré par
les loups » devient « dévoré par un Titan » ; l'aube paisible est « une nuit
sans assaut ». Le mécanisme sous les phrases — `DeathCause`, `NightStep`,
`Prompt` — ne bouge pas d'un pixel : les mêmes tests du moteur passent dans
tous les univers, et la carte de la Voyante comme celle de l'Éclaireuse
répondent au même prompt `sonder`.

## 5. Ce qui a été tranché, ce qui attend

Tranché le 10 octobre 2026 — le détail vit dans
[`../DECISIONS.md`](../DECISIONS.md) :

1. **La palette** — bleu nocturne `#131726`, la paire `--lanterne`/`--sang`.
2. **La police d'identité** — Cormorant.
3. **Les cartes de rôles** — typographie + symbole gravé en v1 ; l'art par
   rôle et par skin viendra ensuite, sans rien casser.
4. **L'atelier sonore** — hurlement et glas dès la v1, synthétisés en
   WebAudio sur `bus()`, zéro fichier.

Toujours ouvert, à décider devant le client réel :

5. **Le fil sur mobile.** Tiroir poussant (proposé) ou colonne permanente
   compacte sous la place ?
6. **Les minuteries.** Barre visible à tout instant, ou mention discrète qui
   ne s'agite que dans les trente dernières secondes ?
