/**
 * Collision smoke test (Step 18 verification).
 * Headless behavioral checks for the CollisionSystem hot path using the real
 * pooled entities. Run with: npm test  (node tests/collision-smoke.mjs)
 */
import assert from 'node:assert/strict';
import { CollisionSystem, COLLISION_LAYERS } from '../scripts/game/CollisionSystem.js';
import { EnemyPool } from '../scripts/game/EnemyPool.js';
import { ProjectilePool } from '../scripts/game/ProjectilePool.js';
import { PickupPool } from '../scripts/game/PickupPool.js';
import { PlayerDrone } from '../scripts/game/PlayerDrone.js';

globalThis.window = globalThis.window || {};

const DT = 1 / 60;

function makeWorld() {
  const player = new PlayerDrone();
  player.spawn(400, 520);
  player.invulnerableTimer = 0;
  player.shield = 0;
  const projectiles = new ProjectilePool(64);
  const enemies = new EnemyPool(8);
  const pickups = new PickupPool(8);
  const collisions = new CollisionSystem({ cellSize: 80, debug: false });
  const engine = {
    player, projectiles, enemies, pickups,
    hudOverlay: { targets: [] },
    boss: { active: false },
    hazards: null,
    width: 800, height: 600,
    score: 0, shotsHit: 0, damageTaken: 0, pickupsCollected: 0,
    addScore(n) { this.score += Math.max(0, Number(n) || 0); return this.score; },
    recordShotHit(c = 1) { this.shotsHit += c; },
    recordDamageTaken(a = 0) { this.damageTaken += a; },
    recordPickupCollected() { this.pickupsCollected++; },
    addCameraShake() {}
  };
  return { player, projectiles, enemies, pickups, collisions, engine };
}

function fire(engine, projectiles, { x, y, prevX, prevY, damage = 20, owner = 'player', penetration = 1, type = 'VULCAN' }) {
  return projectiles.spawn({ owner, type, x, y, prevX, prevY, vx: 0, vy: -850, damage, radius: 4, penetration });
}

// 1. CCD hit + armor-pipeline kill + single score/kill accounting
{
  const { enemies, projectiles, collisions, engine } = makeWorld();
  const e = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 300 });
  fire(engine, projectiles, { x: 400, y: 500, prevX: 400, prevY: 100, damage: 20 });
  collisions.update(engine, DT);
  assert.equal(e.active, false, 'fast projectile kills enemy via CCD sweep');
  assert.equal(engine.score, 200, 'kill bounty awarded exactly once');
  assert.equal(enemies.totalKills, 1, 'kill counted in mission stats');
  assert.equal(engine.shotsHit, 1, 'shot accuracy recorded');
}

// 2. Armor mitigation respected (RECON armor 0.2: 10dmg -> ~9.17, survives 15hp)
{
  const { enemies, projectiles, collisions, engine } = makeWorld();
  const e = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 300 });
  fire(engine, projectiles, { x: 400, y: 320, prevX: 400, prevY: 280, damage: 10 });
  collisions.update(engine, DT);
  assert.equal(e.active, true, 'armored enemy survives light hit');
  assert.ok(e.hull > 5 && e.hull < 15, `armor mitigated damage, hull=${e.hull}`);
  assert.equal(engine.score, 0, 'no bounty for surviving enemy');
  assert.equal(enemies.totalKills, 0, 'no kill counted');
}

// 3. Penetration: one shell damages two targets and keeps flying
{
  const { enemies, projectiles, collisions, engine } = makeWorld();
  const a = enemies.spawn({ type: 'RECON_BUGGY', x: 300, y: 300 });
  const b = enemies.spawn({ type: 'RECON_BUGGY', x: 500, y: 300 });
  const shell = fire(engine, projectiles, { x: 700, y: 300, prevX: 100, prevY: 300, damage: 20, penetration: 3 });
  collisions.update(engine, DT);
  assert.equal(a.active, false, 'penetrating shell kills first target');
  assert.equal(b.active, false, 'penetrating shell kills second target');
  assert.equal(shell.active, true, 'shell with hits remaining keeps flying');
  assert.equal(engine.score, 400, 'both bounties awarded');
}

// 4. Enemy projectile damages the player exactly once
{
  const { player, projectiles, collisions, engine } = makeWorld();
  const hullBefore = player.hull;
  fire(engine, projectiles, { x: 400, y: 520, prevX: 400, prevY: 480, damage: 12, owner: 'enemy' });
  collisions.update(engine, DT);
  assert.equal(player.hull, hullBefore - 12, 'player takes one hit');
  collisions.update(engine, DT);
  assert.equal(player.hull, hullBefore - 12, 'spent projectile cannot hit twice');
}

// 5. Ram contact damages both sides through the armor pipeline
{
  const { player, enemies, collisions, engine } = makeWorld();
  const hullBefore = player.hull;
  const e = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 520 });
  collisions.update(engine, DT);
  assert.ok(player.hull < hullBefore, 'ram hurts the player');
  assert.ok(e.hull < 15, 'ram hurts the enemy through armor pipeline');
}

// 6. Magnetic pickup collection path
{
  const { player, pickups, collisions, engine } = makeWorld();
  const scoreBefore = engine.score;
  const pk = pickups.spawn({ type: 'REPAIR_KIT', x: 400, y: 520 });
  pk.vx = 0; pk.vy = 0;
  collisions.update(engine, DT);
  assert.equal(pk.active, false, 'pickup collected on contact');
  assert.equal(engine.pickupsCollected, 1, 'pickup counted');
  assert.ok(engine.score > scoreBefore, 'pickup score awarded');
}

// 7. Hazard hooks: destructible mine + solid contact hazard
{
  const { projectiles, collisions, engine, player } = makeWorld();
  engine.hazards = {
    hazards: [{ active: true, x: 400, y: 300, radius: 20, hull: 30, contactDamage: 12, scoreValue: 100 }],
    maxHazards: 1
  };
  fire(engine, projectiles, { x: 400, y: 320, prevX: 400, prevY: 280, damage: 20 });
  collisions.update(engine, DT);
  assert.equal(engine.hazards.hazards[0].hull, 10, 'mine takes projectile damage');
  fire(engine, projectiles, { x: 400, y: 320, prevX: 400, prevY: 280, damage: 20 });
  collisions.update(engine, DT);
  assert.equal(engine.hazards.hazards[0].active, false, 'mine destroyed at zero hull');
  assert.equal(engine.score, 100, 'mine bounty awarded once');

  engine.hazards = {
    hazards: [{ active: true, x: 400, y: 520, radius: 24, contactDamage: 12 }],
    maxHazards: 1
  };
  const hullBefore = player.hull;
  collisions.update(engine, DT);
  assert.equal(player.hull, hullBefore - 12, 'contact hazard damages player');
  assert.equal(engine.hazards.hazards[0].active, true, 'solid hazard survives contact');
}

// 8. Debug overlay renders without exceptions
{
  const { enemies, projectiles, collisions, engine } = makeWorld();
  enemies.spawn({ type: 'RECON_BUGGY', x: 200, y: 200 });
  fire(engine, projectiles, { x: 200, y: 220, prevX: 200, prevY: 180, damage: 5 });
  collisions.update(engine, DT);
  collisions.setDebug(true);
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  collisions.renderDebug(ctx, 800, 600, engine.player, projectiles, [], enemies);
  collisions.setDebug(false);
}

// 9. Layers export intact for Phase H hazard registration
assert.ok(COLLISION_LAYERS.HAZARD === 16, 'HAZARD layer flag stable');

console.log('collision-smoke: all 9 checks passed');
