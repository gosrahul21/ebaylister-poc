import { getElementCoords, dispatchClick } from '../cdpHelper';

export interface InjectImageUrlResult {
  found: boolean;
  x?: number;
  y?: number;
  value?: string;
  error?: string;
}

/**
 * Ensures the URL input row for the given index exists in the "Import from web" modal.
 * If the input row does not exist yet, clicks "+ Add additional" button.
 */
export async function ensureUrlRowExists(
  debuggee: chrome.debugger.Debuggee,
  index: number
): Promise<boolean> {
  const checkRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        const idx = ${index};
        const allInputs = Array.from(document.querySelectorAll('input'));
        const exists = allInputs.some(inp => inp.id && (
          inp.id.includes('[' + idx + ']-se-textbox') ||
          (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
        )) || Boolean(document.querySelectorAll('.url-row')[idx]);
        return exists;
      })()
    `,
    returnByValue: true
  }) as { result?: { value?: boolean } };

  if (checkRes.result?.value) {
    return true;
  }

  // Not present yet, click "+ Add additional" button
  console.log(`[CDP eBay Automator] Step 4a - Row for URL ${index + 1} not present. Clicking "+ Add additional"...`);
  const addBtnSelector = 'button[name="addAdditional"], button.row-button, text:Add additional';
  const addBtnCoords = await getElementCoords(debuggee, addBtnSelector);

  if (addBtnCoords.found && addBtnCoords.x !== undefined && addBtnCoords.y !== undefined) {
    await dispatchClick(debuggee, addBtnCoords.x, addBtnCoords.y);
    await new Promise(r => setTimeout(r, 600));
    return true;
  }

  return false;
}

/**
 * Injects an image URL directly into the eBay "Import from web" popup input at index i.
 * Matches eBay's floating-label URL inputs:
 *   <div class="floating-label">
 *     <label for="...[i]-se-textbox">URL {i + 1}</label>
 *     <input id="...[i]-se-textbox" class="textbox__control" type="text">
 *   </div>
 *
 * Uses native HTMLInputElement value setter and dispatches input, change, and blur events
 * to guarantee that eBay's UI framework updates cleanly.
 */
export async function injectImageUrlInput(
  debuggee: chrome.debugger.Debuggee,
  url: string,
  index: number
): Promise<InjectImageUrlResult> {
  // Ensure the target row is rendered before injecting
  await ensureUrlRowExists(debuggee, index);

  const evalRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        const idx = ${index};
        const targetUrl = ${JSON.stringify(url)};

        // Strategy 1: Find by exact label "URL {idx + 1}"
        let targetInput = null;
        const labels = Array.from(document.querySelectorAll('.floating-label label, .url-row label, label'));
        const targetLabel = labels.find(l => {
          const text = (l.textContent || '').trim();
          return text === 'URL ' + (idx + 1) || text.startsWith('URL ' + (idx + 1));
        });
        if (targetLabel && targetLabel.getAttribute('for')) {
          targetInput = document.getElementById(targetLabel.getAttribute('for'));
        }

        // Strategy 2: Find by ID pattern matching eBay uploader convention:
        // e.g. s0-1-0-25-15-@PHOTOS-...-@uploader-...-@dialog-...[0]-se-textbox
        if (!targetInput) {
          const allInputs = Array.from(document.querySelectorAll('input'));
          targetInput = allInputs.find(inp => inp.id && (
            inp.id.includes('[' + idx + ']-se-textbox') ||
            (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
          ));
        }

        // Strategy 3: Find by .url-row container at index
        if (!targetInput) {
          const urlRows = Array.from(document.querySelectorAll('.url-row'));
          if (urlRows[idx]) {
            targetInput = urlRows[idx].querySelector('input.textbox__control, .se-textbox--input input, input[type="text"], input');
          }
        }

        // Strategy 4: Fallback to all visible inputs inside the modal container
        if (!targetInput) {
          const modal = document.querySelector('.lightbox-dialog__main, .se-panel-container, [role="dialog"]') || document.body;
          const inputs = Array.from(modal.querySelectorAll('.url-row input.textbox__control, .url-row input, input.textbox__control'));
          const visibleInputs = inputs.filter(inp => {
            const style = window.getComputedStyle(inp);
            const rect = inp.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
          });
          targetInput = visibleInputs[idx];
        }

        if (!targetInput) {
          return JSON.stringify({ found: false, error: 'Input field for URL ' + (idx + 1) + ' not found' });
        }

        // Ensure visible & focused
        targetInput.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        targetInput.focus();

        // Use native prototype setter to bypass framework wrappers (e.g. React/Marko/eBayUI)
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (valueSetter) {
          valueSetter.call(targetInput, targetUrl);
        } else {
          targetInput.value = targetUrl;
        }

        // Dispatch synthetic events so framework updates its internal state
        targetInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        targetInput.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));

        const rect = targetInput.getBoundingClientRect();
        return JSON.stringify({
          found: true,
          value: targetInput.value,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        });
      })()
    `,
    returnByValue: true
  }) as { result?: { value?: string } };

  const info: InjectImageUrlResult = evalRes.result?.value
    ? JSON.parse(evalRes.result.value)
    : { found: false, error: 'No return value from Runtime.evaluate' };

  return info;
}
