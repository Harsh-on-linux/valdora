/**
 * Space Shooter — Cinematic Parallax Starfield & Deep Space Background
 * Features:
 * - High-DPI crisp coordinate rendering
 * - Multi-layer parallax depth with distinct velocities and scales
 * - Ambient drifting nebula gas clouds with soft cosmic gradients
 * - Dynamic twinkling and star-glint halos on foreground stars
 * - Occasional high-velocity shooting stars / meteors
 * - Hyperspace / Warp streak acceleration with smooth deceleration
 */

export class Starfield {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    this.starCount = options.starCount || 280;
    this.baseSpeed = options.baseSpeed || 45; // Pixels per second base drift

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

    // Palette with cosmic cyan, starlight white, pale violet, and warm amber
    this.colors = [
      '#ffffff',
      '#e0f2fe',
      '#7dd3fc',
      '#00f0ff',
      '#c084fc',
      '#fde047'
    ];

    this.init();
  }

  /**
   * Initialize stars, ambient nebulae, and pools.
   */
  init() {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / this.dpr || window.innerWidth;
    const h = this.canvas.height / this.dpr || window.innerHeight;

    // 1. Generate Star Layers (0: Deep/Dust, 1: Mid, 2: Foreground)
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      let layer;
      if (i < this.starCount * 0.55) {
        layer = 0; // 55% deep dust
      } else if (i < this.starCount * 0.88) {
        layer = 1; // 33% midground
      } else {
        layer = 2; // 12% foreground bright stars
      }

      let speedFactor, radius, baseAlpha;
      if (layer === 0) {
        speedFactor = 0.35 + Math.random() * 0.25;
        radius = 0.5 + Math.random() * 0.5;
        baseAlpha = 0.2 + Math.random() * 0.35;
      } else if (layer === 1) {
        speedFactor = 0.85 + Math.random() * 0.4;
        radius = 1.0 + Math.random() * 0.7;
        baseAlpha = 0.5 + Math.random() * 0.35;
      } else {
        speedFactor = 1.6 + Math.random() * 0.9;
        radius = 1.8 + Math.random() * 1.1;
        baseAlpha = 0.8 + Math.random() * 0.2;
      }

      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        layer,
        radius,
        baseSpeed: speedFactor,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        baseAlpha,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.5 + Math.random() * 3.0
      });
    }

    // 2. Ambient Drifting Nebula Patches
    this.nebulae = [
      {
        x: w * 0.25,
        y: h * 0.3,
        radius: Math.max(w, h) * 0.45,
        color: 'rgba(0, 110, 255, 0.045)',
        speed: 0.12
      },
      {
        x: w * 0.75,
        y: h * 0.7,
        radius: Math.max(w, h) * 0.5,
        color: 'rgba(140, 20, 255, 0.038)',
        speed: 0.18
      },
      {
        x: w * 0.5,
        y: h * 0.1,
        radius: Math.max(w, h) * 0.38,
        color: 'rgba(0, 240, 255, 0.032)',
        speed: 0.15
      }
    ];

    this.meteors = [];
  }

  /**
   * Handle dynamic resize
   */
  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      if (s.x > w) s.x = Math.random() * w;
      if (s.y > h) s.y = Math.random() * h;
    }
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
   * Spawn a high-velocity shooting star / meteor
   */
  spawnMeteor(w, h) {
    this.meteors.push({
      x: Math.random() * w * 1.2 - w * 0.1,
      y: -20,
      vx: (Math.random() - 0.5) * 120,
      vy: 450 + Math.random() * 350,
      length: 60 + Math.random() * 80,
      color: Math.random() > 0.4 ? '#00f0ff' : '#ffb703',
      alpha: 1.0,
      decay: 0.7 + Math.random() * 0.5
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

    // Smooth speed multiplier interpolation
    this.speedMultiplier += (this.targetSpeedMultiplier - this.speedMultiplier) * this.speedTransitionRate;

    const currentVelocity = this.baseSpeed * this.speedMultiplier * dt;

    // 1. Update stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += s.baseSpeed * currentVelocity;

      if (s.y > h) {
        s.y = -2;
        s.x = Math.random() * w;
      }

      s.twinklePhase += s.twinkleSpeed * dt;
    }

    // 2. Update nebulae
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      n.y += n.speed * currentVelocity * 0.3;
      if (n.y - n.radius > h) {
        n.y = -n.radius;
        n.x = Math.random() * w;
      }
    }

    // 3. Update meteors
    this.meteorTimer += dt;
    // Don't spawn meteors during extreme warp
    if (this.speedMultiplier < 3.0 && this.meteorTimer > 4.5) {
      if (Math.random() < 0.6) {
        this.spawnMeteor(w, h);
      }
      this.meteorTimer = 0;
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.alpha -= m.decay * dt;

      if (m.alpha <= 0 || m.y > h + 100) {
        this.meteors.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

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

      // Twinkle calculation
      const twinkleMod = Math.sin(s.twinklePhase) * 0.3;
      const alpha = Math.max(0.12, Math.min(1.0, s.baseAlpha + twinkleMod));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = s.color;

      if (isWarping) {
        // Hyperspace streak lines
        const streakLength = Math.min(s.baseSpeed * this.speedMultiplier * 14, 140);
        ctx.lineWidth = Math.max(1, s.radius * 0.8);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, Math.max(0, s.y - streakLength));
        ctx.stroke();
      } else {
        // Crisp circular star
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Foreground star cross-glint / halo glow
        if (s.layer === 2 && alpha > 0.65) {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 3. Render Meteors / Shooting Stars
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, m.alpha);

      const grad = ctx.createLinearGradient(
        m.x, m.y,
        m.x - (m.vx / m.vy) * m.length, m.y - m.length
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, m.color);
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - (m.vx / m.vy) * m.length, m.y - m.length);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}