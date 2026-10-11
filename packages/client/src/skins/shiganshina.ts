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
    trahir: 'Les Titans dorment. Dévorez l’un d’eux — ou épargnez-les cette nuit.',
    designerVotants: 'Votre dernier mot : désignez qui votera demain — au moins un vivant. Les autres se tairont à l’assemblée.',
  },

  canaux: {
    village: 'Le district',
    loups: 'Les Titans',
    amoureux: 'Le pacte',
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
      bouc: 'L’égalité est retombée sur {nom}, l’Eldien.',
      votants: {
        designes: 'L’Eldien a désigné les votants du lendemain : {noms}.',
        personne: 'L’Eldien n’a désigné personne.',
      },
      loupBlanc: {
        cible: 'Le Titan Mâchoire a dévoré {nom}, un Titan.',
        personne: 'Le Titan Mâchoire a épargné les siens.',
      },
    },
  },
};
