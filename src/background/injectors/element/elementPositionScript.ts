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
      let element = null;

      for (const s of selectors) {
        // 1. Try finding by exact ID (stripping leading '#' if present)
        const idToTry = s.startsWith('#') ? s.slice(1) : s;
        element = document.getElementById(idToTry);
        if (element) break;

        // 2. Try text search (syntax: text:<content>)
        if (s.startsWith('text:')) {
          const searchText = s.slice(5).trim().toLowerCase();
          const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span, div'));
          element = allElements.find(b => {
            const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            return txt.includes(searchText);
          });
          if (element) break;
        }

        // 3. Try standard querySelector with error protection (handles special characters gracefully)
        try {
          element = document.querySelector(s);
        } catch (err) {
          // Ignore invalid selector syntax and continue to next fallback
        }
        if (element) break;
      }

      if (!element) {
        return JSON.stringify({ found: false, error: 'Target element not found: ' + rawTarget });
      }

      // Scroll into view to ensure coordinates match the current viewport
      element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();

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
        id: element.id || '',
        tagName: element.tagName.toLowerCase()
      });
    })()
  `;
}
