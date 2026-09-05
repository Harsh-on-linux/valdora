/**
 * HUD Controller — Global UI audio hooks.
 * Legacy cockpit shell was removed (v2 UI); screens own their telemetry now.
 * Kept as a thin global layer: hover/click sounds + save event relay.
 */

import { soundManager } from './audio/index.js';

(function initHUDController() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    // Global click relay (components.js dispatches ui:click)
    window.addEventListener('ui:click', () => {
      try { soundManager.playClick(); } catch (_) {}
    });

    // Delegated hover sounds for all interactive elements
    document.addEventListener('pointerenter', (e) => {
      if (e.target?.matches?.('button, .console-btn, .tac-btn, .scheme-btn')) {
        try { soundManager.playHover(); } catch (_) {}
      }
    }, true);

    console.log('🎛️ HUD Controller — global audio hooks online (v2 UI).');
  }
})();
