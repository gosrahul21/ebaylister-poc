/**
 * Generates an IIFE expression that sets the final input value and dispatches input & change events.
 */
export function buildCommitInputValueScript(cssSelector?: string, value?: string): string {
  return `
    (function() {
      const target = ${JSON.stringify(cssSelector ?? null)};
      const val = ${JSON.stringify(value ?? '')};
      let element = target ? document.querySelector(target) : null;
      if (!element && target && target.startsWith('#')) {
        element = document.getElementById(target.replace(/^#/, ''));
      }
      if (!element) {
        element = document.activeElement;
      }

      if (element) {
        element.focus();

        if ('value' in element) {
          if (element.value !== val) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            if (setter) setter.call(element, val);
            else element.value = val;
            element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        } else if (element.isContentEditable) {
          if (element.innerText !== val) {
            element.innerText = val;
            element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
        }
      }

    })()
  `;
}
