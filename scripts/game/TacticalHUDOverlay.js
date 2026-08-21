/**
 * Space Shooter — Tactical HUD Overlay & Radar Targeting Engine
 * Features:
 * - Active / Passive Radar state machine & detection visualization
 * - Full tactical Target Bounding Boxes [ TGT ] with range & lead predictor reticles
 * - Live Ordnance telemetry (Ammo capacitor, Thermal heat buildup/cooling, Missile bay)
 * - Real-time Coordinate tracker (MGRS Grid, Sector X/Y/Z, Altitude, Bearing)
 * - Dynamic Compass Heading Tape & Artificial Horizon Pitch Ladder
 * - Zero-allocation Canvas2D rendering optimized for rock-solid 60+ FPS
 */

import { soundManager } from '../audio/index.js';

export const RADAR_MODES = {
  ACTIVE: 'ACTIVE',
  PASSIVE: 'PASSIVE'
};

export class TacticalHUDOverlay {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    // Radar Mode & Emissions
    this.radarMode = RADAR_MODES.ACTIVE;
    this.radarSweepAngle = 0;
    this.radarSweepSpeed = Math.PI * 1.2; // Radians per sec
    this.radarRange = 1200; // px
    this.emissionLevel = 1.0; // 1.0 Active, 0.0 Passive
    this.radarPulseTime = 0;

    // Ordnance System Simulation
    this.ammo = 100; // 0 - 100%
    this.maxAmmo = 100;
    this.ammoRegenRate = 35; // % per sec when not firing
    this.heat = 0; // 0 - 100%
    this.maxHeat = 100;
    this.coolingRate = 28; // % per sec
    this.isOverheated = false;
    this.overheatThreshold = 95;
    this.recoveryThreshold = 30;
    this.missiles = 6;
    this.maxMissiles = 6;
    this.missileReloadTimer = 0;
    this.specialCharge = 75; // 0 - 100%

    // Coordinates & Telemetry
    this.gridId = '44V-UTM';
    this.coordX = 1284.7;
    this.coordY = -892.3;
    this.coordZ = 420.0;
    this.altitude = 1450;
    this.bearing = 0; // 0 to 359 degrees
    this.heading = '000';
    this.gForce = 1.0;

    // Simulated Tactical Targets (for Sector radar tracking & combat)
    this.targets = this._initTacticalTargets();
    this.lockedTargetId = null;
    this.lockAcquireTimer = 0;
    this.animTime = 0;

    // Compass Tape Configuration
    this.compassMarks = [
      { deg: 0, label: 'N' },
      { deg: 30, label: '030' },
      { deg: 60, label: '060' },
      { deg: 90, label: 'E' },
      { deg: 120, label: '120' },
      { deg: 150, label: '150' },
      { deg: 180, label: 'S' },
      { deg: 210, label: '210' },
      { deg: 240, label: '240' },
      { deg: 270, label: 'W' },
      { deg: 300, label: '300' },
      { deg: 330, label: '330' }
    ];
  }

  /**
   * Initialize procedural tactical contacts on sector radar.
   */
  _initTacticalTargets() {
    return [
      {
        id: 'TGT-01',
        name: 'DRONE // RECON-4',
        type: 'hostile',
        threatLevel: 2,
        relX: 0.32,
        relY: 0.22,
        vx: 18,
        vy: 24,
        hull: 80,
        maxHull: 100,
        distance: 340, // meters
        isLocked: false,
        size: 26
      },
      {
        id: 'TGT-02',
        name: 'CORVETTE // STRIKE-9',
        type: 'hostile',
        threatLevel: 4,
        relX: 0.74,
        relY: 0.16,
        vx: -12,
        vy: 16,
        hull: 100,
        maxHull: 100,
        distance: 620,
        isLocked: false,
        size: 38
      },
      {
        id: 'TGT-03',
        name: 'INTERCEPTOR // HVT',
        type: 'hostile',
        threatLevel: 5,
        relX: 0.52,
        relY: 0.38,
        vx: 32,
        vy: 45,
        hull: 100,
        maxHull: 100,
        distance: 480,
        isLocked: false,
        size: 30
      }
    ];
  }

  /**
   * Toggle Active vs Passive Radar Mode.
   * @returns {'ACTIVE'|'PASSIVE'}
   */
  toggleRadarMode() {
    this.radarMode = this.radarMode === RADAR_MODES.ACTIVE ? RADAR_MODES.PASSIVE : RADAR_MODES.ACTIVE;
    this.emissionLevel = this.radarMode === RADAR_MODES.ACTIVE ? 1.0 : 0.0;
    soundManager.playRadarToggle(this.radarMode === RADAR_MODES.ACTIVE);
    console.log(`📡 Radar Mode switched to: ${this.radarMode} (RF Emissions: ${this.emissionLevel * 100}%)`);
    return this.radarMode;
  }

  /**
   * Set specific radar mode.
   * @param {'ACTIVE'|'PASSIVE'} mode
   */
  setRadarMode(mode) {
    if (mode === RADAR_MODES.ACTIVE || mode === RADAR_MODES.PASSIVE) {
      if (this.radarMode !== mode) {
        this.radarMode = mode;
        this.emissionLevel = mode === RADAR_MODES.ACTIVE ? 1.0 : 0.0;
        soundManager.playRadarToggle(this.radarMode === RADAR_MODES.ACTIVE);
      }
    }
  }

  /**
   * Register weapon firing to update ammo and heat levels.
   * @param {number} [heatIncrement=8]
   * @param {number} [ammoCost=3]
   * @returns {boolean} true if firing permitted, false if overheated/empty
   */
  registerFire(heatIncrement = 8, ammoCost = 3) {
    if (this.isOverheated || this.ammo < ammoCost) {
      soundManager.playDeny();
      return false;
    }

    this.ammo = Math.max(0, this.ammo - ammoCost);
    this.heat = Math.min(this.maxHeat, this.heat + heatIncrement);

    if (this.heat >= this.overheatThreshold) {
      this.isOverheated = true;
      soundManager.playWarning();
      console.warn('⚠️ WEAPON OVERHEATED — Thermal dissipation active.');
    }

    return true;
  }

  /**
   * Launch a secondary missile from bay.
   * @returns {boolean}
   */
  launchMissile() {
    if (this.missiles > 0) {
      this.missiles--;
      soundManager.playClick();
      return true;
    }
    soundManager.playDeny();
    return false;
  }

  /**
   * Update fixed-timestep HUD simulation and target tracking.
   * @param {number} dt
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {number} width
   * @param {number} height
   */
  update(dt, player, width, height) {
    this.animTime += dt;

    // 1. Radar Sweep & RF Pulse Animation
    if (this.radarMode === RADAR_MODES.ACTIVE) {
      this.radarSweepAngle = (this.radarSweepAngle + this.radarSweepSpeed * dt) % (Math.PI * 2);
      this.radarPulseTime += dt;
    }

    // 2. Weapon Thermal Dissipation & Ammo Regeneration
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - this.coolingRate * dt);
      if (this.isOverheated && this.heat <= this.recoveryThreshold) {
        this.isOverheated = false;
        console.log('✅ Weapon cooled — Systems nominal.');
      }
    }

    if (this.ammo < this.maxAmmo && !this.isOverheated) {
      this.ammo = Math.min(this.maxAmmo, this.ammo + this.ammoRegenRate * dt);
    }

    // 3. Missile bay auto-rearm timer
    if (this.missiles < this.maxMissiles) {
      this.missileReloadTimer += dt;
      if (this.missileReloadTimer >= 8.0) { // 8 seconds per missile
        this.missiles++;
        this.missileReloadTimer = 0;
      }
    }

    // 4. Update Dynamic Flight Coordinates & Bearing from Player Physics
    if (player) {
      this.coordX = Number((1284.7 + (player.x - width * 0.5) * 0.45).toFixed(1));
      this.coordY = Number((-892.3 - (player.y - height * 0.8) * 0.45).toFixed(1));
      this.altitude = Math.round(1450 + Math.sin(this.animTime * 0.8) * 18 - (player.y / height) * 200);

      // Compute heading bearing from drone lateral bank & speed
      const baseHeading = 0; // Heading North by default
      const bankOffset = player.bankAngle * (180 / Math.PI) * 1.5;
      let rawBearing = Math.round((baseHeading + bankOffset + 360) % 360);
      this.bearing = rawBearing;
      this.heading = String(this.bearing).padStart(3, '0');

      // Dynamic G-Force calculation
      const speed = Math.hypot(player.vx, player.vy);
      this.gForce = Number((1.0 + (speed / player.maxSpeed) * 1.8 + Math.abs(player.bankAngle) * 1.2).toFixed(1));
    }

    // 5. Update Tactical Contacts & Locking
    this._updateTargets(dt, player, width, height);
  }

  /**
   * Update procedural target contacts, calculating distance and lead prediction.
   */
  _updateTargets(dt, player, width, height) {
    let closestTarget = null;
    let minDistance = Infinity;

    for (let i = 0; i < this.targets.length; i++) {
      const tgt = this.targets[i];

      // Integrate target movement
      tgt.relX += (tgt.vx * dt) / width;
      tgt.relY += (tgt.vy * dt) / height;

      // Bounce within bounds
      if (tgt.relX < 0.12 || tgt.relX > 0.88) tgt.vx = -tgt.vx;
      if (tgt.relY < 0.08 || tgt.relY > 0.48) tgt.vy = -tgt.vy;

      const tgtWorldX = tgt.relX * width;
      const tgtWorldY = tgt.relY * height;

      // Calculate distance to player drone
      if (player) {
        const dx = tgtWorldX - player.x;
        const dy = tgtWorldY - player.y;
        const distPx = Math.hypot(dx, dy);
        tgt.distance = Math.round(distPx * 1.2); // Convert px to simulated meters

        // Target lead prediction point (aim assist lead circle)
        tgt.leadX = tgtWorldX + tgt.vx * 0.45;
        tgt.leadY = tgtWorldY + tgt.vy * 0.45;

        // Check if target is inside player's forward targeting cone
        const forwardCone = Math.abs(dx) < 90 && dy < 0;
        if (forwardCone && distPx < minDistance) {
          minDistance = distPx;
          closestTarget = tgt;
        }
      }
    }

    // Lock acquisition logic
    if (closestTarget && this.radarMode === RADAR_MODES.ACTIVE) {
      if (this.lockedTargetId !== closestTarget.id) {
        this.lockedTargetId = closestTarget.id;
        this.lockAcquireTimer = 0;
        soundManager.playTargetLock();
      }
      this.lockAcquireTimer = Math.min(1.0, this.lockAcquireTimer + dt * 2.5);
    } else {
      this.lockedTargetId = null;
      this.lockAcquireTimer = 0;
    }
  }

  /**
   * Render the complete tactical HUD overlay pass.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   */
  render(ctx, player, width, height) {
    ctx.save();

    // 1. Draw Optical FLIR Vignette & Lens Corner Brackets
    this._renderVignetteAndBrackets(ctx, width, height);

    // 2. Draw Top Center Compass Heading Tape
    this._renderCompassTape(ctx, width, height);

    // 3. Draw Artificial Horizon & Pitch Ladder on Center Reticle
    if (player) {
      this._renderPitchLadder(ctx, player, width, height);
    }

    // 4. Draw Radar Sweeps & Tactical Target Bounding Boxes
    this._renderTargetBoundingBoxes(ctx, player, width, height);

    // 5. Draw Radar Scope & RF Emission telemetry badge
    this._renderRadarScopeBadge(ctx, width, height);

    // 6. Draw Ordnance Gauges on Canvas
    this._renderOrdnanceMeters(ctx, width, height);

    ctx.restore();
  }

  /**
   * Draw tactical framing brackets and subtle optical corner ticks.
   */
  _renderVignetteAndBrackets(ctx, width, height) {
    const pad = 12;
    const len = 24;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 1.2;

    // Corner L-brackets
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(width - pad - len, pad);
    ctx.lineTo(width - pad, pad);
    ctx.lineTo(width - pad, pad + len);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(pad, height - pad - len);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(pad + len, height - pad);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(width - pad - len, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.lineTo(width - pad, height - pad - len);
    ctx.stroke();

    // Center Crosshair ticks along edges
    const midX = width / 2;
    const midY = height / 2;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(midX - 10, pad); ctx.lineTo(midX + 10, pad);
    ctx.moveTo(midX - 10, height - pad); ctx.lineTo(midX + 10, height - pad);
    ctx.moveTo(pad, midY - 10); ctx.lineTo(pad, midY + 10);
    ctx.moveTo(width - pad, midY - 10); ctx.lineTo(width - pad, midY + 10);
    ctx.stroke();
  }

  /**
   * Render dynamic horizontal Compass Heading Tape at the top of the HUD.
   */
  _renderCompassTape(ctx, width, height) {
    const cx = width / 2;
    const tapeY = 56;
    const tapeWidth = Math.min(320, width * 0.6);
    const halfWidth = tapeWidth / 2;
    const pxPerDegree = tapeWidth / 80; // 80 degrees visible range

    ctx.save();

    // Compass Tape Clipping Box
    ctx.beginPath();
    ctx.rect(cx - halfWidth, tapeY - 14, tapeWidth, 28);
    ctx.clip();

    // Tape background fill
    ctx.fillStyle = 'rgba(5, 7, 10, 0.55)';
    ctx.fillRect(cx - halfWidth, tapeY - 14, tapeWidth, 28);

    // Horizontal baseline
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, tapeY + 8);
    ctx.lineTo(cx + halfWidth, tapeY + 8);
    ctx.stroke();

    // Render heading tick marks and cardinal points
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';

    const curBearing = this.bearing;

    for (let deg = -180; deg <= 540; deg += 10) {
      const normalizedDeg = (deg + 360) % 360;
      const diff = deg - curBearing;
      const tickX = cx + diff * pxPerDegree;

      if (tickX >= cx - halfWidth - 20 && tickX <= cx + halfWidth + 20) {
        const isCardinal = deg % 90 === 0;
        const isMajor = deg % 30 === 0;
        const tickHeight = isCardinal ? 10 : (isMajor ? 7 : 4);

        ctx.strokeStyle = isCardinal ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(tickX, tapeY + 8);
        ctx.lineTo(tickX, tapeY + 8 - tickHeight);
        ctx.stroke();

        if (isMajor) {
          let label = String(normalizedDeg).padStart(3, '0');
          if (normalizedDeg === 0) label = 'N';
          else if (normalizedDeg === 90) label = 'E';
          else if (normalizedDeg === 180) label = 'S';
          else if (normalizedDeg === 270) label = 'W';

          ctx.fillStyle = isCardinal ? '#00f0ff' : 'rgba(0, 240, 255, 0.7)';
          ctx.fillText(label, tickX, tapeY - 3);
        }
      }
    }

    ctx.restore();

    // Center Index Caret (Downward cyan triangle)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(cx - 5, tapeY - 14);
    ctx.lineTo(cx + 5, tapeY - 14);
    ctx.lineTo(cx, tapeY - 8);
    ctx.closePath();
    ctx.fill();

    // Heading Readout Box underneath
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.heading}°`, cx, tapeY + 22);
  }

  /**
   * Render artificial horizon pitch ladder with roll tilt.
   */
  _renderPitchLadder(ctx, player, width, height) {
    const cx = player.x;
    const cy = player.y;
    const roll = player.bankAngle;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll * 0.35); // Slight artificial horizon tilt

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.textAlign = 'center';

    // Pitch rung offsets
    const rungs = [
      { pitch: 10, y: -45, label: '+10' },
      { pitch: 0, y: 0, label: '—' },
      { pitch: -10, y: 45, label: '-10' }
    ];

    rungs.forEach(rung => {
      const len = rung.pitch === 0 ? 36 : 24;
      ctx.beginPath();
      // Left tick
      ctx.moveTo(-len - 15, rung.y);
      ctx.lineTo(-15, rung.y);
      if (rung.pitch !== 0) ctx.lineTo(-15, rung.y + (rung.pitch > 0 ? 4 : -4));

      // Right tick
      ctx.moveTo(15, rung.y);
      ctx.lineTo(len + 15, rung.y);
      if (rung.pitch !== 0) ctx.lineTo(15, rung.y + (rung.pitch > 0 ? 4 : -4));
      ctx.stroke();

      if (rung.pitch !== 0) {
        ctx.fillText(rung.label, -len - 24, rung.y + 3);
        ctx.fillText(rung.label, len + 24, rung.y + 3);
      }
    });

    ctx.restore();
  }

  /**
   * Render tactical target bounding boxes [ TGT ], range tags, and aim-assist lead reticles.
   */
  _renderTargetBoundingBoxes(ctx, player, width, height) {
    const isRadarActive = this.radarMode === RADAR_MODES.ACTIVE;

    for (let i = 0; i < this.targets.length; i++) {
      const tgt = this.targets[i];
      const tx = tgt.relX * width;
      const ty = tgt.relY * height;
      const isLocked = tgt.id === this.lockedTargetId;
      const boxSize = tgt.size + (isLocked ? 12 : 6);
      const halfBox = boxSize / 2;

      ctx.save();

      if (isRadarActive) {
        // ── ACTIVE RADAR MODE: Full Tactical Bounding Boxes ──
        const targetColor = isLocked ? '#ff003c' : '#00f0ff';
        const bracketAlpha = isLocked ? 0.95 : 0.65;

        ctx.strokeStyle = targetColor;
        ctx.lineWidth = isLocked ? 1.8 : 1.2;
        ctx.globalAlpha = bracketAlpha;

        // Animated lock acquire pulse
        if (isLocked) {
          const pulse = 1.0 + Math.sin(this.animTime * 14) * 0.08;
          ctx.shadowColor = '#ff003c';
          ctx.shadowBlur = 10;
          ctx.scale(pulse, pulse);
          ctx.translate(tx * (1 - pulse) / pulse, ty * (1 - pulse) / pulse);
        }

        // Tactical 4-corner brackets
        const bracketLen = 8;
        // Top-Left
        ctx.beginPath();
        ctx.moveTo(tx - halfBox, ty - halfBox + bracketLen);
        ctx.lineTo(tx - halfBox, ty - halfBox);
        ctx.lineTo(tx - halfBox + bracketLen, ty - halfBox);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(tx + halfBox - bracketLen, ty - halfBox);
        ctx.lineTo(tx + halfBox, ty - halfBox);
        ctx.lineTo(tx + halfBox, ty - halfBox + bracketLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(tx - halfBox, ty + halfBox - bracketLen);
        ctx.lineTo(tx - halfBox, ty + halfBox);
        ctx.lineTo(tx - halfBox + bracketLen, ty + halfBox);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(tx + halfBox - bracketLen, ty + halfBox);
        ctx.lineTo(tx + halfBox, ty + halfBox);
        ctx.lineTo(tx + halfBox, ty + halfBox - bracketLen);
        ctx.stroke();

        // Center Hostile Diamond / Pip
        ctx.fillStyle = targetColor;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 4);
        ctx.lineTo(tx + 4, ty);
        ctx.lineTo(tx, ty + 4);
        ctx.lineTo(tx - 4, ty);
        ctx.closePath();
        ctx.fill();

        // Target Tag & Distance Readout
        ctx.font = '9px "Share Tech Mono", monospace';
        ctx.fillStyle = targetColor;
        ctx.textAlign = 'left';
        ctx.fillText(tgt.id, tx + halfBox + 6, ty - 4);

        ctx.font = '8px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`${tgt.distance}m`, tx + halfBox + 6, ty + 6);
        ctx.fillText(`LVL ${tgt.threatLevel}`, tx + halfBox + 6, ty + 16);

        // Hull Integrity micro-bar
        const barW = 28;
        const barH = 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(tx - halfBox, ty + halfBox + 4, barW, barH);
        ctx.fillStyle = targetColor;
        ctx.fillRect(tx - halfBox, ty + halfBox + 4, barW * (tgt.hull / tgt.maxHull), barH);

        // Lead-prediction Reticle Circle (Aim-Assist indicator)
        if (tgt.leadX && tgt.leadY) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tgt.leadX, tgt.leadY, 7, 0, Math.PI * 2);
          ctx.stroke();

          // Dotted connector from target to lead point
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tgt.leadX, tgt.leadY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

      } else {
        // ── PASSIVE RADAR MODE: Low-Emission Directional Strobes ──
        // Only directional chevrons & faint RF signal bearing
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.5)';
        ctx.lineWidth = 1.2;

        // Faint directional chevron pointing towards contact
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty + 4);
        ctx.lineTo(tx, ty - 4);
        ctx.lineTo(tx + 6, ty + 4);
        ctx.stroke();

        ctx.font = '8px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(255, 183, 3, 0.65)';
        ctx.textAlign = 'center';
        ctx.fillText(`RF-INT // ${tgt.distance}m`, tx, ty + 16);
      }

      ctx.restore();
    }
  }

  /**
   * Render Tactical Radar Scope badge and RF emission status.
   */
  _renderRadarScopeBadge(ctx, width, height) {
    const scopeX = width - 80;
    const scopeY = 120;
    const radius = 34;

    ctx.save();

    // Radar Scope Background
    ctx.fillStyle = 'rgba(5, 7, 10, 0.7)';
    ctx.strokeStyle = this.radarMode === RADAR_MODES.ACTIVE ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 183, 3, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(scopeX, scopeY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Range rings
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(scopeX, scopeY, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Center Cross
    ctx.beginPath();
    ctx.moveTo(scopeX - radius, scopeY); ctx.lineTo(scopeX + radius, scopeY);
    ctx.moveTo(scopeX, scopeY - radius); ctx.lineTo(scopeX, scopeY + radius);
    ctx.stroke();

    // Active Radar Sweep Line
    if (this.radarMode === RADAR_MODES.ACTIVE) {
      const sweepX = scopeX + Math.cos(this.radarSweepAngle) * radius;
      const sweepY = scopeY + Math.sin(this.radarSweepAngle) * radius;

      const sweepGrad = ctx.createRadialGradient(scopeX, scopeY, 2, scopeX, scopeY, radius);
      sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
      sweepGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(scopeX, scopeY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Blip targets on mini radar
      for (let i = 0; i < this.targets.length; i++) {
        const tgt = this.targets[i];
        const bx = scopeX + (tgt.relX - 0.5) * (radius * 1.6);
        const by = scopeY + (tgt.relY - 0.3) * (radius * 1.6);
        ctx.fillStyle = '#ff003c';
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Radar Mode & Emission Readout
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    if (this.radarMode === RADAR_MODES.ACTIVE) {
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('RADAR: ACTIVE', scopeX, scopeY + radius + 12);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.fillText('RF: 100% (HIGH)', scopeX, scopeY + radius + 22);
    } else {
      ctx.fillStyle = '#ffb703';
      ctx.fillText('RADAR: PASSIVE', scopeX, scopeY + radius + 12);
      ctx.fillStyle = 'rgba(255, 183, 3, 0.65)';
      ctx.fillText('RF: 0% (SILENT)', scopeX, scopeY + radius + 22);
    }

    ctx.restore();
  }

  /**
   * Render Canvas-level Ordnance gauges (Ammo, Heat, Missile stock).
   */
  _renderOrdnanceMeters(ctx, width, height) {
    const meterX = width - 150;
    const meterY = height - 160;

    // Small screen protection
    if (width < 640) return;

    ctx.save();
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';

    // 1. Ammo Bar
    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.fillText(`AMMO CAPACITOR: ${Math.round(this.ammo)}%`, meterX, meterY);

    ctx.fillStyle = 'rgba(5, 7, 10, 0.6)';
    ctx.fillRect(meterX, meterY + 4, 130, 6);
    ctx.fillStyle = this.ammo < 20 ? '#ff003c' : (this.ammo < 50 ? '#ffb703' : '#00f0ff');
    ctx.fillRect(meterX, meterY + 4, 130 * (this.ammo / this.maxAmmo), 6);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.strokeRect(meterX, meterY + 4, 130, 6);

    // 2. Heat Bar
    const heatColor = this.isOverheated ? '#ff003c' : (this.heat > 70 ? '#ffb703' : '#2dd4dc');
    ctx.fillStyle = heatColor;
    ctx.fillText(`THERMAL HEAT: ${Math.round(this.heat)}% ${this.isOverheated ? '[LOCKOUT]' : ''}`, meterX, meterY + 24);

    ctx.fillStyle = 'rgba(5, 7, 10, 0.6)';
    ctx.fillRect(meterX, meterY + 28, 130, 6);
    ctx.fillStyle = heatColor;
    ctx.fillRect(meterX, meterY + 28, 130 * (this.heat / this.maxHeat), 6);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.strokeRect(meterX, meterY + 28, 130, 6);

    // 3. Missile Bay Tube Indicators
    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.fillText(`MISSILES: ${this.missiles}/${this.maxMissiles}`, meterX, meterY + 48);

    for (let m = 0; m < this.maxMissiles; m++) {
      const mx = meterX + m * 20;
      const isLoaded = m < this.missiles;
      ctx.fillStyle = isLoaded ? '#ffb703' : 'rgba(255, 183, 3, 0.15)';
      ctx.fillRect(mx, meterY + 52, 16, 5);
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.4)';
      ctx.strokeRect(mx, meterY + 52, 16, 5);
    }

    ctx.restore();
  }

  /**
   * Export telemetry snapshot for DOM HUD synchronization.
   */
  getTelemetrySnapshot() {
    return {
      radarMode: this.radarMode,
      emissionLevel: this.emissionLevel,
      ammo: Math.round(this.ammo),
      heat: Math.round(this.heat),
      isOverheated: this.isOverheated,
      missiles: this.missiles,
      maxMissiles: this.maxMissiles,
      specialCharge: Math.round(this.specialCharge),
      grid: this.gridId,
      coordX: this.coordX,
      coordY: this.coordY,
      altitude: this.altitude,
      bearing: this.bearing,
      heading: this.heading,
      gForce: this.gForce,
      targetCount: this.targets.length,
      lockedTargetId: this.lockedTargetId
    };
  }
}
