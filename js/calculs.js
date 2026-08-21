/* ============================================================
   calculs.js — Pure business logic derived from `db`. No DOM access,
   no rendering: every function here takes data in, returns data out.
   This is what used to be tangled into render functions like
   renderAccueil() — pulling it out means the volume/PR/deload rules
   can be reasoned about (and eventually tested) independently of how
   they're displayed.
   ============================================================ */

import { db, uiState } from './state.js';

export function exoName(id){
  const e = db.exercices.find(e => e.id === id);
  return e ? e.nom : '—';
}

export function findTodaySeances(){
  const today = new Date().getDay();
  return db.seances.filter(s => s.jours && s.jours.includes(today));
}

export function currentStreak(){
  if(db.historique.length === 0) return 0;
  const days = [...new Set(db.historique.map(h => h.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  for(let i = 0; i < days.length; i++){
    const d = new Date(days[i]);
    const diff = Math.round((cursor - d) / 86400000);
    if(diff <= 1){ streak++; cursor = d; } else break;
  }
  return streak;
}

/** Personal record (max charge ever lifted) per exercise, with the date it was set. */
export function computePRs(){
  const prs = {};
  db.historique.forEach(h => {
    h.exercices.forEach(ex => {
      const maxCharge = Math.max(...ex.series.map(s => s.charge || 0), 0);
      if(!prs[ex.exoId] || maxCharge > prs[ex.exoId].charge){
        prs[ex.exoId] = { nom: ex.nom, charge: maxCharge, date: h.date };
      }
    });
  });
  return prs;
}

/** Charge (weight) history for one exercise, as {x: date, y: maxCharge} points for charting. */
export function getChargePoints(exoId){
  const points = [];
  db.historique.forEach(h => {
    h.exercices.forEach(ex => {
      if(ex.exoId === exoId && ex.series.length > 0){
        const maxC = Math.max(...ex.series.map(s => s.charge || 0), 0);
        points.push({ x: h.date, y: maxC });
      }
    });
  });
  return points;
}

export function toDateOnly(d){
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Returns { bloc, weekNum } for whichever calendar bloc covers `date`, or null. */
export function findBlocForDate(date){
  const d = toDateOnly(date).getTime();
  for(const b of db.blocs){
    const start = toDateOnly(b.dateDebut).getTime();
    const end = start + b.semaines * 7 * 86400000;
    if(d >= start && d < end){
      const weekNum = Math.floor((d - start) / (7 * 86400000)) + 1;
      return { bloc: b, weekNum };
    }
  }
  return null;
}

export function isDeloadToday(){
  const match = findBlocForDate(new Date());
  return !!(match && match.bloc.type === 'deload');
}

/** Last charge used for this exercise (most recent session), falling back to the séance's configured default. */
export function getSuggestedCharge(exoId, fallback){
  const past = db.historique
    .filter(h => h.exercices.some(e => e.exoId === exoId && e.series.length > 0))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if(past.length > 0){
    const ex = past[0].exercices.find(e => e.exoId === exoId);
    const lastSet = ex.series[ex.series.length - 1];
    if(lastSet && lastSet.charge != null) return lastSet.charge;
  }
  return fallback;
}

/** Same as getSuggestedCharge, but halved when the current active séance is running in deload mode. */
export function suggestedChargeForSession(exoId, fallback){
  let val = getSuggestedCharge(exoId, fallback);
  if(uiState.activeSession && uiState.activeSession.isDeload) val = Math.round((val / 2) * 2) / 2;
  return val;
}
