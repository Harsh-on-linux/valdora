/**
 * Pickup / wave / results lifecycle regression smoke test (Step 21).
 * Issues #5-#9: magnetic collection + effect expiry, wave completion gating,
 * stale-timer safety, unlimited-mode optionality, replay-safe debrief economy.
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { WaveRunner } from '../scripts/game/WaveRunner.js';
import { PickupPool } from '../scripts/game/PickupPool.js';
import { EnemyPool } from '../scripts/game/EnemyPool.js';
import { SaveManager } from '../scripts/game/SaveManager.js';

globalThis.window = globalThis.window || {};
if (!globalThis.window.dispatchEvent) globalThis.window.dispatchEvent = () => {};
if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, opts = {}) { this.type = type; this.detail = opts.detail; }
  };
}
const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(String(k)) ? memStore.get(String(k)) : null),
  setItem: (k, v) => memStore.set(String(k), String(v)),
  removeItem: (k) => void memStore.delete(String(k))
};

const DT = 1 / 60;

function makeWaveWorld() {
  const enemies = new EnemyPool(16);
  return {
    enemies,
    score: 0,
    width: 800, height: 600,
    state: 'RUNNING',
    hvtWarning: { active: false },
    boss: { active: false, isDefeated: false }
  };
}

function killAll(enemies, except = null) {
  for (let i = 0; i < enemies.maxEnemies; i++) {
    const e = enemies.enemies[i];
    if (e.active && e !== except) { e.hull = 0; e.active = false; }
  }
}

function track(runner) {
  const seen = { waveStart: 0, waveCleared: 0, choice: 0, unlimitedWaves: 0 };
  runner.on('waveStart', (d) => { seen.waveStart++; if (d && d.isUnlimited) seen.unlimitedWaves++; });
  runner.on('waveCleared', () => seen.waveCleared++);
  runner.on('missionCompletedChoice', () => seen.choice++);
  return seen;
}

// #5a. Magnetic attraction pulls in-range pickups, ignores distant ones
{
  const pickups = new PickupPool(8);
  const player = { x: 400, y: 520, hull: 100 };
  const near = pickups.spawn({ type: 'INTEL_PACKET', x: 400, y: 420 });
  near.vx = 0; near.vy = 0;
  const far = pickups.spawn({ type: 'INTEL_PACKET', x: 400, y: 100 });
  far.vx = 0; far.vy = 0;
  for (let i = 0; i < 60; i++) pickups.update(DT, 800, 600, player);
  const nearDist = Math.hypot(near.x - 400, near.y - 520);
  assert.equal(near.isMagnetized, true, 'in-range pickup magnetizes');
  assert.ok(nearDist < 80, `magnet closes distance (now ${nearDist.toFixed(1)}px)`);
  assert.equal(far.isMagnetized, false, 'out-of-range pickup drifts only');
  assert.equal(far.active, true, 'distant pickup stays alive');
}

// #5b. Every pickup effect applies (repair / ECM / overcharge / intel)
{
  const pickups = new PickupPool(8);
  const engine = {
    score: 0, collected: 0,
    projectiles: { spawnHitSparks() {}, spawnHellfireDetonation() {} },
    hudOverlay: { isJammingActive: true },
    addScore(n) { this.score += n; return this.score; },
    recordPickupCollected() { this.collected++; },
    addCameraShake() {}
  };
  const player = { x: 400, y: 520, hull: 50, maxHull: 100, shield: 10, maxShield: 100, boostMultiplier: 1.0 };
  pickups.applyPickup({ active: true, type: 'REPAIR_KIT', config: { scoreValue: 150 } }, player, engine, null);
  assert.equal(player.hull, 80, 'repair restores hull');
  pickups.applyPickup({ active: true, type: 'ECM_BURST', config: { scoreValue: 200 } }, player, engine, null);
  assert.equal(engine.hudOverlay.isJammingActive, false, 'ECM clears jamming');
  pickups.applyPickup({ active: true, type: 'ORDNANCE_OVERCHARGE', config: { scoreValue: 250 } }, player, engine, null);
  assert.equal(player.boostMultiplier, 1.35, 'overcharge boosts firepower');
  assert.ok(pickups._boostTimer, 'boost expiry timer armed');
  pickups.applyPickup({ active: true, type: 'INTEL_PACKET', config: { scoreValue: 500 } }, player, engine, null);
  assert.equal(engine.collected, 4, 'all four pickups collected');
}

// #5c. Lifetime, bounds, and boost expiry retire pickups/effects
{
  const pickups = new PickupPool(8);
  const doomed = pickups.spawn({ type: 'INTEL_PACKET', x: 400, y: 300 });
  doomed.lifetime = 0.05;
  const fallen = pickups.spawn({ type: 'INTEL_PACKET', x: 400, y: 700 });
  for (let i = 0; i < 10; i++) pickups.update(DT, 800, 600, null);
  assert.equal(doomed.active, false, 'expired lifetime despawns');
  assert.equal(fallen.active, false, 'out-of-bounds despawns');

  const engine = {
    projectiles: { spawnHitSparks() {} },
    addScore() {}, recordPickupCollected() {}, addCameraShake() {}
  };
  const player = { x: 0, y: 0, hull: 100, maxHull: 100, shield: 100, maxShield: 100, boostMultiplier: 1.0 };
  pickups.applyPickup({ active: true, type: 'ORDNANCE_OVERCHARGE', config: {} }, player, engine, null);
  pickups.clear();
  assert.equal(pickups._boostTimer, null, 'mission reset cancels the boost timer');
  pickups.applyPickup({ active: true, type: 'ORDNANCE_OVERCHARGE', config: {} }, player, engine, null);
  await new Promise((r) => setTimeout(r, 8300));
  assert.equal(player.boostMultiplier, 1.0, 'overcharge expires after 8s');
}

// #6. Wave clears only when script done AND no hostiles remain
{
  const world = makeWaveWorld();
  const runner = new WaveRunner();
  const seen = track(runner);
  runner.loadSector(1, { waveCount: 1, name: 'TRAINING' });
  for (let i = 0; i < 200 && !runner.waveActive; i++) runner.update(DT, world, null);
  assert.equal(runner.waveActive, true, 'scripted wave starts');
  const sam = world.enemies.spawn({ type: 'SAM_TURRET', x: 400, y: 500 });
  for (let i = 0; i < 400; i++) { killAll(world.enemies, sam); runner.update(DT, world, null); }
  assert.equal(seen.waveCleared, 0, 'one living hostile blocks completion');
  killAll(world.enemies);
  for (let i = 0; i < 200 && seen.waveCleared === 0; i++) runner.update(DT, world, null);
  assert.equal(seen.waveCleared, 1, 'clear fires once hostiles are gone');
  assert.equal(seen.choice, 1, 'final wave raises the completion choice once');
  for (let i = 0; i < 200; i++) runner.update(DT, world, null);
  assert.equal(seen.choice, 1, 'choice never repeats');
}

// #7. Restart/stop cancels pending wave timers (no stale missions)
{
  const world = makeWaveWorld();
  const runner = new WaveRunner();
  const seen = track(runner);
  runner.loadSector(1, { waveCount: 2, name: 'TRAINING' });
  for (let i = 0; i < 200; i++) runner.update(DT, world, null);
  assert.equal(seen.waveStart, 1, 'first wave started');
  runner.loadSector(1, { waveCount: 2, name: 'TRAINING' });
  assert.equal(runner.currentWaveIndex, 0, 'restart resets the cursor');
  assert.equal(runner.spawnedThisWave, 0, 'restart resets spawn accounting');
  for (let i = 0; i < 60; i++) runner.update(DT, world, null);
  assert.equal(seen.waveStart, 1, 'no stale wave fires after restart');
  runner.stop();
  for (let i = 0; i < 300; i++) runner.update(DT, world, null);
  assert.equal(runner.waveActive, false, 'stop halts the timeline');
  assert.equal(seen.waveStart, 1, 'stopped timeline starts nothing');
  runner.loadSector(1, { waveCount: 2, name: 'TRAINING' });
  for (let i = 0; i < 200; i++) runner.update(DT, world, null);
  assert.equal(seen.waveStart, 2, 'fresh sector starts cleanly');
}

// #8. Unlimited mode is opt-in and never re-triggers victory
{
  const world = makeWaveWorld();
  const runner = new WaveRunner();
  const seen = track(runner);
  runner.loadSector(1, { waveCount: 1, name: 'TRAINING' });
  for (let i = 0; i < 600 && seen.choice === 0; i++) { killAll(world.enemies); runner.update(DT, world, null); }
  assert.equal(seen.choice, 1, 'scripted campaign completes');
  for (let i = 0; i < 300; i++) runner.update(DT, world, null);
  assert.equal(seen.waveStart, 1, 'victory does not auto-engage survival');
  runner.startUnlimitedMode();
  for (let i = 0; i < 600 && seen.unlimitedWaves === 0; i++) { killAll(world.enemies); runner.update(DT, world, null); }
  assert.ok(seen.unlimitedWaves >= 1, 'opt-in survival waves begin');
  for (let i = 0; i < 600; i++) { killAll(world.enemies); runner.update(DT, world, null); }
  assert.equal(seen.choice, 1, 'survival clears never re-raise victory');
}

// #9. Debrief economy is replay-safe (sum of bests, unlocks persist)
{
  memStore.clear();
  SaveManager.startNewCampaign();
  let meta = SaveManager.recordSectorVictory(1, 5000, 3);
  assert.equal(meta.newlyUnlocked, true, 'first victory unlocks sector 2');
  let data = SaveManager.getSaveData();
  assert.equal(data.totalScore, 5000, 'campaign total seeds from victory');
  assert.equal(data.maxSectorUnlocked, 2, 'unlock persists');

  meta = SaveManager.recordSectorVictory(1, 3000, 2);
  data = SaveManager.getSaveData();
  assert.equal(data.totalScore, 5000, 'weaker replay cannot dilute the total');
  assert.equal(data.sectorStars.sector_1, 3, 'best stars kept');
  assert.equal(meta.newlyUnlocked, false, 'no duplicate unlock fanfare');

  SaveManager.recordSectorVictory(2, 4000, 2);
  SaveManager.recordSectorVictory(1, 5000, 3);
  data = SaveManager.getSaveData();
  assert.equal(data.totalScore, 9000, 'reopened debrief cannot inflate the total');
  assert.equal(data.starsEarned, 5, 'stars sum across sectors');

  memStore.set('space_shooter_save', '{broken json');
  assert.equal(SaveManager.getSaveData().maxSectorUnlocked, 1, 'corrupt save falls back to defaults');
  SaveManager.startNewCampaign();
  assert.equal(SaveManager.hasSave(), false, 'fresh campaign reports no progress');
}

console.log('lifecycle-smoke: all 5 checks passed');
