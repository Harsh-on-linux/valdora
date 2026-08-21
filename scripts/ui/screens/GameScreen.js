/**
 * GameScreen — Active Gameplay View & Tactical HUD Overlay
 * Features:
 * - Real-time ship integrity & energy shield telemetry
 * - Interactive Active / Passive Radar toggle with RF emission monitoring
 * - Dynamic Ordnance meters (Ammo capacitor, Thermal heat gauge, Missile bay racks)
 * - Live MGRS Coordinate tracking (Grid, Sector X/Y/Z, Altitude, Bearing, G-Force)
 * - Mobile on-screen touch controls (Dynamic Joystick, Boost, Fire, Radar toggle)
 * - Seamless pause, abort, and debrief routing
 */

import { SaveManager } from '../../game/SaveManager.js';
import { getLevelById } from '../../game/levels.js';
import { soundManager } from '../../audio/index.js';
import { GameEngine, ENGINE_STATE } from '../../game/GameEngine.js';
import { RADAR_MODES } from '../../game/TacticalHUDOverlay.js';

let activeEngine = null;
let telemetryUnsub = null;
let keyHandler = null;

export const GameScreen = {
  mount(container, data = {}, router) {
    const save = SaveManager.getSaveData();
    const sectorId = data.sector || save.currentSector || 1;
    const levelInfo = getLevelById(sectorId);
    const sectorName = levelInfo ? levelInfo.name : `SECTOR ${sectorId.toString().padStart(2, '0')}`;
    const droneName = save.selectedDrone || 'STRIKER';
    const weaponName = save.selectedPayload || 'VULCAN CANNON';

    // Show the game canvas during gameplay
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) gameCanvas.classList.add('active');

    container.innerHTML = `
      <div class="hud-layer">
        <!-- ═══════════ TOP HUD BAR ═══════════ -->
        <div class="hud-top-bar">
          <div class="hud-info-card" id="card-integrity">
            <span class="hud-label">HULL // SHIELD</span>
            <span class="hud-value" style="display: flex; gap: 8px; font-size: 0.95rem;">
              <span id="hud-hull-val" style="color: var(--cyan-bright)">100%</span>
              <span style="color: var(--text-muted)">|</span>
              <span id="hud-shield-val" style="color: var(--green)">100%</span>
            </span>
            <div class="hud-bar-pair">
              <div class="hud-mini-track"><div class="hud-mini-fill cyan" id="hud-hull-fill" style="width: 100%;"></div></div>
              <div class="hud-mini-track"><div class="hud-mini-fill green" id="hud-shield-fill" style="width: 100%;"></div></div>
            </div>
          </div>

          <div class="hud-info-card score-card hud-theater-card" style="text-align: center;">
            <span class="hud-label">THEATER // SECTOR ${sectorId.toString().padStart(2, '0')}</span>
            <span class="hud-value" style="color: var(--glow-cyan); font-size: 0.95rem;">${escapeHtml(sectorName)}</span>
          </div>

          <div class="hud-info-card score-card">
            <span class="hud-label">MISSION SCORE</span>
            <span class="hud-value" id="hud-score-val" style="color: var(--amber)">000,000</span>
          </div>

          <div class="hud-info-card hud-fps-card" style="min-width: 75px; text-align: right;">
            <span class="hud-label">SIM FPS</span>
            <span class="hud-value" id="hud-fps-val" style="color: var(--glow-cyan); font-size: 0.95rem;">60</span>
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="console-btn btn-sm btn-secondary" id="btn-toggle-hitboxes" title="Toggle Collision Hitbox Debug (Hotkey: H / F3)">
              <span>🎯 HITBOXES</span>
            </button>
            <button class="console-btn btn-sm" id="btn-pause" title="Pause Mission (Esc / P)">
              <span>⏸ PAUSE</span>
            </button>
          </div>
        </div>

        <!-- ═══════════ MIDDLE TACTICAL SIDE PANELS ═══════════ -->
        <div class="hud-mid-tactical-layout">
          <!-- LEFT SIDEBAR: SHIP SYSTEMS & COORDINATES -->
          <div class="hud-sidebar-left">
            <div class="hud-data-panel" id="panel-ship-telemetry">
              <div class="hud-panel-title">
                <span class="hud-panel-dot cyan"></span> SHIP SYSTEMS
              </div>
              <div class="hud-sys-row">
                <span class="hud-sys-label">HULL INTEGRITY</span>
                <span class="hud-sys-value" id="hud-sys-hull" style="color: var(--cyan-bright);">100%</span>
              </div>
              <div class="hud-sys-row">
                <span class="hud-sys-label">ENERGY SHIELD</span>
                <span class="hud-sys-value" id="hud-sys-shield" style="color: var(--green);">100%</span>
              </div>
              <div class="hud-sys-row">
                <span class="hud-sys-label">RADAR ARRAY</span>
                <span class="hud-sys-value" id="hud-sys-radar" style="color: var(--cyan);">ACTIVE</span>
              </div>
              <div class="hud-sys-row">
                <span class="hud-sys-label">THREAT CONTACTS</span>
                <span class="hud-sys-value" id="hud-sys-threats" style="color: var(--amber);">3 HOSTILE</span>
              </div>
            </div>

            <!-- Real-time Tactical Coordinates -->
            <div class="hud-data-panel hud-coords-panel">
              <div class="hud-panel-title">
                <span class="hud-panel-dot amber"></span> MGRS GRID: <span id="hud-coord-grid">44V-UTM</span>
              </div>
              <div class="hud-coords-stream">
                <div>X: <span id="hud-coord-x" class="hud-telemetry-num">1284.7</span></div>
                <div>Y: <span id="hud-coord-y" class="hud-telemetry-num">-892.3</span></div>
                <div>ALT: <span id="hud-coord-alt" class="hud-telemetry-num">1450m</span></div>
                <div>BRG: <span id="hud-coord-brg" class="hud-telemetry-num">000°</span> G: <span id="hud-coord-g" class="hud-telemetry-num">1.0G</span></div>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDEBAR: RADAR MODE TOGGLE & ORDNANCE METERS -->
          <div class="hud-sidebar-right">
            <!-- Active/Passive Radar Mode Pill Button -->
            <div class="hud-data-panel hud-radar-control-panel">
              <div class="hud-panel-title">
                <span class="hud-panel-dot" id="hud-radar-status-dot"></span> RADAR EMISSION
              </div>
              <button class="hud-radar-toggle-btn active" id="btn-toggle-radar" title="Toggle Active / Passive Radar (Hot-key: R)">
                <span class="radar-mode-badge" id="hud-radar-mode-badge">RADAR: ACTIVE</span>
                <span class="radar-rf-badge" id="hud-radar-rf-badge">100% RF (HIGH)</span>
              </button>
            </div>

            <!-- Ordnance Weapon Bay / Cycle Selector -->
            <div class="hud-data-panel hud-weapon-bay-panel">
              <div class="hud-panel-title">
                <span class="hud-panel-dot amber"></span> WEAPON ARSENAL
                <span class="hud-panel-hint">[Q / E]</span>
              </div>

              <!-- Active Weapon Overview Display -->
              <div class="hud-active-weapon-card">
                <span class="hud-weapon-icon-badge" id="hud-weapon-icon">⦿</span>
                <div class="hud-weapon-details">
                  <div class="hud-weapon-name" id="hud-weapon-name">GAU-22 VULCAN</div>
                  <div class="hud-weapon-meta" id="hud-weapon-meta">KINETIC // RAPID TWIN</div>
                </div>
              </div>

              <!-- Weapon Slots Selector (1 to 4) -->
              <div class="hud-weapon-slots" id="hud-weapon-slots">
                <button class="weapon-slot-chip active" data-slot="1" data-weapon="VULCAN" title="Slot 1: Vulcan Cannon (Hotkey: 1)">
                  <span class="slot-num">1</span>
                  <span class="slot-icon">⦿</span>
                  <span class="slot-name">VULCAN</span>
                </button>
                <button class="weapon-slot-chip" data-slot="2" data-weapon="FLAK" title="Slot 2: MK-44 Flak Cannon (Hotkey: 2)">
                  <span class="slot-num">2</span>
                  <span class="slot-icon">✦</span>
                  <span class="slot-name">FLAK</span>
                </button>
                <button class="weapon-slot-chip" data-slot="3" data-weapon="LASER" title="Slot 3: Athena Beam (Hotkey: 3)">
                  <span class="slot-num">3</span>
                  <span class="slot-icon">◇</span>
                  <span class="slot-name">LASER</span>
                </button>
                <button class="weapon-slot-chip" data-slot="4" data-weapon="HELLFIRE" title="Slot 4: Hellfire Swarm (Hotkey: 4)">
                  <span class="slot-num">4</span>
                  <span class="slot-icon">▲</span>
                  <span class="slot-name">MISSILE</span>
                </button>
              </div>

              <!-- Prev / Next Weapon Cycle Buttons -->
              <div class="hud-weapon-cycle-row">
                <button class="hud-cycle-btn" id="btn-weapon-prev" title="Cycle Previous Weapon (Hotkey: Q)">◀ Q</button>
                <span class="hud-cycle-label">CYCLE WEAPON</span>
                <button class="hud-cycle-btn" id="btn-weapon-next" title="Cycle Next Weapon (Hotkey: E)">E ▶</button>
              </div>
            </div>

            <!-- Ordnance Status Gauges -->
            <div class="hud-data-panel hud-ordnance-panel">
              <div class="hud-panel-title">
                <span class="hud-panel-dot cyan"></span> ORDNANCE METERS
              </div>

              <!-- Primary Weapon Ammo -->
              <div class="hud-meter-block">
                <div class="hud-meter-header">
                  <span>AMMO CAPACITOR</span>
                  <span id="hud-ammo-val" style="color: var(--cyan-bright);">100%</span>
                </div>
                <div class="hud-meter-track">
                  <div class="hud-meter-fill cyan" id="hud-ammo-fill" style="width: 100%;"></div>
                </div>
              </div>

              <!-- Thermal Heat Gauge -->
              <div class="hud-meter-block">
                <div class="hud-meter-header">
                  <span>THERMAL HEAT</span>
                  <span id="hud-heat-val" style="color: var(--green);">0%</span>
                </div>
                <div class="hud-meter-track">
                  <div class="hud-meter-fill green" id="hud-heat-fill" style="width: 0%;"></div>
                </div>
                <div class="hud-overheat-alert" id="hud-overheat-warn" style="display: none;">⚠️ OVERHEAT LOCKOUT</div>
              </div>

              <!-- Missile Bay Rack -->
              <div class="hud-meter-block">
                <div class="hud-meter-header">
                  <span>MISSILE BAY</span>
                  <span id="hud-missiles-val" style="color: var(--amber);">6/6</span>
                </div>
                <div class="hud-missile-pips" id="hud-missile-pips">
                  <span class="missile-pip armed"></span>
                  <span class="missile-pip armed"></span>
                  <span class="missile-pip armed"></span>
                  <span class="missile-pip armed"></span>
                  <span class="missile-pip armed"></span>
                  <span class="missile-pip armed"></span>
                </div>
              </div>

              <!-- Lock-on Status -->
              <div class="hud-sys-row" style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed rgba(0, 240, 255, 0.2);">
                <span class="hud-sys-label">LOCK STATUS</span>
                <span class="hud-sys-value" id="hud-lock-val" style="color: var(--cyan-bright);">AUTO // SCAN</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════ ON-SCREEN TOUCH CONTROLS (MOBILE) ═══════════ -->
        <div class="hud-touch-controls">
          <div class="hud-touch-left-hint">
            <span>✜ TOUCH LEFT TO PILOT</span>
            <span style="font-size: 0.6rem; color: var(--text-secondary);">DYNAMIC JOYSTICK</span>
          </div>

          <div class="hud-touch-right-actions">
            <button class="touch-action-btn weapon-btn" id="btn-touch-weapon" title="Cycle Weapon Payload (Q/E)">
              <span class="touch-action-icon" id="hud-touch-weapon-icon">✦</span>
              <span id="hud-touch-weapon-label">WEAPON</span>
            </button>
            <button class="touch-action-btn radar-btn" id="btn-touch-radar" title="Toggle Radar (Active/Passive)">
              <span class="touch-action-icon">📡</span>
              <span>RADAR</span>
            </button>
            <button class="touch-action-btn" id="btn-touch-boost" title="Engage Thruster Boost">
              <span class="touch-action-icon">⚡</span>
              <span>BOOST</span>
            </button>
            <button class="touch-action-btn fire-btn" id="btn-touch-fire" title="Primary Fire">
              <span class="touch-action-icon">⦿</span>
              <span>FIRE</span>
            </button>
          </div>
        </div>

        <!-- ═══════════ BOTTOM HUD BAR ═══════════ -->
        <div class="hud-bottom-bar">
          <div class="hud-info-card">
            <span class="hud-label">PAYLOAD // DRONE CHASSIS</span>
            <span class="hud-value" style="color: var(--glow-amber); font-size: 0.9rem;">
              ${escapeHtml(weaponName)} · ${escapeHtml(droneName)}
            </span>
          </div>

          <div class="hud-info-card hud-flight-telemetry" style="font-family: var(--font-hud-mono, monospace); font-size: 0.75rem; color: var(--text-secondary);">
            <span>SPD: <span id="hud-speed-val" style="color: #ffffff;">0</span> KM/S</span>
            <span style="margin-left: 8px;">THR: <span id="hud-thrust-val" style="color: var(--amber);">50</span>%</span>
            <span style="margin-left: 8px;">TIME: <span id="hud-sim-time" style="color: var(--cyan)">0.0s</span></span>
            <span style="margin-left: 8px;">MODE: <span id="hud-control-scheme" style="color: var(--green)">AUTO</span></span>
          </div>

          <div class="hud-actions-right">
            <button class="console-btn btn-sm btn-secondary" id="btn-abort-to-map">
              <span>◀ ABORT</span>
            </button>
            <button class="console-btn btn-sm btn-primary" id="btn-test-results">
              <span>DEBRIEF ▶</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // 1. Initialize or connect to GameEngine
    if (!window.__gameEngine && gameCanvas) {
      window.__gameEngine = new GameEngine(gameCanvas);
    }
    activeEngine = window.__gameEngine;

    if (activeEngine) {
      // If coming back from pause, resume; otherwise start fresh
      if (activeEngine.state === ENGINE_STATE.PAUSED && data.resuming) {
        activeEngine.resume();
      } else {
        activeEngine.start({
          sector: sectorId,
          drone: droneName,
          weapon: weaponName
        });
      }

      // Hook up live HUD telemetry listener
      const fpsEl = container.querySelector('#hud-fps-val');
      const scoreEl = container.querySelector('#hud-score-val');
      const hullEl = container.querySelector('#hud-hull-val');
      const shieldEl = container.querySelector('#hud-shield-val');
      const hullFill = container.querySelector('#hud-hull-fill');
      const shieldFill = container.querySelector('#hud-shield-fill');
      const sysHullEl = container.querySelector('#hud-sys-hull');
      const sysShieldEl = container.querySelector('#hud-sys-shield');
      const sysRadarEl = container.querySelector('#hud-sys-radar');
      const sysThreatsEl = container.querySelector('#hud-sys-threats');

      const coordXEl = container.querySelector('#hud-coord-x');
      const coordYEl = container.querySelector('#hud-coord-y');
      const coordAltEl = container.querySelector('#hud-coord-alt');
      const coordBrgEl = container.querySelector('#hud-coord-brg');
      const coordGEl = container.querySelector('#hud-coord-g');

      const radarToggleBtn = container.querySelector('#btn-toggle-radar');
      const radarModeBadge = container.querySelector('#hud-radar-mode-badge');
      const radarRfBadge = container.querySelector('#hud-radar-rf-badge');
      const radarStatusDot = container.querySelector('#hud-radar-status-dot');

      const weaponIconEl = container.querySelector('#hud-weapon-icon');
      const weaponNameEl = container.querySelector('#hud-weapon-name');
      const weaponMetaEl = container.querySelector('#hud-weapon-meta');
      const weaponSlotChips = container.querySelectorAll('.weapon-slot-chip');
      const touchWeaponIcon = container.querySelector('#hud-touch-weapon-icon');
      const touchWeaponLabel = container.querySelector('#hud-touch-weapon-label');

      const ammoValEl = container.querySelector('#hud-ammo-val');
      const ammoFillEl = container.querySelector('#hud-ammo-fill');
      const heatValEl = container.querySelector('#hud-heat-val');
      const heatFillEl = container.querySelector('#hud-heat-fill');
      const overheatWarnEl = container.querySelector('#hud-overheat-warn');
      const missilesValEl = container.querySelector('#hud-missiles-val');
      const missilePipsContainer = container.querySelector('#hud-missile-pips');
      const lockValEl = container.querySelector('#hud-lock-val');

      const speedEl = container.querySelector('#hud-speed-val');
      const thrustEl = container.querySelector('#hud-thrust-val');
      const simTimeEl = container.querySelector('#hud-sim-time');
      const schemeEl = container.querySelector('#hud-control-scheme');
      const hitboxesBtn = container.querySelector('#btn-toggle-hitboxes');

      const onTelemetry = (telem) => {
        if (fpsEl) fpsEl.textContent = telem.fps;
        if (scoreEl) scoreEl.textContent = String(telem.score).padStart(6, '0');

        const hullPct = Math.round((telem.hull / (telem.maxHull || 100)) * 100);
        const shieldPct = Math.round((telem.shield / (telem.maxShield || 100)) * 100);

        if (hullEl) hullEl.textContent = `${hullPct}%`;
        if (shieldEl) shieldEl.textContent = `${shieldPct}%`;
        if (hullFill) hullFill.style.width = `${hullPct}%`;
        if (shieldFill) shieldFill.style.width = `${shieldPct}%`;
        if (sysHullEl) sysHullEl.textContent = `${hullPct}%`;
        if (sysShieldEl) sysShieldEl.textContent = `${shieldPct}%`;

        // Radar mode updates
        const isRadarActive = telem.radarMode === RADAR_MODES.ACTIVE;
        if (sysRadarEl) {
          sysRadarEl.textContent = telem.radarMode || 'ACTIVE';
          sysRadarEl.style.color = isRadarActive ? 'var(--cyan-bright)' : 'var(--amber)';
        }

        if (radarToggleBtn) {
          radarToggleBtn.classList.toggle('active', isRadarActive);
          radarToggleBtn.classList.toggle('passive', !isRadarActive);
        }
        if (radarModeBadge) {
          radarModeBadge.textContent = isRadarActive ? 'RADAR: ACTIVE' : 'RADAR: PASSIVE';
        }
        if (radarRfBadge) {
          radarRfBadge.textContent = isRadarActive ? '100% RF (HIGH)' : '0% RF (SILENT)';
          radarRfBadge.style.color = isRadarActive ? 'var(--cyan-bright)' : 'var(--amber)';
        }
        if (radarStatusDot) {
          radarStatusDot.className = `hud-panel-dot ${isRadarActive ? 'cyan pulse' : 'amber'}`;
        }

        // Active Weapon Arsenal Updates
        if (weaponIconEl && telem.weaponIcon) weaponIconEl.textContent = telem.weaponIcon;
        if (weaponNameEl && telem.weaponName) weaponNameEl.textContent = telem.weaponName;
        if (weaponMetaEl && telem.weaponClass) {
          weaponMetaEl.textContent = `${telem.weaponClass} // ARMED`;
          weaponMetaEl.style.color = telem.weaponColor || 'var(--text-secondary)';
        }
        if (touchWeaponIcon && telem.weaponIcon) touchWeaponIcon.textContent = telem.weaponIcon;
        if (touchWeaponLabel && telem.activeWeapon) touchWeaponLabel.textContent = telem.activeWeapon;

        // Weapon slot chip highlights
        if (weaponSlotChips && telem.activeWeapon) {
          weaponSlotChips.forEach(chip => {
            const isMatch = chip.dataset.weapon === telem.activeWeapon;
            chip.classList.toggle('active', isMatch);
          });
        }

        // Coordinates & Telemetry stream
        if (coordXEl && telem.coordX !== undefined) coordXEl.textContent = telem.coordX;
        if (coordYEl && telem.coordY !== undefined) coordYEl.textContent = telem.coordY;
        if (coordAltEl && telem.altitude !== undefined) coordAltEl.textContent = `${telem.altitude}m`;
        if (coordBrgEl && telem.bearing !== undefined) coordBrgEl.textContent = `${String(telem.bearing).padStart(3, '0')}°`;
        if (coordGEl && telem.gForce !== undefined) coordGEl.textContent = `${telem.gForce}G`;

        // Ordnance: Ammo & Heat
        if (ammoValEl && telem.ammo !== undefined) ammoValEl.textContent = `${telem.ammo}%`;
        if (ammoFillEl && telem.ammo !== undefined) {
          ammoFillEl.style.width = `${telem.ammo}%`;
          ammoFillEl.className = `hud-meter-fill ${telem.ammo < 20 ? 'red' : (telem.ammo < 50 ? 'amber' : 'cyan')}`;
        }

        if (heatValEl && telem.heat !== undefined) heatValEl.textContent = `${telem.heat}%`;
        if (heatFillEl && telem.heat !== undefined) {
          heatFillEl.style.width = `${telem.heat}%`;
          heatFillEl.className = `hud-meter-fill ${telem.isOverheated ? 'red pulse' : (telem.heat > 70 ? 'amber' : 'green')}`;
        }
        if (overheatWarnEl) {
          overheatWarnEl.style.display = telem.isOverheated ? 'block' : 'none';
        }

        // Missile bay pips
        if (missilesValEl && telem.missiles !== undefined) {
          missilesValEl.textContent = `${telem.missiles}/${telem.maxMissiles || 6}`;
        }
        if (missilePipsContainer && telem.missiles !== undefined) {
          const maxM = telem.maxMissiles || 6;
          let pipsHtml = '';
          for (let m = 0; m < maxM; m++) {
            const isArmed = m < telem.missiles;
            pipsHtml += `<span class="missile-pip ${isArmed ? 'armed' : 'empty'}"></span>`;
          }
          missilePipsContainer.innerHTML = pipsHtml;
        }

        // Target Lock Status
        if (lockValEl) {
          if (telem.lockedTargetId) {
            lockValEl.textContent = `LOCKED // ${telem.lockedTargetId}`;
            lockValEl.style.color = 'var(--danger-red, #ff003c)';
          } else {
            lockValEl.textContent = isRadarActive ? 'AUTO // SCANNING' : 'PASSIVE // SILENT';
            lockValEl.style.color = isRadarActive ? 'var(--cyan-bright)' : 'var(--amber)';
          }
        }

        if (speedEl) speedEl.textContent = telem.speed || 0;
        if (thrustEl) thrustEl.textContent = telem.thrust || 50;
        if (simTimeEl) simTimeEl.textContent = `${telem.simTime}s`;
        if (schemeEl) schemeEl.textContent = telem.controlScheme ? telem.controlScheme.toUpperCase() : 'AUTO';

        if (hitboxesBtn && telem.collisionDebug !== undefined) {
          hitboxesBtn.classList.toggle('btn-primary', !!telem.collisionDebug);
          hitboxesBtn.classList.toggle('btn-secondary', !telem.collisionDebug);
        }
      };

      activeEngine.on('telemetry', onTelemetry);
      telemetryUnsub = () => activeEngine.off('telemetry', onTelemetry);
    }

    // 2. Hitbox Debug Toggle Click Handler
    const hitboxesBtn = container.querySelector('#btn-toggle-hitboxes');
    if (hitboxesBtn) {
      hitboxesBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (activeEngine) activeEngine.toggleCollisionDebug();
      });
      hitboxesBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // 3. Radar Mode Toggle Click Handler
    const radarBtn = container.querySelector('#btn-toggle-radar');
    const toggleRadarHandler = () => {
      soundManager.playClick();
      if (activeEngine) {
        activeEngine.toggleRadarMode();
      }
    };
    if (radarBtn) {
      radarBtn.addEventListener('click', toggleRadarHandler);
    }

    const touchRadarBtn = container.querySelector('#btn-touch-radar');
    if (touchRadarBtn) {
      touchRadarBtn.addEventListener('click', toggleRadarHandler);
    }

    // 4. Weapon Cycle & Slot Selection Handlers
    const weaponPrevBtn = container.querySelector('#btn-weapon-prev');
    if (weaponPrevBtn) {
      weaponPrevBtn.addEventListener('click', () => {
        if (activeEngine) activeEngine.cycleWeapon(-1);
      });
      weaponPrevBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const weaponNextBtn = container.querySelector('#btn-weapon-next');
    if (weaponNextBtn) {
      weaponNextBtn.addEventListener('click', () => {
        if (activeEngine) activeEngine.cycleWeapon(1);
      });
      weaponNextBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const touchWeaponBtn = container.querySelector('#btn-touch-weapon');
    if (touchWeaponBtn) {
      touchWeaponBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeEngine) activeEngine.cycleWeapon(1);
      });
    }

    const weaponChips = container.querySelectorAll('.weapon-slot-chip');
    weaponChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const slot = Number(chip.dataset.slot) || 1;
        if (activeEngine) activeEngine.selectWeaponSlot(slot);
      });
      chip.addEventListener('mouseenter', () => soundManager.playHover());
    });

    // 4. Navigation Buttons
    const pauseBtn = container.querySelector('#btn-pause');
    const triggerPause = () => {
      soundManager.playClick();
      if (activeEngine) activeEngine.pause();
      if (router) router.show('pause', { sector: sectorId });
    };

    if (pauseBtn) {
      pauseBtn.addEventListener('click', triggerPause);
      pauseBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const abortBtn = container.querySelector('#btn-abort-to-map');
    if (abortBtn) {
      abortBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (activeEngine) activeEngine.stop();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      abortBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const resultsBtn = container.querySelector('#btn-test-results');
    if (resultsBtn) {
      resultsBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (activeEngine) activeEngine.stop();
        if (router) router.show('results', { sector: sectorId });
      });
      resultsBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // 4. Touch Action Buttons (Fire & Boost)
    const touchFireBtn = container.querySelector('#btn-touch-fire');
    if (touchFireBtn && activeEngine) {
      const setFire = (firing) => {
        if (activeEngine.input) {
          activeEngine.input.touchFire.active = firing;
          activeEngine.input.actions.fire = firing;
        }
        touchFireBtn.classList.toggle('active', firing);
      };

      touchFireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setFire(true); }, { passive: false });
      touchFireBtn.addEventListener('touchend', (e) => { e.preventDefault(); setFire(false); });
      touchFireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setFire(false); });
      touchFireBtn.addEventListener('mousedown', (e) => { e.preventDefault(); setFire(true); });
      window.addEventListener('mouseup', () => setFire(false));
    }

    const touchBoostBtn = container.querySelector('#btn-touch-boost');
    if (touchBoostBtn && activeEngine) {
      const setBoost = (boosting) => {
        if (activeEngine.input) {
          activeEngine.input.actions.boost = boosting;
        }
        touchBoostBtn.classList.toggle('active', boosting);
      };

      touchBoostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setBoost(true); }, { passive: false });
      touchBoostBtn.addEventListener('touchend', (e) => { e.preventDefault(); setBoost(false); });
      touchBoostBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setBoost(false); });
      touchBoostBtn.addEventListener('mousedown', (e) => { e.preventDefault(); setBoost(true); });
      window.addEventListener('mouseup', () => setBoost(false));
    }

    // 5. Keyboard Escape to Pause
    keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        triggerPause();
      }
    };
    window.addEventListener('keydown', keyHandler);
  },

  unmount() {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (telemetryUnsub) {
      telemetryUnsub();
      telemetryUnsub = null;
    }

    // Note: If navigating to 'pause', engine is paused, otherwise stop
    const activeScreen = window.__screenManager?.currentScreenName;
    if (activeEngine && activeScreen !== 'pause') {
      activeEngine.stop();
    }

    // Hide the game canvas when leaving gameplay (unless in pause screen)
    if (activeScreen !== 'pause') {
      const gameCanvas = document.getElementById('game-canvas');
      if (gameCanvas) gameCanvas.classList.remove('active');
    }
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
