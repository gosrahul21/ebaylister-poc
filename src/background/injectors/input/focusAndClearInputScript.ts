/**
 * Generates an IIFE expression to locate the target input element (by selector or index),
 * focus it, and clear previous content while dispatching input events.
 */
export function buildFocusAndClearInputScript(selectorOrIndex?: string | number): string {
  return `
    (function() {
      let element = null;
      const arg = ${JSON.stringify(selectorOrIndex ?? null)};
      if (typeof arg === 'string' && arg) {
        element = document.querySelector(arg);
      } else if (typeof arg === 'number') {
        // 1. Find by exact ID string pattern: s0-...@PHOTOS...[arg]-se-textbox
        const allInputs = Array.from(document.querySelectorAll('input'));
        element = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
        
        // 2. Try .url-row container
        if (!element) {
          const urlRows = Array.from(document.querySelectorAll('.url-row'));
          if (urlRows[arg]) element = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
        }
        
        // 3. Try all photo textbox control inputs on page/modal
        if (!element) {
          const allTextboxInputs = Array.from(document.querySelectorAll('.url-row input, input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, .se-textbox--container input, span.se-textbox input, input[type="text"]'));
          const visible = allTextboxInputs.filter(inp => {
            const style = window.getComputedStyle(inp);
            const rect = inp.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
          });
          element = visible[arg] || allTextboxInputs[arg] || allTextboxInputs[allTextboxInputs.length - 1];
        }
      }
      if (!element) element = document.activeElement;

      if (element && element !== document.body) {
        element.focus();
        if ('value' in element) {
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    })()
  `;
}
