/**
 * GameScreen — Active Gameplay View & HUD Root
 */

export const GameScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="hud-layer">
        <div class="hud-top-bar">
          <div class="hud-info-card">
            <span class="hud-label">HULL INTEGRITY</span>
            <span class="hud-value" style="color: var(--neon-green)">100%</span>
          </div>

          <div class="hud-info-card score-card">
            <span class="hud-label">SCORE</span>
            <span class="hud-value" style="color: var(--glow-cyan)">000000</span>
          </div>

          <button class="console-btn btn-sm" id="btn-pause">
            <span>⏸ PAUSE</span>
          </button>
        </div>

        <div class="hud-bottom-bar">
          <div class="hud-info-card">
            <span class="hud-label">PRIMARY WEAPON</span>
            <span class="hud-value" style="color: var(--glow-amber)">PLASMA CANNON</span>
          </div>

          <div class="hud-actions-right">
            <button class="console-btn btn-sm" data-nav="results">
              <span>TEST RESULTS ▶</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const pauseBtn = container.querySelector('#btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (router) router.show('pause');
      });
    }

    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        if (target && router) router.show(target);
      });
    });
  },

  unmount() {}
};
