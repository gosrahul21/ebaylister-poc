/**
 * Generates an IIFE expression string that locates an element by selector,
 * scrolls it into view, focuses it, and clicks it.
 *
 * @param selector - CSS selector string or element ID
 * @returns Executable JavaScript IIFE expression string
 */
export function elementClickScript(selector: string): string {
  return `
    (function() {
      const target = ${JSON.stringify(selector ?? null)};
      let element = target ? document.querySelector(target) : null;
      if (!element && target && target.startsWith('#')) {
        element = document.getElementById(target.replace(/^#/, ''));
      }
      if (!element) {
        element = document.activeElement;
      }

      if (!element) {
        return JSON.stringify({ found: false, error: 'Element not found: ' + target });
      }

      element.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });

      if (typeof element.focus === 'function') {
        element.focus();
      }

      element.click();

      return JSON.stringify({
        found: true,
        id: element.id || '',
        name: element.getAttribute('name') || '',
        text: (element.textContent || '').trim()
      });
    })()
  `;
}
