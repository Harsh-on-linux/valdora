/**
 * LoadoutScreen — Ship & Weapon Selection View
 * Previews selected strike drone variant and payload config before launch.
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { soundManager } from '../../audio/index.js';

export const LoadoutScreen = {
  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const sectorId = data.sector || save.currentSector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;

    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">HANGAR LOADOUT</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.6rem;">
              TARGET THEATER: SECTOR ${sectorId.toString().padStart(2, '0')} // ${escapeHtml(sectorName)}
            </p>
          </div>
          <span class="hud-badge amber">STATUS: ARMED</span>
        </div>

        <p class="hud-desc">Configure hull chassis and primary weapon payload for deployment to ${escapeHtml(sectorName)}.</p>

        <div class="placeholder-box" style="padding: 24px 16px; border: 1px dashed rgba(45, 212, 220, 0.3); background: rgba(8, 16, 26, 0.4); text-align: center; margin: 16px 0;">
          <div style="font-family: var(--font-heading); font-size: 0.9rem; color: var(--cyan-bright); margin-bottom: 8px;">
            STRIKE CHASSIS: [ ${escapeHtml(save.selectedDrone || 'STRIKER')} ] · PAYLOAD: [ ${escapeHtml(save.selectedPayload || 'VULCAN')} ]
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">
            TACTICAL RESTRAINT // SHIP CUSTOMIZATION & CHASSIS SELECTION MODULE UNLOCKS IN PHASE D (STEPS 11-12)
          </div>
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" id="btn-loadout-back">
            <span>◀ SECTOR MAP</span>
          </button>
          <button class="console-btn btn-primary" id="btn-loadout-launch">
            <span>⚡ LAUNCH MISSION // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
          </button>
        </div>
      </div>
    `;

    const backBtn = container.querySelector('#btn-loadout-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      backBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const launchBtn = container.querySelector('#btn-loadout-launch');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        soundManager.playStart();
        SaveManager.save({ currentSector: sectorId });
        if (router) router.show('game', { sector: sectorId });
      });
      launchBtn.addEventListener('mouseenter', () => soundManager.playHover());
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
