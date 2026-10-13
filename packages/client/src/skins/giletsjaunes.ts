/**
 * Gilets Jaunes — le troisième habit.
 *
 * Un rond-point de commune, entre la départementale et le supermarché : la
 * cabane en palette, le feu de camp, le mégaphone — et la nuit, les casques.
 * La mort n’y est jamais une violence : elle est un embarquement, le fourgon
 * au loin, et les embarqués bavardent ensemble dans le fourgon. La satire ne
 * prend pas parti : l’assemblée qui délibère à côté de ses pneus et l’unité
 * qui charge dans le vide se valent à l’écran. Le narrateur constate, il ne
 * milite pas ; aucun nom propre réel ne passe jamais (règle de plume n° 1).
 *
 * Comme Shiganshina, la peau est marquée « Esquisse » là où la plume n’a pas
 * été relue par un habitant du rond-point : chaque complément tient la place,
 * il ne prétend pas à la phrase définitive. Elle n’en est pas moins complète
 * au sens du registre — chaque rôle traduit, chaque cause de mort racontée —
 * sinon le registre la refuserait : l’esquisse est une question de plume,
 * jamais une permission d’afficher « sorciere ».
 */

import type { Skin } from './registre.js';

export const giletsjaunes: Skin = {
  id: 'giletsjaunes',
  univers: 'Gilets Jaunes',
  charge: 'le porte-parole',
  // Esquisse : « CRS » ne prend ni pluriel ni majuscule de plus — une unité,
  // deux unités, c’est le même sens.
  plurielLoups: { un: 'CRS', plusieurs: 'CRS' },
  // Esquisse : l’absent est au rond-point de tous les matins, près du thermos.
  absent: 'parti chercher du café',

  /* --- Les rôles : la transposition du rond-point --- */
  roles: {
    villageois: {
      nom: 'Gilet jaune',
      // Esquisse : la carte du Villageois, transposée — la voix, et la vidéo.
      description:
        'Pas de pouvoir. Votre arme, c’est votre voix à l’assemblée — et votre téléphone pour filmer la suite.',
    },
    loup: {
      nom: 'CRS',
      // Esquisse : l’unité en bleu, la nuit venue.
      description:
        'Chaque nuit, l’unité embarque un occupant du rond-point. Le jour, vous patrouillez en civil, mégaphone éteint.',
    },
    voyante: {
      nom: 'la Fouilleuse',
      // Esquisse : elle fouille les poches de tout le monde, sans exception.
      description:
        'Chaque nuit, fouillez un vivant : ce qu’il cache sous le gilet s’inscrit dans votre carnet, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Secouriste',
      // Esquisse : deux doses dans la trousse, pas deux potions.
      description:
        'Deux remèdes, une seule fois chacun : la dose qui réveille la victime des CRS, et celle qui endort pour de bon qui vous voulez.',
    },
    chasseur: {
      nom: 'le Chasseur',
      // Esquisse : même prudence que la carte du Chasseur — la phrase annonce
      // le pouvoir, la table connaît ses limites (D1).
      description: 'En tombant, vous pouvez tirer votre dernière cartouche sur le joueur de votre choix.',
    },
    cupidon: {
      nom: 'le Beau-frère',
      // Esquisse : il marie tout le monde, sans demander la bénédiction de personne.
      description:
        'La première nuit seulement, mariez deux vivants d’un même destin : si l’un est embarqué, l’autre le suit.',
    },
    salvateur: {
      nom: 'l’Avocat',
      // Esquisse : le rempart juridique, saisi avant la nuit.
      description:
        'Chaque nuit, votre rempart juridique protège un occupant des CRS — jamais le même deux nuits de suite, et la garde à vue passe toujours.',
    },
    idiot: {
      nom: 'l’Idiot du rond-point',
      // Esquisse : gracié, affiché, muet au vote — l’accord suit le rôle,
      // jamais la personne derrière l’écran.
      description:
        'Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 : transposés sur le même talus --- */
    ancien: {
      // Esquisse : il a tenu des barrages avant celui-ci, et il en gardera d’autres.
      nom: 'l’Ancien',
      description:
        'Vous avez déjà tenu des barrages avant celui-ci : la première charge ne vous emporte pas, la seconde si. Et si le rond-point vous livre de sa main, il peut perdre ses moyens avec vous.',
    },
    corbeau: {
      // Esquisse : le mot glissé sous la porte de la cabane, jamais signé.
      nom: 'la Balance',
      description:
        'Chaque nuit, désignez un vivant : à l’assemblée, deux voix pèseront d’office contre ce vivant. La motion est annoncée, jamais sa main.',
    },
    bouc: {
      // Esquisse : littéral — la tête la plus proche du fourgon.
      nom: 'le Bouc émissaire',
      description:
        'Si le vote de l’assemblée finit à égalité, c’est vous qui montez dans le fourgon pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      // Esquisse : depuis le talus, elle cadre mieux qu’elle ne vote.
      nom: 'la Lycéenne',
      description:
        'Pendant que les CRS choisissent leur cible, vous filmez depuis le talus : vous voyez combien de casques visent chaque occupant — jamais lesquels.',
    },
    loupBlanc: {
      // Esquisse : les affaires internes, celles que l’unité n’aime pas voir remonter.
      nom: 'l’Inspecteur',
      description:
        'Vous embarquez avec l’unité, qui vous prend pour l’un des siens. Une nuit sur deux, vous pouvez embarquer un CRS. Vous ne gagnez que seul.',
    },
    /* --- La v3 (R105 à R114) : même transposition, même talon --- */
    villageois2: {
      // Esquisse : la carte recto-verso (R106, D31) — certifié des deux côtés.
      nom: 'le Gilet certifié',
      description:
        'Aucun pouvoir, aucune vie bonus : la carte est recto-verso, et les deux faces disent la même chose — Gilet jaune réglementaire. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      nom: 'le Renard',
      description:
        'Chaque nuit, flairez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. Un casque bleu dans le trio : votre nez répond, et votre flair demeure. Un trio sain : votre flair s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      // Esquisse : le chien du rond-point, qui n’aime personne.
      nom: 'l’Éleveur',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce des embarquements, votre chien aboie si un casque bleu s’assied à vos côtés — et son silence, lui aussi, est une information.',
    },
    voleur: {
      // Esquisse : la caisse à outils de la cabane, ouverte avant la révélation.
      nom: 'le Chapardeur',
      description:
        'Avant même la révélation, deux cartes restées sur la table sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez le Chapardeur, sans aucun pouvoir. Deux CRS dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      // Esquisse : deux camps, une seule solde.
      nom: 'le Gendarme',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé au rond-point, vous n’avez aucun pouvoir ; rangé chez les CRS, vous embarquez avec eux — et l’unité vous prend pour l’un des siens.',
    },
    enfantSauvage: {
      // Esquisse : il regarde faire, puis fait pareil.
      nom: 'l’Apprenti',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il est embarqué, quoi qu’il arrive, vous rejoignez les CRS.',
    },
    soeurs: {
      nom: 'les Deux Sœurs',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — le fourgon seul le referme.',
    },
    freres: {
      nom: 'les Trois Frères',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — le fourgon seul le referme.',
    },
  },

  camps: { village: 'le rond-point', loups: 'les forces de l’ordre' },
  vainqueurs: {
    village: 'le rond-point',
    loups: 'les forces de l’ordre',
    amoureux: 'les tourtereaux',
    loupBlanc: 'l’Inspecteur',
    personne: 'personne',
  },

  /* --- Le narrateur : il annonce, il ne commente pas (R87) --- */
  narrateur: {
    debut: 'La cabane est montée sur le rond-point. Que l’assemblée commence.',

    phases: {
      // Le talon ne se montre qu’à son propriétaire : la phrase dit la
      // scène, jamais la main qui va choisir (R110, R87).
      voleur: 'Deux cartes restent sur la table, au pied de la cabane. Quelqu’un doit choisir.',
      // La carte est une mécanique, la phrase vaut pour tout univers —
      // reprise de Thiercelieux, transposée sans déguisement.
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      nuit: {
        principale: 'La nuit tombe sur la départementale. Le camp s’endort.',
        // Plate par choix, comme à Thiercelieux — l’étape est un fait
        // d’architecture, pas un fait de récit.
        sorciere: 'La nuit se poursuit.',
        // Plate aussi — l’étape de l’Inspecteur se tient mort compris (R97).
        loupBlanc: 'La nuit se poursuit.',
      },
      chasseur: 'Le Chasseur rend l’âme, le doigt sur la détente. La partie attend son dernier geste.',
      succession: 'Le porte-parole est tombé : le mégaphone attend une bouche.',
      // « peut » : au temps écoulé, il s’est tu, et tout le monde vote (R94).
      bouc: 'Le Bouc émissaire monte dans le fourgon. Son dernier mot peut désigner qui votera demain.',
      election: 'Le rond-point se choisit un porte-parole.',
      jour: 'Le jour se lève sur la départementale. L’assemblée délibère.',
      fin: 'La dernière pancarte est plantée au milieu du rond-point.',
    },

    morts: {
      loups: 'Les CRS ont embarqué {nom}.',
      poison: 'La mauvaise dose a emporté {nom}.',
      vote: 'L’assemblée a livré {nom} aux forces de l’ordre.',
      chasseur: 'La cartouche du Chasseur a atteint {nom}.',
      chagrin: 'Le cœur brisé a eu raison de {nom}.',
      // R101 : l’absence a trop duré. Le narrateur ne juge pas, il constate
      // — la carte se retourne, ou non, selon la table.
      abandon: '{nom} a quitté le rond-point sans un mot.',
    },
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Personne n’a été embarqué cette nuit. Le feu de camp reprend.',
    grace:
      'L’assemblée allait livrer {nom} aux forces de l’ordre — mais c’est l’Idiot du rond-point. La grâce est accordée, et le droit de vote perdu.',
    vote: {
      condamne: 'Les voix sont comptées : le fourgon attend {nom}.',
      personne: 'Les voix sont comptées : le fourgon repart à vide.',
    },
    capitaine: {
      elu: '{nom} prend le mégaphone : sa voix portera double.',
      successeur: 'Le mégaphone de {ancien} passe à {nom} : la voix double passe avec.',
    },
    tir: {
      atteint: 'Le Chasseur lâche sa dernière cartouche : elle emporte {cible}.',
      enLair: 'Le Chasseur a gardé sa cartouche.',
    },
    // Aucun participe ne s’accorde avec {nom} : le complément suit le verbe.
    rancune: 'L’assemblée a livré son propre Ancien, {nom} : le rond-point perd ses moyens.',
    // La motion est annoncée, jamais la main (R93) : la composition publique
    // dit déjà qui peut l’écrire.
    corbeau: 'La Balance a désigné {nom} : à l’assemblée, deux voix sont déjà comptées.',
    // Le chien aboie à l’aube (R108) : il dit les casques bleus chez les
    // voisins vivants, jamais leur nom ni leur nombre. Le silence dit autant.
    ours: {
      grogne: 'Le chien de {nom} a aboyé à l’aube : les CRS s’assoient à ses côtés.',
      silence: 'Le chien de {nom} s’est tu à l’aube : pas de casque bleu à ses côtés.',
    },
    bouc: 'Les voix se partagent, l’assemblée ne tranche pas : c’est {nom}, le Bouc émissaire, qui monte dans le fourgon pour tous.',
    votants: {
      designes: 'Dernier mot du Bouc émissaire : demain, seuls voteront {noms}.',
      personne: 'Le Bouc émissaire s’est tu : demain, tout le rond-point votera.',
    },
    fin: {
      village: 'Le rond-point tient bon : plus un bouclier sur la départementale.',
      loups: 'Le rond-point est dégagé. Le gilet ne répond plus.',
      amoureux: 'Les tourtereaux restent seuls au rond-point : la partie est à eux.',
      loupBlanc: 'L’Inspecteur se tient seul devant la barrière : il a embarqué jusqu’à ses propres collègues.',
      personne: 'Il ne reste personne pour garder la cabane.',
    },
  },

  /* --- Les prompts : ils ne promettent que ce que le moteur permet --- */
  prompts: {
    // La carte est une mécanique, la phrase vaut pour tout univers.
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un est embarqué, l’autre le suit.',
    proteger: {
      base: 'Choisisz qui dormira derrière votre rempart juridique cette nuit.',
      interdit:
        '{ancien} dormait derrière votre rempart hier : pas deux nuits de suite — choisissez une autre cabane.',
    },
    sonder: 'Fouillez un vivant, jamais vous : ce qu’il cache sous le gilet s’inscrit dans votre carnet.',
    devorer: 'L’unité a ses ordres. Désignez qui montera dans le fourgon — ou laissez le rond-point dormir.',
    sorciere: {
      victime:
        'Les CRS ont désigné leur cible : {victime}. Réveillez-la avec votre bonne dose, ou laissez-la partir — et votre mauvaise dose peut frapper un autre vivant.',
      sansVictime:
        'Personne n’a été embarqué cette nuit. Votre mauvaise dose peut encore frapper — ou vous ne faites rien.',
      // La Secouriste vouvoyée au féminin applique la règle d’accord : c’est
      // « la Secouriste » que le prompt regarde, pas la personne qui la joue.
      soiMemeInterdit:
        'C’est vous que les CRS ont embarquée. La table interdit la dose qui réveille sur soi : l’autre, lui, reste.',
    },
    tirer: 'Votre dernière cartouche : visez un vivant — ou tirez en l’air.',
    successeur: 'Dernier ordre : désignez qui portera le mégaphone.',
    voter: {
      // L’élection autorise le vote pour soi (R56) ; le vote du jour
      // l’interdit (R60), et lui seul « peut changer tant que la phase court ».
      election: 'Élisez votre porte-parole — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui montera dans le fourgon — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // La Balance peut se désigner elle-même (R93) : « vous compris ».
    marquer:
      'Désignez un vivant, vous compris : à l’assemblée, deux voix pèseront d’office contre ce vivant — ou ne glissez rien sous la porte. Le mot sera lu, jamais la main.',
    // Le Renard peut se compter dans son trio (D29), et s’abstenir (R107).
    flairer:
      'Désignez un vivant, vous compris : vous flairerez son trio — lui et ses deux voisins vivants. Un casque bleu s’y trouve, votre nez répond, et votre flair demeure ; un trio sain vous le retire à vie. Ou ne flairez personne.',
    trahir: 'L’unité dort. Embarquez l’un des leurs — ou épargnez-la cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont à l’assemblée.',
    // Le talon n’appartient qu’au Chapardeur (R110) : l’obligation ne vaut
    // que quand les deux cartes sont des CRS.
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez le Chapardeur, sans aucun pouvoir. Celle que vous laissez sort du jeu.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux CRS : il faut en prendre une. Celle que vous laissez sort du jeu.',
    },
    seRanger: 'La première nuit, rangez-vous pour toujours : au rond-point, sans pouvoir — ou chez les CRS, avec leurs fourgons.',
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il est embarqué, vous passerez de l’autre côté de la barrière.',
  },

  canaux: {
    village: 'L’assemblée',
    loups: 'La brigade',
    amoureux: 'Les tourtereaux',
    // Le murmure des Deux Sœurs et des Trois Frères — un canal par fratrie,
    // ouvert tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    // Les embarqués bavardent dans le fourgon : l’au-delà du rond-point.
    morts: 'Le fourgon',
  },

  /* --- Les suggestions, par position : la référence, l’unité, l’outillé --- */
  suggestions: [
    { nom: 'La manif tranquille', note: 'L’équilibre du jeu, calculé pour cette table.' },
    { nom: 'Une unité de plus', note: 'Un CRS de plus : les fourgons ne rentreront pas vides.' },
    { nom: 'Le rond-point outillé', note: 'Tous les rôles possibles à cette table : le camp a des mains, et l’assemblée un avocat.' },
  ],

  /* --- La nuit racontée : le log récité, secrets compris (R88) --- */
  recit: {
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'Le Beau-frère a marié {nom} et {ancien} d’un même destin.',
      protection: 'L’Avocat a plaidé pour {nom}.',
      voyance: 'La Fouilleuse a fouillé {nom} : {role}.',
      loups: {
        cible: 'Les CRS ont embarqué {nom}.',
        personne: 'Les CRS n’ont embarqué personne.',
      },
      sauvetage: 'La bonne dose a réveillé {nom}.',
      poison: 'La mauvaise dose a emporté {nom}.',
      grace: 'Le vote a épargné {nom} : l’Idiot du rond-point ne vote plus jamais.',
      capitaine: '{nom} a reçu le mégaphone.',
      tir: {
        cible: 'Le Chasseur a abattu {nom}.',
        personne: 'Le Chasseur a gardé sa cartouche.',
      },
      vote: {
        condamne: 'L’assemblée a livré {nom} au fourgon.',
        personne: 'L’assemblée n’a livré personne au fourgon.',
      },
      resistance: 'Les CRS ont foncé sur {nom} : l’Ancien a tenu bon.',
      rancune: 'En livrant {nom}, son Ancien, l’assemblée a perdu ses moyens.',
      corbeau: 'La Balance a désigné {nom}.',
      // Le log ne dit que le centre du trio (R107) : les voisins se lisent
      // sur le rond-point, la conclusion suffit au récit.
      renard: {
        loups: 'Le Renard a flairé le trio autour de {nom} : les casques bleus y étaient.',
        sain: 'Le Renard a flairé le trio autour de {nom} : un trio sain, et son flair s’en est allé.',
      },
      ours: {
        grogne: 'À l’aube, le chien de {nom} a aboyé : les CRS sont à ses côtés.',
        silence: 'À l’aube, le chien de {nom} s’est tu : pas de casque bleu à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, le Bouc émissaire.',
      votants: {
        designes: 'Le Bouc émissaire a désigné les votants du lendemain : {noms}.',
        personne: 'Le Bouc émissaire n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'L’Inspecteur a embarqué {nom}, un CRS de sa propre unité.',
        personne: 'L’Inspecteur a épargné l’unité.',
      },
      // Le chapardage ne se raconte qu’ici : la carte prise, ou la sienne
      // gardée — le log ne dit ni le talon ni la main (R110).
      voleur: {
        prise: 'Le Chapardeur a pris la carte {role}.',
        garde: 'Le Chapardeur a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'Le Gendarme {nom} s’est rangé au rond-point.',
        loups: 'Le Gendarme {nom} s’est rangé chez les CRS.',
      },
      modele: 'L’Apprenti {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      // Le passage de la barrière ne se crie pas (D33) : le récit seul le
      // relit, et le camp d’origine s’y devine.
      transformation: 'Le modèle de {nom} a été embarqué : l’Apprenti a passé la barrière.',
    },
  },

  /*
    --- Les légendes du graveur (SPEC § 6) : sèches, sans héroïsme, des corps ---
    Le registre du rond-point : des pancartes, pas des slogans. Les phrases ne
    commentent pas ; elles regardent de côté. Esquisse, à relire avec un
    habitant.
  */
  legendes: {
    roles: {
      villageois: 'Il n’y avait que la chaîne pour le dire.',
      loup: 'Le bouclier ne discute pas.',
      voyante: 'Elle fouille les poches, pas la conscience.',
      sorciere: 'Deux doses, et la mauvaise.',
      chasseur: 'Il tire mieux mort que debout.',
      cupidon: 'La famille, c’est pour la vie, comme il dit.',
      salvateur: 'Il retarde l’inévitable, une nuit à la fois.',
      idiot: 'Gracié, et toujours pas écouté.',
      ancien: 'Il en a vu d’autres, et pire.',
      corbeau: 'Le mot glissé n’était pas signé.',
      bouc: 'Il fallait bien quelqu’un.',
      petiteFille: 'Chaque charge a sa vidéo.',
      loupBlanc: 'Les bleus ne contrôlent pas les bleus, dit-on.',
      villageois2: 'Certifié des deux côtés.',
      renard: 'Il connaît le quartier par les trous de nez.',
      ours: 'Le chien le sait avant tout le monde.',
      voleur: 'Il ne vole pas : il recycle.',
      chienLoup: 'Deux camps, une seule solde.',
      enfantSauvage: 'Il regarde faire, puis fait pareil.',
      soeurs: 'Elles se sont reconnues à voix basse.',
      freres: 'Trois fois le même menton, trois fois la même parole.',
    },
    ecrans: {
      accueil: 'La démocratie tient sur un rond-point.',
      salon: 'Assis en rond, comme chaque samedi.',
      revelation: 'Nul n’est inscrit sur la liste.',
      nuitDormeur: 'Dormez : d’autres vous surveillent.',
      mort: 'Tout voir, enfin, et depuis le fourgon.',
      aubeMorts: 'Les balcons n’ont rien vu.',
      aubePaisible: 'Le feu reprend, pas la confiance.',
      election: 'Qui crie le plus fort tient le mégaphone.',
      vote: 'Tous d’accord, donc tous innocents.',
      depouillement: 'Les voix sont comptées ; les mandats, jamais.',
      chasseurAttente: 'Il tire mieux mort que debout.',
      succession: 'Le mégaphone change de main, pas de discours.',
      boucDernierMot: 'Il fallait bien quelqu’un.',
      fin: 'Le feu attendra l’hiver prochain.',
      tableDisparue: 'Le rond s’est vidé sans vous.',
    },
    recit: {
      loupBlanc: 'Les bleus ne contrôlent pas les bleus, dit-on.',
      rancune: 'Le camp a scié son propre mât.',
      poison: 'Deux doses, et la mauvaise.',
      tir: 'Il tire mieux mort que debout.',
      chagrin: 'Liés par un Beau-frère, séparés par rien.',
      grace: 'Gracié, et toujours pas écouté.',
      bouc: 'Il fallait bien quelqu’un.',
      voteMeute: 'Un vote, une consigne, pas de débat.',
      voteVillage: 'Tous d’accord, donc tous innocents.',
      sauvetage: 'La dose a servi ; nul ne l’a su.',
      loups: 'Les fourgons ne font pas de bruit sur les graviers.',
      resistance: 'Il en a vu d’autres, et pire.',
      protection: 'Pour une fois, la procédure a tenu.',
      corbeau: 'Le mot glissé n’était pas signé.',
      voyance: 'Elle fouille les poches, pas la conscience.',
      amoureux: 'La famille, c’est pour la vie, comme il dit.',
      nuitDefaut: 'La garde à vue n’attend pas l’aube.',
      jourDefaut: 'Ils ont discuté la moindre motion.',
      derniere: 'Le feu attendra l’hiver prochain.',
    },
  },

  // Les dix-huit couvre-chefs du rond-point, un par siège (SPEC § 5.1.2) :
  // tout ce qui se pose sur une tête quand l’assemblée siège.
  couvreChefs: [
    'casque de chantier',
    'bonnet de laine',
    'casquette de routier',
    'cagoule de ski',
    'bombe de motard',
    'béret basque',
    'bob de pêche',
    'bandana de colleur d’affiches',
    'capuche de survêtement',
    'chapeau de paille',
    'casquette de chasse',
    'casque de moto',
    'foulard de syndicaliste',
    'canotier de fanfare',
    'chapeau de pluie de maire',
    'calotte de cantonnier',
    'chapka d’huissier',
    'képi de gendarme',
  ],
};
