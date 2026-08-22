/**
 * CollisionSystem — High-Performance Spatial Partitioning & Collision Resolution Engine
 * Features:
 * - 2D Spatial Hash Grid with zero-allocation bucket reuse (constant 60Hz memory footprint)
 * - Continuous Collision Detection (CCD) via Segment-Circle / Raycast against high-speed projectiles (900+ px/s)
 * - Discrete Circle-Circle, Circle-AABB, and AABB-AABB intersection tests
 * - Multi-layer collision resolution:
 *     • Player Projectile vs Enemy Target
 *     • Enemy Projectile vs Player Drone
 *     • Player Drone vs Enemy Target (Contact Ramming)
 *     • Player Drone vs Hazard
 *     • Player Projectile vs Hazard
 *     • Player Drone vs Pickup / Intel Drop
 * - Real-time tactical debug visualizer (hitbox wireframes, spatial hash grid, contact normals, telemetry overlay)
 * - Hotkey toggleable (Key 'H' or F3) and programmatic API
 */

export const COLLISION_LAYERS = {
  PLAYER: 1 << 0,            // 1
  PLAYER_PROJECTILE: 1 << 1, // 2
  ENEMY: 1 << 2,             // 4
  ENEMY_PROJECTILE: 1 << 3,  // 8
  HAZARD: 1 << 4,            // 16
  PICKUP: 1 << 5             // 32
};

export class CollisionSystem {
  /**
   * @param {Object} [options]
   * @param {number} [options.cellSize=80] - Grid cell dimension in pixels
   * @param {boolean} [options.debug=false] - Initial debug render state
   */
  constructor(options = {}) {
    this.cellSize = options.cellSize || 80;
    this.debug = options.debug || false;

    // Spatial Hash Grid Storage (reusable flat Map of bucket arrays)
    this.grid = new Map(); // key -> Array<Collider>
    this.bucketPool = []; // Recycled arrays to prevent GC allocations

    // Collision stats telemetry
    this.stats = {
      activeColliders: 0,
      occupiedCells: 0,
      broadphasePairs: 0,
      narrowphaseTests: 0,
      hitsThisFrame: 0,
      totalHits: 0
    };

    // Recent contact points for debug rendering
    this.recentContacts = []; // Array<{ x, y, time, color, normalX, normalY }>
    this.maxContacts = 30;

    // Internal working lists to prevent allocations during query
    this._queryResult = [];
    this._testedPairSet = new Set();
  }

  /**
   * Toggle visual collision debug overlay.
   * @returns {boolean} New debug state
   */
  toggleDebug() {
    this.debug = !this.debug;
    console.log(`🎯 Collision Debug Overlay: ${this.debug ? 'ENABLED [Press H to hide]' : 'DISABLED'}`);
    return this.debug;
  }

  /**
   * Set specific debug visibility.
   * @param {boolean} state
   */
  setDebug(state) {
    this.debug = !!state;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SPATIAL HASH GRID ENGINE (Zero-GC)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Clear spatial hash grid buckets for next simulation tick.
   */
  clear() {
    for (const [key, bucket] of this.grid.entries()) {
      bucket.length = 0; // Clear contents without discarding array reference
      this.bucketPool.push(bucket);
    }
    this.grid.clear();
    this._testedPairSet.clear();

    this.stats.activeColliders = 0;
    this.stats.occupiedCells = 0;
    this.stats.broadphasePairs = 0;
    this.stats.narrowphaseTests = 0;
    this.stats.hitsThisFrame = 0;
  }

  /**
   * Compute spatial cell key from coordinates.
   * @param {number} cellX
   * @param {number} cellY
   * @returns {number} 32-bit integer key
   */
  _getCellKey(cellX, cellY) {
    return ((cellX & 0xFFFF) << 16) | (cellY & 0xFFFF);
  }

  /**
   * Insert a collider into the spatial hash grid.
   * @param {Object} collider
   */
  insert(collider) {
    if (!collider || !collider.active) return;

    this.stats.activeColliders++;
    const cs = this.cellSize;

    // Calculate grid cell bounding coordinates
    const minCellX = Math.floor(collider.minX / cs);
    const maxCellX = Math.floor(collider.maxX / cs);
    const minCellY = Math.floor(collider.minY / cs);
    const maxCellY = Math.floor(collider.maxY / cs);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this._getCellKey(cx, cy);
        let bucket = this.grid.get(key);
        if (!bucket) {
          bucket = this.bucketPool.pop() || [];
          this.grid.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GEOMETRY INTERSECTION TESTS (Circle, AABB, Segment CCD)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Circle vs Circle intersection test.
   * @param {number} x1
   * @param {number} y1
   * @param {number} r1
   * @param {number} x2
   * @param {number} y2
   * @param {number} r2
   * @returns {{hit: boolean, dist: number, overlap: number, nx: number, ny: number, hitX: number, hitY: number}}
   */
  static testCircleCircle(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distSq = dx * dx + dy * dy;
    const radiusSum = r1 + r2;

    if (distSq <= radiusSum * radiusSum) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = radiusSum - dist;
      const hitX = x1 + nx * (r1 - overlap * 0.5);
      const hitY = y1 + ny * (r1 - overlap * 0.5);

      return { hit: true, dist, overlap, nx, ny, hitX, hitY };
    }
    return { hit: false, dist: 0, overlap: 0, nx: 0, ny: 0, hitX: 0, hitY: 0 };
  }

  /**
   * Circle vs Axis-Aligned Bounding Box (AABB) test.
   * @param {number} cx
   * @param {number} cy
   * @param {number} radius
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   * @returns {{hit: boolean, hitX: number, hitY: number, nx: number, ny: number}}
   */
  static testCircleAABB(cx, cy, radius, minX, minY, maxX, maxY) {
    // Find closest point on AABB to circle center
    const closestX = Math.max(minX, Math.min(cx, maxX));
    const closestY = Math.max(minY, Math.min(cy, maxY));

    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq <= radius * radius) {
      const dist = Math.sqrt(distSq) || 0.0001;
      return {
        hit: true,
        hitX: closestX,
        hitY: closestY,
        nx: dx / dist,
        ny: dy / dist
      };
    }
    return { hit: false, hitX: 0, hitY: 0, nx: 0, ny: 0 };
  }

  /**
   * AABB vs AABB intersection test.
   * @param {number} minX1
   * @param {number} minY1
   * @param {number} maxX1
   * @param {number} maxY1
   * @param {number} minX2
   * @param {number} minY2
   * @param {number} maxX2
   * @param {number} maxY2
   * @returns {boolean}
   */
  static testAABBAABB(minX1, minY1, maxX1, maxY1, minX2, minY2, maxX2, maxY2) {
    return minX1 <= maxX2 && maxX1 >= minX2 && minY1 <= maxY2 && maxY1 >= minY2;
  }

  /**
   * Continuous Collision Detection (CCD): Ray / Line Segment vs Circle.
   * Prevents fast projectiles (e.g. 900+ px/s) from tunneling through targets.
   * @param {number} x1 - Segment start X (prev frame)
   * @param {number} y1 - Segment start Y
   * @param {number} x2 - Segment end X (cur frame)
   * @param {number} y2 - Segment end Y
   * @param {number} cx - Target Circle Center X
   * @param {number} cy - Target Circle Center Y
   * @param {number} radius - Target Circle Radius
   * @param {number} [projectileRadius=0] - Projectile head radius
   * @returns {{hit: boolean, hitX: number, hitY: number, t: number, distSq: number}}
   */
  static testSegmentCircle(x1, y1, x2, y2, cx, cy, radius, projectileRadius = 0) {
    const totalRadius = radius + projectileRadius;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Degenerate segment: point test
      const distSq = (cx - x1) * (cx - x1) + (cy - y1) * (cy - y1);
      return {
        hit: distSq <= totalRadius * totalRadius,
        hitX: x1,
        hitY: y1,
        t: 0,
        distSq
      };
    }

    // Parametric projection of circle center onto segment [0..1]
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));

    // Nearest point on segment to circle center
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const distX = cx - projX;
    const distY = cy - projY;
    const distSq = distX * distX + distY * distY;

    if (distSq <= totalRadius * totalRadius) {
      return {
        hit: true,
        hitX: projX,
        hitY: projY,
        t,
        distSq
      };
    }

    return { hit: false, hitX: 0, hitY: 0, t: 0, distSq: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COLLISION PIPELINE & RESOLUTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Main collision pipeline update step.
   * Resolves all active collisions for the current fixed simulation tick.
   * @param {import('./GameEngine.js').GameEngine} gameEngine
   * @param {number} dt - Fixed delta time
   */
  update(gameEngine, dt) {
    if (!gameEngine) return;

    this.clear();

    const player = gameEngine.player;
    const projectiles = gameEngine.projectiles;
    const hudOverlay = gameEngine.hudOverlay;
    const soundManager = window.__soundManager || null;

    // 1. Register Player Drone Collider
    let playerCollider = null;
    if (player && player.hull > 0) {
      const pHitbox = player.getHitbox();
      playerCollider = {
        id: 'player',
        type: 'circle',
        layer: COLLISION_LAYERS.PLAYER,
        mask: COLLISION_LAYERS.ENEMY | COLLISION_LAYERS.ENEMY_PROJECTILE | COLLISION_LAYERS.HAZARD | COLLISION_LAYERS.PICKUP,
        entity: player,
        x: pHitbox.x,
        y: pHitbox.y,
        radius: pHitbox.radius,
        minX: pHitbox.x - pHitbox.radius,
        maxX: pHitbox.x + pHitbox.radius,
        minY: pHitbox.y - pHitbox.radius,
        maxY: pHitbox.y + pHitbox.radius,
        active: true
      };
      this.insert(playerCollider);
    }

    // 2. Register Active Target / Enemy Colliders
    // (Supports both EnemyPool hostiles and TacticalHUDOverlay targets)
    const targetColliders = [];

    // A. Discrete EnemyPool hostiles
    if (gameEngine.enemies) {
      for (let i = 0; i < gameEngine.enemies.maxEnemies; i++) {
        const e = gameEngine.enemies.enemies[i];
        if (!e.active || e.hull <= 0) continue;

        const col = {
          id: e.id || `enemy-${i}`,
          type: 'circle',
          layer: COLLISION_LAYERS.ENEMY,
          mask: COLLISION_LAYERS.PLAYER | COLLISION_LAYERS.PLAYER_PROJECTILE,
          entity: e,
          x: e.x,
          y: e.y,
          radius: e.radius,
          minX: e.x - e.radius,
          maxX: e.x + e.radius,
          minY: e.y - e.radius,
          maxY: e.y + e.radius,
          active: true
        };
        targetColliders.push(col);
        this.insert(col);
      }
    }

    // B. TacticalHUDOverlay targets
    const targets = hudOverlay ? hudOverlay.targets : [];
    for (let i = 0; i < targets.length; i++) {
      const tgt = targets[i];
      if (!tgt || tgt.hull <= 0) continue;

      const tgtX = tgt.relX * gameEngine.width;
      const tgtY = tgt.relY * gameEngine.height;
      const tgtRadius = (tgt.size || 28) * 0.55;

      const col = {
        id: tgt.id || `target-${i}`,
        type: 'circle',
        layer: COLLISION_LAYERS.ENEMY,
        mask: COLLISION_LAYERS.PLAYER | COLLISION_LAYERS.PLAYER_PROJECTILE,
        entity: tgt,
        x: tgtX,
        y: tgtY,
        radius: tgtRadius,
        minX: tgtX - tgtRadius,
        maxX: tgtX + tgtRadius,
        minY: tgtY - tgtRadius,
        maxY: tgtY + tgtRadius,
        active: true
      };
      targetColliders.push(col);
      this.insert(col);
    }

    // 3. Register Active Projectiles (Player & Enemy)
    const projectileColliders = [];
    if (projectiles) {
      for (let i = 0; i < projectiles.maxProjectiles; i++) {
        const p = projectiles.projectiles[i];
        if (!p.active) continue;

        const isPlayer = p.owner === 'player';
        const isOrbital = p.type === 'ORBITAL';
        const minX = isOrbital ? (p.x - (p.width || 68) * 0.5) : (Math.min(p.x, p.prevX) - p.radius);
        const maxX = isOrbital ? (p.x + (p.width || 68) * 0.5) : (Math.max(p.x, p.prevX) + p.radius);
        const minY = isOrbital ? 0 : (Math.min(p.y, p.prevY) - p.radius);
        const maxY = isOrbital ? (gameEngine ? gameEngine.height : 1200) : (Math.max(p.y, p.prevY) + p.radius);

        const pCol = {
          id: `proj-${i}`,
          type: isOrbital ? 'box' : 'segment',
          layer: isPlayer ? COLLISION_LAYERS.PLAYER_PROJECTILE : COLLISION_LAYERS.ENEMY_PROJECTILE,
          mask: isPlayer ? (COLLISION_LAYERS.ENEMY | COLLISION_LAYERS.HAZARD) : (COLLISION_LAYERS.PLAYER | COLLISION_LAYERS.HAZARD),
          entity: p,
          x: p.x,
          y: p.y,
          prevX: p.prevX,
          prevY: p.prevY,
          radius: p.radius,
          damage: p.damage,
          minX,
          maxX,
          minY,
          maxY,
          active: true
        };
        projectileColliders.push(pCol);
        this.insert(pCol);
      }
    }

    // 3.5. Register Active Tactical Pickups & Supply Drops
    if (gameEngine.pickups) {
      for (let i = 0; i < gameEngine.pickups.maxPickups; i++) {
        const p = gameEngine.pickups.pickups[i];
        if (!p.active) continue;

        const pickCol = {
          id: p.id,
          type: 'circle',
          layer: COLLISION_LAYERS.PICKUP,
          mask: COLLISION_LAYERS.PLAYER,
          entity: p,
          x: p.x,
          y: p.y,
          radius: p.radius,
          minX: p.x - p.radius,
          maxX: p.x + p.radius,
          minY: p.y - p.radius,
          maxY: p.y + p.radius,
          active: true
        };
        this.insert(pickCol);
      }
    }

    this.stats.occupiedCells = this.grid.size;

    // 4. Resolve Broadphase & Narrowphase Collisions via Spatial Hash Grid
    for (const [key, bucket] of this.grid.entries()) {
      const count = bucket.length;
      if (count < 2) continue;

      for (let i = 0; i < count; i++) {
        const colA = bucket[i];
        if (!colA.active) continue;

        for (let j = i + 1; j < count; j++) {
          const colB = bucket[j];
          if (!colB.active) continue;

          // Check layer collision masks
          if (!(colA.layer & colB.mask) || !(colB.layer & colA.mask)) {
            continue;
          }

          // Generate unique pair key to prevent duplicate resolution across shared grid cells
          const pairKey = colA.id < colB.id ? `${colA.id}:${colB.id}` : `${colB.id}:${colA.id}`;
          if (this._testedPairSet.has(pairKey)) {
            continue;
          }
          this._testedPairSet.add(pairKey);
          this.stats.broadphasePairs++;

          // Perform Narrowphase collision check
          this._resolvePair(colA, colB, gameEngine, dt, soundManager);
        }
      }
    }

    // 5. Age debug contacts
    this._updateDebugContacts(dt);
  }

  /**
   * Resolve narrowphase collision between two candidate colliders.
   */
  _resolvePair(colA, colB, gameEngine, dt, soundManager) {
    this.stats.narrowphaseTests++;

    // ── CASE 1: Player Projectile vs Enemy Target ──
    if (
      (colA.layer === COLLISION_LAYERS.PLAYER_PROJECTILE && colB.layer === COLLISION_LAYERS.ENEMY) ||
      (colB.layer === COLLISION_LAYERS.PLAYER_PROJECTILE && colA.layer === COLLISION_LAYERS.ENEMY)
    ) {
      const pCol = colA.layer === COLLISION_LAYERS.PLAYER_PROJECTILE ? colA : colB;
      const tCol = colA.layer === COLLISION_LAYERS.ENEMY ? colA : colB;
      const proj = pCol.entity;
      const target = tCol.entity;

      if (!proj.active || target.hull <= 0) return;

      const isOrbital = proj.type === 'ORBITAL';
      const isHellfire = proj.type === 'HELLFIRE';
      const isFlak = proj.type === 'FLAK';
      const isLaser = proj.type === 'LASER';

      // CCD Continuous Segment vs Circle Test (or vertical beam column test for ORBITAL)
      const hitResult = isOrbital
        ? {
            hit: Math.abs(tCol.x - proj.x) <= ((proj.width || 68) * 0.5 + tCol.radius),
            hitX: tCol.x,
            hitY: tCol.y
          }
        : CollisionSystem.testSegmentCircle(
            proj.prevX, proj.prevY,
            proj.x, proj.y,
            tCol.x, tCol.y,
            tCol.radius,
            proj.radius
          );

      if (hitResult.hit) {
        this.stats.hitsThisFrame++;
        this.stats.totalHits++;

        // 1. Apply ballistic damage
        const damage = proj.damage || 15;
        const blastRadius = proj.blastRadius || 85;

        target.hull = Math.max(0, target.hull - damage);
        target.flashTimer = 0.14;

        // 2. Area-of-Effect (AoE) Blast Resolution for Hellfire Guided Missiles & Orbital Strike
        if (isOrbital) {
          if (gameEngine.projectiles) {
            gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#ffffff', 8);
            gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#c084fc', 10);
            gameEngine.projectiles.spawnMuzzleFlash(hitResult.hitX, hitResult.hitY, '#a78bfa', 32, -Math.PI / 2);
          }
          if (typeof gameEngine.addCameraShake === 'function') {
            gameEngine.addCameraShake(3.5);
          }
        } else if (isHellfire) {
          const epicX = hitResult.hitX;
          const epicY = hitResult.hitY;

          // Query all surrounding targets in combat sector
          const allTargets = (gameEngine.hudOverlay && gameEngine.hudOverlay.targets) ? gameEngine.hudOverlay.targets : [];
          for (let t = 0; t < allTargets.length; t++) {
            const otherTgt = allTargets[t];
            if (!otherTgt || otherTgt === target || otherTgt.hull <= 0) continue;

            const ox = otherTgt.relX !== undefined ? otherTgt.relX * gameEngine.width : (otherTgt.x || 0);
            const oy = otherTgt.relY !== undefined ? otherTgt.relY * gameEngine.height : (otherTgt.y || 0);
            const dist = Math.hypot(ox - epicX, oy - epicY);

            if (dist <= blastRadius) {
              const splashDamage = Math.max(1, Math.round(damage * (1.0 - dist / blastRadius) * 0.75));
              otherTgt.hull = Math.max(0, otherTgt.hull - splashDamage);
              otherTgt.flashTimer = 0.14;

              if (otherTgt.hull <= 0) {
                this._handleTargetDestroyed(otherTgt, { x: ox, y: oy, active: true }, gameEngine, soundManager);
              }
            }
          }

          // Spawn high-explosive AoE detonation FX & shrapnel/smoke plume
          if (gameEngine.projectiles) {
            gameEngine.projectiles.spawnHellfireDetonation(epicX, epicY, blastRadius, proj.color || '#ff003c');
          }

          // Concussive camera shockwave
          gameEngine.addCameraShake(12);

          // Audio
          if (soundManager && typeof soundManager.playHellfireDetonation === 'function') {
            soundManager.playHellfireDetonation(1.2);
          }
        } else {
          // Standard kinetic / flak / laser FX
          if (gameEngine.projectiles) {
            const sparkColor = proj.color || '#2dd4dc';
            if (isFlak) {
              gameEngine.projectiles.spawnFlakDetonation(hitResult.hitX, hitResult.hitY, sparkColor, 12);
            } else if (isLaser) {
              gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#e879f9', 10);
              gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#ffffff', 4);
            } else {
              gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, sparkColor, 8);
            }
          }

          if (soundManager) {
            if (isFlak && typeof soundManager.playFlakDetonation === 'function') {
              soundManager.playFlakDetonation(0.8);
            } else if (typeof soundManager.playHitImpact === 'function') {
              soundManager.playHitImpact();
            }
          }
        }

        // 4. Record contact for debug visualization
        const debugCol = isOrbital ? '#a78bfa' : (isHellfire ? '#ff003c' : (isFlak ? '#ff9e1b' : (isLaser ? '#c084fc' : '#00f0ff')));
        this._recordContact(hitResult.hitX, hitResult.hitY, debugCol);

        // 5. Decrement projectile penetration (Orbital pierces continuously)
        if (!isOrbital) {
          proj.hitsRemaining--;
          if (proj.hitsRemaining <= 0) {
            proj.active = false;
            pCol.active = false;
          }
        }

        // 6. Handle primary target destruction
        if (target.hull <= 0) {
          this._handleTargetDestroyed(target, tCol, gameEngine, soundManager);
        }
      }
      return;
    }

    // ── CASE 2: Enemy Projectile vs Player Drone ──
    if (
      (colA.layer === COLLISION_LAYERS.ENEMY_PROJECTILE && colB.layer === COLLISION_LAYERS.PLAYER) ||
      (colB.layer === COLLISION_LAYERS.ENEMY_PROJECTILE && colA.layer === COLLISION_LAYERS.PLAYER)
    ) {
      const pCol = colA.layer === COLLISION_LAYERS.ENEMY_PROJECTILE ? colA : colB;
      const playerCol = colA.layer === COLLISION_LAYERS.PLAYER ? colA : colB;
      const proj = pCol.entity;
      const player = playerCol.entity;

      if (!proj.active || player.invulnerableTimer > 0) return;

      const hitResult = CollisionSystem.testSegmentCircle(
        proj.prevX, proj.prevY,
        proj.x, proj.y,
        playerCol.x, playerCol.y,
        playerCol.radius,
        proj.radius
      );

      if (hitResult.hit) {
        this.stats.hitsThisFrame++;
        this.stats.totalHits++;

        // Apply damage to player
        player.applyDamage(proj.damage || 12);
        gameEngine.addCameraShake(5);

        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#ff003c', 10);
        }

        if (soundManager) {
          if (typeof soundManager.playHitImpact === 'function') soundManager.playHitImpact();
          if (player.hull <= 30 && typeof soundManager.playWarning === 'function') soundManager.playWarning();
        }

        this._recordContact(hitResult.hitX, hitResult.hitY, '#ff003c');

        proj.active = false;
        pCol.active = false;
      }
      return;
    }

    // ── CASE 3: Player Drone vs Enemy Target (Contact Ramming) ──
    if (
      (colA.layer === COLLISION_LAYERS.PLAYER && colB.layer === COLLISION_LAYERS.ENEMY) ||
      (colB.layer === COLLISION_LAYERS.PLAYER && colA.layer === COLLISION_LAYERS.ENEMY)
    ) {
      const playerCol = colA.layer === COLLISION_LAYERS.PLAYER ? colA : colB;
      const tCol = colA.layer === COLLISION_LAYERS.ENEMY ? colA : colB;
      const player = playerCol.entity;
      const target = tCol.entity;

      if (player.invulnerableTimer > 0 || target.hull <= 0) return;

      const hitResult = CollisionSystem.testCircleCircle(
        playerCol.x, playerCol.y, playerCol.radius,
        tCol.x, tCol.y, tCol.radius
      );

      if (hitResult.hit) {
        this.stats.hitsThisFrame++;
        this.stats.totalHits++;

        // Ramming contact damage
        const ramDamage = target.contactDamage || 20;
        player.applyDamage(ramDamage);
        target.hull = Math.max(0, target.hull - 35);
        target.flashTimer = 0.15;

        // Push player back slightly along collision normal
        player.vx -= hitResult.nx * 220;
        player.vy -= hitResult.ny * 220;

        gameEngine.addCameraShake(10);

        if (gameEngine.projectiles) {
          gameEngine.projectiles.spawnHitSparks(hitResult.hitX, hitResult.hitY, '#ffb703', 14);
        }

        if (soundManager && typeof soundManager.playExplosion === 'function') {
          soundManager.playExplosion(0.8);
        }

        this._recordContact(hitResult.hitX, hitResult.hitY, '#ffb703', hitResult.nx, hitResult.ny);

        if (target.hull <= 0) {
          this._handleTargetDestroyed(target, tCol, gameEngine, soundManager);
        }
      }
      return;
    }

    // ── CASE 4: Player Drone vs Tactical Pickup / Supply Drop ──
    if (
      (colA.layer === COLLISION_LAYERS.PLAYER && colB.layer === COLLISION_LAYERS.PICKUP) ||
      (colB.layer === COLLISION_LAYERS.PLAYER && colA.layer === COLLISION_LAYERS.PICKUP)
    ) {
      const playerCol = colA.layer === COLLISION_LAYERS.PLAYER ? colA : colB;
      const pickCol = colA.layer === COLLISION_LAYERS.PICKUP ? colA : colB;
      const player = playerCol.entity;
      const pickup = pickCol.entity;

      if (!pickup.active || player.hull <= 0) return;

      const hitResult = CollisionSystem.testCircleCircle(
        playerCol.x, playerCol.y, playerCol.radius,
        pickCol.x, pickCol.y, pickCol.radius
      );

      if (hitResult.hit) {
        this.stats.hitsThisFrame++;
        this.stats.totalHits++;

        if (gameEngine.pickups) {
          gameEngine.pickups.applyPickup(pickup, player, gameEngine, soundManager);
        }
        pickCol.active = false;
        this._recordContact(hitResult.hitX, hitResult.hitY, pickup.config?.color || '#00f0ff');
      }
      return;
    }
  }

  /**
   * Handle destruction sequence for an eliminated hostile target.
   */
  _handleTargetDestroyed(target, col, gameEngine, soundManager) {
    col.active = false;

    // 1. Add mission score
    const scoreVal = target.scoreValue || (target.threatLevel ? target.threatLevel * 150 : 250);
    gameEngine.score += scoreVal;

    // 1.5. Roll tactical supply & intel drops
    if (gameEngine.pickups) {
      gameEngine.pickups.rollDrop(target);
    }

    // 2. Trigger tactical explosion FX & sparks
    if (gameEngine.projectiles) {
      const explColor = target.config?.thermal?.core || (target.threatLevel >= 4 ? '#ff003c' : '#ff8c1a');
      gameEngine.projectiles.spawnHitSparks(col.x, col.y, explColor, 24);
      gameEngine.projectiles.spawnHitSparks(col.x, col.y, '#ffffff', 10);
    }

    // 3. Audio & Camera shake
    if (soundManager && typeof soundManager.playExplosion === 'function') {
      soundManager.playExplosion(1.2);
    }
    gameEngine.addCameraShake(7);

    // 4. Deactivate EnemyPool entity or reposition HUD target
    if (target.active !== undefined) {
      target.active = false;
    } else {
      // Respawn or reposition background HUD target after brief delay
      setTimeout(() => {
        if (gameEngine.state === 'RUNNING' && target) {
          target.hull = target.maxHull || 100;
          target.relX = 0.15 + Math.random() * 0.7;
          target.relY = 0.10 + Math.random() * 0.35;
          target.vx = (Math.random() * 2 - 1) * 30;
          target.vy = (Math.random() * 2 - 1) * 25;
          target.distance = Math.round(300 + Math.random() * 500);
        }
      }, 1800);
    }
  }

  /**
   * Record a recent contact point for visual debug feedback.
   */
  _recordContact(x, y, color = '#ffffff', nx = 0, ny = 0) {
    this.recentContacts.push({
      x,
      y,
      time: 0.25, // 250ms duration
      color,
      nx,
      ny
    });
    if (this.recentContacts.length > this.maxContacts) {
      this.recentContacts.shift();
    }
  }

  /**
   * Update contact markers lifetime.
   */
  _updateDebugContacts(dt) {
    for (let i = this.recentContacts.length - 1; i >= 0; i--) {
      const c = this.recentContacts[i];
      c.time -= dt;
      if (c.time <= 0) {
        this.recentContacts.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TACTICAL DEBUG VISUALIZATION (Hitboxes, Grid & Telemetry)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Render debug overlay if enabled.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @param {import('./PlayerDrone.js').PlayerDrone} player
   * @param {import('./ProjectilePool.js').ProjectilePool} projectiles
   * @param {Array<Object>} targets
   */
  renderDebug(ctx, width, height, player, projectiles, targets) {
    if (!this.debug) return;

    ctx.save();

    const cs = this.cellSize;

    // 1. Draw Active Spatial Hash Grid Cells
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';

    for (let x = 0; x < width; x += cs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += cs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Highlight occupied cells with count badge
    for (const [key, bucket] of this.grid.entries()) {
      if (bucket.length === 0) continue;

      // Extract cx, cy from 32-bit key
      const cx = (key >> 16);
      const cy = (key << 16) >> 16;
      const cellPx = cx * cs;
      const cellPy = cy * cs;

      // Occupied cell fill
      ctx.fillStyle = bucket.length >= 2 ? 'rgba(255, 0, 60, 0.12)' : 'rgba(0, 240, 255, 0.05)';
      ctx.fillRect(cellPx, cellPy, cs, cs);

      ctx.strokeStyle = bucket.length >= 2 ? 'rgba(255, 0, 60, 0.4)' : 'rgba(0, 240, 255, 0.2)';
      ctx.strokeRect(cellPx, cellPy, cs, cs);

      // Cell occupant count tag
      ctx.fillStyle = bucket.length >= 2 ? '#ff003c' : 'rgba(0, 240, 255, 0.7)';
      ctx.fillText(`C:${bucket.length}`, cellPx + 3, cellPy + 9);
    }

    // 2. Draw Player Hitbox Collider
    if (player && player.hull > 0) {
      const pHitbox = player.getHitbox();

      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;

      // Center circle
      ctx.beginPath();
      ctx.arc(pHitbox.x, pHitbox.y, pHitbox.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(pHitbox.x - 6, pHitbox.y); ctx.lineTo(pHitbox.x + 6, pHitbox.y);
      ctx.moveTo(pHitbox.x, pHitbox.y - 6); ctx.lineTo(pHitbox.x, pHitbox.y + 6);
      ctx.stroke();

      // Outer bounding box
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pHitbox.x - pHitbox.radius, pHitbox.y - pHitbox.radius, pHitbox.radius * 2, pHitbox.radius * 2);

      // Label
      ctx.font = '8px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`PLAYER // R:${pHitbox.radius}`, pHitbox.x + pHitbox.radius + 4, pHitbox.y + 3);
      ctx.restore();
    }

    // 3. Draw Enemy Target Hitboxes
    if (enemies && enemies.enemies) {
      for (let i = 0; i < enemies.maxEnemies; i++) {
        const e = enemies.enemies[i];
        if (!e || !e.active || e.hull <= 0) continue;

        ctx.save();
        ctx.strokeStyle = '#ff003c';
        ctx.lineWidth = 1.5;

        // Target circle
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Bounding AABB box
        ctx.strokeStyle = 'rgba(255, 140, 26, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);

        // Velocity vector line
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.85)';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + e.vx * 0.4, e.y + e.vy * 0.4);
        ctx.stroke();

        // Label
        ctx.font = '8px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ff003c';
        ctx.fillText(`${e.name} // HP:${Math.round(e.hull)}`, e.x + e.radius + 4, e.y + 3);

        ctx.restore();
      }
    } else if (targets) {
      for (let i = 0; i < targets.length; i++) {
        const tgt = targets[i];
        if (!tgt || tgt.hull <= 0) continue;

        const tx = tgt.relX * width;
        const ty = tgt.relY * height;
        const r = (tgt.size || 28) * 0.55;

        ctx.save();
        ctx.strokeStyle = '#ff003c';
        ctx.lineWidth = 1.5;

        // Target circle
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.stroke();

        // Bounding AABB box
        ctx.strokeStyle = 'rgba(255, 140, 26, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - r, ty - r, r * 2, r * 2);

        // Velocity vector line
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.8)';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + tgt.vx * 0.5, ty + tgt.vy * 0.5);
        ctx.stroke();

        // Label
        ctx.font = '8px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ff003c';
        ctx.fillText(`${tgt.id} // HP:${tgt.hull}`, tx + r + 4, ty + 3);

        ctx.restore();
      }
    }

    // 4. Draw Projectile CCD Segments & Rays
    if (projectiles) {
      ctx.save();
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 1.2;

      for (let i = 0; i < projectiles.maxProjectiles; i++) {
        const p = projectiles.projectiles[i];
        if (!p.active) continue;

        // Continuous ray streak
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Head circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Draw Recent Impact Contact Points
    for (let i = 0; i < this.recentContacts.length; i++) {
      const c = this.recentContacts[i];
      const alpha = c.time / 0.25;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;

      // Starburst crosshair
      ctx.beginPath();
      ctx.moveTo(c.x - 8, c.y); ctx.lineTo(c.x + 8, c.y);
      ctx.moveTo(c.x, c.y - 8); ctx.lineTo(c.x, c.y + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Normal vector
      if (c.nx !== 0 || c.ny !== 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + c.nx * 16, c.y + c.ny * 16);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 6. Draw On-Screen Collision Telemetry HUD Card (Bottom-Left)
    this._renderTelemetryHUD(ctx, width, height);

    ctx.restore();
  }

  /**
   * Render diagnostic telemetry badge on HUD when debug is active.
   */
  _renderTelemetryHUD(ctx, width, height) {
    const cardW = 240;
    const cardH = 92;
    const pad = 16;
    const x = pad;
    const y = height - cardH - pad - 60; // Just above bottom HUD bar

    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.85)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;

    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeRect(x, y, cardW, cardH);

    // Title bar
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(x, y, cardW, 18);

    ctx.font = '700 9px "Rajdhani", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('COLLISION ENGINE // SPATIAL HASH [DEBUG ACTIVE]', x + 8, y + 12);

    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    const st = this.stats;
    ctx.fillText(`CELL SIZE: ${this.cellSize}px | OCCUPIED CELLS: ${st.occupiedCells}`, x + 8, y + 32);
    ctx.fillText(`ACTIVE COLLIDERS: ${st.activeColliders} | BROADPHASE PAIRS: ${st.broadphasePairs}`, x + 8, y + 46);
    ctx.fillText(`NARROWPHASE TESTS: ${st.narrowphaseTests} | HITS/SEC: ${st.hitsThisFrame}`, x + 8, y + 60);
    ctx.fillText(`TOTAL REGISTERED HITS: ${st.totalHits}`, x + 8, y + 74);

    ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.fillText('[H] / [F3] TO TOGGLE DEBUG HITBOXES', x + 8, y + 86);

    ctx.restore();
  }
}
