/**
 * LevelSelectScreen — Mission Sector Map View
 */

export const LevelSelectScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <h2 class="hud-heading">SECTOR SELECT</h2>
          <span class="hud-badge">10 SECTORS DETECTED</span>
        </div>

        <p class="hud-desc">Choose combat theater to deploy tactical strike craft.</p>

        <div class="placeholder-box">
          [ SECTOR MAP PLACEHOLDER — STEP 9 WILL POPULATE NODES ]
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" data-nav="landing">
            <span>◀ BACK TO MENU</span>
          </button>
          <button class="console-btn btn-primary" data-nav="loadout">
            <span>PROCEED TO LOADOUT ▶</span>
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        if (target && router) router.show(target);
      });
    });
  },

  unmount() {}
};
