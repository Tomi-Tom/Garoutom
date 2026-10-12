# Garoutom

Les loups-garous de Thiercelieux, en ligne, de 6 à 18 joueurs. Un village, des
nuits où l'on se méfie, des jours où l'on accuse. Le douzième jeu de l'arcade
[TOMBP INTERACTIVE](https://arcade.tombp.fr).

Le village n'est qu'un décor parmi d'autres. Garoutom est pensé dès le départ
pour accueillir des **skins** : le même jeu, les mêmes règles, un autre univers.
Thiercelieux devient Shiganshina, les loups deviennent des Titans cachés parmi
les habitants, et la Voyante, la Sorcière ou le Chasseur prennent les traits de
personnages de cet univers.

## Où on en est

**Le moteur est écrit et testé, le chantier se visite.** Les règles pures,
les vues secrètes et le contrat réseau vivent dans `packages/engine`, couverts
par leurs tests. Le client ouvre le bal : l'accueil existe, sur le dos de
boîte commun de la collection, et la table viendra avec le serveur. Les
références, la direction artistique et le système de skins se fixent dans
[`docs/`](docs/README.md) ; les décisions se prennent — et se gardent — dans
[`DECISIONS.md`](docs/DECISIONS.md).

## Jouer

Node ≥ 20, puis `npm install` une fois à la racine. Trois façons d'ouvrir la
table, de la plus intime à la plus large.

### En local, pour développer

```sh
npm run dev
```

Le serveur tient le canal sur le port 3004, Vite sert la page sur
[localhost:5177](http://localhost:5177) et relaie `/ws` jusqu'au serveur. Vite
écoute aussi sur le réseau : un téléphone du même Wi-Fi ouvre l'adresse
« Network » qu'il affiche.

#### Tester seul : les robots

Il faut six joueurs pour lancer une partie. Ouvrez une table dans le
navigateur, notez son code, puis faites asseoir des robots — de simples
clients WebSocket qui jouent des coups légaux au hasard depuis leur propre
vue, sans aucun privilège :

```sh
npm run robots -- ABCD 5              # 5 robots rejoignent la table ABCD
npm run robots -- ABCD 7 --bavards    # …et papotent dans les canaux
npm run robots -- --creer 8 --lancer --vitesse rapide   # une partie entre robots
```

Options : `--vitesse lent|normal|rapide`, `--delai-max-ms N`, `--bavards`,
`--rejouer` (l'hôte robot relance une revanche), `--sortir` (partir à la
fin), `--url ws://hote:port/ws`. Ctrl+C fait quitter la table proprement.

### Entre amis, sur le même réseau

```sh
npm run serve
```

Construit le client, puis lance le serveur, qui sert **tout sur un seul
port** : la page, ses fichiers et le canal. Au démarrage, il annonce ses
adresses :

```
Garoutom est ouvert. Jouez sur :
  http://localhost:3004
Et pour les amis du même réseau :
  http://192.168.1.107:3004
```

Les amis ouvrent la seconde adresse dans leur navigateur, et c'est tout. Au
premier lancement, Windows demande s'il faut laisser Node accepter les
connexions : autoriser les **réseaux privés**. Réglages par l'environnement :
`PORT` (3004), `HOST` (`0.0.0.0` ; `127.0.0.1` ferme la porte aux voisins).
Une fois le client construit, `npm start` suffit pour relancer.

#### Les parties survivent au redémarrage

Les tables sont écrites sur disque (`.garoutom-data/tables.json`, à la racine
du dépôt, ignoré par git) quelques instants après chaque changement. Relancez
le serveur — mise à jour, plantage, coupure — et chaque joueur qui rouvre la
page reprend son siège, au même point de la partie. Le fichier contient les
jetons de reconnexion des joueurs : ne le partagez pas. Une écriture coupée
net n'abîme rien (fichier écrit à côté puis renommé, copie `tables.json.bak`
gardée).

**Arrêtez le serveur proprement** : Ctrl+C (ou Ctrl+Pause) dans sa console.
Il prévient les joueurs (« Le serveur redémarre, reprise automatique »), vide
ses écritures, ferme les connexions et sort en moins de 3 secondes ; leurs
pages se reconnectent seules dès qu'il revient. Un second Ctrl+C sort sur-le-
champ. Fermer la fenêtre d'un coup ou tuer le processus marche aussi, mais
peut perdre les toutes dernières secondes de la partie. `npm run dev` ne
garde rien sur disque.

`GET /health` répond l'état du serveur : version, protocole, tables par statut,
connexions, et si la persistance est active.

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT`, `HOST` | port et interface d'écoute | `3004`, `0.0.0.0` |
| `GAROUTOM_DATA` | dossier de sauvegarde ; `off` pour ne rien écrire | `.garoutom-data/` (rien avec `npm run dev`) |
| `GAROUTOM_ORIGINES` | sites autorisés à ouvrir le canal, en plus de l'adresse servie (liste, virgules) | adresse de la page seulement |
| `GAROUTOM_PROXY=1` | croire `x-forwarded-for` (serveur derrière un proxy de confiance) | non |
| `GAROUTOM_CLIENT` | dossier du client buildé | `packages/client/dist` |

### En ligne

La page vit sur Vercel, le canal dans un Worker Cloudflare (un Durable Object
qui porte toutes les tables, sans plafond de durée — voir
[`DECISIONS.md`](docs/DECISIONS.md), D5, et `packages/worker/src/tables.ts`).
Rien n'est déployé tant que Tom ne le fait pas :

1. **Le Worker.** `npx wrangler login` une fois, puis `npm run worker:deploy`.
   Wrangler affiche l'adresse du Worker, par exemple
   `https://garoutom.<compte>.workers.dev` ; `…/health` doit répondre
   `{"ok":true,…}`.
2. **Le client.** Dans le projet Vercel, poser la variable d'environnement
   `VITE_CHANNEL_URL=wss://garoutom.<compte>.workers.dev/ws`, puis redéployer :
   elle est lue au build. Sans elle, le client chercherait le canal sur
   Vercel, qui ne l'a pas.
3. **Facultatif.** Restreindre les pages admises à ouvrir le canal :
   décommenter `ORIGINES` dans `packages/worker/wrangler.toml` et redéployer
   le Worker.

Pour éprouver le Worker avant de le déployer : `npm run worker:dev` (Wrangler
en local, port 8787), et dans un autre terminal
`VITE_CHANNEL_URL=ws://localhost:8787/ws npm run dev:client`.

### Les scripts

| Script | Ce qu'il fait |
|---|---|
| `npm run dev` | Serveur de canal (3004) + Vite (5177) avec relais `/ws` |
| `npm run build` | Construit le moteur puis le client (`packages/client/dist`) |
| `npm start` | Serveur Node : client construit + canal `/ws` + `/health`, un seul port |
| `npm run serve` | `build` puis `start` — la soirée entre amis en une commande |
| `npm test` | Tous les tests : moteur, serveur, client, Worker |
| `npm run typecheck` | Le typage des quatre paquets |
| `npm run worker:dev` | Le Worker Cloudflare en local (Wrangler) |
| `npm run worker:deploy` | Déploie le Worker (après `wrangler login`) |

## Liens

- **En ligne :** l'accueil du chantier sur
  [garoutom.tombp.fr](https://garoutom.tombp.fr) — la table ouvrira plus tard
- **Collection :** [`hub-mini-games`](https://github.com/Tomi-Tom/hub-mini-games)
