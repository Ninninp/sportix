/* ============================================================
   exercices.js — Exercise library: create/delete/list, and the
   per-exercise detail modal (PR, session count, charge history chart).
   ============================================================ */

import { db, saveDB, uid } from './state.js';
import { openModal, closeModal, showConfirm, formatDate } from './utils.js';
import { computePRs, getChargePoints } from './calculs.js';
import { drawLineChart } from './progression.js';

export function openExoEditor(){
  document.getElementById('exoNameInput').value = '';
  openModal('modalExo');
}

export function saveExo(){
  const nom = document.getElementById('exoNameInput').value.trim();
  const groupe = document.getElementById('exoGroupInput').value;
  if(!nom) return;
  db.exercices.push({ id: uid(), nom, groupe });
  saveDB();
  closeModal('modalExo');
  renderExoList();
}

export function deleteExo(id){
  showConfirm('Supprimer cet exercice de la bibliothèque ?', () => {
    db.exercices = db.exercices.filter(e => e.id !== id);
    saveDB();
    renderExoList();
  });
}

export function renderExoList(){
  const list = document.getElementById('exoList');
  if(db.exercices.length === 0){
    list.innerHTML = `<div class="empty"><div class="glyph">🏋️</div><p>Aucun exercice pour l'instant.<br>Ajoute ton premier exercice pour commencer à construire tes séances.</p></div>`;
    return;
  }
  const prs = computePRs();
  const groups = {};
  db.exercices.forEach(e => { (groups[e.groupe] = groups[e.groupe] || []).push(e); });
  let html = '';
  Object.keys(groups).forEach(g => {
    html += `<div class="card-title" style="margin-top:14px;">${g}</div>`;
    groups[g].forEach(e => {
      const pr = prs[e.id];
      const prLine = pr
        ? `<div class="pr-line">PR : <span class="pr-value">${pr.charge} kg</span> · ${formatDate(pr.date)}</div>`
        : `<div class="pr-line muted-line">Aucun PR enregistré pour l'instant</div>`;
      html += `<div class="exo-row" style="cursor:pointer;" data-action="openExoDetail" data-arg="${e.id}">
        <div class="exo-row-head">
          <div class="name">${e.nom}</div>
          <button class="btn btn-danger btn-sm" data-action="deleteExo" data-arg="${e.id}">Suppr.</button>
        </div>
        ${prLine}
      </div>`;
    });
  });
  list.innerHTML = html;
}

export function openExoDetail(exoId){
  const e = db.exercices.find(x => x.id === exoId);
  if(!e) return;
  const prs = computePRs();
  const pr = prs[exoId];
  const sessionsWithExo = db.historique.filter(h => h.exercices.some(ex => ex.exoId === exoId && ex.series.length > 0));
  const lastSession = sessionsWithExo.length > 0
    ? [...sessionsWithExo].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  document.getElementById('exoDetailName').textContent = e.nom;
  document.getElementById('exoDetailGroup').textContent = e.groupe;
  document.getElementById('exoDetailPR').textContent = pr ? pr.charge : '—';
  document.getElementById('exoDetailCount').textContent = sessionsWithExo.length;
  document.getElementById('exoDetailLast').textContent = lastSession ? formatDate(lastSession.date) : '—';

  openModal('modalExoDetail');
  // draw after the modal is visible so the canvas has a real width to measure
  requestAnimationFrame(() => {
    drawLineChart('chartExoDetail', getChargePoints(exoId), '#78F25A', 'kg');
  });
}
