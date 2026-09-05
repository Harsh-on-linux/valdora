/**
 * Enemy combat + score regression smoke test (Step 20 verification).
 * Movement/attack patterns, kamikaze telegraph-dive-cleanup, jammer
 * shutdown on destruction, drops, and mission summary math.
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { EnemyPool } from '../scripts/game/EnemyPool.js';
import { ProjectilePool } from '../scripts/game/ProjectilePool.js';
import { PickupPool } from '../scripts/game/PickupPool.js';
import { PlayerDrone } from '../scripts/game/PlayerDrone.js';
import { CollisionSystem } from '../scripts/game/CollisionSystem.js';
import { GameEngine } from '../scripts/game/GameEngine.js';

globalThis.window = globalThis.window || {};

const DT = 1 / 60;
const playerAt = (x, y) => ({ x, y });

function liveBullets(pool) {
  const out = [];
  for (let i = 0; i < pool.maxProjectiles; i++) {
    const p = pool.projectiles[i];
    if (p.active && p.owner === 'enemy') out.push(p);
  }
  return out;
}

// 1. All five movement patterns behave per spec
{
  const enemies = new EnemyPool(8);
  const pool = new ProjectilePool(8);
  const recon = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 50 });
  const inter = enemies.spawn({ type: 'INTERCEPTOR', x: 400, y: 50 });
  const sam = enemies.spawn({ type: 'SAM_TURRET', x: 400, y: 500 });
  const kami = enemies.spawn({ type: 'KAMIKAZE_DRONE', x: 400, y: 50 });
  const jam = enemies.spawn({ type: 'RADAR_JAMMER', x: 400, y: 50 });
  for (let i = 0; i < 30; i++) enemies.update(DT, 800, 600, playerAt(400, 550), pool, null, null);
  assert.ok(recon.y > 50, 'recon descends linearly');
  assert.ok(Math.abs(inter.x - 400) > 5 && inter.y > 50, 'interceptor weaves sinusoidally while descending');
  assert.ok(sam.isAnchored && sam.vy === 0, 'sam anchors and holds altitude');
  assert.ok(kami.diveWarningTimer > 0 && !kami.isDiving, 'kamikaze telegraphs before diving');
  assert.ok(jam.jamPulse > 0 && jam.y < 300, 'jammer wobbles in the upper sector');
}

// 2. Attack patterns: single pulse, angled dual, aimed 3-round burst, none for kami/jammer
{
  const enemies = new EnemyPool(8);
  const pool = new ProjectilePool(32);
  const recon = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 100 });
  const inter = enemies.spawn({ type: 'INTERCEPTOR', x: 200, y: 100 });
  const sam = enemies.spawn({ type: 'SAM_TURRET', x: 600, y: 100 });
  recon.fireTimer = 0; inter.fireTimer = 0; sam.fireTimer = 0;
  enemies.update(DT, 800, 600, playerAt(400, 500), pool, null, null);
  for (let i = 0; i < 30; i++) enemies.update(DT, 800, 600, playerAt(400, 500), pool, null, null);
  const bullets = liveBullets(pool);
  const downward = bullets.filter(p => p.vy > 0 && p.vx === 0);
  const angled = bullets.filter(p => p.vy > 0 && p.vx !== 0);
  assert.ok(downward.length >= 1, 'recon fires straight pulse shots');
  assert.ok(angled.length >= 5, 'interceptor dual-fire + sam burst produce angled shots');
  assert.equal(sam.burstCountRemaining, 0, 'sam burst queue drains its 3 rounds');

  const before = liveBullets(pool).length;
  enemies.clear();
  pool.clear();
  const kami = enemies.spawn({ type: 'KAMIKAZE_DRONE', x: 100, y: 100 });
  const jam = enemies.spawn({ type: 'RADAR_JAMMER', x: 700, y: 100 });
  kami.fireTimer = 0; jam.fireTimer = 0;
  for (let i = 0; i < 120; i++) enemies.update(DT, 800, 600, playerAt(400, 500), pool, null, null);
  assert.equal(liveBullets(pool).length, 0, 'kamikaze and jammer fire no projectiles');
  assert.ok(before > 0, 'gun enemies had fired before the isolation phase');
}

// 3. Enemy projectile travels, hits once, and only once (end to end)
{
  const enemies = new EnemyPool(4);
  const projectiles = new ProjectilePool(16);
  const collisions = new CollisionSystem({ cellSize: 80 });
  const player = new PlayerDrone();
  player.spawn(400, 550);
  player.invulnerableTimer = 0;
  player.shield = 0;
  const engine = {
    player, projectiles, enemies, pickups: new PickupPool(4),
    hudOverlay: { targets: [] }, boss: { active: false }, hazards: null,
    width: 800, height: 600, score: 0, damageTaken: 0,
    addScore(n) { this.score += n; return this.score; },
    recordShotHit() {}, recordDamageTaken(a) { this.damageTaken += a; },
    recordPickupCollected() {}, addCameraShake() {}
  };
  const recon = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 50 });
  recon.fireTimer = 0.01;
  const hullBefore = player.hull;
  let hitTick = -1;
  for (let i = 0; i < 200 && hitTick < 0; i++) {
    enemies.update(DT, 800, 600, player, projectiles, null, null);
    projectiles.update(DT, 800, 600, [], enemies);
    collisions.update(engine, DT);
    if (engine.damageTaken > 0) hitTick = i;
  }
  assert.ok(hitTick > 0, 'fired pulse reaches the player');
  assert.equal(engine.damageTaken, 8, 'single pulse deals exactly one 8dmg hit');
  for (let i = 0; i < 20; i++) {
    projectiles.update(DT, 800, 600, [], enemies);
    collisions.update(engine, DT);
  }
  assert.equal(engine.damageTaken, 8, 'spent pulse cannot hit twice');
  assert.equal(player.hull, hullBefore - 8, 'hull reflects the single impact');
}

// 4. Kamikaze full loop: telegraph -> locked dive -> 35 contact -> bounty + cleanup
{
  const enemies = new EnemyPool(4);
  const projectiles = new ProjectilePool(16);
  const collisions = new CollisionSystem({ cellSize: 80 });
  const player = new PlayerDrone();
  player.spawn(400, 550);
  player.invulnerableTimer = 0;
  player.shield = 0;
  const engine = {
    player, projectiles, enemies, pickups: new PickupPool(4),
    hudOverlay: { targets: [] }, boss: { active: false }, hazards: null,
    width: 800, height: 600, score: 0,
    addScore(n) { this.score += Math.max(0, Number(n) || 0); return this.score; },
    recordShotHit() {}, recordDamageTaken() {}, recordPickupCollected() {}, addCameraShake() {}
  };
  const kami = enemies.spawn({ type: 'KAMIKAZE_DRONE', x: 400, y: 50 });
  let sawWarning = false;
  let diveSpeed = 0;
  for (let i = 0; i < 240 && kami.active; i++) {
    enemies.update(DT, 800, 600, player, projectiles, null, null);
    if (!kami.isDiving && kami.diveWarningTimer > 0) sawWarning = true;
    if (kami.isDiving && diveSpeed === 0) diveSpeed = Math.hypot(kami.vx, kami.vy);
    collisions.update(engine, DT);
  }
  assert.ok(sawWarning, '0.5s warning telegraph precedes the dive');
  assert.equal(kami.diveTargetX, 400, 'dive locks player X');
  assert.equal(kami.diveTargetY, 550, 'dive locks player Y');
  assert.ok(Math.abs(diveSpeed - 600) < 1, 'dive runs at 600px/s');
  assert.equal(player.hull, player.maxHull - 35, 'contact deals 35 ramming damage');
  assert.equal(kami.active, false, 'kamikaze cleaned up after impact');
  assert.equal(engine.score, 350, 'kamikaze bounty awarded once');
  assert.equal(enemies.totalKills, 1, 'suicide run counted as a kill');
}

// 5. Jammer suppression ends the moment it dies (engine predicate)
{
  const enemies = new EnemyPool(4);
  const projectiles = new ProjectilePool(16);
  const collisions = new CollisionSystem({ cellSize: 80 });
  const player = new PlayerDrone();
  player.spawn(100, 550);
  player.invulnerableTimer = 0;
  const engine = {
    player, projectiles, enemies, pickups: new PickupPool(4),
    hudOverlay: { targets: [] }, boss: { active: false }, hazards: null,
    width: 800, height: 600, score: 0,
    addScore(n) { this.score += n; return this.score; },
    recordShotHit() {}, recordDamageTaken() {}, recordPickupCollected() {}, addCameraShake() {}
  };
  const jammerOnScreen = () => enemies.getActiveEnemies().some(e => e.type === 'RADAR_JAMMER');
  const jam = enemies.spawn({ type: 'RADAR_JAMMER', x: 400, y: 100 });
  assert.equal(jammerOnScreen(), true, 'live jammer suppresses radar');
  projectiles.spawn({ owner: 'player', type: 'VULCAN', x: 400, y: 120, prevX: 400, prevY: 80, vx: 0, vy: -900, damage: 200, radius: 4, penetration: 1 });
  collisions.update(engine, DT);
  assert.equal(jam.active, false, 'jammer destroyed');
  assert.equal(jammerOnScreen(), false, 'suppression lifts immediately on destruction');
}

// 6. Drops flow from destroyed hostiles
{
  const pickups = new PickupPool(64);
  const dummy = { x: 400, y: 300, type: 'RECON_BUGGY' };
  for (let i = 0; i < 300; i++) pickups.rollDrop(dummy);
  assert.ok(pickups.getActiveCount() > 0, 'kill drops spawn supply pickups');
}

// 7. Mission summary math: bonuses, stars, grades, defeat path
{
  const fake = {
    score: 5000, shotsFired: 100, shotsHit: 80,
    player: { hull: 80, maxHull: 100 },
    simTime: 60, sectorConfig: { id: 1 }, isObjectiveMet: false,
    enemies: { totalKills: 12 }, pickupsCollected: 3,
    droneConfig: { name: 'STRIKER' }, weaponConfig: { name: 'VULCAN' }
  };
  const win = GameEngine.prototype.getMissionSummary.call(fake, true);
  assert.equal(win.victory, true, 'victory preserved');
  assert.equal(win.accuracy, 80, 'accuracy computed');
  assert.equal(win.accuracyBonus, 1400, 'accuracy bonus = base * acc * 0.35');
  assert.equal(win.hullBonus, 960, 'hull bonus scales with integrity');
  assert.equal(win.timeBonus, 1200, 'speed bonus rewards fast clears');
  assert.equal(win.score, 8560, 'final score sums base + bonuses');
  assert.equal(win.stars, 3, '5000 clears the sector-1 bar');
  assert.equal(win.grade, 'S', '3 stars + 80% accuracy grades S');
  assert.equal(win.kills, 12, 'kill stats flow into the debrief');

  const loss = GameEngine.prototype.getMissionSummary.call(fake, false);
  assert.equal(loss.victory, false, 'defeat recorded');
  assert.equal(loss.stars, 0, 'no stars on defeat');
  assert.equal(loss.grade, 'MIA', 'defeat grades MIA');
  assert.equal(loss.score, 5000, 'defeat pays base score only');
}

console.log('enemies-smoke: all 7 checks passed');
