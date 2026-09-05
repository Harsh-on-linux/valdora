/**
 * Weapon regression smoke test (Step 19 verification).
 * Flak spread/detonation/cooldown, Laser heat/lockout/piercing, Hellfire
 * acquisition/homing/smoke/splash vs pooled hostiles, Orbital charge/release,
 * cycling/slots/HUD contract. Run with: npm test
 */
import assert from 'node:assert/strict';
import { WeaponSystem, WEAPON_ORDER } from '../scripts/game/WeaponSystem.js';
import { EnemyPool } from '../scripts/game/EnemyPool.js';
import { ProjectilePool } from '../scripts/game/ProjectilePool.js';
import { PlayerDrone } from '../scripts/game/PlayerDrone.js';
import { TacticalHUDOverlay } from '../scripts/game/TacticalHUDOverlay.js';
import { CollisionSystem } from '../scripts/game/CollisionSystem.js';

globalThis.window = globalThis.window || {};

const DT = 1 / 60;

function makeArsenal() {
  const player = new PlayerDrone();
  player.spawn(400, 520);
  player.invulnerableTimer = 0;
  const projectiles = new ProjectilePool(64);
  const enemies = new EnemyPool(8);
  const hud = new TacticalHUDOverlay();
  hud.targets = [];
  const weapons = new WeaponSystem('VULCAN');
  const shots = { fired: 0 };
  const engine = {
    player, projectiles, enemies,
    hudOverlay: hud,
    boss: { active: false },
    hazards: null,
    width: 800, height: 600,
    score: 0,
    addScore(n) { this.score += Math.max(0, Number(n) || 0); return this.score; },
    recordShotFired(c = 1) { shots.fired += c; },
    recordShotHit() {},
    recordDamageTaken() {},
    addCameraShake() {}
  };
  return { player, projectiles, enemies, hud, weapons, engine, shots };
}

function liveOf(pool, type) {
  const out = [];
  for (let i = 0; i < pool.maxProjectiles; i++) {
    const p = pool.projectiles[i];
    if (p.active && (!type || p.type === type)) out.push(p);
  }
  return out;
}

// 1. Flak: 5-pellet fan spread, detonation FX path, cooldown blocks refire
{
  const { player, projectiles, hud, weapons, engine, shots } = makeArsenal();
  weapons.setWeapon('FLAK');
  assert.equal(weapons.fire(player, projectiles, hud, null, engine), true, 'flak salvo fires');
  const pellets = liveOf(projectiles, 'FLAK');
  assert.equal(pellets.length, 5, '5-way spread spawns 5 pellets');
  const angles = new Set(pellets.map(p => Math.atan2(p.vy, p.vx).toFixed(3)));
  assert.ok(angles.size >= 4, 'pellets fan out on distinct angles');
  assert.equal(weapons.fire(player, projectiles, hud, null, engine), false, 'cooldown blocks instant refire');
  assert.equal(shots.fired, 5, 'all 5 pellets counted as shots');
  assert.equal(Math.round(hud.ammo), 96, 'flak drains 4 ammo');
}

// 2. Laser: piercing hitsRemaining, heat + overheat lockout + recovery
{
  const { player, projectiles, enemies, hud, weapons, engine, shots } = makeArsenal();
  weapons.setWeapon('LASER');
  assert.equal(weapons.fire(player, projectiles, hud, null, engine), true, 'laser fires');
  const bolt = liveOf(projectiles, 'LASER')[0];
  assert.ok(bolt && bolt.hitsRemaining === 3, 'laser pierces (3 hits)');

  hud.heat = 90;
  weapons.fireTimer = 0;
  weapons.fire(player, projectiles, hud, null, engine);
  assert.equal(hud.isOverheated, true, 'sustained fire trips thermal lockout');
  weapons.fireTimer = 0;
  assert.equal(weapons.fire(player, projectiles, hud, null, engine), false, 'lockout denies fire');
  for (let i = 0; i < 900 && hud.isOverheated; i++) hud.update(DT, player, 800, 600);
  assert.equal(hud.isOverheated, false, 'lockout clears after dissipation');
  assert.equal(shots.fired >= 1, true, 'laser shots recorded');
}

// 3. Laser bolt pierces two stacked hostiles and keeps flying
{
  const { player, projectiles, enemies, hud, weapons, engine } = makeArsenal();
  const collisions = new CollisionSystem({ cellSize: 80 });
  weapons.setWeapon('LASER');
  const a = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 300 });
  const b = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 220 });
  a.hull = 60; b.hull = 60; // survive one 16dmg lance hit each
  weapons.fire(player, projectiles, hud, null, engine);
  const bolt = liveOf(projectiles, 'LASER')[0];
  bolt.x = 400; bolt.y = 340; bolt.prevX = 400; bolt.prevY = 180; // sweep both
  collisions.update(engine, DT);
  assert.ok(a.hull < 60 && b.hull < 60, 'lance damages every hostile in column');
  assert.equal(bolt.active, true, 'piercing bolt survives two impacts');
}

// 4. Hellfire acquires pooled hostiles (not just HUD blips)
{
  const { player, projectiles, enemies, hud, weapons, engine } = makeArsenal();
  const foe = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 200 });
  weapons.setWeapon('HELLFIRE');
  assert.equal(weapons.fire(player, projectiles, hud, null, engine), true, 'hellfire salvo fires');
  const missiles = liveOf(projectiles, 'HELLFIRE');
  assert.equal(missiles.length, 2, 'paired missiles launch');
  assert.ok(missiles.every(m => m.target === foe), 'missiles lock the pooled hostile');
}

// 5. Hellfire homing steers + smokes; falls back to HUD contacts
{
  const { projectiles, enemies } = makeArsenal();
  const foe = enemies.spawn({ type: 'INTERCEPTOR', x: 600, y: 150 });
  const m = projectiles.spawn({ owner: 'player', type: 'HELLFIRE', x: 400, y: 500, vx: 0, vy: -380, damage: 95, radius: 5.5, target: null });
  const angleBefore = Math.atan2(m.vy, m.vx);
  for (let i = 0; i < 30; i++) projectiles.update(DT, 800, 600, [], enemies);
  assert.equal(m.target, foe, 're-acquisition picks the pooled hostile');
  const angled = Math.abs(Math.atan2(m.vy, m.vx) - angleBefore);
  assert.ok(angled > 0.05, 'missile steers toward target');
  assert.ok(m.speed > 380, 'booster accelerates');
  assert.ok(projectiles.smokes.some(s => s.active), 'exhaust smoke trail emitted');

  const m2 = projectiles.spawn({ owner: 'player', type: 'HELLFIRE', x: 400, y: 500, vx: 0, vy: -380, damage: 95, radius: 5.5, target: null });
  const blip = { id: 'TGT-9', hull: 50, relX: 0.5, relY: 0.2, vx: 0, vy: 0 };
  for (let i = 0; i < 5; i++) projectiles.update(DT, 800, 600, [blip], enemies);
  foe.hull = 0; foe.active = false;
  m2.target = null;
  for (let i = 0; i < 5; i++) projectiles.update(DT, 800, 600, [blip], enemies);
  assert.equal(m2.target, blip, 'falls back to HUD contact when pool is empty');
}

// 6. Hellfire splash damages nearby pooled hostiles through armor pipeline
{
  const { projectiles, enemies, engine } = makeArsenal();
  const collisions = new CollisionSystem({ cellSize: 80 });
  const primary = enemies.spawn({ type: 'RECON_BUGGY', x: 400, y: 300 });
  const nearby = enemies.spawn({ type: 'RECON_BUGGY', x: 430, y: 300 });
  primary.hull = 10;
  const missile = projectiles.spawn({ owner: 'player', type: 'HELLFIRE', x: 400, y: 300, prevX: 400, prevY: 300, vx: 0, vy: 0, damage: 95, radius: 5.5, blastRadius: 85, penetration: 1, hitsRemaining: 1 });
  missile.target = primary;
  collisions.update(engine, DT);
  assert.equal(primary.active, false, 'direct hit kills primary');
  assert.equal(nearby.active, false, 'splash kills adjacent hostile');
  assert.equal(engine.score, 400, 'both bounties awarded once each');
  assert.equal(enemies.totalKills, 2, 'splash kills counted');
}

// 7. Orbital: full-charge auto-fire, early release cancels, threshold release fires
{
  const { player, projectiles, hud, engine } = makeArsenal();
  const weapons = new WeaponSystem('ORBITAL');
  for (let i = 0; i < 60; i++) weapons.update(DT, player, projectiles, hud, null, engine, true);
  assert.equal(liveOf(projectiles, 'ORBITAL').length, 1, 'full charge releases strike');
  assert.equal(Math.round(hud.ammo), 78, 'strike drains 22 capacitor');

  const w2 = new WeaponSystem('ORBITAL');
  const p2 = new ProjectilePool(8);
  const hud2 = new TacticalHUDOverlay(); hud2.targets = [];
  for (let i = 0; i < 30; i++) w2.update(DT, player, p2, hud2, null, engine, true);
  w2.update(DT, player, p2, hud2, null, engine, false);
  assert.equal(liveOf(p2, 'ORBITAL').length, 0, 'sub-threshold release fizzles');

  const w3 = new WeaponSystem('ORBITAL');
  const p3 = new ProjectilePool(8);
  const hud3 = new TacticalHUDOverlay(); hud3.targets = [];
  for (let i = 0; i < 50; i++) w3.update(DT, player, p3, hud3, null, engine, true);
  w3.update(DT, player, p3, hud3, null, engine, false);
  assert.equal(liveOf(p3, 'ORBITAL').length, 1, 'post-threshold release strikes');
}

// 8. Orbital beam column kills pooled hostiles in its path
{
  const { projectiles, enemies, engine } = makeArsenal();
  const collisions = new CollisionSystem({ cellSize: 80 });
  const foe = enemies.spawn({ type: 'SAM_TURRET', x: 400, y: 150 });
  projectiles.spawn({ owner: 'player', type: 'ORBITAL', x: 400, y: 0, prevX: 400, prevY: 0, vx: 0, vy: 0, damage: 450, radius: 36, width: 74, length: 600, lifetime: 0.55, penetration: 999, hitsRemaining: 999, blastRadius: 140 });
  collisions.update(engine, DT);
  assert.equal(foe.active, false, 'beam column destroys hostile');
}

// 9. Compatibility cycling, slot selection, HUD contract
{
  const weapons = new WeaponSystem('VULCAN');
  const allowed = ['VULCAN', 'FLAK', 'HELLFIRE', 'ORBITAL']; // REAPER omits LASER
  const seen = new Set([weapons.activeWeaponId]);
  for (let i = 0; i < 4; i++) seen.add(weapons.cycleWeapon(1, allowed));
  assert.deepEqual([...seen].sort(), [...allowed].sort(), 'cycling stays within drone compatibility');
  assert.ok(!seen.has('LASER'), 'incompatible weapon never selected');
  assert.equal(weapons.selectWeaponSlot(3, allowed), 'HELLFIRE', 'slot maps into allowed list');
  assert.equal(weapons.selectWeaponSlot(99, allowed), 'ORBITAL', 'overflow slot clamps');
  assert.equal(weapons.getActiveSlotIndex(allowed), 4, 'slot index matches HUD chip contract');
  for (const id of WEAPON_ORDER) assert.ok(weapons.cycleWeapon(1) && WEAPON_ORDER.includes(weapons.activeWeaponId), 'full-order cycle stays valid');
}

console.log('weapons-smoke: all 9 checks passed');
