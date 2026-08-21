/**
 * Space Shooter — Tactical Map & Satellite Scanning Layer
 * Features:
 * - Procedural topographic contour rings and elevation isobars
 * - Smooth vertical scrolling synchronized with engine flight speed
 * - Tactical MGRS coordinate grid lines with sector coordinate labels
 * - Sweeping radar scanline pass with phosphor trail effect
 * - Zero-allocation rendering loop optimized for 60+ FPS
 */

export class TacticalMapLayer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.scrollOffsetY = 0;
    this.baseSpeed = options.baseSpeed || 75; // Pixels per second at 1x
    this.speedMultiplier = 1.0;
    
    // Grid settings
    this.gridSize = options.gridSize || 120;
    
    // Radar sweep settings
    this.sweepY = 0;
    this.sweepSpeed = 220; // Pixels per second
    
    // Topographic contours data (procedurally generated nodes)
    this.contours = this._generateContours();
    
    // Grid markings and waypoints
    this.waypoints = [
      { rx: 0.2, ry: 0.15, label: 'WP-ALPHA // NAV-01', type: 'waypoint' },
      { rx: 0.82, ry: 0.38, label: 'OBJ-BRAVO // RADAR-JAM', type: 'hostile' },
      { rx: 0.35, ry: 0.65, label: 'LZ-CHARLIE // EXTRACTION', type: 'friendly' },
      { rx: 0.75, ry: 0.85, label: 'ZONE-DELTA // FLIR-HOT', type: 'hostile' }
    ];
  }

  /**
   * Generate static topographic contour loop definitions.
   */
  _generateContours() {
    const contours = [];
    const seedCenters = [
      { cx: 0.25, cy: 0.2, rMax: 180, layers: 4, label: 'ELEV +1420m' },
      { cx: 0.78, cy: 0.45, rMax: 240, layers: 5, label: 'CRATER BASIN -320m' },
      { cx: 0.35, cy: 0.75, rMax: 200, layers: 4, label: 'RIDGE SECTOR 4B' },
      { cx: 0.85, cy: 0.9, rMax: 160, layers: 3, label: 'PLATEAU +890m' }
    ];

    for (const c of seedCenters) {
      for (let l = 1; l <= c.layers; l++) {
        const radius = (c.rMax / c.layers) * l;
        contours.push({
          relX: c.cx,
          relY: c.cy,
          radius,
          layerIndex: l,
          maxLayers: c.layers,
          label: l === c.layers ? c.label : null,
          points: this._generateContourPoints(radius, 16)
        });
      }
    }
    return contours;
  }

  /**
   * Generate perturbed contour perimeter points for organic topographic look.
   */
  _generateContourPoints(radius, segments = 16) {
    const points = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Deterministic pseudo-noise modulation
      const noise = 1 + Math.sin(angle * 3) * 0.12 + Math.cos(angle * 5) * 0.08;
      points.push({
        cos: Math.cos(angle) * noise,
        sin: Math.sin(angle) * noise
      });
    }
    return points;
  }

  /**
   * Update scrolling offsets and radar sweep line.
   * @param {number} dt - Delta time in seconds
   * @param {number} [speedFactor=1.0] - Dynamic multiplier from engine
   */
  update(dt, speedFactor = 1.0) {
    this.speedMultiplier = speedFactor;
    const distance = this.baseSpeed * this.speedMultiplier * dt;
    this.scrollOffsetY = (this.scrollOffsetY + distance) % (this.gridSize * 10);

    // Update radar sweep position
    this.sweepY += this.sweepSpeed * dt;
  }

  /**
   * Render the tactical satellite grid, contours, and radar sweep.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width - Viewport width in CSS pixels
   * @param {number} height - Viewport height in CSS pixels
   */
  render(ctx, width, height) {
    // Keep sweep bounded to viewport height
    if (this.sweepY > height + 80) {
      this.sweepY = -80;
    }

    ctx.save();

    // 1. Draw subtle tactical grid lines & coordinates
    this._renderGrid(ctx, width, height);

    // 2. Draw topographic contour isobars
    this._renderContours(ctx, width, height);

    // 3. Draw tactical waypoints & mission markers
    this._renderWaypoints(ctx, width, height);

    // 4. Draw radar sweep scanning line
    this._renderRadarSweep(ctx, width, height);

    ctx.restore();
  }

  /**
   * Draw the tactical MGRS coordinate grid.
   */
  _renderGrid(ctx, width, height) {
    const gs = this.gridSize;
    const offsetY = this.scrollOffsetY % gs;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.font = '9px "Share Tech Mono", monospace';

    // Vertical grid lines
    for (let x = 0; x <= width; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Tick crosshair on grid intersections
      for (let y = offsetY - gs; y <= height + gs; y += gs) {
        if (y < 0) continue;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x, y + 4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      }
    }

    // Horizontal grid lines & MGRS coordinate tags
    let gridIndexY = Math.floor(this.scrollOffsetY / gs);
    for (let y = offsetY - gs; y <= height + gs; y += gs) {
      if (y >= 0 && y <= height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Print MGRS coordinate tag along left edge
        const coordLabel = `MGRS 44V-${String(Math.abs(gridIndexY % 100)).padStart(2, '0')}`;
        ctx.fillText(coordLabel, 8, y - 4);
      }
      gridIndexY++;
    }
  }

  /**
   * Draw topographic elevation contour rings.
   */
  _renderContours(ctx, width, height) {
    const mapHeight = height * 2.5; // Virtual repeating map height
    const scrollY = (this.scrollOffsetY * 0.6) % mapHeight;

    ctx.font = '8px "Share Tech Mono", monospace';

    for (let repeat = -1; repeat <= 1; repeat++) {
      const baseOffset = repeat * mapHeight + scrollY;

      for (let i = 0; i < this.contours.length; i++) {
        const c = this.contours[i];
        const cx = c.relX * width;
        const cy = c.relY * mapHeight + baseOffset;

        // Skip if outside viewport
        if (cy + c.radius < -100 || cy - c.radius > height + 100) continue;

        const alpha = 0.03 + (c.layerIndex / c.maxLayers) * 0.06;
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = c.layerIndex === c.maxLayers ? 1.2 : 0.8;

        ctx.beginPath();
        for (let p = 0; p < c.points.length; p++) {
          const pt = c.points[p];
          const px = cx + pt.cos * c.radius;
          const py = cy + pt.sin * c.radius;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw elevation label on outer contour
        if (c.label && c.layerIndex === c.maxLayers) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
          ctx.fillText(c.label, cx - c.radius * 0.6, cy - c.radius * 0.7);
        }
      }
    }
  }

  /**
   * Draw tactical waypoint icons and sector markings.
   */
  _renderWaypoints(ctx, width, height) {
    const mapHeight = height * 2.5;
    const scrollY = (this.scrollOffsetY * 0.75) % mapHeight;

    ctx.font = '9px "Share Tech Mono", monospace';

    for (let repeat = -1; repeat <= 1; repeat++) {
      const baseOffset = repeat * mapHeight + scrollY;

      for (let i = 0; i < this.waypoints.length; i++) {
        const wp = this.waypoints[i];
        const wx = wp.rx * width;
        const wy = wp.ry * mapHeight + baseOffset;

        if (wy < -40 || wy > height + 40) continue;

        let color = '#00f0ff';
        let badgeColor = 'rgba(0, 240, 255, 0.4)';
        if (wp.type === 'hostile') {
          color = '#ff003c';
          badgeColor = 'rgba(255, 0, 60, 0.4)';
        } else if (wp.type === 'friendly') {
          color = '#2dd4dc';
          badgeColor = 'rgba(45, 212, 220, 0.4)';
        }

        // Draw tactical bracket box
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx - 8, wy - 8, 16, 16);

        // Center dot
        ctx.fillStyle = color;
        ctx.fillRect(wx - 1.5, wy - 1.5, 3, 3);

        // Text label
        ctx.fillStyle = badgeColor;
        ctx.fillText(wp.label, wx + 12, wy + 3);
      }
    }
  }

  /**
   * Render horizontal radar sweep line with fading phosphor trail.
   */
  _renderRadarSweep(ctx, width, height) {
    const sy = this.sweepY;
    if (sy < -60 || sy > height + 60) return;

    // Gradient phosphor trail behind sweep line
    const trailHeight = 50;
    const grad = ctx.createLinearGradient(0, sy - trailHeight, 0, sy);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.025)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.12)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.max(0, sy - trailHeight), width, trailHeight);

    // Primary bright sweep scanline
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();

    // Subtle leading beam tick
    ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.fillRect(width * 0.5 - 20, sy - 1, 40, 2);
  }
}
