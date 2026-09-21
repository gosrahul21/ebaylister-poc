/**
 * Generates an IIFE expression that focuses the target input element and resets its value.
 */
export function buildResetInputValueScript(selectorOrId?: string): string {
  return `
    (function() {
      const target = ${JSON.stringify(selectorOrId ?? null)};
      let element = null;
      if (typeof target === 'string' && target) {
        const id = target.startsWith('#') ? target.slice(1) : target;
        element = document.getElementById(id);
        if (!element) {
          try {
            element = document.querySelector(target);
          } catch (e) {}
        }
      }
      if (!element) {
        element = document.activeElement;
      }

      if (element && 'value' in element) {
        element.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(element, '');
        } else {
          element.value = '';
        }
        element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
    })()
  `;
}

/**
 * Generates an IIFE expression that sets the final input value and dispatches input & change events.
 */
export function buildCommitInputValueScript(selectorOrId?: string, value?: string): string {
  return `
    (function() {
      const target = ${JSON.stringify(selectorOrId ?? null)};
      const val = ${JSON.stringify(value ?? '')};
      let element = null;
      if (typeof target === 'string' && target) {
        const id = target.startsWith('#') ? target.slice(1) : target;
        element = document.getElementById(id);
        if (!element) {
          try {
            element = document.querySelector(target);
          } catch (e) {}
        }
      }
      if (!element) {
        element = document.activeElement;
      }

      if (element && 'value' in element) {
        if (element.value !== val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(element, val);
          else element.value = val;
          element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
        element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
    })()
  `;
}
