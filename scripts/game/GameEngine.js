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
import { getLevelById } from './levels.js';
import { getDroneById, getWeaponById } from './drones.js';

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
    this.sectorConfig = null;
    this.droneConfig = null;
    this.weaponConfig = null;

    // Game stats
    this.score = 0;
    this.hull = 100;
    this.maxHull = 100;
    this.shield = 100;
    this.maxShield = 100;

    // Listener callbacks
    this.listeners = {
      stateChange: [],
      telemetry: []
    };

    this._boundLoop = this._loop.bind(this);
    this._boundResize = this.resize.bind(this);

    window.addEventListener('resize', this._boundResize);
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

    this.score = 0;
    this.hull = this.droneConfig?.stats?.armor ? this.droneConfig.stats.armor * 10 : 100;
    this.maxHull = this.hull;
    this.shield = this.droneConfig?.stats?.shield ? this.droneConfig.stats.shield * 10 : 100;
    this.maxShield = this.shield;

    this.accumulator = 0;
    this.simTime = 0;
    this.tickCount = 0;
    this.renderCount = 0;
    this._fpsFrames = 0;
    this._fpsLastUpdate = performance.now();
    this.lastTime = performance.now();

    this.state = ENGINE_STATE.RUNNING;
    this._emit('stateChange', this.state);

    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this._boundLoop);
    }

    console.log(`🎮 GameEngine started: Sector ${sectorId} (${this.sectorConfig.name}), Drone: ${droneId}`);
  }

  /**
   * Pause the active simulation loop.
   */
  pause() {
    if (this.state === ENGINE_STATE.RUNNING) {
      this.state = ENGINE_STATE.PAUSED;
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
      this._emit('stateChange', this.state);
      console.log('▶️ GameEngine — Simulation resumed.');
    }
  }

  /**
   * Terminate simulation and cancel animation loops.
   */
  stop() {
    this.state = ENGINE_STATE.STOPPED;
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
   */
  addCameraShake(intensity = 8) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 35);
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

    // 2. Update Tactical Map & Radar Layer
    this.tacticalMap.update(dt, 1.0);
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

    // 1. Render Tactical Satellite & Topographic Map Layer
    this.tacticalMap.render(ctx, w, h);

    // 2. Render Tactical Viewport Watermark & FLIR Crosshair
    this._renderTacticalOverlay(ctx, w, h);

    ctx.restore();
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
   * Get engine telemetry data snapshot.
   */
  getTelemetry() {
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
      shake: Number(this.shakeIntensity.toFixed(2))
    };
  }

  /**
   * Destroy instance and remove event listeners.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    this.listeners = { stateChange: [], telemetry: [] };
  }
}
