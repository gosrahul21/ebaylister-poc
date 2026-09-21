import { Position } from './moveCursorToTargetElement';
import { getTargetElementPosition, GetTargetPositionOptions } from './getTargetElementPosition';
import { dispatchClick } from './dispatchClick';

export interface CdpClickOptions extends GetTargetPositionOptions {
  postClickDelayMs?: number;
}

export interface CdpClickResult {
  success: boolean;
  x: number;
  y: number;
  error?: string;
}

/**
 * Reusable CDP helper that locates a button or clickable element by selector or ID
 * and dispatches a click directly on it without mouse movement.
 *
 * 1. Targets the element using selector or ID (with scroll into view & safe inner bounds)
 * 2. Dispatches mouse click directly at target coordinates
 * 3. Does NOT perform any cursor or mouse movement
 *
 * @param debuggee - Active chrome.debugger instance
 * @param selectorOrId - CSS selector, element ID, or comma-separated candidates for the button
 * @param currentPosOrDescription - Optional Position (for signature compatibility) or description string
 * @param descriptionOrOptions - Optional description string or options
 * @param options - Optional padding and post-click delay options
 * @returns Target coordinates {x, y} with success flag
 */
export async function cdpClickButton(
  debuggee: chrome.debugger.Debuggee,
  selectorOrId: string | string[],
  currentPosOrDescription?: Position | string,
  descriptionOrOptions?: string | CdpClickOptions,
  options?: CdpClickOptions
): Promise<CdpClickResult> {
  let description: string | undefined;
  let clickOptions: CdpClickOptions | undefined;

  if (typeof currentPosOrDescription === 'string') {
    description = currentPosOrDescription;
    if (typeof descriptionOrOptions === 'object' && descriptionOrOptions !== null) {
      clickOptions = descriptionOrOptions as CdpClickOptions;
    }
  } else {
    if (typeof descriptionOrOptions === 'string') {
      description = descriptionOrOptions;
      clickOptions = options;
    } else if (typeof descriptionOrOptions === 'object' && descriptionOrOptions !== null) {
      clickOptions = descriptionOrOptions;
    } else {
      clickOptions = options;
    }
  }

  const targetLabel = typeof selectorOrId === 'string' ? selectorOrId : selectorOrId.join(', ');
  const logPrefix = description || `Clicking button (${targetLabel})...`;
  console.log(`[CDP eBay Automator] ${logPrefix}`);

  // 1. Locate element and calculate safe click coordinates inside its bounding box
  const posInfo = await getTargetElementPosition(debuggee, selectorOrId, clickOptions);

  if (!posInfo.found || posInfo.x === undefined || posInfo.y === undefined) {
    console.warn(`[CDP eBay Automator] Could not locate button to click (${targetLabel}):`, posInfo.error);
    const fallbackPos = (typeof currentPosOrDescription === 'object' && currentPosOrDescription !== null)
      ? currentPosOrDescription
      : { x: 0, y: 0 };
    return {
      success: false,
      x: fallbackPos.x,
      y: fallbackPos.y,
      error: posInfo.error || `Button not found: ${targetLabel}`
    };
  }

  // 2. Direct click at target coordinates (no mouse movement)
  await dispatchClick(debuggee, posInfo.x, posInfo.y);

  // 3. Optional post-click wait for DOM updates / modal transitions
  const delay = clickOptions?.postClickDelayMs ?? 0;
  if (delay > 0) {
    await new Promise(r => setTimeout(r, delay));
  }

  return {
    success: true,
    x: posInfo.x,
    y: posInfo.y
  };
}
