import { moveCursorToTargetElement, Position } from './moveCursorToTargetElement';
import { dispatchClick } from './dispatchClick';
import { smoothScrollToElement } from './smoothScrollToElement';
import { elementClickScript } from '../injectors';

/**
 * Move cursor to the target element from current element and click
 *
 * @param currentPos - Starting position {x, y}
 * @param targetPos - Target position {x, y} to navigate to and click
 * @param debuggee - Active Chrome debugger instance
 * @param description - Optional description to log
 * @returns Updated cursor position {x, y}
 */
export async function moveCursorAndClick(
  currentPos: Position,
  targetPos: Position,
  debuggee: chrome.debugger.Debuggee,
  description?: string
): Promise<Position> {
  if (description) {
    console.log(`[CDP eBay Automator] ${description}`);
  }
  await moveCursorToTargetElement(currentPos, targetPos, debuggee);
  await dispatchClick(debuggee, targetPos.x, targetPos.y); 
  return { x: targetPos.x, y: targetPos.y };
}


export const getCSSSelector = (selectorOrId: string)=>{
    const cssSelector = selectorOrId.startsWith('#') || selectorOrId.startsWith('.') || selectorOrId.includes('[')
    ? selectorOrId
    : `#${selectorOrId}, [name="${selectorOrId}"], [id="${selectorOrId}"]`;
    return cssSelector;
}

/**
 * Focuses an element in the DOM using CDP Runtime.evaluate.
 * Accepts CSS selector or ID.
 */
export async function focusElement(
  debuggee: chrome.debugger.Debuggee,
  selectorOrId: string
): Promise<{ found: boolean }> {
  try {

    const cssSelector = getCSSSelector(selectorOrId)
    const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          let element = document.querySelector(${JSON.stringify(cssSelector)});
          if (!element) return false;
          element.focus();
          return true;
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: boolean } };

    return { found: !!evaluatedResult.result?.value };
  } catch {
    return { found: false };
  }
}

/**
 * Clicks an element by selector or ID, optionally moving cursor smoothly from currentPos.
 * If simulation is false, performs direct DOM click evaluation via buildElementClickScript.
 */
export async function clickElement(
  debuggee: chrome.debugger.Debuggee,
  selectorOrId: string,
  simulation: boolean = false,
  currentPos: Position = { x: 100, y: 100 }
): Promise<{ found: boolean; x: number; y: number }> {
  const cssSelector = selectorOrId;
  if (!simulation) {
    try {
      const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
        expression: elementClickScript(cssSelector),
        returnByValue: true
      }) as { result?: { value?: string } };
      
      const clickRes = evaluatedResult.result?.value ? JSON.parse(evaluatedResult.result.value) : { found: false };
      return { found: !!clickRes.found, x: currentPos.x, y: currentPos.y };
    } catch {
      return { found: false, x: currentPos.x, y: currentPos.y };
    }
  }

  const coords = await smoothScrollToElement(debuggee, cssSelector);
  if (!coords.found || coords.x === undefined || coords.y === undefined) {
    console.warn(`[CDP eBay Automator] clickElement - Element "${selectorOrId}" not found`);
    return { found: false, x: currentPos.x, y: currentPos.y };
  }

  await moveCursorToTargetElement(currentPos, { x: coords.x, y: coords.y }, debuggee);
  await dispatchClick(debuggee, coords.x, coords.y);
  return { found: true, x: coords.x, y: coords.y };
}



import { cdpHumanInput } from './cdpHumanInput';

/**
 * Focuses on an input element matching selectorOrId and types text simulating human typing.
 *
 * @param debuggee - Active Chrome debugger instance
 * @param selectorOrId - CSS selector or element ID
 * @param value - Text value to input into the element
 * @param simulation - If true, performs visual mouse movement & human CDP typing simulation via cdpHumanInput
 * @param currentPos - Current mouse cursor position
 */
export async function focusAndTypeInput(
  debuggee: chrome.debugger.Debuggee,
  selectorOrId: string,
  value: string,
  simulation: boolean = false,
  currentPos: Position = { x: 100, y: 100 }
): Promise<{ found: boolean; x: number; y: number }> {
  const cssSelector = getCSSSelector(selectorOrId);

  if (!simulation) {
    await focusElement(debuggee, cssSelector);
    try {
      await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
        expression: `
          (function() {
            let element = document.querySelector(${JSON.stringify(cssSelector)});
            if (!element) return false;
            element.focus();
            element.value = ${JSON.stringify(value)};
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          })()
        `,
        returnByValue: true
      });
      return { found: true, x: currentPos.x, y: currentPos.y };
    } catch {
      return { found: false, x: currentPos.x, y: currentPos.y };
    }
  }

  const res = await cdpHumanInput(debuggee, cssSelector, value, currentPos);
  return { found: res.found, x: res.x, y: res.y };
}