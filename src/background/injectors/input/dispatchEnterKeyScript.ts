/**
 * Generates an IIFE expression that focuses an element by CSS selector and dispatches Enter key events (keydown).
 */
export function buildDispatchEnterKeyScript(cssSelector: string): string {
  return `
    (function() {
      const sel = ${JSON.stringify(cssSelector)};
      let element = document.querySelector(sel);

      if (!element) {
        return JSON.stringify({ success: false, error: 'Element not found: ' + sel });
      }

      element.focus();

      const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
      element.dispatchEvent(enterDown);
      const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
      element.dispatchEvent(enterUp);

      return JSON.stringify({ success: true });
    })()
  `;
}
