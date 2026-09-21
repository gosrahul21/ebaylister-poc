import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { cdpInjectHumanValue } from '@/background/helper/cdpInjectHumanValue';
import { getTargetElementPosition } from '@/background/helper/getTargetElementPosition';
import { getElementCoords, dispatchClick } from '../cdpHelper';
import {
  buildCheckUrlRowExistsScript,
  buildTargetInputCoordinatesScript
} from '../../injectors';

export interface ImageInputTargetInfo {
  found: boolean;
  randomPos?: Position;
  selector?: string;
  id?: string;
  index?: number;
  dimensions?: { width: number; height: number };
  error?: string;
}

export interface InjectImageResult {
  success: boolean;
  currentPosition: Position;
  error?: string;
}

/**
 * Checks if the URL input row for the given index is already present in the DOM.
 */
export async function checkUrlRowExists(
  debuggee: chrome.debugger.Debuggee,
  index: number
): Promise<boolean> {
  const checkRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildCheckUrlRowExistsScript(index),
    returnByValue: true
  }) as { result?: { value?: boolean } };

  return Boolean(checkRes.result?.value);
}

/**
 * Clicks the "+ Add additional" button in the eBay upload modal to add a new URL input row.
 * Uses smooth scrolling, safe randomized coordinates within button bounds, and human cursor movement.
 */
export async function clickAddAdditionalButton(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 4a - Locating "+ Add additional" button...');

  const addBtnSelector = 'button[name="addAdditional"], button.row-button, button[fluid], text:Add additional';
  const pos = await getTargetElementPosition(debuggee, addBtnSelector);

  if (pos.found && pos.x !== undefined && pos.y !== undefined) {
    const updatedPosition = await moveCursorAndClick(
      currentPosition,
      { x: pos.x, y: pos.y },
      debuggee,
      'Step 4a - Clicking "+ Add additional" button to add new input field...'
    );
    // Wait for the new input row to be created and rendered
    await new Promise(r => setTimeout(r, 650));
    return updatedPosition;
  } else {
    console.warn('[CDP eBay Automator] Step 4a - Could not locate "+ Add additional" button:', pos.error);
    return currentPosition;
  }
}

/**
 * Ensures the URL input row for the given index exists in the "Import from web" modal.
 * Polls for up to 2 seconds for the row to render (since Add additional may have just been clicked),
 * and only clicks the button as a fallback if the row is still missing.
 */
export async function ensureUrlRowExists(
  debuggee: chrome.debugger.Debuggee,
  index: number,
  currentPosition?: Position
): Promise<{ exists: boolean; currentPosition?: Position }> {
  // Poll for up to 2 seconds for row index to be present
  for (let attempt = 0; attempt < 8; attempt++) {
    const exists = await checkUrlRowExists(debuggee, index);
    if (exists) {
      return { exists: true, currentPosition };
    }
    await new Promise(r => setTimeout(r, 250));
  }

  // Not present after polling, click "+ Add additional" button as fallback
  console.log(`[CDP eBay Automator] Step 4a - Row for URL ${index + 1} not present after waiting. Clicking "+ Add additional"...`);

  if (currentPosition) {
    const updatedPosition = await clickAddAdditionalButton(debuggee, currentPosition);
    await new Promise(r => setTimeout(r, 600));
    return { exists: true, currentPosition: updatedPosition };
  } else {
    const addBtnSelector = 'button[name="addAdditional"], button.row-button, text:Add additional';
    const addBtnCoords = await getElementCoords(debuggee, addBtnSelector);
    if (addBtnCoords.found && addBtnCoords.x !== undefined && addBtnCoords.y !== undefined) {
      await dispatchClick(debuggee, addBtnCoords.x, addBtnCoords.y);
      await new Promise(r => setTimeout(r, 650));
      return { exists: true };
    }
    return { exists: false };
  }
}

/**
 * Locates the target input element for index i and computes a randomized position
 * strictly within the element's bounding box to ensure natural human behavior and prevent miss-hits.
 *
 * Targets eBay's input structure:
 *   <div class="floating-label">
 *     <label for="...[i]-se-textbox">URL {i + 1}</label>
 *     <div class="textbox textbox--fluid se-textbox--input">
 *       <input id="...[i]-se-textbox" class="textbox__control" type="text">
 *     </div>
 *   </div>
 */
export async function getImageInputTargetInfo(
  debuggee: chrome.debugger.Debuggee,
  index: number
): Promise<ImageInputTargetInfo> {
  const evalRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildTargetInputCoordinatesScript(index),
    returnByValue: true
  }) as { result?: { value?: string } };
  console.log({evalRes});
  const info: ImageInputTargetInfo = evalRes.result?.value
    ? JSON.parse(evalRes.result.value)
    : { found: false, error: 'No return value from Runtime.evaluate' };
  console.log({info})
  return info;
}

/**
 * End-to-end modular helper to inject an image URL into the eBay upload modal:
 * 1. Ensures row index exists
 * 2. Gets target element and randomized position inside bounds
 * 3. Moves cursor using Bezier curves and dispatches click (via reusable moveCursorAndClick)
 * 4. Injects text mimicking human typing (via reusable cdpInjectHumanValue)
 */
export async function injectImageUrl(
  debuggee: chrome.debugger.Debuggee,
  url: string,
  index: number,
  currentPosition: Position
): Promise<InjectImageResult> {
  // 1. Ensure row exists in the modal
  // const rowRes = await ensureUrlRowExists(debuggee, index, currentPosition);
  // if (rowRes.currentPosition) {
  //   currentPosition = rowRes.currentPosition;
  // }
  await new Promise(r => setTimeout(r, 500));
  // 2. Prepare target element and calculate randomized position inside bounds
  const targetInfo = await getImageInputTargetInfo(debuggee, index);
  if (!targetInfo.found || !targetInfo.randomPos) {
    return {
      success: false,
      currentPosition,
      error: targetInfo.error || `Failed to locate input for URL ${index + 1}`
    };
  }

  // 3. Move cursor to randomized position and click element
  const updatedPosition = await moveCursorAndClick(
    currentPosition,
    targetInfo.randomPos,
    debuggee,
    `Step 4a - Focusing URL ${index + 1} input at (${targetInfo.randomPos.x}, ${targetInfo.randomPos.y})...`
  );

  await new Promise(r => setTimeout(r, 150));

  // 4. Inject value mimicking human typing rhythm and framework event dispatching targeting exact element
  await cdpInjectHumanValue(debuggee, url, targetInfo.id);

  return {
    success: true,
    currentPosition: updatedPosition
  };
}

export const injectImageUrlInput = injectImageUrl;
export { getTargetElementPosition };
