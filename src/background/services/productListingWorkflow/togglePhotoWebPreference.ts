import { buildTogglePhotoWebPrefScript } from '../../injectors';

export interface PhotoWebPreferenceResult {
  found: boolean;
  toggled?: boolean;
}

/**
 * Checks and toggles the "Upload photos from web" switch preference if it is unchecked.
 * Evaluates in the eBay page context via Chrome Debugger Runtime.evaluate.
 */
export async function togglePhotoWebPreference(
  debuggee: chrome.debugger.Debuggee
): Promise<PhotoWebPreferenceResult> {
  const toggleRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildTogglePhotoWebPrefScript(),
    returnByValue: true
  }) as { result?: { value?: string } };

  const toggleInfo: PhotoWebPreferenceResult = toggleRes.result?.value
    ? JSON.parse(toggleRes.result.value)
    : { found: false };

  return toggleInfo;
}
