/**
 * Game Module Directory
 */
export { Starfield } from './Starfield.js';
export { SaveManager } from './SaveManager.js';
export { SettingsManager } from './SettingsManager.js';
export {
  LEVELS,
  getLevelById,
  getAllLevels,
  isLevelUnlocked,
  calculateStars,
  validateLevelsConfig
} from './levels.js';
export {
  DRONE_TYPES,
  WEAPON_TYPES,
  getDroneById,
  getWeaponById,
  getAllDrones,
  getAllWeapons,
  getCompatibleWeapons
} from './drones.js';
export {
  drawDronePreview,
  createDronePreviewWidget
} from './DroneRenderer.js';
export { TacticalMapLayer } from './TacticalMapLayer.js';
export { InputManager, CONTROL_SCHEMES } from './InputManager.js';
export { PlayerDrone } from './PlayerDrone.js';
export { TacticalHUDOverlay, RADAR_MODES } from './TacticalHUDOverlay.js';
export { GameEngine, ENGINE_STATE } from './GameEngine.js';
export const GAME_MODULE_VERSION = '1.3.0';

