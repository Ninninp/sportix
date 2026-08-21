/* ============================================================
   progression.js — Canvas-based line charts (no charting library).
   drawLineChart() is the shared primitive; it's also used by
   exercices.js (per-exercise charge history in the detail modal).
   ============================================================ */

import { db } from './state.js';

export function renderProgression(){
  drawLineChart('chartPoids', db.poids.map(p => ({ x: p.date, y: p.valeur })), '#F32AA4', 'kg');
  drawLineChart('chartVolume', db.historique.map(h => ({ x: h.date, y: Math.round(h.volume) })), '#78F25A', 'kg');
}

export function drawLineChart(canvasId, points, color, unit){
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.getBoundingClientRect().width || canvas.clientWidth || 300, h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if(points.length === 0){
    ctx.fillStyle = '#9199A5';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pas encore de données', 12, h / 2);
    return;
  }
  points.sort((a, b) => new Date(a.x) - new Date(b.x));
  const ys = points.map(p => p.y);
  const minY = Math.min(...ys) * 0.95, maxY = Math.max(...ys) * 1.05 || 1;
  const pad = 20;
  const stepX = points.length > 1 ? (w - 2 * pad) / (points.length - 1) : 0;
  function px(i){ return pad + i * stepX; }
  function py(v){ return h - pad - ((v - minY) / (maxY - minY || 1)) * (h - 2 * pad); }

  // grid
  ctx.strokeStyle = '#252A33';
  ctx.lineWidth = 1;
  for(let i = 0; i <= 3; i++){
    const y = pad + i * (h - 2 * pad) / 3;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  // line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = px(i), y = py(p.y);
    if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points
  ctx.fillStyle = color;
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(px(i), py(p.y), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // last value label — centered above the last point
  const last = points[points.length - 1];
  const lastX = px(points.length - 1);
  const lastY = py(last.y);
  const label = `${last.y} ${unit}`;
  ctx.font = '700 12px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const labelW = ctx.measureText(label).width;
  const labelX = Math.min(Math.max(lastX, pad + labelW / 2), w - pad - labelW / 2);
  const labelY = Math.max(lastY - 10, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(labelX - labelW / 2 - 5, labelY - 14, labelW + 10, 16);
  ctx.fillStyle = '#F6F9FC';
  ctx.fillText(label, labelX, labelY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
