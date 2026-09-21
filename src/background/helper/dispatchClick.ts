export async function dispatchClick(
  debuggee: chrome.debugger.Debuggee,
  x: number,
  y: number
): Promise<void> {
  await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
    modifiers: 0
  });
  await new Promise(r => setTimeout(r, 65 + Math.floor(Math.random() * 60)));
  await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
    modifiers: 0
  });
}
