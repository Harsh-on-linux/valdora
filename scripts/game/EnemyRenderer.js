/**
 * EnemyRenderer.js — Procedural Canvas Enemy & Boss Drawing System
 * Renders top-down tactical FLIR wireframe views of hostile entities using
 * Canvas2D paths. Each enemy archetype and boss has unique geometry drawn
 * procedurally — no sprite assets needed.
 *
 * Visual differences from player drones:
 * - Hostile thermal color palettes (reds, oranges, toxic greens)
 * - Generic/industrial silhouettes (boxy, asymmetric, utilitarian)
 * - Blinking hostile IFF markers (red triangle)
 * - Damage state degradation (sparking, missing panels)
 * - No crosshairs overlay (player-only feature)
 *
 * Enemy Types:
 *  - RECON_BUGGY     — Hexagonal disc with 4 thrust pods
 *  - INTERCEPTOR     — Narrow arrowhead with sharp swept wings
 *  - SAM_TURRET      — Hexagonal platform with rotating turret barrel
 *  - KAMIKAZE_DRONE  — Pointed wedge with glowing explosive nose cone
 *  - RADAR_JAMMER    — Octagonal body with antenna spines & dish arrays
 *
 * Boss Types:
 *  - BOSS_MOBILE_COMMAND   — Multi-segment fortress with weapon pods
 *  - BOSS_APEX_DREADNOUGHT — Segmented dreadnought hull
 */

import { getEnemyById, getBossById, ENEMY_TYPES, BOSS_TYPES } from './enemies.js';

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────

/**
 * Draws an enemy entity at the given position on the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} enemyId - Enemy type ID
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Base size in pixels
 * @param {object} [options]
 * @param {number} [options.animTime=0] - Animation timestamp
 * @param {number} [options.rotation=0] - Rotation in radians
 * @param {number} [options.hpPercent=1] - HP fraction (0-1) for damage FX
 * @param {boolean} [options.showIFF=true] - Show hostile IFF marker
 * @param {number} [options.turretAngle=0] - For SAM turrets, barrel angle
   * @param {boolean} [options.isDiving=false] - Kamikaze dive state
   * @param {boolean} [options.diveWarning=false] - Kamikaze pre-dive telegraph flash
   * @param {number} [options.jamPulse=0] - Radar jammer pulse phase
   */
export function drawEnemy(ctx, enemyId, x, y, size, options = {}) {
  const enemy = getEnemyById(enemyId);
  if (!enemy) return;

  const {
    animTime = 0,
    rotation = 0,
    hpPercent = 1,
    showIFF = true,
    turretAngle = 0,
    isDiving = false,
    diveWarning = false,
    jamPulse = 0
  } = options;

  const thermal = enemy.thermal;
  const render = enemy.render;
  const scaledSize = size;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw heat signature glow
  drawEnemyHeatGlow(ctx, 0, 0, scaledSize, thermal, animTime);

  // Draw body based on type
  switch (render.bodyStyle) {
    case 'hexDisc':
      drawReconBuggy(ctx, scaledSize, render, thermal, animTime);
      break;
    case 'arrowhead':
      drawInterceptor(ctx, scaledSize, render, thermal, animTime);
      break;
    case 'hexPlatform':
      drawSAMTurret(ctx, scaledSize, render, thermal, animTime, turretAngle);
      break;
    case 'wedge':
      drawKamikazeDrone(ctx, scaledSize, render, thermal, animTime, isDiving, diveWarning);
      break;
    case 'octaSphere':
      drawRadarJammer(ctx, scaledSize, render, thermal, animTime, jamPulse);
      break;
    default:
      drawReconBuggy(ctx, scaledSize, render, thermal, animTime);
  }

  // Draw damage FX overlay
  if (hpPercent < 0.7) {
    drawDamageOverlay(ctx, scaledSize, thermal, hpPercent, animTime);
  }

  ctx.restore();

  // Draw hostile IFF marker (not rotated with enemy)
  if (showIFF) {
    drawHostileIFFMarker(ctx, x, y - scaledSize * 0.65, thermal, animTime);
  }
}

/**
 * Draws a boss entity at the given position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} bossId - Boss type ID
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} size - Base size in pixels
 * @param {object} [options]
 * @param {number} [options.animTime=0]
 * @param {number} [options.phase=1] - Current phase (1, 2, or 3)
 * @param {number} [options.hpPercent=1]
 * @param {object} [options.segmentHP={}] - Per-segment HP fractions
 * @param {number} [options.beamAngle=0] - Dreadnought beam rotation
 * @param {boolean} [options.isSubmerged=false] - Dreadnought submerge state
 * @param {number} [options.submergeAlpha=1] - Fade for submerge effect
 */
export function drawBoss(ctx, bossId, x, y, size, options = {}) {
  const boss = getBossById(bossId);
  if (!boss) return;

  const {
    animTime = 0,
    phase = 1,
    hpPercent = 1,
    segmentHP = {},
    beamAngle = 0,
    isSubmerged = false,
    submergeAlpha = 1
  } = options;

  const thermalKey = `phase${phase}`;
  const thermal = boss.thermal[thermalKey] || boss.thermal.phase1;

  ctx.save();
  ctx.globalAlpha = submergeAlpha;

  switch (boss.render.bodyStyle) {
    case 'commandFortress':
      drawBossMobileCommand(ctx, x, y, size, boss, thermal, animTime, phase, segmentHP);
      break;
    case 'dreadnought':
      drawBossApexDreadnought(ctx, x, y, size, boss, thermal, animTime, phase, segmentHP, beamAngle, isSubmerged);
      break;
  }

  // Boss IFF marker (larger, more prominent)
  drawBossIFFMarker(ctx, x, y - size * 0.8, thermal, animTime);

  // Boss damage FX
  if (hpPercent < 0.5) {
    drawBossDamageFX(ctx, x, y, size, thermal, hpPercent, animTime, phase);
  }

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY HEAT GLOW (Hostile FLIR signature)
// ─────────────────────────────────────────────────────────────

function drawEnemyHeatGlow(ctx, cx, cy, size, thermal, animTime) {
  ctx.save();

  const pulse = 1 + Math.sin(animTime * 0.004) * 0.08;
  const glowR = size * 0.9 * pulse;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  grad.addColorStop(0, thermal.glow);
  grad.addColorStop(0.5, thermal.trail);
  grad.addColorStop(1, 'transparent');

  ctx.fillStyle = grad;
  ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY 1: RECON BUGGY — Hexagonal disc + 4 thrust pods
// ─────────────────────────────────────────────────────────────

function drawReconBuggy(ctx, size, render, thermal, animTime) {
  const bodyR = size * 0.44;
  const pulse = 1 + Math.sin(animTime * 0.005) * 0.03;

  ctx.save();

  // Fill gradient
  const fillGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR * pulse);
  fillGrad.addColorStop(0, thermal.mid);
  fillGrad.addColorStop(0.7, thermal.outer);
  fillGrad.addColorStop(1, thermal.outer);

  // Hexagonal disc body
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = Math.cos(angle) * bodyR * pulse;
    const py = Math.sin(angle) * bodyR * pulse;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Inner ring detail
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, bodyR * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Center sensor dot
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 4 Thrust pods (at cardinal directions)
  const podDist = bodyR * 1.15;
  const podSize = size * 0.12;
  const thrustPulse = 0.5 + Math.sin(animTime * 0.01) * 0.5;

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const px = Math.cos(angle) * podDist;
    const py = Math.sin(angle) * podDist;

    // Pod housing
    ctx.fillStyle = thermal.outer;
    ctx.strokeStyle = thermal.mid;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, podSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thrust glow
    ctx.globalAlpha = thrustPulse * 0.8;
    ctx.fillStyle = thermal.core;
    ctx.beginPath();
    ctx.arc(px, py, podSize * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Panel lines (industrial detail)
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.6, -bodyR * 0.1);
  ctx.lineTo(bodyR * 0.6, -bodyR * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.6, bodyR * 0.1);
  ctx.lineTo(bodyR * 0.6, bodyR * 0.1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY 2: INTERCEPTOR — Narrow arrowhead + swept wings
// ─────────────────────────────────────────────────────────────

function drawInterceptor(ctx, size, render, thermal, animTime) {
  const bodyLen = size * 0.84;
  const wingW = size * 0.72 * 0.5;
  const pulse = 1 + Math.sin(animTime * 0.005) * 0.03;

  ctx.save();

  // Fill gradient
  const fillGrad = ctx.createLinearGradient(0, -bodyLen * 0.5, 0, bodyLen * 0.5);
  fillGrad.addColorStop(0, thermal.mid);
  fillGrad.addColorStop(0.5, thermal.outer);
  fillGrad.addColorStop(1, thermal.outer);

  // Narrow arrowhead body
  ctx.beginPath();
  // Sharp nose point
  ctx.moveTo(0, -bodyLen * 0.5 * pulse);
  // Right fuselage — narrow, angular
  ctx.lineTo(size * 0.07, -bodyLen * 0.25);
  ctx.lineTo(size * 0.09, -bodyLen * 0.05);
  // Right wing — sharply swept back
  ctx.lineTo(wingW * 0.95, bodyLen * 0.22);
  // Wing tip (sharp cut)
  ctx.lineTo(wingW, bodyLen * 0.32);
  // Trailing edge
  ctx.lineTo(wingW * 0.35, bodyLen * 0.25);
  // Aft body
  ctx.lineTo(size * 0.08, bodyLen * 0.38);
  // Engine notch
  ctx.lineTo(size * 0.06, bodyLen * 0.48 * pulse);
  ctx.lineTo(0, bodyLen * 0.44 * pulse);
  // Mirror left
  ctx.lineTo(-size * 0.06, bodyLen * 0.48 * pulse);
  ctx.lineTo(-size * 0.08, bodyLen * 0.38);
  ctx.lineTo(-wingW * 0.35, bodyLen * 0.25);
  ctx.lineTo(-wingW, bodyLen * 0.32);
  ctx.lineTo(-wingW * 0.95, bodyLen * 0.22);
  ctx.lineTo(-size * 0.09, -bodyLen * 0.05);
  ctx.lineTo(-size * 0.07, -bodyLen * 0.25);
  ctx.closePath();

  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Center spine line
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -bodyLen * 0.45);
  ctx.lineTo(0, bodyLen * 0.4);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Wing panel lines (mass-produced look)
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.8;
  // Right wing line
  ctx.beginPath();
  ctx.moveTo(size * 0.08, bodyLen * 0.0);
  ctx.lineTo(wingW * 0.75, bodyLen * 0.24);
  ctx.stroke();
  // Left wing line
  ctx.beginPath();
  ctx.moveTo(-size * 0.08, bodyLen * 0.0);
  ctx.lineTo(-wingW * 0.75, bodyLen * 0.24);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dual engine exhausts
  const engineSpacing = size * 0.045;
  const exPulse = 0.6 + Math.sin(animTime * 0.008) * 0.4;
  for (const side of [-1, 1]) {
    const ex = side * engineSpacing;
    const ey = bodyLen * 0.46 * pulse;

    ctx.globalAlpha = exPulse;
    const exGrad = ctx.createLinearGradient(ex, ey, ex, ey + size * 0.18);
    exGrad.addColorStop(0, thermal.core);
    exGrad.addColorStop(0.6, thermal.glow);
    exGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = exGrad;
    ctx.fillRect(ex - size * 0.035, ey, size * 0.07, size * 0.18);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY 3: SAM TURRET — Hexagonal platform + rotating barrel
// ─────────────────────────────────────────────────────────────

function drawSAMTurret(ctx, size, render, thermal, animTime, turretAngle) {
  const bodyW = size * (render.bodyWidth || 0.70) * 0.5;
  const bodyH = size * (render.bodyLength || 0.55) * 0.5;

  ctx.save();

  // Platform fill gradient
  const fillGrad = ctx.createLinearGradient(0, -bodyH, 0, bodyH);
  fillGrad.addColorStop(0, thermal.outer);
  fillGrad.addColorStop(0.5, thermal.mid);
  fillGrad.addColorStop(1, thermal.outer);

  // Hexagonal base platform
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = Math.cos(angle) * bodyW;
    const py = Math.sin(angle) * bodyH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Armor plate lines (horizontal heavy segments)
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.9;
  for (let i = -2; i <= 2; i++) {
    const y = i * bodyH * 0.28;
    const xSpread = bodyW * (0.85 - Math.abs(i) * 0.12);
    ctx.beginPath();
    ctx.moveTo(-xSpread, y);
    ctx.lineTo(xSpread, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Corner reinforcement bolts
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const bx = Math.cos(angle) * bodyW * 0.82;
    const by = Math.sin(angle) * bodyH * 0.82;
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Dual Antenna Masts on Flanks
  const antennaPositions = [
    { x: -bodyW * 0.65, y: -bodyH * 0.4 },
    { x: bodyW * 0.65, y: -bodyH * 0.4 }
  ];
  for (const ap of antennaPositions) {
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(ap.x, ap.y);
    ctx.lineTo(ap.x, ap.y - size * 0.18);
    ctx.stroke();

    // Blinking warning amber comms beacon
    ctx.fillStyle = thermal.core;
    ctx.globalAlpha = 0.5 + Math.sin(animTime * 0.008 + ap.x) * 0.4;
    ctx.beginPath();
    ctx.arc(ap.x, ap.y - size * 0.18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Rotating Turret Assembly
  ctx.save();
  ctx.rotate(turretAngle);

  // Turret base ring
  const turretBaseR = size * 0.16;
  ctx.fillStyle = thermal.mid;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, turretBaseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dual Turret Barrels (extends towards target)
  const barrelLen = size * 0.32;
  const barrelW = size * 0.035;
  const barrelSpacing = size * 0.055;

  for (const side of [-1, 1]) {
    const bx = side * barrelSpacing;
    ctx.fillStyle = thermal.mid;
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(bx - barrelW * 0.5, -turretBaseR - barrelLen, barrelW, barrelLen);
    ctx.fill();
    ctx.stroke();

    // Barrel Muzzle Brake
    ctx.fillStyle = thermal.core;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bx - barrelW * 0.8, -turretBaseR - barrelLen, barrelW * 1.6, size * 0.04);
    ctx.globalAlpha = 1;
  }

  // Turret Core Sensor Dome
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore(); // Undo turret rotation

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY 4: KAMIKAZE DRONE — Pointed wedge + glowing nose cone
// ─────────────────────────────────────────────────────────────

function drawKamikazeDrone(ctx, size, render, thermal, animTime, isDiving, diveWarning = false) {
  const bodyLen = size * (render.bodyLength || 0.55);
  const bodyW = size * (render.bodyWidth || 0.35) * 0.5;
  const showAlert = isDiving || diveWarning;
  const divePulse = showAlert ? (0.5 + Math.sin(animTime * 0.025) * 0.5) : 0;

  ctx.save();

  // Fill gradient (intense danger red when diving)
  const fillGrad = ctx.createLinearGradient(0, -bodyLen * 0.5, 0, bodyLen * 0.5);
  fillGrad.addColorStop(0, isDiving ? thermal.core : thermal.mid);
  fillGrad.addColorStop(0.5, thermal.outer);
  fillGrad.addColorStop(1, thermal.outer);

  // Wedge / missile body
  ctx.beginPath();
  // Sharp explosive nose point
  ctx.moveTo(0, -bodyLen * 0.58);
  // Forward wedge body
  ctx.lineTo(bodyW * 0.6, -bodyLen * 0.15);
  ctx.lineTo(bodyW, bodyLen * 0.12);
  // Rear stabilizer fins
  ctx.lineTo(bodyW * 1.45, bodyLen * 0.38);
  ctx.lineTo(bodyW * 1.0, bodyLen * 0.34);
  // Aft fuselage
  ctx.lineTo(bodyW * 0.75, bodyLen * 0.50);
  // Engine notch
  ctx.lineTo(0, bodyLen * 0.44);
  // Mirror left
  ctx.lineTo(-bodyW * 0.75, bodyLen * 0.50);
  ctx.lineTo(-bodyW * 1.0, bodyLen * 0.34);
  ctx.lineTo(-bodyW * 1.45, bodyLen * 0.38);
  ctx.lineTo(-bodyW, bodyLen * 0.12);
  ctx.lineTo(-bodyW * 0.6, -bodyLen * 0.15);
  ctx.closePath();

  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = isDiving ? 2.0 : 1.4;
  ctx.stroke();

  // Exposed wiring detail (disposable look)
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.35, -bodyLen * 0.1);
  ctx.lineTo(-bodyW * 0.35, bodyLen * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyW * 0.35, -bodyLen * 0.1);
  ctx.lineTo(bodyW * 0.35, bodyLen * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Glowing explosive warhead nose cone
  const noseGlowR = size * 0.12;
  const noseY = -bodyLen * 0.44;
  const nosePulse = isDiving
    ? (0.8 + Math.sin(animTime * 0.03) * 0.2)
    : (0.4 + Math.sin(animTime * 0.005) * 0.25);

  // Warhead glow aura
  ctx.globalAlpha = nosePulse;
  const noseGrad = ctx.createRadialGradient(0, noseY, 0, 0, noseY, noseGlowR * 2);
  noseGrad.addColorStop(0, '#ffffff');
  noseGrad.addColorStop(0.3, thermal.core);
  noseGrad.addColorStop(0.7, thermal.glow);
  noseGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.arc(0, noseY, noseGlowR * 2, 0, Math.PI * 2);
  ctx.fill();

  // Nose warhead core dot
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, noseY, size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Dive warning telegraph flash (pulsing danger silhouette)
  if (showAlert && divePulse > 0.4) {
    ctx.globalAlpha = 0.45 * divePulse;
    ctx.fillStyle = '#ff003c';
    ctx.beginPath();
    ctx.moveTo(0, -bodyLen * 0.58);
    ctx.lineTo(bodyW * 0.6, -bodyLen * 0.15);
    ctx.lineTo(bodyW, bodyLen * 0.12);
    ctx.lineTo(bodyW * 1.45, bodyLen * 0.38);
    ctx.lineTo(bodyW * 1.0, bodyLen * 0.34);
    ctx.lineTo(bodyW * 0.75, bodyLen * 0.50);
    ctx.lineTo(0, bodyLen * 0.44);
    ctx.lineTo(-bodyW * 0.75, bodyLen * 0.50);
    ctx.lineTo(-bodyW * 1.0, bodyLen * 0.34);
    ctx.lineTo(-bodyW * 1.45, bodyLen * 0.38);
    ctx.lineTo(-bodyW, bodyLen * 0.12);
    ctx.lineTo(-bodyW * 0.6, -bodyLen * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Engine exhaust (overheated plasma jet)
  const exPulse = isDiving ? 1.0 : (0.5 + Math.sin(animTime * 0.008) * 0.3);
  const exLen = isDiving ? size * 0.35 : size * 0.12;
  ctx.globalAlpha = exPulse;
  const exGrad = ctx.createLinearGradient(0, bodyLen * 0.42, 0, bodyLen * 0.42 + exLen);
  exGrad.addColorStop(0, '#ffffff');
  exGrad.addColorStop(0.2, thermal.core);
  exGrad.addColorStop(0.7, thermal.glow);
  exGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = exGrad;
  ctx.fillRect(-size * 0.04, bodyLen * 0.42, size * 0.08, exLen);
  ctx.globalAlpha = 1;

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// ENEMY 5: RADAR JAMMER — Octagonal body + antenna spines
// ─────────────────────────────────────────────────────────────

function drawRadarJammer(ctx, size, render, thermal, animTime, jamPulse) {
  const bodyR = size * 0.38;
  const spinePulse = 0.5 + Math.sin(animTime * 0.004) * 0.35;

  ctx.save();

  // Primary Jamming aura ring (pulsing outward with toxic green ECM interference)
  const auraPulse = Math.sin(animTime * 0.005 + jamPulse) * 0.5 + 0.5;
  ctx.globalAlpha = auraPulse * 0.22;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  const auraR = bodyR * (1.8 + auraPulse * 1.0);
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Secondary aura ring (offset phase)
  const aura2Pulse = Math.sin(animTime * 0.005 + jamPulse + Math.PI) * 0.5 + 0.5;
  ctx.globalAlpha = aura2Pulse * 0.15;
  ctx.lineWidth = 1.2;
  const aura2R = bodyR * (1.4 + aura2Pulse * 0.8);
  ctx.beginPath();
  ctx.arc(0, 0, aura2R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Body fill gradient (toxic green ECM glow)
  const fillGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR);
  fillGrad.addColorStop(0, thermal.mid);
  fillGrad.addColorStop(0.65, thermal.outer);
  fillGrad.addColorStop(1, thermal.outer);

  // Octagonal body
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(angle) * bodyR;
    const py = Math.sin(angle) * bodyR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Inner octagon detail ring
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(angle) * bodyR * 0.55;
    const py = Math.sin(angle) * bodyR * 0.55;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 6 Antenna spines (radiating outward)
  const antennaCount = render.antennaCount || 6;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.4;

  for (let i = 0; i < antennaCount; i++) {
    const angle = (i / antennaCount) * Math.PI * 2;
    const innerR = bodyR * 1.02;
    const outerR = bodyR * 1.65;
    const ix = Math.cos(angle) * innerR;
    const iy = Math.sin(angle) * innerR;
    const ox = Math.cos(angle) * outerR;
    const oy = Math.sin(angle) * outerR;

    // Spine line
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();

    // Spine tip node (blinking)
    const tipPulse = Math.sin(animTime * 0.008 + i * 1.2) * 0.5 + 0.5;
    ctx.globalAlpha = tipPulse * 0.9;
    ctx.fillStyle = thermal.core;
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 2 Satellite dish arrays
  const dishCount = render.dishCount || 2;
  for (let i = 0; i < dishCount; i++) {
    const angle = (i / dishCount) * Math.PI + Math.PI * 0.25;
    const dx = Math.cos(angle) * bodyR * 0.68;
    const dy = Math.sin(angle) * bodyR * 0.68;

    // Dish arc
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(dx, dy, size * 0.08, angle - 0.85, angle + 0.85);
    ctx.stroke();

    // Dish feed point
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = spinePulse * 0.85;
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Central ECM emitter (pulsing core)
  const coreGlowR = bodyR * 0.28;
  const corePulse = 0.5 + Math.sin(animTime * 0.008) * 0.45;
  ctx.globalAlpha = corePulse;
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreGlowR);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, thermal.core);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreGlowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// BOSS 1: HVT MOBILE COMMAND CENTER — Multi-segment fortress
// ─────────────────────────────────────────────────────────────

function drawBossMobileCommand(ctx, x, y, size, boss, thermal, animTime, phase, segmentHP) {
  const render = boss.render;
  const coreW = size * render.coreWidth * 0.5;
  const coreH = size * render.coreHeight * 0.5;
  const podW = size * render.podWidth * 0.5;
  const podH = size * render.podHeight * 0.5;
  const podOffset = size * render.podOffsetX;

  const leftPodAlive = (segmentHP.leftPod ?? 1) > 0;
  const rightPodAlive = (segmentHP.rightPod ?? 1) > 0;
  const corePulse = phase === 2
    ? (0.7 + Math.sin(animTime * 0.012) * 0.3)
    : 1;

  ctx.save();
  ctx.translate(x, y);

  // Boss heat signature (large)
  drawBossHeatGlow(ctx, 0, 0, size * 1.5, thermal, animTime);

  // ── LEFT WEAPON POD ──
  if (leftPodAlive) {
    drawWeaponPod(ctx, -podOffset, 0, podW, podH, thermal, animTime, 'left');
  } else {
    drawDestroyedPod(ctx, -podOffset, 0, podW, podH, thermal, animTime);
  }

  // ── RIGHT WEAPON POD ──
  if (rightPodAlive) {
    drawWeaponPod(ctx, podOffset, 0, podW, podH, thermal, animTime, 'right');
  } else {
    drawDestroyedPod(ctx, podOffset, 0, podW, podH, thermal, animTime);
  }

  // ── CENTRAL COMMAND CORE ──
  // Octagonal command bridge
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(angle) * coreW * corePulse;
    const py = Math.sin(angle) * coreH * corePulse;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const coreFill = ctx.createRadialGradient(0, 0, 0, 0, 0, coreW);
  coreFill.addColorStop(0, thermal.mid);
  coreFill.addColorStop(0.6, thermal.outer);
  coreFill.addColorStop(1, thermal.outer);
  ctx.fillStyle = coreFill;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Core armor plate lines
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) {
    const ly = i * coreH * 0.3;
    ctx.beginPath();
    ctx.moveTo(-coreW * 0.7, ly);
    ctx.lineTo(coreW * 0.7, ly);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Core sensor dome
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(0, -coreH * 0.3, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Core inner ring
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, coreW * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Antenna arrays on core
  const antennaPositions = [
    { x: 0, y: -coreH * 0.85 },
    { x: -coreW * 0.5, y: -coreH * 0.6 },
    { x: coreW * 0.5, y: -coreH * 0.6 }
  ];
  for (const ap of antennaPositions) {
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(ap.x, ap.y);
    ctx.lineTo(ap.x, ap.y - size * 0.06);
    ctx.stroke();
    ctx.fillStyle = thermal.core;
    ctx.globalAlpha = 0.3 + Math.sin(animTime * 0.005) * 0.2;
    ctx.beginPath();
    ctx.arc(ap.x, ap.y - size * 0.06, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Connecting struts to pods
  ctx.strokeStyle = thermal.mid;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  if (leftPodAlive) {
    ctx.beginPath();
    ctx.moveTo(-coreW * 0.8, -coreH * 0.1);
    ctx.lineTo(-podOffset + podW, -podH * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-coreW * 0.8, coreH * 0.1);
    ctx.lineTo(-podOffset + podW, podH * 0.1);
    ctx.stroke();
  }
  if (rightPodAlive) {
    ctx.beginPath();
    ctx.moveTo(coreW * 0.8, -coreH * 0.1);
    ctx.lineTo(podOffset - podW, -podH * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coreW * 0.8, coreH * 0.1);
    ctx.lineTo(podOffset - podW, podH * 0.1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Phase 2: Overheat glow FX
  if (phase === 2) {
    const ohPulse = Math.sin(animTime * 0.01) * 0.5 + 0.5;
    ctx.globalAlpha = ohPulse * 0.25;
    ctx.fillStyle = thermal.core;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const px = Math.cos(angle) * coreW * 1.1;
      const py = Math.sin(angle) * coreH * 1.1;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/**
 * Draws an active weapon pod module
 */
function drawWeaponPod(ctx, px, py, podW, podH, thermal, animTime, side) {
  ctx.save();
  ctx.translate(px, py);

  // Pod body (rectangular with cut corners)
  ctx.beginPath();
  const cut = podW * 0.2;
  ctx.moveTo(-podW + cut, -podH);
  ctx.lineTo(podW - cut, -podH);
  ctx.lineTo(podW, -podH + cut);
  ctx.lineTo(podW, podH - cut);
  ctx.lineTo(podW - cut, podH);
  ctx.lineTo(-podW + cut, podH);
  ctx.lineTo(-podW, podH - cut);
  ctx.lineTo(-podW, -podH + cut);
  ctx.closePath();

  const podFill = ctx.createLinearGradient(0, -podH, 0, podH);
  podFill.addColorStop(0, thermal.outer);
  podFill.addColorStop(0.5, thermal.mid);
  podFill.addColorStop(1, thermal.outer);
  ctx.fillStyle = podFill;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Turret barrels (2 per pod)
  const barrelSpacing = podH * 0.35;
  for (let b = -1; b <= 1; b += 2) {
    const by = b * barrelSpacing;
    const barrelDir = side === 'left' ? -1 : 1;
    const barrelLen = podW * 0.8;

    ctx.strokeStyle = thermal.mid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barrelDir * podW * 0.3, by);
    ctx.lineTo(barrelDir * (podW * 0.3 + barrelLen * 0.3), by);
    ctx.stroke();

    // Muzzle dot
    ctx.fillStyle = thermal.core;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(barrelDir * (podW * 0.3 + barrelLen * 0.3), by, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Pod detail lines
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-podW * 0.5, 0);
  ctx.lineTo(podW * 0.5, 0);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * Draws a destroyed/exploded pod (debris stub)
 */
function drawDestroyedPod(ctx, px, py, podW, podH, thermal, animTime) {
  ctx.save();
  ctx.translate(px, py);

  // Damaged stub (jagged remains)
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  ctx.beginPath();
  ctx.moveTo(-podW * 0.3, -podH * 0.4);
  ctx.lineTo(podW * 0.2, -podH * 0.6);
  ctx.lineTo(podW * 0.4, -podH * 0.1);
  ctx.lineTo(podW * 0.1, podH * 0.3);
  ctx.lineTo(-podW * 0.2, podH * 0.5);
  ctx.lineTo(-podW * 0.4, podH * 0.1);
  ctx.closePath();
  ctx.stroke();

  ctx.setLineDash([]);

  // Sparking embers
  const sparkPhase = (animTime * 0.01) % (Math.PI * 2);
  ctx.fillStyle = thermal.core;
  for (let i = 0; i < 3; i++) {
    const sx = Math.sin(sparkPhase + i * 2.1) * podW * 0.3;
    const sy = Math.cos(sparkPhase + i * 1.7) * podH * 0.3;
    ctx.globalAlpha = Math.random() * 0.5 + 0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// BOSS 2: APEX SUBMERSIBLE DREADNOUGHT — Segmented hull
// ─────────────────────────────────────────────────────────────

function drawBossApexDreadnought(ctx, x, y, size, boss, thermal, animTime, phase, segmentHP, beamAngle, isSubmerged) {
  const render = boss.render;
  const totalW = size * render.totalWidth * 0.5;
  const totalH = size * render.totalLength * 0.5;

  ctx.save();
  ctx.translate(x, y);

  // Submerge ripple FX
  if (isSubmerged) {
    drawSubmergeRipple(ctx, 0, 0, totalW, thermal, animTime);
    ctx.restore();
    return;
  }

  // Massive heat glow
  drawBossHeatGlow(ctx, 0, 0, size * 2, thermal, animTime);

  // ── MAIN HULL — elongated segmented dreadnought ──
  const hullFill = ctx.createLinearGradient(0, -totalH, 0, totalH);
  hullFill.addColorStop(0, thermal.outer);
  hullFill.addColorStop(0.3, thermal.mid);
  hullFill.addColorStop(0.7, thermal.mid);
  hullFill.addColorStop(1, thermal.outer);

  // Hull outline (submarine-inspired)
  ctx.beginPath();
  // Forward sensor array (narrow nose)
  ctx.moveTo(0, -totalH);
  ctx.lineTo(totalW * 0.2, -totalH * 0.85);
  ctx.lineTo(totalW * 0.35, -totalH * 0.65);
  // Widening midship
  ctx.lineTo(totalW * 0.6, -totalH * 0.35);
  ctx.lineTo(totalW * 0.85, -totalH * 0.1);
  // Widest point — beam emitter section
  ctx.lineTo(totalW, totalH * 0.0);
  ctx.lineTo(totalW * 0.9, totalH * 0.15);
  // Aft narrowing
  ctx.lineTo(totalW * 0.7, totalH * 0.4);
  ctx.lineTo(totalW * 0.5, totalH * 0.6);
  // Engine bank
  ctx.lineTo(totalW * 0.4, totalH * 0.85);
  ctx.lineTo(totalW * 0.25, totalH);
  // Aft center
  ctx.lineTo(0, totalH * 0.92);
  // Mirror left side
  ctx.lineTo(-totalW * 0.25, totalH);
  ctx.lineTo(-totalW * 0.4, totalH * 0.85);
  ctx.lineTo(-totalW * 0.5, totalH * 0.6);
  ctx.lineTo(-totalW * 0.7, totalH * 0.4);
  ctx.lineTo(-totalW * 0.9, totalH * 0.15);
  ctx.lineTo(-totalW, totalH * 0.0);
  ctx.lineTo(-totalW * 0.85, -totalH * 0.1);
  ctx.lineTo(-totalW * 0.6, -totalH * 0.35);
  ctx.lineTo(-totalW * 0.35, -totalH * 0.65);
  ctx.lineTo(-totalW * 0.2, -totalH * 0.85);
  ctx.closePath();

  ctx.fillStyle = hullFill;
  ctx.fill();
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hull segment division lines
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.8;
  const segmentYs = [-0.6, -0.3, 0.0, 0.3, 0.6];
  for (const sy of segmentYs) {
    const segY = totalH * sy;
    const segSpread = totalW * (0.5 + (1 - Math.abs(sy)) * 0.4);
    ctx.beginPath();
    ctx.moveTo(-segSpread, segY);
    ctx.lineTo(segSpread, segY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Armor plate rows (greeble detail)
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 8; i++) {
    const gy = -totalH * 0.8 + i * (totalH * 2 * 0.8) / 7;
    const gSpread = totalW * (0.3 + (1 - Math.abs(gy / totalH)) * 0.5);
    ctx.beginPath();
    ctx.moveTo(-gSpread, gy);
    ctx.lineTo(gSpread, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── SPINE HARDPOINTS ──
  const spineHP = render.spineHardpoints || 4;
  for (let i = 0; i < spineHP; i++) {
    const hpY = -totalH * 0.4 + i * (totalH * 0.8 / (spineHP - 1));
    drawSpineHardpoint(ctx, 0, hpY, size * 0.04, thermal, animTime, i);
  }

  // ── FORWARD SENSOR ARRAY ──
  if (render.forwardSensorArray) {
    drawForwardSensorArray(ctx, 0, -totalH * 0.82, size * 0.06, thermal, animTime);
  }

  // ── MID BEAM EMITTER ──
  if (render.midBeamEmitter && phase >= 2) {
    drawBeamEmitter(ctx, 0, 0, totalW * 0.3, thermal, animTime, beamAngle);
  }

  // ── AFT ENGINE BANK ──
  if (render.aftEngineBank) {
    drawAftEngineBank(ctx, 0, totalH * 0.85, totalW * 0.35, thermal, animTime);
  }

  // ── CENTER SPINE LINE ──
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -totalH * 0.9);
  ctx.lineTo(0, totalH * 0.85);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── PHASE 3: Hull cracking + energy leaks ──
  if (phase === 3) {
    drawHullCracking(ctx, totalW, totalH, thermal, animTime);
  }

  ctx.restore();
}

/**
 * Draws a spine-mounted turret hardpoint
 */
function drawSpineHardpoint(ctx, x, y, radius, thermal, animTime, index) {
  ctx.save();

  // Hardpoint housing
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner core
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.3 + Math.sin(animTime * 0.005 + index * 1.5) * 0.2;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws the dreadnought's forward sensor array
 */
function drawForwardSensorArray(ctx, x, y, radius, thermal, animTime) {
  ctx.save();

  // Sensor cone
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI * 0.7, Math.PI * 0.7, true);
  ctx.stroke();

  // Sensor dot (pulsing)
  const sPulse = 0.5 + Math.sin(animTime * 0.006) * 0.4;
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = sPulse;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws the beam emitter (active in phase 2+)
 */
function drawBeamEmitter(ctx, x, y, radius, thermal, animTime, beamAngle) {
  ctx.save();
  ctx.translate(x, y);

  // Emitter ring (charged)
  const chargePulse = 0.6 + Math.sin(animTime * 0.008) * 0.4;
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 2;
  ctx.globalAlpha = chargePulse;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner charging core
  ctx.globalAlpha = chargePulse * 0.5;
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.6);
  coreGrad.addColorStop(0, thermal.core);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Beam direction indicator
  ctx.globalAlpha = 0.5;
  ctx.rotate(beamAngle);
  ctx.strokeStyle = thermal.core;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -radius * 3);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws aft engine bank
 */
function drawAftEngineBank(ctx, x, y, width, thermal, animTime) {
  ctx.save();
  ctx.translate(x, y);

  const engineCount = 4;
  const spacing = width * 2 / (engineCount + 1);
  const exPulse = 0.5 + Math.sin(animTime * 0.007) * 0.4;

  for (let i = 0; i < engineCount; i++) {
    const ex = -width + (i + 1) * spacing;

    // Engine housing
    ctx.fillStyle = thermal.outer;
    ctx.strokeStyle = thermal.mid;
    ctx.lineWidth = 1;
    const eW = width * 0.1;
    const eH = width * 0.12;
    ctx.beginPath();
    ctx.rect(ex - eW, -eH * 0.5, eW * 2, eH);
    ctx.fill();
    ctx.stroke();

    // Exhaust
    ctx.globalAlpha = exPulse;
    const exGrad = ctx.createLinearGradient(ex, eH * 0.4, ex, eH * 0.4 + width * 0.25);
    exGrad.addColorStop(0, thermal.core);
    exGrad.addColorStop(0.5, thermal.glow);
    exGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = exGrad;
    ctx.fillRect(ex - eW * 0.7, eH * 0.4, eW * 1.4, width * 0.25);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/**
 * Draws phase 3 hull cracking effect
 */
function drawHullCracking(ctx, totalW, totalH, thermal, animTime) {
  ctx.save();

  // Crack lines
  ctx.strokeStyle = thermal.overloadWhite || thermal.core;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4 + Math.sin(animTime * 0.015) * 0.3;

  // Several jagged crack lines
  const cracks = [
    [{ x: -totalW * 0.3, y: -totalH * 0.5 }, { x: -totalW * 0.1, y: -totalH * 0.2 }, { x: -totalW * 0.25, y: totalH * 0.1 }],
    [{ x: totalW * 0.2, y: -totalH * 0.3 }, { x: totalW * 0.4, y: 0 }, { x: totalW * 0.15, y: totalH * 0.3 }],
    [{ x: -totalW * 0.1, y: totalH * 0.2 }, { x: totalW * 0.1, y: totalH * 0.5 }, { x: 0, y: totalH * 0.7 }]
  ];

  for (const crack of cracks) {
    ctx.beginPath();
    ctx.moveTo(crack[0].x, crack[0].y);
    for (let i = 1; i < crack.length; i++) {
      ctx.lineTo(crack[i].x, crack[i].y);
    }
    ctx.stroke();
  }

  // Energy leak glow spots
  ctx.globalAlpha = 0.3 + Math.sin(animTime * 0.01) * 0.2;
  for (const crack of cracks) {
    const leakPt = crack[1];
    const leakGrad = ctx.createRadialGradient(leakPt.x, leakPt.y, 0, leakPt.x, leakPt.y, totalW * 0.1);
    leakGrad.addColorStop(0, thermal.overloadWhite || '#ffffff');
    leakGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = leakGrad;
    ctx.fillRect(leakPt.x - totalW * 0.1, leakPt.y - totalW * 0.1, totalW * 0.2, totalW * 0.2);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws submerge ripple FX (when dreadnought is submerged)
 */
function drawSubmergeRipple(ctx, x, y, radius, thermal, animTime) {
  ctx.save();

  const rippleCount = 3;
  for (let i = 0; i < rippleCount; i++) {
    const phase = (animTime * 0.003 + i * 0.8) % (Math.PI * 2);
    const rippleR = radius * (0.3 + Math.sin(phase) * 0.3 + i * 0.25);
    const rippleAlpha = Math.max(0, 0.2 - i * 0.06);

    ctx.globalAlpha = rippleAlpha;
    ctx.strokeStyle = thermal.core;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(x, y, rippleR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// SHARED UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Draws large boss heat signature glow
 */
function drawBossHeatGlow(ctx, cx, cy, size, thermal, animTime) {
  ctx.save();

  const pulse = 1 + Math.sin(animTime * 0.003) * 0.05;
  const glowR = size * 0.8 * pulse;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  grad.addColorStop(0, thermal.glow);
  grad.addColorStop(0.3, thermal.trail);
  grad.addColorStop(1, 'transparent');

  ctx.fillStyle = grad;
  ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

  ctx.restore();
}

/**
 * Draws hostile IFF (Identification Friend/Foe) marker — bright red triangle
 */
function drawHostileIFFMarker(ctx, x, y, thermal, animTime) {
  const blinkPhase = Math.sin(animTime * 0.006);
  if (blinkPhase < -0.6) return; // brief blink off

  ctx.save();

  const triSize = 7;
  ctx.fillStyle = thermal.core || '#ff2a4b';
  ctx.globalAlpha = 0.85 + blinkPhase * 0.15;

  ctx.beginPath();
  ctx.moveTo(x, y - triSize);
  ctx.lineTo(x + triSize * 0.85, y + triSize * 0.5);
  ctx.lineTo(x - triSize * 0.85, y + triSize * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws boss IFF marker — larger, more prominent warning indicator
 */
function drawBossIFFMarker(ctx, x, y, thermal, animTime) {
  const blinkPhase = Math.sin(animTime * 0.004);

  ctx.save();

  const triSize = 9;
  ctx.fillStyle = thermal.core;
  ctx.globalAlpha = 0.8 + blinkPhase * 0.15;

  // Outer triangle
  ctx.beginPath();
  ctx.moveTo(x, y - triSize);
  ctx.lineTo(x + triSize * 0.8, y + triSize * 0.5);
  ctx.lineTo(x - triSize * 0.8, y + triSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Inner exclamation mark
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.9;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', x, y - triSize * 0.1);

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws damage state overlay (sparking, missing panels)
 */
function drawDamageOverlay(ctx, size, thermal, hpPercent, animTime) {
  ctx.save();

  // Spark emissions (more sparks = more damaged)
  const sparkCount = hpPercent < 0.3 ? 5 : (hpPercent < 0.5 ? 3 : 1);
  const sparkPhase = animTime * 0.01;

  ctx.fillStyle = thermal.core;
  for (let i = 0; i < sparkCount; i++) {
    const sx = Math.sin(sparkPhase + i * 2.3) * size * 0.3;
    const sy = Math.cos(sparkPhase + i * 1.9) * size * 0.3;
    const sparkAlpha = Math.sin(sparkPhase * 3 + i) * 0.5 + 0.5;
    ctx.globalAlpha = sparkAlpha * 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smoke wisps (when heavily damaged)
  if (hpPercent < 0.4) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#888888';
    const smokeY = Math.sin(animTime * 0.002) * size * 0.1;
    ctx.beginPath();
    ctx.arc(size * 0.1, smokeY - size * 0.2, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws boss-specific damage FX (more dramatic)
 */
function drawBossDamageFX(ctx, x, y, size, thermal, hpPercent, animTime, phase) {
  ctx.save();
  ctx.translate(x, y);

  // Multiple spark clusters
  const clusterCount = hpPercent < 0.25 ? 8 : 4;
  ctx.fillStyle = thermal.core;

  for (let i = 0; i < clusterCount; i++) {
    const cx = Math.sin(i * 1.7) * size * 0.5;
    const cy = Math.cos(i * 2.3) * size * 0.4;
    const sAlpha = Math.sin(animTime * 0.012 + i * 1.1) * 0.5 + 0.5;

    ctx.globalAlpha = sAlpha * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flickering hull flash
  if (hpPercent < 0.3) {
    const flickerOn = Math.sin(animTime * 0.02) > 0.6;
    if (flickerOn) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = thermal.core;
      ctx.fillRect(-size * 0.8, -size * 0.6, size * 1.6, size * 1.2);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
