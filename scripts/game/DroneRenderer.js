/**
 * DroneRenderer — Procedural Canvas Drone Drawing System
 * Renders top-down tactical wireframe / FLIR silhouette drone views with
 * heat signature coloring, targeting crosshairs, and animation effects.
 *
 * Each drone type (STRIKER, REAPER, GHOST) has unique geometry defined by
 * their render config in drones.js. This module draws them procedurally
 * using Canvas2D paths — no sprite assets needed.
 */

import { getDroneById, DRONE_TYPES } from './drones.js';

/**
 * Draws a complete drone preview onto a canvas with targeting crosshairs
 * and FLIR heat-signature styling.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {string} droneId - STRIKER | REAPER | GHOST
 * @param {object} [options] - Rendering options
 * @param {number} [options.rotation=0] - Rotation in radians
 * @param {boolean} [options.animate=false] - Enable pulse animation
 * @param {number} [options.animTime=0] - Current animation timestamp
 * @param {boolean} [options.showCrosshairs=true] - Show targeting overlay
 * @param {boolean} [options.showGrid=true] - Show tactical grid
 * @param {boolean} [options.showHeatSignature=true] - FLIR heat glow
 * @param {number} [options.scale=1] - Overall scale multiplier
 */
export function drawDronePreview(canvas, droneId, options = {}) {
  const drone = getDroneById(droneId);
  if (!drone || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const {
    rotation = 0,
    animate = false,
    animTime = 0,
    showCrosshairs = true,
    showGrid = true,
    showHeatSignature = true,
    scale = 1
  } = options;

  const cx = w / 2;
  const cy = h / 2;
  const baseSize = Math.min(w, h) * 0.38 * scale;

  // Draw background tactical grid
  if (showGrid) {
    drawTacticalGrid(ctx, w, h, drone.thermal, animTime);
  }

  // Draw heat signature glow (FLIR effect)
  if (showHeatSignature) {
    drawHeatSignature(ctx, cx, cy, baseSize, drone.thermal, animate, animTime);
  }

  // Draw the drone wireframe
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  drawDroneBody(ctx, drone, baseSize, animate, animTime);

  ctx.restore();

  // Draw targeting crosshairs overlay
  if (showCrosshairs) {
    drawCrosshairs(ctx, w, h, drone.thermal, animate, animTime);
  }

  ctx.restore();
}

/**
 * Draws subtle tactical grid background
 */
function drawTacticalGrid(ctx, w, h, thermal, animTime) {
  const gridSize = 20;
  const gridAlpha = 0.06;
  const scanOffset = animTime ? (animTime * 0.02) % h : 0;

  ctx.save();

  // Grid lines
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = gridAlpha;

  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Scanning refresh line
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.5;
  const scanY = scanOffset;
  const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 2);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.8, thermal.glow);
  grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(w, scanY);
  ctx.stroke();

  // Scan trail
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = thermal.core;
  ctx.fillRect(0, scanY - 60, w, 60);

  ctx.restore();
}

/**
 * Draws FLIR heat signature glow behind the drone
 */
function drawHeatSignature(ctx, cx, cy, size, thermal, animate, animTime) {
  ctx.save();

  const pulseScale = animate ? 1 + Math.sin(animTime * 0.003) * 0.06 : 1;
  const glowRadius = size * 1.2 * pulseScale;

  // Outer glow
  const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  outerGrad.addColorStop(0, thermal.glow);
  outerGrad.addColorStop(0.4, thermal.trail);
  outerGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = outerGrad;
  ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);

  // Inner hot core
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.3 * pulseScale);
  innerGrad.addColorStop(0, thermal.glow);
  innerGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = innerGrad;
  ctx.fillRect(cx - size * 0.5, cy - size * 0.5, size, size);

  ctx.restore();
}

/**
 * Draws the drone wireframe body (top-down tactical silhouette)
 * Dispatches to the correct body geometry based on drone config wingStyle
 */
function drawDroneBody(ctx, drone, baseSize, animate, animTime) {
  const thermal = drone.thermal;
  const render = drone.render;
  const pulse = animate ? 1 + Math.sin(animTime * 0.004) * 0.04 : 1;

  // Set wireframe stroke style
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Filled silhouette with subtle gradient
  const fillGrad = ctx.createLinearGradient(0, -baseSize * 0.5, 0, baseSize * 0.5);
  fillGrad.addColorStop(0, thermal.outer);
  fillGrad.addColorStop(0.5, thermal.mid);
  fillGrad.addColorStop(1, thermal.outer);
  ctx.fillStyle = fillGrad;

  // Draw body based on wing style
  switch (render.wingStyle) {
    case 'swept':
      drawSweptWingDrone(ctx, baseSize, render, thermal, pulse);
      break;
    case 'delta':
      drawDeltaWingDrone(ctx, baseSize, render, thermal, pulse);
      break;
    case 'angular':
      drawAngularWingDrone(ctx, baseSize, render, thermal, pulse);
      break;
    default:
      drawSweptWingDrone(ctx, baseSize, render, thermal, pulse);
  }

  // Draw engines
  drawEngines(ctx, baseSize, render, thermal, animate, animTime);

  // Draw canards if present
  if (render.hasCanards) {
    drawCanards(ctx, baseSize, render, thermal);
  }

  // Draw tail fins if present
  if (render.hasTailFins) {
    drawTailFins(ctx, baseSize, render, thermal);
  }
}

/**
 * STRIKER — Swept wing drone (Predator-like)
 * Sleek, elongated body with backward-swept wings
 */
function drawSweptWingDrone(ctx, size, render, thermal, pulse) {
  const bodyLen = size * render.bodyLength * pulse;
  const wingW = size * render.wingSpan * 0.5 * pulse;

  ctx.save();

  // Main fuselage
  ctx.beginPath();
  // Nose (pointed)
  ctx.moveTo(0, -bodyLen * 0.52);
  // Right fuselage
  ctx.lineTo(size * 0.06, -bodyLen * 0.35);
  ctx.lineTo(size * 0.07, -bodyLen * 0.1);
  // Right wing junction
  ctx.lineTo(wingW * 0.85, bodyLen * 0.05);
  // Wing tip
  ctx.lineTo(wingW, bodyLen * 0.15);
  // Wing trailing edge
  ctx.lineTo(wingW * 0.45, bodyLen * 0.22);
  // Back fuselage right
  ctx.lineTo(size * 0.06, bodyLen * 0.3);
  ctx.lineTo(size * 0.05, bodyLen * 0.48);
  // Tail
  ctx.lineTo(0, bodyLen * 0.52);
  // Mirror left
  ctx.lineTo(-size * 0.05, bodyLen * 0.48);
  ctx.lineTo(-size * 0.06, bodyLen * 0.3);
  ctx.lineTo(-wingW * 0.45, bodyLen * 0.22);
  ctx.lineTo(-wingW, bodyLen * 0.15);
  ctx.lineTo(-wingW * 0.85, bodyLen * 0.05);
  ctx.lineTo(-size * 0.07, -bodyLen * 0.1);
  ctx.lineTo(-size * 0.06, -bodyLen * 0.35);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Cockpit / sensor dome
  drawSensorDome(ctx, 0, -bodyLen * 0.3, size * 0.035, thermal);

  // Center line detail
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -bodyLen * 0.48);
  ctx.lineTo(0, bodyLen * 0.48);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Wing detail lines
  drawWingDetailLines(ctx, wingW, bodyLen, thermal);

  ctx.restore();
}

/**
 * REAPER — Delta wing drone (heavy strike platform)
 * Broad, heavy body with wide delta wings
 */
function drawDeltaWingDrone(ctx, size, render, thermal, pulse) {
  const bodyLen = size * render.bodyLength * pulse;
  const wingW = size * render.wingSpan * 0.5 * pulse;

  ctx.save();

  // Main body — broader, more aggressive
  ctx.beginPath();
  // Blunt nose
  ctx.moveTo(-size * 0.04, -bodyLen * 0.46);
  ctx.lineTo(size * 0.04, -bodyLen * 0.46);
  // Right fuselage widens
  ctx.lineTo(size * 0.10, -bodyLen * 0.28);
  ctx.lineTo(size * 0.12, -bodyLen * 0.08);
  // Delta wing sweep
  ctx.lineTo(wingW, bodyLen * 0.25);
  // Wing trailing edge
  ctx.lineTo(wingW * 0.7, bodyLen * 0.32);
  ctx.lineTo(wingW * 0.35, bodyLen * 0.28);
  // Rear body
  ctx.lineTo(size * 0.10, bodyLen * 0.38);
  ctx.lineTo(size * 0.07, bodyLen * 0.50);
  // Tail notch
  ctx.lineTo(0, bodyLen * 0.44);
  // Mirror left
  ctx.lineTo(-size * 0.07, bodyLen * 0.50);
  ctx.lineTo(-size * 0.10, bodyLen * 0.38);
  ctx.lineTo(-wingW * 0.35, bodyLen * 0.28);
  ctx.lineTo(-wingW * 0.7, bodyLen * 0.32);
  ctx.lineTo(-wingW, bodyLen * 0.25);
  ctx.lineTo(-size * 0.12, -bodyLen * 0.08);
  ctx.lineTo(-size * 0.10, -bodyLen * 0.28);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Heavy armor plate lines
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.7;

  // Lateral armor segments
  for (let i = 0; i < 4; i++) {
    const y = -bodyLen * 0.2 + i * bodyLen * 0.14;
    const xSpread = size * 0.08 + i * size * 0.03;
    ctx.beginPath();
    ctx.moveTo(-xSpread, y);
    ctx.lineTo(xSpread, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Weapon hardpoints (missile pylons)
  drawHardpoints(ctx, wingW * 0.5, bodyLen * 0.12, thermal);
  drawHardpoints(ctx, -wingW * 0.5, bodyLen * 0.12, thermal);
  drawHardpoints(ctx, wingW * 0.7, bodyLen * 0.22, thermal);
  drawHardpoints(ctx, -wingW * 0.7, bodyLen * 0.22, thermal);

  // Sensor dome (wider for Reaper)
  drawSensorDome(ctx, 0, -bodyLen * 0.35, size * 0.045, thermal);

  // Center spine
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -bodyLen * 0.42);
  ctx.lineTo(0, bodyLen * 0.42);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * GHOST — Angular stealth drone (B-2 / X-47B inspired)
 * Sharp angular body with faceted surfaces, no tail fins
 */
function drawAngularWingDrone(ctx, size, render, thermal, pulse) {
  const bodyLen = size * render.bodyLength * pulse;
  const wingW = size * render.wingSpan * 0.5 * pulse;

  ctx.save();

  // Angular stealth body — faceted diamond shape
  ctx.beginPath();
  // Sensor nose (angular)
  ctx.moveTo(0, -bodyLen * 0.48);
  // Right forward facet
  ctx.lineTo(size * 0.09, -bodyLen * 0.28);
  // Right wing leading edge (sharp sweep)
  ctx.lineTo(wingW * 0.95, -bodyLen * 0.02);
  // Wing tip (angular cut)
  ctx.lineTo(wingW, bodyLen * 0.06);
  // Serrated trailing edge
  ctx.lineTo(wingW * 0.7, bodyLen * 0.12);
  ctx.lineTo(wingW * 0.5, bodyLen * 0.08);
  ctx.lineTo(wingW * 0.3, bodyLen * 0.18);
  // Rear body
  ctx.lineTo(size * 0.08, bodyLen * 0.26);
  // Angular tail (sawtooth)
  ctx.lineTo(size * 0.06, bodyLen * 0.40);
  ctx.lineTo(0, bodyLen * 0.34);
  // Mirror left
  ctx.lineTo(-size * 0.06, bodyLen * 0.40);
  ctx.lineTo(-size * 0.08, bodyLen * 0.26);
  ctx.lineTo(-wingW * 0.3, bodyLen * 0.18);
  ctx.lineTo(-wingW * 0.5, bodyLen * 0.08);
  ctx.lineTo(-wingW * 0.7, bodyLen * 0.12);
  ctx.lineTo(-wingW, bodyLen * 0.06);
  ctx.lineTo(-wingW * 0.95, -bodyLen * 0.02);
  ctx.lineTo(-size * 0.09, -bodyLen * 0.28);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Stealth panel lines (faceted surface indicators)
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.6;
  ctx.setLineDash([4, 6]);

  // Diagonal facet lines
  ctx.beginPath();
  ctx.moveTo(0, -bodyLen * 0.38);
  ctx.lineTo(wingW * 0.6, bodyLen * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -bodyLen * 0.38);
  ctx.lineTo(-wingW * 0.6, bodyLen * 0.02);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ECM sensor array (centered dome, slightly larger)
  drawSensorDome(ctx, 0, -bodyLen * 0.22, size * 0.04, thermal);

  // Secondary sensor nodes
  drawSensorDome(ctx, wingW * 0.4, bodyLen * 0.0, size * 0.018, thermal);
  drawSensorDome(ctx, -wingW * 0.4, bodyLen * 0.0, size * 0.018, thermal);

  ctx.restore();
}

/**
 * Draws engine exhaust ports at the rear of the drone
 */
function drawEngines(ctx, size, render, thermal, animate, animTime) {
  const engineCount = render.engineCount;
  const bodyLen = size * render.bodyLength;
  const engineY = bodyLen * 0.45;
  const exhaustPulse = animate ? 0.6 + Math.sin(animTime * 0.008) * 0.4 : 0.8;

  ctx.save();

  for (let i = 0; i < engineCount; i++) {
    const spread = engineCount === 1 ? 0 :
      (i - (engineCount - 1) / 2) * (size * 0.07);

    // Engine housing
    ctx.fillStyle = thermal.outer;
    ctx.strokeStyle = thermal.mid;
    ctx.lineWidth = 1.2;

    const eW = size * 0.03;
    const eH = size * 0.05;

    ctx.beginPath();
    ctx.rect(spread - eW, engineY - eH * 0.5, eW * 2, eH);
    ctx.fill();
    ctx.stroke();

    // Exhaust glow
    ctx.globalAlpha = exhaustPulse;
    const exGrad = ctx.createLinearGradient(spread, engineY, spread, engineY + size * 0.12);
    exGrad.addColorStop(0, thermal.core);
    exGrad.addColorStop(0.5, thermal.glow);
    exGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = exGrad;
    ctx.fillRect(spread - eW * 0.8, engineY + eH * 0.3, eW * 1.6, size * 0.12);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/**
 * Draws forward canard fins
 */
function drawCanards(ctx, size, render, thermal) {
  const bodyLen = size * render.bodyLength;
  const canardSpan = size * 0.18;

  ctx.save();
  ctx.strokeStyle = thermal.core;
  ctx.fillStyle = thermal.outer;
  ctx.lineWidth = 1.2;

  // Right canard
  ctx.beginPath();
  ctx.moveTo(size * 0.06, -bodyLen * 0.28);
  ctx.lineTo(canardSpan, -bodyLen * 0.32);
  ctx.lineTo(canardSpan * 0.85, -bodyLen * 0.25);
  ctx.lineTo(size * 0.06, -bodyLen * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left canard
  ctx.beginPath();
  ctx.moveTo(-size * 0.06, -bodyLen * 0.28);
  ctx.lineTo(-canardSpan, -bodyLen * 0.32);
  ctx.lineTo(-canardSpan * 0.85, -bodyLen * 0.25);
  ctx.lineTo(-size * 0.06, -bodyLen * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws vertical tail fins (angled outward, top-down view shows as lines)
 */
function drawTailFins(ctx, size, render, thermal) {
  const bodyLen = size * render.bodyLength;

  ctx.save();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;

  const finLen = size * 0.1;
  const finY = bodyLen * 0.42;

  // Right tail fin (shows as small angled line from top-down)
  ctx.beginPath();
  ctx.moveTo(size * 0.04, finY);
  ctx.lineTo(size * 0.04 + finLen * 0.4, finY - finLen * 0.3);
  ctx.stroke();

  // Left tail fin
  ctx.beginPath();
  ctx.moveTo(-size * 0.04, finY);
  ctx.lineTo(-size * 0.04 - finLen * 0.4, finY - finLen * 0.3);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws a glowing sensor dome circle
 */
function drawSensorDome(ctx, x, y, radius, thermal) {
  ctx.save();

  // Outer ring
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner filled dot
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * Draws wing panel detail lines for the swept-wing drone
 */
function drawWingDetailLines(ctx, wingW, bodyLen, thermal) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.6;

  // Right wing panel line
  ctx.beginPath();
  ctx.moveTo(wingW * 0.3, bodyLen * 0.0);
  ctx.lineTo(wingW * 0.85, bodyLen * 0.12);
  ctx.stroke();

  // Left wing panel line
  ctx.beginPath();
  ctx.moveTo(-wingW * 0.3, bodyLen * 0.0);
  ctx.lineTo(-wingW * 0.85, bodyLen * 0.12);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws a small weapon hardpoint marker
 */
function drawHardpoints(ctx, x, y, thermal) {
  ctx.save();

  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = thermal.core;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws targeting crosshairs overlay
 */
function drawCrosshairs(ctx, w, h, thermal, animate, animTime) {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) * 0.42;
  const innerR = Math.min(w, h) * 0.08;
  const rotAngle = animate ? animTime * 0.0005 : 0;

  ctx.save();

  // Outer targeting ring (rotating)
  ctx.translate(cx, cy);
  ctx.rotate(rotAngle);

  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;

  // Dashed outer circle
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Tick marks on outer ring
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cos * (outerR - 6), sin * (outerR - 6));
    ctx.lineTo(cos * (outerR + 4), sin * (outerR + 4));
    ctx.stroke();
  }

  ctx.rotate(-rotAngle);

  // Cardinal crosshair lines (fixed, not rotating)
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);

  // Vertical
  ctx.beginPath();
  ctx.moveTo(0, -outerR + 10);
  ctx.lineTo(0, -innerR);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, innerR);
  ctx.lineTo(0, outerR - 10);
  ctx.stroke();

  // Horizontal
  ctx.beginPath();
  ctx.moveTo(-outerR + 10, 0);
  ctx.lineTo(-innerR, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(innerR, 0);
  ctx.lineTo(outerR - 10, 0);
  ctx.stroke();

  ctx.setLineDash([]);

  // Inner diamond reticle
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.2;
  const d = innerR * 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -d);
  ctx.lineTo(d, 0);
  ctx.lineTo(0, d);
  ctx.lineTo(-d, 0);
  ctx.closePath();
  ctx.stroke();

  // Center dot
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  // Corner brackets (HUD-style targeting frame)
  ctx.translate(-cx, -cy);
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = thermal.core;

  const bracketLen = 18;
  const margin = 12;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(margin, margin + bracketLen);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + bracketLen, margin);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - margin - bracketLen, margin);
  ctx.lineTo(w - margin, margin);
  ctx.lineTo(w - margin, margin + bracketLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(margin, h - margin - bracketLen);
  ctx.lineTo(margin, h - margin);
  ctx.lineTo(margin + bracketLen, h - margin);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - margin - bracketLen, h - margin);
  ctx.lineTo(w - margin, h - margin);
  ctx.lineTo(w - margin, h - margin - bracketLen);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}


/**
 * DronePreviewWidget — Self-contained animated drone preview canvas manager
 * Creates and manages an animated canvas showing a drone with full FLIR effects.
 *
 * @param {HTMLElement} container - DOM element to append the canvas into
 * @param {string} droneId - STRIKER | REAPER | GHOST
 * @param {object} [options]
 * @param {number} [options.width=240] - Canvas CSS width
 * @param {number} [options.height=280] - Canvas CSS height
 * @param {boolean} [options.animate=true] - Enable animation loop
 * @returns {object} { canvas, start, stop, setDrone, destroy }
 */
export function createDronePreviewWidget(container, droneId, options = {}) {
  const {
    width = 240,
    height = 280,
    animate = true
  } = options;

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';
  canvas.className = 'drone-preview-canvas';

  container.appendChild(canvas);

  let currentDroneId = droneId;
  let animFrame = null;
  let running = false;

  function renderFrame(timestamp) {
    drawDronePreview(canvas, currentDroneId, {
      animate: true,
      animTime: timestamp,
      showCrosshairs: true,
      showGrid: true,
      showHeatSignature: true,
      scale: 1
    });

    if (running) {
      animFrame = requestAnimationFrame(renderFrame);
    }
  }

  function start() {
    if (running) return;
    running = true;
    animFrame = requestAnimationFrame(renderFrame);
  }

  function stop() {
    running = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function setDrone(newDroneId) {
    currentDroneId = newDroneId;
    // Re-render immediately if not animating
    if (!running) {
      drawDronePreview(canvas, currentDroneId, {
        animate: false,
        showCrosshairs: true,
        showGrid: true,
        showHeatSignature: true
      });
    }
  }

  function destroy() {
    stop();
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  // Auto-start if requested
  if (animate) {
    start();
  } else {
    // Single static render
    drawDronePreview(canvas, currentDroneId, {
      animate: false,
      showCrosshairs: true,
      showGrid: true,
      showHeatSignature: true
    });
  }

  return { canvas, start, stop, setDrone, destroy };
}
