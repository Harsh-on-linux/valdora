/**
 * levels.js — Campaign Sector Configuration & Level Data Model
 * Defines all 10 mission theaters with star rating score thresholds, wave archetypes,
 * boss flags, environmental parameters, and map node coordinates.
 */

export const LEVELS = [
  {
    id: 1,
    code: 'SEC-01',
    name: 'ORBITAL REACH',
    subtitle: 'Low Orbit Perimeter Recon',
    description: 'Hostile recon buggy vanguard entering planetary orbit. Neutralize advance scouts and establish air superiority.',
    isBoss: false,
    requiredSector: 1,
    waveCount: 3,
    enemyWaves: ['recon_buggy'],
    targetScore: 2500,
    scoreThresholds: { star1: 1000, star2: 2000, star3: 2500 },
    rewardStars: 3,
    hazardType: 'NONE',
    mapPosition: { x: 8, y: 52 },
    environment: {
      bgTint: '#00f0ff',
      starDensity: 1.0,
      warpSpeed: 1.0
    }
  },
  {
    id: 2,
    code: 'SEC-02',
    name: 'ASTEROID FRINGE',
    subtitle: 'Dense Debris Field Navigation',
    description: 'Hostile interceptors maneuvering within dense micrometeorite belt. Exercise lateral evasion against sinusoidal flight paths.',
    isBoss: false,
    requiredSector: 2,
    waveCount: 4,
    enemyWaves: ['recon_buggy', 'interceptor_jet'],
    targetScore: 5000,
    scoreThresholds: { star1: 2500, star2: 4000, star3: 5000 },
    rewardStars: 3,
    hazardType: 'MICROMETEORS',
    mapPosition: { x: 18, y: 32 },
    environment: {
      bgTint: '#2dd4dc',
      starDensity: 1.2,
      warpSpeed: 1.15
    }
  },
  {
    id: 3,
    code: 'SEC-03',
    name: 'TURRET OUTPOST',
    subtitle: 'Fortified Ground Station Perimeter',
    description: 'Automated SAM site defense batteries anchored in lower orbit. Flak cannons tracking your telemetry. Target and destroy fortified outposts.',
    isBoss: false,
    requiredSector: 3,
    waveCount: 4,
    enemyWaves: ['recon_buggy', 'sam_turret', 'interceptor_jet'],
    targetScore: 8000,
    scoreThresholds: { star1: 4000, star2: 6500, star3: 8000 },
    rewardStars: 3,
    hazardType: 'FLAK_BURSTS',
    mapPosition: { x: 28, y: 64 },
    environment: {
      bgTint: '#ffb703',
      starDensity: 1.1,
      warpSpeed: 1.05
    }
  },
  {
    id: 4,
    code: 'SEC-04',
    name: 'INVASION VECTOR',
    subtitle: 'Heavy Swarm & Kamikaze Incursion',
    description: 'Massive hostile assault force incoming. High-speed dive-bombing Kamikaze drones detected. Eliminate targets before impact.',
    isBoss: false,
    requiredSector: 4,
    waveCount: 5,
    enemyWaves: ['recon_buggy', 'interceptor_jet', 'kamikaze_drone'],
    targetScore: 12000,
    scoreThresholds: { star1: 6000, star2: 9500, star3: 12000 },
    rewardStars: 3,
    hazardType: 'DIVE_BOMBERS',
    mapPosition: { x: 38, y: 36 },
    environment: {
      bgTint: '#e8364b',
      starDensity: 1.4,
      warpSpeed: 1.3
    }
  },
  {
    id: 5,
    code: 'SEC-05',
    name: 'MOBILE COMMAND',
    subtitle: 'HVT Armored Fortress Encounter',
    description: 'CRITICAL THREAT: High-Value Target battle fortress detected. Equipped with 360-degree radial flak arrays, fighter escorts, and core overdrive.',
    isBoss: true,
    bossName: 'HVT MOBILE COMMAND CENTER',
    requiredSector: 5,
    waveCount: 3,
    enemyWaves: ['interceptor_jet', 'sam_turret', 'boss_mobile_command'],
    targetScore: 20000,
    scoreThresholds: { star1: 10000, star2: 15000, star3: 20000 },
    rewardStars: 3,
    hazardType: 'RADIAL_FLAK',
    mapPosition: { x: 48, y: 55 },
    environment: {
      bgTint: '#ff003c',
      starDensity: 1.6,
      warpSpeed: 1.4
    }
  },
  {
    id: 6,
    code: 'SEC-06',
    name: 'NEBULA GAUNTLET',
    subtitle: 'Ionized Plasma Storm',
    description: 'Ionized nebula clouds causing sensor distortions. Mixed waves of fast interceptors and fortified SAM turrets.',
    isBoss: false,
    requiredSector: 6,
    waveCount: 5,
    enemyWaves: ['interceptor_jet', 'sam_turret', 'kamikaze_drone'],
    targetScore: 26000,
    scoreThresholds: { star1: 14000, star2: 20000, star3: 26000 },
    rewardStars: 3,
    hazardType: 'ION_STORM',
    mapPosition: { x: 58, y: 30 },
    environment: {
      bgTint: '#a78bfa',
      starDensity: 1.8,
      warpSpeed: 1.35
    }
  },
  {
    id: 7,
    code: 'SEC-07',
    name: 'JAMMER CORRIDOR',
    subtitle: 'Electronic Warfare Theater',
    description: 'Destructible radar signal jammers obfuscating enemy targeting vectors. Destroy jamming pods to restore weapon lock.',
    isBoss: false,
    requiredSector: 7,
    waveCount: 5,
    enemyWaves: ['recon_buggy', 'interceptor_jet', 'radar_jammer', 'sam_turret'],
    targetScore: 32000,
    scoreThresholds: { star1: 18000, star2: 25000, star3: 32000 },
    rewardStars: 3,
    hazardType: 'RADAR_JAMMERS',
    mapPosition: { x: 68, y: 62 },
    environment: {
      bgTint: '#2dd4dc',
      starDensity: 1.5,
      warpSpeed: 1.25
    }
  },
  {
    id: 8,
    code: 'SEC-08',
    name: 'SIEGE PLATFORM',
    subtitle: 'Heavy Orbital Gun Battery',
    description: 'Dual automated defense platforms protected by proximity minefields and constant kamikaze dive-bombers.',
    isBoss: false,
    requiredSector: 8,
    waveCount: 6,
    enemyWaves: ['sam_turret', 'kamikaze_drone', 'interceptor_jet', 'proximity_mine'],
    targetScore: 40000,
    scoreThresholds: { star1: 22000, star2: 32000, star3: 40000 },
    rewardStars: 3,
    hazardType: 'PROXIMITY_MINES',
    mapPosition: { x: 78, y: 38 },
    environment: {
      bgTint: '#e8991a',
      starDensity: 1.7,
      warpSpeed: 1.45
    }
  },
  {
    id: 9,
    code: 'SEC-09',
    name: 'DREADNOUGHT APPROACH',
    subtitle: 'Final Perimeter Outer Ring',
    description: 'Apex fleet escort blockade. Dense, relentless swarms testing all weapon systems before reaching the command flagship.',
    isBoss: false,
    requiredSector: 9,
    waveCount: 6,
    enemyWaves: ['recon_buggy', 'interceptor_jet', 'sam_turret', 'kamikaze_drone', 'radar_jammer'],
    targetScore: 50000,
    scoreThresholds: { star1: 28000, star2: 40000, star3: 50000 },
    rewardStars: 3,
    hazardType: 'HEAVY_GAUNTLET',
    mapPosition: { x: 86, y: 64 },
    environment: {
      bgTint: '#e8364b',
      starDensity: 2.0,
      warpSpeed: 1.6
    }
  },
  {
    id: 10,
    code: 'SEC-10',
    name: 'APEX TARGET',
    subtitle: 'Submersible Titan Dreadnought',
    description: 'CAMPAIGN CLIMAX: 3-Phase apex dreadnought. Sub-space teleport dashes, sweeping tactical particle beam, and enraged desperation barrage.',
    isBoss: true,
    bossName: 'APEX SUBMERSIBLE DREADNOUGHT',
    requiredSector: 10,
    waveCount: 4,
    enemyWaves: ['interceptor_jet', 'boss_apex_dreadnought'],
    targetScore: 75000,
    scoreThresholds: { star1: 40000, star2: 60000, star3: 75000 },
    rewardStars: 3,
    hazardType: 'SWEEPING_BEAMS',
    mapPosition: { x: 93, y: 46 },
    environment: {
      bgTint: '#a78bfa',
      starDensity: 2.4,
      warpSpeed: 1.8
    }
  }
];

/**
 * Retrieves level object by numeric ID (1-10)
 * @param {number} id
 * @returns {object|null}
 */
export function getLevelById(id) {
  const numericId = parseInt(id, 10);
  return LEVELS.find(lvl => lvl.id === numericId) || null;
}

/**
 * Returns all levels array
 * @returns {Array<object>}
 */
export function getAllLevels() {
  return [...LEVELS];
}

/**
 * Checks if a specific sector is unlocked based on maximum sector unlocked
 * @param {number} levelId
 * @param {number} maxUnlocked
 * @returns {boolean}
 */
export function isLevelUnlocked(levelId, maxUnlocked = 1) {
  return parseInt(levelId, 10) <= parseInt(maxUnlocked, 10);
}

/**
 * Calculates number of stars earned for a given score in a level
 * @param {number} levelId
 * @param {number} score
 * @returns {number} 0, 1, 2, or 3
 */
export function calculateStars(levelId, score = 0) {
  const level = getLevelById(levelId);
  if (!level || !level.scoreThresholds) return 0;

  if (score >= level.scoreThresholds.star3) return 3;
  if (score >= level.scoreThresholds.star2) return 2;
  if (score >= level.scoreThresholds.star1) return 1;
  return 0;
}

/**
 * Validates level config integrity
 * @returns {boolean}
 */
export function validateLevelsConfig() {
  if (!Array.isArray(LEVELS) || LEVELS.length !== 10) {
    console.error('[levels.js] Invalid level count. Expected 10 levels, found:', LEVELS?.length);
    return false;
  }

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    if (lvl.id !== i + 1) {
      console.error(`[levels.js] Level ID mismatch at index ${i}. Expected ${i + 1}, got ${lvl.id}`);
      return false;
    }
    if (!lvl.name || !lvl.scoreThresholds || !lvl.mapPosition) {
      console.error(`[levels.js] Incomplete level data for sector ${lvl.id}`);
      return false;
    }
  }

  return true;
}
