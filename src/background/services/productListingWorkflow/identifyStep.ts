import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import {
  ensureDebuggerAttached,
  injectVisualCursor,
  waitForUrlAndComplete,
  smoothScrollToElement
} from '../cdpHelper';

const CONTINUE_WITHOUT_MATCH_SELECTOR =
  'button.prelist-radix__next-action, text:Continue without match, button[class*="prelist-radix__next-action"]';

/**
 * Step 2: Waits for the identify page to load and clicks "Continue without match".
 */
export async function executeIdentifyStep(
  debuggee: chrome.debugger.Debuggee,
  tabId: number,
  currentPosition: Position
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 2 - Waiting for page navigation to identify step...');
  await waitForUrlAndComplete(tabId, 'identify', 15000);
  await new Promise(r => setTimeout(r, 1200));
  await ensureDebuggerAttached(debuggee);
  await injectVisualCursor(debuggee);

  const continueCoords = await smoothScrollToElement(debuggee, CONTINUE_WITHOUT_MATCH_SELECTOR);

  if (!continueCoords.found || continueCoords.x === undefined || continueCoords.y === undefined) {
    throw new Error(`Step 2 - "Continue without match" button not found: ${continueCoords.error}`);
  }

  console.log(`[CDP eBay Automator] Step 2 - Found "Continue without match" button at (${continueCoords.x}, ${continueCoords.y})`);
  await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 300)));

  const targetPosition: Position = { x: continueCoords.x, y: continueCoords.y };
  await moveCursorAndClick(currentPosition, targetPosition, debuggee);

  return targetPosition;
}
