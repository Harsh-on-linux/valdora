# Workspace Rules & Agent Instructions — Space Shooter

This document defines the strict workflow rules, platform environment constraints, and quality standards for this repository. These instructions are automatically loaded and enforced on every step.

---

## 💻 1. Operating System & Command Syntax (Windows / PowerShell)
- **Windows Environment**: This project runs on a Windows machine with **PowerShell** as the primary shell.
- **Command Syntax Rules**:
  - Always use PowerShell-compatible syntax.
  - **Do NOT** use bash-style `&&` chaining; use semicolon `;` or separate sequential commands.
  - Use cross-platform / Windows paths where appropriate.

---

## 📌 2. Step-by-Step Execution Workflow
- Always refer to [**`BUILD_PLAN.md`**](file:///C:/Users/Harsh%20Yadav/Desktop/projects/space-shooter/BUILD_PLAN.md) before starting any task to maintain alignment with the phase and feature specifications.
- Implement features incrementally, verifying that each step produces working, testable code.

### Progress Markers in `BUILD_PLAN.md` (Mandatory)
After **each step's code is fully implemented and verified**, update `BUILD_PLAN.md`:
1. Change the just-completed step's marker from `🔄 ← Current` to `✅`.
2. Add `🔄 ← Current` to the **next** step heading.
3. Steps without any marker are implicitly pending — **do not** add markers to future steps.

**Marker Legend:**
| Marker | Meaning |
|--------|---------|
| `✅` | Completed — code implemented, tested, and committed |
| `🔄 ← Current` | In progress — the step being worked on right now |
| *(no marker)* | Pending — not yet started |

---

## 🧪 3. Build & Error Testing (Mandatory After Each Step)
- After implementing each step, **test the build before committing**:
  1. Open `index.html` in a local server (e.g. `python -m http.server` or VS Code Live Server) or verify with a quick browser test.
  2. Check the **browser DevTools console** for any JavaScript errors, module import failures, or CSS issues.
  3. Verify that the new feature renders correctly and does not break existing functionality.
- If errors are found, fix them **before** marking the step as complete or committing.
- At minimum, validate: no console errors, correct module loading, and UI renders as expected.

---

## 💾 4. Git Commit Protocol (Mandatory After Each Step)
- After successfully implementing, updating, and verifying each step:
  1. Stage all new and modified files (`git add .`).
  2. Create a clean, descriptive Git commit using conventional commit format.
  3. **DO NOT include step numbers** in commit messages.
     - Good: `git commit -m "feat: project scaffold, theme tokens & high-DPI canvas"`
     - Good: `git commit -m "feat: global state machine & smooth screen transitions"`
     - Good: `git commit -m "feat: reusable console UI kit and interactive button states"`
     - Bad: `git commit -m "feat(step-01): ..."`

---

## 📱 5. Mobile Responsiveness & Touch Controls (High Priority)
- **Fluid Layouts & Scaling**:
  - All HUD overlays, menus, console panels, and modals must scale cleanly across desktop, tablet, and mobile screens.
  - Use relative units (`rem`, `vh`, `vw`, `%`), CSS clamp, and media queries (`max-width: 768px`, `max-width: 480px`).
- **Touch-Friendly Controls**:
  - Implement on-screen touch controls (virtual joystick or direct touch-drag for ship movement, dedicated on-screen fire buttons for weapons).
  - Ensure minimum touch target sizes (at least 44x44px) for all interactive buttons.
- **Orientation & Viewport Handling**:
  - Prevent unwanted bounce scrolling or pinch-to-zoom gestures on canvas (`touch-action: none`, `user-scalable=no`).
  - Maintain correct aspect ratio and responsive canvas resizing on orientation changes.
- **Mobile Performance**:
  - Optimize particle counts and use object pooling so rendering maintains smooth 60 FPS on mobile GPUs.

---

## ⚡ 6. Code Standards & Architecture
- **Vanilla ES6+ Modules**: Clean modular JavaScript with explicit exports/imports.
- **Zero Heavy External Dependencies**: Pure HTML5 Canvas, Web Audio API, and CSS3.
- **High Performance**:
  - Zero garbage-collection allocation in the main render/update loops via object pooling (bullets, particles, enemies).
  - Fixed-timestep game loop for deterministic physics across varying screen refresh rates.
- **Theme Integrity**: Use centralized design tokens in `styles/theme.css` for colors, glows, fonts, and panel shadows.
