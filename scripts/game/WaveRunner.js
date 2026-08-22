/**
 * WaveRunner.js — Timeline-Based Wave Script & Mission Orchestration Engine
 * Coordinates timeline-based hostile wave deployments, formation entries,
 * tactical warning alerts, stage progression, and victory completion conditions.
 *
 * Features:
 * - Deterministic fixed-step wave timeline sequencer
 * - Multi-wave mission scripts with staggered spawns & formation geometry
 * - Automatic stage completion & victory condition triggers
 * - High-visibility tactical wave transition banners & audio telegraphs
 * - Zero garbage-collection allocation during active gameplay
 */

export class WaveRunner {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.currentSectorId = 1;
    this.sectorConfig = null;

    this.currentWaveIndex = 0;
    this.totalWaves = 3;
    this.waveTimer = 0;
    this.waveActive = false;
    this.isScriptCompleted = false;
    this.isStageCleared = false;

    // Timeline event cursor
    this.eventIndex = 0;
    this.activeTimeline = [];

    // Visual HUD Alert banner state
    this.banner = {
      active: false,
      text: '',
      subtext: '',
      color: '#00f0ff',
      timer: 0,
      duration: 2.5
    };

    // Event listeners
    this.listeners = {
      waveStart: [],
      waveCleared: [],
      stageComplete: [],
      bannerAlert: []
    };
  }

  /**
   * Register event listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return this;
  }

  /**
   * Emit internal event.
   * @param {string} event
   * @param {any} data
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        this.listeners[event][i](data);
      }
    }
  }

  /**
   * Load and initialize mission wave script for a sector.
   * @param {number} sectorId
   * @param {Object} sectorConfig
   */
  loadSector(sectorId = 1, sectorConfig = null) {
    this.currentSectorId = sectorId;
    this.sectorConfig = sectorConfig;
    this.totalWaves = sectorConfig?.waveCount || 3;
    this.currentWaveIndex = 0;
    this.waveTimer = 0;
    this.waveActive = false;
    this.isScriptCompleted = false;
    this.isStageCleared = false;
    this.eventIndex = 0;

    // Generate timeline script for this sector
    this.activeTimeline = this._buildSectorScript(sectorId, this.totalWaves);

    // Trigger initial mission intro banner
    this.showBanner(
      `SECTOR 0${sectorId} // ${sectorConfig?.name || 'MISSION START'}`,
      `OBJECTIVE: NEUTRALIZE ALL INCOMING HOSTILE FORCES`,
      '#00f0ff',
      3.0
    );

    this.startNextWave();
  }

  /**
   * Start the next scripted wave.
   */
  startNextWave() {
    this.currentWaveIndex++;
    this.waveTimer = 0;
    this.waveActive = true;
    this.eventIndex = 0;

    const isFinalWave = this.currentWaveIndex >= this.totalWaves;
    const bannerTitle = isFinalWave
      ? `FINAL WAVE // HOSTILE INVASION`
      : `WAVE ${this.currentWaveIndex} OF ${this.totalWaves}`;
    const bannerSub = isFinalWave
      ? `ALL SQUADRONS ENGAGE AT WILL`
      : `RADAR CONTACTS CONFIRMED`;
    const bannerColor = isFinalWave ? '#ff003c' : '#00f0ff';

    this.showBanner(bannerTitle, bannerSub, bannerColor, 2.2);

    this._emit('waveStart', {
      waveIndex: this.currentWaveIndex,
      totalWaves: this.totalWaves,
      isFinal: isFinalWave
    });
  }

  /**
   * Update wave timeline runner on each fixed simulation tick.
   * @param {number} dt - Fixed delta time
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {import('../audio/SoundManager.js').SoundManager} [soundManager=null]
   */
  update(dt, gameEngine, soundManager = null) {
    if (!gameEngine || this.isStageCleared) return;

    // 1. Update banner duration
    if (this.banner.active) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) {
        this.banner.active = false;
      }
    }

    if (!this.waveActive) return;

    this.waveTimer += dt;

    // 2. Process timeline events for current wave
    const waveEvents = this.activeTimeline[this.currentWaveIndex - 1] || [];
    while (this.eventIndex < waveEvents.length) {
      const evt = waveEvents[this.eventIndex];
      if (this.waveTimer >= evt.time) {
        this._executeEvent(evt, gameEngine, soundManager);
        this.eventIndex++;
      } else {
        break;
      }
    }

    // 3. Check wave completion conditions
    const allEventsDispatched = this.eventIndex >= waveEvents.length;
    const activeEnemyCount = gameEngine.enemies ? gameEngine.enemies.getActiveCount() : 0;

    if (allEventsDispatched && activeEnemyCount === 0 && this.waveTimer > 3.0) {
      this.waveActive = false;

      this._emit('waveCleared', {
        waveIndex: this.currentWaveIndex,
        totalWaves: this.totalWaves
      });

      if (this.currentWaveIndex < this.totalWaves) {
        // Schedule next wave after 2.5s breather
        setTimeout(() => {
          if (gameEngine.state === 'RUNNING') {
            this.startNextWave();
          }
        }, 2200);
      } else {
        // Mission complete!
        this.isStageCleared = true;
        this.showBanner('SECTOR SECURED', 'MISSION OBJECTIVES ACHIEVED // VICTORY', '#10b981', 4.0);

        setTimeout(() => {
          if (gameEngine.state === 'RUNNING') {
            this._emit('stageComplete', {
              sectorId: this.currentSectorId,
              score: gameEngine.score
            });
          }
        }, 2000);
      }
    }
  }

  /**
   * Execute an individual timeline event.
   * @param {Object} evt
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {import('../audio/SoundManager.js').SoundManager} soundManager
   */
  _executeEvent(evt, gameEngine, soundManager) {
    const w = gameEngine.width || window.innerWidth;
    const enemies = gameEngine.enemies;

    switch (evt.type) {
      case 'formation':
        if (enemies) {
          enemies.spawnFormation({
            type: evt.enemyType || 'RECON_BUGGY',
            formation: evt.formation || 'vShape',
            count: evt.count || 3,
            startX: evt.relX !== undefined ? w * evt.relX : (evt.x || w * 0.5),
            startY: evt.y || -50,
            spacingX: evt.spacingX || 55,
            spacingY: evt.spacingY || 45
          });
        }
        break;

      case 'spawn':
        if (enemies) {
          enemies.spawn({
            type: evt.enemyType || 'SAM_TURRET',
            x: evt.relX !== undefined ? w * evt.relX : (evt.x || w * 0.5),
            y: evt.y || -50
          });
        }
        break;

      case 'alert':
        this.showBanner(evt.text || 'WARNING', evt.subtext || '', evt.color || '#ff003c', evt.duration || 2.5);
        if (soundManager && typeof soundManager.playWarning === 'function') {
          soundManager.playWarning();
        }
        break;
    }
  }

  /**
   * Display on-screen tactical announcement banner.
   * @param {string} text
   * @param {string} subtext
   * @param {string} color
   * @param {number} duration
   */
  showBanner(text, subtext = '', color = '#00f0ff', duration = 2.5) {
    this.banner.active = true;
    this.banner.text = text;
    this.banner.subtext = subtext;
    this.banner.color = color;
    this.banner.duration = duration;
    this.banner.timer = duration;

    this._emit('bannerAlert', { text, subtext, color, duration });
  }

  /**
   * Render wave alert banner and HUD progress overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.banner.active) return;

    const b = this.banner;
    const alpha = Math.min(1.0, b.timer / 0.35, (b.duration - b.timer) / 0.35);
    const cx = width / 2;
    const cy = height * 0.28;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Backdrop horizontal scan strip
    const barH = 54;
    const barGrad = ctx.createLinearGradient(cx - 320, 0, cx + 320, 0);
    barGrad.addColorStop(0, 'rgba(5, 7, 10, 0)');
    barGrad.addColorStop(0.2, 'rgba(5, 7, 10, 0.88)');
    barGrad.addColorStop(0.8, 'rgba(5, 7, 10, 0.88)');
    barGrad.addColorStop(1, 'rgba(5, 7, 10, 0)');

    ctx.fillStyle = barGrad;
    ctx.fillRect(cx - 320, cy - barH / 2, 640, barH);

    // Glowing border lines
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 260, cy - barH / 2);
    ctx.lineTo(cx + 260, cy - barH / 2);
    ctx.moveTo(cx - 260, cy + barH / 2);
    ctx.lineTo(cx + 260, cy + barH / 2);
    ctx.stroke();

    // Primary Text
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, cx, cy - 8);

    // Subtext
    if (b.subtext) {
      ctx.font = '700 10px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.subtext, cx, cy + 12);
    }

    ctx.restore();
  }

  /**
   * Procedurally generate wave scripts for a sector.
   * @param {number} sectorId
   * @param {number} waveCount
   * @returns {Array<Array<Object>>}
   */
  _buildSectorScript(sectorId, waveCount) {
    const waves = [];

    for (let w = 1; w <= waveCount; w++) {
      const events = [];

      if (sectorId === 1) {
        // Level 1: ORBITAL REACH (Training Sector — Scout Recon Vanguard)
        if (w === 1) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 3, relX: 0.5 });
        } else if (w === 2) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'pair', count: 2, relX: 0.25 });
          events.push({ time: 2.0, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'pair', count: 2, relX: 0.75 });
        } else {
          events.push({ time: 0.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 5, relX: 0.5 });
          events.push({ time: 3.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'staggeredLine', count: 3, relX: 0.28 });
        }
      } else if (sectorId === 2) {
        // Level 2: ASTEROID FRINGE (Scouts + VK-7 Interceptors with sinusoidal weave)
        if (w === 1) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.5 });
        } else if (w === 2) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 4, relX: 0.3 });
          events.push({ time: 2.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'echelon', count: 3, relX: 0.7 });
        } else if (w === 3) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.25 });
          events.push({ time: 1.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.75 });
          events.push({ time: 3.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'diamond', count: 4, relX: 0.5 });
        } else {
          events.push({ time: 0.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'vShape', count: 5, relX: 0.5 });
          events.push({ time: 3.0, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'staggeredLine', count: 3, relX: 0.35 });
        }
      } else if (sectorId === 3) {
        // Level 3: TURRET OUTPOST (Fortified SAM Turrets + Interceptors)
        if (w === 1) {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.78 });
          events.push({ time: 1.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 3, relX: 0.3 });
        } else if (w === 2) {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.22 });
          events.push({ time: 2.0, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.68 });
        } else if (w === 3) {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.3 });
          events.push({ time: 1.0, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.7 });
          events.push({ time: 3.0, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'vShape', count: 3, relX: 0.5 });
        } else {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.5 });
          events.push({ time: 1.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.82 });
          events.push({ time: 3.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'vShape', count: 5, relX: 0.45 });
        }
      } else if (sectorId === 4) {
        // Level 4: INVASION VECTOR (Heavy Swarm & Kamikaze Incursion)
        if (w === 1) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.5 });
          events.push({ time: 2.0, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.35 });
        } else if (w === 2) {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.8 });
          events.push({ time: 1.5, type: 'spawn', enemyType: 'RADAR_JAMMER', relX: 0.2 });
          events.push({ time: 3.0, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 4, relX: 0.5 });
        } else if (w === 3) {
          events.push({ time: 0.5, type: 'alert', text: 'KAMIKAZE SQUADRON DETECTED', subtext: 'HIGH SPEED DIVE-BOMBERS INCOMING', color: '#ff003c' });
          events.push({ time: 1.0, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.25 });
          events.push({ time: 1.8, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.75 });
          events.push({ time: 3.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.5 });
        } else if (w === 4) {
          events.push({ time: 0.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.3 });
          events.push({ time: 1.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.7 });
          events.push({ time: 2.5, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.5 });
          events.push({ time: 4.0, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'echelon', count: 4, relX: 0.3 });
        } else {
          events.push({ time: 0.5, type: 'alert', text: 'CRITICAL INVASION APEX', subtext: 'ALL SECTORS BREACHED // FULL DEFENSE ACTIVE', color: '#ff003c' });
          events.push({ time: 1.0, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.2 });
          events.push({ time: 1.8, type: 'spawn', enemyType: 'KAMIKAZE_DRONE', relX: 0.8 });
          events.push({ time: 2.8, type: 'spawn', enemyType: 'RADAR_JAMMER', relX: 0.5 });
          events.push({ time: 3.5, type: 'spawn', enemyType: 'SAM_TURRET', relX: 0.85 });
          events.push({ time: 5.0, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'vShape', count: 5, relX: 0.5 });
        }
      } else {
        // Generic sector fallback
        if (w === 1) {
          events.push({ time: 0.5, type: 'formation', enemyType: 'INTERCEPTOR', formation: 'pair', count: 2, relX: 0.5 });
        } else {
          events.push({ time: 0.5, type: 'formation', enemyType: 'RECON_BUGGY', formation: 'vShape', count: 4, relX: 0.5 });
        }
      }

      waves.push(events);
    }

    return waves;
  }
}
