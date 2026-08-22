/**
 * ResultsScreen — Mission Debrief / Score Summary
 */

import { soundManager } from '../../audio/index.js';
import { getLevelById, calculateStars, isLevelUnlocked } from '../../game/levels.js';
import { SaveManager } from '../../game/SaveManager.js';

export const ResultsScreen = {
  mount(container, data = {}, router) {
    const sectorId = Number(data.sector) || 1;
    const isVictory = data.victory !== undefined ? !!data.victory : true;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;
    const score = Number(data.score) || 0;
    const kills = Number(data.kills) || 0;
    const accuracy = Number(data.accuracy) || 85;

    // Calculate stars earned
    const stars = levelInfo ? calculateStars(sectorId, score) : (isVictory ? 3 : 0);
    const starString = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    // Record save progression if victory
    if (isVictory) {
      SaveManager.recordSectorVictory(sectorId, score, stars);
    }

    const hasNextSector = sectorId < 10 && isVictory;
    const nextSectorId = sectorId + 1;

    container.innerHTML = `
      <div class="console-panel" style="max-width: 620px; width: 90%;">
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">${isVictory ? 'MISSION COMPLETE' : 'MISSION COMPROMISED'}</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.65rem;">
              THEATER: SECTOR ${sectorId.toString().padStart(2, '0')} // ${escapeHtml(sectorName)}
            </p>
          </div>
          <span class="hud-badge ${isVictory ? 'green' : 'red'}">${isVictory ? 'VICTORY' : 'DEFEAT'}</span>
        </div>

        <div class="results-stats" style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
          <!-- Star Rating -->
          <div class="stat-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(14, 26, 42, 0.65); border: 1px solid rgba(45, 212, 220, 0.2);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-secondary);">PERFORMANCE EVALUATION:</span>
            <span class="stat-val" style="font-family: var(--font-heading); color: var(--amber); letter-spacing: 4px; font-size: 1.1rem; text-shadow: 0 0 10px rgba(255,183,3,0.5);">${starString}</span>
          </div>

          <!-- Final Score -->
          <div class="stat-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(14, 26, 42, 0.65); border: 1px solid rgba(45, 212, 220, 0.2);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-secondary);">FINAL COMBAT SCORE:</span>
            <span class="stat-val" style="font-family: var(--font-heading); color: var(--cyan-bright); font-weight: 700; font-size: 1.1rem; text-shadow: 0 0 10px rgba(0,240,255,0.4);">${score.toLocaleString()} PTS</span>
          </div>

          <!-- Target Breakdown -->
          <div class="stat-row" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: rgba(14, 26, 42, 0.5); border: 1px solid rgba(45, 212, 220, 0.1);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">HOSTILES DESTROYED:</span>
            <span class="stat-val" style="font-family: var(--font-mono); color: var(--text-bright);">${kills > 0 ? kills : (isVictory ? 'ALL CONFIRMED' : 'PARTIAL')}</span>
          </div>

          <!-- Accuracy Ratio -->
          <div class="stat-row" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: rgba(14, 26, 42, 0.5); border: 1px solid rgba(45, 212, 220, 0.1);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">WEAPON ACCURACY:</span>
            <span class="stat-val" style="font-family: var(--font-mono); color: #10b981;">${accuracy}%</span>
          </div>
        </div>

        <div class="screen-footer" style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
          <button class="console-btn btn-secondary" id="btn-results-map">
            <span>◀ SECTOR MAP</span>
          </button>
          <button class="console-btn btn-secondary" id="btn-results-retry">
            <span>RETRY ↻</span>
          </button>
          ${hasNextSector ? `
          <button class="console-btn btn-primary" id="btn-results-next">
            <span>NEXT SECTOR 0${nextSectorId} ▶</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;

    const mapBtn = container.querySelector('#btn-results-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      mapBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const retryBtn = container.querySelector('#btn-results-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('game', { sector: sectorId });
      });
      retryBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const nextBtn = container.querySelector('#btn-results-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('game', { sector: nextSectorId });
      });
      nextBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }
  },

  unmount() {}
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
