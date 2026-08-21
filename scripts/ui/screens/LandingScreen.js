/**
 * LandingScreen — Initial Home / Title View
 * Renders the pulsing holographic title, cockpit radar sweep widget,
 * telemetry status indicators, dynamic Start/Continue buttons based on save state,
 * and Web Audio sound feedback.
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

    container.innerHTML = `
      <div class="console-panel landing-card">
        <!-- Corner Cockpit Radar Sweep Widget -->
        <div class="radar-widget" id="landing-radar-widget" title="Cockpit Tactical Radar (Click to Ping)">
          <div class="radar-crosshair-x"></div>
          <div class="radar-crosshair-y"></div>
          <div class="radar-circle-inner"></div>
          <div class="radar-sweep"></div>
          <div class="radar-blip radar-blip-1"></div>
          <div class="radar-blip radar-blip-2"></div>
        </div>

        <!-- Telemetry & Status Header -->
        <div class="telemetry-bar">
          <div class="status-badge"><span class="pulse-dot"></span> HUD SYS ONLINE</div>
          <div>PILOT: ${callsign} // SEC ${currentSector.toString().padStart(2, '0')}</div>
        </div>

        <!-- Holographic Title & Submark -->
        <div class="logo-container">
          <h1 class="hud-title hologram">SPACE SHOOTER</h1>
          <p class="hud-subtitle">TACTICAL COCKPIT // MK-IV COMBAT HUD</p>
          <div class="hud-brackets">
            <span class="hud-bracket-line"></span>
            <span class="hud-badge">${hasSave ? `ACTIVE MISSION: ${sectorName}` : 'READY FOR DEPLOYMENT'}</span>
            <span class="hud-bracket-line"></span>
          </div>
        </div>

        <!-- Primary Action Navigation -->
        <div class="screen-nav-bar vertical">
          ${hasSave ? `
            <button class="console-btn btn-primary btn-lg" id="btn-continue-mission" data-action="continue">
              <span>▶ CONTINUE MISSION // SECTOR ${currentSector.toString().padStart(2, '0')}</span>
              <span class="btn-subtext">${sectorName} · HIGH SCORE: ${highScore.toLocaleString()}</span>
            </button>

            <button class="console-btn btn-secondary" id="btn-new-campaign" data-action="new-campaign">
              <span>↺ NEW CAMPAIGN</span>
            </button>
          ` : `
            <button class="console-btn btn-primary btn-lg" id="btn-start-mission" data-action="start">
              <span>▶ START MISSION</span>
              <span class="btn-subtext">SECTOR 01: ORBITAL REACH</span>
            </button>
          `}

          <button class="console-btn" data-nav="levelSelect">
            <span>🗺 SECTOR SELECT</span>
            <span class="btn-subtext">${maxUnlocked} / 10 THEATERS UNLOCKED</span>
          </button>
          
          <button class="console-btn" data-nav="loadout">
            <span>🚀 SHIP LOADOUT</span>
            <span class="btn-subtext">ACTIVE: ${save.selectedDrone || 'STRIKER'} // ${save.selectedPayload || 'VULCAN'}</span>
          </button>

          <button class="console-btn" data-nav="settings">
            <span>⚙ SYSTEM SETTINGS</span>
          </button>
          
          <div class="screen-footer" style="margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(45, 212, 220, 0.15);">
            <button class="console-btn btn-secondary btn-sm" data-nav="howToPlay" style="flex: 1;">
              <span>❓ HOW TO PLAY</span>
            </button>
            <button class="console-btn btn-amber btn-sm" data-nav="showcase" style="flex: 1;">
              <span>◎ UI SHOWCASE</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // 1. Radar Widget Ping interaction
    const radar = container.querySelector('#landing-radar-widget');
    if (radar) {
      radar.addEventListener('click', () => {
        soundManager.playRadarPing();
      });
    }

    // 2. Wire Start / Continue / New Campaign Actions
    const startBtn = container.querySelector('#btn-start-mission');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) {
          router.show('game', { sector: 1 });
        }
      });
    }

    const continueBtn = container.querySelector('#btn-continue-mission');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        soundManager.playContinue();
        if (router) {
          router.show('game', { sector: currentSector });
        }
      });
    }

    const newCampaignBtn = container.querySelector('#btn-new-campaign');
    if (newCampaignBtn) {
      newCampaignBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (confirm('Start a new campaign? Current sector progress will be reset to Sector 1.')) {
          SaveManager.startNewCampaign();
          soundManager.playStart();
          // Remount landing screen to reflect new state
          if (router) {
            router.show('landing');
          }
        }
      });
    }

    // 3. Wire Navigation Screen Transitions & Audio
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          router.show(target);
        }
      });
    });

    // 4. Attach Hover Sound to all interactive buttons
    container.querySelectorAll('button, .console-btn, .tac-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        soundManager.playHover();
      });
    });
  },

  unmount() {
    // Cleanup if needed
  }
};
