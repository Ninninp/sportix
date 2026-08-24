/* ============================================================
   utils.js — Small, dependency-free helpers shared across modules:
   modal open/close, date formatting, and the app's own confirm/info
   dialogs (used instead of window.confirm/alert, which can be
   silently blocked in sandboxed preview iframes).
   ============================================================ */

export function openModal(id){
  const overlay = document.getElementById(id);
  overlay.classList.remove('hidden', 'closing');
  // Force layout so the browser registers the "hidden" starting state
  // before we add "open" — otherwise the transition can get skipped.
  overlay.offsetHeight;
  overlay.classList.add('open');
}
export function closeModal(id){
  const overlay = document.getElementById(id);
  if(overlay.classList.contains('hidden')) return;
  overlay.classList.remove('open');
  overlay.classList.add('closing');
  const onEnd = (e) => {
    if(e.target !== overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
    overlay.removeEventListener('transitionend', onEnd);
  };
  overlay.addEventListener('transitionend', onEnd);
}

export function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function setTopDate(){
  const d = new Date();
  const opts = { weekday: 'short', day: '2-digit', month: 'short' };
  document.getElementById('topDate').textContent = d.toLocaleDateString('fr-FR', opts).toUpperCase();
}

/* ---------- CONFIRM HELPER (replaces window.confirm) ---------- */
export function showConfirm(message, onConfirm, title){
  document.getElementById('confirmTitle').textContent = title || 'Confirmer';
  document.getElementById('confirmMessage').textContent = message;
  const btn = document.getElementById('confirmActionBtn');
  // Clone-and-replace clears any listener from a previous showConfirm() call,
  // since the button is reused across every confirmation dialog in the app.
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    closeModal('modalConfirm');
    onConfirm();
  });
  openModal('modalConfirm');
}

/* ---------- INFO HELPER (replaces window.alert) ---------- */
export function showInfo(message, title){
  document.getElementById('infoTitle').textContent = title || 'Info';
  document.getElementById('infoMessage').textContent = message;
  openModal('modalInfo');
}
