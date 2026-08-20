/**
 * UI Component Library for Space Shooter
 * Reusable factory functions for DOM elements with Web Audio feedback.
 */

import { soundManager } from '../audio/index.js';

/**
 * Creates a console-styled button.
 * @param {Object} options
 * @param {string} options.label - Button text.
 * @param {string} [options.icon] - Emoji/icon prefix.
 * @param {'primary'|'secondary'|'danger'|'amber'} [options.variant] - Button variant.
 * @param {'sm'|'md'|'lg'} [options.size='md'] - Button size.
 * @param {string} [options.subtext] - Secondary description line.
 * @param {function} [options.onClick] - Click callback.
 * @returns {HTMLButtonElement} The created button element.
 */
export function createConsoleButton({ label, icon, variant, size = 'md', subtext, onClick }) {
  const btn = document.createElement('button');
  btn.className = 'console-btn';

  if (variant) {
    btn.classList.add(`btn-${variant}`);
  }

  if (size === 'sm') {
    btn.classList.add('btn-sm');
  } else if (size === 'lg') {
    btn.classList.add('btn-lg');
  }

  let innerText = label;
  if (icon) {
    innerText = `${icon} ${label}`;
  }

  const labelSpan = document.createElement('span');
  labelSpan.textContent = innerText;
  btn.appendChild(labelSpan);

  if (subtext) {
    const subSpan = document.createElement('span');
    subSpan.className = 'btn-subtext';
    subSpan.textContent = subtext;
    btn.appendChild(subSpan);
  }

  // Auditory feedback
  btn.addEventListener('mouseenter', () => {
    soundManager.playHover();
  });

  btn.addEventListener('click', (e) => {
    soundManager.playClick();
    window.dispatchEvent(new CustomEvent('ui:click'));
    if (typeof onClick === 'function') {
      onClick(e);
    }
  });

  return btn;
}

/**
 * Creates a console panel container.
 * @param {Object} options
 * @param {string} [options.title] - Panel heading.
 * @param {string} [options.badge] - Badge text in top right.
 * @param {HTMLElement[]|string} [options.children] - Child elements or HTML string.
 * @param {'default'|'amber'|'modal'} [options.variant='default'] - Panel variant.
 * @returns {HTMLDivElement} The created panel element.
 */
export function createPanel({ title, badge, children, variant = 'default' }) {
  const panel = document.createElement('div');
  panel.className = 'console-panel';

  if (variant && variant !== 'default') {
    panel.classList.add(variant === 'modal' ? 'modal-panel' : `panel-${variant}`);
  }

  if (title) {
    const header = document.createElement('div');
    header.className = 'screen-header';

    const heading = document.createElement('div');
    heading.className = 'hud-heading';
    heading.textContent = title;
    header.appendChild(heading);

    if (badge) {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'hud-badge';
      badgeEl.textContent = badge;
      header.appendChild(badgeEl);
    }

    panel.appendChild(header);
  }

  if (children) {
    if (typeof children === 'string') {
      panel.insertAdjacentHTML('beforeend', children);
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (child instanceof HTMLElement) {
          panel.appendChild(child);
        }
      });
    } else if (children instanceof HTMLElement) {
      panel.appendChild(children);
    }
  }

  return panel;
}

/**
 * Creates a progress bar component.
 * @param {Object} options
 * @param {string} options.label - Gauge label.
 * @param {number} options.value - Current value.
 * @param {number} [options.max=100] - Maximum value.
 * @param {'cyan'|'amber'|'red'|'green'} [options.color='cyan'] - Color of the fill.
 * @param {boolean} [options.showValue=true] - Whether to show text value.
 * @param {boolean} [options.animated=true] - Whether the fill pulses.
 * @returns {Object} { element: HTMLDivElement, setValue: function }
 */
export function createProgressBar({ label, value, max = 100, color = 'cyan', showValue = true, animated = true }) {
  const container = document.createElement('div');
  container.className = 'progress-bar-container';

  const labelEl = document.createElement('span');
  labelEl.className = 'progress-label';
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const track = document.createElement('div');
  track.className = 'progress-track';

  const fill = document.createElement('div');
  fill.className = 'progress-fill';
  if (color) fill.classList.add(`fill-${color}`);
  if (animated) fill.classList.add('animated-fill');

  track.appendChild(fill);
  container.appendChild(track);

  let valueEl = null;
  if (showValue) {
    valueEl = document.createElement('span');
    valueEl.className = 'progress-value';
    container.appendChild(valueEl);
  }

  function setValue(newVal) {
    const clamped = Math.max(0, Math.min(newVal, max));
    const percentage = (clamped / max) * 100;
    fill.style.width = `${percentage}%`;

    if (showValue && valueEl) {
      valueEl.textContent = `${Math.round(clamped)} / ${max}`;
    }
  }

  setValue(value);

  return { element: container, setValue };
}

/**
 * Creates a toggle switch.
 * @param {Object} options
 * @param {string} options.label - Toggle label text.
 * @param {boolean} [options.checked=false] - Initial state.
 * @param {function} [options.onChange] - Callback when toggled.
 * @returns {Object} { element: HTMLDivElement, getValue: function, setValue: function }
 */
export function createToggle({ label, checked = false, onChange }) {
  let isChecked = checked;

  const container = document.createElement('div');
  container.className = 'toggle-container';

  const labelEl = document.createElement('span');
  labelEl.className = 'toggle-label';
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const switchEl = document.createElement('div');
  switchEl.className = 'toggle-switch';
  if (isChecked) {
    container.classList.add('toggle-active');
  }

  const knob = document.createElement('div');
  knob.className = 'toggle-knob';
  switchEl.appendChild(knob);

  container.appendChild(switchEl);

  function setValue(bool) {
    isChecked = bool;
    if (isChecked) {
      container.classList.add('toggle-active');
    } else {
      container.classList.remove('toggle-active');
    }
  }

  function getValue() {
    return isChecked;
  }

  container.addEventListener('mouseenter', () => {
    soundManager.playHover();
  });

  container.addEventListener('click', () => {
    const nextVal = !isChecked;
    setValue(nextVal);
    soundManager.playToggle(nextVal);
    window.dispatchEvent(new CustomEvent('ui:click'));
    if (typeof onChange === 'function') {
      onChange(nextVal);
    }
  });

  return { element: container, getValue, setValue };
}

/**
 * Creates a modal overlay.
 * @param {Object} options
 * @param {string} options.title - Modal title.
 * @param {string|HTMLElement} options.content - Modal content.
 * @param {Array<{label: string, variant: string, onClick: function}>} [options.buttons] - Array of buttons.
 * @param {function} [options.onClose] - Callback when closed.
 * @returns {Object} { element: HTMLDivElement, open: function, close: function }
 */
export function createModal({ title, content, buttons = [], onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const panel = createPanel({ title, variant: 'modal' });

  // Add close button to header
  const header = panel.querySelector('.screen-header');
  if (header) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('mouseenter', () => soundManager.playHover());
    closeBtn.addEventListener('click', () => {
      soundManager.playClick();
      close();
    });
    header.appendChild(closeBtn);
  }

  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  panel.appendChild(body);

  if (buttons && buttons.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    buttons.forEach(btnOptions => {
      const btn = createConsoleButton(btnOptions);
      footer.appendChild(btn);
    });

    panel.appendChild(footer);
  }

  overlay.appendChild(panel);

  function close() {
    overlay.classList.remove('modal-visible');
    if (typeof onClose === 'function') {
      onClose();
    }
  }

  function open() {
    soundManager.playClick();
    overlay.classList.add('modal-visible');
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      soundManager.playClick();
      close();
    }
  });

  return { element: overlay, open, close };
}
