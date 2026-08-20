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

  // 1. High-DPI Responsive Canvas Resize Handler
  let starfield = null;

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

  // Size canvases to full viewport BEFORE creating Starfield
  // so star positions are generated across the full screen
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  // 2. Initialize Parallax Starfield Background (canvas is now correctly sized)
  if (starfieldCanvas) {
    starfield = new Starfield(starfieldCanvas, {
      layerCount: 3,
      starCount: 220,
      baseSpeed: 1.0
    });
    window.__starfield = starfield;
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
  // screenManager.show('landing'); // Disabled temporarily to show Tactical HUD mockup

  // Expose router globally for debugging & testing
  window.__screenManager = screenManager;

  console.log('✅ Global State Machine & Starfield active. Screens registered: landing, levelSelect, loadout, game, pause, results, settings, showcase.');
});

