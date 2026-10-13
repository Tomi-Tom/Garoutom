/**
 * Far West — le quatrième habit.
 *
 * Un bourg de la conquête de l’Ouest, entre le désert et la voie ferrée :
 * le saloon, le puits, la potence — et la nuit, les bandanas. La mort y est
 * une descente ou une pendaison qui attendait le vote : le narrateur tient
 * le registre du comptoir, il ne pleure personne. La légende western est
 * laconique — la foule qui pend vite, le silence des pistes. Il constate,
 * il ne juge pas ; aucun nom propre réel ne passe jamais (règle de plume
 * n° 1), aucun camp favori.
 *
 * Comme les peaux précédentes, celle-ci est marquée « Esquisse » là où la
 * plume n’a pas été relue par un habitant du bourg : chaque complément tient
 * la place, il ne prétend pas à la phrase définitive.
 */

import type { Skin } from './registre.js';

export const farwest: Skin = {
  id: 'farwest',
  univers: 'Far West',
  charge: 'le shérif',
  // Esquisse : « Hors-la-loi » ne prend ni pluriel ni trait d’union en plus —
  // une bande, deux bandes, c’est le même gibier.
  plurielLoups: { un: 'Hors-la-loi', plusieurs: 'Hors-la-loi' },
  // Esquisse : l’absent dort sur son brelan, deux portes plus loin.
  absent: 'au saloon voisin',

  /* --- Les rôles : la transposition du bourg --- */
  roles: {
    villageois: {
      nom: 'Pionnier',
      // Esquisse : la carte du Villageois, transposée — la parole, et le fusil.
      description:
        'Pas de pouvoir. Votre arme, c’est votre parole au saloon — et le fusil derrière la porte pour la suite.',
    },
    loup: {
      nom: 'Hors-la-loi',
      // Esquisse : le bandana au fond de la poche, la nuit venue.
      description:
        'Chaque nuit, la bande descend un habitant du bourg. Le jour, vous buvez au saloon comme les autres, bandana au fond de la poche.',
    },
    voyante: {
      nom: 'la Cartomancienne',
      // Esquisse : elle tire les cartes de tout le monde, sans exception.
      description:
        'Chaque nuit, tirez les cartes d’un vivant : ce que le tarot dit de lui s’inscrit dans votre carnet, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Guérisseuse',
      // Esquisse : deux remèdes dans la malle, pas deux potions.
      description:
        'Deux remèdes, une seule fois chacun : la décoction qui réveille la victime des hors-la-loi, et celle qui endort pour de bon qui vous voulez.',
    },
    chasseur: {
      nom: 'le Trappeur',
      // Esquisse : même prudence que la carte du Chasseur — la phrase annonce
      // le pouvoir, la table connaît ses limites (D1).
      description: 'En tombant, vous pouvez tirer votre dernière cartouche sur le joueur de votre choix.',
    },
    cupidon: {
      nom: 'le Prédicateur',
      // Esquisse : il marie tout le monde, sans demander la bénédiction de personne.
      description:
        'La première nuit seulement, mariez deux vivants d’un même destin : si l’un descend, l’autre le suit.',
    },
    salvateur: {
      nom: 'le Juge de paix',
      // Esquisse : la protection légale, saisie avant la nuit.
      description:
        'Chaque nuit, votre protection légale préserve un habitant des hors-la-loi — jamais la même porte deux nuits de suite, et la bande passe toujours.',
    },
    idiot: {
      nom: 'l’Idiot du saloon',
      // Esquisse : gracié, affiché, muet au vote — l’accord suit le rôle,
      // jamais la personne derrière l’écran.
      description:
        'Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 : transposés sur la même piste --- */
    ancien: {
      // Esquisse : il a survécu à deux ruées, et il en garde une pour l’hiver.
      nom: 'l’Ancien',
      description:
        'Vous avez la peau dure : la première descente ne vous emporte pas, la seconde si. Et si le bourg vous pend de sa main, il peut perdre ses moyens avec vous.',
    },
    corbeau: {
      // Esquisse : la lettre glissée sous la porte du saloon, jamais signée.
      nom: 'la Moucharde',
      description:
        'Chaque nuit, désignez un vivant : au vote du jour, deux voix pèseront d’office contre ce vivant. La lettre est annoncée, jamais sa main.',
    },
    bouc: {
      // Esquisse : littéral — la corde la plus proche de l’égalité.
      nom: 'l’Étranger',
      description:
        'Si le vote du bourg finit à égalité, c’est vous qui montez au gibet pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      // Esquisse : depuis le clocher, elle compte mieux qu’elle ne prie.
      nom: 'la Guetteuse',
      description:
        'Pendant que la bande choisit sa proie, vous guettez du haut du clocher : vous voyez combien de fusils visent chaque habitant — jamais lesquels.',
    },
    loupBlanc: {
      // Esquisse : les primes se payent parfois dans la propre écurie.
      nom: 'le Chasseur de primes',
      description:
        'Vous descendez avec la bande, qui vous prend pour l’un des siens. Une nuit sur deux, vous pouvez descendre un Hors-la-loi. Vous ne gagnez que seul.',
    },
    /* --- La v3 (R105 à R114) : même transposition, même talon --- */
    villageois2: {
      // Esquisse : le brevet recto-verso (R106, D31) — honnête des deux côtés.
      nom: 'l’Honnête Fermier',
      description:
        'Aucun pouvoir, aucune vie bonus : le brevet est recto-verso, et les deux faces disent la même chose — honnête pionnier. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      nom: 'le Pisteur',
      description:
        'Chaque nuit, flairez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. Un bandana dans le trio : votre nez répond, et votre flair demeure. Un trio sain : votre flair s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      // Esquisse : le chien du ranch, qui n’appartient qu’à personne.
      nom: 'le Rancher',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce des morts, votre chien aboie si un bandana descend à vos côtés — et son silence, lui aussi, est une information.',
    },
    voleur: {
      // Esquisse : le comptoir du saloon, ouvert avant la révélation.
      nom: 'le Filou',
      description:
        'Avant même la révélation, deux cartes restées sur le bar sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez le Filou, sans aucun pouvoir. Deux Hors-la-loi dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      // Esquisse : deux camps, une seule étoile.
      nom: 'le Marshal',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé au bourg, vous n’avez aucun pouvoir ; rangé dans la bande, vous descendez avec elle — et la bande vous prend pour l’un des siens.',
    },
    enfantSauvage: {
      // Esquisse : il regarde faire, puis fait pareil.
      nom: 'l’Émule',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il descend, quoi qu’il arrive, vous rejoignez la bande.',
    },
    soeurs: {
      nom: 'les Deux Sœurs',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — le cimetière seul le referme.',
    },
    freres: {
      nom: 'les Trois Frères',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — le cimetière seul le referme.',
    },
  },

  camps: { village: 'le bourg', loups: 'les hors-la-loi' },
  vainqueurs: {
    village: 'le bourg',
    loups: 'les hors-la-loi',
    amoureux: 'les tourtereaux',
    loupBlanc: 'le Chasseur de primes',
    personne: 'personne',
  },

  /* --- Le narrateur : il annonce, il ne commente pas (R87) --- */
  narrateur: {
    debut: 'Le puits a donné une ville. Que le bourg se rassemble.',

    phases: {
      // Le talon ne se montre qu’à son propriétaire : la phrase dit la
      // scène, jamais la main qui va choisir (R110, R87).
      voleur: 'Deux cartes restent sur le comptoir, sous la lampe. Quelqu’un doit choisir.',
      // La carte est une mécanique, la phrase vaut pour tout univers —
      // reprise de Thiercelieux, transposée sans déguisement.
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      nuit: {
        principale: 'La nuit tombe sur la rue principale. Le bourg s’endort.',
        // Plate par choix, comme à Thiercelieux — l’étape est un fait
        // d’architecture, pas un fait de récit.
        sorciere: 'La nuit se poursuit.',
        // Plate aussi — l’étape du Chasseur de primes se tient mort compris (R97).
        loupBlanc: 'La nuit se poursuit.',
      },
      chasseur: 'Le Trappeur rend l’âme, le doigt sur la détente. La partie attend son dernier geste.',
      succession: 'Le shérif est tombé : l’étoile attend une poitrine.',
      // « peut » : au temps écoulé, il s’est tu, et tout le monde vote (R94).
      bouc: 'L’Étranger monte au gibet. Son dernier mot peut désigner qui votera demain.',
      election: 'Le bourg se choisit un shérif.',
      jour: 'Le jour se lève sur la rue principale. Le bourg délibère.',
      fin: 'La dernière affiche est clouée au mur du saloon.',
    },

    morts: {
      loups: 'Les hors-la-loi ont descendu {nom}.',
      poison: 'La mauvaise tisane a emporté {nom}.',
      vote: 'Le bourg a pendu {nom}.',
      chasseur: 'La cartouche du Trappeur a atteint {nom}.',
      chagrin: 'Le cœur brisé a eu raison de {nom}.',
      // R101 : l’absence a trop duré. Le narrateur ne juge pas, il constate
      // — la carte se retourne, ou non, selon la table.
      abandon: '{nom} a quitté le bourg sans un mot.',
    },
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Personne n’a été descendu cette nuit. Le saloon ouvre ses portes.',
    grace:
      'Le bourg allait pendre {nom} — mais c’est l’Idiot du saloon. La grâce est accordée, et le droit de vote perdu.',
    vote: {
      condamne: 'Les voix sont comptées : la potence attend {nom}.',
      personne: 'Les voix sont comptées : la potence attend en vain.',
    },
    capitaine: {
      elu: '{nom} prend l’étoile : sa voix portera double.',
      successeur: 'L’étoile de {ancien} passe à {nom} : la voix double passe avec.',
    },
    tir: {
      atteint: 'Le Trappeur lâche sa dernière cartouche : elle emporte {cible}.',
      enLair: 'Le Trappeur a gardé sa cartouche.',
    },
    // Aucun participe ne s’accorde avec {nom} : le complément suit le verbe.
    rancune: 'Le bourg a pendu son propre Ancien, {nom} : la ville perd ses moyens.',
    // La lettre est annoncée, jamais la main (R93) : la composition publique
    // dit déjà qui peut l’écrire.
    corbeau: 'La Moucharde a désigné {nom} : au saloon, deux voix sont déjà comptées.',
    // Le chien aboie à l’aube (R108) : il dit les bandanas chez les voisins
    // vivants, jamais leur nom ni leur nombre. Le silence dit autant.
    ours: {
      grogne: 'Le chien de {nom} a aboyé à l’aube : les bandanas s’assoient à ses côtés.',
      silence: 'Le chien de {nom} s’est tu à l’aube : pas de bandana à ses côtés.',
    },
    bouc: 'Les voix se partagent, le bourg ne tranche pas : c’est {nom}, l’Étranger, qui monte au gibet pour tous.',
    votants: {
      designes: 'Dernier mot de l’Étranger : demain, seuls voteront {noms}.',
      personne: 'L’Étranger s’est tu : demain, tout le bourg votera.',
    },
    fin: {
      village: 'Le bourg tient bon : plus un bandana dans la rue.',
      loups: 'Le bourg est vidé. L’étoile ne répond plus.',
      amoureux: 'Les tourtereaux restent seuls dans la rue : la partie est à eux.',
      loupBlanc: 'Le Chasseur de primes se tient seul sous la potence : il a descendu jusqu’à sa propre bande.',
      personne: 'Il ne reste personne pour fermer le saloon.',
    },
  },

  /* --- Les prompts : ils ne promettent que ce que le moteur permet --- */
  prompts: {
    // La carte est une mécanique, la phrase vaut pour tout univers.
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un descend, l’autre suit.',
    proteger: {
      base: 'Choisissez qui dormira derrière votre protection légale cette nuit.',
      interdit: '{ancien} dormait derrière votre protection hier : pas deux nuits de suite — choisissez une autre porte.',
    },
    sonder: 'Tirez les cartes d’un vivant, jamais les vôtres : ce que le tarot dit de lui s’inscrit dans votre carnet.',
    devorer: 'La bande a ses ordres. Désignez qui descendra cette nuit — ou laissez le bourg dormir.',
    sorciere: {
      victime:
        'Les hors-la-loi ont désigné leur cible : {victime}. Réveillez-la avec votre bon remède, ou laissez-la partir — et votre mauvais remède peut frapper un autre vivant.',
      sansVictime: 'Personne n’a été descendu cette nuit. Votre mauvais remède peut encore frapper — ou vous ne faites rien.',
      // La Guérisseuse vouvoyée au féminin applique la règle d’accord : c’est
      // « la Guérisseuse » que le prompt regarde, pas la personne qui la joue.
      soiMemeInterdit:
        'C’est vous que les hors-la-loi ont descendue. La table interdit le remède qui réveille sur soi : l’autre, lui, reste.',
    },
    tirer: 'Votre dernière cartouche : visez un vivant — ou tirez en l’air.',
    successeur: 'Dernier ordre : désignez qui portera l’étoile.',
    voter: {
      // L’élection autorise le vote pour soi (R56) ; le vote du jour
      // l’interdit (R60), et lui seul « peut changer tant que la phase court ».
      election: 'Élisez votre shérif — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui montera au gibet — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // La Moucharde peut se désigner elle-même (R93) : « vous compris ».
    marquer:
      'Désignez un vivant, vous compris : au vote du jour, deux voix pèseront d’office contre ce vivant — ou ne glissez rien sous la porte. La lettre sera lue, jamais la main.',
    // Le Pisteur peut se compter dans son trio (D29), et s’abstenir (R107).
    flairer:
      'Désignez un vivant, vous compris : vous flairerez son trio — lui et ses deux voisins vivants. Un bandana s’y trouve, votre nez répond, et votre flair demeure ; un trio sain vous le retire à vie. Ou ne flairez personne.',
    trahir: 'La bande dort. Descendez l’un des leurs — ou épargnez-la cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont au vote.',
    // Le talon n’appartient qu’au Filou (R110) : l’obligation ne vaut
    // que quand les deux cartes sont des Hors-la-loi.
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez le Filou, sans aucun pouvoir. Celle que vous laissez sort du jeu.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux Hors-la-loi : il faut en prendre une. Celle que vous laissez sort du jeu.',
    },
    seRanger: 'La première nuit, rangez-vous pour toujours : au bourg, sans pouvoir — ou dans la bande, avec ses fusils.',
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il descend, vous passerez de l’autre côté de la rue.',
  },

  canaux: {
    village: 'Le saloon',
    loups: 'La bande',
    amoureux: 'Les tourtereaux',
    // Le murmure des Deux Sœurs et des Trois Frères — un canal par fratrie,
    // ouvert tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    // Les pendus ne parlent plus : le cimetière garde leurs voix.
    morts: 'Le cimetière',
  },

  /* --- Les suggestions, par position : la référence, la bande, l’outillé --- */
  suggestions: [
    { nom: 'La piste tranquille', note: 'L’équilibre du jeu, calculé pour cette table.' },
    { nom: 'Un bandana de plus', note: 'Un Hors-la-loi de plus : la potence ne chômera pas.' },
    { nom: 'Le bourg outillé', note: 'Tous les rôles possibles à cette table : le camp a des mains, et le saloon un juge.' },
  ],

  /* --- La nuit racontée : le log récité, secrets compris (R88) --- */
  recit: {
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'Le Prédicateur a marié {nom} et {ancien} d’un même destin.',
      protection: 'Le Juge de paix a veillé sur {nom}.',
      voyance: 'La Cartomancienne a tiré les cartes de {nom} : {role}.',
      loups: {
        cible: 'Les hors-la-loi ont descendu {nom}.',
        personne: 'Les hors-la-loi n’ont descendu personne.',
      },
      sauvetage: 'Le bon remède a réveillé {nom}.',
      poison: 'Le mauvais remède a emporté {nom}.',
      grace: 'Le vote a épargné {nom} : l’Idiot du saloon ne vote plus jamais.',
      capitaine: '{nom} a reçu l’étoile.',
      tir: {
        cible: 'Le Trappeur a abattu {nom}.',
        personne: 'Le Trappeur a gardé sa cartouche.',
      },
      vote: {
        condamne: 'Le bourg a livré {nom} à la potence.',
        personne: 'Le bourg n’a livré personne à la potence.',
      },
      resistance: 'Les hors-la-loi sont tombés sur {nom} : l’Ancien a tenu bon.',
      rancune: 'En pendant {nom}, son Ancien, le bourg a perdu ses moyens.',
      corbeau: 'La Moucharde a désigné {nom}.',
      // Le log ne dit que le centre du trio (R107) : les voisins se lisent
      // sur la table, la conclusion suffit au récit.
      renard: {
        loups: 'Le Pisteur a flairé le trio autour de {nom} : les bandanas y étaient.',
        sain: 'Le Pisteur a flairé le trio autour de {nom} : un trio sain, et son flair s’en est allé.',
      },
      ours: {
        grogne: 'À l’aube, le chien de {nom} a aboyé : les bandanas sont à ses côtés.',
        silence: 'À l’aube, le chien de {nom} s’est tu : pas de bandana à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, l’Étranger.',
      votants: {
        designes: 'L’Étranger a désigné les votants du lendemain : {noms}.',
        personne: 'L’Étranger n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Chasseur de primes a descendu {nom}, un Hors-la-loi de sa propre bande.',
        personne: 'Le Chasseur de primes a épargné la bande.',
      },
      // Le chapardage ne se raconte qu’ici : la carte prise, ou la sienne
      // gardée — le log ne dit ni le talon ni la main (R110).
      voleur: {
        prise: 'Le Filou a pris la carte {role}.',
        garde: 'Le Filou a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'Le Marshal {nom} s’est rangé au bourg.',
        loups: 'Le Marshal {nom} s’est rangé dans la bande.',
      },
      modele: 'L’Émule {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      // Le passage de la rue ne se crie pas (D33) : le récit seul le
      // relit, et le camp d’origine s’y devine.
      transformation: 'Le modèle de {nom} est descendu : l’Émule a passé la rue.',
    },
  },

  /*
    --- Les légendes du graveur (SPEC § 6) : sèches, sans héroïsme, des corps ---
    Le registre du bourg : des potences, pas des discours. Les phrases ne
    commentent pas ; elles regardent de côté. Esquisse, à relire avec un
    habitant.
  */
  legendes: {
    roles: {
      villageois: 'Le convoi passait. Personne n’a dormi.',
      loup: 'Le bandana ne pardonne pas.',
      voyante: 'Elle lit les cartes, jamais les visages.',
      sorciere: 'Deux remèdes, et le mauvais.',
      chasseur: 'Il vise mieux mort que debout.',
      cupidon: 'Devant Dieu, il a dit.',
      salvateur: 'Il retarde la corde, une nuit à la fois.',
      idiot: 'Pardonné au pied du gibet, et jamais écouté.',
      ancien: 'Il en a enterré d’autres, et pire.',
      corbeau: 'Le mot glissé n’était pas signé.',
      bouc: 'Un étranger pend mieux qu’un voisin.',
      petiteFille: 'Compter les fusils, c’est déjà tirer.',
      loupBlanc: 'La bande ne trie pas ses balles, dit-on.',
      villageois2: 'Honnête des deux côtés du brevet.',
      renard: 'Il lit la piste mieux que l’écriture.',
      ours: 'Le chien le sait avant tout le monde.',
      voleur: 'Il ne vole pas : il emprunte sans rendre.',
      chienLoup: 'Deux camps, une seule étoile.',
      enfantSauvage: 'Il regarde faire, puis fait pareil.',
      soeurs: 'Elles se sont reconnues à voix basse.',
      freres: 'Trois fois le même menton, trois fois la même parole.',
    },
    ecrans: {
      accueil: 'Une ville vaut une corde.',
      salon: 'Assis au comptoir, comme chaque samedi.',
      revelation: 'Nul n’est inscrit au registre du territoire.',
      nuitDormeur: 'Dormez : le chien veille.',
      mort: 'Tout voir, enfin, et depuis le cimetière.',
      aubeMorts: 'Les balcons n’ont rien vu.',
      aubePaisible: 'Le piano reprend, pas la confiance.',
      election: 'Qui crie le plus fort prend l’étoile.',
      vote: 'Tous d’accord, donc tous innocents.',
      depouillement: 'Les voix sont comptées ; les cercueils suivent.',
      chasseurAttente: 'Il vise mieux mort que debout.',
      succession: 'L’étoile change de poitrine, pas de discours.',
      boucDernierMot: 'Il fallait bien un visage nouveau.',
      fin: 'La poussière attendra la prochaine caravane.',
      tableDisparue: 'La rue s’est vidée sans vous.',
    },
    recit: {
      loupBlanc: 'La bande ne trie pas ses balles, dit-on.',
      rancune: 'Le bourg a scié sa propre potence.',
      poison: 'Deux remèdes, et le mauvais.',
      tir: 'Il vise mieux mort que debout.',
      chagrin: 'Liés par le Prédicateur, séparés par rien.',
      grace: 'Pardonné au pied du gibet, et jamais écouté.',
      bouc: 'Un étranger pend mieux qu’un voisin.',
      voteMeute: 'Un vote, une consigne, pas de débat.',
      voteVillage: 'Tous d’accord, donc tous innocents.',
      sauvetage: 'Le remède a servi ; nul ne l’a su.',
      loups: 'Les fers à cheval ne font pas de bruit sur la piste.',
      resistance: 'Il en a enterré d’autres, et pire.',
      protection: 'Pour une nuit, la loi est passée.',
      corbeau: 'Le mot glissé n’était pas signé.',
      voyance: 'Elle lit les cartes, jamais les visages.',
      amoureux: 'Devant Dieu, il a dit.',
      nuitDefaut: 'La nuit, la rue appartient aux bandanas.',
      jourDefaut: 'Ils ont délibéré jusqu’à l’eau de feu.',
      derniere: 'La poussière attendra la prochaine caravane.',
    },
  },

  // Les dix-huit couvre-chefs du bourg, un par siège (SPEC § 5.1.2) :
  // tout ce qui se pose sur une tête quand le saloon se remplit.
  couvreChefs: [
    'chapeau de cow-boy',
    'sombrero de voyageur',
    'casque de mineur',
    'casquette de vendeur d’élixir',
    'feutre de chercheur d’or',
    'chapeau plat de pasteur',
    'bonnet de fourrure du trappeur',
    'cagoule de bandit',
    'bandana de voleur de bétail',
    'képi de shérif',
    'casquette de conducteur de train',
    'bonnet de veuve',
    'foulard de dame de ferme',
    'chapeau haut de forme du banquier',
    'capuche de cavalier',
    'calot de télégraphiste',
    'bonnet de nuit du croque-mort',
    'chapeau à plumes de danseuse',
  ],
};
