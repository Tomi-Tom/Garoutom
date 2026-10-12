/**
 * Mise en place des tests : les gravures chargées à la demande (vignettes,
 * frontispice du recueil, Shiganshina — `components/habit/traces-paresseuses.ts`)
 * sont chargées avant le premier test. Les rendus les lisent alors de façon
 * synchrone, comme l'app une fois ses préchargements faits. Le repli tant
 * qu'un module manque est vérifié à part (`lib/paresseux.test.tsx`).
 */
import { prechargerToutesLesTraces } from './components/habit/traces-paresseuses.js';

await prechargerToutesLesTraces();
