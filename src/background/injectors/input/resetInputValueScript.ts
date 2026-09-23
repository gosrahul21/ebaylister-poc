/**
 * Generates an IIFE expression that focuses the target input element and resets its value.
 */
export function buildResetInputValueScript(cssSelector?: string): string {
  return `
    (function() {
      const target = ${JSON.stringify(cssSelector ?? null)};
      let element = target ? document.querySelector(target) : null;
      if (!element && target && target.startsWith('#')) {
        element = document.getElementById(target.replace(/^#/, ''));
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
        return { success: true };
      }
      return { error: true };
    })()
  `;
}
