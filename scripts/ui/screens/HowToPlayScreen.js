/**
 * HowToPlayScreen — Tactical Flight Manual, Interactive Controls & Intel Dossier
 * Features interactive controls tester with live keydown feedback, weapons arsenal specs,
 * enemy threat intelligence, and supply drop legend.
 */

import { soundManager } from '../../audio/index.js';

export const HowToPlayScreen = {
  _activeTab: 'controls',
  _keyListener: null,
  _keyUpListener: null,

  mount(container, data = {}, router) {
    this._activeTab = data.tab || 'controls';

    container.innerHTML = `
      <div class="console-panel manual-panel">
        <!-- Header -->
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">COMBAT FIELD MANUAL</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.58rem;">TACTICAL FLIGHT OPS & WEAPONS SPECIFICATION</p>
          </div>
          <span class="hud-badge">DOC // TAC-04</span>
        </div>

        <!-- Tab Navigation -->
        <div class="manual-tabs">
          <button class="manual-tab-btn ${this._activeTab === 'controls' ? 'active' : ''}" data-tab="controls">
            <span>🕹️ FLIGHT CONTROLS</span>
          </button>
          <button class="manual-tab-btn ${this._activeTab === 'weapons' ? 'active' : ''}" data-tab="weapons">
            <span>⚡ WEAPONS ARSENAL</span>
          </button>
          <button class="manual-tab-btn ${this._activeTab === 'threats' ? 'active' : ''}" data-tab="threats">
            <span>🎯 ENEMY INTEL & DROPS</span>
          </button>
        </div>

        <!-- Scrollable Content Viewport -->
        <div class="manual-content-viewport" id="manual-content">
          ${this._renderTabContent(this._activeTab)}
        </div>

        <!-- Footer Navigation -->
        <div class="screen-footer" style="padding-top: 10px; border-top: 1px solid rgba(45, 212, 220, 0.15);">
          <button class="console-btn btn-secondary" data-nav="landing" style="flex: 1;">
            <span>◀ RETURN TO COCKPIT</span>
          </button>
          <button class="console-btn" data-nav="settings" style="flex: 1;">
            <span>⚙ SYSTEM SETTINGS</span>
          </button>
          <button class="console-btn btn-primary" data-nav="game" style="flex: 1.2;">
            <span>▶ DEPLOY MISSION</span>
          </button>
        </div>
      </div>
    `;

    // 1. Tab Switching Handlers
    const tabBtns = container.querySelectorAll('.manual-tab-btn');
    const viewport = container.querySelector('#manual-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab === this._activeTab) return;
        soundManager.playClick();

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this._activeTab = targetTab;
        if (viewport) {
          viewport.innerHTML = this._renderTabContent(targetTab);
          this._bindTabInteractions(container, targetTab);
        }
      });
    });

    // 2. Bind interactive features of the current tab
    this._bindTabInteractions(container, this._activeTab);

    // 3. Navigation Buttons
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          if (target === 'game') {
            router.show('game', { sector: 1 });
          } else {
            router.show(target);
          }
        }
      });
    });

    // 4. Hover sound feedback
    container.querySelectorAll('button, .console-btn, .tac-btn, .manual-tab-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundManager.playHover());
    });
  },

  _renderTabContent(tab) {
    switch (tab) {
      case 'weapons':
        return this._renderWeaponsTab();
      case 'threats':
        return this._renderThreatsTab();
      case 'controls':
      default:
        return this._renderControlsTab();
    }
  },

  _renderControlsTab() {
    return `
      <div class="manual-section">
        <div class="manual-section-header">
          <span class="manual-section-title">⌨️ INTERACTIVE FLIGHT CONTROLS TESTER</span>
          <span class="telemetry-value" style="font-size: 0.58rem;">PRESS KEYS TO TEST</span>
        </div>

        <div class="key-tester-banner" id="key-feedback-banner">
          <span class="status-dot"></span>
          <span id="key-feedback-text">SYSTEM STANDBY — PRESS ANY FLIGHT KEY (WASD, SPACE, 1-4, Q/E)</span>
        </div>

        <!-- Interactive Visual Keyboard Diagram -->
        <div class="keyboard-diagram">
          <!-- Top Number Row: Weapons 1-4 -->
          <div class="kb-row">
            <div class="kb-key" data-key="Digit1" title="Equip Vulcan / Weapon 1"><span class="key-lbl">1</span><span class="key-act">VULCAN</span></div>
            <div class="kb-key" data-key="Digit2" title="Equip Flak / Weapon 2"><span class="key-lbl">2</span><span class="key-act">FLAK</span></div>
            <div class="kb-key" data-key="Digit3" title="Equip Laser / Weapon 3"><span class="key-lbl">3</span><span class="key-act">LASER</span></div>
            <div class="kb-key" data-key="Digit4" title="Equip Hellfire / Weapon 4"><span class="key-lbl">4</span><span class="key-act">HELLFIRE</span></div>
          </div>

          <!-- Maneuver Keys: Q, W, E -->
          <div class="kb-row">
            <div class="kb-key" data-key="KeyQ" title="Previous Weapon"><span class="key-lbl">Q</span><span class="key-act">PREV WEAPON</span></div>
            <div class="kb-key" data-key="KeyW" title="Thrust Forward / Climb"><span class="key-lbl">W / ▲</span><span class="key-act">THRUST</span></div>
            <div class="kb-key" data-key="KeyE" title="Next Weapon"><span class="key-lbl">E</span><span class="key-act">NEXT WEAPON</span></div>
          </div>

          <!-- Lateral Maneuver Keys: A, S, D -->
          <div class="kb-row">
            <div class="kb-key" data-key="KeyA" title="Bank Left"><span class="key-lbl">A / ◀</span><span class="key-act">LEFT</span></div>
            <div class="kb-key" data-key="KeyS" title="Reverse / Brake"><span class="key-lbl">S / ▼</span><span class="key-act">BRAKE</span></div>
            <div class="kb-key" data-key="KeyD" title="Bank Right"><span class="key-lbl">D / ▶</span><span class="key-act">RIGHT</span></div>
          </div>

          <!-- Primary Fire & Special Actions -->
          <div class="kb-row">
            <div class="kb-key kb-key-wide" data-key="Space" title="Primary Fire / Vulcan Cannon"><span class="key-lbl">SPACEBAR / LEFT-CLICK</span><span class="key-act">PRIMARY FIRE</span></div>
            <div class="kb-key" data-key="KeyP" title="Pause Tactical System"><span class="key-lbl">P / ESC</span><span class="key-act">PAUSE</span></div>
          </div>
        </div>

        <!-- Input Scheme Comparison Cards -->
        <div class="control-guides-grid">
          <div class="guide-card">
            <div class="guide-header">
              <span class="guide-icon">💻</span>
              <span class="guide-title">DESKTOP / KEYBOARD & MOUSE</span>
            </div>
            <ul class="guide-list">
              <li><strong style="color:var(--cyan)">WASD / Arrow Keys</strong>: High-precision thruster vectoring & banking</li>
              <li><strong style="color:var(--cyan)">SPACEBAR / Left Click</strong>: Rapid primary vulcan stream</li>
              <li><strong style="color:var(--amber)">1, 2, 3, 4 / Q, E</strong>: Switch active secondary ordnance payload</li>
              <li><strong style="color:var(--green)">Hold Mouse</strong>: Direct cursor tracking mode</li>
            </ul>
          </div>

          <div class="guide-card">
            <div class="guide-header">
              <span class="guide-icon">📱</span>
              <span class="guide-title">MOBILE / TOUCH CONTROLS</span>
            </div>
            <ul class="guide-list">
              <li><strong style="color:var(--cyan)">Direct Touch & Drag</strong>: Intuitive 1:1 ship flight vectoring</li>
              <li><strong style="color:var(--cyan)">Right Combat Button</strong>: Continuous autofire trigger</li>
              <li><strong style="color:var(--amber)">Weapon Quick-Bar</strong>: Instant one-tap weapon swapping</li>
              <li><strong style="color:var(--green)">Top Right Pause</strong>: Instant tactical hold & menu</li>
            </ul>
          </div>
        </div>

        <!-- Tactical Rules of Engagement -->
        <div class="intel-box">
          <div class="intel-title">⚡ TACTICAL RULES OF ENGAGEMENT</div>
          <p class="intel-body">
            1. <strong>Keep Moving</strong>: Stationary drones are prime targets for homing missiles and SAM flak.<br>
            2. <strong>Monitor Heat</strong>: High-energy continuous laser beams generate extreme thermal buildup.<br>
            3. <strong>Collect Intel Cores</strong>: Destroying hostiles drops intel packets that increase your score multiplier up to 4x.
          </p>
        </div>
      </div>
    `;
  },

  _renderWeaponsTab() {
    const weapons = [
      {
        id: 'vulcan',
        name: 'VULCAN ROTARY CANNON',
        type: 'PRIMARY KINETIC',
        badge: 'SLOT 01 // STANDARD',
        color: 'cyan',
        desc: 'Rapid twin ballistic projectile stream. Zero ammunition cost, infinite propellant, and excellent sustained medium-range DPS.',
        stats: [
          { label: 'DAMAGE', val: 45, max: 100, col: 'cyan' },
          { label: 'FIRE RATE', val: 95, max: 100, col: 'green' },
          { label: 'RANGE', val: 75, max: 100, col: 'cyan' },
          { label: 'HEAT EFFICIENCY', val: 90, max: 100, col: 'green' }
        ]
      },
      {
        id: 'flak',
        name: 'FLAK SCATTER CANNON',
        type: 'SPREAD ORDNANCE',
        badge: 'SLOT 02 // CROWD CONTROL',
        color: 'amber',
        desc: 'Fires a 5-way multi-directional explosive buckshot. Proximity fragmentation deals heavy collateral damage against dense buggie swarms.',
        stats: [
          { label: 'DAMAGE', val: 70, max: 100, col: 'amber' },
          { label: 'FIRE RATE', val: 50, max: 100, col: 'amber' },
          { label: 'RANGE', val: 60, max: 100, col: 'cyan' },
          { label: 'HEAT EFFICIENCY', val: 70, max: 100, col: 'amber' }
        ]
      },
      {
        id: 'laser',
        name: 'LASER DESIGNATOR BEAM',
        type: 'THERMAL CUTTING',
        badge: 'SLOT 03 // PIERCING',
        color: 'cyan',
        desc: 'Continuous sustained coherent energy beam. Melts through enemy armor instantaneously. Generates high heat buildup requiring tactical trigger cycling.',
        stats: [
          { label: 'DAMAGE', val: 85, max: 100, col: 'red' },
          { label: 'FIRE RATE', val: 100, max: 100, col: 'green' },
          { label: 'RANGE', val: 95, max: 100, col: 'cyan' },
          { label: 'HEAT EFFICIENCY', val: 35, max: 100, col: 'red' }
        ]
      },
      {
        id: 'hellfire',
        name: 'HELLFIRE SWARM MISSILES',
        type: 'AUTONOMOUS GUIDED',
        badge: 'SLOT 04 // HEAVY HOMING',
        color: 'red',
        desc: 'Multi-salvo smart micro-missiles. Auto-acquires target thermal signatures and tracks hostile interceptors with high explosive blast radius.',
        stats: [
          { label: 'DAMAGE', val: 90, max: 100, col: 'red' },
          { label: 'FIRE RATE', val: 40, max: 100, col: 'amber' },
          { label: 'RANGE', val: 90, max: 100, col: 'cyan' },
          { label: 'HEAT EFFICIENCY', val: 60, max: 100, col: 'amber' }
        ]
      },
      {
        id: 'orbital',
        name: 'ORBITAL STRIKE BEACON',
        type: 'TACTICAL SUPERWEAPON',
        badge: 'SPECIAL // SATELLITE UPLINK',
        color: 'purple',
        desc: 'Hold trigger to paint target coordinates. Channels a devastating vertical particle beam directly from high-orbit military satellites.',
        stats: [
          { label: 'DAMAGE', val: 100, max: 100, col: 'red' },
          { label: 'FIRE RATE', val: 15, max: 100, col: 'red' },
          { label: 'RANGE', val: 100, max: 100, col: 'cyan' },
          { label: 'HEAT EFFICIENCY', val: 20, max: 100, col: 'red' }
        ]
      }
    ];

    return `
      <div class="manual-section">
        <div class="manual-section-header">
          <span class="manual-section-title">⚡ ORDNANCE ARSENAL SPECIFICATIONS</span>
          <span class="telemetry-value" style="font-size: 0.58rem;">5 WEAPON SYSTEMS</span>
        </div>

        <div class="weapon-cards-list">
          ${weapons.map(w => `
            <div class="weapon-spec-card">
              <div class="weapon-spec-header">
                <div>
                  <div class="weapon-spec-name" style="color: var(--${w.color === 'purple' ? 'purple' : w.color})">${w.name}</div>
                  <div class="weapon-spec-type">${w.type}</div>
                </div>
                <span class="hud-badge" style="border-color: rgba(45, 212, 220, 0.3);">${w.badge}</span>
              </div>
              <p class="weapon-spec-desc">${w.desc}</p>
              
              <div class="weapon-stats-grid">
                ${w.stats.map(s => `
                  <div class="weapon-stat-row">
                    <span class="stat-lbl">${s.label}</span>
                    <div class="stat-bar-track">
                      <div class="stat-bar-fill fill-${s.col}" style="width: ${s.val}%"></div>
                    </div>
                    <span class="stat-num">${s.val}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _renderThreatsTab() {
    const enemies = [
      {
        name: 'RECON BUGGY',
        threat: 'LOW',
        threatCol: 'green',
        role: 'Swarm Scout / Harassment',
        desc: 'Lightweight agile scouts that descend in formation swarms. Fires single forward kinetic bolts. Low armor, vulnerable to flak.'
      },
      {
        name: 'INTERCEPTOR JET',
        threat: 'MEDIUM',
        threatCol: 'cyan',
        role: 'Evasive Skirmisher',
        desc: 'Flies in sinusoidal evasive weave patterns while firing angled dual-plasma bursts. Requires predictive lead targeting.'
      },
      {
        name: 'SAM SITE TURRET',
        threat: 'HIGH',
        threatCol: 'amber',
        role: 'Fortified Ground Battery',
        desc: 'Heavily armored outpost anchoring the upper sector. Tracks player coordinates and fires targeted flak cluster shells.'
      },
      {
        name: 'KAMIKAZE DRONE',
        threat: 'HIGH',
        threatCol: 'red',
        role: 'High-Velocity Dive-Bomber',
        desc: 'Accelerates into high-speed ramming trajectories accompanied by klaxon warnings. Priority eliminate before impact!'
      },
      {
        name: 'HVT MOBILE COMMAND (SECTOR 5)',
        threat: 'EXTREME',
        threatCol: 'red',
        role: 'Boss Fortress // Tier 1',
        desc: 'Multi-segmented heavy battle fortress with rotating 360° flak cannons, deployable fighter escorts, and core overdrive mode.'
      },
      {
        name: 'APEX SUBMERSIBLE DREADNOUGHT (SECTOR 10)',
        threat: 'CRITICAL',
        threatCol: 'purple',
        role: 'Apex Titan // Campaign Finale',
        desc: 'Sub-space warp dreadnought. Features teleport dashes, sweeping particle beams, and an enraged 3-phase desperation barrage.'
      }
    ];

    const drops = [
      { icon: '🛡️', name: 'NANITE HULL REPAIR', effect: '+25% Structural Integrity', color: 'green' },
      { icon: '⚡', name: 'SHIELD OVERCHARGE', effect: 'Instantly restores & overcharges shields', color: 'cyan' },
      { icon: '📦', name: 'ORDNANCE SUPPLY CRATE', effect: 'Replenishes heavy missile bay ammo', color: 'amber' },
      { icon: '💾', name: 'TACTICAL INTEL PACKET', effect: 'Score multiplier boost & stars', color: 'purple' }
    ];

    return `
      <div class="manual-section">
        <!-- Hostile Target Dossier -->
        <div class="manual-section-header">
          <span class="manual-section-title">🎯 HOSTILE THREAT INTELLIGENCE</span>
          <span class="telemetry-value" style="font-size: 0.58rem;">6 IDENTIFIED SIGNATURES</span>
        </div>

        <div class="threats-grid">
          ${enemies.map(e => `
            <div class="threat-card">
              <div class="threat-header">
                <div>
                  <div class="threat-name">${e.name}</div>
                  <div class="threat-role">${e.role}</div>
                </div>
                <span class="threat-badge threat-${e.threatCol}">${e.threat}</span>
              </div>
              <p class="threat-desc">${e.desc}</p>
            </div>
          `).join('')}
        </div>

        <!-- Tactical Supply Drops -->
        <div class="manual-section-header" style="margin-top: 14px;">
          <span class="manual-section-title">📦 TACTICAL SUPPLY & AIRDROPS</span>
          <span class="telemetry-value" style="font-size: 0.58rem;">FIELD RECOVERY</span>
        </div>

        <div class="drops-grid">
          ${drops.map(d => `
            <div class="drop-item-card">
              <span class="drop-icon">${d.icon}</span>
              <div class="drop-info">
                <div class="drop-name" style="color: var(--${d.color === 'purple' ? 'purple' : d.color})">${d.name}</div>
                <div class="drop-effect">${d.effect}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _bindTabInteractions(container, tab) {
    if (tab === 'controls') {
      const banner = container.querySelector('#key-feedback-banner');
      const text = container.querySelector('#key-feedback-text');
      const keyElements = container.querySelectorAll('.kb-key');

      const keyActionMap = {
        KeyW: 'THRUST FORWARD / CLIMB',
        ArrowUp: 'THRUST FORWARD / CLIMB',
        KeyS: 'REVERSE / BRAKE',
        ArrowDown: 'REVERSE / BRAKE',
        KeyA: 'BANK LEFT / STRAFE',
        ArrowLeft: 'BANK LEFT / STRAFE',
        KeyD: 'BANK RIGHT / STRAFE',
        ArrowRight: 'BANK RIGHT / STRAFE',
        Space: 'PRIMARY FIRE — VULCAN ROTARY CANNON',
        Digit1: 'EQUIP WEAPON 1 — VULCAN ROTARY',
        Digit2: 'EQUIP WEAPON 2 — FLAK SCATTER CANNON',
        Digit3: 'EQUIP WEAPON 3 — LASER DESIGNATOR BEAM',
        Digit4: 'EQUIP WEAPON 4 — HELLFIRE SWARM MISSILES',
        KeyQ: 'CYCLE TO PREVIOUS WEAPON',
        KeyE: 'CYCLE TO NEXT WEAPON',
        KeyP: 'PAUSE COCKPIT HUD',
        Escape: 'PAUSE COCKPIT HUD'
      };

      const activateKey = (code) => {
        const action = keyActionMap[code];
        if (action) {
          soundManager.playClick();
          if (banner) banner.classList.add('active');
          if (text) text.innerHTML = `<strong style="color:var(--cyan-bright)">KEY [${code.replace('Key', '').replace('Digit', '')}]</strong>: ${action}`;

          keyElements.forEach(k => {
            const keyCode = k.getAttribute('data-key');
            if (keyCode === code || (code.startsWith('Arrow') && (
              (code === 'ArrowUp' && keyCode === 'KeyW') ||
              (code === 'ArrowDown' && keyCode === 'KeyS') ||
              (code === 'ArrowLeft' && keyCode === 'KeyA') ||
              (code === 'ArrowRight' && keyCode === 'KeyD')
            ))) {
              k.classList.add('active');
            }
          });
        }
      };

      const deactivateKey = (code) => {
        keyElements.forEach(k => {
          const keyCode = k.getAttribute('data-key');
          if (keyCode === code || (code.startsWith('Arrow') && (
            (code === 'ArrowUp' && keyCode === 'KeyW') ||
            (code === 'ArrowDown' && keyCode === 'KeyS') ||
            (code === 'ArrowLeft' && keyCode === 'KeyA') ||
            (code === 'ArrowRight' && keyCode === 'KeyD')
          ))) {
            k.classList.remove('active');
          }
        });
      };

      // Clickable on-screen keys
      keyElements.forEach(k => {
        k.addEventListener('click', () => {
          const code = k.getAttribute('data-key');
          activateKey(code);
          setTimeout(() => deactivateKey(code), 250);
        });
      });

      // Cleanup old listeners if existing
      if (this._keyListener) window.removeEventListener('keydown', this._keyListener);
      if (this._keyUpListener) window.removeEventListener('keyup', this._keyUpListener);

      this._keyListener = (e) => {
        if (keyActionMap[e.code]) {
          activateKey(e.code);
        }
      };

      this._keyUpListener = (e) => {
        deactivateKey(e.code);
      };

      window.addEventListener('keydown', this._keyListener);
      window.addEventListener('keyup', this._keyUpListener);
    }
  },

  unmount() {
    if (this._keyListener) {
      window.removeEventListener('keydown', this._keyListener);
      this._keyListener = null;
    }
    if (this._keyUpListener) {
      window.removeEventListener('keyup', this._keyUpListener);
      this._keyUpListener = null;
    }
  }
};
