/**
 * Le corps du fil (SPEC § 5.10) : onglets en cartouches, journal des messages,
 * saisie. Les trois modes (colonne, tiroir, intégré) ne diffèrent que par
 * l'enveloppe qui le porte.
 *
 * Les canaux se distinguent par la forme, le mot et la teinte, dans cet ordre :
 * écu (le village), mordu (la meute), lacs (le serment), pointillé (l'au-delà)
 * — en onglet comme en filet de marge. Pas de bulle, pas d'avatar, pas
 * d'heure : un registre, pas une messagerie. La meute, la nuit, n'a pas de
 * surface : sa craie ne paraît qu'en texte et en trait fin (loi N2).
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import type { ChatChannel, ChatMessage, GameView } from '@garoutom/engine';

import { jouer } from '../../../lib/actions.js';
import { useNoms, useVoix } from '../../../lib/partie.js';
import { useStore } from '../../../lib/store.js';
import { Bouton } from '../../caprices/Bouton.js';
import { Cartouche } from '../../caprices/Cartouche.js';
import {
  compterNonLus,
  FILET_CANAL,
  FORME_CANAL,
  indicationSaisie,
  LIMITE_MESSAGE,
  messagesDuCanal,
  ordonner,
  raisonSilence,
  SEUIL_COMPTEUR,
  TEINTE_CANAL,
  type FiletCanal,
} from './logique.js';

interface CorpsProps {
  game: GameView;
  onglets: readonly ChatChannel[];
  actif: ChatChannel;
  onChoisir: (canal: ChatChannel) => void;
  /** Dernier numéro vu par canal ; sert aux compteurs des onglets. */
  vus: Partial<Record<ChatChannel, number>>;
  /** Préfixe des identifiants (plusieurs fils peuvent coexister). */
  idPrefix: string;
  /** La ligne de résumé du vote, épinglée au-dessus des onglets (plein écran, colonne). */
  resume?: ReactNode;
  /** Les outils au bout de la rangée d'onglets (plein écran, refermer). */
  outils?: ReactNode;
}

export function Corps({ game, onglets, actif, onChoisir, vus, idPrefix, resume, outils }: CorpsProps) {
  const voix = useVoix();
  const nom = useNoms();
  const moi = game.you?.seat ?? null;
  const messages = messagesDuCanal(game, actif);
  const lignes = ordonner(messages);
  const teinte = TEINTE_CANAL[actif];

  /* Défilement : collé en bas tant que le lecteur n'a pas remonté. */
  const journal = useRef<HTMLDivElement>(null);
  const colle = useRef(true);
  const [nouveaux, setNouveaux] = useState(false);
  const dernier = messages[messages.length - 1]?.id ?? -1;

  // Un onglet qu'on quitte ne garde pas son défilement : on repart du bas.
  useLayoutEffect(() => {
    colle.current = true;
    setNouveaux(false);
  }, [actif]);

  useLayoutEffect(() => {
    const el = journal.current;
    if (el === null) return;
    if (colle.current) el.scrollTop = el.scrollHeight;
    else setNouveaux(true);
  }, [dernier, actif]);

  function auDefilement() {
    const el = journal.current;
    if (el === null) return;
    colle.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (colle.current) setNouveaux(false);
  }

  function descendre() {
    const el = journal.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
    colle.current = true;
    setNouveaux(false);
  }

  const peutEcrire = game.channels.includes(actif);
  const idPanneau = `${idPrefix}-panneau`;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-canal-actif={actif}>
      {resume !== undefined && resume !== null && (
        <div data-testid="fil-resume" className="t-statut shrink-0 border-b border-[var(--filet-doux)] px-4 py-2">
          {resume}
        </div>
      )}

      <div className="flex shrink-0 items-stretch border-b border-[var(--filet-doux)]">
        <div
          role="tablist"
          aria-label="Canaux de discussion"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-3"
        >
          {onglets.map((canal) => {
            const selectionne = canal === actif;
            const nonLus = selectionne ? 0 : compterNonLus(game, canal, vus[canal] ?? -1);
            return (
              <button
                key={canal}
                type="button"
                role="tab"
                id={`${idPrefix}-onglet-${canal}`}
                aria-selected={selectionne}
                aria-controls={idPanneau}
                tabIndex={selectionne ? 0 : -1}
                data-canal={canal}
                data-forme={FORME_CANAL[canal]}
                onClick={() => onChoisir(canal)}
                onKeyDown={(event) => {
                  const i = onglets.indexOf(canal);
                  const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                  if (delta === 0) return;
                  event.preventDefault();
                  const cible = onglets[(i + delta + onglets.length) % onglets.length];
                  if (cible !== undefined) {
                    onChoisir(cible);
                    document.getElementById(`${idPrefix}-onglet-${cible}`)?.focus();
                  }
                }}
                className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[var(--encre)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--encre)]"
              >
                <Cartouche
                  forme={FORME_CANAL[canal]}
                  taille={30}
                  className={
                    selectionne ? '[--cartouche-fond:var(--encre)] [--cartouche-texte:var(--sur-encre)]' : undefined
                  }
                >
                  {voix.libelleCanal(canal)}
                </Cartouche>
                {nonLus > 0 && (
                  <span
                    data-testid={`non-lus-${canal}`}
                    aria-label={`${String(nonLus)} non lus`}
                    className="t-chiffre"
                  >
                    {nonLus > 99 ? '99+' : nonLus}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {outils}
      </div>

      <div
        role="tabpanel"
        id={idPanneau}
        aria-labelledby={`${idPrefix}-onglet-${actif}`}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <div
          ref={journal}
          role="log"
          aria-live="off"
          aria-label={voix.libelleCanal(actif)}
          tabIndex={0}
          onScroll={auDefilement}
          data-canal={actif}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--encre)]"
        >
          {lignes.length === 0 && (
            <p className="t-statut py-4 text-center italic">
              {actif === 'village' && !game.options.chat
                ? raisonSilence(game, 'village')
                : 'Rien n’a encore été dit.'}
            </p>
          )}
          {lignes.map((ligne) =>
            ligne.type === 'separateur' ? (
              <p
                key={ligne.cle}
                data-separateur=""
                className="t-rubrique my-2 border-b-[0.75px] border-[var(--filet)] pb-1 text-[var(--encre-2)]"
              >
                {actif === 'loups' ? 'Nuit' : 'Jour'} {ligne.jour}
              </p>
            ) : (
              <Groupe
                key={ligne.cle}
                seat={ligne.seat}
                messages={ligne.messages}
                canal={actif}
                mien={ligne.seat === moi}
                pseudo={nom(ligne.seat)}
              />
            ),
          )}
        </div>

        {nouveaux && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
            <Bouton variante="secondaire" className="pointer-events-auto" onClick={descendre}>
              nouveaux messages ↓
            </Bouton>
          </div>
        )}
      </div>

      {peutEcrire ? (
        <Saisie canal={actif} teinte={teinte} indication={indicationSaisie(actif, voix.libelleCanal(actif))} />
      ) : (
        <p
          data-testid="silence"
          className="t-statut shrink-0 border-t border-[var(--filet-doux)] px-4 py-3 italic"
        >
          {raisonSilence(game, actif)}
        </p>
      )}
    </div>
  );
}

/** Le filet de marge d'un message : un trait dont la forme dit le canal. */
export function Filet({ canal }: { canal: ChatChannel }) {
  const forme: FiletCanal = FILET_CANAL[canal];
  const c = TEINTE_CANAL[canal];
  const base: CSSProperties = { position: 'absolute', left: 0, top: 0, bottom: 0 };
  const style: CSSProperties =
    forme === 'droit'
      ? { ...base, width: 1, background: c }
      : forme === 'dentele'
        ? {
            ...base,
            width: 4,
            background: c,
            // Un zigzag de 4 px, à la pointe : le trait mordu de la meute.
            maskImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'8\'%3E%3Cpath d=\'M1 0 L3 4 L1 8\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'/%3E%3C/svg%3E")',
            maskSize: '4px 8px',
            maskRepeat: 'repeat-y',
          }
        : forme === 'double'
          ? { ...base, width: 3, background: `linear-gradient(to right, ${c} 0 1px, transparent 1px 2px, ${c} 2px 3px)` }
          : {
              ...base,
              width: 1,
              background: `repeating-linear-gradient(to bottom, ${c} 0 1.5px, transparent 1.5px 4.5px)`,
            };
  return <span aria-hidden="true" data-filet={forme} style={style} />;
}

function Groupe({
  seat,
  messages,
  canal,
  mien,
  pseudo,
}: {
  seat: number;
  messages: ChatMessage[];
  canal: ChatChannel;
  mien: boolean;
  pseudo: string;
}) {
  const spectral = canal === 'morts';
  const meute = canal === 'loups';
  return (
    <div className="relative my-2.5 pl-3.5" data-seat={seat} data-groupe="">
      <Filet canal={canal} />
      <span
        className={mien ? 't-rubrique block' : 't-nom block'}
        style={{
          color: mien || canal === 'village' ? 'var(--encre)' : TEINTE_CANAL[canal],
          fontWeight: !mien && meute ? 600 : undefined,
        }}
      >
        {mien ? 'vous' : pseudo}
      </span>
      {messages.map((message) => (
        <p
          key={message.id}
          className={`t-corps mt-0.5 break-words ${spectral ? 'italic' : ''}`}
          style={{ color: spectral ? 'var(--encre-2)' : 'var(--encre)' }}
        >
          {message.text}
        </p>
      ))}
    </div>
  );
}

/**
 * La saisie. Choix sur l'échec : le champ n'est vidé qu'à l'accusé, et
 * seulement si aucun avis d'erreur n'est apparu entre-temps (le refus du
 * serveur arrive en avis, voir lib/actions). Ainsi un message refusé reste
 * dans le champ, prêt à être corrigé ; `envoi` empêche de partir deux fois.
 */
function Saisie({ canal, teinte, indication }: { canal: ChatChannel; teinte: string; indication: string }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const propre = texte.replace(/\s+/g, ' ').trim();
  const trop = propre.length > LIMITE_MESSAGE;
  const valide = propre.length > 0 && !trop && !envoi;

  async function envoyer() {
    if (!valide) return;
    const avant = useStore.getState().notices.at(-1)?.id ?? 0;
    const envoye = texte;
    setEnvoi(true);
    await jouer({ type: 'dire', channel: canal, text: propre });
    setEnvoi(false);
    const refus = useStore.getState().notices.some((n) => n.id > avant && n.tone === 'error');
    if (!refus) setTexte((actuel) => (actuel === envoye ? '' : actuel));
  }

  return (
    <form
      className="flex shrink-0 items-end gap-2 border-t border-[var(--filet-doux)] px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        void envoyer();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <input
          className="champ"
          aria-label="Votre message"
          placeholder={indication}
          maxLength={LIMITE_MESSAGE * 2}
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          autoComplete="off"
          enterKeyHint="send"
          data-canal={canal}
          style={{ borderBottomColor: teinte }}
        />
        {propre.length >= SEUIL_COMPTEUR && (
          <span
            className="t-chiffre pointer-events-none absolute -top-5 right-1"
            style={{ textDecoration: trop ? 'underline' : undefined, fontWeight: trop ? 700 : undefined }}
            aria-label={`${String(propre.length)} caractères sur ${String(LIMITE_MESSAGE)}`}
          >
            {propre.length}/{LIMITE_MESSAGE}
          </span>
        )}
      </div>
      <Bouton variante="primaire" type="submit" icone="envoyer" disabled={!valide}>
        Envoyer
      </Bouton>
    </form>
  );
}
