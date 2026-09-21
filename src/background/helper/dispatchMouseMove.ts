export async function dispatchMouseMove(
  debuggee: chrome.debugger.Debuggee,
  x: number,
  y: number
): Promise<unknown> {
  return chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    button: 'none',
    clickCount: 0,
    modifiers: 0
  });
}
