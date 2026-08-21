/**
 * LoadoutScreen — Drone Chassis & Weapon Payload Selection View
 * Full interactive loadout configuration with procedural drone previews,
 * stat comparison bars, weapon selector cards, keyboard navigation,
 * and persistent loadout deployment controls.
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { getDroneById, getAllDrones, getCompatibleWeapons, getWeaponById } from '../../game/drones.js';
import { createDronePreviewWidget } from '../../game/DroneRenderer.js';
import { soundManager } from '../../audio/index.js';

export const LoadoutScreen = {
  /** @type {object|null} Active drone preview widget */
  _previewWidget: null,

  /** @type {object[]} Mini-canvas widgets on drone cards */
  _miniWidgets: [],

  /** @type {Function|null} Keyboard event listener */
  _boundKeyDown: null,

  /** @type {object|null} Active state reference */
  _state: null,

  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const sectorId = data.sector || save.currentSector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;

    let selectedDroneId = save.selectedDrone || 'STRIKER';
    let selectedWeaponId = save.selectedPayload || 'VULCAN';
    let selectedDrone = getDroneById(selectedDroneId);
    if (!selectedDrone) {
      selectedDroneId = 'STRIKER';
      selectedDrone = getDroneById('STRIKER');
    }

    // Ensure weapon is compatible with drone
    const compatWeapons = getCompatibleWeapons(selectedDroneId);
    if (!compatWeapons.find(w => w.id === selectedWeaponId)) {
      selectedWeaponId = selectedDrone.defaultWeapon;
    }

    // Persist active valid selection
    SaveManager.save({
      currentSector: sectorId,
      selectedDrone: selectedDroneId,
      selectedPayload: selectedWeaponId
    });

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
          <div class="loadout-header-badges">
            <span class="hud-badge cyan" id="loadout-hull-badge">HULL: ${selectedDrone.stats.hull} HP</span>
            <span class="hud-badge amber">STATUS: ARMED</span>
          </div>
        </div>

        <!-- Body: Preview + Selection -->
        <div class="loadout-body">
          <!-- Left: Drone Preview -->
          <div class="drone-preview-panel" id="drone-preview-panel">
            <div id="drone-preview-mount"></div>
            <div class="drone-preview-label" id="drone-preview-name">${escapeHtml(selectedDrone.name)}</div>
            <div class="drone-preview-class" id="drone-preview-class">${escapeHtml(selectedDrone.class)}</div>
            <div class="drone-preview-desc" id="drone-preview-desc">${escapeHtml(selectedDrone.description)}</div>
            <div class="drone-preview-stats" id="drone-preview-stats">
              ${this._renderDetailedStats(selectedDrone)}
            </div>
          </div>

          <!-- Right: Selection Cards -->
          <div class="loadout-right">
            <!-- Drone Chassis Selector -->
            <div class="drone-selector-section">
              <div class="section-label">
                <span>STRIKE CHASSIS</span>
                <span class="section-hint">[KEYS 1 - 3]</span>
              </div>
              <div class="drone-cards" id="drone-cards-container"></div>
            </div>

            <!-- Weapon Payload Selector -->
            <div class="weapon-selector-section">
              <div class="section-label">
                <span>PRIMARY PAYLOAD</span>
                <span class="section-hint">[KEY W TO CYCLE]</span>
              </div>
              <div class="weapon-cards" id="weapon-cards-container"></div>
            </div>
          </div>
        </div>

        <!-- Keyboard Navigation Legend -->
        <div class="keyboard-nav-hint-bar">
          <span class="nav-hint-item"><span class="key-pill">1-3</span> CHASSIS</span>
          <span class="nav-hint-item"><span class="key-pill">W</span> PAYLOAD</span>
          <span class="nav-hint-item"><span class="key-pill">ENTER</span> / <span class="key-pill">SPACE</span> LAUNCH</span>
          <span class="nav-hint-item"><span class="key-pill">ESC</span> SECTORS</span>
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
        height: 250,
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
        this._launchMission(sectorId, router);
      });
      launchBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // Store state reference for card clicks & keyboard navigation
    this._state = { selectedDroneId, selectedWeaponId, sectorId, router, container };

    // Setup Keyboard Navigation
    this._setupKeyboardNav(sectorId, router);
  },

  /**
   * Builds the 3 drone chassis selection cards with mini preview canvases and stat bars
   */
  _buildDroneCards(containerEl, selectedDroneId, screenContainer, sectorId, router) {
    const allDrones = getAllDrones();
    this._miniWidgets = [];

    allDrones.forEach((drone, index) => {
      const card = document.createElement('div');
      card.className = `drone-card${drone.id === selectedDroneId ? ' selected' : ''}`;
      card.setAttribute('data-drone-id', drone.id);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${drone.name} chassis`);

      // Key number badge
      const keyBadge = document.createElement('span');
      keyBadge.className = 'card-key-badge';
      keyBadge.textContent = `${index + 1}`;
      card.appendChild(keyBadge);

      // Mini canvas widget
      const miniWidget = createDronePreviewWidget(card, drone.id, {
        width: 80,
        height: 85,
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

    // Update preview text & badges
    const nameEl = screenContainer.querySelector('#drone-preview-name');
    const classEl = screenContainer.querySelector('#drone-preview-class');
    const descEl = screenContainer.querySelector('#drone-preview-desc');
    const statsEl = screenContainer.querySelector('#drone-preview-stats');
    const hullBadge = screenContainer.querySelector('#loadout-hull-badge');

    if (nameEl) nameEl.textContent = drone.name;
    if (classEl) classEl.textContent = drone.class;
    if (descEl) descEl.textContent = drone.description;
    if (statsEl) statsEl.innerHTML = this._renderDetailedStats(drone);
    if (hullBadge) hullBadge.textContent = `HULL: ${drone.stats.hull} HP`;

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

    // Persist immediately
    SaveManager.save({
      selectedDrone: droneId,
      selectedPayload: this._state.selectedWeaponId
    });

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

      const isCompat = compatWeapons.some(w => w.id === weaponId);
      const isSelected = weaponId === selectedWeaponId;

      const card = document.createElement('div');
      card.className = `weapon-card${isSelected ? ' selected' : ''}${!isCompat ? ' locked' : ''}`;
      card.setAttribute('data-weapon-id', weaponId);
      card.setAttribute('tabindex', isCompat ? '0' : '-1');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${weapon.name} payload${!isCompat ? ' (Incompatible with current chassis)' : ''}`);

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
            <span class="weapon-stat-val">${weapon.stats.fireRate > 0 ? weapon.stats.fireRate.toFixed(1) : 'CONT'}</span>
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
        ${!isCompat ? '<span class="weapon-locked-badge">INCOMPATIBLE</span>' : ''}
      `;

      if (isCompat) {
        card.addEventListener('click', () => {
          soundManager.playClick();
          this._selectWeapon(weaponId, screenContainer);
        });
        card.addEventListener('mouseenter', () => soundManager.playHover());
      } else {
        card.addEventListener('click', () => {
          soundManager.playDeny();
        });
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

    // Persist immediately
    SaveManager.save({
      selectedPayload: weaponId
    });

    // Update card selection states
    const cards = screenContainer.querySelectorAll('.weapon-card');
    cards.forEach(card => {
      const isThis = card.getAttribute('data-weapon-id') === weaponId;
      card.classList.toggle('selected', isThis);
    });
  },

  /**
   * Detailed specs grid for the preview panel
   */
  _renderDetailedStats(drone) {
    return `
      <div class="preview-spec-row">
        <span class="spec-label">ACCEL:</span>
        <span class="spec-val">${drone.stats.acceleration.toFixed(2)}G</span>
        <span class="spec-label">ARMOR:</span>
        <span class="spec-val">${drone.stats.armor.toFixed(1)}x</span>
      </div>
      <div class="preview-spec-row">
        <span class="spec-label">EVASION:</span>
        <span class="spec-val">${Math.round(drone.stats.evasion * 100)}%</span>
        <span class="spec-label">RADAR:</span>
        <span class="spec-val">${drone.stats.radarRange.toFixed(1)}x</span>
      </div>
    `;
  },

  /**
   * Setup Keyboard Navigation for Loadout Screen
   */
  _setupKeyboardNav(sectorId, router) {
    this._boundKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          soundManager.playClick();
          this._selectDrone('STRIKER', this._state.container);
          break;
        case '2':
          e.preventDefault();
          soundManager.playClick();
          this._selectDrone('REAPER', this._state.container);
          break;
        case '3':
          e.preventDefault();
          soundManager.playClick();
          this._selectDrone('GHOST', this._state.container);
          break;
        case 'w':
        case 'W': {
          e.preventDefault();
          // Cycle through compatible weapons
          const currentDrone = getDroneById(this._state.selectedDroneId);
          if (currentDrone) {
            const compat = getCompatibleWeapons(currentDrone.id);
            const curIdx = compat.findIndex(w => w.id === this._state.selectedWeaponId);
            const nextIdx = (curIdx + 1) % compat.length;
            soundManager.playClick();
            this._selectWeapon(compat[nextIdx].id, this._state.container);
          }
          break;
        }
        case 'Enter':
        case ' ':
          e.preventDefault();
          this._launchMission(sectorId, router);
          break;
        case 'Escape':
          e.preventDefault();
          soundManager.playClick();
          if (router) router.show('levelSelect', { sector: sectorId });
          break;
      }
    };

    window.addEventListener('keydown', this._boundKeyDown);
  },

  _launchMission(sectorId, router) {
    soundManager.playStart();
    SaveManager.save({
      currentSector: sectorId,
      selectedDrone: this._state.selectedDroneId,
      selectedPayload: this._state.selectedWeaponId
    });
    if (router) {
      router.show('game', { sector: sectorId });
    }
  },

  unmount() {
    if (this._boundKeyDown) {
      window.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
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
        <span class="drone-stat-num">${s.value.toFixed(1)}</span>
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
