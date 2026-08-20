/**
 * LandingScreen — Initial Home / Title View
 * Renders the pulsing holographic title, cockpit radar sweep widget,
 * telemetry status indicators, and primary navigation actions.
 */

export const LandingScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel landing-card">
        <!-- Corner Cockpit Radar Sweep Widget -->
        <div class="radar-widget" title="Cockpit Tactical Radar">
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
          <div>SECTOR 01 // ORBITAL REACH</div>
        </div>

        <!-- Holographic Title & Submark -->
        <div class="logo-container">
          <h1 class="hud-title hologram">SPACE SHOOTER</h1>
          <p class="hud-subtitle">TACTICAL COCKPIT // MK-IV COMBAT HUD</p>
          <div class="hud-brackets">
            <span class="hud-bracket-line"></span>
            <span class="hud-badge">CLASSIFIED OPS</span>
            <span class="hud-bracket-line"></span>
          </div>
        </div>

        <!-- Primary Action Navigation -->
        <div class="screen-nav-bar vertical">
          <button class="console-btn btn-primary" data-nav="game" id="btn-start-game">
            <span>▶ START MISSION</span>
          </button>
          
          <button class="console-btn" data-nav="levelSelect">
            <span>🗺 LEVEL SELECT</span>
          </button>
          
          <button class="console-btn" data-nav="loadout">
            <span>🚀 SHIP LOADOUT</span>
          </button>

          <button class="console-btn" data-nav="settings">
            <span>⚙ SETTINGS</span>
          </button>
          
          <div class="screen-footer" style="margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(0, 240, 255, 0.15);">
            <button class="console-btn btn-secondary btn-sm" data-nav="settings" style="flex: 1;">
              <span>❓ HOW TO PLAY</span>
            </button>
            <button class="console-btn btn-amber btn-sm" data-nav="showcase" style="flex: 1;">
              <span>◎ UI SHOWCASE</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Wire navigation event listeners
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          router.show(target);
        }
      });
    });
  },

  unmount() {
    // Cleanup if needed
  }
};

