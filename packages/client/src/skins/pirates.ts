/**
 * Pirates — le quatrième habit.
 *
 * Un trois-mâts sur l’océan, quelque part entre la traversée et le pillage :
 * le pont du matin, la cale des mutins, la planche qui court au bout du
 * gaillard d’avant. La mort n’y est jamais une violence : elle est la mer,
 * qui reprend ce qu’on lui prête, et les noyés bavardent ensemble dans la
 * chaloupe. La mutinerie et le conseil se valent à l’écran : l’équipage qui
 * délibère à côté de ses cordages et la cale qui coupe les vivres disent la
 * même mécanique, chacun dans sa langue. Le narrateur constate, il ne prend
 * pas de parti ; aucun pavillon réel ne passe jamais (règle de plume n° 1).
 *
 * Comme Gilets Jaunes, la peau est marquée « Esquisse » là où la plume n’a
 * pas été relue par un habitué du gaillard : chaque complément tient la
 * place, il ne prétend pas à la phrase définitive. Elle n’en est pas moins
 * complète au sens du registre — chaque rôle traduit, chaque cause de mort
 * racontée — sinon le registre la refuserait : l’esquisse est une question
 * de plume, jamais une permission d’afficher « sorciere ».
 */

import type { Skin } from './registre.js';

export const pirates: Skin = {
  id: 'pirates',
  univers: 'Pirates',
  charge: 'le capitaine',
  plurielLoups: { un: 'Mutin', plusieurs: 'Mutins' },
  // Esquisse : l’absent est à la manœuvre des hautes voiles, sa place au
  // conseil reste la sienne.
  absent: 'parti chercher le vent',

  /* --- Les rôles : la transposition du bord --- */
  roles: {
    villageois: {
      nom: 'Matelot',
      // Esquisse : la carte du Villageois, transposée — la voix, et les bras.
      description:
        'Pas de pouvoir. Votre arme, c’est votre voix au conseil — et vos bras pour la manœuvre quand le vent tourne.',
    },
    loup: {
      nom: 'Mutin',
      // Esquisse : la cale ne dort jamais tout à fait.
      description:
        'Chaque nuit, la mutinerie jette un matelot par-dessus bord. Le jour, vous halez sur les drisses comme les autres, au milieu de l’équipage.',
    },
    voyante: {
      nom: 'la Vigie',
      // Esquisse : du nid de pie, elle voit ce qui se passe sous les serpillières.
      description:
        'Chaque nuit, sondez un vivant : ce qu’il cache sous sa serpillière s’inscrit dans votre carnet, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Guérisseuse',
      // Esquisse : deux remèdes dans la sacoche, pas deux potions.
      description:
        'Deux remèdes, une seule fois chacun : celui qui repêche la victime des mutins, et celui qui envoie par le fond qui vous voulez.',
    },
    chasseur: {
      nom: 'le Canonnier',
      // Esquisse : même prudence que la carte du Chasseur — la phrase annonce
      // le pouvoir, la table connaît ses limites (D1).
      description: 'En tombant, vous pouvez lâcher votre dernier boulet sur le joueur de votre choix.',
    },
    cupidon: {
      nom: 'le Barbier',
      // Esquisse : il rase l’équipage et marie les gens, sans demander leur avis.
      description:
        'La première nuit seulement, mariez deux vivants d’un même destin : si l’un passe par-dessus bord, l’autre le suit.',
    },
    salvateur: {
      nom: 'le Charpentier',
      // Esquisse : le calfattage de la nuit, refait chaque soir.
      description:
        'Chaque nuit, votre calfattage protège un matelot des mutins — jamais le même deux nuits de suite, et la mer passe toujours.',
    },
    idiot: {
      nom: 'l’Idiot de l’équipage',
      // Esquisse : gracié, affiché, muet au conseil — l’accord suit le rôle,
      // jamais la personne derrière l’écran.
      description:
        'Condamné par le conseil, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 : transposés sur le même pont --- */
    ancien: {
      // Esquisse : il a survécu à des naufrages avant celui-ci, et il en verra d’autres.
      nom: 'l’Ancien',
      description:
        'Vous avez survécu à des naufrages avant celui-ci : le premier abordage des mutins ne vous emporte pas, le second si. Et si l’équipage vous jette à la mer de sa main, il peut perdre ses moyens avec vous.',
    },
    corbeau: {
      // Esquisse : la bouteille glissée à la mer, jamais signée — la mer la
      // rend au conseil, le mot y est lu.
      nom: 'la Bouteille à la mer',
      description:
        'Chaque nuit, désignez un vivant : au conseil, deux voix pèseront d’office contre ce vivant. La bouteille est lue, jamais sa main.',
    },
    bouc: {
      // Esquisse : littéral — embarqué la veille, il paie pour tous.
      nom: 'le Nouveau',
      description:
        'Si le vote du conseil finit à égalité, c’est vous qui marchez sur la planche pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      // Esquisse : depuis le grand mât, elle compte mieux qu’elle ne vote.
      nom: 'la Clandestine',
      description:
        'Pendant que les mutins choisissent leur proie, vous guettez depuis le grand mât : vous voyez combien de couteaux visent chaque matelot — jamais lesquels.',
    },
    loupBlanc: {
      // Esquisse : les comptes de la cale, ceux que la mutinerie n’aime pas
      // voir remonter sur le pont.
      nom: 'le Flibustier',
      description:
        'Vous remontez de la cale avec les mutins, qui vous prennent pour l’un des leurs. Une nuit sur deux, vous pouvez jeter un mutin à la mer. Vous ne gagnez que seul.',
    },
    /* --- La v3 (R105 à R114) : même transposition, même talon --- */
    villageois2: {
      // Esquisse : la carte recto-verso (R106, D31) — lettres de marque des
      // deux côtés.
      nom: 'le Corsaire',
      description:
        'Aucun pouvoir, aucune vie bonus : la carte est recto-verso, et les deux faces portent le même cachet — matelot assermenté du bord. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      nom: 'la Fouine',
      description:
        'Chaque nuit, flairez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. Un mutin dans le trio : votre nez répond, et votre flair demeure. Un trio sain : votre flair s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      // Esquisse : le chien du boucanier, qui n’aime personne.
      nom: 'le Boucanier',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce de la nuit, votre chien de chasse grogne si un mutin s’assoit à vos côtés — et son silence, lui aussi, est une information.',
    },
    voleur: {
      // Esquisse : le talon oublié sur la table du carré, avant la révélation.
      nom: 'le Forban',
      description:
        'Avant même la révélation, deux cartes restées sur la table sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez le Forban, sans aucun pouvoir. Deux Mutins dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      // Esquisse : deux camps, une seule part de butin.
      nom: 'le Renégat',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé au bord, vous n’avez aucun pouvoir ; rangé dans la cale, vous jetez à la mer avec les mutins — et ils vous prennent pour l’un des leurs.',
    },
    enfantSauvage: {
      // Esquisse : il regarde faire, puis fait pareil.
      nom: 'le Moussaillon',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il est jeté à la mer, quoi qu’il arrive, vous rejoignez la cale.',
    },
    soeurs: {
      nom: 'les Deux Sœurs',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mer seule le referme.',
    },
    freres: {
      nom: 'les Trois Frères',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mer seule le referme.',
    },
  },

  camps: { village: 'l’équipage', loups: 'les mutins' },
  vainqueurs: {
    village: 'l’équipage',
    loups: 'les mutins',
    amoureux: 'les tourtereaux',
    loupBlanc: 'le Flibustier',
    personne: 'personne',
  },

  /* --- Le narrateur : il annonce, il ne commente pas (R87) --- */
  narrateur: {
    debut: 'L’ancre est levée, l’équipage est réuni. Que la traversée commence.',

    phases: {
      // Le talon ne se montre qu’à son propriétaire : la phrase dit la
      // scène, jamais la main qui va choisir (R110, R87).
      voleur: 'Deux cartes restent sur la table du carré. Quelqu’un doit choisir.',
      // La carte est une mécanique, la phrase vaut pour tout univers —
      // reprise de Thiercelieux, transposée sans déguisement.
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      nuit: {
        principale: 'La nuit tombe sur le pont. Le navire s’endort.',
        // Plate par choix, comme à Thiercelieux — l’étape est un fait
        // d’architecture, pas un fait de récit.
        sorciere: 'La nuit se poursuit.',
        // Plate aussi — l’étape du Flibustier se tient mort compris (R97).
        loupBlanc: 'La nuit se poursuit.',
      },
      chasseur: 'Le Canonnier rend l’âme, la mèche entre les doigts. La partie attend son dernier geste.',
      succession: 'Le capitaine est tombé : la barre attend une main.',
      // « peut » : au temps écoulé, il s’est tu, et tout le monde vote (R94).
      bouc: 'Le Nouveau marche sur la planche. Son dernier mot peut désigner qui votera demain.',
      election: 'L’équipage se choisit un capitaine.',
      jour: 'Le jour se lève sur le pont. Le conseil tient séance.',
      fin: 'Le journal de bord se referme sur la dernière page.',
    },

    morts: {
      loups: 'Les mutins ont jeté {nom} à la mer.',
      poison: 'Le mauvais remède a envoyé {nom} par le fond.',
      vote: 'Le conseil a fait marcher {nom} sur la planche.',
      chasseur: 'Le boulet du Canonnier a emporté {nom}.',
      chagrin: 'Le chagrin a suivi {nom} par-dessus bord.',
      // R101 : l’absence a trop duré. Le narrateur ne juge pas, il constate
      // — la carte se retourne, ou non, selon la table.
      abandon: '{nom} a quitté le bord sans un mot.',
    },
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Personne n’a été jeté à la mer cette nuit. Les vigies tiennent bon.',
    grace:
      'Le conseil allait faire marcher {nom} sur la planche — mais c’est l’Idiot de l’équipage. La grâce est accordée, et le droit de vote perdu.',
    vote: {
      condamne: 'Les voix sont comptées : la planche attend {nom}.',
      personne: 'Les voix sont comptées : la planche reste vide.',
    },
    capitaine: {
      elu: '{nom} prend la barre : sa voix portera double.',
      successeur: 'La barre de {ancien} passe à {nom} : la voix double passe avec.',
    },
    tir: {
      atteint: 'Le Canonnier lâche son dernier boulet : il emporte {cible}.',
      enLair: 'Le Canonnier a tiré à blanc.',
    },
    // Aucun participe ne s’accorde avec {nom} : le complément suit le verbe.
    rancune: 'Le conseil a livré son propre Ancien, {nom} : l’équipage perd ses moyens.',
    // La bouteille est lue au conseil, jamais la main qui l’a lancée (R93) :
    // la composition publique dit déjà qui peut glisser un mot à la mer.
    corbeau: 'La bouteille a porté le nom de {nom} : au conseil, deux voix sont déjà comptées.',
    // Le chien grogne à l’aube (R108) : il dit les mutins chez les voisins
    // vivants, jamais leur nom ni leur nombre. Le silence dit autant.
    ours: {
      grogne: 'Le chien de {nom} a grogné à l’aube : les mutins s’assoient à ses côtés.',
      silence: 'Le chien de {nom} s’est tu à l’aube : pas de mutin à ses côtés.',
    },
    bouc: 'Les voix se partagent, le conseil ne tranche pas : c’est {nom}, le Nouveau, qui marche sur la planche pour tous.',
    votants: {
      designes: 'Dernier mot du Nouveau : demain, seuls voteront {noms}.',
      personne: 'Le Nouveau s’est tu : demain, tout l’équipage votera.',
    },
    fin: {
      village: 'L’équipage tient bon : la cale ne gronde plus.',
      loups: 'La mutinerie a pris le navire : plus une voix sur le pont.',
      amoureux: 'Les tourtereaux restent seuls sur le pont : le navire est à eux.',
      loupBlanc: 'Le Flibustier se tient seul à la barre : il a jeté à la mer jusqu’à ses propres complices.',
      personne: 'Il ne reste personne pour tenir la barre.',
    },
  },

  /* --- Les prompts : ils ne promettent que ce que le moteur permet --- */
  prompts: {
    // La carte est une mécanique, la phrase vaut pour tout univers.
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un passe par-dessus bord, l’autre le suit.',
    proteger: {
      base: 'Choisissez qui dormira à l’abri de votre calfattage cette nuit.',
      interdit:
        '{ancien} dormait à l’abri de votre calfattage hier : pas deux nuits de suite — choisissez une autre couchette.',
    },
    sonder: 'Sondez un vivant, jamais vous : ce qu’il cache sous sa serpillière s’inscrit dans votre carnet.',
    devorer: 'La mutinerie a ses ordres. Désignez qui sera jeté à la mer — ou laissez l’équipage dormir.',
    sorciere: {
      victime:
        'Les mutins ont désigné leur victime : {victime}. Repêchez-la avec votre bon remède, ou laissez-la sombrer — et votre mauvais remède peut frapper un autre vivant.',
      sansVictime:
        'Personne n’a été jeté à la mer cette nuit. Votre mauvais remède peut encore frapper — ou vous ne faites rien.',
      // La Guérisseuse vouvoyée au féminin applique la règle d’accord : c’est
      // « la Guérisseuse » que le prompt regarde, pas la personne qui la joue.
      soiMemeInterdit:
        'C’est vous que les mutins ont jetée à la mer. La table interdit le remède qui repêche sur soi : l’autre, lui, reste.',
    },
    tirer: 'Votre dernier boulet : visez un vivant — ou tirez à blanc.',
    successeur: 'Dernier ordre : désignez qui prendra la barre.',
    voter: {
      // L’élection autorise le vote pour soi (R56) ; le vote du jour
      // l’interdit (R60), et lui seul « peut changer tant que la phase court ».
      election: 'Élisez votre capitaine — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui marchera sur la planche — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // La Bouteille à la mer peut se désigner elle-même (R93) : « vous compris ».
    marquer:
      'Désignez un vivant, vous compris : au conseil, deux voix pèseront d’office contre ce vivant — ou ne lancez pas votre bouteille. Le mot sera lu, jamais la main.',
    // La Fouine peut se compter dans son trio (D29), et s’abstenir (R107).
    flairer:
      'Désignez un vivant, vous compris : vous flairerez son trio — lui et ses deux voisins vivants. Un mutin s’y trouve, votre nez répond, et votre flair demeure ; un trio sain vous le retire à vie. Ou ne flairez personne.',
    trahir: 'La mutinerie dort. Jetez l’un des leurs à la mer — ou épargnez-la cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont au conseil.',
    // Le talon n’appartient qu’au Forban (R110) : l’obligation ne vaut que
    // quand les deux cartes sont des Mutins.
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez le Forban, sans aucun pouvoir. Celle que vous laissez coule à pic.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux Mutins : il faut en prendre une. Celle que vous laissez coule à pic.',
    },
    seRanger: 'La première nuit, rangez-vous pour toujours : au bord, sans pouvoir — ou dans la cale, avec la mutinerie.',
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il est jeté à la mer, vous rejoindrez la cale.',
  },

  canaux: {
    village: 'Le pont',
    loups: 'La cale',
    amoureux: 'Les tourtereaux',
    // Le murmure des Deux Sœurs et des Trois Frères — un canal par fratrie,
    // ouvert tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    // Les noyés bavardent dans la chaloupe : l’au-delà du bord.
    morts: 'La chaloupe',
  },

  /* --- Les suggestions, par position : la référence, la mutinerie, l’outillé --- */
  suggestions: [
    { nom: 'La traversée tranquille', note: 'L’équilibre du jeu, calculé pour cette table.' },
    { nom: 'Un mutin de plus', note: 'Un Mutin de plus : la traversée ne finira pas à bon port.' },
    { nom: 'L’équipage outillé', note: 'Tous les rôles possibles à cette table : le bord a des mains, et le conseil un charpentier.' },
  ],

  /* --- La nuit racontée : le log récité, secrets compris (R88) --- */
  recit: {
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'Le Barbier a marié {nom} et {ancien} d’un même destin.',
      protection: 'Le Charpentier a calfaté la couchette de {nom}.',
      voyance: 'La Vigie a sondé {nom} : {role}.',
      loups: {
        cible: 'Les mutins ont jeté {nom} à la mer.',
        personne: 'Les mutins n’ont jeté personne à la mer.',
      },
      sauvetage: 'Le bon remède a repêché {nom}.',
      poison: 'Le mauvais remède a envoyé {nom} par le fond.',
      grace: 'Le vote a épargné {nom} : l’Idiot de l’équipage ne vote plus jamais.',
      capitaine: '{nom} a reçu la barre.',
      tir: {
        cible: 'Le dernier boulet du Canonnier a emporté {nom}.',
        personne: 'Le Canonnier a tiré à blanc.',
      },
      vote: {
        condamne: 'Le conseil a fait marcher {nom} sur la planche.',
        personne: 'Le conseil n’a fait marcher personne sur la planche.',
      },
      resistance: 'Les mutins ont foncé sur {nom} : l’Ancien a tenu bon.',
      rancune: 'En livrant {nom}, son Ancien, le conseil a perdu ses moyens.',
      corbeau: 'La Bouteille à la mer a désigné {nom}.',
      // Le log ne dit que le centre du trio (R107) : les voisins se lisent
      // sur le pont, la conclusion suffit au récit.
      renard: {
        loups: 'La Fouine a flairé le trio autour de {nom} : les mutins y étaient.',
        sain: 'La Fouine a flairé le trio autour de {nom} : un trio sain, et son flair s’en est allé.',
      },
      ours: {
        grogne: 'À l’aube, le chien de {nom} a grogné : les mutins sont à ses côtés.',
        silence: 'À l’aube, le chien de {nom} s’est tu : pas de mutin à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, le Nouveau.',
      votants: {
        designes: 'Le Nouveau a désigné les votants du lendemain : {noms}.',
        personne: 'Le Nouveau n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Flibustier a jeté {nom} à la mer — un mutin de sa propre bande.',
        personne: 'Le Flibustier a épargné la mutinerie.',
      },
      // Le chapardage ne se raconte qu’ici : la carte prise, ou la sienne
      // gardée — le log ne dit ni le talon ni la main (R110).
      voleur: {
        prise: 'Le Forban a pris la carte {role}.',
        garde: 'Le Forban a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'Le Renégat {nom} s’est rangé au bord.',
        loups: 'Le Renégat {nom} s’est rangé dans la cale.',
      },
      modele: 'Le Moussaillon {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      // Le passage dans la cale ne se crie pas (D33) : le récit seul le
      // relit, et le camp d’origine s’y devine.
      transformation: 'Le modèle de {nom} a été jeté à la mer : le Moussaillon a rejoint la cale.',
    },
  },

  /*
    --- Les légendes du graveur (SPEC § 6) : sèches, sans héroïsme, des corps ---
    Le registre du bord : des cordages, pas des exploits. Les phrases ne
    commentent pas ; elles regardent l’horizon. Esquisse, à relire avec un
    habitué du gaillard.
  */
  legendes: {
    roles: {
      villageois: 'Deux mains calleuses, aucun ordre à donner.',
      loup: 'Le couteau dort sous la couchette.',
      voyante: 'Elle voit tout, du haut du grand mât.',
      sorciere: 'Deux remèdes, et le mauvais.',
      chasseur: 'Il vise mieux couché que debout.',
      cupidon: 'Un rasoir, et deux anneaux.',
      salvateur: 'Il calfate la brèche, pas la tempête.',
      idiot: 'Gracié, et toujours pas écouté.',
      ancien: 'Trois naufrages à son tableau de service.',
      corbeau: 'Le parchemin n’était pas signé.',
      bouc: 'Embarqué la veille, sacrifié le lendemain.',
      petiteFille: 'Depuis le grand mât, elle compte les couteaux.',
      loupBlanc: 'La cale ne contrôle pas la cale, dit-on.',
      villageois2: 'Lettres de marque des deux côtés.',
      renard: 'Elle connaît le navire par l’odeur.',
      ours: 'Le chien le sait avant la vigie.',
      voleur: 'Il ne vole pas : il repêche.',
      chienLoup: 'Deux pavillons, une seule part.',
      enfantSauvage: 'Il regarde faire, puis fait pareil.',
      soeurs: 'Elles se sont reconnues à voix basse.',
      freres: 'Trois fois la même houle, trois fois la même parole.',
    },
    ecrans: {
      accueil: 'La liberté tient sur un pont.',
      salon: 'Assis en rond autour du grand mât.',
      revelation: 'Nul n’est inscrit sur le rôle d’équipage.',
      nuitDormeur: 'Dormez : la mer, elle, ne dort jamais.',
      mort: 'Tout voir, enfin, depuis la chaloupe.',
      aubeMorts: 'Les vigies n’ont rien vu.',
      aubePaisible: 'La mer est plate, pas les nerfs.',
      election: 'Qui tient la barre donne les ordres.',
      vote: 'Tous d’accord, donc tous innocents.',
      depouillement: 'Les voix sont comptées ; le butin, jamais.',
      chasseurAttente: 'Il vise mieux couché que debout.',
      succession: 'La barre change de main, pas de cap.',
      boucDernierMot: 'Il fallait bien quelqu’un.',
      fin: 'Le navire attendra un autre équipage.',
      tableDisparue: 'Le pont s’est vidé sans vous.',
    },
    recit: {
      loupBlanc: 'La cale ne contrôle pas la cale, dit-on.',
      rancune: 'L’équipage a scié son propre mât.',
      poison: 'Deux remèdes, et le mauvais.',
      tir: 'Il vise mieux couché que debout.',
      chagrin: 'Liés par un Barbier, séparés par rien.',
      grace: 'Gracié, et toujours pas écouté.',
      bouc: 'Il fallait bien quelqu’un.',
      voteMeute: 'Un vote, une consigne, pas de débat.',
      voteVillage: 'Tous d’accord, donc tous innocents.',
      sauvetage: 'Le remède a servi ; nul ne l’a su.',
      loups: 'La mer ne rend pas ce qu’elle prend.',
      resistance: 'Trois naufrages à son tableau de service.',
      protection: 'Pour une fois, le calfattage a tenu.',
      corbeau: 'Le parchemin n’était pas signé.',
      voyance: 'Elle voit tout, du haut du grand mât.',
      amoureux: 'Un rasoir, et deux anneaux.',
      nuitDefaut: 'La planche ne grince que la nuit.',
      jourDefaut: 'Ils ont discuté le moindre cap.',
      derniere: 'Le navire attendra un autre équipage.',
    },
  },

  // Les dix-huit couvre-chefs du bord, un par siège (SPEC § 5.1.2) : tout ce
  // qui se pose sur une tête quand le conseil siège sur le pont.
  couvreChefs: [
    'tricorne de capitaine',
    'bicorne d’officier',
    'bandana rouge',
    'calotte de gabier',
    'bonnet de laine',
    'chapeau de paille de pêcheur',
    'chapeau à plume',
    'capuche de ciré',
    'suroit de quart',
    'foulard de maître d’équipage',
    'turban de cuisinier',
    'casquette de calfat',
    'bonnet à pompon',
    'capeline de pillard',
    'chapeau de tambour de marine',
    'bombe d’artilleur',
    'cagoule d’abordage',
    'perruque poudrée de comptoir',
  ],
};
