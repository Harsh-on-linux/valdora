/**
 * Space Shooter — Core Fixed-Timestep Game Engine
 * Features:
 * - Deterministic fixed-timestep update loop (60Hz / 16.66ms) with accumulator
 * - Frame interpolation alpha factor for ultra-smooth 60+ FPS visual rendering
 * - Integrated Tactical Satellite / FLIR Map Layer
 * - Camera transformation with 2D screen shake offset
 * - High-DPI canvas buffer synchronization
 * - Lifecycle state machine (STOPPED, RUNNING, PAUSED, VICTORY, GAMEOVER)
 * - Real-time performance profiling (FPS, frame time, tick telemetry)
 * - Extensible entity collections for player, ordnance, targets, and FX
 */

import { TacticalMapLayer } from './TacticalMapLayer.js';
import { getLevelById, calculateStars } from './levels.js';
import { getDroneById, getWeaponById } from './drones.js';
import { InputManager } from './InputManager.js';
import { PlayerDrone } from './PlayerDrone.js';
import { TacticalHUDOverlay, RADAR_MODES } from './TacticalHUDOverlay.js';
import { ProjectilePool } from './ProjectilePool.js';
import { WeaponSystem } from './WeaponSystem.js';
import { EnemyPool } from './EnemyPool.js';
import { PickupPool } from './PickupPool.js';
import { WaveRunner } from './WaveRunner.js';
import { CollisionSystem } from './CollisionSystem.js';
import { HVTWarningSequence } from './HVTWarningSequence.js';
import { soundManager } from '../audio/index.js';

export const ENGINE_STATE = {
  STOPPED: 'STOPPED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  VICTORY: 'VICTORY',
  GAMEOVER: 'GAMEOVER'
};

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Timing & Fixed-Timestep parameters
    this.fixedDt = 1 / 60; // 16.666ms fixed simulation tick
    this.maxAccumulator = 0.25; // Clamps delta time to prevent spiral of death
    this.accumulator = 0;
    this.lastTime = 0;
    this.simTime = 0;
    this.tickCount = 0;
    this.renderCount = 0;

    // Performance telemetry
    this.fps = 60;
    this.frameTime = 16.6;
    this._fpsFrames = 0;
    this._fpsLastUpdate = 0;

    // Viewport & DPI
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // State
    this.state = ENGINE_STATE.STOPPED;
    this.animationFrameId = null;

    // Camera & Screen Shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;
    this.cameraShakeX = 0;
    this.cameraShakeY = 0;

    // Tactical Layers & Entities
    this.tacticalMap = new TacticalMapLayer();
    this.input = new InputManager();
    this.player = new PlayerDrone();
    this.projectiles = new ProjectilePool(300);
    this.weapons = new WeaponSystem('VULCAN');
    this.enemies = new EnemyPool(40);
    this.pickups = new PickupPool(64);
    this.waveRunner = new WaveRunner();
    this.hudOverlay = new TacticalHUDOverlay();
    this.hvtWarning = new HVTWarningSequence();
    this.collisions = new CollisionSystem({ cellSize: 80, debug: false });

    this.waveRunner.on('stageComplete', (data) => {
      this.state = ENGINE_STATE.VICTORY;
      this._emit('stateChange', this.state);
      if (soundManager && typeof soundManager.playVictory === 'function') {
        soundManager.playVictory();
      }
    });

    this.isObjectiveMet = false;
    this.waveRunner.on('missionCompletedChoice', (data) => {
      this.isObjectiveMet = true;
      const sectorId = this.sectorConfig?.id || 1;
      const stars = calculateStars(sectorId, this.score);
      SaveManager.recordSectorVictory(sectorId, this.score, stars);
      this._emit('missionCompletedChoice', {
        ...data,
        sectorId,
        nextSectorId: sectorId + 1,
        score: this.score,
        stars
      });
    });

    this.sectorConfig = null;
    this.droneConfig = null;
    this.weaponConfig = null;

    // Game stats
    this.score = 0;
    this.hull = 100;
    this.maxHull = 100;
    this.shield = 100;
    this.maxShield = 100;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageTaken = 0;
    this.pickupsCollected = 0;

    // Dynamic HUD auto-hide tracking (hidden by default)
    this.isPlayerMoving = false;
    this.stationaryTimer = 0;
    this.panelsEnabled = false;
    this.hudHidden = true;

    // Mobile / Touch Virtual Joystick Onboarding Visual Cue Timer (1.4s)
    this.joystickHintTimer = 1.4;

    // Listener callbacks
    this.listeners = {
      stateChange: [],
      telemetry: [],
      hudVisibilityChange: []
    };

    this._boundLoop = this._loop.bind(this);
    this._boundResize = this.resize.bind(this);
    this._boundRadarToggle = () => this.toggleRadarMode();
    this._boundPanelsToggle = () => this.toggleHudPanels();
    this._boundDebugToggle = () => this.toggleCollisionDebug();
    this._boundWeaponCycle = (e) => this.cycleWeapon(e.detail?.direction || 1);
    this._boundWeaponSlot = (e) => this.selectWeaponSlot(e.detail?.slot || 1);

    window.addEventListener('resize', this._boundResize);
    window.addEventListener('radar:toggle', this._boundRadarToggle);
    window.addEventListener('panels:toggle', this._boundPanelsToggle);
    window.addEventListener('collision:toggleDebug', this._boundDebugToggle);
    window.addEventListener('weapon:cycle', this._boundWeaponCycle);
    window.addEventListener('weapon:selectSlot', this._boundWeaponSlot);
    this.resize();
  }

  /**
   * Register state or telemetry change listeners.
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return this;
  }

  /**
   * Unregister listener.
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    return this;
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        this.listeners[event][i](data);
      }
    }
  }

  /**
   * Synchronize canvas backing store with CSS viewport dimensions.
   */
  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (this.canvas) {
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }
  }

  /**
   * Start or restart gameplay simulation.
   * @param {Object} [config]
   */
  start(config = {}) {
    const sectorId = config.sector || 1;
    const droneId = config.drone || 'STRIKER';
    const weaponId = config.weapon || 'VULCAN CANNON';

    this.sectorConfig = getLevelById(sectorId) || { id: sectorId, name: `SECTOR ${sectorId}` };
    this.droneConfig = getDroneById(droneId);
    this.weaponConfig = getWeaponById(weaponId);
    this.isObjectiveMet = false;

    // Initialize player drone archetype and position
    this.player.applyArchetype(droneId);
    const startX = this.width / 2;
    const startY = this.height * 0.82;
    // Initialize fresh weapon system with loadout & drone multipliers
    this.weapons = new WeaponSystem(this.weaponConfig ? this.weaponConfig.id : weaponId);
    this.weapons.applyDroneModifiers(this.droneConfig);

    // Clear projectile and particle pools
    this.projectiles.clear();

    // Clear pickups
    if (this.pickups) {
      this.pickups.clear();
    }

    // Clear and initialize hostile target pool & wave runner
    if (this.enemies) {
      this.enemies.clear();
      if (this.waveRunner) {
        this.waveRunner.loadSector(sectorId, this.sectorConfig);
      } else {
        this._spawnInitialCombatWave(sectorId);
      }
    }

    this.score = 0;
    this.hull = this.player.hull;
    this.maxHull = this.player.maxHull;
    this.shield = this.player.shield;
    this.maxShield = this.player.maxShield;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageTaken = 0;
    this.pickupsCollected = 0;

    // Attach input handlers to canvas
    this.input.attach(this.canvas);

    this.accumulator = 0;
    this.simTime = 0;
    this.tickCount = 0;
    this.renderCount = 0;
    this._fpsFrames = 0;
    this._fpsLastUpdate = performance.now();
    this.lastTime = performance.now();

    this.isPlayerMoving = false;
    this.stationaryTimer = 0;
    this.panelsEnabled = false;
    this.hudHidden = true;
    this.joystickHintTimer = 1.4; // 1.4s onboarding visual cue for mobile touch flight
    this._emit('hudVisibilityChange', {
      hudHidden: true,
      panelsEnabled: false,
      isMoving: false,
      stationaryTimer: 0
    });

    this.state = ENGINE_STATE.RUNNING;
    this._emit('stateChange', this.state);

    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this._boundLoop);
    }

    console.log(`🎮 GameEngine started: Sector ${sectorId} (${this.sectorConfig.name}), Drone: ${droneId}, Input: ${this.input.getEffectiveControlScheme()}`);
  }

  /**
   * Pause the active simulation loop.
   */
  pause() {
    if (this.state === ENGINE_STATE.RUNNING) {
      this.state = ENGINE_STATE.PAUSED;
      if (this.hudHidden) {
        this.hudHidden = false;
        this._emit('hudVisibilityChange', {
          hudHidden: false,
          isMoving: false,
          stationaryTimer: this.stationaryTimer
        });
      }
      this._emit('stateChange', this.state);
      console.log('⏸️ GameEngine — Simulation paused.');
    }
  }

  /**
   * Resume active simulation loop.
   */
  resume() {
    if (this.state === ENGINE_STATE.PAUSED) {
      this.state = ENGINE_STATE.RUNNING;
      this.lastTime = performance.now();
      this.accumulator = 0;
      this.joystickHintTimer = 1.0; // Refresh hint briefly on resume
      this._emit('stateChange', this.state);
      console.log('▶️ GameEngine — Simulation resumed.');
    }
  }

  /**
   * Terminate simulation and cancel animation loops.
   */
  stop() {
    this.state = ENGINE_STATE.STOPPED;
    this.input.detach();
    if (this.hudHidden) {
      this.hudHidden = false;
      this._emit('hudVisibilityChange', {
        hudHidden: false,
        isMoving: false,
        stationaryTimer: this.stationaryTimer
      });
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this._emit('stateChange', this.state);
    console.log('⏹️ GameEngine — Simulation stopped.');
  }

  /**
   * Trigger screen shake impulse.
   * @param {number} intensity - Shake magnitude in pixels
   * @param {number} [decay=0.92] - Decay factor per tick
   */
  addCameraShake(intensity = 8, decay = 0.92) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 40);
    this.shakeDecay = decay;
  }

  /**
   * Alias for addCameraShake with intensity and decay options.
   * @param {number} [intensity=10]
   * @param {number} [decay=0.92]
   */
  shake(intensity = 10, decay = 0.92) {
    this.addCameraShake(intensity, decay);
  }

  /**
   * Master RequestAnimationFrame Loop with Fixed-Timestep Accumulator.
   */
  _loop(timestamp) {
    if (this.state === ENGINE_STATE.STOPPED) {
      this.animationFrameId = null;
      return;
    }

    const now = timestamp || performance.now();
    let frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Safety clamp against huge frame jumps (e.g. background tab return)
    if (frameDt > this.maxAccumulator) {
      frameDt = this.maxAccumulator;
    }

    // Profile FPS & FrameTime
    this._fpsFrames++;
    if (now - this._fpsLastUpdate >= 500) {
      this.fps = Math.round((this._fpsFrames * 1000) / (now - this._fpsLastUpdate));
      this.frameTime = Number((frameDt * 1000).toFixed(1));
      this._fpsFrames = 0;
      this._fpsLastUpdate = now;
      this._emit('telemetry', this.getTelemetry());
    }

    // Fixed-timestep simulation tick update
    if (this.state === ENGINE_STATE.RUNNING) {
      this.accumulator += frameDt;
      while (this.accumulator >= this.fixedDt) {
        this.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
        this.tickCount++;
        this.simTime += this.fixedDt;
      }
    }

    // Interpolation factor between simulation ticks
    const alpha = this.fixedDt > 0 ? this.accumulator / this.fixedDt : 1.0;

    // Render pass
    this.render(alpha);
    this.renderCount++;

    this.animationFrameId = requestAnimationFrame(this._boundLoop);
  }

  /**
   * Fixed-timestep physics and logic updates (60 Hz).
   * @param {number} dt - Fixed delta time (0.016666s)
   */
  update(dt) {
    // 1. Update Camera Screen Shake
    if (this.shakeIntensity > 0.05) {
      this.cameraShakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.cameraShakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.cameraShakeX = 0;
      this.cameraShakeY = 0;
      this.shakeIntensity = 0;
    }

    // 2. Update Tactical Map & Satellite Layer
    this.tacticalMap.update(dt, 1.0);

    // 3. Update Player Drone Movement & Dynamics
    this.player.update(dt, this.input, this.width, this.height);

    // Dynamic HUD auto-hide calculation:
    // User is moving if movement input is active OR drone physics speed > 15px/s
    const move = this.input ? this.input.getMovementVector() : { x: 0, y: 0 };
    const inputMoving = Math.abs(move.x) > 0.05 || Math.abs(move.y) > 0.05;
    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    const isMoving = inputMoving || playerSpeed > 15;

    if (isMoving) {
      this.isPlayerMoving = true;
      this.stationaryTimer = 0;
    } else {
      this.isPlayerMoving = false;
      this.stationaryTimer += dt;
    }

    // Determine HUD visibility:
    // If level ended (VICTORY / GAMEOVER), show full HUD.
    // When running:
    //   - If moving: hide bulky panels
    //   - If stationary >= 2.0s and panels are enabled: reveal panels
    //   - If panels are disabled: remain hidden
    const isLevelEnded = this.state === ENGINE_STATE.VICTORY || this.state === ENGINE_STATE.GAMEOVER;
    let shouldHideHud = true;

    if (isLevelEnded) {
      shouldHideHud = false;
    } else if (this.state === ENGINE_STATE.RUNNING) {
      if (this.isPlayerMoving) {
        shouldHideHud = true;
      } else if (this.panelsEnabled && this.stationaryTimer >= 2.0) {
        shouldHideHud = false;
      } else if (!this.panelsEnabled) {
        shouldHideHud = true;
      } else {
        shouldHideHud = this.hudHidden;
      }
    } else {
      shouldHideHud = false;
    }

    if (this.hudHidden !== shouldHideHud) {
      this.hudHidden = shouldHideHud;
      this._emit('hudVisibilityChange', {
        hudHidden: shouldHideHud,
        panelsEnabled: this.panelsEnabled,
        isMoving: this.isPlayerMoving,
        stationaryTimer: this.stationaryTimer
      });
    }

    // 3.5. Update Touch Joystick Onboarding Cue Timer
    if (this.input && this.input.touchJoystick && this.input.touchJoystick.active) {
      this.joystickHintTimer = 0;
    } else if (this.joystickHintTimer > 0) {
      this.joystickHintTimer = Math.max(0, this.joystickHintTimer - dt);
    }

    // 4. Update Weapon Cooldowns, Hold-To-Charge & Handle Live Firing
    const isFiring = this.input.isActionActive('fire');
    this.weapons.update(dt, this.player, this.projectiles, this.hudOverlay, soundManager, this, isFiring);
    if (isFiring) {
      this.weapons.fire(this.player, this.projectiles, this.hudOverlay, soundManager, this);
    }

    // 4.5. Update Hostile Target Pool & Base Target AI Lifecycle
    if (this.enemies) {
      this.enemies.update(dt, this.width, this.height, this.player, this.projectiles, soundManager, this);

      // Check for active ECM Jammer disruption
      const hasActiveJammer = this.enemies.getActiveEnemies().some(e => e.type === 'RADAR_JAMMER');
      if (this.hudOverlay) {
        this.hudOverlay.isJammingActive = hasActiveJammer;
      }
    }

    // 4.6. Update Wave Timeline Runner & Mission Orchestration
    if (this.waveRunner) {
      this.waveRunner.update(dt, this, soundManager);
    }

    // 4.7. Update Cinematic HVT Red Alert & Satellite Optical Zoom Sequence
    if (this.hvtWarning) {
      this.hvtWarning.update(dt, this);
    }

    // 4.8. Update Tactical Pickups, Supply Crates & Magnetic Attraction
    if (this.pickups) {
      this.pickups.update(dt, this.width, this.height, this.player);
    }

    // 5. Update Projectiles & Muzzle Flares / Sparks / Guided Munitions
    this.projectiles.update(dt, this.width, this.height, this.hudOverlay ? this.hudOverlay.targets : []);

    // 6. Update Tactical HUD Overlay Simulation & Targets (with HUD auto-hide alpha)
    this.hudOverlay.update(dt, this.player, this.width, this.height, this.hudHidden);

    // 7. Resolve Collisions via Spatial Hash Grid Engine
    if (this.collisions) {
      this.collisions.update(this, dt);
    }

    // 8. Sync player stats with engine stats
    this.hull = this.player.hull;
    this.shield = this.player.shield;

    // 9. Check for player destruction / Mission Compromised
    if (this.state === ENGINE_STATE.RUNNING && this.player.hull <= 0) {
      this.state = ENGINE_STATE.GAMEOVER;
      this.addCameraShake(22);
      if (this.projectiles) {
        this.projectiles.spawnHitSparks(this.player.x, this.player.y, '#ff003c', 36);
        this.projectiles.spawnHitSparks(this.player.x, this.player.y, '#ffb703', 24);
        this.projectiles.spawnHitSparks(this.player.x, this.player.y, '#ffffff', 18);
        this.projectiles.spawnMuzzleFlash(this.player.x, this.player.y, '#ff003c', 40, 0);
      }
      if (soundManager) {
        if (typeof soundManager.playExplosion === 'function') soundManager.playExplosion(2.2);
        if (typeof soundManager.playDefeat === 'function') soundManager.playDefeat();
      }
      this._emit('stateChange', this.state);
    }
  }

  /**
   * Spawn initial tactical targets squad for live combat.
   * @param {number} sectorId
   */
  _spawnInitialCombatWave(sectorId = 1) {
    const w = this.width || window.innerWidth;
    if (!this.enemies) return;

    // Spawn frontline RV-4 Scout reconnaissance buggy V-formation (5 Scouts) in visible sector
    this.enemies.spawnFormation({
      type: 'RECON_BUGGY',
      formation: 'vShape',
      count: 5,
      startX: w * 0.5,
      startY: 90,
      spacingX: 60,
      spacingY: 46
    });

    // Spawn VK-7 Interceptors in pair formation entering with sinusoidal weave
    this.enemies.spawnFormation({
      type: 'INTERCEPTOR',
      formation: 'pair',
      count: 2,
      startX: w * 0.7,
      startY: -40,
      spacingX: 70,
      spacingY: 40
    });

    // Spawn GT-12 Sentinel SAM Turret fortified defense platform
    this.enemies.spawn({
      type: 'SAM_TURRET',
      x: w * 0.82,
      y: -60
    });

    // Staggered scout line entering right behind on left flank
    this.enemies.spawnFormation({
      type: 'RECON_BUGGY',
      formation: 'staggeredLine',
      count: 3,
      startX: w * 0.25,
      startY: -100,
      spacingX: 50,
      spacingY: 50
    });
  }

  /**
   * Render interpolated scene pass.
   * @param {number} alpha - Fractional accumulator progress [0..1]
   */
  render(alpha) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.width;
    const h = this.height;

    ctx.save();
    // High-DPI scale transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear gameplay canvas buffer (alpha transparent so Starfield shows through)
    ctx.clearRect(0, 0, w, h);

    // Apply Camera Shake translation
    if (this.shakeIntensity > 0) {
      ctx.translate(this.cameraShakeX, this.cameraShakeY);
    }

    // 1. Render World Layers with Satellite Camera Zoom
    const isZooming = this.hvtWarning && this.hvtWarning.active;
    const zoom = isZooming ? this.hvtWarning.getZoomFactor() : 1.0;
    const focal = isZooming ? this.hvtWarning.getFocalPoint(w, h) : { x: w * 0.5, y: h * 0.5 };

    ctx.save();
    if (zoom !== 1.0) {
      ctx.translate(focal.x, focal.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-focal.x, -focal.y);
    }

    // 1. Render Tactical Satellite & Topographic Map Layer
    this.tacticalMap.render(ctx, w, h);

    // 2. Render Tactical Pickups, Intel & Supply Crates
    if (this.pickups) {
      this.pickups.render(ctx, alpha);
    }

    // 3. Render Projectiles, Tracers, Muzzle Flares & Propellant Sparks
    this.projectiles.render(ctx, alpha);

    // 4. Render Hostile Target Entities (EnemyPool with FLIR shaders & IFF markers)
    if (this.enemies) {
      this.enemies.render(ctx, alpha, performance.now());
    }

    // 4. Render Player Drone (with sub-frame interpolation and FLIR trails)
    this.player.render(ctx, alpha, w, h);

    // 4.5. Render Active Weapon Targeting Guidance & Hold-To-Charge Reticles
    if (this.weapons && typeof this.weapons.render === 'function') {
      this.weapons.render(ctx, this.player, w, h);
    }

    ctx.restore();

    // 5. Render Tactical HUD Overlay (Reticle, Compass, Radar, Bounding Boxes)
    this.hudOverlay.render(ctx, this.player, w, h);

    // 5.2. Render Tactical Wave Alert Banners & Announcements
    if (this.waveRunner) {
      this.waveRunner.render(ctx, w, h);
    }

    // 5.3. Render HVT Red Alert Warning & Satellite Optic Recon Overlay
    if (this.hvtWarning) {
      this.hvtWarning.render(ctx, w, h);
    }

    // 5.5. Render Virtual Touch Joystick Overlay (when active or onboarding cue)
    this._renderTouchJoystick(ctx);

    // 6. Render Tactical Viewport Watermark & FLIR Crosshair
    this._renderTacticalOverlay(ctx, w, h);

    // 7. Render Collision Hitboxes & Spatial Grid (Debug Overlay when toggled)
    if (this.collisions) {
      this.collisions.renderDebug(ctx, w, h, this.player, this.projectiles, this.hudOverlay ? this.hudOverlay.targets : null, this.enemies);
    }

    ctx.restore();
  }

  /**
   * Render virtual touch joystick HUD element if active or visual onboarding cue.
   */
  _renderTouchJoystick(ctx) {
    const js = this.input ? this.input.getTouchJoystickState() : null;

    // A. Active Player Touch Joystick (real-time vector tracking)
    if (js && js.active) {
      ctx.save();

      // Base Outer Ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(js.baseX, js.baseY, js.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center Cross ticks
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(js.baseX - 12, js.baseY);
      ctx.lineTo(js.baseX + 12, js.baseY);
      ctx.moveTo(js.baseX, js.baseY - 12);
      ctx.lineTo(js.baseX, js.baseY + 12);
      ctx.stroke();

      // Direction Vector Line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(js.baseX, js.baseY);
      ctx.lineTo(js.currentX, js.currentY);
      ctx.stroke();

      // Draggable Knob Outer Ring & Fill
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(js.currentX, js.currentY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner knob core dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(js.currentX, js.currentY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // B. Mobile / Touch Onboarding Joystick Guide (1-sec intro cue on left side)
    const effectiveScheme = this.input ? this.input.getEffectiveControlScheme() : 'keyboard';
    const isMobileOrTouch = this.input?.isTouchDevice || effectiveScheme === 'touch' || this.width <= 768;

    if (this.joystickHintTimer > 0 && isMobileOrTouch) {
      const hintAlpha = Math.min(1.0, this.joystickHintTimer / 0.4);
      const hx = Math.max(75, Math.min(110, this.width * 0.18));
      const hy = this.height - Math.max(110, Math.min(145, this.height * 0.18));
      const radius = 54;

      const timeElapsed = 1.4 - this.joystickHintTimer;
      const pulse = 1.0 + Math.sin(timeElapsed * 7) * 0.06;
      const angle = timeElapsed * 2.2;

      ctx.save();
      ctx.globalAlpha = hintAlpha;

      // 1. Concentric Guide Circles & Radar Ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.beginPath();
      ctx.arc(hx, hy, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating dashed ring
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angle);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. Directional Chevrons (▲ ▼ ◄ ►)
      ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲', hx, hy - radius + 14);
      ctx.fillText('▼', hx, hy + radius - 14);
      ctx.fillText('◄', hx - radius + 14, hy);
      ctx.fillText('►', hx + radius - 14, hy);

      // 3. Animated Floating Center Knob
      const knobBobX = Math.cos(timeElapsed * 4) * 8;
      const knobBobY = Math.sin(timeElapsed * 4) * 8;

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(hx + knobBobX, hy + knobBobY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + knobBobX, hy + knobBobY, 5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Tactical Guidance Callout Badge
      const badgeY = hy - radius - 22;
      ctx.fillStyle = 'rgba(5, 7, 10, 0.85)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1;
      const text = '✜ TOUCH LEFT TO PILOT';
      ctx.font = '9px "Share Tech Mono", monospace';
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(hx - textWidth / 2 - 8, badgeY - 8, textWidth + 16, 16);
      ctx.strokeRect(hx - textWidth / 2 - 8, badgeY - 8, textWidth + 16, 16);

      ctx.fillStyle = '#00f0ff';
      ctx.fillText(text, hx, badgeY);

      ctx.restore();
    }
  }

  /**
   * Render tactical HUD reticle, center crosshair, and telemetry watermark.
   */
  _renderTacticalOverlay(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;

    ctx.save();

    // Central FLIR targeting crosshair
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 1;

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Center crosshair ticks
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 16);
    ctx.stroke();

    // Subtle corner brackets on viewport
    const pad = 16;
    const len = 20;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - pad - len, pad);
    ctx.lineTo(width - pad, pad);
    ctx.lineTo(width - pad, pad + len);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pad, height - pad - len);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(pad + len, height - pad);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - pad - len, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.lineTo(width - pad, height - pad - len);
    ctx.stroke();

    // If Paused, render tactical pause overlay badge
    if (this.state === ENGINE_STATE.PAUSED) {
      ctx.fillStyle = 'rgba(5, 7, 10, 0.65)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 24px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TACTICAL SIMULATION PAUSED', cx, cy - 20);

      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.fillText('SYSTEMS ARMED // PRESS RESUME OR ESC TO CONTINUE', cx, cy + 15);
    }

    ctx.restore();
  }

  /**
   * Toggle Active vs Passive radar mode.
   */
  toggleRadarMode() {
    if (this.hudOverlay) {
      const mode = this.hudOverlay.toggleRadarMode();
      this._emit('telemetry', this.getTelemetry());
      return mode;
    }
    return RADAR_MODES.ACTIVE;
  }

  /**
   * Set specific radar mode.
   * @param {'ACTIVE'|'PASSIVE'} mode
   */
  setRadarMode(mode) {
    if (this.hudOverlay) {
      this.hudOverlay.setRadarMode(mode);
      this._emit('telemetry', this.getTelemetry());
    }
  }

  /**
   * Toggle visual collision debug overlay.
   * @returns {boolean}
   */
  toggleCollisionDebug() {
    if (this.collisions) {
      const state = this.collisions.toggleDebug();
      this._emit('telemetry', this.getTelemetry());
      return state;
    }
    return false;
  }

  /**
   * Set visual collision debug state.
   * @param {boolean} state
   */
  setCollisionDebug(state) {
    if (this.collisions) {
      this.collisions.setDebug(state);
      this._emit('telemetry', this.getTelemetry());
    }
  }

  /**
   * Cycle player weapon payload forward or backward.
   * @param {number} [direction=1] - (+1 next, -1 prev)
   * @returns {string} Active weapon ID
   */
  cycleWeapon(direction = 1) {
    const allowed = this.droneConfig?.weapons || ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'];
    if (!this.weapons || typeof this.weapons.cycleWeapon !== 'function') {
      this.weapons = new WeaponSystem(this.weaponConfig?.id || 'VULCAN');
    }
    const newWeaponId = this.weapons.cycleWeapon(direction, allowed);
    this.weaponConfig = this.weapons.weaponConfig;
    soundManager.playWeaponSwitch(newWeaponId);
    console.log(`🔄 Weapon cycled to: ${newWeaponId} (${this.weapons.weaponConfig.name})`);
    this._emit('telemetry', this.getTelemetry());
    return newWeaponId;
  }

  /**
   * Select a specific weapon slot (1 to 5).
   * @param {number} slot
   * @returns {string} Active weapon ID
   */
  selectWeaponSlot(slot) {
    const allowed = this.droneConfig?.weapons || ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'];
    if (!this.weapons || typeof this.weapons.selectWeaponSlot !== 'function') {
      this.weapons = new WeaponSystem(this.weaponConfig?.id || 'VULCAN');
    }
    const newWeaponId = this.weapons.selectWeaponSlot(slot, allowed);
    this.weaponConfig = this.weapons.weaponConfig;
    soundManager.playWeaponSwitch(newWeaponId);
    console.log(`🎯 Weapon slot ${slot} selected: ${newWeaponId} (${this.weapons.weaponConfig.name})`);
    this._emit('telemetry', this.getTelemetry());
    return newWeaponId;
  }

  /**
   * Set specific weapon payload by ID.
   * @param {string} weaponId
   */
  setWeapon(weaponId) {
    this.weapons.setWeapon(weaponId);
    this.weapons.applyDroneModifiers(this.droneConfig);
    this.weaponConfig = this.weapons.weaponConfig;
    soundManager.playWeaponSwitch(weaponId);
    this._emit('telemetry', this.getTelemetry());
  }

  /**
   * Trigger cinematic HVT Red Alert & Satellite Optical Zoom Warning.
   * @param {Object} [options]
   * @param {string} [options.bossName]
   * @param {string} [options.bossType]
   * @param {number} [options.sector]
   * @param {number} [options.duration=3.5]
   * @param {Function} [options.onComplete]
   */
  triggerHvtWarning(options = {}) {
    if (!this.hvtWarning) {
      this.hvtWarning = new HVTWarningSequence();
    }
    const sector = options.sector || this.sectorConfig?.id || 5;
    const bossName = options.bossName || this.sectorConfig?.bossName || 'HVT MOBILE COMMAND CENTER';
    const bossType = options.bossType || 'BOSS_MOBILE_COMMAND';

    this.hvtWarning.start({
      bossName,
      bossType,
      sector,
      duration: options.duration || 3.5,
      onComplete: options.onComplete
    });

    this._emit('telemetry', this.getTelemetry());
  }

  /**
   * Get engine telemetry data snapshot.
   */
  getTelemetry() {
    const p = this.player;
    const hudSnapshot = this.hudOverlay ? this.hudOverlay.getTelemetrySnapshot() : {};
    const allowedWeapons = this.droneConfig?.weapons || ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'];

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      simTime: Number(this.simTime.toFixed(1)),
      tickCount: this.tickCount,
      renderCount: this.renderCount,
      state: this.state,
      score: this.score,
      hull: this.hull,
      maxHull: this.maxHull,
      shield: this.shield,
      maxShield: this.maxShield,
      activeProjectiles: this.projectiles.getActiveCount(),
      shake: Number(this.shakeIntensity.toFixed(2)),
      playerX: Math.round(p.x),
      playerY: Math.round(p.y),
      speed: Math.round(Math.hypot(p.vx, p.vy)),
      bankAngle: Number(p.bankAngle.toFixed(2)),
      thrust: Math.round(p.thrustIntensity * 100),
      controlScheme: this.input.getEffectiveControlScheme(),
      collisionDebug: this.collisions ? this.collisions.debug : false,
      collisionStats: this.collisions ? this.collisions.stats : null,
      // Dynamic HUD State
      isMoving: this.isPlayerMoving,
      stationaryTimer: Number(this.stationaryTimer.toFixed(1)),
      panelsEnabled: this.panelsEnabled,
      hudHidden: this.hudHidden,
      // HVT Alert Warning State
      isHvtWarningActive: this.hvtWarning ? !!this.hvtWarning.active : false,
      hvtZoomFactor: this.hvtWarning ? this.hvtWarning.getZoomFactor() : 1.0,
      // Active Weapon & Arsenal Telemetry
      activeWeapon: this.weapons?.activeWeaponId || 'VULCAN',
      weaponName: this.weapons?.weaponConfig?.name || 'GAU-22 VULCAN',
      weaponClass: this.weapons?.weaponConfig?.class || 'KINETIC',
      weaponIcon: this.weapons?.weaponConfig?.icon || '⦿',
      weaponColor: this.weapons?.weaponConfig?.color || '#2dd4dc',
      weaponSlot: (this.weapons && typeof this.weapons.getActiveSlotIndex === 'function') ? this.weapons.getActiveSlotIndex(allowedWeapons) : 1,
      availableWeapons: allowedWeapons,
      // Mission Wave Progress
      currentWave: this.waveRunner ? this.waveRunner.currentWaveIndex : 1,
      totalWaves: this.waveRunner ? this.waveRunner.totalWaves : 3,
      isUnlimitedMode: this.waveRunner ? !!this.waveRunner.isUnlimitedMode : false,
      isObjectiveMet: !!this.isObjectiveMet,
      // Live Stars & Threshold Telemetry
      stars: calculateStars(this.sectorConfig?.id || 1, this.score),
      scoreThresholds: this.sectorConfig?.scoreThresholds || { star1: 10000, star2: 20000, star3: 30000 },
      // Merge rich tactical HUD snapshot
      ...hudSnapshot
    };
  }

  /**
   * Toggle tactical panels display state (manual HUD toggle).
   */
  toggleHudPanels() {
    this.panelsEnabled = !this.panelsEnabled;
    if (this.panelsEnabled) {
      this.stationaryTimer = 2.0; // Ready to display
      this.hudHidden = this.isPlayerMoving;
    } else {
      this.hudHidden = true;
    }
    soundManager.playClick();
    this._emit('hudVisibilityChange', {
      hudHidden: this.hudHidden,
      panelsEnabled: this.panelsEnabled,
      isMoving: this.isPlayerMoving,
      stationaryTimer: this.stationaryTimer
    });
    console.log(`🎛️ Tactical Panels: ${this.panelsEnabled ? 'ENABLED (Visible when stationary)' : 'DISABLED (Hidden)'}`);
    return this.panelsEnabled;
  }

  /**
   * Record fired projectile count for accuracy statistics.
   * @param {number} [count=1]
   */
  recordShotFired(count = 1) {
    this.shotsFired += count;
  }

  /**
   * Record projectile hit count on hostiles for accuracy calculation.
   * @param {number} [count=1]
   */
  recordShotHit(count = 1) {
    this.shotsHit += count;
  }

  /**
   * Record total damage sustained by player.
   * @param {number} [amount=0]
   */
  recordDamageTaken(amount = 0) {
    this.damageTaken += amount;
  }

  /**
   * Record collected pickup or intel data cache.
   */
  recordPickupCollected() {
    this.pickupsCollected++;
  }

  /**
   * Calculate comprehensive tactical mission evaluation summary.
   * @param {boolean} [isVictory=true]
   * @returns {Object} Mission debrief summary payload
   */
  getMissionSummary(isVictory = true) {
    // If primary mission objectives were secured, preserve victory status even on survival defeat
    if (this.isObjectiveMet) {
      isVictory = true;
    }

    const sectorId = this.sectorConfig?.id || 1;
    const levelInfo = getLevelById(sectorId) || {
      id: sectorId,
      name: `SECTOR ${sectorId.toString().padStart(2, '0')}`,
      scoreThresholds: { star1: 1000, star2: 2000, star3: 3000 }
    };

    const baseScore = Math.max(0, Math.round(this.score));
    const shotsFired = Math.max(0, this.shotsFired);
    const shotsHit = Math.max(0, this.shotsHit);
    const accuracyPct = shotsFired > 0 ? Math.min(100, Math.round((shotsHit / shotsFired) * 100)) : 100;

    // Accuracy Bonus (up to +35% of base score for high precision >= 50%)
    let accuracyBonus = 0;
    if (accuracyPct >= 50) {
      accuracyBonus = Math.round(baseScore * (accuracyPct / 100) * 0.35);
    }

    // Hull Integrity Bonus (awarded on victory based on remaining hull)
    const hullPct = Math.max(0, Math.min(100, Math.round((this.player.hull / (this.player.maxHull || 100)) * 100)));
    let hullBonus = 0;
    if (isVictory) {
      hullBonus = Math.round((hullPct / 100) * 1200);
    }

    // Rapid Clear Speed Bonus (awarded on victory for clearing sector within par time)
    let timeBonus = 0;
    if (isVictory) {
      const parTime = 120; // 2 minutes par time
      if (this.simTime < parTime) {
        timeBonus = Math.round((parTime - this.simTime) * 20);
      }
    }

    const totalFinalScore = baseScore + (isVictory ? (accuracyBonus + hullBonus + timeBonus) : 0);
    const stars = isVictory ? calculateStars(sectorId, totalFinalScore) : 0;

    let grade = 'F';
    if (!isVictory) {
      grade = 'MIA';
    } else if (stars === 3 && accuracyPct >= 80) {
      grade = 'S';
    } else if (stars >= 2 && accuracyPct >= 60) {
      grade = 'A';
    } else if (stars >= 1) {
      grade = 'B';
    } else {
      grade = 'C';
    }

    return {
      sector: sectorId,
      sectorName: levelInfo.name,
      victory: isVictory,
      baseScore,
      accuracy: accuracyPct,
      shotsFired,
      shotsHit,
      accuracyBonus,
      hullPct,
      hullBonus,
      timeElapsed: Number(this.simTime.toFixed(1)),
      timeBonus,
      pickupsCollected: this.pickupsCollected || 0,
      score: totalFinalScore,
      stars,
      grade,
      kills: this.enemies ? this.enemies.totalKills : 0,
      thresholds: levelInfo.scoreThresholds,
      drone: this.droneConfig?.name || 'STRIKER',
      weapon: this.weaponConfig?.name || 'VULCAN'
    };
  }

  /**
   * Destroy instance and remove event listeners.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('radar:toggle', this._boundRadarToggle);
    window.removeEventListener('panels:toggle', this._boundPanelsToggle);
    window.removeEventListener('collision:toggleDebug', this._boundDebugToggle);
    window.removeEventListener('weapon:cycle', this._boundWeaponCycle);
    window.removeEventListener('weapon:selectSlot', this._boundWeaponSlot);
    this.listeners = { stateChange: [], telemetry: [], hudVisibilityChange: [] };
  }
}
