/**
 * PlayerDrone — Interactive Player Strike Drone Entity
 * Features:
 * - Deterministic fixed-timestep physics (acceleration, velocity, braking drag)
 * - Dynamic 3D banking angles on lateral steering with smooth damping
 * - Forward/reverse engine thrust flare and reactive FLIR exhaust
 * - Zero-allocation object pool for engine particle trails
 * - Viewport boundary clamping with HUD safe-zone padding
 * - Archetype parameterization (STRIKER, REAPER, GHOST) from drones.js
 * - Sub-frame interpolated Canvas2D FLIR wireframe rendering
 */

import { getDroneById, DRONE_TYPES } from './drones.js';

export class PlayerDrone {
  /**
   * @param {string} [droneId='STRIKER']
   */
  constructor(droneId = 'STRIKER') {
    this.droneId = droneId;
    this.config = getDroneById(droneId) || DRONE_TYPES.STRIKER;

    // Position & sub-frame interpolation
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;

    // Velocity & Acceleration
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;

    // Dynamics configuration derived from drone archetype
    this.baseSpeed = 420; // Base px/s
    this.maxSpeed = 420;
    this.accelRate = 2400; // px/s^2
    this.drag = 0.88; // Friction factor

    // Banking / Roll angle (radians)
    this.bankAngle = 0;
    this.prevBankAngle = 0;
    this.targetBankAngle = 0;
    this.maxBankAngle = 0.55; // ~31 degrees
    this.bankSpeed = 12.0;

    // Pitch & Engine thrust state
    this.thrustIntensity = 0.5; // 0.0 to 1.0
    this.targetThrust = 0.5;
    this.engineAnimTime = 0;

    // Dimensions & Hitbox
    this.size = 56;
    this.radius = 24;
    this.hitboxRadius = 18;

    // Safe boundaries (px padding from viewport edges)
    this.boundaryPad = {
      left: 28,
      right: 28,
      top: 72,
      bottom: 80
    };

    // Damage & Flash states
    this.hull = 100;
    this.maxHull = 100;
    this.shield = 100;
    this.maxShield = 100;
    this.invulnerableTimer = 0;
    this.flashTimer = 0;

    // Engine Particle Pool (Zero-allocation)
    this.maxParticles = 60;
    this.particles = [];
    this._initParticlePool();

    this.applyArchetype(this.droneId);
  }

  /**
   * Configure stats, speeds, and render properties from archetype config.
   * @param {string} droneId
   */
  applyArchetype(droneId) {
    this.droneId = droneId;
    this.config = getDroneById(droneId) || DRONE_TYPES.STRIKER;
    const stats = this.config.stats;

    // Scale dynamics according to archetype
    const speedMult = stats.speed ? stats.speed / 4.2 : 1.0;
    const accelMult = stats.acceleration ? stats.acceleration / 0.18 : 1.0;

    this.maxSpeed = 400 * speedMult;
    this.accelRate = 2400 * accelMult;
    this.drag = Math.max(0.82, Math.min(0.92, 0.88 - (stats.evasion - 0.6) * 0.1));

    // Banking limits: Agile drones bank steeper
    this.maxBankAngle = stats.evasion > 0.8 ? 0.62 : (stats.evasion < 0.4 ? 0.40 : 0.54);
    this.bankSpeed = 10.0 + stats.evasion * 6.0;

    // Health stats
    this.maxHull = stats.hull || 100;
    this.hull = this.maxHull;
    this.maxShield = (stats.armor || 1.0) * 100;
    this.shield = this.maxShield;

    // Reset physics
    this.vx = 0;
    this.vy = 0;
    this.bankAngle = 0;
    this.prevBankAngle = 0;
  }

  /**
   * Position drone at specific coordinates (e.g. on game start or spawn).
   * @param {number} x
   * @param {number} y
   */
  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.bankAngle = 0;
    this.prevBankAngle = 0;
    this.invulnerableTimer = 1.5; // 1.5s spawn invulnerability
    this.particles.forEach(p => p.active = false);
  }

  /**
   * Initialize particle pool for engine exhaust trails.
   */
  _initParticlePool() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        alpha: 1.0,
        maxLife: 0.4,
        life: 0,
        color: '#2dd4dc'
      });
    }
  }

  /**
   * Spawn an exhaust particle from the pool.
   */
  _emitExhaustParticle(x, y, baseVx, baseVy, color, sizeMultiplier = 1.0) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() * 4 - 2);
        p.y = y;
        p.vx = baseVx * 0.3 + (Math.random() * 20 - 10);
        p.vy = baseVy + (Math.random() * 40 + 80); // Propel backward/downward
        p.size = (Math.random() * 2.5 + 2.0) * sizeMultiplier;
        p.maxLife = Math.random() * 0.25 + 0.15;
        p.life = p.maxLife;
        p.alpha = 0.9;
        p.color = color;
        break;
      }
    }
  }

  /**
   * Fixed-timestep physics update (60 Hz).
   * @param {number} dt - Fixed delta time (0.01666s)
   * @param {import('./InputManager.js').InputManager} input
   * @param {number} viewWidth - Viewport CSS width
   * @param {number} viewHeight - Viewport CSS height
   */
  update(dt, input, viewWidth, viewHeight) {
    // 1. Store previous state for interpolation
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevBankAngle = this.bankAngle;
    this.engineAnimTime += dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // 2. Sample input vector
    let moveX = 0;
    let moveY = 0;
    let isBoosting = false;

    if (input) {
      input.update(dt, this.x, this.y);
      const move = input.getMovementVector();
      moveX = move.x;
      moveY = move.y;
      isBoosting = input.isActionActive('boost');
    }

    // Boost multiplier
    const speedCap = isBoosting ? this.maxSpeed * 1.35 : this.maxSpeed;
    const effectiveAccel = isBoosting ? this.accelRate * 1.4 : this.accelRate;

    // 3. Accelerate along input vector
    if (moveX !== 0 || moveY !== 0) {
      this.vx += moveX * effectiveAccel * dt;
      this.vy += moveY * effectiveAccel * dt;
    }

    // 4. Apply inertia drag / friction deceleration
    const dragFactor = Math.pow(this.drag, dt * 60);
    if (moveX === 0) {
      this.vx *= dragFactor;
      if (Math.abs(this.vx) < 1.0) this.vx = 0;
    }
    if (moveY === 0) {
      this.vy *= dragFactor;
      if (Math.abs(this.vy) < 1.0) this.vy = 0;
    }

    // 5. Clamp velocity to max speed
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > speedCap) {
      const scale = speedCap / currentSpeed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // 6. Integrate Position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 7. Clamp Position to Viewport Boundaries (HUD Safe Zones)
    const minX = this.boundaryPad.left + this.radius;
    const maxX = viewWidth - this.boundaryPad.right - this.radius;
    const minY = this.boundaryPad.top + this.radius;
    const maxY = viewHeight - this.boundaryPad.bottom - this.radius;

    if (this.x < minX) {
      this.x = minX;
      this.vx = 0;
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = 0;
    }

    if (this.y < minY) {
      this.y = minY;
      this.vy = 0;
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
    }

    // 8. Calculate Dynamic 3D Banking Angle
    // Proportional to horizontal velocity ratio and directional intent
    const speedRatioX = this.vx / this.maxSpeed;
    this.targetBankAngle = speedRatioX * this.maxBankAngle;

    // Smoothly interpolate bank angle towards target
    const bankDamping = Math.min(1.0, this.bankSpeed * dt);
    this.bankAngle += (this.targetBankAngle - this.bankAngle) * bankDamping;

    // 9. Dynamic Thrust & Exhaust Intensity
    // Moving forward (negative vy) increases thrust flare; braking decreases it
    const forwardThrust = Math.max(0, -this.vy / this.maxSpeed);
    const lateralThrust = Math.abs(this.vx) / this.maxSpeed * 0.4;
    this.targetThrust = 0.4 + forwardThrust * 0.6 + lateralThrust + (isBoosting ? 0.4 : 0);
    this.thrustIntensity += (this.targetThrust - this.thrustIntensity) * Math.min(1.0, 10 * dt);

    // 10. Update Engine Particles & Emit New Particles
    this._updateParticles(dt, isBoosting);
  }

  /**
   * Update pooled engine exhaust particles.
   */
  _updateParticles(dt, isBoosting) {
    const thermal = this.config.thermal;
    const renderConfig = this.config.render;
    const engineCount = renderConfig.engineCount || 2;
    const baseSize = this.size;
    const engineY = this.y + baseSize * 0.38;

    // Emit exhaust particles from engine ports
    for (let e = 0; e < engineCount; e++) {
      const spread = engineCount === 1 ? 0 :
        (e - (engineCount - 1) / 2) * (baseSize * 0.16);

      const engineX = this.x + spread * Math.cos(this.bankAngle * 0.5);

      if (Math.random() < (isBoosting ? 0.9 : 0.55)) {
        this._emitExhaustParticle(
          engineX,
          engineY,
          this.vx * 0.2,
          this.vy * 0.2,
          isBoosting ? '#ffffff' : thermal.core,
          this.thrustIntensity
        );
      }
    }

    // Advance active particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = Math.max(0, p.life / p.maxLife);
          p.size *= 0.96; // Shrink as it fades
        }
      }
    }
  }

  /**
   * Render interpolated drone view on gameplay canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Fractional accumulator progress [0..1]
   * @param {number} viewWidth
   * @param {number} viewHeight
   */
  render(ctx, alpha, viewWidth, viewHeight) {
    // 1. Interpolate position and roll angle
    const renderX = this.prevX + (this.x - this.prevX) * alpha;
    const renderY = this.prevY + (this.y - this.prevY) * alpha;
    const renderBank = this.prevBankAngle + (this.bankAngle - this.prevBankAngle) * alpha;

    ctx.save();

    // 2. Render Engine Particle Trails (in world space behind drone)
    this._renderParticles(ctx);

    // 3. Render FLIR Heat Signature Glow underneath drone
    this._renderHeatGlow(ctx, renderX, renderY, this.size, renderBank);

    // 4. Transform to drone local space (applying 3D banking roll)
    ctx.translate(renderX, renderY);

    // Subtle 2D roll tilt + horizontal foreshortening compression
    ctx.rotate(renderBank * 0.22);
    ctx.scale(Math.max(0.65, Math.cos(renderBank * 0.5)), 1.0);

    // Spawn / Invulnerability blink effect
    if (this.invulnerableTimer > 0 && Math.floor(this.engineAnimTime * 14) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Hit-flash effect
    if (this.flashTimer > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
    }

    // 5. Draw Archetype Wireframe Body
    this._renderBody(ctx, this.size, renderBank);

    // 6. Draw Reactive Engine Exhaust Jets
    this._renderEngineJets(ctx, this.size);

    // 7. Draw Hardpoints & Status reticle
    this._renderHardpoints(ctx, this.size);

    ctx.restore();
  }

  /**
   * Render active engine trail particles.
   */
  _renderParticles(ctx) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.active) {
        ctx.globalAlpha = p.alpha * 0.75;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Render thermal FLIR heat signature halo.
   */
  _renderHeatGlow(ctx, x, y, size, bankAngle) {
    const thermal = this.config.thermal;
    const pulse = 1.0 + Math.sin(this.engineAnimTime * 8) * 0.08;
    const glowRadius = size * 0.95 * pulse * this.thrustIntensity;

    ctx.save();
    ctx.globalAlpha = 0.55;

    const grad = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, glowRadius);
    grad.addColorStop(0, thermal.glow);
    grad.addColorStop(0.45, thermal.trail);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y + 4, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render procedural drone wireframe body matching archetype.
   */
  _renderBody(ctx, size, bankAngle) {
    const thermal = this.config.thermal;
    const render = this.config.render;
    const bodyLen = size * render.bodyLength;
    const wingW = size * render.wingSpan * 0.5;

    // Banking shading: brighter glow on elevated wing
    const leftAlpha = bankAngle > 0 ? 0.75 : 1.0;
    const rightAlpha = bankAngle < 0 ? 0.75 : 1.0;

    ctx.save();
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dark high-contrast thermal silhouette fill
    const fillGrad = ctx.createLinearGradient(0, -bodyLen * 0.5, 0, bodyLen * 0.5);
    fillGrad.addColorStop(0, thermal.outer);
    fillGrad.addColorStop(0.5, thermal.mid);
    fillGrad.addColorStop(1, thermal.outer);
    ctx.fillStyle = fillGrad;

    if (render.wingStyle === 'swept') {
      // ── STRIKER: Swept Wing Fighter ──
      ctx.beginPath();
      ctx.moveTo(0, -bodyLen * 0.52); // Nose
      ctx.lineTo(size * 0.08, -bodyLen * 0.35);
      ctx.lineTo(size * 0.09, -bodyLen * 0.1);
      ctx.lineTo(wingW * 0.88, bodyLen * 0.05); // Right Wing
      ctx.lineTo(wingW, bodyLen * 0.16);
      ctx.lineTo(wingW * 0.45, bodyLen * 0.22);
      ctx.lineTo(size * 0.08, bodyLen * 0.32);
      ctx.lineTo(size * 0.06, bodyLen * 0.48);
      ctx.lineTo(0, bodyLen * 0.52); // Tail
      // Left wing mirror
      ctx.lineTo(-size * 0.06, bodyLen * 0.48);
      ctx.lineTo(-size * 0.08, bodyLen * 0.32);
      ctx.lineTo(-wingW * 0.45, bodyLen * 0.22);
      ctx.lineTo(-wingW, bodyLen * 0.16);
      ctx.lineTo(-wingW * 0.88, bodyLen * 0.05);
      ctx.lineTo(-size * 0.09, -bodyLen * 0.1);
      ctx.lineTo(-size * 0.08, -bodyLen * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (render.wingStyle === 'delta') {
      // ── REAPER: Heavy Delta Wing ──
      ctx.beginPath();
      ctx.moveTo(-size * 0.06, -bodyLen * 0.46); // Blunt nose
      ctx.lineTo(size * 0.06, -bodyLen * 0.46);
      ctx.lineTo(size * 0.14, -bodyLen * 0.28);
      ctx.lineTo(size * 0.16, -bodyLen * 0.08);
      ctx.lineTo(wingW, bodyLen * 0.26); // Delta sweep
      ctx.lineTo(wingW * 0.72, bodyLen * 0.34);
      ctx.lineTo(wingW * 0.35, bodyLen * 0.28);
      ctx.lineTo(size * 0.12, bodyLen * 0.40);
      ctx.lineTo(size * 0.08, bodyLen * 0.52);
      ctx.lineTo(0, bodyLen * 0.44); // Notch
      // Left mirror
      ctx.lineTo(-size * 0.08, bodyLen * 0.52);
      ctx.lineTo(-size * 0.12, bodyLen * 0.40);
      ctx.lineTo(-wingW * 0.35, bodyLen * 0.28);
      ctx.lineTo(-wingW * 0.72, bodyLen * 0.34);
      ctx.lineTo(-wingW, bodyLen * 0.26);
      ctx.lineTo(-size * 0.16, -bodyLen * 0.08);
      ctx.lineTo(-size * 0.14, -bodyLen * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else {
      // ── GHOST: Faceted Stealth Wing ──
      ctx.beginPath();
      ctx.moveTo(0, -bodyLen * 0.48); // Sensor nose
      ctx.lineTo(size * 0.12, -bodyLen * 0.28);
      ctx.lineTo(wingW * 0.95, -bodyLen * 0.02);
      ctx.lineTo(wingW, bodyLen * 0.06);
      ctx.lineTo(wingW * 0.7, bodyLen * 0.14);
      ctx.lineTo(wingW * 0.5, bodyLen * 0.08);
      ctx.lineTo(wingW * 0.3, bodyLen * 0.20);
      ctx.lineTo(size * 0.10, bodyLen * 0.28);
      ctx.lineTo(size * 0.07, bodyLen * 0.42);
      ctx.lineTo(0, bodyLen * 0.34);
      // Left mirror
      ctx.lineTo(-size * 0.07, bodyLen * 0.42);
      ctx.lineTo(-size * 0.10, bodyLen * 0.28);
      ctx.lineTo(-wingW * 0.3, bodyLen * 0.20);
      ctx.lineTo(-wingW * 0.5, bodyLen * 0.08);
      ctx.lineTo(-wingW * 0.7, bodyLen * 0.14);
      ctx.lineTo(-wingW, bodyLen * 0.06);
      ctx.lineTo(-wingW * 0.95, -bodyLen * 0.02);
      ctx.lineTo(-size * 0.12, -bodyLen * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Cockpit Sensor Dome
    ctx.beginPath();
    ctx.arc(0, -bodyLen * 0.28, size * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = thermal.core;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center spine line
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -bodyLen * 0.45);
    ctx.lineTo(0, bodyLen * 0.45);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  /**
   * Render animated engine jet plumes at the rear.
   */
  _renderEngineJets(ctx, size) {
    const thermal = this.config.thermal;
    const render = this.config.render;
    const engineCount = render.engineCount || 2;
    const bodyLen = size * render.bodyLength;
    const engineY = bodyLen * 0.46;
    const jetLen = size * 0.28 * this.thrustIntensity * (1.0 + Math.sin(this.engineAnimTime * 24) * 0.12);

    ctx.save();

    for (let i = 0; i < engineCount; i++) {
      const spread = engineCount === 1 ? 0 :
        (i - (engineCount - 1) / 2) * (size * 0.14);

      // Flame plume gradient
      const jetGrad = ctx.createLinearGradient(spread, engineY, spread, engineY + jetLen);
      jetGrad.addColorStop(0, '#ffffff');
      jetGrad.addColorStop(0.3, thermal.core);
      jetGrad.addColorStop(0.7, thermal.mid);
      jetGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(spread - size * 0.04, engineY);
      ctx.lineTo(spread + size * 0.04, engineY);
      ctx.lineTo(spread, engineY + jetLen);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render hardpoints and subtle FLIR targeting markers.
   */
  _renderHardpoints(ctx, size) {
    const thermal = this.config.thermal;
    const hardpoints = this.getHardpointOffsets(size);

    ctx.save();
    ctx.fillStyle = thermal.core;
    ctx.globalAlpha = 0.65;

    for (let i = 0; i < hardpoints.length; i++) {
      const hp = hardpoints[i];
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Calculate local hardpoint positions relative to drone center.
   * @param {number} [size]
   * @returns {Array<{x: number, y: number}>}
   */
  getHardpointOffsets(size = this.size) {
    const render = this.config.render;
    const wingW = size * render.wingSpan * 0.5;
    const bodyLen = size * render.bodyLength;

    if (render.wingStyle === 'delta') {
      return [
        { x: -wingW * 0.55, y: bodyLen * 0.12 },
        { x: wingW * 0.55, y: bodyLen * 0.12 },
        { x: -wingW * 0.75, y: bodyLen * 0.22 },
        { x: wingW * 0.75, y: bodyLen * 0.22 }
      ];
    } else {
      return [
        { x: -wingW * 0.6, y: bodyLen * 0.08 },
        { x: wingW * 0.6, y: bodyLen * 0.08 }
      ];
    }
  }

  /**
   * Get world muzzle positions for spawning projectiles.
   * @returns {Array<{x: number, y: number}>}
   */
  getWeaponMuzzlePositions() {
    const offsets = this.getHardpointOffsets(this.size);
    const cos = Math.cos(this.bankAngle * 0.22);
    const sin = Math.sin(this.bankAngle * 0.22);

    return offsets.map(hp => {
      const rx = hp.x * cos - hp.y * sin;
      const ry = hp.x * sin + hp.y * cos;
      return {
        x: this.x + rx,
        y: this.y + ry
      };
    });
  }

  /**
   * Collision hitbox data.
   */
  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: this.hitboxRadius
    };
  }

  /**
   * Apply damage to drone with shield absorption.
   * @param {number} amount
   */
  applyDamage(amount) {
    if (this.invulnerableTimer > 0) return;

    this.flashTimer = 0.12;

    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    if (amount > 0) {
      this.hull = Math.max(0, this.hull - amount);
    }
  }

  /**
   * Repair hull and recharge shields.
   */
  repair(amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }

  /**
   * Reset player state.
   */
  reset(startX = 0, startY = 0) {
    this.spawn(startX, startY);
    this.hull = this.maxHull;
    this.shield = this.maxShield;
  }
}
