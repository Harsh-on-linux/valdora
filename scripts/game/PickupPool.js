/**
 * PickupPool.js — Tactical Intel & Supply Drops System
 * Zero-allocation object pool for supply crates, nanite repair kits,
 * ordnance overcharge capsules, ECM burst charges, and tactical intel packets.
 *
 * Features:
 * - 4 tactical pickup types: REPAIR_KIT, ECM_BURST, ORDNANCE_OVERCHARGE, INTEL_PACKET
 * - Magnetic attraction towards player drone when within proximity radius (120px)
 * - Procedural vector rendering with glowing holographic icons and animated bobbing
 * - Smooth collection juice (score floaters, sound triggers, and particle bursts)
 */

export const PICKUP_TYPES = {
  REPAIR_KIT: {
    id: 'REPAIR_KIT',
    name: 'NANITE REPAIR KIT',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.7)',
    icon: '✚',
    radius: 14,
    lifetime: 14.0,
    scoreValue: 150,
    attractionSpeed: 380,
    attractionRadius: 130
  },

  ECM_BURST: {
    id: 'ECM_BURST',
    name: 'ECM BURST CHARGE',
    color: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.75)',
    icon: '◎',
    radius: 14,
    lifetime: 14.0,
    scoreValue: 200,
    attractionSpeed: 380,
    attractionRadius: 130
  },

  ORDNANCE_OVERCHARGE: {
    id: 'ORDNANCE_OVERCHARGE',
    name: 'ORDNANCE OVERCHARGE',
    color: '#ffb703',
    glowColor: 'rgba(255, 183, 3, 0.75)',
    icon: '⚡',
    radius: 14,
    lifetime: 14.0,
    scoreValue: 250,
    attractionSpeed: 380,
    attractionRadius: 130
  },

  INTEL_PACKET: {
    id: 'INTEL_PACKET',
    name: 'TACTICAL INTEL CACHE',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    icon: '◆',
    radius: 14,
    lifetime: 16.0,
    scoreValue: 500,
    attractionSpeed: 420,
    attractionRadius: 150
  }
};

export class PickupPool {
  /**
   * @param {number} [maxPickups=64]
   */
  constructor(maxPickups = 64) {
    this.maxPickups = maxPickups;
    this._boostTimer = null;

    // Pre-allocated object pool
    this.pickups = new Array(maxPickups);
    for (let i = 0; i < maxPickups; i++) {
      this.pickups[i] = {
        id: `pickup-${i}`,
        active: false,
        type: 'REPAIR_KIT',
        config: PICKUP_TYPES.REPAIR_KIT,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        radius: 14,
        lifetime: 14.0,
        maxLifetime: 14.0,
        timeAlive: 0,
        bobPhase: Math.random() * Math.PI * 2,
        isMagnetized: false
      };
    }
  }

  /**
   * Spawn a supply/intel drop at the given world coordinates.
   * @param {Object} options
   * @param {string} [options.type='INTEL_PACKET']
   * @param {number} options.x
   * @param {number} options.y
   * @param {number} [options.vx=0]
   * @param {number} [options.vy=0]
   * @returns {Object|null} Spawned pickup instance
   */
  spawn({ type = 'INTEL_PACKET', x = 0, y = 0, vx = 0, vy = 0 }) {
    const cfg = PICKUP_TYPES[type] || PICKUP_TYPES.INTEL_PACKET;

    for (let i = 0; i < this.maxPickups; i++) {
      const p = this.pickups[i];
      if (!p.active) {
        p.active = true;
        p.type = type;
        p.config = cfg;
        p.x = x;
        p.y = y;
        p.prevX = x;
        p.prevY = y;
        p.vx = vx + (Math.random() - 0.5) * 30;
        p.vy = vy + 35 + Math.random() * 20;
        p.radius = cfg.radius || 14;
        p.lifetime = cfg.lifetime || 14.0;
        p.maxLifetime = p.lifetime;
        p.timeAlive = 0;
        p.bobPhase = Math.random() * Math.PI * 2;
        p.isMagnetized = false;
        return p;
      }
    }
    return null;
  }

  /**
   * Determine drop roll when an enemy or boss segment is destroyed.
   * @param {Object} enemy
   */
  rollDrop(enemy) {
    if (!enemy) return;

    const x = enemy.x;
    const y = enemy.y;
    const roll = Math.random();

    // 40% chance of a drop on regular targets, 100% on high-value targets
    const isHVT = enemy.type === 'RADAR_JAMMER' || enemy.type === 'SAM_TURRET';
    if (!isHVT && roll > 0.45) return;

    if (roll < 0.15) {
      this.spawn({ type: 'REPAIR_KIT', x, y });
    } else if (roll < 0.30) {
      this.spawn({ type: 'ECM_BURST', x, y });
    } else if (roll < 0.45) {
      this.spawn({ type: 'ORDNANCE_OVERCHARGE', x, y });
    } else {
      this.spawn({ type: 'INTEL_PACKET', x, y });
    }
  }

  /**
   * Update all active pickups (physics, magnetic homing, lifetimes).
   * @param {number} dt - Fixed delta time
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   */
  update(dt, width, height, player = null) {
    for (let i = 0; i < this.maxPickups; i++) {
      const p = this.pickups[i];
      if (!p.active) continue;

      p.prevX = p.x;
      p.prevY = p.y;
      p.timeAlive += dt;
      p.lifetime -= dt;

      if (p.lifetime <= 0) {
        p.active = false;
        continue;
      }

      // Magnetic Attraction towards Player Drone
      if (player && player.hull > 0) {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.hypot(dx, dy);
        const magnetDist = p.config.attractionRadius || 130;

        if (dist <= magnetDist) {
          p.isMagnetized = true;
          const homingSpeed = (p.config.attractionSpeed || 380) * (1.0 + (1.0 - dist / magnetDist) * 1.5);
          const nx = dx / (dist || 0.001);
          const ny = dy / (dist || 0.001);

          p.vx = p.vx * 0.88 + nx * homingSpeed * 0.12;
          p.vy = p.vy * 0.88 + ny * homingSpeed * 0.12;
        } else {
          p.isMagnetized = false;
          // Natural gentle downward drift
          p.vx *= 0.98;
          p.vy = Math.min(50, p.vy + 10 * dt);
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Despawn if fallen past bottom viewport boundary
      if (p.y > height + 40 || p.x < -40 || p.x > width + 40) {
        p.active = false;
      }
    }
  }

  /**
   * Render all active pickups with glowing wireframe crates, holographic icons, and bobbing animation.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Sub-frame interpolation factor [0..1]
   */
  render(ctx, alpha = 1) {
    const animTime = performance.now();

    for (let i = 0; i < this.maxPickups; i++) {
      const p = this.pickups[i];
      if (!p.active) continue;

      const curX = p.prevX + (p.x - p.prevX) * alpha;
      const curY = p.prevY + (p.y - p.prevY) * alpha;
      const cfg = p.config;

      // Warning flicker when expiring in last 3 seconds
      if (p.lifetime < 3.0 && Math.sin(animTime * 0.02) < 0) {
        continue;
      }

      ctx.save();
      ctx.translate(curX, curY);

      // Bobbing float motion
      const bob = Math.sin(p.timeAlive * 3.5 + p.bobPhase) * 3;
      ctx.translate(0, bob);

      // Rotating dashed magnetic field when magnetized
      if (p.isMagnetized) {
        ctx.save();
        ctx.rotate(animTime * 0.004);
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Outer Holographic Aura Glow
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 1.8);
      glowGrad.addColorStop(0, cfg.glowColor);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Diamond / Hexagonal Crate Housing
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(5, 10, 18, 0.85)';
      ctx.beginPath();
      const sides = 6;
      for (let s = 0; s < sides; s++) {
        const angle = (s / sides) * Math.PI * 2 + (p.isMagnetized ? animTime * 0.003 : 0);
        const px = Math.cos(angle) * p.radius;
        const py = Math.sin(angle) * p.radius;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Iconic Symbol (✚, ◎, ⚡, ◆)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.icon, 0, 0);

      ctx.restore();
    }
  }

  /**
   * Apply pickup effect to player drone and game engine upon collection.
   * @param {Object} pickup
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {import('../audio/SoundManager.js').SoundManager} [soundManager=null]
   */
  applyPickup(pickup, player, gameEngine, soundManager = null) {
    if (!pickup || !pickup.active) return;
    pickup.active = false;

    const cfg = pickup.config;

    // 1. Award score
    const scoreValue = cfg.scoreValue || 200;
    if (typeof gameEngine.addScore === 'function') gameEngine.addScore(scoreValue);
    else gameEngine.score += scoreValue;
    if (typeof gameEngine.recordPickupCollected === 'function') {
      gameEngine.recordPickupCollected();
    } else {
      gameEngine.pickupsCollected = (gameEngine.pickupsCollected || 0) + 1;
    }

    // 2. Execute unique payload effect
    switch (pickup.type) {
      case 'REPAIR_KIT':
        // Restore 25 hull + 20 shield
        player.hull = Math.min(player.maxHull, player.hull + 30);
        player.shield = Math.min(player.maxShield, player.shield + 25);
        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHitSparks(player.x, player.y, '#10b981', 16);
        }
        break;

      case 'ECM_BURST':
        // Clear radar jamming disruption and emit localized shockwave
        if (gameEngine.hudOverlay) {
          gameEngine.hudOverlay.isJammingActive = false;
        }
        gameEngine.addCameraShake(6);
        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHellfireDetonation(player.x, player.y, 140, '#00f0ff');
        }
        break;

      case 'ORDNANCE_OVERCHARGE':
        // Boost weapon firing speed & power
        player.boostMultiplier = 1.35;
        if (this._boostTimer) clearTimeout(this._boostTimer);
        this._boostTimer = setTimeout(() => { this._boostTimer = null; player.boostMultiplier = 1.0; }, 8000);
        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHitSparks(player.x, player.y, '#ffb703', 18);
        }
        break;

      case 'INTEL_PACKET':
      default:
        // Tactical Intel cache (+500 points + visual data burst)
        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHitSparks(player.x, player.y, '#a855f7', 20);
          gameEngine.projectiles.spawnHitSparks(player.x, player.y, '#ffffff', 8);
        }
        break;
    }

    // 3. Audio feedback
    if (soundManager && typeof soundManager.playPowerup === 'function') {
      soundManager.playPowerup();
    } else if (soundManager && typeof soundManager.playWeaponSwitch === 'function') {
      soundManager.playWeaponSwitch('LASER');
    }
  }

  /**
   * Get active pickup count.
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    for (let i = 0; i < this.maxPickups; i++) {
      if (this.pickups[i].active) count++;
    }
    return count;
  }

  /**
   * Deactivate all pickups.
   */
  clear() {
    if (this._boostTimer) {
      clearTimeout(this._boostTimer);
      this._boostTimer = null;
    }
    for (let i = 0; i < this.maxPickups; i++) {
      this.pickups[i].active = false;
    }
  }
}
