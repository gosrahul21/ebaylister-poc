/**
 * Generates an IIFE expression that locates an element and queries its bounding rect and viewport metrics
 * to compute scroll delta.
 */
export function buildSmoothScrollTargetScript(selector: string): string {
  return `
    (function() {
      const sel = ${JSON.stringify(selector)};
      const selectors = sel.split(',').map(s => s.trim());
      let element = null;
      for (const s of selectors) {
        if (s === 'radio:first') {
          const modal = document.querySelector('[role="dialog"], .modal, .lightbox-dialog') || document.body;
          element = modal.querySelector('input[type="radio"], [role="radio"], label.radio-label, label') || modal.querySelector('label');
        } else if (s.startsWith('text:')) {
          const searchText = s.slice(5).trim().toLowerCase();
          const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span, h2, h3'));
          element = allElements.find(b => {
            const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            return txt.includes(searchText);
          });
        } else {
          element = document.querySelector(s);
        }
        if (element) break;
      }
      if (!element) return JSON.stringify({ found: false });
      const rect = element.getBoundingClientRect();
      return JSON.stringify({
        found: true,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      });
    })()
  `;
}
