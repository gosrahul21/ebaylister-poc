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
      let element = null;
      const arg = ${JSON.stringify(selectorOrIndex ?? null)};
      if (typeof arg === 'string' && arg) {
        element = document.querySelector(arg);
      } else if (typeof arg === 'number') {
        const allInputs = Array.from(document.querySelectorAll('input'));
        element = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
        if (!element) {
          const urlRows = Array.from(document.querySelectorAll('.url-row'));
          if (urlRows[arg]) element = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
        }
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

      if (element && 'value' in element) {
        if (!element.value || element.value !== ${JSON.stringify(text ?? '')}) {
          element.value = ${JSON.stringify(text ?? '')};
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    })()
  `;
}
