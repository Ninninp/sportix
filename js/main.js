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
      const reg = await navigator.serviceWorker.register('sw.js', { type: 'module' });
      // Ask the browser to check for an updated service worker immediately
      reg.update();

      // Reload the page when a new service worker takes control to ensure fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Listen for messages from the service worker about updates
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'APP_UPDATED') {
          console.log('New app version available:', e.data.version);
          // Force a reload so clients get the new assets from the newly activated SW
          window.location.reload();
        }
      });
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  });
}
