import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { smoothScrollToElement } from '../cdpHelper';

const SEARCH_BUTTON_SELECTOR =
  'button.keyword-suggestion__button, button[aria-label="Search"], button.btn--primary, button[type="button"].btn--primary';

/**
 * Step 1: Locates and clicks the search button on the eBay prelist suggest page.
 */
export async function executeSearchStep(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position
): Promise<Position> {
  const searchCoords = await smoothScrollToElement(debuggee, SEARCH_BUTTON_SELECTOR);

  if (!searchCoords.found || searchCoords.x === undefined || searchCoords.y === undefined) {
    throw new Error(`Step 1 - Search button coords not found: ${searchCoords.error}`);
  }

  console.log(`[CDP eBay Automator] Step 1 - Found search button at (${searchCoords.x}, ${searchCoords.y})`);
  const targetPosition: Position = { x: searchCoords.x, y: searchCoords.y };
  await moveCursorAndClick(currentPosition, targetPosition, debuggee);

  return targetPosition;
}
