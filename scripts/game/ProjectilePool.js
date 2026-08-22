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
  ORBITAL: 'ORBITAL',
  ENEMY_BULLET: 'ENEMY_BULLET',
  ENEMY_BURST: 'ENEMY_BURST',
  ENEMY_RADIAL: 'ENEMY_RADIAL'
};

export class ProjectilePool {
  /**
   * @param {number} [maxProjectiles=300]
   * @param {number} [maxFlashes=80]
   * @param {number} [maxSparks=160]
   * @param {number} [maxSmokes=180]
   */
  constructor(maxProjectiles = 300, maxFlashes = 80, maxSparks = 160, maxSmokes = 180) {
    this.maxProjectiles = maxProjectiles;
    this.projectiles = new Array(maxProjectiles);

    this.maxFlashes = maxFlashes;
    this.flashes = new Array(maxFlashes);

    this.maxSparks = maxSparks;
    this.sparks = new Array(maxSparks);

    this.maxSmokes = maxSmokes;
    this.smokes = new Array(maxSmokes);

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
        hitsRemaining: 1,
        // Hellfire / Guided Munitions Autonomous Tracking Properties
        target: null,
        targetId: null,
        targetX: 0,
        targetY: 0,
        homingTurnRate: 5.8, // Radians per sec
        acceleration: 1100, // px/s^2
        maxSpeed: 840,
        blastRadius: 85, // AoE splash explosion radius in px
        smokeTimer: 0,
        stage: 0, // 0 = initial booster flare, 1 = active homing
        rotation: -Math.PI / 2
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

    // 4. FLIR Thermal Smoke & Missile Contrail Pool (Zero-GC)
    for (let i = 0; i < this.maxSmokes; i++) {
      this.smokes[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        initialSize: 3,
        maxSize: 18,
        color: '#ff3b30',
        coreColor: '#ff9e1b',
        alpha: 1.0,
        life: 0,
        maxLife: 0.45,
        rotation: 0,
        spinRate: 0
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

        // Guided munition configuration
        p.target = config.target || null;
        p.targetId = config.targetId || (config.target ? config.target.id : null);
        p.targetX = config.targetX || 0;
        p.targetY = config.targetY || 0;
        p.homingTurnRate = config.homingTurnRate || 5.8;
        p.acceleration = config.acceleration || 1100;
        p.maxSpeed = config.maxSpeed || 840;
        p.blastRadius = config.blastRadius || 85;
        p.smokeTimer = 0;
        p.stage = config.stage || 0;
        p.rotation = config.rotation !== undefined ? config.rotation : (Math.atan2(p.vy, p.vx) || -Math.PI / 2);
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
   * Spawn a FLIR thermal smoke puff particle for missile contrails and explosions.
   * @param {number} x
   * @param {number} y
   * @param {number} [vx=0]
   * @param {number} [vy=0]
   * @param {string} [color='#ff3b30']
   * @param {string} [coreColor='#ff9e1b']
   * @param {number} [initialSize=3]
   * @param {number} [maxSize=18]
   * @param {number} [maxLife=0.45]
   */
  spawnSmoke(x, y, vx = 0, vy = 0, color = '#ff3b30', coreColor = '#ff9e1b', initialSize = 3, maxSize = 18, maxLife = 0.45) {
    for (let i = 0; i < this.maxSmokes; i++) {
      const sm = this.smokes[i];
      if (!sm.active) {
        sm.active = true;
        sm.x = x + (Math.random() * 3 - 1.5);
        sm.y = y + (Math.random() * 3 - 1.5);
        sm.vx = vx;
        sm.vy = vy;
        sm.initialSize = initialSize;
        sm.maxSize = maxSize;
        sm.size = initialSize;
        sm.color = color;
        sm.coreColor = coreColor;
        sm.alpha = 0.95;
        sm.life = 0;
        sm.maxLife = maxLife + Math.random() * 0.1;
        sm.rotation = Math.random() * Math.PI * 2;
        sm.spinRate = (Math.random() - 0.5) * 4.0;
        return sm;
      }
    }
    return null;
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
   * Spawn high-yield Hellfire Area-of-Effect (AoE) warhead detonation FX.
   * Spawns multi-ring thermal shockwave, explosive shrapnel cluster, and billowing smoke plume.
   * @param {number} x - Blast epicenter X
   * @param {number} y - Blast epicenter Y
   * @param {number} [radius=85] - Blast visual radius
   * @param {string} [color='#ff003c'] - Theme thermal color
   */
  spawnHellfireDetonation(x, y, radius = 85, color = '#ff003c') {
    // 1. Central high-intensity fireball flash flare
    this.spawnMuzzleFlash(x, y, '#ffeedd', radius * 0.45, -Math.PI / 2);
    this.spawnMuzzleFlash(x, y, color, radius * 0.7, -Math.PI / 2);

    // 2. Multi-directional high-energy shrapnel sparks (24 particles)
    const sparkCount = 26;
    let spawnedSparks = 0;
    for (let i = 0; i < this.maxSparks && spawnedSparks < sparkCount; i++) {
      const sp = this.sparks[i];
      if (!sp.active) {
        sp.active = true;
        sp.x = x;
        sp.y = y;
        const angle = (spawnedSparks / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const speed = Math.random() * 280 + 120;
        sp.vx = Math.cos(angle) * speed;
        sp.vy = Math.sin(angle) * speed;
        sp.size = Math.random() * 3.8 + 2.0;
        sp.color = spawnedSparks % 3 === 0 ? '#ffeedd' : (spawnedSparks % 2 === 0 ? '#ff9e1b' : color);
        sp.alpha = 1.0;
        sp.life = 0;
        sp.maxLife = Math.random() * 0.38 + 0.18;
        spawnedSparks++;
      }
    }

    // 3. Billowing thermal smoke cloud ring (12 expanding puffs)
    const smokeCount = 14;
    for (let s = 0; s < smokeCount; s++) {
      const angle = (s / smokeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = Math.random() * (radius * 0.35);
      const smokeX = x + Math.cos(angle) * dist;
      const smokeY = y + Math.sin(angle) * dist;
      const puffSpeed = Math.random() * 70 + 30;
      const pvx = Math.cos(angle) * puffSpeed;
      const pvy = Math.sin(angle) * puffSpeed;
      const puffColor = s % 2 === 0 ? '#ff003c' : '#ff9e1b';

      this.spawnSmoke(smokeX, smokeY, pvx, pvy, puffColor, '#ffffff', 4, radius * 0.38, 0.55);
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
   * @param {Array<Object>} [targets=null] - Available enemy targets for autonomous guided ordnance
   */
  update(dt, width, height, targets = null) {
    const pad = 64; // Boundary padding before despawning

    // 1. Update Projectiles
    for (let i = 0; i < this.maxProjectiles; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      // Save previous position for sub-frame interpolation & tracer streaks
      p.prevX = p.x;
      p.prevY = p.y;

      // ── THOR ORBITAL KINETIC STRIKE UPDATE ──
      if (p.type === PROJECTILE_TYPES.ORBITAL) {
        p.age += dt;
        // Continuous ionized atmospheric discharge sparks along the beam column
        if (Math.random() < 0.60) {
          const sparkY = Math.random() * height;
          const sparkX = p.x + (Math.random() - 0.5) * (p.width * 0.7);
          this.spawnHitSparks(sparkX, sparkY, Math.random() < 0.5 ? '#ffffff' : '#c084fc', 2);
        }
        if (p.age >= p.lifetime) {
          p.active = false;
        }
        continue;
      }

      // ── HELLFIRE GUIDED MISSILE AUTONOMOUS TRACKING & PROPULSION ──
      if (p.type === PROJECTILE_TYPES.HELLFIRE) {
        // Target re-acquisition if current target is absent or destroyed
        if (targets && targets.length > 0) {
          if (!p.target || p.target.hull <= 0) {
            let bestTarget = null;
            let bestDistSq = Infinity;

            for (let t = 0; t < targets.length; t++) {
              const tgt = targets[t];
              if (!tgt || tgt.hull <= 0) continue;

              const tgtWorldX = tgt.relX !== undefined ? tgt.relX * width : (tgt.x || 0);
              const tgtWorldY = tgt.relY !== undefined ? tgt.relY * height : (tgt.y || 0);
              const dx = tgtWorldX - p.x;
              const dy = tgtWorldY - p.y;
              const distSq = dx * dx + dy * dy;

              // Prioritize forward targets in general flight path
              if (dy < 120 && distSq < bestDistSq) {
                bestDistSq = distSq;
                bestTarget = tgt;
              }
            }

            if (bestTarget) {
              p.target = bestTarget;
              p.targetId = bestTarget.id;
            }
          }
        }

        // Active homing guidance steering toward target
        if (p.target && p.target.hull > 0) {
          const tgtWorldX = p.target.relX !== undefined ? p.target.relX * width : (p.target.x || 0);
          const tgtWorldY = p.target.relY !== undefined ? p.target.relY * height : (p.target.y || 0);

          const dx = tgtWorldX - p.x;
          const dy = tgtWorldY - p.y;
          const desiredAngle = Math.atan2(dy, dx);
          const curAngle = Math.atan2(p.vy, p.vx);

          let angleDiff = desiredAngle - curAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const maxTurn = (p.homingTurnRate || 5.8) * dt;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
          const newAngle = curAngle + turn;

          // Rocket booster acceleration
          p.speed = Math.min(p.maxSpeed || 840, p.speed + (p.acceleration || 1100) * dt);
          p.vx = Math.cos(newAngle) * p.speed;
          p.vy = Math.sin(newAngle) * p.speed;
          p.rotation = newAngle;
        } else {
          // Ballistic flight forward with slight gyro stabilization
          p.rotation = Math.atan2(p.vy, p.vx);
        }

        // Emit continuous FLIR thermal smoke puffs and fiery exhaust particles
        p.smokeTimer = (p.smokeTimer || 0) + dt;
        if (p.smokeTimer >= 0.024) {
          p.smokeTimer = 0;
          const cosR = Math.cos(p.rotation);
          const sinR = Math.sin(p.rotation);
          const nozzleX = p.x - cosR * 14;
          const nozzleY = p.y - sinR * 14;

          const puffVx = -p.vx * 0.15 + (Math.random() - 0.5) * 24;
          const puffVy = -p.vy * 0.15 + (Math.random() - 0.5) * 24;

          this.spawnSmoke(nozzleX, nozzleY, puffVx, puffVy, '#ff003c', '#ff9e1b', 3.2, 16.0, 0.42);

          if (Math.random() < 0.35) {
            this.spawnHitSparks(nozzleX, nozzleY, '#ffeedd', 1);
          }
        }
      }

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
        } else if (p.type === PROJECTILE_TYPES.HELLFIRE && p.age >= p.lifetime) {
          // Missile terminal detonation on fuse expiration
          this.spawnHellfireDetonation(p.x, p.y, p.blastRadius || 85, p.color || '#ff003c');
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

    // 4. Update FLIR Thermal Smoke Particles
    for (let i = 0; i < this.maxSmokes; i++) {
      const sm = this.smokes[i];
      if (!sm.active) continue;

      sm.life += dt;
      sm.x += sm.vx * dt;
      sm.y += sm.vy * dt;
      sm.vx *= 0.93; // Air friction
      sm.vy *= 0.93;
      sm.rotation += sm.spinRate * dt;

      const prog = sm.life / sm.maxLife; // 0 to 1
      sm.size = sm.initialSize + (sm.maxSize - sm.initialSize) * Math.sin(prog * Math.PI * 0.5);
      sm.alpha = Math.max(0, (1.0 - prog * prog) * 0.85);

      if (sm.life >= sm.maxLife) {
        sm.active = false;
      }
    }
  }

  /**
   * Render interpolated kinetic tracers and FX to Canvas2D.
   * Uses high-performance multi-stroke additive rendering (zero shadowBlur for 60+ FPS on mobile).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Fractional sub-frame interpolation [0..1]
   */
  render(ctx, alpha) {
    // ══════════════════════════════════════════════════════════════
    // 1. Render FLIR Thermal Smoke Particles (Behind Projectiles)
    // ══════════════════════════════════════════════════════════════
    for (let i = 0; i < this.maxSmokes; i++) {
      const sm = this.smokes[i];
      if (!sm.active) continue;

      ctx.save();
      ctx.globalAlpha = sm.alpha;
      ctx.translate(sm.x, sm.y);
      if (sm.rotation) ctx.rotate(sm.rotation);

      // Outer thermal bloom (layered alpha circle instead of expensive shadowBlur)
      ctx.fillStyle = sm.color;
      ctx.beginPath();
      ctx.arc(0, 0, sm.size, 0, Math.PI * 2);
      ctx.fill();

      // Core hot center (fades out faster than outer smoke)
      if (sm.life / sm.maxLife < 0.6) {
        ctx.fillStyle = sm.coreColor;
        ctx.beginPath();
        ctx.arc(0, 0, sm.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ══════════════════════════════════════════════════════════════
    // 2. Render Projectiles (High-Luminosity Tactical Tracers & Missiles)
    // ══════════════════════════════════════════════════════════════
    ctx.save();
    // Additive blending creates intense, blinding neon bloom with zero raster blur overhead
    ctx.globalCompositeOperation = 'lighter';

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
      const isOrbital = p.type === PROJECTILE_TYPES.ORBITAL;

      // ── THOR ORBITAL KINETIC STRIKE BEAM PROCEDURAL DRAWING ──
      if (isOrbital) {
        const beamX = p.x;
        const beamW = p.width || 68;
        const beamLen = p.length || 1400;
        const progress = Math.min(1.0, p.age / p.lifetime); // 0 to 1
        const beamAlpha = Math.max(0, 1.0 - progress * progress);

        ctx.save();
        ctx.globalAlpha = beamAlpha;

        // 1. Layer 1: Ultrawide atmospheric distortion / ultraviolet corona
        ctx.fillStyle = 'rgba(167, 139, 250, 0.22)';
        ctx.fillRect(beamX - beamW * 1.3, 0, beamW * 2.6, beamLen);

        // 2. Layer 2: High-energy ionizing plasma pillar
        ctx.fillStyle = 'rgba(192, 132, 252, 0.45)';
        ctx.fillRect(beamX - beamW * 0.7, 0, beamW * 1.4, beamLen);

        // 3. Layer 3: Solid thermal plasma column
        ctx.fillStyle = p.color || '#a78bfa';
        ctx.fillRect(beamX - beamW * 0.4, 0, beamW * 0.8, beamLen);

        // 4. Layer 4: Blinding pure white kinetic core lance
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(beamX - beamW * 0.16, 0, beamW * 0.32, beamLen);

        // 5. Transverse laser interference nodes along the beam
        const pulseCount = 6;
        for (let k = 0; k < pulseCount; k++) {
          const pulseY = ((p.age * 900 + k * 180) % beamLen);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(beamX - beamW * 0.75, pulseY);
          ctx.lineTo(beamX + beamW * 0.75, pulseY);
          ctx.stroke();
        }

        // 6. Ground impact concentric shockwave rings
        const groundY = p.y > 0 ? p.y : beamLen * 0.75;
        const shockRadius = progress * (p.blastRadius || 140);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(beamX, groundY, shockRadius, shockRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(beamX, groundY, shockRadius * 0.65, shockRadius * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        continue;
      }

      // ── HELLFIRE GUIDED MISSILE PROCEDURAL DRAWING ──
      if (isMissile) {
        const missileAngle = p.rotation !== undefined ? p.rotation : Math.atan2(dirY, dirX);

        ctx.save();
        ctx.translate(curX, curY);
        ctx.rotate(missileAngle + Math.PI / 2); // Orient forward

        const len = p.length || 28;
        const wid = p.width || 6;
        const halfW = wid / 2;

        // A. Fiery Rocket Exhaust Jet Plume (Pulsating thrust behind nozzle)
        const flamePulse = 1.0 + Math.sin(p.age * 36) * 0.18;
        const flameLen = 14 * flamePulse;

        // Outer exhaust flame
        ctx.fillStyle = '#ff003c';
        ctx.beginPath();
        ctx.moveTo(-halfW * 0.7, len * 0.45);
        ctx.lineTo(halfW * 0.7, len * 0.45);
        ctx.lineTo(0, len * 0.45 + flameLen);
        ctx.closePath();
        ctx.fill();

        // Inner white-hot thrust cone
        ctx.fillStyle = '#ffeedd';
        ctx.beginPath();
        ctx.moveTo(-halfW * 0.4, len * 0.45);
        ctx.lineTo(halfW * 0.4, len * 0.45);
        ctx.lineTo(0, len * 0.45 + flameLen * 0.55);
        ctx.closePath();
        ctx.fill();

        // B. Missile Fuselage Body
        ctx.fillStyle = '#d4d4d8'; // Tactical matte light grey
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-halfW, len * 0.42);
        ctx.lineTo(halfW, len * 0.42);
        ctx.lineTo(halfW, -len * 0.25);
        ctx.lineTo(0, -len * 0.52); // Pointed warhead cone
        ctx.lineTo(-halfW, -len * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // C. Tactical Red Warning Stripe & Sensor Band
        ctx.fillStyle = p.color;
        ctx.fillRect(-halfW + 0.5, -len * 0.15, wid - 1, len * 0.18);

        // D. Pointed Conical Warhead Nose Tip
        ctx.fillStyle = '#ffeedd';
        ctx.beginPath();
        ctx.arc(0, -len * 0.50, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // E. Stabilizer Fins (4-Fin Cruciform delta stabilizers)
        ctx.fillStyle = '#71717a';
        ctx.strokeStyle = '#27272a';

        // Aft Left Fin
        ctx.beginPath();
        ctx.moveTo(-halfW, len * 0.15);
        ctx.lineTo(-halfW - 5.5, len * 0.44);
        ctx.lineTo(-halfW, len * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Aft Right Fin
        ctx.beginPath();
        ctx.moveTo(halfW, len * 0.15);
        ctx.lineTo(halfW + 5.5, len * 0.44);
        ctx.lineTo(halfW, len * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mid-body canard strakes
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-halfW, -len * 0.08);
        ctx.lineTo(-halfW - 3.2, len * 0.02);
        ctx.lineTo(-halfW, len * 0.02);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(halfW, -len * 0.08);
        ctx.lineTo(halfW + 3.2, len * 0.02);
        ctx.lineTo(halfW, len * 0.02);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        continue;
      }

      // Tail length scales with velocity and tracer length config
      let tailLen = Math.min(p.length, vMag * (isFlak ? 0.022 : (isLaser ? 0.045 : 0.035)) + 6);
      if (isLaser) tailLen = p.length || 54;
      const tailX = curX - dirX * tailLen;
      const tailY = curY - dirY * tailLen;

      // A. Outer Glow / FLIR Bloom Trail (Layered high-alpha additive stroke)
      ctx.strokeStyle = p.glowColor || p.color;
      ctx.lineWidth = p.width + (isFlak ? 4.0 : (isLaser ? 4.5 : 3.0));
      ctx.lineCap = isLaser ? 'butt' : 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // B. High-Contrast Core Beam
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
      } else {
        // Standard kinetic dot head
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(curX, curY, p.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 3. Render Muzzle Flash Flares (Diamond Starburst)
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

      // Outer radial flare
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
    // 4. Render Propellant & Hit Sparks
    // ══════════════════════════════════════════════════════════════
    for (let i = 0; i < this.maxSparks; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;

      ctx.save();
      ctx.globalAlpha = sp.alpha;
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
    for (let i = 0; i < this.maxSmokes; i++) this.smokes[i].active = false;
  }
}
