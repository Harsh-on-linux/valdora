/**
 * ResultsScreen — Mission Debrief (v2)
 * Verdict → stars+grade hero → score → 4 key stats → actions.
 * Instant render (no roll-up timers); details folded into one meta line.
 */

import { soundManager } from '../../audio/index.js';
import { getLevelById, calculateStars } from '../../game/levels.js';
import { SaveManager } from '../../game/SaveManager.js';

let keyHandler = null;
let fanfareTimer = null;

export const ResultsScreen = {
  mount(container, data = {}, router) {
    const sectorId = Number(data.sector) || 1;
    const isVictory = data.victory !== undefined ? !!data.victory : true;
    const levelInfo = getLevelById(sectorId) || {
      id: sectorId, code: `SEC-${String(sectorId).padStart(2, '0')}`,
      name: `SECTOR ${String(sectorId).padStart(2, '0')}`,
      scoreThresholds: { star1: 1000, star2: 2000, star3: 3000 }
    };
    const thresholds = levelInfo.scoreThresholds || { star1: 1000, star2: 2000, star3: 3000 };
    const baseScore = Number.isFinite(Number(data.baseScore)) ? Number(data.baseScore) : (Number(data.score) || 0);
    const score = Number(data.score) || baseScore;
    const accuracy = Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : 85;
    const hullPct = Number.isFinite(Number(data.hullPct)) ? Number(data.hullPct) : (isVictory ? 100 : 0);
    const timeElapsed = Number(data.timeElapsed) || 0;
    const kills = Number(data.kills) || 0;
    const accuracyBonus = Number(data.accuracyBonus) || 0;
    const hullBonus = Number(data.hullBonus) || 0;
    const timeBonus = Number(data.timeBonus) || 0;
    const pickups = Number(data.pickupsCollected) || 0;
    const droneName = data.drone || 'STRIKER';
    const weaponName = data.weapon || 'VULCAN';

    const stars = isVictory ? calculateStars(sectorId, baseScore) : 0;
    let grade = data.grade;
    if (!grade) {
      if (!isVictory) grade = 'MIA';
      else if (stars === 3 && accuracy >= 80) grade = 'S';
      else if (stars >= 2 && accuracy >= 60) grade = 'A';
      else if (stars >= 1) grade = 'B';
      else grade = 'C';
    }

    let recordMeta = { isNewRecord: false, newlyUnlocked: false };
    if (isVictory) {
      try { recordMeta = SaveManager.recordSectorVictory(sectorId, score, stars); } catch (_) {}
    }
    const hasNext = isVictory && sectorId < 10;
    const nextId = sectorId + 1;
    const maxT = thresholds.star3 || 10000;
    const fillPct = Math.min(100, Math.round((baseScore / maxT) * 100));

    const starHtml = [0, 1, 2].map(i =>
      `<span class="eval-star-slot${i < stars ? ' active' : ''}">★</span>`).join('');

    container.innerHTML = `
      <div class="console-panel results-panel results-v2">
        <div class="results-header-banner">
          <div class="results-title-group">
            <h2 class="${isVictory ? '' : 'defeat'}">${isVictory ? 'MISSION ACCOMPLISHED' : 'MISSION COMPROMISED'}</h2>
            <div class="results-subtitle">${escapeHtml(levelInfo.code || '')} // ${escapeHtml((levelInfo.name || '').toUpperCase())}</div>
          </div>
          <span class="results-status-badge ${isVictory ? 'victory' : 'defeat'}">${isVictory ? 'SECURED' : 'HULL LOST'}</span>
        </div>

        <div class="results-hero">
          <div class="eval-stars-array">${starHtml}</div>
          <div class="eval-grade-value grade-${String(grade).toLowerCase()}">${grade}</div>
          <div class="total-score-value">${score.toLocaleString()}</div>
          ${recordMeta.isNewRecord ? `<div class="results-alert-banner">★ NEW SECTOR RECORD</div>` : ''}
          ${recordMeta.newlyUnlocked && hasNext ? `<div class="results-alert-banner unlock">🔓 SECTOR ${String(nextId).padStart(2, '0')} UNLOCKED</div>` : ''}
        </div>

        <div class="results-threshold-gauge">
          <div class="threshold-track">
            <div class="threshold-fill" style="width:${fillPct}%"></div>
          </div>
          <div class="threshold-labels"><span>1★ ${thresholds.star1.toLocaleString()}</span><span>2★ ${thresholds.star2.toLocaleString()}</span><span>3★ ${thresholds.star3.toLocaleString()}</span></div>
        </div>

        <div class="results-breakdown-grid results-grid-4">
          <div class="stat-card"><div class="stat-card-name">TARGETS</div><div class="stat-card-main-val">${kills || (isVictory ? 'CLEARED' : '—')}</div><div class="stat-card-sub"><span>+${baseScore.toLocaleString()} PTS</span></div></div>
          <div class="stat-card"><div class="stat-card-name">ACCURACY</div><div class="stat-card-main-val">${accuracy}%</div><div class="stat-card-sub"><span>+${accuracyBonus.toLocaleString()} PTS</span></div></div>
          <div class="stat-card"><div class="stat-card-name">HULL</div><div class="stat-card-main-val">${hullPct}%</div><div class="stat-card-sub"><span>+${hullBonus.toLocaleString()} PTS</span></div></div>
          <div class="stat-card"><div class="stat-card-name">TIME</div><div class="stat-card-main-val">${formatTime(timeElapsed)}</div><div class="stat-card-sub"><span>+${timeBonus.toLocaleString()} PTS</span></div></div>
        </div>

        <div class="results-meta-line">${pickups} DROPS · ${escapeHtml(droneName)} · ${escapeHtml(weaponName)}</div>

        <div class="results-nav-footer">
          <button class="console-btn btn-secondary" id="btn-results-map"><span>◀ MAP [M]</span></button>
          <button class="console-btn btn-secondary" id="btn-results-retry"><span>RETRY [R]</span></button>
          ${hasNext ? `<button class="console-btn btn-primary" id="btn-results-next"><span>NEXT 0${nextId} ▶</span></button>` : ''}
        </div>
      </div>
    `;

    // Star fanfare (single delayed chord, no per-star timers)
    if (fanfareTimer) clearTimeout(fanfareTimer);
    fanfareTimer = null;
    if (stars > 0) {
      fanfareTimer = setTimeout(() => { fanfareTimer = null; try { soundManager.playStarAward?.(stars - 1); } catch (_) {} }, 350);
    }

    const go = (screen, s) => { soundManager.playClick(); if (router) router.show(screen, { sector: s }); };
    container.querySelector('#btn-results-map')?.addEventListener('click', () => go('levelSelect', sectorId));
    container.querySelector('#btn-results-retry')?.addEventListener('click', () => { soundManager.playStart(); if (router) router.show('game', { sector: sectorId }); });
    container.querySelector('#btn-results-next')?.addEventListener('click', () => { soundManager.playStart(); if (router) router.show('game', { sector: nextId }); });
    container.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => soundManager.playHover()));

    keyHandler = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); soundManager.playStart(); if (router) router.show('game', { sector: hasNext ? nextId : sectorId }); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); soundManager.playStart(); if (router) router.show('game', { sector: sectorId }); }
      else if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') { e.preventDefault(); go('levelSelect', sectorId); }
    };
    window.addEventListener('keydown', keyHandler);
  },

  unmount() {
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (fanfareTimer) { clearTimeout(fanfareTimer); fanfareTimer = null; }
  }
};

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
