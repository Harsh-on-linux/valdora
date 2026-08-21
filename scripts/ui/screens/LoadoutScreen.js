/**
 * LoadoutScreen — Drone Chassis & Weapon Payload Selection View
 * Full interactive loadout configuration with procedural drone previews,
 * stat comparison bars, weapon selector cards, and deployment controls.
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { getDroneById, getAllDrones, getCompatibleWeapons, getWeaponById } from '../../game/drones.js';
import { drawDronePreview, createDronePreviewWidget } from '../../game/DroneRenderer.js';
import { soundManager } from '../../audio/index.js';

export const LoadoutScreen = {
  /** @type {object|null} Active drone preview widget */
  _previewWidget: null,

  /** @type {object[]} Mini-canvas widgets on drone cards */
  _miniWidgets: [],

  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const sectorId = data.sector || save.currentSector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;

    let selectedDroneId = save.selectedDrone || 'STRIKER';
    let selectedWeaponId = save.selectedPayload || 'VULCAN';
    const selectedDrone = getDroneById(selectedDroneId);

    // Ensure weapon is compatible with drone
    const compatWeapons = getCompatibleWeapons(selectedDroneId);
    if (!compatWeapons.find(w => w.id === selectedWeaponId)) {
      selectedWeaponId = selectedDrone.defaultWeapon;
    }

    // Build the UI
    container.innerHTML = `
      <div class="loadout-screen">
        <!-- Header -->
        <div class="loadout-header">
          <div>
            <h2 class="hud-heading">HANGAR LOADOUT</h2>
            <p class="hud-subtitle">
              TARGET THEATER: SECTOR ${sectorId.toString().padStart(2, '0')} // ${escapeHtml(sectorName)}
            </p>
          </div>
          <span class="hud-badge amber">STATUS: ARMED</span>
        </div>

        <!-- Body: Preview + Selection -->
        <div class="loadout-body">
          <!-- Left: Drone Preview -->
          <div class="drone-preview-panel" id="drone-preview-panel">
            <div id="drone-preview-mount"></div>
            <div class="drone-preview-label" id="drone-preview-name">${escapeHtml(selectedDrone.name)}</div>
            <div class="drone-preview-class" id="drone-preview-class">${escapeHtml(selectedDrone.class)}</div>
            <div class="drone-preview-desc" id="drone-preview-desc">${escapeHtml(selectedDrone.description)}</div>
          </div>

          <!-- Right: Selection Cards -->
          <div class="loadout-right">
            <!-- Drone Chassis Selector -->
            <div class="drone-selector-section">
              <div class="section-label">STRIKE CHASSIS</div>
              <div class="drone-cards" id="drone-cards-container"></div>
            </div>

            <!-- Weapon Payload Selector -->
            <div class="weapon-selector-section">
              <div class="section-label">PRIMARY PAYLOAD</div>
              <div class="weapon-cards" id="weapon-cards-container"></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="loadout-footer">
          <button class="console-btn btn-secondary" id="btn-loadout-back">
            <span>◀ SECTOR MAP</span>
          </button>
          <button class="console-btn btn-primary" id="btn-loadout-launch">
            <span>⚡ LAUNCH MISSION // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
          </button>
        </div>
      </div>
    `;

    // ── Mount Drone Preview Widget ──
    const previewMount = container.querySelector('#drone-preview-mount');
    if (previewMount) {
      this._previewWidget = createDronePreviewWidget(previewMount, selectedDroneId, {
        width: 240,
        height: 260,
        animate: true
      });
    }

    // ── Build Drone Cards ──
    const droneCardsContainer = container.querySelector('#drone-cards-container');
    if (droneCardsContainer) {
      this._buildDroneCards(droneCardsContainer, selectedDroneId, container, sectorId, router);
    }

    // ── Build Weapon Cards ──
    const weaponCardsContainer = container.querySelector('#weapon-cards-container');
    if (weaponCardsContainer) {
      this._buildWeaponCards(weaponCardsContainer, selectedDroneId, selectedWeaponId, container);
    }

    // ── Button Event Handlers ──
    const backBtn = container.querySelector('#btn-loadout-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      backBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const launchBtn = container.querySelector('#btn-loadout-launch');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        soundManager.playStart();
        SaveManager.save({
          currentSector: sectorId,
          selectedDrone: selectedDroneId,
          selectedPayload: selectedWeaponId
        });
        if (router) router.show('game', { sector: sectorId });
      });
      launchBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // Store state reference for card clicks
    this._state = { selectedDroneId, selectedWeaponId, sectorId, router, container };
  },

  /**
   * Builds the 3 drone chassis selection cards with mini preview canvases and stat bars
   */
  _buildDroneCards(containerEl, selectedDroneId, screenContainer, sectorId, router) {
    const allDrones = getAllDrones();
    this._miniWidgets = [];

    allDrones.forEach(drone => {
      const card = document.createElement('div');
      card.className = `drone-card${drone.id === selectedDroneId ? ' selected' : ''}`;
      card.setAttribute('data-drone-id', drone.id);

      // Mini canvas
      const miniCanvasContainer = document.createElement('div');
      const miniWidget = createDronePreviewWidget(miniCanvasContainer, drone.id, {
        width: 80,
        height: 90,
        animate: false
      });
      miniWidget.canvas.className = 'drone-card-mini-canvas';
      this._miniWidgets.push(miniWidget);

      // Name & class
      const nameEl = document.createElement('div');
      nameEl.className = 'drone-card-name';
      nameEl.textContent = drone.id;

      const classEl = document.createElement('div');
      classEl.className = 'drone-card-class';
      classEl.textContent = drone.class;

      // Stat bars
      const statsEl = document.createElement('div');
      statsEl.className = 'drone-stat-bars';
      statsEl.innerHTML = buildStatBars(drone);

      card.appendChild(miniWidget.canvas);
      card.appendChild(nameEl);
      card.appendChild(classEl);
      card.appendChild(statsEl);

      // Click handler
      card.addEventListener('click', () => {
        soundManager.playClick();
        this._selectDrone(drone.id, screenContainer);
      });
      card.addEventListener('mouseenter', () => soundManager.playHover());

      containerEl.appendChild(card);
    });
  },

  /**
   * Handles drone selection change
   */
  _selectDrone(droneId, screenContainer) {
    if (!this._state) return;
    const drone = getDroneById(droneId);
    if (!drone) return;

    this._state.selectedDroneId = droneId;

    // Update preview widget
    if (this._previewWidget) {
      this._previewWidget.setDrone(droneId);
    }

    // Update preview text
    const nameEl = screenContainer.querySelector('#drone-preview-name');
    const classEl = screenContainer.querySelector('#drone-preview-class');
    const descEl = screenContainer.querySelector('#drone-preview-desc');
    if (nameEl) nameEl.textContent = drone.name;
    if (classEl) classEl.textContent = drone.class;
    if (descEl) descEl.textContent = drone.description;

    // Update card selection states
    const cards = screenContainer.querySelectorAll('.drone-card');
    cards.forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-drone-id') === droneId);
    });

    // Ensure weapon compatibility — switch if current weapon not compatible
    const compatWeapons = getCompatibleWeapons(droneId);
    if (!compatWeapons.find(w => w.id === this._state.selectedWeaponId)) {
      this._state.selectedWeaponId = drone.defaultWeapon;
    }

    // Rebuild weapon cards
    const weaponContainer = screenContainer.querySelector('#weapon-cards-container');
    if (weaponContainer) {
      weaponContainer.innerHTML = '';
      this._buildWeaponCards(weaponContainer, droneId, this._state.selectedWeaponId, screenContainer);
    }
  },

  /**
   * Builds weapon payload selector cards
   */
  _buildWeaponCards(containerEl, droneId, selectedWeaponId, screenContainer) {
    const compatWeapons = getCompatibleWeapons(droneId);
    const allWeaponIds = ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'];

    allWeaponIds.forEach(weaponId => {
      const weapon = getWeaponById(weaponId);
      if (!weapon) return;

      const isCompat = compatWeapons.find(w => w.id === weaponId);
      const isSelected = weaponId === selectedWeaponId;

      const card = document.createElement('div');
      card.className = `weapon-card${isSelected ? ' selected' : ''}${!isCompat ? ' locked' : ''}`;
      card.setAttribute('data-weapon-id', weaponId);

      card.innerHTML = `
        <div class="weapon-card-icon" style="color: ${weapon.color}">${weapon.icon}</div>
        <div class="weapon-card-name">${escapeHtml(weapon.name)}</div>
        <div class="weapon-card-class">${escapeHtml(weapon.class)}</div>
        <div class="weapon-stat-grid">
          <div class="weapon-stat-item">
            <span class="weapon-stat-key">DMG</span>
            <span class="weapon-stat-val">${weapon.stats.damage.toFixed(1)}</span>
          </div>
          <div class="weapon-stat-item">
            <span class="weapon-stat-key">ROF</span>
            <span class="weapon-stat-val">${weapon.stats.fireRate.toFixed(1)}</span>
          </div>
          <div class="weapon-stat-item">
            <span class="weapon-stat-key">RNG</span>
            <span class="weapon-stat-val">${weapon.stats.range.toFixed(1)}</span>
          </div>
          <div class="weapon-stat-item">
            <span class="weapon-stat-key">SPR</span>
            <span class="weapon-stat-val">${weapon.stats.spread.toFixed(1)}</span>
          </div>
        </div>
      `;

      if (isCompat) {
        card.addEventListener('click', () => {
          soundManager.playClick();
          this._selectWeapon(weaponId, screenContainer);
        });
        card.addEventListener('mouseenter', () => soundManager.playHover());
      }

      containerEl.appendChild(card);
    });
  },

  /**
   * Handles weapon selection change
   */
  _selectWeapon(weaponId, screenContainer) {
    if (!this._state) return;
    this._state.selectedWeaponId = weaponId;

    // Update card selection states
    const cards = screenContainer.querySelectorAll('.weapon-card');
    cards.forEach(card => {
      const isThis = card.getAttribute('data-weapon-id') === weaponId;
      card.classList.toggle('selected', isThis);
    });
  },

  unmount() {
    // Cleanup preview widgets
    if (this._previewWidget) {
      this._previewWidget.destroy();
      this._previewWidget = null;
    }
    if (this._miniWidgets) {
      this._miniWidgets.forEach(w => w.destroy());
      this._miniWidgets = [];
    }
    this._state = null;
  }
};

/**
 * Builds stat bar HTML for a drone config
 * @param {object} drone
 * @returns {string}
 */
function buildStatBars(drone) {
  const stats = [
    { key: 'SPD', value: drone.stats.speed, max: 6, color: 'cyan' },
    { key: 'ARM', value: drone.stats.armor, max: 2, color: 'green' },
    { key: 'EVA', value: drone.stats.evasion, max: 1, color: 'purple' },
    { key: 'ROF', value: drone.stats.fireRate, max: 1.5, color: 'amber' }
  ];

  return stats.map(s => {
    const pct = Math.min(100, (s.value / s.max) * 100);
    return `
      <div class="drone-stat-row">
        <span class="drone-stat-label">${s.key}</span>
        <div class="drone-stat-track">
          <div class="drone-stat-fill fill-${s.color}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
