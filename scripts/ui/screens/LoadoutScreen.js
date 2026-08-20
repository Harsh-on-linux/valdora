/**
 * LoadoutScreen — Ship & Weapon Selection View
 */

export const LoadoutScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <h2 class="hud-heading">HANGAR LOADOUT</h2>
          <span class="hud-badge amber">STATUS: ARMED</span>
        </div>

        <p class="hud-desc">Configure hull chassis and primary weapon payload.</p>

        <div class="placeholder-box">
          [ SHIP PREVIEW & WEAPON PICKER PLACEHOLDER — STEP 12 ]
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" data-nav="levelSelect">
            <span>◀ SECTOR MAP</span>
          </button>
          <button class="console-btn btn-danger" data-nav="game">
            <span>⚡ LAUNCH MISSION</span>
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
