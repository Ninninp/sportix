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
  window.addEventListener('load', async () => {
    try {
      // { type: 'module' } lets sw.js `import` js/version.js directly, so the
      // cache name always matches the current app version with zero manual
      // bookkeeping. Supported in all current mainstream mobile browsers.
      const reg = await navigator.serviceWorker.register('sw.js', { type: 'module' });
      // Ask the browser to check for an updated service worker immediately
      reg.update();

      // Reload the page when a new service worker takes control, so the
      // person always ends up running the assets that match that worker
      // (avoids a stale UI talking to a freshly-activated cache).
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Belt-and-suspenders: also reload on the explicit APP_UPDATED message
      // sent by sw.js after activation, in case controllerchange doesn't
      // fire (e.g. this was the very first install, with no prior controller).
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
