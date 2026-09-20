/**
 * Reusable CDP helper that focuses a target element (by selector or ID)
 * and simulates human typing of the provided value via CDP.
 *
 * @param debuggee - The active chrome.debugger target tab
 * @param value - The string value to type
 * @param selectorOrId - CSS selector or element ID (defaults to active element if omitted)
 */
export async function cdpInjectHumanValue(
  debuggee: chrome.debugger.Debuggee,
  value: string,
  selectorOrId?: string
): Promise<boolean> {
  // 1. Focus the target element and reset existing value
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
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
    `
  });

  await new Promise(r => setTimeout(r, 60));

  // 2. Simulate human typing in micro-chunks with realistic jitter
  const chunkSize = Math.max(1, Math.min(4, Math.floor(value.length / 20)));
  for (let i = 0; i < value.length; i += chunkSize) {
    const chunk = value.slice(i, i + chunkSize);
    await chrome.debugger.sendCommand(debuggee, 'Input.insertText', { text: chunk });
    const delay = Math.floor(Math.random() * 20) + 15; // 15-35ms
    await new Promise(r => setTimeout(r, delay));
  }

  // 3. Dispatch change event to commit framework state
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        const target = ${JSON.stringify(selectorOrId ?? null)};
        const val = ${JSON.stringify(value)};
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
    `
  });

  return true;
}
