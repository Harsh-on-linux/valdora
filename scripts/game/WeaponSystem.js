/**
 * WeaponSystem — Player Ordnance Controller & Multi-Weapon Arsenal
 * Features:
 * - Deterministic weapon cooldown & cadence timers (fixed 60Hz update)
 * - Multi-weapon cycling (Q/E or 1-4 hotkeys) with HUD state sync
 * - GAU-22 Vulcan Rotary Cannon (Rapid kinetic twin-barrel alternating fire)
 * - MK-44 Flak Cannon (5-way high-impact multi-directional crowd control spread)
 * - Velocity inheritance & ballistic micro-spread dispersion
 * - Real-time integration with TacticalHUDOverlay (Ammo capacitor & Thermal heat)
 * - Procedural muzzle flash flare, propellant spark bursts & audio synthesis triggers
 */

import { WEAPON_TYPES, getWeaponById } from './drones.js';
import { PROJECTILE_TYPES } from './ProjectilePool.js';

export const WEAPON_ORDER = ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'];

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

    // Hold-to-charge mechanics (Orbital Strike & superweapons)
    this.chargeTime = 0;
    this.maxChargeTime = 0.95; // ~0.95s hold to lock satellite uplink
    this.isCharging = false;
    this.chargeRatio = 0.0;

    // Weapon parameters (scaled by drone stats)
    this.baseFireRate = 9.5; // Rounds per second (Hz)
    this.fireRateMultiplier = 1.0;
    this.projectileSpeed = 920; // px/s
    this.spread = 0.025; // Radians (+/- 1.4 degrees dispersion)
    this.damage = 15;
    this.heatPerShot = 3.0;
    this.ammoPerShot = 1.6;
    this.recoilImpulse = 0.5; // Screen shake per shot

    this.setWeapon(initialWeaponId);
  }

  /**
   * Configure active weapon and reset parameters & cooldowns.
   * @param {string} weaponId
   */
  setWeapon(weaponId) {
    const config = getWeaponById(weaponId) || WEAPON_TYPES.VULCAN;
    this.activeWeaponId = config.id;
    this.weaponConfig = config;

    // Reset hold-to-charge states
    this.chargeTime = 0;
    this.isCharging = false;
    this.chargeRatio = 0.0;

    // Apply baseline weapon archetype parameters
    switch (this.weaponConfig.id) {
      case 'VULCAN':
      default:
        this.baseFireRate = 12.0; // High sustained kinetic stream
        this.projectileSpeed = 1050;
        this.spread = 0.018;
        this.damage = 18.5; // Reduced by 15% from 22.0 (twin salvo = 37 dmg)
        this.heatPerShot = 1.8; // Generates ~21.6 heat/sec (overheats after ~4.5s of continuous fire)
        this.ammoPerShot = 0.5; // High energy efficiency
        this.recoilImpulse = 0.5;
        break;

      case 'FLAK':
        this.baseFireRate = 3.4; // Multi-directional crowd control spread
        this.projectileSpeed = 780;
        this.spread = 0.28;
        this.damage = 28; // 5 pellets = 140 max point-blank damage
        this.heatPerShot = 14.0; // Generates ~47.6 heat/sec (overheats after ~2.0s / 7 salvos)
        this.ammoPerShot = 4.0;
        this.recoilImpulse = 2.0;
        break;

      case 'LASER':
        this.baseFireRate = 10.5; // Precision pulsed beam lance
        this.projectileSpeed = 1800;
        this.spread = 0.0;
        this.damage = 16; // Multi-target piercing
        this.heatPerShot = 7.2; // Generates ~75.6 heat/sec (overheats after ~1.3s of continuous beam)
        this.ammoPerShot = 2.4; // Energy-intensive
        this.recoilImpulse = 0.2;
        break;

      case 'HELLFIRE':
        this.baseFireRate = 2.0; // Rapid micro-swarm guided salvo
        this.projectileSpeed = 380; // Initial booster ignition speed (accelerates to 840 px/s)
        this.spread = 0.22; // Diverging lateral flare on launch
        this.damage = 95; // High alpha explosive warhead
        this.heatPerShot = 15.0; // Generates ~30 heat/sec
        this.ammoPerShot = 5.0;
        this.recoilImpulse = 2.4;
        break;

      case 'ORBITAL':
        this.baseFireRate = 0.75; // Heavy tactical satellite bombardment
        this.projectileSpeed = 3200;
        this.spread = 0.0;
        this.damage = 450; // Superweapon class devastation
        this.heatPerShot = 36.0; // High thermal footprint
        this.ammoPerShot = 22.0; // Major satellite capacitor drain
        this.recoilImpulse = 9.0;
        break;
    }

    this.fireTimer = 0;
  }

  /**
   * Cycle weapon forward (+1) or backward (-1).
   * @param {number} [direction=1]
   * @param {Array<string>} [allowedWeapons=null]
   * @returns {string} New active weapon ID
   */
  cycleWeapon(direction = 1, allowedWeapons = null) {
    const list = (allowedWeapons && allowedWeapons.length > 0) ? allowedWeapons : WEAPON_ORDER;
    const currentId = this.activeWeaponId;
    let idx = list.indexOf(currentId);
    if (idx === -1) idx = 0;

    const nextIdx = (idx + direction + list.length) % list.length;
    this.setWeapon(list[nextIdx]);
    return this.activeWeaponId;
  }

  /**
   * Select weapon by 1-based slot index (1=VULCAN, 2=FLAK, 3=LASER, 4=HELLFIRE, 5=ORBITAL).
   * @param {number} slotNumber
   * @param {Array<string>} [allowedWeapons=null]
   * @returns {string} New active weapon ID
   */
  selectWeaponSlot(slotNumber, allowedWeapons = null) {
    const list = (allowedWeapons && allowedWeapons.length > 0) ? allowedWeapons : WEAPON_ORDER;
    const idx = Math.max(0, Math.min(list.length - 1, slotNumber - 1));
    if (list[idx]) {
      this.setWeapon(list[idx]);
    }
    return this.activeWeaponId;
  }

  /**
   * Get 1-based index of active weapon slot.
   * @param {Array<string>} [allowedWeapons=null]
   * @returns {number}
   */
  getActiveSlotIndex(allowedWeapons = null) {
    const list = (allowedWeapons && allowedWeapons.length > 0) ? allowedWeapons : WEAPON_ORDER;
    const idx = list.indexOf(this.activeWeaponId);
    return idx >= 0 ? idx + 1 : 1;
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
   * Fixed-timestep update for weapon cooldowns and hold-to-charge mechanics.
   * @param {number} dt
   * @param {import('./PlayerDrone.js').PlayerDrone} [player]
   * @param {import('./ProjectilePool.js').ProjectilePool} [projectilePool]
   * @param {import('./TacticalHUDOverlay.js').TacticalHUDOverlay} [hudOverlay]
   * @param {import('../audio/SoundManager.js').SoundManager} [soundManager]
   * @param {import('./GameEngine.js').GameEngine} [gameEngine]
   * @param {boolean} [isFirePressed=false]
   */
  update(dt, player = null, projectilePool = null, hudOverlay = null, soundManager = null, gameEngine = null, isFirePressed = false) {
    if (this.fireTimer > 0) {
      this.fireTimer = Math.max(0, this.fireTimer - dt);
    }

    // ── THOR ORBITAL STRIKE HOLD-TO-CHARGE MECHANICS ──
    if (this.activeWeaponId === 'ORBITAL') {
      if (isFirePressed) {
        // Prevent charging if in overheat lockout or insufficient capacitor
        if (this.fireTimer > 0 || (hudOverlay && (hudOverlay.isOverheated || hudOverlay.ammo < this.ammoPerShot))) {
          if (this.isCharging) {
            this.isCharging = false;
            this.chargeTime = 0;
            this.chargeRatio = 0;
            if (soundManager && typeof soundManager.playDeny === 'function') {
              soundManager.playDeny();
            }
          }
          return;
        }

        this.isCharging = true;
        this.chargeTime += dt;
        this.chargeRatio = Math.min(1.0, this.chargeTime / this.maxChargeTime);

        // Continuous escalating audio chirp
        if (soundManager && typeof soundManager.playOrbitalCharge === 'function') {
          soundManager.playOrbitalCharge(this.chargeRatio);
        }

        // Micro charging ion sparks at drone hardpoints
        if (projectilePool && player && Math.random() < 0.45) {
          projectilePool.spawnHitSparks(player.x + (Math.random() - 0.5) * 24, player.y - player.radius * 0.7, '#c084fc', 1);
        }

        // Full charge reached: release devastation!
        if (this.chargeTime >= this.maxChargeTime) {
          this.fireOrbitalStrike(player, projectilePool, hudOverlay, soundManager, gameEngine);
          this.isCharging = false;
          this.chargeTime = 0;
          this.chargeRatio = 0;
        }
      } else {
        // Trigger released
        if (this.isCharging) {
          if (this.chargeRatio >= 0.72) {
            // Discharged after reaching sufficient charge threshold
            this.fireOrbitalStrike(player, projectilePool, hudOverlay, soundManager, gameEngine);
          }
          this.isCharging = false;
          this.chargeTime = 0;
          this.chargeRatio = 0;
        }
      }
    } else {
      this.isCharging = false;
      this.chargeTime = 0;
      this.chargeRatio = 0;
    }
  }

  /**
   * Attempt to discharge the active primary weapon.
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {import('./ProjectilePool.js').ProjectilePool} projectilePool
   * @param {import('./TacticalHUDOverlay.js').TacticalHUDOverlay} hudOverlay
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @returns {boolean} true if shot was discharged
   */
  fire(player, projectilePool, hudOverlay, soundManager, gameEngine) {
    // 1. Check cooldown
    if (this.fireTimer > 0) return false;

    // 2. Check thermal & capacitor allowance
    if (hudOverlay) {
      const allowed = hudOverlay.registerFire(this.heatPerShot, this.ammoPerShot);
      if (!allowed) {
        this.fireTimer = 0.15; // Prevent warning spam every tick
        return false;
      }
    }

    // 3. Obtain world muzzle positions from drone geometry
    const muzzles = player.getWeaponMuzzlePositions();
    if (!muzzles || muzzles.length === 0) return false;

    const droneThermal = player.config?.thermal || { core: '#2dd4dc', glow: 'rgba(45, 212, 220, 0.6)' };
    const effectiveFireRate = this.baseFireRate * this.fireRateMultiplier;

    // ══════════════════════════════════════════════════════════════
    // WEAPON 1: GAU-22 VULCAN ROTARY CANNON (Dual Linked Kinetic Slugs)
    // ══════════════════════════════════════════════════════════════
    if (this.activeWeaponId === 'VULCAN') {
      // Fire from both wing hardpoints simultaneously for heavy kinetic punch
      for (let m = 0; m < muzzles.length; m++) {
        const muzzle = muzzles[m];
        const spreadAngle = (Math.random() - 0.5) * this.spread;
        const baseAngle = -Math.PI / 2 + spreadAngle;

        const vx = Math.cos(baseAngle) * this.projectileSpeed + player.vx * 0.18;
        const vy = Math.sin(baseAngle) * this.projectileSpeed;

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
          radius: 3.6,
          length: 26,
          width: 3.4,
          color: droneThermal.core || '#2dd4dc',
          glowColor: droneThermal.glow || 'rgba(45, 212, 220, 0.65)',
          coreColor: '#ffffff',
          lifetime: 2.2,
          penetration: 1
        });

        projectilePool.spawnMuzzleFlash(
          muzzle.x,
          muzzle.y,
          droneThermal.core || '#2dd4dc',
          16,
          -Math.PI / 2
        );
      }

      if (soundManager && typeof soundManager.playVulcanFire === 'function') {
        soundManager.playVulcanFire(this.barrelIndex);
      }
      this.barrelIndex = (this.barrelIndex + 1) % muzzles.length;

      if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
        gameEngine.addCameraShake(this.recoilImpulse);
      }

      this.fireTimer = 1.0 / effectiveFireRate;
      return true;
    }

    // ══════════════════════════════════════════════════════════════
    // WEAPON 2: MK-44 FLAK CANNON (5-Way Explosive Fan Spread)
    // ══════════════════════════════════════════════════════════════
    if (this.activeWeaponId === 'FLAK') {
      // 5-way spread angles in radians: [-16°, -8°, 0°, +8°, +16°]
      const spreadAngles = [-0.28, -0.14, 0.0, 0.14, 0.28];
      const flakColor = '#ff9e1b';
      const flakGlow = 'rgba(255, 158, 27, 0.75)';

      // Calculate center launch origin from muzzles
      let avgX = 0;
      let avgY = 0;
      for (let m = 0; m < muzzles.length; m++) {
        avgX += muzzles[m].x;
        avgY += muzzles[m].y;
      }
      avgX /= muzzles.length;
      avgY /= muzzles.length;

      // Spawn all 5 flak pellets in multi-directional fan
      for (let i = 0; i < spreadAngles.length; i++) {
        const angleOffset = spreadAngles[i] + (Math.random() - 0.5) * 0.035;
        const baseAngle = -Math.PI / 2 + angleOffset;
        const pelletSpeed = this.projectileSpeed + (Math.random() - 0.5) * 50;

        // Slight horizontal origin offset to match wing guns
        const originMuzzle = muzzles[i % muzzles.length] || { x: avgX, y: avgY };

        const vx = Math.cos(baseAngle) * pelletSpeed + player.vx * 0.12;
        const vy = Math.sin(baseAngle) * pelletSpeed;

        projectilePool.spawn({
          owner: 'player',
          type: PROJECTILE_TYPES.FLAK,
          x: originMuzzle.x,
          y: originMuzzle.y,
          prevX: originMuzzle.x,
          prevY: originMuzzle.y,
          vx: vx,
          vy: vy,
          speed: pelletSpeed,
          damage: this.damage,
          radius: 4.5,
          length: 16,
          width: 4.5,
          color: flakColor,
          glowColor: flakGlow,
          coreColor: '#ffffff',
          lifetime: 1.35,
          penetration: 1
        });
      }

      // Heavy explosive muzzle blasts at all hardpoints
      for (let m = 0; m < muzzles.length; m++) {
        projectilePool.spawnMuzzleFlash(
          muzzles[m].x,
          muzzles[m].y,
          flakColor,
          22,
          -Math.PI / 2
        );
        projectilePool.spawnHitSparks(muzzles[m].x, muzzles[m].y, flakColor, 6);
      }

      // Play MK-44 Flak audio report
      if (soundManager && typeof soundManager.playFlakFire === 'function') {
        soundManager.playFlakFire();
      }

      // Concussive camera recoil kick
      if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
        gameEngine.addCameraShake(this.recoilImpulse);
      }

      this.fireTimer = 1.0 / effectiveFireRate;
      return true;
    }

    // ══════════════════════════════════════════════════════════════
    // WEAPON 3: ATHENA BEAM (High-Velocity Piercing Energy Lance)
    // ══════════════════════════════════════════════════════════════
    if (this.activeWeaponId === 'LASER') {
      const muzzleIdx = this.barrelIndex % muzzles.length;
      const muzzle = muzzles[muzzleIdx];
      this.barrelIndex = (this.barrelIndex + 1) % muzzles.length;

      const laserColor = '#c084fc'; // Energetic royal purple/violet
      const laserGlow = 'rgba(192, 132, 252, 0.85)';
      const laserCore = '#ffffff';

      const baseAngle = -Math.PI / 2;
      const vx = Math.cos(baseAngle) * this.projectileSpeed + player.vx * 0.08;
      const vy = Math.sin(baseAngle) * this.projectileSpeed;

      projectilePool.spawn({
        owner: 'player',
        type: PROJECTILE_TYPES.LASER,
        x: muzzle.x,
        y: muzzle.y,
        prevX: muzzle.x,
        prevY: muzzle.y,
        vx: vx,
        vy: vy,
        speed: this.projectileSpeed,
        damage: this.damage,
        radius: 3.8,
        length: 54,
        width: 3.4,
        color: laserColor,
        glowColor: laserGlow,
        coreColor: laserCore,
        lifetime: 1.6,
        penetration: 3,
        hitsRemaining: 3
      });

      // Ionizing beam needle flash at hardpoint
      projectilePool.spawnMuzzleFlash(
        muzzle.x,
        muzzle.y,
        laserColor,
        18,
        -Math.PI / 2
      );

      // Trailing energetic ionization spark
      projectilePool.spawnHitSparks(muzzle.x, muzzle.y, '#e879f9', 3);

      if (soundManager && typeof soundManager.playLaserFire === 'function') {
        soundManager.playLaserFire(muzzleIdx);
      }

      if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
        gameEngine.addCameraShake(this.recoilImpulse);
      }

      this.fireTimer = 1.0 / effectiveFireRate;
      return true;
    }

    // ══════════════════════════════════════════════════════════════
    // WEAPON 4: HELLFIRE SWARM (Heavy Armor-Piercing Micro-Missiles)
    // ══════════════════════════════════════════════════════════════
    if (this.activeWeaponId === 'HELLFIRE') {
      const missileColor = '#ff003c';
      const missileGlow = 'rgba(255, 0, 60, 0.85)';
      const missileCore = '#ffeedd';
      const targets = hudOverlay ? hudOverlay.targets : [];

      // Find locked target or nearest active hostile
      let primaryTarget = null;
      if (hudOverlay && hudOverlay.lockedTargetId) {
        primaryTarget = targets.find(t => t && t.id === hudOverlay.lockedTargetId && t.hull > 0) || null;
      }
      if (!primaryTarget && targets.length > 0) {
        const livingTargets = targets.filter(t => t && t.hull > 0);
        if (livingTargets.length > 0) {
          primaryTarget = livingTargets[0];
        }
      }

      // Fire paired micro-missiles from both wing hardpoints simultaneously
      for (let m = 0; m < muzzles.length; m++) {
        const muzzle = muzzles[m];
        // Diverging lateral flare angle: left hardpoint flares left, right hardpoint flares right
        const flareSign = m === 0 ? -1 : 1;
        const flareAngle = flareSign * (0.16 + Math.random() * 0.06);
        const baseAngle = -Math.PI / 2 + flareAngle;

        const vx = Math.cos(baseAngle) * this.projectileSpeed + player.vx * 0.15;
        const vy = Math.sin(baseAngle) * this.projectileSpeed;

        // Alternate targets if multiple targets exist
        let assignedTarget = primaryTarget;
        if (targets.length > 1 && m > 0) {
          const altTarget = targets.find(t => t && t.hull > 0 && t !== primaryTarget);
          if (altTarget) assignedTarget = altTarget;
        }

        projectilePool.spawn({
          owner: 'player',
          type: PROJECTILE_TYPES.HELLFIRE,
          x: muzzle.x,
          y: muzzle.y,
          prevX: muzzle.x,
          prevY: muzzle.y,
          vx: vx,
          vy: vy,
          speed: this.projectileSpeed,
          damage: this.damage,
          radius: 5.5,
          length: 28,
          width: 5.5,
          color: missileColor,
          glowColor: missileGlow,
          coreColor: missileCore,
          lifetime: 3.0,
          penetration: 1,
          hitsRemaining: 1,
          target: assignedTarget,
          targetId: assignedTarget ? assignedTarget.id : null,
          homingTurnRate: 6.0,
          acceleration: 1150,
          maxSpeed: 840,
          blastRadius: 85,
          stage: 0,
          rotation: baseAngle
        });

        // Rocket backblast flash & propellant flare at launcher
        projectilePool.spawnMuzzleFlash(
          muzzle.x,
          muzzle.y,
          '#ff9e1b',
          22,
          -Math.PI / 2
        );
        projectilePool.spawnHitSparks(muzzle.x, muzzle.y, '#ff9e1b', 8);

        // Initial launcher exhaust smoke puff
        if (typeof projectilePool.spawnSmoke === 'function') {
          projectilePool.spawnSmoke(muzzle.x, muzzle.y + 4, (Math.random() - 0.5) * 20, Math.random() * 30 + 10, '#ff003c', '#ff9e1b', 3, 14, 0.35);
        }
      }

      if (soundManager && typeof soundManager.playHellfireFire === 'function') {
        soundManager.playHellfireFire();
      }

      if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
        gameEngine.addCameraShake(this.recoilImpulse);
      }

      this.fireTimer = 1.0 / effectiveFireRate;
      return true;
    }

    // ══════════════════════════════════════════════════════════════
    // WEAPON 5: THOR ORBITAL KINETIC STRIKE BEAM (Hold-To-Charge Superweapon)
    // ══════════════════════════════════════════════════════════════
    if (this.activeWeaponId === 'ORBITAL') {
      if (this.fireTimer > 0) return false;
      if (hudOverlay && (hudOverlay.isOverheated || hudOverlay.ammo < this.ammoPerShot)) {
        if (soundManager && typeof soundManager.playDeny === 'function') soundManager.playDeny();
        return false;
      }
      this.isCharging = true;
      return true;
    }

    // Default fallback (single shot)
    this.fireTimer = 1.0 / effectiveFireRate;
    return false;
  }

  /**
   * Discharge the full-charge Thor Orbital Kinetic Strike from satellite constellation.
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {import('./ProjectilePool.js').ProjectilePool} projectilePool
   * @param {import('./TacticalHUDOverlay.js').TacticalHUDOverlay} hudOverlay
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @returns {boolean}
   */
  fireOrbitalStrike(player, projectilePool, hudOverlay, soundManager, gameEngine) {
    if (!projectilePool) return false;

    // Register heat & capacitor consumption
    if (hudOverlay) {
      const allowed = hudOverlay.registerFire(this.heatPerShot, this.ammoPerShot);
      if (!allowed) {
        if (soundManager && typeof soundManager.playDeny === 'function') soundManager.playDeny();
        this.fireTimer = 0.3;
        return false;
      }
    }

    const screenW = gameEngine ? gameEngine.width : 500;
    const screenH = gameEngine ? gameEngine.height : 1200;

    // Target coordinate: align with player or locked target
    let targetX = player ? player.x : screenW * 0.5;
    if (hudOverlay && hudOverlay.lockedTargetId && hudOverlay.targets) {
      const lTgt = hudOverlay.targets.find(t => t && t.id === hudOverlay.lockedTargetId && t.hull > 0);
      if (lTgt) {
        targetX = lTgt.relX !== undefined ? (lTgt.relX * screenW) : (lTgt.x || targetX);
      }
    }

    const effectiveFireRate = this.baseFireRate * this.fireRateMultiplier;

    // 1. Spawn devastating vertical orbital kinetic strike beam
    projectilePool.spawn({
      owner: 'player',
      type: PROJECTILE_TYPES.ORBITAL,
      x: targetX,
      y: 0,
      prevX: targetX,
      prevY: 0,
      vx: 0,
      vy: 0,
      speed: this.projectileSpeed,
      damage: this.damage,
      radius: 36,
      width: 74,
      length: screenH,
      color: '#a78bfa',
      glowColor: 'rgba(167, 139, 250, 0.95)',
      coreColor: '#ffffff',
      lifetime: 0.55,
      penetration: 999,
      hitsRemaining: 999,
      blastRadius: 140
    });

    // 2. High-orbit satellite injection entry flash & ground impact burst
    const groundY = player ? player.y : screenH * 0.75;
    projectilePool.spawnMuzzleFlash(targetX, 0, '#ffffff', 50, Math.PI / 2);
    projectilePool.spawnMuzzleFlash(targetX, groundY, '#a78bfa', 44, -Math.PI / 2);
    projectilePool.spawnHitSparks(targetX, groundY, '#ffffff', 14);
    projectilePool.spawnHitSparks(targetX, groundY, '#c084fc', 18);

    // 3. Play thunderous orbital strike sound
    if (soundManager && typeof soundManager.playOrbitalStrike === 'function') {
      soundManager.playOrbitalStrike();
    }

    // 4. Heavy concussive camera shake
    if (gameEngine && typeof gameEngine.addCameraShake === 'function') {
      gameEngine.addCameraShake(this.recoilImpulse);
    }

    this.fireTimer = 1.0 / effectiveFireRate;
    return true;
  }

  /**
   * Render active hold-to-charge targeting reticle and telemetry overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {number} width
   * @param {number} height
   */
  render(ctx, player, width, height) {
    if (this.activeWeaponId !== 'ORBITAL' || !this.isCharging || !player) return;

    const ratio = this.chargeRatio || 0;
    const targetX = player.x;
    const targetY = Math.max(70, player.y - 200);

    ctx.save();

    // 1. Collimated Guide Targeting Laser (Pulsing dashed cyan/violet beam to top of screen)
    ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 + ratio * 0.6})`;
    ctx.lineWidth = 1.5 + ratio * 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - (player.radius || 24));
    ctx.lineTo(player.x, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Tactical Diamond Targeting Reticle
    const isLocked = ratio >= 0.95;
    const boxSize = 28 - ratio * 10; // Box tightens as orbital lock approaches

    ctx.strokeStyle = isLocked ? '#ffffff' : '#a78bfa';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(targetX - boxSize, targetY - boxSize, boxSize * 2, boxSize * 2);

    // Center Crosshair Dot
    ctx.fillStyle = isLocked ? '#ffffff' : '#00f0ff';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Rotating Satellite Downlink Locking Brackets
    ctx.save();
    ctx.translate(targetX, targetY);
    ctx.rotate(Date.now() * 0.005);
    ctx.strokeStyle = isLocked ? '#00f0ff' : 'rgba(192, 132, 252, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, boxSize + 9, 0, Math.PI * 0.5);
    ctx.arc(0, 0, boxSize + 9, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    // 4. Circular Charge Progress Gauge
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, boxSize + 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isLocked ? '#00f0ff' : '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, boxSize + 16, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.stroke();

    // 5. Holographic Satellite Telemetry Callout Badge
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pct = Math.round(ratio * 100);
    const badgeText = isLocked ? '⚡ THOR KINETIC STRIKE LOCKED' : `⬡ SATELLITE UPLINK: ${pct}%`;
    const textW = ctx.measureText(badgeText).width;

    ctx.fillStyle = 'rgba(5, 7, 10, 0.85)';
    ctx.strokeStyle = isLocked ? 'rgba(0, 240, 255, 0.8)' : 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(targetX - textW / 2 - 8, targetY - boxSize - 20, textW + 16, 16);
    ctx.strokeRect(targetX - textW / 2 - 8, targetY - boxSize - 20, textW + 16, 16);

    ctx.fillStyle = isLocked ? '#00f0ff' : '#c084fc';
    ctx.fillText(badgeText, targetX, targetY - boxSize - 12);

    ctx.restore();
  }
}
