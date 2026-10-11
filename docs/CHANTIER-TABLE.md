# Chantier « la table » — contrat entre les briques

**Ouvert le 11 octobre 2026.** Le moteur, le serveur de salons, l'accueil et le
salon existent. Ce chantier construit tout le reste : l'écran de partie, ses
sons, les réglages, l'hébergement multijoueur et un banc de robots pour tester
à six et plus. Plusieurs agents travaillent **en parallèle** ; ce document fixe
qui possède quel fichier et quelles signatures sont gelées.

## Règles communes

1. **On ne touche qu'à ses fichiers.** Un besoin dans le fichier d'un autre se
   signale dans son rapport final, il ne s'édite pas. Le chef d'orchestre
   intègre.
2. **Les signatures marquées « figée » ne changent pas** (noms d'export,
   props). On peut ajouter des props optionnelles, jamais retirer ni renommer.
3. Lire avant d'écrire : `docs/RULES.md`, `docs/SKINS.md`, `docs/refs/design.md`
   (cartographie des écrans, chat, sons), `packages/engine/src/views.ts`
   (`GameView`, `Prompt`), `packages/engine/src/types.ts` (`Action`,
   `GameEvent`), `packages/client/src/skins/registre.ts` (`Voix`).
4. **Aucun identifiant moteur à l'écran** : tout passe par la voix du skin
   (`useVoix()`), y compris les noms de rôles, de camps, de canaux.
5. **Le silence est la loi** (R87–R88) : n'afficher que ce que la `GameView`
   dit. Jamais « 3 joueurs n'ont pas joué » la nuit.
6. Style maison : français, commentaires en prose comme le code existant,
   Tailwind 4 + variables de `styles.css` (`--nuit`, `--papier`, `--lanterne`,
   `--sang`, `--serment`, `--lune`…), classes `.carte`, `.btn-village`,
   `.btn-voisin`, `.champ`. Polices : `font-identite` (Cormorant, titres et
   noms de rôles), corps Alegreya Sans, `font-mono` (minuteries, codes).
   Animations `motion/react` avec les ressorts de `anim/tokens.ts`.
7. Cibles ≥ 44 px, rien ne se coupe à 320 px, `prefers-reduced-motion`
   respecté, contrastes AA.
8. Vérifier avant de rendre : `npm run typecheck -w @garoutom/client` (ou du
   paquet concerné) et `npm test -w <paquet>` depuis `D:\TomArcade\Garoutom`.
   D'autres agents écrivent en même temps : une erreur dans un fichier qui
   n'est pas le vôtre n'est pas la vôtre — signalez-la, ne la corrigez pas.
9. Pas de commit git : le chef d'orchestre s'en charge.
10. Les **designs sont des placeholders assumés** : SVG simples, gravés,
    cohérents avec la palette — pas d'images externes, pas de fichiers
    binaires.

## Les fondations (posées par le chef, partagées)

- `lib/store.ts` — `room`, `game` (`GameView`), `chronique: EvenementRecu[]`
  (`{ id, event: GameEvent, day }`, remise à zéro au `debut`), `annoncer(text)`
  pour la région vocale, `heureServeur()`.
- `lib/partie.ts` — `useVoix()`, `useSkinId()`, `useNoms()` / `nomDuSiege()`,
  `useGame()`, `useRoom()`, `useEcheance()` (`{ restantMs, dureeMs, fraction,
  secondes } | null`), `siegesVivants()`, `formatDuree()`.
- `lib/actions.ts` — `jouer(action: Action)` (verrou anti double-clic,
  refus → avis), `revanche()`, `quitterTable()`, `lancerPartie()`…
- `App.tsx` — pose `data-skin={options.skin}` sur la racine et rend
  `<Partie room={room} />` dès que `room.status !== 'lobby'`.

## Propriété des fichiers et signatures

Chemins relatifs à `packages/client/src/` sauf mention.

| Agent | Fichiers possédés | Exports figés |
|---|---|---|
| **Table** | `screens/Partie.tsx`, `components/partie/Place.tsx`, `components/partie/Minuterie.tsx`, `components/partie/Narrateur.tsx`, `components/partie/Action.tsx`, `components/partie/*Jour*.tsx`, tests `screens/Partie.render.test.tsx` | `Partie({ room })`, `Place(PlaceProps)`, `type Teinte` |
| **Nuit** | `components/partie/Revelation.tsx`, `components/partie/Nuit.tsx`, `components/partie/nuit/*` | `Revelation()`, `Nuit()` |
| **Fil** | `components/partie/Fil.tsx`, `components/partie/fil/*` | `Fil({ mode, canaux?, className? })` |
| **Fin** | `components/partie/Fin.tsx`, `components/partie/fin/*` | `Fin()` |
| **Habit** | `components/habit/*`, `skins/habits.ts`, la section `[data-skin]` en fin de `styles.css` | `SymboleRole({ role, taille?, className? })`, `CarteRole(CarteRoleProps)`, `Decor({ moment, className? })` |
| **Sons** | `lib/atelier.ts`, `lib/useSonsPartie.ts` | `atelier.{hurlement, glas, tic, vote, aube}`, `useSonsPartie()` |
| **Réglages** | `lib/reglages.ts`, `components/Reglages.tsx`, `components/Regles.tsx`, `screens/Salon.tsx`, `main.tsx` | `useReglages()`, `REGLAGES_DEFAUT`, `type Reglages`, `BoutonReglages`, `BoutonRegles` |
| **Réseau** | `packages/worker/**`, `packages/server/src/app.ts`, `packages/server/src/index.ts`, `packages/server/src/static.ts`, `lib/socket.ts`, `vite.config.ts`, `package.json` racine (scripts) | — |
| **Robots** | `packages/server/scripts/robots.ts`, `packages/server/package.json` (script `robots`) | — |

### Qui compose quoi

- `Partie` route selon `game.phase` : `revelation` → `<Revelation/>` ;
  `nuit` → `<Nuit/>` ; `election`, `jour`, `chasseur`, `succession` → son
  propre écran de jour (place + action + fil) ; `fin` → `<Fin/>`. Il monte
  `useSonsPartie()` une fois, pose `<Decor moment=…/>` derrière, l'en-tête
  (lien arcade, rappel de sa carte, minuterie, `BoutonRegles`,
  `BoutonReglages`, `BoutonSon`) et le `<Narrateur/>` qui raconte la
  chronique.
- `Nuit` utilise `<Place choisissables choisis onChoisir teinte compacte/>`
  pour désigner ses cibles, `<CarteRole/>` / `<SymboleRole/>`, et pour la
  meute `<Fil mode="integre" canaux={['loups']}/>`.
- `Revelation` utilise `<CarteRole retournee onClic/>`.
- `Fin` utilise `EcranFin` de `@tombp/arcade`, `<CarteRole taille="petite"/>`,
  `revanche()` (hôte seulement), `quitterTable()`.

## Après ce chantier

Une seconde vague pourra ouvrir des rôles de plus (`refs/roles.md`, « Rôles
envisagés pour plus tard ») une fois la table jouable de bout en bout.
