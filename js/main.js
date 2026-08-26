/* ============================================================
   main.js — App entry point. Loaded as a <script type="module"> from
   index.html. Wires up event delegation, does the initial render of
   the three always-visible-on-load pieces (top date, Accueil,
   Séances/Exercices lists so switching tabs is instant), and
   registers the service worker.
   ============================================================ */

import { setTopDate } from './utils.js';
import { initEventDelegation, updateTabSlider } from './nav.js';
import { renderAccueil } from './accueil.js';
import { renderSeancesList } from './seances.js';
import { renderExoList } from './exercices.js';

initEventDelegation();

setTopDate();
renderAccueil();
renderSeancesList();
renderExoList();
updateTabSlider();

if('serviceWorker' in navigator){
  window.addEventListener('load', async () => {
    try {
      // Capture whether this page was already controlled by a service worker
      // BEFORE registering. If it wasn't, any controllerchange that follows
      // is just the first-ever install taking control — not a real update —
      // and reloading on it would interrupt the very first render.
      const hadControllerBefore = !!navigator.serviceWorker.controller;

      // { type: 'module' } lets sw.js `import` js/version.js directly, so the
      // cache name always matches the current app version with zero manual
      // bookkeeping. Supported in all current mainstream mobile browsers.
      const reg = await navigator.serviceWorker.register('sw.js', { type: 'module' });
      // Ask the browser to check for an updated service worker immediately
      reg.update();

      // Reload the page when a new service worker takes control, so the
      // person always ends up running the assets that match that worker
      // (avoids a stale UI talking to a freshly-activated cache). Only do
      // this for a genuine update (there was already a controller before).
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadControllerBefore || refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Belt-and-suspenders: also reload on the explicit APP_UPDATED message
      // sent by sw.js — but sw.js itself now only sends this message when it
      // actually replaced an older cache, so this is already update-only.
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'APP_UPDATED') {
          console.log('New app version available:', e.data.version);
          window.location.reload();
        }
      });
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  });
}
