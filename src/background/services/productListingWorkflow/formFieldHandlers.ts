import { FormFieldSchema } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { cdpHumanInput, smoothScrollToElement } from '../cdpHelper';

const TITLE_INPUT_SELECTOR = 'input[name="title"]';

/**
 * Closes any open floating dropdown popover menus so they don't block clicks.
 */
export async function closeOpenMenus(debuggee: chrome.debugger.Debuggee): Promise<void> {
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .fake-menu-button__menu--reverse'));
        menus.forEach(m => { m.style.display = 'none'; });
      })()
    `
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
    expression: `
      (function() {
        const targetValue = ${JSON.stringify(value.toLowerCase())};
        const options = ${JSON.stringify(field.options || [])};
        const allowCustom = ${JSON.stringify(!!field.allowCustomValue)};

        const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .filter-menu, .listbox__options, [role="listbox"]'));
        const openMenu = menus.find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && m.offsetParent !== null;
        }) || menus[menus.length - 1];

        if (!openMenu) return JSON.stringify({ matched: false, reason: 'no open menu found' });

        const items = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], li'));
        const matched = items.find(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return txt === targetValue || txt.includes(targetValue) || targetValue.includes(txt);
        });

        if (matched) {
          matched.click();
          return JSON.stringify({ matched: true, text: (matched.textContent || '').trim() });
        }

        if (allowCustom) {
          const searchInput = openMenu.querySelector('input[type="text"], input:not([type])');
          if (searchInput) {
            searchInput.focus();
            searchInput.value = ${JSON.stringify(value)};
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
              const resultItems = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="option"], li'));
              if (resultItems.length > 0) resultItems[0].click();
            }, 300);
            return JSON.stringify({ matched: true, custom: true, text: ${JSON.stringify(value)} });
          }
        }

        return JSON.stringify({ matched: false, reason: 'no matching option and no custom input' });
      })()
    `,
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
    expression: `
      (function() {
        const sel = document.querySelector(${JSON.stringify(field.selector)});
        if (!sel) return;
        const opts = Array.from(sel.options);
        const targetVal = ${JSON.stringify(value.toLowerCase())};
        const opt = opts.find(o => o.text.toLowerCase().includes(targetVal) || o.value.toLowerCase().includes(targetVal));
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
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
