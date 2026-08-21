/* ============================================================
   accueil.js — Home screen: the "séance du jour" hero card, the
   "changer de séance" picker, week stats, and recent PRs.
   ============================================================ */

import { db, DAY_NAMES_FULL } from './state.js';
import { formatDate } from './utils.js';
import { findTodaySeances, currentStreak, computePRs, findBlocForDate, isDeloadToday } from './calculs.js';

// Module-local UI state: which séance the person picked to override
// today's auto-selected one. Only read/written from this file, so a
// plain module-scoped variable is fine here (no cross-module mutation).
let accueilSelectedId = null;

export function selectAccueilSeance(id){
  accueilSelectedId = id;
  renderAccueil();
}

export function resetAccueilToToday(){
  accueilSelectedId = null;
  renderAccueil();
}

export function renderAccueil(){
  renderBlocBanner();
  renderHeroDay();
  renderWeekStats();
  renderRecentPRs();
}

function renderBlocBanner(){
  const bannerWrap = document.getElementById('blocBannerWrap');
  const match = findBlocForDate(new Date());
  if(!match){
    bannerWrap.innerHTML = '';
    return;
  }
  bannerWrap.innerHTML = `<div class="card" style="border-color:${match.bloc.couleur}; margin-bottom:10px; padding:12px 16px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="width:10px; height:10px; border-radius:50%; background:${match.bloc.couleur}; display:inline-block; flex-shrink:0;"></span>
      <div style="font-size:13px; font-weight:600;">Semaine ${match.weekNum}/${match.bloc.semaines} · ${match.bloc.nom}</div>
    </div>
  </div>`;
}

function renderHeroDay(){
  const wrap = document.getElementById('heroDayWrap');

  if(db.seances.length === 0){
    accueilSelectedId = null;
    wrap.innerHTML = `<div class="hero-day">
      <div class="eyebrow">Aujourd'hui</div>
      <h2>Aucune séance prévue</h2>
      <div class="sub">Crée ta première séance dans l'onglet Séances.</div>
      <button class="btn btn-primary btn-block" data-action="switchView" data-arg="seances">Créer une séance</button>
    </div>`;
    return;
  }

  const todaySeances = findTodaySeances();
  // resolve which séance to show: explicit selection > first of today's > null
  let s = null;
  if(accueilSelectedId){
    s = db.seances.find(x => x.id === accueilSelectedId) || null;
    if(!s) accueilSelectedId = null;
  }
  const isAutoToday = !s && todaySeances.length > 0;
  if(isAutoToday) s = todaySeances[0];

  const picker = `
    <div class="card" style="margin-top:-2px;">
      <div class="card-title">Changer de séance</div>
      <div class="pill-scroll">
        <button type="button" class="pill ${isAutoToday ? 'active' : ''}" data-action="resetAccueilToToday">Séance du jour</button>
        <span class="pill-sep"></span>
        ${db.seances.map(sc => {
          const isToday = todaySeances.some(t => t.id === sc.id);
          const isSelected = s && sc.id === s.id && !isAutoToday;
          return `<button type="button" class="pill ${isSelected ? 'active' : ''}" data-action="selectAccueilSeance" data-arg="${sc.id}">${sc.nom}${isToday ? ' •' : ''}</button>`;
        }).join('')}
      </div>
    </div>`;

  if(s){
    const extra = (isAutoToday && todaySeances.length > 1)
      ? `<div class="sub" style="margin-top:-10px; margin-bottom:16px;">+ ${todaySeances.length - 1} autre${todaySeances.length > 2 ? 's' : ''} séance${todaySeances.length > 2 ? 's' : ''} prévue${todaySeances.length > 2 ? 's' : ''} aujourd'hui</div>`
      : '';
    const eyebrow = isAutoToday ? `${DAY_NAMES_FULL[new Date().getDay()]} · Séance du jour` : `Séance choisie`;
    const deloadBadge = isDeloadToday() ? `<span class="pill" style="background:var(--accent-dim); color:var(--accent); margin-left:8px; vertical-align:middle;">DELOAD</span>` : '';
    wrap.innerHTML = `<div class="hero-day">
      <div class="eyebrow">${eyebrow}</div>
      <h2 style="display:inline;">${s.nom}</h2>${deloadBadge}
      <div class="sub">${s.exercices.length} exercices · repos ${s.repos}s entre chaque</div>
      ${extra}
      <button class="btn btn-primary btn-block animate-pulse-glow" data-action="startSeance" data-arg="${s.id}">Démarrer la séance</button>
      <div class="stat-row">
        <div class="stat-box"><div class="num mono">${db.historique.length}</div><div class="lbl">Séances faites</div></div>
        <div class="stat-box"><div class="num mono">${currentStreak()}</div><div class="lbl">Jours de suite</div></div>
      </div>
    </div>` + picker;
  } else {
    wrap.innerHTML = `<div class="hero-day">
      <div class="eyebrow">${DAY_NAMES_FULL[new Date().getDay()]}</div>
      <h2>Repos aujourd'hui</h2>
      <div class="sub">Aucune séance assignée à ce jour. Choisis-en une ci-dessous si tu veux t'entraîner quand même.</div>
      <div class="stat-row">
        <div class="stat-box"><div class="num mono">${db.historique.length}</div><div class="lbl">Séances faites</div></div>
        <div class="stat-box"><div class="num mono">${currentStreak()}</div><div class="lbl">Jours de suite</div></div>
      </div>
    </div>` + picker;
  }
}

function renderWeekStats(){
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekSessions = db.historique.filter(h => new Date(h.date) >= weekAgo);
  const totalVol = weekSessions.reduce((acc, h) => acc + h.volume, 0);
  document.getElementById('weekStats').innerHTML = `
    <div class="stat-box animate-bounce-in" style="animation-delay:0ms;"><div class="num mono">${weekSessions.length}</div><div class="lbl">Séances</div></div>
    <div class="stat-box animate-bounce-in" style="animation-delay:80ms;"><div class="num mono">${Math.round(totalVol)}</div><div class="lbl">Volume (kg)</div></div>
    <div class="stat-box animate-bounce-in" style="animation-delay:160ms;"><div class="num mono">${db.poids.length ? db.poids[db.poids.length - 1].valeur : '—'}</div><div class="lbl">Poids (kg)</div></div>
  `;
}

function renderRecentPRs(){
  const prs = computePRs();
  const recent = Object.values(prs).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const prsEl = document.getElementById('recentPRs');
  if(recent.length === 0){
    prsEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Termine une séance pour voir apparaître tes records.</p>`;
    return;
  }
  prsEl.innerHTML = recent.map((p, i) => `<div class="hist-item animate-slide-in" style="animation-delay:${i * 70}ms;">
    <div class="d"><div class="nm">${p.nom}</div><div class="dt">${formatDate(p.date)}</div></div>
    <div class="vol">${p.charge} kg</div>
  </div>`).join('');
}
