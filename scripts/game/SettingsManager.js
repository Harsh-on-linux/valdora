/**
 * SettingsManager — User Preferences & Tactical System Configuration Persistence
 * Manages audio levels, control scheme selection, visual effects (CRT/Shake),
 * pilot callsign, and localStorage synchronization.
 */

const STORAGE_KEY = 'space_shooter_settings';

export class SettingsManager {
  /**
   * Default settings state
   */
  static getDefaultSettings() {
    return {
      masterVolume: 0.8,
      sfxVolume: 0.85,
      musicVolume: 0.7,
      soundEnabled: true,
      controlScheme: 'auto', // 'auto' | 'keyboard' | 'mouse' | 'touch'
      screenShake: true,
      scanlines: true,
      pilotCallsign: 'PHANTOM'
    };
  }

  /**
   * Retrieves current settings from localStorage merged with defaults
   * @returns {object}
   */
  static getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultSettings();
      const parsed = JSON.parse(raw);
      return { ...this.getDefaultSettings(), ...parsed };
    } catch (err) {
      console.warn('[SettingsManager] Failed to parse saved settings, using defaults:', err);
      return this.getDefaultSettings();
    }
  }

  /**
   * Saves partial or full settings updates to localStorage
   * @param {object} patch
   * @returns {object} updated settings
   */
  static saveSettings(patch = {}) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Apply immediate global effects
      this.applySettings(updated);

      // Dispatch event for UI and engine reactivity
      window.dispatchEvent(new CustomEvent('settings:updated', { detail: updated }));
      return updated;
    } catch (err) {
      console.error('[SettingsManager] Failed to persist settings:', err);
      return this.getSettings();
    }
  }

  /**
   * Applies runtime side-effects of settings (e.g. scanlines visibility, audio gain)
   * @param {object} [settings]
   */
  static applySettings(settings = this.getSettings()) {
    // 1. CRT Scanlines visibility
    const scanlinesEl = document.querySelector('.scanlines-overlay');
    if (scanlinesEl) {
      scanlinesEl.style.display = settings.scanlines !== false ? 'block' : 'none';
    }

    // 2. Control Scheme attribute on root
    const uiRoot = document.getElementById('ui-root');
    if (uiRoot) {
      uiRoot.setAttribute('data-control-scheme', settings.controlScheme || 'auto');
    }
    document.body.setAttribute('data-control-scheme', settings.controlScheme || 'auto');
  }

  /**
   * Resets all settings to factory default
   * @returns {object} default settings
   */
  static resetDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[SettingsManager] Error resetting settings:', err);
    }
    const defaults = this.getDefaultSettings();
    this.applySettings(defaults);
    window.dispatchEvent(new CustomEvent('settings:updated', { detail: defaults }));
    return defaults;
  }
}
