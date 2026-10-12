/**
 * Le menu de la table (SPEC § 5.7, § 5.12) : un bouton « … » de 44 px dans
 * la frise — les trois traits de burin du § 6.3, jamais trois points — qui
 * ouvre une feuille basse : le code de la table, les règles, les réglages,
 * le registre, et quitter.
 *
 * Quitter est irréversible : « Quitter » demande « Quitter la table ? »,
 * puis « Oui, quitter » s'arme (deux temps, 4 s) à côté de « Rester ».
 *
 * Les panneaux des règles et des réglages vivent dans leurs boutons : ils
 * s'ouvrent par-dessus la feuille, et se referment pour y revenir.
 */

import { useState } from 'react';

import { Bouton } from '../../caprices/Bouton.js';
import { BoutonReglages } from '../../Reglages.js';
import { BoutonRegles } from '../../Regles.js';
import { quitterTable } from '../../../lib/actions.js';
import { useGame } from '../../../lib/partie.js';
import { FeuilleBasse } from '../fil/FeuilleBasse.js';
import { Registre } from '../Registre.js';

function Quitter() {
  const [confirmer, setConfirmer] = useState(false);
  if (!confirmer) {
    return (
      <Bouton variante="secondaire" icone="quitter" onClick={() => setConfirmer(true)}>
        Quitter
      </Bouton>
    );
  }
  return (
    <div role="group" aria-label="Quitter la table ?" className="flex flex-col gap-2">
      <p className="t-statut m-0">Quitter la table ?</p>
      <div className="flex gap-2">
        <Bouton variante="secondaire" onClick={() => setConfirmer(false)} autoFocus>
          Rester
        </Bouton>
        <Bouton
          variante="danger"
          className="flex-1"
          arme={{ libelle: 'Confirmer : quitter la table', onConfirmer: () => void quitterTable() }}
        >
          Oui, quitter
        </Bouton>
      </div>
    </div>
  );
}

export function MenuTable({ code, titre }: { code: string; titre: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [registre, setRegistre] = useState(false);
  const game = useGame();
  const sieges = game?.players.length ?? 0;

  return (
    <>
      <Bouton
        variante="outil"
        icone="menu"
        aria-label="Menu de la table"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls="menu-table"
        onClick={() => setOuvert(true)}
        className="shrink-0"
      />
      {ouvert && (
        <FeuilleBasse titre={`Table ${code}`} onFermer={() => setOuvert(false)}>
          <div id="menu-table" data-testid="menu-table" className="flex flex-col gap-3 pb-4">
            {sieges > 0 && (
              <p className="t-statut m-0">
                {String(sieges)} sièges · {titre}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <BoutonRegles />
              <span className="t-statut">Règles</span>
              <BoutonReglages />
              <span className="t-statut">Réglages</span>
            </div>
            <Bouton variante="secondaire" icone="registre" onClick={() => setRegistre(true)}>
              Le registre
            </Bouton>
            <Quitter />
          </div>
        </FeuilleBasse>
      )}
      {registre && <Registre onFermer={() => setRegistre(false)} />}
    </>
  );
}
