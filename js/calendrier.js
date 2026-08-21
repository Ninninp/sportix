/* ============================================================
   calendrier.js — Training blocks (spécialisation/deload/etc):
   CRUD, the monthly calendar grid view, and the blocs list.
   ============================================================ */

import { db, saveDB, uid, uiState, BLOC_COLORS, BLOC_TYPE_LABELS } from './state.js';
import { openModal, closeModal, showConfirm, showInfo, formatDate } from './utils.js';
import { toDateOnly, findBlocForDate } from './calculs.js';
import { renderAccueil } from './accueil.js';

export function openBlocEditor(blocId){
  const bloc = blocId ? db.blocs.find(b => b.id === blocId) : null;
  uiState.editingBlocId = bloc ? bloc.id : null;
  document.getElementById('blocEditorTitle').textContent = bloc ? 'Modifier le bloc' : 'Nouveau bloc';
  document.getElementById('blocNameInput').value = bloc ? bloc.nom : '';
  document.getElementById('blocTypeInput').value = bloc ? bloc.type : 'specialisation';
  document.getElementById('blocStartInput').value = bloc ? bloc.dateDebut.slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('blocWeeksInput').value = bloc ? bloc.semaines : 4;
  uiState.selectedBlocColor = bloc ? bloc.couleur : BLOC_COLORS[0];
  renderBlocColorSwatches();
  openModal('modalBloc');
}

function renderBlocColorSwatches(){
  const wrap = document.getElementById('blocColorSwatches');
  wrap.innerHTML = BLOC_COLORS.map(c => `
    <div data-action="selectBlocColor" data-arg="${c}" style="width:30px; height:30px; border-radius:50%; background:${c}; cursor:pointer; border:2px solid ${c === uiState.selectedBlocColor ? '#fff' : 'transparent'}; box-shadow:${c === uiState.selectedBlocColor ? '0 0 0 2px ' + c : 'none'};"></div>
  `).join('');
}

export function selectBlocColor(c){
  uiState.selectedBlocColor = c;
  renderBlocColorSwatches();
}

export function saveBloc(){
  const nom = document.getElementById('blocNameInput').value.trim();
  const type = document.getElementById('blocTypeInput').value;
  const dateDebut = document.getElementById('blocStartInput').value;
  const semaines = parseInt(document.getElementById('blocWeeksInput').value) || 1;
  if(!nom){ showInfo('Donne un nom à ton bloc.'); return; }
  if(!dateDebut){ showInfo('Choisis une date de début.'); return; }
  if(uiState.editingBlocId){
    const b = db.blocs.find(x => x.id === uiState.editingBlocId);
    b.nom = nom; b.type = type; b.dateDebut = new Date(dateDebut).toISOString(); b.semaines = semaines; b.couleur = uiState.selectedBlocColor;
  } else {
    db.blocs.push({ id: uid(), nom, type, dateDebut: new Date(dateDebut).toISOString(), semaines, couleur: uiState.selectedBlocColor });
  }
  saveDB();
  closeModal('modalBloc');
  renderCalendrier();
  renderAccueil();
}

export function deleteBloc(id){
  showConfirm('Supprimer ce bloc ?', () => {
    db.blocs = db.blocs.filter(b => b.id !== id);
    saveDB();
    renderCalendrier();
    renderAccueil();
  });
}

export function calShiftMonth(delta){
  uiState.calCursor = new Date(uiState.calCursor.getFullYear(), uiState.calCursor.getMonth() + delta, 1);
  renderCalendrier();
}

export function renderCalendrier(){
  const year = uiState.calCursor.getFullYear();
  const month = uiState.calCursor.getMonth();
  document.getElementById('calMonthLabel').textContent =
    uiState.calCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // make Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateOnly(new Date()).getTime();

  let cells = '';
  ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => cells += `<div class="cal-dow">${d}</div>`);
  for(let i = 0; i < startOffset; i++) cells += `<div class="cal-cell empty"></div>`;
  for(let day = 1; day <= daysInMonth; day++){
    const d = new Date(year, month, day);
    const match = findBlocForDate(d);
    const isToday = toDateOnly(d).getTime() === todayStr;
    const style = match ? `background:${match.bloc.couleur}22; border-color:${match.bloc.couleur};` : '';
    cells += `<div class="cal-cell ${isToday ? 'today' : ''}" style="${style}">
      <span class="cal-daynum">${day}</span>
      ${match ? `<span class="cal-dot" style="background:${match.bloc.couleur};"></span>` : ''}
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = cells;

  // legend: blocs visible in this month
  const visibleBlocs = db.blocs.filter(b => {
    const start = toDateOnly(b.dateDebut);
    const end = new Date(start.getTime() + b.semaines * 7 * 86400000);
    return start <= new Date(year, month + 1, 0) && end > new Date(year, month, 1);
  });
  document.getElementById('calLegend').innerHTML = visibleBlocs.length
    ? visibleBlocs.map(b => `<span><span class="dot" style="background:${b.couleur};"></span>${b.nom}</span>`).join('')
    : '';

  renderBlocsList();
}

function renderBlocsList(){
  const wrap = document.getElementById('blocsList');
  if(db.blocs.length === 0){
    wrap.innerHTML = `<div class="empty"><div class="glyph">🗓️</div><p>Aucun bloc créé.<br>Crée un bloc pour suivre tes phases de spécialisation, deload, etc.</p></div>`;
    return;
  }
  const sorted = [...db.blocs].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
  wrap.innerHTML = sorted.map(b => {
    const start = toDateOnly(b.dateDebut);
    const end = new Date(start.getTime() + b.semaines * 7 * 86400000 - 86400000);
    return `<div class="exo-row">
      <div class="exo-row-head">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="dot" style="width:10px; height:10px; border-radius:50%; background:${b.couleur}; display:inline-block;"></span>
          <div class="name">${b.nom}</div>
        </div>
        <button class="btn btn-danger btn-sm" data-action="deleteBloc" data-arg="${b.id}">Suppr.</button>
      </div>
      <div class="pr-line muted-line">${BLOC_TYPE_LABELS[b.type] || b.type} · ${b.semaines} sem. · ${formatDate(b.dateDebut)} → ${formatDate(end.toISOString())}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px;" data-action="openBlocEditor" data-arg="${b.id}">Modifier</button>
    </div>`;
  }).join('');
}
