// import { cdpTypeHuman } from './cdpTypeHuman';
import { smoothScrollToElement } from './smoothScrollToElement';
import { buildIndexTargetCoordsScript } from '../injectors';
import { cdpInjectHumanValue } from './cdpInjectHumanValue';
import { moveCursorAndClick } from './moveCursorAndClick';

export interface Point {
  x: number;
  y: number;
}

export type InputTarget = string | number | Point;

/**
 * Reusable function that locates a target element (via CSS selector, index, or coordinates),
 * smooth-scrolls if needed, moves mouse using Bezier path simulation from current position,
 * clicks the element, and types text using CDP Input methods with full framework event dispatching.
 *
 * @param debuggee - The active chrome.debugger target tab.
 * @param target - Selector string (e.g. 'input[name="title"]'), index (number), or coordinates {x, y}.
 * @param text - The text value to input into the target element.
 * @param currentPos - Current mouse position {x, y} to initiate Bezier path from (default {x: 100, y: 100}).
 * @returns Object with found status, final target coordinates {x, y}, and optional error message.
 */
export async function cdpHumanInput(
  debuggee: chrome.debugger.Debuggee,
  target: InputTarget,
  text: string,
  currentPos: Point = { x: 100, y: 100 }
): Promise<{ found: boolean; x: number; y: number; error?: string }> {
  let targetX: number | undefined;
  let targetY: number | undefined;

  if (typeof target === 'object' && target !== null && 'x' in target && 'y' in target) {
    targetX = target.x;
    targetY = target.y;
  } else if (typeof target === 'string') {
    const coords = await smoothScrollToElement(debuggee, target);
    if (!coords.found || coords.x === undefined || coords.y === undefined) {
      return { found: false, x: currentPos.x, y: currentPos.y, error: coords.error || `Element "${target}" not found` };
    }
    targetX = coords.x;
    targetY = coords.y;
  } else if (typeof target === 'number') {
    const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildIndexTargetCoordsScript(target),
      returnByValue: true
    }) as { result?: { value?: string } };

    const info = evaluatedResult.result?.value ? JSON.parse(evaluatedResult.result.value) : { found: false };
    if (!info.found || info.x === undefined || info.y === undefined) {
      return { found: false, x: currentPos.x, y: currentPos.y, error: `Input index ${target} not found` };
    }
    targetX = info.x;
    targetY = info.y;
  }

  if (targetX === undefined || targetY === undefined) {
    return { found: false, x: currentPos.x, y: currentPos.y, error: 'Invalid target coordinates' };
  }

  // Bezier curve mouse movement
  await moveCursorAndClick(currentPos,  { x: targetX, y: targetY }, debuggee);

  // await cdpTypeHuman(debuggee, text, typeof target !== 'object' ? target : undefined);
  await cdpInjectHumanValue(debuggee, text, target as string);
  return { found: true, x: targetX, y: targetY };
}
