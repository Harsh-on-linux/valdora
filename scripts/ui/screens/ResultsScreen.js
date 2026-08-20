/**
 * ResultsScreen — Mission Debrief / Score Summary
 */

export const ResultsScreen = {
  mount(container, data, router) {
    container.innerHTML = `
      <div class="console-panel">
        <div class="screen-header">
          <h2 class="hud-heading">MISSION COMPLETE</h2>
          <span class="hud-badge green">VICTORY</span>
        </div>

        <div class="results-stats">
          <div class="stat-row">
            <span class="stat-name">SECTOR RATING:</span>
            <span class="stat-val" style="color: var(--text-gold)">★★★☆☆</span>
          </div>
          <div class="stat-row">
            <span class="stat-name">FINAL SCORE:</span>
            <span class="stat-val" style="color: var(--glow-cyan)">145,800</span>
          </div>
          <div class="stat-row">
            <span class="stat-name">HOSTILES NEUTRALIZED:</span>
            <span class="stat-val">42</span>
          </div>
        </div>

        <div class="screen-footer">
          <button class="console-btn btn-secondary" data-nav="levelSelect">
            <span>SECTOR MAP</span>
          </button>
          <button class="console-btn btn-primary" data-nav="game">
            <span>RETRY MISSION ↻</span>
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
