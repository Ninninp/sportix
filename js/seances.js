/* ============================================================
   seances.js — Séance CRUD (create/edit/delete/list) and the
   exercise builder used inside the séance editor modal: per-exercise
   séries/reps/charge/repos fields, day-of-week assignment, and
   superset pairing.

   builderExos/builderDays/editingSeanceId are module-local: they only
   matter while the séance editor modal is open, and nothing outside
   this file reads or writes them.
   ============================================================ */

import { db, saveDB, uid, DAY_NAMES } from './state.js';
import { openModal, closeModal, showConfirm, showInfo } from './utils.js';
import { isDeloadToday } from './calculs.js';
import { renderAccueil } from './accueil.js';

let builderExos = [];
let builderDays = [];
let editingSeanceId = null;

/* ---------- Day-of-week picker ---------- */
export function toggleBuilderDay(idx){
  const pos = builderDays.indexOf(idx);
  if(pos === -1) builderDays.push(idx); else builderDays.splice(pos, 1);
  renderDaysPicker();
}
function renderDaysPicker(){
  const wrap = document.getElementById('seanceDaysPicker');
  wrap.innerHTML = DAY_NAMES.map((name, idx) =>
    `<button type="button" class="day-pill ${builderDays.includes(idx) ? 'active' : ''}" data-action="toggleBuilderDay" data-arg-num="${idx}">${name}</button>`
  ).join('');
}

/* ---------- Séance editor modal ---------- */
export function openSeanceEditor(seanceId){
  const seance = seanceId ? db.seances.find(s => s.id === seanceId) : null;
  editingSeanceId = seance ? seance.id : null;
  document.getElementById('seanceEditorTitle').textContent = seance ? 'Modifier la séance' : 'Nouvelle séance';
  document.getElementById('seanceNameInput').value = seance ? seance.nom : '';
  document.getElementById('seanceRestInput').value = seance ? seance.repos : 90;
  builderExos = seance ? JSON.parse(JSON.stringify(seance.exercices)) : [];
  builderDays = seance && seance.jours ? [...seance.jours] : [];
  renderBuilder();
  renderDaysPicker();
  openModal('modalSeance');
}

export function saveSeance(){
  const nom = document.getElementById('seanceNameInput').value.trim();
  const repos = parseInt(document.getElementById('seanceRestInput').value) || 60;
  if(!nom){ showInfo('Donne un nom à ta séance.'); return; }
  if(builderExos.length === 0){ showInfo('Ajoute au moins un exercice.'); return; }
  if(editingSeanceId){
    const s = db.seances.find(s => s.id === editingSeanceId);
    s.nom = nom; s.repos = repos; s.exercices = builderExos; s.jours = [...builderDays].sort();
  } else {
    db.seances.push({ id: uid(), nom, repos, exercices: builderExos, jours: [...builderDays].sort() });
  }
  saveDB();
  closeModal('modalSeance');
  renderSeancesList();
  renderAccueil();
}

export function deleteSeance(id){
  showConfirm('Supprimer cette séance ?', () => {
    db.seances = db.seances.filter(s => s.id !== id);
    saveDB();
    renderSeancesList();
    renderAccueil();
  });
}

/* ---------- Exercise builder rows ---------- */
export function addExoToBuilder(){
  if(db.exercices.length === 0){ showInfo("Ajoute d'abord un exercice dans l'onglet Exercices."); return; }
  builderExos.push({ exoId: db.exercices[0].id, series: 3, reps: 10, charge: 0, repos: null, pairedExoId: null, pairedReps: 10, pairedCharge: 0 });
  renderBuilder();
}

export function removeFromBuilder(idx){
  builderExos.splice(idx, 1);
  renderBuilder();
}

export function toggleSuperset(el){
  const idx = Number(el.dataset.idx);
  builderExos[idx].pairedExoId = el.checked ? (db.exercices.find(e => e.id !== builderExos[idx].exoId) || db.exercices[0]).id : null;
  renderBuilder();
}
export function setBuilderExoId(el){ builderExos[Number(el.dataset.idx)].exoId = el.value; }
export function setBuilderSeries(el){ builderExos[Number(el.dataset.idx)].series = parseInt(el.value) || 1; }
export function setBuilderReps(el){ builderExos[Number(el.dataset.idx)].reps = parseInt(el.value) || 1; }
export function setBuilderCharge(el){ builderExos[Number(el.dataset.idx)].charge = parseFloat(el.value) || 0; }
export function setBuilderRepos(el){ builderExos[Number(el.dataset.idx)].repos = el.value === '' ? null : (parseInt(el.value) || 0); }
export function setBuilderPairedExoId(el){ builderExos[Number(el.dataset.idx)].pairedExoId = el.value; }
export function setBuilderPairedReps(el){ builderExos[Number(el.dataset.idx)].pairedReps = parseInt(el.value) || 1; }
export function setBuilderPairedCharge(el){ builderExos[Number(el.dataset.idx)].pairedCharge = parseFloat(el.value) || 0; }

function renderBuilder(){
  const wrap = document.getElementById('seanceExoBuilder');
  if(builderExos.length === 0){
    wrap.innerHTML = `<div class="empty" style="padding:20px;"><p>Aucun exercice ajouté.</p></div>`;
    return;
  }
  wrap.innerHTML = builderExos.map((be, idx) => {
    const options = db.exercices.map(e => `<option value="${e.id}" ${e.id === be.exoId ? 'selected' : ''}>${e.nom}</option>`).join('');
    return `<div class="exo-row">
      <div class="exo-row-head">
        <select data-idx="${idx}" data-onchange="setBuilderExoId" style="width:75%;">${options}</select>
        <button class="btn btn-danger btn-sm" data-action="removeFromBuilder" data-arg-num="${idx}">×</button>
      </div>
      <div class="exo-fields">
        <div><span class="field-lbl">Séries</span><input type="number" value="${be.series}" data-idx="${idx}" data-onchange="setBuilderSeries"></div>
        <div><span class="field-lbl">Reps</span><input type="number" value="${be.reps}" data-idx="${idx}" data-onchange="setBuilderReps"></div>
        <div><span class="field-lbl">Charge (kg)</span><input type="number" value="${be.charge}" data-idx="${idx}" data-onchange="setBuilderCharge"></div>
        <div><span class="field-lbl">Repos (s)</span><input type="number" placeholder="défaut" value="${be.repos != null ? be.repos : ''}" data-idx="${idx}" data-onchange="setBuilderRepos"></div>
      </div>
      <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:12px; color:var(--muted);">
        <input type="checkbox" ${be.pairedExoId ? 'checked' : ''} data-idx="${idx}" data-onchange="toggleSuperset" style="width:auto;">
        Superset : enchaîner sans repos avec un 2ᵉ exercice
      </label>
      ${be.pairedExoId ? `
      <div style="margin-top:8px; padding:10px; background:rgba(255,255,255,0.04); border-radius:10px;">
        <span class="field-lbl">Exercice couplé</span>
        <select data-idx="${idx}" data-onchange="setBuilderPairedExoId" style="margin-bottom:8px;">${db.exercices.map(e => `<option value="${e.id}" ${e.id === be.pairedExoId ? 'selected' : ''}>${e.nom}</option>`).join('')}</select>
        <div class="exo-fields">
          <div><span class="field-lbl">Reps</span><input type="number" value="${be.pairedReps}" data-idx="${idx}" data-onchange="setBuilderPairedReps"></div>
          <div><span class="field-lbl">Charge (kg)</span><input type="number" value="${be.pairedCharge}" data-idx="${idx}" data-onchange="setBuilderPairedCharge"></div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
}

/* ---------- Séances list (tab) ---------- */
export function renderSeancesList(){
  const list = document.getElementById('seancesList');
  if(db.seances.length === 0){
    list.innerHTML = `<div class="empty"><div class="glyph">📋</div><p>Aucune séance créée.<br>Crée ta première séance pour commencer à t'entraîner.</p></div>`;
    return;
  }
  const deloadToday = isDeloadToday();
  list.innerHTML = db.seances.map((s, i) => {
    const nbExo = s.exercices.length;
    const today = new Date().getDay();
    const joursBadges = (s.jours && s.jours.length)
      ? `<div class="day-badges">${s.jours.map(j => `<span class="day-badge ${j === today ? 'today' : ''}">${DAY_NAMES[j]}</span>`).join('')}</div>`
      : `<div class="day-badges"><span class="day-badge">Pas de jour assigné</span></div>`;
    const deloadTag = deloadToday ? `<span class="pill" style="background:var(--accent-dim); color:var(--accent); margin-left:8px; vertical-align:middle;">DELOAD aujourd'hui</span>` : '';
    return `<div class="card animate-rise" style="animation-delay:${Math.min(i * 60, 300)}ms;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h3 style="font-size:16px; display:inline;">${s.nom}</h3>${deloadTag}
          <div style="color:var(--muted); font-size:12px; margin-top:4px;">${nbExo} exercice${nbExo > 1 ? 's' : ''} · repos ${s.repos}s</div>
          ${joursBadges}
        </div>
      </div>
      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-primary" style="flex:1;" data-action="startSeance" data-arg="${s.id}">Démarrer</button>
        <button class="btn btn-ghost btn-sm" data-action="openSeanceEditor" data-arg="${s.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" data-action="deleteSeance" data-arg="${s.id}">Suppr.</button>
      </div>
    </div>`;
  }).join('');
}
