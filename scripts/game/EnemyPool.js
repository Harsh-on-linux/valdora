/**
 * EnemyPool.js — High-Performance Zero-Allocation Hostile Target Pool & Base Target Lifecycle
 * Features:
 * - Pre-allocated memory pool of enemy entities (zero GC during combat)
 * - Sub-frame position interpolation for smooth 60+ FPS motion
 * - Integrated procedural rendering via EnemyRenderer.js
 * - Hostile IFF markers, FLIR heat-flash shaders, and damage degradation FX (smoke & sparks)
 * - Deterministic movement behavior execution:
 *     • linearDescent (Recon Buggy)
 *     • sinusoidal (Interceptor)
 *     • anchorDrift (SAM Turret)
 *     • lockOnDive (Kamikaze Drone)
 *     • erraticFloat (Radar Jammer)
 * - Hostile weapon fire orchestration using ProjectilePool
 * - Intel drop roll and lifecycle scoring integration
 */

import { ENEMY_TYPES, getEnemyById } from './enemies.js';
import { drawEnemy } from './EnemyRenderer.js';
import { PROJECTILE_TYPES } from './ProjectilePool.js';

export class EnemyPool {
  /**
   * @param {number} [maxEnemies=40]
   */
  constructor(maxEnemies = 40) {
    this.maxEnemies = maxEnemies;
    this.enemies = new Array(maxEnemies);
    this._initPool();
  }

  /**
   * Pre-allocate flat memory buffer for enemy targets.
   */
  _initPool() {
    for (let i = 0; i < this.maxEnemies; i++) {
      this.enemies[i] = {
        active: false,
        id: `tgt-${i}`,
        type: 'RECON_BUGGY',
        name: 'RV-4 SCOUT',
        config: null,
        // Position & Physics
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        baseSpeedY: 120,
        speed: 120,
        rotation: 0,
        radius: 20,
        size: 36,
        // Health & Armor
        hull: 15,
        maxHull: 15,
        armor: 0.2,
        contactDamage: 10,
        scoreValue: 100,
        flashTimer: 0,
        // Movement state tracking
        pattern: 'linearDescent',
        spawnX: 0,
        spawnY: 0,
        timeAlive: 0,
        driftPhase: 0,
        anchorY: 0,
        isAnchored: false,
        // Kamikaze dive state
        isDiving: false,
        diveLockTimer: 0,
        diveTargetX: 0,
        diveTargetY: 0,
        diveWarningTimer: 0,
        // Turret state
        turretAngle: 0,
        burstCountRemaining: 0,
        burstShotTimer: 0,
        // Weapon & Cooldowns
        fireTimer: 1.0,
        fireCooldown: 2.0,
        // Jamming & ECM
        jamPulse: 0,
        // Damage smoke timer
        smokeTimer: 0
      };
    }
  }

  /**
   * Spawn an enemy target from the pre-allocated pool.
   * @param {Object} options
   * @param {string} [options.type='RECON_BUGGY'] - Enemy archetype ID
   * @param {number} options.x - World X
   * @param {number} options.y - World Y
   * @param {number} [options.vx=0] - Initial horizontal velocity
   * @param {number} [options.vy=0] - Initial vertical velocity
   * @returns {Object|null} Activated enemy object or null if pool exhausted
   */
  spawn(options) {
    const typeId = options.type || 'RECON_BUGGY';
    const config = getEnemyById(typeId) || ENEMY_TYPES.RECON_BUGGY;

    for (let i = 0; i < this.maxEnemies; i++) {
      const e = this.enemies[i];
      if (!e.active) {
        e.active = true;
        e.type = config.id;
        e.name = config.name;
        e.config = config;

        e.x = options.x || 0;
        e.y = options.y || 0;
        e.prevX = e.x;
        e.prevY = e.y;
        e.spawnX = e.x;
        e.spawnY = e.y;

        const baseSpeed = config.movement?.baseSpeedY || 100;
        e.baseSpeedY = baseSpeed;
        e.vx = options.vx !== undefined ? options.vx : 0;
        e.vy = options.vy !== undefined ? options.vy : baseSpeed;
        e.speed = baseSpeed;
        e.rotation = 0;

        const baseRadius = 24 * (config.render?.scale || 0.6);
        e.radius = baseRadius;
        e.size = baseRadius * 2;

        e.maxHull = config.stats?.hp || 20;
        e.hull = e.maxHull;
        e.armor = config.stats?.armor || 0.5;
        e.contactDamage = config.stats?.contactDamage || 15;
        e.scoreValue = config.stats?.scoreValue || 150;
        e.flashTimer = 0;

        e.pattern = config.movement?.pattern || 'linearDescent';
        e.timeAlive = 0;
        e.driftPhase = Math.random() * Math.PI * 2;
        e.anchorY = (config.movement?.anchorY || 0.25);
        e.isAnchored = false;

        e.isDiving = false;
        e.diveLockTimer = 0;
        e.diveTargetX = 0;
        e.diveTargetY = 0;
        e.diveWarningTimer = 0;

        e.turretAngle = Math.PI; // Face downward
        e.burstCountRemaining = 0;
        e.burstShotTimer = 0;

        e.fireCooldown = config.weapon?.cooldown || 2.0;
        // Stagger initial fire to prevent simultaneous burst volleys
        e.fireTimer = Math.random() * e.fireCooldown * 0.75 + 0.5;

        e.jamPulse = 0;
        e.smokeTimer = 0;
        return e;
      }
    }
    console.warn('[EnemyPool] Pool capacity exhausted (40).');
    return null;
  }

  /**
   * Apply ballistic / energy damage to an enemy target.
   * @param {Object} enemy
   * @param {number} damageAmount
   * @returns {{destroyed: boolean, actualDamage: number}}
   */
  applyDamage(enemy, damageAmount) {
    if (!enemy || !enemy.active || enemy.hull <= 0) {
      return { destroyed: false, actualDamage: 0 };
    }

    // Armor mitigation formula: damage = rawDamage / (1 + armor * 0.45)
    const effectiveArmor = enemy.armor || 0;
    const actualDamage = Math.max(1, damageAmount / (1 + effectiveArmor * 0.45));

    enemy.hull -= actualDamage;
    enemy.flashTimer = 0.14; // Trigger thermal heat-flash shader

    if (enemy.hull <= 0) {
      enemy.hull = 0;
      return { destroyed: true, actualDamage };
    }

    return { destroyed: false, actualDamage };
  }

  /**
   * Deactivate and recycle an enemy target.
   * @param {Object} enemy
   */
  despawn(enemy) {
    if (enemy) {
      enemy.active = false;
    }
  }

  /**
   * Deterministic fixed-timestep update loop (60 Hz).
   * @param {number} dt - Fixed delta time
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @param {import('./PlayerDrone.js').PlayerDrone} [player=null]
   * @param {import('./ProjectilePool.js').ProjectilePool} [projectilePool=null]
   * @param {import('../audio/SoundManager.js').SoundManager} [soundManager=null]
   * @param {import('./GameEngine.js').GameEngine} [gameEngine=null]
   */
  update(dt, width, height, player = null, projectilePool = null, soundManager = null, gameEngine = null) {
    const pad = 64;

    for (let i = 0; i < this.maxEnemies; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;

      e.prevX = e.x;
      e.prevY = e.y;
      e.timeAlive += dt;

      if (e.flashTimer > 0) {
        e.flashTimer = Math.max(0, e.flashTimer - dt);
      }

      const cfg = e.config || ENEMY_TYPES.RECON_BUGGY;
      const mov = cfg.movement || {};

      // ══════════════════════════════════════════════════════════════
      // 1. MOVEMENT EXECUTION PATTERNS
      // ══════════════════════════════════════════════════════════════
      switch (e.pattern) {
        case 'linearDescent': {
          // Linear downward descent with slight harmonic lateral drift
          const drift = Math.sin(e.timeAlive * 1.8 + e.driftPhase) * (mov.lateralDrift || 30);
          e.vx = drift;
          e.vy = e.baseSpeedY;
          break;
        }

        case 'sinusoidal': {
          // Horizontal sinusoidal wave (amplitude & frequency)
          const amp = mov.amplitude || 120;
          const freq = mov.frequency || 1.8;
          e.x = e.spawnX + Math.sin(e.timeAlive * freq * Math.PI) * amp;
          e.vy = e.baseSpeedY;
          e.vx = Math.cos(e.timeAlive * freq * Math.PI) * amp * freq;
          break;
        }

        case 'anchorDrift': {
          // Enters slowly from top, anchors at Y-target, then slow lateral sweep
          const targetY = height * (e.anchorY || 0.25);
          if (e.y < targetY) {
            e.vy = mov.baseSpeedY || 40;
            e.vx = 0;
          } else {
            e.isAnchored = true;
            e.vy = 0;
            e.vx = Math.sin(e.timeAlive * 0.8 + e.driftPhase) * (mov.lateralDrift || 20);
          }
          break;
        }

        case 'lockOnDive': {
          // Kamikaze: Brief hover/approach → telegraph lock on player → extreme dive ram
          if (!e.isDiving) {
            e.vy = mov.baseSpeedY || 60;
            e.diveLockTimer += dt;

            // Acquire lock on player position
            if (e.diveLockTimer >= (mov.lockOnDelay || 0.5) && player) {
              e.isDiving = true;
              e.diveTargetX = player.x;
              e.diveTargetY = player.y;

              const dx = e.diveTargetX - e.x;
              const dy = e.diveTargetY - e.y;
              const angle = Math.atan2(dy, dx);
              const diveSpeed = mov.diveSpeed || 600;

              e.vx = Math.cos(angle) * diveSpeed;
              e.vy = Math.sin(angle) * diveSpeed;
              e.rotation = angle + Math.PI / 2;

              if (soundManager && typeof soundManager.playWarning === 'function') {
                soundManager.playWarning();
              }
            }
          }
          break;
        }

        case 'erraticFloat': {
          // Radar Jammer: slow wobbling descent in upper sector
          const targetY = height * (e.anchorY || 0.30);
          const amp = mov.amplitude || 40;
          const freq = mov.frequency || 0.5;
          e.vx = Math.sin(e.timeAlive * freq * Math.PI * 2 + e.driftPhase) * (mov.lateralDrift || 50);
          e.vy = e.y < targetY ? (mov.baseSpeedY || 25) : Math.sin(e.timeAlive * 1.5) * 10;
          e.jamPulse = (e.jamPulse + dt * 2.0) % (Math.PI * 2);
          break;
        }

        default:
          e.vy = e.baseSpeedY;
          break;
      }

      // Advance position
      if (e.pattern !== 'sinusoidal') {
        e.x += e.vx * dt;
      }
      e.y += e.vy * dt;

      // Keep within horizontal bounds (rebound if exiting sides unless entering)
      if (e.x < e.radius && e.vx < 0) {
        e.vx = -e.vx;
        e.spawnX = e.x;
      } else if (e.x > width - e.radius && e.vx > 0) {
        e.vx = -e.vx;
        e.spawnX = e.x;
      }

      // ══════════════════════════════════════════════════════════════
      // 2. WEAPON & ATTACK DISCHARGE ORCHESTRATION
      // ══════════════════════════════════════════════════════════════
      const wpn = cfg.weapon || {};
      if (wpn.type && wpn.type !== 'none' && projectilePool) {
        // Aim turret towards player if tracking turret
        if (e.type === 'SAM_TURRET' && player) {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          e.turretAngle = Math.atan2(dy, dx) - Math.PI / 2;
        }

        // Burst fire queue processing (GT-12 Sentinel)
        if (e.burstCountRemaining > 0) {
          e.burstShotTimer -= dt;
          if (e.burstShotTimer <= 0) {
            e.burstShotTimer = wpn.burstDelay || 0.12;
            e.burstCountRemaining--;

            // Fire aimed projectile towards player
            let aimAngle = Math.PI / 2; // Downward default
            if (player) {
              aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
            }

            const pSpeed = wpn.projectileSpeed || 380;
            projectilePool.spawn({
              owner: 'enemy',
              type: PROJECTILE_TYPES.ENEMY_BURST || 'ENEMY_BURST',
              x: e.x,
              y: e.y + e.radius * 0.6,
              prevX: e.x,
              prevY: e.y + e.radius * 0.6,
              vx: Math.cos(aimAngle) * pSpeed,
              vy: Math.sin(aimAngle) * pSpeed,
              speed: pSpeed,
              damage: 14,
              radius: wpn.projectileSize || 4,
              length: 18,
              width: 4,
              color: wpn.projectileColor || '#ffb703',
              glowColor: 'rgba(255, 183, 3, 0.75)',
              coreColor: '#ffffff',
              lifetime: 3.5,
              penetration: 1
            });

            projectilePool.spawnMuzzleFlash(e.x, e.y + e.radius * 0.6, '#ffb703', 14, aimAngle);
          }
        }

        // Primary fire timer update
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.fireCooldown + (Math.random() - 0.5) * 0.4;

          // Single pulse (Recon Buggy)
          if (wpn.type === 'singlePulse') {
            const pSpeed = wpn.projectileSpeed || 280;
            projectilePool.spawn({
              owner: 'enemy',
              type: PROJECTILE_TYPES.ENEMY_BULLET || 'ENEMY_BULLET',
              x: e.x,
              y: e.y + e.radius * 0.6,
              prevX: e.x,
              prevY: e.y + e.radius * 0.6,
              vx: 0,
              vy: pSpeed,
              speed: pSpeed,
              damage: 8,
              radius: 3.2,
              length: 16,
              width: 3.2,
              color: wpn.projectileColor || '#e85a3a',
              glowColor: 'rgba(232, 90, 58, 0.65)',
              coreColor: '#ffffff',
              lifetime: 3.0,
              penetration: 1
            });
            projectilePool.spawnMuzzleFlash(e.x, e.y + e.radius * 0.6, '#e85a3a', 12, Math.PI / 2);
          }
          // Angled dual fire (Interceptor)
          else if (wpn.type === 'angledDual') {
            const pSpeed = wpn.projectileSpeed || 320;
            const spreadRad = (wpn.spreadAngle || 15) * (Math.PI / 180);

            for (const sign of [-1, 1]) {
              const angle = Math.PI / 2 + sign * spreadRad;
              projectilePool.spawn({
                owner: 'enemy',
                type: PROJECTILE_TYPES.ENEMY_BULLET || 'ENEMY_BULLET',
                x: e.x + sign * (e.radius * 0.5),
                y: e.y + e.radius * 0.4,
                prevX: e.x + sign * (e.radius * 0.5),
                prevY: e.y + e.radius * 0.4,
                vx: Math.cos(angle) * pSpeed,
                vy: Math.sin(angle) * pSpeed,
                speed: pSpeed,
                damage: 10,
                radius: 3.5,
                length: 18,
                width: 3.5,
                color: wpn.projectileColor || '#ff8c1a',
                glowColor: 'rgba(255, 140, 26, 0.7)',
                coreColor: '#ffffff',
                lifetime: 3.2,
                penetration: 1
              });
              projectilePool.spawnMuzzleFlash(e.x + sign * (e.radius * 0.5), e.y + e.radius * 0.4, '#ff8c1a', 14, angle);
            }
          }
          // Aimed burst trigger (SAM Turret)
          else if (wpn.type === 'aimedBurst') {
            e.burstCountRemaining = wpn.burstCount || 3;
            e.burstShotTimer = 0;
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 3. DAMAGE STATE DEGRADATION (SMOKE & SPARKS)
      // ══════════════════════════════════════════════════════════════
      const hpPct = e.hull / e.maxHull;
      if (hpPct < 0.5 && projectilePool) {
        e.smokeTimer += dt;
        if (e.smokeTimer >= (hpPct < 0.25 ? 0.05 : 0.12)) {
          e.smokeTimer = 0;
          projectilePool.spawnSmoke(
            e.x + (Math.random() - 0.5) * e.radius,
            e.y + (Math.random() - 0.5) * e.radius,
            (Math.random() - 0.5) * 20,
            Math.random() * 30 + 10,
            '#ff3b30',
            '#ff9e1b',
            2.5,
            12.0,
            0.4
          );
          if (hpPct < 0.25 && Math.random() < 0.4) {
            projectilePool.spawnHitSparks(e.x, e.y, '#ffeedd', 2);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 4. DESPAWN BOUNDARY CHECK
      // ══════════════════════════════════════════════════════════════
      if (
        e.y > height + pad ||
        e.x < -pad * 2 ||
        e.x > width + pad * 2 ||
        (e.y < -pad * 2 && e.timeAlive > 3.0)
      ) {
        e.active = false;
      }
    }
  }

  /**
   * Render all active enemy targets to Canvas2D.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Sub-frame interpolation factor [0..1]
   * @param {number} animTime - Continuous animation timestamp in ms
   */
  render(ctx, alpha, animTime = 0) {
    for (let i = 0; i < this.maxEnemies; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;

      const curX = e.prevX + (e.x - e.prevX) * alpha;
      const curY = e.prevY + (e.y - e.prevY) * alpha;
      const hpPct = Math.max(0, Math.min(1, e.hull / e.maxHull));

      // FLIR Heat-Flash shader overlay when recently hit
      if (e.flashTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(0.7, e.flashTimer * 6.0);
        ctx.beginPath();
        ctx.arc(curX, curY, e.radius * 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Procedural tactical enemy drawing
      drawEnemy(ctx, e.type, curX, curY, e.size, {
        animTime: animTime || (Date.now()),
        rotation: e.rotation || 0,
        hpPercent: hpPct,
        showIFF: true,
        turretAngle: e.turretAngle || 0,
        isDiving: e.isDiving || false,
        jamPulse: e.jamPulse || 0
      });
    }
  }

  /**
   * Get total number of active enemies.
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    for (let i = 0; i < this.maxEnemies; i++) {
      if (this.enemies[i].active) count++;
    }
    return count;
  }

  /**
   * Get list of active enemies.
   * @returns {Array<Object>}
   */
  getActiveEnemies() {
    const list = [];
    for (let i = 0; i < this.maxEnemies; i++) {
      if (this.enemies[i].active) list.push(this.enemies[i]);
    }
    return list;
  }

  /**
   * Deactivate all active enemies.
   */
  clear() {
    for (let i = 0; i < this.maxEnemies; i++) {
      this.enemies[i].active = false;
    }
  }
}
