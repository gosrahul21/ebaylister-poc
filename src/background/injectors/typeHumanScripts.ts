/**
 * Generates an IIFE expression to locate the target input element (by selector or index),
 * focus it, and clear previous content while dispatching input events.
 */
export function buildFocusAndClearInputScript(selectorOrIndex?: string | number): string {
  return `
    (function() {
      let el = null;
      const arg = ${JSON.stringify(selectorOrIndex ?? null)};
      if (typeof arg === 'string' && arg) {
        el = document.querySelector(arg);
      } else if (typeof arg === 'number') {
        // 1. Find by exact ID string pattern: s0-...@PHOTOS...[arg]-se-textbox
        const allInputs = Array.from(document.querySelectorAll('input'));
        el = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
        
        // 2. Try .url-row container
        if (!el) {
          const urlRows = Array.from(document.querySelectorAll('.url-row'));
          if (urlRows[arg]) el = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
        }
        
        // 3. Try all photo textbox control inputs on page/modal
        if (!el) {
          const allTextboxInputs = Array.from(document.querySelectorAll('.url-row input, input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, .se-textbox--container input, span.se-textbox input, input[type="text"]'));
          const visible = allTextboxInputs.filter(inp => {
            const style = window.getComputedStyle(inp);
            const rect = inp.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
          });
          el = visible[arg] || allTextboxInputs[arg] || allTextboxInputs[allTextboxInputs.length - 1];
        }
      }
      if (!el) el = document.activeElement;

      if (el && el !== document.body) {
        el.focus();
        if ('value' in el) {
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    })()
  `;
}

/**
 * Generates an IIFE expression to ensure the typed value is reflected and framework listeners
 * (input, change, blur) fire properly.
 */
export function buildTriggerInputEventsScript(
  selectorOrIndex?: string | number,
  text?: string
): string {
  return `
    (function() {
      let el = null;
      const arg = ${JSON.stringify(selectorOrIndex ?? null)};
      if (typeof arg === 'string' && arg) {
        el = document.querySelector(arg);
      } else if (typeof arg === 'number') {
        const allInputs = Array.from(document.querySelectorAll('input'));
        el = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
        if (!el) {
          const urlRows = Array.from(document.querySelectorAll('.url-row'));
          if (urlRows[arg]) el = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
        }
        if (!el) {
          const allTextboxInputs = Array.from(document.querySelectorAll('.url-row input, input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, .se-textbox--container input, span.se-textbox input, input[type="text"]'));
          const visible = allTextboxInputs.filter(inp => {
            const style = window.getComputedStyle(inp);
            const rect = inp.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
          });
          el = visible[arg] || allTextboxInputs[arg] || allTextboxInputs[allTextboxInputs.length - 1];
        }
      }
      if (!el) el = document.activeElement;

      if (el && 'value' in el) {
        if (!el.value || el.value !== ${JSON.stringify(text ?? '')}) {
          el.value = ${JSON.stringify(text ?? '')};
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    })()
  `;
}
