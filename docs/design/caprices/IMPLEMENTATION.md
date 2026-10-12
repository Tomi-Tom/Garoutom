# Implémentation de « Caprices » dans le client — contrat entre les lots

Écrit le 12 octobre 2026 par le chef d'orchestre. La direction est validée
par le propriétaire : papier le jour, cuivre la nuit (réglage local
« Cuivre »), légende de la Petite Fille gardée. La **spécification** fait foi
(`SPEC.md`) ; les **maquettes** (`maquettes/*.dc.html`, et le canevas
https://claude.ai/artifact/KrdnJ3eixUU27HWVbpkfUL) sont la référence visuelle ;
les **tracés définitifs** viennent des générateurs (`generateurs/`) :

| Tracés | Source qui fait foi |
|---|---|
| 13 symboles de rôles (128 / 32 / 16), faces, dos, vignettes, frontispice | `generateurs/gen-C/roles.mjs`, `cartes.mjs`, `vignettes.mjs` |
| 18 couvre-chefs, 33 icônes d'interface, 11 glyphes d'état, cartouches, frise | `generateurs/lotF/traces.mjs`, `chefs.mjs`, `comp.mjs` |
| Matières (aquatinte, hachures, cuvette, papier, morsure, brunissage) | `textures.svg` + SPEC § 4 |

## Arbitrages du chef (font foi sur les maquettes)

1. Partie témoin : Clément meurt la **nuit I** ; l'aube II est paisible.
2. Au vote du jour, le jeton du joueur local n'est **pas choisissable**
   (état 15) — le moteur l'interdit déjà.
3. Les faces de cartes ont **toutes la même luminance moyenne** (± 3 %) : le
   loup se lit au trait mordu et à la sanguine, jamais à une masse plus
   sombre (loi N4 étendue à la révélation). Un test le vérifie sur les SVG.
4. L'option moteur `abandon` reçoit sa case au salon (« Mort d'abandon »,
   R101) — oubliée par le salon actuel.
5. Les quotas, la robustesse, le protocole : intouchés. Ce chantier est
   visuel et d'interaction ; aucun changement de moteur ni de serveur.

## Règles communes

- On ne touche qu'à ses fichiers ; un besoin ailleurs se signale.
- Les signatures marquées **figées** ne changent pas (on peut ajouter des
  props optionnelles).
- Aucune régression : les tests existants restent verts (on les adapte
  seulement quand ils vérifiaient l'ancien habillage, en le disant).
- Tests de rendu pour chaque composant nouveau ; tests de silhouette nuit
  (même arbre de zones et mêmes hauteurs pour dormeur, acteur, mort,
  amoureux) ; aucun identifiant moteur brut à l'écran.
- `npm run typecheck -w @garoutom/client` et `npm test -w @garoutom/client`
  verts à la fin de chaque lot. Pas de commit (le chef s'en charge).

## Vague 1 — les fondations (trois lots en parallèle)

### Lot V1-A — tokens, polices, matières, primitives (Opus)

Fichiers : `src/styles.css`, `src/main.tsx` (polices), `src/anim/tokens.ts`,
`src/skins/habits.ts`, `src/lib/reglages.ts` (+ réglage `tirage`),
`src/components/Reglages.tsx` (le choix « Le jour s'imprime sur : Papier ·
Cuivre »), nouveau dossier **`src/components/caprices/`** (primitives),
`package.json` du client (dépendances de polices).

Livre :
- Les tokens du SPEC § 3.10 (primitifs → sémantiques par **tirage** papier /
  cuivre → composants), `data-tirage` et `data-heure` posés sur la racine de
  l'app par un crochet `useTirage()` exporté ; Shiganshina § 8 ; rayons 0,
  aucune ombre ; `contraste.test.ts` qui verrouille les paires du § 3.4.
- Polices (§ 3.6) via `@fontsource` (IM Fell French Canon, Source Serif 4…),
  sous-ensembles latins ; `polices.test.ts` (IM Fell jamais dans un bouton,
  une consigne, un statut).
- **`<Matieres/>`** : le `<svg>` caché qui porte une seule fois les `<defs>`
  de `textures.svg` (identifiants inchangés), monté par `App`.
- **Primitives figées**, dans `src/components/caprices/` :

```tsx
// Gabarit.tsx — le gabarit unique du SPEC § 7.1 (mobile) et sa variante desktop.
export function Gabarit(props: {
  frise: ReactNode; minuterie: ReactNode; crieur: ReactNode; consigne: ReactNode;
  place: ReactNode; resume: ReactNode; pli: ReactNode; barre: ReactNode;
  colonne?: ReactNode;            // desktop : la colonne droite (fil / registre)
  filOuvert?: 'ferme' | 'tiers' | 'plein';
}): JSX.Element                   // les zones gardent leurs hauteurs même vides
// Cuvette.tsx — le cadre de planche (jour/nuit)
export function Cuvette(props: { children: ReactNode; numero?: string; className?: string }): JSX.Element
// Cartouche.tsx — les formes de camp (§ 5.3)
export type FormeCartouche = 'ecu' | 'mordu' | 'lacs' | 'bruni' | 'neutre' | 'seul';
export function Cartouche(props: { forme: FormeCartouche; children: ReactNode; taille?: 20 | 30 }): JSX.Element
// Bouton.tsx — les variantes du § 5.4 (dont l'armement en deux temps, 4 s)
export function Bouton(props: { variante: 'primaire' | 'secondaire' | 'discret' | 'danger';
  arme?: { libelle: string; onConfirmer: () => void }; icone?: NomIcone; /* + props de <button> */ }): JSX.Element
// AppuiLong.tsx — le geste du § 5.2/5.4 : visible tant que le pouce est posé,
// recaché au relâchement, à visibilitychange et après `dureeMs` (défaut 8000)
export function AppuiLong(props: { libelle: string; dureeMs?: number;
  onDebut: () => void; onFin: () => void; className?: string }): JSX.Element
// BarrePouce.tsx — la barre au pouce (§ 5.5) : primaire + secondaire, 48 px
export function BarrePouce(props: { children: ReactNode; raison?: string }): JSX.Element
// Pli.tsx — le pli (§ 5.14) : « Le village · 3 », « Le registre »…
export function Pli(props: { libelle: string; compte?: number; forme?: FormeCartouche; onOuvrir: () => void }): JSX.Element
// Frise.tsx — l'en-tête de partie (§ 5.7) jour / nuit, Thiercelieux / Mur
export function Frise(props: { titre: string; droite?: ReactNode; gauche?: ReactNode }): JSX.Element
```

### Lot V1-B — iconographie (Opus)

Fichiers : `src/components/habit/` (remplace `Symbole.tsx`, `CarteRole.tsx`,
`Decor.tsx` ; nouveaux `Icone.tsx`, `CouvreChef.tsx`, `Vignette.tsx`,
`Frontispice.tsx`, `glyphes.tsx`), et un script
`docs/design/caprices/generateurs/extraire.mjs` qui produit ces modules depuis
les générateurs (pour pouvoir les régénérer).

Livre, en composants React SVG au trait (`currentColor`), **tracés repris tels
quels des générateurs** :

```tsx
export function SymboleRole(props: { role: RoleId | null; taille?: 128 | 32 | 24 | 16; skin?: string; className?: string }): JSX.Element  // figée (existe)
export function CarteRole(props: { role: RoleId | null; retournee: boolean;
  taille?: 'petite' | 'moyenne' | 'grande'; tirage?: 'papier' | 'cuivre';
  avecDescription?: boolean; avecLegende?: boolean; morte?: boolean; onClic?: () => void; className?: string }): JSX.Element  // figée (existe, élargie)
export type NomIcone = 'menu' | 'carte' | 'regles' | 'reglages' | 'son' | 'quitter' | 'fil' | 'voter' | 'abstention' | 'viser' | 'vie' | 'mort' | 'bouclier' | 'oeil' | … ;   // les 33 du lot F
export function Icone(props: { nom: NomIcone; taille?: 24 | 44; className?: string }): JSX.Element
export function CouvreChef(props: { numero: number /* 1..18 */; taille?: 72 | 40; skin?: string }): JSX.Element
export function Vignette(props: { nom: string; taille?: 96 | 192 }): JSX.Element     // les 18 du récit
export function Frontispice(props: { format: 'bandeau' | 'portrait' }): JSX.Element
export function Glyphe(props: { nom: 'a-vote' | 'capitaine' | 'marque' | 'absent' | … }): JSX.Element
```
Test : la luminance moyenne des 13 faces est égale à ± 3 % (arbitrage 3).

### Lot V1-C — les légendes du skin (Sonnet)

Fichiers : `src/skins/{registre,thiercelieux,shiganshina}.ts`. Le skin gagne
`legendes` (`roles` × 13, `ecrans` × 15, `recit` × 19 — SPEC § 6.1, § 6.4,
§ 8) et `couvreChefs` (18 noms) ; `Voix` gagne `legendeRole(role)`,
`legendeEcran(cle)`, `legendeRecit(cle)` ; le registre en exige la complétude.

## Vague 2 — les écrans (après la vague 1)

| Lot | Fichiers | Écrans de référence |
|---|---|---|
| V2-A Table (Opus) | `screens/Partie.tsx`, `components/partie/{Place,Narrateur,Minuterie,EcranJour,Action}.tsx`, `place/*` | Jour-6/12/18, Cercle-12/18, Arme, Abstention, Election, Depouillement(+Desktop), Gracie, Bouc-Votants, Mort, Chasseur-*, Succession, Bouc-DernierMot, Etroit-320, Paysage, Scene-TV |
| V2-B Nuit (Opus) | `components/partie/Nuit.tsx`, `nuit/*` | Nuit-* (16 + 2 desktop) — gabarit unique au pixel, lois N1-N6 |
| V2-C Cartes (Opus) | `components/partie/{Revelation,Fin}.tsx`, `fin/*` | Revelation-*, MaCarte-*, Fin-* |
| V2-D Hors partie (Sonnet) | `screens/{Home,Salon}.tsx`, `components/{Regles,Panneau,Interrupteur}.tsx` | Accueil*, Salon*, Regles, Reglages |
| V2-E Fil et réseau (Sonnet) | `components/partie/{Fil.tsx,fil/*}`, `App.tsx` (bandeaux, avis) | Fil-Tiers, Fil-Plein, Meute-Fil, Journal, Menu-Table, Reseau-* |
