/**
 * PauseScreen — In-Game Pause Menu
 */

import { soundManager } from '../../audio/index.js';

export const PauseScreen = {
  mount(container, data = {}, router) {
    const sectorId = data.sector || 1;

    container.innerHTML = `
      <div class="console-panel modal-panel">
        <div class="screen-header">
          <h2 class="hud-heading">MISSION PAUSED</h2>
          <span class="hud-badge amber">STANDBY // SEC ${sectorId.toString().padStart(2, '0')}</span>
        </div>

        <div class="screen-nav-bar vertical">
          <button class="console-btn btn-primary" id="btn-resume-mission">
            <span>▶ RESUME MISSION</span>
          </button>
          <button class="console-btn" id="btn-pause-settings">
            <span>⚙ AUDIO & CONTROLS</span>
          </button>
          <button class="console-btn btn-secondary" id="btn-pause-sector-map">
            <span>🗺 SECTOR MAP</span>
          </button>
          <button class="console-btn btn-danger" id="btn-pause-abort">
            <span>✖ ABORT TO MAIN MENU</span>
          </button>
        </div>
      </div>
    `;

    const resumeBtn = container.querySelector('#btn-resume-mission');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('game', { sector: sectorId });
      });
      resumeBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const settingsBtn = container.querySelector('#btn-pause-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('settings');
      });
      settingsBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const mapBtn = container.querySelector('#btn-pause-sector-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      mapBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const abortBtn = container.querySelector('#btn-pause-abort');
    if (abortBtn) {
      abortBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('landing');
      });
      abortBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }
  },

  unmount() {}
};
