/**
 * LandingScreen — Initial Home / Title View
 */

export const LandingScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel landing-card">
        <div class="status-badge"><span class="pulse-dot"></span> SYSTEM ONLINE</div>
        <h1 class="hud-title">SPACE SHOOTER</h1>
        <p class="hud-subtitle">TACTICAL COCKPIT INTERFACE // V1.0</p>
        
        <div class="screen-nav-bar">
          <button class="console-btn btn-primary" data-nav="levelSelect">
            <span>▶ LEVEL SELECT</span>
          </button>
          <button class="console-btn" data-nav="loadout">
            <span>🚀 LOADOUT</span>
          </button>
          <button class="console-btn" data-nav="settings">
            <span>⚙ SETTINGS</span>
          </button>
          <button class="console-btn btn-danger" data-nav="game">
            <span>⚡ QUICK LAUNCH</span>
          </button>
          <button class="console-btn btn-amber" data-nav="showcase">
            <span>◎ UI KIT</span>
          </button>
        </div>
      </div>
    `;

    // Wire navigation handlers
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
