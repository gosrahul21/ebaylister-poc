/**
 * Generates an IIFE expression that evaluates an element's center coordinates based on selectors, radio:first, or text: patterns.
 */
export function buildElementCoordsScript(selector: string): string {
  return `
    (function() {
      const sel = ${JSON.stringify(selector)};
      const selectors = sel.split(',').map(s => s.trim());
      let el = null;
      for (const s of selectors) {
        if (s === 'radio:first') {
          const modal = document.querySelector('[role="dialog"], .modal, .lightbox-dialog') || document.body;
          el = modal.querySelector('input[type="radio"], [role="radio"], label.radio-label, label') || modal.querySelector('label');
        } else if (s.startsWith('text:')) {
          const searchText = s.slice(5).trim().toLowerCase();
          const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span'));
          el = allElements.find(b => {
            const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            return txt.includes(searchText);
          });
        } else {
          el = document.querySelector(s);
        }
        if (el) break;
      }

      if (!el) return JSON.stringify({ found: false, error: 'No element matches "' + sel + '"' });

      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return JSON.stringify({ found: false, error: 'Element is hidden' });
      }

      const padW = rect.width * 0.2;
      const padH = rect.height * 0.2;
      const randX = rect.left + padW + Math.random() * Math.max(1, rect.width - 2 * padW);
      const randY = rect.top + padH + Math.random() * Math.max(1, rect.height - 2 * padH);

      return JSON.stringify({
        found: true,
        x: Math.round(randX),
        y: Math.round(randY)
      });
    })()
  `;
}
