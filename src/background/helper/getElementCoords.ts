import { buildElementCoordsScript } from '../injectors';

export async function getElementCoords(
  debuggee: chrome.debugger.Debuggee,
  selector: string
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  try {
    const evalResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildElementCoordsScript(selector),
      returnByValue: true
    }) as { result?: { value?: string }; exceptionDetails?: { text?: string } };

    if (evalResult.exceptionDetails) {
      return { found: false, error: evalResult.exceptionDetails.text || 'DOM evaluation failed' };
    }

    const val = typeof evalResult.result?.value === 'string'
      ? JSON.parse(evalResult.result.value)
      : evalResult.result?.value;

    return val ?? { found: false, error: 'Empty evaluation result' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, error: msg };
  }
}
