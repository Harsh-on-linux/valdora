/**
 * SoundManager — Pure Web Audio API Sound Synthesizer
 * Generates all sci-fi tactical cockpit audio procedurally with zero external audio assets.
 * Handles UI beeps, confirm chimes, denial tones, toggle switches, power hums, and radar sweeps.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = true;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.85;
    this.musicVolume = 0.7;
    this.isInitialized = false;

    // Load saved settings if available
    try {
      if (typeof localStorage !== 'undefined') {
        const savedSettings = localStorage.getItem('space_shooter_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (typeof parsed.masterVolume === 'number') this.masterVolume = parsed.masterVolume;
          if (typeof parsed.sfxVolume === 'number') this.sfxVolume = parsed.sfxVolume;
          if (typeof parsed.musicVolume === 'number') this.musicVolume = parsed.musicVolume;
          if (typeof parsed.soundEnabled === 'boolean') this.enabled = parsed.soundEnabled;
        }
      }
    } catch (e) {
      console.warn('[SoundManager] Could not read audio settings from localStorage:', e);
    }

    // Auto-unlock Web Audio API on first user gesture
    if (typeof window !== 'undefined') {
      this._bindUnlockEvents();

      // Listen for settings updates dynamically
      window.addEventListener('settings:updated', (e) => {
        if (e.detail) {
          if (typeof e.detail.masterVolume === 'number') this.setMasterVolume(e.detail.masterVolume);
          if (typeof e.detail.sfxVolume === 'number') this.setSfxVolume(e.detail.sfxVolume);
          if (typeof e.detail.musicVolume === 'number') this.setMusicVolume(e.detail.musicVolume);
          if (typeof e.detail.soundEnabled === 'boolean') this.setEnabled(e.detail.soundEnabled);
        }
      });
    }
  }

  /**
   * Initializes the AudioContext and gain graph
   */
  init() {
    if (this.isInitialized && this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[SoundManager] Web Audio API is not supported in this browser.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
      console.log('🔊 SoundManager — Web Audio Synth initialized successfully.');
    } catch (err) {
      console.error('[SoundManager] Failed to initialize Web Audio:', err);
    }
  }

  _bindUnlockEvents() {
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  /**
   * Ensure audio context is running before playing a sound
   */
  _ensureRunning() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.isInitialized && this.enabled && this.ctx;
  }

  /**
   * Play high-tech UI hover chirp (crisp micro-blip)
   */
  playHover() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(3600, now + 0.025);

    gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Play standard tactical button click
   */
  playClick() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(700, now + 0.045);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2800, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.035);

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.055);
    osc2.stop(now + 0.055);
  }

  /**
   * Play tactical mission launch / confirm power-up chime
   */
  playStart() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    // Harmonic chords (Root, 5th, Octave, 9th)
    const freqs = [330, 495, 660, 990];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const startTime = now + idx * 0.035;
      const duration = 0.45;

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * 0.8, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);
      filter.frequency.exponentialRampToValueAtTime(4500, startTime + duration * 0.5);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });

    // Sub-bass impact thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    subGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + 0.36);
  }

  /**
   * Play mission continue / cockpit system power hum
   */
  playContinue() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const freqs = [440, 554, 659, 880];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = now + idx * 0.03;
      const duration = 0.38;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.14 * this.sfxVolume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  }

  /**
   * Play denial / error tone (low dissonant buzz)
   */
  playDeny() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(125, now);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(175, now); // Dissonant interval

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.18);
  }

  /**
   * Play toggle switch sound (mechanical-electronic dual pulse)
   * @param {boolean} [isOn=true]
   */
  playToggle(isOn = true) {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (isOn) {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.04);
    } else {
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
    }

    gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play micro-slider tick
   */
  playSlider() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1900, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.015);

    gain.gain.setValueAtTime(0.04 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  /**
   * Play radar sweep ping / blip
   */
  playRadarPing() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Play tactical Active vs Passive radar mode toggle sound
   * @param {boolean} [isActive=true]
   */
  playRadarToggle(isActive = true) {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    if (isActive) {
      // Active Radar: Uplink sweep chirp
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
      osc2.frequency.setValueAtTime(475, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    } else {
      // Passive Radar: Low-frequency stealth silence dampening tone
      osc1.frequency.setValueAtTime(1800, now);
      osc1.frequency.exponentialRampToValueAtTime(500, now + 0.09);
      osc2.frequency.setValueAtTime(900, now);
      osc2.frequency.exponentialRampToValueAtTime(250, now + 0.09);
    }

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.1);
    osc2.stop(now + 0.1);
  }

  /**
   * Play target acquisition lock-on tone (rapid dual-tone burst)
   */
  playTargetLock() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    [0, 0.05, 0.1].forEach((offset) => {
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1760, t); // A6 note
      osc.frequency.setValueAtTime(2200, t + 0.02);

      gain.gain.setValueAtTime(0.12 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.045);
    });
  }

  /**
   * Play high-priority warning alarm (critical hull/shield or overheat)
   */
  playWarning() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.07);

    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play procedural Vulcan Cannon gunfire report
   * @param {number} [barrelIndex=0] - Alternates pitch slightly for twin-barrel realism
   */
  playVulcanFire(barrelIndex = 0) {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;
    const pitchMod = barrelIndex % 2 === 0 ? 1.0 : 0.93;

    // 1. Kinetic Pop & Bass Body (Punchy descending oscillator)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 * pitchMod, now);
    osc.frequency.exponentialRampToValueAtTime(65 * pitchMod, now + 0.035);

    gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);

    // 2. High-frequency Muzzle Crack
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(1400 * pitchMod, now);
    crackOsc.frequency.exponentialRampToValueAtTime(300, now + 0.018);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(3.0, now);

    crackGain.gain.setValueAtTime(0.09 * this.sfxVolume, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    crackOsc.connect(filter);
    filter.connect(crackGain);
    crackGain.connect(this.sfxGain);

    crackOsc.start(now);
    crackOsc.stop(now + 0.022);
  }

  /**
   * Play ballistic hit impact / armor defilade ping
   */
  playHitImpact() {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.03);

    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Play combat explosion burst
   * @param {number} [intensity=1.0]
   */
  playExplosion(intensity = 1.0) {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    // Low rumble boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    const dur = 0.35 * Math.max(0.5, intensity);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume * Math.min(1.5, intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  /**
   * Set Master Volume (0.0 to 1.0)
   * @param {number} vol
   */
  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, this.ctx.currentTime);
    }
  }

  /**
   * Set SFX Volume (0.0 to 1.0)
   * @param {number} vol
   */
  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  /**
   * Set Music Volume (0.0 to 1.0)
   * @param {number} vol
   */
  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  /**
   * Play test sound for audio calibration
   * @param {number} [freq=880]
   */
  playTestTone(freq = 880) {
    if (!this._ensureRunning()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.08);

    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Toggle mute / enable
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, this.ctx.currentTime);
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
