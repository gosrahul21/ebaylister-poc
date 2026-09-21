/**
 * Generates an IIFE expression that searches for an element by ID, text: prefix, or selector,
 * scrolls it into view, and calculates safe randomized coordinates strictly within element bounds.
 */
export function buildTargetElementPositionScript(
  targetString: string,
  padRatioX: number,
  padRatioY: number,
  maxPadX: number,
  maxPadY: number
): string {
  return `
    (function() {
      const rawTarget = ${JSON.stringify(targetString)};
      const selectors = rawTarget.split(',').map(s => s.trim()).filter(Boolean);
      let el = null;

      for (const s of selectors) {
        // 1. Try finding by exact ID (stripping leading '#' if present)
        const idToTry = s.startsWith('#') ? s.slice(1) : s;
        el = document.getElementById(idToTry);
        if (el) break;

        // 2. Try text search (syntax: text:<content>)
        if (s.startsWith('text:')) {
          const searchText = s.slice(5).trim().toLowerCase();
          const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span, div'));
          el = allElements.find(b => {
            const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            return txt.includes(searchText);
          });
          if (el) break;
        }

        // 3. Try standard querySelector with error protection (handles special characters gracefully)
        try {
          el = document.querySelector(s);
        } catch (err) {
          // Ignore invalid selector syntax and continue to next fallback
        }
        if (el) break;
      }

      if (!el) {
        return JSON.stringify({ found: false, error: 'Target element not found: ' + rawTarget });
      }

      // Scroll into view to ensure coordinates match the current viewport
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        return JSON.stringify({ found: false, error: 'Target element is hidden or has zero dimensions' });
      }

      // Calculate safe randomized coordinates strictly within element bounds
      const padX = Math.max(6, Math.min(rect.width * ${padRatioX}, ${maxPadX}));
      const padY = Math.max(4, Math.min(rect.height * ${padRatioY}, ${maxPadY}));
      const randX = Math.round(rect.left + padX + Math.random() * Math.max(1, rect.width - 2 * padX));
      const randY = Math.round(rect.top + padY + Math.random() * Math.max(1, rect.height - 2 * padY));

      return JSON.stringify({
        found: true,
        x: randX,
        y: randY,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        id: el.id || '',
        tagName: el.tagName.toLowerCase()
      });
    })()
  `;
}
