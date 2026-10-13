/**
 * Thiercelieux — le skin de référence, écrit en entier.
 *
 * La voix est celle de `docs/refs/design.md` : la place du village, entre
 * chien et loup. Le narrateur parle comme on raconte une histoire le soir —
 * des phrases courtes, un vocabulaire de village (la place, la meute, la
 * potence, le brassard, le bouclier), jamais un jeu de mots qui grince, jamais
 * de familiarité. Il annonce, il ne commente pas : quand tout le monde est
 * mort, il ne s’apitoie pas, il pose la carte.
 *
 * Les trois règles de plume de `docs/SKINS.md` valent pour chaque phrase
 * ci-dessous : aucun mot ne s’accorde avec un pseudo ; dans un prompt,
 * l’accord suit le rôle, jamais la personne ; les compteurs restent à
 * l’écran. Chaque texte est calé sur ce que le moteur permet, au mot près —
 * une divergence entre une phrase et une règle serait un bug de la phrase.
 * Les variables entre accolades — `{nom}`, `{role}`, `{ancien}`… — sont
 * résolues par le client, jamais affichées telles quelles.
 */

import type { Skin } from './registre.js';

export const thiercelieux: Skin = {
  id: 'thiercelieux',
  univers: 'Les Loups-Garous de Thiercelieux',
  charge: 'le capitaine',
  plurielLoups: { un: 'loup', plusieurs: 'loups' },
  // D17 : la place est gardée, son joueur est loin — un lieu, pas un
  // adjectif : rien ne s’accorde avec le pseudo.
  absent: 'loin de la place',

  /* --- Les rôles : le nom affiché et le texte de la carte --- */
  roles: {
    villageois: {
      nom: 'Villageois·e',
      description: 'Pas de pouvoir. Votre arme, c’est votre voix au vote du jour — et votre flair.',
    },
    loup: {
      nom: 'Loup-garou',
      description:
        'Chaque nuit, la meute dévore un habitant. Le jour, vous vous tenez sur la place comme les autres.',
    },
    voyante: {
      nom: 'la Voyante',
      description:
        'Chaque nuit, sondez un vivant : son rôle s’inscrit dans votre carnet, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Sorcière',
      description:
        'Deux potions, une seule fois chacune : la vie pour la victime des loups, la mort pour qui vous voulez.',
    },
    chasseur: {
      nom: 'le Chasseur',
      // La carte ne dit pas quand la balle est possible : selon la mort, la
      // table en décide (D1). La phrase annonce le pouvoir ; la table connaît
      // ses limites — promettre un tir « à votre mort » mentirait quand le
      // poison étouffe.
      description:
        'En tombant, vous pouvez abattre le joueur de votre choix — votre dernière balle.',
    },
    cupidon: {
      nom: 'Cupidon',
      description:
        'La première nuit seulement, liez deux vivants d’un même destin : si l’un meurt, l’autre le suit.',
    },
    salvateur: {
      nom: 'le Salvateur',
      description:
        'Chaque nuit, votre bouclier protège un habitant des loups — jamais le même deux nuits de suite, et le poison passe toujours.',
    },
    idiot: {
      nom: 'l’Idiot du village',
      description:
        'Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 (R90) --- */
    ancien: {
      nom: 'l’Ancien',
      // « peut perdre » : la rancune est une option de table (R92, D13), la
      // carte ne promet que ce que la table permet.
      description:
        'Vous avez la peau dure : la première attaque de la meute ne vous tue pas, la seconde si. Et si le village vous tue de sa main, il peut perdre ses pouvoirs avec vous.',
    },
    corbeau: {
      nom: 'le Corbeau',
      description:
        'Chaque nuit, désignez un vivant : au vote du jour, deux voix pèseront d’office contre ce vivant. La marque est annoncée, jamais sa main.',
    },
    bouc: {
      nom: 'le Bouc émissaire',
      description:
        'Si le vote du village finit à égalité, c’est vous qui payez pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      nom: 'la Petite Fille',
      description:
        'Pendant que la meute choisit sa proie, vous entrouvrez les yeux : vous voyez combien de loups visent chaque habitant — jamais lesquels.',
    },
    loupBlanc: {
      nom: 'le Loup Blanc',
      // La meute le prend pour l’un des siens : seule sa propre carte le
      // nomme ainsi (R96).
      description:
        'Vous chassez avec la meute, qui vous prend pour l’un des siens. Une nuit sur deux, vous pouvez dévorer un loup. Vous ne gagnez que seul.',
    },
    /* --- Les optionnels de la v3 (R105 à R108, D26) --- */
    villageois2: {
      // La carte est recto-verso (R106, D31) : la description dit la carte,
      // pas une promesse au porteur — même le porteur croit lire un
      // villageois, et seul le récit de fin le détrompe.
      nom: 'Villageois-Villageois',
      description:
        'Aucun pouvoir, aucune vie bonus : la carte est recto-verso, et les deux faces disent la même chose — Simple Villageois. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      nom: 'le Renard',
      description:
        'Chaque nuit, flairez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. La meute dans le trio : votre nez répond, et votre flair demeure. Un trio sain : votre flair s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      nom: 'le Montreur d’Ours',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce des morts, votre ourson grogne si la meute s’assied à vos côtés — et son silence, lui aussi, est une information.',
    },
    /* --- La Vague 2 de la v3 (R109 à R114, D27, D28) --- */
    voleur: {
      nom: 'le Voleur',
      description:
        'Avant même la révélation, deux cartes restées sur la table sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez le Voleur, sans aucun pouvoir. Deux loups dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      nom: 'le Chien-Loup',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé au village, vous n’avez aucun pouvoir ; rangé dans la meute, vous dévorez avec elle — et elle vous reconnaît pour un loup.',
    },
    enfantSauvage: {
      nom: 'l’Enfant Sauvage',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il meurt, quoi qu’il arrive, vous devenez un loup-garou.',
    },
    soeurs: {
      nom: 'les Deux Sœurs',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mort seule le referme.',
    },
    freres: {
      nom: 'les Trois Frères',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mort seule le referme.',
    },
  },

  camps: { village: 'le village', loups: 'la meute' },
  vainqueurs: {
    village: 'le village',
    loups: 'la meute',
    amoureux: 'les amoureux',
    loupBlanc: 'le Loup Blanc',
    personne: 'personne',
  },

  /* --- Le narrateur : il ne dit que ce que l’évènement dit (R87) --- */
  narrateur: {
    debut: 'La table est dressée à Thiercelieux. Que la partie commence.',

    phases: {
      // Le talon du Voleur ne se montre qu’à lui : la phrase dit la scène,
      // jamais la main qui va choisir (R110, R87).
      voleur: 'Deux cartes restent sur la table. Quelqu’un doit choisir.',
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      // L’étape `sorciere` est un fait d’architecture, pas un fait de récit :
      // le village qui dort n’a pas à savoir où en est la nuit. Phrase plate,
      // par choix (SKINS.md).
      nuit: {
        principale: 'La nuit tombe sur Thiercelieux. Le village s’endort.',
        // Même phrase plate que la Sorcière : l’étape du Loup Blanc se tient
        // mort compris (R97), le récit n’a pas à la souligner.
        loupBlanc: 'La nuit se poursuit.',
        sorciere: 'La nuit se poursuit.',
      },
      chasseur: 'Le Chasseur rend l’âme, la main sur la gâchette. La partie attend son dernier geste.',
      succession: 'Le capitaine est tombé : le brassard attend une main.',
      // « peut » : au temps écoulé, il s’est tu, et tout le monde vote (R94).
      bouc: 'Le Bouc émissaire rend l’âme. Son dernier mot peut désigner qui votera demain.',
      election: 'Le village se choisit un capitaine.',
      jour: 'Le jour se lève sur Thiercelieux. Le village délibère.',
      fin: 'La dernière carte est posée sur la place.',
    },

    morts: {
      loups: 'La meute a dévoré {nom}.',
      poison: 'Le poison a emporté {nom}.',
      vote: 'Le village a exécuté {nom}.',
      chasseur: 'La balle du Chasseur a atteint {nom}.',
      chagrin: 'Le chagrin a eu raison de {nom}.',
      // R101 : l’absence a trop duré. Le narrateur ne juge pas, il constate
      // — la carte se retourne, ou non, selon la table.
      abandon: '{nom} a quitté le village sans un mot.',
    },
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Personne n’est mort cette nuit. Le village se réveille entier.',
    grace:
      'La corde s’est détendue à temps : {nom} est l’Idiot du village. La grâce est accordée — et le droit de vote perdu.',
    vote: {
      condamne: 'Les voix sont comptées : la potence est pour {nom}.',
      personne: 'Les voix sont comptées : personne ne montera à la potence.',
    },
    capitaine: {
      elu: '{nom} prend le brassard : sa voix comptera double.',
      successeur: 'Le brassard de {ancien} passe à {nom} : la voix double passe avec.',
    },
    tir: {
      atteint: 'Le Chasseur lâche sa dernière balle : elle emporte {cible}.',
      // La formule du moteur, reprise telle quelle — « il emporte sa balle »
      // était déjà la bonne.
      enLair: 'Le Chasseur a emporté sa balle.',
    },
    // Aucun participe ne s’accorde avec {nom} : le complément suit le verbe.
    rancune: 'Le village a tué son propre Ancien, {nom} : tous les pouvoirs du village s’éteignent.',
    // La marque, jamais la main : le Corbeau n’est pas nommé autrement que
    // par son rôle, que la composition publique dit déjà.
    corbeau: 'Le Corbeau a désigné {nom} : au vote du jour, deux voix sont déjà comptées.',
    // La grogne de l’ourson, à l’aube (R108) : elle dit la meute chez les
    // voisins vivants, jamais leur nom ni leur nombre. Le silence dit
    // autant — chaque matin vécu, l’un ou l’autre.
    ours: {
      grogne: 'L’ourson de {nom} a grogné à l’aube : la meute s’assied à ses côtés.',
      silence: 'L’ourson de {nom} s’est tu à l’aube : pas de meute à ses côtés.',
    },
    bouc: 'Les voix se partagent, la place ne tranche pas : c’est {nom}, le Bouc émissaire, qui paie pour tous.',
    votants: {
      designes: 'Dernier mot du Bouc émissaire : demain, seuls voteront {noms}.',
      personne: 'Le Bouc émissaire s’est tu : demain, tout le village votera.',
    },
    fin: {
      village: 'Le village a triomphé : plus un loup ne rôde autour de Thiercelieux.',
      loups: 'La meute a pris Thiercelieux. Le village ne répond plus.',
      amoureux: 'Les deux amoureux restent seuls au monde : la partie est à eux.',
      loupBlanc: 'Le Loup Blanc se tient seul sur la place déserte : il a dévoré jusqu’à sa propre meute.',
      personne: 'Il ne reste personne pour raconter cette histoire.',
    },
  },

  /* --- Les prompts : ils ne promettent que ce que le moteur permet --- */
  prompts: {
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un meurt, l’autre le suit.',
    proteger: {
      base: 'Choisissez qui dormira sous votre bouclier cette nuit.',
      interdit:
        '{ancien} dormait sous votre bouclier hier : pas deux nuits de suite — choisissez une autre maison.',
    },
    sonder: 'Sondez un vivant, jamais vous : son rôle s’inscrit dans votre carnet.',
    devorer: 'La meute a faim. Désignez un habitant à dévorer — ou laissez le village dormir.',
    sorciere: {
      victime:
        'La meute a désigné sa victime : {victime}. Sauvez-la avec votre potion de vie, ou laissez-la partir — et votre potion de mort peut frapper un autre vivant.',
      sansVictime:
        'La meute n’a dévoré personne cette nuit. Votre potion de mort peut encore frapper — ou vous ne faites rien.',
      // La Sorcière vouvoyée au féminin applique la règle d’accord : c’est
      // « la Sorcière » que le prompt regarde, pas la personne qui la joue.
      soiMemeInterdit:
        'C’est vous que la meute a désignée. La table interdit la potion de vie sur soi : le poison, lui, reste.',
    },
    tirer: 'Votre dernière balle : abattez un vivant — ou tirez en l’air.',
    successeur: 'Dernier ordre : désignez qui portera le brassard.',
    voter: {
      // L’élection autorise le vote pour soi (R56) ; le vote du jour
      // l’interdit (R60), et lui seul « peut changer tant que la phase
      // court » — le prompt de la Voyante ne le promet pas.
      election: 'Élisez votre capitaine — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui montera à la potence — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // Le Corbeau peut se marquer lui-même (R93) : « vous compris ».
    marquer:
      'Désignez un vivant, vous compris : au vote du jour, deux voix pèseront d’office contre ce vivant — ou ne marquez personne. La marque sera annoncée, jamais votre main.',
    // Le Renard peut se compter dans son trio (D29), et s’abstenir (R107) :
    // le prompt ne promet que ce que le moteur permet.
    flairer:
      'Désignez un vivant, vous compris : vous flairerez son trio — lui et ses deux voisins vivants. La meute s’y trouve, votre flair demeure ; un trio sain vous le retire à vie. Ou ne sondez personne.',
    trahir: 'La meute dort. Dévorez l’un de ses loups — ou épargnez-la cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont au vote.',
    // Le talon n’appartient qu’au Voleur (R110) : l’obligation ne vaut que
    // quand les deux cartes sont de la meute — Loup Blanc compris.
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez le Voleur, sans aucun pouvoir. Celle que vous laissez sort du jeu.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux loups : il faut en prendre une. Celle que vous laissez sort du jeu.',
    },
    seRanger: 'La première nuit, rangez-vous pour toujours : au village, sans rien — ou dans la meute, avec ses dents.',
    // « loup-garou » minuscule toucherait l’identifiant du moteur : la meute
    // le dit tout aussi bien, comme le récapitulatif de l’écran (R112).
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. À sa mort, vous rejoindrez la meute.',
  },

  canaux: {
    village: 'Le village',
    loups: 'La meute',
    amoureux: 'Le serment',
    // Le murmure des Deux Sœurs et des Trois Frères : un canal par fratrie,
    // ouvert jour et nuit tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    morts: 'L’au-delà',
  },

  /* --- Les suggestions, par position : la référence, la chasse, l’outillé --- */
  suggestions: [
    { nom: 'La référence', note: 'L’équilibre du jeu, calculé pour cette table.' },
    { nom: 'La chasse', note: 'Un loup de plus : la meute a les dents longues.' },
    { nom: 'Le village outillé', note: 'Tous les rôles possibles à cette table : le village a des cartes en main.' },
  ],

  /* --- La nuit racontée : le log récité, secrets compris (R88) --- */
  recit: {
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'Cupidon a lié {nom} et {ancien} d’un même destin.',
      protection: 'Le Salvateur a veillé sur {nom}.',
      voyance: 'La Voyante a sondé {nom} : {role}.',
      loups: {
        cible: 'La meute a désigné {nom}.',
        personne: 'La meute n’a désigné personne.',
      },
      sauvetage: 'La potion de vie a sauvé {nom}.',
      poison: 'La potion de mort a emporté {nom}.',
      // La ligne `mort` du log reprend la phrase de la cause, avec le suffixe
      // de rôle si le rôle était révélé — rien à écrire ici.
      grace: 'Le vote a épargné {nom} : l’Idiot du village ne vote plus jamais.',
      capitaine: '{nom} a reçu le brassard.',
      tir: {
        cible: 'Le Chasseur a abattu {nom}.',
        personne: 'Le Chasseur a emporté sa balle.',
      },
      vote: {
        condamne: 'Le village a condamné {nom} à la potence.',
        personne: 'Le village n’a condamné personne.',
      },
      resistance: 'La meute a attaqué {nom} : l’Ancien a tenu bon.',
      rancune: 'En tuant {nom}, son Ancien, le village a perdu ses pouvoirs.',
      corbeau: 'Le Corbeau a marqué {nom}.',
      // Le log ne dit que le centre du trio (R107) : les voisins se lisent
      // sur la place, la conclusion suffit au récit.
      renard: {
        loups: 'Le Renard a flairé le trio autour de {nom} : la meute y était.',
        sain: 'Le Renard a flairé le trio autour de {nom} : un trio sain, et son flair s’en est allé.',
      },
      ours: {
        grogne: 'À l’aube, l’ourson de {nom} a grogné : la meute est à ses côtés.',
        silence: 'À l’aube, l’ourson de {nom} s’est tu : pas de meute à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, le Bouc émissaire.',
      votants: {
        designes: 'Le Bouc émissaire a désigné les votants du lendemain : {noms}.',
        personne: 'Le Bouc émissaire n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Loup Blanc a dévoré {nom}, un loup de sa propre meute.',
        personne: 'Le Loup Blanc a épargné la meute.',
      },
      // Le vol ne se raconte qu’ici : la carte prise, ou la sienne gardée —
      // le log ne dit ni le talon ni la main (R110).
      voleur: {
        prise: 'Le Voleur a pris la carte {role}.',
        garde: 'Le Voleur a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'Le Chien-Loup {nom} s’est rangé au village.',
        loups: 'Le Chien-Loup {nom} s’est rangé dans la meute.',
      },
      modele: 'L’Enfant Sauvage {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      // La transformation ne se crie pas (D33) : le récit seul la relit, et
      // le rôle d’origine s’y devine.
      transformation: 'Le modèle de {nom} est mort : l’Enfant Sauvage est devenu un loup-garou.',
    },
  },

  /* --- Les légendes du graveur (SPEC § 6.1 et § 6.4) : des planches, pas des commandes --- */
  legendes: {
    roles: {
      villageois: 'Rien vu, rien entendu, tout compris.',
      loup: 'Personne n’a voté plus fort que lui.',
      voyante: 'Ce qu’elle voit, nul ne le croit.',
      sorciere: 'Elle a sauvé tout le monde, sauf qui il fallait.',
      chasseur: 'Il tire mieux mort que vivant.',
      cupidon: 'Ils disent oui au premier venu.',
      salvateur: 'Il garde la porte ; on entre par la fenêtre.',
      idiot: 'Gracié, et toujours pas écouté.',
      ancien: 'Jusqu’à la mort, et une fois de plus.',
      corbeau: 'La lettre n’était pas signée.',
      bouc: 'Il fallait bien quelqu’un.',
      // Validée par le propriétaire (la variante douce est écartée).
      petiteFille: 'Ne crie pas, petite sotte.',
      loupBlanc: 'Les loups ne se mangent pas entre eux, dit-on.',
      // Planches 14 à 16 du graveur, gravées pour la v3.
      villageois2: 'On le retourne, c’est toujours lui.',
      renard: 'Son nez répond, sa gueule se tait.',
      ours: 'À l’aube il grogne : aux voisins de deviner.',
      // Planches 17 à 21 du graveur, gravées pour la Vague 2.
      voleur: 'Il ne dérobe pas : il choisit.',
      chienLoup: 'La bête choisit son maître.',
      enfantSauvage: 'Il montre du doigt ; l’ombre regarde.',
      soeurs: 'Elles se sont reconnues à voix basse.',
      freres: 'Trois fois le même menton, trois fois la même parole.',
    },
    ecrans: {
      accueil: 'Le sommeil de la raison engendre des loups.',
      salon: 'Assis en rond, comme d’honnêtes gens.',
      revelation: 'Nul ne se connaît.',
      nuitDormeur: 'Dormez : d’autres veillent pour vous.',
      mort: 'Tout voir, enfin, et trop tard.',
      aubeMorts: 'Personne ne nous a vus.',
      aubePaisible: 'Tous sont là. Personne n’est rassuré.',
      election: 'Qui parle le plus fort porte le brassard.',
      vote: 'Tous d’accord, donc tous innocents.',
      depouillement: 'Les voix sont comptées ; les raisons, jamais.',
      chasseurAttente: 'Il tire mieux mort que vivant.',
      succession: 'Le brassard change de bras, pas d’idée.',
      boucDernierMot: 'Il fallait bien quelqu’un.',
      fin: 'Il est l’heure.',
      tableDisparue: 'La table s’est levée sans vous.',
    },
    recit: {
      loupBlanc: 'Les loups ne se mangent pas entre eux, dit-on.',
      rancune: 'Le village a scié sa propre branche.',
      poison: 'Deux fioles, et la mauvaise.',
      tir: 'Il tire mieux mort que vivant.',
      chagrin: 'Jusqu’à la mort, et pas un jour de plus.',
      grace: 'Gracié, et toujours pas écouté.',
      bouc: 'Il fallait bien quelqu’un.',
      voteMeute: 'Pour une fois.',
      voteVillage: 'Tous d’accord, donc tous innocents.',
      sauvetage: 'La fiole a servi ; nul ne l’a su.',
      loups: 'Personne ne nous a vus.',
      resistance: 'Jusqu’à la mort, et une fois de plus.',
      protection: 'Pour une fois, la bonne porte.',
      corbeau: 'La lettre n’était pas signée.',
      voyance: 'Ce qu’elle voit, nul ne le croit.',
      amoureux: 'Ils disent oui au premier venu.',
      nuitDefaut: 'Le sommeil de la raison engendre des loups.',
      jourDefaut: 'Ils ont parlé longtemps.',
      derniere: 'Il est l’heure.',
    },
  },

  /* --- Les dix-huit couvre-chefs, un par siège (SPEC § 5.1.2) --- */
  couvreChefs: [
    'tricorne',
    'mantille à peigne',
    'bonnet de nuit',
    'coroza',
    'chambergo',
    'montera',
    'capuche de moine',
    'cofia',
    'bicorne',
    'turban',
    'boina',
    'perruque à catogan',
    'haut-de-forme évasé',
    'fichu noué',
    'calotte',
    'cornette',
    'chapeau de paille',
    'chapeau à plumet',
  ],
};
