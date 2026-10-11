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

## Questions ouvertes

| Sujet | La question |
|---|---|
| Robots et rôles cachés | Que faire d'un joueur qui ne revient pas après le délai de grâce, quand son rôle est secret ? Un robot de loup qui dévore est un aveu ; le pattern collection (`reprise-et-robots.md`) ne s'applique pas tel quel. |
| Le fil sur mobile | Tiroir qui pousse la place, ou colonne permanente compacte sous la place ? À décider devant le client réel. |
| Les minuteries | Barre toujours visible, ou mention discrète qui ne s'agite que dans les trente dernières secondes ? À décider devant le client réel. |
| Rôles suivants | La boîte en a d'autres (`refs/roles.md`, « Rôles envisagés pour plus tard ») : lesquels méritent la v2 ? |
