/**
 * ResultsScreen — Mission Debrief / Score Summary
 */

import { soundManager } from '../../audio/index.js';
import { getLevelById } from '../../game/levels.js';

export const ResultsScreen = {
  mount(container, data = {}, router) {
    const sectorId = data.sector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;

    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">MISSION COMPLETE</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.6rem;">
              THEATER: SECTOR ${sectorId.toString().padStart(2, '0')} // ${escapeHtml(sectorName)}
            </p>
          </div>
          <span class="hud-badge green">VICTORY</span>
        </div>

        <div class="results-stats" style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
          <div class="stat-row" style="display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(14, 26, 42, 0.6); border: 1px solid rgba(45, 212, 220, 0.1);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">SECTOR RATING:</span>
            <span class="stat-val" style="font-family: var(--font-heading); color: var(--amber); letter-spacing: 2px;">★★★☆☆</span>
          </div>
          <div class="stat-row" style="display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(14, 26, 42, 0.6); border: 1px solid rgba(45, 212, 220, 0.1);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">FINAL SCORE:</span>
            <span class="stat-val" style="font-family: var(--font-heading); color: var(--cyan-bright); font-weight: 700;">145,800 PTS</span>
          </div>
          <div class="stat-row" style="display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(14, 26, 42, 0.6); border: 1px solid rgba(45, 212, 220, 0.1);">
            <span class="stat-name" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">HOSTILES NEUTRALIZED:</span>
            <span class="stat-val" style="font-family: var(--font-mono); color: var(--text-bright);">42 TARGETS</span>
          </div>
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" id="btn-results-map">
            <span>◀ SECTOR MAP</span>
          </button>
          <button class="console-btn btn-primary" id="btn-results-retry">
            <span>RETRY MISSION ↻</span>
          </button>
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
