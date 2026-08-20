/**
 * Space Shooter — Main Entry Point
 * Initializes high-DPI canvases, registers screens with ScreenManager,
 * and mounts the landing screen.
 */

import {
  ScreenManager,
  LandingScreen,
  LevelSelectScreen,
  LoadoutScreen,
  GameScreen,
  PauseScreen,
  ResultsScreen,
  SettingsScreen
} from './ui/index.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Space Shooter Engine — Initializing Global State Machine...');

  const starfieldCanvas = document.getElementById('starfield-canvas');
  const gameCanvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');

  // 1. High-DPI Responsive Canvas Resize Handler
  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    [starfieldCanvas, gameCanvas].forEach(canvas => {
      if (canvas) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // 2. Initialize Screen Manager & State Machine
  const screenManager = new ScreenManager(uiRoot);

  screenManager
    .register('landing', LandingScreen)
    .register('levelSelect', LevelSelectScreen)
    .register('loadout', LoadoutScreen)
    .register('game', GameScreen)
    .register('pause', PauseScreen)
    .register('results', ResultsScreen)
    .register('settings', SettingsScreen);

  // Mount default starting screen
  screenManager.show('landing');

  // Expose router globally for debugging & testing
  window.__screenManager = screenManager;

  console.log('✅ Global State Machine active. Screens registered: landing, levelSelect, loadout, game, pause, results, settings.');
});
