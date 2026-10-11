# Recherche 04 — UX mobile d'un loup-garou « téléphone sur la table »

Rapport d'agent du 11 octobre 2026, archivé (condensé) par le chef
d'orchestre. Sources lues : WCAG 2.2 (2.5.8 taille des cibles, 2.2.1 temps
réglable, 1.4.3/1.4.11 contrastes, 1.4.1 couleur), MDN (Screen Wake Lock,
Vibration — non supportée par iOS Safari, prefers-reduced-motion).

## Vingt principes, priorisés

**P0 — bloquants autour d'une vraie table**
1. **Wake Lock** dès le salon, redemandé à chaque retour au premier plan.
2. **Révélation par appui long** : le rôle n'est visible que pouce posé ; se
   cache au relâchement, au changement d'onglet, et après 8 s au plus.
3. Le rôle n'est **jamais** affiché en grand de façon persistante ; « Ma
   carte » s'ouvre à l'appui long et se referme seule.
4. **Silhouette identique la nuit pour tous** : même mise en page, même
   hauteur d'en-tête ; la minuterie absente laisse un **cadre vide de même
   taille**. Un voisin à un mètre ne doit rien deviner.
5. Mode **nuit discrète** (pas de blanc pur) : un écran lumineux trahit.
6. Choix en deux temps pour tout geste irréversible, **y compris** « Ne viser
   personne » et « S'abstenir » ; « annuler » 3 s si le moteur le permet.
7. Actions de jeu **collées en bas**, 48 px, 8 px d'écart ; gestion (règles,
   réglages, quitter) en haut ou dans un menu.

**P1**
8. Une tâche par écran : la première ligne dit ce que fait votre rôle
   maintenant.
9. Texte jamais sous 12 px, corps 16 px, texte de jeu 18 px.
10. Une seule disposition mobile pour 6 à 18 joueurs, **sans défilement** pour
    voter (deux densités adaptatives).
11. Gabarit de vote stable : jeton → résumé en bas → confirmation au pouce ;
    « Votre voix : Anna » visible et modifiable.
12. Compte à rebours qui informe sans stresser : barre silencieuse, chiffre
    plus grand sous 30 s, un seul changement (teinte + icône) à 10 s, jamais
    de clignotement ni de tic-tac.
13. Reconnexion honnête : bandeau pour soi, dernier état grisé ; pour les
    autres « absent » + grâce, sans dire pourquoi.
14. **Aucune fuite par l'interface** : pas de compteurs la nuit, pas d'états de
    chargement ou d'animations dont la durée dépend du rôle, pas de vibration
    ciblant un rôle ; test automatisé comparant les DOM de deux sièges
    inactifs.
15. Transitions courtes : rideau 320 ms, narration 3-5 s passable d'un tap.

**P2**
16. Aide contextuelle « ? » par écran (feuille basse), premier tour guidé
    facultatif.
17. Couleur toujours doublée d'un symbole et d'un mot (camps, canaux).
18. Mouvement réduit : fondus plutôt que suppression.
19. Lecteur d'écran : le rôle n'est jamais lu sans geste volontaire.
20. Son rare, signifiant, désactivable ; jamais seul signal ; vibration
    doublée d'un signal visuel (iOS).

## Inventaire des écrans et états

Accueil · Salon joueur · Salon hôte · Révélation · Nuit (village qui dort —
silhouettes identiques) · Nuit, écran de chaque rôle · Aube et morts ·
Élection · Jour (jeton à 14 états : normal, choisi, a voté, moi, mort, gracié,
hors vote, marqué, capitaine, amoureux, absent, reconnexion…) · Dépouillement ·
Chasseur · Succession · Bouc émissaire · Chat (tiroir, colonne, intégré) · Ma
carte · Menu de table · Fin · États transverses (reconnexion, hors-ligne,
table disparue, double onglet, < 320 px, paysage, sans Wake Lock) · Écran
partagé « scène » optionnel (TV au centre de la table, sans secret).

Axes : rôle, vivant/mort/spectateur/gracié, nuit/jour, mobile 320-430 px /
grand écran, 6/12/18 joueurs, en ligne/reconnexion/hors ligne, chat on/off.

## Design System : contenu attendu

Tokens à trois niveaux (primitifs → sémantiques `camp-*`, `canal-*`,
`etat-*` → composant) ; les skins ne surchargent que le sémantique.
Composants : bouton (primaire, secondaire, danger armé, discret), **bouton à
appui long** (anneau de progression), champ et champ de code, **carte de
rôle**, **jeton de joueur** (14 états, 2 tailles), **place** (grille
adaptative / cercle, sélection simple ou multiple), **barre de
confirmation**, pastilles de statut, **minuterie** (y compris « absente » =
cadre vide), bandeau réseau, narrateur/sous-titre de phase, rideau de phase,
feuille basse, fil et onglets de canal, réglages, bulle d'aide, avis, écran
de fin, icônes (un symbole par rôle, camp, canal, statut).

## Critiques des écrans actuels (relevé du 11 octobre)

- **Révélation** : un tap suffit, la carte reste visible ; rôle et complices en
  très grand pendant l'attente.
- **En-tête** : la minuterie n'existe que chez le siège qui agit → la hauteur
  change la nuit (**fuite**) ; trop haut sur 320 px.
- **Ma carte** : reste ouvert, lisible par le voisin ; icône seule sur mobile.
- **Minuterie** : barre 6 px, chiffre 14 px ; l'urgence n'est qu'une couleur.
- **Place** : textes à 11-12 px ; opacité réduite qui casse le contraste ;
  aucun état pour sa propre déconnexion.
- **Action** : « S'abstenir » et « Ne viser personne » partent sans
  confirmation ; consigne générique « Touchez un jeton ».
- **Nuit** : excellent écran unique du village qui dort ; mais l'accès au
  canal des amoureux n'apparaît que chez eux (**fuite**).
- **Accueil** : autofocus qui ouvre le clavier et masque les boutons ; boutons
  désactivés sans raison dite.
- **Salon** : très long sur téléphone, textes à 10-11 px, boutons serrés ; à
  découper en étapes avec « Lancer » collé en bas.
- **Fin** : contenu empilé sans repères.
- **Transverse** : pas de Wake Lock ; `--sang` et `--lanterne` trop proches
  pour un daltonien (deux camps opposés) ; `--sang` à 4,45:1 sur
  `--nuit-relief` ; pas d'onboarding.
