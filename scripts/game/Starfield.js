/**
 * Space Shooter — Parallax Starfield Background Engine
 * Renders a multi-layer parallax starry deep-space background with twinkling,
 * color variation, and dynamic warp-speed streak acceleration.
 */

export class Starfield {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   * @param {number} [options.layerCount=3]
   * @param {number} [options.starCount=220]
   * @param {number} [options.baseSpeed=1.0]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    
    this.layerCount = options.layerCount || 3;
    this.starCount = options.starCount || 220;
    this.baseSpeed = options.baseSpeed || 1.0;
    
    this.speedMultiplier = 1.0;
    this.targetSpeedMultiplier = 1.0;
    this.speedTransitionRate = 0.05;

    this.stars = [];
    this.isRunning = false;
    this.animationFrameId = null;
    this.lastTime = 0;

    // Star color palette (cyan HUD accents, faint blue, pure white, soft amber)
    this.colorPalette = [
      '#ffffff',
      '#e0f2fe',
      '#7dd3fc',
      '#00f0ff',
      '#ffb703',
      '#c7d2fe'
    ];

    this.init();
  }

  /**
   * Initialize star pool with 3 distinct depth layers.
   */
  init() {
    this.stars = [];
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;

    for (let i = 0; i < this.starCount; i++) {
      // 3 depth layers: 0 (distant/slow), 1 (mid-ground), 2 (foreground/fast)
      const layer = i % this.layerCount;
      const speedFactor = (layer + 1) * 0.45; // layer 0: 0.45, layer 1: 0.9, layer 2: 1.35
      const baseRadius = 0.6 + layer * 0.65;  // layer 0: 0.6, layer 1: 1.25, layer 2: 1.9

      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        layer,
        radius: baseRadius,
        baseSpeed: speedFactor,
        color: this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)],
        baseAlpha: 0.25 + (layer / this.layerCount) * 0.65,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.2 + Math.random() * 2.5
      });
    }
  }

  /**
   * Resize star coordinates to fit updated canvas dimension.
   */
  resize() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Distribute any out-of-bounds stars back into the new viewport
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (star.x > width) star.x = Math.random() * width;
      if (star.y > height) star.y = Math.random() * height;
    }
  }

  /**
   * Smoothly interpolate speed multiplier for warp effects.
   * @param {number} multiplier Target speed multiplier (e.g. 5.0 for warp jump, 1.0 for normal)
   * @param {number} [transitionRate=0.06]
   */
  setSpeed(multiplier, transitionRate = 0.06) {
    this.targetSpeedMultiplier = multiplier;
    this.speedTransitionRate = transitionRate;
  }

  /**
   * Trigger a burst warp speed pulse that accelerates and then decays back.
   * @param {number} [burst=6.0]
   * @param {number} [durationMs=2000]
   */
  triggerWarp(burst = 6.0, durationMs = 2000) {
    this.speedMultiplier = burst;
    this.targetSpeedMultiplier = burst;
    
    setTimeout(() => {
      this.targetSpeedMultiplier = 1.0;
      this.speedTransitionRate = 0.03;
    }, durationMs);
  }

  /**
   * Start rendering loop.
   */
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

  /**
   * Stop rendering loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update star positions, twinkling phases, and speed interpolation.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    // Interpolate speed multiplier
    this.speedMultiplier += (this.targetSpeedMultiplier - this.speedMultiplier) * this.speedTransitionRate;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const currentSpeed = this.baseSpeed * this.speedMultiplier * 60 * dt;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];

      // Move star downward along Y axis
      const vy = star.baseSpeed * currentSpeed * 1.5;
      star.y += vy;

      // Wrap around screen top when reaching bottom
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }

      // Update twinkle oscillation
      star.twinklePhase += star.twinkleSpeed * dt;
    }
  }

  /**
   * Render stars to the high-DPI canvas.
   */
  render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear frame
    ctx.clearRect(0, 0, width, height);

    const isWarping = this.speedMultiplier > 1.8;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      
      // Calculate twinkling alpha oscillation
      const twinkleMod = Math.sin(star.twinklePhase) * 0.25;
      const alpha = Math.max(0.1, Math.min(1, star.baseAlpha + twinkleMod));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.strokeStyle = star.color;

      if (isWarping) {
        // Render warp streaks when traveling fast
        const streakLength = Math.min(star.baseSpeed * this.speedMultiplier * 8, 80);
        ctx.lineWidth = star.radius * 1.2;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x, Math.max(0, star.y - streakLength));
        ctx.stroke();
      } else {
        // Standard circular star with slight radial glow on foreground layer
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo for layer 2 foreground stars
        if (star.layer === 2 && alpha > 0.6) {
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }
}