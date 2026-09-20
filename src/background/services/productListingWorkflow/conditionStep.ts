import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import {
  injectVisualCursor,
  waitForElementCoords
} from '../cdpHelper';

const CONDITION_RADIO_SELECTOR = 'radio:first, text:New, input[type="radio"]';
const CONTINUE_TO_LISTING_SELECTOR = 'text:Continue to listing, button.btn--primary, text:continue to listing';

/**
 * Step 3: Handles the "Confirm details" modal popup by selecting the 1st condition option ("New")
 * and clicking "Continue to listing".
 */
export async function executeConditionStep(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 3 - Waiting for "Confirm details" condition modal...');
  await new Promise(r => setTimeout(r, 1500));
  await injectVisualCursor(debuggee);

  // 3a. Click 1st condition radio option ("New")
  const conditionCoords = await waitForElementCoords(debuggee, CONDITION_RADIO_SELECTOR, 25, 400);

  if (!conditionCoords.found || conditionCoords.x === undefined || conditionCoords.y === undefined) {
    throw new Error(`Step 3a - Condition option not found: ${conditionCoords.error}`);
  }

  console.log(`[CDP eBay Automator] Step 3a - Found 1st condition option ("New") at (${conditionCoords.x}, ${conditionCoords.y})`);
  await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 300)));

  let targetPosition: Position = { x: conditionCoords.x, y: conditionCoords.y };
  await moveCursorAndClick(currentPosition, targetPosition, debuggee);

  // 3b. Click "Continue to listing" submit button
  console.log('[CDP eBay Automator] Step 3b - Waiting for "Continue to listing" button...');
  await new Promise(r => setTimeout(r, 600));

  const listingBtnCoords = await waitForElementCoords(debuggee, CONTINUE_TO_LISTING_SELECTOR, 20, 400);

  if (!listingBtnCoords.found || listingBtnCoords.x === undefined || listingBtnCoords.y === undefined) {
    throw new Error(`Step 3b - "Continue to listing" button not found: ${listingBtnCoords.error}`);
  }

  console.log(`[CDP eBay Automator] Step 3b - Found "Continue to listing" button at (${listingBtnCoords.x}, ${listingBtnCoords.y})`);
  await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 300)));

  targetPosition = { x: listingBtnCoords.x, y: listingBtnCoords.y };
  await moveCursorAndClick(currentPosition, targetPosition, debuggee);

  return targetPosition;
}
