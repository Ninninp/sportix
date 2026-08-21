/* ============================================================
   timer.js — The active séance engine: this is the app's most
   stateful module. `uiState.activeSession` holds the entire in-progress
   workout (current exercise/set, superset step, deload flag, and the
   results collected so far); everything here reads or mutates that
   one object plus the rest-timer interval.

   exoPickerMode is module-local (only this file's swap/add flow reads
   it) — kept separate from uiState on purpose, matching the rule
   used throughout this refactor: state only goes in the shared
   uiState object if more than one module needs it.
   ============================================================ */

import { db, saveDB, uid, uiState } from './state.js';
import { openModal, closeModal, showConfirm, showInfo } from './utils.js';
import { exoName, findBlocForDate, suggestedChargeForSession } from './calculs.js';
import { switchView } from './nav.js';
import { renderHistorique } from './historique.js';

let exoPickerMode = null; // 'swap' | 'add'

export function startSeance(seanceId){
  const s = db.seances.find(s => s.id === seanceId);
  if(!s) return;
  const seanceCopy = { ...s, exercices: JSON.parse(JSON.stringify(s.exercices)) };

  // Lien deload : si un bloc "deload" est actif aujourd'hui, on réduit séries et charges de moitié
  const blocMatch = findBlocForDate(new Date());
  const isDeload = !!(blocMatch && blocMatch.bloc.type === 'deload');
  if(isDeload){
    seanceCopy.exercices.forEach(ex => {
      ex.series = Math.max(1, Math.round(ex.series / 2));
      ex.charge = Math.round((ex.charge / 2) * 2) / 2;
      if(ex.pairedExoId) ex.pairedCharge = Math.round((ex.pairedCharge / 2) * 2) / 2;
    });
  }

  uiState.activeSession = {
    seance: seanceCopy,
    exoIdx: 0,
    setIdx: 0,
    supersetStep: null, // null = exercice principal, 'B' = exercice couplé
    isDeload,
    phase: 'ready', // ready -> exo (manual) -> repos (timer) -> exo ...
    startedAt: new Date().toISOString(),
    currentCharge: 0,
    currentReps: 0,
    extraSets: {}, // exoIdx -> number of extra sets added mid-session
    results: seanceCopy.exercices.map(ex => ({
      exoId: ex.exoId, nom: exoName(ex.exoId), series: [],
      pairedExoId: ex.pairedExoId || null,
      pairedNom: ex.pairedExoId ? exoName(ex.pairedExoId) : null,
      seriesPaired: ex.pairedExoId ? [] : undefined,
    })),
  };
  const session = uiState.activeSession;
  session.currentCharge = suggestedChargeForSession(seanceCopy.exercices[0].exoId, seanceCopy.exercices[0].charge);
  session.currentReps = seanceCopy.exercices[0].reps;
  document.getElementById('activeSeanceTitle').textContent = s.nom + (isDeload ? ' · DELOAD' : '');
  openModal('modalActive');
  renderActiveState();
}

function currentExo(){
  const session = uiState.activeSession;
  if(!session) return null;
  return session.seance.exercices[session.exoIdx] || null;
}

function effectiveSeriesCount(){
  const ex = currentExo();
  if(!ex) return 0;
  const extra = uiState.activeSession.extraSets[uiState.activeSession.exoIdx] || 0;
  return ex.series + extra;
}

export function addExtraSet(){
  const session = uiState.activeSession;
  if(!session) return;
  const idx = session.exoIdx;
  session.extraSets[idx] = (session.extraSets[idx] || 0) + 1;
  document.getElementById('activeSetInfo').innerHTML = `<span class="pill active">Série ${session.setIdx + 1} / ${effectiveSeriesCount()}</span> <span class="pill">${currentExo().reps} reps</span>`;
}

/* --- Swap / skip / add exercise mid-session --- */
export function openSwapExo(){
  const ex = currentExo();
  const session = uiState.activeSession;
  if(!ex) return;
  const alreadyStarted = session.results[session.exoIdx].series.length > 0;
  if(alreadyStarted){
    showInfo("Tu as déjà validé au moins une série sur cet exercice. Utilise plutôt \"Passer\" pour aller au suivant, ou \"+ Exercice\" pour en ajouter un nouveau.");
    return;
  }
  exoPickerMode = 'swap';
  document.getElementById('exoPickerTitle').textContent = "Changer d'exercice";
  renderExoPickerList();
  openModal('modalExoPicker');
}

export function openAddExoMidSession(){
  exoPickerMode = 'add';
  document.getElementById('exoPickerTitle').textContent = 'Ajouter un exercice';
  renderExoPickerList();
  openModal('modalExoPicker');
}

function renderExoPickerList(){
  const wrap = document.getElementById('exoPickerList');
  if(db.exercices.length === 0){
    wrap.innerHTML = `<div class="empty"><p>Aucun exercice dans ta bibliothèque.</p></div>`;
    return;
  }
  wrap.innerHTML = db.exercices.map(e => `
    <div class="exo-row" style="cursor:pointer;" data-action="pickExoForSession" data-arg="${e.id}">
      <div class="exo-row-head" style="margin-bottom:0;">
        <div class="name">${e.nom}</div>
        <span class="pill" style="margin:0;">${e.groupe}</span>
      </div>
    </div>
  `).join('');
}

export function pickExoForSession(exoId){
  const session = uiState.activeSession;
  if(!session) return;
  if(exoPickerMode === 'swap'){
    const idx = session.exoIdx;
    session.seance.exercices[idx].exoId = exoId;
    session.results[idx].exoId = exoId;
    session.results[idx].nom = exoName(exoId);
    session.currentCharge = suggestedChargeForSession(exoId, session.seance.exercices[idx].charge);
    session.currentReps = session.seance.exercices[idx].reps;
    closeModal('modalExoPicker');
    renderActiveState();
  } else if(exoPickerMode === 'add'){
    const insertAt = session.exoIdx + 1;
    const newExoEntry = { exoId, series: 3, reps: 10, charge: 0 };
    session.seance.exercices.splice(insertAt, 0, newExoEntry);
    session.results.splice(insertAt, 0, { exoId, nom: exoName(exoId), series: [] });
    // shift extraSets keys that are >= insertAt
    const shifted = {};
    Object.keys(session.extraSets).forEach(k => {
      const ki = parseInt(k);
      shifted[ki >= insertAt ? ki + 1 : ki] = session.extraSets[k];
    });
    session.extraSets = shifted;
    closeModal('modalExoPicker');
    renderActiveState();
    showInfo(`"${exoName(exoId)}" a été ajouté juste après l'exercice en cours.`);
  }
}

export function skipCurrentExo(){
  const session = uiState.activeSession;
  if(!session) return;
  if(uiState.timerInterval) clearInterval(uiState.timerInterval);
  uiState.timerInterval = null;
  const isLastExo = session.exoIdx >= session.seance.exercices.length - 1;
  if(isLastExo){
    finishSeance();
    return;
  }
  session.exoIdx++;
  session.setIdx = 0;
  session.supersetStep = null;
  const newEx = currentExo();
  if(!newEx){ finishSeance(); return; }
  session.currentCharge = suggestedChargeForSession(newEx.exoId, newEx.charge);
  session.currentReps = newEx.reps;
  document.getElementById('ringFg').classList.remove('rest');
  document.getElementById('ringFg').style.strokeDashoffset = 0;
  document.getElementById('validateSetBtn').disabled = false;
  document.getElementById('skipRestBtn').disabled = true;
  renderActiveState();
}

export function updateActiveCharge(el){
  if(!uiState.activeSession) return;
  uiState.activeSession.currentCharge = parseFloat(el.value) || 0;
}
export function updateActiveReps(el){
  if(!uiState.activeSession) return;
  uiState.activeSession.currentReps = parseInt(el.value) || 0;
}

function renderActiveState(){
  const session = uiState.activeSession;
  const ex = currentExo();
  if(!ex){ finishSeance(); return; }
  const onStepB = ex.pairedExoId && session.supersetStep === 'B';
  const displayExoId = onStepB ? ex.pairedExoId : ex.exoId;
  document.getElementById('activePhaseLabel').textContent = `Exercice ${session.exoIdx + 1}/${session.seance.exercices.length}`;
  document.getElementById('activeExoName').textContent = exoName(displayExoId);
  const supersetBadge = ex.pairedExoId ? `<span class="pill active" style="background:var(--good-dim); color:var(--good);">Superset ${onStepB ? '2/2' : '1/2'}</span> ` : '';
  const deloadBadge = session.isDeload ? `<span class="pill active" style="background:var(--accent-dim); color:var(--accent);">DELOAD</span> ` : '';
  document.getElementById('activeSetInfo').innerHTML = `${deloadBadge}${supersetBadge}<span class="pill active">Série ${session.setIdx + 1} / ${effectiveSeriesCount()}</span>`;
  document.getElementById('activeChargeInput').value = session.currentCharge;
  document.getElementById('activeRepsInput').value = session.currentReps;
  const nextIdx = session.exoIdx + 1;
  document.getElementById('activeNextInfo').textContent = nextIdx < session.seance.exercices.length
    ? `Suivant : ${exoName(session.seance.exercices[nextIdx].exoId)}`
    : 'Dernier exercice de la séance';
  document.getElementById('ringPhase').textContent = 'PRÊT';
  document.getElementById('ringTime').textContent = '--:--';
  document.getElementById('ringFg').classList.remove('rest');
  document.getElementById('ringFg').style.strokeDashoffset = 0;
  document.getElementById('validateSetBtn').textContent = 'Valider la série';
  document.getElementById('skipRestBtn').disabled = true;
}

export function validateSet(){
  const session = uiState.activeSession;
  if(!session) return;
  const ex = currentExo();
  if(!ex){ finishSeance(); return; }
  const chargeUsed = session.currentCharge;
  const repsUsed = session.currentReps;
  const onStepB = ex.pairedExoId && session.supersetStep === 'B';

  if(onStepB){
    session.results[session.exoIdx].seriesPaired.push({ reps: repsUsed, charge: chargeUsed });
  } else {
    session.results[session.exoIdx].series.push({ reps: repsUsed, charge: chargeUsed });
  }

  // Superset: after finishing exercise A of the pair, jump straight to B with no rest
  if(ex.pairedExoId && !onStepB){
    session.supersetStep = 'B';
    session.currentCharge = suggestedChargeForSession(ex.pairedExoId, ex.pairedCharge);
    session.currentReps = ex.pairedReps;
    renderActiveState();
    return;
  }
  // Finished B (or a normal non-paired exercise): superset round done, reset step
  session.supersetStep = null;

  const isLastSet = session.setIdx >= effectiveSeriesCount() - 1;
  const isLastExo = session.exoIdx >= session.seance.exercices.length - 1;

  if(isLastSet && isLastExo){
    finishSeance();
    return;
  }
  startRest();
}

function startRest(){
  const session = uiState.activeSession;
  if(!session) return;
  const ex = currentExo();
  const total = (ex && ex.repos != null) ? ex.repos : session.seance.repos;
  let remaining = total;
  document.getElementById('ringPhase').textContent = 'REPOS';
  document.getElementById('ringFg').classList.add('rest');
  document.getElementById('validateSetBtn').disabled = true;
  document.getElementById('skipRestBtn').disabled = false;
  updateRingDisplay(remaining, total);
  if(uiState.timerInterval) clearInterval(uiState.timerInterval);
  uiState.timerInterval = setInterval(() => {
    remaining--;
    updateRingDisplay(remaining, total);
    if(remaining <= 0){
      clearInterval(uiState.timerInterval);
      advanceAfterRest();
    }
  }, 1000);
}

function updateRingDisplay(remaining, total){
  const circumference = 2 * Math.PI * 95;
  const ratio = Math.max(remaining, 0) / total;
  document.getElementById('ringFg').style.strokeDashoffset = circumference * (1 - ratio);
  const mm = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0');
  document.getElementById('ringTime').textContent = `${mm}:${ss}`;
}

export function skipRest(){
  if(uiState.timerInterval) clearInterval(uiState.timerInterval);
  uiState.timerInterval = null;
  advanceAfterRest();
}

function advanceAfterRest(){
  const session = uiState.activeSession;
  if(!session) return;
  const ex = currentExo();
  if(!ex){ finishSeance(); return; }
  const prevExoIdx = session.exoIdx;
  if(session.setIdx < effectiveSeriesCount() - 1){
    session.setIdx++;
  } else {
    session.exoIdx++;
    session.setIdx = 0;
  }
  const newEx = currentExo();
  if(!newEx){ finishSeance(); return; }
  if(session.exoIdx !== prevExoIdx){
    session.currentCharge = suggestedChargeForSession(newEx.exoId, newEx.charge);
    session.currentReps = newEx.reps;
  } else if(newEx.pairedExoId){
    // starting a new round of the same superset: go back to exercise A's own weight/reps
    const aSeries = session.results[session.exoIdx].series;
    const lastA = aSeries[aSeries.length - 1];
    session.currentCharge = lastA ? lastA.charge : newEx.charge;
    session.currentReps = lastA ? lastA.reps : newEx.reps;
  }
  document.getElementById('ringFg').classList.remove('rest');
  document.getElementById('ringFg').style.strokeDashoffset = 0;
  document.getElementById('ringPhase').textContent = 'PRÊT';
  document.getElementById('ringTime').textContent = '--:--';
  document.getElementById('validateSetBtn').disabled = false;
  document.getElementById('validateSetBtn').textContent = 'Valider la série';
  document.getElementById('skipRestBtn').disabled = true;
  renderActiveState();
}

function finishSeance(){
  if(uiState.timerInterval) clearInterval(uiState.timerInterval);
  uiState.timerInterval = null;
  const session = uiState.activeSession;
  if(!session){ closeModal('modalActive'); return; }

  // Split superset results back into two independent exercice entries so
  // PR tracking and charge charts stay accurate per exercise.
  const results = [];
  session.results.forEach(r => {
    if(r.series.length > 0) results.push({ exoId: r.exoId, nom: r.nom, series: r.series });
    if(r.pairedExoId && r.seriesPaired && r.seriesPaired.length > 0){
      results.push({ exoId: r.pairedExoId, nom: r.pairedNom, series: r.seriesPaired });
    }
  });
  const volume = results.reduce((acc, ex) => acc + ex.series.reduce((a, s) => a + (s.reps * s.charge), 0), 0);
  if(results.length > 0){
    db.historique.push({
      id: uid(),
      nom: session.seance.nom,
      date: new Date().toISOString(),
      volume,
      exercices: results,
    });
    saveDB();
  }
  uiState.activeSession = null;
  closeModal('modalActive');
  switchView('accueil');
  renderHistorique();
}

export function confirmStopSeance(){
  const session = uiState.activeSession;
  if(!session){
    if(uiState.timerInterval) clearInterval(uiState.timerInterval);
    uiState.timerInterval = null;
    closeModal('modalActive');
    return;
  }
  const hasProgress = session.results.some(ex => ex.series.length > 0 || (ex.seriesPaired && ex.seriesPaired.length > 0));
  if(!hasProgress){
    if(uiState.timerInterval) clearInterval(uiState.timerInterval);
    uiState.timerInterval = null;
    uiState.activeSession = null;
    closeModal('modalActive');
    return;
  }
  showConfirm(
    'Arrêter la séance en cours ? La progression déjà enregistrée sera sauvegardée, le reste sera perdu.',
    () => {
      if(uiState.timerInterval) clearInterval(uiState.timerInterval);
      uiState.timerInterval = null;
      finishSeance();
    },
    'Arrêter la séance'
  );
}
