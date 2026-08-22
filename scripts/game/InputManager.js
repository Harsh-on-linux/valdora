/**
 * InputManager — Multi-Modal Input Handler for Cockpit Command
 * Supports:
 * - Keyboard (WASD, Arrow Keys, Space, Shift, J, K, E, Q, Esc)
 * - Mouse / Pointer (Follow cursor mode, click-to-fire)
 * - Virtual Touch Joystick & Multi-Touch Gestures for mobile/tablets
 * - Dynamic Control Scheme switching with SettingsManager integration
 */

import { SettingsManager } from './SettingsManager.js';

export const CONTROL_SCHEMES = {
  AUTO: 'auto',
  KEYBOARD: 'keyboard',
  MOUSE: 'mouse',
  TOUCH: 'touch'
};

export class InputManager {
  constructor() {
    this.attached = false;
    this.canvas = null;
    this.container = null;

    // Movement vector: normalized -1.0 to 1.0
    this.moveVector = { x: 0, y: 0 };

    // Action button states
    this.actions = {
      fire: false,
      secondary: false,
      boost: false,
      pause: false,
      toggleRadar: false,
      weaponSlot: 1
    };

    // Keyboard state tracking
    this.keys = new Map();

    // Mouse / Pointer state
    this.mouse = {
      x: 0,
      y: 0,
      canvasX: 0,
      canvasY: 0,
      down: false,
      rightDown: false,
      active: false
    };

    // Touch & Virtual Joystick state
    this.touchJoystick = {
      active: false,
      touchId: null,
      baseX: 0,
      baseY: 0,
      currentX: 0,
      currentY: 0,
      radius: 54, // Maximum joystick drag radius in px
      deadZone: 6, // Pixels before input registers
      normX: 0,
      normY: 0
    };

    this.touchFire = {
      active: false,
      touchId: null
    };

    // Active control scheme
    this.controlScheme = CONTROL_SCHEMES.AUTO;
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Bound event handlers for clean attach/detach
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onContextMenu = (e) => e.preventDefault();
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
    this._onBlur = this._handleBlur.bind(this);
    this._onSettingsUpdate = this._handleSettingsUpdate.bind(this);
  }

  /**
   * Attach input event listeners to canvas and window.
   * @param {HTMLCanvasElement} [canvas]
   * @param {HTMLElement} [container]
   */
  attach(canvas = null, container = null) {
    if (this.attached) return;

    this.canvas = canvas;
    this.container = container || canvas || window;

    // Load active control scheme from settings
    const settings = SettingsManager.getSettings();
    this.controlScheme = settings.controlScheme || CONTROL_SCHEMES.AUTO;

    // 1. Keyboard Listeners
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    // 2. Mouse / Pointer Listeners (attached to window so gameplay input is smooth and uninterruptible)
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('contextmenu', this._onContextMenu);

    // 3. Touch Listeners (Passive: false to allow preventDefault on game touch)
    window.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this._onTouchEnd, { passive: false });

    // 4. Settings change listener
    window.addEventListener('settings:updated', this._onSettingsUpdate);

    this.attached = true;
  }

  /**
   * Detach all event listeners and reset input states.
   */
  detach() {
    if (!this.attached) return;

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);

    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('contextmenu', this._onContextMenu);

    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);

    window.removeEventListener('settings:updated', this._onSettingsUpdate);

    this.reset();
    this.attached = false;
  }

  /**
   * Reset all input states.
   */
  reset() {
    this.moveVector.x = 0;
    this.moveVector.y = 0;
    this.actions.fire = false;
    this.actions.secondary = false;
    this.actions.boost = false;
    this.actions.pause = false;
    this.keys.clear();
    this.mouse.down = false;
    this.mouse.rightDown = false;
    this.touchJoystick.active = false;
    this.touchJoystick.touchId = null;
    this.touchJoystick.normX = 0;
    this.touchJoystick.normY = 0;
    this.touchFire.active = false;
    this.touchFire.touchId = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE & VECTOR CALCULATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Poll and update the aggregated movement vector and actions.
   * Called each frame/tick.
   * @param {number} [dt]
   * @param {number} [playerX]
   * @param {number} [playerY]
   */
  update(dt = 0.016, playerX = null, playerY = null) {
    let mx = 0;
    let my = 0;

    // 1. Keyboard directional input
    if (this.keys.get('KeyA') || this.keys.get('ArrowLeft')) mx -= 1;
    if (this.keys.get('KeyD') || this.keys.get('ArrowRight')) mx += 1;
    if (this.keys.get('KeyW') || this.keys.get('ArrowUp')) my -= 1;
    if (this.keys.get('KeyS') || this.keys.get('ArrowDown')) my += 1;

    // 2. Touch Joystick input
    if (this.touchJoystick.active) {
      mx += this.touchJoystick.normX;
      my += this.touchJoystick.normY;
    }

    // 3. Mouse Follow Mode (if active and in mouse mode or explicit pointer movement)
    const effectiveScheme = this.getEffectiveControlScheme();
    if (effectiveScheme === CONTROL_SCHEMES.MOUSE && this.mouse.active && playerX !== null && playerY !== null) {
      const dx = this.mouse.canvasX - playerX;
      const dy = this.mouse.canvasY - playerY;
      const dist = Math.hypot(dx, dy);
      const deadZone = 12;

      if (dist > deadZone) {
        const factor = Math.min(1.0, (dist - deadZone) / 100);
        mx = (dx / dist) * factor;
        my = (dy / dist) * factor;
      }
    }

    // Normalize diagonal keyboard/touch vector to prevent >1.0 diagonal speed
    const length = Math.hypot(mx, my);
    if (length > 1.0) {
      mx /= length;
      my /= length;
    }

    this.moveVector.x = mx;
    this.moveVector.y = my;

    // Actions update
    this.actions.fire =
      this.keys.get('Space') ||
      this.keys.get('KeyJ') ||
      this.keys.get('KeyZ') ||
      this.mouse.down ||
      this.touchFire.active;

    this.actions.secondary =
      this.keys.get('KeyK') ||
      this.keys.get('KeyX') ||
      this.keys.get('KeyE') ||
      this.mouse.rightDown;

    this.actions.boost =
      this.keys.get('ShiftLeft') ||
      this.keys.get('ShiftRight');
  }

  /**
   * Get current movement vector.
   * @returns {{x: number, y: number}}
   */
  getMovementVector() {
    return this.moveVector;
  }

  /**
   * Check if a specific action is triggered.
   * @param {'fire'|'secondary'|'boost'|'pause'} action
   * @returns {boolean}
   */
  isActionActive(action) {
    return !!this.actions[action];
  }

  /**
   * Get current touch joystick state for rendering overlay.
   */
  getTouchJoystickState() {
    return this.touchJoystick;
  }

  /**
   * Determine active control scheme (resolving 'auto').
   */
  getEffectiveControlScheme() {
    if (this.controlScheme === CONTROL_SCHEMES.AUTO) {
      return this.isTouchDevice ? CONTROL_SCHEMES.TOUCH : CONTROL_SCHEMES.KEYBOARD;
    }
    return this.controlScheme;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════

  _handleKeyDown(e) {
    // Prevent default browser scrolling on arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    this.keys.set(e.code, true);

    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.actions.pause = true;
    }

    if (e.code === 'KeyR') {
      this.actions.toggleRadar = true;
      window.dispatchEvent(new CustomEvent('radar:toggle'));
    }

    if (e.code === 'KeyH' || e.code === 'F3') {
      window.dispatchEvent(new CustomEvent('collision:toggleDebug'));
    }

    // Weapon Cycling (Q = Prev, E = Next)
    if (e.code === 'KeyQ') {
      this.actions.cyclePrev = true;
      window.dispatchEvent(new CustomEvent('weapon:cycle', { detail: { direction: -1 } }));
    }

    if (e.code === 'KeyE') {
      this.actions.cycleNext = true;
      window.dispatchEvent(new CustomEvent('weapon:cycle', { detail: { direction: 1 } }));
    }

    // Direct Weapon Slot Selection (1 - 5)
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      this.actions.weaponSlot = 1;
      window.dispatchEvent(new CustomEvent('weapon:selectSlot', { detail: { slot: 1 } }));
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      this.actions.weaponSlot = 2;
      window.dispatchEvent(new CustomEvent('weapon:selectSlot', { detail: { slot: 2 } }));
    }
    if (e.code === 'Digit3' || e.code === 'Numpad3') {
      this.actions.weaponSlot = 3;
      window.dispatchEvent(new CustomEvent('weapon:selectSlot', { detail: { slot: 3 } }));
    }
    if (e.code === 'Digit4' || e.code === 'Numpad4') {
      this.actions.weaponSlot = 4;
      window.dispatchEvent(new CustomEvent('weapon:selectSlot', { detail: { slot: 4 } }));
    }
    if (e.code === 'Digit5' || e.code === 'Numpad5') {
      this.actions.weaponSlot = 5;
      window.dispatchEvent(new CustomEvent('weapon:selectSlot', { detail: { slot: 5 } }));
    }
  }

  _handleKeyUp(e) {
    this.keys.set(e.code, false);
    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.actions.pause = false;
    }
    if (e.code === 'KeyQ') this.actions.cyclePrev = false;
    if (e.code === 'KeyE') this.actions.cycleNext = false;
  }

  _handleMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.canvasX = e.clientX - rect.left;
      this.mouse.canvasY = e.clientY - rect.top;
    } else {
      this.mouse.canvasX = e.clientX;
      this.mouse.canvasY = e.clientY;
    }
    this.mouse.active = true;
  }

  _handleMouseDown(e) {
    // Ignore clicks on HUD interactive buttons
    if (e.target && (e.target.closest('button') || e.target.closest('.console-btn') || e.target.closest('.hud-radar-toggle-btn') || e.target.closest('.touch-action-btn'))) {
      return;
    }

    if (e.button === 0) {
      this.mouse.down = true;
      this.mouse.active = true;
    } else if (e.button === 2) {
      this.mouse.rightDown = true;
    }
  }

  _handleMouseUp(e) {
    if (e.button === 0) {
      this.mouse.down = false;
    } else if (e.button === 2) {
      this.mouse.rightDown = false;
    }
  }

  _handleTouchStart(e) {
    const rect = this.canvas ? this.canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const halfWidth = rect.width * 0.55;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && (target.closest('button') || target.closest('.console-btn') || target.closest('.touch-action-btn'))) {
        continue;
      }

      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      // Left portion of screen: Virtual Joystick
      if (tx <= halfWidth && !this.touchJoystick.active) {
        this.touchJoystick.active = true;
        this.touchJoystick.touchId = touch.identifier;
        this.touchJoystick.baseX = tx;
        this.touchJoystick.baseY = ty;
        this.touchJoystick.currentX = tx;
        this.touchJoystick.currentY = ty;
        this.touchJoystick.normX = 0;
        this.touchJoystick.normY = 0;
      }
      // Right portion of screen: Touch to Fire
      else if (tx > halfWidth && !this.touchFire.active) {
        this.touchFire.active = true;
        this.touchFire.touchId = touch.identifier;
      }
    }
  }

  _handleTouchMove(e) {
    if (!this.canvas) return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Update virtual joystick if this touch matches
      if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;

        const dx = tx - this.touchJoystick.baseX;
        const dy = ty - this.touchJoystick.baseY;
        const dist = Math.hypot(dx, dy);
        const radius = this.touchJoystick.radius;

        if (dist <= radius) {
          this.touchJoystick.currentX = tx;
          this.touchJoystick.currentY = ty;
        } else {
          // Clamp to max radius
          this.touchJoystick.currentX = this.touchJoystick.baseX + (dx / dist) * radius;
          this.touchJoystick.currentY = this.touchJoystick.baseY + (dy / dist) * radius;
        }

        // Calculate normalized direction vector with deadzone
        if (dist > this.touchJoystick.deadZone) {
          const effectiveDist = Math.min(dist, radius);
          this.touchJoystick.normX = (dx / dist) * (effectiveDist / radius);
          this.touchJoystick.normY = (dy / dist) * (effectiveDist / radius);
        } else {
          this.touchJoystick.normX = 0;
          this.touchJoystick.normY = 0;
        }
      }
    }
  }

  _handleTouchEnd(e) {
    if (!this.canvas) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
        this.touchJoystick.active = false;
        this.touchJoystick.touchId = null;
        this.touchJoystick.normX = 0;
        this.touchJoystick.normY = 0;
      }

      if (this.touchFire.active && touch.identifier === this.touchFire.touchId) {
        this.touchFire.active = false;
        this.touchFire.touchId = null;
      }
    }
  }

  _handleBlur() {
    this.reset();
  }

  _handleSettingsUpdate(e) {
    if (e.detail?.controlScheme) {
      this.controlScheme = e.detail.controlScheme;
    }
  }
}
