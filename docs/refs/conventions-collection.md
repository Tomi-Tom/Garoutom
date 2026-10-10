# Ce que Garoutom hérite de la collection

Relevé fait le 10 octobre 2026 dans les douze dépôts de l'arcade. Garoutom n'a
aucune raison de réinventer ce que les huit jeux en ligne ont déjà résolu.

## La stack

Monorepo npm workspaces, TypeScript 5.7, Node ≥ 20, ESM, quatre paquets, sur le
modèle de `Yamstom` :

| Paquet | Rôle | Outils |
|---|---|---|
| `@garoutom/engine` | Règles pures et déterministes, sans dépendance. Porte aussi le contrat réseau (`protocol.ts`, `transport.ts`, `channel.ts`, `views.ts`). | Vitest |
| `@garoutom/server` | Le serveur de salons | Node, Express 5, Socket.IO 4, tsx, Redis optionnel |
| `@garoutom/client` | L'interface | React 19, Vite 6, Tailwind 4, `motion`, `zustand`, `@fontsource`, Testing Library |
| `@garoutom/worker` | L'hébergement retenu | Cloudflare Workers, Wrangler 4, Durable Object |

Playwright pour les tests de fumée.

## Le temps réel

- **Le serveur fait autorité.** Le client n'envoie que des intentions, le moteur
  valide (`IllegalActionError`), le serveur projette **une vue par siège**
  (`viewFor`). Belotom masque déjà de l'information (mains cachées,
  `spectatorView`) : c'est exactement le besoin d'un jeu à rôles cachés, où
  chaque joueur ne doit recevoir que ce que son rôle lui permet de savoir.
- **Codes de salon** : 4 lettres sur `ABCDEFGHJKLMNPQRSTUVWXYZ` (ni O ni I).
  Accueil type : pseudo, puis « Ouvrir une table · Rejoindre ».
- **Reprise** : reconnexion par jeton, puis un robot prend le siège après un
  délai de grâce (`mini-games-docs/docs/reprise-et-robots.md`). Pour un
  loup-garou, un robot qui joue un rôle caché est une vraie question de design.
- **Hébergement** : Durable Object Cloudflare joint en WebSocket natif via
  `VITE_CHANNEL_URL`, état persisté dans le stockage du DO selon le cycle lire /
  appliquer / écrire (`Yamstom/docs/PERSISTANCE.md`). La fonction Vercel est
  plafonnée à 300 s de connexion : trop court pour une partie de loup-garou.

## Le déploiement

- Client sur Vercel (`vercel.json` : build de l'engine puis du client, sortie
  `packages/client/dist`).
- Sous-domaine `garoutom.tombp.fr`. **L'ordre compte** (`mini-games-docs/GAMES.md`) :
  d'abord le CNAME `garoutom` → `cname.vercel-dns.com.` chez Scaleway, ensuite
  le rattachement côté Vercel. Dans l'autre ordre, le certificat n'est jamais
  émis. Action manuelle de Tom.

## Le paquet commun `@tombp/arcade`

Pas publié sur npm : chaque jeu embarque `vendor/tombp-arcade-0.1.1.tgz`.

- **Composants** : `<LienArcade>`, `<BoutonSon>`, `<DosDeBoite>`, `<EcranFin>`
  (REJOUER · ARCADE · PARTAGER), `<Rideau>`.
- **Son** : `useVolume()` (cookie sur `.tombp.fr`), `bruitages` (`clic`,
  `claque`, `cloche`, `verdict` — la cloche tombe à pic pour un village),
  `bus()`, `deverrouiller()`.
- **Catalogue** : Garoutom sera `TBP-012`. Pour apparaître dans l'arcade : une
  fiche dans `hub-mini-games/packages/arcade/src/fiches.ts`, le compte passé à
  12 dans `fiches.test.ts`, un motif `art` dessiné dans `CoverArt.tsx`, un
  `npm pack`, et la ligne dans `GAMES.md`. Tant que le jeu n'est pas jouable :
  `status: 'wip'`, `url: null`.

## Les règles du cadre commun

« Le cadre est commun, l'intérieur est libre. »

- Lien retour en haut à gauche (accueil, pause, fin, jamais pendant l'action),
  bouton son en haut à droite.
- Cibles ≥ 44 px, rien ne se coupe à 320 px de large, `prefers-reduced-motion`
  respecté, contrastes mesurés.
- Une identité par jeu : une matière, un lieu, une heure, une palette et des
  polices propres.
- Bruitages synthétisés en WebAudio, branchés sur `bus()`.
- Docs de dépôt : `docs/RULES.md` (règles numérotées R1…Rn, que les tests
  citent) et `docs/DECISIONS.md`.

## Ce qui n'existe pas encore

- **Un salon de discussion.** `mini-games-docs/IDEES.md` le note déjà : le
  loup-garou « ne fonctionne pas sans », et aucun jeu n'a eu à décider quoi
  faire des messages. C'est la grosse brique neuve de Garoutom.
- **Un système de skins.** Le plus proche : la bascule clair/sombre et les
  variantes de règles de Yamstom, les deux jeux de cartes de Belotom, les cinq
  langues de Motustom. Rien de mutualisé.
- `IDEES.md` listait le projet sous le nom de travail **Loupstom**. Le nom
  retenu est **Garoutom**.
