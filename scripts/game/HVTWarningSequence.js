/**
 * HVTWarningSequence.js — High-Value Target Red Alert & Cinematic Satellite Zoom Engine
 * Features:
 * - Full tactical Red Alert HUD banner with pulsing danger borders & hazard corner chevrons
 * - Cinematic satellite reconnaissance optical zoom & coordinate lock-on animation
 * - Synchronized procedural klaxon sirens & high-tech satellite lens servo audio synthesis
 * - Converging laser calibration brackets, MGRS grid telemetry, and thermal bloom detection
 * - Sonic breach shockwave FX with high-impact screen shake integration
 * - Zero-allocation rendering loop optimized for rock-solid 60+ FPS
 */

import { soundManager } from '../audio/index.js';

export class HVTWarningSequence {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.active = false;
    this.timer = 0;
    this.duration = 3.5; // seconds
    this.elapsed = 0;

    // HVT Target profile metadata
    this.hvtData = {
      name: 'HVT MOBILE COMMAND CENTER',
      type: 'BOSS_MOBILE_COMMAND',
      subtitle: 'ARMORED BATTLE FORTRESS',
      class: 'CAPITAL CLASS // LEVEL 5 HVT',
      threatLevel: 'CRITICAL (TIER-1)',
      coordinates: '44V-UTM 8832-9104',
      sector: 5,
      mass: '14,200 MT'
    };

    // Camera / Satellite Zoom & Optical State
    this.zoomLevel = 1.0;
    this.targetZoom = 1.45;
    this.focalPoint = { x: 0.5, y: 0.22 }; // Normalized viewport coordinates
    this.hasTriggeredBreach = false;

    // Visual FX state
    this.scanlineOffset = 0;
    this.glitchIntensity = 0;
    this.shockwaveRadius = 0;
    this.shockwaveAlpha = 0;
    this.reticleAngle = 0;
    this.bracketSpread = 1.0;

    // Callbacks
    this.onComplete = null;
    this.listeners = {
      start: [],
      breach: [],
      complete: []
    };
  }

  /**
   * Register event listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return this;
  }

  /**
   * Emit internal event.
   * @param {string} event
   * @param {any} data
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        this.listeners[event][i](data);
      }
    }
  }

  /**
   * Trigger and start the HVT Red Alert Warning Sequence.
   * @param {Object} [options]
   * @param {string} [options.bossName]
   * @param {string} [options.bossType]
   * @param {number} [options.sector]
   * @param {number} [options.duration=3.5]
   * @param {Function} [options.onComplete]
   */
  start(options = {}) {
    this.active = true;
    this.duration = options.duration || 3.5;
    this.timer = this.duration;
    this.elapsed = 0;
    this.zoomLevel = 1.0;
    this.hasTriggeredBreach = false;
    this.shockwaveRadius = 0;
    this.shockwaveAlpha = 0;
    this.reticleAngle = 0;
    this.bracketSpread = 1.0;
    this.onComplete = options.onComplete || null;

    if (options.bossName) this.hvtData.name = options.bossName;
    if (options.bossType) this.hvtData.type = options.bossType;
    if (options.sector) this.hvtData.sector = options.sector;

    // 1. Play procedural audio telemetry
    if (soundManager) {
      if (typeof soundManager.playKlaxonSiren === 'function') {
        soundManager.playKlaxonSiren(this.duration);
      }
      if (typeof soundManager.playSatelliteZoom === 'function') {
        soundManager.playSatelliteZoom();
      }
    }

    this._emit('start', { ...this.hvtData, duration: this.duration });

    try {
      window.dispatchEvent(new CustomEvent('hvt:warning:start', {
        detail: { ...this.hvtData, duration: this.duration }
      }));
    } catch (e) {}

    console.log(`🚨 [HVT Warning] Red Alert sequence initiated: ${this.hvtData.name} (Sector ${this.hvtData.sector})`);
  }

  /**
   * Stop / abort warning sequence immediately.
   */
  stop() {
    this.active = false;
    this.zoomLevel = 1.0;
    this.timer = 0;
  }

  /**
   * Fixed-timestep update step.
   * @param {number} dt - Delta time in seconds
   * @param {import('./GameEngine.js').GameEngine} [gameEngine=null]
   */
  update(dt, gameEngine = null) {
    if (!this.active) return;

    this.elapsed += dt;
    this.timer -= dt;
    this.scanlineOffset = (this.scanlineOffset + dt * 180) % 32;
    this.reticleAngle += dt * 1.8;

    const progress = Math.max(0, Math.min(1.0, this.elapsed / this.duration));

    // ── Phase 1: Satellite Optic Zoom-In (0.0 to 0.35 progress / ~1.2s) ──
    if (progress < 0.35) {
      const p1 = progress / 0.35;
      // Smooth ease-in-out cubic zoom towards HVT entry coordinates
      const ease = p1 < 0.5 ? 4 * p1 * p1 * p1 : 1 - Math.pow(-2 * p1 + 2, 3) / 2;
      this.zoomLevel = 1.0 + (this.targetZoom - 1.0) * ease;
      this.bracketSpread = 1.0 - ease * 0.7; // Brackets clamp inward
      this.glitchIntensity = Math.sin(p1 * Math.PI) * 0.4;
    }
    // ── Phase 2: Tactical Lock-On & Thermal Heat Scan (0.35 to 0.80 progress / ~1.6s) ──
    else if (progress < 0.80) {
      const p2 = (progress - 0.35) / 0.45;
      // Subtle optical breathing oscillation while target lock is held
      this.zoomLevel = this.targetZoom + Math.sin(p2 * Math.PI * 4) * 0.03;
      this.bracketSpread = 0.3 + Math.sin(p2 * Math.PI * 6) * 0.05;
      this.glitchIntensity = 0.15 + (Math.random() > 0.88 ? 0.35 : 0);
    }
    // ── Phase 3: Sonic Breach Shockwave & Zoom Snapback (0.80 to 1.0 progress / ~0.7s) ──
    else {
      const p3 = (progress - 0.80) / 0.20;
      // Elastic snap-back to 1.0x tactical view
      const easeSnap = 1.0 - Math.pow(p3, 2);
      this.zoomLevel = 1.0 + (this.targetZoom - 1.0) * easeSnap;
      this.bracketSpread = 0.3 + p3 * 1.2;

      // Trigger Sonic Breach Impact boom & heavy screen shake once
      if (!this.hasTriggeredBreach) {
        this.hasTriggeredBreach = true;
        this.shockwaveRadius = 20;
        this.shockwaveAlpha = 1.0;

        if (soundManager && typeof soundManager.playHvtEntranceBoom === 'function') {
          soundManager.playHvtEntranceBoom();
        }

        if (gameEngine && typeof gameEngine.shake === 'function') {
          gameEngine.shake(16, 0.88);
        }

        this._emit('breach', { ...this.hvtData });
      }

      // Expand sonic shockwave
      this.shockwaveRadius += dt * 850;
      this.shockwaveAlpha = Math.max(0, 1.0 - p3);
    }

    // Sequence completion
    if (this.timer <= 0) {
      this.active = false;
      this.zoomLevel = 1.0;

      this._emit('complete', { ...this.hvtData });

      try {
        window.dispatchEvent(new CustomEvent('hvt:warning:end', {
          detail: { ...this.hvtData }
        }));
      } catch (e) {}

      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    }
  }

  /**
   * Get dynamic camera zoom factor for world transformation.
   * @returns {number}
   */
  getZoomFactor() {
    return this.active ? this.zoomLevel : 1.0;
  }

  /**
   * Get focal target coordinates in viewport space.
   * @param {number} width
   * @param {number} height
   * @returns {{x: number, y: number}}
   */
  getFocalPoint(width, height) {
    return {
      x: width * this.focalPoint.x,
      y: height * this.focalPoint.y
    };
  }

  /**
   * Render the complete HVT Red Alert Warning & Satellite Recon HUD Overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.active) return;

    const progress = Math.max(0, Math.min(1.0, this.elapsed / this.duration));
    const focal = this.getFocalPoint(width, height);
    const fx = focal.x;
    const fy = focal.y;

    // Klaxon flash sync (oscillates at ~2.5 Hz)
    const flashPhase = Math.sin(this.elapsed * Math.PI * 5);
    const flashAlpha = 0.5 + 0.5 * Math.max(0, flashPhase);

    ctx.save();

    // ── 1. FULLSCREEN RED ALERT VIGNETTE & CRIMSON BORDER PULSE ──
    this._renderRedAlertVignette(ctx, width, height, flashAlpha);

    // ── 2. FOUR CORNER HAZARD CAUTION CHEVRONS ──
    this._renderCornerHazardStripes(ctx, width, height, flashAlpha);

    // ── 3. SATELLITE OPTIC TARGETING BRACKETS & CALIBRATION RETICLE ──
    this._renderSatelliteOpticReticle(ctx, width, height, fx, fy, progress, flashAlpha);

    // ── 4. CENTER RED ALERT TACTICAL HUD BANNER ──
    this._renderCenterAlertBanner(ctx, width, height, progress, flashAlpha);

    // ── 5. SONIC BREACH EXPANDING SHOCKWAVE ──
    if (this.shockwaveAlpha > 0) {
      this._renderBreachShockwave(ctx, fx, fy);
    }

    ctx.restore();
  }

  /**
   * Render pulsing red alert vignette and viewport border.
   */
  _renderRedAlertVignette(ctx, width, height, flashAlpha) {
    // Edge gradient vignette
    const edgeSize = Math.min(width, height) * 0.35;
    const vigGrad = ctx.createRadialGradient(
      width / 2, height / 2, Math.max(10, width / 2 - edgeSize),
      width / 2, height / 2, Math.hypot(width, height) / 2
    );
    vigGrad.addColorStop(0, 'rgba(255, 0, 60, 0)');
    vigGrad.addColorStop(0.7, `rgba(255, 0, 60, ${0.18 * flashAlpha})`);
    vigGrad.addColorStop(1, `rgba(255, 0, 60, ${0.48 * flashAlpha})`);

    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);

    // Pulsing 2px crimson boundary frame
    ctx.strokeStyle = `rgba(255, 0, 60, ${0.75 + 0.25 * flashAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // Subtle horizontal scanline raster
    ctx.fillStyle = 'rgba(255, 0, 60, 0.04)';
    const scanStep = 6;
    for (let y = this.scanlineOffset; y < height; y += scanStep * 2) {
      ctx.fillRect(0, y, width, scanStep);
    }
  }

  /**
   * Render military hazard warning diagonal stripes in all 4 corners.
   */
  _renderCornerHazardStripes(ctx, width, height, flashAlpha) {
    const stripeW = 80;
    const stripeH = 26;
    const pad = 12;

    const corners = [
      { x: pad, y: pad, rot: 0, label: '⚠️ RED ALERT' },
      { x: width - pad, y: pad, rot: Math.PI / 2, label: 'SECTOR BREACH' },
      { x: width - pad, y: height - pad, rot: Math.PI, label: 'CRITICAL HVT' },
      { x: pad, y: height - pad, rot: -Math.PI / 2, label: 'RADAR LOCK' }
    ];

    ctx.save();
    for (const c of corners) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);

      // Hazard badge background
      ctx.fillStyle = `rgba(15, 5, 8, 0.85)`;
      ctx.fillRect(0, 0, stripeW, stripeH);
      ctx.strokeStyle = `rgba(255, 0, 60, ${0.8 * flashAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, stripeW, stripeH);

      // Diagonal hazard hashes
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, stripeW, stripeH);
      ctx.clip();
      ctx.strokeStyle = flashAlpha > 0.4 ? 'rgba(255, 183, 3, 0.85)' : 'rgba(255, 0, 60, 0.85)';
      ctx.lineWidth = 4;
      for (let i = -stripeH; i < stripeW + stripeH; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeH, stripeH);
        ctx.stroke();
      }
      ctx.restore();

      // Label overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, stripeW / 2, stripeH / 2);

      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Render satellite optical targeting reticle converging on HVT arrival vector.
   */
  _renderSatelliteOpticReticle(ctx, width, height, fx, fy, progress, flashAlpha) {
    const baseRadius = 80;
    const spread = this.bracketSpread;
    const bDist = baseRadius * (0.8 + spread * 1.4);

    ctx.save();

    // 1. Crosshair alignment lines extending to screen edges
    ctx.strokeStyle = `rgba(255, 0, 60, ${0.35 * flashAlpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);

    // Horizontal crosshair
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(fx - bDist - 20, fy);
    ctx.moveTo(fx + bDist + 20, fy);
    ctx.lineTo(width, fy);
    // Vertical crosshair
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx, fy - bDist - 20);
    ctx.moveTo(fx, fy + bDist + 20);
    ctx.lineTo(fx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Rotating outer calibration ring
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(this.reticleAngle);
    ctx.strokeStyle = `rgba(255, 183, 3, ${0.65 * flashAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 1.35, 0, Math.PI * 2);
    ctx.stroke();

    // Degree tick marks on outer ring
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const tx1 = Math.cos(a) * (baseRadius * 1.35);
      const ty1 = Math.sin(a) * (baseRadius * 1.35);
      const tx2 = Math.cos(a) * (baseRadius * 1.44);
      const ty2 = Math.sin(a) * (baseRadius * 1.44);
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Four Converging Target Lock Brackets [   ]
    const bracketSize = 28;
    ctx.strokeStyle = '#ff003c';
    ctx.lineWidth = 2.5;

    // Top-Left bracket
    ctx.beginPath();
    ctx.moveTo(fx - bDist, fy - bDist + bracketSize);
    ctx.lineTo(fx - bDist, fy - bDist);
    ctx.lineTo(fx - bDist + bracketSize, fy - bDist);
    ctx.stroke();

    // Top-Right bracket
    ctx.beginPath();
    ctx.moveTo(fx + bDist - bracketSize, fy - bDist);
    ctx.lineTo(fx + bDist, fy - bDist);
    ctx.lineTo(fx + bDist, fy - bDist + bracketSize);
    ctx.stroke();

    // Bottom-Left bracket
    ctx.beginPath();
    ctx.moveTo(fx - bDist, fy + bDist - bracketSize);
    ctx.lineTo(fx - bDist, fy + bDist);
    ctx.lineTo(fx - bDist + bracketSize, fy + bDist);
    ctx.stroke();

    // Bottom-Right bracket
    ctx.beginPath();
    ctx.moveTo(fx + bDist - bracketSize, fy + bDist);
    ctx.lineTo(fx + bDist, fy + bDist);
    ctx.lineTo(fx + bDist, fy + bDist - bracketSize);
    ctx.stroke();

    // 4. Center Thermal Target Bloom indicator
    const corePulse = 0.7 + Math.sin(this.elapsed * 12) * 0.3;
    const coreGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 42);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * corePulse})`);
    coreGrad.addColorStop(0.3, `rgba(255, 183, 3, ${0.75 * corePulse})`);
    coreGrad.addColorStop(0.7, `rgba(255, 0, 60, ${0.45 * corePulse})`);
    coreGrad.addColorStop(1, 'rgba(255, 0, 60, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, 42, 0, Math.PI * 2);
    ctx.fill();

    // Center targeting pip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Satellite Reconnaissance Telemetry Stream Readouts
    ctx.font = '800 9px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffb703';
    ctx.textAlign = 'left';

    const textX = fx + bDist + 16;
    const textY = fy - 28;

    ctx.fillText('SAT-OPTIC // KH-14 ORBITAL RECON', textX, textY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`MAGNIFICATION: ${(this.zoomLevel * 3.2).toFixed(1)}X [OPTICAL LOCK]`, textX, textY + 14);
    ctx.fillStyle = '#ff003c';
    ctx.fillText(`TARGET COORD: ${this.hvtData.coordinates}`, textX, textY + 28);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`RCS / MASS: ${this.hvtData.mass} // ARMOR: HEAVY`, textX, textY + 42);
    ctx.fillStyle = flashAlpha > 0.5 ? '#ff003c' : '#ffb703';
    ctx.fillText(`LOCK ACQUISITION: ${(Math.min(100, progress * 135)).toFixed(1)}% CONFIRMED`, textX, textY + 56);

    ctx.restore();
  }

  /**
   * Render central Red Alert tactical warning banner.
   */
  _renderCenterAlertBanner(ctx, width, height, progress, flashAlpha) {
    const cx = width / 2;
    const cy = height * 0.48;
    const bannerW = Math.min(720, width * 0.92);
    const bannerH = 74;

    ctx.save();

    // Background tactical card
    const bgGrad = ctx.createLinearGradient(cx - bannerW / 2, 0, cx + bannerW / 2, 0);
    bgGrad.addColorStop(0, 'rgba(15, 3, 6, 0)');
    bgGrad.addColorStop(0.15, 'rgba(20, 4, 8, 0.94)');
    bgGrad.addColorStop(0.85, 'rgba(20, 4, 8, 0.94)');
    bgGrad.addColorStop(1, 'rgba(15, 3, 6, 0)');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH);

    // Glowing border lines
    ctx.strokeStyle = `rgba(255, 0, 60, ${0.9 * flashAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - bannerW * 0.42, cy - bannerH / 2);
    ctx.lineTo(cx + bannerW * 0.42, cy - bannerH / 2);
    ctx.moveTo(cx - bannerW * 0.42, cy + bannerH / 2);
    ctx.lineTo(cx + bannerW * 0.42, cy + bannerH / 2);
    ctx.stroke();

    // Danger Red Header Text
    ctx.font = '900 clamp(16px, 3.2vw, 24px) "Orbitron", sans-serif';
    ctx.fillStyle = flashAlpha > 0.3 ? '#ff003c' : '#ffb703';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚨 RED ALERT // HIGH-VALUE TARGET DETECTED 🚨', cx, cy - 14);

    // Subtitle & Boss identification
    ctx.font = '700 clamp(10px, 1.8vw, 13px) "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SECTOR 0${this.hvtData.sector} // ${this.hvtData.name}`, cx, cy + 10);

    // Tactical Order Footer
    ctx.font = '800 clamp(8px, 1.4vw, 10px) "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
    ctx.fillText('ALL PILOT WEAPONS AUTHORIZED // MAINTAIN MAXIMUM COMBAT EVASION', cx, cy + 26);

    ctx.restore();
  }

  /**
   * Render expanding sonic breach shockwave when target breaches low orbit.
   */
  _renderBreachShockwave(ctx, fx, fy) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1.0, this.shockwaveAlpha));

    // Outer shock ring
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, fy, this.shockwaveRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fiery compression ring
    ctx.strokeStyle = '#ff003c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(0, this.shockwaveRadius - 14), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
