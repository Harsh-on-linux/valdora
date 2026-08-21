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
export const GAME_MODULE_VERSION = '1.0.0';

