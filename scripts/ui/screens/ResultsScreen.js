/**
 * ResultsScreen — Tactical Mission Debrief, Performance Rating & Victory Flow
 * Features:
 * - Deterministic score calculation & accuracy bonus breakdown
 * - 3-Star threshold evaluation & animated milestone gauge
 * - S/A/B/C/MIA grade evaluation badge with procedural audio fanfare
 * - Campaign persistence via SaveManager (sector unlock & record score tracking)
 * - Seamless keyboard, touch, and interactive console button routing
 */

import { soundManager } from '../../audio/index.js';
import { getLevelById, calculateStars, isLevelUnlocked } from '../../game/levels.js';
import { SaveManager } from '../../game/SaveManager.js';

let activeAnimationTimers = [];
let keyHandler = null;

export const ResultsScreen = {
  mount(container, data = {}, router) {
    this.unmount();

    const sectorId = Number(data.sector) || 1;
    const isVictory = data.victory !== undefined ? !!data.victory : true;
    const levelInfo = getLevelById(sectorId) || {
      id: sectorId,
      code: `SEC-${sectorId.toString().padStart(2, '0')}`,
      name: `SECTOR ${sectorId.toString().padStart(2, '0')}`,
      scoreThresholds: { star1: 1000, star2: 2000, star3: 3000 }
    };

    const thresholds = levelInfo.scoreThresholds || { star1: 1000, star2: 2000, star3: 3000 };
    const baseScore = Number(data.baseScore) !== undefined ? Number(data.baseScore) : (Number(data.score) || 0);
    const score = Number(data.score) || baseScore;
    const kills = Number(data.kills) || 0;
    const accuracy = Number(data.accuracy) !== undefined ? Number(data.accuracy) : 85;
    const shotsFired = Number(data.shotsFired) || 0;
    const shotsHit = Number(data.shotsHit) || 0;
    const accuracyBonus = Number(data.accuracyBonus) || (isVictory && accuracy >= 50 ? Math.round(baseScore * (accuracy / 100) * 0.35) : 0);
    const hullPct = Number(data.hullPct) !== undefined ? Number(data.hullPct) : (isVictory ? 100 : 0);
    const hullBonus = Number(data.hullBonus) || (isVictory ? Math.round((hullPct / 100) * 1200) : 0);
    const timeElapsed = Number(data.timeElapsed) || 45.0;
    const timeBonus = Number(data.timeBonus) || 0;
    const pickupsCollected = Number(data.pickupsCollected) || 0;
    const droneName = data.drone || 'STRIKER';
    const weaponName = data.weapon || 'VULCAN CANNON';

    // Calculate stars earned
    const stars = isVictory ? calculateStars(sectorId, score) : 0;

    // Grade assignment
    let grade = data.grade;
    if (!grade) {
      if (!isVictory) grade = 'MIA';
      else if (stars === 3 && accuracy >= 80) grade = 'S';
      else if (stars >= 2 && accuracy >= 60) grade = 'A';
      else if (stars >= 1) grade = 'B';
      else grade = 'C';
    }

    // Record save progression if victory
    let recordMeta = { isNewRecord: false, newlyUnlocked: false, nextSectorId: sectorId + 1 };
    if (isVictory) {
      recordMeta = SaveManager.recordSectorVictory(sectorId, score, stars);
    }

    const hasNextSector = isVictory && sectorId < 10;
    const nextSectorId = sectorId + 1;
    const nextLevelInfo = hasNextSector ? getLevelById(nextSectorId) : null;

    // Calculate percentage fill on the 3-star milestone gauge
    const maxThreshold = thresholds.star3 || 10000;
    const thresholdPct = Math.min(100, Math.round((score / maxThreshold) * 100));
    const star1Pos = Math.round((thresholds.star1 / maxThreshold) * 100);
    const star2Pos = Math.round((thresholds.star2 / maxThreshold) * 100);

    const gradeClass = `grade-${grade.toLowerCase()}`;

    container.innerHTML = `
      <div class="console-panel results-panel">
        <!-- ═══════════ HEADER BANNER ═══════════ -->
        <div class="results-header-banner">
          <div class="results-title-group">
            <h2 class="${isVictory ? '' : 'defeat'}">
              ${isVictory ? 'MISSION ACCOMPLISHED' : 'MISSION COMPROMISED'}
            </h2>
            <div class="results-subtitle">
              THEATER: ${escapeHtml(levelInfo.code || `SEC-0${sectorId}`)} // ${escapeHtml(levelInfo.name.toUpperCase())}
            </div>
          </div>
          <span class="results-status-badge ${isVictory ? 'victory' : 'defeat'}">
            ${isVictory ? 'OBJECTIVES SECURED' : 'CRITICAL HULL LOSS'}
          </span>
        </div>

        <!-- ═══════════ PERFORMANCE EVALUATION & STAR RATINGS ═══════════ -->
        <div class="results-eval-card">
          <div class="eval-stars-wrapper">
            <span class="eval-stars-label">COMBAT EVALUATION // STAR RATING:</span>
            <div class="eval-stars-array">
              <span class="eval-star-slot" id="eval-star-0">★</span>
              <span class="eval-star-slot" id="eval-star-1">★</span>
              <span class="eval-star-slot" id="eval-star-2">★</span>
            </div>
          </div>

          <div class="eval-grade-wrapper">
            <span class="eval-grade-label">COMBAT GRADE</span>
            <span class="eval-grade-value ${gradeClass}">${grade}</span>
          </div>

          <!-- Score Milestone Progress Gauge -->
          <div class="results-threshold-gauge">
            <div class="threshold-gauge-header">
              <span>SCORE MILESTONE PROGRESS</span>
              <span>TARGET: 3★ (${thresholds.star3.toLocaleString()} PTS)</span>
            </div>
            <div class="threshold-track">
              <div class="threshold-fill" id="results-threshold-fill" style="width: 0%;"></div>
              <div class="threshold-marker" style="left: ${star1Pos}%;">
                <span class="threshold-marker-label">1★ ${thresholds.star1.toLocaleString()}</span>
              </div>
              <div class="threshold-marker" style="left: ${star2Pos}%;">
                <span class="threshold-marker-label">2★ ${thresholds.star2.toLocaleString()}</span>
              </div>
              <div class="threshold-marker" style="left: 100%;">
                <span class="threshold-marker-label">3★ ${thresholds.star3.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════ PROMOTION / RECORD ALERT BANNERS ═══════════ -->
        ${recordMeta.isNewRecord ? `
        <div class="results-alert-banner">
          <span style="font-size: 1.2rem;">★</span>
          <span>NEW SECTOR COMBAT RECORD ESTABLISHED: ${score.toLocaleString()} PTS</span>
        </div>
        ` : ''}

        ${(recordMeta.newlyUnlocked && hasNextSector) ? `
        <div class="results-alert-banner unlock">
          <span style="font-size: 1.1rem;">🔓</span>
          <span>NEW THEATER UNLOCKED: SEC-0${nextSectorId} // ${escapeHtml(nextLevelInfo ? nextLevelInfo.name : `SECTOR ${nextSectorId}`)}</span>
        </div>
        ` : ''}

        <!-- ═══════════ TOTAL COMBAT SCORE BANNER ═══════════ -->
        <div class="results-total-score-card">
          <div class="total-score-label">FINAL MISSION SCORE</div>
          <div class="total-score-value" id="results-score-counter">000,000</div>
        </div>

        <!-- ═══════════ DETAILED TELEMETRY BREAKDOWN GRID ═══════════ -->
        <div class="results-breakdown-grid">
          <!-- Card 1: Neutralized Targets -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">HOSTILES ELIMINATED</span>
              <span class="stat-card-main-val">${kills > 0 ? kills : (isVictory ? 'ALL CONFIRMED' : 'PARTIAL')}</span>
            </div>
            <div class="stat-card-sub">
              <span>COMBAT REWARD:</span>
              <span>+${baseScore.toLocaleString()} PTS</span>
            </div>
          </div>

          <!-- Card 2: Precision Accuracy -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">WEAPON ACCURACY</span>
              <span class="stat-card-main-val" style="color: ${accuracy >= 70 ? '#10b981' : (accuracy >= 45 ? '#ffb703' : '#ff003c')}">${accuracy}%</span>
            </div>
            <div class="stat-card-sub">
              <span>ACCURACY BONUS:</span>
              <span>+${accuracyBonus.toLocaleString()} PTS</span>
            </div>
          </div>

          <!-- Card 3: Hull Integrity -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">HULL INTEGRITY</span>
              <span class="stat-card-main-val" style="color: ${hullPct >= 60 ? 'var(--cyan-bright)' : '#ffb703'}">${hullPct}%</span>
            </div>
            <div class="stat-card-sub">
              <span>SURVIVAL BONUS:</span>
              <span>+${hullBonus.toLocaleString()} PTS</span>
            </div>
          </div>

          <!-- Card 4: Mission Duration -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">MISSION ELAPSED</span>
              <span class="stat-card-main-val">${formatTime(timeElapsed)}</span>
            </div>
            <div class="stat-card-sub">
              <span>SPEED BONUS:</span>
              <span>+${timeBonus.toLocaleString()} PTS</span>
            </div>
          </div>

          <!-- Card 5: Intel & Drop Pickups -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">SUPPLY & INTEL DROPS</span>
              <span class="stat-card-main-val">${pickupsCollected} SECURED</span>
            </div>
            <div class="stat-card-sub neutral">
              <span>FIELD ACQUISITION:</span>
              <span>100% RECOVERED</span>
            </div>
          </div>

          <!-- Card 6: Loadout Summary -->
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-card-name">CHASSIS & PAYLOAD</span>
              <span class="stat-card-main-val" style="font-size: 0.8rem; color: var(--amber);">${escapeHtml(droneName)}</span>
            </div>
            <div class="stat-card-sub neutral">
              <span>PRIMARY ARSENAL:</span>
              <span>${escapeHtml(weaponName)}</span>
            </div>
          </div>
        </div>

        <!-- ═══════════ NAVIGATION ACTION BAR ═══════════ -->
        <div class="results-nav-footer">
          <button class="console-btn btn-secondary" id="btn-results-map" title="Return to Sector Map (Hotkey: M / Esc)">
            <span>◀ SECTOR MAP [M]</span>
          </button>
          <button class="console-btn btn-secondary" id="btn-results-loadout" title="Configure Drone Loadout (Hotkey: L)">
            <span>LOADOUT ⚙ [L]</span>
          </button>
          <button class="console-btn btn-secondary" id="btn-results-retry" title="Retry Mission (Hotkey: R)">
            <span>RETRY ↻ [R]</span>
          </button>
          ${hasNextSector ? `
          <button class="console-btn btn-primary" id="btn-results-next" title="Deploy to Next Sector (Hotkey: Space / Enter)">
            <span>NEXT SECTOR 0${nextSectorId} ▶</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;

    // ═════════════════════════════════════════════════════════════════
    // SEQUENTIAL REVEAL ANIMATIONS & AUDITORY JUICE
    // ═════════════════════════════════════════════════════════════════

    // 1. Animate Threshold Progress Bar
    const fillEl = container.querySelector('#results-threshold-fill');
    if (fillEl) {
      const t1 = setTimeout(() => {
        fillEl.style.width = `${thresholdPct}%`;
      }, 150);
      activeAnimationTimers.push(t1);
    }

    // 2. Score number roll-up animation
    const counterEl = container.querySelector('#results-score-counter');
    if (counterEl) {
      this._animateScoreCounter(counterEl, score);
    }

    // 3. Staggered Star Pop Reveal
    for (let i = 0; i < stars; i++) {
      const starEl = container.querySelector(`#eval-star-${i}`);
      if (starEl) {
        const tStar = setTimeout(() => {
          starEl.classList.add('active');
          if (soundManager && typeof soundManager.playStarAward === 'function') {
            soundManager.playStarAward(i);
          }
        }, 400 + i * 350);
        activeAnimationTimers.push(tStar);
      }
    }

    // 4. Play celebratory record audio if new record
    if (recordMeta.isNewRecord) {
      const tRecord = setTimeout(() => {
        if (soundManager && typeof soundManager.playRecordBeep === 'function') {
          soundManager.playRecordBeep();
        }
      }, 1600);
      activeAnimationTimers.push(tRecord);
    }

    // ═════════════════════════════════════════════════════════════════
    // INTERACTIVE BUTTON BINDINGS
    // ═════════════════════════════════════════════════════════════════

    const mapBtn = container.querySelector('#btn-results-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      });
      mapBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const loadoutBtn = container.querySelector('#btn-results-loadout');
    if (loadoutBtn) {
      loadoutBtn.addEventListener('click', () => {
        soundManager.playClick();
        if (router) router.show('loadout', { sector: hasNextSector ? nextSectorId : sectorId });
      });
      loadoutBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const retryBtn = container.querySelector('#btn-results-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('game', { sector: sectorId });
      });
      retryBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    const nextBtn = container.querySelector('#btn-results-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        soundManager.playStart();
        if (router) router.show('game', { sector: nextSectorId });
      });
      nextBtn.addEventListener('mouseenter', () => soundManager.playHover());
    }

    // ═════════════════════════════════════════════════════════════════
    // KEYBOARD NAVIGATION (Hotkeys: Space/Enter, R, M/Esc, L)
    // ═════════════════════════════════════════════════════════════════
    keyHandler = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (hasNextSector) {
          soundManager.playStart();
          if (router) router.show('game', { sector: nextSectorId });
        } else {
          soundManager.playStart();
          if (router) router.show('game', { sector: sectorId });
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        soundManager.playStart();
        if (router) router.show('game', { sector: sectorId });
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') {
        e.preventDefault();
        soundManager.playClick();
        if (router) router.show('levelSelect', { sector: sectorId });
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        soundManager.playClick();
        if (router) router.show('loadout', { sector: hasNextSector ? nextSectorId : sectorId });
      }
    };

    window.addEventListener('keydown', keyHandler);
  },

  /**
   * Smooth number roll-up animation for total score.
   */
  _animateScoreCounter(el, targetScore) {
    const duration = 1200;
    const startTime = performance.now();
    let lastTick = 0;

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const current = Math.round(targetScore * ease);

      el.textContent = current.toLocaleString();

      if (now - lastTick > 70 && progress < 0.95) {
        lastTick = now;
        if (soundManager && typeof soundManager.playScoreCount === 'function') {
          soundManager.playScoreCount();
        }
      }

      if (progress < 1.0) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = targetScore.toLocaleString();
      }
    };

    requestAnimationFrame(frame);
  },

  unmount() {
    activeAnimationTimers.forEach(t => clearTimeout(t));
    activeAnimationTimers = [];

    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }
};

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
