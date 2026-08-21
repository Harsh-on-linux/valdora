/**
 * ProjectilePool — High-Performance Zero-Allocation Projectile & FX Pool
 * Features:
 * - Pre-allocated memory buffer for player & enemy projectiles (zero GC in render/update loop)
 * - Sub-frame position interpolation for silky-smooth 60+ FPS kinetic tracers
 * - Integrated muzzle flash flare and propellant micro-spark particle pool
 * - FLIR thermal bloom and luminous core rendering pipeline
 * - Screen boundary despawning and lifetime management
 */

export const PROJECTILE_TYPES = {
  VULCAN: 'VULCAN',
  FLAK: 'FLAK',
  LASER: 'LASER',
  HELLFIRE: 'HELLFIRE',
  ENEMY_BULLET: 'ENEMY_BULLET',
  ENEMY_BURST: 'ENEMY_BURST',
  ENEMY_RADIAL: 'ENEMY_RADIAL'
};

export class ProjectilePool {
  /**
   * @param {number} [maxProjectiles=300]
   * @param {number} [maxFlashes=80]
   * @param {number} [maxSparks=120]
   */
  constructor(maxProjectiles = 300, maxFlashes = 80, maxSparks = 120) {
    this.maxProjectiles = maxProjectiles;
    this.projectiles = new Array(maxProjectiles);

    this.maxFlashes = maxFlashes;
    this.flashes = new Array(maxFlashes);

    this.maxSparks = maxSparks;
    this.sparks = new Array(maxSparks);

    this._initPools();
  }

  /**
   * Pre-allocate all projectile and particle objects with flat structures.
   */
  _initPools() {
    // 1. Projectiles Pool
    for (let i = 0; i < this.maxProjectiles; i++) {
      this.projectiles[i] = {
        active: false,
        id: i,
        owner: 'player', // 'player' | 'enemy'
        type: PROJECTILE_TYPES.VULCAN,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        speed: 850,
        damage: 15,
        radius: 3.5,
        length: 22,
        width: 3,
        color: '#2dd4dc',
        glowColor: 'rgba(45, 212, 220, 0.65)',
        coreColor: '#ffffff',
        lifetime: 2.0,
        age: 0,
        penetration: 1,
        hitsRemaining: 1
      };
    }

    // 2. Muzzle Flash Flare Pool
    for (let i = 0; i < this.maxFlashes; i++) {
      this.flashes[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 14,
        maxSize: 14,
        color: '#2dd4dc',
        coreColor: '#ffffff',
        angle: -Math.PI / 2,
        life: 0,
        maxLife: 0.06 // 60ms quick flash
      };
    }

    // 3. Ejected Propellant & Impact Sparks Pool
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#2dd4dc',
        alpha: 1.0,
        life: 0,
        maxLife: 0.2
      };
    }
  }

  /**
   * Spawn a projectile from the pre-allocated pool.
   * @param {Object} config - Projectile parameters
   * @returns {Object|null} The activated projectile or null if pool exhausted
   */
  spawn(config) {
    for (let i = 0; i < this.maxProjectiles; i++) {
      const p = this.projectiles[i];
      if (!p.active) {
        p.active = true;
        p.owner = config.owner || 'player';
        p.type = config.type || PROJECTILE_TYPES.VULCAN;
        p.x = config.x || 0;
        p.y = config.y || 0;
        p.prevX = config.prevX !== undefined ? config.prevX : p.x;
        p.prevY = config.prevY !== undefined ? config.prevY : p.y;
        p.vx = config.vx || 0;
        p.vy = config.vy || 0;
        p.speed = config.speed || 850;
        p.damage = config.damage !== undefined ? config.damage : 15;
        p.radius = config.radius || 3.5;
        p.length = config.length || 22;
        p.width = config.width || 3;
        p.color = config.color || '#2dd4dc';
        p.glowColor = config.glowColor || 'rgba(45, 212, 220, 0.65)';
        p.coreColor = config.coreColor || '#ffffff';
        p.lifetime = config.lifetime || 2.0;
        p.age = 0;
        p.penetration = config.penetration || 1;
        p.hitsRemaining = p.penetration;
        return p;
      }
    }
    console.warn('[ProjectilePool] Exhausted projectile pool capacity (300).');
    return null;
  }

  /**
   * Trigger a high-luminosity muzzle flash and propellant micro-sparks at hardpoint.
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {string} [color='#2dd4dc'] - Flash theme color
   * @param {number} [size=16] - Flash radius
   * @param {number} [angle=-Math.PI/2] - Barrel orientation in radians
   */
  spawnMuzzleFlash(x, y, color = '#2dd4dc', size = 16, angle = -Math.PI / 2) {
    // 1. Muzzle Flash Flare
    for (let i = 0; i < this.maxFlashes; i++) {
      const f = this.flashes[i];
      if (!f.active) {
        f.active = true;
        f.x = x;
        f.y = y;
        f.size = size;
        f.maxSize = size;
        f.color = color;
        f.coreColor = '#ffffff';
        f.angle = angle;
        f.life = 0;
        f.maxLife = 0.05 + Math.random() * 0.03;
        break;
      }
    }

    // 2. Propellant micro-sparks (2 to 4 particles)
    const sparkCount = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < sparkCount; s++) {
      for (let i = 0; i < this.maxSparks; i++) {
        const sp = this.sparks[i];
        if (!sp.active) {
          sp.active = true;
          sp.x = x + (Math.random() * 4 - 2);
          sp.y = y + (Math.random() * 4 - 2);
          const spread = (Math.random() - 0.5) * 0.8;
          const sparkSpeed = Math.random() * 90 + 40;
          sp.vx = Math.cos(angle + spread) * sparkSpeed + (Math.random() * 20 - 10);
          sp.vy = Math.sin(angle + spread) * sparkSpeed;
          sp.size = Math.random() * 2.2 + 1.2;
          sp.color = color;
          sp.alpha = 1.0;
          sp.life = 0;
          sp.maxLife = Math.random() * 0.15 + 0.08;
          break;
        }
      }
    }
  }

  /**
   * Spawn impact sparks for bullet hits.
   * @param {number} x
   * @param {number} y
   * @param {string} [color='#2dd4dc']
   * @param {number} [count=6]
   */
  spawnHitSparks(x, y, color = '#2dd4dc', count = 6) {
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      const sp = this.sparks[i];
      if (!sp.active) {
        sp.active = true;
        sp.x = x;
        sp.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 180 + 80;
        sp.vx = Math.cos(angle) * speed;
        sp.vy = Math.sin(angle) * speed;
        sp.size = Math.random() * 2.5 + 1.5;
        sp.color = color;
        sp.alpha = 1.0;
        sp.life = 0;
        sp.maxLife = Math.random() * 0.22 + 0.1;
        spawned++;
      }
    }
  }

  /**
   * Spawn a radial explosive flak detonation ring and shrapnel cluster.
   * @param {number} x
   * @param {number} y
   * @param {string} [color='#ff9e1b']
   * @param {number} [count=14]
   */
  spawnFlakDetonation(x, y, color = '#ff9e1b', count = 14) {
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      const sp = this.sparks[i];
      if (!sp.active) {
        sp.active = true;
        sp.x = x + (Math.random() * 6 - 3);
        sp.y = y + (Math.random() * 6 - 3);
        const angle = (spawned / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 220 + 100;
        sp.vx = Math.cos(angle) * speed;
        sp.vy = Math.sin(angle) * speed;
        sp.size = Math.random() * 3.2 + 1.8;
        sp.color = color;
        sp.alpha = 1.0;
        sp.life = 0;
        sp.maxLife = Math.random() * 0.28 + 0.14;
        spawned++;
      }
    }
  }

  /**
   * Deactivate a specific projectile.
   * @param {Object} p
   */
  despawn(p) {
    if (p) {
      p.active = false;
    }
  }

  /**
   * Deterministic fixed-timestep update loop (60 Hz).
   * @param {number} dt - Fixed delta time
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   */
  update(dt, width, height) {
    const pad = 64; // Boundary padding before despawning

    // 1. Update Projectiles
    for (let i = 0; i < this.maxProjectiles; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      // Save previous position for sub-frame interpolation & tracer streaks
      p.prevX = p.x;
      p.prevY = p.y;

      // Advance position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;

      // Flak projectile propellant trailing micro-sparks
      if (p.type === PROJECTILE_TYPES.FLAK && Math.random() < 0.22) {
        for (let s = 0; s < this.maxSparks; s++) {
          const sp = this.sparks[s];
          if (!sp.active) {
            sp.active = true;
            sp.x = p.x;
            sp.y = p.y;
            sp.vx = (Math.random() - 0.5) * 30;
            sp.vy = Math.random() * 50 + 20;
            sp.size = 1.8;
            sp.color = p.color;
            sp.alpha = 0.8;
            sp.life = 0;
            sp.maxLife = 0.12;
            break;
          }
        }
      }

      // Despawn on lifetime expiration or out of bounds
      if (
        p.age >= p.lifetime ||
        p.x < -pad ||
        p.x > width + pad ||
        p.y < -pad ||
        p.y > height + pad ||
        p.hitsRemaining <= 0
      ) {
        if (p.type === PROJECTILE_TYPES.FLAK && p.age >= p.lifetime) {
          // Timed fuse detonation micro-burst
          this.spawnHitSparks(p.x, p.y, p.color, 4);
        }
        p.active = false;
      }
    }

    // 2. Update Muzzle Flash Flares
    for (let i = 0; i < this.maxFlashes; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;

      f.life += dt;
      if (f.life >= f.maxLife) {
        f.active = false;
      }
    }

    // 3. Update Propellant & Hit Sparks
    for (let i = 0; i < this.maxSparks; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;

      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.94; // Drag
      sp.vy *= 0.94;
      sp.life += dt;

      if (sp.life >= sp.maxLife) {
        sp.active = false;
      } else {
        sp.alpha = Math.max(0, 1 - (sp.life / sp.maxLife));
      }
    }
  }

  /**
   * Render interpolated kinetic tracers and FX to Canvas2D.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Fractional sub-frame interpolation [0..1]
   */
  render(ctx, alpha) {
    ctx.save();

    // ══════════════════════════════════════════════════════════════
    // 1. Render Projectiles (High-Luminosity Tactical Tracers)
    // ══════════════════════════════════════════════════════════════
    for (let i = 0; i < this.maxProjectiles; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      // Sub-frame interpolated coordinates
      const curX = p.prevX + (p.x - p.prevX) * alpha;
      const curY = p.prevY + (p.y - p.prevY) * alpha;

      // Velocity magnitude and normalized direction vector
      const vMag = Math.hypot(p.vx, p.vy) || 1;
      const dirX = p.vx / vMag;
      const dirY = p.vy / vMag;

      const isFlak = p.type === PROJECTILE_TYPES.FLAK;
      const isLaser = p.type === PROJECTILE_TYPES.LASER;
      const isMissile = p.type === PROJECTILE_TYPES.HELLFIRE;

      // Tail length scales with velocity and tracer length config
      let tailLen = Math.min(p.length, vMag * (isFlak ? 0.022 : (isLaser ? 0.045 : 0.035)) + 6);
      if (isLaser) tailLen = p.length || 54;
      const tailX = curX - dirX * tailLen;
      const tailY = curY - dirY * tailLen;

      // A. Outer Glow / FLIR Bloom Trail
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isFlak ? 14 : (isLaser ? 16 : 10);
      ctx.strokeStyle = p.glowColor;
      ctx.lineWidth = p.width + (isFlak ? 4.5 : (isLaser ? 4.0 : 3.0));
      ctx.lineCap = isLaser ? 'butt' : 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // B. High-Contrast Core Beam
      ctx.shadowBlur = isLaser ? 8 : 5;
      ctx.strokeStyle = isLaser ? '#e879f9' : p.color;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // C. Ultra-Hot White Core Tip
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = Math.max(1.2, p.width * (isLaser ? 0.6 : 0.45));
      ctx.beginPath();
      ctx.moveTo(curX - dirX * (tailLen * (isLaser ? 0.75 : 0.45)), curY - dirY * (tailLen * (isLaser ? 0.75 : 0.45)));
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // D. Leading Projectile Head / Warhead
      if (isFlak) {
        // Chunky explosive flak canister diamond head
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(curX, curY, p.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 4-point explosive diamond cross
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(curX, curY - p.radius * 1.5);
        ctx.lineTo(curX + p.radius * 0.6, curY);
        ctx.lineTo(curX, curY + p.radius * 1.5);
        ctx.lineTo(curX - p.radius * 0.6, curY);
        ctx.closePath();
        ctx.fill();
      } else if (isLaser) {
        // Coherent ionizing needle head & corona
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX, curY, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Ionizing cross spike
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(curX, curY - p.radius * 1.8);
        ctx.lineTo(curX + p.radius * 0.4, curY);
        ctx.lineTo(curX, curY + p.radius * 1.2);
        ctx.lineTo(curX - p.radius * 0.4, curY);
        ctx.closePath();
        ctx.fill();
      } else if (isMissile) {
        // Rocket warhead & aerodynamic nosecone
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(curX, curY - p.radius * 1.4);
        ctx.lineTo(curX + p.radius * 0.8, curY + p.radius * 0.8);
        ctx.lineTo(curX - p.radius * 0.8, curY + p.radius * 0.8);
        ctx.closePath();
        ctx.fill();

        // Exhaust core
        ctx.fillStyle = '#ffeedd';
        ctx.beginPath();
        ctx.arc(curX, curY + p.radius * 0.5, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard kinetic dot head
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(curX, curY, p.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ══════════════════════════════════════════════════════════════
    // 2. Render Muzzle Flash Flares (Diamond Starburst)
    // ══════════════════════════════════════════════════════════════
    for (let i = 0; i < this.maxFlashes; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;

      const progress = f.life / f.maxLife; // 0 to 1
      const scale = (1.0 - progress * 0.5) * f.maxSize;
      const alphaVal = Math.max(0, 1.0 - progress * progress);

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle + Math.PI / 2);

      // Outer radial glow
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = alphaVal * 0.9;
      ctx.fillStyle = f.color;

      // Vertical elongated diamond flare
      ctx.beginPath();
      ctx.moveTo(0, -scale * 1.5);
      ctx.lineTo(scale * 0.45, 0);
      ctx.lineTo(0, scale * 0.6);
      ctx.lineTo(-scale * 0.45, 0);
      ctx.closePath();
      ctx.fill();

      // Horizontal cross spike
      ctx.beginPath();
      ctx.moveTo(0, -scale * 0.3);
      ctx.lineTo(scale * 1.1, 0);
      ctx.lineTo(0, scale * 0.3);
      ctx.lineTo(-scale * 1.1, 0);
      ctx.closePath();
      ctx.fill();

      // Hot white center core
      ctx.fillStyle = f.coreColor;
      ctx.globalAlpha = alphaVal;
      ctx.beginPath();
      ctx.arc(0, 0, scale * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ══════════════════════════════════════════════════════════════
    // 3. Render Propellant & Hit Sparks
    // ══════════════════════════════════════════════════════════════
    for (let i = 0; i < this.maxSparks; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;

      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = sp.color;

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();

      // Spark core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Get total number of active projectiles.
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    for (let i = 0; i < this.maxProjectiles; i++) {
      if (this.projectiles[i].active) count++;
    }
    return count;
  }

  /**
   * Get array of active projectiles (read-only reference).
   * @param {'player'|'enemy'|null} [ownerFilter=null]
   * @returns {Array<Object>}
   */
  getActiveProjectiles(ownerFilter = null) {
    const list = [];
    for (let i = 0; i < this.maxProjectiles; i++) {
      const p = this.projectiles[i];
      if (p.active) {
        if (!ownerFilter || p.owner === ownerFilter) {
          list.push(p);
        }
      }
    }
    return list;
  }

  /**
   * Reset all projectiles and particle pools.
   */
  clear() {
    for (let i = 0; i < this.maxProjectiles; i++) this.projectiles[i].active = false;
    for (let i = 0; i < this.maxFlashes; i++) this.flashes[i].active = false;
    for (let i = 0; i < this.maxSparks; i++) this.sparks[i].active = false;
  }
}
