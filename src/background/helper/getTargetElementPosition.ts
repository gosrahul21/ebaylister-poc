import { Position } from './moveCursorToTargetElement';
import { buildTargetElementPositionScript } from '../injectors';

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
  paddingRatioX?: number; // 0.15 = 15% inner padding from left/right edges
  paddingRatioY?: number; // 0.20 = 20% inner padding from top/bottom edges
  maxPaddingX?: number;   // default max inner padding 20px
  maxPaddingY?: number;   // default max inner padding 10px
}

/**
 * Reusable function that evaluates the page DOM via CDP to find an element,
 * scroll it into view, and calculate safe inner coordinates.
 *
 * Supports:
 *  - Raw IDs (e.g. "gh-btn" or "#gh-btn")
 *  - Standard CSS selectors (e.g. 'button.btn--primary')
 *  - Comma-separated fallback candidates (tried sequentially)
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
    const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildTargetElementPositionScript(targetString, padRatioX, padRatioY, maxPadX, maxPadY),
      returnByValue: true
    }) as { result?: { value?: string }; exceptionDetails?: { text?: string } };

    if (evaluatedResult.exceptionDetails) {
      return { found: false, error: evaluatedResult.exceptionDetails.text || 'DOM evaluation failed' };
    }

    const info: TargetElementPosition = evaluatedResult.result?.value
      ? JSON.parse(evaluatedResult.result.value)
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
