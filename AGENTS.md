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

---

## 💾 3. Git Commit Protocol (Mandatory After Each Step)
- After successfully implementing, updating, and verifying each step:
  1. Stage all new and modified files (`git add .`).
  2. Create a clean, descriptive Git commit using conventional commit format.
  3. **DO NOT include step numbers** in commit messages.
     - Good: `git commit -m "feat: project scaffold, theme tokens & high-DPI canvas"`
     - Good: `git commit -m "feat: global state machine & smooth screen transitions"`
     - Good: `git commit -m "feat: reusable console UI kit and interactive button states"`
     - Bad: `git commit -m "feat(step-01): ..."`

---

## 📱 4. Mobile Responsiveness & Touch Controls (High Priority)
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

## ⚡ 5. Code Standards & Architecture
- **Vanilla ES6+ Modules**: Clean modular JavaScript with explicit exports/imports.
- **Zero Heavy External Dependencies**: Pure HTML5 Canvas, Web Audio API, and CSS3.
- **High Performance**:
  - Zero garbage-collection allocation in the main render/update loops via object pooling (bullets, particles, enemies).
  - Fixed-timestep game loop for deterministic physics across varying screen refresh rates.
- **Theme Integrity**: Use centralized design tokens in `styles/theme.css` for colors, glows, fonts, and panel shadows.
