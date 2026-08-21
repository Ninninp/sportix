/* ============================================================
   historique.js — Past séances list + detail view.
   ============================================================ */

import { db } from './state.js';
import { formatDate, showInfo } from './utils.js';

export function renderHistorique(){
  const card = document.getElementById('histCard');
  if(db.historique.length === 0){
    card.innerHTML = `<div class="empty"><div class="glyph">🕓</div><p>Aucune séance enregistrée pour l'instant.</p></div>`;
    return;
  }
  const sorted = [...db.historique].sort((a, b) => new Date(b.date) - new Date(a.date));
  card.innerHTML = sorted.map((h, i) => `
    <div class="hist-item animate-slide-in" style="cursor:pointer; animation-delay:${Math.min(i * 50, 400)}ms;" data-action="showHistDetail" data-arg="${h.id}">
      <div class="d"><div class="nm">${h.nom}</div><div class="dt">${formatDate(h.date)}</div></div>
      <div class="vol">${Math.round(h.volume)} kg vol.</div>
    </div>
  `).join('');
}

export function showHistDetail(histId){
  const h = db.historique.find(x => x.id === histId);
  if(!h) return;
  const detail = h.exercices.map(ex => {
    const sets = ex.series.map((s, i) => `Série ${i + 1} : ${s.reps} reps × ${s.charge}kg`).join('\n');
    return `${ex.nom}\n${sets}`;
  }).join('\n\n');
  showInfo(detail, `${h.nom} — ${formatDate(h.date)}`);
}
