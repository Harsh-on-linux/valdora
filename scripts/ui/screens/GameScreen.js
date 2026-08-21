/**
 * GameScreen — Active Gameplay View & Tactical HUD Overlay
 * Displays real-time ship integrity, ordnance status, telemetry gauges,
 * mobile on-screen touch fire & boost controls, and game lifecycle management.
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
        <!-- ═══════════ TOP HUD BAR ═══════════ -->
        <div class="hud-top-bar">
          <div class="hud-info-card">
            <span class="hud-label">HULL // SHIELD</span>
            <span class="hud-value" style="display: flex; gap: 8px; font-size: 0.95rem;">
              <span id="hud-hull-val" style="color: var(--cyan-bright)">100%</span>
              <span style="color: var(--text-muted)">|</span>
              <span id="hud-shield-val" style="color: var(--green)">100%</span>
            </span>
          </div>

          <div class="hud-info-card score-card" style="text-align: center;">
            <span class="hud-label">THEATER // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
            <span class="hud-value" style="color: var(--glow-cyan); font-size: 0.95rem;">${escapeHtml(sectorName)}</span>
          </div>

          <div class="hud-info-card score-card">
            <span class="hud-label">MISSION SCORE</span>
            <span class="hud-value" id="hud-score-val" style="color: var(--amber)">000,000</span>
          </div>

          <div class="hud-info-card" style="min-width: 75px; text-align: right;">
            <span class="hud-label">SIM FPS</span>
            <span class="hud-value" id="hud-fps-val" style="color: var(--glow-cyan); font-size: 0.95rem;">60</span>
          </div>

          <button class="console-btn btn-sm" id="btn-pause" title="Pause Mission (Esc / P)">
            <span>⏸ PAUSE</span>
          </button>
        </div>

        <!-- ═══════════ MIDDLE FLIR TELEMETRY ═══════════ -->
        <div class="hud-mid-telemetry">
          <div class="hud-wingman-card">
            <div>SPD: <span id="hud-speed-val" style="color: #ffffff;">0</span> KM/S</div>
            <div>THR: <span id="hud-thrust-val" style="color: var(--amber);">50</span>%</div>
            <div>BANK: <span id="hud-bank-val" style="color: var(--cyan-bright);">0.0</span>°</div>
          </div>
        </div>

        <!-- ═══════════ ON-SCREEN TOUCH CONTROLS (MOBILE) ═══════════ -->
        <div class="hud-touch-controls">
          <div class="hud-touch-left-hint">
            <span>✜ TOUCH LEFT TO PILOT</span>
            <span style="font-size: 0.6rem; color: var(--text-secondary);">DYNAMIC JOYSTICK</span>
          </div>

          <div class="hud-touch-right-actions">
            <button class="touch-action-btn" id="btn-touch-boost" title="Engage Thruster Boost">
              <span class="touch-action-icon">⚡</span>
              <span>BOOST</span>
            </button>
            <button class="touch-action-btn fire-btn" id="btn-touch-fire" title="Primary Fire">
              <span class="touch-action-icon">⦿</span>
              <span>FIRE</span>
            </button>
          </div>
        </div>

        <!-- ═══════════ BOTTOM HUD BAR ═══════════ -->
        <div class="hud-bottom-bar">
          <div class="hud-info-card">
            <span class="hud-label">PAYLOAD // DRONE CHASSIS</span>
            <span class="hud-value" style="color: var(--glow-amber); font-size: 0.9rem;">
              ${escapeHtml(weaponName)} · ${escapeHtml(droneName)}
            </span>
          </div>

          <div class="hud-info-card" style="font-family: var(--font-hud-mono, monospace); font-size: 0.75rem; color: var(--text-secondary);">
            <span>TIME: <span id="hud-sim-time" style="color: var(--cyan)">0.0s</span></span>
            <span style="margin-left: 10px;">MODE: <span id="hud-control-scheme" style="color: var(--green)">AUTO</span></span>
          </div>

          <div class="hud-actions-right">
            <button class="console-btn btn-sm btn-secondary" id="btn-abort-to-map">
              <span>◀ ABORT</span>
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
      const shieldEl = container.querySelector('#hud-shield-val');
      const speedEl = container.querySelector('#hud-speed-val');
      const thrustEl = container.querySelector('#hud-thrust-val');
      const bankEl = container.querySelector('#hud-bank-val');
      const simTimeEl = container.querySelector('#hud-sim-time');
      const schemeEl = container.querySelector('#hud-control-scheme');

      const onTelemetry = (telem) => {
        if (fpsEl) fpsEl.textContent = telem.fps;
        if (scoreEl) scoreEl.textContent = String(telem.score).padStart(6, '0');
        if (hullEl) hullEl.textContent = `${Math.round((telem.hull / (telem.maxHull || 100)) * 100)}%`;
        if (shieldEl) shieldEl.textContent = `${Math.round((telem.shield / (telem.maxShield || 100)) * 100)}%`;
        if (speedEl) speedEl.textContent = telem.speed || 0;
        if (thrustEl) thrustEl.textContent = telem.thrust || 50;
        if (bankEl) bankEl.textContent = (telem.bankAngle * (180 / Math.PI)).toFixed(1);
        if (simTimeEl) simTimeEl.textContent = `${telem.simTime}s`;
        if (schemeEl) schemeEl.textContent = telem.controlScheme ? telem.controlScheme.toUpperCase() : 'AUTO';
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

    // 3. Touch Action Buttons (Fire & Boost)
    const touchFireBtn = container.querySelector('#btn-touch-fire');
    if (touchFireBtn && activeEngine) {
      const setFire = (firing) => {
        if (activeEngine.input) {
          activeEngine.input.touchFire.active = firing;
          activeEngine.input.actions.fire = firing;
        }
        touchFireBtn.classList.toggle('active', firing);
      };

      touchFireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setFire(true); }, { passive: false });
      touchFireBtn.addEventListener('touchend', (e) => { e.preventDefault(); setFire(false); });
      touchFireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setFire(false); });
      touchFireBtn.addEventListener('mousedown', (e) => { e.preventDefault(); setFire(true); });
      window.addEventListener('mouseup', () => setFire(false));
    }

    const touchBoostBtn = container.querySelector('#btn-touch-boost');
    if (touchBoostBtn && activeEngine) {
      const setBoost = (boosting) => {
        if (activeEngine.input) {
          activeEngine.input.actions.boost = boosting;
        }
        touchBoostBtn.classList.toggle('active', boosting);
      };

      touchBoostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setBoost(true); }, { passive: false });
      touchBoostBtn.addEventListener('touchend', (e) => { e.preventDefault(); setBoost(false); });
      touchBoostBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setBoost(false); });
      touchBoostBtn.addEventListener('mousedown', (e) => { e.preventDefault(); setBoost(true); });
      window.addEventListener('mouseup', () => setBoost(false));
    }

    // 4. Keyboard Escape to Pause
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
