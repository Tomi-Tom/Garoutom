/**
 * Shiganshina — le second habit (Attack on Titan).
 *
 * Esquisse au sens de `docs/SKINS.md` : le mapping est celui de
 * `docs/refs/design.md` § 4, « ébauche, à affiner avec un connaisseur de
 * l’univers ». Tout ce que SKINS.md a tranché est repris ici au mot près ;
 * tout ce qui restait ouvert est complété avec sobriété, dans l’esprit de
 * l’univers — Portes, assauts, lames, sérum ; ni lune, ni meute, ni potence.
 * Chaque complément porte la marque « Esquisse » : il tient la place, il ne
 * prétend pas à la phrase définitive. La peau n’en est pas moins complète au
 * sens du registre — chaque rôle traduit, chaque cause de mort racontée —
 * sinon le registre la refuserait, et à bon droit : l’esquisse est une
 * question de plume, jamais une permission d’afficher « sorciere ».
 */

import type { Skin } from './registre.js';

export const shiganshina: Skin = {
  id: 'shiganshina',
  univers: 'Attack on Titan',
  // Esquisse : le nom de la charge n’est pas tranché ; « le commandant »
  // suit la phrase élue de SKINS.md (« prend le commandement du district »).
  charge: 'le commandant',
  plurielLoups: { un: 'Titan', plusieurs: 'Titans' },
  // Esquisse : l’absent est quelque part dehors, comme un éclaireur en retard.
  absent: 'hors des murs',

  /* --- Les rôles : les noms sont tranchés, les cartes sont esquissées --- */
  roles: {
    villageois: {
      nom: 'Habitant·e du district',
      // Esquisse : la carte du Villageois, transposée.
      description:
        'Pas de pouvoir. Votre arme, c’est votre voix à l’assemblée du district — et votre flair.',
    },
    loup: {
      nom: 'Titan',
      // Esquisse : la peau qui bout, l’esprit du mapping.
      description:
        'Chaque nuit, la peau bout : sortez, et dévorez un habitant du district. Le jour, vous marchez entre les murs comme les autres.',
    },
    voyante: {
      nom: 'l’Éclaireuse',
      // Esquisse : le bataillon d’exploration sonde sous la peau.
      description:
        'Chaque nuit, observez un vivant sous la peau : son vrai visage s’inscrit dans vos rapports, nuit après nuit.',
    },
    sorciere: {
      nom: 'la Scientifique',
      // Esquisse : deux sérums, pas deux potions.
      description:
        'Deux sérums, une seule fois chacun : celui qui rend la vie à la victime des Titans, celui qui donne la mort à qui vous voulez.',
    },
    chasseur: {
      nom: 'le Caporal',
      // Esquisse : même prudence que la carte du Chasseur — la phrase
      // annonce le pouvoir, la table connaît ses limites (D1).
      description: 'En tombant, vous pouvez frapper le joueur de votre choix — votre dernier geste.',
    },
    cupidon: {
      nom: 'Ymir',
      // Esquisse : lie deux destins d’un pacte.
      description:
        'La première nuit seulement, liez deux vivants d’un même pacte : si l’un meurt, l’autre le suit.',
    },
    salvateur: {
      nom: 'la Sentinelle',
      // Esquisse : veille chaque nuit sur l’un des siens.
      description:
        'Chaque nuit, votre veille protège un habitant des Titans — jamais le même deux nuits de suite, et le sérum passe toujours.',
    },
    idiot: {
      nom: 'la Goinfre',
      // Esquisse : graciée, la bouche pleine, muette au vote — l’accord au
      // féminin suit le rôle, comme la phrase de grâce tranchée par SKINS.md.
      description:
        'Condamnée par le vote, vous êtes reprise au dernier moment : votre vrai visage est montré, mais vous ne votez plus jamais.',
    },

    /* --- Les rôles optionnels de la v2 : esquisse entière, mêmes règles --- */
    ancien: {
      // Esquisse : le vieux de la Garnison, qui a vu tomber le Mur Maria.
      nom: 'le Vétéran',
      description:
        'Vous avez survécu à tant d’assauts : la première attaque d’un Titan ne vous tue pas, la seconde si. Et si le district vous abat de sa main, il peut perdre ses pouvoirs avec vous.',
    },
    corbeau: {
      // Esquisse : la Brigade spéciale de la Police militaire, qui désigne
      // ses suspects sans signer.
      nom: 'le Brigadier',
      description:
        'Chaque nuit, désignez un vivant : à l’assemblée, deux voix pèseront d’office contre ce vivant. La désignation est annoncée, jamais sa main.',
    },
    bouc: {
      // Esquisse : le monde entier fait porter la faute aux Eldiens.
      nom: 'l’Eldien',
      description:
        'Si l’assemblée finit à égalité, c’est vous que le district livre à la place de tous. Votre dernier mot : désigner qui votera le lendemain.',
    },
    petiteFille: {
      // Esquisse : la plus jeune des recrues, tapie sur le chemin de ronde.
      nom: 'la Recrue',
      description:
        'Tapie sur les remparts pendant que les Titans choisissent leur proie, vous voyez combien d’entre eux visent chaque habitant — jamais lesquels.',
    },
    loupBlanc: {
      // Esquisse : le Titan Mâchoire, celui qui dévore les autres Titans.
      nom: 'le Titan Mâchoire',
      description:
        'Vous chassez avec les Titans, qui vous prennent pour l’un des leurs. Une nuit sur deux, vous pouvez dévorer un Titan. Vous ne gagnez que seul.',
    },
    villageois2: {
      // Esquisse : l’Habitant double, la carte recto-verso (R106, D31) —
      // même le porteur croit lire un habitant ordinaire.
      nom: 'l’Habitant double',
      description:
        'Aucun pouvoir, aucune vie bonus : la carte est recto-verso, et les deux faces disent la même chose — Habitant du district. Cette certitude est publique ; le porteur, lui, n’en sait rien.',
    },
    renard: {
      // Esquisse : le Pisteur du Bataillon, le nez au vent.
      nom: 'le Pisteur',
      description:
        'Chaque nuit, pistez le trio d’un vivant de votre choix — lui et ses deux voisins vivants, vous compris. Des Titans dans le trio : votre nez répond, et votre piste demeure. Un trio sain : votre piste s’éteint à vie, et le trio entier est appris innocent.',
    },
    ours: {
      // Esquisse : l’Ours de foire, la bête qui gronde sur la place.
      nom: 'l’Ours de foire',
      description:
        'Vous ne jouez jamais. Chaque matin où vous vivez, après l’annonce des morts, votre bête de foire gronde si les Titans s’assoient à vos côtés — et son silence, lui aussi, est une information.',
    },
    /* --- La Vague 2 de la v3 (R109 à R114) : esquisse entière, mêmes règles --- */
    voleur: {
      // Esquisse : l’Escamoteur, la main passe, la carte reste.
      nom: 'l’Escamoteur',
      description:
        'Avant même la révélation, deux cartes restées sur la table sont à vous seul : prenez-en une et jouez-la dès la nuit qui vient — ou restez l’Escamoteur, sans aucun pouvoir. Deux Titans dans le talon : il faut en prendre une.',
    },
    chienLoup: {
      // Esquisse : le Chien de garde — de quel côté de la Porte il aboie.
      nom: 'le Chien de garde',
      description:
        'La première nuit, vous choisissez votre camp pour toujours. Rangé dans le district, vous n’avez aucun pouvoir ; rangé parmi les Titans, vous dévorez avec eux — et ils vous prennent pour l’un des leurs.',
    },
    enfantSauvage: {
      // Esquisse : l’Enfant des ruelles, qui montre du doigt son aîné.
      nom: 'l’Enfant des ruelles',
      description:
        'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. Le jour où il meurt, quoi qu’il arrive, la peau bout : vous devenez un Titan.',
    },
    soeurs: {
      // Esquisse : les Sœurs du lavoir, qui se reconnaissent au bord du canal.
      nom: 'les Sœurs du lavoir',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mort seule le referme.',
    },
    freres: {
      // Esquisse : les Trois de la mine, la même lampe, la même parole.
      nom: 'les Trois de la mine',
      description:
        'Aucun pouvoir. À la révélation, vous vous reconnaissez : un murmure vous est ouvert, jour et nuit, tant que vous vivez — la mort seule le referme.',
    },
  },

  // Esquisse : les noms des camps suivent les libellés de canaux tranchés.
  camps: { village: 'le district', loups: 'les Titans' },
  vainqueurs: {
    village: 'le district',
    loups: 'les Titans',
    amoureux: 'les amoureux',
    loupBlanc: 'le Titan Mâchoire',
    personne: 'personne',
  },

  /* --- Le narrateur : les phrases tranchées, les autres esquissées --- */
  narrateur: {
    debut: 'Les Portes de Shiganshina se referment. Découvrez qui vous êtes.',

    phases: {
      // Esquisse : le talon ne se montre qu’à son propriétaire — la phrase
      // dit la scène, jamais la main (R110, R87).
      voleur: 'Deux cartes restent sur la table, à l’abri des murs. Quelqu’un doit choisir.',
      // Esquisse : la carte est une mécanique, la phrase vaut pour tout
      // univers — la forme de Thiercelieux, transposée sans déguisement.
      revelation: 'Les cartes sont distribuées, face contre table. À vous de les retourner.',
      nuit: {
        principale: 'Les Portes se ferment. Shiganshina retient son souffle.',
        // Esquisse : plate par choix, comme à Thiercelieux — l’étape est un
        // fait d’architecture, pas un fait de récit.
        sorciere: 'La nuit se poursuit.',
        // Esquisse : plate aussi — l’étape du Titan Mâchoire se tient mort
        // compris (R97).
        loupBlanc: 'La nuit se poursuit.',
      },
      // Esquisse : le miroir du Chasseur, la main sur la garde.
      chasseur: 'Le Caporal rend l’âme, la main sur la garde. La partie attend son dernier geste.',
      // Esquisse : le miroir de la succession.
      succession: 'Le commandant est tombé : le commandement attend une main.',
      // Esquisse : le miroir du Bouc émissaire.
      bouc: 'L’Eldien rend l’âme. Son dernier mot peut désigner qui votera demain.',
      // Esquisse : le miroir de l’élection.
      election: 'Le district se choisit un commandant.',
      jour: 'Les Portes s’ouvrent sur le district. L’assemblée siège.',
      // Esquisse : la dernière carte devient la dernière lame.
      fin: 'La dernière lame est posée sur les remparts.',
    },

    morts: {
      loups: 'Un Titan a dévoré {nom}.',
      poison: 'Le sérum de la Scientifique a emporté {nom}.',
      vote: 'Le district a livré {nom} aux Titans.',
      chasseur: 'La lame du Caporal a atteint {nom}.',
      chagrin: 'Le pacte brisé a eu raison de {nom}.',
      // Esquisse : R101 — l’absence a trop duré ; le district raye un nom.
      abandon: '{nom} a disparu au-delà des murs.',
    },
    // Esquisse : même silence, même suffixe — la carte retournée se dit
    // pareil dans tous les univers.
    roleRevele: '— c’était {role}.',

    aubePaisible: 'Les Portes s’ouvrent : une nuit sans assaut, tout le monde est là.',
    grace: 'Le district allait livrer {nom} aux Titans — mais c’est la Goinfre. La bouche pleine, elle ne vote plus.',
    vote: {
      condamne: 'Les voix sont comptées : {nom} passera les Portes.',
      // Esquisse : le miroir du dépouillement sans condamné.
      personne: 'Les voix sont comptées : personne ne passera les Portes.',
    },
    capitaine: {
      elu: '{nom} prend le commandement du district.',
      // Esquisse : le miroir du brassard qui passe.
      successeur: 'Le commandement de {ancien} passe à {nom}.',
    },
    tir: {
      atteint: 'De sa dernière force, le Caporal a planté sa lame dans {cible}.',
      enLair: 'Le Caporal a rendu sa lame au fourreau.',
    },
    // Esquisse : les miroirs des annonces de la v2, mêmes variables.
    rancune: 'Le district a abattu son propre Vétéran, {nom} : tous les régiments perdent leurs pouvoirs.',
    corbeau: 'La Brigade a désigné {nom} : à l’assemblée, deux voix sont déjà comptées.',
    // Esquisse : la grogne de la bête de foire, à l’aube (R108) — le silence
    // dit autant, chaque matin vécu.
    ours: {
      grogne: 'La bête de foire de {nom} a grondu à l’aube : les Titans s’assoient à ses côtés.',
      silence: 'La bête de foire de {nom} s’est tue à l’aube : pas de Titan à ses côtés.',
    },
    bouc: 'Les voix se partagent, l’assemblée ne tranche pas : c’est {nom}, l’Eldien, que le district livre à la place de tous.',
    votants: {
      designes: 'Dernier mot de l’Eldien : demain, seuls voteront {noms}.',
      personne: 'L’Eldien s’est tu : demain, tout le district votera.',
    },
    fin: {
      village: 'Plus une trace de Titan entre les murs : Shiganshina tient encore.',
      loups: 'Les Titans ont franchi les Portes. Shiganshina ne répond plus.',
      amoureux: 'Deux amoureux restent seuls dans un district debout : la partie est à eux.',
      loupBlanc: 'Le Titan Mâchoire se tient seul sur les remparts : il a dévoré jusqu’aux siens.',
      personne: 'Il ne reste personne pour fermer les Portes.',
    },
  },

  /* --- Les prompts : deux sont tranchés, les autres esquissés au même étalage --- */
  prompts: {
    // Esquisse : la carte est une mécanique, la phrase vaut pour tout univers.
    pret: 'Découvrez votre carte. Quand vous savez qui vous êtes, confirmez.',
    // Esquisse : le pacte d’Ymir.
    cupidon: 'Désignez deux vivants, vous compris : leurs destins seront liés par le pacte — l’un meurt, l’autre le suit.',
    proteger: {
      // Esquisse : la Sentinelle veille, le bouclier devient veille.
      base: 'Choisissez qui dormira sous votre veille cette nuit.',
      interdit: '{ancien} dormait sous votre veille hier : pas deux nuits de suite — choisissez une autre maison.',
    },
    sonder: 'Les yeux de l’Éclaireuse : observez un habitant — vous verrez son vrai visage.',
    devorer: 'La peau bout. Sortez, et dévorez un habitant — ou épargnez le district ce soir.',
    sorciere: {
      // Esquisse : les mêmes règles que la Sorcière — la vie, la mort,
      // l’interdit de se servir soi-même quand la table le refuse.
      victime:
        'Un Titan a désigné sa proie : {victime}. Rendez-lui la vie avec votre sérum de vie, ou laissez-la partir — et votre sérum de mort peut frapper un autre vivant.',
      sansVictime: 'Aucun Titan n’a dévoré cette nuit. Votre sérum de mort peut encore frapper — ou vous ne faites rien.',
      soiMemeInterdit:
        'C’est vous que le Titan a désignée. La table interdit le sérum de vie sur soi : le sérum de mort, lui, reste.',
    },
    // Esquisse : la dernière lame.
    tirer: 'Votre dernière lame : frappez un vivant — ou rendez-la au fourreau.',
    // Esquisse : le miroir du dernier ordre.
    successeur: 'Dernier ordre : désignez qui prendra le commandement.',
    voter: {
      // Esquisse : mêmes règles R56 et R60 que Thiercelieux — l’élection
      // permet le vote pour soi, le vote du jour l’interdit et peut changer.
      election: 'Élisez votre commandant — un vivant, vous compris — ou abstenez-vous.',
      jour:
        'Désignez qui sera livré aux Titans — un autre vivant que vous. L’abstention est permise, et votre vote peut changer tant que la phase court.',
    },
    // Esquisse : les consignes de la v2, mêmes promesses que Thiercelieux.
    marquer:
      'Désignez un vivant, vous compris : à l’assemblée, la Brigade portera deux voix contre ce vivant — ou ne désignez personne. On saura qui est désigné, jamais par qui.',
    // Esquisse : le Pisteur peut se compter dans son trio (D29), et
    // s’abstenir (R107) — mêmes promesses que Thiercelieux.
    flairer:
      'Désignez un vivant, vous compris : vous pisterez son trio — lui et ses deux voisins vivants. Des Titans s’y trouvent, votre piste demeure ; un trio sain vous la retire à vie. Ou ne pistez personne.',
    trahir: 'Les Titans dorment. Dévorez l’un d’eux — ou épargnez-les cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont à l’assemblée.',
    // Esquisse : le talon de l’Escamoteur, mêmes promesses que Thiercelieux —
    // l’obligation ne vaut qu’avec deux cartes des Titans (R110).
    voler: {
      libre:
        'Deux cartes sont à vous seul : prenez-en une pour la jouer dès cette nuit — ou restez l’Escamoteur, sans aucun pouvoir. Celle que vous laissez sort du jeu.',
      obligatoire:
        'Deux cartes sont à vous seul, et ce sont deux Titans : il faut en prendre une. Celle que vous laissez sort du jeu.',
    },
    seRanger:
      'La première nuit, rangez-vous pour toujours : dans le district, sans rien — ou parmi les Titans, avec leurs dents.',
    designerModele:
      'La première nuit, désignez votre modèle parmi les vivants, vous compris : il ne le saura jamais. À sa mort, vous deviendrez un Titan.',
  },

  canaux: {
    village: 'Le district',
    loups: 'Les Titans',
    amoureux: 'Le pacte',
    // Esquisse : le murmure des Sœurs du lavoir et des Trois de la mine —
    // un canal par fratrie, ouvert tant qu’ils vivent (R114, D28).
    fratrie: 'La fratrie',
    morts: 'Les Chemins',
  },

  suggestions: [
    { nom: 'La garnison', note: 'La garnison tient le district : l’équilibre, calculé pour cette table.' },
    { nom: 'L’irruption', note: 'Un Titan de plus : les Portes ne tiendront pas toutes seules.' },
    { nom: 'Toutes les lames', note: 'Tous les régiments réunis : le district a réponse à tout.' },
  ],

  /* --- La nuit racontée : esquisse entière, le log ne change pas d’un mot --- */
  recit: {
    // Le mot « nuit » reste : dans l’univers aussi, les assauts ont lieu la
    // nuit — l’écran peut dire « nuit 3 » (SKINS.md).
    nuit: 'Nuit {n}',
    jour: 'Jour {n}',
    // Les Portes se rouvrent au matin : l’aube garde son mot.
    aube: 'Aube {n}',
    lignes: {
      amoureux: 'Ymir a lié {nom} et {ancien} d’un même pacte.',
      protection: 'La Sentinelle a veillé sur {nom}.',
      voyance: 'L’Éclaireuse a observé {nom} : {role}.',
      loups: {
        cible: 'Un Titan a désigné {nom}.',
        personne: 'Les Titans n’ont désigné personne.',
      },
      sauvetage: 'Le sérum de vie a sauvé {nom}.',
      poison: 'Le sérum de mort a emporté {nom}.',
      grace: 'Le vote a épargné {nom} : la Goinfre ne vote plus jamais.',
      capitaine: '{nom} a reçu le commandement.',
      tir: {
        cible: 'Le Caporal a abattu {nom}.',
        personne: 'Le Caporal a rendu sa lame au fourreau.',
      },
      vote: {
        condamne: 'Le district a livré {nom} aux Titans.',
        personne: 'Le district n’a livré personne aux Titans.',
      },
      resistance: 'Un Titan a attaqué {nom} : le Vétéran a tenu bon.',
      rancune: 'En abattant {nom}, son Vétéran, le district a perdu ses pouvoirs.',
      corbeau: 'La Brigade a désigné {nom}.',
      // Esquisse : le log ne dit que le centre du trio (R107), la conclusion
      // suffit au récit.
      renard: {
        loups: 'Le Pisteur a pisté le trio autour de {nom} : les Titans y étaient.',
        sain: 'Le Pisteur a pisté le trio autour de {nom} : un trio sain, et sa piste s’en est allée.',
      },
      ours: {
        grogne: 'À l’aube, la bête de foire de {nom} a grondu : les Titans sont à ses côtés.',
        silence: 'À l’aube, la bête de foire de {nom} s’est tue : pas de Titan à ses côtés.',
      },
      bouc: 'L’égalité est retombée sur {nom}, l’Eldien.',
      votants: {
        designes: 'L’Eldien a désigné les votants du lendemain : {noms}.',
        personne: 'L’Eldien n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Titan Mâchoire a dévoré {nom}, un Titan.',
        personne: 'Le Titan Mâchoire a épargné les siens.',
      },
      // Esquisse : le vol et ses compagnons, mêmes variables que Thiercelieux
      // — le log ne dit ni le talon ni la main (R110, R111, R112).
      voleur: {
        prise: 'L’Escamoteur a pris la carte {role}.',
        garde: 'L’Escamoteur a gardé sa carte : aucun pouvoir n’a été joué.',
      },
      chienLoup: {
        village: 'Le Chien de garde {nom} s’est rangé dans le district.',
        loups: 'Le Chien de garde {nom} s’est rangé parmi les Titans.',
      },
      modele: 'L’Enfant des ruelles {enfant} a pris {nom} pour modèle — {nom} n’en a jamais rien su.',
      transformation: 'Le modèle de {nom} est mort : l’Enfant des ruelles est devenu un Titan.',
    },
  },

  /*
    --- Les légendes du graveur (SPEC § 8) ---
    Les Désastres de la guerre : secs, sans héroïsme, des corps. Les titres de
    Goya sont cités quand ils existent (numéro du Désastre en commentaire) ; le
    reste est de la même veine — Esquisse, à relire avec un connaisseur.
  */
  legendes: {
    roles: {
      villageois: 'Tristes pressentiments.', // Désastre 1
      loup: 'On ne sait pas pourquoi.', // Désastre 35
      voyante: 'Je l’ai vu.', // Désastre 44
      sorciere: 'Ceci est pire.', // Désastre 37
      chasseur: 'Et il n’y a pas de remède.', // Désastre 15
      cupidon: 'Avec raison ou sans.', // Désastre 2
      salvateur: 'Elle garde la Porte ; ils passent par le Mur.',
      idiot: 'Graciée, la bouche pleine.',
      ancien: 'Il en a vu d’autres. Il en verra moins.',
      corbeau: 'Enterrer et se taire.', // Désastre 18
      bouc: 'C’est pour cela que vous êtes nés.', // Désastre 12
      petiteFille: 'On ne peut pas regarder.', // Désastre 26
      loupBlanc: 'Les Titans ne se mangent pas entre eux, dit-on.',
      // Planches 14 à 16 du graveur, gravées pour la v3.
      villageois2: 'Recto, verso : le même visage.',
      renard: 'Le voisin sent le voisin.',
      ours: 'Il grogne à l’aube, dit-on.',
      // Planches 17 à 21 du graveur, gravées pour la Vague 2 — mêmes gravures
      // qu’à Thiercelieux : la planche change d’univers, pas de sentence.
      voleur: 'Il ne dérobe pas : il choisit.',
      chienLoup: 'La bête choisit son maître.',
      enfantSauvage: 'Il montre du doigt ; l’ombre regarde.',
      soeurs: 'Elles se sont reconnues à voix basse.',
      freres: 'Trois fois le même menton, trois fois la même parole.',
    },
    ecrans: {
      accueil: 'Ils étaient trop grands pour la place.',
      salon: 'Serrés derrière le Mur, comme si cela suffisait.',
      revelation: 'Nul ne sait ce qui bout sous la peau.',
      nuitDormeur: 'Dormez : d’autres montent la garde.',
      mort: 'Voir enfin, et de trop près.',
      aubeMorts: 'On ne les a pas entendus venir.',
      aubePaisible: 'Tous sont là. Personne ne respire.',
      election: 'Qui crie le plus fort porte le commandement.',
      vote: 'Tous d’accord, donc personne de coupable.',
      depouillement: 'Les voix sont comptées ; les morts, jamais.',
      chasseurAttente: 'Et il n’y a pas de remède.',
      succession: 'Le commandement change de main, pas de mur.',
      boucDernierMot: 'C’est pour cela que vous êtes nés.',
      fin: 'Rien. Le temps le dira.', // Désastre 69
      tableDisparue: 'Le district s’est vidé sans vous.',
    },
    recit: {
      loupBlanc: 'Les Titans ne se mangent pas entre eux, dit-on.',
      rancune: 'Le district a abattu son dernier rempart.',
      poison: 'Deux sérums, et le mauvais.',
      tir: 'Et il n’y a pas de remède.',
      chagrin: 'Liés par un pacte, enterrés ensemble.',
      grace: 'Graciée, la bouche pleine.',
      bouc: 'C’est pour cela que vous êtes nés.',
      voteMeute: 'Cette fois, c’était le bon.',
      voteVillage: 'Tous d’accord, donc personne de coupable.',
      sauvetage: 'Le sérum a servi ; nul ne l’a su.',
      loups: 'On ne les a pas entendus venir.',
      resistance: 'Il en a vu d’autres. Il en verra moins.',
      protection: 'Pour une fois, le bon mur.',
      corbeau: 'Enterrer et se taire.',
      voyance: 'Je l’ai vu.',
      amoureux: 'Avec raison ou sans.',
      nuitDefaut: 'Derrière le Mur, la peau bout.',
      jourDefaut: 'Ils ont parlé longtemps.',
      derniere: 'Rien. Le temps le dira.',
    },
  },

  // Les dix-huit coiffes du district, une par siège (SPEC § 8) : les six
  // premières sont celles du SPEC, les douze autres sont esquissées.
  couvreChefs: [
    'capuche du Bataillon',
    'képi de la Garnison',
    'casquette de la Brigade',
    'foulard de marchande',
    'toque de boulanger',
    'casque de mineur',
    'bonnet de laine',
    'chapeau de paille',
    'béret de cadet',
    'calot de la Police militaire',
    'fichu de lavandière',
    'casquette de docker',
    'bandeau de forgeron',
    'coiffe d’infirmière',
    'chapeau de feutre',
    'calotte de précepteur',
    'capuchon de pèlerin',
    'casque de cuir',
  ],
};
