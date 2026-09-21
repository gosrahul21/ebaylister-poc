import { generateHumanPath } from '@/utils/bezier';
import { dispatchMouseMove } from './dispatchMouseMove';

export interface Position {
  x: number;
  y: number;
}

/**
 * Move mouse cursor from current position to target element position using human Bezier curve
 */
export const moveCursorToTargetElement = async (
  currentPosition: Position,
  targetPosition: Position,
  debuggee: chrome.debugger.Debuggee
): Promise<void> => {
  const path = generateHumanPath(currentPosition.x, currentPosition.y, targetPosition.x, targetPosition.y);
  for (const point of path) {
    await dispatchMouseMove(debuggee, point.x, point.y);
    await new Promise(r => setTimeout(r, point.delay));
  }
};