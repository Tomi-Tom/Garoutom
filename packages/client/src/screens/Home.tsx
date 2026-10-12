/**
 * L'accueil : le dos de la boîte, habillé de « Caprices ».
 *
 * La fiche TBP-012 vit dans le catalogue du hub — titre, pitch, statut, tout
 * vient de là et de nulle part ailleurs (`DosDeBoite`). Le jeu n'écrit que
 * ses commandes, et son décor : la frise du village en tête, le frontispice du
 * Caprice 43 (« Le sommeil de la raison engendre des loups ») dans sa cuvette,
 * puis un pseudo (sans autofocus : le clavier masquerait les boutons), le code
 * en quatre cases, et la barre au pouce — « Ouvrir une table » au-dessus de
 * « Rejoindre », ou l'inverse quand on arrive par un lien d'invitation.
 *
 * C'est ici qu'on apprend la règle du village — rien ne se joue à moins de
 * six — sans qu'un panneau n'ait à la répéter.
 *
 * Sur le bureau (≥ 1024), le frontispice passe en planche (640 × 720) à
 * gauche, et les commandes se rangent dans la colonne de droite.
 */

import { DosDeBoite } from '@tombp/arcade';
import { useId, useState, type ReactNode } from 'react';

import { Bouton, Cuvette, Frise } from '../components/caprices/index.js';
import { Frontispice } from '../components/habit/Frontispice.js';
import { useEstLarge } from '../components/useEstLarge.js';
import { CODE_LENGTH, codeDeLUrl, normaliseCode, ouvrirTable, rejoindreTable } from '../lib/actions.js';
import { ARCADE_ID, loadName, MAX_NAME_LENGTH } from '../lib/identity.js';
import { useVoix } from '../lib/partie.js';

/** La légende du Caprice 43, entre guillemets français et espaces insécables. */
function entreGuillemets(texte: string): string {
  return `« ${texte.replace(/^[«\s]+|[»\s]+$/g, '')} »`;
}

export function Home() {
  const [nom, setNom] = useState(loadName);
  // Un lien d’invitation (`?table=ABCD`) remplit le code d’avance : il ne
  // reste qu’à dire son nom.
  const [code, setCode] = useState(() => codeDeLUrl() ?? '');
  const invite = code.length === CODE_LENGTH && codeDeLUrl() === code;
  const [occupe, setOccupe] = useState(false);
  const large = useEstLarge();
  const voix = useVoix();
  const idRaison = useId();

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

  // Un bouton éteint dit pourquoi : la raison, reliée par `aria-describedby`.
  const raison = nomPropre === '' ? 'Écrivez d’abord votre pseudo.' : '';
  const decrit = raison === '' ? undefined : idRaison;

  const boutonOuvrir = (variante: 'primaire' | 'secondaire') => (
    <Bouton
      variante={variante}
      onClick={() => void ouvrir()}
      disabled={!pret}
      aria-describedby={pret ? undefined : decrit}
    >
      Ouvrir une table
    </Bouton>
  );
  const boutonRejoindre = (variante: 'primaire' | 'secondaire') => (
    <Bouton
      variante={variante}
      onClick={() => void rejoindre()}
      disabled={!rejoignable}
      aria-describedby={rejoignable ? undefined : decrit}
    >
      Rejoindre
    </Bouton>
  );

  const legende = (
    <p className="t-legende m-0 text-center" data-legende="accueil">
      {entreGuillemets(voix.legendeEcran('accueil'))}
    </p>
  );

  return (
    <div data-testid="accueil" className="flex h-full min-h-0 flex-col overflow-y-auto bg-fond text-encre">
      <Frise titre="Thiercelieux" />

      <div className="flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-[1400px] lg:grid-cols-[640px_minmax(0,1fr)] lg:items-start lg:gap-16 lg:px-8 lg:pt-8">
        {/* Le frontispice : bandeau sur le téléphone, planche sur le bureau. */}
        <div className="flex flex-col gap-3 px-4 pt-4 lg:p-0">
          <Cuvette className="overflow-hidden">
            <Frontispice format={large ? 'portrait' : 'bandeau'} motif="yeux" />
          </Cuvette>
          {legende}
        </div>

        <DosDeBoite id={ARCADE_ID} className="min-h-0! flex-1 lg:p-0!">
          <div className="flex w-full flex-col gap-4">
            <Champ
              id="pseudo"
              label="Votre pseudo"
              value={nom}
              onChange={setNom}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Jean-Mi"
              autoComplete="nickname"
              onEntree={() => void (invite ? rejoindre() : ouvrir())}
            />

            {large && boutonOuvrir('primaire')}

            <div className="flex flex-wrap items-end gap-4">
              <CodeEnCases
                id="code"
                label="Code de la table"
                value={code}
                onChange={(valeur) => setCode(normaliseCode(valeur))}
                onEntree={() => void rejoindre()}
              />
              {large && boutonRejoindre('secondaire')}
            </div>

            <p className="t-statut m-0">
              Une partie se tient à six joueurs au moins. Le code d'une table compte quatre lettres —
              celles qui ne se recopient pas en chiffre.
            </p>
            {raison !== '' && (
              <p id={idRaison} className="t-statut m-0">
                {raison}
              </p>
            )}
          </div>
        </DosDeBoite>
      </div>

      {/* La barre au pouce : collée en bas du téléphone, au-dessus de l'indicateur d'accueil. */}
      {!large && (
        <div
          role="group"
          aria-label="Votre action"
          className="barre-pouce sticky bottom-0 mt-4"
          style={{
            height: 'auto',
            gap: 4,
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {invite ? (
            <>
              {boutonRejoindre('primaire')}
              {boutonOuvrir('secondaire')}
            </>
          ) : (
            <>
              {boutonOuvrir('primaire')}
              {boutonRejoindre('secondaire')}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Un champ du recueil : l'étiquette au-dessus (`--t-rubrique`), un creux, un filet. */
function Champ({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete,
  onEntree,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder: string;
  maxLength?: number;
  autoComplete?: string;
  /** La touche Entrée valide le formulaire sans aller chercher le bouton. */
  onEntree?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="t-rubrique" style={{ color: 'var(--encre-2)' }}>
        {label}
      </label>
      {/* Pas d'`autoFocus` : le clavier masquerait les boutons (SPEC § 5.17).
          `text-base` et pas moins : sous seize pixels, Safari iOS zoome sur le
          champ à la mise au point et n'en revient pas. */}
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEntree) onEntree();
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="champ text-base"
      />
    </div>
  );
}

/**
 * Le code de table en quatre cases (SPEC § 5.17) : 56 × 64, une lettre par
 * case, un filet inférieur. Une seule vraie zone de saisie, posée sur les
 * cases — le collage se répartit tout seul, le clavier est celui du système,
 * le lecteur d'écran trouve un champ nommé. Les cases ne sont que le dessin
 * de ce qu'elle contient ; celle qui attend la prochaine lettre est soulignée
 * plus fort tant que le champ a le focus.
 */
function CodeEnCases({
  id,
  label,
  value,
  onChange,
  onEntree,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  onEntree?: () => void;
}) {
  const [focus, setFocus] = useState(false);
  const cases: ReactNode[] = [];
  for (let rang = 0; rang < CODE_LENGTH; rang += 1) {
    const courante = focus && rang === Math.min(value.length, CODE_LENGTH - 1);
    cases.push(
      <span
        key={rang}
        aria-hidden="true"
        data-case-code={rang}
        className="t-code flex items-center justify-center"
        style={{
          width: 56,
          height: 64,
          background: 'var(--creux)',
          borderBottom: `${courante ? 3 : 1.5}px solid var(--filet)`,
          letterSpacing: 0,
        }}
      >
        {value.charAt(rang)}
      </span>,
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="t-rubrique" style={{ color: 'var(--encre-2)' }}>
        {label}
      </label>
      <div
        className="relative flex gap-2 focus-within:outline-2 focus-within:outline-offset-4"
        style={{ width: CODE_LENGTH * 56 + (CODE_LENGTH - 1) * 8, outlineColor: 'var(--etat-focus, var(--encre))' }}
      >
        {cases}
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onEntree) onEntree();
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder=""
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={CODE_LENGTH * 4}
          aria-describedby={`${id}-aide`}
          // Transparent, pas translucide : le texte et le curseur sont dessinés
          // par les cases. `text-base` pour que iOS ne zoome pas.
          className="absolute inset-0 size-full bg-transparent text-base"
          style={{ border: 0, color: 'transparent', caretColor: 'transparent', outline: 'none' }}
        />
      </div>
      <span id={`${id}-aide`} className="sr-only">
        Quatre lettres.
      </span>
    </div>
  );
}
