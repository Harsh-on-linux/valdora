# Space Shooter — Master Build Plan

Each step is small, builds directly on the previous one, and ends in something testable. Grouped into phases and batches for clean incremental development.

---

## 🏗️ BUILD BATCHES AT A GLANCE
- **Batch 1 (Phases A & B)**: Foundation, Console UI Kit, Starfield, Landing Page, Navigation, How to Play & Settings (Steps 1–7)
- **Batch 2 (Phases C, D, E)**: Level Select, Loadout/Ship Selection, Game Loop & Movement, Cockpit HUD (Steps 8–15)
- **Batch 3 (Phase F)**: Weapons Arsenal (Cannon, Spread, Laser Beam, Homing Missiles, Charge Shot) & Collision Framework (Steps 16–21)
- **Batch 4 (Phases G & H)**: Enemy Archetypes, Pickups & Drops, Wave Engine & Levels 1–4 (Steps 22–30)
- **Batch 5 (Phase I)**: Boss Framework & Boss 1 Encounter (Level 5) (Steps 31–34)
- **Batch 6 (Phase J)**: Hazards, Levels 6–9 & Mobile Multi-Phase Final Boss (Level 10) (Steps 35–39)
- **Batch 7 (Phases K & L)**: Particle VFX, Screen Shake, Audio Synthesizer, Save System, Balancing & QA (Steps 40–47)

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
- Define CSS custom properties for the cockpit theme: background colors (`#040711`, `#0b1329`), glow-cyan (`#00f0ff`), glow-amber (`#ffb703`), danger-red (`#ff0055`), neon-green (`#39ff14`), border radii, panel bevel shadows, holographic scanlines.
- Import HUD-style font (Orbitron / Rajdhani + system fallback stack).
- Output: Initialized page with cockpit theme tokens, loaded fonts, and responsive canvas wrapper ready.

### Step 2 — Global state machine ✅
- Build a lightweight screen manager (`landing`, `levelSelect`, `loadout`, `game`, `pause`, `results`, `settings`).
- Each screen is a JS module with `mount()` / `unmount()` lifecycle hooks.
- Smooth transition wrapper (~250–350ms ease-out) so switching screens is seamless.
- Output: Programmatic switching between screen containers with smooth transitions.

### Step 3 — Reusable UI components (the "console kit") ✅
- Build styled, reusable components: `<ConsoleButton>`, `<Panel>`, `<ProgressBar>` (health/shield/heat/charge), `<Toggle>`, `<Modal>`.
- Add press/hover states: reactive neon glow on hover, micro-scale press feedback + audio click trigger.
- Output: Component showcase view to test all UI elements in isolation.

### Step 4 — Animated starfield background ✅
- Canvas-based multi-layer parallax starfield (3 depth layers with varying drift velocities and star sizes).
- Subtle twinkling and warp speed acceleration effects.
- Output: Starfield running continuously behind active screens.

---

## PHASE B — Landing Page & Navigation

### Step 5 — Landing page layout 🔄 ← Current
- Title logo with pulsing holographic glow animation.
- Primary buttons: Start/Continue, Level Select, Loadout, Settings, How to Play.
- Ambient cockpit animation: scanline overlay, rotating radar sweep in corner.
- Output: Visual landing page ready with interactive layout.

### Step 6 — Landing page logic
- "Continue" button dynamically shows only if existing save state exists; otherwise "Start" begins Level 1.
- Web Audio UI sound feedback (beeps, clicks, power hums).
- Output: Interactive landing navigation with auditory feedback.

### Step 7 — How to Play / Settings screens
- How to Play: Interactive controls diagram, weapon stats legend, enemy threat guide.
- Settings: Master volume, SFX volume, Music volume, control scheme toggle (Keyboard / Mouse / Touch), screen shake toggle.
- Output: Settings persisted to `localStorage` and real-time audio gain adjustment.

---

## PHASE C — Level Select

### Step 8 — Level select data model
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

## PHASE D — Loadout / Ship Selection

### Step 11 — Ship data & procedural rendering function
- Procedural canvas ship drawing function: layered composite hull, cockpit canopy glass with gradient reflection, wing pylons, dual engine exhaust ports, animated thruster flame.
- Color theme parameterization for unlockable chassis / skins.
- Output: Isolated ship preview canvas with idle floating animation.

### Step 12 — Loadout screen
- Selection cards for ship chassis variants (Speed, Armor, Energy) and primary weapon presets (Cannon, Spread, Laser, Missiles).
- Persist player loadout choices to active game state.
- Output: Fully interactive loadout configuration screen.

---

## PHASE E — Core Gameplay Loop

### Step 13 — Canvas game loop skeleton
- Fixed-timestep update + interpolated render loop via `requestAnimationFrame` for rock-solid 60+ FPS.
- Background parallax layer integration inside gameplay canvas.
- Output: Smooth running game engine skeleton.

### Step 14 — Player ship movement
- WASD / Arrow keys, Mouse follow mode, and virtual touch joystick for mobile.
- Smooth acceleration, braking drag, banking roll angles on lateral movement, boundary clamping.
- Output: Responsive, fluid ship handling.

### Step 15 — Cockpit HUD Overlay
- Sci-fi dashboard: Curved Hull integrity & Energy Shield gauges, Heat / Ammo meters, Score counter, Weapon switch panel, Pause button.
- Output: Real-time rendered HUD over the canvas viewport.

---

## PHASE F — Weapons Arsenal & Collisions

### Step 16 — Bullet pool & Plasma Cannon
- Zero-allocation Object Pool for projectiles.
- Rapid single/dual Plasma Cannon with muzzle flashes and despawn boundaries.
- Output: High-performance bullet firing mechanics.

### Step 17 — Collision detection framework
- Fast spatial partitioning & Circle/AABB collision engine.
- Bullet vs. Enemy, Player vs. Enemy, Player vs. Hazard collision resolution.
- Output: Collision detection pipeline with debug visualization toggle.

### Step 18 — Spread Shot Weapon
- 3 to 5-way angled plasma spread with wide coverage, custom purple/amber particle tint.
- Weapon cycle key (Q/E or 1-4) with HUD icon swap.
- Output: Multi-directional crowd control firing.

### Step 19 — Continuous Laser Beam
- Sustained high-energy beam with animated core, outer corona, and contact sparks.
- Heat buildup mechanics with overheat lockout and cooling dissipation.
- Output: Thermal-limited piercing beam weapon.

### Step 20 — Homing Swarm Missiles
- Self-propelling tracking missiles with smoke trails, auto-acquiring target lock, and area-of-effect blast on impact.
- Output: Autonomous guided ordinance.

### Step 21 — Mega Charge Shot
- Hold-to-charge mechanics with accumulating ship aura and massive piercing projectile release.
- Output: High-impact heavy attack option.

---

## PHASE G — Enemy Roster & Pickups

### Step 22 — Enemy base class & entity pool
- Base enemy class: hitpoints, movement vectors, bounding volumes, hit-flash shaders, drop tables.
- Output: Core enemy lifecycle architecture.

### Step 23 — Scout Drone (Enemy 1)
- Swarming, fast descents with light forward blasters.

### Step 24 — Zigzag Interceptor (Enemy 2)
- Sinusoidal evasive flight patterns with angled dual-fire.

### Step 25 — Stationary Heavy Turret (Enemy 3)
- Anchors in upper sector, tracks player position, and fires targeted pulse bursts.

### Step 26 — Kamikaze Striker (Enemy 4)
- High-velocity dive-bombing ram attacks with emergency evasive cues.

### Step 27 — Drops & Magnet Pickups
- Shield recharges, repair nanites, weapon power-ups, score crystals with magnetic attraction toward player ship.
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

## PHASE I — Boss 1: Orbital Dreadnought (Level 5)

### Step 31 — Boss warning sequence
- Klaxon sirens, red alert HUD banner, cinematic entrance animation.

### Step 32 — Boss framework
- Multi-segmented boss entity with multi-phase health bar at screen top.

### Step 33 — Phase 1: Radial Bullet Barrage
- Rotating pulse cannons and missile volleys.

### Step 34 — Phase 2: Core Overdrive & Drone Deploy
- Spawns escort fighters, initiates sweep attacks, epic multi-stage explosion on defeat.

---

## PHASE J — Hazards, Levels 6–9 & Final Boss (Level 10)

### Step 35 — Space Hazards
- Destructible tumbling asteroids and proximity mines.

### Step 36 — Levels 6–9 Implementation
- Heavy gauntlet with dense hazard fields and multi-threat encounters.

### Step 37 — Boss 2 Framework (Mobile Leviathan)
- Mobile, responsive 3-phase apex boss.

### Step 38 — Phases 1 & 2: Warp Dash & Heavy Sweeping Beam
- High mobility teleport dashes and telegraphed thermal laser sweeps.

### Step 39 — Phase 3: Enraged Desperation & Grand Ending
- Overcharged barrage, visual frenzy FX, and full Campaign Completion Victory sequence.

---

## PHASE K — Polish, Visual FX & Audio

### Step 40 — Particle engine & Impact Juice
- Sparks, smoke plumes, shockwave rings, floating embers, thruster particles.

### Step 41 — Screen Shake & Hit-Stop
- Directional camera shakes and micro-freeze frames on critical hits.

### Step 42 — Web Audio Sound Effects & Procedural Soundtrack
- Synthesized sci-fi lasers, explosions, engine hums, and dynamic electronic synth music.

### Step 43 — UI Polish & Motion Design
- Cockpit scanlines, CRT flicker options, seamless state transitions, and responsive polish.

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
