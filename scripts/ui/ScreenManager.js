/**
 * ScreenManager — State Machine & Screen Transition Router
 * Handles mounting, unmounting, history, and smooth animated transitions
 * between game states and UI views.
 */

export class ScreenManager {
  /**
   * @param {HTMLElement} uiRoot - Container element for all UI screens
   */
  constructor(uiRoot) {
    if (!uiRoot) {
      throw new Error('[ScreenManager] Valid UI root element is required.');
    }
    this.uiRoot = uiRoot;
    this.screens = new Map();
    this.activeScreenId = null;
    this.activeScreenInstance = null;
    this.activeScreenElement = null;
    this.isTransitioning = false;
    this.transitionDuration = 280; // ms matching CSS --transition-normal
  }

  /**
   * Registers a screen module
   * @param {string} id - Unique screen identifier
   * @param {object} screenModule - Module with mount(container, data) & unmount()
   */
  register(id, screenModule) {
    if (!screenModule || typeof screenModule.mount !== 'function') {
      throw new Error(`[ScreenManager] Screen "${id}" must implement a mount() method.`);
    }
    this.screens.set(id, screenModule);
    return this;
  }

  /**
   * Transitions to a new screen
   * @param {string} targetScreenId - Registered screen ID
   * @param {object} [data={}] - Optional payload passed to mount()
   * @returns {Promise<boolean>}
   */
  async show(targetScreenId, data = {}) {
    if (this.isTransitioning) {
      console.warn(`[ScreenManager] Transition to "${targetScreenId}" ignored: another transition is in progress.`);
      return false;
    }

    if (!this.screens.has(targetScreenId)) {
      console.error(`[ScreenManager] Screen "${targetScreenId}" is not registered.`);
      return false;
    }

    if (this.activeScreenId === targetScreenId) {
      return true; // Already on this screen
    }

    this.isTransitioning = true;
    const previousScreenInstance = this.activeScreenInstance;
    const previousScreenElement = this.activeScreenElement;
    const nextScreenModule = this.screens.get(targetScreenId);
    const previousScreenId = this.activeScreenId;

    // Set active screen attribute on body and root for contextual layout styling immediately
    document.body.setAttribute('data-active-screen', targetScreenId);
    this.uiRoot.setAttribute('data-active-screen', targetScreenId);

    // Unmount before mounting the next singleton screen. Several screens keep
    // module-level listeners, so mounting first would overwrite their cleanup
    // handles and leak input callbacks across transitions.
    this.activeScreenId = targetScreenId;
    if (previousScreenInstance && typeof previousScreenInstance.unmount === 'function') {
      try {
        previousScreenInstance.unmount();
      } catch (err) {
        console.error('[ScreenManager] Error unmounting previous screen:', err);
      }
    }

    // 1. Create container for the new screen
    const newScreenElement = document.createElement('div');
    newScreenElement.className = `screen-container screen-${targetScreenId}`;
    newScreenElement.setAttribute('data-screen-id', targetScreenId);

    // Mount next screen into its fresh DOM container
    try {
      if (typeof nextScreenModule.mount === 'function') {
        nextScreenModule.mount(newScreenElement, data, this);
      }
    } catch (err) {
      console.error(`[ScreenManager] Error mounting screen "${targetScreenId}":`, err);
      this.activeScreenId = previousScreenId;
      document.body.setAttribute('data-active-screen', previousScreenId || '');
      this.uiRoot.setAttribute('data-active-screen', previousScreenId || '');
      this.isTransitioning = false;
      return false;
    }

    this.uiRoot.appendChild(newScreenElement);

    // Force layout reflow so the transition animation plays smoothly
    void newScreenElement.offsetWidth;

    // 2. Animate out the previous screen if one exists
    if (previousScreenElement) {
      previousScreenElement.classList.remove('active');
      previousScreenElement.classList.add('screen-exit');
    }

    // 3. Animate in the new screen
    newScreenElement.classList.add('active');

    // 4. Wait for transition duration
    await new Promise(resolve => setTimeout(resolve, this.transitionDuration));

    // 5. Cleanup and unmount the previous screen
    if (previousScreenElement) {
      if (previousScreenElement.parentNode) {
        previousScreenElement.parentNode.removeChild(previousScreenElement);
      }
    }

    // 6. Update active tracking
    this.activeScreenId = targetScreenId;
    this.activeScreenInstance = nextScreenModule;
    this.activeScreenElement = newScreenElement;
    this.isTransitioning = false;

    // Set active screen attribute on body and root for contextual layout styling
    document.body.setAttribute('data-active-screen', targetScreenId);
    this.uiRoot.setAttribute('data-active-screen', targetScreenId);

    // Dispatch global screen change event
    window.dispatchEvent(new CustomEvent('screenchange', {
      detail: { screenId: targetScreenId, data }
    }));

    return true;
  }

  /**
   * Returns current active screen ID
   * @returns {string|null}
   */
  getActiveScreenId() {
    return this.activeScreenId;
  }
}
