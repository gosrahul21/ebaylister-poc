import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { smoothScrollToElement } from '../cdpHelper';
import {
  buildCheckOptionSelectedScript,
  buildFindOptionCoordsScript
} from '../../injectors';

/**
 * Helper to select an option in an eBay custom listbox dropdown component.
 * eBay listboxes use a trigger button (<button aria-haspopup="listbox">)
 * which opens a container with [role="listbox"] and [role="option"] children,
 * backed by a hidden <select class="listbox__native">.
 *
 * @param debuggee - Active Chrome debugger debuggee target
 * @param buttonSelector - CSS selector to find the listbox trigger button
 * @param optionText - The visible label of the option to select
 * @param currentPosition - Current mouse cursor position
 * @returns Updated cursor position {x, y}
 */
export async function fillListboxOption(
  debuggee: chrome.debugger.Debuggee,
  buttonSelector: string,
  optionText: string,
  currentPosition: Position
): Promise<Position> {
  console.log(`[Listbox Helper] Selecting option "${optionText}" using button "${buttonSelector}"`);

  // 1. Check if the requested option is already selected
  const checkResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildCheckOptionSelectedScript(buttonSelector, optionText),
    returnByValue: true
  }) as { result?: { value?: string } };

  const checkInfo = checkResult.result?.value ? JSON.parse(checkResult.result.value) : { found: false };
  if (checkInfo.alreadySelected) {
    console.log(`[Listbox Helper] Option "${optionText}" is already selected ("${checkInfo.currentText}"). Skipping click.`);
    return currentPosition;
  }

  // 2. Scroll to the listbox trigger button
  const buttonCoords = await smoothScrollToElement(debuggee, buttonSelector);
  if (!buttonCoords.found || buttonCoords.x === undefined || buttonCoords.y === undefined) {
    console.warn(`[Listbox Helper] Could not find or scroll to listbox button "${buttonSelector}": ${buttonCoords.error}`);
    return currentPosition;
  }

  // 3. Move cursor and click the trigger button to open the listbox options menu
  currentPosition = await moveCursorAndClick(
    currentPosition,
    { x: buttonCoords.x, y: buttonCoords.y },
    debuggee,
    `Click listbox button "${buttonSelector}"`
  );

  // Wait for listbox dropdown to expand/transition
  await new Promise(r => setTimeout(r, 450));

  // 4. Locate the matching option coordinates and click it
  const optionEval = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildFindOptionCoordsScript(buttonSelector, optionText),
    returnByValue: true
  }) as { result?: { value?: string } };

  const optInfo = optionEval.result?.value ? JSON.parse(optionEval.result.value) : { found: false };

  if (optInfo.found && optInfo.x !== undefined && optInfo.y !== undefined) {
    // 5. Move visual cursor and click the option element
    currentPosition = await moveCursorAndClick(
      currentPosition,
      { x: optInfo.x, y: optInfo.y },
      debuggee,
      `Click listbox option "${optInfo.text || optionText}"`
    );
    console.log(`[Listbox Helper] Successfully selected listbox option "${optInfo.text || optionText}"`);
  } else {
    console.warn(`[Listbox Helper] Could not locate option "${optionText}":`, optInfo.error, optInfo.available);
  }

  // Wait for dropdown to close and DOM to update
  await new Promise(r => setTimeout(r, 400));
  return currentPosition;
}
