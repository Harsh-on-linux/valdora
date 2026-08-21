/**
 * GameScreen — Active Gameplay View & HUD Root
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { soundManager } from '../../audio/index.js';

export const GameScreen = {
  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const sectorId = data.sector || save.currentSector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;
    const droneName = save.selectedDrone || 'STRIKER';
    const weaponName = save.selectedPayload || 'VULCAN CANNON';

    // Show the game canvas during gameplay
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) gameCanvas.classList.add('active');

    container.innerHTML = `
      <div class="hud-layer">
        <div class="hud-top-bar">
          <div class="hud-info-card">
            <span class="hud-label">HULL INTEGRITY</span>
            <span class="hud-value" style="color: var(--cyan-bright)">100%</span>
          </div>

          <div class="hud-info-card score-card" style="text-align: center;">
            <span class="hud-label">THEATER // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
            <span class="hud-value" style="color: var(--glow-cyan); font-size: 0.95rem;">${escapeHtml(sectorName)}</span>
          </div>

          <div class="hud-info-card score-card">
            <span class="hud-label">MISSION SCORE</span>
            <span class="hud-value" style="color: var(--amber)">000,000</span>
          </div>

          <button class="console-btn btn-sm" id="btn-pause">
            <span>⏸ PAUSE</span>
          </button>
        </div>

        <div class="hud-bottom-bar">
          <div class="hud-info-card">
            <span class="hud-label">PRIMARY WEAPON // CRAFT</span>
            <span class="hud-value" style="color: var(--glow-amber)">${escapeHtml(weaponName)} · ${escapeHtml(droneName)}</span>
          </div>

          <div class="hud-actions-right">
            <button class="console-btn btn-sm btn-secondary" id="btn-abort-to-map">
              <span>◀ ABORT TO MAP</span>
            </button>
            <button class="console-btn btn-sm btn-primary" id="btn-test-results">
              <span>DEBRIEF ▶</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const pauseBtn = container.querySelector('#btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('pause', { sector: sectorId });
      });
      pauseBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const abortBtn = container.querySelector('#btn-abort-to-map');
    if (abortBtn) {
      abortBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      abortBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const resultsBtn = container.querySelector('#btn-test-results');
    if (resultsBtn) {
      resultsBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('results', { sector: sectorId });
      });
      resultsBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }
  },

  unmount() {
    // Hide the game canvas when leaving gameplay
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) gameCanvas.classList.remove('active');
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
