/**
 * L'accueil : le dos de la boîte, gabarit commun de la collection.
 *
 * La fiche TBP-012 vit dans le catalogue du hub — titre, pitch, statut, tout
 * vient de là et de nulle part ailleurs. Le jeu n'écrit que ses commandes :
 * un pseudo, une table à ouvrir, un code à rejoindre. C'est ici qu'on
 * apprend la règle du village — rien ne se joue à moins de six — sans qu'un
 * panneau n'ait à la répéter.
 */

import { DosDeBoite } from '@tombp/arcade';
import { motion } from 'motion/react';
import { useState } from 'react';

import { RESSORT_PANNEAU } from '../anim/tokens.js';
import { CODE_LENGTH, codeDeLUrl, normaliseCode, ouvrirTable, rejoindreTable } from '../lib/actions.js';
import { ARCADE_ID, loadName, MAX_NAME_LENGTH } from '../lib/identity.js';

export function Home() {
  const [nom, setNom] = useState(loadName);
  // Un lien d’invitation (`?table=ABCD`) remplit le code d’avance : il ne
  // reste qu’à dire son nom.
  const [code, setCode] = useState(() => codeDeLUrl() ?? '');
  const invite = code.length === CODE_LENGTH && codeDeLUrl() === code;
  const [occupe, setOccupe] = useState(false);

  const nomPropre = nom.trim();
  const pret = nomPropre !== '' && !occupe;
  const rejoignable = pret && code.length === CODE_LENGTH;

  // Les actions signalent elles-mêmes leurs échecs au joueur : jamais
  // d'alerte, jamais de fenêtre modale — un avis, qui s'efface de lui-même.
  const ouvrir = async () => {
    if (!pret) return;
    setOccupe(true);
    await ouvrirTable(nomPropre);
    setOccupe(false);
  };

  const rejoindre = async () => {
    if (!rejoignable) return;
    setOccupe(true);
    await rejoindreTable(code, nomPropre);
    setOccupe(false);
  };

  return (
    <DosDeBoite id={ARCADE_ID}>
      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={RESSORT_PANNEAU}
        className="grid w-full gap-4"
      >
        <Champ
          id="pseudo"
          label="Votre pseudo"
          value={nom}
          onChange={setNom}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Jean-Mi"
          onEntree={() => void (invite ? rejoindre() : ouvrir())}
          autoFocus
        />

        <button
          type="button"
          onClick={() => void ouvrir()}
          disabled={!pret}
          className={invite ? 'btn-voisin px-5 text-base' : 'btn-village px-5 text-base'}
        >
          Ouvrir une table
        </button>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-[9rem]">
            <Champ
              id="code"
              label="Code de la table"
              value={code}
              onChange={(valeur) => setCode(normaliseCode(valeur))}
              placeholder="ABCD"
              mono
              onEntree={() => void rejoindre()}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            onClick={() => void rejoindre()}
            disabled={!rejoignable}
            className={invite ? 'btn-village shrink-0' : 'btn-voisin shrink-0'}
          >
            Rejoindre
          </button>
        </div>

        <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--lune)' }}>
          Une partie se tient à six joueurs au moins. Le code d'une table compte quatre
          lettres — celles qui ne se recopient pas en chiffre.
        </p>
      </motion.div>
    </DosDeBoite>
  );
}

/** Un champ du village : étiquette au-dessus, creux de nuit en dessous. */
function Champ({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  mono = false,
  autoFocus = false,
  autoComplete,
  spellCheck,
  onEntree,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder: string;
  maxLength?: number;
  /** Les codes et les comptes se lisent en chiffres à chasse fixe. */
  mono?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  spellCheck?: boolean;
  /** La touche Entrée valide le formulaire sans aller chercher le bouton. */
  onEntree?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold tracking-[0.12em] uppercase"
        style={{ color: 'var(--papier-doux)' }}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEntree) onEntree();
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        /* `text-base` et pas `text-sm` : sous seize pixels, Safari iOS zoome
           sur le champ à la mise au point et n'en revient pas. */
        className={`champ px-3.5 py-3 text-base ${mono ? 'font-mono text-center text-2xl font-bold tracking-[0.22em]' : ''}`}
      />
    </div>
  );
}
