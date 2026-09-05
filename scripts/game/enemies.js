/**
 * enemies.js — Enemy Target & Boss Entity Data Model & Configuration
 * Defines 5 hostile target archetypes + 2 boss entities with tactical stats,
 * hostile FLIR heat-signature palettes, procedural render parameters,
 * weapon/attack configs, movement behaviors, and spawn rules.
 *
 * Enemy Types:
 *  - RECON_BUGGY     — Fast swarmer scout, cannon fodder
 *  - INTERCEPTOR     — Evasive sinusoidal fighter, angled dual-fire
 *  - SAM_TURRET      — Stationary aimed turret, burst fire
 *  - KAMIKAZE_DRONE  — High-speed suicide ram attacker
 *  - RADAR_JAMMER    — ECM support unit, disrupts player HUD
 *
 * Boss Types:
 *  - BOSS_MOBILE_COMMAND  — HVT multi-segment fortress (Sector 5, 2-phase)
 *  - BOSS_APEX_DREADNOUGHT — Final campaign dreadnought (Sector 10, 3-phase)
 */

// ─────────────────────────────────────────────────────────────
// ENEMY ARCHETYPES
// ─────────────────────────────────────────────────────────────

export const ENEMY_TYPES = {

  RECON_BUGGY: {
    id: 'RECON_BUGGY',
    name: 'RV-4 SCOUT',
    class: 'LIGHT RECON',
    subtitle: 'Surveillance Micro-Drone',
    description: 'Fast swarming recon unit. Minimal armor, low-threat forward pulse fire. Dangerous in numbers.',

    stats: {
      hp: 15,
      speed: 3.8,
      scoreValue: 200,
      contactDamage: 10,
      fireRate: 0.5,     // shots per second
      armor: 0.2
    },

    // Hostile FLIR thermal palette — dim red-orange
    thermal: {
      core:    '#e85a3a',
      mid:     '#a83820',
      outer:   '#3d1810',
      glow:    'rgba(232, 90, 58, 0.5)',
      trail:   'rgba(232, 90, 58, 0.2)'
    },

    // Procedural wireframe render params
    render: {
      bodyStyle: 'hexDisc',       // compact hexagonal disc body
      bodyLength: 0.48,
      bodyWidth: 0.50,
      wingSpan: 0.0,              // no wings — thrust pods only
      thrustPodCount: 4,
      engineCount: 0,
      hasAntenna: false,
      hasTurret: false,
      hasNoseCone: false,
      scale: 0.6                  // relative to player size
    },

    // Attack pattern config
    weapon: {
      type: 'singlePulse',       // single forward projectile
      projectileSpeed: 280,
      projectileSize: 3,
      burstCount: 1,
      spreadAngle: 0,
      cooldown: 2.0,             // seconds between shots
      projectileColor: '#e85a3a',
      muzzleFlash: true
    },

    // Movement behavior
    movement: {
      pattern: 'linearDescent',   // straight down with slight drift
      baseSpeedY: 120,            // px/s downward
      lateralDrift: 30,           // slight random horizontal drift
      amplitude: 0,
      frequency: 0,
      diveSpeed: 0,
      anchorY: 0                  // N/A for linear descent
    },

    // Spawn rules
    spawn: {
      entryEdge: 'top',
      formationTypes: ['vShape', 'staggeredLine', 'cluster'],
      formationSize: { min: 3, max: 7 },
      minWave: 1,
      maxOnScreen: 12
    }
  },

  INTERCEPTOR: {
    id: 'INTERCEPTOR',
    name: 'VK-7 INTERCEPTOR',
    class: 'FAST ATTACK',
    subtitle: 'Evasive Strike Fighter',
    description: 'Sinusoidal-weaving hostile fighter with angled dual-fire cannons. Difficult to track, moderate threat.',

    stats: {
      hp: 30,
      speed: 4.5,
      scoreValue: 400,
      contactDamage: 15,
      fireRate: 0.67,
      armor: 0.5
    },

    thermal: {
      core:    '#ff8c1a',
      mid:     '#c46a0d',
      outer:   '#4a2800',
      glow:    'rgba(255, 140, 26, 0.55)',
      trail:   'rgba(255, 140, 26, 0.22)'
    },

    render: {
      bodyStyle: 'arrowhead',     // narrow swept-back arrowhead
      bodyLength: 0.65,
      bodyWidth: 0.30,
      wingSpan: 0.58,
      thrustPodCount: 0,
      engineCount: 2,
      hasAntenna: false,
      hasTurret: false,
      hasNoseCone: false,
      scale: 0.75
    },

    weapon: {
      type: 'angledDual',         // two projectiles at ±15°
      projectileSpeed: 320,
      projectileSize: 3.5,
      burstCount: 1,
      spreadAngle: 15,            // degrees from center
      cooldown: 1.5,
      projectileColor: '#ff8c1a',
      muzzleFlash: true
    },

    movement: {
      pattern: 'sinusoidal',
      baseSpeedY: 90,
      lateralDrift: 0,
      amplitude: 120,             // px horizontal wave
      frequency: 1.8,             // oscillations per second
      diveSpeed: 0,
      anchorY: 0
    },

    spawn: {
      entryEdge: 'top|left|right',
      formationTypes: ['pair', 'diamond', 'echelon'],
      formationSize: { min: 2, max: 4 },
      minWave: 2,
      maxOnScreen: 6
    }
  },

  SAM_TURRET: {
    id: 'SAM_TURRET',
    name: 'GT-12 SENTINEL',
    class: 'DEFENSE PLATFORM',
    subtitle: 'Automated Tracking Turret',
    description: 'Armored stationary emplacement. Anchors in upper sector and fires aimed 3-round bursts at the player drone.',

    stats: {
      hp: 60,
      speed: 0.8,
      scoreValue: 700,
      contactDamage: 20,
      fireRate: 0.4,
      armor: 1.5
    },

    thermal: {
      core:    '#ffb703',
      mid:     '#c48e02',
      outer:   '#4a3500',
      glow:    'rgba(255, 183, 3, 0.55)',
      trail:   'rgba(255, 183, 3, 0.2)'
    },

    render: {
      bodyStyle: 'hexPlatform',   // wide hexagonal base + turret
      bodyLength: 0.55,
      bodyWidth: 0.70,
      wingSpan: 0.0,
      thrustPodCount: 0,
      engineCount: 1,
      hasAntenna: true,
      hasTurret: true,            // rotating barrel on top
      hasNoseCone: false,
      scale: 0.85
    },

    weapon: {
      type: 'aimedBurst',         // tracks player, fires 3-round burst
      projectileSpeed: 380,
      projectileSize: 4,
      burstCount: 3,
      burstDelay: 0.12,           // seconds between burst shots
      spreadAngle: 0,             // aimed directly at player
      cooldown: 2.5,
      projectileColor: '#ffb703',
      muzzleFlash: true
    },

    movement: {
      pattern: 'anchorDrift',     // enters slowly, anchors, then drifts
      baseSpeedY: 40,
      lateralDrift: 20,
      amplitude: 0,
      frequency: 0,
      diveSpeed: 0,
      anchorY: 0.25               // anchors at 25% from top
    },

    spawn: {
      entryEdge: 'top',
      formationTypes: ['solo', 'pair'],
      formationSize: { min: 1, max: 2 },
      minWave: 3,
      maxOnScreen: 2
    }
  },

  KAMIKAZE_DRONE: {
    id: 'KAMIKAZE_DRONE',
    name: 'KZ-X WRAITH',
    class: 'SUICIDE STRIKE',
    subtitle: 'Explosive Ram Drone',
    description: 'Disposable high-velocity dive-bomber. Locks onto player position and rams at extreme speed. No weapons — pure kinetic impact.',

    stats: {
      hp: 10,
      speed: 6.0,
      scoreValue: 350,
      contactDamage: 35,
      fireRate: 0,                // no projectile weapons
      armor: 0.1
    },

    thermal: {
      core:    '#ff003c',
      mid:     '#c40030',
      outer:   '#4a0012',
      glow:    'rgba(255, 0, 60, 0.65)',
      trail:   'rgba(255, 0, 60, 0.3)'
    },

    render: {
      bodyStyle: 'wedge',         // pointed missile-like wedge
      bodyLength: 0.45,
      bodyWidth: 0.22,
      wingSpan: 0.0,
      thrustPodCount: 0,
      engineCount: 1,
      hasAntenna: false,
      hasTurret: false,
      hasNoseCone: true,          // glowing explosive front cone
      scale: 0.5
    },

    weapon: {
      type: 'none',               // no projectiles — contact damage only
      projectileSpeed: 0,
      projectileSize: 0,
      burstCount: 0,
      spreadAngle: 0,
      cooldown: 0,
      projectileColor: null,
      muzzleFlash: false
    },

    movement: {
      pattern: 'lockOnDive',      // hover → lock → dive at player
      baseSpeedY: 60,             // initial slow approach
      lateralDrift: 0,
      amplitude: 0,
      frequency: 0,
      diveSpeed: 600,             // extreme dive velocity
      anchorY: 0,
      lockOnDelay: 0.5,           // seconds of warning before dive
      telegraphFlash: true        // red flashing warning indicator
    },

    spawn: {
      entryEdge: 'top|left|right',
      formationTypes: ['solo'],
      formationSize: { min: 1, max: 1 },
      minWave: 4,
      maxOnScreen: 3
    }
  },

  RADAR_JAMMER: {
    id: 'RADAR_JAMMER',
    name: 'EW-9 SPECTER',
    class: 'ELECTRONIC WARFARE',
    subtitle: 'ECM Disruption Platform',
    description: 'Sensor-bristling support drone. Emits jamming aura that distorts player HUD, reduces radar range, and scrambles enemy IFF markers. Priority kill target.',

    stats: {
      hp: 40,
      speed: 1.5,
      scoreValue: 900,
      contactDamage: 8,
      fireRate: 0,
      armor: 0.8
    },

    thermal: {
      core:    '#39ff14',
      mid:     '#28b30e',
      outer:   '#0e3d06',
      glow:    'rgba(57, 255, 20, 0.5)',
      trail:   'rgba(57, 255, 20, 0.2)'
    },

    render: {
      bodyStyle: 'octaSphere',    // octagonal body with antenna spines
      bodyLength: 0.50,
      bodyWidth: 0.50,
      wingSpan: 0.0,
      thrustPodCount: 0,
      engineCount: 1,
      hasAntenna: true,           // multiple antenna spines/dishes
      hasTurret: false,
      hasNoseCone: false,
      antennaCount: 6,            // number of antenna spines
      dishCount: 2,               // satellite dish arrays
      scale: 0.7
    },

    weapon: {
      type: 'none',               // no direct fire — passive jammer
      projectileSpeed: 0,
      projectileSize: 0,
      burstCount: 0,
      spreadAngle: 0,
      cooldown: 0,
      projectileColor: null,
      muzzleFlash: false
    },

    // Jamming aura config
    jamming: {
      auraRadius: 999,            // affects entire screen while alive
      hudStaticIntensity: 0.35,   // HUD noise/static overlay alpha
      radarReduction: 0.5,        // radar range multiplied by this
      iffScramble: true,          // enemy markers flicker/scramble
      pulseFrequency: 2.0         // jamming pulse visual frequency
    },

    movement: {
      pattern: 'erraticFloat',    // slow, random floating drift
      baseSpeedY: 25,
      lateralDrift: 50,
      amplitude: 40,
      frequency: 0.5,
      diveSpeed: 0,
      anchorY: 0.30               // stays in upper 40%
    },

    spawn: {
      entryEdge: 'top',
      formationTypes: ['solo'],
      formationSize: { min: 1, max: 1 },
      minWave: 7,
      maxOnScreen: 1
    }
  }
};


// ─────────────────────────────────────────────────────────────
// BOSS ENTITIES
// ─────────────────────────────────────────────────────────────

export const BOSS_TYPES = {

  BOSS_MOBILE_COMMAND: {
    id: 'BOSS_MOBILE_COMMAND',
    name: 'HVT MOBILE COMMAND CENTER',
    class: 'HIGH-VALUE TARGET',
    subtitle: 'Armored Battle Fortress',
    description: 'Multi-segment armored fortress equipped with rotating radial flak arrays, targeted core fire, and fighter escort deployment.',
    sector: 5,

    stats: {
      totalHp: 800,
      segments: {
        leftPod:  { hp: 200, armor: 1.2 },
        rightPod: { hp: 200, armor: 1.2 },
        core:     { hp: 400, armor: 2.0 }
      },
      speed: 1.2,
      scoreValue: 5000,
      contactDamage: 40
    },

    // Phase-dependent thermal palettes
    thermal: {
      phase1: {
        core:    '#ffb703',
        mid:     '#c48e02',
        outer:   '#4a3500',
        glow:    'rgba(255, 183, 3, 0.6)',
        trail:   'rgba(255, 183, 3, 0.25)'
      },
      phase2: {
        core:    '#ff003c',
        mid:     '#c40030',
        outer:   '#4a0012',
        glow:    'rgba(255, 0, 60, 0.7)',
        trail:   'rgba(255, 0, 60, 0.3)'
      }
    },

    render: {
      bodyStyle: 'commandFortress',
      totalWidth: 2.5,            // relative to player size
      coreWidth: 0.8,
      coreHeight: 0.9,
      podWidth: 0.6,
      podHeight: 0.7,
      podOffsetX: 0.85,           // offset from center
      armorPanelCount: 6,
      antennaArrays: 3,
      turretBarrels: 2            // per weapon pod
    },

    phases: {
      phase1: {
        name: 'Radial Flak Barrage',
        description: 'Both weapon pods fire rotating radial bullet patterns. Core fires aimed shots.',
        trigger: 'onSpawn',
        podAttack: {
          type: 'radialSpin',
          projectileCount: 12,      // bullets per rotation
          rotationSpeed: 0.8,       // radians/sec
          projectileSpeed: 200,
          projectileSize: 3.5,
          color: '#ffb703',
          leftRotation: 'clockwise',
          rightRotation: 'counterClockwise'
        },
        coreAttack: {
          type: 'aimedSingle',
          projectileSpeed: 300,
          cooldown: 3.0,
          projectileSize: 5,
          color: '#ff6b35'
        },
        movement: {
          pattern: 'lateralOscillate',
          speed: 50,
          amplitude: 200
        }
      },
      phase2: {
        name: 'Core Overdrive',
        description: 'Both pods destroyed. Core shield drops, speed doubles, fires rapid spread + spawns escorts.',
        trigger: 'allPodsDestroyed',
        coreAttack: {
          type: 'rapidSpread',
          projectileCount: 5,
          spreadAngle: 60,          // degrees total spread
          projectileSpeed: 350,
          cooldown: 1.2,
          projectileSize: 4,
          color: '#ff003c'
        },
        escortSpawn: {
          type: 'INTERCEPTOR',
          count: 2,
          interval: 15.0            // seconds between escort waves
        },
        movement: {
          pattern: 'lateralOscillate',
          speed: 100,               // doubled speed
          amplitude: 280
        },
        visualFX: {
          overheatGlow: true,
          flickerRate: 8,
          sparksEmission: true
        }
      }
    },

    defeat: {
      explosionSequence: [
        { delay: 0, target: 'leftPod', type: 'moduleDetach' },
        { delay: 0.4, target: 'rightPod', type: 'moduleDetach' },
        { delay: 1.0, target: 'core', type: 'massiveFlirFlash' }
      ],
      screenShakeIntensity: 12,
      screenFlashColor: '#ffb703',
      debrisPieceCount: 24
    }
  },

  BOSS_APEX_DREADNOUGHT: {
    id: 'BOSS_APEX_DREADNOUGHT',
    name: 'APEX SUBMERSIBLE DREADNOUGHT',
    class: 'APEX TARGET',
    subtitle: 'Submersible Titan Flagship',
    description: 'Campaign final boss. 3-phase escalating nightmare: sub-space teleportation, sweeping tactical beam, and enraged desperation barrage.',
    sector: 10,

    stats: {
      totalHp: 2000,
      segments: {
        forwardArray:  { hp: 300, armor: 1.0 },
        beamEmitter:   { hp: 400, armor: 1.5 },
        midSection:    { hp: 500, armor: 2.0 },
        engineBank:    { hp: 300, armor: 1.0 },
        core:          { hp: 500, armor: 2.5 }
      },
      speed: 1.0,
      scoreValue: 15000,
      contactDamage: 50
    },

    thermal: {
      phase1: {
        core:    '#8b5cf6',
        mid:     '#6d3fd4',
        outer:   '#2d1a5e',
        glow:    'rgba(139, 92, 246, 0.6)',
        trail:   'rgba(139, 92, 246, 0.25)'
      },
      phase2: {
        core:    '#dc2626',
        mid:     '#b91c1c',
        outer:   '#450a0a',
        glow:    'rgba(220, 38, 38, 0.7)',
        trail:   'rgba(220, 38, 38, 0.3)'
      },
      phase3: {
        core:    '#fbbf24',
        mid:     '#f59e0b',
        outer:   '#78350f',
        glow:    'rgba(251, 191, 36, 0.85)',
        trail:   'rgba(251, 191, 36, 0.4)',
        overloadWhite: '#ffffff'
      }
    },

    render: {
      bodyStyle: 'dreadnought',
      totalWidth: 3.0,
      totalLength: 2.2,
      hullSegments: 5,
      spineHardpoints: 4,
      forwardSensorArray: true,
      midBeamEmitter: true,
      aftEngineBank: true,
      armorPlateRows: 8,
      greebleDetail: 'heavy'
    },

    phases: {
      phase1: {
        name: 'Submerge Dash',
        description: 'Periodically submerges (fades out), teleports, surfaces with shockwave. Fires homing torpedo salvos.',
        trigger: 'onSpawn',
        hpRange: { min: 0.5, max: 1.0 },   // active 100%-50% HP
        submerge: {
          fadeOutDuration: 0.6,     // seconds
          submergeDuration: 2.0,
          surfaceShockwaveRadius: 150,
          invulnerableDuring: true,
          rippleFX: true
        },
        torpedoAttack: {
          type: 'homingSalvo',
          torpedoCount: 3,
          torpedoSpeed: 180,
          torpedoTurnRate: 2.5,     // radians/sec homing correction
          cooldown: 4.0,
          torpedoSize: 5,
          color: '#8b5cf6',
          smokeTrail: true
        },
        movement: {
          pattern: 'teleportOscillate',
          submergeCooldown: 6.0     // seconds between submerge cycles
        }
      },
      phase2: {
        name: 'Heavy Sweeping Beam',
        description: 'Anchors center-screen. Fires sweeping tactical beam with rotation gap. Point-defense turrets active.',
        trigger: 'hpBelow50',
        hpRange: { min: 0.25, max: 0.5 },
        beamAttack: {
          type: 'sweepingBeam',
          beamWidth: 40,
          beamLength: 1200,         // extends full screen
          rotationSpeed: 0.4,       // radians/sec
          gapAngle: 45,             // degrees safe gap
          chargeTime: 1.5,          // seconds charge telegraph
          activeDuration: 8.0,
          cooldown: 4.0,
          color: '#dc2626',
          coronaFX: true
        },
        pointDefense: {
          type: 'aimedBurst',
          burstCount: 2,
          projectileSpeed: 350,
          cooldown: 2.0,
          projectileSize: 3.5,
          color: '#f87171'
        },
        movement: {
          pattern: 'anchorCenter',
          anchorX: 0.5,
          anchorY: 0.25
        }
      },
      phase3: {
        name: 'Enraged Desperation',
        description: 'HP below 25%. Everything fires simultaneously. Spawns Kamikazes. Hull cracking with energy leaks.',
        trigger: 'hpBelow25',
        hpRange: { min: 0, max: 0.25 },
        attacks: {
          torpedoes: {
            torpedoCount: 5,
            cooldown: 3.0,
            torpedoSpeed: 220,
            color: '#fbbf24'
          },
          beam: {
            rotationSpeed: 0.8,     // doubled rotation
            gapAngle: 30,           // smaller gap
            color: '#fbbf24'
          },
          radialBurst: {
            projectileCount: 16,
            projectileSpeed: 250,
            cooldown: 2.5,
            color: '#ffffff'
          },
          kamikazeSpawn: {
            count: 2,
            interval: 10.0
          }
        },
        movement: {
          pattern: 'erraticOscillate',
          speed: 80,
          amplitude: 250,
          jitter: 40
        },
        visualFX: {
          hullCracking: true,
          energyLeaks: true,
          screenShake: 4,           // persistent shake intensity
          crtGlitch: true,
          flickerRate: 12
        }
      }
    },

    defeat: {
      explosionSequence: [
        { delay: 0, target: 'forwardArray', type: 'segmentBreak' },
        { delay: 0.5, target: 'beamEmitter', type: 'segmentBreak' },
        { delay: 1.0, target: 'engineBank', type: 'segmentBreak' },
        { delay: 1.5, target: 'midSection', type: 'segmentBreak' },
        { delay: 2.5, target: 'core', type: 'massiveDetonation' }
      ],
      screenWhiteFlash: true,
      screenShakeIntensity: 20,
      screenFlashColor: '#ffffff',
      debrisPieceCount: 40,
      victoryFanfare: true
    }
  }
};


// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Returns enemy config by ID string
 * @param {string} id - RECON_BUGGY | INTERCEPTOR | SAM_TURRET | KAMIKAZE_DRONE | RADAR_JAMMER
 * @returns {object|null}
 */
export function getEnemyById(id) {
  return ENEMY_TYPES[id?.toUpperCase()] || null;
}

/**
 * Returns boss config by ID string
 * @param {string} id - BOSS_MOBILE_COMMAND | BOSS_APEX_DREADNOUGHT
 * @returns {object|null}
 */
export function getBossById(id) {
  return BOSS_TYPES[id?.toUpperCase()] || null;
}

/**
 * Returns array of all enemy configs (no bosses)
 * @returns {object[]}
 */
export function getAllEnemies() {
  return Object.values(ENEMY_TYPES);
}

/**
 * Returns array of all boss configs
 * @returns {object[]}
 */
export function getAllBosses() {
  return Object.values(BOSS_TYPES);
}

/**
 * Returns all entity configs (enemies + bosses combined)
 * @returns {object[]}
 */
export function getAllHostiles() {
  return [...Object.values(ENEMY_TYPES), ...Object.values(BOSS_TYPES)];
}

/**
 * Returns enemies available for a specific wave number
 * @param {number} waveNumber
 * @returns {object[]}
 */
export function getEnemiesForWave(waveNumber) {
  return Object.values(ENEMY_TYPES).filter(e => waveNumber >= e.spawn.minWave);
}

/**
 * Returns thermal palette for a boss at a specific phase
 * @param {string} bossId
 * @param {number} phase - 1, 2, or 3
 * @returns {object|null}
 */
export function getBossThermal(bossId, phase = 1) {
  const boss = getBossById(bossId);
  if (!boss) return null;
  const key = `phase${phase}`;
  return boss.thermal[key] || boss.thermal.phase1;
}

/**
 * Validates enemy config integrity
 * @returns {boolean}
 */
export function validateEnemyConfig() {
  const enemyIds = Object.keys(ENEMY_TYPES);
  const bossIds = Object.keys(BOSS_TYPES);

  if (enemyIds.length !== 5) {
    console.error('[enemies.js] Expected 5 enemy types, found:', enemyIds.length);
    return false;
  }

  if (bossIds.length !== 2) {
    console.error('[enemies.js] Expected 2 boss types, found:', bossIds.length);
    return false;
  }

  for (const [id, enemy] of Object.entries(ENEMY_TYPES)) {
    if (!enemy.stats || !enemy.thermal || !enemy.render || !enemy.weapon || !enemy.movement || !enemy.spawn) {
      console.error(`[enemies.js] Incomplete config for enemy: ${id}`);
      return false;
    }
    if (enemy.stats.hp <= 0) {
      console.error(`[enemies.js] Invalid HP for enemy: ${id}`);
      return false;
    }
  }

  for (const [id, boss] of Object.entries(BOSS_TYPES)) {
    if (!boss.stats || !boss.thermal || !boss.render || !boss.phases || !boss.defeat) {
      console.error(`[enemies.js] Incomplete config for boss: ${id}`);
      return false;
    }
    if (boss.stats.totalHp <= 0) {
      console.error(`[enemies.js] Invalid total HP for boss: ${id}`);
      return false;
    }
  }

  console.log('[enemies.js] ✓ Config validation passed —', enemyIds.length, 'enemies,', bossIds.length, 'bosses');
  return true;
}
