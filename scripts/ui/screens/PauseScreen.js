/**
 * PauseScreen — In-Game Pause Menu (v2)
 * Adds a live mission snapshot (score / wave / hull) so resume is informed.
 */

import { soundManager } from '../../audio/index.js';

let pauseKeyHandler = null;

export const PauseScreen = {
  mount(container, data = {}, router) {
    const sectorId = data.sector || 1;
    const eng = window.__gameEngine;
    const t = eng?.getTelemetry?.() || {};
    const pad = (n) => String(n).padStart(2, '0');
    const hullPct = t.maxHull ? Math.round((t.hull / t.maxHull) * 100) : null;

    container.innerHTML = `
      <div class="console-panel modal-panel pause-v2">
        <div class="screen-header">
          <h2 class="hud-heading">PAUSED</h2>
          <span class="hud-badge amber">SEC ${pad(sectorId)} STANDBY</span>
        </div>

        <div class="pause-snapshot">
          <div><span>SCORE</span><strong>${Number(t.score || 0).toLocaleString()}</strong></div>
          <div><span>WAVE</span><strong>${t.currentWave || '—'}/${t.totalWaves || '—'}</strong></div>
          <div><span>HULL</span><strong>${hullPct !== null ? hullPct + '%' : '—'}</strong></div>
        </div>

        <div class="screen-nav-bar vertical">
          <button class="console-btn btn-primary btn-lg" id="btn-resume-mission">
            <span>▶ RESUME MISSION</span>
          </button>
          <button class="console-btn" id="btn-pause-settings">
            <span>⚙ AUDIO & CONTROLS</span>
          </button>
          <div class="landing-duo">
            <button class="console-btn btn-secondary" id="btn-pause-sector-map">
              <span>🗺 SECTORS</span>
            </button>
            <button class="console-btn btn-danger" id="btn-pause-abort">
              <span>✖ QUIT</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const resumeAction = () => {
      soundManager.playClick();
      if (router) router.show('game', { sector: sectorId, resuming: true });
    };

    container.querySelector('#btn-resume-mission')?.addEventListener('click', resumeAction);
    container.querySelector('#btn-pause-settings')?.addEventListener('click', () => {
      soundManager.playClick();
      if (router) router.show('settings');
    });
    container.querySelector('#btn-pause-sector-map')?.addEventListener('click', () => {
      soundManager.playClick();
      if (window.__gameEngine) window.__gameEngine.stop();
      if (router) router.show('levelSelect', { sector: sectorId });
    });
    container.querySelector('#btn-pause-abort')?.addEventListener('click', () => {
      soundManager.playClick();
      if (window.__gameEngine) window.__gameEngine.stop();
      if (router) router.show('landing');
    });
    container.querySelectorAll('button').forEach(b =>
      b.addEventListener('mouseenter', () => soundManager.playHover()));

    pauseKeyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') resumeAction();
    };
    window.addEventListener('keydown', pauseKeyHandler);
  },

  unmount() {
    if (pauseKeyHandler) {
      window.removeEventListener('keydown', pauseKeyHandler);
      pauseKeyHandler = null;
    }
  }
};
