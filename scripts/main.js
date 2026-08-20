/**
 * Space Shooter — Main Entry Point
 * Initializes canvas setup, UI root, and kicks off state management.
 */

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Space Shooter Engine — Initializing Step 1 Scaffold...');

  const starfieldCanvas = document.getElementById('starfield-canvas');
  const gameCanvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');

  // Handle high-DPI responsive canvas sizing
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

  console.log('✅ Step 1 Scaffold loaded successfully. Fonts, theme variables, and canvases active.');
});
