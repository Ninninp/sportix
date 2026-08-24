/* ============================================================
   nav.js — View switching, the "Plus" menu, and the event-delegation
   dispatcher.

   With everything split into ES modules, functions are no longer
   implicitly global (unlike the old single-file version, where every
   top-level `function` was reachable as `window.fnName`). So instead
   of the old dispatcher's `window[action]` lookup, this module holds
   an explicit `actions` registry built from every module's exports,
   and data-action/data-onchange/data-oninput attributes are resolved
   against that registry. This is the one file that needs to know
   about every other module — by design, it's the app's composition
   root.
   ============================================================ */

import { openModal, closeModal, showInfo } from './utils.js';
import { APP_VERSION, APP_RELEASE_DATE } from './version.js';
import { exportData, triggerImportFile, importData } from './data-io.js';
import { openExoEditor, saveExo, deleteExo, openExoDetail, renderExoList } from './exercices.js';
import {
  openSeanceEditor, saveSeance, deleteSeance, addExoToBuilder, removeFromBuilder,
  toggleSuperset, setBuilderExoId, setBuilderSeries, setBuilderReps, setBuilderCharge,
  setBuilderRepos, setBuilderPairedExoId, setBuilderPairedReps, setBuilderPairedCharge,
  toggleBuilderDay, renderSeancesList,
} from './seances.js';
import { renderAccueil, selectAccueilSeance, resetAccueilToToday } from './accueil.js';
import { renderHistorique, showHistDetail } from './historique.js';
import { openPoidsModal, savePoids } from './poids.js';
import { renderProgression } from './progression.js';
import {
  openBlocEditor, saveBloc, deleteBloc, selectBlocColor, calShiftMonth, renderCalendrier,
} from './calendrier.js';
import {
  startSeance, validateSet, skipRest, confirmStopSeance, openSwapExo, skipCurrentExo,
  openAddExoMidSession, pickExoForSession, updateActiveCharge, updateActiveReps,
} from './timer.js';

/* ---------- View switching ---------- */
export function switchView(v){
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  const plusViews = ['exercices', 'calendrier'];
  const activeNavKey = plusViews.includes(v) ? 'plus' : v;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === activeNavKey));
  updateTabSlider();
  if(v === 'accueil') renderAccueil();
  if(v === 'seances') renderSeancesList();
  if(v === 'historique') renderHistorique();
  if(v === 'exercices') renderExoList();
  if(v === 'progression') renderProgression();
  if(v === 'calendrier') renderCalendrier();
}

function updateTabSlider(){
  const activeBtn = document.querySelector('.tab-btn.active');
  const slider = document.querySelector('.tab-slider');
  if(activeBtn && slider){
    const btnRect = activeBtn.getBoundingClientRect();
    const barRect = document.querySelector('.tabbar-inner').getBoundingClientRect();
    const offsetLeft = btnRect.left - barRect.left;
    slider.style.left = offsetLeft + 'px';
  }
}

export function openPlusMenu(){
  document.getElementById('appVersionFooter').textContent = `SPORTIX v${APP_VERSION} · ${APP_RELEASE_DATE}`;
  openModal('modalPlus');
}
export function goPlusExercices(){ closeModal('modalPlus'); switchView('exercices'); }
export function goPlusCalendrier(){ closeModal('modalPlus'); switchView('calendrier'); }

export async function checkForUpdate(){
  if(!('serviceWorker' in navigator)){
    showInfo('Service worker non pris en charge par ce navigateur.');
    return;
  }
  try{
    const reg = await navigator.serviceWorker.getRegistration();
    if(!reg){
      showInfo('Aucun service worker enregistré.');
      return;
    }
    showInfo('Recherche de mise à jour...');
    await reg.update();
    // Fallback: ask the active controller to run its own update check too
    if(navigator.serviceWorker.controller){
      try{ navigator.serviceWorker.controller.postMessage({ type: 'CHECK_FOR_UPDATE' }); } catch(e){}
    }
    showInfo('Vérification terminée. Si une nouvelle version est disponible, elle sera activée automatiquement.');
  } catch(err){
    showInfo('Erreur lors de la vérification : ' + (err && err.message ? err.message : err));
  }
}

/* ---------- Action registry ----------
   Every function reachable from a data-action/data-onchange/data-oninput
   attribute in the HTML must be listed here under the same name used
   in the markup. */
const actions = {
  // nav.js itself
  switchView, openPlusMenu, checkForUpdate, goPlusExercices, goPlusCalendrier,
  closeModal,
  // exercices.js
  openExoEditor, saveExo, deleteExo, openExoDetail,
  // seances.js
  openSeanceEditor, saveSeance, deleteSeance, addExoToBuilder, removeFromBuilder,
  toggleSuperset, setBuilderExoId, setBuilderSeries, setBuilderReps, setBuilderCharge,
  setBuilderRepos, setBuilderPairedExoId, setBuilderPairedReps, setBuilderPairedCharge,
  toggleBuilderDay,
  // accueil.js
  selectAccueilSeance, resetAccueilToToday,
  // historique.js
  showHistDetail,
  // poids.js
  openPoidsModal, savePoids,
  // calendrier.js
  openBlocEditor, saveBloc, deleteBloc, selectBlocColor, calShiftMonth,
  // timer.js
  startSeance, validateSet, skipRest, confirmStopSeance, openSwapExo, skipCurrentExo,
  openAddExoMidSession, pickExoForSession, updateActiveCharge, updateActiveReps,
  // data-io.js
  exportData, triggerImportFile, importData,
};

/* ---------- Event delegation ----------
   Single set of listeners for the whole app: elements declare
   data-action="functionName" (and optionally data-arg="value") for clicks,
   or data-onchange/data-oninput="functionName" for form fields, instead of
   inline onclick/onchange/oninput="...". Keeps markup free of embedded JS
   and means newly rendered elements are wired up automatically, with no
   per-render rebinding.

   Click handlers receive (arg). Change/input handlers receive (element) —
   the field itself — since they typically need .value, .checked, or a
   sibling data-idx to know which record they belong to. */
export function initEventDelegation(){
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const fn = actions[el.dataset.action];
    if(typeof fn !== 'function') return;
    const arg = el.dataset.argNum !== undefined ? Number(el.dataset.argNum) : el.dataset.arg;
    fn(arg);
  });
  document.addEventListener('change', (e) => {
    const name = e.target.dataset.onchange;
    if(!name) return;
    const fn = actions[name];
    if(typeof fn === 'function') fn(e.target);
  });
  document.addEventListener('input', (e) => {
    const name = e.target.dataset.oninput;
    if(!name) return;
    const fn = actions[name];
    if(typeof fn === 'function') fn(e.target);
  });
}
