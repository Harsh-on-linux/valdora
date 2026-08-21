/**
 * Space Shooter — Main Entry Point
 * Initializes high-DPI canvases, registers screens with ScreenManager,
 * mounts the landing screen, and initializes the Web Audio sound engine.
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
  HowToPlayScreen,
  ShowcaseScreen
} from './ui/index.js';
import {
  Starfield,
  SaveManager,
  SettingsManager,
  LEVELS,
  validateLevelsConfig
} from './game/index.js';
import { soundManager } from './audio/index.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Space Shooter Engine — Initializing State Machine, Audio & Starfield...');

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
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  // 2. Initialize Parallax Starfield Background
  if (starfieldCanvas) {
    starfield = new Starfield(starfieldCanvas, {
      layerCount: 3,
      starCount: 220,
      baseSpeed: 0.138
    });
    window.__starfield = starfield;
    starfield.start();
  }

  // 3. Apply Saved User Settings & Validate Level Config
  SettingsManager.applySettings();
  const levelsValid = validateLevelsConfig();
  if (levelsValid) {
    console.log(`🗺️ Level Data Model — 10 Sector configurations verified.`);
  }

  // 4. Initialize Screen Manager & State Machine
  const screenManager = new ScreenManager(uiRoot);

  screenManager
    .register('landing', LandingScreen)
    .register('levelSelect', LevelSelectScreen)
    .register('loadout', LoadoutScreen)
    .register('game', GameScreen)
    .register('pause', PauseScreen)
    .register('results', ResultsScreen)
    .register('settings', SettingsScreen)
    .register('howToPlay', HowToPlayScreen)
    .register('showcase', ShowcaseScreen);

  // Mount default starting screen
  screenManager.show('landing');

  // Expose singletons globally for debugging & testing
  window.__screenManager = screenManager;
  window.__soundManager = soundManager;
  window.__saveManager = SaveManager;
  window.__settingsManager = SettingsManager;
  window.__levels = LEVELS;

  console.log('✅ Global State Machine, Web Audio & Starfield active. Screens registered: landing, levelSelect, loadout, game, pause, results, settings, howToPlay, showcase.');
});
