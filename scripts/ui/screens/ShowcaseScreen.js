/**
 * ShowcaseScreen — Component Demo / UI Kit Testing View
 * Renders all reusable console UI components for isolated testing.
 */

import {
  createConsoleButton,
  createPanel,
  createProgressBar,
  createToggle,
  createModal
} from '../components.js';

export const ShowcaseScreen = {
  _modal: null,
  _gaugeIntervals: [],

  mount(container, data, router) {
    // Scrollable showcase wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'showcase-grid';
    wrapper.style.overflowY = 'auto';
    wrapper.style.maxHeight = '90vh';
    wrapper.style.padding = '20px 12px';

    // ── Title ──
    const title = document.createElement('h1');
    title.className = 'hud-title';
    title.style.fontSize = 'clamp(1.4rem, 4vw, 2rem)';
    title.textContent = 'UI KIT SHOWCASE';
    wrapper.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'hud-subtitle';
    subtitle.textContent = 'COMPONENT TESTING // CONSOLE KIT V1.0';
    wrapper.appendChild(subtitle);

    // ═══════════════════════════════════════════════
    // SECTION 1: BUTTONS
    // ═══════════════════════════════════════════════
    const btnSection = this._createSection('CONSOLE BUTTONS');

    const btnRow = document.createElement('div');
    btnRow.className = 'showcase-row';

    btnRow.appendChild(createConsoleButton({
      label: 'DEFAULT', icon: '◆',
      onClick: () => console.log('Default clicked')
    }));
    btnRow.appendChild(createConsoleButton({
      label: 'PRIMARY', icon: '▶', variant: 'primary',
      onClick: () => console.log('Primary clicked')
    }));
    btnRow.appendChild(createConsoleButton({
      label: 'DANGER', icon: '⚠', variant: 'danger',
      onClick: () => console.log('Danger clicked')
    }));
    btnRow.appendChild(createConsoleButton({
      label: 'AMBER', icon: '★', variant: 'amber',
      onClick: () => console.log('Amber clicked')
    }));
    btnRow.appendChild(createConsoleButton({
      label: 'SECONDARY', variant: 'secondary',
      onClick: () => console.log('Secondary clicked')
    }));

    btnSection.appendChild(btnRow);

    // Small buttons row
    const btnRowSm = document.createElement('div');
    btnRowSm.className = 'showcase-row';
    btnRowSm.appendChild(createConsoleButton({
      label: 'SM PRIMARY', variant: 'primary', size: 'sm',
      onClick: () => console.log('Small primary')
    }));
    btnRowSm.appendChild(createConsoleButton({
      label: 'SM DANGER', variant: 'danger', size: 'sm',
      onClick: () => console.log('Small danger')
    }));
    btnRowSm.appendChild(createConsoleButton({
      label: 'SM AMBER', variant: 'amber', size: 'sm',
      onClick: () => console.log('Small amber')
    }));
    btnSection.appendChild(btnRowSm);
    wrapper.appendChild(btnSection);

    // ═══════════════════════════════════════════════
    // SECTION 2: PROGRESS BARS / GAUGES
    // ═══════════════════════════════════════════════
    const gaugeSection = this._createSection('PROGRESS BARS / GAUGES');
    const gaugeContainer = document.createElement('div');
    gaugeContainer.className = 'showcase-gauges';

    const hull = createProgressBar({ label: 'HULL', value: 82, max: 100, color: 'cyan' });
    const shield = createProgressBar({ label: 'SHIELD', value: 64, max: 100, color: 'green' });
    const heat = createProgressBar({ label: 'HEAT', value: 35, max: 100, color: 'amber' });
    const danger = createProgressBar({ label: 'DANGER', value: 90, max: 100, color: 'red' });
    const charge = createProgressBar({ label: 'CHARGE', value: 0, max: 100, color: 'cyan', animated: true });

    gaugeContainer.appendChild(hull.element);
    gaugeContainer.appendChild(shield.element);
    gaugeContainer.appendChild(heat.element);
    gaugeContainer.appendChild(danger.element);
    gaugeContainer.appendChild(charge.element);
    gaugeSection.appendChild(gaugeContainer);
    wrapper.appendChild(gaugeSection);

    // Animate the charge bar as a live demo
    let chargeVal = 0;
    let chargeDir = 1;
    const chargeInterval = setInterval(() => {
      chargeVal += chargeDir * 1.5;
      if (chargeVal >= 100) { chargeVal = 100; chargeDir = -1; }
      if (chargeVal <= 0) { chargeVal = 0; chargeDir = 1; }
      charge.setValue(chargeVal);
    }, 50);
    this._gaugeIntervals.push(chargeInterval);

    // ═══════════════════════════════════════════════
    // SECTION 3: TOGGLES
    // ═══════════════════════════════════════════════
    const toggleSection = this._createSection('TOGGLE SWITCHES');
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'showcase-gauges';

    const screenShake = createToggle({
      label: 'SCREEN SHAKE',
      checked: true,
      onChange: (val) => console.log('Screen shake:', val)
    });
    const scanlines = createToggle({
      label: 'CRT SCANLINES',
      checked: false,
      onChange: (val) => console.log('CRT scanlines:', val)
    });
    const autoFire = createToggle({
      label: 'AUTO-FIRE',
      checked: false,
      onChange: (val) => console.log('Auto fire:', val)
    });

    toggleContainer.appendChild(screenShake.element);
    toggleContainer.appendChild(scanlines.element);
    toggleContainer.appendChild(autoFire.element);
    toggleSection.appendChild(toggleContainer);
    wrapper.appendChild(toggleSection);

    // ═══════════════════════════════════════════════
    // SECTION 4: PANELS
    // ═══════════════════════════════════════════════
    const panelSection = this._createSection('PANEL VARIANTS');

    const defaultPanel = createPanel({
      title: 'DEFAULT PANEL',
      badge: 'CYAN',
      children: '<p class="hud-desc" style="padding: 8px 0;">Standard cockpit console panel with cyan glow border, backdrop blur, and top-edge highlight beam.</p>'
    });
    panelSection.appendChild(defaultPanel);

    const amberPanel = createPanel({
      title: 'AMBER PANEL',
      badge: 'WARNING',
      variant: 'amber',
      children: '<p class="hud-desc" style="padding: 8px 0;">Amber variant used for caution alerts, weapon overheats, and warning states. Warm glow aesthetic.</p>'
    });
    panelSection.appendChild(amberPanel);
    wrapper.appendChild(panelSection);

    // ═══════════════════════════════════════════════
    // SECTION 5: MODAL
    // ═══════════════════════════════════════════════
    const modalSection = this._createSection('MODAL DIALOG');
    const modalRow = document.createElement('div');
    modalRow.className = 'showcase-row';

    this._modal = createModal({
      title: 'CONFIRM ACTION',
      content: 'Are you sure you want to deploy to <strong style="color: var(--glow-cyan);">Sector 7-G</strong>? This mission has a high threat rating. All loadout changes will be locked.',
      buttons: [
        { label: 'CANCEL', variant: 'secondary', onClick: () => { this._modal.close(); } },
        { label: 'DEPLOY', variant: 'primary', icon: '▶', onClick: () => { this._modal.close(); console.log('Deploy confirmed'); } }
      ],
      onClose: () => console.log('Modal closed')
    });

    const openModalBtn = createConsoleButton({
      label: 'OPEN MODAL',
      icon: '◎',
      variant: 'primary',
      onClick: () => this._modal.open()
    });
    modalRow.appendChild(openModalBtn);
    modalSection.appendChild(modalRow);
    wrapper.appendChild(modalSection);

    // ═══════════════════════════════════════════════
    // SECTION 6: STARFIELD PARALLAX & WARP
    // ═══════════════════════════════════════════════
    const starfieldSection = this._createSection('STARFIELD & WARP ACCELERATION');
    const starfieldRow = document.createElement('div');
    starfieldRow.className = 'showcase-row';

    starfieldRow.appendChild(createConsoleButton({
      label: 'NORMAL DRIFT (1x)',
      icon: '✦',
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        if (window.__starfield) window.__starfield.setSpeed(1.0);
      }
    }));

    starfieldRow.appendChild(createConsoleButton({
      label: 'FAST CRUISE (3x)',
      icon: '▲',
      variant: 'primary',
      size: 'sm',
      onClick: () => {
        if (window.__starfield) window.__starfield.setSpeed(3.0);
      }
    }));

    starfieldRow.appendChild(createConsoleButton({
      label: 'WARP JUMP (BURST)',
      icon: '⚡',
      variant: 'amber',
      size: 'sm',
      onClick: () => {
        if (window.__starfield) window.__starfield.triggerWarp(7.0, 2200);
      }
    }));

    starfieldSection.appendChild(starfieldRow);
    wrapper.appendChild(starfieldSection);

    // ═══════════════════════════════════════════════
    // BACK BUTTON
    // ═══════════════════════════════════════════════
    const footer = document.createElement('div');
    footer.style.marginTop = '12px';
    footer.style.paddingBottom = '24px';
    footer.appendChild(createConsoleButton({
      label: 'BACK TO MENU',
      icon: '◀',
      variant: 'secondary',
      onClick: () => router && router.show('landing')
    }));
    wrapper.appendChild(footer);

    // Append wrapper + modal overlay to container
    container.appendChild(wrapper);
    container.appendChild(this._modal.element);
  },

  unmount() {
    // Cleanup intervals
    this._gaugeIntervals.forEach(id => clearInterval(id));
    this._gaugeIntervals = [];
    this._modal = null;
  },

  /**
   * Helper to create a labeled showcase section
   * @param {string} label
   * @returns {HTMLDivElement}
   */
  _createSection(label) {
    const section = document.createElement('div');
    section.className = 'showcase-section';

    const titleEl = document.createElement('div');
    titleEl.className = 'showcase-section-title';
    titleEl.textContent = label;
    section.appendChild(titleEl);

    return section;
  }
};
