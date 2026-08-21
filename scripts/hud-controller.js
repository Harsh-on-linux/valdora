/**
 * HUD Controller — Interactive Cockpit Command Interface
 * Handles toggle switches, button groups, interactive sliders,
 * live timestamp updates, subtle telemetry drift animations,
 * bottom bar navigation, and procedural Web Audio feedback.
 */

import { soundManager } from './audio/index.js';

(function initHUDController() {
  'use strict';

  // ── Wait for DOM ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    initToggles();
    initButtonGroups();
    initInteractiveSliders();
    initLiveTimestamp();
    initTelemetryDrift();
    initCollapsePanel();
    initEdgeNavigation();
    initGlobalAudioHooks();
    initSaveSync();
    console.log('🎛️ HUD Controller — All interactive systems & audio online.');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SAVE SYNCHRONIZATION — Reflect active loadout & sector in HUD
  // ═══════════════════════════════════════════════════════════════════

  function initSaveSync() {
    function updateHUDFromSave(save) {
      if (!save) return;
      const loadoutVal = document.querySelector('.top-meta .loadout-value');
      if (loadoutVal && save.selectedDrone) {
        const payloadText = save.selectedPayload ? ` // ${save.selectedPayload}` : '';
        loadoutVal.textContent = `${save.selectedDrone}${payloadText}`;
      }
    }

    // Try reading current save on load
    try {
      const raw = localStorage.getItem('space_shooter_save');
      if (raw) updateHUDFromSave(JSON.parse(raw));
    } catch (_) {}

    // Listen for live updates
    window.addEventListener('save:updated', (e) => {
      if (e.detail) updateHUDFromSave(e.detail);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GLOBAL AUDIO HOOKS — Universal button hover & click sounds
  // ═══════════════════════════════════════════════════════════════════

  function initGlobalAudioHooks() {
    // Listen for custom ui:click events
    window.addEventListener('ui:click', () => {
      soundManager.playClick();
    });

    // Delegate hover sounds to all interactive elements
    document.addEventListener('pointerenter', (e) => {
      if (e.target && e.target.matches && e.target.matches('button, .tac-btn, .console-btn, .layer-toggle, .slider-track.interactive')) {
        soundManager.playHover();
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EDGE NAVIGATION — Star Map, Loadout & Cockpit Title routing
  // ═══════════════════════════════════════════════════════════════════

  function initEdgeNavigation() {
    const btnStarmap = document.getElementById('btn-starmap');
    if (btnStarmap) {
      btnStarmap.addEventListener('click', () => {
        soundManager.playClick();
        if (window.__screenManager) {
          const current = window.__screenManager.getActiveScreenId();
          window.__screenManager.show(current === 'levelSelect' ? 'landing' : 'levelSelect');
        }
      });
    }

    const btnLoadout = document.getElementById('btn-loadout');
    if (btnLoadout) {
      btnLoadout.addEventListener('click', () => {
        soundManager.playClick();
        if (window.__screenManager) {
          const current = window.__screenManager.getActiveScreenId();
          window.__screenManager.show(current === 'loadout' ? 'landing' : 'loadout');
        }
      });
    }

    const topTitle = document.querySelector('.top-title');
    if (topTitle) {
      topTitle.style.cursor = 'pointer';
      topTitle.addEventListener('click', () => {
        soundManager.playClick();
        if (window.__screenManager) {
          window.__screenManager.show('landing');
        }
      });
    }

    const commsPanel = document.getElementById('comms-panel');
    if (commsPanel) {
      commsPanel.style.cursor = 'pointer';
      commsPanel.addEventListener('click', () => {
        soundManager.playRadarPing();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOGGLE SWITCHES — ON/OFF pill toggles for ship systems
  // ═══════════════════════════════════════════════════════════════════

  function initToggles() {
    const toggles = document.querySelectorAll('.layer-toggle[data-toggle]');

    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOn = toggle.classList.contains('on');
        const label = toggle.querySelector('.toggle-label-text');
        const newState = !wasOn;

        if (wasOn) {
          toggle.classList.remove('on');
          toggle.classList.add('off');
          if (label) label.textContent = 'OFF';
        } else {
          toggle.classList.remove('off');
          toggle.classList.add('on');
          if (label) label.textContent = 'ON';
        }

        // Auditory feedback
        soundManager.playToggle(newState);

        // Dispatch event for game state
        const systemId = toggle.getAttribute('data-toggle');
        window.dispatchEvent(new CustomEvent('system:toggle', {
          detail: { system: systemId, active: newState }
        }));
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BUTTON GROUPS — Segmented controls (View, Fire Mode, Lock)
  // ═══════════════════════════════════════════════════════════════════

  function initButtonGroups() {
    const groups = document.querySelectorAll('.btn-group');

    groups.forEach(group => {
      const buttons = group.querySelectorAll('.tac-btn');

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          // Play click sound
          soundManager.playClick();

          // Remove active from all siblings
          buttons.forEach(b => b.classList.remove('active'));
          // Set clicked as active
          btn.classList.add('active');

          // Dispatch event
          const groupId = group.id || 'unknown';
          const value = btn.dataset.view || btn.dataset.fire || btn.dataset.lock || btn.textContent.trim();
          window.dispatchEvent(new CustomEvent('group:change', {
            detail: { group: groupId, value: value }
          }));
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTIVE SLIDERS — Click-to-set parameter sliders
  // ═══════════════════════════════════════════════════════════════════

  function initInteractiveSliders() {
    const tracks = document.querySelectorAll('.slider-track.interactive');

    tracks.forEach(track => {
      const paramId = track.getAttribute('data-param');
      const fill = track.querySelector('.slider-fill');
      let isDragging = false;
      let lastPercent = -1;

      function updateSlider(clientX) {
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = Math.round((x / rect.width) * 100);

        if (fill) {
          fill.style.width = `${percent}%`;
        }

        // Update corresponding value display
        const valueEl = document.getElementById(`val-${paramId}`);
        if (valueEl) {
          valueEl.textContent = `${percent}%`;
        }

        // Play micro-tick if value changed substantially
        if (Math.abs(percent - lastPercent) >= 5) {
          soundManager.playSlider();
          lastPercent = percent;
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('param:change', {
          detail: { param: paramId, value: percent }
        }));
      }

      track.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateSlider(e.clientX);
      });

      track.addEventListener('touchstart', (e) => {
        isDragging = true;
        if (e.touches.length > 0) {
          updateSlider(e.touches[0].clientX);
        }
      }, { passive: true });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) updateSlider(e.clientX);
      });

      document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length > 0) {
          updateSlider(e.touches[0].clientX);
        }
      }, { passive: true });

      document.addEventListener('mouseup', () => { isDragging = false; });
      document.addEventListener('touchend', () => { isDragging = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LIVE TIMESTAMP — Updates every second with UTC time
  // ═══════════════════════════════════════════════════════════════════

  function initLiveTimestamp() {
    const el = document.getElementById('live-timestamp');
    if (!el) return;

    function update() {
      const now = new Date();
      const y = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const d = String(now.getUTCDate()).padStart(2, '0');
      const h = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      el.textContent = `LIVE ${y}-${mo}-${d} ${h}:${mi}:${s}Z`;
    }

    update();
    setInterval(update, 1000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TELEMETRY DRIFT — Subtle value fluctuation for realism
  // ═══════════════════════════════════════════════════════════════════

  function initTelemetryDrift() {
    const driftTargets = [
      { id: 'coord-x', base: 1284.7, range: 0.8, decimals: 1 },
      { id: 'coord-y', base: -892.3, range: 0.5, decimals: 1 },
      { id: 'coord-z', base: 0.04, range: 0.02, decimals: 2 },
      { id: 'telemetry-speed', base: 2840, range: 30, decimals: 0 },
      { id: 'telemetry-accel', base: 1.4, range: 0.15, decimals: 1 },
    ];

    function drift() {
      driftTargets.forEach(t => {
        const el = document.getElementById(t.id);
        if (!el) return;
        const offset = (Math.random() - 0.5) * 2 * t.range;
        const value = t.base + offset;
        el.textContent = value.toFixed(t.decimals);
      });
    }

    drift();
    setInterval(drift, 2500);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COLLAPSIBLE PANEL — Ship Systems toggle
  // ═══════════════════════════════════════════════════════════════════

  function initCollapsePanel() {
    const collapseBtn = document.getElementById('collapse-ship-systems');
    const body = document.getElementById('ship-systems-body');
    if (!collapseBtn || !body) return;

    let collapsed = false;

    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      soundManager.playClick();
      if (collapsed) {
        body.style.display = 'none';
        collapseBtn.textContent = '▸';
        collapseBtn.style.transform = 'rotate(0deg)';
      } else {
        body.style.display = 'block';
        collapseBtn.textContent = '▾';
        collapseBtn.style.transform = 'rotate(0deg)';
      }
    });
  }

})();
