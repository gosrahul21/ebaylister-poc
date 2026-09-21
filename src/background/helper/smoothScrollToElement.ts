import { getElementCoords } from './getElementCoords';
import { buildSmoothScrollTargetScript } from '../injectors';

export async function smoothScrollToElement(
  debuggee: chrome.debugger.Debuggee,
  selector: string
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  const initialRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildSmoothScrollTargetScript(selector),
    returnByValue: true
  }) as { result?: { value?: string } };

  if (!initialRes.result?.value) return getElementCoords(debuggee, selector);
  const info = typeof initialRes.result.value === 'string' ? JSON.parse(initialRes.result.value) : initialRes.result.value;
  if (!info.found) return getElementCoords(debuggee, selector);

  const targetY = info.viewportHeight / 3;
  const totalDeltaY = info.top - targetY;

  if (Math.abs(totalDeltaY) > 60) {
    const steps = Math.min(25, Math.max(8, Math.floor(Math.abs(totalDeltaY) / 30)));
    const scrollPointX = Math.floor(info.viewportWidth / 2);
    const scrollPointY = Math.floor(info.viewportHeight / 2);

    for (let i = 0; i < steps; i++) {
      const progress = (i + 1) / steps;
      const easeFactor = 0.5 * (1 - Math.cos(Math.PI * progress));
      const prevProgress = i / steps;
      const prevEase = 0.5 * (1 - Math.cos(Math.PI * prevProgress));

      const stepDeltaY = Math.round((easeFactor - prevEase) * totalDeltaY);

      await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: scrollPointX,
        y: scrollPointY,
        deltaX: 0,
        deltaY: stepDeltaY
      });
      await new Promise(r => setTimeout(r, 16 + Math.floor(Math.random() * 15)));
    }

    await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 200)));
  }

  return getElementCoords(debuggee, selector);
}
