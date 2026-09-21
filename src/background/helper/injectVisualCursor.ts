import { buildVisualCursorScript } from '../injectors';

export async function injectVisualCursor(debuggee: chrome.debugger.Debuggee): Promise<void> {
  try {
    await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildVisualCursorScript()
    });
  } catch {
    // Non-critical
  }
}
