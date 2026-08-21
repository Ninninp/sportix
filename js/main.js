/* ============================================================
   main.js — App entry point. Loaded as a <script type="module"> from
   index.html. Wires up event delegation, does the initial render of
   the three always-visible-on-load pieces (top date, Accueil,
   Séances/Exercices lists so switching tabs is instant), and
   registers the service worker.
   ============================================================ */

import { setTopDate } from './utils.js';
import { initEventDelegation } from './nav.js';
import { renderAccueil } from './accueil.js';
import { renderSeancesList } from './seances.js';
import { renderExoList } from './exercices.js';

initEventDelegation();

setTopDate();
renderAccueil();
renderSeancesList();
renderExoList();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    // { type: 'module' } lets sw.js 'import' js/version.js directrly,
    // so the cache name always matches the current app version with zero manual bookkeeping.
    // Supported in all current mainstream mobile browsers.
    navigator.serviceWorker.register('sw.js', { type: 'module' }).catch(err => console.log('SW registration failed:', err));
  });
}
