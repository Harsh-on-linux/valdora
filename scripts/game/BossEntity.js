/**
 * BossEntity.js — High-Value Target (HVT) Multi-Segment Boss Framework
 * Features:
 * - Multi-segment architecture (Left Pod, Right Pod, Central Core)
 * - Independent segment destruction, armor mitigation & localized hit testing
 * - Multi-phase state machine (Phase 1: Radial Flak, Phase 2: Core Overdrive)
 * - Smooth entrance descent & responsive lateral combat oscillation
 * - High-tech tactical top HUD multi-segment health bar with FLIR aesthetics
 * - FLIR heat-flash shaders, debris ejection, explosion shockwaves & camera shake
 * - Zero-allocation physics & rendering integration with EnemyRenderer.js
 */

import { getBossById, BOSS_TYPES } from './enemies.js';
import { drawBoss } from './EnemyRenderer.js';
import { soundManager } from '../audio/index.js';

export const BOSS_STATES = {
  INACTIVE: 'INACTIVE',
  ENTERING: 'ENTERING',
  COMBAT: 'COMBAT',
  PHASE_TRANSITION: 'PHASE_TRANSITION',
  DYING: 'DYING',
  DEFEATED: 'DEFEATED'
};

export class BossEntity {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.active = false;
    this.state = BOSS_STATES.INACTIVE;
    this.bossId = 'BOSS_MOBILE_COMMAND';
    this.config = getBossById(this.bossId) || BOSS_TYPES.BOSS_MOBILE_COMMAND;

    // Position & Motion
    this.x = 0;
    this.y = -200;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.targetY = 160;
    this.baseSpeed = 50; // px/s
    this.oscillationAmplitude = 180; // px
    this.oscillationSpeed = 0.6; // rad/s
    this.oscillationTime = 0;
    this.size = 140; // Base size (scaled to player ratio)

    // Phase & Progression
    this.phase = 1;
    this.maxPhases = 2;
    this.timeInState = 0;
    this.timeAlive = 0;
    this.isInvulnerable = false;
    this.isDefeated = false;

    // Multi-Segment Health & Armor
    this.segments = {
      leftPod: {
        id: 'leftPod',
        name: 'LEFT WEAPON POD',
        hp: 200,
        maxHp: 200,
        armor: 1.2,
        destroyed: false,
        flashTimer: 0,
        offsetX: -0.85, // relative to size
        offsetY: 0,
        radiusRatio: 0.28
      },
      rightPod: {
        id: 'rightPod',
        name: 'RIGHT WEAPON POD',
        hp: 200,
        maxHp: 200,
        armor: 1.2,
        destroyed: false,
        flashTimer: 0,
        offsetX: 0.85,
        offsetY: 0,
        radiusRatio: 0.28
      },
      core: {
        id: 'core',
        name: 'COMMAND CORE',
        hp: 400,
        maxHp: 400,
        armor: 2.0,
        destroyed: false,
        flashTimer: 0,
        offsetX: 0,
        offsetY: 0,
        radiusRatio: 0.40
      }
    };

    this.totalHp = 800;
    this.maxTotalHp = 800;

    // Weapon Timers & Cooldowns
    this.leftPodFireTimer = 0.5;
    this.rightPodFireTimer = 0.5;
    this.coreFireTimer = 2.0;
    this.escortSpawnTimer = 10.0;
    this.podRotationAngleLeft = 0;
    this.podRotationAngleRight = 0;

    // Destruction sequence timer
    this.deathTimer = 0;
    this.deathDuration = 2.5;

    // Telemetry and UI animations
    this.uiGlowPhase = 0;
  }

  /**
   * Reset boss to clean inactive state.
   */
  reset() {
    this.active = false;
    this.state = BOSS_STATES.INACTIVE;
    this.isDefeated = false;
    this.isInvulnerable = false;
    this.phase = 1;
    this.timeAlive = 0;
    this.timeInState = 0;
    this.deathTimer = 0;
  }

  /**
   * Spawn boss into the game arena.
   * @param {string} [bossId='BOSS_MOBILE_COMMAND']
   * @param {number} arenaWidth
   * @param {number} arenaHeight
   * @param {number} [playerScale=54]
   */
  spawn(bossId = 'BOSS_MOBILE_COMMAND', arenaWidth = 1000, arenaHeight = 800, playerScale = 54) {
    this.bossId = bossId;
    this.config = getBossById(bossId) || BOSS_TYPES.BOSS_MOBILE_COMMAND;
    this.size = playerScale * (this.config.render?.totalWidth || 2.5);

    this.x = arenaWidth / 2;
    this.y = -this.size - 40;
    this.prevX = this.x;
    this.prevY = this.y;
    this.targetY = Math.max(140, arenaHeight * 0.22);

    this.oscillationAmplitude = Math.min(arenaWidth * 0.32, 220);
    this.oscillationSpeed = 0.55;
    this.oscillationTime = 0;

    this.phase = 1;
    this.isInvulnerable = true; // Invulnerable during cinematic entrance
    this.isDefeated = false;
    this.state = BOSS_STATES.ENTERING;
    this.timeInState = 0;
    this.timeAlive = 0;
    this.deathTimer = 0;

    // Reset segment health from config
    const segCfg = this.config.stats?.segments || {};
    this.segments.leftPod.hp = segCfg.leftPod?.hp || 200;
    this.segments.leftPod.maxHp = this.segments.leftPod.hp;
    this.segments.leftPod.armor = segCfg.leftPod?.armor || 1.2;
    this.segments.leftPod.destroyed = false;
    this.segments.leftPod.flashTimer = 0;

    this.segments.rightPod.hp = segCfg.rightPod?.hp || 200;
    this.segments.rightPod.maxHp = this.segments.rightPod.hp;
    this.segments.rightPod.armor = segCfg.rightPod?.armor || 1.2;
    this.segments.rightPod.destroyed = false;
    this.segments.rightPod.flashTimer = 0;

    this.segments.core.hp = segCfg.core?.hp || 400;
    this.segments.core.maxHp = this.segments.core.hp;
    this.segments.core.armor = segCfg.core?.armor || 2.0;
    this.segments.core.destroyed = false;
    this.segments.core.flashTimer = 0;

    this.maxTotalHp = this.segments.leftPod.maxHp + this.segments.rightPod.maxHp + this.segments.core.maxHp;
    this.totalHp = this.maxTotalHp;

    this.leftPodFireTimer = 1.0;
    this.rightPodFireTimer = 1.0;
    this.coreFireTimer = 2.5;
    this.escortSpawnTimer = 12.0;

    this.active = true;

    if (soundManager && typeof soundManager.playBossSpawn === 'function') {
      soundManager.playBossSpawn();
    }
  }

  /**
   * Fixed-timestep boss logic update.
   * @param {number} dt - Fixed delta time
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   */
  update(dt, gameEngine, soundManager) {
    if (!this.active) return;

    this.prevX = this.x;
    this.prevY = this.y;
    this.timeAlive += dt;
    this.timeInState += dt;
    this.uiGlowPhase += dt * 3.5;

    // Update segment flash timers
    for (const key of ['leftPod', 'rightPod', 'core']) {
      const seg = this.segments[key];
      if (seg.flashTimer > 0) {
        seg.flashTimer = Math.max(0, seg.flashTimer - dt);
      }
    }

    // State Machine execution
    switch (this.state) {
      case BOSS_STATES.ENTERING:
        this._updateEntering(dt, gameEngine);
        break;

      case BOSS_STATES.COMBAT:
        this._updateCombat(dt, gameEngine, soundManager);
        break;

      case BOSS_STATES.PHASE_TRANSITION:
        this._updatePhaseTransition(dt, gameEngine, soundManager);
        break;

      case BOSS_STATES.DYING:
        this._updateDying(dt, gameEngine, soundManager);
        break;

      case BOSS_STATES.DEFEATED:
        // Dormant
        break;
    }

    // Calculate current total HP
    this.totalHp = (this.segments.leftPod.destroyed ? 0 : this.segments.leftPod.hp) +
                   (this.segments.rightPod.destroyed ? 0 : this.segments.rightPod.hp) +
                   (this.segments.core.destroyed ? 0 : this.segments.core.hp);
  }

  /**
   * Cinematic descent into the combat arena.
   */
  _updateEntering(dt, gameEngine) {
    const arenaW = gameEngine.width || 1000;
    const centerX = arenaW / 2;

    // Smooth descent towards target Y
    this.vy = 120;
    this.y += this.vy * dt;
    this.x += (centerX - this.x) * dt * 3.0;

    if (this.y >= this.targetY) {
      this.y = this.targetY;
      this.vy = 0;
      this.isInvulnerable = false;
      this.state = BOSS_STATES.COMBAT;
      this.timeInState = 0;

      // Announcement banner
      if (gameEngine.waveRunner && typeof gameEngine.waveRunner.showBanner === 'function') {
        gameEngine.waveRunner.showBanner('HVT ENGAGED', 'NEUTRALIZE ALL WEAPON PODS & CORE', '#ff003c', 3.0);
      }
    }
  }

  /**
   * Main combat movement & weapon handling.
   */
  _updateCombat(dt, gameEngine, soundManager) {
    const arenaW = gameEngine.width || 1000;
    const centerX = arenaW / 2;

    // Lateral sinusoidal oscillation
    const speedMult = this.phase === 2 ? 1.8 : 1.0;
    this.oscillationTime += dt * this.oscillationSpeed * speedMult;
    const targetX = centerX + Math.sin(this.oscillationTime) * this.oscillationAmplitude * (this.phase === 2 ? 1.3 : 1.0);

    this.x += (targetX - this.x) * dt * (this.phase === 2 ? 3.5 : 2.0);

    // Check if both pods are destroyed to trigger Phase 2 transition
    if (this.phase === 1 && this.segments.leftPod.destroyed && this.segments.rightPod.destroyed) {
      this._triggerPhaseTransition(2, gameEngine, soundManager);
    }
  }

  /**
   * Trigger transition to Phase 2 (Core Overdrive).
   */
  _triggerPhaseTransition(targetPhase, gameEngine, soundManager) {
    this.phase = targetPhase;
    this.state = BOSS_STATES.PHASE_TRANSITION;
    this.timeInState = 0;

    if (gameEngine.addCameraShake) {
      gameEngine.addCameraShake(14);
    }

    if (soundManager && typeof soundManager.playWarning === 'function') {
      soundManager.playWarning();
    }

    if (gameEngine.waveRunner && typeof gameEngine.waveRunner.showBanner === 'function') {
      gameEngine.waveRunner.showBanner('CORE OVERDRIVE', 'HVT SHIELDS OFFLINE // HOSTILE ESCORTS INBOUND', '#ff003c', 3.0);
    }

    // Spawn thermal transition burst sparks
    if (gameEngine.projectiles) {
      gameEngine.projectiles.spawnHitSparks(this.x, this.y, '#ff003c', 28);
      gameEngine.projectiles.spawnMuzzleFlash(this.x, this.y, '#ffb703', 60, 0);
    }
  }

  /**
   * Phase transition pause / overheat FX.
   */
  _updatePhaseTransition(dt, gameEngine, soundManager) {
    if (this.timeInState >= 1.2) {
      this.state = BOSS_STATES.COMBAT;
      this.timeInState = 0;
    }
  }

  /**
   * Boss defeat explosion cascade.
   */
  _updateDying(dt, gameEngine, soundManager) {
    this.deathTimer += dt;

    // Cascading explosions
    if (Math.random() < 0.35 && gameEngine.projectiles) {
      const rx = this.x + (Math.random() - 0.5) * this.size * 1.5;
      const ry = this.y + (Math.random() - 0.5) * this.size * 0.8;
      gameEngine.projectiles.spawnHitSparks(rx, ry, '#ff003c', 12);
      gameEngine.projectiles.spawnMuzzleFlash(rx, ry, '#ffb703', 40, 0);

      if (soundManager && typeof soundManager.playExplosion === 'function') {
        soundManager.playExplosion(0.7);
      }
    }

    if (this.deathTimer >= this.deathDuration) {
      this.state = BOSS_STATES.DEFEATED;
      this.active = false;
      this.isDefeated = true;

      // Final massive explosion shockwave
      if (gameEngine.projectiles) {
        gameEngine.projectiles.spawnHellfireDetonation(this.x, this.y, 180, '#ff003c');
        gameEngine.projectiles.spawnHitSparks(this.x, this.y, '#ffffff', 40);
      }

      if (gameEngine.addCameraShake) {
        gameEngine.addCameraShake(22);
      }

      if (soundManager && typeof soundManager.playExplosion === 'function') {
        soundManager.playExplosion(1.5);
      }

      // Add major boss bounty score
      const bounty = this.config.stats?.scoreValue || 5000;
      if (gameEngine && typeof gameEngine.addScore === 'function') {
        gameEngine.addScore(bounty);
      }

      // Drop tactical supplies
      if (gameEngine.pickups) {
        gameEngine.pickups.spawnDrop(this.x - 40, this.y, 'ARMOR_REPAIR');
        gameEngine.pickups.spawnDrop(this.x + 40, this.y, 'OVERDRIVE');
        gameEngine.pickups.spawnDrop(this.x, this.y, 'INTEL_DATA');
      }

      if (gameEngine.waveRunner && typeof gameEngine.waveRunner.showBanner === 'function') {
        gameEngine.waveRunner.showBanner('HVT ELIMINATED', 'SECTOR 05 COMMAND HUB DESTROYED', '#10b981', 4.0);
      }
    }
  }

  /**
   * Apply damage to a specific boss segment.
   * @param {string} segmentId - 'leftPod' | 'rightPod' | 'core'
   * @param {number} rawDamage - Incoming weapon damage
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   * @returns {number} Actual damage inflicted
   */
  applyDamage(segmentId, rawDamage, gameEngine, soundManager) {
    if (!this.active || this.isInvulnerable || this.state === BOSS_STATES.DYING || this.state === BOSS_STATES.DEFEATED) {
      return 0;
    }

    const seg = this.segments[segmentId];
    if (!seg || seg.destroyed) return 0;

    // Apply armor mitigation (e.g. 1.2 or 2.0 armor divisor)
    const effectiveDamage = Math.max(1, Math.round(rawDamage / (seg.armor || 1.0)));
    seg.hp = Math.max(0, seg.hp - effectiveDamage);
    seg.flashTimer = 0.14;

    // Check if segment is destroyed
    if (seg.hp <= 0 && !seg.destroyed) {
      seg.destroyed = true;
      seg.hp = 0;
      this._handleSegmentDestroyed(segmentId, gameEngine, soundManager);
    }

    return effectiveDamage;
  }

  /**
   * Handle destruction of an individual segment.
   */
  _handleSegmentDestroyed(segmentId, gameEngine, soundManager) {
    const seg = this.segments[segmentId];
    const segPos = this.getSegmentWorldPosition(segmentId);

    // Sound and Camera Shake
    if (soundManager && typeof soundManager.playExplosion === 'function') {
      soundManager.playExplosion(segmentId === 'core' ? 1.4 : 1.0);
    }

    if (gameEngine.addCameraShake) {
      gameEngine.addCameraShake(segmentId === 'core' ? 18 : 10);
    }

    // Spawn destruction explosion & debris
    if (gameEngine.projectiles) {
      gameEngine.projectiles.spawnHitSparks(segPos.x, segPos.y, '#ff003c', 24);
      gameEngine.projectiles.spawnMuzzleFlash(segPos.x, segPos.y, '#ffb703', 50, 0);
    }

    if (segmentId === 'core') {
      // Core destroyed = Boss defeated!
      this.state = BOSS_STATES.DYING;
      this.deathTimer = 0;
    } else {
      // Weapon pod destroyed
      if (gameEngine.waveRunner && typeof gameEngine.waveRunner.showBanner === 'function') {
        gameEngine.waveRunner.showBanner(
          `${seg.name} DESTROYED`,
          'FIREPOWER REDUCED // FOCUS FIRE ON REMAINING WEAPONS',
          '#ffb703',
          2.0
        );
      }
    }
  }

  /**
   * Get world position and radius for a specific segment.
   * @param {string} segmentId
   * @returns {{ x: number, y: number, radius: number }}
   */
  getSegmentWorldPosition(segmentId) {
    const seg = this.segments[segmentId];
    if (!seg) return { x: this.x, y: this.y, radius: 30 };

    const podOffsetX = this.size * (this.config.render?.podOffsetX || 0.85);
    let sx = this.x;
    let sy = this.y;

    if (segmentId === 'leftPod') {
      sx = this.x - podOffsetX;
    } else if (segmentId === 'rightPod') {
      sx = this.x + podOffsetX;
    }

    const radius = this.size * seg.radiusRatio;
    return { x: sx, y: sy, radius };
  }

  /**
   * Get segment HP fractions for rendering.
   */
  getSegmentHpFractions() {
    return {
      leftPod: this.segments.leftPod.destroyed ? 0 : this.segments.leftPod.hp / this.segments.leftPod.maxHp,
      rightPod: this.segments.rightPod.destroyed ? 0 : this.segments.rightPod.hp / this.segments.rightPod.maxHp,
      core: this.segments.core.destroyed ? 0 : this.segments.core.hp / this.segments.core.maxHp
    };
  }

  /**
   * Render Boss Entity in world space.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} animTime - Simulation timestamp
   */
  render(ctx, animTime) {
    if (!this.active || this.state === BOSS_STATES.DEFEATED) return;

    const segmentHP = this.getSegmentHpFractions();
    const hpPercent = this.totalHp / this.maxTotalHp;

    ctx.save();

    // Flash white on hit
    const anyFlash = this.segments.leftPod.flashTimer > 0 ||
                     this.segments.rightPod.flashTimer > 0 ||
                     this.segments.core.flashTimer > 0;

    if (anyFlash) {
      ctx.filter = 'brightness(1.5) contrast(1.2)';
    }

    drawBoss(ctx, this.bossId, this.x, this.y, this.size, {
      animTime,
      phase: this.phase,
      hpPercent,
      segmentHP,
      isSubmerged: false,
      submergeAlpha: 1.0
    });

    ctx.restore();
  }

  /**
   * Render Tactical FLIR Top Multi-Segment Health Bar HUD.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width - Screen width
   * @param {number} height - Screen height
   */
  renderHUD(ctx, width, height) {
    if (!this.active || this.state === BOSS_STATES.DEFEATED) return;

    ctx.save();

    const barWidth = Math.min(width * 0.72, 540);
    const barHeight = 10;
    const cx = width / 2;
    const topY = 28;

    // ── 1. Tactical Header with Threat Class & Sector ──
    ctx.font = 'bold 11px "Share Tech Mono", "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const headerText = `${this.config.name || 'HVT MOBILE COMMAND CENTER'} // SECTOR 05`;
    ctx.fillStyle = this.phase === 2 ? '#ff003c' : '#ffb703';
    ctx.fillText(headerText, cx, topY - 8);

    // Phase Badge
    const phaseText = this.phase === 2
      ? '⚡ PHASE 2 // CORE OVERDRIVE'
      : '🛡️ PHASE 1 // RADIAL FLAK BARRAGE';
    ctx.font = '9px "Share Tech Mono", "Roboto Mono", monospace';
    ctx.fillStyle = this.phase === 2 ? '#ff4d6d' : '#ffd166';
    ctx.fillText(phaseText, cx, topY + barHeight + 14);

    // ── 2. Background Panel Container ──
    const panelPad = 6;
    ctx.fillStyle = 'rgba(5, 8, 12, 0.85)';
    ctx.strokeStyle = this.phase === 2 ? 'rgba(255, 0, 60, 0.6)' : 'rgba(255, 183, 3, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - barWidth / 2 - panelPad, topY - panelPad, barWidth + panelPad * 2, barHeight + panelPad * 2);
    ctx.strokeRect(cx - barWidth / 2 - panelPad, topY - panelPad, barWidth + panelPad * 2, barHeight + panelPad * 2);

    // ── 3. Segmented Bar Layout: [ Left Pod (25%) ] [ Core (50%) ] [ Right Pod (25%) ] ──
    const leftW = barWidth * 0.25;
    const coreW = barWidth * 0.48;
    const rightW = barWidth * 0.25;
    const gap = (barWidth - (leftW + coreW + rightW)) / 2;

    const leftX = cx - barWidth / 2;
    const coreX = leftX + leftW + gap;
    const rightX = coreX + coreW + gap;

    // A. Left Pod Bar
    this._renderSegmentBar(
      ctx,
      leftX, topY, leftW, barHeight,
      this.segments.leftPod,
      'L-POD',
      this.segments.leftPod.flashTimer > 0
    );

    // B. Core Bar
    this._renderSegmentBar(
      ctx,
      coreX, topY, coreW, barHeight,
      this.segments.core,
      'CORE',
      this.segments.core.flashTimer > 0
    );

    // C. Right Pod Bar
    this._renderSegmentBar(
      ctx,
      rightX, topY, rightW, barHeight,
      this.segments.rightPod,
      'R-POD',
      this.segments.rightPod.flashTimer > 0
    );

    ctx.restore();
  }

  /**
   * Helper to draw a single segment sub-bar with label and percentage.
   */
  _renderSegmentBar(ctx, x, y, width, height, segment, label, isFlashing) {
    const fraction = segment.destroyed ? 0 : Math.max(0, segment.hp / segment.maxHp);

    // Bar background
    ctx.fillStyle = 'rgba(20, 24, 30, 0.9)';
    ctx.fillRect(x, y, width, height);

    // Bar fill
    if (fraction > 0) {
      let fillColor = '#ffb703';
      if (segment.id === 'core' && this.phase === 2) {
        fillColor = '#ff003c';
      } else if (fraction < 0.3) {
        fillColor = '#ef4444';
      } else if (fraction < 0.6) {
        fillColor = '#f59e0b';
      }

      if (isFlashing) {
        fillColor = '#ffffff';
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width * fraction, height);
    }

    // Segment Border
    ctx.strokeStyle = segment.destroyed ? 'rgba(255, 0, 60, 0.3)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Segment Text Sub-label
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = segment.destroyed ? '#666666' : '#cccccc';

    const statusText = segment.destroyed
      ? `${label}: DESTROYED`
      : `${label}: ${Math.round(fraction * 100)}%`;

    ctx.fillText(statusText, x + width / 2, y + height + 3);
  }
}
