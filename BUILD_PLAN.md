# Space Shooter — Master Build Plan
## (Tactical Control Panel Aesthetic — Inspired by Satellite/FLIR Interfaces)

Each step is small, builds directly on the previous one, and ends in something testable. Grouped into phases and batches for clean incremental development.

---

## 🏗️ BUILD BATCHES AT A GLANCE
- **Batch 1 (Phases A & B)**: Foundation, Command UI Kit, Satellite Map/FLIR, Landing Page, Navigation, Telemetry & Settings (Steps 1–7)
- **Batch 2 (Phases C, D, E)**: Sector Select, Drone/Payload Selection, Game Loop & Movement, Tactical HUD (Steps 8–15)
- **Batch 3 (Phase F)**: Ordnance Arsenal (Vulcan, Flak, Laser Designator, Hellfire Swarm, Orbital Strike) & Collision Framework (Steps 16–21)
- **Batch 4 (Phases G & H)**: Target Archetypes, Airdrops & Intel, Wave Engine & Sectors 1–4 (Steps 22–30)
- **Batch 5 (Phase I)**: High-Value Target (HVT) Framework & Sector 5 Encounter (Steps 31–34)
- **Batch 6 (Phase J)**: Radar Hazards, Sectors 6–9 & Mobile Multi-Phase Apex Target (Sector 10) (Steps 35–39)
- **Batch 7 (Phases K & L)**: FLIR FX, Screen Shake, Audio Comm Synth, Save System, Balancing & QA (Steps 40–47)

---

## PHASE A — Foundation & Theme

### Step 1 — Project scaffold ✅
- Create folder structure:
  - `/index.html`
  - `/styles/theme.css`
  - `/styles/menu.css`
  - `/styles/game.css`
  - `/scripts/main.js`
  - `/scripts/game/`
  - `/scripts/ui/`
  - `/assets/audio/`
  - `/assets/fonts/`
- Define CSS custom properties for the tactical FLIR theme: absolute black (`#000000`), scanline greys, UI-cyan (`#00f0ff`), danger-red (`#ff003c`), warning-amber (`#ffb703`), monospace fonts, 1px rigid borders, and CRT distortion effects.
- Import Monospace tactical fonts (Share Tech Mono / Roboto Mono + system fallback stack).
- Output: Initialized page with FLIR theme tokens, loaded fonts, and responsive canvas wrapper ready.

### Step 2 — Global state machine ✅
- Build a lightweight screen manager (`landing`, `sectorSelect`, `loadout`, `game`, `pause`, `results`, `settings`).
- Each screen is a JS module with `mount()` / `unmount()` lifecycle hooks.
- Smooth transition wrapper (~250–350ms ease-out) so switching screens is seamless.
- Output: Programmatic switching between screen containers with smooth transitions.

### Step 3 — Reusable UI components (the "command kit") ✅
- Build styled, reusable components: `<TacticalButton>`, `<DataPanel>`, `<TelemetryBar>`, `<Toggle>`, `<Modal>`.
- Add press/hover states: subtle cyan background fill, 1px border highlight, micro-scale press feedback + audio click trigger.
- Output: Component showcase view to test all UI elements in isolation.

### Step 4 — Animated Satellite Map background ✅
- Canvas-based tactical map (topographic or low-poly grid map) with scanning refresh lines.
- Subtle CRT flicker, MGRS coordinate tracking, and slow map panning.
- Output: Tactical map running continuously behind active screens.

---

## PHASE B — Landing Page & Navigation

### Step 5 — Landing page layout ✅
- Title logo with pulsing holographic glow animation.
- Primary buttons: Start/Continue, Level Select, Loadout, Settings, How to Play.
- Ambient cockpit animation: scanline overlay, rotating radar sweep in corner.
- Output: Visual landing page ready with interactive layout.

### Step 6 — Landing page logic ✅
- "Continue" button dynamically shows only if existing save state exists; otherwise "Start" begins Level 1.
- Web Audio UI sound feedback (beeps, clicks, power hums).
- Output: Interactive landing navigation with auditory feedback.

### Step 7 — How to Play / Settings screens ✅
- How to Play: Interactive controls diagram, weapon stats legend, enemy threat guide.
- Settings: Master volume, SFX volume, Music volume, control scheme toggle (Keyboard / Mouse / Touch), screen shake toggle.
- Output: Settings persisted to `localStorage` and real-time audio gain adjustment.

---

## PHASE C — Level Select

### Step 8 — Level select data model ✅
- Define `levels.js` config: 10 levels with id, name, isBoss flag, unlock requirement, target score, enemy waves, reward stars.
- Output: Validated level configuration module.

### Step 9 — Level select UI (Star-Map console style) ✅
- Node graph / tactical map layout of 10 mission sectors; Boss levels (5 & 10) feature highlighted warning aesthetics.
- Visual lock states with lock icons, star rating badges, and sector preview cards on hover.
- Output: Responsive star-map level select interface.

### Step 10 — Level select interactivity ✅
- Audio-visual denial feedback on locked nodes; unlocked nodes launch level loadout / direct deployment.
- Output: Full navigation flow into the game loop.

---

## PHASE D — Loadout / Drone Selection

### Step 11 — Drone data & procedural rendering function ✅
- Procedural canvas drone drawing function: top-down tactical wireframes or high-contrast silhouette representations (Predator, Reaper, Ghost).
- Color theme parameterization for heat signatures.
- Output: Isolated drone preview canvas with targeting crosshairs.

### Step 12 — Loadout screen ✅
- Selection cards for drone chassis variants (Surveillance, Heavy Strike, Electronic Warfare) and payload presets (Vulcan, Flak, Laser, Hellfire).
- Persist player loadout choices to active game state.
- Output: Fully interactive loadout configuration screen.

---

## PHASE E — Core Gameplay Loop

### Step 13 — Canvas game loop skeleton ✅
- Fixed-timestep update + interpolated render loop via `requestAnimationFrame` for rock-solid 60+ FPS.
- Background satellite map layer integration inside gameplay canvas.
- Output: Smooth running game engine skeleton.

### Step 14 — Player drone movement ✅
- WASD / Arrow keys, Mouse follow mode, and virtual touch joystick for mobile.
- Smooth acceleration, braking drag, banking angles on lateral movement, boundary clamping.
- Output: Responsive, fluid drone handling.

### Step 15 — Tactical HUD Overlay ✅
- Tactical dashboard: Side data panels, Active/Passive Radar toggle, Ordnance meters, Coordinate tracker, Target bounding boxes.
- Output: Real-time rendered HUD over the canvas viewport with CRT scanline post-processing.

---

## PHASE F — Ordnance Arsenal & Collisions

### Step 16 — Projectile pool & Vulcan Cannon ✅
- Zero-allocation Object Pool for projectiles.
- Rapid single/dual Vulcan Cannon with muzzle flashes and despawn boundaries.
- Output: High-performance bullet firing mechanics.

### Step 17 — Collision detection framework ✅
- Fast spatial partitioning & Circle/AABB collision engine.
- Bullet vs. Target, Drone vs. Target, Drone vs. Hazard collision resolution.
- Output: Collision detection pipeline with debug visualization toggle.

### Step 18 — Flak Cannon Weapon ✅
- 3 to 5-way angled spread with wide coverage, custom explosive particle tint.
- Weapon cycle key (Q/E or 1-4) with HUD icon swap.
- Output: Multi-directional crowd control firing.

### Step 19 — Laser Designator Beam ✅
- Sustained high-energy beam with animated core, outer corona, and contact sparks.
- Heat buildup mechanics with overheat lockout and cooling dissipation.
- Output: Thermal-limited piercing beam weapon.

### Step 20 — Hellfire Swarm Missiles ✅
- Self-propelling tracking missiles with smoke trails, auto-acquiring target lock, and area-of-effect blast on impact.
- Output: Autonomous guided ordinance.

### Step 21 — Orbital Strike ✅
- Hold-to-charge mechanics with accumulating targeting laser and massive vertical strike release.
- Output: High-impact heavy attack option.

---

## PHASE G — Target Roster & Intel Drops

### Step 22 — Target base class, entity pool & enemy config ✅
- Create `enemies.js` config module defining all 5 enemy archetypes + 2 boss entities with stats, thermal palettes, render params, weapon configs, movement behaviors, and spawn rules.
- Create `EnemyRenderer.js` procedural canvas drawing system for all hostile entities (mirrors `DroneRenderer.js` pipeline but with hostile aesthetics).
- Base target class: hitpoints, movement vectors, bounding volumes, FLIR heat-flash shaders, intel drop tables, zero-allocation object pool.
- All enemies use hostile thermal palettes (reds, oranges, toxic greens) distinct from player drone colors (cyan, purple, amber).
- Hostile IFF markers (blinking red triangle) drawn above each enemy. Damage state degradation as HP decreases (sparking, missing panels, smoke).
- Output: Core target lifecycle architecture with enemy config and procedural rendering scaffold.

### Step 23 — RV-4 Scout / Recon Buggy (Target 1) ✅
- **Silhouette**: Compact hexagonal disc body with 4 thrust pods at cardinal directions. Flat, surveillance micro-drone — no wings, no cockpit.
- **Thermal**: Dim red-orange (`#e85a3a` core) — low heat signature.
- **Scale**: 0.6× player size. **HP**: 15 (dies in 2–3 Vulcan hits). **Score**: 100.
- **Movement**: Fast linear descent from top edge. Slight random lateral drift (30px). Spawns in V-formations, staggered lines, or clusters of 3–7.
- **Attack**: Single forward pulse shot every 2s, aimed straight down. Low damage (10 contact). Low threat individually — dangerous in numbers.
- **Spawn**: Top edge only. Max 12 on screen. Available from Wave 1.
- Output: Fully rendered and behaviorally active Recon Buggy enemy.

### Step 24 — VK-7 Interceptor / Interceptor Jet (Target 2) 🔄 ← Current
- **Silhouette**: Narrow swept-back arrowhead body with sharp angular wings. Aggressive mass-produced hostile fighter — sleek but utilitarian, dual engine exhausts.
- **Thermal**: Hot orange (`#ff8c1a` core) — high-speed thermal bloom.
- **Scale**: 0.75× player size. **HP**: 30. **Score**: 250.
- **Movement**: Sinusoidal weaving horizontally (amplitude 120px, frequency 1.8 Hz) while descending at 90px/s. Amplitude and frequency scale up at higher levels.
- **Attack**: Angled dual-fire — two projectiles at ±15° from forward direction every 1.5s. Projectile speed 320px/s.
- **Spawn**: Top, left, or right edges. Pairs, diamonds, or echelon formations of 2–4. Max 6 on screen. Available from Wave 2.
- Output: Evasive sinusoidal fighter with angled dual-fire.

### Step 25 — GT-12 Sentinel / SAM Turret (Target 3)
- **Silhouette**: Wide hexagonal base platform with rotating turret barrel assembly. Industrial defense emplacement — armor plates, corner reinforcement bolts, antenna mast. Clearly a weapons platform, not a ship.
- **Thermal**: Warning amber (`#ffb703` core) — high armor glow.
- **Scale**: 0.85× player size. **HP**: 60 (tanky). **Score**: 400.
- **Movement**: Enters slowly from top (40px/s), anchors at Y-position (upper 25% of screen), then drifts laterally very slowly (20px drift).
- **Attack**: Aimed burst fire — turret tracks player position, fires 3-round burst (0.12s between shots) aimed directly at player drone. 2.5s cooldown between bursts. Projectile speed 380px/s.
- **Spawn**: Top edge only. Solo or pairs. Max 2 on screen. Available from Wave 3.
- Output: Stationary aimed turret with burst fire pattern.

### Step 26 — KZ-X Wraith / Kamikaze Drone (Target 4)
- **Silhouette**: Pointed wedge/missile-like body with small stabilizer fins. Glowing explosive front nose cone. Exposed wiring/panel detail for disposable, cobbled-together look.
- **Thermal**: Danger red (`#ff003c` core) — overheating dive signature.
- **Scale**: 0.5× player size. **HP**: 10 (fragile). **Score**: 200.
- **Movement**: Spawns from any edge (top, left, right). Brief slow approach (60px/s), then locks onto player position and dives at extreme speed (600px/s) in a straight line. Leaves hot exhaust trail.
- **Attack**: No projectiles — pure contact damage (35). 0.5s flashing red warning indicator telegraph before dive.
- **Spawn**: Any edge. Always solo. Max 3 on screen. Available from Wave 4.
- Output: High-speed suicide ram attacker with visual warning telegraph.

### Step 26b — EW-9 Specter / Radar Jammer (Target 5)
- **Silhouette**: Spherical/octagonal body bristling with 6 antenna spines and 2 satellite dish arrays. Clearly a utility/support drone — lots of sensor equipment, no visible weapons. Pulsing ECM aura rings radiating outward.
- **Thermal**: Toxic green (`#39ff14` core) — ECM radiation signature.
- **Scale**: 0.7× player size. **HP**: 40. **Score**: 500.
- **Movement**: Slow erratic floating pattern (25px/s descent, 50px lateral drift, 40px amplitude wobble). Stays in upper 40% of screen.
- **Attack**: No direct fire. While alive, applies **jamming aura**: HUD static/noise overlay (0.35 alpha), reduced radar range (50%), scrambled enemy IFF markers (flickering). Priority kill target.
- **Spawn**: Top edge only. Max 1 on screen. Available from Wave 7.
- Output: ECM support unit with HUD disruption effects.

### Step 27 — Intel & Supply Drops
- Armor repairs, ECM charges, ordnance power-ups, intel data packets with magnetic attraction toward player drone.
- Output: Satisfying loot collection loop.

---

## PHASE H — Wave Engine & Levels 1–4

### Step 28 — Wave-script runner
- Timeline-based wave orchestration, formation coordinates, and stage completion conditions.

### Step 29 — Levels 1–4 Implementation
- Level 1: Training Sector (Scout drones)
- Level 2: Asteroid Fringe (Drones + Zigzags)
- Level 3: Turret Outpost (Fortified positions)
- Level 4: Heavy Incursion (Mixed swarms + Kamikazes)

### Step 30 — Mission Results & Victory Flow
- Score calculation, accuracy bonus, 3-star rating thresholding, unlocks, and retry/next navigation.

---

## PHASE I — HVT 1: Mobile Command Center (Sector 5)

### Step 31 — HVT warning sequence
- Klaxon sirens, red alert HUD banner, cinematic entrance animation via satellite zoom.

### Step 32 — HVT framework & multi-segment entity
- **Entity**: `BOSS_MOBILE_COMMAND` — ~2.5× player scale width. Central octagonal command bridge flanked by two armored weapon pod modules.
- **Visual**: Octagonal core with armor plate lines, sensor dome, antenna arrays. Each pod has cut-corner rectangular body with 2 turret barrels. Connecting struts between core and pods.
- **HP Split**: Left Pod (200 HP, 1.2 armor) + Right Pod (200 HP, 1.2 armor) + Core (400 HP, 2.0 armor) = 800 total.
- **Thermal**: Phase 1 warning amber (`#ffb703`), Phase 2 danger red (`#ff003c`) with flicker damage FX.
- Multi-phase health bar at screen top showing per-segment health.
- Output: Multi-segment boss entity with independent segment destruction.

### Step 33 — Phase 1: Radial Flak Barrage
- Both weapon pods fire **rotating radial bullet patterns** — left pod clockwise, right pod counter-clockwise. 12 bullets per rotation at 0.8 rad/s, projectile speed 200px/s.
- Core fires occasional aimed single shots at player (300px/s, 3s cooldown).
- Boss oscillates laterally across screen (speed 50px/s, amplitude 200px).
- **Destroying a pod** removes that pod's radial pattern (visual: pod detaches with explosion, replaced by sparking debris stub).
- Phase transitions to Phase 2 when both pods are destroyed.

### Step 34 — Phase 2: Core Overdrive & Escort Deploy
- Triggered when both weapon pods destroyed. Core shield drops visually (overheat glow FX).
- Core movement speed doubles (100px/s, amplitude 280px).
- Core fires **rapid 5-way spread shots** (60° total spread, 350px/s, 1.2s cooldown).
- **Spawns 2 Interceptor escorts** every 15 seconds.
- Visual FX: Overheat glow pulsing, spark emissions from core.
- **Defeat sequence**: Left pod detaches & explodes (0s) → Right pod detaches & explodes (0.4s) → Core massive FLIR heat-flash detonation (1.0s). Screen shake intensity 12, 24 debris pieces.

---

## PHASE J — Hazards, Sectors 6–9 & Apex Target (Sector 10)

### Step 35 — Radar Hazards
- Destructible signal jammers and proximity mines.

### Step 36 — Sectors 6–9 Implementation
- Heavy gauntlet with dense hazard fields and multi-threat encounters.

### Step 37 — Boss 2 Framework (Apex Submersible Dreadnought)
- **Entity**: `BOSS_APEX_DREADNOUGHT` — ~3× player width. Elongated submarine/dreadnought hull with segmented armored spine.
- **Visual**: Forward sensor array, midship beam weapon emitter, aft engine bank (4 engines). Industrial brutalist design — thick plated hull with heavy greeble detail, spine hardpoints (4 turret mounts), 8 armor plate rows.
- **HP Split**: Forward Array (300) + Beam Emitter (400) + Mid Section (500) + Engine Bank (300) + Core (500) = 2000 total.
- **Thermal**: Phase 1 deep purple (`#8b5cf6`), Phase 2 hot crimson (`#dc2626`), Phase 3 white-hot overload (`#fbbf24` → `#ffffff`).
- Output: Campaign final boss with 3-phase escalating threat framework.

### Step 38 — Phase 1 (Submerge Dash) & Phase 2 (Heavy Sweeping Beam)
- **Phase 1 — "Submerge Dash"** (100%–50% HP):
  - Periodically "submerges" (0.6s fade-out with ripple FX), fully invulnerable during 2s submerge duration, then surfaces at new position with 150px shockwave.
  - Fires homing torpedo salvos: 3 torpedoes, 180px/s speed, 2.5 rad/s homing turn rate, 4s cooldown. Smoke trails on torpedoes.
  - Submerge cycle every 6 seconds.
- **Phase 2 — "Heavy Sweeping Beam"** (50%–25% HP):
  - Stops teleporting, anchors center-screen (50% X, 25% Y).
  - Charges and fires **sweeping tactical beam** (40px wide, full screen length): 1.5s charge telegraph, 8s active, rotates at 0.4 rad/s with 45° safe gap. 4s cooldown between sweeps.
  - Simultaneously fires point-defense turrets at player: aimed 2-round bursts, 350px/s, 2s cooldown.
  - Beam emitter visually charges with pulsing core glow and direction indicator.

### Step 39 — Phase 3: Enraged Desperation & Grand Ending
- **Phase 3 — "Enraged Desperation"** (below 25% HP):
  - Movement becomes erratic (80px/s, 250px amplitude, 40px jitter).
  - **Everything fires simultaneously**: Torpedo salvos (5 torpedoes, 3s cooldown, 220px/s), sweeping beam (doubled rotation 0.8 rad/s, smaller 30° gap), radial bullet waves (16 projectiles, 250px/s, 2.5s cooldown), and Kamikaze drone spawns (2 every 10s).
  - **Visual FX**: Hull cracking (jagged crack lines with energy leak glow spots), persistent screen shake (intensity 4), CRT glitch overlay, rapid flickering (rate 12).
  - Thermal shifts to white-hot overload (`#fbbf24` → `#ffffff`).
- **Defeat sequence**: Forward Array breaks (0s) → Beam Emitter breaks (0.5s) → Engine Bank breaks (1.0s) → Mid Section breaks (1.5s) → Core massive detonation (2.5s). Screen-white flash, shake intensity 20, 40 debris pieces, victory fanfare trigger.
- Output: Campaign Completion Victory sequence.

---

## PHASE K — Polish, Visual FX & Audio

### Step 40 — Particle engine & Impact Juice
- Sparks, smoke plumes, shockwave rings, floating embers, FLIR heat particles.

### Step 41 — Screen Shake & CRT Hit-Stop
- Directional camera shakes, CRT static glitches, and micro-freeze frames on critical hits.

### Step 42 — Web Audio Sound Effects & Procedural Soundtrack
- Synthesized military comms beeps, explosions, drone hums, and dynamic electronic dark synth music.

### Step 43 — UI Polish & Motion Design
- Tactical scanlines, heavy CRT flicker options, seamless state transitions, and responsive polish.

---

## PHASE L — Persistence, Balance & QA

### Step 44 — Save/Load System
- `localStorage` persistence for progress, stars, high scores, custom settings, and loadout preferences.

### Step 45 — Difficulty & Weapon Balancing
- Fine-tuned damage curves, spawn intervals, and score multipliers.

### Step 46 — Performance & Memory Optimization
- 60+ FPS profiling, garbage-collection minimization, and mobile responsiveness.

### Step 47 — Final QA & Master Release
- Comprehensive end-to-end playtesting across all 10 levels, menus, and controls.
