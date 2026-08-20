/**
 * Space Shooter — Cinematic Radial Parallax Starfield & Deep Space Background
 * Features:
 * - Radial parallax: stars emanate from a central vanishing point outward,
 *   simulating forward flight through deep space
 * - Three depth layers with distinct expansion rates for true parallax
 * - Stars grow in size and brightness as they approach screen edges
 * - Ambient drifting nebula gas clouds with soft cosmic gradients
 * - Dynamic twinkling and star-glint halos on foreground stars
 * - Occasional high-velocity shooting stars / meteors (radial)
 * - Hyperspace / Warp streak acceleration with smooth deceleration
 * - High-DPI crisp coordinate rendering
 */

export class Starfield {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    this.starCount = options.starCount || 320;
    this.baseSpeed = options.baseSpeed || 0.15; // Radial expansion speed factor

    this.speedMultiplier = 1.0;
    this.targetSpeedMultiplier = 1.0;
    this.speedTransitionRate = 0.04;

    this.stars = [];
    this.nebulae = [];
    this.meteors = [];
    this.meteorTimer = 0;

    this.isRunning = false;
    this.animationFrameId = null;
    this.lastTime = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Palette — starlight white, pale cyan, soft teal, warm amber accents
    this.colors = [
      '#ffffff',
      '#e2edf2',
      '#a5d8e0',
      '#2dd4dc',
      '#5eedf5',
      '#fcd98a'
    ];

    // Deep space background color
    this.bgColor = '#05070a';

    this.init();
  }

  /**
   * Initialize stars, ambient nebulae, and pools.
   */
  init() {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / this.dpr || window.innerWidth;
    const h = this.canvas.height / this.dpr || window.innerHeight;

    // Vanishing point — center of the viewport
    this.cx = w / 2;
    this.cy = h / 2;

    // Maximum distance a star can travel from center before recycling
    this.maxDist = Math.sqrt(this.cx * this.cx + this.cy * this.cy) * 1.15;

    // 1. Generate Star Layers using normalized radial coordinates
    //    Each star stores its position as an angle and a normalized distance
    //    from center (0 = vanishing point, 1 = edge of screen)
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this._spawnStar(true);
    }

    // 2. Ambient Drifting Nebula Patches
    this.nebulae = [
      {
        x: w * 0.25,
        y: h * 0.3,
        radius: Math.max(w, h) * 0.45,
        color: 'rgba(0, 110, 255, 0.045)',
        speed: 0.008
      },
      {
        x: w * 0.75,
        y: h * 0.7,
        radius: Math.max(w, h) * 0.5,
        color: 'rgba(140, 20, 255, 0.038)',
        speed: 0.012
      },
      {
        x: w * 0.5,
        y: h * 0.1,
        radius: Math.max(w, h) * 0.38,
        color: 'rgba(0, 240, 255, 0.032)',
        speed: 0.01
      }
    ];

    this.meteors = [];
  }

  /**
   * Spawn a star in the radial system.
   * @param {boolean} randomDist - If true, place at random distance (for init);
   *                                if false, spawn near center (for recycling)
   */
  _spawnStar(randomDist = false) {
    // Determine layer: 0 = deep/dust, 1 = mid, 2 = foreground
    const roll = Math.random();
    let layer, speedFactor, minRadius, maxRadius, baseAlpha;

    if (roll < 0.55) {
      layer = 0; // 55% deep dust
      speedFactor = 0.15 + Math.random() * 0.15;
      minRadius = 0.2;
      maxRadius = 0.55;
      baseAlpha = 0.08 + Math.random() * 0.12; // Far away pinpricks, very dim
    } else if (roll < 0.88) {
      layer = 1; // 33% midground
      speedFactor = 0.4 + Math.random() * 0.3;
      minRadius = 0.4;
      maxRadius = 1.0;
      baseAlpha = 0.25 + Math.random() * 0.2;
    } else {
      layer = 2; // 12% foreground bright stars
      speedFactor = 0.8 + Math.random() * 0.6;
      minRadius = 1.2;
      maxRadius = 2.8;
      baseAlpha = 0.9 + Math.random() * 0.1;
    }

    // Angle from center (random direction)
    const angle = Math.random() * Math.PI * 2;

    // Normalized distance from center [0..1]
    // On init, spread across entire field; on recycle, start near center
    const dist = randomDist
      ? 0.02 + Math.random() * 0.95
      : 0.005 + Math.random() * 0.06;

    this.stars.push({
      angle,
      dist,          // Normalized distance from center [0..1]
      layer,
      speedFactor,
      minRadius,
      maxRadius,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      baseAlpha,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.5 + Math.random() * 3.0
    });
  }

  /**
   * Handle dynamic resize — reinitialize star and nebula positions.
   */
  resize() {
    this.init();
  }

  /**
   * Set target speed multiplier (e.g. 1.0 = normal, 3.0 = fast cruise, 8.0 = warp)
   */
  setSpeed(multiplier, transitionRate = 0.05) {
    this.targetSpeedMultiplier = multiplier;
    this.speedTransitionRate = transitionRate;
  }

  /**
   * Trigger warp jump burst
   */
  triggerWarp(burst = 8.0, durationMs = 2400) {
    this.speedMultiplier = burst;
    this.targetSpeedMultiplier = burst;
    this.speedTransitionRate = 0.08;

    setTimeout(() => {
      this.targetSpeedMultiplier = 1.0;
      this.speedTransitionRate = 0.035;
    }, durationMs);
  }

  /**
   * Spawn a high-velocity radial shooting star / meteor
   */
  spawnMeteor(w, h) {
    const angle = Math.random() * Math.PI * 2;
    const startDist = 0.2 + Math.random() * 0.3;

    this.meteors.push({
      angle,
      dist: startDist,
      speed: 1.8 + Math.random() * 1.5,
      length: 0.12 + Math.random() * 0.1,
      color: Math.random() > 0.4 ? '#00f0ff' : '#ffb703',
      alpha: 1.0,
      decay: 0.6 + Math.random() * 0.4
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (timestamp) => {
      if (!this.isRunning) return;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  update(dt) {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.cx = w / 2;
    this.cy = h / 2;
    this.maxDist = Math.sqrt(this.cx * this.cx + this.cy * this.cy) * 1.15;

    // Smooth speed multiplier interpolation
    this.speedMultiplier +=
      (this.targetSpeedMultiplier - this.speedMultiplier) * this.speedTransitionRate;

    const velocity = this.baseSpeed * this.speedMultiplier * dt;

    // 1. Update stars — expand outward from center
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];

      // Stars accelerate as they move outward (quadratic feel)
      // This creates the parallax: distant stars (near center) drift slowly,
      // nearby stars (near edges) rush past
      s.dist += s.speedFactor * velocity * (0.2 + s.dist * 1.0);

      // Twinkle
      s.twinklePhase += s.twinkleSpeed * dt;

      // Recycle star when it passes beyond screen edges
      if (s.dist > 1.05) {
        // Reset near center
        s.dist = 0.005 + Math.random() * 0.04;
        s.angle = Math.random() * Math.PI * 2;
        s.color = this.colors[Math.floor(Math.random() * this.colors.length)];
      }
    }

    // 2. Update nebulae (gentle radial drift)
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      // Subtle drift from center
      const nAngle = Math.atan2(n.y - this.cy, n.x - this.cx);
      n.x += Math.cos(nAngle) * n.speed * velocity * 30;
      n.y += Math.sin(nAngle) * n.speed * velocity * 30;

      // Check if nebula has drifted off screen
      if (n.x < -n.radius || n.x > w + n.radius ||
          n.y < -n.radius || n.y > h + n.radius) {
        // Reset near center with a random offset
        n.x = this.cx + (Math.random() - 0.5) * w * 0.3;
        n.y = this.cy + (Math.random() - 0.5) * h * 0.3;
      }
    }

    // 3. Update meteors
    this.meteorTimer += dt;
    if (this.speedMultiplier < 3.0 && this.meteorTimer > 4.5) {
      if (Math.random() < 0.6) {
        this.spawnMeteor(w, h);
      }
      this.meteorTimer = 0;
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.dist += m.speed * velocity * (0.5 + m.dist * 1.5);
      m.alpha -= m.decay * dt;

      if (m.alpha <= 0 || m.dist > 1.2) {
        this.meteors.splice(i, 1);
      }
    }
  }

  /**
   * Convert normalized radial coordinates to screen coordinates
   */
  _toScreen(angle, dist) {
    const screenDist = dist * this.maxDist;
    return {
      x: this.cx + Math.cos(angle) * screenDist,
      y: this.cy + Math.sin(angle) * screenDist
    };
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill with deep space background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    const isWarping = this.speedMultiplier > 2.0;

    // 1. Render Cosmic Nebulae
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, n.color);
      grad.addColorStop(0.6, n.color.replace(/[\d\.]+\)$/, '0.015)'));
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Render Stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const pos = this._toScreen(s.angle, s.dist);

      // Stars grow in radius as they expand outward (perspective)
      const perspectiveScale = s.dist * s.dist; // Quadratic growth for depth feel
      const radius = s.minRadius + (s.maxRadius - s.minRadius) * perspectiveScale;

      // Distance factor: distant stars near vanishing center (small dist) are very dim pinpricks
      const distFactor = Math.pow(s.dist, 1.3);
      let distAlpha;
      if (s.layer === 2) {
        distAlpha = 0.25 + s.baseAlpha * Math.min(1.0, distFactor * 1.6);
      } else if (s.layer === 1) {
        distAlpha = 0.05 + s.baseAlpha * Math.min(1.0, distFactor * 1.3);
      } else {
        // Deep dust: extremely dim when distant, subtle even at edges
        distAlpha = 0.03 + s.baseAlpha * Math.min(1.0, distFactor * 1.1);
      }

      // Twinkle calculation (subtler for distant stars)
      const twinkleMod = Math.sin(s.twinklePhase) * (s.layer === 2 ? 0.2 : 0.06);
      const alpha = Math.max(0.02, Math.min(1.0, distAlpha + twinkleMod));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = s.color;

      if (isWarping) {
        // Hyperspace streak lines — radiate outward from center
        const streakMultiplier = Math.min(this.speedMultiplier * 8, 80);
        const streakDist = Math.max(0, s.dist - 0.04 * streakMultiplier / this.maxDist);
        const tailPos = this._toScreen(s.angle, streakDist);

        const streakLength = Math.sqrt(
          (pos.x - tailPos.x) ** 2 + (pos.y - tailPos.y) ** 2
        );

        // Cap streak length
        const maxStreak = 160;
        let tx = tailPos.x, ty = tailPos.y;
        if (streakLength > maxStreak) {
          const ratio = maxStreak / streakLength;
          tx = pos.x - (pos.x - tailPos.x) * ratio;
          ty = pos.y - (pos.y - tailPos.y) * ratio;
        }

        ctx.lineWidth = Math.max(0.8, radius * 0.7);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      } else {
        // Crisp circular star
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Foreground star cross-glint / halo glow (only for close, bright foreground stars)
        if (s.layer === 2 && alpha > 0.65 && s.dist > 0.35) {
          ctx.globalAlpha = alpha * 0.28;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 3. Render Meteors / Shooting Stars (radial)
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      const headPos = this._toScreen(m.angle, m.dist);
      const tailDist = Math.max(0, m.dist - m.length);
      const tailPos = this._toScreen(m.angle, tailDist);

      ctx.save();
      ctx.globalAlpha = Math.max(0, m.alpha);

      const grad = ctx.createLinearGradient(
        headPos.x, headPos.y, tailPos.x, tailPos.y
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, m.color);
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(headPos.x, headPos.y);
      ctx.lineTo(tailPos.x, tailPos.y);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Subtle Radial Vignette Pass on Starfield Canvas
    const vignetteGrad = ctx.createRadialGradient(
      this.cx, this.cy, Math.min(w, h) * 0.25,
      this.cx, this.cy, Math.max(w, h) * 0.72
    );
    vignetteGrad.addColorStop(0, 'rgba(5, 7, 10, 0)');
    vignetteGrad.addColorStop(0.5, 'rgba(5, 7, 10, 0.15)');
    vignetteGrad.addColorStop(0.8, 'rgba(5, 7, 10, 0.55)');
    vignetteGrad.addColorStop(1, 'rgba(3, 5, 8, 0.85)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }
}