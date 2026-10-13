# Caprices — spécification de la direction artistique

> **Statut : contrat de production, 11 octobre 2026.** Direction choisie par le
> propriétaire : C, « Caprices » (recherche-02, § C). Ce document est la seule
> référence des quatre designers qui dessinent en parallèle (lots F, C, E1, E2,
> § 7), puis de l'implémentation React/Tailwind. Il est **normatif** : « doit »
> et « interdit » ne se discutent pas sans revenir ici ; « peut » laisse la main.
>
> **Ce qu'il remplace.** Pour l'habit du skin `thiercelieux` : la palette D7
> (bleu nocturne), les polices D8 (Cormorant, Alegreya Sans, Plex Mono), le
> décor `Decor.tsx` et le dos de carte « rosace et lune ». D9 tient toujours
> (symbole gravé d'abord, illustration ensuite). Les textes de
> `skins/thiercelieux.ts` ne changent pas d'un mot : la spec y **ajoute** des
> légendes (§ 2.2, § 6).
>
> **Ce qu'il demande au propriétaire.** Un amendement au contrat D11 / SKINS.md
> (« le fond ne bouge pas entre la nuit et le jour ») : § 3.2. Tant qu'il n'est
> pas signé, le repli est décrit et dessiné (artboard `Jour-12-Cuivre`).
>
> **Fichier compagnon :** [`textures.svg`](textures.svg) — les `<defs>`
> exactes (hachures, grains, filtres, cartouches, glyphes) et leur planche de
> démonstration. On copie ses identifiants tels quels.

Sommaire : 1. Critique de la planche · 2. Le parti pris · 3. Tokens · 4. Matières ·
5. Composants · 6. Iconographie et légendes · 7. Écrans et lots · 8. Skin
Shiganshina · 9. Skin Gilets Jaunes · 10. Skin Far West · 11. Skin Pirates ·
12. Skin Open Space · 13. Art final · 14. Ce que l'implémentation change ·
Annexe : la liste anti-« IA ».

---

## 1. Critique de la planche actuelle (`C-Caprices.dc.html`)

### Ce qui est fort — à garder tel quel

1. **L'idée-mère : la nuit est une technique, pas une couleur.** Quatre paliers
   d'aquatinte au lieu d'un dégradé bleu, et la révélation comme un *brunissage*
   (gratter la lumière hors du noir). Personne ne fait ça ; c'est le cœur de la
   direction et la spec le pousse jusqu'au bout (§ 2.3, § 4.7).
2. **La voix des légendes.** « Ce qu'elle voit, nul ne le croit », « Il tire
   mieux mort que vivant », « Personne n'a voté plus fort que lui » : le ton
   Goya est trouvé du premier coup. Les cinq sont conservées mot pour mot (§ 6.1).
3. **Les cartouches par la forme** (écu, mordu, lacs, ovale vide) : c'est la
   grammaire Wolfwalkers traduite en gravure, et elle passe le test du
   daltonisme parce que le mot reste écrit dedans. Conservés, complétés (§ 5.3).
4. **La grammaire d'états de la Pl. VII** : jeton « moi » encadré d'un carré
   (la planche du joueur), « choisi » cerné de repères de visée, brassard
   « ×2 », règle « aucune trame sous un mot ». Juste ; c'est la base du § 5.1.
5. **La minuterie en crans** (une règle graduée de graveur) au lieu d'une barre
   lisse : propre à la matière, lisible, sans couleur. Conservée (§ 5.6).

### Ce qui est faible, générique ou illisible

6. **La sanguine trahit sa propre loi.** « Quand la sanguine paraît, quelqu'un a
   mordu » — mais les rousseurs du papier sont peintes en `#A23B24` (planche,
   l. 58) et un œil rouge traîne dans le frontispice. La seule couleur doit
   rester un **signal**, jamais une patine : rousseurs en ocre `#8C6A3F` (§ 4.5).
7. **Fuite P0 sur la Pl. VI (nuit de la Voyante).** Le « Carnet de voyances »
   reste ouvert en bas d'écran avec « Bastien — Loup-garou » dans un cartouche
   clair cerclé de sanguine : lisible à un mètre, et la tache claire se voit à
   trois. L'écran de la Voyante ne ressemble à aucun autre (grand médaillon,
   carnet) : violation de P0-3 et P0-4. Pire, le **brunissage de nuit allume un
   disque clair sur un seul téléphone de la table** — un phare. Corrigé par les
   lois de la nuit N1-N6 (§ 3.5) et le gabarit unique (§ 7.1).
8. **Des cibles de 26 px.** Les douze jetons de la Pl. VI tiennent sur une ligne
   à 26 px : sous les 44 px de la collection et de WCAG 2.5.8, illisibles à bout
   de bras. Pendant ce temps, le dessin du brunissoir (pointe, manche, 290 px de
   haut) est de l'illustration qui occupe la place de l'action.
9. **La Pl. VII ne tient pas 18 joueurs.** Quatre colonnes de 80 px × 110 px :
   à 18, il faut défiler pour voter (contraire à P1-10). Le fil a disparu du
   jour (aucune poignée), ainsi que le lien retour et le bouton son du cadre
   commun.
10. **Les bustes sont des avatars par défaut.** Trois variantes (`buste1/2/3`)
    pour douze joueurs : c'est le piège n° 5 de recherche-01 (« la liste de 15
    avatars identiques »), et rien de Goya là-dedans. Les *Caprichos* sont un
    défilé de couvre-chefs — coroza, mantille, tricorne, bonnet de nuit : on en
    fait l'identité des sièges (§ 5.1.2).
11. **Le conflit avec D11 n'est pas traité.** La Pl. VI est sur bistre, la VII
    sur papier ; le contrat dit « fond constant ». La planche ne le signale pas,
    ne dessine pas la transition et ne se pose pas la question de la pièce
    éteinte. La spec tranche (§ 3.2).
12. **Ce qui fait « IA » : la mise en page de *moodboard*.** Neuf panneaux à
    coins arrondis de 6 px, biseau en `box-shadow inset` (le skeuomorphisme
    générique des « design system boards »), boutons à rayon 4 px, téléphone à
    34 px, intitulés gris à 12 px partout, listes à tirets. Rien de tout cela
    n'existe sur une plaque de cuivre : **angles vifs, aucune ombre, aucune
    pastille arrondie** (§ 3.8).
13. **IM Fell sous son seuil.** « Pl. I », intitulés SC à 12 px, notes à 13 px :
    IM Fell French Canon a un petit œil et des fûts irréguliers — c'est sa
    beauté au-dessus de 18 px, son défaut en dessous. Et tout le discours
    secondaire est en Source Serif 12,5 px délavé : au soleil, il disparaît.
    Planchers par police au § 3.6.
14. **Les épreuves générées (Pl. VIII) ne sont pas des gravures.** Visage
    symétrique éclairé par en dessous, halo de bougie diffus, sfumato : ce sont
    les tics d'une image générée, pas une aquatinte par paliers. Elles prouvent
    l'ambiance, elles ne doivent **jamais** servir de référence de trait (§ 13).
15. **La sanguine illisible la nuit n'est pas résolue.** 2,80:1 sur bistre ; la
    planche la renvoie « toujours sur cartouche bruni » — or un cartouche clair
    la nuit est une tache claire, donc une fuite. Solution : une seconde valeur,
    la **sanguine-craie** `#D9765A` (5,89:1 sur bistre), et une sanguine
    nocturne rare par construction (§ 3.4, § 3.5).

---

## 2. Le parti pris, resserré

### 2.1 La phrase-manifeste

> **« Le sommeil de la raison engendre des loups. »**
> Garoutom est un recueil de Caprices : chaque partie est tirée sur cuivre, la
> nuit mord la plaque, le jour l'imprime sur papier, et une seule encre de
> couleur existe — la sanguine, celle de la meute. Le sujet est la crédulité
> d'un village qui vote ; le graveur s'en moque, le crieur l'annonce.

Trois lois en découlent, qui tranchent tous les cas non prévus :

1. **Une technique réelle, jamais un effet.** Tout ce qui paraît à l'écran doit
   pouvoir exister sur une estampe de 1799 : trait d'eau-forte, grain
   d'aquatinte, brunissoir, papier vergé, cuvette du cuivre, encre, sanguine.
   Pas de flou, pas de lueur, pas de dégradé, pas d'ombre portée, pas de verre.
2. **Une seule couleur, et elle signifie.** La sanguine n'est **que** la meute.
   La garance n'est **que** le serment. Tout le reste est encre et papier.
   L'urgence, le danger, l'erreur se disent par le trait et le mot.
3. **La nuit ne trahit personne.** À un mètre, l'écran d'un loup, d'une Voyante
   et d'un villageois endormi doivent être la même tache sombre (§ 3.5).

### 2.2 Le narrateur : deux mains

Le contrat des skins (SKINS.md, R87) veut un narrateur qui annonce sans
commenter. Caprices veut une satire. Les deux tiennent parce qu'on sépare les
mains — exactement comme une planche de Goya porte l'image *et* sa légende :

| | **Le crieur** | **Le graveur** |
|---|---|---|
| Ce qu'il dit | les évènements : morts, votes, brassard, aube (textes **existants** de `thiercelieux.ts`, inchangés) | une légende ironique, fixe, par rôle, par écran, par planche de récit |
| Peut-il nommer un joueur ? | oui, c'est son métier (`{nom}`) | **jamais** — ni pseudo, ni secret, ni compte |
| Lettre | Source Serif 4, 16-18 px, droit | IM Fell French Canon **italique**, 18-20 px, entre « » |
| Où | sous l'en-tête (crieur), dans le registre (journal) | sous une planche : carte, aube, dépouillement, nuit racontée, consigne du dormeur |
| Annonce vocale | oui (région vive unique) | non (`aria-live` absent ; lue au parcours) |
| Accord | règle 1 de SKINS.md (rien ne s'accorde au pseudo) | s'accorde **au rôle** (règle 2) ou ne s'accorde pas |

Le graveur est cruel avec le **village** (sa crédulité), jamais avec un
**joueur**. Il ne dit rien que l'écran ne sache déjà publiquement ; la nuit
racontée (log de fin, tout public) est le seul endroit où sa légende dépend de
ce qui s'est passé (§ 6.4).

### 2.3 Le camp s'exprime par le trait

La leçon de *Wolfwalkers* (la ville en bois gravé, la forêt au crayon libre),
traduite dans les techniques de la taille-douce. **Chaque ligne du tableau est
une règle de dessin**, pour les symboles, les cartes, les cartouches, les jetons
et le fil :

| Camp / état | Technique | Le trait | Les valeurs | La couleur | Le mot |
|---|---|---|---|---|---|
| **Village** (tous les rôles du camp village, Cupidon compris) | eau-forte | net, continu, d'épaisseur constante, extrémités rondes ; contours fermés | hachures **régulières** à 45° (pas 6 / 4 / 2,6) | aucune : l'encre (bistre le jour, vergé la nuit) | « Village », « Villageois·e », nom du rôle |
| **Meute** (loup, Loup Blanc) | aquatinte + morsure | **mordu** : bord irrégulier, dentelures, bavures ; aucun contour fermé net | **masses** de grain (paliers III-IV), pas de hachures | sanguine `#A23B24` (papier) / craie `#D9765A` (cuivre) — au trait et au mot, jamais en aplat de fond | « Meute », « Loup-garou » |
| **Loup Blanc** (sa propre carte seulement) | aquatinte **brunie** | mordu des deux côtés ; figure en **réserve** (papier) dans une masse sombre | inverse du loup | sanguine | « Seul » |
| **Serment** (amoureux) | eau-forte | **double filet** arrondi (les lacs) | aucune trame | garance `#8A3A5C` (papier) / `#D29AA6` (cuivre) | « Le serment », « lié·e » |
| **Morts** | brunissage | le trait **s'efface** : plus de hachure, contour au palier II, silhouette au palier I | « bruni jusqu'au blanc » en 3 crans | aucune | « mort·e » + cause ou rôle |
| **L'au-delà** (canal des morts) | brunissage | pointillé `1,5 / 3` | aucune | encre délavée | « L'au-delà » |
| **Inconnu** (carte cachée) | — | ovale **pointillé** `3 / 3`, vide | aucune | encre délavée | « Carte cachée » |
| **Narrateur** | légende gravée | IM Fell italique | — | encre délavée | — |

Conséquences directes : un symbole de rôle du village **n'a jamais** de masse
pleine ; un symbole de la meute **n'a jamais** de contour net ; un mort **ne
garde jamais** sa hachure.

---

## 3. Tokens

### 3.1 Primitifs — les encres

Jamais employés directement dans un composant : un composant ne connaît que les
sémantiques (§ 3.3).

| Primitif | Hex | Nom d'atelier | Emploi |
|---|---|---|---|
| `--cp-bistre-900` | `#17130F` | l'encre / nuit pleine (palier IV) | texte du papier, fond du cuivre |
| `--cp-bistre-800` | `#2A241E` | cuivre en relief | surfaces de nuit (barre, feuille, cartouche) |
| `--cp-palier-3` | `#4A433B` | morsure III | aplats de nuit, bouton primaire de nuit, décor |
| `--cp-palier-2` | `#7A7064` | morsure II | filets (non-texte), crans vides, contour des morts |
| `--cp-palier-1` | `#A89D8C` | morsure I | texte secondaire de nuit, silhouette des morts |
| `--cp-delave` | `#5E554A` | encre délavée | texte secondaire du jour, narrateur, au-delà |
| `--cp-teinte` | `#E1D7C1` | teinte de planche | intérieur de la cuvette, creux du jour |
| `--cp-verge` | `#E8DFCB` | papier vergé | fond du jour, texte de nuit |
| `--cp-bruni` | `#F5EFE2` | blanc bruni | surfaces du jour (barre, cartouche, feuille) |
| `--cp-sanguine` | `#A23B24` | sanguine d'encre | meute, sur papier |
| `--cp-craie` | `#D9765A` | sanguine de craie | meute, sur cuivre |
| `--cp-garance-encre` | `#8A3A5C` | laque de garance | serment, sur papier |
| `--cp-garance-craie` | `#D29AA6` | garance pâle | serment, sur cuivre |
| `--cp-rousseur` | `#8C6A3F` | rousseur | décor du papier **uniquement** (≤ 8 % d'opacité) |
| `--cp-vert-bataillon` | `#45523F` | vert du Bataillon | skin Shiganshina, **hachure seulement** |

La garance de la planche (`#C7837A`) est **retirée** : trop proche en teinte de
la sanguine-craie (deux saumons), et 2,28:1 sur vergé. La garance devient une
laque cramoisie le jour et un rose pâle la nuit — séparée de la sanguine par la
teinte (orangé contre cramoisi) **et** par la forme (lacs contre mordu).

### 3.2 La lumière : deux tirages — décision et amendement

**Le problème.** Le contrat (D11, SKINS.md « La frontière des couleurs ») veut
un fond constant, pour ne pas faire clignoter douze écrans dans une pièce
éteinte. Caprices veut une nuit sur cuivre et un jour sur papier, et le
propriétaire veut un jeu lisible au soleil. La sanguine, enfin, ne lit pas sur
bistre.

**Décision.** Deux *tirages* d'une même planche, choisis par **l'heure
publique**, jamais par le rôle :

| Tirage | Phases | Fond | Pourquoi |
|---|---|---|---|
| **Cuivre** (`data-tirage="cuivre"`) | `revelation`, `nuit` — et tout l'écran quand le réglage « Cuivre » est choisi | `#17130F` + grain IV | la nuit discrète (P0-5) ; la plaque encrée |
| **Papier** (`data-tirage="papier"`) | `election`, `jour`, `chasseur`, `succession`, `bouc`, `fin`, salon, accueil | `#E8DFCB` vergé | lisibilité au soleil (texte 13,95:1, surfaces bruni 16,13:1) ; l'épreuve imprimée |

- **L'aube est un évènement de table, pas un clignotement.** Le passage
  cuivre → papier se fait au même instant pour tous les sièges, en **quatre
  paliers** (IV → III → II → I → papier, 80 ms chacun, 320 ms : la durée du
  `Rideau` de la collection). Le soir, la table entière s'éclaire à l'aube :
  c'est un effet de théâtre voulu, et la nuit retombe de même en quatre
  morsures.
- **Réglage local « Le jour s'imprime sur : Papier (défaut) · Cuivre »** dans
  Réglages. « Cuivre » garde tout l'écran sur le tirage nuit, jour compris, pour
  qui joue dans le noir. Ce réglage ne touche **jamais** la nuit (toujours
  cuivre pour tout le monde) : il ne peut donc rien trahir.
- **La sanguine a deux valeurs, une par tirage** (la règle « un accent, deux
  valeurs » de la collection) : `#A23B24` sur papier, `#D9765A` sur cuivre.
  Les deux passent AA sur tous les fonds de leur tirage (§ 3.4).

**Amendement proposé à D11 / SKINS.md (à signer par le propriétaire).**
Remplacer « le fond ne bouge pas entre la nuit et le jour » par :

> *Le fond ne change qu'avec l'heure publique — au même instant pour tous les
> sièges, par paliers, jamais selon le rôle, jamais selon une action. Un
> réglage local peut garder le fond de nuit à toute heure.*

La raison d'origine (pas de clignotement) est tenue par les paliers et par la
simultanéité ; la raison de fond (rien ne trahit) est tenue mieux qu'avant
(§ 3.5). **Repli si l'amendement est refusé :** le réglage « Cuivre » devient
le défaut et le papier une option ; les écrans de jour existent déjà dans les
deux tirages (les sémantiques s'en chargent), et l'artboard `Jour-12-Cuivre`
montre le résultat.

### 3.3 Sémantiques — par tirage

Seul ce niveau est surchargé par un skin (§ 8). Les noms disent un **rôle**,
jamais une couleur.

| Sémantique | Papier | Cuivre | Rôle |
|---|---|---|---|
| `--fond` | verge | bistre-900 | le support, plein écran |
| `--fond-planche` | teinte | bistre-900 (+ grain IV) | l'intérieur d'une cuvette |
| `--surface` | bruni | bistre-800 | barre au pouce, cartouche d'en-tête, feuille, avis |
| `--creux` | teinte | `#0F0C09` | champ de saisie |
| `--encre` | bistre-900 | verge | texte principal, trait des symboles du village |
| `--encre-2` | delave | palier-1 | texte secondaire, statut de jeton |
| `--encre-narrateur` | delave | palier-1 | légende du graveur, rubriques |
| `--filet` | bistre-900 | palier-2 | bordures porteuses d'information (≥ 3:1) |
| `--filet-doux` | palier-2 | palier-3 | séparateurs décoratifs (aucune information) |
| `--trame` | bistre-900 | verge | couleur des hachures (via les motifs `-e` / `-v`) |
| `--sur-encre` | bruni | bistre-900 | texte posé sur un aplat `--encre` |
| `--camp-village` | bistre-900 | verge | le village **est** l'encre |
| `--camp-meute` | sanguine | craie | trait et mot de la meute |
| `--camp-serment` | garance-encre | garance-craie | trait et mot du serment |
| `--canal-village` | `--camp-village` | | |
| `--canal-meute` | `--camp-meute` | | |
| `--canal-serment` | `--camp-serment` | | |
| `--canal-audela` | delave | palier-1 | |
| `--etat-mort-trait` | palier-2 | palier-2 | contour d'un jeton mort |
| `--etat-mort-texte` | delave | palier-1 | nom d'un mort |
| `--etat-focus` | bistre-900 | verge | anneau de focus clavier |
| `--action-fond` | bistre-900 | palier-3 | bouton primaire |
| `--action-texte` | bruni | verge | texte du bouton primaire |
| `--action-bord` | bistre-900 | palier-1 | bord du bouton primaire |

### 3.4 Contrastes — calculés (WCAG 2.x, luminance relative)

Calculés le 11 octobre 2026 (script : formule sRGB de WCAG, valeurs arrondies au
centième). **Toute paire non listée ici est interdite** pour du texte.

**Tirage papier** — fonds : vergé `#E8DFCB` · bruni `#F5EFE2` · teinte `#E1D7C1`

| Texte / trait | sur vergé | sur bruni | sur teinte | Emploi autorisé |
|---|---|---|---|---|
| bistre-900 `#17130F` | **13,95** | **16,13** | **12,93** | tout texte |
| délavé `#5E554A` | **5,51** | **6,38** | **5,11** | texte secondaire ≥ 12 px |
| sanguine `#A23B24` | **4,97** | **5,75** | **4,61** | texte meute ≥ 14 px (600) ; trait mordu |
| garance-encre `#8A3A5C` | **5,58** | **6,45** | **5,17** | texte serment ≥ 14 px ; lacs |
| palier-2 `#7A7064` | 3,66 | 4,23 | 3,39 | **non-texte seulement** (filets, crans, morts) |
| palier-1 `#A89D8C` | 2,01 | — | — | décor seulement |
| rousseur `#8C6A3F` | 3,73 | 4,31 | — | décor seulement, jamais de texte |
| bruni sur aplat bistre-900 | 16,13 (bouton primaire) | | | |
| bruni sur aplat sanguine | 5,75 (cartouche meute plein, « Seul ») | | | |
| bruni sur aplat garance-encre | 6,45 | | | |

**Tirage cuivre** — fonds : bistre-900 `#17130F` · bistre-800 `#2A241E` · palier-3 `#4A433B`

| Texte / trait | sur bistre-900 | sur bistre-800 | sur palier-3 | Emploi autorisé |
|---|---|---|---|---|
| vergé `#E8DFCB` | **13,95** | **11,57** | **7,35** | tout texte |
| bruni `#F5EFE2` | 16,13 | — | **8,50** | interdit en surface la nuit (N3) ; texte de bouton seulement |
| palier-1 `#A89D8C` | **6,92** | **5,74** | 3,65 | texte secondaire (pas sur palier-3) |
| craie `#D9765A` | **5,89** | **4,88** | 3,10 | texte meute ≥ 14 px (600) sur 900/800 |
| garance-craie `#D29AA6` | **7,84** | **6,51** | 4,13 | texte serment |
| palier-2 `#7A7064` | 3,81 | 3,16 | 2,01 | **non-texte seulement** (≥ 3:1 sur 900/800) |
| palier-3 `#4A433B` | 1,90 | — | — | décor seulement (hachure, grain) |
| sanguine `#A23B24` | **2,80** | — | — | **interdit la nuit** — remplacée par la craie |

**Daltonisme** (simulation Machado 2009, sévérité 1) : sanguine → `#716520`
(olive), garance-encre → `#5B5B5A` (gris neutre), délavé → `#5B574A`. La
garance et l'encre délavée deviennent **presque identiques** pour un
deutéranope : c'est pourquoi le serment ne se dit **jamais** par la couleur
seule (lacs + mot, § 5.3). Sanguine et garance restent séparées (olive contre
gris).

Un test `contraste.test.ts` (patron MastomMind) verrouille chaque ligne en gras
ci-dessus, pour chaque skin.

### 3.5 Les lois de la nuit (P0-3, P0-4, P0-5 rendus mesurables)

- **N1 — Un seul gabarit.** Pendant `nuit`, tous les sièges (acteur, dormeur,
  mort, spectateur) affichent le **même squelette** : mêmes zones, mêmes
  hauteurs au pixel (§ 7.1). Ce qui change, c'est le texte dans les zones, et si
  les jetons répondent au toucher.
- **N2 — La nuit, la meute n'a pas de couleur de surface.** La craie n'apparaît
  qu'en **texte ou trait ≤ 16 px de haut** (pastilles de vote de la meute,
  nom dans le fil de la meute, cartouche sous le pouce). Jamais en fond, en
  bordure de zone, en titre, en bouton. Les boutons de la nuit sont identiques
  pour tous (§ 5.4).
- **N3 — Plafond de clarté.** La nuit, aucune surface plus claire que le
  palier-3 `#4A433B` ne dépasse **48 × 48 px**, sauf le texte lui-même. Le
  brunissage nocturne gratte donc **jusqu'au palier-3**, pas jusqu'au papier
  (§ 4.7). Le papier n'existe pas la nuit. **Exception unique : la phase
  `revelation`**, où tous les sièges font le même geste au même moment — la
  carte s'y brunit jusqu'au papier, et cette clarté ne désigne aucun rôle.
- **N4 — Budget de luminance.** Capture d'écran de deux sièges à l'instant t
  (un dormeur, un acteur) : leur luminance moyenne ne diffère pas de plus de
  **3 %** (test Playwright, § 14). La minuterie, le pli, la barre et la consigne
  sont dans le budget.
- **N5 — Pas de geste visible.** Aucun rôle n'a, la nuit, un geste que les
  autres n'ont pas : le dormeur a lui aussi une barre au pouce (« Ma carte »,
  appui long) et un pli (« Le registre »).
- **N6 — Rien ne se raconte en temps.** Aucune animation dont la durée dépend
  du rôle ; aucune vibration ; la morsure de la nuit est la même horloge pour
  tous.

### 3.6 Typographie

Deux familles, une identité et un corps (règle de la collection : trois au
plus ; Source Serif 4 porte les chiffres tabulaires, le mono n'est plus
nécessaire).

| Police | Google Fonts | `@fontsource` (à vérifier à l'installation) | Rôle |
|---|---|---|---|
| **IM Fell French Canon** (romain, italique) + **IM Fell French Canon SC** | `family=IM+Fell+French+Canon:ital@0;1&family=IM+Fell+French+Canon+SC` | `@fontsource/im-fell-french-canon`, `@fontsource/im-fell-french-canon-sc` | identité : titres, noms de rôles, légendes du graveur, numéros de planche, rubriques |
| **Source Serif 4** (variable, `opsz` 8-60, 400/600/700) | `family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400` | `@fontsource-variable/source-serif-4` (sous-ensemble latin) | tout le reste : consignes, boutons, crieur, fil, statuts, chiffres |

Pourquoi IM Fell : c'est une numérisation des caractères Fell (fin XVIIe), avec
l'irrégularité réelle du plomb — l'inverse d'une « police vintage » lissée. Son
italique est la plume du graveur. **IM Fell n'entre jamais dans une phrase
d'interface** (consigne, bouton, statut) : elle titre et elle légende.
Pourquoi Source Serif 4 : son axe optique (`opsz`) tient à 12 px au soleil ; un
empattement garde la famille de l'estampe.

**Échelle** (mobile / desktop ; interlignage en multiples de 4) :

| Token | Police | Mobile | Desktop | Graisse | Emploi | Plancher |
|---|---|---|---|---|---|---|
| `--t-planche` | IM Fell | 40/44 | 56/60 | 400 | verdict de fin, accueil, titre de planche plein écran | — |
| `--t-titre` | IM Fell | 28/32 | 36/40 | 400 | titre de feuille, nom de rôle sur carte grande | 24 |
| `--t-heure` | IM Fell SC | 20/24 | 22/28 | 400 | « Nuit II », « Jour III » (en-tête) | 20 |
| `--t-legende` | IM Fell *ital.* | 18/24 | 20/28 | 400 | légende du graveur | **16** |
| `--t-rubrique` | IM Fell SC | 13/16 | 14/20 | 400 · `letter-spacing: .06em` | « Aube II », intitulé de section | **13** |
| `--t-jeu` | Source Serif | 18/24 | 18/28 | 400 · `opsz 18` | consigne du rôle (P1-9) | 18 |
| `--t-corps` | Source Serif | 16/24 | 16/24 | 400 | crieur, fil, règles | 16 |
| `--t-bouton` | Source Serif | 17/20 | 17/20 | 600 | bouton primaire ; secondaire en 400 | 16 |
| `--t-nom` | Source Serif | 15/20 (grand) · 14/16 (compact) | 16/20 | 600 ; 700 pour « vous » | nom sur jeton | 13 |
| `--t-statut` | Source Serif | 12/16 | 13/16 | 400 · `opsz 12` | statut de jeton, horodatage, raison d'un bouton éteint | **12** |
| `--t-chiffre` | Source Serif | 16/20 ; urgence 20/24 | idem | 400 ; 600 en urgence · `font-variant-numeric: tabular-nums lining-nums` | minuterie, décomptes, « 7 sur 11 » | 16 |
| `--t-code` | Source Serif | 32/40 | 40/48 | 600 · `letter-spacing: .24em` · capitales | code de table (4 lettres) | — |

Règles : jamais de texte sous 12 px ; IM Fell jamais sous 13 px (SC) ni 16 px
(romain, italique) ; capitales seulement pour le code de table ; aucun texte en
`opacity` (la nuance passe par `--encre-2`) ; `html[data-grand-texte]` (+20 %)
reste le seul curseur.

### 3.7 Grille et espacements

- **Base 4 px.** Échelle : `--e-1` 4 · `--e-2` 8 · `--e-3` 12 · `--e-4` 16 ·
  `--e-6` 24 · `--e-8` 32 · `--e-12` 48.
- **Gouttière** : 16 px mobile (12 px sous 360 px), 32 px desktop.
- **Cibles** : 44 × 44 px minimum partout ; **48 px de haut** pour toute action
  de jeu ; 8 px entre deux cibles (P0-7).
- **Zone du pouce** : le tiers inférieur de l'écran (sous y = 560 sur 844)
  porte l'action de jeu ; la gestion (règles, réglages, quitter) vit en haut ou
  dans le menu.

### 3.8 Rayons, traits, ombres

- **Rayons : 0.** Sur un cuivre, l'angle est vif. Seules exceptions, toutes
  *géométriques* : le médaillon du jeton (cercle), le cartouche « lacs » du
  serment (bout rond), l'angle de la cuvette (2 px, la plaque est ébavurée).
  Un bouton, une feuille, un avis, un champ : angle vif.
- **Traits** : `--trait-cheveu` 0,75 px (hachure fine, double filet intérieur) ·
  `--trait-filet` 1 px · `--trait` 1,5 px (contour courant, bouton secondaire) ·
  `--trait-fort` 2 px (mordu, symbole 32 px) · `--trait-choix` 3,5 px (jeton
  choisi) · `--trait-arme` 3 px + 1 px (double filet du bouton armé).
- **Ombres : aucune.** `box-shadow` est interdit hors focus. La profondeur se
  dit par la **cuvette** (§ 4.4) et par **l'encrage** (une feuille posée est un
  papier plus clair bordé d'un double filet). Le voile d'un modal est un grain
  d'aquatinte (palier IV à 72 % la nuit, palier II à 60 % le jour), jamais un
  flou.
- **Focus clavier** : `outline: 2px solid var(--etat-focus); outline-offset: 3px`
  — le seul anneau autorisé ; jamais retiré.

### 3.9 Mouvement

Rien ne glisse, rien ne rebondit : **tout s'imprime**. Le mouvement procède par
crans (`steps()`), comme la morsure d'un acide ou le passage d'une presse. Les
ressorts de `anim/tokens.ts` (`RESSORT_PANNEAU`, `RESSORT_CARTE`,
`RESSORT_JETON`) sont remplacés.

| Token | Valeur | Emploi | Mouvement réduit |
|---|---|---|---|
| `--m-morsure` | 320 ms `steps(4, end)` | tombée de la nuit (vergé → I → II → III → IV) et chaque bascule d'étape de nuit | fondu 160 ms linéaire |
| `--m-aube` | 320 ms `steps(4, end)` | lever du jour (IV → I → papier) | fondu 160 ms |
| `--m-impression` | 120 ms `steps(2, end)` (opacité 0 → 0,5 → 1) | une carte, un avis, un écran qui paraît | fondu 120 ms |
| `--m-tirage` | 240 ms `cubic-bezier(.2, 0, 0, 1)` | feuille basse tirée vers le haut (le seul glissement : un papier qu'on tire) | fondu 160 ms |
| `--m-armement` | 600 ms `steps(12, end)` | anneau d'un appui long (12 crans de 50 ms) | **inchangé** (fonctionnel) |
| `--m-brunir` | rayon +8 px par image (16 ms), jusqu'au plein | ouverture de la révélation sous le pouce | ouverture instantanée |
| `--m-reencrer` | 0 ms | relâcher : le secret se ferme en une image | 0 ms |
| `--m-lecture-max` | 8 000 ms | durée maximale d'une révélation (P0-2) | inchangé |
| `--m-arme` | 4 000 ms | fenêtre d'un bouton armé avant désarmement | inchangé |
| `--m-crieur` | un mot toutes les 40 ms, 1 200 ms au plus ; passable d'un toucher | la légende et le crieur « s'écrivent » | texte posé d'un coup |
| `--m-bruni-mort` | 3 crans × 160 ms = 480 ms | un jeton meurt : hachure → contour palier-2 → silhouette palier-1 | fondu 160 ms vers l'état final |
| `--m-choix` | 80 ms `steps(2)` | l'anneau de 3,5 px et les repères de visée paraissent | instantané |

```ts
// anim/tokens.ts — remplace les trois ressorts
export const MORSURE = { duree: 320, paliers: 4 } as const;
export const IMPRESSION = { duration: 0.12, ease: 'linear' } as const; // opacité en 2 crans côté CSS
export const TIRAGE_FEUILLE = { type: 'tween', duration: 0.24, ease: [0.2, 0, 0, 1] } as const;
export const APPUI_ARMEMENT_MS = 600;
export const LECTURE_MAX_MS = 8_000;
export const ARMEMENT_CONFIRMATION_MS = 4_000;
export const CRAN_BRUNIR_PX = 8;
export const DUREE_AVIS_MS = 6_000; // inchangé
```

### 3.10 Prêt à coder — CSS, trois niveaux

```css
/* ── 1. Primitifs : les encres ─────────────────────────────────────── */
:root {
  --cp-bistre-900: #17130F;  --cp-bistre-800: #2A241E;
  --cp-palier-3:  #4A433B;   --cp-palier-2:  #7A7064;  --cp-palier-1: #A89D8C;
  --cp-delave:    #5E554A;   --cp-teinte:    #E1D7C1;
  --cp-verge:     #E8DFCB;   --cp-bruni:     #F5EFE2;
  --cp-sanguine:  #A23B24;   --cp-craie:     #D9765A;
  --cp-garance-encre: #8A3A5C;  --cp-garance-craie: #D29AA6;
  --cp-rousseur:  #8C6A3F;   --cp-creux-nuit: #0F0C09;
}

/* ── 2. Sémantiques : un jeu par tirage ────────────────────────────── */
:root, [data-tirage='papier'] {
  color-scheme: light;
  --fond: var(--cp-verge);        --fond-planche: var(--cp-teinte);
  --surface: var(--cp-bruni);     --creux: var(--cp-teinte);
  --encre: var(--cp-bistre-900);  --encre-2: var(--cp-delave);
  --encre-narrateur: var(--cp-delave);
  --filet: var(--cp-bistre-900);  --filet-doux: var(--cp-palier-2);
  --sur-encre: var(--cp-bruni);
  --camp-village: var(--cp-bistre-900);
  --camp-meute: var(--cp-sanguine);
  --camp-serment: var(--cp-garance-encre);
  --canal-audela: var(--cp-delave);
  --etat-mort-trait: var(--cp-palier-2);  --etat-mort-texte: var(--cp-delave);
  --etat-focus: var(--cp-bistre-900);
  --action-fond: var(--cp-bistre-900);    --action-texte: var(--cp-bruni);
  --action-bord: var(--cp-bistre-900);
  --hachure: url(#hach-1-e);              /* motifs -e de textures.svg */
  --voile: var(--cp-palier-2);  --voile-opacite: .6;
}
[data-tirage='cuivre'] {
  color-scheme: dark;
  --fond: var(--cp-bistre-900);   --fond-planche: var(--cp-bistre-900);
  --surface: var(--cp-bistre-800);--creux: var(--cp-creux-nuit);
  --encre: var(--cp-verge);       --encre-2: var(--cp-palier-1);
  --encre-narrateur: var(--cp-palier-1);
  --filet: var(--cp-palier-2);    --filet-doux: var(--cp-palier-3);
  --sur-encre: var(--cp-bistre-900);
  --camp-village: var(--cp-verge);
  --camp-meute: var(--cp-craie);
  --camp-serment: var(--cp-garance-craie);
  --canal-audela: var(--cp-palier-1);
  --etat-mort-trait: var(--cp-palier-2);  --etat-mort-texte: var(--cp-palier-1);
  --etat-focus: var(--cp-verge);
  --action-fond: var(--cp-palier-3);      --action-texte: var(--cp-verge);
  --action-bord: var(--cp-palier-1);
  --hachure: url(#hach-1-v);              /* motifs -v de textures.svg */
  --voile: var(--cp-bistre-900);  --voile-opacite: .72;
}
:root { --canal-village: var(--camp-village); --canal-meute: var(--camp-meute);
        --canal-serment: var(--camp-serment); }

/* ── 3. Composants (extraits ; la liste complète suit le § 5) ───────── */
:root {
  --jeton-anneau: var(--encre);          --jeton-anneau-l: 1.5px;
  --jeton-anneau-choisi-l: 3.5px;        --jeton-fond: var(--surface);
  --btn-h: 48px;  --btn-h-outil: 44px;   --btn-bord-l: 1.5px;
  --cran-plein: var(--encre);            --cran-vide: var(--filet-doux);
  --barre-pouce-h: 72px;                 --pli-h: 44px;
  --entete-h: 56px;                      --minuterie-h: 24px;
}
[data-tirage='cuivre'] { --cran-plein: var(--cp-palier-2); --cran-vide: var(--cp-palier-3); }

/* Le cadre commun de l'arcade, rempli */
:root {
  --arcade-encre: var(--encre);  --arcade-fond: var(--surface);
  --arcade-trait: var(--filet-doux);  --arcade-accent: var(--action-fond);
  --arcade-fond-sur-accent: var(--action-texte);
}
```

Tailwind 4 : le `@theme` ne déclare que des **références** aux sémantiques
(`--color-encre: var(--encre)`, `--color-surface: var(--surface)`,
`--color-meute: var(--camp-meute)`…) pour que `data-tirage` repeigne les
utilitaires ; `--font-identite: 'IM Fell French Canon', Georgia, serif;
--font-identite-sc: 'IM Fell French Canon SC', Georgia, serif; --font-corps:
'Source Serif 4', Georgia, serif;`. `--radius-*: 0` partout ; aucun utilitaire
`shadow-*` autorisé (règle de lint).

`data-tirage` est posé par `Partie.tsx` à côté de `data-heure` :
`tirage = reglages.tirage === 'cuivre' || phase ∈ {revelation, nuit} ? 'cuivre' : 'papier'`.
Le salon et l'accueil sont papier, sauf réglage « Cuivre ».

---

## 4. Bibliothèque de matières

Toutes les recettes existent, exactes, dans [`textures.svg`](textures.svg)
(section `<defs>`) ; on copie les identifiants. **Interdits** : dégradé
décoratif, flou (`blur`, `backdrop-filter`), lueur, ombre portée, bruit animé.
Les seuls `radial-gradient` / `repeating-linear-gradient` autorisés sont à
**bords francs** (une hachure, un masque de brunissage) : ce sont des traits,
pas des dégradés.

### 4.1 Grain d'aquatinte — quatre paliers

Un palier = un **aplat** + un **grain** (les grains de résine qui ont protégé
le cuivre de l'acide). Grain sombre sur les paliers clairs, grain clair sur les
paliers sombres.

| Palier | Aplat | Filtre (`textures.svg`) | Seuil (α = 9R − k) | Opacité du grain | Emploi |
|---|---|---|---|---|---|
| I « le village s'endort » | `#A89D8C` | `aqua-I` (grain bistre) | k = 5,6 | 0,18 | morsure 1 ; voile du jour |
| II « la meute chasse » | `#7A7064` | `aqua-II` (grain bistre) | k = 5,2 | 0,22 | morsure 2 |
| III « les veilleurs » | `#4A433B` | `aqua-III` (grain vergé) | k = 5,4 | 0,20 | morsure 3 ; surfaces brunies de nuit |
| IV « nuit pleine » | `#17130F` | `aqua-IV` (grain vergé) | k = 5,0 | 0,28 | fond du cuivre, dos des cartes, voile de nuit |

```xml
<!-- Palier IV — copier tel quel ; baseFrequency 0.875 = 224/256 : tuile raccordée -->
<filter id="aqua-IV" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.875" numOctaves="2" seed="41" stitchTiles="stitch" result="n"/>
  <feColorMatrix in="n" type="matrix"
    values="0 0 0 0 0.91  0 0 0 0 0.875  0 0 0 0 0.796  9 0 0 0 -5.0" result="g"/>
  <feComposite in="g" in2="SourceGraphic" operator="in"/>
</filter>
<rect width="100%" height="100%" fill="#17130F"/>
<rect width="100%" height="100%" fill="#000" filter="url(#aqua-IV)" opacity="0.28"/>
```

**Version mobile (obligatoire)** : jamais de `feTurbulence` en direct sur
mobile. Les quatre grains sont **cuits** en tuiles PNG 512 × 512 (affichées à
256 × 256 CSS px), une fois, au build :

```js
// scripts/cuire-matieres.mjs — @resvg/resvg-js (support de feTurbulence/stitchTiles : à vérifier ; repli : canvas au premier lancement)
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const defs = readFileSync('docs/design/caprices/textures.svg', 'utf8').match(/<defs>[\s\S]*<\/defs>/)[0];
const PALIERS = { I: ['#A89D8C', .18], II: ['#7A7064', .22], III: ['#4A433B', .20], IV: ['#17130F', .28] };
for (const [p, [aplat, op]] of Object.entries(PALIERS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">${defs}
    <rect width="256" height="256" fill="${aplat}"/><rect width="256" height="256" fill="#000" filter="url(#aqua-${p})" opacity="${op}"/></svg>`;
  writeFileSync(`packages/client/public/matieres/aqua-${p}.png`, new Resvg(svg).render().asPng());
}
```

```css
.aqua-IV  { background: #17130F url('/matieres/aqua-IV.png') 0 0 / 256px 256px repeat; }
.aqua-III { background: #4A433B url('/matieres/aqua-III.png') 0 0 / 256px 256px repeat; }
/* idem I, II ; la tuile contient l'aplat : un seul calque */
```

### 4.2 Hachures droites et croisées

| Motif | Pas | Trait | Angle | Emploi |
|---|---|---|---|---|
| `hach-1-e` / `-v` | 6 | 0,6 | 45° | fond du médaillon, ombres légères, ciel du jour |
| `hach-2-e` / `-v` | 4 | 0,8 | 45° | volumes (bustes, symboles 32 px) |
| `hach-3-e` / `-v` | 2,6 | 1,1 | 45° | ombre profonde, bouton appuyé |
| `hach-x-e` / `-v` | 4 | 0,7 | 30° + 120° | urgence (crans), absent (médaillon) |
| `hach-h-e` | 3 | 0,6 | 0° | ciel de la frise |
| `hach-barre-e` | 3 | 0,9 | 0° | médaillon « hors vote » |

En HTML (grandes surfaces, coût nul) :

```css
.hach-1 { background-image: repeating-linear-gradient(45deg, var(--encre) 0 .6px, transparent .6px 6px); }
.hach-2 { background-image: repeating-linear-gradient(45deg, var(--encre) 0 .8px, transparent .8px 4px); }
.hach-x { background-image:
  repeating-linear-gradient( 30deg, var(--encre) 0 .7px, transparent .7px 4px),
  repeating-linear-gradient(120deg, var(--encre) 0 .7px, transparent .7px 4px); }
```

**Règle absolue : aucune hachure sous un mot.** Un texte posé sur une zone
hachurée l'est sur un cartouche plein (`--surface` ou `--fond`).

### 4.3 Hachures courbes (taille-douce de contour)

Les volumes ronds (médaillon, cor du Chasseur, fiole, tête) se hachurent en
**arcs concentriques du côté de l'ombre** (bas-gauche ; la lumière vient du
haut-droite, comme dans toute la direction). Générateur :

```ts
/** Arcs concentriques côté ombre ; chaque arc raccourcit vers le centre (main du graveur). */
export function hachuresCourbes(cx: number, cy: number, r: number, pas = 4.5, debut = 80, fin = 200): string {
  const rad = (a: number) => (a * Math.PI) / 180;
  let d = '';
  for (let k = r - 2, i = 0; k > r * 0.45; k -= pas, i++) {
    const a0 = rad(debut + i * 6), a1 = rad(fin - i * 9);           // raccourcissement irrégulier
    const p = (a: number) => `${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`;
    d += `M${p(a0)} A${k.toFixed(1)} ${k.toFixed(1)} 0 0 1 ${p(a1)} `;
  }
  return d; // <path d={…} fill="none" stroke="var(--encre)" stroke-width={0.7} strokeLinecap="round" />
}
```

### 4.4 La cuvette de cuivre (cadre de planche)

La marque que la plaque laisse dans le papier sous la presse : une arête
sombre côté ombre, un reflet côté lumière, une contre-arête à l'intérieur, et
**une teinte de planche** légèrement plus sombre que la marge. C'est le cadre
de toute carte, de toute planche de récit, du pupitre desktop, du verdict.

```css
.cuvette {                                   /* papier */
  position: relative; border-radius: 2px; background: var(--fond-planche);
  border: 1px solid; border-color: rgb(23 19 15 / .38) var(--cp-bruni) var(--cp-bruni) rgb(23 19 15 / .38);
  border-right-width: 1.5px; border-bottom-width: 1.5px;
}
.cuvette::after { content: ''; position: absolute; inset: 2px; pointer-events: none;
  border: 1px solid rgb(23 19 15 / .14); }
[data-tirage='cuivre'] .cuvette {           /* cuivre encré */
  background: #17130F url('/matieres/aqua-IV.png') 0 0 / 256px 256px;
  border: 1px solid var(--cp-palier-3); }
[data-tirage='cuivre'] .cuvette::after { inset: 2px; border-color: var(--cp-bistre-800); }
```

Marge papier autour d'une cuvette : 12 px au moins (carte grande), 6 px
(petite carte), 24 px (planche plein écran).

### 4.5 Papier vergé et rousseurs

```css
.papier {
  background-color: var(--cp-verge);
  background-image:
    url('/matieres/rousseurs.png'),                                               /* 512², ocre #8C6A3F, 4 à 8 % */
    url('/matieres/papier.png'),                                                  /* filtre `papier`, 256², opacité 0,22 cuite */
    repeating-linear-gradient(90deg, rgb(23 19 15 / .05) 0 1px, transparent 1px 40px),   /* pontuseaux */
    repeating-linear-gradient( 0deg, rgb(23 19 15 / .035) 0 .6px, transparent .6px 3px); /* vergeures */
  background-size: 512px 512px, 256px 256px, auto, auto;
}
```

- **Rousseurs** : 5 à 8 taches par tuile de 512, Ø 2 à 9 px, opacité 4 à 8 %,
  couleur **ocre** `#8C6A3F` — jamais de sanguine (critique n° 6). Jamais sur
  le cuivre, jamais sur une carte retournée la nuit.
- Budget de matière sous du texte : la luminance locale ne baisse pas de plus
  de 4 % (une rousseur à 8 % sur vergé donne ≈ `#E1D6C0`, où la sanguine tient
  encore 4,6:1).

### 4.6 Le trait mordu (la meute)

- **≥ 96 px** (cartes, vignettes, planches desktop) : filtre `mordu`
  (`feTurbulence` 0,09 + `feDisplacementMap` échelle 2,6 + dilatation 0,35) —
  statique, jamais animé.
- **< 96 px** (symboles 32, cartouches, jetons, glyphes) : la morsure est
  **dessinée dans le tracé**, jamais filtrée : une indentation irrégulière tous
  les 6 à 10 px de contour, profondeur 0,6 à 1,2 px à 32 px ; une ou deux
  bavures (pâtés de 1 px) hors du contour ; aucune symétrie.
- Jamais de filtre de morsure sur du **texte sous 24 px** : c'est le cartouche
  qui mord, pas le mot.

### 4.7 Le brunissage

Le brunissoir écrase le grain : la lumière revient. Trois emplois, une
mécanique.

1. **Révéler** (carte, voyance) : un calque d'aquatinte couvre le contenu ; un
   masque circulaire **à bord franc** s'ouvre depuis le pouce par crans de
   8 px.

```css
.brunir { --r: 0px; --x: 50%; --y: 50%;
  -webkit-mask: radial-gradient(circle at var(--x) var(--y), transparent var(--r), #000 calc(var(--r) + .5px));
          mask: radial-gradient(circle at var(--x) var(--y), transparent var(--r), #000 calc(var(--r) + .5px)); }
```

```ts
// pointerdown → armement 600 ms ; puis +8 px par image jusqu'à couvrir la carte ; pointerup → --r: 0 aussitôt
const ouvrir = (el: HTMLElement, rMax: number) => { let r = 0;
  const pas = () => { r = Math.min(rMax, r + CRAN_BRUNIR_PX); el.style.setProperty('--r', `${r}px`);
    if (r < rMax) id = requestAnimationFrame(pas); };
  let id = requestAnimationFrame(pas); return () => { cancelAnimationFrame(id); el.style.setProperty('--r', '0px'); };
};
```

   **La nuit (loi N3), on ne gratte que jusqu'au palier III** : le contenu
   révélé est dessiné en tirage cuivre (fond `#4A433B`, texte vergé 7,35:1),
   jamais en papier.
2. **Mourir** : « bruni jusqu'au blanc » en trois crans de 160 ms — (1) la
   hachure du médaillon disparaît ; (2) l'anneau passe à `--etat-mort-trait`
   1 px et le buste devient contour ; (3) le buste passe au palier-1, le nom au
   `--etat-mort-texte` barré d'un filet de 1 px.
3. **Le jour qui se lève** : le fond remonte les paliers IV → I → papier
   (`--m-aube`).

### 4.8 Coûts de rendu

| Matière | Technique | Coût | Mobile | Desktop |
|---|---|---|---|---|
| Hachures | `<pattern>` SVG ou `repeating-linear-gradient` | négligeable | oui | oui |
| Grain d'aquatinte | `feTurbulence` en direct | **élevé** : rastérisé sur le CPU (Safari), recalculé à chaque repeint | **interdit** | ≤ 200 × 200 px, statique |
| Grain d'aquatinte | tuile PNG cuite 512² | négligeable (une texture GPU) | **oui, obligatoire** | oui |
| Papier vergé | gradients durs + 2 tuiles | négligeable | oui | oui |
| Trait mordu | `feDisplacementMap` | moyen | interdit | ≥ 96 px, statique |
| Trait mordu | dessiné dans le tracé | nul | oui | oui |
| Brunissage | `mask` radial à bord franc, variable CSS | faible (composité) | oui | oui |
| Mort brunie | 3 changements d'attributs | nul | oui | oui |

Budget poids des matières : **≤ 120 Ko** pour toutes les tuiles (quatre
aquatintes, papier, rousseurs), en PNG-8 ou WebP sans perte — à mesurer au
premier build.

---

## 5. Composants et états

Dimensions en px CSS. Toutes les couleurs sont des **sémantiques** (§ 3.3) ;
un composant dessiné en papier se dessine en cuivre en changeant seulement
`data-tirage`.

### 5.1 Le jeton de joueur

#### 5.1.1 Anatomie et densités

Du fond vers le dessus : (1) **cellule** cliquable entière (≥ 44 × 44), focus
sur la cellule ; (2) **anneau** du médaillon, cercle de diamètre *m*, trait
`--trait` 1,5, `--jeton-anneau` ; (3) **disque intérieur** Ø *m* − 8,
hachure `hach-1`, filet 0,75 ; (4) **buste** à couvre-chef, 0,75 *m*, coupé
par le disque (`clipPath`) ; (5) **signes** aux emplacements fixes ; (6)
**nom** ; (7) **statut** (un seul mot).

| Densité | Joueurs | Colonnes à 390 | Cellule | *m* | Nom | Statut |
|---|---|---|---|---|---|---|
| D1 | 6-8 | 3 (pas 114, écart 8) | 114 × 124 | 72 | 15/20, 600 | 12/16 |
| D2 | 9-12 | 4 (pas 85, écart 6) | 85 × 104 | 60 | 15/20, 600 | 12/16 |
| D3 | 13-18 | 5 (pas 68, écart 4) | 68 × 88 | 48 | 14/16, 600 | 12/16 |
| D4 | tous, si le fil est ouvert ou si largeur < 360 | 5 | 56-68 × 76 | 40 | 13/16, 600 | 12/16 |
| Cercle desktop | ≤ 12 / 13-18 | ellipse | 112 / 96 de large | 72 / 56 | 16/20 | 13/16 |

Hauteurs de place à 390 × 844 (zone de 399 px, § 7.1) : D1 à 8 = 388 ;
D2 à 12 = 328 ; D3 à 18 = 364 ; D4 à 18 = 316. **Aucun défilement pour voter,
de 6 à 18.** Le nom tronque en `…` ; le nom entier vit dans la phrase cachée.

#### 5.1.2 Les dix-huit couvre-chefs

Chaque siège porte un couvre-chef tiré des *Caprichos*, attribué par numéro de
siège (public, stable, sans rapport avec le rôle). C'est la **silhouette avant
le détail** (Among Us) — et la satire : tout le village est en costume.

| Siège | Couvre-chef | Silhouette à 40 px |
|---|---|---|
| 1 | tricorne | trois cornes plates, plus large que la tête |
| 2 | mantille à peigne | peigne haut en éventail + voile qui tombe aux épaules |
| 3 | bonnet de nuit | pointe molle retombant sur le côté, pompon |
| 4 | coroza (cône des condamnés) | cône étroit, deux fois la hauteur de la tête |
| 5 | chambergo | très larges bords, calotte basse |
| 6 | montera | deux oreillettes rondes, bosse centrale |
| 7 | capuche de moine | capuchon pointu qui avale le cou |
| 8 | cofia (coiffe de dentelle) | bonnet rond festonné, dentelures |
| 9 | bicorne | demi-lune posée en travers |
| 10 | turban | volume enroulé, deux spires visibles |
| 11 | boina | galette plate débordant d'un côté |
| 12 | perruque à catogan | rouleaux latéraux + nœud derrière la nuque |
| 13 | haut-de-forme évasé (1795) | cylindre qui s'évase vers le haut |
| 14 | fichu noué | foulard noué sous le menton, deux pointes |
| 15 | calotte | petite coupole serrée au sommet du crâne |
| 16 | cornette | coiffe aux deux ailes empesées |
| 17 | chapeau de paille | bords irréguliers effilochés, ruban |
| 18 | chapeau à plumet | bord relevé, plume en S |

Test d'acceptation (« ombre chinoise ») : les 18 bustes remplis en aplat à
40 px doivent se distinguer deux à deux. Le couvre-chef est au trait du
village (eau-forte nette) : **le loup ne se trahit jamais par sa tête**.

#### 5.1.3 Les emplacements des signes

Repère : centre du médaillon (0, 0), diamètre *m*.

| Emplacement | Position du centre | Taille | Porte |
|---|---|---|---|
| **NE** | (+0,35 *m*, −0,35 *m*) | Ø max(16, 0,28 *m*) | sceau « a voté », pastille de la meute, compte de la Petite Fille |
| **NO** | (−0,40 *m*, −0,36 *m*) | 26 × 18 (22 × 16 si *m* = 40) | cartouche « +2 » du Corbeau |
| **SO** | (−0,35 *m*, +0,35 *m*) | 16 (glyphe) / Ø 20 (badge) | gracié, hors vote, votera, badge de rôle connu |
| **O** | (−0,52 *m*, 0) | 16 | lacs (amoureux) |
| **bandeau S** | bas du disque, centré | 0,8 *m* × 14, trapèze | brassard « ×2 » du capitaine |
| **cadre** | autour du médaillon | carré *m* + 14 | « moi » |
| **couverture** | disque intérieur | Ø *m* − 8 | absent, reconnexion |

#### 5.1.4 Les états (14 demandés + 3 de service)

| # | État | Vient de la vue | Dessin | Statut (un mot) | Jour | Nuit |
|---|---|---|---|---|---|---|
| 1 | **normal** | vivant | anatomie de base | jour de vote : « délibère » ; sinon rien | ✓ | ✓ (sans statut) |
| 2 | **choisi** | sélection locale | anneau 3,5 ; 4 **repères de visée** (traits de 6 × 2,4 hors de l'anneau, N/E/S/O, écart 2) ; nom souligné 1,5 (`text-underline-offset: 3px`) | « votre choix » (600) | ✓ | ✓ (vergé, jamais de couleur) |
| 3 | **a voté** | `voted[]` | **sceau** en NE : disque plein `--encre`, coche `--sur-encre` 1,8 | « a voté » | ✓ | — |
| 4 | **moi** | `you.seat` | **cadre** carré double : 1,5 + 0,75 à 2 px d'écart (la planche du joueur) ; nom 700 ; jamais son rôle | « vous » | ✓ | ✓ |
| 5 | **mort** | `!alive` | **bruni** (§ 4.7) : plus de hachure, anneau `--etat-mort-trait` 1, buste au contour palier-1 ; nom `--etat-mort-texte` barré ; dessous : cartouche du rôle s'il est public, sinon cartouche « Carte cachée » | (le cartouche tient lieu de statut) | ✓ | ✓ |
| 6 | **gracié** | `alive && !canVote` (Idiot) | normal + glyphe **corde coupée** en SO + cartouche du rôle (montré par la grâce) | « ne vote plus » | ✓ | ✓ |
| 7 | **hors vote** | `votants` du Bouc, siège absent de la liste | disque intérieur en `hach-barre` ; glyphe **index barré** en SO | « ne vote pas » | ✓ | — |
| 8 | **marqué +2** | `marque` du Corbeau | cartouche **« +2 »** en NO : aplat `--encre`, texte `--sur-encre` 12/16 700 tabulaire, plume gravée 10 px à gauche du chiffre | (statut libre) | ✓ | — |
| 9 | **capitaine** | `isCaptain` | **brassard** en bandeau S : trapèze `--encre`, « ×2 » `--sur-encre` 12 px 700 | « capitaine » (si rien de plus prioritaire) | ✓ | ✓ |
| 10 | **amoureux** | `isLover` | **lacs** en O, `--camp-serment` 1,6 | — (le statut « lié·e » n'apparaît que sous le pouce, § 5.1.6) | sous le pouce | sous le pouce |
| 11 | **absent** | `!connected` (autre siège) | couverture `hach-x` + **chaise vide** Ø 0,36 *m* ; buste masqué ; le nom garde son contraste plein | « absent·e · 23 s » (puis « absent·e ») | ✓ | ✓ |
| 12 | **reconnexion** | soi, socket coupé | sur le jeton « moi » : anneau en pointillé `4 / 2` ; + bandeau réseau (§ 5.11) | « reconnexion… » | ✓ | ✓ |
| 13 | **désigné-votant** | `votants` du Bouc, siège dans la liste | glyphe **index** en SO | « votera » | ✓ | — |
| 14 | **rôle connu** | `role !== null` | mort ou gracié : cartouche de camp sous le nom (20 px, texte 12) ; vivant connu en privé (complice, carnet) : badge Ø 20 en SO (symbole 16 du rôle) — **sous le pouce seulement** | — | ✓ | ✓ |
| 15 | non choisissable | `choisissables(seat) === false` en phase de choix | anneau `--filet-doux` 1, disque **sans** hachure (le grain s'en va) ; **aucune opacité**, le nom garde son contraste | — | ✓ | ✓ |
| 16 | interdit (« hier ») | `forbidden` du Salvateur | non choisissable + glyphe bouclier barré en SO | « hier » | — | ✓ |
| 17 | annoté | votes de la meute / espionnage | NE : pastille 18 de haut, fond `--surface`, filet `--filet`, initiales des loups en `--camp-meute` 12/16 600 (« B·J ») ; Petite Fille : chiffre seul en `--encre` + œil 10 px | — | — | ✓ |

**Priorité du mot de statut** (un seul s'affiche) : absent > reconnexion >
votre choix > ne vote plus > ne vote pas > votera > a voté > capitaine > vous >
délibère. Tout le reste est porté par les signes, et **tout** est dit dans la
phrase cachée (`sr-only`), comme aujourd'hui dans `Place.tsx`.

#### 5.1.5 Combinaisons de référence (à dessiner dans F-Jeton)

capitaine + a voté + moi · mort + rôle public (meute) · gracié + capitaine ·
marqué + a voté · hors vote + capitaine · absent + capitaine · choisi + marqué ·
annoté (meute, 2 initiales) + non choisissable (complice) · amoureux sous le
pouce + moi.

#### 5.1.6 Le savoir privé ne se pose pas sur la place

Changement de comportement voulu (P0-3) : les **complices**, le **carnet** de
la Voyante et les **lacs** des amoureux ne sont **plus dessinés en permanence**
sur les jetons. Ils paraissent **tant que le pouce tient « Ma carte »** (appui
long, § 5.4) : la place se brunit, les badges et les lacs s'impriment, et
disparaissent au relâchement. Exceptions fonctionnelles : la nuit, l'écran de
la meute rend ses complices **non choisissables** (état 15) — rien de plus.

### 5.2 La carte de rôle

| Format | Taille | Emploi | Contenu |
|---|---|---|---|
| grande | 300 × 420 | révélation, Ma carte (desktop), verdict | planche illustrée (ou symbole 128 en v1), n°, nom, cartouche, légende |
| moyenne | 216 × 302 | Ma carte (mobile) | idem, légende sur une ligne |
| petite | 96 × 134 | distribution de fin, règles | symbole 48, nom 16 (IM Fell), cartouche 20 |
| vignette | 48 × 67 | journal, nuit racontée | symbole 32 seul |

**Anatomie de la grande (300 × 420)** — papier bruni :

| Zone | Boîte | Contenu |
|---|---|---|
| marge | 12 px tout autour | papier vergé + rousseurs |
| cuvette | (12, 12) 276 × 396 | § 4.4 |
| numéro | coin haut-droit de la planche, ligne de base y = 40, IM Fell 16, `--encre-2` | « 4 » — numéro de planche du rôle (§ 6.1) |
| image | (24, 24) 252 × 264 | l'illustration ; en v1, le symbole du rôle à 128 px centré sur un fond de hachure `hach-1` |
| cartouche de camp | centré sur y = 288, 132 × 26 | forme du camp + mot (« Village », « Meute », « Seul ») |
| nom | ligne de base y = 334, IM Fell 28/32, centré, ≤ 252 de large | « la Sorcière » |
| légende | y 346-388, IM Fell italique 16/20, 2 lignes, `--encre-narrateur` | « Elle a sauvé tout le monde, sauf qui il fallait. » |

La **description** (`roles.*.description`) ne s'imprime jamais sur la carte :
elle vit sous la carte (révélation, Ma carte), en `--t-corps`.

**Trait par camp** : village → cuvette nette, image à l'eau-forte ; meute →
arêtes de la cuvette **mordues** (filtre `mordu`), image en masses d'aquatinte ;
Loup Blanc → cuvette mordue des deux côtés, figure en réserve.

**Dos** (unique pour toutes les cartes) : aquatinte IV pleine ; cuvette de
cuivre ; au centre, un ovale bruni **au palier III** (jamais clair) de 120 × 160
où se lit, au trait vergé, **le dormeur affalé du Caprice 43** — tête dans les
bras, sans visage ; double filet palier-2 à 8 px du bord. Rien d'autre : pas de
logo, pas de camp.

**Tirage cuivre de la face** (la nuit : Ma carte, révélation) : fond
bistre-800, pas d'illustration, **symbole 128 au trait vergé**, nom vergé,
cartouche en version cuivre (craie, garance-craie ou vergé), légende palier-1.
C'est la planche *avant* l'impression : sombre par nature (loi N3).

**Révélation à l'appui long — les états**

| | État | Dessin | Texte |
|---|---|---|---|
| R0 | dos posé | carte grande au dos, centrée (y = 196 sur 844) ; barre au pouce : bouton **appui long** | « Gardez le pouce : retourner la carte » |
| R1 | armement (0-600 ms) | l'anneau du bouton se remplit en 12 crans ; **un filet de 1,5 px court sur le périmètre de la cuvette** au même rythme | — |
| R2 | brunissage | le masque s'ouvre depuis le point du pouce (sur le bouton : depuis le centre de la carte) par crans de 8 px | — |
| R3 | lue (pouce posé) | face visible ; le filet du périmètre **décompte 8 s** en se rétractant ; sous la carte : description (`--t-corps`), et pour la meute, la liste des complices | « Relâchez pour cacher · 6 s » |
| R4 | réencrée | relâchement, changement d'onglet, ou 8 s : retour **en une image** à R0 | — |
| R5 | prête | après une première lecture complète (R3 ≥ 1 s), le bouton secondaire « Je sais qui je suis » (prompt `pret`) s'active | « Je sais qui je suis » ; ensuite : « Les autres retournent leur carte. » — sans compteur |

Clavier et lecteur d'écran : le bouton à appui long accepte **Espace tenu** ;
`Entrée` ouvre une lecture de 8 s au plus ; le rôle n'est lu qu'après ce geste
(P2-19).

### 5.3 Les cartouches de camp

| Cartouche | Forme (`textures.svg`) | Trait | Texte | Hauteurs |
|---|---|---|---|---|
| **Village** | `cart-ecu` : rectangle à pans coupés de 6 px | net 1,5, `--camp-village` | `--encre` 400 | 30 (carte, carnet) · 20 (jeton) |
| **Meute** | `cart-mordu` : écu dont le côté droit est mordu (5 dents irrégulières) | 2, `--camp-meute` | `--camp-meute` 600 | idem |
| **Loup Blanc — « Seul »** | `cart-mordu2` : mordu des deux côtés ; **plein** `--camp-meute`, texte `--sur-encre` le jour (5,75:1) ; la nuit, filet craie et texte craie | 2 | 600 | idem |
| **Serment** | `cart-lacs` : bout rond, double filet (2 + 0,9 à 3,5 px) | `--camp-serment` | `--camp-serment` 400 | idem |
| **L'au-delà** | `cart-audela` : écu en pointillé `1,5 / 3` | 1,2, `--canal-audela` | `--canal-audela` *italique* | idem |
| **Carte cachée** | `cart-ovale` : ovale pointillé `3 / 3`, vide | 1,4, `--encre-2` | `--encre-2` | idem |

Le fond d'un cartouche est `--surface` (jamais transparent sur une trame). Le
mot est **toujours** écrit : un cartouche sans mot est interdit. Padding
horizontal 12 (30 px) / 8 (20 px) ; texte 14/16 (30 px) ou 12/16 (20 px).

### 5.4 Les boutons

Angle vif, hauteur 48 (action de jeu) ou 44 (outil), padding horizontal 16,
texte `--t-bouton`. **Aucun bouton n'est rouge** : la sanguine reste à la meute.

| Variante | Repos | Appuyé (80 ms) | Survol (desktop) | Éteint |
|---|---|---|---|---|
| **primaire** | fond `--action-fond`, texte `--action-texte` 600, bord 1,5 `--action-bord` | fond en `hach-3` sur `--action-fond` (l'encre se dépose) | bord extérieur 1 px de plus | **pas d'opacité** : fond `transparent`, bord 1,5 **pointillé** `--filet-doux`, texte `--encre-2`, et **une raison** dessous en `--t-statut` (« Il manque 2 joueurs ») reliée par `aria-describedby` |
| **secondaire** | fond `transparent`, bord 1,5 `--filet`, texte `--encre` 400 | fond `hach-1` | fond `hach-1` | idem primaire |
| **discret** | texte `--encre` souligné 1 px (décalage 3), cible 44 | soulignement 2 px | idem | `--encre-2`, sans soulignement |
| **outil** (icône) | 44 × 44, bord 1 `--filet-doux`, icône 24 `--encre` ; libellé visible à côté si la place le permet | fond `hach-1` | bord `--filet` | — |
| **armé** (danger) | 1er toucher sur une action irréversible : **double filet** (3 px dehors + 1 px dedans, écart 2) `--encre`, fond `--action-fond`, **repères de visée** aux 4 coins, libellé « Confirmer : … » ; un filet de 1 px sous le bouton se rétracte en 4 s | — | — | au bout de 4 s sans 2e toucher : retour au repos |
| **appui long** | comme secondaire + **anneau** Ø 26 à gauche (piste palier-2 3 px, progression `--encre` 3 px) ; libellé « Gardez le pouce : … » | l'anneau se remplit en 12 crans (600 ms), puis l'action dure tant que le pouce reste | — | — |
| **en cours** (envoi) | libellé « Envoi… », 3 crans qui se remplissent en boucle (`steps(3)`, 900 ms) | — | — | — |

La nuit, les boutons de la barre au pouce sont **tous au palier-3** (primaire de
nuit ; l'appui long du dormeur prend ce même fond, anneau compris) : rien ne
distingue un bouton qui agit d'un bouton qui montre la carte (lois N2, N5). Un
acteur peut avoir deux boutons là où le dormeur en a un : l'écart de clarté
reste dans le budget N4.

### 5.5 La barre de confirmation au pouce

Collée en bas, au-dessus de l'indicateur d'accueil (34 px sur iPhone) :
hauteur **72** (12 + 48 + 12), fond `--surface`, filet supérieur 1,5 `--filet`.

```
[ S'abstenir ]  [ Voter contre Anna ··················· ]     ← 8 px d'écart
   secondaire, 120         primaire, flex
```

- Au-dessus, la **ligne de résumé** (24 px, dans la zone de la place) :
  « **Votre voix : Anna** · modifiable tant que la phase court » à gauche,
  « 7 sur 11 » en `--t-chiffre` à droite.
- Geste en deux temps pour **tout** irréversible (P0-6) : voter, s'abstenir,
  ne viser personne, tirer, empoisonner, sauver, lier, désigner. 1er toucher →
  bouton **armé** (§ 5.4) ; 2e toucher dans les 4 s → envoi ; sinon désarmé.
- Si le moteur permet de changer (vote du jour, étape principale de la nuit),
  pas de « annuler » : le choix se refait. Sinon (Sorcière, Loup Blanc,
  Chasseur), le libellé armé le dit : « Confirmer — sans retour ».
- La nuit, chez le **dormeur**, la barre porte un seul bouton plein-largeur,
  **appui long** « Gardez le pouce : ma carte » ; chez l'acteur, ses boutons
  d'action ; même hauteur, même fond, même variante (N1).

### 5.6 La minuterie

Ligne fixe de **24 px**, dans l'en-tête, présente chez **tous** les sièges.

| Variante | Dessin |
|---|---|
| **barre** (défaut) | sablier 16 · **24 crans** de 5 × 10 au pas de 8 (189 px) · chiffre `--t-chiffre` 16, aligné à droite sur 44 px. Crans restants pleins `--cran-plein`, écoulés en contour 1 `--cran-vide`. Un cran tombe à la fois, sans glissement. |
| **discrète** (réglage) | sablier 16 · chiffre 14 `--encre-2` ; sous 30 s, bascule en **barre** et le chiffre passe à 20/24 (P1-12). |
| **urgence** (< 10 s) | **un seul** changement : les crans pleins passent en `hach-x` (texture, pas couleur), le sablier **se retourne** (un cran, 180°), le chiffre passe à 600. Ni sanguine, ni clignotement, ni tic-tac. |
| **absente** | même ligne de 24 px : 24 crans en contour `--cran-vide`, aucun chiffre (un tiret long `—` en `--encre-2`). **Le cadre vide a exactement la taille de la barre** (P0-4). |

La nuit, les crans pleins sont au palier-2 et les vides au palier-3 (§ 3.10) :
à un mètre, une minuterie qui court et une minuterie absente sont la même ligne
grise.

### 5.7 L'en-tête de partie — la frise

Hauteur **56** + minuterie **24** = **80 px**, identiques pour tous la nuit.

- **La frise** est le décor permanent du jeu : sur toute la largeur, un ciel en
  `hach-h` (jour, 28 %) ou en aquatinte IV (nuit), et en bas, sur 18 px, la
  **ligne de toits de Thiercelieux** gravée (clocher à une fenêtre, potence à
  droite) — le seul paysage de l'écran. Elle remplace `Decor.tsx`.
- Posés **sur des cartouches pleins** (`--surface`, aucune trame sous un mot) :
  à gauche le **lien retour** de l'arcade (44) puis l'**heure** (« Nuit II »,
  `--t-heure`) ; à droite **Ma carte** (appui long, icône carte + « Carte »,
  76 × 44 ; icône seule sous 360 px), **menu** (44), **son** (44, cadre commun).
- Le code de table vit dans le menu sur mobile, à côté de l'heure sur desktop
  (`--t-code` réduit à 20).
- Spectateur : l'emplacement de « Ma carte » reste, vide (silhouette constante).

### 5.8 Le crieur et la légende

- **Le crieur** : zone fixe de **56 px** sous l'en-tête. Rubrique `--t-rubrique`
  (« Aube II ») en tête de ligne, puis la dernière annonce en `--t-corps`,
  deux lignes au plus, `…` au-delà ; un toucher ouvre le **registre** (§ 5.9).
  Il « s'écrit » (`--m-crieur`). Une mort se précède du glyphe **chandelle
  soufflée** (16). La nuit, il tait les phrases d'heure (déjà dans la frise) —
  comportement actuel de `Narrateur.tsx` conservé.
- **La légende du graveur** : IM Fell italique `--t-legende`, entre « », centrée
  sous la planche qu'elle commente, `--encre-narrateur`. Jamais plus de deux
  lignes. Elle n'est jamais un bouton, jamais une consigne.

### 5.9 Le journal — « Le registre »

Feuille basse (§ 5.12) titrée « Le registre ». Blocs par heure, titrés en
`--t-rubrique` (« Nuit II », « Jour II ») avec un filet de 0,75 pleine
largeur ; lignes en `--t-corps`, 8 px entre elles ; une mort : chandelle
soufflée ; un rôle révélé : cartouche 20 en fin de ligne. Le bloc le plus récent
en haut, ouvert. Aucune couleur hors cartouche.

### 5.10 Le fil de discussion — quatre canaux

Les canaux se distinguent **par la forme, le mot et la teinte** — dans cet
ordre d'importance.

| Canal | Onglet (forme + mot) | Filet de marge des messages | Teinte du nom | Corps du message | Saisie (placeholder) |
|---|---|---|---|---|---|
| `village` | écu « Le village » | **droit** 1 px `--canal-village` | `--encre` 600 | `--encre` romain | « Parler au village… » |
| `loups` | mordu « La meute » | **dentelé** 2 px (zigzag de 4 px) `--canal-meute` | `--canal-meute` 600 | `--encre` romain | « Parler à la meute… » |
| `amoureux` | lacs « Le serment » | **double** 1 + 1 px, écart 2, `--canal-serment` | `--canal-serment` 600 | `--encre` romain | « Murmurer… » |
| `morts` | au-delà « L'au-delà » | **pointillé** 1 px `1,5 / 3` `--canal-audela` | `--canal-audela` 600 | `--encre-2` *italique* | « Commenter d'outre-tombe… » |

- **Message** : filet de marge 2 px à gauche (hauteur du message), 10 px de
  retrait, nom `--t-nom` puis texte `--t-corps` ; ses propres messages : nom
  remplacé par « vous » en `--t-rubrique`. Pas de bulle, pas d'avatar, pas
  d'heure (un registre, pas une messagerie).
- **Onglets** : cartouches de 44 de haut, onglet actif plein (`--encre`, texte
  `--sur-encre`) ; seuls les canaux lisibles par ce siège existent.
- **Non-lus** : chiffre `--t-chiffre` dans le pli (« Le village · 3 »), jamais
  de pastille qui clignote, jamais de son.
- **Mobile** : le fil vit derrière le **pli** (§ 5.14). Ouvert « au tiers » :
  il pousse la place, qui passe en D4 ; le crieur et la consigne se replient en
  une ligne de 40 px ; le fil reçoit ≈ 232 px. « Plein écran » : il couvre la
  place, mais la ligne de résumé du vote reste épinglée en haut du fil.
- **Desktop** : colonne droite de 340, pleine hauteur sous la frise, onglets en
  tête, ligne de résumé du vote épinglée au-dessus des onglets.

### 5.11 Le bandeau réseau

Pour soi seulement (la place dit l'absence des autres, § 5.1.4). Bandeau de
**32 px** entre la barre d'état et la frise (il décale l'écran — l'état réseau
n'est pas un secret de rôle).

| État | Dessin | Texte |
|---|---|---|
| reconnexion | fond palier-3, `hach-1-v`, texte vergé sur cartouche palier-3 plein | « Reconnexion… la table vous garde votre place. » |
| hors ligne | idem + tout l'écran sous un voile `hach-1` à 20 % ; aucune commande active | « Hors ligne — dernier état connu. » |
| table disparue | écran plein : planche de fin réduite, légende « La table s'est levée sans vous. » | bouton primaire « Retour à l'accueil » |
| double onglet | idem | « La partie est ouverte dans un autre onglet. » · « Jouer ici » |
| sans Wake Lock | avis permanent discret (§ 5.13) au salon | « L'écran peut s'éteindre : gardez-le allumé dans vos réglages. » |

### 5.12 La feuille basse

Papier posé sur la planche : fond `--surface`, bord supérieur en **double
filet** (1,5 + 0,75, écart 3) `--filet`, languette 40 × 4 palier-2 à 8 px du
bord ; titre `--t-titre` à gauche, « Refermer » (discret, 44) à droite ;
hauteur au contenu, 90 % au plus ; voile : aquatinte (`--voile` à
`--voile-opacite`), jamais de flou. Entrée `--m-tirage`. Échap, toucher du
voile ou glissé vers le bas ferment. Sert à : registre, règles, réglages, menu
de table, fil plein écran, aide « ? » (P2-16).

### 5.13 L'avis (message éphémère)

358 de large au plus, hauteur ≥ 44, padding 12/16, fond `--surface`, filet 1
`--filet`, glyphe 16 à gauche, texte 14/20 ; **au-dessus** de la barre au pouce,
jamais dessus ; trois au plus, le plus récent en bas ; paraît en
`--m-impression`, s'efface après 6 s. Erreur : glyphe « pâté d'encre » et mot
« Refusé : » en 600 — pas de rouge.

### 5.14 Le pli

Rangée de **44 px** juste au-dessus de la barre au pouce, présente sur **tous**
les écrans de partie (jour et nuit) : cartouche du canal + libellé + compteur
+ chevron. C'est la poignée du fil le jour ; la nuit, sa **forme est la même
pour tous** et seul le libellé change selon la vue : « Le registre » (dormeur),
« Le serment · 2 » (amoureux vivant), « La meute · 1 » (loup, pendant
l'étape), « L'au-delà · 4 » (mort). Ainsi le serment n'est plus une ligne en
plus chez les seuls amoureux (fuite relevée dans recherche-04).

### 5.15 L'écran de fin et la nuit racontée

- **Verdict** : planche plein écran, cuvette à 24 px des bords. En haut, la
  légende « Il est l'heure. » (Caprice 80, *Ya es hora*) ; au centre, le
  **cartouche du vainqueur** en grand (240 × 56, forme du camp : écu, mordu,
  lacs, mordu double ; « Personne » = ovale vide), le verdict du crieur en
  `--t-jeu` ; puis **votre sort** (« Vous avez gagné » / « perdu », `EcranFin`
  du cadre) en `--t-titre`.
- **Les cartes retournées** : grille de **petites cartes** (3 colonnes mobile,
  6 desktop), pseudo dessous, sort en statut (« dévoré·e nuit II »), gagnants
  signalés par un **double filet** autour de la carte (pas de couleur).
- **La nuit racontée — un portfolio** : chaque bloc du log est une **planche
  numérotée** : « Pl. 3 — Nuit II » (`--t-rubrique`), une **vignette** 96 × 96
  (§ 6.4, choisie par l'évènement dominant), la **légende** du graveur, puis
  les lignes du récit (`--t-corps`). Mobile : planches empilées, la dernière
  ouverte, les autres repliées sur leur titre et leur légende. Desktop : grille
  de 3 planches par rangée, toutes ouvertes. La dernière planche est toujours
  « Il est l'heure. ».

### 5.16 La place

- **Mobile — grille** : densités D1-D4 (§ 5.1.1), dans une zone fixe de 399 px
  (§ 7.1), ordre des sièges, « moi » à sa place (pas déplacé), aucun
  défilement.
- **Desktop — cercle** : ellipse autour du **pupitre** (le bureau du dormeur
  du Caprice 43) : zone de place 1 004 × 748 sous la frise et le crieur, à
  gauche de la colonne du fil ; rx = 442, ry = 304 ; « moi » à 6 heures ; le
  pupitre au centre est une cuvette de 360 × 200 qui porte la consigne, la ligne
  de résumé et les deux boutons. Repli sur la grille si deux médaillons se
  chevauchent (comportement actuel de `cercle.ts`).
- **Sélection** : simple (vote, voyance…), double (Cupidon : un troisième
  toucher remplace le plus ancien), multiple (Bouc : au moins un).

### 5.17 Champs, cases et code

- **Champ** : 48 de haut, fond `--creux`, filet inférieur 1,5 `--filet` (pas
  de cadre), étiquette au-dessus en `--t-rubrique` ; focus : filet 3 px. **Pas
  d'autofocus** à l'accueil (le clavier masquerait les boutons — recherche-04).
- **Code de table** : 4 cases de 56 × 64, `--t-code`, une lettre par case,
  filet inférieur ; collé, il se répartit.
- **Case gravée** (remplace l'interrupteur à glissière, étranger au cuivre) :
  carré 24, filet 1,5 ; cochée = croix de deux traits 2 px gravés ; le mot
  « oui » / « non » à droite en `--t-statut` ; ligne entière cliquable (≥ 44).

---

## 6. Iconographie et légendes

### 6.1 Les treize rôles

Numéro = numéro de planche du recueil (imprimé sur la carte). Les légendes
s'accordent au rôle (règle 2 de SKINS.md), jamais à un joueur ; les cinq de la
planche d'origine sont conservées. Entre crochets, la planche de Goya citée.

| N° | Rôle | Trait | Motif de la planche (carte grande) | Légende du graveur | Symbole 32 px — règle de dessin |
|---|---|---|---|---|---|
| 1 | Villageois·e | net | la foule en couvre-chefs brandit fourches et lanternes derrière un homme qui regarde ailleurs | « Rien vu, rien entendu, tout compris. » | **fourche** à trois dents, inclinée de 8° ; manche et dents 2 px, pointes effilées, traverse 2 px ; boîte 20 × 28 ; aucun remplissage |
| 2 | Loup-garou | mordu | un notable vote main levée sur la place ; son ombre portée sur le mur est un loup | « Personne n'a voté plus fort que lui. » | **profil de tête humaine** en masse d'aquatinte (24 × 26), bord arrière **mordu** (4 à 6 dents irrégulières), **un seul œil fendu** en réserve (2 × 7) ; ni oreilles pointues, ni crocs |
| 3 | la Voyante | net | une vieille femme au châle ; au-dessus de ses mains, un œil immense flotte comme une lampe ; hiboux et chat dans le noir | « Ce qu'elle voit, nul ne le croit. » | **main ouverte** de face, quatre doigts et pouce ; **œil en amande** (10 × 5, pupille pleine 3) au creux de la paume ; trait 1,5 |
| 4 | la Sorcière | net | elle compte ses deux fioles au-dessus d'un chaudron tripode ; derrière, un balai de bouleau lié | « Elle a sauvé tout le monde, sauf qui il fallait. » | **fiole bouchée** : panse ronde Ø 14, col 4, bouchon plein ; dedans, la **fleur d'aconit** (casque) en réserve ; jamais de chapeau pointu |
| 5 | le Chasseur | net | tombé à terre, il épaule encore ; la fumée de son coup monte au-dessus des têtes | « Il tire mieux mort que vivant. » | **cor de louveterie** enroulé (un tour et demi), pavillon Ø 10 à droite, embouchure à gauche ; trait 2 ; hachures courbes dans le pavillon |
| 6 | Cupidon | net | un enfant aux yeux bandés tire au hasard dans la foule ; deux passants se retrouvent cousus l'un à l'autre [Caprice 2] | « Ils disent oui au premier venu. » | **flèche** à 45° enfilant **deux cœurs** de 8 px en enfilade ; empennage à trois barbes ; cœurs au trait (la garance n'existe que sur la carte grande) |
| 7 | le Salvateur | net | il garde une porte, lanterne levée ; à la fenêtre d'à côté passe une ombre | « Il garde la porte ; on entre par la fenêtre. » | **porte cintrée** (plein cintre) 18 × 26 barrée d'une **planche en diagonale**, deux clous en points |
| 8 | l'Idiot du village | net | on lui ôte la corde du cou ; la foule est déçue | « Gracié, et toujours pas écouté. » | **bonnet à un grelot** : pointe molle retombante, grelot Ø 5 au bout, bord du bonnet en bourrelet |
| 9 | l'Ancien | net | un vieillard se pomponne devant un miroir, la Mort en coiffeuse [Caprice 55] | « Jusqu'à la mort, et une fois de plus. » | **silhouette courbée à la canne** (dos en arc, tête basse, canne verticale 2 px) ; **deux encoches** sur la canne |
| 10 | le Corbeau | net | un corbeau glisse une lettre cachetée sous une porte | « La lettre n'était pas signée. » | **corbeau de profil** posé : bec massif, œil rond réservé (Ø 2), queue coupée en éventail ; corps en hachure serrée `hach-3`, contour net |
| 11 | le Bouc émissaire | net | il s'en va seul sur la lande, chargé du fagot du village | « Il fallait bien quelqu'un. » | **tête de bouc** de face, cornes en lyre, barbiche ; **cordon noué** entre les cornes, à l'encre (jamais rouge) |
| 12 | la Petite Fille | net | derrière une porte entrouverte, elle compte des ombres [Caprice 74] | « Ne crie pas, petite sotte. » *(variante douce si le propriétaire la juge trop dure : « Elle dort d'un œil, et compte de l'autre. »)* | **capuchon en cloche** vu de face ; visage en réserve réduit à **un œil ouvert** (point) et **un œil fermé** (trait) ; capuchon en hachure, jamais rouge |
| 13 | le Loup Blanc | mordu, bruni | un loup clair dîne parmi les siens, tous de dos ; c'est lui qui mange | « Les loups ne se mangent pas entre eux, dit-on. » | gabarit du loup (n° 2) **inversé** : tête en réserve claire cernée d'un trait **mordu des deux côtés** 2 px ; œil fendu en aplat |

Planches liminaires : **frontispice** « Le sommeil de la raison engendre des
loups. » [Caprice 43] (accueil, dos de carte) ; **planche finale** « Il est
l'heure. » [Caprice 80].

### 6.2 Règles de dessin des symboles

- **Grille 32**, zone vive 28 (2 px de marge), centrés optiquement.
- **Village** : trait 2 px, extrémités et jonctions rondes, contours fermés ;
  volumes en `hach-2` (pas 3 à cette taille) seulement dans les formes ≥ 10 px ;
  aucune masse pleine au-delà de 20 % de la surface.
- **Meute** : masse pleine (aquatinte), **aucun contour net**, morsure dessinée
  (§ 4.6) ; une seule réserve claire (l'œil).
- **Détail minimal 2 px** ; lisible en **16 px** dans une version simplifiée
  (sans hachure, trait 1,5) livrée à part.
- `fill`/`stroke` = `currentColor` : le contexte colore (encre, camp de la
  meute, palier-1 pour un mort).
- **Test** : chaque symbole rempli en aplat à 24 px doit rester identifiable
  (test de l'ombre chinoise) ; deux symboles ne partagent pas la même
  silhouette.

### 6.3 Icônes d'interface

Grille **24**, zone vive 20, trait **1,5** `currentColor`, extrémités rondes ;
au plus **une** zone de hachure (3 traits de 0,75) par icône ; aplat ≤ 30 % de
la surface. Aucune icône de bibliothèque (Material, Lucide, Heroicons…) : chaque
icône est redessinée au burin. Le lien retour appartient au cadre commun
(`LienArcade`).

| Icône | Motif | Note |
|---|---|---|
| menu | trois traits de burin de longueurs inégales (16, 13, 15) | jamais trois points |
| ma carte | carte au dos hachuré, coin corné | + « Carte » à côté dès 360 px |
| règles | livret ouvert, deux pages lignées | |
| réglages | **molette de presse** : roue à six rayons et moyeu | pas d'engrenage |
| son / coupé | **cloche** à battant / la même barrée d'un trait | la cloche du village |
| quitter | porte entrouverte, flèche courte qui sort | |
| fil | **phylactère** : banderole ondulée, deux lignes | |
| envoyer | plume d'oie qui écrit | |
| voter | **index pointé** (l'accusation) | |
| s'abstenir | main ouverte, paume face | |
| ne viser personne | mire vide barrée | |
| viser (Chasseur) | **mire** : cercle + quatre repères (ceux de l'état « choisi ») | |
| potion de vie | fiole droite pleine, contenu en réserve claire | |
| potion de mort | fiole à l'aconit, contenu en `hach-3` | |
| potion épuisée | même fiole en pointillé, vide | |
| bouclier | **écu à pans coupés** (la forme du cartouche du village) | |
| bouclier barré | le même, trait oblique | état « interdit » |
| œil (sonder) | amande, pupille pleine, cinq cils gravés | |
| lacs | deux anneaux entrelacés | serment |
| brassard | trapèze « ×2 » | capitaine |
| plume (marquer) | plume de corbeau | Corbeau |
| mâchoire (trahir) | mâchoire ouverte, dents mordues | Loup Blanc |
| porte entrouverte | porte, rai de lumière en hachure | Petite Fille |
| chandelle soufflée | chandelle, deux volutes de fumée | mort |
| corde coupée | nœud coulant tranché | gracié |
| sablier | sablier, sable en hachure ; retourné en urgence | minuterie |
| registre | livre fermé à fermoir | journal |
| aide | « ? » dans un écu | P2-16 |
| reconnexion / hors ligne | fil renoué / fil coupé | bandeau réseau |
| pâté d'encre | tache irrégulière | avis d'erreur |

### 6.4 Légendes d'écran et du récit

Le graveur légende les **planches** (moments plein écran ou zones de légende),
pas les commandes.

| Écran | Légende |
|---|---|
| Accueil, dos de carte | « Le sommeil de la raison engendre des loups. » |
| Salon | « Assis en rond, comme d'honnêtes gens. » |
| Révélation | « Nul ne se connaît. » [Caprice 6] |
| Nuit — dormeur (zone de consigne) | « Dormez : d'autres veillent pour vous. » |
| Nuit et jour — mort | « Tout voir, enfin, et trop tard. » |
| Aube avec morts | « Personne ne nous a vus. » [Caprice 79] |
| Aube paisible | « Tous sont là. Personne n'est rassuré. » |
| Élection | « Qui parle le plus fort porte le brassard. » |
| Jour — vote | « Tous d'accord, donc tous innocents. » |
| Dépouillement | « Les voix sont comptées ; les raisons, jamais. » |
| Chasseur (attente) | « Il tire mieux mort que vivant. » |
| Succession | « Le brassard change de bras, pas d'idée. » |
| Bouc (dernier mot) | « Il fallait bien quelqu'un. » |
| Fin | « Il est l'heure. » [Caprice 80] |
| Table disparue | « La table s'est levée sans vous. » |

**La nuit racontée** : chaque planche (un bloc nuit ou jour du log) prend la
légende du **premier** évènement présent dans cet ordre, et la vignette
associée (96 × 96, lot C) :

| Priorité | Évènement du log | Légende | Vignette |
|---|---|---|---|
| 1 | `loupBlanc` (cible) | « Les loups ne se mangent pas entre eux, dit-on. » | mâchoire |
| 2 | `rancune` | « Le village a scié sa propre branche. » | branche sciée |
| 3 | `poison` | « Deux fioles, et la mauvaise. » | fiole d'aconit |
| 4 | `tir` (cible) | « Il tire mieux mort que vivant. » | cor fumant |
| 5 | `mort`, cause `chagrin` | « Jusqu'à la mort, et pas un jour de plus. » | lacs dénoués |
| 6 | `grace` | « Gracié, et toujours pas écouté. » | corde coupée |
| 7 | `bouc` | « Il fallait bien quelqu'un. » | tête de bouc |
| 8 | `vote` (condamné de la meute) | « Pour une fois. » | potence |
| 9 | `vote` (condamné du village) | « Tous d'accord, donc tous innocents. » | potence |
| 10 | `sauvetage` | « La fiole a servi ; nul ne l'a su. » | fiole de vie |
| 11 | `loups` (cible) suivie d'une mort | « Personne ne nous a vus. » | yeux dans le noir |
| 12 | `resistance` | « Jusqu'à la mort, et une fois de plus. » | canne à deux encoches |
| 13 | `protection` sur la cible des loups | « Pour une fois, la bonne porte. » | porte barrée |
| 14 | `corbeau` | « La lettre n'était pas signée. » | lettre cachetée |
| 15 | `voyance` (rôle de la meute) | « Ce qu'elle voit, nul ne le croit. » | main à l'œil |
| 16 | `amoureux` | « Ils disent oui au premier venu. » | flèche et deux cœurs |
| 17 | défaut, nuit | « Le sommeil de la raison engendre des loups. » | le dormeur |
| 18 | défaut, jour | « Ils ont parlé longtemps. » | la place vide |
| — | dernière planche | « Il est l'heure. » | sablier vide |

Ces textes entrent dans le skin (nouveau champ `legendes`, § 14) ; un skin
qui en manque est refusé par le registre, comme pour les autres textes.

---

## 7. Écrans et lots

### 7.1 Le gabarit unique

**Mobile 390 × 844 — partie (jour et nuit, tous les sièges).** C'est la loi
N1 en pixels : la nuit, rien ne bouge d'une ligne d'un siège à l'autre.

| Zone | y | Hauteur | Contenu |
|---|---|---|---|
| barre système | 0 | 47 | heure « 9:41 », sur `--fond` |
| frise / en-tête | 47 | 56 | § 5.7 |
| minuterie | 103 | 24 | § 5.6 — toujours présente |
| crieur | 127 | 56 | § 5.8 |
| consigne | 183 | 72 | `--t-jeu`, 3 lignes ; chez qui n'a rien à faire : la **légende** du moment |
| place | 255 | 415 | 8 + **399 utiles** + 8 ; § 5.16 |
| résumé | 670 | 24 | « Votre voix : Anna · 7 sur 11 » ; vide si rien à résumer (la ligne reste) |
| pli | 694 | 44 | § 5.14 |
| barre au pouce | 738 | 72 | § 5.5 |
| indicateur d'accueil | 810 | 34 | — |

Fil ouvert au tiers : crieur + consigne se replient en **une ligne de 40**,
la place passe en D4 (316), le fil prend 232. Sous 360 px de large : gouttière
12, D4, crieur sur une ligne. Les écrans hors partie (accueil, salon) gardent
la frise, la barre au pouce et la gouttière, et organisent librement le milieu.

**Desktop 1440 × 900.** Frise 64 sur toute la largeur (minuterie dedans, à
droite de l'heure) · crieur 56 au-dessus de la place · **place** x 32-1036,
y 120-868 (1 004 × 748), cercle autour du **pupitre** (360 × 200) · **colonne
droite** x 1068-1408 (340), y 80-868 : le fil le jour ; la nuit, la même
colonne pour tous — « Le registre », ou le canal que la vue ouvre (meute,
serment, au-delà).

### 7.2 Conventions des artboards

- Fichier `Caprices-<Lot>-<Nom>.dc.html`, page **« Caprices »** du canevas,
  même squelette que `C-Caprices.dc.html` (`support.js`, `<x-dc>`, `<helmet>`
  avec le lien Google Fonts du § 3.6, `data-props` `$preview` à la taille de
  l'artboard).
- **Les `<defs>` de `textures.svg` sont collées telles quelles** en tête de
  chaque artboard (un seul jeu d'identifiants pour les quatre designers).
- L'artboard **est** l'écran : pas de cadre de téléphone, pas de coins
  arrondis, pas de planche autour. Annotations éventuelles **hors** de
  l'artboard, sur le canevas.
- **Textes réels** de `skins/thiercelieux.ts` et des § 6.1/6.4, en français ;
  jamais de faux texte. Pseudos de la partie témoin (§ 7.3).
- Tout composant inventé faute de spec est dessiné, puis signalé au lot F
  (« à remonter ») : F tranche, les autres s'alignent.
- Espacement du canevas : **80 px entre colonnes, 120 entre rangées.**

### 7.3 La partie témoin (identique pour tous les lots)

**Table de 12**, code de table **`VRGL`** :

| Siège | Pseudo | Couvre-chef | Rôle | État au Jour II |
|---|---|---|---|---|
| 1 | Anna | tricorne | Villageois·e, **amoureuse** d'Étienne | vivante |
| 2 | Bastien | mantille | **Loup-garou** | vivant |
| 3 | Clément | bonnet de nuit | Villageois·e | **mort** nuit I (dévoré), rôle révélé |
| 4 | Delphine | coroza | le Salvateur | vivante |
| 5 | Étienne | chambergo | Villageois·e, **capitaine**, amoureux d'Anna | vivant |
| 6 | Fanny | montera | Cupidon | vivante |
| 7 | Gaspard | capuche | le Chasseur | vivant |
| 8 | Hélène | cofia | la Sorcière | vivante |
| 9 | Inès | bicorne | l'Idiot du village | vivante |
| 10 | Jules | turban | **Loup-garou** | **exécuté** Jour I, rôle révélé |
| 11 | Tom | boina | la Voyante (carnet : N I Clément → Villageois·e ; N II Bastien → Loup-garou) | vivant |
| 12 | Léa | catogan | Villageois·e | vivante |

**Table de 18** : la même + Malo (haut-de-forme, le Corbeau), Nour (fichu, la
Petite Fille), Octave (calotte, le Loup Blanc — vu « loup » par la meute),
Paulette (cornette, l'Ancien), Quentin (paille, le Bouc émissaire), Rose
(plumet, Villageois·e). **Table de 6** : Anna, Bastien, Clément, Delphine,
Étienne, Tom.

Chaque artboard dit **« vous = »** : le siège dont on voit l'écran.

### 7.4 Plan du canevas (page « Caprices »)

| Rangée | y | Contenu | Pas des colonnes |
|---|---|---|---|
| 0 | 0 | planche d'origine `C-Caprices` (0, 0) **archivée, intouchable** ; puis lot **F**, 7 planches 1600 × 1400 | 1 680 |
| 1 | 1 520 | lot **C** : 5 planches 1600 × 1400, puis 11 écrans mobiles | 1 680, puis 470 |
| 2 | 3 040 | lot **C** : 2 écrans desktop | 1 520 |
| 3 | 4 060 | lot **E1** : 12 écrans mobiles | 470 |
| 4 | 5 024 | lot **E1** : 13 écrans mobiles | 470 |
| 5 | 5 988 | lot **E1** : 4 écrans desktop | 1 520 |
| 6 | 7 008 | lot **E2** : 13 écrans mobiles | 470 |
| 7 | 7 972 | lot **E2** : 13 écrans (dont 320 × 568 et 844 × 390) | 470 |
| 8 | 8 936 | lot **E2** : 5 écrans desktop | 1 520 |

Charge : F = 7 planches de système ; C = 5 planches de cartes + 13 écrans ;
E1 = 29 écrans ; E2 = 31 écrans. Les planches de F et de C valent chacune
trois à quatre écrans.

### 7.5 Lot F — Fondations (designer 1)

Planches **1600 × 1400**, y = 0. Livre ce que les trois autres consomment ;
il **dessine** la spec, il ne la réinvente pas.

| Fichier | (x, y) | Contenu attendu |
|---|---|---|
| `Caprices-F-Encres.dc.html` | (1680, 0) | primitifs ; sémantiques des deux tirages côte à côte ; **chaque paire du § 3.4** composée en spécimen à sa taille plancher, ratio écrit ; bande de simulation daltonienne ; filmstrip de la morsure (vergé → IV) et de l'aube ; illustration de N3 (plafond de clarté) |
| `Caprices-F-Lettres.dc.html` | (3360, 0) | l'échelle du § 3.6 en vrai, colonnes mobile / desktop ; planchers ; crieur contre graveur ; code de table ; « IM Fell jamais dans une phrase » montré par l'exemple et le contre-exemple |
| `Caprices-F-Matieres.dc.html` | (5040, 0) | § 4 : quatre paliers, hachures, courbes, cuvette jour/nuit, papier et rousseurs, mordu filtré (≥ 96) contre dessiné (32), brunissage en 6 images, mort en 3 crans, aube en 4 paliers |
| `Caprices-F-Jeton.dc.html` | (6720, 0) | les 17 états du § 5.1.4 en D1 et D3, papier ; le sous-ensemble nocturne en cuivre ; les 9 combinaisons ; les **18 couvre-chefs** à 72 et 40, plus leur test d'ombre chinoise ; les 4 densités en grille réelle (6, 12, 18 joueurs) |
| `Caprices-F-Commandes.dc.html` | (8400, 0) | boutons (6 variantes × états × 2 tirages) ; barre au pouce (vote, armé, dormeur, acteur de nuit) ; minuterie (4 variantes × 2 tirages) ; cartouches (6 × 2 tirages × 30/20 px) ; champ, code, case gravée |
| `Caprices-F-Voix.dc.html` | (10080, 0) | frise jour / nuit à 390 et 1440 ; crieur ; légende ; registre ; fil (4 canaux, onglets, messages, saisie) ; pli (4 libellés) ; bandeau réseau (5 états) ; feuille basse ; avis (info, refus) ; voile |
| `Caprices-F-Icones.dc.html` | (11760, 0) | les 30 icônes du § 6.3 sur grille 24 avec traits de construction, à 24 et 44 (cible) ; glyphes d'état 16 ; jeu final en SVG prêt à copier |

### 7.6 Lot C — Cartes (designer 2)

Planches 1600 × 1400 en rangée 1, écrans mobiles 390 × 844 à la suite, desktop
1440 × 900 en rangée 2.

| Fichier | Taille | (x, y) | Composition |
|---|---|---|---|
| `Caprices-C-Faces-1.dc.html` | 1600 × 1400 | (0, 1520) | cartes **grandes** 1 à 7 (§ 6.1), anatomie du § 5.2, version v1 « planche typographique » (symbole 128 sur `hach-1`) **et** zone d'illustration esquissée au trait ; légende sous chaque carte |
| `Caprices-C-Faces-2.dc.html` | 1600 × 1400 | (1680, 1520) | cartes 8 à 13 ; **dos** (papier et cuivre) ; face Loup Blanc mordue des deux côtés |
| `Caprices-C-Formats.dc.html` | 1600 × 1400 | (3360, 1520) | pour les 13 : petite, vignette, symbole 32 / 24 / 16 (simplifié) ; faces en **tirage cuivre** (loup, Voyante, Villageois·e) ; carte morte brunie ; les états R0 → R5 de la révélation en vignettes ; les cartouches de camp en usage sur carte |
| `Caprices-C-Vignettes.dc.html` | 1600 × 1400 | (5040, 1520) | les **18 vignettes** de la nuit racontée (§ 6.4) à 96 et 3 d'entre elles à 192 ; le frontispice (dormeur du Caprice 43) à 358 × 160 pour l'accueil |
| `Caprices-C-Shiganshina.dc.html` | 1600 × 1400 | (6720, 1520) | § 8 : 13 symboles, 3 faces (Titan, l'Éclaireuse, Habitant·e), dos aux Portes, frise du Mur, 6 coiffes du district |
| `Caprices-C-Revelation-Dos.dc.html` | 390 × 844 | (8400, 1520) | vous = Tom. Cuivre. Frise « Nuit I », minuterie de révélation, crieur « Les cartes sont distribuées, face contre table. À vous de les retourner. », **dos** grand centré (y 196), légende « Nul ne se connaît. », barre : appui long « Gardez le pouce : retourner la carte » |
| `Caprices-C-Revelation-Appui.dc.html` | 390 × 844 | (8870, 1520) | vous = Tom (la Voyante). État **R3** : pouce posé, face visible ; à la révélation **seulement**, le brunissage va jusqu'au papier (tous les sièges font le même geste : aucune clarté ne désigne un rôle — exception à N3, propre à cette phase) ; périmètre qui décompte (6 s) ; description sous la carte |
| `Caprices-C-Revelation-Loup.dc.html` | 390 × 844 | (9340, 1520) | vous = Bastien (Loup-garou). R3 : face mordue ; sous la description, « Votre meute : Jules » (cartouche mordu 20 + nom) |
| `Caprices-C-Revelation-Pret.dc.html` | 390 × 844 | (9810, 1520) | vous = Tom. R5 : dos revenu ; « Je sais qui je suis » actif au-dessus de l'appui long ; après le toucher, statut « Les autres retournent leur carte. » — aucun compteur |
| `Caprices-C-Revelation-Spectateur.dc.html` | 390 × 844 | (10280, 1520) | spectateur : place (grille, non interactive), crieur, légende ; emplacement de « Ma carte » vide ; aucune carte |
| `Caprices-C-MaCarte-Jour.dc.html` | 390 × 844 | (10750, 1520) | vous = Anna, Jour II, pouce sur « Carte » : carte **moyenne** papier par-dessus la place, périmètre 8 s ; la place brunie montre les **lacs** sur Étienne ; « Votre âme sœur : Étienne » en cartouche lacs |
| `Caprices-C-MaCarte-Nuit.dc.html` | 390 × 844 | (11220, 1520) | vous = Tom, Nuit III, pouce sur la barre : face en **tirage cuivre** ; le carnet s'imprime sur les jetons (Clément : écu « Villageois·e » ; Bastien : mordu craie « Loup-garou », 20 px) — le seul endroit où la craie paraît sur la place, sous le pouce |
| `Caprices-C-Fin-Verdict.dc.html` | 390 × 844 | (11690, 1520) | vous = Tom. Papier. « Il est l'heure. » ; cartouche **écu** « Le village » 240 × 56 ; « Le village a triomphé : plus un loup ne rôde autour de Thiercelieux. » ; « Vous avez gagné » ; amorce des sections suivantes |
| `Caprices-C-Fin-Distribution.dc.html` | 390 × 844 | (12160, 1520) | les 12 **petites cartes**, 3 colonnes ; pseudo + sort (« dévoré·e nuit I », « exécuté·e jour I ») ; gagnants en double filet |
| `Caprices-C-Fin-NuitRacontee.dc.html` | 390 × 844 | (12630, 1520) | portfolio : frontispice « Nul ne se connaît. », puis Pl. 1 « Nuit I » ouverte (vignette yeux, « Personne ne nous a vus. » — priorité 11 du § 6.4, lignes du récit dont le lien de Cupidon), Pl. 2-4 repliées sur titre + légende |
| `Caprices-C-Fin-Planche.dc.html` | 390 × 844 | (13100, 1520) | une planche en plein écran : « Pl. 3 — Nuit II », vignette 192 (main à l'œil), « Ce qu'elle voit, nul ne le croit. », lignes ; navigation « ‹ Pl. 3 · Pl. 5 › » dans la barre |
| `Caprices-C-Revelation-Desktop.dc.html` | 1440 × 900 | (0, 3040) | cuivre ; carte grande au centre de la zone de place ; description et (pour la meute) complices à droite dans la colonne ; appui long à la souris ou Espace tenu |
| `Caprices-C-Fin-Desktop.dc.html` | 1440 × 900 | (1520, 3040) | verdict à gauche (cuvette 420 de large) ; distribution en 6 colonnes ; nuit racontée en 3 planches par rangée (défilement permis à la fin seulement) |

### 7.7 Lot E1 — Hors partie et nuit (designer 3)

Mobile 390 × 844, desktop 1440 × 900. Noms de fichier : ajouter `.dc.html`.
Rangée 3 (y = 4 060) puis 4 (y = 5 024), pas de 470 ; desktop en rangée 5
(y = 5 988), pas de 1 520. **La nuit, chaque
artboard suit le gabarit du § 7.1 au pixel** ; les quatre écrans
`Nuit-Dort`, `Nuit-Meute`, `Nuit-Voyante`, `Nuit-Dort-Serment` posés côte à
côte, à 25 % de zoom, doivent paraître identiques (N4).

| Fichier | (x, y) | Vous | Composition et variantes |
|---|---|---|---|
| `Caprices-E1-Accueil` | (0, 4060) | — | papier ; `DosDeBoite` du cadre en tête, habillé de la frise et du **frontispice** (358 × 160) ; légende du Caprice 43 ; champ pseudo (pas d'autofocus) ; barre : « Ouvrir une table » (primaire) au-dessus de « Rejoindre » (secondaire) ; mention « rien ne se joue à moins de six » en statut |
| `Caprices-E1-Accueil-Rejoindre` | (470, 4060) | — | clavier iOS ouvert (291) ; le code en **4 cases** juste au-dessus ; « Rejoindre la table » visible au-dessus du clavier ; avis « Refusé : aucune table à ce code. » |
| `Caprices-E1-Salon-Joueur` | (940, 4060) | Léa | papier ; frise dont **une fenêtre s'allume par arrivée** ; « La table VRGL » + « Assis en rond, comme d'honnêtes gens. » ; sièges en jetons D3 (couvre-chefs) ; composition lue (« 2 loups · la Voyante · la Sorcière… » en vignettes) ; options en lecture (cases gravées inactives) ; barre : bouton éteint « En attente de l'hôte » + raison |
| `Caprices-E1-Salon-Hote-Table` | (1410, 4060) | Tom, hôte | étapes en cartouches « La table · La donne · Les règles » ; code `--t-code` + « Partager » ; 5 sièges sur 6 ; barre : « Suivant : la donne » **éteint**, raison « Il manque 1 joueur » |
| `Caprices-E1-Salon-Hote-Composition` | (1880, 4060) | Tom | « La donne » : mode automatique (3 suggestions en cartouches : la référence, la chasse, le village outillé, avec leur ligne d'ambiance) ; mode manuel en encart : nombre de loups (− / + 48 px), 13 petites cartes à cocher, les optionnelles marquées « optionnel » ; résumé de composition |
| `Caprices-E1-Salon-Hote-Options` | (2350, 4060) | Tom | « Les règles » : les 8 cases gravées de `Salon.tsx` avec leur indication ; minuteries nuit (15-120 s) et jour (60-900 s) en pas à pas ; choix du skin en trois petites planches (Thiercelieux, Shiganshina, Gilets Jaunes) |
| `Caprices-E1-Salon-Hote-Lancer` | (2820, 4060) | Tom | 12 assis ; récapitulatif ; barre : « Lancer la partie » actif |
| `Caprices-E1-Regles` | (3290, 4060) | Tom | feuille basse à 90 % sur un écran de jour : le but, le déroulé, les rôles (petites cartes + description), les réglages de la table en clair |
| `Caprices-E1-Reglages` | (3760, 4060) | Tom | feuille : **« Le jour s'imprime sur : Papier · Cuivre »** (deux vignettes), minuterie barre / discrète, mouvement réduit, grand texte, vibrations, fil ouvert par défaut |
| `Caprices-E1-Nuit-Tombe` | (4230, 4060) | Anna | l'instant de la morsure II : tout l'écran au palier II, le crieur « La nuit tombe sur Thiercelieux. Le village s'endort. » en train de s'écrire ; les 4 images de la morsure en vignettes **hors** artboard |
| `Caprices-E1-Nuit-Dort` | (4700, 4060) | Anna | gabarit unique, cuivre : « Nuit II », minuterie **absente**, crieur, consigne = légende « Dormez : d'autres veillent pour vous. », place D2 non interactive (Clément et Jules brunis), résumé vide, pli « Le registre », barre : appui long « Gardez le pouce : ma carte » |
| `Caprices-E1-Nuit-Dort-Mort` | (5170, 4060) | Clément | idem ; son jeton bruni dans le cadre « moi » ; consigne = « Tout voir, enfin, et trop tard. » ; pli « L'au-delà · 4 » |
| `Caprices-E1-Nuit-Dort-Serment` | (0, 5024) | Anna | identique à `Nuit-Dort` **au pixel**, sauf le pli : « Le serment · 2 » (cartouche lacs) |
| `Caprices-E1-Nuit-PetiteFille` | (470, 5024) | Nour | table de 18, D3 ; aucune consigne (R95) : légende du dormeur ; sur les jetons visés, l'**œil + chiffre** en NE (« 2 », « 1 ») ; résumé « Porte entrouverte » avec son icône |
| `Caprices-E1-Nuit-Meute` | (940, 5024) | Bastien | table de 18 ; consigne `devorer` ; minuterie qui court ; Bastien et Octave non choisissables (rien d'autre ne les distingue) ; pastilles « B·O » sur Fanny ; résumé « Votre choix : Fanny · la meute : Fanny (2) » ; pli « La meute · 1 » ; barre : « Ne viser personne » / « Dévorer Fanny » |
| `Caprices-E1-Nuit-Meute-Fil` | (1410, 5024) | Bastien | idem, fil de la meute ouvert au tiers : place D4, crieur + consigne sur une ligne, trois messages (noms en craie, filet dentelé) |
| `Caprices-E1-Nuit-Voyante` | (1880, 5024) | Tom | consigne `sonder` ; Bastien **choisi** ; barre : un seul bouton « Sonder Bastien » (la Voyante ne peut pas passer son tour : pas de bouton « personne ») |
| `Caprices-E1-Nuit-Voyante-Lecture` | (2350, 5024) | Tom | après l'étape : barre = appui long « Gardez le pouce : lire le carnet » **tenu** ; le jeton de Bastien bruni **au palier III** avec cartouche mordu craie 20 « Loup-garou » ; rien de clair au-delà de N3 |
| `Caprices-E1-Nuit-Sorciere` | (2820, 5024) | Hélène | consigne `sorciere` (victime : Fanny) ; Fanny porte la **mire** ; résumé « Vie : 1 · Mort : 1 » (fioles) ; barre : « Ne rien faire » / « Sauver Fanny » ; empoisonner = toucher un autre jeton, le primaire devient « Empoisonner … » |
| `Caprices-E1-Nuit-Sorciere-SansVictime` | (3290, 5024) | Hélène | consigne sans victime ; fiole de vie **épuisée** (pointillé) ; Léa choisie ; primaire **armé** « Confirmer — sans retour : empoisonner Léa » |
| `Caprices-E1-Nuit-Salvateur` | (3760, 5024) | Delphine | consigne `proteger.interdit` (« Fanny dormait sous votre bouclier hier… ») ; Fanny en état **interdit** ; Gaspard choisi ; barre « Protéger Gaspard » |
| `Caprices-E1-Nuit-Cupidon` | (4230, 5024) | Fanny | Nuit I ; deux choisis (Anna, Étienne) reliés par un **lacs** provisoire ; primaire armé « Confirmer : lier Anna et Étienne » |
| `Caprices-E1-Nuit-Corbeau` | (4700, 5024) | Malo | table de 18 ; consigne `marquer` ; Bastien choisi ; barre « Ne marquer personne » / « Marquer Bastien » |
| `Caprices-E1-Nuit-LoupBlanc` | (5170, 5024) | Octave | Nuit II ; consigne `trahir` ; seul Bastien choisissable ; barre « Épargner la meute » / « Dévorer Bastien » (armé : « sans retour ») |
| `Caprices-E1-Nuit-Recap` | (5640, 5024) | Delphine | après le choix : résumé « Bouclier posé sur Gaspard. Vous pouvez changer tant que l'étape court. » ; barre : « Changer » (secondaire) ; place non interactive |
| `Caprices-E1-Accueil-Desktop` | (0, 5988) | — | 1440 × 900 ; à gauche le frontispice en planche (cuvette 640 × 720) ; à droite `DosDeBoite`, pseudo, ouvrir / rejoindre |
| `Caprices-E1-Salon-Desktop` | (1520, 5988) | Tom, hôte | trois colonnes : la table (jetons en cercle), la donne, les règles ; « Lancer la partie » en bas de la colonne centrale |
| `Caprices-E1-Nuit-Dort-Desktop` | (3040, 5988) | Anna | gabarit desktop, cuivre ; cercle non interactif ; pupitre portant la légende du dormeur ; colonne « Le registre » |
| `Caprices-E1-Nuit-Meute-Desktop` | (4560, 5988) | Bastien | même gabarit **au pixel** ; pupitre : consigne + boutons ; colonne : le fil de la meute |

### 7.8 Lot E2 — Le jour et les états transverses (designer 4)

Mobile 390 × 844 sauf mention, desktop 1440 × 900 ; noms de fichier : ajouter
`.dc.html`. Rangées 6 (y = 7 008) et 7 (y = 7 972), pas de 470 ; desktop
rangée 8 (y = 8 936), pas de 1 520. Papier sauf mention.

| Fichier | (x, y) | Vous | Composition et variantes |
|---|---|---|---|
| `Caprices-E2-Aube-Planche` | (0, 7008) | Tom | l'aube en **planche** (3-5 s, « Toucher pour passer ») : cuvette à 24 px, vignette « yeux » 96, « Aube II », « Personne ne nous a vus. », crieur : « La meute a dévoré Clément — c'était Villageois·e. » (chandelle soufflée) ; derrière, l'écran de jour |
| `Caprices-E2-Aube-Paisible` | (470, 7008) | Tom | même planche, vignette du dormeur, « Tous sont là. Personne n'est rassuré. », « Personne n'est mort cette nuit. Le village se réveille entier. » |
| `Caprices-E2-Aube-Corbeau` | (940, 7008) | Rose | table de 18 ; deux lignes : une mort + « Le Corbeau a désigné Bastien : au vote du jour, deux voix sont déjà comptées. » ; vignette lettre cachetée |
| `Caprices-E2-Election` | (1410, 7008) | Tom | Jour I ; consigne `voter.election` ; soi **choisissable** (état moi + choisi possible) ; Étienne choisi ; barre « S'abstenir » / « Élire Étienne » |
| `Caprices-E2-Jour-6` | (1880, 7008) | Tom | table de 6, **D1** ; même scène que `Jour-12` |
| `Caprices-E2-Jour-12` | (2350, 7008) | Tom | **l'écran de référence** : Jour II, D2 ; Clément et Jules morts (cartouches publics), Étienne capitaine + a voté, cinq « a voté » en tout, Inès vivante sans signe (la grâce a son propre écran, `Jour-Gracie`) ; Anna **choisie** ; résumé « Votre voix : Anna · 6 sur 10 » ; pli « Le village · 3 » ; barre « S'abstenir » / « Voter contre Anna » |
| `Caprices-E2-Jour-18` | (2820, 7008) | Rose | table de 18, **D3** ; Bastien **marqué +2** ; Paulette **absente · 23 s** ; aucun défilement |
| `Caprices-E2-Jour-Arme` | (3290, 7008) | Tom | `Jour-12`, primaire **armé** : « Confirmer : Anna à la potence » ; filet de 4 s sous le bouton |
| `Caprices-E2-Jour-Abstention` | (3760, 7008) | Tom | `Jour-12`, secondaire armé : « Confirmer l'abstention » |
| `Caprices-E2-Jour-Fil-Tiers` | (4230, 7008) | Tom | fil ouvert au tiers : D4, crieur + consigne sur une ligne, 4 messages du village |
| `Caprices-E2-Jour-Fil-Plein` | (4700, 7008) | Anna | fil plein écran ; onglets « Le village » / « Le serment » (actif) ; résumé du vote épinglé en tête |
| `Caprices-E2-Jour-Mort` | (5170, 7008) | Clément | pas de vote : consigne = « Tout voir, enfin, et trop tard. » ; place non interactive ; barre : appui long « ma carte » ; pli « L'au-delà · 4 » |
| `Caprices-E2-Jour-12-Cuivre` | (5640, 7008) | Tom | `Jour-12` en **tirage cuivre** : le repli de l'amendement D11 et le réglage « Cuivre » |
| `Caprices-E2-Jour-Gracie` | (0, 7972) | Inès | après la grâce : son jeton gracié (corde coupée + cartouche « l'Idiot du village ») ; barre : bouton éteint, raison « La grâce vous a coûté votre voix. » |
| `Caprices-E2-Jour-Bouc-Votants` | (470, 7972) | Rose | table de 18, le lendemain du Bouc : désignés « votera » (index), les autres « ne vote pas » (médaillon barré) ; Rose hors vote : barre éteinte, raison « Le Bouc émissaire ne vous a pas désigné·e. » |
| `Caprices-E2-Depouillement` | (940, 7972) | Tom | planche « Les voix sont comptées » : par cible, des **bâtons gravés** (un trait par voix ; la voix du capitaine en double trait ; les +2 du Corbeau marqués d'une plume) et les votants en statut ; verdict du crieur ; la petite carte d'Anna se retourne ; légende « Les voix sont comptées ; les raisons, jamais. » |
| `Caprices-E2-Chasseur-Tireur` | (1410, 7972) | Gaspard | sa carte retournée dans le crieur ; consigne `tirer` ; Bastien choisi ; barre « Tirer en l'air » / « Tirer sur Bastien » (armé : « sans retour ») |
| `Caprices-E2-Chasseur-Attente` | (1880, 7972) | Anna | crieur « Le Chasseur rend l'âme, la main sur la gâchette… » ; consigne = « Il tire mieux mort que vivant. » ; minuterie **absente** ; place non interactive |
| `Caprices-E2-Succession` | (2350, 7972) | Étienne | mort, brassard sur son jeton bruni ; consigne `successeur` ; Léa choisie ; barre « Transmettre à Léa » (armé) |
| `Caprices-E2-Bouc-DernierMot` | (2820, 7972) | Quentin | table de 18 ; sélection **multiple** ; résumé « 3 votants : Anna, Léa, Rose » ; barre « Se taire » / « Désigner ces 3 votants » |
| `Caprices-E2-Menu-Table` | (3290, 7972) | Tom | feuille : « Table VRGL », Règles, Réglages, Aide, Quitter → **armé** « Oui, quitter » à côté de « Rester » |
| `Caprices-E2-Journal` | (3760, 7972) | Tom | feuille « Le registre » : Jour II ouvert, Nuit II, Jour I, Nuit I |
| `Caprices-E2-Reseau-Reconnexion` | (4230, 7972) | Tom | `Jour-12` + bandeau 32 « Reconnexion… » ; son jeton en état reconnexion |
| `Caprices-E2-Reseau-TableDisparue` | (4700, 7972) | Tom | écran plein « La table s'est levée sans vous. » + « Retour à l'accueil » ; variante « double onglet » en encart hors artboard |
| `Caprices-E2-Etroit-320` | (5170, 7972) | Tom | **320 × 568** : `Jour-12` en D4, gouttière 12, crieur sur une ligne, consigne 2 lignes, « Carte » en icône seule |
| `Caprices-E2-Paysage` | (5640, 7972) | Tom | **844 × 390** : deux colonnes — place D4 à gauche, à droite crieur, consigne, résumé, barre |
| `Caprices-E2-Jour-Cercle-12` | (0, 8936) | Tom | 1440 × 900 : gabarit desktop ; cercle de 12 (m 72) ; pupitre : consigne, résumé, « S'abstenir » / « Voter contre Anna » ; colonne fil + barre de vote épinglée |
| `Caprices-E2-Jour-Cercle-18` | (1520, 8936) | Rose | cercle de 18 (m 56), marque +2, absent |
| `Caprices-E2-Depouillement-Desktop` | (3040, 8936) | Tom | planche du dépouillement au centre du cercle (les voix en bâtons partent de chaque votant vers sa cible) |
| `Caprices-E2-Chasseur-Desktop` | (4560, 8936) | Gaspard | cercle ; pupitre : consigne `tirer` ; mire sur la cible |
| `Caprices-E2-Scene-TV` | (6080, 8936) | — | écran partagé **sans secret** (TV au centre de la table) : frise, place en grand cercle, crieur en `--t-planche`, « 7 sur 11 ont voté » ; ni consigne, ni fil secret, ni minuterie de siège |

---

## 8. Le skin Shiganshina dans cette grammaire

Le second habit ne change que les **valeurs sémantiques**, les **motifs** et
les **mots** ; la grammaire est la même pièce.

**Référence** : Goya, *Les Désastres de la guerre* (1810-1820) et *El Coloso* —
pas d'héroïsme, des corps, des légendes sèches. La règle-signature : **un Titan
est toujours trop grand pour le cadre** — toute figure de Titan déborde la
cuvette d'au moins 20 % de sa hauteur, coupée par le bord de la planche.

| Ce qui change | Valeur |
|---|---|
| encre (bistre-900) | `#141614` noir de fumée |
| papier (vergé) | `#E4E0D4` papier de munition — encre dessus **13,78:1** |
| bruni | `#F1EFE8` — encre dessus **15,81:1** |
| cuivre en relief (bistre-800) | `#262926` — papier dessus **11,15:1** |
| meute → **les Titans** | **même sanguine** : c'est la vapeur. `#A23B24` sur papier 4,99:1 · craie `#D9765A` sur encre 5,79:1, sur relief 4,69:1 |
| serment → **le pacte** | même garance (5,60:1 sur papier · 7,72:1 sur encre) |
| narrateur | délavé `#5E554A` sur papier **5,54:1** ; palier-1 sur encre **6,81:1** |
| vert du Bataillon | `#45523F`, **en hachure à 45° seulement** (`hach-vert`), jamais en aplat ni en texte ; la nuit `#8FA07E` (6,49:1 sur encre) |
| la frise | **le Mur** : chemin de ronde crénelé à la place des toits ; la nuit, une tête de Colosse derrière le Mur, en aquatinte, yeux brunis au palier III |
| dos de carte | la Porte du district, battants clos, au trait vergé sur aquatinte IV |
| couvre-chefs | les 18 coiffes du district : capuche du Bataillon (manteau à capuche), képi de la Garnison, casquette de la Brigade, foulard de marchande, toque de boulanger, casque de mineur… (même règle d'ombre chinoise) |
| loups-garous des planches | Colosses nus, sans visage expressif, coupés par le cadre ; vapeur en traits de sanguine |
| mots des cartouches | « District », « Titans », « Le pacte », « Les Chemins » |

**Légendes** (titres des *Désastres* quand ils existent, entre crochets) :

| Rôle | Légende |
|---|---|
| Habitant·e du district | « Tristes pressentiments. » [Désastre 1] |
| Titan | « On ne sait pas pourquoi. » [Désastre 35] |
| l'Éclaireuse | « Je l'ai vu. » [Désastre 44] |
| la Scientifique | « Ceci est pire. » [Désastre 37] |
| le Caporal | « Et il n'y a pas de remède. » [Désastre 15] |
| Ymir | « Avec raison ou sans. » [Désastre 2] |
| la Sentinelle | « Elle garde la Porte ; ils passent par le Mur. » |
| la Goinfre | « Graciée, la bouche pleine. » |
| le Vétéran | « Il en a vu d'autres. Il en verra moins. » |
| le Brigadier | « Enterrer et se taire. » [Désastre 18] |
| l'Eldien | « C'est pour cela que vous êtes nés. » [Désastre 12] |
| la Recrue | « On ne peut pas regarder. » [Désastre 26] |
| le Titan Mâchoire | « Les Titans ne se mangent pas entre eux, dit-on. » |
| accueil / fin | « Ils étaient trop grands pour la place. » / « Rien. Le temps le dira. » [Désastre 69] |

**Ce qui ne change jamais**, d'un skin à l'autre : la grammaire du trait
(§ 2.3) ; les formes des cartouches ; les 17 états du jeton et leurs
emplacements ; le gabarit unique et les lois N1-N6 ; l'échelle typographique,
la grille, les rayons à 0, l'absence d'ombre ; la mécanique du mouvement
(crans, brunissage, morsure) ; les contrastes AA des paires du § 3.4 ; « une
seule couleur pour le camp qui chasse » ; les textes du crieur ne disent que
ce que l'évènement dit.

L'actuel habit `[data-skin='shiganshina']` de `styles.css` (fond vert-gris,
lanterne verte) est remplacé par ces valeurs.

---

## 9. Le skin Gilets Jaunes dans cette grammaire

Le troisième habit ne change que les **valeurs sémantiques**, les **motifs**
et les **mots** ; la grammaire est la même pièce.

**Référence** : pas de planche de Goya à citer ici — les pancartes du
rond-point et la presse locale. Des légendes sèches, pas des slogans. La
règle-signature : **le fluo du gilet ne se dessine qu'en hachure** — jamais en
aplat, jamais en texte. Le fluo est une matière réfléchissante, pas une couleur
de surface.

| Ce qui change | Valeur |
|---|---|
| encre (bistre-900) | `#101318` goudron — verge dessus **13,74:1** |
| papier (vergé) | `#E6DDC4` papier kraft de tract |
| bruni | `#F1EBDB` — encre dessus **15,64:1** |
| cuivre en relief (bistre-800) | `#1D232D` — verge dessus **11,65:1** |
| meute → **les CRS** | le bleu d'uniforme `#24476E` sur kraft **7,04:1** · interdit la nuit (**1,95:1** sur le goudron, loi N2) : la craie `#9EB9DA` le remplace — le même bleu, passé à la lampe des gyrophares (**9,22:1** sur encre) |
| serment → **les tourtereaux** | même garance : `#8E3E53` sur kraft 5,23:1 · `#EBA3B2` sur encre **9,23:1** |
| narrateur | délavé `#5A5245` sur kraft **5,68:1** ; palier-1 `#A6B0BD` sur encre **8,48:1** |
| fluo du gilet | `#E8C81A`, **en hachure seule** (`hach-fluo`), jamais en aplat ni en texte |
| la frise | **le rond-point** : la cabane en palette, le feu de camp, l'île centrale ; la nuit, les gyrophares au loin |
| dos de carte | la cabane sur le rond-point, la nuit |
| couvre-chefs | les 18 coiffes du rond-point : casque de chantier, bonnet de laine, casquette de routier, cagoule de ski, bombe de motard, béret basque, bob de pêche, bandana de colleur d'affiches, calotte de cantonnier, képi de gendarme… (même règle d'ombre chinoise) |
| loups des planches | l'unité en bleu : casques et boucliers, jamais un visage ; morsure § 4.6 pour la meute |
| mots des cartouches | « Rond-point », « CRS », « Les tourtereaux », « Le fourgon » ; le cartouche du Loup Blanc reste « Seul » — le mot est codé en dur, il vaut pour l'Inspecteur |

**Légendes** — des pancartes, pas des slogans ; l'intégralité vit dans
`skins/giletsjaunes.ts`. Pour donner le ton :

| Rôle | Légende |
|---|---|
| Gilet jaune | « Il n'y avait que la chaîne pour le dire. » |
| CRS | « Le bouclier ne discute pas. » |
| la Fouillante | « Elle fouille les poches, pas la conscience. » |
| la Balance | « Le mot glissé n'était pas signé. » |
| la Lycéenne | « Chaque charge a sa vidéo. » |
| l'Inspecteur | « Les bleus ne contrôlent pas les bleus, dit-on. » |
| le Gilet certifié | « Certifié des deux côtés. » |
| le Chapardeur | « Il ne vole pas : il recycle. » |
| le Gendarme | « Deux camps, une seule solde. » |
| l'Apprenti | « Il regarde faire, puis fait pareil. » |
| les Trois Frères | « Trois fois le même menton, trois fois la même parole. » |
| accueil / fin | « La démocratie tient sur un rond-point. » / « Le feu attendra l'hiver prochain. » |

**Ce qui ne change jamais**, d'un skin à l'autre : la grammaire du trait
(§ 2.3) ; les formes des cartouches ; les 17 états du jeton et leurs
emplacements ; le gabarit unique et les lois N1-N6 ; l'échelle typographique,
la grille, les rayons à 0, l'absence d'ombre ; la mécanique du mouvement
(crans, brunissage, morsure) ; les contrastes AA des paires du § 3.4 ; « une
seule couleur pour le camp qui chasse » ; les textes du crieur ne disent que
ce que l'évènement dit.

L'habit `[data-skin='giletsjaunes']` de `styles.css` porte ces valeurs, paires
verrouillées au centième dans `contraste.test.ts`. Le pattern du fluo
(`hach-fluo`) se posera avec le chantier des gravures du skin — 21 symboles,
dos « la cabane la nuit », les 18 coiffes, deux-tons de la nuit —, sur le
modèle du Caprice C-Shiganshina.

---

## 10. Le skin Far West dans cette grammaire

Le quatrième habit ne change que les **valeurs sémantiques**, les **motifs**
et les **mots** ; la grammaire est la même pièce.

**Référence** : l'affiche « Wanted » épinglée au mur du saloon et le registre
du comptoir. Des constats, pas de folklore. La règle-signature : **l'or de
l'étoile ne se dessine qu'en hachure** — jamais en aplat, jamais en texte.
L'or est un reflet de shérif, pas une couleur de surface.

| Ce qui change | Valeur |
|---|---|
| encre (bistre-900) | `#131A2E` indigo de grande plaine — verge dessus **12,50:1** |
| papier (vergé) | `#E9DAB7` papier sable des affiches du territoire |
| bruni | `#F2E8CD` — encre dessus **14,17:1** |
| cuivre en relief (bistre-800) | `#1B263F` — verge dessus **10,92:1** |
| meute → **les hors-la-loi** | même sanguine : c'est le bandana. `#98371F` sur sable **5,26:1** · interdit la nuit (**2,38:1** sur l'indigo, loi N2) : la craie `#E08A70` le remplace — le même rouge, passé à la lampe du saloon (**6,60:1** sur encre, **5,77:1** sur relief) |
| serment → **les tourtereaux** | même garance : `#7E3F4C` sur sable 5,65:1 · `#E5A8AF` sur encre **8,68:1** |
| narrateur | délavé `#67553B` sur sable **5,20:1** ; palier-1 `#9AA6CE` sur encre **7,16:1** |
| or de l'étoile | `#E3B341`, **en hachure seule** (`hach-or`), jamais en aplat ni en texte |
| la frise | **la rue du bourg** : le saloon, le puits, la potence ; la nuit, les coyotes dans la prairie, une lanterne au loin |
| dos de carte | l'affiche clouée au mur du saloon, au trait vergé sur aquatinte IV |
| couvre-chefs | les 18 coiffes du territoire : chapeau de cow-boy, sombrero de voyageur, casque de mineur, bandana de voleur de bétail, bonnet de fourrure du trappeur, képi de shérif… (même règle d'ombre chinoise) |
| loups des planches | la bande en bandana rouge, jamais un visage ; morsure § 4.6 pour la meute |
| mots des cartouches | « Le saloon », « Hors-la-loi », « Les tourtereaux », « Le cimetière » ; le cartouche du Loup Blanc reste « Seul » — le mot est codé en dur, il vaut pour le Chasseur de primes |

**Légendes** — le registre du comptoir ; l'intégralité vit dans
`skins/farwest.ts`. Pour donner le ton :

| Rôle | Légende |
|---|---|
| Pionnier | « Le convoi passait. Personne n'a dormi. » |
| Hors-la-loi | « Le bandana ne pardonne pas. » |
| la Cartomancienne | « Elle lit les cartes, jamais les visages. » |
| le Juge de paix | « Il retarde la corde, une nuit à la fois. » |
| l'Étranger | « Un étranger pend mieux qu'un voisin. » |
| la Guetteuse | « Compter les fusils, c'est déjà tirer. » |
| le Chasseur de primes | « La bande ne trie pas ses balles, dit-on. » |
| le Marshal | « Deux camps, une seule étoile. » |
| le Filou | « Il ne vole pas : il emprunte sans rendre. » |
| les Trois Frères | « Trois fois le même menton, trois fois la même parole. » |
| accueil / fin | « Une ville vaut une corde. » / « La poussière attendra la prochaine caravane. » |

**Ce qui ne change jamais**, d'un skin à l'autre : la grammaire du trait
(§ 2.3) ; les formes des cartouches ; les 17 états du jeton et leurs
emplacements ; le gabarit unique et les lois N1-N6 ; l'échelle typographique,
la grille, les rayons à 0, l'absence d'ombre ; la mécanique du mouvement
(crans, brunissage, morsure) ; les contrastes AA des paires du § 3.4 ; « une
seule couleur pour le camp qui chasse » ; les textes du crieur ne disent que
ce que l'évènement dit.

L'habit `[data-skin='farwest']` de `styles.css` porte ces valeurs, paires
verrouillées au centième dans `contraste.test.ts`. Le pattern de l'or
(`hach-or`) se posera avec le chantier des gravures du skin — 21 symboles,
dos « l'affiche au saloon », les 18 coiffes, deux-tons de la nuit —, sur le
modèle du Caprice C-Shiganshina.

---

## 11. Le skin Pirates dans cette grammaire

Le cinquième habit ne change que les **valeurs sémantiques**, les **motifs**
et les **mots** ; la grammaire est la même pièce.

**Référence** : la carte marine annotée à la sortie du quart et le journal
de bord du carré. Des constats de mer, pas de flibuste de convention. La
règle-signature : **l'or des doublons ne brille qu'en hachure** — jamais en
aplat, jamais en texte. L'or est un reflet de miroir, pas une couleur de
surface.

| Ce qui change | Valeur |
|---|---|
| encre (bistre-900) | `#10171A` vert-de-gris de coque — verge dessus **12,72:1** |
| papier (vergé) | `#E2D8BA` carte marine mouillée et séchée, sel compris |
| bruni | `#EFE7CE` — encre dessus **14,65:1** |
| cuivre en relief (bistre-800) | `#1A2E30` — verge dessus **10,04:1** |
| meute → **les mutins** | même sanguine, c'est le bandeau. `#962E20` sur carte **5,48:1** · interdit la nuit (**2,32:1** sur la coque, loi N2) : la craie `#DE7B60` le remplace — le même rouge, passé à la lampe de bord (**6,11:1** sur encre, **4,82:1** sur relief) |
| serment → **les tourtereaux** | même garance : `#8F3440` sur carte 5,43:1 · `#EFA9A0` sur encre **9,34:1** |
| narrateur | délavé `#57503C` sur carte **5,68:1** ; palier-1 `#93B5B0` sur encre **8,15:1** |
| or des doublons | `#C9971F`, **en hachure seule** (`hach-or`), jamais en aplat ni en texte |
| la frise | **le pont du trois-mâts** : grand mât, bastingage, boute à la mer ; la nuit, la lanterne de poupe et le grincement de la coque |
| dos de carte | la carte marine étalée sur la table du carré, au trait vergé sur aquatinte IV |
| couvre-chefs | les 18 coiffes du bord : tricorne de capitaine, bandana rouge, calotte de gabier, suroit de quart, capuche de ciré, bombe d'artilleur… (même règle d'ombre chinoise) |
| loups des planches | la mutinerie en bandeau rouge, jamais un visage ; morsure § 4.6 pour la meute |
| mots des cartouches | « Le pont », « Mutin », « Les tourtereaux », « La chaloupe » ; le cartouche du Loup Blanc reste « Seul » — le mot est codé en dur, il vaut pour le Flibustier |

**Légendes** — le journal de bord ; l'intégralité vit dans
`skins/pirates.ts`. Pour donner le ton :

| Rôle | Légende |
|---|---|
| Matelot | « Deux mains calleuses, aucun ordre à donner. » |
| Mutin | « Le couteau dort sous la couchette. » |
| la Vigie | « Elle voit tout, du haut du grand mât. » |
| le Barbier | « Un rasoir, et deux anneaux. » |
| le Charpentier | « Il calfate la brèche, pas la tempête. » |
| le Nouveau | « Embarqué la veille, sacrifié le lendemain. » |
| la Clandestine | « Depuis le grand mât, elle compte les couteaux. » |
| le Flibustier | « La cale ne contrôle pas la cale, dit-on. » |
| le Renégat | « Deux pavillons, une seule part. » |
| les Trois Frères | « Trois fois la même houle, trois fois la même parole. » |
| accueil / fin | « La liberté tient sur un pont. » / « Le navire attendra un autre équipage. » |

**Ce qui ne change jamais**, d'un skin à l'autre : la grammaire du trait
(§ 2.3) ; les formes des cartouches ; les 17 états du jeton et leurs
emplacements ; le gabarit unique et les lois N1-N6 ; l'échelle typographique,
la grille, les rayons à 0, l'absence d'ombre ; la mécanique du mouvement
(crans, brunissage, morsure) ; les contrastes AA des paires du § 3.4 ; « une
seule couleur pour le camp qui chasse » ; les textes du crieur ne disent que
ce que l'évènement dit.

L'habit `[data-skin='pirates']` de `styles.css` porte ces valeurs, paires
verrouillées au centième dans `contraste.test.ts`. Le pattern de l'or
(`hach-or`) se posera avec le chantier des gravures du skin — 21 symboles,
dos « la carte du carré », les 18 coiffes, deux-tons de la nuit —, sur le
modèle du Caprice C-Shiganshina.

---

## 12. Le skin Open Space dans cette grammaire

Le sixième habit ne change que les **valeurs sémantiques**, les **motifs**
et les **mots** ; la grammaire est la même pièce.

**Référence** : l'annonce d'intention punaisée au milieu du plateau et le
compte-rendu de réunion. Des faits d'entreprise, sans miligramme de morale.
La règle-signature : **le rose du post-it ne se colle qu'en hachure** —
jamais en aplat, jamais en texte. Le rose est une matière qui se détache,
pas une couleur de surface.

| Ce qui change | Valeur |
|---|---|
| encre (bistre-900) | `#0D1420` veille bleutée des écrans — verge dessus **15,69:1** |
| papier (vergé) | `#ECEDEA` papier d'imprimante des plateaux |
| bruni | `#F7F8F5` — encre dessus **17,30:1** |
| cuivre en relief (bistre-800) | `#162234` — verge dessus **13,66:1** |
| meute → **les managers** | même sanguine, c'est le badge. `#2D4E8A` sur papier **7,01:1** · interdit la nuit (**2,24:1** sur la veille d'écran, loi N2) : la craie `#8FB6E8` le remplace — le même bleu, passé à la lumière des écrans (**8,78:1** sur encre, **7,64:1** sur relief) |
| serment → **les tourtereaux** | même garance : `#A23768` sur papier 5,47:1 · `#F49CC8` sur encre **9,14:1** |
| narrateur | délavé `#565B55` sur papier **5,96:1** ; palier-1 `#8FA3C0` sur encre **7,14:1** |
| rose du post-it | `#F0438E`, **en hachure seule** (`hach-rose`), jamais en aplat ni en texte |
| la frise | **la cloison de l'open space** : plante verte, casier, écran éteint ; la nuit, les veilleuses des moniteurs |
| dos de carte | la porte vitrée des RH, pupitre et lecteur de badge, au trait vergé sur aquatinte IV |
| couvre-chefs | les 18 coiffes du plateau : casque à isolation active, casquette de la bonne ambiance, capuche de développeur, bob du séminaire d'été, canotier du déguisement de décembre, casque du standard qui n'existe plus… (même règle d'ombre chinoise) |
| loups des planches | la direction en badge bleu, jamais un visage ; morsure § 4.6 pour la meute |
| mots des cartouches | « La cafétéria », « Manager », « Les tourtereaux », « La machine à café » ; le cartouche du Loup Blanc reste « Seul » — le mot est codé en dur, il vaut pour le Consultant |

**Légendes** — le compte-rendu du lundi ; l'intégralité vit dans
`skins/openspace.ts`. Pour donner le ton :

| Rôle | Légende |
|---|---|
| Salarié | « Son compte LinkedIn est à jour. » |
| Manager | « Le sourire ne discute pas. » |
| la Contrôleuse de gestion | « Elle inspecte les lignes, pas les personnes. » |
| l'Animateur du séminaire | « La team, c'est pour la vie, comme il dit. » |
| le Syndicaliste | « Il gagne une nuit à la fois. » |
| l'Alternant | « Le stage est formateur, dit la convention. » |
| la Stagiaire | « Chaque réunion a sa photo. » |
| le Consultant | « La mission ne se discute pas. » |
| l'Intérimaire | « Deux camps, une seule mission. » |
| les Trois Frères | « Trois fois le même badge, trois fois la même idée. » |
| accueil / fin | « La démocratie tient sur un plateau. » / « La prochaine levée de fonds attendra. » |

**Ce qui ne change jamais**, d'un skin à l'autre : la grammaire du trait
(§ 2.3) ; les formes des cartouches ; les 17 états du jeton et leurs
emplacements ; le gabarit unique et les lois N1-N6 ; l'échelle typographique,
la grille, les rayons à 0, l'absence d'ombre ; la mécanique du mouvement
(crans, brunissage, morsure) ; les contrastes AA des paires du § 3.4 ; « une
seule couleur pour le camp qui chasse » ; les textes du crieur ne disent que
ce que l'évènement dit.

L'habit `[data-skin='openspace']` de `styles.css` porte ces valeurs, paires
verrouillées au centième dans `contraste.test.ts`. Le pattern du rose
(`hach-rose`) se posera avec le chantier des gravures du skin — 21 symboles,
dos « la porte des RH », les 18 coiffes, deux-tons de la nuit —, sur le
modèle du Caprice C-Shiganshina.

---

## 13. L'art final — stratégie de production

**Ce qui se dessine à la main en SVG, maintenant (lots F et C)** : les 13
symboles et leurs versions 16 px, les 18 couvre-chefs (et les 18 coiffes de
Shiganshina), les ~30 icônes, les glyphes d'état, les cartouches, la frise
(toits, Mur), le dos de carte, les 18 vignettes du récit. Tracés optimisés
(`svgo`), `currentColor`, rangés dans `components/habit/`. C'est définitif :
aucune machine n'intervient sur ces tracés.

**Les planches illustrées** (13 rôles + frontispice + 13 Shiganshina) — trois
voies, et une recommandation :

1. **Pipeline « image générée → estampe »** (testé en parallèle par un autre
   agent ; ses conclusions priment sur ce paragraphe) :
   1. génération en **niveaux de gris**, au format de la zone image ×4
      (1 008 × 1 056), prompt du type C1 de recherche-02 plus la liste des
      interdits (lune, halo, symétrie, visage éclairé par en dessous, violet) ;
   2. **réduction à quatre paliers + papier**, sans tramage de Floyd-Steinberg
      (trop numérique) : seuillage par **la tuile de grain d'aquatinte** du § 4.1
      utilisée comme carte de seuil — le grain de l'image devient celui de
      l'interface ;
   3. **le trait** : contours extraits, vectorisés (potrace), puis **repris à la
      main** sur les lignes qui portent le sens (visages, mains, attribut du
      rôle) — net pour le village, mordu pour la meute ;
   4. hachures de volume ajoutées par le générateur du § 4.3 ;
   5. composition : cuvette, marge, numéro, légende **typographiée** (jamais de
      texte généré dans l'image) ;
   6. **contrôle humain** sur la liste anti-« IA » (annexe) : une planche qui
      échoue à un point est refaite, pas retouchée.
2. **Commande à un graveur** : eau-forte et aquatinte réelles sur cuivre, format
   ≈ 10 × 12 cm, épreuves sur vergé, numérisées à 1 200 dpi en niveaux de gris.
   La seule voie qui donne la main qui mord le cuivre. Coût et délai : sur devis
   (non chiffrés ici).
3. **Hybride — recommandé** : le graveur grave **trois plaques étalons** — le
   Loup-garou, la Voyante, le frontispice — qui fixent le trait, le grain et
   l'échelle ; les dix autres sortent du pipeline en prenant ces trois épreuves
   pour référence de style, puis passent le contrôle humain. Shiganshina suit
   le même chemin avec deux étalons (un Colosse, l'Éclaireuse).

**Format de livraison** : PNG ou WebP 8 bits **en niveaux de gris** (1 008 ×
1 056, et 504 × 528), ≤ 90 Ko par planche, chargés à la demande. **La sanguine
n'est jamais dans le raster** : elle est posée en calque SVG par-dessus (traits
de vapeur, sang, cartouche), pour garder l'hex exact et basculer en craie la
nuit. Les références de Goya sont du domaine public ; les images générées et les
gravures commandées doivent avoir une cession de droits écrite.

**En attendant** : la v1 se livre en **« planches typographiques »** (D9) : le
symbole à 128 px sur hachure `hach-1` dans la zone image, numéro, nom, cartouche,
légende. C'est complet, cohérent et expédiable. Les épreuves générées de la
Pl. VIII **ne sont pas livrées**.

---

## 14. Ce que l'implémentation change (hors design)

1. `data-tirage` (`Partie.tsx`, à côté de `data-heure`) et le réglage `tirage`
   (`lib/reglages.ts`, `Reglages.tsx`).
2. `styles.css` : primitifs → sémantiques → composants (§ 3.10) ; polices du
   § 3.6 ; rayons à 0, aucune ombre ; `.btn-village`/`.btn-voisin` deviennent
   les variantes du § 5.4 ; `.carte` devient `.cuvette`.
3. `skins/habits.ts` porte les primitifs et sémantiques par skin ;
   `contraste.test.ts` verrouille les paires en gras du § 3.4.
4. `anim/tokens.ts` : § 3.9 (ressorts retirés, crans).
5. `Decor.tsx` → **Frise** ; `Symbole.tsx` : nouveaux symboles et dos (Caprice
   43) ; `CarteRole.tsx` : formats et révélation du § 5.2.
6. `Place.tsx` : densités D1-D4, couvre-chefs, 17 états ; **suppression des
   opacités** 0,55 / 0,6 (états 11 et 15) ; savoir privé **sous le pouce**
   (§ 5.1.6).
7. Nuit : gabarit unique — `VillageDort` montre la place, le pli et la barre ;
   **fin de la teinte sang de l'écran de la meute** (`commun.tsx`, loi N2).
8. `Revelation.tsx` et `MaCarte` : appui long, 8 s, recache au relâchement et
   à `visibilitychange` (P0-2, P0-3).
9. `Minuterie.tsx` : ligne toujours présente, cadre vide de même taille,
   urgence par la texture et non plus par le sang.
10. `Fil.tsx` : marges et onglets par canal, pli ; `Action.tsx` : deux temps
    pour l'abstention, « ne viser personne », la balle gardée.
11. **Le skin gagne un champ `legendes`** (`roles` × 21, `ecrans` × 15,
    `recit` × 19) et `couvreChefs` (18 noms, pour la documentation) ; le test
    de complétude du registre les exige.
12. Tests : silhouette DOM nuit (dormeur, acteur, mort : même arbre de zones,
    mêmes hauteurs) ; **budget de luminance N4** (Playwright, écart ≤ 3 %) ;
    `polices.test.ts` (IM Fell absente des boutons, consignes et statuts).

---

## Annexe — la liste anti-« IA » (relecture de chaque artboard)

- [ ] Aucun rayon hors médaillon, lacs et cuvette (2 px) ; aucune ombre ; aucun
      dégradé ; aucun flou ; aucun verre ; aucune lueur.
- [ ] Aucun panneau-carte arrondi empilé façon tableau de bord.
- [ ] Aucune icône de bibliothèque ; chaque icône est gravée (§ 6.3).
- [ ] Aucune symétrie parfaite dans une gravure ; aucun visage éclairé par en
      dessous ; aucun halo de bougie.
- [ ] Ni lune, ni loup hurlant, ni violet, ni bleu nuit, ni brouillard.
- [ ] La sanguine ne paraît **que** pour la meute ; aucune rousseur rouge ;
      aucun bouton rouge ; aucune urgence rouge.
- [ ] Chaque état est doublé d'un mot ; chaque cartouche porte son mot.
- [ ] Aucun texte sous 12 px ; IM Fell jamais sous 16 px (13 en SC) ni dans
      une phrase d'interface ; aucune opacité sur du texte.
- [ ] Cibles ≥ 44 ; actions de jeu à 48, collées en bas.
- [ ] Textes réels, en français, de `thiercelieux.ts` ; aucune légende ne
      nomme ni n'accorde un pseudo.
- [ ] La nuit : les écrans de quatre sièges différents, à 25 % de zoom, sont la
      même tache (N1-N4).
- [ ] Une technique réelle derrière chaque effet : si on ne peut pas dire
      « c'est une hachure / une morsure / un brunissage / la cuvette », on
      l'enlève.

