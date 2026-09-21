import { moveCursorToTargetElement } from './moveCursorToTargetElement';
import { dispatchClick } from './dispatchClick';
import { buildClickOutsideModalScript } from '../injectors';

export async function clickOutsideModal(
  debuggee: chrome.debugger.Debuggee,
  startX: number,
  startY: number
): Promise<{ x: number; y: number }> {
  try {
    const coordsRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildClickOutsideModalScript(),
      returnByValue: true
    }) as { result?: { value?: string } };

    const info = coordsRes.result?.value ? JSON.parse(coordsRes.result.value) : { found: false };
    if (info.found) {
      console.log(`[CDP Helper] Clicking outside modal at (${info.x}, ${info.y})`);
      await moveCursorToTargetElement({ x: startX, y: startY }, { x: info.x, y: info.y }, debuggee);
      await dispatchClick(debuggee, info.x, info.y);
      return { x: info.x, y: info.y };
    }
  } catch (err) {
    console.warn('[CDP Helper] Failed to click outside modal:', err);
  }
  return { x: startX, y: startY };
}
