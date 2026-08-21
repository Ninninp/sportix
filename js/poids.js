/* ============================================================
   poids.js — Bodyweight tracking: the "+ Ajouter une pesée" modal.
   ============================================================ */

import { db, saveDB } from './state.js';
import { openModal, closeModal } from './utils.js';
import { renderProgression } from './progression.js';
import { renderAccueil } from './accueil.js';

export function openPoidsModal(){
  document.getElementById('poidsInput').value = '';
  openModal('modalPoids');
}

export function savePoids(){
  const v = parseFloat(document.getElementById('poidsInput').value);
  if(!v) return;
  db.poids.push({ date: new Date().toISOString(), valeur: v });
  saveDB();
  closeModal('modalPoids');
  renderProgression();
  renderAccueil();
}
