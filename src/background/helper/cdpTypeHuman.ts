import {
  buildFocusAndClearInputScript,
  buildTriggerInputEventsScript
} from '../injectors';

/**
 * Types text into the focused element using CDP Input methods (Input.dispatchKeyEvent / Input.insertText)
 * to simulate authentic human keyboard entry and properly trigger React/eBay state events.
 */
export async function cdpTypeHuman(
  debuggee: chrome.debugger.Debuggee,
  text: string,
  selectorOrIndex?: string | number
): Promise<void> {
  // 1. Focus the target element in DOM and clear any previous content
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildFocusAndClearInputScript(selectorOrIndex)
  });

  await new Promise(r => setTimeout(r, 60));

  // 2. Insert text via CDP Input.insertText (triggers native browser key & IME input events)
  await chrome.debugger.sendCommand(debuggee, 'Input.insertText', {
    text: text
  });

  // 3. Fallback & Event Triggering: Ensure value is set and all framework listeners (input, change, blur) fire
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildTriggerInputEventsScript(selectorOrIndex, text)
  });
}
