/**
 * PauseScreen — In-Game Pause Menu
 */

export const PauseScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel modal-panel">
        <div class="screen-header">
          <h2 class="hud-heading">MISSION PAUSED</h2>
          <span class="hud-badge amber">STANDBY</span>
        </div>

        <div class="screen-nav-bar vertical">
          <button class="console-btn btn-primary" data-nav="game">
            <span>▶ RESUME MISSION</span>
          </button>
          <button class="console-btn" data-nav="settings">
            <span>⚙ AUDIO & CONTROLS</span>
          </button>
          <button class="console-btn btn-danger" data-nav="landing">
            <span>✖ ABORT TO MAIN MENU</span>
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
