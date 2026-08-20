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
  SettingsScreen,
  ShowcaseScreen
} from './ui/index.js';
import { Starfield } from './game/index.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Space Shooter Engine — Initializing Global State Machine & Starfield...');

  const starfieldCanvas = document.getElementById('starfield-canvas');
  const gameCanvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');

  // 1. Initialize Parallax Starfield Background
  let starfield = null;
  if (starfieldCanvas) {
    starfield = new Starfield(starfieldCanvas, {
      layerCount: 3,
      starCount: 220,
      baseSpeed: 1.0
    });
    window.__starfield = starfield;
  }

  // 2. High-DPI Responsive Canvas Resize Handler
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

    if (starfield) {
      starfield.resize();
    }
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  if (starfield) {
    starfield.start();
  }

  // 3. Initialize Screen Manager & State Machine
  const screenManager = new ScreenManager(uiRoot);

  screenManager
    .register('landing', LandingScreen)
    .register('levelSelect', LevelSelectScreen)
    .register('loadout', LoadoutScreen)
    .register('game', GameScreen)
    .register('pause', PauseScreen)
    .register('results', ResultsScreen)
    .register('settings', SettingsScreen)
    .register('showcase', ShowcaseScreen);

  // Mount default starting screen
  screenManager.show('landing');

  // Expose router globally for debugging & testing
  window.__screenManager = screenManager;

  console.log('✅ Global State Machine & Starfield active. Screens registered: landing, levelSelect, loadout, game, pause, results, settings, showcase.');
});

