import { FormFieldSchema } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { cdpHumanInput, smoothScrollToElement } from '../cdpHelper';
import {
  buildCloseOpenMenusScript,
  buildDropdownSelectOptionScript,
  buildNativeSelectOptionScript
} from '../../injectors';

const TITLE_INPUT_SELECTOR = 'input[name="title"]';

/**
 * Closes any open floating dropdown popover menus so they don't block clicks.
 */
export async function closeOpenMenus(debuggee: chrome.debugger.Debuggee): Promise<void> {
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildCloseOpenMenusScript()
  });
}

/**
 * Updates the listing item title input via CDP human typing simulation.
 */
export async function updateListingTitle(
  debuggee: chrome.debugger.Debuggee,
  rawTitle: string | undefined,
  currentPosition: Position
): Promise<Position> {
  const newTitle = rawTitle ? rawTitle.slice(0, 80) : 'Grip Strengtheners';
  console.log(`[CDP eBay Automator] Step 4b - Updating Item Title: "${newTitle}"...`);

  const titleRes = await cdpHumanInput(debuggee, TITLE_INPUT_SELECTOR, newTitle, currentPosition);
  if (titleRes.found) {
    currentPosition = { x: titleRes.x, y: titleRes.y };
    console.log(`[CDP eBay Automator] Step 4b - Title set via CDP keyboard input: "${newTitle}"`);
  } else {
    console.warn(`[CDP eBay Automator] Step 4b - Title input not found: ${titleRes.error}`);
  }

  return currentPosition;
}

/**
 * Fills an eBay custom dropdown field by clicking to open its menu and selecting the matching option.
 */
export async function fillDropdownField(
  debuggee: chrome.debugger.Debuggee,
  field: FormFieldSchema,
  value: string,
  currentPosition: Position
): Promise<Position> {
  const ddCoords = await smoothScrollToElement(debuggee, field.selector);
  if (!ddCoords.found || ddCoords.x === undefined || ddCoords.y === undefined) {
    console.warn(`[CDP eBay Automator] Step 4c - Dropdown not found for "${field.name}": ${ddCoords.error}`);
    return currentPosition;
  }

  const ddTargetPos: Position = { x: ddCoords.x, y: ddCoords.y };
  await moveCursorAndClick(currentPosition, ddTargetPos, debuggee);
  currentPosition = ddTargetPos;
  await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 200)));

  const clickResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildDropdownSelectOptionScript(value, field.options || [], !!field.allowCustomValue),
    returnByValue: true
  }) as { result?: { value?: string } };

  const clickRes = clickResult.result?.value ? JSON.parse(clickResult.result.value as string) : {};
  if (clickRes.matched) {
    console.log(`[CDP eBay Automator] Step 4c - Dropdown "${field.name}" set to: "${clickRes.text || value}" (custom=${clickRes.custom || false})`);
  } else {
    console.warn(`[CDP eBay Automator] Step 4c - Dropdown "${field.name}" could not be matched: ${clickRes.reason}`);
  }

  await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 200)));
  return currentPosition;
}

/**
 * Fills a native HTML select element.
 */
export async function fillSelectField(
  debuggee: chrome.debugger.Debuggee,
  field: FormFieldSchema,
  value: string
): Promise<void> {
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildNativeSelectOptionScript(field.selector, value)
  });
  console.log(`[CDP eBay Automator] Step 4c - Native select "${field.name}" set to: "${value}"`);
}

/**
 * Fills a standard input field via CDP keyboard simulation.
 */
export async function fillInputField(
  debuggee: chrome.debugger.Debuggee,
  field: FormFieldSchema,
  value: string,
  currentPosition: Position
): Promise<Position> {
  const inputRes = await cdpHumanInput(debuggee, field.selector, value, currentPosition);
  if (inputRes.found) {
    currentPosition = { x: inputRes.x, y: inputRes.y };
    console.log(`[CDP eBay Automator] Step 4c - Input "${field.name}" set via CDP keyboard input: "${value}"`);
  } else {
    console.warn(`[CDP eBay Automator] Step 4c - Input not found for "${field.name}": ${inputRes.error}`);
  }
  await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 150)));
  return currentPosition;
}
