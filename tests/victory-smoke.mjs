/**
 * Results + victory flow end-to-end smoke test (Step 30 verification).
 * Drives a real GameEngine through the fixed-timestep loop headlessly:
 * sector script -> waves -> final clear -> VICTORY -> choice -> debrief
 * summary -> save unlock, plus the GAMEOVER path. Run with: npm test
 */
import assert from 'node:assert/strict';
import { GameEngine } from '../scripts/game/GameEngine.js';
import { SaveManager } from '../scripts/game/SaveManager.js';

globalThis.window = globalThis.window || {};
Object.assign(globalThis.window, {
  devicePixelRatio: 1, innerWidth: 800, innerHeight: 600,
  addEventListener() {}, removeEventListener() {},
  dispatchEvent() {}, __soundManager: null
});
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
globalThis.document = globalThis.document || { addEventListener() {}, removeEventListener() {} };
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (() => 0);
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (() => {});

const gradientStub = { addColorStop() {} };
const ctxStub = new Proxy({}, {
  get: (_t, p) => {
    if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createPattern') {
      return () => gradientStub;
    }
    if (p === 'measureText') return () => ({ width: 0 });
    return () => {};
  },
  set: () => true
});
const canvasStub = () => ({ getContext: () => ctxStub, width: 0, height: 0, style: {} });
const TICK = 1000 / 60;

function boot(sector = 1) {
  const eng = new GameEngine(canvasStub());
  eng.start({ sector, drone: 'STRIKER', weapon: 'VULCAN' });
  eng.lastTime = 0;
  eng._fpsLastUpdate = 0;
  const seen = { victory: 0, gameover: 0, choice: 0 };
  eng.on('stateChange', (s) => {
    if (s === 'VICTORY') seen.victory++;
    if (s === 'GAMEOVER') seen.gameover++;
  });
  eng.on('missionCompletedChoice', () => seen.choice++);
  return { eng, seen };
}

// Drive the real rAF loop with synthetic timestamps until an end state.
// The clock is monotonic per engine across drive() calls.
function drive(eng, seen, { killHostiles = false, maxTicks = 30000 } = {}) {
  let t = eng._driveT || TICK;
  for (let i = 0; i < maxTicks; i++, t += TICK) {
    eng._loop(t);
    eng._driveT = t;
    if (killHostiles && eng.enemies) {
      for (let k = 0; k < eng.enemies.maxEnemies; k++) {
        const e = eng.enemies.enemies[k];
        if (e.active) { e.hull = 0; e.active = false; }
      }
    }
    if (seen.victory > 0 || seen.gameover > 0) break;
  }
  return t;
}

// 1. Full sector run: script -> waves -> VICTORY -> single choice -> debrief -> unlock
{
  memStore.clear();
  SaveManager.startNewCampaign();
  const { eng, seen } = boot(1);
  eng.player.invulnerableTimer = 1e9; // isolate the victory path (damage covered elsewhere)
  drive(eng, seen, { killHostiles: true });

  assert.equal(eng.state, 'VICTORY', 'clearing all waves ends the mission victorious');
  assert.equal(seen.victory, 1, 'VICTORY emitted exactly once');
  assert.equal(seen.choice, 1, 'completion choice raised exactly once');

  eng.addScore(5000);
  const summary = eng.getMissionSummary(true);
  assert.equal(summary.victory, true, 'debrief records victory');
  assert.equal(summary.sector, 1, 'debrief targets the flown sector');
  assert.ok(summary.score > 5000, 'debrief adds performance bonuses');
  assert.equal(summary.stars, 3, 'debrief awards stars from combat score');

  const meta = SaveManager.recordSectorVictory(summary.sector, summary.score, summary.stars);
  assert.equal(meta.newlyUnlocked, true, 'victory unlocks the next sector');
  assert.equal(SaveManager.getSaveData().maxSectorUnlocked, 2, 'unlock persisted');
  const totalAfter = SaveManager.getSaveData().totalScore;
  SaveManager.recordSectorVictory(summary.sector, summary.score, summary.stars);
  assert.equal(SaveManager.getSaveData().totalScore, totalAfter, 'reopened debrief cannot inflate totals');

  eng.stop();
  assert.equal(eng.state, 'STOPPED', 'abort stops the engine after victory');
}

// 2. Death in combat ends the mission as GAMEOVER with no victory garnish
{
  const { eng, seen } = boot(1);
  eng.player.invulnerableTimer = 0;
  eng.player.shield = 0;
  eng.player.hull = 5;
  eng.enemies.spawn({ type: 'KAMIKAZE_DRONE', x: eng.player.x, y: eng.player.y - 120 });
  drive(eng, seen, { maxTicks: 6000 });

  assert.equal(eng.state, 'GAMEOVER', 'lethal contact ends the mission');
  assert.equal(seen.gameover, 1, 'GAMEOVER emitted exactly once');
  assert.equal(seen.victory, 0, 'no victory on death');
  const summary = eng.getMissionSummary(false);
  assert.equal(summary.victory, false, 'debrief records defeat');
  assert.equal(summary.stars, 0, 'defeat earns no stars');
  eng.stop();
}

// 3. Unlimited opt-in resumes the sim from victory without a second debrief
{
  const { eng, seen } = boot(1);
  eng.player.invulnerableTimer = 1e9;
  drive(eng, seen, { killHostiles: true });
  assert.equal(eng.state, 'VICTORY', 'mission complete first');
  eng.waveRunner.startUnlimitedMode();
  eng.resume();
  assert.equal(eng.state, 'RUNNING', 'survival opt-in wakes the sim');
  const wavesBefore = eng.waveRunner.currentWaveIndex;
  const survSeen = { victory: 0, gameover: 0, choice: 0 };
  drive(eng, survSeen, { killHostiles: true, maxTicks: 6000 });
  assert.ok(eng.waveRunner.currentWaveIndex > wavesBefore, 'endless waves progress');
  assert.equal(eng.state, 'RUNNING', 'survival keeps flying');
  assert.equal(seen.choice, 1, 'no second victory debrief in survival');
  eng.stop();
}

console.log('victory-smoke: all 3 checks passed');
