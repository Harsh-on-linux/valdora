/**
 * SaveManager — Campaign Progress & Mission State Persistence
 * Handles localStorage persistence for pilot progress, unlocked sectors,
 * high scores, stars, and drone loadout configuration.
 */

const STORAGE_KEY = 'space_shooter_save';

export class SaveManager {
  /**
   * Default initial save state
   */
  static getDefaultState() {
    return {
      pilotCallsign: 'PHANTOM',
      currentSector: 1,
      maxSectorUnlocked: 1,
      totalScore: 0,
      highScore: 0,
      starsEarned: 0,
      selectedDrone: 'STRIKER',
      selectedPayload: 'VULCAN',
      sectorScores: {},
      sectorStars: {},
      createdAt: new Date().toISOString(),
      lastPlayed: null
    };
  }

  /**
   * Checks if an existing valid game save exists in localStorage
   * @returns {boolean}
   */
  static hasSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      // Valid save if progress exists (beyond fresh sector 1 with 0 score and no plays)
      return Boolean(
        data &&
        (data.maxSectorUnlocked > 1 ||
         data.currentSector > 1 ||
         data.totalScore > 0 ||
         data.highScore > 0 ||
         data.lastPlayed)
      );
    } catch (err) {
      console.warn('[SaveManager] Error reading save state:', err);
      return false;
    }
  }

  /**
   * Retrieves active save data from localStorage or fallback default
   * @returns {object}
   */
  static getSaveData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      return { ...this.getDefaultState(), ...parsed };
    } catch (err) {
      console.error('[SaveManager] Corrupt save data, loading defaults:', err);
      return this.getDefaultState();
    }
  }

  /**
   * Writes save state to localStorage
   * @param {object} patch - State updates to merge
   * @returns {object} updated save object
   */
  static save(patch = {}) {
    try {
      const current = this.getSaveData();
      const updated = {
        ...current,
        ...patch,
        lastPlayed: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('save:updated', { detail: updated }));
      return updated;
    } catch (err) {
      console.error('[SaveManager] Failed to write save state:', err);
      return this.getSaveData();
    }
  }

  /**
   * Resets save data and starts a new campaign
   * @param {string} [callsign='PHANTOM']
   * @returns {object} fresh save state
   */
  static startNewCampaign(callsign = 'PHANTOM') {
    const newState = {
      ...this.getDefaultState(),
      pilotCallsign: callsign,
      lastPlayed: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      window.dispatchEvent(new CustomEvent('save:updated', { detail: newState }));
    } catch (err) {
      console.error('[SaveManager] Error resetting save data:', err);
    }
    return newState;
  }

  /**
   * Records completed sector victory, unlocking next sector if eligible
   * @param {number} sectorId
   * @param {number} score
   * @param {number} stars
   */
  static recordSectorVictory(sectorId, score, stars = 1) {
    const data = this.getSaveData();
    const sectorKey = `sector_${sectorId}`;
    const safeScore = Math.max(0, Math.round(Number(score) || 0));
    const safeStars = Math.max(0, Math.min(3, Math.round(Number(stars) || 0)));

    const prevHighScore = data.sectorScores[sectorKey] || 0;
    const prevStars = data.sectorStars[sectorKey] || 0;
    const isNewRecord = safeScore > prevHighScore;
    const prevMaxUnlocked = data.maxSectorUnlocked || 1;

    data.sectorScores[sectorKey] = Math.max(prevHighScore, safeScore);
    data.sectorStars[sectorKey] = Math.max(prevStars, safeStars);

    // Campaign total is the sum of each sector's best result, so reopening a
    // results screen cannot inflate the profile score.
    data.totalScore = Object.values(data.sectorScores).reduce((total, value) => total + (Number(value) || 0), 0);
    data.highScore = Math.max(data.highScore, data.totalScore);
    
    // Unlock next sector up to max 10
    const nextSector = Math.min(10, sectorId + 1);
    data.maxSectorUnlocked = Math.max(data.maxSectorUnlocked, nextSector);
    data.currentSector = nextSector;

    // Recalculate total stars
    data.starsEarned = Object.values(data.sectorStars).reduce((acc, s) => acc + s, 0);

    const saved = this.save(data);
    return {
      ...saved,
      isNewRecord,
      prevHighScore,
      prevStars,
      newlyUnlocked: data.maxSectorUnlocked > prevMaxUnlocked,
      nextSectorId: nextSector
    };
  }

  /**
   * Clears all save data completely
   */
  static clearSave() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('save:cleared'));
    } catch (err) {
      console.error('[SaveManager] Error clearing save data:', err);
    }
  }
}
