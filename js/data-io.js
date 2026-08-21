/* ============================================================
   data-io.js — Backup/restore: export the whole `db` to a downloadable
   JSON file, or replace it from a user-provided file. This is the
   app's only persistence path other than localStorage, so it's kept
   deliberately defensive (validates shape before ever touching `db`).
   ============================================================ */

import { db, saveDB, replaceDB } from './state.js';
import { showInfo, showConfirm } from './utils.js';
import { renderAccueil } from './accueil.js';
import { renderSeancesList } from './seances.js';
import { renderExoList } from './exercices.js';
import { renderHistorique } from './historique.js';
import { renderProgression } from './progression.js';

export function exportData(){
  const payload = {
    app: 'suivi-sport',
    exportedAt: new Date().toISOString(),
    data: db,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `suivi-sport-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerImportFile(){
  document.getElementById('importFileInput').click();
}

export function importData(inputEl){
  const file = inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    let parsed;
    try{
      parsed = JSON.parse(e.target.result);
    }catch(err){
      showInfo("Ce fichier n'est pas un JSON valide.");
      inputEl.value = '';
      return;
    }
    const incoming = parsed && parsed.data ? parsed.data : parsed;
    const looksValid = incoming && Array.isArray(incoming.exercices) && Array.isArray(incoming.seances)
      && Array.isArray(incoming.historique) && Array.isArray(incoming.poids);
    if(!looksValid){
      showInfo("Ce fichier ne semble pas être une sauvegarde SPORTIX valide.");
      inputEl.value = '';
      return;
    }
    showConfirm(
      'Importer ce fichier remplacera toutes tes données actuelles (séances, exercices, historique, pesées). Continuer ?',
      () => {
        replaceDB(incoming);
        saveDB();
        renderAccueil();
        renderSeancesList();
        renderExoList();
        renderHistorique();
        renderProgression();
        inputEl.value = '';
        showInfo('Données importées avec succès.');
      },
      'Remplacer les données'
    );
  };
  reader.readAsText(file);
}
