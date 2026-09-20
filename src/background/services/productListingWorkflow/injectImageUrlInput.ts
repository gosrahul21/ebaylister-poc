import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { cdpInjectHumanValue } from '@/background/helper/cdpInjectHumanValue';
import { getTargetElementPosition } from '@/background/helper/getTargetElementPosition';
import { getElementCoords, dispatchClick } from '../cdpHelper';

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
    expression: `
      (function() {
        const idx = ${index};
        const modal = document.querySelector('#url-import-title')?.closest('.lightbox-dialog, .se-panel-container')
          || document.querySelector('.lightbox-dialog:not([hidden]) .se-panel-container')
          || document.querySelector('.lightbox-dialog:not([hidden])')
          || document;

        const checkRoot = (root) => {
          // 1. By .url-row elements
          const urlRows = Array.from(root.querySelectorAll('.url-row'));
          if (urlRows[idx]) return true;

          // 2. By exact label "URL {idx + 1}"
          const labels = Array.from(root.querySelectorAll('.floating-label label, .url-row label, label'));
          if (labels.some(l => (l.textContent || '').trim() === 'URL ' + (idx + 1))) return true;

          // 3. By ID pattern matching [idx]
          const allInputs = Array.from(root.querySelectorAll('input'));
          if (allInputs.some(inp => inp.id && (
            inp.id.includes('[' + idx + ']-se-textbox') ||
            (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
          ))) return true;

          // 4. By inputs in modal body
          const panelBody = (root.querySelector && root.querySelector('.se-panel-container__body, .se-panel-section')) || root;
          const bodyInputs = Array.from(panelBody.querySelectorAll('input[type="text"], input.textbox__control, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'));
          return Boolean(bodyInputs[idx]);
        };

        return checkRoot(modal) || (modal !== document ? checkRoot(document) : false);
      })()
    `,
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
    expression: `
      (function() {
        const idx = ${index};
        const modal = document.querySelector('#url-import-title')?.closest('.lightbox-dialog, .se-panel-container')
          || document.querySelector('.lightbox-dialog:not([hidden]) .se-panel-container')
          || document.querySelector('.lightbox-dialog:not([hidden])')
          || document;

        const findInRoot = (root) => {
          // Strategy 1: Find by .url-row container at index
          const urlRows = Array.from(root.querySelectorAll('.url-row'));
          if (urlRows[idx]) {
            const inp = urlRows[idx].querySelector('input.textbox__control, .se-textbox--input input, input[type="text"], input');
            if (inp) return inp;
          }

          // Strategy 2: Find by exact label "URL {idx + 1}"
          const labels = Array.from(root.querySelectorAll('.floating-label label, .url-row label, label'));
          const targetLabel = labels.find(l => {
            const text = (l.textContent || '').trim();
            return text === 'URL ' + (idx + 1) || text.startsWith('URL ' + (idx + 1));
          });
          if (targetLabel) {
            if (targetLabel.getAttribute('for')) {
              const byFor = document.getElementById(targetLabel.getAttribute('for'));
              if (byFor) return byFor;
            }
            const row = targetLabel.closest('.url-row, .floating-label, .se-textbox--container');
            if (row) {
              const inp = row.querySelector('input');
              if (inp) return inp;
            }
          }

          // Strategy 3: Find by ID pattern matching eBay uploader convention:
          // e.g. s0-1-0-25-15-@PHOTOS-...-@uploader-...-@dialog-...[idx]-se-textbox
          const allInputs = Array.from(root.querySelectorAll('input'));
          const byId = allInputs.find(inp => inp.id && (
            inp.id.includes('[' + idx + ']-se-textbox') ||
            (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
          ));
          if (byId) return byId;

          // Strategy 4: Fallback to all visible text inputs inside container
          const inputs = Array.from(root.querySelectorAll('.url-row input.textbox__control, .url-row input, input.textbox__control, input[type="text"]'));
          const visibleInputs = inputs.filter(inp => {
            const style = window.getComputedStyle(inp);
            const rect = inp.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
          if (visibleInputs[idx]) return visibleInputs[idx];

          return null;
        };

        let targetInput = findInRoot(modal) || (modal !== document ? findInRoot(document) : null);

        if (!targetInput) {
          return JSON.stringify({ found: false, error: 'Target input for URL ' + (idx + 1) + ' not found' });
        }

        // Scroll into view
        targetInput.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        const rect = targetInput.getBoundingClientRect();

        // Calculate a safe randomized coordinate strictly inside the element boundaries
        // Use 15% inner padding to prevent clicking on borders or outside the element
        const paddingX = Math.max(6, Math.min(rect.width * 0.15, 24));
        const paddingY = Math.max(4, Math.min(rect.height * 0.2, 8));
        const randomX = Math.round(rect.left + paddingX + Math.random() * (rect.width - 2 * paddingX));
        const randomY = Math.round(rect.top + paddingY + Math.random() * (rect.height - 2 * paddingY));

        return JSON.stringify({
          found: true,
          randomPos: { x: randomX, y: randomY },
          id: targetInput.id || '',
          index: idx,
          dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }
        });
      })()
    `,
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
