/**
 * SettingsScreen — Audio & Control Configurations
 */

export const SettingsScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <h2 class="hud-heading">SYSTEM SETTINGS</h2>
          <span class="hud-badge">CONFIG // 01</span>
        </div>

        <div class="settings-list">
          <div class="setting-item">
            <span class="setting-title">MASTER AUDIO</span>
            <span class="setting-val">80%</span>
          </div>
          <div class="setting-item">
            <span class="setting-title">SFX VOLUME</span>
            <span class="setting-val">100%</span>
          </div>
          <div class="setting-item">
            <span class="setting-title">TOUCH CONTROLS</span>
            <span class="setting-val" style="color: var(--neon-green)">AUTO-DETECT</span>
          </div>
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" data-nav="landing">
            <span>◀ BACK</span>
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
