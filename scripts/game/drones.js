/**
 * drones.js — Strike Drone Chassis Data Model & Configuration
 * Defines 3 drone archetypes with tactical stats, heat-signature colors,
 * weapon compatibility, and procedural render parameters.
 *
 * Drone Types:
 *  - STRIKER  (Predator) — Balanced multi-role, moderate armor/speed
 *  - REAPER   (Heavy)    — Heavy ordnance platform, high armor, slow
 *  - GHOST    (Stealth)  — Electronic warfare, fast, fragile
 */

export const DRONE_TYPES = {
  STRIKER: {
    id: 'STRIKER',
    name: 'MQ-9 STRIKER',
    class: 'MULTI-ROLE ATTACK',
    subtitle: 'Balanced Combat Platform',
    description: 'Standard-issue multi-role strike drone. Balanced armor, speed, and weapon capacity for general-purpose engagements.',
    stats: {
      hull: 100,
      speed: 4.2,
      acceleration: 0.18,
      fireRate: 1.0,
      armor: 1.0,
      evasion: 0.6,
      radarRange: 1.0
    },
    // Heat signature color palette (FLIR thermal rendering)
    thermal: {
      core:    '#2dd4dc',   // Cyan core heat
      mid:     '#1a8f96',   // Mid-range thermal
      outer:   '#0e3538',   // Outer cooling
      glow:    'rgba(45, 212, 220, 0.6)',
      trail:   'rgba(45, 212, 220, 0.25)'
    },
    // Procedural wireframe render params
    render: {
      bodyLength: 0.72,     // Ratio of canvas height
      wingSpan: 0.65,       // Ratio of canvas width
      wingStyle: 'swept',   // swept | delta | angular
      noseStyle: 'pointed', // pointed | blunt | sensor
      engineCount: 2,
      hasTailFins: true,
      hasCanards: false
    },
    // Compatible weapon loadouts
    weapons: ['VULCAN', 'FLAK', 'LASER', 'HELLFIRE', 'ORBITAL'],
    defaultWeapon: 'VULCAN'
  },

  REAPER: {
    id: 'REAPER',
    name: 'XQ-58 REAPER',
    class: 'HEAVY STRIKE',
    subtitle: 'Armored Ordnance Platform',
    description: 'Heavy assault drone with reinforced hull plating and expanded missile bays. Slower, but devastating firepower and armor.',
    stats: {
      hull: 150,
      speed: 3.0,
      acceleration: 0.12,
      fireRate: 0.8,
      armor: 1.6,
      evasion: 0.3,
      radarRange: 1.2
    },
    thermal: {
      core:    '#e8991a',   // Amber/orange core heat
      mid:     '#b87210',   // Mid-range thermal
      outer:   '#4a3008',   // Outer cooling
      glow:    'rgba(232, 153, 26, 0.6)',
      trail:   'rgba(232, 153, 26, 0.25)'
    },
    render: {
      bodyLength: 0.78,
      wingSpan: 0.80,
      wingStyle: 'delta',
      noseStyle: 'blunt',
      engineCount: 3,
      hasTailFins: true,
      hasCanards: true
    },
    weapons: ['VULCAN', 'FLAK', 'HELLFIRE', 'ORBITAL'],
    defaultWeapon: 'HELLFIRE'
  },

  GHOST: {
    id: 'GHOST',
    name: 'RQ-180 GHOST',
    class: 'ELECTRONIC WARFARE',
    subtitle: 'Stealth Recon Interceptor',
    description: 'Ultra-fast stealth drone with ECM jamming suite. Low radar signature and high evasion, but minimal armor plating.',
    stats: {
      hull: 65,
      speed: 5.8,
      acceleration: 0.28,
      fireRate: 1.3,
      armor: 0.5,
      evasion: 0.95,
      radarRange: 0.7
    },
    thermal: {
      core:    '#a78bfa',   // Purple core heat
      mid:     '#7c5fc7',   // Mid-range thermal
      outer:   '#2d1a5e',   // Outer cooling
      glow:    'rgba(167, 139, 250, 0.6)',
      trail:   'rgba(167, 139, 250, 0.25)'
    },
    render: {
      bodyLength: 0.62,
      wingSpan: 0.72,
      wingStyle: 'angular',
      noseStyle: 'sensor',
      engineCount: 1,
      hasTailFins: false,
      hasCanards: true
    },
    weapons: ['VULCAN', 'LASER', 'HELLFIRE', 'ORBITAL'],
    defaultWeapon: 'LASER'
  }
};

/**
 * Weapon payload definitions
 */
export const WEAPON_TYPES = {
  VULCAN: {
    id: 'VULCAN',
    name: 'GAU-22 VULCAN',
    class: 'KINETIC',
    description: 'Twin rotary cannon. Max sustained kinetic DPS, ultra-low heat.',
    icon: '⦿',
    stats: { damage: 1.5, fireRate: 9.5, range: 0.7, spread: 0.05 },
    color: '#2dd4dc'
  },
  FLAK: {
    id: 'FLAK',
    name: 'MK-44 FLAK',
    class: 'EXPLOSIVE',
    description: '5-way explosive canister fan. Wide area denial, crowd control.',
    icon: '✦',
    stats: { damage: 1.2, fireRate: 3.5, range: 0.5, spread: 0.8 },
    color: '#e8991a'
  },
  LASER: {
    id: 'LASER',
    name: 'ATHENA BEAM',
    class: 'DIRECTED ENERGY',
    description: 'Piercing beam lance. Multi-target penetration with high thermal buildup.',
    icon: '◇',
    stats: { damage: 1.1, fireRate: 8.0, range: 1.0, spread: 0.0 },
    color: '#c084fc'
  },
  HELLFIRE: {
    id: 'HELLFIRE',
    name: 'AGM-114 HELLFIRE',
    class: 'GUIDED MUNITION',
    description: 'Self-propelling tracking missiles with area-of-effect warhead.',
    icon: '▲',
    stats: { damage: 2.8, fireRate: 1.5, range: 1.0, spread: 0.0 },
    color: '#ff003c'
  },
  ORBITAL: {
    id: 'ORBITAL',
    name: 'THOR STRIKE',
    class: 'ORBITAL KINETIC',
    description: 'Charged orbital bombardment. Devastating area damage.',
    icon: '⬡',
    stats: { damage: 8.0, fireRate: 0.15, range: 1.0, spread: 0.3 },
    color: '#a78bfa'
  }
};

/**
 * Returns drone config by ID
 * @param {string} id - STRIKER | REAPER | GHOST
 * @returns {object|null}
 */
export function getDroneById(id) {
  return DRONE_TYPES[id?.toUpperCase()] || null;
}

/**
 * Returns weapon config by ID
 * @param {string} id - VULCAN | FLAK | LASER | HELLFIRE | ORBITAL
 * @returns {object|null}
 */
export function getWeaponById(id) {
  if (!id) return WEAPON_TYPES.VULCAN;
  const upper = id.toUpperCase().trim();
  if (WEAPON_TYPES[upper]) return WEAPON_TYPES[upper];
  if (upper.includes('VULCAN')) return WEAPON_TYPES.VULCAN;
  if (upper.includes('FLAK')) return WEAPON_TYPES.FLAK;
  if (upper.includes('LASER') || upper.includes('ATHENA')) return WEAPON_TYPES.LASER;
  if (upper.includes('HELLFIRE') || upper.includes('MISSILE')) return WEAPON_TYPES.HELLFIRE;
  if (upper.includes('ORBITAL')) return WEAPON_TYPES.ORBITAL;
  return WEAPON_TYPES.VULCAN;
}

/**
 * Returns array of all drone configs
 * @returns {object[]}
 */
export function getAllDrones() {
  return Object.values(DRONE_TYPES);
}

/**
 * Returns array of all weapon configs
 * @returns {object[]}
 */
export function getAllWeapons() {
  return Object.values(WEAPON_TYPES);
}

/**
 * Returns weapons compatible with a drone type
 * @param {string} droneId
 * @returns {object[]}
 */
export function getCompatibleWeapons(droneId) {
  const drone = getDroneById(droneId);
  if (!drone) return [];
  return drone.weapons.map(wId => WEAPON_TYPES[wId]).filter(Boolean);
}
