/**
 * LevelSelectScreen — Star-Map Tactical Console & Sector Deployment Interface
 * Renders an interactive node-graph celestial sector map of all 10 campaign theaters,
 * visual & audio denial feedback on locked sectors, star rating badges, boss hazard
 * aesthetics for Sectors 5 & 10, real-time sector intelligence briefings, and full
 * keyboard + touch navigation flows into loadout and direct gameplay deployment.
 */

import { LEVELS, getLevelById, isLevelUnlocked } from '../../game/levels.js';
import { SaveManager } from '../../game/SaveManager.js';
import { soundManager } from '../../audio/index.js';

export const LevelSelectScreen = {
  _selectedSectorId: 1,
  _boundKeyDown: null,
  _container: null,
  _router: null,

  mount(container, data = {}, router) {
    this._container = container;
    this._router = router;

    const save = SaveManager.getSaveData();
    const maxUnlocked = save.maxSectorUnlocked || 1;
    const currentSector = save.currentSector || 1;
    const starsEarned = save.starsEarned || 0;
    const totalPossibleStars = LEVELS.length * 3;
    const callsign = save.pilotCallsign || 'PHANTOM';

    // Set default selected sector to the active mission or sector passed in data
    this._selectedSectorId = data.sector || currentSector || 1;
    if (this._selectedSectorId > 10) this._selectedSectorId = 10;
    if (this._selectedSectorId < 1) this._selectedSectorId = 1;

    this._render(container, save, maxUnlocked, starsEarned, totalPossibleStars, callsign);
    this._bindEvents(container, router, maxUnlocked);
    this._setupKeyboardNav(router);
  },

  _render(container, save, maxUnlocked, starsEarned, totalPossibleStars, callsign) {
    container.innerHTML = `
      <div class="console-panel level-select-panel">
        <!-- Top Telemetry & Campaign Progress Header -->
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">SECTOR STAR MAP</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.58rem;">
              PILOT: ${escapeHtml(callsign)} // THEATERS: ${maxUnlocked}/10 UNLOCKED // CAMPAIGN STARS: ${starsEarned}/${totalPossibleStars} ★
            </p>
          </div>
          <div class="star-counter-badge">
            <span class="star-icon">⭐</span>
            <span class="star-count">${starsEarned}</span>
            <span class="star-max">/ ${totalPossibleStars}</span>
          </div>
        </div>

        <!-- Main Star-Map + Sector Dossier Grid -->
        <div class="starmap-layout-grid">
          <!-- ═══════════ LEFT: TACTICAL STAR-MAP NODE GRAPH ═══════════ -->
          <div class="starmap-canvas-container" id="starmap-canvas-container">
            <div class="starmap-grid-lines"></div>
            <div class="starmap-radar-sweep"></div>
            
            <!-- SVG Vector Flight Paths Connecting Nodes -->
            <svg class="starmap-svg-paths" viewBox="0 0 100 100" preserveAspectRatio="none">
              ${this._renderSvgPaths(maxUnlocked, this._selectedSectorId)}
            </svg>

            <!-- 10 Tactical Sector Nodes -->
            <div class="starmap-nodes-layer" id="starmap-nodes-layer">
              ${LEVELS.map(lvl => this._renderNode(lvl, maxUnlocked, save)).join('')}
            </div>

            <!-- Coordinate corner markers -->
            <div class="map-corner map-corner-tl">GRID // 00-A</div>
            <div class="map-corner map-corner-tr">SECTOR // APEX</div>
            <div class="map-corner map-corner-bl">RADAR // 360°</div>
            <div class="map-corner map-corner-br">MGRS // 4420</div>

            <!-- On-map Denial Alert Notification Overlay -->
            <div class="starmap-denial-toast" id="starmap-denial-toast" aria-live="polite">
              <span class="toast-icon">⛔</span>
              <span class="toast-text" id="starmap-denial-text">ACCESS RESTRICTED // COMPLETE PREVIOUS SECTOR FIRST</span>
            </div>
          </div>

          <!-- ═══════════ RIGHT: SECTOR INTEL DOSSIER BRIEFING ═══════════ -->
          <div class="sector-dossier-panel" id="sector-dossier">
            ${this._renderDossier(this._selectedSectorId, maxUnlocked, save)}
          </div>
        </div>

        <!-- Tactical Keyboard Navigation Legend Banner -->
        <div class="keyboard-nav-hint-bar">
          <span class="nav-hint-item"><span class="key-pill">◀ / ▶</span> / <span class="key-pill">1-0</span> SELECT SECTOR</span>
          <span class="nav-hint-item"><span class="key-pill">ENTER</span> / <span class="key-pill">SPACE</span> DEPLOY</span>
          <span class="nav-hint-item"><span class="key-pill">L</span> SHIP LOADOUT</span>
          <span class="nav-hint-item"><span class="key-pill">ESC</span> RETURN</span>
        </div>

        <!-- Footer Navigation -->
        <div class="screen-footer" style="padding-top: 8px; border-top: 1px solid rgba(45, 212, 220, 0.15);">
          <button class="console-btn btn-secondary" data-nav="landing" style="flex: 1;">
            <span>◀ RETURN TO COCKPIT</span>
          </button>
          <button class="console-btn" data-nav="loadout" style="flex: 1;" id="btn-footer-loadout">
            <span>🚀 SHIP LOADOUT</span>
          </button>
          <button class="console-btn" data-nav="settings" style="flex: 0.8;">
            <span>⚙ SETTINGS</span>
          </button>
        </div>
      </div>
    `;
  },

  _bindEvents(container, router, maxUnlocked) {
    // 1. Wire Node Click & Touch Selection
    const nodeElements = container.querySelectorAll('.starmap-node');

    nodeElements.forEach(node => {
      const sectorId = parseInt(node.getAttribute('data-sector-id'), 10);
      node.addEventListener('click', () => {
        this.selectSector(sectorId);
      });

      node.addEventListener('mouseenter', () => {
        const isUnlocked = isLevelUnlocked(sectorId, maxUnlocked);
        if (isUnlocked) {
          soundManager.playHover();
        }
      });
    });

    // 2. Bind Dossier Action Buttons (Deploy, Loadout, or Locked Click)
    this._bindDossierActions(container, router);

    // 3. Navigation Buttons
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          if (target === 'loadout') {
            router.show('loadout', { sector: this._selectedSectorId });
          } else {
            router.show(target);
          }
        }
      });
    });

    // 4. Hover sounds on footer buttons
    container.querySelectorAll('button, .console-btn, .tac-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundManager.playHover());
    });
  },

  /**
   * Programmatically selects a sector node with full audio-visual feedback
   * @param {number} sectorId
   */
  selectSector(sectorId) {
    if (sectorId < 1) sectorId = 1;
    if (sectorId > 10) sectorId = 10;

    const save = SaveManager.getSaveData();
    const maxUnlocked = save.maxSectorUnlocked || 1;
    const isUnlocked = isLevelUnlocked(sectorId, maxUnlocked);
    const nodeElements = this._container ? this._container.querySelectorAll('.starmap-node') : [];
    const targetNode = Array.from(nodeElements).find(n => parseInt(n.getAttribute('data-sector-id'), 10) === sectorId);

    if (isUnlocked) {
      soundManager.playClick();
    } else {
      // Audio-visual denial feedback
      soundManager.playDeny();
      this._triggerDenialFeedback(targetNode, sectorId);
    }

    this._selectedSectorId = sectorId;

    // Update node visual selection classes
    nodeElements.forEach(n => {
      const nId = parseInt(n.getAttribute('data-sector-id'), 10);
      n.classList.toggle('selected', nId === sectorId);
    });

    // Refresh SVG Path Highlights
    const svgContainer = this._container?.querySelector('.starmap-svg-paths');
    if (svgContainer) {
      svgContainer.innerHTML = this._renderSvgPaths(maxUnlocked, this._selectedSectorId);
    }

    // Refresh Dossier Panel Content & Rebind Action Buttons
    const dossierContainer = this._container?.querySelector('#sector-dossier');
    if (dossierContainer) {
      dossierContainer.innerHTML = this._renderDossier(sectorId, maxUnlocked, save);
      this._bindDossierActions(this._container, this._router);
    }
  },

  /**
   * Triggers visual denial animations (node recoil shake, toast banner, and red hazard pulse)
   */
  _triggerDenialFeedback(nodeElement, sectorId) {
    if (nodeElement) {
      nodeElement.classList.remove('node-denied');
      // Trigger layout reflow to replay CSS keyframe animation
      void nodeElement.offsetWidth;
      nodeElement.classList.add('node-denied');

      setTimeout(() => {
        if (nodeElement) nodeElement.classList.remove('node-denied');
      }, 500);
    }

    // Show on-map denial toast notification
    const toast = this._container?.querySelector('#starmap-denial-toast');
    const toastText = this._container?.querySelector('#starmap-denial-text');
    if (toast && toastText) {
      const prevSector = sectorId - 1;
      const prevLevel = getLevelById(prevSector);
      const prevName = prevLevel ? prevLevel.name : `SECTOR ${prevSector.toString().padStart(2, '0')}`;
      toastText.textContent = `ACCESS DENIED // CLEAR SECTOR ${prevSector.toString().padStart(2, '0')} (${prevName}) TO UNLOCK`;

      toast.classList.remove('active');
      void toast.offsetWidth;
      toast.classList.add('active');

      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        if (toast) toast.classList.remove('active');
      }, 2400);
    }
  },

  _setupKeyboardNav(router) {
    this._boundKeyDown = (e) => {
      // Ignore key events if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const save = SaveManager.getSaveData();
      const maxUnlocked = save.maxSectorUnlocked || 1;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          this.selectSector(this._selectedSectorId > 1 ? this._selectedSectorId - 1 : 10);
          break;

        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          this.selectSector(this._selectedSectorId < 10 ? this._selectedSectorId + 1 : 1);
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          e.preventDefault();
          const targetId = parseInt(e.key, 10);
          this.selectSector(targetId);
          break;
        }

        case '0': {
          e.preventDefault();
          this.selectSector(10);
          break;
        }

        case 'Enter':
        case ' ': {
          e.preventDefault();
          const isUnlocked = isLevelUnlocked(this._selectedSectorId, maxUnlocked);
          if (isUnlocked) {
            this._deploySector(this._selectedSectorId, router);
          } else {
            const nodeElements = this._container ? this._container.querySelectorAll('.starmap-node') : [];
            const targetNode = Array.from(nodeElements).find(n => parseInt(n.getAttribute('data-sector-id'), 10) === this._selectedSectorId);
            soundManager.playDeny();
            this._triggerDenialFeedback(targetNode, this._selectedSectorId);
          }
          break;
        }

        case 'l':
        case 'L': {
          e.preventDefault();
          const isUnlocked = isLevelUnlocked(this._selectedSectorId, maxUnlocked);
          if (isUnlocked) {
            soundManager.playClick();
            if (router) router.show('loadout', { sector: this._selectedSectorId });
          } else {
            soundManager.playDeny();
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          soundManager.playClick();
          if (router) router.show('landing');
          break;
        }
      }
    };

    window.addEventListener('keydown', this._boundKeyDown);
  },

  _deploySector(sectorId, router) {
    soundManager.playStart();
    // Save selected sector as active mission
    SaveManager.save({ currentSector: sectorId });
    if (router) {
      router.show('game', { sector: sectorId });
    }
  },

  _renderNode(lvl, maxUnlocked, save) {
    const isUnlocked = isLevelUnlocked(lvl.id, maxUnlocked);
    const isSelected = lvl.id === this._selectedSectorId;
    const isBoss = lvl.isBoss;
    const sectorKey = `sector_${lvl.id}`;
    const stars = save.sectorStars?.[sectorKey] || 0;
    const isCleared = stars > 0;
    const isCurrent = lvl.id === maxUnlocked;

    let stateClass = 'locked';
    if (isCleared) stateClass = 'cleared';
    else if (isUnlocked) stateClass = isCurrent ? 'current' : 'unlocked';

    let bossClass = isBoss ? 'boss-node' : '';
    let selectedClass = isSelected ? 'selected' : '';

    // Star icons string
    let starsStr = '';
    for (let i = 1; i <= 3; i++) {
      starsStr += i <= stars ? '★' : '☆';
    }

    return `
      <div class="starmap-node ${stateClass} ${bossClass} ${selectedClass}" 
           data-sector-id="${lvl.id}" 
           style="left: ${lvl.mapPosition.x}%; top: ${lvl.mapPosition.y}%;"
           title="Sector ${lvl.id}: ${lvl.name} (${isUnlocked ? 'UNLOCKED' : 'LOCKED'})"
           role="button"
           tabindex="0"
           aria-label="Sector ${lvl.id}: ${lvl.name}, Status: ${isUnlocked ? 'Unlocked' : 'Locked'}">
        
        <div class="node-pulse-ring"></div>
        <div class="node-marker">
          ${isUnlocked ? `
            <span class="node-id">${lvl.id.toString().padStart(2, '0')}</span>
            ${isBoss ? '<span class="node-boss-skull">☠</span>' : ''}
          ` : `
            <span class="node-lock">🔒</span>
          `}
        </div>

        <div class="node-label">
          <div class="node-name">${lvl.name}</div>
          <div class="node-stars ${isCleared ? 'has-stars' : ''}">${isUnlocked ? (isCleared ? starsStr : 'READY') : 'LOCKED'}</div>
        </div>
      </div>
    `;
  },

  _renderSvgPaths(maxUnlocked, selectedSectorId) {
    let paths = '';
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const from = LEVELS[i];
      const to = LEVELS[i + 1];
      const isPathUnlocked = isLevelUnlocked(to.id, maxUnlocked);
      const isPathActive = to.id === selectedSectorId || from.id === selectedSectorId;

      paths += `
        <line x1="${from.mapPosition.x}" y1="${from.mapPosition.y}" 
              x2="${to.mapPosition.x}" y2="${to.mapPosition.y}" 
              class="starmap-path ${isPathUnlocked ? 'path-unlocked' : 'path-locked'} ${isPathActive ? 'path-active' : ''}" />
      `;
    }
    return paths;
  },

  _renderDossier(sectorId, maxUnlocked, save) {
    const lvl = getLevelById(sectorId);
    if (!lvl) return '<div class="dossier-empty">NO SECTOR DATA</div>';

    const isUnlocked = isLevelUnlocked(lvl.id, maxUnlocked);
    const sectorKey = `sector_${lvl.id}`;
    const highScore = save.sectorScores?.[sectorKey] || 0;
    const stars = save.sectorStars?.[sectorKey] || 0;
    const isBoss = lvl.isBoss;

    let starIcons = '';
    for (let i = 1; i <= 3; i++) {
      starIcons += i <= stars ? '<span class="star-earned">★</span>' : '<span class="star-empty">☆</span>';
    }

    const prevSector = lvl.id - 1;
    const prevLevel = prevSector >= 1 ? getLevelById(prevSector) : null;
    const prevLevelName = prevLevel ? prevLevel.name : `SECTOR ${prevSector.toString().padStart(2, '0')}`;

    return `
      <div class="dossier-header ${isBoss ? 'boss-dossier-header' : ''}">
        <div>
          <div class="dossier-code">${lvl.code} // SECTOR ${lvl.id.toString().padStart(2, '0')}</div>
          <div class="dossier-title ${isBoss ? 'boss-title' : ''}">${lvl.name}</div>
          <div class="dossier-subtitle">${lvl.subtitle}</div>
        </div>
        <div class="dossier-badge-wrapper">
          ${isBoss ? `
            <span class="threat-badge threat-red" style="font-size: 0.6rem; animation: pulse-glow 1.5s infinite;">☠ HVT ENCOUNTER</span>
          ` : `
            <span class="threat-badge ${isUnlocked ? 'threat-cyan' : 'threat-amber'}">
              ${isUnlocked ? 'DEPLOYABLE' : 'LOCKED'}
            </span>
          `}
        </div>
      </div>

      <!-- Tactical Intel Summary -->
      <div class="dossier-body">
        ${!isUnlocked ? `
          <!-- Security Lockout Banner -->
          <div class="dossier-locked-alert">
            <div class="locked-alert-header">
              <span class="lock-icon">🔒</span>
              <span class="locked-alert-title">SECURITY CLEARANCE RESTRICTED</span>
            </div>
            <p class="locked-alert-desc">
              Operational theater classified by Command. Pilot must clear 
              <strong>SECTOR ${prevSector.toString().padStart(2, '0')} (${escapeHtml(prevLevelName)})</strong> 
              to authorize tactical orbital drop.
            </p>
          </div>
        ` : ''}

        <div class="dossier-desc-box">
          <span class="dossier-label">MISSION BRIEFING //</span>
          <p class="dossier-desc">${lvl.description}</p>
        </div>

        <!-- Mission Specifications Grid -->
        <div class="dossier-specs-grid">
          <div class="spec-cell">
            <span class="spec-cell-label">WAVE INTEL</span>
            <span class="spec-cell-value">${lvl.waveCount} COMBAT WAVES</span>
          </div>
          <div class="spec-cell">
            <span class="spec-cell-label">ENVIRONMENTAL HAZARD</span>
            <span class="spec-cell-value" style="color: ${lvl.hazardType !== 'NONE' ? 'var(--amber)' : 'var(--text-secondary)'};">
              ${lvl.hazardType}
            </span>
          </div>
          <div class="spec-cell">
            <span class="spec-cell-label">TARGET SCORE</span>
            <span class="spec-cell-value" style="color: var(--cyan);">${lvl.targetScore.toLocaleString()} PTS</span>
          </div>
          <div class="spec-cell">
            <span class="spec-cell-label">PILOT HIGH SCORE</span>
            <span class="spec-cell-value" style="color: var(--text-bright);">${highScore.toLocaleString()} PTS</span>
          </div>
        </div>

        <!-- Star Rating Thresholds -->
        <div class="dossier-stars-section">
          <div class="stars-header">
            <span class="dossier-label">CAMPAIGN STAR PERFORMANCE</span>
            <div class="stars-display">${starIcons}</div>
          </div>
          <div class="stars-thresholds-row">
            <span class="thresh-pill ${scoreReached(highScore, lvl.scoreThresholds.star1)}">1★: ${lvl.scoreThresholds.star1.toLocaleString()}</span>
            <span class="thresh-pill ${scoreReached(highScore, lvl.scoreThresholds.star2)}">2★: ${lvl.scoreThresholds.star2.toLocaleString()}</span>
            <span class="thresh-pill ${scoreReached(highScore, lvl.scoreThresholds.star3)}">3★: ${lvl.scoreThresholds.star3.toLocaleString()}</span>
          </div>
        </div>

        <!-- Hostile Wave Threat Tags -->
        <div class="dossier-threat-tags">
          <span class="dossier-label">IDENTIFIED HOSTILE ARCHETYPES //</span>
          <div class="threat-tags-list">
            ${lvl.enemyWaves.map(enemy => `
              <span class="threat-tag">${formatEnemyName(enemy)}</span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Action Footer for Sector (Direct Deploy + Loadout Configuration) -->
      <div class="dossier-actions">
        ${isUnlocked ? `
          <div class="dossier-dual-actions">
            <button class="console-btn btn-primary btn-lg" id="btn-deploy-sector" data-deploy-sector="${lvl.id}">
              <span>▶ DEPLOY STRIKE CRAFT // SECTOR ${lvl.id.toString().padStart(2, '0')}</span>
              <span class="btn-subtext">DIRECT DEPLOYMENT · ${lvl.name}</span>
            </button>
            
            <button class="console-btn btn-secondary" id="btn-loadout-sector" data-loadout-sector="${lvl.id}">
              <span>🚀 CONFIGURE SHIP LOADOUT</span>
              <span class="btn-subtext">SELECT CHASSIS & WEAPONS</span>
            </button>
          </div>
        ` : `
          <button class="console-btn btn-danger btn-lg" id="btn-locked-sector" data-locked-sector="${lvl.id}" style="opacity: 0.85; border-color: rgba(232, 54, 75, 0.6);">
            <span>🔒 SECTOR LOCKED — CLEAR SECTOR ${prevSector.toString().padStart(2, '0')}</span>
            <span class="btn-subtext">CLICK FOR DENIAL DIAGNOSTIC</span>
          </button>
        `}
      </div>
    `;
  },

  _bindDossierActions(container, router) {
    // 1. Direct Deploy Button
    const deployBtn = container.querySelector('#btn-deploy-sector');
    if (deployBtn) {
      deployBtn.addEventListener('click', () => {
        const sectorId = parseInt(deployBtn.getAttribute('data-deploy-sector'), 10) || this._selectedSectorId;
        this._deploySector(sectorId, router);
      });
      deployBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // 2. Loadout Configuration Button
    const loadoutBtn = container.querySelector('#btn-loadout-sector');
    if (loadoutBtn) {
      loadoutBtn.addEventListener('click', () => {
        soundManager.playClick();
        const sectorId = parseInt(loadoutBtn.getAttribute('data-loadout-sector'), 10) || this._selectedSectorId;
        SaveManager.save({ currentSector: sectorId });
        if (router) {
          router.show('loadout', { sector: sectorId });
        }
      });
      loadoutBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // 3. Locked Button Denial Trigger
    const lockedBtn = container.querySelector('#btn-locked-sector');
    if (lockedBtn) {
      lockedBtn.addEventListener('click', () => {
        const sectorId = parseInt(lockedBtn.getAttribute('data-locked-sector'), 10) || this._selectedSectorId;
        const nodeElements = container.querySelectorAll('.starmap-node');
        const targetNode = Array.from(nodeElements).find(n => parseInt(n.getAttribute('data-sector-id'), 10) === sectorId);
        soundManager.playDeny();
        this._triggerDenialFeedback(targetNode, sectorId);
      });
    }
  },

  unmount() {
    if (this._boundKeyDown) {
      window.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
    this._container = null;
    this._router = null;
  }
};

function scoreReached(score, target) {
  return score >= target ? 'reached' : '';
}

function formatEnemyName(str) {
  return str.replace(/_/g, ' ').toUpperCase();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
