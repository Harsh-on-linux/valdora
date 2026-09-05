/**
 * LandingScreen — Home / Title View (v2)
 * One hero, one primary CTA, one next-sector card. Secondary actions live
 * in a compact footer row so new players know where to go in 2 seconds.
 */

import { SaveManager } from '../../game/index.js';
import { soundManager } from '../../audio/index.js';

const SECTOR_NAMES = {
  1: 'ORBITAL REACH',
  2: 'ASTEROID FRINGE',
  3: 'TURRET OUTPOST',
  4: 'INVASION VECTOR',
  5: 'MOBILE COMMAND',
  6: 'NEBULA GAUNTLET',
  7: 'JAMMER CORRIDOR',
  8: 'SIEGE PLATFORM',
  9: 'DREADNOUGHT APPROACH',
  10: 'APEX TARGET'
};

export const LandingScreen = {
  mount(container, data, router) {
    const hasSave = SaveManager.hasSave();
    const save = SaveManager.getSaveData();

    const currentSector = save.currentSector || 1;
    const sectorName = SECTOR_NAMES[currentSector] || `SECTOR ${currentSector}`;
    const maxUnlocked = save.maxSectorUnlocked || 1;
    const highScore = save.highScore || 0;
    const callsign = save.pilotCallsign || 'PHANTOM';
    const pad = (n) => String(n).padStart(2, '0');

    const primaryBtn = hasSave
      ? `<button class="console-btn btn-primary btn-lg" id="btn-continue-mission" data-action="continue">
           <span>▶ CONTINUE — SECTOR ${pad(currentSector)} ${sectorName}</span>
           <span class="btn-subtext">BEST ${highScore.toLocaleString()} PTS · PILOT ${callsign}</span>
         </button>`
      : `<button class="console-btn btn-primary btn-lg" id="btn-start-mission" data-action="start">
           <span>▶ START MISSION</span>
           <span class="btn-subtext">SECTOR 01 · ORBITAL REACH</span>
         </button>`;

    container.innerHTML = `
      <div class="console-panel landing-card landing-v2">
        <div class="telemetry-bar">
          <div class="status-badge"><span class="pulse-dot"></span> HUD SYS ONLINE</div>
          <div>PILOT ${callsign} // SEC ${pad(currentSector)}</div>
        </div>

        <div class="logo-container">
          <h1 class="hud-title hologram">SPACE SHOOTER</h1>
          <p class="hud-subtitle">TACTICAL COCKPIT // MK-IV COMBAT HUD</p>
          <div class="hud-brackets">
            <span class="hud-bracket-line"></span>
            <span class="hud-badge">${hasSave ? `ACTIVE: SECTOR ${pad(currentSector)}` : 'READY FOR DEPLOYMENT'}</span>
            <span class="hud-bracket-line"></span>
          </div>
        </div>

        <div class="screen-nav-bar vertical">
          ${primaryBtn}
          ${hasSave ? `
          <button class="console-btn btn-secondary" id="btn-new-campaign" data-action="new-campaign">
            <span>↺ NEW CAMPAIGN</span>
          </button>` : ''}

          <div class="landing-duo">
            <button class="console-btn" data-nav="levelSelect">
              <span>🗺 SECTORS</span>
              <span class="btn-subtext">${maxUnlocked}/10 UNLOCKED</span>
            </button>
            <button class="console-btn" data-nav="loadout">
              <span>🚀 LOADOUT</span>
              <span class="btn-subtext">${save.selectedDrone || 'STRIKER'}</span>
            </button>
          </div>

          <div class="screen-footer landing-foot">
            <button class="icon-btn" data-nav="howToPlay" title="How to play">❓</button>
            <button class="icon-btn" data-nav="settings" title="Settings">⚙</button>
            <button class="icon-btn" data-nav="showcase" title="UI showcase">◎</button>
          </div>
        </div>
      </div>
    `;

    const startBtn = container.querySelector('#btn-start-mission');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('game', { sector: 1 });
      });
    }

    const continueBtn = container.querySelector('#btn-continue-mission');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        soundManager.playContinue();
        if (router) router.show('game', { sector: currentSector });
      });
    }

    const newCampaignBtn = container.querySelector('#btn-new-campaign');
    if (newCampaignBtn) {
      newCampaignBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (confirm('Start a new campaign? Progress resets to Sector 1.')) {
          SaveManager.startNewCampaign();
          soundManager.playStart();
          if (router) router.show('landing');
        }
      });
    }

    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) router.show(target);
      });
    });

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundManager.playHover());
    });
  },

  unmount() {}
};
