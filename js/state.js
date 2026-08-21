/* ============================================================
   state.js — Persisted data (localStorage) + shared in-memory
   state used across multiple modules.

   `db` is exported as a live binding: any module can read `db.seances`
   etc, and after mutating it should call `saveDB()`. We don't wrap it
   in a class/store — the app is small enough that a shared mutable
   object plus an explicit save call is simpler to follow than adding
   a pub/sub layer for a single-user, single-tab app.
   ============================================================ */

export function uid(){
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DB_KEY = 'suiviSportData_v1';

function loadDB(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return { exercices: [], seances: [], historique: [], poids: [], blocs: [] };
}

export function saveDB(){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export let db = loadDB();
if(!Array.isArray(db.blocs)) db.blocs = []; // migration: field added after initial release

/* Import (from a user-provided JSON backup) needs to swap out the entire
   `db` contents. Since `db` is an ES module binding, other modules that
   `import { db }` hold a read-only view of that binding — they can read
   db.seances etc, but `db = something` from outside this file would throw.
   Mutating the object's own keys in place works everywhere, though,
   because every importer already points at this same object. */
export function replaceDB(newDb){
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, newDb);
}

// Seed a handful of default exercises on first run so the app isn't empty.
if(db.exercices.length === 0){
  db.exercices = [
    { id: uid(), nom: 'Développé couché', groupe: 'Pectoraux' },
    { id: uid(), nom: 'Squat', groupe: 'Jambes' },
    { id: uid(), nom: 'Tractions', groupe: 'Dos' },
    { id: uid(), nom: 'Développé militaire', groupe: 'Épaules' },
    { id: uid(), nom: 'Curl biceps', groupe: 'Bras' },
  ];
  saveDB();
}

/* ---------- Shared lookup tables ---------- */
export const DAY_NAMES = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
export const DAY_NAMES_FULL = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
export const BLOC_COLORS = ['#78F25A', '#F32AA4', '#3DA5FF', '#B83DFF', '#3DFFC4', '#FF9F3D'];
export const BLOC_TYPE_LABELS = { specialisation:'Spécialisation', volume:'Volume', force:'Force', deload:'Deload', autre:'Autre' };

/* ---------- Cross-module transient UI state ----------
   These aren't persisted — they only matter while a modal/session is
   open. Kept here (rather than local to one module) because several
   modules need to read or reset them (e.g. the timer module resets
   builder state when a séance is edited mid-session in a future
   feature, and nav.js resets accueilSelectedId on data import). */
export const uiState = {
  // bloc editor (calendar)
  editingBlocId: null,
  selectedBlocColor: BLOC_COLORS[0],
  calCursor: new Date(), // month currently displayed in the calendar

  // active séance / timer engine — shared because calculs.js needs to
  // check activeSession.isDeload when suggesting a charge mid-session
  activeSession: null, // {seance, exoIdx, setIdx, results, ...} — see timer.js
  timerInterval: null,
};
