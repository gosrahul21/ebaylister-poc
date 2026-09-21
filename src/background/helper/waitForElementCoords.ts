import { getElementCoords } from './getElementCoords';

export async function waitForElementCoords(
  debuggee: chrome.debugger.Debuggee,
  selector: string,
  maxRetries = 25,
  intervalMs = 400
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  for (let i = 0; i < maxRetries; i++) {
    const cordinates = await getElementCoords(debuggee, selector);
    if (cordinates.found) return cordinates;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { found: false, error: `Element matching "${selector}" not found after retries` };
}
