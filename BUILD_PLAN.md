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

### Step 8 — Level select data model 🔄 ← Current
- Define `levels.js` config: 10 levels with id, name, isBoss flag, unlock requirement, target score, enemy waves, reward stars.
- Output: Validated level configuration module.

### Step 9 — Level select UI (Star-Map console style)
- Node graph / tactical map layout of 10 mission sectors; Boss levels (5 & 10) feature highlighted warning aesthetics.
- Visual lock states with lock icons, star rating badges, and sector preview cards on hover.
- Output: Responsive star-map level select interface.

### Step 10 — Level select interactivity
- Audio-visual denial feedback on locked nodes; unlocked nodes launch level loadout / direct deployment.
- Output: Full navigation flow into the game loop.

---

## PHASE D — Loadout / Drone Selection

### Step 11 — Drone data & procedural rendering function
- Procedural canvas drone drawing function: top-down tactical wireframes or high-contrast silhouette representations (Predator, Reaper, Ghost).
- Color theme parameterization for heat signatures.
- Output: Isolated drone preview canvas with targeting crosshairs.

### Step 12 — Loadout screen
- Selection cards for drone chassis variants (Surveillance, Heavy Strike, Electronic Warfare) and payload presets (Vulcan, Flak, Laser, Hellfire).
- Persist player loadout choices to active game state.
- Output: Fully interactive loadout configuration screen.

---

## PHASE E — Core Gameplay Loop

### Step 13 — Canvas game loop skeleton
- Fixed-timestep update + interpolated render loop via `requestAnimationFrame` for rock-solid 60+ FPS.
- Background satellite map layer integration inside gameplay canvas.
- Output: Smooth running game engine skeleton.

### Step 14 — Player drone movement
- WASD / Arrow keys, Mouse follow mode, and virtual touch joystick for mobile.
- Smooth acceleration, braking drag, banking angles on lateral movement, boundary clamping.
- Output: Responsive, fluid drone handling.

### Step 15 — Tactical HUD Overlay
- Tactical dashboard: Side data panels, Active/Passive Radar toggle, Ordnance meters, Coordinate tracker, Target bounding boxes.
- Output: Real-time rendered HUD over the canvas viewport with CRT scanline post-processing.

---

## PHASE F — Ordnance Arsenal & Collisions

### Step 16 — Projectile pool & Vulcan Cannon
- Zero-allocation Object Pool for projectiles.
- Rapid single/dual Vulcan Cannon with muzzle flashes and despawn boundaries.
- Output: High-performance bullet firing mechanics.

### Step 17 — Collision detection framework
- Fast spatial partitioning & Circle/AABB collision engine.
- Bullet vs. Target, Drone vs. Target, Drone vs. Hazard collision resolution.
- Output: Collision detection pipeline with debug visualization toggle.

### Step 18 — Flak Cannon Weapon
- 3 to 5-way angled spread with wide coverage, custom explosive particle tint.
- Weapon cycle key (Q/E or 1-4) with HUD icon swap.
- Output: Multi-directional crowd control firing.

### Step 19 — Laser Designator Beam
- Sustained high-energy beam with animated core, outer corona, and contact sparks.
- Heat buildup mechanics with overheat lockout and cooling dissipation.
- Output: Thermal-limited piercing beam weapon.

### Step 20 — Hellfire Swarm Missiles
- Self-propelling tracking missiles with smoke trails, auto-acquiring target lock, and area-of-effect blast on impact.
- Output: Autonomous guided ordinance.

### Step 21 — Orbital Strike
- Hold-to-charge mechanics with accumulating targeting laser and massive vertical strike release.
- Output: High-impact heavy attack option.

---

## PHASE G — Target Roster & Intel Drops

### Step 22 — Target base class & entity pool
- Base target class: hitpoints, movement vectors, bounding volumes, FLIR heat-flash shaders, intel drop tables.
- Output: Core target lifecycle architecture.

### Step 23 — Recon Buggy (Target 1)
- Swarming, fast descents with light forward fire.

### Step 24 — Interceptor Jet (Target 2)
- Sinusoidal evasive flight patterns with angled dual-fire.

### Step 25 — SAM Site Turret (Target 3)
- Anchors in upper sector, tracks drone position, and fires targeted pulse bursts.

### Step 26 — Kamikaze Drone (Target 4)
- High-velocity dive-bombing ram attacks with emergency evasive cues.

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

### Step 32 — HVT framework
- Multi-segmented target entity with multi-phase health bar at screen top.

### Step 33 — Phase 1: Radial Flak Barrage
- Rotating anti-air cannons and missile volleys.

### Step 34 — Phase 2: Core Overdrive & Escort Deploy
- Spawns escort fighters, initiates sweep attacks, epic multi-stage FLIR explosion on defeat.

---

## PHASE J — Hazards, Sectors 6–9 & Apex Target (Sector 10)

### Step 35 — Radar Hazards
- Destructible signal jammers and proximity mines.

### Step 36 — Sectors 6–9 Implementation
- Heavy gauntlet with dense hazard fields and multi-threat encounters.

### Step 37 — Boss 2 Framework (Nuclear Submarine)
- Mobile, responsive 3-phase apex target.

### Step 38 — Phases 1 & 2: Submerge Dash & Heavy Sweeping Beam
- High mobility teleport dashes and telegraphed laser sweeps.

### Step 39 — Phase 3: Enraged Desperation & Grand Ending
- Overcharged barrage, visual frenzy FX, and full Campaign Completion Victory sequence.

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
