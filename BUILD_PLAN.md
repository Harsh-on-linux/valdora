# Space Shooter - Corrected Master Implementation Plan

This plan reflects the current repository after code audit. A checkmark means
the feature exists and has passed the required browser/runtime verification.
`PARTIAL` means code or configuration exists, but behavior is incomplete or
not verified. The current step is the only step being actively implemented.

## Status Rules

- `✅` Complete and verified.
- `PARTIAL` Present, but requires implementation, correction, or verification.
- `🔄 ← Current` Active implementation step.
- No marker means pending.

## Verification Required For Every Step

1. Run the local server with `npm run dev`.
2. Open the affected screen or mission in a browser.
3. Check the browser console for module, runtime, and rendering errors.
4. Verify desktop and mobile behavior where the step affects input or layout.
5. Run the smallest relevant automated or manual regression check.
6. Update this file only after the step passes verification.

## Current Repository Snapshot

- Vanilla ES modules, Canvas 2D, Web Audio, and a small Node static server.
- Menu, settings, level select, loadout, movement, touch input, HUD, weapons,
  enemies, pickups, waves, results, and local persistence are present.
- Sector 5 warning and multi-segment boss framework are present.
- Sector 5 boss attack behavior is not complete.
- Hazards, Sectors 6-9 gameplay, and the Sector 10 boss are not complete.
- There are currently no automated test files.
- `BUILD_PLAN.md` is the source of truth for implementation order.

---

## Phase A - Foundation and Theme

### Step 1 - Project scaffold ✅

- Maintain the HTML, CSS, module, asset, and server structure.
- Keep the responsive canvas shell and centralized theme tokens.

### Step 2 - Global screen state machine ✅

- Maintain registered screens and mount/unmount lifecycle.
- Keep the animated screen transition wrapper.

### Step 3 - Reusable command UI kit ✅

- Maintain tactical buttons, panels, telemetry bars, toggles, modals, and
  component showcase behavior.
- Keep keyboard focus and touch-sized controls in the shared components.

### Step 4 - Tactical background layer ✅

- Maintain the animated starfield and satellite/tactical map canvas layers.
- Keep resize and high-DPI handling.

---

## Phase B - Landing, Navigation, and Settings

### Step 5 - Landing cockpit ✅

- Maintain landing layout, title treatment, cockpit animation, and navigation.

### Step 6 - Landing navigation and UI audio ✅

- Maintain new-game/continue behavior and procedural UI sound feedback.

### Step 7 - How To Play and Settings ✅

- Maintain control documentation, weapon/enemy guide, audio settings, control
  scheme selection, CRT toggle, screen shake toggle, and persisted settings.

---

## Phase C - Campaign Data and Loadout

### Step 8 - Ten-sector data model ✅

- Maintain level metadata, unlock requirements, wave counts, hazards, boss
  flags, score thresholds, and map positions.

### Step 9 - Sector select console ✅

- Maintain the ten-node sector map, lock states, boss styling, stars, and
  sector preview cards.

### Step 10 - Sector select navigation ✅

- Maintain locked-node denial feedback and deployment/loadout routing.

### Step 11 - Drone data and procedural previews ✅

- Maintain Striker, Reaper, and Ghost chassis data and canvas previews.

### Step 12 - Loadout selection ✅

- Maintain chassis and payload selection with persisted active loadout.

---

## Phase D - Core Gameplay

### Step 13 - Fixed-timestep game loop ✅

- Maintain the fixed 60 Hz simulation, interpolated rendering, lifecycle
  states, canvas resize, and basic telemetry.

### Step 14 - Player movement and input ✅

- Maintain keyboard, mouse-follow, virtual joystick, acceleration, drag,
  banking, clamping, boost, and touch fire controls.

### Step 15 - Tactical gameplay HUD ✅

- Maintain radar modes, ordnance meters, coordinate telemetry, target markers,
  wave alerts, boss health UI, and responsive HUD behavior.

---

## Phase E - Ordnance, Collision, and Combat Regression

### Step 16 - Projectile pool and Vulcan cannon ✅

- Maintain pooled projectiles, Vulcan firing, muzzle effects, despawn bounds,
  and shot statistics.

### Step 17 - Runtime and lifecycle stabilization ✅

Fix the issues found during the audit before adding more combat content.

- Import `SaveManager` wherever mission completion records progress.
- Add the missing engine score API or route boss bounty through the existing
  score path.
- Replace invalid `currentScreenName` checks with the actual ScreenManager API.
- Fix collision debug rendering so its enemy pool argument is defined and used.
- Ensure pause, resume, abort, victory, and game-over transitions do not stop
  or restart the wrong engine state.
- Record a victory once only; prevent duplicate save writes from the engine
  and results screen.
- Cancel wave, screen, and pickup timers when a mission or screen is stopped.
- Verify no browser console errors through landing -> deploy -> pause -> resume
  -> victory/game-over -> results.

### Step 18 - Collision framework completion ✅

The current spatial hash and CCD code is present but does not yet satisfy the
zero-allocation and debug correctness requirements.

- Verify player/projectile/enemy/pickup collision behavior.
- Complete hazard-layer registration hooks.
- Fix duplicate collider/pair work and avoid per-tick string/object churn in
  the hot path where practical.
- Verify high-speed projectile CCD and penetration behavior.
- Verify debug grid, hitboxes, contacts, and telemetry without exceptions.

### Step 19 - Weapon regression pass 🔄 ← Current

The five player weapons exist, but they must be verified against the intended
behavior rather than treated as complete from configuration alone.

- Verify Flak spread, detonation, and cooldown.
- Verify Laser heat, overheat lockout, sustained visual beam behavior, and
  piercing rules.
- Verify Hellfire target acquisition, homing, smoke, and area damage.
- Verify Orbital hold-to-charge, release threshold, beam collision, and ammo.
- Verify weapon compatibility, cycling, slot selection, and HUD synchronization.

### Step 20 - Enemy combat and score regression

- Verify all five enemy movement patterns and attack patterns.
- Verify enemy projectiles damage the player exactly once per impact.
- Verify kamikaze telegraph, dive, contact damage, and cleanup.
- Verify radar jammer effects disappear immediately on destruction.
- Verify kills, drops, score, accuracy, and mission statistics.

### Step 21 - Pickup, wave, and results lifecycle regression

- Verify magnetic pickup collection and effect expiration.
- Verify wave completion waits for all spawned hostiles.
- Verify wave timers cannot trigger stale missions after restart.
- Verify unlimited mode is optional and does not block normal victory.
- Verify score bonuses, stars, grade, unlocks, retry, next-sector, and replay
  behavior without inflating campaign totals.

---

## Phase F - Existing Enemy Roster and Early Campaign

### Step 22 - Enemy configuration and renderer ✅

- Maintain the five enemy archetypes, hostile thermal palettes, IFF markers,
  damage degradation, and pooled lifecycle.
- Keep configuration validation, but run it as part of the regression pass.

### Step 23 - Recon Buggy ✅

- Maintain linear descent, drift, formations, pulse fire, score, and drops.

### Step 24 - Interceptor ✅

- Maintain sinusoidal movement, angled dual fire, formations, and scaling.

### Step 25 - SAM Turret ✅

- Maintain anchored movement, tracking turret, and three-round bursts.

### Step 26 - Kamikaze Drone ✅

- Maintain warning telegraph, lock-on dive, contact damage, and cleanup.

### Step 27 - Radar Jammer and drops ✅

- Maintain jammer HUD disruption, radar reduction, IFF scrambling, repairs,
  ordnance drops, and intel packets.

### Step 28 - Scripted wave runner ✅

- Maintain timeline events, formation spawning, banners, wave clearing, and
  mission completion choices.

### Step 29 - Sectors 1-4 ✅

- Maintain the current scripted Training, Asteroid, Turret, and Incursion
  missions.
- Hazard names in the level data are metadata only until Phase H implements
  actual hazard entities.

### Step 30 - Results and victory flow PARTIAL

- The results screen and score presentation exist.
- Complete Step 17 and Step 21 fixes before considering this verified.

---

## Phase G - Sector 5 Mobile Command HVT

### Step 31 - HVT warning sequence ✅

- Maintain red alert banner, klaxon, satellite optic zoom, and entrance timing.

### Step 32 - Mobile Command multi-segment framework ✅

- Maintain left pod, right pod, and core health, armor, hit testing, health
  bar, rendering, segment destruction, and phase state scaffolding.
- This step does not claim that boss attacks are complete.

### Step 33 - Phase 1 radial flak barrage

- Implement left-pod clockwise radial fire.
- Implement right-pod counter-clockwise radial fire.
- Fire 12 bullets per rotation at the configured rotation speed.
- Implement aimed core shots on their cooldown.
- Stop each pod attack immediately after that pod is destroyed.
- Verify projectile collision, player damage, audio, and visual telegraphs.

### Step 34 - Phase 2 core overdrive

- Trigger only after both weapon pods are destroyed.
- Implement core five-way spread fire and configured cooldown.
- Double core movement speed and lateral amplitude.
- Spawn two interceptor escorts every 15 seconds.
- Add shield-drop, overheat glow, sparks, and phase transition feedback.

### Step 35 - Sector 5 defeat and end-to-end verification

- Implement pod detach/debris stubs and the ordered defeat sequence.
- Award boss score through the single mission score path.
- Drop the configured supplies once.
- Complete Sector 5 through both phases on desktop and mobile controls.
- Verify victory, results, save unlock, retry, and next-sector routing.

---

## Phase H - Hazards and Sectors 6-9

### Step 36 - Hazard entity and collision system

- Add the minimum pooled hazard representation needed by the level data.
- Implement active/destructible hazard state, rendering, damage, and cleanup.
- Register hazards in CollisionSystem using the existing HAZARD layer.
- Add deterministic spawn/configuration hooks to WaveRunner.

### Step 37 - Radar and environmental hazards

- Implement destructible signal jammers.
- Implement proximity mines with proximity detection and telegraphing.
- Implement micrometeor/flak-burst behavior only where used by a sector.
- Keep hazard damage, score, and drop rules explicit.

### Step 38 - Sectors 6-7

- Implement Nebula Gauntlet waves and ion-storm effects.
- Implement Jammer Corridor encounters and destructible jammer objectives.
- Verify hazard density and radar disruption do not make the missions unfair.

### Step 39 - Sectors 8-9

- Implement Siege Platform minefields and defense batteries.
- Implement Dreadnought Approach heavy mixed waves.
- Add the intended escalation without relying on the generic fallback script.

---

## Phase I - Sector 10 Apex Dreadnought

### Step 40 - Apex boss entity framework

- Add a boss implementation that supports five segments: forward array, beam
  emitter, mid section, engine bank, and core.
- Do not reuse the three-segment Mobile Command assumptions.
- Add segment-specific collision, health display, armor, and destruction state.

### Step 41 - Apex Phase 1: Submerge Dash

- Implement fade/submerge invulnerability and repositioning.
- Implement surface ripple/shockwave damage or telegraph behavior.
- Implement homing torpedo salvos and smoke trails.
- Add phase health threshold handling.

### Step 42 - Apex Phase 2: Sweeping Beam

- Anchor the boss at the configured center position.
- Implement charge telegraph, rotating beam, and safe gap.
- Implement point-defense aimed bursts.
- Verify beam collision continuously and fairly.

### Step 43 - Apex Phase 3: Enraged Desperation

- Implement erratic movement and persistent low-intensity shake/glitch.
- Combine torpedoes, beam, radial bullets, and kamikaze spawns.
- Implement hull cracks, energy leaks, white-hot thermal state, and flicker.

### Step 44 - Campaign completion sequence

- Implement ordered five-segment destruction and final detonation.
- Add screen flash, final shake, debris, fanfare, score, and Sector 10 save
  completion.
- Verify no further waves spawn after final victory.

---

## Phase J - Polish, Audio, and Accessibility

### Step 45 - Particle and impact engine

- Consolidate sparks, smoke, embers, heat particles, shockwaves, and debris in
  a bounded pooled system.
- Define mobile-safe particle caps.

### Step 46 - Screen shake, hit-stop, and CRT effects

- Respect the screen-shake setting in every camera impulse.
- Add directional shake and short hit-stop for critical impacts.
- Add optional CRT glitch/flicker without blocking gameplay or readability.

### Step 47 - Audio completion

- Keep procedural UI and weapon sounds.
- Add the missing procedural soundtrack or explicitly remove the unused music
  control if music is not part of release scope.
- Verify master, SFX, music, mute, and browser audio-unlock behavior.

### Step 48 - UI polish and accessibility

- Remove the duplicated legacy cockpit UI or make it the single source of truth.
- Replace hardcoded timestamp/sector/wave display with live state.
- Verify focus states, labels, contrast, reduced motion, touch target sizes,
  landscape/portrait behavior, and small-screen overflow.

---

## Phase K - Persistence, Balance, Performance, and Release

### Step 49 - Save/load hardening

- Validate and normalize malformed localStorage data.
- Make victory recording idempotent for replay and repeated results opens.
- Persist progress, stars, high scores, settings, and loadout preferences.
- Provide a safe reset path without creating duplicate campaign records.

### Step 50 - Difficulty and weapon balance

- Tune enemy HP, armor, fire rates, damage, spawn intervals, boss timings,
  weapon heat/ammo, score thresholds, and star requirements.
- Test each drone and weapon across early, mid, and boss missions.

### Step 51 - Performance and memory verification

- Profile fixed-update and render cost on desktop and mobile-sized viewports.
- Remove avoidable per-tick allocations from collision, enemy, boss, and HUD
  hot paths.
- Verify pool capacity behavior, timer cleanup, resize behavior, and stable
  60 FPS targets.

### Step 52 - Automated checks and browser QA

- Add lightweight tests for level validation, save idempotency, stars, weapon
  cycling, collision geometry, wave completion, and boss segment transitions.
- Run end-to-end browser checks for all screens, all ten sectors, pause/resume,
  results, settings, keyboard, mouse, and touch controls.
- Confirm zero uncaught console errors and no broken module or asset requests.

### Step 53 - Master release

- Verify clean startup from a fresh browser profile.
- Verify existing-save migration and campaign reset.
- Confirm mobile orientation and touch behavior.
- Confirm release scope, documentation, and final performance baseline.
