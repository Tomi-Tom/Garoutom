/**
 * Ce que tous les écrans de la nuit partagent : la peau du skin, la lune, la
 * tête de l'écran du rôle, le récapitulatif d'après le choix, l'accès replié
 * à un canal secret.
 *
 * Rien ici ne décide de ce qu'un siège a le droit de voir : la `GameView` l'a
 * déjà fait. Ces briques ne font que l'habiller, et chaque mot qui nomme une
 * mécanique passe par la voix du skin.
 */

import type { ChatChannel, RoleId } from '@garoutom/engine';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';

import { RESSORT_CARTE, RESSORT_PANNEAU } from '../../../anim/tokens.js';
import { useSkinId, useVoix } from '../../../lib/partie.js';
import { peauDuSkin, type Skin } from '../../../skins/registre.js';
import { SymboleRole } from '../../habit/Symbole.js';
import { Fil } from '../Fil.js';
import type { Teinte } from '../Place.js';

/** La table de textes entière du skin réglé — les prompts n'ont pas de méthode dans `Voix`. */
export function usePeau(): Skin {
  return peauDuSkin(useSkinId());
}

/** Chaque teinte de sélection, en variable de la maison. */
export const COULEUR: Record<Teinte, string> = {
  lanterne: 'var(--lanterne)',
  sang: 'var(--sang)',
  serment: 'var(--serment)',
  lune: 'var(--lune)',
};

/**
 * La lune gravée : un disque, deux cratères, un halo. Décorative — le numéro
 * de la nuit et la phrase disent tout ce qu'elle dit.
 */
export function Lune({ taille = 96, className }: { taille?: number; className?: string }) {
  const halo = useId();
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <radialGradient id={halo}>
          <stop offset="0.55" stopColor="var(--lune)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--lune)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${halo})`} />
      <circle cx="50" cy="50" r="27" fill="var(--papier)" opacity="0.92" />
      <circle cx="41" cy="44" r="5" fill="var(--lune)" opacity="0.5" />
      <circle cx="58" cy="58" r="3.5" fill="var(--lune)" opacity="0.45" />
      <circle cx="57" cy="40" r="2" fill="var(--lune)" opacity="0.4" />
    </svg>
  );
}

/**
 * La lune se lève sur **sa** carte : un rayon froid, le symbole du rôle, son
 * nom dans la voix du skin, puis la consigne. La teinte suit l'action — la
 * meute lit son écran au sang, Cupidon au serment, les autres à la lune.
 */
export function EnTeteRole({ role, texte, teinte }: { role: RoleId; texte: string; teinte: Teinte }) {
  const voix = useVoix();
  const couleur = COULEUR[teinte];
  return (
    <header className="relative flex flex-col items-center gap-3 pt-2 text-center">
      {/* Le rayon : un cône de lumière froide qui descend sur le symbole. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-48 w-56 -translate-x-1/2"
        style={{
          background: `radial-gradient(ellipse at top, color-mix(in srgb, ${couleur} 26%, transparent), transparent 70%)`,
        }}
      />
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={RESSORT_PANNEAU}
        className="relative flex flex-col items-center"
      >
        <Lune taille={64} className="-mb-6" />
        <span
          className="relative grid size-20 place-items-center rounded-full"
          style={{ background: 'var(--nuit-relief)', boxShadow: `0 0 0 1px ${couleur}, 0 0 28px -6px ${couleur}` }}
        >
          <SymboleRole role={role} taille={52} />
        </span>
      </motion.div>
      <h2 className="font-identite text-3xl leading-tight font-bold" style={{ color: couleur }}>
        {voix.nomRole(role)}
      </h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...RESSORT_CARTE, delay: 0.15 }}
        className="max-w-[34rem] text-base leading-relaxed"
      >
        {texte}
      </motion.p>
    </header>
  );
}

/**
 * Le récapitulatif d'un choix fait. `changeable` ne vaut que ce que le
 * moteur permet : à l'étape principale, une action renvoyée remplace la
 * précédente tant que l'étape court ; la Sorcière, seule en scène, clôt la
 * nuit en jouant — elle n'a plus qu'à se rendormir.
 */
export function Recap({
  children,
  changeable,
  onChanger,
}: {
  children: ReactNode;
  changeable: boolean;
  onChanger?: () => void;
}) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={RESSORT_CARTE}
      className="carte flex flex-col items-center gap-3 p-4 text-center"
    >
      <p className="text-base">{children}</p>
      <p className="text-sm" style={{ color: 'var(--papier-doux)' }}>
        {changeable ? 'Vous pouvez changer d’avis tant que la nuit court.' : 'Rendormez-vous.'}
      </p>
      {changeable && onChanger && (
        <button type="button" className="btn-voisin" onClick={onChanger}>
          Changer d’avis
        </button>
      )}
    </motion.div>
  );
}

/**
 * Un canal secret replié par défaut — le serment des amoureux surtout : « le
 * voisin du canapé ne doit lire “crois-moi” qu'à celui à qui c'est dit ».
 * Un geste l'ouvre, un geste le referme.
 */
export function CanalReplie({ canal, teinte }: { canal: ChatChannel; teinte: Teinte }) {
  const voix = useVoix();
  const [ouvert, setOuvert] = useState(false);
  const zone = useId();
  const couleur = COULEUR[teinte];
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={zone}
        onClick={() => setOuvert((v) => !v)}
        className="btn-voisin w-full justify-between gap-3"
        style={{ color: couleur }}
      >
        <span>{voix.libelleCanal(canal)}</span>
        <span aria-hidden="true">{ouvert ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            id={zone}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={RESSORT_CARTE}
            className="overflow-hidden"
          >
            <Fil mode="integre" canaux={[canal]} className="mt-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Les rôles du village qui ont un pouvoir à perdre quand l'Ancien emporte
 * ceux du village (R92, D13). La meute et le Loup Blanc ne perdent rien ; le
 * villageois n'avait rien ; l'Ancien est mort de cette mort-là.
 */
export const ROLES_A_POUVOIR: ReadonlySet<RoleId> = new Set<RoleId>([
  'voyante',
  'sorciere',
  'chasseur',
  'cupidon',
  'salvateur',
  'idiot',
  'corbeau',
  'bouc',
  'petiteFille',
]);

/** Ce siège vivant a-t-il perdu ses pouvoirs avec l'Ancien ? */
export function pouvoirsEteints(
  game: { pouvoirsPerdus: boolean; you: { role: RoleId; alive: boolean } | null },
): boolean {
  return game.pouvoirsPerdus && game.you !== null && game.you.alive && ROLES_A_POUVOIR.has(game.you.role);
}

/**
 * La mention sobre d'un pouvoir éteint. La perte est publique — l'annonce de
 * la rancune l'a dite à tous (R92) —, mais seul le siège concerné lit qu'elle
 * le touche : sa nuit sans consigne n'est pas un oubli.
 */
export function PouvoirsEteints({ className = '' }: { className?: string }) {
  const voix = useVoix();
  return (
    <p data-testid="pouvoirs-eteints" className={`text-sm italic ${className}`} style={{ color: 'var(--papier-doux)' }}>
      Vos pouvoirs se sont éteints avec {voix.nomRole('ancien')}.
    </p>
  );
}

/** Une petite pastille posée sur un jeton de la place. */
export function Pastille({ children, teinte }: { children: ReactNode; teinte: Teinte }) {
  return (
    <span
      className="inline-block max-w-full truncate rounded-full px-1.5 py-px text-[11px] leading-4 font-bold"
      style={{ background: 'var(--nuit-creux)', color: COULEUR[teinte], boxShadow: `inset 0 0 0 1px ${COULEUR[teinte]}` }}
    >
      {children}
    </span>
  );
}

/** Le gabarit d'un écran de rôle : une colonne, l'en-tête, puis l'action. */
export function GabaritRole({
  teinte,
  children,
  testId,
}: {
  teinte: Teinte;
  children: ReactNode;
  testId: string;
}) {
  return (
    <motion.section
      data-testid={testId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={RESSORT_PANNEAU}
      className="relative isolate mx-auto flex w-[min(44rem,100%)] flex-col gap-5 px-4 py-6"
    >
      {/* La meute teinte le village de sang ; les autres restent sous la lune. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem]"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${COULEUR[teinte]} ${teinte === 'sang' ? '18' : '8'}%, transparent), transparent 65%)`,
        }}
      />
      {children}
    </motion.section>
  );
}
