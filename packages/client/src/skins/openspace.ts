/**
 * Open Space — le quatrième habit.
 *
 * Un plateau de bureaux en hypercroissance : la machine à café, le marqueur,
 * le badge autour du cou — et la nuit, les portes RH. La mort n’y est jamais
 * une violence : elle est un licenciement, la boîte en carton sous le bras, et
 * les partis bavardent ensemble à la machine à café. La satire ne prend pas
 * parti : la cafétéria qui délibère à côté de ses post-it et la direction qui
 * réorganise dans le vide se valent à l’écran. Le narrateur constate, il ne
 * milite pas ; aucun nom propre réel ne passe jamais (règle de plume n° 1).
 *
 * Comme ses aînés, la peau est marquée « Esquisse » là où la plume n’a pas été
 * relue par un habitant du plateau : chaque complément tient la place, il ne
 * prétend pas à la phrase définitive. Elle n’en est pas moins complète au sens
 * du registre — chaque rôle traduit, chaque cause de mort racontée — sinon le
 * registre la refuserait.
 */

import type { Skin } from './registre.js';

export const openspace: Skin = {
  id: 'openspace',
  univers: 'Open Space',
  charge: 'le chef de projet',
  plurielLoups: { un: 'Manager', plusieurs: 'Managers' },
  // Un lieu, jamais un mot accordé au pseudo (règle de plume n° 1).
  absent: 'parti en réunion',

  /* --- Les rôles : la transposition du plateau --- */
  roles: {
    villageois: {
      nom: 'Salarié',
      // Esquisse : la carte du Villageois, transposée — la voix, et le badge.
      description:
        'Pas de pouvoir. Votre arme, c’est votre voix en cafétéria — et le badge autour du cou.',
    },
    loup: {
      nom: 'Manager',
      // Esquisse : la direction, la nuit venue — et le tour des plateaux, le jour.
      description:
        'Chaque nuit, la direction licencie quelqu’un du plateau. Le jour, vous faites le tour des équipes, sourire aux lèvres.',
    },
    voyante: {
      nom: 'la Contrôleuse de gestion',
      // Esquisse : elle inspecte la ligne de tout le monde, sans exception.
      description:
        'Chaque nuit, inspectez un vivant : ce qu’il cache sous son statut s’inscrit dans votre tableur, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Pharmacienne',
      // Esquisse : deux remèdes dans la trousse, pas deux potions.
      description:
        'Deux remèdes, une seule fois chacun : celui qui réveille la victime des managers, et celui qui endort pour de bon qui vous voulez.',
    },
    chasseur: {
      nom: 'le Directeur des ventes',
      // Esquisse : même prudence que la carte du Chasseur — la phrase annonce
      // le pouvoir, la table connaît ses limites (D1).
      description: 'En tombant, vous pouvez lâcher votre dernière relance sur le joueur de votre choix.',
    },
    cupidon: {
      nom: 'l’Animateur du séminaire',
      // Esquisse : il lie tout le monde, sans demander l’avis des intéressés.
      description:
        'La première nuit seulement, liez deux vivants d’un même destin : si l’un est licencié, l’autre le suit.',
    },
    salvateur: {
      nom: 'le Syndicaliste',
      // Esquisse : le rempart du soir, saisi avant la nuit.
      description:
        'Chaque nuit, votre rempart protège un salarié des managers — jamais le même deux nuits de suite, et le plan social passe toujours.',
    },
    idiot: {
      nom: 'l’Idiot de l’open space',
      // Esquisse : gracié, affiché, muet au vote — l’accord suit le rôle,
      // jamais la personne derrière l’écran.
      description:
        'Condamné par le vote, vous êtes gracié au dernier moment : votre rôle est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 : transposés sur le même plateau --- */
    ancien: {
      // Esquisse : il a survécu à deux réorganisations, et il compte bien faire mieux.
      nom: 'l’Ancien',
      description:
        'Vous avez déjà vu deux plans sociaux avant celui-ci : le premier licenciement ne vous emporte pas, le second si. Et si le plateau vous livre de sa main, il peut perdre ses moyens avec vous.',
    },
    corbeau: {
      // Esquisse : le mot glissé dans la boîte à idées, jamais signé.
      nom: 'l’Enquête annuelle',
      description:
        'Chaque nuit, désignez un vivant : à la cafétéria, deux voix pèseront d’office contre ce vivant. L’enquête est annoncée, jamais sa main.',
    },
    bouc: {
      // Esquisse : littéral — la chaise la plus proche de la porte RH.
      nom: 'l’Alternant',
      description:
        'Si le vote de la cafétéria finit à égalité, c’est vous qui sortez par la porte RH pour tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      // Esquisse : depuis la salle de pause, elle cadre mieux qu’elle ne vote.
      nom: 'la Stagiaire',
      description:
        'Pendant que les managers choisissent leur cible, vous photographiez depuis la salle de pause : vous voyez combien de costumes visent chaque vivant — jamais lesquels.',
    },
    loupBlanc: {
      // Esquisse : les affaires internes, celles que la direction n’aime pas voir remonter.
      nom: 'le Consultant',
      description:
        'Vous licenciez avec la direction, qui vous prend pour l’un des siens. Une mission sur deux, vous pouvez licencier un Manager. Vous ne gagnez que seul.',
    },
    /* --- La v3 (R105 à R114) : même transposition, même talon --- */
    villageois2: {
      // Esquisse : le contrat recto-verso (R106, D31) — moteur des deux côtés.
      nom: 'le Salarié moteur',
      description:
        'Aucun pouvoir, aucune vie bonus : votre contrat est recto-verso, et les deux faces disent la même chose — salarié moteur. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      nom: 'l’Analyste de flux',
      description:
        'Chaque nuit, flairez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. Un costume dans le trio : votre nez répond, et votre flair demeure. Un trio sain : votre flair s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      // Esquisse : le chien du Gardien, qui n’aime personne.
      nom: 'le Gardien de nuit',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce des départs, votre chien aboie si un costume s’installe à vos côtés — et son silence, lui aussi, est une information.',
    },
    voleur: {
      // Esquisse : le tiroir de la photocopieuse, ouvert avant la révélation.
      nom: 'le Piqueur de stylos',
      description:
        'Avant même la révélation, deux cartes restées dans le tiroir de la photocopieuse sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez le Piqueur de stylos, sans aucun pouvoir. Deux Managers dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      // Esquisse : deux camps, une seule mission.
      nom: 'l’Intérimaire',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé au plateau, vous n’avez aucun pouvoir ; rangé chez les managers, vous licenciez avec eux — et la direction vous prend pour l’un des siens.',
    },
    enfantSauvage: {
      // Esquisse : il regarde faire, puis refait pareil.
      nom: 'le Cadet',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il part, quoi qu’il arrive, vous rejoignez les managers.',
    },
    soeurs: {
      nom: 'les Deux Sœurs',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la machine à café seule le referme.',
    },
    freres: {
      nom: 'les Trois Frères',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la machine à café seule le referme.',
    },
  },

  camps: { village: 'le plateau', loups: 'les managers' },
  vainqueurs: {
    village: 'le plateau',
    loups: 'les managers',
    amoureux: 'les tourtereaux',
    loupBlanc: 'le Consultant',
    personne: 'personne',
  },

  /* --- Le narrateur : il annonce, il ne commente pas (R87) --- */
  narrateur: {
    debut: 'Le plateau s’installe autour de la machine à café. Que le sprint commence.',

    phases: {
      // Le tiroir ne se montre qu’à son propriétaire : la phrase dit la
      // scène, jamais la main qui va choisir (R110, R87).
      voleur: 'Deux cartes restent dans le tiroir de la photocopieuse. Quelqu’un doit choisir.',
      // La carte est une mécanique, la phrase vaut pour tout univers —
      // reprise de Thiercelieux, transposée sans déguisement.
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      nuit: {
        principale: 'La nuit tombe sur le plateau. Les écrans passent en veille.',
        // Plate par choix, comme à Thiercelieux — l’étape est un fait
        // d’architecture, pas un fait de récit.
        sorciere: 'La nuit se poursuit.',
        // Plate aussi — l’étape du Consultant se tient mort compris (R97).
        loupBlanc: 'La nuit se poursuit.',
      },
      chasseur: 'Le Directeur des ventes rend l’âme, la main sur le téléphone. La partie attend sa dernière relance.',
      succession: 'Le chef de projet est tombé : le marqueur attend une main.',
      // « peut » : au temps écoulé, il s’est tu, et tout le monde vote (R94).
      bouc: 'L’Alternant sort par la porte RH. Son dernier mot peut désigner qui votera demain.',
      election: 'Le plateau se choisit un chef de projet.',
      jour: 'Le jour se lève sur le plateau. La cafétéria délibère.',
      fin: 'La dernière annonce est punaisée au milieu du plateau.',
    },

    morts: {
      loups: 'Les managers ont licencié {nom}.',
      poison: 'Le mauvais remède a emporté {nom}.',
      vote: 'La cafétéria a livré {nom} aux RH.',
      chasseur: 'La dernière relance a atteint {nom}.',
      chagrin: 'Le licenciement du binôme a eu raison de {nom}.',
      // R101 : l’absence a trop duré. Le narrateur ne juge pas, il constate
      // — la carte se retourne, ou non, selon la table.
      abandon: '{nom} a désactivé son badge sans un mot.',
    },
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Personne n’a été licencié cette nuit. Le café du matin est chaud.',
    grace:
      'La cafétéria allait livrer {nom} aux RH — mais c’est l’Idiot de l’open space. La grâce est accordée, et le droit de vote perdu.',
    vote: {
      condamne: 'Les voix sont comptées : les RH attendent {nom}.',
      personne: 'Les voix sont comptées : les RH repartent à vide.',
    },
    capitaine: {
      elu: '{nom} prend le marqueur : sa voix portera double.',
      successeur: 'Le marqueur de {ancien} passe à {nom} : la voix double passe avec.',
    },
    tir: {
      atteint: 'Le Directeur des ventes lâche sa dernière relance : elle emporte {cible}.',
      enLair: 'Le Directeur des ventes a gardé sa relance.',
    },
    // Aucun participe ne s’accorde avec {nom} : le complément suit le verbe.
    rancune: 'La cafétéria a livré son propre Ancien, {nom} : le plateau perd ses moyens.',
    // L’enquête est annoncée, jamais la main (R93) : la composition publique
    // dit déjà qui peut la remplir.
    corbeau: 'L’Enquête annuelle a désigné {nom} : à la cafétéria, deux voix sont déjà comptées.',
    // Le chien aboie à l’aube (R108) : il dit les costumes chez les voisins
    // vivants, jamais leur nom ni leur nombre. Le silence dit autant.
    ours: {
      grogne: 'Le chien de {nom} a aboyé à l’aube : les costumes s’installent à ses côtés.',
      silence: 'Le chien de {nom} s’est tu à l’aube : pas de costume à ses côtés.',
    },
    bouc: 'Les voix se partagent, la cafétéria ne tranche pas : c’est {nom}, l’Alternant, qui sort par la porte RH pour tous.',
    votants: {
      designes: 'Dernier mot de l’Alternant : demain, seuls voteront {noms}.',
      personne: 'L’Alternant s’est tu : demain, tout le plateau votera.',
    },
    fin: {
      village: 'Le plateau tient bon : plus un costume dans l’open space.',
      loups: 'Le plateau est désert. Le badge ne répond plus.',
      amoureux: 'Les tourtereaux restent seuls sur le plateau : la partie est à eux.',
      loupBlanc: 'Le Consultant se tient seul devant le recrutement : il a licencié jusqu’à ses propres managers.',
      personne: 'Il ne reste personne pour éteindre les écrans.',
    },
  },

  /* --- Les prompts : ils ne promettent que ce que le moteur permet --- */
  prompts: {
    // La carte est une mécanique, la phrase vaut pour tout univers.
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés — l’un est licencié, l’autre le suit.',
    proteger: {
      base: 'Choisisz qui dormira derrière votre rempart cette nuit.',
      interdit:
        '{ancien} dormait derrière votre rempart hier : pas deux nuits de suite — choisissez une autre porte.',
    },
    sonder: 'Inspectez un vivant, jamais vous : ce qu’il cache sous son statut s’inscrit dans votre tableur.',
    devorer: 'La direction a ses ordres. Désignez qui passera par la porte RH — ou laissez le plateau dormir.',
    sorciere: {
      victime:
        'Les managers ont désigné leur cible : {victime}. Réveillez-la avec votre bon remède, ou laissez-la partir — et votre mauvais remède peut frapper un autre vivant.',
      sansVictime:
        'Personne n’a été licencié cette nuit. Votre mauvais remède peut encore frapper — ou vous ne faites rien.',
      // La Pharmacienne vouvoyée au féminin applique la règle d’accord : c’est
      // « la Pharmacienne » que le prompt regarde, pas la personne qui la joue.
      soiMemeInterdit:
        'C’est vous que les managers ont licenciée. La table interdit le remède qui réveille sur soi : l’autre, lui, reste.',
    },
    tirer: 'Votre dernière relance : visez un vivant — ou laissez sonner.',
    successeur: 'Dernier ordre : désignez qui portera le marqueur.',
    voter: {
      // L’élection autorise le vote pour soi (R56) ; le vote du jour
      // l’interdit (R60), et lui seul « peut changer tant que la phase court ».
      election: 'Élisez votre chef de projet — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui passera par la porte RH — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // L’Enquête annuelle peut se désigner elle-même (R93) : « vous compris ».
    marquer:
      'Désignez un vivant, vous compris : à la cafétéria, deux voix pèseront d’office contre ce vivant — ou ne glissez rien dans la boîte à idées. Le mot sera lu, jamais la main.',
    // L’Analyste de flux peut se compter dans son trio (D29), et s’abstenir (R107).
    flairer:
      'Désignez un vivant, vous compris : vous flairerez son trio — lui et ses deux voisins vivants. Un costume s’y trouve, votre nez répond, et votre flair demeure ; un trio sain vous le retire à vie. Ou ne flairez personne.',
    trahir: 'La direction dort. Licenciez l’un des leurs — ou épargnez-la cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont à la cafétéria.',
    // Le tiroir n’appartient qu’au Piqueur de stylos (R110) : l’obligation ne
    // vaut que quand les deux cartes sont des Managers.
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez le Piqueur de stylos, sans aucun pouvoir. Celle que vous laissez sort du jeu.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux Managers : il faut en prendre une. Celle que vous laissez sort du jeu.',
    },
    seRanger: 'La première nuit, rangez-vous pour toujours : au plateau, sans pouvoir — ou chez les managers, avec leurs réunions.',
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il part, vous rejoindrez la direction.',
  },

  canaux: {
    village: 'La cafétéria',
    loups: 'Le CODIR',
    amoureux: 'Les tourtereaux',
    // Le murmure des Deux Sœurs et des Trois Frères — un canal par fratrie,
    // ouvert tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    // Les partis bavardent à la machine à café : l’au-delà du plateau.
    morts: 'La machine à café',
  },

  /* --- Les suggestions, par position : la référence, la direction, l’outillé --- */
  suggestions: [
    { nom: 'Le sprint tranquille', note: 'L’équilibre du jeu, calculé pour cette table.' },
    { nom: 'Un manager de plus', note: 'Un Manager de plus : les portes RH ne resteront pas fermées.' },
    { nom: 'Le plateau outillé', note: 'Tous les rôles possibles à cette table : le camp a des mains, et la cafétéria un syndicaliste.' },
  ],

  /* --- La nuit racontée : le log récité, secrets compris (R88) --- */
  recit: {
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'L’Animateur du séminaire a lié {nom} et {ancien} d’un même destin.',
      protection: 'Le Syndicaliste a plaidé pour {nom}.',
      voyance: 'La Contrôleuse de gestion a inspecté {nom} : {role}.',
      loups: {
        cible: 'Les managers ont licencié {nom}.',
        personne: 'Les managers n’ont licencié personne.',
      },
      sauvetage: 'Le bon remède a réveillé {nom}.',
      poison: 'Le mauvais remède a emporté {nom}.',
      grace: 'Le vote a épargné {nom} : l’Idiot de l’open space ne vote plus jamais.',
      capitaine: '{nom} a reçu le marqueur.',
      tir: {
        cible: 'La dernière relance a emporté {nom}.',
        personne: 'Le Directeur des ventes a gardé sa relance.',
      },
      vote: {
        condamne: 'La cafétéria a livré {nom} aux RH.',
        personne: 'La cafétéria n’a livré personne aux RH.',
      },
      resistance: 'Les managers ont foncé sur {nom} : l’Ancien a tenu bon.',
      rancune: 'En livrant {nom}, son Ancien, la cafétéria a perdu ses moyens.',
      corbeau: 'L’Enquête annuelle a désigné {nom}.',
      // Le log ne dit que le centre du trio (R107) : les voisins se lisent
      // sur le plateau, la conclusion suffit au récit.
      renard: {
        loups: 'L’Analyste de flux a flairé le trio autour de {nom} : les costumes y étaient.',
        sain: 'L’Analyste de flux a flairé le trio autour de {nom} : un trio sain, et son flair s’en est allé.',
      },
      ours: {
        grogne: 'À l’aube, le chien de {nom} a aboyé : les costumes sont à ses côtés.',
        silence: 'À l’aube, le chien de {nom} s’est tu : pas de costume à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, l’Alternant.',
      votants: {
        designes: 'L’Alternant a désigné les votants du lendemain : {noms}.',
        personne: 'L’Alternant n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Consultant a licencié {nom}, un Manager de sa propre direction.',
        personne: 'Le Consultant a épargné la direction.',
      },
      // Le chapardage ne se raconte qu’ici : la carte prise, ou la sienne
      // gardée — le log ne dit ni le tiroir ni la main (R110).
      voleur: {
        prise: 'Le Piqueur de stylos a pris la carte {role}.',
        garde: 'Le Piqueur de stylos a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'L’Intérimaire {nom} s’est rangé au plateau.',
        loups: 'L’Intérimaire {nom} s’est rangé chez les managers.',
      },
      modele: 'Le Cadet {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      // Le changement de camp ne se crie pas (D33) : le récit seul le relit,
      // et le camp d’origine s’y devine.
      transformation: 'Le modèle de {nom} est parti : le Cadet a rejoint la direction.',
    },
  },

  /*
    --- Les légendes du graveur (SPEC § 6) : sèches, sans héroïsme, des corps ---
    Le registre du plateau : des faits divers de bureau, pas des digressions.
    Les phrases ne commentent pas ; elles regardent de côté. Esquisse, à
    relire avec un habitant.
  */
  legendes: {
    roles: {
      villageois: 'Son compte LinkedIn est à jour.',
      loup: 'Le sourire ne discute pas.',
      voyante: 'Elle inspecte les lignes, pas les personnes.',
      sorciere: 'Deux remèdes, et le mauvais.',
      chasseur: 'Il vend mieux mort que debout.',
      cupidon: 'La team, c’est pour la vie, comme il dit.',
      salvateur: 'Il gagne une nuit à la fois.',
      idiot: 'Invité à toutes les réunions, jamais écouté.',
      ancien: 'Deux plans sociaux, et toujours là.',
      corbeau: 'Le questionnaire était anonyme.',
      bouc: 'Le stage est formateur, dit la convention.',
      petiteFille: 'Chaque réunion a sa photo.',
      loupBlanc: 'La mission ne se discute pas.',
      villageois2: 'Moteur des deux côtés.',
      renard: 'Il connaît le plateau par les cloisons.',
      ours: 'Le chien le sait avant les badges.',
      voleur: 'Il ne vole pas : il mutualise.',
      chienLoup: 'Deux camps, une seule mission.',
      enfantSauvage: 'Il observe, puis refait pareil.',
      soeurs: 'Elles se sont reconnues autour de l’eau fraîche.',
      freres: 'Trois fois le même badge, trois fois la même idée.',
    },
    ecrans: {
      accueil: 'La démocratie tient sur un plateau.',
      salon: 'Assis en rond, comme tous les lundis.',
      revelation: 'Nul n’est inscrit sur la liste des participants.',
      nuitDormeur: 'Dormez : le badge est pointé pour vous.',
      mort: 'Tout voir, enfin, et depuis la machine à café.',
      aubeMorts: 'Les cloisons n’ont rien vu.',
      aubePaisible: 'Le café reprend, pas la confiance.',
      election: 'Qui parle le plus fort tient le marqueur.',
      vote: 'Tous alignés, donc tous innocents.',
      depouillement: 'Les voix sont comptées ; les options, jamais.',
      chasseurAttente: 'Il vend mieux mort que debout.',
      succession: 'Le marqueur change de main, pas de langage.',
      boucDernierMot: 'Le stage est formateur, dit la convention.',
      fin: 'La prochaine levée de fonds attendra.',
      tableDisparue: 'Le plateau s’est vidé sans vous.',
    },
    recit: {
      loupBlanc: 'La mission ne se discute pas.',
      rancune: 'Le plateau a scié sa propre chaise.',
      poison: 'Deux remèdes, et le mauvais.',
      tir: 'Il vend mieux mort que debout.',
      chagrin: 'Liés par un séminaire, séparés par rien.',
      grace: 'Invité à toutes les réunions, jamais écouté.',
      bouc: 'Le stage est formateur, dit la convention.',
      voteMeute: 'Un vote, une consigne, pas de débat.',
      voteVillage: 'Tous alignés, donc tous innocents.',
      sauvetage: 'Le remède a servi ; nul ne l’a su.',
      loups: 'Les portes RH ne font pas de bruit sur la moquette.',
      resistance: 'Deux plans sociaux, et toujours là.',
      protection: 'Pour une fois, la procédure a tenu.',
      corbeau: 'Le questionnaire était anonyme.',
      voyance: 'Elle inspecte les lignes, pas les personnes.',
      amoureux: 'La team, c’est pour la vie, comme il dit.',
      nuitDefaut: 'Le licenciement n’attend pas l’aube.',
      jourDefaut: 'Ils ont débriefé la moindre réunion.',
      derniere: 'La prochaine levée de fonds attendra.',
    },
  },

  // Les dix-huit couvre-chefs du plateau, un par siège (SPEC § 5.1.2) :
  // tout ce qui se pose sur une tête quand la cafétéria siège.
  couvreChefs: [
    'casque à isolation active',
    'casquette de la bonne ambiance',
    'capuche de développeur',
    'bob du séminaire d’été',
    'béret de designer',
    'chapeau de fête du vendredi',
    'casque de chantier des locaux',
    'foulard du cours de yoga',
    'bonnet du bureau d’hiver',
    'chapeau de pluie du vélo partagé',
    'casquette retournée du pôle croissance',
    'bombe de moto du commercial itinérant',
    'canotier du déguisement de décembre',
    'turban du week-end créatif',
    'casquette du food-truck du mercredi',
    'chapeau de cow-boy du service commercial',
    'calotte tricotée par une collègue',
    'casque du standard qui n’existe plus',
  ],
};
