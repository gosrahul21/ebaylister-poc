import { buildElementCoordsScript } from '../injectors';

export async function getElementCoords(
  debuggee: chrome.debugger.Debuggee,
  selector: string
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  try {
    const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildElementCoordsScript(selector),
      returnByValue: true
    }) as { result?: { value?: string }; exceptionDetails?: { text?: string } };

    if (evaluatedResult.exceptionDetails) {
      return { found: false, error: evaluatedResult.exceptionDetails.text || 'DOM evaluation failed' };
    }

    const val = typeof evaluatedResult.result?.value === 'string'
      ? JSON.parse(evaluatedResult.result.value)
      : evaluatedResult.result?.value;

    return val ?? { found: false, error: 'Empty evaluation result' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, error: msg };
  }
}
