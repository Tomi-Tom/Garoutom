# Consigne commune — vague 2 (les écrans « Caprices » dans le client)

Tu refais des écrans du client React de Garoutom (`packages/client`) dans la
direction « Caprices », validée par le propriétaire. La vague 1 est livrée et
commitée : tokens, polices, matières, primitives, iconographie, légendes.

## À lire avant d'écrire

1. `docs/design/caprices/IMPLEMENTATION.md` — le contrat (arbitrages, lots,
   fichiers possédés). Ton lot est dans le tableau « Vague 2 ».
2. `docs/design/caprices/SPEC.md` — en entier : § 3.5 (lois de la nuit
   N1-N6), § 5 (composants et états), § 6.4 (légendes d'écran), § 7
   (gabarit unique, partie témoin), annexe anti-« IA ».
3. Les **maquettes** de tes écrans dans `docs/design/caprices/maquettes/`
   (`Caprices-*.dc.html`) : c'est la vérité visuelle. Reproduis-les dans
   React avec les primitives, pas en copiant leur HTML.
4. Ce qui existe : `src/components/caprices/` (Gabarit, Cuvette, Cartouche,
   Bouton, AppuiLong, BarrePouce, Pli, Frise, Matieres, useTirage — signatures
   dans `index.ts`), `src/components/habit/` (SymboleRole, CarteRole, Icone,
   CouvreChef, Vignette, Frontispice, Glyphe), `src/skins/registre.ts`
   (`useVoix()` : noms, phrases, `legendeRole/Ecran/Recit`, `nomCouvreChef`),
   `src/lib/{partie,store,actions,reglages}.ts`, et
   **`src/components/partie/zones.tsx`** : `useZonesCommunes()` rend la frise,
   la minuterie et le crieur — chaque écran de phase compose son propre
   `<Gabarit/>` avec ces trois zones (le lot V2-A en possède l'implémentation).
5. Le comportement actuel de tes écrans (leurs tests disent ce qui doit rester
   vrai : actions envoyées, règles, silence de la nuit, accessibilité).

## Règles

- Tu ne touches qu'aux fichiers de ton lot. Un besoin ailleurs : signale-le.
- Les comportements de jeu ne changent pas (mêmes actions moteur, mêmes
  garde-fous) — sauf ce que la spec impose : l'appui long pour voir sa carte
  (8 s, recache au relâchement et à `visibilitychange`), le savoir privé sous
  le pouce seulement, la confirmation en deux temps pour s'abstenir / ne viser
  personne / tirer en l'air, aucune opacité sur du texte.
- Aucun identifiant moteur brut à l'écran ; aucune icône de bibliothèque ;
  aucune couleur seule pour un camp (forme + mot) ; cibles ≥ 44, actions de
  jeu 48 collées en bas ; textes ≥ 12 px.
- Les tests existants restent verts : adapte-les quand ils vérifiaient
  l'ancien habillage, sans affaiblir ce qu'ils vérifient. Ajoute des tests de
  rendu pour ce qui est nouveau. Les alias de compatibilité de la vague 1
  (`.btn-village`, `RESSORT_*`, anciennes variables CSS) peuvent disparaître
  de TES fichiers ; ne les supprime pas des fichiers communs.
- Vérifie depuis `D:\TomArcade\Garoutom` : `npm run typecheck -w
  @garoutom/client` et `npm test -w @garoutom/client`. Des erreurs venant des
  lots parallèles ne sont pas les tiennes : signale-les.
- Contrôle visuel souhaité si tu as les outils Chrome (`mcp__claude-in-chrome__*`) :
  `npm run dev` n'est PAS lancé — ne le lance pas toi-même (les autres lots
  aussi le voudraient) ; à la place, écris des tests de rendu solides. Le chef
  fera la revue visuelle.
- Pas de commit (le chef s'en charge).

## Rapport final (court)

Fichiers modifiés et créés, écarts aux maquettes et pourquoi, ce que tu
attends des autres lots, état typecheck et tests.
