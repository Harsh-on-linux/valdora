/**
 * GameScreen — Active Gameplay View & HUD Root
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { soundManager } from '../../audio/index.js';
import { GameEngine, ENGINE_STATE } from '../../game/GameEngine.js';

let activeEngine = null;
let telemetryUnsub = null;
let keyHandler = null;

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
            <span class="hud-value" id="hud-hull-val" style="color: var(--cyan-bright)">100%</span>
          </div>

          <div class="hud-info-card score-card" style="text-align: center;">
            <span class="hud-label">THEATER // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
            <span class="hud-value" style="color: var(--glow-cyan); font-size: 0.95rem;">${escapeHtml(sectorName)}</span>
          </div>

          <div class="hud-info-card score-card">
            <span class="hud-label">MISSION SCORE</span>
            <span class="hud-value" id="hud-score-val" style="color: var(--amber)">000,000</span>
          </div>

          <div class="hud-info-card" style="min-width: 80px; text-align: right;">
            <span class="hud-label">SIM FPS</span>
            <span class="hud-value" id="hud-fps-val" style="color: var(--glow-cyan); font-size: 0.95rem;">60</span>
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

          <div class="hud-info-card" style="font-family: var(--font-hud-mono); font-size: 0.75rem; color: var(--text-secondary);">
            <span>SIM TIME: <span id="hud-sim-time" style="color: var(--cyan)">0.0s</span></span>
            <span style="margin-left: 12px;">STATUS: <span id="hud-sim-status" style="color: var(--green)">ACTIVE</span></span>
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

    // 1. Initialize or connect to GameEngine
    if (!window.__gameEngine && gameCanvas) {
      window.__gameEngine = new GameEngine(gameCanvas);
    }
    activeEngine = window.__gameEngine;

    if (activeEngine) {
      // If coming back from pause, resume; otherwise start fresh
      if (activeEngine.state === ENGINE_STATE.PAUSED && data.resuming) {
        activeEngine.resume();
      } else {
        activeEngine.start({
          sector: sectorId,
          drone: droneName,
          weapon: weaponName
        });
      }

      // Hook up live HUD telemetry listener
      const fpsEl = container.querySelector('#hud-fps-val');
      const scoreEl = container.querySelector('#hud-score-val');
      const hullEl = container.querySelector('#hud-hull-val');
      const simTimeEl = container.querySelector('#hud-sim-time');
      const statusEl = container.querySelector('#hud-sim-status');

      const onTelemetry = (telem) => {
        if (fpsEl) fpsEl.textContent = telem.fps;
        if (scoreEl) scoreEl.textContent = String(telem.score).padStart(6, '0');
        if (hullEl) hullEl.textContent = `${Math.round((telem.hull / (telem.maxHull || 100)) * 100)}%`;
        if (simTimeEl) simTimeEl.textContent = `${telem.simTime}s`;
        if (statusEl) statusEl.textContent = telem.state;
      };

      activeEngine.on('telemetry', onTelemetry);
      telemetryUnsub = () => activeEngine.off('telemetry', onTelemetry);
    }

    // 2. Button Event Listeners
    const pauseBtn = container.querySelector('#btn-pause');
    const triggerPause = () => {
      soundManager.playClick();
      if (activeEngine) activeEngine.pause();
      if (router) router.show('pause', { sector: sectorId });
    };

    if (pauseBtn) {
      pauseBtn.addEventListener('click', triggerPause);
      pauseBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const abortBtn = container.querySelector('#btn-abort-to-map');
    if (abortBtn) {
      abortBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (activeEngine) activeEngine.stop();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      abortBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const resultsBtn = container.querySelector('#btn-test-results');
    if (resultsBtn) {
      resultsBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (activeEngine) activeEngine.stop();
        if (router) router.show('results', { sector: sectorId });
      });
      resultsBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // 3. Keyboard Escape to Pause
    keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        triggerPause();
      }
    };
    window.addEventListener('keydown', keyHandler);
  },

  unmount() {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (telemetryUnsub) {
      telemetryUnsub();
      telemetryUnsub = null;
    }

    // Note: If navigating to 'pause', engine is paused, otherwise stop
    const activeScreen = window.__screenManager?.currentScreenName;
    if (activeEngine && activeScreen !== 'pause') {
      activeEngine.stop();
    }

    // Hide the game canvas when leaving gameplay (unless in pause screen)
    if (activeScreen !== 'pause') {
      const gameCanvas = document.getElementById('game-canvas');
      if (gameCanvas) gameCanvas.classList.remove('active');
    }
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
