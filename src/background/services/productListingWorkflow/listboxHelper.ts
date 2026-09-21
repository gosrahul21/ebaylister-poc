import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { smoothScrollToElement } from '../cdpHelper';

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
    expression: `
      (function() {
        const btn = document.querySelector(${JSON.stringify(buttonSelector)});
        if (!btn) return JSON.stringify({ found: false, error: 'Button not found' });

        const btnTextEl = btn.querySelector('.btn__text') || btn;
        const currentText = (btnTextEl.textContent || btn.getAttribute('value') || '').trim();
        const target = ${JSON.stringify(optionText.trim().toLowerCase())};
        
        const alreadySelected = currentText.toLowerCase() === target || 
                                currentText.toLowerCase().includes(target) || 
                                target.includes(currentText.toLowerCase());

        return JSON.stringify({
          found: true,
          currentText: currentText,
          alreadySelected: alreadySelected
        });
      })()
    `,
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
    expression: `
      (function() {
        const btn = document.querySelector(${JSON.stringify(buttonSelector)});
        const target = ${JSON.stringify(optionText.trim().toLowerCase())};

        // Determine listbox container (via aria-controls, sibling or open listboxes in DOM)
        let listbox = null;
        if (btn) {
          const controlsId = btn.getAttribute('aria-controls');
          if (controlsId) listbox = document.getElementById(controlsId);
          if (!listbox) listbox = btn.closest('.listbox-button')?.querySelector('[role="listbox"], .listbox__options');
        }

        if (!listbox) {
          const allListboxes = Array.from(document.querySelectorAll('[role="listbox"], .listbox__options'));
          listbox = allListboxes.find(m => {
            const style = window.getComputedStyle(m);
            return style.display !== 'none' && style.visibility !== 'hidden' && m.offsetParent !== null;
          }) || allListboxes[allListboxes.length - 1];
        }

        if (!listbox) {
          return JSON.stringify({ found: false, error: 'No listbox options container found' });
        }

        const options = Array.from(listbox.querySelectorAll('[role="option"], .listbox__option'));
        let matched = options.find(opt => {
          // Clone and remove .clipped element text (which contains "selected")
          const clone = opt.cloneNode(true);
          const clipped = clone.querySelectorAll('.clipped');
          clipped.forEach(c => c.remove());
          const text = (clone.textContent || '').trim().toLowerCase();
          return text === target || text.includes(target) || target.includes(text);
        });

        if (!matched && options.length > 0) {
          // Fallback: search by value attribute or text in .listbox__value
          matched = options.find(opt => {
            const valEl = opt.querySelector('.listbox__value');
            const text = (valEl ? valEl.textContent : opt.textContent || '').trim().toLowerCase();
            return text.includes(target) || target.includes(text);
          });
        }

        if (!matched) {
          return JSON.stringify({ 
            found: false, 
            error: 'No matching option found for "' + target + '"',
            available: options.map(o => (o.textContent || '').trim())
          });
        }

        matched.scrollIntoView({ behavior: 'instant', block: 'nearest' });
        const rect = matched.getBoundingClientRect();

        // Dispatch synthetic click as well to guarantee state change
        matched.click();

        return JSON.stringify({
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: (matched.textContent || '').trim()
        });
      })()
    `,
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
