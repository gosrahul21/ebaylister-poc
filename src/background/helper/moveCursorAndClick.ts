import { moveCursorToTargetElement, Position } from './moveCursorToTargetElement';
import { dispatchClick } from '../services/cdpHelper';

/**
 * Clubbed reusable function that moves the mouse cursor to a target position
 * using a human Bezier curve, clicks the target coordinates, and returns the updated position.
 *
 * @param currentPos - Starting position {x, y}
 * @param targetPos - Target position {x, y} to navigate to and click
 * @param debuggee - Active Chrome debugger instance
 * @param description - Optional description to log
 * @returns Updated cursor position {x, y}
 */
export async function moveCursorAndClick(
  currentPos: Position,
  targetPos: Position,
  debuggee: chrome.debugger.Debuggee,
  description?: string
): Promise<Position> {
  if (description) {
    console.log(`[CDP eBay Automator] ${description}`);
  }
  await moveCursorToTargetElement(currentPos, targetPos, debuggee);
  await dispatchClick(debuggee, targetPos.x, targetPos.y);
  return { x: targetPos.x, y: targetPos.y };
}
