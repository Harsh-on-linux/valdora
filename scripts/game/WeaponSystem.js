/**
 * WeaponSystem — Player Ordnance Controller & Weapon Mechanics
 * Features:
 * - Deterministic weapon cooldown & cadence timers (fixed 60Hz update)
 * - Dynamic barrel cycling (alternating twin-barrel & quad-pod firing)
 * - Velocity inheritance & ballistic micro-spread dispersion
 * - Real-time integration with TacticalHUDOverlay (Ammo capacitor & Thermal heat)
 * - Procedural muzzle flash flare & audio synthesis triggers
 */

import { WEAPON_TYPES, getWeaponById } from './drones.js';
import { PROJECTILE_TYPES } from './ProjectilePool.js';

export class WeaponSystem {
  /**
   * @param {string} [initialWeaponId='VULCAN']
   */
  constructor(initialWeaponId = 'VULCAN') {
    this.activeWeaponId = initialWeaponId;
    this.weaponConfig = getWeaponById(initialWeaponId) || WEAPON_TYPES.VULCAN;

    // Cooldown & timing
    this.fireTimer = 0;
    this.barrelIndex = 0;

    // Weapon parameters (scaled by drone stats)
    this.baseFireRate = 9.0; // Rounds per second (Hz)
    this.fireRateMultiplier = 1.0;
    this.projectileSpeed = 920; // px/s
    this.spread = 0.025; // Radians (+/- 1.4 degrees dispersion)
    this.damage = 15;
    this.heatPerShot = 3.2;
    this.ammoPerShot = 1.8;

    this.recoilImpulse = 0.6; // Screen shake per shot

    this.setWeapon(initialWeaponId);
  }

  /**
   * Configure active weapon and reset cooldowns.
   * @param {string} weaponId
   */
  setWeapon(weaponId) {
    this.activeWeaponId = weaponId;
    this.weaponConfig = getWeaponById(weaponId) || WEAPON_TYPES.VULCAN;

    // Apply baseline weapon archetype parameters
    switch (this.weaponConfig.id) {
      case 'VULCAN':
      default:
        this.baseFireRate = 9.5; // ~105ms interval
        this.projectileSpeed = 920;
        this.spread = 0.025;
        this.damage = 15;
        this.heatPerShot = 3.0;
        this.ammoPerShot = 1.6;
        this.recoilImpulse = 0.5;
        break;

      case 'FLAK':
        this.baseFireRate = 3.5;
        this.projectileSpeed = 740;
        this.spread = 0.22;
        this.damage = 28;
        this.heatPerShot = 9.0;
        this.ammoPerShot = 6.0;
        this.recoilImpulse = 1.8;
        break;

      case 'LASER':
        this.baseFireRate = 20.0;
        this.projectileSpeed = 1600;
        this.spread = 0.0;
        this.damage = 8;
        this.heatPerShot = 2.2;
        this.ammoPerShot = 1.2;
        this.recoilImpulse = 0.2;
        break;

      case 'HELLFIRE':
        this.baseFireRate = 1.4;
        this.projectileSpeed = 560;
        this.spread = 0.08;
        this.damage = 80;
        this.heatPerShot = 14.0;
        this.ammoPerShot = 10.0;
        this.recoilImpulse = 2.5;
        break;
    }

    this.fireTimer = 0;
  }

  /**
   * Apply drone chassis modifiers (fire rate bonus, weapon compatibility).
   * @param {Object} droneConfig
   */
  applyDroneModifiers(droneConfig) {
    if (!droneConfig || !droneConfig.stats) return;
    this.fireRateMultiplier = droneConfig.stats.fireRate || 1.0;
  }

  /**
   * Fixed-timestep update for weapon cooldowns.
   * @param {number} dt
   */
  update(dt) {
    if (this.fireTimer > 0) {
      this.fireTimer = Math.max(0, this.fireTimer - dt);
    }
  }

  /**
   * Attempt to fire primary weapon stream.
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {import('./ProjectilePool.js').ProjectilePool} projectilePool
   * @param {import('./TacticalHUDOverlay.js').TacticalHUDOverlay} hudOverlay
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @returns {boolean} true if shot was discharged
   */
  fire(player, projectilePool, hudOverlay, soundManager, gameEngine) {
    // 1. Check if weapon is ready (cooldown elapsed)
    if (this.fireTimer > 0) return false;

    // 2. Check thermal and ammo allowance via HUD
    if (hudOverlay) {
      const allowed = hudOverlay.registerFire(this.heatPerShot, this.ammoPerShot);
      if (!allowed) {
        // Enforce brief delay before checking again so warning/deny audio doesn't spam every frame
        this.fireTimer = 0.15;
        return false;
      }
    }

    // 3. Obtain world muzzle positions from drone geometry
    const muzzles = player.getWeaponMuzzlePositions();
    if (!muzzles || muzzles.length === 0) return false;

    const droneThermal = player.config?.thermal || { core: '#2dd4dc', glow: 'rgba(45, 212, 220, 0.6)' };
    const effectiveFireRate = this.baseFireRate * this.fireRateMultiplier;

    // 4. Fire Vulcan Cannon
    if (this.weaponConfig.id === 'VULCAN' || !this.weaponConfig.id) {
      // Alternating twin-barrel fire: selects next muzzle in sequence
      const muzzleIdx = this.barrelIndex % muzzles.length;
      const muzzle = muzzles[muzzleIdx];
      this.barrelIndex = (this.barrelIndex + 1) % muzzles.length;

      // Calculate trajectory with slight spread dispersion
      const spreadAngle = (Math.random() - 0.5) * this.spread;
      const baseAngle = -Math.PI / 2 + spreadAngle; // Upward

      // Bullet velocity + partial player lateral velocity inheritance
      const vx = Math.cos(baseAngle) * this.projectileSpeed + player.vx * 0.18;
      const vy = Math.sin(baseAngle) * this.projectileSpeed;

      // Spawn projectile into pool
      projectilePool.spawn({
        owner: 'player',
        type: PROJECTILE_TYPES.VULCAN,
        x: muzzle.x,
        y: muzzle.y,
        prevX: muzzle.x,
        prevY: muzzle.y,
        vx: vx,
        vy: vy,
        speed: this.projectileSpeed,
        damage: this.damage,
        radius: 3.5,
        length: 24,
        width: 3.2,
        color: droneThermal.core || '#2dd4dc',
        glowColor: droneThermal.glow || 'rgba(45, 212, 220, 0.65)',
        coreColor: '#ffffff',
        lifetime: 2.2,
        penetration: 1
      });

      // Spawn diamond muzzle flash & sparks at exact hardpoint
      projectilePool.spawnMuzzleFlash(
        muzzle.x,
        muzzle.y,
        droneThermal.core || '#2dd4dc',
        14,
        -Math.PI / 2
      );

      // Play procedural Vulcan audio pop
      if (soundManager && typeof soundManager.playVulcanFire === 'function') {
        soundManager.playVulcanFire(muzzleIdx);
      }

      // Add subtle tactical camera recoil impulse
      if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
        gameEngine.addCameraShake(this.recoilImpulse);
      }

      // Set cooldown timer for next round
      this.fireTimer = 1.0 / effectiveFireRate;
      return true;
    }

    // Default fallback
    this.fireTimer = 1.0 / effectiveFireRate;
    return false;
  }
}
