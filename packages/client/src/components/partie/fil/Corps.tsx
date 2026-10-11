/**
 * Le corps du fil : onglets, journal des messages, saisie. Les trois modes
 * (colonne, tiroir, intégré) ne diffèrent que par l'enveloppe qui le porte.
 */
import { useLayoutEffect, useRef, useState } from 'react';

import type { ChatChannel, ChatMessage, GameView } from '@garoutom/engine';

import { jouer } from '../../../lib/actions.js';
import { useNoms, useVoix } from '../../../lib/partie.js';
import { useStore } from '../../../lib/store.js';
import {
  compterNonLus,
  LIMITE_MESSAGE,
  messagesDuCanal,
  ordonner,
  raisonSilence,
  SEUIL_COMPTEUR,
  TEINTE_CANAL,
} from './logique.js';

interface CorpsProps {
  game: GameView;
  onglets: readonly ChatChannel[];
  actif: ChatChannel;
  onChoisir: (canal: ChatChannel) => void;
  /** Dernier numéro vu par canal ; sert aux badges des onglets. */
  vus: Partial<Record<ChatChannel, number>>;
  /** Préfixe des identifiants (plusieurs fils peuvent coexister). */
  idPrefix: string;
}

export function Corps({ game, onglets, actif, onChoisir, vus, idPrefix }: CorpsProps) {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Canaux de discussion"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--arcade-trait)] px-2 pt-2"
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
              style={{
                borderBottomColor: selectionne ? TEINTE_CANAL[canal] : 'transparent',
                color: selectionne ? TEINTE_CANAL[canal] : undefined,
              }}
              className="flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm text-[var(--papier-doux)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--lune)]"
            >
              {voix.libelleCanal(canal)}
              {nonLus > 0 && (
                <span
                  data-testid={`non-lus-${canal}`}
                  aria-label={`${String(nonLus)} non lus`}
                  className="rounded-full px-1.5 text-xs font-semibold text-[var(--nuit-creux)]"
                  style={{ background: TEINTE_CANAL[canal] }}
                >
                  {nonLus > 99 ? '99+' : nonLus}
                </span>
              )}
            </button>
          );
        })}
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
          className="min-h-0 flex-1 overflow-y-auto px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--lune)]"
          style={{ borderLeft: `3px solid ${teinte}` }}
        >
          {lignes.length === 0 && (
            <p className="py-4 text-center text-sm italic text-[var(--papier-doux)]">
              {actif === 'village' && !game.options.chat
                ? raisonSilence(game, 'village')
                : 'Rien n’a encore été dit.'}
            </p>
          )}
          {lignes.map((ligne) =>
            ligne.type === 'separateur' ? (
              <p
                key={ligne.cle}
                className="my-2 text-center font-identite text-xs uppercase tracking-widest text-[var(--papier-doux)]"
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
          <button
            type="button"
            onClick={descendre}
            className="btn-voisin absolute bottom-1 left-1/2 min-h-11 -translate-x-1/2 px-3 text-sm shadow-lg"
          >
            nouveaux messages ↓
          </button>
        )}
      </div>

      {peutEcrire ? (
        <Saisie canal={actif} teinte={teinte} />
      ) : (
        <p
          data-testid="silence"
          className="shrink-0 border-t border-[var(--arcade-trait)] px-3 py-3 text-sm italic text-[var(--papier-doux)]"
        >
          {raisonSilence(game, actif)}
        </p>
      )}
    </div>
  );
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
  const teinte = TEINTE_CANAL[canal];
  return (
    <div className={`my-2 flex flex-col ${mien ? 'items-end' : 'items-start'}`} data-seat={seat}>
      <span
        className="mb-0.5 font-identite text-sm"
        style={{ color: mien ? teinte : 'var(--papier-doux)' }}
      >
        {mien ? 'Vous' : pseudo}
      </span>
      {messages.map((message) => (
        <p
          key={message.id}
          className={`mb-1 max-w-[88%] break-words rounded-xl px-3 py-1.5 text-[0.95rem] leading-snug ${
            spectral ? 'italic opacity-80' : ''
          }`}
          style={{
            background: mien
              ? `color-mix(in srgb, ${teinte} 22%, var(--nuit-creux))`
              : 'var(--nuit-creux)',
            border: `1px solid color-mix(in srgb, ${teinte} ${mien ? 55 : 25}%, transparent)`,
            color: 'var(--papier)',
            ...(spectral ? { textShadow: '0 0 8px color-mix(in srgb, var(--lune) 45%, transparent)' } : {}),
          }}
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
function Saisie({ canal, teinte }: { canal: ChatChannel; teinte: string }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const propre = texte.replace(/\s+/g, ' ').trim();
  const valide = propre.length > 0 && propre.length <= LIMITE_MESSAGE && !envoi;

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
      className="flex shrink-0 items-end gap-2 border-t border-[var(--arcade-trait)] p-2"
      onSubmit={(event) => {
        event.preventDefault();
        void envoyer();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <input
          className="champ min-h-11 w-full"
          aria-label="Votre message"
          maxLength={LIMITE_MESSAGE * 2}
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          autoComplete="off"
          enterKeyHint="send"
          style={{ borderColor: `color-mix(in srgb, ${teinte} 50%, var(--arcade-trait))` }}
        />
        {propre.length >= SEUIL_COMPTEUR && (
          <span
            className={`pointer-events-none absolute -top-5 right-1 font-mono text-xs ${
              propre.length > LIMITE_MESSAGE ? 'text-[var(--sang)]' : 'text-[var(--papier-doux)]'
            }`}
            aria-label={`${String(propre.length)} caractères sur ${String(LIMITE_MESSAGE)}`}
          >
            {propre.length}/{LIMITE_MESSAGE}
          </span>
        )}
      </div>
      <button type="submit" className="btn-village min-h-11 shrink-0 px-4" disabled={!valide}>
        Envoyer
      </button>
    </form>
  );
}
