/**
 * SettingsScreen — Audio, Control Schemes & Tactical Display Configuration
 * Persists all settings to localStorage via SettingsManager, provides real-time
 * Web Audio gain adjustments, control scheme selection, visual toggles, and data management.
 */

import { SettingsManager, SaveManager } from '../../game/index.js';
import { soundManager } from '../../audio/index.js';
import { createModal } from '../components.js';

export const SettingsScreen = {
  _modal: null,

  mount(container, data = {}, router) {
    const settings = SettingsManager.getSettings();
    const save = SaveManager.getSaveData();

    container.innerHTML = `
      <div class="console-panel settings-panel">
        <!-- Header -->
        <div class="screen-header">
          <div>
            <h2 class="hud-heading">SYSTEM SETTINGS</h2>
            <p class="hud-subtitle" style="margin: 0; font-size: 0.58rem;">COCKPIT HARDWARE & TELEMETRY CONFIGURATION</p>
          </div>
          <span class="hud-badge">CONFIG // TAC-01</span>
        </div>

        <div class="settings-scroll-area">
          <!-- ═══════════ SECTION 1: AUDIO CALIBRATION ═══════════ -->
          <div class="settings-group">
            <div class="settings-group-header">
              <span class="settings-group-title">🔊 AUDIO SYNTHESIS & CALIBRATION</span>
              <button class="tac-btn btn-sm" id="btn-audio-test" style="font-size: 0.55rem; padding: 2px 6px;">
                <span>TEST TONE</span>
              </button>
            </div>

            <!-- Master Audio Toggle -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">MASTER AUDIO SYNTH</span>
                <span class="setting-desc">Enable or mute all procedural audio output</span>
              </div>
              <div class="layer-toggle ${settings.soundEnabled ? 'on' : 'off'}" id="toggle-audio-enabled" title="Toggle Sound">
                <span class="toggle-knob"></span>
                <span class="toggle-label-text">${settings.soundEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            <!-- Master Volume Slider -->
            <div class="setting-slider-row">
              <div class="setting-slider-header">
                <span class="setting-label">MASTER VOLUME</span>
                <span class="setting-val" id="val-master-vol">${Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <div class="custom-slider-track" id="slider-master-vol" data-param="masterVolume">
                <div class="custom-slider-fill fill-cyan" style="width: ${settings.masterVolume * 100}%;"></div>
                <input type="range" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" class="slider-native" id="input-master-vol" aria-label="Master Volume">
              </div>
            </div>

            <!-- SFX Volume Slider -->
            <div class="setting-slider-row">
              <div class="setting-slider-header">
                <span class="setting-label">SFX / WEAPONS VOLUME</span>
                <span class="setting-val" id="val-sfx-vol">${Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <div class="custom-slider-track" id="slider-sfx-vol" data-param="sfxVolume">
                <div class="custom-slider-fill fill-green" style="width: ${settings.sfxVolume * 100}%;"></div>
                <input type="range" min="0" max="100" value="${Math.round(settings.sfxVolume * 100)}" class="slider-native" id="input-sfx-vol" aria-label="SFX Volume">
              </div>
            </div>

            <!-- Music Volume Slider -->
            <div class="setting-slider-row">
              <div class="setting-slider-header">
                <span class="setting-label">TACTICAL SYNTH MUSIC VOLUME</span>
                <span class="setting-val" id="val-music-vol">${Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <div class="custom-slider-track" id="slider-music-vol" data-param="musicVolume">
                <div class="custom-slider-fill fill-amber" style="width: ${settings.musicVolume * 100}%;"></div>
                <input type="range" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" class="slider-native" id="input-music-vol" aria-label="Music Volume">
              </div>
            </div>
          </div>

          <!-- ═══════════ SECTION 2: FLIGHT CONTROLS ═══════════ -->
          <div class="settings-group">
            <div class="settings-group-header">
              <span class="settings-group-title">🕹️ FLIGHT & COMBAT INPUT MODE</span>
            </div>

            <div class="control-schemes-grid">
              <button class="scheme-btn ${settings.controlScheme === 'auto' ? 'active' : ''}" data-scheme="auto">
                <span class="scheme-icon">⚙</span>
                <span class="scheme-title">AUTO-DETECT</span>
                <span class="scheme-desc">Touch on mobile, Keyboard/Mouse on desktop</span>
              </button>

              <button class="scheme-btn ${settings.controlScheme === 'keyboard' ? 'active' : ''}" data-scheme="keyboard">
                <span class="scheme-icon">⌨</span>
                <span class="scheme-title">KEYBOARD</span>
                <span class="scheme-desc">WASD / Arrow Keys + Space to fire</span>
              </button>

              <button class="scheme-btn ${settings.controlScheme === 'mouse' ? 'active' : ''}" data-scheme="mouse">
                <span class="scheme-icon">🖱</span>
                <span class="scheme-title">DIRECT MOUSE</span>
                <span class="scheme-desc">Ship follows cursor, Left-Click to fire</span>
              </button>

              <button class="scheme-btn ${settings.controlScheme === 'touch' ? 'active' : ''}" data-scheme="touch">
                <span class="scheme-icon">📱</span>
                <span class="scheme-title">TOUCH / JOYSTICK</span>
                <span class="scheme-desc">Virtual D-Pad & on-screen combat buttons</span>
              </button>
            </div>
          </div>

          <!-- ═══════════ SECTION 3: VISUAL EFFECTS & HAPTICS ═══════════ -->
          <div class="settings-group">
            <div class="settings-group-header">
              <span class="settings-group-title">📺 TACTICAL VISUALS & HAPTICS</span>
            </div>

            <!-- Screen Shake Toggle -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">SCREEN SHAKE & IMPACT JUICE</span>
                <span class="setting-desc">Tactical camera vibration on heavy impacts</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="tac-btn btn-sm" id="btn-test-shake" style="font-size: 0.55rem; padding: 2px 6px;">
                  <span>TEST SHAKE</span>
                </button>
                <div class="layer-toggle ${settings.screenShake ? 'on' : 'off'}" id="toggle-screen-shake" title="Toggle Screen Shake">
                  <span class="toggle-knob"></span>
                  <span class="toggle-label-text">${settings.screenShake ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>

            <!-- CRT Scanlines Toggle -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">CRT SCANLINES & VIGNETTE</span>
                <span class="setting-desc">Retro scanline overlay & phosphor distortion</span>
              </div>
              <div class="layer-toggle ${settings.scanlines !== false ? 'on' : 'off'}" id="toggle-scanlines" title="Toggle Scanlines">
                <span class="toggle-knob"></span>
                <span class="toggle-label-text">${settings.scanlines !== false ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          <!-- ═══════════ SECTION 4: PILOT IDENTITY ═══════════ -->
          <div class="settings-group">
            <div class="settings-group-header">
              <span class="settings-group-title">🎖️ PILOT PROFILE & CALLSIGN</span>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">PILOT CALLSIGN</span>
                <span class="setting-desc">Broadcasted on tactical telemetry & leaderboard</span>
              </div>
              <div class="callsign-input-wrapper">
                <input type="text" id="input-callsign" class="callsign-input" maxlength="12" value="${escapeHtml(settings.pilotCallsign || save.pilotCallsign || 'PHANTOM')}" placeholder="PHANTOM">
              </div>
            </div>
          </div>

          <!-- ═══════════ SECTION 5: DATA MANAGEMENT ═══════════ -->
          <div class="settings-group">
            <div class="settings-group-header">
              <span class="settings-group-title">💾 DATA MANAGEMENT</span>
            </div>

            <div class="data-mgmt-row">
              <button class="console-btn btn-secondary btn-sm" id="btn-reset-defaults" style="flex: 1;">
                <span>↺ RESET DEFAULTS</span>
              </button>
              <button class="console-btn btn-danger btn-sm" id="btn-clear-campaign" style="flex: 1;">
                <span>⚠ ERASE CAMPAIGN SAVE</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Navigation -->
        <div class="screen-footer" style="padding-top: 10px; border-top: 1px solid rgba(45, 212, 220, 0.15);">
          <button class="console-btn btn-secondary" data-nav="landing" style="flex: 1;">
            <span>◀ RETURN TO COCKPIT</span>
          </button>
          <button class="console-btn btn-primary" data-nav="howToPlay" style="flex: 1;">
            <span>❓ HOW TO PLAY MANUAL</span>
          </button>
        </div>
      </div>
    `;

    // ═══════════════════════════════════════════════════════════════════
    //  INTERACTIVE HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    // 1. Audio Enable Toggle
    const audioToggle = container.querySelector('#toggle-audio-enabled');
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        const wasOn = audioToggle.classList.contains('on');
        const nextState = !wasOn;
        updateToggleState(audioToggle, nextState);
        soundManager.setEnabled(nextState);
        soundManager.playToggle(nextState);
        SettingsManager.saveSettings({ soundEnabled: nextState });
      });
    }

    // 2. Audio Volume Sliders
    const bindSlider = (inputId, valId, fillSelector, paramKey, onUpdate) => {
      const input = container.querySelector(inputId);
      const valDisplay = container.querySelector(valId);
      const fill = container.querySelector(fillSelector);
      if (!input) return;

      input.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const floatVal = val / 100;
        if (valDisplay) valDisplay.textContent = `${val}%`;
        if (fill) fill.style.width = `${val}%`;
        onUpdate(floatVal);
        SettingsManager.saveSettings({ [paramKey]: floatVal });
      });

      input.addEventListener('change', () => {
        soundManager.playSlider();
      });
    };

    bindSlider('#input-master-vol', '#val-master-vol', '#slider-master-vol .custom-slider-fill', 'masterVolume', (v) => {
      soundManager.setMasterVolume(v);
    });

    bindSlider('#input-sfx-vol', '#val-sfx-vol', '#slider-sfx-vol .custom-slider-fill', 'sfxVolume', (v) => {
      soundManager.setSfxVolume(v);
    });

    bindSlider('#input-music-vol', '#val-music-vol', '#slider-music-vol .custom-slider-fill', 'musicVolume', (v) => {
      soundManager.setMusicVolume(v);
    });

    // 3. Audio Test Tone Button
    const audioTestBtn = container.querySelector('#btn-audio-test');
    if (audioTestBtn) {
      audioTestBtn.addEventListener('click', () => {
        soundManager.playTestTone(880);
      });
    }

    // 4. Control Scheme Buttons
    const schemeButtons = container.querySelectorAll('.scheme-btn');
    schemeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        schemeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scheme = btn.getAttribute('data-scheme') || 'auto';
        SettingsManager.saveSettings({ controlScheme: scheme });
      });
    });

    // 5. Screen Shake Toggle & Test
    const shakeToggle = container.querySelector('#toggle-screen-shake');
    if (shakeToggle) {
      shakeToggle.addEventListener('click', () => {
        const wasOn = shakeToggle.classList.contains('on');
        const nextState = !wasOn;
        updateToggleState(shakeToggle, nextState);
        soundManager.playToggle(nextState);
        SettingsManager.saveSettings({ screenShake: nextState });
      });
    }

    const testShakeBtn = container.querySelector('#btn-test-shake');
    if (testShakeBtn) {
      testShakeBtn.addEventListener('click', () => {
        soundManager.playStart();
        triggerScreenShake();
      });
    }

    // 6. Scanlines Toggle
    const scanlinesToggle = container.querySelector('#toggle-scanlines');
    if (scanlinesToggle) {
      scanlinesToggle.addEventListener('click', () => {
        const wasOn = scanlinesToggle.classList.contains('on');
        const nextState = !wasOn;
        updateToggleState(scanlinesToggle, nextState);
        soundManager.playToggle(nextState);
        SettingsManager.saveSettings({ scanlines: nextState });
      });
    }

    // 7. Pilot Callsign Input
    const callsignInput = container.querySelector('#input-callsign');
    if (callsignInput) {
      callsignInput.addEventListener('input', (e) => {
        const formatted = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
        e.target.value = formatted;
        SettingsManager.saveSettings({ pilotCallsign: formatted });
        SaveManager.save({ pilotCallsign: formatted });
      });
    }

    // 8. Reset Defaults
    const resetDefaultsBtn = container.querySelector('#btn-reset-defaults');
    if (resetDefaultsBtn) {
      resetDefaultsBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (confirm('Reset all system settings to default parameters?')) {
          SettingsManager.resetDefaults();
          soundManager.playStart();
          if (router) router.show('settings');
        }
      });
    }

    // 9. Erase Campaign Progress with Modal
    const clearCampaignBtn = container.querySelector('#btn-clear-campaign');
    if (clearCampaignBtn) {
      clearCampaignBtn.addEventListener('click', () => {
        soundManager.playDeny();
        const modal = createModal({
          title: '⚠️ CLASSIFIED DATA PURGE',
          content: `
            <div style="text-align: center; padding: 12px 0;">
              <p style="color: var(--red); font-weight: bold; margin-bottom: 8px;">PERMANENT SAVE RESET</p>
              <p style="color: var(--text-primary); font-size: 0.76rem; line-height: 1.5;">
                This action will permanently erase all sector unlocks, mission high scores, campaign star medals, and drone loadout preferences.
              </p>
              <p style="color: var(--amber); font-size: 0.72rem; margin-top: 10px;">
                Are you sure you want to proceed with full memory wipe?
              </p>
            </div>
          `,
          buttons: [
            {
              label: 'CANCEL',
              variant: 'secondary',
              onClick: () => modal.close()
            },
            {
              label: 'CONFIRM PURGE',
              variant: 'danger',
              onClick: () => {
                SaveManager.clearSave();
                SaveManager.startNewCampaign();
                soundManager.playStart();
                modal.close();
                if (router) router.show('landing');
              }
            }
          ]
        });
        document.body.appendChild(modal.element);
        modal.open();
      });
    }

    // 10. Navigation buttons
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const target = btn.getAttribute('data-nav');
        if (target && router) {
          router.show(target);
        }
      });
    });

    // 11. Button hover sounds
    container.querySelectorAll('button, .console-btn, .tac-btn, .scheme-btn, .layer-toggle').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundManager.playHover());
    });
  },

  unmount() {}
};

function updateToggleState(toggleEl, isActive) {
  const label = toggleEl.querySelector('.toggle-label-text');
  if (isActive) {
    toggleEl.classList.remove('off');
    toggleEl.classList.add('on');
    if (label) label.textContent = 'ON';
  } else {
    toggleEl.classList.remove('on');
    toggleEl.classList.add('off');
    if (label) label.textContent = 'OFF';
  }
}

function triggerScreenShake() {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.remove('screen-shake');
  void app.offsetWidth; // Reflow
  app.classList.add('screen-shake');
  setTimeout(() => {
    app.classList.remove('screen-shake');
  }, 450);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
