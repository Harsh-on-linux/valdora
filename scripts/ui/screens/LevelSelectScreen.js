/**
 * LevelSelectScreen — Star-Map Tactical Console & Sector Deployment Interface
 * Renders an interactive node-graph celestial sector map of all 10 campaign theaters,
 * visual lock states, star rating badges, boss hazard aesthetics for Sectors 5 & 10,
 * and real-time sector intelligence briefings.
 */

import { LEVELS, getLevelById, isLevelUnlocked } from '../../game/levels.js';
import { SaveManager } from '../../game/SaveManager.js';
import { soundManager } from '../../audio/index.js';

export const LevelSelectScreen = {
  _selectedSectorId: 1,

  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const maxUnlocked = save.maxSectorUnlocked || 1;
    const currentSector = save.currentSector || 1;
    const starsEarned = save.starsEarned || 0;
    const totalPossibleStars = LEVELS.length * 3;
    const callsign = save.pilotCallsign || 'PHANTOM';

    // Set default selected sector to the active mission or sector passed in data
    this._selectedSectorId = data.sector || currentSector || 1;
    if (this._selectedSectorId > 10) this._selectedSectorId = 10;

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
          <div class="starmap-canvas-container">
            <div class="starmap-grid-lines"></div>
            <div class="starmap-radar-sweep"></div>
            
            <!-- SVG Vector Flight Paths Connecting Nodes -->
            <svg class="starmap-svg-paths" viewBox="0 0 100 100" preserveAspectRatio="none">
              ${this._renderSvgPaths(maxUnlocked)}
            </svg>

            <!-- 10 Tactical Sector Nodes -->
            <div class="starmap-nodes-layer">
              ${LEVELS.map(lvl => this._renderNode(lvl, maxUnlocked, save)).join('')}
            </div>

            <!-- Coordinate corner markers -->
            <div class="map-corner map-corner-tl">GRID // 00-A</div>
            <div class="map-corner map-corner-tr">SECTOR // APEX</div>
            <div class="map-corner map-corner-bl">RADAR // 360°</div>
            <div class="map-corner map-corner-br">MGRS // 4420</div>
          </div>

          <!-- ═══════════ RIGHT: SECTOR INTEL DOSSIER BRIEFING ═══════════ -->
          <div class="sector-dossier-panel" id="sector-dossier">
            ${this._renderDossier(this._selectedSectorId, maxUnlocked, save)}
          </div>
        </div>

        <!-- Footer Navigation -->
        <div class="screen-footer" style="padding-top: 8px; border-top: 1px solid rgba(45, 212, 220, 0.15);">
          <button class="console-btn btn-secondary" data-nav="landing" style="flex: 1;">
            <span>◀ RETURN TO COCKPIT</span>
          </button>
          <button class="console-btn" data-nav="loadout" style="flex: 1;">
            <span>🚀 SHIP LOADOUT</span>
          </button>
          <button class="console-btn" data-nav="settings" style="flex: 0.8;">
            <span>⚙ SETTINGS</span>
          </button>
        </div>
      </div>
    `;

    // ═══════════════════════════════════════════════════════════════════
    //  INTERACTIVE HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    // 1. Wire Node Click / Selection
    const nodeElements = container.querySelectorAll('.starmap-node');
    const dossierContainer = container.querySelector('#sector-dossier');

    nodeElements.forEach(node => {
      const sectorId = parseInt(node.getAttribute('data-sector-id'), 10);
      const isUnlocked = isLevelUnlocked(sectorId, maxUnlocked);

      node.addEventListener('click', () => {
        if (isUnlocked) {
          soundManager.playClick();
        } else {
          soundManager.playDeny();
        }

        this._selectedSectorId = sectorId;

        // Highlight selected node
        nodeElements.forEach(n => n.classList.remove('selected'));
        node.classList.add('selected');

        // Update Dossier
        if (dossierContainer) {
          dossierContainer.innerHTML = this._renderDossier(sectorId, maxUnlocked, save);
          this._bindDossierActions(container, router, sectorId, maxUnlocked);
        }
      });

      node.addEventListener('mouseenter', () => {
        if (isUnlocked) {
          soundManager.playHover();
        }
      });
    });

    // 2. Bind initial Dossier Deploy button
    this._bindDossierActions(container, router, this._selectedSectorId, maxUnlocked);

    // 3. Navigation Buttons
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          router.show(target);
        }
      });
    });

    // 4. Hover sounds on footer buttons
    container.querySelectorAll('button, .console-btn, .tac-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundManager.playHover());
    });
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
           title="Sector ${lvl.id}: ${lvl.name} (${isUnlocked ? 'UNLOCKED' : 'LOCKED'})">
        
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

  _renderSvgPaths(maxUnlocked) {
    let paths = '';
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const from = LEVELS[i];
      const to = LEVELS[i + 1];
      const isPathUnlocked = isLevelUnlocked(to.id, maxUnlocked);

      paths += `
        <line x1="${from.mapPosition.x}" y1="${from.mapPosition.y}" 
              x2="${to.mapPosition.x}" y2="${to.mapPosition.y}" 
              class="starmap-path ${isPathUnlocked ? 'path-unlocked' : 'path-locked'}" />
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

      <!-- Action Footer for Sector -->
      <div class="dossier-actions">
        ${isUnlocked ? `
          <button class="console-btn btn-primary btn-lg" id="btn-deploy-sector" data-deploy-sector="${lvl.id}">
            <span>▶ DEPLOY STRIKE CRAFT // SECTOR ${lvl.id.toString().padStart(2, '0')}</span>
            <span class="btn-subtext">ENGAGE ${lvl.name}</span>
          </button>
        ` : `
          <button class="console-btn btn-secondary btn-lg" disabled style="opacity: 0.6; cursor: not-allowed;">
            <span>🔒 SECTOR LOCKED</span>
            <span class="btn-subtext">COMPLETE SECTOR ${(lvl.id - 1).toString().padStart(2, '0')} TO UNLOCK</span>
          </button>
        `}
      </div>
    `;
  },

  _bindDossierActions(container, router, sectorId, maxUnlocked) {
    const deployBtn = container.querySelector('#btn-deploy-sector');
    if (deployBtn) {
      deployBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) {
          router.show('game', { sector: sectorId });
        }
      });
      deployBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }
  },

  unmount() {}
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
