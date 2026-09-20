import { Position } from './moveCursorToTargetElement';

export interface TargetElementPosition {
  found: boolean;
  x?: number;
  y?: number;
  pos?: Position;
  width?: number;
  height?: number;
  id?: string;
  tagName?: string;
  error?: string;
}

export interface GetTargetPositionOptions {
  paddingRatioX?: number;
  paddingRatioY?: number;
  maxPaddingX?: number;
  maxPaddingY?: number;
}

/**
 * Reusable helper that locates a target element in the DOM by selector, ID, or text,
 * scrolls it into view, and calculates a randomized (x, y) coordinate strictly inside
 * the element's bounding box with inner padding to ensure reliable, human-like clicks.
 *
 * Supports:
 *  - Raw IDs (even with special characters like '@' or '[' / ']')
 *  - CSS selectors (including comma-separated lists)
 *  - "text:<search text>" queries for finding elements by visible label/content
 *
 * @param debuggee - Active chrome.debugger instance
 * @param selectorOrId - CSS selector, element ID, or comma-separated selectors
 * @param options - Optional padding ratios to adjust click bounds
 */
export async function getTargetElementPosition(
  debuggee: chrome.debugger.Debuggee,
  selectorOrId: string | string[],
  options?: GetTargetPositionOptions
): Promise<TargetElementPosition> {
  const padRatioX = options?.paddingRatioX ?? 0.15;
  const padRatioY = options?.paddingRatioY ?? 0.2;
  const maxPadX = options?.maxPaddingX ?? 20;
  const maxPadY = options?.maxPaddingY ?? 10;

  const targetString = Array.isArray(selectorOrId) ? selectorOrId.join(', ') : selectorOrId;

  try {
    const evalRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
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
      `,
      returnByValue: true
    }) as { result?: { value?: string }; exceptionDetails?: { text?: string } };

    if (evalRes.exceptionDetails) {
      return { found: false, error: evalRes.exceptionDetails.text || 'DOM evaluation failed' };
    }

    const info: TargetElementPosition = evalRes.result?.value
      ? JSON.parse(evalRes.result.value)
      : { found: false, error: 'No return value from Runtime.evaluate' };

    if (info.found && info.x !== undefined && info.y !== undefined) {
      info.pos = { x: info.x, y: info.y };
    }

    return info;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, error: msg };
  }
}
